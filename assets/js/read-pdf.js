/* =========================================================================
   read-pdf.js — معاينة ملفات PDF وقراءة نصّها، بالعربية الصحيحة
                 PDF preview and text, with Arabic put back in order
   =========================================================================

   ماذا يفعل · WHAT IT DOES

     يعرض صورة كل صفحة من ملف PDF مرفق، وبجانبها النص الموجود فيها بعد
     إصلاحه عربياً. كل شيء داخل متصفح الموظف — لا خادم، ولا رفع لأي جهة.

   ⚠️ القاعدة التي لا تُكسر · THE RULE THAT IS NEVER BROKEN

     النص المستخرج من PDF **لا يُكتب في أي خانة تلقائياً، أبداً.**

     السبب ليس حرصاً زائداً: النص العربي داخل ملفات PDF يخرج كثيراً بترتيب
     مقلوب، والصفحة تبدو سليمة تماماً على الشاشة بينما النص المستخرج منها
     خطأ. فلو مُلئت خانة «رقم المستخلص» آلياً من نص مقلوب لخرج رقم خاطئ
     بصمت — وهذا أخطر من ألا نقرأ الملف أصلاً. لذلك يُعرض النص **بجانب صورة
     الصفحة** ليُقارن بعين إنسان، وهو الذي ينسخ ما يتأكد منه.

     Extracted PDF text is NEVER auto-written into any field. Arabic often
     comes out reversed while the page LOOKS perfect, so an auto-filled
     certificate number would be silently wrong — worse than not reading the
     file at all. The text is shown BESIDE the page picture for a human to
     compare, and they copy what they confirm.

   لماذا لا نحتاج تغيير إعداد الأمان · WHY NO SECURITY SETTING CHANGES

     نسخة pdf.js هذه تستطيع فكّ الصور داخل الملفات الممسوحة بطريقتين: عبر
     WebAssembly (يمنعها إعداد الأمان الحالي في index.html) أو عبر جافاسكربت
     عادية. نُجبرها على الثانية بـ `useWasm:false`، فيعمل كل شيء دون أن
     نلمس إعداد الأمان إطلاقاً. وهذا مُثبَت من قراءة ملف المكتبة نفسه:
     `_noWasmFilename="openjpeg_nowasm_fallback.js"`.

     This pdf.js build can decode images inside scanned files two ways: via
     WebAssembly (blocked by the current CSP in index.html) or via ordinary
     JavaScript. We force the second with `useWasm:false`, so everything
     works without touching the security setting at all. Proven by reading
     the library's own bytes: `_noWasmFilename="openjpeg_nowasm_fallback.js"`.

   لماذا امتداد ‎.js‎ لا ‎.mjs‎ · WHY .js AND NOT .mjs
     المكتبة تُنشر بامتداد ‎.mjs‎، ولم نتأكد أن GitHub Pages يقدّمه بالنوع
     الصحيح — ولو قدّمه خطأً لفشل التحميل بصمت. الاستيراد يعتمد على نوع
     المحتوى لا على الامتداد، فأُعيدت تسميتها ‎.js‎ وانتهى الاحتمال.
     The library ships as .mjs and we could not confirm GitHub Pages serves
     that with the right content type; a wrong type fails silently. Import
     depends on content type, not extension, so it is renamed .js and the
     risk is removed rather than tested.

   ⚠️ الملف الممسوح ضوئياً · A SCANNED FILE
     صورة الصفحة تظهر، لكن **لا يوجد نص لاستخراجه** لأن الورقة صورة. يقول
     الملف ذلك صراحةً بدل أن يُرجع فراغاً بلا تفسير. قراءة الورق الممسوح
     شيء آخر (OCR) ومؤجَّل بقرار.
   ========================================================================= */

(function (global) {
  'use strict';

  var BASE   = 'assets/vendor/pdfjs-6.2.108/';
  var LIB    = BASE + 'pdf.min.js';
  var WORKER = BASE + 'pdf.worker.min.js';
  var WASMD  = BASE + 'wasm/';
  var MAX_PAGES_TEXT    = 60;   /* سقف أمان لملف ضخم */
  var MAX_PAGES_PREVIEW = 10;   /* الصور أثقل من النص */
  var PREVIEW_WIDTH     = 900;

  var loading = null;

  function absolute(rel) {
    /* المسارات نسبية لجذر الموقع، لا للصفحة الحالية
       Paths are relative to the site root, not the current page. */
    var base = location.pathname.replace(/\/[^\/]*$/, '/');
    var root = base.indexOf('/alzahraa-portal/') !== -1
      ? base.slice(0, base.indexOf('/alzahraa-portal/') + '/alzahraa-portal/'.length)
      : base;
    return new URL(rel, location.origin + root).href;
  }

  function ensureLibrary() {
    if (loading) return loading;
    loading = import(absolute(LIB)).then(function (mod) {
      var pdfjs = mod && (mod.getDocument ? mod : mod.default);
      if (!pdfjs || !pdfjs.getDocument) throw new Error('pdf.js loaded but did not expose getDocument');
      pdfjs.GlobalWorkerOptions.workerSrc = absolute(WORKER);
      return pdfjs;
    }).catch(function (e) {
      loading = null;              /* اسمح بإعادة المحاولة */
      throw e;
    });
    return loading;
  }


  /* قراءة بايتات الملف · read the file's bytes
     blob.arrayBuffer() غير موجودة في متصفحات أندرويد القديمة، ومهندسو
     الموقع يحملون أجهزة رخيصة. FileReader موجودة في كل شيء، وهي ما
     يستعمله import.js أصلاً منذ البداية.
     blob.arrayBuffer() is missing on older Android browsers, and the site
     engineers carry cheap phones. FileReader exists everywhere and is what
     import.js has used from the start. */
  function bytesOf(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload  = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('could not read the file from disk')); };
      r.readAsArrayBuffer(blob);
    });
  }

  function canRead(fileName) { return /\.pdf$/i.test(String(fileName || '')); }

  /* ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     القراءة · THE READ
     onProgress(done, total) تُنادى بعد كل صفحة حتى لا تبدو الشاشة معلّقة.
     ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  function read(blob, fileName, onProgress) {
    /* ⚠️ مهمة التحميل، لا المستند · THE LOADING TASK, not the document
       الإفراج عن ذاكرة ملف PDF يتم على «مهمة التحميل» وليس على المستند.
       كان هذا السطر يستدعي doc.destroy() — وهي دالة **غير موجودة أصلاً** في
       هذه النسخة. الاستدعاء كان داخل try/catch فلم يظهر أي خطأ، لكن الملف لم
       يكن يُفرَج عنه أبداً: كل ملف يُقرأ يترك عامله في الذاكرة. مهندس موقع
       يفتح عدة رسومات على هاتف رخيص كان سيبطؤ ثم ينهار، بلا سبب ظاهر.
       اكتُشف بتجربة حقيقية على محرّك pdf.js الحيّ، لا بقراءة الكود.

       A PDF is released through its LOADING TASK, not through the document.
       This used to call doc.destroy() — a function that **does not exist** in
       this version. It sat inside a try/catch, so nothing ever complained,
       but the file was never freed: every PDF read left its worker in memory.
       A site engineer opening several drawings on a cheap phone would have
       slowed down and then crashed, for no visible reason.
       Found by running a real trial against the live pdf.js engine, never by
       reading the code. */
    var task = null;

    return ensureLibrary().then(function (pdfjs) {
      return bytesOf(blob).then(function (buf) {
        task = pdfjs.getDocument({
          data: new Uint8Array(buf),
          useWasm: false,                      /* ← هذا السطر يُغني عن تغيير إعداد الأمان */
          wasmUrl: absolute(WASMD),
          /* الخطوط القياسية · the standard fonts
             كثير من ملفات PDF لا تُضمِّن خطوطها، فتطلبها من القارئ. بدون هذا
             السطر تظهر صورة الصفحة بخطوط بديلة والتخطيط يختلّ قليلاً. النص
             المستخرج لا يتأثر — أُثبت ذلك بالاختبار — لكن صورة الصفحة هي
             نصف الفائدة، لأنها ما يقارن به الإنسان النص العربي.
             ⚠️ حُذفت هذه الخطوط أول مرة لتوفير ١٦ ملفاً من الرفع اليدوي، ثم
             كشف الاختبار تحذير pdf.js عنها في كل تشغيل. أُعيدت لأن الرفع
             سيتكرّر على أي حال لإصلاح مكان المجلد، فلا تكلّف شيئاً إضافياً.
             Many PDFs do not embed their fonts and ask the reader for them.
             Without this line the page picture falls back to substitutes and
             the layout shifts. Extracted text is unaffected — proven by test —
             but the page picture is half the value, because it is what a human
             checks the Arabic against. These 16 files were dropped at first to
             save manual uploads; the harness then caught pdf.js warning about
             them on every single run. Restored, because the vendor folder is
             being re-uploaded anyway to fix its location, so they cost nothing. */
          standardFontDataUrl: absolute(BASE + 'standard_fonts/'),
          isEvalSupported: false,              /* الإعداد الأمني يمنع eval على أي حال */
          disableNormalization: false
        });
        return task.promise;
      });
    }).then(function (doc) {
      var total = doc.numPages;
      var textPages = Math.min(total, MAX_PAGES_TEXT);
      var pics      = Math.min(total, MAX_PAGES_PREVIEW);
      var pages = [];
      var chain = Promise.resolve();

      for (var i = 1; i <= textPages; i++) {
        (function (n) {
          chain = chain.then(function () {
            return readOnePage(doc, n, n <= pics).then(function (p) {
              pages.push(p);
              if (onProgress) { try { onProgress(pages.length, textPages); } catch (e) {} }
            });
          });
        })(i);
      }

      return chain.then(function () {
        var raw = pages.map(function (p) { return p.rawText; }).join('\n\n');
        var repair = global.ArabicText ? ArabicText.repair(raw)
                                       : { text: raw, confidence: 'none', alternativeText: null,
                                           reversedRuns: 0, arabicRuns: 0 };

        var hasText = raw.replace(/\s/g, '').length > 0;

        return {
          text: repair.text,
          alternativeText: repair.alternativeText,
          pages: pages,
          pageCount: total,
          source: 'pdf',
          looksScanned: !hasText,
          meta: {
            fileName: fileName || '',
            pageCount: total,
            pagesRead: textPages,
            picturesRendered: pics,
            truncated: total > textPages,
            arabicConfidence: repair.confidence,
            arabicRunsReordered: repair.reversedRuns,
            arabicRunsSeen: repair.arabicRuns,
            hadPresentationForms: !!repair.hadPresentationForms
          }
        };
      }).then(function (out) {
        /* الإفراج الحقيقي — على المهمة لا على المستند · the real release */
        try { if (task && task.destroy) task.destroy(); } catch (e) {}
        return out;
      });
    });
  }

  function readOnePage(doc, n, withPicture) {
    return doc.getPage(n).then(function (page) {
      return page.getTextContent().then(function (tc) {
        var raw = (tc.items || []).map(function (it) {
          return it.str + (it.hasEOL ? '\n' : '');
        }).join('');

        if (!withPicture) {
          return { number: n, rawText: raw, image: null };
        }

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
          var url = null;
          try { url = canvas.toDataURL('image/jpeg', 0.72); } catch (e) { url = null; }
          return { number: n, rawText: raw, image: url, width: canvas.width, height: canvas.height };
        }).catch(function () {
          /* فشل رسم الصفحة لا يُفقدنا نصّها · a failed picture must not lose the text */
          return { number: n, rawText: raw, image: null };
        });
      });
    });
  }

  global.ReadPdf = {
    canRead: canRead,
    read: read,
    MAX_PAGES_TEXT: MAX_PAGES_TEXT,
    MAX_PAGES_PREVIEW: MAX_PAGES_PREVIEW,
    VENDOR: LIB
  };

  console.info('read-pdf.js ready — PDF preview + text; WebAssembly deliberately off, ' +
               'so the site security setting does not need changing.');
})(window);
