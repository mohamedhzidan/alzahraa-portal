/* =========================================================================
   hr-department.js — قسم الموارد البشرية، مبنيّ على إجابات القسم نفسه
   -------------------------------------------------------------------------
   المصدر: اجتماع ١٥ أغسطس ٢٠٢٦ — أ. محمد أحمد مصطفى عمارة، مدير الموارد
   البشرية، ٤٥ دقيقة.

   Source: discovery meeting, 15 August 2026 — Mohamed Ahmed Mostafa Amara,
   HR Manager, 45 minutes. Every screen below answers something he actually
   said, and the line he said it in is quoted next to it.

   ما قاله بالحرف وما بنيناه عليه:

   ١) «عدم ربط بيانات الموظف الأساسية بالإدارة المالية لتسجيل مصاريف وسلفه
      الأسبوعية» — إجابته على «ما الذي قد يجعلك لا تستخدم النظام؟»
      → هذا أهم بند في الملف كله. بُني: سلف الموظفين + كشف حساب لكل موظف.

   ٢) «عمل كشف حساب لكل موظف لتسجيل السلف وخصمها»
      → كشف الحساب يُحسب تلقائياً من السلف والأقساط والمسير.

   ٣) «مصوغات التوظيف» — إجابته على «أكثر خطأ يتكرر»
      → بُني: ملف مصوغات التوظيف بقائمة تحقق لكل مستند.

   ٤) «تسجيل الموظفين الجدد» — أبطأ عمل لديه
      → نموذج الموظف صار يقبل الحفظ كمسودة ويكمَّل لاحقاً، ومصوغاته تُتابَع.

   ٥) «الحضور والانصراف» — العمل المكرر (ورق ثم إكسل)
      → بُني: كشف حضور يومي للموقع يسجّله محاسب الموقع مرة واحدة.

   ٦) «انتهاء الرقم القومي / انتهاء رخص القيادة» — التنبيهات المطلوبة
      → أُضيفت تواريخ الانتهاء وتنبيهاتها.

   ٧) «٢٠٠ عمالة يومية» + «العمالة اليومية تُحسب كيف وتُصرف كيف؟ ← مهم جداً»
      → العمالة اليومية لها كشف منفصل، لا تُسجَّل كموظفين بمرتب شهري.

   ٨) «المسموح لهم فقط من يعمل بالمرتبات» — من يرى الرواتب
      → مطبّق بالفعل في auth.js: أربعة أدوار فقط.

   ٩) كل أنواع الإجازات يعتمدها «رئيس مجلس الإدارة»
      → مكتوب في الشاشة حتى لا يظن أحد أن مدير قسمه يعتمدها.

   يُحمَّل بعد schema.js وقبل auth.js  ·  Load after schema.js, before auth.js
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('hr-department.js needs schema.js first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var SEC = {
    main:  { ar: 'البيانات الأساسية', en: 'Main information' },
    money: { ar: 'القيم المالية',     en: 'Financial values' },
    plan:  { ar: 'خطة السداد',        en: 'Repayment plan' },
    docs:  { ar: 'المستندات',         en: 'Documents' },
    dates: { ar: 'التواريخ',          en: 'Dates' },
    extra: { ar: 'بيانات إضافية',     en: 'Additional information' },
    hand:  { ar: 'التسليم والاستلام', en: 'Handover & receipt' }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ١ · سلف الموظفين — البند الذي قال إن غيابه يمنعه من استخدام النظام
     ═══════════════════════════════════════════════════════════════════ */
  var ADVANCE_KIND = [
    { value: 'weekly',    label: { ar: 'سلفة أسبوعية',      en: 'Weekly advance' } },
    { value: 'monthly',   label: { ar: 'سلفة شهرية',        en: 'Monthly advance' } },
    { value: 'emergency', label: { ar: 'سلفة طارئة',        en: 'Emergency advance' } },
    { value: 'expense',   label: { ar: 'عهدة مصروفات',      en: 'Expense float' } },
    { value: 'medical',   label: { ar: 'سلفة علاج',         en: 'Medical advance' } },
    { value: 'other',     label: { ar: 'أخرى',              en: 'Other' } }
  ];

  var ADVANCE = {
    id: 'employeeAdvances', table: 'employeeAdvances', group: 'people', icon: 'banknote',
    label: { ar: 'سلف الموظفين', en: 'Employee advances' },
    desc: { ar: 'صرف السلفة وخطة خصمها من الراتب — يظهر أثرها فوراً في كشف حساب الموظف',
            en: 'Advance issued and its repayment plan — reflected immediately in the employee statement' },
    workflow: true, docPrefix: 'ADV', amountField: 'amount',
    columns: ['docNo', 'date', 'employee', 'kind', 'amount', 'outstanding', 'status'],
    search: ['docNo', 'employee', 'reason'],
    fields: [
      F('docNo', 'رقم السلفة', 'Advance no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      F('employee', 'الموظف', 'Employee', 'ref',
        { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
      F('kind', 'نوع السلفة', 'Advance type', 'select',
        { options: ADVANCE_KIND, default: 'weekly', required: true, section: SEC.main }),
      F('project', 'المشروع', 'Project', 'ref',
        { ref: 'projects', refLabel: 'name', section: SEC.main,
          help: { ar: 'لتحميل السلفة على المشروع الصحيح', en: 'So the advance is charged to the right project' } }),
      F('reason', 'السبب', 'Reason', 'textarea', { section: SEC.main, full: true }),

      F('amount', 'قيمة السلفة', 'Advance amount', 'money',
        { required: true, section: SEC.money }),
      F('payMethod', 'طريقة الصرف', 'Paid by', 'select',
        { options: S.PAY_METHOD, default: 'cash', section: SEC.money }),
      F('cashAccount', 'من خزينة / بنك', 'From cash or bank account', 'ref',
        { ref: 'cashAccounts', refLabel: 'name', section: SEC.money }),

      F('instalments', 'عدد أقساط الخصم', 'Number of instalments', 'number',
        { default: 1, section: SEC.plan,
          help: { ar: 'كم مرتب يُخصم عليه؟ اكتب ١ للخصم مرة واحدة',
                  en: 'Over how many payrolls? Enter 1 to deduct in one go' } }),
      F('instalmentAmount', 'قيمة القسط', 'Instalment amount', 'calc',
        { formula: function (r) {
            var n = Number(r.instalments) || 1;
            return n > 0 ? (Number(r.amount) || 0) / n : 0;
          }, section: SEC.plan }),
      F('startPeriod', 'يبدأ الخصم من شهر', 'First deduction period', 'text',
        { section: SEC.plan, help: { ar: 'مثال: ٢٠٢٦-٠٩', en: 'e.g. 2026-09' } }),
      F('repaid', 'المسدَّد حتى الآن', 'Repaid so far', 'money',
        { readonly: true, section: SEC.plan,
          help: { ar: 'يُحدَّث تلقائياً من مسير الرواتب', en: 'Updated automatically from payroll' } }),
      F('outstanding', 'المتبقي', 'Outstanding', 'calc',
        { formula: function (r) { return (Number(r.amount) || 0) - (Number(r.repaid) || 0); },
          section: SEC.plan }),
      F('settled', 'مسدَّدة بالكامل', 'Fully settled', 'checkbox', { section: SEC.plan }),

      F('requestedBy', 'طلبها', 'Requested by', 'ref',
        { ref: 'employees', refLabel: 'name', section: SEC.hand }),
      F('receivedBy', 'استلمها', 'Received by', 'text', { section: SEC.hand }),
      F('receivedDate', 'تاريخ الاستلام', 'Date received', 'date', { section: SEC.hand }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ]
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · مصوغات التوظيف — «أكثر خطأ يتكرر» بكلماته
     ═══════════════════════════════════════════════════════════════════ */
  var DOC_STATE = [
    { value: 'missing',  label: { ar: 'ناقص',            en: 'Missing' } },
    { value: 'received', label: { ar: 'مستلَم',          en: 'Received' } },
    { value: 'copy',     label: { ar: 'صورة فقط',        en: 'Copy only' } },
    { value: 'expired',  label: { ar: 'منتهي — يُجدَّد',  en: 'Expired — renew' } },
    { value: 'na',       label: { ar: 'لا ينطبق',        en: 'Not applicable' } }
  ];

  var HIRE_DOCS = {
    id: 'employeeDocs', table: 'employeeDocs', group: 'people', icon: 'folder',
    label: { ar: 'مصوغات التوظيف', en: 'Recruitment documents' },
    desc: { ar: 'قائمة تحقق لكل موظف — المستند الناقص يظهر هنا قبل أن يصبح مشكلة',
            en: 'A checklist per employee — a missing document shows here before it becomes a problem' },
    columns: ['employee', 'completeness', 'missingCount', 'lastUpdated'],
    search: ['employee'],
    fields: [
      F('employee', 'الموظف', 'Employee', 'ref',
        { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
      F('hireDate', 'تاريخ التعيين', 'Hire date', 'date', { section: SEC.main }),
      F('lastUpdated', 'آخر تحديث', 'Last updated', 'date', { default: 'today', section: SEC.main }),

      /* المستندات المطلوبة في التعيين بمصر */
      F('nationalIdDoc', 'صورة بطاقة الرقم القومي', 'National ID copy', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('birthCert', 'شهادة الميلاد', 'Birth certificate', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('qualification', 'المؤهل الدراسي', 'Qualification certificate', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('militaryStatus', 'موقف التجنيد', 'Military service status', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('criminalRecord', 'صحيفة الحالة الجنائية (فيش وتشبيه)', 'Criminal record certificate', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('insuranceForm1', 'استمارة ١ تأمينات', 'Insurance form 1', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('insurancePrint', 'برنت تأمينات', 'Insurance print-out', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('medicalFitness', 'شهادة اللياقة الطبية', 'Medical fitness certificate', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('photos', 'صور شخصية', 'Passport photographs', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('contractSigned', 'عقد العمل موقّع', 'Signed employment contract', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('bankForm', 'نموذج فتح حساب بنكي', 'Bank account form', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),
      F('drivingLicenceDoc', 'رخصة القيادة (للسائقين)', 'Driving licence (drivers)', 'select',
        { options: DOC_STATE, default: 'na', section: SEC.docs }),
      F('safetyInduction', 'محضر تدريب السلامة', 'Safety induction record', 'select',
        { options: DOC_STATE, default: 'missing', section: SEC.docs }),

      F('missingCount', 'عدد الناقص', 'Missing count', 'calc',
        { formula: function (r) {
            var keys = ['nationalIdDoc','birthCert','qualification','militaryStatus','criminalRecord',
                        'insuranceForm1','insurancePrint','medicalFitness','photos','contractSigned',
                        'bankForm','drivingLicenceDoc','safetyInduction'];
            var n = 0;
            keys.forEach(function (k) { if (r[k] === 'missing' || r[k] === 'expired') n++; });
            return n;
          }, section: SEC.main }),
      F('completeness', 'نسبة الاكتمال', 'Completeness', 'calc',
        { formula: function (r) {
            var keys = ['nationalIdDoc','birthCert','qualification','militaryStatus','criminalRecord',
                        'insuranceForm1','insurancePrint','medicalFitness','photos','contractSigned',
                        'bankForm','drivingLicenceDoc','safetyInduction'];
            var need = 0, have = 0;
            keys.forEach(function (k) {
              if (r[k] === 'na') return;
              need++;
              if (r[k] === 'received' || r[k] === 'copy') have++;
            });
            return need ? Math.round(have / need * 100) : 100;
          }, section: SEC.main }),
      F('fileLocation', 'مكان الملف الورقي', 'Paper file location', 'text', { section: SEC.extra }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ]
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · كشف حضور الموقع اليومي
        «٢٠ مستند» يومياً من المواقع · «محاسب الموقع» هو من يسجّل ·
        «الحضور والانصراف» هو العمل المكرر (ورق ثم إكسل)
        كشف واحد يوقّعه محاسب الموقع بدل عشرين ورقة
     ═══════════════════════════════════════════════════════════════════ */
  var ATT_STATE = [
    { value: 'present', label: { ar: 'حاضر',        en: 'Present' } },
    { value: 'absent',  label: { ar: 'غائب',        en: 'Absent' } },
    { value: 'leave',   label: { ar: 'إجازة',       en: 'On leave' } },
    { value: 'sick',    label: { ar: 'مرضي',        en: 'Sick' } },
    { value: 'mission', label: { ar: 'مأمورية',     en: 'On mission' } },
    { value: 'holiday', label: { ar: 'عطلة رسمية',  en: 'Public holiday' } }
  ];

  var SITE_SHEET = {
    id: 'siteAttendance', table: 'siteAttendance', group: 'people', icon: 'clock',
    label: { ar: 'كشف حضور الموقع اليومي', en: 'Daily site attendance sheet' },
    desc: { ar: 'يسجّله محاسب الموقع مرة واحدة ويصل الإدارة مباشرة — بدل الورق ثم الإكسل',
            en: 'Filled once by the site accountant and reaches head office directly — replacing paper then Excel' },
    workflow: true, docPrefix: 'ATT',
    columns: ['docNo', 'date', 'project', 'presentCount', 'status'],
    search: ['docNo', 'project'],
    fields: [
      F('docNo', 'رقم الكشف', 'Sheet no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      F('project', 'الموقع / المشروع', 'Site / project', 'ref',
        { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
      F('recordedBy', 'سجّله (محاسب الموقع)', 'Recorded by (site accountant)', 'ref',
        { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
      F('shift', 'الوردية', 'Shift', 'select', {
        options: [
          { value: 'day',   label: { ar: 'نهارية', en: 'Day' } },
          { value: 'night', label: { ar: 'ليلية',  en: 'Night' } }
        ], default: 'day', section: SEC.main,
        help: { ar: 'الورديات لدى الأمن فقط حسب إفادة القسم', en: 'Shifts apply to security only, per the department' } }),
      F('presentCount', 'عدد الحاضرين', 'Present count', 'calc',
        { formula: function (r) {
            return (r.lines || []).filter(function (l) { return l.attStatus === 'present'; }).length;
          }, section: SEC.main }),
      F('absentCount', 'عدد الغائبين', 'Absent count', 'calc',
        { formula: function (r) {
            return (r.lines || []).filter(function (l) { return l.attStatus === 'absent'; }).length;
          }, section: SEC.main }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ],
    lines: {
      label: { ar: 'الحضور', en: 'Attendance' },
      fields: [
        F('employee', 'الموظف', 'Employee', 'ref', { ref: 'employees', refLabel: 'name' }),
        F('attStatus', 'الحالة', 'Status', 'select', { options: ATT_STATE, default: 'present' }),
        F('checkIn', 'الحضور', 'In', 'text'),
        F('checkOut', 'الانصراف', 'Out', 'text'),
        F('hours', 'الساعات', 'Hours', 'number', { default: 8 }),
        F('overtimeHours', 'إضافي', 'Overtime', 'number', { default: 0 }),
        F('note', 'ملاحظة', 'Note', 'text')
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · كشف العمالة اليومية
        «٢٠٠ عمالة يومية» — لا يمكن تسجيلهم كموظفين برواتب شهرية
        «العمالة اليومية تُحسب كيف؟ وتُصرف كيف؟ ← مهم جداً»
     ═══════════════════════════════════════════════════════════════════ */
  var DAILY = {
    id: 'dailyLabour', table: 'dailyLabour', group: 'people', icon: 'users',
    label: { ar: 'كشف العمالة اليومية', en: 'Daily labour sheet' },
    desc: { ar: 'العمالة اليومية بالاسم واليومية والمهنة — تُصرف يومياً أو أسبوعياً بتوقيع',
            en: 'Daily workers by name, trade and day rate — paid daily or weekly against a signature' },
    workflow: true, docPrefix: 'DL', amountField: 'totalAmount',
    columns: ['docNo', 'date', 'project', 'workerCount', 'totalAmount', 'status'],
    search: ['docNo', 'project'],
    fields: [
      F('docNo', 'رقم الكشف', 'Sheet no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      F('project', 'الموقع', 'Site', 'ref',
        { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
      F('recordedBy', 'سجّله', 'Recorded by', 'ref',
        { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
      F('costItem', 'بند التكلفة', 'Cost item', 'ref',
        { ref: 'costItems', refLabel: 'name', section: SEC.main,
          help: { ar: 'حتى تظهر تكلفة العمالة في ربحية المشروع',
                  en: 'So labour cost appears in project profitability' } }),
      F('workerCount', 'عدد العمال', 'Number of workers', 'calc',
        { formula: function (r) { return (r.lines || []).length; }, section: SEC.main }),
      F('payMethod', 'طريقة الصرف', 'Paid by', 'select',
        { options: S.PAY_METHOD, default: 'cash', section: SEC.money }),
      F('paidDate', 'تاريخ الصرف', 'Date paid', 'date', { section: SEC.money }),
      F('paidBy', 'صرفها', 'Paid by (person)', 'ref',
        { ref: 'employees', refLabel: 'name', section: SEC.hand }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ],
    lines: {
      label: { ar: 'العمال', en: 'Workers' },
      fields: [
        F('workerName', 'اسم العامل', 'Worker name', 'text'),
        F('nationalId', 'الرقم القومي', 'National ID', 'text'),
        F('trade', 'المهنة', 'Trade', 'text'),
        F('days', 'عدد الأيام', 'Days', 'number', { default: 1 }),
        F('dayRate', 'اليومية', 'Day rate', 'money'),
        F('overtime', 'إضافي', 'Overtime', 'money', { default: 0 }),
        F('lineTotal', 'الإجمالي', 'Line total', 'calc',
          { formula: function (l) {
              return (Number(l.days) || 0) * (Number(l.dayRate) || 0) + (Number(l.overtime) || 0);
            } }),
        F('signature', 'استلم بتوقيع', 'Signed for receipt', 'checkbox')
      ],
      totals: [{ label: { ar: 'إجمالي الكشف', en: 'Sheet total' }, field: 'lineTotal', target: 'totalAmount' }]
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     التسجيل — REGISTRATION
     ═══════════════════════════════════════════════════════════════════ */
  var NEW = [ADVANCE, HIRE_DOCS, SITE_SHEET, DAILY];
  var extraById = {};

  NEW.forEach(function (m) {
    if (!S.MODULES.some(function (x) { return x.id === m.id; })) S.MODULES.push(m);
    extraById[m.id] = m;
  });

  var origGet = S.get;
  S.get = function (id) { return origGet(id) || extraById[id] || null; };
  var origField = S.field;
  S.field = function (mid, fname) {
    var d = origField(mid, fname);
    if (d) return d;
    var m = extraById[mid];
    if (!m) return null;
    for (var i = 0; i < m.fields.length; i++) if (m.fields[i].name === fname) return m.fields[i];
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════════
     تعديلات على الشاشات الموجودة
     ═══════════════════════════════════════════════════════════════════ */

  /* ٥ · الموظفون — تواريخ الانتهاء التي طلب التنبيه عليها، ونوع العمالة */
  var emp = origGet('employees');
  if (emp) {
    function addField(mod, f, afterName) {
      if (mod.fields.some(function (x) { return x.name === f.name; })) return;
      var i = afterName ? mod.fields.findIndex(function (x) { return x.name === afterName; }) : -1;
      if (i === -1) mod.fields.push(f); else mod.fields.splice(i + 1, 0, f);
    }

    /* «انتهاء الرقم القومي / انتهاء رخص القيادة» — تنبيهاته المطلوبة */
    addField(emp, F('nationalIdExpiry', 'انتهاء الرقم القومي', 'National ID expiry', 'date',
      { section: { ar: 'المستندات وتواريخ الانتهاء', en: 'Documents & expiry dates' } }), 'nationalId');
    addField(emp, F('drivingLicence', 'رقم رخصة القيادة', 'Driving licence no.', 'text',
      { section: { ar: 'المستندات وتواريخ الانتهاء', en: 'Documents & expiry dates' } }), 'nationalIdExpiry');
    addField(emp, F('drivingLicenceExpiry', 'انتهاء رخصة القيادة', 'Driving licence expiry', 'date',
      { section: { ar: 'المستندات وتواريخ الانتهاء', en: 'Documents & expiry dates' } }), 'drivingLicence');

    /* ٥٠ مكتب · ١٠٠ مواقع · ١٠٠ مؤقتون · ٢٠٠ يومية — الأنواع مختلفة تماماً */
    addField(emp, F('employeeType', 'نوع العمالة', 'Employee type', 'select', {
      options: [
        { value: 'office',    label: { ar: 'دائم — مكتب',   en: 'Permanent — office' } },
        { value: 'site',      label: { ar: 'دائم — موقع',   en: 'Permanent — site' } },
        { value: 'temporary', label: { ar: 'مؤقت',          en: 'Temporary' } },
        { value: 'daily',     label: { ar: 'عمالة يومية',   en: 'Daily labour' } },
        { value: 'subcon',    label: { ar: 'عمالة مقاول باطن', en: 'Subcontractor labour' } }
      ], default: 'office', section: { ar: 'البيانات الأساسية', en: 'Main information' }
    }), 'jobTitle');
  }

  /* ٦ · مسير الرواتب — الخصومات الخمسة التي ذكرها بالاسم، لا خانة واحدة */
  var pay = origGet('payroll');
  if (pay && pay.lines) {
    var lf = pay.lines.fields;
    function hasLine(n) { return lf.some(function (x) { return x.name === n; }); }
    function addLine(f, after) {
      if (hasLine(f.name)) return;
      var i = after ? lf.findIndex(function (x) { return x.name === after; }) : -1;
      if (i === -1) lf.push(f); else lf.splice(i + 1, 0, f);
    }
    /* المكوّنات كما كتبها: أساسي · انتقال · سكن · موقع · حوافز · أخرى */
    addLine(F('transport', 'بدل انتقال', 'Transport allowance', 'money', { default: 0 }), 'basic');
    addLine(F('housing', 'بدل سكن', 'Housing allowance', 'money', { default: 0 }), 'transport');
    addLine(F('siteAllowance', 'بدل موقع', 'Site allowance', 'money', { default: 0 }), 'housing');
    addLine(F('incentive', 'حوافز', 'Incentives', 'money', { default: 0 }), 'siteAllowance');
    /* الخصومات كما كتبها: تأمينات شركة · تأمينات موظف · ضريبة · سلف · جزاءات */
    addLine(F('insuranceEmployer', 'تأمينات (الشركة)', 'Insurance (employer)', 'money', { default: 0 }), 'insurance');
    addLine(F('incomeTax', 'ضريبة كسب العمل', 'Income tax', 'money', { default: 0 }), 'insuranceEmployer');
    addLine(F('advanceDeduction', 'خصم سلف', 'Advance deduction', 'money', { default: 0 }), 'incomeTax');
    addLine(F('penalty', 'جزاءات', 'Penalties', 'money', { default: 0 }), 'advanceDeduction');
  }

  /* ٧ · الإجازات — كل الأنواع يعتمدها رئيس مجلس الإدارة، فليُكتب ذلك */
  var lv = origGet('leaves');
  if (lv) {
    lv.desc = { ar: 'طلبات الإجازات — كل الأنواع يعتمدها رئيس مجلس الإدارة',
                en: 'Leave requests — every type is approved by the Chairman' };
    var lt = lv.fields.filter(function (f) { return f.name === 'leaveType'; })[0];
    if (lt) lt.help = { ar: 'الاعتماد النهائي لرئيس مجلس الإدارة لكل الأنواع',
                        en: 'Final approval rests with the Chairman for every type' };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · كشف حساب الموظف — «عمل كشف حساب لكل موظف لتسجيل السلف وخصمها»
        يُحسب، لا يُدخَل. لا يمكن أن يختلف عن المستندات لأنه مشتق منها.
     ═══════════════════════════════════════════════════════════════════ */
  function statement(employeeId) {
    if (!global.Store || !employeeId) return null;
    var advances = Store.all('employeeAdvances').filter(function (a) {
      return a.employee === employeeId && a.status !== 'reversed' && a.status !== 'rejected';
    });

    /* ONE source of truth for money repaid.
       An advance row carries a `repaid` figure AND payroll carries an
       `advanceDeduction` line. They are the same money. Counting both
       would show the employee owing less than he does — the single most
       dangerous error this screen could make. Payroll wins, because that
       is where the deduction actually happened.

       مصدر واحد للمسدَّد: الخصم الفعلي من المسير المعتمد. حقل «المسدَّد»
       في السلفة مجرد عرض. لو حُسب الاثنان لظهر الموظف مديناً بأقل مما
       عليه فعلاً — وهذا أخطر خطأ ممكن في هذه الشاشة. */
    var lines = [], given = 0, repaid = 0;

    advances.forEach(function (a) {
      given += Number(a.amount) || 0;
      lines.push({
        date: a.date, docNo: a.docNo, kind: 'advance',
        label: { ar: 'سلفة — ' + (a.reason || ''), en: 'Advance — ' + (a.reason || '') },
        debit: Number(a.amount) || 0, credit: 0, status: a.status
      });
    });

    /* الخصومات الفعلية من المسير المعتمد — هي وحدها الدائن */
    Store.all('payroll').filter(function (p) { return p.status === 'approved'; })
      .forEach(function (p) {
        (p.lines || []).forEach(function (l) {
          if (l.employee !== employeeId) return;
          var d = Number(l.advanceDeduction) || 0;
          if (d <= 0) return;
          repaid += d;
          lines.push({
            date: p.date, docNo: p.docNo, kind: 'payroll',
            label: { ar: 'خصم سلف — مسير ' + (p.period || ''),
                     en: 'Advance deduction — payroll ' + (p.period || '') },
            debit: 0, credit: d
          });
        });
      });

    lines.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var bal = 0;
    lines.forEach(function (l) { bal += l.debit - l.credit; l.balance = bal; });

    return {
      employee: employeeId,
      employeeName: (Store.find('employees', employeeId) || {}).name || '',
      totalAdvanced: given,
      totalRepaid: repaid,
      outstanding: given - repaid,
      lines: lines
    };
  }

  S.HR = { statement: statement, MODULES: NEW };
  global.HRDepartment = { statement: statement, modules: NEW };

  console.info('hr-department.js: ' + NEW.length + ' new HR screens registered ' +
               '(advances, recruitment documents, site attendance sheet, daily labour).');
})(window);
