/* =========================================================================
   advance-instalments-guard.js — «عدد أقساط الخصم» لا يكون صفراً ولا سالباً
   ولا كسراً — وفراغٌ لا يُقال عنه شيء
   advance-instalments-guard.js — «Number of instalments» refuses zero, a
   negative number, or a fraction AT SAVE, on both the form and the Excel
   import — and a BLANK box is never mistaken for a zero
   -------------------------------------------------------------------------
   لماذا · WHY: hr-department.js:102-105 يعرّف «instalments» رقماً عادياً بلا
   حدّ أدنى، وentity.js:631 يرسمه بـ`step="any"` بلا `min`، ولا شيء في هذا
   المشروع ينادي فحص المتصفح الأصلي (checkValidity) عند الحفظ — زرّ «حفظ»
   ليس `<button type="submit">` ولا يمرّ الحفظُ عبر إرسال نموذجٍ حقيقي
   (entity.js:568-570). فحتى سمة `min` في المتصفح (PATCH-instalments-
   minimum.md) لا تمنع الحفظ فعلياً بنفسها — هذا الملف هو الحارس الذي يمنع
   فعلاً، لا مجرّد لونٍ على الحافّة.
   WHY: hr-department.js:102-105 declares «instalments» as a plain number
   with no minimum, entity.js:631 renders it with `step="any"` and no `min`,
   and nothing in this project calls the browser's own validity check at
   save — the Save button is not a `<button type="submit">` and saving never
   goes through a real HTML form submit (entity.js:568-570). So even the
   browser's `min` attribute (PATCH-instalments-minimum.md) does not itself
   block a save — THIS file is the guard that actually blocks, not just a
   coloured edge on the box.

   مقيسٌ بالتشغيل · MEASURED BY RUNNING (bug-hunt-p11-sql.js B5): سلفة واحدة
   بـ`instalments = -3` توقف زرّ توليد بنود المسير **للشركة كلها كل شهر**
   برسالة إنجليزية لا تسمّي أحداً («Invalid payroll amount»)، والخانة نفسها
   تعرض «٠» بدل السالب (hr-department.js:108-109 يحرس `n > 0`) فلا دليل
   مرئي على الخطأ في المستند نفسه.
   One advance with `instalments = -3` stops the payroll Generate-lines
   button for the WHOLE COMPANY, every month, behind an English message
   naming nobody («Invalid payroll amount»), and the box itself shows «0»
   instead of the minus sign (hr-department.js:108-109 guards `n > 0`), so
   the document carries no visible clue of its own fault.

   البابان معاً · BOTH DOORS, ONE WRAPPER: hr-import-review.js:660-666 و
   import.js:999-1060 ينادِيان `Rules.validateSave` قبل أي `Store.create`
   لصفٍّ جديد، ويرفضان الصفّ (`r.cls = 'invalid'`) إن رجعت أخطاء منها — فهذا
   يقفل باب الاستيراد بلا لفٍّ إضافي. مُثبَت بالقراءة، لا بالتشغيل.
   hr-import-review.js:660-666 and import.js:999-1060 BOTH call
   `Rules.validateSave` before any `Store.create` for a new row, and refuse
   the row (`r.cls = 'invalid'`) if it returns errors — so this closes the
   import door too, with no second wrapper. Confirmed by READING the source,
   not by running it.

   لا يُطلق على قيمةٍ غائبة تماماً · NEVER FIRES ON A TOTALLY ABSENT VALUE:
   الحقل ليس `required`، والاستيراد لا يملأ الافتراضي «١» لحقول النوع
   «number» (hr-import-review.js buildRecord يملأ الافتراض فقط لحقول
   `select`) — فسطرٌ لم يذكر الأقساط إطلاقاً لا يُرفَض هنا؛ نُحكَم عليه فقط
   حين يُكتَب رقمٌ فعلاً (القاعدة ٢٨ أغسطس: لا حرجاً على خانة اختيارية فارغة).
   The field is not `required`, and the importer does not fill the «1»
   default for `number`-type fields (buildRecord only applies the default to
   `select` fields) — so a row that never mentions instalments at all is NOT
   refused here; it is judged only when a number was actually typed
   (frontend.md, 28 Aug: never give critical severity to an empty optional
   box).

   🔴 إضافةٌ ١٣ سبتمبر ٢٠٢٦ (بلاغ الأعطال): خانةٌ كُتب فيها رقمٌ ثم فُرِّغَت
   بالكامل (Backspace) تصل هنا كنصٍّ فارغ '' — وليست undefined ولا null
   (entity.js:668-670) — فكانت تسقط تحت الحكم كصفرٍ («Number('')» يساوي
   صفراً) وتقول «لا يمكن أن يكون صفراً» عن خانةٍ لم يُكتب فيها شيء إطلاقاً.
   الفراغ يُعامَل الآن معاملة undefined/null تماماً: لم يُكتب شيء، فلا حكم.
   وأُضيف أيضاً رفضُ الكسر (١٫٥ مثلاً) — عدد الأقساط رقمٌ صحيحٌ بطبيعته، وهو
   مُلحَقٌ بنفس الرفض المعتمَد أعلاه لا قاعدةً منفصلة.
   🔴 ADDED 13 Sept 2026 (bug report): a box typed into and then fully
   cleared (Backspace) arrives here as the empty string '' — never
   undefined or null (entity.js:668-670) — so it used to fall under the
   zero judgement (`Number('')` is zero) and say "cannot be zero" about a
   box that was never typed into at all. Blank is now treated exactly like
   undefined/null: nothing was typed, so nothing is judged. Also added: a
   fraction (e.g. 1.5) is refused — the instalment count is a whole number
   by nature — folded into the same already-approved refusal above, not a
   separate rule.

   إضافيّ بالكامل · WHOLLY ADDITIVE: احذف هذا الملف فتعود شاشة اليوم بالحرف
   — لا حقل ولا جدول ولا صلاحية يتغيّر.
   Delete this file and today's screen returns exactly — no field, no
   table, no permission changes.
   يُحمَّل بعد · LOAD AFTER: rules.js
   v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Rules || typeof Rules.validateSave !== 'function') {
    console.error('advance-instalments-guard.js needs rules.js first — not installed');
    return;
  }
  if (Rules.__p11AdvanceInstalmentsGuard) return;      /* لا يُركَّب مرّتين · never twice */
  Rules.__p11AdvanceInstalmentsGuard = true;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* ننادي الأصلية أولاً ونضيف إلى نتيجتها — لا نستبدلها. حذف هذا الملف يعيد
     سلوك اليوم حرفياً. `mod` قد يكون نصّاً (assistant-pro.js:147، عطل قائم
     مسبقاً وموثّق في item-duplicate-guard.js) فلا نفترض أنه كائن أبداً، ولا
     نرمي أبداً: حارسٌ يرمي داخل الحفظ يمنع كل حفظ، لا حفظ هذه الشاشة وحدها.
     Call the original first and ADD to its result — never replace it.
     Deleting this file restores today exactly. `mod` may be a STRING
     (assistant-pro.js:147, a pre-existing bug documented in
     item-duplicate-guard.js) — never assumed to be an object, and this NEVER
     throws: a guard that throws inside save blocks every save, not just this
     screen's. */
  var origValidateSave = Rules.validateSave;
  Rules.validateSave = function (mod, draft, editingId) {
    var check = origValidateSave.apply(Rules, arguments);
    try {
      if (!check || !Array.isArray(check.errors)) return check;
      var id = mod && typeof mod === 'object' ? mod.id : null;
      /* 🔴 بلاغ الأعطال ١٣ سبتمبر: خانةٌ كُتبت فيها قيمةٌ ثم فُرِّغَت
         بالكامل (Backspace) تصل هنا كنصٍّ فارغ '' — لا undefined ولا null
         (entity.js:668-670: `f.type==='number' ⇒ el.value===''? '': Number
         (el.value)`) — فكانت تسقط في الحكم أدناه: `Number('')` تساوي صفراً،
         و«لا يمكن أن يكون صفراً» رسالةٌ خاطئة تماماً لخانةٍ لم تُكتب فيها
         قيمة أصلاً، لا لخانةٍ كُتب فيها صفر. فراغٌ = لم يُكتب شيء، تماماً
         كما تُعامَل undefined/null بالفعل — لا فرقاً بين الحالتين.
         🔴 Bug report, 13 Sept: a box typed into and then fully cleared
         (Backspace) arrives here as the empty string '', never undefined
         or null (entity.js:668-670: `f.type==='number' ⇒ el.value===''?
         '': Number(el.value)`) — so it fell through to the judgement below:
         `Number('')` is zero, and "cannot be zero" is flatly the wrong
         sentence for a box that was never typed into at all, as opposed to
         one where a zero was typed. Blank = nothing was typed, exactly like
         undefined/null are already treated — no difference between the two
         cases. */
      if (id !== 'employeeAdvances' || !draft) return check;
      if (draft.instalments === undefined || draft.instalments === null || draft.instalments === '') return check;
      /* أُدخل رقمٌ فعلاً ⇒ نحكم عليه. صفرٌ وسالبٌ ونصٌّ غير رقمي (NaN)
         ممنوعون — لا نصمت أمام قيمة لا نفهمها. وعدد الأقساط رقمٌ صحيحٌ
         بطبيعته (لا معنى لِـ«١٫٥ قسط») — كسرٌ هنا كان سيجعل القاعدة تصرف
         قسطاً كاملاً ثم نصفاً دون أن يقول أحد ذلك (مُلحَقٌ بنفس رفض D2
         المعتمَد أصلاً، لا قاعدةً جديدة).
         A value was actually TYPED ⇒ judge it. Zero, negative and
         non-numeric text (NaN) are refused — we never stay silent in front
         of a value we cannot read. And the instalment COUNT is a whole
         number by nature (there is no such thing as "1.5 instalments") — a
         fraction here would make the database pay one full instalment and
         then a half with nobody having said so (folded into the SAME
         already-approved D2 refusal, not a new rule). */
      var n = Number(draft.instalments);
      if (!(n >= 1)) {
        check.errors.push(L({
          ar: 'عدد أقساط الخصم لا يمكن أن يكون صفراً أو أقل — لا بدّ أن يكون قسطاً واحداً على الأقل.',
          en: 'The number of deduction instalments cannot be zero or less — it must be at least one instalment.'
        }));
      } else if (!Number.isInteger(n)) {
        check.errors.push(L({
          ar: 'عدد أقساط الخصم يجب أن يكون رقماً صحيحاً (١، ٢، ٣…).',
          en: 'The number of deduction instalments must be a whole number (1, 2, 3…).'
        }));
      }
    } catch (e) { console.error('advance-instalments-guard.js: guard failed, save continues', e); }
    return check;
  };

  global.AdvanceInstalmentsGuard = { installed: true };
  console.info('advance-instalments-guard.js: employee advances now refuse a save with fewer than 1 instalment (form and Excel import alike).');
})(window);
