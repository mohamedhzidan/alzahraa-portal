/* =========================================================================
   i18n.js — Bilingual engine (Arabic RTL / English LTR)
   HOW TO ADD A WORD: add one line in BOTH `ar` and `en` objects below,
   then use it in code as  t('my.key')  or in HTML as  data-i18n="my.key"
   ========================================================================= */
(function (global) {
  'use strict';

  var DICT = {
    ar: {
      'app.name': 'شركة الزهراء للمقاولات العامة',
      'app.short': 'الزهراء للمقاولات',
      'app.portal': 'بوابة الموظفين الداخلية',

      'login.user': 'اسم المستخدم', 'login.pass': 'كلمة المرور', 'login.submit': 'تسجيل الدخول',
      'login.demoTitle': 'حسابات تجريبية (اضغط لتعبئة البيانات)',
      'login.demoHint': 'كلمة المرور لكل الحسابات التجريبية: 1234',
      'login.bad': 'اسم المستخدم أو كلمة المرور غير صحيحة',
      'login.disabled': 'هذا الحساب موقوف. راجع مسؤول النظام.',
      'login.welcome': 'أهلاً بك، ',

      'nav.search': 'ابحث في الشاشات...',
      'top.search': 'بحث سريع (Ctrl+K)', 'top.inbox': 'صندوق الاعتمادات', 'top.theme': 'تبديل المظهر',
      'menu.profile': 'الملف الشخصي', 'menu.settings': 'الإعدادات',
      'menu.backup': 'نسخة احتياطية (تنزيل)', 'menu.restore': 'استعادة نسخة', 'menu.logout': 'تسجيل الخروج',
      'palette.ph': 'ابحث عن شاشة أو أمر...',
      'footer.copy': '© 2026 شركة الزهراء للمقاولات العامة — نظام داخلي',
      'footer.demo': 'وضع تجريبي: البيانات محفوظة على هذا الجهاز فقط',

      'g.new': 'جديد', 'g.add': 'إضافة', 'g.edit': 'تعديل', 'g.view': 'عرض', 'g.delete': 'حذف',
      'g.save': 'حفظ', 'g.saveClose': 'حفظ وإغلاق', 'g.cancel': 'إلغاء', 'g.close': 'إغلاق',
      'g.confirm': 'تأكيد', 'g.yes': 'نعم', 'g.no': 'لا', 'g.search': 'بحث', 'g.filter': 'تصفية',
      'g.all': 'الكل', 'g.export': 'تصدير Excel', 'g.print': 'طباعة', 'g.refresh': 'تحديث',
      'g.actions': 'إجراءات', 'g.total': 'الإجمالي', 'g.subtotal': 'الإجمالي قبل الضريبة',
      'g.count': 'عدد السجلات', 'g.of': 'من', 'g.page': 'صفحة', 'g.rows': 'سجل',
      'g.noData': 'لا توجد بيانات', 'g.noDataHint': 'ابدأ بإضافة أول سجل من زر «جديد».',
      'g.noResults': 'لا توجد نتائج مطابقة',
      'g.required': 'هذا الحقل مطلوب', 'g.saved': 'تم الحفظ بنجاح', 'g.deleted': 'تم الحذف',
      'g.deleteQ': 'هل تريد حذف هذا السجل نهائياً؟', 'g.deleteWarn': 'لا يمكن التراجع عن هذا الإجراء.',
      'g.back': 'رجوع', 'g.details': 'التفاصيل', 'g.attachments': 'المرفقات', 'g.notes': 'ملاحظات',
      'g.lines': 'البنود', 'g.addLine': 'إضافة بند', 'g.history': 'سجل الحركة',
      'g.createdBy': 'أنشأه', 'g.createdAt': 'تاريخ الإنشاء', 'g.updatedAt': 'آخر تعديل',
      'g.status': 'الحالة', 'g.currency': 'ج.م', 'g.qty': 'الكمية', 'g.unit': 'الوحدة',
      'g.price': 'السعر', 'g.tax': 'الضريبة', 'g.desc': 'الوصف', 'g.date': 'التاريخ',
      'g.docNo': 'رقم المستند', 'g.selectOne': '— اختر —', 'g.optional': 'اختياري',
      'g.showing': 'عرض', 'g.perPage': 'لكل صفحة', 'g.clearFilters': 'مسح الفلاتر',
      'g.duplicate': 'نسخ كمستند جديد', 'g.na': 'غير محدد',

      'wf.status': 'حالة المستند',
      'wf.draft': 'مسودة', 'wf.pending': 'بانتظار المراجعة', 'wf.reviewed': 'تمت المراجعة',
      'wf.approved': 'معتمد', 'wf.rejected': 'مرفوض', 'wf.returned': 'معاد للتعديل', 'wf.reversed': 'معكوس',
      'wf.submit': 'إرسال للمراجعة', 'wf.review': 'تمرير للاعتماد', 'wf.approve': 'اعتماد',
      'wf.reject': 'رفض', 'wf.return': 'إعادة للمُدخل', 'wf.reverse': 'عكس المستند',
      'wf.reason': 'السبب', 'wf.reasonReq': 'السبب إلزامي',
      'wf.noSelfReview': 'لا يمكنك مراجعة مستند أنشأته بنفسك (فصل المهام).',
      'wf.noSelfApprove': 'لا يمكنك اعتماد مستند راجعته أو أنشأته بنفسك (فصل المهام).',
      'wf.noPerm': 'لا تملك صلاحية تنفيذ هذا الإجراء.',
      'wf.lockedEdit': 'لا يمكن التعديل بعد الإرسال. يجب إعادة المستند للمُدخل أولاً.',
      'wf.lockedDelete': 'لا يمكن حذف مستند معتمد أو مُرحّل. استخدم «عكس المستند».',
      'wf.submitted': 'تم إرسال المستند للمراجعة',
      'wf.approvedMsg': 'تم اعتماد المستند وترحيل أثره',
      'wf.rejectedMsg': 'تم رفض المستند',
      'wf.returnedMsg': 'تمت إعادة المستند للمُدخل',
      'wf.reviewedMsg': 'تمت المراجعة، المستند بانتظار الاعتماد',
      'wf.reversedMsg': 'تم عكس المستند بمستند تصحيح',
      'wf.timeline': 'مسار الاعتماد',
      'wf.by': 'بواسطة', 'wf.at': 'بتاريخ',

      'inbox.title': 'صندوق الاعتمادات',
      'inbox.sub': 'المستندات المنتظرة لإجراء منك',
      'inbox.empty': 'لا توجد مستندات بانتظارك. عمل ممتاز!',
      'inbox.toReview': 'بانتظار مراجعتك', 'inbox.toApprove': 'بانتظار اعتمادك',
      'inbox.mine': 'مستنداتي المعادة',

      'dash.title': 'لوحة التحكم', 'dash.sub': 'نظرة عامة على أداء الشركة',
      'dash.hello': 'مرحباً', 'dash.today': 'اليوم',
      'dash.projects': 'المشروعات النشطة', 'dash.budget': 'إجمالي الموازنات',
      'dash.actual': 'التكلفة الفعلية', 'dash.committed': 'الالتزامات',
      'dash.pending': 'مستندات بانتظار الاعتماد', 'dash.receivable': 'مستحقات من العملاء',
      'dash.payable': 'مستحقات للموردين', 'dash.stockValue': 'قيمة المخزون',
      'dash.employees': 'عدد الموظفين', 'dash.equipment': 'المعدات العاملة',
      'dash.costByType': 'التكلفة حسب النوع', 'dash.budgetVsActual': 'الموازنة مقابل الفعلي',
      'dash.recentDocs': 'أحدث المستندات', 'dash.myTasks': 'مهامي',
      'dash.quickActions': 'إجراءات سريعة', 'dash.alerts': 'تنبيهات',
      'dash.overBudget': 'مشروعات تجاوزت الموازنة', 'dash.lowStock': 'أصناف تحت حد الطلب',
      'dash.expiring': 'عقود/تراخيص قاربت الانتهاء',

      'rep.title': 'التقارير', 'rep.sub': 'تقارير قابلة للتصفية والتصدير',
      'rep.bva': 'الموازنة مقابل الفعلي', 'rep.stock': 'أرصدة المخزون',
      'rep.ap': 'أعمار ديون الموردين', 'rep.ar': 'أعمار ديون العملاء',
      'rep.tb': 'ميزان المراجعة', 'rep.projCost': 'تكلفة المشروع التفصيلية',
      'rep.cash': 'حركة الخزينة والبنوك', 'rep.payroll': 'ملخص الرواتب',
      'rep.attendance': 'ملخص الحضور', 'rep.subcontract': 'مستخلصات مقاولي الباطن',
      'rep.run': 'عرض التقرير', 'rep.from': 'من تاريخ', 'rep.to': 'إلى تاريخ',
      'rep.variance': 'الانحراف', 'rep.available': 'المتاح', 'rep.pct': 'النسبة',

      'set.title': 'الإعدادات', 'set.sub': 'إعدادات الشركة والمستخدمين والنظام',
      'set.company': 'بيانات الشركة', 'set.users': 'المستخدمون والصلاحيات',
      'set.roles': 'الأدوار', 'set.audit': 'سجل المراجعة', 'set.data': 'البيانات والنسخ الاحتياطي',
      'set.about': 'عن النظام',
      'set.resetQ': 'إعادة ضبط كل البيانات؟', 'set.resetWarn': 'سيتم حذف كل ما أدخلته وإرجاع البيانات التجريبية الأصلية.',
      'set.reset': 'إعادة ضبط البيانات التجريبية',
      'set.backupOk': 'تم تنزيل النسخة الاحتياطية',
      'set.restoreOk': 'تمت استعادة النسخة بنجاح',
      'set.restoreBad': 'الملف غير صالح',
      'set.auditEmpty': 'سجل المراجعة فارغ',

      'aud.action': 'الإجراء', 'aud.entity': 'الشاشة', 'aud.record': 'السجل',
      'aud.user': 'المستخدم', 'aud.time': 'الوقت', 'aud.detail': 'التفاصيل',
      'aud.create': 'إنشاء', 'aud.update': 'تعديل', 'aud.delete': 'حذف',
      'aud.login': 'دخول', 'aud.logout': 'خروج', 'aud.status': 'تغيير حالة',

      'grp.main': 'الرئيسية',
      'grp.finance': 'المالية والمشتريات والمخازن',
      'grp.projects': 'المشروعات والمكتب الفني',
      'grp.people': 'الموارد البشرية والإدارة',
      'grp.system': 'التقارير والنظام',

      'perm.view': 'عرض', 'perm.create': 'إضافة', 'perm.edit': 'تعديل',
      'perm.delete': 'حذف', 'perm.review': 'مراجعة', 'perm.approve': 'اعتماد',
      'perm.none': 'لا تملك صلاحية الوصول لهذه الشاشة.',

      'unit.pcs': 'قطعة', 'unit.ton': 'طن', 'unit.m3': 'م٣', 'unit.m2': 'م٢',
      'unit.m': 'متر', 'unit.kg': 'كجم', 'unit.bag': 'شيكارة', 'unit.lump': 'مقطوعية',
      'unit.day': 'يوم', 'unit.hour': 'ساعة', 'unit.ltr': 'لتر'
    },

    en: {
      'app.name': 'Alzahraa General Contracting Co.',
      'app.short': 'Alzahraa Contracting',
      'app.portal': 'Internal Employee Portal',

      'login.user': 'Username', 'login.pass': 'Password', 'login.submit': 'Sign in',
      'login.demoTitle': 'Demo accounts (click to fill)',
      'login.demoHint': 'Password for all demo accounts: 1234',
      'login.bad': 'Incorrect username or password',
      'login.disabled': 'This account is disabled. Contact the system administrator.',
      'login.welcome': 'Welcome, ',

      'nav.search': 'Search screens...',
      'top.search': 'Quick search (Ctrl+K)', 'top.inbox': 'Approvals inbox', 'top.theme': 'Toggle theme',
      'menu.profile': 'My profile', 'menu.settings': 'Settings',
      'menu.backup': 'Backup (download)', 'menu.restore': 'Restore backup', 'menu.logout': 'Sign out',
      'palette.ph': 'Search for a screen or command...',
      'footer.copy': '© 2026 Alzahraa General Contracting Co. — Internal system',
      'footer.demo': 'Demo mode: data is stored on this device only',

      'g.new': 'New', 'g.add': 'Add', 'g.edit': 'Edit', 'g.view': 'View', 'g.delete': 'Delete',
      'g.save': 'Save', 'g.saveClose': 'Save & close', 'g.cancel': 'Cancel', 'g.close': 'Close',
      'g.confirm': 'Confirm', 'g.yes': 'Yes', 'g.no': 'No', 'g.search': 'Search', 'g.filter': 'Filter',
      'g.all': 'All', 'g.export': 'Export to Excel', 'g.print': 'Print', 'g.refresh': 'Refresh',
      'g.actions': 'Actions', 'g.total': 'Total', 'g.subtotal': 'Subtotal',
      'g.count': 'Records', 'g.of': 'of', 'g.page': 'Page', 'g.rows': 'rows',
      'g.noData': 'No data yet', 'g.noDataHint': 'Start by adding your first record using the "New" button.',
      'g.noResults': 'No matching results',
      'g.required': 'This field is required', 'g.saved': 'Saved successfully', 'g.deleted': 'Deleted',
      'g.deleteQ': 'Permanently delete this record?', 'g.deleteWarn': 'This action cannot be undone.',
      'g.back': 'Back', 'g.details': 'Details', 'g.attachments': 'Attachments', 'g.notes': 'Notes',
      'g.lines': 'Line items', 'g.addLine': 'Add line', 'g.history': 'Activity log',
      'g.createdBy': 'Created by', 'g.createdAt': 'Created on', 'g.updatedAt': 'Last modified',
      'g.status': 'Status', 'g.currency': 'EGP', 'g.qty': 'Qty', 'g.unit': 'Unit',
      'g.price': 'Price', 'g.tax': 'Tax', 'g.desc': 'Description', 'g.date': 'Date',
      'g.docNo': 'Document no.', 'g.selectOne': '— Select —', 'g.optional': 'optional',
      'g.showing': 'Showing', 'g.perPage': 'per page', 'g.clearFilters': 'Clear filters',
      'g.duplicate': 'Duplicate as new', 'g.na': 'Not set',

      'wf.status': 'Document status',
      'wf.draft': 'Draft', 'wf.pending': 'Pending review', 'wf.reviewed': 'Reviewed',
      'wf.approved': 'Approved', 'wf.rejected': 'Rejected', 'wf.returned': 'Returned for edit', 'wf.reversed': 'Reversed',
      'wf.submit': 'Submit for review', 'wf.review': 'Pass to approver', 'wf.approve': 'Approve',
      'wf.reject': 'Reject', 'wf.return': 'Return to originator', 'wf.reverse': 'Reverse document',
      'wf.reason': 'Reason', 'wf.reasonReq': 'A reason is mandatory',
      'wf.noSelfReview': 'You cannot review a document you created (segregation of duties).',
      'wf.noSelfApprove': 'You cannot approve a document you created or reviewed (segregation of duties).',
      'wf.noPerm': 'You do not have permission for this action.',
      'wf.lockedEdit': 'Editing is locked after submission. The document must be returned first.',
      'wf.lockedDelete': 'An approved/posted document cannot be deleted. Use "Reverse document".',
      'wf.submitted': 'Document submitted for review',
      'wf.approvedMsg': 'Document approved and its effect posted',
      'wf.rejectedMsg': 'Document rejected',
      'wf.returnedMsg': 'Document returned to originator',
      'wf.reviewedMsg': 'Reviewed — now waiting for approval',
      'wf.reversedMsg': 'Document reversed by a correcting entry',
      'wf.timeline': 'Approval trail',
      'wf.by': 'by', 'wf.at': 'on',

      'inbox.title': 'Approvals inbox',
      'inbox.sub': 'Documents waiting for an action from you',
      'inbox.empty': 'Nothing waiting for you. Great work!',
      'inbox.toReview': 'Waiting for your review', 'inbox.toApprove': 'Waiting for your approval',
      'inbox.mine': 'My returned documents',

      'dash.title': 'Dashboard', 'dash.sub': 'Company performance at a glance',
      'dash.hello': 'Hello', 'dash.today': 'Today',
      'dash.projects': 'Active projects', 'dash.budget': 'Total budgets',
      'dash.actual': 'Actual cost', 'dash.committed': 'Commitments',
      'dash.pending': 'Documents pending approval', 'dash.receivable': 'Due from customers',
      'dash.payable': 'Due to suppliers', 'dash.stockValue': 'Inventory value',
      'dash.employees': 'Employees', 'dash.equipment': 'Equipment in service',
      'dash.costByType': 'Cost by type', 'dash.budgetVsActual': 'Budget vs actual',
      'dash.recentDocs': 'Latest documents', 'dash.myTasks': 'My tasks',
      'dash.quickActions': 'Quick actions', 'dash.alerts': 'Alerts',
      'dash.overBudget': 'Projects over budget', 'dash.lowStock': 'Items below reorder level',
      'dash.expiring': 'Contracts/licences expiring soon',

      'rep.title': 'Reports', 'rep.sub': 'Filterable, exportable reports',
      'rep.bva': 'Budget vs actual', 'rep.stock': 'Stock balances',
      'rep.ap': 'Supplier ageing', 'rep.ar': 'Customer ageing',
      'rep.tb': 'Trial balance', 'rep.projCost': 'Detailed project cost',
      'rep.cash': 'Cash & bank movement', 'rep.payroll': 'Payroll summary',
      'rep.attendance': 'Attendance summary', 'rep.subcontract': 'Subcontractor IPCs',
      'rep.run': 'Run report', 'rep.from': 'From date', 'rep.to': 'To date',
      'rep.variance': 'Variance', 'rep.available': 'Available', 'rep.pct': '%',

      'set.title': 'Settings', 'set.sub': 'Company, users and system settings',
      'set.company': 'Company profile', 'set.users': 'Users & permissions',
      'set.roles': 'Roles', 'set.audit': 'Audit log', 'set.data': 'Data & backup',
      'set.about': 'About the system',
      'set.resetQ': 'Reset all data?', 'set.resetWarn': 'Everything you entered will be deleted and the original demo data restored.',
      'set.reset': 'Reset to demo data',
      'set.backupOk': 'Backup downloaded',
      'set.restoreOk': 'Backup restored successfully',
      'set.restoreBad': 'Invalid file',
      'set.auditEmpty': 'Audit log is empty',

      'aud.action': 'Action', 'aud.entity': 'Screen', 'aud.record': 'Record',
      'aud.user': 'User', 'aud.time': 'Time', 'aud.detail': 'Details',
      'aud.create': 'Create', 'aud.update': 'Update', 'aud.delete': 'Delete',
      'aud.login': 'Sign in', 'aud.logout': 'Sign out', 'aud.status': 'Status change',

      'grp.main': 'Main',
      'grp.finance': 'Finance, Procurement & Stores',
      'grp.projects': 'Projects & Technical Office',
      'grp.people': 'HR & Administration',
      'grp.system': 'Reports & System',

      'perm.view': 'View', 'perm.create': 'Create', 'perm.edit': 'Edit',
      'perm.delete': 'Delete', 'perm.review': 'Review', 'perm.approve': 'Approve',
      'perm.none': 'You do not have access to this screen.',

      'unit.pcs': 'pcs', 'unit.ton': 'ton', 'unit.m3': 'm³', 'unit.m2': 'm²',
      'unit.m': 'm', 'unit.kg': 'kg', 'unit.bag': 'bag', 'unit.lump': 'lump sum',
      'unit.day': 'day', 'unit.hour': 'hour', 'unit.ltr': 'litre'
    }
  };

  var lang = 'ar';
  var listeners = [];

  function t(key, fallback) {
    var d = DICT[lang] || DICT.ar;
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    if (DICT.ar[key]) return DICT.ar[key];
    return fallback !== undefined ? fallback : key;
  }

  /* Pick the right side of a {ar:'',en:''} label object */
  function L(obj) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.ar || obj.en || '';
  }

  function setLang(next) {
    lang = (next === 'en') ? 'en' : 'ar';
    try { localStorage.setItem('az_lang', lang); } catch (e) {}
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    applyStatic();
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }

  function getLang() { return lang; }
  function isRTL() { return lang === 'ar'; }
  function onChange(fn) { listeners.push(fn); }

  /* Translate every element carrying data-i18n / data-i18n-ph / data-tip-i18n */
  function applyStatic(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    scope.querySelectorAll('[data-tip-i18n]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-tip-i18n')));
    });
  }

  /* ---------- formatting helpers (always Latin digits for clarity) ---------- */
  function num(v, decimals) {
    var n = Number(v);
    if (!isFinite(n)) n = 0;
    var d = decimals === undefined ? 0 : decimals;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function money(v, withCode) {
    var s = num(v, 2);
    return withCode === false ? s : s + ' ' + t('g.currency');
  }
  function moneyShort(v) {
    var n = Number(v) || 0, a = Math.abs(n);
    var s;
    if (a >= 1e9) s = (n / 1e9).toFixed(2) + 'B';
    else if (a >= 1e6) s = (n / 1e6).toFixed(2) + 'M';
    else if (a >= 1e3) s = (n / 1e3).toFixed(1) + 'K';
    else s = num(n, 0);
    return s + ' ' + t('g.currency');
  }
  function pct(v, d) { return num(v, d === undefined ? 1 : d) + '%'; }

  function date(iso) {
    if (!iso) return '—';
    var dt = new Date(iso);
    if (isNaN(dt)) return String(iso);
    var y = dt.getFullYear(),
        m = String(dt.getMonth() + 1).padStart(2, '0'),
        d = String(dt.getDate()).padStart(2, '0');
    return d + '/' + m + '/' + y;
  }
  function dateTime(iso) {
    if (!iso) return '—';
    var dt = new Date(iso);
    if (isNaN(dt)) return String(iso);
    var hh = String(dt.getHours()).padStart(2, '0'),
        mm = String(dt.getMinutes()).padStart(2, '0');
    return date(iso) + ' ' + hh + ':' + mm;
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem('az_lang'); } catch (e) {}
    setLang(saved || 'ar');
  }

  global.I18N = {
    t: t, L: L, setLang: setLang, getLang: getLang, isRTL: isRTL,
    onChange: onChange, applyStatic: applyStatic, init: init,
    num: num, money: money, moneyShort: moneyShort, pct: pct,
    date: date, dateTime: dateTime, today: today, DICT: DICT
  };
  global.t = t;
  global.L = L;
})(window);
