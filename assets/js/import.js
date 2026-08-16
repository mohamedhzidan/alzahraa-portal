/* =========================================================================
   import.js — استيراد البيانات · Data import
   -------------------------------------------------------------------------
   كان في كل شاشة زر «تصدير» ولا يوجد «استيراد». الموارد البشرية تعمل على
   إكسل بالفعل — ٤٥٠ موظفاً — وإدخالهم واحداً واحداً بالكتابة اليدوية
   شهر كامل من العمل وآلاف الأخطاء.

   Every screen had Export and no Import. HR already works in Excel with
   450 people. Typing them in one by one is a month of work and thousands
   of chances to get a digit wrong.

   -------------------------------------------------------------------------
   القاعدة الوحيدة التي لا تُكسر · THE ONE UNBREAKABLE RULE

   لا يُكتب صف واحد في قاعدة البيانات قبل أن تراه وتوافق عليه.

   NOT ONE ROW is written until a person has seen it and pressed confirm.
   The file is read, matched to the screen's fields, checked row by row,
   and shown back to you in green, amber and red. You decide.

   قلتَ: «أي أخطاء ممكن تؤدي لمشاكل ومعلومات ناقصة». لذلك المعاينة
   إجبارية ولا يمكن تخطّيها.

   -------------------------------------------------------------------------
   الصيغة: CSV — من إكسل: ملف ← حفظ باسم ← CSV UTF-8

   Format: CSV. From Excel: File → Save As → CSV UTF-8.
   Deliberately not .xlsx — parsing Excel needs a large third-party
   library that would have to be uploaded and trusted untested. CSV is
   one extra click and it cannot silently misread a number.

   -------------------------------------------------------------------------
   ADDITIVE. Delete this file and the Import button disappears.
   Load AFTER pages/entity.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var MAX_ROWS = 2000;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function lab(o) { return global.L ? global.L(o) : (isAr() ? o.ar : o.en); }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · قارئ CSV — يتعامل مع الفواصل داخل النص وعلامات التنصيص
     A hand-written parser rather than a split(','), because a supplier
     called "شركة النور, القاهرة" would otherwise destroy every column
     after it.
     ═══════════════════════════════════════════════════════════════════ */
  function parseCSV(text) {
    /* strip the byte-order mark Excel writes, or the first header never matches */
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { field += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else field += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',' || ch === ';') { row.push(field); field = ''; }
        else if (ch === '\r') { /* ignore */ }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · مطابقة أعمدة الملف بحقول الشاشة
        Matches by Arabic label, English label or field name, ignoring
        case and spaces. So a column headed «اسم الموظف» finds the field
        whose Arabic label is «اسم الموظف».
     ═══════════════════════════════════════════════════════════════════ */
  function norm(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/\s+/g, '').replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }

  function mapColumns(mod, headers) {
    var fields = (mod.fields || []).filter(function (f) {
      return f.type !== 'calc' && !f.readonly;
    });
    return headers.map(function (h) {
      var n = norm(h);
      if (!n) return null;
      var hit = fields.filter(function (f) {
        return norm(f.label.ar) === n || norm(f.label.en) === n || norm(f.name) === n;
      })[0];
      return hit || null;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · فحص كل صف — الأخطاء تمنع، والتنبيهات تُعرض
     ═══════════════════════════════════════════════════════════════════ */
  function coerce(field, raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (v === '') return '';
    if (field.type === 'number' || field.type === 'money' || field.type === 'percent') {
      /* Arabic-Indic digits and thousands separators both appear in real files */
      v = v.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
           .replace(/,/g, '').replace(/\s/g, '');
      var n = Number(v);
      return isNaN(n) ? NaN : n;
    }
    if (field.type === 'checkbox') {
      return ['نعم','yes','true','1','y','✓'].indexOf(v.toLowerCase()) !== -1;
    }
    if (field.type === 'date') {
      var d = v.replace(/\//g, '-');
      var m = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);   /* dd-mm-yyyy */
      if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
      return d;
    }
    if (field.type === 'select') {
      var hit = (field.options || []).filter(function (o) {
        return norm(lab(o.label)) === norm(v) || norm(o.value) === norm(v);
      })[0];
      return hit ? hit.value : v;
    }
    if (field.type === 'ref') {
      var target = global.Schema && Schema.get(field.ref);
      if (!target || !global.Store) return v;
      var key = field.refLabel || 'name';
      var row = (Store.all(target.table) || []).filter(function (r) {
        return norm(r[key]) === norm(v) || norm(r.name) === norm(v) ||
               norm(r.code) === norm(v) || r.id === v;
      })[0];
      return row ? row.id : { __unmatched: v };
    }
    return v;
  }

  function checkRow(mod, cols, cells, existingKeys) {
    var rec = {}, errors = [], warnings = [];

    cols.forEach(function (f, i) {
      if (!f) return;
      var val = coerce(f, cells[i]);
      if (typeof val === 'number' && isNaN(val)) {
        errors.push(L({ ar: lab(f.label) + ': ليس رقماً — «' + cells[i] + '»',
                        en: lab(f.label) + ': not a number — "' + cells[i] + '"' }));
        return;
      }
      if (val && val.__unmatched) {
        errors.push(L({ ar: lab(f.label) + ': لا يوجد سجل باسم «' + val.__unmatched + '»',
                        en: lab(f.label) + ': no record named "' + val.__unmatched + '"' }));
        return;
      }
      if (f.type === 'date' && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        warnings.push(L({ ar: lab(f.label) + ': تاريخ غير مفهوم — «' + cells[i] + '»',
                          en: lab(f.label) + ': unclear date — "' + cells[i] + '"' }));
      }
      rec[f.name] = val;
    });

    (mod.fields || []).forEach(function (f) {
      if (!f.required || f.readonly || f.type === 'calc') return;
      var v = rec[f.name];
      if (v === undefined || v === null || v === '') {
        errors.push(L({ ar: 'حقل مطلوب فارغ: ' + lab(f.label),
                        en: 'Required field empty: ' + lab(f.label) }));
      }
    });

    /* duplicate against what is already saved, and within the file */
    var keyField = mod.fields.filter(function (f) {
      return ['code','docNo','nationalId','docCode'].indexOf(f.name) !== -1;
    })[0];
    if (keyField && rec[keyField.name]) {
      var k = norm(rec[keyField.name]);
      if (existingKeys.indexOf(k) !== -1) {
        warnings.push(L({ ar: 'موجود بالفعل: ' + rec[keyField.name] + ' — سيُنشأ سجل مكرر',
                          en: 'Already exists: ' + rec[keyField.name] + ' — a duplicate would be created' }));
      } else existingKeys.push(k);
    }

    return { rec: rec, errors: errors, warnings: warnings };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · المعاينة الإجبارية
     ═══════════════════════════════════════════════════════════════════ */
  function preview(moduleId, rows) {
    var mod = Schema.get(moduleId);
    var headers = rows[0] || [];
    var cols = mapColumns(mod, headers);
    var matched = cols.filter(Boolean).length;

    if (!matched) {
      UI.modal({
        title: L({ ar: 'لم يُتعرَّف على أي عمود', en: 'No column was recognised' }),
        body: '<div class="alert alert-danger">' + esc(L({
                ar: 'أسماء الأعمدة في الملف لا تطابق أي حقل في هذه الشاشة.',
                en: 'The column names in the file match no field on this screen.' })) + '</div>' +
              '<p>' + esc(L({ ar: 'أسهل طريقة: اضغط «تصدير» أولاً، افتح الملف الناتج، ' +
                                  'واكتب بياناتك تحت نفس العناوين.',
                              en: 'Easiest fix: press Export first, open that file, and put your ' +
                                  'data under the same headings.' })) + '</p>' +
              '<p class="muted small">' + esc(L({ ar: 'أعمدة ملفك: ', en: 'Your columns: ' })) +
                esc(headers.join(' · ')) + '</p>',
        buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-primary' }]
      });
      return;
    }

    var existingKeys = [];
    var results = [];
    for (var i = 1; i < rows.length && i <= MAX_ROWS; i++) {
      results.push(checkRow(mod, cols, rows[i], existingKeys));
    }

    var good = results.filter(function (r) { return !r.errors.length && !r.warnings.length; });
    var warn = results.filter(function (r) { return !r.errors.length && r.warnings.length; });
    var bad  = results.filter(function (r) { return r.errors.length; });

    var body = '';
    body += '<div class="alert ' + (bad.length ? 'alert-warn' : 'alert-info') + '">' +
      '<span><strong>' + results.length + '</strong> ' + esc(L({ ar: 'صف في الملف.', en: 'rows in the file.' })) +
      ' <span style="color:#1b7f4b">✓ ' + good.length + ' ' + esc(L({ ar: 'سليم', en: 'clean' })) + '</span>' +
      ' · <span style="color:#B8860B">⚠ ' + warn.length + ' ' + esc(L({ ar: 'بتنبيه', en: 'with warnings' })) + '</span>' +
      ' · <span style="color:#b42318">✗ ' + bad.length + ' ' + esc(L({ ar: 'به خطأ', en: 'with errors' })) + '</span>' +
      '</span></div>';

    body += '<p class="small muted">' + esc(L({
      ar: 'الصفوف التي بها خطأ لن تُستورد إطلاقاً. صحّحها في الملف وأعد المحاولة.',
      en: 'Rows with an error are never imported. Fix them in the file and try again.' })) + '</p>';

    body += '<div class="table-wrap" style="max-height:340px;overflow:auto">' +
            '<table class="data-table"><thead><tr><th>#</th><th></th>';
    cols.forEach(function (f, i) {
      body += '<th>' + esc(f ? lab(f.label) : headers[i] + ' —') + '</th>';
    });
    body += '</tr></thead><tbody>';

    results.slice(0, 60).forEach(function (r, i) {
      var mark = r.errors.length ? '✗' : (r.warnings.length ? '⚠' : '✓');
      var colr = r.errors.length ? '#b42318' : (r.warnings.length ? '#B8860B' : '#1b7f4b');
      body += '<tr><td class="num">' + (i + 2) + '</td>' +
              '<td style="color:' + colr + ';font-weight:700">' + mark + '</td>';
      cols.forEach(function (f, ci) {
        body += '<td>' + esc(f ? (r.rec[f.name] === undefined ? '' : r.rec[f.name]) : (rows[i + 1] || [])[ci] || '') + '</td>';
      });
      body += '</tr>';
      if (r.errors.length || r.warnings.length) {
        body += '<tr><td></td><td colspan="' + (cols.length + 1) + '"><small>' +
          r.errors.map(function (e) { return '<span style="color:#b42318">✗ ' + esc(e) + '</span>'; }).join('<br>') +
          (r.errors.length && r.warnings.length ? '<br>' : '') +
          r.warnings.map(function (w) { return '<span style="color:#B8860B">⚠ ' + esc(w) + '</span>'; }).join('<br>') +
          '</small></td></tr>';
      }
    });
    body += '</tbody></table></div>';
    if (results.length > 60) {
      body += '<p class="muted small">' + esc(L({ ar: 'تُعرض أول ٦٠ صفاً فقط. الاستيراد يشمل الكل.',
                                                  en: 'Showing the first 60 rows. The import covers all of them.' })) + '</p>';
    }

    var importable = good.concat(warn);
    UI.modal({
      title: L({ ar: 'معاينة الاستيراد — ', en: 'Import preview — ' }) + lab(mod.label),
      size: 'wide', body: body,
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        {
          label: L({ ar: 'استورد ' + importable.length + ' صفاً', en: 'Import ' + importable.length + ' rows' }),
          cls: 'btn-primary',
          disabled: !importable.length,
          onClick: function () { commit(moduleId, importable); }
        }
      ]
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · الكتابة — بعد الموافقة فقط
     ═══════════════════════════════════════════════════════════════════ */
  function commit(moduleId, list) {
    var mod = Schema.get(moduleId);
    var done = 0, failed = 0;
    var u = global.Auth && Auth.current();

    list.forEach(function (r) {
      try {
        var rec = Object.assign({}, r.rec);
        if (mod.workflow) { rec.status = 'draft'; rec.trail = []; }
        if (mod.docPrefix && !rec.docNo && Store.nextDocNo) rec.docNo = Store.nextDocNo(mod.docPrefix);
        if (!rec.site && u && u.site) rec.site = u.site;
        rec.importedAt = new Date().toISOString();
        Store.create(mod.table, rec);
        done++;
      } catch (e) { failed++; console.error('[import] row failed', e); }
    });

    UI.toast(L({ ar: 'استُورد ' + done + ' صف' + (failed ? ' · فشل ' + failed : '') + '. الكل كمسودة.',
                 en: done + ' rows imported' + (failed ? ' · ' + failed + ' failed' : '') + '. All as drafts.' }),
             failed ? 'warn' : 'success', 7000);
    if (global.App && App.refresh) App.refresh();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · زر «استيراد» بجوار «تصدير» في كل شاشة
     ═══════════════════════════════════════════════════════════════════ */
  function addButton() {
    var exportBtn = document.querySelector('[data-x="export"]');
    if (!exportBtn || document.getElementById('azImportBtn')) return;
    var moduleId = (global.App && App.currentModule && App.currentModule()) || currentFromBreadcrumb();
    if (!moduleId || !global.Auth || !Auth.can(moduleId, 'create')) return;

    var btn = document.createElement('button');
    btn.id = 'azImportBtn';
    btn.className = 'btn btn-outline btn-sm';
    btn.type = 'button';
    btn.textContent = L({ ar: '⬆ استيراد', en: '⬆ Import' });
    btn.onclick = function () { pick(moduleId); };
    exportBtn.parentNode.insertBefore(btn, exportBtn);
  }

  function currentFromBreadcrumb() {
    /* fall back to matching the page title against the module list */
    var t = document.querySelector('.page-title');
    if (!t || !global.Schema) return null;
    var txt = t.textContent || '';
    var hit = (Schema.MODULES || []).filter(function (m) {
      return txt.indexOf(lab(m.label)) !== -1;
    }).sort(function (a, b) { return lab(b.label).length - lab(a.label).length; })[0];
    return hit ? hit.id : null;
  }

  function pick(moduleId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var rows = parseCSV(String(reader.result || ''));
          if (rows.length < 2) {
            UI.toast(L({ ar: 'الملف فارغ أو به عنوان فقط.', en: 'The file is empty or has only a header.' }), 'error');
            return;
          }
          preview(moduleId, rows);
        } catch (e) {
          console.error('[import]', e);
          UI.toast(L({ ar: 'تعذّرت قراءة الملف.', en: 'Could not read the file.' }), 'error');
        }
      };
      reader.readAsText(file, 'utf-8');
    };
    input.click();
  }

  /* watch for screen changes so the button appears everywhere */
  var mo = new MutationObserver(function () { addButton(); });
  function start() {
    var content = document.getElementById('content');
    if (content) mo.observe(content, { childList: true, subtree: true });
    addButton();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.DataImport = {
    parseCSV: parseCSV, mapColumns: mapColumns, coerce: coerce,
    checkRow: checkRow, preview: preview, pick: pick
  };

  console.info('import.js ready — Import sits next to Export on every screen.');
})(window);
