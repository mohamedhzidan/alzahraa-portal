/* =========================================================================
   employee-count-fill.js — «عدد الموظفين» في مسير الرواتب كان صفراً على
                             كل مسير أُنشئ منذ اليوم الأول، بلا استثناء
   THE EMPLOYEE COUNT COLUMN — read zero on every payroll run ever made,
   with no exception
   -------------------------------------------------------------------------
   العلّة، بالقراءة المباشرة لا بالتخمين
   ---------------------------------------
   schema.js:1050 يُعرِّف الحقل «عدد الموظفين» (employeeCount) على شاشة مسير
   الرواتب، وschema.js:1045 يضعه عموداً في القائمة — لكن لا شيء في الموقع
   كله يكتب قيمة فيه إطلاقاً. entity.js:641-670 (recalc) يطبّق فقط آلية
   totals (جمع، لا عدّ) لحقل netTotal وحده. entity.js:830-838 (commit)
   يرسل مسودة النموذج كما هي إلى Store.save/Store.create دون أي إضافة.
   فيبقى rec.employeeCount غير معرَّف (undefined) على كل سجل، وui.js:201-202
   يعرض undefined كـ"0" عبر I18N.num (i18n.js:309-314: !isFinite(n) ⇐ n=0) —
   فالعمود ليس فارغاً بصرياً، بل يكذب: يقول "صفر موظف" على مسير فيه ٤٠ اسماً.

   THE BUG, from reading the source directly, not guessing: schema.js:1050
   defines the "employee count" field on the payroll screen, and
   schema.js:1045 lists it as a column — but nothing anywhere ever writes a
   value into it. entity.js's recalc only implements a SUM mechanism
   (totals, for netTotal); entity.js's commit sends the raw form draft
   straight to Store.save/Store.create with nothing added. So
   rec.employeeCount is undefined on every record, and ui.js's number
   renderer turns undefined into the STRING "0" (i18n.js's num():
   !isFinite(n) ⇒ n=0) — the column does not look empty, it lies: it says
   "zero employees" on a run that pays forty real people.

   لماذا لم يكتشف اختبار سطحي هذا: I18N.num(undefined, 0) هي "0" الحقيقية،
   لا سلسلة فارغة — فأي فحص يكتفي بـ"هل العمود غير فارغ؟" كان سينجح على
   الكود المعطوب بالضبط كما ينجح على الكود المُصلَح. لهذا كل فحوص هذا الملف
   (وتجربته المرفقة) تُطابِق رقماً محدَّداً، لا "غير فارغ" فقط.

   Why a shallow test would miss this: I18N.num(undefined, 0) really is the
   string "0", not an empty string — so any check that only asks "is the
   column non-blank?" would pass on the broken code exactly as it passes on
   the fixed code. Every check in this file's trial therefore asserts an
   EXACT number, never merely "not blank".

   -------------------------------------------------------------------------
   الجزآن، ولماذا اثنان لا واحد
   ------------------------------
   الجزء أ يلفّ Store.create/Store.save فيصحّح القيمة المخزَّنة فعلياً —
   وهذا وحده يكفي لكل شيء يُنشأ أو يُعدَّل بعد تحميل هذا الملف: العمود في
   القائمة، ملف CSV، الفرز، الطباعة (عبر UI.displayValue العادية أصلاً،
   print.js:207)، كل ذلك يقرأ القيمة الحقيقية المخزَّنة مباشرة.
   الجزء ب يلفّ UI.displayValue فقط للعرض، ولا يكتب شيئاً في القاعدة —
   احتياط عرضي بحت لسجل قديم أُنشئ *قبل* رفع هذا الملف ولن يُعدَّل ثانية
   أبداً؛ بلا الجزء ب، ذلك السجل تحديداً يبقى معروضاً كـ"0" للأبد رغم أن
   القيمة الحقيقية موجودة في lines نفسها ويمكن حسابها فوراً عند العرض.

   TWO HALVES, and why two, not one: Part A wraps Store.create/Store.save
   and fixes the actually-STORED value — and that alone is enough for
   everything created or edited after this file loads: the list column, the
   CSV file, sorting, printing (through the ordinary UI.displayValue path,
   print.js:207) all read the real stored value directly. Part B wraps
   UI.displayValue for DISPLAY ONLY and writes nothing to the database — a
   purely cosmetic fallback for an OLD record made *before* this file
   shipped that is never edited again; without Part B that one record would
   show "0" forever even though the true answer sits right there in its
   own lines and can be computed the instant it is displayed.

   -------------------------------------------------------------------------
   عقد الدمج بالضبط — متى نُعيد الحساب ومتى لا نلمس الحقل إطلاقاً
   -------------------------------------------------------------
   نُعيد الحساب فقط حين يحمل هذا الاستدعاء بالذات مصفوفة lines فعلية —
   لا نقرأ السجل المخزَّن من Store.find لنعيد الحساب دائماً. رقعة على طراز
   سير العمل (تقديم/مراجعة/اعتماد) لا تحمل lines أبداً — doTransition
   (entity.js:434-459) لا يستدعي Store.save مباشرة، بل Workflow.transition
   (workflow.js:77+) الذي يبني رقعته من {status, trail, ...} فقط، فتمر دون
   لمسة من هذا الملف، ويبقى employeeCount كما كان (يُورَث من original عبر
   Object.assign في store.js:398 نفسها). القاعدة الأضيق هي الأوضح والأقل
   خطراً: لا نخترع قيمة على حفظ لا شأن له بعدد الموظفين إطلاقاً.

   THE EXACT MERGE CONTRACT — when we recompute, and when we never touch
   the field at all: we recompute ONLY when THIS SPECIFIC call carries a
   real .lines array — we never re-read the stored record from Store.find
   to recompute regardless. A workflow-style patch (submit/review/approve)
   never carries .lines at all — doTransition (entity.js:434-459) does not
   call Store.save directly, it calls Workflow.transition (workflow.js:77+)
   which builds its patch from {status, trail, ...} only, so it passes
   through this file untouched, and employeeCount stays whatever it already
   was (inherited from `original` by store.js:398's own Object.assign). The
   narrower rule is the safer and clearer one: never invent a value on a
   save that has nothing to do with headcount at all.

   -------------------------------------------------------------------------
   لماذا التعديل على الكائن قبل مناداة الأصلية آمن هنا تحديداً
   -----------------------------------------------------------
   entity.js لا يحمل أي `var Store`/`var Schema`/`var UI` محلية (تحقّق
   بالبحث المباشر: صفر نتائج) — فكل نداء Store.save/Store.create/
   UI.displayValue فيه هو بحث حيّ في الكائن العام وقت التنفيذ، لا مرجعاً
   قديماً محفوظاً وقت تحميل الملف. وصادراته الأربعة النهائية (render،
   openForm، openDetail، doTransition) لا تتضمن commit ولا submitForm ولا
   recalc — فلا يوجد أي خطاف مُصدَّر أكثر أماناً من هذا. لفّ Store.create/
   Store.save من ملف يُحمَّل خارجياً هو المكان الوحيد الذي يمكن فيه إصلاح
   القيمة المخزَّنة، وهو آمن لأن لا شيء يحمل مرجعاً قديماً له.

   WHY MUTATING THE OBJECT BEFORE CALLING THROUGH IS SAFE HERE SPECIFICALLY:
   entity.js holds no local `var Store`/`var Schema`/`var UI` (confirmed by
   direct search — zero matches), so every Store.save/Store.create/
   UI.displayValue call inside it is a fresh lookup on the global object at
   call time, never a stale reference captured when the file loaded. Its
   four final exports (render, openForm, openDetail, doTransition) include
   none of commit, submitForm or recalc — there is no safer exported hook
   to use instead. Wrapping Store.create/Store.save from an externally
   loaded file is the only place the STORED value can be fixed at all, and
   it is safe precisely because nothing anywhere holds a stale reference to
   the function being replaced.

   -------------------------------------------------------------------------
   حدود صادقة — ما لا يُصلحه هذا الملف، بالتصريح لا بالإخفاء
   -----------------------------------------------------------
   · تصدير CSV (entity.js:287) وفرز الأعمدة (entity.js:180-186) يقرآن
     r[c] الخام مباشرة، لا عبر UI.displayValue — فالجزء ب لا يغطّيهما.
     لسجل جديد أو مُعدَّل بعد تحميل هذا الملف هذا غير ذي أثر (الجزء أ صحّح
     القيمة المخزَّنة فعلاً)؛ الأثر يبقى فقط على سجل قديم لن يُعدَّل ثانية
     أبداً بعد اليوم — وهذه فجوة قُيِّمَت عمداً وليست هدف هذا الملف
     (تحتاج ترحيلاً واحداً في 1-SUPABASE، قرار منفصل).
   · reports.js:611 يحسب عدد سطور مستقلاً تماماً (p.lines||[]).length بلا
     فلترة الأسطر الفارغة — عطل قائم من قبل، منفصل عن هذا العمود تماماً،
     لم يُلمَس هنا.

   HONEST LIMITS — what this file does NOT fix, stated not hidden:
   · CSV export (entity.js:287) and column sort (entity.js:180-186) read
     the raw r[c] value directly, never through UI.displayValue — so Part B
     cannot reach them. For any record created or edited after this file
     loads this has no effect at all (Part A already fixed the STORED
     value); the effect only remains on an old record that is never edited
     again from today onward — a deliberately assessed gap, not this
     file's job (needs a one-time migration in 1-SUPABASE, a separate
     decision).
   · reports.js:611 computes its own, entirely separate line count
     ((p.lines||[]).length, no blank-line filter) — a pre-existing,
     unrelated bug, not touched here.

   -------------------------------------------------------------------------
   إضافي بالكامل · FULLY ADDITIVE — حذف هذا الملف يعيد سلوك اليوم بالضبط،
   بما في ذلك العطل (يعود العمود إلى "0" دائماً). لا لمسة واحدة على
   store.js أو schema.js أو ui.js أو entity.js. لم يُوصَل بعد في loader.js
   ولا service-worker.js — انظر WIRING-NOTES.md المرافق في نفس المجلد.
   مُثبَت بالتشغيل الفعلي في employee-count-fill-trial.js المرافق (نفس
   المجلد)، على صندوق TESTS/fixtures/portal-sandbox.js الحقيقي المشترك.

   FULLY ADDITIVE — delete this file and today's behaviour returns exactly,
   bug included (the column goes back to always reading "0"). No touch on
   store.js, schema.js, ui.js or entity.js. Not yet wired into loader.js or
   service-worker.js — see the accompanying WIRING-NOTES.md in this same
   folder. Proven by actually RUNNING the accompanying
   employee-count-fill-trial.js (same folder), on the real shared
   TESTS/fixtures/portal-sandbox.js sandbox.
   ========================================================================= */
(function (global) {
  'use strict';

  /* مشترك بين الجزأين — يعدّ الأسطر الحقيقية فقط، لا سطراً فارغاً أضافه
     "+ إضافة سطر" ولم يملأه أحد بعد. blankLine() (entity.js:548-552) يملأ
     employee بـ '' فارغة زائفة لأي حقل غير رقمي/مالي، فالتحقّق من
     !!(l && l.employee) هو الفارق الوحيد الصحيح بين سطر حقيقي وسطر فارغ.
     Shared by both halves — counts only REAL lines, never a blank
     "+ add line" row nobody filled in yet. blankLine() (entity.js:548-552)
     fills `employee` with a falsy '' for any non-number/non-money field,
     so !!(l && l.employee) is the one correct test separating a real line
     from an untouched blank one. */
  function countRealLines(lines) {
    return (lines || []).filter(function (l) { return !!(l && l.employee); }).length;
  }

  /* 🔴 التصدير هنا عمداً، مباشرة بعد تعريف القاعدة وقبل أي return مبكر.
     كان في آخر الملف، وهناك return مبكر (أسفل) يخرج إذا غاب UI أو
     Schema — فكان التصدير لا يحدث إطلاقاً في تلك الحالة، وreports.js
     يسقط بصمت إلى العدّ القديم الخاطئ. التجربة
     TESTS/payroll-headcount-agreement-trial.js أمسكت هذا (A.1 حمراء).
     🔴 Exported HERE deliberately, right after the rule is defined and
     BEFORE any early return. It used to sit at the end of the file, and
     an early return below exits when UI or Schema is missing — so the
     export would silently never happen and reports.js would fall back to
     the old, wrong count with nothing reporting it. Caught by
     TESTS/payroll-headcount-agreement-trial.js (A.1 went red). */
  global.EmployeeCountFill = { countRealLines: countRealLines };

  /* ═══════════════════════════════════════════════════════════════════
     الجزء أ · PART A — يصحّح القيمة المخزَّنة فعلاً، لكل مسير يُنشأ أو
     يُعدَّل من الآن فصاعداً
     ═══════════════════════════════════════════════════════════════════
     نفس نمط التثبيت الحرفي في null-writeback-guard.js (١٤٩-١٦٣)،
     save-guard.js (٧٠٢-٧٢٠)، audit-trail.js (٢٢١-٢٤٩) — تعديل الكائن قبل
     تسليم النداء للأصلية، لا بعده، لأن store.js نفسه (create::379،
     save::398) يبني الصف المخزَّن بـ Object.assign من نفس هذا الكائن. يصبح
     هذا الملف اللفّة الأخارجية على كلٍّ من Store.create وStore.save (بعد
     الستّة الموجودين سلفاً — انظر WIRING-NOTES.md لترتيب loader.js
     بالضبط)، فيُطبَّق قبل أن يرى أيٌّ منهم السجل، ويصل حتماً إلى الأصلية
     الحقيقية أسفل الجميع.
     Same install idiom, verbatim, as null-writeback-guard.js (149-163),
     save-guard.js (702-720), audit-trail.js (221-249) — mutate the object
     BEFORE delegating, not after, because store.js itself (create:379,
     save:398) builds the stored row with Object.assign FROM this very
     object. This file becomes the outermost wrap of both Store.create and
     Store.save (after the six that already exist — see WIRING-NOTES.md
     for the exact loader.js order), so it runs before any of them ever
     sees the record, and is guaranteed to reach the true original
     underneath all of them. */
  function install() {
    if (!global.Store || Store.__employeeCountFill) return;
    Store.__employeeCountFill = true;

    var origCreate = Store.create;
    var origSave = Store.save;

    Store.create = function (table, data /* , opts */) {
      if (table === 'payroll' && data && Array.isArray(data.lines)) {
        data.employeeCount = countRealLines(data.lines);
      }
      /* data.lines ليست مصفوفة على هذا النداء بالذات (نادر لـcreate) ⇐ لا
         نلمس employeeCount إطلاقاً — نتركها كما سلّمها المستدعي بالضبط.
         data.lines is not an array on this specific call (rare for
         create) ⇒ employeeCount is left completely untouched, exactly as
         the caller handed it. */
      return origCreate.apply(Store, arguments);
    };

    Store.save = function (table, id, patch /* , opts */) {
      /* نُعيد الحساب فقط حين تحمل هذه الرقعة بالذات lines — أبداً بقراءة
         السجل المخزَّن لإعادة الحساب رغماً عنه؛ انظر "عقد الدمج بالضبط"
         أعلى الملف لمثال رقعة سير العمل التي يجب ألا تُلمَس. Recompute
         ONLY when THIS patch carries lines — never by reading the stored
         record to recompute regardless; see "THE EXACT MERGE CONTRACT" at
         the top of this file for the workflow-patch case that must stay
         untouched. */
      if (table === 'payroll' && patch && Array.isArray(patch.lines)) {
        patch.employeeCount = countRealLines(patch.lines);
      }
      return origSave.apply(Store, arguments);
    };

    console.info('employee-count-fill.js ready — «عدد الموظفين» يُحسب الآن من بنود المسير الحقيقية عند كل إنشاء أو حفظ.');
  }

  install();
  /* Store موجود فور تحميله في loader.js، لكن نُبقي إعادة المحاولة على نفس
     نمط null-writeback-guard.js/save-guard.js/audit-trail.js تحسّباً لأي
     إعادة بناء لاحقة لكائن Store لم نرها بعد.
     Store exists the instant it loads in loader.js, but the retry is kept
     on the same pattern as null-writeback-guard.js/save-guard.js/
     audit-trail.js in case of a future Store rebuild we have not seen yet. */
  [0, 500, 2000, 5000].forEach(function (ms) { setTimeout(install, ms); });

  /* ═══════════════════════════════════════════════════════════════════
     الجزء ب · PART B — احتياط عرضي فقط، لسجل قديم لن يُعدَّل ثانية أبداً
     ═══════════════════════════════════════════════════════════════════
     نفس شكل اللفّ في checkbox-three-states.js (اللفّة الرابعة على
     UI.displayValue) وداخل نفس اتفاقية العلامة بهوية الكائن في
     daily-labour-id.js (_maskLast4، ١٩٥-٢٠٥) — بلا حارس إعادة تثبيت وبلا
     محاولات setTimeout، لأن ui.js وschema.js محمَّلان حتماً قبل هذا الملف
     في ترتيب loader.js الثابت، فلا داعي للانتظار.
     Same wrap shape as checkbox-three-states.js (the fourth wrap on
     UI.displayValue) and the same object-identity marker convention as
     daily-labour-id.js (_maskLast4, 195-205) — no re-install guard and no
     setTimeout retries, because ui.js and schema.js are guaranteed already
     loaded before this file in loader.js's fixed order, so there is
     nothing to wait for. */
  if (typeof global === 'undefined' || !global.UI || typeof global.UI.displayValue !== 'function' ||
      !global.Schema || typeof global.Schema.get !== 'function') return;

  /* نعلّم الحقل مرة واحدة وقت التثبيت — لا نطابق بالاسم وقت النداء، لأن
     المطابقة بالاسم كانت ستُصيب أي حقل آخر اسمه employeeCount في وحدة
     مختلفة مستقبلاً (لا يوجد اليوم — تحقّق بالبحث — لكن هذا مجاني ومتّبع
     في الملف نفسه الذي نسخنا شكله). Tag the field ONCE, at install time —
     never match by name at call time, because matching by name would
     silently affect any future employeeCount field on a different module
     (none exists today — confirmed by search — but this is free and is
     the convention the very file we copied this shape from itself uses). */
  var mod = global.Schema.get('payroll');
  var countField = null;
  if (mod && mod.fields) {
    for (var i = 0; i < mod.fields.length; i++) {
      if (mod.fields[i].name === 'employeeCount') { countField = mod.fields[i]; break; }
    }
  }
  if (countField) countField._liveCount = true;

  var originalDisplayValue = global.UI.displayValue;
  global.UI.displayValue = function (f, rec) {
    /* !rec.employeeCount (فارغة القيمة المنطقية) لا === undefined عمداً:
       صفر حقيقي مخزَّن (مسير بلا سطر حقيقي واحد فعلاً) وصفر لم يُصلَح بعد
       يقعان في هذا الفرع معاً، لكن كلاهما يُعاد حسابه إلى نفس الجواب
       الحقيقي من rec.lines — فلا فرق مرئي في السلوك على الإطلاق.
       !rec.employeeCount (falsy) not === undefined, deliberately: a
       genuinely-correct stored 0 (a run with no real lines at all) and a
       not-yet-fixed undefined both fall into this branch, but both
       recompute to the exact same true answer from rec.lines, so there is
       no visible difference in behaviour either way. */
    if (f && f._liveCount && rec && !rec.employeeCount && Array.isArray(rec.lines)) {
      var n = countRealLines(rec.lines);
      return '<span class="num">' + I18N.num(n, 0) + '</span>';   /* نفس شكل الـHTML في ui.js:201-202 · same HTML shape as ui.js:201-202 */
    }
    /* كل حالة أخرى — بما فيها employeeCount حقيقي مخزَّن سلفاً من الجزء أ —
       تمرّ دون تغيير إلى اللفافة السابقة. Every other case — including a
       real, already-stored employeeCount from Part A — passes straight
       through unchanged to the wrap before this one. */
    return originalDisplayValue.apply(global.UI, arguments);
  };


})(window);
