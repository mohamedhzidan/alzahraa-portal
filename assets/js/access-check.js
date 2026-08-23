/* =========================================================================
   access-check.js — هل تراك قاعدة البيانات أصلاً؟
                     Does the database recognise you at all?
   -------------------------------------------------------------------------
   القصة التي أنتجت هذا الملف

   ٢٣ أغسطس ٢٠٢٦: أ. أحمد يكتب مستندات يوماً كاملاً. الموقع يقول «تم
   الحفظ» في كل مرة. يحدّث الصفحة فلا يجد شيئاً. الصفوف كانت في قاعدة
   البيانات فعلاً — لكنه ممنوع من قراءتها.

   السبب: كل سياسة أمان في النظام تبدأ بـ

       using ( az_role() is not null and ... )

   ودالة az_role() مكتوبة هكذا:

       where u.auth_uid = auth.uid()
         and u.status <> 'inactive'
         and not u."mustChangePassword"      ← هنا

   فمن لم يُمسح عنه هذا العلم يصبح — بالنسبة لقاعدة البيانات — بلا دور:
   لا يقرأ ولا يكتب. بينما المتصفح لا يعرف شيئاً عن ذلك ويعمل بشكل طبيعي
   تماماً ويقول له «تم الحفظ».

   THE STORY BEHIND THIS FILE

   Ahmed wrote documents for a whole day. The portal said "saved" every
   time. He refreshed and found nothing. The rows really were in the
   database — he was simply forbidden to read them.

   Every policy begins with az_role() is not null, and az_role() excludes
   anyone whose mustChangePassword flag is still set. Such a person has
   no role as far as the database is concerned: no reads, no writes. The
   browser knows nothing about this and behaves perfectly normally.

   -------------------------------------------------------------------------
   ولماذا لا يكفي أن يغيّر كلمة المرور؟

   لأن identity.js يكتب:   u.mustChangePassword = false
   وauth.js يكتب:          current.mustChangePassword = false

   وكلاهما في ذاكرة المتصفح فقط. لا أحد منهما يكتب القيمة في جدول users —
   ولا يستطيع، لأن الحارس az_guard_users يمنع الكتابة المباشرة عليه. فإن
   لم تمسح دالة change-password العلم من جهة الخادم، بقي إلى الأبد.

   WHY CHANGING THE PASSWORD IS NOT ENOUGH. Both identity.js and auth.js
   clear the flag in browser memory only. Neither writes it to the users
   table — nor can they, because the az_guard_users trigger forbids direct
   writes. Unless the change-password Edge Function clears it server-side,
   it stays set forever.

   -------------------------------------------------------------------------
   ما يفعله هذا الملف

   يسأل قاعدة البيانات مباشرة عند كل تسجيل دخول: ما دوري عندك؟
   فإن كان الجواب «لا شيء» أوقف العمل فوراً بشاشة واضحة، بدل أن يترك
   الموظف يكتب يوماً كاملاً في الفراغ.

   It asks the database directly at every login: what is my role? If the
   answer is nothing, it stops the person immediately with a plain screen,
   instead of letting them write into a void all day.

   إضافي بالكامل · ADDITIVE. يُحمَّل بعد app.js.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }

  var checked = false;
  var blocked = false;

  /* ═══════════════════════════════════════════════════════════════════
     السؤال — نسأل قاعدة البيانات نفسها، لا المتصفح
     ═══════════════════════════════════════════════════════════════════ */
  function ask() {
    var client = global.Auth && Auth.client && Auth.client();
    var user = global.Auth && Auth.current && Auth.current();
    if (!client || !user) return Promise.resolve({ state: 'unknown' });

    /* az_role() دالة في قاعدة البيانات، ونستدعيها عبر rpc. */
    return Promise.resolve(client.rpc('az_role')).then(function (res) {
      if (res && res.error) {
        /* الدالة غير منشورة أو غير موجودة — لا نوقف أحداً بناءً على شكّ.
           نرجع لفحص أضعف: العلم كما يراه المتصفح.
           If the function is not exposed we do not block anyone on a
           guess; we fall back to the weaker browser-side flag. */
        return { state: user.mustChangePassword ? 'flagged' : 'unknown',
                 detail: String(res.error.message || res.error) };
      }
      if (res && (res.data === null || res.data === undefined || res.data === '')) {
        return { state: 'blocked' };
      }
      return { state: 'ok', role: res.data };
    }).catch(function (e) {
      return { state: 'unknown', detail: String(e && e.message || e) };
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     الشاشة الحاجزة — لا تُغلق، ولا تسمح بالعمل
     ═══════════════════════════════════════════════════════════════════ */
  function block(reason) {
    if (blocked) return;
    blocked = true;

    var user = (global.Auth && Auth.current && Auth.current()) || {};
    var host = document.createElement('div');
    host.id = 'azAccessBlock';
    host.style.cssText =
      'position:fixed;inset:0;z-index:100000;background:rgba(10,14,30,.94);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;' +
      'font-family:Cairo,Tahoma,Arial,sans-serif';

    host.innerHTML =
      '<div style="background:#fff;max-width:620px;width:100%;border-radius:16px;' +
        'padding:30px 32px;line-height:1.95;box-shadow:0 24px 70px rgba(0,0,0,.5)">' +
        '<div style="font-size:34px;line-height:1">⛔</div>' +
        '<h2 style="margin:10px 0 4px;color:#b42318;font-size:21px">' +
          esc(L({ ar: 'حسابك غير مفعَّل في قاعدة البيانات',
                  en: 'Your account is not active in the database' })) + '</h2>' +
        '<p style="margin:0 0 16px;color:#475467">' +
          esc(L({ ar: 'لا تكتب أي بيانات الآن — لن تُحفظ، ولن تظهر لك، ولن يخبرك النظام.',
                  en: 'Do not enter any data now. It will not be saved, you will not see it, and nothing will tell you.' })) +
        '</p>' +

        '<div style="background:#fdeceb;border-radius:10px;padding:12px 14px;margin-bottom:16px">' +
          '<div style="font-weight:700;margin-bottom:4px">' +
            esc(L({ ar: 'السبب', en: 'Reason' })) + '</div>' +
          '<div>' + esc(reason) + '</div>' +
        '</div>' +

        '<div style="font-weight:700;margin-bottom:6px">' +
          esc(L({ ar: 'الحل', en: 'What to do' })) + '</div>' +
        '<ol style="margin:0 0 18px;padding-inline-start:20px">' +
          '<li>' + esc(L({ ar: 'اضغط الزر بالأسفل وغيّر كلمة المرور.',
                           en: 'Press the button below and change your password.' })) + '</li>' +
          '<li>' + esc(L({ ar: 'سجّل الخروج ثم الدخول من جديد.',
                           en: 'Log out, then log back in.' })) + '</li>' +
          '<li>' + esc(L({ ar: 'إن ظهرت هذه الشاشة مرة أخرى، أبلغ الإدارة — العلم لم يُمسح من قاعدة البيانات ' +
                               'ويحتاج تدخّلاً من مسؤول النظام.',
                           en: 'If this screen appears again, tell your administrator — the flag was not cleared in the database.' })) + '</li>' +
        '</ol>' +

        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button id="azAccPw" style="background:#0000A3;color:#fff;border:0;border-radius:9px;' +
            'padding:11px 20px;font-weight:700;cursor:pointer;font-size:14px">' +
            esc(L({ ar: 'تغيير كلمة المرور الآن', en: 'Change my password now' })) + '</button>' +
          '<button id="azAccOut" style="background:#fff;color:#0000A3;border:1.5px solid #0000A3;' +
            'border-radius:9px;padding:11px 20px;font-weight:700;cursor:pointer;font-size:14px">' +
            esc(L({ ar: 'تسجيل الخروج', en: 'Log out' })) + '</button>' +
        '</div>' +

        '<p style="margin:16px 0 0;color:#98a2b3;font-size:12px;direction:ltr;text-align:left">' +
          esc((user.username || '') + ' · ' + (user.role || '')) + '</p>' +
      '</div>';

    document.body.appendChild(host);

    var pw = document.getElementById('azAccPw');
    if (pw) pw.onclick = function () {
      if (global.Identity && Identity.promptPasswordChange) {
        host.style.display = 'none';
        Identity.promptPasswordChange(true);
        /* أعد الفحص بعد التغيير — فإن لم يُمسح العلم فعلاً عادت الشاشة،
           وهذا بالضبط ما نريد أن يعرفه فوراً لا بعد يوم عمل ضائع. */
        setTimeout(function () {
          blocked = false;
          host.remove();
          run(true);
        }, 12000);
      }
    };
    var out = document.getElementById('azAccOut');
    if (out) out.onclick = function () {
      if (global.Auth && Auth.logout) Auth.logout();
      location.reload();
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     التشغيل
     ═══════════════════════════════════════════════════════════════════ */
  function run(force) {
    if (checked && !force) return Promise.resolve();
    var user = global.Auth && Auth.current && Auth.current();
    if (!user) return Promise.resolve();
    if (!global.Store || !Store.isInitialized || !Store.isInitialized()) return Promise.resolve();
    if (global.Store.isOnline && !Store.isOnline()) return Promise.resolve();  /* دون اتصال: لا فحص */
    checked = true;

    return ask().then(function (r) {
      if (r.state === 'ok') {
        console.info('[access-check] الدور كما تراه قاعدة البيانات: ' + r.role);
        return;
      }
      if (r.state === 'blocked') {
        console.error('[access-check] az_role() returned NULL — this account can neither read nor write.');
        block(L({
          ar: 'قاعدة البيانات لا ترى لك أي دور. يحدث هذا عندما تكون علامة ' +
              '«تغيير كلمة المرور مطلوب» ما زالت مرفوعة على حسابك، أو كان الحساب موقوفاً.',
          en: 'The database sees no role for you. This happens when the "must change password" ' +
              'flag is still set on your account, or the account is suspended.' }));
        return;
      }
      if (r.state === 'flagged') {
        console.warn('[access-check] mustChangePassword is set — the database will hide everything.');
        block(L({
          ar: 'حسابك ما زال مطلوباً منه تغيير كلمة المرور. قبل أن يتم ذلك فعلياً في ' +
              'قاعدة البيانات، لن تُحفظ لك بيانات ولن تظهر لك.',
          en: 'Your account still requires a password change. Until that is recorded in the ' +
              'database, nothing you enter will be saved or shown to you.' }));
        return;
      }
      console.info('[access-check] could not verify the role' + (r.detail ? ' — ' + r.detail : ''));
    });
  }

  /* app.js يدخل بالمستخدم ثم يبني الواجهة. نفحص بعد ذلك بقليل، ونعيد
     المحاولة عدة مرات لأن التهيئة غير متزامنة. */
  [1500, 4000, 9000].forEach(function (ms) {
    setTimeout(function () { run(false); }, ms);
  });
  if (global.Store && Store.onChange) {
    Store.onChange(function (type) {
      if (type === 'ready-online') setTimeout(function () { run(true); }, 800);
    });
  }

  global.AccessCheck = { run: run, ask: ask, isBlocked: function () { return blocked; } };
})(window);
