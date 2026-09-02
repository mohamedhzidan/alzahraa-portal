/* =========================================================================
   inspector.js — المدقّق: يبحث عن الأخطاء التي لا يراها أحد
                  The inspector — finds the mistakes nobody notices
   -------------------------------------------------------------------------
   يقارن المستندات ببعضها ويكشف التناقضات: كمية مستلمة أكثر من المعتمدة،
   سعر فاتورة مختلف عن أمر الشراء، تقسيم مشتريات للالتفاف على حد الاعتماد،
   احتجاز محسوب خطأ، سداد مكرر، مخزون راكد... وغيرها.

   Cross-checks documents against each other and surfaces contradictions:
   over-receipt, price drift, split purchases dodging approval limits,
   wrong retention, duplicate payment, dead stock, and more.

   كل نتيجة تحمل: الخطورة · الدليل · ما يجب عمله.
   Every finding carries: severity, evidence, and what to do about it.
   ========================================================================= */
(function (global) {
  'use strict';

  var TOL = {
    price: 3,          /* % فرق سعر مقبول بين الاعتماد والفاتورة */
    qty: 0,            /* % زيادة كمية مقبولة عند الاستلام */
    split: 30,         /* أيام: نافذة كشف تقسيم المشتريات */
    deadStock: 120,    /* يوم بلا حركة = مخزون راكد */
    priceJump: 15,     /* % ارتفاع سعر يستحق التنبيه */
    dupWindow: 14      /* أيام: نافذة كشف السداد المكرر */
  };

  function A() { return Dashboard.analytics; }
  function ar() { return I18N.getLang() === 'ar'; }
  function approved(t) { return Store.all(t).filter(function (r) { return r.status === 'approved'; }); }
  function days(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
  function since(d) { return days(new Date(), d); }
  function num(v) { return Number(v) || 0; }
  function pctDiff(a, b) { return b ? Math.abs(a - b) / Math.abs(b) * 100 : (a ? 100 : 0); }
  function name(table, id) { var r = Store.find(table, id); return r ? (r.name || r.docNo || r.title || '') : ''; }

  /* كل فحص يُنتج نتيجة بهذا الشكل */
  function F(sev, area, module, recId, title, evidence, action) {
    return {
      severity: sev,               /* 'critical' | 'high' | 'medium' | 'low' */
      area: area,                  /* لأي دور تخصّ */
      module: module, recordId: recId,
      title: title, evidence: evidence, action: action
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     CHECKS — كل دالة تُرجع مصفوفة نتائج
     ══════════════════════════════════════════════════════════════════ */
  var CHECKS = {};

  /* ── ١ · استلام أكثر من المعتمد ─────────────────────────────────── */
  CHECKS.overReceipt = function () {
    var out = [];
    approved('goodsReceipts').forEach(function (grn) {
      if (!grn.purchaseApproval) return;
      var pa = Store.find('purchaseApprovals', grn.purchaseApproval);
      if (!pa) return;

      /* Purchase-approval lines hold free text; receipts hold item ids.
         Try to match by name, and fall back to comparing document totals
         so a genuine over-receipt is never missed just because the
         wording differed. */
      function norm(x) {
        return String(x || '').replace(/[\s\u064B-\u0652]/g, '').toLowerCase();
      }
      var ordered = {}, orderedTotal = 0;
      (pa.lines || []).forEach(function (l) {
        var k = norm(l.item);
        if (k) ordered[k] = (ordered[k] || 0) + num(l.qty);
        orderedTotal += num(l.qty);
      });

      var matchedAny = false, acceptedTotal = 0;
      (grn.lines || []).forEach(function (l) {
        var itemName = name('items', l.item) || String(l.item || '');
        var key = norm(itemName);
        acceptedTotal += num(l.qtyAccepted);

        var ord = ordered[key];
        if (ord === undefined) {
          var hit = Object.keys(ordered).filter(function (x) {
            return x && key && (x.indexOf(key) !== -1 || key.indexOf(x) !== -1);
          })[0];
          ord = hit ? ordered[hit] : undefined;
        }
        if (ord === undefined || ord <= 0) return;
        matchedAny = true;
        var got = num(l.qtyAccepted);
        if (got > ord * (1 + TOL.qty / 100) + 0.001) {
          out.push(F('high', 'stores', 'goodsReceipts', grn.id,
            ar() ? 'استلام أكثر من الكمية المعتمدة' : 'Received more than approved',
            ar() ? ('إذن ' + (grn.docNo || '') + ': استُلم ' + I18N.num(got, 2) + ' من «' + itemName +
                    '» بينما المعتمد في ' + (pa.docNo || '') + ' هو ' + I18N.num(ord, 2))
                 : ('GRN ' + (grn.docNo || '') + ': received ' + I18N.num(got, 2) + ' vs approved ' + I18N.num(ord, 2)),
            ar() ? 'راجع مع المورد والمشتريات: إما إعادة الفائض أو إصدار اعتماد زيادة موقّع.'
                 : 'Either return the excess or issue a signed variation.'));
        }
      });

      /* fallback: names never matched, so compare the totals instead */
      if (!matchedAny && orderedTotal > 0 && acceptedTotal > orderedTotal * 1.001) {
        out.push(F('high', 'stores', 'goodsReceipts', grn.id,
          ar() ? 'إجمالي الكميات المستلمة أكبر من المعتمد'
               : 'Total received quantity exceeds the approval',
          ar() ? ('إذن ' + (grn.docNo || '') + ': إجمالي المستلم ' + I18N.num(acceptedTotal, 2) +
                  ' مقابل معتمد ' + I18N.num(orderedTotal, 2) + ' في ' + (pa.docNo || '') +
                  ' (أسماء الأصناف غير متطابقة بين المستندين)')
               : ('GRN ' + (grn.docNo || '') + ': received ' + I18N.num(acceptedTotal, 2) +
                  ' vs approved ' + I18N.num(orderedTotal, 2)),
          ar() ? 'وحّد أسماء الأصناف بين اعتماد الشراء والاستلام، وراجع سبب الزيادة.'
               : 'Align item naming between the approval and the receipt, and check the excess.'));
      }
    });
    return out;
  };

  /* ── ٢ · سعر الفاتورة يختلف عن اعتماد الشراء ───────────────────── */
  CHECKS.priceDrift = function () {
    var out = [];
    approved('supplierInvoices').forEach(function (inv) {
      if (!inv.purchaseApproval) return;
      var pa = Store.find('purchaseApprovals', inv.purchaseApproval);
      if (!pa) return;
      var paVal = num(pa.subTotal), invVal = num(inv.subTotal);
      if (paVal <= 0 || invVal <= 0) return;
      var d = pctDiff(invVal, paVal);
      if (d > TOL.price) {
        var higher = invVal > paVal;
        out.push(F(higher && d > 10 ? 'critical' : 'high', 'finance', 'supplierInvoices', inv.id,
          ar() ? ('قيمة الفاتورة ' + (higher ? 'أعلى' : 'أقل') + ' من اعتماد الشراء')
               : ('Invoice value ' + (higher ? 'above' : 'below') + ' the purchase approval'),
          ar() ? ('فاتورة ' + (inv.docNo || '') + ': ' + I18N.money(invVal) + ' مقابل اعتماد ' +
                  (pa.docNo || '') + ' بقيمة ' + I18N.money(paVal) + ' — فرق ' + I18N.pct(d, 1))
               : ('Invoice ' + (inv.docNo || '') + ': ' + I18N.money(invVal) + ' vs approval ' + I18N.money(paVal)),
          ar() ? 'لا تسدّد قبل تسوية الفرق كتابةً مع المورد أو إعادة اعتماد القيمة الجديدة.'
               : 'Do not pay until the difference is settled in writing.'));
      }
    });
    return out;
  };

  /* ── ٣ · فاتورة بلا إذن استلام ─────────────────────────────────── */
  CHECKS.invoiceWithoutReceipt = function () {
    var out = [];
    approved('supplierInvoices').forEach(function (inv) {
      if (inv.goodsReceipt) return;
      if (num(inv.grandTotal) <= 0) return;
      out.push(F('high', 'finance', 'supplierInvoices', inv.id,
        ar() ? 'فاتورة مورد بلا إذن استلام' : 'Supplier invoice with no goods receipt',
        ar() ? ('فاتورة ' + (inv.docNo || '') + ' بقيمة ' + I18N.money(inv.grandTotal) +
                ' لـ«' + name('suppliers', inv.supplier) + '» غير مربوطة بأي إذن استلام')
             : ('Invoice ' + (inv.docNo || '') + ' worth ' + I18N.money(inv.grandTotal) + ' has no linked receipt'),
        ar() ? 'تأكد أن البضاعة استُلمت فعلاً قبل السداد. لو كانت خدمة، اربطها بمحضر إنجاز.'
             : 'Confirm the goods were actually received before paying.'));
    });
    return out;
  };

  /* ── ٤ · سداد مكرر محتمل ───────────────────────────────────────── */
  CHECKS.duplicatePayment = function () {
    var out = [], pays = approved('payments'), seen = {};
    pays.forEach(function (p) {
      if (!p.supplier || num(p.amount) <= 0) return;
      var key = p.supplier + '|' + Math.round(num(p.amount));
      (seen[key] = seen[key] || []).push(p);
    });
    Object.keys(seen).forEach(function (k) {
      var g = seen[k];
      if (g.length < 2) return;
      g.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      for (var i = 1; i < g.length; i++) {
        if (Math.abs(days(g[i].date, g[i - 1].date)) <= TOL.dupWindow) {
          out.push(F('critical', 'finance', 'payments', g[i].id,
            ar() ? 'سداد مكرر محتمل لنفس المورد بنفس المبلغ'
                 : 'Possible duplicate payment',
            ar() ? ('سندان ' + (g[i - 1].docNo || '') + ' و' + (g[i].docNo || '') + ' لـ«' +
                    name('suppliers', g[i].supplier) + '» بنفس المبلغ ' + I18N.money(g[i].amount) +
                    ' خلال ' + Math.abs(days(g[i].date, g[i - 1].date)) + ' يوم')
                 : ('Two vouchers to the same supplier for ' + I18N.money(g[i].amount) + ' days apart'),
            ar() ? 'راجع كشف حساب المورد فوراً. لو تأكد التكرار، أنشئ مستنداً عكسياً واطلب الاسترداد.'
                 : 'Check the supplier statement immediately and reverse if confirmed.'));
        }
      }
    });
    return out;
  };

  /* ── ٥ · السداد يتجاوز رصيد الفاتورة ───────────────────────────── */
  CHECKS.overPayment = function () {
    var out = [];
    approved('supplierInvoices').forEach(function (inv) {
      /* MoneyOwed إن وُجد يستبدل الحقل الميت بالمجموع الحقيقي — بلا
         تحميله السلوك القديم حرفياً.
         if MoneyOwed exists it replaces the dead field with the real
         sum — without it, old behaviour is exact. */
      var paid = global.MoneyOwed ? MoneyOwed.paidOf(inv.id) : num(inv.paidAmount), total = num(inv.grandTotal);
      if (total > 0 && paid > total + 0.5) {
        out.push(F('critical', 'finance', 'supplierInvoices', inv.id,
          ar() ? 'المسدَّد أكبر من قيمة الفاتورة' : 'Paid more than the invoice value',
          ar() ? ('فاتورة ' + (inv.docNo || '') + ': مسدَّد ' + I18N.money(paid) +
                  ' من إجمالي ' + I18N.money(total) + ' — زيادة ' + I18N.money(paid - total))
               : ('Invoice ' + (inv.docNo || '') + ': paid ' + I18N.money(paid) + ' of ' + I18N.money(total)),
          ar() ? 'اطلب استرداد الفرق أو خصمه من الفاتورة التالية، وسجّل ذلك كتابةً.'
               : 'Recover the excess or offset it against the next invoice.'));
      }
    });
    return out;
  };

  /* ── ٦ · تقسيم مشتريات للالتفاف على حد الاعتماد 🔴 ─────────────── */
  CHECKS.splitPurchases = function () {
    var out = [];
    if (!global.Rules) return out;
    var limits = Rules.SETTINGS.approvalLimits || [];
    if (!limits.length) return out;
    var threshold = limits[0].upTo;
    if (!isFinite(threshold)) return out;

    var byKey = {};
    approved('purchaseApprovals').forEach(function (pa) {
      var k = (pa.supplier || 'none') + '|' + (pa.project || 'none');
      (byKey[k] = byKey[k] || []).push(pa);
    });
    Object.keys(byKey).forEach(function (k) {
      var g = byKey[k].slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      for (var i = 0; i < g.length; i++) {
        var window_ = [g[i]], sum = num(g[i].grandTotal);
        for (var j = i + 1; j < g.length; j++) {
          if (Math.abs(days(g[j].date, g[i].date)) > TOL.split) break;
          window_.push(g[j]); sum += num(g[j].grandTotal);
        }
        if (window_.length >= 3 && sum > threshold &&
            window_.every(function (x) { return num(x.grandTotal) < threshold; })) {
          out.push(F('critical', 'procurement', 'purchaseApprovals', window_[0].id,
            ar() ? 'اشتباه تقسيم مشتريات للالتفاف على حد الاعتماد'
                 : 'Possible split purchasing to dodge the approval limit',
            ar() ? (window_.length + ' اعتمادات شراء لنفس المورد «' + name('suppliers', window_[0].supplier) +
                    '» خلال ' + TOL.split + ' يوم بإجمالي ' + I18N.money(sum) +
                    '، كل واحد منها أقل من حد الاعتماد ' + I18N.money(threshold))
                 : (window_.length + ' approvals to the same supplier within ' + TOL.split +
                    ' days totalling ' + I18N.money(sum) + ', each below the ' + I18N.money(threshold) + ' limit'),
            ar() ? 'راجع مبرر التقسيم. لو لم يكن مبرراً فنياً، يجب أن يمر الإجمالي على المستوى الأعلى للاعتماد.'
                 : 'Review the justification; the total should have gone to a higher approver.'));
          i += window_.length - 1;
        }
      }
    });
    return out;
  };

  /* ── ٧ · قفزة سعر غير مبررة لنفس الصنف ─────────────────────────── */
  CHECKS.priceJump = function () {
    var out = [], hist = {};
    approved('goodsReceipts').slice()
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); })
      .forEach(function (g) {
        (g.lines || []).forEach(function (l) {
          if (!l.item || num(l.price) <= 0) return;
          (hist[l.item] = hist[l.item] || []).push({ price: num(l.price), date: g.date, doc: g });
        });
      });
    Object.keys(hist).forEach(function (item) {
      var h = hist[item];
      if (h.length < 2) return;
      var last = h[h.length - 1], prev = h[h.length - 2];
      var jump = (last.price - prev.price) / prev.price * 100;
      if (jump > TOL.priceJump) {
        out.push(F(jump > 40 ? 'high' : 'medium', 'procurement', 'goodsReceipts', last.doc.id,
          ar() ? 'ارتفاع كبير في سعر صنف' : 'Sharp price increase on an item',
          ar() ? ('«' + name('items', item) + '» ارتفع من ' + I18N.money(prev.price) + ' إلى ' +
                  I18N.money(last.price) + ' (' + I18N.pct(jump, 1) + ') بين ' +
                  I18N.date(prev.date) + ' و' + I18N.date(last.date))
               : ('"' + name('items', item) + '" rose from ' + I18N.money(prev.price) + ' to ' + I18N.money(last.price)),
          ar() ? 'اطلب عرضين آخرين قبل الشراء القادم، أو تفاوض على اتفاق سعر سنوي.'
               : 'Get two more quotes before the next purchase.'));
      }
    });
    return out;
  };

  /* ── ٨ · تحويل مخزني لم يُستلم في الوجهة ───────────────────────── */
  CHECKS.transferNotReceived = function () {
    var out = [];
    approved('stockTransfers').forEach(function (tr) {
      if (tr.receivedByDest && tr.arrivalDate) return;
      var d = since(tr.date);
      if (d < 2) return;
      out.push(F(d > 7 ? 'high' : 'medium', 'stores', 'stockTransfers', tr.id,
        ar() ? 'تحويل مخزني بلا إثبات استلام في الوجهة' : 'Transfer with no destination receipt',
        ar() ? ('تحويل ' + (tr.docNo || '') + ' من «' + name('warehouses', tr.fromWarehouse) + '» إلى «' +
                name('warehouses', tr.toWarehouse) + '» منذ ' + d + ' يوم بلا اسم مستلم أو تاريخ وصول')
             : ('Transfer ' + (tr.docNo || '') + ' has no receiver or arrival date after ' + d + ' days'),
        ar() ? 'هذه أكثر نقطة تختفي فيها المواد. اتصل بمخزن الوجهة وسجّل الاستلام أو افتح تحقيقاً.'
             : 'This is where materials disappear. Confirm receipt or open an investigation.'));
    });
    return out;
  };

  /* ── ٩ · مخزون راكد ─────────────────────────────────────────────── */
  CHECKS.deadStock = function () {
    var out = [], lastMove = {};
    approved('stockIssues').forEach(function (d) {
      (d.lines || []).forEach(function (l) {
        if (!l.item) return;
        if (!lastMove[l.item] || new Date(d.date) > new Date(lastMove[l.item])) lastMove[l.item] = d.date;
      });
    });
    Store.all('items').forEach(function (it) {
      var qty = 0;
      try { qty = A().stockQty(it.id); } catch (e) { return; }
      if (qty <= 0) return;
      var last = lastMove[it.id];
      var d = last ? since(last) : 999;
      if (d < TOL.deadStock) return;
      var value = qty * num(it.lastPrice);
      if (value < 1000) return;
      out.push(F(value > 100000 ? 'medium' : 'low', 'stores', 'items', it.id,
        ar() ? 'مخزون راكد بلا حركة' : 'Dead stock with no movement',
        ar() ? ('«' + it.name + '» رصيد ' + I18N.num(qty, 1) + ' بقيمة ' + I18N.money(value) +
                (last ? (' بلا صرف منذ ' + d + ' يوم') : ' لم يُصرف منه شيء إطلاقاً'))
             : ('"' + it.name + '" holds ' + I18N.money(value) + ' with no issue for ' + d + ' days'),
        ar() ? 'أموال مجمّدة. فكّر في استخدامه بمشروع آخر أو إرجاعه للمورد أو بيعه.'
             : 'Frozen cash — consider using it elsewhere or returning it.'));
    });
    return out;
  };

  /* ── ١٠ · صرف مخزني على بند تكلفة خارج موازنة المشروع ──────────── */
  CHECKS.issueOutsideBudget = function () {
    var out = [];
    approved('stockIssues').forEach(function (si) {
      if (!si.project || !si.costItem) return;
      var budgets = approved('budgets').filter(function (b) { return b.project === si.project; });
      if (!budgets.length) return;
      var latest = budgets.sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
      var has = (latest.lines || []).some(function (l) { return l.costItem === si.costItem; });
      if (has) return;
      out.push(F('medium', 'projects', 'stockIssues', si.id,
        ar() ? 'صرف على بند تكلفة غير موجود في الموازنة' : 'Issue charged to a cost item not in the budget',
        ar() ? ('إذن صرف ' + (si.docNo || '') + ' حُمّل على «' + name('costItems', si.costItem) +
                '» ولا يوجد هذا البند في موازنة مشروع «' + name('projects', si.project) + '»')
             : ('Issue ' + (si.docNo || '') + ' charged to a cost item absent from the project budget'),
        ar() ? 'إما أن البند خطأ، أو الموازنة ناقصة. صحّح أحدهما وإلا ستكون تقارير التكلفة مضلّلة.'
             : 'Either the cost item is wrong or the budget is incomplete.'));
    });
    return out;
  };

  /* ── ١١ · مستخلص: تراكمي أقل من السابق ─────────────────────────── */
  CHECKS.ipcRegression = function () {
    var out = [];
    ['clientIPCs', 'subIPCs'].forEach(function (tbl) {
      var byKey = {};
      Store.all(tbl).forEach(function (r) {
        if (r.status === 'reversed' || r.isReversal) return;
        var k = (r.project || '') + '|' + (r.customer || r.subcontractor || '');
        (byKey[k] = byKey[k] || []).push(r);
      });
      Object.keys(byKey).forEach(function (k) {
        var g = byKey[k].sort(function (a, b) { return num(a.ipcNo) - num(b.ipcNo); });
        for (var i = 1; i < g.length; i++) {
          var cur = num(g[i].cumulativeWork), prev = num(g[i - 1].cumulativeWork);
          if (cur < prev - 0.5) {
            out.push(F('high', 'projects', tbl, g[i].id,
              ar() ? 'مستخلص: القيمة التراكمية أقل من المستخلص السابق'
                   : 'IPC cumulative value lower than the previous one',
              ar() ? ('مستخلص رقم ' + g[i].ipcNo + ' تراكمي ' + I18N.money(cur) +
                      ' بينما المستخلص ' + g[i - 1].ipcNo + ' كان ' + I18N.money(prev))
                   : ('IPC ' + g[i].ipcNo + ' cumulative ' + I18N.money(cur) + ' vs ' + I18N.money(prev)),
              ar() ? 'إما خطأ في الحصر أو خصم لم يُوثَّق. راجع الكميات قبل الاعتماد.'
                   : 'Either a quantity error or an undocumented deduction.'));
          }
          if (num(g[i].previousWork) !== prev && prev > 0) {
            out.push(F('medium', 'projects', tbl, g[i].id,
              ar() ? 'مستخلص: «الأعمال السابقة» لا تطابق تراكمي المستخلص السابق'
                   : 'IPC previous-work figure does not match the prior cumulative',
              ar() ? ('مستخلص ' + g[i].ipcNo + ' كتب السابق ' + I18N.money(g[i].previousWork) +
                      ' والصحيح ' + I18N.money(prev))
                   : ('IPC ' + g[i].ipcNo + ' states ' + I18N.money(g[i].previousWork) + ', should be ' + I18N.money(prev)),
              ar() ? 'صحّح الرقم — وإلا ستُحصّل أو تدفع مبلغاً خاطئاً.'
                   : 'Correct it, or the wrong amount will be billed or paid.'));
          }
        }
      });
    });
    return out;
  };

  /* ── ١٢ · الاحتجاز لا يطابق نسبة العقد ─────────────────────────── */
  CHECKS.retentionMismatch = function () {
    var out = [];
    approved('clientIPCs').forEach(function (ipc) {
      var pr = Store.find('projects', ipc.project);
      var pct = pr ? num(pr.retentionPct) : 0;
      if (pct <= 0) return;
      var cur = num(ipc.currentWork) || (num(ipc.cumulativeWork) - num(ipc.previousWork));
      if (cur <= 0) return;
      var expected = cur * pct / 100;
      var actual = num(ipc.retention);
      if (pctDiff(actual, expected) > 5) {
        out.push(F('high', 'projects', 'clientIPCs', ipc.id,
          ar() ? 'الاحتجاز لا يطابق نسبة العقد' : 'Retention does not match the contract rate',
          ar() ? ('مستخلص ' + (ipc.docNo || '') + ': محتجز ' + I18N.money(actual) + ' والمفترض ' +
                  I18N.money(expected) + ' بنسبة ' + I18N.pct(pct, 0) + ' من ' + I18N.money(cur))
               : ('IPC ' + (ipc.docNo || '') + ': retention ' + I18N.money(actual) + ' vs expected ' + I18N.money(expected)),
          ar() ? 'راجع الحساب — الفرق يتراكم على مدى المشروع ويصبح مبلغاً كبيراً.'
               : 'Recheck — this compounds across the project.'));
      }
    });
    return out;
  };

  /* ── ١٣ · مستخلصات الباطن تتجاوز قيمة العقد ────────────────────── */
  CHECKS.subOverContract = function () {
    var out = {}, res = [];
    approved('subIPCs').forEach(function (s) {
      if (!s.contract) return;
      out[s.contract] = Math.max(out[s.contract] || 0, num(s.cumulativeWork));
    });
    Object.keys(out).forEach(function (cid) {
      var c = Store.find('subContracts', cid);
      if (!c) return;
      var val = num(c.contractValue);
      if (val <= 0) return;
      if (out[cid] > val * 1.001) {
        res.push(F('critical', 'projects', 'subContracts', cid,
          ar() ? 'مستخلصات مقاول الباطن تجاوزت قيمة العقد' : 'Subcontractor billing exceeds the contract value',
          ar() ? ('عقد ' + (c.contractNo || '') + ' مع «' + name('subcontractors', c.subcontractor) +
                  '»: قيمة العقد ' + I18N.money(val) + ' والمستخلص التراكمي ' + I18N.money(out[cid]) +
                  ' — زيادة ' + I18N.money(out[cid] - val))
               : ('Contract ' + (c.contractNo || '') + ': value ' + I18N.money(val) + ', billed ' + I18N.money(out[cid])),
          ar() ? 'أوقف السداد حتى يُوقَّع أمر تغيير يغطي الزيادة.'
               : 'Stop payment until a signed variation covers the excess.'));
      }
    });
    return res;
  };

  /* ── ١٤ · استرداد دفعة مقدمة أكبر مما دُفع ─────────────────────── */
  CHECKS.advanceOverRecovery = function () {
    var out = [], byProj = {};
    approved('clientIPCs').forEach(function (i) {
      if (!i.project) return;
      byProj[i.project] = (byProj[i.project] || 0) + num(i.advanceRecovery);
    });
    Object.keys(byProj).forEach(function (pid) {
      var p = Store.find('projects', pid);
      if (!p) return;
      var advance = num(p.contractValue) * num(p.advancePct) / 100;
      if (advance <= 0) return;
      if (byProj[pid] > advance * 1.01) {
        out.push(F('high', 'projects', 'projects', pid,
          ar() ? 'استرداد الدفعة المقدمة تجاوز قيمتها' : 'Advance recovered exceeds the advance paid',
          ar() ? ('مشروع «' + p.name + '»: الدفعة المقدمة ' + I18N.money(advance) +
                  ' والمسترد حتى الآن ' + I18N.money(byProj[pid]))
               : ('Project "' + p.name + '": advance ' + I18N.money(advance) + ', recovered ' + I18N.money(byProj[pid])),
          ar() ? 'توقّف عن الخصم — أنت تخصم من مستحقاتك بلا وجه حق.'
               : 'Stop deducting — you are reducing your own entitlement.'));
      }
    });
    return out;
  };

  /* ── ١٥ · مشروع بلا موازنة معتمدة ──────────────────────────────── */
  CHECKS.projectNoBudget = function () {
    var out = [];
    Store.all('projects').forEach(function (p) {
      if (p.status !== 'active') return;
      var has = approved('budgets').some(function (b) { return b.project === p.id; });
      if (has) return;
      var spent = 0;
      try { spent = A().actualCost(p.id); } catch (e) {}
      if (spent <= 0) return;
      out.push(F('high', 'projects', 'projects', p.id,
        ar() ? 'مشروع يُنفق عليه بلا موازنة معتمدة' : 'Project spending with no approved budget',
        ar() ? ('«' + p.name + '» أُنفق عليه ' + I18N.money(spent) + ' ولا توجد موازنة معتمدة للمقارنة')
             : ('"' + p.name + '" has spent ' + I18N.money(spent) + ' with no approved budget'),
        ar() ? 'بلا موازنة لا يمكن معرفة إن كان المشروع رابحاً. اعتمد موازنة فوراً.'
             : 'Without a budget you cannot tell if the project is profitable.'));
    });
    return out;
  };

  /* ── ١٦ · تجاوز بند تكلفة بعينه داخل الموازنة ──────────────────── */
  CHECKS.costItemOverrun = function () {
    var out = [];
    approved('budgets').forEach(function (b) {
      if (!b.project) return;
      var budgetByItem = {};
      (b.lines || []).forEach(function (l) {
        if (l.costItem) budgetByItem[l.costItem] = (budgetByItem[l.costItem] || 0) + num(l.lineTotal);
      });
      var spentByItem = {};
      function add(ci, v) { if (ci) spentByItem[ci] = (spentByItem[ci] || 0) + v; }
      approved('stockIssues').forEach(function (r) { if (r.project === b.project) add(r.costItem, num(r.subTotal)); });
      approved('supplierInvoices').forEach(function (r) { if (r.project === b.project) add(r.costItem, num(r.subTotal)); });
      approved('subIPCs').forEach(function (r) { if (r.project === b.project) add(r.costItem, num(r.currentWork)); });
      Object.keys(spentByItem).forEach(function (ci) {
        var bud = budgetByItem[ci];
        if (!bud || bud <= 0) return;
        var sp = spentByItem[ci];
        if (sp > bud * 1.05) {
          out.push(F(sp > bud * 1.25 ? 'high' : 'medium', 'projects', 'projects', b.project,
            ar() ? 'بند تكلفة تجاوز موازنته' : 'Cost item over its budget line',
            ar() ? ('مشروع «' + name('projects', b.project) + '» — بند «' + name('costItems', ci) +
                    '»: موازنة ' + I18N.money(bud) + ' ومنصرف ' + I18N.money(sp) +
                    ' (' + I18N.pct(sp / bud * 100, 0) + ')')
                 : ('"' + name('costItems', ci) + '": budget ' + I18N.money(bud) + ', spent ' + I18N.money(sp)),
            ar() ? 'الإجمالي قد يبدو سليماً بينما بند بعينه ينزف. راجع سبب التجاوز.'
                 : 'The total can look fine while one line bleeds.'));
        }
      });
    });
    return out;
  };

  /* ── ١٧ · قيد غير متوازن ───────────────────────────────────────── */
  CHECKS.journalImbalance = function () {
    var out = [];
    Store.all('journal').forEach(function (j) {
      if (j.status === 'reversed') return;
      var d = 0, c = 0;
      (j.lines || []).forEach(function (l) { d += num(l.debit); c += num(l.credit); });
      if (Math.abs(d - c) > 0.009) {
        out.push(F(j.status === 'approved' ? 'critical' : 'medium', 'finance', 'journal', j.id,
          ar() ? 'قيد غير متوازن' : 'Unbalanced journal entry',
          ar() ? ('قيد ' + (j.docNo || '') + ' (' + Workflow.label(j.status) + '): مدين ' +
                  I18N.money(d) + ' ودائن ' + I18N.money(c) + ' — فرق ' + I18N.money(Math.abs(d - c)))
               : ('Journal ' + (j.docNo || '') + ': debit ' + I18N.money(d) + ' vs credit ' + I18N.money(c)),
          ar() ? 'قيد معتمد وغير متوازن يعني ميزان مراجعة خاطئ. صحّحه فوراً بقيد تسوية.'
               : 'An approved unbalanced entry breaks the trial balance.'));
      }
    });
    return out;
  };

  /* ── ١٨ · مستند بلا مشروع أو بند تكلفة ─────────────────────────── */
  CHECKS.missingCostCoding = function () {
    var out = [];
    [['supplierInvoices', 'فاتورة مورد', 'Supplier invoice'],
     ['payments', 'سند صرف', 'Payment voucher'],
     ['stockIssues', 'إذن صرف', 'Stock issue']].forEach(function (x) {
      approved(x[0]).forEach(function (r) {
        if (r.isReversal) return;
        var missing = [];
        if (!r.project) missing.push(ar() ? 'المشروع' : 'project');
        if (!r.costItem) missing.push(ar() ? 'بند التكلفة' : 'cost item');
        if (!missing.length) return;
        var amt = num(r.grandTotal) || num(r.amount) || num(r.subTotal);
        if (amt < 500) return;
        out.push(F('medium', 'finance', x[0], r.id,
          ar() ? (x[1] + ' بلا ' + missing.join(' و')) : (x[2] + ' missing ' + missing.join(' and ')),
          ar() ? ((r.docNo || '') + ' بقيمة ' + I18N.money(amt) + ' غير محمّل على ' + missing.join(' و'))
               : ((r.docNo || '') + ' worth ' + I18N.money(amt) + ' is not coded'),
          ar() ? 'التكلفة لن تظهر في تقارير المشروع إطلاقاً — التقارير ستكون ناقصة.'
               : 'This cost never reaches project reports.'));
      });
    });
    return out;
  };

  /* ── ١٩ · خزينة أو بنك برصيد سالب ──────────────────────────────── */
  CHECKS.negativeCash = function () {
    var out = [];
    Store.all('cashAccounts').forEach(function (c) {
      var bal = 0;
      try { bal = A().cashBalance(c.id); } catch (e) { return; }
      if (bal >= 0) return;
      out.push(F('critical', 'finance', 'cashAccounts', c.id,
        ar() ? 'رصيد سالب في خزينة أو حساب بنكي' : 'Negative balance in a cash or bank account',
        ar() ? ('«' + c.name + '» رصيده ' + I18N.money(bal))
             : ('"' + c.name + '" balance is ' + I18N.money(bal)),
        ar() ? 'إما رصيد افتتاحي خاطئ أو سند صرف بلا غطاء. راجع الحركة من البداية.'
             : 'Either a wrong opening balance or an unfunded payment.'));
    });
    return out;
  };

  /* ── ٢٠ · عهدة قديمة لم تُسوَّ ───────────────────────────────────── */
  CHECKS.staleCustody = function () {
    var out = [];
    Store.all('cashAccounts').forEach(function (c) {
      if (c.kind !== 'custody' || c.status === 'inactive') return;
      var bal = 0;
      try { bal = A().cashBalance(c.id); } catch (e) { return; }
      if (bal <= 0) return;
      var last = null;
      approved('payments').concat(approved('receipts')).forEach(function (p) {
        if (p.cashAccount !== c.id) return;
        if (!last || new Date(p.date) > new Date(last)) last = p.date;
      });
      var d = last ? since(last) : 999;
      if (d < 30) return;
      out.push(F(d > 90 ? 'high' : 'medium', 'finance', 'cashAccounts', c.id,
        ar() ? 'عهدة قائمة بلا تسوية' : 'Outstanding custody not settled',
        ar() ? ('عهدة «' + (name('employees', c.custodian) || c.name) + '» بها ' + I18N.money(bal) +
                ' بلا حركة منذ ' + (last ? d + ' يوم' : 'البداية'))
             : ('Custody of "' + (name('employees', c.custodian) || c.name) + '" holds ' + I18N.money(bal)),
        ar() ? 'اطلب التسوية بمستندات. العهد القديمة أكثر مصدر للخلافات المالية.'
             : 'Request settlement with documents.'));
    });
    return out;
  };

  /* ── ٢١ · استلام بلا فحص ───────────────────────────────────────── */
  CHECKS.receiptNoInspection = function () {
    var out = [];
    approved('goodsReceipts').forEach(function (g) {
      if (g.inspector) return;
      out.push(F('medium', 'stores', 'goodsReceipts', g.id,
        ar() ? 'استلام بضاعة بلا مسؤول فحص' : 'Goods received with no inspector recorded',
        ar() ? ('إذن ' + (g.docNo || '') + ' بقيمة ' + I18N.money(g.grandTotal) + ' بلا اسم فاحص')
             : ('GRN ' + (g.docNo || '') + ' worth ' + I18N.money(g.grandTotal) + ' has no inspector'),
        ar() ? 'بدون فحص موثّق لا تستطيع رفض البضاعة لاحقاً لو ظهر عيب.'
               : 'Without a recorded inspection you cannot reject defects later.'));
    });
    return out;
  };

  /* ── ٢٢ · جرد بفروق كبيرة متكررة ───────────────────────────────── */
  CHECKS.stocktakeVariance = function () {
    var out = [];
    approved('stockCounts').forEach(function (sc) {
      var totalAbs = 0, totalValue = 0;
      (sc.lines || []).forEach(function (l) {
        var diff = num(l.countedQty) - num(l.bookQty);
        totalAbs += Math.abs(diff);
        totalValue += Math.abs(diff * num(l.price));
      });
      if (totalValue < 5000) return;
      out.push(F(totalValue > 50000 ? 'high' : 'medium', 'stores', 'stockCounts', sc.id,
        ar() ? 'فروق جرد كبيرة' : 'Large stocktake variance',
        ar() ? ('جرد ' + (sc.docNo || '') + ' بمخزن «' + name('warehouses', sc.warehouse) +
                '»: فروق بقيمة ' + I18N.money(totalValue))
             : ('Count ' + (sc.docNo || '') + ' variance worth ' + I18N.money(totalValue)),
        ar() ? 'فرق بهذا الحجم يحتاج تحقيقاً مكتوباً لا مجرد تسوية. راجع حركة الأصناف قبل الجرد.'
             : 'A variance this size needs a written investigation, not just an adjustment.'));
    });
    return out;
  };

  /* ── ٢٣ · مستند معلّق طويلاً ────────────────────────────────────── */
  CHECKS.stuckDocuments = function () {
    var out = [];
    Schema.MODULES.filter(function (m) { return m.workflow; }).forEach(function (m) {
      Store.all(m.table).forEach(function (r) {
        if (['pending', 'reviewed'].indexOf(r.status) === -1) return;
        var d = since(r.submittedAt || r.createdAt);
        /* نفس عائلة NaN التي أُصلحت في alerts.js:139 — سجلّ بلا أي
           تاريخ يعطي NaN، وNaN < 7 = false فلا يعود الحارس.
           Same NaN family fixed at alerts.js:139 — a row with no timestamp
           gives NaN, and NaN < 7 is false so the guard does not return. */
        if (!(d >= 7)) return;
        out.push(F(d > 21 ? 'high' : 'medium', 'management', m.id, r.id,
          ar() ? 'مستند متوقف في دورة الاعتماد' : 'Document stuck in the approval chain',
          ar() ? (L(m.label) + ' ' + (r.docNo || '') + ' معلّق منذ ' + d + ' يوم بانتظار ' +
                  (r.status === 'pending' ? 'المراجعة' : 'الاعتماد'))
               : (L(m.label) + ' ' + (r.docNo || '') + ' waiting ' + d + ' days'),
          ar() ? 'التأخير هنا يعطّل الموقع ويؤخر الموردين. حدّد المسؤول واطلب البت.'
               : 'Delay here stalls the site and the suppliers.'));
      });
    });
    return out;
  };

  /* ── ٢٤ · عقود وتراخيص منتهية ──────────────────────────────────── */
  CHECKS.expiredDocs = function () {
    var out = [];
    Store.all('legalDocs').forEach(function (d) {
      if (!d.expiryDate || d.legalStatus === 'closed') return;
      var left = days(d.expiryDate, new Date());
      if (left >= 0) return;
      out.push(F('critical', 'legal', 'legalDocs', d.id,
        ar() ? 'مستند رسمي منتهي الصلاحية' : 'Official document has expired',
        ar() ? ('«' + d.title + '» انتهى منذ ' + Math.abs(left) + ' يوم')
             : ('"' + d.title + '" expired ' + Math.abs(left) + ' days ago'),
        ar() ? 'قد يوقف مناقصة أو يعطّل صرف مستخلص. جدّده اليوم.'
             : 'This can block a tender or an IPC payment.'));
    });
    Store.all('equipment').forEach(function (e) {
      if (!e.licenseExpiry || e.status === 'inactive') return;
      var left = days(e.licenseExpiry, new Date());
      if (left >= 0) return;
      out.push(F('critical', 'equipment', 'equipment', e.id,
        ar() ? 'رخصة معدة منتهية' : 'Equipment licence expired',
        ar() ? ('«' + e.name + '» رخصتها منتهية منذ ' + Math.abs(left) + ' يوم')
             : ('"' + e.name + '" licence expired ' + Math.abs(left) + ' days ago'),
        ar() ? 'تشغيلها الآن مخالفة قانونية وتُبطل التأمين عند أي حادث.'
             : 'Operating it now is illegal and voids insurance.'));
    });
    return out;
  };

  /* ── ٢٥ · موقع بلا تقارير يومية ────────────────────────────────── */
  CHECKS.missingSiteReports = function () {
    var out = [];
    Store.all('projects').forEach(function (p) {
      if (p.status !== 'active') return;
      var last = Store.all('siteReports').filter(function (r) { return r.project === p.id; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
      var d = last ? since(last.date) : 999;
      if (d < 3) return;
      out.push(F(d > 14 ? 'high' : 'medium', 'projects', 'siteReports', last ? last.id : null,
        ar() ? 'مشروع بلا تقارير يومية' : 'Project with no daily site reports',
        ar() ? ('«' + p.name + '» ' + (last ? ('آخر تقرير منذ ' + d + ' يوم') : 'لا يوجد أي تقرير'))
             : ('"' + p.name + '" ' + (last ? ('last report ' + d + ' days ago') : 'has no reports')),
        ar() ? 'التقرير اليومي هو دليلك الوحيد في أي مطالبة تأخير أو خلاف مع العميل.'
             : 'Daily reports are your only evidence in a delay claim.'));
    });
    return out;
  };

  /* ── ٢٦ · معدة بلا تحميل تكلفة على مشروع ───────────────────────── */
  CHECKS.equipmentUnallocated = function () {
    var out = [];
    Store.all('equipmentLogs').forEach(function (lg) {
      if (lg.project) return;
      if (num(lg.cost) < 1000) return;
      out.push(F('low', 'equipment', 'equipmentLogs', lg.id,
        ar() ? 'تكلفة معدة بلا مشروع' : 'Equipment cost not allocated to a project',
        ar() ? ((lg.docNo || '') + ' بقيمة ' + I18N.money(lg.cost) + ' لمعدة «' +
                name('equipment', lg.equipment) + '» بلا مشروع')
             : ((lg.docNo || '') + ' worth ' + I18N.money(lg.cost) + ' has no project'),
        ar() ? 'ستظهر كمصروف عام بدل تكلفة مشروع، فتبدو المشروعات أربح مما هي عليه.'
             : 'It lands in overheads and makes projects look more profitable than they are.'));
    });
    return out;
  };

  /* ── ٢٧ · مورد بلا بيانات ضريبية ───────────────────────────────── */
  CHECKS.supplierNoTaxId = function () {
    var out = [];
    Store.all('suppliers').forEach(function (s) {
      if (s.status === 'inactive' || s.taxId) return;
      var spend = 0;
      approved('supplierInvoices').forEach(function (i) { if (i.supplier === s.id) spend += num(i.grandTotal); });
      if (spend < 10000) return;
      out.push(F('medium', 'finance', 'suppliers', s.id,
        ar() ? 'مورد بلا بطاقة ضريبية' : 'Supplier with no tax ID',
        ar() ? ('«' + s.name + '» تعاملتم معه بـ ' + I18N.money(spend) + ' بلا رقم ضريبي مسجّل')
             : ('"' + s.name + '" billed ' + I18N.money(spend) + ' with no tax ID on file'),
        ar() ? 'مطلوب للفاتورة الإلكترونية وخصم التكلفة ضريبياً. اطلبه قبل السداد القادم.'
             : 'Required for e-invoicing and tax deductibility.'));
    });
    return out;
  };

  /* ── ٢٨ · موظف بلا حضور رغم أنه على رأس العمل ──────────────────── */
  CHECKS.attendanceGaps = function () {
    var out = [];
    var recent = {};
    Store.all('attendance').forEach(function (a) {
      if (since(a.date) > 14) return;
      recent[a.employee] = true;
    });
    var missing = Store.all('employees').filter(function (e) {
      return e.status === 'active' && !recent[e.id];
    });
    if (missing.length >= 3) {
      out.push(F('medium', 'hr', 'attendance', null,
        ar() ? 'موظفون بلا أي تسجيل حضور' : 'Employees with no attendance recorded',
        ar() ? (missing.length + ' موظفاً على رأس العمل بلا أي تسجيل حضور خلال أسبوعين، منهم: ' +
                missing.slice(0, 4).map(function (e) { return e.name; }).join('، '))
             : (missing.length + ' active employees have no attendance in two weeks'),
        ar() ? 'إما أن التسجيل متوقف أو أن هؤلاء لم يعودوا على رأس العمل. راجع الحالتين.'
             : 'Either recording stopped or these people have left.'));
    }
    return out;
  };

  /* ── ٢٩ · إذن صرف بلا مستلم موقّع ──────────────────────────────── */
  CHECKS.issueNoSignature = function () {
    var out = [];
    approved('stockIssues').forEach(function (si) {
      if (si.receiverSigned) return;
      if (num(si.subTotal) < 5000) return;
      out.push(F('medium', 'stores', 'stockIssues', si.id,
        ar() ? 'صرف مواد بلا توقيع المستلم' : 'Materials issued with no receiver signature',
        ar() ? ('إذن ' + (si.docNo || '') + ' بقيمة ' + I18N.money(si.subTotal) + ' غير مؤشّر بتوقيع المستلم')
             : ('Issue ' + (si.docNo || '') + ' worth ' + I18N.money(si.subTotal) + ' is unsigned'),
        ar() ? 'بلا توقيع لا تستطيع إثبات أن المواد سُلّمت فعلاً لو حدث خلاف.'
             : 'Without a signature you cannot prove delivery.'));
    });
    return out;
  };

  /* ── ٣٠ · مستخلص عميل لم يُفوتر أو يُحصّل ──────────────────────── */
  CHECKS.ipcNotCollected = function () {
    var out = [];
    approved('clientIPCs').forEach(function (i) {
      /* نفس المنطق أعلاه، لكن لسندات القبض المعتمدة
         same logic as above, but for approved receipt vouchers */
      var due = num(i.netDue) - (global.MoneyOwed ? MoneyOwed.collectedOf(i.id) : num(i.collectedAmount));
      if (due <= 0.5) return;
      var d = since(i.date);
      if (d < 60) return;
      out.push(F(d > 120 ? 'critical' : 'high', 'finance', 'clientIPCs', i.id,
        ar() ? 'مستخلص عميل لم يُحصّل منذ فترة طويلة' : 'Client IPC uncollected for a long time',
        ar() ? ('مستخلص ' + (i.docNo || '') + ' لـ«' + name('customers', i.customer) + '» بقيمة ' +
                I18N.money(due) + ' منذ ' + d + ' يوم')
             : ('IPC ' + (i.docNo || '') + ' for ' + I18N.money(due) + ' outstanding ' + d + ' days'),
        ar() ? 'هذه سيولتكم محبوسة. صعّد الأمر للإدارة وراجع شروط العقد بخصوص فوائد التأخير.'
             : 'This is your cash held hostage. Escalate and check the contract terms.'));
    });
    return out;
  };

  /* ══════════════════════════════════════════════════════════════════
     RUNNER
     ══════════════════════════════════════════════════════════════════ */
  var AREA_ROLES = {
    stores:      ['storekeeper', 'admin', 'gm', 'auditor', 'finance_manager'],
    finance:     ['accountant', 'finance_manager', 'admin', 'gm', 'auditor'],
    procurement: ['procurement', 'finance_manager', 'admin', 'gm', 'auditor'],
    projects:    ['project_manager', 'technical', 'admin', 'gm', 'auditor', 'finance_manager'],
    hr:          ['hr', 'admin', 'gm', 'auditor'],
    legal:       ['legal', 'admin', 'gm', 'auditor'],
    equipment:   ['project_manager', 'admin', 'gm', 'auditor'],
    management:  ['admin', 'gm', 'finance_manager', 'auditor']
  };

  var SEV_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

  function runAll() {
    var out = [];
    Object.keys(CHECKS).forEach(function (k) {
      try {
        var res = CHECKS[k]();
        res.forEach(function (r) { r.check = k; out.push(r); });
      } catch (e) {
        console.error('inspector check failed: ' + k, e);
      }
    });
    return out;
  }

  /* النتائج التي تخصّ المستخدم الحالي فقط */
  function forMe() {
    var u = Auth.current();
    if (!u) return [];
    return runAll().filter(function (f) {
      var roles = AREA_ROLES[f.area] || [];
      if (roles.indexOf(u.role) === -1) return false;
      if (f.module && !Auth.canSee(f.module)) return false;
      return true;
    }).sort(function (a, b) { return SEV_ORDER[b.severity] - SEV_ORDER[a.severity]; });
  }

  /* The cache key must include the ROLE, not only the user id.
     Keyed on the id alone, a role change (or any second identity reusing an
     id) could be served another role's findings — which would show one
     department the problems of another. The role is what decides visibility,
     so the role belongs in the key. */
  var cache = null, cacheKey = null, cacheAt = 0;
  function findings() {
    var u = Auth.current();
    var key = u ? (u.id + '|' + u.role) : null;
    if (cache && cacheKey === key && key !== null && Date.now() - cacheAt < 2000) return cache;
    cache = forMe(); cacheKey = key; cacheAt = Date.now();
    return cache;
  }
  function invalidate() { cache = null; cacheKey = null; }

  function counts() {
    var f = findings(), c = { critical: 0, high: 0, medium: 0, low: 0 };
    f.forEach(function (x) { c[x.severity]++; });
    return c;
  }

  global.Inspector = {
    CHECKS: CHECKS, TOL: TOL, AREA_ROLES: AREA_ROLES,
    runAll: runAll, findings: findings, invalidate: invalidate, counts: counts,
    checkCount: Object.keys(CHECKS).length
  };
})(window);
