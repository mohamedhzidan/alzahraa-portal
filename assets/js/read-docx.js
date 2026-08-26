/* =========================================================================
   read-docx.js — قراءة ملفات وورد (.docx) داخل المتصفح
                  Reading Word files (.docx) inside the browser
   =========================================================================

   ماذا يفعل · WHAT IT DOES

     يفتح ملف وورد مرفقاً بمستند ويُخرج نصّه، بلا رفعه لأي جهة خارجية وبلا
     أي خادم. كل شيء يحدث داخل متصفح الموظف نفسه.

     Opens a Word file attached to a record and pulls its text out, without
     sending it anywhere and without any server. Everything happens inside
     the employee's own browser.

   لماذا وورد أسهل من PDF · WHY WORD IS EASIER THAN PDF

     ملف وورد يخزّن النص كما كُتب — حروفاً عربية حقيقية بترتيبها المنطقي.
     أما PDF فيخزّن أشكال الحروف كما رُسمت على الورقة، وكثيراً ما يقلبها.
     لذلك لا يحتاج وورد إلى إصلاح عربي أصلاً، ونمرّه على `arabic-text.js`
     احتياطاً فقط — لو كان الملف نفسه ناتجاً عن تحويل PDF رديء إلى وورد.

     A .docx stores text as typed — real Arabic letters in logical order. A
     PDF stores the drawn shapes and often reverses them. So Word needs no
     Arabic repair at all; we still pass it through `arabic-text.js` as a
     belt, in case the file itself came from a poor PDF-to-Word conversion.

   ⚠️ .doc القديم (ما قبل ٢٠٠٧) لا يُقرأ · legacy .doc is NOT read
     صيغة ثنائية مختلفة تماماً ولا يوجد قارئ موثوق لها في المتصفح. تُرفض
     بوضوح مع تعليمة «حفظ باسم» — كما ترفض import.js صيغة .xls القديمة.
     Refused out loud with a Save-As instruction, exactly as import.js
     refuses old .xls. A file that cannot be read is refused, never
     half-read in silence.

   التحميل الكسول · LAZY LOADING
     مكتبة القراءة (٦٢٢ كيلوبايت) لا تُحمَّل إلا عند أول ضغطة على «اقرأ
     المحتوى». لا تدخل قائمة التخزين المسبق إطلاقاً — مهندس الموقع على شبكة
     ضعيفة يجب ألا يدفع ثمنها وهو يفتح شاشة لا علاقة لها بالموضوع.
     The library is fetched only on the first click, never pre-cached. A
     site engineer on a weak connection must not pay for it while opening
     an unrelated screen. The service worker keeps a copy after first use.
   ========================================================================= */

(function (global) {
  'use strict';

  var VENDOR = 'assets/vendor/mammoth-1.12.1.min.js';
  var loading = null;

  /* تحميل المكتبة مرة واحدة فقط مهما تكرّر النقر
     Load the library once, however many times it is clicked. */
  function ensureLibrary() {
    if (global.mammoth) return Promise.resolve(global.mammoth);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = VENDOR;
      s.async = true;
      s.onload = function () {
        if (global.mammoth) resolve(global.mammoth);
        else reject(new Error('mammoth loaded but did not register'));
      };
      s.onerror = function () {
        loading = null;   /* اسمح بإعادة المحاولة بعد عودة الشبكة */
        reject(new Error('could not download the Word reader'));
      };
      document.head.appendChild(s);
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

  function canRead(fileName) {
    return /\.docx$/i.test(String(fileName || ''));
  }

  /* رسالة الرفض الصريحة للصيغة القديمة · the loud refusal for legacy .doc */
  function refusalFor(fileName) {
    if (/\.doc$/i.test(String(fileName || ''))) {
      return {
        ar: 'صيغة ‎.doc‎ القديمة (وورد ٢٠٠٣ فأقدم) لا تُقرأ. افتح الملف في وورد ثم: ' +
            'ملف ← حفظ باسم ← Word Document (‎.docx‎) وأعد رفعه. الملف الأصلي يبقى محفوظاً كما هو.',
        en: 'The old .doc format (Word 2003 and earlier) cannot be read. Open it in Word, ' +
            'then File → Save As → Word Document (.docx) and attach it again. The original ' +
            'file stays stored exactly as it is.'
      };
    }
    return null;
  }

  /* ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     القراءة · THE READ
     تُرجع: { text, html, meta }  ولا تكتب أي شيء في أي مكان.
     Returns { text, html, meta } and writes nothing anywhere. Saving is
     always a separate, deliberate step the person takes.
     ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  function read(blob, fileName) {
    var refusal = refusalFor(fileName);
    if (refusal) return Promise.reject(Object.assign(new Error('unsupported'), { userMessage: refusal }));

    return ensureLibrary().then(function (mammoth) {
      return bytesOf(blob);
    }).then(function (buf) {
      return global.mammoth.convertToHtml({ arrayBuffer: buf });
    }).then(function (res) {
      var html = (res && res.value) || '';
      var text = htmlToText(html);

      /* حزام أمان: لو كان الملف ناتج تحويل رديء وحمل أشكال عرض، نُصلحها */
      var repair = null;
      if (global.ArabicText && ArabicText.needsRepair(text)) {
        repair = ArabicText.repair(text);
        text = repair.text;
      }

      return {
        text: text,
        html: html,
        source: 'docx',
        pages: null,
        meta: {
          fileName: fileName || '',
          messages: (res && res.messages ? res.messages.length : 0),
          arabicRepairApplied: !!repair,
          arabicConfidence: repair ? repair.confidence : 'none',
          alternativeText: repair ? repair.alternativeText : null
        }
      };
    });
  }

  /* تحويل HTML إلى نص مقروء مع الحفاظ على فواصل الفقرات
     HTML to readable text, keeping paragraph breaks. */
  function htmlToText(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html || '')
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');
    var t = d.textContent || '';
    return t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
  }

  global.ReadDocx = {
    canRead: canRead,
    read: read,
    refusalFor: refusalFor,
    htmlToText: htmlToText,
    VENDOR: VENDOR
  };

  console.info('read-docx.js ready — Word (.docx) readable; the library loads on first use only.');
})(window);
