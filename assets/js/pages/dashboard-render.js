/* =========================================================================
   pages/dashboard-render.js — لوحة تحكم مخصّصة لكل دور
                                Role-tailored dashboard
   -------------------------------------------------------------------------
   يبني اللوحة من تعريف الدور في roleview.js.
   أمين المخزن لا يرى أموال الشركة. مدير المشروع يرى مشروعاته فقط.
   ========================================================================= */
(function (global) {
  'use strict';

  function A() { return Dashboard.analytics; }
  function RV() { return global.RoleView; }
  function money(v) { return I18N.moneyShort(v); }
  function todayStr() { return I18N.today(); }

  /* ══════════════════ KPI builders ══════════════════ */
  var K = {};

  /* ---- company-wide (restricted) ---- */
  K.projects = function () {
    var all = Store.all('projects');
    var act = all.filter(function (p) { return p.status === 'active'; });
    return UI.kpi({ label: t('dash.projects'), value: '<span class="num">' + act.length + '</span>',
      icon: 'building', foot: '<span class="muted">' + L({ ar: 'من إجمالي ', en: 'of ' }) + all.length + '</span>' });
  };
  K.budget = function () {
    var s = 0; Store.all('projects').forEach(function (p) { if (p.status === 'active') s += A().budgetOf(p.id); });
    return UI.kpi({ label: t('dash.budget'), value: money(s), icon: 'target', tone: 'info' });
  };
  K.actual = function () {
    var b = 0, a = 0;
    Store.all('projects').forEach(function (p) {
      if (p.status !== 'active') return;
      b += A().budgetOf(p.id); a += A().actualCost(p.id);
    });
    return UI.kpi({ label: t('dash.actual'), value: money(a), icon: 'chart',
      tone: b && a > b ? 'danger' : 'gold',
      foot: b ? '<span class="' + (a > b ? 'neg' : 'pos') + '">' + I18N.pct(a / b * 100, 1) + '</span> <span class="muted">' + t('dash.budget') + '</span>' : '' });
  };
  K.committed = function () {
    var s = 0; Store.all('projects').forEach(function (p) { if (p.status === 'active') s += A().committed(p.id); });
    return UI.kpi({ label: t('dash.committed'), value: money(s), icon: 'cart', tone: 'purple' });
  };
  K.receivable = function () {
    return UI.kpi({ label: t('dash.receivable'), value: money(A().receivable()), icon: 'arrow-down', tone: 'info' });
  };
  K.payable = function () {
    return UI.kpi({ label: t('dash.payable'), value: money(A().payable()), icon: 'arrow-up', tone: 'warn' });
  };
  K.stockValue = function () {
    return UI.kpi({ label: t('dash.stockValue'), value: money(A().stockValue()), icon: 'box' });
  };
  K.cash = function () {
    var s = 0; Store.all('cashAccounts').forEach(function (c) { s += A().cashBalance(c.id); });
    return UI.kpi({ label: L({ ar: 'رصيد الخزائن والبنوك', en: 'Cash & bank balance' }), value: money(s),
      icon: 'wallet', tone: s < 0 ? 'danger' : '' });
  };
  K.users = function () {
    return UI.kpi({ label: L({ ar: 'مستخدمو النظام', en: 'Portal users' }),
      value: '<span class="num">' + Auth.users().filter(function (u) { return u.status !== 'inactive'; }).length + '</span>',
      icon: 'users' });
  };

  /* ---- personal / departmental (safe for everyone) ---- */
  K.inbox = function () { return RV().kpiInbox(); };
  K.alerts = function () { return RV().kpiAlerts(); };
  K.myProjects = function () { return RV().kpiMyProjects(); };
  K.myDrafts = function () {
    var n = 0;
    Schema.MODULES.filter(function (m) { return m.workflow && Auth.canSee(m.id); }).forEach(function (m) {
      n += RV().countMine(m.table, 'draft');
    });
    return UI.kpi({ label: L({ ar: 'مسوداتي غير المرسلة', en: 'My unsent drafts' }),
      value: '<span class="num">' + n + '</span>', icon: 'edit', tone: n ? 'warn' : '' });
  };
  K.pendingAll = function () {
    var n = 0;
    Schema.MODULES.filter(function (m) { return m.workflow && Auth.canSee(m.id); }).forEach(function (m) {
      n += Store.all(m.table).filter(function (r) { return ['pending', 'reviewed'].indexOf(r.status) !== -1; }).length;
    });
    return UI.kpi({ label: L({ ar: 'مستندات قيد الاعتماد', en: 'Documents in approval' }),
      value: '<span class="num">' + n + '</span>', icon: 'file', tone: 'info' });
  };
  K.reversedDocs = function () {
    var n = 0;
    Schema.MODULES.filter(function (m) { return m.workflow; }).forEach(function (m) {
      n += Store.all(m.table).filter(function (r) { return r.status === 'reversed'; }).length;
    });
    return UI.kpi({ label: L({ ar: 'مستندات معكوسة', en: 'Reversed documents' }),
      value: '<span class="num">' + n + '</span>', icon: 'shuffle', tone: n ? 'warn' : '' });
  };

  /* accountant */
  K.invoicesToPay = function () {
    var n = 0, s = 0;
    A().approved('supplierInvoices').forEach(function (i) {
      var d = (Number(i.grandTotal) || 0) - (Number(i.paidAmount) || 0);
      if (d > 0.5) { n++; s += d; }
    });
    return UI.kpi({ label: L({ ar: 'فواتير لم تُسدَّد', en: 'Unpaid invoices' }),
      value: '<span class="num">' + n + '</span>', icon: 'file',
      foot: '<span class="muted money">' + I18N.money(s) + '</span>' });
  };
  K.overdueInvoices = function () {
    var n = 0;
    A().approved('supplierInvoices').forEach(function (i) {
      var d = (Number(i.grandTotal) || 0) - (Number(i.paidAmount) || 0);
      if (d > 0.5 && i.dueDate && new Date(i.dueDate) < new Date()) n++;
    });
    return UI.kpi({ label: L({ ar: 'فواتير متأخرة', en: 'Overdue invoices' }),
      value: '<span class="num">' + n + '</span>', icon: 'alert', tone: n ? 'danger' : '' });
  };
  K.cashMine = function () {
    var n = Store.all('cashAccounts').filter(function (c) { return c.status !== 'inactive'; }).length;
    return UI.kpi({ label: L({ ar: 'الخزائن والبنوك', en: 'Cash & bank accounts' }),
      value: '<span class="num">' + n + '</span>', icon: 'wallet' });
  };

  /* procurement */
  K.myPAsPending = function () {
    return UI.kpi({ label: L({ ar: 'طلبات شرائي قيد الاعتماد', en: 'My purchase requests pending' }),
      value: '<span class="num">' + (RV().countMine('purchaseApprovals', 'pending') + RV().countMine('purchaseApprovals', 'reviewed')) + '</span>',
      icon: 'cart', tone: 'info' });
  };
  K.myPAsApproved = function () {
    return UI.kpi({ label: L({ ar: 'طلبات شرائي المعتمدة', en: 'My approved requests' }),
      value: '<span class="num">' + RV().countMine('purchaseApprovals', 'approved') + '</span>', icon: 'check' });
  };
  K.suppliersCount = function () {
    return UI.kpi({ label: L({ ar: 'الموردون النشطون', en: 'Active suppliers' }),
      value: '<span class="num">' + Store.all('suppliers').filter(function (s) { return s.status !== 'inactive'; }).length + '</span>',
      icon: 'truck' });
  };

  /* stores */
  function lowStockList() {
    return Store.all('items').filter(function (it) {
      var lvl = Number(it.reorderLevel) || 0;
      if (!lvl) return false;
      try { return A().stockQty(it.id) < lvl; } catch (e) { return false; }
    });
  }
  K.lowStockCount = function () {
    var n = lowStockList().length;
    return UI.kpi({ label: L({ ar: 'أصناف تحت حد الطلب', en: 'Items below reorder level' }),
      value: '<span class="num">' + n + '</span>', icon: 'box', tone: n ? 'danger' : '' });
  };
  K.receiptsToday = function () {
    var n = Store.all('goodsReceipts').filter(function (r) { return r.date === todayStr(); }).length;
    return UI.kpi({ label: L({ ar: 'استلامات اليوم', en: 'Receipts today' }),
      value: '<span class="num">' + n + '</span>', icon: 'inbox' });
  };
  K.issuesToday = function () {
    var n = Store.all('stockIssues').filter(function (r) { return r.date === todayStr(); }).length;
    return UI.kpi({ label: L({ ar: 'صرف اليوم', en: 'Issues today' }),
      value: '<span class="num">' + n + '</span>', icon: 'send' });
  };
  K.stocktakeDue = function () {
    var n = 0;
    Store.all('warehouses').forEach(function (w) {
      if (w.status === 'inactive') return;
      var last = null;
      A().approved('stockCounts').forEach(function (sc) {
        if (sc.warehouse === w.id && (!last || new Date(sc.date) > new Date(last))) last = sc.date;
      });
      var days = last ? Math.round((new Date() - new Date(last)) / 86400000) : 999;
      if (days >= 30) n++;
    });
    return UI.kpi({ label: L({ ar: 'مخازن تحتاج جرداً', en: 'Warehouses needing a count' }),
      value: '<span class="num">' + n + '</span>', icon: 'clipboard', tone: n ? 'warn' : '' });
  };

  /* project manager — only their own projects */
  function myBudgetActual() {
    var b = 0, a = 0;
    RV().myProjects().forEach(function (p) { b += A().budgetOf(p.id); a += A().actualCost(p.id); });
    return { b: b, a: a };
  }
  K.myBudget = function () {
    return UI.kpi({ label: L({ ar: 'موازنة مشروعاتي وحدها', en: 'My projects budget only' }),
      value: money(myBudgetActual().b), icon: 'target', tone: 'info' });
  };
  K.myActual = function () {
    var x = myBudgetActual();
    return UI.kpi({ label: L({ ar: 'تكلفة مشروعاتي', en: 'My projects cost' }), value: money(x.a),
      icon: 'chart', tone: x.b && x.a > x.b ? 'danger' : 'gold',
      foot: x.b ? '<span class="' + (x.a > x.b ? 'neg' : 'pos') + '">' + I18N.pct(x.a / x.b * 100, 1) + '</span>' : '' });
  };
  K.myVariance = function () {
    var x = myBudgetActual(), v = x.b - x.a;
    return UI.kpi({ label: L({ ar: 'المتاح من موازنتي', en: 'Budget remaining' }), value: money(v),
      icon: 'wallet', tone: v < 0 ? 'danger' : '' });
  };

  /* technical */
  K.drawingsPending = function () {
    var n = Store.all('drawings').filter(function (d) { return ['ifr', 'ifa'].indexOf(d.drawingStatus) !== -1; }).length;
    return UI.kpi({ label: L({ ar: 'رسومات تنتظر الاعتماد', en: 'Drawings awaiting approval' }),
      value: '<span class="num">' + n + '</span>', icon: 'compass', tone: n ? 'warn' : '' });
  };
  K.ipcsDraft = function () {
    var n = Store.all('clientIPCs').filter(function (r) { return ['draft', 'returned'].indexOf(r.status) !== -1; }).length;
    return UI.kpi({ label: L({ ar: 'مستخلصات تحت الإعداد', en: 'IPCs in preparation' }),
      value: '<span class="num">' + n + '</span>', icon: 'receipt' });
  };
  K.budgetsCount = function () {
    return UI.kpi({ label: L({ ar: 'موازنات معتمدة', en: 'Approved budgets' }),
      value: '<span class="num">' + A().approved('budgets').length + '</span>', icon: 'target' });
  };

  /* HR */
  K.headcount = function () {
    return UI.kpi({ label: L({ ar: 'الموظفون على رأس العمل', en: 'Active employees' }),
      value: '<span class="num">' + Store.all('employees').filter(function (e) { return e.status === 'active'; }).length + '</span>',
      icon: 'users' });
  };
  K.presentToday = function () {
    var n = Store.all('attendance').filter(function (a) { return a.date === todayStr() && a.attStatus === 'present'; }).length;
    return UI.kpi({ label: L({ ar: 'حضور اليوم', en: 'Present today' }),
      value: '<span class="num">' + n + '</span>', icon: 'clock' });
  };
  K.leavesPending = function () {
    var n = Store.all('leaves').filter(function (l) { return ['pending', 'reviewed'].indexOf(l.status) !== -1; }).length;
    return UI.kpi({ label: L({ ar: 'إجازات تنتظر البت', en: 'Leave requests pending' }),
      value: '<span class="num">' + n + '</span>', icon: 'calendar', tone: n ? 'warn' : '' });
  };
  K.contractsEnding = function () {
    var soon = new Date(); soon.setDate(soon.getDate() + 30);
    var n = Store.all('employees').filter(function (e) {
      return e.status === 'active' && e.contractEnd && new Date(e.contractEnd) <= soon;
    }).length;
    return UI.kpi({ label: L({ ar: 'عقود تنتهي خلال شهر', en: 'Contracts ending in 30 days' }),
      value: '<span class="num">' + n + '</span>', icon: 'user', tone: n ? 'danger' : '' });
  };

  /* legal */
  K.docsExpiring = function () {
    var soon = new Date(); soon.setDate(soon.getDate() + 60);
    var n = Store.all('legalDocs').filter(function (d) {
      return d.expiryDate && new Date(d.expiryDate) <= soon && d.legalStatus !== 'closed';
    }).length;
    return UI.kpi({ label: L({ ar: 'مستندات تنتهي قريباً', en: 'Documents expiring soon' }),
      value: '<span class="num">' + n + '</span>', icon: 'scale', tone: n ? 'danger' : '' });
  };
  K.contractsActive = function () {
    return UI.kpi({ label: L({ ar: 'عقود سارية', en: 'Active contracts' }),
      value: '<span class="num">' + Store.all('clientContracts').filter(function (c) { return c.status === 'active'; }).length + '</span>',
      icon: 'file-signature' });
  };
  K.casesOpen = function () {
    return UI.kpi({ label: L({ ar: 'قضايا جارية', en: 'Ongoing cases' }),
      value: '<span class="num">' + Store.all('legalDocs').filter(function (d) { return d.legalStatus === 'ongoing'; }).length + '</span>',
      icon: 'scale' });
  };

  /* IT */
  K.ticketsOpen = function () {
    var n = Store.all('itTickets').filter(function (x) { return ['open', 'inprogress'].indexOf(x.ticketStatus) !== -1; }).length;
    return UI.kpi({ label: L({ ar: 'طلبات دعم مفتوحة', en: 'Open tickets' }),
      value: '<span class="num">' + n + '</span>', icon: 'life-buoy', tone: n ? 'warn' : '' });
  };
  K.ticketsUrgent = function () {
    var n = Store.all('itTickets').filter(function (x) {
      return ['open', 'inprogress'].indexOf(x.ticketStatus) !== -1 && x.priority === 'urgent';
    }).length;
    return UI.kpi({ label: L({ ar: 'طلبات عاجلة', en: 'Urgent tickets' }),
      value: '<span class="num">' + n + '</span>', icon: 'alert', tone: n ? 'danger' : '' });
  };
  K.assetsCount = function () {
    return UI.kpi({ label: L({ ar: 'أصول تقنية', en: 'IT assets' }),
      value: '<span class="num">' + Store.all('itAssets').length + '</span>', icon: 'monitor' });
  };

  /* employee */
  K.myLeaves = function () {
    return UI.kpi({ label: L({ ar: 'طلبات إجازتي', en: 'My leave requests' }),
      value: '<span class="num">' + RV().countMine('leaves') + '</span>', icon: 'calendar' });
  };
  K.myTickets = function () {
    return UI.kpi({ label: L({ ar: 'طلبات الدعم الخاصة بي', en: 'My support tickets' }),
      value: '<span class="num">' + RV().countMine('itTickets') + '</span>', icon: 'life-buoy' });
  };
  K.announcementsNew = function () {
    var wk = new Date(); wk.setDate(wk.getDate() - 14);
    var n = Store.all('announcements').filter(function (a) { return new Date(a.date) >= wk; }).length;
    return UI.kpi({ label: L({ ar: 'تعميمات حديثة', en: 'Recent announcements' }),
      value: '<span class="num">' + n + '</span>', icon: 'megaphone', tone: n ? 'info' : '' });
  };

  /* ══════════════════ Panels ══════════════════ */
  var P = {};

  P.alerts = function () {
    var n = 0; try { Alerts.invalidate(); n = Alerts.count(); } catch (e) { return ''; }
    if (!n) return '';
    return '<div class="card mb-2"><div class="card-head">' +
      '<h3 class="card-title">' + UI.icon('alert', 17) + ' ' + t('dash.alerts') + '</h3>' +
      '<span class="badge b-rejected plain num">' + n + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-go="alerts" style="margin-inline-start:auto">' +
      L({ ar: 'عرض الكل', en: 'View all' }) + ' →</button></div>' +
      '<div class="card-body flush">' + Alerts.dashboardHTML(5) + '</div></div>';
  };

  function projectTable(list, title, withMoney) {
    if (!list.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('building', 17) + ' ' + UI.esc(title) + '</h3>' +
      '<button class="btn btn-ghost btn-sm" data-go="projects" style="margin-inline-start:auto">' +
      L({ ar: 'عرض الكل', en: 'View all' }) + ' →</button></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + L({ ar: 'المشروع', en: 'Project' }) + '</th>' +
      (withMoney ? '<th class="no-sort">' + L({ ar: 'الموازنة', en: 'Budget' }) + '</th>' +
                   '<th class="no-sort">' + L({ ar: 'المنصرف', en: 'Spent' }) + '</th>' +
                   '<th class="no-sort">' + L({ ar: 'المتاح', en: 'Remaining' }) + '</th>' : '') +
      '<th class="no-sort">' + L({ ar: 'الإنجاز', en: 'Progress' }) + '</th></tr></thead><tbody>';
    list.forEach(function (p) {
      var b = withMoney ? A().budgetOf(p.id) : 0, a = withMoney ? A().actualCost(p.id) : 0;
      h += '<tr class="clickable" data-proj="' + UI.attr(p.id) + '">' +
        '<td><strong>' + UI.esc(p.name) + '</strong><br><small class="muted num">' + UI.esc(p.code) + '</small></td>' +
        (withMoney ? '<td class="money">' + I18N.money(b) + '</td>' +
                     '<td class="money">' + I18N.money(a) + '</td>' +
                     '<td class="money ' + (b - a < 0 ? 'neg' : 'pos') + '">' + I18N.money(b - a) + '</td>' : '') +
        '<td style="min-width:110px">' + UI.progress(p.progress) +
        '<small class="num muted">' + I18N.pct(p.progress || 0, 0) + '</small></td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  }

  P.projectTable = function () {
    return projectTable(Store.all('projects').filter(function (p) { return p.status === 'active'; }),
      L({ ar: 'حالة المشروعات', en: 'Project status' }), RV().seesCompanyMoney());
  };
  P.myProjectTable = function () {
    return projectTable(RV().myProjects(), L({ ar: 'مشروعاتي', en: 'My projects' }), RV().seesProjectMoney());
  };

  P.lowStock = function () {
    var list = lowStockList();
    if (!list.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('box', 17) + ' ' + L({ ar: 'أصناف تحتاج طلب', en: 'Items to reorder' }) + '</h3>' +
      '<span class="badge b-rejected plain num">' + list.length + '</span></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + L({ ar: 'الصنف', en: 'Item' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'الرصيد', en: 'Balance' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'حد الطلب', en: 'Reorder at' }) + '</th></tr></thead><tbody>';
    list.slice(0, 8).forEach(function (it) {
      var q = A().stockQty(it.id);
      h += '<tr class="clickable" data-open="items" data-rid="' + UI.attr(it.id) + '">' +
        '<td><strong>' + UI.esc(it.name) + '</strong></td>' +
        '<td class="num ' + (q <= 0 ? 'neg' : '') + '">' + I18N.num(q, 1) + '</td>' +
        '<td class="num muted">' + I18N.num(it.reorderLevel, 0) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.dueInvoices = function () {
    var rows = [];
    A().approved('supplierInvoices').forEach(function (i) {
      var d = (Number(i.grandTotal) || 0) - (Number(i.paidAmount) || 0);
      if (d > 0.5) rows.push({ inv: i, due: d });
    });
    rows.sort(function (a, b) { return new Date(a.inv.dueDate || '2099') - new Date(b.inv.dueDate || '2099'); });
    if (!rows.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('file', 17) + ' ' + L({ ar: 'فواتير مستحقة السداد', en: 'Invoices due' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + t('g.docNo') + '</th>' +
      '<th class="no-sort">' + L({ ar: 'المورد', en: 'Supplier' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'المستحق', en: 'Due' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'تاريخ الاستحقاق', en: 'Due date' }) + '</th></tr></thead><tbody>';
    rows.slice(0, 8).forEach(function (r) {
      var late = r.inv.dueDate && new Date(r.inv.dueDate) < new Date();
      var sup = Store.find('suppliers', r.inv.supplier);
      h += '<tr class="clickable" data-open="supplierInvoices" data-rid="' + UI.attr(r.inv.id) + '">' +
        '<td class="num">' + UI.esc(r.inv.docNo || '') + '</td>' +
        '<td>' + UI.esc(sup ? sup.name : '—') + '</td>' +
        '<td class="money">' + I18N.money(r.due) + '</td>' +
        '<td class="num ' + (late ? 'neg' : '') + '">' + I18N.date(r.inv.dueDate) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.cashTable = function () {
    var accs = Store.all('cashAccounts').filter(function (c) { return c.status !== 'inactive'; });
    if (!accs.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('wallet', 17) + ' ' + L({ ar: 'أرصدة الخزائن والبنوك', en: 'Cash & bank balances' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    accs.forEach(function (c) {
      var bal = A().cashBalance(c.id);
      h += '<tr class="clickable" data-open="cashAccounts" data-rid="' + UI.attr(c.id) + '">' +
        '<td><strong>' + UI.esc(c.name) + '</strong></td>' +
        '<td class="money ' + (bal < 0 ? 'neg' : '') + '">' + I18N.money(bal) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.leavesTable = function () {
    var rows = Store.all('leaves').filter(function (l) { return ['pending', 'reviewed'].indexOf(l.status) !== -1; });
    if (!rows.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('calendar', 17) + ' ' + L({ ar: 'إجازات تنتظر البت', en: 'Leave requests pending' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    rows.slice(0, 8).forEach(function (l) {
      var e = Store.find('employees', l.employee);
      h += '<tr class="clickable" data-open="leaves" data-rid="' + UI.attr(l.id) + '">' +
        '<td><strong>' + UI.esc(e ? e.name : '—') + '</strong></td>' +
        '<td class="num">' + I18N.date(l.fromDate) + ' → ' + I18N.date(l.toDate) + '</td>' +
        '<td>' + Workflow.badgeHTML(l.status) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.expiringTable = function () {
    var soon = new Date(); soon.setDate(soon.getDate() + 90);
    var rows = Store.all('legalDocs').filter(function (d) {
      return d.expiryDate && new Date(d.expiryDate) <= soon && d.legalStatus !== 'closed';
    }).sort(function (a, b) { return new Date(a.expiryDate) - new Date(b.expiryDate); });
    if (!rows.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('scale', 17) + ' ' + L({ ar: 'مستندات تنتهي قريباً', en: 'Expiring documents' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    rows.slice(0, 8).forEach(function (d) {
      var days = Math.round((new Date(d.expiryDate) - new Date()) / 86400000);
      h += '<tr class="clickable" data-open="legalDocs" data-rid="' + UI.attr(d.id) + '">' +
        '<td><strong>' + UI.esc(d.title) + '</strong></td>' +
        '<td class="num ' + (days < 0 ? 'neg' : days < 30 ? 'neg' : '') + '">' + I18N.date(d.expiryDate) + '</td>' +
        '<td class="num muted">' + (days < 0 ? L({ ar: 'منتهٍ', en: 'expired' }) : days + L({ ar: ' يوم', en: ' days' })) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.ticketsTable = function () {
    var rows = Store.all('itTickets').filter(function (x) { return ['open', 'inprogress'].indexOf(x.ticketStatus) !== -1; });
    if (!rows.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('life-buoy', 17) + ' ' + L({ ar: 'طلبات دعم مفتوحة', en: 'Open tickets' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    rows.slice(0, 8).forEach(function (x) {
      var e = Store.find('employees', x.requester);
      h += '<tr class="clickable" data-open="itTickets" data-rid="' + UI.attr(x.id) + '">' +
        '<td><strong>' + UI.esc(x.subject) + '</strong><br><small class="muted">' + UI.esc(e ? e.name : '') + '</small></td>' +
        '<td class="num muted">' + I18N.date(x.date) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.announcements = function () {
    var rows = Store.all('announcements')
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
    if (!rows.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('megaphone', 17) + ' ' + L({ ar: 'تعميمات الإدارة', en: 'Announcements' }) + '</h3></div>' +
      '<div class="card-body flush">';
    rows.forEach(function (a) {
      h += '<div class="alert-row" data-open="announcements" data-rid="' + UI.attr(a.id) + '">' +
        '<span class="al-ic ' + (a.importance === 'urgent' ? 'danger' : a.importance === 'high' ? 'warn' : 'info') + '">' +
        UI.icon('megaphone', 15) + '</span>' +
        '<span class="al-tx"><strong>' + UI.esc(a.title) + '</strong><br>' +
        '<small class="muted">' + UI.esc(String(a.body || '').slice(0, 90)) + '…</small></span>' +
        '<span class="al-mod num">' + I18N.date(a.date) + '</span></div>';
    });
    return h + '</div></div>';
  };

  P.myWork = function () {
    var out = [];
    Schema.MODULES.filter(function (m) { return Auth.canSee(m.id); }).forEach(function (m) {
      RV().myDocs(m.table, 5).forEach(function (r) { out.push({ m: m, r: r }); });
    });
    out.sort(function (a, b) { return new Date(b.r.updatedAt || b.r.createdAt) - new Date(a.r.updatedAt || a.r.createdAt); });
    out = out.slice(0, 7);
    if (!out.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('file', 17) + ' ' + L({ ar: 'آخر ما عملتُ عليه', en: 'My recent work' }) + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    out.forEach(function (x) {
      h += '<tr class="clickable" data-open="' + UI.attr(x.m.id) + '" data-rid="' + UI.attr(x.r.id) + '">' +
        '<td style="width:30px">' + UI.icon(x.m.icon, 15) + '</td>' +
        '<td><strong class="num">' + UI.esc(x.r.docNo || x.r.name || x.r.title || '—') + '</strong>' +
        '<br><small class="muted">' + UI.esc(L(x.m.label)) + '</small></td>' +
        '<td>' + (x.m.workflow ? Workflow.badgeHTML(x.r.status) : '') + '</td>' +
        '<td class="num muted small nowrap">' + I18N.date(x.r.updatedAt || x.r.createdAt) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.recentDocs = function () {
    var all = [];
    Schema.MODULES.forEach(function (m) {
      if (!m.workflow || !Auth.canSee(m.id)) return;
      Store.all(m.table).forEach(function (r) { all.push({ m: m, r: r }); });
    });
    all.sort(function (a, b) { return new Date(b.r.updatedAt || b.r.createdAt) - new Date(a.r.updatedAt || a.r.createdAt); });
    all = all.slice(0, 8);
    if (!all.length) return '';
    var showMoney = RV().seesCompanyMoney();
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('file', 17) + ' ' + t('dash.recentDocs') + '</h3></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    all.forEach(function (x) {
      var amt = x.m.amountField ? x.r[x.m.amountField] : null;
      h += '<tr class="clickable" data-open="' + UI.attr(x.m.id) + '" data-rid="' + UI.attr(x.r.id) + '">' +
        '<td style="width:30px">' + UI.icon(x.m.icon, 15) + '</td>' +
        '<td><strong class="num">' + UI.esc(x.r.docNo || '') + '</strong><br><small class="muted">' + UI.esc(L(x.m.label)) + '</small></td>' +
        (showMoney ? '<td class="money">' + (amt != null ? I18N.money(amt) : '') + '</td>' : '') +
        '<td>' + Workflow.badgeHTML(x.r.status) + '</td>' +
        '<td class="num muted small nowrap">' + I18N.date(x.r.updatedAt || x.r.createdAt) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.auditFeed = function () {
    var log = Store.auditLog().slice(0, 10);
    if (!log.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('clipboard', 17) + ' ' + L({ ar: 'آخر الحركات', en: 'Latest activity' }) + '</h3>' +
      '<button class="btn btn-ghost btn-sm" data-go="settings" style="margin-inline-start:auto">' +
      L({ ar: 'السجل الكامل', en: 'Full log' }) + ' →</button></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><tbody>';
    log.forEach(function (e) {
      h += '<tr><td class="num muted small nowrap">' + I18N.dateTime(e.at) + '</td>' +
        '<td>' + UI.esc(e.userName) + '</td><td class="small">' + UI.esc(e.label || e.action) + '</td></tr>';
    });
    return h + '</tbody></table></div></div></div>';
  };

  P.charts = function () {
    return '<div class="grid-2 mb-2">' +
      '<div class="card"><div class="card-head"><h3 class="card-title">' + t('dash.budgetVsActual') + '</h3></div>' +
      '<div class="card-body"><div class="chart-box"><canvas id="chBVA"></canvas></div></div></div>' +
      '<div class="card"><div class="card-head"><h3 class="card-title">' + t('dash.costByType') + '</h3></div>' +
      '<div class="card-body"><div class="chart-box"><canvas id="chCost"></canvas></div></div></div></div>';
  };

  P.quickActions = function () {
    var picks = ['purchaseApprovals', 'goodsReceipts', 'stockIssues', 'stockTransfers', 'stockCounts',
                 'clientIPCs', 'subIPCs', 'payments', 'receipts', 'journal', 'supplierInvoices',
                 'siteReports', 'drawings', 'attendance', 'leaves', 'itTickets', 'announcements'];
    var buttons = '', n = 0;
    picks.forEach(function (id) {
      if (n >= 6 || !Auth.can(id, 'create')) return;
      var m = Schema.get(id); if (!m) return;
      n++;
      buttons += '<button class="btn btn-outline btn-sm" data-newin="' + UI.attr(id) + '" style="justify-content:flex-start">' +
        UI.icon(m.icon, 15) + ' ' + UI.esc(L(m.label)) + '</button>';
    });
    if (!n) return '';
    return '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('send', 17) + ' ' + t('dash.quickActions') + '</h3></div><div class="card-body">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px">' +
      buttons + '</div></div></div>';
  };

  function lowStockList() {
    return Store.all('items').filter(function (it) {
      var lvl = Number(it.reorderLevel) || 0;
      if (!lvl) return false;
      try { return A().stockQty(it.id) < lvl; } catch (e) { return false; }
    });
  }

  /* ══════════════════ RENDER ══════════════════ */
  function render(host) {
    Dashboard.destroyCharts();
    var u = Auth.current();
    var view = RV().viewFor();

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('grid', 22) + ' ' + UI.esc(L(view.title)) + '</h1>' +
      '<p class="page-sub">' + t('dash.hello') + ' ' + UI.esc(u ? u.name : '') + ' — ' +
      UI.esc(Auth.roleLabel(u ? u.role : '')) + ' · ' + I18N.date(I18N.today()) + '</p></div>' +
      '<div class="page-actions">';
    if (global.Assistant) {
      html += '<button class="btn btn-gold btn-sm" data-go="assistant">' + UI.icon('life-buoy', 15) + ' ' +
        L({ ar: 'مساعدي', en: 'My assistant' }) + '</button>';
    }
    var ib = Workflow.inboxCount();
    if (ib) html += '<button class="btn btn-primary btn-sm" data-go="inbox">' + UI.icon('inbox', 15) + ' ' +
      t('inbox.title') + ' (' + ib + ')</button>';
    html += '</div></div>';

    /* KPIs */
    html += '<div class="kpi-grid">';
    view.kpis.forEach(function (k) {
      if (K[k]) { try { html += K[k](); } catch (e) { console.error('kpi ' + k, e); } }
    });
    html += '</div>';

    /* Panels */
    view.panels.forEach(function (p) {
      if (P[p]) { try { html += P[p](); } catch (e) { console.error('panel ' + p, e); } }
    });

    host.innerHTML = html;

    host.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { App.go(b.getAttribute('data-go')); };
    });
    host.querySelectorAll('[data-proj]').forEach(function (tr) {
      tr.onclick = function () { EntityPage.openDetail('projects', tr.getAttribute('data-proj')); };
    });
    host.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () {
        var m = el.getAttribute('data-open'), rid = el.getAttribute('data-rid');
        if (rid) EntityPage.openDetail(m, rid); else App.go(m);
      };
    });
    host.querySelectorAll('[data-alert]').forEach(function (row) {
      row.onclick = function () {
        var m = row.getAttribute('data-alert'), rid = row.getAttribute('data-rid');
        App.go(m);
        if (rid) setTimeout(function () { try { EntityPage.openDetail(m, rid); } catch (e) {} }, 220);
      };
    });
    host.querySelectorAll('[data-newin]').forEach(function (b) {
      b.onclick = function () { EntityPage.openForm(b.getAttribute('data-newin'), null); };
    });

    if (view.panels.indexOf('charts') !== -1) {
      Dashboard.drawCharts(Store.all('projects').filter(function (p) { return p.status === 'active'; }));
    }
  }

  global.DashboardView = { render: render, KPIS: K, PANELS: P };
})(window);
