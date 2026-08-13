/* =========================================================================
   departments.js — القسمان الجديدان
     ١. مهندسو الموقع        Site Engineers
     ٢. ضبط المستندات (DC)   Document Control
   -------------------------------------------------------------------------
   هذا ملف إضافي. لا يعدّل schema.js إطلاقاً — يضيف فوقه فقط.
   This file is ADDITIVE. It does not modify schema.js at all; it registers
   two new departments on top of it. If you delete this file, the portal
   returns exactly to how it was.

   حمّله بعد schema.js وقبل auth.js.
   Load it AFTER schema.js and BEFORE auth.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('departments.js: schema.js must load first'); return; }

  var S = global.Schema;

  /* نفس مولّد الحقول المستخدم في schema.js */
  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var SEC = {
    main:  { ar: 'البيانات الأساسية', en: 'Main information' },
    loc:   { ar: 'الموقع والبند',     en: 'Location & work item' },
    tech:  { ar: 'البيانات الفنية',   en: 'Technical data' },
    dates: { ar: 'التواريخ',          en: 'Dates' },
    link:  { ar: 'الربط',             en: 'Links' },
    extra: { ar: 'بيانات إضافية',     en: 'Additional information' },
    hand:  { ar: 'التسليم والاستلام', en: 'Handover & receipt' }
  };

  /* ---------------- خيارات مشتركة ---------------- */
  var INSPECT_RESULT = [
    { value: 'pending',  label: { ar: 'في انتظار الفحص', en: 'Awaiting inspection' } },
    { value: 'approved', label: { ar: 'مقبول',            en: 'Approved' } },
    { value: 'cond',     label: { ar: 'مقبول بملاحظات',   en: 'Approved with comments' } },
    { value: 'rejected', label: { ar: 'مرفوض',            en: 'Rejected' } }
  ];

  var SEVERITY = [
    { value: 'minor',    label: { ar: 'بسيط',  en: 'Minor' } },
    { value: 'major',    label: { ar: 'جسيم',  en: 'Major' } },
    { value: 'critical', label: { ar: 'حرج',   en: 'Critical' } }
  ];

  var WEATHER = [
    { value: 'clear', label: { ar: 'صحو',   en: 'Clear' } },
    { value: 'hot',   label: { ar: 'حار',   en: 'Hot' } },
    { value: 'wind',  label: { ar: 'رياح',  en: 'Windy' } },
    { value: 'rain',  label: { ar: 'أمطار', en: 'Rain' } },
    { value: 'dust',  label: { ar: 'أتربة', en: 'Dust' } }
  ];

  var DOC_DIRECTION = [
    { value: 'in',  label: { ar: 'وارد',  en: 'Incoming' } },
    { value: 'out', label: { ar: 'صادر',  en: 'Outgoing' } }
  ];

  var DOC_KIND = [
    { value: 'drawing',  label: { ar: 'رسمة',            en: 'Drawing' } },
    { value: 'spec',     label: { ar: 'مواصفات',         en: 'Specification' } },
    { value: 'method',   label: { ar: 'أسلوب تنفيذ',     en: 'Method statement' } },
    { value: 'report',   label: { ar: 'تقرير',           en: 'Report' } },
    { value: 'letter',   label: { ar: 'خطاب',            en: 'Letter' } },
    { value: 'minutes',  label: { ar: 'محضر اجتماع',     en: 'Meeting minutes' } },
    { value: 'permit',   label: { ar: 'تصريح / ترخيص',   en: 'Permit / licence' } },
    { value: 'contract', label: { ar: 'عقد',             en: 'Contract' } },
    { value: 'other',    label: { ar: 'أخرى',            en: 'Other' } }
  ];

  var DOC_STATUS = [
    { value: 'draft',      label: { ar: 'مسودة',              en: 'Draft' } },
    { value: 'issued',     label: { ar: 'صادر للتنفيذ',       en: 'Issued for construction' } },
    { value: 'review',     label: { ar: 'تحت المراجعة',       en: 'Under review' } },
    { value: 'superseded', label: { ar: 'ملغاة — صدرت نسخة أحدث', en: 'Superseded' } },
    { value: 'void',       label: { ar: 'ملغاة نهائياً',      en: 'Void' } }
  ];

  var SUBMITTAL_TYPE = [
    { value: 'material', label: { ar: 'اعتماد مادة',        en: 'Material submittal' } },
    { value: 'drawing',  label: { ar: 'اعتماد رسمة',        en: 'Drawing submittal' } },
    { value: 'method',   label: { ar: 'اعتماد أسلوب تنفيذ', en: 'Method statement' } },
    { value: 'subcon',   label: { ar: 'اعتماد مقاول باطن',  en: 'Subcontractor approval' } },
    { value: 'sample',   label: { ar: 'عينة',               en: 'Sample' } }
  ];

  var PRIORITY = [
    { value: 'normal', label: { ar: 'عادي',  en: 'Normal' } },
    { value: 'urgent', label: { ar: 'عاجل',  en: 'Urgent' } },
    { value: 'block',  label: { ar: 'يوقف العمل', en: 'Blocking work' } }
  ];

  /* حقول التسليم والاستلام — تظهر في كل مستند */
  function handover() {
    return [
      F('preparedBy', 'أعدّه', 'Prepared by', 'ref',
        { ref: 'employees', refLabel: 'name', section: SEC.hand }),
      F('handedTo', 'سُلّم إلى', 'Handed to', 'text', { section: SEC.hand }),
      F('receivedBy', 'استلمه', 'Received by', 'text', { section: SEC.hand }),
      F('receivedDate', 'تاريخ الاستلام', 'Date received', 'date', { section: SEC.hand }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ];
  }

  /* =====================================================================
     ١ — مهندسو الموقع · SITE ENGINEERS
     ===================================================================== */
  var SITE_MODULES = [

    /* ---- طلب فحص أعمال ---- */
    {
      id: 'wir', table: 'wir', group: 'site', icon: 'clipboard',
      label: { ar: 'طلبات فحص الأعمال', en: 'Work inspection requests' },
      desc: { ar: 'طلب معاينة عمل منفّذ قبل تغطيته أو الانتقال للطبقة التالية',
              en: 'Request inspection of executed work before it is covered or the next layer starts' },
      workflow: true, docPrefix: 'WIR',
      fields: [
        F('docNo', 'رقم الطلب', 'Request no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'تاريخ الطلب', 'Request date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('inspectAt', 'موعد المعاينة المطلوب', 'Requested inspection time', 'date', { section: SEC.main }),
        F('priority', 'الأولوية', 'Priority', 'select',
          { options: PRIORITY, default: 'normal', section: SEC.main }),

        F('workItem', 'بند العمل', 'Work item', 'text',
          { required: true, section: SEC.loc,
            hint: { ar: 'مثال: طبقة أساس — كيلو ٣+٢٠٠ حتى ٣+٤٠٠', en: 'e.g. base course, ch. 3+200 to 3+400' } }),
        F('chainageFrom', 'من كيلومتر', 'Chainage from', 'text', { section: SEC.loc }),
        F('chainageTo', 'إلى كيلومتر', 'Chainage to', 'text', { section: SEC.loc }),
        F('layer', 'الطبقة / المنسوب', 'Layer / level', 'text', { section: SEC.loc }),
        F('quantity', 'الكمية المنفّذة', 'Executed quantity', 'number', { section: SEC.loc }),
        F('unit', 'الوحدة', 'Unit', 'select', { options: S.UNITS, section: SEC.loc }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref',
          { ref: 'costItems', refLabel: 'name', section: SEC.link }),

        F('drawingRef', 'الرسمة المرجعية ورقم المراجعة', 'Reference drawing & revision', 'text', { section: SEC.tech }),
        F('specRef', 'بند المواصفات', 'Specification clause', 'text', { section: SEC.tech }),
        F('testsAttached', 'نتائج الاختبارات مرفقة', 'Test results attached', 'checkbox', { section: SEC.tech }),
        F('testSummary', 'ملخص نتائج الاختبار', 'Test result summary', 'textarea',
          { section: SEC.tech, full: true,
            hint: { ar: 'نسبة الدمك · التدرج · الرطوبة · المناسيب', en: 'Compaction · gradation · moisture · levels' } }),

        F('result', 'نتيجة الفحص', 'Inspection result', 'select',
          { options: INSPECT_RESULT, default: 'pending', section: SEC.tech }),
        F('inspectedBy', 'اسم المهندس الفاحص (الاستشاري)', 'Inspected by (consultant)', 'text', { section: SEC.tech }),
        F('inspectionDate', 'تاريخ الفحص الفعلي', 'Actual inspection date', 'date', { section: SEC.dates }),
        F('comments', 'ملاحظات الاستشاري', 'Consultant comments', 'textarea', { section: SEC.tech, full: true }),
        F('reworkRequired', 'يحتاج إعادة عمل', 'Rework required', 'checkbox', { section: SEC.tech })
      ].concat(handover())
    },

    /* ---- طلب فحص مواد ---- */
    {
      id: 'mir', table: 'mir', group: 'site', icon: 'box',
      label: { ar: 'طلبات فحص المواد', en: 'Material inspection requests' },
      desc: { ar: 'طلب اعتماد مادة وردت للموقع قبل استخدامها',
              en: 'Request approval of a material delivered to site before it is used' },
      workflow: true, docPrefix: 'MIR',
      fields: [
        F('docNo', 'رقم الطلب', 'Request no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('item', 'الصنف', 'Item', 'ref',
          { ref: 'items', refLabel: 'name', required: true, section: SEC.main }),
        F('supplier', 'المورد', 'Supplier', 'ref', { ref: 'suppliers', refLabel: 'name', section: SEC.main }),
        F('quantity', 'الكمية الواردة', 'Delivered quantity', 'number', { section: SEC.main }),
        F('unit', 'الوحدة', 'Unit', 'select', { options: S.UNITS, section: SEC.main }),

        F('deliveryNote', 'رقم إذن التوريد', 'Delivery note no.', 'text', { section: SEC.tech }),
        F('goodsReceipt', 'إذن الاستلام المخزني', 'Goods receipt', 'ref',
          { ref: 'goodsReceipts', refLabel: 'docNo', section: SEC.link }),
        F('source', 'المحجر / المصنع المورّد', 'Source quarry / plant', 'text', { section: SEC.tech }),
        F('batchNo', 'رقم التشغيلة', 'Batch no.', 'text', { section: SEC.tech }),
        F('approvedSubmittal', 'رقم الاعتماد السابق للمادة', 'Approved submittal ref.', 'text', { section: SEC.tech }),
        F('testCert', 'شهادة اختبار مرفقة', 'Test certificate attached', 'checkbox', { section: SEC.tech }),
        F('testSummary', 'ملخص نتائج الاختبار', 'Test summary', 'textarea', { section: SEC.tech, full: true }),

        F('result', 'النتيجة', 'Result', 'select',
          { options: INSPECT_RESULT, default: 'pending', section: SEC.tech }),
        F('rejectedQty', 'الكمية المرفوضة', 'Rejected quantity', 'number', { section: SEC.tech }),
        F('rejectReason', 'سبب الرفض', 'Reason for rejection', 'textarea', { section: SEC.tech, full: true }),
        F('inspectionDate', 'تاريخ الفحص', 'Inspection date', 'date', { section: SEC.dates })
      ].concat(handover())
    },

    /* ---- إذن صب خرسانة ---- */
    {
      id: 'pourCards', table: 'pourCards', group: 'site', icon: 'layers',
      label: { ar: 'أذون صب الخرسانة', en: 'Concrete pour cards' },
      desc: { ar: 'تصريح الصب بعد اعتماد النجارة والحدادة والمناسيب',
              en: 'Pour permit after formwork, steel and levels are approved' },
      workflow: true, docPrefix: 'POUR',
      fields: [
        F('docNo', 'رقم الإذن', 'Card no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'تاريخ الصب', 'Pour date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('element', 'العنصر الإنشائي', 'Structural element', 'text',
          { required: true, section: SEC.loc,
            hint: { ar: 'قاعدة · عمود · كمرة · بلاطة · حائط ساند · وسادة كوبري',
                    en: 'Footing · column · beam · slab · retaining wall · bridge bearing pad' } }),
        F('location', 'الموقع / المحور', 'Location / axis', 'text', { section: SEC.loc }),
        F('volume', 'الكمية بالمتر المكعب', 'Volume (m³)', 'number', { required: true, section: SEC.loc }),

        F('grade', 'رتبة الخرسانة', 'Concrete grade', 'text',
          { section: SEC.tech, hint: { ar: 'مثال: ٣٠ نيوتن', en: 'e.g. C30' } }),
        F('slump', 'الهبوط المطلوب (سم)', 'Required slump (cm)', 'number', { section: SEC.tech }),
        F('plant', 'محطة الخرسانة', 'Batching plant', 'text', { section: SEC.tech }),
        F('cubesTaken', 'عدد المكعبات المأخوذة', 'Test cubes taken', 'number', { section: SEC.tech }),
        F('cureMethod', 'طريقة المعالجة', 'Curing method', 'text', { section: SEC.tech }),

        F('formworkOk', 'النجارة معتمدة', 'Formwork approved', 'checkbox', { section: SEC.tech }),
        F('steelOk', 'الحدادة معتمدة', 'Reinforcement approved', 'checkbox', { section: SEC.tech }),
        F('levelsOk', 'المناسيب معتمدة', 'Levels approved', 'checkbox', { section: SEC.tech }),
        F('wirRef', 'طلب فحص الأعمال المرتبط', 'Related WIR', 'ref',
          { ref: 'wir', refLabel: 'docNo', section: SEC.link }),
        F('startTime', 'وقت بدء الصب', 'Pour start time', 'text', { section: SEC.dates }),
        F('endTime', 'وقت انتهاء الصب', 'Pour end time', 'text', { section: SEC.dates }),
        F('weather', 'حالة الجو', 'Weather', 'select', { options: WEATHER, section: SEC.extra })
      ].concat(handover())
    },

    /* ---- سجل أعمال الأسفلت (خاص بالطرق) ---- */
    {
      id: 'asphaltRecords', table: 'asphaltRecords', group: 'site', icon: 'road',
      label: { ar: 'سجل أعمال الأسفلت والطبقات', en: 'Asphalt & pavement layer records' },
      desc: { ar: 'توثيق يومي لطبقات الرصف: الكميات والمناسيب والدمك والحرارة',
              en: 'Daily record of pavement layers: quantities, levels, compaction and temperature' },
      workflow: true, docPrefix: 'ASP',
      fields: [
        F('docNo', 'رقم السجل', 'Record no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('layerType', 'نوع الطبقة', 'Layer type', 'select', {
          options: [
            { value: 'subgrade', label: { ar: 'طبقة تأسيس', en: 'Subgrade' } },
            { value: 'subbase',  label: { ar: 'طبقة ما تحت الأساس', en: 'Sub-base' } },
            { value: 'base',     label: { ar: 'طبقة الأساس', en: 'Base course' } },
            { value: 'binder',   label: { ar: 'الطبقة الرابطة', en: 'Binder course' } },
            { value: 'wearing',  label: { ar: 'طبقة السطح', en: 'Wearing course' } },
            { value: 'prime',    label: { ar: 'رش تأسيسي', en: 'Prime coat' } },
            { value: 'tack',     label: { ar: 'رش لاصق', en: 'Tack coat' } }
          ], required: true, section: SEC.main
        }),
        F('chainageFrom', 'من كيلومتر', 'Chainage from', 'text', { section: SEC.loc }),
        F('chainageTo', 'إلى كيلومتر', 'Chainage to', 'text', { section: SEC.loc }),
        F('width', 'العرض (م)', 'Width (m)', 'number', { section: SEC.loc }),
        F('thickness', 'السُمك (سم)', 'Thickness (cm)', 'number', { section: SEC.loc }),
        F('area', 'المساحة (م٢)', 'Area (m²)', 'number', { section: SEC.loc }),
        F('tonnage', 'الكمية (طن)', 'Tonnage laid', 'number', { section: SEC.loc }),
        F('trucks', 'عدد السيارات', 'Number of trucks', 'number', { section: SEC.loc }),

        F('mixTemp', 'حرارة الخلطة عند التوريد (°م)', 'Mix temperature on delivery (°C)', 'number', { section: SEC.tech }),
        F('layTemp', 'حرارة الفرد (°م)', 'Laying temperature (°C)', 'number', { section: SEC.tech }),
        F('compaction', 'نسبة الدمك %', 'Compaction achieved %', 'percent', { section: SEC.tech }),
        F('coresTaken', 'عدد العينات المستخرجة', 'Cores taken', 'number', { section: SEC.tech }),
        F('plant', 'مصنع الخلطة', 'Asphalt plant', 'text', { section: SEC.tech }),
        F('equipmentUsed', 'المعدات المستخدمة', 'Equipment used', 'textarea', { section: SEC.tech, full: true }),
        F('weather', 'حالة الجو', 'Weather', 'select', { options: WEATHER, section: SEC.extra }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link })
      ].concat(handover())
    },

    /* ---- الرفع المساحي ---- */
    {
      id: 'surveyRecords', table: 'surveyRecords', group: 'site', icon: 'compass',
      label: { ar: 'محاضر الرفع المساحي والمناسيب', en: 'Survey & level records' },
      desc: { ar: 'إثبات المناسيب والإحداثيات قبل وبعد التنفيذ',
              en: 'Recorded levels and coordinates before and after execution' },
      workflow: true, docPrefix: 'SUR',
      fields: [
        F('docNo', 'رقم المحضر', 'Record no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('purpose', 'الغرض', 'Purpose', 'select', {
          options: [
            { value: 'setout',   label: { ar: 'توقيع وتخطيط', en: 'Setting out' } },
            { value: 'pre',      label: { ar: 'مناسيب قبل التنفيذ', en: 'Pre-execution levels' } },
            { value: 'post',     label: { ar: 'مناسيب بعد التنفيذ', en: 'Post-execution levels' } },
            { value: 'asbuilt',  label: { ar: 'كما نُفّذ', en: 'As-built' } },
            { value: 'quantity', label: { ar: 'حصر كميات', en: 'Quantity measurement' } }
          ], required: true, section: SEC.main
        }),
        F('chainageFrom', 'من كيلومتر', 'Chainage from', 'text', { section: SEC.loc }),
        F('chainageTo', 'إلى كيلومتر', 'Chainage to', 'text', { section: SEC.loc }),
        F('benchmark', 'النقطة الثابتة المرجعية', 'Benchmark reference', 'text', { section: SEC.tech }),
        F('instrument', 'الجهاز المستخدم', 'Instrument used', 'text', { section: SEC.tech }),
        F('designLevel', 'المنسوب التصميمي', 'Design level', 'number', { section: SEC.tech }),
        F('actualLevel', 'المنسوب المنفّذ', 'Actual level', 'number', { section: SEC.tech }),
        F('deviation', 'الفرق (سم)', 'Deviation (cm)', 'number', { section: SEC.tech }),
        F('withinTolerance', 'داخل حدود السماح', 'Within tolerance', 'checkbox', { section: SEC.tech }),
        F('surveyor', 'المساح', 'Surveyor', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.tech }),
        F('quantity', 'الكمية المحسوبة', 'Computed quantity', 'number', { section: SEC.loc }),
        F('unit', 'الوحدة', 'Unit', 'select', { options: S.UNITS, section: SEC.loc })
      ].concat(handover())
    },

    /* ---- توزيع العمالة اليومي ---- */
    {
      id: 'labourAllocation', table: 'labourAllocation', group: 'site', icon: 'users',
      label: { ar: 'توزيع العمالة والمعدات اليومي', en: 'Daily labour & equipment allocation' },
      desc: { ar: 'من عمل أين وعلى أي بند — أساس تحميل تكلفة العمالة على المشروع',
              en: 'Who worked where and on what item — the basis for charging labour cost to the project' },
      workflow: true, docPrefix: 'LAB',
      fields: [
        F('docNo', 'رقم الكشف', 'Sheet no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('shift', 'الوردية', 'Shift', 'select', {
          options: [
            { value: 'day',   label: { ar: 'نهارية', en: 'Day' } },
            { value: 'night', label: { ar: 'ليلية',  en: 'Night' } }
          ], default: 'day', section: SEC.main
        }),
        F('weather', 'حالة الجو', 'Weather', 'select', { options: WEATHER, section: SEC.main }),
        F('workStopped', 'توقف العمل', 'Work stopped', 'checkbox', { section: SEC.main }),
        F('stopReason', 'سبب التوقف', 'Reason for stoppage', 'textarea', { section: SEC.main, full: true }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link })
      ].concat(handover()),
      lines: {
        label: { ar: 'العمالة والمعدات', en: 'Labour & equipment' },
        fields: [
          F('employee', 'الموظف / العامل', 'Employee / worker', 'ref', { ref: 'employees', refLabel: 'name' }),
          F('trade', 'المهنة', 'Trade', 'text'),
          F('count', 'العدد', 'Count', 'number'),
          F('hours', 'عدد الساعات', 'Hours', 'number'),
          F('overtime', 'ساعات إضافية', 'Overtime hours', 'number'),
          F('equipment', 'المعدة', 'Equipment', 'ref', { ref: 'equipment', refLabel: 'name' }),
          F('workDone', 'العمل المنفّذ', 'Work performed', 'text')
        ]
      }
    },

    /* ---- عدم المطابقة ---- */
    {
      id: 'ncr', table: 'ncr', group: 'site', icon: 'alert',
      label: { ar: 'تقارير عدم المطابقة', en: 'Non-conformance reports' },
      desc: { ar: 'توثيق عمل مخالف للمواصفات وإجراء التصحيح ومن يتحمّل التكلفة',
              en: 'Work not matching specification, the corrective action and who bears the cost' },
      workflow: true, docPrefix: 'NCR',
      fields: [
        F('docNo', 'رقم التقرير', 'Report no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'تاريخ الرصد', 'Date raised', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('raisedBy', 'جهة الرصد', 'Raised by', 'select', {
          options: [
            { value: 'internal',   label: { ar: 'داخلي (الشركة)', en: 'Internal (company)' } },
            { value: 'consultant', label: { ar: 'الاستشاري',      en: 'Consultant' } },
            { value: 'client',     label: { ar: 'العميل',         en: 'Client' } }
          ], section: SEC.main
        }),
        F('severity', 'درجة الخطورة', 'Severity', 'select',
          { options: SEVERITY, default: 'minor', required: true, section: SEC.main }),
        F('location', 'الموقع', 'Location', 'text', { section: SEC.loc }),
        F('workItem', 'بند العمل', 'Work item', 'text', { section: SEC.loc }),
        F('description', 'وصف المخالفة', 'Description of non-conformance', 'textarea',
          { required: true, section: SEC.tech, full: true }),
        F('specRef', 'بند المواصفات المخالَف', 'Specification clause breached', 'text', { section: SEC.tech }),
        F('rootCause', 'السبب الجذري', 'Root cause', 'textarea', { section: SEC.tech, full: true }),
        F('correctiveAction', 'الإجراء التصحيحي', 'Corrective action', 'textarea', { section: SEC.tech, full: true }),
        F('preventiveAction', 'الإجراء الوقائي لمنع التكرار', 'Preventive action', 'textarea', { section: SEC.tech, full: true }),
        F('responsibleParty', 'الجهة المسؤولة', 'Responsible party', 'select', {
          options: [
            { value: 'company',    label: { ar: 'الشركة',        en: 'The company' } },
            { value: 'subcon',     label: { ar: 'مقاول باطن',    en: 'Subcontractor' } },
            { value: 'supplier',   label: { ar: 'مورد',          en: 'Supplier' } },
            { value: 'design',     label: { ar: 'خطأ تصميمي',    en: 'Design error' } }
          ], section: SEC.tech
        }),
        F('subcontractor', 'مقاول الباطن المسؤول', 'Subcontractor responsible', 'ref',
          { ref: 'subcontractors', refLabel: 'name', section: SEC.link }),
        F('reworkCost', 'تكلفة إعادة العمل', 'Rework cost', 'money', { section: SEC.tech }),
        F('backChargeSub', 'تُخصم من مستخلص مقاول الباطن', 'Back-charged to subcontractor', 'checkbox', { section: SEC.tech }),
        F('targetCloseDate', 'تاريخ الإغلاق المستهدف', 'Target closure date', 'date', { section: SEC.dates }),
        F('actualCloseDate', 'تاريخ الإغلاق الفعلي', 'Actual closure date', 'date', { section: SEC.dates }),
        F('closed', 'مُغلق', 'Closed', 'checkbox', { section: SEC.dates })
      ].concat(handover())
    },

    /* ---- تعليمات الموقع ---- */
    {
      id: 'siteInstructions', table: 'siteInstructions', group: 'site', icon: 'megaphone',
      label: { ar: 'تعليمات الموقع', en: 'Site instructions' },
      desc: { ar: 'التعليمات الواردة من الاستشاري أو العميل — وهل تحمل تكلفة إضافية',
              en: 'Instructions from the consultant or client — and whether they carry extra cost' },
      workflow: true, docPrefix: 'SI',
      fields: [
        F('docNo', 'رقم التعليمات', 'Instruction no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('issuedBy', 'الجهة المُصدرة', 'Issued by', 'text', { required: true, section: SEC.main }),
        F('refNo', 'رقم مرجع الجهة المصدرة', 'Their reference no.', 'text', { section: SEC.main }),
        F('instruction', 'نص التعليمات', 'Instruction', 'textarea',
          { required: true, section: SEC.tech, full: true }),
        F('costImpact', 'له أثر على التكلفة', 'Has cost impact', 'checkbox', { section: SEC.tech }),
        F('estimatedCost', 'التكلفة التقديرية', 'Estimated cost', 'money', { section: SEC.tech }),
        F('timeImpact', 'له أثر على المدة', 'Has time impact', 'checkbox', { section: SEC.tech }),
        F('daysImpact', 'عدد الأيام', 'Days impact', 'number', { section: SEC.tech }),
        F('variationRaised', 'صدر أمر تغيير', 'Variation order raised', 'checkbox', { section: SEC.tech }),
        F('variationRef', 'رقم أمر التغيير', 'Variation reference', 'text', { section: SEC.tech }),
        F('actionTaken', 'الإجراء المتخذ', 'Action taken', 'textarea', { section: SEC.tech, full: true }),
        F('dueDate', 'تاريخ التنفيذ المطلوب', 'Required by', 'date', { section: SEC.dates })
      ].concat(handover())
    },

    /* ---- السلامة ---- */
    {
      id: 'safetyReports', table: 'safetyReports', group: 'site', icon: 'shield',
      label: { ar: 'السلامة والحوادث', en: 'Safety observations & incidents' },
      desc: { ar: 'الملاحظات والحوادث وأشباه الحوادث وإجراءات المعالجة',
              en: 'Observations, incidents, near-misses and what was done about them' },
      workflow: true, docPrefix: 'HSE',
      fields: [
        F('docNo', 'رقم التقرير', 'Report no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('kind', 'النوع', 'Type', 'select', {
          options: [
            { value: 'observation', label: { ar: 'ملاحظة',        en: 'Observation' } },
            { value: 'nearmiss',    label: { ar: 'شبه حادث',      en: 'Near miss' } },
            { value: 'firstaid',    label: { ar: 'إسعافات أولية', en: 'First aid case' } },
            { value: 'injury',      label: { ar: 'إصابة',         en: 'Injury' } },
            { value: 'damage',      label: { ar: 'تلف ممتلكات',   en: 'Property damage' } },
            { value: 'toolbox',     label: { ar: 'اجتماع سلامة',  en: 'Toolbox talk' } }
          ], required: true, section: SEC.main
        }),
        F('severity', 'درجة الخطورة', 'Severity', 'select', { options: SEVERITY, section: SEC.main }),
        F('location', 'المكان', 'Location', 'text', { section: SEC.loc }),
        F('personInvolved', 'الشخص المعني', 'Person involved', 'ref',
          { ref: 'employees', refLabel: 'name', section: SEC.loc }),
        F('description', 'الوصف', 'Description', 'textarea', { required: true, section: SEC.tech, full: true }),
        F('immediateAction', 'الإجراء الفوري', 'Immediate action', 'textarea', { section: SEC.tech, full: true }),
        F('correctiveAction', 'الإجراء التصحيحي', 'Corrective action', 'textarea', { section: SEC.tech, full: true }),
        F('lostDays', 'أيام العمل المفقودة', 'Lost work days', 'number', { section: SEC.tech }),
        F('reportedToAuthority', 'أُبلغت الجهات الرسمية', 'Reported to authorities', 'checkbox', { section: SEC.tech }),
        F('closed', 'مُغلق', 'Closed', 'checkbox', { section: SEC.dates })
      ].concat(handover())
    }
  ];

  /* =====================================================================
     ٢ — ضبط المستندات · DOCUMENT CONTROL
     ===================================================================== */
  var DC_MODULES = [

    /* ---- سجل المستندات الرئيسي ---- */
    {
      id: 'docRegister', table: 'docRegister', group: 'dc', icon: 'folder',
      label: { ar: 'سجل المستندات الرئيسي', en: 'Master document register' },
      desc: { ar: 'كل مستند في الشركة برقمه ومراجعته وحالته — المصدر الوحيد للحقيقة',
              en: 'Every document with its number, revision and status — the single source of truth' },
      workflow: true, docPrefix: 'DOC',
      fields: [
        F('docCode', 'كود المستند', 'Document code', 'text',
          { required: true, section: SEC.main,
            hint: { ar: 'مثال: AZ-P01-DRW-STR-0012', en: 'e.g. AZ-P01-DRW-STR-0012' } }),
        F('title', 'اسم المستند', 'Document title', 'text', { required: true, section: SEC.main }),
        F('kind', 'نوع المستند', 'Document type', 'select',
          { options: DOC_KIND, required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.main }),
        F('discipline', 'التخصص', 'Discipline', 'select', {
          options: [
            { value: 'civil',   label: { ar: 'مدني',        en: 'Civil' } },
            { value: 'struct',  label: { ar: 'إنشائي',      en: 'Structural' } },
            { value: 'road',    label: { ar: 'طرق',         en: 'Roads' } },
            { value: 'bridge',  label: { ar: 'كباري',       en: 'Bridges' } },
            { value: 'survey',  label: { ar: 'مساحة',       en: 'Survey' } },
            { value: 'elect',   label: { ar: 'كهرباء',      en: 'Electrical' } },
            { value: 'mech',    label: { ar: 'ميكانيكا',    en: 'Mechanical' } },
            { value: 'hse',     label: { ar: 'سلامة',       en: 'HSE' } },
            { value: 'admin',   label: { ar: 'إداري',       en: 'Administrative' } }
          ], section: SEC.main
        }),

        F('revision', 'رقم المراجعة', 'Revision', 'text',
          { required: true, section: SEC.tech,
            hint: { ar: 'مثال: Rev 0 · Rev A · Rev 2', en: 'e.g. Rev 0 · Rev A · Rev 2' } }),
        F('revisionDate', 'تاريخ المراجعة', 'Revision date', 'date', { section: SEC.tech }),
        F('status', 'حالة المستند', 'Document status', 'select',
          { options: DOC_STATUS, default: 'draft', required: true, section: SEC.tech }),
        F('supersedes', 'يلغي المراجعة السابقة رقم', 'Supersedes revision', 'text', { section: SEC.tech }),
        F('supersededBy', 'أُلغيت بالمراجعة رقم', 'Superseded by revision', 'text', { section: SEC.tech }),
        F('revisionReason', 'سبب إصدار المراجعة', 'Reason for revision', 'textarea', { section: SEC.tech, full: true }),

        F('originator', 'الجهة المُصدرة', 'Originator', 'text', { section: SEC.extra }),
        F('confidential', 'سرّي — توزيع محدود', 'Confidential — restricted distribution', 'checkbox', { section: SEC.extra }),
        F('hardCopyLocation', 'مكان النسخة الورقية', 'Hard copy location', 'text', { section: SEC.extra }),
        F('fileLink', 'رابط أو مسار الملف', 'File link or path', 'text', { section: SEC.extra }),
        F('retentionYears', 'مدة الحفظ (سنوات)', 'Retention period (years)', 'number', { section: SEC.extra }),
        F('issuedToSite', 'صدرت للموقع', 'Issued to site', 'checkbox', { section: SEC.tech }),
        F('oldCopyRecalled', 'سُحبت النسخة القديمة من الموقع', 'Superseded copy recalled from site', 'checkbox',
          { section: SEC.tech,
            hint: { ar: 'أهم خانة في الشاشة كلها — النسخة القديمة في الموقع تعني إعادة عمل',
                    en: 'The most important box on this screen — an old copy on site means rework' } })
      ].concat(handover())
    },

    /* ---- مذكرات الإرسال ---- */
    {
      id: 'transmittals', table: 'transmittals', group: 'dc', icon: 'send',
      label: { ar: 'مذكرات الإرسال', en: 'Transmittals' },
      desc: { ar: 'إثبات ما أُرسل ولمن ومتى واستُلم — حمايتك القانونية عند أي خلاف',
              en: 'Proof of what was sent, to whom, when and its receipt — your legal protection in a dispute' },
      workflow: true, docPrefix: 'TRN',
      fields: [
        F('docNo', 'رقم المذكرة', 'Transmittal no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('direction', 'الاتجاه', 'Direction', 'select',
          { options: DOC_DIRECTION, default: 'out', required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.main }),
        F('party', 'الجهة', 'Party', 'text',
          { required: true, section: SEC.main,
            hint: { ar: 'الاستشاري · العميل · مقاول باطن · جهة حكومية', en: 'Consultant · client · subcontractor · authority' } }),
        F('attention', 'عناية السيد', 'For the attention of', 'text', { section: SEC.main }),
        F('subject', 'الموضوع', 'Subject', 'text', { required: true, section: SEC.main }),
        F('purpose', 'الغرض', 'Purpose', 'select', {
          options: [
            { value: 'approval',  label: { ar: 'للاعتماد',      en: 'For approval' } },
            { value: 'review',    label: { ar: 'للمراجعة',      en: 'For review' } },
            { value: 'info',      label: { ar: 'للعلم',         en: 'For information' } },
            { value: 'construct', label: { ar: 'للتنفيذ',       en: 'For construction' } },
            { value: 'record',    label: { ar: 'للحفظ',         en: 'For records' } }
          ], section: SEC.main
        }),
        F('method', 'وسيلة الإرسال', 'Delivery method', 'select', {
          options: [
            { value: 'hand',   label: { ar: 'باليد',        en: 'By hand' } },
            { value: 'email',  label: { ar: 'بريد إلكتروني', en: 'Email' } },
            { value: 'post',   label: { ar: 'بريد',          en: 'Post' } },
            { value: 'portal', label: { ar: 'منصة إلكترونية', en: 'Online portal' } }
          ], section: SEC.tech
        }),
        F('acknowledged', 'وصل استلام موقّع', 'Signed acknowledgement received', 'checkbox', { section: SEC.tech }),
        F('acknowledgedBy', 'اسم المستلم لدى الجهة', 'Acknowledged by (their side)', 'text', { section: SEC.tech }),
        F('acknowledgedDate', 'تاريخ الاستلام', 'Acknowledgement date', 'date', { section: SEC.dates }),
        F('replyDue', 'موعد الرد المطلوب', 'Reply due by', 'date', { section: SEC.dates }),
        F('replyReceived', 'تم الرد', 'Reply received', 'checkbox', { section: SEC.dates })
      ].concat(handover()),
      lines: {
        label: { ar: 'المستندات المرسلة', en: 'Documents transmitted' },
        fields: [
          F('document', 'المستند', 'Document', 'ref', { ref: 'docRegister', refLabel: 'docCode' }),
          F('docCode', 'كود المستند', 'Document code', 'text'),
          F('title', 'الاسم', 'Title', 'text'),
          F('revision', 'المراجعة', 'Revision', 'text'),
          F('copies', 'عدد النسخ', 'Copies', 'number'),
          F('format', 'الصيغة', 'Format', 'text')
        ]
      }
    },

    /* ---- طلبات المعلومات ---- */
    {
      id: 'rfi', table: 'rfi', group: 'dc', icon: 'help',
      label: { ar: 'طلبات المعلومات (RFI)', en: 'Requests for information (RFI)' },
      desc: { ar: 'الأسئلة الفنية المرسلة للاستشاري ومتابعة الرد — كل يوم تأخير قد يكون مطالبة',
              en: 'Technical questions to the consultant and reply tracking — each day of delay may be a claim' },
      workflow: true, docPrefix: 'RFI',
      fields: [
        F('docNo', 'رقم الطلب', 'RFI no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'تاريخ الإرسال', 'Date raised', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('raisedBy', 'مقدّم الطلب', 'Raised by', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('toParty', 'موجّه إلى', 'Directed to', 'text', { required: true, section: SEC.main }),
        F('priority', 'الأولوية', 'Priority', 'select',
          { options: PRIORITY, default: 'normal', section: SEC.main }),
        F('subject', 'الموضوع', 'Subject', 'text', { required: true, section: SEC.main }),
        F('question', 'نص السؤال', 'Question', 'textarea', { required: true, section: SEC.tech, full: true }),
        F('drawingRef', 'الرسمة المرجعية', 'Reference drawing', 'text', { section: SEC.tech }),
        F('specRef', 'بند المواصفات', 'Specification clause', 'text', { section: SEC.tech }),
        F('proposedAnswer', 'الحل المقترح من جانبنا', 'Our proposed answer', 'textarea', { section: SEC.tech, full: true }),
        F('replyDue', 'موعد الرد المطلوب', 'Reply required by', 'date', { required: true, section: SEC.dates }),
        F('replyDate', 'تاريخ الرد الفعلي', 'Actual reply date', 'date', { section: SEC.dates }),
        F('answer', 'الرد الوارد', 'Answer received', 'textarea', { section: SEC.tech, full: true }),
        F('daysDelayed', 'أيام التأخير في الرد', 'Days delayed', 'number', { section: SEC.dates }),
        F('workStopped', 'أوقف العمل', 'Work was stopped', 'checkbox', { section: SEC.tech }),
        F('costImpact', 'له أثر على التكلفة', 'Has cost impact', 'checkbox', { section: SEC.tech }),
        F('claimRaised', 'قُدّمت مطالبة', 'Claim raised', 'checkbox', { section: SEC.tech }),
        F('closed', 'مُغلق', 'Closed', 'checkbox', { section: SEC.dates })
      ].concat(handover())
    },

    /* ---- الاعتمادات ---- */
    {
      id: 'submittals', table: 'submittals', group: 'dc', icon: 'check',
      label: { ar: 'الاعتمادات (مواد ورسومات ومقاولين)', en: 'Submittals (materials, drawings, subcontractors)' },
      desc: { ar: 'ما قُدّم للاستشاري لاعتماده وحالته — لا تشترِ مادة قبل اعتمادها',
              en: 'What was submitted for the consultant to approve and its status — never buy a material before it is approved' },
      workflow: true, docPrefix: 'SUB',
      fields: [
        F('docNo', 'رقم الاعتماد', 'Submittal no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'تاريخ التقديم', 'Date submitted', 'date', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref',
          { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('type', 'نوع الاعتماد', 'Submittal type', 'select',
          { options: SUBMITTAL_TYPE, required: true, section: SEC.main }),
        F('title', 'الوصف', 'Description', 'text', { required: true, section: SEC.main }),
        F('item', 'الصنف', 'Item', 'ref', { ref: 'items', refLabel: 'name', section: SEC.link }),
        F('supplier', 'المورد المقترح', 'Proposed supplier', 'ref',
          { ref: 'suppliers', refLabel: 'name', section: SEC.link }),
        F('subcontractor', 'مقاول الباطن المقترح', 'Proposed subcontractor', 'ref',
          { ref: 'subcontractors', refLabel: 'name', section: SEC.link }),
        F('specRef', 'بند المواصفات', 'Specification clause', 'text', { section: SEC.tech }),
        F('revision', 'رقم التقديم', 'Submission number', 'number',
          { default: 1, section: SEC.tech,
            hint: { ar: 'التقديم الأول ١ · إعادة التقديم ٢ وهكذا', en: 'First submission 1, re-submission 2, etc.' } }),
        F('result', 'النتيجة', 'Result', 'select', {
          options: [
            { value: 'pending',   label: { ar: 'قيد المراجعة',            en: 'Under review' } },
            { value: 'approved',  label: { ar: 'معتمد',                   en: 'Approved' } },
            { value: 'cond',      label: { ar: 'معتمد بملاحظات',          en: 'Approved with comments' } },
            { value: 'resubmit',  label: { ar: 'يُعاد التقديم',           en: 'Revise and resubmit' } },
            { value: 'rejected',  label: { ar: 'مرفوض',                   en: 'Rejected' } }
          ], default: 'pending', section: SEC.tech
        }),
        F('replyDue', 'موعد الرد المطلوب', 'Reply required by', 'date', { section: SEC.dates }),
        F('replyDate', 'تاريخ الرد', 'Reply date', 'date', { section: SEC.dates }),
        F('comments', 'ملاحظات الاستشاري', 'Consultant comments', 'textarea', { section: SEC.tech, full: true }),
        F('validUntil', 'الاعتماد سارٍ حتى', 'Approval valid until', 'date', { section: SEC.dates }),
        F('purchaseBlocked', 'لا يجوز الشراء قبل الاعتماد', 'Purchase blocked until approved', 'checkbox',
          { default: true, section: SEC.tech })
      ].concat(handover())
    },

    /* ---- المراسلات ---- */
    {
      id: 'correspondence', table: 'correspondence', group: 'dc', icon: 'mail',
      label: { ar: 'المراسلات الواردة والصادرة', en: 'Incoming & outgoing correspondence' },
      desc: { ar: 'سجل الخطابات الرسمية ومتابعة الردود والمواعيد التعاقدية',
              en: 'Register of official letters, reply tracking and contractual deadlines' },
      workflow: true, docPrefix: 'LTR',
      fields: [
        F('docNo', 'رقم الخطاب', 'Letter no.', 'text', { readonly: true, section: SEC.main }),
        F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
        F('direction', 'الاتجاه', 'Direction', 'select',
          { options: DOC_DIRECTION, required: true, section: SEC.main }),
        F('theirRef', 'رقم مرجع الجهة الأخرى', 'Their reference', 'text', { section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.main }),
        F('party', 'الجهة', 'Party', 'text', { required: true, section: SEC.main }),
        F('subject', 'الموضوع', 'Subject', 'text', { required: true, section: SEC.main }),
        F('summary', 'الملخص', 'Summary', 'textarea', { section: SEC.tech, full: true }),
        F('category', 'التصنيف', 'Category', 'select', {
          options: [
            { value: 'technical',  label: { ar: 'فني',            en: 'Technical' } },
            { value: 'commercial', label: { ar: 'تجاري / مالي',   en: 'Commercial / financial' } },
            { value: 'claim',      label: { ar: 'مطالبة',         en: 'Claim' } },
            { value: 'delay',      label: { ar: 'تأخير / تمديد',  en: 'Delay / extension of time' } },
            { value: 'notice',     label: { ar: 'إخطار تعاقدي',   en: 'Contractual notice' } },
            { value: 'general',    label: { ar: 'عام',            en: 'General' } }
          ], section: SEC.tech
        }),
        F('contractualNotice', 'إخطار تعاقدي له مدة محددة', 'Time-barred contractual notice', 'checkbox',
          { section: SEC.tech,
            hint: { ar: 'إن فات الموعد يسقط الحق في المطالبة', en: 'Missing the deadline forfeits the right to claim' } }),
        F('noticeDeadline', 'آخر موعد للإخطار', 'Notice deadline', 'date', { section: SEC.dates }),
        F('replyDue', 'موعد الرد', 'Reply due', 'date', { section: SEC.dates }),
        F('replyRef', 'رقم الخطاب المرتبط', 'Related letter', 'text', { section: SEC.link }),
        F('replied', 'تم الرد', 'Replied', 'checkbox', { section: SEC.dates }),
        F('signedBy', 'موقّع من', 'Signed by', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.extra }),
        F('confidential', 'سرّي', 'Confidential', 'checkbox', { section: SEC.extra })
      ].concat(handover())
    },

    /* ---- مصفوفة التوزيع ---- */
    {
      id: 'distribution', table: 'distribution', group: 'dc', icon: 'share',
      label: { ar: 'مصفوفة التوزيع', en: 'Distribution matrix' },
      desc: { ar: 'من يستلم أي نوع من المستندات — يمنع أن يعمل أحد برسمة قديمة',
              en: 'Who receives which document type — stops anyone working from an outdated drawing' },
      fields: [
        F('name', 'اسم القاعدة', 'Rule name', 'text', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.main }),
        F('docKind', 'نوع المستند', 'Document type', 'select',
          { options: DOC_KIND, required: true, section: SEC.main }),
        F('discipline', 'التخصص', 'Discipline', 'text', { section: SEC.main }),
        F('active', 'سارية', 'Active', 'checkbox', { default: true, section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'المستلمون', en: 'Recipients' },
        fields: [
          F('employee', 'الموظف', 'Employee', 'ref', { ref: 'employees', refLabel: 'name' }),
          F('externalName', 'جهة خارجية', 'External party', 'text'),
          F('copies', 'عدد النسخ', 'Copies', 'number'),
          F('purpose', 'الغرض', 'Purpose', 'text'),
          F('mustAcknowledge', 'يوقّع بالاستلام', 'Must acknowledge', 'checkbox')
        ]
      }
    },

    /* ---- الأرشيف ---- */
    {
      id: 'docArchive', table: 'docArchive', group: 'dc', icon: 'archive',
      label: { ar: 'الأرشيف والحفظ', en: 'Archive & retention' },
      desc: { ar: 'أين حُفظ المستند الورقي ومتى ينتهي أجل حفظه ومن استعاره',
              en: 'Where the paper document is stored, when its retention ends and who borrowed it' },
      fields: [
        F('boxNo', 'رقم الصندوق / الملف', 'Box / file no.', 'text', { required: true, section: SEC.main }),
        F('title', 'المحتوى', 'Contents', 'text', { required: true, section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.main }),
        F('kind', 'نوع المستندات', 'Document type', 'select', { options: DOC_KIND, section: SEC.main }),
        F('yearFrom', 'من سنة', 'From year', 'number', { section: SEC.main }),
        F('yearTo', 'إلى سنة', 'To year', 'number', { section: SEC.main }),
        F('location', 'مكان الحفظ', 'Storage location', 'text',
          { required: true, section: SEC.tech,
            hint: { ar: 'المبنى · الغرفة · الرف', en: 'Building · room · shelf' } }),
        F('retentionUntil', 'يُحفظ حتى تاريخ', 'Retain until', 'date', { section: SEC.dates }),
        F('destroyed', 'أُعدم', 'Destroyed', 'checkbox', { section: SEC.dates }),
        F('borrowedBy', 'مُستعار بواسطة', 'Borrowed by', 'ref',
          { ref: 'employees', refLabel: 'name', section: SEC.tech }),
        F('borrowedDate', 'تاريخ الاستعارة', 'Borrowed on', 'date', { section: SEC.dates }),
        F('returnedDate', 'تاريخ الإرجاع', 'Returned on', 'date', { section: SEC.dates }),
        F('scanned', 'مُصوّر إلكترونياً', 'Scanned', 'checkbox', { section: SEC.tech }),
        F('fileLink', 'رابط النسخة الإلكترونية', 'Electronic copy link', 'text', { section: SEC.tech }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    }
  ];

  /* =====================================================================
     التسجيل — REGISTRATION
     ===================================================================== */
  var NEW_GROUPS = [
    { id: 'site', label: { ar: 'الموقع والتنفيذ',  en: 'Site & Execution' } },
    { id: 'dc',   label: { ar: 'ضبط المستندات',    en: 'Document Control' } }
  ];

  /* أضف المجموعتين قبل مجموعة «التقارير والنظام» */
  var sysIndex = S.GROUPS.map(function (g) { return g.id; }).indexOf('system');
  if (sysIndex === -1) sysIndex = S.GROUPS.length;
  NEW_GROUPS.forEach(function (g, i) {
    if (!S.GROUPS.some(function (x) { return x.id === g.id; })) S.GROUPS.splice(sysIndex + i, 0, g);
  });

  var NEW_MODULES = SITE_MODULES.concat(DC_MODULES);
  var extraById = {};

  NEW_MODULES.forEach(function (m) {
    if (!S.MODULES.some(function (x) { return x.id === m.id; })) S.MODULES.push(m);
    extraById[m.id] = m;
  });

  /* Schema.get يستخدم جدولاً داخلياً مغلقاً، لذا نغلّفه ليعرف الشاشات الجديدة */
  var originalGet = S.get;
  S.get = function (id) { return originalGet(id) || extraById[id] || null; };

  var originalField = S.field;
  S.field = function (moduleId, fieldName) {
    var direct = originalField(moduleId, fieldName);
    if (direct) return direct;
    var m = extraById[moduleId];
    if (!m) return null;
    for (var i = 0; i < m.fields.length; i++) if (m.fields[i].name === fieldName) return m.fields[i];
    return null;
  };

  S.DEPARTMENT_MODULES = { site: SITE_MODULES, dc: DC_MODULES };

  console.info('departments.js: registered ' + SITE_MODULES.length + ' site screens and ' +
               DC_MODULES.length + ' document-control screens.');
})(window);
