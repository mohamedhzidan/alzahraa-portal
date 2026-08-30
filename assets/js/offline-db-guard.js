/* =========================================================================
   offline-db-guard.js — الدخول لا يجوز أن يفشل لأن تخزين الهاتف ممتلئ
   offline-db-guard.js — a full phone must never block signing in

   ── العطل بالعربية ──────────────────────────────────────────────────────
   البورتال يحفظ نسخة صغيرة من شغلك داخل هاتفك (IndexedDB). لو رفض الهاتف
   ذلك — الذاكرة ممتلئة، أو تصفّح خاص، أو هاتف شركة مقفول — كان الدخول
   يفشل تماماً، والرسالة الظاهرة:

       «تعذّر تحميل بيانات عملك. تحقق من الاتصال ثم حاول مرة أخرى.»

   وكلمة السر كانت صحيحة، والإنترنت كان يعمل. الموظف يمكنه اتباع هذه
   التعليمة إلى الأبد ولا يدخل أبداً. هذا هو أخطر ما فيه: الرسالة ترسله
   ليصلح الشيء الخطأ.

   ── أين بالضبط ──────────────────────────────────────────────────────────
   store.js:145-146 داخل initialize():
       queue          = global.OfflineDB ? await OfflineDB.queueList(user.id) : [];
       conflictsCache = global.OfflineDB ? await OfflineDB.conflicts(user.id) : [];
   ولا واحد منهما داخل try/catch. وoffline-db.js محمَّل دائماً (loader سطر
   ١٠)، فـ global.OfflineDB صحيح دائماً، والبديل «: []» لا يمكن أن يعمل
   إطلاقاً. وoffline-db.js يرفض عند req.onerror أيضاً — فالهاتف الممتلئ
   يقع في هذا، لا الهاتف الذي تنقصه الخاصية فقط.

   وطريق ثالث لم يُذكر في البلاغ الأصلي، وجدته بقراءة الدالة كاملة:
   store.js:152 `if (!loaded) loaded = await loadSnapshot();` — أيضاً بلا
   حارس، وloadSnapshot نفسها (:103-105) تنتظر OfflineDB.loadSnapshot بلا
   حارس. يقع فيه من كان غير متصل أو فشل تحميله من الخادم.

   ── لماذا ملف جديد ولا نعدّل store.js ───────────────────────────────────
   store.js من الملفات المقروءة فقط بقاعدة المشروع. وهذا الملف إضافي بحت:
   حذفه يعيد السلوك الحالي حرفياً.
   النمط الصحيح موجود أصلاً في نفس المشروع على بعد ٣٠٠ سطر —
   auth.js:813-818 يلفّ نداءات OfflineDB الخاصة به في try/catch. نحن
   نطبّق نفس النمط على النداءات الثلاثة التي نسيها أحد.

   ── قرار مقصود: لماذا نُرجع [] بدل أن نمنع الدخول ───────────────────────
   لو كان التخزين معطّلاً فنحن لا نستطيع قراءة الطابور مهما فعلنا. البديل
   الوحيد هو منع الموظف من العمل نهائياً — وهو أسوأ، وهو ما يحدث اليوم.
   لكن «لا يوجد شيء معلّق» في هذه الحالة ليست حقيقة، بل عجز عن القراءة —
   وهذا بالضبط فخّ «الشغل غير المتصل يختفي بصمت» المسجَّل في ذاكرة
   المشروع. لذلك لا نكتفي بالإرجاع الصامت: نرفع علماً ونُخبر الموظف
   صراحةً أن الحفظ بلا إنترنت لا يعمل على هذا الجهاز، فلا يعتمد عليه.

   ── الأثر على الرسائل ───────────────────────────────────────────────────
   • متصل + تخزين معطّل → يدخل ويعمل عادي (البيانات من الخادم).
   • غير متصل + تخزين معطّل → loadSnapshot تُرجع false بدل أن ترفض،
     فتصل الرسالة الصحيحة «أول دخول على هذا الجهاز يحتاج اتصالاً
     بالإنترنت» بدل «تحقق من الاتصال» المضلِّلة.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The portal keeps a small copy of your work inside your phone
   (IndexedDB). If the phone refuses — storage full, private browsing, a
   locked-down work phone — signing in used to fail completely with
   "Your workspace could not be loaded. Check the connection and try
   again." The password was right and the internet was fine. The person
   could follow that instruction for ever and never get in. That is the
   worst part: the message sends them to fix the wrong thing.

   Three unguarded awaits, all reached during sign-in:
     store.js:145  OfflineDB.queueList(user.id)
     store.js:146  OfflineDB.conflicts(user.id)
     store.js:152  loadSnapshot() -> :105 OfflineDB.loadSnapshot(...)
   (the third was NOT in the original report; found by reading the whole
   function rather than the two cited lines).

   store.js is read-only by project rule, so this is a separate additive
   file. Deleting it restores today's behaviour exactly. The correct
   pattern already exists 300 lines away at auth.js:813-818.

   Deliberate decision — why return [] rather than block the login:
   if storage is broken we cannot read the queue by any means. The only
   alternative is stopping the person working entirely, which is worse and
   is what happens today. But "nothing pending" here is an INABILITY TO
   READ, not a fact — exactly the "offline work vanishes silently" trap in
   this project's memory. So we do not fail silently: we raise a flag and
   tell the person plainly that offline saving is not working on this
   device, so they do not rely on it.

   مُثبَت بالتشغيل / proven by running:
   TESTS/offline-db-guard-trial.js  (v2.0.27)
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.OfflineDB) return;               /* لا شيء نلفّه · nothing to wrap */
  if (global.OfflineDB.__guarded) return;      /* التحميل مرتين لا يلفّ مرتين */

  var degraded = false;
  var reasons = [];

  function markDegraded(what, err) {
    degraded = true;
    if (reasons.indexOf(what) === -1) reasons.push(what);
    /* نطبع السبب الحقيقي مرة واحدة لكل نوع — لا نبتلعه بلا أثر.
       Print the real cause once per kind — never swallow it without trace. */
    try {
      console.warn('[offline-db-guard] ' + what +
        ' failed; continuing without offline storage.', err);
    } catch (e) {}
  }

  /* يلفّ دالة تُرجع وعداً، فتهدأ إلى قيمة آمنة بدل أن ترفض.
     Wrap a promise-returning function so it settles to a safe value
     instead of rejecting. Both the synchronous throw and the async
     rejection are covered — a broken IndexedDB can do either. */
  function soften(name, safeValue) {
    var original = global.OfflineDB[name];
    if (typeof original !== 'function') return;
    global.OfflineDB[name] = function () {
      try {
        var out = original.apply(global.OfflineDB, arguments);
        if (out && typeof out.then === 'function') {
          return out.then(null, function (err) {
            markDegraded(name, err);
            return safeValue;
          });
        }
        return out;
      } catch (err) {
        markDegraded(name, err);
        return Promise.resolve(safeValue);
      }
    };
  }

  /* الثلاثة التي تقع في طريق الدخول، ولا شيء غيرها.
     The three on the sign-in path, and nothing else. Deliberately minimal:
     queueAdd/conflictAdd must KEEP rejecting, because a failed save that
     reports success is the silent-loss fault, not the cure for it. */
  soften('queueList', []);
  soften('conflicts', []);
  soften('loadSnapshot', null);

  global.OfflineDB.__guarded = true;

  /* ── إخبار الموظف، مرة واحدة، بعد أن يدخل فعلاً ─────────────────────────
     لا نتكلم أثناء شاشة الدخول: الرسالة هناك تربك. ننتظر حتى يعمل
     البورتال فعلاً ثم نقول الحقيقة بوضوح.
     Tell the person once, after they are actually in. We stay silent
     during the login screen — a message there confuses. We wait until the
     portal is really running, then say it plainly. */
  /* 🔴 خطر أدخلتُه أنا بهذا الحارس نفسه، أقوله صراحةً بدل إخفائه:
     store.js:145 يبني الطابور من OfflineDB.queueList، وstore.js:156
     يستدعي flush() عند الإقلاع. فإن كان التخزين قد عمل أثناء انقطاع
     الاتصال (فحُفظت مسودات) ثم تعطّل بعدها، يُرجع الحارس [] فيقرأ
     البورتال «لا شيء معلّق» ولا يرفع تلك المسودات أبداً.
     قبل هذا الحارس كانت النتيجة أسوأ (يُمنع الدخول كلياً فلا تُرفع أيضاً
     ولا يستطيع العمل)، لكن «أسوأ سابقاً» ليست عذراً لتحذير ناقص.
     لذلك يذكر التحذير هذا الاحتمال بالاسم — وهذا بالضبط فخّ «الشغل غير
     المتصل يختفي بصمت» المسجَّل في ذاكرة المشروع.

     🔴 A risk THIS GUARD ITSELF introduces, stated rather than hidden:
     store.js:145 builds the queue from OfflineDB.queueList and
     store.js:156 calls flush() at boot. So if storage WORKED while
     offline (drafts were saved) and broke afterwards, the guard returns
     [] and the portal reads "nothing pending" and never uploads those
     drafts. Before this guard the outcome was worse (login blocked
     entirely, so they also never uploaded and he could not work) — but
     "worse before" is no excuse for an incomplete warning. So the warning
     names this possibility explicitly. This is precisely the
     "offline work vanishes silently" trap in the project memory. */
  function announceIfDegraded() {
    if (!degraded) return;
    /* 🔴 صيغتان، لا واحدة — لأن الحالتين مختلفتان تماماً وقول إحداهما مكان
       الأخرى يرسل الموظف ليصلح الشيء الخطأ (وهو العطل الأصلي نفسه):
         • فشل الكتابة  → «الحفظ بدون إنترنت لا يعمل» — صحيح: لا يستطيع
           الحفظ محلياً من الآن.
         • فشل القراءة  → «عملك المحفوظ غير مقروء مؤقتاً» — الحفظ يعمل،
           لكن ما هو مخزَّن بالفعل تعذّرت قراءته. الشغل موجود على الجهاز.
       🔴 Two messages, not one — the two situations are different, and
       saying one in place of the other sends the person to fix the wrong
       thing (which is the original fault of this whole family):
         • write failure → "offline saving is not working" — true: it
           cannot save locally from now on.
         • read failure  → "your saved work is temporarily unreadable" —
           saving works; what is already stored could not be read. The work
           is still on the device. */
    /* 🔴 القائمة الواحدة هي مصدر الحقيقة للاثنين — لا قائمتان تتباعدان.
       أول نسخة عدّدت القراءات مرتين: مرة في readFailed (ونسيت 'conflicts')
       ومرة في استثناء writeFailed (وذكرتها). فحين تفشل conflicts وحدها
       يخرج الاثنان false، فتقع الرسالة في الفرع الأخير وتقول «الحفظ بدون
       إنترنت لا يعمل» — وهو كذب: لم يفشل أي حفظ، بل فشلت قراءة.
       أمسكتها بوابةُ فحص مستقلة. الدرس: حين يشتقّ شرطان من نفس القائمة،
       اكتب القائمة مرة واحدة — نسختان منها هي «التوأم الهشّ» في ثوب جديد.
       🔴 ONE list is the source of truth for both — never two that drift.
       A first version enumerated the reads TWICE: once in readFailed (where
       it forgot 'conflicts') and once in writeFailed's exclusion (where it
       remembered it). So when conflicts alone failed, both came out false,
       the message fell to the last branch and claimed «الحفظ بدون إنترنت لا
       يعمل» — a lie: no save had failed, a READ had. Caught by an
       independent gate. The lesson: when two conditions derive from the same
       list, write the list once — two copies of it are the fragile twin in
       new clothes. */
    var READ_OPS = ['queueList', 'conflicts', 'loadSnapshot'];
    var readFailed = reasons.some(function (r) { return READ_OPS.indexOf(r) !== -1; });
    var writeFailed = reasons.some(function (r) { return READ_OPS.indexOf(r) === -1; });

    var ar, en;
    if (readFailed && !writeFailed) {
      ar = 'عملك المحفوظ على هذا الجهاز غير مقروء مؤقتاً. الشغل لم يُحذف — '
         + 'ما زال موجوداً على الجهاز. لو كنت قد حفظت شيئاً بدون إنترنت هنا، '
         + 'فقد لا يكون قد رُفع بعد — أبلغ الإدارة قبل أن تعيد إدخاله.';
      en = 'Work saved on this device is temporarily unreadable. Nothing was '
         + 'deleted — it is still on the device. If you saved anything offline '
         + 'here, it may not have uploaded yet — tell the office before you '
         + 're-enter it.';
    } else {
      ar = 'الحفظ بدون إنترنت لا يعمل على هذا الجهاز (الذاكرة ممتلئة أو التصفّح خاص). '
         + 'يمكنك العمل عادي وأنت متصل، لكن لا تعتمد على الحفظ بدون إنترنت هنا.'
         + (readFailed
            ? ' ⚠️ ولو كنت قد حفظت شيئاً بدون إنترنت على هذا الجهاز من قبل، '
              + 'فقد لا يكون قد رُفع — راجع سجلاتك أو أبلغ الإدارة.'
            : '');
      en = 'Offline saving is not working on this device (storage full or private '
         + 'browsing). You can work normally while online, but do not rely on '
         + 'offline saving here.'
         + (readFailed
            ? ' ⚠️ And if you previously saved anything offline on this device, it '
              + 'may not have uploaded — check your records or tell the office.'
            : '');
    }
    var msg = (global.I18N && I18N.getLang && I18N.getLang() === 'en') ? en : ar;
    try {
      if (global.UI && typeof UI.toast === 'function') { UI.toast(msg, 'warn'); return; }
    } catch (e) {}
    try { console.warn('[offline-db-guard] ' + msg); } catch (e) {}
  }

  /* Store يُصدر 'ready-online' أو 'ready-offline' في نهاية initialize()
     (store.js:157). أي منهما يعني أن الدخول نجح فعلاً.

     🔴 الواجهة هي Store.onChange(fn) و fn تستقبل (type) — وليست
     Store.on(event, fn). كتبتُ Store.on أولاً، ولأن اللفّ كله داخل
     try/catch كان سيفشل بصمت تامّ: لا خطأ، ولا إشعار للموظف أبداً،
     بينما أنا أقول إنه سيُخبَر. أمسكتُها بأمر grep على store.js لا
     بالقراءة. الشكل الصحيح مستعمل فعلاً في access-check.js:226-229
     وsave-guard.js:745. القاعدة: تحقّق من اسم الواجهة في الملف الحقيقي
     قبل أن تعتمد عليها — خصوصاً داخل try/catch يبتلع الخطأ.

     🔴 The API is Store.onChange(fn) with fn receiving (type) — NOT
     Store.on(event, fn). I wrote Store.on first, and because the whole
     wiring sits inside try/catch it would have failed in complete
     silence: no error, and the person NEVER told, while I claimed they
     would be. Caught by grepping store.js, not by reading. The correct
     shape is already used at access-check.js:226-229 and
     save-guard.js:745. Rule: verify an API's real name in the real file
     before depending on it — especially inside a try/catch that eats the
     error. */
  function wireAnnounce() {
    if (!global.Store || typeof Store.onChange !== 'function') return false;
    try {
      Store.onChange(function (type) {
        if (type === 'ready-online' || type === 'ready-offline') announceIfDegraded();
      });
      return true;
    } catch (e) { return false; }
  }
  if (!wireAnnounce()) {
    /* Store لم يُحمَّل بعد — نحاول مرة أخرى عند اكتمال الصفحة.
       Store is not loaded yet — retry once the page is complete. */
    if (global.document && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', wireAnnounce);
    }
  }

  global.OfflineDBGuard = {
    isDegraded: function () { return degraded; },
    reasons: function () { return reasons.slice(); },
    announceIfDegraded: announceIfDegraded
  };
})(window);
