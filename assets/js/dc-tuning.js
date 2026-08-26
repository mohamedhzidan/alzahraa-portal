/* =========================================================================
   dc-tuning.js — أرقام مستندات حقيقية، وشاشات ضبط المستندات مضبوطة على
                  الواقع كما وصفه أ. أحمد عبد الحي
                  Real document numbers, and the DC screens tuned to match
                  reality as Ahmed described it
   -------------------------------------------------------------------------
   ⚠️ الترقيم لم يعد هنا · NUMBERING NO LONGER LIVES HERE

   كان هذا الملف يُصدر أرقاماً مسلسلة لخمس شاشات ضبط المستندات فقط،
   بحساب «أعلى رقم موجود + ١» داخل المتصفح. طلب محمد زيدان أن يشمل
   الترقيم كل الشاشات وكل الأقسام — ولا يصحّ حساب الرقم في المتصفح على
   شاشات المال، لأن محاسبَين يحفظان في نفس اللحظة يقرآن نفس «أعلى رقم»
   فيخرجان برقم واحد على سندَي صرف مختلفين.

   فنُقل الترقيم كله — وكذلك تصحيح تصادم البادئة SI — إلى:
     · assets/js/doc-numbering.js
     · 1-SUPABASE/30-DOCUMENT-NUMBERING.sql   (القاعدة هي التي تُصدر الرقم)

   لا توجد نسختان من منطق الترقيم: هذا الملف لم يعد يمسّه إطلاقاً.

   This file used to issue serial numbers for the five document-control
   screens only, counting "highest existing + 1" in the browser. Mohamed
   Zidan asked for numbering across every screen and every department —
   and counting in the browser is wrong on the money screens, because two
   accountants saving at the same moment read the same "highest number"
   and both get it, on two different payment vouchers.

   So all numbering — and the SI prefix-collision fix with it — moved to
   doc-numbering.js and 30-DOCUMENT-NUMBERING.sql, where Postgres issues
   the number and guarantees it is unique. There are not two copies of the
   numbering logic: this file no longer touches it at all.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and every item below reverts
   exactly: docCode stays required, the method/type lists lose nothing they
   did not already have, validUntil is visible again, drawings loses its
   recall checkbox.

   يُحمَّل بعد dc-requests.js (يوسّع نفس الشاشات) وقبل sites.js.
   Load after dc-requests.js (extends the same screens) and before
   sites.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema || !global.Store) {
    console.error('dc-tuning.js needs schema.js and store.js first');
    return;
  }
  var S = global.Schema;

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · docCode لم يعد مطلوباً — لا نظام ترقيم رسمي عندنا اليوم (سؤال ٨)
     ═══════════════════════════════════════════════════════════════════ */
  (function relaxDocCode() {
    var mod = S.get('docRegister');
    var f = mod && mod.fields && mod.fields.filter(function (x) { return x.name === 'docCode'; })[0];
    if (!f) return;
    f.required = false;
    f.hint = { ar: 'الرقم الرسمي من المكتب الفني إن وُجد', en: 'The official number from the technical office, if any' };
  })();

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · الواتساب وسيلة إرسال غير رسمية — سؤال ٢٧
     ═══════════════════════════════════════════════════════════════════ */
  (function addWhatsAppMethod() {
    var mod = S.get('transmittals');
    var f = mod && mod.fields && mod.fields.filter(function (x) { return x.name === 'method'; })[0];
    if (!f || !f.options) return;
    if (f.options.some(function (o) { return o.value === 'whatsapp'; })) return;
    f.options.push({ value: 'whatsapp', label: { ar: 'واتساب (غير رسمي)', en: 'WhatsApp (informal)' } });
  })();

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · نوعا اعتماد لا يستخدمهما أحمد — سؤال ٣٥ يسمّي ثلاثة فقط
     -------------------------------------------------------------------
     يُحذف الخياران من القائمة فقط. القيم والأعمدة تبقى كما هي — أي سجل
     قديم بقيمة 'method' أو 'subcon' يظل يُقرأ صحيحاً؛ فقط لا يُعرض
     الخياران في نموذج تقديم جديد. حذف هذا الملف يعيدهما فوراً.
     Only the options are removed. Values and columns stay untouched —
     any existing row saved as 'method' or 'subcon' still reads
     correctly; the two choices simply no longer appear on a NEW form.
     Deleting this file restores them immediately.
     ═══════════════════════════════════════════════════════════════════ */
  (function trimSubmittalTypes() {
    var mod = S.get('submittals');
    var f = mod && mod.fields && mod.fields.filter(function (x) { return x.name === 'type'; })[0];
    if (!f || !f.options) return;
    f.options = f.options.filter(function (o) { return o.value !== 'method' && o.value !== 'subcon'; });
  })();

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · «سُحبت النسخة القديمة» على الرسومات أيضاً — يماثل docRegister
     -------------------------------------------------------------------
     يُوضع في نفس قسم «البيانات الأساسية» بجوار drawingStatus (schema.js
     يستخدم SEC.main لهذا الحقل بنفس النص بالضبط)، ليظهرا في نفس المربع.
     Placed in the same "Main information" section as drawingStatus
     (schema.js uses SEC.main there, matched here by identical text) so
     both appear in the same box on the form.
     ═══════════════════════════════════════════════════════════════════ */
  (function addDrawingsRecall() {
    var mod = S.get('drawings');
    if (!mod || !mod.fields) return;
    if (mod.fields.some(function (f) { return f.name === 'oldCopyRecalled'; })) return;
    var field = {
      name: 'oldCopyRecalled',
      label: { ar: 'سُحبت النسخة القديمة من الموقع', en: 'Superseded copy recalled from site' },
      type: 'checkbox',
      section: { ar: 'البيانات الأساسية', en: 'Main information' },
      hint: { ar: 'أهم خانة في هذه الشاشة — نسخة قديمة في الموقع تعني إعادة عمل',
              en: 'The most important box on this screen — an old copy on site means rework' }
    };
    var i = mod.fields.findIndex(function (f) { return f.name === 'drawingStatus'; });
    if (i === -1) mod.fields.push(field); else mod.fields.splice(i + 1, 0, field);
  })();

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · إخفاء validUntil على الاعتمادات — سؤال ٣٧: لا انتهاء، فقط تاريخ
         إصدار. entity.js لا يدعم حقل "مخفي" إطلاقاً (تحقّقنا بقراءته)،
         فنلفّ UI.modal — نفس أسلوب dc-requests.js المُثبت في هذا الموقع
         — ونُخفي الحقل من DOM بعد رسم النموذج، دون حذف العمود أو بياناته.

     Hide validUntil on submittals — Q37: no expiry, only an issue date.
     entity.js has no "hidden field" support at all (verified by reading
     it), so we wrap UI.modal — the same technique dc-requests.js already
     proves in this codebase — and hide the field in the DOM after the
     form renders, without deleting the column or its data.

     [إثبات: validUntil اسم فريد في كل الموقع — لا شاشة أخرى تستخدمه —
      فيكفي البحث عنه بالاسم بلا حاجة لمعرفة أي نموذج مفتوح.]
     [Verified: validUntil is used nowhere else in the portal, so finding
      it by name alone is enough — no need to know which form is open.]
     ═══════════════════════════════════════════════════════════════════ */
  function hideValidUntil() {
    var lab = document.querySelector('[data-fname="validUntil"]');
    if (lab && lab.style.display !== 'none') lab.style.display = 'none';
  }

  function afterModal() {
    [0, 60, 300, 900].forEach(function (ms) {
      setTimeout(function () { try { hideValidUntil(); } catch (e) {} }, ms);
    });
  }

  function wrapModal() {
    if (!global.UI || !UI.modal || UI.__azDcTuningWrapped) return;
    var orig = UI.modal;
    UI.modal = function () {
      var out = orig.apply(UI, arguments);
      afterModal();
      return out;
    };
    UI.__azDcTuningWrapped = true;
  }

  /* UI يُحمَّل بعد هذا الملف — نعيد محاولة اللفّ، ونراقب #modalHost حزاماً
     وحمّالة، تماماً كما فعل dc-requests.js. UI loads after this file — we
     retry the wrap, and watch #modalHost as a safety net, exactly as
     dc-requests.js already does. */
  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapModal, ms); });
  document.addEventListener('DOMContentLoaded', function () {
    wrapModal();
    var host = document.getElementById('modalHost');
    if (host) new MutationObserver(hideValidUntil).observe(host, { childList: true, subtree: true });
  });

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · قائمة جهات جاهزة (datalist) على party — لم يُبنَ · NOT BUILT
     -------------------------------------------------------------------
     fieldHTML في pages/entity.js (تحقّقنا بقراءته) يرسم خانة النص كـ
     <input type="text"> بلا أي دعم لـ list="" أو أي خاصية datalist في
     تعريف الحقل نفسه. لا توجد آلية على مستوى المخطط (schema) لهذا
     إطلاقاً — والخطة نصّت صراحة: إن لم توجد آلية فالأصح تخطّي البند لا
     اختراع واجهة جديدة فوق ما يفهمه النظام. تُركت party نصاً حراً كما هي.

     fieldHTML in pages/entity.js (verified by reading it) renders a text
     box as a plain <input type="text"> with no support for list="" or
     any datalist option in the field definition at all. There is no
     schema-level mechanism for this whatsoever — and the plan said
     explicitly: if no mechanism exists, skip rather than invent UI on
     top of what the system understands. party stays free text as it is.
     ═══════════════════════════════════════════════════════════════════ */

  console.info('[dc-tuning] docCode optional · WhatsApp method added · ' +
    'submittal types trimmed to material/drawing/sample · validUntil hidden · ' +
    'drawings.oldCopyRecalled added · party datalist skipped (no mechanism). ' +
    'Document numbering moved to doc-numbering.js.');
})(window);
