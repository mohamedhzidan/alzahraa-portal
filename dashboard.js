/* =========================================================================
   pages/dashboard.js — company overview
   ========================================================================= */
(function (global) {
  'use strict';

  var charts = [];

  function destroyCharts() {
    charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    charts = [];
  }

  /* ---------- analytics helpers (shared with reports.js) ---------- */
  function approved(table) {
    return Store.all(table).filter(function (r) { return r.status === 'approved'; });
  }

  /* Actual cost charged to a project = stock issues + supplier invoices +
     subcontractor IPCs + equipment logs + journal lines tagged to it */
  function actualCost(projectId) {
    var sum = 0;
    approved('stockIssues').forEach(function (r) { if (!projectId || r.project === projectId) sum += Number(r.subTotal) || 0; });
    approved('supplierInvoices').forEach(function (r) { if (!projectId || r.project === projectId) sum += Number(r.subTotal) || 0; });
    approved('subIPCs').forEach(function (r) { if (!projectId || r.project === projectId) sum += Number(r.currentWork) || 0; });
    Store.all('equipmentLogs').forEach(function (r) { if (!projectId || r.project === projectId) sum += Number(r.cost) || 0; });
    approved('journal').forEach(function (r) { if (projectId && r.project === projectId) sum += Number(r.totalDebit) || 0; });
    return sum;
  }

  function committed(projectId) {
    var sum = 0;
    Store.all('purchaseApprovals').forEach(function (r) {
      if (r.status !== 'approved') return;
      if (projectId && r.project !== projectId) return;
      sum += Number(r.grandTotal) || 0;
    });
    /* subtract what has already turned into an invoice */
    approved('supplierInvoices').forEach(function (r) {
      if (!r.purchaseApproval) return;
      if (projectId && r.project !== projectId) return;
      sum -= Number(r.grandTotal) || 0;
    });
    return Math.max(0, sum);
  }

  function budgetOf(projectId) {
    var latest = null;
    approved('budgets').forEach(function (b) {
      if (b.project !== projectId) return;
      if (!latest || new Date(b.date) > new Date(latest.date)) latest = b;
    });
    if (latest) return Number(latest.subTotal) || 0;
    var p = Store.find('projects', projectId);
    return p ? Number(p.budgetTotal) || 0 : 0;
  }

  function costByType() {
    var out = {};
    Schema.COST_TYPES.forEach(function (c) { out[c.value] = 0; });
    function addBy(costItemId, amount) {
      var ci = costItemId ? Store.find('costItems', costItemId) : null;
      var key = ci ? ci.type : 'direct';
      out[key] = (out[key] || 0) + amount;
    }
    approved('stockIssues').forEach(function (r) { addBy(r.costItem, Number(r.subTotal) || 0); });
    approved('supplierInvoices').forEach(function (r) { addBy(r.costItem, Number(r.subTotal) || 0); });
    approved('subIPCs').forEach(function (r) { addBy(r.costItem, Number(r.currentWork) || 0); });
    Store.all('equipmentLogs').forEach(function (r) { addBy(r.costItem, Number(r.cost) || 0); });
    return out;
  }

  function receivable() {
    var inv = 0, col = 0;
    approved('clientIPCs').forEach(function (r) { inv += Number(r.netDue) || 0; });
    approved('receipts').forEach(function (r) { col += Number(r.amount) || 0; });
    return Math.max(0, inv - col);
  }
  function payable() {
    var inv = 0, paid = 0;
    approved('supplierInvoices').forEach(function (r) { inv += Number(r.grandTotal) || 0; });
    approved('subIPCs').forEach(function (r) { inv += Number(r.netDue) || 0; });
    approved('payments').forEach(function (r) { paid += Number(r.amount) || 0; });
    return Math.max(0, inv - paid);
  }

  /* Current stock quantity of an item across all (or one) warehouse */
  function stockQty(itemId, warehouseId) {
    var qty = 0;
    approved('goodsReceipts').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) { if (l.item === itemId) qty += Number(l.qtyAccepted) || 0; });
    });
    approved('stockIssues').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) { if (l.item === itemId) qty -= Number(l.qty) || 0; });
    });
    approved('stockTransfers').forEach(function (d) {
      (d.lines || []).forEach(function (l) {
        if (l.item !== itemId) return;
        var q = Number(l.qty) || 0;
        if (!warehouseId) return;
        if (d.fromWarehouse === warehouseId) qty -= q;
        if (d.toWarehouse === warehouseId) qty += q;
      });
    });
    approved('stockCounts').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) {
        if (l.item === itemId) qty += (Number(l.countedQty) || 0) - (Number(l.bookQty) || 0);
      });
    });
    return qty;
  }

  function stockValue() {
    var v = 0;
    Store.all('items').forEach(function (it) {
      v += stockQty(it.id) * (Number(it.lastPrice) || 0);
    });
    return v;
  }

  function cashBalance(accId) {
    var acc = Store.find('cashAccounts', accId);
    var bal = acc ? Number(acc.openingBalance) || 0 : 0;
    approved('receipts').forEach(function (r) { if (r.cashAccount === accId) bal += Number(r.amount) || 0; });
    approved('payments').forEach(function (r) { if (r.cashAccount === accId) bal -= Number(r.amount) || 0; });
    return bal;
  }

  /* ======================================================================
     RENDER
     ==================================================================== */
  function render(host) {
    destroyCharts();
    var u = Auth.current();
    var projects = Store.all('projects');
    var activeProjects = projects.filter(function (p) { return p.status === 'active'; });

    var totalBudget = 0, totalActual = 0, totalCommitted = 0;
    activeProjects.forEach(function (p) {
      totalBudget += budgetOf(p.id);
      totalActual += actualCost(p.id);
      totalCommitted += committed(p.id);
    });

    var inbox = Workflow.inboxCount();
    var employees = Store.all('employees').filter(function (e) { return e.status === 'active'; });
    var equip = Store.all('equipment').filter(function (e) { return e.status === 'active' && e.condition === 'good'; });

    var html = '';

    /* header */
    html += '<div class="page-head">' +
      '<div class="page-head-text">' +
        '<h1 class="page-title">' + UI.icon('grid', 22) + ' ' + t('dash.title') + '</h1>' +
        '<p class="page-sub">' + t('dash.hello') + ' ' + UI.esc(u ? u.name : '') + ' — ' + t('dash.today') + ' ' + I18N.date(I18N.today()) + '</p>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-outline btn-sm" data-go="reports">' + UI.icon('chart', 15) + ' ' + t('rep.title') + '</button>' +
        (inbox ? '<button class="btn btn-gold btn-sm" data-go="inbox">' + UI.icon('inbox', 15) + ' ' + t('inbox.title') + ' (' + inbox + ')</button>' : '') +
      '</div>' +
    '</div>';

    /* KPIs */
    html += '<div class="kpi-grid">';
    html += UI.kpi({ label: t('dash.projects'), value: '<span class="num">' + activeProjects.length + '</span>', icon: 'building',
      foot: '<span class="muted">' + (I18N.getLang() === 'ar' ? 'من إجمالي ' : 'of ') + projects.length + '</span>' });
    html += UI.kpi({ label: t('dash.budget'), value: I18N.moneyShort(totalBudget), icon: 'target', tone: 'info' });
    html += UI.kpi({ label: t('dash.actual'), value: I18N.moneyShort(totalActual), icon: 'chart',
      tone: totalActual > totalBudget && totalBudget > 0 ? 'danger' : 'gold',
      foot: totalBudget > 0 ? '<span class="' + (totalActual > totalBudget ? 'neg' : 'pos') + '">' + I18N.pct(totalActual / totalBudget * 100, 1) + '</span> <span class="muted">' + t('dash.budget') + '</span>' : '' });
    html += UI.kpi({ label: t('dash.committed'), value: I18N.moneyShort(totalCommitted), icon: 'cart', tone: 'purple' });
    html += UI.kpi({ label: t('dash.receivable'), value: I18N.moneyShort(receivable()), icon: 'arrow-down', tone: 'info' });
    html += UI.kpi({ label: t('dash.payable'), value: I18N.moneyShort(payable()), icon: 'arrow-up', tone: 'warn' });
    html += UI.kpi({ label: t('dash.stockValue'), value: I18N.moneyShort(stockValue()), icon: 'box' });
    html += UI.kpi({ label: t('dash.pending'), value: '<span class="num">' + inbox + '</span>', icon: 'inbox', tone: inbox ? 'danger' : '' });
    html += '</div>';

    /* alerts — from the rule engine */
    if (global.Alerts) {
      var alCount = 0;
      try { Alerts.invalidate(); alCount = Alerts.count(); } catch (e) {}
      if (alCount) {
        html += '<div class="card mb-2"><div class="card-head">' +
          '<h3 class="card-title">' + UI.icon('alert', 17) + ' ' + t('dash.alerts') + '</h3>' +
          '<span class="badge b-rejected plain num">' + alCount + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-go="alerts" style="margin-inline-start:auto">' +
          L({ ar: 'عرض الكل', en: 'View all' }) + ' →</button></div>' +
          '<div class="card-body flush">' + Alerts.dashboardHTML(6) + '</div></div>';
      }
    }

    /* charts */
    html += '<div class="grid-2 mb-2">';
    html += '<div class="card"><div class="card-head"><h3 class="card-title">' + t('dash.budgetVsActual') + '</h3></div>' +
      '<div class="card-body"><div class="chart-box"><canvas id="chBVA"></canvas></div></div></div>';
    html += '<div class="card"><div class="card-head"><h3 class="card-title">' + t('dash.costByType') + '</h3></div>' +
      '<div class="card-body"><div class="chart-box"><canvas id="chCost"></canvas></div></div></div>';
    html += '</div>';

    /* project table */
    html += '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' + UI.icon('building', 17) + ' ' + L({ ar: 'حالة المشروعات', en: 'Project status' }) + '</h3>' +
      '<button class="btn btn-ghost btn-sm" data-go="projects">' + L({ ar: 'عرض الكل', en: 'View all' }) + ' →</button></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + L({ ar: 'المشروع', en: 'Project' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'العميل', en: 'Customer' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'قيمة العقد', en: 'Contract value' }) + '</th>' +
      '<th class="no-sort">' + t('dash.budget') + '</th>' +
      '<th class="no-sort">' + t('dash.actual') + '</th>' +
      '<th class="no-sort">' + t('rep.variance') + '</th>' +
      '<th class="no-sort">' + L({ ar: 'الإنجاز', en: 'Progress' }) + '</th>' +
      '</tr></thead><tbody>';

    if (!activeProjects.length) {
      html += '<tr><td colspan="7" class="text-c muted" style="padding:26px">' + t('g.noData') + '</td></tr>';
    }
    activeProjects.forEach(function (p) {
      var b = budgetOf(p.id), a = actualCost(p.id), v = b - a;
      html += '<tr class="clickable" data-proj="' + UI.attr(p.id) + '">' +
        '<td><strong>' + UI.esc(p.name) + '</strong><br><small class="muted num">' + UI.esc(p.code) + '</small></td>' +
        '<td>' + UI.esc(Schema.refLabel({ ref: 'customers', refLabel: 'name' }, p.customer)) + '</td>' +
        '<td class="money">' + I18N.money(p.contractValue) + '</td>' +
        '<td class="money">' + I18N.money(b) + '</td>' +
        '<td class="money">' + I18N.money(a) + '</td>' +
        '<td class="money ' + (v < 0 ? 'neg' : 'pos') + '">' + I18N.money(v) + '</td>' +
        '<td style="min-width:120px">' + UI.progress(p.progress) + '<small class="num muted">' + I18N.pct(p.progress || 0, 0) + '</small></td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div></div>';

    /* recent documents + quick actions */
    html += '<div class="grid-2">';
    html += '<div class="card"><div class="card-head"><h3 class="card-title">' + UI.icon('file', 17) + ' ' + t('dash.recentDocs') + '</h3></div>' +
      '<div class="card-body flush">' + recentDocsHTML() + '</div></div>';
    html += '<div class="card"><div class="card-head"><h3 class="card-title">' + UI.icon('send', 17) + ' ' + t('dash.quickActions') + '</h3></div>' +
      '<div class="card-body">' + quickActionsHTML() + '</div></div>';
    html += '</div>';

    host.innerHTML = html;

    /* wire */
    host.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { App.go(b.getAttribute('data-go')); };
    });
    host.querySelectorAll('[data-proj]').forEach(function (tr) {
      tr.onclick = function () { EntityPage.openDetail('projects', tr.getAttribute('data-proj')); };
    });
    host.querySelectorAll('[data-open]').forEach(function (b) {
      b.onclick = function () { EntityPage.openDetail(b.getAttribute('data-open'), b.getAttribute('data-rid')); };
    });
    host.querySelectorAll('[data-newin]').forEach(function (b) {
      b.onclick = function () { EntityPage.openForm(b.getAttribute('data-newin'), null); };
    });
    host.querySelectorAll('[data-alert]').forEach(function (row) {
      row.onclick = function () {
        var m = row.getAttribute('data-alert'), rid = row.getAttribute('data-rid');
        App.go(m);
        if (rid) setTimeout(function () { try { EntityPage.openDetail(m, rid); } catch (e) {} }, 220);
      };
    });

    drawCharts(activeProjects);
  }

  function buildAlerts(activeProjects) {
    var out = [];
    var over = activeProjects.filter(function (p) {
      var b = budgetOf(p.id);
      return b > 0 && actualCost(p.id) > b;
    });
    if (over.length) {
      out.push({ kind: 'danger', text: '<strong>' + t('dash.overBudget') + ':</strong> ' + over.map(function (p) { return UI.esc(p.name); }).join('، ') });
    }
    var low = Store.all('items').filter(function (it) {
      var lvl = Number(it.reorderLevel) || 0;
      return lvl > 0 && stockQty(it.id) < lvl;
    });
    if (low.length) {
      out.push({ kind: 'warn', text: '<strong>' + t('dash.lowStock') + ' (' + low.length + '):</strong> ' + low.slice(0, 6).map(function (i) { return UI.esc(i.name); }).join('، ') });
    }
    var soon = new Date(); soon.setDate(soon.getDate() + 60);
    var exp = Store.all('legalDocs').filter(function (d) {
      return d.expiryDate && new Date(d.expiryDate) <= soon && d.legalStatus !== 'closed';
    });
    Store.all('equipment').forEach(function (e) {
      if (e.licenseExpiry && new Date(e.licenseExpiry) <= soon) exp.push({ title: e.name });
    });
    if (exp.length) {
      out.push({ kind: 'warn', text: '<strong>' + t('dash.expiring') + ' (' + exp.length + '):</strong> ' + exp.slice(0, 6).map(function (d) { return UI.esc(d.title); }).join('، ') });
    }
    return out;
  }

  function recentDocsHTML() {
    var all = [];
    Schema.MODULES.forEach(function (m) {
      if (!m.workflow || !Auth.canSee(m.id)) return;
      Store.all(m.table).forEach(function (r) { all.push({ m: m, r: r }); });
    });
    all.sort(function (a, b) { return new Date(b.r.updatedAt || b.r.createdAt) - new Date(a.r.updatedAt || a.r.createdAt); });
    all = all.slice(0, 8);
    if (!all.length) return '<div class="empty-state"><p>' + t('g.noData') + '</p></div>';

    var h = '<div class="table-wrap"><table class="data-table" style="min-width:0"><tbody>';
    all.forEach(function (x) {
      var amt = x.m.amountField ? x.r[x.m.amountField] : null;
      h += '<tr class="clickable" data-open="' + UI.attr(x.m.id) + '" data-rid="' + UI.attr(x.r.id) + '">' +
        '<td style="width:32px">' + UI.icon(x.m.icon, 16) + '</td>' +
        '<td><strong class="num">' + UI.esc(x.r.docNo || '') + '</strong><br><small class="muted">' + UI.esc(L(x.m.label)) + '</small></td>' +
        '<td class="money">' + (amt !== null && amt !== undefined ? I18N.money(amt) : '') + '</td>' +
        '<td>' + Workflow.badgeHTML(x.r.status) + '</td>' +
        '<td class="num muted small nowrap">' + I18N.date(x.r.updatedAt || x.r.createdAt) + '</td>' +
        '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function quickActionsHTML() {
    var picks = ['purchaseApprovals', 'goodsReceipts', 'stockIssues', 'clientIPCs', 'subIPCs', 'payments', 'receipts', 'journal', 'siteReports', 'leaves', 'itTickets'];
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px">';
    var n = 0;
    picks.forEach(function (id) {
      if (n >= 8) return;
      if (!Auth.can(id, 'create')) return;
      var m = Schema.get(id);
      if (!m) return;
      n++;
      h += '<button class="btn btn-outline btn-sm" data-newin="' + UI.attr(id) + '" style="justify-content:flex-start">' +
        UI.icon(m.icon, 15) + ' ' + UI.esc(L(m.label)) + '</button>';
    });
    h += '</div>';
    return n ? h : '<p class="muted small">' + L({ ar: 'لا توجد إجراءات متاحة لدورك الحالي.', en: 'No quick actions available for your role.' }) + '</p>';
  }

  function drawCharts(activeProjects) {
    if (typeof Chart === 'undefined') return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var grid = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
    var tick = dark ? '#a8bbb3' : '#4a5a54';
    var fontFamily = I18N.getLang() === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif';
    Chart.defaults.font.family = fontFamily;

    var c1 = document.getElementById('chBVA');
    if (c1 && activeProjects.length) {
      charts.push(new Chart(c1, {
        type: 'bar',
        data: {
          labels: activeProjects.map(function (p) { return p.name.length > 22 ? p.name.slice(0, 22) + '…' : p.name; }),
          datasets: [
            { label: t('dash.budget'), data: activeProjects.map(function (p) { return budgetOf(p.id); }), backgroundColor: '#1a6b51', borderRadius: 5 },
            { label: t('dash.actual'), data: activeProjects.map(function (p) { return actualCost(p.id); }), backgroundColor: '#c9a227', borderRadius: 5 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: tick, boxWidth: 12 } } },
          scales: {
            x: { ticks: { color: tick, font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: tick, callback: function (v) { return I18N.moneyShort(v).replace(' ' + t('g.currency'), ''); } }, grid: { color: grid } }
          }
        }
      }));
    } else if (c1) {
      c1.parentElement.innerHTML = '<div class="empty-state"><p>' + t('g.noData') + '</p></div>';
    }

    var c2 = document.getElementById('chCost');
    if (c2) {
      var cb = costByType();
      var labels = [], data = [];
      Schema.COST_TYPES.forEach(function (ct) {
        if ((cb[ct.value] || 0) > 0) { labels.push(L(ct.label)); data.push(cb[ct.value]); }
      });
      if (data.length) {
        charts.push(new Chart(c2, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#0b3d2e', '#1a6b51', '#c9a227', '#dbb84a', '#2563eb', '#6d28d9'], borderWidth: 0 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '58%',
            plugins: {
              legend: { position: I18N.isRTL() ? 'left' : 'right', labels: { color: tick, boxWidth: 12, font: { size: 11 } } },
              tooltip: { callbacks: { label: function (c) { return c.label + ': ' + I18N.money(c.parsed); } } }
            }
          }
        }));
      } else {
        c2.parentElement.innerHTML = '<div class="empty-state"><p>' + t('g.noData') + '</p></div>';
      }
    }
  }

  global.Dashboard = {
    render: render, destroyCharts: destroyCharts,
    analytics: {
      actualCost: actualCost, committed: committed, budgetOf: budgetOf,
      costByType: costByType, receivable: receivable, payable: payable,
      stockQty: stockQty, stockValue: stockValue, cashBalance: cashBalance, approved: approved
    }
  };
})(window);
