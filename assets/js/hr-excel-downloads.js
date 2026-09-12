/* =========================================================================
   hr-excel-downloads.js — «⬇ ملف نموذجي» و«تصدير» في شاشات الموارد البشرية
                           يصبحان ملفّي إكسل حقيقيين
   hr-excel-downloads.js — on HR screens, «⬇ Template» and «Export» produce
                           GENUINE Excel workbooks
   -------------------------------------------------------------------------
   عمارة بكلماته: «لما عايز أصدر إكسل أنا عايز كل بيان في خلية لوحده… عشان
   مش هنرجع ندخل على بيفوت تيبل». وعن القالب: «المفروض فيه نموذج إكسل بيطلع
   من البرنامج نفسه… بحط كل البيانات في مكانها».
   Omara: "when I export I want every detail in its own cell… so we don't go
   back into pivot tables". And on the template: "there should be an Excel
   form that comes out of the program itself… I put every detail in its
   place".

   التصدير · EXPORT — نفس الصفوف، نفس الترتيب، نفس الأعمدة كما اليوم؛ الذي
   يتغيّر هو الملف فقط: خلايا حقيقية بأنواعها، ورقة «عن هذا الملف» تقول هل
   القائمة مصفّاة وما أعمدتها. نستدعي زرّ التصدير الأصلي نفسه ونلتقط ما
   كان سيكتبه، ونقارنه صفاً صفاً بما نحسبه — فإن اختلفا كتبنا ما كان سيكتبه
   هو حرفياً، كل قيمة في خليتها، وقلنا ذلك في الملف.
   The SAME rows, order and columns as today; only the file changes: real
   typed cells, plus an «about this file» sheet saying whether the list was
   filtered and which columns it holds. We call the ORIGINAL export button,
   capture what it would have written, and compare it row by row with what
   we compute — if the two disagree we write exactly what it would have
   written, one value per cell, and say so in the file.

   القالب · TEMPLATE — ورقة البيانات أولاً (هي ما يقرؤه الاستيراد)، ثم
   «التعليمات»، ثم «أمثلة — لا تُستورد» في ورقة منفصلة فلا يُستورد مثال
   كموظف أبداً، ثم «قوائم» مخفية للمنسدلات. أعمدة الأرقام التي هي أسماء
   مُنسَّقة «نص» فلا يحذف إكسل صفراً حين يكتب فيها.
   Data sheet FIRST (it is what the import reads), then «التعليمات», then
   «أمثلة — لا تُستورد» on its own sheet so an example can never import as a
   person, then a hidden «قوائم» for the dropdowns. Number-like identifier
   columns are formatted Text, so Excel drops no zero as he types.

   🔴 لا يكشف القالب شيئاً لا يراه صاحبه: المواقع التي يجوز له الكتابة فيها
   فقط، والمشروعات الظاهرة له فقط، وحقل لا يملك قراءته لا يظهر عموداً.
   ولا قائمة بأسماء الموظفين داخله — الموظف يُكتب برقمه.
   🔴 The template reveals nothing its owner cannot see: only sites he may
   write to, only projects visible to him, no column for a field his role
   may not read — and never a list of staff names inside it; a person is
   written by number.

   إضافي بالكامل · ADDITIVE — rebinds the two buttons on HR screens only
   (the same way import-documents.js rebinds Import). Every other screen and
   every other caller of UI.exportCSV is untouched. Delete this file and
   both buttons return to CSV exactly as today.
   ========================================================================= */
(function (global) {
  'use strict';

  var H = null, W = null;
  /* حقوق المواقع كما تجيب قاعدة البيانات — تُسأل قبل كل قالب (انظر hr-excel-screens.js)
     site rights as the DATABASE answers — asked before every template */
  var RIGHTS = null;
  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function lab(o) { return o ? (isAr() ? o.ar : o.en) : ''; }
  function tt(key, fallback) { try { var v = global.t ? t(key) : ''; return v && v !== key ? v : fallback; } catch (e) { return fallback; } }
  function today() { return global.I18N && I18N.today ? I18N.today() : new Date().toISOString().slice(0, 10); }

  var VIRTUAL = { subTotal: 1, taxAmount: 1, grandTotal: 1, totalDebit: 1, totalCredit: 1, netTotal: 1 };
  var VIRTUAL_LABEL = {
    subTotal: { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal' }, taxAmount: { ar: 'قيمة الضريبة', en: 'Tax amount' },
    grandTotal: { ar: 'الإجمالي', en: 'Total' }, totalDebit: { ar: 'إجمالي المدين', en: 'Total debit' },
    totalCredit: { ar: 'إجمالي الدائن', en: 'Total credit' }, netTotal: { ar: 'صافي الإجمالي', en: 'Net total' }
  };

  function colField(mod, name) {
    for (var i = 0; i < mod.fields.length; i++) if (mod.fields[i].name === name) return mod.fields[i];
    if (mod.lines) for (var j = 0; j < mod.lines.fields.length; j++) if (mod.lines.fields[j].name === name) return mod.lines.fields[j];
    return null;
  }
  function blankDash(v) { return (v === '—' || v === '–') ? '' : v; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · التصدير · EXPORT
     ═══════════════════════════════════════════════════════════════════ */

  /* نسخة أمينة من dataFor في pages/entity.js:156-200 (محلية هناك): نفس
     النطاق ونفس البحث ونفس الترتيب — الحالة تُقرأ من الشاشة نفسها.
     A faithful copy of entity.js's closure-local dataFor(): same scope,
     same search, same sort — the state is read from the screen itself.
     It is CHECKED against the original's own output on every export. */
  function filteredRows(mod) {
    var all = Auth.scopeRows(mod.id, Store.all(mod.table));
    var chip = document.querySelector('#content .filter-chip.active[data-filter]');
    var filter = chip ? chip.getAttribute('data-filter') : 'all';
    if (mod.workflow && filter !== 'all') all = all.filter(function (r) { return (r.status || 'draft') === filter; });
    var qEl = document.getElementById('tblSearch');
    var q = qEl ? String(qEl.value || '') : '';
    if (q) {
      var ql = q.toLowerCase(), keys = (mod.search || []).concat(mod.columns);
      all = all.filter(function (r) {
        for (var i = 0; i < keys.length; i++) {
          var f = colField(mod, keys[i]), raw = r[keys[i]];
          var txt = f && f.type === 'ref' ? Schema.refLabel(f, raw) : f && f.type === 'select' ? Schema.optionLabel(f, raw) : raw;
          if (txt !== undefined && txt !== null && String(txt).toLowerCase().indexOf(ql) !== -1) return true;
        }
        return false;
      });
    }
    var th = document.querySelector('#content th.sorted[data-sort]');
    var sortCol = th ? th.getAttribute('data-sort') : null;
    var dir = th && /▼/.test(th.textContent || '') ? 'desc' : 'asc';
    var sortKey = sortCol || (mod.workflow ? 'docNo' : (mod.columns[0] || 'createdAt'));
    var sf = colField(mod, sortKey);
    all.sort(function (a, b) {
      var av = a[sortKey], bv = b[sortKey];
      if (sf && sf.type === 'ref') { av = Schema.refLabel(sf, av); bv = Schema.refLabel(sf, bv); }
      if (typeof av === 'number' || typeof bv === 'number') { av = Number(av) || 0; bv = Number(bv) || 0; return dir === 'asc' ? av - bv : bv - av; }
      av = String(av === undefined || av === null ? '' : av); bv = String(bv === undefined || bv === null ? '' : bv);
      return dir === 'asc' ? av.localeCompare(bv, 'ar') : bv.localeCompare(av, 'ar');
    });
    if (!sortCol) all.reverse();
    return { rows: all, search: q, filter: filter };
  }

  function headerOf(mod, c) {
    if (c === 'docNo') return tt('g.docNo', L({ ar: 'رقم المستند', en: 'Doc no.' }));
    if (c === 'status') {
      if (mod.workflow) return tt('wf.status', L({ ar: 'حالة المستند', en: 'Status' }));
      var fs = colField(mod, 'status'); return fs ? lab(fs.label) : L({ ar: 'الحالة', en: 'Status' });
    }
    if (c === 'createdBy') return tt('g.createdBy', L({ ar: 'أنشأه', en: 'Created by' }));
    if (VIRTUAL[c]) return lab(VIRTUAL_LABEL[c]);
    var f = colField(mod, c);
    return f ? lab(f.label) : c;
  }
  /* نوع العمود في الملف · the column's type in the workbook */
  function typeOf(mod, c) {
    if (c === 'docNo' || c === 'status' || c === 'createdBy') return 'text';
    if (VIRTUAL[c]) return 'money';
    var f = colField(mod, c); if (!f) return 'text';
    if (f.type === 'money' || (f.type === 'calc' && f.calcAs === 'money')) return 'money';
    if (f.type === 'calc' || f.type === 'number' || f.type === 'percent') return 'number';
    if (f.type === 'date') return 'date';
    return 'text';
  }
  /* قيمة الخلية من السجل الخام — الفارغ يبقى فارغاً · the cell from the RAW record */
  function cellOf(mod, c, r, hidden) {
    if (hidden[c]) return '';
    if (c === 'status') return mod.workflow ? Workflow.label(r.status) : blankDash(Schema.optionLabel(colField(mod, 'status'), r.status));
    if (c === 'docNo') return r.docNo || '';
    if (c === 'createdBy') { var u = Store.find('users', r.createdBy); return u ? u.name : ''; }
    if (VIRTUAL[c]) return (r[c] === null || r[c] === undefined || r[c] === '') ? '' : Number(r[c]);
    var f = colField(mod, c), v = r[c];
    if (!f) return v === undefined || v === null ? '' : v;
    if (f.type === 'calc') return UI.computeValue(f, r);
    if (v === undefined || v === null || v === '') return '';
    if (f.type === 'ref') return blankDash(Schema.refLabel(f, v));
    if (f.type === 'select') return blankDash(Schema.optionLabel(f, v));
    if (f.type === 'checkbox') return v ? L({ ar: 'نعم', en: 'yes' }) : L({ ar: 'لا', en: 'no' });
    if (f.type === 'money' || f.type === 'number' || f.type === 'percent') { var n = Number(v); return isFinite(n) ? n : String(v); }
    if (f.type === 'date') return String(v).slice(0, 10);
    return String(v);
  }
  /* ما كان التصدير القديم سيكتبه لهذه الخلية — للمقارنة فقط · what the old export would write, for the check */
  function oldCell(mod, c, r) {
    if (c === 'status') return mod.workflow ? Workflow.label(r.status) : Schema.optionLabel(colField(mod, 'status'), r.status);
    if (c === 'docNo') return r.docNo || '';
    var f = colField(mod, c);
    if (!f) return r[c] === undefined ? '' : r[c];
    if (f.type === 'ref') return Schema.refLabel(f, r[c]);
    if (f.type === 'select') return Schema.optionLabel(f, r[c]);
    if (f.type === 'money' || f.type === 'calc') return UI.computeValue(f, r);
    if (f.type === 'date') return I18N.date(r[c]);
    return r[c] === undefined || r[c] === null ? '' : r[c];
  }

  function exportXlsx(moduleId, origHandler, btn, evt) {
    var mod = Schema.get(moduleId);
    /* ١ · ما كان الزر الأصلي سيكتبه · what the original button would write */
    var captured = null;
    if (typeof origHandler === 'function') {
      var savedCsv = UI.exportCSV, savedToast = UI.toast;
      UI.exportCSV = function (filename, headers, rows) { captured = { filename: filename, headers: headers, rows: rows }; };
      UI.toast = function () {};
      try { origHandler.call(btn, evt); } catch (e) { console.warn('[hr-excel] original export threw', e); }
      finally { UI.exportCSV = savedCsv; UI.toast = savedToast; }
    }
    /* ٢ · ما نحسبه نحن من السجلات الخام · what we compute from the raw records */
    var mine = filteredRows(mod);
    var cols = mod.columns.slice();
    var hidden = {};
    cols.forEach(function (c) { if (Auth.fieldHidden && Auth.fieldHidden(moduleId, c)) hidden[c] = true; });
    /* ٣ · المقارنة · the check — same count, same order, same value in every cell */
    var agree = !captured || (captured.rows.length === mine.rows.length && captured.rows.every(function (row, i) {
      return cols.every(function (c, j) { return String(row[j]) === String(oldCell(mod, c, mine.rows[i])); });
    }));
    var typed = agree;
    var columns = cols.map(function (c) { return { header: headerOf(mod, c) + (hidden[c] ? ' ' + L({ ar: '(محجوب عنك)', en: '(hidden from you)' }) : ''), type: typed ? typeOf(mod, c) : 'text', width: typeOf(mod, c) === 'text' ? 22 : 16 }; });
    var rows = typed
      ? mine.rows.map(function (r) { return cols.map(function (c) { return cellOf(mod, c, r, hidden); }); })
      : captured.rows.map(function (row) { return row.map(function (v) { return v === null || v === undefined ? '' : String(v); }); });
    var total = Auth.scopeRows(mod.id, Store.all(mod.table)).length;
    var filtered = rows.length !== total || mine.search || (mine.filter && mine.filter !== 'all');
    var who = (Auth.current() || {}).name || '';
    var about = [
      [L({ ar: 'الشاشة', en: 'Screen' }), lab(mod.label)],
      [L({ ar: 'عدد الصفوف في هذا الملف', en: 'Rows in this file' }), rows.length],
      [L({ ar: 'كل ما تراه في الشاشة', en: 'Everything you can see on the screen' }), total],
      [L({ ar: 'مصفّاة؟', en: 'Filtered?' }), filtered ? L({ ar: 'نعم', en: 'yes' }) + (mine.search ? ' — ' + L({ ar: 'بحث: ', en: 'search: ' }) + mine.search : '') + (mine.filter && mine.filter !== 'all' ? ' — ' + L({ ar: 'الحالة: ', en: 'status: ' }) + mine.filter : '') : L({ ar: 'لا — كل الصفوف الظاهرة لك', en: 'no — every row visible to you' })],
      [L({ ar: 'الأعمدة', en: 'Columns' }), columns.map(function (c) { return c.header; }).join('، ')],
      [L({ ar: 'صُدِّر في', en: 'Exported at' }), new Date().toLocaleString('en-GB')],
      [L({ ar: 'صدّره', en: 'Exported by' }), who],
      [L({ ar: 'ملاحظة', en: 'Note' }), L({ ar: 'هذا تصدير لأعمدة القائمة كما تظهر. لإضافة سجلات جديدة استخدم «⬇ ملف نموذجي» — فيه كل الخانات المسموح بها. يمكن تعديل هذا الملف وإعادة استيراده: يُعرض كل تغيير «قبل ← بعد» قبل الحفظ.', en: 'This exports the list columns as shown. To add new records use «⬇ Template» — it holds every allowed field. This file may be edited and imported back: every change is shown before → after before saving.' })]
    ];
    if (!typed) about.push([L({ ar: 'تنبيه', en: 'Warning' }), L({ ar: 'لم تتطابق حساباتنا مع التصدير الأصلي، فكُتبت القيم كما يكتبها هو حرفياً (كنص، كل قيمة في خليتها).', en: 'Our calculation did not match the original export, so values were written exactly as it writes them (as text, one per cell).' })]);
    if (Object.keys(hidden).length) about.push([L({ ar: 'أعمدة محجوبة', en: 'Hidden columns' }), L({ ar: 'تُركت فارغة لأنها ليست من صلاحيتك', en: 'left blank because they are outside your access' })]);
    var bytes = W.build({ title: lab(mod.label), sheets: [
      { name: lab(mod.label), columns: columns, rows: rows },
      { name: L({ ar: 'عن هذا الملف', en: 'About this file' }), columns: [{ header: L({ ar: 'البند', en: 'Item' }), type: 'text', width: 28 }, { header: L({ ar: 'القيمة', en: 'Value' }), type: 'wrap', width: 90 }], rows: about, autoFilter: false }
    ] });
    W.download(bytes, lab(mod.label).replace(/\s+/g, '_') + '-' + today());
    UI.toast(L({ ar: 'صُدِّر ملف إكسل: ' + rows.length + ' صف' + (filtered ? ' (مصفّى)' : '') + ' — كل بيان في خليته', en: 'Excel file exported: ' + rows.length + ' rows' + (filtered ? ' (filtered)' : '') + ' — every detail in its own cell' }), 'success', 5000);
    return { typed: typed, rows: rows.length, total: total, filtered: !!filtered, captured: !!captured };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · القالب · TEMPLATE
     ═══════════════════════════════════════════════════════════════════ */
  function colType(f) {
    if (!f) return 'text';
    if (f.type === 'money') return 'money';
    if (f.type === 'number' || f.type === 'percent') return 'number';
    if (f.type === 'date') return 'date';
    return 'text';
  }
  function whatToWrite(f, sub) {
    if (sub === 'code') return L({ ar: 'الرقم الوظيفي كما هو في البوابة (نص — الأصفار الأولى محفوظة)', en: 'the employee number as in the portal (text — leading zeros kept)' });
    if (sub === 'nationalId') return L({ ar: 'أو الرقم القومي (١٤ رقماً) بدل الرقم الوظيفي', en: 'or the 14-digit national ID instead of the number' });
    if (sub === 'name') return L({ ar: 'الاسم للتأكيد فقط — إن خالف الاسمَ المسجّل للرقم يُرفض الصف ولا يُخمَّن', en: 'the name, for confirmation only — if it contradicts the number, the row is refused, never guessed' });
    switch (f.type) {
      case 'money': return L({ ar: 'رقم (مثال 6500.50). الفارغ ليس صفراً.', en: 'a number (e.g. 6500.50). Blank is not zero.' });
      case 'number': return L({ ar: 'رقم', en: 'a number' });
      case 'date': return L({ ar: 'تاريخ: 2026-09-01', en: 'a date: 2026-09-01' });
      case 'select': return L({ ar: 'اختر من القائمة المنسدلة', en: 'choose from the dropdown' });
      case 'checkbox': return L({ ar: 'نعم أو لا', en: 'yes or no' });
      case 'ref': return f.ref === 'sites' ? L({ ar: 'اختر الموقع من القائمة', en: 'choose the site from the list' }) : f.ref === 'projects' ? L({ ar: 'اختر المشروع من القائمة — الاستيراد لا يُنشئ مشروعات', en: 'choose the project from the list — the import never creates projects' }) : L({ ar: 'الاسم كما هو مسجّل', en: 'the name exactly as recorded' });
      default: return L({ ar: 'نص', en: 'text' });
    }
  }

  function templateSpec(moduleId) {
    var mod = Schema.get(moduleId), cfg = H.SCREENS[moduleId];
    var lists = [], listIndex = {};
    var addList = function (key, title, values) {
      if (listIndex[key] !== undefined || !values.length) return listIndex[key];
      listIndex[key] = lists.length; lists.push({ title: title, values: values }); return listIndex[key];
    };
    var cols = [];
    var fields = cfg.kind === 'lines'
      ? (mod.lines.fields || []).filter(function (f) { return f.type !== 'calc' && !f.readonly && !(Auth.fieldHidden && Auth.fieldHidden(mod.id, f.name)); })
      : H.importableFields(mod);
    fields.forEach(function (f) {
      if (H.isPersonRef(f)) {
        cols.push({ f: f, sub: 'code', header: H.displayLabel(mod, f) + ' — ' + L({ ar: 'الرقم الوظيفي', en: 'employee no.' }) + (f.required ? ' *' : ''), type: 'text', required: !!f.required, width: 20 });
        cols.push({ f: f, sub: 'name', header: H.displayLabel(mod, f) + ' — ' + L({ ar: 'الاسم (للتأكيد)', en: 'name (to confirm)' }), type: 'text', width: 26 });
        return;
      }
      /* daily-labour-id.js already writes a visible «*» into one label — never «* *» */
      var base = String(H.displayLabel(mod, f)).replace(/\s*\*\s*$/, '');
      var c = { f: f, header: base + (f.required ? ' *' : ''), type: colType(f), required: !!f.required, width: f.type === 'textarea' ? 34 : 20 };
      if (f.type === 'select') c.list = addList('sel:' + f.name, lab(f.label), (f.options || []).map(function (o) { return lab(o.label); }));
      if (f.type === 'checkbox') c.list = addList('yesno', L({ ar: 'نعم/لا', en: 'yes/no' }), [L({ ar: 'نعم', en: 'yes' }), L({ ar: 'لا', en: 'no' })]);
      if (f.type === 'ref' && f.ref === 'sites') c.list = addList('sites', L({ ar: 'المواقع المسموح لك بها', en: 'Sites you may use' }), H.allowedSites(RIGHTS).map(function (s) { return H.shortName(s.name); }));
      if (f.type === 'ref' && f.ref === 'projects') c.list = addList('projects', L({ ar: 'المشروعات الظاهرة لك', en: 'Projects visible to you' }), H.projectsAll(RIGHTS).filter(function (p) { return p && p.name; }).map(function (p) { return p.name; }));
      cols.push(c);
    });
    return { mod: mod, cfg: cfg, cols: cols, lists: lists };
  }

  function exampleRows(spec) {
    var ex = function (c, n) {
      var f = c.f;
      if (c.sub === 'code') return n === 1 ? '0012' : '0457';
      if (c.sub === 'name') return n === 1 ? L({ ar: 'مثال — أحمد محمد علي', en: 'EXAMPLE — Ahmed Mohamed Ali' }) : L({ ar: 'مثال — سارة حسن', en: 'EXAMPLE — Sara Hassan' });
      if (f.name === 'code') return n === 1 ? '0012' : '0457';
      if (f.name === 'name') return n === 1 ? L({ ar: 'مثال — أحمد محمد علي', en: 'EXAMPLE — Ahmed Mohamed Ali' }) : L({ ar: 'مثال — سارة حسن', en: 'EXAMPLE — Sara Hassan' });
      if (f.name === 'nationalId') return n === 1 ? '29001011234567' : '30112250101234';
      if (f.name === 'phone') return n === 1 ? '01001234567' : '01112223334';
      if (f.name === 'bankAccount') return n === 1 ? '0012345678901234567890' : '';
      if (f.name === 'jobTitle') return n === 1 ? L({ ar: 'سائق', en: 'Driver' }) : L({ ar: 'محاسبة', en: 'Accountant' });
      if (f.type === 'ref' && f.ref === 'sites') { var s = H.allowedSites(RIGHTS)[0]; return s ? H.shortName(s.name) : ''; }
      if (f.type === 'ref') return L({ ar: '(اختر من القائمة)', en: '(choose from the list)' });
      if (f.type === 'select') return f.options && f.options[0] ? lab(f.options[0].label) : '';
      if (f.type === 'checkbox') return L({ ar: 'نعم', en: 'yes' });
      if (f.type === 'money') return n === 1 ? 6500.5 : '';
      if (f.type === 'number') return n === 1 ? 1 : '';
      if (f.type === 'date') return n === 1 ? '2025-03-01' : '2026-01-15';
      return '';
    };
    return [spec.cols.map(function (c) { return ex(c, 1); }), spec.cols.map(function (c) { return ex(c, 2); })];
  }

  function template(moduleId) {
    var spec = templateSpec(moduleId), mod = spec.mod, cfg = spec.cfg;
    var dataName = lab(mod.label).slice(0, 31);
    var listsName = L({ ar: 'قوائم', en: 'Lists' });
    var listSheetCols = spec.lists.map(function (l) { return { header: l.title, type: 'text', width: 30 }; });
    var maxLen = spec.lists.reduce(function (m, l) { return Math.max(m, l.values.length); }, 0);
    var listRows = [];
    for (var i = 0; i < maxLen; i++) listRows.push(spec.lists.map(function (l) { return l.values[i] === undefined ? '' : l.values[i]; }));
    var validations = [];
    spec.cols.forEach(function (c, ci) {
      if (c.list === undefined) return;
      var L0 = W.colName(c.list), n = spec.lists[c.list].values.length;
      validations.push({ col: ci, listRef: "'" + listsName + "'!$" + L0 + '$2:$' + L0 + '$' + (n + 1), maxRow: 3000 });
    });
    var S = W.STYLE, sty = function (arr, st) { arr.__styles = arr.map(function () { return st; }); return arr; };
    var how = cfg.kind === 'lines'
      ? L({ ar: 'ثم في البوابة: ' + lab(cfg.where) + ' ← ⬆ استيراد ← اختر هذا الملف ← راجع الصفوف ← «افتح كشفاً جديداً بهذه الصفوف» ← أكمل الترويسة (التاريخ/الموقع/الشهر) ← احفظ.', en: 'Then in the portal: ' + lab(cfg.where) + ' → ⬆ Import → choose this file → review the rows → «open a new sheet with these rows» → complete the header (date/site/month) → Save.' })
      : L({ ar: 'ثم في البوابة: ' + lab(cfg.where) + ' ← ⬆ استيراد ← اختر هذا الملف ← راجع النافذة الواحدة ← احفظ.', en: 'Then in the portal: ' + lab(cfg.where) + ' → ⬆ Import → choose this file → check the one review window → Save.' });
    var instr = [
      sty([L({ ar: 'كيف تملأ هذا الملف — شاشة «' + lab(mod.label) + '»', en: 'How to fill this file — screen «' + lab(mod.label) + '»' }), '', '', ''], S.title),
      [L({ ar: '١) املأ الورقة الأولى «' + dataName + '» فقط — صفّ واحد لكل ' + (cfg.kind === 'lines' ? 'بند' : 'سجل') + '. لا تغيّر العناوين في الصف الأول ولا ترتيب الأوراق.', en: '1) Fill ONLY the first sheet «' + dataName + '» — one row per ' + (cfg.kind === 'lines' ? 'line' : 'record') + '. Do not change the headings in row 1 or the order of the sheets.' }), '', '', ''],
      [L({ ar: '٢) العمود الذي ينتهي بـ * مطلوب للسجل الجديد (عنوانه بلون أغمق). الباقي اختياري.', en: '2) A column ending in * is required for a new record (darker heading). The rest are optional.' }), '', '', ''],
      [L({ ar: '٣) عند تحديث سجل موجود: الخانة الفارغة لا تمسح شيئاً. الصفر يُكتب صفراً. كل تغيير يُعرض «قبل ← بعد» ولا يُحفظ إلا بموافقتك.', en: '3) When updating an existing record: a blank cell erases nothing. Zero is written as zero. Every change is shown before → after and saved only with your approval.' }), '', '', ''],
      [L({ ar: '٤) الأرقام التي هي أسماء (الرقم الوظيفي، القومي، الهاتف، الحساب البنكي) أعمدتها «نص» — اكتبها كما هي والأصفار الأولى تبقى.', en: '4) Number-like identifiers (employee no., national ID, phone, bank account) are Text columns — type them as they are; leading zeros stay.' }), '', '', ''],
      [L({ ar: '٥) الموظف يُعرَّف بالرقم الوظيفي (أو القومي) — الاسم وحده لا يكفي لأن اسمين قد يتشابهان.', en: '5) A person is identified by employee number (or national ID) — a name alone is not enough, since two people can share one.' }), '', '', ''],
      [L({ ar: '٦) ورقة «أمثلة» للتوضيح فقط ولا تُستورد أبداً — الاستيراد يقرأ الورقة الأولى وحدها.', en: '6) The «Examples» sheet is for illustration only and is never imported — the import reads the first sheet only.' }), '', '', ''],
      [L({ ar: '٧) ' + how, en: '7) ' + how }), '', '', ''],
      ['', '', '', ''],
      sty([L({ ar: 'العمود', en: 'Column' }), L({ ar: 'مطلوب؟', en: 'Required?' }), L({ ar: 'ماذا تكتب', en: 'What to write' }), L({ ar: 'القيم المسموحة', en: 'Allowed values' })], S.head)
    ];
    spec.cols.forEach(function (c) {
      var allowed = c.list !== undefined ? spec.lists[c.list].values.slice(0, 25).join('، ') + (spec.lists[c.list].values.length > 25 ? '…' : '') : '';
      instr.push([c.header.replace(/ \*$/, ''), c.required ? L({ ar: 'نعم — للجديد', en: 'yes — for new' }) : L({ ar: 'لا', en: 'no' }), whatToWrite(c.f, c.sub), allowed]);
    });
    var bytes = W.build({ title: L({ ar: 'نموذج استيراد', en: 'Import template' }) + ' — ' + lab(mod.label), sheets: [
      { name: dataName, columns: spec.cols.map(function (c) { return { header: c.header, type: c.type, required: c.required, width: c.width }; }), rows: [], validations: validations },
      { name: L({ ar: 'التعليمات', en: 'Instructions' }), noHeader: true, columns: [{ type: 'wrap', width: 70 }, { type: 'text', width: 14 }, { type: 'wrap', width: 48 }, { type: 'wrap', width: 50 }], rows: instr, autoFilter: false },
      { name: L({ ar: 'أمثلة — لا تُستورد', en: 'Examples — not imported' }), columns: spec.cols.map(function (c) { return { header: c.header, type: c.type, width: c.width }; }), rows: exampleRows(spec), autoFilter: false },
      { name: listsName, columns: listSheetCols.length ? listSheetCols : [{ header: '-', type: 'text' }], rows: listRows, hidden: true, autoFilter: false }
    ] });
    W.download(bytes, L({ ar: 'نموذج-استيراد-', en: 'import-template-' }) + lab(mod.label).replace(/\s+/g, '_'));
    UI.toast(L({ ar: 'نزل ملف إكسل: املأ الورقة الأولى، ثم «⬆ استيراد». التعليمات والأمثلة في الأوراق التالية.', en: 'An Excel file was downloaded: fill the first sheet, then «⬆ Import». Instructions and examples are in the next sheets.' }), 'success', 9000);
    return spec;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · ربط الزرّين في شاشات الموارد البشرية فقط · rebinding, HR screens only
     ═══════════════════════════════════════════════════════════════════ */
  function currentModuleId() {
    var id = null;
    try { id = global.App && typeof App.currentModule === 'function' && App.currentModule(); } catch (e) { /* ignore */ }
    if (!id) { try { id = global.App && App.route ? App.route() : null; } catch (e) { /* ignore */ } }
    return id;
  }
  function rebind() {
    H = H || global.HRExcel; W = W || global.XlsxWriter;
    if (!H || !W) return;
    var mid = currentModuleId();
    if (!mid || !H.covers(mid)) return;
    var ex = document.querySelector('#content [data-x="export"]');
    if (ex && ex.getAttribute('data-hx') !== '1') {
      var orig = ex.onclick;
      ex.setAttribute('data-hx', '1');
      ex.onclick = function (evt) { exportXlsx(mid, orig, ex, evt); };
      ex.title = L({ ar: 'ملف إكسل حقيقي — كل بيان في خليته', en: 'A real Excel file — every detail in its own cell' });
    }
    var tpl = document.getElementById('azTemplateBtn');
    if (tpl && tpl.getAttribute('data-hx') !== '1') {
      tpl.setAttribute('data-hx', '1');
      tpl.onclick = function () {
        /* حقوق المواقع والقوائم من الخادم لحظة الضغط — لا من نسخة لم تكتمل
           site rights and lists from the server at the moment of the click */
        Promise.all([H.siteRights(), H.lists()]).then(function (r) { RIGHTS = Object.assign({}, r[0], r[1]); template(mid); })
          .catch(function () { RIGHTS = null; template(mid); });
      };
      tpl.title = L({ ar: 'ملف إكسل فيه كل الخانات، والتعليمات، وأمثلة لا تُستورد', en: 'An Excel file with every field, instructions, and examples that are never imported' });
    }
  }
  var mo = new MutationObserver(function () { rebind(); });
  function start() {
    var content = document.getElementById('content');
    if (content) mo.observe(content, { childList: true, subtree: true });
    rebind();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  global.HRExcelDownloads = { template: template, templateSpec: templateSpec, exportXlsx: exportXlsx, filteredRows: filteredRows, rebind: rebind };
  console.info('hr-excel-downloads.js ready — on HR screens, Template and Export are real Excel workbooks.');
})(window);
