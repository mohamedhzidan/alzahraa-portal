/* =========================================================================
   save-mode-labels.js — زرّ «مسودة» لا يجوز أن يقول «مسودة» حيث لا مسودات
   save-mode-labels.js — the «Draft» button must not say «Draft» on a screen
                         where nothing becomes a draft

   ── العطل، وهو أسوأ من مجرّد اسم خاطئ ───────────────────────────────────
   على الشاشات المخفَّضة لطبقة السجل (workflow-policy.js:117 يضع
   m.workflow = false، ومنها شاشات أ. أحمد الأربع) لا يصير أي سجل «مسودة»
   إطلاقاً. ومع ذلك يعرض مُختار الحفظ زرّاً اسمه «مسودة».

   🔴 والأخطر — «التأكيد الكاذب»: كلمة «مسودة» تعني شيئين لا علاقة بينهما
   على سجل المستندات. الزرّ يقول «مسودة»، وحقل دورة حياة المستند
   (documentStatus) قيمته الافتراضية 'draft' فيُعرض «مسودة» في العمود
   **سواء ضغط الزرّ أم لم يضغطه**. فيضغط الموظف زرّاً لا يفعل ما يظنّه، ثم
   يرى كلمة تؤكّد له أنه فعله. **اختيارٌ بلا أثر يبدو مؤكَّداً** — وهذا
   أسوأ من غياب أي مؤشّر، لأن الغائب يُسأل عنه والكاذب لا.

   ── ما يفعله الزرّ فعلاً (ليس لا شيء) ───────────────────────────────────
   save-modes.js withoutRequired(mod, fn): يُلغي «مطلوب» عن كل الحقول
   مؤقتاً، يحفظ، ثم يعيدها. أي أن معناه الحقيقي على أي شاشة:
   **«احفظ هذا وإن كان ناقصاً»** — وهي قدرة نافعة، لا خيار ميت.
   ورسالة ما بعد الحفظ صادقة أصلاً على تلك الشاشات: «حُفظ بالكامل. هذه
   الشاشة بلا دورة اعتماد، فالسجل نشط…». الخلل الوحيد الباقي هو **الاسم
   المكتوب على الزرّ قبل الضغط**.

   ── ما يفعله هذا الملف ──────────────────────────────────────────────────
   يغيّر **الاسم فقط**، وبحسب حالة الشاشة وقت التشغيل. لا يلمس سلوكاً، ولا
   حالة، ولا صلاحية، ولا رسالة ما بعد الحفظ. حذف هذا الملف يعيد اليوم
   حرفياً.

   ── لماذا يُحمَّل قبل save-modes.js (عكس attach-from-form.js عمداً) ──────
   save-modes.js هو الذي يُنشئ الزرّين داخل لافّته لـUI.modal. فلكي نراهما
   يجب أن يلفّنا هو، لا أن نلفّه: يضيف أزراره إلى opts ثم ينادي ما تحته،
   فتصل إلينا opts وفيها الأزرار. لو حُمّلنا بعده لصرنا الأبعد وعملنا قبل
   وجود الأزرار أصلاً. (attach-from-form.js عكس ذلك تماماً: الأبعد، ويحقن
   بعد الرسم.)

   ── التعرّف على الزرّ ببنيته لا بنصّه ────────────────────────────────────
   🔴 لا نطابق نصّ الزرّ إطلاقاً. مطابقة النصّ العربي هي النمط الذي أثبت
   فشله في هذا المشروع (مِجسّ طابق «حالة الجو» على أنه عمود حالة). الزرّ
   المقصود وحيد بالبنية: cls === 'btn-outline' مع keepOpen === true —
   فالإلغاء 'btn-ghost'، والحفظ 'btn-primary'، وزرّ الطابور 'btn-gold'.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   On screens demoted to RECORD tier (workflow-policy.js:117 sets
   m.workflow = false — all four of Ahmed's document screens among them) no
   record ever becomes a draft. Yet the save chooser offers a button labelled
   «مسودة» / "Draft".

   🔴 Worse than a wrong name — FALSE CONFIRMATION: on the document register
   «مسودة» means two unrelated things. The button says «مسودة», and the
   document-lifecycle field (documentStatus) DEFAULTS to 'draft', which
   renders «مسودة» in the column WHETHER OR NOT he pressed the button. So he
   presses a button that does not do what he thinks, and then sees a word
   confirming that it did. An ineffective choice that appears confirmed is
   worse than a missing indicator: a missing one gets asked about, a lying
   one does not.

   The button is NOT dead there. withoutRequired(mod, fn) clears `required`
   on every field, saves, and restores it — so its real meaning on any screen
   is "save this even though it is incomplete", a useful capability. And the
   post-save toast is ALREADY honest on those screens ("Saved in full. This
   screen has no approval cycle…"). The only remaining fault is the NAME ON
   THE BUTTON, read before pressing.

   This file changes the LABEL ONLY, by the runtime tier. No behaviour, no
   status, no permission, no post-save message. Deleting it restores today
   exactly.

   Loaded BEFORE save-modes.js — deliberately the opposite of
   attach-from-form.js. save-modes creates the buttons inside its own
   UI.modal wrapper, so it must wrap US: it adds its buttons to opts and then
   calls through, so opts arrives here already carrying them. Loaded after, we
   would be outermost and would run before the buttons existed.

   🔴 The button is identified STRUCTURALLY, never by its text. Matching
   Arabic label text is the pattern already proven to fail here (a probe
   matched «حالة الجو» — the weather — as a status column). It is unique by
   shape: cls === 'btn-outline' with keepOpen === true; Cancel is
   'btn-ghost', Save 'btn-primary', the queue button 'btn-gold'.

   مُثبَت بالتشغيل / proven by running: TESTS/save-mode-labels-trial.js
   (v2.0.28)
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() {
    return !(global.I18N && I18N.getLang && I18N.getLang() === 'en');
  }
  function L(v) { return isAr() ? v.ar : v.en; }

  /* نفس طريقة save-modes في معرفة وحدة الشاشة من النافذة.
     ⚠️ هذه مطابقة نصّ عنوان، وهي هشّة ومسجَّلة في ROADMAP كبند قائم — لكننا
     نستعملها هنا للقراءة فقط ولغرض واحد: أي طبقة هذه الشاشة. أسوأ ما يحدث
     عند فشلها هو بقاء الاسم كما هو اليوم، أي لا ضرر جديد إطلاقاً.
     Same way save-modes identifies the module from the modal. ⚠️ This is
     title-text matching — fragile, and logged in ROADMAP as an open item —
     but used here read-only for one purpose: which tier this screen is. Its
     worst failure is leaving the label exactly as it is today, i.e. no new
     harm at all. */
  function moduleFromTitle(opts) {
    if (!global.Schema || !opts || !opts.title) return null;
    var title = String(opts.title);
    var found = null;
    (Schema.MODULES || []).forEach(function (m) {
      var lab = m.label ? L(m.label) : '';
      if (lab && title.indexOf(lab) !== -1) {
        if (!found || L(found.label).length < lab.length) found = m;
      }
    });
    return found;
  }

  /* 🔴 هذه النافذة نموذج تعديل، لا شاشة عرض؟
     كان هذا الملف يعرّف الزرّ بالشكل وحده (btn-outline + keepOpen)، وزعمتُ
     أن الشكل فريد. **لم يكن.** entity.js:401 يعطي زرّ «طباعة المستند
     الرسمي» على شاشة العرض الشكل نفسه بالضبط — فأعاد هذا الملف تسمية زرّ
     الطباعة إلى «حفظ ناقص» على خمس وثلاثين شاشة. أمسكته بوابة فحص مستقلة،
     لا أنا: تجربتي كانت تفحص الشكل ضد مجموعة أزرار **كتبتُها بنفسي** فيها
     أزرار save-modes وحدها، ولم تُجرَّب قط على أزرار شاشة عرض حقيقية.
     اختبار ضد نسختك من العالم ليس اختباراً.
     الفاصل الحقيقي ليس شكل الزرّ بل نوع النافذة: نموذج التعديل وحده يحمل
     <form id="entForm"> في جسمه (entity.js:514). فنفحص ذلك أولاً.
     🔴 Is this modal an EDIT FORM, not a VIEW screen?
     This file used to identify the button by shape alone (btn-outline +
     keepOpen), and I claimed that shape was unique. **It was not.**
     entity.js:401 gives the view screen's «طباعة المستند الرسمي» button
     exactly the same shape — so this file renamed the PRINT button to
     «حفظ ناقص» on thirty-five screens. An independent gate caught it, not
     me: my trial checked the shape against a button set **I wrote myself**,
     containing only save-modes' buttons, and was never run against a real
     view modal's buttons. A test against your own version of the world is
     not a test.
     The real discriminator is not the button's shape but the modal's kind:
     only the edit form carries <form id="entForm"> in its body
     (entity.js:514). So we check that first. */
  function isEditFormModal(opts) {
    return !!(opts && typeof opts.body === 'string' &&
              opts.body.indexOf('id="entForm"') !== -1);
  }

  /* الزرّ المقصود، بالبنية وحدها — داخل نموذج تعديل فقط
     the button, by shape alone — inside an edit form only */
  function findDraftButton(buttons) {
    if (!Array.isArray(buttons)) return -1;
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (b && b.cls === 'btn-outline' && b.keepOpen === true &&
          typeof b.onClick === 'function') return i;
    }
    return -1;
  }

  function install() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__saveModeLabelsInstalled) return false;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      try {
        /* 🔴 شاشات العرض لا تُمسّ إطلاقاً — هنا يعيش زرّ الطباعة
           VIEW modals are never touched — the Print button lives there */
        if (opts && Array.isArray(opts.buttons) && isEditFormModal(opts)) {
          var i = findDraftButton(opts.buttons);
          if (i !== -1) {
            var mod = moduleFromTitle(opts);
            /* mod.workflow وقت التشغيل — بعد تخفيض workflow-policy.js
               the RUNTIME flag, after workflow-policy.js's demotion */
            if (mod && !mod.workflow) {
              /* 🔴 كان هنا وصف `title` يشرح الزرّ عند مرور الفأرة — وحُذف،
                 لأن ui.js:107-114 يضبط className وtextContent وdisabled
                 وonclick فقط، ولا ينسخ title إلى الزرّ إطلاقاً. فكان الشرح
                 موجوداً في الكائن ولا يصل الشاشة أبداً. وui.js على قائمة
                 القراءة فقط، فلا نُصلحه لأجل تلميح.
                 خاصية لا يعرضها شيء ليست ميزة — هي طمأنةٌ كاذبة للقارئ
                 التالي، يظنّ أن الشرح موصول وهو ليس كذلك. المعنى يحمله
                 الاسم نفسه «حفظ ناقص»، ثم رسالة ما بعد الحفظ الصادقة في
                 save-modes.js. أمسكت هذا بوابةٌ مستقلة: تجربتي كانت تؤكّد
                 أن title مضبوط على الكائن، لا أنه يظهر للموظف — أي أنها
                 قاست الآلية المتوقَّعة لا ما يراه القارئ.
                 🔴 A `title` hover explanation used to be set here. REMOVED:
                 ui.js:107-114 sets only className, textContent, disabled and
                 onclick — it never copies title onto the button. So the
                 explanation existed on the object and never reached the
                 screen. ui.js is read-only; we do not touch it for a
                 tooltip.
                 A property nothing renders is not a feature — it is a false
                 assurance to the next reader, who thinks the explanation is
                 wired when it is not. The meaning is carried by the label
                 «حفظ ناقص» itself and then by save-modes.js's truthful
                 post-save toast. An independent gate caught this: my trial
                 asserted the title was SET on the object, not that a person
                 could SEE it — measuring the expected mechanism instead of
                 what the reader actually sees. */
              opts.buttons[i] = Object.assign({}, opts.buttons[i], {
                label: L({ ar: 'حفظ ناقص', en: 'Save incomplete' }),
                __relabelledBy: 'save-mode-labels'
              });
            }
          }
        }
      } catch (e) {
        /* اسمٌ غير مثالي أهون بكثير من نافذة لا تفتح
           an imperfect label is far cheaper than a modal that will not open */
        try { console.warn('[save-mode-labels] left the label as it was', e); } catch (e2) {}
      }
      return origModal.apply(UI, arguments);
    };
    UI.__saveModeLabelsInstalled = true;
    return true;
  }

  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.SaveModeLabels = {
    findDraftButton: findDraftButton,
    moduleFromTitle: moduleFromTitle,
    __install: install
  };
})(window);
