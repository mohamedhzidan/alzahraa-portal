/* =========================================================================
   authority-ipc-register.js — سجل مستخلصات الهيئة · The Authority-IPC register
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   مستخلص العميل الحكومي يمرّ بخطوة لا تظهر في أي شاشة اليوم: بعد توقيع
   العميل عليه (clientSignDate) يُقدَّم لجهة اعتماد حكومية («الهيئة»)
   تراجعه وتعتمد قيمة قد تقلّ عمّا طُلب، ثم تُحصَّل النقدية لاحقاً. لا
   توجد شاشة تجيب: كم واقف عند الهيئة الآن؟ كم يوماً تستغرق عادةً من
   التقديم حتى التحصيل الكامل؟ وأي مستخلص لم يُقدَّم لها أصلاً؟

   A government client's IPC passes through a step no screen shows today:
   after the client signs it (clientSignDate) it is submitted to a
   government certifying body ("the Authority") that reviews it and
   certifies a value that may be less than claimed, and the cash follows
   later. No screen answers: how much is currently outstanding at the
   Authority? How long does submission-to-collection usually take? Which
   IPC was never submitted at all?

   -------------------------------------------------------------------------
   🔴 لا اشتقاق جديد · NEVER RE-DERIVE (نفس قاعدة cash-forecast.js الأولى)

   كل رقم هنا من مصدره الوحيد الموجود فعلاً في الموقع:
     · المستخلصات المعتمدة فقط  → Dashboard.analytics.approved('clientIPCs')
     · المحصَّل فعلياً من كل مستخلص → MoneyOwed.collectedOf (money-owed.js)
     · تاريخ اكتمال التحصيل      → سندات القبض المعتمدة المرتبطة
       (receipts.clientIPC، schema.js:387)، بنفس شرط «approved» الذي
       يبني عليه MoneyOwed.collectedOf نفسه — لا حساب مستقل يمكن أن
       يختلف عنه.
   لو اختلف هذا الملف عن تلك المصادر يوماً، فالعطل هنا لا هناك.

   Every figure here comes from its one real source already used
   elsewhere: only approved clientIPCs, the actual collected amount from
   MoneyOwed.collectedOf, and the collection-complete date from the same
   approved receipts (receipts.clientIPC, schema.js:387) that
   MoneyOwed.collectedOf itself sums — no independent calculation that
   could ever disagree with it. If this file ever disagrees with those
   sources, the bug is here, never there.

   -------------------------------------------------------------------------
   🔴 القيمة المعتمدة دليل، لا حساب · THE CERTIFIED VALUE IS EVIDENCE, NOT MATH

   authority-ipc-fields.js يضيف certifiedAmount بلا افتراض صفر — NULL
   يعني «لم يُعتمد بعد». هذا الملف يعرض ذلك بصدق («لم يُعتمد بعد»، لا
   ٪۱۰۰ خصم ولا صفر) ولا يحسب نسبة خصم إطلاقاً بلا قيمة معتمدة حقيقية.
   خصومات الهيئة تبقى بنداً واحداً مجمَّعاً حتى تُفصَّل لاحقاً — ليست جزءاً
   من هذه الشاشة.

   authority-ipc-fields.js adds certifiedAmount with no zero default —
   NULL means "not certified yet". This file shows that honestly ("not
   certified yet", never 0% or 100% haircut) and never computes a haircut
   without a real certified value. Authority deductions remain one lump
   sum until itemised later — not part of this screen.

   -------------------------------------------------------------------------
   🔴 البوابة تفشل مغلقة · THE GATE FAILS CLOSED (نفس أسلوب cash-forecast.js)

   هذه الشاشة تعرض أموال الشركة المستحقة من عميل حكومي — roleview.js
   يحصرها في seesCompanyMoney() (admin/gm/finance_manager) فقط. أي فشل
   يُعامَل كمنع، لا كسماح. لا بوابة جديدة تُخترع هنا.

   This screen shows company money owed by a government client —
   roleview.js restricts it to seesCompanyMoney() (admin/gm/
   finance_manager) only. Any failure is treated as DENY. No new gate is
   invented here.

   -------------------------------------------------------------------------
   لماذا هنا لا شاشة entity.js · WHY HERE, NOT AN entity.js SCREEN

   entity.js يعرض سجلاً واحداً في كل مرة، ولا يحسب وسيطاً زمنياً عبر كل
   المستخلصات ولا إجمالياً واقفاً عند جهة خارجية — هذا تحليل يخصّ
   التقارير، ومكانه بجوار «توقعات النقدية» التي يذهب إليها محمد زيدان
   أصلاً (قاعدة ١٩: البناء حيث يذهب فعلاً، لا مكان أفضل نظرياً).

   entity.js shows one record at a time and cannot compute a median
   across every IPC or a total outstanding at an external body — this is
   analytics, and it belongs beside "Cash forecast", which Mohamed Zidan
   already visits (rule 19: build where he already goes, not a
   theoretically better place).

   -------------------------------------------------------------------------
   لماذا نلفّ ReportsPage.render ونراقب الـ DOM أيضاً — ولماذا subtree:false
   WHY WE WRAP ReportsPage.render AND ALSO WATCH THE DOM, subtree:false

   نفس سبب cash-forecast.js حرفياً (انظر تعليقه): تبويبات reports.js
   الداخلية تستدعي دالة render(host) المغلقة مباشرة لا الاسم العام، فلفّ
   الاسم العام وحده يضبط أول تحميل فقط. المراقب هنا خاص بهذا الملف
   (العلم __azAuthorityRegObs، العنصر #repAuthorityTab) حتى لا يتصادم مع
   مراقب cash-forecast.js — كل ملف يراقب host نفسه بمراقبه المستقل، ولا
   يلتقط أي منهما تعديلات الآخر لأن subtree:false يرى فقط تبديل host
   بالكامل (إعادة بناء حقيقية من reports.js)، لا تعديل عناصر داخلية.

   Exactly cash-forecast.js's own reasoning (see its comment):
   reports.js's internal tabs call the closured render(host) function
   directly, not the global name, so wrapping the global name alone only
   catches the first load. The observer here is this file's own (flag
   __azAuthorityRegObs, element #repAuthorityTab) so it never collides
   with cash-forecast.js's observer — each file watches the same host
   with its own independent observer, and neither catches the other's
   edits because subtree:false only sees host being replaced wholesale
   (a real rebuild from reports.js), never an internal element changing.

   -------------------------------------------------------------------------
   اقتراح تاريخ التحصيل المتوقع — استرشادي فقط، لا كتابة أبداً أبداً
   SUGGESTING AN EXPECTED-COLLECTION DATE — ADVISORY ONLY, NEVER A WRITE

   نفس أسلوب مراقبة #modalHost في import-mapping-plus.js:10-17 (مراقبة
   #modalHost نفسه لا #content، لأن النماذج تُفتح داخل #modalHost —
   لا يخالف قاعدة «لُفّ UI.modal»، مهمتنا معرفة متى ظهر الحقل، لا اعتراض
   الفتح). عند ظهور حقل «متوقع تحصيله في» على نموذج مستخلص عميل، تُضاف
   جملة استرشادية صغيرة تحت تسميته تقول: الهيئة استغرقت تاريخياً كذا
   يوماً (من كذا مستخلص مكتمل). **لا سطر واحد في هذا الملف يكتب
   input.value** — لا يوجد أي كود من هذا النوع هنا إطلاقاً. سجل مكتمل
   بلا مستخلص واحد (N=0) لا يُضيف شيئاً على الإطلاق. لا يُعدَّل حرف واحد
   في cash-forecast.js أو expected-collection-field.js.

   Same #modalHost-watching technique as import-mapping-plus.js:10-17
   (watching #modalHost itself, not #content, because forms open inside
   #modalHost — this does not break "wrap UI.modal"; our job is knowing
   when the field appears, not intercepting the open). When the "expected
   collection date" field appears on a client IPC form, a small advisory
   sentence is added under its label: the Authority has historically
   taken this many days (from this many completed IPCs). **No line in
   this file writes input.value** — no code of that shape exists here at
   all. A register with zero completed IPCs (N=0) adds nothing at all.
   Not one character of cash-forecast.js or expected-collection-field.js
   is touched.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويختفي تبويب «مستخلصات
   الهيئة» والاقتراح الاسترشادي تماماً — لا شيء آخر يتغيّر، وschema.js/
   cash-forecast.js/reports.js تعود لسابق عهدها كأن الملف لم يوجد.
   Delete this file and the "Authority IPCs" tab and the advisory hint
   disappear completely — nothing else changes, and schema.js/
   cash-forecast.js/reports.js revert exactly as if this file never
   existed.

   يُحمَّل بعد cash-forecast.js — يحتاج نفس المتطلبات (pages/reports.js،
   roleview.js، report-access.js) وترتيبها بينها لا يهمّ لأن كل ملف يراقب
   بمراقبه المستقل.
   Load after cash-forecast.js — needs the same prerequisites
   (pages/reports.js, roleview.js, report-access.js); the order between
   the two forecast/register files does not matter, since each watches
   with its own independent observer.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || !global.Dashboard || !global.MoneyOwed || !global.Schema) {
    console.error('authority-ipc-register.js needs store.js, schema.js, pages/dashboard.js and money-owed.js first');
    return;
  }

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · محرك الحساب الصِرف — بلا أي DOM، قابل للاختبار وحده
        THE PURE COMPUTE ENGINE — no DOM at all, testable on its own
     ═══════════════════════════════════════════════════════════════════ */

  function toDateOnly(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(a, b) { return Math.round((toDateOnly(b) - toDateOnly(a)) / 86400000); }

  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /* تاريخ اكتمال التحصيل: نمشي على سندات القبض المعتمدة المرتبطة بهذا
     المستخلص مرتبة بالتاريخ، ونجمع حتى تصل الصافي المستحق — تاريخ آخر
     سند جعل التحصيل كاملاً. نفس شرط «approved» و«clientIPC» الذي يبني
     عليه MoneyOwed.collectedOf (money-owed.js:99-106) حرفياً — لا حساب
     مستقل يمكن أن يختلف عنه.
     The collection-complete date: walk this IPC's approved receipts by
     date and sum until net due is reached — the date of the receipt that
     completed it. The exact same "approved" + "clientIPC" condition
     MoneyOwed.collectedOf itself uses (money-owed.js:99-106) — no
     independent calculation that could ever disagree with it. */
  function completionDateFor(ipcId, netDue) {
    if (!(netDue > 0)) return null;
    var rows = Dashboard.analytics.approved('receipts').filter(function (r) { return r.clientIPC === ipcId; });
    rows.sort(function (a, b) {
      var d = new Date(a.date || 0) - new Date(b.date || 0);
      return d !== 0 ? d : String(a.docNo || '').localeCompare(String(b.docNo || ''));
    });
    var sum = 0;
    for (var i = 0; i < rows.length; i++) {
      sum += Number(rows[i].amount) || 0;
      if (sum >= netDue) return rows[i].date || null;
    }
    return null; /* مجموع السندات لم يصل الصافي بعد — نظرياً فقط، لأن هذا يُنادى فقط حين تثبت collectedOf أن التحصيل مكتمل */
  }

  /* الدالة الصِرفة المُصدَّرة — تُقرأ من فاحص الحزمة مباشرة بلا أي DOM.
     The pure exported function — read directly by the test harness. */
  function compute(today) {
    var now = today ? new Date(today) : new Date();
    var rows = [];
    var notSubmitted = [];
    var outstandingTotal = 0;
    var durations = [];

    Dashboard.analytics.approved('clientIPCs').forEach(function (r) {
      var netDue = Number(r.netDue) || 0;
      var currentWork = Number(r.currentWork) || 0;
      var collected = MoneyOwed.collectedOf(r.id);
      var remaining = netDue - collected;
      var fullyCollected = remaining <= 0;

      var certified = (r.certifiedAmount === undefined || r.certifiedAmount === null || r.certifiedAmount === '')
        ? null : Number(r.certifiedAmount);
      /* ⚠️ لا خصم بلا قيمة معتمدة حقيقية — أبداً ٪۰ ولا ٪۱۰۰ من فراغ */
      var haircut = (certified !== null && currentWork > 0) ? (currentWork - certified) / currentWork : null;

      if (!r.submittedDate) {
        /* دلو منفصل — لا يدخل الجدول الرئيسي ولا إجمالي «واقف عند الهيئة»
           A separate bucket — excluded from the main table and the
           "outstanding at the Authority" total. */
        notSubmitted.push({ id: r.id, docNo: r.docNo, amount: Math.max(remaining, 0) });
        return;
      }

      var completeDate = fullyCollected ? completionDateFor(r.id, netDue) : null;
      var daysWaiting = fullyCollected ? null : daysBetween(r.submittedDate, now);

      if (!fullyCollected) outstandingTotal += remaining;
      if (fullyCollected && completeDate) durations.push(daysBetween(r.submittedDate, completeDate));

      rows.push({
        id: r.id, docNo: r.docNo, project: r.project, netDue: netDue, currentWork: currentWork,
        submittedDate: r.submittedDate, daysWaiting: daysWaiting,
        certified: certified, haircut: haircut,
        remaining: remaining, fullyCollected: fullyCollected, completeDate: completeDate
      });
    });

    rows.sort(function (a, b) { return new Date(a.submittedDate) - new Date(b.submittedDate); });

    var med = median(durations);
    return {
      generatedAt: now, rows: rows, notSubmitted: notSubmitted,
      outstandingTotal: outstandingTotal,
      medianDays: med, n: durations.length
    };
  }

  /* يقرأها فاحص الحزمة مباشرة، والاقتراح الاسترشادي أسفل الملف أيضاً.
     Read directly by the test harness, and by the advisory hint below. */
  global.AuthorityIPCRegister = { compute: compute };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · طبقة الشاشة — كل ما يلي DOM فقط، لا حساب مالي جديد هنا إطلاقاً
        THE SCREEN LAYER — DOM only, no new money math here
     ═══════════════════════════════════════════════════════════════════ */

  var CERT_NA         = { ar: 'لم يُعتمد بعد', en: 'Not certified yet' };
  var NOT_SUBMITTED_H = { ar: 'غير مقدَّم للهيئة بعد', en: 'Not yet submitted to the Authority' };
  var HAIRCUT_FORMULA = { ar: 'نسبة الخصم = (أعمال الفترة − القيمة المعتمدة) ÷ أعمال الفترة — تُحسب فقط عند وجود قيمة معتمدة حقيقية',
                           en: 'Haircut % = (period work − certified amount) ÷ period work — computed only when a real certified value exists' };
  var OUTSTANDING_LBL = { ar: 'واقف عند الهيئة (مُقدَّم وغير محصَّل بالكامل)', en: 'Outstanding at the Authority (submitted, not fully collected)' };
  var MEDIAN_LBL       = { ar: 'الوسيط الزمني من التقديم للتحصيل الكامل', en: 'Median time, submission to full collection' };
  var NOT_AVAILABLE    = { ar: 'غير متاح', en: 'Not available' };
  var DAY_UNIT         = { ar: 'يوم', en: 'day(s)' };
  var FROM_N           = { ar: 'من', en: 'from' };
  var COMPLETED_UNIT   = { ar: 'مستخلص مكتمل التحصيل', en: 'fully-collected IPC(s)' };
  var NOT_COMPLETE     = { ar: 'لم يكتمل بعد', en: 'Not complete yet' };

  var DOC_LINK_STYLE = 'background:none;border:none;padding:0;font:inherit;color:var(--green-700);cursor:pointer;text-decoration:underline';
  var EXP_ROW_STYLE   = 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)';

  /* ماذا يرى المستخدم — بوابة تفشل مغلقة دائماً، نفس roleview.js.
     What the user may see — the gate always fails closed, same roleview.js. */
  function gate() {
    try { return !!(global.RoleView && RoleView.seesCompanyMoney && RoleView.seesCompanyMoney()); }
    catch (e) { return false; }
  }

  var registerActive = false;
  var lastData = null;

  function fmtCertified(v) { return v === null ? UI.esc(L(CERT_NA)) : I18N.money(v); }
  function fmtHaircut(v)   { return v === null ? '—' : I18N.pct(v * 100, 1); }
  function fmtComplete(r)  {
    if (r.completeDate) return I18N.date(r.completeDate);
    return r.fullyCollected ? '—' : UI.esc(L(NOT_COMPLETE));
  }

  function docRowHTML(id, docNo, amount) {
    return '<div style="' + EXP_ROW_STYLE + '"><button type="button" class="ai-doc-link" style="' + DOC_LINK_STYLE +
      '" data-id="' + UI.attr(id) + '">' + UI.esc(docNo || '') + '</button><span class="num">' + I18N.money(amount) + '</span></div>';
  }

  function buildRegisterHTML(data) {
    var h = '<div class="card mb-2"><div class="card-body">' +
      '<p><strong>' + UI.esc(L(OUTSTANDING_LBL)) + ': ' + I18N.money(data.outstandingTotal) + '</strong></p>' +
      '<p style="color:var(--text-3);font-size:12.5px">' + UI.esc(L(HAIRCUT_FORMULA)) + '</p>' +
      '<p style="color:var(--text-3);font-size:12.5px">' + UI.esc(L(MEDIAN_LBL)) + ': ' +
      (data.n > 0
        ? (Math.round(data.medianDays) + ' ' + UI.esc(L(DAY_UNIT)) + ' (' + UI.esc(L(FROM_N)) + ' ' + data.n + ' ' + UI.esc(L(COMPLETED_UNIT)) + ')')
        : UI.esc(L(NOT_AVAILABLE))) +
      '</p></div></div>';

    h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'المستخلص', en: 'IPC' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'تاريخ التقديم للهيئة', en: 'Submitted' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'أيام الانتظار', en: 'Days waiting' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'القيمة المعتمدة', en: 'Certified' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'نسبة الخصم', en: 'Haircut' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'اكتمال التحصيل', en: 'Collection complete' })) + '</th>' +
      '</tr></thead><tbody>';

    if (!data.rows.length) {
      h += '<tr><td colspan="6">' + UI.esc(t('g.noData')) + '</td></tr>';
    }
    data.rows.forEach(function (r) {
      h += '<tr>' +
        '<td><button type="button" class="ai-doc-link" style="' + DOC_LINK_STYLE + '" data-id="' + UI.attr(r.id) + '">' +
          UI.esc(r.docNo || '—') + '</button></td>' +
        '<td class="num">' + I18N.date(r.submittedDate) + '</td>' +
        '<td class="num">' + (r.daysWaiting === null ? '—' : r.daysWaiting) + '</td>' +
        '<td class="num">' + fmtCertified(r.certified) + '</td>' +
        '<td class="num">' + fmtHaircut(r.haircut) + '</td>' +
        '<td class="num">' + fmtComplete(r) + '</td>' +
      '</tr>';
    });
    h += '</tbody></table></div>';

    if (data.notSubmitted.length) {
      h += '<div class="card mt-2"><div class="card-body">';
      h += '<h4>' + UI.esc(L(NOT_SUBMITTED_H)) + '</h4>';
      data.notSubmitted.forEach(function (e) { h += docRowHTML(e.id, e.docNo, e.amount); });
      h += '</div></div>';
    }

    return h;
  }

  function wireRegisterLinks(scope) {
    scope.querySelectorAll('.ai-doc-link').forEach(function (b) {
      b.onclick = function () {
        try { EntityPage.openDetail('clientIPCs', b.getAttribute('data-id')); }
        catch (e) { console.error('authority-ipc-register.js: could not open record', e); }
      };
    });
  }

  function exportRegisterCSV() {
    if (!lastData) return;
    var headers = [
      L({ ar: 'المستخلص', en: 'IPC' }), L({ ar: 'تاريخ التقديم للهيئة', en: 'Submitted' }),
      L({ ar: 'أيام الانتظار', en: 'Days waiting' }), L({ ar: 'القيمة المعتمدة', en: 'Certified' }),
      L({ ar: 'نسبة الخصم %', en: 'Haircut %' }), L({ ar: 'اكتمال التحصيل', en: 'Collection complete' })
    ];
    var rows = lastData.rows.map(function (r) {
      return [
        r.docNo || '', r.submittedDate || '',
        r.daysWaiting === null ? '' : String(r.daysWaiting),
        r.certified === null ? '' : String(Math.round(r.certified)),
        r.haircut === null ? '' : String(Math.round(r.haircut * 1000) / 10),
        r.completeDate || ''
      ];
    });
    UI.exportCSV('سجل_مستخلصات_الهيئة', headers, rows);
    UI.toast(t('g.export') + ' ✓');
  }

  /* الفلاتر (من/إلى/مشروع) لا معنى لها هنا — نخفيها فقط، لا نحذفها، فتعود
     تلقائياً عند أي إعادة رسم حقيقية من reports.js. نفس أسلوب
     cash-forecast.js:688-698 حرفياً (نسخة محلية — لا تصدير بينهما).
     Filters (from/to/project) mean nothing here — we only HIDE them,
     never remove them, so they return on any real rebuild from
     reports.js. Exactly cash-forecast.js:688-698's own technique (a
     local copy — nothing exported between the two files). */
  function toggleFilterRow(hide) {
    var fFrom = document.getElementById('fFrom');
    var card = fFrom ? fFrom.closest('.card') : null;
    if (card) card.style.display = hide ? 'none' : '';
  }

  function rebindExport() {
    var btn = document.getElementById('repExport');
    if (!btn || !btn.parentNode) return;
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.onclick = function () { exportRegisterCSV(); };
  }

  function renderRegisterBody() {
    var body = document.getElementById('repBody');
    if (!body) return;
    lastData = compute(new Date());
    body.innerHTML = buildRegisterHTML(lastData);
    wireRegisterLinks(body);
  }

  function activateRegister(host) {
    registerActive = true;
    ensureTab(host);
  }

  function ensureTab(host) {
    if (!gate()) return;
    var tabs = host.querySelector('.tabs');
    if (!tabs) return; /* دور بلا أي تقرير أصلاً */
    var btn = tabs.querySelector('#repAuthorityTab');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'repAuthorityTab';
      btn.type = 'button';
      btn.onclick = function () { activateRegister(host); };
      tabs.appendChild(btn);
    }
    btn.className = 'tab' + (registerActive ? ' active' : '');
    btn.innerHTML = UI.icon('scale', 15) + ' ' + L({ ar: 'مستخلصات الهيئة', en: 'Authority IPCs' });
    if (registerActive) {
      tabs.querySelectorAll('.tab').forEach(function (b) { if (b !== btn) b.classList.remove('active'); });
      renderRegisterBody();
      toggleFilterRow(true);
      rebindExport();
    }
  }

  /* مراقب مستقل عن مراقب cash-forecast.js تماماً — علم مختلف، فلا يمكن
     تركيبه مرتين ولا التصادم مع الآخر. subtree:false لنفس السبب المشروح
     أعلى الملف. Fully independent of cash-forecast.js's own observer —
     a different flag, so it cannot be installed twice nor collide with
     the other one. subtree:false for the reason explained at the top of
     this file. */
  function ensureObserver(host) {
    if (host.__azAuthorityRegObs) return;
    host.__azAuthorityRegObs = true;
    new MutationObserver(function () {
      try {
        registerActive = false;
        ensureTab(host);
      } catch (e) { console.error('authority-ipc-register.js: observer failed', e); }
    }).observe(host, { childList: true, subtree: false });
  }

  if (!global.ReportsPage || typeof global.ReportsPage.render !== 'function') {
    console.error('authority-ipc-register.js needs pages/reports.js first');
    return;
  }
  var originalRender = global.ReportsPage.render;
  global.ReportsPage.render = function (host) {
    originalRender(host);
    try {
      ensureTab(host);
      ensureObserver(host);
    } catch (e) { console.error('authority-ipc-register.js: failed to attach the register tab', e); }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · اقتراح تاريخ التحصيل المتوقع — استرشادي فقط، لا كتابة أبداً
        SUGGESTED expected-collection date — advisory only, NEVER a write
     ═══════════════════════════════════════════════════════════════════ */

  function suggestionText() {
    var data = compute(new Date());
    if (!data.n) return null; /* N=0 → لا شيء إطلاقاً · N=0 → nothing at all */
    return L({
      ar: 'وسيط سلوك الهيئة تاريخياً: ' + Math.round(data.medianDays) + ' يوم (من ' + data.n +
          ' مستخلص مكتمل) — اقتراح للاسترشاد فقط',
      en: 'Historical Authority behaviour: ' + Math.round(data.medianDays) + ' day(s) (from ' + data.n +
          ' completed IPC(s)) — for guidance only'
    });
  }

  /* الحارس من التكرار: ui.js يكتب innerHTML لكامل #modalBody في كل
     UI.modal، فالسمة تموت تلقائياً مع أول نافذة تالية — تماماً كما في
     import-mapping-plus.js. DOUBLE-APPLICATION GUARD: ui.js rewrites
     #modalBody's innerHTML on every UI.modal call, so the attribute dies
     automatically with the next dialog — exactly like
     import-mapping-plus.js. */
  function onModalMutate() {
    var body = document.getElementById('modalBody');
    if (!body) return;
    var label = body.querySelector('label[data-fname="expectedCollectionDate"]');
    if (!label || label.getAttribute('data-az-authhint') === '1') return;
    label.setAttribute('data-az-authhint', '1');
    var text = suggestionText();
    if (!text) return; /* لا سجل تاريخي بعد — لا نضيف شيئاً */
    var hint = document.createElement('span');
    hint.className = 'field-hint muted';
    hint.setAttribute('style', 'display:block;margin-top:4px');
    hint.textContent = text;
    label.appendChild(hint);
  }

  function startSuggestionObserver() {
    var host = document.getElementById('modalHost');
    if (!host || host.__azAuthoritySuggestObs) return;
    host.__azAuthoritySuggestObs = true;
    new MutationObserver(onModalMutate).observe(host, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startSuggestionObserver);
  else startSuggestionObserver();

  console.info('authority-ipc-register.js ready — "Authority IPCs" tab beside "Cash forecast" in Reports; ' +
               'submittedDate/certifiedAmount enter no formula anywhere.');
})(window);
