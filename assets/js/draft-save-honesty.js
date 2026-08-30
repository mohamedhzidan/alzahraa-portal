/* =========================================================================
   draft-save-honesty.js — «تم الحفظ» لا يكفي حين يظلّ السجل مسودة
   draft-save-honesty.js — "Saved" is not enough while the record is a draft

   ── ما أبلغ عنه المالك (٣٠ أغسطس ٢٠٢٦) ─────────────────────────────────
   أنشأ سجلاً بـ«مسودة حتى الاتصال» وهو غير متصل ← عاد الاتصال ← حدّث ←
   السجل موجود وحالته «مسودة» ← فتحه وعدّله وحفظه بالحفظ العادي ← ظهرت
   «تم الحفظ» ← وظلّ السجل «مسودة». فظنّ أن الحفظ لا يعمل.

   ── الحقيقة، مُثبَتة بالتشغيل (TESTS/offline-draft-stuck-trial.js 35/0) ──
   الحفظ يعمل تماماً ومحتواه محفوظ (الفحص B.4). «مسودة» ليست تحذيراً من
   فشل الحفظ — هي **حالة الاعتماد**. وsave-modes.js:467-479 يُمرِّر الحفظ
   العادي إلى أصله دون أن يلمس status إطلاقاً، فلا يستطيع أبداً إخراج
   السجل من «مسودة». الطريق الوحيد هو زرّ **تقديم** في دورة الاعتماد
   (workflow.js:4 و:47) — ونافذة الحفظ لا تذكره للمستخدم إطلاقاً.

   فالعطل ليس في الحفظ ولا في مسار مفقود: العطل أن الرسالة تقول نصف
   الحقيقة، فيقرأ الموظف «تم الحفظ» على أنها «تمّ كل شيء».

   ── ماذا يفعل هذا الملف ─────────────────────────────────────────────────
   لا يغيّر أي قاعدة اعتماد، ولا يرفع أي سجل، ولا يلمس status أبداً.
   يغيّر **الكلام فقط**: بعد حفظ عادي لسجل في شاشة اعتماد وهو ما زال
   «مسودة»، تصير الرسالة تقول ذلك وتشير إلى «تقديم».

   🔴 ما لا يفعله عمداً: لا يرقّي المسودة تلقائياً. ذلك يغيّر **متى** تدخل
   السجلات دورة الاعتماد، وهي قاعدة عمل تخصّ صاحب الشركة وحده (القاعدة ١٩)
   — مرفوعة إليه كسؤال، وتوصيتي: لا.

   ── لماذا لُفَّت هذه الدوال بالذات ──────────────────────────────────────
   الرسالة تُطلق من entity.js:841 داخل commit()، وهي دالة **محلية داخل
   الإغلاق** في ملف على قائمة القراءة فقط — لا يمكن لفّها ولا تعديلها.
   فنلتقط الحدث من طرفيه بدل ذلك:
     ١) لفّ Store.save/Store.create — هناك نعرف الجدول والبيانات، فنعرف
        أن ما حُفظ للتوّ سجلٌ في شاشة اعتماد وحالته «مسودة».
     ٢) لفّ UI.toast — هناك نستبدل الرسالة العامة بالرسالة الصادقة.
   العلم بينهما عمره ثانيتان، فلا يمكن أن يلتقط رسالة لاحقة لا علاقة لها.

   🔴 نستعمل m.workflow **وقت التشغيل** لا كما هو مكتوب في departments.js:
   workflow-policy.js:117 يضع m.workflow = false على شاشات طبقة RECORD عند
   التحميل (شاشات أ. أحمد الأربع منها)، وتلك الشاشات لا تُختم «مسودة»
   إطلاقاً — فلا يجوز أن تتكلّم هذه الرسالة عنها. مُثبَت في القسم D2 من
   TESTS/offline-draft-stuck-trial.js.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The owner saved a record offline, reconnected, edited it, saved normally,
   saw "Saved" — and it still read «مسودة». He concluded saving was broken.

   It was not: his content saved (trial check B.4). «مسودة» is the APPROVAL
   state. A normal Store.save passes straight through (save-modes.js:467-479)
   and never touches status, so it can never promote a record out of draft.
   Only the workflow **submit** does (workflow.js:4, :47) — and the save
   window never mentions it. The fault is a message telling half the truth.

   This file changes WORDING ONLY. No approval rule, no upload, never touches
   status. It deliberately does NOT auto-promote drafts — that changes WHEN
   records enter approval and is the owner's ruling (rule 19), not ours.

   Why these two wraps: the toast fires from entity.js:841 inside commit(), a
   closure-local function in a read-only file — it can be neither wrapped nor
   edited. So we catch the event at both ends: Store.save/create tells us a
   workflow record was just saved still in draft; UI.toast is where the
   generic message gets replaced. The flag between them lives two seconds, so
   it can never colour an unrelated later toast.

   We read m.workflow AT RUNTIME, not as written in departments.js:
   workflow-policy.js:117 sets m.workflow = false on RECORD-tier screens at
   load (all four of Ahmed's document screens), and those never stamp drafts
   at all — so this message must never speak about them. Proven in section D2
   of TESTS/offline-draft-stuck-trial.js.

   مُثبَت بالتشغيل / proven by running: TESTS/draft-save-honesty-trial.js
   (v2.0.28)
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || global.Store.__draftHonestyInstalled) return;

  var FLAG_MS = 2000;
  var pending = null;     /* { at, moduleLabel } */

  function L(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    var ar = global.I18N && I18N.getLang && I18N.getLang() === 'en' ? v.en : v.ar;
    return ar || v.ar || v.en || '';
  }
  function isAr() {
    return !(global.I18N && I18N.getLang && I18N.getLang() === 'en');
  }

  /* الوحدة الخاصة بجدول ما — بعلم workflow وقت التشغيل
     The module for a table — with the RUNTIME workflow flag */
  function moduleForTable(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    for (var i = 0; i < Schema.MODULES.length; i++) {
      if (Schema.MODULES[i].table === table) return Schema.MODULES[i];
    }
    return null;
  }

  function noteIfDraft(table, data) {
    try {
      var mod = moduleForTable(table);
      if (!mod || !mod.workflow) return;          /* طبقة RECORD: لا تتكلّم */
      var status = data && data.status;
      if (status && status !== 'draft') return;   /* تجاوز المسودة بالفعل */
      /* حالة فارغة على شاشة اعتماد تعني «مسودة» فعلياً (workflow.js:45) */
      pending = { at: Date.now(), moduleLabel: L(mod.label) };
    } catch (e) { /* لا نُفشل حفظاً لأجل رسالة · never fail a save for a message */ }
  }

  var origSave = Store.save;
  Store.save = function (table, id, data) {
    noteIfDraft(table, data);
    return origSave.apply(Store, arguments);
  };

  var origCreate = Store.create;
  Store.create = function (table, data) {
    noteIfDraft(table, data);
    return origCreate.apply(Store, arguments);
  };

  Store.__draftHonestyInstalled = true;

  /* ── استبدال الرسالة ─────────────────────────────────────────────────
     نستبدل فقط الرسالة العامة «تم الحفظ بنجاح». أي رسالة أخرى — خطأ،
     تحذير، رسالة الطابور «تم حفظ المسودة على هذا الجهاز…» — تمرّ كما هي،
     لأن تلك الأخيرة صادقة أصلاً ولا تحتاج إصلاحاً.
     We replace ONLY the generic "Saved successfully". Anything else — an
     error, a warning, the queue message "Draft saved on this device…" —
     passes through untouched, because that one is already truthful. */
  function installToastWrap() {
    if (!global.UI || typeof UI.toast !== 'function' || UI.__draftHonestyToast) return false;
    var origToast = UI.toast;
    UI.toast = function (msg, kind, ms) {
      try {
        var fresh = pending && (Date.now() - pending.at) < FLAG_MS;
        var generic = global.I18N && typeof I18N.t === 'function' ? I18N.t('g.saved') : null;
        var isGeneric = typeof msg === 'string' && generic && msg === generic;
        if (fresh && isGeneric) {
          pending = null;
          var better = isAr()
            ? 'تم حفظ التعديل. السجل ما زال «مسودة» — اضغط «تقديم» لإرساله للاعتماد.'
            : 'Your changes are saved. The record is still a draft — press "Submit" to send it for approval.';
          return origToast.call(UI, better, kind || 'success', ms || 6000);
        }
      } catch (e) { /* أي خطأ هنا لا يجوز أن يبتلع رسالة · never swallow a toast */ }
      return origToast.apply(UI, arguments);
    };
    UI.__draftHonestyToast = true;
    return true;
  }

  if (!installToastWrap() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', installToastWrap);
    setTimeout(installToastWrap, 1500);
  }

  global.DraftSaveHonesty = {
    isPending: function () { return !!(pending && (Date.now() - pending.at) < FLAG_MS); },
    __installToastWrap: installToastWrap
  };
})(window);
