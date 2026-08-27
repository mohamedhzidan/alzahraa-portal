/* =========================================================================
   import-headerless.js — الصف الأول لا يضيع بعد الآن إن كان بيانات لا عناوين
                          THE FIRST ROW NO LONGER DISAPPEARS WHEN IT IS
                          DATA, NOT HEADERS
   -------------------------------------------------------------------------
   العطل · THE BUG

   import.js:695-698 (preview) يقرأ rows[0] كعناوين أعمدة دائماً، بلا أي
   فحص:

       var headers = rows[0] || [];
       var cols = manualCols || mapColumns(mod, headers);

   ثم تبدأ حلقة القراءة من rows[1] (import.js:716). فإن كان ملف المستخدم
   بلا صف عناوين إطلاقاً — جدول بيانات خام أول صف فيه أرقام حقيقية — يُحسب
   ذلك الصف عنواناً ويُحذف صامتاً من كل استيراد، ناجحاً كان أو بعد ربط
   يدوي؛ لا يظهر أبداً في أي رسالة خطأ ولا تحذير.

   import.js:695-698 (preview) always reads rows[0] as column headers, no
   check at all:

       var headers = rows[0] || [];
       var cols = manualCols || mapColumns(mod, headers);

   and the read loop then starts at rows[1] (import.js:716). So if the
   user's file has no header row at all — a raw data table whose first
   row is real numbers — that row is treated as a header and silently
   dropped from every import, whether matching succeeds automatically or
   after a manual remap; it never shows up in any error or warning.

   -------------------------------------------------------------------------
   لماذا هذا هو المسار الحقيقي الوحيد المتأثر · WHY THIS IS THE ONLY REAL
   PATH AFFECTED

   sheets-templates.js له كاشف بلا-عناوين خاص به (looksHeaderless، أسطر
   ٤٣٠-٤٤١) يفحص مواضع الأعمدة الرقمية بحسب حقول كل سطر — ولهذا نجح
   ٦٨/٦٨ هناك. الاستيراد العام (import.js + import-documents.js:572) لا
   يملك أي كاشف مماثل؛ هذا الملف يسدّه.

   sheets-templates.js has its own headerless detector (looksHeaderless,
   lines 430-441) that checks number-typed column positions per that
   screen's own line fields — which is why it already scores 68/68 there.
   The generic import path (import.js + import-documents.js:572) has no
   equivalent detector at all; this file closes that gap.

   الزر «⬆ استيراد» نفسه على كل شاشة يُعاد ربطه بالكامل بواسطة
   import-documents.js:946-958 (نُقرأت بالحرف) — فالمسار الحيّ الوحيد
   لملفات الجداول هو DataImport.preview (import-documents.js:572)، لا
   الدالة المحلية preview() داخل import.js (التي تبقى مستدعاة من مسارين
   ميتين فقط: import.js:579 وimport.js:942 — الزر لا ينادي أيّاً منهما
   بعد أن يُعاد ربطه). لذلك لفّ DataImport.preview هو المكان الصحيح
   الوحيد — وimport-mapping-plus.js يثبت هذا اللفّ فعلاً في الإنتاج.

   The "⬆ Import" button on every screen has its onclick fully rebound by
   import-documents.js:946-958 (read verbatim) — so the one live path for
   spreadsheet files is DataImport.preview (import-documents.js:572), not
   the local preview() function inside import.js itself (which stays
   reachable only from two dead paths — import.js:579 and import.js:942 —
   the button never calls either once it has been rebound). So wrapping
   DataImport.preview is the one correct place — and import-mapping-plus.js
   already proves this exact wrap works in production.

   -------------------------------------------------------------------------
   الأسلوب · THE TECHNIQUE

   نلفّ DataImport.preview (كما يفعل import-mapping-plus.js بالضبط).
   الشرط: كل خلية غير فارغة في rows[0] رقم صريح (الخلايا الفارغة تُتجاهَل
   بلا اعتراض — عمود ملاحظات فارغ لا يعني أن الصف عنوان)، وعلى الأقل خلية
   رقمية واحدة فعلاً، وrows.length > 1. عندئذٍ لا نخمّن أبداً — نسأل بنافذة،
   والافتراض «بيانات» (الأكثر أماناً: إبقاء الصف بدل حذفه). إن اختار
   المستخدم «بيانات» نُنشئ صفاً مُصطنعاً («عمود ١»، «عمود ٢»…) ونستدعي
   الدالة الأصلية (قبل هذا الملف) بالصفوف بعد التعديل، فيُعامَل الصف الأول
   كبيانات فعلية بدل أن يضيع. اختياره «عناوين» يستدعي الأصلية دون أي
   تعديل — سلوك اليوم بالحرف.

   ⚠️ إصلاح داخل هذه الدفعة نفسها (وُجد بتشغيل TESTS/owner-files-2026-08-27
   -trials.js §C على ملف أحمد الحقيقي «شيت مناسيب.xlsx»): الشرط الأول
   («كل خلية غير فارغة») كان في مسودته الأولى «كل خلية»، فطلب عدم الفراغ
   من كل عمود بلا استثناء. الملف الحقيقي أول صفوفه ["1","135",""] — العمود
   الثالث (ملاحظات) فارغ، فكان الشرط القديم يفشل ولا يُسأل المستخدم شيئاً
   — العطل نفسه يعود حرفاً بحرف رغم وجود هذا الملف. صُحِّح هنا قبل أي رفعة.

   FIX made within this very batch (found by running
   TESTS/owner-files-2026-08-27-trials.js §C on Ahmed's real
   "شيت مناسيب.xlsx" file): the first draft of this condition required
   EVERY cell, with no exceptions, to be non-blank. That real file's first
   row is ["1","135",""] — the third (remarks) column is blank, so the old
   condition failed and the user was never asked anything — the exact same
   bug returning word for word despite this file existing. Fixed here
   before any upload.

   We wrap DataImport.preview (exactly as import-mapping-plus.js does).
   The trigger: every NON-BLANK cell in rows[0] is an explicit number
   (blank cells are ignored, not held against it — an empty remarks
   column does not mean the row is a header), at least one cell is
   genuinely numeric, and rows.length > 1. We never guess — we ask with a
   dialog, defaulting to "data" (the safer choice: keeping the row rather
   than dropping it). If the user picks "data" we build a synthetic header
   row ("Column 1", "Column 2"…) and call the original function (the one
   from before this file) with the corrected rows, so the first row is
   treated as real data instead of being lost. Picking "headers" calls the
   original unchanged — today's exact behaviour.

   إعادة الربط اليدوي («⇄ تعديل ربط الأعمدة») و«متابعة ←» داخل import.js
   يُغلقان على متغيّر rows نفسه الذي مرَّرناه — فالتصحيح هنا يبقى سارياً
   طوال جلسة الاستيراد الواحدة كلها، لا فقط في المعاينة الأولى.

   The manual remap ("⇄ Change column matching") and its "Continue →"
   inside import.js close over the very same rows variable we passed in
   — so the correction here stays in effect for the whole import session,
   not only the first preview.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and DataImport.preview
   returns to reading rows[0] as headers unconditionally, exactly as
   before — import.js and import-mapping-plus.js are untouched.

   يُحمَّل بعد import-mapping-plus.js — فيصبح لفّنا الأخارجي، ونستدعي
   الدالة التي لفّتها هي بدورها، فتمرّ كل الإضافات (الذاكرة، العلامات)
   كما هي.
   Load after import-mapping-plus.js — our wrap becomes the outermost, and
   we call the function it wrapped in turn, so every one of its additions
   (memory, markers) still runs exactly as it does today.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }

  /* الخلايا الفارغة تُتجاهَل (لا تُسقط الصف ولا تُثبته) — عمود ملاحظات
     فارغ شائع جداً في ملفات حقيقية، وما زال الصف صفَّ بيانات رقمية. يجب
     أن تكون كل خلية غير فارغة رقماً صريحاً، وأن توجد خلية رقمية واحدة على
     الأقل (صف فارغ بالكامل ليس «بيانات رقمية» بأي معنى).
     Blank cells are ignored (neither disqualify nor qualify the row) — an
     empty remarks column is common in real files and the row is still a
     numeric data row. Every non-blank cell must be an explicit number, and
     at least one cell must genuinely be numeric (an entirely blank row is
     not "numeric data" in any meaningful sense). */
  function looksAllNumeric(row) {
    if (!Array.isArray(row) || !row.length) return false;
    var sawNumber = false;
    for (var i = 0; i < row.length; i++) {
      var cell = row[i];
      if (cell === undefined || cell === null) continue;
      var s = String(cell).trim();
      if (s === '') continue;
      if (isNaN(Number(s))) return false;
      sawNumber = true;
    }
    return sawNumber;
  }

  function syntheticHeaders(width) {
    var out = [];
    for (var i = 0; i < width; i++) {
      out.push(isAr() ? ('عمود ' + (global.I18N ? I18N.num(i + 1, 0) : (i + 1)))
                       : ('Column ' + (i + 1)));
    }
    return out;
  }

  function ask(moduleId, rows, manualCols, origPreview, callContext) {
    if (!global.UI || !UI.modal) { origPreview.apply(callContext, [moduleId, rows, manualCols]); return; }
    UI.modal({
      title: L({ ar: 'الصف الأول أرقام فقط', en: 'The first row is all numbers' }),
      body: '<p>' + esc(L({
        ar: 'الصف الأول في ملفك لا يحتوي إلا أرقاماً. هل هذا صف عناوين الأعمدة، ' +
            'أم بيانات فعلية سنفقدها إن عاملناه كعنوان؟',
        en: 'The first row in your file is nothing but numbers. Is this the column ' +
            'headers, or real data we would lose by treating it as a header?' })) + '</p>',
      buttons: [
        {
          label: L({ ar: 'عناوين (كالمعتاد)', en: 'Headers (as usual)' }), cls: 'btn-outline',
          onClick: function () { origPreview.apply(callContext, [moduleId, rows, manualCols]); }
        },
        {
          label: L({ ar: 'بيانات — احتفظ بالصف', en: 'Data — keep the row' }), cls: 'btn-primary',
          onClick: function () {
            var width = (rows[0] || []).length;
            var corrected = [syntheticHeaders(width)].concat(rows);
            origPreview.apply(callContext, [moduleId, corrected, manualCols]);
          }
        }
      ]
    });
  }

  function wrapPreview() {
    if (!global.DataImport || DataImport.__headerlessWrapped) return;
    var origPreview = DataImport.preview;
    if (typeof origPreview !== 'function') return;

    DataImport.preview = function (moduleId, rows, manualCols) {
      try {
        if (Array.isArray(rows) && rows.length > 1 && looksAllNumeric(rows[0])) {
          ask(moduleId, rows, manualCols, origPreview, this);
          return;
        }
      } catch (e) { console.warn('[import-headerless] detection failed, falling through', e); }
      return origPreview.apply(this, arguments);
    };
    DataImport.__headerlessWrapped = true;
  }

  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapPreview, ms); });
  document.addEventListener('DOMContentLoaded', wrapPreview);
  wrapPreview();

  global.ImportHeaderless = { looksAllNumeric: looksAllNumeric };
})(window);
