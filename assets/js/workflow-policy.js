/* =========================================================================
   workflow-policy.js — من يوقّع على ماذا · Who signs what
   -------------------------------------------------------------------------
   المشكلة التي يعالجها هذا الملف:

   كان ٢٨ شاشة من ٥١ تفرض السلسلة الكاملة: مسودة ← مراجعة ← اعتماد.
   هذا يعني أن كشف عمالة يومياً يحتاج مراجعاً ومعتمداً، وأن تقرير سلامة
   لا يُسجَّل إلا بتوقيعين. شركة بثلاثين موظفاً لا تستطيع تشغيل هذا.
   النتيجة الحتمية: يعتمد الناس بالجملة دون قراءة، فتفقد الرقابة معناها
   تماماً — وهي أخطر من عدم وجود رقابة أصلاً، لأنها تعطي إحساساً زائفاً
   بالأمان.

   THE PROBLEM THIS FILE SOLVES

   28 of 51 screens demanded draft → review → approve. That means a daily
   labour sheet needs two signatures, and a safety observation cannot be
   recorded without a reviewer. A company of thirty people cannot run that.
   What actually happens is bulk-approving without reading, which is worse
   than no control at all because it looks like control.

   -------------------------------------------------------------------------
   THE THREE LEVELS · المستويات الثلاثة

   0 · RECORD      يُحفظ مباشرة — تسجيل واقعة، لا قرار ولا مال
                   Saved directly. A record of fact. No money, no decision.
                   Still fully audited: who wrote it and when.

   1 · APPROVE     خطوة واحدة: يُقدَّم ثم يعتمده المسؤول
                   One step: submit, then the responsible manager approves.
                   No separate reviewer.

   2 · FULL        مسودة ← مراجعة ← اعتماد — للمال الحقيقي فقط
                   The full chain. Reserved for real money and anything
                   that cannot be undone.

   -------------------------------------------------------------------------
   ⭐ عدّل الجدول أدناه بعد اجتماعات الأقسام. غيّر الرقم فقط.
      Edit the table below after your department meetings. Change only the
      number. Nothing else in the system needs to change.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('workflow-policy.js needs schema.js first'); return; }

  var RECORD = 0, APPROVE = 1, FULL = 2;

  var POLICY = {

    /* ══ ٢ · السلسلة الكاملة — مال حقيقي لا يمكن التراجع عنه ══════════
       Only these. Every one of them moves money or fixes a number that
       the company will later be paid or charged against. */
    journal:           FULL,   /* قيود اليومية — تغيّر الدفاتر مباشرة */
    supplierInvoices:  FULL,   /* فواتير الموردين — التزام مالي */
    payments:          FULL,   /* سندات الصرف — خروج نقدية فعلي */
    receipts:          FULL,   /* سندات القبض — دخول نقدية فعلي */
    clientIPCs:        FULL,   /* مستخلصات العملاء — ما ستتقاضاه الشركة */
    subIPCs:           FULL,   /* مستخلصات مقاولي الباطن — ما ستدفعه */
    payroll:           FULL,   /* مسير الرواتب */
    budgets:           FULL,   /* الموازنات — سقف الإنفاق */
    stockCounts:       FULL,   /* الجرد والتسويات — يغيّر قيمة المخزون */

    /* ══ ١ · اعتماد واحد — قرار له أثر، بلا مراجع منفصل ═════════════ */
    purchaseApprovals: APPROVE, /* اعتماد الشراء — قرار الإنفاق */
    goodsReceipts:     APPROVE, /* الاستلام — يزيد المخزون */
    stockIssues:       APPROVE, /* الصرف — ينقص المخزون ويحمّل التكلفة */
    stockTransfers:    APPROVE, /* التحويل — لا بد من إثبات الاستلام */
    leaves:            APPROVE, /* الإجازات — يعتمدها المدير المباشر */
    ncr:               APPROVE, /* عدم المطابقة — يقرر من يتحمّل التكلفة */
    siteInstructions:  APPROVE, /* تعليمات الموقع — قد تحمل تكلفة */
    submittals:        APPROVE, /* الاعتمادات — تمنع الشراء قبل الموافقة */
    wir:               APPROVE, /* فحص الأعمال — يوقّعه مدير المشروع */
    pourCards:         APPROVE, /* إذن الصب — لا صب بلا توقيع */
    mir:               APPROVE, /* فحص المواد — يمنع دخول مادة مرفوضة */

    /* ══ الموارد البشرية — أضيفت بعد اجتماع القسم ١٥ أغسطس ٢٠٢٦ ══════ */
    employeeAdvances:  APPROVE, /* سلفة = نقدية تخرج. اعتماد واحد يكفي */
    dailyLabour:       APPROVE, /* صرف نقدي للعمالة اليومية */
    siteAttendance:    RECORD,  /* كشف حضور — تسجيل واقعة لا قرار */
    employeeDocs:      RECORD,  /* قائمة تحقق مستندات */
    employmentContracts: RECORD, /* عقد العمل مستند تُمسكه الموارد البشرية */

    /* ══ ٠ · تسجيل مباشر — واقعة تُوثَّق، لا قرار يُتخذ ══════════════
       These are records, not decisions. Forcing signatures here is what
       made the portal unusable. They remain fully audited — the system
       always stores who wrote it and when, and approved records still
       cannot be quietly edited. */
    asphaltRecords:    RECORD,  /* سجل يومي لما نُفّذ */
    surveyRecords:     RECORD,  /* قياس، لا قرار */
    labourAllocation:  RECORD,  /* من عمل أين اليوم */
    safetyReports:     RECORD,  /* ملاحظة سلامة — تسجيلها فوراً أهم من توقيعها */
    siteReports:       RECORD,  /* التقرير اليومي */
    docRegister:       RECORD,  /* سجل المستندات */
    transmittals:      RECORD,  /* مذكرة إرسال — إثبات، لا قرار */
    correspondence:    RECORD,  /* المراسلات */
    rfi:               RECORD,  /* طلب معلومات — تأخيره يضر أكثر من نفعه */
    equipmentLogs:     RECORD,
    attendance:        RECORD,
    itTickets:         RECORD,
    drawings:          RECORD
  };

  /* ═══════════════════════════════════════════════════════════════════
     التطبيق — APPLYING THE POLICY
     ═══════════════════════════════════════════════════════════════════ */
  var applied = { record: [], approve: [], full: [], untouched: [] };

  (Schema.MODULES || []).forEach(function (m) {
    var level = POLICY[m.id];

    if (level === undefined) {
      if (m.workflow) applied.untouched.push(m.id);
      return;
    }

    if (level === RECORD) {
      m.workflow = false;
      m.skipReview = false;

      /* عمود "status" بلا حقل status حقيقي = شاشة فارغة عند أول سجل.
         عندما تُخفَّض شاشة إلى RECORD (لا قرار، لا اعتماد)، قد يبقى اسم
         "status" في m.columns من أيام كان لها سير عمل — لكن لا حقل status
         حقيقي يفسّر قيمته (لا في m.fields ولا في m.lines.fields، مثل
         siteAttendance التي تستخدم "attStatus" داخل السطور بدلاً منه).
         النتيجة: colField(mod, 'status') يرجع null، ثم
         Schema.optionLabel(null, ...) في schema.js:1258 ينفّذ "f.options"
         على null فينهار — شاشة بيضاء عند أول سجل محفوظ، وانهيار مطابق عند
         تصدير CSV في entity.js:279. نحذف اسم العمود هنا بدلاً من إضافة حقل
         status وهمي، لأن شاشة تسجيل واقعة لا تملك "حالة اعتماد" أصلاً —
         وإعادة قائمة اختيار لحالة تُحدَّث يدوياً تُعيد فتح خلل السجل رقم ٨
         في تاريخ المشروع (تعارض بين حالة معروضة وحالة حقيقية).
         هذا يسري تلقائياً على أي شاشة تُخفَّض مستقبلاً، لا على siteAttendance
         باسمها — docRegister وemploymentContracts تملكان حقل status حقيقياً
         فتُستثنيان بحكم الشرط نفسه.

         A "status" column with no real status field crashes on the first
         record. When a screen is demoted to RECORD (no decision, no
         approval), the name "status" can survive in m.columns from a time
         it had a workflow — but no real status field explains its value
         (not in m.fields, not in m.lines.fields; siteAttendance uses
         "attStatus" inside its lines instead). Result: colField(mod,
         'status') returns null, then Schema.optionLabel(null, ...) at
         schema.js:1258 runs "f.options" on null and throws — a blank
         screen on the first saved record, and the same crash exporting
         CSV at entity.js:279. We remove the column name here instead of
         adding a dummy status field, because a record-of-fact screen has
         no approval state to show — re-adding a manually-set dropdown
         would reopen history bug #8 (a displayed status disagreeing with
         the real one). This is generic for any future demotion, not
         siteAttendance by name — docRegister and employmentContracts keep
         a real status field, so this same condition leaves them alone. */
      if (m.columns && m.columns.indexOf('status') !== -1) {
        var hasStatusField =
          (m.fields || []).some(function (f) { return f.name === 'status'; }) ||
          (m.lines && m.lines.fields || []).some(function (f) { return f.name === 'status'; });
        if (!hasStatusField) {
          m.columns = m.columns.filter(function (c) { return c !== 'status'; });
        }
      }

      applied.record.push(m.id);
    } else if (level === APPROVE) {
      m.workflow = true;
      m.skipReview = true;      /* submit goes straight to "awaiting approval" */
      applied.approve.push(m.id);
    } else {
      m.workflow = true;
      m.skipReview = false;
      applied.full.push(m.id);
    }
    m.policyLevel = level;
  });

  /* Workflow.transition must honour skipReview, otherwise a one-step
     document would still sit waiting for a reviewer who does not exist.
     We wrap it rather than editing workflow.js. */
  function patchWorkflow() {
    if (!global.Workflow || Workflow.__policyPatched) return;

    var origActions = Workflow.actions;
    if (typeof origActions === 'function') {
      Workflow.actions = function (moduleId, rec) {
        var list = origActions.apply(Workflow, arguments) || [];
        var mod = Schema.get(moduleId);
        if (!mod || !mod.skipReview) return list;
        /* Hide the review step entirely on one-step documents. */
        return list.filter(function (a) { return a.key !== 'review'; });
      };
    }

    var origTransition = Workflow.transition;
    if (typeof origTransition === 'function') {
      Workflow.transition = async function (moduleId, id, action, reason) {
        var mod = Schema.get(moduleId);
        if (mod && mod.skipReview && action === 'submit') {
          /* Move it to "reviewed" so the approver can act immediately,
             instead of leaving it stranded at "pending" with nobody
             entitled to push it forward. */
          var first = await origTransition.apply(Workflow, [moduleId, id, 'submit', reason]);
          if (!first || !first.ok) return first;
          try {
            var auto = await origTransition.apply(Workflow, [moduleId, id, 'review',
              (global.I18N && I18N.getLang && I18N.getLang() === 'en')
                ? 'One-step document: review not required by company policy.'
                : 'مستند بخطوة واحدة: المراجعة غير مطلوبة حسب سياسة الشركة.']);
            return auto && auto.ok ? auto : first;
          } catch (e) { return first; }
        }
        return origTransition.apply(Workflow, arguments);
      };
    }

    Workflow.__policyPatched = true;
  }

  if (global.Workflow) patchWorkflow();
  else document.addEventListener('DOMContentLoaded', patchWorkflow);

  global.WorkflowPolicy = {
    POLICY: POLICY, applied: applied,
    LEVELS: { RECORD: RECORD, APPROVE: APPROVE, FULL: FULL },
    levelOf: function (id) { return POLICY[id]; }
  };

  console.info('workflow-policy.js: ' + applied.full.length + ' screens need the full chain, ' +
    applied.approve.length + ' need one approval, ' + applied.record.length +
    ' save directly. (was 28 full-chain screens)');
})(window);
