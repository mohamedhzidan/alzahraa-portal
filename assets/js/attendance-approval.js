/* =========================================================================
   attendance-approval.js — إعادة زرّي «إرسال» و«اعتماد» لكشف حضور الموقع
   attendance-approval.js — restores Send/Review/Approve on the site
   attendance sheet.
   -------------------------------------------------------------------------
   🔴🔴 هذا الملف مكتوبٌ ومُجرَّب و**غير مُركَّب عمداً**. لا يُضاف إلى
        `loader.js` ولا إلى `service-worker.js` حتى يتحقّق الشرطان معاً:
        ١ · أن يقول أ. محمد عمارة هل يوقّع مدير الموقع **كشف كل يوم** أم
            **كشفاً واحداً للشهر**. أجاب «الحضور الشهري» ونحن سألنا عن
            اليومي — قراءتان مختلفتان تُبنيان بشكلين مختلفين، فلا نختار.
        ٢ · أن يحمل حساب مدير الموقع **موقعاً** على القاعدة الحيّة. الكشوف
            مسيَّجة بالموقع، وحسابٌ بلا موقع = كشوفٌ لا يستطيع أحد توقيعها،
            ورواتب تُحسب على صفر حضور بصمت.
   🔴🔴 THIS FILE IS WRITTEN, TRIALLED AND DELIBERATELY NOT WIRED. It is not
        added to loader.js or service-worker.js until BOTH hold:
        1 · أ. محمد عمارة says whether the site manager signs EACH DAY'S
            sheet or ONE sheet for the month. He answered «الحضور الشهري»
            and we asked about the daily one — two readings, built two
            different ways, so we do not choose between them.
        2 · the site manager's account carries a SITE on the live database.
            Sheets are site-fenced, and an account with no site means sheets
            nobody can sign and payroll counting zero attendance in silence.

   التركيب حين يحين وقته سطران · WIRING IT LATER IS TWO LINES:
     loader.js  — 'assets/js/attendance-approval.js' after workflow-policy.js
     service-worker.js — the same path in the cached list, and bump the cache
   ونزعه سطران كذلك، فيعود الكشف تسجيلاً مباشراً كما هو اليوم.
   Removing it is the same two lines; the sheet goes back to a plain record.

   مَن يوقّع · WHO SIGNS: `project_manager` — «مدير الموقع»، وقد أكّده محمد
   زيدان بنفسه ١٢ سبتمبر. لا يمنح هذا الملف أحداً حقاً جديداً: القاعدة
   (`07-HR-APPROVALS.sql:74-77`) و`auth.js:368` يمنحانه المراجعة والاعتماد
   بالفعل — الشاشة وحدها هي التي تخفيهما (`workflow-policy.js:79`).
   `project_manager` — «مدير الموقع», confirmed by Mohamed Zidan himself on
   12 Sept. This file grants NOBODY a new right: the database
   (07-HR-APPROVALS.sql:74-77) and auth.js:368 already give him review and
   approve. Only the SCREEN hides them (workflow-policy.js:79).
   يُشحن مطفأً في v2.0.37: الملف موجود ولا يُحمَّل · Ships OFF in v2.0.37: present, never loaded.
   ========================================================================= */
(function (global) {
  'use strict';

  var missing = [];
  ['Schema', 'UI', 'Store'].forEach(function (k) { if (!global[k]) missing.push(k); });
  if (missing.length) {
    console.error('attendance-approval.js NOT installed — missing: ' + missing.join(', '));
    return;
  }
  if (Schema.__p11AttendanceApproval) return;
  Schema.__p11AttendanceApproval = true;

  var ar = function () { return !global.I18N || I18N.getLang() === 'ar'; };
  var L = function (o) { return ar() ? o.ar : o.en; };

  /* ═══ ١ · رفع الكشف من «تسجيل» إلى «اعتماد بخطوة واحدة» ══════════════
     نضبط الوحدة نفسها بعد أن ينتهي workflow-policy.js من عمله، فلا نعدّل
     ذلك الملف إطلاقاً — حذف هذا الملف يعيد كل شيء كما كان.
     We set the module itself AFTER workflow-policy.js has finished, so that
     file is never edited. Deleting this one restores everything. */
  var mod = Schema.get('siteAttendance');
  if (!mod) {
    console.error('attendance-approval.js: the siteAttendance screen was not found — nothing changed');
    return;
  }
  mod.workflow = true;
  mod.skipReview = true;     /* خطوة واحدة: يُرسَل ثم يعتمده مدير الموقع */

  /* ═══ ٢ · عدّاد الكشوف غير المعتمدة — حتى لا يكون التأخير صامتاً ══════
     🔴 لو تراكمت كشوفٌ بلا توقيع، حسب المسير حضوراً أقلّ — وذلك أخطر من
        التأخير نفسه لأنه لا يُرى. فالعدد يظهر على شاشة المسير.
     🔴 If unsigned sheets pile up, payroll counts less attendance — worse
        than the delay itself because it is invisible. So the count is shown
        on the payroll run's own screen. */
  function unapprovedCount(period) {
    if (!period) return 0;
    return Store.all('siteAttendance').filter(function (s) {
      return s.deleted !== true && s.status !== 'approved' &&
             String(s.date || '').slice(0, 7) === period;
    }).length;
  }

  var PAYROLL_LABEL = (function () {
    var m = Schema.get('payroll');
    return m && m.label ? (ar() ? m.label.ar : m.label.en) : null;
  })();

  if (typeof UI.modal === 'function') {
    var origModal = UI.modal;
    UI.modal = function (opts) {
      var out = origModal.apply(UI, arguments);
      try {
        var title = opts && opts.title ? String(opts.title) : '';
        if (!PAYROLL_LABEL || title.indexOf(PAYROLL_LABEL) !== 0 || title.indexOf(' — ') === -1) return out;
        var run = Store.all('payroll').filter(function (r) { return r.docNo === title.split(' — ').pop().trim(); })[0];
        if (!run) return out;
        var n = unapprovedCount(run.period);
        if (!n) return out;
        var host = document.getElementById('modalBody');
        if (!host) return out;
        var d = document.createElement('div');
        d.style.cssText = 'margin:8px 0;padding:8px 10px;border-radius:6px;background:#fff8e5;border:1px solid #e3d5a3;font-size:13px';
        d.textContent = L({
          ar: n + ' كشوف حضور غير معتمدة هذا الشهر — الأيام التي فيها لم تُحسب في هذا المسير',
          en: n + ' attendance sheet(s) are unapproved this month — their days were not counted in this run'
        });
        host.insertBefore(d, host.firstChild);
      } catch (e) { console.error('attendance-approval.js: ' + e.message); }
      return out;
    };
  }

  global.AttendanceApproval = { unapprovedCount: unapprovedCount };
  console.info('attendance-approval.js: site attendance sheets now carry Send/Approve (one step, project_manager).');
})(window);
