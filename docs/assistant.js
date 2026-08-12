/* =========================================================================
   assistant.js — المساعد الذكي لكل موظف
                  A per-role assistant that reads the employee's real data
   -------------------------------------------------------------------------
   يستخدم خدمة الخادم للتحليل المتقدم، مع فحص رقابي محدد يعمل كبديل آمن.
   Advanced analysis runs server-side, with deterministic control checks as a
   safe fallback. Both paths are limited to the employee's role-scoped data.

   🔴 قاعدة ثابتة: المساعد ينبّه ويقترح ويلخّص —
      ولا يعتمد ولا يرحّل ولا يعدّل مستنداً أبداً.
   ========================================================================= */
(function (global) {
  'use strict';

  /* The authenticated Edge Function is preferred; local analysis is the
     offline/failure fallback and never changes business records. */
  var AI_PROVIDER = (global.ALZAHRAA_CONFIG && ALZAHRAA_CONFIG.aiEnabled) ? 'edge' : 'local';
  var EDGE_URL = ''; /* The real endpoint is invoked through the authenticated Supabase client. */

  function A() { return Dashboard.analytics; }
  function RV() { return global.RoleView; }
  function me() { return Auth.current(); }
  function ar() { return I18N.getLang() === 'ar'; }
  function daysSince(d) { return Math.round((new Date() - new Date(d)) / 86400000); }
  function daysUntil(d) { return Math.round((new Date(d) - new Date()) / 86400000); }
  function approved(t) { return Store.all(t).filter(function (r) { return r.status === 'approved'; }); }

  /* ------------------------------------------------------------------
     FACTS — كل ما يعرفه المساعد عن هذا الموظف تحديداً
     ------------------------------------------------------------------ */
  function facts() {
    var u = me(); if (!u) return {};
    var f = { role: u.role, name: u.name };

    f.inbox = Workflow.inboxCount();
    try { Alerts.invalidate(); f.alerts = Alerts.list(); } catch (e) { f.alerts = []; }

    f.myDrafts = [];
    f.myPending = [];
    Schema.MODULES.filter(function (m) { return m.workflow && Auth.canSee(m.id); }).forEach(function (m) {
      Store.all(m.table).forEach(function (r) {
        if (r.createdBy !== u.id) return;
        if (r.status === 'draft' || r.status === 'returned') f.myDrafts.push({ m: m, r: r });
        if (r.status === 'pending' || r.status === 'reviewed') f.myPending.push({ m: m, r: r });
      });
    });

    if (Auth.canSee('items')) {
      f.lowStock = Store.all('items').filter(function (it) {
        var lv = Number(it.reorderLevel) || 0;
        if (!lv) return false;
        try { return A().stockQty(it.id) < lv; } catch (e) { return false; }
      }).map(function (it) {
        return { item: it, qty: A().stockQty(it.id), level: Number(it.reorderLevel) || 0 };
      });
    } else f.lowStock = [];

    f.projects = (RV() ? RV().myProjects() : []).map(function (p) {
      var b = 0, a = 0;
      try { b = A().budgetOf(p.id); a = A().actualCost(p.id); } catch (e) {}
      return { p: p, budget: b, actual: a, pct: b ? a / b * 100 : 0 };
    });

    if (Auth.canSee('supplierInvoices')) {
      f.dueInvoices = approved('supplierInvoices').map(function (i) {
        return { inv: i, due: (Number(i.grandTotal) || 0) - (Number(i.paidAmount) || 0) };
      }).filter(function (x) { return x.due > 0.5; });
      f.overdue = f.dueInvoices.filter(function (x) {
        return x.inv.dueDate && new Date(x.inv.dueDate) < new Date();
      });
    } else { f.dueInvoices = []; f.overdue = []; }

    if (Auth.canSee('clientIPCs')) {
      f.uncollected = approved('clientIPCs').map(function (i) {
        return { ipc: i, due: (Number(i.netDue) || 0) - (Number(i.collectedAmount) || 0) };
      }).filter(function (x) { return x.due > 0.5; });
    } else f.uncollected = [];

    if (Auth.canSee('cashAccounts')) {
      f.cash = Store.all('cashAccounts').filter(function (c) { return c.status !== 'inactive'; })
        .map(function (c) { return { acc: c, bal: A().cashBalance(c.id) }; });
    } else f.cash = [];

    if (Auth.canSee('employees')) {
      f.headcount = Store.all('employees').filter(function (e) { return e.status === 'active'; }).length;
      var soon = new Date(); soon.setDate(soon.getDate() + 30);
      f.contractsEnding = Store.all('employees').filter(function (e) {
        return e.status === 'active' && e.contractEnd && new Date(e.contractEnd) <= soon;
      });
    } else { f.headcount = 0; f.contractsEnding = []; }

    if (Auth.canSee('leaves')) {
      f.leavesPending = Store.all('leaves').filter(function (l) {
        return ['pending', 'reviewed'].indexOf(l.status) !== -1;
      });
    } else f.leavesPending = [];

    if (Auth.canSee('itTickets')) {
      f.ticketsOpen = Store.all('itTickets').filter(function (x) {
        return ['open', 'inprogress'].indexOf(x.ticketStatus) !== -1;
      });
    } else f.ticketsOpen = [];

    if (Auth.canSee('legalDocs')) {
      var s90 = new Date(); s90.setDate(s90.getDate() + 90);
      f.expiring = Store.all('legalDocs').filter(function (d) {
        return d.expiryDate && new Date(d.expiryDate) <= s90 && d.legalStatus !== 'closed';
      });
    } else f.expiring = [];

    return f;
  }

  /* ------------------------------------------------------------------
     BRIEFING — الملخص اليومي، مختلف لكل دور
     ------------------------------------------------------------------ */
  function briefing() {
    var u = me(); if (!u) return [];
    var f = facts();
    var out = [];
    function add(tone, icon, text, go, rid) {
      out.push({ tone: tone, icon: icon, text: text, go: go || null, rid: rid || null });
    }
    var A_ = ar();

    /* الجميع */
    if (f.inbox) {
      add('urgent', 'inbox',
        A_ ? ('لديك ' + f.inbox + ' مستنداً ينتظر إجراءً منك. ابدأ بها قبل أي شيء آخر.')
           : ('You have ' + f.inbox + ' documents waiting for your action. Start there.'),
        'inbox');
    }
    if (f.myDrafts.length) {
      var old = f.myDrafts.filter(function (d) { return daysSince(d.r.createdAt) > 3; });
      add(old.length ? 'warn' : 'info', 'edit',
        A_ ? ('عندك ' + f.myDrafts.length + ' مسودة لم تُرسل بعد' +
              (old.length ? ('، منها ' + old.length + ' أقدم من ٣ أيام — أرسلها أو احذفها.') : '.'))
           : (f.myDrafts.length + ' unsent drafts' + (old.length ? (', ' + old.length + ' older than 3 days.') : '.')),
        f.myDrafts[0].m.id, f.myDrafts[0].r.id);
    }

    switch (u.role) {
      case 'storekeeper':
        if (f.lowStock.length) {
          var worst = f.lowStock.slice().sort(function (a, b) { return (a.qty / (a.level || 1)) - (b.qty / (b.level || 1)); })[0];
          add('urgent', 'box',
            A_ ? ('عندك ' + f.lowStock.length + ' صنف تحت حد الطلب. الأخطر: «' + worst.item.name +
                  '» رصيده ' + I18N.num(worst.qty, 1) + ' والحد ' + I18N.num(worst.level, 0) + '.')
               : (f.lowStock.length + ' items below reorder level. Worst: "' + worst.item.name + '".'),
            'items', worst.item.id);
        } else {
          add('good', 'check', A_ ? 'كل الأصناف فوق حد الطلب. المخزون سليم.' : 'All items above reorder level.', 'items');
        }
        var todayR = Store.all('goodsReceipts').filter(function (r) { return r.date === I18N.today(); }).length;
        var todayI = Store.all('stockIssues').filter(function (r) { return r.date === I18N.today(); }).length;
        add('info', 'clipboard',
          A_ ? ('اليوم: ' + todayR + ' استلام و' + todayI + ' صرف مسجّل.')
             : ('Today: ' + todayR + ' receipts, ' + todayI + ' issues recorded.'), 'goodsReceipts');
        add('tip', 'eye',
          A_ ? 'تذكير: سجّل الاستلام لحظة وصول البضاعة، واكتب اسم السائق ورقم السيارة — هذا ما ينقذك عند أي خلاف.'
             : 'Reminder: record receipts as goods arrive, and log the driver and vehicle number.');
        break;

      case 'accountant':
        if (f.overdue.length) {
          add('urgent', 'file',
            A_ ? (f.overdue.length + ' فاتورة مورد تجاوزت تاريخ الاستحقاق. راجعها اليوم.')
               : (f.overdue.length + ' supplier invoices are past due. Review them today.'),
            'supplierInvoices');
        }
        if (f.dueInvoices.length) {
          var tot = f.dueInvoices.reduce(function (s, x) { return s + x.due; }, 0);
          add('info', 'file',
            A_ ? ('إجمالي غير المسدَّد للموردين: ' + I18N.money(tot) + ' على ' + f.dueInvoices.length + ' فاتورة.')
               : ('Unpaid to suppliers: ' + I18N.money(tot) + ' across ' + f.dueInvoices.length + ' invoices.'),
            'supplierInvoices');
        }
        var unbal = Store.all('journal').filter(function (j) {
          if (j.status !== 'draft') return false;
          var d = 0, c = 0;
          (j.lines || []).forEach(function (l) { d += Number(l.debit) || 0; c += Number(l.credit) || 0; });
          return Math.abs(d - c) > 0.009;
        });
        if (unbal.length) {
          add('warn', 'edit',
            A_ ? (unbal.length + ' قيد مسودة غير متوازن — لن يقبله النظام قبل ضبطه.')
               : (unbal.length + ' draft journals are unbalanced.'), 'journal', unbal[0].id);
        }
        add('tip', 'eye',
          A_ ? 'قبل تسجيل أي فاتورة، تأكد من مطابقتها لإذن الاستلام واعتماد الشراء — النظام سينبّهك لو تكرر رقم الفاتورة.'
             : 'Match every invoice to its goods receipt and purchase approval before recording.');
        break;

      case 'procurement':
        var mine = Store.all('purchaseApprovals').filter(function (r) { return r.createdBy === u.id; });
        var stuck = mine.filter(function (r) {
          return ['pending', 'reviewed'].indexOf(r.status) !== -1 && daysSince(r.submittedAt || r.createdAt) > 4;
        });
        if (stuck.length) {
          add('warn', 'cart',
            A_ ? (stuck.length + ' من طلبات الشراء التي أرسلتها معلّقة أكثر من ٤ أيام — ذكّر المعتمد.')
               : (stuck.length + ' of your purchase requests have been pending over 4 days.'),
            'purchaseApprovals', stuck[0].id);
        }
        if (f.lowStock.length) {
          add('urgent', 'box',
            A_ ? (f.lowStock.length + ' صنف تحت حد الطلب — يُفضّل تجهيز اعتماد شراء قبل أن يتوقف الموقع.')
               : (f.lowStock.length + ' items below reorder level — prepare a purchase approval.'),
            'items');
        }
        add('tip', 'eye',
          A_ ? 'حدّد المشروع وبند التكلفة في كل طلب — بدونهما لن تظهر التكلفة في تقارير المشروع إطلاقاً.'
             : 'Always set the project and cost item, or the cost never reaches project reports.');
        break;

      case 'project_manager':
        if (!f.projects.length) {
          add('warn', 'building',
            A_ ? 'لم يُربط حسابك بأي مشروع بعد. اطلب من مسؤول النظام تحديد مشروعاتك.'
               : 'Your account is not linked to any project yet. Ask the administrator.', 'projects');
        }
        f.projects.forEach(function (x) {
          if (x.budget <= 0) return;
          if (x.pct > 100) {
            add('urgent', 'target',
              A_ ? ('مشروع «' + x.p.name + '» تجاوز موازنته: منصرف ' + I18N.money(x.actual) +
                    ' مقابل موازنة ' + I18N.money(x.budget) + '.')
                 : ('"' + x.p.name + '" is over budget: ' + I18N.money(x.actual) + ' vs ' + I18N.money(x.budget) + '.'),
              'projects', x.p.id);
          } else if (x.pct >= 85) {
            add('warn', 'target',
              A_ ? ('مشروع «' + x.p.name + '» استهلك ' + I18N.pct(x.pct, 1) + ' من موازنته.')
                 : ('"' + x.p.name + '" has used ' + I18N.pct(x.pct, 1) + ' of budget.'),
              'projects', x.p.id);
          }
        });
        var myIds = f.projects.map(function (x) { return x.p.id; });
        var noReport = f.projects.filter(function (x) {
          var last = Store.all('siteReports').filter(function (r) { return r.project === x.p.id; })
            .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
          return !last || daysSince(last.date) > 2;
        });
        if (noReport.length) {
          add('warn', 'sun',
            A_ ? (noReport.length + ' من مشروعاتك بلا تقرير يومي منذ أكثر من يومين.')
               : (noReport.length + ' of your projects have no site report for over 2 days.'),
            'siteReports');
        }
        add('tip', 'eye',
          A_ ? 'وثّق أي توقف أو معوّق في التقرير اليومي فور حدوثه — هو أساس أي مطالبة تأخير لاحقاً.'
             : 'Record delays in the daily report as they happen — that is the basis of any future claim.');
        break;

      case 'technical':
        var ifa = Store.all('drawings').filter(function (d) { return ['ifr', 'ifa'].indexOf(d.drawingStatus) !== -1; });
        if (ifa.length) {
          add('warn', 'compass',
            A_ ? (ifa.length + ' رسمة بحالة «للمراجعة/للاعتماد» تنتظر البت.')
               : (ifa.length + ' drawings awaiting review or approval.'), 'drawings', ifa[0].id);
        }
        var dIPC = Store.all('clientIPCs').filter(function (r) { return ['draft', 'returned'].indexOf(r.status) !== -1; });
        if (dIPC.length) {
          add('info', 'receipt',
            A_ ? (dIPC.length + ' مستخلص تحت الإعداد — كل يوم تأخير هو يوم تأخير في التحصيل.')
               : (dIPC.length + ' IPCs in preparation — every day of delay delays collection.'),
            'clientIPCs', dIPC[0].id);
        }
        add('tip', 'eye',
          A_ ? 'تأكد أن الموقع ينفّذ بآخر مراجعة رسم. أي تنفيذ برسمة قديمة تكلفته هدم وإعادة.'
             : 'Make sure site is building from the latest drawing revision.');
        break;

      case 'hr':
        if (f.leavesPending.length) {
          add('urgent', 'calendar',
            A_ ? (f.leavesPending.length + ' طلب إجازة ينتظر البت.')
               : (f.leavesPending.length + ' leave requests pending.'), 'leaves', f.leavesPending[0].id);
        }
        if (f.contractsEnding.length) {
          add('warn', 'user',
            A_ ? (f.contractsEnding.length + ' عقد موظف ينتهي خلال ٣٠ يوماً — ابدأ إجراءات التجديد.')
               : (f.contractsEnding.length + ' employee contracts end within 30 days.'),
            'employees', f.contractsEnding[0].id);
        }
        var per = new Date();
        var pk = per.getFullYear() + '-' + String(per.getMonth() + 1).padStart(2, '0');
        if (!Store.all('payroll').some(function (p) { return p.period === pk; }) && per.getDate() >= 18) {
          add('warn', 'banknote',
            A_ ? ('مسير رواتب ' + pk + ' لم يُعد بعد ونحن في يوم ' + per.getDate() + '.')
               : ('Payroll for ' + pk + ' not prepared yet.'), 'payroll');
        }
        var att = Store.all('attendance').filter(function (a) { return a.date === I18N.today(); }).length;
        add(att ? 'info' : 'warn', 'clock',
          A_ ? (att ? ('سُجّل حضور ' + att + ' موظف اليوم.') : 'لم يُسجَّل حضور اليوم بعد.')
             : (att ? (att + ' attendance records today.') : 'No attendance recorded today.'), 'attendance');
        break;

      case 'finance_manager':
        var cashTot = f.cash.reduce(function (s, c) { return s + c.bal; }, 0);
        add(cashTot < 0 ? 'urgent' : 'info', 'wallet',
          A_ ? ('رصيد الخزائن والبنوك: ' + I18N.money(cashTot) + '.')
             : ('Cash and bank balance: ' + I18N.money(cashTot) + '.'), 'cashAccounts');
        var ar_ = A().receivable(), ap_ = A().payable();
        add(ap_ > ar_ ? 'warn' : 'info', 'chart',
          A_ ? ('مستحق لكم ' + I18N.money(ar_) + ' ومستحق عليكم ' + I18N.money(ap_) + '.' +
                (ap_ > ar_ ? ' الالتزامات أكبر من المستحقات — راقب السيولة.' : ''))
             : ('Receivables ' + I18N.money(ar_) + ' vs payables ' + I18N.money(ap_) + '.'), 'reports');
        if (f.overdue.length) {
          add('urgent', 'file',
            A_ ? (f.overdue.length + ' فاتورة مورد متأخرة — قد تؤثر على علاقتكم بالموردين.')
               : (f.overdue.length + ' supplier invoices overdue.'), 'supplierInvoices');
        }
        var oldIPC = f.uncollected.filter(function (x) { return daysSince(x.ipc.date) > 45; });
        if (oldIPC.length) {
          var s = oldIPC.reduce(function (a, x) { return a + x.due; }, 0);
          add('urgent', 'receipt',
            A_ ? (oldIPC.length + ' مستخلص لم يُحصّل منذ أكثر من ٤٥ يوماً بإجمالي ' + I18N.money(s) + '.')
               : (oldIPC.length + ' IPCs uncollected over 45 days totalling ' + I18N.money(s) + '.'),
            'clientIPCs', oldIPC[0].ipc.id);
        }
        break;

      case 'gm':
      case 'admin':
        var over = f.projects.filter(function (x) { return x.budget > 0 && x.pct > 100; });
        if (over.length) {
          add('urgent', 'target',
            A_ ? (over.length + ' مشروع تجاوز موازنته: ' + over.map(function (x) { return x.p.name; }).join('، '))
               : (over.length + ' projects over budget.'), 'projects', over[0].p.id);
        }
        add('info', 'chart',
          A_ ? ('مستحق لكم ' + I18N.money(A().receivable()) + ' · مستحق عليكم ' + I18N.money(A().payable()) + '.')
             : ('Receivables ' + I18N.money(A().receivable()) + ' · payables ' + I18N.money(A().payable()) + '.'),
          'reports');
        var stale = [];
        Schema.MODULES.filter(function (m) { return m.workflow; }).forEach(function (m) {
          Store.all(m.table).forEach(function (r) {
            if (['pending', 'reviewed'].indexOf(r.status) !== -1 && daysSince(r.submittedAt || r.createdAt) > 5) stale.push(r);
          });
        });
        if (stale.length) {
          add('warn', 'file',
            A_ ? (stale.length + ' مستنداً معلّقاً أكثر من ٥ أيام في دورة الاعتماد — الإنتاجية تتأثر.')
               : (stale.length + ' documents stuck in approval over 5 days.'), 'inbox');
        }
        break;

      case 'legal':
        if (f.expiring.length) {
          var next = f.expiring.slice().sort(function (a, b) { return new Date(a.expiryDate) - new Date(b.expiryDate); })[0];
          add('urgent', 'scale',
            A_ ? (f.expiring.length + ' مستنداً ينتهي خلال ٩٠ يوماً. الأقرب: «' + next.title +
                  '» بعد ' + daysUntil(next.expiryDate) + ' يوم.')
               : (f.expiring.length + ' documents expiring within 90 days.'), 'legalDocs', next.id);
        } else {
          add('good', 'check', A_ ? 'لا توجد مستندات قاربت على الانتهاء.' : 'No documents expiring soon.', 'legalDocs');
        }
        break;

      case 'it':
        if (f.ticketsOpen.length) {
          var urg = f.ticketsOpen.filter(function (x) { return x.priority === 'urgent'; });
          add(urg.length ? 'urgent' : 'info', 'life-buoy',
            A_ ? (f.ticketsOpen.length + ' طلب دعم مفتوح' + (urg.length ? ('، منها ' + urg.length + ' عاجل.') : '.'))
               : (f.ticketsOpen.length + ' open tickets' + (urg.length ? (', ' + urg.length + ' urgent.') : '.')),
            'itTickets', f.ticketsOpen[0].id);
        } else {
          add('good', 'check', A_ ? 'لا توجد طلبات دعم مفتوحة.' : 'No open tickets.', 'itTickets');
        }
        break;

      case 'auditor':
        var rev = [];
        Schema.MODULES.filter(function (m) { return m.workflow; }).forEach(function (m) {
          Store.all(m.table).forEach(function (r) { if (r.status === 'reversed') rev.push({ m: m, r: r }); });
        });
        if (rev.length) {
          add('warn', 'shuffle',
            A_ ? (rev.length + ' مستند معكوس — راجع أسباب العكس في سجل المراجعة.')
               : (rev.length + ' reversed documents — review the reasons.'), rev[0].m.id, rev[0].r.id);
        }
        add('info', 'clipboard',
          A_ ? ('سجل المراجعة يحتوي ' + Store.auditLog().length + ' حركة مسجّلة.')
             : ('The audit log holds ' + Store.auditLog().length + ' recorded events.'), 'settings');
        break;

      default:
        var anns = Store.all('announcements').filter(function (a) { return daysSince(a.date) <= 14; });
        if (anns.length) {
          add('info', 'megaphone',
            A_ ? (anns.length + ' تعميم جديد خلال أسبوعين. آخرها: «' + anns[0].title + '».')
               : (anns.length + ' new announcements. Latest: "' + anns[0].title + '".'),
            'announcements', anns[0].id);
        }
        add('tip', 'eye',
          A_ ? 'تقدّم بطلب الإجازة من النظام لا شفهياً — يصل لمديرك مباشرة ويُسجَّل باسمك.'
             : 'Submit leave requests through the portal, not verbally.');
    }

    if (!out.length) {
      add('good', 'check',
        ar() ? 'لا يوجد ما يستدعي انتباهك الآن. يوم هادئ.' : 'Nothing needs your attention. A quiet day.');
    }
    return out;
  }

  /* ------------------------------------------------------------------
     ANSWER — يفهم السؤال ويجيب من البيانات الحقيقية
     ------------------------------------------------------------------ */
  var INTENTS = [
    { id: 'stock',    kw: ['مخزون', 'صنف', 'أصناف', 'ناقص', 'خلص', 'مخزن', 'stock', 'item', 'inventory'] },
    { id: 'inbox',    kw: ['ينتظرني', 'اعتماد', 'مستنداتي', 'شغلي', 'مطلوب مني', 'waiting for me', 'approve', 'pending'] },
    { id: 'budget',   kw: ['موازنة', 'ميزانية', 'تجاوز', 'تكلفة', 'مشروع', 'budget', 'cost', 'project'] },
    { id: 'invoices', kw: ['فاتورة', 'فواتير', 'مورد', 'سداد', 'مستحق', 'invoice', 'supplier', 'pay'] },
    { id: 'collect',  kw: ['تحصيل', 'مستخلص', 'عميل', 'محصّل', 'collect', 'ipc', 'client'] },
    { id: 'cash',     kw: ['خزينة', 'خزائن', 'بنك', 'بنوك', 'سيولة', 'نقدية', 'cash', 'bank', 'liquidity'] },
    { id: 'people',   kw: ['موظف', 'موظفين', 'حضور', 'إجازة', 'إجازات', 'راتب', 'رواتب', 'مسير', 'عقود الموظفين', 'employee', 'leave', 'payroll', 'attendance', 'headcount'] },
    { id: 'legal',    kw: ['ترخيص', 'رخصة', 'عقد', 'تأمين', 'ضمان', 'قضية', 'licence', 'contract', 'insurance'] },
    { id: 'equip',    kw: ['معدة', 'معدات', 'سيارة', 'وقود', 'صيانة', 'equipment', 'fuel', 'maintenance'] },
    { id: 'howto',    kw: ['كيف', 'ازاي', 'إزاي', 'طريقة', 'how', 'what do i'] },
    { id: 'summary',  kw: ['ملخص', 'وضع', 'أخبار', 'اليوم', 'summary', 'brief', 'today', 'status'] }
  ];

  function detect(q) {
    var s = String(q || '').toLowerCase();
    var best = null, bestScore = 0;
    INTENTS.forEach(function (it) {
      var score = 0;
      it.kw.forEach(function (k) {
        if (s.indexOf(k) === -1) return;
        /* a longer keyword is a more specific signal than a short one */
        score += 1 + (k.length / 20);
      });
      if (score > bestScore) { bestScore = score; best = it.id; }
    });
    return bestScore ? best : 'summary';
  }

  function answer(q) {
    var f = facts(), A_ = ar(), intent = detect(q);
    var lines = [];
    function P(txt) { lines.push(txt); }

    switch (intent) {
      case 'stock':
        if (!Auth.canSee('items')) { P(A_ ? 'شاشة الأصناف ليست ضمن صلاحياتك.' : 'You do not have access to items.'); break; }
        if (!f.lowStock.length) {
          P(A_ ? 'كل الأصناف التي لها حد أدنى فوق الحد. لا يوجد صنف يحتاج طلباً الآن.'
                : 'Every item with a reorder level is above it. Nothing to order.');
        } else {
          P(A_ ? ('يوجد ' + f.lowStock.length + ' صنف تحت حد الطلب:') : (f.lowStock.length + ' items below reorder level:'));
          f.lowStock.slice(0, 8).forEach(function (x) {
            var unit = Schema.optionLabel(Schema.field('items', 'baseUnit'), x.item.baseUnit);
            P('• ' + x.item.name + ' — ' + (A_ ? 'الرصيد ' : 'balance ') + I18N.num(x.qty, 1) + ' ' + unit +
              (A_ ? ' والحد ' : ', level ') + I18N.num(x.level, 0));
          });
        }
        break;

      case 'inbox':
        P(A_ ? ('ينتظر إجراءً منك: ' + f.inbox + ' مستند.') : ('Waiting for your action: ' + f.inbox + ' documents.'));
        if (f.myPending.length) {
          P(A_ ? ('ومستنداتك المرسلة وقيد الاعتماد: ' + f.myPending.length + '.')
                : ('Your submitted documents in approval: ' + f.myPending.length + '.'));
        }
        if (f.myDrafts.length) {
          P(A_ ? ('وعندك ' + f.myDrafts.length + ' مسودة لم تُرسل:') : (f.myDrafts.length + ' unsent drafts:'));
          f.myDrafts.slice(0, 5).forEach(function (d) {
            P('• ' + L(d.m.label) + ' ' + (d.r.docNo || '') + ' — ' +
              (A_ ? ('منذ ' + daysSince(d.r.createdAt) + ' يوم') : (daysSince(d.r.createdAt) + ' days old')));
          });
        }
        break;

      case 'budget':
        if (!f.projects.length) { P(A_ ? 'لا توجد مشروعات مرتبطة بحسابك.' : 'No projects linked to your account.'); break; }
        f.projects.forEach(function (x) {
          if (x.budget <= 0) {
            P('• ' + x.p.name + ' — ' + (A_ ? 'لا توجد موازنة معتمدة' : 'no approved budget'));
            return;
          }
          P('• ' + x.p.name + ': ' + (A_ ? 'موازنة ' : 'budget ') + I18N.money(x.budget) +
            (A_ ? ' · منصرف ' : ' · spent ') + I18N.money(x.actual) +
            ' (' + I18N.pct(x.pct, 1) + ')' +
            (x.pct > 100 ? (A_ ? ' ⚠ تجاوز' : ' ⚠ over') : ''));
        });
        break;

      case 'invoices':
        if (!Auth.canSee('supplierInvoices')) { P(A_ ? 'فواتير الموردين ليست ضمن صلاحياتك.' : 'No access to supplier invoices.'); break; }
        if (!f.dueInvoices.length) { P(A_ ? 'لا توجد فواتير موردين غير مسدَّدة.' : 'No unpaid supplier invoices.'); break; }
        var tot = f.dueInvoices.reduce(function (s, x) { return s + x.due; }, 0);
        P(A_ ? ('غير المسدَّد: ' + I18N.money(tot) + ' على ' + f.dueInvoices.length + ' فاتورة، منها ' +
                f.overdue.length + ' متأخرة.')
              : ('Unpaid: ' + I18N.money(tot) + ' across ' + f.dueInvoices.length + ' invoices, ' + f.overdue.length + ' overdue.'));
        f.dueInvoices.slice(0, 6).forEach(function (x) {
          var sup = Store.find('suppliers', x.inv.supplier);
          P('• ' + (x.inv.docNo || '') + ' — ' + (sup ? sup.name : '') + ' — ' + I18N.money(x.due) +
            (x.inv.dueDate ? (' — ' + (A_ ? 'يستحق ' : 'due ') + I18N.date(x.inv.dueDate)) : ''));
        });
        break;

      case 'collect':
        if (!f.uncollected.length) { P(A_ ? 'لا توجد مستخلصات غير محصّلة.' : 'No uncollected IPCs.'); break; }
        var s2 = f.uncollected.reduce(function (a, x) { return a + x.due; }, 0);
        P(A_ ? ('غير محصّل من العملاء: ' + I18N.money(s2) + ' على ' + f.uncollected.length + ' مستخلص.')
              : ('Uncollected: ' + I18N.money(s2) + ' across ' + f.uncollected.length + ' IPCs.'));
        f.uncollected.slice(0, 6).forEach(function (x) {
          var c = Store.find('customers', x.ipc.customer);
          P('• ' + (x.ipc.docNo || '') + ' — ' + (c ? c.name : '') + ' — ' + I18N.money(x.due) +
            ' — ' + (A_ ? ('منذ ' + daysSince(x.ipc.date) + ' يوم') : (daysSince(x.ipc.date) + ' days')));
        });
        break;

      case 'cash':
        if (!f.cash.length) { P(A_ ? 'الخزائن والبنوك ليست ضمن صلاحياتك.' : 'No access to cash accounts.'); break; }
        var ct = f.cash.reduce(function (a, c) { return a + c.bal; }, 0);
        P(A_ ? ('إجمالي الأرصدة: ' + I18N.money(ct)) : ('Total balance: ' + I18N.money(ct)));
        f.cash.forEach(function (c) { P('• ' + c.acc.name + ' — ' + I18N.money(c.bal)); });
        break;

      case 'people':
        if (!Auth.canSee('employees')) { P(A_ ? 'بيانات الموظفين ليست ضمن صلاحياتك.' : 'No access to employee data.'); break; }
        P(A_ ? ('عدد الموظفين على رأس العمل: ' + f.headcount) : ('Active employees: ' + f.headcount));
        if (f.leavesPending.length) P(A_ ? ('طلبات إجازة تنتظر البت: ' + f.leavesPending.length) : ('Pending leave: ' + f.leavesPending.length));
        if (f.contractsEnding.length) {
          P(A_ ? ('عقود تنتهي خلال شهر: ' + f.contractsEnding.length) : ('Contracts ending in 30 days: ' + f.contractsEnding.length));
          f.contractsEnding.slice(0, 5).forEach(function (e) { P('• ' + e.name + ' — ' + I18N.date(e.contractEnd)); });
        }
        break;

      case 'legal':
        if (!f.expiring.length) { P(A_ ? 'لا توجد مستندات قاربت على الانتهاء.' : 'Nothing expiring soon.'); break; }
        P(A_ ? ('مستندات تنتهي خلال ٩٠ يوماً: ' + f.expiring.length) : (f.expiring.length + ' documents expiring in 90 days'));
        f.expiring.slice(0, 8).forEach(function (d) {
          P('• ' + d.title + ' — ' + I18N.date(d.expiryDate) + ' (' + daysUntil(d.expiryDate) + (A_ ? ' يوم)' : ' days)'));
        });
        break;

      case 'equip':
        if (!Auth.canSee('equipment')) { P(A_ ? 'المعدات ليست ضمن صلاحياتك.' : 'No access to equipment.'); break; }
        var eq = Store.all('equipment');
        var broken = eq.filter(function (e) { return e.condition === 'broken' || e.condition === 'maintenance'; });
        P(A_ ? ('إجمالي المعدات: ' + eq.length + ' · متوقفة أو تحت الصيانة: ' + broken.length)
              : ('Equipment: ' + eq.length + ' · down or in maintenance: ' + broken.length));
        broken.slice(0, 6).forEach(function (e) {
          P('• ' + e.name + ' — ' + Schema.optionLabel(Schema.field('equipment', 'condition'), e.condition));
        });
        break;

      case 'howto':
        P(A_ ? 'اسألني عن أرقامك مباشرة، مثل:' : 'Ask me about your own numbers, for example:');
        suggestions().forEach(function (s) { P('• ' + s); });
        P(A_ ? 'وللخطوات التفصيلية افتح دليل الموظف المرفق مع النظام.'
              : 'For step-by-step instructions see the staff guide shipped with the system.');
        break;

      default:
        briefing().forEach(function (b) { P('• ' + b.text); });
    }

    return lines;
  }

  /* أسئلة مقترحة حسب الدور */
  function suggestions() {
    var u = me(); if (!u) return [];
    var A_ = ar();
    var common = A_ ? ['ما الذي ينتظرني اليوم؟', 'أعطني ملخص وضعي'] : ['What is waiting for me?', 'Give me a summary'];
    var byRole = {
      storekeeper: A_ ? ['ما الأصناف التي قاربت على النفاد؟', 'كم استلام وصرف اليوم؟'] : ['Which items are running out?'],
      accountant: A_ ? ['ما الفواتير المستحقة السداد؟', 'ما رصيد الخزائن والبنوك؟'] : ['Which invoices are due?'],
      procurement: A_ ? ['ما الأصناف التي تحتاج طلب شراء؟', 'ما طلباتي المعلّقة؟'] : ['What needs ordering?'],
      project_manager: A_ ? ['هل مشروعاتي تجاوزت الموازنة؟', 'ما وضع تكلفة مشروعاتي؟'] : ['Are my projects over budget?'],
      technical: A_ ? ['ما المستخلصات تحت الإعداد؟', 'ما وضع موازنات المشروعات؟'] : ['Which IPCs are in preparation?'],
      hr: A_ ? ['كم طلب إجازة ينتظر؟', 'ما العقود التي تنتهي قريباً؟'] : ['How many leave requests are pending?'],
      finance_manager: A_ ? ['ما وضع السيولة؟', 'ما المستخلصات غير المحصّلة؟'] : ['What is our cash position?'],
      gm: A_ ? ['ما المشروعات التي تجاوزت موازنتها؟', 'ما وضع المستحقات والالتزامات؟'] : ['Which projects are over budget?'],
      admin: A_ ? ['ما وضع الشركة اليوم؟', 'ما المستندات المعلّقة؟'] : ['What is the company status today?'],
      legal: A_ ? ['ما المستندات التي تنتهي قريباً؟'] : ['What is expiring soon?'],
      it: A_ ? ['ما طلبات الدعم المفتوحة؟'] : ['What tickets are open?'],
      auditor: A_ ? ['ما المستندات المعكوسة؟'] : ['Which documents were reversed?'],
      employee: A_ ? ['ما التعميمات الجديدة؟', 'كيف أقدّم طلب إجازة؟'] : ['Any new announcements?']
    };
    return (byRole[u.role] || []).concat(common).slice(0, 4);
  }

  async function advancedAnswer(question) {
    if (AI_PROVIDER !== 'edge' || !Store.isOnline() || !Auth.client()) {
      return {
        mode: 'offline',
        answer: answer(question).join('\n'),
        findings: [],
        sources: [],
        notice: ar() ? 'إجابة محلية من البيانات المتاحة على هذا الجهاز.' : 'Local answer from data available on this device.'
      };
    }
    var response = await Auth.client().functions.invoke(ALZAHRAA_CONFIG.aiFunction || 'ai-assistant', {
      body: {
        question: String(question || '').slice(0, 2000),
        language: ar() ? 'ar' : 'en',
        route: global.App ? App.route() : 'assistant'
      }
    });
    if (response.error) throw new Error(response.error.message || 'assistant-unavailable');
    return response.data || { answer: '', findings: [], sources: [] };
  }

  /* ------------------------------------------------------------------
     SCREEN
     ------------------------------------------------------------------ */
  var history = [];

  function render(host) {
    var u = me(); if (!u) return;
    var brief = briefing();
    var A_ = ar();

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('life-buoy', 22) + ' ' + t('ai.title') + '</h1>' +
      '<p class="page-sub">' + t('ai.sub') + ' — ' + UI.esc(Auth.roleLabel(u.role)) + '</p></div>' +
      '<div class="page-actions"><button class="btn btn-outline btn-sm" id="aiPrint">' +
      UI.icon('printer', 15) + ' ' + t('g.print') + '</button></div></div>';

    /* daily briefing */
    html += '<div class="card mb-2"><div class="card-head">' +
      '<h3 class="card-title">' + UI.icon('sun', 17) + ' ' + t('ai.brief') + '</h3>' +
      '<span class="muted small" style="margin-inline-start:auto">' + I18N.date(I18N.today()) + '</span></div>' +
      '<div class="card-body flush">';
    brief.forEach(function (b) {
      html += '<div class="alert-row" ' + (b.go ? 'data-go="' + UI.attr(b.go) + '" data-rid="' + UI.attr(b.rid || '') + '"' : 'style="cursor:default"') + '>' +
        '<span class="al-ic ' + (b.tone === 'urgent' ? 'danger' : b.tone === 'warn' ? 'warn' : b.tone === 'good' ? 'good' : 'info') + '">' +
        UI.icon(b.icon, 15) + '</span>' +
        '<span class="al-tx">' + UI.esc(b.text) + '</span></div>';
    });
    html += '</div></div>';

    /* ask box */
    html += '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.icon('search', 17) + ' ' + t('ai.ask') + '</h3></div><div class="card-body">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input class="input" id="aiQ" placeholder="' + UI.attr(t('ai.ph')) + '" style="flex:1;min-width:200px">' +
      '<button class="btn btn-primary" id="aiGo">' + t('ai.send') + '</button></div>' +
      '<div class="chip-row mt-2" id="aiSug">';
    suggestions().forEach(function (s) {
      html += '<button class="filter-chip" data-q="' + UI.attr(s) + '">' + UI.esc(s) + '</button>';
    });
    html += '</div><div id="aiOut" class="mt-2"></div></div></div>';

    /* honesty note */
    html += '<div class="alert alert-info">' + UI.icon('eye', 17) + '<span>' +
      L({ ar: 'المساعد لا يقرأ إلا السجلات التي يسمح بها دورك ومشروعاتك، ويعرض مصادر استنتاجه. لا يعتمد أو يرحّل أو يدفع أو يعدّل مستنداً. القرار دائماً لك.',
          en: 'The assistant reads only records allowed by your role and projects and shows its evidence. It never approves, posts, pays, or edits a document. The decision is always yours.' }) + '</span></div>';

    host.innerHTML = html;

    async function ask(q) {
      if (!q) return;
      var out = document.getElementById('aiOut');
      var send = document.getElementById('aiGo');
      send.disabled = true; send.setAttribute('aria-busy', 'true');
      out.innerHTML = '<div class="card"><div class="card-body muted">' +
        UI.esc(A_ ? 'جارٍ فحص البيانات وإعداد الإجابة…' : 'Checking the records and preparing the answer…') + '</div></div>' + out.innerHTML;
      var res;
      try { res = await advancedAnswer(q); }
      catch (error) {
        res = { mode: 'offline', answer: answer(q).join('\n'), findings: [], sources: [],
          notice: A_ ? 'تعذّر الوصول للمساعد المتقدم؛ تم استخدام الفحص المحلي الآمن.' : 'Advanced AI was unavailable; the safe local analysis was used.' };
      }
      history.push({ q: q, a: res });
      var h = '<div class="card" style="box-shadow:none;border-color:var(--brand-pale)"><div class="card-body">' +
        '<div class="ai-q">' + UI.icon('user', 14) + ' ' + UI.esc(q) + '</div><div class="ai-a">';
      String(res.answer || '').split('\n').filter(Boolean).forEach(function (line) { h += '<div>' + UI.esc(line) + '</div>'; });
      (res.findings || []).forEach(function (finding) {
        h += '<div class="ai-finding ' + UI.attr(finding.severity || '') + '"><strong>' + UI.esc(finding.title || '') +
          '</strong><div>' + UI.esc(finding.detail || '') + '</div>' +
          (finding.recommendation ? '<small>' + UI.esc(finding.recommendation) + '</small>' : '') + '</div>';
      });
      if ((res.sources || []).length) {
        h += '<div class="ai-evidence">' + res.sources.map(function (source) {
          return '<span class="ai-source">' + UI.esc((source.module || '') + (source.reference ? ' · ' + source.reference : '')) + '</span>';
        }).join('') + '</div>';
      }
      if (res.notice) h += '<div class="muted small mt-2">' + UI.esc(res.notice) + '</div>';
      h += '</div></div></div>';
      var loading = out.querySelector('.card'); if (loading) loading.remove();
      out.innerHTML = h + out.innerHTML;
      document.getElementById('aiQ').value = '';
      send.disabled = false; send.removeAttribute('aria-busy');
    }

    document.getElementById('aiGo').onclick = function () { ask(document.getElementById('aiQ').value.trim()); };
    document.getElementById('aiQ').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') ask(this.value.trim());
    });
    host.querySelectorAll('[data-q]').forEach(function (b) {
      b.onclick = function () { ask(b.getAttribute('data-q')); };
    });
    host.querySelectorAll('[data-go]').forEach(function (row) {
      row.onclick = function () {
        var m = row.getAttribute('data-go'), rid = row.getAttribute('data-rid');
        App.go(m);
        if (rid) setTimeout(function () { try { EntityPage.openDetail(m, rid); } catch (e) {} }, 220);
      };
    });
    var pb = document.getElementById('aiPrint');
    if (pb) pb.onclick = function () { window.print(); };
  }

  global.Assistant = {
    AI_PROVIDER: AI_PROVIDER, EDGE_URL: EDGE_URL,
    facts: facts, briefing: briefing, answer: answer,
    advancedAnswer: advancedAnswer,
    suggestions: suggestions, detect: detect, render: render
  };
})(window);
