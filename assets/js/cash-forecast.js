/* =========================================================================
   cash-forecast.js — تقويم النقدية لاثني عشر أسبوعاً · 12-week cash calendar
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   الشاشات الحالية تجيب كلها عن سؤال واحد: «كم المستحق الآن؟» — تقرير
   النقدية في reports.js يعرض رصيداً واحداً في لحظة واحدة، ولا شاشة تجيب
   عن السؤال الذي يهمّ محمد زيدان فعلاً وهو يعمل متأخراً وحيداً: «هل تكفي
   الخزينة الأسبوع القادم، وبعده، حتى الأسبوع الثاني عشر؟» هذا الملف
   يبني تقويماً أسبوعياً يجمع كل ما سيخرج (مؤكد) وكل ما يُتوقَّع أن يدخل
   (تقديري) في مكان واحد، ويُظهر أول أسبوع تُنكشف فيه الخزينة قبل أن
   يحدث، لا بعده.

   Every existing screen answers one question: "what is owed right now?"
   — the cash report in reports.js shows a single balance at a single
   moment, and no screen answers the question that actually matters to
   Mohamed Zidan working late and alone: "will the cash box still be
   enough next week, and the week after, all the way to week twelve?"
   This file builds a weekly calendar that gathers everything certain to
   go out and everything estimated to come in, in one place, and shows
   the first week the cash box runs short before it happens, not after.

   -------------------------------------------------------------------------
   🔴 القاعدة الأولى: لا اشتقاق جديد أبداً · RULE ONE: NEVER RE-DERIVE

   كل رقم هنا يُقرأ من مصدره الوحيد الموجود فعلاً في الموقع، لا يُعاد حسابه:
     · الرصيد الافتتاحي            → Dashboard.analytics.cashBalance (pages/dashboard.js:129)
     · المستندات المعتمدة فقط      → Dashboard.analytics.approved     (pages/dashboard.js:15)
     · المسدَّد من فواتير الموردين  → MoneyOwed.paidOf                 (money-owed.js)
     · المحصَّل من مستخلصات العميل  → MoneyOwed.collectedOf            (money-owed.js)
     · مطابقة سند صرف بمقاول باطن  → نفس شرط reports.js:487-491 حرفياً
   لو اختلف هذا الملف عن تلك الشاشات يوماً، فالعطل هنا لا هناك — لأن كل
   هذه المصادر مُثبتة فعلاً وتُستعمل في القوائم المالية الحقيقية اليوم.

   Every figure here is read from its one real source already used
   elsewhere in the site, never recomputed independently: opening balance
   from Dashboard.analytics.cashBalance, approved-only filtering from
   Dashboard.analytics.approved, what suppliers have actually been paid
   from MoneyOwed.paidOf, what clients have actually paid from
   MoneyOwed.collectedOf, and subcontractor payment matching from the
   EXACT SAME condition reports.js already uses at lines 487-491. If this
   file ever disagrees with those screens, the bug is here, never there —
   because every one of those sources is already proven and already in
   daily use on real financial screens.

   -------------------------------------------------------------------------
   🔴 القاعدة الثانية: تقديري لا يختلط بمؤكد أبداً · RULE TWO: ESTIMATED NEVER MIXES WITH FIRM

   كل ما سيخرج من الخزينة (فواتير موردين مستحقة، مستخلصات مقاولين، رواتب،
   سلف، عمالة يومية) مبلغ **مؤكد** — مستند معتمد بقيمة معروفة. أما كل ما
   سيدخل فتحصيل تقديري من مستخلصات العميل بتاريخ **كتبه أحد عندنا تخميناً**
   لا وعداً موقّعاً من العميل. الشاشة تُظهر التقديري بخط متقاطع (hatched)
   دائماً، وجملة التحذير مطبوعة على وجه الشاشة نفسها لا في تلميح يختفي.
   خلط الاثنين في رقم واحد هو أخطر خطأ ممكن في تقويم نقدية — يجعل الخزينة
   تبدو آمنة وهي ليست كذلك.

   Everything going OUT (due supplier invoices, subcontractor
   certificates, payroll, advances, daily labour) is a FIRM amount — an
   approved document with a known value. Everything coming IN is an
   ESTIMATED collection against a date someone on our team TYPED as a
   guess, never a date the client signed or promised. The screen always
   marks estimated rows with a hatched pattern, and the warning sentence
   is printed on the face of the screen itself, not hidden in a tooltip
   that can be missed. Mixing the two into one number is the single most
   dangerous mistake a cash calendar can make — it makes the cash box
   look safe when it is not.

   -------------------------------------------------------------------------
   🔴 القاعدة الثالثة: البوابة تفشل مغلقة · RULE THREE: THE GATE FAILS CLOSED

   هذه الشاشة تعرض إجمالي أموال الشركة — رصيد كل خزينة وبنك معاً، وكل
   الفواتير والمستخلصات المعتمدة. roleview.js يحصر هذا في MONEY_ROLES
   (admin · gm · finance_manager) فقط. أي فشل — RoleView غير موجود، أو
   Auth.current() فارغ، أو استثناء غير متوقع — يُعامَل كمنع، لا كسماح.
   لا تُبنى القائمة، لا يُنشأ التبويب، لا يُحسب شيء. هذا هو نفس أسلوب
   pages/reports.js:65-72 (allowed()) نفسه — لا نخترع بوابة جديدة.

   This screen shows the company's total cash — every till and bank
   account combined, and every approved invoice and certificate.
   roleview.js restricts that to MONEY_ROLES (admin, gm, finance_manager)
   only. Any failure — RoleView missing, Auth.current() empty, or an
   unexpected exception — is treated as DENY, never as allow. No tab is
   built, nothing is computed. This mirrors pages/reports.js:65-72's own
   allowed() exactly — no new gate is invented.

   -------------------------------------------------------------------------
   لماذا نلفّ ReportsPage.render ونراقب الـ DOM أيضاً — لا أحدهما وحده
   WHY WE WRAP ReportsPage.render AND ALSO WATCH THE DOM

   تبويبات reports.js الداخلية (data-rep) تستدعي عند الضغط عليها الدالة
   render(host) المغلقة داخل الملف نفسها مباشرة — لا global.ReportsPage.render
   (وهما نفس الدالة في أول تحميل، لكن الإغلاق الداخلي لا يمر أبداً عبر
   الاسم العام بعد ذلك). فلفّ ReportsPage.render وحده يضبط أول تحميل فقط،
   ثم يفوّت كل ضغطة تبويب لاحقة تعيد بناء الصفحة بالكامل. نفس المشكلة التي
   حلّها report-access.js:56-62 بمراقب DOM يعيد التطبيق — هذا الملف يستعمل
   نفس الأسلوب المُثبت، مع فارق واحد مهم: المراقب هنا subtree:false على
   host مباشرة فقط، حتى لا يلتقط تعديلاتنا نحن (تبويبنا، محتوى #repBody،
   إخفاء الفلاتر) كأنها إعادة بناء من reports.js نفسها.

   reports.js's own internal tabs (data-rep) call the closured render(host)
   function DIRECTLY when clicked — not global.ReportsPage.render (the two
   are the same function only at first load; the closure never goes
   through the global name again after that). Wrapping ReportsPage.render
   alone only catches the very first load, then misses every later tab
   click that rebuilds the whole page. This is the exact problem
   report-access.js:56-62 already solved with a DOM observer that
   re-applies — this file uses that same proven technique, with one
   important difference: the observer here is `childList:true,
   subtree:false` on `host` itself only, so it never mistakes our OWN
   changes (our tab, #repBody's content, hiding the filter row) for a
   fresh rebuild coming from reports.js.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويختفي تبويب «توقعات النقدية»
   تماماً وتعود صفحة التقارير لسابق عهدها بالضبط — لا شيء آخر يتغيّر.
   Delete this file and the "Cash forecast" tab disappears completely; the
   Reports page reverts to exactly how it was — nothing else changes.

   يُحمَّل بعد pages/reports.js (يلفّ ReportsPage.render) وroleview.js
   (يستعمل RoleView.seesCompanyMoney) وreport-access.js (نفس أسلوب مراقبة
   الـ DOM أعلاه) — آخر الثلاثة في ترتيب التحميل هو report-access.js، لذا
   هذا الملف يُحمَّل بعده مباشرة.
   Load after pages/reports.js (wraps ReportsPage.render), roleview.js
   (uses RoleView.seesCompanyMoney) and report-access.js (the DOM-watching
   technique above) — the last of the three in load order is
   report-access.js, so this file loads immediately after it.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || !global.Dashboard || !global.MoneyOwed || !global.Schema) {
    console.error('cash-forecast.js needs store.js, schema.js, pages/dashboard.js and money-owed.js first');
    return;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · محرك الحساب الصِرف — بلا أي DOM، قابل للاختبار وحده
        THE PURE COMPUTE ENGINE — no DOM at all, testable on its own
     ═══════════════════════════════════════════════════════════════════ */

  function toDateOnly(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function addDays(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  /* الاثنين هو أول يوم في الأسبوع الأسبوعي هنا (Mon-Sun) — طلب الخطة صراحةً.
     Monday is this calendar's week start (Mon-Sun) — the plan says so explicitly. */
  function mondayOf(d) {
    var x = toDateOnly(d);
    var day = x.getDay(); /* 0=Sun..6=Sat */
    var diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }
  function fmtDM(d) { return d.getDate() + '/' + (d.getMonth() + 1); }
  function weekLabel(start, end) { return 'من ' + fmtDM(start) + ' إلى ' + fmtDM(end); }

  /* تصنيف تاريخ مستند بالنسبة لبداية الأسبوع الأول: بلا تاريخ · قبل
     الأسبوع الأول (متأخر) · داخل الاثني عشر أسبوعاً (رقم الأسبوع) · بعدها
     (خارج الأفق، لا يُعرض إطلاقاً — التقويم اثنا عشر أسبوعاً فقط).
     Classify a document's date against week 1's start: no date · before
     week 1 (overdue) · inside the 12 weeks (which week) · beyond them
     (outside the horizon, not shown at all — this is a 12-week calendar
     only, nothing invents a 13th column). */
  function classifyDate(dateStr, week1Start) {
    if (!dateStr) return { kind: 'none' };
    var d = toDateOnly(dateStr);
    if (isNaN(d.getTime())) return { kind: 'none' };
    if (d < week1Start) return { kind: 'past' };
    var idx = Math.floor((d - week1Start) / 86400000 / 7);
    if (idx >= 12) return { kind: 'beyond' };
    return { kind: 'in', idx: idx };
  }

  function sumAmounts(list) {
    return list.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);
  }

  function monthEndDate(year, monthIndex0) { return new Date(year, monthIndex0 + 1, 0); }

  function makeWeeks(week1Start) {
    var weeks = [];
    for (var i = 0; i < 12; i++) {
      var start = addDays(week1Start, i * 7);
      var end = addDays(start, 6);
      weeks.push({
        index: i, start: start, end: end, label: weekLabel(start, end),
        opening: 0, net: 0, closing: 0, negative: false, warning: null,
        estIn: { total: 0, clientIPC: [], retention: [] },
        firmOut: { total: 0, supplierInvoices: [], subIPCs: [], payroll: [], advances: [], dailyLabour: [] }
      });
    }
    return weeks;
  }

  /* -------- فواتير الموردين (مؤكد خارج) · supplier invoices (firm out) -------- */
  function processSupplierInvoices(weeks, undated, week1Start) {
    Dashboard.analytics.approved('supplierInvoices').forEach(function (r) {
      /* المتبقي الحقيقي = الإجمالي المستحق ناقص ما سُدِّد فعلاً — المصدر
         الوحيد MoneyOwed.paidOf، لا حساب جديد.
         The real remainder = total payable minus what was actually paid —
         the single source is MoneyOwed.paidOf, never a new calculation. */
      var remaining = (Number(r.grandTotal) || 0) - MoneyOwed.paidOf(r.id);
      if (remaining <= 0) return;
      var cls = classifyDate(r.dueDate, week1Start);
      var entry = { id: r.id, docNo: r.docNo, amount: remaining, overdue: cls.kind === 'past' };
      if (cls.kind === 'none') undated.supplierInvoices.push(entry);
      else if (cls.kind === 'past') weeks[0].firmOut.supplierInvoices.push(entry);
      else if (cls.kind === 'in') weeks[cls.idx].firmOut.supplierInvoices.push(entry);
      /* 'beyond' → خارج الأفق، لا يُعرض. outside the horizon, not shown. */
    });
  }

  /* -------- مستخلصات مقاولي الباطن (مؤكد خارج) · subcontractor IPCs (firm out) --------
     لا يوجد حقل يربط سند صرف بمستخلص باطن مُعيَّن (خلافاً لفواتير الموردين
     ومستخلصات العميل)؛ المطابقة الوحيدة الموجودة هي نوع المستفيد + اسمه
     ضمن بيان سند الصرف — وهذا بالضبط شرط reports.js:487-491، نعيد
     استعماله حرفياً هنا، ثم نوزّع المسدَّد على مستخلصات ذلك المقاول
     الأقدم أولاً (نفس مبدأ advance-balance.js في توزيع سداد السلف).
     No field links a payment voucher to one specific subcontractor
     certificate (unlike supplier invoices and client IPCs); the only
     existing match is payee type + name inside the voucher description —
     exactly reports.js:487-491's condition, reused verbatim here, then
     the total paid is allocated across that subcontractor's certificates
     oldest-first (same principle advance-balance.js already uses to
     allocate advance repayments). */
  function processSubIPCs(weeks, week1Start) {
    var approvedSubIPCs = Dashboard.analytics.approved('subIPCs');
    var approvedPayments = Dashboard.analytics.approved('payments');
    Store.all('subcontractors').forEach(function (s) {
      var certs = approvedSubIPCs.filter(function (r) { return r.subcontractor === s.id; });
      if (!certs.length) return;
      certs.sort(function (a, b) {
        var d = new Date(a.date || 0) - new Date(b.date || 0);
        return d !== 0 ? d : String(a.docNo || '').localeCompare(String(b.docNo || ''));
      });
      /* reports.js:487-491 حرفياً — بلا inRange لأننا نريد كل ما دُفع لهذا
         المقاول حتى اليوم، لا مدى تقرير مُختار. reports.js:487-491
         verbatim — without its inRange, because we want everything paid
         to this sub to date, not a chosen report range. */
      var totalPaid = 0;
      approvedPayments.forEach(function (r) {
        if (r.payeeType !== 'subcontractor') return;
        if (r.beneficiary && r.beneficiary.indexOf(s.name) === -1) return;
        totalPaid += Number(r.amount) || 0;
      });
      var pool = totalPaid;
      certs.forEach(function (r) {
        var netDue = Number(r.netDue) || 0;
        if (netDue <= 0) return;
        var allocated = 0;
        if (pool > 0) { allocated = Math.min(pool, netDue); pool -= allocated; }
        var remaining = netDue - allocated;
        if (remaining <= 0) return;
        /* subIPCs.date حقل مطلوب في schema.js، فحالة 'none' نظرية بحتة —
           تُعامَل دفاعياً كمتأخرة حتى لا يختفي مبلغ حقيقي بصمت.
           subIPCs.date is `required: true` in schema.js, so 'none' is
           purely theoretical — handled defensively as overdue so a real
           amount never silently disappears. */
        var cls = classifyDate(r.date, week1Start);
        var entry = {
          id: r.id, docNo: r.docNo, amount: remaining, netDue: netDue, allocated: allocated,
          subcontractor: s.name, totalPaidToSub: totalPaid, overdue: cls.kind !== 'in'
        };
        if (cls.kind === 'in') { entry.overdue = false; weeks[cls.idx].firmOut.subIPCs.push(entry); }
        else if (cls.kind === 'past' || cls.kind === 'none') weeks[0].firmOut.subIPCs.push(entry);
        /* 'beyond' → خارج الأفق. outside the horizon. */
      });
    });
  }

  /* -------- الرواتب (مؤكد خارج) · payroll (firm out) --------
     مسير معتمد بنهاية شهره داخل الأفق → صافيه في أسبوع تلك النهاية.
     نهاية شهر ماضية → تُفترض مسدَّدة (بند ثابت في «لا يشمل»، لا تُحسب).
     شهر مستقبلي داخل الأفق بلا مسير معتمد له → آخر صافي معتمد، معلَّم
     «تقديري» بوضوح — تقدير أفضل من فراغ في تقويم نقدية.
     An approved run whose month-end falls in the horizon → its net that
     week. A past month-end → assumed already paid (a fixed "does not
     include" item, not counted). A future month within the horizon with
     no approved run yet → the last approved net, clearly marked
     "estimated" — an estimate is better than a gap in a cash calendar. */
  function processPayroll(weeks, week1Start, week12End) {
    var runs = Dashboard.analytics.approved('payroll');
    var byPeriod = {};
    runs.forEach(function (r) {
      if (!r.period) return;
      var existing = byPeriod[r.period];
      if (!existing || new Date(r.date || 0) > new Date(existing.date || 0)) byPeriod[r.period] = r;
    });
    var periods = Object.keys(byPeriod).sort();
    var lastRun = periods.length ? byPeriod[periods[periods.length - 1]] : null;

    var cursor = new Date(week1Start.getFullYear(), week1Start.getMonth(), 1);
    for (var guard = 0; guard < 6; guard++) {
      var me = toDateOnly(monthEndDate(cursor.getFullYear(), cursor.getMonth()));
      if (me >= week1Start && me <= week12End) {
        var periodStr = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0');
        var idx = Math.floor((me - week1Start) / 86400000 / 7);
        if (idx >= 0 && idx < 12) {
          var run = byPeriod[periodStr];
          if (run) {
            weeks[idx].firmOut.payroll.push({ id: run.id, docNo: run.docNo, amount: Number(run.netTotal) || 0, period: periodStr, estimated: false });
          } else if (lastRun) {
            weeks[idx].firmOut.payroll.push({ id: lastRun.id, docNo: lastRun.docNo, amount: Number(lastRun.netTotal) || 0, period: periodStr, estimated: true });
          }
        }
      }
      if (me > week12End) break;
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  /* -------- سلف الموظفين (مؤكد خارج) · employee advances (firm out) --------
     receivedDate فارغ = لم تُصرف بعد فعلياً → مستحقة الصرف الآن (أسبوع ١).
     receivedDate مكتوب = صُرفت بالفعل → مصروف سابق منتهٍ، لا يُحسب.
     empty receivedDate = not yet actually handed out → due to be paid now
     (week 1). Filled receivedDate = already disbursed → a spent, closed
     cost, not counted. */
  function processAdvances(weeks) {
    Dashboard.analytics.approved('employeeAdvances').forEach(function (r) {
      if (r.receivedDate) return;
      var amt = Number(r.amount) || 0;
      if (amt <= 0) return;
      weeks[0].firmOut.advances.push({ id: r.id, docNo: r.docNo, amount: amt });
    });
  }

  /* -------- العمالة اليومية (مؤكد خارج) · daily labour (firm out) --------
     paidDate فارغ = مستحقة الصرف بلا موعد محدَّد → أسبوع ١ («مستحق الآن»
     مثل السلف تماماً). paidDate مستقبلي داخل الأفق → أسبوعه. paidDate
     ماضٍ → تُفترض مسدَّدة بالفعل، لا تُحسب (نفس مبدأ الرواتب).
     Empty paidDate = due with no fixed date → week 1 (same "due now"
     treatment as advances). A future paidDate within the horizon → its
     own week. A past paidDate → assumed already paid, not counted (same
     principle as payroll). */
  function processDailyLabour(weeks, week1Start) {
    Dashboard.analytics.approved('dailyLabour').forEach(function (r) {
      var amt = Number(r.totalAmount) || 0;
      if (amt <= 0) return;
      if (!r.paidDate) { weeks[0].firmOut.dailyLabour.push({ id: r.id, docNo: r.docNo, amount: amt }); return; }
      var cls = classifyDate(r.paidDate, week1Start);
      if (cls.kind === 'past') return;
      if (cls.kind === 'in') weeks[cls.idx].firmOut.dailyLabour.push({ id: r.id, docNo: r.docNo, amount: amt });
      /* 'beyond' → خارج الأفق. outside the horizon. */
    });
  }

  /* -------- مستخلصات العميل والاحتجاز (تقديري داخل) · client IPCs & retention (estimated in) --------
     نفس القائمة المعتمدة تُقرأ مرة واحدة وتُستعمل للتحصيل والاحتجاز معاً
     — لا اشتقاق مزدوج. The same approved list is read once and used for
     both collections and retention — no double derivation. */
  function processClientIPCs(weeks, undated, memo, week1Start) {
    Dashboard.analytics.approved('clientIPCs').forEach(function (r) {
      var remaining = (Number(r.netDue) || 0) - MoneyOwed.collectedOf(r.id);
      if (remaining > 0) {
        var cls = classifyDate(r.expectedCollectionDate, week1Start);
        var entry = { id: r.id, docNo: r.docNo, amount: remaining, overdue: cls.kind === 'past' };
        if (cls.kind === 'none') undated.clientIPCs.push(entry);
        else if (cls.kind === 'past') weeks[0].estIn.clientIPC.push(entry);
        else if (cls.kind === 'in') weeks[cls.idx].estIn.clientIPC.push(entry);
        /* 'beyond' → خارج الأفق، لا يُعرض. */
      }

      var ret = Number(r.retention) || 0;
      if (ret <= 0) return;
      if (r.retentionReleasedDate) {
        var rcls = classifyDate(r.retentionReleasedDate, week1Start);
        if (rcls.kind === 'in') weeks[rcls.idx].estIn.retention.push({ id: r.id, docNo: r.docNo, amount: ret });
        else if (rcls.kind === 'beyond') memo.push({ id: r.id, docNo: r.docNo, amount: ret });
        /* 'past' → أُفرج عنه بالفعل، تاريخ تاريخي، لا يظهر في تقويم ولا
           مذكرة. 'past' → already released — history, appears in neither
           the calendar nor the memo. */
      } else {
        memo.push({ id: r.id, docNo: r.docNo, amount: ret });
      }
    });
  }

  /* -------- الجملة الثابتة أسفل الشاشة · fixed text at the foot of the screen --------
     ثابتة تماماً كما في الخطة المعتمدة — لا إضافة ولا حذف بند.
     Fixed exactly as the approved plan lists it — no item added or removed. */
  var NOTES_LIST = [
    { ar: 'نقدية تُصرف خارج المنظومة', en: 'Cash spent outside the portal' },
    { ar: 'تسويات الضريبة والتأمينات', en: 'VAT / insurance settlements' },
    { ar: 'المسودات غير المعتمدة', en: 'Unapproved drafts' },
    { ar: 'مرتبات الشهور الماضية (تُفترض مسدَّدة بالفعل)', en: 'Past payrolls (assumed already paid)' },
    { ar: 'مدفوعات مقاولي الباطن التي لا يحمل بيان المستفيد فيها اسم المقاول', en: "Subcontractor payments whose voucher beneficiary doesn't carry the sub's name" },
    { ar: 'البيانات تبدأ من تاريخ بدء التسجيل الفعلي على النظام', en: 'The data starts from the actual go-live date' }
  ];
  var DISCLAIMER = {
    ar: 'التحصيلات المتوقعة أرقام تقديرية كتبها فريقنا — ليست وعداً من العميل.',
    en: "Expected collections are estimates our team typed — not a promise from the client."
  };
  var FOOTER_FORMULA = {
    ar: 'صافي الأسبوع = تحصيلات تقديرية − مستحقات موردين − مستخلصات مقاولين − رواتب − سلف − عمالة يومية',
    en: 'Net for the week = estimated collections − supplier dues − subcontractor certificates − payroll − advances − daily labour'
  };
  var ALLOCATION_RULE = {
    ar: 'مسدَّد مقاول الباطن يُوزَّع على مستخلصاته الأقدم أولاً، لأن سند الصرف يذكر اسم المقاول لا رقم المستخلص المحدَّد.',
    en: "A subcontractor's payments are allocated across their certificates oldest-first, because the payment voucher names the subcontractor, not a specific certificate."
  };

  /* الدالة الصِرفة المُصدَّرة — بلا DOM إطلاقاً، تصلح للاختبار الآلي وحده.
     The pure exported function — no DOM at all, fit for an automated
     harness on its own. */
  function compute(today) {
    var base = today ? new Date(today) : new Date();
    var week1Start = mondayOf(base);
    var weeks = makeWeeks(week1Start);
    var week12End = new Date(weeks[11].end);
    week12End.setHours(23, 59, 59, 999);

    var undated = { supplierInvoices: [], clientIPCs: [] };
    var retentionMemo = [];

    var openingTotal = 0;
    Store.all('cashAccounts').forEach(function (acc) {
      openingTotal += Number(Dashboard.analytics.cashBalance(acc.id)) || 0;
    });
    weeks[0].opening = openingTotal;

    processSupplierInvoices(weeks, undated, week1Start);
    processSubIPCs(weeks, week1Start);
    processPayroll(weeks, week1Start, week12End);
    processAdvances(weeks);
    processDailyLabour(weeks, week1Start);
    processClientIPCs(weeks, undated, retentionMemo, week1Start);

    var firstNegative = -1;
    for (var w = 0; w < 12; w++) {
      var wk = weeks[w];
      wk.estIn.total = sumAmounts(wk.estIn.clientIPC) + sumAmounts(wk.estIn.retention);
      wk.firmOut.total = sumAmounts(wk.firmOut.supplierInvoices) + sumAmounts(wk.firmOut.subIPCs) +
        sumAmounts(wk.firmOut.payroll) + sumAmounts(wk.firmOut.advances) + sumAmounts(wk.firmOut.dailyLabour);
      wk.net = wk.estIn.total - wk.firmOut.total;
      wk.closing = wk.opening + wk.net;
      wk.negative = wk.closing < 0;
      if (wk.negative && firstNegative === -1) firstNegative = w;
      if (w < 11) weeks[w + 1].opening = wk.closing;
    }
    if (firstNegative !== -1) {
      var shortfall = Math.round(Math.abs(weeks[firstNegative].closing)).toLocaleString('ar-EG');
      weeks[firstNegative].warning = 'في الأسبوع ده الخزنة مش هتكفي بـ ' + shortfall + ' جنيه لو اتحصّلش حاجة';
    }

    return {
      generatedAt: base, week1Start: week1Start, week12End: week12End,
      weeks: weeks, undated: undated, retentionMemo: retentionMemo,
      disclaimer: DISCLAIMER, footerFormula: FOOTER_FORMULA, allocationRule: ALLOCATION_RULE, notes: NOTES_LIST
    };
  }

  /* يقرأها فاحص الحزمة (test harness) مباشرة بلا أي DOM.
     Read directly by the test harness, with no DOM at all. */
  global.CashForecast = { compute: compute };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · طبقة الشاشة — كل ما يلي DOM فقط، لا حساب مالي جديد هنا إطلاقاً
        THE SCREEN LAYER — everything below is DOM only, no new money math
     ═══════════════════════════════════════════════════════════════════ */

  var CAT_LABEL = {
    clientIPC: { ar: 'تحصيلات تقديرية من العملاء', en: 'Estimated client collections' },
    retention: { ar: 'إفراج احتجاز متوقَّع', en: 'Expected retention release' },
    supplierInvoices: { ar: 'مستحقات موردين', en: 'Supplier dues' },
    subIPCs: { ar: 'مستخلصات مقاولي الباطن', en: 'Subcontractor certificates' },
    payroll: { ar: 'رواتب', en: 'Payroll' },
    advances: { ar: 'سلف موظفين', en: 'Employee advances' },
    dailyLabour: { ar: 'عمالة يومية', en: 'Daily labour' }
  };
  var OVERDUE_LABEL = {
    clientIPC: { ar: 'متأخر التحصيل', en: 'Overdue collection' },
    supplierInvoices: { ar: 'متأخر', en: 'Overdue' },
    subIPCs: { ar: 'متأخر', en: 'Overdue' }
  };
  var MODULE_OF = {
    clientIPC: 'clientIPCs', retention: 'clientIPCs', supplierInvoices: 'supplierInvoices',
    subIPCs: 'subIPCs', payroll: 'payroll', advances: 'employeeAdvances', dailyLabour: 'dailyLabour'
  };

  /* ماذا يرى المستخدم — بوابة تفشل مغلقة دائماً. What the user may see —
     the gate always fails closed. */
  function gate() {
    try { return !!(global.RoleView && RoleView.seesCompanyMoney && RoleView.seesCompanyMoney()); }
    catch (e) { return false; }
  }

  var forecastActive = false;
  var lastData = null;

  function getListFor(wk, catKey) {
    switch (catKey) {
      case 'clientIPC': return wk.estIn.clientIPC;
      case 'retention': return wk.estIn.retention;
      case 'supplierInvoices': return wk.firmOut.supplierInvoices;
      case 'subIPCs': return wk.firmOut.subIPCs;
      case 'payroll': return wk.firmOut.payroll;
      case 'advances': return wk.firmOut.advances;
      case 'dailyLabour': return wk.firmOut.dailyLabour;
      default: return [];
    }
  }

  /* التقديري يُخطَّط بخطوط متقاطعة على وجه الخلية نفسها، لا بصنف CSS في
     styles.css — هذا الملف ممنوع من لمس styles.css (خارج نطاق الخطة)،
     فالتمييز البصري يأتي كنمط داخلي (inline) بدلاً منه.
     Estimated cells are hatched on the cell itself, not via a class in
     styles.css — this file must not touch styles.css (out of the plan's
     scope), so the visual distinction is an inline style instead. */
  var HATCH_STYLE = 'background:repeating-linear-gradient(45deg,rgba(201,162,39,.20),rgba(201,162,39,.20) 6px,transparent 6px,transparent 12px)';
  /* أزرار الخلايا القابلة للتوسيع تُصمَّم لتبدو كنص عادي قابل للنقر، لا
     كزر متصفح افتراضي — بلا صنف CSS جديد، لنفس سبب HATCH_STYLE أعلاه.
     Expandable cell buttons are styled to look like plain clickable text,
     not a default browser button — no new CSS class, same reason as
     HATCH_STYLE above. */
  var CELL_BTN_STYLE = 'background:none;border:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px';
  var DOC_LINK_STYLE = 'background:none;border:none;padding:0;font:inherit;color:var(--green-700);cursor:pointer;text-decoration:underline';
  var EXP_ROW_STYLE = 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)';

  function cellHTML(weekIdx, catKey, list, isEstimated) {
    var hatchAttr = isEstimated ? ' style="' + HATCH_STYLE + '"' : '';
    if (!list.length) return '<td class="num"' + hatchAttr + '>—</td>';
    var hasOverdue = list.some(function (e) { return e.overdue; });
    var total = sumAmounts(list);
    var cls = 'num' + (hasOverdue ? ' neg' : '');
    var badge = OVERDUE_LABEL[catKey];
    return '<td class="' + cls + '"' + hatchAttr + '><button type="button" class="fc-cell" style="' + CELL_BTN_STYLE + '" data-week="' + weekIdx + '" data-cat="' + catKey + '">' +
      I18N.money(total) + (list.length > 1 ? ' <span style="color:var(--text-3);font-weight:400">(' + list.length + ')</span>' : '') +
      (hasOverdue && badge ? ' <span class="badge b-rejected plain">' + UI.esc(L(badge)) + '</span>' : '') +
      '</button></td>';
  }

  function rowHTML(label, weeks, catKey, isEstimated) {
    var h = '<tr><td>' + UI.esc(label) + '</td>';
    weeks.forEach(function (wk) { h += cellHTML(wk.index, catKey, getListFor(wk, catKey), isEstimated); });
    return h + '</tr>';
  }

  function buildForecastHTML(data) {
    var h = '';

    h += '<div class="card mb-2"><div class="card-body">' +
      '<p><strong>' + UI.esc(L(DISCLAIMER)) + '</strong></p>' +
      '<p>' + UI.esc(L(FOOTER_FORMULA)) + '</p>' +
      '<p style="color:var(--text-3);font-size:12.5px">' + UI.esc(L(ALLOCATION_RULE)) + '</p>' +
      '<p style="color:var(--text-3);font-size:12.5px">' +
      L({ ar: 'لا يشمل هذا التقويم: ', en: 'This calendar does not include: ' }) +
      data.notes.map(function (n) { return UI.esc(L(n)); }).join(' · ') + '</p>' +
      '</div></div>';

    h += '<div class="table-wrap"><table class="data-table"><thead><tr><th class="no-sort">' +
      UI.esc(L({ ar: 'البند', en: 'Item' })) + '</th>';
    data.weeks.forEach(function (wk) { h += '<th class="no-sort">' + UI.esc(wk.label) + '</th>'; });
    h += '</tr></thead><tbody>';

    h += '<tr><td>' + UI.esc(L({ ar: 'الرصيد الافتتاحي', en: 'Opening balance' })) + '</td>';
    data.weeks.forEach(function (wk) { h += '<td class="num">' + I18N.money(wk.opening) + '</td>'; });
    h += '</tr>';

    h += rowHTML(L(CAT_LABEL.clientIPC), data.weeks, 'clientIPC', true);
    h += rowHTML(L(CAT_LABEL.retention), data.weeks, 'retention', true);
    h += rowHTML(L(CAT_LABEL.supplierInvoices), data.weeks, 'supplierInvoices', false);
    h += rowHTML(L(CAT_LABEL.subIPCs), data.weeks, 'subIPCs', false);
    h += rowHTML(L(CAT_LABEL.payroll), data.weeks, 'payroll', false);
    h += rowHTML(L(CAT_LABEL.advances), data.weeks, 'advances', false);
    h += rowHTML(L(CAT_LABEL.dailyLabour), data.weeks, 'dailyLabour', false);

    h += '<tr><td class="strong">' + UI.esc(L({ ar: 'صافي الأسبوع', en: 'Net for the week' })) + '</td>';
    data.weeks.forEach(function (wk) {
      h += '<td class="num strong ' + (wk.net < 0 ? 'neg' : 'pos') + '">' + I18N.money(wk.net) + '</td>';
    });
    h += '</tr>';

    h += '<tfoot><tr>';
    h += '<td class="strong">' + UI.esc(L({ ar: 'الرصيد الختامي', en: 'Closing balance' })) + '</td>';
    data.weeks.forEach(function (wk) {
      var cell = '<td class="strong num ' + (wk.negative ? 'neg' : 'pos') + '" style="background:var(--surface-2)">' + I18N.money(wk.closing);
      if (wk.warning) cell += '<div style="font-weight:400;font-size:11px;white-space:normal;max-width:150px">' + UI.esc(wk.warning) + '</div>';
      cell += '</td>';
      h += cell;
    });
    h += '</tr></tfoot></table></div>';

    h += '<div id="fcExpansion"></div>';

    /* دلاء «بلا تاريخ» — لا تُحسَب في أي أسبوع أبداً، ولا تختفي بصمت.
       "No date" buckets — never counted in any week, never silently
       dropped. */
    if (data.undated.supplierInvoices.length || data.undated.clientIPCs.length) {
      h += '<div class="card mt-2"><div class="card-body">';
      h += '<h4>' + UI.esc(L({ ar: 'بلا تاريخ', en: 'No date' })) + '</h4>';
      if (data.undated.supplierInvoices.length) {
        h += '<p class="strong">' + UI.esc(L(CAT_LABEL.supplierInvoices)) + '</p>';
        data.undated.supplierInvoices.forEach(function (e) { h += fcDocRowHTML('supplierInvoices', e); });
      }
      if (data.undated.clientIPCs.length) {
        h += '<p class="strong">' + UI.esc(L(CAT_LABEL.clientIPC)) + '</p>';
        data.undated.clientIPCs.forEach(function (e) { h += fcDocRowHTML('clientIPC', e); });
      }
      h += '</div></div>';
    }

    /* مذكرة الاحتجاز — مستحق لنا وغير محسوب، حتى يُحدَّد له تاريخ إفراج
       داخل الأفق. Retention memo — owed to us and not counted, until it
       is given a release date inside the horizon. */
    if (data.retentionMemo.length) {
      h += '<div class="card mt-2"><div class="card-body">';
      h += '<h4>' + UI.esc(L({ ar: 'احتجاز مستحق لنا وغير محسوب', en: 'Retention owed to us, not counted' })) + '</h4>';
      data.retentionMemo.forEach(function (e) { h += fcDocRowHTML('retention', e); });
      h += '</div></div>';
    }

    return h;
  }

  function fcDocRowHTML(catKey, e) {
    return '<div style="' + EXP_ROW_STYLE + '"><button type="button" class="fc-doc-link" style="' + DOC_LINK_STYLE + '" data-module="' + MODULE_OF[catKey] + '" data-id="' + UI.attr(e.id) + '">' +
      UI.esc(e.docNo || '') + '</button><span class="num">' + I18N.money(e.amount) + '</span></div>';
  }

  function showExpansion(weekIdx, catKey) {
    if (!lastData) return;
    var wk = lastData.weeks[weekIdx];
    if (!wk) return;
    var list = getListFor(wk, catKey);
    var panel = document.getElementById('fcExpansion');
    if (!panel) return;
    var title = L(CAT_LABEL[catKey]) + ' — ' + wk.label;
    var rows = list.map(function (e) {
      var alloc = (catKey === 'subIPCs' && e.netDue !== undefined)
        ? '<div style="font-size:11.5px;color:var(--text-3)">' +
          L({ ar: 'صافي المستحق ', en: 'Net due ' }) + I18N.money(e.netDue) + ' — ' +
          L({ ar: 'المخصَّص من المسدَّد ', en: 'allocated from paid ' }) + I18N.money(e.allocated) + '</div>' : '';
      return '<div style="' + EXP_ROW_STYLE + '"><button type="button" class="fc-doc-link" style="' + DOC_LINK_STYLE + '" data-module="' + MODULE_OF[catKey] + '" data-id="' + UI.attr(e.id) + '">' +
        UI.esc(e.docNo || '') + '</button><span class="num">' + I18N.money(e.amount) + '</span>' + alloc + '</div>';
    }).join('');
    var allocNote = catKey === 'subIPCs' ? '<p style="font-size:11.5px;color:var(--text-3)">' + UI.esc(L(ALLOCATION_RULE)) + '</p>' : '';
    panel.innerHTML = '<div class="card mt-2"><div class="card-body">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong>' + UI.esc(title) + '</strong>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="fcExpClose">' + UI.icon('x', 14) + '</button></div>' +
      allocNote + (rows || '<p>' + UI.esc(t('g.noData')) + '</p>') + '</div></div>';
    wireDocLinks(panel);
    var closeBtn = document.getElementById('fcExpClose');
    if (closeBtn) closeBtn.onclick = function () { panel.innerHTML = ''; };
  }

  function wireDocLinks(scope) {
    scope.querySelectorAll('.fc-doc-link').forEach(function (b) {
      b.onclick = function () {
        try { EntityPage.openDetail(b.getAttribute('data-module'), b.getAttribute('data-id')); }
        catch (e) { console.error('cash-forecast.js: could not open record', e); }
      };
    });
  }

  function wireForecastInteractions(body) {
    body.querySelectorAll('.fc-cell').forEach(function (btn) {
      btn.onclick = function () { showExpansion(Number(btn.getAttribute('data-week')), btn.getAttribute('data-cat')); };
    });
    wireDocLinks(body);
  }

  function exportForecastCSV() {
    if (!lastData) return;
    var headers = [L({ ar: 'البند', en: 'Item' })].concat(lastData.weeks.map(function (w) { return w.label; }));
    function numRow(v) { return String(Math.round(v)); }
    var rows = [
      [L({ ar: 'الرصيد الافتتاحي', en: 'Opening balance' })].concat(lastData.weeks.map(function (w) { return numRow(w.opening); })),
      [L(CAT_LABEL.clientIPC)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.estIn.clientIPC)); })),
      [L(CAT_LABEL.retention)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.estIn.retention)); })),
      [L(CAT_LABEL.supplierInvoices)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.firmOut.supplierInvoices)); })),
      [L(CAT_LABEL.subIPCs)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.firmOut.subIPCs)); })),
      [L(CAT_LABEL.payroll)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.firmOut.payroll)); })),
      [L(CAT_LABEL.advances)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.firmOut.advances)); })),
      [L(CAT_LABEL.dailyLabour)].concat(lastData.weeks.map(function (w) { return numRow(sumAmounts(w.firmOut.dailyLabour)); })),
      [L({ ar: 'صافي الأسبوع', en: 'Net for the week' })].concat(lastData.weeks.map(function (w) { return numRow(w.net); })),
      [L({ ar: 'الرصيد الختامي', en: 'Closing balance' })].concat(lastData.weeks.map(function (w) { return numRow(w.closing); }))
    ];
    UI.exportCSV('توقعات_النقدية', headers, rows);
    UI.toast(t('g.export') + ' ✓');
  }

  function toggleFilterRow(hide) {
    var fFrom = document.getElementById('fFrom');
    var card = fFrom ? fFrom.closest('.card') : null;
    /* الفلاتر (من/إلى/مشروع) لا معنى لها في تقويم يبدأ دائماً من اليوم —
       نخفيها فقط، لا نحذفها، فتعود تلقائياً عند أي إعادة رسم حقيقية من
       reports.js. Filters (from/to/project) mean nothing on a calendar
       that always starts from today — we only HIDE them, never remove
       them, so they return automatically on any real rebuild from
       reports.js. */
    if (card) card.style.display = hide ? 'none' : '';
  }

  function rebindExport() {
    var btn = document.getElementById('repExport');
    if (!btn || !btn.parentNode) return;
    /* استبدال بالنسخ — يزيل أي مستمع سابق دفعة واحدة، ولأن أي إعادة رسم
       حقيقية من reports.js تُنشئ زراً جديداً بمستمعها هي، فلا حاجة
       لاستعادة شيء يدوياً. Clone-replace — removes any previous listener
       in one move, and since any real rebuild from reports.js creates a
       brand-new button with its own listener, nothing needs to be
       manually restored later. */
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.onclick = function () { exportForecastCSV(); };
  }

  function renderForecastBody() {
    var body = document.getElementById('repBody');
    if (!body) return;
    lastData = compute(new Date());
    body.innerHTML = buildForecastHTML(lastData);
    wireForecastInteractions(body);
  }

  function activateForecast(host) {
    forecastActive = true;
    ensureTab(host);
  }

  function ensureTab(host) {
    if (!gate()) return;
    var tabs = host.querySelector('.tabs');
    if (!tabs) return; /* دور بلا أي تقرير أصلاً — لا شيء لإلحاقه به */
    var btn = tabs.querySelector('#repForecastTab');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'repForecastTab';
      btn.type = 'button';
      btn.onclick = function () { activateForecast(host); };
      tabs.appendChild(btn);
    }
    btn.className = 'tab' + (forecastActive ? ' active' : '');
    btn.innerHTML = UI.icon('calendar', 15) + ' ' + L({ ar: 'توقعات النقدية', en: 'Cash forecast' });
    if (forecastActive) {
      tabs.querySelectorAll('.tab').forEach(function (b) { if (b !== btn) b.classList.remove('active'); });
      renderForecastBody();
      toggleFilterRow(true);
      rebindExport();
    }
  }

  /* المراقب يلتقط فقط إعادة بناء host بالكامل (تبويب عادي · تغيير فلتر ·
     مسح فلاتر) — subtree:false عمداً حتى لا يلتقط تعديلاتنا نحن (تبويبنا،
     محتوى #repBody، إخفاء بطاقة الفلاتر)، وإلا لدخلنا حلقة تُصحّح نفسها.
     The observer only catches a FULL rebuild of host (a normal tab, a
     filter change, clearing filters) — subtree:false deliberately, so it
     never catches our own edits (our tab, #repBody's content, hiding the
     filter card), or we would enter a self-correcting loop. */
  function ensureObserver(host) {
    if (host.__azCashForecastObs) return;
    host.__azCashForecastObs = true;
    new MutationObserver(function () {
      try {
        forecastActive = false;
        ensureTab(host);
      } catch (e) { console.error('cash-forecast.js: observer failed', e); }
    }).observe(host, { childList: true, subtree: false });
  }

  if (!global.ReportsPage || typeof global.ReportsPage.render !== 'function') {
    console.error('cash-forecast.js needs pages/reports.js first');
    return;
  }
  var originalRender = global.ReportsPage.render;
  global.ReportsPage.render = function (host) {
    originalRender(host);
    try {
      ensureTab(host);
      ensureObserver(host);
    } catch (e) { console.error('cash-forecast.js: failed to attach the forecast tab', e); }
  };
})(window);
