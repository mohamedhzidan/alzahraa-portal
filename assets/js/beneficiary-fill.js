/* =========================================================================
   beneficiary-fill.js — سند الصرف يحمل اسمين لشخص واحد · E-37
                          The payment voucher carries two names for one payee
   -------------------------------------------------------------------------
   العلّة، بكلام الموقع
   ---------------------
   الكاتب يفتح سند صرف، فيكتب «اسم المستفيد» بيده (خانة إجبارية،
   schema.js:357) ثم يختار «المورد (إن وُجد)» من القائمة (خانة اختيارية،
   schema.js:358). سند حقيقي بقيمة ٤٧,٥٠٠ جنيه حمل «مؤسسة النصر للتوريدات»
   مكتوبة يداً بجوار «شركة النصر للتوريدات الصناعية» المختارة من القائمة —
   اسمان لجهة واحدة على ورقة واحدة موقَّعة. بما أن «اسم المستفيد» إجباري،
   هذا هو المسار الطبيعي لكل صرف لمورد، لا حالة نادرة.

   The problem, in site terms
   ---------------------------
   The clerk types «beneficiary name» by hand (required, schema.js:357) and
   MAY also pick «supplier (if any)» from a dropdown (optional, :358). A
   real 47,500 EGP voucher carried «مؤسسة النصر للتوريدات» (typed) next to
   «شركة النصر للتوريدات الصناعية» (picked) — two names for one payee on
   one signed paper. Because beneficiary is required, this is the NORMAL
   path for every supplier payment, not an edge case.

   الإصلاح المعتمَد من المالك — الملء لا الإخفاء
   -----------------------------------------------
   عند اختيار مورد وكان «نوع المستفيد» = «مورد»، تُملأ «اسم المستفيد»
   تلقائياً بنفس الاسم الذي يراه الكاتب في القائمة — ويبقى الصندوق قابلاً
   للتعديل دائماً، لا يُقفَل أبداً. السند المطبوع يستمر يعرض الصندوقين معاً
   (الاسم والمورد) — الآن متّفقين على نفس الاسم.

   The owner-approved fix — FILL, never hide
   --------------------------------------------
   When a supplier is chosen and «payee type» = supplier, «beneficiary
   name» is filled with exactly the text the clerk sees in the dropdown —
   and stays editable, never locked. The printed voucher still shows both
   boxes; now they agree.

   لماذا لفّ UI.modal لا EntityPage.openForm
   --------------------------------------------
   openForm الداخلية تُستدعى من أربعة أماكن مختلفة داخل الملف نفسه (الزر
   الجديد، التعديل، النسخ، التعديل من شاشة التفاصيل) وكلها تنادي الدالة
   المغلقة مباشرة، فلفّ EntityPage.openForm المُصدَّرة لا يعترض شيئاً.
   الخطاف المُثبَت في هذا المشروع هو UI.modal (frontend.md، وسبعة ملفات
   تفعل هذا فعلاً: save-modes وdraft-guard وuser-dialog-guard وscreen-
   behaviour وdc-requests وdc-tuning وref-dropdown-scope) — هذا الملف
   الثامن.

   Why wrap UI.modal, not EntityPage.openForm
   ---------------------------------------------
   The internal openForm is called from four different places inside
   entity.js itself (new button, edit, copy, edit-from-detail), all
   calling the closure directly — wrapping the exported EntityPage.openForm
   would intercept nothing. The proven hook is UI.modal (seven files
   already do this); this is the eighth.

   اكتشاف الشكل، لا اسم الشاشة
   ------------------------------
   نتحقق من وجود الحقول الثلاثة بالاسم داخل النموذج المفتوح، لا من
   moduleId — فأي شاشة مستقبلية تحمل نفس الحقول الثلاثة (payeeType نوعه
   select، beneficiary نصّي، supplier مرجع) ترث السلوك تلقائياً (قاعدة ٢١).
   غياب أيّ من الثلاثة يعني ببساطة أن هذا ليس نموذج دفع — لا شيء يُفعل.

   Shape detection, not screen name
   -----------------------------------
   We check for the three fields BY NAME inside the open form, never by
   moduleId — any future screen carrying the same three fields inherits
   this automatically (rule 21). Missing any one of them simply means this
   is not a payee form — nothing happens.

   السطر الحامل للإصلاح — الحدث الاصطناعي على صندوق الاسم
   -----------------------------------------------------------
   وضع .value برمجياً لا يُطلق أي حدث. bindForm (entity.js:610-625) يستمع
   لأحداث input/change على #entForm ليكتب كل تغيير في draft المغلق الذي
   يُحفظ فعلياً. بلا هذا السطر تكون الشاشة قد عرضت الاسم الصحيح بينما
   السجل المحفوظ ما زال يحمل الاسم القديم — فئة العطل نفسها بالضبط: «التوست
   يقول تم الحفظ» بينما المحفوظ غير ما ظهر. التجربة تحقن هذا العطل عمداً
   لإثبات أن الفحص يحرس المسار الحقيقي للحفظ، لا الشكل على الشاشة فقط.

   THE LOAD-BEARING LINE — the synthetic event on the name box
   -----------------------------------------------------------
   Setting `.value` programmatically fires NO event. bindForm
   (entity.js:610-625) listens for input/change on #entForm to copy every
   change into the closure `draft` that is actually saved. Without this
   line the screen would show the right name while the SAVED record still
   carries the old one — exactly the "toast says saved" failure class. The
   trial injects this exact fault to prove the check guards the real save
   path, not just the pixels.
   ========================================================================= */
(function (global) {
  'use strict';

  /* لو ui.js لم يُحمَّل بعد (ترتيب تحميل خاطئ) لا يوجد شيء نلفّه — نفس حارس
     number-decimals.js وcalc-formulas.js وdaily-labour-id.js.
     If ui.js has not loaded yet (a load-order mistake) there is nothing to
     wrap — the same guard shape as number-decimals.js / calc-formulas.js /
     daily-labour-id.js. */
  if (typeof global === 'undefined' || !global.UI || typeof global.UI.modal !== 'function') return;
  if (typeof global.document === 'undefined') return;

  var document = global.document;

  /* أخذ نصّ الخيار المختار في قائمة المورد — نفس النص الذي يبنيه
     entity.js:586 من suppliers.name (أو docNo/code/id احتياطاً).
     The chosen supplier option's displayed text — the exact string
     entity.js:586 builds from suppliers.name (or docNo/code/id as a
     fallback chain). */
  function chosenSupplierText(supplierEl) {
    var opt = supplierEl.selectedOptions && supplierEl.selectedOptions[0];
    if (!opt) return '';
    var text = (opt.text !== undefined ? opt.text : opt.textContent) || '';
    /* صف مورد بلا اسم يسقط في نهاية سلسلة entity.js:586 حتى الرقم الخام —
       عندها النص المعروض يساوي القيمة الخام (id) حرفياً، وملء الاسم بهذا
       الرقم أسوأ من عدم الملء. A nameless supplier row falls to the end of
       entity.js:586's chain down to the raw id — the displayed text then
       equals the raw value itself, and filling the name with that number
       is worse than not filling at all. */
    if (!text || text === opt.value) return '';
    return text;
  }

  function fillFromSupplier(beneficiaryEl, supplierEl) {
    var text = chosenSupplierText(supplierEl);
    if (!text) return;
    /* اختيار مورد مختلف ينقل الاسم معه دائماً — ولو كان في الصندوق نص
       قديم مختلف؛ إبقاء الاسم القديم يُبقي الخلاف نفسه الذي جاء هذا
       الملف لإصلاحه. الصندوق يبقى قابلاً للتعديل بعدها، لا يُقفَل أبداً.
       Picking a different supplier always moves the name with it — even
       over old typed text; keeping the old text would leave the very
       disagreement this file exists to fix. The box stays editable
       afterwards, never locked. */
    beneficiaryEl.value = text;
    /* الحدث الاصطناعي اللازم — انظر شرح الملف أعلاه. Never our own event
       loops back here: this dispatch targets "beneficiary", and the
       listener below only ever acts on "supplier"/"payeeType". */
    beneficiaryEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function attach() {
    var form = document.getElementById('entForm');
    if (!form) return; /* نافذة بلا نموذج (تأكيد/سؤال) — لا شأن لنا بها */

    var payeeTypeEl = form.querySelector('select[name="payeeType"]');
    var beneficiaryEl = form.querySelector('input[name="beneficiary"]');
    var supplierEl = form.querySelector('select[name="supplier"]');
    /* اكتشاف الشكل — غياب أيّ من الثلاثة يعني ليس نموذج دفع. Shape
       detection — missing any one of the three means this is not a
       payee form. */
    if (!payeeTypeEl || !beneficiaryEl || !supplierEl) return;

    /* مستمع واحد مفوَّض على #entForm — لا على الصناديق فرادى، ليبقى
       صالحاً حتى لو أُعيد رسم جزء من النموذج لاحقاً.
       ONE delegated listener on #entForm — never on individual boxes, so
       it survives any later partial re-render. */
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.name) return;

      if (t.name === 'supplier') {
        if (!t.value) return; /* تفريغ القائمة — لا نمحو اسماً مكتوباً أبداً */
        if ((payeeTypeEl.value || 'supplier') !== 'supplier') return;
        fillFromSupplier(beneficiaryEl, supplierEl);
        return;
      }

      if (t.name === 'payeeType') {
        /* تغيّر النوع إلى «مورد» ومورد مختار سلفاً وخانة الاسم ما زالت
           فارغة — يغطي ترتيب الإدخال المعاكس، ولا يمحو أبداً نصاً كتبه
           الكاتب بيده لمجرد تبديل النوع. Covers the reverse entry order;
           never overwrites hand-typed text on a mere type change. */
        if (t.value !== 'supplier') return;
        if (!supplierEl.value || beneficiaryEl.value) return;
        fillFromSupplier(beneficiaryEl, supplierEl);
        return;
      }
      /* كل شيء آخر — بما فيه حدثنا الاصطناعي على beneficiary — يُتجاهَل.
         لا حلقة ممكنة: لا نتصرّف إلا على تغيّر supplier أو payeeType.
         Everything else — including our own synthetic event on
         beneficiary — is ignored. No loop possible: we only act on
         supplier/payeeType changes. */
    });
  }

  /* لفّ UI.modal بنفس نمط screen-behaviour.js:107-152 — نعدّل onOpen قبل
     المناداة، ونمرّر عبر الأصلية دون تغيير أي سلوك آخر. تعديل السجل
     الحالي عند الفتح غير موجود عمداً: لا شيء يفعله هذا الملف عند فتح
     سجل قديم للتعديل، فالسجلات القديمة لا تُعاد كتابتها بالعرض أبداً.
     Wrap UI.modal, same composition pattern as screen-behaviour.js:
     107-152 — mutate onOpen before calling through, changing nothing
     else. Deliberately nothing fires on opening an EXISTING record for
     edit — historical records are never rewritten by display. */
  var origModal = global.UI.modal;
  global.UI.modal = function (opts) {
    opts = opts || {};
    var origOnOpen = opts.onOpen;
    opts.onOpen = function () {
      if (origOnOpen) origOnOpen();
      try { attach(); } catch (e) { /* الملء تحسين، لا يجوز أن يكسر فتح النافذة */ }
    };
    return origModal.apply(global.UI, arguments);
  };

})(typeof window !== 'undefined' ? window : this);
