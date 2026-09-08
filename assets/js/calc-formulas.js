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
     hr-department.js:353  lineTotal         إجمالي العامل الواحد ← الأخطر
       (كان مكتوباً هنا «:311» وهو رقم عَتِق — انزاح مع تعديلات لاحقة. صُحّح
        في ٧ سبتمبر ٢٠٢٦ بعد التحقّق بالتشغيل. رقمٌ في ملاحظة يعفن؛ الأمر
        الذي يجده لا يعفن:  grep -n "F('lineTotal'" portal/assets/js/hr-department.js
        was written here as «:311», a stale number that drifted with later
        edits. Corrected 7 Sept 2026, verified by running. A number in a note
        rots; the command that finds it does not.)

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

  /* ── 🔴 عطل «عدد الحاضرين ٥٫٠٠ ج.م» — كان حيّاً وعلى الورق ────────────
     كان هذا السطر يطبع **كل** حقل صيغته دالّة على أنه نقود، بلا سؤال عمّا
     يمثّله الحقل. فكانت شاشات أ. محمد عمارة تقول:
         «نسبة الاكتمال ١ ج.م»   «عدد الحاضرين ٥٫٠٠ ج.م»
     والأسوأ أنه على **كشف حضور الموقع اليومي المطبوع** — ورقة تُملأ وتُوقَّع
     وتُحفَظ. **الخطأ على الورق يخرج من المبنى ويصير هو السجلّ، ولا يبلغه أيّ
     رفع جديد.** وهو العطل الوحيد في هذا المشروع الذي لا يمكن إصلاحه بأثر رجعي.

     العلاج: **الحقل هو الذي يعلن أنه نقود.** والافتراضُ «عادي» عمداً:
     · عدّادٌ يُعرض عادياً = صحيح
     · عدّادٌ يُعرض بالجنيه = هراء
     فحقلٌ جديد يُنسى وسمُه يظهر **عادياً**، وهو الفشل الآمن. العكس — أن يكون
     الافتراض «نقود» — هو بالضبط ما أوصلنا إلى هنا.

     🔴 لا نُفهرِس بالأسماء إطلاقاً: وحدتان قد تحملان حقلاً اسمه `outstanding`
     ومعناهما مختلف، والمفتاحُ بالاسم هو كيف يتوقّف فحصٌ عن المطابقة بصمت.

     🔴 THE «عدد الحاضرين 5.00 ج.م» BUG — it was LIVE, and it was ON PAPER.
     This line printed EVERY function-formula field as money without ever
     asking what the field represents, so أ. محمد عمارة's screens read
     «نسبة الاكتمال ١ ج.م» and «عدد الحاضرين ٥٫٠٠ ج.م» — a percentage and a
     head-count, priced in Egyptian pounds. Worst of all it reached the
     PRINTED daily site attendance sheet, which is filled in, signed and
     filed. A WRONG CELL ON PAPER LEAVES THE BUILDING AND BECOMES THE RECORD;
     no redeploy can reach it. It is the one defect here that cannot be fixed
     backwards.

     THE CURE: the FIELD declares that it is money. The default is PLAIN, on
     purpose — a count shown plain is correct, a count shown in pounds is
     nonsense — so a new field whose flag is forgotten renders PLAIN, which is
     the safe failure. Defaulting to money is exactly what produced this bug.

     🔴 NEVER key on field NAMES: two modules could each hold a field called
     `outstanding` meaning different things, and name-keying is how a check
     silently stops matching.

     🔴 ثلاث حالات، لا اثنتان. ولو كان الوسم منطقياً (نعم/لا) لما استطاع
     التعبير عن «نسبة الاكتمال»، ولانتهينا بنصف إصلاح يمرّ لأن الفحص اخضرّ:
     نسبةٌ تُعرض رقماً عارياً «٣٨» أفضل من «٣٨ ج.م» وما زالت **غير صحيحة**.
     · calcAs:'money'   → نقود، كما كان بالضبط          (٣ حقول)
     · calcAs:'percent' → نسبة مئوية «٣٨٪»               (حقل واحد)
     · بلا وسم          → رقم عادي — وهو الافتراض الآمن  (٤ حقول)

     🔴 لا نُعيد التوجيه إلى `origDisplay` للحقول غير النقدية: `ui.js:199-200`
     يعالج `case 'calc'` **بنفس طريقة النقود**، فالرجوع إليه لا يغيّر شيئاً.
     أوّل نسخة من هذا الإصلاح فعلت ذلك بالضبط و**لم تكن تفعل شيئاً على
     الإطلاق** — أمسكتُها بقراءة ui.js قبل تشغيل أي فحص.

     ولا نكتب مُنسِّقاً جديداً: `I18N.money(v, false)` (i18n.js:315-317) يُعيد
     **نفس الرقم بنفس الفواصل ونفس المنازل، بلا كلمة العملة**. فالشكل لا
     يتغيّر حرفاً واحداً، وتسقط العملة وحدها.

     🔴 THREE states, not two. A boolean flag could not express «نسبة
     الاكتمال», and we would have shipped a half-fix that passes because the
     test went green: a percentage rendered bare as «38» is better than
     «38 ج.م» and is STILL NOT RIGHT.
     · calcAs:'money'   → money, exactly as before        (3 fields)
     · calcAs:'percent' → a percentage, «38%»             (1 field)
     · unflagged        → a plain number — the SAFE default (4 fields)

     🔴 We do NOT delegate non-money calc fields to `origDisplay`:
     `ui.js:199-200` handles `case 'calc'` AS MONEY TOO, so falling back
     changes nothing. THE FIRST VERSION OF THIS FIX DID EXACTLY THAT AND DID
     NOTHING AT ALL — caught by reading ui.js before running any check.

     And no new formatter is written: `I18N.money(v, false)` (i18n.js:315-317)
     returns the SAME number, same separators, same decimals, with no currency
     word. The format is untouched; only the currency goes.

     نقود · money:   instalmentAmount · outstanding · lineTotal
     نسبة · percent: completeness
     عادي · plain:   presentCount · absentCount · workerCount · missingCount */
  UI.displayValue = function (f, rec) {
    if (!isFnFormula(f)) return origDisplay.apply(UI, arguments);
    var v = UI.computeValue(f, rec);
    if (f.calcAs === 'money') return '<span class="money">' + I18N.money(v) + '</span>';
    /* الصيغة تُعيد ٠..١٠٠ بالفعل (Math.round(have/need*100))، فلا ضرب هنا.
       The formula already returns 0..100, so no multiplication here. */
    if (f.calcAs === 'percent') return '<span class="num">' + I18N.pct(v, 0) + '</span>';
    /* 🔴 `I18N.num(v)` وليس `I18N.money(v, false)`. أوّل نسخة استعملت الثانية
       فطبعت «عدد العمال ٣٫٠٠» — بلا عملة، نعم، لكن **عدّاداً بمنزلتين
       عشريتين**. أزال ذلك «ج.م» وترك الحقل غير صحيح، وهو نصف الإصلاح الذي
       يمرّ لأن الفحص اخضرّ. `num` افتراضُه صفر منازل (i18n.js:312) فيعطي «٣».
       ⚠️ وهو **يُقرِّب**: `num(2.5)` = «٣». الحقول الأربعة الحالية أعداد
       صحيحة (حاضرون · غائبون · عمّال · مستندات ناقصة)، فالتقريب لا يمسّها.
       أيّ حقل مستقبليّ يحتاج كسوراً **يجب أن يعلن نفسه**.
       🔴 `I18N.num(v)`, NOT `I18N.money(v, false)`. The first version used the
       latter and printed «عدد العمال 3.00» — no currency, true, but A COUNT
       WITH TWO DECIMAL PLACES. It removed «ج.م» and left the field still
       wrong: the half-fix that ships because the test went green. `num`
       defaults to zero decimals (i18n.js:312), giving «3».
       ⚠️ It ROUNDS: `num(2.5)` = «3». All four current fields are whole
       counts (present · absent · workers · missing documents), so rounding
       cannot touch them. Any future field needing decimals MUST declare
       itself rather than rely on this default. */
    return '<span class="num">' + I18N.num(v) + '</span>';
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
