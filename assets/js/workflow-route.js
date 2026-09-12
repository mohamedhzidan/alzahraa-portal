/* =========================================================================
   workflow-route.js — زر «إرسال» (وكل إجراءات الدورة) يمرّ من الباب الواحد
                       Send (and every workflow action) goes through ONE door
   -------------------------------------------------------------------------
   العطل الذي يعالجه · THE FAULT IT CURES
   workflow.js:123-125 يرسل كل إجراء — إرسال، مراجعة، إرجاع، رفض، عكس — إلى
   دالة قاعدة البيانات az_transition_document وحدها. تلك الدالة لا تقبل إلا
   جداول الأعمال الأربعة عشر، فتردّ «Forbidden» على عشر شاشات: فحص الأعمال،
   فحص المواد، إذن الصب، عدم المطابقة، تعليمات الموقع، الاعتمادات، السلف،
   كشف العمالة اليومية، طلب الخرسانة، إذن الفحص. (مُثبَت بالتشغيل، ١٠ سبتمبر:
   PLAN-ONE-STEP-APPROVAL-REPAIR.md، العطل ٢.)
   workflow.js:123-125 sends every action — submit, review, return, reject,
   reverse — to the database function az_transition_document alone. That
   function accepts only its fourteen business tables, so it answers
   "Forbidden" on ten screens: WIR, MIR, pour cards, NCR, site
   instructions, submittals, advances, daily labour, concrete requests and
   inspection permits. (Proven by running, 10 Sept: fault 2 of
   PLAN-ONE-STEP-APPROVAL-REPAIR.md.)

   ما يفعله · WHAT IT DOES
   نسخة من Workflow.transition بالحرف (نفس الفحوص السريعة في المتصفح، نفس
   شكل النتيجة) — الفرق الوحيد اسم الدالة: az_transition_any_document (الملف
   ٧٢، ويعتمد على ٦٩)، التي توزّع: جداول الأعمال ← الدالة القديمة كما هي · جداول الأقسام ←
   دالتها التي بناها الملف ٠٦ ولم ينادها المتصفح قط · الأربعة الباقية ← دورتها
   في الملف ٧٢. لا قائمة جداول في المتصفح إطلاقاً — قاعدة البيانات توزّع،
   فلا شيء هنا يَبْلى.
   A verbatim copy of Workflow.transition (the same quick browser checks,
   the same result shape) — the ONLY difference is the function name:
   az_transition_any_document (file 72, which relies on 69), which routes: business tables →
   the old function unchanged · department tables → the function file 06
   built and the browser never called · the remaining four → their
   lifecycle in file 72. There is NO table list in the browser — the
   database routes, so nothing here can rot.

   🔴 الترتيب إلزامي · ORDER IS MANDATORY
   يُحمَّل بعد workflow.js مباشرة وقبل workflow-policy.js (loader.js). لأن
   workflow-policy.js يلتقط Workflow.transition لحظة تحميله ويلفّه، ثم
   one-step-approval.js وfirst-signature.js وinbox-project-fence.js
   وemergency-money-hold.js كلها تلفّ ما قبلها — فتمرّ كلها بهذا الملف دون
   أي تعديل عليها. لو حُمِّل بعدها لاستبدل أغلفتها وضاع زر الاعتماد ذو
   التوقيع الواحد (TESTS/workflow-route-trial.js · R.inj يثبت ذلك).
   Loaded right AFTER workflow.js and BEFORE workflow-policy.js (loader.js).
   workflow-policy.js captures Workflow.transition at load and wraps it;
   one-step-approval.js, first-signature.js, inbox-project-fence.js and
   emergency-money-hold.js each wrap what came before — so all of them
   pass through this file with no edit to any of them. Loaded after them,
   it would replace their wrappers and the one-signature Approve button
   would be lost (TESTS/workflow-route-trial.js · R.inj proves it).

   🔴 الملفان ٦٩ ثم ٧٢ أولاً · FILES 69 THEN 72 FIRST
   هذا الملف ينادي دالة يُنشئها الملف ٧٢ (الذي يحتاج ٦٩). لو رُفع قبل
   تشغيل ٧٢ لرفض كل «إرسال» بخطأ «الدالة غير موجودة». شغّل ٦٩ ثم ٧٢ في
   Supabase أولاً، ثم هذا الملف. (صُحِّح ١١ سبتمبر: كان يقول «٦٩» قبل فصل
   الباب إلى ٧٢ — التقطه مراجع الأعطال بالتشغيل.)
   This file calls a function created by file 72 (which needs 69).
   Uploaded before 72 has run, every Send fails with "function does not
   exist". Run 69 then 72 in Supabase first, then this file. (Corrected
   11 Sept: it said "69" before the door was split out into 72 — caught by
   the bug reporter by running it.)

   التراجع · UNDO: احذف هذا الملف وسطره في loader.js وservice-worker.js —
   يعود المسار القديم بالحرف (ويعود معه «Forbidden» على الشاشات العشر).
   Delete this file and its line in loader.js and service-worker.js — the
   old route returns exactly (and "Forbidden" on the ten screens with it).
   Remove it BEFORE running file 72's undo, never after.
   ========================================================================= */
(function (global) {
  'use strict';
  var W = global.Workflow;
  if (!W || typeof W.transition !== 'function') {
    if (global.console) console.warn('workflow-route.js: Workflow is missing — loaded in the wrong place; nothing changed.');
    return;
  }
  if (W.__routePatched) return;

  /* نسخة workflow.js:77-128 بالحرف — عدا اسم الدالة في آخرها.
     workflow.js:77-128 verbatim — except the function name at the end. */
  async function transition(moduleId, recId, action, reason) {
    var mod = Schema.get(moduleId);
    if (!mod) return { ok: false, error: 'module' };
    var rec = Store.find(mod.table, recId);
    if (!rec) return { ok: false, error: 'record' };
    var u = Auth.current();
    if (!u) return { ok: false, error: t('wf.noPerm') };

    if (!Store.isOnline()) {
      return { ok: false, error: I18N.getLang() === 'ar'
        ? 'الإرسال والمراجعة والاعتماد تحتاج اتصالاً بالإنترنت. المسودة محفوظة ويمكنك المتابعة بعد عودة الاتصال.'
        : 'Submit, review and approval require internet. Your draft is saved and can continue when online.' };
    }

    switch (action) {
      case 'submit':
        if (['draft', 'returned'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        break;
      case 'review':
        if (rec.status !== 'pending') return { ok: false, error: t('wf.noPerm') };
        if (!Auth.can(moduleId, 'review')) return { ok: false, error: t('wf.noPerm') };
        if (rec.createdBy === u.id) return { ok: false, error: t('wf.noSelfReview') };
        break;
      case 'approve':
        if (rec.status !== 'reviewed') return { ok: false, error: t('wf.noPerm') };
        if (!Auth.can(moduleId, 'approve')) return { ok: false, error: t('wf.noPerm') };
        if (rec.createdBy === u.id || rec.reviewedBy === u.id) return { ok: false, error: t('wf.noSelfApprove') };
        break;
      case 'return':
        if (['pending', 'reviewed'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        break;
      case 'reject':
        if (['pending', 'reviewed'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        break;
      case 'reverse':
        if (rec.status !== 'approved') return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        break;
      default:
        return { ok: false, error: 'unknown' };
    }

    /* ⭐ الفرق الوحيد عن workflow.js · the ONLY difference from workflow.js */
    var rpc = await Auth.client().rpc('az_transition_any_document', {
      p_table: mod.table, p_id: recId, p_action: action, p_reason: reason || null
    });
    if (rpc.error) return { ok: false, error: rpc.error.message || t('wf.noPerm') };
    return { ok: true, record: rpc.data };
  }

  /* 🛟 ١١ سبتمبر (بعد مراجعة المُدمِج): لو رُفع هذا الملف قبل تشغيل الملف ٧٢، لا
     يوجد الباب — فكان كل «إرسال» يفشل على كل الشاشات، حتى التي تعمل اليوم. الآن:
     إن ردّ الخادم بأن الدالة غير موجودة (ولا شيء غير ذلك)، نعود إلى المسار القديم
     كما هو اليوم تماماً. أسوأ حال = سلوك اليوم، لا عطل جديد. أي رفض آخر (صلاحية،
     مخزون، سبب) يمرّ كما هو — لا يُخفى.
     🛟 11 Sept (after the integrator's review): uploaded before file 72 had run,
     there is no door — and every Send failed on every screen, even the ones that
     work today. Now: if the server says the function does not exist (and only
     then), fall back to the old route exactly as today. Worst case = today's
     behaviour, never a new break. Any other refusal (permission, stock, reason)
     passes through untouched — never hidden. */
  var original = W.transition;
  function doorMissing(err) {
    var m = String(err || '');
    return /az_transition_any_document/.test(m) &&
      /(does not exist|could not find the function|schema cache|PGRST202)/i.test(m);
  }
  W.transition = async function (moduleId, recId, action, reason) {
    var r = await transition(moduleId, recId, action, reason);
    if (r && !r.ok && doorMissing(r.error)) {
      if (global.console) console.warn('workflow-route.js: database file 72 has not run yet — using the old route for this action.');
      return original.apply(W, arguments);
    }
    return r;
  };
  W.__routePatched = true;
})(window);
