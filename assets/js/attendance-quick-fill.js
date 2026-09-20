/* =========================================================================
   attendance-quick-fill.js — «املأ بموظفي الموقع» على كشف الحضور اليومي
   attendance-quick-fill.js — "fill with this site's employees" on the daily
   attendance sheet.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN: محاسب حضور الموقع، «كشف حضور الموقع» ← «جديد».
   بدل أن يضيف بنداً ويختار موظفاً، ثم بنداً ويختار موظفاً، خمسين مرّة على
   هاتف — ضغطةٌ واحدة تضع كل موظفي الموقع «حاضر»، ثم يغيّر الاستثناءات وحدها.
   Instead of add-a-line-pick-a-person fifty times on a phone, one press puts
   every employee of the site in as «حاضر», and he changes only the exceptions.

   ما لا يفعله · WHAT IT DOES NOT DO:
     · لا يحفظ — يملأ النموذج فقط، والحفظ بيده.  It does not save.
     · لا يمسّ بنداً موجوداً: من كان في الكشف يبقى كما هو بحالته التي اختارها.
       It never touches a line already there — an employee already on the
       sheet keeps the status he was given.
     · لا يضيف موظفاً من موقعٍ غير موقع الكشف — يقرأ موقع الكشف من خانة «الموقع»
       فيه (وإن كانت فارغة فموقع المستخدم نفسه)، ويسأل الخادم عن موقع كل موظف،
       ولا يضيف إلا من يطابق. وإن تعذّر معرفة أيٍّ منهما يرفض بالعربية ولا يضيف
       أحداً — أبداً «الكل».  It adds nobody from a site other than the sheet's:
       it reads the sheet's site from its own «الموقع» box (the user's own site
       if that box is empty), asks the server for each employee's site, and adds
       only the ones that match. If either cannot be told it refuses in Arabic
       and adds nobody — never «everyone».
       🔴 لماذا (المُدمج، المرور الثاني، ١٣ سبتمبر): النسخة السابقة كانت تضيف كل
       من «يراه» المستخدم. لموظف موارد بشرية في موقع واحد ذلك صحيح، لكن مدير
       الموارد البشرية والمدير العام والأدمن يرون كل المواقع، فكان الزرّ يضع
       موظفي الشركة كلها في كشف موقعٍ واحد — وأيام الحضور تُعدّ في المسير.
       🔴 Why (integrator, second pass, 13 Sept): the previous version added
       everyone the user could SEE. For a one-site HR clerk that is right, but
       the HR manager, the GM and admin see every site, so the button put the
       whole company on one site's sheet — and attendance days count in payroll.
       قائمة الموظفين في المتصفح (portal_employees، الملف ٦٢) لا تحمل عمود
       الموقع أصلاً، فالموقع يُقرأ من جدول الموظفين نفسه بسياج قاعدة البيانات.
       The browser's staff list (portal_employees, file 62) carries no site
       column at all, so the site is read from the employees table itself,
       under the database's own fence.
     · 🔴 المرور الثالث (١٤ سبتمبر، مُبلِّغ الأخطاء + حكم MANAGER-4 الثالث) — أربعة أشياء أخرى لا يفعلها:
       Pass 3 (14 Sept, bug-reporter + MANAGER-4's third ruling) — four more things it does not do:
       P3 · لا يبقى ميّتاً: قراءة المواقع لها حدّ ٢٠ ثانية، ثم رسالة «تعذّر التأكد…»، والزرّ يُحرَّر دائماً. وعلامة «مشغول»
            تخصّ الكشف المفتوح لا الصفحة كلها — قبلها كانت قراءةٌ لا تُجيب تُميت الزرّ على كل كشفٍ بعدها بصمت حتى إعادة
            تحميل الصفحة. It never stays dead: the site read has a 20 s limit, then the «تعذّر التأكد…» message, and the
            button is always released. And «busy» belongs to the open sheet, not the whole page — before, one read that never
            answered silently killed the button on every later sheet until the page was reloaded.
       P2 · لا يضيف موظفاً مرتين: عند «تأكيد» يُعاد قراءة من في الكشف، ومن أُضيف باليد أثناء ظهور الشريط لا يُضاف ثانيةً —
            والملف ٧٨ يعدّ أيام الحضور في المسير. It never adds an employee twice: at «تأكيد» the sheet is read again, and
            anyone added by hand while the strip was up is not added a second time — file 78 counts attendance days in payroll.
       P4 · لا يضيف موظفاً محذوفاً: قائمة المتصفح لا تحمل «محذوف»، فيُسأل الخادم عنه في القراءة نفسها (قِيس أن الأدوار التي
            تولّد المسير تقرؤه: _evidence/pass3/p4-measure-deleted-readable-pglite.js). It never adds a deleted employee: the
            browser list carries no «deleted», so the server is asked in the same read (measured readable by the generating
            roles).
       P5 · لا يقول «لا يوجد موظفون» كذباً: إن أعاد الخادم صفوفاً أقلّ مما سُئل عنه (سياج قاعدة البيانات)، يقول إن بعض
            الموظفين تعذّر التحقق منهم بصلاحية الحساب، ولا يضيف أحداً — لا ملءٌ جزئي. It never says «no employees» falsely:
            if the server returns fewer rows than were asked for (the database fence), it says some employees could not be
            checked by this account, and adds nobody — never a partial fill.
       Old copy before pass 3: _evidence/old-bytes-2026-09-14-before-pass3/staged-browser/attendance-quick-fill.js (de24c094).

   إضافيّ بالكامل · WHOLLY ADDITIVE.  v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  var missing = [];
  ['Schema', 'Auth', 'Store', 'UI', 'EntityPage'].forEach(function (k) { if (!global[k]) missing.push(k); });
  if (!missing.length) {
    ['toast', 'confirm'].forEach(function (f) { if (typeof UI[f] !== 'function') missing.push('UI.' + f); });
    if (typeof Auth.scopeRows !== 'function') missing.push('Auth.scopeRows');
  }
  if (missing.length) {
    console.error('attendance-quick-fill.js NOT installed — missing: ' + missing.join(', ') +
                  '. The quick-fill button will not appear.');
    return;
  }
  /* 🔴 العلَم انتقل من EntityPage إلى UI مع اللفّ نفسه (انظر آخر الملف):
     أزرار السجلّ تنادي الدالّة المغلقة openForm في entity.js مباشرة، لا
     الخاصية المُصدَّرة، فلا يعمل غلافٌ على EntityPage.openForm من ذلك
     الطريق إطلاقاً (entity.js:246،265،317،408).
     🔴 The flag moved from EntityPage to UI along with the wrap itself (see
     the end of this file): the register's buttons call entity.js's internal
     CLOSURE openForm directly, never the exported property, so a wrapper on
     EntityPage.openForm never fires from there at all (entity.js:
     246,265,317,408). */
  if (UI.__p11AttQuickFill) return;
  UI.__p11AttQuickFill = true;

  var BTN_ID = 'p11AttQuickFill';
  var ar = function () { return !global.I18N || I18N.getLang() === 'ar'; };
  var L = function (o) { return ar() ? o.ar : o.en; };

  var SITE_CHUNK = 50;
  /* 🔴 P3 + المرور 3c (B3): حدّ الانتظار ٢٠ ثانية (حكم MANAGER-4 الثالث) على **كل طلب** من طلبات المواقع، لا على القراءة كلها.
     في المرور ٣ كان الحدّ على السلسلة كلها (طلبٌ لكل ٥٠ موظفاً)، فحساب أ. محمد عمارة (~٤٥٠ موظفاً ← ٩ طلبات) كان يُرفض كلما
     زاد متوسط الطلب عن ~٢.٢ ثانية، بينما الزرّ قبل المرور ٣ كان يملأ الكشف على الاتصال نفسه (قاسه bq1). طلبٌ واحد بلا ردّ
     خلال ٢٠ ثانية ⇒ «تعذّر التأكد…» ولا يُضاف أحد. حدٌّ صريح: اتصالٌ يأخذ فيه كل طلب أقلّ من ٢٠ ثانية بقليل يُبقي الزرّ رمادياً
     حتى ٩ × ٢٠ ثانية — ثم يُحرَّر دائماً، ولا يموت.
     🔴 P3 + pass 3c (B3): the 20 s limit (MANAGER-4's third ruling) is on EACH site request, not on the whole read. Pass 3 put
     it on the whole chain (one request per 50 employees), so أ. محمد عمارة's account (~450 employees → 9 requests) was refused
     whenever requests averaged over ~2.2 s, while the pre-pass-3 button filled the sheet on the same connection (measured by
     bq1). One request with no answer in 20 s ⇒ «تعذّر التأكد…» and nobody is added. Stated limit: a connection where every
     request takes just under 20 s keeps the button grey up to 9 × 20 s — then it is always released, never dead. */
  var SITE_READ_MS = 20000;

  /* النموذج المفتوح فعلاً داخل النافذة — لا أيّ #entForm في الصفحة: UI.closeModal
     يُخفي فقط، فقد يبقى نموذجٌ قديم في الصفحة.
     The form actually open inside the window — never any #entForm on the page:
     UI.closeModal only hides, so an old form can stay in the page. */
  function sheetForm() {
    var host = document.getElementById('modalBody');
    var mh = document.getElementById('modalHost');
    if (!host || (mh && mh.hidden)) return null;
    return host.querySelector('#entForm[data-module="siteAttendance"]');
  }

  /* موقع الكشف: خانة «الموقع» في الكشف، وإلا موقع المستخدم نفسه، وإلا لا شيء.
     The sheet's site: its own «الموقع» box, else the user's own site, else nothing. */
  function sheetSite(form) {
    var box = form ? form.querySelector('[name="site"]') : null;
    var v = box && box.value ? String(box.value) : '';
    if (v) return v;
    var u = Auth.current && Auth.current();
    return u && u.site ? String(u.site) : null;
  }

  function siteName(id) {
    try { var s = Store.find('sites', id); if (s && s.name) return s.name; } catch (e) { /* الاسم للعرض فقط · the name is for display only */ }
    return id;
  }

  /* 🔴 P3: وعدٌ لا ينتظر إلى الأبد. setTimeout/clearTimeout تُقرآن من النافذة نفسها وتُنادَيان عليها (بعض المتصفحات ترفض
     المناداة المنفصلة)، وإن غابتا تماماً يُعاد الوعد كما هو بدل أن ينكسر الزرّ.
     🔴 P3: a promise that never waits forever. setTimeout/clearTimeout are read from the window itself and called ON it (some
     browsers refuse a detached call); if they are absent altogether the promise is returned as it is rather than breaking. */
  function withTimeLimit(promise, ms) {
    var st = global.setTimeout, ct = global.clearTimeout;
    if (typeof st !== 'function') return promise;
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = st.call(global, function () {
        if (done) return;
        done = true;
        reject(new Error('the site read did not answer within ' + Math.round(ms / 1000) + ' s'));
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); resolve(v);
      }, function (err) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); reject(err);
      });
    });
  }

  /* موظفو موقعٍ بعينه: القائمة التي تراها الشاشة، مُصفّاةً بموقع كل موظف كما يقوله الخادم.
     دفعةٌ رُفضت أو لم تُجب ⇒ خطأ يوقف كل شيء، لا إضافةٌ ناقصة ولا إضافة الكل.
     A given site's employees: the list the screen sees, filtered by each employee's
     site AS THE SERVER STATES IT. A refused or unanswered chunk ⇒ an error that stops
     everything — never a partial fill, never «everyone». */
  /* القائمة التي تُظهرها الشاشة نفسها لهذا الحساب: الموظفون على رأس العمل بعد سياج الحساب.
     The list the screen itself shows this account: active employees after the account's fence. */
  function visibleActive() {
    return Auth.scopeRows('employees', Store.all('employees').filter(function (e) {
      return e.status === 'active' && e.deleted !== true;
    }));
  }

  async function siteEmployees(siteId) {
    var cands = visibleActive();
    if (!siteId || !cands.length) return [];
    var client = Auth.client && Auth.client();
    if (!client) throw new Error('no database client');
    var siteOf = {}, deletedOnServer = {}, returned = 0;
    for (var i = 0; i < cands.length; i += SITE_CHUNK) {
      var ids = cands.slice(i, i + SITE_CHUNK).map(function (e) { return e.id; });
      /* 🔴 P4: «deleted» يُسأل عنه في القراءة نفسها — قائمة المتصفح لا تحمله. · asked in the same read — the browser list lacks it */
      /* 🔴 3c: الحدّ على هذا الطلب وحده · the limit is on THIS request alone */
      var res = await withTimeLimit(client.from('employees').select('id,site,deleted').in('id', ids), SITE_READ_MS);
      if (!res || res.error) throw new Error('site read refused: ' + (res && res.error && res.error.message ? res.error.message : 'no answer'));
      (res.data || []).forEach(function (r) {
        returned++;
        siteOf[r.id] = r.site == null ? null : String(r.site);
        if (r.deleted === true) deletedOnServer[r.id] = true;
      });
    }
    /* 🔴 P5: صفوفٌ أقلّ مما سُئل عنه ⇒ سياج القاعدة أخفى بعضهم عن هذا الحساب. لا نعرف مواقعهم، فلا نضيف أحداً ولا نقول
       «لا يوجد موظفون» — نقول ما حدث فعلاً.
       🔴 P5: fewer rows than asked for ⇒ the database fence hid some from this account. Their sites are unknown, so nobody is
       added and «no employees» is never said — what actually happened is said instead. */
    if (returned < cands.length) {
      var err = new Error('the server returned ' + returned + ' of ' + cands.length + ' employees asked for');
      err.p11Partial = { returned: returned, asked: cands.length };
      throw err;
    }
    return cands.filter(function (e) { return siteOf[e.id] === siteId && !deletedOnServer[e.id]; });
  }

  function existingIds(host) {
    var out = {};
    host.querySelectorAll('tr[data-li] select[name="employee"]').forEach(function (sel) {
      if (sel.value) out[sel.value] = true;
    });
    return out;
  }

  /* 🔴 P3: «مشغول» يخصّ الكشف الذي يُنتظر له، لا الصفحة كلها. كان هنا متغيّرٌ واحد للصفحة، فقراءةٌ لم تُجب على كشفٍ واحد
     أماتت الزرّ على كل كشفٍ يُفتح بعده، بلا رسالة.
     🔴 P3: «busy» belongs to the sheet being waited for, not the whole page. There was ONE page-wide variable here, so a read
     that never answered on one sheet killed the button on every sheet opened after it, with no message. */
  var busyForm = null;

  async function fill() {
    /* 🔴 هذه الدالّة تعبر `await` واحدةً الآن: سؤال الخادم عن موقع كل موظف. وخلالها قد
       يُغلق الكشف أو يُغيَّر «الموقع»، فبعدها يُتحقَّق أن النموذج نفسه ما زال مفتوحاً وأن
       الموقع لم يتغيّر — وإلا لا يُضاف أحد. التأكيد نفسه شريطٌ داخل الصفّ لا نافذة
       UI.confirm، فلا شيء يستبدل #modalBody. doFill() لا تعبر `await` إطلاقاً.
       🔴 This function now crosses ONE `await`: asking the server for each employee's
       site. Meanwhile the sheet may be closed or «الموقع» changed, so afterwards it checks
       that the SAME form is still open and the site unchanged — otherwise nobody is added.
       The confirmation itself is a strip inside the row, never a UI.confirm dialog, so
       nothing replaces #modalBody. doFill() crosses no `await` at all. */
    var host0 = document.getElementById('modalBody');
    if (!host0) return;
    if (!document.getElementById('addLine')) return;

    var form = sheetForm();
    if (busyForm && busyForm === form) {
      UI.toast(L({
        ar: 'جاري التأكد من موقع الموظفين من الخادم — انتظر لحظة.',
        en: 'Still confirming the employees\' site with the server — one moment.'
      }), 'info', 4000);
      return;
    }
    var site = sheetSite(form);
    if (!site) {
      UI.toast(L({
        ar: 'لا يمكن معرفة موقع هذا الكشف — اختر «الموقع» في الكشف أولاً. لم يُضف أحد.',
        en: 'This sheet\'s site cannot be told — choose «الموقع» on the sheet first. Nobody was added.'
      }), 'error', 8000);
      return;
    }

    /* 🔴 المرور 3b (حكم MANAGER-4): قائمة الشاشة نفسها فارغة لهذا الحساب (مهندس الموقع مثلاً) ⇒ لا نسأل الخادم، ولا نقول
       «لا يوجد موظفون … مسجَّلون» — فذلك ادّعاءٌ عن الموقع لا نعرفه. نقول ما نعرفه: لا يظهر لحسابك موظف، ولم يُضف أحد.
       🔴 Pass 3b (MANAGER-4's ruling): the screen's own list is empty for this account (e.g. site_engineer) ⇒ the server is not
       asked, and «لا يوجد موظفون … مسجَّلون» is never said — that is a claim about the site we cannot know. What is known is
       said: no employee is visible to this account, and nobody was added. */
    if (!visibleActive().length) {
      UI.toast(L({
        ar: 'لا يظهر لحسابك أي موظف على رأس العمل في موقع «' + siteName(site) + '» — لم يُضف أحد.',
        en: 'No active employee of «' + siteName(site) + '» is visible to your account — nobody was added.'
      }), 'warn', 8000);
      return;
    }

    var btn = document.getElementById(BTN_ID);
    var list = null;
    busyForm = form;
    if (btn) btn.disabled = true;
    try {
      /* 3c: لا حدّ خارجي هنا — كل طلبٍ داخل siteEmployees له حدّه · no outer limit here — each request inside siteEmployees has its own */
      list = await siteEmployees(site);
    } catch (e) {
      console.warn('attendance-quick-fill.js: nobody added — ' + (e && e.message ? e.message : e));
      var part = e && e.p11Partial;
      UI.toast(part ? L({
        ar: 'تعذّر التأكد من موقع بعض الموظفين بصلاحية حسابك (وصلت بيانات ' + part.returned + ' من ' + part.asked + ') — لم يُضف أحد. اطلب من مدير الموارد البشرية ملء الكشف، أو أضف الموظفين يدوياً.',
        en: 'Some employees\' site could not be checked with your account (' + part.returned + ' of ' + part.asked + ' came back) — nobody was added. Ask the HR manager to fill the sheet, or add the employees by hand.'
      }) : L({
        ar: 'تعذّر التأكد من موقع الموظفين من الخادم — لم يُضف أحد. تأكد من الاتصال وحاول مرة أخرى.',
        en: 'Could not confirm the employees\' site with the server — nobody was added. Check the connection and try again.'
      }), part ? 'warn' : 'error', 9000);
      return;
    } finally {
      if (busyForm === form) busyForm = null;
      if (btn) btn.disabled = false;
    }

    var formNow = sheetForm();
    if (!formNow || formNow !== form || !document.getElementById('addLine') || sheetSite(formNow) !== site) {
      UI.toast(L({
        ar: 'تغيّر الكشف أو «الموقع» أثناء التحقق — لم يُضف أحد. اضغط الزر مرة أخرى.',
        en: 'The sheet or «الموقع» changed while checking — nobody was added. Press the button again.'
      }), 'warn', 8000);
      return;
    }

    var have = existingIds(document.getElementById('modalBody'));
    var todo = list.filter(function (e) { return !have[e.id]; });
    var name = siteName(site);
    if (!todo.length) {
      UI.toast(L({
        /* 🔴 3b: «لا يوجد موظفون … مسجَّلون» كان ادّعاءً عن الموقع كله، والشاشة لا تعرف إلا ما يظهر لهذا الحساب.
           🔴 3b: «no employees registered» was a claim about the whole site; the screen knows only what this account can see. */
        ar: list.length ? 'كل موظفي موقع «' + name + '» موجودون في الكشف بالفعل'
                        : 'لا يظهر لحسابك موظف على رأس العمل مسجَّل على موقع «' + name + '» — لم يُضف أحد',
        en: list.length ? 'Every employee of «' + name + '» is already on the sheet'
                        : 'No active employee registered at «' + name + '» is visible to your account — nobody was added'
      }), 'info', 6000);
      return;
    }
    var msg = L({
      ar: 'سيُضاف ' + todo.length + ' موظف من موقع «' + name + '» بحالة «حاضر» — تقدر تغيّر أي واحد بعدها. متأكد؟',
      en: todo.length + ' employee(s) of «' + name + '» will be added as «present» — you can change any of them afterwards. Sure?'
    });
    showConfirm(msg, function () {
      /* «الموقع» غُيِّر بين الضغطة و«تأكيد» ⇒ القائمة لموقعٍ آخر، فلا يُضاف أحد.
         «الموقع» changed between the press and «تأكيد» ⇒ the list is another site's; nobody is added. */
      if (sheetForm() !== form || sheetSite(form) !== site) {
        UI.toast(L({
          ar: 'تغيّر «الموقع» في الكشف بعد الضغط — لم يُضف أحد. اضغط الزر مرة أخرى.',
          en: '«الموقع» on the sheet changed after the press — nobody was added. Press the button again.'
        }), 'warn', 8000);
        return;
      }
      /* 🔴 P2: من أُضيف باليد والشريط ظاهر لا يُضاف ثانية — القائمة حُسبت عند الضغط، فتُعاد قراءة الكشف الآن.
         🔴 P2: anyone added by hand while the strip was up is not added again — the list was computed at the press, so the
         sheet is read again NOW. */
      var haveNow = existingIds(document.getElementById('modalBody'));
      var still = todo.filter(function (e) { return !haveNow[e.id]; });
      if (!still.length) {
        UI.toast(L({
          ar: 'كل موظفي موقع «' + name + '» موجودون في الكشف بالفعل — لم يُضف أحد',
          en: 'Every employee of «' + name + '» is already on the sheet — nobody was added'
        }), 'info', 6000);
        return;
      }
      doFill(still);
    });
  }

  /* 🔴 لا UI.confirm هنا إطلاقاً — أثبتنا بالتشغيل في payroll-draft-builder.js
     أنها ليست وعداً وتستبدل #modalBody كاملاً فور مناداتها. شريطُ تأكيدٍ
     داخل صفّ الزرّ نفسه بدلاً منها.
     🔴 NO UI.confirm here at all — proven by running, in
     payroll-draft-builder.js, that it is not a promise and replaces
     #modalBody entirely the instant it is called. An inline confirm strip in
     the button's own row instead. */
  function showConfirm(text, onOk) {
    var btn = document.getElementById(BTN_ID);
    var row = document.getElementById(BTN_ID + 'Confirm');
    if (!btn || !row) {
      UI.toast(L({ ar: 'تعذّر عرض التأكيد — أعد فتح الكشف وحاول مرة أخرى', en: 'Could not show the confirmation — reopen the sheet and try again' }), 'error', 7000);
      return;
    }
    var textEl = document.getElementById('p11QfConfirmText');
    if (textEl) textEl.textContent = text;
    btn.hidden = true;
    row.hidden = false;
    var okBtn = document.getElementById('p11QfConfirmOk');
    var cancelBtn = document.getElementById('p11QfConfirmCancel');
    function cleanup() {
      row.hidden = true;
      btn.hidden = false;
      if (okBtn) okBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
    }
    if (okBtn) okBtn.onclick = function () { cleanup(); onOk(); };
    if (cancelBtn) cancelBtn.onclick = function () { cleanup(); };
  }

  function doFill(todo) {
    /* نضغط زرّ «إضافة بند» الحقيقي لكل موظف ثم نملأ صفّه — فلا نبني صفوفاً
       بأيدينا ولا نفترض شكل الـHTML، والشاشة تبقى صاحبة رسم صفوفها.
       We press the REAL «add line» button for each employee and then fill the
       row — we never build rows ourselves and never assume the HTML shape,
       so the screen stays the owner of how its rows are drawn. */
    /* 🔴 تُطلب عقدة «إضافة بند» من جديد في كل دورة، ويُتحقَّق أن صفّاً جديداً
       ظهر فعلاً قبل ملئه. **وقائيٌّ أيضاً، لا إصلاحُ عطلٍ مقيس** — نفس
       التصحيح أعلاه ينطبق هنا.
       سببُه الحقيقي: `entity.js:762-766` يعيد رسم جدول البنود كاملاً عند كل
       إضافة، فالعقدة المُمسَكة مرّةً واحدة تصير منفصلة، وضغطُها لا يفعل شيئاً.
       لم يقع ذلك في القياس لأن الحلقة لم تصل أصلاً، لكنه سيقع يوماً.
       ويُحصى `lostButton` منفصلاً حتى لا يُخلط «الزرّ اختفى» بـ«الموظف ليس في
       القائمة» — رقمان مختلفان يقودان إلى علاجين مختلفين.
       🔴 The «add line» node is re-fetched every iteration, and a new row must
       actually have APPEARED before it is filled. **Also a precaution, not the
       repair of a measured fault** — the correction above applies here too.
       Its real reason: `entity.js:762-766` re-renders the whole lines table on
       every add, so a node held once becomes detached and clicking it does
       nothing. That did not happen in the measurement because the loop never
       ran, but it would have one day.
       `lostButton` is counted SEPARATELY so «the button vanished» is never
       confused with «that employee is not in the list» — two different numbers
       leading to two different cures. */
    /* 🔴 هذا الإعلان حُذف بيدي، وسببُ حذفه يستحقّ التسجيل أكثر من العطل نفسه:
       أعدتُ كتابة التعليق أعلاه **بقصّ كل ما بين مرساتين**، فذهب معه سطرٌ حيّ
       كان بينهما — `var host = …` وحارسُه. فصار `host` يُسند في الحلقة بلا
       إعلان، وتحت `'use strict'` (سطر ٢٤) ذلك **ReferenceError** في أوّل دورة:
       الزرّ يموت صامتاً، بلا رسالة ولا صفّ واحد. أمسكه المشرف على شاشة حقيقية.
       🔴 This declaration was deleted BY ME, and why it went is worth recording
       more than the fault itself: I rewrote the comment above by SLICING
       BETWEEN TWO ANCHORS, and a live line that sat between them went with it —
       `var host = …` and its guard. So `host` was assigned in the loop with no
       declaration, and under `'use strict'` (line 24) that is a
       **ReferenceError** on the first pass: the button dies silently, no
       message, not one row. The supervisor caught it on a real screen.
       ⛔ القاعدة: لا يُعاد كتابة تعليقٍ بالقصّ بين مرساتين — يُستبدل نصُّ
       التعليق وحده. Never rewrite a comment by slicing between two anchors;
       replace the comment text itself. */
    var host = document.getElementById('modalBody');
    if (!host) {
      UI.toast(L({ ar: 'أُغلقت الشاشة قبل الإضافة — افتحها من جديد',
                   en: 'The screen closed before anything was added — open it again' }), 'warn', 6000);
      return;
    }

    var added = 0, failed = 0, lostButton = 0;
    for (var i = 0; i < todo.length; i++) {
      host = document.getElementById('modalBody') || host;
      var before = host.querySelectorAll('tr[data-li]').length;
      var addNow = document.getElementById('addLine');
      if (!addNow) { lostButton++; failed++; continue; }
      addNow.click();
      var rows = host.querySelectorAll('tr[data-li]');
      if (rows.length <= before) { failed++; continue; }   /* لم يظهر صفّ · no new row appeared */
      var row = rows[rows.length - 1];
      var sel = row && row.querySelector('select[name="employee"]');
      var st = row && row.querySelector('[name="attStatus"]');
      if (!sel) { failed++; continue; }
      sel.value = todo[i].id;
      if (sel.value !== todo[i].id) { failed++; continue; }   /* ليس في القائمة · not in the list */
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      if (st) { st.value = 'present'; st.dispatchEvent(new Event('change', { bubbles: true })); }
      added++;
    }
    /* الزرّ يبقى مكانه دائماً الآن: التأكيد صار شريطاً داخل صفّه هو نفسه، ولا
       UI.confirm يُستدعى على هذا الطريق أبداً بعد اليوم — فلا يُستبدل جسم
       النافذة قطّ في المنتصف.
       كان هنا: `try { inject('siteAttendance'); } catch (e) {…}` — لإعادة
       تركيب الزرّ الذي كانت نافذة UI.confirm تمحوه من #modalBody وقت فتحها
       (قِيس وقتها بـ`buttonsAfter: 0`). صار غير ضروري الآن.
       The button now ALWAYS stays exactly where it is: the confirmation is
       an inline strip in its own row, and UI.confirm is never called on this
       path any more — so the modal body is never replaced midway.
       This used to be: `try { inject('siteAttendance'); } catch (e) {…}` —
       to put back the button that UI.confirm's dialog wiped out of
       #modalBody the moment it opened (measured then as `buttonsAfter: 0`).
       No longer needed. */

    UI.toast(L({
      ar: 'أُضيف ' + added + ' موظف بحالة «حاضر»' + (failed ? ' — و' + failed + ' لم يُضافوا' : '') + '. غيّر الغياب والإجازات ثم احفظ.',
      en: added + ' added as present' + (failed ? ', ' + failed + ' could not be added' : '') + '. Change the absences and leaves, then save.'
    }), failed ? 'warn' : 'success', 8000);
    /* 🔴 الفشل يُذكر بعدده لا يُبتلع: صفٌّ لم يُضف يعني موظفاً بلا حضور،
       ويعني يوماً ناقصاً في مرتّبه.
       🔴 Failures are COUNTED OUT LOUD, never swallowed: a row that was not
       added is an employee with no attendance, and a day short in his pay. */
    if (failed) {
      console.warn('attendance-quick-fill.js: ' + failed + ' employee(s) were not added' +
        (lostButton ? ' — and the «add line» button was missing for ' + lostButton + ' of them' : ''));
    }
  }

  function inject(moduleId) {
    if (moduleId !== 'siteAttendance') return;
    var add = document.getElementById('addLine');
    if (!add || document.getElementById(BTN_ID)) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.id = BTN_ID;
    b.style.marginInlineStart = '8px';
    b.textContent = L({ ar: 'املأ بموظفي الموقع', en: 'Fill with this site\'s employees' });
    b.title = L({
      ar: 'يضيف كل موظفي الموقع بحالة «حاضر» — غيّر الاستثناءات فقط',
      en: 'Adds every employee of this site as present — change only the exceptions'
    });
    b.addEventListener('click', fill);
    add.parentNode.insertBefore(b, add.nextSibling);

    /* شريط التأكيد الداخلي — بجوار الزرّ نفسه، مخفيّ حتى يكون هناك من يُضاف.
       معرّفاتٌ ثابتة حتى تقرأها التجربة (p11QfConfirmOk / p11QfConfirmCancel).
       The inline confirm strip — beside the button itself, hidden until
       there is someone to add. Stable ids so a trial can find them
       (p11QfConfirmOk / p11QfConfirmCancel). */
    var confirmRow = document.createElement('span');
    confirmRow.id = BTN_ID + 'Confirm';
    confirmRow.hidden = true;
    confirmRow.style.marginInlineStart = '8px';
    confirmRow.innerHTML = '<span id="p11QfConfirmText" style="margin-inline-end:8px"></span>' +
      '<button type="button" class="btn btn-primary btn-sm" id="p11QfConfirmOk">' + UI.esc(L({ ar: 'تأكيد', en: 'Confirm' })) + '</button> ' +
      '<button type="button" class="btn btn-ghost btn-sm" id="p11QfConfirmCancel">' + UI.esc(L({ ar: 'إلغاء', en: 'Cancel' })) + '</button>';
    add.parentNode.insertBefore(confirmRow, b.nextSibling);
  }

  /* 🔴 نلفّ UI.modal، لا EntityPage.openForm: أزرار السجلّ تنادي الدالّة
     المغلقة openForm في entity.js مباشرة (entity.js:246،265،317،408)، لا
     الخاصية المُصدَّرة — فأي غلافٍ على EntityPage.openForm لا يعمل من ذلك
     الطريق إطلاقاً. النموذج يحمل data-module (entity.js:544-546) وUI.modal
     يملأ الجسم بشكل متزامن (ui.js:94-142) فتُقرأ السمة فوراً بلا انتظار.
     🔴 We wrap UI.modal, never EntityPage.openForm: the register's buttons
     call entity.js's internal CLOSURE openForm directly (entity.js:
     246,265,317,408), never the exported property — so a wrapper on
     EntityPage.openForm never fires from that path at all. The form carries
     data-module (entity.js:544-546) and UI.modal fills the body
     SYNCHRONOUSLY (ui.js:94-142), so the attribute can be read at once, with
     no wait. */
  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    try {
      var f = document.getElementById('entForm');
      if (f && f.getAttribute('data-module') === 'siteAttendance') inject('siteAttendance');
    } catch (e) { console.error('attendance-quick-fill.js: ' + e.message); }
    return out;
  };
  UI.__p11AttQuickFillModalWrapped = true;   /* بصمة تُقرأ في التجربة · a fingerprint the trial reads */

  global.AttendanceQuickFill = { fill: fill, siteEmployees: siteEmployees };
  console.info('attendance-quick-fill.js: the «املأ بموظفي الموقع» button is installed.');
})(window);
