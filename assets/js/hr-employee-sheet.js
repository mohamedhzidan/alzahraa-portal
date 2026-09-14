/* =========================================================================
   hr-employee-sheet.js — كشف أ. محمد عمارة: عشرة حقول جديدة، ملف نموذجي
                          بشكله بالضبط، واستيراد يرفض عمود العمود لا يسكت
   hr-employee-sheet.js — Omara's employee sheet: ten new fields, a
                          template in his EXACT shape, and an import that
                          REFUSES an unrecognised column instead of
                          quietly dropping it
   -------------------------------------------------------------------------
   المصدر · SOURCE
   ملفه الحقيقي (21 عموداً، E/_evidence/source/Employ-from-Amara-2026-09-13.xlsx)
   فيه عشرة أعمدة لا حقل لها في بطاقة الموظف إطلاقاً، وعمود «القسم» فيه
   أكواد رقمية (١١٢) لا أسماء — فيرفضها منتقي القوائم اليوم. هذا الملف
   الإضافي يضيف الحقول العشرة، ويضيف مرادفات عناوينه، ويبني قالباً بشكله
   بالضبط، ويترجم أكواد الأقسام قبل أن يصل الملف للمراجعة العادية.

   His real file has ten columns with no matching field on the employee
   record at all, and a «القسم» (department) column holding numeric codes
   (112) instead of names — refused by today's select-matcher. This
   additive file adds the ten fields, adds their heading synonyms, builds
   a template in his exact shape, and translates department codes before
   the file reaches the ordinary review.

   -------------------------------------------------------------------------
   إضافي بالكامل، ويلفّ لا يراقب · FULLY ADDITIVE, AND WRAPS RATHER THAN
   WATCHES (frontend.md: forms/imports live inside functions the app
   already calls — watching #content misses them). احذف هذا الملف فيختفي:
   الحقول العشرة، مرادفاتها، تغليف Auth.scopeRows، تغليف
   DataImport.preview، وزرّ «⬇ ملف نموذجي» على شاشة الموظفين يعود لشكل
   hr-excel-downloads.js القديم — كل شيء آخر يبقى كما هو بالضبط.
   Delete this file and it all disappears: the ten fields, their
   synonyms, the Auth.scopeRows wrap, the DataImport.preview wrap, and
   the Employees screen's «⬇ Template» button returns to
   hr-excel-downloads.js's older shape — nothing else changes.

   🔴 فخّ التراجع · UNDO TRAP (addendum §H): حذف هذا الملف وحده يترك عمود
   «site» ظاهراً في عرض قاعدة البيانات (إن كان الملف ٨١ قد طُبِّق) بينما
   يختفي تغليفنا الذي يجعل تقليم المواقع في المتصفح بلا أثر على الموظفين —
   فالتراجع الكامل يحتاج أيضاً حذف عمود site من العرض (انظر التراجع في
   ملف SQL 81)، أو الإبقاء على هذا الملف.
   UNDO TRAP (addendum §H): deleting this file ALONE leaves `site` visible
   in the database view (once file 81 is applied) while removing the wrap
   that makes the browser's site pruning a no-op for employees — a full
   undo also needs the view shrunk back down (see SQL 81's own undo
   comment), or this file kept in place.

   يُحمَّل بعد hr-excel-downloads.js (بعد hr-import-review.js وimport-
   mapping-plus.js وimport-headerless.js أيضاً) — فيصبح لفّنا لـ
   DataImport.preview الأخارجي، ويستدعي كل الإضافات السابقة كما هي.
   Loads AFTER hr-excel-downloads.js (and therefore after hr-import-
   review.js, import-mapping-plus.js and import-headerless.js too) — so
   our DataImport.preview wrap becomes the OUTERMOST one and still calls
   every earlier addition unchanged.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══ ٠ · اللغة والمساعدات المحلية · LANGUAGE + LOCAL HELPERS ═══════════ */
  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ═══ ١ · الحقول العشرة على بطاقة الموظف · THE TEN EMPLOYEE FIELDS ═════
     نفس نمط payroll-insurance.js:81-116 / hr-department.js:49,500-520 —
     F() محلية، تحقّق من عدم التكرار بالاسم أولاً، ثم إدراج بعد الجار
     المذكور بالاسم لا في آخر القائمة. Same pattern as payroll-insurance.js
     :81-116 / hr-department.js:49,500-520 — a local F(), a duplicate
     guard by NAME first, then insertion after a named neighbour, not at
     the list's end. */
  function installFields() {
    if (!global.Schema) { console.error('hr-employee-sheet.js: schema.js must load first — no fields added'); return; }
    if (!global.Auth) { console.error('hr-employee-sheet.js: auth.js must load first — no fields added, no masking'); return; }
    var emp = Schema.get('employees');
    if (!emp || !emp.fields) { console.error('hr-employee-sheet.js: the employees screen was not found — no fields added'); return; }

    function F(name, ar, en, type, extra) {
      return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
    }
    var SEC = {
      main:  { ar: 'البيانات الأساسية', en: 'Main information' },
      money: { ar: 'القيم المالية',     en: 'Financial values' },
      link:  { ar: 'الربط والتحميل',    en: 'Links & cost allocation' },
      extra: { ar: 'بيانات إضافية',     en: 'Additional information' },
      dates: { ar: 'التواريخ',          en: 'Dates' }
    };
    function addField(f, afterName) {
      /* الحارس من التكرار بالاسم أولاً — لا يُضاف حقل مرتين أبداً حتى لو
         أُعيد تحميل هذا الملف. Duplicate guard by NAME first — a field is
         never added twice, even if this file reloads. */
      if (emp.fields.some(function (x) { return x.name === f.name; })) return;
      var i = afterName ? emp.fields.findIndex(function (x) { return x.name === afterName; }) : -1;
      if (i === -1) emp.fields.push(f); else emp.fields.splice(i + 1, 0, f);
    }

    addField(F('manualNo', 'الرقم اليدوي', 'Manual no.', 'text', { section: SEC.main }), 'code');
    addField(F('workDate', 'تاريخ العمل', 'Work date', 'date', { section: SEC.dates }), 'hireDate');
    addField(F('costCenter', 'مركز التكلفة الفرعي', 'Sub cost centre', 'text', { section: SEC.link }), 'department');
    addField(F('nameEn', 'الاسم بالإنجليزية', 'Name (English)', 'text', { section: SEC.main }), 'name');
    addField(F('maritalStatus', 'الحالة الاجتماعية', 'Marital status', 'text', { section: SEC.extra }), 'address');
    addField(F('academicQualification', 'المؤهل', 'Academic qualification', 'text', { section: SEC.extra }), 'maritalStatus');
    addField(F('birthDate', 'تاريخ الميلاد', 'Date of birth', 'date', { section: SEC.dates }), 'academicQualification');
    addField(F('professionNo', 'رقم المهنة', 'Profession no.', 'text', { section: SEC.extra }), 'insuranceNo');
    addField(F('residenceProfession', 'مهنة الإقامة', 'Residence profession', 'text', { section: SEC.extra }), 'professionNo');
    addField(F('insuranceAmount', 'تأمينات (من كشف الموظفين)', 'Insurance (from the employee sheet)', 'money', {
      section: SEC.money,
      /* رقم تخزين فقط — لا يدخل صافي الراتب في payroll-net.js إطلاقاً.
         Storage only — never enters the net-pay formula in payroll-net.js. */
      help: { ar: 'لا يدخل في حساب المرتب', en: 'Not included in the salary calculation' }
    }), 'allowances');

    /* حقلان ماليان/شخصيان حسّاسان مثل باقي بيانات الموظف — يُدفعان إلى
       قائمة auth.js المرجعية نفسها (auth.js:49-52، مُصدَّرة بالمرجع
       auth.js:1039) بدل نسخها. birthDate موجودة هناك أصلاً — لا تُكرَّر.
       Two sensitive personal fields, exactly like the rest of the
       employee's private data — pushed into auth.js's OWN list
       (auth.js:49-52, exported by reference auth.js:1039) instead of
       copying it. birthDate is already there — never duplicated. */
    if (Auth.SENSITIVE && Array.isArray(Auth.SENSITIVE.employees)) {
      ['maritalStatus', 'academicQualification'].forEach(function (n) {
        if (Auth.SENSITIVE.employees.indexOf(n) === -1) Auth.SENSITIVE.employees.push(n);
      });
    } else {
      console.error('hr-employee-sheet.js: Auth.SENSITIVE.employees not found — maritalStatus/academicQualification will NOT be hidden from non-HR roles in the browser (the database view still masks them once SQL 81 runs)');
    }
  }

  /* ═══ ٢ · مرادفات العناوين + الأعمدة النصّية · SYNONYMS + TEXT COLUMNS ═══
     تُعدَّل الكائنات المشتركة نفسها (HRExcel.SYNONYMS.employees مُصدَّرة
     بالمرجع hr-excel-screens.js:618, HRExcel.SCREENS.employees.text) —
     لا نُنشئ نسخة، فيقرأها matchHeading وقت المطابقة كما هي.
     Mutates the SAME shared objects (HRExcel.SYNONYMS.employees, exported
     by reference at hr-excel-screens.js:618; HRExcel.SCREENS.employees
     .text) — no copy is made, so matchHeading reads them live at match
     time. */
  function installSynonyms() {
    if (!global.HRExcel || !HRExcel.SYNONYMS || !HRExcel.SYNONYMS.employees) {
      console.error('hr-employee-sheet.js: hr-excel-screens.js must load first — heading synonyms not added, his file will show unclear columns instead of being read automatically');
      return;
    }
    var SYN = HRExcel.SYNONYMS.employees;
    function add(k, v) { if (!(k in SYN)) SYN[k] = v; }
    add('رقم يدوي', 'manualNo'); add('الرقم اليدوي', 'manualNo');
    /* «رقم الوظيفة» يطبَّع إلى «رقمالوظيفه» و«الرقم الوظيفي» (كود) إلى
       «رقمالوظيفي» — مختلفان حرفياً (ه/ي)، فلا تصادم رغم التشابه.
       "رقم الوظيفة" normalises to "رقمالوظيفه"; the existing code label
       "الرقم الوظيفي" normalises to "رقمالوظيفي" — different by one
       letter (ه/ي), so no collision despite the resemblance. */
    add('رقم الوظيفة', 'code'); add('رقم الوظيفه', 'code');
    add('تاريخ العمل', 'workDate');
    add('م تكلفة فرعي', 'costCenter'); add('مركز تكلفة فرعي', 'costCenter'); add('مركز التكلفة الفرعي', 'costCenter');
    add('اسم انجليزي', 'nameEn'); add('الاسم الانجليزي', 'nameEn'); add('الاسم بالانجليزي', 'nameEn');
    add('حالة اجتماعية', 'maritalStatus'); add('الحالة الاجتماعية', 'maritalStatus');
    add('المؤهل', 'academicQualification');
    add('تاريخ الميلاد', 'birthDate');
    /* «المنهه» ليست إصلاحاً كتابياً لـ«المهنه» — النون والهاء متبادلتا
       الموضع، فالتطبيع لا يوحّدهما؛ يقبل الاستيراد كلا الشكلين (قرار
       المدير). "المنهه" is not a typo cleaning fixes — the ن/ه letters
       are transposed, so normalising never unifies them; both spellings
       are accepted (manager's decision). */
    add('رقم المنهه', 'professionNo'); add('رقم المهنه', 'professionNo'); add('رقم المهنة', 'professionNo');
    add('مهنة الاقامة', 'residenceProfession'); add('مهنة الإقامة', 'residenceProfession');
    add('تأمينات', 'insuranceAmount'); add('التأمينات', 'insuranceAmount');

    if (HRExcel.SCREENS && HRExcel.SCREENS.employees && Array.isArray(HRExcel.SCREENS.employees.text)) {
      ['manualNo', 'costCenter', 'professionNo'].forEach(function (n) {
        if (HRExcel.SCREENS.employees.text.indexOf(n) === -1) HRExcel.SCREENS.employees.text.push(n);
      });
    }
  }

  /* ═══ ٣ · تغليف Auth.scopeRows — الموظفون فقط (addendum §A-iii) ═════════
     sites.js يلفّ Auth.scopeRows فيقصّ المواقع بحسب site الصف. عمود site
     غائب عن عرض portal_employees اليوم فالقصّ بلا أثر؛ لو ظهر العمود بعد
     الملف ٨١ فقد يخفي عن مدير موارد بشرية بموقع «يرى كل المواقع» في قاعدة
     البيانات لكن لا يحمل الخانة نفسها في المتصفح (فجوة مقيسة ١٠ سبتمبر).
     فنحذف site من نسخة نمرّرها للدالة الأصلية، ثم نُعيد ربط الناجين
     بالسجلات الأصلية — يبقى تقليم المشروعات يعمل، ويبقى قصّ المواقع بلا
     أثر على الموظفين تماماً كاليوم. كل شاشة أخرى تمرّ دون أي تغيير.
     sites.js wraps Auth.scopeRows and prunes rows by their `site`. The
     column is absent from portal_employees today so the prune is already
     a no-op; if it appears after SQL 81 it could hide rows from an HR
     manager whose SITE consolidates everything in the database but whose
     browser copy does not carry that flag (a gap measured 10 Sept). So we
     delete `site` from a COPY passed to the original function, then map
     survivors back to the real records — project scoping still runs, and
     site pruning stays a no-op for employees exactly like today. Every
     other screen passes straight through. */
  function installScopeWrap() {
    if (!global.Auth || typeof Auth.scopeRows !== 'function') {
      console.error('hr-employee-sheet.js: Auth.scopeRows not found — employees will be scoped by SITE too once SQL 81 adds the column, which may hide rows from a consolidating office');
      return;
    }
    if (Auth.__hrEmployeeSheetScopeWrapped) return;
    var orig = Auth.scopeRows;
    Auth.scopeRows = function (moduleId, rows) {
      if (moduleId !== 'employees' || !Array.isArray(rows)) return orig.apply(Auth, arguments);
      var copies = rows.map(function (r) { var c = Object.assign({}, r); delete c.site; return c; });
      var survivors = orig.call(Auth, moduleId, copies) || [];
      var byId = {};
      rows.forEach(function (r) { if (r && r.id != null) byId[r.id] = r; });
      var seen = {}, out = [];
      survivors.forEach(function (s) {
        var real = s && byId[s.id];
        if (real && !seen[real.id]) { seen[real.id] = true; out.push(real); }
      });
      return out;
    };
    Auth.__hrEmployeeSheetScopeWrapped = true;
  }

  /* ═══ ٤ · عمود العمود المجهول يرفض الملف كلّه (addendum §E) ═════════════
     THE UNKNOWN-HEADING REFUSAL ═══════════════════════════════════════ */
  function colLetter(i) {
    var s = '', n = i + 1;
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  /* يعيد null إن كان كل شيء مطابقاً، وإلا مصفوفة {heading, letter, reason}.
     Returns null when everything matched; otherwise an array of
     {heading, letter, reason}. */
  function checkHeadings(mod, rows) {
    var H = global.HRExcel;
    var headers = (rows[0] || []).map(function (h) { return String(h == null ? '' : h).trim(); });
    var used = {};
    var usedAt = {};   /* الحقل ← حرف العمود الذي أخذه أولاً · field → the column letter that took it first */
    var problems = [];
    headers.forEach(function (h, i) {
      /* خلية عنوان فارغة (أو لا تحمل إلا علامات اتجاه/مسافات/فواصل أسطر)
         ليست «عموداً» له اسم يُرفض بسببه — عمود زائد فارغ في نهاية الملف
         أمر شائع في إكسل ولا يستحق رفض الملف كله (توضيح المدير، ١٣ سبتمبر:
         ملفه الحقيقي A1:U7 فيه خلايا مُنسَّقة فارغة ويجب أن يمرّ).
         A blank heading cell (or one holding only direction marks / spaces
         / line breaks) is not "a named column" to refuse over — a trailing
         empty column is an ordinary Excel artefact and must not refuse the
         whole file (manager's clarification, 13 Sept: his real file,
         A1:U7, has styled empty cells and must pass this gate). */
      if (!H.normFull(h)) return;
      var letter = colLetter(i);
      var t = H.matchHeading(mod, h, used);
      if (t) { used[t.id] = true; usedAt[t.id] = letter; return; }
      /* لعلّه كان سيُطابَق لولا أن عموداً سابقاً أخذ نفس الحقل بالفعل —
         تكرار، لا عمود مجهول. It may have matched had an earlier column
         not already taken the same field — a DUPLICATE, not an unknown
         column. */
      var wouldMatch = H.matchHeading(mod, h, {});
      if (wouldMatch) { problems.push({ heading: h, letter: letter, reason: 'duplicate', firstLetter: usedAt[wouldMatch.id] || '?' }); return; }
      /* عمود محسوب، أو ممنوع على هذا الدور — يُتجاهَل هنا تماماً كما تفعل
         المراجعة (hr-import-review.js:733-749)، ولا يُرفض الملف بسببه.
         A computed column, or one forbidden to this role — skipped
         exactly as the review does (hr-import-review.js:733-749), never a
         reason to refuse the file. */
      var hid = H.matchHeadingAll(mod, h, {});
      if (hid && !hid.sub && global.Auth && Auth.fieldHidden && Auth.fieldHidden(mod.id, hid.field.name)) return;
      if (H.computedField(mod.fields, h)) return;
      problems.push({ heading: h, letter: letter, reason: 'unmatched' });
    });
    return problems.length ? problems : null;
  }
  function showRefusal(problems) {
    /* جملة واحدة مركّبة تسمّي كل عمود وحرفه — قبلها المدير (قرار k3 يقابله
       في قرارات هذا الملف: «الجملة المركّبة مقبولة»). لا زرّ تجاوز أبداً.
       ONE composite sentence naming every column and its letter — the
       manager already accepted a composite sentence for a related case.
       No bypass button, ever. */
    /* 🔴 المكرّر ليس «غير معروف»: كانت الرسالة تقول «غير معروفة» لكل مشكلة وتسمّي حرفاً واحداً (المُدمج، ١٤ سبتمبر).
       الآن جملة للمجهول، وجملة لكل مكرّر تسمّي العمودين.
       🔴 A duplicate is not «unknown»: the message said «unknown» for every problem and named one letter (integrator,
       14 Sept). Now one sentence for the unknown columns, and one per duplicate naming BOTH columns. */
    var unknown = problems.filter(function (p) { return p.reason !== 'duplicate'; });
    var dups = problems.filter(function (p) { return p.reason === 'duplicate'; });
    var partsAr = [], partsEn = [];
    if (unknown.length) {
      partsAr.push('الأعمدة التالية غير معروفة: ' + unknown.map(function (p) { return '«' + p.heading + '» (العمود ' + p.letter + ')'; }).join('، ') + '.');
      partsEn.push('These columns are unknown: ' + unknown.map(function (p) { return '"' + p.heading + '" (column ' + p.letter + ')'; }).join(', ') + '.');
    }
    dups.forEach(function (p) {
      partsAr.push('العمود «' + p.heading + '» مكرّر (العمودان ' + p.firstLetter + ' و ' + p.letter + ').');
      partsEn.push('The column "' + p.heading + '" is repeated (columns ' + p.firstLetter + ' and ' + p.letter + ').');
    });
    var msgAr = partsAr.join(' ') + ' لم يُقرأ الملف ولم يُحفظ شيء. سمِّ كل عمود كما في «ملف نموذجي»، واحذف المكرّر أو غير المعروف.';
    var msgEn = partsEn.join(' ') + ' The file was not read and nothing was saved. Name each column as in the "Template" file, and delete the repeated or unknown one.';
    if (global.UI && UI.modal) {
      UI.modal({
        title: L({ ar: 'تعذّر قراءة الملف', en: 'The file could not be read' }),
        body: '<p>' + esc(L({ ar: msgAr, en: msgEn })) + '</p>',
        buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-ghost' }]
      });
    } else if (global.UI && UI.toast) {
      UI.toast(L({ ar: msgAr, en: msgEn }), 'error', 12000);
    } else {
      console.error('[hr-employee-sheet] ' + msgAr);
    }
  }

  /* ═══ ٥ · ترجمة عمود «القسم» قبل المراجعة (addendum §B) ═════════════════
     DEPARTMENT-COLUMN TRANSLATION, BEFORE THE REVIEW EVER SEES IT ══════ */
  function readDepartmentCodeMap() {
    /* jsonb يصل عادة ككائن جاهز؛ نتعامل أيضاً مع نص JSON احتياطاً (نفس
       حذر payroll-insurance.js:139-151 مع app_meta.insuranceRates). خريطة
       غائبة أو تالفة = فارغة دائماً، لا «اقبل كل شيء».
       jsonb normally arrives as a ready-made object; a JSON STRING is
       handled too, defensively (the same caution payroll-insurance.js
       :139-151 uses for app_meta.insuranceRates). A missing or broken map
       is always EMPTY, never "accept everything". */
    try {
      var meta = (global.Store && Store.meta) ? (Store.meta() || {}) : {};
      var raw = meta.employeeDepartmentCodes;
      if (raw == null) return {};
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return {}; }
      }
      if (!raw || typeof raw !== 'object' || !raw.codes || typeof raw.codes !== 'object') return {};
      return raw.codes;
    } catch (e) { return {}; }
  }
  /* لا تُغيَّر مصفوفة المستدعي في مكانها — تُبنى مصفوفة جديدة، فإعادة
     تشغيل الاستيراد على نفس الملف تبقى ثابتة النتيجة (القيم المترجَمة
     ليست أرقاماً، فلا تُعاد ترجمتها ثانية)، ولا يرى مُستدعٍ آخر يحمل
     المصفوفة الأصلية أي تغيير لم يطلبه.
     The caller's array is never mutated in place — a NEW array is built,
     so re-running the import on the same file stays idempotent (a
     translated value is not digits, so it is never re-translated), and no
     other holder of the original array sees a change it never asked for. */
  function translateDepartmentCells(mod, rows) {
    var H = global.HRExcel;
    var headers = (rows[0] || []).map(function (h) { return String(h == null ? '' : h).trim(); });
    var deptCols = [];
    headers.forEach(function (h, i) {
      if (!H.normFull(h)) return;
      var t = H.matchHeading(mod, h, {});
      if (t && !t.sub && t.id === 'department') deptCols.push(i);
    });
    if (!deptCols.length) { global.HREmployeeSheet.__lastTranslate = { at: new Date().toISOString(), codes: 0, names: 0, refused: 0 }; return rows; }
    var deptField = null;
    (mod.fields || []).forEach(function (f) { if (f.name === 'department') deptField = f; });
    if (!deptField) return rows;

    var codeMap = readDepartmentCodeMap();
    var counters = { codes: 0, names: 0, refused: 0 };
    var out = rows.map(function (row, ri) {
      if (ri === 0 || !Array.isArray(row)) return row;
      var newRow = row.slice();
      deptCols.forEach(function (ci) {
        var raw = newRow[ci];
        var s = H.stripInvisible(raw == null ? '' : String(raw)).trim();
        if (!s) return;                                   /* blank cell — nothing to translate */
        var digits = H.latinDigits(s).trim();
        if (/^\d+$/.test(digits)) {
          var val = codeMap[digits];
          if (val) { newRow[ci] = val; counters.codes++; }
          /* 🔴 صيغتان لا صيغة واحدة (المُدمج، ١٤ سبتمبر): قائمة فارغة ⇒ لم تُحمَّل بعد؛ قائمة محمَّلة بلا هذا الكود ⇒ الكود غير موجود فيها.
             🔴 Two wordings, not one (integrator, 14 Sept): an EMPTY list ⇒ not loaded yet; a LOADED list without this code ⇒ the code is not in it. */
          else {
            newRow[ci] = Object.keys(codeMap).length
              ? 'القسم: ' + s + ' — الكود ' + s + ' غير موجود في قائمة الأقسام'
              : 'القسم: ' + s + ' — كود غير معروف (لم تُحمَّل قائمة أكواد الأقسام بعد)';
            counters.refused++;
          }
          return;
        }
        /* نفس الاختبارات الثلاثة الحرفية في hr-import-review.js:150-152 —
           مطابقة تامة فقط، لا احتواء («تنفيذ» تبقى محتوى المراجعة العادية
           تتولاها هي، فهذا الملف يتدخّل في عمود القسم وحده).
           The SAME three exact tests as hr-import-review.js:150-152 —
           exact only, never "contains" (the review's own partial-match
           fallback keeps working for every OTHER select; this file only
           touches the department column). */
        var n2 = H.norm(s);
        var hit = (deptField.options || []).some(function (o) {
          return H.norm(o.label && o.label.ar) === n2 || H.norm(o.label && o.label.en) === n2 || H.norm(o.value) === n2;
        });
        if (hit) { counters.names++; return; }
        newRow[ci] = 'القسم: ' + s + ' — اسم غير معروف';
        counters.refused++;
      });
      return newRow;
    });
    global.HREmployeeSheet.__lastTranslate = { at: new Date().toISOString(), codes: counters.codes, names: counters.names, refused: counters.refused };
    return out;
  }

  /* ═══ ٦ · تغليف DataImport.preview — اللفّة الخارجية (addendum §C2) ═════
     يُحمَّل بعد import-headerless.js/import-mapping-plus.js/hr-import-
     review.js فتكون هذه اللفّة الأخارجية عند التثبيت الفوري وقت التحميل
     (نفس نمط هذه الملفات الثلاثة: نداء فوري + محاولات setTimeout احتياطية).
     Loads after import-headerless.js/import-mapping-plus.js/hr-import-
     review.js, so installing IMMEDIATELY at load time makes this wrap the
     OUTERMOST one (the same pattern those three files use themselves: an
     immediate call plus a few setTimeout retries as a safety net). */
  function installImportWrap() {
    if (!global.DataImport || typeof DataImport.preview !== 'function') {
      console.error('hr-employee-sheet.js: DataImport.preview not found — the heading refusal and department-code translation are NOT active');
      return;
    }
    if (!global.HRExcel || !global.Schema) {
      console.error('hr-employee-sheet.js: hr-excel-screens.js/schema.js must load first — the heading refusal and department-code translation are NOT active');
      return;
    }
    if (DataImport.__hrEmployeeSheetWrapped) return;
    var orig = DataImport.preview;
    DataImport.preview = function (moduleId, rows) {
      var args = Array.prototype.slice.call(arguments);
      if (moduleId === 'employees' && Array.isArray(rows)) {
        var mod = Schema.get('employees');
        if (mod) {
          var problems = checkHeadings(mod, rows);
          if (problems) { showRefusal(problems); return; }
          args[1] = translateDepartmentCells(mod, rows);
        }
      }
      return orig.apply(this, args);
    };
    DataImport.__hrEmployeeSheetWrapped = true;
  }

  /* ═══ ٧ · القالب — شكله بالحرف (DESIGN §e + قرارات المدير) ══════════════
     THE TEMPLATE — his exact shape (DESIGN §e + manager decisions) ═════
     تحقّق حرفي مقابل xl/sharedStrings.xml وxl/worksheets/sheet1.xml في
     ملفه الحقيقي (E/_evidence/source) — انظر تقرير المنفِّذ لأوامر unzip.
     Verified literally against xl/sharedStrings.xml and
     xl/worksheets/sheet1.xml in his real file — see the implementer's
     report for the unzip commands run. */
  var HEADINGS = [
    'رقم\n يدوي',            /* A manualNo */
    'الاسم',                  /* B name */
    'تاريخ\nالعمل',           /* C workDate */
    'رقم \nالوظيفة',          /* D code */
    'الوظيفة',                /* E jobTitle */
    'القسم',                  /* F department */
    'م تكلفة فرعي',           /* G costCenter */
    'اسم \nانجليزي',          /* H nameEn */
    'حالة اجتماعية',          /* I maritalStatus */
    'المؤهل',                 /* J academicQualification */
    'العنوان',                /* K address */
    'تاريخ\n الميلاد',        /* L birthDate */
    'تاريخ \nالالتحاق',       /* M hireDate */
    'الرقم القومى',           /* N nationalId */
    'انتهاء الرقم القومى',    /* O nationalIdExpiry */
    'رقم\n المنهه',           /* P professionNo */
    'مهنة \nالاقامة',         /* Q residenceProfession */
    'الراتب',                 /* R basicSalary */
    'رقم الحساب',             /* S bankAccount */
    'الرقم التأمينى',         /* T insuranceNo */
    'تأمينات',                /* U insuranceAmount */
    'الموقع'                  /* V site */
  ];
  /* text للأعمدة الحسّاسة للتصفير على اليسار وللأكواد الرقمية في القسم
     (F) — date للتواريخ الأربعة — money للراتب والتأمينات. الباقي نصّ
     عادي، فكلها أسماء وبيانات وصفية لا كميات.
     text for the leading-zero-sensitive identifier columns and for
     numeric department codes (F) — date for the four dates — money for
     salary and the insurance figure. Everything else stays plain text —
     names and descriptive data, never quantities. */
  var TYPES = [
    'text', 'text', 'date', 'text', 'text', 'text', 'text', 'text', 'text', 'text',
    'text', 'date', 'date', 'text', 'date', 'text', 'text', 'money', 'text', 'text',
    'money', 'text'
  ];
  var SITE_COL = 21; /* V — zero-based */

  function buildTemplateSpec(names) {
    var W = global.XlsxWriter;
    var row1 = HEADINGS.slice();
    row1.__styles = HEADINGS.map(function () { return W ? W.STYLE.wrap : 8; });
    var cols = TYPES.map(function (t) { return { type: t, width: 20 }; });
    var validations = [];
    if (names && names.length) {
      validations.push({ col: SITE_COL, listRef: '"' + names.join(',') + '"', maxRow: 3000 });
    }
    return {
      title: L({ ar: 'نموذج كشف الموظفين', en: 'Employee sheet template' }),
      sheets: [{
        name: L({ ar: 'الموظفون', en: 'الموظفون' }),   /* اسم الورقة عربي دوماً — قرار المدير k4 */
        noHeader: true,
        rtl: true,
        rows: [row1],
        columns: cols,
        validations: validations
      }]
    };
  }

  function onTemplateClick() {
    var H = global.HRExcel, W = global.XlsxWriter;
    if (!H || !W) { console.error('hr-employee-sheet.js: hr-excel-screens.js/xlsx-writer.js not found — template not downloaded'); return Promise.resolve({ stopped: true }); }
    return Promise.all([H.siteRights(), H.lists()]).then(function (r) {
      var ctx = Object.assign({}, r[0], r[1]);
      var allowed = H.allowedSites(ctx);
      /* 🔴 allowedSites يعيد كائنات مواقع لا أسماء — كان هنا map(H.shortName) فكُتبت القائمة «[object Object],…»
         (المُدمج، ١٤ سبتمبر، مُثبت). الاسم يُؤخذ من s.name كما في hr-excel-downloads.js:285.
         🔴 allowedSites returns site OBJECTS, not names — `map(H.shortName)` stood here and the list was written as
         «[object Object],…» (integrator, 14 Sept, proven). The name is taken from s.name, as hr-excel-downloads.js:285 does. */
      var names = allowed.map(function (s) { return H.shortName(s && s.name); }).filter(function (n) { return !!n; });
      if (names.length) {
        var joined = names.join(',');
        var bad = names.some(function (n) { return n.indexOf(',') !== -1 || n.indexOf('"') !== -1; });
        /* حارس ٢٥٥ حرفاً — طول أعمدة إكسل الأقصى لصيغة تحقق مضمَّنة.
           255-character guard — Excel's own limit for an inline
           validation formula. */
        if (bad || joined.length > 255) {
          console.error('hr-employee-sheet.js: the site list is too long/unsafe for an inline validation — template not downloaded (' + names.length + ' sites, ' + joined.length + ' chars)');
          if (global.UI && UI.toast) {
            UI.toast(L({ ar: 'قائمة المواقع أطول من أن تُكتب داخل الملف — لم يُنزَّل النموذج، أبلغ الفريق',
                         en: 'The site list is too long to write inside the file — the template was not downloaded, tell the team.' }), 'error', 12000);
          }
          return { stopped: true };
        }
      } else if (global.UI && UI.toast) {
        UI.toast(L({ ar: 'لا مواقع معروفة لحسابك — نزل النموذج بلا قائمة مواقع، اكتب اسم الموقع يدوياً',
                     en: 'No sites are known for your account — the template downloaded without a site list; type the site name by hand.' }), 'warn', 9000);
      }
      var spec = buildTemplateSpec(names);
      var bytes = W.build(spec);
      W.download(bytes, L({ ar: 'نموذج-كشف-الموظفين', en: 'employee-sheet-template' }));
      return { ok: true, sites: names.length };
    }).catch(function (e) {
      console.error('hr-employee-sheet.js: template failed', e);
      return { error: true };
    });
  }

  /* ── ربط الزرّ — شاشة الموظفين فقط، وتحقّق من أن نقرة واحدة تنزّل مرة
     واحدة فقط (addendum §e / DESIGN §e) ─────────────────────────────────
     BINDING THE BUTTON — Employees screen only, and making sure one
     click downloads exactly once. */
  function currentModuleId() {
    var id = null;
    try { id = global.App && typeof App.currentModule === 'function' && App.currentModule(); } catch (e) { /* ignore */ }
    if (!id) { try { id = global.App && typeof App.route === 'function' ? App.route() : null; } catch (e) { /* ignore */ } }
    return id;
  }
  function rebindTemplate() {
    if (currentModuleId() !== 'employees') return;
    var tpl = document.getElementById('azTemplateBtn');
    if (!tpl || tpl.getAttribute('data-hx-emp') === '1') return;
    tpl.setAttribute('data-hx-emp', '1');
    /* (ب) الكتابة فوق tpl.onclick بعد مراقب hr-excel-downloads.js — طبقة
       دفاع ثانية؛ (أ) أدناه تكفي وحدها لأنها تمنع الحدث من الوصول أصلاً.
       (b) overwriting tpl.onclick AFTER hr-excel-downloads.js's own
       observer — a second layer of defence; (a) below is already enough
       on its own since it stops the event before it ever reaches here. */
    tpl.onclick = function () { onTemplateClick(); };
  }
  var templateObserver = new MutationObserver(function () { rebindTemplate(); });
  function startTemplateBinding() {
    var content = document.getElementById('content');
    if (content) templateObserver.observe(content, { childList: true, subtree: true });
    rebindTemplate();
  }
  /* (أ) مستمع بمرحلة الالتقاط على document، مُسجَّل مرة واحدة عند تحميل
     هذا الملف — يسبق أي مستمع على الزرّ نفسه أياً كان ترتيب إعادة ربطه،
     فيضمن تنزيلاً واحداً بالضبط لكل نقرة (t1).
     (a) A CAPTURE-phase listener on document, registered ONCE at this
     file's load — it precedes any listener on the button itself
     regardless of rebind timing, guaranteeing exactly one download per
     click (t1). */
  document.addEventListener('click', function (e) {
    var target = e.target && e.target.closest ? e.target.closest('#azTemplateBtn') : null;
    if (!target || currentModuleId() !== 'employees') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    onTemplateClick();
  }, true);

  /* ═══ ٨ · التثبيت · INSTALL ══════════════════════════════════════════ */
  if (!global.Schema || !global.Auth || !global.Store || !global.UI || !global.HRExcel || !global.DataImport || !global.XlsxWriter) {
    ['Schema', 'Auth', 'Store', 'UI', 'HRExcel', 'DataImport', 'XlsxWriter'].forEach(function (name) {
      if (!global[name]) console.error('hr-employee-sheet.js: ' + name + ' not found at load time — the pieces that need it install nothing');
    });
  }
  installFields();
  installSynonyms();
  installScopeWrap();
  installImportWrap();
  [0, 300, 1200].forEach(function (ms) { setTimeout(installImportWrap, ms); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startTemplateBinding);
  else startTemplateBinding();

  global.HREmployeeSheet = {
    HEADINGS: HEADINGS,
    buildTemplateSpec: buildTemplateSpec,
    __lastTranslate: null
  };
  console.info('hr-employee-sheet.js ready — Omara\'s ten fields, heading refusal and department-code translation active on the Employees screen.');
})(window);
