/* =========================================================================
   session-expiry-watch.js — جلسة ماتت تحت الواجهة لا تُترَك بلا تفسير
                             A SESSION THAT DIES UNDER THE UI IS NEVER LEFT
                             UNEXPLAINED
   -------------------------------------------------------------------------
   الغياب المُثبَت · THE PROVEN ABSENCE (trial session-routing E.1)

   بعد دخول كامل، صفر مشتركين في client.auth.onAuthStateChange في كل
   الموقع. حين تموت الجلسة تحت واجهة لا تزال مفتوحة (فشل تجديد رمز الدخول
   بعد انقطاع طويل أو خمول)، كل عملية حفظ تبدأ بالفشل بلا أي تفسير ولا طريق
   عودة لشاشة الدخول — الموظف يظل يضغط «حفظ» ويرى أخطاءً غامضة، معتقداً أن
   المشكلة في الشبكة أو في الشاشة، لا أن جلسته انتهت أصلاً.

   After a full login, zero subscribers to client.auth.onAuthStateChange
   anywhere in the portal. When a session dies under a UI that stays open
   (a refresh-token failure after a long offline stretch or idle period),
   every save starts failing with no explanation and no route back to the
   login screen — the employee keeps pressing "save" and seeing vague
   errors, believing the network or the screen is at fault, never that
   their session has simply ended.

   -------------------------------------------------------------------------
   التمييز بين الخروج اليدوي وموت الجلسة، بلا أي علم إضافي · TELLING A
   MANUAL LOGOUT FROM A DEAD SESSION, WITH NO EXTRA FLAG

   auth.js's logout() (auth.js:867-873) يضبط `current = null` أولاً، ثم
   يستدعي `client.auth.signOut()` بعدها — وsignOut هي ما يُطلق حدث
   SIGNED_OUT من supabase-js. فحين يصل الحدث بسبب خروج يدوي، Auth.current()
   يكون null بالفعل. أما حين تموت الجلسة تحت الواجهة (لا أحد نادى logout())
   يصل SIGNED_OUT وAuth.current() ما زال يحمل المستخدم — هذا وحده يكفي
   للتمييز، دون أي علم يضيفه هذا الملف أو غيره.

   auth.js's logout() (auth.js:867-873) sets `current = null` FIRST, then
   calls `client.auth.signOut()` afterwards — and signOut is what makes
   supabase-js fire the SIGNED_OUT event. So when the event arrives because
   of a manual logout, Auth.current() is already null. When a session dies
   under the UI instead (nobody called logout()), SIGNED_OUT arrives while
   Auth.current() still holds the user — that alone is enough to tell them
   apart, with no flag added by this file or anyone else.

   -------------------------------------------------------------------------
   لماذا ملف إضافي، لا تعديل app.js · WHY ADDITIVE, NOT AN app.js EDIT

   app.js من الملفات التي لا تُعدَّل إلا للضرورة. الحل هنا لا يلفّ شيئاً في
   app.js أصلاً — يستمع مباشرة لحدث Supabase الحقيقي عبر عميل Auth نفسه،
   ويعيد استعمال نفس السطرين اللذين يستعملهما زر «تسجيل الخروج» بالضبط
   (app.js:370-371) لإخفاء الواجهة وإظهار شاشة الدخول.

   app.js is on the do-not-edit-unless-necessary list. The fix here does
   not wrap anything in app.js at all — it listens directly to Supabase's
   own real event through Auth's own client, and reuses the exact same two
   lines the "sign out" button itself uses (app.js:370-371) to hide the
   shell and show the login screen.

   -------------------------------------------------------------------------
   الحد الصادق · THE HONEST LIMIT

   لا يمكن من هذا الجهاز افتعال انتهاء صلاحية رمز حقيقي — التجربة تُطلق نفس
   الحدث الصناعي الذي تُطلقه supabase-js نفسها. التأكيد الحقيقي: سطر واحد
   في console المتصفح على الموقع الحيّ بعد الرفع (عدد المشتركين)، مذكور في
   إيصال هذه الدفعة.

   A real token expiry cannot be produced from this Mac — the trial fires
   the same synthetic event supabase-js itself fires. Real-world
   confirmation is one line in the live browser console after upload
   (subscriber count), included in this batch's receipt.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the portal reverts exactly:
   a session that dies under the UI goes back to failing silently, with no
   route back to the login screen.

   ترتيب التحميل · LOAD POSITION: مباشرة بعد login-refusal-text.js — كلاهما
   يحتاج Auth موجوداً فقط، ولا تصادم بينهما (كل واحد يلمس شيئاً مختلفاً:
   نص الدخول أحدهما، حدث الجلسة الآخر).
   Immediately after login-refusal-text.js — both only need Auth to exist,
   and there is no collision between them (each touches something
   different: login text vs. the session event).
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

  var installed = false;

  function tryInstall() {
    if (installed || !global.Auth || typeof Auth.client !== 'function') return;
    var client = Auth.client();
    if (!client || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;
    installed = true;

    client.auth.onAuthStateChange(function (event) {
      if (event !== 'SIGNED_OUT') return;   /* نتجاهل TOKEN_REFRESHED وغيرها · ignore TOKEN_REFRESHED etc. */
      if (!Auth.current()) return;          /* خروج يدوي — current صُفِّر قبل signOut أصلاً · a manual logout — current was already cleared before signOut */

      /* الجلسة ماتت تحت واجهة ما زالت مفتوحة · the session died under a UI that is still open */
      if (global.UI && UI.toast) {
        UI.toast(isAr()
          ? 'انتهت جلستك لعدم الاستخدام — سجّل الدخول من جديد. بياناتك غير المرفوعة محفوظة على هذا الجهاز.'
          : 'Your session ended from inactivity — sign in again. Your unsent data is still saved on this device.',
          'warn', 9000);
      }
      Auth.logout().then(function () {
        var shell = document.getElementById('appShell');
        var login = document.getElementById('loginScreen');
        if (shell) shell.hidden = true;
        if (login) login.hidden = false;
      }).catch(function (e) { console.warn('[session-expiry-watch] logout after expiry failed', e); });
    });

    console.info('session-expiry-watch.js: installed.');
  }

  /* حزام محاولات — العميل يُنشأ مبكراً جداً في boot() (auth.js:783، قبل أي
     دخول) لكن هذا الملف يُحمَّل قبل تشغيل app.js's boot() فعلياً؛ فنعاود
     المحاولة حتى ينشأ. Retry ladder — the client is created very early in
     boot() (auth.js:783, before any login) but this file loads before
     app.js's boot() has actually run yet; keep retrying until it exists. */
  [0, 300, 1000, 3000, 8000, 15000, 30000].forEach(function (ms) { setTimeout(tryInstall, ms); });
  document.addEventListener('DOMContentLoaded', tryInstall);

  /* اسم عام صغير — يسمح لفاحص خارجي بالتأكد من أن المستمع تركّب فعلاً
     دون قراءة الحالة الداخلية المغلقة (installed).
     A small global — lets an outside test confirm the listener actually
     installed without reading the closed-over internal state (installed). */
  global.SessionExpiryWatch = { installed: function () { return installed; } };
})(window);
