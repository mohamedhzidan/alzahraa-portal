/* =========================================================================
   sheet-approval-hold.js — المدير العام وحساب الطوارئ لا يعتمدان طلب
                            الخرسانة الجاهزة ولا إذن فحص المواد
   -------------------------------------------------------------------------
   إجابة محمد زيدان (١١ سبتمبر ٢٠٢٦، سؤال المدير رقم ٢، بكلمته: «no»):
   هشام (المدير العام) لا يعتمد طلبات الخرسانة الجاهزة ولا أذون فحص المواد
   الداخلي. قاعدة البيانات صحيحة اليوم؛ الشاشة هي الخاطئة.

   Mohamed Zidan's answer (11 Sept 2026, the manager's question 2, his
   word: "no"): هشام (the general manager) does NOT approve ready-mix
   concrete requests or internal material inspection permits. The database
   is right today; the SCREEN is wrong.

   ---------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف · THE FAULT THIS FILE PREVENTS

   auth.js يعطي المدير العام '*' بما فيها «مراجعة» و«اعتماد» على كل شاشة،
   فيرسم one-step-approval.js له زرّ «اعتماد» أخضر على هاتين الشاشتين،
   ويضعهما في «في انتظاري» وعدّاد الصفحة الرئيسية. يضغط، فترفض قاعدة
   البيانات: «role gm may not approve concreteRequests». زرّ يَعِد بما لا
   يستطيع — ومستند يبقى في صندوقه لا يقدر أن يفعل به شيئاً.

   auth.js gives the general manager '*' — review AND approve — on every
   screen, so one-step-approval.js draws him a green Approve button on
   these two screens and puts them in his "waiting for me" list and the
   Home badge. He presses it, and the database refuses: "role gm may not
   approve concreteRequests". A button that promises what it cannot do —
   and a document stuck in his queue that he can do nothing with.

   🔴 مقيس لا مفترَض (١١ سبتمبر، محرّك Postgres حقيقي، كل ملفات السلسلة
   حتى ٧٢): على هاتين الشاشتين تمنح قاعدة البيانات «اعتماد» لمدير المشروع
   والمكتب الفني فقط، و«مراجعة» لا أحد. أي أن إخفاء «اعتماد» وحده كان
   سيُسقط المستند في تبويب «للمراجعة» عند المدير العام بزرّ مراجعة ترفضه
   القاعدة أيضاً — لذلك يُسحب الاثنان معاً، ومعهما «إرجاع/رفض/عكس» التي
   تتبعهما. انظر TESTS/sheet-approval-hold-trial.js القسم D.
   🔴 MEASURED, not assumed (11 Sept, real Postgres engine, every chain
   file through 72): on these two screens the database grants APPROVE to
   the project manager and the technical office only, and REVIEW to
   nobody. So hiding Approve alone would have dropped the document into
   the GM's "to review" tab with a Review button the database also
   refuses — both are withdrawn together, and with them Return / Reject /
   Reverse, which ride on them. See TESTS/sheet-approval-hold-trial.js, D.

   حساب الطوارئ (breakglass) في نفس الموضع تماماً: '*' كاملة في المتصفح،
   ولا صفّ اعتماد في القاعدة (الملف ٦٤ يعطيه قواعد المدير العام، والمدير
   العام لا يملك هذا الصفّ). حكما ١٣ و٢٠: حساب الطوارئ = المدير العام ما
   عدا المال — فما لا يعتمده المدير العام لا يعتمده هو. قرار مسار
   الصلاحيات (ROBOT-4)، قابل للنقض، لا يمنح ولا يسحب أي حقّ في القاعدة.
   The emergency account (breakglass) sits in exactly the same place: '*'
   in the browser, no approve row in the database (file 64 gives it the
   GM's rules, and the GM holds no such row). Rulings 13 and 20: the
   emergency account = the GM except for money — so what the GM does not
   approve, it does not approve either. A permissions-lane call
   (ROBOT-4), vetoable; it grants and removes no database right at all.

   مراجع المستندات (reviewer) — '*': ['view','review'] (auth.js:192) يرسم له
   «مراجعة/إرجاع/رفض» على هاتين الشاشتين، والقاعدة لا تعطي أحداً «مراجعة»
   عليهما أصلاً (مقيس، D.9) فترفض الثلاثة. الشاشتان بتوقيع واحد بلا خطوة
   مراجعة. سُحبت «مراجعة» منه هنا وحدها — بقرار المسار أيضاً، قابل للنقض،
   ومذكور بالاسم في حكم المدير (VERDICT-r5 بند R6-1). جملته مختلفة: لا يعنيه
   المدير العام، يعنيه أن لا خطوة مراجعة هنا.
   The document reviewer — '*': ['view','review'] (auth.js:192) draws him
   Review / Return / Reject on these two screens, and the database gives
   REVIEW to nobody there (measured, D.9), so it refuses all three. The two
   screens have one signature and no review step. His Review is withdrawn
   here only — also a lane call, vetoable, named in the manager's verdict
   (VERDICT-r5 item R6-1). His sentence differs: the GM is not his
   business; what he needs to know is that there is no review step here.

   ---------------------------------------------------------------------
   ثلاث لفافات إضافية بحتة — نفس شكل emergency-money-hold.js
   THREE PURELY ADDITIVE SEAMS — the shape of emergency-money-hold.js

   ١ · الطبقة الأولى — Auth.ROLES: على الشاشتين فقط، لكل من gm وbreakglass وreviewer،
       مصفوفة جديدة = ما يملكه اليوم مطروحاً منه «مراجعة» و«اعتماد» فقط.
       Auth.can يصبح false، فيتوقّف workflow.js وone-step-approval.js
       وinbox-project-fence.js وunassigned-routing.js عن عرض الزرّ أو عدّ
       المستند له — كلها تقرأ Auth عند كل نداء.
   1 · LAYER ONE — Auth.ROLES: on the two screens only, for gm,
       breakglass and reviewer, a NEW array = what the role holds there today minus
       'review' and 'approve' only. Auth.can becomes false, so workflow.js,
       one-step-approval.js, inbox-project-fence.js and unassigned-routing.js
       stop drawing the button or counting the document for him — each reads
       Auth on every call.

   ٢ · الشرح — يلفّ Workflow.actions: زرّ رمادي معطَّل بجملة واحدة تقول
       لماذا ومن يعتمد، بدل شاشة صامتة.
   2 · THE EXPLANATION — wraps Workflow.actions: one disabled grey button
       saying why and who does sign, instead of a silent screen.

   ٣ · الحزام — يلفّ Workflow.transition: يرفض الأفعال الخمسة قبل أي نداء
       للخادم، مهما كان الطريق (رابط مباشر، صلاحية فردية في overrides).
   3 · THE BELT — wraps Workflow.transition: refuses the five actions
       before any server call, whatever the route (a deep link, a
       per-account override).

   ما لا يتغيّر · WHAT DOES NOT CHANGE: عرض الشاشتين، الإنشاء، التعديل،
   الإلغاء — كما هي. كل الشاشات الأخرى — كما هي. قاعدة البيانات — لا شيء.
   Viewing, creating, editing and cancelling on the two screens — as they
   are. Every other screen — as it is. The database — nothing.

   إضافي بحت · PURELY ADDITIVE — حذف هذا الملف (وسطره في loader.js
   وservice-worker.js) يعيد الزرّ الذي ترفضه القاعدة، حرفياً كما كان قبل
   ١١ سبتمبر ٢٠٢٦. Deleting this file (and its line in loader.js and
   service-worker.js) brings back the button the database refuses, exactly
   as it was before 11 Sept 2026.

   مُثبَت بالتشغيل · proven by running: TESTS/sheet-approval-hold-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  /* الشاشتان والدوران — لا أكثر. The two screens and the two roles — no more. */
  var SHEETS = ['concreteRequests', 'inspectionPermits'];
  var HELD_ROLES = ['gm', 'breakglass', 'reviewer'];
  /* «مراجعة» و«اعتماد» تُسحبان من الصلاحية؛ «إرجاع/رفض/عكس» تركب عليهما في
     workflow.js (:52-72) وفي باب القاعدة (الملف ٧٢، az_transition_any_document)
     فتُرفض في الحزام أيضاً. Review and approve are withdrawn from the
     permission; return/reject/reverse ride on them in workflow.js (:52-72)
     and in the database door (file 72), so the belt refuses them too. */
  var HELD_ACTIONS = ['review', 'approve', 'return', 'reject', 'reverse'];

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function txt(pair) { return (global.L ? L(pair) : (isAr() ? pair.ar : pair.en)); }

  /* جملة واحدة للزرّ المعطَّل ولرفض التنفيذ معاً — لا شرحان مختلفان.
     🔴 اسم محمد زيدان على نصف المدير العام وحده: إجابته ١١ سبتمبر عن المدير
     العام؛ حساب الطوارئ قرار مسار الصلاحيات تبعاً لحكمَي ١٣ و٢٠ — لا نكتب
     باسمه ما لم يقله (ملاحظة الباحث عن الأخطاء، ١١ سبتمبر).
     ONE sentence for the disabled button AND the refused action.
     🔴 Mohamed Zidan's name sits on the GM half only: his 11 Sept answer is
     about the GM; the emergency account is the permissions lane's call,
     following rulings 13 and 20 — we never write in his name what he did
     not say (bug-reporter finding, 11 Sept). */
  function holdMessage() {
    var u = global.Auth && Auth.current && Auth.current();
    if (u && u.role === 'reviewer') {
      return txt({
        ar: 'طلب الخرسانة الجاهزة وإذن فحص المواد بتوقيع واحد بلا خطوة مراجعة — ' +
            'يعتمدهما مدير المشروع أو المكتب الفني فقط.',
        en: 'Ready-mix concrete requests and material inspection permits have one ' +
            'signature and no review step — they are approved only by the project ' +
            'manager or the technical office.'
      });
    }
    return txt({
      ar: 'يعتمد طلب الخرسانة الجاهزة وإذن فحص المواد مدير المشروع أو ' +
          'المكتب الفني فقط. المدير العام لا يعتمدهما (قرار محمد زيدان ' +
          '١١ سبتمبر ٢٠٢٦)، وحساب الطوارئ مثله.',
      en: 'Ready-mix concrete requests and material inspection permits are ' +
          'approved only by the project manager or the technical office. The ' +
          "general manager does not approve them (Mohamed Zidan's decision, " +
          '11 Sept 2026), and neither does the emergency account.'
    });
  }

  function heldFor(moduleId) {
    if (SHEETS.indexOf(moduleId) === -1) return false;
    var u = global.Auth && Auth.current && Auth.current();
    return !!u && HELD_ROLES.indexOf(u.role) !== -1;
  }

  function install() {
    if (!global.Auth || !global.Workflow || global.__sheetApprovalHoldInstalled) return;
    global.__sheetApprovalHoldInstalled = true;

    /* ═════ ١ · الطبقة الأولى — مصفوفة جديدة لكل شاشة ═════
       ⭐ filter() تُعيد مصفوفة جديدة دائماً — فلا يُمسّ أبداً المرجع '*'
       المشترك (gm يستعمله على كل شاشة أخرى، وbreakglass يشارك ALL مع أدوار
       أخرى، auth.js:148). لمسه كان سيسحب اعتماد المدير العام على mir
       والمشتريات وكل شيء — وهذا بالضبط ما تختبره حقنة «المصفوفة المشتركة».
       ⭐ filter() always returns a NEW array — the shared '*' reference is
       never touched (gm uses it on every other screen, and breakglass
       shares ALL with other roles, auth.js:148). Touching it would strip the
       GM's approve on mir, purchasing and everything else — exactly what
       the "shared array" injection in the trial proves. */
    HELD_ROLES.forEach(function (rk) {
      var r = Auth.ROLES && Auth.ROLES[rk];
      if (!r || !r.perms) return;
      SHEETS.forEach(function (m) {
        var cur = r.perms[m] || r.perms['*'] || [];
        r.perms[m] = cur.filter(function (a) { return a !== 'review' && a !== 'approve'; });
      });
    });

    /* ═════ ٢ · الشرح — بطاقة معطَّلة بدل شاشة صامتة ═════
       حيث كان سيظهر زرّ من الخمسة: «قيد الانتظار» (اعتماد التوقيع الواحد،
       إرجاع، رفض) · «مُراجَع» (اعتماد) · «معتمد» (عكس). أي زرّ من الخمسة
       وصل رغم الطبقة الأولى (صلاحية فردية مثلاً) يُحذف هنا.
       Where one of the five would have appeared: pending (one-step approve,
       return, reject) · reviewed (approve) · approved (reverse). Any of the
       five that still arrives despite layer one (a per-account override,
       say) is removed here. */
    var origActions = Workflow.actions;
    Workflow.actions = function (moduleId, rec) {
      var list = origActions.apply(Workflow, arguments) || [];
      if (!rec || !heldFor(moduleId)) return list;
      list = list.filter(function (a) { return HELD_ACTIONS.indexOf(a.key) === -1; });
      var st = rec.status || 'draft';
      if (st !== 'pending' && st !== 'reviewed' && st !== 'approved') return list;
      if (!list.some(function (a) { return a.key === '_sheetApprovalHold'; })) {
        list.push({ key: '_sheetApprovalHold', disabled: true, cls: 'btn-outline', label: holdMessage() });
      }
      return list;
    };

    /* ═════ ٣ · الحزام — رفض قبل أي نداء للخادم ═════ */
    var origTransition = Workflow.transition;
    Workflow.transition = async function (moduleId, id, action, reason) {
      if (HELD_ACTIONS.indexOf(action) !== -1 && heldFor(moduleId)) {
        return { ok: false, error: holdMessage() };
      }
      return origTransition.apply(Workflow, arguments);
    };

    console.info('sheet-approval-hold.js ready — the GM, the emergency account and the document reviewer no longer see buttons the database refuses on concrete requests or inspection permits.');
  }

  if (global.Auth && global.Workflow) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
