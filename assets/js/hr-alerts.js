/* =========================================================================
   hr-alerts.js — التنبيهات التي طلبها أ. محمد عمارة بالاسم
                  The alerts Mohamed Amara asked for by name
   -------------------------------------------------------------------------
   المصدر · SOURCE — ورقة ١٥ أغسطس ٢٠٢٦

   سؤال «تحب أن يُرسل لك النظام تنبيهاً على ماذا؟» — إجابته حرفياً:
       «انتهاء الرقم القومى / انتهاء رخص القياده / لو حدث تغيير»

   سؤال «ما أكثر خطأ يتكرر في شغلك؟» — إجابته:
       «مصوغات التوظيف»

   وأول سطر في ورقته كلها: «عمل كشف حساب لكل موظف لتسجيل السلف وخصمها».

   "What would you like the system to alert you about?" — his exact words:
   "national ID expiry / driving licence expiry / if something changes."
   "What error recurs most in your work?" — "recruitment documents."

   -------------------------------------------------------------------------
   لماذا لم تكن تصله · WHY HE WAS NOT GETTING THEM

   تواريخ الانتهاء موجودة فعلاً كحقول (hr-department.js:428-433 أضافها من
   نفس الإجابة). والفحص الذي يقرؤها موجود أيضاً — agents.js:173. لكن
   **لا شيء في الموقع كله ينادي Agents.runJob ولا runAgent ولا ask.**
   تحقّقنا بالبحث الشامل. فالفحص مكتوب، ويقرأ الحقول الصحيحة، ولا يعمل أبداً.

   The expiry dates exist as fields (hr-department.js:428-433, added from this
   same answer). The check that reads them exists too — agents.js:173. But
   NOTHING in the whole portal ever calls Agents.runJob, runAgent or ask —
   verified by a full search. The check is written, reads the right fields,
   and never runs.

   ونظام التنبيهات الحيّ الذي يراه الناس فعلاً — alerts.js — لا يعرف عن
   الرقم القومي ولا رخصة القيادة ولا مصوغات التوظيف شيئاً.
   And the live alert system people actually see — alerts.js — knows nothing
   about national IDs, driving licences or recruitment documents.

   -------------------------------------------------------------------------
   ما لم يُضَف عمداً · WHAT WAS DELIBERATELY NOT ADDED

   **تنبيه انتهاء عقد الموظف موجود بالفعل** — alerts.js:252-268، ويقرأ عقود
   employmentContracts عبر HRSignals. لم يُكرَّر هنا. إضافة نسخة ثانية منه
   هي بالضبط حادثة trade/trades التي كلّفت ست ساعات.

   The employee contract-expiry alert ALREADY EXISTS — alerts.js:252-268,
   reading employmentContracts through HRSignals. It is not duplicated here.
   Adding a second copy is exactly the trade/trades incident that cost six
   hours.

   -------------------------------------------------------------------------
   ⚠️ الترتيب مهم ولا يجوز تغييره · LOAD ORDER MATTERS AND MUST NOT CHANGE

   هذا الملف يلفّ Alerts.list وحدها. وشاشة التنبيهات وشارة القائمة
   وبطاقتَي اللوحة لا تنادي Alerts.list المُصدَّرة، بل دالة list الداخلية
   المغلقة داخل alerts.js — وهذا هو الفخ الذي وثّقه dc-alerts.js.

   الحل: dc-alerts.js يُعيد بناء الخمس دوالّ كلها من قائمته المدمجة، وهو
   يُحمَّل **بعد** هذا الملف، فيلتقط تنبيهاتنا تلقائياً ويعرضها في كل مكان.
   لذلك يجب أن يبقى ترتيب loader.js:

       alerts.js  →  hr-alerts.js  →  dc-alerts.js

   لو قُدِّم dc-alerts.js على هذا الملف، لاختفت تنبيهات الموارد البشرية من
   الشاشة تماماً بلا رسالة خطأ. الفحص الذاتي في نهاية الملف يمسك ذلك.

   This file wraps Alerts.list only. The alerts screen, the sidebar badge and
   both dashboard cards do not call the exported Alerts.list — they call the
   closure-internal list() inside alerts.js. That is the trap dc-alerts.js
   documented. The fix: dc-alerts.js rebuilds all five exported functions
   from its merged list, and it loads AFTER this file, so it picks our alerts
   up automatically. loader.js order must stay:
       alerts.js → hr-alerts.js → dc-alerts.js
   If dc-alerts.js came first, HR alerts would vanish from the screen with no
   error at all. The self-check at the end of this file catches that.

   -------------------------------------------------------------------------
   🔒 كل قاعدة محميّة بـ Auth.canSee — أمين المخزن لا يرى شيئاً من هذا.
      Every rule is gated by Auth.canSee — a storekeeper sees none of it.
      DECISIONS.md: بيانات الموظفين ملك للموارد البشرية.

   إضافي بالكامل · ADDITIVE. احذف الملف فتعود التنبيهات لما هي عليه اليوم.
   Delete the file and the alert list returns to exactly what it is today.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Alerts || !global.Store || !global.Schema || !global.Auth) {
    console.error('hr-alerts.js needs alerts.js, store.js, schema.js and auth.js first');
    return;
  }
  if (Alerts.__azHrMerged) return;
  Alerts.__azHrMerged = true;

  function L(o) { return (global.I18N && I18N.L) ? I18N.L(o) : (o && (o.ar || o.en)) || ''; }
  function money(v) { return global.I18N ? I18N.money(v) : String(v); }

  var LEVEL = { danger: 3, warn: 2, info: 1 };

  var DAYS = {
    idExpiry:       45,   /* الرقم القومي — تجديده يستغرق أسابيع في مصر   */
    licenceExpiry:  45,   /* رخصة القيادة — نفس المدة، وسائق برخصة منتهية
                             مسؤولية على الشركة لا على الموظف وحده        */
    advanceStuck:   45    /* سلفة معتمدة لم يُخصم منها قسط واحد منذ صرفها */
  };

  function daysUntil(d) { return Math.round((new Date(d) - new Date()) / 86400000); }
  function daysSince(d) { return Math.round((new Date() - new Date(d)) / 86400000); }

  function mk(list, level, moduleId, icon, ar, en, recId) {
    list.push({ level: level, module: moduleId, icon: icon || 'user',
      text: L({ ar: ar, en: en }), recordId: recId || null });
  }

  /* ═════ القاعدة ١ و٢ · انتهاء الرقم القومي ورخصة القيادة ═════════════
     الحقلان nationalIdExpiry وdrivingLicenceExpiry موجودان فعلاً على شاشة
     الموظفين — hr-department.js:428 و:432 — قُرئا بالاسم لا تخميناً.
     Both fields really exist on the employees screen — hr-department.js:428
     and :432 — read by name, not guessed. */
  var EXPIRY = [
    { field: 'nationalIdExpiry', days: DAYS.idExpiry,
      ar: 'الرقم القومي', en: 'National ID' },
    { field: 'drivingLicenceExpiry', days: DAYS.licenceExpiry,
      ar: 'رخصة القيادة', en: 'Driving licence' }
  ];

  function expiringPapers(out) {
    if (!Auth.canSee('employees')) return;
    Store.all('employees').forEach(function (e) {
      if (e.status !== 'active') return;
      EXPIRY.forEach(function (cfg) {
        var v = e[cfg.field];
        if (!v) return;
        var d = daysUntil(v);
        if (d > cfg.days) return;
        mk(out, d < 0 ? 'danger' : 'warn', 'employees', 'user',
          cfg.ar + ' — «' + (e.name || '') + '» ' +
            (d < 0 ? 'منتهٍ منذ ' + Math.abs(d) + ' يوم' : 'ينتهي خلال ' + d + ' يوم'),
          cfg.en + ' — "' + (e.name || '') + '" ' +
            (d < 0 ? 'expired ' + Math.abs(d) + ' day(s) ago' : 'expires in ' + d + ' day(s)'),
          e.id);
      });
    });
  }

  /* ═════ القاعدة ٣ · مصوغات توظيف ناقصة — «أكثر خطأ يتكرر» ════════════
     نحسب الناقص من الحقول نفسها، لا من العمود المحفوظ missingCount:
     ذلك العمود كان صفراً للجميع قبل calc-formulas.js، فالصفوف القديمة
     تحمل صفراً كاذباً محفوظاً في قاعدة البيانات.

     We count from the fields themselves, not from the stored missingCount
     column: that column was zero for everyone before calc-formulas.js, so
     old rows carry a false zero saved in the database. */
  var DOC_KEYS = ['nationalIdDoc', 'birthCert', 'qualification', 'militaryStatus',
                  'criminalRecord', 'insuranceForm1', 'insurancePrint', 'medicalFitness',
                  'photos', 'contractSigned', 'bankForm', 'drivingLicenceDoc',
                  'safetyInduction'];

  function incompleteHiringFile(out) {
    if (!Auth.canSee('employeeDocs')) return;
    Store.all('employeeDocs').forEach(function (r) {
      var missing = 0;
      DOC_KEYS.forEach(function (k) { if (r[k] === 'missing' || r[k] === 'expired') missing++; });
      if (!missing) return;
      var who = (Store.find('employees', r.employee) || {}).name || '';
      mk(out, missing >= 4 ? 'danger' : 'warn', 'employeeDocs', 'folder',
        'مصوغات توظيف ناقصة — «' + who + '»: ' + missing + ' مستند',
        'Recruitment file incomplete — "' + who + '": ' + missing + ' document(s) missing',
        r.id);
    });
  }

  /* ═════ القاعدة ٤ · سلفة معتمدة لا يُخصم منها شيء ═══════════════════
     قلبُ شكواه: «السلف لا تُسترد». السلفة معتمدة ومصروفة، ومرّ عليها ما
     يكفي لمسير رواتب أو اثنين، ولم يُخصم منها قسط واحد.

     The heart of his complaint: advances are never recovered. The advance is
     approved and paid out, enough time has passed for a payroll run or two,
     and not one instalment has been deducted. */
  function advancesNotRecovered(out) {
    if (!Auth.canSee('employeeAdvances')) return;
    if (!global.AdvanceBalance) return;      /* بلا advance-balance.js لا رقم موثوق */

    Store.all('employeeAdvances').forEach(function (a) {
      if (a.status !== 'approved' && a.status !== 'posted') return;
      /* سلفة مُلغاة لا تُزعج — cancelRecord يضع deleted:true بلا لمس
         status، فتبقى «معتمدة» ظاهرياً وتنغّص على الموارد البشرية إلى
         الأبد رغم إلغائها فعلياً (عطل V13).
         A cancelled advance never nags — cancelRecord sets deleted:true
         without touching status, so it still reads "approved" and would
         otherwise pester HR forever despite being genuinely cancelled
         (V13's bug). */
      if (a.deleted === true) return;
      if (a.settled) return;
      var amount = Number(a.amount) || 0;
      if (amount <= 0) return;
      var age = daysSince(a.date);
      if (!isFinite(age) || age < DAYS.advanceStuck) return;
      if (AdvanceBalance.repaidOf(a) > 0) return;   /* بدأ السداد فعلاً — لا تنبيه */

      var who = (Store.find('employees', a.employee) || {}).name || '';
      mk(out, 'warn', 'employeeAdvances', 'banknote',
        'سلفة «' + who + '» ' + money(amount) + ' مضى عليها ' + age +
          ' يوماً ولم يُخصم منها قسط واحد على أي مسير معتمد',
        'Advance for "' + who + '" ' + money(amount) + ' is ' + age +
          ' days old and not one instalment has been deducted on any approved payroll',
        a.id);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  function buildHR() {
    var out = [];
    if (!Auth.current || !Auth.current()) return out;
    expiringPapers(out);
    incompleteHiringFile(out);
    advancesNotRecovered(out);
    return out;
  }

  var origList = Alerts.list;
  Alerts.list = function () {
    var base = origList.apply(Alerts, arguments) || [];
    var extra = buildHR();
    if (!extra.length) return base;
    var merged = base.concat(extra);
    merged.sort(function (a, b) { return LEVEL[b.level] - LEVEL[a.level]; });
    return merged;
  };

  global.HRAlerts = { build: buildHR, DAYS: DAYS };

  /* ═══════════════════════════════════════════════════════════════════
     فحص ذاتي للترتيب — يمسك بالضبط الانحدار الموصوف في الرأس
     LOAD-ORDER SELF-CHECK — catches exactly the regression described above

     إن لم يُعِد dc-alerts.js بناء count من القائمة المدمجة، فسيختلف
     Alerts.count() عن Alerts.list().length. صامت على الشاشة، صاخب هنا.
     If dc-alerts.js has not rebuilt count from the merged list, Alerts.count()
     will disagree with Alerts.list().length. Silent on screen, loud here.
     ═══════════════════════════════════════════════════════════════════ */
  setTimeout(function () {
    try {
      if (!Auth.current || !Auth.current()) return;   /* قبل تسجيل الدخول لا معنى للفحص */
      var listed = Alerts.list().length;
      var counted = Alerts.count();
      if (listed !== counted) {
        console.error('[hr-alerts] LOAD ORDER PROBLEM — Alerts.list() reports ' + listed +
          ' but Alerts.count() reports ' + counted + '. HR alerts are being computed but ' +
          'not shown. loader.js must load alerts.js → hr-alerts.js → dc-alerts.js in that order.');
      }
    } catch (e) {}
  }, 6000);

  console.info('hr-alerts.js ready — national ID expiry, driving licence expiry, ' +
               'incomplete recruitment files and unrecovered advances now reach the ' +
               'alerts screen. Contract expiry was already covered by alerts.js:252 ' +
               'and is deliberately not duplicated.');
})(window);
