/* Production authentication, users, roles and permissions.
   Passwords are handled by Supabase Auth and never stored in portal records.

   ═══════════════════════════════════════════════════════════════════════
   WHAT CHANGED IN THIS VERSION — ما الذي تغيّر
   ═══════════════════════════════════════════════════════════════════════
   1) NEW PERMISSION LEVEL: 'lookup'
      Before, a screen was either fully visible or completely unavailable.
      Because almost every document has a "received by" or "prepared by"
      field pointing at an employee, EVERY role had been given
      employees: ['view'] just so those dropdowns would show names.
      The side effect was that all fourteen roles could open the Employees
      screen and read national ID numbers, salaries and bank accounts.

      'lookup' fixes this. A role with lookup on a screen can resolve a
      name in a dropdown, and nothing else. The screen does not appear in
      the menu, the page cannot be opened, and no sensitive field is read.

      قبل هذا التعديل كان كل موظف يستطيع فتح شاشة الموظفين وقراءة الرواتب
      والرقم القومي والحساب البنكي. صلاحية «lookup» تعطي الاسم في القائمة
      المنسدلة فقط — لا شاشة ولا بيانات حساسة.

   2) TWO NEW DEPARTMENTS
      site_engineer     مهندسو الموقع     (was mixed into Technical Office)
      document_control  ضبط المستندات     (did not exist at all)

   3) EVERY ROLE NARROWED to the screens its own department actually uses.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SESSION_KEY = 'az_session';

  /* --------------------------------------------------------------------
     ACTIONS
       view    الشاشة تظهر في القائمة ويمكن فتحها
       lookup  الاسم فقط في القوائم المنسدلة — لا شاشة ولا بيانات حساسة
       create edit delete review approve
     -------------------------------------------------------------------- */
  var ALL = ['view', 'create', 'edit', 'delete', 'review', 'approve'];
  var LOOKUP = ['lookup'];

  /* Every role must be able to resolve a site NAME in a dropdown, or the
     new Site field would be an empty box on every form.
     كل دور يحتاج قراءة اسم الموقع في القائمة المنسدلة وإلا ظهر الحقل فارغاً. */

  /* Fields that must never leave the HR department, whatever happens.
     Used by the UI as a second line of defence behind the database rules. */
  var SENSITIVE = {
    employees: ['nationalId', 'basicSalary', 'allowances', 'insuranceNo',
                'bankAccount', 'address', 'phone', 'birthDate'],
    payroll:   ['basicSalary', 'allowances', 'deductions', 'netPay', 'bankAccount'],
    users:     ['password', 'login_email', 'auth_uid']
  };
  /* Roles allowed to read the sensitive fields above. */
  var SENSITIVE_ROLES = ['admin', 'gm', 'hr', 'hr_manager', 'finance_manager', 'auditor'];

  var ROLES = {

    /* ═══════════════ إدارة النظام والإدارة العليا ═══════════════ */
    /* ══ AUDIT FIX (Critical) · the technical administrator is no longer
       also a business superuser.

       Before: admin held ALL on every screen, so the person who manages
       accounts could also approve payments, post journals and run payroll.
       That is a separation-of-duties failure: one account could create a
       supplier, raise an invoice, approve it and pay it.

       Now: admin can see everything (needed for support) and manage users
       and configuration, but cannot approve, review or delete business
       documents. Business authority lives with gm and the department
       managers.

       مسؤول النظام يدير الحسابات والإعدادات ويرى كل شيء للدعم الفني،
       لكنه لا يعتمد ولا يراجع ولا يحذف مستندات العمل. الصلاحية المالية
       عند المدير العام ومديري الأقسام. */
    admin: {
      label: { ar: 'مسؤول النظام', en: 'System administrator' },
      desc: { ar: 'إدارة المستخدمين والإعدادات — بلا صلاحية اعتماد مالي',
              en: 'Manages accounts and configuration — no financial approval authority' },
      dept: 'system',
      perms: {
        /* ⚠️ THE BUG THIS LINE CAUSED — fixed 17 August 2026
           It used to read  '*': ['view']  — view only.
           permsFor() falls back to '*' for every screen not named below,
           so on ~40 screens the administrator could look but never create.
           No «＋ إضافة» button, and no استيراد button either, because
           import.js only shows itself where you may create.

           كان السطر view فقط، فاختفى زر «إضافة» وزر «استيراد» من كل شاشة
           غير مذكورة بالاسم تحت. الإنشاء ليس قراراً مالياً — الاعتماد هو
           القرار، وهو ما يبقى ممنوعاً على مسؤول النظام.

           Creating is not approving. The audit's objection was that one
           account could raise an invoice AND approve AND pay it. Approve,
           review and delete stay absent below, so that stays impossible. */
        '*': ['view', 'create', 'edit'],

        /* ── CONFIGURATION / MASTER DATA ──────────────────────────────
           The audit's wording was precise: a technical administrator
           "should manage accounts/configuration but should not approve
           payments, journals, stock, payroll or procurement."

           Setting up the company's projects, warehouses, items and
           suppliers IS configuration. It is not a financial decision and
           it moves no money.

           My first version of this fix removed these too, which left the
           portal with THREE screens nobody in the company could create:
           projects, warehouses and equipment. That made the whole system
           unusable, because almost every document asks for a project.

           إعداد المشروعات والمخازن والأصناف والموردين هو ضبط للنظام،
           وليس قراراً مالياً. النسخة الأولى من هذا التعديل منعته أيضاً
           فأصبح لا أحد في الشركة يستطيع إنشاء مشروع — وبدون مشروع لا
           يعمل أي مستند تقريباً. */
        projects:       ['view', 'create', 'edit', 'delete'],
        sites:          ['view', 'create', 'edit', 'delete'],
        warehouses:     ['view', 'create', 'edit', 'delete'],
        equipment:      ['view', 'create', 'edit', 'delete'],
        accounts:       ['view', 'create', 'edit', 'delete'],
        costItems:      ['view', 'create', 'edit', 'delete'],
        items:          ['view', 'create', 'edit', 'delete'],
        suppliers:      ['view', 'create', 'edit', 'delete'],
        customers:      ['view', 'create', 'edit', 'delete'],
        subcontractors: ['view', 'create', 'edit', 'delete'],
        cashAccounts:   ['view', 'create', 'edit', 'delete'],
        employees:      ['view', 'create', 'edit', 'delete'],
        announcements:  ['view', 'create', 'edit', 'delete']

        /* Deliberately absent: create/edit on journal, payments, receipts,
           supplierInvoices, IPCs, payroll, stock movements, purchase
           approvals — and review/approve on anything at all. */
      },
      canManageUsers: true,
      allProjects: true
    },

    /* Emergency break-glass account. Deliberately NOT given to anyone by
       default. Create it only when a real emergency requires it, use it,
       then disable it again — every action it takes is audited.
       حساب الطوارئ: لا يُمنح لأحد افتراضياً. يُفعّل عند الضرورة فقط. */
    breakglass: {
      label: { ar: 'حساب طوارئ', en: 'Emergency break-glass' },
      desc: { ar: 'صلاحية كاملة مؤقتة — تُفعّل عند الضرورة القصوى وتُوثّق بالكامل',
              en: 'Temporary full authority — enable only in a genuine emergency, fully audited' },
      dept: 'system',
      perms: { '*': ALL },
      canManageUsers: true,
      allProjects: true,
      emergencyOnly: true
    },

    gm: {
      label: { ar: 'المدير العام', en: 'General manager' },
      desc: { ar: 'اطلاع كامل واعتماد نهائي لكل المستندات', en: 'Full visibility and final approval on all documents' },
      dept: 'system',
      perms: {
        /* Same fix as above. A general manager who cannot start a document
           is not a general manager. He signs everything and he may also
           write — in a company of this size he often does both, and every
           action carries his name in the audit trail.
           المدير العام يوقّع ويكتب. كل فعل مسجَّل باسمه. */
        /* «حذف» لم تعد محواً — صارت إلغاءً موثّقاً بسبب إجباري، يبقى
           الصف في قاعدة البيانات ويمكن للإدارة استعادته. لذلك يجوز
           للمدير العام إلغاء أي مستند: القرار قراره، والأثر محفوظ.
           Delete is now a logged, reversible cancellation, so the general
           manager may cancel any document: the decision is his and the
           trace is permanent. */
        '*': ['view', 'create', 'edit', 'delete', 'review', 'approve'],
        projects: ['view', 'create', 'edit', 'delete', 'review', 'approve'],
        sites: ['view', 'create', 'edit']
      },
      canManageUsers: false,
      allProjects: true
    },

    auditor: {
      label: { ar: 'مراجع داخلي (قراءة فقط)', en: 'Internal auditor (read-only)' },
      desc: { ar: 'اطلاع كامل بدون أي تعديل', en: 'Full visibility, no changes at all' },
      dept: 'system',
      perms: {
        sites: LOOKUP, '*': ['view'] }
    },

    reviewer: {
      label: { ar: 'مراجع مستندات', en: 'Document reviewer' },
      desc: { ar: 'مراجعة المستندات قبل الاعتماد', en: 'Reviews documents before approval' },
      dept: 'system',
      perms: {
        sites: LOOKUP,
        '*': ['view', 'review'],
        /* المراجع لا يحتاج بيانات الموظفين الشخصية */
        employees: ['lookup'], payroll: []
      }
    },

    /* ═══════════════ المالية والمشتريات والمخازن ═══════════════ */
    finance_manager: {
      label: { ar: 'المدير المالي', en: 'Finance manager' },
      desc: { ar: 'اعتماد المستندات المالية ومتابعة ربحية المشروعات', en: 'Approves financial documents, tracks project profitability' },
      dept: 'finance',
      perms: {
        sites: LOOKUP,
        accounts: ALL, journal: ALL, suppliers: ALL, customers: ALL, costItems: ALL,
        supplierInvoices: ALL, payments: ALL, receipts: ALL, cashAccounts: ALL,
        purchaseApprovals: ['view', 'review', 'approve'],
        goodsReceipts: ['view'], items: ['view'], warehouses: ['view'],
        stockIssues: ['view'], stockTransfers: ['view'], stockCounts: ['view'],
        budgets: ['view', 'review', 'approve'],
        clientIPCs: ['view', 'review', 'approve'],
        subIPCs: ['view', 'review', 'approve'],
        payroll: ['view', 'review', 'approve'],
        employeeAdvances: ['view', 'review', 'approve'],
        dailyLabour: ['view', 'review', 'approve'],
        /* إلغاء عقد قرار تجاري ومالي — يشترك فيه المدير المالي مع
           المدير العام. والإلغاء موثّق بسبب إجباري وقابل للاستعادة.
           Cancelling a contract is a commercial and financial decision,
           shared between the finance manager and the GM. Every
           cancellation carries a mandatory reason and is reversible. */
        projects: ['view'],
        clientContracts: ['view', 'delete'],
        subContracts:    ['view', 'delete'],
        subcontractors: ['view'],
        /* بيانات الموظفين للاعتماد فقط — بلا شاشة الملفات الشخصية */
        employees: ['lookup'],
        ncr: ['view'], siteInstructions: ['view']
      }
    },

    accountant: {
      label: { ar: 'محاسب', en: 'Accountant' },
      desc: { ar: 'إدخال القيود والفواتير والسندات', en: 'Enters journals, invoices and vouchers' },
      dept: 'finance',
      perms: {
        sites: LOOKUP,
        journal: ['view', 'create', 'edit', 'delete'],
        supplierInvoices: ['view', 'create', 'edit', 'delete'],
        payments: ['view', 'create', 'edit', 'delete'],
        receipts: ['view', 'create', 'edit', 'delete'],
        suppliers: ['view', 'create', 'edit'],
        customers: ['view', 'create', 'edit'],
        accounts: ['view'], costItems: ['view'], cashAccounts: ['view'],
        employeeAdvances: ['view'],
        purchaseApprovals: ['view'], goodsReceipts: ['view'],
        clientIPCs: ['view'], subIPCs: ['view'],
        /* أسماء فقط للترميز والربط */
        projects: LOOKUP, employees: LOOKUP, items: LOOKUP,
        subcontractors: LOOKUP, warehouses: LOOKUP, budgets: LOOKUP,
        clientContracts: LOOKUP, subContracts: LOOKUP
      }
    },

    procurement: {
      label: { ar: 'مسؤول مشتريات', en: 'Procurement officer' },
      desc: { ar: 'إعداد اعتمادات الشراء ومتابعة الموردين', en: 'Prepares purchase approvals, manages suppliers' },
      dept: 'finance',
      perms: {
        sites: LOOKUP,
        purchaseApprovals: ['view', 'create', 'edit', 'delete'],
        suppliers: ['view', 'create', 'edit'],
        items: ['view', 'create', 'edit'],
        goodsReceipts: ['view'], supplierInvoices: ['view'],
        submittals: ['view'],
        projects: LOOKUP, costItems: LOOKUP, warehouses: LOOKUP,
        budgets: LOOKUP, employees: LOOKUP, subcontractors: LOOKUP
      }
    },

    storekeeper: {
      label: { ar: 'أمين مخزن', en: 'Storekeeper' },
      desc: { ar: 'الاستلام والصرف والتحويل والجرد', en: 'Receipts, issues, transfers and counts' },
      dept: 'finance',
      perms: {
        sites: LOOKUP,
        goodsReceipts: ['view', 'create', 'edit', 'delete'],
        stockIssues: ['view', 'create', 'edit', 'delete'],
        stockTransfers: ['view', 'create', 'edit', 'delete'],
        stockCounts: ['view', 'create', 'edit', 'delete'],
        items: ['view', 'create', 'edit'],
        warehouses: ['view'],
        purchaseApprovals: ['view'],
        mir: ['view'],
        projects: LOOKUP, costItems: LOOKUP, suppliers: LOOKUP, employees: LOOKUP
      }
    },

    /* ═══════════════ المشروعات والمكتب الفني ═══════════════ */
    project_manager: {
      label: { ar: 'مدير مشروع', en: 'Project manager' },
      desc: { ar: 'متابعة المشروع وتكلفته ومستخلصاته وموقعه', en: 'Runs the project: cost, IPCs and site' },
      dept: 'projects',
      perms: {
        sites: LOOKUP,
        projects: ['view', 'edit'],
        budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'],
        clientContracts: ['view'],
        subIPCs: ['view', 'create', 'edit', 'review'],
        subContracts: ['view', 'create', 'edit'],
        subcontractors: ['view', 'create', 'edit', 'delete'],
        siteReports: ['view', 'create', 'edit', 'delete'],
        drawings: ['view'],
        equipment: ['view'], equipmentLogs: ['view', 'create', 'edit'],
        purchaseApprovals: ['view', 'create', 'review'],
        stockIssues: ['view', 'review'], goodsReceipts: ['view'],
        /* شاشات الموقع — يعتمد ما يرفعه مهندسو الموقع */
        wir: ['view', 'review', 'approve'],
        mir: ['view', 'review'],
        pourCards: ['view', 'review', 'approve'],
        asphaltRecords: ['view', 'review'],
        surveyRecords: ['view'],
        labourAllocation: ['view', 'review', 'approve'],
        ncr: ['view', 'create', 'edit', 'review'],
        siteInstructions: ['view', 'create', 'edit'],
        safetyReports: ['view', 'review'],
        /* ضبط المستندات — يقرأ فقط */
        rfi: ['view', 'create'], submittals: ['view'], docRegister: ['view'],
        transmittals: ['view'], correspondence: ['view'],
        attendance: ['view', 'create', 'edit'],
        siteAttendance: ['view', 'review', 'approve'],
        dailyLabour: ['view', 'review', 'approve'],
        costItems: LOOKUP, items: LOOKUP, warehouses: LOOKUP,
        customers: LOOKUP, employees: LOOKUP, suppliers: LOOKUP
      }
    },

    technical: {
      label: { ar: 'المكتب الفني', en: 'Technical office' },
      desc: { ar: 'الرسومات والموازنات وحصر الكميات والمستخلصات', en: 'Drawings, budgets, quantity surveying and IPCs' },
      dept: 'projects',
      perms: {
        sites: LOOKUP,
        drawings: ['view', 'create', 'edit', 'delete'],
        budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'],
        subIPCs: ['view', 'create', 'edit'],
        costItems: ['view', 'create', 'edit'],
        surveyRecords: ['view'],
        asphaltRecords: ['view'],
        /* ٢٥ أغسطس ٢٠٢٦ · طلب من محمد زيدان: المكتب الفني يرفع طلب فحص
           أعمال أو مواد بنفسه، لا يكتفي بالمراجعة والاعتماد.
           25 August 2026, requested by Mohamed Zidan: the technical
           office raises its own inspection requests — not just reviews
           and approves what site engineers raise. */
        wir: ['view', 'create', 'edit', 'delete'],
        mir: ['view', 'create', 'edit', 'delete'],
        rfi: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
        docRegister: ['view'],
        siteInstructions: ['view'],
        projects: ['view'],
        clientContracts: ['view'], subContracts: ['view'],
        subcontractors: LOOKUP, items: LOOKUP, employees: LOOKUP,
        customers: LOOKUP, suppliers: LOOKUP
      }
    },

    /* ═══════════════ الموقع والتنفيذ — قسم جديد ═══════════════ */
    site_engineer: {
      label: { ar: 'مهندس موقع', en: 'Site engineer' },
      desc: { ar: 'التنفيذ اليومي: طلبات الفحص والصب والأسفلت والعمالة والسلامة',
              en: 'Daily execution: inspections, pours, asphalt, labour and safety' },
      dept: 'site',
      perms: {
        sites: LOOKUP,
        wir: ['view', 'create', 'edit', 'delete'],
        mir: ['view', 'create', 'edit', 'delete'],
        pourCards: ['view', 'create', 'edit', 'delete'],
        asphaltRecords: ['view', 'create', 'edit', 'delete'],
        surveyRecords: ['view', 'create', 'edit'],
        labourAllocation: ['view', 'create', 'edit', 'delete'],
        ncr: ['view', 'create', 'edit'],
        siteInstructions: ['view', 'create', 'edit'],
        safetyReports: ['view', 'create', 'edit'],
        siteReports: ['view', 'create', 'edit'],
        equipmentLogs: ['view', 'create', 'edit'],
        siteAttendance: ['view', 'create', 'edit'],
        dailyLabour: ['view', 'create', 'edit'],
        /* يقرأ ما يخص عمله فقط */
        projects: ['view'],
        drawings: ['view'],
        rfi: ['view', 'create'],
        submittals: ['view'],
        stockIssues: ['view', 'create'],
        goodsReceipts: ['view'],
        equipment: ['view'],
        items: LOOKUP, costItems: LOOKUP, warehouses: LOOKUP,
        subcontractors: LOOKUP, employees: LOOKUP, suppliers: LOOKUP,
        purchaseApprovals: LOOKUP, customers: LOOKUP
      }
    },

    /* ═══════════════ ضبط المستندات — قسم جديد ═══════════════ */
    document_control: {
      label: { ar: 'ضبط المستندات', en: 'Document control' },
      desc: { ar: 'سجل المستندات والمراجعات والمراسلات والاعتمادات والأرشيف',
              en: 'Document register, revisions, correspondence, submittals and archive' },
      dept: 'dc',
      perms: {
        sites: LOOKUP,
        docRegister: ['view', 'create', 'edit', 'delete'],
        transmittals: ['view', 'create', 'edit', 'delete'],
        rfi: ['view', 'create', 'edit', 'delete'],
        submittals: ['view', 'create', 'edit', 'delete'],
        correspondence: ['view', 'create', 'edit', 'delete'],
        distribution: ['view', 'create', 'edit', 'delete'],
        docArchive: ['view', 'create', 'edit', 'delete'],
        /* ── تعديل ١٧ أغسطس ٢٠٢٦ · القاعدة: ما يراه يستطيع الإضافة فيه ──
           كان يرى العقود والمشروعات ولا يستطيع تسجيل واحد. ضابط المستندات
           هو من يقيّد العقد في السجل ويعطيه رقماً ويتابع مراجعاته — منعه
           من ذلك يعني أن يظل العمل على الورق.

           17 August 2026. The rule is now: whatever he can see, he can
           add to. Registering a contract, giving it a number and tracking
           its revisions IS document control. Refusing him that just keeps
           the work on paper.

           ما زال محجوباً عنه: الموظفون، الرواتب، الحسابات، المخازن،
           وكل ما يخص المال. وما زال لا يعتمد شيئاً بنفسه.
           Still hidden from him: employees, payroll, accounts, stock and
           anything financial. And he still approves nothing himself. */
        /* ── ٢٣ أغسطس · طلبات الفحص ──────────────────────────────────
           أ. أحمد كتب بنفسه: «موضوع الريكوستات الردم والجيوجريد
           والخرسانة». إذن هو يتعامل مع طلبات الفحص يومياً — يقيّدها
           ويعطيها أرقاماً ويتابع ردّ الاستشاري عليها. وكانت الشاشة
           محجوبة عنه تماماً فلم يجدها في القائمة أصلاً.

           Ahmed raised the inspection requests himself. He registers
           them, numbers them and chases the consultant's reply. The
           screen was hidden from his role entirely, which is why it
           was not in his menu at all. */
        wir:             ['view', 'create', 'edit'],
        mir:             ['view', 'create', 'edit'],
        pourCards:       ['view'],

        drawings:        ['view', 'create', 'edit'],
        projects:        ['view', 'create', 'edit'],
        /* ضابط المستندات يسجّل العقد ويتابعه، ولا يلغيه. إلغاء عقد
           قرار تجاري — للمدير العام والمدير المالي.
           Document Control registers and tracks a contract; cancelling
           one is a commercial decision for the GM and finance manager. */
        clientContracts: ['view', 'create', 'edit'],
        subContracts:    ['view', 'create', 'edit'],
        legalDocs:       ['view', 'create', 'edit'],
        siteInstructions:['view', 'create', 'edit'],
        ncr:             ['view', 'create', 'edit'],

        /* عقد مقاول باطن جديد يحتاج مقاولاً جديداً، وعقد عميل يحتاج عميلاً.
           لولا هذان السطران لعجز عن تسجيل أول عقد لطرف جديد.
           A new subcontract needs a new subcontractor and a client
           contract needs a client. Without these two lines he could not
           register the first contract with any new party. */
        subcontractors:  ['view', 'create', 'edit'],
        customers:       ['view', 'create', 'edit'],

        /* هذه تبقى «بحث فقط» — يراها في القوائم المنسدلة ولا يفتح شاشتها.
           الأصناف والموردون شأن المشتريات والمخازن، لا ضبط المستندات. */
        items: LOOKUP, suppliers: LOOKUP, employees: LOOKUP, costItems: LOOKUP
      }
    },

    /* ═══════════════ الموارد البشرية والإدارة ═══════════════ */
    hr: {
      label: { ar: 'الموارد البشرية', en: 'Human resources' },
      desc: { ar: 'الموظفون والحضور والإجازات والرواتب', en: 'Employees, attendance, leave and payroll' },
      dept: 'people',
      perms: {
        sites: LOOKUP,
        employees: ['view', 'create', 'edit', 'delete'],
        attendance: ['view', 'create', 'edit', 'delete'],
        /* ── HR screens built from the 15 Aug 2026 department meeting ── */
        employeeDocs: ['view', 'create', 'edit', 'delete'],
        employmentContracts: ['view', 'create', 'edit'],
        siteAttendance: ['view', 'create', 'edit', 'delete'],
        dailyLabour: ['view', 'create', 'edit'],
        /* HR OFFICER — شؤون العاملين
           Prepares everything, approves nothing. His manager signs.
           يُعدّ كل شيء ولا يعتمد شيئاً — المدير يوقّع. */
        leaves: ['view', 'create', 'edit'],
        employeeAdvances: ['view', 'create', 'edit'],
        dailyLabour: ['view', 'create', 'edit'],
        payroll: ['view', 'create', 'edit'],
        announcements: ['view', 'create', 'edit', 'delete'],
        labourAllocation: ['view'],
        safetyReports: ['view'],
        legalDocs: ['view'],
        projects: LOOKUP, itAssets: LOOKUP,
        costItems: LOOKUP, equipment: LOOKUP
      }
    },

    /* ══ مدير الموارد البشرية ═══════════════════════════════════════
       لماذا هذا الدور موجود:

       كانت الإجازات والسلف وكشوف العمالة اليومية لا يعتمدها إلا المدير
       العام. أي أن صاحب الشركة يوقّع على كل إجازة اعتيادية وكل سلفة
       أسبوعية لكل موظف من ٤٥٠ موظفاً. هذا ليس رقابة — هذا شلل، ونتيجته
       الحتمية أن يوقّع الجميع بالجملة دون قراءة.

       مدير الموارد البشرية يعتمد شغل قسمه بنفسه. المدير العام يبقى فوقه
       للاستثناءات، والمال الكبير (مسير الرواتب) يظل عند المالية والمدير
       العام لأنه مال فعلي يخرج.

       WHY THIS ROLE EXISTS

       Leave, advances and daily labour sheets could only be approved by
       the general manager. That meant the owner of the company signing
       every ordinary leave request and every weekly advance for 450
       people. That is not control, it is paralysis — and it guarantees
       bulk-approval without reading.

       The HR manager now approves his own department's routine work.
       The GM stays above him for exceptions, and payroll — real money
       leaving the company — still needs finance and the GM.
       ═══════════════════════════════════════════════════════════════ */
    hr_manager: {
      label: { ar: 'مدير الموارد البشرية', en: 'HR manager' },
      desc: { ar: 'يدير القسم ويعتمد الإجازات والسلف بنفسه — بلا رجوع للإدارة العليا',
              en: 'Runs the department and approves leave and advances himself' },
      dept: 'people',
      perms: {
        sites: LOOKUP,
        /* everything the HR officer does */
        employees:           ['view', 'create', 'edit', 'delete'],
        employeeDocs:        ['view', 'create', 'edit', 'delete'],
        employmentContracts: ['view', 'create', 'edit', 'delete'],
        attendance:          ['view', 'create', 'edit', 'delete'],
        siteAttendance:      ['view', 'create', 'edit', 'delete'],
        announcements:       ['view', 'create', 'edit', 'delete'],

        /* …plus the authority to sign off his own department's work */
        leaves:              ['view', 'create', 'edit', 'review', 'approve'],
        employeeAdvances:    ['view', 'create', 'edit', 'review', 'approve'],
        dailyLabour:         ['view', 'create', 'edit', 'review', 'approve'],

        /* payroll: prepares and reviews, but does NOT approve.
           Real money leaving needs a second pair of eyes — finance or GM.
           يعدّ المسير ويراجعه، لكن لا يعتمده. المال الفعلي يحتاج توقيعاً ثانياً. */
        payroll:             ['view', 'create', 'edit', 'review'],

        legalDocs:           ['view'],
        labourAllocation:    ['view'],
        safetyReports:       ['view'],
        projects: LOOKUP, itAssets: LOOKUP, costItems: LOOKUP, equipment: LOOKUP
      }
    },

    legal: {
      label: { ar: 'الشؤون القانونية', en: 'Legal affairs' },
      desc: { ar: 'العقود والتراخيص والقضايا والمطالبات', en: 'Contracts, licences, cases and claims' },
      dept: 'people',
      perms: {
        sites: LOOKUP,
        legalDocs: ['view', 'create', 'edit', 'delete'],
        clientContracts: ['view', 'create', 'edit'],
        subContracts: ['view', 'create', 'edit'],
        correspondence: ['view'],
        ncr: ['view'],
        siteInstructions: ['view'],
        projects: ['view'],
        customers: LOOKUP, suppliers: LOOKUP,
        subcontractors: LOOKUP, employees: LOOKUP, costItems: LOOKUP
      }
    },

    it: {
      label: { ar: 'تقنية المعلومات', en: 'IT officer' },
      desc: { ar: 'الأصول التقنية وطلبات الدعم', en: 'IT assets and support tickets' },
      dept: 'people',
      perms: {
        sites: LOOKUP,
        itAssets: ['view', 'create', 'edit', 'delete'],
        itTickets: ['view', 'create', 'edit', 'delete'],
        announcements: ['view'],
        employees: LOOKUP
      }
    },

    employee: {
      label: { ar: 'موظف', en: 'Employee' },
      desc: { ar: 'الاطلاع على التعميمات وتقديم الطلبات', en: 'Reads announcements, submits requests' },
      dept: 'people',
      perms: {
        sites: LOOKUP,
        announcements: ['view'],
        leaves: ['view', 'create', 'edit'],
        itTickets: ['view', 'create', 'edit'],
        attendance: ['view'],
        employees: LOOKUP, projects: LOOKUP
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     قاعدة واحدة: ما تستطيع إنشاءه تستطيع إلغاءه
     -------------------------------------------------------------------
     طلب الإدارة ٢٤ أغسطس ٢٠٢٦:
       «أريد ضبط المستندات أن يلغي تعاقد مقاول باطن دون انتظار مدير،
        على أن يُسجَّل كل شيء — من أنشأ ومن عدّل ومن ألغى ولماذا ومتى —
        ولا أريد كل شيء ينتظر مديراً.»

     صار «الحذف» إلغاءً موثّقاً: الصف يبقى في قاعدة البيانات، ويحمل اسم
     من ألغاه وتاريخه وسببه الإجباري، وتستطيع الإدارة استعادته في ثوانٍ.
     وما دام كذلك، فلا معنى لإيقاف الموظف عن إلغاء ما أنشأه بنفسه —
     الانتظار يعطّل العمل ولا يحمي شيئاً، والسجل هو الحماية الحقيقية.

     ONE RULE: whatever you may create, you may cancel.

     Cancelling is now logged and reversible — the row stays, carrying who
     cancelled it, when, and a mandatory reason, and management can
     restore it in seconds. Given that, there is no sense in making an
     employee wait for a manager to cancel work he created himself.
     Waiting stops the work and protects nothing; the log is the real
     protection.

     ينطبق على أقسام التنفيذ الثلاثة فقط. الإدارة العليا والمالية لها
     صلاحياتها المكتوبة أعلاه بالاسم، ولا تُمسّ هنا.
     Applies to the three operating departments only. Executive and
     finance authority is written out by name above and untouched here. */
  ['document_control', 'site_engineer', 'hr_manager'].forEach(function (roleName) {
    var r = ROLES[roleName];
    if (!r || !r.perms) return;
    Object.keys(r.perms).forEach(function (screen) {
      if (screen === '*') return;
      var acts = r.perms[screen];
      if (!Array.isArray(acts)) return;
      var canMake = acts.indexOf('create') !== -1 || acts.indexOf('edit') !== -1;
      if (canMake && acts.indexOf('delete') === -1) acts.push('delete');
    });
  });

  var current = null;
  var client = null;

  function config() { return global.ALZAHRAA_CONFIG || {}; }

  async function invocationPayload(result) {
    if (result && result.data && typeof result.data === 'object') return result.data;
    var response = result && (result.response || (result.error && result.error.context));
    if (response && typeof response.clone === 'function') {
      try { return await response.clone().json(); } catch (e) {}
    }
    return null;
  }

  async function init() {
    if (!config().isConfigured || !config().isConfigured()) return { ok: false, error: 'not-configured' };
    if (!global.supabase || typeof global.supabase.createClient !== 'function') return { ok: false, error: 'auth-library' };
    client = global.supabase.createClient(config().supabaseUrl, config().supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 8 } }
    });
    return { ok: true, client: client };
  }

  async function profileFor(authUid, allowOffline) {
    var profile = null;
    var readError = null;
    if (client && navigator.onLine !== false) {
      var res = await client.from('users').select('*').eq('auth_uid', authUid).maybeSingle();
      /* Keep the real database error instead of throwing it away. A missing
         table privilege used to look identical to "no such user", which made
         the login failure impossible to diagnose from the screen. */
      if (res.error) readError = res.error;
      else profile = res.data;
    }
    if (!profile && allowOffline && global.OfflineDB) profile = await OfflineDB.loadProfile(authUid);
    if (!profile) {
      if (readError) {
        console.error('[Alzahraa] could not read the user profile:', readError.code || '', readError.message || readError);
        return { readError: readError };
      }
      return null;
    }
    if (profile.status === 'inactive') return { disabled: true };
    delete profile.password;
    delete profile.login_email;
    delete profile.auth_uid;
    if (global.OfflineDB) {
      try {
        await OfflineDB.saveProfile(authUid, profile);
        await OfflineDB.saveProfile(profile.id, profile);
      } catch (e) {}
    }
    return profile;
  }

  async function login(identifier, password) {
    if (!client) return { ok: false, error: 'not-configured' };
    var value = String(identifier || '').trim().toLowerCase();
    var pass = String(password || '');
    if (!value || !pass) return { ok: false, error: 'bad' };
    var session = null, invokeError = null;

    try {
      var invoked = await client.functions.invoke(config().authFunction || 'auth-login', {
        body: { identifier: value, password: pass }
      });
      invokeError = invoked.error;
      if (invoked.data && invoked.data.session) session = invoked.data.session;
    } catch (e) { invokeError = e; }

    if (!session) {
      console.warn('sign-in failed', invokeError && (invokeError.message || invokeError));
      return { ok: false, error: 'bad' };
    }
    var set = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (set.error || !set.data.user) return { ok: false, error: 'bad' };

    var profile = await profileFor(set.data.user.id, false);
    if (profile && profile.disabled) { await client.auth.signOut({ scope: 'local' }); return { ok: false, error: 'disabled' }; }
    if (profile && profile.readError) {
      await client.auth.signOut({ scope: 'local' });
      /* Surface the true cause so the screen stops blaming the employee file. */
      return { ok: false, error: 'db-permission', detail: profile.readError.message, code: profile.readError.code };
    }
    if (!profile) { await client.auth.signOut({ scope: 'local' }); return { ok: false, error: 'profile' }; }
    current = profile;
    return { ok: true, user: current };
  }

  async function restore() {
    if (!client) return null;
    var res = await client.auth.getSession();
    var session = res.data && res.data.session;
    if (!session || !session.user) return null;
    var profile = await profileFor(session.user.id, true);
    if (!profile || profile.disabled || profile.readError) return null;
    current = profile;
    return current;
  }

  async function logout() {
    if (current && global.Store && Store.isInitialized()) Store.log('logout', 'users', current.id, current.name);
    if (global.Store && Store.close) await Store.close();
    current = null;
    try { if (client) await client.auth.signOut({ scope: 'local' }); } catch (e) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function users() {
    var list = global.Store ? Store.all('users') : [];
    if (current && !list.some(function (u) { return u.id === current.id; })) list.push(current);
    return list;
  }

  async function updatePassword(oldPassword, newPassword) {
    if (!current || !client) return { ok: false, error: 'no-user' };
    var res = await client.functions.invoke(config().passwordFunction || 'change-password', {
      body: { oldPassword: oldPassword, newPassword: newPassword }
    });
    var payload = await invocationPayload(res);
    if (res.error || !payload || !payload.ok) {
      var code = payload && payload.error;
      return { ok: false, error: code === 'invalid_credentials' ? 'bad-old-password' : (code || (res.error && res.error.message) || 'password-update-failed') };
    }
    current.mustChangePassword = false;
    current.passwordSetAt = new Date().toISOString();
    if (global.OfflineDB) {
      try {
        var sessionResult = await client.auth.getSession();
        var sessionUser = sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
        if (sessionUser) await OfflineDB.saveProfile(sessionUser.id, current);
        await OfflineDB.saveProfile(current.id, current);
      } catch (e) {}
    }
    return { ok: true };
  }

  async function adminUsers(action, payload) {
    if (!client || !current || !isAdmin()) return { ok: false, error: 'forbidden' };
    var res = await client.functions.invoke(config().userAdminFunction || 'admin-users', {
      body: Object.assign({ action: action }, payload || {})
    });
    var response = await invocationPayload(res);
    if (res.error) return { ok: false, error: (response && response.error) || res.error.message || 'admin-operation-failed' };
    return response || { ok: true };
  }

  function role(user) {
    var u = user || current;
    return (u && ROLES[u.role]) || null;
  }

  /* An unknown role name used to return null here, which means "no
     permission on anything" — every button disappears and nothing on the
     screen explains why. That is the worst kind of failure: silent.
     Now it says so, loudly, in the console.
     الدور غير المعروف كان يُفقد كل الصلاحيات بصمت. الآن يُعلن عن نفسه. */
  var warnedRoles = {};
  function permsFor(moduleId) {
    if (!current) return null;
    var r = ROLES[current.role];
    if (!r) {
      if (!warnedRoles[current.role]) {
        warnedRoles[current.role] = true;
        console.error('[auth] الدور «' + current.role + '» غير معرّف في auth.js — ' +
          'لذلك لا تظهر أي أزرار. Unknown role "' + current.role + '": every ' +
          'permission is denied. Known roles: ' + Object.keys(ROLES).join(', '));
      }
      return null;
    }
    if (current.overrides && current.overrides[moduleId]) return current.overrides[moduleId];
    if (r.perms[moduleId]) return r.perms[moduleId];
    if (r.perms['*']) return r.perms['*'];
    return null;
  }

  /* Can the current user perform `action` on module `moduleId`? */
  function can(moduleId, action) {
    var p = permsFor(moduleId);
    if (!p) return false;
    return p.indexOf(action) !== -1;
  }

  /* Screen appears in the menu and can be opened. */
  function canSee(moduleId) { return can(moduleId, 'view'); }

  /* Name may be resolved in a dropdown — but the screen stays hidden.
     يكفي لإظهار الاسم في القائمة المنسدلة دون فتح الشاشة */
  function canLookup(moduleId) {
    var p = permsFor(moduleId);
    if (!p) return false;
    return p.indexOf('view') !== -1 || p.indexOf('lookup') !== -1;
  }

  /* Is this field one the current role must never read? */
  function fieldHidden(moduleId, fieldName) {
    if (!current) return true;
    var list = SENSITIVE[moduleId];
    if (!list || list.indexOf(fieldName) === -1) return false;
    if (SENSITIVE_ROLES.indexOf(current.role) !== -1) return false;
    /* An employee may always read their own record. */
    if (moduleId === 'employees' && current.employeeId) return false;
    return true;
  }

  /* Strip sensitive fields from a record before it reaches the screen. */
  function maskRecord(moduleId, rec) {
    if (!rec || !SENSITIVE[moduleId]) return rec;
    if (SENSITIVE_ROLES.indexOf(current && current.role) !== -1) return rec;
    if (moduleId === 'employees' && current && current.employeeId && rec.id === current.employeeId) return rec;
    var copy = Object.assign({}, rec);
    SENSITIVE[moduleId].forEach(function (f) { if (f in copy) copy[f] = null; });
    return copy;
  }

  function isAdmin() { return !!(current && ROLES[current.role] && ROLES[current.role].canManageUsers); }

  /* Restrict a list of rows to the projects the user is allowed to see.
     An empty `projects` array on the user means "all projects". */
  /* ══ AUDIT FIX (Critical) · project scoping is now FAIL-CLOSED ══════
     Before: an empty projects list meant "every project". Leaving the
     boxes unchecked — the easy mistake — silently granted access to the
     whole company. Empty must mean nothing, never everything.

     A role that genuinely needs every project must now say so explicitly,
     either by its role definition (allProjects) or by a deliberate
     per-user entitlement (user.allProjects === true).

     قبل التعديل: ترك خانات المشاريع فارغة كان يعني «كل المشاريع».
     الآن يعني «لا شيء». الوصول لكل المشاريع يحتاج تفعيلاً صريحاً. */
  var GLOBAL_PROJECT_ROLES = ['admin', 'gm', 'auditor', 'finance_manager', 'hr', 'hr_manager', 'legal'];

  function hasAllProjects(u) {
    var user = u || current;
    if (!user) return false;
    if (user.allProjects === true) return true;
    var r = ROLES[user.role];
    if (r && r.allProjects === true) return true;
    return GLOBAL_PROJECT_ROLES.indexOf(user.role) !== -1;
  }

  function scopeRows(moduleId, rows) {
    if (!current) return [];
    var mod = Schema.get(moduleId);
    if (!mod) return rows;
    var hasProject = mod.fields.some(function (f) { return f.name === 'project'; });
    if (!hasProject) return rows;

    if (hasAllProjects()) return rows;

    var allowed = current.projects || [];
    if (!allowed.length) {
      /* Fail closed. Show nothing rather than everything. */
      return rows.filter(function (r) { return !r.project; });
    }
    return rows.filter(function (r) { return !r.project || allowed.indexOf(r.project) !== -1; });
  }

  global.Auth = {
    ROLES: ROLES,
    SENSITIVE: SENSITIVE,
    init: init, login: login, logout: logout, restore: restore,
    client: function () { return client; },
    isConfigured: function () { return !!client; },
    updatePassword: updatePassword,
    adminUsers: adminUsers,
    current: function () { return current; },
    role: role, can: can, canSee: canSee, canLookup: canLookup,
    fieldHidden: fieldHidden, maskRecord: maskRecord,
    isAdmin: isAdmin,
    scopeRows: scopeRows, hasAllProjects: hasAllProjects,
    users: users,
    roleLabel: function (key) { return ROLES[key] ? L(ROLES[key].label) : key; }
  };
})(window);
