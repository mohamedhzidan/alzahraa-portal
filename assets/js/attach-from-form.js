/* =========================================================================
   attach-from-form.js — المرفقات من داخل شاشة التعديل، لا من شاشة العرض وحدها
   attach-from-form.js — attachments from INSIDE the edit screen, not the
                         view screen alone

   ── ما أبلغ عنه المالك (٣٠ أغسطس ٢٠٢٦) ─────────────────────────────────
   «على شغل محفوظ بالفعل، الإرفاق لا يعمل — تظهر رسالة (احفظ المستند أولاً
   ثم افتحه لإرفاق الملفات)، ومن زرّ العين أو من تعديل ← مرفقات لا يعمل.»

   ── السبب، مُثبَت بالتشغيل (TESTS/attach-from-edit-modal-trial.js 17/0) ──
   attachments.js:490 يركّب اللوحة بلفّ EntityPage.openDetail **وحده**، فـ
   #azAttachSection موجود في شاشة **العرض** فقط. وpages/entity.js — باني
   النموذج — لا يحتوي أي كود مرفقات إطلاقاً. لكن dc-requests.js:805 يضع
   زرّ «📎 مرفقات» في '.modal .modal-foot' وهو فوتر نموذج **التعديل** أيضاً.
   فمن شاشة التعديل: اللوحة لا يمكن أن توجد، فيقول الزرّ «احفظ المستند
   أولاً» عن مستند محفوظ ومفتوح أمامه.

   أي أن «تعديل ← مرفقات» ليس مساراً معطّلاً — هو مسار **لم يُبنَ قط**،
   ولا شيء قال ذلك. وهذه ثالث مرة يظهر فيها هذا الشكل (اللوحة التي قيل له
   لمدة يومين أن يستعملها وهو يقول إنه لم يرها قط).

   ── لماذا لُفَّت UI.modal تحديداً ───────────────────────────────────────
   🔴 الطريق «الواضح» ميت: لفّ EntityPage.openForm **لا يفعل شيئاً**.
   openForm محلية داخل الإغلاق (entity.js:483) ومُصدَّرة فقط (:874)، وكل
   النداءات الداخلية تستعمل النسخة المحلية — :246 (جديد) و:265 (تعديل من
   الصف) و:317 (نسخ) و:408 (تعديل من شاشة العرض). فإعادة تعيين المُصدَّر
   لا تعترض شيئاً يستطيع المستخدم فعله — وكانت ستنجح في كل الاختبارات.
   openForm ترسم عبر UI.modal (entity.js:529)، وهو المَغرز الذي تنصّ عليه
   .claude/rules/frontend.md أصلاً لـ«فتح نموذج».

   🔴 وهذا الملف **ينادي** Attachments.panelHTML/wirePanel ولا يلفّهما:
   المُصدَّران في attachments.js:519-520 هما نفس الدالتين المحليتين، فالنداء
   يصل إلى التنفيذ الحقيقي الواحد. (اللفّ هو الميت، لا النداء — التمييز
   الذي أرساه بناء زرّ الكاميرا.) ولا نستنسخ panelHTML أبداً: نسختان من
   دالة واحدة تتباعدان، وحارس sha256 يحمي واحدة فقط.

   ── لماذا لا نكرّر قاعدة الصلاحية ───────────────────────────────────────
   panelHTML تحتاج canEdit. تكرار
   `Auth.can(id,'edit') || Auth.can(id,'create')` هنا يصنع «التوأم الهشّ»
   الذي كلّف المشروع مرة وأُزيل من ملف الكاميرا عمداً. لا حاجة له:
   **وجود نموذج التعديل نفسه هو الحكم** — entity.js:491 يرفض فتحه إن لم
   تكن `Auth.can(moduleId,'edit')`، و:490 يرفض الإنشاء بلا `create`. فمن
   كان داخل النموذج فقد أثبت صلاحيته بالفعل.

   ── النطاق: كل الشاشات، لا قسم واحد (القاعدة ٢١) ────────────────────────
   لا يوجد في هذا الملف أي اسم قسم ولا أي قائمة شاشات. يعمل على أي شاشة
   يفتح نموذجها. الإثبات المطلوب تجربة من شاشة **خارج** ضبط المستندات، لا
   جملة تقول إن الكود بلا قيد.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The owner: "on already-SAVED work, attaching fails — «احفظ المستند
   أولاً» — and via the eye button or edit→attachments it is not working."

   attachments.js:490 installs the panel by wrapping EntityPage.openDetail
   ONLY, so #azAttachSection exists in the detail view alone; entity.js has
   no attachment code at all; yet dc-requests.js:805 puts the 📎 button in
   the EDIT modal's footer too. So «تعديل ← مرفقات» is not a broken path —
   it is a path that was never built, and nothing said so.

   🔴 The obvious seam is DEAD: wrapping EntityPage.openForm does nothing,
   because openForm is closure-local (:483), merely exported (:874), and all
   four internal callers use the local binding (:246, :265, :317, :408). It
   would have passed every test and changed nothing a user can do. openForm
   renders through UI.modal (:529) — the seam frontend.md already prescribes.

   🔴 This file CALLS Attachments.panelHTML/wirePanel, never wraps them: the
   exports at attachments.js:519-520 ARE the same closure-local functions, so
   a call reaches the one real implementation. (Wrapping is dead; calling is
   fine — the distinction the camera build established.) panelHTML is never
   transcribed: two copies drift and the sha256 guard covers only one.

   No permission rule is duplicated. panelHTML needs canEdit, but copying
   `Auth.can(id,'edit') || Auth.can(id,'create')` would recreate the fragile
   twin deliberately removed from the camera file. It is unnecessary: THE
   EDIT FORM'S EXISTENCE IS THE VERDICT — entity.js:491 refuses to open it
   without `edit`, :490 refuses creation without `create`.

   Portal-wide (rule 21): this file names no department and no screen list.

   مُثبَت بالتشغيل / proven by running: TESTS/attach-from-form-trial.js
   (v2.0.28)
   ========================================================================= */
(function (global) {
  'use strict';

  var PANEL_ID = 'azAttachSection';
  var MARK = 'azAttachFromForm';

  function L(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return (global.I18N && I18N.getLang && I18N.getLang() === 'en')
      ? (v.en || v.ar) : (v.ar || v.en);
  }

  /* هل النافذة المفتوحة الآن نموذجُ تعديل لسجل محفوظ؟
     Is the modal currently open an edit form for a SAVED record? */
  function savedRecordForm() {
    var form = document.getElementById('entForm');
    if (!form || !form.getAttribute) return null;
    var moduleId = form.getAttribute('data-module');
    var recordId = form.getAttribute('data-record-id');
    /* لا data-record-id = سجل جديد لم يُحفظ بعد — وهناك «احفظ أولاً» صحيحة
       no data-record-id = a genuinely new, unsaved record — there
       "save first" is TRUE */
    if (!moduleId || !recordId) return null;
    return { form: form, moduleId: moduleId, recordId: recordId };
  }

  function honestNewRecordNote() {
    var form = document.getElementById('entForm');
    if (!form || !form.getAttribute) return;
    if (form.getAttribute('data-record-id')) return;      /* محفوظ — لا شأن لنا */
    if (document.getElementById(MARK + 'New')) return;
    var body = document.getElementById('modalBody');
    if (!body) return;
    var p = document.createElement('p');
    p.id = MARK + 'New';
    p.className = 'muted';
    p.style.marginTop = '8px';
    p.textContent = L({
      ar: 'احفظ هذا السجل أولاً، ثم افتحه لإضافة المرفقات.',
      en: 'Save this record first, then reopen it to add attachments.'
    });
    body.appendChild(p);
  }

  /* 🔴 نُزيل زرّ الحذف (✕) من اللوحة داخل نموذج التعديل — يمنع ضياع شغل.
     attachments.js:438 يربط كل [data-az-del] بـ UI.confirm (سطر ٤٤٢)،
     وUI.confirm تنادي UI.modal التي تكتب فوق #modalBody كاملاً (ui.js:98).
     فداخل النموذج: ضغطة واحدة على ✕ تمسح النموذج نفسه ومعه كل ما كتبه
     الموظف ولم يحفظه. على شاشة العرض لا ضرر — لا شيء غير محفوظ هناك —
     ولذلك بقي الحذف هناك كما هو، كاملاً، من زرّ العين 👁.
     لوحتي الجديدة داخل النموذج هي التي أدخلت هذا الطريق المدمِّر، وأمسكته
     بوابةُ فحص مستقلة لا أنا.

     ⚠️ ولماذا نستعلم من `host` الحيّ لا من العقدة قبل إضافتها: حاولتُ أولاً
     الإزالة من العقدة المنفصلة قبل appendChild — فلم يقع شيء، وظلّ الزرّ
     يُعرض. لم أفترض «تعمل في المتصفح الحقيقي»: نستعمل الآن نفس الاستعلام
     على نفس الشجرة الحيّة التي يستعمل wirePanel نجاحاً — إن وجدها هو
     وجدناها.
     🔴 Remove the delete (✕) control from the panel inside the EDIT form —
     this prevents losing work. attachments.js:438 binds every
     [data-az-del] to UI.confirm (:442), and UI.confirm calls UI.modal which
     overwrites the whole of #modalBody (ui.js:98). So inside the form, one
     press of ✕ wipes the form and everything typed and not yet saved. On the
     detail view there is no harm — nothing there is unsaved — so deleting
     stays fully available from the 👁 view screen.
     My own in-form panel introduced this destructive path; an independent
     gate caught it, not me.

     ⚠️ Why we query the LIVE `host` rather than the detached node: a first
     attempt removed them from the node before appendChild and NOTHING
     happened — the button still rendered. Rather than assume "it would work
     in a real browser", we now use the same query on the same live tree that
     wirePanel itself uses successfully — if it can find them, so can we. */
  function stripDeleteControls(host) {
    var removed = 0;
    try {
      if (!host || !host.querySelectorAll) return 0;
      var dels = host.querySelectorAll('[data-az-del]');
      for (var i = dels.length - 1; i >= 0; i--) {
        var b = dels[i];
        if (!b) continue;
        /* 🔴 نجرّب remove() أولاً ثم removeChild. أول نسخة اشترطت
           parentNode.removeChild وحدها، فسقط الشرط بصمت وأعاد «أزلت صفراً»
           بينما الزرّ أمامه — العنصر كان يملك remove() لا removeChild.
           لم أكتشفها بالقراءة بل بمِجسّ طبع «strip removed = 0» بينما
           الاستعلام يجد الزرّ. حارسٌ يتخطّى بصمت أسوأ من خطأ يصرخ.
           🔴 Try remove() first, then removeChild. A first version required
           parentNode.removeChild only, so the guard failed SILENTLY and
           reported "removed 0" while the button sat there — the element had
           remove() but not removeChild. Found not by reading but by a probe
           printing "strip removed = 0" while the query found the button.
           A guard that skips in silence is worse than an error that shouts. */
        if (typeof b.remove === 'function') { b.remove(); removed++; }
        else if (b.parentNode && typeof b.parentNode.removeChild === 'function') {
          b.parentNode.removeChild(b); removed++;
        }
      }
      if (dels.length && !removed) {
        /* لم نستطع إزالتها — لا نصمت. الصمت هنا يعني ضياع شغل الموظف.
           Could not remove them — do not stay silent. Silence here means the
           person loses their unsaved work. */
        try { console.error('[attach-from-form] found ' + dels.length +
          ' delete control(s) inside the edit form and could NOT remove them — ' +
          'pressing one will destroy the open form and any unsaved typing.'); } catch (e3) {}
      }
    } catch (e) {
      try { console.warn('[attach-from-form] could not strip delete controls', e); } catch (e2) {}
    }
    return removed;
  }

  async function injectIntoForm() {
    try {
      var ctx = savedRecordForm();
      if (!ctx) { honestNewRecordNote(); return; }
      if (document.getElementById(PANEL_ID)) return;   /* موجودة أصلاً */
      if (!global.Attachments || typeof Attachments.panelHTML !== 'function') return;

      var body = document.getElementById('modalBody');
      if (!body) return;

      /* canEdit: وجود النموذج نفسه هو الحكم (انظر الترويسة) — لا نسخة ثانية
         من قاعدة الصلاحية. canEdit: the form's existence IS the verdict. */
      var html = await Attachments.panelHTML(ctx.moduleId, ctx.recordId, true);
      if (!html) return;
      if (document.getElementById(PANEL_ID)) return;   /* سبقنا أحدٌ أثناء الانتظار */
      /* لو أُغلقت النافذة أو تغيّر السجل أثناء الانتظار، لا نحقن في نموذج آخر */
      var still = savedRecordForm();
      if (!still || still.recordId !== ctx.recordId) return;

      var div = document.createElement('div');
      div.innerHTML = html;
      var node = div.firstChild;
      if (!node) return;
      node.setAttribute('data-' + MARK, '1');

      /* 🔴 يُنزَع زرّ الحذف (✕) داخل نموذج التعديل — وهذا يمنع ضياع شغل.
         wirePanel يربط كل [data-az-del] بـ UI.confirm (attachments.js:442)،
         وUI.confirm تنادي UI.modal التي تكتب فوق #modalBody كاملاً
         (ui.js:98). فداخل نموذج التعديل: ضغطة واحدة على ✕ تمسح النموذج
         نفسه ومعه كل ما كتبه الموظف ولم يحفظه بعد. على شاشة العرض لا ضرر —
         لا يوجد هناك شيء غير محفوظ — ولهذا بقي الحذف هناك كما هو.
         أمسكت هذا بوابةُ فحص مستقلة، لا أنا: لوحتي الجديدة داخل النموذج هي
         التي أدخلت هذا الطريق المدمِّر، ولم أفكّر فيه.
         الحذف يظلّ متاحاً كاملاً من زرّ العين 👁 على شاشة العرض.
         🔴 The delete (✕) control is stripped inside the EDIT form — this
         prevents losing work. wirePanel binds every [data-az-del] to
         UI.confirm (attachments.js:442), and UI.confirm calls UI.modal,
         which overwrites the whole of #modalBody (ui.js:98). So inside the
         edit form one press of ✕ wipes the form itself and everything the
         person had typed and not yet saved. On the detail view there is no
         harm — nothing there is unsaved — which is why delete stays there
         untouched. An independent gate caught this, not me: my own new
         in-form panel is what introduced the destructive path, and I had not
         thought about it.
         Deleting remains fully available from the 👁 view screen. */
      body.appendChild(node);
      stripDeleteControls(body);

      if (typeof Attachments.wirePanel === 'function') {
        Attachments.wirePanel(body, ctx.moduleId, ctx.recordId, function () {
          var old = document.getElementById(PANEL_ID);
          if (old) old.remove();
          injectIntoForm();
        });
        /* wirePanel قد يعيد الرسم؛ ننظّف مرة أخرى بعده حتماً
           wirePanel may re-render; strip again after it, unconditionally */
        stripDeleteControls(body);
      }
    } catch (e) {
      /* لا نُفشل فتح نموذج لأجل لوحة مرفقات
         never break opening a form for the sake of an attachments panel */
      try { console.warn('[attach-from-form] could not add the panel', e); } catch (e2) {}
    }
  }

  function install() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__attachFromFormInstalled) return false;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      var out = origModal.apply(UI, arguments);
      /* ui.js:94 يكتب opts.body في #modalBody **تزامنياً**، فالنموذج موجود
         بعد العودة مباشرة. لا نعتمد على opts.onOpen: ملفات أخرى في السلسلة
         تستبدلها، وترتيبنا بينها لا يجب أن يقرّر هل نعمل أم لا.
         ui.js:94 writes opts.body into #modalBody SYNCHRONOUSLY, so the form
         exists as soon as this returns. We deliberately do NOT rely on
         opts.onOpen: other files in the chain replace it, and our position
         among them must not decide whether we work. */
      try { setTimeout(injectIntoForm, 0); } catch (e) {}
      return out;
    };
    UI.__attachFromFormInstalled = true;
    return true;
  }

  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.AttachFromForm = {
    injectIntoForm: injectIntoForm,
    stripDeleteControls: stripDeleteControls,
    savedRecordForm: savedRecordForm,
    __install: install
  };
})(window);
