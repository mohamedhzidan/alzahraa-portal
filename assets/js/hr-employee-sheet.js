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
   ١٤ سبتمبر (الإصدار v2.0.37): ويختفي معه أيضاً حارس حفظ الاستيراد (القسم ٩) لشاشات الموارد البشرية العشر التي تحفظ عبر
   hr-import-review.js — حدّ ٢٠ ثانية على قراءات التأكيد وتحديث القائمة، ورفض ضغطة «احفظ» الثانية، ونافذة نتيجةٍ تنتظر ولا تمسح
   نافذةً أخرى — فتعود نوافذ الاستيراد لسلوك v2.0.36 بالضبط.
   14 Sept (v2.0.37): the import save guard (section 9) goes with it too, for the ten HR screens that save through
   hr-import-review.js — the 20 s limit on the confirming reads and the list refresh, the refusal of a second «احفظ» press, and a
   result window that waits instead of wiping another window — so the import windows return to v2.0.36's behaviour exactly.

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

  /* ═══ ٩ · حفظ الاستيراد لا يعلق ولا يتكرّر، ونتيجته لا تمسح نافذةً أخرى — في شاشات الموارد البشرية العشر ═══════════
     · THE IMPORT SAVE NEVER HANGS OR RUNS TWICE, AND ITS RESULT NEVER WIPES ANOTHER WINDOW — ON ALL TEN HR SCREENS ═══
     🔴 العطل (قاسه m8 على نسخة v2.0.36، ١٤ سبتمبر): بعد «احفظ» في نافذة الاستيراد تُخفي المراجعة علامة ✕ وتعطّل الأزرار الثلاثة
     (hr-import-review.js:1103-1107)، ثم تنتظر قراءة التأكيد من الخادم (:1189) بلا حدّ زمني. قراءةٌ لا تُجيب تُبقي النافذة بلا ✕
     وبأزرار ميتة حتى تُحدَّث الصفحة، ولا يعرف أحد هل حُفظت السجلات. وله أختان في الحفظ نفسه: تحديث القائمة (:1150، ثم :1252 بعد أن
     تعود الأزرار) بلا حدّ أيضاً — وعند :1252 يعود «احفظ» قابلاً للضغط والحفظ الأول لم ينتهِ، فضغطةٌ ثانية تُرسل السجلات مرة ثانية.
     🔴 المرور 3e (أمر MANAGER-4، والأمران ٢١ و٣٨: «كل الشاشات، وأين غير ذلك؟»): العطل ليس في شاشة الموظفين وحدها. hr-import-review.js
     يحفظ بالطريق نفسه لكل شاشة ليست «بنوداً» في hr-excel-screens.js:141-240 — عشر شاشات: الموظفون · الحضور والانصراف · مصوغات
     التوظيف · عقود العمل · طلبات الإجازات · سلف الموظفين · الشؤون القانونية · أصول تقنية المعلومات · طلبات الدعم الفني ·
     التعميمات. كان الحارس يُسلَّح بعنوان الموظفين فقط، فبقيت التسع الأخرى تعلق (قاسه t35 على نسخة 3d). الآن تُعرف الشاشة من
     عنوان نافذتها ومن HRExcel.SCREENS نفسها، والحدّ على جدول تلك الشاشة بالذات (:1046؛ ولشاشة الموظفين employees أيضاً، :415).
     الشاشات الثلاث «بنود» (كشف حضور الموقع · العمالة اليومية · مسير الرواتب) لا تمرّ بهذا الحفظ أصلاً: hr-lines-import.js يملأ نموذجاً
     يحفظه صاحبه بنفسه (:230).
     🔴 والثاني في المرور نفسه: Escape أثناء حفظٍ بطيء يُغلق المراجعة والحفظ مستمرّ خلفها. لو فُتحت نافذةٌ أخرى وكُتب فيها، كانت نافذة
     النتيجة تحلّ محلّها حين ينتهي الحفظ فيضيع ما كُتب (قاسه t32 على نسختي v2.0.36 و3d). الآن نافذة النتيجة لا تحلّ أبداً محلّ نافذةٍ
     غير المراجعة التي بدأ منها الحفظ: تنتظر، ويقول تنبيهٌ ذلك، وتُفتح وحدها حين تُغلق النافذة المفتوحة (نمط سندات الرواتب N-3).
     الإصلاح هنا لا في hr-import-review.js: ذاك الملف حيٌّ على الموقع، وهذا الملف يُرفع معه، وحذفه يعيد السلوك القديم بالضبط.
     ما يفعله، أثناء حفظ استيرادٍ واحد فقط (من ضغطة «احفظ» حتى ينتهي ذلك الحفظ):
       ١ · (منذ 3f: بعد أول كتابة، ولسجلات هذا الحفظ نفسه فقط) كل قراءة تأكيدٍ لجدول تلك الشاشة عبر ‎.select().in()‎ لها ٢٠ ثانية، ثم تُرفض بجملة عربية — فتسلك المراجعة طريقها المكتوب أصلاً
           (:1190 «لم نتأكّد»، :1229 خطأ مكتوب)، وتعود ✕ والأزرار في finally، وتظهر نافذة النتيجة.
       ٢ · تحديث القائمة الذي تطلبه المراجعة بعد التأكيد (:1252) له ٢٠ ثانية كذلك (منذ 3f: لا تحديث قبل الكتابة، ولا تحديث شاشةٍ أخرى).
       ٣ · ضغطة «احفظ» والحفظ لم ينتهِ لا تفعل شيئاً إلا أن تقول ذلك — وفي نافذة استيرادٍ أخرى تقول إن استيراداً سابقاً ما زال يُحفظ
           وإن شيئاً من هذه النافذة لم يُحفظ. حفظان في وقتٍ واحد لا يُسمح بهما: لا يُعرف لأيّهما تكون نافذة نتيجة الشاشة نفسها.
       ٤ · إن فات حدٌّ، تحمل نافذة النتيجة سطراً يقول ماذا حدث وأين يُنظر (مكان الشاشة نفسها من HRExcel.SCREENS).
       ٥ · نافذة النتيجة لا تمسح نافذةً أخرى (أعلاه).
     خارج ذلك الحفظ لا يتغيّر شيء: Auth.client() يُعيد العميل نفسه، وStore.reload كما هو، ونافذة النتيجة تُفتح كما كانت.
     🔴 The fault (measured by m8 on the v2.0.36 bytes, 14 Sept): after «احفظ» in the import window the review hides the ✕ and disables
     all three buttons (hr-import-review.js:1103-1107), then awaits the server's confirming read (:1189) with no time limit. A read
     that never answers leaves the window with no ✕ and dead buttons until the page is reloaded, and nobody knows whether the records
     were saved. Two siblings live in the same save: the list refresh (:1150, and :1252 AFTER the buttons come back) has no limit
     either — and at :1252 «احفظ» is pressable again while the first save is still out, so a second press sends the records twice.
     🔴 Pass 3e (MANAGER-4's order; Orders 21 and 38: «every screen — and where else?»): the fault is not the Employees screen's alone.
     hr-import-review.js saves the same way for every screen in hr-excel-screens.js:141-240 that is not a «lines» screen — ten screens:
     employees · attendance · recruitment documents · employment contracts · leave requests · employee advances · legal affairs ·
     IT assets · IT support tickets · announcements. The guard armed on the Employees title only, so the other nine still hung
     (measured by t35 on the 3d bytes). The screen is now recognised from its window title and HRExcel.SCREENS itself, and the limit
     sits on THAT screen's table (:1046; for Employees also employees, :415). The three «lines» screens (daily site attendance, daily
     labour, payroll runs) never reach this save: hr-lines-import.js fills a form its owner saves himself (:230).
     🔴 The second, same pass: Escape during a slow save closes the review while the save carries on behind it. If another window was
     opened and typed in, the result window replaced it when the save ended and the typing was lost (measured by t32 on the v2.0.36 and
     3d bytes). Now the result window never replaces a window other than the review the save started from: it waits, a warning says
     so, and it opens by itself when the open window is closed (the payroll vouchers' N-3 pattern).
     The fix lives here, not in hr-import-review.js: that file is live, this one ships with the upload, and deleting this file
     restores the old behaviour exactly. What it does, ONLY while one import save is out (from the «احفظ» press until that save ends):
     (1) every CONFIRMING read of this save's own records through .select().in() gets 20 s (since 3f: after the first write, and only
     for the ids it wrote), then is refused with an Arabic sentence — so the review
     takes the path it already has (:1190 "not confirmed", :1229 a written error), the ✕ and the buttons come back in its finally, and
     the result window shows; (2) the list refresh the review asks for after confirming (:1252) gets 20 s too (since 3f: never a
     refresh before writing, never another screen's); (3) pressing «احفظ» while the
     save is out does nothing but say so — and in ANOTHER import window it says an earlier import is still being saved and nothing from
     this window was saved: two saves at once are refused, because nothing tells which of two results for one screen is which;
     (4) if a limit was hit, the result window carries one line saying what happened and where to look (the screen's own place from
     HRExcel.SCREENS); (5) the result window never wipes another window (above). Outside that save nothing changes: Auth.client()
     returns the client itself, Store.reload is untouched, and the result window opens as it always did. */
  /* 🔴 المرور 3f (حكم MANAGER-4 الثالث، الإضافة ٥ — مُبلِّغ الأخطاء، المرور 3e: bq14 وbq11 C4 وC5). ثلاثة أخطاء في هذا الحارس نفسه:
       ١ · الحدّ كان يحوّل حفظاً ناجحاً إلى رفض: تعديلٌ من الإكسل على موظفٍ نسخته على الشاشة ناقصة يُحدِّث القائمة قبل الكتابة
           (hr-import-review.js:1148-1156)، فقطعنا التحديث عند ٢٠ ثانية فرُفض التعديل «نسخة الشاشة قديمة» — وv2.0.36 كان يحفظه.
           الآن: قبل أول كتابة لا حدّ على شيء (القراءة قبل الكتابة وتحديث القائمة يُنتظران كما في v2.0.36)، وبعد ٢٠ ثانية بلا كتابة
           تعود علامة ✕ ويقول تنبيهٌ إن شيئاً لم يُكتب بعد وإن الحفظ مستمر. الحدّ يبدأ بعد أن تُرسل السجلات فعلاً.
       ٢ · الحدّ كان يقطع تحديث أي شاشةٍ أخرى أثناء الحفظ، ثم يقول كذباً إن تحديث قائمة الاستيراد لم يكتمل. الآن الحدّ على قراءات
           التأكيد لسجلات هذا الحفظ نفسه (معرّفات ما كتبه) وعلى تحديث القائمة الذي تطلبه المراجعة بعدها مباشرةً، فقط.
       ٣ · نافذة نتيجةٍ انتظرت ثلاثين دقيقة كانت تُرمى بسطرٍ خفيّ. الآن تبقى حتى تُغلق النافذة المفتوحة، مهما طال الانتظار.
     🔴 Pass 3f (MANAGER-4's ruling 3, addendum 5 — the pass-3e bug-reporter's bq14 and bq11 C4 and C5). Three faults in this guard:
       1 · the limit turned a good save into a refusal: an Excel CHANGE to an employee whose screen copy is missing refreshes the list
           BEFORE writing (hr-import-review.js:1148-1156); we cut that refresh at 20 s, so the change was refused «screen copy out of
           date» — v2.0.36 saved it. Now nothing before the first write has a limit (the fresh read and the refresh are waited for,
           as in v2.0.36), and after 20 s with nothing written the ✕ comes back and a warning says nothing is written yet and the save
           goes on. The limit starts only once records have really been sent.
       2 · the limit cut ANY other screen's refresh during the save, then falsely said the import's own list refresh had not
           finished. Now the limit covers only the confirming reads of THIS save's own records (the ids it wrote) and the list
           refresh the review asks for straight after them.
       3 · a result window that waited 30 minutes was thrown away with a hidden console line. Now it waits until the open window
           closes, however long that takes. */
  var IMPORT_LIMIT_MS = 20000;   /* نفس الـ٢٠ ثانية في زرّي الرواتب · the same 20 s as the payroll buttons (quick-fill, vouchers) */
  var RESULT_WAIT_POLL_MS = 1000;   /* نمط سندات الرواتب N-3؛ بلا حدٍّ أقصى منذ 3f · the vouchers' N-3 poll; no maximum since 3f */
  var importSave = null;         /* { mod, tables, read, reload, reviewEl, wrote, ownIds, ownSettled } أثناء حفظ استيرادٍ واحد، وإلا null · while one import save is out */
  var lastImportSave = null;     /* الحفظ الذي ستُفتح نافذة نتيجته تالياً · the save whose result window opens next */
  var waitingResults = [], waitingTimer = null;   /* نوافذ نتيجة تنتظر إغلاق نافذةٍ مفتوحة · result windows waiting for an open window to close */
  /* 🔴 المرور 3g (حكم MANAGER-4 الثالث، الإضافة ٦ — N-1 عند مُبلِّغ الأخطاء، المرور 3f، bq20). منذ 3f لا حدّ على شيء قبل أول كتابة
     (حكم bq14)، والاستيراد الثاني يُرفض ما دام الأول قائماً «انتظر حتى يظهر تنبيه بانتهائه». فإن لم يُجب الخادم أبداً على القراءة أو
     التحديث قبل الكتابة، بقي كل استيرادٍ بعده مقفولاً حتى تُحدَّث الصفحة، والتنبيه الموعود لا يأتي — من يتبع التعليمات بدقة لا يخرج.
     الآن: إن مرّت ٢٠ ثانية ولم يُكتب من الحفظ الأول شيء، وهو ينتظر قراءةً أو تحديثاً نعرف أنه هو من طلبه، فإن «احفظ» في نافذة استيرادٍ
     أخرى يُوقفه — تُرفض تلك الانتظارات فيسلك الحفظ طريقه المكتوب بلا كتابة (أيّ Store.create/Store.save منه في لحظة الإيقاف يُرفض)،
     ثم يبدأ حفظ النافذة الجديدة وحده. لا يُفقد شيء قبله الخادم: الحفظ الموقوف لم يكتب شيئاً، ولا يكتب شيئاً ولو أجاب الخادم بعدها.
     وحفظٌ يكتب قبل الضغطة يبقى على قاعدة 3f كما هي. وإن كان الانتظار شيئاً لا نعرف أنه طلبه، لا نوقفه ولا نَعِد بتنبيه: نقول حدّث الصفحة.
     لماذا يُعرف «هو من طلبه»: أول قراءة في الحفظ تقع قبل أن تعيد الدالة وعدها (نمسكها أثناء الضغطة)، وكل قراءة أو تحديث بعدها قبل
     الكتابة يُنادى في سلسلة الوعود نفسها التي تلي انتهاء القراءة السابقة بلا مؤقّتٍ بينهما (hr-import-review.js:1113-1151) — فعلامةٌ
     تُرفع عند الانتهاء وتُنزَل بمؤقّتٍ صفري تبقى مرفوعة لها وحدها. وكتابات الحفظ الموقوف (:1159-1172) متزامنة في نفس الخطوة التي تلي
     الرفض، فعلامة «يُوقَف الآن» — تُنزَل بمؤقّتٍ صفري أيضاً — تمسكها كلها ولا تمسّ حفظ شاشةٍ أخرى بعدها.
     🔴 Pass 3g (MANAGER-4's ruling 3, addendum 6 — the pass-3f bug-reporter's N-1, bq20). Since 3f nothing before the first write has a
     limit (the bq14 ruling), and a second import is refused while the first is out, «wait until a message says it has finished».
     So if the server NEVER answers a read or refresh before the first write, every later import stayed locked until the page was
     reloaded, and the promised message never came — following the instruction perfectly led nowhere.
     Now: once 20 s have passed with nothing written by the first save, and it is waiting on a read or a refresh we KNOW it asked for,
     «احفظ» in ANOTHER import window stops it — those waits are rejected, so the save takes its own written path with no write (any
     Store.create / Store.save it makes in the stopping moment is refused) — and then the new window's save starts by itself. Nothing
     the server accepted is lost: the stopped save wrote nothing, and writes nothing even if the server answers afterwards. A save that
     wrote before the press keeps 3f's rule unchanged. If the wait is something we cannot tell it asked for, it is not stopped and no
     message is promised: we say reload the page.
     Why «it asked for it» is knowable: the save's first read happens before the function returns its promise (caught during the
     press), and every later read or refresh before writing is called in the SAME chain of promise callbacks that follows the previous
     read's end, with no timer between (hr-import-review.js:1113-1151) — so a flag raised at the end and lowered by a zero-delay timer
     is up for those calls only. The stopped save's writes (:1159-1172) run synchronously in the step right after the rejection, so a
     «being stopped now» flag, also lowered by a zero-delay timer, catches all of them and no other screen's save after it. */
  var stopChain = null;               /* 3g: الحفظ الذي يُوقَف في هذه الخطوة بالذات · the save being stopped in this very step (a zero timer lowers it) */
  var capturing = null;               /* 3g: الحفظ الذي تجري ضغطة «احفظ» الخاصة به الآن · the save whose «احفظ» press is running right now */
  var stoppedAwaitingResult = [];     /* 3g: حفظٌ أُوقف ولم تصل نافذة نتيجته · stopped saves whose result window has not arrived */
  var STOP_SETTLE_MAX_MS = 25000;     /* 3g: حدٌّ لانتهاء الحفظ الموقوف قبل أن نقول «حدّث الصفحة» · how long a stopped save may take to end before we say «reload» */
  /* 🔴 المرور 3g (حكم MANAGER-4 على البند ٥): نافذة مراجعةٍ حُسبت معاينتها قبل أن يكتب حفظُ استيرادٍ آخر إلى نفس الجدول هي نافذةٌ «قديمة»
     — فالحفظ يرسل «جديدها» من معاينة وقت الفتح (hr-import-review.js:1084-1092)، فتُضاف الصفوف مرتين. قاسه p3g-reimport-twice-vm.js:
     TA (إغلاقٌ ثم استيرادٌ ثانٍ ثم «احفظ» والأول ينتظر) وTD (مثله بضغطةٍ مبكرة) يُضيفان مرتين على v2.0.36 الحي نفسه، وTB (النافذة الثانية
     تبقى بعد انتهاء الأول، منذ صفّ 3e) يُضيف مرتين على 3e/3f/3g. الآن كل نافذة مراجعة تأخذ رقماً عند فتحها، وكل حفظٍ رقماً عند أول
     كتابة؛ فإن كتب حفظٌ إلى نفس الجدول برقمٍ أحدث من النافذة، يُرفض «احفظ» فيها بجملة عربية: القائمة تغيّرت، أغلق واستورد من جديد.
     لا يُفقد صفٌّ قبله الخادم: الرفض لا يمسّ إلا نافذةً لم تكتب بعد. وحفظٌ أُوقف ولم يكتب شيئاً (أعلاه) لا يجعل نافذةً قديمة — لم يتغيّر شيء.
     رقمٌ متسلسل لا ساعة: لا يتأثّر بتغيير ساعة الجهاز. وفتح النافذة يسبق قراءتها للخادم (:750 ثم :768)، فالحكم متحفّظ: حفظٌ كتب في
     اللحظات بين الفتح والقراءة يُعدّ تغييراً — أسوأ ما يحدث رفضٌ يطلب استيراداً جديداً، لا صفٌّ مكرّر.
     🔴 Pass 3g (MANAGER-4's ruling on item 5): an import review whose preview was computed before ANOTHER import save wrote to the same
     table is STALE — its save sends the «new» rows of the preview it was opened with (hr-import-review.js:1084-1092), so they are added
     twice. Measured by p3g-reimport-twice-vm.js: TA (close, import again, «احفظ» while the first save waits) and TD (the same with an
     early press) add twice on the LIVE v2.0.36 bytes; TB (the second window stays open after the first save ends — since 3e's queue)
     adds twice on 3e/3f/3g. Now every review window takes a number when it opens, and every save a number at its first write; if a save
     to the same table wrote with a later number than the window, «احفظ» there is refused with one Arabic sentence: the list changed,
     close and import again. No row the server accepted is lost: the refusal touches only a window that has written nothing. A save that
     was stopped having written nothing (above) makes no window stale — nothing changed.
     A sequence, not a clock: a device clock change cannot move it. The window opens before it reads the server (:750, then :768), so
     the rule is cautious: a save that wrote in the moments between opening and reading counts as a change — the worst case is a refusal
     asking for a fresh import, never a doubled row. */
  /* 🔴 المرور 3h (حكم MANAGER-4 الثالث، الإضافة ٧ — B-1g عند مُبلِّغ الأخطاء، المرور 3g، bqg1 S1/S1a): حارس 3g عدّ الحفظ «أحدث» من النافذة فقط
     إن كتب بعد فتحها. لكن نافذةً فُتحت والحفظُ الأول ما زال خارجاً — وقد كتب قبل فتحها — تسأل الخادم عن القائمة قبل أن تصلها صفوفه، ثم تُمحى
     علامة «في الانتظار» عن تلك الصفوف على الجهاز قبل أن يعود الجواب؛ فلا تراها النافذة في أيٍّ من المكانين، وتعدّها «جديدة»، و«احفظ» فيها يرسلها
     مرة ثانية (سلف الموظفين مرتين: مال). على v2.0.36 الحي لم يتكرّر هذا التوقيت (كانت نافذة النتيجة تحلّ محلّ النافذة الثانية)؛ منذ صفّ 3e صار
     يتكرّر. الآن تتذكّر النافذة عند فتحها حفظ الاستيراد الخارج إلى نفس الجدول، فإن كان ذلك الحفظ قد كتب حين يُضغط «احفظ» فالنافذة قديمة، بنفس
     الجملة العربية. حفظٌ أُوقف ولم يكتب شيئاً لا يجعلها قديمة (t38 U4–U6)، ولا حفظٌ إلى قائمة أخرى (t38 L2). ورسالة القفل تتبع القاعدة نفسها (t38 L3).
     🔴 Pass 3h (MANAGER-4's ruling 3, addendum 7 — the pass-3g bug-reporter's B-1g, bqg1 S1/S1a): 3g counted a save as «later» than a
     window only if it wrote AFTER the window opened. But a window opened while the first save is still out — having written BEFORE the
     window opened — asks the server for the list before those rows arrive there, and the rows lose their «pending» mark on this device
     before that answer comes back (store.js sends one row at a time and clears the mark per row); the window sees them in neither place,
     calls them «new», and its «احفظ» sends them again (salary advances twice: money). On the live v2.0.36 bytes this timing did not
     double (its result window replaced the second review); since 3e's result queue it did. Now a window remembers, when it opens, the
     import save to the same table that is out at that moment; if that save has written by the time «احفظ» is pressed, the window is
     stale — the same Arabic sentence. A save stopped with nothing written makes no window stale (t38 U4–U6), nor does a save to another
     list (t38 L2). The lock message follows the same rule (t38 L3). */
  var importSeq = 0;                  /* 3g: رقمٌ يزيد مع كل نافذة مراجعة تُفتح ومع أول كتابة لكل حفظ · grows with every review opened and every save's first write */
  var importWrites = [];              /* 3g: { table, seq } لكل حفظ كتب · one entry per save that wrote */

  function secondsText(ms) {
    var n = Math.round(ms / 1000);
    return (global.I18N && typeof I18N.num === 'function') ? String(I18N.num(n, 0)) : String(n);
  }
  /* مكان الشاشة كما تكتبه hr-excel-screens.js نفسها (للموظفين: «الموارد البشرية ← الموظفون»)
     the screen's place exactly as hr-excel-screens.js writes it (for Employees: «الموارد البشرية ← الموظفون») */
  function whereOf(mod) {
    var sc = global.HRExcel && HRExcel.SCREENS && mod ? HRExcel.SCREENS[mod.id] : null;
    if (sc && sc.where && sc.where.ar) return sc.where;
    return { ar: mod && mod.label ? mod.label.ar : '', en: mod && mod.label ? mod.label.en : '' };
  }
  /* الجداول التي تقرأها المراجعة عند التأكّد: جدول الشاشة (:1046)، ولشاشة الموظفين العرضُ والجدول الأصلي (:1046 و:415)
     the tables the review reads when confirming: the screen's table (:1046); for Employees the view and the base table (:1046, :415) */
  function tablesOf(mod) {
    return mod.table === 'employees' ? ['portal_employees', 'employees'] : [mod.table];
  }

  /* وعدٌ لا ينتظر أكثر من ٢٠ ثانية — نمط attendance-quick-fill.js نفسه؛ setTimeout يُنادى على النافذة (بعض المتصفحات ترفض
     المناداة المنفصلة)، وإن غاب يُعاد الوعد كما هو. «kind» يسجّل أيّ حدٍّ فات: قراءة أم تحديث قائمة.
     A promise that never waits longer than 20 s — attendance-quick-fill.js's own pattern; setTimeout is called ON the window
     (some browsers refuse a detached call), and when it is absent the promise is returned as it is. «kind» records which limit
     was hit: a read or a list refresh. */
  function withImportLimit(thenable, kind, save) {
    var st = global.setTimeout, ct = global.clearTimeout;
    if (typeof st !== 'function' || !thenable || typeof thenable.then !== 'function') return thenable;
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = st.call(global, function () {
        if (done) return;
        done = true;
        if (save) { save[kind] = true; markOwnSettled(save); }
        reject(new Error(L({ ar: 'لم يُجب الخادم خلال ' + secondsText(IMPORT_LIMIT_MS) + ' ثانية',
                             en: 'the server did not answer within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds' })));
      }, IMPORT_LIMIT_MS);
      thenable.then(function (v) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); if (save) markOwnSettled(save); resolve(v);
      }, function (e) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); if (save) markOwnSettled(save); reject(e);
      });
    });
  }
  /* 🔴 3f (bq11 C4): «اللحظة التي تلي قراءة تأكيدٍ لهذا الحفظ». تحديث القائمة الذي تطلبه المراجعة (hr-import-review.js:1252) يُنادى في
     سلسلة الوعود نفسها التي تلي آخر قراءة تأكيد — لا مؤقّت بينهما (قُرئ :1189-1252) — فعلامةٌ تُرفع هنا وتُنزَل بمؤقّتٍ صفري تبقى مرفوعة
     ما دام كود المراجعة يكمل من تلك القراءة، ونازلةً لأي تحديثٍ تبدؤه شاشةٌ أخرى بعد ذلك. لو أُضيف يوماً انتظارٌ بمؤقّتٍ بينهما، يصير
     تحديث المراجعة بلا حدّ (سلوك v2.0.36) — وأزرارها عادت عندها أصلاً (:1231-1236) — ويُحمِّر t32 F4 وt35 G4.
     🔴 3f (bq11 C4): «the moment right after a confirming read of this save». The review's own list refresh (hr-import-review.js:1252)
     is called in the SAME chain of promise callbacks that follows the last confirming read — no timer sits between them (read,
     :1189-1252) — so a flag raised here and lowered by a zero-delay timer stays up while the review's code runs on from that read, and
     is down for any refresh another screen starts later. If a timer-wait is ever added between them, the review's refresh simply
     goes unlimited (the v2.0.36 behaviour) — its buttons are already back by then (:1231-1236) — and t32 F4 and t35 G4 turn red. */
  function markOwnSettled(save) {
    save.ownSettled = true;
    if (typeof global.setTimeout === 'function') global.setTimeout.call(global, function () { save.ownSettled = false; }, 0);
  }

  /* 🔴 3g (N-1): «سلسلة هذا الحفظ قبل الكتابة» — تُرفع حين تنتهي قراءةٌ أو تحديثٌ طلبه الحفظ، وتُنزَل بمؤقّتٍ صفري (انظر أعلى القسم).
     لا حدّ زمني هنا إطلاقاً (حكم bq14): الانتظار يبقى كما كان، إلا أنه يمكن إيقافه حين يطلب ذلك استيرادٌ آخر.
     🔴 3g (N-1): «this save's chain before writing» — raised when a read or refresh the save asked for ends, lowered by a zero-delay
     timer (see the top of this section). No time limit here at all (the bq14 ruling): the wait stays as it was, except that it can
     be stopped when another import asks for that. */
  function markPreChain(save) {
    save.preChain = true;
    if (typeof global.setTimeout === 'function') global.setTimeout.call(global, function () { save.preChain = false; }, 0);
  }
  function stoppable(thenable, save) {
    if (!thenable || typeof thenable.then !== 'function') return thenable;
    return new Promise(function (resolve, reject) {
      var entry = { done: false };
      entry.stop = function (err) { if (entry.done) return; entry.done = true; reject(err); };
      save.stoppers.push(entry);
      thenable.then(function (v) {
        if (entry.done) return;
        entry.done = true; markPreChain(save); resolve(v);
      }, function (e) {
        if (entry.done) return;
        entry.done = true; markPreChain(save); reject(e);
      });
    });
  }
  function stoppedError() {
    return new Error(L({ ar: 'أُوقف هذا الحفظ قبل أن يُكتب منه شيء', en: 'this save was stopped before anything was written' }));
  }
  /* يُوقَف فقط حفظٌ لم يكتب شيئاً، مرّت عليه ٢٠ ثانية، وينتظر الآن شيئاً نعرف أنه طلبه · only a save that wrote nothing, has waited 20 s,
     and is waiting right now on something we know it asked for */
  function canStop(save) {
    return !!save && !save.wrote && !save.stopped && save.slow && save.stoppers.some(function (e) { return !e.done; });
  }
  function stopSave(save) {
    save.stopped = true;
    stoppedAwaitingResult.push(save);
    stopChain = save;
    if (typeof global.setTimeout === 'function') global.setTimeout.call(global, function () { if (stopChain === save) stopChain = null; }, 0);
    var err = stoppedError();
    save.stoppers.forEach(function (e) { e.stop(err); });
  }
  function waitSettled(save) {
    return new Promise(function (resolve) {
      var t = typeof global.setTimeout === 'function' ? global.setTimeout.call(global, function () { resolve(false); }, STOP_SETTLE_MAX_MS) : null;
      (save.settled || Promise.resolve()).then(function () {
        if (t !== null && typeof global.clearTimeout === 'function') global.clearTimeout.call(global, t);
        resolve(true);
      });
    });
  }

  /* العميل أثناء الحفظ: نفس العميل (Proxy يربط كل دالة بالعميل الحقيقي، فلا يُمسّ شيء فيه)، إلا أن ‎.select().in()‎ على جداول
     الشاشة التي تُحفظ لها حدّ. يُسأل «هل الحفظ ما زال قائماً؟» عند كل from()، فنسخةٌ احتُفظ بها بعد الحفظ تعود للسلوك العادي.
     The client during the save: the same client (a Proxy binds every function to the real client, so nothing inside it is
     touched), except that .select().in() on the tables of the screen being saved has a limit. «Is the save still out?» is asked at
     every from(), so a copy someone kept after the save behaves normally again. */
  function limitedClient(c) {
    return new Proxy(c, {
      get: function (target, prop) {
        if (prop === 'from') {
          return function (src) {
            var q = target.from.apply(target, arguments);
            if (!importSave || importSave.tables.indexOf(src) === -1 || !q || typeof q.select !== 'function') return q;
            var origSelect = q.select;
            q.select = function () {
              var s = origSelect.apply(q, arguments);
              if (!s || typeof s.in !== 'function') return s;
              var origIn = s.in;
              /* 🔴 3f: only a CONFIRMING read of this save's own records — after its first write, «id» among the ids it wrote. A read
                 before any write (the fresh compare, hr-import-review.js:1117) and any other screen's read pass untouched. */
              s.in = function (col, ids) {
                var save = importSave;
                /* 3g (N-1): the save being stopped in this step sends no new read — it is refused at once, before any request */
                if (save && stopChain === save && !save.wrote) return Promise.reject(stoppedError());
                var p = origIn.apply(s, arguments);
                /* 3g (N-1): a read BEFORE the first write that this save asked for — no limit, but it can be stopped (above) */
                if (save && !save.wrote && col === 'id' && (capturing === save || save.preChain)) return stoppable(p, save);
                if (!save || !save.wrote || col !== 'id' || !Array.isArray(ids) || !ids.length) return p;
                for (var i = 0; i < ids.length; i++) if (!save.ownIds[ids[i]]) return p;
                return withImportLimit(p, 'read', save);
              };
              return s;
            };
            return q;
          };
        }
        var v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      }
    });
  }

  /* نافذتا المراجعة والنتيجة تُعرفان بمعرّف متنهما (hxReview / hxResult) وبعنوانهما (hr-import-review.js:751 و:1289)، لشاشةٍ
     واحدة بالضبط من HRExcel.SCREENS ليست «بنوداً». لو تغيّر عنوانٌ يوماً، أو طابق شاشتين، لا يُسلَّح شيء ويبقى السلوك القديم.
     The review and result windows are known by their body id (hxReview / hxResult) AND their title (hr-import-review.js:751 and
     :1289), for exactly ONE screen in HRExcel.SCREENS that is not a «lines» screen. If a title ever changes, or matches two screens,
     nothing is armed and the old behaviour stays — nothing breaks. */
  function importModuleOf(opts, bodyId) {
    if (!opts || typeof opts.body !== 'string' || opts.body.indexOf('id="' + bodyId + '"') === -1) return null;
    var hx = global.HRExcel;
    if (!hx || !hx.SCREENS || !global.Schema || typeof Schema.get !== 'function') return null;
    var hits = Object.keys(hx.SCREENS).filter(function (id) {
      var cfg = hx.SCREENS[id], m = Schema.get(id);
      if (!cfg || cfg.kind === 'lines' || !m || !m.label || !m.table) return false;
      return bodyId === 'hxReview'
        ? (opts.title === 'استيراد إلى «' + m.label.ar + '» — مراجعة قبل الحفظ' || opts.title === 'Import into "' + m.label.en + '" — review before saving')
        : (opts.title === 'نتيجة الاستيراد — ' + m.label.ar || opts.title === 'Import result — ' + m.label.en);
    });
    return hits.length === 1 ? Schema.get(hits[0]) : null;
  }

  /* زرّ «احفظ» (الأساسي) في نافذة المراجعة: يُعلَّم الحفظ قبل أن يبدأ — لأن أول قراءة في الحفظ تقع قبل أن تُعيد الدالة وعدها —
     ويُحرَّر حين ينتهي وعد الحفظ نفسه، لا حين تعود الأزرار (فتلك تعود قبل تحديث القائمة عند :1252). وتُحفظ عقدة متن المراجعة
     لحظة الضغط: بها وحدها تُعرف «نافذة الحفظ نفسها» من نافذةٍ أخرى فُتحت بعد Escape.
     The review's primary «احفظ» button: the save is marked BEFORE it starts — the save's first read happens before the function
     returns its promise — and released when the save's own promise settles, not when the buttons come back (they come back before
     the list refresh at :1252). The review's body node is kept at the press: it alone tells «the save's own window» from another
     window opened after Escape. */
  /* 🔴 3f (bq14): قبل أول كتابة لا حدّ — لكن لا تبقى النافذة بلا مخرج: بعد ٢٠ ثانية بلا كتابة تعود ✕ (أخفتها المراجعة، :1103) ويقول
     تنبيهٌ إن شيئاً لم يُكتب بعد، وإن الحفظ مستمر، وإن النتيجة تظهر وحدها. «إلغاء» يبقى معطّلاً: كلمته «لا يُحفظ شيء» قد تصير كذباً إن
     أجاب الخادم بعدها. وإن أُغلقت النافذة، تُفتح النتيجة حين ينتهي الحفظ (الصفّ أدناه، كما بعد Escape).
     🔴 3f (bq14): no limit before the first write — but never a window with no way out: after 20 s with nothing written the ✕ comes
     back (the review hid it, :1103) and a warning says nothing is written yet, the save goes on, and its result shows by itself.
     «إلغاء» stays disabled: its words «nothing is saved» could turn false if the server answers afterwards. If the window is closed,
     the result opens when the save ends (the queue below, as after Escape). */
  function watchBeforeFirstWrite(save) {
    if (typeof global.setTimeout !== 'function') return null;
    return global.setTimeout.call(global, function () {
      if (importSave !== save || save.wrote) return;
      save.slow = true;   /* 3g (N-1): from now on «احفظ» in another import window may stop this save — whether or not its window is still open */
      var host = document.getElementById('modalHost');
      if (!host || host.hidden || document.getElementById('hxReview') !== save.reviewEl) return;
      var x = document.getElementById('modalClose');
      if (x) x.hidden = false;
      if (global.UI && typeof UI.toast === 'function') {
        /* 🔴 3g (N-1): the old words «وتظهر النتيجة وحدها حين ينتهي الحفظ» promised a result that never comes when the server never
           answers. Now the result is promised only «if the server answers», and the way out is named: re-import (the save is stopped,
           nothing written) when the wait can be stopped, or reload the page when it cannot.
           🔴 3h (N-3g): «احفظ» في استيرادٍ على شاشةٍ أخرى يُوقف هذا الحفظ أيضاً (قاسه bqg1 S4)، فالتنبيه يقول ذلك صراحةً — لا يعرفه أحدٌ من رسالة
           الإيقاف وحدها بعد أن يضيع الاستيراد.
           🔴 3h (N-3g): «احفظ» in an import on ANOTHER screen stops this save too (measured by bqg1 S4), so the warning says so — nobody
           should learn it only from the stop message, after the import is lost. */
        UI.toast(L(save.stoppers.some(function (e) { return !e.done; })
          ? { ar: 'لم يُجب الخادم خلال ' + secondsText(IMPORT_LIMIT_MS) + ' ثانية، ولم يُكتب شيء بعد — الحفظ مستمر، وإن أجاب الخادم تظهر النتيجة وحدها. يمكنك إغلاق هذه النافذة بعلامة ✕. ولو أردت ألّا تنتظر، فافتح الاستيراد من جديد واضغط «احفظ»: يُوقَف هذا الحفظ دون أن يُكتب منه شيء، ويُحفظ الجديد. وانتبه: الضغط على «احفظ» في أي استيرادٍ آخر، ولو في شاشة أخرى، يُوقف هذا الحفظ أيضاً فلا يُكتب منه شيء — فإن كنت تريد هذا الاستيراد فلا تضغط «احفظ» في استيرادٍ آخر قبل أن تظهر نتيجته.',
              en: 'The server did not answer within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds and nothing has been written yet — the save goes on, and if the server answers the result shows by itself. You may close this window with ✕. If you would rather not wait, open the import again and press Save: this save is stopped with nothing written, and the new one is saved. Note: pressing Save in any other import, even on another screen, stops this save too, and nothing from it is written — if you want this import, do not press Save in another import before its result shows.' }
          : { ar: 'لم يُجب الخادم خلال ' + secondsText(IMPORT_LIMIT_MS) + ' ثانية، ولم يُكتب شيء بعد — الحفظ مستمر، وإن أجاب الخادم تظهر النتيجة وحدها. يمكنك إغلاق هذه النافذة بعلامة ✕. ولو أردت ألّا تنتظر، فحدّث الصفحة ثم استورد الملف من جديد: لم يُكتب شيء بعد، فلن يتكرّر شيء.',
              en: 'The server did not answer within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds and nothing has been written yet — the save goes on, and if the server answers the result shows by itself. You may close this window with ✕. If you would rather not wait, reload the page and import the file again: nothing has been written yet, so nothing is repeated.' }), 'warn', 15000);
      }
    }, IMPORT_LIMIT_MS);
  }

  function armImportSaveButton(opts, mod) {
    var reviewSeq = ++importSeq;   /* 3g (item 5): this review's number, taken when its window opens (before it reads the server) */
    /* 3h (B-1g): حفظ الاستيراد إلى نفس الجدول الخارج لحظة فتح هذه النافذة وقراءتها للخادم — إن كتب قبل «احفظ» هنا فقد تعدّ معاينتُها صفوفه «جديدة».
       3h (B-1g): the import save to this same table that is out at the moment this window opens and reads the server — if it has
       written by the time «احفظ» is pressed here, this window's preview may call its rows «new» (see the top of this section). */
    var outAtOpen = (importSave && importSave.mod && importSave.mod.table === mod.table) ? importSave : null;
    (opts.buttons || []).forEach(function (b) {
      if (!b || typeof b.onClick !== 'function' || !/(^|\s)btn-primary(\s|$)/.test(b.cls || '') || b.__hrSheetSaveArmed) return;
      var inner = b.onClick;
      b.onClick = function () {
        var hereReview = document.getElementById('hxReview');
        if (importSave) {
          var sameWindow = !!importSave.reviewEl && importSave.reviewEl === hereReview;
          var busy = importSave.mod;
          /* 🔴 3g (N-1): an earlier save in ANOTHER window that has written NOTHING. It is stopped when it can be (canStop, above) and
             this window's save then starts by itself; otherwise the refusal names a way out that really ends — never «wait for a
             message» that may never come. A save that has written keeps 3f's words below. */
          if (!sameWindow && !importSave.wrote) {
            var earlier = importSave, self = this, args = arguments;
            var toastW = function (m) { if (global.UI && UI.toast) UI.toast(L(m), 'warn', 15000); };
            if (earlier.stopped) {
              toastW({ ar: 'نوقف الآن حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» لم يُكتب منه شيء — لم يُحفظ شيء من هذه النافذة بعد. اضغط «احفظ» هنا مرة أخرى بعد لحظة.',
                       en: 'An earlier import into "' + busy.label.en + '" that wrote nothing is being stopped right now — nothing from this window has been saved yet. Press Save here again in a moment.' });
              return false;
            }
            if (canStop(earlier)) {
              stopSave(earlier);
              toastW({ ar: 'كان حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» ينتظر الخادم أكثر من ' + secondsText(IMPORT_LIMIT_MS) + ' ثانية ولم يُكتب منه شيء — أوقفناه الآن فلن يُكتب منه شيء، ويبدأ حفظ هذه النافذة. لو كنت تريد ملف ذلك الاستيراد أيضاً فاستورده من جديد بعد انتهاء هذا الحفظ.',
                       en: 'An earlier import into "' + busy.label.en + '" had waited more than ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds for the server and had written nothing — it is stopped now, so nothing from it will be written, and this window\'s save starts. If you also want that import\'s file, import it again once this save has finished.' });
              return waitSettled(earlier).then(function (ended) {
                var host2 = document.getElementById('modalHost');
                if (!ended) {
                  toastW({ ar: 'لم ينتهِ إيقاف حفظ الاستيراد السابق إلى «' + busy.label.ar + '» خلال ' + secondsText(STOP_SETTLE_MAX_MS) + ' ثانية — لم يُحفظ شيء من هذه النافذة. حدّث الصفحة ثم استورد الملف من جديد' + (earlier.wrote ? '، وافتح «' + whereOf(busy).ar + '» أولاً لترى ما حُفظ.' : ': لم يُكتب شيء من الاستيراد السابق، فلن يتكرّر شيء.'),
                           en: 'Stopping the earlier import into "' + busy.label.en + '" did not finish within ' + Math.round(STOP_SETTLE_MAX_MS / 1000) + ' seconds — nothing from this window has been saved. Reload the page and import the file again' + (earlier.wrote ? ', opening "' + whereOf(busy).en + '" first to see what was saved.' : ': nothing from the earlier import was written, so nothing is repeated.') });
                  return false;
                }
                if (!host2 || host2.hidden || document.getElementById('hxReview') !== hereReview) {
                  toastW({ ar: 'أُوقف حفظ الاستيراد السابق إلى «' + busy.label.ar + '» ولم يُكتب منه شيء، ولم يُحفظ شيء من النافذة التي أُغلقت.',
                           en: 'The earlier import into "' + busy.label.en + '" was stopped with nothing written, and nothing was saved from the window that was closed.' });
                  return false;
                }
                return b.onClick.apply(self, args);   /* the lock is free now: this press starts this window's save through the same armed path */
              });
            }
            var left = Math.max(1, Math.ceil((IMPORT_LIMIT_MS - (Date.now() - earlier.startedAt)) / 1000));
            toastW(earlier.slow
              ? { ar: 'ما زال حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» ينتظر الخادم ولم يُكتب منه شيء، ولا يمكن إيقافه من هذه النافذة — لم يُحفظ شيء منها. حدّث الصفحة ثم استورد الملف من جديد: لم يُكتب شيء من الاستيراد السابق، فلن يتكرّر شيء.',
                  en: 'An earlier import into "' + busy.label.en + '" is still waiting for the server and has written nothing, and it cannot be stopped from this window — nothing from it has been saved. Reload the page and import the file again: nothing from the earlier import was written, so nothing is repeated.' }
              : { ar: 'ما زال حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» ينتظر الخادم ولم يُكتب منه شيء بعد — لم يُحفظ شيء من هذه النافذة. اضغط «احفظ» هنا مرة أخرى بعد ' + secondsText(left * 1000) + ' ثانية.',
                  en: 'An earlier import into "' + busy.label.en + '" is still waiting for the server and has written nothing yet — nothing from this window has been saved. Press Save here again in ' + left + ' seconds.' });
            return false;
          }
          if (global.UI && UI.toast) {
            UI.toast(!sameWindow
              ? (importSave.mod.table === mod.table && (importSave.writeSeq > reviewSeq || (importSave === outAtOpen && importSave.wrote))
                /* 3g (item 5): the earlier save WROTE to this list after this window opened — pressing «احفظ» here again would be refused as
                   stale, so the words send him to a fresh import instead (the sentence 3f used would have led to that refusal)
                   3h (B-1g): الأمر نفسه حين كان هذا الحفظ خارجاً لحظة فتح النافذة وقد كتب — فالضغط هنا بعد انتهائه يُرفض أيضاً (t38 L3).
                   3h (B-1g): the same when this save was out at the moment this window opened and has written — a press here after it
                   ends is refused as stale too, so «press Save here again» would be a promise the next press breaks (t38 L3) */
                ? L({ ar: 'ما زال حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» جارياً على الخادم — لم يُحفظ شيء من هذه النافذة. وقد تغيّرت القائمة بعد فتحها، فحين يظهر تنبيه بانتهاء ذلك الحفظ أغلق هذه النافذة واستورد الملف من جديد، ولن يتكرّر ما حُفظ.',
                      en: 'An earlier import into "' + busy.label.en + '" is still being saved on the server — nothing from this window has been saved. The list has changed since this window opened, so once a message says that save has finished, close this window and import the file again; nothing saved will be repeated.' })
                : L({ ar: 'ما زال حفظ استيرادٍ سابق إلى «' + busy.label.ar + '» جارياً على الخادم — لم يُحفظ شيء من هذه النافذة بعد. انتظر حتى يظهر تنبيه بانتهائه، ثم اضغط «احفظ» هنا مرة أخرى.',
                      en: 'An earlier import into "' + busy.label.en + '" is still being saved on the server — nothing from this window has been saved yet. Wait until a message says it has finished, then press Save here again.' }))
              : busy.id === 'employees'
                ? L({ ar: 'جاري حفظ الموظفين والتأكد منهم على الخادم — تظهر النتيجة حين ينتهي الحفظ، فلا داعي للضغط على «احفظ» مرة أخرى.',
                      en: 'The employees are being saved and confirmed on the server — the result shows when saving ends; there is no need to press Save again.' })
                : L({ ar: 'جاري حفظ السجلات والتأكد منها على الخادم — تظهر النتيجة حين ينتهي الحفظ، فلا داعي للضغط على «احفظ» مرة أخرى.',
                      en: 'The records are being saved and confirmed on the server — the result shows when saving ends; there is no need to press Save again.' }), 'warn', 8000);
          }
          return false;
        }
        /* 🔴 3g (item 5, MANAGER-4's ruling): a stale review never saves — see the top of this section
           🔴 3h (B-1g): النافذة قديمة أيضاً إن كان حفظ استيرادٍ إلى نفس القائمة خارجاً لحظة فتحها وقد كتب، قبل فتحها أو بعده.
           🔴 3h (B-1g): the window is also stale when an import save to the same list was out at the moment it opened and has written —
           before or after the window opened. A save stopped with nothing written makes nothing stale (its «wrote» stays false). */
        var staleBy = importWrites.filter(function (w) { return w.table === mod.table && w.seq > reviewSeq; })[0] ||
                      (outAtOpen && outAtOpen.wrote ? { table: mod.table, seq: outAtOpen.writeSeq } : null);
        if (staleBy) {
          if (global.UI && UI.toast) {
            UI.toast(L({ ar: 'تغيّرت قائمة «' + mod.label.ar + '» بعد فتح هذه النافذة (حُفظ إليها استيرادٌ آخر)، فلم يُحفظ شيء من هنا — أغلق النافذة واستورد الملف من جديد، ولن يتكرّر ما حُفظ.',
                         en: 'The "' + mod.label.en + '" list changed after this window opened (another import was saved into it), so nothing was saved from here — close the window and import the file again; nothing saved will be repeated.' }), 'warn', 15000);
          }
          return false;
        }
        var mine = { mod: mod, tables: tablesOf(mod), read: false, reload: false, reviewEl: hereReview, wrote: false, ownIds: {}, ownSettled: false,
                     startedAt: Date.now(), slow: false, stopped: false, stoppers: [], preChain: false, released: false, settled: null };   /* 3g (N-1) */
        importSave = mine; lastImportSave = mine;
        var slowTimer = watchBeforeFirstWrite(mine);   /* 3f (bq14): the way out before the first write */
        var release = function () {
          if (slowTimer && typeof global.clearTimeout === 'function') global.clearTimeout.call(global, slowTimer);
          mine.released = true;
          if (importSave === mine) importSave = null;
        };
        var result;
        /* 3g (N-1): «capturing» marks the reads this save starts during the press itself (its first read) as its own */
        capturing = mine;
        try { result = inner.apply(this, arguments); } catch (e) { capturing = null; release(); mine.settled = Promise.resolve(); throw e; }
        capturing = null;
        if (!result || typeof result.then !== 'function') { release(); mine.settled = Promise.resolve(); return result; }
        result.then(release, release);
        mine.settled = result.then(function () {}, function () {});
        /* 🔴 أمسكه تشغيل t32 في المرور 3e، لا القراءة: حين ينتهي وعد الحفظ، يُغلق ui.js النافذة المفتوحة (ui.js:118-125 — الزرّ بلا
           keepOpen). بعد Escape وفتح نافذةٍ أخرى، تلك النافذة هي المفتوحة — فكان ui.js نفسه يغلقها ويضيع ما كُتب فيها، قبل أن تصل
           نافذة النتيجة أصلاً. فإن لم تعد مراجعةُ هذا الحفظ هي الظاهرة، يُقال لـ ui.js «false» فلا يُغلق شيئاً، وتنتظر النتيجة دورها.
           🔴 Caught by RUNNING t32 in pass 3e, not by reading: when the save's promise settles, ui.js closes the window that is open
           (ui.js:118-125 — the button has no keepOpen). After Escape and another window opened, THAT window is the open one — so
           ui.js itself closed it and lost its typing before the result window even arrived. So when this save's review is no longer
           the window showing, ui.js is told «false» and closes nothing; the result waits its turn. */
        return result.then(function (v) {
          var host = document.getElementById('modalHost');
          return (host && !host.hidden && document.getElementById('hxReview') !== mine.reviewEl) ? false : v;
        });
      };
      b.__hrSheetSaveArmed = true;
    });
  }

  /* نافذة النتيجة: سطرٌ فوقها فقط إن فات حدٌّ في هذا الحفظ. «لم نتأكّد»/«في الانتظار» تُقرأ من أرقام النافذة نفسها (data-*).
     خطأٌ مكتوب في النافذة (قراءةٌ قبل الكتابة فات حدّها، :1229) يبقى كما تكتبه المراجعة — لا نضيف فوقه ادّعاءً لم يُقَس.
     جملة الموظفين كما كانت حرفياً في v2.0.37-3d؛ الشاشات التسع الأخرى تقول «السجلات» ومكانها هي.
     The result window: a line on top ONLY when a limit was hit in this save. «not confirmed» / «waiting» are read from the
     window's own numbers (data-*). A written error in the window (a read BEFORE writing that hit its limit, :1229) stays as the
     review writes it — no claim that was never measured is added on top of it. The Employees sentence is 3d's, letter for letter;
     the nine other screens say «records» and name their own place. */
  function noteOnImportResult(opts, mod, s) {
    if (!s || (!s.read && !s.reload)) return;
    var n = function (k) { var mm = opts.body.match(new RegExp('data-' + k + '="(\\d+)"')); return mm ? Number(mm[1]) : 0; };
    var secs = secondsText(IMPORT_LIMIT_MS), where = whereOf(mod);
    var parts = [];
    if (s.read && n('unconfirmed') + n('pending') > 0) {
      parts.push(mod.id === 'employees'
        ? L({ ar: 'لم يُجب الخادم خلال ' + secs + ' ثانية حين طُلب منه تأكيد الحفظ، فلا نعرف بعد إن كان الموظفون المكتوب أمامهم «لم نتأكّد» أو «في الانتظار» قد حُفظوا. يُرجى فتح «' + where.ar + '» والبحث عنهم بالاسم أو الرقم الوظيفي قبل استيراد الملف مرة أخرى.',
              en: 'The server did not answer within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds when asked to confirm the save, so it is not yet known whether the employees marked "not confirmed" or "waiting" were saved. Please open "' + where.en + '" and look for them by name or employee number before importing the file again.' })
        : L({ ar: 'لم يُجب الخادم خلال ' + secs + ' ثانية حين طُلب منه تأكيد الحفظ، فلا نعرف بعد إن كانت السجلات المكتوب أمامها «لم نتأكّد» أو «في الانتظار» قد حُفظت. يُرجى فتح «' + where.ar + '» والبحث عنها قبل استيراد الملف مرة أخرى.',
              en: 'The server did not answer within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds when asked to confirm the save, so it is not yet known whether the records marked "not confirmed" or "waiting" were saved. Please open "' + where.en + '" and look for them before importing the file again.' }));
    }
    if (s.reload) {
      parts.push(L({ ar: 'لم يكتمل تحديث قائمة «' + where.ar + '» على الشاشة خلال ' + secs + ' ثانية — يُرجى تحديث الصفحة لتظهر القائمة كما هي على الخادم.',
                     en: 'Refreshing the "' + where.en + '" list on the screen did not finish within ' + Math.round(IMPORT_LIMIT_MS / 1000) + ' seconds — please reload the page to see the list as the server holds it.' }));
    }
    if (!parts.length) return;
    opts.body = '<div class="alert alert-warn" id="hxSheetTimeNote" style="display:block">⚠ ' + esc(parts.join(' ')) + '</div>' + opts.body;
  }

  /* هل تحلّ نافذة النتيجة الآن محلّ نافذةٍ أخرى؟ لا شيء مفتوح ⇒ لا · مراجعةُ هذا الحفظ نفسها مفتوحة ⇒ لا (كما كان) · غير ذلك ⇒ نعم.
     وبلا حفظٍ مُسلَّح نعرفه: مراجعة استيرادٍ ما مفتوحة ⇒ لا، وإلا ⇒ نعم.
     Would the result window replace ANOTHER window now? Nothing open ⇒ no · this save's own review still open ⇒ no (as before) ·
     anything else ⇒ yes. With no armed save we know of: an import review open ⇒ no, otherwise ⇒ yes. */
  function resultWouldReplaceAnotherWindow(s) {
    var host = document.getElementById('modalHost');
    if (!host || host.hidden) return false;
    var review = document.getElementById('hxReview');
    if (s && s.reviewEl) return review !== s.reviewEl;
    return !review;
  }
  /* تنتظر نافذة النتيجة في الصف، والتنبيه هو الدليل إليها؛ فحصٌ كل ثانية ما دامت واحدةٌ تنتظر، حتى تُغلق النافذة المفتوحة مهما طال (منذ 3f؛ كان ثلاثين دقيقة على الأكثر). تُفتح
     بـ UI.modal نفسه (فتمرّ بكل اللافّات كما تمرّ اليوم) وعليها علامةٌ تجعل لافّتنا تمرّرها كما هي.
     The result window waits in a queue and the warning is the pointer to it; a check every second while one waits, until the open window
     closes however long that takes (since 3f; it was 30 minutes at most). It opens through UI.modal itself (so it passes every wrapper as it does today), marked so that OUR wrapper passes it as is. */
  function queueImportResult(opts, mod) {
    if (typeof global.setTimeout !== 'function') return false;
    opts.__hxResultFromQueue = true;
    waitingResults.push({ opts: opts, since: Date.now() });
    if (global.UI && typeof UI.toast === 'function') {
      UI.toast(L({ ar: 'انتهى حفظ الاستيراد إلى «' + mod.label.ar + '» — تُفتح نتيجته في نافذتها حين تُغلق النافذة المفتوحة الآن، ولم يُمسّ شيء مكتوب فيها.',
                   en: 'Saving the import into "' + mod.label.en + '" has finished — its result opens in its own window when the window open now is closed; nothing typed there was touched.' }), 'warn', 30000);
    }
    waitResultWindows();
    return true;
  }
  function waitResultWindows() {
    if (waitingTimer || !waitingResults.length) return;
    waitingTimer = global.setTimeout.call(global, function () {
      waitingTimer = null;
      if (!waitingResults.length) return;
      var host = document.getElementById('modalHost');
      if (!host || host.hidden) {
        var w = waitingResults.shift();
        try {
          UI.modal(w.opts);
          if (typeof global.HRExcelHideAttach === 'function') global.HRExcelHideAttach();   /* كما تفعل showResults · as showResults does */
        } catch (e) { console.error('hr-employee-sheet.js: a waiting import result could not be opened', e); }
        waitResultWindows();
        return;
      }
      /* 🔴 3f (bq11 C5): no maximum any more — a waiting result is never thrown away; it opens when the open window closes */
      waitResultWindows();
    }, RESULT_WAIT_POLL_MS);
  }

  function installImportSaveGuard() {
    if (!global.UI || typeof UI.modal !== 'function' || !global.Auth || typeof Auth.client !== 'function') {
      console.error('hr-employee-sheet.js: UI.modal / Auth.client not found — the HR import save keeps its old behaviour (no time limit)');
      return;
    }
    if (UI.__hrEmployeeSheetImportGuard) return;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      var queued = false;
      try {
        var mod;
        if (opts && opts.__hxResultFromQueue) { /* نافذة نتيجة انتظرت دورها — تمرّ كما هي · a result that waited its turn passes as is */ }
        else if ((mod = importModuleOf(opts, 'hxReview'))) armImportSaveButton(opts, mod);
        else if ((mod = importModuleOf(opts, 'hxResult'))) {
          /* 🔴 3g (N-1): the result of a save that was STOPPED (it wrote nothing; its toast already said so) never opens — and never
             takes the next save's place in lastImportSave. Saves on one screen never overlap (the lock), so results arrive in order. */
          var gone = null;
          for (var gi = 0; gi < stoppedAwaitingResult.length; gi++) {
            if (stoppedAwaitingResult[gi].released && stoppedAwaitingResult[gi].mod && stoppedAwaitingResult[gi].mod.id === mod.id) { gone = stoppedAwaitingResult.splice(gi, 1)[0]; break; }
          }
          if (gone) {
            if (lastImportSave === gone) lastImportSave = null;
            queued = true;
          } else {
            var s = lastImportSave && lastImportSave.mod && lastImportSave.mod.id === mod.id ? lastImportSave : null;
            if (s) lastImportSave = null;
            noteOnImportResult(opts, mod, s);
            if (resultWouldReplaceAnotherWindow(s)) queued = queueImportResult(opts, mod);
          }
        }
      } catch (e) { console.error('hr-employee-sheet.js: import save guard', e); }
      if (queued) return null;
      return origModal.apply(UI, arguments);
    };
    UI.__hrEmployeeSheetImportGuard = true;
    var origClient = Auth.client;
    Auth.client = function () {
      var c = origClient.apply(Auth, arguments);
      return (importSave && c && typeof c.from === 'function' && typeof Proxy === 'function') ? limitedClient(c) : c;
    };
    if (global.Store && typeof Store.reload === 'function') {
      var origReload = Store.reload;
      /* 🔴 3f (bq11 C4): only the review's own list refresh right after this save's confirming read (ownSettled, above) has a limit;
         a refresh before any write, and any other screen's refresh, is the real one, untouched. */
      Store.reload = function () {
        var save = importSave;
        /* 3g (N-1): the save being stopped in this step starts no new refresh; a refresh BEFORE its first write that it asked for can
           be stopped, never limited */
        if (save && stopChain === save && !save.wrote) return Promise.reject(stoppedError());
        var p = origReload.apply(Store, arguments);
        if (save && !save.wrote && save.preChain) return stoppable(p, save);
        return (save && save.ownSettled) ? withImportLimit(p, 'reload', save) : p;
      };
    }
    /* 🔴 3f: what this save WROTE — Store.create's returned id and Store.save's id, on the screen's own table, while one import save is
       out. The confirming reads are recognised by these ids; the write itself is untouched (its result is returned as it came). */
    ['create', 'save'].forEach(function (name) {
      if (!global.Store || typeof Store[name] !== 'function') return;
      var orig = Store[name];
      Store[name] = function (table, idOrData) {
        /* 3g (N-1): a save being stopped writes nothing — its create/save in the stopping step returns «not sent» and never reaches the
           device queue or the server */
        if (importSave && importSave.stopped && stopChain === importSave && importSave.mod && table === importSave.mod.table) return null;
        var out = orig.apply(Store, arguments);
        var save = importSave;
        if (save && out && save.mod && table === save.mod.table) {
          var id = name === 'create' ? out.id : idOrData;
          if (id !== undefined && id !== null) {
            /* 3g (item 5): the save's FIRST write takes a number — every review opened before it on this table is stale from now on */
            if (!save.wrote) { save.writeSeq = ++importSeq; importWrites.push({ table: table, seq: save.writeSeq }); }
            save.wrote = true; save.ownIds[id] = true;
          }
        }
        return out;
      };
    });
  }

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
  installImportSaveGuard();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startTemplateBinding);
  else startTemplateBinding();

  global.HREmployeeSheet = {
    HEADINGS: HEADINGS,
    buildTemplateSpec: buildTemplateSpec,
    __lastTranslate: null
  };
  console.info('hr-employee-sheet.js ready — Omara\'s ten fields, heading refusal and department-code translation active on the Employees screen.');
})(window);
