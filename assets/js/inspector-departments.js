/* =========================================================================
   inspector-departments.js
   فحوصات المفتّش للقسمين الجديدين — الموقع وضبط المستندات
   Inspector checks for the two new departments — Site and Document Control
   -------------------------------------------------------------------------
   ٢٨ فحصاً إضافياً. كل فحص يبحث عن خطأ حقيقي يكلّف الشركة مالاً أو حقاً.
   28 additional checks. Each one looks for a real mistake that costs the
   company money or a legal right.

   يُحمَّل بعد inspector.js.  Load AFTER inspector.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Inspector) { console.error('inspector-departments.js needs inspector.js first'); return; }

  var I = global.Inspector;
  var CHECKS = I.CHECKS;

  /* ── نفس المساعدات المستخدمة في inspector.js ── */
  function all(t) { return (global.Store && Store.all(t)) || []; }
  function approved(t) { return all(t).filter(function (r) { return r.status === 'approved'; }); }
  function live(t) { return all(t).filter(function (r) { return r.status !== 'reversed' && r.status !== 'void'; }); }
  function num(v) { return Number(v) || 0; }
  function days(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
  function since(d) { return d ? days(new Date(), d) : 0; }
  function until(d) { return d ? days(d, new Date()) : null; }
  function name(table, id) { var r = global.Store && Store.find(table, id); return r ? (r.name || r.docNo || r.title || '') : ''; }
  function norm(x) { return String(x || '').replace(/[\sً-ْ]/g, '').toLowerCase(); }

  function F(sev, area, module, recId, title, evidence, action) {
    return { severity: sev, area: area, module: module, recordId: recId,
             title: title, evidence: evidence, action: action };
  }

  /* حدود قابلة للتعديل — عدّلها بعد اجتماعات الأقسام
     Tolerances — adjust these after the department meetings */
  var TOL = {
    minCompaction:      95,    /* أقل نسبة دمك مقبولة % */
    minMixTemp:         140,   /* أقل حرارة خلطة عند التوريد °م */
    minLayTemp:         120,   /* أقل حرارة عند الفرد °م */
    cubesPerVolume:     50,    /* مكعب اختبار لكل كم متر مكعب */
    ncrOverdueDays:     0,     /* بعد تاريخ الإغلاق المستهدف */
    incidentCloseDays:  14,

    /* ══ CORRECTED after the DC meeting, 15 August 2026 ══════════════
       أ. أحمد عبد الحي، المسؤول الإداري

       I had set these from ordinary international practice: a reply
       expected in 7 days, a transmittal acknowledged in 7 days, a
       contractual notice window of 28 days.

       His actual answers:
         · مدة الرد على طلب المعلومات: «٥-٦ شهور»
         · مدة الرد على الاعتماد: «١ - ٣٠» يوم حسب النوع
         · خطابات لها مدة قانونية يسقط الحق بعدها: «لأ يوجد»
         · التنبيه المطلوب قبل الموعد: «اسبوع»

       Left as they were, the assistant would have raised a red alert on
       every single RFI within a week of sending it, for a body that
       genuinely takes five months to answer. Two hundred false alarms in
       the first month, and nobody would ever trust it again.

       كانت الحدود مضبوطة على الممارسة الدولية المعتادة. إجاباته تقول إن
       الرد يستغرق خمسة إلى ستة شهور فعلياً. لو تُركت كما هي لأطلق النظام
       إنذاراً أحمر على كل طلب بعد أسبوع، ولفقد الناس الثقة فيه من أول شهر.
       ══════════════════════════════════════════════════════════════ */
    transmittalAckDays: 21,    /* كان ٧ — الورق يتحرك ببطء بين الجهات */
    noticeWarnDays:     7,     /* «اسبوع» — بكلماته */
    borrowReturnDays:   30,
    rfiClaimDays:       150,   /* كان ٧ — «٥-٦ شهور» هي المدة الفعلية */
    rfiOverdueDays:     180,   /* لا إنذار قبل ستة شهور */
    submittalOverdueDays: 30   /* «١ - ٣٠» حسب نوع الاعتماد */
  };
  I.TOL_DEPT = TOL;

  /* ═══════════════════════════════════════════════════════════════════
     أ — الموقع والتنفيذ · SITE & EXECUTION
     ═══════════════════════════════════════════════════════════════════ */

  /* ١ · صب خرسانة بدون اعتماد النجارة أو الحدادة أو المناسيب */
  CHECKS.pourWithoutApprovals = function () {
    var out = [];
    approved('pourCards').forEach(function (p) {
      var missing = [];
      if (!p.formworkOk) missing.push('النجارة');
      if (!p.steelOk)    missing.push('الحدادة');
      if (!p.levelsOk)   missing.push('المناسيب');
      if (!missing.length) return;
      out.push(F('critical', 'site', 'pourCards', p.id,
        'صب معتمد بدون اعتماد ' + missing.join(' و'),
        'إذن الصب ' + (p.docNo || '') + ' — ' + (p.element || '') + ' — ' + num(p.volume) + ' م٣',
        'أوقف الصب فوراً إن لم يبدأ. إن تم الصب، افتح تقرير عدم مطابقة وسجّل من اعتمد الإذن.'));
    });
    return out;
  };

  /* ٢ · صب بدون طلب فحص أعمال مرتبط */
  CHECKS.pourWithoutWIR = function () {
    var out = [];
    approved('pourCards').forEach(function (p) {
      if (p.wirRef) return;
      out.push(F('high', 'site', 'pourCards', p.id,
        'إذن صب بلا طلب فحص أعمال مرتبط',
        'إذن الصب ' + (p.docNo || '') + ' — ' + (p.element || ''),
        'اربط الإذن بطلب الفحص المعتمد. بدونه لا يوجد إثبات أن الاستشاري عاين قبل الصب.'));
    });
    return out;
  };

  /* ٣ · عدد مكعبات الاختبار أقل من المطلوب */
  CHECKS.pourNoCubes = function () {
    var out = [];
    approved('pourCards').forEach(function (p) {
      var vol = num(p.volume);
      if (vol <= 0) return;
      var expected = Math.max(1, Math.ceil(vol / TOL.cubesPerVolume));
      var taken = num(p.cubesTaken);
      if (taken >= expected) return;
      out.push(F(taken === 0 ? 'high' : 'medium', 'site', 'pourCards', p.id,
        'عدد مكعبات الاختبار أقل من المطلوب',
        'صبة ' + vol + ' م٣ — المأخوذ ' + taken + ' والمطلوب ' + expected,
        'لا يمكن إثبات رتبة الخرسانة لاحقاً. راجع مع مهندس الجودة قبل إغلاق البند.'));
    });
    return out;
  };

  /* ٤ · نسبة دمك أقل من الحد المسموح */
  CHECKS.asphaltUnderCompaction = function () {
    var out = [];
    live('asphaltRecords').forEach(function (a) {
      var c = num(a.compaction);
      if (!c || c >= TOL.minCompaction) return;
      out.push(F('critical', 'site', 'asphaltRecords', a.id,
        'نسبة الدمك أقل من الحد المسموح',
        'السجل ' + (a.docNo || '') + ' — الدمك ' + c + '٪ والحد ' + TOL.minCompaction + '٪ — ' +
        'من ' + (a.chainageFrom || '?') + ' إلى ' + (a.chainageTo || '?'),
        'الطبقة معرّضة للرفض. أبلغ مدير المشروع قبل تنفيذ الطبقة التالية فوقها.'));
    });
    return out;
  };

  /* ٥ · حرارة الخلطة خارج الحدود */
  CHECKS.asphaltTempOutOfRange = function () {
    var out = [];
    live('asphaltRecords').forEach(function (a) {
      var problems = [];
      if (a.mixTemp && num(a.mixTemp) < TOL.minMixTemp)
        problems.push('حرارة التوريد ' + num(a.mixTemp) + '° والحد ' + TOL.minMixTemp + '°');
      if (a.layTemp && num(a.layTemp) < TOL.minLayTemp)
        problems.push('حرارة الفرد ' + num(a.layTemp) + '° والحد ' + TOL.minLayTemp + '°');
      if (!problems.length) return;
      out.push(F('high', 'site', 'asphaltRecords', a.id,
        'حرارة الخلطة أقل من المسموح',
        (a.docNo || '') + ' — ' + problems.join(' · '),
        'الخلطة الباردة لا تُدمك جيداً. وثّق الحالة وأبلغ المصنع، وتوقّع رفض القطاع.'));
    });
    return out;
  };

  /* ٦ · طلب فحص مرفوض بلا إعادة عمل موثّقة */
  CHECKS.wirRejectedNotReworked = function () {
    var out = [];
    var records = live('wir');
    records.forEach(function (w) {
      if (w.result !== 'rejected' && !w.reworkRequired) return;
      /* هل يوجد طلب فحص لاحق لنفس القطاع وتم قبوله؟ */
      var fixed = records.some(function (o) {
        return o.id !== w.id && o.project === w.project &&
               norm(o.chainageFrom) === norm(w.chainageFrom) &&
               norm(o.chainageTo) === norm(w.chainageTo) &&
               new Date(o.date) > new Date(w.date) &&
               (o.result === 'approved' || o.result === 'cond');
      });
      if (fixed) return;
      out.push(F('high', 'site', 'wir', w.id,
        'عمل مرفوض ولا يوجد فحص لاحق يثبت إصلاحه',
        (w.docNo || '') + ' — ' + (w.workItem || '') + ' — مرفوض منذ ' + since(w.date) + ' يوماً',
        'نفّذ إعادة العمل وقدّم طلب فحص جديد لنفس القطاع، وإلا سيظهر العيب في الاستلام النهائي.'));
    });
    return out;
  };

  /* ٧ · مادة مرفوضة دخلت المخزن — من أخطر الفحوص */
  CHECKS.mirRejectedButReceived = function () {
    var out = [];
    live('mir').forEach(function (m) {
      if (m.result !== 'rejected') return;
      if (!m.goodsReceipt) return;
      var grn = global.Store && Store.find('goodsReceipts', m.goodsReceipt);
      if (!grn || grn.status !== 'approved') return;
      var accepted = (grn.lines || []).reduce(function (s, l) { return s + num(l.qtyAccepted); }, 0);
      if (accepted <= 0) return;
      out.push(F('critical', 'site', 'mir', m.id,
        'مادة مرفوضة فنياً ومع ذلك أُدخلت للمخزن',
        'طلب الفحص ' + (m.docNo || '') + ' مرفوض · إذن الاستلام ' + (grn.docNo || '') +
        ' أدخل ' + accepted + ' وحدة',
        'أوقف صرف هذه المادة فوراً. اعكس إذن الاستلام أو سجّل مرتجع للمورد قبل استخدامها في التنفيذ.'));
    });
    return out;
  };

  /* ٨ · تقرير عدم مطابقة تجاوز موعد إغلاقه */
  CHECKS.ncrOverdue = function () {
    var out = [];
    live('ncr').forEach(function (n) {
      if (n.closed) return;
      if (!n.targetCloseDate) return;
      var late = since(n.targetCloseDate);
      if (late <= TOL.ncrOverdueDays) return;
      out.push(F(n.severity === 'critical' ? 'critical' : 'high', 'site', 'ncr', n.id,
        'تقرير عدم مطابقة متأخر عن موعد إغلاقه',
        (n.docNo || '') + ' — متأخر ' + late + ' يوماً — ' + (n.description || '').slice(0, 60),
        'أغلق التقرير أو مدّد الموعد بسبب مكتوب. التقارير المفتوحة تُستخدم ضدك في الاستلام.'));
    });
    return out;
  };

  /* ٩ · خطأ مقاول باطن ولم يُخصم من مستخلصه */
  CHECKS.ncrBackChargeMissing = function () {
    var out = [];
    live('ncr').forEach(function (n) {
      if (n.responsibleParty !== 'subcon') return;
      if (num(n.reworkCost) <= 0) return;
      if (n.backChargeSub) return;
      out.push(F('high', 'site', 'ncr', n.id,
        'تكلفة إعادة عمل بسبب مقاول باطن ولم تُخصم منه',
        (n.docNo || '') + ' — التكلفة ' + num(n.reworkCost).toLocaleString('ar-EG') + ' ج · ' +
        'المقاول ' + (name('subcontractors', n.subcontractor) || '—'),
        'فعّل الخصم من مستخلص المقاول قبل اعتماد المستخلص القادم، وإلا تتحمّلها الشركة.'));
    });
    return out;
  };

  /* ١٠ · عمل إضافي بلا أمر تغيير — الشركة تعمل مجاناً */
  CHECKS.siteInstructionNoVariation = function () {
    var out = [];
    live('siteInstructions').forEach(function (s) {
      if (!s.costImpact && !s.timeImpact) return;
      if (s.variationRaised) return;
      var bits = [];
      if (s.costImpact) bits.push('تكلفة ' + num(s.estimatedCost).toLocaleString('ar-EG') + ' ج');
      if (s.timeImpact) bits.push(num(s.daysImpact) + ' يوم تأخير');
      out.push(F('critical', 'site', 'siteInstructions', s.id,
        'تعليمات لها أثر مالي أو زمني بلا أمر تغيير',
        (s.docNo || '') + ' من ' + (s.issuedBy || '') + ' — ' + bits.join(' · ') +
        ' — منذ ' + since(s.date) + ' يوماً',
        'أصدر أمر تغيير واحصل على توقيعه قبل التنفيذ. بدونه الشركة تنفّذ بلا مقابل.'));
    });
    return out;
  };

  /* ١١ · عمالة بلا بند تكلفة — التكلفة تضيع من المشروع */
  CHECKS.labourNoCostItem = function () {
    var out = [];
    approved('labourAllocation').forEach(function (l) {
      if (l.costItem) return;
      var men = (l.lines || []).reduce(function (s, x) { return s + (num(x.count) || 1); }, 0);
      out.push(F('medium', 'site', 'labourAllocation', l.id,
        'كشف عمالة بلا بند تكلفة',
        (l.docNo || '') + ' — ' + men + ' عامل — مشروع ' + (name('projects', l.project) || '—'),
        'حدّد بند التكلفة، وإلا لن تظهر تكلفة العمالة في تقرير ربحية المشروع.'));
    });
    return out;
  };

  /* ١٢ · مناسيب خارج حدود السماح بلا تقرير عدم مطابقة */
  CHECKS.surveyOutOfTolerance = function () {
    var out = [];
    var ncrs = live('ncr');
    live('surveyRecords').forEach(function (s) {
      if (s.withinTolerance !== false) return;
      var covered = ncrs.some(function (n) {
        return n.project === s.project && Math.abs(days(n.date, s.date)) <= 7;
      });
      if (covered) return;
      out.push(F('high', 'site', 'surveyRecords', s.id,
        'منسوب خارج حدود السماح ولا يوجد تقرير عدم مطابقة',
        (s.docNo || '') + ' — الفرق ' + num(s.deviation) + ' سم — ' +
        (s.chainageFrom || '') + ' إلى ' + (s.chainageTo || ''),
        'افتح تقرير عدم مطابقة وقرّر: تصحيح أم قبول بموافقة الاستشاري كتابةً.'));
    });
    return out;
  };

  /* ١٣ · إصابة أو حادث جسيم لم يُغلق */
  CHECKS.safetyIncidentNotClosed = function () {
    var out = [];
    live('safetyReports').forEach(function (s) {
      if (s.closed) return;
      var serious = ['injury', 'firstaid', 'damage'].indexOf(s.kind) !== -1 ||
                    s.severity === 'critical' || s.severity === 'major';
      if (!serious) return;
      var age = since(s.date);
      if (age < TOL.incidentCloseDays) return;
      out.push(F(s.kind === 'injury' ? 'critical' : 'high', 'site', 'safetyReports', s.id,
        'حادث لم يُغلق منذ ' + age + ' يوماً',
        (s.docNo || '') + ' — ' + (s.description || '').slice(0, 70),
        'أكمل الإجراء التصحيحي وأغلق التقرير. الحوادث المفتوحة مسؤولية قانونية على الشركة.'));
    });
    return out;
  };

  /* ١٤ · صرف مواد للموقع بلا توقيع مستلم */
  CHECKS.siteIssueNoReceiver = function () {
    var out = [];
    approved('stockIssues').forEach(function (s) {
      if (s.receivedBy || s.handedTo) return;
      out.push(F('medium', 'site', 'stockIssues', s.id,
        'صرف مواد بلا اسم مستلم',
        (s.docNo || '') + ' — ' + (name('projects', s.project) || ''),
        'لا يوجد من يُسأل عن هذه المواد. سجّل اسم المستلم وتوقيعه.'));
    });
    return out;
  };

  /* ═══════════════════════════════════════════════════════════════════
     ب — ضبط المستندات · DOCUMENT CONTROL
     ═══════════════════════════════════════════════════════════════════ */

  /* ١٥ · أخطر فحص في القسم كله: نسخة ملغاة ما زالت في الموقع */
  CHECKS.supersededNotRecalled = function () {
    var out = [];
    live('docRegister').forEach(function (d) {
      if (d.status !== 'superseded') return;
      if (!d.issuedToSite) return;
      if (d.oldCopyRecalled) return;
      out.push(F('critical', 'dc', 'docRegister', d.id,
        'نسخة ملغاة ما زالت في الموقع ولم تُسحب',
        (d.docCode || '') + ' — ' + (d.title || '') + ' — المراجعة ' + (d.revision || '') +
        ' — أُلغيت بـ ' + (d.supersededBy || 'مراجعة أحدث'),
        'اسحب النسخة الورقية من الموقع اليوم وخذ توقيع الاستلام. التنفيذ برسمة ملغاة يعني هدم وإعادة بناء.'));
    });
    return out;
  };

  /* ١٦ · عمل نُفّذ برسمة أصبحت ملغاة */
  CHECKS.workOnSupersededDrawing = function () {
    var out = [];
    var docs = live('docRegister');
    function findDoc(ref) {
      var k = norm(ref);
      if (!k) return null;
      return docs.filter(function (d) {
        var code = norm(d.docCode);
        return code && (k.indexOf(code) !== -1 || code.indexOf(k) !== -1);
      })[0] || null;
    }
    live('wir').forEach(function (w) {
      if (!w.drawingRef) return;
      var d = findDoc(w.drawingRef);
      if (!d || d.status !== 'superseded') return;
      if (d.revisionDate && new Date(w.date) < new Date(d.revisionDate)) return;
      out.push(F('critical', 'dc', 'wir', w.id,
        'عمل نُفّذ برسمة ملغاة',
        'طلب الفحص ' + (w.docNo || '') + ' يشير إلى ' + w.drawingRef +
        ' وهي ملغاة — ' + (w.workItem || ''),
        'راجع العمل المنفّذ فوراً مقابل المراجعة الحالية. أبلغ مدير المشروع اليوم.'));
    });
    return out;
  };

  /* ١٧ · مستند صدر للتنفيذ وهو غير معتمد */
  CHECKS.docIssuedWithoutApproval = function () {
    var out = [];
    live('docRegister').forEach(function (d) {
      if (!d.issuedToSite) return;
      if (d.status === 'issued') return;
      if (d.status === 'superseded' || d.status === 'void') return;
      out.push(F('high', 'dc', 'docRegister', d.id,
        'مستند صدر للموقع وحالته ليست «صادر للتنفيذ»',
        (d.docCode || '') + ' — الحالة الحالية: ' + (d.status || ''),
        'إما تعتمده رسمياً وتغيّر حالته، أو تسحبه من الموقع. الوضع الحالي مسؤولية بلا غطاء.'));
    });
    return out;
  };

  /* ١٨ · طلب معلومات تجاوز موعد الرد */
  CHECKS.rfiOverdue = function () {
    var out = [];
    live('rfi').forEach(function (r) {
      if (r.closed || r.replyDate) return;
      if (!r.replyDue) return;
      var late = since(r.replyDue);
      /* The consulting body genuinely takes five to six months. Only flag
         once it passes even that, or the screen becomes noise. */
      if (late <= TOL.rfiOverdueDays) return;
      out.push(F(r.workStopped ? 'critical' : (r.priority === 'block' ? 'critical' : 'high'),
        'dc', 'rfi', r.id,
        'طلب معلومات بلا رد منذ ' + late + ' يوماً بعد الموعد',
        (r.docNo || '') + ' — ' + (r.subject || '') + ' — موجّه إلى ' + (r.toParty || ''),
        'أرسل تذكيراً مكتوباً اليوم ووثّق التأخير. هذه الأيام أساس مطالبة تمديد المدة.'));
    });
    return out;
  };

  /* ١٩ · تأخير رد أوقف العمل ولم تُقدَّم مطالبة — مال متروك */
  CHECKS.rfiDelayNoClaim = function () {
    var out = [];
    live('rfi').forEach(function (r) {
      if (r.claimRaised) return;
      if (!r.workStopped && !r.costImpact) return;
      var delay = num(r.daysDelayed) || (r.replyDue ? Math.max(0, since(r.replyDue)) : 0);
      if (delay < TOL.rfiClaimDays) return;
      out.push(F('high', 'dc', 'rfi', r.id,
        'تأخير رد أثّر على العمل ولم تُقدَّم مطالبة',
        (r.docNo || '') + ' — تأخير ' + delay + ' يوماً' + (r.workStopped ? ' مع توقف العمل' : ''),
        'جهّز مطالبة تمديد مدة مدعّمة بتواريخ الطلب والرد قبل أن تسقط المدة التعاقدية.'));
    });
    return out;
  };

  /* ٢٠ · شراء مادة قبل اعتمادها */
  CHECKS.purchaseBeforeSubmittal = function () {
    var out = [];
    var subs = live('submittals');
    approved('purchaseApprovals').forEach(function (pa) {
      (pa.lines || []).forEach(function (l) {
        var itemName = norm(name('items', l.item) || l.item);
        if (!itemName) return;
        var match = subs.filter(function (s) {
          var sn = norm(name('items', s.item) || s.title);
          return sn && (sn.indexOf(itemName) !== -1 || itemName.indexOf(sn) !== -1);
        })[0];
        if (!match) return;
        if (match.result === 'approved' || match.result === 'cond') {
          if (!match.replyDate || new Date(pa.date) >= new Date(match.replyDate)) return;
        }
        out.push(F('critical', 'dc', 'purchaseApprovals', pa.id,
          'اعتماد شراء لمادة غير معتمدة من الاستشاري',
          'اعتماد الشراء ' + (pa.docNo || '') + ' — المادة ' + (name('items', l.item) || l.item) +
          ' — حالة الاعتماد: ' + (match.result || 'قيد المراجعة'),
          'أوقف الشراء حتى صدور الاعتماد. المادة غير المعتمدة تُرفض في الموقع وتُخصم من المستخلص.'));
      });
    });
    return out;
  };

  /* ٢١ · اعتماد انتهت صلاحيته */
  CHECKS.submittalExpired = function () {
    var out = [];
    live('submittals').forEach(function (s) {
      if (!s.validUntil) return;
      if (s.result !== 'approved' && s.result !== 'cond') return;
      var over = since(s.validUntil);
      if (over <= 0) return;
      out.push(F('high', 'dc', 'submittals', s.id,
        'اعتماد انتهت صلاحيته منذ ' + over + ' يوماً',
        (s.docNo || '') + ' — ' + (s.title || ''),
        'جدّد الاعتماد قبل توريد أي كمية جديدة من هذه المادة.'));
    });
    return out;
  };

  /* ٢٢ · اعتماد معلّق بلا متابعة */
  CHECKS.submittalPending = function () {
    var out = [];
    live('submittals').forEach(function (s) {
      if (s.result !== 'pending') return;
      if (!s.replyDue) return;
      var late = since(s.replyDue);
      if (late <= TOL.submittalOverdueDays) return;
      out.push(F('medium', 'dc', 'submittals', s.id,
        'اعتماد معلّق متأخر ' + late + ' يوماً',
        (s.docNo || '') + ' — ' + (s.title || ''),
        'تابع مع الاستشاري كتابةً ووثّق التأخير.'));
    });
    return out;
  };

  /* ٢٣ · مذكرة إرسال بلا إثبات استلام */
  CHECKS.transmittalNoAck = function () {
    var out = [];
    live('transmittals').forEach(function (t) {
      if (t.direction !== 'out') return;
      if (t.acknowledged) return;
      var age = since(t.date);
      if (age < TOL.transmittalAckDays) return;
      out.push(F('high', 'dc', 'transmittals', t.id,
        'مستند أُرسل بلا إثبات استلام منذ ' + age + ' يوماً',
        (t.docNo || '') + ' إلى ' + (t.party || '') + ' — ' + (t.subject || ''),
        'احصل على توقيع أو ختم وارد. بلا إثبات، يستطيع الطرف الآخر إنكار الاستلام في أي نزاع.'));
    });
    return out;
  };

  /* ٢٤ · إخطار تعاقدي يقترب موعده — تنبيه مبكر */
  CHECKS.noticeDeadlineNear = function () {
    var out = [];
    live('correspondence').forEach(function (c) {
      if (!c.contractualNotice || !c.noticeDeadline || c.replied) return;
      var left = until(c.noticeDeadline);
      if (left === null || left < 0 || left > TOL.noticeWarnDays) return;
      out.push(F('critical', 'dc', 'correspondence', c.id,
        'إخطار تعاقدي يجب إرساله خلال ' + left + ' يوم',
        (c.docNo || '') + ' — ' + (c.subject || '') + ' — الجهة ' + (c.party || ''),
        'أرسل الإخطار قبل الموعد. تجاوز المدة يُسقط حق الشركة في المطالبة نهائياً.'));
    });
    return out;
  };

  /* ٢٥ · إخطار تعاقدي فات موعده */
  CHECKS.noticeDeadlineMissed = function () {
    var out = [];
    live('correspondence').forEach(function (c) {
      if (!c.contractualNotice || !c.noticeDeadline || c.replied) return;
      var over = since(c.noticeDeadline);
      if (over <= 0) return;
      out.push(F('critical', 'dc', 'correspondence', c.id,
        'فات موعد إخطار تعاقدي منذ ' + over + ' يوماً',
        (c.docNo || '') + ' — ' + (c.subject || ''),
        'أبلغ الشؤون القانونية والإدارة اليوم. قد يكون الحق قد سقط — وقد يوجد استثناء تعاقدي يُنقذه.'));
    });
    return out;
  };

  /* ٢٦ · خطاب وارد بلا رد */
  CHECKS.correspondenceNoReply = function () {
    var out = [];
    live('correspondence').forEach(function (c) {
      if (c.direction !== 'in' || c.replied || !c.replyDue) return;
      var late = since(c.replyDue);
      if (late <= 0) return;
      out.push(F(c.category === 'claim' || c.category === 'delay' ? 'high' : 'medium',
        'dc', 'correspondence', c.id,
        'خطاب وارد بلا رد منذ ' + late + ' يوماً بعد الموعد',
        (c.docNo || '') + ' من ' + (c.party || '') + ' — ' + (c.subject || ''),
        'الصمت يُفسَّر أحياناً كقبول. ردّ كتابةً ولو بتحفّظ.'));
    });
    return out;
  };

  /* ٢٧ · مستند مُستعار لم يعُد للأرشيف */
  CHECKS.archiveNotReturned = function () {
    var out = [];
    live('docArchive').forEach(function (a) {
      if (!a.borrowedBy || !a.borrowedDate || a.returnedDate) return;
      var age = since(a.borrowedDate);
      if (age < TOL.borrowReturnDays) return;
      out.push(F('medium', 'dc', 'docArchive', a.id,
        'مستند مُستعار من الأرشيف منذ ' + age + ' يوماً',
        'الصندوق ' + (a.boxNo || '') + ' — ' + (a.title || '') +
        ' — لدى ' + (name('employees', a.borrowedBy) || ''),
        'اطلب إعادته أو سجّل تمديداً. الأصول الورقية تضيع بهذه الطريقة.'));
    });
    return out;
  };

  /* ٢٨ · مستند تجاوز مدة حفظه القانونية */
  CHECKS.retentionExpired = function () {
    var out = [];
    live('docArchive').forEach(function (a) {
      if (!a.retentionUntil || a.destroyed) return;
      var over = since(a.retentionUntil);
      if (over <= 0) return;
      out.push(F('low', 'dc', 'docArchive', a.id,
        'انتهت مدة حفظ المستند منذ ' + over + ' يوماً',
        'الصندوق ' + (a.boxNo || '') + ' — ' + (a.title || ''),
        'راجع مع الشؤون القانونية قبل الإعدام. لا تُعدم أي مستند يخص نزاعاً قائماً.'));
    });
    return out;
  };

  /* ═══════════════════════════════════════════════════════════════════
     من يرى أي نوع من النتائج
     ═══════════════════════════════════════════════════════════════════ */
  I.AREA_ROLES.site = ['site_engineer', 'project_manager', 'technical',
                       'admin', 'gm', 'auditor'];
  I.AREA_ROLES.dc   = ['document_control', 'technical', 'project_manager',
                       'legal', 'admin', 'gm', 'auditor'];

  /* القسمان الجديدان يريان أيضاً ما يخصّهما من المجالات القديمة */
  ['projects', 'equipment'].forEach(function (a) {
    if (I.AREA_ROLES[a] && I.AREA_ROLES[a].indexOf('site_engineer') === -1)
      I.AREA_ROLES[a].push('site_engineer');
  });
  if (I.AREA_ROLES.legal && I.AREA_ROLES.legal.indexOf('document_control') === -1)
    I.AREA_ROLES.legal.push('document_control');

  I.checkCount = Object.keys(CHECKS).length;
  console.info('inspector-departments.js: total inspector checks now ' + I.checkCount);
})(window);
