/* =========================================================================
   ref-dropdown-scope.js — كل قائمة اختيار «ref» تحترم نطاق الاطّلاع
                           EVERY "ref" DROPDOWN RESPECTS VISIBILITY SCOPE
   -------------------------------------------------------------------------
   الفجوة العامة · THE GENERAL GAP (P2.1)

   pages/entity.js:579-589 (fieldHTML) وpages/entity.js:740-749 (lineInput)
   يبنيان كل قائمة اختيار من نوع ref من Store.all(target.table) مباشرة —
   كل صفوف الجدول، بلا استثناء واحد، دون المرور على Auth.scopeRows إطلاقاً.
   فحتى بعد أن يرى موظف الروبيكي سجلات سوهاج مخفيّة تماماً من كل شاشة،
   يظل يرى أسماءها كاملة في أي قائمة منسدلة تشير إليها — المشروعات
   والمخازن والمعدات وغيرها، لا شاشة «الموقع» وحدها.

   pages/entity.js:579-589 (fieldHTML) and pages/entity.js:740-749
   (lineInput) build every ref-type dropdown straight from
   Store.all(target.table) — every row in the table, no exception, never
   passing through Auth.scopeRows at all. So even after an Elrobaki
   employee cannot see a single Sohag record on any screen, every
   dropdown that points at one — projects, warehouses, equipment and more,
   not only the "Site" screen — still shows its full name.

   -------------------------------------------------------------------------
   لماذا نلفّ UI.modal لا نعدّل entity.js · WHY WE WRAP UI.modal, NOT
   entity.js ITSELF

   fieldHTML وlineInput دالتان محليتان داخل إغلاق (closure) entity.js، لا
   تُصدَّران، وentity.js من الملفات التي لا تُعدَّل (القاعدة الإضافية).
   فنستعمل نفس أسلوب dc-tuning.js المُثبَت في هذا الموقع بالضبط: نلفّ
   UI.modal، وبعد فتح النافذة نُنقّي خيارات كل <select> في الـDOM مباشرة —
   حزام تحقّق [0,60,300,900]ms لأن حقول الأسطر (linesWrap) تُرسم لاحقاً
   عبر onOpen (ui.js:141، setTimeout منفصل)، وMutationObserver على
   #modalHost حزاماً وحمّالة لأي إعادة رسم لاحقة (إضافة/حذف سطر).

   fieldHTML and lineInput are closure-local functions inside entity.js,
   never exported, and entity.js is one of the files this project does not
   edit (the additive rule). So we use the exact technique
   dc-tuning.js already proves in this codebase: wrap UI.modal, and once
   the window opens, prune every <select>'s options directly in the DOM —
   a [0,60,300,900]ms retry ladder because line fields (linesWrap) render
   later via onOpen (ui.js:141, its own separate setTimeout), and a
   MutationObserver on #modalHost as a belt-and-braces net for any later
   re-render (adding/removing a line).

   -------------------------------------------------------------------------
   القاعدة الحاسمة · THE RULE THAT MATTERS MOST

   لا يُحذف أبداً الخيار المختار حالياً، حتى لو صار غير مسموح به بعد
   تعديل صلاحيات المستخدم أو موقعه. حذفه كان سيُفرغ القيمة صامتاً عند
   الحفظ، فيمحو ارتباطاً صحيحاً كتبه موظف آخر مخوَّل وقتها.

   The currently-selected option is NEVER removed, even if it would no
   longer be allowed after the user's permissions or site changed. Removing
   it would silently blank the value on save, erasing a valid link another,
   then-authorised person wrote.

   -------------------------------------------------------------------------
   استثناء صريح · ONE EXPLICIT EXCLUSION

   قائمة «الموقع» (ref: sites) مُستثناة عمداً — site-options.js يتولاها
   بالفعل بأسلوب أدق (يلفّ Store.all/Store.find لا خيارات <select>)، وهو
   مُحمَّل ومُثبَت. لفّها هنا أيضاً يعني مصدرين للتصفية على نفس القائمة.

   The "Site" dropdown (ref: sites) is deliberately excluded — site-
   options.js already handles it with a more precise technique (wraps
   Store.all/Store.find, not <select> options), and it is loaded and
   proven. Filtering it here too would mean two sources of truth for the
   same dropdown.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and every ref dropdown
   returns to showing every row of its table, exactly as before — nothing
   else in the portal changes.

   يُحمَّل بعد save-modes.js (كلاهما يلفّ UI.modal؛ الترتيب بينهما غير
   مهم — كل واحد يقرأ opts.buttons أو الـDOM، لا يتصادمان أبداً).
   Load after save-modes.js (both wrap UI.modal; the order between the
   two does not matter — each reads either opts.buttons or the DOM, they
   never collide).
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }

  /* نفس مطابقة العنوان بالضبط في save-modes.js:666-677 — محلية هناك ولا
     تُصدَّر، فنسخ هذه الدالة الصغيرة أوفق من إعادة لصق ٧٤٠ سطراً (قاعدة ١٧).
     The exact same title-matcher as save-modes.js:666-677 — closure-local
     there and never exported, so copying this small function is better
     than re-pasting 740 lines (rule 17). */
  function currentModule(opts) {
    if (!global.Schema || !opts || !opts.title) return null;
    var title = String(opts.title);
    var found = null;
    (Schema.MODULES || []).forEach(function (m) {
      var lab = L(m.label);
      if (lab && title.indexOf(lab) !== -1) {
        if (!found || L(found.label).length < lab.length) found = m;
      }
    });
    return found;
  }

  function fieldByName(mod, name) {
    var f = (mod.fields || []).filter(function (x) { return x.name === name; })[0];
    if (f) return f;
    if (mod.lines && mod.lines.fields) {
      return (mod.lines.fields || []).filter(function (x) { return x.name === name; })[0] || null;
    }
    return null;
  }

  function filterSelect(select, mod) {
    var name = select.getAttribute('name');
    if (!name) return;
    var f = fieldByName(mod, name);
    if (!f || f.type !== 'ref' || !f.ref || f.ref === 'sites') return;   /* sites: site-options.js يتولاها */
    if (!global.Schema || !global.Store || !global.Auth) return;
    var target = Schema.get(f.ref);
    if (!target) return;

    var allowed = {};
    try {
      (Auth.scopeRows(f.ref, Store.all(target.table)) || []).forEach(function (r) { allowed[r.id] = true; });
    } catch (e) { return; }   /* أي فشل في الفحص = لا تغيير، لا يُخفى شيء بالخطأ */

    var current = select.value;
    Array.prototype.slice.call(select.options).forEach(function (opt) {
      if (!opt.value) return;                  /* الخيار الفارغ «اختر…» */
      if (opt.value === current) return;        /* لا نحذف المختار أبداً */
      if (!allowed[opt.value]) opt.parentNode && opt.remove();
    });
  }

  var lastOpts = null;

  function applyFence() {
    if (!lastOpts) return;
    var mod = currentModule(lastOpts);
    if (!mod) return;
    try {
      var form = document.getElementById('entForm');
      if (form) form.querySelectorAll('select[name]').forEach(function (sel) { filterSelect(sel, mod); });
      var lines = document.getElementById('linesWrap');
      if (lines) lines.querySelectorAll('select[name]').forEach(function (sel) { filterSelect(sel, mod); });
    } catch (e) { console.warn('[ref-dropdown-scope] could not apply', e); }
  }

  function afterModal() {
    [0, 60, 300, 900].forEach(function (ms) { setTimeout(applyFence, ms); });
  }

  function wrapModal() {
    if (!global.UI || !UI.modal || UI.__azRefDropdownScopeWrapped) return;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      lastOpts = opts;
      var out = origModal.apply(UI, arguments);
      afterModal();
      return out;
    };
    UI.__azRefDropdownScopeWrapped = true;
  }

  /* UI موجودة غالباً بهذا الترتيب المتأخر، لكن نكرّر أسلوب dc-tuning.js
     المُثبَت حرفاً بحرف احتياطاً. We retry exactly as dc-tuning.js does,
     as a safety net, even though UI already exists this late in the load
     order in practice. */
  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapModal, ms); });
  document.addEventListener('DOMContentLoaded', function () {
    wrapModal();
    var host = document.getElementById('modalHost');
    if (host) new MutationObserver(applyFence).observe(host, { childList: true, subtree: true });
  });
  wrapModal();

  global.RefDropdownScope = { applyFence: applyFence };
})(window);
