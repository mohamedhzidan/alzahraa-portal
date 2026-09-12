/* =========================================================================
   hr-excel-screens.js — شاشات الموارد البشرية في الاستيراد والتصدير: من هي،
                         وكيف يُعرَف كل سجل فيها، وما الذي يبقى نصاً
   hr-excel-screens.js — the HR screens covered by Excel import/export: which
                         ones, how each one recognises an EXISTING record, and
                         which values must stay text
   -------------------------------------------------------------------------
   طلب محمد زيدان (١٠ سبتمبر ٢٠٢٦، قرار مسجَّل): «كل سجلات الموارد البشرية
   الموجودة أولاً». هذا الملف هو الجرد نفسه، مكتوباً في مكان واحد يقرأه
   الاستيراد والقالب والتصدير معاً — فلا يختلف أحدها عن الآخر.
   The owner's decision (10 Sept 2026): "all existing HR records first".
   This file IS that inventory, written once and read by the importer, the
   template and the export alike — so they can never disagree.

   🔴 لماذا «كيف يُعرَف السجل» مكتوب لكل شاشة وحدها · WHY IDENTITY IS PER SCREEN
   الموظف يُعرَف برقمه الوظيفي. أمّا الحضور فلا: للموظف الواحد سجلّ حضور لكل
   يوم، فالمفتاح «الموظف + التاريخ». والإجازة «الموظف + النوع + تاريخ
   البداية». لو استعملنا رقم الموظف وحده في الحضور لصار كل يوم تعديلاً على
   اليوم السابق — ولضاع الشهر كله في سجلّ واحد.
   An employee is recognised by the employee number. Attendance is NOT: one
   person has one attendance row PER DAY, so its key is employee + date. A
   leave is employee + type + start date. Using the employee alone for
   attendance would turn every day into an "update" of the day before and
   collapse a whole month into one row.

   🔴 لا اسم وحده أبداً · NEVER A NAME ALONE
   اسمان متطابقان في شركة من ٤٥٠ شخصاً أمرٌ عادي («محمد أحمد»). الموظف في
   أي ملف يُعرَف بالرقم الوظيفي أو بالرقم القومي. الاسم يُقرأ للتأكيد فقط:
   رقمٌ لشخص واسمٌ لشخص آخر = تعارض يُعرض ولا يُحفظ.
   Two identical names in a 450-person company are ordinary. A person in any
   file is found by employee number or national ID. The name is read only
   to CONFIRM: a number belonging to one person and a name belonging to
   another is a conflict — shown, never saved.

   إضافي بالكامل · ADDITIVE — defines data and pure helpers only; nothing
   in the portal changes until hr-import-review.js / hr-excel-downloads.js
   use it. Deleting all four HR Excel files restores today exactly.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* ── نسخة طبق الأصل من norm() في import.js:317-327 ────────────────────
     هناك محلية داخل الإغلاق ولا تُصدَّر؛ نسختها حرفياً هنا حتى تتطابق
     عناويننا مع ما يطابقه الاستيراد العام تماماً. تغيير أحدهما يستوجب الآخر.
     A byte-for-byte copy of import.js's closure-local norm(); both must stay
     identical so our headings match exactly what the generic import matches. */
  function norm(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[(（][^)）]*[)）]/g, '')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .replace(/^(ال)/, '');
  }

  /* 🔴 نفس norm() لكن بلا حذف ما بين القوسين. قِيس ١٠ سبتمبر في مسير الرواتب:
     عمود «تأمينات» (حصة الموظف) طابق «تأمينات (الشركة)» لأن norm() تحذف
     «(الشركة)» — فذهب خصم الموظف إلى خانة حصة الشركة. ما بين القوسين هنا
     ليس توضيحاً بل هو الفرق بين حقلين.
     🔴 norm() WITHOUT dropping the bracketed words. Measured 10 Sept on
     payroll: a «تأمينات» column (the employee's share) matched «تأمينات
     (الشركة)» because norm() drops «(الشركة)» — the employee's deduction
     landed in the company-share box. Here the brackets are not a comment;
     they are the difference between two fields. */
  function normFull(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .replace(/^(ال)/, '');
  }

  /* 🔴 علامات الاتجاه والمسافات الخفية · INVISIBLE DIRECTION MARKS
     قاسها وكيل الأخطاء ١٠ سبتمبر: ملفات عربية منسوخة من واتساب أو صفحة ويب
     تحمل علامات اتجاه لا تُرى. خانة هاتف «فارغة» فيها علامة واحدة مسحت رقم
     الهاتف الحقيقي بعد الموافقة، و«0102» بعلامة قبله صار موظفاً جديداً.
     تُحذف قبل أي قراءة أو مقارنة. (U+200B–U+200F، U+202A–U+202E، U+2066–
     U+2069، U+061C، U+FEFF؛ والمسافة غير القابلة للكسر U+00A0 تصير مسافة.)
     Measured by the bug-reporter, 10 Sept: Arabic files copied from WhatsApp
     or a web page carry invisible direction marks. A "blank" phone cell
     holding one mark ERASED the real phone after approval, and «0102» with a
     mark in front became a NEW employee. Removed before any reading or
     comparison. */
  var INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF]/g;
  function stripInvisible(s) { return String(s == null ? '' : s).replace(INVISIBLE, '').replace(/\u00A0/g, ' '); }

  /* أرقام عربية وفارسية → لاتينية، ومسافات تُضغط — لمفاتيح المطابقة فقط
     Arabic-Indic and Persian digits → Latin, spaces collapsed — match keys only */
  function latinDigits(s) {
    return stripInvisible(s)
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); });
  }
  function keyText(s) { return latinDigits(s).trim().replace(/\s+/g, ' ').toLowerCase(); }
  /* 🔴 الأصفار على اليسار · LEADING ZEROS
     قاسه وكيل الأخطاء في إكسل حقيقي: عمود أرقام بتنسيق «0000» يُظهر 0101
     ويخزّن 101 — فقرأنا 101 ولم نجد أحداً، فأنشأنا الموظف مرة ثانية.
     هذا المفتاح يحذف الأصفار على اليسار من رقم كله أرقام، ليُكتشف التشابه
     ويُرفض الصف — لا ليُطابَق به موظف أبداً (لا نخمّن الهوية).
     Measured in real Excel by the bug-reporter: a number column formatted
     «0000» SHOWS 0101 and STORES 101 — we read 101, found nobody, and created
     the person twice. This key drops leading zeros from an all-digit number
     so the likeness is DETECTED and the row refused — never used to match a
     person (identity is never guessed). */
  function zeroKey(s) {
    var k = keyText(s);
    return /^\d+$/.test(k) ? k.replace(/^0+(?=\d)/, '') : null;
  }

  /* هل الاسمان لشخص واحد؟ متطابقان بعد التطبيع، أو كلمات الأقصر كلها داخل
     الأطول بنفس الترتيب («محمد حسنين» و«محمد حسنين علي»). غير ذلك: تعارض.
     Same person? Equal after normalising, or every word of the shorter name
     appears in the longer one in order (a middle name left out). Otherwise a
     conflict — never resolved by us. */
  function words(s) {
    return String(s || '').split(/\s+/).map(norm).filter(Boolean);
  }
  function sameName(a, b) {
    var x = words(a), y = words(b);
    if (!x.length || !y.length) return true;               /* nothing to compare */
    if (x.join(' ') === y.join(' ')) return true;
    var s = x.length <= y.length ? x : y, l = x.length <= y.length ? y : x, j = 0;
    for (var i = 0; i < l.length && j < s.length; i++) if (l[i] === s[j]) j++;
    return j === s.length && s[0] === l[0];
  }

  /* ═══════════════════════════════════════════════════════════════════
     الجرد · THE INVENTORY — measured at runtime on 10 Sept (T0 trial):
     14 screens sit in the «الموارد البشرية والإدارة» menu group. Nine hold
     HR records; four more (legal, IT assets, IT tickets, announcements)
     joined by the owner's «2b» answer. One — Site activity — is computed and
     stays read-only (listed below with the reason).
     ═══════════════════════════════════════════════════════════════════ */
  var SCREENS = {
    employees: {
      kind: 'master', updates: true,
      keys: [['code'], ['nationalId']],
      text: ['code', 'nationalId', 'phone', 'bankAccount', 'insuranceNo', 'drivingLicence', 'email'],
      defaults: ['status'],
      where: { ar: 'الموارد البشرية ← الموظفون', en: 'HR → Employees' },
      what: { ar: 'موظفون (بيانات أساسية — ليسوا حسابات دخول)', en: 'employees (master records — NOT login accounts)' }
    },
    attendance: {
      kind: 'master', updates: true,
      keys: [['employee', 'date']],
      text: ['checkIn', 'checkOut'],
      where: { ar: 'الموارد البشرية ← الحضور والانصراف', en: 'HR → Attendance' },
      what: { ar: 'سجلّ حضور لكل موظف في كل يوم', en: 'one attendance record per employee per day' }
    },
    employeeDocs: {
      kind: 'master', updates: true,
      keys: [['employee']],                     /* the database allows ONE per person (employee_docs_one_per_person) */
      text: ['fileLocation'],
      where: { ar: 'الموارد البشرية ← مصوغات التوظيف', en: 'HR → Recruitment documents' },
      what: { ar: 'قائمة مصوغات واحدة لكل موظف', en: 'one documents checklist per employee' }
    },
    employmentContracts: {
      kind: 'master', updates: true,
      keys: [['docNo'], ['employee', 'startDate']],
      text: ['docNo', 'renewedFrom', 'fileLocation'],
      where: { ar: 'الموارد البشرية ← عقود العمل', en: 'HR → Employment contracts' },
      what: { ar: 'عقود العمل — العقد يُعرف برقمه، أو بالموظف وتاريخ البداية', en: 'employment contracts — by contract number, or employee + start date' }
    },
    leaves: {
      kind: 'document', updates: false,
      keys: [['docNo'], ['employee', 'leaveType', 'fromDate']],
      text: [],
      where: { ar: 'الموارد البشرية ← طلبات الإجازات', en: 'HR → Leave requests' },
      what: { ar: 'طلبات إجازة تُحفظ «مسودة» وتمرّ بتوقيعيها كالمعتاد — لا يعتمدها الاستيراد', en: 'leave requests saved as DRAFTS that go through both signatures as usual — the import approves nothing' }
    },
    employeeAdvances: {
      kind: 'document', updates: false,
      keys: [['docNo'], ['employee', 'date', 'kind', 'amount']],
      text: ['startPeriod', 'receivedBy'],
      where: { ar: 'الموارد البشرية ← سلف الموظفين', en: 'HR → Employee advances' },
      what: { ar: 'سلف تُحفظ «مسودة» وتمرّ بالاعتماد كالمعتاد — لا يُصرف شيء بالاستيراد', en: 'advances saved as DRAFTS that go through approval as usual — nothing is paid by importing' }
    },
    siteAttendance: {
      kind: 'lines', lineRef: 'employee',
      where: { ar: 'الموارد البشرية ← كشف حضور الموقع اليومي', en: 'HR → Daily site attendance sheet' },
      what: { ar: 'صفوف الملف تصبح بنود كشف جديد تكمل ترويسته (التاريخ والموقع) وتحفظه بنفسك', en: 'the file rows become the lines of a NEW sheet; you complete its header (date, site) and save it yourself' }
    },
    dailyLabour: {
      kind: 'lines', lineRef: null,
      where: { ar: 'الموارد البشرية ← كشف العمالة اليومية', en: 'HR → Daily labour sheet' },
      what: { ar: 'صفوف الملف تصبح بنود كشف جديد (مسودة) — العمالة اليومية ليست موظفين مسجّلين', en: 'the file rows become the lines of a NEW sheet (draft) — daily workers are not registered employees' }
    },
    payroll: {
      kind: 'lines', lineRef: 'employee',
      where: { ar: 'الموارد البشرية ← مسير الرواتب', en: 'HR → Payroll runs' },
      what: { ar: 'صفوف الملف تصبح بنود مسير جديد (مسودة) — لا يُعتمد ولا يُصرف شيء بالاستيراد', en: 'the file rows become the lines of a NEW payroll (draft) — nothing is approved or paid by importing' }
    },

    /* ── قرار المالك «2b» (١٠ سبتمبر): الشؤون القانونية وأصول وطلبات التقنية
       والتعميمات تدخل نفس العمل. ليست سجلات موظفين، فمن يضيف فيها هو من
       تسمح له صلاحيته (القانوني، التقنية، الموارد البشرية، المسؤول…) — نفس
       زر الاستيراد ونفس المراجعة، ولكلٍّ مفتاحه.
       Owner decision «2b» (10 Sept): Legal affairs, IT assets, IT tickets and
       Announcements join the same work. They are not staff records, so whoever
       may add there (legal, IT, HR, admin…) gets the same Import button and
       the same review — each screen with its own key. */
    legalDocs: {
      kind: 'master', updates: true,
      keys: [['refNo']],
      text: ['refNo', 'fileRef'],
      defaults: ['legalStatus'],
      where: { ar: 'الموارد البشرية والإدارة ← الشؤون القانونية', en: 'HR & Administration → Legal affairs' },
      what: { ar: 'عقود وتراخيص وقضايا ووثائق — كلٌّ يُعرف برقم المرجع', en: 'contracts, licences, cases and policies — each recognised by its reference number' }
    },
    itAssets: {
      kind: 'master', updates: true,
      keys: [['code'], ['serialNo']],
      text: ['code', 'serialNo'],
      defaults: ['assetStatus'],
      where: { ar: 'الموارد البشرية والإدارة ← أصول تقنية المعلومات', en: 'HR & Administration → IT assets' },
      what: { ar: 'أجهزة وخطوط وتراخيص — الجهاز يُعرف بكوده أو برقمه التسلسلي', en: 'devices, lines and licences — a device is recognised by its code or serial number' }
    },
    itTickets: {
      kind: 'master', updates: true,
      keys: [['requester', 'date', 'subject']],
      text: [],
      defaults: ['ticketStatus', 'priority'],
      where: { ar: 'الموارد البشرية والإدارة ← طلبات الدعم الفني', en: 'HR & Administration → IT support tickets' },
      what: { ar: 'طلبات دعم — الطلب يُعرف بمقدّمه وتاريخه وموضوعه، ورقمه تصدره البوابة', en: 'support tickets — a ticket is recognised by requester + date + subject; the portal issues its number' }
    },
    announcements: {
      kind: 'master', updates: true,
      keys: [['date', 'title']],
      text: [],
      defaults: ['audience', 'importance'],
      where: { ar: 'الموارد البشرية والإدارة ← التعميمات والقرارات الإدارية', en: 'HR & Administration → Announcements & memos' },
      what: { ar: 'تعميمات — التعميم يُعرف بتاريخه وعنوانه، ورقمه تصدره البوابة', en: 'announcements — recognised by date + title; the portal issues the number' }
    }
  };

  /* في نفس القائمة وتبقى للقراءة فقط — محسوبة من المستندات نفسها.
     In the same menu group and stays READ-ONLY — computed from the documents. */
  var NOT_COVERED = {
    siteActivity:  { ar: 'نشاط المواقع — شاشة محسوبة للقراءة فقط؛ مصدرها المستندات نفسها', en: 'Site activity — a computed, read-only screen; its source is the documents themselves' }
  };

  /* ── مرادفات عناوين ملفات الموارد البشرية الحقيقية ─────────────────────
     تُضاف إلى ما يعرفه import.js، لا تحلّ محلّه. تُكتب كما يكتبها إنسان،
     وتُطبَّع بنفس norm(). «employee#code» يعني: عمود يعرّف الموظف برقمه.
     Headings real HR spreadsheets use — ADDED to what import.js already
     knows. Written as people type them; normalised by the same norm().
     "employee#code" means: a column that identifies the person by number. */
  var HR_SYNONYMS = {
    employees: {
      'الرقم الوظيفي': 'code', 'رقم الموظف': 'code', 'كود الموظف': 'code', 'كود': 'code', 'الكود': 'code',
      'رقم وظيفي': 'code', 'م.و': 'code', 'employee no': 'code', 'emp no': 'code', 'employee code': 'code',
      'الاسم': 'name', 'اسم الموظف': 'name', 'الاسم بالكامل': 'name', 'الاسم رباعي': 'name', 'الاسم الرباعي': 'name', 'اسم': 'name', 'name': 'name', 'full name': 'name',
      'الوظيفة': 'jobTitle', 'المسمى الوظيفي': 'jobTitle', 'المسمى': 'jobTitle', 'المهنة': 'jobTitle', 'job title': 'jobTitle', 'job': 'jobTitle',
      'الادارة': 'department', 'القسم': 'department', 'department': 'department',
      'المشروع': 'project', 'project': 'project',
      'الموقع': 'site', 'موقع العمل': 'site', 'مكان العمل': 'site', 'الفرع': 'site', 'site': 'site',
      'الراتب': 'basicSalary', 'الراتب الاساسي': 'basicSalary', 'المرتب': 'basicSalary', 'المرتب الاساسي': 'basicSalary',
      'الاساسي': 'basicSalary', 'اساسي': 'basicSalary', 'basic salary': 'basicSalary', 'salary': 'basicSalary',
      'البدلات': 'allowances', 'بدلات': 'allowances', 'allowances': 'allowances',
      'التليفون': 'phone', 'تليفون': 'phone', 'الموبايل': 'phone', 'موبايل': 'phone', 'رقم التليفون': 'phone',
      'رقم الموبايل': 'phone', 'رقم الهاتف': 'phone', 'الهاتف': 'phone', 'المحمول': 'phone', 'phone': 'phone', 'mobile': 'phone',
      'الرقم القومي': 'nationalId', 'رقم قومي': 'nationalId', 'رقم البطاقة': 'nationalId', 'البطاقة': 'nationalId',
      'الرقم القومى': 'nationalId', 'national id': 'nationalId',
      'الحساب البنكي': 'bankAccount', 'رقم الحساب': 'bankAccount', 'رقم الحساب البنكي': 'bankAccount', 'حساب البنك': 'bankAccount',
      'iban': 'bankAccount', 'bank account': 'bankAccount',
      'الرقم التاميني': 'insuranceNo', 'رقم التامين': 'insuranceNo', 'الرقم التأميني': 'insuranceNo', 'رقم التأمينات': 'insuranceNo',
      'تاريخ التعيين': 'hireDate', 'تاريخ الالتحاق': 'hireDate', 'تاريخ التعين': 'hireDate', 'hire date': 'hireDate',
      'نوع التعاقد': 'contractType', 'نوع العقد': 'contractType',
      'انتهاء العقد': 'contractEnd', 'تاريخ انتهاء العقد': 'contractEnd',
      'الحالة': 'status', 'الحاله': 'status', 'status': 'status',
      'نوع العمالة': 'employeeType', 'نوع العماله': 'employeeType',
      'العنوان': 'address', 'address': 'address',
      'البريد': 'email', 'البريد الالكتروني': 'email', 'الايميل': 'email', 'email': 'email',
      'اجر الاشتراك التاميني': 'insuranceWage', 'الاجر التاميني': 'insuranceWage', 'اجر الاشتراك': 'insuranceWage',
      'ملاحظات': 'notes', 'ملاحظة': 'notes', 'notes': 'notes',
      'انتهاء الرقم القومي': 'nationalIdExpiry', 'انتهاء البطاقة': 'nationalIdExpiry',
      'رخصة القيادة': 'drivingLicence', 'رقم الرخصة': 'drivingLicence', 'انتهاء الرخصة': 'drivingLicenceExpiry'
    },
    legalDocs: {
      'رقم المرجع': 'refNo', 'المرجع': 'refNo', 'الرقم المرجعي': 'refNo', 'reference': 'refNo', 'ref no': 'refNo',
      'العنوان': 'title', 'الموضوع': 'title', 'البيان': 'title', 'title': 'title',
      'النوع': 'docType', 'نوع المستند': 'docType', 'type': 'docType',
      'الطرف الاخر': 'party', 'الطرف': 'party', 'الجهة': 'party', 'party': 'party',
      'المشروع': 'project', 'القيمة': 'value', 'المبلغ': 'value', 'value': 'value',
      'تاريخ الاصدار': 'issueDate', 'الاصدار': 'issueDate', 'تاريخ الانتهاء': 'expiryDate', 'الانتهاء': 'expiryDate', 'ينتهي في': 'expiryDate', 'expiry': 'expiryDate',
      'الحالة': 'legalStatus', 'الحاله': 'legalStatus', 'status': 'legalStatus',
      'الرابط': 'fileRef', 'مكان الملف': 'fileRef', 'ملاحظات': 'notes', 'notes': 'notes',
      'المسؤول': 'responsible#name', 'اسم المسؤول': 'responsible#name', 'الرقم الوظيفي للمسؤول': 'responsible#code', 'كود المسؤول': 'responsible#code'
    },
    itAssets: {
      'الكود': 'code', 'كود': 'code', 'كود الجهاز': 'code', 'كود الاصل': 'code', 'رقم الاصل': 'code', 'code': 'code', 'asset code': 'code',
      'اسم الاصل': 'name', 'اسم الجهاز': 'name', 'الجهاز': 'name', 'الاسم': 'name', 'الوصف': 'name', 'name': 'name',
      'النوع': 'assetType', 'type': 'assetType',
      'الرقم التسلسلي': 'serialNo', 'السيريال': 'serialNo', 'سيريال': 'serialNo', 'serial': 'serialNo', 'serial no': 'serialNo', 's/n': 'serialNo', 'sn': 'serialNo',
      'تاريخ الشراء': 'purchaseDate', 'قيمة الشراء': 'purchaseValue', 'السعر': 'purchaseValue', 'التكلفة': 'purchaseValue',
      'انتهاء الضمان': 'warrantyEnd', 'الضمان': 'warrantyEnd', 'الحالة': 'assetStatus', 'الحاله': 'assetStatus', 'status': 'assetStatus',
      'ملاحظات': 'notes', 'notes': 'notes',
      'مسلم الى': 'assignedTo#name', 'المستلم': 'assignedTo#name', 'اسم الموظف': 'assignedTo#name', 'الموظف': 'assignedTo#name',
      'الرقم الوظيفي': 'assignedTo#code', 'كود الموظف': 'assignedTo#code', 'رقم الموظف': 'assignedTo#code', 'الرقم القومي': 'assignedTo#nationalId'
    },
    itTickets: {
      'التاريخ': 'date', 'تاريخ الطلب': 'date', 'date': 'date',
      'الموضوع': 'subject', 'العنوان': 'subject', 'subject': 'subject',
      'التصنيف': 'category', 'النوع': 'category', 'الاولوية': 'priority', 'priority': 'priority',
      'الحالة': 'ticketStatus', 'الحاله': 'ticketStatus', 'status': 'ticketStatus',
      'وصف المشكلة': 'description', 'المشكلة': 'description', 'الوصف': 'description', 'التفاصيل': 'description', 'description': 'description',
      'الحل': 'resolution', 'الحل المتخذ': 'resolution', 'resolution': 'resolution',
      'مقدم الطلب': 'requester#name', 'صاحب الطلب': 'requester#name', 'اسم مقدم الطلب': 'requester#name', 'الموظف': 'requester#name',
      'الرقم الوظيفي': 'requester#code', 'كود الموظف': 'requester#code', 'رقم الموظف': 'requester#code', 'الرقم القومي': 'requester#nationalId',
      'مسند الى': 'assignedTo#name', 'الفني': 'assignedTo#name', 'المسؤول': 'assignedTo#name'
    },
    announcements: {
      'التاريخ': 'date', 'date': 'date', 'العنوان': 'title', 'الموضوع': 'title', 'title': 'title',
      'الموجه الى': 'audience', 'الى': 'audience', 'الفئة': 'audience', 'audience': 'audience',
      'الاهمية': 'importance', 'importance': 'importance',
      'تاريخ السريان': 'effectiveDate', 'يسري من': 'effectiveDate', 'السريان': 'effectiveDate',
      'نص التعميم': 'body', 'النص': 'body', 'المحتوى': 'body', 'التفاصيل': 'body', 'body': 'body'
    },
    /* شاشات تشير إلى موظف · screens that point at a person */
    _person: {
      'الرقم الوظيفي': 'employee#code', 'رقم الموظف': 'employee#code', 'كود الموظف': 'employee#code', 'كود': 'employee#code',
      'الكود': 'employee#code', 'employee no': 'employee#code', 'employee code': 'employee#code',
      'الموظف الرقم الوظيفي': 'employee#code',
      'الرقم القومي': 'employee#nationalId', 'رقم البطاقة': 'employee#nationalId', 'national id': 'employee#nationalId',
      'الموظف الرقم القومي': 'employee#nationalId',
      'الاسم': 'employee#name', 'اسم الموظف': 'employee#name', 'الموظف': 'employee#name', 'name': 'employee#name',
      'الموظف الاسم': 'employee#name', 'الموظف الاسم للتاكيد': 'employee#name',
      'التاريخ': 'date', 'اليوم': 'date', 'تاريخ': 'date',
      'المشروع': 'project', 'الموقع': 'site', 'ملاحظات': 'notes',
      'الحضور': 'checkIn', 'وقت الحضور': 'checkIn', 'دخول': 'checkIn', 'الانصراف': 'checkOut', 'وقت الانصراف': 'checkOut', 'خروج': 'checkOut',
      'اضافي': 'overtimeHours', 'ساعات اضافية': 'overtimeHours', 'الاضافي': 'overtimeHours',
      'نوع الاجازة': 'leaveType', 'من': 'fromDate', 'من تاريخ': 'fromDate', 'الي': 'toDate', 'إلى': 'toDate', 'الى تاريخ': 'toDate',
      'عدد الايام': 'days', 'الايام': 'days', 'السبب': 'reason',
      'قيمة السلفة': 'amount', 'المبلغ': 'amount', 'نوع السلفة': 'kind', 'عدد الاقساط': 'instalments'
    }
  };

  /* هل هذا الحقل «مرجع إلى موظف»؟ · is this field a reference to a person? */
  function isPersonRef(f) { return f && f.type === 'ref' && f.ref === 'employees'; }

  /* الحقول التي يقبلها الاستيراد ويعرضها القالب لهذه الشاشة ولهذا المستخدم.
     Fields the import accepts and the template shows — for THIS user:
     a field the role may not read is neither imported nor offered. */
  function importableFields(mod) {
    var docPrefixed = !!mod.docPrefix;
    return (mod.fields || []).filter(function (f) {
      if (!f || !f.name || f.type === 'calc' || f.readonly) return false;
      if (['trail', 'lines', 'attachments', 'status'].indexOf(f.name) !== -1 && mod.workflow) return false;
      if (['trail', 'lines', 'attachments'].indexOf(f.name) !== -1) return false;
      if (docPrefixed && f.name === 'docNo') return false;   /* the portal issues the number */
      if (global.Auth && Auth.fieldHidden && Auth.fieldHidden(mod.id, f.name)) return false;
      return true;
    });
  }

  /* 🔴 اسمان متطابقان لحقلين مختلفين · TWO DIFFERENT FIELDS, ONE NAME
     قِيس ١٠ سبتمبر: في «الحضور والانصراف» حقل المشروع عنوانه «الموقع»
     (schema.js) وsites.js يضيف حقل الموقع الحقيقي بنفس العنوان «الموقع».
     فعمود «الموقع» في ملفه كان يذهب إلى المشروع أولاً، وتُرفض كل الصفوف
     «لا يوجد مشروع باسم الروبيكي». الآن: أي عنوان يتكرّر يأخذ اسم ما يشير
     إليه («الموقع — المشروعات»)، ويبقى «الموقع» للموقع الحقيقي وحده.
     Measured 10 Sept: on Attendance the PROJECT field is labelled «الموقع»
     (schema.js) and sites.js adds the real site field with the SAME label.
     A «الموقع» column went to the project first and every row was refused
     ("no project named الروبيكي"). Now a repeated label takes the name of
     what it points at («الموقع — المشروعات»); «الموقع» stays the real site. */
  function displayLabel(mod, f) {
    var n = norm(f.label && f.label.ar), dup = 0;
    (mod.fields || []).concat(mod.lines ? mod.lines.fields : []).forEach(function (x) { if (x && x.label && norm(x.label.ar) === n) dup++; });
    if (dup < 2 || f.name === 'site') return L(f.label);
    if (f.type === 'ref' && global.Schema && Schema.get(f.ref)) return L(f.label) + ' — ' + L(Schema.get(f.ref).label);
    return L(f.label) + ' — ' + f.name;
  }

  /* الأعمدة التي يمكن ربطها: حقل عادي، أو «الموظف» مقسوماً إلى رقم/قومي/اسم.
     Mappable targets: an ordinary field, or a person-field split into
     number / national ID / name-for-confirmation. */
  function targets(mod) {
    var out = [];
    importableFields(mod).forEach(function (f) {
      if (isPersonRef(f)) {
        out.push({ id: f.name + '#code', field: f, sub: 'code', required: !!f.required,
          label: displayLabel(mod, f) + ' — ' + L({ ar: 'الرقم الوظيفي', en: 'employee no.' }) });
        out.push({ id: f.name + '#nationalId', field: f, sub: 'nationalId', required: false,
          label: displayLabel(mod, f) + ' — ' + L({ ar: 'الرقم القومي', en: 'national ID' }) });
        out.push({ id: f.name + '#name', field: f, sub: 'name', required: false,
          label: displayLabel(mod, f) + ' — ' + L({ ar: 'الاسم (للتأكيد)', en: 'name (to confirm)' }) });
      } else {
        out.push({ id: f.name, field: f, sub: null, required: !!f.required, label: displayLabel(mod, f) });
      }
    });
    return out;
  }

  /* يطابق عنواناً بهدف: تام (الاسم/المرادف) = «مؤكَّد»، وإلا «غير واضح».
     لا نقبل «يحتوي» هنا: التخمين بالاحتواء هو ما جعل «المهندس» يطابق «المهن».
     Matches a heading to a target. Exact (label/synonym) = SURE, anything
     else = UNCLEAR and asked. No "contains" guessing — that is how «المهن»
     once hijacked «المهندس» on a live screen.
     allFields = EVERY field of the screen, computed ones included, so a
     label that only differs by a bracketed word from another field is
     recognised as ambiguous even when that other field is not importable. */
  function matchIn(list, allFields, synonymTables, heading, used) {
    var nf = normFull(heading), n = norm(heading);
    if (!nf) return null;
    var free = function (t) { return !used[t.id]; };
    var i;
    /* ١ · اسم العمود كما نكتبه نحن · our own (unique) column name */
    for (i = 0; i < list.length; i++) if (free(list[i]) && normFull(list[i].label) === nf) return list[i];
    /* ٢ · عنوان الحقل كاملاً — مقبول إن طابق حقلاً واحداً · the field's full label, if unique */
    var full = list.filter(function (x) {
      return free(x) && !x.sub && (normFull(x.field.label.ar) === nf || normFull(x.field.label.en) === nf || normFull(x.field.name) === nf);
    });
    if (full.length === 1) return full[0];
    /* ٣ · نحذف ما بين القوسين من عنوان ملفه هو فقط، لا من عنوان الحقل أبداً:
       «الكمية (م٣)» في ملفه = «الكمية»، لكن «تأمينات» في ملفه ≠ «تأمينات
       (حصة الشركة…)» — هناك الأقواس هي الفرق بين حقلين.
       Brackets are dropped from HIS heading only, never from the field's
       label: «الكمية (م٣)» = «الكمية», but «تأمينات» ≠ «تأمينات (حصة
       الشركة…)» — there the brackets ARE the difference between two fields. */
    if (n !== nf) {
      var loose = list.filter(function (x) { return free(x) && !x.sub && (normFull(x.field.label.ar) === n || normFull(x.field.label.en) === n); });
      if (loose.length === 1) return loose[0];
    }
    /* ٤ · مرادفات مكتوبة بأيدينا · synonyms written by hand */
    for (var k = 0; k < synonymTables.length; k++) {
      var table = synonymTables[k]; if (!table) continue;
      var hit = null;
      Object.keys(table).forEach(function (key) { if (!hit && (normFull(key) === nf || normFull(key) === n)) hit = table[key]; });
      if (hit) for (var j = 0; j < list.length; j++) if (free(list[j]) && list[j].id === hit) return list[j];
    }
    return null;
  }
  /* نفس المطابقة على كل الحقول، حتى ما لا يملك الدور قراءته — لتسميته فقط
     the same matching over EVERY field, even those the role may not read —
     used only to NAME a forbidden column, never to import it */
  function matchHeadingAll(mod, heading, used) {
    var list = (mod.fields || []).filter(function (f) { return f && f.name && f.type !== 'calc' && !f.readonly; })
      .map(function (f) { return { id: f.name, field: f, sub: null, label: displayLabel(mod, f) }; });
    return matchIn(list, mod.fields || [], [HR_SYNONYMS[mod.id] || null], heading, used);
  }
  function matchHeading(mod, heading, used) {
    var list = targets(mod);
    var person = list.some(function (x) { return x.sub; }) ? HR_SYNONYMS._person : null;
    return matchIn(list, mod.fields || [], [HR_SYNONYMS[mod.id] || null, person], heading, used);
  }
  /* عنوان يطابق حقلاً تحسبه البوابة بنفسها (لا يُستورد) — لنقول ذلك بوضوح
     a heading that names a field the portal computes itself (never imported) */
  function computedField(fields, heading) {
    var nf = normFull(heading);
    return (fields || []).filter(function (f) { return f && (f.type === 'calc' || f.readonly) && f.label && normFull(f.label.ar) === nf; })[0] || null;
  }

  /* ── المواقع التي يجوز لهذا الحساب أن يكتب فيها ───────────────────────
     Sites this account may write to: every active site when its own site
     consolidates the company (المكتب/الخلاطة), otherwise its own site only.
     Same rule the database enforces (az_can_site) — asked here only so the
     review can say it BEFORE saving instead of after a refusal. */
  /* 🔴 القائمة من الخادم لحظة الاستيراد (ctx.sites)، والنسخة المحفوظة احتياطاً.
     قِيس ١٠ سبتمبر: بعد فتح البوابة مباشرةً تكون قائمة المواقع في المتصفح
     فارغة لثوانٍ (تُملأ لاحقاً) — فظهرت كل صفوف ملف عمارة «خارج صلاحيتك».
     🔴 The list comes from the SERVER at import time (ctx.sites), the cached
     copy only as a fallback. Measured 10 Sept: right after the portal opens
     the browser's site list is empty for a few seconds (filled later) — and
     every row of Omara's file showed as "outside your access". */
  function sitesAll(ctx) {
    var list = (ctx && ctx.sites && ctx.sites.length) ? ctx.sites : (global.Store && Store.all('sites') || []);
    return list.filter(function (s) { return s && s.id && s.deleted !== true; });
  }
  function projectsAll(ctx) {
    var list = (ctx && ctx.projects && ctx.projects.length) ? ctx.projects : (global.Store && Store.all('projects') || []);
    return list.filter(function (p) { return p && p.id && p.deleted !== true; });
  }
  /* 🔴 الموقع المسموح يُسأل عنه قاعدة البيانات، لا المتصفح.
     قِيس ١٠ سبتمبر في التمرين: حساب مدير الموارد البشرية بالخلاطة يحمل
     المواقع في المتصفح كأسماء فقط (بلا خانة «يرى كل المواقع»)، فيقول
     المتصفح Auth.seesAllSites() = false — بينما قاعدة البيانات تجيب
     az_all_sites() = true وتسمح له بكل المواقع. لو صدّقنا المتصفح لرفضنا
     موظفي الروبيكي وسوهاج في ملف عمارة بلا سبب. فالسؤال يذهب لمصدر
     القرار نفسه (ctx من hr-import-review.js)، والمتصفح احتياط فقط.
     🔴 Which sites are allowed is asked of the DATABASE, not the browser.
     Measured 10 Sept in practice: the HR manager at الخلاطة holds sites in
     the browser as names only (no "sees all sites" flag), so the browser
     says Auth.seesAllSites() = false — while the database answers
     az_all_sites() = true and lets him write every site. Trusting the
     browser would refuse Elrobaki and Sohag staff in Omara's file for no
     reason. So we ask the source of the decision (ctx), browser as fallback. */
  function allowedSites(ctx) {
    var all = sitesAll(ctx).filter(function (s) { return !s.status || s.status === 'active'; });
    if (ctx && ctx.dbAllSites === true) return all;
    if (ctx && ctx.dbAllSites === false) return all.filter(function (s) { return s.id === ctx.dbSite; });
    var seesAll = global.Auth && Auth.seesAllSites ? Auth.seesAllSites() : false;
    if (seesAll) return all;
    var mine = global.Auth && Auth.site ? Auth.site() : null;
    return all.filter(function (s) { return s.id === mine; });
  }
  /* يسأل قاعدة البيانات: هل موقعي يرى كل المواقع؟ وما موقعي؟ · asks the database */
  async function siteRights() {
    var client = global.Auth && Auth.client && Auth.client();
    if (!client) return { dbAllSites: null, dbSite: null };
    try {
      var a = await client.rpc('az_all_sites'), b = await client.rpc('az_site');
      if (a.error || b.error) return { dbAllSites: null, dbSite: null };
      return { dbAllSites: a.data === true, dbSite: b.data || null };
    } catch (e) { return { dbAllSites: null, dbSite: null }; }
  }
  /* المواقع والمشروعات كما يعطيها الخادم الآن؛ إن رُفضت القراءة فالمحفوظ
     sites and projects as the server gives them now; if refused, the cached copy */
  async function lists() {
    var out = { sites: [], projects: [] };
    try { out.sites = await fetchAll('sites'); } catch (e) { out.sites = []; }
    try { out.projects = await fetchAll('projects'); } catch (e) { out.projects = []; }
    if (!out.sites.length && global.Store) out.sites = Store.all('sites') || [];
    if (!out.projects.length && global.Store) out.projects = Store.all('projects') || [];
    return out;
  }
  /* كل صفوف مصدر واحد كما يعطيها الخادم لهذا الحساب — نفس الباب الذي يقرأ منه
     store.js (portal_employees للموظفين). every row of one source, exactly as
     the server hands them to THIS account — the same door store.js reads. */
  async function fetchAll(source, narrow) {
    var client = global.Auth && Auth.client && Auth.client();
    if (!client) throw new Error('no-client');
    var rows = [], from = 0, size = 1000;
    for (;;) {
      /* 🔴 ترتيب ثابت بين الصفحات — بدونه لا يَعِد Postgres بنفس الترتيب من
         صفحة لأخرى، فقد يسقط صفّ بين صفحتين فيُنشأ مرة ثانية (وكيل الأخطاء، مشتبه).
         A FIXED order across pages — without it Postgres promises no stable
         order between pages, so a row could fall between two pages and be
         created a second time (bug-reporter, suspected). */
      var q = client.from(source).select('*').order('id', { ascending: true });
      if (narrow) q = narrow(q);
      var res = await q.range(from, from + size - 1);
      if (res.error) throw res.error;
      rows = rows.concat(res.data || []);
      if (!res.data || res.data.length < size) break;
      from += size;
      if (from >= 50000) throw new Error('too-many-rows:' + source);
    }
    return rows;
  }
  function shortName(s) { return String(s || '').split(/\s+[—–-]\s+/)[0]; }
  /* returns {site} | {error} — exact name, code or short name only; never "contains" */
  function resolveSite(value, ctx) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return { none: true };
    var n = norm(v), k = keyText(v);
    var hits = sitesAll(ctx).filter(function (s) {
      return norm(s.name) === n || keyText(s.code) === k || norm(shortName(s.name)) === n || s.id === v;
    });
    if (hits.length === 1) return { site: hits[0] };
    if (hits.length > 1) return { error: 'ambiguous', value: v };
    return { error: 'unknown', value: v };
  }
  function resolveProject(value, ctx) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return { none: true };
    var n = norm(v), k = keyText(v);
    var hits = projectsAll(ctx).filter(function (p) {
      return p && (norm(p.name) === n || (p.code && keyText(p.code) === k) || p.id === v);
    });
    if (hits.length === 1) return { project: hits[0] };
    if (hits.length > 1) return { error: 'ambiguous', value: v };
    return { error: 'unknown', value: v };
  }

  /* ── الموظفون المرئيون لهذا الحساب، مفهرسين بالرقم والقومي ────────────
     Employees THIS account can see, indexed by number and national ID —
     `rows` is what the SERVER just returned to this account (portal_employees,
     fetched fresh by hr-import-review.js). A record the database does not
     hand this account is never matched, never named, never hinted at. */
  function employeeIndex(rows) {
    if (!rows) {
      rows = (global.Store && Store.all('employees') || []);
    }
    rows = rows.filter(function (r) { return r && r.deleted !== true && r._syncState !== 'conflict'; });
    var byCode = {}, byNid = {}, byZero = {};
    rows.forEach(function (r) {
      if (r.code) (byCode[keyText(r.code)] = byCode[keyText(r.code)] || []).push(r);
      var z = r.code ? zeroKey(r.code) : null;
      if (z) (byZero[z] = byZero[z] || []).push(r);
      if (r.nationalId) (byNid[keyText(r.nationalId)] = byNid[keyText(r.nationalId)] || []).push(r);
    });
    return { rows: rows, byCode: byCode, byNid: byNid, byZero: byZero, byId: rows.reduce(function (m, r) { m[r.id] = r; return m; }, {}) };
  }
  /* {code, nationalId, name} → {employee} | {error, detail} */
  function resolvePerson(idx, p) {
    var byC = p.code ? (idx.byCode[keyText(p.code)] || []) : null;
    var byN = p.nationalId ? (idx.byNid[keyText(p.nationalId)] || []) : null;
    if (!p.code && !p.nationalId) {
      if (p.name) return { error: 'name-only' };
      return { none: true };
    }
    if (byC && byC.length > 1) return { error: 'code-ambiguous', count: byC.length };
    if (byN && byN.length > 1) return { error: 'nid-ambiguous', count: byN.length };
    var a = byC && byC[0], b = byN && byN[0];
    if (p.code && !a) {
      /* «101» ولا يوجد إلا «0101»: غالباً حذف إكسل الصفر — نقول ذلك، ولا نطابق
         «101» and only «0101» exists: Excel probably dropped the zero — say so, never match */
      var z = zeroKey(p.code), near = z ? (idx.byZero && idx.byZero[z] || []) : [];
      if (near.length) return { error: 'code-zero', near: near[0].code };
      return { error: 'code-unknown' };
    }
    if (p.nationalId && !b && !a) return { error: 'nid-unknown' };
    if (a && b && a.id !== b.id) return { error: 'code-nid-conflict', a: a, b: b };
    var emp = a || b;
    if (p.name && emp.name && !sameName(p.name, emp.name)) return { error: 'name-conflict', employee: emp };
    return { employee: emp };
  }

  global.HRExcel = {
    SCREENS: SCREENS, NOT_COVERED: NOT_COVERED, SYNONYMS: HR_SYNONYMS,
    norm: norm, normFull: normFull, matchIn: matchIn, computedField: computedField, keyText: keyText, latinDigits: latinDigits, sameName: sameName,
    stripInvisible: stripInvisible, zeroKey: zeroKey,
    isPersonRef: isPersonRef, importableFields: importableFields, targets: targets, matchHeading: matchHeading, matchHeadingAll: matchHeadingAll, displayLabel: displayLabel,
    sitesAll: sitesAll, projectsAll: projectsAll, lists: lists, allowedSites: allowedSites, siteRights: siteRights, fetchAll: fetchAll, resolveSite: resolveSite, resolveProject: resolveProject,
    employeeIndex: employeeIndex, resolvePerson: resolvePerson, shortName: shortName,
    covers: function (moduleId) { return !!SCREENS[moduleId]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
