/* =========================================================================
   emergency-money-hold.js — حساب الطوارئ لا يعتمد ولا يعكس مستنداً مالياً
   -------------------------------------------------------------------------
   قرار محمد زيدان (١٠ سبتمبر ٢٠٢٦، بالحرف): «أبقِ اعتماد الدفع مُعطَّلاً
   واشرح هذا بوضوح على الشاشة؛ لا تسحب حقوقه الأخرى المُعتمَدة.»

   Mohamed Zidan's decision (10 Sept 2026, verbatim): "keep payment
   approval DISABLED and clearly explain this on screen; do not remove
   its other already-approved rights."

   ---------------------------------------------------------------------
   النطاق · SCOPE

   «اعتماد الدفع» يعني هنا كل مستند مالي — كل وحدة تحمل amountField في
   schema.js وhr-department.js. اليوم (سُوير خمس عشرة وحدة، مقيسة حيّة لا
   مخمَّنة، انظر TESTS/emergency-money-hold-trial.js الذي يقارن هذا الملف
   بنفسه بقائمة Schema.MODULES الحقيقية وقت التشغيل):
     journal · purchaseApprovals · goodsReceipts · supplierInvoices ·
     payments · receipts · stockIssues · stockTransfers · stockCounts ·
     budgets · clientIPCs · subIPCs · payroll · employeeAdvances ·
     dailyLabour

   القراءة الضيّقة («فقط شاشة المدفوعات») كانت ستمنح حساب الطوارئ اعتماداً
   جديداً على ١٤ وحدة ماليةً أخرى لم يملكه من قبل — سلطة مالية لم يمنحها
   المالك قط. البوّابة الحالية في المتصفح (rules.js) ترفض breakglass على
   الشرائح الماليّة كلها اليوم بالفعل (مقيس)، فـ«أبقِ مُعطَّلاً» تعني
   الإبقاء على هذه الحالة — لا توسيعها ولا تضييقها.

   "Payment approval" here means every MONEY document — every module
   carrying amountField in schema.js and hr-department.js. Today that is
   fifteen modules, MEASURED live, never guessed (see
   TESTS/emergency-money-hold-trial.js, which diffs this file against the
   real, running Schema.MODULES list). The narrow reading ("only the
   Payments screen") would have GRANTED breakglass new approval on 14
   other money modules it never had — new financial authority the owner
   never gave. The browser's existing amount band (rules.js) already
   refuses breakglass on every band today (measured), so "keep disabled"
   means keep that state — neither widen it nor narrow it.

   ---------------------------------------------------------------------
   ثلاث لفافات إضافية بحتة · THREE PURELY ADDITIVE SEAMS

   ١ · الطبقة الأولى — auth.js: على كل وحدة مالية، تُستبدَل صلاحيات
       breakglass المُوروثة من '*' (والتي تشمل approve) بمصفوفة جديدة —
       نسخة طبق الأصل مطروحاً منها 'approve' فقط. مصفوفة جديدة تماماً لكل
       وحدة، لا لمس أبداً للمصفوفة ALL المشتركة التي يستعملها gm أيضاً
       (auth.js:205-206) — لمسها كان سيسحب اعتماد المدير المالي نفسه على
       نفس الشاشات، وهذا بالضبط ما تختبره حقنة العطل «مصفوفة مشتركة» في
       التجربة.
       Auth.can(moduleId, 'approve') يصبح false لحساب الطوارئ على هذه
       الوحدات فقط، وworkflow.js نفسه (:61، :70) يتوقّف عن عرض زرّي
       «اعتماد» و«عكس» — بلا لمس أي ملف للقراءة فقط.

   ١ · LAYER ONE — auth.js: on every money module, breakglass's inherited
       '*' permissions (which include approve) are replaced with a FRESH
       array — an exact copy minus 'approve' only. A brand-new array per
       module, never touching the shared ALL array gm also uses
       (auth.js:205-206) — touching it would strip the finance manager's
       OWN approve on the same screens, which is exactly what the "shared
       array" fault injection below proves.
       Auth.can(moduleId, 'approve') becomes false for breakglass on these
       modules only, and workflow.js itself (:61, :70) stops offering the
       Approve and Reverse buttons — no read-only file touched.

   ٢ · الشرح — يلفّ Workflow.actions: حين يكون الحساب الحالي breakglass،
       والوحدة مالية، والحالة عند نقطة كان سيظهر فيها زرّ اعتماد أو عكس
       لولا الطبقة الأولى — يُضاف زرّ رمادي معطَّل بجملة تشرح السبب، بدل
       شاشة صامتة تجعل الموظف يظن أن الزرّ اختفى بالخطأ. نفس أسلوب
       one-step-approval.js:64-71 وinbox-project-fence.js:94-102 تماماً؛
       pages/entity.js:411-424 يرسم عناصر disabled كأزرار معطَّلة فعلاً.

   2 · THE EXPLANATION — wraps Workflow.actions: when the current account
       is breakglass, the module is money, and the record sits at a state
       where an Approve or Reverse button would otherwise have appeared —
       a disabled grey button is added explaining why, instead of a silent
       screen that reads as a bug. The exact idiom one-step-approval.js:
       64-71 and inbox-project-fence.js:94-102 already use;
       pages/entity.js:411-424 already renders `disabled` items as inert
       buttons.

   ٣ · الحزام — يلفّ Workflow.transition: يرفض «اعتماد» و«عكس» لحساب
       الطوارئ على الوحدات المالية قبل أي نداء للخادم. «عكس» غير مغطّاة
       بشريط المبالغ في rules.js اليوم (السبب: rules.js:356 يفحص
       action === 'approve' فقط) — هذه اللفافة تسدّ تلك الفجوة تحديداً.
       (ملاحظة تحقّقتُ منها في قاعدة البيانات: az_transition_document
       تفحص az_can_workflow(table,'approve') لكلٍّ من 'approve' و'reverse'
       معاً — الملف 64 المعدَّل يمنع هذا الصفّ فيرفض الخادم الاثنين أيضاً؛
       هذه اللفافة هي الحزام الإضافي في المتصفح، لا الحارس الوحيد.)

   3 · THE BELT — wraps Workflow.transition: refuses 'approve' and
       'reverse' for breakglass on money modules before any server call.
       'reverse' is not covered by rules.js's amount band today (rules.js:
       356 checks only action === 'approve') — this wrap closes exactly
       that gap in the browser. (Checked directly in the database:
       az_transition_document tests az_can_workflow(table,'approve') for
       BOTH 'approve' and 'reverse' — the amended file 64 withholds that
       row, so the server already refuses both too; this wrap is the belt
       in the browser, not the only guard.)

   ---------------------------------------------------------------------
   إضافي بحت · PURELY ADDITIVE — حذف هذا الملف يعيد breakglass إلى '*':
   ALL على كل شاشة مالية (سلوك ما قبل ١٠ سبتمبر ٢٠٢٦ تماماً)، ولا يمسّ
   auth.js أو workflow.js أو rules.js أو أي ملف للقراءة فقط.
   Deleting this file restores breakglass to '*': ALL on every money
   screen exactly as it was before 10 Sept 2026, and touches none of
   auth.js, workflow.js, rules.js or any read-only file.

   مُثبَت بالتشغيل · proven by running:
   TESTS/emergency-money-hold-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function txt(pair) { return (global.L ? L(pair) : (isAr() ? pair.ar : pair.en)); }

  /* الجملة الواحدة المستعملة في الزرّ المعطَّل وفي رفض التنفيذ معاً — نفس
     النصّ في الموضعين، فلا يرى الموظف شرحاً على الزرّ وسبباً مختلفاً في
     التوست لو ضغط بطريقة أخرى (رابط مباشر مثلاً).
     ONE sentence used on the disabled button AND on the refused
     transition — identical text in both places, so staff never see one
     explanation on the button and a different one in the toast if the
     action is reached another way (a deep link, say). */
  function holdMessage() {
    return txt({
      ar: 'حساب الطوارئ لا يعتمد المستندات المالية ولا يعكسها — قرار محمد ' +
          'زيدان ١٠ سبتمبر ٢٠٢٦. الاعتماد للمدير المالي أو المدير العام حسب قيمة المستند.',
      en: 'The emergency account does not approve or reverse money documents ' +
          "— Mohamed Zidan's decision, 10 Sept 2026. Approval rests with the " +
          'finance manager or the general manager, by amount.'
    });
  }

  function install() {
    if (!global.Schema || !global.Auth || !global.Workflow || global.__emergencyMoneyHoldInstalled) return;
    global.__emergencyMoneyHoldInstalled = true;

    /* ═════ ١ · الطبقة الأولى — auth.js: مصفوفة جديدة لكل وحدة مالية ═════
       ⭐ Schema.MODULES وقت النداء — وليس ثابتاً هنا — لأن hr-department.js
       يضيف employeeAdvances وdailyLabour إلى المصفوفة نفسها وقت تحميله
       (hr-department.js:472)، وهذا الملف يُحمَّل بعد auth.js أصلاً فكلا
       الملفين انتهيا من التسجيل قبل أن نصل هنا — لكن القراءة الحيّة، لا
       نسخة مجمَّدة، هي ما تجعل الفحص «مقيس لا مفترَض» فعلاً.
       ⭐ Reads Schema.MODULES AT CALL TIME, never a frozen copy — because
       hr-department.js appends employeeAdvances and dailyLabour to that
       very array when IT loads (hr-department.js:472), and this file
       necessarily loads after auth.js, by which point both registrations
       are already done — but reading live, not a snapshot, is what keeps
       this "measured, not assumed". */
    function moneyModules() {
      return (Schema.MODULES || []).filter(function (m) { return !!m.amountField; });
    }

    var bg = Auth.ROLES && Auth.ROLES.breakglass;
    if (bg && bg.perms) {
      moneyModules().forEach(function (m) {
        /* ⭐ مصفوفة حرفية جديدة — لا اشتقاق من bg.perms['*'] (وهي ALL
           المشتركة مع أدوار أخرى، auth.js:148). النسخ بالاشتقاق (slice/
           concat من ALL ثم حذف عنصر) يبدو آمناً لكنه لا يمنع خطأً مستقبلياً
           يستعمل push/splice على النتيجة ظاناً أنها معزولة؛ الحرفية هنا لا
           لبس فيها إطلاقاً — لا مجال لمشاركة المرجع بالخطأ.
           ⭐ A fresh LITERAL array — never derived from bg.perms['*'] (the
           shared ALL, auth.js:148). Deriving by slice/concat would look
           safe but leaves room for a future mistake that push/splice's the
           result believing it is isolated; a literal here removes that
           ambiguity entirely — no way to share the reference by accident. */
        bg.perms[m.id] = ['view', 'create', 'edit', 'delete', 'review'];
      });
    }

    /* ═════ ٢ · الشرح — بطاقة معطَّلة بدل شاشة صامتة ═════ */
    var origActions = Workflow.actions;
    Workflow.actions = function (moduleId, rec) {
      var list = origActions.apply(Workflow, arguments) || [];
      var u = Auth.current();
      if (!u || u.role !== 'breakglass' || !rec) return list;
      var mod = Schema.get(moduleId);
      if (!mod || !mod.amountField) return list;

      /* نفس شرطَي workflow.js بالضبط (:61 وَ:70) — «مُراجَع» يعرض اعتماداً،
         «معتمد» يعرض عكساً. لا نحتاج فحص Auth.can هنا: الطبقة الأولى
         جعلته false بالفعل على هذه الوحدة، فِعل origActions أعلاه أسقط
         الزرّ من القائمة من تلقاء نفسه — عملنا هو تفسير الغياب فقط.
         The EXACT same two conditions workflow.js itself uses (:61 and
         :70) — "reviewed" would show approve, "approved" would show
         reverse. No need to re-check Auth.can here: layer one already
         made it false for this module, so origActions above already
         dropped the button by itself — our job is only to explain the gap. */
      var st = rec.status || 'draft';
      var wouldShow = (st === 'reviewed') || (st === 'approved');
      if (!wouldShow) return list;
      if (list.some(function (a) { return a.key === '_emergencyMoneyHold'; })) return list;

      list.push({ key: '_emergencyMoneyHold', disabled: true, cls: 'btn-outline', label: holdMessage() });
      return list;
    };

    /* ═════ ٣ · الحزام — رفض قبل أي نداء للخادم ═════ */
    var origTransition = Workflow.transition;
    Workflow.transition = async function (moduleId, id, action, reason) {
      if (action === 'approve' || action === 'reverse') {
        var u = Auth.current();
        var mod = Schema.get(moduleId);
        if (u && u.role === 'breakglass' && mod && mod.amountField) {
          return { ok: false, error: holdMessage() };
        }
      }
      return origTransition.apply(Workflow, arguments);
    };

    console.info('emergency-money-hold.js ready — the emergency account cannot approve or reverse money documents.');
  }

  if (global.Schema && global.Auth && global.Workflow) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
