/* =========================================================================
   import-mapping-plus.js — تحسينات نافذة «ربط أعمدة الملف»
                             enhancements for the "Match your columns" dialog
   -------------------------------------------------------------------------
   إضافي بالكامل. حذف هذا الملف يعيد نافذة الربط اليدوي (import.js:514-583)
   إلى شكلها الحالي بالضبط. لا شيء في import.js أو import-documents.js يُعدَّل.
   ADDITIVE. Deleting this file returns the manual mapping dialog exactly to
   today's shape. Nothing in import.js or import-documents.js is touched.

   لماذا مراقبة #modalHost لا تخالف قاعدة «لُفّ UI.modal» · WHY THIS DOES NOT
   BREAK "WRAP UI.modal": تلك القاعدة تمنع مراقبة #content لأن النماذج تُفتح
   داخل #modalHost. هنا نراقب #modalHost نفسه — العنصر الصحيح — لأن مهمتنا
   معرفة متى ظهر HTML خام مكتوب بـ innerHTML (ui.js:98)، لا اعتراض فتح النافذة.
   That rule bans watching #content because forms open inside #modalHost.
   Here we watch #modalHost itself — the correct element — because our job is
   knowing when raw innerHTML (ui.js:98) appears, not intercepting the open.

   الحارس من التكرار · DOUBLE-APPLICATION GUARD: ui.js:98-100 يكتب innerHTML
   لكامل #modalBody في كل UI.modal، فأي سمة نضعها على الجدول تموت تلقائياً مع
   أول نافذة تالية. ui.js:98-100 rewrites #modalBody's innerHTML on every
   UI.modal call, so any attribute we set on the table dies with it.

   الذاكرة محلية للجهاز فقط، ولا تُرفع لأي خادم · DEVICE-LOCAL ONLY, never
   uploaded. متصفح خاص قد يرفض الكتابة بصمت؛ كل وصول لـ localStorage محاط
   بـ try/catch. A private window may refuse silently; every access is guarded.

   نسخة استشارية من norm()/المرادفات (import.js:317,364-436) — محليتان في
   إغلاقه ولا تُصدَّران، وتصديرهما يعني إعادة لصق ١٠١٩ سطراً (قاعدة ١٧). تُستخدم
   فقط لرسم علامة ✓/؟، أبداً في المطابقة الفعلية. An advisory copy of
   import.js's norm()/aliases — closure-local there, exporting them means
   re-pasting 1019 lines (rule 17). Used only to draw the ✓/؟ marker, never
   in the real matching.

   يُحمَّل بعد import.js وimport-documents.js معاً — يلفّ DataImport.preview
   ويقرأ نافذة الربط التي قد يفتحها أيّ من الملفّين.
   Loads after both — wraps DataImport.preview and reads the mapping dialog
   either file can open.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return global.L ? global.L(o) : (isAr() ? o.ar : o.en); }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }

  var STORAGE_PREFIX = 'az_mapplus::';
  /* فاصل لا يظهر في اسم حقل حقيقي — يمنع أن ["أب","ج"] و["أ","بج"] يتصادما.
     A separator that never appears in a real field name — prevents
     ["ab","c"] and ["a","bc"] colliding into the same key. */
  var SEP = '';

  /* ١ · djb2 — تجزئة نصية بسيطة بلا مكتبة خارجية */
  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function keyFor(fields, headers) {
    return STORAGE_PREFIX + djb2((fields || []).join(SEP)) + '::' + djb2((headers || []).join(SEP));
  }

  /* ٢ · الذاكرة المحلية — بلا استثناء يفلت أبداً */
  function readMemory(key) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.headers) || !Array.isArray(obj.fields) || !obj.map) return null;
      return obj;
    } catch (e) { return null; }
  }
  function saveMemory(key, entry) {
    try { global.localStorage.setItem(key, JSON.stringify(entry)); return true; } catch (e) { return false; }
  }
  function clearMemory(key) {
    try { global.localStorage.removeItem(key); return true; } catch (e) { return false; }
  }

  /* ٣ · HOOK A — التقاط السياق فقط. لا نضع نداء الأصلية داخل try: لو فشلت
     origPreview لسبب حقيقي يجب أن يظهر الخطأ كما يظهر بلا هذا الملف — لا أن
     نبتلعه أو ننادي الأصلية مرتين.
     HOOK A — context capture only. The call to the original stays OUTSIDE
     try: a genuine origPreview failure must surface exactly as it would
     without this file — never swallowed, never called a second time. */
  var lastPreview = null;
  function wrapPreview() {
    if (!global.DataImport || DataImport.__mappingPlusWrapped) return;
    var origPreview = DataImport.preview;
    if (typeof origPreview !== 'function') return;
    DataImport.preview = function (moduleId, rows) {
      try { lastPreview = { moduleId: moduleId, rows: rows }; }
      catch (e) { console.warn('[import-mapping-plus] context capture failed', e); }
      return origPreview.apply(this, arguments);
    };
    DataImport.__mappingPlusWrapped = true;
  }

  /* ٤ · نسخة استشارية طبق الأصل من import.js:317-327 وimport.js:364-436 */
  function normCopy(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[(（][^)）]*[)）]/g, '')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .replace(/^(ال)/, '');
  }
  var ALIAS_RAW_COPY = {
    'اسم': 'name', 'الاسم': 'name', 'اسم الموظف': 'employee', 'الموظف': 'employee',
    'كود': 'code', 'الكود': 'code', 'رقم': 'docNo', 'رقم المستند': 'docNo',
    'مسلسل': 'docNo', 'تاريخ': 'date', 'المشروع': 'project', 'الموقع': 'site',
    'ملاحظات': 'notes', 'بيان': 'notes', 'الوصف': 'notes', 'وصف': 'notes',
    'المبلغ': 'amount', 'قيمة': 'amount', 'القيمة': 'amount', 'اجمالي': 'amount',
    'الكمية': 'quantity', 'كمية': 'quantity', 'الوحدة': 'unit',
    'تليفون': 'phone', 'موبايل': 'phone', 'الهاتف': 'phone',
    'العنوان': 'address', 'الحالة': 'status', 'الوظيفة': 'jobTitle',
    'البطاقة الضريبية': 'taxId', 'بطاقة ضريبية': 'taxId',
    'الرقم الضريبي': 'taxId', 'رقم ضريبي': 'taxId', 'ت.ض': 'taxId',
    'رقم البطاقة الضريبية': 'taxId', 'الملف الضريبي': 'taxId',
    'tax card': 'taxId', 'tax card no': 'taxId',
    'انتهاء البطاقة الضريبية': 'taxCardExpiry',
    'تاريخ انتهاء البطاقة الضريبية': 'taxCardExpiry',
    'تاريخ انتهاء البطاقة': 'taxCardExpiry', 'tax card expiry': 'taxCardExpiry',
    'سجل تجاري': 'commercialReg', 'السجل التجاري': 'commercialReg',
    'س.ت': 'commercialReg', 'رقم السجل التجاري': 'commercialReg',
    'commercial register': 'commercialReg',
    'انتهاء السجل التجاري': 'commercialRegExpiry',
    'تاريخ انتهاء السجل التجاري': 'commercialRegExpiry',
    'commercial register expiry': 'commercialRegExpiry',
    'الرقم القومي': 'nationalIdNo', 'رقم قومي': 'nationalIdNo',
    'بطاقة': 'nationalIdNo', 'رقم البطاقة': 'nationalIdNo'
  };
  var ALIAS_COPY = {};
  Object.keys(ALIAS_RAW_COPY).forEach(function (raw) { ALIAS_COPY[normCopy(raw)] = ALIAS_RAW_COPY[raw]; });

  /* دالة نقية للتصنيف — قابلة للاختبار مباشرة بلا DOM · pure, DOM-free */
  function classify(headerText, selectedValue, selectedLabelText) {
    if (!selectedValue) return '';
    var n = normCopy(headerText);
    if (normCopy(selectedLabelText) === n || normCopy(selectedValue) === n || ALIAS_COPY[n] === selectedValue) return 'exact';
    return 'guess';
  }

  /* ٥ · قراءة حالة النافذة الحالية من الـ DOM */
  function optionValues(select) {
    return Array.prototype.map.call(select.options, function (o) { return o.value; });
  }
  function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function readDialogData(table) {
    var trs = Array.prototype.slice.call(table.querySelectorAll('tbody > tr'));
    var selects = trs.map(function (tr) { return tr.querySelector('select[data-az-map]'); });
    var headers = trs.map(function (tr) {
      var td = tr.children && tr.children[0];
      return td ? (td.textContent || '').trim() : '';
    });
    var fields = (selects[0]) ? optionValues(selects[0]) : [];
    return { trs: trs, selects: selects, headers: headers, fields: fields };
  }
  /* أسماء الحقول المطلوبة — عقد import.js:524-525: نص الخيار ينتهي بـ" *" */
  function requiredEntries(dialog) {
    var sel = dialog.selects[0];
    if (!sel) return [];
    return Array.prototype.filter.call(sel.options, function (o) { return /\s\*$/.test(o.textContent || ''); })
      .map(function (o) { return { value: o.value, label: (o.textContent || '').replace(/\s\*$/, '') }; });
  }

  /* ٦ · مزية ١ — استعادة المطابقة المحفوظة */
  function applyMemory(dialog, modalBody) {
    var key = keyFor(dialog.fields, dialog.headers);
    var stored = readMemory(key);
    if (!stored) return;
    /* تحقق عنصراً بعنصر رغم أن المفتاح تجزئة — تجزئة ٣٢ بت يمكن أن تتصادم.
       Element-by-element check even though the key is a hash — a 32-bit
       hash CAN collide; this check is the real guarantee. */
    if (!arraysEqual(stored.headers, dialog.headers) || !arraysEqual(stored.fields, dialog.fields)) return;
    dialog.headers.forEach(function (h, i) {
      var v = stored.map[h];
      var sel = dialog.selects[i];
      if (v !== undefined && sel && optionValues(sel).indexOf(v) !== -1) sel.value = v;
    });
    insertNotice(modalBody, key);
  }
  function insertNotice(modalBody, key) {
    if (document.getElementById('azMapPlusNotice')) return;
    var div = document.createElement('div');
    div.id = 'azMapPlusNotice';
    div.className = 'alert alert-info';
    div.style.cssText = 'margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:10px';
    div.innerHTML = '<span>' + esc(L({
      ar: 'استُعيدت مطابقة سابقة من هذا الجهاز — راجعها ثم اضغط متابعة',
      en: 'A previous matching from this device was restored — review it, then press Continue'
    })) + '</span><button type="button" id="azMapPlusForget" class="btn btn-outline btn-sm">' +
      esc(L({ ar: '🗑 نسيان هذه المطابقة', en: '🗑 Forget this matching' })) + '</button>';
    modalBody.insertBefore(div, modalBody.firstChild);
    var forgetBtn = document.getElementById('azMapPlusForget');
    if (forgetBtn) forgetBtn.addEventListener('click', function () {
      clearMemory(key);
      div.remove();
      if (global.UI && UI.toast) UI.toast(L({ ar: 'نُسيت المطابقة المحفوظة', en: 'The saved matching was forgotten' }), 'info');
    });
  }

  /* ٧ · مزية ٢ — ثلاث عيّنات بدل واحدة، فقط إن كانت ذاكرة HOOK A طازجة لنفس
     الملف المفتوح الآن (رؤوس الأعمدة متطابقة نصّاً) */
  function rewriteSamples(dialog, table) {
    var rows = lastPreview && lastPreview.rows;
    if (!rows || !rows[0]) return;
    var cachedHeaders = rows[0].map(function (v) { return String(v == null ? '' : v).trim(); });
    if (!arraysEqual(cachedHeaders, dialog.headers)) return;

    var th = table.querySelector('thead th:nth-child(2)');
    if (th) th.textContent = L({ ar: 'أمثلة من الملف', en: 'Examples from the file' });

    dialog.trs.forEach(function (tr, i) {
      var td = tr.children && tr.children[1];
      if (!td) return;
      var out = [];
      for (var r = 1; r < Math.min(4, rows.length); r++) {
        var v = (rows[r] || [])[i];
        out.push(esc(String(v == null ? '' : v).slice(0, 30)));
      }
      td.innerHTML = out.join('<br>');
    });
  }

  /* ٨ · مزيتا ٣ و٤ معاً — تحذير الحقول المطلوبة وعلامات الثقة، مُعادتا
     الحساب معاً في كل تغيير عبر مستمع مفوَّض واحد */
  function insertConfidenceSpans(dialog) {
    dialog.selects.forEach(function (sel) {
      if (!sel || !sel.parentNode) return;
      if (sel.parentNode.querySelector('span[data-az-conf]')) return;
      var span = document.createElement('span');
      span.setAttribute('data-az-conf', '1');
      span.style.cssText = 'margin-inline-start:6px;font-weight:700';
      sel.parentNode.insertBefore(span, sel.nextSibling);
    });
  }

  function recomputeAll(dialog, modalBody, btn) {
    dialog.selects.forEach(function (sel, i) {
      if (!sel || !sel.parentNode) return;
      var span = sel.parentNode.querySelector('span[data-az-conf]');
      if (!span) return;
      var opt = sel.options[sel.selectedIndex];
      var labelText = opt ? (opt.textContent || '').replace(/\s\*$/, '') : '';
      var cls = classify(dialog.headers[i], sel.value, labelText);
      if (cls === 'exact') {
        span.textContent = '✓'; span.style.color = '#1b7f4b';
        span.title = L({ ar: 'تطابق مؤكد بالاسم أو مرادف معروف', en: 'Confirmed match by name or a known synonym' });
      } else if (cls === 'guess') {
        span.textContent = '؟'; span.style.color = '#B8860B';
        span.title = L({ ar: 'تخمين بالتشابه — راجع هذا العمود', en: 'A similarity guess — review this column' });
      } else { span.textContent = ''; span.title = ''; }
    });

    var required = requiredEntries(dialog);
    var chosen = dialog.selects.map(function (s) { return s ? s.value : ''; });
    var missing = required.filter(function (r) { return chosen.indexOf(r.value) === -1; });
    var warnDiv = document.getElementById('azMapPlusWarn');

    if (missing.length) {
      var labels = missing.map(function (r) { return r.label; }).join(isAr() ? '، ' : ', ');
      if (!warnDiv) {
        warnDiv = document.createElement('div');
        warnDiv.id = 'azMapPlusWarn';
        warnDiv.className = 'alert alert-danger';
        warnDiv.style.marginBottom = '10px';
        modalBody.insertBefore(warnDiv, modalBody.firstChild);
      }
      warnDiv.textContent = L({ ar: '⚠ حقول مطلوبة لم تُربط بعد: ', en: '⚠ Required fields not yet mapped: ' }) + labels;

      /* الزر لا يُعطَّل أبداً — القرار للمستخدم، والصفوف الناقصة ستظهر
         حمراء في المعاينة التالية. Never disabled — the choice stays with
         the person; incomplete rows show red in the next preview. */
      if (btn) {
        if (btn.dataset.azMapPlusDemoted !== '1') {
          btn.dataset.azMapPlusOrigLabel = btn.textContent;
          btn.dataset.azMapPlusOrigOpacity = btn.style.opacity || '';
          btn.dataset.azMapPlusDemoted = '1';
        }
        btn.style.opacity = '0.55';
        btn.textContent = '⚠ ' + btn.dataset.azMapPlusOrigLabel;
        btn.title = L({
          ar: 'توجد حقول مطلوبة غير مربوطة — يمكنك المتابعة، لكن الصفوف ستظهر حمراء في المعاينة',
          en: 'Some required fields are not mapped yet — you may continue, but rows will show red in the preview'
        });
      }
    } else {
      if (warnDiv) warnDiv.remove();
      if (btn && btn.dataset.azMapPlusDemoted === '1') {
        btn.style.opacity = btn.dataset.azMapPlusOrigOpacity || '';
        btn.textContent = btn.dataset.azMapPlusOrigLabel || btn.textContent;
        btn.title = '';
        btn.dataset.azMapPlusDemoted = '0';
      }
    }
  }

  function attachChangeListener(dialog, table, modalBody, btn) {
    table.addEventListener('change', function (e) {
      if (!e.target || typeof e.target.matches !== 'function' || !e.target.matches('select[data-az-map]')) return;
      recomputeAll(dialog, modalBody, btn);
    });
  }

  /* ٩ · نقطة الدخول الوحيدة — قابلة للنداء مباشرة من فاحص بلا انتظار المراقب */
  function enhance(table) {
    try {
      if (!table) return;
      var modalBody = document.getElementById('modalBody') || (table.closest && table.closest('.modal-body'));
      var dialog = readDialogData(table);
      if (!dialog.selects.length) return;

      applyMemory(dialog, modalBody);
      rewriteSamples(dialog, table);
      insertConfidenceSpans(dialog);

      var btn = document.querySelector('#modalFoot .btn-primary');
      recomputeAll(dialog, modalBody, btn);
      attachChangeListener(dialog, table, modalBody, btn);
    } catch (e) { console.warn('[import-mapping-plus] enhance failed', e); }
  }

  /* ١٠ · مزية ١ (الحفظ) — مستمع نقر بمرحلة الالتقاط على #modalFoot، مرة
     واحدة إلى الأبد؛ ui.js:99-100 يُفرّغ innerHTML فقط ولا يُعيد إنشاء العنصر.
     لا preventDefault ولا stopPropagation — سلوك الزر الأصلي لا يتغيّر.
     ONE capture-phase listener forever; ui.js:99-100 only empties innerHTML,
     never recreates the element. No preventDefault/stopPropagation — the
     button's own behaviour is never changed. */
  function installSaveCapture() {
    var foot = document.getElementById('modalFoot');
    if (!foot || foot.__mapPlusCapture) return;
    foot.__mapPlusCapture = true;
    foot.addEventListener('click', function (e) {
      try {
        var btn = e.target && e.target.closest ? e.target.closest('.btn-primary') : null;
        if (!btn) return;
        var table = document.querySelector('#modalBody table[data-az-plus="1"]');
        if (!table) return;
        var dialog = readDialogData(table);
        var chosen = dialog.selects.map(function (s) { return s ? s.value : ''; });
        if (!chosen.filter(Boolean).length) return;
        var map = {};
        dialog.headers.forEach(function (h, i) { if (chosen[i]) map[h] = chosen[i]; });
        saveMemory(keyFor(dialog.fields, dialog.headers), {
          headers: dialog.headers, fields: dialog.fields, map: map, savedAt: new Date().toISOString()
        });
      } catch (err) { console.warn('[import-mapping-plus] could not save mapping memory', err); }
    }, true);
  }

  /* ١١ · HOOK B — مراقبة #modalHost، مرة واحدة لكل ظهور (انظر «الحارس من
     التكرار» أعلى الملف) */
  function onModalMutate() {
    var body = document.getElementById('modalBody');
    if (!body) return;
    var sel = body.querySelector('select[data-az-map]');
    if (!sel) return;
    var table = sel.closest('table');
    if (!table || table.getAttribute('data-az-plus') === '1') return;
    table.setAttribute('data-az-plus', '1');
    enhance(table);
  }
  function startObserver() {
    var host = document.getElementById('modalHost');
    if (!host) return;
    new MutationObserver(onModalMutate).observe(host, { childList: true, subtree: true });
  }

  function start() { wrapPreview(); installSaveCapture(); startObserver(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.ImportMappingPlus = {
    enhance: enhance, classify: classify, keyFor: keyFor,
    readMemory: readMemory, saveMemory: saveMemory, clearMemory: clearMemory
  };

  console.info('import-mapping-plus.js ready — column-mapping memory, samples, required warning and confidence markers active.');
})(window);
