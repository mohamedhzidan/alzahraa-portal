/* =========================================================================
   dc-requests.js — طلبات أ. أحمد عبد الحي · Ahmed's requests
   -------------------------------------------------------------------------
   من رسائل ١٦ أغسطس ٢٠٢٦ · From the WhatsApp messages of 16 August 2026

     ١· «موضوع البطاقة الضريبية — إحنا مش عندنا ملف ليه»
        لا يوجد مكان لرقم البطاقة الضريبية ولا صورتها.

     ٢· «ممكن نعمل إضافة خانة رقم البطاقة الشخصية»
        مقاول الباطن الفرد ليس له بطاقة ضريبية، له بطاقة شخصية.

     ٣· «ينفع نعمل إضافة ملفات PDF على طول من اختيار الملفات»
        موجودة بالفعل — لوحة «المرفقات» أسفل كل مستند تقبل PDF.
        أضفنا هنا زر «＋ مرفق» بجوار حفظ ليكون ظاهراً لا مخفياً.

     ٤· «موضوع الريكوستات: الردم والجيوجريد والخرسانة»
        طلب فحص الأعمال كان به «بند العمل» نصاً حراً فقط، فلا يمكن
        فرز الطلبات ولا معرفة ما ينقص كل نوع. أضفنا «نوع العمل»
        بقائمة، ومع كل نوع الاختبارات المطلوبة له تحديداً.

   وطلبان من الإدارة:
     ٥· مقاول الباطن يمارس أكثر من مهنة — حدادة ونجارة معاً.
     ٦· شاشة سريعة لتوزيع الموظفين على المواقع.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and everything reverts.
   يُحمَّل بعد departments.js وقبل auth.js
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('dc-requests.js needs schema.js first'); return; }
  var S = global.Schema;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  /* أضف حقلاً لشاشة إن لم يكن موجوداً. لا يكرّر ولا يستبدل.
     Add a field to a screen only if it is not already there. */
  var report = { added: [], skipped: [], missing: [] };
  function addField(moduleId, field, afterName) {
    var m = S.get(moduleId);
    if (!m || !m.fields) { report.missing.push(moduleId); return false; }
    if (m.fields.some(function (f) { return f.name === field.name; })) {
      report.skipped.push(moduleId + '.' + field.name); return false;
    }
    var at = afterName
      ? m.fields.findIndex(function (f) { return f.name === afterName; })
      : -1;
    if (at === -1) m.fields.push(field); else m.fields.splice(at + 1, 0, field);
    report.added.push(moduleId + '.' + field.name);
    return true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · البطاقة الضريبية والسجل التجاري والبطاقة الشخصية
     -------------------------------------------------------------------
     الشركة تتعامل مع نوعين: شركات لها بطاقة ضريبية وسجل تجاري،
     وأفراد لهم بطاقة شخصية فقط. الشاشة كانت تفترض النوع الأول دائماً.

     Two kinds of counterparty: companies with a tax card and commercial
     register, and individuals with only a national ID. The screens
     assumed the first kind existed always.
     ═══════════════════════════════════════════════════════════════════ */
  var SEC_LEGAL = { ar: 'المستندات القانونية والضريبية', en: 'Legal & tax documents' };

  var ENTITY_KIND = [
    { value: 'company',    label: { ar: 'شركة / مؤسسة', en: 'Company / establishment' } },
    { value: 'individual', label: { ar: 'فرد',           en: 'Individual' } }
  ];

  function legalFields() {
    return [
      F('entityKind', 'الصفة القانونية', 'Legal form', 'select',
        { options: ENTITY_KIND, default: 'company', section: SEC_LEGAL,
          help: { ar: 'الشركة لها بطاقة ضريبية · الفرد له بطاقة شخصية',
                  en: 'A company has a tax card; an individual has a national ID' } }),

      /* ── طلب أ. أحمد رقم ١ ── */
      F('taxCardNo', 'رقم البطاقة الضريبية', 'Tax card number', 'text',
        { section: SEC_LEGAL,
          hint: { ar: 'مثال ٤٥٦-٧٨٩-١٢٣', en: 'e.g. 456-789-123' } }),
      F('taxCardExpiry', 'انتهاء البطاقة الضريبية', 'Tax card expiry', 'date',
        { section: SEC_LEGAL,
          help: { ar: 'ينبّهك النظام قبل انتهائها بثلاثين يوماً',
                  en: 'The portal warns you thirty days before it expires' } }),
      F('commercialReg', 'رقم السجل التجاري', 'Commercial register no.', 'text',
        { section: SEC_LEGAL }),
      F('commercialRegExpiry', 'انتهاء السجل التجاري', 'Commercial register expiry', 'date',
        { section: SEC_LEGAL }),

      /* ── طلب أ. أحمد رقم ٢ ── */
      F('nationalIdNo', 'رقم البطاقة الشخصية', 'National ID number', 'text',
        { section: SEC_LEGAL,
          hint: { ar: '١٤ رقماً — للأفراد ومقاولي الباطن من غير الشركات',
                  en: '14 digits — for individuals and non-company subcontractors' } }),

      F('vatRegistered', 'مسجّل بضريبة القيمة المضافة', 'VAT registered', 'checkbox',
        { section: SEC_LEGAL }),
      F('insuranceFileNo', 'رقم الملف التأميني', 'Social insurance file no.', 'text',
        { section: SEC_LEGAL }),
      F('legalDocsNote', 'ملاحظات على المستندات', 'Notes on documents', 'textarea',
        { section: SEC_LEGAL, full: true,
          hint: { ar: 'ارفع صور البطاقة والسجل من لوحة «المرفقات» أسفل الصفحة',
                  en: 'Upload photos of the card and register from the Attachments panel below' } })
    ];
  }

  ['subcontractors', 'suppliers', 'customers'].forEach(function (id) {
    legalFields().forEach(function (f) { addField(id, f); });
  });

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · مهن مقاول الباطن — أكثر من واحدة
     -------------------------------------------------------------------
     كان الاختيار واحداً فقط: حدادة أو نجارة. ومقاول واحد في الواقع
     يعمل الحدادة والنجارة والخرسانة معاً، فكان يُسجَّل مرتين أو ثلاثاً
     بأسماء متشابهة — ثم لا يُعرف أي سجل هو الصحيح عند المستخلص.

     The trade was a single choice. One real subcontractor does steel,
     formwork and concrete, so he was entered two or three times under
     near-identical names — and then nobody knew which record the
     payment certificate belonged to.

     لا يوجد نوع حقل «اختيار متعدد» في النظام، فاستخدمنا مربعات اختيار
     وهي مدعومة بالكامل. اختر ما شئت منها.
     There is no multi-select field type in the portal, so this uses
     checkboxes, which are fully supported. Tick as many as apply.
     ═══════════════════════════════════════════════════════════════════ */
  var SEC_TRADE = { ar: 'المهن والتخصصات', en: 'Trades & specialities' };

  var TRADES = [
    ['tradeSteel',      'حدادة',                 'Steel fixing'],
    ['tradeCarpentry',  'نجارة',                 'Formwork / carpentry'],
    ['tradeConcrete',   'خرسانة',                'Concrete'],
    ['tradeEarthworks', 'حفر وردم',              'Earthworks & backfill'],
    ['tradeAsphalt',    'أسفلت',                 'Asphalt'],
    ['tradeGeogrid',    'جيوجريد وفرش',          'Geogrid & geotextile'],
    ['tradeMasonry',    'مباني ومحارة',          'Masonry & plaster'],
    ['tradeInsulation', 'عزل',                   'Waterproofing'],
    ['tradePlumbing',   'صحي',                   'Plumbing'],
    ['tradeElectrical', 'كهرباء',                'Electrical'],
    ['tradePaint',      'دهانات',                'Painting'],
    ['tradeSurvey',     'مساحة',                 'Surveying'],
    ['tradeEquipment',  'تأجير معدات',           'Equipment hire'],
    ['tradeTransport',  'نقل',                   'Haulage'],
    ['tradeLabour',     'توريد عمالة',           'Labour supply'],
    ['tradeOther',      'أخرى',                  'Other']
  ];

  /* حقل واحد يحمل كل المهن المختارة مفصولة بفاصلة.
     ستة عشر مربع اختيار كانت تملأ الشاشة وتُقرأ بصعوبة. الآن قائمة
     واحدة تُنقر أسطرها: نقرة تختار، ونقرة أخرى تلغي. اختر واحدة أو
     كلها. One field holding every chosen trade. Click a line to select
     it, click again to unselect. One, several, or all sixteen. */
  addField('subcontractors',
    F('trades', 'المهن والتخصصات', 'Trades & specialities', 'text',
      { section: SEC_TRADE, full: true,
        help: { ar: 'انقر على كل مهنة يمارسها هذا المقاول — يمكن اختيار أي عدد',
                en: 'Click every trade this subcontractor performs — any number' } }));

  addField('subcontractors',
    F('tradeOtherText', 'حدّد «أخرى»', 'Specify "other"', 'text',
      { section: SEC_TRADE,
        help: { ar: 'يُملأ فقط إذا اخترت «أخرى» من القائمة',
                en: 'Only if you picked "Other" in the list' } }));

  var TRADE_LABEL = {};
  TRADES.forEach(function (t) { TRADE_LABEL[t[0]] = { ar: t[1], en: t[2] }; });

  function tradeCodes(sub) {
    if (!sub) return [];
    if (sub.trades) {
      return String(sub.trades).split(',').map(function (s) { return s.trim(); })
                               .filter(function (s) { return !!TRADE_LABEL[s]; });
    }
    /* سجلات قديمة حُفظت بمربعات الاختيار — ما زالت تُقرأ.
       Records saved by the earlier checkbox version still read correctly. */
    return TRADES.filter(function (t) { return sub[t[0]] === true || sub[t[0]] === 'true'; })
                 .map(function (t) { return t[0]; });
  }

  /* اقرأ مهن مقاول كنص واحد — للطباعة والتقارير والبحث */
  function tradesOf(sub) {
    var out = tradeCodes(sub).map(function (c) { return L(TRADE_LABEL[c]); });
    if (out.length && sub && sub.tradeOtherText &&
        tradeCodes(sub).indexOf('tradeOther') !== -1) {
      out[out.indexOf(L(TRADE_LABEL.tradeOther))] =
        (isAr() ? 'أخرى: ' : 'Other: ') + sub.tradeOtherText;
    }
    return out.join(' · ');
  }

  /* ── القائمة نفسها ──────────────────────────────────────────────────
     نستبدل خانة النص بقائمة متعددة الاختيار عند فتح النموذج. النقرة
     الواحدة تكفي — لا حاجة للضغط على Command، لأن أحداً في الموقع لن
     يعرف ذلك ولا يجب أن يُطلب منه.

     The text box is swapped for a multi-select when the form opens.
     A single click toggles a line: no Command key, because nobody on
     site knows that and nobody should have to.
     ────────────────────────────────────────────────────────────────── */
  /* لا نعرف كيف يسمّي entity.js حقوله بالضبط، فنجرّب كل الاحتمالات
     المعقولة بدل الاعتماد على واحد. لو فشلت كلها تظهر خانة نص عادية —
     يكتب فيها الأكواد بفاصلة، فلا يتعطّل شيء.
     We do not control how entity.js names its inputs, so try every
     reasonable form rather than betting on one. If all fail the plain
     text box remains usable, so nothing breaks. */
  function findTradesInput() {
    /* ⚠️ SELECT مقصودة هنا.
       الشاشة كانت فيها بالفعل قائمة «المهنة» باختيار واحد — حدادة أو
       نجارة — وهي سبب الشكوى الأصلية. نسختنا الأولى بحثت عن خانة نص
       فقط فلم تجدها، فبقيت القائمة القديمة كما هي.
       A single-choice dropdown was already on the screen — steel OR
       carpentry — which is the original complaint. The first version
       looked only for a text box, missed it, and left it untouched. */
    var tries = [
      '[name="trades"]', '[name="trade"]',
      '#trades', '#trade', '#field-trades', '#field-trade',
      '[data-field="trades"]', '[data-field="trade"]',
      '[data-name="trades"]', '[data-name="trade"]',
      '[id$="trades"]', '[id$="trade"]'
    ];
    for (var i = 0; i < tries.length; i++) {
      var el = document.querySelector(tries[i]);
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return el;
    }
    /* آخر محاولة: ابحث عن الحقل الذي عنوانه «المهنة» أو «المهن والتخصصات» */
    var labels = document.querySelectorAll('label, .field-label, .form-label');
    for (var j = 0; j < labels.length; j++) {
      var txt = (labels[j].textContent || '').trim();
      if (txt.indexOf('المهن') !== -1 || txt.indexOf('المهنة') !== -1 ||
          txt.indexOf('Trade') !== -1) {
        var wrap = labels[j].closest ? labels[j].closest('.field, .form-group, div') : labels[j].parentNode;
        var f = wrap && wrap.querySelector('input, textarea, select');
        if (f) return f;
      }
    }
    return null;
  }

  /* اقرأ القيمة الحالية أياً كان نوع الحقل */
  function readTrades(el) {
    if (el.tagName === 'SELECT') {
      var picked = Array.prototype.filter.call(el.options, function (o) { return o.selected; })
                        .map(function (o) { return o.value; });
      return picked.join(',').split(',');
    }
    return String(el.value || '').split(',');
  }

  /* اكتب القيمة بحيث يقرأها النموذج عند الحفظ.
     القائمة المنسدلة لا تحمل إلا قيمة أحد خياراتها، فنضيف خياراً مخفياً
     قيمته النص المجمّع ونجعله المختار — فيحفظ النموذج «أسفلت,كهرباء».
     A <select> can only hold one of its option values, so we append a
     hidden option whose value IS the joined string and select it. */
  function writeTrades(el, vals) {
    var joined = vals.join(',');
    if (el.tagName === 'SELECT') {
      var combo = el.querySelector('option[data-az-combined]');
      if (!combo) {
        combo = document.createElement('option');
        combo.setAttribute('data-az-combined', '1');
        el.appendChild(combo);
      }
      Array.prototype.forEach.call(el.options, function (o) { o.selected = false; });
      combo.value = joined;
      combo.textContent = joined;
      combo.selected = true;
    } else {
      el.value = joined;
    }
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function enhanceTrades() {
    var input = findTradesInput();
    if (!input || input.getAttribute('data-az-multi')) return;
    input.setAttribute('data-az-multi', '1');
    input.style.display = 'none';

    var box = document.createElement('select');
    box.multiple = true;
    box.size = 9;
    box.className = 'form-control';
    box.setAttribute('data-az-trades', '1');
    box.style.cssText = 'width:100%;min-height:210px;padding:4px;line-height:1.9';

    TRADES.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t[0];
      o.textContent = isAr() ? t[1] : t[2];
      o.style.padding = '5px 8px';
      box.appendChild(o);
    });

    var chosen = readTrades(input).map(function (s) { return s.trim(); });
    Array.prototype.forEach.call(box.options, function (o) {
      if (chosen.indexOf(o.value) !== -1) o.selected = true;
    });

    function sync() {
      var vals = Array.prototype.filter.call(box.options, function (o) { return o.selected; })
                      .map(function (o) { return o.value; });
      writeTrades(input, vals);
      count.textContent = vals.length
        ? L({ ar: 'المختار: ', en: 'Selected: ' }) +
          vals.map(function (v) { return L(TRADE_LABEL[v]); }).join(' · ')
        : L({ ar: 'لم تختر أي مهنة بعد', en: 'Nothing selected yet' });
    }

    /* نقرة واحدة تبدّل السطر · one plain click toggles a row */
    box.addEventListener('mousedown', function (ev) {
      if (ev.target && ev.target.tagName === 'OPTION') {
        ev.preventDefault();
        ev.target.selected = !ev.target.selected;
        box.focus();
        sync();
      }
    });

    var hint = document.createElement('div');
    hint.className = 'muted small';
    hint.style.margin = '6px 0 2px';
    hint.textContent = L({
      ar: 'انقر على أي مهنة لاختيارها، وانقر عليها ثانية لإلغائها. اختر ما شئت — واحدة أو كلها.',
      en: 'Click a trade to select it, click again to remove it. One, several, or all.' });

    var count = document.createElement('div');
    count.className = 'small';
    count.style.cssText = 'margin-top:6px;color:#1a7f37;font-weight:600';

    input.parentNode.insertBefore(hint, input.nextSibling);
    input.parentNode.insertBefore(box,  hint.nextSibling);
    input.parentNode.insertBefore(count, box.nextSibling);
    sync();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · نوع طلب الفحص — الردم والجيوجريد والخرسانة
     -------------------------------------------------------------------
     «بند العمل» كان نصاً حراً. عشرة مهندسين يكتبون الردم بعشر صيغ،
     فلا يمكن فرز الطلبات ولا حساب كم طلب ردم رُفض هذا الشهر.

     Work item was free text. Ten engineers write "backfill" ten ways,
     so the requests cannot be sorted and nobody can say how many
     backfill inspections were rejected this month.

     ومع كل نوع الاختبارات المطلوبة له — لأن أكثر سبب لرفض الطلب هو
     تقديمه بدون الاختبار الذي يطلبه الاستشاري لذلك النوع تحديداً.

     Each type carries the tests the consultant asks for, because the
     commonest reason a request is rejected is arriving without the one
     test that type requires.
     ═══════════════════════════════════════════════════════════════════ */
  var WORK_TYPE = [
    { value: 'earthworks',  label: { ar: 'ردم وإحلال',            en: 'Backfill & replacement' } },
    { value: 'excavation',  label: { ar: 'حفر',                   en: 'Excavation' } },
    { value: 'subgrade',    label: { ar: 'تسوية طبقة التأسيس',    en: 'Subgrade preparation' } },
    { value: 'subbase',     label: { ar: 'طبقة ما تحت الأساس',    en: 'Subbase course' } },
    { value: 'base',        label: { ar: 'طبقة الأساس',           en: 'Base course' } },
    { value: 'geogrid',     label: { ar: 'جيوجريد',               en: 'Geogrid' } },
    { value: 'geotextile',  label: { ar: 'جيوتكستايل / فرش',      en: 'Geotextile' } },
    { value: 'primecoat',   label: { ar: 'طبقة تشريب (برايم)',    en: 'Prime coat' } },
    { value: 'tackcoat',    label: { ar: 'طبقة لصق (تاك)',        en: 'Tack coat' } },
    { value: 'asphaltBase', label: { ar: 'أسفلت — طبقة رابطة',    en: 'Asphalt binder course' } },
    { value: 'asphaltWear', label: { ar: 'أسفلت — طبقة سطحية',    en: 'Asphalt wearing course' } },
    { value: 'concrete',    label: { ar: 'خرسانة مسلحة',          en: 'Reinforced concrete' } },
    { value: 'blinding',    label: { ar: 'خرسانة عادية (نظافة)',  en: 'Blinding concrete' } },
    { value: 'steelFixing', label: { ar: 'حدادة تسليح',           en: 'Steel fixing' } },
    { value: 'formwork',    label: { ar: 'نجارة وشدّات',          en: 'Formwork & falsework' } },
    { value: 'piling',      label: { ar: 'خوازيق',                en: 'Piling' } },
    { value: 'bearings',    label: { ar: 'كمرات وجلد',            en: 'Girders & bearings' } },
    { value: 'insulation',  label: { ar: 'عزل',                   en: 'Waterproofing' } },
    { value: 'drainage',    label: { ar: 'صرف ومواسير',           en: 'Drainage & pipework' } },
    { value: 'kerbs',       label: { ar: 'بردورات ورصف',          en: 'Kerbs & paving' } },
    { value: 'marking',     label: { ar: 'علامات وتخطيط',         en: 'Road marking & signs' } },
    { value: 'other',       label: { ar: 'أخرى',                  en: 'Other' } }
  ];

  /* الاختبارات المطلوبة لكل نوع — تظهر تحت الحقل فور اختياره */
  var TESTS = {
    earthworks:  { ar: 'نسبة الدمك (بروكتور) · منسوب · سُمك الطبقة · تدرّج مواد الردم · حدود أتربرج',
                   en: 'Compaction (Proctor) · levels · layer thickness · gradation · Atterberg limits' },
    excavation:  { ar: 'منسوب القاع · الأبعاد · ميول الجوانب · صلاحية التربة',
                   en: 'Formation level · dimensions · side slopes · soil suitability' },
    subgrade:    { ar: 'CBR · نسبة الدمك · المنسوب والميول · اختبار الهبوط',
                   en: 'CBR · compaction · levels and camber · proof rolling' },
    subbase:     { ar: 'التدرّج · نسبة الدمك · السُمك · معامل التآكل',
                   en: 'Gradation · compaction · thickness · LA abrasion' },
    base:        { ar: 'التدرّج · نسبة الدمك · السُمك · المنسوب · معامل التآكل',
                   en: 'Gradation · compaction · thickness · levels · LA abrasion' },
    geogrid:     { ar: 'شهادة المنشأ · قوة الشد · التراكب (overlap) · اتجاه الفرد · نظافة السطح أسفله',
                   en: 'Certificate of origin · tensile strength · overlap · roll direction · surface below' },
    geotextile:  { ar: 'شهادة المنشأ · الوزن (g/m²) · التراكب · التثبيت',
                   en: 'Certificate of origin · weight (g/m²) · overlap · pinning' },
    primecoat:   { ar: 'معدل الرش (لتر/م²) · درجة الحرارة · نظافة السطح · زمن التشرّب',
                   en: 'Spray rate (l/m²) · temperature · surface cleanliness · curing time' },
    tackcoat:    { ar: 'معدل الرش · درجة الحرارة · نظافة السطح',
                   en: 'Spray rate · temperature · surface cleanliness' },
    asphaltBase: { ar: 'تصميم الخلطة (JMF) · درجة حرارة الفرد والدمك · السُمك · الكثافة · مارشال',
                   en: 'Job mix formula · laying & compaction temperature · thickness · density · Marshall' },
    asphaltWear: { ar: 'تصميم الخلطة · درجة الحرارة · السُمك · الكثافة · الاستواء · الميول',
                   en: 'Mix design · temperature · thickness · density · regularity · cross-fall' },
    concrete:    { ar: 'الهبوط (سلامب) · مكعبات ٧ و٢٨ يوم · درجة حرارة الخلطة · الغطاء الخرساني · اعتماد النجارة والحدادة',
                   en: 'Slump · 7 & 28 day cubes · mix temperature · cover · formwork and steel approved' },
    blinding:    { ar: 'المنسوب · السُمك · نظافة القاع',
                   en: 'Level · thickness · clean formation' },
    steelFixing: { ar: 'أقطار وعدد الأسياخ · المسافات · أطوال الرباط · الغطاء الخرساني · شهادة الحديد',
                   en: 'Bar diameters and count · spacing · lap lengths · cover · mill certificate' },
    formwork:    { ar: 'الأبعاد والرأسية · إحكام الوصلات · الدهان (الزيت) · ثبات الشدّة',
                   en: 'Dimensions and plumb · joint tightness · release agent · falsework stability' },
    piling:      { ar: 'سجل الدق/الحفر · المنسوب · الرأسية · اختبار السلامة (PIT) · كسر المندة',
                   en: 'Driving/boring record · level · verticality · integrity test · pile head trimming' },
    bearings:    { ar: 'المنسوب · الاستواء · شهادة الجلد · المحاور',
                   en: 'Level · flatness · bearing certificate · alignment' },
    insulation:  { ar: 'نظافة السطح · التراكب · اختبار الغمر · الحماية فوقه',
                   en: 'Surface cleanliness · overlap · flood test · protection layer' },
    drainage:    { ar: 'الميول · المناسيب · اختبار التسريب · الفرشة والردم حول الماسورة',
                   en: 'Gradient · invert levels · leakage test · bedding and surround' },
    kerbs:       { ar: 'الاستقامة · المنسوب · المونة · فواصل التمدد',
                   en: 'Alignment · level · mortar bed · expansion joints' },
    marking:     { ar: 'الأبعاد · نوع الدهان · السماكة · العاكسية',
                   en: 'Dimensions · paint type · thickness · retro-reflectivity' }
  };

  addField('wir',
    F('workType', 'نوع العمل', 'Work type', 'select',
      { options: WORK_TYPE, required: true,
        section: { ar: 'موقع العمل', en: 'Work location' },
        help: { ar: 'اختر النوع أولاً — تظهر تحته الاختبارات التي يطلبها الاستشاري لهذا النوع',
                en: 'Choose the type first — the tests the consultant requires for it appear below' } }),
    'date');

  addField('wir',
    F('testsRequired', 'الاختبارات المطلوبة لهذا النوع', 'Tests required for this type', 'textarea',
      { readonly: true, full: true, section: { ar: 'البيانات الفنية', en: 'Technical data' },
        help: { ar: 'تُملأ تلقائياً حسب نوع العمل — تُرفق نتائجها من لوحة «المرفقات»',
                en: 'Filled automatically from the work type — attach the results in the Attachments panel' } }),
    'workType');

  /* نفس التصنيف لطلب فحص المواد، ليمكن الربط بينهما */
  addField('mir',
    F('workType', 'نوع العمل المرتبط', 'Related work type', 'select',
      { options: WORK_TYPE, section: { ar: 'البيانات الأساسية', en: 'Main information' } }),
    'date');

  /* املأ «الاختبارات المطلوبة» فور اختيار النوع.
     نراقب الحقل في الصفحة بدل تعديل entity.js. */
  function wireWorkType() {
    document.addEventListener('change', function (ev) {
      var el = ev.target;
      if (!el || el.name !== 'workType') return;
      var box = document.querySelector('[name="testsRequired"]');
      if (!box) return;
      var t = TESTS[el.value];
      box.value = t ? L(t) : '';
      /* أظهرها حتى لو كانت للقراءة فقط */
      box.setAttribute('title', box.value);
    }, true);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · زر «＋ مرفق» ظاهر — طلب أ. أحمد رقم ٣
     -------------------------------------------------------------------
     لوحة «المرفقات» موجودة أسفل كل مستند وتقبل PDF بالفعل، لكنها
     في آخر الصفحة فلم يرها. هذا يضع زراً في شريط الأدوات ينزل إليها.
     ═══════════════════════════════════════════════════════════════════ */
  function addAttachShortcut() {
    if (!global.Attachments) return;
    var host = document.querySelector('.modal .modal-footer, .form-actions, .detail-actions');
    if (!host || host.querySelector('#azAttachJump')) return;
    var b = document.createElement('button');
    b.id = 'azAttachJump';
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.textContent = L({ ar: '📎 مرفقات', en: '📎 Attachments' });
    b.onclick = function () {
      var panel = document.querySelector('[data-az-attachments], #azAttachPanel');
      if (panel && panel.scrollIntoView) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var input = panel.querySelector('#azAttachInput');
        if (input) setTimeout(function () { input.click(); }, 400);
      } else if (global.UI && UI.toast) {
        UI.toast(L({ ar: 'احفظ المستند أولاً ثم افتحه لإرفاق الملفات.',
                     en: 'Save the document first, then reopen it to attach files.' }), 'info');
      }
    };
    host.insertBefore(b, host.firstChild);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · توزيع الموظفين على المواقع — شاشة سريعة
     -------------------------------------------------------------------
     فتح كل موظف على حدة وتعديله وحفظه لأربعين شخصاً عمل ساعة.
     هذه قائمة واحدة: اسم الموظف بجواره قائمة المواقع. تُحفظ فوراً.
     ═══════════════════════════════════════════════════════════════════ */
  function siteOptions() {
    var rows = (global.Store && Store.all('sites')) || [];
    if (!rows.length && global.Sites && Sites.SEED) rows = Sites.SEED;
    return rows.filter(function (s) { return s.status !== 'inactive'; });
  }

  function assignPanel() {
    if (!global.Store || !global.UI) return;
    var emps = (Store.all('employees') || []).slice().sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
    var sites = siteOptions();

    if (!emps.length) {
      return UI.modal({
        title: L({ ar: 'لا يوجد موظفون بعد', en: 'No employees yet' }),
        body: '<p>' + esc(L({ ar: 'أضف الموظفين أولاً من شاشة «الموظفون»، أو استوردهم من ملف إكسل.',
                              en: 'Add employees first from the Employees screen, or import them from Excel.' })) + '</p>',
        buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-primary' }]
      });
    }

    var opts = '<option value="">' + esc(L({ ar: '— بلا موقع —', en: '— no site —' })) + '</option>' +
      sites.map(function (s) {
        return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
      }).join('');

    var rows = emps.map(function (e) {
      return '<tr>' +
        '<td style="padding:6px 10px">' + esc(e.name || e.id) + '</td>' +
        '<td style="padding:6px 10px;color:#667">' + esc(e.jobTitle || e.position || '') + '</td>' +
        '<td style="padding:6px 10px">' +
          '<select data-az-emp="' + esc(e.id) + '" style="min-width:210px;padding:5px">' +
            opts.replace('value="' + esc(e.site || '') + '"',
                         'value="' + esc(e.site || '') + '" selected') +
          '</select>' +
        '</td>' +
        '<td data-az-state="' + esc(e.id) + '" style="padding:6px 10px;width:90px"></td>' +
      '</tr>';
    }).join('');

    UI.modal({
      title: L({ ar: 'توزيع الموظفين على المواقع', en: 'Assign employees to sites' }),
      wide: true,
      body:
        '<p class="muted small">' + esc(L({
          ar: 'غيّر الموقع من القائمة — يُحفظ فوراً، لا حاجة لزر حفظ.',
          en: 'Change the site from the list — it saves immediately, no Save button needed.' })) + '</p>' +
        '<div style="max-height:60vh;overflow:auto"><table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="text-align:start;border-bottom:2px solid #ddd">' +
          '<th style="padding:8px 10px">' + esc(L({ ar: 'الموظف', en: 'Employee' })) + '</th>' +
          '<th style="padding:8px 10px">' + esc(L({ ar: 'الوظيفة', en: 'Job title' })) + '</th>' +
          '<th style="padding:8px 10px">' + esc(L({ ar: 'الموقع', en: 'Site' })) + '</th>' +
          '<th></th></tr></thead><tbody>' + rows + '</tbody></table></div>',
      buttons: [{ label: L({ ar: 'تم', en: 'Done' }), cls: 'btn-primary' }]
    });

    setTimeout(function () {
      document.querySelectorAll('[data-az-emp]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var id = sel.getAttribute('data-az-emp');
          var cell = document.querySelector('[data-az-state="' + id + '"]');
          var rec = Store.find('employees', id);
          if (!rec) return;
          rec.site = sel.value || null;
          Promise.resolve(Store.save('employees', rec)).then(function () {
            if (cell) cell.innerHTML = '<span style="color:#1a7f37">✓</span>';
          }).catch(function (err) {
            if (cell) cell.innerHTML = '<span style="color:#b42318" title="' +
              esc(err && err.message ? err.message : '') + '">✗</span>';
            console.error('[dc-requests] could not save site for ' + id, err);
          });
        });
      });
    }, 250);
  }

  function addAssignButton() {
    var host = document.querySelector('[data-x="export"]');
    if (!host || document.getElementById('azAssignSites')) return;
    var moduleId = (global.App && App.currentModule && App.currentModule()) || '';
    if (moduleId !== 'employees') return;
    if (!global.Auth || !Auth.can('employees', 'edit')) return;

    var b = document.createElement('button');
    b.id = 'azAssignSites';
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.textContent = L({ ar: '📍 توزيع المواقع', en: '📍 Assign sites' });
    b.onclick = assignPanel;
    host.parentNode.insertBefore(b, host);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · القائمة الجانبية — المجموعتان الغائبتان
     -------------------------------------------------------------------
     السبب الحقيقي لاختفاء «ضبط المستندات» و«الموقع والتنفيذ»:

     app.js يبني القائمة من خمس مجموعات مكتوبة بخط اليد داخل الكود:
         main · finance · projects · people · system
     ولا يقرأ Schema.GROUPS إطلاقاً. فمهما سجّل departments.js من
     مجموعات، ومهما كانت الصلاحيات صحيحة، لا تُرسم أبداً.

     THE ACTUAL CAUSE. app.js builds the sidebar from five group ids
     written by hand in the code and never reads Schema.GROUPS. So the
     screens existed, the group existed, Ahmed was permitted to open
     them — and the menu simply never drew them.

     لا نعدّل app.js. ننتظر حتى تُبنى القائمة ثم نضيف ما نقص، فيبقى
     الإصلاح قابلاً للتراجع بحذف هذا الملف وحده.
     We do not edit app.js. We wait until the menu is built and append
     what is missing, so deleting this one file reverts everything.
     ═══════════════════════════════════════════════════════════════════ */
  var NATIVE_GROUPS = ['main', 'finance', 'projects', 'people', 'system'];

  function addMissingNavGroups() {
    var nav = document.getElementById('mainNav');
    if (!nav || !nav.children.length) return;
    if (!global.Auth || !Auth.current || !Auth.current()) return;

    (S.GROUPS || []).forEach(function (g) {
      if (NATIVE_GROUPS.indexOf(g.id) !== -1) return;
      if (nav.querySelector('[data-az-group="' + g.id + '"]')) return;

      var mods = (S.MODULES || []).filter(function (m) {
        return m.group === g.id && Auth.canSee && Auth.canSee(m.id);
      });
      if (!mods.length) return;          /* لا شاشات مسموحة — لا تُرسم المجموعة */

      var gEl = document.createElement('div');
      gEl.className = 'nav-group';
      gEl.setAttribute('data-az-group', g.id);

      var title = document.createElement('div');
      title.className = 'nav-group-title';
      title.textContent = L(g.label);
      gEl.appendChild(title);

      var here = global.App && App.route ? App.route() : '';
      mods.forEach(function (m) {
        var b = document.createElement('button');
        b.className = 'nav-item' + (here === m.id ? ' active' : '');
        b.setAttribute('data-route', m.id);
        var ic = (global.UI && UI.icon) ? UI.icon(m.icon || 'file', 17) : '';
        b.innerHTML = '<span class="nav-icon">' + ic + '</span>' +
                      '<span class="nav-label">' + esc(L(m.label)) + '</span>';
        b.onclick = function () { if (global.App && App.go) App.go(m.id); };
        gEl.appendChild(b);
      });

      /* قبل «التقارير والنظام» — وهي دائماً آخر مجموعة */
      nav.insertBefore(gEl, nav.children[nav.children.length - 1] || null);
      console.info('[dc-requests] menu group «' + L(g.label) + '» added with ' +
                   mods.length + ' screen(s).');
    });
  }

  /* app.js يمسح القائمة ويعيد بناءها عند الدخول وعند تغيير اللغة،
     فنراقبها ونعيد الإضافة. الفحص أعلاه يمنع التكرار. */
  function watchNav() {
    var nav = document.getElementById('mainNav');
    if (!nav || nav.__azWatched) return;
    nav.__azWatched = true;
    new MutationObserver(function () { addMissingNavGroups(); })
      .observe(nav, { childList: true });
    addMissingNavGroups();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · لوحة تحكم للأدوار الجديدة
     -------------------------------------------------------------------
     roleview.js لا يعرف الأدوار الأربعة الجديدة، فيعطيها لوحة «الموظف
     العادي» — إجازاتي وتذاكري وتعميمات. لهذا كانت صفحة أحمد تقول
     «صفحتي» ولا تعرض شيئاً من عمله.
     roleview.js has no entry for the four new roles, so it falls back to
     the ordinary-employee dashboard. That is why Ahmed's page said
     «صفحتي» and showed leave requests instead of his documents.
     ═══════════════════════════════════════════════════════════════════ */
  function addRoleDashboards() {
    if (!global.RoleView || !RoleView.VIEWS || RoleView.VIEWS.document_control) return;
    RoleView.VIEWS.document_control = {
      title: { ar: 'لوحة ضبط المستندات', en: 'Document control desk' },
      money: false,
      kpis: ['inbox', 'alerts'],
      panels: ['alerts', 'myWork', 'quickActions']
    };
    RoleView.VIEWS.site_engineer = {
      title: { ar: 'لوحة الموقع', en: 'Site desk' },
      money: false,
      kpis: ['myProjects', 'inbox', 'alerts'],
      panels: ['alerts', 'myWork', 'quickActions']
    };
    RoleView.VIEWS.hr_manager = RoleView.VIEWS.hr || RoleView.VIEWS.employee;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · التشغيل
     ═══════════════════════════════════════════════════════════════════ */
  function tick() {
    addAssignButton(); addAttachShortcut(); enhanceTrades();
    watchNav(); addMissingNavGroups(); addRoleDashboards();
  }

  function start() {
    wireWorkType();
    var content = document.getElementById('content') || document.body;
    new MutationObserver(tick).observe(content, { childList: true, subtree: true });
    tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.DCRequests = {
    TRADES: TRADES, WORK_TYPE: WORK_TYPE, TESTS: TESTS,
    tradesOf: tradesOf, tradeCodes: tradeCodes, enhanceTrades: enhanceTrades,
    assignPanel: assignPanel, report: report,
    addMissingNavGroups: addMissingNavGroups, addRoleDashboards: addRoleDashboards
  };

  /* اطبع أسماء الحقول المتصادمة بدل عددها فقط. «حقل واحد موجود مسبقاً»
     لا تفيد أحداً؛ «trades موجود مسبقاً» تشرح المشكلة كلها.
     Name the colliding fields, don't just count them. "1 already
     existed" helps nobody; "trades already existed" explains everything. */
  console.info('dc-requests.js: ' + report.added.length + ' fields added' +
    (report.skipped.length ? ' · already existed: ' + report.skipped.join(', ') : '') +
    (report.missing.length ? ' · screens not found: ' + report.missing.join(', ') : '') + '.');

  /* شاشات ضبط المستندات موجودة في Schema لكنها لا تظهر في القائمة —
     هذه السطور تكشف السبب فوراً بدل البحث في لقطات الشاشة. */
  setTimeout(function () {
    if (!global.Schema || !global.Auth || !Auth.current) return;
    var want = ['docRegister', 'transmittals', 'rfi', 'submittals',
                'correspondence', 'distribution', 'docArchive', 'wir', 'mir'];
    var missing = want.filter(function (id) { return !Schema.get(id); });
    var hidden  = want.filter(function (id) { return Schema.get(id) && !Auth.can(id, 'view'); });
    var groups  = (Schema.GROUPS || []).map(function (g) { return g.id; });
    console.info('[dc-requests] role=' + (Auth.current() || {}).role +
      ' · screens missing from Schema: ' + (missing.join(',') || 'none') +
      ' · hidden by permissions: '       + (hidden.join(',')  || 'none') +
      ' · menu groups: ' + groups.join(','));
  }, 1200);
})(window);
