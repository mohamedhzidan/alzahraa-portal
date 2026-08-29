/* =========================================================================
   checkbox-three-states.js — صندوق لم يلمسه أحد ليس «لا»
   A tick-box nobody touched is not "no"
   -------------------------------------------------------------------------
   العلّة
   -------
   ui.js:207 — الدالة الوحيدة في الموقع كله التي تعرض صندوق اختيار:
       case 'checkbox': return v ? t('g.yes') : t('g.no');
   الصمت يُعرَض كـ«لا» مكتوبة. ثلاثة صناديق لم يلمسها أحد على إذن صب
   خرسانة (formworkOk، steelOk، levelsOk — departments.js:218-220) تظهر
   وكأن ثلاث معاينات فشلت فعلاً، بينما لا أحد أجاب عليها إطلاقاً.

   THE PROBLEM
   -----------
   ui.js:207 is the ONE checkbox renderer in the whole codebase; silence
   renders as a stated «no». Three untouched boxes on a concrete pour
   permit (departments.js:218-220) read as three failed inspections, when
   nobody answered them at all.

   الإصلاح
   --------
   بعد اللفّ: غياب القيمة (undefined/null/'') ⇐ «—» (الشرطة الفارغة نفسها
   التي تعرضها كل الحقول الأخرى الفارغة، ui.js:216). false صريحة ⇐ «لا».
   true ⇐ «نعم». اللفّة الرابعة على UI.displayValue — الثالثة في ترتيب
   التحميل كانت daily-labour-id.js (loader.js:125-140: ui.js ←
   number-decimals.js ← calc-formulas.js ← daily-labour-id.js)، فهذه
   الرابعة تُحمَّل بعدها مباشرة لتكون الأخارجية.

   THE FIX
   -------
   After the wrap: an absent value (undefined/null/'') → '—' (the exact
   bare dash every other empty field already shows, ui.js:216). Explicit
   false → «لا». true → «نعم». The FOURTH UI.displayValue wrap — the
   third in load order was daily-labour-id.js (loader.js:125-140), so this
   one loads immediately after it to be the outermost.

   لماذا '' تُعامَل كغياب لا كـ«لا»
   -----------------------------------
   readEl (entity.js:634) لا ينتج لحقل type:'checkbox' إلا true أو false
   حرفياً (el.checked)، وclean() تحوّل '' إلى null عند الحفظ — فقيمة ''
   المخزَّنة لا يمكن أن تكون إلا بقايا استيراد/بيانات قديمة، أبداً إجابة
   متعمَّدة. Why '' counts as absent, never as «no»: readEl (entity.js:634)
   can only ever produce a literal true/false for a checkbox field
   (el.checked), and clean() turns '' into null on save — a stored '' can
   only be legacy/import residue, never a deliberate answer.

   الترتيب لا يهم وظيفياً
   -------------------------
   فرع الصندوق لا يصل أبداً إلى computeValue، والّلفّات الثلاث الأخرى
   تتصرّف على حقول المال/الحساب/الهوية النصية — مجموعات منفصلة تماماً
   (V16). Wrap order is functionally indifferent: the checkbox branch
   never reaches computeValue, and the other three wraps act on
   money/calc/text-ID fields — entirely disjoint sets.
   ========================================================================= */
(function (global) {
  'use strict';

  /* لو ui.js لم يُحمَّل بعد (ترتيب تحميل خاطئ) لا يوجد شيء نلفّه — نفس حارس
     number-decimals.js وcalc-formulas.js وdaily-labour-id.js.
     If ui.js has not loaded yet (a load-order mistake) there is nothing to
     wrap — the same guard shape as the three wraps before this one. */
  if (typeof global === 'undefined' || !global.UI || typeof global.UI.displayValue !== 'function') return;

  var originalDisplayValue = global.UI.displayValue;

  global.UI.displayValue = function (f, rec) {
    if (f && f.type === 'checkbox') {
      var v = rec ? rec[f.name] : undefined;
      /* بلا span، بلا صنف — نفس السلسلة الخام التي يعيدها الفرع الافتراضي
         في ui.js:216 لأي نص فارغ، وهي بالضبط ما يقارنها طيّ الصفوف
         الفارغة في screen-behaviour.js:333-339 (txt === '—'). لولا هذا
         التطابق الحرفي، سطر الصندوق لن ينطوي مع بقية الصفوف الفارغة رغم
         كونه فارغاً فعلاً.
         Bare string, no span, no class — the exact same raw string
         ui.js:216's default branch already returns for any empty text,
         and exactly what screen-behaviour.js's empty-row fold compares
         against (:333-339, txt === '—'). Without this literal match the
         box's row would not fold with the other empty rows despite being
         genuinely empty. */
      if (v === undefined || v === null || v === '') return '—';
    }
    /* كل حالة أخرى (false صريحة، true، وكل نوع حقل آخر) تمرّ دون تغيير
       إلى اللفافة السابقة — بما فيها daily-labour-id.js التي تظل تتصرّف
       على nationalId كما هي. Every other case (explicit false, true, and
       every other field type) passes straight through unchanged to the
       wrap before this one — including daily-labour-id.js, which keeps
       acting on nationalId exactly as before. */
    return originalDisplayValue.apply(global.UI, arguments);
  };

})(typeof window !== 'undefined' ? window : this);
