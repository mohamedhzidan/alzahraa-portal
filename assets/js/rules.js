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
  function requiredRolesFor(amount) {
    var a = Math.abs(Number(amount) || 0);
    for (var i = 0; i < SETTINGS.approvalLimits.length; i++) {
      if (a <= SETTINGS.approvalLimits[i].upTo) return SETTINGS.approvalLimits[i].roles;
    }
    return SETTINGS.approvalLimits[SETTINGS.approvalLimits.length - 1].roles;
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
    if (SETTINGS.blockFutureDates && d && mod.workflow) {
      var limit = new Date();
      limit.setDate(limit.getDate() + (SETTINGS.futureDaysAllowed || 0));
      if (new Date(d) > limit) {
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
      draft.lines.forEach(function (ln) {
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
        var allowed = requiredRolesFor(amt);
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
      ar: 'حسب قيمة المستند (' + money(amt) + ') يعتمده: ' + roleLabels(requiredRolesFor(amt)),
      en: 'Given its value (' + money(amt) + ') this is approved by: ' + roleLabels(requiredRolesFor(amt))
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
