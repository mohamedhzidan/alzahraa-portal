/* =========================================================================
   date-sanity.js — تحذير فقط: «السنة بعيدة عن اليوم — متأكد؟»
                    WARN-ONLY: "That year is far from today — are you sure?"
   -------------------------------------------------------------------------
   العطل · THE BUG

   notnull-family-sweep.js part D أثبت: pages/entity.js يرسم كل حقل من
   نوع date كـ <input type="date"> بلا min ولا max (entity.js:595-600)،
   وrules.js لا يملك أي حارس لسنة على الإطلاق. النتيجة: صف حقيقي حمل
   تاريخاً 2011-02-02 كُتب في 2026 ومرّ من كل طبقة بصمت — عبر ١١٥ حقل
   تاريخ في ٦٠ شاشة، لا حادثة واحدة.

   notnull-family-sweep.js part D proved it: pages/entity.js renders every
   date-type field as <input type="date"> with no min or max
   (entity.js:595-600), and rules.js has no year guard whatsoever. Result:
   a real row carried the date 2011-02-02, typed in 2026, and sailed
   through every layer silently — across 115 date fields on 60 screens,
   not a single warning.

   -------------------------------------------------------------------------
   لماذا تحذير فقط، ولا يمسّ الحفظ إطلاقاً · WHY WARN-ONLY, AND NEVER
   TOUCHES SAVING

   الحفظ الحقيقي يمرّ أحياناً بطريق «راجعتُ وأتحمّل المسؤولية» — تنبيه ثم
   commit مؤجَّل (pages/entity.js:817-828 → showGuard → onProceed).
   وsave-modes.js:511-517/564-568 (زرّا «مسودة») يضبطان MODE ثم يستدعيان
   runSave ويعيدان MODE فوراً في finally — قبل أن يضغط المستخدم زر
   المتابعة في نافذة التأكيد المؤجَّلة. فلو اعترض هذا الملف مسار الحفظ أو
   Rules بأي شكل، لصار حفظ «مسودة» يتحوّل صامتاً إلى حفظ عادي كامل في تلك
   اللحظة الدقيقة — عطل أخطر بكثير مما يحاول هذا الملف حله. لذلك: قراءة
   الـDOM وحدها، وحقن نص تنبيهي وحده، ولا شيء آخر أبداً.

   The real save path sometimes goes through "I have checked — save
   anyway" — a warning, then a deferred commit
   (pages/entity.js:817-828 → showGuard → onProceed). And
   save-modes.js:511-517/564-568 (the two "Draft" buttons) set MODE, call
   runSave, and reset MODE immediately in a finally block — before the
   user even presses the confirm dialog's proceed button. So if this file
   touched the save path or Rules in any way, a "draft" save could
   silently turn into a full normal save at that exact moment — a far
   worse bug than the one this file is fixing. Hence: reading the DOM
   only, injecting a warning span only, and nothing else, ever.

   -------------------------------------------------------------------------
   الأسلوب · THE TECHNIQUE

   مستمع change واحد على document بمرحلة الالتقاط (capture)، مُفوَّض
   (delegated) — لا حاجة للفّ أي شيء ولا لمراقبة #modalHost، لأن حقول
   التاريخ تولد وتموت مع كل فتح/إغلاق نافذة، ومستمع على document يعمل
   بصرف النظر عن توقيت رسمها.

   One delegated change listener on document, in the capture phase — no
   need to wrap anything or watch #modalHost, because date fields are
   born and die with every window open/close, and a document-level
   listener works regardless of when they were drawn.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the warning span never
   appears again — no field, no validation and no save path changes at all.

   يُحمَّل قبل version-badge.js (آخر ملف في القائمة عمداً — لا علاقة
   وظيفية، فقط لضمان مكان ثابت ومعروف في نهاية القائمة).
   Load before version-badge.js (deliberately the last file in the list —
   no functional relationship, just a fixed, known place near the end).
   ========================================================================= */
(function (global) {
  'use strict';

  var THRESHOLD_YEARS = 2;
  var CLASS = 'az-date-sanity-warn';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

  function yearOf(value) {
    if (!value || value.length < 4) return NaN;
    return parseInt(value.slice(0, 4), 10);
  }

  function check(input) {
    var label = input.closest ? input.closest('label.field') : null;
    if (!label) return;
    var existing = label.querySelector('.' + CLASS);

    var y = yearOf(input.value);
    var now = new Date().getFullYear();
    var suspicious = input.value && !isNaN(y) && Math.abs(y - now) > THRESHOLD_YEARS;

    if (!suspicious) {
      if (existing) existing.remove();
      return;
    }

    if (!existing) {
      existing = document.createElement('span');
      existing.className = CLASS + ' field-hint';
      existing.setAttribute('style', 'color:#B8860B;display:block');
      label.appendChild(existing);
    }
    existing.textContent = isAr()
      ? 'السنة بعيدة عن اليوم — متأكد؟ (' + y + ')'
      : 'That year is far from today — are you sure? (' + y + ')';
  }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.tagName || t.tagName !== 'INPUT' || t.type !== 'date') return;
    if (!t.closest('#entForm')) return;   /* فقط داخل نموذج الإدخال، لا الفلاتر ولا التقارير */
    check(t);
  }, true);   /* التقاط: نعمل بصرف النظر عن أي stopPropagation لاحق */

  global.DateSanity = { check: check };
})(window);
