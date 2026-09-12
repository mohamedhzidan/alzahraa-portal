/* =========================================================================
   hr-lines-import.js — الكشوف ذات البنود (المسير، العمالة اليومية، حضور
                        الموقع): صفوف الملف تصبح بنود مستند جديد
   hr-lines-import.js — sheets made of lines (payroll, daily labour, site
                        attendance): the file's rows become the LINES of a
                        new document
   -------------------------------------------------------------------------
   لماذا يختلف عن الموظفين · WHY THIS DIFFERS FROM EMPLOYEES
   مسير الرواتب ليس «صفّاً لكل موظف» في جدول — هو مستند واحد (شهر واحد)
   بداخله بند لكل موظف. زرّ «استيراد» العام كان يقرأ الملف كأنه ترويسات
   مستندات (الشهر، التاريخ…) فلا يطابق شيئاً. هنا: من نفس الزرّ، تُقرأ
   الصفوف بنوداً، ويُفتح نموذج مستند جديد بها — يكمل هو الترويسة (الشهر،
   الموقع) ويضغط حفظ بنفسه، فيبدأ المستند «مسودة» ويمرّ بالاعتماد المعتاد.
   لا شيء يُعتمد ولا يُصرف بالاستيراد.
   A payroll is not "one row per employee" in a table — it is ONE document
   (one month) holding one line per employee. The generic Import read such
   a file as document headers (month, date…) and matched nothing. Here, from
   the SAME button, the rows are read as lines and a NEW document form opens
   with them — he completes the header (month, site) and presses Save
   himself, so the document starts as a draft and goes through the usual
   approval. Nothing is approved or paid by importing.

   🔴 إعادة استيراد نفس الملف · RE-IMPORTING THE SAME FILE
   قبل فتح النموذج نقارن البنود بكل مستند ظاهر له في نفس الشاشة؛ إن وُجد
   مستند بنفس البنود حرفياً قلناه باسمه ولا نفتح إلا بموافقة صريحة — فلا
   يُنشأ مسير ثانٍ لنفس الشهر بالسهو.
   Before opening the form we compare the lines with every document of that
   screen he can see; if one holds exactly the same lines we name it and open
   only on an explicit tick — no second payroll for a month by accident.

   إضافي بالكامل · ADDITIVE — reached only through hr-import-review.js.
   ========================================================================= */
(function (global) {
  'use strict';

  /* hr-excel-screens.js loads before this file, so the helpers exist now —
     never depend on start() having run first (T7 caught that, 10 Sept). */
  var H = global.HRExcel || null;
  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function lab(o) { return o ? (isAr() ? o.ar : o.en) : ''; }
  function num(n) { return global.I18N && I18N.num ? I18N.num(n, 0) : String(n); }

  var LINE_SYNONYMS = {
    payroll: { 'الاساسي': 'basic', 'الراتب الاساسي': 'basic', 'المرتب الاساسي': 'basic', 'الراتب': 'basic', 'بدل انتقال': 'transport', 'بدل الانتقال': 'transport',
      'بدل سكن': 'housing', 'بدل موقع': 'siteAllowance', 'حوافز': 'incentive', 'الحوافز': 'incentive', 'البدلات': 'allowances', 'بدلات اخري': 'allowances',
      'اضافي': 'overtime', 'الاضافي': 'overtime', 'خصومات': 'deductions', 'الخصومات': 'deductions', 'تامينات': 'insurance', 'تامينات الموظف': 'insurance',
      'تامينات الشركة': 'insuranceEmployer', 'ضريبة': 'incomeTax', 'ضريبة كسب العمل': 'incomeTax', 'خصم سلف': 'advanceDeduction', 'سلف': 'advanceDeduction', 'جزاءات': 'penalty' },
    dailyLabour: { 'اسم العامل': 'workerName', 'الاسم': 'workerName', 'العامل': 'workerName', 'الرقم القومي': 'nationalId', 'المهنة': 'trade', 'الحرفة': 'trade',
      'عدد الايام': 'days', 'الايام': 'days', 'اليومية': 'dayRate', 'اجر اليوم': 'dayRate', 'اضافي': 'overtime', 'توقيع': 'signature', 'استلم': 'signature' },
    siteAttendance: { 'الحالة': 'attStatus', 'الحضور': 'checkIn', 'الانصراف': 'checkOut', 'الساعات': 'hours', 'عدد الساعات': 'hours', 'اضافي': 'overtimeHours', 'ملاحظة': 'note', 'ملاحظات': 'note' }
  };
  var LINE_TEXT = { dailyLabour: ['nationalId'], siteAttendance: ['checkIn', 'checkOut'], payroll: [] };

  function lineFields(mod) {
    H = H || global.HRExcel;
    return (mod.lines.fields || []).filter(function (f) { return f.type !== 'calc' && !f.readonly && !(Auth.fieldHidden && Auth.fieldHidden(mod.id, f.name)); });
  }
  function targets(mod) {
    var out = [];
    lineFields(mod).forEach(function (f) {
      if (H.isPersonRef(f)) {
        out.push({ id: f.name + '#code', field: f, sub: 'code', required: true, label: lab(f.label) + ' — ' + L({ ar: 'الرقم الوظيفي', en: 'employee no.' }) });
        out.push({ id: f.name + '#nationalId', field: f, sub: 'nationalId', label: lab(f.label) + ' — ' + L({ ar: 'الرقم القومي', en: 'national ID' }) });
        out.push({ id: f.name + '#name', field: f, sub: 'name', label: lab(f.label) + ' — ' + L({ ar: 'الاسم (للتأكيد)', en: 'name (to confirm)' }) });
      } else out.push({ id: f.name, field: f, sub: null, label: lab(f.label) });
    });
    return out;
  }
  function matchHeading(mod, heading, used) {
    var list = targets(mod);
    var person = list.some(function (x) { return x.sub; }) ? H.SYNONYMS._person : null;
    return H.matchIn(list, mod.lines.fields || [], [LINE_SYNONYMS[mod.id] || null, person], heading, used);
  }

  function fingerprint(lines, fields) {
    return lines.map(function (l) {
      return fields.map(function (f) { var v = l[f.name]; return v === undefined || v === null || v === '' ? '' : String(v); }).join('¦');
    }).sort().join('\n');
  }

  function analyze(st) {
    var mod = st.mod, tlist = targets(mod), tById = {};
    tlist.forEach(function (t) { tById[t.id] = t; });
    var fake = { id: mod.id, fields: lineFields(mod) };
    var cfgText = { text: LINE_TEXT[mod.id] || [] };
    var idx = H.employeeIndex(st.ctx && st.ctx.employees);
    var rows = st.dataRows.map(function (cells, i) {
      var r = { n: i + 2, errors: [], warnings: [], line: {}, person: {} };
      st.mapping.forEach(function (tid, c) {
        if (!tid) return;
        var t = tById[tid]; if (!t) return;
        var s = H.stripInvisible(cells[c]).trim();          /* invisible direction marks never count as content */
        if (s === '' || s === '—' || s === '-' || s === '–') return;
        if (t.sub) { (r.person[t.field.name] = r.person[t.field.name] || {})[t.sub] = s; return; }
        var got = HRImportReview.readValue(fake, cfgText, t.field, s);
        if (got.error) r.errors.push(got.error); else { r.line[t.field.name] = got.value; if (got.warning) r.warnings.push(got.warning); }
      });
      lineFields(mod).forEach(function (f) {
        if (!H.isPersonRef(f)) return;
        var p = r.person[f.name] || {};
        var res = H.resolvePerson(idx, p);
        if (res.employee) { r.line[f.name] = res.employee.id; r.who = (res.employee.code ? res.employee.code + ' — ' : '') + res.employee.name; return; }
        var msg = { 'name-only': L({ ar: 'الاسم وحده لا يكفي — أضف الرقم الوظيفي أو القومي', en: 'a name alone is not enough — add the employee number or national ID' }),
          'code-unknown': L({ ar: 'لا يوجد موظف ظاهر لك بالرقم الوظيفي «' + p.code + '»', en: 'no employee you can see has number "' + p.code + '"' }),
          'code-zero': L({ ar: 'لا يوجد الرقم «' + p.code + '» — لكن يوجد «' + res.near + '». غالباً حذف إكسل الصفر الأول: اجعل العمود «نص». لم نخمّن.', en: 'number "' + p.code + '" does not exist — but "' + res.near + '" does. Excel probably dropped the leading zero: format the column as Text. Not guessed.' }),
          'name-conflict': L({ ar: 'الرقم الوظيفي «' + p.code + '» مسجّل باسم «' + (res.employee && res.employee.name) + '» لا «' + p.name + '» — تعارض', en: 'number "' + p.code + '" belongs to "' + (res.employee && res.employee.name) + '", not "' + p.name + '"' }),
          'none': L({ ar: 'بلا موظف — أضف الرقم الوظيفي', en: 'no employee — add the employee number' }) }[res.error || 'none'] ||
          L({ ar: 'لم يُتعرَّف على الموظف (' + res.error + ')', en: 'employee not recognised (' + res.error + ')' });
        r.errors.push(msg);
      });
      if (mod.id === 'dailyLabour' && !r.line.workerName) r.errors.push(L({ ar: 'بلا اسم عامل', en: 'no worker name' }));
      /* بند مطلوب فارغ (مثل الرقم القومي للعامل اليومي — daily-labour-id.js) يُقال
         هنا قبل فتح النموذج، لا عند الحفظ بعده · a REQUIRED line box left empty is
         said here, before the form opens — not only when saving it later */
      lineFields(mod).forEach(function (f) {
        if (!f.required || H.isPersonRef(f)) return;
        var v = r.line[f.name];
        if (v === undefined || v === null || v === '') r.errors.push(L({ ar: 'مطلوب وفارغ: ' + String(lab(f.label)).replace(/\s*\*\s*$/, ''), en: 'required and empty: ' + String(lab(f.label)).replace(/\s*\*\s*$/, '') }));
      });
      if (!r.errors.length && !Object.keys(r.line).length) r.errors.push(L({ ar: 'صف بلا أي قيمة مقروءة', en: 'a row with no readable value' }));
      r.who = r.who || r.line.workerName || '';
      return r;
    });
    /* نفس الموظف مرتين في كشف واحد · the same person twice in one sheet */
    var seen = {};
    rows.forEach(function (r) {
      var k = r.line.employee || (r.line.nationalId ? 'nid:' + H.keyText(r.line.nationalId) : null);
      if (k && !r.errors.length) (seen[k] = seen[k] || []).push(r);
    });
    Object.keys(seen).forEach(function (k) {
      if (seen[k].length < 2) return;
      var txt = seen[k].map(function (x) { return num(x.n); }).join('، ');
      seen[k].forEach(function (r) { r.errors.push(L({ ar: 'نفس الشخص في أكثر من صف (' + txt + ') — لم نختر', en: 'the same person in more than one row (' + txt + ') — none chosen' })); });
    });
    var good = rows.filter(function (r) { return !r.errors.length; });
    var bad = rows.filter(function (r) { return r.errors.length; });
    /* مستند موجود بنفس البنود حرفياً؟ · an existing document with exactly these lines? */
    var fields = lineFields(mod);
    var fp = fingerprint(good.map(function (r) { return r.line; }), fields);
    var existing = ((st.ctx && st.ctx.docs) || []).filter(function (d) { return d && d.deleted !== true && Array.isArray(d.lines) && d.lines.length === good.length && ['rejected', 'reversed'].indexOf(d.status) === -1; });
    var twin = good.length ? existing.filter(function (d) { return fingerprint(d.lines, fields) === fp; })[0] : null;
    return { rows: rows, good: good, bad: bad, twin: twin };
  }

  function start(moduleId, rows) {
    H = global.HRExcel;
    var mod = Schema.get(moduleId), cfg = H.SCREENS[moduleId];
    if (!Auth.can(moduleId, 'create')) { UI.toast(L({ ar: 'لا تملك صلاحية إنشاء «' + lab(mod.label) + '»', en: 'You may not create "' + lab(mod.label) + '"' }), 'error'); return; }
    var headers = (rows[0] || []).map(function (h) { return String(h == null ? '' : h).trim(); });
    var st = { mod: mod, cfg: cfg, headers: headers, mapping: [], sure: [], confirmTwin: false,
      dataRows: rows.slice(1).filter(function (r) { return r && r.some(function (c) { return H.stripInvisible(c).trim() !== ''; }); }) };
    var used = {};
    headers.forEach(function (h, i) { var t = matchHeading(mod, h, used); st.mapping[i] = t ? t.id : null; st.sure[i] = !!t; if (t) used[t.id] = true; });
    UI.modal({
      title: L({ ar: 'استيراد بنود إلى «' + lab(mod.label) + '» — مراجعة', en: 'Import lines into "' + lab(mod.label) + '" — review' }),
      size: 'wide', body: '<div id="hxLines"><p>' + esc(L({ ar: '… نقرأ الموظفين والمستندات الموجودة من البوابة الآن …', en: '… reading the employees and existing documents from the portal …' })) + '</p></div>',
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        { label: '…', cls: 'btn-primary', disabled: true, onClick: function () { return openDocument(st); } }
      ]
    });
    if (global.HRExcelHideAttach) HRExcelHideAttach();
    /* من الخادم نفسه، لا من مرشِّح المتصفح — نفس سبب hr-import-review.js
       from the server itself, not the browser's filter — same reason as hr-import-review.js */
    /* من لا يفتح شاشة الموظفين (مهندس الموقع مثلاً) يأخذ قائمة الأسماء وحدها — نفس قائمة نموذجه
       a role that cannot open Employees (a site engineer, say) reads the names-only list — the same one its form shows */
    var namesOnly = !(global.Auth && Auth.can && Auth.can('employees', 'view'));
    Promise.all([H.fetchAll(namesOnly ? 'portal_employee_names' : 'portal_employees'), H.fetchAll(mod.table)]).then(function (res) {
      st.ctx = { employees: res[0], docs: res[1] };
      st.a = analyze(st);
      paint(st);
    }).catch(function (e) {
      var host = document.getElementById('hxLines');
      if (host) host.innerHTML = '<div class="alert alert-danger">' + esc(L({ ar: 'تعذّر القراءة من البوابة الآن (يحتاج اتصالاً) — لم يُفتح شيء.', en: 'Could not read from the portal now (needs a connection) — nothing was opened.' })) + ' (' + esc(e && e.message || e) + ')</div>';
    });
  }

  function paint(st) {
    var host = document.getElementById('hxLines'); if (!host) return;
    var a = st.a, mod = st.mod, tlist = targets(mod);
    var h = '<div class="alert alert-info" style="display:block"><strong>' + esc(L({ ar: 'الوجهة: ', en: 'Destination: ' })) + '</strong>' + esc(lab(mod.label)) + ' — ' + esc(lab(st.cfg.what)) +
      '<br>' + esc(L({ ar: 'بعد أن تحفظه تجده في: ', en: 'After you save it you will find it in: ' })) + '<strong>' + esc(lab(st.cfg.where)) + '</strong>' +
      '<br><span class="small muted">' + esc(L({ ar: 'لا يُحفظ شيء في هذه الخطوة — نفتح نموذجاً جديداً بالبنود، وأنت تكمل الترويسة وتضغط حفظ.', en: 'Nothing is saved in this step — we open a new form with the lines; you complete the header and press Save.' })) + '</span></div>';
    var used = {};
    st.mapping.forEach(function (t) { if (t) used[t] = true; });
    h += '<div class="table-wrap" style="max-height:220px;overflow:auto"><table class="data-table"><thead><tr><th>' + esc(L({ ar: 'عمود ملفك', en: 'Your column' })) + '</th><th>' + esc(L({ ar: 'يُقرأ كـ', en: 'Read as' })) + '</th></tr></thead><tbody>' +
      st.headers.map(function (hd, i) {
        var o = '<option value="">' + esc(L({ ar: '— تجاهل —', en: '— ignore —' })) + '</option>' + tlist.map(function (t) {
          return (used[t.id] && st.mapping[i] !== t.id) ? '' : '<option value="' + esc(t.id) + '"' + (st.mapping[i] === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>';
        }).join('');
        var comp = !st.mapping[i] && H.computedField(mod.lines.fields, hd);
        if (comp) return '<tr><td>' + esc(hd) + '</td><td class="small" style="color:#667">' + esc(L({ ar: '«' + lab(comp.label) + '» تحسبه البوابة بنفسها — لا يُستورد', en: '"' + lab(comp.label) + '" is computed by the portal — not imported' })) + '</td></tr>';
        return '<tr' + (st.sure[i] ? '' : ' style="background:#fff8e6"') + '><td>' + esc(hd) + '</td><td><select data-hx-line="' + i + '">' + o + '</select>' + (st.sure[i] ? ' <span style="color:#1b7f4b">✓</span>' : ' <span style="color:#8a6100">؟</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    h += '<div id="hxLinesSummary" data-good="' + a.good.length + '" data-bad="' + a.bad.length + '" data-twin="' + esc(a.twin ? (a.twin.docNo || a.twin.id) : '') + '" class="alert ' + (a.bad.length ? 'alert-warn' : 'alert-info') + '"><strong>' + esc(L({ ar: 'بنود سليمة: ', en: 'Good lines: ' })) + num(a.good.length) + ' · ' +
      '<span style="color:#b42318">' + esc(L({ ar: 'لن تدخل: ', en: 'Will not go in: ' })) + num(a.bad.length) + '</span></strong></div>';
    if (a.twin) {
      h += '<label class="alert alert-danger" style="display:block"><input type="checkbox" id="hxTwin"' + (st.confirmTwin ? ' checked' : '') + '> ' +
        esc(L({ ar: 'نفس هذه البنود حرفياً موجودة بالفعل في المستند ' + (a.twin.docNo || '') + ' (' + (a.twin.period || a.twin.date || '') + '). افتح مستنداً جديداً رغم ذلك؟', en: 'These exact lines already exist in document ' + (a.twin.docNo || '') + ' (' + (a.twin.period || a.twin.date || '') + '). Open a new document anyway?' })) + '</label>';
    }
    if (a.bad.length) {
      h += '<h4>' + esc(L({ ar: '✗ لن تدخل — وسببها', en: '✗ Will not go in — and why' })) + '</h4><div class="table-wrap" style="max-height:200px;overflow:auto"><table class="data-table"><tbody>' +
        a.bad.map(function (r) { return '<tr><td class="num">' + num(r.n) + '</td><td>' + esc(r.who || '') + '</td><td class="small" style="color:#b42318">' + r.errors.map(esc).join('<br>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    var shown = lineFields(mod).filter(function (f) { return a.good.some(function (r) { return r.line[f.name] !== undefined; }); });
    h += '<h4>' + esc(L({ ar: '✓ البنود التي ستُفتح في النموذج', en: '✓ Lines that will open in the form' })) + '</h4><div class="table-wrap" style="max-height:260px;overflow:auto"><table class="data-table"><thead><tr><th>#</th>' +
      shown.map(function (f) { return '<th>' + esc(lab(f.label)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      a.good.map(function (r) { return '<tr><td class="num">' + num(r.n) + '</td>' + shown.map(function (f) { var v = r.line[f.name]; return '<td>' + esc(H.isPersonRef(f) ? r.who : (v === undefined ? '' : (f.type === 'select' ? Schema.optionLabel(f, v) : v))) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
    host.innerHTML = h;
    host.querySelectorAll('select[data-hx-line]').forEach(function (s) {
      s.addEventListener('change', function () { st.mapping[+s.getAttribute('data-hx-line')] = s.value || null; st.a = analyze(st); paint(st); });
    });
    var tw = document.getElementById('hxTwin');
    if (tw) tw.addEventListener('change', function () { st.confirmTwin = !!tw.checked; paintBtn(st); });
    paintBtn(st);
  }
  function paintBtn(st) {
    var b = document.querySelector('#modalFoot .btn-primary'); if (!b) return;
    var n = st.a.good.length;
    b.textContent = n ? L({ ar: 'افتح ' + lab(st.mod.label) + ' جديداً بـ ' + num(n) + ' بنداً', en: 'Open a new ' + lab(st.mod.label) + ' with ' + n + ' lines' }) : L({ ar: 'لا بنود سليمة', en: 'No good lines' });
    b.disabled = !n || (st.a.twin && !st.confirmTwin);
  }
  function openDocument(st) {
    var lines = st.a.good.map(function (r) { return Object.assign({}, r.line); });
    if (!lines.length) return false;
    UI.closeModal();
    EntityPage.openForm(st.mod.id, null, { lines: lines });
    return false;      /* keep the form that openForm just opened (same pattern as sheets-templates.js) */
  }

  global.HRLinesImport = { start: start, analyze: analyze, targets: targets, matchHeading: matchHeading };
})(window);
