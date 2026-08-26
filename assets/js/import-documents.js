/* =========================================================================
   import-documents.js — استيراد PDF ووورد وإكسل وأوتوكاد من زر واحد
                          Import PDF, Word, Excel and AutoCAD from ONE button
   -------------------------------------------------------------------------
   طلب محمد زيدان الليلة، بالنص:
   «i want it to read pdf, word, excel, dwg. and be able to template them to
   the website so put ofc some pdf is drawing and sme are words so make it
   notice the difference automatically»

   اليوم: زر «⬆ استيراد» في import.js يقبل الإكسل فقط، ويرفض PDF ووورد
   وأوتوكاد برسالة طويلة. هذا هو العطل المطلوب إصلاحه — لا صيغة جديدة تُخترع،
   الرفض نفسه هو الخطأ.

   Today the «⬆ Import» button in import.js accepts spreadsheets only and
   refuses PDF, Word and AutoCAD with a wall of text. That refusal is the
   bug. Nothing new is invented — the refusal itself is what breaks.

   -------------------------------------------------------------------------
   لماذا لا نلفّ DataImport.pick · WHY WE DO NOT WRAP DataImport.pick

   import.js:909 يربط الزر بـ pick المحلية داخل الإغلاق (closure)، لا بالنسخة
   المُصدَّرة DataImport.pick. استبدال DataImport.pick لا يغيّر شيئاً — الزر
   لا يناديها إطلاقاً. هذا بالضبط عطل trade/trades الذي كلّف ست ساعات: كود
   يمرّ ولا شيء يتحرّك على الشاشة.

   الحل: بعد أن يُنشئ import.js الزر (ولا يعيد إنشاءه ما دام موجوداً —
   import.js:890)، نستبدل onclick الخاص بالزر نفسه — لا الدالة المصدَّرة.
   نراقب #content بنفس أسلوب import.js:1003-1010 بالضبط، ونعلّم الزر بسمة
   data-az-docs حتى لا نربطه مرتين.

   import.js:909 binds the button to its OWN closure-local `pick`, never to
   the exported `DataImport.pick`. Replacing DataImport.pick changes nothing
   — the button never calls it. This is the exact trade/trades failure that
   cost six hours: code that passes every test while the screen never moves.

   Fix: after import.js creates the button (and it never recreates one that
   already exists — import.js:890), we overwrite THAT button's own onclick —
   not the exported function. We watch #content the same way import.js:
   1003-1010 does, and mark the button data-az-docs so we never rebind twice.

   -------------------------------------------------------------------------
   المسار الأول — جداول البيانات · PATH ONE — SPREADSHEETS

   xlsx/xlsm/csv/tsv/txt تسلك بالضبط طريق اليوم: DataImport.readXLSX أو
   DataImport.parseCSV ثم DataImport.preview — وهي الدوال المُصدَّرة نفسها
   (import.js:1012-1016)، فتبقى معاينة الأخطاء والتحذيرات والموافقة اليدوية
   كما هي حرفياً. ‎.xls‎ القديمة تحمل رسالة import.js:949-953 حرفياً — لا شيء
   جديد يُقرأ فعلياً، فقط لا يزال يُرفض بوضوح.

   xlsx/xlsm/csv/tsv/txt take exactly today's path: DataImport.readXLSX or
   DataImport.parseCSV then DataImport.preview — the same exported functions
   (import.js:1012-1016), so the error/warning preview and manual approval
   step are byte-for-byte unchanged. The old .xls carries import.js:949-953's
   message verbatim — nothing new is actually read, it is still refused
   plainly.

   -------------------------------------------------------------------------
   المسار الثاني — المستندات · PATH TWO — DOCUMENTS

   pdf / docx / doc / dwg / dxf / صور: تُصبح سجلاً حقيقياً على الشاشة، مع
   الملف نفسه مرفقاً به. الخطوات: تأكيد بلا اتصال؟ → نافذة توضح ما سيحدث
   (بلا أي إشارة لـ«لوحة المرفقات» — محمد زيدان لم يرها قط ولن نرسله إليها)
   → EntityPage.openForm لسجل جديد → التقاط الحفظ بلفّ Store.create مؤقتاً
   → تأكيد وصول السجل من الخادم بمعرّفه (Store.create يعود قبل ردّ الخادم —
   نفس درس HISTORY رقم ٧) → Attachments.upload → فتح القارئ الجاهز
   AttachmentReader.openReader كما هو، بلا تكرار لواجهته.

   pdf / docx / doc / dwg / dxf / images become a real record on the screen,
   with the file itself attached. Steps: refuse early if offline → a modal
   explaining what will happen (never mentioning the "Attachments panel" —
   Mohamed Zidan has never seen it and is never sent there) → EntityPage.
   openForm for a new record → capture the save by temporarily wrapping
   Store.create → confirm the record reached the server by id (Store.create
   returns before the server answers — the same HISTORY entry 7 lesson) →
   Attachments.upload → open the existing AttachmentReader.openReader as-is,
   never duplicating its overlay.

   -------------------------------------------------------------------------
   ⚠️ بق حقيقي أصلحه هذا الملف عند الإرفاق · A REAL BUG FIXED HERE ON ATTACH

   attachments.js:164 يكتب موقع مَن رفع الملف لا موقع المستند نفسه:
   `site: siteId || (u && u.site) || null`. المُنادي الوحيد اليوم
   (attachments.js:349) لا يمرّر siteId إطلاقاً. فموظف بالمكتب يرفق ملفاً
   على مستند تابع لموقع الروبيكي → يُكتب site=المكتب → az_can_site(site) في
   10-ATTACHMENTS.sql:53-55 يرفض الصف لأ. أحمد عبد الحي في الروبيكي، فيختفي
   الملف عن صاحب المستند بلا أي خطأ ظاهر. أو الأسوأ: رافع بلا site يكتب
   site=null، وaz_can_site(null) صحيح للجميع (08-SITES.sql:140) — تسريب لا
   قفل. هذا شكل AUDIT-23: رأيان صادقان يتعارضان.

   الإصلاح هنا: نمرّر موقع *السجل المؤكَّد من الخادم* (لا Auth.current())
   في الوسيط الرابع لـ Attachments.upload. لا نلمس attachments.js — لفّ
   Attachments.upload لن يصلح اللوحة القائمة أصلاً، لأن wirePanel تنادي
   upload المحلية داخل الإغلاق، نفس مصيدة pick بالضبط؛ عطل اللوحة نفسها
   يُعالَج في مكان آخر. عملنا هنا فقط أن يكتب المسار الجديد الموقع الصحيح.

   attachments.js:164 writes the UPLOADER's site, not the DOCUMENT's:
   `site: siteId || (u && u.site) || null`. The only existing caller
   (attachments.js:349) never passes siteId. So someone at المكتب attaching
   to a الروبيكي record writes site=المكتب → az_can_site() in
   10-ATTACHMENTS.sql:53-55 refuses the row for أ. أحمد عبد الحي at
   الروبيكي — the file vanishes for the very person the document belongs
   to, with no visible error. Or worse: a site-less uploader writes
   site=null, and az_can_site(null) is true for everyone (08-SITES.sql:140)
   — a leak, not a lockout. This is the AUDIT-23 shape: two truthful views
   that disagree.

   Fix here: pass the CONFIRMED server record's own site (never
   Auth.current()) as Attachments.upload's fourth argument. attachments.js
   itself is not touched — wrapping Attachments.upload would not fix the
   existing panel anyway, since wirePanel calls the closure-local upload,
   the exact same trap as pick. That panel's own bug is handled separately.
   This file's only job is that the NEW path writes the correct site.

   -------------------------------------------------------------------------
   🔴 تمييز الرسمة عن المستند تلقائياً · AUTOMATIC DRAWING-vs-DOCUMENT

   كل ملفات PDF ‎.pdf‎، لكن ليست كلها نفس الشيء — محمد زيدان محق. نستخدم ثلاث
   إشارات حقيقية معاً: حجم الصفحة الفعلي بالنقاط (page.getViewport({scale:1}))،
   كثافة النص لكل صفحة، وعدد الصفحات. كل عتبة رقم مُسمّى ومُعلَّق أدناه.
   عند تعارض الإشارات لا نخمّن: نُرجع 'unsure' ونعرض الصورة والنص معاً بوضوح.

   Every such file is .pdf, but they are not the same thing — he is right.
   Three real signals combine: true page size in points
   (page.getViewport({scale:1})), text density per page, and page count.
   Every threshold below is a named constant with its own comment. When the
   signals disagree we never guess: we return 'unsure' and show the picture
   and the text together, plainly.

   read-pdf.js نفسه لا يُعدَّل — دالة التصنيف هنا مستقلة تماماً، وقابلة
   للاختبار في Node بلا DOM (بيانات عادية داخل، نتيجة نصّية خارج).
   read-pdf.js itself is not touched — the classifier here is fully
   independent and testable in Node with no DOM (plain data in, a plain
   string out).

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file:
     · يعود زر «استيراد» يقبل الإكسل فقط ويرفض الباقي كما كان بالضبط.
     · Store.create يعود لسلوكه بلا أي التقاط.
     · The Import button goes back to spreadsheets-only, exactly as before.
     · Store.create returns to its original behaviour, no capture at all.

   يُحمَّل مباشرة بعد import.js — يحتاج DataImport، Attachments،
   AttachmentReader، EntityPage، Schema، Store، UI، Auth، وكلها مُحمَّلة قبله.
   Loads immediately after import.js — needs DataImport, Attachments,
   AttachmentReader, EntityPage, Schema, Store, UI and Auth, all already
   loaded by this point.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function lab(o) { return global.L ? global.L(o) : (isAr() ? o.ar : o.en); }

  function extOf(name) {
    var i = String(name || '').lastIndexOf('.');
    return i === -1 ? '' : String(name).slice(i + 1).toLowerCase();
  }

  /* صيغ جداول البيانات اليوم — من import.js:928، بلا xls (مرفوضة عمداً) */
  var SPREADSHEET_EXT = ['xlsx', 'xlsm', 'csv', 'tsv', 'txt'];

  /* ═══════════════════════════════════════════════════════════════════
     ١ · تمييز الرسمة عن المستند — دالة نقية، بلا DOM إطلاقاً
        THE CLASSIFIER — a pure function, no DOM at all
     ═══════════════════════════════════════════════════════════════════ */

  /* A4 نقطة×نقطة (٧٢ نقطة للبوصة) — المرجع لتطبيع كثافة النص عبر أحجام
     صفحات مختلفة. A4 in points (72 per inch) — the reference used to
     normalise text density across different page sizes. */
  var A4_WIDTH_PT  = 595;
  var A4_HEIGHT_PT = 842;
  var A4_AREA_PT2  = A4_WIDTH_PT * A4_HEIGHT_PT; /* 500,990 */

  /* أطول ضلع بالنقاط يُعتبر «حجماً كبيراً». A4 أطول ضلع = ٨٤٢، A3 = ١١٩١.
     العتبة بينهما، فA3 وأكبر تُحسب رسمة الحجم، وA4 وأصغر لا.
     The longest side in points counted as "large format". A4's longest
     side is 842, A3's is 1191. The threshold sits between them, so A3 and
     up count as drawing-sized, A4 and below do not. */
  var LARGE_FORMAT_MIN_PT = 1000;

  /* حصة الصفحات المُختبَرة التي يجب أن تكون كبيرة الحجم لنعتبر الملف كله كذلك */
  var LARGE_FORMAT_MAJORITY = 0.5;

  /* عدد أحرف مُطبَّع لمساحة A4 مكافئة. أقل من هذا = نص شحيح (خانة عنوان
     رسمة، لا فقرة). Characters normalised to an A4-equivalent area. Below
     this is sparse text (a drawing's title block, not a paragraph). */
  var DRAWING_TEXT_MAX = 80;

  /* أعلى من هذا = نص كثيف (خطاب أو عقد حقيقي). Above this is dense text
     (a real letter or contract page). */
  var DOCUMENT_TEXT_MIN = 400;

  /* الرسمة عادة صفحة أو اثنتان؛ الخطاب أو العقد غالباً أكثر */
  var DRAWING_MAX_PAGES = 2;

  /* كم صفحة نفحص فعلياً لجمع الإشارات — لا كل الملف، توفيراً للوقت */
  var CLASSIFY_SAMPLE_PAGES = 3;

  /* أقل عدد أصوات متفقة لنحسم القرار؛ أقل من هذا = 'unsure' ولا تخمين */
  var CLASSIFY_MIN_VOTES = 2;

  /* info = { pageCount: عدد كل صفحات الملف, pages: [{ widthPt, heightPt, charCount }, ...] }
     لعيّنة الصفحات فقط. يُرجع واحدة من: document · drawing · scan · unsure. */
  function classifyPdf(info) {
    if (!info || !Array.isArray(info.pages) || !info.pages.length) return 'unsure';

    var n = info.pages.length;
    var totalChars = 0, largeFormatVotes = 0, normSum = 0;

    info.pages.forEach(function (p) {
      var w = Number(p && p.widthPt) || 0;
      var h = Number(p && p.heightPt) || 0;
      var chars = Number(p && p.charCount) || 0;
      totalChars += chars;
      if (Math.max(w, h) >= LARGE_FORMAT_MIN_PT) largeFormatVotes++;
      var area = w * h;
      normSum += area > 0 ? chars * (A4_AREA_PT2 / area) : 0;
    });

    /* لا نص إطلاقاً في العيّنة كلها = ورق ممسوح ضوئياً، لا مستند ولا رسمة.
       No text anywhere in the sample = scanned paper, neither a document
       nor a drawing. */
    if (totalChars === 0) return 'scan';

    var avgNorm = normSum / n;
    var largeFormatFraction = largeFormatVotes / n;
    var pageCount = Number(info.pageCount) || n;

    var looksLargeFormat = largeFormatFraction >= LARGE_FORMAT_MAJORITY;
    var looksTextSparse  = avgNorm < DRAWING_TEXT_MAX;
    var looksTextDense    = avgNorm >= DOCUMENT_TEXT_MIN;
    var looksFewPages    = pageCount <= DRAWING_MAX_PAGES;

    /* ثلاث إشارات، كل واحدة تصوّت. الحجم وعدد الصفحات يصوّتان دائماً
       لأحد الجانبين؛ كثافة النص قد تمتنع (منطقة رمادية بين العتبتين).
       عند عدم اتفاق صوتين على الأقل على نفس الجانب: 'unsure'.
       Three signals, each a vote. Format and page count always vote one
       side; text density can abstain (the grey zone between the two
       thresholds). Without at least two votes agreeing on one side: 'unsure'. */
    var votesDrawing = 0, votesDocument = 0;
    if (looksLargeFormat) votesDrawing++; else votesDocument++;
    if (looksFewPages) votesDrawing++; else votesDocument++;
    if (looksTextSparse) votesDrawing++;
    if (looksTextDense) votesDocument++;

    if (votesDrawing >= CLASSIFY_MIN_VOTES && votesDrawing > votesDocument) return 'drawing';
    if (votesDocument >= CLASSIFY_MIN_VOTES && votesDocument > votesDrawing) return 'document';
    return 'unsure';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · تحليل PDF فعلياً في المتصفح — يستقل تماماً عن read-pdf.js
        REAL BROWSER ANALYSIS — fully independent of read-pdf.js
     -------------------------------------------------------------------
     read-pdf.js لا يُصدِّر حجم الصفحة الحقيقي بالنقاط (فقط أبعاد اللوحة
     بالبكسل بعد تحجيم إلى عرض ثابت ٩٠٠ — ما يُلغي أي فرق حجم مطلق بين
     A4 وA3). نحتاج page.getViewport({scale:1}) نفسها، فنُحمِّل pdf.js هنا
     باستقلال، بنفس مسار المكتبة الذي يُصدِّره read-pdf.js (ReadPdf.VENDOR)
     حتى لا نُعيد كتابة اسم مجلد الإصدار يدوياً في مكانين.
     read-pdf.js does not export true page size in points (only canvas
     pixel dimensions scaled to a fixed 900 width — which erases any
     absolute size difference between A4 and A3). We need
     page.getViewport({scale:1}) itself, so we load pdf.js independently
     here, from the SAME library path read-pdf.js already exports
     (ReadPdf.VENDOR), so the vendor version folder name is never hand-typed
     in two places. */
  var pdfjsLoading = null;

  function pdfjsPaths() {
    var lib = (global.ReadPdf && ReadPdf.VENDOR) || 'assets/vendor/pdfjs-6.2.108/pdf.min.js';
    return {
      lib: lib,
      worker: lib.replace(/pdf\.min\.js$/, 'pdf.worker.min.js'),
      wasm: lib.replace(/pdf\.min\.js$/, 'wasm/'),
      fonts: lib.replace(/pdf\.min\.js$/, 'standard_fonts/')
    };
  }

  /* نسخة طبق الأصل من read-pdf.js:69-77 — غير مُصدَّرة هناك، فلا طريق لإعادة
     استعمالها إلا بنسخها، بنفس نمط النسخ الذي طلبته الخطة نفسها لـ
     currentFromBreadcrumb أدناه. Verbatim copy of read-pdf.js:69-77 — not
     exported there, so copying is the only way to reuse it, the exact same
     copy-pattern the plan itself asks for on currentFromBreadcrumb below. */
  function absolute(rel) {
    var base = location.pathname.replace(/\/[^\/]*$/, '/');
    var root = base.indexOf('/alzahraa-portal/') !== -1
      ? base.slice(0, base.indexOf('/alzahraa-portal/') + '/alzahraa-portal/'.length)
      : base;
    return new URL(rel, location.origin + root).href;
  }

  function ensurePdfjs() {
    if (pdfjsLoading) return pdfjsLoading;
    var p = pdfjsPaths();
    pdfjsLoading = import(absolute(p.lib)).then(function (mod) {
      var pdfjs = mod && (mod.getDocument ? mod : mod.default);
      if (!pdfjs || !pdfjs.getDocument) throw new Error('pdf.js loaded but did not expose getDocument');
      pdfjs.GlobalWorkerOptions.workerSrc = absolute(p.worker);
      return pdfjs;
    }).catch(function (e) {
      pdfjsLoading = null;
      throw e;
    });
    return pdfjsLoading;
  }

  /* نسخة طبق الأصل من read-pdf.js:101-109 — لنفس السبب: أجهزة أندرويد
     القديمة لا تملك blob.arrayBuffer(). Verbatim copy of read-pdf.js:
     101-109, same reason: old Android phones lack blob.arrayBuffer(). */
  function bytesOf(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('could not read the file from disk')); };
      r.readAsArrayBuffer(blob);
    });
  }

  /* معاينة سريعة لصفحة واحدة فقط — أصغر من معاينة read-pdf.js الكاملة
     (٩٠٠) لأن هذه مجرّد نافذة تأكيد قبل الحفظ، لا القارئ الكامل الذي يُفتح
     بعد الإرفاق عبر AttachmentReader.openReader. A quick single-page
     preview only — smaller than read-pdf.js's full 900, because this is
     only the confirm-before-save window, not the full reader opened after
     attaching via AttachmentReader.openReader. */
  var PREVIEW_WIDTH = 480;

  function renderPageImage(page) {
    var vp0 = page.getViewport({ scale: 1 });
    var scale = Math.min(PREVIEW_WIDTH / vp0.width, 2);
    var vp = page.getViewport({ scale: scale });
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    var ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
      try { return canvas.toDataURL('image/jpeg', 0.72); } catch (e) { return null; }
    }).catch(function () { return null; });
  }

  /* يُرجع { kind, pageCount, page1: { image, text } } */
  function analyzePdf(file) {
    var p = pdfjsPaths();
    return ensurePdfjs().then(function (pdfjs) {
      return bytesOf(file).then(function (buf) {
        return pdfjs.getDocument({
          data: new Uint8Array(buf),
          useWasm: false,
          wasmUrl: absolute(p.wasm),
          standardFontDataUrl: absolute(p.fonts),
          isEvalSupported: false,
          disableNormalization: false
        }).promise;
      });
    }).then(function (doc) {
      var pageCount = doc.numPages;
      var sampleN = Math.min(pageCount, CLASSIFY_SAMPLE_PAGES);
      var pages = [];
      var page1Image = null, page1Text = '';
      var chain = Promise.resolve();

      var _loop = function (n) {
        chain = chain.then(function () {
          return doc.getPage(n).then(function (page) {
            var vp0 = page.getViewport({ scale: 1 });
            return page.getTextContent().then(function (tc) {
              var raw = (tc.items || []).map(function (it) {
                return it.str + (it.hasEOL ? '\n' : '');
              }).join('');
              pages.push({ widthPt: vp0.width, heightPt: vp0.height,
                           charCount: raw.replace(/\s/g, '').length });
              if (n === 1) {
                page1Text = raw;
                return renderPageImage(page).then(function (url) { page1Image = url; });
              }
            });
          });
        });
      };
      for (var i = 1; i <= sampleN; i++) _loop(i);

      return chain.then(function () {
        try { doc.destroy(); } catch (e) {}
        var kind = classifyPdf({ pageCount: pageCount, pages: pages });
        var repaired = page1Text;
        if (global.ArabicText) {
          try { repaired = ArabicText.repair(page1Text).text; } catch (e) {}
        }
        return { kind: kind, pageCount: pageCount, page1: { image: page1Image, text: repaired } };
      });
    });
  }

  /* نص المعاينة داخل نافذة التأكيد — قبل الحفظ، وليس القارئ الكامل.
     تخطيط مختلف حسب النوع، وأمانة كاملة عند عدم اليقين.
     The preview text inside the confirm modal — before saving, not the
     full reader. Different layout per kind, and honest about not knowing. */
  function pdfPreviewHTML(analysis) {
    if (!analysis) {
      return '<p class="muted small">' + esc(L({
        ar: 'تعذّر تحليل الملف تلقائياً. سيُحفظ عادياً وتُفتح قراءته الكاملة بعد الحفظ.',
        en: 'Could not analyze the file automatically. It will save normally and open fully after saving.' })) + '</p>';
    }
    var kind = analysis.kind;
    var img = analysis.page1 && analysis.page1.image;
    var txt = ((analysis.page1 && analysis.page1.text) || '').trim();

    var verdict =
      kind === 'drawing' ? L({
        ar: 'هذا الملف يبدو رسمة هندسية — ورقة كبيرة ونص قليل (خانة عنوان لا فقرة). الصورة أهم من النص هنا.',
        en: 'This looks like an engineering drawing — a large sheet with little text (a title block, not a paragraph). The picture matters more than the text here.' })
      : kind === 'document' ? L({
        ar: 'هذا الملف يبدو مستنداً نصياً — حجم صفحة ونص عاديان. النص أهم من الصورة هنا.',
        en: 'This looks like a text document — ordinary page size and text. The text matters more than the picture here.' })
      : kind === 'scan' ? L({
        ar: 'هذا الملف صور ممسوحة ضوئياً ولا يحتوي نصاً يمكن استخراجه إطلاقاً. صورة الصفحة أدناه فقط.',
        en: 'This file is scanned images and holds no extractable text at all. Only the page picture is shown below.' })
      : L({
        ar: 'تعذّر التأكد هل هذا مستند أم رسمة — الإشارات متعارضة. الصورة والنص معروضان معاً بلا تفضيل.',
        en: 'Could not tell whether this is a document or a drawing — the signals disagree. The picture and the text are both shown, with no preference.' });

    var imgHTML = img
      ? '<img src="' + esc(img) + '" alt="" style="max-width:100%;border:1px solid #ddd;border-radius:6px">'
      : '<p class="muted small">' + esc(L({ ar: 'تعذّر رسم الصفحة.', en: 'Could not render the page.' })) + '</p>';
    var textHTML = txt
      ? '<div dir="auto" style="white-space:pre-wrap;line-height:1.9;max-height:180px;overflow:auto;font-size:13px">' +
        esc(txt.slice(0, 600)) + (txt.length > 600 ? '…' : '') + '</div>'
      : '<p class="muted small">' + esc(L({ ar: 'لا يوجد نص.', en: 'No text.' })) + '</p>';

    var layout;
    if (kind === 'drawing') {
      /* صورة كبيرة، نص جانبي صغير — «هي خانة عنوان لا محتوى» */
      layout = '<div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;align-items:start">' +
               imgHTML + textHTML + '</div>';
    } else if (kind === 'document') {
      /* النص أولاً وبروزاً، الصورة بجانبه */
      layout = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">' +
               textHTML + imgHTML + '</div>';
    } else if (kind === 'scan') {
      layout = imgHTML;
    } else {
      /* unsure: الاثنان بوزن متساوٍ */
      layout = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">' +
               textHTML + imgHTML + '</div>';
    }

    return '<div class="alert alert-info" style="margin-bottom:10px;line-height:1.8">' + esc(verdict) + '</div>' + layout;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · المسار الأول — جداول البيانات، بلا أي تغيير في السلوك
     ═══════════════════════════════════════════════════════════════════ */
  function handleSpreadsheet(moduleId, file, ext) {
    function done(rows) {
      if (!rows || rows.length < 2) {
        UI.toast(L({ ar: 'الملف فارغ أو به صف عناوين فقط.',
                     en: 'The file is empty or has only a header row.' }), 'error');
        return;
      }
      DataImport.preview(moduleId, rows);
    }
    function fail(msgAr, msgEn) {
      UI.toast(L({ ar: msgAr, en: msgEn }), 'error', 9000);
    }

    if (ext === 'xls') {
      /* نص import.js:949-953 حرفياً — رسالة كانت تعمل، لا تُغيَّر.
         Verbatim text of import.js:949-953 — an already-working message,
         left unchanged. */
      return fail('صيغة .xls القديمة (إكسل ٢٠٠٣) لا تُقرأ. افتح الملف في إكسل ثم: ' +
                  'ملف ← حفظ باسم ← Excel Workbook (.xlsx) وأعد المحاولة.',
                  'The old .xls format cannot be read. Open it in Excel, then ' +
                  'File → Save As → Excel Workbook (.xlsx), and try again.');
    }

    if (ext === 'xlsx' || ext === 'xlsm') {
      var rx = new FileReader();
      rx.onerror = function () { fail('تعذّرت قراءة الملف من القرص.', 'Could not read the file from disk.'); };
      rx.onload = function () {
        DataImport.readXLSX(rx.result).then(done).catch(function (e) {
          console.error('[import-documents] xlsx', e);
          fail('تعذّرت قراءة ملف الإكسل: ' + (e && e.message ? e.message : '') +
               ' — جرّب: ملف ← حفظ باسم ← CSV UTF-8.',
               'Could not read the Excel file: ' + (e && e.message ? e.message : '') +
               ' — try File → Save As → CSV UTF-8.');
        });
      };
      return rx.readAsArrayBuffer(file);
    }

    /* csv / tsv / txt */
    var reader = new FileReader();
    reader.onerror = function () { fail('تعذّرت قراءة الملف من القرص.', 'Could not read the file from disk.'); };
    reader.onload = function () {
      try { done(DataImport.parseCSV(String(reader.result || ''))); }
      catch (e) {
        console.error('[import-documents]', e);
        fail('تعذّرت قراءة الملف.', 'Could not read the file.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · التقاط الحفظ — لفّ Store.create مؤقتاً، مُسلَّح بين التأكيد وإغلاق النافذة
        CAPTURING THE SAVE — a temporary Store.create wrap, armed only
        between confirm and form close
     -------------------------------------------------------------------
     نتجنّب Promise.then() عمداً لالتقاط الصف: هو غير متزامن، وسباقه مع
     مراقب إغلاق النافذة (الذي يتفاعل مع تغيّر hidden فور نداء
     UI.closeModal() داخل commit()) غير مضمون الترتيب. بدلاً من ذلك نستدعي
     رد نداء عادياً بالتزامن من داخل لفّة Store.create نفسها — قبل أن يكمل
     commit() ويُغلق النافذة، فلا يوجد سباق إطلاقاً.
     A Promise.then() is deliberately avoided to capture the row: it is
     asynchronous, and racing it against the modal-close watcher (which
     reacts the instant commit() calls UI.closeModal()) has no guaranteed
     order. Instead a plain callback is invoked synchronously from inside
     the Store.create wrap itself — before commit() finishes and closes the
     modal — so there is no race at all.
     ═══════════════════════════════════════════════════════════════════ */
  var armed = false, armedTable = null, armedCallback = null;

  function installCreateGuard() {
    if (!global.Store || Store.__importDocsGuard) return;
    Store.__importDocsGuard = true;
    var origCreate = Store.create;
    Store.create = function (table, data, opts) {
      var row = origCreate.apply(Store, arguments);
      if (armed && table === armedTable && row && row.id) {
        var cb = armedCallback;
        armed = false; armedTable = null; armedCallback = null;
        if (cb) cb(row);
      }
      return row;
    };
    console.info('import-documents.js ready — Store.create capture armed only while a document import form is open.');
  }

  /* راقب إغلاق #modalHost. لو أُغلقت النافذة وما زلنا مُسلَّحين (لم يُحفظ
     شيء بعد) فهذا إلغاء — لا نجاح. لو سبق والتُقط الصف، armed أصبحت false
     فعلياً بالتزامن قبل هذا الحدث، فلا شيء يحدث هنا (لا رسالة إلغاء مزدوجة).
     Watches #modalHost closing. If the modal closes while still armed
     (nothing captured yet), that is a cancellation, not a success. If the
     row was already captured, `armed` was already synchronously set false
     before this event, so nothing happens here (no duplicate cancel toast). */
  function watchModalClose(onClosedWithoutSave) {
    var host = document.getElementById('modalHost');
    if (!host) return function () {};
    var mo = new MutationObserver(function () {
      if (host.hidden) { mo.disconnect(); onClosedWithoutSave(); }
    });
    mo.observe(host, { attributes: true, attributeFilter: ['hidden'] });
    return function stop() { mo.disconnect(); };
  }

  function disarmAsCancelled() {
    if (!armed) return;   /* الحفظ سبق أن حدث — هذا ليس إلغاءً */
    armed = false; armedTable = null; armedCallback = null;
    UI.toast(L({ ar: 'أُلغي — لم يُحفظ سجل ولم يُرفق الملف.',
                 en: 'Cancelled — no record was saved and the file was not attached.' }), 'info');
  }

  function injectBanner(fileName) {
    var body = document.getElementById('modalBody');
    if (!body || document.getElementById('azDocBanner')) return;
    var div = document.createElement('div');
    div.id = 'azDocBanner';
    div.className = 'alert alert-info';
    div.style.marginBottom = '10px';
    div.textContent = L({
      ar: '📎 سيُرفق هذا الملف تلقائياً بعد الحفظ: ' + fileName,
      en: '📎 This file will be attached automatically after saving: ' + fileName });
    body.insertBefore(div, body.firstChild);
  }

  function openFormAndCapture(moduleId, file) {
    var mod = global.Schema && Schema.get(moduleId);
    if (!mod) return;

    var stopWatching = watchModalClose(disarmAsCancelled);

    armedTable = mod.table;
    armed = true;
    armedCallback = function (row) {
      stopWatching();
      proceedToAttach(moduleId, mod, row, file);
    };

    EntityPage.openForm(moduleId, null);
    setTimeout(function () { injectBanner(file.name); }, 120);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · تأكيد وصول السجل من الخادم بمعرّفه، قبل أي إرفاق
        CONFIRM THE RECORD REACHED THE SERVER BY ID, BEFORE ATTACHING
     -------------------------------------------------------------------
     شكل الاستعلام هنا مطابق لِـ attachment-reader.js:403-410 — سؤال مباشر
     عن الصف بمعرّفه. أما التوقيت (انتظار قبل السؤال، ثم محاولة أخيرة بعد
     مهلة أطول) فمنقول من save-guard.js/doc-numbering.js بدلاً من ذلك،
     لأن Store.create هنا لا يعرف الخادم أصلاً — على عكس attachment-reader.js
     الذي يكتب مباشرة عبر Supabase وينتظر ردّها قبل أن يسأل. سؤال فوري هنا
     كان سيفشل في كل مرة.
     The QUERY SHAPE matches attachment-reader.js:403-410 — a direct
     select-by-id. The TIMING (a wait before asking, then one later retry)
     is taken from save-guard.js/doc-numbering.js instead, because
     Store.create here never awaits the server at all — unlike
     attachment-reader.js, which writes directly through Supabase and
     already has the reply before it asks. Asking immediately here would
     fail every single time.
     ═══════════════════════════════════════════════════════════════════ */
  var CONFIRM_WAIT_MS  = 2500;
  var CONFIRM_RETRY_MS = 4000;

  function confirmSavedOnServer(table, id) {
    return new Promise(function (resolve) {
      var client = global.Auth && Auth.client && Auth.client();
      if (!client) return resolve(null);
      setTimeout(function () {
        Promise.resolve(client.from(table).select('*').eq('id', id).maybeSingle())
          .then(function (res) {
            if (res && !res.error && res.data && res.data.id) return resolve(res.data);
            setTimeout(function () {
              Promise.resolve(client.from(table).select('*').eq('id', id).maybeSingle())
                .then(function (again) {
                  resolve((again && !again.error && again.data && again.data.id) ? again.data : null);
                }).catch(function () { resolve(null); });
            }, CONFIRM_RETRY_MS);
          }).catch(function () { resolve(null); });
      }, CONFIRM_WAIT_MS);
    });
  }

  async function proceedToAttach(moduleId, mod, row, file) {
    UI.toast(L({ ar: 'جارٍ التأكد من وصول السجل للخادم…',
                 en: 'Confirming the record reached the server…' }), 'info', 4000);

    var confirmed = await confirmSavedOnServer(mod.table, row.id);
    if (!confirmed) {
      UI.modal({
        title: L({ ar: '⛔ لم يُتأكَّد الحفظ بعد', en: '⛔ Save not yet confirmed' }),
        body: '<div class="alert alert-danger">' + esc(L({
          ar: 'السجل ظهر على شاشتك لكن لم نتأكّد من وصوله لقاعدة البيانات بعد الآن. لم يُرفق ' +
              'الملف «' + file.name + '» لهذا السبب. افتح السجل بعد قليل، ولو لم تجد الملف ' +
              'مرفقاً أضِفه وقتها مرة أخرى.',
          en: 'The record appeared on your screen, but we could not yet confirm it reached the ' +
              'database. The file "' + file.name + '" was NOT attached for that reason. Open the ' +
              'record again shortly, and if the file is not attached, add it again then.'
        })) + '</div>',
        buttons: [{ label: L({ ar: 'فهمت', en: 'Understood' }), cls: 'btn-primary' }]
      });
      return;
    }

    /* ⚠️ الإصلاح المطلوب — راجع الشرح الكامل أعلى الملف. نمرّر موقع
       *السجل المؤكَّد من الخادم*، لا Auth.current()، حتى لا يُكتب الملف
       بموقع مَن رفعه بدل موقع المستند الذي يخصّه — وهو بالضبط عطل
       attachments.js:164 الذي يُخفي المرفقات عن موقعها الحقيقي، أو
       يُسرّبها للجميع إن كان الرافع بلا موقع. لا تحذف هذا الوسيط الرابع
       ظنّاً أنه زائد — هو صلب الإصلاح.
       ⚠️ THE REQUIRED FIX — full explanation at the top of this file. We
       pass the CONFIRMED server record's own site, never Auth.current(),
       so the file is not written with the uploader's site instead of the
       document's — exactly the attachments.js:164 bug that hides
       attachments from their real site, or leaks them to everyone when the
       uploader has none. Do not remove this fourth argument thinking it is
       redundant — it is the core of the fix. */
    var siteForFile = confirmed.site;
    var up = await Attachments.upload(moduleId, row.id, file, siteForFile);

    if (!up.ok) {
      /* ⚠️ لم يُثبَت رفع مرفق ناجح في هذا الموقع من قبل — لا نقول «تم»
         إلا حين نراه، ونقول بوضوح تام إن لم يحدث.
         ⚠️ No attachment upload has been proven to succeed in this portal
         before. We do not say "done" until we see it, and we say plainly
         when it did not. */
      UI.modal({
        title: L({ ar: '⚠️ حُفظ السجل، ولم يُحفظ الملف', en: '⚠️ Record saved, file NOT kept' }),
        body: '<div class="alert alert-danger">' + esc(L({
          ar: 'السجل حُفظ بنجاح على الشاشة، لكن رفع الملف «' + file.name + '» فشل: ' + (up.error || ''),
          en: 'The record was saved successfully, but uploading the file "' + file.name +
              '" failed: ' + (up.error || '')
        })) + '</div>',
        buttons: [{ label: L({ ar: 'فهمت', en: 'Understood' }), cls: 'btn-primary' }]
      });
      return;
    }

    var reader = global.AttachmentReader && AttachmentReader.readerFor && AttachmentReader.readerFor(file.name);
    if (reader && AttachmentReader.openReader) {
      /* نستعمل القارئ الجاهز كما هو — بلا تكرار لواجهته إطلاقاً */
      AttachmentReader.openReader(up.record, moduleId, row.id, reader);
    } else {
      UI.toast(L({ ar: 'تم الحفظ وإرفاق الملف.', en: 'Saved, and the file was attached.' }), 'success');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · نافذة التأكيد قبل الحفظ — لا ذِكر إطلاقاً للوحة المرفقات
        THE CONFIRM MODAL — never mentions the Attachments panel
     ═══════════════════════════════════════════════════════════════════ */
  function offlineNow() {
    return navigator.onLine === false || (global.Store && Store.isOnline && !Store.isOnline());
  }

  function confirmAndCreate(moduleId, file, ext) {
    if (offlineNow()) {
      UI.toast(L({
        ar: 'إرفاق الملفات يحتاج اتصالاً بالإنترنت. أعد المحاولة بعد عودة الاتصال.',
        en: 'Attaching files needs internet. Try again once the connection returns.' }), 'error', 7000);
      return;
    }
    var mod = global.Schema && Schema.get(moduleId);
    if (!mod) return;

    var isPdf = ext === 'pdf';
    var explain = L({
      ar: 'سيُفتح نموذج سجل جديد على شاشة «' + lab(mod.label) + '». أكمل الحقول المطلوبة واضغط ' +
          'حفظ، وسيُرفق ملف «' + file.name + '» بالسجل تلقائياً بعد الحفظ — لا حاجة لأي خطوة أخرى.',
      en: 'A new record form on the "' + lab(mod.label) + '" screen will open. Fill in the required ' +
          'fields and press Save, and the file "' + file.name + '" will be attached to it ' +
          'automatically after saving — no other step is needed.'
    });

    var previewId = 'azDocConfirmPreview';
    UI.modal({
      title: L({ ar: 'استيراد مستند', en: 'Import a document' }),
      body: '<p style="line-height:1.9">' + esc(explain) + '</p>' +
        (isPdf ? '<div id="' + previewId + '">' + esc(L({
          ar: '…جارٍ فحص الملف', en: '…analyzing the file' })) + '</div>' : ''),
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        { label: L({ ar: 'متابعة ←', en: 'Continue →' }), cls: 'btn-primary',
          onClick: function () { setTimeout(function () { openFormAndCapture(moduleId, file); }, 60); } }
      ]
    });

    if (isPdf) {
      analyzePdf(file).then(function (analysis) {
        var el = document.getElementById(previewId);
        if (el) el.innerHTML = pdfPreviewHTML(analysis);
      }).catch(function (e) {
        console.error('[import-documents] pdf analysis failed', e);
        var el = document.getElementById(previewId);
        if (el) el.innerHTML = pdfPreviewHTML(null);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · اختيار الملف — قائمة القبول من مصدرين حيّين، لا نسخ يدوي
        FILE PICKING — the accept list read live, never hard-copied
     ═══════════════════════════════════════════════════════════════════ */
  function buildAcceptList() {
    var ext = SPREADSHEET_EXT.slice();
    var allowed = (global.Attachments && Attachments.ALLOWED_EXT) || [];
    allowed.forEach(function (e) { if (ext.indexOf(e) === -1) ext.push(e); });
    return ext.map(function (e) { return '.' + e; }).join(',');
  }

  function pick(moduleId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = buildAcceptList();

    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var ext = extOf(file.name);

      if (SPREADSHEET_EXT.indexOf(ext) !== -1 || ext === 'xls') {
        return handleSpreadsheet(moduleId, file, ext);
      }

      var allowed = (global.Attachments && Attachments.ALLOWED_EXT) || [];
      if (allowed.indexOf(ext) === -1) {
        UI.toast(L({ ar: 'نوع الملف غير مدعوم هنا.', en: 'This file type is not supported here.' }), 'error');
        return;
      }
      confirmAndCreate(moduleId, file, ext);
    };
    input.click();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · إعادة ربط زر «استيراد» — بلا لمس import.js إطلاقاً
        REBINDING THE IMPORT BUTTON — without touching import.js at all
     ═══════════════════════════════════════════════════════════════════ */
  function currentFromBreadcrumb() {
    /* نسخة طبق الأصل من import.js:913-922 — محلية الإغلاق هناك ولا تُصدَّر،
       فالنسخ هنا هو نفس الأسلوب الذي طلبته الخطة نفسها لهوية الشاشة.
       Verbatim copy of import.js:913-922 — closure-local there, not
       exported, so copying is exactly the approach the plan itself asks
       for to resolve the module id. */
    var t = document.querySelector('.page-title');
    if (!t || !global.Schema) return null;
    var txt = t.textContent || '';
    var hit = (Schema.MODULES || []).filter(function (m) {
      return txt.indexOf(lab(m.label)) !== -1;
    }).sort(function (a, b) { return lab(b.label).length - lab(a.label).length; })[0];
    return hit ? hit.id : null;
  }

  function currentModuleId() {
    return (global.App && typeof App.currentModule === 'function' && App.currentModule()) ||
           currentFromBreadcrumb();
  }

  function rebind() {
    var btn = document.getElementById('azImportBtn');
    /* import.js:890 لا يُعيد إنشاء الزر ما دام موجوداً، وnavigation يهدم
       #content بالكامل فيهدم الزر معه — فحين يظهر زر جديد لم نُعلّمه بعد،
       هو دائماً من import.js وحديث. import.js:890 never recreates the
       button while it exists, and navigation destroys #content wholesale
       (destroying the old button with it) — so a fresh, unmarked button is
       always a brand-new one from import.js. */
    if (!btn || btn.getAttribute('data-az-docs') === '1') return;
    btn.setAttribute('data-az-docs', '1');
    var moduleId = currentModuleId();
    if (!moduleId) return;
    btn.onclick = function () { pick(moduleId); };
  }

  var mo = new MutationObserver(function () { rebind(); });
  function start() {
    var content = document.getElementById('content');
    if (content) mo.observe(content, { childList: true, subtree: true });
    rebind();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  installCreateGuard();

  global.ImportDocuments = {
    classifyPdf: classifyPdf,
    analyzePdf: analyzePdf,
    pick: pick
  };

  console.info('import-documents.js ready — PDF/Word/Excel/AutoCAD import from one button; ' +
               'PDF drawing-vs-document detection active.');
})(window);
