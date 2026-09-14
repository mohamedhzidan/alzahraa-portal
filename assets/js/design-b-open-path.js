/* =========================================================================
   design-b-open-path.js — فتح السجلّ من صفّه يمرّ بالباب نفسه الذي يمرّ به
                           كل مكان آخر، فتظهر المرفقات
   Opening a record from its register row goes through the SAME door as
   everywhere else — so its attachments appear
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ العطل، مقيساً لا موصوفاً (10 سبتمبر، متصفّح حقيقي) ════════════════
   فتح سجلٍّ بالنقر على صفّه أو على زرّ 👁 في أيّ سجلّ: **لا لوحة مرفقات، ولا
   سجلّ حركة، ولا زرّ تصوير**. فتح السجلّ نفسه من طابور الصفحة الأولى أو من
   صندوق الاعتمادات: كلّها تظهر. قِيس على «إذون الصرف» و«الاعتمادات»، والتصميم
   «ب» مُطفأ ومُشغَّل — النتيجة نفسها. فالعطل **في الموقع اليوم**، لا في «ب».

   السبب (entity.js:253-268): wire() تربط نقرة الصفّ وزرّ 👁 بالدالّة
   openDetail **الداخلية**، لا بـ EntityPage.openDetail المُصدَّرة. وكلّ ملفّ
   يضيف لوحة إلى عرض السجلّ (attachments.js:486 وغيره) يلفّ المُصدَّرة، فلا
   يمرّ به طريق السجلّ أبداً. (عائلة «الدالّة الداخلية والمُصدَّرة» — سُجِّلت
   مرّات في هذا المشروع.) ملفّات entity.js وattachments.js الحيّة مطابقة
   بايتاً بايتاً للنسخة المختبَرة (curl + cmp، 10 سبتمبر).

   THE FAULT, measured: opening a record by clicking its row, or its 👁
   button, in ANY register shows NO attachments panel, NO history, NO camera
   button. Opening the same record from the home queue or the approvals inbox
   shows all of them. Measured on issue notes and submittals, Design B off
   and on — identical. So the fault is IN TODAY'S PORTAL, not in Design B.
   Cause (entity.js:253-268): wire() binds the row click and the 👁 button
   to the INTERNAL openDetail, not the exported EntityPage.openDetail — and
   every file that adds a panel to the record view (attachments.js:486 and
   others) wraps the EXPORT, so the register path never passes through them.
   Live entity.js and attachments.js are byte-identical to the tested copy (curl + cmp, 10 Sept).

   ══ الإصلاح — الأصغر الممكن ═══════════════════════════════════════════
   بعد أن يرسم الموقع الجدول، تُعاد نقرة الصفّ وزرّ 👁 **وحدهما** إلى
   EntityPage.openDetail. التعديل والنسخ والحذف لا تُلمس. لا صلاحية تتغيّر:
   نفس السجلّ، نفس الشخص، ونفس الدالّة التي تستعملها بقيّة الأبواب.
   After the portal draws the table, ONLY the row click and the 👁 button are
   pointed at EntityPage.openDetail. Edit, duplicate and delete are not
   touched. No permission changes: same record, same person, the same
   function every other door already uses.

   🔴 ملفّ مستقلّ عمداً: يمكن للمنسّق نقله إلى البوابة وحده، بلا «ب».
   🔴 A separate file on purpose: the coordinator can lift it into the portal
   on its own, without Design B.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-open-path.js needs design-b-kit.js first'); return; }
  if (!global.EntityPage || typeof EntityPage.render !== 'function') {
    console.error('design-b-open-path.js: EntityPage.render not found — load order is wrong');
    return;
  }

  function rebind(moduleId, host) {
    if (!host) return;
    [].forEach.call(host.querySelectorAll('tr[data-id]'), function (tr) {
      if (tr.__azbOpen) return;
      tr.__azbOpen = true;
      tr.onclick = function (e) {
        if (e.target.closest('.row-actions')) return;           /* كما في entity.js:255 */
        EntityPage.openDetail(moduleId, tr.getAttribute('data-id'));
      };
    });
    [].forEach.call(host.querySelectorAll('[data-act="view"][data-id]'), function (b) {
      if (b.__azbOpen) return;
      b.__azbOpen = true;
      b.onclick = function (e) {
        e.stopPropagation();                                     /* كما في entity.js:261 */
        EntityPage.openDetail(moduleId, b.getAttribute('data-id'));
      };
    });
  }

  /* خطّاف السجلّ الواحد — بعد كل رسم، بما فيه رسم الموقع الداخلي
     The ONE register hook — after every draw, the portal's internal ones too. */
  AZB.onRegister(rebind);

  global.AZBOpenPath = { rebind: rebind };
})(window);
