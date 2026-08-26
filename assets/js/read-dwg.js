/* =========================================================================
   read-dwg.js — معاينة رسومات الأوتوكاد (.dwg) بلا فتحها
                 A picture of an AutoCAD drawing, without opening it
   =========================================================================

   اقرأ هذا أولاً — ما لا يفعله هذا الملف · READ THIS FIRST — WHAT IT DOES NOT DO

     **هذا الملف لا يقرأ الرسمة.** لا يقرأ الخطوط ولا الأبعاد ولا الطبقات
     ولا خانة العنوان. لا يستطيع، ولن يحاول.

     السبب مذكور صراحةً حتى لا يُعاد فتح الموضوع بعد شهر: البرنامج الوحيد
     القادر على قراءة DWG داخل المتصفح مرخَّص برخصة GPL-3.0 تفرض شروطها على
     البوابة كلها، وحجمه نحو ١٠ ميجابايت، ويحتاج تعديل إعداد الأمان — وكل
     ذلك ليقرأ ما لا نحتاجه. والبديل التجاري يكلّف اشتراكاً شهرياً ويُرسل
     رسومات الشركة إلى خارجها.

     **وقراءة رسمة قراءةً ناقصة أخطر من عدم قراءتها.** رسمة تُقرأ خطأً بصمت
     تُبنى على أساسها قرارات في الموقع.

     This file does NOT read the drawing — not its lines, dimensions, layers
     or title block. It cannot and will not try. The only browser-side DWG
     parser is GPL-3.0 (which would impose its terms on the whole portal),
     about 10 MB, and needs the security setting changed — all to read what
     is not needed. Reading a drawing partly and silently wrongly is more
     dangerous than not reading it, because site decisions get built on it.

   ماذا يفعل إذن · WHAT IT DOES INSTEAD

     كل ملف أوتوكاد يحفظ بداخله **صورة مصغّرة** — نفس الصورة التي يعرضها
     ويندوز والأوتوكاد في نافذة فتح الملف. هذا الملف يستخرجها ويعرضها.
     تكفي تماماً للسؤال «أي رسمة هذه؟» ولا تكفي لقراءة خانة العنوان.

     Every AutoCAD file stores a small thumbnail inside it — the same picture
     Windows and AutoCAD show in their file dialogs. This extracts and shows
     it. Enough to answer "which drawing is this?", not enough to read a
     title block. Typically around 174×101 pixels.

     وإن لم توجد صورة، يقول ذلك صراحةً ويقترح الحل المجاني — ولا يخترع شيئاً.
     If there is no thumbnail, it says so plainly and points at the free
     answer, rather than inventing anything.

   ⚠️ ما لم يُختبر بعد، ويجب أن يُقال · WHAT IS NOT YET TESTED, AND MUST BE SAID

     **لم يُجرَّب هذا الملف على أي رسمة حقيقية من رسومات الشركة**، لأنه لا
     توجد رسمة واحدة على هذا الجهاز. الشكل القديم (٢٠٠٠ فأقدم) مبنيّ على
     المواصفة المنشورة وهو بسيط ومباشر. الشكل الحديث (٢٠٠٤ فأحدث) يضع
     الصورة داخل قسم مضغوط بطريقة أوتوديسك الخاصة، فيبحث هذا الملف عن
     الصورة مباشرة في البايتات بدل فكّ الضغط — وهذه طريقة تنجح كثيراً ولا
     تنجح دائماً.

     **طُلبت من أ. أحمد عبد الحي رسمتان حقيقيتان لإثبات ذلك.** حتى تصلا،
     يبقى هذا مكتوباً هنا: غير مُثبَت.

     This has NEVER been tried on a real company drawing — there is not one
     on this machine. The pre-2000 layout follows the published spec and is
     simple. The 2004+ layout hides the image inside a section compressed
     with Autodesk's own scheme, so this scans the bytes for the image
     directly instead of decompressing — which works often, not always.
     Two real drawings have been requested from أ. أحمد عبد الحي to prove
     it. Until they arrive this stays written here: NOT PROVEN.
   ========================================================================= */

(function (global) {
  'use strict';

  /* رمز الإصدار في أول ٦ بايتات · the 6-byte version code at the start */
  var VERSIONS = {
    AC1012: { ar: 'أوتوكاد ١٣',            en: 'AutoCAD R13',        era: 'old' },
    AC1014: { ar: 'أوتوكاد ١٤',            en: 'AutoCAD R14',        era: 'old' },
    AC1015: { ar: 'أوتوكاد ٢٠٠٠',          en: 'AutoCAD 2000',       era: 'old' },
    AC1018: { ar: 'أوتوكاد ٢٠٠٤',          en: 'AutoCAD 2004',       era: 'new' },
    AC1021: { ar: 'أوتوكاد ٢٠٠٧',          en: 'AutoCAD 2007',       era: 'new' },
    AC1024: { ar: 'أوتوكاد ٢٠١٠',          en: 'AutoCAD 2010',       era: 'new' },
    AC1027: { ar: 'أوتوكاد ٢٠١٣',          en: 'AutoCAD 2013',       era: 'new' },
    AC1032: { ar: 'أوتوكاد ٢٠١٨ فأحدث',    en: 'AutoCAD 2018+',      era: 'new' }
  };

  /* الحارس الذي يسبق قسم الصورة في الشكل القديم — من المواصفة المنشورة
     The sentinel that precedes the image section in the old layout. */
  var IMAGE_SENTINEL = [0x1F, 0x25, 0x6D, 0x07, 0xD4, 0x36, 0x28, 0x28,
                        0x9D, 0x57, 0xCA, 0x3F, 0x9D, 0x44, 0x10, 0x2B];

  var PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];


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

  function canRead(name) { return /\.dwg$/i.test(String(name || '')); }

  function readVersion(bytes) {
    var code = '';
    for (var i = 0; i < 6 && i < bytes.length; i++) code += String.fromCharCode(bytes[i]);
    return { code: code, info: VERSIONS[code] || null };
  }

  function matchAt(bytes, pos, pattern) {
    if (pos + pattern.length > bytes.length) return false;
    for (var i = 0; i < pattern.length; i++) if (bytes[pos + i] !== pattern[i]) return false;
    return true;
  }
  function u32(bytes, p) {
    return (bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)) >>> 0;
  }

  /* ــــــ الشكل القديم: مؤشّر صريح عند الإزاحة 0x0D ــــــ
     Old layout: an explicit pointer at offset 0x0D, then a sentinel, then a
     tiny directory of {code, start, size}. code 2 = BMP, 3 = WMF, 6 = PNG. */
  function fromHeaderPointer(bytes) {
    if (bytes.length < 0x20) return null;
    var at = u32(bytes, 0x0D);
    if (!at || at + 20 > bytes.length) return null;
    if (!matchAt(bytes, at, IMAGE_SENTINEL)) return null;

    var p = at + 16 + 4;                 /* بعد الحارس وحجم القسم */
    var count = bytes[p]; p += 1;
    if (!count || count > 8) return null;

    for (var i = 0; i < count; i++) {
      var code = bytes[p]; p += 1;
      var start = u32(bytes, p); p += 4;
      var size  = u32(bytes, p); p += 4;
      if (!size || start + size > bytes.length) continue;
      if (code === 6) return { kind: 'png', start: start, size: size };
      if (code === 2) return { kind: 'bmp', start: start, size: size };
      /* code 3 = WMF — لا يعرضه أي متصفح، نتجاهله عمداً */
    }
    return null;
  }

  /* ــــــ الشكل الحديث: بحث مباشر عن صورة PNG داخل البايتات ــــــ
     New layout: scan for a PNG directly. The preview page is frequently
     stored uncompressed because images do not compress usefully. This is
     the honest best effort — it succeeds often, not always, and returns
     null rather than a guess when it fails. */
  function scanForPng(bytes) {
    var limit = Math.min(bytes.length, 6 * 1024 * 1024);   /* الصورة قرب البداية */
    for (var i = 0; i < limit - 24; i++) {
      if (bytes[i] !== 0x89) continue;
      if (!matchAt(bytes, i, PNG_SIG)) continue;
      var end = findPngEnd(bytes, i);
      if (end > i) return { kind: 'png', start: i, size: end - i };
    }
    return null;
  }

  /* نهاية PNG = مقطع IEND · a PNG ends at its IEND chunk */
  function findPngEnd(bytes, start) {
    var p = start + 8;
    while (p + 12 <= bytes.length) {
      var len = (bytes[p] << 24 | bytes[p + 1] << 16 | bytes[p + 2] << 8 | bytes[p + 3]) >>> 0;
      var type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
      p += 12 + len;
      if (type === 'IEND') return p;
      if (len > bytes.length) return -1;
    }
    return -1;
  }

  function toDataUrl(bytes, hit) {
    var slice = bytes.subarray(hit.start, hit.start + hit.size);
    var blob = new Blob([slice], { type: hit.kind === 'png' ? 'image/png' : 'image/bmp' });
    return URL.createObjectURL(blob);
  }

  /* ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     القراءة · THE READ — تُرجع الإصدار دائماً، والصورة إن وُجدت
     ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  function read(blob, fileName) {
    return bytesOf(blob).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var ver = readVersion(bytes);

      var hit = null;
      try {
        hit = fromHeaderPointer(bytes);
        if (!hit) hit = scanForPng(bytes);
      } catch (e) { hit = null; }

      var image = null;
      if (hit) { try { image = toDataUrl(bytes, hit); } catch (e) { image = null; } }

      return {
        source: 'dwg',
        text: '',                          /* لا نص. عمداً. */
        image: image,
        version: ver.code,
        versionLabel: ver.info || null,
        previewFound: !!image,
        previewKind: hit ? hit.kind : null,
        meta: {
          fileName: fileName || '',
          sizeBytes: bytes.length,
          version: ver.code,
          versionAr: ver.info ? ver.info.ar : 'غير معروف',
          versionEn: ver.info ? ver.info.en : 'unknown',
          previewFound: !!image,
          previewKind: hit ? hit.kind : null,
          method: hit ? (hit.kind && hit.start < 0x2000 ? 'header-pointer' : 'byte-scan') : 'none'
        }
      };
    });
  }

  /* الرسالة التي تظهر حين لا توجد صورة — تقول الحقيقة وتعطي حلاً مجانياً
     Shown when there is no thumbnail: the truth, plus the free answer. */
  function noPreviewMessage() {
    return {
      ar: 'هذه الرسمة لا تحمل صورة مصغّرة بداخلها، فلا يمكن عرضها هنا. الملف محفوظ ' +
          'كما هو ويمكن تنزيله وفتحه بالأوتوكاد. وللمعاينة داخل البوابة مستقبلاً: ' +
          'أرفق نسخة PDF بجانب الرسمة — ويمكن إنتاجها مجاناً ببرنامج ' +
          'Autodesk DWG TrueView، وهو مجاني ولا يحتاج رخصة أوتوكاد، ويحوّل عدة ' +
          'ملفات دفعة واحدة على جهازك دون أن يخرج أي ملف من الشركة.',
      en: 'This drawing carries no thumbnail inside it, so it cannot be shown here. ' +
          'The file is stored exactly as it is and can be downloaded and opened in ' +
          'AutoCAD. To preview drawings in the portal in future, attach a PDF copy ' +
          'beside the drawing — Autodesk DWG TrueView produces them free, needs no ' +
          'AutoCAD licence, converts many files at once on your own PC, and sends ' +
          'nothing outside the company.'
    };
  }

  global.ReadDwg = {
    canRead: canRead,
    read: read,
    readVersion: readVersion,
    noPreviewMessage: noPreviewMessage,
    VERSIONS: VERSIONS,
    _fromHeaderPointer: fromHeaderPointer,
    _scanForPng: scanForPng,
    _findPngEnd: findPngEnd
  };

  console.info('read-dwg.js ready — DWG thumbnail only, never geometry. ' +
               'NOT YET PROVEN on a real company drawing.');
})(window);
