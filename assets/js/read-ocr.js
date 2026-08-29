/* =========================================================================
   read-ocr.js — قراءة النص المطبوع من الصور وصفحات PDF الممسوحة ضوئياً
                 (تجريبي، مجاني بالكامل، يعمل داخل المتصفح فقط)
                 Reading printed text out of photos and scanned PDF pages
                 (experimental, entirely free, runs inside the browser only)
   -------------------------------------------------------------------------
   بالكلام العادي · IN PLAIN WORDS

     اليوم: ملف PDF ممسوح ضوئياً يعرض صور صفحاته فقط، وتظهر جملة تقول إن
     قراءته «مؤجّلة بقرار». وصورة (جوال ملتقط صورة ورقة) لا يوجد بجانبها
     أي زر قراءة إطلاقاً. بعد هذا الملف: زر «قراءة النص المطبوع (تجريبي)»
     يظهر تحت كل صورة صفحة ممسوحة، وزر آخر على كل صورة مرفقة (jpg/png/…)
     — يضغطه أحد فتُقرأ الكتابة المطبوعة (لا المكتوبة بخط اليد) وتظهر
     بجانب الصورة، ثم يمكن حفظها مع المستند إن أراد.

     Today: a scanned PDF shows only its page pictures, with a sentence
     saying reading it is "deliberately parked for now". A photo (a phone
     picture of a paper) has no read button beside it at all. After this
     file: a "Read printed text (experimental)" button appears under
     every scanned page picture, and another on every image attachment
     (jpg/png/…) — pressing it reads the PRINTED writing (never
     handwriting) and shows it beside the picture, then it can be saved
     with the record if wanted.

   ⚠️ القاعدة التي لا تُكسر · THE RULE THAT IS NEVER BROKEN

     لا حرف واحد يُكتب تلقائياً في أي خانة نموذج. النص يظهر بجانب الصورة
     ليقرأه إنسان، وهو من يقرر ما ينسخه — تماماً كقاعدة read-pdf.js نفسها،
     ولنفس السبب: أداة قراءة الصور تُخطئ، خصوصاً في الأرقام وخط اليد.

     Not one character is ever auto-written into any form field. The text
     appears beside the picture for a human to read, and they decide what
     to copy — exactly read-pdf.js's own rule, for the same reason: image
     text readers make mistakes, especially with numbers and handwriting.

   لماذا مجاني بالكامل، ولماذا "تجريبي" في كل مكان · WHY FREE, AND WHY
   "EXPERIMENTAL" APPEARS EVERYWHERE

     هذا خيار محمد زيدان الصريح («أفضل خيار مجاني الآن»). الأداة
     (Tesseract.js) تعمل كاملة داخل المتصفح — لا خادم، لا رفع لأي جهة
     خارجية، ولا تكلفة. لكنها أقل دقة من أدوات مدفوعة، خصوصاً على صور
     غير واضحة أو خط يد — فكل نتيجة تحمل تحذيراً دائماً، ودرجة ثقة الأداة
     تُعرض دائماً، ولا نص مشكوك في صحته يُعرض كأنه مؤكَّد.

     This is Mohamed Zidan's explicit choice ("the best free option for
     now"). The engine (Tesseract.js) runs entirely inside the browser —
     no server, nothing uploaded anywhere, no cost. But it is less
     accurate than paid tools, especially on unclear pictures or
     handwriting — so every result carries a permanent warning, the
     tool's own confidence score is always shown, and no doubtful text is
     ever presented as if it were certain.

   -------------------------------------------------------------------------
   المكتبة (vendor) — لماذا هذه الملفات بالذات ولا غيرها
   THE VENDOR FILES — why exactly these, and no others

     ٦ ملفات فقط في portal/assets/vendor/tesseract-7.0.0/: tesseract.min.js
     وworker.min.js في الجذر، وثلاث نُسخ من محرك الحروف («core»، فروق أداء
     الجهاز فقط — المكتبة نفسها تختار واحدة عند التشغيل عبر getCore.js) في
     core/، وبيانات اللغة العربية المدرَّبة في lang/. لا شيء آخر يُحمَّل —
     ولا حتى عند فتح الموقع لأول مرة؛ كل هذه الملفات تُنزَّل عند أول ضغطة
     على زر القراءة فقط، فلا يدفع أحد ثمنها وهو يفتح شاشة أخرى.

     Only 6 files in portal/assets/vendor/tesseract-7.0.0/: tesseract.min.js
     and worker.min.js at the root, three "core" engine variants (device
     performance differences only — the library itself picks one at
     runtime via getCore.js) in core/, and the trained Arabic language
     data in lang/. Nothing else loads — not even on first visit; every
     one of these files downloads only on the first press of the read
     button, so nobody pays for them while opening an unrelated screen.

   ⚠️ لماذا لا تدخل هذه الملفات قائمة SHELL في service-worker.js
      WHY THESE FILES ARE NOT IN service-worker.js's SHELL LIST

     نفس سياسة pdfjs/docx/dwg الموجودة فعلاً (service-worker.js:439-444):
     مكتبات القراءة الكبيرة تُحمَّل مسبقاً (precache) فتُعاد تنزيلها
     بالكامل مع كل رفعة جديدة للموقع — ١١.٥ ميجابايت × ٤٥٠ موظفاً × كل
     نسخة. بدلاً من ذلك، معالج fetch العام الموجود فعلاً في
     service-worker.js (الذي يخزّن أي طلب من نفس أصل الموقع تلقائياً بعد
     أول نجاح) يكفي وحده: أول ضغطة على زر القراءة تُنزِّل الملفات وتُخزَّن
     تلقائياً، وتُقرأ من التخزين في كل مرة تالية حتى بلا إنترنت. بيانات
     اللغة نفسها (ara.traineddata) تحتفظ بها المكتبة أيضاً في IndexedDB
     الخاص بها، فتبقى بعد أي رفعة جديدة للموقع.

     The exact same policy already applied to pdfjs/docx/dwg
     (service-worker.js:439-444): large reading libraries precached would
     re-download in full on every new site upload — 11.5MB × 450 staff ×
     every version. Instead, the generic fetch handler already in
     service-worker.js (which caches any same-origin request automatically
     after its first success) is enough on its own: the first press of the
     read button downloads and caches the files, and every later press
     reads them from the cache, even offline. The language data itself is
     also kept by the library in its own IndexedDB, so it survives any new
     site upload.

   ⚠️ لماذا خانة الأمان (CSP) تحتاج تعديلاً هنا وحده من كل ملفات القراءة
      WHY THE SECURITY SETTING (CSP) NEEDS ONE EDIT, ONLY FOR THIS FILE

     قارئ PDF (read-pdf.js) تجنَّب تعديل الأمان بإجبار المكتبة على جافاسكربت
     عادية (useWasm:false). أداة قراءة الصور لا تملك هذا الخيار — محرّكها
     يعمل داخل WebAssembly حصراً، ويُشغَّل من عامل (worker) بنوع blob:. هذا
     العامل يرث سياسة الصفحة نفسها، وworker-src blob: مسموح أصلاً، لكن
     تصريف WebAssembly داخله كان ممنوعاً — فأُضيف الرمز الوحيد
     'wasm-unsafe-eval' لسطر script-src في index.html (لا أصل جديد، ولا
     'unsafe-eval' الكاملة). متصفح قديم يتجاهل الرمز بصمت فيفشل زر القراءة
     برسالة صادقة، والموقع نفسه لا يتأثر بشيء.

     The PDF reader (read-pdf.js) avoided touching security by forcing
     the library into plain JavaScript (useWasm:false). The image-reading
     engine has no such option — it runs inside WebAssembly exclusively,
     launched from a blob: worker. That worker inherits the page's own
     policy, and worker-src blob: was already allowed, but compiling
     WebAssembly inside it was not — so the single token
     'wasm-unsafe-eval' was added to index.html's script-src line (no new
     origin, not full 'unsafe-eval'). An old browser ignores the token
     silently and the read button fails with an honest message; the rest
     of the site is unaffected.

   ⚠️ لماذا يُشترَط تمرير مسارات الملفات صراحة · WHY EXPLICIT PATHS ARE
      MANDATORY

     إن لم نُمرِّر workerPath/corePath/langPath صراحة، تحاول المكتبة جلب
     نسختها من خادمها السحابي (CDN) — وconnect-src في index.html يمنع أي
     اتصال بأي عنوان غير Supabase، فيفشل الطلب بصمت دون رسالة مفيدة. لهذا
     نبني كل مسار بنفس أسلوب absolute() في read-pdf.js:106-114 حرفياً.

     Without explicitly passing workerPath/corePath/langPath, the library
     tries to fetch its own copy from its cloud CDN — and index.html's
     connect-src blocks any connection to anywhere but Supabase, so the
     request fails silently with no useful message. So every path here is
     built with the exact same technique as read-pdf.js:106-114's own
     absolute().

   -------------------------------------------------------------------------
   القسم (أ) — ملفات PDF الممسوحة ضوئياً · SECTION (A) — SCANNED PDFs

     نلفّ الدالة العامة ReadPdf.read (وليست دالتها الداخلية readerFor —
     تلك مغلقة داخل attachment-reader.js ولا يمكن الوصول إليها من هنا،
     تماماً كما يشرح رأس ذلك الملف نفسه عن سبب عدم لمس attachments.js).
     attachment-reader.js:156 ينادي ReadPdf.read عبر اسمها العام دائماً،
     فاستبدالها هنا يصل فعلياً. نلتقط عندها bلوب الملف والنتيجة (out)،
     ونتذكّرهما فقط إن كان الملف ممسوحاً (out.looksScanned)، لأن القراءة
     الضوئية لا معنى لها على ملف يحتوي نصاً حقيقياً بالفعل.

     We wrap the GLOBAL function ReadPdf.read (not its internal readerFor
     — that one is closed inside attachment-reader.js and unreachable
     from here, exactly as that file's own header explains about not
     touching attachments.js). attachment-reader.js:156 always calls
     ReadPdf.read by its global name, so replacing it here genuinely
     takes effect. We capture the file's blob and the result (out) there,
     remembering them only if the file is scanned (out.looksScanned),
     because OCR makes no sense on a file that already holds real text.

     لا نعرف الوحدة (module) ولا رقم السجل من مناداة ReadPdf.read وحدها —
     فنتتبعهما بلفّ إضافي مستقل لـ EntityPage.openDetail (يُضاف بأمان فوق
     لفَّي attachment-reader.js وemployee-statement.js الموجودين، كل لفّ
     يُنادي الأصلي أولاً). عند الحفظ فقط نطلب Attachments.list لإيجاد صف
     المرفق الحقيقي (id/site) من اسم الملف.

     ReadPdf.read's own call carries no module or record id — so we track
     them with our own additional, independent wrap of EntityPage.openDetail
     (safely stacked on top of attachment-reader.js's and
     employee-statement.js's existing wraps — each wrap calls the
     original first). Only at save time do we ask Attachments.list to
     find the real attachment row (id/site) by file name.

     كل صفحة زرّها مستقل، لكن الحفظ واحد مُجمَّع لكل الصفحات المقروءة معاً
     — عمود attachment_text.source الواحد ('ocr') لا يحتمل أكثر من صف
     لكل مرفق (32-ATTACHMENT-TEXT.sql:118-119، onConflict
     'attachmentId,source').

     Each page has its own button, but saving is ONE combined write for
     every page read so far — attachment_text's single 'ocr' source
     cannot hold more than one row per attachment
     (32-ATTACHMENT-TEXT.sql:118-119, onConflict 'attachmentId,source').

   القسم (ب) — الصور المرفقة · SECTION (B) — ATTACHED PHOTOS

     jpg/jpeg/png/webp فقط. tif/heic مستبعدان عمداً: heic لا يفهمه canvas
     في أغلب المتصفحات (نفس عطل import-documents.js المُصلَح هناك، غير
     مُصلَح هنا لأنه خارج هذا الملف)، وtif نادر على هذا النوع من العمل.
     لا نلفّ decorate/readerFor attachment-reader.js (نفس الفخ المشروح في
     رأس ذلك الملف عن attachments.js: تُنادى كدوال محلية داخلية، فلفّ
     نسخها المُصدَّرة لا يغيّر شيئاً). بدلاً من ذلك: لفّنا الخاص لـ
     EntityPage.openDetail (نفسه المذكور أعلاه في القسم أ) يراقب
     #modalBody بمراقب خاص به وحالة خاصة، ويضيف زراً على صفوف الصور فقط،
     ويفتح طبقة مستقلة تماماً #azOcrOverlay (لا تصادم مع #azReaderOverlay).

     jpg/jpeg/png/webp only. tif/heic are deliberately excluded: canvas
     cannot decode heic in most browsers (the same bug import-documents.js
     already fixes there, not fixed here — out of this file's scope), and
     tif is rare for this kind of work. We do not wrap attachment-reader.js's
     decorate/readerFor (the exact trap that file's own header explains
     about attachments.js: called as internal local functions, so wrapping
     their exported copies changes nothing). Instead: our own
     EntityPage.openDetail wrap (the same one mentioned in section A
     above) watches #modalBody with its own observer and private state,
     adds a button only on image rows, and opens a fully separate layer
     #azOcrOverlay (no collision with #azReaderOverlay).

   -------------------------------------------------------------------------
   الصدق دائماً · HONESTY, ALWAYS

     تسمية دائمة على كل نتيجة: «يقرأ النص المطبوع فقط — خط اليد لا يُقرأ
     بهذه الأداة». درجة ثقة الأداة تُعرض دائماً حين تتوفر. ثقة منخفضة
     تُصدِّر تحذيراً يتقدَّم النص نفسه. ثقة منعدمة تقريباً أو نص فارغ
     تماماً بعد التنظيف → رسالة فشل صادقة، لا نص مبعثر يبدو كأنه صحيح.

     A permanent label on every result: "Reads printed text only —
     handwriting is not read by this tool." The tool's own confidence is
     always shown when available. Low confidence leads with a warning
     BEFORE the text itself. Near-zero confidence or empty text after
     cleanup → an honest failure message, never scrambled text that looks
     legitimate.

   -------------------------------------------------------------------------
   دورة حياة المحرّك · ENGINE LIFECYCLE

     يُحمَّل عند أول ضغطة فقط (lazy). عامل (worker) واحد لكل عملية قراءة،
     يُنهى فوراً بعد كل نتيجة — لا عامل يبقى حياً بلا داعٍ (كومة
     WebAssembly تُقاس بمئات الميجابايتات، والأجهزة رخيصة). كل رابط صورة
     مؤقت (Object URL) يُحرَّر عند إغلاق النافذة أو انتهاء استعماله.

     Loaded on first press only (lazy). One worker per read operation,
     terminated immediately after each result — no worker survives
     without need (the WebAssembly heap runs into hundreds of megabytes,
     and the devices are cheap). Every temporary picture link (Object URL)
     is released when the window closes or its use ends.

   إضافي بالكامل · ADDITIVE. حذف هذا الملف (ومجلد الفيديور) يعيد كل شيء
   إلى ما كان: صور PDF الممسوحة تعرض جملة «مؤجّلة بقرار» كما كانت
   بالضبط، والصور المرفقة تفقد الزرّ الإضافي فقط — لا شيء آخر يتغيّر في
   أي ملف آخر.
   ADDITIVE. Deleting this file (and the vendor folder) restores
   everything: scanned PDF pages show the "deliberately parked" sentence
   exactly as before, and photo attachments simply lose the extra button
   — nothing else changes in any other file.

   يُحمَّل مباشرة بعد attachment-reader.js. Loads immediately after
   attachment-reader.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var TESS_BASE = 'assets/vendor/tesseract-7.0.0/';
  var PDF_BASE  = 'assets/vendor/pdfjs-6.2.108/'; /* نفس مكتبة read-pdf.js — تُعاد استعمالها من ذاكرة الوحدات، لا تنزيل جديد */
  var LOW_CONFIDENCE      = 60;
  var GARBAGE_CONFIDENCE  = 25;
  var MAX_PHOTO_DIM       = 2000;
  var PDF_OCR_PAGE_WIDTH  = 1800;

  function isAr()  { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o)    { return isAr() ? o.ar : o.en; }
  function esc(s)  { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function t(k)    { return global.t ? global.t(k) : k; }
  function toast(m, k) { if (global.UI && UI.toast) UI.toast(m, k || 'info'); }

  var PERMANENT_LABEL = { ar: 'يقرأ النص المطبوع فقط — خط اليد لا يُقرأ بهذه الأداة (تجريبي)',
                           en: 'Reads printed text only — handwriting is not read by this tool (experimental)' };

  function extOf(name) {
    var i = String(name || '').lastIndexOf('.');
    return i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٠ · أدوات مشتركة — المسارات المطلقة، جلب البلوب، تنزيل المحرّكين
        SHARED — absolute paths, blob fetching, loading both engines
     ═══════════════════════════════════════════════════════════════════ */

  /* نفس absolute() في read-pdf.js:106-114 حرفياً — نسخة محلية، رقم ١٧
     (نسخ دالة صغيرة أوفق من تصدير وربط ملفين). Exactly read-pdf.js:
     106-114's own absolute() — a local copy, rule 17 (copying a small
     function beats exporting and coupling two files). */
  function absolute(rel) {
    var base = location.pathname.replace(/\/[^\/]*$/, '/');
    var root = base.indexOf('/alzahraa-portal/') !== -1
      ? base.slice(0, base.indexOf('/alzahraa-portal/') + '/alzahraa-portal/'.length)
      : base;
    return new URL(rel, location.origin + root).href;
  }

  async function fetchBlob(path) {
    var url = global.Attachments && await Attachments.signedUrl(path);
    if (!url) throw new Error(L({ ar: 'تعذّر إنشاء رابط للملف.', en: 'Could not create a link to the file.' }));
    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.blob();
  }

  /* ---- محرّك PDF: إعادة فتح المستند فقط لتكبير صفحة واحدة ----
     نفس مكتبة read-pdf.js بالضبط (نفس المسار)؛ import() لملف سبق تحميله
     يعود من ذاكرة وحدات المتصفح فوراً بلا أي طلب شبكة ثانٍ.
     ---- PDF engine: re-opening the document only to enlarge one page ----
     The exact same library as read-pdf.js (same path); import()-ing an
     already-loaded file resolves instantly from the browser's module
     cache, no second network request. */
  var pdfLibLoading = null;
  function ensurePdfLib() {
    if (pdfLibLoading) return pdfLibLoading;
    pdfLibLoading = import(absolute(PDF_BASE + 'pdf.min.js')).then(function (mod) {
      var pdfjs = mod && (mod.getDocument ? mod : mod.default);
      if (!pdfjs || !pdfjs.getDocument) throw new Error('pdf.js loaded but did not expose getDocument');
      pdfjs.GlobalWorkerOptions.workerSrc = absolute(PDF_BASE + 'pdf.worker.min.js');
      return pdfjs;
    }).catch(function (e) { pdfLibLoading = null; throw e; });
    return pdfLibLoading;
  }
  function bytesOf(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload  = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('could not read the file from disk')); };
      r.readAsArrayBuffer(blob);
    });
  }
  async function renderPdfPageToCanvas(blob, pageNumber, targetWidth) {
    var pdfjs = await ensurePdfLib();
    var buf = await bytesOf(blob);
    var task = pdfjs.getDocument({
      data: new Uint8Array(buf), useWasm: false,
      wasmUrl: absolute(PDF_BASE + 'wasm/'),
      standardFontDataUrl: absolute(PDF_BASE + 'standard_fonts/'),
      isEvalSupported: false, disableNormalization: false
    });
    try {
      var doc = await task.promise;
      var page = await doc.getPage(pageNumber);
      var vp0 = page.getViewport({ scale: 1 });
      var scale = targetWidth / vp0.width;
      var vp = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      var ctx2d = canvas.getContext('2d', { alpha: false });
      ctx2d.fillStyle = '#fff';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx2d, viewport: vp }).promise;
      return canvas;
    } finally {
      /* الإفراج عن المهمة لا المستند — نفس درس read-pdf.js:155-171 حرفياً.
         Release via the loading task, never the document — read-pdf.js's
         own lesson, verbatim. */
      try { if (task && task.destroy) task.destroy(); } catch (e) {}
    }
  }

  /* ---- تنزيل صورة إلى قماشة (canvas) بأقصى بُعد 2000 بكسل قبل القراءة ----
     ---- Downscaling a picture to a canvas, max 2000px, before OCR ---- */
  function downscaleImageToCanvas(blob, maxDim) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(blob);
      img.onload = function () {
        var w = img.naturalWidth || 1, h = img.naturalHeight || 1;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error(L({ ar: 'تعذّر فتح الصورة.', en: 'Could not open the picture.' })));
      };
      img.src = url;
    });
  }

  /* ---- محرّك القراءة الضوئية (Tesseract.js) — تنزيل عند أول ضغطة فقط ----
     ---- The OCR engine (Tesseract.js) — downloaded on first press only ---- */
  var tessLibLoading = null;
  function ensureTesseractLib() {
    if (global.Tesseract) return Promise.resolve(global.Tesseract);
    if (tessLibLoading) return tessLibLoading;
    tessLibLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = absolute(TESS_BASE + 'tesseract.min.js');
      s.onload = function () {
        if (global.Tesseract) resolve(global.Tesseract);
        else reject(new Error(L({ ar: 'تحمّل ملف الأداة لكنه لم يظهر — راجع مجلد vendor.',
                                   en: 'The engine file loaded but did not expose itself — check the vendor folder.' })));
      };
      s.onerror = function () {
        tessLibLoading = null;
        reject(new Error(L({ ar: 'تعذّر تنزيل أداة قراءة الصور.', en: 'Could not download the image-reading engine.' })));
      };
      document.head.appendChild(s);
    });
    return tessLibLoading;
  }

  /* عامل واحد لكل قراءة، يُنهى فوراً — لا عامل يبقى حياً بلا داعٍ.
     One worker per read, terminated immediately — none survives without
     need. */
  var liveWorkers = [];
  async function createOcrWorker() {
    var Tesseract = await ensureTesseractLib();
    /* ⚠️ حاسم: مسارات صريحة وإلا حاولت المكتبة الاتصال بخادمها السحابي
       المحجوب أصلاً بإعداد الأمان (connect-src) — فشل صامت بلا هذا.
       ⚠️ LOAD-BEARING: explicit paths, or the library tries its own cloud
       server, already blocked by the security setting (connect-src) —
       silent failure without this. */
    var worker = await Tesseract.createWorker('ara', 1, {
      workerPath: absolute(TESS_BASE + 'worker.min.js'),
      corePath:   absolute(TESS_BASE + 'core/'),
      langPath:   absolute(TESS_BASE + 'lang/')
    });
    liveWorkers.push(worker);
    return worker;
  }
  function terminateWorker(worker) {
    if (!worker) return;
    var i = liveWorkers.indexOf(worker);
    if (i !== -1) liveWorkers.splice(i, 1);
    try { worker.terminate(); } catch (e) {}
  }
  function terminateAllWorkers() {
    liveWorkers.splice(0).forEach(function (w) { try { w.terminate(); } catch (e) {} });
  }

  async function ocrCanvas(canvas) {
    var worker = await createOcrWorker();
    try {
      var res = await worker.recognize(canvas);
      var rawText = (res && res.data && res.data.text) || '';
      var confidence = (res && res.data && typeof res.data.confidence === 'number') ? res.data.confidence : null;
      var repaired = global.ArabicText ? ArabicText.repair(rawText) : { text: rawText };
      return { text: (repaired.text || '').trim(), confidence: confidence };
    } finally {
      terminateWorker(worker);
    }
  }

  /* الصدق دائماً: تسمية دائمة، ثقة الأداة، وفشل صادق بدل نص مبعثر.
     Always honest: permanent label, tool confidence, and an honest
     failure instead of scrambled text. */
  function renderOcrResult(res) {
    var h = '<div class="alert" style="padding:8px 10px;margin-bottom:8px;font-size:12px;line-height:1.8;background:var(--surface-2,#f4f4f4)">' +
      esc(L(PERMANENT_LABEL)) + '</div>';
    var conf = res.confidence;
    var trimmed = (res.text || '').trim();
    if (!trimmed || (conf !== null && conf < GARBAGE_CONFIDENCE)) {
      return h + '<div class="alert warn" style="padding:10px;line-height:1.8">' +
        esc(L({ ar: 'تعذّرت قراءة موثوقة لهذه الصورة. جرّب صورة أوضح أو بإضاءة أفضل، أو اقرأها بعينك.',
                en: 'Could not read this image reliably. Try a clearer picture or better lighting, or read it yourself.' })) + '</div>';
    }
    if (conf !== null && conf < LOW_CONFIDENCE) {
      h += '<div class="alert warn" style="padding:8px 10px;margin-bottom:8px;font-size:12.5px;line-height:1.8">⚠️ ' +
        esc(L({ ar: 'ثقة منخفضة — راجع النص بعناية قبل نسخ أي رقم منه.',
                en: 'Low confidence — review the text carefully before copying any figure from it.' })) + '</div>';
    }
    if (conf !== null) {
      h += '<div class="muted small" style="margin-bottom:6px">' +
        esc(L({ ar: 'ثقة الأداة: ', en: 'Tool confidence: ' })) + Math.round(conf) + '%</div>';
    }
    h += '<div dir="auto" style="white-space:pre-wrap;line-height:2">' + esc(res.text) + '</div>';
    return h;
  }

  function honestFailureHTML(e) {
    return '<div class="alert error" style="padding:10px;line-height:1.8">' +
      esc(L({ ar: 'تعذّرت القراءة: ', en: 'Could not read: ' })) + esc(e && e.message ? e.message : '') + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     تتبُّع السجل المفتوح حالياً — لفّ إضافي مستقل لـ EntityPage.openDetail
        TRACKING THE CURRENTLY OPEN RECORD — an independent extra wrap
        of EntityPage.openDetail
     يُستعمل في القسمين (أ) و(ب) معاً. يُضاف بأمان فوق لفَّي
     attachment-reader.js وemployee-statement.js — كل واحد ينادي الأصلي
     أولاً، فلا تصادم.
     Used by both sections (A) and (B). Safely stacks on top of
     attachment-reader.js's and employee-statement.js's own wraps — each
     calls the original first, so there is no collision.
     ═══════════════════════════════════════════════════════════════════ */
  var currentDetail = null;
  function installDetailTracker() {
    if (!global.EntityPage || EntityPage.__azOcrDetailTracked) return;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      currentDetail = { moduleId: moduleId, recordId: id };
      watchPhotoAttachments(moduleId, id);
      return orig.apply(EntityPage, arguments);
    };
    EntityPage.__azOcrDetailTracked = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · القسم (أ) — ملفات PDF الممسوحة ضوئياً
        SECTION (A) — SCANNED PDFs
     ═══════════════════════════════════════════════════════════════════ */

  var lastScannedPdfCtx = null; /* { blob, fileName, out, moduleId, recordId } — لآخر ملف PDF ممسوح تمت قراءته */

  function installPdfWrap() {
    if (!global.ReadPdf || ReadPdf.__azOcrWrapped) return;
    var origRead = ReadPdf.read;
    ReadPdf.read = function (blob, fileName, onProgress) {
      return origRead.call(ReadPdf, blob, fileName, onProgress).then(function (out) {
        lastScannedPdfCtx = (out && out.looksScanned) ? {
          blob: blob, fileName: fileName, out: out,
          moduleId: currentDetail && currentDetail.moduleId,
          recordId: currentDetail && currentDetail.recordId
        } : null;
        return out;
      });
    };
    ReadPdf.__azOcrWrapped = true;
  }

  /* استبدال الجملة القديمة «مؤجّلة بقرار» — تُطابَق بمحتوى النص لا بموضع
     DOM هش، فتبقى صحيحة حتى لو تغيّر ترتيب العناصر مستقبلاً (قاعدة ١٤).
     Replacing the old "deliberately parked" sentence — matched by text
     content, not a fragile DOM position, so it stays correct even if
     element order changes later (rule 14). */
  function rewriteBanner(overlay) {
    var alerts = overlay.querySelectorAll('.alert.warn');
    for (var i = 0; i < alerts.length; i++) {
      var el = alerts[i];
      if (/مؤجّلة بقرار|deliberately parked for now/.test(el.textContent)) {
        el.textContent = L({
          ar: 'هذا الملف صور ممسوحة ضوئياً ولا يحتوي نصاً يمكن استخراجه تلقائياً. صور الصفحات تظهر أدناه — ' +
              'اضغط «قراءة النص المطبوع (تجريبي)» تحت كل صورة لتجربة قراءتها بأداة قراءة صور (تجريبية، وقد تخطئ).',
          en: 'This file is scanned images and holds no automatically-extractable text. The page pictures are ' +
              'below — press "Read printed text (experimental)" under each one to try an image-reading tool ' +
              '(experimental, and may be wrong).'
        });
        return;
      }
    }
  }

  var pdfSaveState = null; /* { pages: { [pageNumber]: {text, confidence} } } */

  function ensureSaveBar(pagesHost, ctx) {
    pdfSaveState = { pages: {} };
    var bar = document.createElement('div');
    bar.id = 'azOcrSaveBar';
    bar.style.cssText = 'margin-top:10px;display:none;gap:8px;align-items:center;flex-wrap:wrap';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-sm';
    btn.id = 'azOcrSaveBtn';
    bar.appendChild(btn);
    pagesHost.parentNode.insertBefore(bar, pagesHost.nextSibling);
    btn.onclick = function () { savePdfOcr(ctx, btn); };
  }

  function updateSaveBar() {
    var bar = document.getElementById('azOcrSaveBar');
    var btn = document.getElementById('azOcrSaveBtn');
    if (!bar || !btn || !pdfSaveState) return;
    var n = Object.keys(pdfSaveState.pages).length;
    if (!n) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    btn.textContent = '💾 ' + L({
      ar: 'احفظ نص القراءة الضوئية (' + n + (n === 1 ? ' صفحة' : ' صفحات') + ')',
      en: 'Save the OCR text (' + n + ' page' + (n === 1 ? '' : 's') + ')'
    });
  }

  function appendPageOcrControls(card, pageNumber) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--border,#ddd)';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline btn-sm';
    btn.textContent = L({ ar: 'قراءة النص المطبوع (تجريبي)', en: 'Read printed text (experimental)' });
    var resultBox = document.createElement('div');
    resultBox.style.cssText = 'margin-top:8px';
    btn.onclick = function () { runPageOcr(pageNumber, btn, resultBox); };
    wrap.appendChild(btn);
    wrap.appendChild(resultBox);
    card.appendChild(wrap);
  }

  async function runPageOcr(pageNumber, btn, resultBox) {
    if (!lastScannedPdfCtx) return;
    btn.disabled = true;
    var origLabel = btn.textContent;
    btn.textContent = L({ ar: 'جارٍ التحضير…', en: 'Preparing…' });
    resultBox.innerHTML = '';
    try {
      var canvas = await renderPdfPageToCanvas(lastScannedPdfCtx.blob, pageNumber, PDF_OCR_PAGE_WIDTH);
      btn.textContent = L({ ar: 'جارٍ القراءة…', en: 'Reading…' });
      var res = await ocrCanvas(canvas);
      resultBox.innerHTML = renderOcrResult(res);
      if (pdfSaveState) {
        pdfSaveState.pages[pageNumber] = res;
        updateSaveBar();
      }
      btn.textContent = L({ ar: 'أُعيدت القراءة', en: 'Read again' });
    } catch (e) {
      console.error('[read-ocr] page', pageNumber, e);
      resultBox.innerHTML = honestFailureHTML(e);
      btn.textContent = origLabel;
    } finally {
      btn.disabled = false;
    }
  }

  async function resolveAttachmentFile(moduleId, recordId, fileName) {
    if (!global.Attachments || !moduleId || !recordId) return null;
    var files = [];
    try { files = await Attachments.list(moduleId, recordId); } catch (e) { return null; }
    return (files || []).filter(function (f) { return f.fileName === fileName; })[0] || null;
  }

  async function savePdfOcr(ctx, btn) {
    if (!ctx.moduleId || !ctx.recordId) {
      toast(L({ ar: 'تعذّر تحديد السجل المرتبط — أعد فتح القارئ من داخل الشاشة.',
                en: 'Could not identify the related record — reopen the reader from inside the record screen.' }), 'error');
      return;
    }
    if (!global.Auth || !(Auth.can(ctx.moduleId, 'edit') || Auth.can(ctx.moduleId, 'create'))) {
      toast(L({ ar: 'لا تملك صلاحية الحفظ هنا.', en: 'You do not have permission to save here.' }), 'error');
      return;
    }
    btn.disabled = true;
    var origLabel = btn.textContent;
    btn.textContent = L({ ar: 'جارٍ الحفظ…', en: 'Saving…' });
    try {
      var file = await resolveAttachmentFile(ctx.moduleId, ctx.recordId, ctx.fileName);
      if (!file) throw new Error(L({ ar: 'تعذّر إيجاد الملف المرفق.', en: 'Could not find the attached file.' }));
      var nums = Object.keys(pdfSaveState.pages).map(Number).sort(function (a, b) { return a - b; });
      var combined = nums.map(function (n) {
        return L({ ar: 'صفحة ', en: 'Page ' }) + n + '\n' + pdfSaveState.pages[n].text;
      }).join('\n\n');
      var confs = nums.map(function (n) { return pdfSaveState.pages[n].confidence; }).filter(function (c) { return c !== null; });
      var avgConf = confs.length ? (confs.reduce(function (a, b) { return a + b; }, 0) / confs.length) : null;
      var out = {
        text: combined,
        meta: { pageCount: nums.length, ocrEngine: 'tesseract-7.0.0', ocrConfidence: avgConf, ocrPages: nums }
      };
      var id = await AttachmentReader.saveText(file, ctx.moduleId, ctx.recordId, out, 'ocr');
      toast(L({ ar: 'تم الحفظ وتأكيده من الخادم · ', en: 'Saved and confirmed by the server · ' }) + id, 'success');
      btn.textContent = origLabel;
    } catch (e) {
      console.error('[read-ocr] save pdf', e);
      toast(L({ ar: 'لم يُحفظ: ', en: 'Not saved: ' }) + (e && e.message ? e.message : ''), 'error');
      btn.textContent = origLabel;
    } finally {
      btn.disabled = false;
    }
  }

  function decoratePdfOverlay(overlay, pagesHost, ctx) {
    overlay.setAttribute('data-az-ocr-installed', '1');
    rewriteBanner(overlay);
    var cards = pagesHost.children; /* كل ابن مباشر هو بطاقة صفحة واحدة — لا حاجة لمحدِّد CSS هش */
    var pages = (ctx.out && ctx.out.pages) || [];
    for (var i = 0; i < cards.length; i++) {
      var p = pages[i];
      if (p && p.image) appendPageOcrControls(cards[i], p.number);
    }
    ensureSaveBar(pagesHost, ctx);
  }

  /* مراقب واحد على body، خفيف (subtree:false) — يكتشف ظهور نافذة القارئ
     مع صفحاتها، ويكتشف اختفاءها لإنهاء أي عامل قراءة ضوئية عالق.
     One lightweight body observer (subtree:false) — detects the reader
     overlay appearing with its pages, and detects it disappearing to
     terminate any stray OCR worker. */
  function checkOverlayState() {
    var pdfOverlay = document.getElementById('azReaderOverlay');
    if (pdfOverlay && pdfOverlay.getAttribute('data-az-ocr-installed') !== '1' && lastScannedPdfCtx) {
      var pagesHost = document.getElementById('azReadPages');
      if (pagesHost) decoratePdfOverlay(pdfOverlay, pagesHost, lastScannedPdfCtx);
    }
    if (!document.getElementById('azReaderOverlay') && !document.getElementById(OCR_OVERLAY_ID)) {
      terminateAllWorkers();
    }
  }
  function installBodyObserver() {
    if (document.body.__azOcrBodyObs) return;
    document.body.__azOcrBodyObs = true;
    new MutationObserver(checkOverlayState).observe(document.body, { childList: true, subtree: false });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · القسم (ب) — الصور المرفقة (jpg/jpeg/png/webp فقط)
        SECTION (B) — ATTACHED PHOTOS (jpg/jpeg/png/webp only)
     ═══════════════════════════════════════════════════════════════════ */

  var OCR_OVERLAY_ID = 'azOcrOverlay';
  var photoBusy = false;

  function isPhoto(fileName) {
    var e = extOf(fileName);
    return ['jpg', 'jpeg', 'png', 'webp'].indexOf(e) !== -1;
  }

  /* لوحة المرفقات — نفس أسلوب attachment-reader.js:87-122 لكن بحالة
     خاصة تماماً (data-az-ocr-photo)، فلا يتصادم الملفان أبداً.
     The attachments panel — same technique as attachment-reader.js:
     87-122, but with entirely private state (data-az-ocr-photo), so the
     two files never collide. */
  async function photoDecorate(moduleId, recordId) {
    var section = document.getElementById('azAttachSection');
    if (!section || section.getAttribute('data-az-ocr-photo') === '1') return;
    section.setAttribute('data-az-ocr-photo', '1');

    var files = [];
    try { files = (global.Attachments && await Attachments.list(moduleId, recordId)) || []; }
    catch (e) { return; }
    if (!files.length) return;

    var byPath = {};
    files.forEach(function (f) { byPath[f.path] = f; });

    var rows = section.querySelectorAll('[data-az-open]');
    for (var i = 0; i < rows.length; i++) {
      (function (openBtn) {
        var f = byPath[openBtn.getAttribute('data-az-open')];
        if (!f || !isPhoto(f.fileName)) return;

        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'row-btn';
        b.setAttribute('data-az-ocr-photo-btn', f.id);
        b.textContent = '🔤';
        b.title = L({ ar: 'قراءة النص المطبوع (تجريبي)', en: 'Read printed text (experimental)' });
        b.style.marginInlineEnd = '4px';
        b.onclick = function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          openPhotoOcr(f, moduleId, recordId);
        };
        openBtn.parentNode.insertBefore(b, openBtn);
      })(rows[i]);
    }
  }

  var moPhoto = null;
  function watchPhotoAttachments(moduleId, recordId) {
    if (moPhoto) { moPhoto.disconnect(); moPhoto = null; }
    var body = document.getElementById('modalBody');
    if (!body) return;
    var tries = 0;
    moPhoto = new MutationObserver(function () {
      if (++tries > 400) { moPhoto.disconnect(); moPhoto = null; return; }
      if (document.getElementById('azAttachSection')) photoDecorate(moduleId, recordId);
    });
    moPhoto.observe(body, { childList: true, subtree: true });
    setTimeout(function () { photoDecorate(moduleId, recordId); }, 450);
  }

  function closePhotoOverlay() {
    var o = document.getElementById(OCR_OVERLAY_ID);
    if (o) {
      var img = o.querySelector('img');
      if (img && img.src && img.src.indexOf('blob:') === 0) { try { URL.revokeObjectURL(img.src); } catch (e) {} }
      o.remove();
    }
    document.removeEventListener('keydown', onPhotoEsc);
    terminateAllWorkers();
  }
  function onPhotoEsc(e) { if (e.key === 'Escape') closePhotoOverlay(); }

  function renderSaveButtonHTML() {
    return '<div style="margin-top:10px"><button type="button" class="btn btn-primary btn-sm" data-az-ocr-save>💾 ' +
      esc(L({ ar: 'احفظ النص مع المستند', en: 'Save the text with the record' })) + '</button></div>';
  }

  async function savePhotoOcr(f, moduleId, recordId, res, btn) {
    if (!global.Auth || !(Auth.can(moduleId, 'edit') || Auth.can(moduleId, 'create'))) {
      toast(L({ ar: 'لا تملك صلاحية الحفظ هنا.', en: 'You do not have permission to save here.' }), 'error');
      return;
    }
    btn.disabled = true;
    var origLabel = btn.textContent;
    btn.textContent = L({ ar: 'جارٍ الحفظ…', en: 'Saving…' });
    try {
      var out = { text: res.text, meta: { ocrEngine: 'tesseract-7.0.0', ocrConfidence: res.confidence } };
      var id = await AttachmentReader.saveText(f, moduleId, recordId, out, 'ocr');
      toast(L({ ar: 'تم الحفظ وتأكيده من الخادم · ', en: 'Saved and confirmed by the server · ' }) + id, 'success');
      btn.textContent = origLabel;
    } catch (e) {
      console.error('[read-ocr] save photo', e);
      toast(L({ ar: 'لم يُحفظ: ', en: 'Not saved: ' }) + (e && e.message ? e.message : ''), 'error');
      btn.textContent = origLabel;
    } finally {
      btn.disabled = false;
    }
  }

  /* طبقة مستقلة تماماً، وليست UI.modal — نفس سبب attachment-reader.js
     نفسه (UI.modal يستبدل #modalBody، وهو مكان الشاشة التي فُتح منها).
     A fully separate layer, deliberately not UI.modal — the exact same
     reason attachment-reader.js gives (UI.modal replaces #modalBody,
     where the screen this was opened from lives). */
  async function openPhotoOcr(f, moduleId, recordId) {
    if (photoBusy) return;
    photoBusy = true;
    closePhotoOverlay();

    var o = document.createElement('div');
    o.id = OCR_OVERLAY_ID;
    o.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    o.style.cssText = 'position:fixed;inset:0;z-index:9001;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML =
      '<div class="modal wide" style="max-width:900px;width:100%;max-height:92vh;display:flex;' +
        'flex-direction:column;background:var(--card,#fff);border-radius:10px;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e5e5e5">' +
          '<strong style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(f.fileName) + '</strong>' +
          '<button type="button" class="btn btn-outline btn-sm" data-az-ocr-close>✕</button>' +
        '</div>' +
        '<div style="flex:1;overflow:auto;padding:14px 16px" id="azOcrBody">' +
          '<p class="muted" style="text-align:center;padding:24px">' +
            esc(L({ ar: 'جارٍ فتح الصورة…', en: 'Opening the picture…' })) + '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
    document.addEventListener('keydown', onPhotoEsc);
    o.addEventListener('click', function (e) { if (e.target === o) closePhotoOverlay(); });
    Array.prototype.forEach.call(o.querySelectorAll('[data-az-ocr-close]'), function (b) { b.onclick = closePhotoOverlay; });

    try {
      var blob = await fetchBlob(f.path);
      var url = URL.createObjectURL(blob);
      var body = document.getElementById('azOcrBody');
      if (!body) return; /* أُغلقت النافذة أثناء التحميل */
      body.innerHTML =
        '<div class="alert" style="padding:8px 10px;margin-bottom:10px;font-size:12px;line-height:1.8;background:var(--surface-2,#f4f4f4)">' +
          esc(L(PERMANENT_LABEL)) + '</div>' +
        '<div style="text-align:center;margin-bottom:12px">' +
          '<img src="' + url + '" alt="" style="max-width:100%;max-height:50vh;border:1px solid #ddd;border-radius:6px">' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:10px">' +
          '<button type="button" class="btn btn-primary btn-sm" id="azOcrRun">' +
            esc(L({ ar: 'قراءة النص المطبوع (تجريبي)', en: 'Read printed text (experimental)' })) + '</button>' +
        '</div>' +
        '<div id="azOcrResult"></div>';

      var runBtn = document.getElementById('azOcrRun');
      var resultBox = document.getElementById('azOcrResult');
      runBtn.onclick = async function () {
        runBtn.disabled = true;
        var origLabel = runBtn.textContent;
        runBtn.textContent = L({ ar: 'جارٍ التحضير…', en: 'Preparing…' });
        resultBox.innerHTML = '';
        try {
          var canvas = await downscaleImageToCanvas(blob, MAX_PHOTO_DIM);
          runBtn.textContent = L({ ar: 'جارٍ القراءة…', en: 'Reading…' });
          var res = await ocrCanvas(canvas);
          resultBox.innerHTML = renderOcrResult(res) + renderSaveButtonHTML();
          var saveBtn = resultBox.querySelector('[data-az-ocr-save]');
          if (saveBtn) saveBtn.onclick = function () { savePhotoOcr(f, moduleId, recordId, res, saveBtn); };
          runBtn.textContent = L({ ar: 'أُعيدت القراءة', en: 'Read again' });
        } catch (e) {
          console.error('[read-ocr] photo', e);
          resultBox.innerHTML = honestFailureHTML(e);
          runBtn.textContent = origLabel;
        } finally {
          runBtn.disabled = false;
        }
      };
    } catch (e) {
      var body2 = document.getElementById('azOcrBody');
      if (body2) body2.innerHTML = honestFailureHTML(e);
    } finally {
      photoBusy = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · التركيب · INSTALL
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    installDetailTracker();
    installPdfWrap();
    installBodyObserver();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  setTimeout(install, 1600); /* لو حُمِّل قبل attachment-reader.js/pages/entity.js بلحظات */

  global.ReadOcr = {
    ocrCanvas: ocrCanvas,
    renderPdfPageToCanvas: renderPdfPageToCanvas,
    downscaleImageToCanvas: downscaleImageToCanvas,
    terminateAllWorkers: terminateAllWorkers
  };

  console.info('read-ocr.js ready — "Read printed text (experimental)" on scanned PDF pages and photo attachments. ' +
               'Free, browser-only, handwriting excluded. Deleting this file (and its vendor folder) restores the old behaviour exactly.');
})(window);
