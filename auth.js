/* =========================================================================
   auth.js — users, roles and permissions
   ---------------------------------------------------------------------
   DEMO SECURITY NOTE: passwords are stored as plain text because everything
   runs inside the visitor's own browser. This is fine for a demo/prototype.
   It is NOT safe for real company data — see GUIDE section
   "Moving to a real database" before putting real information in.
   ========================================================================= */
(function (global) {
  'use strict';

  var SESSION_KEY = 'az_session';

  /* --------------------------------------------------------------------
     ROLES
     Each role maps a module id -> array of allowed actions.
     '*' means every module. Actions: view create edit delete review approve
     -------------------------------------------------------------------- */
  var ALL = ['view', 'create', 'edit', 'delete', 'review', 'approve'];

  var ROLES = {
    admin: {
      label: { ar: 'مسؤول النظام', en: 'System administrator' },
      desc: { ar: 'كل الصلاحيات وإدارة المستخدمين', en: 'Full access and user management' },
      perms: { '*': ALL },
      canManageUsers: true
    },
    gm: {
      label: { ar: 'المدير العام', en: 'General manager' },
      desc: { ar: 'اطلاع كامل واعتماد نهائي لكل المستندات', en: 'Full visibility and final approval on all documents' },
      perms: { '*': ['view', 'approve', 'review'] },
      canManageUsers: false
    },
    finance_manager: {
      label: { ar: 'المدير المالي', en: 'Finance manager' },
      desc: { ar: 'اعتماد المستندات المالية والاطلاع على كل التقارير', en: 'Approves financial documents, sees all reports' },
      perms: {
        '*': ['view'],
        accounts: ALL, journal: ALL, suppliers: ALL, customers: ALL, costItems: ALL,
        supplierInvoices: ALL, payments: ALL, receipts: ALL, cashAccounts: ALL,
        purchaseApprovals: ['view', 'review', 'approve'], budgets: ['view', 'review', 'approve'],
        clientIPCs: ['view', 'review', 'approve'], subIPCs: ['view', 'review', 'approve'],
        payroll: ['view', 'review', 'approve']
      }
    },
    accountant: {
      label: { ar: 'محاسب', en: 'Accountant' },
      desc: { ar: 'إدخال القيود والفواتير والسندات', en: 'Enters journals, invoices and vouchers' },
      perms: {
        accounts: ['view'], costItems: ['view'], projects: ['view'], employees: ['view'],
        journal: ['view', 'create', 'edit', 'delete'],
        suppliers: ['view', 'create', 'edit'], customers: ['view', 'create', 'edit'],
        supplierInvoices: ['view', 'create', 'edit', 'delete'],
        payments: ['view', 'create', 'edit', 'delete'],
        receipts: ['view', 'create', 'edit', 'delete'],
        cashAccounts: ['view'], purchaseApprovals: ['view'], goodsReceipts: ['view'],
        clientIPCs: ['view'], subIPCs: ['view'], subcontractors: ['view'],
        budgets: ['view'], clientContracts: ['view'], subContracts: ['view']
      }
    },
    procurement: {
      label: { ar: 'مسؤول مشتريات', en: 'Procurement officer' },
      desc: { ar: 'إعداد اعتمادات الشراء ومتابعة الموردين', en: 'Prepares purchase approvals, manages suppliers' },
      perms: {
        purchaseApprovals: ['view', 'create', 'edit', 'delete'],
        suppliers: ['view', 'create', 'edit'],
        items: ['view', 'create', 'edit'],
        goodsReceipts: ['view'], supplierInvoices: ['view'],
        projects: ['view'], costItems: ['view'], warehouses: ['view'], budgets: ['view'], employees: ['view']
      }
    },
    storekeeper: {
      label: { ar: 'أمين مخزن', en: 'Storekeeper' },
      desc: { ar: 'الاستلام والصرف والتحويل والجرد', en: 'Receipts, issues, transfers and counts' },
      perms: {
        goodsReceipts: ['view', 'create', 'edit', 'delete'],
        stockIssues: ['view', 'create', 'edit', 'delete'],
        stockTransfers: ['view', 'create', 'edit', 'delete'],
        stockCounts: ['view', 'create', 'edit', 'delete'],
        items: ['view', 'create', 'edit'], warehouses: ['view'],
        purchaseApprovals: ['view'], projects: ['view'], costItems: ['view'],
        suppliers: ['view'], employees: ['view']
      }
    },
    project_manager: {
      label: { ar: 'مدير مشروع', en: 'Project manager' },
      desc: { ar: 'متابعة المشروع وتكلفته ومستخلصاته', en: 'Runs the project: cost, IPCs, site reports' },
      perms: {
        projects: ['view', 'edit'], budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'], clientContracts: ['view'],
        subIPCs: ['view', 'create', 'edit', 'review'], subContracts: ['view', 'create', 'edit'],
        subcontractors: ['view', 'create', 'edit'],
        siteReports: ['view', 'create', 'edit', 'delete'],
        drawings: ['view', 'create', 'edit'],
        equipment: ['view'], equipmentLogs: ['view', 'create', 'edit'],
        purchaseApprovals: ['view', 'create', 'review'],
        stockIssues: ['view', 'review'], goodsReceipts: ['view'],
        items: ['view'], warehouses: ['view'], costItems: ['view'],
        employees: ['view'], attendance: ['view', 'create', 'edit'], customers: ['view']
      }
    },
    technical: {
      label: { ar: 'المكتب الفني', en: 'Technical office' },
      desc: { ar: 'الرسومات والموازنات والمستخلصات', en: 'Drawings, budgets and quantity surveying' },
      perms: {
        drawings: ['view', 'create', 'edit', 'delete'],
        budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'],
        subIPCs: ['view', 'create', 'edit'],
        projects: ['view'], costItems: ['view', 'create', 'edit'],
        clientContracts: ['view'], subContracts: ['view'], subcontractors: ['view'],
        siteReports: ['view'], items: ['view'], employees: ['view']
      }
    },
    hr: {
      label: { ar: 'الموارد البشرية', en: 'Human resources' },
      desc: { ar: 'الموظفون والحضور والإجازات والرواتب', en: 'Employees, attendance, leave and payroll' },
      perms: {
        employees: ['view', 'create', 'edit', 'delete'],
        attendance: ['view', 'create', 'edit', 'delete'],
        leaves: ['view', 'create', 'edit', 'review'],
        payroll: ['view', 'create', 'edit'],
        announcements: ['view', 'create', 'edit', 'delete'],
        legalDocs: ['view'], projects: ['view'], itAssets: ['view']
      }
    },
    legal: {
      label: { ar: 'الشؤون القانونية', en: 'Legal affairs' },
      desc: { ar: 'العقود والتراخيص والقضايا', en: 'Contracts, licences and cases' },
      perms: {
        legalDocs: ['view', 'create', 'edit', 'delete'],
        clientContracts: ['view', 'create', 'edit'],
        subContracts: ['view', 'create', 'edit'],
        projects: ['view'], customers: ['view'], suppliers: ['view'],
        subcontractors: ['view'], employees: ['view']
      }
    },
    it: {
      label: { ar: 'تقنية المعلومات', en: 'IT officer' },
      desc: { ar: 'الأصول التقنية وطلبات الدعم', en: 'IT assets and support tickets' },
      perms: {
        itAssets: ['view', 'create', 'edit', 'delete'],
        itTickets: ['view', 'create', 'edit', 'delete'],
        employees: ['view'], announcements: ['view']
      }
    },
    reviewer: {
      label: { ar: 'مراجع', en: 'Reviewer' },
      desc: { ar: 'مراجعة المستندات قبل الاعتماد', en: 'Reviews documents before approval' },
      perms: { '*': ['view', 'review'] }
    },
    auditor: {
      label: { ar: 'مراجع داخلي (قراءة فقط)', en: 'Internal auditor (read-only)' },
      desc: { ar: 'اطلاع كامل بدون أي تعديل', en: 'Full visibility, no changes at all' },
      perms: { '*': ['view'] }
    },
    employee: {
      label: { ar: 'موظف', en: 'Employee' },
      desc: { ar: 'الاطلاع على التعميمات وتقديم الطلبات', en: 'Reads announcements, submits requests' },
      perms: {
        announcements: ['view'],
        leaves: ['view', 'create', 'edit'],
        itTickets: ['view', 'create', 'edit'],
        attendance: ['view'],
        employees: ['view']
      }
    }
  };

  var current = null;

  /* --------------------------------------------------------------------
     Users table is seeded in seed.js
     -------------------------------------------------------------------- */
  function users() { return Store.all('users'); }

  function login(username, password) {
    var list = users();

    /* SELF-HEAL: if the users table is empty the demo data never ran
       (first visit, cleared storage, or a failed load). Rebuild it and retry. */
    if (!list.length && global.Seed && typeof Seed.run === 'function') {
      try { Seed.run(true); } catch (e) { console.error('reseed failed', e); }
      list = users();
    }
    if (!list.length) return { ok: false, error: 'nostorage' };

    /* phone keyboards love adding spaces and capitals — forgive both */
    var user = String(username || '').trim().toLowerCase();
    var pass = String(password || '').trim();

    for (var i = 0; i < list.length; i++) {
      var u = list[i];
      /* You can sign in with EITHER your username OR your company email.
         Both point at the same account, so switching to email later
         changes nothing about your documents or history. */
      var identities = [
        String(u.username || '').toLowerCase(),
        String(u.email || '').toLowerCase()
      ].filter(Boolean);
      if (identities.indexOf(user) !== -1) {
        if (u.status === 'inactive') return { ok: false, error: 'disabled' };
        if (String(u.password) !== pass) {
          Store.log('login_failed', 'users', u.id, u.username);
          return { ok: false, error: 'bad' };
        }
        current = u;
        try { sessionStorage.setItem(SESSION_KEY, u.id); } catch (e) {}
        Store.log('login', 'users', u.id, u.name);
        return { ok: true, user: u };
      }
    }
    return { ok: false, error: 'bad' };
  }

  function logout() {
    if (current) Store.log('logout', 'users', current.id, current.name);
    current = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function restore() {
    var id = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    if (!id) return null;
    var u = Store.find('users', id);
    if (u && u.status !== 'inactive') { current = u; return u; }
    return null;
  }

  function role(user) {
    var u = user || current;
    return (u && ROLES[u.role]) || null;
  }

  /* Can the current user perform `action` on module `moduleId`? */
  function can(moduleId, action) {
    if (!current) return false;
    var r = ROLES[current.role];
    if (!r) return false;

    /* per-user overrides win over the role */
    if (current.overrides && current.overrides[moduleId]) {
      return current.overrides[moduleId].indexOf(action) !== -1;
    }
    var p = r.perms;
    if (p[moduleId]) return p[moduleId].indexOf(action) !== -1;
    if (p['*']) return p['*'].indexOf(action) !== -1;
    return false;
  }

  function canSee(moduleId) { return can(moduleId, 'view'); }
  function isAdmin() { return !!(current && ROLES[current.role] && ROLES[current.role].canManageUsers); }

  /* Restrict a list of rows to the projects the user is allowed to see.
     An empty `projects` array on the user means "all projects". */
  function scopeRows(moduleId, rows) {
    if (!current || !current.projects || !current.projects.length) return rows;
    var mod = Schema.get(moduleId);
    if (!mod) return rows;
    var hasProject = mod.fields.some(function (f) { return f.name === 'project'; });
    if (!hasProject) return rows;
    var allowed = current.projects;
    return rows.filter(function (r) { return !r.project || allowed.indexOf(r.project) !== -1; });
  }

  global.Auth = {
    ROLES: ROLES,
    login: login, logout: logout, restore: restore,
    current: function () { return current; },
    role: role, can: can, canSee: canSee, isAdmin: isAdmin,
    scopeRows: scopeRows,
    users: users,
    roleLabel: function (key) { return ROLES[key] ? L(ROLES[key].label) : key; }
  };
})(window);
