/* Production authentication, users, roles and permissions.
   Passwords are handled by Supabase Auth and never stored in portal records. */
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
    if (client && navigator.onLine !== false) {
      var res = await client.from('users').select('*').eq('auth_uid', authUid).maybeSingle();
      if (!res.error) profile = res.data;
    }
    if (!profile && allowOffline && global.OfflineDB) profile = await OfflineDB.loadProfile(authUid);
    if (!profile) return null;
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
    if (!profile || profile.disabled) return null;
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
    init: init, login: login, logout: logout, restore: restore,
    client: function () { return client; },
    isConfigured: function () { return !!client; },
    updatePassword: updatePassword,
    adminUsers: adminUsers,
    current: function () { return current; },
    role: role, can: can, canSee: canSee, isAdmin: isAdmin,
    scopeRows: scopeRows,
    users: users,
    roleLabel: function (key) { return ROLES[key] ? L(ROLES[key].label) : key; }
  };
})(window);
