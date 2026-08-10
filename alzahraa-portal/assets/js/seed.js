/* =========================================================================
   seed.js — realistic demo data so the portal looks alive on first open
   ---------------------------------------------------------------------
   This runs ONCE, the first time the site is opened on a device.
   Settings ▸ Data ▸ "Reset to demo data" runs it again.
   You can safely delete every record from inside the app once you start
   entering real information.
   ========================================================================= */
(function (global) {
  'use strict';

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
  function daysAhead(n) { return daysAgo(-n); }

  var ids = {};
  function put(table, key, data) {
    var row = Object.assign({ id: table + '_' + key }, data);
    row.createdAt = row.createdAt || new Date(Date.now() - Math.random() * 6e9).toISOString();
    row.createdBy = row.createdBy || 'users_admin';
    row.updatedAt = row.createdAt;
    row.updatedBy = row.createdBy;
    ids[table] = ids[table] || {};
    ids[table][key] = row.id;
    return row;
  }
  function id(table, key) { return table + '_' + key; }

  /* Give a workflow document a completed approval trail */
  function approvedDoc(data, prefix, seq, creator, reviewer, approver, day) {
    var when = new Date(); when.setDate(when.getDate() - day);
    var iso = when.toISOString();
    return Object.assign({
      docNo: prefix + '-2026-' + String(seq).padStart(4, '0'),
      status: 'approved',
      createdBy: creator, submittedBy: creator, submittedAt: iso,
      reviewedBy: reviewer, reviewedAt: iso,
      approvedBy: approver, approvedAt: iso, postedAt: iso,
      trail: [
        { action: 'submit', userId: creator, userName: nameOf(creator), at: iso, note: '' },
        { action: 'review', userId: reviewer, userName: nameOf(reviewer), at: iso, note: '' },
        { action: 'approve', userId: approver, userName: nameOf(approver), at: iso, note: '' }
      ]
    }, data);
  }
  function pendingDoc(data, prefix, seq, creator, day) {
    var when = new Date(); when.setDate(when.getDate() - day);
    var iso = when.toISOString();
    return Object.assign({
      docNo: prefix + '-2026-' + String(seq).padStart(4, '0'),
      status: 'pending', createdBy: creator, submittedBy: creator, submittedAt: iso,
      trail: [{ action: 'submit', userId: creator, userName: nameOf(creator), at: iso, note: '' }]
    }, data);
  }
  function reviewedDoc(data, prefix, seq, creator, reviewer, day) {
    var when = new Date(); when.setDate(when.getDate() - day);
    var iso = when.toISOString();
    return Object.assign({
      docNo: prefix + '-2026-' + String(seq).padStart(4, '0'),
      status: 'reviewed', createdBy: creator, submittedBy: creator, submittedAt: iso,
      reviewedBy: reviewer, reviewedAt: iso,
      trail: [
        { action: 'submit', userId: creator, userName: nameOf(creator), at: iso, note: '' },
        { action: 'review', userId: reviewer, userName: nameOf(reviewer), at: iso, note: '' }
      ]
    }, data);
  }
  function draftDoc(data, prefix, seq, creator) {
    return Object.assign({ docNo: prefix + '-2026-' + String(seq).padStart(4, '0'), status: 'draft', createdBy: creator, trail: [] }, data);
  }

  var USER_NAMES = {};
  function nameOf(uid) { return USER_NAMES[uid] || 'system'; }

  /* ====================================================================== */
  function run(force) {
    if (!force && Store.meta().seeded) return;

    /* ---------------- USERS ---------------- */
    var users = [
      put('users', 'admin',     { name: 'محمد زيدان',        username: 'admin',      password: '1234', role: 'admin',           status: 'active', projects: [] }),
      put('users', 'gm',        { name: 'م. أحمد الزهراء',   username: 'gm',         password: '1234', role: 'gm',              status: 'active', projects: [] }),
      put('users', 'fm',        { name: 'أ. سامي عبد الله',  username: 'finance',    password: '1234', role: 'finance_manager', status: 'active', projects: [] }),
      put('users', 'acc',       { name: 'أ. مروة حسن',       username: 'accountant', password: '1234', role: 'accountant',      status: 'active', projects: [] }),
      put('users', 'proc',      { name: 'أ. كريم فؤاد',      username: 'purchase',   password: '1234', role: 'procurement',     status: 'active', projects: [] }),
      put('users', 'store',     { name: 'أ. رمضان السيد',    username: 'store',      password: '1234', role: 'storekeeper',     status: 'active', projects: [] }),
      put('users', 'pm',        { name: 'م. طارق منصور',     username: 'pm',         password: '1234', role: 'project_manager', status: 'active', projects: [] }),
      put('users', 'tech',      { name: 'م. نورهان صلاح',    username: 'technical',  password: '1234', role: 'technical',       status: 'active', projects: [] }),
      put('users', 'hr',        { name: 'أ. هالة مصطفى',     username: 'hr',         password: '1234', role: 'hr',              status: 'active', projects: [] }),
      put('users', 'legal',     { name: 'أ. عمرو الشناوي',   username: 'legal',      password: '1234', role: 'legal',           status: 'active', projects: [] }),
      put('users', 'it',        { name: 'أ. يوسف عادل',      username: 'it',         password: '1234', role: 'it',              status: 'active', projects: [] }),
      put('users', 'auditor',   { name: 'أ. إيهاب راشد',     username: 'auditor',    password: '1234', role: 'auditor',         status: 'active', projects: [] }),
      put('users', 'employee',  { name: 'أ. سلمى إبراهيم',   username: 'employee',   password: '1234', role: 'employee',        status: 'active', projects: [] })
    ];
    users.forEach(function (u) { USER_NAMES[u.id] = u.name; });
    Store.replaceAll('users', users);

    var U = {
      admin: id('users', 'admin'), gm: id('users', 'gm'), fm: id('users', 'fm'),
      acc: id('users', 'acc'), proc: id('users', 'proc'), store: id('users', 'store'),
      pm: id('users', 'pm'), tech: id('users', 'tech'), hr: id('users', 'hr')
    };

    /* ---------------- CUSTOMERS ---------------- */
    Store.replaceAll('customers', [
      put('customers', 'c1', { code: 'CUS-001', name: 'الهيئة الهندسية للقوات المسلحة', sector: 'government', contactPerson: 'م. حسام الدين', phone: '0225551000', taxId: '100-200-300', openingBalance: 0, status: 'active' }),
      put('customers', 'c2', { code: 'CUS-002', name: 'شركة بالم هيلز للتعمير', sector: 'developer', contactPerson: 'أ. منى شريف', phone: '0223334455', email: 'projects@palmhills.eg', taxId: '200-300-400', openingBalance: 0, status: 'active' }),
      put('customers', 'c3', { code: 'CUS-003', name: 'مجموعة النخبة للاستثمار العقاري', sector: 'private', contactPerson: 'أ. وليد جمال', phone: '01001234567', taxId: '300-400-500', openingBalance: 250000, status: 'active' }),
      put('customers', 'c4', { code: 'CUS-004', name: 'جهاز مدينة العبور الجديدة', sector: 'government', contactPerson: 'م. سعيد رضا', phone: '0244778899', taxId: '400-500-600', openingBalance: 0, status: 'active' })
    ]);

    /* ---------------- SUPPLIERS ---------------- */
    Store.replaceAll('suppliers', [
      put('suppliers', 's1', { code: 'SUP-001', name: 'شركة العريش للأسمنت', category: 'materials', contactPerson: 'أ. محمود عادل', phone: '0224445566', taxId: '111-222-333', paymentTerms: 30, openingBalance: 0, status: 'active' }),
      put('suppliers', 's2', { code: 'SUP-002', name: 'حديد عز — التوزيع', category: 'materials', contactPerson: 'أ. شريف نبيل', phone: '0226667788', taxId: '222-333-444', paymentTerms: 15, openingBalance: 180000, status: 'active' }),
      put('suppliers', 's3', { code: 'SUP-003', name: 'مصنع الفتح للطوب الأسمنتي', category: 'materials', contactPerson: 'أ. عبد الرحمن', phone: '01112223344', taxId: '333-444-555', paymentTerms: 30, openingBalance: 0, status: 'active' }),
      put('suppliers', 's4', { code: 'SUP-004', name: 'الشرق الأوسط لتأجير المعدات', category: 'equipment', contactPerson: 'م. هاني لطفي', phone: '01223334455', taxId: '444-555-666', paymentTerms: 45, openingBalance: 0, status: 'active' }),
      put('suppliers', 's5', { code: 'SUP-005', name: 'مصر للبترول — محطات الوقود', category: 'fuel', contactPerson: 'أ. إسلام فتحي', phone: '0227779900', taxId: '555-666-777', paymentTerms: 7, openingBalance: 0, status: 'active' }),
      put('suppliers', 's6', { code: 'SUP-006', name: 'النور للتوريدات الكهربائية', category: 'materials', contactPerson: 'أ. أيمن رأفت', phone: '01099887766', taxId: '666-777-888', paymentTerms: 30, openingBalance: 0, status: 'active' })
    ]);

    /* ---------------- COST ITEMS ---------------- */
    Store.replaceAll('costItems', [
      put('costItems', 'ci1',  { code: 'CI-100', name: 'أعمال ترابية وحفر',       type: 'direct',    status: 'active' }),
      put('costItems', 'ci2',  { code: 'CI-200', name: 'خرسانة مسلحة',            type: 'material',  status: 'active' }),
      put('costItems', 'ci3',  { code: 'CI-210', name: 'حديد تسليح',              type: 'material',  status: 'active' }),
      put('costItems', 'ci4',  { code: 'CI-300', name: 'أعمال المباني والمحارة',  type: 'subcon',    status: 'active' }),
      put('costItems', 'ci5',  { code: 'CI-400', name: 'أعمال التشطيبات',         type: 'subcon',    status: 'active' }),
      put('costItems', 'ci6',  { code: 'CI-500', name: 'الأعمال الكهروميكانيكية', type: 'subcon',    status: 'active' }),
      put('costItems', 'ci7',  { code: 'CI-600', name: 'عمالة مباشرة',            type: 'labour',    status: 'active' }),
      put('costItems', 'ci8',  { code: 'CI-700', name: 'تشغيل وإيجار معدات',      type: 'equipment', status: 'active' }),
      put('costItems', 'ci9',  { code: 'CI-800', name: 'مصروفات موقع عامة',       type: 'indirect',  status: 'active' }),
      put('costItems', 'ci10', { code: 'CI-900', name: 'مصروفات إدارية',          type: 'indirect',  status: 'active' })
    ]);

    /* ---------------- EMPLOYEES ---------------- */
    Store.replaceAll('employees', [
      put('employees', 'e1',  { code: 'EMP-001', name: 'م. أحمد الزهراء',   jobTitle: 'المدير العام',            department: 'management',  hireDate: '2015-01-05', contractType: 'permanent', basicSalary: 45000, allowances: 12000, phone: '01000000001', status: 'active' }),
      put('employees', 'e2',  { code: 'EMP-002', name: 'أ. سامي عبد الله',  jobTitle: 'المدير المالي',           department: 'finance',     hireDate: '2016-03-12', contractType: 'permanent', basicSalary: 32000, allowances: 8000,  phone: '01000000002', status: 'active' }),
      put('employees', 'e3',  { code: 'EMP-003', name: 'أ. مروة حسن',       jobTitle: 'محاسب أول',               department: 'finance',     hireDate: '2019-06-01', contractType: 'permanent', basicSalary: 15000, allowances: 3500,  phone: '01000000003', status: 'active' }),
      put('employees', 'e4',  { code: 'EMP-004', name: 'أ. كريم فؤاد',      jobTitle: 'مسؤول مشتريات',           department: 'procurement', hireDate: '2020-02-15', contractType: 'permanent', basicSalary: 13000, allowances: 3000,  phone: '01000000004', status: 'active' }),
      put('employees', 'e5',  { code: 'EMP-005', name: 'أ. رمضان السيد',    jobTitle: 'أمين مخزن رئيسي',         department: 'stores',      hireDate: '2018-09-20', contractType: 'permanent', basicSalary: 9500,  allowances: 2500,  phone: '01000000005', status: 'active' }),
      put('employees', 'e6',  { code: 'EMP-006', name: 'م. طارق منصور',     jobTitle: 'مدير مشروع',              department: 'projects',    hireDate: '2017-04-10', contractType: 'permanent', basicSalary: 28000, allowances: 7000,  phone: '01000000006', status: 'active' }),
      put('employees', 'e7',  { code: 'EMP-007', name: 'م. نورهان صلاح',    jobTitle: 'مهندس مكتب فني',          department: 'technical',   hireDate: '2021-08-01', contractType: 'permanent', basicSalary: 16000, allowances: 4000,  phone: '01000000007', status: 'active' }),
      put('employees', 'e8',  { code: 'EMP-008', name: 'أ. هالة مصطفى',     jobTitle: 'مسؤول موارد بشرية',       department: 'hr',          hireDate: '2019-11-11', contractType: 'permanent', basicSalary: 12000, allowances: 3000,  phone: '01000000008', status: 'active' }),
      put('employees', 'e9',  { code: 'EMP-009', name: 'م. خالد بدوي',      jobTitle: 'مهندس موقع',              department: 'projects',    hireDate: '2022-01-15', contractType: 'permanent', basicSalary: 14000, allowances: 4500,  phone: '01000000009', status: 'active' }),
      put('employees', 'e10', { code: 'EMP-010', name: 'أ. عمرو الشناوي',   jobTitle: 'مستشار قانوني',           department: 'legal',       hireDate: '2018-05-05', contractType: 'permanent', basicSalary: 20000, allowances: 5000,  phone: '01000000010', status: 'active' }),
      put('employees', 'e11', { code: 'EMP-011', name: 'أ. يوسف عادل',      jobTitle: 'مسؤول تقنية معلومات',     department: 'it',          hireDate: '2021-02-20', contractType: 'permanent', basicSalary: 13500, allowances: 3000,  phone: '01000000011', status: 'active' }),
      put('employees', 'e12', { code: 'EMP-012', name: 'أ. صابر عبد العال', jobTitle: 'سائق ومشغل معدات',        department: 'equipment',   hireDate: '2020-07-01', contractType: 'permanent', basicSalary: 7500,  allowances: 2000,  phone: '01000000012', status: 'active' }),
      put('employees', 'e13', { code: 'EMP-013', name: 'م. دينا سمير',      jobTitle: 'مهندسة تخطيط ومتابعة',    department: 'technical',   hireDate: '2022-09-01', contractType: 'permanent', basicSalary: 15500, allowances: 4000,  phone: '01000000013', status: 'active' }),
      put('employees', 'e14', { code: 'EMP-014', name: 'أ. سلمى إبراهيم',   jobTitle: 'سكرتارية تنفيذية',        department: 'admin',       hireDate: '2023-03-01', contractType: 'permanent', basicSalary: 8500,  allowances: 2000,  phone: '01000000014', status: 'active' }),
      put('employees', 'e15', { code: 'EMP-015', name: 'أ. جمال الديب',     jobTitle: 'أمين مخزن موقع',          department: 'stores',      hireDate: '2023-06-15', contractType: 'temporary', basicSalary: 7000,  allowances: 1800,  phone: '01000000015', status: 'active' })
    ]);

    /* ---------------- PROJECTS ---------------- */
    Store.replaceAll('projects', [
      put('projects', 'p1', {
        code: 'PRJ-001', name: 'مجمع سكني — العبور الجديدة (٦ عمارات)', customer: id('customers', 'c4'),
        location: 'العبور الجديدة — المنطقة الثالثة', manager: id('employees', 'e6'), type: 'residential',
        contractValue: 78500000, budgetTotal: 64000000, advancePct: 15, retentionPct: 5,
        startDate: daysAgo(320), endDate: daysAhead(250), progress: 46, status: 'active',
        scope: 'تنفيذ الأعمال الإنشائية والمعمارية والتشطيبات لست عمارات سكنية بإجمالي ١٤٤ وحدة.'
      }),
      put('projects', 'p2', {
        code: 'PRJ-002', name: 'مركز تجاري — بالم هيلز أكتوبر', customer: id('customers', 'c2'),
        location: '٦ أكتوبر — بالم هيلز', manager: id('employees', 'e6'), type: 'commercial',
        contractValue: 52000000, budgetTotal: 43500000, advancePct: 10, retentionPct: 5,
        startDate: daysAgo(210), endDate: daysAhead(180), progress: 32, status: 'active',
        scope: 'إنشاء مركز تجاري بمساحة ٨٠٠٠ م٢ شامل الأعمال الكهروميكانيكية.'
      }),
      put('projects', 'p3', {
        code: 'PRJ-003', name: 'أعمال طرق ورصف — الطريق الدائري الإقليمي', customer: id('customers', 'c1'),
        location: 'الطريق الدائري الإقليمي — القطاع الشرقي', manager: id('employees', 'e9'), type: 'infra',
        contractValue: 41000000, budgetTotal: 35000000, advancePct: 20, retentionPct: 5,
        startDate: daysAgo(140), endDate: daysAhead(120), progress: 58, status: 'active',
        scope: 'أعمال ترابية ورصف وطبقات أساس بطول ١٢ كم.'
      }),
      put('projects', 'p4', {
        code: 'PRJ-004', name: 'تشطيبات فيلات — النخبة كمبوند', customer: id('customers', 'c3'),
        location: 'الشيخ زايد', manager: id('employees', 'e9'), type: 'finishing',
        contractValue: 18700000, budgetTotal: 15200000, advancePct: 10, retentionPct: 5,
        startDate: daysAgo(400), endDate: daysAgo(30), progress: 100, status: 'closed',
        scope: 'تشطيبات كاملة لـ ١٢ فيلا.'
      })
    ]);

    /* ---------------- WAREHOUSES ---------------- */
    Store.replaceAll('warehouses', [
      put('warehouses', 'w1', { code: 'WH-001', name: 'المخزن الرئيسي — المقر', location: 'مدينة نصر', keeper: id('employees', 'e5'), status: 'active' }),
      put('warehouses', 'w2', { code: 'WH-002', name: 'مخزن موقع العبور', location: 'العبور الجديدة', keeper: id('employees', 'e15'), project: id('projects', 'p1'), status: 'active' }),
      put('warehouses', 'w3', { code: 'WH-003', name: 'مخزن موقع أكتوبر', location: '٦ أكتوبر', keeper: id('employees', 'e15'), project: id('projects', 'p2'), status: 'active' })
    ]);

    /* ---------------- ITEMS ---------------- */
    Store.replaceAll('items', [
      put('items', 'i1',  { code: 'ITM-0001', name: 'أسمنت بورتلاندي عادي 42.5', category: 'cement',     baseUnit: 'ton', valuation: 'wavg', reorderLevel: 50,  lastPrice: 3200,  defaultCostItem: id('costItems', 'ci2'), status: 'active' }),
      put('items', 'i2',  { code: 'ITM-0002', name: 'حديد تسليح 16 مم',          category: 'steel',      baseUnit: 'ton', valuation: 'wavg', reorderLevel: 20,  lastPrice: 42500, defaultCostItem: id('costItems', 'ci3'), status: 'active' }),
      put('items', 'i3',  { code: 'ITM-0003', name: 'حديد تسليح 12 مم',          category: 'steel',      baseUnit: 'ton', valuation: 'wavg', reorderLevel: 15,  lastPrice: 42800, defaultCostItem: id('costItems', 'ci3'), status: 'active' }),
      put('items', 'i4',  { code: 'ITM-0004', name: 'رمل ردم',                   category: 'aggregate',  baseUnit: 'm3',  valuation: 'wavg', reorderLevel: 200, lastPrice: 185,   defaultCostItem: id('costItems', 'ci1'), status: 'active' }),
      put('items', 'i5',  { code: 'ITM-0005', name: 'زلط مقاس ١',                category: 'aggregate',  baseUnit: 'm3',  valuation: 'wavg', reorderLevel: 150, lastPrice: 340,   defaultCostItem: id('costItems', 'ci2'), status: 'active' }),
      put('items', 'i6',  { code: 'ITM-0006', name: 'طوب أسمنتي مصمت 25×12×6',   category: 'block',      baseUnit: 'pcs', valuation: 'wavg', reorderLevel: 5000,lastPrice: 4.25,  defaultCostItem: id('costItems', 'ci4'), status: 'active' }),
      put('items', 'i7',  { code: 'ITM-0007', name: 'خشب موسكي للشدات',          category: 'other',      baseUnit: 'm3',  valuation: 'wavg', reorderLevel: 10,  lastPrice: 14500, defaultCostItem: id('costItems', 'ci2'), status: 'active' }),
      put('items', 'i8',  { code: 'ITM-0008', name: 'كابل نحاس 3×2.5 مم',        category: 'electrical', baseUnit: 'm',   valuation: 'wavg', reorderLevel: 500, lastPrice: 62,    defaultCostItem: id('costItems', 'ci6'), status: 'active' }),
      put('items', 'i9',  { code: 'ITM-0009', name: 'مواسير PPR 25 مم',          category: 'plumbing',   baseUnit: 'm',   valuation: 'wavg', reorderLevel: 300, lastPrice: 38,    defaultCostItem: id('costItems', 'ci6'), status: 'active' }),
      put('items', 'i10', { code: 'ITM-0010', name: 'سولار (وقود ديزل)',         category: 'fuel',       baseUnit: 'ltr', valuation: 'wavg', reorderLevel: 1000,lastPrice: 15.5,  defaultCostItem: id('costItems', 'ci8'), status: 'active' }),
      put('items', 'i11', { code: 'ITM-0011', name: 'بلاط سيراميك أرضيات 60×60',  category: 'finishing',  baseUnit: 'm2',  valuation: 'wavg', reorderLevel: 400, lastPrice: 210,   defaultCostItem: id('costItems', 'ci5'), status: 'active' }),
      put('items', 'i12', { code: 'ITM-0012', name: 'دهان بلاستيك داخلي',        category: 'finishing',  baseUnit: 'ltr', valuation: 'wavg', reorderLevel: 200, lastPrice: 95,    defaultCostItem: id('costItems', 'ci5'), status: 'active' })
    ]);

    /* ---------------- ACCOUNTS ---------------- */
    Store.replaceAll('accounts', [
      put('accounts', 'a1',  { code: '1000', name: 'الأصول',                     type: 'asset',     postable: false, status: 'active' }),
      put('accounts', 'a2',  { code: '1100', name: 'النقدية بالخزائن',           type: 'asset',     parent: id('accounts', 'a1'), postable: true, openingBalance: 500000,  status: 'active' }),
      put('accounts', 'a3',  { code: '1200', name: 'النقدية بالبنوك',            type: 'asset',     parent: id('accounts', 'a1'), postable: true, openingBalance: 8500000, status: 'active' }),
      put('accounts', 'a4',  { code: '1300', name: 'العملاء والمدينون',          type: 'asset',     parent: id('accounts', 'a1'), postable: true, openingBalance: 250000,  status: 'active' }),
      put('accounts', 'a5',  { code: '1400', name: 'المخزون',                    type: 'asset',     parent: id('accounts', 'a1'), postable: true, openingBalance: 0,       status: 'active' }),
      put('accounts', 'a6',  { code: '1500', name: 'العهد والسلف',               type: 'asset',     parent: id('accounts', 'a1'), postable: true, openingBalance: 0,       status: 'active' }),
      put('accounts', 'a7',  { code: '2000', name: 'الخصوم',                     type: 'liability', postable: false, status: 'active' }),
      put('accounts', 'a8',  { code: '2100', name: 'الموردون والدائنون',         type: 'liability', parent: id('accounts', 'a7'), postable: true, openingBalance: 180000, status: 'active' }),
      put('accounts', 'a9',  { code: '2200', name: 'بضاعة مستلمة لم ترد فاتورتها (GRNI)', type: 'liability', parent: id('accounts', 'a7'), postable: true, status: 'active' }),
      put('accounts', 'a10', { code: '2300', name: 'ضرائب مستحقة',               type: 'liability', parent: id('accounts', 'a7'), postable: true, status: 'active' }),
      put('accounts', 'a11', { code: '2400', name: 'احتجازات مستحقة للمقاولين',  type: 'liability', parent: id('accounts', 'a7'), postable: true, status: 'active' }),
      put('accounts', 'a12', { code: '3000', name: 'حقوق الملكية',               type: 'equity',    postable: false, status: 'active' }),
      put('accounts', 'a13', { code: '3100', name: 'رأس المال',                  type: 'equity',    parent: id('accounts', 'a12'), postable: true, openingBalance: -9070000, status: 'active' }),
      put('accounts', 'a14', { code: '4000', name: 'الإيرادات',                  type: 'revenue',   postable: false, status: 'active' }),
      put('accounts', 'a15', { code: '4100', name: 'إيرادات عقود المقاولات',     type: 'revenue',   parent: id('accounts', 'a14'), postable: true, status: 'active' }),
      put('accounts', 'a16', { code: '5000', name: 'المصروفات',                  type: 'expense',   postable: false, status: 'active' }),
      put('accounts', 'a17', { code: '5100', name: 'تكلفة المواد',               type: 'expense',   parent: id('accounts', 'a16'), postable: true, status: 'active' }),
      put('accounts', 'a18', { code: '5200', name: 'تكلفة مقاولي الباطن',        type: 'expense',   parent: id('accounts', 'a16'), postable: true, status: 'active' }),
      put('accounts', 'a19', { code: '5300', name: 'تكلفة العمالة',              type: 'expense',   parent: id('accounts', 'a16'), postable: true, status: 'active' }),
      put('accounts', 'a20', { code: '5400', name: 'تشغيل وصيانة المعدات',       type: 'expense',   parent: id('accounts', 'a16'), postable: true, status: 'active' }),
      put('accounts', 'a21', { code: '5900', name: 'مصروفات إدارية وعمومية',     type: 'expense',   parent: id('accounts', 'a16'), postable: true, status: 'active' })
    ]);

    /* ---------------- CASH ACCOUNTS ---------------- */
    Store.replaceAll('cashAccounts', [
      put('cashAccounts', 'ca1', { code: 'CB-001', name: 'الخزينة الرئيسية',           kind: 'cash',    currency: 'EGP', openingBalance: 500000,  custodian: id('employees', 'e3'), status: 'active' }),
      put('cashAccounts', 'ca2', { code: 'CB-002', name: 'البنك الأهلي — جاري ١٢٣٤',   kind: 'bank',    bankName: 'البنك الأهلي المصري', accountNo: 'EG380003000112340000', currency: 'EGP', openingBalance: 6200000, status: 'active' }),
      put('cashAccounts', 'ca3', { code: 'CB-003', name: 'بنك مصر — جاري ٥٦٧٨',        kind: 'bank',    bankName: 'بنك مصر', accountNo: 'EG380002000156780000', currency: 'EGP', openingBalance: 2300000, status: 'active' }),
      put('cashAccounts', 'ca4', { code: 'CB-004', name: 'عهدة مدير مشروع العبور',      kind: 'custody', custodian: id('employees', 'e6'), currency: 'EGP', openingBalance: 150000, status: 'active' })
    ]);

    /* ---------------- SUBCONTRACTORS ---------------- */
    Store.replaceAll('subcontractors', [
      put('subcontractors', 'sc1', { code: 'SBC-001', name: 'مؤسسة البناء الحديث للمقاولات', trade: 'concrete',   contactPerson: 'م. مصطفى كامل', phone: '01011112222', taxId: '777-888-999', status: 'active' }),
      put('subcontractors', 'sc2', { code: 'SBC-002', name: 'شركة الإتقان للتشطيبات',        trade: 'finishing',  contactPerson: 'أ. هشام زكي',   phone: '01022223333', taxId: '888-999-000', status: 'active' }),
      put('subcontractors', 'sc3', { code: 'SBC-003', name: 'الهندسية للأعمال الكهروميكانيكية', trade: 'electrical', contactPerson: 'م. رامي فتحي', phone: '01033334444', taxId: '999-000-111', status: 'active' }),
      put('subcontractors', 'sc4', { code: 'SBC-004', name: 'مقاولات الصعيد للأعمال الترابية', trade: 'earthwork',  contactPerson: 'أ. سيد حمدي',   phone: '01044445555', taxId: '000-111-222', status: 'active' })
    ]);

    /* ---------------- EQUIPMENT ---------------- */
    Store.replaceAll('equipment', [
      put('equipment', 'eq1', { code: 'EQP-001', name: 'حفار كاتربيلر 320D', kind: 'excavator', plateAlt: '', plateNo: 'CAT-320-01', project: id('projects', 'p3'), operator: id('employees', 'e12'), ownership: 'owned', purchaseValue: 3800000, condition: 'good', licenseExpiry: daysAhead(120), lastMaintenance: daysAgo(35), status: 'active' }),
      put('equipment', 'eq2', { code: 'EQP-002', name: 'لودر شنطة JCB 3CX',  kind: 'loader',    plateNo: 'JCB-3CX-02', project: id('projects', 'p1'), ownership: 'owned', purchaseValue: 2100000, condition: 'good', licenseExpiry: daysAhead(40), lastMaintenance: daysAgo(60), status: 'active' }),
      put('equipment', 'eq3', { code: 'EQP-003', name: 'ونش برجي Potain MC85', kind: 'crane',    plateNo: 'TWR-085-03', project: id('projects', 'p1'), ownership: 'rented', purchaseValue: 95000, condition: 'good', licenseExpiry: daysAhead(200), status: 'active' }),
      put('equipment', 'eq4', { code: 'EQP-004', name: 'خلاطة خرسانة 350 لتر', kind: 'mixer',    plateNo: 'MIX-350-04', project: id('projects', 'p2'), ownership: 'owned', purchaseValue: 85000, condition: 'maintenance', lastMaintenance: daysAgo(5), status: 'active' }),
      put('equipment', 'eq5', { code: 'EQP-005', name: 'شاحنة قلاب مرسيدس',    kind: 'truck',    plateNo: 'ن ط ص ٤٥٦٧', project: id('projects', 'p3'), operator: id('employees', 'e12'), ownership: 'owned', purchaseValue: 1450000, condition: 'good', licenseExpiry: daysAhead(25), lastMaintenance: daysAgo(20), status: 'active' }),
      put('equipment', 'eq6', { code: 'EQP-006', name: 'مولد كهرباء 250 KVA',  kind: 'generator', plateNo: 'GEN-250-06', project: id('projects', 'p1'), ownership: 'owned', purchaseValue: 420000, condition: 'good', lastMaintenance: daysAgo(15), status: 'active' })
    ]);

    /* ---------------- CLIENT CONTRACTS ---------------- */
    Store.replaceAll('clientContracts', [
      put('clientContracts', 'cc1', { contractNo: 'CT-2025-001', title: 'عقد تنفيذ مجمع سكني بالعبور الجديدة', project: id('projects', 'p1'), customer: id('customers', 'c4'), signDate: daysAgo(330), startDate: daysAgo(320), durationMonths: 24, originalValue: 74000000, changeOrders: 4500000, advancePct: 15, retentionPct: 5, status: 'active', penaltyTerms: 'غرامة تأخير ٠.٥٪ أسبوعياً بحد أقصى ١٠٪ من قيمة العقد.' }),
      put('clientContracts', 'cc2', { contractNo: 'CT-2025-014', title: 'عقد إنشاء المركز التجاري بأكتوبر', project: id('projects', 'p2'), customer: id('customers', 'c2'), signDate: daysAgo(220), startDate: daysAgo(210), durationMonths: 18, originalValue: 52000000, changeOrders: 0, advancePct: 10, retentionPct: 5, status: 'active' }),
      put('clientContracts', 'cc3', { contractNo: 'CT-2026-003', title: 'عقد أعمال الطرق بالدائري الإقليمي', project: id('projects', 'p3'), customer: id('customers', 'c1'), signDate: daysAgo(150), startDate: daysAgo(140), durationMonths: 12, originalValue: 41000000, changeOrders: 0, advancePct: 20, retentionPct: 5, status: 'active' })
    ]);

    /* ---------------- SUBCONTRACTS ---------------- */
    Store.replaceAll('subContracts', [
      put('subContracts', 'sct1', { contractNo: 'SC-2025-001', title: 'أعمال الخرسانة المسلحة — العبور', project: id('projects', 'p1'), subcontractor: id('subcontractors', 'sc1'), costItem: id('costItems', 'ci2'), contractValue: 12500000, advancePct: 10, retentionPct: 5, signDate: daysAgo(300), startDate: daysAgo(290), endDate: daysAhead(90), status: 'active' }),
      put('subContracts', 'sct2', { contractNo: 'SC-2025-007', title: 'أعمال المباني والمحارة — العبور', project: id('projects', 'p1'), subcontractor: id('subcontractors', 'sc2'), costItem: id('costItems', 'ci4'), contractValue: 5800000, advancePct: 10, retentionPct: 5, signDate: daysAgo(180), startDate: daysAgo(170), endDate: daysAhead(150), status: 'active' }),
      put('subContracts', 'sct3', { contractNo: 'SC-2026-002', title: 'الأعمال الكهروميكانيكية — أكتوبر', project: id('projects', 'p2'), subcontractor: id('subcontractors', 'sc3'), costItem: id('costItems', 'ci6'), contractValue: 7200000, advancePct: 15, retentionPct: 5, signDate: daysAgo(120), startDate: daysAgo(110), endDate: daysAhead(200), status: 'active' }),
      put('subContracts', 'sct4', { contractNo: 'SC-2026-005', title: 'الأعمال الترابية والحفر — الدائري', project: id('projects', 'p3'), subcontractor: id('subcontractors', 'sc4'), costItem: id('costItems', 'ci1'), contractValue: 9400000, advancePct: 20, retentionPct: 5, signDate: daysAgo(135), startDate: daysAgo(130), endDate: daysAhead(60), status: 'active' })
    ]);

    /* ---------------- BUDGETS ---------------- */
    Store.replaceAll('budgets', [
      put('budgets', 'b1', approvedDoc({
        project: id('projects', 'p1'), version: 'V1', date: daysAgo(315), preparedBy: id('employees', 'e7'),
        lines: [
          { costItem: id('costItems', 'ci1'), description: 'حفر وردم', unit: 'm3', qty: 18000, price: 95,    lineTotal: 1710000 },
          { costItem: id('costItems', 'ci2'), description: 'خرسانة مسلحة', unit: 'm3', qty: 9500, price: 2450, lineTotal: 23275000 },
          { costItem: id('costItems', 'ci3'), description: 'حديد تسليح', unit: 'ton', qty: 720, price: 43500,  lineTotal: 31320000 },
          { costItem: id('costItems', 'ci4'), description: 'مباني ومحارة', unit: 'm2', qty: 24000, price: 245, lineTotal: 5880000 },
          { costItem: id('costItems', 'ci8'), description: 'معدات', unit: 'ls', qty: 1, price: 1200000,        lineTotal: 1200000 }
        ], subTotal: 63385000
      }, 'BUD', 1, U.tech, U.pm, U.gm, 310)),
      put('budgets', 'b2', approvedDoc({
        project: id('projects', 'p2'), version: 'V1', date: daysAgo(205), preparedBy: id('employees', 'e7'),
        lines: [
          { costItem: id('costItems', 'ci2'), description: 'خرسانة', unit: 'm3', qty: 6200, price: 2500,   lineTotal: 15500000 },
          { costItem: id('costItems', 'ci3'), description: 'حديد', unit: 'ton', qty: 430, price: 43000,     lineTotal: 18490000 },
          { costItem: id('costItems', 'ci6'), description: 'كهروميكانيكا', unit: 'ls', qty: 1, price: 7200000, lineTotal: 7200000 },
          { costItem: id('costItems', 'ci9'), description: 'مصروفات موقع', unit: 'ls', qty: 1, price: 1900000, lineTotal: 1900000 }
        ], subTotal: 43090000
      }, 'BUD', 2, U.tech, U.pm, U.gm, 200)),
      put('budgets', 'b3', approvedDoc({
        project: id('projects', 'p3'), version: 'V1', date: daysAgo(135), preparedBy: id('employees', 'e13'),
        lines: [
          { costItem: id('costItems', 'ci1'), description: 'أعمال ترابية', unit: 'm3', qty: 145000, price: 78, lineTotal: 11310000 },
          { costItem: id('costItems', 'ci2'), description: 'طبقات أساس', unit: 'm3', qty: 42000, price: 420,   lineTotal: 17640000 },
          { costItem: id('costItems', 'ci8'), description: 'تشغيل معدات', unit: 'ls', qty: 1, price: 4200000,  lineTotal: 4200000 },
          { costItem: id('costItems', 'ci9'), description: 'مصروفات موقع', unit: 'ls', qty: 1, price: 1700000, lineTotal: 1700000 }
        ], subTotal: 34850000
      }, 'BUD', 3, U.tech, U.pm, U.gm, 130))
    ]);

    /* ---------------- PURCHASE APPROVALS ---------------- */
    Store.replaceAll('purchaseApprovals', [
      put('purchaseApprovals', 'pa1', approvedDoc({
        date: daysAgo(45), project: id('projects', 'p1'), costItem: id('costItems', 'ci3'),
        warehouse: id('warehouses', 'w2'), supplier: id('suppliers', 's2'),
        reason: 'توريد حديد تسليح لأعمال الأسقف — عمارة ٣ و٤', priority: 'urgent', neededBy: daysAgo(30), taxRate: '14',
        lines: [
          { item: 'حديد تسليح 16 مم', unit: 'ton', qty: 45, price: 42500, lineTotal: 1912500 },
          { item: 'حديد تسليح 12 مم', unit: 'ton', qty: 22, price: 42800, lineTotal: 941600 }
        ], subTotal: 2854100, taxAmount: 399574, grandTotal: 3253674
      }, 'PA', 1, U.proc, U.pm, U.fm, 44)),
      put('purchaseApprovals', 'pa2', approvedDoc({
        date: daysAgo(30), project: id('projects', 'p1'), costItem: id('costItems', 'ci2'),
        warehouse: id('warehouses', 'w2'), supplier: id('suppliers', 's1'),
        reason: 'توريد أسمنت لصب الأسقف', priority: 'normal', neededBy: daysAgo(20), taxRate: '14',
        lines: [{ item: 'أسمنت بورتلاندي 42.5', unit: 'ton', qty: 180, price: 3200, lineTotal: 576000 }],
        subTotal: 576000, taxAmount: 80640, grandTotal: 656640
      }, 'PA', 2, U.proc, U.pm, U.fm, 29)),
      put('purchaseApprovals', 'pa3', approvedDoc({
        date: daysAgo(18), project: id('projects', 'p2'), costItem: id('costItems', 'ci6'),
        warehouse: id('warehouses', 'w3'), supplier: id('suppliers', 's6'),
        reason: 'كابلات ومستلزمات كهربائية للمرحلة الأولى', priority: 'normal', taxRate: '14',
        lines: [{ item: 'كابل نحاس 3×2.5 مم', unit: 'm', qty: 4200, price: 62, lineTotal: 260400 }],
        subTotal: 260400, taxAmount: 36456, grandTotal: 296856
      }, 'PA', 3, U.proc, U.pm, U.fm, 17)),
      put('purchaseApprovals', 'pa4', reviewedDoc({
        date: daysAgo(4), project: id('projects', 'p3'), costItem: id('costItems', 'ci8'),
        supplier: id('suppliers', 's5'), warehouse: id('warehouses', 'w1'),
        reason: 'تموين وقود للمعدات — شهر أغسطس', priority: 'urgent', taxRate: '14',
        lines: [{ item: 'سولار (وقود ديزل)', unit: 'ltr', qty: 12000, price: 15.5, lineTotal: 186000 }],
        subTotal: 186000, taxAmount: 26040, grandTotal: 212040
      }, 'PA', 4, U.proc, U.pm, 3)),
      put('purchaseApprovals', 'pa5', pendingDoc({
        date: daysAgo(2), project: id('projects', 'p1'), costItem: id('costItems', 'ci5'),
        supplier: id('suppliers', 's3'), warehouse: id('warehouses', 'w2'),
        reason: 'توريد بلاط سيراميك لتشطيبات الدور الأرضي', priority: 'normal', taxRate: '14',
        lines: [{ item: 'بلاط سيراميك 60×60', unit: 'm2', qty: 2800, price: 210, lineTotal: 588000 }],
        subTotal: 588000, taxAmount: 82320, grandTotal: 670320
      }, 'PA', 5, U.proc, 2)),
      put('purchaseApprovals', 'pa6', draftDoc({
        date: daysAgo(1), project: id('projects', 'p2'), costItem: id('costItems', 'ci2'),
        supplier: id('suppliers', 's1'), warehouse: id('warehouses', 'w3'),
        reason: 'أسمنت للمرحلة الثانية', priority: 'normal', taxRate: '14',
        lines: [{ item: 'أسمنت بورتلاندي 42.5', unit: 'ton', qty: 90, price: 3200, lineTotal: 288000 }],
        subTotal: 288000, taxAmount: 40320, grandTotal: 328320
      }, 'PA', 6, U.proc))
    ]);

    /* ---------------- GOODS RECEIPTS ---------------- */
    Store.replaceAll('goodsReceipts', [
      put('goodsReceipts', 'gr1', approvedDoc({
        date: daysAgo(38), purchaseApproval: id('purchaseApprovals', 'pa1'), supplier: id('suppliers', 's2'),
        warehouse: id('warehouses', 'w2'), project: id('projects', 'p1'), deliveryNote: 'DN-9921',
        inspector: id('employees', 'e9'), inspectionResult: 'accepted', taxRate: '14',
        lines: [
          { item: id('items', 'i2'), unit: 'ton', qtyReceived: 45, qtyAccepted: 45, qtyRejected: 0, price: 42500, lineTotal: 1912500 },
          { item: id('items', 'i3'), unit: 'ton', qtyReceived: 22, qtyAccepted: 22, qtyRejected: 0, price: 42800, lineTotal: 941600 }
        ], subTotal: 2854100, taxAmount: 399574, grandTotal: 3253674
      }, 'GRN', 1, U.store, U.pm, U.fm, 37)),
      put('goodsReceipts', 'gr2', approvedDoc({
        date: daysAgo(24), purchaseApproval: id('purchaseApprovals', 'pa2'), supplier: id('suppliers', 's1'),
        warehouse: id('warehouses', 'w2'), project: id('projects', 'p1'), deliveryNote: 'DN-3310',
        inspector: id('employees', 'e9'), inspectionResult: 'partial', taxRate: '14',
        lines: [{ item: id('items', 'i1'), unit: 'ton', qtyReceived: 180, qtyAccepted: 176, qtyRejected: 4, price: 3200, lineTotal: 563200 }],
        subTotal: 563200, taxAmount: 78848, grandTotal: 642048,
        notes: 'رُفضت ٤ طن لتلف التغليف وتشرب الرطوبة — أُعيدت للمورد.'
      }, 'GRN', 2, U.store, U.pm, U.fm, 23)),
      put('goodsReceipts', 'gr3', approvedDoc({
        date: daysAgo(12), purchaseApproval: id('purchaseApprovals', 'pa3'), supplier: id('suppliers', 's6'),
        warehouse: id('warehouses', 'w3'), project: id('projects', 'p2'), deliveryNote: 'DN-7745',
        inspector: id('employees', 'e9'), inspectionResult: 'accepted', taxRate: '14',
        lines: [{ item: id('items', 'i8'), unit: 'm', qtyReceived: 4200, qtyAccepted: 4200, qtyRejected: 0, price: 62, lineTotal: 260400 }],
        subTotal: 260400, taxAmount: 36456, grandTotal: 296856
      }, 'GRN', 3, U.store, U.pm, U.fm, 11)),
      put('goodsReceipts', 'gr4', approvedDoc({
        date: daysAgo(60), supplier: id('suppliers', 's3'), warehouse: id('warehouses', 'w1'),
        project: id('projects', 'p1'), deliveryNote: 'DN-1180', inspector: id('employees', 'e5'),
        inspectionResult: 'accepted', taxRate: '14',
        lines: [
          { item: id('items', 'i6'), unit: 'pcs', qtyReceived: 42000, qtyAccepted: 42000, qtyRejected: 0, price: 4.25, lineTotal: 178500 },
          { item: id('items', 'i4'), unit: 'm3', qtyReceived: 900,   qtyAccepted: 900,   qtyRejected: 0, price: 185,  lineTotal: 166500 },
          { item: id('items', 'i5'), unit: 'm3', qtyReceived: 650,   qtyAccepted: 650,   qtyRejected: 0, price: 340,  lineTotal: 221000 }
        ], subTotal: 566000, taxAmount: 79240, grandTotal: 645240
      }, 'GRN', 4, U.store, U.pm, U.fm, 59))
    ]);

    /* ---------------- STOCK ISSUES ---------------- */
    Store.replaceAll('stockIssues', [
      put('stockIssues', 'si1', approvedDoc({
        date: daysAgo(30), warehouse: id('warehouses', 'w2'), project: id('projects', 'p1'),
        costItem: id('costItems', 'ci3'), receivedBy: id('employees', 'e9'),
        purpose: 'صرف حديد لأعمال تسليح سقف الدور الثالث — عمارة ٣',
        lines: [{ item: id('items', 'i2'), unit: 'ton', qty: 28, price: 42500, lineTotal: 1190000 }],
        subTotal: 1190000
      }, 'SIS', 1, U.store, U.pm, U.fm, 29)),
      put('stockIssues', 'si2', approvedDoc({
        date: daysAgo(20), warehouse: id('warehouses', 'w2'), project: id('projects', 'p1'),
        costItem: id('costItems', 'ci2'), receivedBy: id('employees', 'e9'),
        purpose: 'صرف أسمنت وزلط لصب الأسقف',
        lines: [
          { item: id('items', 'i1'), unit: 'ton', qty: 120, price: 3200, lineTotal: 384000 },
          { item: id('items', 'i5'), unit: 'm3',  qty: 380, price: 340,  lineTotal: 129200 }
        ], subTotal: 513200
      }, 'SIS', 2, U.store, U.pm, U.fm, 19)),
      put('stockIssues', 'si3', approvedDoc({
        date: daysAgo(14), warehouse: id('warehouses', 'w1'), project: id('projects', 'p1'),
        costItem: id('costItems', 'ci4'), receivedBy: id('employees', 'e9'),
        purpose: 'صرف طوب لأعمال المباني — الدور الأول والثاني',
        lines: [{ item: id('items', 'i6'), unit: 'pcs', qty: 26000, price: 4.25, lineTotal: 110500 }],
        subTotal: 110500
      }, 'SIS', 3, U.store, U.pm, U.fm, 13)),
      put('stockIssues', 'si4', approvedDoc({
        date: daysAgo(8), warehouse: id('warehouses', 'w3'), project: id('projects', 'p2'),
        costItem: id('costItems', 'ci6'), receivedBy: id('employees', 'e9'),
        purpose: 'صرف كابلات لأعمال التغذية الرئيسية',
        lines: [{ item: id('items', 'i8'), unit: 'm', qty: 1800, price: 62, lineTotal: 111600 }],
        subTotal: 111600
      }, 'SIS', 4, U.store, U.pm, U.fm, 7)),
      put('stockIssues', 'si5', pendingDoc({
        date: daysAgo(1), warehouse: id('warehouses', 'w2'), project: id('projects', 'p1'),
        costItem: id('costItems', 'ci2'), receivedBy: id('employees', 'e9'),
        purpose: 'صرف رمل ردم لأعمال التسوية',
        lines: [{ item: id('items', 'i4'), unit: 'm3', qty: 260, price: 185, lineTotal: 48100 }],
        subTotal: 48100
      }, 'SIS', 5, U.store, 1))
    ]);

    /* ---------------- STOCK TRANSFERS ---------------- */
    Store.replaceAll('stockTransfers', [
      put('stockTransfers', 'st1', approvedDoc({
        date: daysAgo(16), fromWarehouse: id('warehouses', 'w1'), toWarehouse: id('warehouses', 'w3'),
        driver: 'أ. صابر عبد العال', vehicle: 'ن ط ص ٤٥٦٧',
        lines: [{ item: id('items', 'i4'), unit: 'm3', qty: 220, price: 185, lineTotal: 40700 }],
        subTotal: 40700
      }, 'STR', 1, U.store, U.pm, U.fm, 15))
    ]);

    /* ---------------- STOCK COUNTS ---------------- */
    Store.replaceAll('stockCounts', [
      put('stockCounts', 'sc1', approvedDoc({
        date: daysAgo(6), warehouse: id('warehouses', 'w2'),
        committee: 'أ. رمضان السيد — م. خالد بدوي — أ. مروة حسن',
        reason: 'جرد دوري نصف شهري. العجز في الأسمنت ناتج عن الفقد الطبيعي والتشوين المكشوف.',
        lines: [
          { item: id('items', 'i1'), bookQty: 56, countedQty: 54, diff: -2, price: 3200, lineTotal: -6400 },
          { item: id('items', 'i2'), bookQty: 17, countedQty: 17, diff: 0,  price: 42500, lineTotal: 0 }
        ], subTotal: -6400
      }, 'SC', 1, U.store, U.pm, U.fm, 5))
    ]);

    /* ---------------- SUPPLIER INVOICES ---------------- */
    Store.replaceAll('supplierInvoices', [
      put('supplierInvoices', 'sinv1', approvedDoc({
        date: daysAgo(35), supplier: id('suppliers', 's2'), supplierInvoiceNo: 'EZZ-2026-4471',
        goodsReceipt: id('goodsReceipts', 'gr1'), purchaseApproval: id('purchaseApprovals', 'pa1'),
        project: id('projects', 'p1'), costItem: id('costItems', 'ci3'),
        subTotal: 2854100, taxRate: '14', withholding: 28541, grandTotal: 3225133, paidAmount: 2000000, dueDate: daysAgo(5)
      }, 'SI', 1, U.acc, U.fm, U.gm, 34)),
      put('supplierInvoices', 'sinv2', approvedDoc({
        date: daysAgo(22), supplier: id('suppliers', 's1'), supplierInvoiceNo: 'ARC-8890',
        goodsReceipt: id('goodsReceipts', 'gr2'), purchaseApproval: id('purchaseApprovals', 'pa2'),
        project: id('projects', 'p1'), costItem: id('costItems', 'ci2'),
        subTotal: 563200, taxRate: '14', withholding: 5632, grandTotal: 636416, paidAmount: 636416, dueDate: daysAgo(2)
      }, 'SI', 2, U.acc, U.fm, U.gm, 21)),
      put('supplierInvoices', 'sinv3', approvedDoc({
        date: daysAgo(58), supplier: id('suppliers', 's3'), supplierInvoiceNo: 'FTH-1122',
        goodsReceipt: id('goodsReceipts', 'gr4'), project: id('projects', 'p1'), costItem: id('costItems', 'ci4'),
        subTotal: 566000, taxRate: '14', withholding: 5660, grandTotal: 639580, paidAmount: 639580, dueDate: daysAgo(28)
      }, 'SI', 3, U.acc, U.fm, U.gm, 57)),
      put('supplierInvoices', 'sinv4', pendingDoc({
        date: daysAgo(9), supplier: id('suppliers', 's6'), supplierInvoiceNo: 'NUR-5501',
        goodsReceipt: id('goodsReceipts', 'gr3'), project: id('projects', 'p2'), costItem: id('costItems', 'ci6'),
        subTotal: 260400, taxRate: '14', withholding: 2604, grandTotal: 294252, paidAmount: 0, dueDate: daysAhead(21)
      }, 'SI', 4, U.acc, 8))
    ]);

    /* ---------------- CLIENT IPCs ---------------- */
    Store.replaceAll('clientIPCs', [
      put('clientIPCs', 'ipc1', approvedDoc({
        date: daysAgo(90), project: id('projects', 'p1'), customer: id('customers', 'c4'),
        contract: id('clientContracts', 'cc1'), ipcNo: 3, periodLabel: 'الربع الثاني 2026',
        cumulativeWork: 22000000, previousWork: 14000000, currentWork: 8000000,
        advanceRecovery: 1200000, retention: 400000, deductions: 0, taxRate: '14',
        netDue: 7520000, collectedAmount: 7520000
      }, 'IPC', 1, U.tech, U.pm, U.gm, 88)),
      put('clientIPCs', 'ipc2', approvedDoc({
        date: daysAgo(30), project: id('projects', 'p1'), customer: id('customers', 'c4'),
        contract: id('clientContracts', 'cc1'), ipcNo: 4, periodLabel: 'يوليو 2026',
        cumulativeWork: 30500000, previousWork: 22000000, currentWork: 8500000,
        advanceRecovery: 1275000, retention: 425000, deductions: 0, taxRate: '14',
        netDue: 7990000, collectedAmount: 5000000
      }, 'IPC', 2, U.tech, U.pm, U.gm, 29)),
      put('clientIPCs', 'ipc3', approvedDoc({
        date: daysAgo(45), project: id('projects', 'p3'), customer: id('customers', 'c1'),
        contract: id('clientContracts', 'cc3'), ipcNo: 2, periodLabel: 'يونيو 2026',
        cumulativeWork: 19500000, previousWork: 11000000, currentWork: 8500000,
        advanceRecovery: 1700000, retention: 425000, deductions: 0, taxRate: '14',
        netDue: 7565000, collectedAmount: 7565000
      }, 'IPC', 3, U.tech, U.pm, U.gm, 44)),
      put('clientIPCs', 'ipc4', reviewedDoc({
        date: daysAgo(5), project: id('projects', 'p2'), customer: id('customers', 'c2'),
        contract: id('clientContracts', 'cc2'), ipcNo: 2, periodLabel: 'أغسطس 2026',
        cumulativeWork: 15800000, previousWork: 9200000, currentWork: 6600000,
        advanceRecovery: 660000, retention: 330000, deductions: 0, taxRate: '14',
        netDue: 6534000, collectedAmount: 0
      }, 'IPC', 4, U.tech, U.pm, 4))
    ]);

    /* ---------------- SUB IPCs ---------------- */
    Store.replaceAll('subIPCs', [
      put('subIPCs', 'sipc1', approvedDoc({
        date: daysAgo(40), project: id('projects', 'p1'), subcontractor: id('subcontractors', 'sc1'),
        contract: id('subContracts', 'sct1'), costItem: id('costItems', 'ci2'), ipcNo: 5,
        cumulativeWork: 7400000, previousWork: 5900000, currentWork: 1500000,
        advanceRecovery: 150000, retention: 75000, penalties: 0, withholding: 15000,
        netDue: 1260000, paidAmount: 1260000
      }, 'SIPC', 1, U.pm, U.fm, U.gm, 39)),
      put('subIPCs', 'sipc2', approvedDoc({
        date: daysAgo(18), project: id('projects', 'p1'), subcontractor: id('subcontractors', 'sc2'),
        contract: id('subContracts', 'sct2'), costItem: id('costItems', 'ci4'), ipcNo: 3,
        cumulativeWork: 2350000, previousWork: 1600000, currentWork: 750000,
        advanceRecovery: 75000, retention: 37500, penalties: 12000, withholding: 7500,
        netDue: 618000, paidAmount: 400000
      }, 'SIPC', 2, U.pm, U.fm, U.gm, 17)),
      put('subIPCs', 'sipc3', approvedDoc({
        date: daysAgo(25), project: id('projects', 'p3'), subcontractor: id('subcontractors', 'sc4'),
        contract: id('subContracts', 'sct4'), costItem: id('costItems', 'ci1'), ipcNo: 4,
        cumulativeWork: 6800000, previousWork: 5100000, currentWork: 1700000,
        advanceRecovery: 340000, retention: 85000, penalties: 0, withholding: 17000,
        netDue: 1258000, paidAmount: 1258000
      }, 'SIPC', 3, U.pm, U.fm, U.gm, 24)),
      put('subIPCs', 'sipc4', pendingDoc({
        date: daysAgo(3), project: id('projects', 'p2'), subcontractor: id('subcontractors', 'sc3'),
        contract: id('subContracts', 'sct3'), costItem: id('costItems', 'ci6'), ipcNo: 2,
        cumulativeWork: 2100000, previousWork: 1150000, currentWork: 950000,
        advanceRecovery: 142500, retention: 47500, penalties: 0, withholding: 9500,
        netDue: 750500, paidAmount: 0
      }, 'SIPC', 4, U.pm, 2))
    ]);

    /* ---------------- PAYMENTS & RECEIPTS ---------------- */
    Store.replaceAll('payments', [
      put('payments', 'pv1', approvedDoc({
        date: daysAgo(30), payeeType: 'supplier', beneficiary: 'حديد عز — التوزيع',
        supplier: id('suppliers', 's2'), supplierInvoice: id('supplierInvoices', 'sinv1'),
        project: id('projects', 'p1'), costItem: id('costItems', 'ci3'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer', chequeNo: 'TRF-88120',
        amount: 2000000, description: 'دفعة تحت حساب فاتورة حديد التسليح EZZ-2026-4471'
      }, 'PV', 1, U.acc, U.fm, U.gm, 29)),
      put('payments', 'pv2', approvedDoc({
        date: daysAgo(20), payeeType: 'supplier', beneficiary: 'شركة العريش للأسمنت',
        supplier: id('suppliers', 's1'), supplierInvoice: id('supplierInvoices', 'sinv2'),
        project: id('projects', 'p1'), costItem: id('costItems', 'ci2'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'cheque', chequeNo: 'CHQ-004512',
        amount: 636416, description: 'سداد كامل فاتورة أسمنت ARC-8890'
      }, 'PV', 2, U.acc, U.fm, U.gm, 19)),
      put('payments', 'pv3', approvedDoc({
        date: daysAgo(36), payeeType: 'subcontractor', beneficiary: 'مؤسسة البناء الحديث للمقاولات',
        project: id('projects', 'p1'), costItem: id('costItems', 'ci2'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer', chequeNo: 'TRF-88044',
        amount: 1260000, description: 'سداد مستخلص رقم ٥ — أعمال خرسانة'
      }, 'PV', 3, U.acc, U.fm, U.gm, 35)),
      put('payments', 'pv4', approvedDoc({
        date: daysAgo(15), payeeType: 'subcontractor', beneficiary: 'شركة الإتقان للتشطيبات',
        project: id('projects', 'p1'), costItem: id('costItems', 'ci4'),
        cashAccount: id('cashAccounts', 'ca3'), method: 'transfer', chequeNo: 'TRF-88301',
        amount: 400000, description: 'دفعة تحت حساب مستخلص ٣ — مباني ومحارة'
      }, 'PV', 4, U.acc, U.fm, U.gm, 14)),
      put('payments', 'pv5', approvedDoc({
        date: daysAgo(22), payeeType: 'subcontractor', beneficiary: 'مقاولات الصعيد للأعمال الترابية',
        project: id('projects', 'p3'), costItem: id('costItems', 'ci1'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer',
        amount: 1258000, description: 'سداد مستخلص ٤ — أعمال ترابية'
      }, 'PV', 5, U.acc, U.fm, U.gm, 21)),
      put('payments', 'pv6', approvedDoc({
        date: daysAgo(55), payeeType: 'supplier', beneficiary: 'مصنع الفتح للطوب الأسمنتي',
        supplier: id('suppliers', 's3'), supplierInvoice: id('supplierInvoices', 'sinv3'),
        project: id('projects', 'p1'), costItem: id('costItems', 'ci4'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer',
        amount: 639580, description: 'سداد فاتورة FTH-1122'
      }, 'PV', 6, U.acc, U.fm, U.gm, 54)),
      put('payments', 'pv7', pendingDoc({
        date: daysAgo(1), payeeType: 'expense', beneficiary: 'مصروفات نثرية موقع العبور',
        project: id('projects', 'p1'), costItem: id('costItems', 'ci9'),
        cashAccount: id('cashAccounts', 'ca1'), method: 'cash',
        amount: 42000, description: 'مصروفات نثرية وأمن الموقع — أغسطس'
      }, 'PV', 7, U.acc, 1))
    ]);

    Store.replaceAll('receipts', [
      put('receipts', 'rv1', approvedDoc({
        date: daysAgo(80), customer: id('customers', 'c4'), payer: 'جهاز مدينة العبور',
        project: id('projects', 'p1'), clientIPC: id('clientIPCs', 'ipc1'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer', chequeNo: 'IN-2201',
        amount: 7520000, description: 'تحصيل مستخلص ٣ — مشروع العبور'
      }, 'RV', 1, U.acc, U.fm, U.gm, 79)),
      put('receipts', 'rv2', approvedDoc({
        date: daysAgo(12), customer: id('customers', 'c4'), payer: 'جهاز مدينة العبور',
        project: id('projects', 'p1'), clientIPC: id('clientIPCs', 'ipc2'),
        cashAccount: id('cashAccounts', 'ca2'), method: 'transfer', chequeNo: 'IN-2288',
        amount: 5000000, description: 'دفعة تحت حساب مستخلص ٤'
      }, 'RV', 2, U.acc, U.fm, U.gm, 11)),
      put('receipts', 'rv3', approvedDoc({
        date: daysAgo(38), customer: id('customers', 'c1'), payer: 'الهيئة الهندسية',
        project: id('projects', 'p3'), clientIPC: id('clientIPCs', 'ipc3'),
        cashAccount: id('cashAccounts', 'ca3'), method: 'transfer', chequeNo: 'IN-2245',
        amount: 7565000, description: 'تحصيل مستخلص ٢ — مشروع الطرق'
      }, 'RV', 3, U.acc, U.fm, U.gm, 37))
    ]);

    /* ---------------- JOURNAL ---------------- */
    Store.replaceAll('journal', [
      put('journal', 'jv1', approvedDoc({
        date: daysAgo(28), description: 'إثبات مصروفات إدارية وعمومية — يوليو',
        costItem: id('costItems', 'ci10'), reference: 'ADM-07',
        lines: [
          { account: id('accounts', 'a21'), lineDesc: 'إيجارات ومرافق المقر', debit: 185000, credit: 0 },
          { account: id('accounts', 'a2'),  lineDesc: 'من الخزينة الرئيسية',  debit: 0, credit: 185000 }
        ], totalDebit: 185000, totalCredit: 185000
      }, 'JV', 1, U.acc, U.fm, U.gm, 27)),
      put('journal', 'jv2', approvedDoc({
        date: daysAgo(10), description: 'إثبات تكلفة تشغيل وصيانة المعدات — أغسطس',
        project: id('projects', 'p3'), costItem: id('costItems', 'ci8'), reference: 'EQP-08',
        lines: [
          { account: id('accounts', 'a20'), lineDesc: 'تشغيل وصيانة معدات', debit: 268000, credit: 0 },
          { account: id('accounts', 'a2'),  lineDesc: 'من الخزينة',          debit: 0, credit: 268000 }
        ], totalDebit: 268000, totalCredit: 268000
      }, 'JV', 2, U.acc, U.fm, U.gm, 9)),
      put('journal', 'jv3', draftDoc({
        date: daysAgo(1), description: 'تسوية فروق جرد مخزن العبور',
        project: id('projects', 'p1'), costItem: id('costItems', 'ci2'),
        lines: [
          { account: id('accounts', 'a17'), lineDesc: 'عجز مخزون', debit: 6400, credit: 0 },
          { account: id('accounts', 'a5'),  lineDesc: 'من المخزون', debit: 0, credit: 6400 }
        ], totalDebit: 6400, totalCredit: 6400
      }, 'JV', 3, U.acc))
    ]);

    /* ---------------- EQUIPMENT LOGS ---------------- */
    Store.replaceAll('equipmentLogs', [
      put('equipmentLogs', 'el1', { docNo: 'EQL-0001', date: daysAgo(10), equipment: id('equipment', 'eq1'), logType: 'usage', project: id('projects', 'p3'), costItem: id('costItems', 'ci8'), hours: 186, cost: 148800, description: 'ساعات تشغيل الحفار — أغسطس' }),
      put('equipmentLogs', 'el2', { docNo: 'EQL-0002', date: daysAgo(9),  equipment: id('equipment', 'eq1'), logType: 'fuel',  project: id('projects', 'p3'), costItem: id('costItems', 'ci8'), fuelLitres: 3200, cost: 49600, description: 'تموين وقود' }),
      put('equipmentLogs', 'el3', { docNo: 'EQL-0003', date: daysAgo(5),  equipment: id('equipment', 'eq4'), logType: 'maintenance', project: id('projects', 'p2'), costItem: id('costItems', 'ci8'), cost: 18500, description: 'تغيير طلمبة وصيانة دورية', nextService: daysAhead(85) }),
      put('equipmentLogs', 'el4', { docNo: 'EQL-0004', date: daysAgo(12), equipment: id('equipment', 'eq3'), logType: 'usage', project: id('projects', 'p1'), costItem: id('costItems', 'ci8'), hours: 240, cost: 95000, description: 'إيجار شهري ونش برجي' }),
      put('equipmentLogs', 'el5', { docNo: 'EQL-0005', date: daysAgo(3),  equipment: id('equipment', 'eq5'), logType: 'fuel',  project: id('projects', 'p3'), costItem: id('costItems', 'ci8'), fuelLitres: 900, cost: 13950, description: 'تموين وقود شاحنة' })
    ]);

    /* ---------------- SITE REPORTS ---------------- */
    Store.replaceAll('siteReports', [
      put('siteReports', 'sr1', { docNo: 'SR-0001', date: daysAgo(2), project: id('projects', 'p1'), weather: 'hot', manpower: 84, equipmentCount: 5, workDone: 'استكمال صب سقف الدور الرابع — عمارة ٣. بدء أعمال المباني بالدور الأول عمارة ٢.', delays: 'تأخر توريد الطوب ٤ ساعات.', visitors: 'زيارة استشاري المشروع لمعاينة التسليح.', safetyNotes: 'تم توزيع خوذات جديدة، لا حوادث.', createdBy: id('users', 'pm') }),
      put('siteReports', 'sr2', { docNo: 'SR-0002', date: daysAgo(1), project: id('projects', 'p3'), weather: 'dust', manpower: 46, equipmentCount: 7, workDone: 'أعمال حفر وتسوية بطول ٤٠٠ م. نقل ١٢٠٠ م٣ ناتج حفر.', delays: 'عاصفة ترابية أوقفت العمل ساعتين.', safetyNotes: 'تم إيقاف العمل مؤقتاً لسوء الرؤية.', createdBy: id('users', 'pm') }),
      put('siteReports', 'sr3', { docNo: 'SR-0003', date: daysAgo(1), project: id('projects', 'p2'), weather: 'clear', manpower: 62, equipmentCount: 3, workDone: 'استكمال أعمال التغذية الكهربائية الرئيسية بالبدروم.', createdBy: id('users', 'pm') })
    ]);

    /* ---------------- DRAWINGS ---------------- */
    Store.replaceAll('drawings', [
      put('drawings', 'd1', { drawingNo: 'ST-101', title: 'مخطط تسليح الأساسات — عمارة ١ و٢', project: id('projects', 'p1'), discipline: 'struct', revision: 'R2', drawingStatus: 'ifc', issueDate: daysAgo(280), preparedBy: id('employees', 'e7') }),
      put('drawings', 'd2', { drawingNo: 'ST-205', title: 'تسليح الأسقف — الأدوار المتكررة', project: id('projects', 'p1'), discipline: 'struct', revision: 'R1', drawingStatus: 'ifc', issueDate: daysAgo(120), preparedBy: id('employees', 'e7') }),
      put('drawings', 'd3', { drawingNo: 'AR-310', title: 'المساقط المعمارية — الدور الأرضي', project: id('projects', 'p1'), discipline: 'arch', revision: 'R3', drawingStatus: 'ifa', issueDate: daysAgo(45), preparedBy: id('employees', 'e13') }),
      put('drawings', 'd4', { drawingNo: 'EL-120', title: 'لوحات التوزيع الكهربائية', project: id('projects', 'p2'), discipline: 'electrical', revision: 'R0', drawingStatus: 'ifr', issueDate: daysAgo(20), preparedBy: id('employees', 'e7') }),
      put('drawings', 'd5', { drawingNo: 'SI-045', title: 'المقاطع الطولية والعرضية للطريق', project: id('projects', 'p3'), discipline: 'site', revision: 'R1', drawingStatus: 'ifc', issueDate: daysAgo(100), preparedBy: id('employees', 'e13') })
    ]);

    /* ---------------- ATTENDANCE (last 10 working days, key staff) ---------------- */
    var att = [];
    var attN = 1;
    ['e3', 'e4', 'e5', 'e6', 'e7', 'e9', 'e12', 'e13'].forEach(function (ek) {
      for (var d = 1; d <= 10; d++) {
        var day = new Date(); day.setDate(day.getDate() - d);
        if (day.getDay() === 5) continue; /* Friday off */
        var r = Math.random();
        var status = r > 0.94 ? 'absent' : r > 0.90 ? 'leave' : r > 0.87 ? 'mission' : 'present';
        att.push(put('attendance', 'at' + (attN++), {
          date: day.toISOString().slice(0, 10),
          employee: id('employees', ek),
          project: (ek === 'e6' || ek === 'e9') ? id('projects', 'p1') : null,
          attStatus: status,
          checkIn: status === 'present' ? '08:00' : '',
          checkOut: status === 'present' ? (Math.random() > 0.6 ? '18:30' : '17:00') : '',
          overtimeHours: status === 'present' && Math.random() > 0.6 ? 1.5 : 0,
          createdBy: id('users', 'hr')
        }));
      }
    });
    Store.replaceAll('attendance', att);

    /* ---------------- LEAVES ---------------- */
    Store.replaceAll('leaves', [
      put('leaves', 'lv1', approvedDoc({
        employee: id('employees', 'e3'), leaveType: 'annual', fromDate: daysAhead(14), toDate: daysAhead(20),
        days: 7, substitute: id('employees', 'e2'), reason: 'إجازة سنوية — سفر عائلي'
      }, 'LV', 1, U.hr, U.fm, U.gm, 6)),
      put('leaves', 'lv2', pendingDoc({
        employee: id('employees', 'e9'), leaveType: 'casual', fromDate: daysAhead(3), toDate: daysAhead(4),
        days: 2, reason: 'ظرف عائلي طارئ'
      }, 'LV', 2, U.hr, 1)),
      put('leaves', 'lv3', approvedDoc({
        employee: id('employees', 'e14'), leaveType: 'sick', fromDate: daysAgo(9), toDate: daysAgo(7),
        days: 3, reason: 'إجازة مرضية بتقرير طبي معتمد'
      }, 'LV', 3, U.hr, U.fm, U.gm, 10))
    ]);

    /* ---------------- PAYROLL ---------------- */
    var prLines = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12', 'e13', 'e14', 'e15'].map(function (ek) {
      var emp = Store.find('employees', id('employees', ek));
      var basic = emp ? Number(emp.basicSalary) || 0 : 0;
      var allow = emp ? Number(emp.allowances) || 0 : 0;
      var ot = Math.round(basic * 0.03);
      var ded = Math.round(basic * 0.02);
      var ins = Math.round(basic * 0.11);
      return { employee: id('employees', ek), basic: basic, allowances: allow, overtime: ot, deductions: ded, insurance: ins, lineTotal: basic + allow + ot - ded - ins };
    });
    var prNet = prLines.reduce(function (a, l) { return a + l.lineTotal; }, 0);
    Store.replaceAll('payroll', [
      put('payroll', 'pr1', approvedDoc({
        period: '2026-07', date: daysAgo(11), employeeCount: prLines.length,
        lines: prLines, netTotal: prNet, notes: 'مسير رواتب شهر يوليو ٢٠٢٦ — كل الإدارات.'
      }, 'PR', 1, U.hr, U.fm, U.gm, 10))
    ]);

    /* ---------------- LEGAL ---------------- */
    Store.replaceAll('legalDocs', [
      put('legalDocs', 'lg1', { refNo: 'LIC-001', title: 'السجل التجاري للشركة', docType: 'licence', party: 'الغرفة التجارية', issueDate: daysAgo(700), expiryDate: daysAhead(45), responsible: id('employees', 'e10'), legalStatus: 'expiring' }),
      put('legalDocs', 'lg2', { refNo: 'LIC-002', title: 'شهادة تصنيف الاتحاد المصري لمقاولي التشييد', docType: 'licence', party: 'الاتحاد المصري للتشييد والبناء', issueDate: daysAgo(400), expiryDate: daysAhead(330), responsible: id('employees', 'e10'), legalStatus: 'valid' }),
      put('legalDocs', 'lg3', { refNo: 'BG-2025-11', title: 'خطاب ضمان حسن تنفيذ — مشروع العبور', docType: 'guarantee', party: 'البنك الأهلي المصري', project: id('projects', 'p1'), value: 7400000, issueDate: daysAgo(320), expiryDate: daysAhead(260), responsible: id('employees', 'e2'), legalStatus: 'valid' }),
      put('legalDocs', 'lg4', { refNo: 'INS-2026-04', title: 'وثيقة تأمين كافة أخطار المقاولين', docType: 'insurance', party: 'مصر للتأمين', project: id('projects', 'p2'), value: 520000, issueDate: daysAgo(200), expiryDate: daysAhead(160), responsible: id('employees', 'e10'), legalStatus: 'valid' }),
      put('legalDocs', 'lg5', { refNo: 'CASE-2025-02', title: 'نزاع مستحقات مع مورد سابق', docType: 'case', party: 'شركة الأمل للتوريدات', value: 340000, issueDate: daysAgo(260), responsible: id('employees', 'e10'), legalStatus: 'ongoing', notes: 'الجلسة القادمة بعد شهر — المحكمة الاقتصادية.' })
    ]);

    /* ---------------- IT ---------------- */
    Store.replaceAll('itAssets', [
      put('itAssets', 'ia1', { code: 'IT-001', name: 'Dell Latitude 5540', assetType: 'laptop', assignedTo: id('employees', 'e2'), serialNo: 'DL5540-8891', purchaseDate: daysAgo(400), purchaseValue: 38000, warrantyEnd: daysAhead(330), assetStatus: 'inuse' }),
      put('itAssets', 'ia2', { code: 'IT-002', name: 'HP ProBook 450 G10', assetType: 'laptop', assignedTo: id('employees', 'e7'), serialNo: 'HP450-2214', purchaseDate: daysAgo(220), purchaseValue: 32000, warrantyEnd: daysAhead(510), assetStatus: 'inuse' }),
      put('itAssets', 'ia3', { code: 'IT-003', name: 'طابعة HP LaserJet M428', assetType: 'printer', serialNo: 'HPM428-771', purchaseDate: daysAgo(600), purchaseValue: 14500, assetStatus: 'inuse' }),
      put('itAssets', 'ia4', { code: 'IT-004', name: 'راوتر MikroTik hEX S', assetType: 'network', serialNo: 'MK-HEX-102', purchaseDate: daysAgo(500), purchaseValue: 4200, assetStatus: 'inuse' }),
      put('itAssets', 'ia5', { code: 'IT-005', name: 'ترخيص AutoCAD 2026', assetType: 'software', assignedTo: id('employees', 'e13'), purchaseDate: daysAgo(120), purchaseValue: 62000, warrantyEnd: daysAhead(245), assetStatus: 'inuse' })
    ]);
    Store.replaceAll('itTickets', [
      put('itTickets', 'tk1', { docNo: 'TIC-2026-0001', date: daysAgo(4), subject: 'بطء شديد في الإنترنت بمكتب الحسابات', requester: id('employees', 'e3'), category: 'network', priority: 'high', assignedTo: id('employees', 'e11'), ticketStatus: 'inprogress', description: 'الاتصال ينقطع كل ١٠ دقائق تقريباً منذ يوم الأحد.' }),
      put('itTickets', 'tk2', { docNo: 'TIC-2026-0002', date: daysAgo(2), subject: 'طلب صلاحية دخول لشاشة المستخلصات', requester: id('employees', 'e13'), category: 'access', priority: 'normal', assignedTo: id('employees', 'e11'), ticketStatus: 'open', description: 'مطلوب صلاحية عرض وإضافة على شاشة مستخلصات العملاء.' }),
      put('itTickets', 'tk3', { docNo: 'TIC-2026-0003', date: daysAgo(8), subject: 'الطابعة لا تستجيب', requester: id('employees', 'e14'), category: 'hardware', priority: 'low', assignedTo: id('employees', 'e11'), ticketStatus: 'resolved', description: 'الطابعة الرئيسية لا تطبع.', resolution: 'تم تغيير كابل الشبكة وإعادة تثبيت التعريف.' })
    ]);

    /* ---------------- ANNOUNCEMENTS ---------------- */
    Store.replaceAll('announcements', [
      put('announcements', 'an1', { docNo: 'ANN-2026-0001', date: daysAgo(6), title: 'تعميم بشأن مواعيد العمل الصيفية', audience: 'all', importance: 'high', effectiveDate: daysAgo(1), body: 'تقرر تعديل مواعيد العمل بالمقر الرئيسي لتكون من الثامنة صباحاً حتى الثالثة والنصف عصراً، ولمواقع التنفيذ من السابعة صباحاً حتى الثانية ظهراً، وذلك اعتباراً من تاريخ السريان المذكور وحتى نهاية شهر سبتمبر.', createdBy: id('users', 'hr') }),
      put('announcements', 'an2', { docNo: 'ANN-2026-0002', date: daysAgo(3), title: 'إلزامية استخدام النظام في كل طلبات الشراء', audience: 'all', importance: 'urgent', effectiveDate: daysAgo(3), body: 'لن يتم صرف أي مبالغ أو استلام أي توريدات دون اعتماد شراء مسجل ومعتمد على النظام. أي التزام خارج النظام يتحمله من قام به شخصياً.', createdBy: id('users', 'admin') }),
      put('announcements', 'an3', { docNo: 'ANN-2026-0003', date: daysAgo(14), title: 'دورة تدريبية في السلامة والصحة المهنية', audience: 'sites', importance: 'normal', effectiveDate: daysAhead(7), body: 'تنظم إدارة الموارد البشرية دورة تدريبية في السلامة والصحة المهنية لجميع العاملين بالمواقع. الحضور إلزامي لمشرفي المواقع ومهندسي التنفيذ.', createdBy: id('users', 'hr') })
    ]);

    /* ---------------- document number counters ---------------- */
    var year = new Date().getFullYear();
    Store.setMeta({
      seeded: true,
      seededAt: new Date().toISOString(),
      company: {
        name: 'شركة الزهراء للمقاولات العامة', nameEn: 'Alzahraa General Contracting Co.',
        address: 'القاهرة — مدينة نصر', phone: '0224445555', email: 'info@alzahraa-contracting.com',
        taxId: '123-456-789', commercialReg: '45678', currency: 'EGP', fiscalStart: '01-01'
      },
      seqs: {
        ['PA-' + year]: 6, ['GRN-' + year]: 4, ['SIS-' + year]: 5, ['STR-' + year]: 1,
        ['SC-' + year]: 1, ['SI-' + year]: 4, ['PV-' + year]: 7, ['RV-' + year]: 3,
        ['JV-' + year]: 3, ['IPC-' + year]: 4, ['SIPC-' + year]: 4, ['BUD-' + year]: 3,
        ['LV-' + year]: 3, ['PR-' + year]: 1, ['TIC-' + year]: 3, ['ANN-' + year]: 3
      }
    });
  }

  global.Seed = { run: run };
})(window);
