/* =========================================================================
   payroll-net.js — صافي الراتب يحسب البنود المكتوبة على الشاشة
                    Net pay counts the boxes that are actually on the screen
   -------------------------------------------------------------------------
   ⛔⛔ اقرأ هذا أولاً · READ THIS FIRST ⛔⛔

   هذا الملف **لا يرفع الحظر عن تشغيل الرواتب الحقيقية.**
   ما زال مطلوباً من أ. محمد عمارة: نسبة تأمينات الموظف، نسبة تأمينات
   الشركة، وشرائح ضريبة كسب العمل. تركها كلها فارغة في ورقة ١٥ أغسطس
   (كتب «متغير» في كل سطر بلا قيمة واحدة). **لا يجوز تخمين قانون الضرائب
   المصري.**

   This file does NOT lift the block on running real payroll. Mohamed Amara
   still owes us the employee insurance rate, the employer rate, and the
   income-tax brackets — he left every one blank on the 15 August sheet
   (he wrote "variable" on every line and no figure at all). Egyptian tax law
   must not be guessed.

   ما يفعله هذا الملف شيء واحد فقط: **الجمع والطرح**. لو كتب أحدٌ ٥٠٠ جنيه
   بدل انتقال و٢٠٠ جنيه خصم سلفة بيده في الشاشة، فليدخلا في الصافي. لا
   يحسب هذا الملف ضريبة ولا تأميناً ولا يخترع رقماً.

   What this file does is one thing only: ARITHMETIC. If somebody types 500
   EGP transport allowance and 200 EGP advance deduction into the screen by
   hand, those must reach the net figure. This file computes no tax, no
   insurance, and invents no number.

   -------------------------------------------------------------------------
   العطل · THE BUG  (ROADMAP AUDIT-01)

   schema.js:1069 كانت:
       lineTotal = basic + allowances + overtime − deductions − insurance

   ثم أضاف hr-department.js:458-466 ثمانية بنود أخرى إلى نفس السطر — كلها
   من إجابات أ. محمد عمارة نفسه — **ولم تُحدَّث الصيغة إطلاقاً**:

       بدل انتقال · بدل سكن · بدل موقع · حوافز
       تأمينات (الشركة) · ضريبة كسب العمل · خصم سلف · جزاءات

   فكل جنيه يُكتب في أي من هذه الخانات الثماني **لا أثر له على الصافي**.
   على موظف حقيقي واحد: صُرف ٤٬٧٥٠ والصحيح ٥٬٥٣٠. على ٤٥٠ موظفاً هذا نحو
   ٣٥١٬٠٠٠ جنيه شهرياً. و«خصم سلف» واحد من الثمانية — وهذا هو السبب
   المباشر لأن السلف لا تُسترد أبداً، وهي أول شكوى كتبها أ. محمد عمارة.

   hr-department.js:458-466 added eight more items to that same line — all of
   them from Amara's own answers — and never updated the formula. So every
   pound typed into any of those eight boxes has no effect on net pay. On one
   real employee: 4,750 paid where 5,530 was correct. Across 450 staff that is
   roughly 351,000 EGP a month. And "advance deduction" is one of the eight —
   the direct reason advances are never recovered, which is the very first
   thing Amara wrote on his sheet.

   -------------------------------------------------------------------------
   🔴 قرار واحد اتُّخذ هنا ويجب أن يراه محمد زيدان
      ONE JUDGEMENT CALL MADE HERE, AND HE MUST SEE IT

   كتب أ. محمد عمارة «التأمينات (الشركة)» تحت عنوان «— الخصومات —» في
   ورقته. لكن **حصة الشركة في التأمينات ليست خصماً من الموظف** — هي تكلفة
   تتحملها الشركة فوق الراتب، لا تُقتطع منه. لو طُرحت من الصافي لنقص راتب
   كل موظف في الشركة بقيمة حصة الشركة.

   Amara wrote "insurance (company)" under the heading "— DEDUCTIONS —" on his
   sheet. But the employer's insurance share is NOT a deduction from the
   employee — it is a cost the company carries on top of the wage, not taken
   out of it. Subtracting it would cut every employee's pay by the company's
   own share.

   فاستُثني insuranceEmployer من الصافي عمداً. الخانة تبقى كما هي وتُملأ
   كما هي — لتسجيل تكلفة الشركة — لكنها لا تُطرح من الموظف. وغُيِّر نصّ
   الخانة ليقول ذلك صراحةً، حتى لا يظن من يملؤها أن النظام نسيها.

   insuranceEmployer is therefore deliberately EXCLUDED from net pay. The box
   stays and is filled as before — to record the company's cost — but is not
   taken off the employee. Its label now says so explicitly, so whoever fills
   it does not think the system forgot it.

   **إن كان هذا خطأً في عرف الشركة، فتصحيحه سطر واحد أدناه.**
   If that is wrong for how this company works, correcting it is one line below.

   -------------------------------------------------------------------------
   الصيغة الجديدة، مكتوبة بالكلمات · THE NEW FORMULA, IN WORDS

     يُضاف   : الأساسي · البدلات · الإضافي · انتقال · سكن · موقع · حوافز
     يُطرح   : خصومات · تأمينات الموظف · ضريبة كسب العمل · خصم سلف · جزاءات
     لا يُمسّ : تأمينات الشركة (تكلفة شركة، لا خصم موظف)

     ADD      : basic · allowances · overtime · transport · housing ·
                site allowance · incentives
     SUBTRACT : deductions · employee insurance · income tax ·
                advance deduction · penalties
     UNTOUCHED: employer insurance (a company cost, not an employee deduction)

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف الملف فتعود الصيغة القديمة حرفياً
   (basic+allowances+overtime−deductions−insurance) وتعود البنود الثمانية
   بلا أثر — أي سلوك اليوم بالضبط.
   Delete this file and the old formula returns word for word, and the eight
   items go back to having no effect — exactly today's behaviour.

   يُحمَّل بعد hr-department.js مباشرة (هو من يضيف البنود الثمانية)
   Load immediately after hr-department.js, which adds the eight items
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('payroll-net.js needs schema.js first'); return; }

  /* البنود التي تُضاف والتي تُطرح — مكتوبة كقائمتين لا كنصّ واحد، حتى
     يستطيع من يقرأ أن يرى بعينه ما دخل وما لم يدخل، وحتى يكون تعديل
     البند الواحد سطراً واحداً.
     Written as two lists rather than one string, so a reader can see with
     their own eyes what is in and what is out, and so changing one item is
     one line. */
  var ADD = [
    'basic',          /* الأساسي            · schema.js:1064 */
    'allowances',     /* البدلات            · schema.js:1065 */
    'overtime',       /* الإضافي            · schema.js:1066 */
    'transport',      /* بدل انتقال         · hr-department.js:458 */
    'housing',        /* بدل سكن            · hr-department.js:459 */
    'siteAllowance',  /* بدل موقع           · hr-department.js:460 */
    'incentive'       /* حوافز              · hr-department.js:461 */
  ];

  var SUBTRACT = [
    'deductions',       /* خصومات عامة       · schema.js:1067 */
    'insurance',        /* تأمينات الموظف    · schema.js:1068 */
    'incomeTax',        /* ضريبة كسب العمل   · hr-department.js:464 */
    'advanceDeduction', /* خصم سلف           · hr-department.js:465 */
    'penalty'           /* جزاءات            · hr-department.js:466 */

    /* 🔴 insuranceEmployer غير مذكور هنا عمداً — حصة الشركة لا تُخصم من
       الموظف. لطرحها (إن قرر محمد زيدان ذلك) أضف السطر:
           'insuranceEmployer',
       🔴 insuranceEmployer is deliberately absent — the employer share is not
       taken off the employee. To subtract it, if Mohamed Zidan decides so,
       add the one line above. */
  ];

  (function install() {
    var pay = Schema.get('payroll');
    if (!pay || !pay.lines || !pay.lines.fields) {
      console.error('payroll-net.js: the payroll screen was not found — nothing changed');
      return;
    }

    function line(name) {
      return pay.lines.fields.filter(function (f) { return f.name === name; })[0];
    }

    var net = line('lineTotal');
    if (!net) {
      console.error('payroll-net.js: the net-pay field was not found — nothing changed');
      return;
    }

    /* نبني الصيغة من البنود الموجودة فعلاً على الشاشة فقط. لو لم يكن
       hr-department.js محمَّلاً لسبب ما، تبقى الصيغة هي القديمة حرفياً بدل
       أن تشير إلى حقول غير موجودة.
       We build the formula only from items that really are on the screen. If
       hr-department.js were not loaded for any reason, the formula stays
       exactly the old one instead of naming fields that do not exist. */
    var present = function (n) { return !!line(n); };
    var plus  = ADD.filter(present);
    var minus = SUBTRACT.filter(present);

    if (!plus.length) {
      console.error('payroll-net.js: no pay items found — formula left untouched');
      return;
    }

    var before = net.formula;
    net.formula = plus.join('+') + (minus.length ? '-' + minus.join('-') : '');

    /* الخانة التي لا تُطرح — يُكتب ذلك عليها بوضوح، فلا يظنها أحد منسية.
       The box that is NOT subtracted says so on its face, so nobody thinks
       the system forgot it. */
    var empIns = line('insuranceEmployer');
    if (empIns) {
      empIns.label = {
        ar: 'تأمينات (حصة الشركة — لا تُخصم من الموظف)',
        en: 'Insurance (employer share — not deducted from the employee)'
      };
    }

    console.info('payroll-net.js: net pay formula\n  was: ' + before + '\n  now: ' + net.formula +
                 '\n  employer insurance deliberately excluded — it is a company cost.' +
                 '\n  ⛔ Real payroll is STILL BLOCKED on the tax and insurance rates.');
  })();
})(window);
