/* =========================================================================
   retention-release-field.js — تاريخ الإفراج عن الاحتجاز
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   agents.js يحسب «احتجازات مستحقة الإفراج» لكل مستخلص عميل احتُجز منه
   مبلغ منذ أكثر من سنة، لكن لا يوجد في clientIPCs أي حقل يقول «هذا
   الاحتجاز أُفرج عنه بالفعل». فكانت النتيجة تنبيهاً لا يمكن إغلاقه
   أبداً — حتى بعد تحصيل المبلغ فعلياً.

   agents.js calculates "retention due for release" for any client IPC
   whose retention has sat unclaimed for over a year, but `clientIPCs`
   had no field at all saying "this retention was already released." The
   result was an alert that could never be closed, even after the money
   was genuinely paid back.

   لماذا حقل تاريخ لا صندوق اختيار · WHY A DATE, NOT A CHECKBOX

   الحقلان retentionYears و retentionUntil موجودان بالفعل في
   departments.js ويعنيان مدة الاحتفاظ بمستند لا تاريخ استرداد المال —
   حقل باسم قريب كان سيقع في نفس فخ trade/trades القديم. تاريخ الإفراج
   أفيد أيضاً من علامة صح/خطأ لأن محمد زيدان سيريد معرفة متى، لا فقط هل.

   `retentionYears` and `retentionUntil` already exist in
   departments.js and mean how long to keep a *document*, not when
   money came back — a similarly-named field here would have been the
   exact trade/trades trap again. A date is also more useful than a
   checkbox: Mohamed Zidan will want to know when, not just whether.

   إضافي بالكامل · ADDITIVE. Delete this file and clientIPCs reverts to
   exactly how it was — the field disappears, agents.js's retentionDue
   job simply goes back to never being able to close its own alert.

   يُحمَّل بعد schema.js وقبل agents.js.
   Load after schema.js and before agents.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('retention-release-field.js: schema.js must load first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var ipc = S.get('clientIPCs');
  if (ipc && ipc.fields && !ipc.fields.some(function (f) { return f.name === 'retentionReleasedDate'; })) {
    var i = ipc.fields.findIndex(function (f) { return f.name === 'retention'; });
    var field = F('retentionReleasedDate', 'تاريخ الإفراج عن الاحتجاز', 'Retention released on', 'date', {
      section: { ar: 'القيم المالية', en: 'Financial values' },
      help: { ar: 'اتركه فارغاً حتى يُفرج فعلاً عن هذا الاحتجاز',
              en: 'Leave empty until this retention has actually been released' }
    });
    if (i === -1) ipc.fields.push(field); else ipc.fields.splice(i + 1, 0, field);
    console.info('retention-release-field.js: retentionReleasedDate added to clientIPCs.');
  }
})(window);
