/* Fail closed per module when that table could not be loaded safely. */
(function (global) {
  'use strict';
  if (!global.EntityPage || EntityPage.__availabilityRecovery) return;
  var originalRender = EntityPage.render;
  EntityPage.render = function (moduleId) {
    originalRender.apply(EntityPage, arguments);
    try {
      var mod = global.Schema && Schema.get ? Schema.get(moduleId) : null;
      if (!mod || !global.Store || !Store.tableStatus) return;
      var status = Store.tableStatus(mod.table);
      if (status === 'ready') return;
      var content = document.getElementById('content');
      if (!content) return;
      var error = Store.tableError(mod.table) || '';
      var ar = !global.I18N || I18N.getLang() === 'ar';
      var box = document.createElement('div');
      box.className = 'alert alert-danger';
      box.style.marginBottom = '12px';
      box.textContent = ar
        ? 'هذه الشاشة غير متاحة بأمان الآن. لم تُحمّل بياناتها من الخادم، لذلك تم تعطيل التعديل بدلاً من عرض نجاح زائف. ' + error
        : 'This screen is not safely available right now. Its server data did not load, so editing is disabled instead of pretending it succeeded. ' + error;
      content.insertBefore(box, content.firstChild);
      content.querySelectorAll('[data-x="new"],[data-x="edit"],[data-x="delete"],[data-x="submit"],[data-x="review"],[data-x="approve"],[data-x="reverse"]').forEach(function (el) {
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
      });
    } catch (e) { console.warn('[availability-recovery]', e); }
  };
  EntityPage.__availabilityRecovery = true;
})(window);
