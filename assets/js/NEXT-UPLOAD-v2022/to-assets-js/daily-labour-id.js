/* =========================================================================
   daily-labour-id.js — الرقم القومي إجباري لكل عامل في كشف العمالة اليومية،
                         ويظهر آخر ٤ أرقام فقط في القوائم والطباعة
   Compulsory national ID for every worker on the daily-labour sheet, and
   the ID is shown as its last 4 digits only in lists and on paper.
   -------------------------------------------------------------------------
   العلّة، بكلام يفهمه أي أحد
   ---------------------------
   من الاثنين يبدأ مهندسو المواقع يملأون كشف العمالة اليومية. اليوم يمكن
   حفظ صف عامل بلا رقم قومي، والكشف يُعتمد ويُصرف رغم ذلك. بعد أسابيع، صفّاً
   يقول «أحمد محمد · ٣٥٠ جنيه» لا يمكن ربطه بأي شخص فعلي — ولا رجوع، لأن من
   كتبه انصرف من الموقع. في المقابل، نفس الشاشة تعرض الرقم القومي كاملاً
   (١٤ رقماً) لمهندس الموقع ومدير المشروع والمحاسب — لا أحد منهم ضمن قائمة
   «مسموح له برؤية الأرقام القومية» في الصلاحيات.

   The problem, in plain words
   ----------------------------
   From Monday, site engineers fill the daily labour sheet. Today a worker
   row can be saved with the national-ID box empty, and the sheet still
   gets approved and paid. Weeks later a row cannot be matched to any real
   person, and the person who typed it has gone home — there is no way
   back. At the same time this is the one screen that shows every worker's
   full 14-digit ID to roles that hold no "may see national IDs" permission
   at all: site engineer, project manager, accountant.

   لماذا ملف جديد منفصل، لا تعديل على hr-department.js
   -----------------------------------------------------
   قاعدة المشروع: أي سلوك جديد يذهب لملف إضافي يلفّ الملفات القائمة. حذف
   هذا الملف وحده يُعيد سلوك اليوم تماماً — لا إجبار على الرقم القومي، ولا
   إخفاء آخر ٤ أرقام. لا شيء هنا يُعدَّل في hr-department.js أو entity.js
   أو schema.js أو auth.js.

   Why a separate new file, not an edit to hr-department.js
   -----------------------------------------------------------
   House rule: new behaviour goes into an additive file wrapping the
   existing ones. Deleting this file alone restores today's behaviour
   exactly — no ID requirement, no last-4 masking. Nothing here edits
   hr-department.js, entity.js, schema.js or auth.js.

   ⚠️ العطل الصامت الأول الذي يمنعه هذا الملف — required:true على حقل سطر
   لا يفعل شيئاً إطلاقاً
   -----------------------------------------------------------------------
   nationalId هنا حقل **سطر** (داخل lines.fields، hr-department.js:348)،
   وثلاث آليات هي كل ما يفحص required في هذا المشروع، وكلّها تفحص
   mod.fields فقط ولا تنظر إلى mod.lines.fields أبداً:
     · pages/entity.js:792 (زر حفظ عادي)
     · import.js:755-762 (فحص الاستيراد)
     · save-modes.js:52-59 withoutRequired (زرَّا مسودة/مسودة حتى الاتصال)
   فكتابة required:true على هذا الحقل كانت ستُترك الصندوق يُحفَظ فارغاً
   دائماً — بلا أي خطأ، بلا تحذير، كل الاختبارات القديمة تبقى خضراء. الآلية
   الوحيدة التي تعمل فعلاً هي mod.lines.validate (entity.js:810-813 عند كل
   حفظ، وentity.js:437-441 عند الإرسال فقط) — وهي ما نُثبّته أدناه.

   🔴 SILENT NO-OP #1, which this file avoids — `required:true` on a LINE
   field does nothing at all
   -----------------------------------------------------------------------
   nationalId here is a LINE field (inside lines.fields), and every
   `required` check in the portal reads `mod.fields` only, never
   `mod.lines.fields`: entity.js:792 (the normal Save button),
   import.js:755-762 (the import's own check), and save-modes.js:52-59
   `withoutRequired` (the Draft / Draft-until-connected buttons). Writing
   `required:true` on this field would leave the box saveable empty
   forever — silently, no error, every existing test still green. The one
   hook that IS honoured for line fields is `mod.lines.validate`
   (entity.js:810-813 on every Save, entity.js:437-441 on Submit only) —
   that is what this file installs.

   ⚠️ العطل الصامت الثاني — استثناء مبني على createdAt وحده يُعفي كل سجل
   جديد بلا استثناء
   -----------------------------------------------------------------------
   store.js:377-392 يختم createdAt داخل Store.create، أي **بعد** أن يُنفَّذ
   validate. فأي مسودة جديدة (قبل أول حفظ) ليس لها createdAt إطلاقاً. لو
   بُني الاستثناء على "createdAt موجود ⇐ سجل قديم" وحده، لكان كل سجل جديد
   بلا createdAt يُعفى تلقائياً من الشرط — وهو عكس المطلوب تماماً. لذلك
   الاستثناء هنا يُختبر أولاً بوجود draft.id (لا يوجد إلا لسجل محفوظ من
   قبل)، ثم بعمر createdAt إن وُجد.

   🔴 SILENT NO-OP #2, which this file avoids — an exemption keyed on
   `createdAt` alone would wave through every brand-new record
   -----------------------------------------------------------------------
   store.js:377-392 stamps `createdAt` inside `Store.create`, i.e. AFTER
   `validate` runs. A brand-new draft (before its first save) has no
   `createdAt` at all. An exemption reading "createdAt present ⇒ old
   record" would therefore exempt every new record — the opposite of the
   intent. The exemption below tests `draft.id` FIRST (only a previously
   saved record has one), and only then looks at the age of `createdAt`.

   🔴 الفخّ الذي يجب عدم الوقوع فيه — auth.js Auth.SENSITIVE
   -------------------------------------------------------------------
   إضافة dailyLabour إلى Auth.SENSITIVE تبدو "الإصلاح الصحيح" لجزء
   الخصوصية — وهي تُتلف البيانات. Auth.maskRecord (auth.js:973-978) يضع
   null في المفتاح المذكور، وStore.save (store.js:398) يعيد بناء السجل
   بـ Object.assign({}, original, patch) حيث clean() يُبقي null كما هو —
   وهي نفس الآلية التي محت تسعة أعمدة موظف في ٢٨ أغسطس. المفتاح الوحيد
   القابل للإخفاء هنا هو lines نفسه — أي تعديل واحد من مهندس موقع سيمحو
   كل عمال الكشف دفعة واحدة. لهذا لا يُلمس auth.js هنا إطلاقاً، والإخفاء
   المطبَّق هو عرضي فقط (آخر ٤ أرقام)، وليس أمنياً حقيقياً.

   🔴 THE TRAP THIS FILE DOES NOT WALK INTO — `Auth.SENSITIVE`
   -------------------------------------------------------------------
   Adding `dailyLabour` to `Auth.SENSITIVE` looks like the "real" privacy
   fix. It would destroy data: `Auth.maskRecord` (auth.js:973-978) sets
   the listed key to `null`, and `Store.save` (store.js:398) rebuilds the
   record with `Object.assign({}, original, patch)`, where `clean()` keeps
   `null` — the exact mechanism that erased nine employee columns on
   28 August. The only maskable key here is `lines` itself — one edit by
   a site engineer would blank every worker on the sheet. `auth.js` is not
   touched here at all; the masking below is a DISPLAY convenience (last 4
   digits) only, never a security control.

   حدود صادقة يجب قولها، لا إخفاؤها
   -----------------------------------
   · الإخفاء هنا عرضي لا أمني: الرقم الكامل يبقى في السجل داخل المتصفح
     وفي استجابة الشبكة. حماية حقيقية تحتاج قاعدة البيانات نفسها تمتنع عن
     إرسال الرقم لهذه الأدوار — وهذا مسار مغلق حالياً (انظر
     .claude/rules/database.md:62-88: عرض يُرجع null يُمحى عند أول حفظ).
   · مسار الاستيراد غير مغطّى ولا يمكن تغطيته هنا: import.js لا يعرف شيئاً
     عن lines إطلاقاً (mapColumns يبني قائمته من mod.fields فقط)، فاستيراد
     كشف عمالة يومية ينتج رأساً بلا عمال إطلاقاً — عطل قائم من قبل، مسجَّل
     في ROADMAP.md، خارج نطاق هذا الملف تماماً.

   Honest limits, stated not hidden
   -----------------------------------
   · The mask is DISPLAY-only, not a security control: the full ID still
     lives in the record inside the browser and in the network response.
     Real protection needs the database itself to stop sending the value
     to these roles — a route that is closed today (see
     .claude/rules/database.md:62-88: a masking view returning null gets
     erased on the next save).
   · The import path is not covered and cannot be covered here: import.js
     has no concept of `lines` at all (`mapColumns` builds its candidate
     list from `mod.fields` only), so importing a daily-labour sheet
     produces a header with zero workers. Pre-existing gap, logged to
     ROADMAP.md, out of scope for this file.
   ========================================================================= */
(function (global) {
  'use strict';

  /* لو schema.js أو ui.js لم يُحمَّلا بعد (ترتيب تحميل خاطئ) لا يوجد شيء
     نلفّه — نفشل بصمت بدل أن نكسر الصفحة، بنفس نمط number-decimals.js
     وcalc-formulas.js. If schema.js or ui.js has not loaded yet (a
     load-order mistake) there is nothing to hook — fail silently rather
     than break the page, the same guard shape as number-decimals.js and
     calc-formulas.js. */
  if (typeof global === 'undefined' || !global.Schema || typeof global.Schema.get !== 'function') return;
  if (!global.UI || typeof global.UI.displayValue !== 'function') return;

  var Schema = global.Schema;

  var DAILY = Schema.get('dailyLabour');
  /* الشاشة نفسها غير موجودة (فُصلت أو أُعيدت تسمية) — لا شيء نحمي، توقّف
     بصمت. The screen itself is missing (removed or renamed) — nothing to
     protect, stop quietly. */
  if (!DAILY || !DAILY.lines || !Array.isArray(DAILY.lines.fields)) return;

  var idField = null;
  DAILY.lines.fields.forEach(function (f) { if (f.name === 'nationalId') idField = f; });
  /* الحقل نفسه غير موجود على الشاشة — لا شيء نحمي. The field itself is
     not on the screen — nothing to protect. */
  if (!idField) return;

  /* عمر الحقل — قبل أي تعديل عليه، لرسائل الرفض لاحقاً (بلا نجمة الإلزام).
     Snapshot the label BEFORE mutating it, for the refusal message later
     (without the compulsory asterisk). */
  var originalLabelAr = (idField.label && idField.label.ar) || 'الرقم القومي';
  var originalLabelEn = (idField.label && idField.label.en) || 'National ID';

  /* اليوم الذي يبدأ فيه مهندسو المواقع — كل ما كُتب قبله معفى للأبد، وكل
     صف عمالة حقيقي من الاثنين فصاعداً يجب أن يحمل رقماً قومياً.
     The day site engineers start — everything typed before it is
     grandfathered forever; every real wage row from Monday on must carry
     an ID. */
  var CUTOFF = '2026-09-01';

  /* ═══════════════════════════════════════════════════════════════════
     ١ · علامة الحقل — للعرض (آخر ٤ أرقام) وللعنوان (نجمة الإلزام) معاً
        الاستخدام الشرعي الوحيد لعلم required هنا هو توثيقي: entity.js
        (٧٩٢)، وimport.js (٧٥٥-٧٦٢)، وsave-modes.js (٥٢-٥٩) كلها تقرأ
        mod.fields فقط ولا تلمس حقول السطر، فالعلم بلا أي أثر إنفاذي أو
        بصري هنا — أُثبت بقراءة renderLines (entity.js:677-693): لا تفحص
        f.required إطلاقاً لحقول السطر. لذلك النجمة المرئية تُضاف يدوياً
        إلى نص العنوان بدل الاعتماد على العلم.
     ═══════════════════════════════════════════════════════════════════
     1 · Tag the field — for display (last-4) and for the label asterisk
        The only legitimate use of `required` here is documentation:
        entity.js:792, import.js:755-762 and save-modes.js:52-59 all read
        `mod.fields` only and never touch line fields, so the flag has no
        enforcing or visual effect here — proven by reading `renderLines`
        (entity.js:677-693), which never checks `f.required` for line
        fields at all. So the visible asterisk is added to the label text
        by hand instead of relying on the flag. */
  idField.required = true; /* توثيقي بحت — بلا أثر، انظر الشرح أعلاه */
  idField.label = { ar: originalLabelAr + ' *', en: originalLabelEn + ' *' };

  /* علامة خاصة للفافة UI.displayValue أدناه — تُطابَق بهوية الكائن، لا
     بالاسم، لأن nationalId موجود أيضاً على شاشة الموظفين (schema.js:958)
     وهو كائن مختلف تماماً (F() هناك دالة أخرى). المطابقة بالاسم كانت
     ستُخفي الرقم القومي في شاشة الموظفين أيضاً — تغيير نطاق لم يطلبه
     المالك. A private marker for the UI.displayValue wrapper below —
     matched by OBJECT IDENTITY, never by name, because `nationalId` also
     exists on the employees screen (schema.js:958) as a completely
     different object (a separate `F()` there). Matching by name would
     silently mask the employees screen too — a scope change nobody
     asked for. */
  idField._maskLast4 = true;

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · هل هذا صف عامل حقيقي؟
        entity.js:512 يدفع دائماً صفاً فارغاً واحداً في كشف جديد، وblankLine
        (entity.js:548-552) يملأ days:1 من افتراض الحقل — فـ"الأيام تساوي
        ١" ليس دليلاً على عامل أبداً. الدليل الحقيقي: اسم غير فارغ أو
        يومية غير صفرية.
     ═══════════════════════════════════════════════════════════════════
     2 · Is this a real worker row?
        entity.js:512 always pushes one blank row into a new sheet, and
        `blankLine` (entity.js:548-552) fills `days:1` from the field
        default — so "days equals 1" is never evidence of a worker. Real
        evidence: a non-blank name, or a non-zero day rate. */
  function isWorkerRow(line) {
    if (!line) return false;
    var name = line.workerName;
    var hasName = name !== undefined && name !== null && String(name).trim() !== '';
    var rate = Number(line.dayRate);
    var hasRate = !isNaN(rate) && rate !== 0;
    return hasName || hasRate;
  }

  function isBlankId(v) {
    return v === undefined || v === null || String(v).trim() === '';
  }

  /* أرقام عربية للتنبيه — نفس النمط المستعمَل في agents.js/cash-forecast.js
     Arabic-Indic digits for the toast — the same pattern already used in
     agents.js / cash-forecast.js. */
  function arDigits(n) {
    try { return Number(n).toLocaleString('ar-EG'); } catch (e) { return String(n); }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · تلوين الصناديق الحمراء داخل نموذج التعديل المفتوح
        صفوف الجدول <tr data-li="i"> داخل #linesWrap (entity.js:687)،
        والصندوق نفسه يحمل name="nationalId" (entity.js:761/764 عبر
        lineInput). إضافة input-error هنا هي بالضبط ما يجعل مراقب
        screen-behaviour.js (٢٧٠-٢٩٠) يمرّر الشاشة إلى أول صندوق أحمر —
        يجب إثباته بالتشغيل، لا بهذه الفقرة (تجربة B2).
        لا نفعل شيئاً إن كان #linesWrap غير موجود (مثلاً عند الإرسال من
        شاشة التفاصيل، لا نموذج التعديل) — بحث بلا نتيجة، بلا عطل.
     ═══════════════════════════════════════════════════════════════════
     3 · Colour the red boxes inside the currently-open edit form
        Table rows are `<tr data-li="i">` inside `#linesWrap`
        (entity.js:687), and the box itself carries `name="nationalId"`
        (entity.js:761/764 via `lineInput`). Adding `input-error` here is
        exactly what makes screen-behaviour.js's observer (270-290) scroll
        the screen to the first red box — must be proven by running it,
        not by this paragraph (trial B2). A no-op, not an error, when
        `#linesWrap` does not exist (e.g. Submit fired from the detail
        screen, not the edit form). */
  function markBadRows(rowNumbers) {
    if (typeof document === 'undefined') return;
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return;
    rowNumbers.forEach(function (rowNum) {
      var idx = rowNum - 1;
      var tr = wrap.querySelector('[data-li="' + idx + '"]');
      if (!tr) return;
      var input = tr.querySelector('[name="' + idField.name + '"]');
      if (input && input.classList) input.classList.add('input-error');
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · نص الرفض — يسمّي الصندوق والصفوف، أول خمسة ثم "وكذا صفاً آخر"
     ═══════════════════════════════════════════════════════════════════
     4 · The refusal text — names the box and the rows, first five then
        "and N more" */
  function buildRefusal(rowNumbers) {
    var MAX_LISTED = 5;
    var shown = rowNumbers.slice(0, MAX_LISTED);
    var extra = rowNumbers.length - shown.length;

    var arList = shown.map(arDigits).join('، ');
    var enList = shown.join(', ');
    var arMore = extra > 0 ? (' و' + arDigits(extra) + ' صفاً آخر') : '';
    var enMore = extra > 0 ? (' and ' + extra + ' more') : '';

    return {
      ar: '«' + originalLabelAr + '» مطلوب لكل عامل — الصفوف: ' + arList + arMore,
      en: '"' + originalLabelEn + '" is required for every worker — rows: ' + enList + enMore
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · القاعدة الإلزامية — تُثبَّت على mod.lines.validate
        الآلية الوحيدة المُنفَّذة فعلاً لحقول السطر (§ أعلاه). تُستدعى في
        موضعين حقيقيين فقط:
          entity.js:810-813  عند كل حفظ (بما فيها مسودة/مسودة حتى الاتصال)
          entity.js:437-441  عند "إرسال" فقط (على السجل المخزَّن)
        لا validate موجود اليوم على dailyLabour.lines (تحقّقنا بالقراءة)،
        لكن نُسلسل مع أي واحد قد يُضاف لاحقاً بدل استبداله — تأمين رخيص.
     ═══════════════════════════════════════════════════════════════════
     5 · The compulsory rule — installed on `mod.lines.validate`
        The one mechanism actually honoured for line fields (see the file
        header). Called from exactly two real places: entity.js:810-813
        on every Save (including Draft / Draft-until-connected), and
        entity.js:437-441 on Submit only (against the STORED record). No
        `validate` exists on `dailyLabour.lines` today (confirmed by
        reading the source), but we chain to any future one instead of
        replacing it — cheap insurance. */
  var previousValidate = (typeof DAILY.lines.validate === 'function') ? DAILY.lines.validate : null;

  DAILY.lines.validate = function (record) {
    if (previousValidate) {
      var prevErr = previousValidate(record);
      if (prevErr) return prevErr;
    }

    /* مسودة / مسودة حتى الاتصال معفاتان — نفس الإعفاء الذي يناله أي صندوق
       إلزامي آخر عبر withoutRequired (save-modes.js:52-59). رفض هنا بينما
       «التاريخ» نفسه معفى كان سيبدو تعسفياً للموظف الذي يضغط الزر.
       Draft / Draft-until-connected are waived — the same waiver every
       other compulsory box already gets via `withoutRequired`
       (save-modes.js:52-59). Refusing here while "date" itself is waived
       would look arbitrary to the person pressing the button. */
    if (global.SaveModes && typeof global.SaveModes.mode === 'function' && global.SaveModes.mode() !== 'normal') {
      return null;
    }

    /* إعفاء السجلات القديمة بعمرها — draft.id أولاً (لا يوجد إلا لسجل
       محفوظ من قبل، أي لا يُعفي أي سجل جديد أبداً)، ثم عمر createdAt إن
       وُجد. غياب createdAt تماماً (سجل قديم/مجهول) يُعفى أيضاً — الفشل هنا
       "مفتوح" عمداً: "سجل قديم يصبح غير قابل للتعديل" أسوأ من "صف قديم
       واحد يفوت الفحص". انظر SILENT NO-OP #2 أعلى الملف لسبب عدم الاكتفاء
       بـ createdAt وحده.
       Exempt old records by age — `draft.id` first (only a previously
       saved record has one, so this never exempts a brand-new record),
       then the age of `createdAt` if it exists. A record with NO
       `createdAt` anywhere (genuinely old / unknown) is exempt too —
       deliberately fail-open: "an old record becomes uneditable" is worse
       than "one old row slips past the check". See SILENT NO-OP #2 at the
       top of the file for why `createdAt` alone is never enough. */
    if (record && record.id) {
      var stored = (global.Store && typeof global.Store.find === 'function')
        ? global.Store.find('dailyLabour', record.id) : null;
      var storedCreatedAt = (stored && stored.createdAt) || record.createdAt || null;
      if (!storedCreatedAt || storedCreatedAt < CUTOFF) return null;
    }

    var lines = (record && record.lines) || [];
    var badRows = [];
    lines.forEach(function (line, i) {
      if (!isWorkerRow(line)) return;
      if (isBlankId(line.nationalId)) badRows.push(i + 1);
    });

    if (!badRows.length) return null;

    markBadRows(badRows);
    return buildRefusal(badRows);
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · عرض آخر ٤ أرقام فقط — اللفافة الثالثة على UI.displayValue
        الترتيب في loader.js: ui.js ← number-decimals.js ← calc-formulas.js
        ← هذا الملف، فهذه اللفافة هي الأخيرة (الأخارجية) وتلتقط كل الحالات
        التي لا تخصّها إلى ما قبلها بلا تغيير. تُغطّي المكانين الوحيدين
        اللذين يُعرَض فيهما هذا الحقل (workerName لا يقرأه ملف آخر إطلاقاً):
          pages/entity.js:362  جدول العمال داخل الكشف المفتوح
          print.js:222         الكشف المطبوع
        نموذج التعديل لا يمرّ من هنا إطلاقاً — lineInput (entity.js:738-764)
        يكتب القيمة الخام في <input> مباشرة، فيرى من يكتب رقمه الكامل دائماً.
     ═══════════════════════════════════════════════════════════════════
     6 · Show only the last 4 digits — the THIRD wrapper on
        `UI.displayValue`
        loader.js order: ui.js ← number-decimals.js ← calc-formulas.js ←
        this file, so this wrapper is the outermost and passes everything
        that is not ours straight to the one before it, unchanged. This
        covers the only two places this field is ever displayed
        (`workerName` is read by no other file at all):
          pages/entity.js:362  the worker table inside the open sheet
          print.js:222         the printed sheet
        The edit form never goes through here — `lineInput`
        (entity.js:738-764) writes the raw value straight into an
        `<input>`, so the person typing always sees the full number. */
  var originalDisplayValue = global.UI.displayValue;

  global.UI.displayValue = function (f, rec) {
    if (f && f._maskLast4) {
      var v = rec ? rec[f.name] : undefined;
      if (v === undefined || v === null || v === '') return '—';
      var s = String(v);
      /* أربعة أحرف أو أقل: تُعرض كاملة خلف النقاط — لا شيء يُكشَف زيادة،
         ولا شيء يُخفى كان ظاهراً من قبل أصلاً. Four characters or fewer:
         shown in full behind the dots — nothing extra is revealed, and
         nothing is hidden that was not already short. */
      var shown = s.length <= 4 ? s : s.slice(-4);
      return '<span class="num">····' + global.UI.esc(shown) + '</span>';
    }
    /* كل حقل آخر (بما فيه nationalId على شاشة الموظفين) يمرّ دون أي تغيير
       إلى اللفافة السابقة. Every other field (including `nationalId` on
       the employees screen) passes straight through to the wrapper
       before this one, unchanged. */
    return originalDisplayValue(f, rec);
  };

})(typeof window !== 'undefined' ? window : this);
