/* =========================================================================
   xlsx-writer.js — يكتب ملف إكسل حقيقياً (.xlsx) لا ملفاً نصياً بفواصل
   xlsx-writer.js — writes a GENUINE Excel workbook (.xlsx), not comma text
   -------------------------------------------------------------------------
   العطل الذي يمنعه · THE FAULT IT PREVENTS
   أ. محمد عمارة صدّر الموظفين فظهر كل موظف في خلية واحدة: «رقمه، كوما،
   اسمه، كوما، على رأس العمل، كوما». زر التصدير اليوم يكتب ملف CSV — نصاً
   بفواصل — وإكسل يقرّر وحده هل يقسمه على الفاصلة أم لا بحسب إعدادات
   المنطقة في الجهاز. مقيس في التمرين: الملف نفسه يصير ٧ أعمدة إن قُسِّم
   بالفاصلة، وعموداً واحداً إن كان فاصل القوائم في الجهاز «;». أنّ هذا هو
   سبب ما رآه عمارة بالضبط **فرضيّة** — لم نرَ جهازه. لكن ملف إكسل الحقيقي
   لا يعتمد على أي إعداد: كل قيمة في خليتها، بنوعها، في أي جهاز.

   Omara exported the employee list and each person landed in ONE cell:
   "number, comma, name, comma, active, comma". Today's Export writes CSV —
   comma text — and Excel decides by itself whether to split it, using the
   computer's regional list separator. Measured in practice: the same file is
   7 columns split on commas and ONE column when the list separator is ";".
   That this is exactly what happened on his laptop is a HYPOTHESIS — his
   machine was never inspected. A real workbook depends on no setting at all:
   every value in its own cell, with its own type, on any computer.

   -------------------------------------------------------------------------
   لماذا بلا مكتبة · WHY NO LIBRARY
   import.js يقرأ الإكسل بلا مكتبة (ZIP + XML يفكّها المتصفح). نفس الفلسفة
   هنا للكتابة: ملف الإكسل ZIP بداخله XML. نخزّنه بلا ضغط (مسموح في المواصفة
   ويفتحه إكسل عادياً)، فلا نحتاج إلا حساب CRC32 — ستّون سطراً لا ستّين
   كيلوبايت من كود لم نختبره، ويعمل بلا إنترنت.
   import.js already reads .xlsx with no library. Same here for writing: a
   workbook is a ZIP of XML. We store entries uncompressed (valid in the
   standard; Excel opens it normally), so only a CRC32 is needed — a few
   dozen lines instead of 60 KB of untested code, and it works offline.

   -------------------------------------------------------------------------
   ثلاث قواعد لا تُكسر · THREE RULES THAT DO NOT BREAK
   ١) الأرقام التي هي «أسماء» لا كميات (الرقم الوظيفي، القومي، الهاتف،
      الحساب البنكي) تُكتب نصاً، بتنسيق «نص» على العمود كله — فلا يحذف
      إكسل الصفر الأول، ولا يقطع رقم حساب طويل بعد ١٥ رقماً، ولا يحوّل
      ٢٩٠٠١٠١١٢٣٤٥٦٧ إلى 2.9E+13 — لا في الملف ولا حين يكتب المستخدم في
      خلية فارغة من القالب.
   ٢) الخانة الفارغة تبقى فارغة. لا صفر مكان راتب لم يُسجَّل.
   ٣) نصّ يبدأ بـ = أو + أو - أو @ يُكتب نصاً صريحاً (quotePrefix)، فلا
      يصير معادلة تُنفَّذ حتى لو ضغط المستخدم على الخلية وأعاد إدخالها.
   1) Numbers that are NAMES, not quantities (employee no., national ID,
      phone, bank account) are written as text, with the whole column
      formatted as Text — so Excel never drops a leading zero, never cuts a
      long account number after 15 digits, never shows 2.9E+13 — in the file
      AND when a person types into an empty template cell.
   2) A blank stays blank. Never a zero where no salary was recorded.
   3) Text starting with = + - @ is stored as explicit text (quotePrefix),
      so it can never become an executed formula, even if the person edits
      the cell and presses Enter.

   إضافي بالكامل · ADDITIVE. Nothing calls this file except the HR Excel
   files; deleting it removes nothing that exists today.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ── CRC32 (ZIP needs it for every entry) ─────────────────────────── */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8Bytes(s) { return new TextEncoder().encode(s); }

  /* ── ZIP, stored (method 0) ───────────────────────────────────────── */
  function zip(files) {
    var parts = [], central = [], offset = 0;
    var d = new Date();
    var dosTime = ((d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2))) & 0xFFFF;
    var dosDate = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    files.forEach(function (f) {
      var name = utf8Bytes(f.name), data = utf8Bytes(f.text), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    var total = all.reduce(function (s, p) { return s + p.length; }, 0), out = new Uint8Array(total), at = 0;
    all.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  /* ── XML helpers ──────────────────────────────────────────────────── */
  function xesc(s) {
    return String(s)
      /* حروف تحكّم غير مسموحة في XML تُفسد الملف كله — تُحذف
         control characters XML forbids would corrupt the whole file */
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colName(i) {           /* 0 → A, 27 → AB */
    var s = ''; i = i + 1;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function sheetName(n) {         /* Excel: ≤31 chars, none of : \ / ? * [ ] */
    return String(n || 'Sheet').replace(/[:\\\/\?\*\[\]]/g, ' ').slice(0, 31);
  }

  /* ── Styles: the fixed list every sheet uses ──────────────────────── */
  var S = { plain: 0, head: 1, text: 2, money: 3, date: 4, integer: 5, textFormula: 6, headReq: 7, wrap: 8, number: 9, title: 10 };
  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="13"/><name val="Calibri"/></font></fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF5B6B7F"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="11">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                     /* 0 plain */
      '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>' +   /* 1 optional heading */
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +                               /* 2 TEXT '@' */
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +                              /* 3 money */
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +                              /* 4 date */
      '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +                                /* 5 integer */
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" quotePrefix="1"/>' +               /* 6 text that looks like a formula */
      '<xf numFmtId="49" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>' +   /* 7 REQUIRED heading */
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' + /* 8 wrapped text */
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                     /* 9 general number */
      '<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>' +                 /* 10 title */
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  var FORMULA_START = /^[=+\-@]/;

  /* Excel counts days from 1899-12-30 (the famous leap-year slip). */
  function excelSerial(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(ms)) return null;
    /* 🔴 تاريخ مستحيل (2025-13-45) لا يصير تاريخاً آخر بصمت — يبقى نصاً كما كُتب.
       قِيس ١٠ سبتمبر: بدون هذا الفحص صار 2025-13-45 هو 2026-02-14.
       🔴 An impossible date (2025-13-45) must never silently become another
       date — it stays text as written. Measured 10 Sept: without this check
       2025-13-45 became 2026-02-14. */
    var back = new Date(ms);
    if (back.getUTCFullYear() !== +m[1] || back.getUTCMonth() !== +m[2] - 1 || back.getUTCDate() !== +m[3]) return null;
    return Math.round((ms - Date.UTC(1899, 11, 30)) / 86400000);
  }

  /* One cell. `type` is the COLUMN's type; the value decides blank. */
  function cellXml(ref, value, type, styleOverride) {
    if (value === null || value === undefined || value === '') return '';          /* rule 2 */
    if (type === 'money' || type === 'number' || type === 'integer') {
      var n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
      if (isFinite(n)) {
        var st = styleOverride != null ? styleOverride : (type === 'money' ? S.money : type === 'integer' ? S.integer : S.number);
        return '<c r="' + ref + '" s="' + st + '"><v>' + String(n) + '</v></c>';
      }
      /* not a number after all — keep it visibly, as text, never as 0 */
    }
    if (type === 'date') {
      var serial = excelSerial(value);
      if (serial !== null) return '<c r="' + ref + '" s="' + (styleOverride != null ? styleOverride : S.date) + '"><v>' + serial + '</v></c>';
    }
    var s = String(value);
    var style = styleOverride != null ? styleOverride : (FORMULA_START.test(s) ? S.textFormula : (type === 'wrap' ? S.wrap : S.text));
    if (FORMULA_START.test(s) && (style === S.text || style === S.plain)) style = S.textFormula;          /* rule 3 */
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + xesc(s) + '</t></is></c>';
  }

  function colStyle(type) {
    if (type === 'text' || type === 'wrap' || type === 'select' || type === 'ref') return S.text;          /* rule 1, whole column */
    if (type === 'money') return S.money;
    if (type === 'date') return S.date;
    if (type === 'integer') return S.integer;
    return null;
  }

  /* sheet = { name, columns:[{header, type, width, required}], rows:[[...]], rtl, headerRow:true,
               title: optional first line above headers (NOT used on data sheets — the importer
               reads row 1 as headings), validations:[{col, listRef}], hidden } */
  function sheetXml(sh) {
    var cols = sh.columns || [];
    var out = [];
    out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
    var lastCol = colName(Math.max(0, cols.length - 1));
    var nRows = (sh.rows || []).length + (sh.noHeader ? 0 : 1);
    out.push('<dimension ref="A1:' + lastCol + Math.max(1, nRows) + '"/>');
    out.push('<sheetViews><sheetView ' + (sh.rtl !== false ? 'rightToLeft="1" ' : '') + (sh.selected ? 'tabSelected="1" ' : '') + 'workbookViewId="0">' +
      (!sh.noHeader && sh.freeze !== false ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : '') +
      '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>');
    if (cols.length) {
      out.push('<cols>');
      cols.forEach(function (c, i) {
        var st = colStyle(c.type);
        out.push('<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.width || 18) + '" customWidth="1"' + (st != null ? ' style="' + st + '"' : '') + '/>');
      });
      out.push('</cols>');
    }
    out.push('<sheetData>');
    var r = 1;
    if (!sh.noHeader) {
      out.push('<row r="1">' + cols.map(function (c, i) {
        return cellXml(colName(i) + '1', c.header, 'text', c.required ? S.headReq : S.head);
      }).join('') + '</row>');
      r = 2;
    }
    (sh.rows || []).forEach(function (row) {
      var cells = '';
      for (var i = 0; i < cols.length; i++) {
        var spec = row.__styles && row.__styles[i];
        cells += cellXml(colName(i) + r, row[i], cols[i].type, spec != null ? spec : null);
      }
      out.push('<row r="' + r + '">' + cells + '</row>');
      r++;
    });
    out.push('</sheetData>');
    if (!sh.noHeader && sh.autoFilter !== false && cols.length) out.push('<autoFilter ref="A1:' + lastCol + Math.max(1, nRows) + '"/>');
    var vals = (sh.validations || []).filter(function (v) { return v && v.listRef; });
    if (vals.length) {
      out.push('<dataValidations count="' + vals.length + '">' + vals.map(function (v) {
        var L = colName(v.col);
        return '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="warning" ' +
          'errorTitle="' + xesc(v.errorTitle || 'قيمة غير موجودة في القائمة') + '" error="' + xesc(v.error || 'اختر من القائمة، أو اتركها فارغة.') + '" ' +
          'sqref="' + L + '2:' + L + (v.maxRow || 2000) + '"><formula1>' + xesc(v.listRef) + '</formula1></dataValidation>';
      }).join('') + '</dataValidations>');
    }
    out.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>');
    out.push('</worksheet>');
    return out.join('');
  }

  /* spec = { sheets:[…], title } → Uint8Array (.xlsx bytes).
     🔴 The FIRST sheet is what DataImport.readXLSX reads — so whatever must
     be importable goes first, and instructions/examples go after it. */
  function build(spec) {
    var sheets = spec.sheets || [];
    if (!sheets.length) throw new Error('xlsx: no sheets');
    var names = {};
    sheets.forEach(function (s, i) {
      var n = sheetName(s.name || ('Sheet' + (i + 1))), base = n, k = 2;
      while (names[n]) n = (base.slice(0, 28) + ' ' + k++);
      names[n] = true; s.__name = n;
    });
    var files = [];
    files.push({ name: '[Content_Types].xml', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>' });
    files.push({ name: '_rels/.rels', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>' });
    var defined = [];
    sheets.forEach(function (s, i) {
      if (!s.noHeader && s.autoFilter !== false && (s.columns || []).length) {
        defined.push('<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + xesc(s.__name.replace(/'/g, "''")) + '\'!$A$1:$' +
          colName(s.columns.length - 1) + '$' + Math.max(1, (s.rows || []).length + 1) + '</definedName>');
      }
    });
    files.push({ name: 'xl/workbook.xml', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map(function (s, i) { return '<sheet name="' + xesc(s.__name) + '" sheetId="' + (i + 1) + '"' + (s.hidden ? ' state="hidden"' : '') + ' r:id="rId' + (i + 1) + '"/>'; }).join('') +
      '</sheets>' + (defined.length ? '<definedNames>' + defined.join('') + '</definedNames>' : '') + '</workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'xl/styles.xml', text: STYLES_XML });
    sheets.forEach(function (s, i) {
      if (i === 0) s.selected = true;
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(s) });
    });
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    files.push({ name: 'docProps/core.xml', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + xesc(spec.title || '') + '</dc:title><dc:creator>Alzahraa Portal</dc:creator>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '</cp:coreProperties>' });
    files.push({ name: 'docProps/app.xml', text:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Alzahraa Portal</Application></Properties>' });
    return zip(files);
  }

  function download(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var name = /\.xlsx$/i.test(filename) ? filename : filename + '.xlsx';
    if (global.UI && UI.downloadBlob) { UI.downloadBlob(blob, name); return; }
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  global.XlsxWriter = { build: build, download: download, excelSerial: excelSerial, colName: colName, STYLE: S, crc32: crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
