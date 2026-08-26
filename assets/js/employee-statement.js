/* =========================================================================
   employee-statement.js — كشف حساب الموظف
                           The employee account statement
   -------------------------------------------------------------------------
   المصدر · SOURCE — أول سطر كتبه أ. محمد عمارة في ورقته، قبل أي سؤال:

       «ربط بيانات الموارد البشرية الخاصة بالموظفين بالإدارة المالية
        عمل كشف حساب لكل موظف لتسجيل السلف وخصمها»

   The first line Mohamed Amara wrote on his sheet, before a single question:
   "link employee HR data to the financial side · build an account statement
   for every employee recording advances and their deduction."

   -------------------------------------------------------------------------
   الجزء الصعب كان مكتوباً بالفعل · THE HARD PART WAS ALREADY WRITTEN

   hr-department.js:483 فيها دالة statement كاملة وسليمة: كل سلفة أُخذت،
   كل قسط خُصم فعلاً من مسير رواتب معتمد، والرصيد الجاري بينهما. وتحرس
   عمداً ضد أخطر خطأ ممكن في مثل هذه الشاشة — عدّ التسديد مرتين فيظهر
   الموظف مديناً بأقل مما عليه.

   **ولا شيء في الموقع كله يناديها.** لا شاشة، لا زر، لا دور. بحثنا في
   كل الملفات. الشيفرة تعمل منذ أن كُتبت، ولا يمكن لأحد الوصول إليها.

   hr-department.js:483 holds a complete, correct `statement` function: every
   advance taken, every instalment actually deducted from an approved payroll
   run, and the running balance between them. It deliberately guards against
   the most dangerous error such a screen can make — double-counting a
   repayment and showing someone owing less than they do.

   **Nothing in the entire portal calls it.** No screen, no button, no role —
   searched every file. It has worked since the day it was written and has
   been reachable from nowhere.

   هذا الملف يفتح الباب فقط. لا يعيد حساب شيء.
   This file only opens the door. It recalculates nothing.

   -------------------------------------------------------------------------
   أين يظهر · WHERE IT APPEARS

   ١) داخل شاشة تفاصيل الموظف — «كشف الحساب» أسفل بياناته.
   ٢) داخل شاشة تفاصيل السلفة — كشف حساب صاحبها كاملاً، حتى يرى من يعتمد
      السلفة ما على الموظف بالفعل **قبل** أن يوقّع.
   ٣) زر طباعة — الكشف على ورقة، للتوقيع أو للملف.

   1) Inside the employee detail view — their statement, under their data.
   2) Inside the advance detail view — the full statement of the person
      concerned, so whoever approves an advance sees what they already owe
      BEFORE signing it.
   3) A print button — the statement on paper, for signature or the file.

   -------------------------------------------------------------------------
   🔒 الخصوصية · PRIVACY — لا استثناء

   DECISIONS.md: «بيانات الموظفين ملك للموارد البشرية. المرتبات والأرقام
   القومية والحسابات البنكية والسلف يراها hr · hr_manager · gm · admin ·
   finance_manager · auditor — لا أحد غيرهم.»

   فالكشف لا يُبنى إطلاقاً إلا لمن يملك رؤية شاشة سلف الموظفين
   (Auth.canSee('employeeAdvances')). أمين المخزن أو مهندس الموقع الذي
   يفتح ملف موظف لا يرى هذا القسم موجوداً أصلاً.

   The statement is not built at all unless the viewer can see the employee
   advances screen. A storekeeper or site engineer opening an employee record
   does not see this section exist.

   وطبقة القاعدة تحرس نفس الشيء بعد 23-CLOSE-HR-SECURITY-HOLE.sql: من لا
   يملك القراءة لا تصله الصفوف أصلاً، فلا يوجد ما يُحسب منه.
   The database enforces the same after 23-CLOSE-HR-SECURITY-HOLE.sql: rows
   never reach an account without read rights, so there is nothing to compute
   from in the first place.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف الملف فيختفي القسم والزر، ولا يتغير رقم
   واحد في أي مكان — لأن هذا الملف لا يكتب شيئاً إطلاقاً، يقرأ فقط.
   Delete the file and the panel and button disappear, and not one figure
   changes anywhere — this file never writes, it only reads.

   يُحمَّل بعد pages/entity.js (يلفّ openDetail) وبعد advance-balance.js
   Load after pages/entity.js (it wraps openDetail) and after advance-balance.js
   ========================================================================= */
(function (global) {
  'use strict';

  function L(o) { return (global.I18N && I18N.L) ? I18N.L(o) : (o && (o.ar || o.en)) || ''; }
  function ar() { return !global.I18N || I18N.getLang() === 'ar'; }
  function esc(v) { return global.UI ? UI.esc(v) : String(v == null ? '' : v); }
  function money(v) { return global.I18N ? I18N.money(v) : String(v); }
  function date(v) { return global.I18N ? I18N.date(v) : String(v || ''); }

  function allowed() {
    return !!(global.Auth && Auth.canSee && Auth.canSee('employeeAdvances'));
  }

  function nameOf(employeeId) {
    var e = global.Store && Store.find('employees', employeeId);
    return (e && e.name) || '';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الكشف نفسه — قراءة خالصة من hr-department.js
     ═══════════════════════════════════════════════════════════════════ */
  function data(employeeId) {
    if (!allowed() || !employeeId) return null;
    if (!global.HRDepartment || !HRDepartment.statement) return null;
    try { return HRDepartment.statement(employeeId); } catch (e) {
      console.warn('[employee-statement] statement failed', e);
      return null;
    }
  }

  function summaryHTML(st) {
    var A = ar();
    var owed = Number(st.outstanding) || 0;
    var tone = owed > 0 ? '#b42318' : '#177245';
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px">' +
      box(A ? 'إجمالي ما صُرف' : 'Total advanced', money(st.totalAdvanced), '#334') +
      box(A ? 'إجمالي ما خُصم' : 'Total deducted', money(st.totalRepaid), '#334') +
      box(A ? 'المتبقي على الموظف' : 'Still owed', money(owed), tone) +
      '</div>';
  }

  function box(label, value, colour) {
    return '<div style="flex:1 1 150px;border:1px solid #dfe3e8;border-radius:9px;padding:9px 12px">' +
      '<div style="font-size:12px;color:#667">' + esc(label) + '</div>' +
      '<div class="num" style="font-size:18px;font-weight:700;color:' + colour + '">' +
      value + '</div></div>';
  }

  function linesHTML(st) {
    var A = ar();
    if (!st.lines.length) {
      return '<p class="small muted">' +
        esc(A ? 'لا توجد سلف مسجَّلة على هذا الموظف.' : 'No advances recorded for this employee.') +
        '</p>';
    }
    var h = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>' + esc(A ? 'التاريخ' : 'Date') + '</th>' +
      '<th>' + esc(A ? 'المستند' : 'Document') + '</th>' +
      '<th>' + esc(A ? 'البيان' : 'Description') + '</th>' +
      '<th>' + esc(A ? 'صُرف' : 'Advanced') + '</th>' +
      '<th>' + esc(A ? 'خُصم' : 'Deducted') + '</th>' +
      '<th>' + esc(A ? 'الرصيد' : 'Balance') + '</th>' +
      '</tr></thead><tbody>';

    st.lines.forEach(function (l) {
      h += '<tr>' +
        '<td class="num">' + esc(date(l.date)) + '</td>' +
        '<td class="num">' + esc(l.docNo || '—') + '</td>' +
        '<td>' + esc(L(l.label)) + '</td>' +
        '<td class="money">' + (l.debit ? money(l.debit) : '—') + '</td>' +
        '<td class="money">' + (l.credit ? money(l.credit) : '—') + '</td>' +
        '<td class="money"><strong>' + money(l.balance) + '</strong></td>' +
        '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function noteHTML(employeeId) {
    var A = ar();
    var ix = global.AdvanceBalance && AdvanceBalance.forEmployee(employeeId);
    var h = '<p class="small muted" style="margin-top:8px">' + esc(A
      ? 'الخصم يُحتسب من مسيرات الرواتب المعتمدة فقط — لا من مسير تحت الإعداد.'
      : 'Deductions count only from APPROVED payroll runs, never from one still being prepared.') +
      '</p>';
    if (ix && ix.overRepaid > 0) {
      h += '<div class="alert alert-warn" style="margin-top:8px"><span>' + esc(A
        ? 'انتبه: خُصم من المسير ' + money(ix.overRepaid) + ' أكثر من قيمة السلف المسجَّلة. ' +
          'إمّا أن سلفة لم تُسجَّل، أو أن الخصم زائد.'
        : 'Note: payroll deducted ' + money(ix.overRepaid) + ' more than the recorded advances. ' +
          'Either an advance was never recorded, or the deduction is too high.') +
        '</span></div>';
    }
    return h;
  }

  function panelHTML(employeeId) {
    var st = data(employeeId);
    if (!st) return '';
    var A = ar();
    return '<div class="card mb-2" id="azEmpStatement">' +
      '<div class="card-head">' +
        '<h3 class="card-title">' + (global.UI ? UI.icon('banknote', 17) : '') + ' ' +
          esc(A ? 'كشف حساب الموظف — السلف وخصمها' : 'Employee statement — advances and deductions') +
          (st.employeeName ? ' · ' + esc(st.employeeName) : '') + '</h3>' +
        '<button class="btn btn-outline btn-sm" id="azEmpStatementPrint" data-emp="' +
          (global.UI ? UI.attr(employeeId) : employeeId) + '">' +
          (global.UI ? UI.icon('printer', 15) : '') + ' ' + esc(A ? 'طباعة' : 'Print') + '</button>' +
      '</div>' +
      '<div class="card-body">' + summaryHTML(st) + linesHTML(st) + noteHTML(employeeId) + '</div>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · الطباعة — نافذة مستقلة، لا تعتمد على print.js
        (print.js مبنيّ حول سجل واحد له workflow؛ الكشف مشتق لا سجل)
        A standalone window: print.js is built around a single workflow
        record, and a statement is derived, not stored.
     ═══════════════════════════════════════════════════════════════════ */
  function printStatement(employeeId) {
    var st = data(employeeId);
    if (!st) return;
    var A = ar();
    /* اسم الشركة من نفس المكان الذي يقرأه print.js:105 بالضبط.
       Company name read from exactly where print.js:105 reads it. */
    var meta = (global.Store && Store.meta && Store.meta().company) || {};
    var company = (A ? meta.name : (meta.nameEn || meta.name)) ||
                  'شركة الزهراء للمقاولات العامة';
    var title = (A ? 'كشف حساب موظف — ' : 'Employee statement — ') + (st.employeeName || '');

    var html =
      '<!doctype html><html dir="' + (A ? 'rtl' : 'ltr') + '" lang="' + (A ? 'ar' : 'en') + '"><head>' +
      '<meta charset="utf-8"><title>' + esc(title) + '</title><style>' +
      'body{font:13px/1.7 Tahoma,Arial,sans-serif;margin:26px;color:#12211c}' +
      'h1{font-size:17px;margin:0 0 2px}h2{font-size:14px;margin:0 0 16px;font-weight:400;color:#555}' +
      'table{width:100%;border-collapse:collapse;margin-top:12px}' +
      'th,td{border:1px solid #bbb;padding:6px 8px;text-align:' + (A ? 'right' : 'left') + '}' +
      'th{background:#eee}.n{text-align:' + (A ? 'left' : 'right') + ';font-variant-numeric:tabular-nums}' +
      '.tot{font-weight:700;background:#f4f4f4}' +
      '.sig{margin-top:34px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #333;padding-top:5px}' +
      '</style></head><body>' +
      '<h1>' + esc(company) + '</h1>' +
      '<h2>' + esc(A ? 'كشف حساب موظف — السلف وخصمها' : 'Employee statement — advances and deductions') +
        ' · ' + esc(st.employeeName || '') +
        ' · ' + esc(date(new Date().toISOString().slice(0, 10))) + '</h2>' +
      '<table><thead><tr>' +
        '<th>' + esc(A ? 'التاريخ' : 'Date') + '</th>' +
        '<th>' + esc(A ? 'المستند' : 'Document') + '</th>' +
        '<th>' + esc(A ? 'البيان' : 'Description') + '</th>' +
        '<th class="n">' + esc(A ? 'صُرف' : 'Advanced') + '</th>' +
        '<th class="n">' + esc(A ? 'خُصم' : 'Deducted') + '</th>' +
        '<th class="n">' + esc(A ? 'الرصيد' : 'Balance') + '</th>' +
      '</tr></thead><tbody>';

    st.lines.forEach(function (l) {
      html += '<tr><td class="n">' + esc(date(l.date)) + '</td><td class="n">' + esc(l.docNo || '—') +
        '</td><td>' + esc(L(l.label)) + '</td><td class="n">' + (l.debit ? esc(money(l.debit)) : '—') +
        '</td><td class="n">' + (l.credit ? esc(money(l.credit)) : '—') +
        '</td><td class="n">' + esc(money(l.balance)) + '</td></tr>';
    });

    html += '<tr class="tot"><td colspan="3">' + esc(A ? 'الإجمالي' : 'Total') + '</td>' +
      '<td class="n">' + esc(money(st.totalAdvanced)) + '</td>' +
      '<td class="n">' + esc(money(st.totalRepaid)) + '</td>' +
      '<td class="n">' + esc(money(st.outstanding)) + '</td></tr>' +
      '</tbody></table>' +
      '<p><strong>' + esc(A ? 'المتبقي على الموظف: ' : 'Still owed by the employee: ') +
        esc(money(st.outstanding)) + '</strong></p>' +
      '<div class="sig"><div>' + esc(A ? 'الموظف' : 'Employee') + '</div>' +
        '<div>' + esc(A ? 'الموارد البشرية' : 'Human resources') + '</div>' +
        '<div>' + esc(A ? 'الحسابات' : 'Accounts') + '</div></div>' +
      '</body></html>';

    var w = global.open('', '_blank');
    if (!w) {
      if (global.UI && UI.toast) {
        UI.toast(A ? 'المتصفح منع فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة لهذا الموقع.'
                   : 'The browser blocked the print window — allow pop-ups for this site.',
                 'error', 6000);
      }
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الحقن في شاشتَي التفاصيل — نفس أسلوب attachments.js المُثبت
        Injected into both detail views — the same proven technique
        attachments.js already uses (#modalBody, after the modal renders)
     ═══════════════════════════════════════════════════════════════════ */
  function employeeIdFor(moduleId, id) {
    if (!global.Schema || !global.Store) return null;
    var mod = Schema.get(moduleId);
    if (!mod) return null;
    if (mod.table === 'employees') return id;
    if (mod.table === 'employeeAdvances') {
      var rec = Store.find('employeeAdvances', id);
      return (rec && rec.employee) || null;
    }
    return null;
  }

  function inject(moduleId, id) {
    if (!allowed()) return;
    var body = document.getElementById('modalBody');
    if (!body || document.getElementById('azEmpStatement')) return;

    var employeeId = employeeIdFor(moduleId, id);
    if (!employeeId) return;

    var html = panelHTML(employeeId);
    if (!html) return;

    var div = document.createElement('div');
    div.innerHTML = html;
    body.appendChild(div.firstChild);

    var btn = document.getElementById('azEmpStatementPrint');
    if (btn) btn.onclick = function () { printStatement(btn.getAttribute('data-emp')); };
  }

  function install() {
    if (!global.EntityPage || EntityPage.__azStatementInstalled) return;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      /* ١٦٠ مللي ثانية: بعد attachments.js (١٢٠) فيظهر الكشف تحت المرفقات
         لا فوقها. 160ms: after attachments.js's 120, so the statement lands
         below the attachments panel rather than above it. */
      setTimeout(function () { try { inject(moduleId, id); } catch (e) {} }, 160);
    };
    EntityPage.__azStatementInstalled = true;
    console.info('employee-statement.js ready — HRDepartment.statement is reachable at last: ' +
                 'open an employee or an advance to see the account statement.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else { install(); }
  setTimeout(install, 1500);   /* in case entity.js loads after us */

  global.EmployeeStatement = {
    data: data, html: panelHTML, print: printStatement,
    /* افحص يدوياً من الـ console: EmployeeStatement.check()
       Manual check from the console: EmployeeStatement.check() */
    check: function () {
      if (!allowed()) { console.warn('[employee-statement] this account cannot see advances'); return []; }
      var seen = {}, rows = [];
      Store.all('employeeAdvances').forEach(function (a) {
        if (!a.employee || seen[a.employee]) return;
        seen[a.employee] = true;
        var st = data(a.employee);
        if (st) rows.push({ employee: st.employeeName || nameOf(a.employee),
                            advanced: st.totalAdvanced, deducted: st.totalRepaid,
                            stillOwed: st.outstanding, entries: st.lines.length });
      });
      rows.sort(function (x, y) { return y.stillOwed - x.stillOwed; });
      console.table(rows);
      return rows;
    }
  };
})(window);
