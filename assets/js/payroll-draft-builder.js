/* =========================================================================
   payroll-draft-builder.js — «توليد البنود من بيانات الموظفين والحضور»
   payroll-draft-builder.js — one press fills the whole month's payroll sheet.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN: أ. محمد عمارة، «مسير الرواتب» ← «جديد».
   يكتب الشهر، يضغط الزرّ، فيظهر بندٌ لكل موظف: الأساسي والبدلات والتأمينات
   وقسط السلفة وأيام الحضور — كلها من القاعدة، ثم يعدّل ويحفظ كالمعتاد.
   He types the month, presses the button, and one line appears per employee
   with basic, allowances, insurance, the advance instalment and the
   attendance counts already filled from the database. He then edits and
   presses «حفظ» exactly as today.

   ما لا يفعله · WHAT IT DOES NOT DO:
     · لا يحفظ شيئاً بنفسه على مسيرٍ جديد — «حفظ» تبقى بيده وحده.
       On a NEW run it saves nothing by itself — «حفظ» stays his alone.
     · لا يغيّر من يراجع أو يعتمد (القاعدة ٨).
       It changes nobody's review or approval rights (rule 8).
     · لا يخترع معادلة صافٍ ثانية لأي بند: يقرأ صيغة الشاشة نفسها من Schema
       (يكتبها payroll-net.js في حقل lineTotal) — وهي عين ما تستعمله دالّة
       P10 في القاعدة، فلا تنشأ نسخة ثالثة من المعادلة. لكنه **يجمع** هذه
       البنود ويصحّح به رقم الرأس «إجمالي الصافي» (انظر ١ب أدناه) — فالادّعاء
       القديم هنا («لا يحسب شيئاً في المتصفح إطلاقاً») لم يكن دقيقاً؛ الدقيق
       أن صافي كل بندٍ له تعريفٌ واحد يُقرأ لا يُعاد كتابته، والرأس مجرد مجموع
       تلك البنود. (تصحيحٌ في التعليق فقط — لا تغيير في السلوك، بلاغ الأعطال
       ١٣ سبتمبر ٢٠٢٦.)
       It does not invent a second net-pay formula for any line: it READS the
       screen's own formula out of Schema (payroll-net.js writes it onto
       lineTotal) — the same one P10's database function uses, so no third
       copy of the formula is ever created. But it DOES **sum** those lines
       and correct the header «net total» figure with that sum (see 1b
       below) — the old claim here ("it never computes anything in the
       browser at all") was not accurate; the accurate statement is that
       each line's net has ONE definition, read rather than rewritten, and
       the header is only the sum of those lines. (Comment-only correction —
       no behaviour change, bug report 13 Sept 2026.)

   إضافيّ بالكامل · WHOLLY ADDITIVE: احذف هذا الملف وسطرَيه في loader.js
   وservice-worker.js فتعود شاشة اليوم بالحرف.
   Delete this file and its two lines and today's screen returns exactly.

   يُحمَّل بعد · LOAD AFTER: pages/entity.js, hr-department.js, payroll-net.js
   v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══ الاعتماديات تُفحص مرّة واحدة هنا، بأسمائها الحقيقية ═══════════════
     DEPENDENCIES ARE CHECKED ONCE, HERE, BY THEIR REAL NAMES
     🔴 لماذا هنا لا عند الاستعمال: حارسٌ عند الاستعمال (`UI.x && UI.x()`)
        يحوّل اسماً خاطئاً إلى **صمت** لا إلى خطأ. وقعتُ فيها بالفعل في هذا
        الملف: ناديتُ `UI.alert` — وهي ليست دالّة أصلاً بل مسار أيقونة في
        ui.js:62 — فكانت أسماء المستبعَدين من المسير لن تظهر لأحد أبداً.
        فإمّا أن تكون الاعتمادية موجودة ويُنادى عليها بلا حارس، وإمّا ألّا
        يُركَّب الزرّ إطلاقاً. زرٌّ غائب يُلاحَظ؛ زرٌّ يعمل ناقصاً لا يُلاحَظ.
     🔴 WHY HERE AND NOT AT THE CALL SITE: a guard at the call site
        (`UI.x && UI.x()`) turns a wrong name into SILENCE, not an error. I
        walked into exactly that in this file: I called `UI.alert`, which is
        not a function at all but an icon path at ui.js:62, so the names of
        the employees left out of a run would never have reached anyone.
        So either the dependency is present and is called WITHOUT a guard, or
        the button is never installed. A missing button gets noticed; a button
        that works but reports less does not.
     The real export list is ui.js:286-292 — checked against it, not against
     what the names suggest. */
  var NEEDED = [
    ['Schema', global.Schema], ['EntityPage', global.EntityPage], ['Auth', global.Auth],
    ['Store', global.Store], ['UI', global.UI]
  ];
  var missing = NEEDED.filter(function (d) { return !d[1]; }).map(function (d) { return d[0]; });
  if (!missing.length) {
    ['toast', 'modal', 'confirm', 'esc'].forEach(function (fn) {
      if (typeof UI[fn] !== 'function') missing.push('UI.' + fn);
    });
    if (typeof Auth.can !== 'function') missing.push('Auth.can');
    if (typeof Auth.client !== 'function') missing.push('Auth.client');
    if (typeof Store.save !== 'function' || typeof Store.find !== 'function') missing.push('Store.save/find');
    /* ج٥ يحتاج Store.pending لينتظر الخادم — قِيس اسمها في store.js:349،
       لا مُخمَّناً. C5 needs Store.pending to wait for the server — its
       name is measured at store.js:349, never guessed. */
    if (typeof Store.pending !== 'function') missing.push('Store.pending');
  }
  if (missing.length) {
    console.error('payroll-draft-builder.js NOT installed — missing: ' + missing.join(', ') +
                  '. The «توليد البنود» button will not appear, which is deliberate: a button that ' +
                  'worked but reported less would be worse than no button.');
    return;
  }
  /* 🔴 العلَم انتقل من EntityPage إلى UI: اللفّ نفسه صار على UI.modal لا
     EntityPage.openForm (انظر §٤ آخر الملف) — أزرار السجلّ تنادي الدالّة
     المغلقة openForm في entity.js مباشرة، لا الخاصية المُصدَّرة، فلا يعمل
     أي غلافٍ على EntityPage.openForm من ذلك الطريق إطلاقاً (entity.js:
     246،265،317،408؛ التصدير في entity.js:906-908 مجرّد إسنادٍ لا يغيّر ذلك).
     🔴 The flag moved from EntityPage to UI: the wrap itself moved to
     UI.modal, not EntityPage.openForm (see §4 at the end of this file) —
     the register's buttons call entity.js's internal CLOSURE `openForm`
     directly, never the exported property, so a wrapper on
     EntityPage.openForm never fires from there at all (entity.js:
     246,265,317,408; the export at entity.js:906-908 is a plain assignment
     that changes none of this). */
  if (UI.__p11DraftBuilder) return;                  /* لا يُركَّب مرّتين · never twice */
  UI.__p11DraftBuilder = true;

  var isAr = function () { return !global.I18N || I18N.getLang() !== 'en'; };
  var L = function (o) { return isAr() ? o.ar : o.en; };
  var BTN_ID = 'p11GenerateLines';
  /* الأدوار التي تسمح لها قاعدة البيانات بالتوليد — نسخةٌ حرفية من الملف A (az_p11_payroll_draft_lines).
     The roles the database lets generate — a literal copy of file A's list (az_p11_payroll_draft_lines). */
  var GEN_ROLES = ['hr', 'hr_manager', 'admin', 'gm'];

  /* ═══════════════════════════════════════════════════════════════════
     ١ · نداء القاعدة — نفس القناة التي يستعملها workflow.js:123
     1 · calling the database — the same channel workflow.js:123 uses
     ═══════════════════════════════════════════════════════════════════ */
  async function fetchLines(period, project, currentRun) {
    /* 🔴 p_current_run: بدونه يَعتبر الخادمُ المسيرَ المفتوحَ «مسيراً آخر»
       فيستبعد كل من عليه بالفعل. أثبته التشغيل على شاشة حقيقية: مسودة فيها
       ثلاثة موظفين، ضغطة واحدة، فيختفي الثلاثة ورسالةٌ خضراء تقول «تمّ».
       🔴 Without p_current_run the server counts the open run as "another
       run" and excludes everyone already on it — proven on a real screen: a
       draft with three employees, one press, and all three vanish behind a
       green «تمّ». (bug reporter, 12 Sept 2026) */
    var rpc = await Auth.client().rpc('az_p11_payroll_draft_lines', {
      p_period: period, p_project: project || null, p_current_run: currentRun || null
    });
    if (rpc.error) throw new Error(rpc.error.message || 'RPC failed');
    return rpc.data;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ب · مجموع الرأس — يُقرأ من التعريف الواحد، ولا يُكتب تعريفٌ ثالث
     1b · the header total — read from the ONE definition, never a third copy

     🔴 لماذا وُجد هذا أصلاً: الزرّ كان يحفظ البنود ويترك «إجمالي الصافي»
     القديم في مكانه. أثبته التشغيل: رأسٌ يقول 8,010 فوق ٢٣ بنداً مجموعها
     23,220 — فيرفض بابُ الإرسال المسير برسالة إنجليزية
     «Payroll total is inconsistent» على شاشة أ. محمد عمارة بلا أي إرشاد.
     البابُ محقّ؛ الزرُّ هو ما ترك المسير في تلك الحال.
     🔴 Why this exists: the button saved the lines and left the OLD net total
     behind. Proven by running: a header reading 8,010 over 23 lines summing
     23,220 — so the Send door refuses the run with the English «Payroll total
     is inconsistent» on أ. محمد عمارة's screen with no instruction at all.
     The door is right; the button is what left the run in that state.

     🔴 ولا نكتب معادلةً ثانية للصافي: تُقرأ صيغة الشاشة نفسها من
     Schema (يكتبها payroll-net.js في حقل lineTotal)، وهي عين القائمتين
     اللتين تستعملهما دالّة P10 في القاعدة. نسخة واحدة، ثلاثة قرّاء.
     🔴 And no second net-pay formula is written here: the screen's own
     formula is READ out of Schema (payroll-net.js writes it onto the
     lineTotal field), and it is the same two lists P10's database function
     uses. One definition, three readers. */
  function netTerms() {
    var pay = global.Schema && Schema.get && Schema.get('payroll');
    var fields = pay && pay.lines && pay.lines.fields;
    var f = fields && fields.filter(function (x) { return x.name === 'lineTotal'; })[0];
    var formula = f && typeof f.formula === 'string' ? f.formula.replace(/\s+/g, '') : '';
    /* لا نقبل إلا جمعاً وطرحاً لأسماء حقول. أي قوس أو ضرب ⇒ لا نفهمها،
       فنقول ذلك بدل أن نخمّن. Only additions and subtractions of field names
       are accepted. Any bracket or multiplication ⇒ we do not understand it,
       and we SAY so rather than guess. */
    if (!formula || !/^[A-Za-z_][A-Za-z0-9_]*([+-][A-Za-z_][A-Za-z0-9_]*)*$/.test(formula)) return null;
    var plus = [], minus = [], m, re = /([+-]?)([A-Za-z_][A-Za-z0-9_]*)/g;
    while ((m = re.exec(formula))) { (m[1] === '-' ? minus : plus).push(m[2]); }
    return { plus: plus, minus: minus };
  }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function netOf(line, terms) {
    var t = 0, i;
    for (i = 0; i < terms.plus.length; i++) t += num(line[terms.plus[i]]);
    for (i = 0; i < terms.minus.length; i++) t -= num(line[terms.minus[i]]);
    return Math.round(t * 100) / 100;
  }

  /* يُعيد {total, repaired} — ويصحّح صافيَ أي بندٍ قديمٍ بائت على الشاشة،
     لأن بابَ الإرسال يعيد حسابه من الخانات لا من الرقم المحفوظ.
     Returns {total, repaired} — and repairs the stored net of any stale line,
     because the Send door recomputes from the boxes, not from the saved
     figure. Returns null when the formula could not be read at all. */
  function headerTotal(lines) {
    var terms = netTerms();
    if (!terms) return null;
    var total = 0, repaired = 0;
    lines.forEach(function (l) {
      var n = netOf(l, terms);
      if (Math.abs(num(l.lineTotal) - n) > 0.02) { l.lineTotal = n; repaired++; }
      total += n;
    });
    return { total: Math.round(total * 100) / 100, repaired: repaired };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · ما يُقال للمستخدم بعد التوليد — الصمت هنا خطر
     2 · what he is told afterwards — silence here would be dangerous
     ═══════════════════════════════════════════════════════════════════ */
  function report(res, merge) {
    var n = (res.lines || []).length;
    var skipped = res.skipped || [];
    /* 🔴 الرسالة تقول ما حدث فعلاً لا ما طُلب: «تمّ توليد ٢٣ بنداً» فوق مسيرٍ
       أُضيف إليه ستةَ عشر بنداً هي رسالةٌ خضراء كاذبة، ومن يقرأها لا يفتح
       المسير ليعدّ. The message says what actually HAPPENED, not what was
       asked for: «Generated 23 lines» over a run that gained sixteen is a
       green lie, and whoever reads it does not open the run to count. */
    var msg = merge
      ? L({
          ar: 'أُضيف ' + merge.added + ' بنداً · ' + merge.kept + ' بنداً كانت موجودة وبقيت كما هي' +
              (merge.repaired ? ' · صُحّح صافي ' + merge.repaired + ' بنداً' : ''),
          en: merge.added + ' lines added · ' + merge.kept + ' already there and left untouched' +
              (merge.repaired ? ' · ' + merge.repaired + ' stale net figures corrected' : '')
        })
      : L({
          ar: 'تمّ توليد ' + n + ' بنداً لشهر ' + res.period,
          en: 'Generated ' + n + ' lines for ' + res.period
        });
    UI.toast(msg, (merge ? merge.added : n) ? 'success' : 'warn', 6000);

    /* 🔴 المستبعَدون يُذكرون بالاسم دائماً. موظفٌ سقط من المسير بصمت هو
       راتبٌ لم يُصرف، ولا أحد يبحث عمّا لا يعرف أنه ناقص.
       🔴 Anyone excluded is ALWAYS named. An employee silently missing from
       the run is a wage nobody paid, and nobody looks for what they do not
       know is absent. */
    if (skipped.length) {
      /* ⚠️ لا يوجد UI.alert في هذا المشروع — ما في ui.js:62 اسمه alert لكنه
         رسمُ أيقونة لا دالّة. أوّل نسخة من هذا الملف نادت UI.alert خلف حارس
         `&& UI.alert`، فكانت **تصمت صمتاً تاماً** ولا تذكر المستبعَدين أبداً —
         أي عكس الغرض الذي كُتبت له بالضبط. أُمسِكت بقراءة قائمة UI المُصدَّرة
         (ui.js:286-292) قبل أن تصل إلى أحد.
         ⚠️ There is NO UI.alert in this project — the `alert` at ui.js:62 is an
         ICON path, not a function. The first version of this file called
         UI.alert behind an `&& UI.alert` guard, so it would have been WHOLLY
         SILENT and never named the excluded employees — the exact opposite of
         why it was written. Caught by reading UI's exported list
         (ui.js:286-292) before it reached anyone. */
      var rows = skipped.map(function (s) {
        return '<li>' + UI.esc((s.code ? s.code + ' — ' : '') + (s.name || s.employee)) +
               ' — ' + UI.esc(s.reason || '') + '</li>';
      }).join('');
      UI.modal({
        title: L({ ar: 'موظفون لم يدخلوا المسير', en: 'Employees left out of the run' }),
        body: '<p>' + UI.esc(L({
          ar: 'هؤلاء ' + skipped.length + ' لم تُولَّد لهم بنود في هذا الشهر، والسبب مكتوب بجوار كل اسم:',
          en: 'These ' + skipped.length + ' had no lines generated this month. The reason is beside each name:'
        })) + '</p><ul>' + rows + '</ul>',
        buttons: [{ label: L({ ar: 'تمام', en: 'OK' }), cls: 'btn-ghost' }]
      });
    }

    /* الخانات التي ما زالت بانتظار إجابة أ. محمد عمارة — يُقال إنها بانتظار،
       فلا يُقرأ الصفر «محسوب». The boxes still waiting on عمارة's answers say
       so, so a zero is never read as "computed". */
    if (n && res.waiting && res.waiting.length) {
      UI.toast(L({ ar: res.waiting[0], en: res.waiting[0] }), 'info', 9000);
    }
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ب · هل الشاشة كما هي محفوظة؟ — قبل أي دمج
     2b · does the SCREEN match what is stored? — before any merge

     🔴 لماذا: لو كتب أ. محمد عمارة إضافيّاً أو غياباً على بندٍ في الشاشة ولم
     يضغط «حفظ» بعد، فإن الدمج هنا يقرأ Store.find (نسخة القاعدة القديمة)
     ويكتبها فوق الشاشة عند إعادة الفتح — فيضيع ما كتبه بصمتٍ تامّ، ولا
     رسالة تقوله. فنقرأ حقول البنود من الـDOM مباشرة (لا من draft المغلق
     داخل entity.js، وهو غير قابل للقراءة من هنا) ونقارنها ببنود القاعدة.
     🔴 WHY: if أ. عمارة typed overtime or an absence into a line on screen
     and has not pressed «Save» yet, merging here reads Store.find (the OLD
     database copy) and writes it back over the screen on reopen — silently
     losing what he typed, with no message at all. So the line fields are
     read straight from the DOM (never from entity.js's closed-over `draft`,
     which cannot be read from here) and compared against the stored lines. */
  /* 🔴 S2 (بلاغ الأعطال ١٣ سبتمبر): كانت القائمة المقارَنة مكتوبةً باليد
     (employee/basic/allowances/overtime/deductions/insurance فقط)، فتتجاهل
     الحقول الثمانية التي يضيفها hr-department.js (transport, housing,
     siteAllowance, incentive, insuranceEmployer, incomeTax,
     advanceDeduction, penalty) — فيقرأ الحارس صفراً منها دائماً ويظنّ
     الشاشة «مطابقة» ولو كُتب في إحداها ٥٠٠ لم يُحفظ قطّ، فتُمحى صامتةً عند
     إعادة الفتح. الحقول تُشتقّ الآن من تعريف الوحدة نفسه وقت النداء —
     Schema.get('payroll').lines.fields — بعد أن يكون hr-department.js
     (يُحمَّل قبل هذا الملف) قد وسّع تلك القائمة فعلياً، فتُقرأ الحقول
     الأربعة عشر معاً لا ستّةٌ فقط. حقول النوع 'calc' (مثل lineTotal) تُستبعد
     بخاصّيتها لا باسمها، لأنها لا تُكتب أبداً بل تُحسب.
     🔴 S2 (bug report, 13 Sept): the compared list used to be HAND-TYPED
     (employee/basic/allowances/overtime/deductions/insurance only), so it
     ignored the eight fields hr-department.js adds (transport, housing,
     siteAllowance, incentive, insuranceEmployer, incomeTax,
     advanceDeduction, penalty) — the guard always read zero for them and
     believed the screen "matched" even with 500 typed and never saved,
     silently erased on reopen. The fields are now DERIVED from the
     module's own definition at call time — Schema.get('payroll').lines.
     fields — after hr-department.js (loaded before this file) has already
     extended that list, so all fourteen fields are read together, never
     six. Type 'calc' (e.g. lineTotal) is excluded by its OWN flag, never
     by name, because it is never typed, only computed. */
  function editableLineFields() {
    var pay = global.Schema && Schema.get && Schema.get('payroll');
    var fields = (pay && pay.lines && pay.lines.fields) || [];
    return fields.filter(function (f) { return f.type !== 'calc'; });
  }

  function screenMatchesStored(existing) {
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return false;                 /* لا نافذة نراها ⇒ لا نفترض التطابق · nothing to read ⇒ never assume a match */
    var rows = wrap.querySelectorAll('tr[data-li]');
    if (rows.length !== existing.length) return false;
    var fields = editableLineFields();
    if (!fields.length) return false;        /* تعذّر قراءة تعريف البنود ⇒ لا نفترض التطابق أبداً · could not read the line definition ⇒ never assume a match */
    for (var i = 0; i < rows.length; i++) {
      var ex = existing[i] || {};
      for (var j = 0; j < fields.length; j++) {
        var f = fields[j];
        var el = rows[i].querySelector('[name="' + f.name + '"]');
        if (!el) continue;
        if (f.type === 'ref' || f.type === 'select') {
          var elVal = String(el.value || '');
          var exVal = String(ex[f.name] === undefined || ex[f.name] === null ? '' : ex[f.name]);
          if (elVal === exVal) continue;
          /* 🔴 S4 (بلاغ الأعطال ١٣ سبتمبر): قائمة الموظفين نشِطةٌ فقط
             (entity.js:775) — موظفٌ أُوقِف بعد أن أُدرِج بندُه يفقد
             <option> قيمتِه، فتقع الخانة على "" حتماً لا لأن أحداً غيّرها.
             هذا فحصٌ لا يمكن إجراؤه إلا على <select> حقيقي في متصفّحٍ
             حقيقي (التجربة t تذكر صراحةً أن صندوق vm المزيّف لا يمثّله)،
             فحين لا تدعم البيئة querySelectorAll نُبقي الحكم القديم
             الحَذِر: فراغٌ أمام قيمةٍ محفوظة = عدم تطابق، لأن الشكّ يُفسَّر
             لصالح الحذر لا لصالح الصمت.
             🔴 S4 (bug report, 13 Sept): the employee list is ACTIVE-ONLY
             (entity.js:775) — an employee stopped after their line was
             added loses the <option> for their id, so the box necessarily
             reads "" though nobody touched it. This can only be checked on
             a REAL <select> in a real browser (the probe states plainly its
             fake vm box cannot represent it); when the environment does not
             support querySelectorAll we keep the old cautious ruling: blank
             against a stored value = a mismatch, because doubt resolves
             toward caution, never toward silence. */
          if (elVal === '' && exVal !== '' && typeof el.querySelectorAll === 'function') {
            var hasOption = false, opts = el.querySelectorAll('option');
            for (var k = 0; k < opts.length; k++) {
              if (String(opts[k].value) === exVal) { hasOption = true; break; }
            }
            if (!hasOption) continue;   /* لا يملك خياراً لهذه القيمة ⇒ لا يمكن أن يكون قد غيّرها · no option for it ⇒ cannot have been his edit */
          }
          return false;
        }
        if (num(el.value) !== num(ex[f.name])) return false;
      }
    }
    return true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ب-٢ · هل الشهر/المشروع على الشاشة هما نفساهما المحفوظان؟
     2b-2 · does the on-screen MONTH/PROJECT match the stored run?

     🔴 S6 (بلاغ الأعطال ١٣ سبتمبر): مسيرٌ محفوظ بشهر 2026-07، وكُتب في
     الخانة 2026-08 دون حفظ؛ الزرّ كان يجلب بنود أغسطس ويحفظها **داخل**
     مسير يوليو. لا حقل site على وحدة «مسير الرواتب»
     (schema.js:1046-1059 — period/date/project/employeeCount/notes/
     preparedBy/checkedBy/disbursedBy/payMethod فقط)، فلا شيء آخر يُفحَص
     هنا. نقارن `res.period` (المُطبَّع فعلاً من الخادم نفسه، دالّة
     az_p11_period_norm — الطريقة الوحيدة التي يُطبَّع بها شهرٌ في هذا
     الملف أصلاً، فلا نكتب مُطبِّعاً ثانياً هنا) بـ`storedRun.period`
     (مُطبَّعٌ بالفعل بمُشغِّل القاعدة عند الحفظ)، وكذلك المشروع.
     🔴 S6 (bug report, 13 Sept): a run stored at 2026-07, with 2026-08
     typed into the box but not saved; the button fetched August's lines and
     saved them INSIDE the July run. There is no `site` field on the "مسير
     الرواتب" module (schema.js:1046-1059 — only period/date/project/
     employeeCount/notes/preparedBy/checkedBy/disbursedBy/payMethod), so
     nothing else is checked here. We compare `res.period` (already
     normalised by the DATABASE itself, az_p11_period_norm — the only place
     this file ever normalises a period, so no second normaliser is written
     here) against `storedRun.period` (already normalised by the database's
     own save trigger), and likewise the project.
     ═══════════════════════════════════════════════════════════════════ */
  function headerMismatch(res, storedRun) {
    if (!storedRun) return false;
    var screenPeriod = String((res && res.period) || '');
    var storedPeriod = String(storedRun.period || '');
    if (screenPeriod && storedPeriod && screenPeriod !== storedPeriod) return true;
    var screenProject = String((res && res.project) || '');
    var storedProject = String(storedRun.project || '');
    if (screenProject !== storedProject) return true;
    return false;
  }

  /* رسالةٌ واحدة، «غير محفوظة» في كل صيغها — سواء كان السبب بنداً لم يُحفظ
     أو شهراً/مشروعاً يختلف عمّا هو محفوظ، فكلاهما «شيءٌ على الشاشة لا
     يطابق ما تحفظه القاعدة».
     ONE message, "unsaved" in every shape — whether the cause is a line
     never saved or a month/project differing from what is stored, both are
     "something on screen that does not match what the database holds". */
  function unsavedOrMismatchMessage(isHeader) {
    return L(isHeader ? {
      ar: 'الشهر أو المشروع على الشاشة يختلف عمّا هو محفوظ لهذا المسير (بيانات غير محفوظة) — احفظ أولاً ثم «توليد البنود» مرة أخرى',
      en: 'The month or project on screen differs from what is stored on this run (unsaved data) — save first, then «Generate lines» again'
    } : {
      ar: 'لديك تعديلات غير محفوظة على هذا المسير — اضغط «حفظ» أولاً ثم «توليد البنود» مرة أخرى',
      en: 'You have unsaved changes on this run — press «Save» first, then «Generate lines» again'
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ب-٣ · مسيرٌ جديد ومكتوبٌ فيه بالفعل — بنودٌ أو رأسٌ (تعديل المدير ٤)
     2b-3 · a NEW run that already has data typed — lines OR header
        (manager's condition 4)

     🔴 S5 (بلاغ الأعطال ١٣ سبتمبر): على مسيرٍ جديدٍ لم يُحفظ بعد، كان
     الزرّ يعيد فتح النموذج بـpreset يحمل فقط period/project/employeeCount/
     lines — فأيّ بندٍ كتبه أ. عمارة بيده (موظفٌ اختاره، رقمٌ كتبه) يُمحى،
     ومعه أيّ حقلٍ آخر في الرأس لا يحمله الـpreset (تاريخ الإعداد، ملاحظات،
     من أعدّ/راجع/صرف، طريقة الصرف) — فهذا ما أضافه تعديل المدير: يُرفَض
     التوليد أيضاً لو اختلف حقلٌ في الرأس عمّا سيصير عليه الشاشة بعد
     التوليد، لا البنود وحدها.
     🔴 S5 (bug report, 13 Sept): on a brand-new, not-yet-saved run, the
     button used to reopen the form with a preset carrying ONLY period/
     project/employeeCount/lines — so any line أ. عمارة had typed by hand
     (an employee chosen, a number typed) was wiped, and so was any OTHER
     header box the preset does not carry (prepared-on date, notes, who
     prepared/checked/disbursed, payment method) — which is what the
     manager's amendment adds: refuse the generation also when a HEADER box
     differs from what the screen would show after generating, not lines
     alone. */
  function newRunLinesTyped() {
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return false;
    var rows = wrap.querySelectorAll('tr[data-li]');
    if (!rows || !rows.length) return false;
    var fields = editableLineFields();
    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < fields.length; j++) {
        var f = fields[j];
        var el = rows[i].querySelector('[name="' + f.name + '"]');
        if (!el) continue;
        if (f.type === 'ref' || f.type === 'select') {
          if (el.value) return true;              /* موظفٌ اختير بالفعل · an employee is already chosen */
        } else if (num(el.value) !== 0) {
          return true;                             /* رقمٌ غير صفريّ كُتب بالفعل · a non-zero number was already typed */
        }
      }
    }
    return false;
  }

  /* 🔴 ١٥ سبتمبر ٢٠٢٦ (المرور 3i، FINISHER-8 بأمر MANAGER-4): يجب أن يساوي «اليوم» هنا اليومَ الذي يملأ به النموذجُ «تاريخ الإعداد» (entity.js:517 ينادي I18N.today، i18n.js:384)، وإلا قرأ الزرّ التاريخ
     المملوء آلياً «بيانات غير محفوظة» ورفض «توليد البنود» على كل مسيرٍ جديد — قيس: T13 على ساعة القاهرة 23/1 وعلى ساعة UTC ‏24/0 (00:04–00:13).
     كان السطر يقصّ نصّ التاريخ بصيغة ISO إلى عشرة أحرف، وتلك الصيغة بتوقيت غرينتش دائماً، فبين 00:00 و03:00 بالقاهرة (02:00 شتاءً)
     يكون «اليوم» يومَ أمس. نفس عائلة إصلاح i18n.js في ٢ سبتمبر وملف 77. I18N.today أولاً (مصدرٌ واحد لليوم في البورتال كله)، وإن غاب:
     الحساب نفسه من مُحصِّلات الوقت المحلي.
     🔴 15 Sept 2026 (pass 3i, FINISHER-8 on MANAGER-4's order): «today» here must equal the day the form puts in «تاريخ الإعداد» (entity.js:517 calls I18N.today, i18n.js:384), or the button
     reads the auto-filled date as «unsaved data» and refuses «توليد البنود» on every NEW run — measured: T13 on the Cairo clock 23/1, on
     a UTC clock 24/0 (00:04–00:13).
     The line cut the ISO date string to ten characters, and that string is always UTC, so between 00:00 and 03:00 Cairo (02:00 in
     winter) «today» was yesterday. Same family as i18n.js's 2 Sept fix and file 77. I18N.today first (one source for the day across
     the portal); if it is missing, the same computation from local getters. */
  function localToday() {
    if (global.I18N && typeof global.I18N.today === 'function') return global.I18N.today();
    var d = new Date(), m = String(d.getMonth() + 1), day = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
  }

  function headerFieldDefaultValue(f) {
    if (f.default === 'today') return localToday();
    if (f.default !== undefined) return f.default;
    return f.type === 'checkbox' ? false : '';
  }

  function newRunHeaderTyped(host) {
    var pay = global.Schema && Schema.get && Schema.get('payroll');
    var fields = (pay && pay.fields) || [];
    /* period وproject يُنقَلان بالفعل إلى الـpreset فلا يُفحصان هنا؛
       employeeCount محسوبٌ لا يُكتَب أبداً. الباقي (تاريخ الإعداد،
       ملاحظات، من أعدّ/راجع/صرف، طريقة الصرف) يختفي بصمتٍ لو أُعيد فتح
       النموذج بـpreset لا يحمله — وهذا ما نحرسه هنا.
       period and project already carry into the preset, so they are not
       checked here; employeeCount is computed, never typed. Everything
       else (prepared-on date, notes, who prepared/checked/disbursed,
       payment method) would vanish silently if the form reopens with a
       preset that does not carry it — that is what this guards. */
    var CARRIED = { period: true, project: true, employeeCount: true };
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (CARRIED[f.name] || f.type === 'calc' || f.readonly) continue;
      var el = host.querySelector('[name="' + f.name + '"]');
      if (!el) continue;
      var val = f.type === 'checkbox' ? !!el.checked
        : (f.type === 'number' || f.type === 'money' || f.type === 'percent') ? (el.value === '' ? '' : Number(el.value))
        : String(el.value || '');
      if (String(val) !== String(headerFieldDefaultValue(f))) return f;
    }
    return null;
  }

  /* يُعيد وصفاً عربياً/إنجليزياً قصيراً لِما وُجد مكتوباً، أو null إن لم
     يوجد شيء. Returns a short ar/en description of what was found already
     typed, or null if nothing was. */
  function newRunAlreadyTyped(host) {
    if (newRunLinesTyped()) return L({ ar: 'بنود', en: 'lines' });
    var f = newRunHeaderTyped(host);
    return f ? L(f.label) : null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ج · شريط تأكيدٍ داخل الصفّ — بديل UI.confirm المكسور (انظر التعليق في run())
     2c · an inline confirm strip in the button's own row — replacing the
     broken UI.confirm (see the comment inside run())
     ═══════════════════════════════════════════════════════════════════ */
  function showConfirm(text, onOk) {
    var btn = document.getElementById(BTN_ID);
    var row = document.getElementById(BTN_ID + 'Confirm');
    if (!btn || !row) {
      /* لا نتابع صامتين لو غاب الشريط — عمليةٌ ماليّة لا تُوافَق تلقائياً أبداً.
         We never proceed silently if the strip is missing — a MONEY action
         is never auto-approved. */
      UI.toast(L({ ar: 'تعذّر عرض التأكيد — أعد فتح المسير وحاول مرة أخرى', en: 'Could not show the confirmation — reopen the run and try again' }), 'error', 7000);
      return;
    }
    var textEl = document.getElementById('p11GenConfirmText');
    if (textEl) textEl.textContent = text;
    btn.hidden = true;
    row.hidden = false;
    var okBtn = document.getElementById('p11GenConfirmOk');
    var cancelBtn = document.getElementById('p11GenConfirmCancel');
    function cleanup() {
      row.hidden = true;
      btn.hidden = false;
      if (okBtn) okBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
    }
    if (okBtn) okBtn.onclick = function () { cleanup(); onOk(); };
    if (cancelBtn) cancelBtn.onclick = function () { cleanup(); };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢د · الدمج والحفظ والتأكّد من الخادم — بعد الضغط على «تأكيد» فقط
     2d · merge, save, and confirm against the SERVER — only after «Confirm»
     ═══════════════════════════════════════════════════════════════════ */
  async function finishMerge(recId, existing, toAdd, kept, res) {
    /* 🔴 يُعاد الفحصان هنا لأن الكتابة ممكنة بين ظهور الشريط والضغط على
       «تأكيد» (التعليق D3 أعلاه) — ونقرأ Store.find من جديد هنا، لا نعيد
       استعمال أي نسخةٍ سابقة، فقد يكون شهرٌ أو مشروعٌ تغيّر على القاعدة في
       تلك الأثناء أيضاً.
       🔴 Both checks are repeated here because typing is possible between
       the strip appearing and «Confirm» being pressed (comment D3 above) —
       and Store.find is read AGAIN here, never a stale earlier copy,
       because the month or project could also have changed on the database
       in that window. */
    var storedNow = Store.find('payroll', recId) || {};
    if (headerMismatch(res, storedNow)) {
      UI.toast(unsavedOrMismatchMessage(true), 'warn', 9000);
      return;
    }
    if (!screenMatchesStored(existing)) {
      UI.toast(unsavedOrMismatchMessage(false), 'warn', 9000);
      return;
    }

    var merged = existing.concat(toAdd);
    /* الرأس يُحسب من البنود بعد الدمج، وإلا رفض بابُ الإرسال المسير.
       The header is recomputed from the merged lines, or the Send door
       refuses the run. */
    var head = headerTotal(merged);
    var patch = { lines: merged, employeeCount: merged.length };
    if (head) {
      patch.netTotal = head.total;
    } else {
      /* لم نستطع قراءة صيغة الصافي من الشاشة ⇒ لا نخترع رقماً للرأس.
         يُقال ذلك صراحةً، لأن الصمت هنا ينتهي برفضٍ إنجليزي عند الإرسال.
         The net formula could not be read ⇒ we invent no header figure, and
         we SAY so, because silence here ends as an English refusal at Send. */
      UI.toast(L({
        ar: 'أُضيفت البنود، لكن إجمالي الصافي لم يُحدَّث — افتح المسير واحفظه قبل الإرسال',
        en: 'Lines added, but the net total was NOT updated — open the run and save it before sending'
      }), 'warn', 9000);
    }

    Store.save('payroll', recId, patch);
    /* 🔴 لا نصدّق «أُرسل» فقط لأن الطابور فرغ — Store.save تعود قبل أن يجيب
       الخادم (فخّ مسجَّل)، فننتظر الطابور أولاً ثم **نقرأ من الخادم نفسه**،
       لا من الذاكرة المحلية وحدها، ونتحقّق أن كل موظفٍ أُضيف موجودٌ فعلاً.
       🔴 We do not trust "sent" just because the queue emptied — Store.save
       returns before the server answers (a recorded trap), so we wait for
       the queue first, then read back FROM THE SERVER ITSELF — never the
       local cache alone — and confirm every added employee is really there. */
    var deadline = Date.now() + 15000;
    while (Store.pending() > 0 && Date.now() < deadline) { await sleep(250); }
    if (Store.pending() > 0) {
      UI.toast(L({
        ar: 'أُضيفت البنود محلياً ولم يتأكّد الخادم بعد — افتح المسير بعد عودة الاتصال',
        en: 'The lines were added on this device, but the server has not confirmed yet — open the run again once you are back online'
      }), 'warn', 9000);
      /* 🔴 S7 (بلاغ الأعطال ١٣ سبتمبر): كنّا نكتفي بالتحذير ونترك النموذج
         القديم مفتوحاً، وبنوده لا تزال ما قبل الدمج (نسخة entity.js
         المغلقة `draft`، انظر commit()، entity.js:866) — فأيّ «حفظ» لاحقٍ
         على ذلك النموذج يكتب البنود القديمة فوق ما أُضيف محلياً على هذا
         الجهاز، فيضيع الدمج بصمتٍ تام. نعيد فتح النموذج الآن رغم أن الخادم
         لم يتأكّد بعد، لأن النسخة المحلية هي الحقيقة الوحيدة المتاحة لهذا
         الجهاز — بلا أي رسالة خضراء، لأن التأكّد نفسه لم يحدث بعد.
         🔴 S7 (bug report, 13 Sept): we used to warn and leave the STALE
         form open, and its lines are still the pre-merge ones (entity.js's
         closed-over `draft`, see commit(), entity.js:866) — a later «حفظ»
         on that form would write the OLD lines back over what was merged
         locally on this device, losing the merge in total silence. We
         reopen the form now even though the server has not confirmed yet,
         because the local copy on THIS device is the only truth it has —
         with no green toast, because confirmation itself has not happened. */
      EntityPage.openForm('payroll', recId);
      return;
    }

    var back = null;
    try {
      back = await Auth.client().from('payroll').select('id,lines,updatedAt').eq('id', recId).maybeSingle();
    } catch (e) { back = { error: e }; }

    var localRec = Store.find('payroll', recId) || {};
    var serverLines = (back && !back.error && back.data && Array.isArray(back.data.lines)) ? back.data.lines : null;
    var allAddedPresent = !!serverLines && toAdd.every(function (l) {
      return serverLines.some(function (x) { return x.employee === l.employee; });
    });
    var confirmed = !!serverLines && serverLines.length === merged.length && allAddedPresent &&
      localRec._syncState !== 'conflict';

    if (!confirmed) {
      var serverMsg = (back && back.error && back.error.message) ? back.error.message : '';
      var localErr = localRec._syncError || '';
      UI.toast(L({
        ar: 'لم يتأكّد الحفظ من الخادم' + (serverMsg ? ' — ' + serverMsg : '') + (localErr ? ' — ' + localErr : '') + '. أعِد فتح المسير وتحقّق قبل الإرسال.',
        en: 'The save was not confirmed by the server' + (serverMsg ? ' — ' + serverMsg : '') + (localErr ? ' — ' + localErr : '') + '. Reopen the run and check before sending.'
      }), 'error', 12000);
      /* نعيد قراءة البوابة من الخادم فتُظهر الشاشة الحقيقة لا افتراضنا.
         We re-read the portal from the server so the screen shows the truth,
         not our assumption. */
      if (typeof Store.reload === 'function') { try { await Store.reload(); } catch (e2) { console.error('payroll-draft-builder.js: reload failed', e2); } }
      EntityPage.openForm('payroll', recId);
      return;
    }

    EntityPage.openForm('payroll', recId);
    report(res, { added: toAdd.length, kept: kept, repaired: head ? head.repaired : 0 });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الزرّ نفسه
     3 · the button
     ═══════════════════════════════════════════════════════════════════ */
  async function run(recId) {
    var host = document.getElementById('modalHost') || document;
    var periodEl = host.querySelector('[name="period"]');
    var projectEl = host.querySelector('[name="project"]');
    var period = periodEl ? String(periodEl.value || '').trim() : '';

    if (!period) {
      UI.toast(L({ ar: 'اكتب الشهر أولاً (مثال: 2026-06)', en: 'Type the month first (e.g. 2026-06)' }), 'warn', 5000);
      if (periodEl) periodEl.focus();
      return;
    }

    /* 🔴 مسيرٌ جديد ومكتوبٌ فيه بالفعل: نرفض هنا مباشرة، قبل أي نداءٍ
       للخادم — فلا داعي لضياع دورة شبكةٍ على طلبٍ سنرفضه في كل الأحوال
       (S5 + تعديل المدير ٤، بلاغ الأعطال ١٣ سبتمبر).
       🔴 A NEW run that already has data typed: refuse here, before any
       server call at all — no point spending a network round trip on a
       request we will refuse regardless (S5 + manager's amendment 4, bug
       report 13 Sept). */
    if (!recId) {
      var already = newRunAlreadyTyped(host);
      if (already) {
        UI.toast(L({
          ar: 'يوجد في النموذج بيانات غير محفوظة بالفعل (' + already + ') — احفظ المسير أولاً ثم اضغط «توليد البنود» مرة أخرى (يُضاف الناقص فقط)',
          en: 'This form already has unsaved data (' + already + ') — save the run first, then press «Generate lines» again (only the missing is added)'
        }), 'warn', 9000);
        return;
      }
    }

    /* 🔴 مسيرٌ محفوظ والشهر/المشروع على الشاشة لا يطابق المحفوظ حرفياً: نرفض
       **قبل أي جلبٍ للبنود** (شرط المدير ٣، ١٣ سبتمبر). الخانة تُملأ من
       السجل المحفوظ نفسه، فشاشةٌ لم تُلمس تطابقه حرفاً بحرف. لو كتب أحدٌ
       نفس الشهر بصيغةٍ أخرى (7-2026) فالرفض هنا آمن: «حفظ» يطبّعه ثم تعمل
       الضغطة. الفحص بعد الجلب (headerMismatch) يبقى طبقةً ثانية.
       🔴 A stored run whose on-screen month/project does not literally match
       what is stored: refuse BEFORE any line is fetched (manager condition 3,
       13 Sept). The boxes are filled from the stored record itself, so an
       untouched screen matches it character for character. If someone types
       the same month in another shape (7-2026), refusing here is safe:
       «Save» normalises it, then the press works. The after-fetch check
       (headerMismatch) stays as a second layer. */
    if (recId) {
      var stored0 = Store.find('payroll', recId);
      if (stored0) {
        var scrP = period;
        var stoP = String(stored0.period || '').trim();
        var scrJ = projectEl ? String(projectEl.value || '') : String(stored0.project || '');
        var stoJ = String(stored0.project || '');
        if ((stoP && scrP !== stoP) || scrJ !== stoJ) {
          UI.toast(unsavedOrMismatchMessage(true), 'warn', 9000);
          return;
        }
      }
    }

    /* بلا اتصال لا يعمل الزرّ — ويُقال ذلك بدل أن يبدو معطّلاً.
       Offline it cannot work, and it SAYS so rather than looking broken. */
    if (global.navigator && navigator.onLine === false) {
      UI.toast(L({
        ar: 'التوليد يحتاج اتصالاً بالإنترنت — البنود تُقرأ من الخادم',
        en: 'Generating needs a connection — the lines are read from the server'
      }), 'warn', 6000);
      return;
    }

    var btn = document.getElementById(BTN_ID);
    var old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = L({ ar: 'جاري التوليد…', en: 'Generating…' }); }

    try {
      var res = await fetchLines(period, projectEl ? projectEl.value : null, recId || null);
      var lines = res.lines || [];
      if (!lines.length) {
        UI.toast(L({
          ar: 'لا يوجد موظفون لتوليد بنود لهم في هذا الشهر',
          en: 'No employees to generate lines for in this month'
        }), 'warn', 6000);
        report(res);
        return;
      }

      if (!recId) {
        /* مسيرٌ جديد: نفتح النموذج من جديد ببنود جاهزة، ولا نحفظ شيئاً.
           نفس نمط hr-lines-import.js:227-231 المُثبَت.
           A NEW run: reopen the form with the lines preset, saving nothing.
           The same proven pattern as hr-lines-import.js:227-231. */
        var head0 = headerTotal(lines);
        var preset = {
          period: period,
          project: projectEl ? projectEl.value : null,
          employeeCount: lines.length,
          lines: lines
        };
        /* يُملأ الرأس أيضاً في المسير الجديد — النموذج يعيد حسابه عادةً، لكن
           رقماً صحيحاً موجوداً خيرٌ من الاعتماد على ذلك.
           The header is filled on a new run too — the form normally
           recomputes it, but a correct figure already there beats relying on
           that. */
        if (head0) preset.netTotal = head0.total;
        EntityPage.openForm('payroll', null, preset);
        report(res);
        return;
      }

      /* مسيرٌ مسودة موجود: نُضيف الموظفين الناقصين فقط بعد تأكيدٍ صريح، ونحفظ
         ونتحقّق مما حُفظ، ثم نعيد فتحه — ولا يُستبدَل بندٌ موجود (انظر أدناه).
         🔴 لا نلمس Store.find وقت القراءة إطلاقاً — لافّاتٌ أخرى على
         openForm قد تناديها في نفس اللحظة فتستقبل سجلاً مُستبدَلاً.
         An EXISTING draft: ADD only the missing employees after an explicit
         confirmation, save, read back what was saved, then reopen it — no
         existing line is replaced (see below).
         🔴 We never substitute Store.find at read time —
         other wrappers on openForm may call it in the same tick and would
         receive a swapped record. */
      /* 🔴 يُضاف الناقص ولا يُمسّ الموجود — لا يُستبدَل شيء.
         النسخة الأولى كانت تستبدل كل البنود، فكانت تمسح ما كتبه أ. عمارة
         بيده (إضافي، غياب، جزاءات) بلا رجعة ومعه بدلٌ من الشرح. ومع خطأ
         الخادم الذي كان يستبعد أهلَ المسير نفسه، كانت الضغطة الواحدة تحذف
         ثلاثة موظفين وتقول «تمّ».
         🔴 The missing are ADDED and what is there is left alone — nothing is
         replaced. The first version replaced every line, wiping whatever أ.
         عمارة had typed by hand (overtime, absence, penalties) with no way
         back; and with the server fault that excluded the run's own people,
         one press deleted three employees behind a green «تمّ». */
      var storedRun = Store.find('payroll', recId) || {};
      var existing = storedRun.lines || [];
      var have = {};
      existing.forEach(function (l) { if (l && l.employee) have[l.employee] = true; });
      var toAdd = lines.filter(function (l) { return !have[l.employee]; });
      var kept = existing.length;

      /* 🔴 S6: يُفحَص الشهر/المشروع **قبل** فحص «لا جديد ليُضاف» أيضاً — لا
         بعده. لو جاء «لا جديد» أولاً لَمَرَّ شهرٌ خاطئٌ صامتاً في الحالة
         الضيّقة التي يتصادف فيها كل موظفي الشهر الخطأ مع من هم على المسير
         بالفعل (نفس منطق D3: الفحص قبل أي قرارٍ آخر، لا بعده).
         🔴 S6: month/project are checked BEFORE the "nothing new to add"
         check too — not after. If "nothing new" came first, a wrong month
         could pass silently in the narrow case where the wrong month's
         employees happen to already all be on the run (same D3 logic: the
         check comes before any other decision, never after). */
      if (headerMismatch(res, storedRun)) {
        UI.toast(unsavedOrMismatchMessage(true), 'warn', 9000);
        return;
      }

      if (!toAdd.length) {
        UI.toast(L({
          ar: 'كل موظفي هذا الشهر موجودون بالفعل على المسير (' + kept + ' بنداً) — لم يتغيّر شيء',
          en: 'Every employee for this month is already on the run (' + kept + ' lines) — nothing changed'
        }), 'info', 7000);
        report(res, { added: 0, kept: kept });
        return;
      }

      /* 🔴 لا UI.confirm هنا إطلاقاً — أثبتنا بالتشغيل أنها ليست وعداً:
         `await UI.confirm('نصّ')` تفتح مباشرةً وبلا انتظار نافذةً فارغة
         **تستبدل جسم النافذة الحالي كاملاً** في #modalBody (`modal()` في
         ui.js:94-142 يكتب innerHTML فوراً)، والقيمة المُعادة صندوق DOM حقيقي
         لا وعداً — فيتابع الكود العمل وكأن «نعم» أُجيبت، وقد فُقد النموذج
         نفسه (وحتى صندوق التأكيد نفسه لا يُعاد بعده أبداً؛ closeModal لا
         يستعيد الجسم القديم). فبدلاً من ذلك: شريطُ تأكيدٍ داخل صفّ الزرّ
         نفسه، لا نافذة منفصلة، فلا يُمسّ modalBody أبداً.
         🔴 NO UI.confirm here at all — proven by running that it is not a
         promise: `await UI.confirm('a string')` opens, immediately and with
         no wait, an empty dialog that REPLACES THE WHOLE MODAL BODY inside
         #modalBody (`modal()` in ui.js:94-142 writes innerHTML at once), and
         the returned value is a real DOM box, never a promise — so the code
         proceeds as if "yes" was answered, with the form itself now gone
         (and never restored — closeModal does not bring the old body back).
         So instead: an inline confirm strip in the SAME row as the button —
         no separate dialog, and #modalBody is never touched. */
      /* 🔴 D3 · التعديلات غير المحفوظة تُفحص **قبل** السؤال لا بعده. أثبتته T14 بالتشغيل
         (١٣ سبتمبر ٠٣:٣٧): كان الفحص داخل finishMerge وحده، فيسأل الزرّ «سيُضاف N… متأكد؟»
         فوق كتابةٍ لم تُحفظ، ولا يقول «لديك تعديلات غير محفوظة» إلا بعد أن يوافق — زرٌّ ماليّ
         يطلب موافقةً على شيءٍ سيرفضه. ويبقى الفحص الثاني في finishMerge لأن الكتابة ممكنة
         بين ظهور الشريط والضغط على «تأكيد».
         🔴 D3 · unsaved edits are checked BEFORE asking, not after. Proven by T14 (13 Sept
         03:37): the check lived only inside finishMerge, so the button asked «N lines will be
         added — sure?» over unsaved typing and said «you have unsaved changes» only AFTER he
         agreed — a money button asking consent for something it will then refuse. The second
         check in finishMerge stays, because typing is possible between the strip appearing and
         «Confirm» being pressed. */
      if (!screenMatchesStored(existing)) {
        UI.toast(unsavedOrMismatchMessage(false), 'warn', 9000);
        return;
      }

      var confirmMsg = L({
        ar: 'سيُضاف ' + toAdd.length + ' بنداً جديداً إلى هذا المسير، و' + kept +
            ' بنداً موجوداً بالفعل ستبقى كما هي بلا تغيير — متأكد؟',
        en: toAdd.length + ' new lines will be ADDED to this run; the ' + kept +
            ' already on it stay exactly as they are — sure?'
      });
      if (btn) { btn.disabled = false; btn.textContent = old; }
      showConfirm(confirmMsg, function () { finishMerge(recId, existing, toAdd, kept, res); });
    } catch (e) {
      UI.toast(L({
        ar: 'تعذّر التوليد: ' + (e && e.message ? e.message : ''),
        en: 'Could not generate: ' + (e && e.message ? e.message : '')
      }), 'error', 9000);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · تركيب الزرّ بجوار «إضافة بند» — لا في مكانٍ جديد يخترعه أحد
     4 · placing the button BESIDE «إضافة بند» — never somewhere new
        الزرّ يُوضع حيث يده بالفعل. اختراع مكانٍ آخر عطلٌ مسجَّل في هذا
        المشروع، لا تحسين. The button goes where his hand already is;
        inventing a new place is a recorded failure here, not an improvement.
     ═══════════════════════════════════════════════════════════════════ */
  function inject(moduleId, recId) {
    if (moduleId !== 'payroll') return;
    if (!Auth.can('payroll', 'create')) return;   /* من لا يُنشئ لا يُولّد · no create, no generate */
    /* 🔴 الشاشة تعكس قاعدة البيانات حرفياً: الدالّة az_p11_payroll_draft_lines لا تسمح إلا لهذه
       الأدوار الأربعة (الملف A). حساب الطوارئ breakglass يملك «إنشاء» على كل شيء في auth.js،
       فكان يرى الزرّ ثم ترفضه القاعدة بجملة إنجليزية (المُدمج، المرور الثاني، ١٣ سبتمبر).
       لا نوسّع قائمة القاعدة — نُخفي الزرّ عمّن سترفضه.
       🔴 The screen mirrors the database exactly: az_p11_payroll_draft_lines allows only these four
       roles (file A). The breakglass emergency account holds «create» on everything in auth.js, so
       it saw the button and the database then refused it in English (integrator, second pass,
       13 Sept). The database list is NOT widened — the button is hidden from whoever it would refuse. */
    var who = Auth.current && Auth.current();
    if (!who || GEN_ROLES.indexOf(who.role) === -1) return;
    var add = document.getElementById('addLine');
    if (!add || document.getElementById(BTN_ID)) return;

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.id = BTN_ID;
    b.style.marginInlineStart = '8px';
    b.textContent = L({
      ar: 'توليد البنود من بيانات الموظفين والحضور',
      en: 'Generate lines from employee and attendance data'
    });
    b.title = L({
      ar: 'يملأ الأساسي والبدلات والتأمينات وقسط السلفة وأيام الحضور. الإضافي والغياب وضريبة كسب العمل تبقى بخطّ يدك.',
      en: 'Fills basic, allowances, insurance, the advance instalment and attendance days. Overtime, absence and income tax stay in your own hand.'
    });
    b.addEventListener('click', function () { run(recId || null); });
    /* بعد «إضافة بند» مباشرة — نفس الصفّ، نفس النظرة.
       Immediately after «إضافة بند» — same row, same glance. */
    add.parentNode.insertBefore(b, add.nextSibling);

    /* شريط التأكيد الداخلي — بجوار الزرّ نفسه، مخفيّ حتى تُوجَد بنودٌ لإضافتها.
       ليست نافذة UI.confirm أبداً (انظر التعليق في run()). أزرار ثابتة
       المعرِّف حتى تقرأها التجربة (p11GenConfirmOk / p11GenConfirmCancel).
       The inline confirm strip — beside the button itself, hidden until
       there is something to add. Never a UI.confirm dialog (see the comment
       in run()). Stable ids so a trial can find them (p11GenConfirmOk /
       p11GenConfirmCancel). */
    var confirmRow = document.createElement('span');
    confirmRow.id = BTN_ID + 'Confirm';
    confirmRow.hidden = true;
    confirmRow.style.marginInlineStart = '8px';
    confirmRow.innerHTML = '<span id="p11GenConfirmText" style="margin-inline-end:8px"></span>' +
      '<button type="button" class="btn btn-primary btn-sm" id="p11GenConfirmOk">' + UI.esc(L({ ar: 'تأكيد', en: 'Confirm' })) + '</button> ' +
      '<button type="button" class="btn btn-ghost btn-sm" id="p11GenConfirmCancel">' + UI.esc(L({ ar: 'إلغاء', en: 'Cancel' })) + '</button>';
    add.parentNode.insertBefore(confirmRow, b.nextSibling);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · نلفّ UI.modal، لا EntityPage.openForm
     5 · we wrap UI.modal, never EntityPage.openForm

     🔴 أزرار السجلّ («جديد» entity.js:246، تعديل الصفّ :265، نسخ :317،
     تعديل التفاصيل :408) تنادي الدالّة **المغلقة** openForm مباشرةً، لا
     EntityPage.openForm — والتصدير في entity.js:906-908 مجرّد إسنادٍ
     `openForm: openForm` لا يغيّر ما تناديه هذه الأزرار. فأي غلافٍ يوضع على
     الخاصية المُصدَّرة **لا يعمل أبداً** من الطريق الذي يفتح منه الناس هذه
     الشاشة فعلاً. النماذج كلها تُفتح عبر UI.modal (entity.js:562)، وعنصر
     النموذج يحمل data-module و(عند التعديل) data-record-id (entity.js:
     544-546)، وUI.modal يملأ الجسم والتذييل بشكل متزامن (ui.js:94-142)
     فتُقرأ هذه السمات فور عودة origModal بلا أي انتظار.
     🔴 The register's buttons («new» entity.js:246, row-edit :265, copy
     :317, detail-edit :408) call the internal CLOSURE `openForm` directly,
     never `EntityPage.openForm` — and the export at entity.js:906-908 is a
     plain assignment `openForm: openForm` that changes nothing about what
     those buttons call. So a wrapper on the exported property NEVER FIRES
     from the path people actually use to open this screen. Every form opens
     through UI.modal (entity.js:562), and the form element carries
     data-module and, when editing, data-record-id (entity.js:544-546), and
     UI.modal fills body and footer SYNCHRONOUSLY (ui.js:94-142) — so these
     attributes can be read the instant origModal returns, with no wait. */
  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    try {
      var f = document.getElementById('entForm');
      if (f && f.getAttribute('data-module') === 'payroll') {
        inject('payroll', f.getAttribute('data-record-id') || null);
      }
    } catch (e) { console.error('payroll-draft-builder.js: ' + e.message); }
    return out;
  };
  UI.__p11DraftBuilderModalWrapped = true;   /* بصمة تُقرأ في التجربة · a fingerprint the trial reads */

  global.PayrollDraftBuilder = { run: run, fetchLines: fetchLines, BTN_ID: BTN_ID };
  console.info('payroll-draft-builder.js: the «توليد البنود» button is installed on the payroll form.');
})(window);
