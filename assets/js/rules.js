/* =========================================================================
   rules.js — حمايات الخطأ البشري / human-error guards
   -------------------------------------------------------------------------
   ⭐ هذا الملف يمنع الأخطاء الشائعة قبل وقوعها.
      عدّل الأرقام في مربّع SETTINGS بالأسفل ليطابق قرارات إدارتكم.
      لا تحتاج لمس أي شيء آخر في الملف.

   ⭐ This file blocks common mistakes before they happen.
      Edit the numbers in the SETTINGS box below to match your company's
      decisions. Nothing else in the file needs touching.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     SETTINGS — اضبط هذه الأرقام مع إدارتكم
     ═══════════════════════════════════════════════════════════════════ */
  var SETTINGS = {

    /* ١ · حدود الاعتماد حسب قيمة المستند (بالجنيه)
       من يستطيع الاعتماد النهائي عند كل شريحة.
       الأدوار: project_manager · finance_manager · gm · admin          */
    approvalLimits: [
      { upTo: 100000,  roles: ['finance_manager', 'gm', 'admin'] },
      { upTo: Infinity, roles: ['gm', 'admin'] }
    ],

    /* ١-ب · أدوار تعتمد **وحدة بعينها** فوق الشرائح أعلاه
       ═══════════════════════════════════════════════════════════════════
       🔴 لماذا وُجد هذا الجدول أصلاً — عطل شُحن في ٢ سبتمبر ولم يعمل يوماً:
       أعطينا `project_manager` حقّ اعتماد «أذون الصرف» في auth.js (الطبقة
       الأولى) وشحنّاه، لكن الشرائح أعلاه **module-agnostic**: تُرجع الأدوار
       بالمبلغ وحده. و`project_manager` ليس في أيّ شريحة. فكان مدير الموقع
       يضغط «اعتماد» على إذن صرف بأي قيمة أكبر من صفر ويُرفض:
           «قيمة هذا المستند ٥٠٠ تتجاوز حدّ اعتمادك…»
       طوال خمسة أيام، وكلّنا نظنّ الأمر يعمل.

       🔴 ولماذا لم تمسكه بوّابتنا: **فحصُنا استعمل مبلغ صفر.** و`:280`
       أدناه هو `if (amt > 0)` — فالصفر يتخطّى الفحص كلّه ويخضرّ على الكود
       المعطوب. **الأداة وافقت العطل.** فصار شرطاً دائماً: أيّ تجربة اعتماد
       تستعمل مبلغاً **غير صفريّ**.

       🔴 ولماذا جدولٌ منفصل بدل توسيع الشريحة: الشرائح مشتركة بين كل
       الوحدات (`requiredRolesFor` لا تعرف الوحدة، و`inspector.js:215`
       يقرأ الحدّ نفسه). فتوسيعُها كان سيمنح `project_manager` اعتماد **كل**
       مستند تحت ١٠٠٬٠٠٠ في المشروع كلّه — منح سلطة مالية في مكان لم يطلبه
       أحد، وهو **أسوأ من العطل**. هذا الجدول مفتاحه مُعرّف الوحدة، فلا
       تتحرّك أيّ وحدة أخرى حرفاً واحداً.

       والحدّ الأعلى يبقى كما هو: فوق ١٠٠٬٠٠٠ لا يعتمد إلّا gm/admin.

       🔴 WHY THIS TABLE EXISTS — a fault shipped 2 Sept that NEVER worked:
       `project_manager` was granted approval of stock issues in auth.js
       (layer 1) and shipped, but the bands above are MODULE-AGNOSTIC — they
       return roles by AMOUNT alone, and `project_manager` is in neither band.
       So the site manager pressed «اعتماد» on any issue worth more than zero
       and was refused, for five days, while we all believed it worked.
       🔴 WHY OUR GATE MISSED IT: the probe used amount ZERO, and `:280` is
       `if (amt > 0)` — so zero skips the check entirely and goes GREEN on the
       broken path. THE INSTRUMENT AGREED WITH THE FAULT. Standing condition
       from now on: every approval trial uses a NON-ZERO amount.
       🔴 WHY A SEPARATE TABLE INSTEAD OF WIDENING THE BAND: the bands are
       shared by every module (`requiredRolesFor` does not know the module,
       and `inspector.js:215` reads the same threshold). Widening would grant
       `project_manager` approval of EVERY document under 100,000 across the
       whole portal — money authority nobody asked for, WORSE THAN THE BUG.
       This table is keyed by module id, so no other module moves one letter.
       The upper band is untouched: above 100,000 stays gm/admin.           */
    moduleApprovers: {
      stockIssues: { upTo: 100000, roles: ['project_manager'] }
    },

    /* ٢ · الفترات المالية المقفلة — لا يُقبل مستند بتاريخ قبل هذا اليوم
       اتركها '' لتعطيل القفل. مثال: '2026-01-01'                       */
    periodLockedBefore: '',

    /* ٣ · منع التواريخ المستقبلية على المستندات المالية               */
    blockFutureDates: true,
    futureDaysAllowed: 0,        /* اسمح بكم يوم للأمام (٠ = اليوم فقط) */

    /* ٤ · تحذير المبلغ الشاذ — أكبر من متوسط نفس النوع بهذا المعامل   */
    abnormalMultiplier: 10,
    abnormalMinSample: 3,        /* لا تحذّر قبل وجود ٣ مستندات للمقارنة */

    /* ٥ · تأكيد مزدوج فوق هذا المبلغ                                   */
    doubleConfirmAbove: 250000,

    /* ٦ · منع الرصيد المخزني السالب                                    */
    blockNegativeStock: true,

    /* ٧ · تجاوز الموازنة: 'warn' تحذير فقط · 'block' منع تام           */
    budgetOverrun: 'warn',
    budgetWarnAtPercent: 90,     /* حذّر عند بلوغ ٩٠٪ من الموازنة       */

    /* ٨ · منع تكرار رقم فاتورة لنفس المورد                             */
    blockDuplicateInvoice: true
  };
  /* ═══════════════════════════════════════════════════════════════════ */

  function L2(o) { return global.L ? L(o) : (o.ar || o.en); }
  function money(v) { return I18N.money(v); }

  /* الدور المطلوب لاعتماد مبلغ معيّن */
  /* moduleId اختياريّ — النداء بوسيط واحد يُعطي سلوك اليوم حرفاً بحرف، فأيّ
     مستدعٍ خارجيّ قائم لا يتأثّر. ولا نعدّل المصفوفة الأصلية أبداً:
     `concat` تُنشئ مصفوفة جديدة، فـ`SETTINGS.approvalLimits` تبقى كما هي —
     لو دفعنا داخلها لتراكمت الأدوار مع كل نداء وتسرّبت إلى كل الوحدات.
     moduleId is OPTIONAL — calling with one argument gives today's behaviour
     letter for letter, so any existing external caller is unaffected. And the
     original array is NEVER mutated: `concat` builds a new one, so
     `SETTINGS.approvalLimits` stays intact. Pushing into it would accumulate
     roles on every call and leak them into every module. */
  function requiredRolesFor(amount, moduleId) {
    var a = Math.abs(Number(amount) || 0);
    var base = SETTINGS.approvalLimits[SETTINGS.approvalLimits.length - 1].roles;
    for (var i = 0; i < SETTINGS.approvalLimits.length; i++) {
      if (a <= SETTINGS.approvalLimits[i].upTo) { base = SETTINGS.approvalLimits[i].roles; break; }
    }
    var extra = moduleId && SETTINGS.moduleApprovers && SETTINGS.moduleApprovers[moduleId];
    if (extra && a <= extra.upTo) {
      return base.concat(extra.roles.filter(function (r) { return base.indexOf(r) === -1; }));
    }
    return base;
  }

  function amountOf(mod, rec) {
    if (!mod.amountField) return 0;
    return Math.abs(Number(rec[mod.amountField]) || 0);
  }

  function roleLabels(roles) {
    return roles.map(function (r) { return Auth.roleLabel(r); }).join(' أو ');
  }

  /* ------------------------------------------------------------------
     فحوصات وقت الحفظ — تُستدعى قبل حفظ أي مستند
     Returns { errors: [], warnings: [] }
     ------------------------------------------------------------------ */
  function validateSave(mod, draft, editingId) {
    var errors = [], warnings = [];
    var today = I18N.today();
    var d = draft.date || draft.issueDate;

    /* التاريخ المستقبلي */
    /* ═══════════════════════════════════════════════════════════════
       🔴 المقارنة بالتاريخ المحلّي نصّاً، لا بكائن Date. أُصلح ٢ سبتمبر ٢٠٢٦.

       كان: `new Date(d) > limit`. و`new Date("2026-09-02")` على نصّ
       بشكل YYYY-MM-DD يُفسَّر **منتصف ليل غرينتش** = الثالثة فجراً
       بالقاهرة. فبين منتصف الليل والثالثة، تاريخ **اليوم الحقيقي** كان
       يُحكَم عليه بأنه في المستقبل ويُرفض الحفظ:
           «لا يمكن تسجيل مستند بتاريخ مستقبلي»

       والنصفان معاً كانا فخّاً مغلقاً: الخانة تُملأ تلقائياً بـ**أمس**
       (i18n.js، أُصلح)، **ومن يصحّحها إلى اليوم يُرفض حفظه**. أي أن
       البورتال كان يعاقب من ينتبه للخطأ.

       العلاج: مقارنة نصّين بشكل YYYY-MM-DD — وهي مقارنة صحيحة حرفياً
       بهذا الشكل — بعد بناء الحدّ من مكوّنات محلّية. لا كائن Date يدخل
       المقارنة إطلاقاً، فلا مِنطقة زمنية تدخلها.

       🔴 Compare LOCAL DATE STRINGS, never Date objects. Fixed 2 Sep 2026.
       It was `new Date(d) > limit`, and `new Date("2026-09-02")` on a bare
       YYYY-MM-DD string parses as UTC MIDNIGHT = 03:00 Cairo. So between
       midnight and 03:00 the TRUE local date was judged to be in the future
       and the save was REFUSED.
       Together the two halves were a closed trap: the box was pre-filled
       with YESTERDAY (i18n.js, now fixed), and anyone who corrected it to
       today was REFUSED. The portal punished the person who noticed.
       The cure compares two YYYY-MM-DD strings — lexicographically correct
       in that format — with the limit built from local components. No Date
       object enters the comparison, so no timezone can. */
    if (SETTINGS.blockFutureDates && d && mod.workflow) {
      var lim = new Date();
      lim.setDate(lim.getDate() + (SETTINGS.futureDaysAllowed || 0));
      var lm = String(lim.getMonth() + 1), ld = String(lim.getDate());
      var limitStr = lim.getFullYear() + '-' +
                     (lm.length < 2 ? '0' + lm : lm) + '-' +
                     (ld.length < 2 ? '0' + ld : ld);
      if (String(d).slice(0, 10) > limitStr) {
        errors.push(L2({
          ar: 'لا يمكن تسجيل مستند بتاريخ مستقبلي (' + I18N.date(d) + ').',
          en: 'A document cannot carry a future date (' + I18N.date(d) + ').'
        }));
      }
    }

    /* الفترة المقفلة */
    if (SETTINGS.periodLockedBefore && d && new Date(d) < new Date(SETTINGS.periodLockedBefore)) {
      errors.push(L2({
        ar: 'الفترة المالية مقفلة قبل ' + I18N.date(SETTINGS.periodLockedBefore) +
            '. لا يمكن التسجيل بتاريخ ' + I18N.date(d) + '.',
        en: 'The period before ' + I18N.date(SETTINGS.periodLockedBefore) +
            ' is closed. Cannot post on ' + I18N.date(d) + '.'
      }));
    }

    /* تكرار رقم فاتورة المورد */
    if (SETTINGS.blockDuplicateInvoice && mod.id === 'supplierInvoices' &&
        draft.supplier && draft.supplierInvoiceNo) {
      var dup = Store.all('supplierInvoices').filter(function (r) {
        return r.id !== editingId &&
               r.supplier === draft.supplier &&
               String(r.supplierInvoiceNo || '').trim().toLowerCase() ===
               String(draft.supplierInvoiceNo).trim().toLowerCase();
      });
      if (dup.length) {
        errors.push(L2({
          ar: 'رقم الفاتورة «' + draft.supplierInvoiceNo + '» مسجّل من قبل لنفس المورد في المستند ' +
              (dup[0].docNo || '') + '. تحقق قبل المتابعة — قد يكون سداداً مكرراً.',
          en: 'Invoice number "' + draft.supplierInvoiceNo + '" already exists for this supplier on ' +
              (dup[0].docNo || '') + '. Check before continuing — this may be a duplicate payment.'
        }));
      }
    }

    /* الرصيد المخزني السالب */
    if (SETTINGS.blockNegativeStock && mod.lines && mod.lines.stockEffect === 'out' &&
        Array.isArray(draft.lines)) {
      /* 🔴 صفوف بنود فارغة (null/undefined) — أُصلح ٢ سبتمبر ٢٠٢٦.
         كان السطر التالي يقرأ `ln.item` مباشرةً بلا أي حماية. وصفٌّ فارغ
         واحد يجعل validateSave تُلقي TypeError، وpages/entity.js:852 لا
         يلفّ النداء بـtry/catch — **فيموت زرّ الحفظ في صمت: لا يحفظ ولا
         يقول شيئاً**، وهو أسوأ عطل ممكن لأن الإنسان ينصرف وهو يظنّ أنه حفظ.
         أُعيد إنتاجه قبل كتابة هذا الحارس:
         `node TESTS/rules-null-line-repro.js` (١٢ نجاح · ٠ فشل).
         الشاشة لا تنتج صفّاً فارغاً اليوم — entity.js لا يدفع إلا كائنات
         blankLine() — لكنّ استيراداً أو مسوّدة تالفة يستطيع.
         **ونحذّر ولا نمنع**، ونسمّي رقم السطر: إسقاط بندٍ من مستند مخزني
         في صمت هو بالضبط كيف يختلّ الجرد بلا أن يدري أحد. والتحذير لا
         يمنع حفظ البنود السليمة.
         🔴 EMPTY LINE ROWS (null/undefined) — fixed 2 Sep 2026.
         The next line read `ln.item` with no protection. ONE empty row made
         validateSave throw a TypeError, and pages/entity.js:852 does not
         wrap the call in try/catch — so THE SAVE BUTTON DIED SILENTLY: it
         did not save and it did not say anything, the worst possible shape
         because the person walks away believing they saved.
         Reproduced BEFORE this guard was written:
         `node TESTS/rules-null-line-repro.js` (12 passed · 0 failed).
         The screen cannot produce an empty row today — entity.js only ever
         pushes blankLine() objects — but an import or a corrupted offline
         draft can.
         WE WARN, WE DO NOT BLOCK, and we name the row number: silently
         dropping a line from a stock document is exactly how a count goes
         wrong with nobody knowing. The warning never stops the good rows
         from being saved. */
      var emptyRows = [];
      draft.lines.forEach(function (ln, rowIdx) {
        if (!ln) { emptyRows.push(rowIdx + 1); return; }
        if (!ln.item || !(Number(ln.qty) > 0)) return;
        var avail = 0;
        try { avail = Dashboard.analytics.stockQty(ln.item, draft.warehouse || null); } catch (e) { return; }
        if (Number(ln.qty) > avail) {
          var it = Store.find('items', ln.item);
          errors.push(L2({
            ar: 'الكمية المطلوبة من «' + (it ? it.name : '') + '» (' + I18N.num(ln.qty, 2) +
                ') أكبر من الرصيد المتاح (' + I18N.num(avail, 2) + ').',
            en: 'Requested quantity of "' + (it ? it.name : '') + '" (' + I18N.num(ln.qty, 2) +
                ') exceeds available stock (' + I18N.num(avail, 2) + ').'
          }));
        }
      });

      /* التحذير يُرفع بعد المرور على كل البنود، فيكون رسالةً واحدة تسمّي
         كل الأسطر الفارغة بدل رسالة لكل سطر.
         Raised after the whole pass, so it is ONE message naming every
         empty row rather than one message per row. */
      if (emptyRows.length) {
        warnings.push(L2({
          ar: 'تجاهلنا ' + I18N.num(emptyRows.length, 0) + ' بنداً فارغاً في هذا المستند (رقم ' +
              emptyRows.join(' و') + '). البنود المكتوبة لم تتأثّر ويمكنك الحفظ، ' +
              'لكن راجع المستند: بندٌ فارغ يعني أن سطراً ضاع في الاستيراد أو المسوّدة.',
          en: 'We skipped ' + emptyRows.length + ' empty line(s) in this document (row ' +
              emptyRows.join(', ') + '). The written lines are unaffected and you can save, ' +
              'but check the document: an empty line means a row was lost on import or in the draft.'
        }));
      }
    }

    /* المبلغ الشاذ */
    var amt = amountOf(mod, draft);
    if (amt > 0 && mod.amountField) {
      var peers = Store.all(mod.table)
        .filter(function (r) { return r.id !== editingId && Number(r[mod.amountField]) > 0; })
        .map(function (r) { return Math.abs(Number(r[mod.amountField])); });
      if (peers.length >= SETTINGS.abnormalMinSample) {
        var avg = peers.reduce(function (a, b) { return a + b; }, 0) / peers.length;
        if (amt > avg * SETTINGS.abnormalMultiplier) {
          warnings.push(L2({
            ar: 'المبلغ ' + money(amt) + ' أكبر بكثير من المعتاد لهذا النوع (المتوسط ' +
                money(avg) + '). تأكد أنك لم تُخطئ في عدد الأصفار.',
            en: 'The amount ' + money(amt) + ' is far above the usual for this type (average ' +
                money(avg) + '). Please check you have not mistyped a zero.'
          }));
        }
      }
    }

    /* تجاوز الموازنة */
    if (draft.project && amt > 0 && ['purchaseApprovals', 'supplierInvoices', 'stockIssues', 'subIPCs'].indexOf(mod.id) !== -1) {
      try {
        var budget = Dashboard.analytics.budgetOf(draft.project);
        if (budget > 0) {
          var actual = Dashboard.analytics.actualCost(draft.project);
          var after = actual + amt;
          var pct = after / budget * 100;
          var p = Store.find('projects', draft.project);
          if (pct > 100) {
            var msg = L2({
              ar: 'هذا المستند سيجعل تكلفة مشروع «' + (p ? p.name : '') + '» تتجاوز الموازنة المعتمدة ' +
                  '(' + money(after) + ' مقابل ' + money(budget) + ').',
              en: 'This document pushes project "' + (p ? p.name : '') + '" over its approved budget ' +
                  '(' + money(after) + ' vs ' + money(budget) + ').'
            });
            if (SETTINGS.budgetOverrun === 'block') errors.push(msg); else warnings.push(msg);
          } else if (pct >= SETTINGS.budgetWarnAtPercent) {
            warnings.push(L2({
              ar: 'مشروع «' + (p ? p.name : '') + '» بلغ ' + I18N.pct(pct, 1) + ' من موازنته.',
              en: 'Project "' + (p ? p.name : '') + '" has reached ' + I18N.pct(pct, 1) + ' of its budget.'
            }));
          }
        }
      } catch (e) {}
    }

    return { errors: errors, warnings: warnings };
  }

  /* ------------------------------------------------------------------
     فحوصات وقت الاعتماد — حدود الصلاحية المالية
     ------------------------------------------------------------------ */
  function validateTransition(mod, rec, action) {
    var errors = [], confirms = [];
    var u = Auth.current();
    if (!u) return { errors: ['no user'], confirms: [] };

    if (action === 'approve' && mod.amountField) {
      var amt = amountOf(mod, rec);
      if (amt > 0) {
        /* تمرير مُعرّف الوحدة — بدونه تعود الشريحة المشتركة وحدها ويبقى
           العطل قائماً. Pass the module id; without it only the shared band
           is consulted and the fault remains. */
        var allowed = requiredRolesFor(amt, mod && mod.id);
        if (allowed.indexOf(u.role) === -1) {
          errors.push(L2({
            ar: 'قيمة هذا المستند ' + money(amt) + ' تتجاوز حدّ اعتمادك. ' +
                'الاعتماد لهذه الشريحة من صلاحية: ' + roleLabels(allowed) + '.',
            en: 'This document is worth ' + money(amt) + ', above your approval limit. ' +
                'This band requires: ' + roleLabels(allowed) + '.'
          }));
        }
        if (amt >= SETTINGS.doubleConfirmAbove) {
          confirms.push(L2({
            ar: 'أنت على وشك اعتماد مبلغ كبير: ' + money(amt) + '. هل راجعت المستند ومرفقاته؟',
            en: 'You are about to approve a large amount: ' + money(amt) + '. Have you reviewed the document and its attachments?'
          }));
        }
      }
    }
    return { errors: errors, confirms: confirms };
  }

  /* من يستطيع اعتماد هذا المستند — يُعرض في شاشة المستند */
  function approverHint(mod, rec) {
    if (!mod.amountField) return null;
    var amt = amountOf(mod, rec);
    if (!amt) return null;
    return L2({
      /* الشاشة يجب أن تقول الحقيقة نفسها التي تفرضها البوّابة — لو ذكرت
         أدواراً أقلّ لظنّ مدير الموقع أنه غير مخوَّل وهو مخوَّل.
         The screen must state the SAME truth the gate enforces; naming fewer
         roles would tell the site manager he is not allowed when he is. */
      ar: 'حسب قيمة المستند (' + money(amt) + ') يعتمده: ' + roleLabels(requiredRolesFor(amt, mod && mod.id)),
      en: 'Given its value (' + money(amt) + ') this is approved by: ' + roleLabels(requiredRolesFor(amt, mod && mod.id))
    });
  }

  global.Rules = {
    SETTINGS: SETTINGS,
    validateSave: validateSave,
    validateTransition: validateTransition,
    requiredRolesFor: requiredRolesFor,
    approverHint: approverHint
  };
})(window);
