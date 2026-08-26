/* =========================================================================
   calc-formulas.js — كل حقل محسوب في الموارد البشرية كان يعرض صفراً
                      Every calculated field in HR was showing zero
   -------------------------------------------------------------------------
   العطل — أُثبت بتشغيل الشيفرة الحقيقية، لا بقراءتها
   THE BUG — proven by RUNNING the real code, not by reading it

   ui.js:221-234 هي الدالة الوحيدة في الموقع كله التي تحسب حقول النوع
   'calc'. وهي تفترض أن الصيغة **نصّ**:

       var expr = f.formula.replace(/[a-zA-Z_].../g, ...)

   كل صيغ schema.js نصوص، فتعمل: 'basic+allowances+overtime-...'.
   لكن hr-department.js كتب صيغه **دوالّ**:

       formula: function (r) { return (Number(r.amount)||0) - (Number(r.repaid)||0); }

   و«دالة».replace غير موجودة → TypeError → يبتلعها catch في السطر ٢٣٣
   → return 0. بلا رسالة خطأ، بلا تحذير في الشاشة، بلا شيء.

   ui.js:221-234 is the ONE function in the whole portal that evaluates a
   'calc' field, and it assumes the formula is a STRING. Every formula in
   schema.js is a string, so they all work. But hr-department.js wrote its
   formulas as FUNCTIONS — and a function has no .replace, so it throws a
   TypeError, which the catch at line 233 swallows, returning 0. Silently.

   ثمانية حقول، كلها في قسم الموارد البشرية، وكلها كانت تقرأ صفراً:
   Eight fields, all of them in HR, all of them reading zero:

     hr-department.js:107  instalmentAmount  قيمة القسط
     hr-department.js:117  outstanding       المتبقي من السلفة  ← الأخطر
     hr-department.js:182  missingCount      عدد المستندات الناقصة
     hr-department.js:191  completeness      نسبة اكتمال المصوغات
     hr-department.js:245  presentCount      عدد الحاضرين
     hr-department.js:249  absentCount       عدد الغائبين
     hr-department.js:293  workerCount       عدد العمال
     hr-department.js:311  lineTotal         إجمالي العامل الواحد ← الأخطر

   أثره بالعربي الواضح:
   · «المتبقي» على كل سلفة = صفر → كل سلفة تبدو مسدَّدة بالكامل.
   · إجمالي كشف العمالة اليومية = صفر، مهما بلغ عدد العمال ويومياتهم،
     لأن totals يجمع lineTotal وهو صفر (pages/entity.js:646-652).
   · «عدد الناقص» في مصوغات التوظيف = صفر → كل ملف يبدو مكتملاً،
     وهو بالضبط ما سمّاه أ. محمد عمارة «أكثر خطأ يتكرر».

   In plain terms: every advance shows as fully repaid, every daily-labour
   sheet totals to zero however many workers are on it, and every
   recruitment file looks complete however many papers are missing.

   -------------------------------------------------------------------------
   العلاج · THE FIX

   ui.js ملف للقراءة فقط بقواعد المشروع. فنلفّ دالتيه المُصدَّرتين بدل
   تعديله. نتعامل **فقط** مع الصيغ من نوع «دالة»؛ أي صيغة نصية تمرّ إلى
   ui.js الأصلي حرفياً بلا لمس.

   ui.js is read-only by this project's rules, so we WRAP its two exported
   functions instead of editing it. We handle ONLY function-style formulas;
   every string formula is passed straight through to the original, byte
   for byte. Delete this file and all eight fields go back to zero — which
   is exactly today's behaviour.

   ⚠️ لماذا لُفّت displayValue أيضاً وليس computeValue وحدها
      WHY displayValue IS WRAPPED TOO, not just computeValue

   ui.js:200 داخل displayValue ينادي computeValue **الداخلية المغلقة**،
   لا UI.computeValue المُصدَّرة. فلفّ المُصدَّرة وحدها يصلح النموذج
   والتصدير ويترك القوائم وشاشة التفاصيل والطباعة على صفرها. هذا هو
   الفخ نفسه الذي وثّقه dc-alerts.js مع Alerts.render.

   ui.js:200, inside displayValue, calls the CLOSURE-INTERNAL computeValue,
   not the exported UI.computeValue. So wrapping the exported one alone
   would fix the form and the CSV export while leaving every list, detail
   view and printout still showing zero. This is the same trap dc-alerts.js
   documented for Alerts.render — check whether the caller uses the
   exported function or its closure-internal twin.

   يُحمَّل بعد ui.js مباشرة وقبل pages/entity.js
   Load immediately after ui.js and before pages/entity.js
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.UI || typeof UI.computeValue !== 'function') {
    console.error('calc-formulas.js needs ui.js first — calculated HR fields will stay at zero');
    return;
  }
  if (UI.__azCalcFormulas) return;
  UI.__azCalcFormulas = true;

  function isFnFormula(f) {
    return !!f && f.type === 'calc' && typeof f.formula === 'function';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · القيمة نفسها · the value itself
     ═══════════════════════════════════════════════════════════════════ */
  var origCompute = UI.computeValue;

  UI.computeValue = function (f, rec) {
    if (!isFnFormula(f)) return origCompute.apply(UI, arguments);
    try {
      /* السجل قد يكون فارغاً عند فتح نموذج جديد — نمرّر {} لا undefined،
         لأن صيغ hr-department.js تقرأ r.amount مباشرة.
         The record can be empty on a brand-new form — pass {} rather than
         undefined, because hr-department.js's formulas read r.amount
         directly and would throw on undefined. */
      var out = f.formula(rec || {});
      out = Number(out);
      return isFinite(out) ? out : 0;
    } catch (e) {
      /* نفس سلوك ui.js عند الفشل — صفر — لكن مع صوت هذه المرة، لأن
         الصمت هو ما أخفى هذا العطل من الأصل.
         Same fallback as ui.js on failure — zero — but audible this time,
         because silence is what hid this bug in the first place. */
      console.warn('[calc-formulas] formula failed for field "' + (f.name || '?') + '":', e);
      return 0;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · عرضها في القوائم وشاشة التفاصيل والطباعة
        نُعيد بناء نفس مخرجات ui.js:200 حرفياً — نفس الوسم، نفس الصنف،
        نفس I18N.money — للحالة المعطوبة وحدها.
        We reproduce ui.js:200's output exactly — same tag, same class,
        same I18N.money — for the broken case only.
     ═══════════════════════════════════════════════════════════════════ */
  var origDisplay = UI.displayValue;

  UI.displayValue = function (f, rec) {
    if (!isFnFormula(f)) return origDisplay.apply(UI, arguments);
    return '<span class="money">' + I18N.money(UI.computeValue(f, rec)) + '</span>';
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · فحص ذاتي — يطبع في الـ console رقماً يثبت أن الملف يعمل
        SELF-CHECK — prints a number that proves the file is working
     ═══════════════════════════════════════════════════════════════════ */
  (function selfCheck() {
    var probe = { name: '__probe', type: 'calc',
      formula: function (r) { return (Number(r.a) || 0) * (Number(r.b) || 0); } };
    var got = UI.computeValue(probe, { a: 6, b: 350 });
    if (got === 2100) {
      console.info('calc-formulas.js ready — function-style calc formulas now compute ' +
                   '(self-check 6 × 350 = ' + got + '). Eight HR fields stop reading zero.');
    } else {
      console.error('calc-formulas.js SELF-CHECK FAILED — expected 2100, got ' + got +
                    '. HR calculated fields are still wrong.');
    }
  })();
})(window);
