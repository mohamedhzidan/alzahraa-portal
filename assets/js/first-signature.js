/* =========================================================================
   first-signature.js — زر «مراجعة» يعود لصاحب التوقيع الأول على شاشة
                        المستند نفسها، على مستندات التوقيع الواحد
                        The "review" button returns for the first-signature
                        holder on the document's OWN screen, on one-step
                        documents
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف · THE BUG THIS FILE PREVENTS

   workflow-policy.js:187 يحذف مفتاح 'review' من قائمة Workflow.actions()
   على كل مستند «توقيع واحد» (skipReview) — سبب وجيه: يمنع مراجعة تلقائية
   باسم المُنشئ نفسه (one-step-approval.js يعتمد على ذلك). لكن الحذف
   عامّ: حتى شخصاً يملك صلاحية «مراجعة» ولا يملك «اعتماد» (توقيعه الأول
   هو الوحيد المطلوب منه) يفتح شاشة المستند فلا يرى زر «مراجعة» إطلاقاً
   — رغم أن صندوق الاعتمادات (pages/approvals.js:80-82 +
   one-step-approval.js:116-119) يعرضه له بلا أي مانع، لأن الصندوق لا
   يستدعي Workflow.actions() ولا يتأثر بحذفها. نفس الشخص يملك الزر في
   مكان ويفتقده في آخر — تناقض لا يُشرح على الشاشة.

   workflow-policy.js:187 strips the 'review' key from Workflow.actions()
   on every one-step (skipReview) document — a good reason: it prevents
   an automatic self-review in the creator's own name (one-step-
   approval.js relies on that). But the strip is blanket: even someone
   who holds "review" and NOT "approve" — whose ONLY required signature
   IS the review — opens the document's own screen and sees no "review"
   button at all, even though the approvals inbox
   (pages/approvals.js:80-82 + one-step-approval.js:116-119) already
   shows it to them with no restriction, because the inbox never calls
   Workflow.actions() and is unaffected by the strip. The same person has
   the button in one place and lacks it in another — an unexplained
   contradiction on screen.

   الحل · THE FIX

   نُعيد زر «مراجعة» على شاشة المستند فقط لمن: يملك 'review' على هذه
   الوحدة، لا يملك 'approve' عليها، ليس منشئ المستند، والمستند «قيد
   الانتظار» على وحدة توقيع واحد. من يملك الاثنين معاً (مثلاً gm عبر
   '*') لا يُعاد له الزر — هو أصلاً يرى زر «اعتماد» المباشر الذي أضافه
   one-step-approval.js، ولا حاجة لزر مراجعة وسيط له. الضغط على الزر
   يمر بـ Workflow.transition(moduleId, id, 'review', reason) تماماً كما
   لو ضُغط من صندوق الاعتمادات — نفس المسار، نفس فحوص الخادم
   (az_transition_document)، بلا أي منطق جديد هنا.

   We restore the "review" button on the document's own screen ONLY for
   someone who: holds 'review' on this module, does NOT hold 'approve' on
   it, is not the document's creator, and the document is "pending" on a
   one-step module. Someone who holds both (e.g. gm via '*') does not get
   the button back — they already see the direct "approve" button
   one-step-approval.js adds, and a middle review button would add
   nothing. Clicking the button goes through
   Workflow.transition(moduleId, id, 'review', reason) exactly as if
   pressed from the approvals inbox — same path, same server checks
   (az_transition_document), no new logic here at all.

   ⭐ لا إضعاف لقاعدة «لا أحد يراجع عمله» · NO WEAKENING OF "NOBODY REVIEWS
   THEIR OWN WORK"

   الفحص هنا (rec.createdBy !== u.id) تكرار دفاعي فقط — workflow.js نفسه
   يرفض المراجعة الذاتية من الخادم أولاً (az_transition_document) وقبله
   من المتصفح (workflow.js: case 'review'). هذا الملف لا يُضعف ذلك ولا
   يلتف حوله بأي حال.

   The check here (rec.createdBy !== u.id) is a defensive repeat only —
   workflow.js already refuses self-review, first server-side
   (az_transition_document) and before that in the browser (workflow.js:
   case 'review'). This file never weakens or routes around that.

   عام على كل الوحدات، لا الإجازات وحدها · GENERIC ACROSS EVERY MODULE,
   NOT LEAVES ONLY (قاعدة ٢١ · rule 21)

   لا يوجد هنا اسم وحدة واحد مكتوب — الشرط يفحص skipReview + الصلاحيات،
   فينطبق تلقائياً على كل الشاشات الثلاث عشرة ذات التوقيع الواحد. الأثر
   المُتوقَّع اليوم: مدير الموارد البشرية على الإجازات (بعد تعديل
   auth.js:652)، ومدير المشروع الذي يملك 'review' دون 'approve' على ncr.
   ⚠️ صُحِّح ٢٨ أغسطس: كان مكتوباً هنا «مهندس الموقع على wir/mir/
   pourCards/ncr» — وهذا خطأ في التعليق وحده: auth.js لا يعطي مهندس
   الموقع 'review' ولا 'approve' على أيٍّ من الأربعة. الكود نفسه صحيح
   وعام (لا اسم وحدة مكتوب فيه)؛ التعليق فقط كان يصف حالة غير موجودة.
   أثبته verifier في TESTS/leave-two-signatures-trial.js (D.2.1/D.2.2).

   No module name is hardcoded here — the condition checks skipReview and
   the two permissions, so it applies automatically to all thirteen
   one-step screens. The expected effect today: the HR manager on leaves
   (after the auth.js:652 edit), and the project manager, who holds
   'review' without 'approve' on ncr.
   ⚠️ CORRECTED 28 Aug: this comment used to name "the site engineer on
   wir/mir/pourCards/ncr" — wrong in the COMMENT only: auth.js gives the
   site engineer neither 'review' nor 'approve' on any of the four. The
   code itself is correct and generic; only this illustration described a
   case that does not exist. Proven by the verifier in
   TESTS/leave-two-signatures-trial.js (D.2.1/D.2.2).

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود الوضع لِما كان عليه
   بالضبط: زر «مراجعة» غائب عن شاشة المستند لهذه الحالة، وصندوق
   الاعتمادات يبقى الطريق الوحيد لهذا التوقيع — لا شيء يُكسر، فقط
   يختفي الزر الإضافي.
   ADDITIVE. Delete this file and things return exactly to how they
   were: the "review" button is absent from the document's own screen
   for this case, and the approvals inbox remains the only route to this
   signature — nothing breaks, only the extra button disappears.

   يُحمَّل بعد one-step-approval.js مباشرة — يحتاج قائمة Workflow.actions()
   بعد أن أضاف ذلك الملف زر «اعتماد» المباشر، ليكون لفّنا الأخير (الأخارجي)
   ويرى نتيجة كل ما قبله.
   Loads immediately after one-step-approval.js — needs
   Workflow.actions() after that file has already added the direct
   "approve" button, so our wrap is the last (outermost) one and sees the
   result of everything before it.
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Workflow || !global.Schema || Workflow.__firstSignatureInstalled) return;
    Workflow.__firstSignatureInstalled = true;

    var origActions = Workflow.actions;
    Workflow.actions = function (moduleId, rec) {
      var list = origActions.apply(Workflow, arguments) || [];
      var mod = Schema.get(moduleId);
      if (!mod || !mod.workflow || !mod.skipReview || !rec || rec.status !== 'pending') return list;

      var u = Auth.current();
      if (!u || rec.createdBy === u.id) return list;
      /* يملك المراجعة فقط — من يملك الاعتماد أيضاً له زره المباشر بالفعل
         review-only — someone who also holds approve already has their
         own direct button */
      if (!Auth.can(moduleId, 'review') || Auth.can(moduleId, 'approve')) return list;
      if (list.some(function (a) { return a.key === 'review'; })) return list;

      list.unshift({ key: 'review', label: t('wf.review'), cls: 'btn-primary' });
      return list;
    };

    console.info('first-signature.js: the "review" button is back on the document screen for review-only holders of one-step modules.');
  }

  if (global.Workflow) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
