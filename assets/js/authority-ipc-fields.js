/* =========================================================================
   authority-ipc-fields.js — تاريخ التقديم للهيئة، والقيمة المعتمدة منها
                             على مستخلصات العميل
                             Date submitted to the Authority, and the amount
                             it certified — on client IPCs
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   بعد أن يوقّع العميل على المستخلص (clientSignDate)، يُقدَّم لجهة اعتماد
   حكومية («الهيئة») تراجعه وتعتمد قيمة قد تقل عمّا طُلب. لا يوجد على
   clientIPCs اليوم أي حقل يسجّل متى قُدِّم لها ولا كم اعتمدته فعلاً —
   فسجل مستخلصات الهيئة الجديد (authority-ipc-register.js) لا يملك مصدراً
   يقرأ منه.

   After the client signs an IPC (clientSignDate), it is submitted to a
   government certifying body ("the Authority") that reviews it and
   certifies a value that may be less than what was claimed. clientIPCs
   has no field today recording when it was submitted there, nor what it
   actually certified — so the new Authority-IPC register
   (authority-ipc-register.js) would have nothing to read.

   لماذا نضيفهما هنا لا في schema.js · WHY HERE, NOT IN schema.js

   schema.js للقراءة فقط في هذه الدفعة. نفس أسلوب retention-release-
   field.js وclient-ipc-withholding.js وexpected-collection-field.js
   الثلاثة: إلحاق حقل بعد تحميل المخطط، لا تعديل الملف نفسه.

   schema.js is read-only in this batch. Same technique as the three
   files already doing this — retention-release-field.js,
   client-ipc-withholding.js and expected-collection-field.js: splice a
   field in after the schema loads, never edit the file itself.

   ⚠️ certifiedAmount ليس صفراً افتراضياً · certifiedAmount is NOT
   default 0

   صفر يعني «اعتمدت الهيئة صفراً» — رقم خاطئ يوحي باعتماد فعلي لم يحدث.
   بلا قيمة (undefined عند القراءة، NULL في القاعدة) تعرضه الشاشات
   بصدق: «لم يُعتمد بعد».

   Zero would mean "the Authority certified zero" — a wrong number that
   implies a real certification that never happened. No value (undefined
   when read, NULL in the database) lets screens show the honest state:
   "not certified yet".

   ⚠️ لا يدخل أي منهما أي معادلة · NEITHER FIELD ENTERS ANY FORMULA

   netDue يبقى كما هو تماماً — القيمة المعتمدة من الهيئة دليل يُعرض على
   وجه السجل، وليست رقماً محاسبياً بديلاً حتى يجيب فهمي على الأسئلة
   المفتوحة في PLAN.md.

   netDue is completely untouched — the certified value is evidence shown
   on the record's face, not a replacement accounting figure, until Fahmy
   answers the open questions in PLAN.md.

   ما يحدث للمستخلصات المحفوظة فعلاً · WHAT HAPPENS TO ALREADY-SAVED IPCs

   حقل غائب يُقرأ فارغاً — لا شيء يتغيّر في أي رقم محفوظ سابقاً.
   A missing field reads empty — nothing changes in any previously saved
   number.

   ⚠️ فخّ التسمية الذي تجنّبناه · THE NAMING TRAP AVOIDED

   لا نضيف اسماً عاماً مثل «تاريخ التقديم» — هذا هو نص تسمية حقل submittals
   الحقيقي (departments.js:605) وجدول مرادفات الاستيراد (import.js
   ALIAS_RAW) عالمي؛ إضافته هنا كانت ستُصادر أي عمود اسمه «تاريخ التقديم»
   في أي ملف استيراد لصالح شاشة الاعتمادات بالخطأ. الاسمان الكاملان هنا
   («تاريخ التقديم للهيئة» و«القيمة المعتمدة من الهيئة») لا يتقاطعان مع
   أي تسمية أخرى في الموقع (تحقّق بالبحث قبل الكتابة).

   We do not add a generic label like "تاريخ التقديم" (date submitted) —
   that exact text is submittals' real field label (departments.js:605)
   and import.js's ALIAS_RAW synonym table is global; adding it here would
   wrongly hijack any import column named that way toward the submittals
   screen. The two full labels used here ("date submitted to the
   Authority" and "amount the Authority certified") collide with nothing
   else in the site (checked by grep before writing).

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود clientIPCs لسابق عهده
   تماماً — الحقلان يختفيان، وسجل مستخلصات الهيئة (إن كان محمَّلاً) لا
   يجد شيئاً يقرأه فيعرض كل مستخلص كأنه غير مقدَّم بعد.
   Delete this file and clientIPCs reverts to exactly how it was — both
   fields disappear, and the Authority-IPC register (if loaded) finds
   nothing to read and shows every IPC as not-yet-submitted.

   يُحمَّل بعد expected-collection-field.js مباشرة وقبل departments.js —
   الثلاثة تلحق حقولاً بنفس الجدول قبل أي كود يقرأه.
   Load right after expected-collection-field.js and before
   departments.js — all three append fields to the same table before
   anything reads it.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('authority-ipc-fields.js: schema.js must load first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var ipc = S.get('clientIPCs');
  if (!ipc || !ipc.fields) return;

  if (!ipc.fields.some(function (f) { return f.name === 'submittedDate'; })) {
    /* إدراج بعد clientSignDate — الخطوة التالية منطقياً: يوقّع العميل ثم
       يُقدَّم للهيئة. Insert after clientSignDate — the next logical
       step: the client signs, then it is submitted to the Authority. */
    var i1 = ipc.fields.findIndex(function (f) { return f.name === 'clientSignDate'; });
    var submitted = F('submittedDate', 'تاريخ التقديم للهيئة', 'Date submitted to the Authority', 'date', {
      section: { ar: 'الهيئة', en: 'The Authority' }
    });
    if (i1 === -1) ipc.fields.push(submitted); else ipc.fields.splice(i1 + 1, 0, submitted);
  }

  if (!ipc.fields.some(function (f) { return f.name === 'certifiedAmount'; })) {
    /* إدراج بعد withholding إن وُجد (client-ipc-withholding.js يسبق هذا
       الملف في التحميل)، وإلا بعد deductions مباشرة — القيمة المعتمدة
       تُقرأ بجوار آخر بند خصم قبل صافي المستحق.
       Insert after `withholding` if present (client-ipc-withholding.js
       loads before this file), otherwise right after `deductions` — the
       certified value reads next to the last deduction before net due. */
    var afterName = ipc.fields.some(function (f) { return f.name === 'withholding'; }) ? 'withholding' : 'deductions';
    var i2 = ipc.fields.findIndex(function (f) { return f.name === afterName; });
    var certified = F('certifiedAmount', 'القيمة المعتمدة من الهيئة', 'Amount certified by the Authority', 'money', {
      section: { ar: 'الهيئة', en: 'The Authority' },
      help: { ar: 'القيمة التي اعتمدتها الهيئة فعلياً — دليل يُعرض هنا فقط، ولا يدخل في حساب صافي المستحق. اتركه فارغاً حتى يصل ردّ الهيئة.',
              en: "The value the Authority actually certified — shown here as evidence only, never used to compute net due. Leave it empty until the Authority answers." }
    });
    if (i2 === -1) ipc.fields.push(certified); else ipc.fields.splice(i2 + 1, 0, certified);
  }

  console.info('authority-ipc-fields.js: submittedDate + certifiedAmount added to clientIPCs (neither enters any formula).');
})(window);
