/* =========================================================================
   one-step-approval.js — اعتماد التوقيع الواحد مباشرة من «قيد الانتظار»
   -------------------------------------------------------------------------
   الخطأ الذي يمنعه هذا الملف (AUDIT-18):

   ثلاث عشرة شاشة يومية سياستها «توقيع واحد» كانت تعلق عند «قيد
   الانتظار» إلى الأبد. workflow-policy.js كان يحاول «مراجعة» تلقائية
   باسم مقدّم المستند نفسه، و workflow.js يرفض بحق أن يراجع الشخص عمله،
   ثم كان الرفض يُبتلع ويظهر «تم الإرسال». زر المراجعة مخفي أصلاً على
   هذه الشاشات، والاعتماد كان يشترط حالة «مُراجَع» التي لا تصل أبداً.

   THE BUG THIS FILE PREVENTS (AUDIT-18): thirteen one-signature screens
   were stuck at "pending" forever. The auto-review ran in the
   submitter's own name, was rightly refused as self-review, and the
   refusal was silently swallowed. With the Review button hidden by
   policy and approve requiring "reviewed", nothing could move again.

   الحل: على المستند ذي الخطوة الواحدة يظهر زر «اعتماد» مباشرة عند
   «قيد الانتظار» — فقط لمن يملك صلاحية الاعتماد وليس هو مُنشئ المستند
   — ويمرّ عبر دالة قاعدة البيانات az_approve_one_step (الملف
   24-ONE-STEP-APPROVAL.sql) التي تعيد كل الفحوص. الخادم هو الحكم.

   THE FIX: on a one-step document an Approve button appears directly at
   "pending" — only for someone who holds approve permission AND did not
   create the document — routed through the database function
   az_approve_one_step (file 24-ONE-STEP-APPROVAL.sql), which repeats
   every check. The browser is never the authority.

   ⭐ قاعدة «لا أحد يعتمد عمله» باقية بلا إضعاف: هنا في المتصفح، وداخل
      دالة قاعدة البيانات نفسها.
   ⭐ "You cannot approve your own document" survives untouched — in the
      browser here AND inside the database function.

   ADDITIVE. يُحمَّل بعد workflow-policy.js. احذف هذا الملف (والدالة في
   قاعدة البيانات) يعود كل شيء لسابق عهده تماماً.
   ADDITIVE. Loads after workflow-policy.js. Delete this file (and the
   database function) and everything returns exactly to how it was.
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Workflow || !global.Schema || Workflow.__oneStepInstalled) return;
    Workflow.__oneStepInstalled = true;

    function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

    function oneStep(moduleId) {
      var mod = Schema.get(moduleId);
      return (mod && mod.workflow && mod.skipReview) ? mod : null;
    }

    /* ═════ ١ · الأزرار على شاشة المستند نفسها ═════════════════════
       عند «قيد الانتظار» على شاشة بخطوة واحدة: زر اعتماد أخضر لمن
       يحق له، ورسالة واضحة معطّلة لمن أنشأ المستند بنفسه. */
    var origActions = Workflow.actions;
    Workflow.actions = function (moduleId, rec) {
      var list = origActions.apply(Workflow, arguments) || [];
      var mod = oneStep(moduleId);
      if (!mod || !rec || rec.status !== 'pending') return list;
      var u = Auth.current();
      if (!u || !Auth.can(moduleId, 'approve')) return list;

      if (rec.createdBy === u.id) {
        /* المُنشئ يرى لماذا لا يملك زراً — بدل شاشة صامتة محيّرة
           the creator sees WHY there is no button, not a silent screen */
        if (!list.some(function (a) { return a.key === '_blockedApprove'; })) {
          list.push({ key: '_blockedApprove', label: t('wf.noSelfApprove'),
                      disabled: true, cls: 'btn-outline' });
        }
        return list;
      }

      list.unshift({ key: 'approve', label: t('wf.approve'), cls: 'btn-success' });
      if (!list.some(function (a) { return a.key === 'return'; })) {
        list.push({ key: 'return', label: t('wf.return'), cls: 'btn-outline', needsReason: true });
      }
      if (!list.some(function (a) { return a.key === 'reject'; })) {
        list.push({ key: 'reject', label: t('wf.reject'), cls: 'btn-danger', needsReason: true });
      }
      return list;
    };

    /* ═════ ٢ · التنفيذ — عبر دالة قاعدة البيانات الجديدة ═════════ */
    var origTransition = Workflow.transition;
    Workflow.transition = async function (moduleId, id, action, reason) {
      var mod = oneStep(moduleId);
      if (!mod || action !== 'approve') return origTransition.apply(Workflow, arguments);

      var rec = Store.find(mod.table, id);
      /* مستند وصل «مُراجَع» عبر زر المراجعة في صندوق الاعتمادات يكمل
         بالمسار الأصلي كما هو — ذلك الطريق يبقى مفتوحاً.
         a document already "reviewed" via the inbox's Review button
         continues down the ORIGINAL path — that door stays open. */
      if (!rec || rec.status !== 'pending') return origTransition.apply(Workflow, arguments);

      var u = Auth.current();
      if (!u || !Auth.can(moduleId, 'approve')) return { ok: false, error: t('wf.noPerm') };
      /* ⭐ لا أحد يعتمد عمله — الفحص هنا وفي قاعدة البيانات معاً */
      if (rec.createdBy === u.id) return { ok: false, error: t('wf.noSelfApprove') };
      if (!Store.isOnline()) {
        return { ok: false, error: isAr()
          ? 'الاعتماد يحتاج اتصالاً بالإنترنت.'
          : 'Approval requires an internet connection.' };
      }

      /* الخادم يعيد كل الفحوص ويكتب الأثر — المتصفح ليس الحكم
         the server repeats every check and writes the trail */
      var rpc = await Auth.client().rpc('az_approve_one_step', {
        p_table: mod.table, p_id: id, p_reason: reason || null
      });
      if (rpc.error) return { ok: false, error: rpc.error.message || t('wf.noPerm') };
      return { ok: true, record: rpc.data };
    };

    /* ═════ ٣ · صندوق الاعتمادات: الطريقان يتفقان ══════════════════
       المستند «قيد الانتظار» ذو الخطوة الواحدة يظهر لمن يستطيع اعتماده
       تحت «للاعتماد» بزر اعتماد مباشر، ويبقى لمن يملك المراجعة فقط
       تحت «للمراجعة» بزرها القديم — لا نغلق باب الهروب الذي كان يعمل. */
    var origInbox = Workflow.inbox;
    Workflow.inbox = function () {
      var box = origInbox.apply(Workflow, arguments);
      var u = Auth.current();
      if (!u || !box) return box;

      (Schema.MODULES || []).forEach(function (mod) {
        if (!mod.workflow || !mod.skipReview) return;
        if (!Auth.can(mod.id, 'approve')) return;
        Store.all(mod.table).forEach(function (r) {
          if (r.status !== 'pending' || r.createdBy === u.id) return;
          box.toReview = box.toReview.filter(function (x) {
            return !(x.module.id === mod.id && x.record.id === r.id);
          });
          if (!box.toApprove.some(function (x) {
            return x.module.id === mod.id && x.record.id === r.id;
          })) {
            box.toApprove.push({ module: mod, record: r });
          }
        });
      });
      return box;
    };

    /* العدّاد في workflow.js يستدعي نسخته الداخلية فلا يرى نقلنا —
       نعيد حسابه من النسخة الملفوفة حتى يطابق الرقمُ ما على الشاشة.
       workflow.js's counter calls its INTERNAL inbox and would miss our
       additions; recompute from the wrapped one so the badge matches. */
    Workflow.inboxCount = function () {
      var i = Workflow.inbox();
      return i.toReview.length + i.toApprove.length + i.mine.length;
    };

    console.info('one-step-approval.js: pending one-step documents can now be approved directly.');
  }

  if (global.Workflow) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
