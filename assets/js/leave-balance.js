/* =========================================================================
   leave-balance.js — رصيد الإجازات على الشاشة: قبل الطلب، وبعده، وعند الرفض
   leave-balance.js — the leave balance on screen: before the request, after
   it, and when the database refuses one.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN: الموظف حين يطلب إجازة، وأ. محمد عمارة وهو يراجعها،
   وهشام وهو يعتمدها. الرصيد يظهر قبل الضغط لا بعده.
   The employee asking for leave, أ. محمد عمارة reviewing it and هشام
   approving it. The balance is shown BEFORE the button, not after.

   ما يفعله · WHAT IT DOES:
     ١ · في نموذج الإجازة: «الرصيد الحالي: X يوم · بعد هذا الطلب: Y يوم».
     ٢ · في تفاصيل الإجازة (للمراجع والمعتمد): نفس السطر قبل التوقيع.
     ٣ · «رصيد افتتاحي» في بطاقة الموظف — لمدير الموارد البشرية وحده.
     ٤ · حين ترفض القاعدة الإرسال لقلّة الرصيد: يُعرض الرقمان بجوار الرفض،
         فيعرف صاحبه ماذا يفعل بدل أن يقرأ رفضاً بلا سياق.

   ما لا يفعله · WHAT IT DOES NOT DO:
     · لا يحسب الرصيد في المتصفح إطلاقاً — كل رقم يأتي من
       `az_p11_leave_balance` في القاعدة. نسختان من حساب الرصيد تفترقان،
       والقاعدة هي التي تمنع فعلاً.
       It NEVER computes a balance in the browser: every figure comes from
       `az_p11_leave_balance` in the database. Two copies would drift, and
       the database is the one that actually refuses.
     · لا يمنع شيئاً بنفسه. المنع في القاعدة (ملف P11-B) بالطريقين معاً.
       It blocks nothing itself. The refusal lives in the database, on both
       approval routes.

   🔴 ترتيب التحميل — غير قابل للتفاوض · LOAD ORDER — NOT NEGOTIABLE:
      يُحمَّل **قبل** `money-send-check.js`، لأن ذاك يجب أن يبقى الغلاف
      الأخارجي على `Workflow.transition` (يفحص ذلك بنفسه ويبلّغ
      'NOT-OUTERMOST'). فغلافنا يجب أن يكون **داخله**، أي أسبق منه في
      loader.js.
      Load BEFORE `money-send-check.js`, which must remain the OUTERMOST
      wrapper on `Workflow.transition` — it checks that itself and reports
      'NOT-OUTERMOST'. Ours must therefore sit INSIDE it, i.e. EARLIER in
      loader.js.

   إضافيّ بالكامل · WHOLLY ADDITIVE. Delete the file and today returns.
   v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══ الاعتماديات مرّة واحدة، بأسمائها الحقيقية — لا حارس عند الاستعمال ═══
     DEPENDENCIES ONCE, BY THEIR REAL NAMES — no guard at the call site.
     حارسٌ عند الاستعمال يحوّل اسماً خاطئاً إلى صمت لا إلى خطأ؛ وقعنا في ذلك
     مع `UI.alert` التي لا وجود لها أصلاً. فإمّا أن يُركَّب الملف كاملاً وإمّا
     ألّا يُركَّب. A call-site guard turns a wrong name into silence rather
     than an error — we walked into that with `UI.alert`, which does not
     exist. So the file installs completely or not at all.
     UI's real exports: ui.js:286-292. */
  var missing = [];
  ['Schema', 'Auth', 'Store', 'UI', 'Workflow', 'EntityPage'].forEach(function (k) {
    if (!global[k]) missing.push(k);
  });
  if (!missing.length) {
    ['toast', 'esc'].forEach(function (f) { if (typeof UI[f] !== 'function') missing.push('UI.' + f); });
    if (typeof Auth.client !== 'function') missing.push('Auth.client');
    if (typeof Workflow.transition !== 'function') missing.push('Workflow.transition');
  }
  if (missing.length) {
    console.error('leave-balance.js NOT installed — missing: ' + missing.join(', ') +
                  '. No balance panel will appear. That is deliberate: a panel showing a wrong or absent ' +
                  'balance would be worse than no panel.');
    return;
  }
  if (Workflow.__p11LeaveBalance) return;
  Workflow.__p11LeaveBalance = true;

  var isAr = function () { return !global.I18N || I18N.getLang() !== 'en'; };
  var L = function (o) { return isAr() ? o.ar : o.en; };
  var d1 = function (n) { return (Math.round(Number(n) * 10) / 10).toString(); };
  /* أنواع الإجازات التي تُخصم — نسخة واحدة تطابق `az_p11_leave_deducts` في
     القاعدة. لو تغيّرت هناك تتغيّر هنا في سطر واحد؛ والقاعدة هي الحَكَم.
     The deducting types — one copy, matching az_p11_leave_deducts in the
     database. One line to change if it ever moves, and the database rules. */
  /* 🔴 «عارضة» ليست هنا لأنها ليست في القاعدة — سؤال المحامي ٢ لم يُجب عنه،
     وقرارُ خصمها كان تخميناً. القاعدة هي الحَكَم وهذه تتبعها.
     🔴 «casual» is absent because it is absent in the database — the lawyer's
     question 2 is unanswered and deducting it was a guess. The database rules
     and this follows it. t8 measures the two lists against each other. */
  var DEDUCTS = ['annual'];
  var deducts = function (t) { return DEDUCTS.indexOf(t) !== -1; };

  /* ═══ ١ · الرصيد من القاعدة، لا من هنا ═══════════════════════════════ */
  var cache = {};        /* per employee+year, cleared on any data change */
  /* 🔴 3f (حكم MANAGER-4 الثالث، الإضافتان ٤ و٥ — bq10 عند مُبلِّغ الأخطاء): قراءةٌ ما زالت في الطريق تُشارَك، فالكتابة في خانة الأيام
     لا تُكرّر الطلب (قاس bq10 ثلاث قراءات لثلاثة أحرف، والتعليق عند «input» أدناه كان يقول غير ذلك). تغيّرُ البيانات يُفرغ الاثنين،
     وقراءةٌ بدأت قبل التغيّر لا تكتب جوابها في الذاكرة بعده.
     🔴 3f (MANAGER-4's ruling 3, addenda 4 and 5 — the bug-reporter's bq10): a read still on its way is shared, so typing in the days
     box does not repeat the request (bq10 measured three reads for three keystrokes, while the «input» comment below said otherwise).
     A data change empties both, and a read that started before the change never writes its answer into the memory after it. */
  var inflight = {};     /* per employee+year: the read still on its way */
  if (Store.onChange) Store.onChange(function () { cache = {}; inflight = {}; });

  async function balanceOf(employeeId, year) {
    if (!employeeId || !year) return null;
    var key = employeeId + '|' + year;
    if (cache[key]) return cache[key];
    if (inflight[key]) return inflight[key];
    var mine = inflight;
    var p = readBalance(employeeId, year, key, mine);
    mine[key] = p;
    p.then(function () { if (mine[key] === p) delete mine[key]; }, function () { if (mine[key] === p) delete mine[key]; });
    return p;
  }
  async function readBalance(employeeId, year, key, mine) {
    var rpc = await Auth.client().rpc('az_p11_leave_balance', { p_employee: employeeId, p_year: year });
    if (rpc.error) return null;                       /* لا رقم ⇒ لا سطر · no figure ⇒ no line */
    var row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (!row) return null;
    if (inflight === mine) cache[key] = row;   /* 3f: never into a memory a data change emptied meanwhile */
    return row;
  }

  /* ═══ ٢ · السطر الذي يراه الإنسان ═══════════════════════════════════ */
  function sentence(bal, days, type) {
    if (!bal) return null;
    if (!bal.has_entitlement) {
      /* لا رصيد مسجَّل: يُقال ذلك صراحةً بدل أن يُعرض صفرٌ يبدو رفضاً.
         No recorded balance: SAY so, rather than show a zero that looks like
         a refusal. Nobody is blocked — the database blocks nobody either. */
      return L({
        ar: 'لا يوجد رصيد إجازات مسجَّل لهذا الموظف بعد — الطلب لن يُرفض لهذا السبب',
        en: 'No leave balance is recorded for this employee yet — the request will not be refused for that'
      });
    }
    var now = Number(bal.balance) || 0;
    if (!deducts(type)) {
      return L({
        ar: 'الرصيد الحالي: ' + d1(now) + ' يوم · هذا النوع لا يُخصم من الرصيد',
        en: 'Balance now: ' + d1(now) + ' days · this type does not come off the balance'
      });
    }
    var after = now - (Number(days) || 0);
    var warn = after < 0
      ? L({ ar: ' ⚠️ أكبر من الرصيد — سيُرفض عند الإرسال', en: ' ⚠️ more than the balance — it will be refused at Send' })
      : '';
    return L({
      ar: 'الرصيد الحالي: ' + d1(now) + ' يوم · بعد هذا الطلب: ' + d1(after) + ' يوم' + warn,
      en: 'Balance now: ' + d1(now) + ' days · after this request: ' + d1(after) + ' days' + warn
    });
  }

  function paint(host, text, bad) {
    if (!host) return;
    var el = host.querySelector('#p11LeaveBal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'p11LeaveBal';
      el.style.cssText = 'margin:8px 0;padding:8px 10px;border-radius:6px;font-size:13px';
      host.insertBefore(el, host.firstChild);
    }
    el.style.background = bad ? '#fdecec' : '#eef6ee';
    el.style.border = '1px solid ' + (bad ? '#e0b4b4' : '#bcd9bc');
    el.textContent = text;
    el.hidden = !text;
  }

  /* ═══ ٣ · النموذج — يُحدَّث مع كل تغيير في النوع أو الأيام أو الموظف ═══ */
  /* ═══ الموظف لا يرى رصيده في هذا الإصدار — نصُّ المالك حرفياً ═══════
     🔴 نصُّ محمد زيدان في التكليف: «الموظفون لا يرون رصيدهم ولا قسيمتهم في هذا
        الإصدار». وخطة P11 §٥ — التي اعتمدها المدير — تقول العكس، وقاعدةُ قراءة
        السجلّ تسمح للموظف بسطوره هو عمداً وموثَّقاً. **التعارض حقيقي، ونصُّ
        المالك هو الأعلى.** فالإخفاء هنا في الشاشة وحدها: لا تتغيّر صلاحية ولا
        قاعدة ولا مسار اعتماد، ورجوعُه سطرٌ واحد يوم يقول كلمته.
     🔴 Mohamed Zidan's own words in the brief: «employees do not see their own
        balance or payslip in this release». PLAN-P11 §5 — which the manager
        accepted — says the opposite, and the ledger's read policy deliberately
        and explicitly lets an employee read their OWN rows. **The conflict is
        real and the owner's words outrank.** So the hiding is on the SCREEN
        only: no permission, no policy and no approval path changes, and it is
        ONE line to undo the day he says otherwise.
        Delete the three lines below and the panel returns exactly as PLAN-P11
        §5 describes. */
  var HIDDEN_FROM = ['employee'];
  function maySeeBalance() {
    return HIDDEN_FROM.indexOf((Auth.current() || {}).role) === -1;
  }

  /* 🔴 3f (bq10): عدّاد النوافذ — كل نافذةٍ جديدة (لافّة UI.modal أدناه) تجعل كل جوابِ رصيدٍ طُلب قبلها قديماً ·
     the window counter — every new window (the UI.modal wrapper below) makes every balance answer asked for before it stale */
  var lbGen = 0;

  async function refreshForm() {
    if (!maySeeBalance()) return;
    var host = document.getElementById('modalBody');
    if (!host) return;
    var empEl = host.querySelector('[name="employee"]');
    var typeEl = host.querySelector('[name="leaveType"]');
    var daysEl = host.querySelector('[name="days"]');
    var fromEl = host.querySelector('[name="fromDate"]');
    if (!empEl || !typeEl || !daysEl) return;          /* ليست شاشة إجازة · not the leave form */
    var year = fromEl && fromEl.value ? Number(String(fromEl.value).slice(0, 4)) : new Date().getFullYear();
    /* 🔴 3f (حكم MANAGER-4 الثالث، الإضافة ٤ — قاسه bq10 R1 وR2): اختيار موظفٍ ثم آخر بسرعة، وقراءة الأول أبطأ، كان يرسم رصيد الأول على
       نموذج الثاني حتى الحرف التالي. الجواب يُرسم الآن فقط إن بقي الموظف نفسه والسنة نفسها في النموذج، ولم تُفتح نافذةٌ غيرها.
       🔴 3f (MANAGER-4's ruling 3, addendum 4 — measured by bq10 R1 and R2): choosing one employee then another quickly, with the first
       read slower, painted the FIRST employee's balance on the second's form until the next keystroke. An answer is now painted only
       if the same employee and the same year are still in the form and no other window has opened. */
    var askedFor = empEl.value, askedYear = year, myGen = lbGen;
    var bal = await balanceOf(askedFor, askedYear);
    var yearNow = fromEl && fromEl.value ? Number(String(fromEl.value).slice(0, 4)) : new Date().getFullYear();
    if (myGen !== lbGen || empEl.value !== askedFor || yearNow !== askedYear) return;
    var text = sentence(bal, daysEl.value, typeEl.value);
    paint(host, text || '', !!(bal && bal.has_entitlement && deducts(typeEl.value) &&
      (Number(bal.balance) || 0) - (Number(daysEl.value) || 0) < 0));
  }

  document.addEventListener('change', function (e) {
    var n = e.target && e.target.getAttribute && e.target.getAttribute('name');
    if (n === 'employee' || n === 'leaveType' || n === 'days' || n === 'fromDate') {
      var host = document.getElementById('modalBody');
      if (host && host.querySelector('[name="leaveType"]')) refreshForm();
    }
  });
  /* 🔴 المرور 3e (أمر MANAGER-4، t34 — شكّ مُبلِّغ الأخطاء S-1): خانة الأرقام في المتصفح تُطلق «change» حين تُغادَر أو يُضغط Enter
     فقط، لا أثناء الكتابة. فخطوة التأكد ٤ في رسالة أ. محمد عمارة («اكتب عدد أيام أكتر من رصيده» ← «تشوف التحذير») كانت لا تُظهر
     التحذير إلا بعد مغادرة الخانة — فقد يظنّ أن السطر لا يعمل. الآن «input» على خانة «الأيام» وحدها يُحدِّث السطر مع كل حرف.
     الموظف والنوع قائمتا اختيار، واختيارٌ منهما «change» أصلاً؛ والتاريخ يُطلق «change» حين يكتمل — فلا حاجة لهما هنا، ولا تُضاعَف
     قراءة الرصيد. الرصيد يُقرأ من القاعدة مرة واحدة لكل موظف وسنة (cache أعلاه، ومنذ 3f تُشارَك القراءة التي ما زالت في الطريق أيضاً)، فالكتابة لا تُكرّر الطلب، وكل تحديث يقرأ قيمة
     الخانة بعد انتظار الرصيد، فيبقى آخر ما كُتب هو المعروض.
     🔴 Pass 3e (MANAGER-4's order, t34 — the bug-reporter's suspicion S-1): a number box in a browser fires «change» only when it is
     left or Enter is pressed, NOT while typing. So self-check ٤ in أ. محمد عمارة's note («type more days than his balance» → «you
     see the warning») showed the warning only after he left the box — he could think the line does not work. Now «input» on the
     «days» box alone refreshes the line with every keystroke. Employee and type are select lists, where choosing already fires
     «change»; the date fires «change» once it is complete — so neither is added here and no balance read is doubled. The balance is
     read from the database once per employee and year (the cache above, and since 3f a read still on its way is shared too), so typing does not repeat the request, and every refresh
     reads the box's value AFTER the balance arrives, so the last thing typed is what shows. */
  document.addEventListener('input', function (e) {
    var n = e.target && e.target.getAttribute && e.target.getAttribute('name');
    if (n !== 'days') return;
    var host = document.getElementById('modalBody');
    if (host && host.querySelector('[name="leaveType"]')) refreshForm();
  });

  /* 🔴 لافّة EntityPage.openForm التي كانت هنا حُذفت — أُمسك فخٌّ مسجَّل في
     هذا المشروع: أزرار السجلّ («جديد» entity.js:246، تعديل :265، نسخ :317،
     تعديل التفاصيل :408) تنادي الدالّة **المغلقة** openForm مباشرة، لا
     EntityPage.openForm — فأيّ لافّةٍ على الخاصية المُصدَّرة لا تعمل من ذلك
     الطريق إطلاقاً، وهو الطريق الذي يفتح منه الناس هذه الشاشة فعلاً
     (التصدير في entity.js:906-908 مجرّد إسنادٍ لا يغيّر شيئاً من ذلك). كلا
     العملين — refreshForm() لنموذج الإجازة، وزرّ الرصيد الافتتاحي لبطاقة
     الموظف — انتقلا إلى لافّة UI.modal الواحدة في §٤ أدناه، التي تقرأ
     data-module من #entForm مباشرة بدل الاعتماد على معامل moduleId الذي لا
     يصل إليها أبداً على هذا الطريق. وسقطت معه إعادةُ محاولة ٦٠/٤٠٠ مللي
     ثانية: تلك كانت تخمين انتظارٍ غير موجود — UI.modal يملأ #modalFoot
     بشكل متزامن (ui.js:99-100،94-142) فلا حاجة لانتظارٍ إطلاقاً.
     🔴 The EntityPage.openForm wrapper that stood here was DELETED — caught
     by a trap already recorded on this project: the register's buttons
     («new» entity.js:246, edit :265, copy :317, detail-edit :408) call the
     internal CLOSURE openForm directly, never EntityPage.openForm — so a
     wrapper on the exported property never fires from that path at all,
     which is exactly how people open this screen (the export at
     entity.js:906-908 is a plain assignment that changes none of this).
     Both jobs — refreshForm() for the leave form, and the opening-balance
     button on the employee card — moved into the ONE UI.modal wrapper in §4
     below, which reads data-module off #entForm directly instead of relying
     on a moduleId parameter that never reaches it on this path. The 60/400ms
     retry went with it: that was guessing at a wait that does not exist —
     UI.modal fills #modalFoot SYNCHRONOUSLY (ui.js:99-100,94-142), so no
     wait is needed at all. */

  /* ═══ ٤ · التفاصيل — الرصيد أمام من سيوقّع، قبل أن يوقّع ═══════════════
     The balance in front of whoever is about to sign, BEFORE they sign.

     🔴 فخّ مسجَّل في هذا المشروع، وتحقّقتُ منه في الملف الحيّ لا من ملاحظة:
        الضغط على صفّ في السجلّ (`pages/entity.js:253-257`) وزرّ 👁
        (`:264`) ينادِيان **الدالّة الداخلية** `openDetail`، لا
        `EntityPage.openDetail`. فلَفُّ `EntityPage.openDetail` **لا يعمل من
        السجلّ إطلاقاً** — وهو بالضبط الطريق الذي يفتح منه الناس المستندات.
        (نفس العطل أصاب لوحات المرفقات من قبل.)
        فنلفّ `UI.modal` بدلاً منه — وهي القاعدة المكتوبة في هذا المشروع:
        «لُفَّ UI.modal، ولا تراقب الـDOM»، لأن النماذج تُفتح داخل #modalHost.
     🔴 A RECORDED TRAP, and I verified it in the live file rather than from a
        note: a register row (`pages/entity.js:253-257`) and the 👁 button
        (`:264`) call the INTERNAL `openDetail`, not `EntityPage.openDetail`.
        So wrapping `EntityPage.openDetail` NEVER FIRES FROM THE REGISTER —
        which is exactly how people open documents. (The attachments panels
        were bitten by this same thing.) We wrap `UI.modal` instead, which is
        this project's own written rule: wrap UI.modal, never watch the DOM. */
  var LEAVES_LABEL = (function () {
    var m = Schema.get('leaves');
    return m && m.label ? L(m.label) : null;
  })();

  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    lbGen++;   /* 🔴 3f: a new window — every balance answer asked for before it is stale (refreshForm above, the details below) */
    try {
      /* ١ · تفاصيل الإجازة (السجلّ، للمراجع والمعتمد) — بعنوان النافذة، كالسابق
         1 · leave DETAILS (register view, for reviewer/approver) — by the
         window's title, as before. */
      var title = opts && opts.title ? String(opts.title) : '';
      if (LEAVES_LABEL && title.indexOf(LEAVES_LABEL) === 0 && title.indexOf(' — ') !== -1) {
        var docNo = title.split(' — ').pop().trim();
        var rec = Store.all('leaves').filter(function (r) { return r.docNo === docNo; })[0];
        if (rec) {
          (async function () {
            var year = rec.fromDate ? Number(String(rec.fromDate).slice(0, 4)) : new Date().getFullYear();
            if (!maySeeBalance()) return;
            var myGen = lbGen;
            var bal = await balanceOf(rec.employee, year);
            /* 🔴 3f (bq10 R3): another leave's window opened while this answer was out — it is not that window's balance */
            if (myGen !== lbGen) return;
            paint(document.getElementById('modalBody'), sentence(bal, rec.days, rec.leaveType) || '', false);
          })();
        }
      }

      /* ٢ · نموذج الإجازة (جديد/تعديل) ونموذج الموظف — بـ#entForm، لا بلافّة
         EntityPage.openForm منفصلة (حُذفت أعلاه). أزرار السجلّ تنادي
         الدالّة المغلقة openForm مباشرة، فلا تصل أي لافّة على الخاصية
         المُصدَّرة إلى هذا الطريق إطلاقاً (entity.js:246،265،317،408).
         النموذج نفسه يحمل data-module و(عند التعديل) data-record-id
         (entity.js:544-546)، وUI.modal يملأ الجسم والتذييل بشكل متزامن
         (ui.js:94-142)، فتُقرأ هذه السمات وتُحقن الأزرار فور عودة
         origModal.apply أعلاه، بلا أي setTimeout.
         2 · the leave FORM (new/edit) and the employee form — by #entForm,
         never by a separate EntityPage.openForm wrapper (deleted above).
         The register's buttons call the internal closure openForm directly,
         so a wrapper on the exported property never reaches this path at
         all (entity.js:246,265,317,408). The form itself carries
         data-module and, when editing, data-record-id (entity.js:544-546),
         and UI.modal fills body and footer SYNCHRONOUSLY (ui.js:94-142), so
         these attributes are read and the button injected the instant
         origModal.apply above returns — no setTimeout at all. */
      var f = document.getElementById('entForm');
      var mod = f ? f.getAttribute('data-module') : null;
      if (mod === 'leaves') { refreshForm(); }
      if (mod === 'employees') {
        var recId = f.getAttribute('data-record-id');
        if (recId) injectOpeningButton('employees', recId);
      }
    } catch (e) { console.error('leave-balance.js: ' + e.message); }
    return out;
  };
  /* بصمة تُقرأ في التجربة · a fingerprint the trial reads */
  UI.__p11LeaveBalanceModalWrapped = true;

  /* ═══ ٥ · حين ترفض القاعدة: الرقمان بجوار الرفض ══════════════════════
     🔴 هذا الغلاف داخليّ عمداً — `money-send-check.js` يجب أن يبقى الأخارجي.
     🔴 This wrapper is deliberately INNER — money-send-check.js stays outermost. */
  var origTransition = Workflow.transition;
  Workflow.transition = async function (moduleId, recId, action, reason) {
    var res = await origTransition.apply(Workflow, arguments);
    try {
      if (moduleId === 'leaves' && res && res.ok === false && /رصيد الإجازات لا يكفي|Insufficient leave/i.test(res.error || '')) {
        var rec = Store.find('leaves', recId);
        if (rec) {
          var year = rec.fromDate ? Number(String(rec.fromDate).slice(0, 4)) : new Date().getFullYear();
          cache = {};                                  /* الرقم قد تغيّر · the figure may have moved */
          if (!maySeeBalance()) return;
          var bal = await balanceOf(rec.employee, year);
          if (bal) {
            res.error = res.error + ' — ' + L({
              ar: 'الرصيد المتاح ' + d1(bal.balance) + ' يوم والطلب ' + d1(rec.days) + ' يوم. غيّر عدد الأيام أو اطلب رصيداً افتتاحياً من الموارد البشرية.',
              en: 'Available ' + d1(bal.balance) + ' days, requested ' + d1(rec.days) + '. Change the number of days, or ask HR for an opening balance.'
            });
          }
        }
      }
    } catch (e) { console.error('leave-balance.js: ' + e.message); }
    return res;
  };
  /* بصمة تُقرأ في تجربة الترتيب · a fingerprint the wiring trial reads */
  Workflow.__p11LeaveBalanceWrapped = true;

  /* ═══ ٦ · «رصيد افتتاحي» في بطاقة الموظف — لمدير الموارد البشرية وحده ═══
     🔴 كان هذا القسم يُعرِّف الدالّة ولا يناديها من أي مكان — أمسكه المُدمِج:
        «صفر منادين» في staged-browser و site-p11 و portal. والنتيجة أن رسالة
        أ. محمد عمارة (سطر ٦٣ من مذكّرة التسليم) تقول له اكتب رصيداً افتتاحياً
        «من بطاقته»، والزرُّ غير موجود. ولأن السجلّ لا يمكن أن يكتسب صفَّ
        افتتاحٍ أبداً، يبقى كلُّ موظفٍ بلا رصيد، فتقول اللوحة دائماً «لا يوجد
        رصيد… لن يُرفض» ولا يعمل الحارس ولو مرّة.
        وهذا هو شكلُ العطل المتكرّر في هذا المسار: **غيابٌ صامت** — ميزةٌ لا
        تظهر، لا ميزةٌ تُخطئ. وإرسالُ رجلٍ إلى زرٍّ غير موجود هو الأمر ١٩.
     🔴 This section DEFINED the function and nothing anywhere called it — the
        integrator caught it: zero callers across staged-browser, site-p11 and
        portal. So أ. محمد عمارة's delivery note (line 63) tells him to type an
        opening balance «from the employee's card» and the button is not there.
        And because the ledger can never gain an opening row, everyone stays
        with no balance, the panel always reads «no balance… nothing will be
        refused», and the guard never engages once. That is this lane's
        recurring shape — SILENT ABSENCE, a feature that does not appear rather
        than one that breaks — and sending a man to a button that does not
        exist is Standing Order 19. */
  var OPEN_BTN = 'p11LeaveOpening';

  /* نفس الأدوار التي تقبلها الدالّة في القاعدة (az_p11_leave_set_opening).
     تُكتب هنا مرّة واحدة، ويُقاس الاتفاق في تجربة، لا يُفترض.
     The same roles the database function accepts. Written once here, and the
     agreement is MEASURED in a trial rather than assumed. */
  var OPENING_ROLES = ['admin', 'gm', 'hr_manager'];
  function maySetOpening() {
    /* 🔴 Auth.current — لا Auth.currentUser، وهي غير موجودة أصلاً (auth.js:1045).
       كتبتُها خطأً خلف حارس `&&`، فكانت الدالّة تُرجع false دائماً ولا يظهر
       الزرّ أبداً: أي **نفس الغياب الصامت** الذي أُصلحه هنا، في إصلاحه نفسه.
       أمسكها قراءةُ auth.js الحيّ، لا الذاكرة.
       🔴 Auth.current — not Auth.currentUser, which does not exist at all
       (auth.js:1045). I wrote it wrongly behind an `&&` guard, so this would
       have returned false for ever and the button would never have appeared:
       the SAME SILENT ABSENCE I am fixing, inside the fix for it. Caught by
       reading the live auth.js rather than by remembering. */
    var r = (Auth.current() || {}).role;
    return OPENING_ROLES.indexOf(r) !== -1;
  }

  /* 🔴 الخانة تبدأ فارغة. كانت تبدأ بـ«٢١» — أمسكه المشرف: عدد أيام الإجازة
     السنوية على قائمة «لا يُخمَّن شيء» (سؤال أ. عمارة ٣ وسؤال المحامي ٢، وكلاهما
     مفتوح)، فضغطةُ «حفظ» واحدة كانت تجعل رقماً قانونياً لم يوافق عليه أحد
     رصيداً حقيقياً لإنسان — ثم يفرضه الحارس بعد ذلك.
     🔴 The box starts EMPTY. It used to start at «21» — the supervisor caught
     it: the annual leave day-count is on the nothing-may-be-guessed list
     (عمارة ٣ and the lawyer's ٢, both open), so one press of «حفظ» would have
     made a legal number nobody approved into a real person's balance, which
     the guard would then enforce. */
  function askDays(year, onOk) {
    /* حوارُ الشاشة نفسها لا prompt المتصفّح: لا يستعمل هذا المشروع prompt في
       ملفٍّ واحد (قِيس)، وقد يُكتَم في بعض السياقات فيصمت الزرّ تماماً.
       The portal's own dialog, not the browser prompt: this project uses
       prompt in not one file (measured), and it can be suppressed in some
       contexts, which would make the button wholly silent. */
    UI.modal({
      size: 'narrow',
      title: L({ ar: 'الرصيد الافتتاحي لسنة ' + year, en: 'Opening leave balance for ' + year }),
      body: '<label class="field"><span class="field-label">' +
        UI.esc(L({ ar: 'عدد الأيام', en: 'Number of days' })) +
        '</span><input class="input" id="' + OPEN_BTN + 'Days" type="number" min="0" step="0.5" value="" required></label>' +
        '<p class="field-hint">' + UI.esc(L({
          ar: 'يُكتب مرة واحدة لكل موظف من بطاقته. لا يغيّر أي إجازة سابقة.',
          en: 'Typed once per employee from their card. It changes no existing leave.'
        })) + '</p>',
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        { label: L({ ar: 'حفظ', en: 'Save' }), cls: 'btn-primary', keepOpen: true,
          onClick: function () {
            var el = document.getElementById(OPEN_BTN + 'Days');
            var raw = String(el && el.value || '').trim();
            if (!raw) {
              UI.toast(L({ ar: 'اكتب عدد الأيام — لا يوجد رقم افتراضي، ولن نخمّنه',
                           en: 'Type the number of days — there is no default and we will not guess one' }), 'warn', 6000);
              return false;
            }
            var days = Number(raw.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }));
            if (!isFinite(days) || days < 0) {
              UI.toast(L({ ar: 'اكتب عدد أيام صحيحاً', en: 'Type a valid number of days' }), 'warn', 5000);
              return false;
            }
            UI.closeModal();
            onOk(days);
          } }
      ]
    });
  }

  async function setOpening(employeeId, year) {
    return new Promise(function (resolve) {
      askDays(year, async function (days) {
        var rpc = await Auth.client().rpc('az_p11_leave_set_opening',
          { p_employee: employeeId, p_year: year, p_days: days, p_note: null });
        if (rpc.error) {
          UI.toast(L({ ar: 'تعذّر الحفظ: ' + rpc.error.message, en: 'Could not save: ' + rpc.error.message }), 'error', 9000);
          return resolve(false);
        }
        cache = {};
        UI.toast(L({ ar: 'الرصيد الافتتاحي الآن ' + d1(days) + ' يوم', en: 'Opening balance is now ' + d1(days) + ' days' }), 'success', 6000);
        resolve(true);
      });
    });
  }

  /* الزرّ يُحقن في بطاقة الموظف — حيث قالت المذكّرة إنه سيكون، لا في مكانٍ
     أفضل. ويُلَفّ openForm لا openDetail: نقرةُ السجلّ تنادي المغلقة الداخلية
     في entity.js:253-257 فلا تصل إلى أي لافّة — فخّ مسجَّل في هذا المشروع.
     The button is injected into the EMPLOYEE CARD — where the note said it
     would be, not somewhere better. openForm is wrapped, never openDetail: a
     register row click calls entity.js's internal closure (253-257) and
     reaches no wrapper at all — a recorded trap on this project. */
  function injectOpeningButton(moduleId, recId) {
    if (moduleId !== 'employees' || !recId || !maySetOpening()) return;
    /* «modalFoot» بمُعرِّفه، وهو ما تكتبه ui.js:99 فعلاً — لا صنفٌ مخترَع.
       #modalFoot by its id, which is what ui.js:99 actually writes — not an
       invented class name. */
    var foot = document.getElementById('modalFoot');
    if (!foot || document.getElementById(OPEN_BTN)) return;
    var b = document.createElement('button');
    b.id = OPEN_BTN;
    b.type = 'button';
    b.className = 'btn btn-ghost';
    b.textContent = L({ ar: 'رصيد الإجازات الافتتاحي', en: 'Opening leave balance' });
    b.addEventListener('click', function () { setOpening(recId, new Date().getFullYear()); });
    foot.insertBefore(b, foot.firstChild);
  }

  global.LeaveBalance = { balanceOf: balanceOf, sentence: sentence, setOpening: setOpening,
                          maySeeBalance: maySeeBalance, HIDDEN_FROM: HIDDEN_FROM,
                          deducts: deducts, maySetOpening: maySetOpening, OPENING_ROLES: OPENING_ROLES,
                          OPEN_BTN: OPEN_BTN };
  console.info('leave-balance.js: the leave balance panel is installed (inner Send wrapper — money-send-check.js stays outermost).');
})(window);
