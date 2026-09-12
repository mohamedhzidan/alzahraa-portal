/* =========================================================================
   save-project-fence.js — لا يُحفَظ سجلّ على مشروع غير مُسنَد إلى حسابك
   save-project-fence.js — no record on a project not assigned to your
   account can be saved
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف — مُثبَت بالقياس (R7/R8 في الخطة)
   THE FAULT THIS FILE PREVENTS — measured, not observed (plan's R7/R8)

   Auth.scopeRows يخفي سجلّ مشروع لا يملكه الحساب المسيَّج عن القراءة —
   لكن لا شيء في المتصفح يمنع الحفظ: قائمة المشروع في النموذج تعرض كل
   المشروعات بلا فلترة (pages/entity.js:613-615)، وStore.create/Store.save
   لا يفحصان الحقل project إطلاقاً (بحث في store.js: صفر إشارة). فأمين
   مخزن بقائمة مشروعات فارغة يستطيع فتح نموذج جديد، يختار أي مشروع، يحفظ —
   والسجل يصل الخادم بنجاح، ثم يختفي فوراً من شاشته هو (Auth.scopeRows
   يخفيه). السجل موجود ولا يراه من أنشأه — عطلٌ صامت، لا خطأ يظهر لأحد.

   Auth.scopeRows hides a project record the fenced account does not hold
   FROM READING — but nothing in the browser stops SAVING one: the form's
   project dropdown offers every project with no filter
   (pages/entity.js:613-615), and neither Store.create nor Store.save ever
   checks the project field at all (grepped store.js: zero references). So
   a storekeeper with an empty project list can open a new form, pick any
   project, save — the record reaches the server successfully, then
   vanishes from their OWN screen instantly (Auth.scopeRows hides it). The
   record exists and its own creator cannot see it — a silent fault, no
   error shown to anyone.

   ── حكم صاحب العمل ٢١ ─────────────────────────────────────────────────
   «لا وصول، لا حفظ، لا اعتماد لسجلّات المشروعات لحسابات مسيَّجة بلا
   مشروع مُسنَد، بانسجام في كل طبقة تطبيق.» هذا الملف هو طبقة الحفظ في
   المتصفح — الطبقة الوحيدة التي كانت غائبة تماماً (B1 في الخطة). طبقة
   القاعدة (القراءة والاعتماد) في الملف ٦٨ المصاحب.

   Owner ruling 21: "no access, no saving, no approving of project
   records for project-restricted accounts with no assigned project,
   consistently in every enforcement layer." This file is the browser
   SAVE layer — the one layer that was completely absent (plan's B1).
   The database layer (read and approve) is the companion file 68.

   ── القاعدة بالضبط ────────────────────────────────────────────────────
   لكل حفظ إنشاء أو تعديل على شاشة تحمل حقل project: يُحسَب المشروع
   الصادر فعلياً (project في الرقعة إن وُجد، وإلا مشروع السجل الأصلي —
   نفس حساب Store.save's merge بالضبط)؛ فإن كان موجوداً، والحساب ليس على
   مستوى الشركة (Auth.hasAllProjects)، وليس ضمن قائمة مشروعات الحساب —
   يُرفض قبل أي نداء للخادم. نفس اختبار az_can_project حرفياً، مكتوب هنا
   بلا نسخ الدالة من القاعدة — القاعدة هي الحكم النهائي دوماً؛ هذا حارس
   أول يوفّر رحلة شبكة ضائعة ويعطي رسالة عربية مفهومة بدل خطأ خادم عام.

   THE EXACT RULE: for every create/save on a screen carrying a project
   field, compute the OUTGOING project (patch.project if present, else
   the cached original's project — mirroring store.js's own merge
   exactly); if it is set, the account is NOT company-wide
   (Auth.hasAllProjects), and it is not in the account's own project list
   — refuse before any server call. The exact same test as az_can_project,
   written here without copying the database function — the database is
   always the final judge; this is a first guard that saves a wasted
   network round trip and gives an understandable Arabic message instead
   of a generic server error.

   ── شكل الرفض، قُرئ من الكود الحقيقي لا افتُرض ────────────────────────
   🔴 الخطة أشارت إلى draft-save-honesty.js:114-125 كمصدر «شكل الرفض
   القائم في البورتال» — قُرئ الملف كاملاً فوجد أن تلك الأسطر تلفّ
   Store.save/Store.create لتسجيل علم فقط، ولا ترفض شيئاً؛ الإشارة كانت
   غير دقيقة. الشكل الحقيقي وُجد في pages/entity.js:872 داخل commit():
   `if (!saved) return false;` — أي قيمة زائفة (false هنا، بنفس أسلوب
   entity.js:840/845 لرفوضاتها الخاصة) تُقرأ بمعنى «لم يُحفظ»: النافذة
   تبقى مفتوحة، لا رسالة نجاح، لا App.refresh(). فالرفض هنا toast عربي ثم
   return false — لا استثناء يُرمى، فلا ينهار الحفظ عند أي غلطة داخل هذا
   الحارس نفسه.

   THE REFUSAL SHAPE, READ FROM THE REAL CODE, NOT ASSUMED
   🔴 The plan cited draft-save-honesty.js:114-125 as the portal's
   existing "refusal shape". The file was read in full and those lines
   only wrap Store.save/Store.create to set a flag — they refuse nothing;
   the citation was inaccurate. The real shape was found at
   pages/entity.js:872 inside commit(): `if (!saved) return false;` — any
   falsy return (false here, the same idiom entity.js's own refusals use
   at :840/:845) reads as "not saved": the modal stays open, no success
   toast, no App.refresh(). So the refusal here is an Arabic toast then
   `return false` — never a thrown exception, so a fault inside this guard
   itself can never crash a legitimate save.

   ── لماذا سياج القيمة، لا سياج الحقل فقط ──────────────────────────────
   حقل project قد يغيب عن الرقعة عند تعديل سجل قائم لحقول أخرى — فلا
   نكتفي بفحص الرقعة، بل نحسب القيمة الصادرة فعلياً بدمجها مع Store.find
   الأصلي، تماماً كما يفعل store.js:398 داخلياً — فلا يفلت تعديلٌ لسجل على
   مشروع محظور لمجرّد أن الرقعة لم تذكر project صراحةً.

   WHY THE OUTGOING VALUE, NOT ONLY THE PATCH FIELD
   The project field may be absent from the patch when editing OTHER
   fields on an existing record — so we do not just inspect the patch, we
   compute the value that will actually GO OUT by merging with the cached
   Store.find original, exactly as store.js:398 itself does internally —
   so editing a record on a forbidden project cannot slip through merely
   because the patch never mentioned project explicitly.

   ── لوحة الاختيار: تُقلَّم لا تُخفى بالكامل ───────────────────────────
   يُلفّ UI.modal (نفس أسلوب save-modes.js) فتُحذَف من قائمة select[name=
   "project"] كل الخيارات خارج قائمة الحساب فور فتح أي نموذج — منعاً
   وقائياً، لا بديلاً عن سياج الحفظ أعلاه: preset (كما تستعمله بعض
   الشاشات) قد يضع project مباشرة في المسودة متجاوزاً القائمة المنسدلة
   كلياً، فسياج الحفظ هو الحارس الحقيقي دوماً.

   THE DROPDOWN: PRUNED, NOT HIDDEN ENTIRELY
   UI.modal is wrapped (the same idiom save-modes.js uses) to remove every
   option outside the account's own project list from
   select[name="project"] the instant any form opens — a preventive
   measure, never a substitute for the save fence above: a preset (some
   screens use one) can set project directly on the draft, bypassing the
   dropdown entirely — the save fence is always the real guard.

   ── إضافي بحت ──────────────────────────────────────────────────────────
   يلفّ Store.create/Store.save (كما يفعل null-writeback-guard.js) وUI.modal
   (كما يفعل save-modes.js). لا يعدّل store.js ولا pages/entity.js ولا
   ui.js إطلاقاً. حذف هذا الملف يعيد سلوك اليوم بالضبط.

   PURELY ADDITIVE — wraps Store.create/Store.save (the same idiom
   null-writeback-guard.js uses) and UI.modal (the same idiom
   save-modes.js uses). Neither store.js, pages/entity.js, nor ui.js is
   ever touched. Deleting this file restores today's behaviour exactly.

   يُحمَّل بعد auth.js وschema.js وrobot-role.js وstock-approval-roles.js —
   يحتاج Auth.hasAllProjects وSchema.MODULES معرَّفين.
   Loads after auth.js, schema.js, robot-role.js and
   stock-approval-roles.js — needs Auth.hasAllProjects and Schema.MODULES
   already defined.

   مُثبَت بالتشغيل / proven by running: TESTS/save-project-fence-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

  function refusalMessage() {
    return isAr()
      ? 'لا يمكن حفظ هذا السجل — المشروع المحدَّد غير مُسنَد إلى حسابك. راجع مسؤول النظام لإضافة هذا المشروع إلى قائمتك (الإعدادات ← المستخدمون).'
      : 'This record cannot be saved — the selected project is not assigned to your account. Ask the system administrator to add it to your project list (Settings → Users).';
  }

  function moduleForTable(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    for (var i = 0; i < Schema.MODULES.length; i++) {
      if (Schema.MODULES[i].table === table) return Schema.MODULES[i];
    }
    return null;
  }

  function hasProjectField(mod) {
    return !!(mod && mod.fields && mod.fields.some(function (f) { return f.name === 'project'; }));
  }

  /* القيمة الصادرة فعلياً — رقعة إن ذكرت project صراحة، وإلا السجل
     الأصلي المخزَّن — نفس دمج store.js:398 بالضبط. انظر الشرح أعلى الملف.
     The value that will actually go out — the patch if it explicitly
     names project, else the cached original record — the exact merge
     store.js:398 performs. See the file header for why. */
  function resolvedProject(table, id, patch) {
    if (patch && typeof patch === 'object' && Object.prototype.hasOwnProperty.call(patch, 'project')) {
      return patch.project;
    }
    if (id) {
      try {
        var orig = global.Store.find(table, id);
        return orig ? orig.project : undefined;
      } catch (e) { return undefined; }
    }
    return undefined;
  }

  /* هل يُرفض هذا الحفظ؟ — نفس اختبار az_can_project حرفياً، دون نسخ
     الدالة: p فارغ → لا سياج · على مستوى الشركة → لا سياج · المشروع ضمن
     قائمة الحساب → لا سياج · غير ذلك → رفض.
     Is this save refused? — the exact az_can_project test, without
     copying the function: p empty → no fence · company-wide → no fence ·
     project in the account's own list → no fence · otherwise → refuse. */
  function refused(table, id, patch) {
    try {
      var mod = moduleForTable(table);
      if (!hasProjectField(mod)) return false;
      var p = resolvedProject(table, id, patch);
      if (!p) return false;
      if (!global.Auth || typeof Auth.hasAllProjects !== 'function') return false;
      if (Auth.hasAllProjects()) return false;
      var current = (typeof Auth.current === 'function') ? Auth.current() : null;
      var allowed = (current && current.projects) || [];
      return allowed.indexOf(p) === -1;
    } catch (e) {
      return false;   /* عطل في الحارس نفسه لا يجوز أن يمنع حفظاً صحيحاً
                          a fault in the guard itself must never block a legitimate save */
    }
  }

  function toastRefusal() {
    try { if (global.UI && typeof UI.toast === 'function') UI.toast(refusalMessage(), 'error', 6000); }
    catch (e) { /* لا نُفشل الرفض نفسه لأجل تعطّل التنبيه */ }
  }

  function installStoreWrap() {
    if (!global.Store || Store.__projectFence) return;
    Store.__projectFence = true;

    var origCreate = Store.create;
    Store.create = function (table, data /* , opts */) {
      if (refused(table, null, data)) { toastRefusal(); return false; }
      return origCreate.apply(Store, arguments);
    };

    var origSave = Store.save;
    Store.save = function (table, id, patch /* , opts */) {
      if (refused(table, id, patch)) { toastRefusal(); return false; }
      return origSave.apply(Store, arguments);
    };

    console.info('save-project-fence.js ready — a save on a project the account does not hold is refused before the server.');
  }

  /* ── تقليم قائمة select[name="project"] فور فتح أي نموذج ──────────────
     1 · Pruning select[name="project"] the instant any form opens */
  function pruneProjectOptions() {
    try {
      if (!global.Auth || typeof Auth.hasAllProjects !== 'function' || Auth.hasAllProjects()) return;
      var current = (typeof Auth.current === 'function') ? Auth.current() : null;
      var allowed = (current && current.projects) || [];
      var doc = global.document;
      if (!doc || !doc.getElementById) return;
      var form = doc.getElementById('entForm');
      if (!form || !form.querySelector) return;
      var sel = form.querySelector('select[name="project"]');
      if (!sel || !sel.querySelectorAll) return;
      var opts = sel.querySelectorAll('option');
      opts.forEach(function (o) {
        var v = o.getAttribute('value') || '';
        if (v === '') return;                              /* الخيار الفارغ يبقى دائماً */
        if (allowed.indexOf(v) === -1 && o.parentNode) o.parentNode.removeChild(o);
      });
    } catch (e) { /* التقليم وقائي فقط — لا يجوز أن يمنع فتح نموذج صحيح */ }
  }

  function installModalWrap() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__projectFenceModalWrapped) return;
    UI.__projectFenceModalWrapped = true;
    var origModal = UI.modal;
    UI.modal = function () {
      var result = origModal.apply(UI, arguments);
      pruneProjectOptions();
      return result;
    };
  }

  installStoreWrap();
  installModalWrap();
  /* إعادة محاولة على نمط null-writeback-guard.js/save-guard.js — تحسّباً
     لإعادة بناء Store أو UI لاحقاً لم تُر بعد وقت التحميل الأول.
     Retried on the same idiom null-writeback-guard.js/save-guard.js use —
     in case Store or UI are rebuilt later, not yet seen at first load. */
  [0, 500, 2000, 5000].forEach(function (ms) {
    setTimeout(function () { installStoreWrap(); installModalWrap(); }, ms);
  });

  global.SaveProjectFence = { resolvedProject: resolvedProject, refused: refused, pruneProjectOptions: pruneProjectOptions };
})(window);
