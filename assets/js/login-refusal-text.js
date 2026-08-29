/* =========================================================================
   login-refusal-text.js — رفض القاعدة يظهر بصدق في شاشة الدخول، لا ككلمة
                          مرور خاطئة
                          A DATABASE REFUSAL SHOWS HONESTLY ON THE LOGIN
                          SCREEN, NOT AS A WRONG PASSWORD
   -------------------------------------------------------------------------
   العطل الذي وقع من قبل (HISTORY bug #1) وقد يتكرر · THE BUG THAT ALREADY
   HAPPENED ONCE (HISTORY bug #1) AND CAN HAPPEN AGAIN

   auth.js يعرف الحقيقة فعلاً: حين تُقرأ بيانات الحساب من الخادم وتُرفض
   القراءة (سياسة صلاحيات، حساب بلا صف مطابق...) يُعيد login() الشكل
   الصادق {ok:false, error:'db-permission', detail, code} (auth.js:849).
   لكن app.js's showLoginError (app.js:72-85) لا تفهم 'db-permission' على
   الإطلاق — تسقط في الحالة الافتراضية وتعرض t('login.bad')، أي «اسم
   المستخدم أو كلمة المرور غير صحيحة». فالموظف يكتب كلمة مرور صحيحة تماماً،
   والحساب مرفوض من القاعدة لسبب لا علاقة له بكلمة المرور — ويظهر له نفس
   رسالة الخطأ المطبعي. هذا حدث فعلاً (صلاحيات صفرية) وبدا وقتها كخطأ
   إملائي في كلمة المرور حتى اكتُشف السبب الحقيقي بعد وقت طويل.

   auth.js already knows the truth: when the account's own row is read from
   the server and the read is refused (a permission policy, an account with
   no matching row…), login() returns the honest shape
   {ok:false, error:'db-permission', detail, code} (auth.js:849). But
   app.js's showLoginError (app.js:72-85) has no branch for 'db-permission'
   at all — it falls through to the default case and shows t('login.bad'),
   "wrong username or password." So an employee typing a perfectly correct
   password, refused by the database for a reason that has nothing to do
   with the password, sees the exact same typo message. This already
   happened once (zero grants) and looked like a typo'd password until the
   real cause was found much later.

   -------------------------------------------------------------------------
   لماذا ملف إضافي، لا تعديل app.js · WHY AN ADDITIVE FILE, NOT AN app.js EDIT

   app.js من الملفات التي لا تُعدَّل إلا للضرورة، وshowLoginError دالة
   خاصة داخل إغلاق مغلق (closure) — لا يوجد شيء مُصدَّر لتلفّه. الحل: نلفّ
   Auth.login نفسها (مُصدَّرة، auth.js:1034 وما حولها)، ونعدّل النص المكتوب
   فعلاً في #loginError بعد أن يكتب app.js نصّه الخاطئ، لا بدلاً منه.

   app.js is on the do-not-edit-unless-necessary list, and showLoginError is
   a private function inside a closed closure — nothing exported to wrap.
   The fix: wrap the exported Auth.login itself, and correct the text
   actually written into #loginError AFTER app.js writes its wrong one,
   not instead of it.

   -------------------------------------------------------------------------
   لماذا setTimeout(0) آمن هنا بالضبط · WHY setTimeout(0) IS SAFE HERE,
   EXACTLY

   app.js:97-100 يكتب: `res = await Auth.login(...)`، ثم فوراً في نفس
   سلسلة المهام الصغرى (microtask) — بلا أي await آخر بينهما —
   `showLoginError(res.error)`. لو صحّحنا النص من داخل .then() عادية على
   الوعد الذي تعيده Auth.login نفسها، فقد تُنفَّذ مهمتنا الصغرى قبل مهمة
   app.js الصغرى (الترتيب يعتمد على مَن اشترك في الوعد أولاً) فيُكتب نصّنا
   الصادق ثم يُكتب نص app.js الخاطئ فوقه — عكس المطلوب تماماً. جدولة
   الإصلاح بـ setTimeout(0) تضعه في مهمة كبرى (macrotask)، تُنفَّذ دائماً
   بعد استنفاد كل المهام الصغرى المعلَّقة — أي بعد أن ينتهي app.js من كتابة
   نصّه الخاطئ لا محالة. نصحّح فوقه، لا قبله.

   app.js:97-100 does `res = await Auth.login(...)`, then immediately, in
   the same microtask chain — with no other await in between —
   `showLoginError(res.error)`. If we corrected the text from a plain
   .then() on the promise Auth.login itself returns, our microtask could
   run BEFORE app.js's own microtask (order depends on who subscribed to
   the promise first) — writing our honest text, then having app.js's
   wrong text overwrite it right after — the exact opposite of what we
   want. Scheduling the fix with setTimeout(0) puts it in a macrotask,
   which always runs after every pending microtask has drained — i.e.
   after app.js has certainly already written its wrong text. We correct
   it afterwards, never before.

   -------------------------------------------------------------------------
   ما لا يتغيّر · WHAT STAYS UNTOUCHED

   'disabled'، 'profile'، 'bad'، 'first-online'، 'load' — كل هذه تمرّ دون
   لمس؛ لا نتدخّل إلا حين error === 'db-permission' بالحرف. لو تغيّرت أسماء
   الأخطاء في app.js يوماً، هذا الملف لا يفعل شيئاً — فشل آمن، لا كسر صامت.

   'disabled', 'profile', 'bad', 'first-online', 'load' — all pass through
   untouched; we act only when error === 'db-permission' exactly. If
   app.js's error ids ever change, this file simply does nothing —
   fail-safe, never a silent break.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the generic wrong-password
   text returns exactly as it is today — nothing else changes.

   ترتيب التحميل · LOAD POSITION: بعد auth.js — يلفّ Auth.login، ويجب أن
   يكون ملفوفاً قبل أن يستطيع أي إنسان الضغط على زر الدخول (loader.js
   يحمّله قبل app.js، الذي يُوصِّل زر النموذج).
   After auth.js — it wraps Auth.login, and must be wrapped before any
   human can press the login button (loader.js loads it before app.js,
   which wires the form's submit handler).
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

  function install() {
    if (!global.Auth || typeof Auth.login !== 'function' || Auth.__loginRefusalTextWrapped) return;
    Auth.__loginRefusalTextWrapped = true;

    var origLogin = Auth.login;
    Auth.login = function () {
      var p = origLogin.apply(Auth, arguments);
      /* لا نُعيد وعداً آخر — نُعيد p نفسه دون تعديل، ونشترك فيه بجانب
         app.js لنصحّح النص بعده فقط. نلتقط الاشتراك بالخطأ (شبكة معطوبة
         مثلاً) بصمت — عطل هنا لا يجوز أن يُسقط تدفّق الدخول نفسه.
         We do not return a different promise — we return p itself
         unchanged, and subscribe to it alongside app.js only to correct
         the text afterwards. Catch a failure in OUR OWN subscription (a
         broken network, say) silently — a fault here must never take
         down the login flow itself. */
      p.then(function (res) {
        if (!res || res.ok !== false || res.error !== 'db-permission') return;
        setTimeout(function () {
          try {
            var err = document.getElementById('loginError');
            if (!err) return;
            var code = res.code ? ' [' + res.code + ']' : '';
            err.textContent = isAr()
              ? 'قاعدة البيانات رفضت قراءة ملفك — المشكلة ليست في كلمة المرور. أبلغ مسؤول النظام.' + code
              : 'The database refused to read your account — the problem is not your password. Contact the system administrator.' + code;
            err.hidden = false;
          } catch (e) { console.warn('[login-refusal-text] could not correct the message', e); }
        }, 0);
      }).catch(function () {});
      return p;
    };

    console.info('login-refusal-text.js: installed.');
  }

  install();

  /* اسم عام صغير — لا واجهة فعلية يحتاجها ملف آخر، لكنه يمنح فاحصاً خارجياً
     طريقة نظيفة للتأكد من أن اللفّ تمّ دون قراءة تفاصيل Auth الداخلية.
     A small global — no other file needs a real API here, but it gives an
     outside test a clean way to confirm the wrap happened without reading
     Auth's internal details. */
  global.LoginRefusalText = {
    installed: function () { return !!(global.Auth && global.Auth.__loginRefusalTextWrapped); }
  };
})(window);
