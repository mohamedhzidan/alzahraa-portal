/* =========================================================================
   user-dialog-guard.js — يمنع زرّي «مسودة» من الظهور على أي نافذة لا
                          تخصّ سجلاً في المخطط — المستخدمون هي الحالة
                          المُثبَتة اليوم
                          Strips the two "draft" buttons from any dialog
                          that is not backed by a schema record — the
                          Users dialog is today's proven case
   -------------------------------------------------------------------------
   الكذبة المُثبَتة التي يمنعها هذا الملف — بتجربة حقيقية (BUG-LEDGER.md،
   دفعة ٢٧ أغسطس ٢٠٢٦، run 4، TARGET 2،
   TESTS/users-new-draft-buttons-trial.js 25/25)
   THE PROVEN LIE THIS FILE PREVENTS — real trial (BUG-LEDGER.md, 27 Aug
   2026, run 4, TARGET 2, TESTS/users-new-draft-buttons-trial.js 25/25)

   save-modes.js:501 يطابق أي زر أساسي (btn-primary) مع keepOpen يحمل
   تسمية الحفظ نفسها — settings.js:339 (نافذة «المستخدمون والصلاحيات»)
   يطابق هذا الشكل تماماً رغم أنه ليس نموذج سجل في المخطط إطلاقاً، فيحقن
   save-modes.js زرَّي «مسودة» و«مسودة حتى الاتصال» فيها. الضغط على
   «مسودة» ببيانات مكتملة **يُنشئ حساباً حقيقياً حياً فعلاً عبر Edge
   Function admin-users** — تظهر رسالة نجاح كاذبة «حُفظ بالكامل…» قبل أن
   يردّ الخادم، ثم رسالة ثانية متناقضة، وتُطبع كلمة مرور مؤقتة لحساب دخول
   حقيقي. «مسودة حتى الاتصال» تسلك نفس المسلك تماماً بلا أي طابور فعلي
   (هذه النافذة لا تنادي Store.save/create إطلاقاً). بيانات فارغة تُرفض
   وتُظهر رسالة نجاح كاذبة في اللحظة نفسها. الوحيد الآمن هنا هو زر «حفظ»
   الأصلي — والزرّان الإضافيان كذبة كاملة على هذه النافذة تحديداً.

   save-modes.js:501 matches ANY primary (btn-primary) keepOpen button
   carrying the exact save label — settings.js:339 (the "Users &
   permissions" dialog) matches that shape exactly even though it is not
   a schema record form at all, so save-modes.js injects "Draft" and
   "Draft until connected" into it too. Pressing "Draft" with filled data
   **creates a REAL, LIVE account through the admin-users Edge Function**
   — a false "saved in full" success toast fires before the server even
   answers, followed by a second, contradictory toast, and a temporary
   password for a real login prints. "Draft until connected" behaves
   identically with no real queue at all (this dialog never calls
   Store.save/create). Empty data is refused while showing the same false
   success toast at the same moment. The only honest button here is the
   original "Save" — the two extra ones are a complete lie on this
   specific dialog.

   -------------------------------------------------------------------------
   لماذا ملف إضافي لا تعديل تسمية الزر · WHY AN ADDITIVE FILE, NOT RENAMING
   THE BUTTON LABEL

   الإصلاح الأصغر (تسمية settings.js:339 من t('g.save') إلى نص آخر) يغيّر
   ما يراه محمد زيدان على الشاشة — قرار تصميم يحتاج موافقته (قاعدة ١٩).
   هذا الملف الإضافي يُصلح نفس الكذبة بلا تغيير أي نص مرئي على أي نافذة
   تخصّ سجلاً حقيقياً في المخطط؛ حذفه يعيد الزرّين الكاذبين على نافذة
   المستخدمين بالضبط كما كانا.

   The smallest fix (renaming settings.js:339's label away from
   t('g.save')) changes what Mohamed Zidan sees on screen — a design
   decision needing his say (rule 19). This additive file fixes the same
   lie without changing a single visible word on any dialog that DOES
   belong to a real schema record; deleting it restores the two lying
   buttons on the Users dialog exactly as they were.

   -------------------------------------------------------------------------
   كيف يُميَّز · HOW IT TELLS THE DIFFERENCE

   نفس مطابقة العنوان بالضبط في save-modes.js:666-677 (نسخة محلية أخرى،
   قاعدة ١٧: دالة صغيرة منسوخة أوفق من إعادة لصق ٧٤٠ سطراً — draft-guard.js
   تحمل النسخة نفسها بالفعل). عنوان لا يُطابق أي تسمية وحدة في
   Schema.MODULES = نافذة لا تخصّ سجلاً؛ الحالة الوحيدة المُثبَتة اليوم
   بهذا الشكل في كل الموقع هي «جديد/تعديل — المستخدمون والصلاحيات»
   (settings.js:339).

   Exactly save-modes.js:666-677's own title-matching (another local
   copy, rule 17: a small copied function beats re-pasting 740 lines —
   draft-guard.js already carries the identical copy). A title matching
   no module label in Schema.MODULES = a dialog with no backing record;
   the only proven case of this shape anywhere in the portal today is
   "New/Edit — Users & permissions" (settings.js:339).

   -------------------------------------------------------------------------
   لماذا يجب أن يسبق save-modes.js — الأصغر ترتيباً (الأعمق لفّاً)
   WHY IT MUST LOAD BEFORE save-modes.js — EARLIEST IN ORDER (THE
   INNERMOST WRAP)

   نفس المنطق المشروح بالكامل في draft-guard.js: save-modes.js (المُحمَّل
   لاحقاً) هو الذي يُدخِل الزرّين إلى opts.buttons عبر splice قبل مناداة
   الأصلية — أي نسخته من UI.modal التي لفَّها هذا الملف. فحين يصل
   الاستدعاء إلينا يحمل opts.buttons الزرّين بالفعل، فنستطيع حذفهما قبل
   أن يُرسَما في ui.js. الترتيب بين هذا الملف وdraft-guard.js لا يهمّ (كل
   منهما مستقلّ تماماً عن الآخر ولا يقرأ ما فعله الآخر)، وكلاهما يجب أن
   يسبق save-modes.js.

   Exactly the logic already explained in full in draft-guard.js:
   save-modes.js (loaded later) is the one that splices the two buttons
   into opts.buttons before calling the original — which is our own
   wrapped version of UI.modal. By the time the call reaches us,
   opts.buttons already carries both buttons, so we can remove them
   before they are ever drawn by ui.js. The order between this file and
   draft-guard.js does not matter (each is fully independent and reads
   nothing the other does), and both must precede save-modes.js.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود زرّا «مسودة» و«مسودة
   حتى الاتصال» إلى الظهور على نافذة المستخدمين (وأي نافذة مستقبلية
   بالشكل نفسه) بالضبط كما كانا — save-modes.js وdraft-guard.js وsettings.js
   لا يُلمس واحد منها بحرف.
   ADDITIVE. Delete this file and both "Draft" buttons return to
   appearing on the Users dialog (and any future dialog of the same
   shape) exactly as before — save-modes.js, draft-guard.js and
   settings.js are not touched by one character.

   يُحمَّل مع كتلة db-hard-columns.js/draft-guard.js، قبل save-modes.js.
   Loads with the db-hard-columns.js/draft-guard.js block, before
   save-modes.js.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }

  /* نفس مطابقة العنوان بالضبط في save-modes.js:666-677 وdraft-guard.js —
     محلية هنا أيضاً، لا تُصدَّر (قاعدة ١٧).
     Exactly save-modes.js:666-677's / draft-guard.js's own title match —
     local here too, not exported (rule 17). */
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

  /* مطابقة الزرّين بنفس نص التسمية الحرفي في save-modes.js — لا زرّ آخر
     في الموقع بهذا الشكل (تحقّق بالبحث)، ونفس المطابقة المستعملة في
     draft-guard.js.
     Matches the two buttons by save-modes.js's exact literal label text
     — no other button in the portal has this shape (checked by search),
     the same match draft-guard.js already uses. */
  function isDraftButton(b) {
    if (!b || typeof b.label !== 'string' || !b.keepOpen) return false;
    if (b.label === (isAr() ? 'مسودة' : 'Draft') && b.cls === 'btn-outline') return true;
    if (b.label === (isAr() ? 'مسودة حتى الاتصال' : 'Draft until connected') && b.cls === 'btn-gold') return true;
    return false;
  }

  function wrapModal() {
    if (!global.UI || !UI.modal || UI.__azUserDialogGuardWrapped) return;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      try {
        if (opts && Array.isArray(opts.buttons) && !currentModule(opts)) {
          /* عنوان لا يطابق أي وحدة — نافذة بلا سجل خلفها، فتُحذف كذبة
             «المسودة» منها تحديداً (لا تُمسّ أي أزرار أخرى).
             A title matching no module — a dialog with no record behind
             it, so the "draft" lie is stripped from it specifically (no
             other button is touched). */
          opts.buttons = opts.buttons.filter(function (b) { return !isDraftButton(b); });
        }
      } catch (e) { console.warn('[user-dialog-guard] could not inspect the dialog buttons', e); }
      return origModal.apply(UI, arguments);
    };
    UI.__azUserDialogGuardWrapped = true;
  }

  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapModal, ms); });
  document.addEventListener('DOMContentLoaded', wrapModal);
  wrapModal();
})(window);
