/* =========================================================================
   pages/reports.js — filterable, exportable reports
   ========================================================================= */
(function (global) {
  'use strict';

  var A = null; /* Dashboard.analytics, resolved lazily */
  function an() { A = A || Dashboard.analytics; return A; }

  var current = 'bva';
  var filters = { from: '', to: '', project: '' };

  var REPORTS = [
    { id: 'bva',        icon: 'target',   label: 'rep.bva' },
    { id: 'projCost',   icon: 'building', label: 'rep.projCost' },
    { id: 'stock',      icon: 'box',      label: 'rep.stock' },
    { id: 'ap',         icon: 'truck',    label: 'rep.ap' },
    { id: 'ar',         icon: 'users',    label: 'rep.ar' },
    { id: 'cash',       icon: 'wallet',   label: 'rep.cash' },
    { id: 'tb',         icon: 'book',     label: 'rep.tb' },
    { id: 'subcontract',icon: 'hard-hat', label: 'rep.subcontract' },
    { id: 'payroll',    icon: 'banknote', label: 'rep.payroll' },
    { id: 'attendance', icon: 'clock',    label: 'rep.attendance' }
  ];

  function render(host) {
    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('chart', 22) + ' ' + t('rep.title') + '</h1>' +
      '<p class="page-sub">' + t('rep.sub') + '</p></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-outline btn-sm" id="repExport">' + UI.icon('download', 15) + ' ' + t('g.export') + '</button>' +
      '<button class="btn btn-outline btn-sm" id="repPrint">' + UI.icon('printer', 15) + ' ' + t('g.print') + '</button>' +
      '</div></div>';

    html += '<div class="tabs">';
    REPORTS.forEach(function (r) {
      html += '<button class="tab' + (current === r.id ? ' active' : '') + '" data-rep="' + r.id + '">' + UI.icon(r.icon, 15) + ' ' + t(r.label) + '</button>';
    });
    html += '</div>';

    /* filters */
    var projects = Store.all('projects');
    html += '<div class="card mb-2"><div class="table-toolbar">' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + t('rep.from') + '</span>' +
      '<input type="date" class="input input-sm" id="fFrom" value="' + UI.attr(filters.from) + '"></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + t('rep.to') + '</span>' +
      '<input type="date" class="input input-sm" id="fTo" value="' + UI.attr(filters.to) + '"></label>' +
      '<label class="field" style="min-width:200px"><span class="field-label">' + L({ ar: 'المشروع', en: 'Project' }) + '</span>' +
      '<select class="select input-sm" id="fProject"><option value="">' + t('g.all') + '</option>' +
      projects.map(function (p) { return '<option value="' + UI.attr(p.id) + '"' + (filters.project === p.id ? ' selected' : '') + '>' + UI.esc(p.name) + '</option>'; }).join('') +
      '</select></label>' +
      '<button class="btn btn-ghost btn-sm" id="fClear" style="margin-top:18px">' + t('g.clearFilters') + '</button>' +
      '</div></div>';

    html += '<div class="card"><div class="card-body flush" id="repBody"></div></div>';
    host.innerHTML = html;

    host.querySelectorAll('[data-rep]').forEach(function (b) {
      b.onclick = function () { current = b.getAttribute('data-rep'); render(host); };
    });
    ['fFrom', 'fTo', 'fProject'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.onchange = function () {
        filters.from = document.getElementById('fFrom').value;
        filters.to = document.getElementById('fTo').value;
        filters.project = document.getElementById('fProject').value;
        draw();
      };
    });
    document.getElementById('fClear').onclick = function () { filters = { from: '', to: '', project: '' }; render(host); };
    document.getElementById('repPrint').onclick = function () { window.print(); };
    document.getElementById('repExport').onclick = doExport;

    draw();
  }

  var lastTable = { headers: [], rows: [], title: '' };

  function draw() {
    var body = document.getElementById('repBody');
    if (!body) return;
    var fn = BUILDERS[current];
    var res = fn ? fn() : { headers: [], rows: [], title: '' };
    lastTable = res;

    if (!res.rows.length) {
      body.innerHTML = '<div class="empty-state">' + UI.icon('chart', 42) + '<h4>' + t('g.noData') + '</h4><p>' +
        L({ ar: 'لا توجد بيانات معتمدة تطابق الفلاتر المحددة.', en: 'No approved data matches the selected filters.' }) + '</p></div>';
      return;
    }

    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>';
    res.headers.forEach(function (x) { h += '<th class="no-sort">' + UI.esc(x) + '</th>'; });
    h += '</tr></thead><tbody>';
    res.rows.forEach(function (r) {
      h += '<tr' + (r.__cls ? ' class="' + r.__cls + '"' : '') + '>';
      (r.cells || r).forEach(function (c) { h += '<td>' + c + '</td>'; });
      h += '</tr>';
    });
    h += '</tbody>';
    if (res.footer) {
      h += '<tfoot><tr>';
      res.footer.forEach(function (c) { h += '<td class="strong" style="background:var(--surface-2)">' + c + '</td>'; });
      h += '</tr></tfoot>';
    }
    h += '</table></div>';
    body.innerHTML = h;
  }

  function doExport() {
    if (!lastTable.rows.length) { UI.toast(t('g.noData'), 'warn'); return; }
    var rows = lastTable.rows.map(function (r) { return (r.cells || r); });
    UI.exportCSV((lastTable.title || 'report').replace(/\s+/g, '_'), lastTable.headers, rows);
    UI.toast(t('g.export') + ' ✓');
  }

  function inRange(d) {
    if (!d) return true;
    var x = new Date(d);
    if (filters.from && x < new Date(filters.from)) return false;
    if (filters.to && x > new Date(filters.to + 'T23:59:59')) return false;
    return true;
  }
  function projOk(p) { return !filters.project || p === filters.project; }
  function money(v) { return '<span class="money">' + I18N.money(v) + '</span>'; }
  function num(v, d) { return '<span class="num">' + I18N.num(v, d || 0) + '</span>'; }

  /* ======================================================================
     REPORT BUILDERS
     ==================================================================== */
  var BUILDERS = {

    /* Budget vs Actual by project and cost item */
    bva: function () {
      var rows = [];
      var projects = Store.all('projects').filter(function (p) { return projOk(p.id); });
      var tB = 0, tA = 0, tC = 0;

      projects.forEach(function (p) {
        var b = an().budgetOf(p.id), a = an().actualCost(p.id), c = an().committed(p.id);
        if (!b && !a && !c) return;
        tB += b; tA += a; tC += c;
        var avail = b - a - c;
        var pct = b ? (a / b * 100) : 0;
        rows.push({
          __cls: a > b && b > 0 ? '' : '',
          cells: [
            '<strong>' + UI.esc(p.name) + '</strong>',
            money(p.contractValue), money(b), money(a), money(c),
            '<span class="' + (avail < 0 ? 'neg' : 'pos') + '">' + I18N.money(avail) + '</span>',
            UI.progress(pct) + '<small class="num muted">' + I18N.pct(pct, 1) + '</small>'
          ]
        });
      });

      return {
        title: t('rep.bva'),
        headers: [L({ ar: 'المشروع', en: 'Project' }), L({ ar: 'قيمة العقد', en: 'Contract' }), t('dash.budget'),
                  t('dash.actual'), t('dash.committed'), t('rep.available'), t('rep.pct')],
        rows: rows,
        footer: rows.length ? [L({ ar: 'الإجمالي', en: 'Total' }), '', I18N.money(tB), I18N.money(tA), I18N.money(tC), I18N.money(tB - tA - tC), ''] : null
      };
    },

    /* Detailed project cost by cost item */
    projCost: function () {
      var rows = [];
      var items = Store.all('costItems');
      var totals = {};
      items.forEach(function (ci) { totals[ci.id] = { budget: 0, actual: 0 }; });

      an().approved('budgets').forEach(function (b) {
        if (!projOk(b.project)) return;
        (b.lines || []).forEach(function (l) {
          if (!totals[l.costItem]) totals[l.costItem] = { budget: 0, actual: 0 };
          totals[l.costItem].budget += Number(l.lineTotal) || 0;
        });
      });
      function addActual(id, v) { if (!totals[id]) totals[id] = { budget: 0, actual: 0 }; totals[id].actual += v; }
      an().approved('stockIssues').forEach(function (r) { if (projOk(r.project) && inRange(r.date)) addActual(r.costItem, Number(r.subTotal) || 0); });
      an().approved('supplierInvoices').forEach(function (r) { if (projOk(r.project) && inRange(r.date)) addActual(r.costItem, Number(r.subTotal) || 0); });
      an().approved('subIPCs').forEach(function (r) { if (projOk(r.project) && inRange(r.date)) addActual(r.costItem, Number(r.currentWork) || 0); });
      Store.all('equipmentLogs').forEach(function (r) { if (projOk(r.project) && inRange(r.date)) addActual(r.costItem, Number(r.cost) || 0); });

      var tB = 0, tA = 0;
      Object.keys(totals).forEach(function (id) {
        var ci = Store.find('costItems', id);
        var v = totals[id];
        if (!v.budget && !v.actual) return;
        tB += v.budget; tA += v.actual;
        var typeLabel = ci ? Schema.optionLabel({ options: Schema.COST_TYPES }, ci.type) : '—';
        rows.push({
          cells: [
            '<strong>' + UI.esc(ci ? ci.name : '—') + '</strong>',
            UI.esc(typeLabel),
            money(v.budget), money(v.actual),
            '<span class="' + (v.budget - v.actual < 0 ? 'neg' : 'pos') + '">' + I18N.money(v.budget - v.actual) + '</span>',
            v.budget ? I18N.pct(v.actual / v.budget * 100, 1) : '—'
          ]
        });
      });
      rows.sort(function (a, b) { return 0; });

      return {
        title: t('rep.projCost'),
        headers: [L({ ar: 'بند التكلفة', en: 'Cost item' }), L({ ar: 'النوع', en: 'Type' }), t('dash.budget'), t('dash.actual'), t('rep.variance'), t('rep.pct')],
        rows: rows,
        footer: rows.length ? [L({ ar: 'الإجمالي', en: 'Total' }), '', I18N.money(tB), I18N.money(tA), I18N.money(tB - tA), ''] : null
      };
    },

    /* Stock balances per item per warehouse */
    stock: function () {
      var rows = [];
      var items = Store.all('items');
      var whs = Store.all('warehouses');
      var totalValue = 0;

      items.forEach(function (it) {
        var totalQty = an().stockQty(it.id);
        if (totalQty === 0) {
          /* still show items with a reorder level so shortages are visible */
          if (!Number(it.reorderLevel)) return;
        }
        var value = totalQty * (Number(it.lastPrice) || 0);
        totalValue += value;
        var byWh = whs.map(function (w) {
          var q = an().stockQty(it.id, w.id);
          return q ? UI.esc(w.name) + ': ' + I18N.num(q, 2) : null;
        }).filter(Boolean).join(' • ');
        var low = Number(it.reorderLevel) > 0 && totalQty < Number(it.reorderLevel);
        rows.push({
          cells: [
            '<span class="num">' + UI.esc(it.code) + '</span>',
            '<strong>' + UI.esc(it.name) + '</strong>' + (low ? ' <span class="badge b-rejected">' + L({ ar: 'تحت الحد', en: 'Below level' }) + '</span>' : ''),
            UI.esc(Schema.optionLabel(Schema.field('items', 'baseUnit'), it.baseUnit)),
            num(totalQty, 2),
            num(it.reorderLevel, 0),
            money(it.lastPrice),
            money(value),
            '<small class="muted">' + (byWh || '—') + '</small>'
          ]
        });
      });

      return {
        title: t('rep.stock'),
        headers: [L({ ar: 'الكود', en: 'Code' }), L({ ar: 'الصنف', en: 'Item' }), t('g.unit'),
                  L({ ar: 'الرصيد', en: 'Balance' }), L({ ar: 'حد الطلب', en: 'Reorder' }),
                  L({ ar: 'آخر سعر', en: 'Last price' }), L({ ar: 'القيمة', en: 'Value' }), L({ ar: 'التوزيع', en: 'By warehouse' })],
        rows: rows,
        footer: rows.length ? [L({ ar: 'إجمالي قيمة المخزون', en: 'Total inventory value' }), '', '', '', '', '', I18N.money(totalValue), ''] : null
      };
    },

    /* Supplier ageing */
    ap: function () {
      var rows = [], total = 0;
      Store.all('suppliers').forEach(function (s) {
        var opening = Number(s.openingBalance) || 0;
        var inv = 0, paid = 0;
        an().approved('supplierInvoices').forEach(function (r) {
          if (r.supplier !== s.id || !inRange(r.date)) return;
          inv += Number(r.grandTotal) || 0;
        });
        an().approved('payments').forEach(function (r) {
          if (r.supplier !== s.id || !inRange(r.date)) return;
          paid += Number(r.amount) || 0;
        });
        /* balance owed to the supplier = opening + invoices − payments */
        var bal = opening + inv - paid;
        if (!inv && !paid && !opening) return;
        total += bal;
        rows.push({ cells: [
          '<span class="num">' + UI.esc(s.code) + '</span>',
          '<strong>' + UI.esc(s.name) + '</strong>',
          money(opening), money(inv), money(paid),
          '<span class="' + (bal > 0 ? 'neg' : 'pos') + '">' + I18N.money(bal) + '</span>'
        ] });
      });
      return {
        title: t('rep.ap'),
        headers: [L({ ar: 'الكود', en: 'Code' }), L({ ar: 'المورد', en: 'Supplier' }), L({ ar: 'رصيد افتتاحي', en: 'Opening' }),
                  L({ ar: 'الفواتير', en: 'Invoices' }), L({ ar: 'المدفوع', en: 'Paid' }), L({ ar: 'الرصيد المستحق', en: 'Balance due' })],
        rows: rows,
        footer: rows.length ? ['', L({ ar: 'الإجمالي', en: 'Total' }), '', '', '', I18N.money(total)] : null
      };
    },

    /* Customer ageing */
    ar: function () {
      var rows = [], total = 0;
      Store.all('customers').forEach(function (c) {
        var inv = 0, col = 0;
        an().approved('clientIPCs').forEach(function (r) {
          if (r.customer !== c.id || !inRange(r.date) || !projOk(r.project)) return;
          inv += Number(r.netDue) || 0;
        });
        an().approved('receipts').forEach(function (r) {
          if (r.customer !== c.id || !inRange(r.date) || !projOk(r.project)) return;
          col += Number(r.amount) || 0;
        });
        var bal = (Number(c.openingBalance) || 0) + inv - col;
        if (!inv && !col && !Number(c.openingBalance)) return;
        total += bal;
        rows.push({ cells: [
          '<span class="num">' + UI.esc(c.code) + '</span>',
          '<strong>' + UI.esc(c.name) + '</strong>',
          money(c.openingBalance), money(inv), money(col),
          '<span class="' + (bal > 0 ? 'pos' : 'neg') + '">' + I18N.money(bal) + '</span>'
        ] });
      });
      return {
        title: t('rep.ar'),
        headers: [L({ ar: 'الكود', en: 'Code' }), L({ ar: 'العميل', en: 'Customer' }), L({ ar: 'رصيد افتتاحي', en: 'Opening' }),
                  L({ ar: 'المستخلصات', en: 'IPCs' }), L({ ar: 'المحصَّل', en: 'Collected' }), L({ ar: 'الرصيد', en: 'Balance' })],
        rows: rows,
        footer: rows.length ? ['', L({ ar: 'الإجمالي', en: 'Total' }), '', '', '', I18N.money(total)] : null
      };
    },

    /* Cash & bank movement */
    cash: function () {
      var rows = [], tIn = 0, tOut = 0, tBal = 0;
      Store.all('cashAccounts').forEach(function (a) {
        var inn = 0, out = 0;
        an().approved('receipts').forEach(function (r) { if (r.cashAccount === a.id && inRange(r.date)) inn += Number(r.amount) || 0; });
        an().approved('payments').forEach(function (r) { if (r.cashAccount === a.id && inRange(r.date)) out += Number(r.amount) || 0; });
        var bal = (Number(a.openingBalance) || 0) + inn - out;
        tIn += inn; tOut += out; tBal += bal;
        rows.push({ cells: [
          '<span class="num">' + UI.esc(a.code) + '</span>',
          '<strong>' + UI.esc(a.name) + '</strong>',
          UI.esc(Schema.optionLabel(Schema.field('cashAccounts', 'kind'), a.kind)),
          money(a.openingBalance), money(inn), money(out),
          '<span class="' + (bal < 0 ? 'neg' : 'pos') + '">' + I18N.money(bal) + '</span>'
        ] });
      });
      return {
        title: t('rep.cash'),
        headers: [L({ ar: 'الكود', en: 'Code' }), L({ ar: 'الحساب', en: 'Account' }), L({ ar: 'النوع', en: 'Type' }),
                  L({ ar: 'رصيد افتتاحي', en: 'Opening' }), L({ ar: 'وارد', en: 'In' }), L({ ar: 'صادر', en: 'Out' }), L({ ar: 'الرصيد', en: 'Balance' })],
        rows: rows,
        footer: rows.length ? ['', L({ ar: 'الإجمالي', en: 'Total' }), '', '', I18N.money(tIn), I18N.money(tOut), I18N.money(tBal)] : null
      };
    },

    /* Trial balance from approved journal entries */
    tb: function () {
      var map = {};
      Store.all('accounts').forEach(function (a) {
        map[a.id] = { acc: a, debit: 0, credit: 0, opening: Number(a.openingBalance) || 0 };
      });
      an().approved('journal').forEach(function (j) {
        if (!inRange(j.date) || !projOk(j.project)) return;
        (j.lines || []).forEach(function (l) {
          if (!map[l.account]) return;
          map[l.account].debit += Number(l.debit) || 0;
          map[l.account].credit += Number(l.credit) || 0;
        });
      });
      var rows = [], tD = 0, tC = 0;
      Object.keys(map).forEach(function (k) {
        var m = map[k];
        if (!m.debit && !m.credit && !m.opening) return;
        tD += m.debit; tC += m.credit;
        var bal = m.opening + m.debit - m.credit;
        rows.push({ cells: [
          '<span class="num">' + UI.esc(m.acc.code) + '</span>',
          '<strong>' + UI.esc(m.acc.name) + '</strong>',
          UI.esc(Schema.optionLabel(Schema.field('accounts', 'type'), m.acc.type)),
          money(m.opening), money(m.debit), money(m.credit),
          '<span class="' + (bal < 0 ? 'neg' : '') + '">' + I18N.money(bal) + '</span>'
        ] });
      });
      return {
        title: t('rep.tb'),
        headers: [L({ ar: 'الكود', en: 'Code' }), L({ ar: 'الحساب', en: 'Account' }), L({ ar: 'الطبيعة', en: 'Nature' }),
                  L({ ar: 'افتتاحي', en: 'Opening' }), L({ ar: 'مدين', en: 'Debit' }), L({ ar: 'دائن', en: 'Credit' }), L({ ar: 'الرصيد', en: 'Balance' })],
        rows: rows,
        footer: rows.length ? ['', L({ ar: 'الإجمالي', en: 'Total' }), '', '', I18N.money(tD), I18N.money(tC),
          (Math.abs(tD - tC) < 0.01 ? '<span class="pos">' + L({ ar: 'متوازن ✓', en: 'Balanced ✓' }) + '</span>' : '<span class="neg">' + I18N.money(tD - tC) + '</span>')] : null
      };
    },

    /* Subcontractor IPC summary */
    subcontract: function () {
      var rows = [], tW = 0, tR = 0, tN = 0, tP = 0;
      Store.all('subcontractors').forEach(function (s) {
        var work = 0, ret = 0, net = 0, paid = 0;
        an().approved('subIPCs').forEach(function (r) {
          if (r.subcontractor !== s.id || !inRange(r.date) || !projOk(r.project)) return;
          work += Number(r.currentWork) || 0;
          ret += Number(r.retention) || 0;
          net += Number(r.netDue) || 0;
        });
        an().approved('payments').forEach(function (r) {
          if (r.payeeType !== 'subcontractor' || !inRange(r.date)) return;
          if (r.beneficiary && r.beneficiary.indexOf(s.name) === -1) return;
          paid += Number(r.amount) || 0;
        });
        if (!work && !net) return;
        tW += work; tR += ret; tN += net; tP += paid;
        rows.push({ cells: [
          '<strong>' + UI.esc(s.name) + '</strong>',
          UI.esc(Schema.optionLabel(Schema.field('subcontractors', 'trade'), s.trade)),
          money(work), money(ret), money(net), money(paid),
          '<span class="' + (net - paid > 0 ? 'neg' : 'pos') + '">' + I18N.money(net - paid) + '</span>'
        ] });
      });
      return {
        title: t('rep.subcontract'),
        headers: [L({ ar: 'المقاول', en: 'Subcontractor' }), L({ ar: 'التخصص', en: 'Trade' }), L({ ar: 'قيمة الأعمال', en: 'Work value' }),
                  L({ ar: 'الاحتجازات', en: 'Retention' }), L({ ar: 'صافي المستحق', en: 'Net due' }), L({ ar: 'المسدد', en: 'Paid' }), L({ ar: 'المتبقي', en: 'Outstanding' })],
        rows: rows,
        footer: rows.length ? [L({ ar: 'الإجمالي', en: 'Total' }), '', I18N.money(tW), I18N.money(tR), I18N.money(tN), I18N.money(tP), I18N.money(tN - tP)] : null
      };
    },

    /* Payroll summary */
    payroll: function () {
      var rows = [], tot = 0;
      an().approved('payroll').forEach(function (p) {
        if (!inRange(p.date) || !projOk(p.project)) return;
        var count = (p.lines || []).length;
        var gross = 0, ded = 0;
        (p.lines || []).forEach(function (l) {
          gross += (Number(l.basic) || 0) + (Number(l.allowances) || 0) + (Number(l.overtime) || 0);
          ded += (Number(l.deductions) || 0) + (Number(l.insurance) || 0);
        });
        tot += Number(p.netTotal) || 0;
        rows.push({ cells: [
          '<strong class="num">' + UI.esc(p.docNo) + '</strong>',
          '<span class="num">' + UI.esc(p.period) + '</span>',
          UI.esc(Schema.refLabel({ ref: 'projects', refLabel: 'name' }, p.project)),
          num(count), money(gross), money(ded), money(p.netTotal)
        ] });
      });
      return {
        title: t('rep.payroll'),
        headers: [t('g.docNo'), L({ ar: 'الشهر', en: 'Period' }), L({ ar: 'المشروع', en: 'Project' }),
                  L({ ar: 'عدد الموظفين', en: 'Employees' }), L({ ar: 'الإجمالي', en: 'Gross' }), L({ ar: 'الخصومات', en: 'Deductions' }), L({ ar: 'الصافي', en: 'Net' })],
        rows: rows,
        footer: rows.length ? ['', '', '', '', '', L({ ar: 'الإجمالي', en: 'Total' }), I18N.money(tot)] : null
      };
    },

    /* Attendance summary per employee */
    attendance: function () {
      var map = {};
      Store.all('attendance').forEach(function (a) {
        if (!inRange(a.date) || !projOk(a.project)) return;
        if (!map[a.employee]) map[a.employee] = { present: 0, absent: 0, leave: 0, mission: 0, sick: 0, ot: 0 };
        var k = a.attStatus || 'present';
        if (map[a.employee][k] !== undefined) map[a.employee][k]++;
        map[a.employee].ot += Number(a.overtimeHours) || 0;
      });
      var rows = [];
      Object.keys(map).forEach(function (eid) {
        var e = Store.find('employees', eid);
        var m = map[eid];
        rows.push({ cells: [
          '<strong>' + UI.esc(e ? e.name : '—') + '</strong>',
          UI.esc(e ? e.jobTitle : '—'),
          num(m.present), num(m.absent), num(m.leave), num(m.sick), num(m.mission), num(m.ot, 1)
        ] });
      });
      return {
        title: t('rep.attendance'),
        headers: [L({ ar: 'الموظف', en: 'Employee' }), L({ ar: 'الوظيفة', en: 'Job title' }),
                  L({ ar: 'حضور', en: 'Present' }), L({ ar: 'غياب', en: 'Absent' }), L({ ar: 'إجازة', en: 'Leave' }),
                  L({ ar: 'مرضي', en: 'Sick' }), L({ ar: 'مأمورية', en: 'Mission' }), L({ ar: 'ساعات إضافية', en: 'Overtime' })],
        rows: rows
      };
    }
  };

  global.ReportsPage = { render: render };
})(window);
