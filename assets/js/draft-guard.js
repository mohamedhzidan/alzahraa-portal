/* =========================================================================
   draft-guard.js — «مسودة» لا تَعِد بما ترفضه قاعدة البيانات
                    "DRAFT" NO LONGER PROMISES WHAT THE DATABASE REFUSES
   -------------------------------------------------------------------------
   العطل · THE BUG (notnull-family-sweep.js part B، ١٧٤ عمود)

   save-modes.js:52-59 (withoutRequired) يُعطِّل الحقول المطلوبة مؤقتاً
   أثناء حفظ «مسودة»/«مسودة حتى الاتصال» — منطقي: المسودة ناقصة بالتعريف.
   لكن ١٧٤ من هذه الحقول عبر نحو خمسين شاشة هي أعمدة NOT NULL بلا قيمة
   افتراضية في القاعدة الحقيقية (مُستخرجة من ملفات SQL الإنتاج نفسها —
   TESTS/generate-db-hard-columns.js). القاعدة لا تعرف ولا تهتمّ أن الحقل
   «required» أُطفئ مؤقتاً في المتصفح؛ ترفض الصف بصمت المستخدم، الذي رأى
   رسالة نجاح «حُفظت كمسودة» قبل لحظات. rfi.replyDue الحقيقي في الإنتاج
   (٢٦ أغسطس ٢٠٢٦) هو المثال المُثبَت لهذا بالحرف.

   THE BUG (notnull-family-sweep.js part B, 174 columns). save-modes.js:
   52-59 (withoutRequired) temporarily disables required fields while
   saving a "draft"/"draft until connected" — reasonable: a draft is
   unfinished by definition. But 174 of those fields, across roughly
   fifty screens, are NOT-NULL columns with no default in the real
   database (extracted from the real production SQL files —
   TESTS/generate-db-hard-columns.js). The database neither knows nor
   cares that "required" was switched off in the browser for a moment; it
   refuses the row silently, to a user who saw a "saved as a draft"
   success message seconds earlier. The real production rfi.replyDue row
   (26 August 2026) is the proven, literal example.

   -------------------------------------------------------------------------
   الإصلاح المتعمَّد · THE DELIBERATE CHOICE

   لا SQL هنا إطلاقاً. عقد القاعدة يبقى كما هو — المتصفح هو من يتوقف عن
   الوعد بما لا يمكن الوفاء به. الحقول التي تسمح بها القاعدة فعلاً
   (الجداول الـ٣٤ التي لا SQL منشور لها بعد) تمرّ بلا اعتراض — الصمت هنا
   أمانة: راجع refusal-explain.js لما تبقّى.

   Deliberately NO SQL here. The database's contract stays exactly as it
   is — the browser is the one that stops promising what it cannot
   deliver. Fields the database genuinely allows (the 34 tables with no
   published SQL yet) pass through untouched — the silence here is
   honest: see refusal-explain.js for what remains.

   -------------------------------------------------------------------------
   لماذا يجب أن يسبق save-modes.js في الترتيب · WHY IT MUST LOAD BEFORE
   save-modes.js

   كلا الملفَّين يلفّان UI.modal. لو حُمِّل هذا الملف قبل save-modes.js،
   يصبح لفّنا الداخلي: save-modes.js (الأحدث تحميلاً) يُستدعى أولاً، وهو
   من يُضيف زرَّي «مسودة» إلى opts.buttons عبر splice في المصفوفة نفسها
   (save-modes.js:655) قبل أن ينادي الأصلية — أي نسخته من UI.modal التي
   كنا لففناها نحن. فحين يصل الاستدعاء إلينا، opts.buttons يحمل الزرّين
   بالفعل، فنستطيع لفّ onClick كل منهما قبل أن يُرسَما فعلياً في ui.js.

   Both files wrap UI.modal. If this file loads before save-modes.js, our
   wrap becomes the inner one: save-modes.js (loaded later) is called
   first, and it is the one that splices the two "Draft" buttons into
   opts.buttons (save-modes.js:655) before calling the original — which is
   our own wrapped version of UI.modal. So by the time the call reaches
   us, opts.buttons already carries both buttons, and we can wrap each
   one's onClick before it is actually drawn by ui.js.

   -------------------------------------------------------------------------
   القراءة · WHAT IS READ, AND HOW

   نطابق الزرّين بنفس نص التسمية الحرفي في save-modes.js (لا يوجد زرّ آخر
   في الموقع بهذا النص — تحقّقنا بالبحث). نحدّد الوحدة (module) من عنوان
   النافذة بنفس أسلوب المطابقة في save-modes.js:666-677 (دالة صغيرة
   منسوخة، لا مُصدَّرة — قاعدة ١٧). لكل عمود «صعب» في جدول تلك الوحدة
   (TESTS/generate-db-hard-columns.js → db-hard-columns.js) نقرأ القيمة
   مباشرة من عنصر الـDOM المطابق داخل #entForm — بنفس فحص entity.js:795
   للفراغ. عمود صعب بلا عنصر DOM إطلاقاً (لا حقل له على الشاشة) خارج
   نطاق هذا الحارس عمداً: ١٧٤ العمود المستهدفة هنا كلها لها حقل حقيقي على
   الشاشة، وإنما required تُطفأ مؤقتاً لحفظ المسودة فقط — هذا بالضبط ما
   يمنعه هذا الملف.

   We match the two buttons by save-modes.js's exact literal label text
   (no other button anywhere in the portal uses that text — checked by
   search). The module is resolved from the window's title using the
   exact matching approach in save-modes.js:666-677 (a small copied
   function, not exported — rule 17). For every "hard" column of that
   module's table (TESTS/generate-db-hard-columns.js →
   db-hard-columns.js) we read the value straight from the matching DOM
   element inside #entForm — the same emptiness check as entity.js:795.
   A hard column with no DOM element at all (no screen field for it) is
   deliberately out of this guard's scope: the 174 columns targeted here
   all have a real screen field, and "required" is only switched off
   temporarily to save the draft — which is exactly what this file stops.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and both draft buttons
   return to promising an unconditional save, exactly as before —
   save-modes.js is not touched.

   يُحمَّل بعد db-hard-columns.js مباشرة، وقبل save-modes.js حتماً (السبب
   أعلاه).
   Load immediately after db-hard-columns.js, and necessarily before
   save-modes.js (reason above).
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }

  /* نفس مطابقة العنوان بالضبط في save-modes.js:666-677 — محلية هناك ولا
     تُصدَّر (قاعدة ١٧: نسخ دالة صغيرة أوفق من إعادة لصق ٧٤٠ سطراً). */
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

  function hardColumnsFor(table) {
    return (global.DbHardColumns && global.DbHardColumns[table]) || [];
  }

  function emptyHardFields(mod) {
    var missing = [];
    hardColumnsFor(mod.table).forEach(function (col) {
      var el = document.querySelector('#entForm [name="' + col + '"]');
      if (!el) return;   /* لا حقل على الشاشة — خارج نطاق هذا الحارس، انظر التعليق أعلاه */
      var v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
      if (v === undefined || v === null || String(v).trim() === '') {
        var f = (mod.fields || []).filter(function (x) { return x.name === col; })[0];
        missing.push(f ? L(f.label) : col);
      }
    });
    return missing;
  }

  function guard(btn, opts) {
    var orig = btn.onClick;
    if (typeof orig !== 'function' || btn.__azDraftGuarded) return;
    btn.__azDraftGuarded = true;
    btn.onClick = function () {
      var mod = currentModule(opts);
      if (mod) {
        var missing = emptyHardFields(mod);
        if (missing.length) {
          if (global.UI && UI.toast) {
            UI.toast(L({
              ar: 'لا يمكن حفظ المسودة — الحقل التالي إجباري في قاعدة البيانات ولا يقبل ' +
                  'قيمة فارغة حتى في مسودة: «' + missing.join('، ') + '». أكمله ثم احفظ.',
              en: 'Cannot save as a draft — the following field is required by the database, ' +
                  'even for a draft: "' + missing.join(', ') + '". Fill it in, then save.'
            }), 'error', 9000);
          }
          return false;
        }
      }
      return orig.apply(this, arguments);
    };
  }

  function wrapModal() {
    if (!global.UI || !UI.modal || UI.__azDraftGuardWrapped) return;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      try {
        if (opts && Array.isArray(opts.buttons)) {
          opts.buttons.forEach(function (b) {
            if (!b || typeof b.label !== 'string' || !b.keepOpen) return;
            var isDraft = b.label === (isAr() ? 'مسودة' : 'Draft') && b.cls === 'btn-outline';
            var isQueue = b.label === (isAr() ? 'مسودة حتى الاتصال' : 'Draft until connected') && b.cls === 'btn-gold';
            if (isDraft || isQueue) guard(b, opts);
          });
        }
      } catch (e) { console.warn('[draft-guard] could not wrap the draft buttons', e); }
      return origModal.apply(UI, arguments);
    };
    UI.__azDraftGuardWrapped = true;
  }

  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapModal, ms); });
  document.addEventListener('DOMContentLoaded', wrapModal);
  wrapModal();

  global.DraftGuard = { emptyHardFields: emptyHardFields };
})(window);
