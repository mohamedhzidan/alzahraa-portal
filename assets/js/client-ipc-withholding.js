/* =========================================================================
   client-ipc-withholding.js — خصم وتحصيل الضريبة على مستخلصات العميل
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   العميل الحكومي يخصم ضريبة الخصم والتحصيل من مستخلص العميل قبل التحويل
   البنكي، تماماً كما يفعل مقاول الباطن مع مستخلصاتنا (subIPCs، الحقل
   withholding في schema.js:782). لكن clientIPCs لم يكن به هذا الحقل، ولا
   صافي المستحق (netDue) يطرحه — فكانت الشاشة تعرض مبلغاً أكبر مما
   سيصل فعلاً إلى حساب الشركة، ولا تسجل قيمة الضريبة القابلة للاسترداد
   في أي مكان.

   The government client withholds tax at source before wiring money, the
   same way we withhold from subcontractors (subIPCs, field `withholding`
   at schema.js:782). But clientIPCs had no such field, and its `netDue`
   formula never subtracted one — so the screen overstated what would
   actually reach the bank, and the reclaimable tax credit was recorded
   nowhere.

   لماذا نضيفه هنا لا في schema.js · WHY HERE, NOT IN schema.js

   schema.js للقراءة فقط في هذه الدفعة. الحل مطابق لما فعله
   retention-release-field.js: إدراج حقل بعد تحميل المخطط، بنفس شكل
   الحقل الموجود فعلاً في subIPCs — لا حقل جديد الاسم، بل نفس الاسم
   الصحيح المفقود من شاشة واحدة فقط.

   schema.js is read-only in this batch. The fix mirrors what
   retention-release-field.js already does: splice a field in after the
   schema loads, using the exact same field shape that already exists on
   subIPCs — not a new name, the same correct name that was simply
   missing from one screen.

   ملاحظة عن معادلة الـ VAT · NOTE ON THE VAT TERM

   الحد الأخير في netDue، ‎+((cumulativeWork-previousWork)*taxRate/100)‎،
   بقي كما هو دون أي مساس — سؤال محاسبي محجوز في PLAN.md، وليس جزءاً من
   هذا الإصلاح.

   The final term in netDue, `+((cumulativeWork-previousWork)*taxRate/100)`,
   is left completely untouched — an accounting question reserved in
   PLAN.md, not part of this fix.

   ماذا يحدث للمستخلصات المحفوظة فعلاً · WHAT HAPPENS TO ALREADY-SAVED IPCs

   المستخلص المحفوظ يحتفظ بقيمة netDue المخزّنة كما هي. عند فتحه مجدداً،
   الحقل withholding الغائب يُقرأ صفراً، فتظهر نفس الأرقام السابقة تماماً
   — إلى أن يكتب أحد قيمة خصم وتحصيل فعلية.

   Already-saved bills keep their stored netDue exactly as it was. When
   reopened, a missing `withholding` evaluates to 0, so old bills show
   identical numbers — until someone types an actual withholding amount.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود clientIPCs لسابق عهده
   تماماً — الحقل يختفي، وnetDue يعود لمعادلته القديمة دون خصم وتحصيل.
   Delete this file and clientIPCs reverts to exactly how it was — the
   field disappears, and netDue returns to its old formula with no
   withholding subtracted.

   يُحمَّل مباشرة بعد retention-release-field.js وقبل agents.js.
   Load position: immediately after retention-release-field.js, before
   agents.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('client-ipc-withholding.js: schema.js must load first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var ipc = S.get('clientIPCs');
  if (ipc && ipc.fields && !ipc.fields.some(function (f) { return f.name === 'withholding'; })) {
    /* إدراج بعد deductions مباشرة — يطابق ترتيب subIPCs حيث withholding
       يلي آخر بند خصم قبل صافي المستحق (schema.js:781-782).
       Insert right after `deductions` — mirrors subIPCs' order, where
       `withholding` follows the last deduction field before netDue
       (schema.js:781-782). */
    var i = ipc.fields.findIndex(function (f) { return f.name === 'deductions'; });
    var field = F('withholding', 'خصم وتحصيل', 'Withholding tax', 'money', {
      section: { ar: 'القيم المالية', en: 'Financial values' }
    });
    if (i === -1) ipc.fields.push(field); else ipc.fields.splice(i + 1, 0, field);

    /* استبدال معادلة netDue بأخرى تطرح withholding — بند VAT الأخير لم
       يُمسّ إطلاقاً، كما يوضح التعليق أعلاه.
       Replace the netDue formula with one that subtracts withholding —
       the trailing VAT term is untouched, as explained above. */
    var netDue = ipc.fields.find(function (f) { return f.name === 'netDue'; });
    if (netDue) {
      netDue.formula = '(cumulativeWork-previousWork)-advanceRecovery-retention-deductions-withholding+((cumulativeWork-previousWork)*taxRate/100)';
    }
    console.info('client-ipc-withholding.js: withholding added to clientIPCs, netDue updated.');
  }
})(window);
