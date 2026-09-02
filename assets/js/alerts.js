/* =========================================================================
   alerts.js — التنبيهات الذكية بالقواعد
                Rule-based alerts — no AI, no cost, never wrong
   -------------------------------------------------------------------------
   كل موظف يرى التنبيهات التي تخصّ عمله فقط، محسوبة من بياناته الفعلية.
   Each employee sees only the alerts relevant to their job, computed from
   real data every time the screen opens.

   ⭐ اضبط الأرقام في مربّع SETTINGS بالأسفل.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     SETTINGS — عدّل هذه الأرقام حسب سياسة الشركة
     ═══════════════════════════════════════════════════════════════════ */
  var SETTINGS = {
    invoiceDueWithinDays:   7,    /* نبّه قبل استحقاق فاتورة المورد بـ    */
    contractExpiryDays:     60,   /* نبّه قبل انتهاء عقد أو ترخيص بـ      */
    licenceExpiryDays:      45,   /* نبّه قبل انتهاء رخصة معدة بـ         */
    docStaleDays:           5,    /* مستند معلّق في المراجعة أكثر من      */
    ipcUncollectedDays:     45,   /* مستخلص عميل لم يُحصّل منذ            */
    stocktakeOverdueDays:   30,   /* مخزن لم يُجرد منذ                    */
    custodyOverdueDays:     30,   /* عهدة لم تُسوَّ منذ                    */
    maintenanceDueDays:     14,   /* صيانة معدة مستحقة خلال               */
    budgetWarnPercent:      90,   /* تنبيه عند بلوغ الموازنة              */
    contractEndingDays:     30    /* عقد موظف ينتهي خلال                  */
  };
  /* ═══════════════════════════════════════════════════════════════════ */

  var LEVEL = { danger: 3, warn: 2, info: 1 };

  function daysBetween(a, b) {
    return Math.round((new Date(a) - new Date(b)) / 86400000);
  }
  function daysUntil(d) { return daysBetween(d, new Date()); }
  function daysSince(d) { return daysBetween(new Date(), d); }
  function approved(table) {
    return Store.all(table).filter(function (r) { return r.status === 'approved'; });
  }
  function A() { return Dashboard.analytics; }

  /* helper to push an alert */
  function mk(list, level, module, icon, ar, en, recId) {
    list.push({
      level: level, module: module, icon: icon,
      text: L({ ar: ar, en: en }), recordId: recId || null
    });
  }

  /* ------------------------------------------------------------------
     Every rule. Each returns alerts only if the user can see that screen.
     ------------------------------------------------------------------ */
  function build() {
    var out = [];
    var u = Auth.current();
    if (!u) return out;
    var can = function (m) { return Auth.canSee(m); };

    /* ── المخزون تحت الحد ─────────────────────────────────────────── */
    if (can('items')) {
      Store.all('items').forEach(function (it) {
        var lvl = Number(it.reorderLevel) || 0;
        if (!lvl) return;
        var qty = 0;
        try { qty = A().stockQty(it.id); } catch (e) { return; }
        if (qty < lvl) {
          var unit = Schema.optionLabel(Schema.field('items', 'baseUnit'), it.baseUnit);
          mk(out, qty <= 0 ? 'danger' : 'warn', 'items', 'box',
            'الصنف «' + it.name + '» رصيده ' + I18N.num(qty, 1) + ' ' + unit +
              ' والحد الأدنى ' + I18N.num(lvl, 0) + ' — اطلب الآن',
            'Item "' + it.name + '" is at ' + I18N.num(qty, 1) + ' ' + unit +
              ' against a reorder level of ' + I18N.num(lvl, 0) + ' — order now',
            it.id);
        }
      });
    }

    /* ── فواتير موردين تستحق قريباً ────────────────────────────────── */
    if (can('supplierInvoices')) {
      approved('supplierInvoices').forEach(function (inv) {
        /* MoneyOwed إن كان محمَّلاً يستبدل الحقل readonly الميت بالمجموع
           الحقيقي من سندات الصرف المعتمدة — بلا تحميله يبقى السلوك القديم
           حرفياً. if MoneyOwed loaded, it replaces the dead readonly field
           with the real sum of approved payment vouchers — without it,
           the old behaviour is exact. */
        var due = Number(inv.grandTotal || 0) - (global.MoneyOwed ? MoneyOwed.paidOf(inv.id) : Number(inv.paidAmount || 0));
        if (due <= 0.5 || !inv.dueDate) return;
        var d = daysUntil(inv.dueDate);
        var sup = Store.find('suppliers', inv.supplier);
        if (d < 0) {
          mk(out, 'danger', 'supplierInvoices', 'file',
            'فاتورة ' + (inv.docNo || '') + ' لـ«' + (sup ? sup.name : '') + '» متأخرة ' +
              Math.abs(d) + ' يوم — المستحق ' + I18N.money(due),
            'Invoice ' + (inv.docNo || '') + ' for "' + (sup ? sup.name : '') + '" is ' +
              Math.abs(d) + ' days overdue — ' + I18N.money(due) + ' outstanding',
            inv.id);
        } else if (d <= SETTINGS.invoiceDueWithinDays) {
          mk(out, 'warn', 'supplierInvoices', 'file',
            'فاتورة ' + (inv.docNo || '') + ' لـ«' + (sup ? sup.name : '') + '» تستحق خلال ' +
              d + ' يوم — ' + I18N.money(due),
            'Invoice ' + (inv.docNo || '') + ' for "' + (sup ? sup.name : '') + '" is due in ' +
              d + ' days — ' + I18N.money(due),
            inv.id);
        }
      });
    }

    /* ── تجاوز الموازنة ───────────────────────────────────────────── */
    if (can('projects')) {
      Auth.scopeRows('projects', Store.all('projects')).forEach(function (p) {
        if (p.status !== 'active') return;
        var b = 0, a = 0;
        try { b = A().budgetOf(p.id); a = A().actualCost(p.id); } catch (e) { return; }
        if (b <= 0) return;
        var pct = a / b * 100;
        if (pct > 100) {
          mk(out, 'danger', 'projects', 'target',
            'مشروع «' + p.name + '» تجاوز موازنته بنسبة ' + I18N.pct(pct - 100, 1) +
              ' (' + I18N.money(a) + ' مقابل ' + I18N.money(b) + ')',
            'Project "' + p.name + '" is ' + I18N.pct(pct - 100, 1) + ' over budget (' +
              I18N.money(a) + ' vs ' + I18N.money(b) + ')',
            p.id);
        } else if (pct >= SETTINGS.budgetWarnPercent) {
          mk(out, 'warn', 'projects', 'target',
            'مشروع «' + p.name + '» بلغ ' + I18N.pct(pct, 1) + ' من موازنته',
            'Project "' + p.name + '" has used ' + I18N.pct(pct, 1) + ' of its budget',
            p.id);
        }
      });
    }

    /* ── مستندات معلّقة في المراجعة ───────────────────────────────── */
    Schema.MODULES.filter(function (m) { return m.workflow && can(m.id); }).forEach(function (m) {
      Store.all(m.table).forEach(function (r) {
        if (['pending', 'reviewed'].indexOf(r.status) === -1) return;
        var since = r.submittedAt || r.createdAt;
        var d = daysSince(since);
        /* 🔴 الصيغة موجَبة عمداً، لا سالبة. أُصلح ٢ سبتمبر ٢٠٢٦.
           كان: `if (d < SETTINGS.docStaleDays) return;`
           وحين يخلو السجلّ من submittedAt ومن createdAt معاً تصير d قيمة
           NaN — **وكل مقارنة مع NaN تعطي false**، فلا يعود الحارس، فيمرّ
           السجلّ ويُطبع للموظفين «معلّق منذ NaN يوم».
           الصيغة الموجَبة `!(d >= …)` ترشّح NaN **بالبناء**: NaN >= أي رقم
           = false، فالنفي = true، فيعود الحارس. لا فحص إضافي على NaN،
           والشرط نفسه هو الذي يحمي.
           🔴 Positive form on purpose, not negative. Fixed 2 Sep 2026.
           It was `if (d < SETTINGS.docStaleDays) return;` and when a row has
           neither submittedAt nor createdAt, d is NaN — and EVERY comparison
           with NaN is false, so the guard did not return, the row passed,
           and staff were shown «معلّق منذ NaN يوم».
           The positive form filters NaN BY CONSTRUCTION: NaN >= anything is
           false, so the negation is true and the guard returns. No separate
           NaN test is needed; the condition itself protects. */
        if (!(d >= SETTINGS.docStaleDays)) return;
        mk(out, d > SETTINGS.docStaleDays * 2 ? 'danger' : 'warn', m.id, m.icon,
          (L(m.label)) + ' ' + (r.docNo || '') + ' معلّق منذ ' + d + ' يوم بانتظار ' +
            (r.status === 'pending' ? 'المراجعة' : 'الاعتماد'),
          (L(m.label)) + ' ' + (r.docNo || '') + ' has been waiting ' + d + ' days for ' +
            (r.status === 'pending' ? 'review' : 'approval'),
          r.id);
      });
    });

    /* ── مستخلصات عملاء لم تُحصّل ─────────────────────────────────── */
    if (can('clientIPCs')) {
      approved('clientIPCs').forEach(function (ipc) {
        /* نفس منطق فواتير الموردين أعلاه، لكن لسندات القبض المعتمدة
           same logic as the supplier invoices above, but for approved
           receipt vouchers */
        var due = Number(ipc.netDue || 0) - (global.MoneyOwed ? MoneyOwed.collectedOf(ipc.id) : Number(ipc.collectedAmount || 0));
        if (due <= 0.5) return;
        var d = daysSince(ipc.date);
        /* 🔴 صيغة موجَبة — انظر الشرح الكامل عند الحارس المُصلَح أوّلاً في هذا
           الملف (مستندات معلّقة). هنا **لا يوجد فحص على وجود ipc.date إطلاقاً**،
           فمستخلص عميل بلا تاريخ يُعطي NaN ويمرّ ويُطبع «متأخرة NaN يوم» على
           شاشة موظّف — وهذه شاشة مالية، والعميل هيئة الطرق.
           🔴 Positive form — full reasoning at the first repaired guard in this
           file (pending documents). Here there is NO presence check on
           ipc.date at all, so a client certificate with no date gives NaN,
           passes, and prints «متأخرة NaN يوم» on a staff screen — and this is
           a money screen, for هيئة الطرق. */
        if (!(d >= SETTINGS.ipcUncollectedDays)) return;
        var cust = Store.find('customers', ipc.customer);
        mk(out, 'danger', 'clientIPCs', 'receipt',
          'مستخلص ' + (ipc.docNo || '') + ' لـ«' + (cust ? cust.name : '') + '» لم يُحصّل منذ ' +
            d + ' يوم — المستحق ' + I18N.money(due),
          'IPC ' + (ipc.docNo || '') + ' for "' + (cust ? cust.name : '') + '" uncollected for ' +
            d + ' days — ' + I18N.money(due) + ' outstanding',
          ipc.id);
      });
    }

    /* ── عقود وتراخيص قاربت الانتهاء ──────────────────────────────── */
    if (can('legalDocs')) {
      Store.all('legalDocs').forEach(function (dc) {
        if (!dc.expiryDate || dc.legalStatus === 'closed') return;
        var d = daysUntil(dc.expiryDate);
        /* 🔴 صيغة موجَبة. الوجود مفحوص فوق، فالباقي هو **تاريخ مشوّه** يأتي من
           استيراد أو مسوّدة قديمة — يُعطي NaN فيمرّ. `!(d <= س)` ترشّحه بالبناء،
           وهي مطابقة تماماً لـ`d > س` في كل رقم حقيقي.
           🔴 Positive form. Presence is checked above, so what remains is a
           MALFORMED date from an import or an old draft — it gives NaN and
           passes. `!(d <= x)` filters it by construction and is identical to
           `d > x` for every real number. */
        if (!(d <= SETTINGS.contractExpiryDays)) return;
        mk(out, d < 0 ? 'danger' : (d <= 15 ? 'danger' : 'warn'), 'legalDocs', 'scale',
          d < 0 ? ('«' + dc.title + '» منتهي منذ ' + Math.abs(d) + ' يوم')
                : ('«' + dc.title + '» ينتهي خلال ' + d + ' يوم'),
          d < 0 ? ('"' + dc.title + '" expired ' + Math.abs(d) + ' days ago')
                : ('"' + dc.title + '" expires in ' + d + ' days'),
          dc.id);
      });
    }

    /* ── تراخيص وصيانة المعدات ────────────────────────────────────── */
    if (can('equipment')) {
      Store.all('equipment').forEach(function (eq) {
        if (eq.status === 'inactive') return;
        if (eq.licenseExpiry) {
          var d = daysUntil(eq.licenseExpiry);
          if (d <= SETTINGS.licenceExpiryDays) {
            mk(out, d < 0 ? 'danger' : 'warn', 'equipment', 'truck-2',
              d < 0 ? ('رخصة «' + eq.name + '» منتهية منذ ' + Math.abs(d) + ' يوم')
                    : ('رخصة «' + eq.name + '» تنتهي خلال ' + d + ' يوم'),
              d < 0 ? ('Licence for "' + eq.name + '" expired ' + Math.abs(d) + ' days ago')
                    : ('Licence for "' + eq.name + '" expires in ' + d + ' days'),
              eq.id);
          }
        }
        if (eq.condition === 'broken') {
          mk(out, 'warn', 'equipment', 'wrench',
            'المعدة «' + eq.name + '» متوقفة عن العمل',
            'Equipment "' + eq.name + '" is out of service', eq.id);
        }
      });
    }
    if (can('equipmentLogs')) {
      Store.all('equipmentLogs').forEach(function (lg) {
        if (!lg.nextService) return;
        var d = daysUntil(lg.nextService);
        /* 🔴 صيغة موجَبة — نفس حالة العقود أعلاه: الوجود مفحوص، والمتبقّي تاريخ
           مشوّه. 🔴 Positive form — same case as the contracts above: presence
           is checked, what remains is a malformed date. */
        if (!(d <= SETTINGS.maintenanceDueDays)) return;
        var eq = Store.find('equipment', lg.equipment);
        mk(out, d < 0 ? 'danger' : 'warn', 'equipmentLogs', 'wrench',
          'صيانة «' + (eq ? eq.name : '') + '» ' + (d < 0 ? 'متأخرة ' + Math.abs(d) + ' يوم' : 'مستحقة خلال ' + d + ' يوم'),
          'Service for "' + (eq ? eq.name : '') + '" ' + (d < 0 ? 'overdue by ' + Math.abs(d) + ' days' : 'due in ' + d + ' days'),
          lg.id);
      });
    }

    /* ── جرد متأخر ────────────────────────────────────────────────── */
    if (can('stockCounts') && can('warehouses')) {
      Store.all('warehouses').forEach(function (wh) {
        if (wh.status === 'inactive') return;
        var last = null;
        approved('stockCounts').forEach(function (sc) {
          if (sc.warehouse !== wh.id) return;
          if (!last || new Date(sc.date) > new Date(last)) last = sc.date;
        });
        var d = last ? daysSince(last) : 999;
        /* 🔴 صيغة موجَبة. الحالة «لم يُجرد إطلاقاً» محميّة بالـ999، لكن جرداً
           **بتاريخ مشوّه** يُعطي NaN فيمرّ ويُطبع «لم يُجرد منذ NaN يوم» — وهذه
           شاشة أ. أحمد بالذات.
           🔴 Positive form. The "never counted" case is protected by the 999,
           but a stock count with a MALFORMED date gives NaN, passes, and
           prints «لم يُجرد منذ NaN يوم» — and this is أ. أحمد's own screen. */
        if (!(d >= SETTINGS.stocktakeOverdueDays)) return;
        mk(out, 'warn', 'warehouses', 'clipboard',
          'مخزن «' + wh.name + '» ' + (last ? 'لم يُجرد منذ ' + d + ' يوم' : 'لم يُجرد إطلاقاً'),
          'Warehouse "' + wh.name + '" ' + (last ? 'not counted for ' + d + ' days' : 'has never been counted'),
          wh.id);
      });
    }

    /* ── عهد لم تُسوَّ ─────────────────────────────────────────────── */
    if (can('cashAccounts')) {
      Store.all('cashAccounts').forEach(function (ca) {
        if (ca.kind !== 'custody' || ca.status === 'inactive') return;
        var bal = 0;
        try { bal = A().cashBalance(ca.id); } catch (e) { return; }
        if (bal <= 0) return;
        var emp = Store.find('employees', ca.custodian);
        mk(out, 'warn', 'cashAccounts', 'wallet',
          'عهدة «' + (emp ? emp.name : ca.name) + '» رصيدها ' + I18N.money(bal) + ' — تحتاج تسوية',
          'Custody of "' + (emp ? emp.name : ca.name) + '" holds ' + I18N.money(bal) + ' — needs settlement',
          ca.id);
      });
    }

    /* ── عقود موظفين تنتهي ────────────────────────────────────────── */
    if (can('employees')) {
      Store.all('employees').forEach(function (e) {
        /* HRSignals إن كان محمَّلاً يقرأ أيضاً عقود employmentContracts —
           بلا تحميله يبقى السلوك القديم (قراءة الحقل القديم فقط) حرفياً.
           if HRSignals loaded, it also reads employmentContracts —
           without it, old behaviour (old field only) is exact. */
        var contractEnd = global.HRSignals ? HRSignals.contractEndOf(e) : e.contractEnd;
        if (e.status !== 'active' || !contractEnd) return;
        var d = daysUntil(contractEnd);
        /* 🔴 صيغة موجَبة — الوجود مفحوص فوق، والمتبقّي تاريخ عقد مشوّه. وعقود
           الموظّفين شاشة يقرأها أ. محمد عمارة.
           🔴 Positive form — presence is checked above, what remains is a
           malformed contract date. Employee contracts are a screen
           أ. محمد عمارة reads. */
        if (!(d <= SETTINGS.contractEndingDays)) return;
        mk(out, d < 0 ? 'danger' : 'warn', 'employees', 'user',
          'عقد «' + e.name + '» ' + (d < 0 ? 'منتهٍ منذ ' + Math.abs(d) + ' يوم' : 'ينتهي خلال ' + d + ' يوم'),
          'Contract for "' + e.name + '" ' + (d < 0 ? 'expired ' + Math.abs(d) + ' days ago' : 'ends in ' + d + ' days'),
          e.id);
      });
    }

    /* ── مسير الرواتب لم يُعد ─────────────────────────────────────── */
    if (can('payroll')) {
      var now = new Date();
      var period = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      var has = Store.all('payroll').some(function (p) { return p.period === period; });
      if (!has && now.getDate() >= 20) {
        mk(out, 'warn', 'payroll', 'banknote',
          'مسير رواتب شهر ' + period + ' لم يُعد بعد',
          'Payroll for ' + period + ' has not been prepared yet', null);
      }
    }

    /* ── تذاكر دعم فني مفتوحة ─────────────────────────────────────── */
    if (can('itTickets')) {
      Store.all('itTickets').forEach(function (tk) {
        if (['open', 'inprogress'].indexOf(tk.ticketStatus) === -1) return;
        var d = daysSince(tk.date);
        /* 🔴 صيغة موجَبة. ولا فحص على وجود tk.date هنا أيضاً، فتذكرة دعم بلا
           تاريخ تُطبع «مفتوح منذ NaN يوم».
           🔴 Positive form. No presence check on tk.date here either, so a
           support ticket with no date prints «مفتوح منذ NaN يوم». */
        if (!(d >= 3)) return;
        mk(out, tk.priority === 'urgent' ? 'danger' : 'info', 'itTickets', 'life-buoy',
          'طلب دعم «' + tk.subject + '» مفتوح منذ ' + d + ' يوم',
          'Ticket "' + tk.subject + '" open for ' + d + ' days', tk.id);
      });
    }

    /* ── قيود غير متوازنة في المسودات ─────────────────────────────── */
    if (can('journal')) {
      Store.all('journal').forEach(function (j) {
        if (j.status !== 'draft') return;
        var d = 0, c = 0;
        (j.lines || []).forEach(function (l) { d += Number(l.debit) || 0; c += Number(l.credit) || 0; });
        if (Math.abs(d - c) > 0.009) {
          mk(out, 'warn', 'journal', 'edit',
            'قيد ' + (j.docNo || '') + ' غير متوازن بفارق ' + I18N.money(Math.abs(d - c)),
            'Journal ' + (j.docNo || '') + ' is out of balance by ' + I18N.money(Math.abs(d - c)),
            j.id);
        }
      });
    }

    /* رتّب: الأخطر أولاً */
    out.sort(function (a, b) { return LEVEL[b.level] - LEVEL[a.level]; });
    return out;
  }

  /* cache within a single render pass so we don't recompute six times */
  var cache = null, cacheUser = null, cacheAt = 0;
  function list() {
    var u = Auth.current();
    var uid = u ? u.id : null;
    if (cache && cacheUser === uid && (Date.now() - cacheAt) < 1500) return cache;
    cache = build(); cacheUser = uid; cacheAt = Date.now();
    return cache;
  }
  function invalidate() { cache = null; }
  function count() { return list().length; }
  function countBy(level) {
    return list().filter(function (a) { return a.level === level; }).length;
  }

  /* ------------------------------------------------------------------
     Full screen
     ------------------------------------------------------------------ */
  function render(host) {
    var all = list();
    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('alert', 22) + ' ' + t('alerts.title') + '</h1>' +
      '<p class="page-sub">' + t('alerts.sub') + '</p></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-outline btn-sm" id="alPrint">' + UI.icon('printer', 15) + ' ' + t('g.print') + '</button>' +
      '</div></div>';

    if (!all.length) {
      html += '<div class="card"><div class="card-body"><div class="empty-state">' +
        UI.icon('check', 46) + '<h4>' + t('alerts.none') + '</h4></div></div></div>';
      host.innerHTML = html;
      return;
    }

    html += '<div class="kpi-grid">' +
      UI.kpi({ label: t('alerts.danger'), value: '<span class="num">' + countBy('danger') + '</span>', icon: 'alert', tone: 'danger' }) +
      UI.kpi({ label: t('alerts.warn'), value: '<span class="num">' + countBy('warn') + '</span>', icon: 'alert', tone: 'warn' }) +
      UI.kpi({ label: t('alerts.info'), value: '<span class="num">' + countBy('info') + '</span>', icon: 'eye', tone: 'info' }) +
      '</div>';

    ['danger', 'warn', 'info'].forEach(function (lvl) {
      var items = all.filter(function (a) { return a.level === lvl; });
      if (!items.length) return;
      html += '<div class="card mb-2"><div class="card-head">' +
        '<h3 class="card-title">' + t('alerts.' + lvl) + '</h3>' +
        '<span class="badge ' + (lvl === 'danger' ? 'b-rejected' : lvl === 'warn' ? 'b-pending' : 'b-info') + ' plain num">' +
        items.length + '</span></div><div class="card-body flush">';
      items.forEach(function (a) {
        html += '<div class="alert-row" data-go="' + UI.attr(a.module) + '" data-rid="' + UI.attr(a.recordId || '') + '">' +
          '<span class="al-ic ' + lvl + '">' + UI.icon(a.icon, 16) + '</span>' +
          '<span class="al-tx">' + UI.esc(a.text) + '</span>' +
          '<span class="al-mod">' + UI.esc(L(Schema.get(a.module) ? Schema.get(a.module).label : { ar: '', en: '' })) + '</span>' +
          '</div>';
      });
      html += '</div></div>';
    });

    host.innerHTML = html;

    host.querySelectorAll('[data-go]').forEach(function (row) {
      row.onclick = function () {
        var m = row.getAttribute('data-go'), rid = row.getAttribute('data-rid');
        App.go(m);
        if (rid) setTimeout(function () { try { EntityPage.openDetail(m, rid); } catch (e) {} }, 220);
      };
    });
    var pb = document.getElementById('alPrint');
    if (pb) pb.onclick = function () { window.print(); };
  }

  /* compact block for the dashboard */
  function dashboardHTML(limit) {
    var all = list().slice(0, limit || 6);
    if (!all.length) {
      return '<div class="empty-state" style="padding:26px">' + UI.icon('check', 34) +
        '<p>' + t('alerts.none') + '</p></div>';
    }
    var h = '';
    all.forEach(function (a) {
      h += '<div class="alert-row" data-alert="' + UI.attr(a.module) + '" data-rid="' + UI.attr(a.recordId || '') + '">' +
        '<span class="al-ic ' + a.level + '">' + UI.icon(a.icon, 15) + '</span>' +
        '<span class="al-tx">' + UI.esc(a.text) + '</span></div>';
    });
    return h;
  }

  global.Alerts = {
    SETTINGS: SETTINGS,
    list: list, count: count, countBy: countBy, invalidate: invalidate,
    render: render, dashboardHTML: dashboardHTML
  };
})(window);
