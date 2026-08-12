/* =========================================================================
   roleview.js — ماذا يرى كل دور بالضبط
                 Exactly what each role is allowed to see
   -------------------------------------------------------------------------
   🔴 القاعدة الأهم في هذا الملف:
      أرقام الشركة الإجمالية (الموازنات · المستحقات · قيمة المخزون كاملة)
      لا تظهر إلا لمن في قائمة MONEY_ROLES.
      كل موظف آخر يرى أرقام عمله هو فقط.

   🔴 The most important rule here:
      Company-wide money (total budgets, all receivables, all payables,
      full inventory value) appears ONLY for roles listed in MONEY_ROLES.
      Everyone else sees only the numbers of their own work.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     من يرى أموال الشركة كاملة / who sees company-wide money
     احذف أو أضف دوراً هنا لتغيير ذلك فوراً في كل الشاشات.
     ═══════════════════════════════════════════════════════════════════ */
  var MONEY_ROLES = ['admin', 'gm', 'finance_manager'];

  /* من يرى تكلفة مشروع كاملة (مشروعاته هو فقط) */
  var PROJECT_MONEY_ROLES = ['admin', 'gm', 'finance_manager', 'project_manager', 'technical', 'auditor'];

  /* المراجع الداخلي يرى كل شيء للقراءة — أضفه للمال لو أردت */
  var AUDIT_SEES_MONEY = false;

  function role() { var u = Auth.current(); return u ? u.role : null; }

  function seesCompanyMoney() {
    var r = role();
    if (!r) return false;
    if (r === 'auditor') return AUDIT_SEES_MONEY;
    return MONEY_ROLES.indexOf(r) !== -1;
  }
  function seesProjectMoney() {
    var r = role();
    return r && PROJECT_MONEY_ROLES.indexOf(r) !== -1;
  }

  /* المشروعات التي تخص هذا المستخدم */
  function myProjects() {
    var u = Auth.current();
    var all = Store.all('projects').filter(function (p) { return p.status === 'active'; });
    if (!u) return [];
    if (u.projects && u.projects.length) {
      return all.filter(function (p) { return u.projects.indexOf(p.id) !== -1; });
    }
    /* مدير المشروع ومهندس الموقع: المشروعات التي هو مديرها فقط.
       لو لم يُربط بموظف، لا يرى أي مشروع — وهذا مقصود حتى لا تتسرب أرقام. */
    if (['project_manager'].indexOf(u.role) !== -1) {
      if (!u.employeeId) return [];
      return all.filter(function (p) { return p.manager === u.employeeId; });
    }
    return all;
  }

  /* سجلات أنشأها هذا المستخدم */
  function myDocs(table, limit) {
    var u = Auth.current();
    if (!u) return [];
    return Store.all(table)
      .filter(function (r) { return r.createdBy === u.id; })
      .sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); })
      .slice(0, limit || 50);
  }

  function countMine(table, status) {
    var u = Auth.current();
    if (!u) return 0;
    return Store.all(table).filter(function (r) {
      if (r.createdBy !== u.id) return false;
      return status ? r.status === status : true;
    }).length;
  }

  /* ------------------------------------------------------------------
     تعريف لوحة كل دور
     kpis: دوال تُرجع بطاقة مؤشر · panels: أقسام إضافية
     ------------------------------------------------------------------ */
  var A = function () { return Dashboard.analytics; };

  function kpiPendingMine() {
    var n = 0;
    Schema.MODULES.filter(function (m) { return m.workflow; }).forEach(function (m) {
      n += Store.all(m.table).filter(function (r) {
        var u = Auth.current();
        return u && r.createdBy === u.id && ['pending', 'reviewed'].indexOf(r.status) !== -1;
      }).length;
    });
    return UI.kpi({ label: L({ ar: 'مستنداتي قيد الاعتماد', en: 'My documents in approval' }),
                    value: '<span class="num">' + n + '</span>', icon: 'file', tone: 'info' });
  }
  function kpiInbox() {
    var n = Workflow.inboxCount();
    return UI.kpi({ label: L({ ar: 'ينتظر إجراءً منك', en: 'Waiting for you' }),
                    value: '<span class="num">' + n + '</span>', icon: 'inbox', tone: n ? 'danger' : '' });
  }
  function kpiAlerts() {
    var n = 0; try { n = Alerts.count(); } catch (e) {}
    return UI.kpi({ label: L({ ar: 'تنبيهات تخصّك', en: 'Alerts for you' }),
                    value: '<span class="num">' + n + '</span>', icon: 'alert', tone: n ? 'warn' : '' });
  }
  function kpiMyProjects() {
    return UI.kpi({ label: L({ ar: 'مشروعاتي', en: 'My projects' }),
                    value: '<span class="num">' + myProjects().length + '</span>', icon: 'building' });
  }

  var VIEWS = {

    /* ─── الإدارة العليا: كل شيء ─────────────────────────────────── */
    gm: {
      title: { ar: 'نظرة الإدارة العامة', en: 'Executive overview' },
      money: true,
      kpis: ['projects', 'budget', 'actual', 'committed', 'receivable', 'payable', 'stockValue', 'inbox'],
      panels: ['alerts', 'projectTable', 'charts', 'recentDocs']
    },
    admin: {
      title: { ar: 'نظرة عامة على النظام', en: 'System overview' },
      money: true,
      kpis: ['projects', 'budget', 'actual', 'receivable', 'payable', 'stockValue', 'users', 'inbox'],
      panels: ['alerts', 'projectTable', 'charts', 'recentDocs', 'quickActions']
    },
    finance_manager: {
      title: { ar: 'اللوحة المالية', en: 'Finance overview' },
      money: true,
      kpis: ['receivable', 'payable', 'cash', 'overdueInvoices', 'budget', 'actual', 'inbox', 'alerts'],
      panels: ['alerts', 'cashTable', 'projectTable', 'charts', 'recentDocs']
    },
    auditor: {
      title: { ar: 'لوحة المراجعة الداخلية', en: 'Internal audit overview' },
      money: false,
      kpis: ['projects', 'pendingAll', 'reversedDocs', 'alerts'],
      panels: ['alerts', 'auditFeed', 'recentDocs']
    },

    /* ─── المحاسب: فواتير وسندات — لا أرباح ولا موازنات شركة ────── */
    accountant: {
      title: { ar: 'لوحة الحسابات', en: 'Accounting desk' },
      money: false,
      kpis: ['invoicesToPay', 'overdueInvoices', 'cashMine', 'myDrafts', 'inbox', 'alerts'],
      panels: ['alerts', 'myWork', 'dueInvoices', 'quickActions']
    },

    /* ─── المشتريات: طلباتي وأسعار ومورّدون ─────────────────────── */
    procurement: {
      title: { ar: 'لوحة المشتريات', en: 'Procurement desk' },
      money: false,
      kpis: ['myPAsPending', 'myPAsApproved', 'lowStockCount', 'suppliersCount', 'inbox', 'alerts'],
      panels: ['alerts', 'myWork', 'lowStock', 'quickActions']
    },

    /* ─── أمين المخزن: مخزون وحركة — بلا أي أرقام مالية للشركة ──── */
    storekeeper: {
      title: { ar: 'لوحة المخزن', en: 'Warehouse desk' },
      money: false,
      kpis: ['lowStockCount', 'receiptsToday', 'issuesToday', 'stocktakeDue', 'inbox', 'alerts'],
      panels: ['alerts', 'lowStock', 'myWork', 'quickActions']
    },

    /* ─── مدير المشروع: مشروعاته فقط ─────────────────────────────── */
    project_manager: {
      title: { ar: 'لوحة مشروعاتي', en: 'My projects' },
      money: false,
      kpis: ['myProjects', 'myBudget', 'myActual', 'myVariance', 'inbox', 'alerts'],
      panels: ['alerts', 'myProjectTable', 'myWork', 'quickActions']
    },

    /* ─── المكتب الفني ───────────────────────────────────────────── */
    technical: {
      title: { ar: 'لوحة المكتب الفني', en: 'Technical office' },
      money: false,
      kpis: ['myProjects', 'drawingsPending', 'ipcsDraft', 'budgetsCount', 'inbox', 'alerts'],
      panels: ['alerts', 'myProjectTable', 'myWork', 'quickActions']
    },

    /* ─── الموارد البشرية: بشر لا فلوس شركة ─────────────────────── */
    hr: {
      title: { ar: 'لوحة الموارد البشرية', en: 'HR desk' },
      money: false,
      kpis: ['headcount', 'presentToday', 'leavesPending', 'contractsEnding', 'inbox', 'alerts'],
      panels: ['alerts', 'leavesTable', 'myWork', 'quickActions']
    },

    legal: {
      title: { ar: 'لوحة الشؤون القانونية', en: 'Legal desk' },
      money: false,
      kpis: ['docsExpiring', 'contractsActive', 'casesOpen', 'alerts'],
      panels: ['alerts', 'expiringTable', 'myWork']
    },

    it: {
      title: { ar: 'لوحة تقنية المعلومات', en: 'IT desk' },
      money: false,
      kpis: ['ticketsOpen', 'ticketsUrgent', 'assetsCount', 'alerts'],
      panels: ['alerts', 'ticketsTable', 'myWork', 'quickActions']
    },

    reviewer: {
      title: { ar: 'لوحة المراجعة', en: 'Reviewer desk' },
      money: false,
      kpis: ['inbox', 'pendingAll', 'alerts'],
      panels: ['alerts', 'recentDocs']
    },

    /* ─── الموظف العادي: شخصي بحت ───────────────────────────────── */
    employee: {
      title: { ar: 'صفحتي', en: 'My page' },
      money: false,
      kpis: ['myLeaves', 'myTickets', 'announcementsNew'],
      panels: ['announcements', 'myWork', 'quickActions']
    }
  };

  function viewFor() {
    return VIEWS[role()] || VIEWS.employee;
  }

  global.RoleView = {
    MONEY_ROLES: MONEY_ROLES,
    PROJECT_MONEY_ROLES: PROJECT_MONEY_ROLES,
    VIEWS: VIEWS,
    viewFor: viewFor,
    seesCompanyMoney: seesCompanyMoney,
    seesProjectMoney: seesProjectMoney,
    myProjects: myProjects,
    myDocs: myDocs,
    countMine: countMine,
    kpiInbox: kpiInbox,
    kpiAlerts: kpiAlerts,
    kpiPendingMine: kpiPendingMine,
    kpiMyProjects: kpiMyProjects
  };
})(window);
