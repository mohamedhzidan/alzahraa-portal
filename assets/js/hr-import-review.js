/* =========================================================================
   hr-import-review.js — مراجعة واحدة قبل الحفظ لاستيراد الموارد البشرية
   hr-import-review.js — ONE review before saving, for HR imports
   -------------------------------------------------------------------------
   طلب أ. محمد عمارة (بكلماته، ٨ سبتمبر): «عايزين طريقة نستورد بيها… عن
   طريق الإكسل، بدل التسجيل اسم اسم… فأنا لما أستورد دلوقتي الحاجة هتروح
   فين؟». وقرارات محمد زيدان الثلاثة (١٠ سبتمبر): ملفات الإكسل الموجودة
   تُقبل وتُتعرَّف أعمدتها تلقائياً مع معاينة واحدة · التعديل على
   الموجودين بموافقة جماعية والخانة الفارغة تحفظ القيمة القديمة · كل سجلات
   الموارد البشرية الموجودة أولاً.

   Omara's words: "we want a way to import by Excel instead of registering
   name by name… when I import now, WHERE does the thing go?" and the
   owner's three decisions (10 Sept): existing Excel files accepted with
   automatic column recognition and ONE preview · updates to existing
   records with ONE batch approval, and a blank cell keeps the old value ·
   all existing HR records first.

   -------------------------------------------------------------------------
   أين يعمل · WHERE IT LIVES — the button he already presses (Standing Order 19)
   نفس زر «⬆ استيراد». import-documents.js يقرأ الملف كما اليوم ثم ينادي
   DataImport.preview — وهنا نلتقط شاشات الموارد البشرية وحدها. أي شاشة
   أخرى تمرّ إلى المعاينة القديمة دون أي تغيير.
   The SAME «⬆ Import» button. import-documents.js reads the file exactly as
   today and then calls DataImport.preview — this file catches the HR
   screens only. Every other screen passes to the old preview unchanged.

   ما الذي تغيّر عن الاستيراد العام · WHAT IS DIFFERENT FROM THE GENERIC IMPORT
   ١) «هتروح فين؟» — الشاشة التي ستُحفظ فيها، وأين ستجدها بعد الحفظ، والموقع
      المقترح لكل صف — كلها على الشاشة قبل أي كتابة.
   ٢) الأعمدة الواضحة تُقرأ وحدها؛ لا يُسأل إلا عن غير الواضح، ولا يُخمَّن
      عمود أبداً (غير الواضح يبقى «تجاهل» حتى يختاره هو).
   ٣) الموجود يُعرف بالرقم الوظيفي/القومي (لا بالاسم)، ويُعرض «قبل ← بعد»
      ويُعدَّل فقط بعد موافقة صريحة واحدة. الخانة الفارغة لا تمسح شيئاً،
      والصفر قيمة حقيقية.
   ٤) كان الاستيراد العام يضع موقعَ مَن يستورد على كل صف بلا موقع — فموظفو
      الروبيكي كانوا سيُسجَّلون بموقع عمارة. هنا الموقع من الملف، أو من
      المشروع، أو يختاره هو للصفوف الباقية — ولا يُستنتج من اسم غير مفهوم.
   ٥) «حُفظ» تعني: قرأناه من الخادم بعد الحفظ ووجدنا القيم نفسها.
   1) "Where will it go?" — the screen it lands on, where to find it after,
      and the proposed site for every row are ON SCREEN before any write.
   2) Clear columns are read on their own; only unclear ones are asked, and
      no column is ever guessed (an unclear column stays "ignore" until he
      picks it).
   3) An existing record is found by employee number / national ID (never
      a name), shown as "before → after", and changed only after ONE
      explicit approval. A blank cell erases nothing; zero is a real value.
   4) The generic import stamped the IMPORTER's own site on every row
      without one — Elrobaki's staff would have been filed under Omara's
      site. Here the site comes from the file, from the project, or from his
      explicit choice for the remaining rows — never inferred from an
      unclear spoken name.
   5) "Saved" means: read back from the server after saving, values equal.

   إضافي بالكامل · ADDITIVE. Loads after import-documents.js and BEFORE
   import-mapping-plus.js, so its wrap sits inside theirs: the first-row-is-
   numbers question (import-headerless.js) still runs first. Deleting this
   file returns every HR screen to the generic preview exactly.
   ========================================================================= */
(function (global) {
  'use strict';

  var H = null;
  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function lab(o) { return o ? (isAr() ? o.ar : o.en) : ''; }
  function num(n) { return global.I18N && I18N.num ? I18N.num(n, 0) : String(n); }

  var BLANK_DASH = { '—': 1, '–': 1, '-': 1 };
  var YES = ['نعم', 'yes', 'true', '1', 'y', '✓', 'صح'];
  var NO = ['لا', 'no', 'false', '0', 'n', '✗', 'x', 'خطأ'];
  var XLSX_MAX = 2000;           /* import.js MAX_ROWS — its reader stops there */

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الالتقاط · THE CATCH
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    H = global.HRExcel;
    if (!global.DataImport || !H || DataImport.__hrReviewWrapped) return;
    var orig = DataImport.preview;
    if (typeof orig !== 'function') return;
    DataImport.preview = function (moduleId, rows) {
      if (H.covers(moduleId) && Array.isArray(rows)) {
        var cfg = H.SCREENS[moduleId];
        try {
          if (cfg.kind === 'lines') {
            if (global.HRLinesImport) { HRLinesImport.start(moduleId, rows); return; }
          } else { openReview(moduleId, rows); return; }
        } catch (e) {
          /* نفشل مغلقين: لا نسقط إلى استيراد آخر بقواعد أخرى في صمت.
             Fail CLOSED: never fall silently into another importer with
             different rules. Nothing was written. */
          console.error('[hr-import-review]', e);
          if (global.UI) UI.toast(L({ ar: 'تعذّر فتح مراجعة الاستيراد — لم يُحفظ أي شيء. أعد المحاولة أو أبلغ الدعم.',
                                       en: 'The import review could not open — nothing was saved. Try again or report it.' }), 'error', 9000);
          return;
        }
      }
      return orig.apply(this, arguments);
    };
    DataImport.__hrReviewWrapped = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · قراءة الخلايا · READING CELLS
     ═══════════════════════════════════════════════════════════════════ */
  /* علامات الاتجاه الخفية تُحذف أولاً — خانة فيها علامة وحدها فارغة، لا «تعديل»
     يمسح القيمة القديمة (وكيل الأخطاء، ١٠ سبتمبر: مُسح رقم هاتف حقيقي هكذا).
     Invisible direction marks go first — a cell holding only a mark is BLANK,
     never a "change" that erases the old value (bug-reporter, 10 Sept: a real
     phone number was erased exactly this way). */
  function cellText(raw) {
    var s = (H && H.stripInvisible ? H.stripInvisible(raw) : String(raw == null ? '' : raw)).trim();
    return BLANK_DASH[s] ? '' : s;
  }
  function validIso(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return false;
    var dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return dt.getUTCFullYear() === +m[1] && dt.getUTCMonth() === +m[2] - 1 && dt.getUTCDate() === +m[3];
  }
  function optionLabelList(f) {
    return (f.options || []).map(function (o) { return lab(o.label); }).join('، ');
  }

  /* one value → {value} | {error} | {warning+value}. `cfg.text` = identifiers. */
  function readValue(mod, cfg, f, s) {
    var isIdText = (cfg.text || []).indexOf(f.name) !== -1;
    if (f.type === 'number' || f.type === 'money' || f.type === 'percent') {
      var n = DataImport.coerce(f, s);
      if (typeof n !== 'number' || isNaN(n)) return { error: L({ ar: 'ليس رقماً: «' + s + '»', en: 'not a number: "' + s + '"' }) };
      if (f.type === 'money' && n < 0) return { error: L({ ar: 'مبلغ سالب غير مقبول: ' + s, en: 'a negative amount is not accepted: ' + s }) };
      return { value: n };
    }
    if (f.type === 'date') {
      var d = DataImport.coerce(f, s);
      if (!validIso(d)) return { error: L({ ar: 'تاريخ غير مفهوم: «' + s + '» — اكتبه 2026-09-01 أو 01/09/2026', en: 'unclear date: "' + s + '" — write 2026-09-01 or 01/09/2026' }) };
      /* 🔴 رقم شارد (0 أو 1) في عمود تاريخ يصل «1899-12-30/31» ويمرّ فحص الشكل فيُحفظ تاريخ تعيين أو انتهاء في ١٨٩٩ —
         وتنبيهات الانتهاء تنطلق إلى الأبد. لا تاريخ في هذه الشركة قبل ١٩٢٠ (وكيل الأخطاء، ١١ سبتمبر، البند ٢).
         🔴 A stray number (0 or 1) in a date column arrives as «1899-12-30/31», passes the shape check and is saved as
         a hire or expiry date in 1899 — and the expiry alerts fire for ever. No date in this company is before 1920
         (bug-reporter, 11 Sept, finding 2). */
      if (d < '1920-01-01') return { error: L({ ar: 'تاريخ غير معقول: «' + d + '» (قبل 1920) — غالباً خانة رقمية (0 أو 1) لا تاريخاً، أو صيغة تاريخ على خلية فارغة. صحّح الخلية في إكسل وأعد الاستيراد.',
                                                 en: 'impossible date: "' + d + '" (before 1920) — most likely a numeric cell (0 or 1) or a date format on an empty cell, not a date. Fix the cell in Excel and import again.' }) };
      return { value: d };
    }
    if (f.type === 'select') {
      var n2 = H.norm(s);
      var hit = (f.options || []).filter(function (o) {
        return H.norm(o.label && o.label.ar) === n2 || H.norm(o.label && o.label.en) === n2 || H.norm(o.value) === n2;
      })[0];
      if (!hit && n2.length >= 3) {
        /* اختصار شائع في ملفات الشركة («تنفيذ» عن «المشروعات والتنفيذ»): يُقبل
           فقط إن طابق اختياراً واحداً بالضبط من القائمة المغلقة، ويُعرض تنبيهاً
           على الصف — لا يمرّ صامتاً. اختياران أو أكثر = خطأ، لا نختار.
           A common short form in company files («تنفيذ» for «المشروعات
           والتنفيذ»): accepted ONLY when it fits exactly one choice of the
           closed list, and shown as a warning on the row — never silent. Two
           or more candidates = an error; we do not choose. */
        var part = (f.options || []).filter(function (o) {
          return H.norm(o.label && o.label.ar).indexOf(n2) !== -1 || H.norm(o.label && o.label.en).indexOf(n2) !== -1;
        });
        if (part.length === 1) {
          return { value: part[0].value, warning: L({ ar: 'قرأنا «' + s + '» في «' + lab(f.label) + '» على أنها «' + lab(part[0].label) + '»', en: 'read "' + s + '" in "' + lab(f.label) + '" as "' + lab(part[0].label) + '"' }) };
        }
      }
      if (!hit) return { error: L({ ar: '«' + s + '» ليست من اختيارات «' + lab(f.label) + '»: ' + optionLabelList(f),
                                   en: '"' + s + '" is not one of the choices for "' + lab(f.label) + '": ' + optionLabelList(f) }) };
      return { value: hit.value };
    }
    if (f.type === 'checkbox') {
      var low = s.toLowerCase();
      if (YES.indexOf(low) !== -1) return { value: true };
      if (NO.indexOf(low) !== -1) return { value: false };
      return { error: L({ ar: 'اكتب «نعم» أو «لا» في «' + lab(f.label) + '»، لا «' + s + '»', en: 'write yes or no in "' + lab(f.label) + '", not "' + s + '"' }) };
    }
    if (f.type === 'ref') {
      if (f.ref === 'projects') {
        var p = H.resolveProject(s, CTX);
        if (p.project) return { value: p.project.id, ref: p.project };
        return { error: p.error === 'ambiguous'
          ? L({ ar: 'أكثر من مشروع بالاسم «' + s + '» — اكتب كود المشروع', en: 'more than one project named "' + s + '" — use its code' })
          : L({ ar: 'لا يوجد مشروع مسجّل باسم «' + s + '» — الاستيراد لا يُنشئ مشروعات', en: 'no project named "' + s + '" — the import never creates projects' }) };
      }
      if (f.ref === 'sites') {
        var st = H.resolveSite(s, CTX);
        if (st.site) return { value: st.site.id, ref: st.site };
        var names = H.sitesAll(CTX).map(function (x) { return H.shortName(x.name); }).join('، ');
        /* «المتاحة لك» لا «المسجّلة»: موظف الموقع الواحد لا يرى من المواقع إلا
           موقعه، فلا نقول له إن سوهاج «غير موجودة» — ولا نكشف له ما لا يراه.
           "available to you", not "registered": a single-site officer sees only
           his own site, so we never tell him Sohag "does not exist" — and never
           reveal what he cannot see. */
        return { error: L({ ar: 'الموقع «' + s + '» ليس ضمن المواقع المتاحة لك (' + names + ') — لم نخمّن', en: 'site "' + s + '" is not among the sites available to you (' + names + ') — not guessed' }) };
      }
      var target = global.Schema && Schema.get(f.ref);
      var rows = target && global.Store ? Store.all(target.table) || [] : [];
      var nn = H.norm(s), kk = H.keyText(s);
      var hits = rows.filter(function (r) { return r && (H.norm(r[f.refLabel || 'name']) === nn || H.norm(r.name) === nn || (r.code && H.keyText(r.code) === kk) || r.id === s); });
      if (hits.length === 1) return { value: hits[0].id, ref: hits[0] };
      return { error: hits.length > 1
        ? L({ ar: 'أكثر من سجل باسم «' + s + '» في «' + lab(f.label) + '»', en: 'more than one "' + s + '" in "' + lab(f.label) + '"' })
        : L({ ar: 'لا يوجد «' + s + '» في «' + lab(f.label) + '»', en: 'no "' + s + '" in "' + lab(f.label) + '"' }) };
    }
    /* 🔴 الوقت الذي حوّله إكسل إلى تاريخ · A TIME EXCEL TURNED INTO A DATE
       قاسه وكيل الأخطاء في إكسل حقيقي: «08:00» المكتوبة في خانة عادية تُخزَّن
       0.3333 بتنسيق وقت، وقارئ الإكسل المشترك (import.js) يحوّلها إلى التاريخ
       «1899-12-30» — وكانت تُحفظ هكذا. نرفضها بسبب واضح. وإن وصل الكسر نفسه
       (خانة بلا تنسيق) نحوّله إلى الساعة والدقيقة. إصلاح القارئ نفسه مُحال للمنسّق.
       Measured in real Excel by the bug-reporter: «08:00» typed in an ordinary
       cell is stored as 0.3333 with a time format, and the SHARED reader
       (import.js) turns it into the date «1899-12-30» — which was then saved.
       Refused with a plain reason. If the raw fraction itself arrives (a cell
       with no format) it becomes hours:minutes. The reader fix is routed. */
    if (/^check(In|Out)$/.test(f.name) || /^(time|startTime|endTime)$/.test(f.name)) {
      if (/^0?\.\d+$/.test(s) && +s > 0 && +s < 1) {
        var mins = Math.round(+s * 1440), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
        return { value: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm };
      }
      /* 🔴 «تاريخ ووقت» في خانة وقت (تصدير ماكينة البصمة، «2026-09-06 08:00» نصاً) → نأخذ الوقت ونقول ذلك.
         وتاريخٌ وحده في خانة وقت → رفض بسبب واضح: هكذا يصل حقل «تاريخ ووقت» مُنسَّق (m/d/yyyy h:mm) بعد
         أن يُبقي القارئ اليوم ويُسقط الوقت — كان يُقبل ويُحفظ تاريخاً في خانة الحضور (وكيل الأخطاء، ١١ سبتمبر، البند ١).
         🔴 «date time» in a time box (a fingerprint export typed as text, «2026-09-06 08:00») → take the time and
         say so. A bare DATE in a time box → refused with a plain reason: that is how a date+time-formatted cell
         (m/d/yyyy h:mm) arrives after the reader keeps the day and drops the time — it used to be accepted and
         saved as a date in the check-in box (bug-reporter, 11 Sept, finding 1). */
      var dtm = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
      if (dtm) {
        var h2 = +dtm[2], m2 = dtm[3];
        if (h2 > 23) return { error: L({ ar: '«' + lab(f.label) + '»: وقت غير مفهوم «' + s + '»', en: '"' + lab(f.label) + '": unclear time "' + s + '"' }) };
        return { value: (h2 < 10 ? '0' : '') + h2 + ':' + m2,
                 warning: L({ ar: '«' + lab(f.label) + '» وصل تاريخاً ووقتاً («' + s + '») — أُخذ الوقت وحده', en: '"' + lab(f.label) + '" arrived as date + time ("' + s + '") — the time alone was taken' }) };
      }
      /* حارس واحد لكل «تاريخ في خانة وقت» — ١٨٩٩ (وقتٌ حوّله قارئ إكسل القديم إلى تاريخ) وأي تاريخ آخر (خلية «تاريخ ووقت»
         أسقط القارئ وقتها). حارس واحد لا اثنان: حارسان متتاليان جعلا العطل المزروع M11 غير قابل للإمساك (١١ سبتمبر).
         ONE guard for every "date in a time box" — 1899 (a time the old reader turned into a date) and any other date
         (a date+time cell whose time the reader dropped). One guard, not two: two guards in a row made planted fault
         M11 uncatchable (11 Sept). */
      var bareDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
      if (bareDate) {                                     /* a DATE in a time box — refused, never saved */
        var oldReader = /^(1899-12-(30|31)|1900-01-0\d)/.test(s);
        return { error: oldReader
          ? L({ ar: '«' + lab(f.label) + '» وصل تاريخاً («' + s + '») لا وقتاً — إكسل حوّل الوقت. اجعل العمود «نص» في إكسل واكتب 08:00، ثم أعد الاستيراد.',
                en: '"' + lab(f.label) + '" arrived as a date ("' + s + '"), not a time — Excel converted it. Format the column as Text, type 08:00, and import again.' })
          : L({ ar: '«' + lab(f.label) + '» وصل تاريخاً («' + s + '») لا وقتاً — غالباً خلية «تاريخ ووقت» أسقط قارئ إكسل وقتها. اجعل العمود «نص» واكتب 08:00، ثم أعد الاستيراد.',
                en: '"' + lab(f.label) + '" arrived as a date ("' + s + '"), not a time — most likely a date+time cell whose time the Excel reader dropped. Format the column as Text, type 08:00, and import again.' }) };
      }
      /* رقم إكسل خام ≥ ١ (46271.33 = تاريخ ووقت بلا تنسيق) كان يمرّ «نصاً» في خانة وقت — t16، ١١ سبتمبر
         a raw Excel number ≥ 1 (46271.33 = an unformatted date+time) used to pass as "text" in a time box — t16, 11 Sept */
      if (/^\d+(\.\d+)?$/.test(H.latinDigits(s)) && +H.latinDigits(s) >= 1) {
        return { error: L({ ar: '«' + lab(f.label) + '» وصل رقماً («' + s + '») لا وقتاً — خلية «تاريخ ووقت» بلا تنسيق. اجعل العمود «نص» واكتب 08:00، ثم أعد الاستيراد.',
                            en: '"' + lab(f.label) + '" arrived as a number ("' + s + '"), not a time — an unformatted date+time cell. Format the column as Text, type 08:00, and import again.' }) };
      }
    }
    /* نصّ · text-like */
    var v = s;
    if (isIdText) {
      v = H.latinDigits(s);
      /* رقمٌ وصلنا بصيغة علمية = إكسل أفسده قبل أن يصلنا (قطع الأرقام بعد ١٥)
         A number in scientific form = Excel already destroyed it (it keeps 15
         digits) before the file reached us. Refused, never "repaired". */
      if (/^[0-9.]+e[+-]?\d+$/i.test(v)) {
        return { error: L({ ar: '«' + lab(f.label) + '» وصل بصيغة علمية (' + s + ') — إكسل قطع أرقامه. اجعل العمود «نص» في إكسل واكتبه من جديد.',
                            en: '"' + lab(f.label) + '" arrived in scientific form (' + s + ') — Excel cut its digits. Format the column as Text and type it again.' }) };
      }
      if (/^\d+\.0+$/.test(v)) v = v.replace(/\.0+$/, '');
    }
    var out = { value: v };
    if (f.name === 'phone' && /^1[0125]\d{8}$/.test(v)) {
      out.warning = L({ ar: 'الهاتف ' + v + ' من ١٠ أرقام يبدأ بـ1 — غالباً حذف إكسل الصفر الأول. حُفظ كما هو؛ صحّحه في ملفك إن لزم.',
                        en: 'phone ' + v + ' has 10 digits starting with 1 — Excel probably dropped the leading 0. Kept as is; fix it in your file if needed.' });
    }
    if (f.name === 'nationalId' && !/^\d{14}$/.test(v)) {
      out.warning = L({ ar: 'الرقم القومي «' + v + '» ليس ١٤ رقماً', en: 'national ID "' + v + '" is not 14 digits' });
    }
    return out;
  }

  /* قيمة للمقارنة «قبل/بعد» · a value normalised for before/after comparison */
  function cmp(f, v) {
    if (v === null || v === undefined || v === '') return '';
    if (f.type === 'number' || f.type === 'money' || f.type === 'percent') { var n = Number(v); return isFinite(n) ? String(n) : String(v); }
    if (f.type === 'date') return String(v).slice(0, 10);
    if (f.type === 'checkbox') return v ? '1' : '0';
    return String(v).trim();
  }
  /* قيمة يقرؤها إنسان · a value a human reads */
  function show(f, v) {
    if (v === null || v === undefined || v === '') return '—';
    if (f.type === 'select') return global.Schema ? Schema.optionLabel(f, v) : v;
    if (f.type === 'ref') {
      if (f.ref === 'employees') {
        var e = Store.find('employees', v) || (CTX && (CTX.employees || []).filter(function (x) { return x.id === v; })[0]);
        return e ? (e.code ? e.code + ' — ' : '') + e.name : v;
      }
      return global.Schema ? Schema.refLabel(f, v) : v;
    }
    if (f.type === 'checkbox') return v ? L({ ar: 'نعم', en: 'yes' }) : L({ ar: 'لا', en: 'no' });
    if (f.type === 'money') return global.I18N ? I18N.num(v, 2) : String(v);
    return String(v);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · التحليل · THE ANALYSIS — pure over (state + what this account sees)
     ═══════════════════════════════════════════════════════════════════ */
  /* ما يعطيه الخادم الآن لهذا الحساب — لا ما يعرضه المتصفح.
     قِيس ١٠ سبتمبر: مرشِّح المواقع في المتصفح (Auth.scopeRows) يُخفي عن
     مدير الموارد البشرية بالخلاطة سجلات الروبيكي وسوهاج التي تعطيها له
     قاعدة البيانات فعلاً. لو طابقنا على ما يعرضه المتصفح لما رأينا حضور
     الروبيكي الموجود ولأنشأناه مرة ثانية. فنسأل الخادم نفسه، بنفس الباب.
     What the SERVER hands this account right now — not what the browser
     displays. Measured 10 Sept: the browser's site filter (Auth.scopeRows)
     hides from the HR manager at الخلاطة the Elrobaki and Sohag records the
     database really gives him. Matching against the display would miss
     existing Elrobaki attendance and create it a second time. */
  function notDeleted(r) { return r && r.deleted !== true && r._syncState !== 'conflict'; }
  function datesInFile(state) {
    var col = state.mapping.indexOf('date');
    if (col === -1) return [];
    var out = {};
    state.dataRows.forEach(function (cells) {
      var d = DataImport.coerce({ type: 'date' }, cellText(cells[col]));
      if (validIso(d)) out[d] = true;
    });
    return Object.keys(out).sort();
  }
  async function loadContext(state) {
    var mod = state.mod;
    if (!global.Store || !Store.isOnline || !Store.isOnline()) throw new Error('offline');
    var rights = await H.siteRights();
    var lists = await H.lists();
    if (!lists.sites.length) throw new Error('no-sites');
    /* 🔴 من لا يفتح شاشة الموظفين (مدير المشروع، مهندس الموقع، التقنية،
       القانوني…) يأخذ من الخادم قائمة الأسماء وحدها (رقم + اسم، ملف 67) — نفس
       القائمة التي يعرضها نموذجه. قاسه وكيل الأخطاء: قائمة الموارد البشرية
       تعطي هؤلاء صفراً، فكان كل صف يُرفض «لا يوجد موظف ظاهر لك».
       🔴 A role that cannot open the Employees screen (project manager, site
       engineer, IT, legal…) gets the NAMES list from the server (number +
       name, file 67) — the same list its own form shows. Measured by the
       bug-reporter: the HR list gives these roles zero rows, so every row was
       refused "no employee you can see". */
    var namesOnly = !(global.Auth && Auth.can && Auth.can('employees', 'view'));
    var employees = await H.fetchAll(namesOnly ? 'portal_employee_names' : 'portal_employees');
    var existing, range = null;
    if (mod.id === 'employees') {
      existing = employees;
      /* الأعمدة الستة الغائبة عن العرض تُقرأ من الجدول الأصلي للموظفين الذين
         أعطانا العرض إياهم — انظر EMPLOYEE_BASE_COLUMNS أدناه. الرفض = لا شيء.
         The six columns the view omits are read from the base table for the
         employees the view already handed us — see EMPLOYEE_BASE_COLUMNS
         below. A refusal merges nothing (fail closed). */
      if (!namesOnly) mergeBase(existing, await readBaseColumns(mod, existing.map(function (r) { return r.id; })));
    }
    else if (mod.id === 'attendance') {
      var dates = datesInFile(state);
      range = dates.length ? [dates[0], dates[dates.length - 1]] : null;
      existing = range ? await H.fetchAll(mod.table, function (q) { return q.gte('date', range[0]).lte('date', range[1]); }) : [];
    } else existing = await H.fetchAll(mod.table);
    /* صفوف أُرسلت من هذا الجهاز ولم يؤكّدها الخادم بعد — تُحسب موجودة، فلا تُكرَّر
       rows sent from this device and not yet confirmed count as existing — never doubled */
    var ids = {};
    existing.forEach(function (r) { ids[r.id] = true; });
    (Store.all(mod.table) || []).forEach(function (r) { if (r && r._syncState === 'pending' && !ids[r.id]) existing.push(r); });
    state.ctx = { dbAllSites: rights.dbAllSites, dbSite: rights.dbSite, employees: employees, namesOnly: namesOnly, sites: lists.sites, projects: lists.projects,
      existing: existing.filter(notDeleted), range: range, loadedAt: new Date().toISOString() };
    CTX = state.ctx;
  }
  var CTX = null;

  /* ═══ الأعمدة الستة التي لا يعرضها عرض الموظفين · THE SIX COLUMNS THE STAFF VIEW OMITS ═══
     الملف 62 يبني portal_employees بلا: site, employeeType, insuranceWage,
     nationalIdExpiry, drivingLicence, drivingLicenceExpiry (الموقع غائب عمداً كي
     لا يقصّه مرشِّح المواقع في المتصفح؛ والبقية حقول أُضيفت بعد العرض). فلم يكن
     لها «قبل»، فلم تُعدَّل على الموجودين قط (تنبيه «لم تُطبَّق على الموجودين»).
     قاعدة البيانات نفسها تعطي مدير الموارد البشرية ومسؤول الموارد بالموقع حق
     قراءة صفوفهم من الجدول الأصلي employees (السياسات az_hr_manager_read و
     employees_read — مقيسة في _evidence/db-catalog.json)، فنقرأ منه هذه الأعمدة
     وحدها، للموظفين الذين أعطانا العرض إياهم أصلاً، ولا نطلب راتباً ولا بنكاً
     ولا رقماً قومياً أبداً. لا صلاحية جديدة تُمنح: من ترفضه القاعدة يأخذ لا شيء
     فتبقى حقوله «لا تُطبَّق» — والفحص لكل صفّ على حدة، لا للقائمة كلها.
     File 62 builds portal_employees WITHOUT site, employeeType, insuranceWage,
     nationalIdExpiry, drivingLicence, drivingLicenceExpiry (site left out on
     purpose so the browser's site fence does not prune rows; the rest were
     added to the screen after the view). So they had no "before" and were never
     changed on existing records (the "not applied" notice). The database
     ALREADY lets the HR manager and a site HR officer read their rows from the
     base table employees (policies az_hr_manager_read / employees_read —
     measured in _evidence/db-catalog.json), so we read those columns alone,
     only for the employees the view already handed us, and never ask for
     salary, bank or national ID. No new right is granted: a role the database
     refuses gets nothing and its fields stay "not applied" — and the guard is
     PER ROW (__hxBase), never for the whole list. (TRACK MANAGER, 11 Sept 2026) */
  var EMPLOYEE_BASE_COLUMNS = ['site', 'employeeType', 'insuranceWage', 'nationalIdExpiry', 'drivingLicence', 'drivingLicenceExpiry'];
  function baseColumnsFor(mod) {
    if (!mod || mod.table !== 'employees') return [];
    if (!(global.Auth && Auth.can && Auth.can('employees', 'view'))) return [];
    var importable = {};
    H.importableFields(mod).forEach(function (f) { importable[f.name] = true; });
    return EMPLOYEE_BASE_COLUMNS.filter(function (c) { return importable[c]; });
  }
  /* {id: {col: value}} — لا يُلقي خطأً؛ رفضٌ أو انقطاع = كائن فارغ (لا صفّ يُعدّ مقروءاً)
     never throws; a refusal or a dropped line = an empty object (no row counts as read) */
  async function readBaseColumns(mod, ids) {
    var cols = baseColumnsFor(mod), out = {};
    var client = global.Auth && Auth.client && Auth.client();
    if (!cols.length || !client || !ids.length) return out;
    /* ٥٠ معرّفاً في الطلب لا ١٠٠: طلب المئة بلغ ٤٬٨٢١ حرفاً في العنوان (وكيل الأخطاء، S1) وحدّ بوابة Supabase غير
       معروف — نجعل السؤال بلا لزوم. ودفعةٌ تفشل تُسقط صفوفها هي فقط (تبقى «لا تُطبَّق»)، لا الدفعات التي وصلت (S3).
       50 ids per request, not 100: a 100-id request reached 4,821 characters in the URL (bug-reporter, S1) and
       Supabase's gateway limit is unknown — make the question unnecessary. A chunk that fails drops ITS rows only
       (they stay "not applied"), never the chunks that did arrive (S3). Fail closed per row either way. */
    for (var i = 0; i < ids.length; i += 50) {
      var res = null;
      try { res = await client.from('employees').select(['id'].concat(cols).join(',')).in('id', ids.slice(i, i + 50)); }
      catch (e) { console.warn('[hr-import-review] base columns not read (chunk ' + i + ')', e); continue; }
      if (!res || res.error) { console.warn('[hr-import-review] base columns refused (chunk ' + i + ')', res && res.error); continue; }
      (res.data || []).forEach(function (row) { out[row.id] = row; });
    }
    return out;
  }
  function mergeBase(rows, base) {
    rows.forEach(function (r) {
      var b = r && base[r.id];
      if (!b) return;
      EMPLOYEE_BASE_COLUMNS.forEach(function (c) { if (c in b) r[c] = b[c]; });
      r.__hxBase = true;                                   /* this row's six values were really read */
    });
  }
  function keyPart(mod, name, v) {
    var f = null;
    (mod.fields || []).forEach(function (x) { if (x.name === name) f = x; });
    if (v === null || v === undefined || v === '') return null;
    if (f && (f.type === 'number' || f.type === 'money')) return String(Number(v));
    if (f && f.type === 'date') return String(v).slice(0, 10);
    if (f && (f.type === 'ref' || f.type === 'select')) return String(v);
    return H.keyText(v);
  }
  function keyOf(mod, keyset, values) {
    var parts = [];
    for (var i = 0; i < keyset.length; i++) {
      var p = keyPart(mod, keyset[i], values[keyset[i]]);
      if (p === null) return null;
      parts.push(p);
    }
    return keyset.join('+') + '=' + parts.join('|');
  }

  function analyze(state) {
    var mod = state.mod, cfg = state.cfg;
    var tlist = H.targets(mod), tById = {};
    tlist.forEach(function (t) { tById[t.id] = t; });
    var fieldsByName = {};
    (mod.fields || []).forEach(function (f) { fieldsByName[f.name] = f; });
    var hasSite = !!fieldsByName.site;
    var ctx = state.ctx || {};
    var allowed = H.allowedSites(ctx), allowedIds = allowed.map(function (s) { return s.id; });
    var softSite = ctx.dbAllSites === null || ctx.dbAllSites === undefined;
    var existing = ctx.existing || [];
    /* الحقول التي يُرسلها الخادم فعلاً لهذه الشاشة — ما لا يُرسله لا يُعرض
       «قبله» ولا يُعدَّل على الموجود. Fields the server actually SENDS for
       this screen: one it never sends (e.g. an employee's site today) has no
       visible "before", so it is never changed on an existing record. */
    var readable = null;
    if (existing.length) {
      readable = {};
      existing.forEach(function (r) { Object.keys(r).forEach(function (k) { readable[k] = true; }); });
    }
    var empIdx = H.employeeIndex(ctx.employees);
    var index = {};
    (cfg.keys || []).forEach(function (ks) {
      var m = {};
      existing.forEach(function (r) { var k = keyOf(mod, ks, r); if (k) (m[k] = m[k] || []).push(r); });
      index[ks.join('+')] = m;
    });
    var canCreate = !!(global.Auth && Auth.can(mod.id, 'create'));
    var canEdit = !!(global.Auth && Auth.can(mod.id, 'edit'));

    var results = state.dataRows.map(function (cells, i) {
      var r = { n: i + 2, errors: [], warnings: [], values: {}, refs: {}, person: {}, provided: [], cls: null };
      state.mapping.forEach(function (tid, c) {
        if (!tid) return;
        var t = tById[tid]; if (!t) return;
        var s = cellText(cells[c]);
        if (s === '') return;                                     /* blank keeps the old value */
        if (t.sub) { (r.person[t.field.name] = r.person[t.field.name] || {})[t.sub] = s; return; }
        var got = readValue(mod, cfg, t.field, s);
        if (got.error) { if (t.field.name === 'site') r.siteBad = true; r.errors.push(got.error); return; }
        if (got.warning) r.warnings.push(got.warning);
        r.values[t.field.name] = got.value;
        if (got.ref) r.refs[t.field.name] = got.ref;
        r.provided.push(t.field.name);
      });
      Object.keys(r.person).forEach(function (fname) {
        var f = fieldsByName[fname], p = r.person[fname];
        var res = H.resolvePerson(empIdx, p);
        var who = lab(f.label);
        if (res.employee) { r.values[fname] = res.employee.id; r.refs[fname] = res.employee; r.provided.push(fname); return; }
        if (res.none) return;
        var msg = {
          'name-only': { ar: who + ': الاسم وحده لا يكفي — أضف الرقم الوظيفي أو الرقم القومي (قد يتشابه اسمان)', en: who + ': a name alone is not enough — add the employee number or national ID (two people can share a name)' },
          'code-ambiguous': { ar: who + ': الرقم الوظيفي «' + p.code + '» مسجّل لأكثر من موظف — لم نختر', en: who + ': employee number "' + p.code + '" belongs to more than one person — not chosen' },
          'nid-ambiguous': { ar: who + ': الرقم القومي مسجّل لأكثر من موظف — لم نختر', en: who + ': the national ID belongs to more than one person — not chosen' },
          'code-unknown': { ar: who + ': لا يوجد موظف ظاهر لك بالرقم الوظيفي «' + p.code + '»', en: who + ': no employee you can see has number "' + p.code + '"' },
          'code-zero': { ar: who + ': لا يوجد الرقم «' + p.code + '» — لكن يوجد «' + res.near + '». غالباً حذف إكسل الصفر الأول: اجعل العمود «نص» واكتب الرقم كما هو مسجّل. لم نخمّن.', en: who + ': number "' + p.code + '" does not exist — but "' + res.near + '" does. Excel probably dropped the leading zero: format the column as Text and write the number as registered. Not guessed.' },
          'nid-unknown': { ar: who + ': لا يوجد موظف ظاهر لك بهذا الرقم القومي', en: who + ': no employee you can see has this national ID' },
          'code-nid-conflict': { ar: who + ': الرقم الوظيفي لموظف والرقم القومي لموظف آخر — تعارض', en: who + ': the number belongs to one person and the national ID to another — conflict' },
          'name-conflict': { ar: who + ': الرقم الوظيفي «' + p.code + '» مسجّل باسم «' + (res.employee && res.employee.name) + '» لا «' + p.name + '» — تعارض', en: who + ': number "' + p.code + '" is registered to "' + (res.employee && res.employee.name) + '", not "' + p.name + '" — conflict' }
        }[res.error] || { ar: who + ': لم يُتعرَّف على الموظف', en: who + ': person not recognised' };
        r.errors.push(L(msg));
      });

      /* الهوية · identity */
      var keyset = null, key = null;
      (cfg.keys || []).some(function (ks) { var k = keyOf(mod, ks, r.values); if (k) { keyset = ks; key = k; return true; } return false; });
      r.key = key;
      if (key) {
        var hits = index[keyset.join('+')][key] || [];
        if (hits.length > 1) r.errors.push(L({ ar: 'يطابق ' + num(hits.length) + ' سجلات موجودة بنفس المفتاح — لم نختر أحدها', en: 'matches ' + hits.length + ' existing records with the same key — none chosen' }));
        else if (hits.length === 1) r.match = hits[0];
      }
      if (mod.id === 'employees' && !r.match && r.values.code) {
        var zk = H.zeroKey(r.values.code);
        var alike = zk ? (empIdx.byZero[zk] || []).filter(function (e) { return H.keyText(e.code) !== H.keyText(r.values.code); }) : [];
        if (alike.length) {
          r.errors.push(L({ ar: 'الرقم «' + r.values.code + '» هو «' + alike[0].code + '» المسجّل بعد حذف الأصفار على اليسار — غالباً حذف إكسل الصفر الأول. لم نُنشئ موظفاً ثانياً: اجعل العمود «نص» واكتب ' + alike[0].code + '.',
            en: 'number "' + r.values.code + '" is the registered "' + alike[0].code + '" once leading zeros are dropped — Excel probably removed the first zero. No second employee was created: format the column as Text and write ' + alike[0].code + '.' }));
        }
      }
      if (mod.id === 'employees') {
        var nid = r.values.nationalId ? H.keyText(r.values.nationalId) : null;
        var owners = nid ? (empIdx.byNid[nid] || []) : [];
        var other = owners.filter(function (o) { return !r.match || o.id !== r.match.id; })[0];
        if (other) r.errors.push(L({ ar: 'الرقم القومي مسجّل بالفعل للموظف ' + (other.code || '') + ' — ' + (other.name || '') + ' — لم نغيّر شيئاً', en: 'this national ID already belongs to employee ' + (other.code || '') + ' — ' + (other.name || '') + ' — nothing changed' }));
        if (r.match && r.values.name && r.match.name && !H.sameName(r.values.name, r.match.name)) {
          r.errors.push(L({ ar: 'الرقم الوظيفي ' + r.match.code + ' مسجّل باسم «' + r.match.name + '» لا «' + r.values.name + '» — تعارض لا نعدّله', en: 'number ' + r.match.code + ' is registered to "' + r.match.name + '", not "' + r.values.name + '" — a conflict we do not change' }));
        }
      }

      /* الموقع · site — file, else the project's own site, else his explicit choice */
      if (hasSite) {
        var fromFile = r.values.site, proj = r.refs.project || (r.values.project && H.projectsAll(ctx).filter(function (x) { return x.id === r.values.project; })[0]);
        if (fromFile) r.siteSource = 'file';
        if (fromFile && proj && proj.site && proj.site !== fromFile) {
          r.errors.push(L({ ar: 'المشروع «' + proj.name + '» تابع لموقع آخر غير المكتوب في عمود الموقع — تعارض', en: 'project "' + proj.name + '" belongs to a different site than the one written — conflict' }));
        }
        if (!r.match) {
          if (!fromFile && proj && proj.site) { r.values.site = proj.site; r.siteSource = 'project'; }
          if (!r.values.site && state.defaultSite) { r.values.site = state.defaultSite; r.siteSource = 'choice'; }
          if (!r.values.site && !r.siteBad) { r.siteMissing = true; r.errors.push(L({ ar: 'بلا موقع — اختر موقعاً للصفوف التي بلا موقع أعلى النافذة، أو أضف عمود «الموقع»', en: 'no site — choose one for rows without a site at the top of this window, or add a «الموقع» column' })); }
        }
        if (r.values.site && allowedIds.indexOf(r.values.site) === -1) {
          /* لم نستطع سؤال قاعدة البيانات → تنبيه لا منع؛ هي تحكم عند الحفظ
             if the database could not be asked → a warning, not a block; it decides at save */
          (softSite ? r.warnings : r.errors).push(L({ ar: 'الموقع «' + (Schema.refLabel(fieldsByName.site, r.values.site)) + '» خارج صلاحيتك' + (softSite ? ' على ما يبدو — قد ترفضه قاعدة البيانات عند الحفظ' : ' — لا تستطيع الحفظ فيه'),
            en: 'site "' + Schema.refLabel(fieldsByName.site, r.values.site) + '" is outside your access' + (softSite ? ' as far as we can tell — the database may refuse it at save' : ' — you cannot save there') }));
        }
      }
      return r;
    });

    /* المكرر داخل الملف · duplicates inside the file */
    var seen = {};
    results.forEach(function (r) { if (r.key) (seen[r.key] = seen[r.key] || []).push(r); });
    Object.keys(seen).forEach(function (k) {
      var g = seen[k]; if (g.length < 2) return;
      var rowsTxt = g.map(function (x) { return num(x.n); }).join('، ');
      g.forEach(function (r) { r.errors.push(L({ ar: 'مكرر داخل الملف (الصفوف ' + rowsTxt + ') — لم نختر أحدها', en: 'repeated inside the file (rows ' + rowsTxt + ') — none chosen' })); });
    });
    /* إجازتان جديدتان في نفس الملف لنفس الموظف تتداخلان → تنبيه على كلتيهما
       two NEW leaves in the same file for the same person that overlap → warn both */
    if (mod.id === 'leaves') {
      var byEmp = {};
      results.forEach(function (r) { if (!r.errors.length && r.values.employee && r.values.fromDate && r.values.toDate) (byEmp[r.values.employee] = byEmp[r.values.employee] || []).push(r); });
      Object.keys(byEmp).forEach(function (k) {
        var g = byEmp[k];
        for (var x = 0; x < g.length; x++) for (var y = x + 1; y < g.length; y++) {
          if (g[x].values.fromDate <= g[y].values.toDate && g[x].values.toDate >= g[y].values.fromDate) {
            g[x].warnings.push(L({ ar: 'تتداخل مع الصف ' + num(g[y].n) + ' في نفس الملف', en: 'overlaps row ' + g[y].n + ' of the same file' }));
            g[y].warnings.push(L({ ar: 'تتداخل مع الصف ' + num(g[x].n) + ' في نفس الملف', en: 'overlaps row ' + g[x].n + ' of the same file' }));
          }
        }
      });
    }
    if (mod.id === 'employees') {
      /* «101» و«0101» في نفس الملف = نفس الشخص على الأغلب — لا نُنشئ أياً منهما
         «101» and «0101» in the same file are most likely one person — neither is created */
      var zs = {};
      results.forEach(function (r) { var z = r.values.code ? H.zeroKey(r.values.code) : null; if (z) (zs[z] = zs[z] || []).push(r); });
      Object.keys(zs).forEach(function (k) {
        var g = zs[k]; if (g.length < 2) return;
        var forms = {}; g.forEach(function (x) { forms[H.keyText(x.values.code)] = true; });
        if (Object.keys(forms).length < 2) return;                  /* identical numbers: reported above */
        var rowsTxt = g.map(function (x) { return num(x.n); }).join('، ');
        g.forEach(function (r) { r.errors.push(L({ ar: 'نفس الرقم مكتوب بصفر وبدونه في الصفوف ' + rowsTxt + ' — لم نختر أحدها', en: 'the same number written with and without a leading zero in rows ' + rowsTxt + ' — none chosen' })); });
      });
      var nids = {};
      results.forEach(function (r) { if (r.values.nationalId) (nids[H.keyText(r.values.nationalId)] = nids[H.keyText(r.values.nationalId)] || []).push(r); });
      Object.keys(nids).forEach(function (k) {
        var g = nids[k]; if (g.length < 2) return;
        if (g.every(function (x) { return x.key && x.key === g[0].key; })) return;   /* already reported above */
        var rowsTxt = g.map(function (x) { return num(x.n); }).join('، ');
        g.forEach(function (r) { r.errors.push(L({ ar: 'نفس الرقم القومي في أكثر من صف (' + rowsTxt + ')', en: 'the same national ID in more than one row (' + rowsTxt + ')' })); });
      });
    }

    /* التصنيف · classification */
    var summary = { newRows: [], changes: [], same: [], invalid: [], unapplied: {}, defaults: {} };
    results.forEach(function (r) {
      if (!r.errors.length && r.match) {
        if (cfg.kind === 'document' || !cfg.updates) {
          r.cls = 'same'; r.note = L({ ar: 'موجود بالفعل في البوابة (' + (r.match.docNo || r.match.code || '') + ') — المستندات لا تُعدَّل بالاستيراد؛ افتحه لتعديله إن كان مسودة', en: 'already in the portal (' + (r.match.docNo || r.match.code || '') + ') — documents are not changed by import; open it to edit if it is still a draft' });
        } else {
          var diff = [];
          r.provided.forEach(function (name) {
            var f = fieldsByName[name];
            if (!f) return;
            if (readable && !readable[name]) { summary.unapplied[name] = (summary.unapplied[name] || 0) + 1; return; }
            /* عمود من الستة ولم يُقرأ لهذا الصف بعينه من الجدول الأصلي → لا «قبل» له → لا يُعدَّل
               one of the six, and THIS row's value was not read from the base table → no "before" → not changed */
            if (mod.id === 'employees' && EMPLOYEE_BASE_COLUMNS.indexOf(name) !== -1 && r.match.__hxBase !== true) {
              summary.unapplied[name] = (summary.unapplied[name] || 0) + 1; return;
            }
            var before = r.match[name], after = r.values[name];
            /* الاسم الأقصر لنفس الشخص («منى حسن» عن «منى حسن عبد العزيز») اختصارٌ
               في الملف لا تصحيح — لا نقصّ الاسم الكامل المسجّل. الاسم الأطول أو
               المختلف يُعرض تعديلاً عادياً «قبل ← بعد».
               A SHORTER name for the same person is an abbreviation in the file,
               not a correction — the full registered name is never cut. A longer
               or different name is shown as an ordinary before → after change. */
            if (mod.id === 'employees' && name === 'name' && before && H.sameName(before, after) &&
                String(after).split(/\s+/).filter(Boolean).length < String(before).split(/\s+/).filter(Boolean).length) {
              r.notes = (r.notes || []).concat([L({ ar: 'الاسم في الملف أقصر من المسجّل — أبقينا الاسم الكامل', en: 'the name in the file is shorter than the registered one — the full name was kept' })]);
              return;
            }
            /* معرّفات نصية: «٠٠١٢» و«0012» قيمة واحدة، لا تعديل
               identifiers: «٠٠١٢» and «0012» are ONE value, not a change */
            var same = (cfg.text || []).indexOf(name) !== -1
              ? H.keyText(before == null ? '' : before) === H.keyText(after)
              : cmp(f, before) === cmp(f, after);
            if (!same) diff.push({ field: f, before: before, after: after });
          });
          if (diff.length && global.Workflow && Workflow.isLocked && Workflow.isLocked(r.match)) {
            r.errors.push(L({ ar: 'السجل الموجود مقفل (في الاعتماد أو معتمد) — لا يُعدَّل', en: 'the existing record is locked (in approval or approved) — not changed' }));
          } else if (diff.length && !canEdit) {
            r.errors.push(L({ ar: 'لا تملك صلاحية تعديل «' + lab(mod.label) + '»', en: 'you may not edit "' + lab(mod.label) + '"' }));
          } else { r.diff = diff; r.cls = diff.length ? 'change' : 'same'; }
        }
      }
      if (!r.errors.length && !r.match) {
        if (!canCreate) r.errors.push(L({ ar: 'لا تملك صلاحية الإضافة في «' + lab(mod.label) + '»', en: 'you may not add to "' + lab(mod.label) + '"' }));
        H.importableFields(mod).forEach(function (f) {
          if (!f.required) return;
          var v = r.values[f.name];
          if (v === undefined || v === null || v === '') r.errors.push(L({ ar: 'مطلوب وفارغ: ' + lab(f.label), en: 'required and empty: ' + lab(f.label) }));
        });
        if (!r.errors.length) {
          r.rec = buildRecord(state, r, summary.defaults);
          var verdict = null;
          if (global.Rules && Rules.validateSave) {
            try { verdict = Rules.validateSave(mod, r.rec, null); }
            catch (e) { r.warnings.push(L({ ar: 'تعذّر فحص قواعد الحفظ لهذا الصف', en: 'the save rules could not check this row' })); }
          }
          if (verdict && verdict.errors && verdict.errors.length) verdict.errors.forEach(function (m) { r.errors.push(String(m)); });
          if (verdict && verdict.warnings && verdict.warnings.length) verdict.warnings.forEach(function (m) { r.warnings.push(String(m)); });
          if (!r.errors.length) r.cls = 'new';
        }
        if (mod.id === 'leaves' && r.values.employee && r.values.fromDate && r.values.toDate) {
          existing.forEach(function (x) {
            if (x.employee !== r.values.employee || ['rejected', 'reversed'].indexOf(x.status) !== -1) return;
            if (String(x.fromDate) <= r.values.toDate && String(x.toDate) >= r.values.fromDate) {
              r.warnings.push(L({ ar: 'تتداخل مع إجازة موجودة ' + (x.docNo || '') + ' (' + x.fromDate + ' → ' + x.toDate + ')', en: 'overlaps an existing leave ' + (x.docNo || '') + ' (' + x.fromDate + ' → ' + x.toDate + ')' }));
            }
          });
        }
      }
      if (r.errors.length) { r.cls = 'invalid'; summary.invalid.push(r); }
      else if (r.cls === 'new') summary.newRows.push(r);
      else if (r.cls === 'change') summary.changes.push(r);
      else summary.same.push(r);
    });
    summary.results = results;
    summary.hasSite = hasSite;
    summary.allowedSites = allowed;
    summary.noSiteCount = results.filter(function (r) { return !r.match && hasSite && r.siteSource !== 'file' && r.siteSource !== 'project'; }).length;
    summary.canEdit = canEdit; summary.canCreate = canCreate;
    return summary;
  }

  /* السجل الجديد كما سيُكتب · the new record exactly as it will be written */
  function buildRecord(state, r, defaultsSeen) {
    var mod = state.mod, rec = {};
    Object.keys(r.values).forEach(function (k) { rec[k] = r.values[k]; });
    /* قيمة افتراضية واحدة فقط: «حالة» السجل الاختيارية (الموظف المستورد
       «على رأس العمل»). لا غيرها — قِيس في لقطة المراجعة ١٠ سبتمبر: القيمة
       الافتراضية لنوع العمالة «دائم — مكتب» كانت ستُكتب على سائق لودر في
       الروبيكي. والحقول المطلوبة لا تُملأ عنه أبداً (حاضر/غائب مثلاً) — يجب
       أن يقولها ملفه. ولا مبلغ يُخترع، ولا «اليوم» مكان تاريخ ناقص.
       ONE default only: the record's own optional STATUS (an imported
       employee is «on the job»). Nothing else — measured on the review
       screenshot, 10 Sept: the employee-type default «Permanent — office»
       would have been written on an Elrobaki loader driver. A REQUIRED field
       is never filled for him (present/absent, say) — his file must state
       it. No invented amount, never "today" for a missing date. */
    var allowDefault = state.cfg.defaults || [];
    H.importableFields(mod).forEach(function (f) {
      if (rec[f.name] !== undefined || f.default === undefined || f.default === 'today') return;
      if (allowDefault.indexOf(f.name) === -1 || f.type !== 'select' || f.required) return;
      rec[f.name] = f.default;
      defaultsSeen[f.name] = f;
    });
    if (mod.workflow) { rec.status = 'draft'; rec.trail = []; }
    if (mod.docPrefix && !rec.docNo && global.Store && Store.nextDocNo) rec.docNo = Store.nextDocNo(mod.docPrefix);
    rec._importedAt = new Date().toISOString();
    return rec;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · النافذة الواحدة · THE ONE WINDOW
     ═══════════════════════════════════════════════════════════════════ */
  function openReview(moduleId, rows) {
    H = H || global.HRExcel;
    var mod = Schema.get(moduleId), cfg = H.SCREENS[moduleId];
    var headers = (rows[0] || []).map(function (h) { return String(h == null ? '' : h).trim(); });
    var state = {
      moduleId: moduleId, mod: mod, cfg: cfg, headers: headers,
      dataRows: rows.slice(1).filter(function (r) { return r && r.some(function (c) { return cellText(c) !== ''; }); }),
      mapping: [], sure: [], suggestion: [], forbidden: [],
      defaultSite: null, approve: false, saving: false,
      truncated: rows.length >= XLSX_MAX + 1
    };
    var used = {};
    headers.forEach(function (h, i) {
      var t = H.matchHeading(mod, h, used);
      if (t) { state.mapping[i] = t.id; state.sure[i] = true; used[t.id] = true; return; }
      state.mapping[i] = null; state.sure[i] = false;
      /* عمود لحقل لا تملك قراءته: يُذكر باسمه ولا يُعرض للربط أبداً — ويُعرف
         بنفس المطابقة ومرادفاتها («المرتب الأساسي» = الراتب)، لا بالاسم الحرفي وحده.
         a column for a field this role may not read: named, never mappable —
         recognised with the SAME matching and synonyms («المرتب الأساسي» is
         the salary), not by the literal label alone. */
      var hid = H.matchHeadingAll(mod, h, {});
      if (hid && !hid.sub && global.Auth && Auth.fieldHidden(mod.id, hid.field.name)) state.forbidden[i] = hid.field;
      var guess = DataImport.mapColumns(mod, [h])[0];
      if (guess && !state.forbidden[i]) {
        var gt = H.targets(mod).filter(function (x) { return x.id === guess.name || x.id === guess.name + '#code'; })[0];
        if (gt) state.suggestion[i] = gt.id;
      }
    });
    UI.modal({
      title: L({ ar: 'استيراد إلى «' + lab(mod.label) + '» — مراجعة قبل الحفظ', en: 'Import into "' + lab(mod.label) + '" — review before saving' }),
      size: 'wide',
      body: '<div id="hxReview"><p>' + esc(L({ ar: '… نقرأ من البوابة ما هو مسجّل الآن حتى نقارن ملفك به …', en: '… reading what the portal holds right now, to compare your file with it …' })) + '</p></div>',
      buttons: [
        { label: L({ ar: 'إلغاء — لا يُحفظ شيء', en: 'Cancel — nothing is saved' }), cls: 'btn-ghost' },
        { label: L({ ar: '⬇ المراجعة كملف إكسل', en: '⬇ Review as Excel' }), cls: 'btn-outline', keepOpen: true,
          onClick: function () { downloadReview(state); return false; } },
        { label: '…', cls: 'btn-primary', disabled: true, onClick: function () { return save(state); } }
      ]
    });
    hideAttachShortcut();
    reload(state);
  }

  /* يقرأ السياق من الخادم ثم يحلّل ويرسم · load from the server, analyse, paint */
  function reload(state) {
    var btn = document.querySelector('#modalFoot .btn-primary'); if (btn) btn.disabled = true;
    return loadContext(state).then(function () {
      reanalyze(state);
    }).catch(function (e) {
      console.error('[hr-import-review] context', e);
      var host = document.getElementById('hxReview');
      var off = String(e && e.message) === 'offline';
      if (host) host.innerHTML = '<div class="alert alert-danger">' + esc(off
        ? L({ ar: 'الاستيراد يحتاج اتصالاً بالإنترنت لنقارن ملفك بما في البوابة الآن — لم يُقرأ ولم يُحفظ شيء.', en: 'Import needs an internet connection to compare your file with the portal right now — nothing was read or saved.' })
        : String(e && e.message) === 'no-sites'
          ? L({ ar: 'لم نستطع قراءة قائمة المواقع من البوابة الآن — لم يُحفظ شيء. انتظر لحظة وأعد الاستيراد.', en: 'Could not read the list of sites from the portal just now — nothing was saved. Wait a moment and import again.' })
          : L({ ar: 'تعذّر قراءة ما في البوابة الآن — لم يُحفظ شيء. أعد المحاولة.', en: 'Could not read what the portal holds right now — nothing was saved. Try again.' }) + ' (' + (e && e.message || e) + ')') + '</div>';
    });
  }

  /* 🔴 الموافقة تخصّ ما كان على الشاشة لحظة وضع العلامة بالضبط. قاسه وكيل
     الأخطاء: وضع العلامة لتعديل هاتف، ثم ربط عمود غامض بـ«الراتب الأساسي» —
     بقيت العلامة وحُفظ راتب لم يوافق عليه أحد. الآن: أي إعادة حساب تغيّر ما
     سيُكتب تمسح العلامة، والحفظ يقارن بصمة ما وافق عليه بما سيُكتب.
     🔴 The approval belongs to EXACTLY what was on screen when it was ticked.
     Measured by the bug-reporter: tick for one phone change, then map an
     unclear column to basic salary — the tick stayed and a salary nobody
     approved was saved. Now any re-analysis that changes what would be
     written clears the tick, and Save compares a fingerprint of what was
     approved with what would be written. */
  function changesPrint(a) {
    return (a && a.changes || []).map(function (r) {
      return r.n + ':' + r.diff.map(function (d) { return d.field.name + '=' + cmp(d.field, d.after); }).join(',');
    }).join('|');
  }
  function reanalyze(state) {
    state.analysis = analyze(state);
    if (state.approve && changesPrint(state.analysis) !== state.approvedPrint) { state.approve = false; state.approvedPrint = null; }
    paint(state);
  }
  function changedFieldNames(a, mod) {
    var seen = {}, out = [];
    (a.changes || []).forEach(function (r) { r.diff.forEach(function (d) { if (!seen[d.field.name]) { seen[d.field.name] = true; out.push(lab(d.field.label)); } }); });
    return out;
  }

  function saveLabel(a, state) {
    var n = a.newRows.length, c = state.approve ? a.changes.length : 0;
    if (!n && !c) return L({ ar: 'لا شيء للحفظ', en: 'Nothing to save' });
    return L({ ar: 'احفظ: ' + num(n) + ' جديد' + (c ? ' + ' + num(c) + ' تعديل' : ''), en: 'Save: ' + n + ' new' + (c ? ' + ' + c + ' changes' : '') });
  }

  function paint(state) {
    var host = document.getElementById('hxReview');
    if (!host) return;
    var a = state.analysis, mod = state.mod, cfg = state.cfg;
    var tlist = H.targets(mod);
    var h = '';
    /* «هتروح فين؟» · WHERE WILL IT GO */
    h += '<div class="alert alert-info" style="display:block">' +
      '<strong>' + esc(L({ ar: 'الوجهة: ', en: 'Destination: ' })) + '</strong>' + esc(lab(mod.label)) + ' — ' + esc(lab(cfg.what)) + '<br>' +
      esc(L({ ar: 'بعد الحفظ تجدها في: ', en: 'After saving you will find them in: ' })) + '<strong>' + esc(lab(cfg.where)) + '</strong>' +
      (mod.workflow ? '<br>' + esc(L({ ar: 'تُحفظ «مسودة» وتمرّ بخطوات الاعتماد المعتادة — الاستيراد لا يعتمد ولا يصرف شيئاً.', en: 'Saved as DRAFTS and go through the usual approval steps — the import approves and pays nothing.' })) : '') +
      '<br><span class="small muted">' + esc(L({ ar: 'في الملف ' + num(state.dataRows.length) + ' صف بيانات و' + num(state.headers.length) + ' عمود. لا يُكتب أي صف قبل ضغط «احفظ».', en: 'The file has ' + state.dataRows.length + ' data rows and ' + state.headers.length + ' columns. Nothing is written before you press Save.' })) + '</span></div>';
    if (state.truncated) {
      h += '<div class="alert alert-danger">' + esc(L({ ar: '⚠ قُرئ أول ' + num(XLSX_MAX) + ' صف فقط — وهو أقصى ما يقرؤه قارئ الإكسل. قسّم الملف إن كان أكبر.', en: '⚠ Only the first ' + XLSX_MAX + ' rows were read — the Excel reader\'s limit. Split the file if it is larger.' })) + '</div>';
    }

    /* الأعمدة: الواضح مطويّ، وغير الواضح يُسأل عنه · columns: clear ones folded, unclear ones asked */
    var unclear = [], clear = [];
    state.headers.forEach(function (hd, i) { (state.sure[i] ? clear : unclear).push(i); });
    var optionsFor = function (i) {
      var chosen = state.mapping[i] || '';
      var usedBy = {};
      state.mapping.forEach(function (tid, j) { if (tid && j !== i) usedBy[tid] = true; });
      var o = '<option value="">' + esc(L({ ar: '— تجاهل هذا العمود —', en: '— ignore this column —' })) + '</option>';
      if (state.suggestion[i] && !usedBy[state.suggestion[i]]) {
        var st = tlist.filter(function (t) { return t.id === state.suggestion[i]; })[0];
        if (st) o += '<option value="' + esc(st.id) + '"' + (chosen === st.id ? ' selected' : '') + '>' + esc(L({ ar: 'اقتراح: ', en: 'Suggestion: ' }) + st.label) + '</option>';
      }
      tlist.forEach(function (t) {
        if (usedBy[t.id] || t.id === state.suggestion[i]) return;
        o += '<option value="' + esc(t.id) + '"' + (chosen === t.id ? ' selected' : '') + '>' + esc(t.label + (t.required ? ' *' : '')) + '</option>';
      });
      return o;
    };
    var sample = function (i) { var v = ''; for (var k = 0; k < state.dataRows.length && !v; k++) v = cellText(state.dataRows[k][i]); return v; };
    var colRow = function (i, askIt) {
      var forb = state.forbidden[i];
      return '<tr' + (askIt ? ' style="background:#fff8e6"' : '') + '><td style="padding:5px 8px;font-weight:600">' + esc(state.headers[i] || L({ ar: '(بلا عنوان)', en: '(no heading)' })) + '</td>' +
        '<td style="padding:5px 8px;color:#667">' + esc(String(sample(i)).slice(0, 28)) + '</td><td style="padding:5px 8px">' +
        (forb ? '<span style="color:#b42318">⛔ ' + esc(L({ ar: 'عمود «' + lab(forb.label) + '» ليس من صلاحيتك — لن يُقرأ', en: 'column "' + lab(forb.label) + '" is outside your access — not read' })) + '</span>'
              : (!state.mapping[i] && H.computedField(mod.fields, state.headers[i])) ? '<span class="small" style="color:#667">' + esc(L({ ar: '«' + lab(H.computedField(mod.fields, state.headers[i]).label) + '» تحسبه البوابة بنفسها — لا يُستورد', en: '"' + lab(H.computedField(mod.fields, state.headers[i]).label) + '" is computed by the portal — not imported' })) + '</span>'
              : '<select data-hx-map="' + i + '" style="min-width:240px;padding:4px">' + optionsFor(i) + '</select>' +
                (state.sure[i] ? ' <span style="color:#1b7f4b;font-weight:700" title="' + esc(L({ ar: 'تعرّفنا عليه بالاسم', en: 'recognised by its heading' })) + '">✓</span>' : '')) +
        '</td></tr>';
    };
    var colsTable = function (list, askIt) {
      return '<div class="table-wrap" style="max-height:260px;overflow:auto"><table class="data-table"><thead><tr><th>' + esc(L({ ar: 'عمود ملفك', en: 'Your column' })) + '</th><th>' +
        esc(L({ ar: 'مثال منه', en: 'Example' })) + '</th><th>' + esc(L({ ar: 'يُقرأ كـ', en: 'Read as' })) + '</th></tr></thead><tbody>' +
        list.map(function (i) { return colRow(i, askIt); }).join('') + '</tbody></table></div>';
    };
    if (unclear.length) {
      h += '<h4 style="margin:12px 0 6px">' + esc(L({ ar: '؟ ' + num(unclear.length) + ' عمود غير واضح — اختر لكل منها أو اتركه «تجاهل»', en: '? ' + unclear.length + ' unclear column(s) — choose for each, or leave it on "ignore"' })) + '</h4>' + colsTable(unclear, true);
    }
    h += '<details' + (unclear.length ? '' : ' open') + ' style="margin:8px 0"><summary style="cursor:pointer">' +
      esc(L({ ar: '✓ ' + num(clear.length) + ' عمود تعرّفنا عليه بعنوانه (اضغط لعرضها أو تغييرها)', en: '✓ ' + clear.length + ' column(s) recognised by heading (click to view or change)' })) + '</summary>' + colsTable(clear, false) + '</details>';
    var mappedIds = {};
    state.mapping.forEach(function (t) { if (t) mappedIds[t] = true; });
    var missingReq = tlist.filter(function (t) {
      if (!t.required) return false;
      if (t.sub) return !(mappedIds[t.field.name + '#code'] || mappedIds[t.field.name + '#nationalId']);
      return !mappedIds[t.id];
    }).filter(function (t, i, all) { return !t.sub || all.findIndex(function (x) { return x.field.name === t.field.name; }) === i; });
    if (missingReq.length && a.newRows.length + a.invalid.length) {
      h += '<div class="alert alert-warn">' + esc(L({ ar: 'حقول مطلوبة للسجلات الجديدة وليست في ملفك: ', en: 'Required for NEW records and not in your file: ' }) +
        missingReq.map(function (t) { return t.sub ? lab(t.field.label) + ' (' + L({ ar: 'بالرقم الوظيفي أو القومي', en: 'by number or national ID' }) + ')' : t.label; }).join('، ')) + '</div>';
    }

    /* الموقع للصفوف التي بلا موقع — اختيار صريح لا استنتاج · site for rows without one — an explicit choice */
    if (a.hasSite) {
      var needSite = a.results.filter(function (r) { return !r.match && (r.siteMissing || r.siteSource === 'choice'); }).length;
      if (needSite || state.defaultSite) {
        h += '<div class="alert alert-warn" style="display:block"><label>' + esc(L({ ar: 'صفوف جديدة بلا موقع في الملف ولا في مشروعها: ' + num(needSite) + ' — موقعها: ', en: 'New rows with no site in the file or in their project: ' + needSite + ' — their site: ' })) +
          '<select id="hxDefaultSite" style="padding:4px"><option value="">' + esc(L({ ar: '— اختر (لن نختار عنك) —', en: '— choose (we will not choose for you) —' })) + '</option>' +
          a.allowedSites.map(function (s) { return '<option value="' + esc(s.id) + '"' + (state.defaultSite === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
          '</select></label></div>';
      }
    }

    /* الملخّص · summary */
    h += '<div id="hxSummary" data-new="' + a.newRows.length + '" data-change="' + a.changes.length + '" data-same="' + a.same.length + '" data-invalid="' + a.invalid.length + '" class="alert ' + (a.invalid.length ? 'alert-warn' : 'alert-info') + '" style="display:block"><strong>' +
      esc(L({ ar: '✚ جديد: ', en: '✚ New: ' })) + num(a.newRows.length) + ' · ' + esc(L({ ar: '✎ تعديل: ', en: '✎ Changes: ' })) + num(a.changes.length) + ' · ' +
      esc(L({ ar: '＝ بلا تغيير / موجود: ', en: '＝ Unchanged / already there: ' })) + num(a.same.length) + ' · ' +
      '<span style="color:#b42318">' + esc(L({ ar: '✗ لن يُحفظ: ', en: '✗ Will not be saved: ' })) + num(a.invalid.length) + '</span></strong>' +
      '<br><span class="small">' + esc(L({ ar: 'الخانة الفارغة في ملفك لا تمسح شيئاً، والصفر يُكتب صفراً.', en: 'A blank cell in your file erases nothing; a zero is written as zero.' })) + '</span></div>';
    var unapplied = Object.keys(a.unapplied);
    if (unapplied.length) {
      h += '<div class="alert alert-warn">' + esc(L({ ar: 'لم تُطبَّق على الموجودين: ' + unapplied.map(function (n) { return lab((Schema.field(mod.id, n) || {}).label || { ar: n, en: n }); }).join('، ') +
        ' — البوابة لا تعرض قيمتها الحالية، فلا يمكن عرض «قبل ← بعد» لها. تُكتب للموظفين الجدد فقط.',
        en: 'Not applied to existing records: ' + unapplied.join(', ') + ' — the portal does not show their current value, so no before → after can be shown. Written for NEW records only.' })) + '</div>';
    }
    var defs = Object.keys(a.defaults);
    if (defs.length) {
      h += '<p class="small muted">' + esc(L({ ar: 'للجديد الذي تُركت فيه هذه الخانات فارغة نضع ما يضعه النموذج نفسه: ', en: 'For new rows that left these blank we fill what the form itself pre-fills: ' }) +
        defs.map(function (n) { var f = a.defaults[n]; return lab(f.label) + ' = ' + show(f, f.default); }).join('، ')) + '</p>';
    }

    /* الأقسام · sections */
    var keyCols = keyColumnsFor(mod, cfg);
    var rowLabel = function (r) {
      var parts = keyCols.map(function (k) { var f = Schema.field(mod.id, k); return f ? show(f, r.values[k] !== undefined ? r.values[k] : (r.match ? r.match[k] : '')) : ''; }).filter(function (x) { return x && x !== '—'; });
      return parts.join(' · ') || L({ ar: '(بلا مفتاح)', en: '(no key)' });
    };
    var siteTxt = function (r) {
      if (!a.hasSite || !r.values.site) return '';
      var src = { file: L({ ar: 'من الملف', en: 'from the file' }), project: L({ ar: 'من المشروع', en: 'from the project' }), choice: L({ ar: 'اخترتَه', en: 'your choice' }) }[r.siteSource] || '';
      return esc(Schema.refLabel(Schema.field(mod.id, 'site'), r.values.site)) + (src ? ' <span class="small muted">(' + esc(src) + ')</span>' : '');
    };
    var warnTxt = function (r) { return r.warnings.length ? '<div class="small" style="color:#8a6100">⚠ ' + r.warnings.map(esc).join('<br>⚠ ') + '</div>' : ''; };
    var section = function (title, list, open, body) {
      return '<details' + (open ? ' open' : '') + ' style="margin:8px 0"><summary style="cursor:pointer;font-weight:700">' + esc(title) + ' (' + num(list.length) + ')</summary>' +
        (list.length ? '<div class="table-wrap" style="max-height:300px;overflow:auto">' + body + '</div>' : '<p class="small muted">' + esc(L({ ar: 'لا شيء', en: 'None' })) + '</p>') + '</details>';
    };
    h += section(L({ ar: '✚ جديد — سيُنشأ', en: '✚ New — will be created' }), a.newRows, true,
      '<table class="data-table"><thead><tr><th>' + esc(L({ ar: 'صف', en: 'Row' })) + '</th><th>' + esc(L({ ar: 'السجل', en: 'Record' })) + '</th>' +
      (a.hasSite ? '<th>' + esc(L({ ar: 'الموقع المقترح', en: 'Proposed site' })) + '</th>' : '') + '<th>' + esc(L({ ar: 'ما سيُكتب', en: 'What will be written' })) + '</th></tr></thead><tbody>' +
      a.newRows.map(function (r) {
        return '<tr data-hx-row="' + r.n + '" data-hx-cls="new" data-hx-site="' + esc(r.values.site || '') + '" data-hx-site-src="' + esc(r.siteSource || '') + '"><td class="num">' + num(r.n) + '</td><td>' + esc(rowLabel(r)) + warnTxt(r) + '</td>' + (a.hasSite ? '<td>' + siteTxt(r) + '</td>' : '') +
          '<td class="small">' + r.provided.filter(function (n) { return keyCols.indexOf(n) === -1 && n !== 'site'; }).map(function (n) { var f = Schema.field(mod.id, n); return esc(lab(f.label)) + ': ' + esc(show(f, r.values[n])); }).join(' · ') + '</td></tr>';
      }).join('') + '</tbody></table>');
    var approveBox = '';
    if (a.changes.length) {
      approveBox = '<label style="display:block;padding:8px;background:#eef6ff;border-radius:6px;margin:6px 0"><input type="checkbox" id="hxApprove"' + (state.approve ? ' checked' : '') + (a.canEdit ? '' : ' disabled') + '> <strong>' +
        esc(L({ ar: 'أوافق على تعديل ' + num(a.changes.length) + ' سجلاً موجوداً كما هو موضّح «قبل ← بعد» أدناه — الخانات: ' + changedFieldNames(a, mod).join('، '),
                en: 'I approve changing ' + a.changes.length + ' existing record(s) exactly as shown before → after below — boxes: ' + changedFieldNames(a, mod).join(', ') })) + '</strong>' +
        (a.canEdit ? '' : ' <span style="color:#b42318">' + esc(L({ ar: '— لا تملك صلاحية التعديل', en: '— you may not edit' })) + '</span>') +
        '<br><span class="small muted">' + esc(L({ ar: 'بدون هذه الموافقة لا يُعدَّل أي سجل موجود، ويُحفظ الجديد وحده.', en: 'Without this approval no existing record is changed; only new ones are saved.' })) + '</span></label>';
    }
    h += section(L({ ar: '✎ تعديل على موجودين — قبل ← بعد', en: '✎ Changes to existing records — before → after' }), a.changes, true,
      approveBox + '<table class="data-table"><thead><tr><th>' + esc(L({ ar: 'صف', en: 'Row' })) + '</th><th>' + esc(L({ ar: 'السجل الموجود', en: 'Existing record' })) + '</th><th>' +
      esc(L({ ar: 'التغيير', en: 'Change' })) + '</th></tr></thead><tbody>' +
      a.changes.map(function (r) {
        return '<tr data-hx-row="' + r.n + '" data-hx-cls="change" data-hx-fields="' + esc(r.diff.map(function (d) { return d.field.name; }).join(',')) + '"><td class="num">' + num(r.n) + '</td><td>' + esc(rowLabel(r)) + warnTxt(r) + '</td><td class="small">' +
          r.diff.map(function (d) { return esc(lab(d.field.label)) + ': <span style="color:#b42318;text-decoration:line-through">' + esc(show(d.field, d.before)) + '</span> ← <strong style="color:#1b7f4b">' + esc(show(d.field, d.after)) + '</strong>'; }).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table>');
    h += section(L({ ar: '✗ لن يُحفظ — وسببه', en: '✗ Will not be saved — and why' }), a.invalid, true,
      '<table class="data-table"><thead><tr><th>' + esc(L({ ar: 'صف', en: 'Row' })) + '</th><th>' + esc(L({ ar: 'السجل', en: 'Record' })) + '</th><th>' + esc(L({ ar: 'السبب', en: 'Reason' })) + '</th></tr></thead><tbody>' +
      a.invalid.map(function (r) { return '<tr data-hx-row="' + r.n + '" data-hx-cls="invalid"><td class="num">' + num(r.n) + '</td><td>' + esc(rowLabel(r)) + '</td><td class="small" style="color:#b42318">' + r.errors.map(esc).join('<br>') + '</td></tr>'; }).join('') + '</tbody></table>');
    h += section(L({ ar: '＝ بلا تغيير / موجود بالفعل', en: '＝ Unchanged / already there' }), a.same, false,
      '<table class="data-table"><tbody>' + a.same.map(function (r) { return '<tr data-hx-row="' + r.n + '" data-hx-cls="same"><td class="num">' + num(r.n) + '</td><td>' + esc(rowLabel(r)) + '</td><td class="small muted">' + esc(r.note || L({ ar: 'مطابق لما في البوابة', en: 'identical to the portal' })) + '</td></tr>'; }).join('') + '</tbody></table>');
    h += '<div id="hxProgress" class="small" style="margin-top:8px"></div>';
    host.innerHTML = h;

    host.querySelectorAll('select[data-hx-map]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var i = +sel.getAttribute('data-hx-map');
        var was = state.mapping[i];
        state.mapping[i] = sel.value || null;
        if (state.mod.id === 'attendance' && (was === 'date' || sel.value === 'date')) { reload(state); return; }
        reanalyze(state);
      });
    });
    var ds = document.getElementById('hxDefaultSite');
    if (ds) ds.addEventListener('change', function () { state.defaultSite = ds.value || null; reanalyze(state); });
    var ap = document.getElementById('hxApprove');
    if (ap) ap.addEventListener('change', function () { state.approve = !!ap.checked; state.approvedPrint = state.approve ? changesPrint(state.analysis) : null; paintButton(state); });
    paintButton(state);
  }

  /* dc-requests.js يضع «📎 مرفقات» في فوتر كل نافذة (0/60/300/900 مللي بعد
     فتحها) — في نافذة الاستيراد لا معنى له ويُربك. نخفيه في نوافذنا فقط؛
     وجوده مخفياً يمنع إعادة إضافته. dc-requests.js drops «📎 Attachments»
     into EVERY window's footer (0/60/300/900 ms after it opens) — meaningless
     in an import window. Hidden in OUR windows only; staying present-but-
     hidden stops it being re-added. */
  function hideAttachShortcut() {
    [0, 120, 400, 1000].forEach(function (ms) {
      setTimeout(function () {
        var mine = document.getElementById('hxReview') || document.getElementById('hxResult') || document.getElementById('hxLines');
        var j = document.querySelector('#modalFoot #azAttachJump');
        if (mine && j) j.hidden = true;
      }, ms);
    });
  }
  global.HRExcelHideAttach = hideAttachShortcut;

  function paintButton(state) {
    var btn = document.querySelector('#modalFoot .btn-primary');
    if (!btn || state.saving) return;
    var a = state.analysis;
    btn.textContent = saveLabel(a, state);
    btn.disabled = !(a.newRows.length || (state.approve && a.changes.length));
  }

  function keyColumnsFor(mod, cfg) {
    if (mod.id === 'employees') return ['code', 'name'];
    var k = (cfg.keys || []).filter(function (ks) { return ks[0] !== 'docNo'; })[0] || (cfg.keys || [])[0] || [];
    return k.slice();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · الحفظ ثم التأكّد من الخادم · SAVE, THEN CONFIRM ON THE SERVER
     ═══════════════════════════════════════════════════════════════════ */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function progress(txt) { var p = document.getElementById('hxProgress'); if (p) p.textContent = txt; }

  /* ═══ لقطة الأوفلاين مرة واحدة لكل دفعة · ONE OFFLINE SNAPSHOT PER BATCH ═══
     قِيس ١١ سبتمبر (t13، ثم probe-create-cost.js): Store.create يكتب لقطة الأوفلاين
     الكاملة (كل الجداول) بعد كل صفّ — store.js:385 saveSnapshot() — فمع ألف صفّ
     تُنسَخ القاعدة كلها ألف مرة على الخيط الرئيسي: الشاشة تجمّدت ٥٩ ثانية دفعة
     واحدة وسطر التقدّم لم يتغيّر إلا مرتين. ٣٠٠ صفّ: تأخّر ١١٣٠ مللي ثانية كما هو،
     ٥ مللي ثانية مع تجميع اللقطات. لا نعدّل store.js: نمسك OfflineDB.saveSnapshot
     أثناء الكتابة ونعيده ونكتب لقطة واحدة في النهاية. لا فقدان: كل كتابة في طابور
     الجهاز (OfflineDB.queueAdd) منذ لحظتها، واللقطة تُعاد عند الفتح التالي.
     Measured 11 Sept (t13, then probe-create-cost.js): Store.create writes the
     WHOLE offline snapshot (every table) after every row — store.js:385
     saveSnapshot() — so a thousand rows copy the whole database a thousand
     times on the main thread: the screen froze 59 s in one block and the
     progress line moved twice. 300 rows: 1,130 ms lag as-is, 5 ms with the
     snapshots coalesced. store.js is not edited: OfflineDB.saveSnapshot is HELD
     while the batch writes and restored after, with ONE snapshot at the end.
     No loss: every write sits in the device queue (OfflineDB.queueAdd) from the
     moment it is made, and the snapshot is rebuilt on the next open. */
  function holdSnapshots() {
    var db = global.OfflineDB;
    if (!db || typeof db.saveSnapshot !== 'function' || db.__hxSnapshotHeld) return { release: function () {} };
    var orig = db.saveSnapshot, last = null;
    db.saveSnapshot = function () { last = Array.prototype.slice.call(arguments); return Promise.resolve(); };
    db.__hxSnapshotHeld = true;
    return {
      release: function () {
        db.saveSnapshot = orig; db.__hxSnapshotHeld = false;
        if (!last) return;
        try { var p = orig.apply(db, last); if (p && p.catch) p.catch(function (e) { console.warn('[hr-import-review] final offline snapshot failed', e); }); }
        catch (e) { console.warn('[hr-import-review] final offline snapshot failed', e); }
      }
    };
  }

  async function readServer(mod, ids) {
    var out = {};
    var client = global.Auth && Auth.client && Auth.client();
    if (!client || !ids.length) return out;
    var src = mod.table === 'employees' ? 'portal_employees' : mod.table;   /* the SAME door store.js reads through */
    for (var i = 0; i < ids.length; i += 50) {                                /* 50 per request — see readBaseColumns */
      var res = await client.from(src).select('*').in('id', ids.slice(i, i + 50));
      if (res.error) throw res.error;
      (res.data || []).forEach(function (row) { out[row.id] = row; });
    }
    /* الأعمدة الستة من الجدول الأصلي — للمقارنة قبل الكتابة وللتأكّد بعدها
       the six base-table columns — for the fresh compare before writing and the read-back after */
    if (mod.table === 'employees') {
      var rows = Object.keys(out).map(function (k) { return out[k]; });
      mergeBase(rows, await readBaseColumns(mod, rows.map(function (r) { return r.id; })));
    }
    return out;
  }

  /* «لم يُرسل»: السبب الحقيقي — انقطاع الاتصال فقط إن كان منقطعاً فعلاً
     "not sent": the TRUE reason — "connection dropped" only when it really is */
  function notSentWhy() {
    if (!Store.isOnline || !Store.isOnline() || navigator.onLine === false) {
      return L({ ar: 'لم يُرسل — انقطع الاتصال. أعد الاستيراد بنفس الملف بعد عودته (لن يتكرّر شيء).', en: 'not sent — the connection dropped. Import the same file again once back (nothing will be doubled).' });
    }
    return L({ ar: 'لم يُرسل — نسخة الشاشة لا تحمل هذا السجل. حدّث الصفحة وأعد الاستيراد (لن يتكرّر شيء).', en: 'not sent — the screen copy does not hold this record. Reload the page and import again (nothing will be doubled).' });
  }

  function plainRefusal(detail, mod) {
    var t = String(detail || '').toLowerCase();
    if (/record-changed-on-server/.test(t)) return L({ ar: 'تغيّر على الخادم أثناء الحفظ — لم يُكتب فوقه', en: 'changed on the server while saving — not overwritten' });
    /* شاشة بلا موقع ولا مشروع (التعميمات مثلاً): الرفض ليس «الموقع أو المشروع» — لا نقول ما ليس صحيحاً
       a screen with no site and no project (announcements, say): the refusal is not "the site or project" — never say what is not true */
    var placed = mod && (mod.fields || []).some(function (f) { return f.name === 'site' || f.name === 'project'; });
    if (/row-level security|permission|42501|not authorized|403/.test(t) && mod && !placed) return L({ ar: 'رفضته قاعدة البيانات: حسابك لا يملك الإضافة أو التعديل هنا في قاعدة البيانات، مع أن الشاشة تعرض الزر — أبلغ مسؤول النظام', en: 'refused by the database: your account may not add or change records here in the database, although the screen offers the button — tell the system administrator' });
    if (/row-level security|permission|42501|not authorized|403/.test(t)) return L({ ar: 'رفضته قاعدة البيانات: خارج صلاحيتك (غالباً الموقع أو المشروع)', en: 'refused by the database: outside your access (usually the site or project)' });
    if (/مستخدم بالفعل/.test(String(detail || ''))) return L({ ar: 'رفضته قاعدة البيانات: ', en: 'refused by the database: ' }) + String(detail).split(' — ')[0];
    if (/employees_code_unique|duplicate employee number/.test(t)) return L({ ar: 'رفضته قاعدة البيانات: الرقم الوظيفي مستخدم بالفعل لموظف آخر في الشركة — راجع مدير الموارد البشرية', en: 'refused by the database: the employee number is already used by another employee — ask the HR manager' });
    if (/duplicate|unique|23505/.test(t)) return L({ ar: 'رفضته قاعدة البيانات لأنه مكرر', en: 'refused by the database as a duplicate' });
    return L({ ar: 'رفضته قاعدة البيانات', en: 'refused by the database' }) + ' (' + String(detail || '').slice(0, 120) + ')';
  }

  async function save(state) {
    if (state.saving) return false;
    var mod = state.mod, a = state.analysis;
    if (state.approve && changesPrint(a) !== state.approvedPrint) {
      state.approve = false; state.approvedPrint = null; paint(state);
      UI.toast(L({ ar: 'تغيّرت التعديلات بعد موافقتك — راجعها وضع العلامة من جديد. لم يُحفظ شيء.', en: 'The changes differ from what you approved — review them and tick again. Nothing was saved.' }), 'error', 9000);
      return false;
    }
    var creates = a.newRows.slice(), updates = state.approve ? a.changes.slice() : [];
    if (!creates.length && !updates.length) return false;
    /* إعادة فحص وقت الحفظ · re-checked at save time, not trusted from the preview */
    if (!Store.isOnline || !Store.isOnline()) {
      UI.toast(L({ ar: 'الحفظ يحتاج اتصالاً بالإنترنت — لم يُحفظ أي شيء. أعد الاستيراد بعد عودة الاتصال.', en: 'Saving needs an internet connection — nothing was saved. Import again once you are online.' }), 'error', 9000);
      return false;
    }
    if (creates.length && !Auth.can(mod.id, 'create')) creates = [];
    if (updates.length && !Auth.can(mod.id, 'edit')) updates = [];
    state.saving = true;
    var snapHold = { release: function () {} };            /* armed INSIDE the guarded block below — never before it (bug-reporter, 11 Sept, finding 4) */
    var closeBtn = document.getElementById('modalClose'); if (closeBtn) closeBtn.hidden = true;
    /* أثناء الحفظ لا «إلغاء — لا يُحفظ شيء»: الكلام يصبح كذباً بعد أول كتابة
       while saving, no «Cancel — nothing is saved»: the words turn false after the first write */
    var footBtns = Array.prototype.slice.call(document.querySelectorAll('#modalFoot button'));
    footBtns.forEach(function (b) { b.disabled = true; });
    var started = new Date().toISOString();
    var out = { saved: [], mismatch: [], refused: [], conflict: [], pending: [], notSent: [], unconfirmed: [] };
    try {
      snapHold = holdSnapshots();                          /* one offline snapshot per batch — see holdSnapshots(); released in finally */
      /* ١ · التعديلات: قراءة طازجة من الخادم قبل الكتابة — لا نكتب فوق تغيير لم يره
         1 · updates: a FRESH server read before writing — never overwrite a change he did not see */
      var okUpdates = [];
      if (updates.length) {
        progress(L({ ar: 'نقرأ السجلات الموجودة من الخادم من جديد…', en: 'Re-reading the existing records from the server…' }));
        var fresh = await readServer(mod, updates.map(function (r) { return r.match.id; }));
        updates.forEach(function (r) {
          var s = fresh[r.match.id];
          if (!s) { out.refused.push({ r: r, why: L({ ar: 'لم يعد ظاهراً لك على الخادم', en: 'no longer visible to you on the server' }) }); return; }
          /* قيمة حالية لم نستطع إعادة قراءتها الآن (عمود من الستة والقراءة رُفضت أو انقطعت) → لا نكتب فوق ما لا نراه
             a current value we could not re-read now (one of the six, read refused or dropped) → never write over what we cannot see */
          var unseen = r.diff.filter(function (d) { return !(d.field.name in s); });
          if (unseen.length) {
            out.refused.push({ r: r, why: L({ ar: 'لم يُحفظ — تعذّرت إعادة قراءة القيمة الحالية لـ«' + unseen.map(function (d) { return lab(d.field.label); }).join('، ') + '» من الخادم الآن. أعد الاستيراد.',
                                              en: 'not saved — the current value of "' + unseen.map(function (d) { return lab(d.field.label); }).join(', ') + '" could not be re-read from the server just now. Import again.' }) });
            return;
          }
          var changed = String(s.updatedAt || '') !== String(r.match.updatedAt || '') ||
            r.diff.some(function (d) { return cmp(d.field, s[d.field.name]) !== cmp(d.field, d.before); });
          if (changed) { out.conflict.push({ r: r, why: L({ ar: 'عدّله شخص آخر بعد المعاينة — لم نكتب فوقه. أعد الاستيراد لترى القيم الجديدة.', en: 'someone else changed it after the preview — not overwritten. Import again to see the new values.' }) }); return; }
          r.fresh = s;
          okUpdates.push(r);
        });
      }
      /* 🔴 نسخة المتصفح يجب أن تكون نفس ما وافق عليه. قاسه وكيل الأخطاء: من
         عدّله غيره بعد فتح الصفحة كان يُرسل من نسخة المتصفح القديمة فترفضه
         القاعدة، ومن أُضيف بعد فتحها لم يكن في المتصفح أصلاً فيُقال «انقطع
         الاتصال». الحفظ يمرّ عبر Store.save (الباب المعتاد، بفحص «لم يتغيّر
         منذ»)؛ فإن اختلفت نسخة المتصفح عن الخادم نعيد قراءة البوابة مرة واحدة.
         🔴 The browser's copy must be what he approved. Measured by the bug-
         reporter: a record someone else edited after the page opened was sent
         from the OLD browser copy and refused; one added after the page opened
         was not in the browser at all and got "connection dropped". Saving goes
         through Store.save (the usual door, with its "unchanged since" check);
         if the browser copy differs from the server we re-read the portal once. */
      var stale = function (r) { var c = Store.find(mod.table, r.match.id); return !c || String(c.updatedAt || '') !== String(r.fresh.updatedAt || ''); };
      if (okUpdates.some(stale) && Store.reload) {
        progress(L({ ar: 'نحدّث نسخة الشاشة من الخادم قبل الكتابة…', en: 'Refreshing the screen copy from the server before writing…' }));
        try { await Store.reload(); } catch (e) { console.warn('[hr-import-review] reload before writing failed', e); }
      }
      okUpdates = okUpdates.filter(function (r) {
        if (!stale(r)) return true;
        out.refused.push({ r: r, why: L({ ar: 'لم يُحفظ — نسخة الشاشة قديمة ولم نستطع تحديثها. حدّث الصفحة وأعد الاستيراد (لن يتكرّر شيء).', en: 'not saved — the screen copy is out of date and could not be refreshed. Reload the page and import again (nothing will be doubled).' }) });
        return false;
      });
      /* ٢ · الكتابة · the writes */
      var written = [];
      creates.forEach(function (r, i) {
        var rec = Object.assign({}, r.rec);
        var w = Store.create(mod.table, rec);
        if (!w) { out.notSent.push({ r: r, why: notSentWhy() }); return; }
        written.push({ r: r, id: w.id, op: 'insert', fields: Object.keys(r.values) });
        if (i % 25 === 0) progress(L({ ar: 'نرسل ' + num(i + 1) + ' من ' + num(creates.length) + '…', en: 'Sending ' + (i + 1) + ' of ' + creates.length + '…' }));
      });
      okUpdates.forEach(function (r) {
        var patch = {};
        r.diff.forEach(function (d) { patch[d.field.name] = d.after; });   /* ONLY what changed — a blank never enters the patch */
        var w = Store.save(mod.table, r.match.id, patch);
        if (!w) { out.notSent.push({ r: r, why: notSentWhy() }); return; }
        written.push({ r: r, id: r.match.id, op: 'update', fields: Object.keys(patch) });
      });
      /* ٣ · انتظار الخادم · wait for the server to answer every write */
      var limit = Date.now() + Math.max(20000, written.length * 400);
      while (Store.pending() > 0 && Date.now() < limit && navigator.onLine !== false) {
        progress(L({ ar: 'ننتظر ردّ الخادم… باقٍ ' + num(Store.pending()), en: 'Waiting for the server… ' + Store.pending() + ' left' }));
        await sleep(250);
      }
      /* ٤ · التأكّد: قراءة جديدة من الخادم ومقارنة كل قيمة · confirm: a new server read, every value compared */
      progress(L({ ar: 'نتأكّد من الخادم أن كل قيمة حُفظت كما هي…', en: 'Confirming on the server that every value was saved as sent…' }));
      /* 🔴 انقطع الاتصال أثناء التأكّد؟ لا «حُفظ» ولا خطأ غامض: ما زال في
         طابور الجهاز = «في الانتظار» (يُرسل وحده عند عودة الاتصال)، والباقي
         = «لم نتأكّد» — ولا صفّ يُقال عنه حُفظ دون أن نقرأه من الخادم.
         🔴 The connection dropped while confirming? Neither "saved" nor a
         vague error: still in the device's queue = WAITING (sent by itself
         when the connection returns); the rest = NOT CONFIRMED — no row is
         called saved unless it was read back from the server. */
      var back = null;
      try { back = await readServer(mod, written.map(function (w) { return w.id; })); }
      catch (e) { back = null; out.readFailed = String(e && e.message || e); }
      if (!back) {
        written.forEach(function (w) {
          var local = Store.find(mod.table, w.id);
          if (local && local._syncState === 'pending') out.pending.push({ r: w.r, why: L({ ar: 'في الانتظار — انقطع الاتصال؛ سيُرسل تلقائياً عند عودته، ثم أعد الاستيراد للتأكّد (لن يتكرّر شيء)', en: 'waiting — the connection dropped; it will be sent automatically when it returns, then import again to confirm (nothing will be doubled)' }) });
          else out.unconfirmed.push({ r: w.r, why: L({ ar: 'أُرسل لكن لم نستطع قراءته من الخادم للتأكّد — أعد الاستيراد بعد عودة الاتصال (لن يتكرّر شيء)', en: 'sent, but could not be read back to confirm — import again once online (nothing will be doubled)' }) });
        });
        throw { handled: true };
      }
      var conflicts = (Store.conflicts ? Store.conflicts() : []).filter(function (c) { return c && c.job && c.job.table === mod.table && String(c.at || '') >= started; });
      written.forEach(function (w) {
        var s = back[w.id];
        /* رفضٌ مسجَّل لهذه الكتابة = «رُفض» بسببه، حتى لو كان السجل القديم ما زال
           على الخادم — لا «حُفظ بقيمة مختلفة» لشيء لم يُكتب (وكيل الأخطاء، البند ٤).
           a refusal logged for THIS write = «refused» with its reason, even when
           the old record is still on the server — never "saved with a different
           value" for something that was not written (bug-reporter, item 4). */
        var cf = conflicts.filter(function (x) { return x.job.id === w.id; })[0];
        if (cf) { out.refused.push({ r: w.r, why: plainRefusal(cf.detail, mod) }); return; }
        if (!s) {
          var c = conflicts.filter(function (x) { return x.job.id === w.id; })[0];
          var local = Store.find(mod.table, w.id);
          if (c) out.refused.push({ r: w.r, why: plainRefusal(c.detail, mod) });
          else if (local && local._syncState === 'pending') out.pending.push({ r: w.r, why: L({ ar: 'في الانتظار — لم يصل الخادم بعد؛ سيُرسل تلقائياً عند عودة الاتصال', en: 'waiting — not yet on the server; it will be sent automatically when the connection returns' }) });
          else out.refused.push({ r: w.r, why: L({ ar: 'لم نجده على الخادم بعد الحفظ', en: 'not found on the server after saving' }) });
          return;
        }
        var diffs = [], unreadable = [];
        w.fields.forEach(function (name) {
          var f = Schema.field(mod.id, name); if (!f) return;
          if (!(name in s)) { unreadable.push(lab(f.label)); return; }
          if (name === 'docNo' && mod.docPrefix) return;          /* the server issues the real number */
          var want = w.op === 'insert' ? w.r.values[name] : (w.r.diff.filter(function (d) { return d.field.name === name; })[0] || {}).after;
          if (cmp(f, s[name]) !== cmp(f, want)) diffs.push(lab(f.label) + ': ' + show(f, want) + ' → ' + show(f, s[name]));
        });
        var entry = { r: w.r, id: w.id, op: w.op, server: s, unreadable: unreadable };
        if (diffs.length) { entry.why = L({ ar: 'حُفظ لكن الخادم يحمل قيمة مختلفة: ', en: 'saved, but the server holds a different value: ' }) + diffs.join(' · '); out.mismatch.push(entry); }
        else out.saved.push(entry);
      });
    } catch (e) {
      if (!(e && e.handled)) { console.error('[hr-import-review] save', e); out.error = String(e && e.message || e); }
    } finally {
      snapHold.release();                                 /* the single snapshot for the whole batch */
      state.saving = false;
      if (closeBtn) closeBtn.hidden = false;
      footBtns.forEach(function (b) { b.disabled = false; });
    }
    /* 🔴 نعيد قراءة البوابة من الخادم بعد الحفظ، ثم نرسم الشاشة.
       عطل قائم اليوم (مُثبت على النسخة الأصلية بلا ملفاتنا — t6): ردّ
       الخادم على الحفظ يحمل موقع الموظف، ومرشِّح المواقع في المتصفح يظنّ
       خطأً أن مدير الموارد البشرية لا يرى إلا الخلاطة — فيختفي موظف
       الروبيكي الذي عُدِّل للتوّ من قائمته حتى يُحدِّث الصفحة. القراءة
       الكاملة من الخادم (Store.reload، الواجهة العامة نفسها التي يستعملها
       الدخول) تعيد القائمة كما يعطيها الخادم. السبب الأصلي يخصّ ROBOT-2.
       🔴 Re-read the portal from the server after saving, then redraw.
       A PRE-EXISTING fault (reproduced on the untouched copy — t6): the
       server's answer to a save carries the employee's site, and the
       browser's site filter wrongly believes the HR manager sees only
       الخلاطة — so an Elrobaki employee just changed VANISHES from his list
       until he reloads the page. A full re-read (Store.reload — the same
       public call login uses) puts the list back as the server gives it.
       The root cause belongs to ROBOT-2. */
    try { if (Store.reload && (out.saved.length || out.mismatch.length)) await Store.reload(); } catch (e) { console.warn('[hr-import-review] reload after save failed', e); }
    setTimeout(function () { showResults(state, out); }, 60);
    if (global.App && App.refresh) try { App.refresh(); } catch (e) { /* ignore */ }
    return true;
  }

  function showResults(state, out) {
    var mod = state.mod;
    var keyCols = keyColumnsFor(mod, state.cfg);
    var label = function (r) {
      return keyCols.map(function (k) { var f = Schema.field(mod.id, k); var v = r.values[k] !== undefined ? r.values[k] : (r.match ? r.match[k] : ''); return f ? show(f, v) : ''; }).filter(function (x) { return x && x !== '—'; }).join(' · ');
    };
    var rows = function (list, color) {
      return list.map(function (x) {
        return '<tr><td class="num">' + num(x.r.n) + '</td><td>' + esc(label(x.r)) + '</td><td class="small"' + (color ? ' style="color:' + color + '"' : '') + '>' +
          esc(x.why || (x.op === 'update' ? L({ ar: 'عُدِّل وتأكّدنا من الخادم', en: 'changed and confirmed on the server' }) : L({ ar: 'أُنشئ وتأكّدنا من الخادم', en: 'created and confirmed on the server' }))) +
          (x.unreadable && x.unreadable.length ? '<br><span class="muted">' + esc(L({ ar: 'كُتب ولا تعرضه البوابة فلا يمكن قراءته للتأكّد: ', en: 'written, but the portal does not show it so it cannot be read back: ' }) + x.unreadable.join('، ')) + '</span>' : '') + '</td></tr>';
      }).join('');
    };
    var bad = out.refused.length + out.conflict.length + out.pending.length + out.notSent.length + out.mismatch.length + out.unconfirmed.length;
    var head = '<div id="hxResult" data-saved="' + out.saved.length + '" data-mismatch="' + out.mismatch.length + '" data-refused="' + out.refused.length + '" data-conflict="' + out.conflict.length + '" data-pending="' + out.pending.length + '" data-notsent="' + out.notSent.length + '" data-unconfirmed="' + out.unconfirmed.length + '" data-error="' + esc(out.error || '') + '" class="alert ' + (bad || out.error ? 'alert-warn' : 'alert-info') + '" style="display:block"><strong>' +
      esc(L({ ar: '✓ حُفظ وتأكّدنا منه على الخادم: ', en: '✓ Saved and confirmed on the server: ' })) + num(out.saved.length) + '</strong>' +
      (out.mismatch.length ? ' · ' + esc(L({ ar: 'حُفظ بقيمة مختلفة: ', en: 'saved with a different value: ' })) + num(out.mismatch.length) : '') +
      (out.refused.length ? ' · <span style="color:#b42318">' + esc(L({ ar: 'رُفض: ', en: 'refused: ' })) + num(out.refused.length) + '</span>' : '') +
      (out.conflict.length ? ' · ' + esc(L({ ar: 'تعارض (لم نكتب فوقه): ', en: 'conflict (not overwritten): ' })) + num(out.conflict.length) : '') +
      (out.pending.length ? ' · ' + esc(L({ ar: 'في الانتظار: ', en: 'waiting: ' })) + num(out.pending.length) : '') +
      (out.notSent.length ? ' · ' + esc(L({ ar: 'لم يُرسل: ', en: 'not sent: ' })) + num(out.notSent.length) : '') +
      (out.unconfirmed.length ? ' · ' + esc(L({ ar: 'لم نتأكّد: ', en: 'not confirmed: ' })) + num(out.unconfirmed.length) : '') +
      '<br>' + esc(L({ ar: 'تجدها الآن في: ', en: 'Find them now in: ' }) + lab(state.cfg.where)) +
      (out.error ? '<br><span style="color:#b42318">' + esc(L({ ar: 'توقّف الحفظ بخطأ: ', en: 'Saving stopped with an error: ' }) + out.error) + '</span>' : '') + '</div>';
    var table = function (title, list, color) {
      if (!list.length) return '';
      return '<h4 style="margin:10px 0 4px">' + esc(title) + ' (' + num(list.length) + ')</h4><div class="table-wrap" style="max-height:240px;overflow:auto"><table class="data-table"><thead><tr><th>' +
        esc(L({ ar: 'صف', en: 'Row' })) + '</th><th>' + esc(L({ ar: 'السجل', en: 'Record' })) + '</th><th>' + esc(L({ ar: 'النتيجة', en: 'Result' })) + '</th></tr></thead><tbody>' + rows(list, color) + '</tbody></table></div>';
    };
    state.lastResult = out;
    UI.modal({
      title: L({ ar: 'نتيجة الاستيراد — ' + lab(mod.label), en: 'Import result — ' + lab(mod.label) }),
      size: 'wide',
      body: head + table(L({ ar: '✗ رُفض', en: '✗ Refused' }), out.refused, '#b42318') + table(L({ ar: '⚠ تعارض — لم نكتب فوقه', en: '⚠ Conflict — not overwritten' }), out.conflict, '#8a6100') +
        table(L({ ar: '⏳ في الانتظار', en: '⏳ Waiting' }), out.pending, '#8a6100') + table(L({ ar: '⛔ لم يُرسل', en: '⛔ Not sent' }), out.notSent, '#b42318') +
        table(L({ ar: '≠ حُفظ بقيمة مختلفة', en: '≠ Saved with a different value' }), out.mismatch, '#8a6100') + table(L({ ar: '？ لم نتأكّد', en: '? Not confirmed' }), out.unconfirmed, '#8a6100') + table(L({ ar: '✓ حُفظ وتأكّدنا منه', en: '✓ Saved and confirmed' }), out.saved, null),
      buttons: [
        { label: L({ ar: '⬇ النتيجة كملف إكسل', en: '⬇ Result as Excel' }), cls: 'btn-outline', keepOpen: true, onClick: function () { downloadResult(state, out); return false; } },
        { label: L({ ar: 'تمام', en: 'OK' }), cls: 'btn-primary' }
      ]
    });
    hideAttachShortcut();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · ملفّا المراجعة والنتيجة · the review and result workbooks
     ═══════════════════════════════════════════════════════════════════ */
  function downloadReview(state) {
    if (!global.XlsxWriter) return;
    var a = state.analysis, mod = state.mod, keyCols = keyColumnsFor(mod, state.cfg);
    var clsName = { 'new': L({ ar: 'جديد', en: 'new' }), change: L({ ar: 'تعديل', en: 'change' }), same: L({ ar: 'بلا تغيير', en: 'unchanged' }), invalid: L({ ar: 'لن يُحفظ', en: 'will not be saved' }) };
    var rows = a.results.map(function (r) {
      var key = keyCols.map(function (k) { var f = Schema.field(mod.id, k); return f ? show(f, r.values[k] !== undefined ? r.values[k] : (r.match ? r.match[k] : '')) : ''; }).join(' · ');
      var detail = r.cls === 'change' ? r.diff.map(function (d) { return lab(d.field.label) + ': ' + show(d.field, d.before) + ' ← ' + show(d.field, d.after); }).join(' | ')
        : r.cls === 'invalid' ? r.errors.join(' | ') : (r.note || '');
      return [r.n, key, clsName[r.cls] || '', detail, r.warnings.join(' | ')];
    });
    XlsxWriter.download(XlsxWriter.build({ title: 'review', sheets: [{ name: L({ ar: 'المراجعة', en: 'Review' }),
      columns: [{ header: L({ ar: 'صف الملف', en: 'File row' }), type: 'integer', width: 9 }, { header: L({ ar: 'السجل', en: 'Record' }), type: 'text', width: 34 },
        { header: L({ ar: 'التصنيف', en: 'Class' }), type: 'text', width: 14 }, { header: L({ ar: 'التفاصيل', en: 'Details' }), type: 'wrap', width: 70 },
        { header: L({ ar: 'تنبيهات', en: 'Warnings' }), type: 'wrap', width: 40 }], rows: rows }] }),
      L({ ar: 'مراجعة-استيراد-', en: 'import-review-' }) + mod.id);
  }
  function downloadResult(state, out) {
    if (!global.XlsxWriter) return;
    var mod = state.mod, keyCols = keyColumnsFor(mod, state.cfg), rows = [];
    var add = function (list, what) {
      list.forEach(function (x) {
        var key = keyCols.map(function (k) { var f = Schema.field(mod.id, k); return f ? show(f, x.r.values[k] !== undefined ? x.r.values[k] : (x.r.match ? x.r.match[k] : '')) : ''; }).join(' · ');
        rows.push([x.r.n, key, what, x.why || '']);
      });
    };
    add(out.saved, L({ ar: 'حُفظ وتأكّد', en: 'saved + confirmed' })); add(out.mismatch, L({ ar: 'حُفظ بقيمة مختلفة', en: 'saved, value differs' }));
    add(out.refused, L({ ar: 'رُفض', en: 'refused' })); add(out.conflict, L({ ar: 'تعارض', en: 'conflict' }));
    add(out.pending, L({ ar: 'في الانتظار', en: 'waiting' })); add(out.notSent, L({ ar: 'لم يُرسل', en: 'not sent' })); add(out.unconfirmed, L({ ar: 'لم نتأكّد', en: 'not confirmed' }));
    rows.sort(function (x, y) { return x[0] - y[0]; });
    XlsxWriter.download(XlsxWriter.build({ title: 'result', sheets: [{ name: L({ ar: 'النتيجة', en: 'Result' }),
      columns: [{ header: L({ ar: 'صف الملف', en: 'File row' }), type: 'integer', width: 9 }, { header: L({ ar: 'السجل', en: 'Record' }), type: 'text', width: 34 },
        { header: L({ ar: 'النتيجة', en: 'Result' }), type: 'text', width: 18 }, { header: L({ ar: 'السبب', en: 'Reason' }), type: 'wrap', width: 70 }], rows: rows }] }),
      L({ ar: 'نتيجة-استيراد-', en: 'import-result-' }) + mod.id);
  }

  install();
  [0, 300, 1200].forEach(function (ms) { setTimeout(install, ms); });
  global.HRImportReview = { analyze: analyze, open: openReview, readValue: readValue, _save: save };
  console.info('hr-import-review.js ready — HR imports get one review, batch-approved changes and a server-confirmed result.');
})(window);
