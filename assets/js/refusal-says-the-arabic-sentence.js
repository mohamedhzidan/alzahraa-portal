/* =========================================================================
   refusal-says-the-arabic-sentence.js
   الرفضُ المكتوب بالعربية يصل إلى الشاشة بدل أن يُبتلع
   An Arabic refusal written BY US reaches the screen instead of being swallowed
   -------------------------------------------------------------------------
   العطل، مقيساً على شاشةٍ حقيقية (t7، ١٢ سبتمبر ٢٠٢٦):
     حرّاسُ قاعدة البيانات عندنا يرفعون جُملاً عربية مكتوبةً للإنسان، مثل
     «يوجد بالفعل مسير رواتب لشهر 2026-06 وهو «PR-…» — افتحه بدل إنشاء مسير
     ثانٍ». ولا يراها أحد. السبب: refusal-explain.js يعرف شكلين فقط من رسائل
     Postgres (not-null و check) — وهو يقول ذلك عن نفسه صراحةً — وكلُّ ما عداه
     «يمرّ دون تدخّل». والذي يظهر عندئذٍ هو رسالة app.js:55 العامّة وحدها:
     «لم تُكتب إحدى المسودات على الخادم…» — بلا سببٍ ولا اسمٍ ولا تصرّف.
     فالحارس صحيح، والجملة كُتبت بعناية، والإنسان لا يرى منها حرفاً.
   THE FAULT, measured on a real screen (t7, 12 Sept 2026):
     our own database guards raise ARABIC sentences written for a person —
     «يوجد بالفعل مسير رواتب لشهر 2026-06 وهو «PR-…»…» — and nobody ever sees
     them. refusal-explain.js knows exactly two Postgres message shapes
     (not-null and check) and says so about itself; everything else "passes
     through untouched". What appears instead is app.js:55's generic line,
     «A draft was not written to the server…» — no reason, no name, no action.
     The guard is right, the sentence was written with care, and the person
     reads none of it.

   العلاج، وهو أضيق ما يمكن: تُعرَض الرسالة كما هي **فقط** إذا كانت تحمل حرفاً
   عربياً. رسائل Postgres نفسها إنجليزية بالكامل (وأسماء الأعمدة والقيود
   ASCII)، فالعربية دليلٌ قاطع على أنها جملةٌ كتبها أحدُنا للإنسان — ولذلك لا
   يمكن أن يتقاطع هذا الملف مع refusal-explain.js ولا أن يُظهر رسالتين.
   THE CURE, as narrow as it can be: the message is shown verbatim ONLY if it
   contains an Arabic letter. Postgres's own messages are entirely English
   (column and constraint names are ASCII too), so Arabic is proof that one of
   US wrote it FOR a person — which is also why this file can never overlap
   with refusal-explain.js or produce two toasts for one refusal.
   🔴 ولا تُنسَخ تعابيرُ refusal-explain.js هنا إطلاقاً — نسخةٌ ثانية منها
   ستتعفّن بصمت. التمييز بحرفٍ عربي وحده، ولا شيء غيره.
   🔴 refusal-explain.js's regexes are NOT copied here — a second copy would
   rot silently. The discriminator is one Arabic letter and nothing else.

   ⛔ لا يُوسَّع هذا الملف ليغطي رفضَ الفهارس الفريدة (حكم المدير، ١٢ سبتمبر).
   التمييزُ بحرفٍ عربيٍّ واحد هو ما يجعله عاجزاً عن التقاطع مع
   refusal-explain.js، وهذا الفصلُ أثمنُ من التغطية. ورسائل «duplicate key»
   إنجليزيةٌ كلُّها، فتوسيعُه إليها يعني مطابقةَ أشكالِ Postgres — أي نسخةً
   ثانية من ذلك الملف، تتعفّن بصمت. الفجوةُ الأوسع مسجَّلة عند المدير
   (ROADMAP HX-26) ولها مالكٌ آخر: أوّلُ مسارٍ يلمس refusal-explain.js.
   ⛔ DO NOT WIDEN this file to cover unique-index refusals (the manager's
   ruling, 12 Sept). The single-Arabic-letter discriminator is exactly what
   makes it incapable of overlapping with refusal-explain.js, and that
   separation is worth more than the coverage. «duplicate key» messages are
   entirely English, so widening to them means matching Postgres shapes — a
   second copy of that file, rotting silently. The wider gap is logged with the
   manager (ROADMAP HX-26) and has a different owner: the next lane that
   touches refusal-explain.js.

   إضافي بالكامل · WHOLLY ADDITIVE. احذف الملف فتعود الشاشة إلى ما هي عليه
   اليوم بالحرف: الرسالة العامة وحدها. Delete it and the screen returns to
   exactly today's behaviour — the generic message alone.
   v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  /* الاعتماديات تُفحص عند التحميل لا عند النداء: حارسٌ عند موضع النداء يجعل
     الملف صامتاً صمتاً تاماً حين يَنقص شيء — وهو الفخّ الذي وقع فيه
     payroll-draft-builder.js مع UI.alert.
     Dependencies are checked at LOAD time, not at call sites: a guard at the
     call site makes the file WHOLLY SILENT when something is missing — the
     trap payroll-draft-builder.js fell into with UI.alert. */
  var missing = [];
  if (!global.UI || typeof UI.toast !== 'function') missing.push('UI.toast');
  if (!global.addEventListener) missing.push('addEventListener');
  if (missing.length) {
    console.error('refusal-says-the-arabic-sentence.js NOT installed — missing: ' + missing.join(', ') +
      '. Arabic refusals from the database will stay invisible, as they are today.');
    return;
  }
  if (UI.__azArabicRefusal) return;
  UI.__azArabicRefusal = true;

  /* نطاق الحروف العربية الأساسي · the basic Arabic letter range */
  var ARABIC = /[ء-ي]/;

  /* بادئات Postgres التي قد تسبق نصّنا · Postgres prefixes that may wrap our
     text; the sentence itself is what matters, so a leading marker is trimmed
     rather than shown. */
  function clean(t) {
    return String(t || '')
      .replace(/^\s*(error|خطأ)\s*:\s*/i, '')
      .replace(/\s*CONTEXT:[\s\S]*$/i, '')
      .trim();
  }

  var lastShown = '', lastAt = 0;

  function show(text) {
    var t = clean(text);
    if (!t || !ARABIC.test(t)) return false;
    /* نفس الجملة مرّتين في ثانيتين تُعرض مرّة — الحدث قد يصل من مسارين.
       The same sentence twice within two seconds is shown once: the event can
       arrive by two paths. */
    if (t === lastShown && Date.now() - lastAt < 2000) return true;
    lastShown = t; lastAt = Date.now();
    UI.toast(t, 'error', 12000);
    return true;
  }

  global.addEventListener('alzahraa:store', function (e) {
    var d = e && e.detail;
    if (!d || (d.type !== 'conflict' && d.type !== 'sync-error')) return;
    try { show(d.data && d.data.error); }
    catch (err) { console.warn('[arabic-refusal] failed', err); }
  });

  global.ArabicRefusal = { show: show, isArabic: function (t) { return ARABIC.test(clean(t)); } };
  console.info('refusal-says-the-arabic-sentence.js: an Arabic refusal raised by a database guard ' +
               'is now shown to the person instead of being replaced by the generic "a draft was not ' +
               'written" message. English Postgres messages are untouched — refusal-explain.js owns those.');
})(window);
