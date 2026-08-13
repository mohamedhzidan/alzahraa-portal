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

  /* Fields that must never leave the HR department, whatever happens.
     Used by the UI as a second line of defence behind the database rules. */
  var SENSITIVE = {
    employees: ['nationalId', 'basicSalary', 'allowances', 'insuranceNo',
                'bankAccount', 'address', 'phone', 'birthDate'],
    payroll:   ['basicSalary', 'allowances', 'deductions', 'netPay', 'bankAccount'],
    users:     ['password', 'login_email', 'auth_uid']
  };
  /* Roles allowed to read the sensitive fields above. */
  var SENSITIVE_ROLES = ['admin', 'gm', 'hr', 'finance_manager', 'auditor'];

  var ROLES = {

    /* ═══════════════ إدارة النظام والإدارة العليا ═══════════════ */
    admin: {
      label: { ar: 'مسؤول النظام', en: 'System administrator' },
      desc: { ar: 'كل الصلاحيات وإدارة المستخدمين', en: 'Full access and user management' },
      dept: 'system',
      perms: { '*': ALL },
      canManageUsers: true
    },

    gm: {
      label: { ar: 'المدير العام', en: 'General manager' },
      desc: { ar: 'اطلاع كامل واعتماد نهائي لكل المستندات', en: 'Full visibility and final approval on all documents' },
      dept: 'system',
      perms: { '*': ['view', 'review', 'approve'] },
      canManageUsers: false
    },

    auditor: {
      label: { ar: 'مراجع داخلي (قراءة فقط)', en: 'Internal auditor (read-only)' },
      desc: { ar: 'اطلاع كامل بدون أي تعديل', en: 'Full visibility, no changes at all' },
      dept: 'system',
      perms: { '*': ['view'] }
    },

    reviewer: {
      label: { ar: 'مراجع مستندات', en: 'Document reviewer' },
      desc: { ar: 'مراجعة المستندات قبل الاعتماد', en: 'Reviews documents before approval' },
      dept: 'system',
      perms: {
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
        accounts: ALL, journal: ALL, suppliers: ALL, customers: ALL, costItems: ALL,
        supplierInvoices: ALL, payments: ALL, receipts: ALL, cashAccounts: ALL,
        purchaseApprovals: ['view', 'review', 'approve'],
        goodsReceipts: ['view'], items: ['view'], warehouses: ['view'],
        stockIssues: ['view'], stockTransfers: ['view'], stockCounts: ['view'],
        budgets: ['view', 'review', 'approve'],
        clientIPCs: ['view', 'review', 'approve'],
        subIPCs: ['view', 'review', 'approve'],
        payroll: ['view', 'review', 'approve'],
        projects: ['view'], clientContracts: ['view'], subContracts: ['view'],
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
        journal: ['view', 'create', 'edit', 'delete'],
        supplierInvoices: ['view', 'create', 'edit', 'delete'],
        payments: ['view', 'create', 'edit', 'delete'],
        receipts: ['view', 'create', 'edit', 'delete'],
        suppliers: ['view', 'create', 'edit'],
        customers: ['view', 'create', 'edit'],
        accounts: ['view'], costItems: ['view'], cashAccounts: ['view'],
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
        projects: ['view', 'edit'],
        budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'],
        clientContracts: ['view'],
        subIPCs: ['view', 'create', 'edit', 'review'],
        subContracts: ['view', 'create', 'edit'],
        subcontractors: ['view', 'create', 'edit'],
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
        costItems: LOOKUP, items: LOOKUP, warehouses: LOOKUP,
        customers: LOOKUP, employees: LOOKUP, suppliers: LOOKUP
      }
    },

    technical: {
      label: { ar: 'المكتب الفني', en: 'Technical office' },
      desc: { ar: 'الرسومات والموازنات وحصر الكميات والمستخلصات', en: 'Drawings, budgets, quantity surveying and IPCs' },
      dept: 'projects',
      perms: {
        drawings: ['view', 'create', 'edit', 'delete'],
        budgets: ['view', 'create', 'edit'],
        clientIPCs: ['view', 'create', 'edit'],
        subIPCs: ['view', 'create', 'edit'],
        costItems: ['view', 'create', 'edit'],
        surveyRecords: ['view'],
        asphaltRecords: ['view'],
        wir: ['view'],
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
        docRegister: ['view', 'create', 'edit', 'delete'],
        transmittals: ['view', 'create', 'edit', 'delete'],
        rfi: ['view', 'create', 'edit', 'delete'],
        submittals: ['view', 'create', 'edit', 'delete'],
        correspondence: ['view', 'create', 'edit', 'delete'],
        distribution: ['view', 'create', 'edit', 'delete'],
        docArchive: ['view', 'create', 'edit', 'delete'],
        /* يحتاج رؤية الرسومات والعقود لتسجيلها ومتابعة مراجعاتها */
        drawings: ['view', 'create', 'edit'],
        clientContracts: ['view'],
        subContracts: ['view'],
        legalDocs: ['view'],
        projects: ['view'],
        siteInstructions: ['view'],
        ncr: ['view'],
        items: LOOKUP, suppliers: LOOKUP, subcontractors: LOOKUP,
        customers: LOOKUP, employees: LOOKUP, costItems: LOOKUP
      }
    },

    /* ═══════════════ الموارد البشرية والإدارة ═══════════════ */
    hr: {
      label: { ar: 'الموارد البشرية', en: 'Human resources' },
      desc: { ar: 'الموظفون والحضور والإجازات والرواتب', en: 'Employees, attendance, leave and payroll' },
      dept: 'people',
      perms: {
        employees: ['view', 'create', 'edit', 'delete'],
        attendance: ['view', 'create', 'edit', 'delete'],
        leaves: ['view', 'create', 'edit', 'review'],
        payroll: ['view', 'create', 'edit'],
        announcements: ['view', 'create', 'edit', 'delete'],
        labourAllocation: ['view'],
        safetyReports: ['view'],
        legalDocs: ['view'],
        projects: LOOKUP, itAssets: LOOKUP,
        costItems: LOOKUP, equipment: LOOKUP
      }
    },

    legal: {
      label: { ar: 'الشؤون القانونية', en: 'Legal affairs' },
      desc: { ar: 'العقود والتراخيص والقضايا والمطالبات', en: 'Contracts, licences, cases and claims' },
      dept: 'people',
      perms: {
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
        announcements: ['view'],
        leaves: ['view', 'create', 'edit'],
        itTickets: ['view', 'create', 'edit'],
        attendance: ['view'],
        employees: LOOKUP, projects: LOOKUP
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

  function permsFor(moduleId) {
    if (!current) return null;
    var r = ROLES[current.role];
    if (!r) return null;
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
    scopeRows: scopeRows,
    users: users,
    roleLabel: function (key) { return ROLES[key] ? L(ROLES[key].label) : key; }
  };
})(window);
