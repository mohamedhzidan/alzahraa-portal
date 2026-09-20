/* =========================================================================
   insurance-sheet.js — كشف التأمينات الشهري، من المسير المعتمد
   insurance-sheet.js — the monthly insurance sheet, off a payroll run.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN: تفاصيل مسير الرواتب ← «كشف التأمينات».
   ملفٌ يُسلَّم للتأمينات: لكل موظف أجر الاشتراك المسجَّل، وحصته، وحصة الشركة.
   The payroll run's detail → «كشف التأمينات». A file to hand to the
   insurance office: each employee's REGISTERED wage, their share, and the
   company's.

   🔴 الأجر يُقرأ من الجدول الأصلي لا من العرض ═══════════════════════════
      لو قُرئ من صفوف الموظفين في المتصفح لخرج الكشف بـ٣٠٠٠ للجميع مهما
      كان المسجَّل (عطل HX-23) — وهذا كشفٌ يذهب إلى جهةٍ حكومية. فيُقرأ
      الأجر بطلبٍ مباشر على `employees`، خمسين معرّفاً في الطلب، بنفس
      أسلوب `hr-import-review.js:404-420` المُثبَت. فيصحّ الكشف حتى لو لم
      يُشغَّل ملف رقعة العرض بعد.
   🔴 THE WAGE IS READ FROM THE BASE TABLE, NEVER FROM THE VIEW.
      Read from the browser's employee rows it would print 3,000 for
      EVERYONE whatever is registered (fault HX-23) — and this sheet goes to
      a government office. So the wage is fetched directly from `employees`,
      50 ids per request, the proven `hr-import-review.js:404-420` pattern.
      The sheet is therefore right even if the view patch has not been run.

   ما لا يفعله · WHAT IT DOES NOT DO:
     · لا يحسب الحصص بنفسه — يطلبها من `az_p11_insurance` في القاعدة، وهي
       نفسها التي تحسب بها بنود المسير. حسبةٌ ثانية في المتصفح تفترق.
       It does NOT compute the shares — it asks `az_p11_insurance` in the
       database, the same function the run's own lines were built with. A
       second sum in the browser would drift.

   إضافيّ بالكامل · WHOLLY ADDITIVE.  v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  var missing = [];
  ['Schema', 'Auth', 'Store', 'UI', 'I18N'].forEach(function (k) { if (!global[k]) missing.push(k); });
  if (!missing.length) {
    ['esc', 'toast', 'modal', 'exportCSV'].forEach(function (f) { if (typeof UI[f] !== 'function') missing.push('UI.' + f); });
    if (typeof Auth.client !== 'function') missing.push('Auth.client');
  }
  if (missing.length) {
    console.error('insurance-sheet.js NOT installed — missing: ' + missing.join(', ') +
                  '. No insurance-sheet button will appear, deliberately: a sheet going to the insurance ' +
                  'office with wrong wages would be worse than no sheet.');
    return;
  }
  if (UI.__p11InsuranceSheet) return;
  UI.__p11InsuranceSheet = true;

  var VIEWERS = ['hr', 'hr_manager', 'finance_manager', 'gm', 'admin', 'breakglass'];
  var ar = function () { return I18N.getLang() === 'ar'; };
  var L = function (o) { return I18N.L ? I18N.L(o) : (ar() ? o.ar : o.en); };
  var n2 = function (v) { return Math.round((Number(v) || 0) * 100) / 100; };

  function maySee() {
    var u = Auth.current && Auth.current();
    return !!(u && VIEWERS.indexOf(u.role) !== -1);
  }

  /* ═══ ١ · أجر الاشتراك من الجدول الأصلي، خمسين في الطلب ══════════════ */
  async function registeredWages(ids) {
    var out = {};
    var client = Auth.client();
    if (!client || !ids.length) return out;
    var failed = 0;
    for (var i = 0; i < ids.length; i += 50) {
      var res = null;
      try { res = await client.from('employees').select('id,insuranceWage').in('id', ids.slice(i, i + 50)); }
      catch (e) { failed += Math.min(50, ids.length - i); continue; }
      if (!res || res.error) { failed += Math.min(50, ids.length - i); continue; }
      (res.data || []).forEach(function (r) { out[r.id] = r.insuranceWage; });
    }
    /* 🔴 دفعةٌ فشلت تعني أسماءً بلا أجر مسجَّل — يُقال بصوتٍ عالٍ ولا يُكمَل
       بصمت بالافتراضي، لأن الكشف يذهب إلى جهة حكومية.
       🔴 A failed chunk means names with no registered wage — SAID loudly,
       never quietly filled with the default, because this sheet leaves the
       company. */
    if (failed) out.__failed = failed;
    return out;
  }

  /* ═══ ٢ · الحصص من القاعدة، لا من هنا ════════════════════════════════ */
  async function sharesFor(wages) {
    var client = Auth.client();
    var out = {};
    for (var i = 0; i < wages.length; i++) {
      var rpc = await client.rpc('az_p11_insurance', { p_wage: wages[i] === null || wages[i] === undefined ? null : wages[i] });
      if (rpc.error) continue;
      var row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      if (row) out[String(wages[i])] = row;
    }
    return out;
  }

  /* ═══ ٣ · الكشف ══════════════════════════════════════════════════════ */
  async function build(run) {
    var A = ar();
    var lines = (run.lines || []).filter(function (l) { return l.employee; });
    if (!lines.length) {
      UI.toast(L({ ar: 'لا بنود في هذا المسير', en: 'This run has no lines' }), 'warn', 5000);
      return null;
    }
    var wages = await registeredWages(lines.map(function (l) { return l.employee; }));
    if (wages.__failed) {
      UI.toast(L({
        ar: 'تعذّر قراءة أجر الاشتراك لـ ' + wages.__failed + ' موظف — الكشف لم يُبنَ. أعد المحاولة.',
        en: 'Could not read the registered wage for ' + wages.__failed + ' employee(s) — the sheet was NOT built. Try again.'
      }), 'error', 9000);
      return null;
    }
    var distinct = [];
    lines.forEach(function (l) {
      var w = wages[l.employee];
      var k = (w === null || w === undefined) ? null : Number(w);
      if (distinct.indexOf(k) === -1) distinct.push(k);
    });
    var shares = await sharesFor(distinct);

    var rows = lines.map(function (l) {
      var e = Store.find('employees', l.employee) || {};
      var w = wages[l.employee];
      var sh = shares[String(w === null || w === undefined ? null : Number(w))] || {};
      return [
        e.code || '', e.name || l.employee, e.insuranceNo || '',
        n2(sh.wage_used), n2(sh.employee_share), n2(sh.company_share),
        sh.used_default ? L({ ar: 'الحد الافتراضي', en: 'default floor' }) : ''
      ];
    });
    var totalEmp = rows.reduce(function (s, r) { return n2(s + r[4]); }, 0);
    var totalCo = rows.reduce(function (s, r) { return n2(s + r[5]); }, 0);
    return {
      period: run.period, docNo: run.docNo, rows: rows,
      totalEmployee: totalEmp, totalCompany: totalCo, count: rows.length
    };
  }

  var HEADERS = function () {
    var A = ar();
    return [
      A ? 'الكود' : 'Code', A ? 'الاسم' : 'Name', A ? 'الرقم التأميني' : 'Insurance no.',
      A ? 'أجر الاشتراك' : 'Registered wage', A ? 'حصة الموظف' : 'Employee share',
      A ? 'حصة الشركة' : 'Company share', A ? 'ملاحظة' : 'Note'
    ];
  };

  function download(sheet) {
    var A = ar();
    var name = (A ? 'كشف-التأمينات-' : 'insurance-sheet-') + (sheet.period || '');
    var headers = HEADERS();
    /* المُصدِّر إن وُجد، وإلا CSV — والاثنان يخرجان بنفس الأعمدة والأرقام.
       The writer if it is present, otherwise CSV — same columns, same figures.
       (xlsx-writer.js is live now, but the fallback stays: this file must not
       stop working if load order ever changes.) */
    if (global.XlsxWriter && typeof XlsxWriter.build === 'function') {
      XlsxWriter.download(XlsxWriter.build({
        title: 'insurance',
        sheets: [{
          name: A ? 'التأمينات' : 'Insurance',
          columns: [
            { header: headers[0], type: 'text', width: 12 }, { header: headers[1], type: 'text', width: 30 },
            { header: headers[2], type: 'text', width: 16 }, { header: headers[3], type: 'number', width: 14 },
            { header: headers[4], type: 'number', width: 14 }, { header: headers[5], type: 'number', width: 14 },
            { header: headers[6], type: 'text', width: 16 }
          ],
          rows: sheet.rows.concat([[
            '', A ? 'الإجمالي' : 'Total', '', '', sheet.totalEmployee, sheet.totalCompany, ''
          ]])
        }]
      }), name);
      return 'xlsx';
    }
    UI.exportCSV(name, headers, sheet.rows.concat([['', A ? 'الإجمالي' : 'Total', '', '', sheet.totalEmployee, sheet.totalCompany, '']]));
    return 'csv';
  }

  /* ═══ ٤ · الزرّ — على تفاصيل المسير، عبر UI.modal (فخّ السجلّ) ═══════ */
  var PAYROLL_LABEL = (function () { var m = Schema.get('payroll'); return m && m.label ? L(m.label) : null; })();

  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    try {
      if (!maySee() || !PAYROLL_LABEL) return out;
      var title = opts && opts.title ? String(opts.title) : '';
      if (title.indexOf(PAYROLL_LABEL) !== 0 || title.indexOf(' — ') === -1) return out;
      var run = Store.all('payroll').filter(function (r) { return r.docNo === title.split(' — ').pop().trim(); })[0];
      if (!run || !(run.lines || []).length) return out;
      var foot = document.getElementById('modalFoot');
      if (!foot) return out;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-outline btn-sm';
      b.textContent = L({ ar: 'كشف التأمينات', en: 'Insurance sheet' });
      b.title = L({
        ar: 'أجر الاشتراك المسجَّل لكل موظف وحصته وحصة الشركة — يُقرأ من ملف الموظف لا من الشاشة',
        en: 'Each employee\'s registered wage and both shares — read from the employee record, not the screen'
      });
      b.addEventListener('click', async function () {
        b.disabled = true;
        try {
          var sheet = await build(run);
          if (sheet) {
            var how = download(sheet);
            UI.toast(L({
              ar: 'كشف التأمينات: ' + sheet.count + ' موظف · حصة الموظفين ' + I18N.money(sheet.totalEmployee) +
                  ' · حصة الشركة ' + I18N.money(sheet.totalCompany),
              en: 'Insurance sheet: ' + sheet.count + ' employees · employees ' + I18N.money(sheet.totalEmployee) +
                  ' · company ' + I18N.money(sheet.totalCompany)
            }), 'success', 8000);
          }
        } finally { b.disabled = false; }
      });
      /* أوّل الأزرار — والتجارب تختار بالنصّ لا بالموضع (فخّ مسجَّل).
         First in the footer — trials pick BY TEXT, never by position. */
      foot.insertBefore(b, foot.firstChild);
    } catch (e) { console.error('insurance-sheet.js: ' + e.message); }
    return out;
  };
  UI.__p11InsuranceSheetModalWrapped = true;

  global.InsuranceSheet = { build: build, download: download, registeredWages: registeredWages, maySee: maySee };
  console.info('insurance-sheet.js: the monthly insurance sheet is installed (wage read from the base table).');
})(window);
