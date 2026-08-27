/* =========================================================================
   expected-collection-field.js — متوقع تحصيله في (تقدير فريقنا لا وعد العميل)
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   cash-forecast.js يحتاج تاريخاً لوضع تحصيل كل مستخلص عميل غير محصَّل في
   الأسبوع الصحيح من تقويم النقدية. لا يوجد في clientIPCs أي حقل تاريخ من
   هذا النوع — dueDate ينتمي لفواتير الموردين (schema.js:333) فقط، و
   clientSignDate هو تاريخ توقيع العميل على المستخلص، لا تاريخ توقّع وصول
   النقدية. بلا هذا الحقل سيضطر تقويم النقدية إلى تخمين تاريخ، وهذا أخطر
   من عدم وجود تقويم أصلاً حين يتعلق الأمر بالنقدية.

   cash-forecast.js needs a date to place every uncollected client IPC in
   the correct week of the cash calendar. clientIPCs has no date field of
   this kind — dueDate belongs to supplier invoices only (schema.js:333),
   and clientSignDate is when the client signed the IPC, not when the cash
   is expected. Without this field the cash calendar would have to guess a
   date, which is more dangerous than having no calendar at all where money
   is concerned.

   لماذا حقل جديد لا استخدام حقل قائم · WHY A NEW FIELD, NOT AN EXISTING ONE

   نفس فخ trade/trades المذكور في retention-release-field.js: لا حقل هنا
   يشبه اسمه حقلاً موجوداً بمعنى مختلف، فالاسم expectedCollectionDate
   واضح ولا يتقاطع مع أي حقل آخر (تحقّق بالبحث أدناه).

   Same trade/trades trap named in retention-release-field.js: nothing
   here shares a name with an existing field that means something else —
   `expectedCollectionDate` is unambiguous and collides with nothing
   (verified by grep before writing this file).

   ⚠️ تقدير فريقنا لا وعد من العميل · OUR TEAM'S ESTIMATE, NOT A CLIENT PROMISE

   نص المساعدة يوضّح هذا صراحة على الشاشة نفسها: التاريخ يكتبه أحد عندنا
   بناءً على خبرته بموعد صرف هذا العميل تحديداً، وليس تاريخاً وقّع عليه
   العميل أو التزم به كتابةً. cash-forecast.js يطبع نفس التحذير على وجه
   الشاشة لأن هذا رقم مالي حسّاس يسهل فهمه خطأً كوعد مؤكد.

   The help text says this on the screen itself: the date is typed by
   someone on our team based on experience with that specific client's
   payment habits — it is not a date the client signed or committed to in
   writing. cash-forecast.js prints the same warning on the face of the
   screen, because this is sensitive financial data easily misread as a
   firm commitment.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود clientIPCs لسابق عهده
   تماماً — الحقل يختفي، وتقويم النقدية (إن كان محمّلاً) يعامل كل مستخلص
   غير محصَّل كأنه بلا تاريخ متوقع، فيظهر في دلو «بلا تاريخ» فقط.
   Delete this file and clientIPCs reverts to exactly how it was — the
   field disappears, and the cash calendar (if loaded) treats every
   uncollected IPC as having no expected date, so it falls into the
   "no date" bucket only.

   يُحمَّل بعد client-ipc-withholding.js وقبل agents.js — نفس موضع
   retention-release-field.js وclient-ipc-withholding.js تماماً، لأن
   الثلاثة تلحق حقولاً بنفس الجدول قبل أي كود يقرأه.
   Load after client-ipc-withholding.js and before agents.js — the same
   slot as retention-release-field.js and client-ipc-withholding.js,
   because all three append fields to the same table before anything
   reads it.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('expected-collection-field.js: schema.js must load first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var ipc = S.get('clientIPCs');
  if (ipc && ipc.fields && !ipc.fields.some(function (f) { return f.name === 'expectedCollectionDate'; })) {
    /* إدراج بعد collectedAmount مباشرة — أقرب حقل له معنى منطقياً: كم
       حُصِّل فعلاً، ثم متى نتوقع تحصيل الباقي.
       Insert right after collectedAmount — the nearest field it makes
       logical sense to follow: how much has actually been collected,
       then when we expect to collect the rest. */
    var i = ipc.fields.findIndex(function (f) { return f.name === 'collectedAmount'; });
    var field = F('expectedCollectionDate', 'متوقع تحصيله في', 'Expected collection date', 'date', {
      section: { ar: 'القيم المالية', en: 'Financial values' },
      help: { ar: 'تاريخ تقديري يكتبه فريقنا بناءً على خبرته بهذا العميل — ليس تاريخاً وعد به العميل أو وقّع عليه',
              en: "An estimated date our team types from experience with this client — not a date the client promised or signed" }
    });
    if (i === -1) ipc.fields.push(field); else ipc.fields.splice(i + 1, 0, field);
    console.info('expected-collection-field.js: expectedCollectionDate added to clientIPCs.');
  }
})(window);
