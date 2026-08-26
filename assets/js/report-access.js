/* =========================================================================
   report-access.js — إخفاء زر «التقارير» عمّن لا يملك أي تقرير
                      Hide the Reports menu button from roles with no reports
   -------------------------------------------------------------------------
   لماذا هذا الملف: app.js يضيف زر «التقارير» لكل الأدوار بلا فحص
   (app.js:179) — و app.js ملف للقراءة فقط. الحماية الحقيقية داخل
   pages/reports.js نفسها؛ هذا الملف تجميلي: يخفي زراً لن يعرض إلا
   رسالة «لا توجد تقارير».

   WHY THIS FILE: app.js adds the Reports button for every role
   unconditionally (app.js:179) and app.js is read-only. The real guard
   lives inside pages/reports.js; this file only hides a button that
   would show nothing but an empty message.

   نفس نمط مراقبة القائمة المستخدم في dc-requests.js — لأن app.js يعيد
   بناء القائمة عند الدخول وعند تغيير اللغة، فنراقبها ونعيد التطبيق.
   Same nav-observation pattern as dc-requests.js: app.js rebuilds the
   menu on login and on language change, so we observe and re-apply.

   إضافي بالكامل: احذف هذا الملف يعود الزر للظهور للجميع وتبقى الصفحة
   نفسها محمية من الداخل. ADDITIVE: delete this file and the button
   reappears for everyone, while the page itself stays guarded.
   ========================================================================= */
(function (global) {
  'use strict';

  function anyReports() {
    /* لو فشل الفحص هنا لا نخفي الزر — الصفحة محمية من الداخل على أي حال.
       If this check fails we leave the button visible; the page guards
       itself internally anyway. */
    try {
      return !!(global.ReportsPage && ReportsPage.allowedReports &&
                ReportsPage.allowedReports().length);
    } catch (e) { return true; }
  }

  function apply() {
    if (!global.Auth || !Auth.current || !Auth.current()) return;
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    if (anyReports()) return;               /* له تقارير — لا نلمس شيئاً */
    var btn = nav.querySelector('[data-route="reports"]');
    /* ⚠️ نحذف الزر ولا نخفيه بـ style.display.
       مربع البحث في الشريط الجانبي (app.js:210-219) يعيد ضبط display
       على كل عناصر القائمة عند كل حرف يُكتب — فكان الزر المخفي يظهر
       ثانيةً بمجرد الكتابة في البحث. الحذف لا يُنقَض بذلك، وإذا أعاد
       app.js بناء القائمة يعيد المراقب أدناه حذفه فوراً.
       ⚠️ REMOVE the button rather than hiding it with style.display.
       The sidebar search box (app.js:210-219) resets display on every
       nav item on each keystroke, which would bring a hidden button
       straight back. Removal survives that, and if app.js rebuilds the
       menu the observer below removes it again at once. */
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }

  function start() {
    var nav = document.getElementById('mainNav');
    if (nav && !nav.__azReportAccess) {
      nav.__azReportAccess = true;
      new MutationObserver(apply).observe(nav, { childList: true, subtree: true });
    }
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
