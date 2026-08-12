/* =========================================================================
   print.js — طباعة المستندات الرسمية
              Official document printing with signature blocks
   -------------------------------------------------------------------------
   ينتج مستنداً رسمياً بترويسة الشركة ورقم المستند وخانات التوقيع
   وختم الاعتماد الإلكتروني — جاهزاً للطباعة أو الحفظ كـ PDF.
   ========================================================================= */
(function (global) {
  'use strict';

  var LOGO = '<svg viewBox="0 0 19.24 19.3" width="42" height="42">' +
    '<g fill="#0000A3" fill-rule="evenodd">' +
    '<path d="M 12.754 6.145L 13.473 4.895L 15.262 1.797L 16.301 0L 12.766 0L 12.598 0.289L 11.75 1.762L 9.219 6.145ZM 12.754 6.145"/>' +
    '<path d="M 17.562 16.242L 13.191 16.242L 13.645 15.461L 15.43 12.359L 15.414 12.324L 12 12.324L 9.656 16.242L 7.891 19.301L 19.242 19.301ZM 17.562 16.242"/>' +
    '<path d="M 16.363 10.168L 14.688 7.109L 5.148 7.109L 5.707 6.145L 9.254 0L 5.723 0L 0 9.91L 1.723 13.047L 3.383 10.168L 6.898 10.168L 3.43 16.164L 5.152 19.301L 10.43 10.168ZM 16.363 10.168"/>' +
    '</g></svg>';

  /* من يوقّع على كل نوع مستند / who signs each document type */
  var SIGNATURES = {
    purchaseApprovals: [
      { ar: 'طالب الشراء', en: 'Requested by' },
      { ar: 'المراجع', en: 'Reviewed by' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    goodsReceipts: [
      { ar: 'مندوب المورد', en: 'Supplier rep' },
      { ar: 'أمين المخزن', en: 'Storekeeper' },
      { ar: 'مسؤول الفحص', en: 'Inspector' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    stockIssues: [
      { ar: 'الصارف', en: 'Issued by' },
      { ar: 'المستلم', en: 'Received by' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    stockTransfers: [
      { ar: 'المسلِّم', en: 'Dispatched by' },
      { ar: 'السائق', en: 'Driver' },
      { ar: 'المستلم بالوجهة', en: 'Received at destination' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    stockCounts: [
      { ar: 'عضو اللجنة ١', en: 'Committee 1' },
      { ar: 'عضو اللجنة ٢', en: 'Committee 2' },
      { ar: 'عضو اللجنة ٣', en: 'Committee 3' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    payments: [
      { ar: 'أعدّه', en: 'Prepared by' },
      { ar: 'أمين الخزينة', en: 'Cashier' },
      { ar: 'المستلم', en: 'Received by' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    receipts: [
      { ar: 'المحصِّل', en: 'Collected by' },
      { ar: 'أمين الخزينة', en: 'Cashier' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    supplierInvoices: [
      { ar: 'المحاسب', en: 'Accountant' },
      { ar: 'المراجع', en: 'Reviewed by' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    clientIPCs: [
      { ar: 'أعدّه المكتب الفني', en: 'Prepared by' },
      { ar: 'مدير المشروع', en: 'Project manager' },
      { ar: 'الاستشاري', en: 'Consultant' },
      { ar: 'ممثل العميل', en: 'Client rep' }
    ],
    subIPCs: [
      { ar: 'أعدّه', en: 'Prepared by' },
      { ar: 'مهندس الموقع', en: 'Site engineer' },
      { ar: 'ممثل المقاول', en: 'Contractor rep' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    payroll: [
      { ar: 'أعدّه', en: 'Prepared by' },
      { ar: 'راجعه', en: 'Checked by' },
      { ar: 'المدير المالي', en: 'Finance manager' },
      { ar: 'المدير العام', en: 'General manager' }
    ],
    journal: [
      { ar: 'المحاسب', en: 'Accountant' },
      { ar: 'المراجع', en: 'Reviewed by' },
      { ar: 'المدير المالي', en: 'Finance manager' }
    ],
    budgets: [
      { ar: 'أعدّها', en: 'Prepared by' },
      { ar: 'مدير المشروع', en: 'Project manager' },
      { ar: 'المعتمد', en: 'Approved by' }
    ],
    leaves: [
      { ar: 'الموظف', en: 'Employee' },
      { ar: 'المدير المباشر', en: 'Line manager' },
      { ar: 'الموارد البشرية', en: 'HR' }
    ],
    _default: [
      { ar: 'أعدّه', en: 'Prepared by' },
      { ar: 'راجعه', en: 'Reviewed by' },
      { ar: 'اعتمده', en: 'Approved by' }
    ]
  };

  function company() {
    var c = Store.meta().company || {};
    return {
      name: c.name || 'شركة الزهراء للمقاولات العامة',
      nameEn: c.nameEn || 'ALZAHRAA GENERAL CONTRACTING',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      taxId: c.taxId || '',
      commercialReg: c.commercialReg || ''
    };
  }

  function userName(id) {
    var u = id && Store.find('users', id);
    return u ? u.name : '—';
  }

  /* ------------------------------------------------------------------
     Build the printable document
     ------------------------------------------------------------------ */
  function doc(moduleId, recId) {
    var mod = Schema.get(moduleId);
    var rec = Store.find(mod.table, recId);
    if (!rec) return;
    var c = company();
    var ar = I18N.getLang() === 'ar';

    var sigs = SIGNATURES[moduleId] || SIGNATURES._default;

    /* header fields, grouped, skipping empties */
    var groups = {}, order = [];
    mod.fields.forEach(function (f) {
      var v = rec[f.name];
      if (v === undefined || v === null || v === '' || v === false) return;
      if (f.type === 'textarea' && !String(v).trim()) return;
      var key = f.section ? L(f.section) : (ar ? 'بيانات' : 'Information');
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(f);
    });

    var h = '';

    /* letterhead */
    h += '<div class="ph">' +
      '<div class="ph-logo">' + LOGO + '</div>' +
      '<div class="ph-txt">' +
        '<div class="ph-ar">' + UI.esc(c.name) + '</div>' +
        '<div class="ph-en">' + UI.esc(c.nameEn) + '</div>' +
        (c.address ? '<div class="ph-sm">' + UI.esc(c.address) + '</div>' : '') +
        '<div class="ph-sm">' +
          (c.phone ? 'ت: ' + UI.esc(c.phone) + '  ' : '') +
          (c.taxId ? '· بطاقة ضريبية: ' + UI.esc(c.taxId) + '  ' : '') +
          (c.commercialReg ? '· سجل تجاري: ' + UI.esc(c.commercialReg) : '') +
        '</div>' +
      '</div>' +
    '</div>';

    /* title bar */
    h += '<div class="pt">' +
      '<div class="pt-name">' + UI.esc(L(mod.label)) + '</div>' +
      '<div class="pt-no">' +
        (rec.docNo ? '<span>' + (ar ? 'رقم المستند' : 'Document no.') + '</span><b>' + UI.esc(rec.docNo) + '</b>' : '') +
        (rec.date ? '<span>' + (ar ? 'التاريخ' : 'Date') + '</span><b>' + I18N.date(rec.date) + '</b>' : '') +
      '</div>' +
    '</div>';

    /* approval stamp */
    if (rec.status === 'approved' || rec.status === 'reversed') {
      h += '<div class="stamp">' +
        '<div class="stamp-t">' + (ar ? 'معتمد إلكترونياً' : 'ELECTRONICALLY APPROVED') + '</div>' +
        '<div class="stamp-b">' + (ar ? 'بواسطة: ' : 'By: ') + UI.esc(userName(rec.approvedBy)) +
        '  —  ' + I18N.dateTime(rec.approvedAt) + '</div>' +
        '</div>';
    } else if (rec.status === 'reversed') {
      h += '<div class="stamp rev"><div class="stamp-t">' +
        (ar ? 'مستند معكوس — لاغٍ' : 'REVERSED — VOID') + '</div></div>';
    } else if (mod.workflow) {
      h += '<div class="stamp draft"><div class="stamp-t">' +
        (ar ? 'غير معتمد — ' : 'NOT APPROVED — ') + Workflow.label(rec.status) + '</div></div>';
    }

    /* field groups */
    order.forEach(function (key) {
      h += '<div class="sec"><div class="sec-t">' + UI.esc(key) + '</div><table class="kv">';
      var fs = groups[key];
      for (var i = 0; i < fs.length; i += 2) {
        h += '<tr>';
        [fs[i], fs[i + 1]].forEach(function (f) {
          if (!f) { h += '<th></th><td></td>'; return; }
          h += '<th>' + UI.esc(L(f.label)) + '</th><td>' + UI.displayValue(f, rec) + '</td>';
        });
        h += '</tr>';
      }
      h += '</table></div>';
    });

    /* line items */
    if (mod.lines && Array.isArray(rec.lines) && rec.lines.length) {
      h += '<div class="sec"><div class="sec-t">' + UI.esc(L(mod.lines.label)) + '</div>' +
        '<table class="lines"><thead><tr><th style="width:26px">#</th>';
      mod.lines.fields.forEach(function (lf) { h += '<th>' + UI.esc(L(lf.label)) + '</th>'; });
      h += '</tr></thead><tbody>';
      rec.lines.forEach(function (ln, i) {
        h += '<tr><td class="c">' + (i + 1) + '</td>';
        mod.lines.fields.forEach(function (lf) { h += '<td>' + UI.displayValue(lf, ln) + '</td>'; });
        h += '</tr>';
      });
      h += '</tbody><tfoot>';
      (mod.lines.totals || []).forEach(function (tot) {
        h += '<tr><td colspan="' + mod.lines.fields.length + '" class="e">' + UI.esc(L(tot.label)) + '</td>' +
             '<td class="m">' + I18N.money(rec[tot.target] || 0) + '</td></tr>';
      });
      if (mod.lines.grandTotal) {
        h += '<tr><td colspan="' + mod.lines.fields.length + '" class="e">' + t('g.tax') + '</td>' +
             '<td class="m">' + I18N.money(rec.taxAmount || 0) + '</td></tr>' +
             '<tr class="gt"><td colspan="' + mod.lines.fields.length + '" class="e">' + t('g.total') + '</td>' +
             '<td class="m">' + I18N.money(rec.grandTotal || 0) + '</td></tr>';
      }
      h += '</tfoot></table></div>';
    }

    /* amount in words for money documents */
    if (mod.amountField && rec[mod.amountField]) {
      h += '<div class="words"><b>' + (ar ? 'المبلغ:' : 'Amount:') + '</b> ' +
        I18N.money(rec[mod.amountField]) + '</div>';
    }

    /* approval trail */
    if (mod.workflow && (rec.trail || []).length) {
      h += '<div class="sec"><div class="sec-t">' + t('wf.timeline') + '</div><table class="kv">';
      rec.trail.forEach(function (s) {
        h += '<tr><th>' + UI.esc(t('wf.' + (s.action === 'return' ? 'return' : s.action)) || s.action) + '</th>' +
             '<td>' + UI.esc(s.userName) + ' — ' + I18N.dateTime(s.at) +
             (s.note ? ' « ' + UI.esc(s.note) + ' »' : '') + '</td></tr>';
      });
      h += '</table></div>';
    }

    /* signature blocks */
    h += '<div class="sigs"><div class="sigs-t">' +
      (ar ? 'التوقيعات' : 'Signatures') + '</div><table class="sg"><tr>';
    sigs.forEach(function (s) { h += '<th>' + UI.esc(L(s)) + '</th>'; });
    h += '</tr><tr>';
    sigs.forEach(function () { h += '<td class="sg-name">' + (ar ? 'الاسم' : 'Name') + '</td>'; });
    h += '</tr><tr>';
    sigs.forEach(function () { h += '<td class="sg-box"></td>'; });
    h += '</tr><tr>';
    sigs.forEach(function () { h += '<td class="sg-date">' + (ar ? 'التاريخ:      /      /' : 'Date:     /     /') + '</td>'; });
    h += '</tr></table></div>';

    /* footer */
    h += '<div class="pf">' +
      (ar ? 'طُبع بواسطة ' : 'Printed by ') + UI.esc(Auth.current() ? Auth.current().name : '') +
      ' — ' + I18N.dateTime(new Date().toISOString()) +
      ' · ' + (ar ? 'هذا المستند صادر من نظام إدارة الشركة' : 'Issued by the company management system') +
      '</div>';

    open(h, (L(mod.label) + ' ' + (rec.docNo || '')).trim());
  }

  /* ------------------------------------------------------------------
     Open a clean print window
     ------------------------------------------------------------------ */
  function open(bodyHTML, title) {
    var ar = I18N.getLang() === 'ar';
    var win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      UI.toast(L({ ar: 'المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع.',
                   en: 'The browser blocked the print window. Allow pop-ups for this site.' }), 'error', 6000);
      return;
    }
    win.document.write(
      '<!DOCTYPE html><html lang="' + (ar ? 'ar' : 'en') + '" dir="' + (ar ? 'rtl' : 'ltr') + '"><head>' +
      '<meta charset="UTF-8"><title>' + UI.esc(title) + '</title>' +
      '<style>' + CSS + '</style></head><body>' + bodyHTML +
      '</body></html>');
    win.document.close();
    setTimeout(function () { try { win.print(); } catch (e) {} }, 500);
  }

  var CSS = [
    '@page{size:A4;margin:12mm 12mm 14mm}',
    '*{box-sizing:border-box}',
    'body{font-family:Cairo,Tahoma,sans-serif;color:#14162E;font-size:11pt;line-height:1.65;margin:0;padding:16px;background:#fff}',
    '.ph{display:flex;align-items:center;gap:14px;border-bottom:2.5px solid #0000A3;padding-bottom:10px;margin-bottom:14px}',
    '.ph-ar{font-size:15pt;font-weight:800;color:#0000A3;line-height:1.3}',
    '.ph-en{font-size:8pt;letter-spacing:2px;color:#7B7FA0}',
    '.ph-sm{font-size:8.5pt;color:#7B7FA0;margin-top:2px}',
    '.pt{display:flex;justify-content:space-between;align-items:center;background:#EDEDF8;padding:9px 14px;border-radius:7px;margin-bottom:12px}',
    '.pt-name{font-size:14pt;font-weight:800;color:#0000A3}',
    '.pt-no{display:flex;gap:16px;font-size:9.5pt}',
    '.pt-no span{color:#7B7FA0;margin-inline-end:4px}',
    '.pt-no b{font-family:Inter,Arial,sans-serif;direction:ltr;display:inline-block}',
    '.stamp{border:2px solid #0E7C5A;color:#0E7C5A;border-radius:7px;padding:7px 14px;margin-bottom:12px;text-align:center}',
    '.stamp-t{font-size:11pt;font-weight:800;letter-spacing:1px}',
    '.stamp-b{font-size:9pt;margin-top:2px}',
    '.stamp.draft{border-color:#B45309;color:#B45309}',
    '.stamp.rev{border-color:#B42318;color:#B42318}',
    '.sec{margin-bottom:12px;break-inside:avoid}',
    '.sec-t{font-size:10pt;font-weight:800;color:#0000A3;border-bottom:1.5px solid #CDCDEC;padding-bottom:3px;margin-bottom:6px}',
    'table{width:100%;border-collapse:collapse}',
    '.kv th{width:16%;text-align:start;font-size:9pt;color:#7B7FA0;font-weight:600;padding:4px 8px;vertical-align:top}',
    '.kv td{width:34%;font-size:10pt;font-weight:600;padding:4px 8px;vertical-align:top}',
    '.lines{border:1px solid #C8CBE2;font-size:9.5pt}',
    '.lines th{background:#0000A3;color:#fff;padding:6px;font-size:9pt;text-align:start;font-weight:700}',
    '.lines td{border:1px solid #E4E6F2;padding:5px 7px}',
    '.lines tbody tr:nth-child(even){background:#FAFBFE}',
    '.lines .c{text-align:center}',
    '.lines .e{text-align:end;font-weight:700;background:#F5F6FB}',
    '.lines .m{font-family:Inter,Arial,sans-serif;direction:ltr;text-align:start;font-weight:700;background:#F5F6FB}',
    '.lines .gt td{background:#EDEDF8;font-size:10.5pt;color:#0000A3}',
    '.words{background:#F5F6FB;border-inline-start:4px solid #0000A3;padding:8px 12px;margin-bottom:12px;font-size:11pt}',
    '.sigs{margin-top:22px;break-inside:avoid}',
    '.sigs-t{font-size:10pt;font-weight:800;color:#0000A3;margin-bottom:7px}',
    '.sg{border-collapse:collapse}',
    '.sg th{border:1px solid #C8CBE2;background:#EDEDF8;padding:6px;font-size:9pt;font-weight:700}',
    '.sg td{border:1px solid #C8CBE2;padding:5px 7px;font-size:8.5pt;color:#7B7FA0}',
    '.sg-box{height:52px}',
    '.pf{margin-top:16px;border-top:1px solid #E4E6F2;padding-top:6px;font-size:8pt;color:#7B7FA0;text-align:center}',
    '@media print{body{padding:0}.stamp,.sigs,.sec,.lines{break-inside:avoid}}'
  ].join('\n');

  global.Print = { doc: doc, SIGNATURES: SIGNATURES };
})(window);
