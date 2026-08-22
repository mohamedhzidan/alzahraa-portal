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
   الصيغ المقبولة · ACCEPTED FORMATS

     ‎.xlsx‎ / ‎.xlsm‎   ملف إكسل مباشرة — بلا حفظ باسم ولا خطوة إضافية
     ‎.csv‎ / ‎.tsv‎     نص مفصول بفواصل

   ‎.xls‎ القديمة (إكسل ٢٠٠٣) و PDF و Word مرفوضة عمداً، والرسالة تشرح
   البديل. الملف الذي لا يُقرأ يُرفض بوضوح — ولا يُقرأ نصفه بصمت.

   .xlsx is read directly: no Save As, no extra step. The old .xls, and
   PDF, are refused on purpose with a message explaining what to do
   instead. A file that cannot be read correctly is refused out loud
   rather than half-read in silence.

   لا مكتبة خارجية. ملف الإكسل هو ZIP بداخله XML، والمتصفح يفك الضغط
   بنفسه — فيعمل الاستيراد بدون إنترنت أيضاً.
   No third-party library: an .xlsx is a ZIP of XML and the browser
   inflates it natively, so import works with no connection too.

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
     ١ب · قارئ إكسل ‎.xlsx‎ — بدون أي مكتبة خارجية
     -------------------------------------------------------------------
     ملف الإكسل الحديث هو في الحقيقة ملف ZIP بداخله ملفات XML. المتصفح
     يعرف كيف يفكّ ضغط ZIP بنفسه منذ ٢٠٢٠ عبر DecompressionStream، لذلك
     لا نحتاج تحميل مكتبة خارجية بحجم ٦٠ كيلوبايت ولا الوثوق بكود لم
     نختبره. أقل كوداً = أقل مكان يختبئ فيه خطأ.

     An .xlsx is a ZIP of XML files. Every browser since 2020 can inflate
     a ZIP entry itself via DecompressionStream, so this needs no
     third-party library — nothing downloaded, nothing to trust, and it
     works with no connection. Less code is fewer places for a bug to hide.
     ═══════════════════════════════════════════════════════════════════ */

  /* ٱقرأ فهرس ZIP المركزي واستخرج ملفاً واحداً بالاسم */
  function zipEntries(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), n = u8.length;
    /* End of Central Directory: signature 0x06054b50, scan backwards */
    var eocd = -1;
    for (var i = n - 22; i >= 0 && i > n - 66000; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('ليس ملف إكسل صالح · not a valid .xlsx');

    var count = dv.getUint16(eocd + 10, true);
    var dirAt = dv.getUint32(eocd + 16, true);
    var map = {}, p = dirAt;

    for (var k = 0; k < count && p + 46 <= n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method   = dv.getUint16(p + 10, true);
      var compSize = dv.getUint32(p + 20, true);
      var nameLen  = dv.getUint16(p + 28, true);
      var extraLen = dv.getUint16(p + 30, true);
      var cmtLen   = dv.getUint16(p + 32, true);
      var localAt  = dv.getUint32(p + 42, true);
      var name     = utf8(u8.subarray(p + 46, p + 46 + nameLen));
      map[name] = { method: method, compSize: compSize, localAt: localAt };
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return { dv: dv, u8: u8, map: map };
  }

  function utf8(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }

  /* استخرج ملفاً واحداً نصاً. يرجع '' إن لم يكن موجوداً — بعض الملفات
     لا تحتوي sharedStrings مثلاً، وهذا ليس خطأ. */
  function zipRead(zip, path) {
    var e = zip.map[path];
    if (!e) return Promise.resolve('');
    /* The central directory does not say where the data starts; the local
       header does, and its own name/extra lengths differ from the central
       copy. Reading the wrong one shifts every byte. */
    var at = e.localAt;
    if (zip.dv.getUint32(at, true) !== 0x04034b50) throw new Error('ZIP معطوب · corrupt ZIP');
    var start = at + 30 + zip.dv.getUint16(at + 26, true) + zip.dv.getUint16(at + 28, true);
    var raw = zip.u8.subarray(start, start + e.compSize);

    if (e.method === 0) return Promise.resolve(utf8(raw));          /* stored, not compressed */
    if (e.method !== 8) return Promise.reject(new Error('ضغط غير مدعوم · unsupported compression'));

    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error(
        'متصفحك قديم ولا يفك ضغط الإكسل — حدّثه أو احفظ الملف بصيغة CSV · ' +
        'browser too old for .xlsx, please save as CSV'));
    }
    /* copy into a fresh buffer: subarray views can upset some engines here */
    var blob = new Blob([raw.slice()]);
    return new Response(
      blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))
    ).arrayBuffer().then(function (out) { return utf8(new Uint8Array(out)); });
  }

  /* A1 → 0 · AB7 → 27. Needed so an empty cell keeps its column. */
  function colIndex(ref) {
    var i = 0, c = 0;
    while (i < ref.length) {
      var code = ref.charCodeAt(i);
      if (code < 65 || code > 90) break;
      c = c * 26 + (code - 64); i++;
    }
    return c - 1;
  }

  /* تواريخ إكسل مخزّنة كأرقام. اليوم ١ = ١٩٠٠/١/١، مع خطأ الكبيسة الشهير
     الذي يجعل نقطة الصفر ١٨٩٩/١٢/٣٠. Excel stores dates as numbers. */
  function excelDate(serial) {
    var ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
    var d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    function two(x) { return (x < 10 ? '0' : '') + x; }
    return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate());
  }
  global.__azExcelDate = excelDate;

  function xmlDoc(text) {
    var d = new DOMParser().parseFromString(text, 'application/xml');
    if (d.getElementsByTagName('parsererror').length) throw new Error('XML تالف · malformed XML');
    return d;
  }

  function readXLSX(buf) {
    return Promise.resolve().then(function () {
      var zip = zipEntries(buf);

      /* أي ورقة هي الأولى فعلاً؟ ترتيب التبويبات في workbook.xml،
         ومسار الملف في العلاقات. sheet1.xml ليس دائماً التبويب الأول. */
      return Promise.all([
        zipRead(zip, 'xl/workbook.xml'),
        zipRead(zip, 'xl/_rels/workbook.xml.rels'),
        zipRead(zip, 'xl/sharedStrings.xml'),
        zipRead(zip, 'xl/styles.xml')
      ]).then(function (parts) {
        var target = 'xl/worksheets/sheet1.xml';
        try {
          var wb = xmlDoc(parts[0]);
          var first = wb.getElementsByTagName('sheet')[0];
          var rid = first && (first.getAttribute('r:id') ||
                              first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
          if (rid) {
            var rels = xmlDoc(parts[1]).getElementsByTagName('Relationship');
            for (var i = 0; i < rels.length; i++) {
              if (rels[i].getAttribute('Id') === rid) {
                var t = rels[i].getAttribute('Target') || '';
                target = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
                break;
              }
            }
          }
        } catch (e) { /* fall back to sheet1.xml */ }
        if (!zip.map[target]) target = 'xl/worksheets/sheet1.xml';
        if (!zip.map[target]) throw new Error('لا توجد ورقة بيانات · no worksheet found');

        /* النصوص المشتركة: إكسل يخزّن كل نص مرة واحدة ويشير إليه برقم */
        var shared = [];
        if (parts[2]) {
          var si = xmlDoc(parts[2]).getElementsByTagName('si');
          for (var s = 0; s < si.length; s++) {
            var ts = si[s].getElementsByTagName('t'), txt = '';
            for (var q = 0; q < ts.length; q++) txt += ts[q].textContent || '';
            shared.push(txt);
          }
        }

        /* أي أنماط تعني «تاريخ»؟ نقرأها لنحوّل ٤٥٩٠٠ إلى ٢٠٢٥-٧-٢١
           بدل أن تدخل قاعدة البيانات كرقم بلا معنى. */
        var dateStyle = {};
        if (parts[3]) {
          try {
            var st = xmlDoc(parts[3]);
            var custom = {};
            var nf = st.getElementsByTagName('numFmt');
            for (var f = 0; f < nf.length; f++) {
              var code = nf[f].getAttribute('formatCode') || '';
              if (/[dmyhs]/i.test(code.replace(/\[[^\]]*\]|"[^"]*"/g, ''))) {
                custom[nf[f].getAttribute('numFmtId')] = true;
              }
            }
            var BUILTIN = { 14:1,15:1,16:1,17:1,18:1,19:1,20:1,21:1,22:1,45:1,46:1,47:1 };
            var xfs = st.getElementsByTagName('cellXfs')[0];
            var list = xfs ? xfs.getElementsByTagName('xf') : [];
            for (var x = 0; x < list.length; x++) {
              var id = list[x].getAttribute('numFmtId');
              if (BUILTIN[+id] || custom[id]) dateStyle[x] = true;
            }
          } catch (e) { /* dates simply stay numeric */ }
        }

        return zipRead(zip, target).then(function (sheetXml) {
          var doc = xmlDoc(sheetXml);
          var rowEls = doc.getElementsByTagName('row');
          var rows = [], width = 0;

          for (var r = 0; r < rowEls.length; r++) {
            var cells = rowEls[r].getElementsByTagName('c');
            var out = [];
            for (var c = 0; c < cells.length; c++) {
              var cell = cells[c];
              var ref = cell.getAttribute('r') || '';
              var at = ref ? colIndex(ref) : out.length;
              if (at < 0) at = out.length;
              while (out.length < at) out.push('');    /* keep blank columns */

              var type = cell.getAttribute('t');
              var val = '';
              if (type === 'inlineStr') {
                var its = cell.getElementsByTagName('t');
                for (var y = 0; y < its.length; y++) val += its[y].textContent || '';
              } else {
                var vEl = cell.getElementsByTagName('v')[0];
                var vTxt = vEl ? (vEl.textContent || '') : '';
                if (type === 's') val = shared[+vTxt] != null ? shared[+vTxt] : '';
                else if (type === 'b') val = vTxt === '1' ? 'true' : 'false';
                else if (type === 'e') val = '';                    /* #REF! etc → empty */
                else {
                  var styleId = cell.getAttribute('s');
                  if (styleId != null && dateStyle[+styleId] && vTxt !== '' && !isNaN(+vTxt)) {
                    val = excelDate(+vTxt) || vTxt;
                  } else val = vTxt;
                }
              }
              out.push(val);
            }
            if (out.length > width) width = out.length;
            rows.push(out);
          }

          /* صفوف متساوية الطول، وحذف الفارغ تماماً — نفس ما يفعله قارئ CSV */
          rows = rows.map(function (rw) {
            while (rw.length < width) rw.push('');
            return rw;
          }).filter(function (rw) {
            return rw.some(function (v) { return String(v).trim() !== ''; });
          });

          if (rows.length > MAX_ROWS + 1) rows = rows.slice(0, MAX_ROWS + 1);
          return rows;
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · مطابقة أعمدة الملف بحقول الشاشة
        Matches by Arabic label, English label or field name, ignoring
        case and spaces. So a column headed «اسم الموظف» finds the field
        whose Arabic label is «اسم الموظف».
     ═══════════════════════════════════════════════════════════════════ */
  function norm(s) {
    return String(s || '').trim().toLowerCase()
      /* الكلام بين قوسين توضيح لا جزء من الاسم: «الاعتمادات (مواد ورسومات)» */
      .replace(/[(（][^)）]*[)）]/g, '')
      .replace(/[ًٌٍَُِّْـ]/g, '')            /* تشكيل وتطويل */
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[^\p{L}\p{N}]+/gu, '')       /* رموز ومسافات وشرطات */
      .replace(/^(ال)/, '');                 /* «التاريخ» = «تاريخ» */
  }

  /* مرادفات شائعة في ملفات الشركة الحقيقية.
     Synonyms that turn up in the company's real spreadsheets. */
  var ALIAS = {
    'اسم': 'name', 'الاسم': 'name', 'اسمالموظف': 'employee', 'الموظف': 'employee',
    'كود': 'code', 'الكود': 'code', 'رقم': 'docNo', 'رقمالمستند': 'docNo',
    'مسلسل': 'docNo', 'تاريخ': 'date', 'المشروع': 'project', 'الموقع': 'site',
    'ملاحظات': 'notes', 'بيان': 'notes', 'الوصف': 'notes', 'وصف': 'notes',
    'المبلغ': 'amount', 'قيمة': 'amount', 'القيمة': 'amount', 'اجمالي': 'amount',
    'الكميه': 'quantity', 'كميه': 'quantity', 'الوحده': 'unit',
    'تليفون': 'phone', 'موبايل': 'phone', 'الهاتف': 'phone',
    'العنوان': 'address', 'الحاله': 'status', 'الوظيفه': 'jobTitle',
    'الرقمالقومي': 'nationalIdNo', 'بطاقه': 'nationalIdNo',
    'البطاقهالضريبيه': 'taxCardNo', 'سجلتجاري': 'commercialReg'
  };

  /* ═══════════════════════════════════════════════════════════════════
     المطابقة على أربع مراحل بدل مرحلة واحدة
     -------------------------------------------------------------------
     كانت المطابقة تطلب تطابقاً حرفياً كاملاً، فأي اختلاف بسيط — «التاريخ»
     بدل «تاريخ»، أو «الكمية (م٣)» بدل «الكمية» — يجعل العمود مجهولاً،
     وتظهر رسالة «لم يُتعرَّف على أي عمود» على ملف صحيح تماماً.

     Matching demanded a character-perfect match, so any small difference
     — «التاريخ» for «تاريخ», or «الكمية (م٣)» for «الكمية» — left the
     column unrecognised and produced "no column was recognised" on a
     perfectly good file.
     ═══════════════════════════════════════════════════════════════════ */
  function mapColumns(mod, headers) {
    var fields = (mod.fields || []).filter(function (f) {
      return f.type !== 'calc' && !f.readonly;
    });
    var used = {};

    function pick(n) {
      var i, f, cand;

      /* ١ · تطابق تام */
      for (i = 0; i < fields.length; i++) {
        f = fields[i];
        if (used[f.name]) continue;
        if (norm(f.label.ar) === n || norm(f.label.en) === n || norm(f.name) === n) return f;
      }
      /* ٢ · مرادف معروف */
      if (ALIAS[n]) {
        for (i = 0; i < fields.length; i++) {
          if (!used[fields[i].name] && fields[i].name === ALIAS[n]) return fields[i];
        }
      }
      /* ٣ · أحدهما يحتوي الآخر — «تاريخالطلب» مقابل «تاريخ» */
      if (n.length >= 3) {
        cand = null;
        for (i = 0; i < fields.length; i++) {
          f = fields[i];
          if (used[f.name]) continue;
          [norm(f.label.ar), norm(f.label.en), norm(f.name)].forEach(function (v) {
            if (!v || v.length < 3 || cand) return;
            if (v === n || v.indexOf(n) === 0 || n.indexOf(v) === 0) cand = f;
          });
          if (cand) return cand;
        }
        for (i = 0; i < fields.length; i++) {
          f = fields[i];
          if (used[f.name]) continue;
          if (norm(f.label.ar).indexOf(n) !== -1 || n.indexOf(norm(f.label.ar)) !== -1) {
            if (norm(f.label.ar).length >= 3) return f;
          }
        }
      }
      return null;
    }

    return headers.map(function (h) {
      var n = norm(h);
      if (!n) return null;
      var hit = pick(n);
      if (hit) used[hit.name] = true;   /* عمود واحد لكل حقل */
      return hit || null;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ب · الربط اليدوي — الحل الأخير الذي كان ناقصاً
     -------------------------------------------------------------------
     مهما تحسّنت المطابقة الآلية ستفشل أحياناً: ملف بعناوين إنجليزية
     مختصرة، أو عناوين من نظام آخر. الرفض حينها ليس حلاً — الحل أن يربط
     المستخدم الأعمدة بنفسه مرة واحدة ويكمل.

     However good the automatic matching gets it will sometimes fail, and
     refusing the file is not an answer. The person maps the columns
     himself, once, and carries on.
     ═══════════════════════════════════════════════════════════════════ */
  function mapDialog(moduleId, rows, cols) {
    var mod = Schema.get(moduleId);
    var headers = rows[0] || [];
    var sample = rows[1] || [];
    var fields = (mod.fields || []).filter(function (f) {
      return f.type !== 'calc' && !f.readonly;
    });

    var opts = '<option value="">' + esc(L({ ar: '— تجاهل هذا العمود —', en: '— ignore this column —' })) + '</option>' +
      fields.map(function (f) {
        return '<option value="' + esc(f.name) + '">' + esc(lab(f.label)) +
               (f.required ? ' *' : '') + '</option>';
      }).join('');

    var body =
      '<p>' + esc(L({
        ar: 'اربط كل عمود في ملفك بالحقل المقابل. ما تتركه فارغاً يُتجاهل.',
        en: 'Match each column in your file to a field. Anything left blank is ignored.' })) + '</p>' +
      '<div style="max-height:52vh;overflow:auto"><table style="width:100%;border-collapse:collapse">' +
      '<thead><tr style="border-bottom:2px solid #ddd">' +
        '<th style="padding:7px 9px;text-align:start">' + esc(L({ ar: 'عمود الملف', en: 'Column in your file' })) + '</th>' +
        '<th style="padding:7px 9px;text-align:start">' + esc(L({ ar: 'أول قيمة', en: 'First value' })) + '</th>' +
        '<th style="padding:7px 9px;text-align:start">' + esc(L({ ar: 'الحقل في الشاشة', en: 'Field on the screen' })) + '</th>' +
      '</tr></thead><tbody>' +
      headers.map(function (h, i) {
        var chosen = cols[i] ? cols[i].name : '';
        return '<tr>' +
          '<td style="padding:6px 9px;font-weight:600">' + esc(h) + '</td>' +
          '<td style="padding:6px 9px;color:#667">' + esc(String(sample[i] == null ? '' : sample[i]).slice(0, 30)) + '</td>' +
          '<td style="padding:6px 9px"><select data-az-map="' + i + '" style="min-width:230px;padding:5px">' +
            (chosen ? opts.replace('value="' + esc(chosen) + '"', 'value="' + esc(chosen) + '" selected') : opts) +
          '</select></td></tr>';
      }).join('') +
      '</tbody></table></div>';

    UI.modal({
      title: L({ ar: 'ربط أعمدة الملف', en: 'Match your columns' }),
      wide: true,
      body: body,
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        { label: L({ ar: 'متابعة ←', en: 'Continue →' }), cls: 'btn-primary',
          onClick: function () {
            var manual = headers.map(function (h, i) {
              var sel = document.querySelector('[data-az-map="' + i + '"]');
              var name = sel ? sel.value : '';
              if (!name) return null;
              return fields.filter(function (f) { return f.name === name; })[0] || null;
            });
            setTimeout(function () { preview(moduleId, rows, manual); }, 60);
          } }
      ]
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
      /* الأرقام العربية تظهر في ملفات حقيقية · Arabic-Indic digits appear in real files */
      var d = v.replace(/[٠-٩]/g, function (x) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(x); })
               .replace(/[\/.]/g, '-');

      /* شبكة أمان: خلية تاريخ لم يُنسَّق كتاريخ في إكسل تصل رقماً خاماً
         مثل 45900. بدون هذا السطر تدخل قاعدة البيانات «45900» كتاريخ
         تعيين — خطأ صامت وهو أسوأ نوع.
         Safety net: a date cell that was never formatted as a date in
         Excel arrives as the bare serial 45900. Without this it would be
         stored as a hire date of "45900" — silently wrong.
         The window 20000–60000 is 1954 to 2064; no real dd-mm-yyyy or
         yyyy-mm-dd string can be mistaken for it. */
      if (/^\d{5}$/.test(d)) {
        var n2 = +d;
        if (n2 >= 20000 && n2 <= 60000 && global.__azExcelDate) {
          var conv = global.__azExcelDate(n2);
          if (conv) return conv;
        }
      }

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
  function preview(moduleId, rows, manualCols) {
    var mod = Schema.get(moduleId);
    var headers = rows[0] || [];
    var cols = manualCols || mapColumns(mod, headers);
    var matched = cols.filter(Boolean).length;

    /* لا نرفض الملف بعد اليوم. إن عجزت المطابقة الآلية نفتح شاشة الربط
       اليدوي مباشرة — الرفض كان يترك المستخدم بلا طريق.
       We no longer refuse the file. If automatic matching fails we open
       the manual mapping screen; refusing left the person with nowhere
       to go. */
    if (!matched && !manualCols) { mapDialog(moduleId, rows, cols); return; }
    if (!matched) {
      UI.toast(L({ ar: 'لم تربط أي عمود بحقل. لن يُستورد شيء.',
                   en: 'No column was matched to a field. Nothing would be imported.' }), 'error');
      mapDialog(moduleId, rows, cols);
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
        /* حتى لو تعرّف على بعض الأعمدة، قد يكون تعرّف عليها خطأ. هذا الزر
           يفتح الربط اليدوي لتصحيحه قبل كتابة أي صف.
           Even a partial match can be the wrong match. This reopens the
           mapping so it can be corrected before a single row is written. */
        { label: L({ ar: '⇄ تعديل ربط الأعمدة', en: '⇄ Change column matching' }), cls: 'btn-outline',
          onClick: function () { setTimeout(function () { mapDialog(moduleId, rows, cols); }, 60); } },
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
    /* Excel first, because that is what the company actually works in. */
    input.accept = '.xlsx,.xlsm,.csv,.tsv,.txt,' +
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var name = (file.name || '').toLowerCase();

      function done(rows) {
        if (!rows || rows.length < 2) {
          UI.toast(L({ ar: 'الملف فارغ أو به صف عناوين فقط.',
                       en: 'The file is empty or has only a header row.' }), 'error');
          return;
        }
        preview(moduleId, rows);
      }
      function fail(msgAr, msgEn) {
        UI.toast(L({ ar: msgAr, en: msgEn }), 'error', 9000);
      }

      /* ── الصيغ التي لا تُقرأ، وسبب ذلك بوضوح ──────────────────────── */
      if (/\.xls$/.test(name)) {
        return fail('صيغة .xls القديمة (إكسل ٢٠٠٣) لا تُقرأ. افتح الملف في إكسل ثم: ' +
                    'ملف ← حفظ باسم ← Excel Workbook (.xlsx) وأعد المحاولة.',
                    'The old .xls format cannot be read. Open it in Excel, then ' +
                    'File → Save As → Excel Workbook (.xlsx), and try again.');
      }
      if (/\.pdf$/.test(name)) {
        return fail('ملف PDF ليس جدول بيانات — هو صورة للبيانات، وقراءته آلياً ' +
                    'تُنتج أرقاماً خاطئة بصمت، وهو أخطر من الرفض. ' +
                    'للاحتفاظ به: افتح المستند واستخدم «المرفقات» في أسفل الشاشة.',
                    'A PDF is a picture of data, not a spreadsheet. Reading it ' +
                    'automatically produces silently wrong numbers, which is worse ' +
                    'than refusing. To keep the file, open the record and use the ' +
                    'Attachments panel at the bottom.');
      }
      if (/\.(docx?|jpe?g|png|zip|rar)$/.test(name)) {
        return fail('هذا ليس ملف بيانات. المقبول: ‎.xlsx‎ أو ‎.csv‎. ' +
                    'أي ملف آخر يُرفق بالمستند من لوحة «المرفقات».',
                    'Not a data file. Accepted: .xlsx or .csv. Anything else ' +
                    'belongs in the Attachments panel on the record.');
      }

      /* ── إكسل ─────────────────────────────────────────────────────── */
      if (/\.(xlsx|xlsm)$/.test(name)) {
        var rx = new FileReader();
        rx.onerror = function () { fail('تعذّرت قراءة الملف من القرص.', 'Could not read the file from disk.'); };
        rx.onload = function () {
          readXLSX(rx.result).then(done).catch(function (e) {
            console.error('[import] xlsx', e);
            fail('تعذّرت قراءة ملف الإكسل: ' + (e && e.message ? e.message : '') +
                 ' — جرّب: ملف ← حفظ باسم ← CSV UTF-8.',
                 'Could not read the Excel file: ' + (e && e.message ? e.message : '') +
                 ' — try File → Save As → CSV UTF-8.');
          });
        };
        return rx.readAsArrayBuffer(file);
      }

      /* ── CSV / TSV / نص ───────────────────────────────────────────── */
      var reader = new FileReader();
      reader.onerror = function () { fail('تعذّرت قراءة الملف من القرص.', 'Could not read the file from disk.'); };
      reader.onload = function () {
        try { done(parseCSV(String(reader.result || ''))); }
        catch (e) {
          console.error('[import]', e);
          fail('تعذّرت قراءة الملف.', 'Could not read the file.');
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
