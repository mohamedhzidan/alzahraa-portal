/* =========================================================================
   payslip-print.js — قسيمة راتب لكل موظف، من المسير المعتمد
   payslip-print.js — a payslip per employee, off an approved payroll run.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN:
     · تفاصيل مسير الرواتب ← «طباعة قسائم الرواتب» (صفحة لكل بند)
     · بطاقة الموظف ← «قسائم الراتب» (المسيرات المعتمدة التي ظهر فيها)
     The payroll run's detail → «طباعة قسائم الرواتب», one page per line.
     The employee's card → «قسائم الراتب», the approved runs they appear on.

   🔴 مَن يراها · WHO MAY SEE ONE: أهل الرواتب فقط —
      hr · hr_manager · finance_manager · gm · admin · auditor.
      **الموظف لا يطبع قسيمته بنفسه في هذا الإصدار** (قرار المالك ٥،
      ١٢ سبتمبر). ولا يُغيَّر ذلك من هنا؛ تغييره قرار صاحب العمل.
      Payroll people only. **An employee does NOT print their own payslip in
      this release** (owner decision 5). That is not changed from here.

   ما لا تفعله · WHAT IT DOES NOT DO:
     · لا تحسب شيئاً — كل رقم يُطبع كما هو محفوظ على البند، بما فيه الصافي.
       القسيمة تعرض المسير، ولا تعيد حسابه؛ ورقةٌ تخالف الشاشة أسوأ من
       لا ورقة.
       It COMPUTES NOTHING — every figure is printed exactly as stored on the
       line, the net included. A payslip shows the run, it does not recompute
       it; a sheet of paper that disagrees with the screen is worse than none.
     · لا تطبع قسيمة من مسير غير معتمد بلا تحذير — الختم يقول الحقيقة.
       An unapproved run still prints, but the stamp SAYS so.

   إضافيّ بالكامل · WHOLLY ADDITIVE. Delete it and today returns.
   v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  /* الاعتماديات مرّة واحدة بأسمائها الحقيقية — لا حارس عند الاستعمال.
     Dependencies once, by their real exported names — no call-site guard.
     UI's real exports are ui.js:286-292; `UI.alert` does NOT exist. */
  var missing = [];
  ['Schema', 'Auth', 'Store', 'UI', 'I18N'].forEach(function (k) { if (!global[k]) missing.push(k); });
  if (!missing.length) {
    ['esc', 'toast', 'modal'].forEach(function (f) { if (typeof UI[f] !== 'function') missing.push('UI.' + f); });
    ['money', 'date', 'getLang'].forEach(function (f) { if (typeof I18N[f] !== 'function') missing.push('I18N.' + f); });
  }
  if (missing.length) {
    console.error('payslip-print.js NOT installed — missing: ' + missing.join(', ') +
                  '. No payslip button will appear, deliberately: a payslip printing wrong or blank ' +
                  'figures would be worse than no payslip.');
    return;
  }
  if (UI.__p11Payslip) return;
  UI.__p11Payslip = true;

  var VIEWERS = ['hr', 'hr_manager', 'finance_manager', 'gm', 'admin', 'auditor', 'breakglass'];
  var ar = function () { return I18N.getLang() === 'ar'; };
  var L = function (o) { return I18N.L ? I18N.L(o) : (ar() ? o.ar : o.en); };
  var esc = function (v) { return UI.esc(v); };
  var money = function (v) { return I18N.money(Number(v) || 0); };

  function maySee() {
    var u = Auth.current && Auth.current();
    return !!(u && VIEWERS.indexOf(u.role) !== -1);
  }

  /* ═══ ١ · الخانات وعناوينها — من الشاشة نفسها، لا مكتوبة هنا ══════════
     1 · the boxes and their labels — read from the SCREEN's own schema,
     never hand-written here. If hr-department.js renames a box or
     payroll-insurance.js rewrites a label from the live percentages, the
     payslip follows automatically instead of drifting.  */
  function lineFields() {
    var mod = Schema.get('payroll');
    if (!mod || !mod.lines || !mod.lines.fields) return [];
    return mod.lines.fields.filter(function (f) {
      return f.name !== 'employee' && f.name !== 'lineTotal' && f.type !== 'calc';
    });
  }

  function employeeName(id) {
    var e = Store.find('employees', id);
    return (e && e.name) || id || '';
  }

  /* ═══ ٢ · صفحة واحدة لبند واحد ═══════════════════════════════════════ */
  function slipHTML(run, line, fields) {
    var A = ar();
    var rows = fields.map(function (f) {
      var v = Number(line[f.name]) || 0;
      return '<tr><td>' + esc(L(f.label)) + '</td><td class="n">' + esc(money(v)) + '</td></tr>';
    }).join('');

    /* الختم يقول حالة المسير كما هي — نفس منطق print.js:185-197.
       The stamp tells the run's real state — print.js:185-197's own logic. */
    var stamp = run.status === 'approved'
      ? '<div class="stamp ok">' + esc(A ? 'معتمد إلكترونياً' : 'ELECTRONICALLY APPROVED') +
        '<br><small>' + esc((A ? 'بواسطة: ' : 'By: ') + (run.approvedBy || '')) + ' — ' +
        esc(I18N.dateTime ? I18N.dateTime(run.approvedAt) : (run.approvedAt || '')) + '</small></div>'
      : run.status === 'reversed'
        ? '<div class="stamp rev">' + esc(A ? 'مسير مُلغى — لاغٍ' : 'REVERSED RUN — VOID') + '</div>'
        : '<div class="stamp draft">' + esc(A ? 'غير معتمد — لا يُصرف بهذه الورقة' : 'NOT APPROVED — do not pay against this') + '</div>';

    /* ملاحظة البند إن وُجدت (سقف القسط، أو آخر قسط) — تُطبع، لأنها تشرح رقماً.
       The line's note if it has one (the capped instalment, or the final one)
       is printed, because it explains a figure the employee will ask about. */
    var note = line.note ? '<p class="note">' + esc(line.note) + '</p>' : '';

    var att = (line.attDaysPresent !== undefined || line.attDaysAbsent !== undefined)
      ? '<p class="att">' + esc(A ? 'أيام الحضور: ' : 'Days present: ') + esc(String(line.attDaysPresent || 0)) +
        ' · ' + esc(A ? 'الغياب: ' : 'absent: ') + esc(String(line.attDaysAbsent || 0)) +
        ' · ' + esc(A ? 'ساعات إضافية: ' : 'overtime hours: ') + esc(String(line.attOvertimeHours || 0)) + '</p>'
      : '';

    return '<section class="slip">' +
      '<h2>' + esc(A ? 'قسيمة راتب' : 'Payslip') + ' — ' + esc(run.period || '') + '</h2>' +
      '<p class="who"><strong>' + esc(employeeName(line.employee)) + '</strong>' +
        ' · ' + esc(A ? 'مسير ' : 'Run ') + esc(run.docNo || '') + '</p>' +
      '<table><tbody>' + rows +
        '<tr class="tot"><td>' + esc(A ? 'صافي الراتب' : 'Net pay') + '</td>' +
        '<td class="n">' + esc(money(line.lineTotal)) + '</td></tr>' +
      '</tbody></table>' + note + att + stamp +
      '<div class="sig"><div>' + esc(A ? 'الموظف' : 'Employee') + '</div>' +
        '<div>' + esc(A ? 'الموارد البشرية' : 'Human resources') + '</div>' +
        '<div>' + esc(A ? 'الحسابات' : 'Accounts') + '</div></div>' +
      '</section>';
  }

  /* ═══ ٣ · النافذة — نفس نمط employee-statement.js:262-266 المُثبت ══════ */
  function printSlips(run, lines) {
    var A = ar();
    var fields = lineFields();
    var meta = (Store.meta && Store.meta().company) || {};
    var company = (A ? meta.name : (meta.nameEn || meta.name)) || 'شركة الزهراء للمقاولات العامة';
    var title = (A ? 'قسائم رواتب — ' : 'Payslips — ') + (run.period || '');

    var html = '<!doctype html><html dir="' + (A ? 'rtl' : 'ltr') + '" lang="' + (A ? 'ar' : 'en') + '"><head>' +
      '<meta charset="utf-8"><title>' + esc(title) + '</title><style>' +
      'body{font:13px/1.7 Tahoma,Arial,sans-serif;margin:0;color:#12211c}' +
      '.slip{margin:26px;page-break-after:always}' +
      '.slip:last-child{page-break-after:auto}' +
      'h1{font-size:17px;margin:0 0 2px}h2{font-size:15px;margin:0 0 4px}' +
      '.who{margin:0 0 10px;color:#444}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px}' +
      'th,td{border:1px solid #bbb;padding:5px 8px;text-align:' + (A ? 'right' : 'left') + '}' +
      '.n{text-align:' + (A ? 'left' : 'right') + ';font-variant-numeric:tabular-nums}' +
      '.tot{font-weight:700;background:#f4f4f4}' +
      '.note{margin:8px 0 0;padding:6px 8px;background:#fff8e5;border:1px solid #e3d5a3}' +
      '.att{margin:6px 0 0;color:#555}' +
      '.stamp{margin-top:12px;padding:6px 10px;display:inline-block;border:2px solid #333;font-weight:700}' +
      '.stamp.ok{border-color:#2c7a4b;color:#2c7a4b}.stamp.rev{border-color:#a33;color:#a33}' +
      '.stamp.draft{border-color:#9a7b16;color:#9a7b16}' +
      '.sig{margin-top:30px;display:flex;gap:34px}.sig div{flex:1;border-top:1px solid #333;padding-top:5px}' +
      '@media print{.slip{margin:14mm}}' +
      '</style></head><body>' +
      lines.map(function (l) {
        return '<div class="slip"><h1>' + esc(company) + '</h1>' + slipHTML(run, l, fields).replace(/^<section class="slip">|<\/section>$/g, '') + '</div>';
      }).join('') +
      '</body></html>';

    var w = global.open('', '_blank');
    if (!w) {
      /* المتصفح يمنع النوافذ المنبثقة أحياناً — يُقال ذلك بدل ألّا يحدث شيء.
         Pop-ups are sometimes blocked — SAY so rather than let nothing happen. */
      UI.toast(A ? 'المتصفح منع فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة لهذا الموقع.'
                 : 'The browser blocked the print window — allow pop-ups for this site.', 'error', 7000);
      return false;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
    return true;
  }

  /* ═══ ٤ · الأزرار — على الشاشتين اللتين يفتحهما الناس فعلاً ═══════════
     🔴 نلفّ `UI.modal` لا `EntityPage.openDetail`: الضغط على صفّ في السجلّ
        وزرّ 👁 ينادِيان الدالّة الداخلية (`pages/entity.js:253-257, :264`)،
        فلَفُّ EntityPage.openDetail لا يعمل من السجلّ إطلاقاً — وهو الطريق
        الذي يفتح منه الناس المستندات. قاعدة هذا المشروع: لُفَّ UI.modal.
     🔴 We wrap `UI.modal`, not `EntityPage.openDetail`: a register row and the
        👁 button call the INTERNAL closure (entity.js:253-257, :264), so
        wrapping EntityPage.openDetail never fires from the register — which is
        how people actually open documents. This project's rule: wrap UI.modal. */
  function labelOf(moduleId) {
    var m = Schema.get(moduleId);
    return m && m.label ? L(m.label) : null;
  }
  var PAYROLL_LABEL = labelOf('payroll');
  var EMP_LABEL = labelOf('employees');

  function addButton(text, title, onClick) {
    var foot = document.getElementById('modalFoot');
    if (!foot) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.textContent = text;
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    /* أول الأزرار — attachments.js يضع «📎 مرفقات» أوّلاً أيضاً، فلا نعتمد
       على الترتيب في أي تجربة: تُختار الأزرار بنصّها لا بموضعها.
       First in the footer — attachments.js puts «📎 مرفقات» first too, so no
       trial may pick a button by POSITION; they are picked by TEXT. */
    foot.insertBefore(b, foot.firstChild);
  }

  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    try {
      if (!maySee()) return out;
      var title = opts && opts.title ? String(opts.title) : '';
      if (title.indexOf(' — ') === -1) return out;
      var tail = title.split(' — ').pop().trim();

      if (PAYROLL_LABEL && title.indexOf(PAYROLL_LABEL) === 0) {
        var run = Store.all('payroll').filter(function (r) { return r.docNo === tail; })[0];
        if (run && (run.lines || []).length) {
          addButton(
            L({ ar: 'طباعة قسائم الرواتب', en: 'Print payslips' }),
            L({ ar: 'صفحة لكل موظف على هذا المسير', en: 'One page per employee on this run' }),
            function () { printSlips(run, run.lines); });
        }
        return out;
      }

      if (EMP_LABEL && title.indexOf(EMP_LABEL) === 0) {
        /* العنوان يفضّل docNo على الاسم (`entity.js:429`)، وجدول employees
           يحمل عمود docNo فعلاً — فلا يكفي المطابقة بالاسم وحده.
           The title prefers docNo over name (entity.js:429) and the employees
           table really does carry a docNo column — so matching on the name
           alone would miss every employee that has one. */
        var emp = Store.all('employees').filter(function (r) {
          return r.docNo === tail || r.name === tail || r.code === tail;
        })[0];
        if (!emp) return out;
        var runs = Store.all('payroll').filter(function (r) {
          return r.status === 'approved' && r.deleted !== true &&
                 (r.lines || []).some(function (l) { return l.employee === emp.id; });
        });
        if (!runs.length) return out;
        addButton(
          L({ ar: 'قسائم الراتب (' + runs.length + ')', en: 'Payslips (' + runs.length + ')' }),
          L({ ar: 'المسيرات المعتمدة التي ظهر فيها', en: 'The approved runs they appear on' }),
          function () {
            var body = '<ul style="line-height:2">' + runs.map(function (r) {
              return '<li><button type="button" class="btn btn-outline btn-sm" data-p11run="' + esc(r.id) + '">' +
                     esc(L({ ar: 'طباعة', en: 'Print' })) + '</button> ' +
                     esc(r.period || '') + ' — ' + esc(r.docNo || '') + '</li>';
            }).join('') + '</ul>';
            origModal.call(UI, {
              title: L({ ar: 'قسائم الراتب — ' + (emp.name || ''), en: 'Payslips — ' + (emp.name || '') }),
              body: body,
              buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-ghost' }]
            });
            var host = document.getElementById('modalBody');
            if (!host) return;
            host.querySelectorAll('[data-p11run]').forEach(function (b) {
              b.addEventListener('click', function () {
                var r = Store.find('payroll', b.getAttribute('data-p11run'));
                if (!r) return;
                printSlips(r, (r.lines || []).filter(function (l) { return l.employee === emp.id; }));
              });
            });
          });
      }
    } catch (e) { console.error('payslip-print.js: ' + e.message); }
    return out;
  };
  UI.__p11PayslipModalWrapped = true;

  global.PayslipPrint = { printSlips: printSlips, slipHTML: slipHTML, maySee: maySee, VIEWERS: VIEWERS };
  console.info('payslip-print.js: payslip printing installed for payroll viewers only.');
})(window);
