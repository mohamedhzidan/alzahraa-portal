/* =========================================================================
   desk-settlement-review.js — شاشة قرارات المراجعة لكل سطر + التصحيح
                               Per-line REVIEW decisions + the correction
                               flow (plan §2 J-A/J-G, §9.1)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢).

   لماذا نستبدل EntityPage.openDetail كلّياً لهذه الوحدة وحدها · WHY WE
   REPLACE EntityPage.openDetail ENTIRELY FOR THIS ONE MODULE
   -------------------------------------------------------------------------
   az_acc_settlement_guard (الملف 87 · 87-CUSTODY-DOCUMENTS.sql، الفقرة ب) يرفض أي
   تحويل مباشر لحالة تسوية العهدة إلى «مُراجَع» ما لم يحمل مفتاحاً
   (app.az_acc_review_door) لا يضعه إلا az_acc_review_lines. فلو تُرك زرّ
   «مراجعة» العام (Workflow.actions) يعمل كما هو، لظهر للمستخدم كأنه يعمل
   ثم يفشل بخطأ قاعدة بيانات غامض. فبدل إخفاء الزرّ فقط، نبني شاشة تفصيلية
   واحدة تغطي كل حالات هذه الوحدة (وليس المراجعة فقط)، وتُستدعى دائماً بدل
   الشاشة العامة — والحالات غير الحسّاسة (مسودة/مرفوضة/مُعادة) تعرض نفس
   المعلومات التي كانت ستظهر، فلا نقص وظيفي.
   az_acc_settlement_guard (file 87 · 87-CUSTODY-DOCUMENTS.sql, paragraph b) rejects
   any DIRECT move of a settlement to "reviewed" unless it carries a key
   (app.az_acc_review_door) that only az_acc_review_lines ever sets. If
   the generic "مراجعة" (Workflow.actions) button were left working as-is,
   it would look like it works and then fail with an opaque database
   error. Instead of merely hiding the button, we build ONE detailed
   screen that covers every status of this module (not review alone), and
   it is always what opens — the non-sensitive statuses (draft/rejected/
   returned) show the same information the generic screen would, so
   nothing is functionally lost.

   الاعتماد يبقى بالباب العام · APPROVE STAYS ON THE GENERIC DOOR
   -------------------------------------------------------------------------
   az_acc_settlement_guard لا يمنع reviewed→approved المباشر — فقط
   draft/pending→reviewed. فزرّ «اعتماد» هنا يستدعي EntityPage.doTransition
   العام كالمعتاد؛ az_acc_finance_band_guard (حدّ ١٠٠،٠٠٠ للمدير المالي)
   يعمل من طرف القاعدة تلقائياً، بلا حاجة لأي كود هنا.
   az_acc_settlement_guard does NOT block a direct reviewed→approved —
   only draft/pending→reviewed. So the "اعتماد" button here calls the
   generic EntityPage.doTransition exactly as normal; az_acc_finance_band_
   guard (the 100,000 finance-manager cap) runs on the DATABASE side
   automatically, no code needed here for it.

   az_acc_start_correction — مبنيّ ضده مباشرة، مع مسار احتياطي معلَن ·
   BUILT DIRECTLY AGAINST IT, WITH A DECLARED FALLBACK
   -------------------------------------------------------------------------
   وُجدت هذه الدالّة فعلاً في الملف 87 (87-CUSTODY-DOCUMENTS.sql، القسم ١٤) —
   تُستدعى مباشرة. لو غابت مستقبلاً (تعديل يزيلها) يُظهر الزرّ رسالة صريحة
   بدل فشل صامت، لا يبني تحايلاً بديلاً على القاعدة.
   This function was found already PRESENT in file 87
   (87-CUSTODY-DOCUMENTS.sql, section 14) — called directly. If it were ever removed, the
   button shows a plain message instead of failing silently; it does not
   build a workaround around the database.

   إضافي بالكامل — حذف هذا الملف يعيد EntityPage.openDetail('custodySettlements', …)
   إلى الشاشة العامة (وسيفشل زرّ «مراجعة» العام كما وُصف أعلاه — وهو بالضبط
   السلوك المُصلَح بهذا الملف؛ حذفه يعيد العطل، لا يخفيه).
   Fully additive — deleting this file returns
   EntityPage.openDetail('custodySettlements', …) to the generic screen
   (and the generic "مراجعة" button will fail as described above — that
   IS the bug this file fixes; deleting it brings the bug back, it does
   not hide it).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.EntityPage || !global.Schema || !global.Store || !global.Auth) {
    console.error('desk-settlement-review.js needs EntityPage/Schema/Store/Auth first — not installed');
    return;
  }

  var TABLE = 'custodySettlements';
  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }
  function L2(o) { return (global.L ? L(o) : o.ar); }
  function money(v) { return (global.I18N && I18N.money) ? I18N.money(v || 0) : String(v || 0); }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function displayRef(mod, field, id) {
    var target = Schema.get(field.ref);
    if (!target || !id) return id || '—';
    var rec = Store.find(target.table, id);
    return rec ? (rec[field.refLabel || 'name'] || rec.name || rec.docNo || id) : id;
  }

  var REASONS = [
    { ar: 'الفاتورة ناقصة', en: 'Invoice incomplete' },
    { ar: 'المبلغ غير صحيح', en: 'Amount is wrong' },
    { ar: 'لا يوجد مرفق', en: 'No attachment' },
    { ar: 'الحساب غير مناسب', en: 'Wrong account' },
    { ar: 'مكرر محتمل', en: 'Possible duplicate' },
    { ar: 'أخرى', en: 'Other' }
  ];

  /* ── حالة القرارات أثناء التحرير (قبل الإرسال إلى az_acc_review_lines) ──── */
  var pendingDecisions = {}; /* lineId -> {decision, reason} */

  function canReview(rec) {
    var u = Auth.current();
    if (!u || rec.status !== 'pending') return false;
    if (rec.createdBy === u.id) return false;
    return !!(Auth.can(TABLE, 'review'));
  }

  function lineFieldsOf() {
    var mod = Schema.get(TABLE);
    return mod && mod.lines ? mod.lines.fields : [];
  }

  function lineSummary(l) {
    var mod = Schema.get(TABLE);
    var accField = lineFieldsOf().filter(function (f) { return f.name === 'account'; })[0];
    var accName = accField ? displayRef(mod, accField, l.account) : l.account;
    return esc(accName) + ' — ' + esc(l.description || '') + ' — <b>' + money(l.amount) + '</b>';
  }

  function reviewLineHTML(l, i, editable) {
    var pd = pendingDecisions[l.lineId] || { decision: l.decision, reason: l.decisionReason };
    var dec;
    if (editable) {
      dec = ['accepted', 'returned'].map(function (d) {
        return '<label class="azd-radio"><input type="radio" name="azdec' + i + '" value="' + d + '" data-decrow="' + esc(l.lineId) + '"' +
          (pd.decision === d ? ' checked' : '') + '> ' + esc(L2(d === 'accepted' ? { ar: 'قبول', en: 'Accept' } : { ar: 'إرجاع', en: 'Return' })) + '</label>';
      }).join('');
    } else {
      var badgeCls = l.decision === 'accepted' ? 'b-approved' : (l.decision === 'returned' ? 'b-returned' : 'b-draft');
      dec = '<span class="badge ' + badgeCls + '">' + esc(l.decision ? L2(l.decision === 'accepted' ? { ar: 'قبول', en: 'Accepted' } : { ar: 'مُعاد', en: 'Returned' }) : '—') + '</span>';
    }
    var reasonBlock = '';
    if (pd.decision === 'returned') {
      if (editable) {
        var opts = REASONS.map(function (r) { return '<option' + (pd.reason === r.ar ? ' selected' : '') + '>' + esc(L2(r)) + '</option>'; }).join('');
        reasonBlock = '<div class="azd-reasonbox"><select class="select input-sm" data-reasonrow="' + esc(l.lineId) + '">' + opts + '</select>' +
          '<input type="text" class="input input-sm" data-reasonfree="' + esc(l.lineId) + '" placeholder="' +
          esc(L2({ ar: 'اكتب السبب إن اخترت «أخرى»', en: 'Write the reason if "Other"' })) + '" value="' + esc(pd.reasonFree || '') + '"></div>';
      } else {
        reasonBlock = '<div class="azd-reasonbox small">' + esc(L2({ ar: 'سبب الإرجاع', en: 'Return reason' })) + ': ' + esc(l.decisionReason || '—') + '</div>';
      }
    }
    return '<div class="azd-review-line' + (pd.decision === 'returned' ? ' returned' : (pd.decision === 'accepted' ? ' accepted' : '')) + '">' +
      '<div class="l">' + lineSummary(l) + '</div><div class="dec">' + dec + '</div>' + reasonBlock + '</div>';
  }

  function computeReviewTotals(rec) {
    var accepted = 0, returned = 0, undecided = 0;
    (rec.lines || []).forEach(function (l) {
      var pd = pendingDecisions[l.lineId] || { decision: l.decision };
      if (pd.decision === 'accepted') accepted += num(l.amount);
      else if (pd.decision === 'returned') returned += num(l.amount);
      else undecided += num(l.amount);
    });
    return { accepted: accepted, returned: returned, undecided: undecided };
  }

  /* ── إرسال القرارات إلى az_acc_review_lines ─────────────────────────────
     Submit decisions to az_acc_review_lines. */
  async function submitReview(rec) {
    var decisions = [];
    var missing = [];
    (rec.lines || []).forEach(function (l) {
      var pd = pendingDecisions[l.lineId];
      if (!pd || !pd.decision) { missing.push(l.lineId); return; }
      var reason = pd.decision === 'returned' ? (pd.reason === 'أخرى' || pd.reason === 'Other' ? (pd.reasonFree || '') : pd.reason) : null;
      decisions.push({ lineId: l.lineId, decision: pd.decision, reason: reason });
    });
    if (missing.length) {
      UI.toast(L2({ ar: 'كل سطر يحتاج قراراً — لا مراجعة جزئية', en: 'Every line needs a decision — partial review is not allowed' }), 'error', 5000);
      return false;
    }
    try {
      var res = await Auth.client().rpc('az_acc_review_lines', { p_id: rec.id, p_decisions: decisions, p_expected_updated_at: rec.updatedAt || null });
      if (res.error) { UI.toast(res.error.message || L2({ ar: 'تعذّرت المراجعة', en: 'Review failed' }), 'error', 6000); return false; }
      UI.toast(L2({ ar: 'تمّت المراجعة', en: 'Reviewed' }), 'success');
      pendingDecisions = {};
      /* 🔴 عطلٌ حقيقيٌّ وُجد بالتشغيل (job3) — Store.pull لم يوجد قط في
         store.js («فخّ الحارس الدفاعي الذي يُسكِت واجهةً برمجية خاطئة
         الاسم» — ذاكرة المشروع). الفحص `if (global.Store && Store.pull)`
         كان يمرّ بصمت دائماً (Store.pull=undefined فيُخفي البلوك كلّه
         بلا أي خطأ) — فالذاكرة المحلية (Store.all/find) لا تتحدّث أبداً
         بعد المراجعة داخل نفس الجلسة؛ لا شيء ظاهر إلا بعد إعادة تحميل
         كاملة أو دخول جلسة جديدة. الإصلاح: Store.reload() — الدالّة
         الحقيقية الوحيدة الموجودة فعلاً (store.js) لإعادة الجلب الكامل.
         🔴 A REAL bug found by running this (job3) — Store.pull never
         existed in store.js at all ("a defensive guard silencing a
         misspelled API" — project memory). The check
         `if (global.Store && Store.pull)` always passed silently
         (Store.pull=undefined hides the whole block, no error ever) — so
         the local cache (Store.all/find) never updated after a review,
         within the SAME session; nothing showed until a full reload or a
         fresh login. Fix: Store.reload() — the one REAL function store.js
         actually exports for a full refetch. */
      if (global.Store && Store.reload) { try { await Store.reload(); } catch (e) {} }
      return true;
    } catch (e) {
      UI.toast(String(e && e.message || e), 'error', 6000);
      return false;
    }
  }

  /* ── «ابدأ التصحيح» — az_acc_start_correction ─────────────────────────── */
  async function startCorrection(rec) {
    if (typeof Auth.client !== 'function') return;
    try {
      var res = await Auth.client().rpc('az_acc_start_correction', { p_id: rec.id });
      if (res.error) {
        /* رسالة صريحة، لا تحايل — انظر رأس الملف */
        UI.toast(res.error.message || L2({ ar: 'تعذّر فتح التصحيح', en: 'Could not start the correction' }), 'error', 6000);
        return;
      }
      var corrId = res.data;
      /* نفس عطل Store.pull أعلاه — انظر تعليقه في submitReview. Same
         Store.pull fault as above — see its comment in submitReview. */
      if (global.Store && Store.reload) { try { await Store.reload(); } catch (e) {} }
      setTimeout(function () { EntityPage.openForm(TABLE, corrId); }, 60);
    } catch (e) {
      UI.toast(L2({ ar: 'الباب az_acc_start_correction غير متاح على هذه النسخة', en: 'az_acc_start_correction is not available on this build' }), 'error', 6000);
    }
  }

  function findCorrectionDraft(rec) {
    return (Store.all(TABLE) || []).filter(function (s) { return s.correctionOf === rec.id; })[0] || null;
  }

  function bandHintHTML(mod, rec) {
    if (!global.Rules || !Rules.approverHint) return '';
    var hint = Rules.approverHint(mod, rec);
    return hint ? '<div class="alert alert-info">' + esc(hint) + '</div>' : '';
  }

  /* ── تحذير تجاوز الرصيد — job2، صيد الأخطاء (٢) ─────────────────────────
     لا رفض هنا إطلاقاً — القاعدة معلَّقة انتظاراً لقرار حسانين (ذاكرة
     المشروع: money-documents-have-no-site-column وquoted-answers-need-
     outside-source تُذكِّران بعدم اختراع قاعدة عمل لم تُقرَّر بعد). التحذير
     وحده هو المطلوب: إن كان إجمالي المقبول (المعروض فعلاً في الشريط
     أسفله — نفس الرقم بالحرف، لا حساب موازٍ) أكبر من "المتاح" في صندوق
     العهدة (DeskLedgers.boxBalance، قراءة فقط — لا تعديل على ذلك الملف)
     يظهر سطر تحذير واضح قبل أي زر اعتماد، يشرح أن الفرق سيصبح مستحقاً
     على صاحب العهدة نفسه.
     OVER-BALANCE WARNING — job2, bug hunt (2). Never a refusal — the
     actual rule is pending حسانين's decision (project memory:
     money-documents-have-no-site-column and quoted-answers-need-outside-
     source both warn against inventing a business rule nobody has set
     yet). Only a WARNING is asked for: if the accepted total (the exact
     figure already shown in the strip below — same number, not a
     parallel computation) exceeds the custody box's "available" balance
     (DeskLedgers.boxBalance, read-only use — that file is never edited
     here), show a clear warning line before any approve button,
     explaining that the difference will become an amount owed BY the
     custodian.
     ─────────────────────────────────────────────────────────────────── */
  function overBalanceWarningHTML(rec, acceptedDisplay) {
    if (!global.DeskLedgers || !DeskLedgers.boxBalance || !rec.custodyAccount) return '';
    var bal = DeskLedgers.boxBalance(rec.custodyAccount);
    var available = bal ? Number(bal.available) || 0 : 0;
    var accepted = Number(acceptedDisplay) || 0;
    var over = accepted - available;
    if (over <= 0) return '';
    return '<div class="alert alert-warn">' + esc(L2({
      ar: 'المقبول يتجاوز رصيد العهدة بـ ' + money(over) + ' — سيظهر كمستحق لصاحب العهدة',
      en: 'The accepted amount exceeds the custody balance by ' + money(over) + ' — it will show as an amount owed by the custodian'
    })) + '</div>';
  }

  /* ── الشاشة الموحّدة لكل حالات تسوية العهدة ──────────────────────────────
     THE ONE unified screen for every custodySettlements status. */
  function render(id) {
    var mod = Schema.get(TABLE);
    var rec = Store.find(mod.table, id);
    if (!rec) return;
    /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (job3، الشريحة ٢) — كان هذا السطر
       يمسح pendingDecisions في كل نداء لـrender()، بما فيها إعادة الرسم
       التي يستدعيها bindEvents نفسه بعد كل ضغطة راديو أو تغيير سبب — أي
       أن اختيار «قبول» على سطر ثم «إرجاع» على آخر كان يمحو الأول فوراً،
       وزرّ «قبول الكل» كان يضبط كل القرارات ثم يمحوها بنفس السطر التالي
       مباشرة. النتيجة: مراجعة تحمل أكثر من قرار واحد كانت تفشل دائماً
       برسالة «كل سطر يحتاج قراراً» رغم أن المستخدم اختار كل القرارات
       فعلاً — لم يكتشفه أحد لأن لا تجربة سابقة راجعت مستنداً بأكثر من
       سطر واحد. الإصلاح: النسيان يحدث مرة واحدة فقط، عند فتح المستند
       فتحاً جديداً (EntityPage.openDetail أدناه) — لا عند كل إعادة رسم
       داخلية.
       🔴 A SERIOUS defect found by actually running this (job3, slice 2)
       — this line used to wipe pendingDecisions on EVERY call to
       render(), including the re-renders bindEvents itself triggers
       after every single radio click or reason change — so choosing
       "accept" on one line then "return" on another erased the first
       choice immediately, and "Accept all" set every decision and then
       erased them all on the very next line of its own code. Result: a
       review touching more than one line ALWAYS failed with "every line
       needs a decision" even though the user genuinely picked every one
       — never caught before because no earlier trial reviewed a document
       with more than a single line. Fix: the reset now happens exactly
       ONCE, when the document is opened FRESH (EntityPage.openDetail
       below) — never on an internal re-render. */
    var editable = canReview(rec);
    var totals = computeReviewTotals(rec);
    var corr = rec.correctionPending ? findCorrectionDraft(rec) : null;
    var isAuthor = Auth.current() && rec.createdBy === Auth.current().id;

    var body = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
      '<strong class="num" style="font-size:16px">' + esc(rec.docNo || '') + '</strong>' + Workflow.badgeHTML(rec.status) +
      (rec.correctionOf ? '<span class="badge b-gold">' + esc(L2({ ar: 'مستند تصحيح', en: 'Correction document' })) + '</span>' : '') +
      '</div>';
    body += '<p class="small muted">' + esc(L2({ ar: 'الموقع', en: 'Site' })) + ': ' + esc(displayRef(mod, { ref: 'sites', refLabel: 'name' }, rec.site)) +
      ' · ' + esc(L2({ ar: 'خزينة العهدة', en: 'Custody box' })) + ': ' + esc(displayRef(mod, { ref: 'cashAccounts', refLabel: 'name' }, rec.custodyAccount)) +
      ' · ' + esc(rec.date || '') + '</p>';
    if (rec.entryRoute === 'paper') {
      body += '<div class="alert alert-info">' + esc(L2({ ar: 'أُدخل مركزياً نيابةً عن الموقع — مرجع الورقة: ', en: 'Entered centrally on behalf of the site — paper ref: ' })) + esc(rec.paperRef || '—') + '</div>';
    }

    if (rec.returnReason && rec.status === 'returned') {
      body += '<div class="alert alert-warn">' + esc(L2({ ar: 'سبب الإرجاع', en: 'Return reason' })) + ': ' + esc(rec.returnReason) + '</div>';
    }

    var acceptAllBtn = editable ? '<button type="button" class="btn btn-outline btn-sm" id="azdAcceptAll" style="margin-inline-start:10px">' +
      esc(L2({ ar: 'قبول الكل', en: 'Accept all' })) + '</button>' : '';
    body += '<div class="form-section"><div class="form-section-title">' + esc(L2({ ar: 'سطور التسوية', en: 'Settlement lines' })) + acceptAllBtn + '</div>';
    (rec.lines || []).forEach(function (l, i) { body += reviewLineHTML(l, i, editable); });
    /* نفس الرقم بالحرف الذي يعرضه الشريط أدناه — لا حساب موازٍ (انظر
       تعليق overBalanceWarningHTML أعلاه). The EXACT same figure the
       strip below displays — no parallel computation (see the comment
       above overBalanceWarningHTML). */
    var acceptedDisplay = (rec.status === 'draft' || rec.status === 'pending') ? totals.accepted : (rec.acceptedTotal || totals.accepted);
    body += '<div class="azd-summarystrip">' +
      '<div><small>' + esc(L2({ ar: 'مقبول', en: 'Accepted' })) + '</small><b>' + money(acceptedDisplay) + '</b></div>' +
      '<div class="warn"><small>' + esc(L2({ ar: 'مُعاد', en: 'Returned' })) + '</small><b>' + money(totals.returned) + '</b></div>' +
      '<div><small>' + esc(L2({ ar: 'إجمالي مُطالَب به', en: 'Claimed total' })) + '</small><b>' + money(rec.totalAmount) + '</b></div>' +
      '</div>';
    body += overBalanceWarningHTML(rec, acceptedDisplay);
    body += '<p class="azd-note small muted">' + esc(L2({ ar: 'الأسطر المقبولة تُقيَّد مرّة واحدة فقط — لا تُقيَّد مرة أخرى.', en: 'Accepted lines post exactly once — never again.' })) + '</p>';
    body += '</div>';

    if (rec.status === 'reviewed' || rec.status === 'approved') body += bandHintHTML(mod, rec);

    if (rec.correctionPending) {
      body += '<div class="alert alert-warn">' + esc(L2({ ar: 'لديك سطور مُعادة بانتظار التصحيح.', en: 'You have returned lines awaiting correction.' })) +
        (isAuthor ? ' <button type="button" class="btn btn-outline btn-sm" id="azdStartCorrection">' + esc(L2({ ar: 'ابدأ التصحيح', en: 'Start the correction' })) + '</button>' : '') + '</div>';
    } else if (corr) {
      body += '<p><button type="button" class="pv-srclink" id="azdOpenCorrection">' + esc(L2({ ar: 'فتح مسودة التصحيح', en: 'Open the correction draft' })) + ' ' + esc(corr.docNo || '') + '</button></p>';
    }

    body += '<div class="form-section"><div class="form-section-title">' + (global.t ? t('g.history') : 'History') + '</div>' + Workflow.trailHTML(rec) + '</div>';

    var buttons = [{ label: (global.t ? t('g.close') : 'Close'), cls: 'btn-ghost' }];
    if (editable) {
      buttons.push({
        label: L2({ ar: 'مراجعة', en: 'Review' }), cls: 'btn-primary', keepOpen: true,
        onClick: function () { return submitReview(rec).then(function (ok) { if (ok) setTimeout(function () { render(id); }, 60); return false; }); }
      });
    } else {
      if (Auth.can(mod.id, 'edit') && !Workflow.isLocked(rec)) {
        buttons.push({ label: (global.t ? t('g.edit') : 'Edit'), cls: 'btn-outline', onClick: function () { setTimeout(function () { EntityPage.openForm(mod.id, id); }, 60); } });
      }
      Workflow.actions(mod.id, rec).forEach(function (a) {
        buttons.push({
          label: a.label, cls: a.cls, disabled: a.disabled,
          onClick: function () {
            if (a.disabled) return;
            if (a.needsReason) { setTimeout(function () { UI.askReason(a.label, function (reason) { EntityPage.doTransition(mod.id, id, a.key, reason); }); }, 60); }
            else { EntityPage.doTransition(mod.id, id, a.key, null); }
          }
        });
      });
    }

    UI.modal({
      title: L2(mod.label) + (rec.docNo ? ' — ' + rec.docNo : ''), size: 'wide', body: body, buttons: buttons,
      onOpen: function () {
        bindEvents(rec, id);
      }
    });
  }

  function bindEvents(rec, id) {
    document.querySelectorAll('[data-decrow]').forEach(function (r) {
      r.addEventListener('change', function () {
        var lid = r.getAttribute('data-decrow');
        pendingDecisions[lid] = pendingDecisions[lid] || {};
        pendingDecisions[lid].decision = r.value;
        render(id);
      });
    });
    document.querySelectorAll('[data-reasonrow]').forEach(function (s) {
      s.addEventListener('change', function () {
        var lid = s.getAttribute('data-reasonrow');
        pendingDecisions[lid] = pendingDecisions[lid] || {};
        pendingDecisions[lid].reason = s.value;
        render(id);
      });
    });
    document.querySelectorAll('[data-reasonfree]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var lid = inp.getAttribute('data-reasonfree');
        pendingDecisions[lid] = pendingDecisions[lid] || {};
        pendingDecisions[lid].reasonFree = inp.value;
      });
    });
    var acceptAll = document.getElementById('azdAcceptAll');
    if (acceptAll) acceptAll.addEventListener('click', function () {
      (rec.lines || []).forEach(function (l) { pendingDecisions[l.lineId] = { decision: 'accepted' }; });
      render(id);
    });
    var sc = document.getElementById('azdStartCorrection');
    if (sc) sc.addEventListener('click', function () { startCorrection(rec); });
    var oc = document.getElementById('azdOpenCorrection');
    if (oc) oc.addEventListener('click', function () {
      var corr = findCorrectionDraft(rec);
      if (corr) setTimeout(function () { EntityPage.openForm(TABLE, corr.id); }, 60);
    });
  }

  var origOpenDetail = EntityPage.openDetail;
  EntityPage.openDetail = function (moduleId, id) {
    /* الموضع الوحيد الصحيح لمسح القرارات المعلَّقة — فتحٌ جديد فعلاً، لا
       إعادة رسم داخلية. انظر تعليق العطل أعلى render(). The ONLY correct
       place to clear pending decisions — a genuinely fresh open, never an
       internal re-render. See the fault comment above render(). */
    if (moduleId === TABLE) { pendingDecisions = {}; render(id); return; }
    return origOpenDetail.apply(this, arguments);
  };

  global.DeskSettlementReview = { render: render, canReview: canReview };
  console.info('desk-settlement-review.js ready — EntityPage.openDetail(\'custodySettlements\', …) now shows per-line decisions and the correction flow.');
})(window);
