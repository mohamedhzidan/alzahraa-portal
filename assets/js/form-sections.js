/* =========================================================================
   form-sections.js — النماذج الطويلة تُطوى إلى أقسام، فتصير قابلة للاستعمال
                      على الهاتف
   form-sections.js — long forms fold into sections so a phone is usable

   ── المشكلة كما يعيشها المهندس ──────────────────────────────────────────
   نموذج «طلب فحص أعمال» تسعة وعشرون خانة في ثمانية أقسام. على هاتف في
   الموقع يعني ذلك تمريراً طويلاً للوصول إلى خانة واحدة. مهندسو المواقع
   يبدأون العمل ١ سبتمبر، ومعظمهم على هواتف.

   ── ما يفعله هذا الملف ──────────────────────────────────────────────────
   يجعل عنوان كل قسم زرّاً يطوي محتواه ويفتحه، ويكتب بجواره عدد الخانات.
   إضافيّ بحت: حذف هذا الملف يعيد سلوك اليوم حرفياً.

   ── 🔴 أخطر ما في الفكرة، وقد أُثبت بالتشغيل لا بالتفكير ────────────────
   **خانة مطلوبة مخفيّة = نموذج لا يستطيع أحد إرساله ولا يرى السبب.**
   قياس على الملفات الحقيقية: **٢٤ شاشة من ٥٧ فيها خانة مطلوبة خارج القسم
   الأول** — سبع وثلاثون خانة في البورتال كله. وعلى نموذج wir حقيقي، ضغطة
   «حفظ» فارغة تُنتج **أربع خانات حمراء موزّعة على ثلاثة أقسام**.
   وscreen-behaviour.js يقفز إلى **أول** خانة حمراء في ترتيب المستند. فيصلح
   المهندس الأولى، ثم الثانية، ثم تكون الثالثة **داخل قسم مطويّ** —
   وquerySelector يجدها رغم أنها مخفيّة، فيظنّ الحارس أنه نجح، وscrollIntoView
   وfocus على عنصر display:none لا يفعلان شيئاً. تقول الرسالة «نوع العمل
   مطلوب» عن خانة ليست على الشاشة إطلاقاً. **ويقع ذلك عند الضغطة الثالثة —
   وهي بالضبط اللحظة التي يفقد فيها الناس ثقتهم بالنظام.**

   **العلاج:** قبل أن يُسمح لأي تحقّق بالعمل، تُفتح كل الأقسام. المِشبك
   مستمعُ نقر في **طور الالتقاط** على document، مقصور على أزرار #modalFoot —
   نفس الأسلوب الذي يستعمله screen-behaviour.js:222-237 لحارس المغادرة،
   وللسبب نفسه: الالتقاط يسبق onclick الخاص بالزرّ.

   🔴 **وأزرار الحفظ ثلاثة لا واحد:** save-modes.js يُقحم «مسودة» و«مسودة
   حتى الاتصال» بجوار «حفظ». تصميمٌ يعرف «حفظ» وحدها كان سيترك مسارَي حفظ
   بلا حماية. القاعدة: **نفتح عند أي زرّ في الفوتر إلا المعلَّم
   data-az-leave="1"** (وسم screen-behaviour لـ«إلغاء»). واعتماد ليّن يفشل
   بأمان: لو غاب الوسم يوماً، انفتحت الأقسام عند الإلغاء أيضاً — وهذا غير
   ضارّ إطلاقاً.

   ── لماذا الطيّ لا يفقد بيانات — الحقيقة التي تجعل هذا آمناً ────────────
   entity.js يربط input/change ويكتب في كائن `draft`، وsubmitForm يتحقّق من
   `draft[f.name]` لا من الـDOM، وcommit يحفظ `draft`. فالقسم المطويّ حالة
   **بصرية بحتة** — لا شيء يُقرأ من الشاشة عند الحفظ.

   ── ما لا يُعاد بناؤه ───────────────────────────────────────────────────
   القفز إلى أول خانة حمراء وتسميتها يخصّان screen-behaviour.js ويظلّان له.
   هذا الملف يفتح الأقسام فقط، ثم يترك ذاك يعمل كما هو.

   🔴 **الأسماء: az-secfold-* حصراً.** كل من az-fold-hidden وaz-fold-line
   وaz-fold-section وaz-foldable وaz-fold-open وaz-folded **مأخوذ فعلاً في
   screen-behaviour.js**. إعادة استعمال أي منها تجعل طيّ شاشة العرض وطيّ
   النموذج يتنازعان الصنف نفسه — وهو خطأ trade/trades في ثوب CSS.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   A WIR form is 29 boxes across 8 sections. On a phone at site that is a
   long scroll to reach one box. Site engineers start on 1 September, mostly
   on phones. This makes each section heading a control that folds its
   contents, with the number of boxes beside it. Purely additive: deleting
   this file restores today's behaviour exactly.

   🔴 THE DANGEROUS CASE, PROVEN BY RUNNING IT, NOT REASONED:
   a hidden required box is a form nobody can submit and nobody can see why.
   24 of 57 screens carry a required field OUTSIDE the first section — 37
   boxes portal-wide. On a real wir, an empty Save produces FOUR red boxes
   across THREE sections. screen-behaviour.js jumps to the FIRST in document
   order, so the engineer fixes one, then another, and the third is inside a
   folded section — querySelector finds it even though it is hidden, so the
   guard believes it succeeded, while scrollIntoView and focus on a
   display:none element do nothing. The toast names a box that is nowhere on
   screen. It fails on the THIRD press, which is exactly when someone stops
   trusting the system.

   THE FIX: before any validation may run, open every section. The hook is a
   CAPTURE-phase click listener on document, filtered to #modalFoot buttons —
   the technique screen-behaviour.js:222-237 already uses, for the same
   reason: capture runs before the target's own onclick.

   🔴 There are THREE save buttons, not one: save-modes.js splices «مسودة»
   and «مسودة حتى الاتصال» beside «حفظ». A design knowing only «حفظ» would
   leave two save paths unguarded. The rule: expand on ANY footer button
   except one tagged data-az-leave="1" (screen-behaviour's own tag for
   Cancel). A soft dependency that degrades safely — if the tag ever
   disappears the fold expands on Cancel too, which is harmless.

   Folding cannot lose data: entity.js writes into a `draft` object and
   submitForm validates `draft[f.name]`, never the DOM. A collapsed section
   is a purely visual state.

   Namespace az-secfold-* only — every az-fold-* name is already taken by
   screen-behaviour.js, and sharing one would make the two folds fight.

   مُثبَت بالتشغيل / proven by running: TESTS/form-sections-trial.js
   (v2.0.29)
   ========================================================================= */
(function (global) {
  'use strict';

  var CLOSED   = 'az-secfold-closed';
  var CHEV     = 'az-secfold-chev';
  var COUNT    = 'az-secfold-count';
  var MARK     = 'az-secfold-ready';
  var STYLE_ID = 'azSecfoldStyle';

  /* العتبة: قيست ولم تُختَر — تطوي ٣٥ شاشة من ٥٧ وتترك ٢٢. دون ١٢ خانة
     يكلّف الطيّ نقرات أكثر ممّا يوفّره من تمرير.
     Measured, not chosen: folds 35 of 57 screens and leaves 22 alone. Below
     12 boxes folding costs more taps than the scrolling it saves. */
  var MIN_SECTIONS = 3;
  var MIN_FIELDS   = 12;

  function isAr() {
    return !(global.I18N && I18N.getLang && I18N.getLang() === 'en');
  }
  function num(n) {
    try { if (global.I18N && I18N.num) return I18N.num(n); } catch (e) {}
    return String(n);
  }

  /* ── ١ · النمط، بأسلوب الملفات القائمة نفسه ─────────────────────────── */
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      /* الطيّ نفسه — داخل @media screen عمداً: الطباعة تُظهر كل شيء دائماً.
         The fold itself — inside @media screen deliberately: printing always
         shows everything. */
      '@media screen{.' + CLOSED + ' .form-grid{display:none}}' +
      /* الشيفرون والعدّاد أدوات لا معلومات — لا تُطبع أبداً */
      '@media print{.' + CHEV + ',.' + COUNT + '{display:none}}' +
      /* 🔴 margin-inline-start وليس margin-left — قاعدة الاتجاه. تثبّت
         الشيفرون في نهاية السطر: اليسار بالعربية واليمين بالإنجليزية،
         صحيحاً في الاتجاهين تلقائياً. السابقة في نفس المشروع مرتين
         (screen-behaviour.js وentity.js:523 لزرّ إضافة سطر).
         margin-inline-start, never margin-left — the RTL rule. It pins the
         chevron to the END of the line: the left in Arabic, the right in
         English, correct both ways automatically. */
      '.' + CHEV + '{margin-inline-start:auto;line-height:0;flex:0 0 auto;' +
      'transition:transform .15s ease;opacity:.65}' +
      '.' + CLOSED + ' .' + CHEV + '{transform:rotate(-90deg)}' +
      /* line-height:0 ليس تجميلاً: يمنع رمزاً ١٤px من رفع سطر عنوان ١٣px.
         قاعدة «لا تُكبّر التخطيط» مطبَّقة على الارتفاع هذه المرة.
         line-height:0 is not cosmetic: it stops a 14px glyph raising the
         13px heading's line box — the "do not grow the layout" rule applied
         to HEIGHT this time. */
      '.' + COUNT + '{margin-inline-start:6px;opacity:.55;font-weight:400;' +
      'font-size:.85em}' +
      /* 🔴 مساحة اللمس ٤٤ بكسل على الأقل. كان العنوان ٣٠ بكسل — وهو نفس
         عائلة أزرار الـ٢٩ بكسل التي عولجت في v2.0.21. إصبعٌ على هاتف في
         الموقع، وربما بقفاز، لا يصيب ٣٠ بكسل بثقة؛ وزرٌّ يُخطئه المستخدم
         مرتين من ثلاث هو زرّ لا يثق به.
         min-height لا height: العنوان الطويل ما زال يلتفّ ويكبر بحرّية.
         🔴 Tap target at least 44px. The heading was 30px — the same family
         as the 29px buttons fixed in v2.0.21. A finger on a site phone,
         possibly gloved, does not hit 30px reliably, and a button missed two
         times in three is a button nobody trusts.
         min-height, not height: a long heading still wraps and grows freely. */
      '.' + MARK + ' .form-section-title{display:flex;align-items:center;' +
      'cursor:pointer;user-select:none;min-height:44px}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── ٢ · أي الأقسام قابلة للطيّ ─────────────────────────────────────── */
  function foldableSections(form) {
    var out = [];
    var all = form.querySelectorAll('.form-section');
    for (var i = 0; i < all.length; i++) {
      var sec = all[i];
      var title = sec.querySelector('.form-section-title');
      var grid = sec.querySelector('.form-grid');
      if (!title || !grid) continue;              /* بنود السطور تستعمل .table-wrap */
      if (!sec.querySelector('[data-fname]')) continue;
      /* 🔴 حارس ثانٍ مستقلّ ضدّ زرّ «إضافة سطر» (entity.js:523): لو حمل
         العنوان زرّاً، فالنقر عليه يجب ألا يطوي شيئاً أبداً.
         A second, independent guard against the #addLine button
         (entity.js:523): if the heading carries a button, tapping it must
         never toggle a fold. */
      if (title.querySelector('button')) continue;
      out.push({ section: sec, title: title, grid: grid });
    }
    return out;
  }

  function countFields(form) {
    return form.querySelectorAll('[data-fname]').length;
  }

  /* ── ٣ · افتح كل شيء — يُستدعى قبل أي تحقّق ─────────────────────────── */
  function expandAll(root) {
    var host = root || document;
    var closed = host.querySelectorAll ? host.querySelectorAll('.' + CLOSED) : [];
    for (var i = 0; i < closed.length; i++) {
      closed[i].classList.remove(CLOSED);
      var t = closed[i].querySelector ? closed[i].querySelector('.form-section-title') : null;
      if (t && t.setAttribute) t.setAttribute('aria-expanded', 'true');
    }
    return closed.length;
  }

  function toggle(entry) {
    var sec = entry.section;
    var nowClosed = !sec.classList.contains(CLOSED);
    if (nowClosed) sec.classList.add(CLOSED); else sec.classList.remove(CLOSED);
    entry.title.setAttribute('aria-expanded', nowClosed ? 'false' : 'true');
  }

  /* ── ٤ · بناء العناصر ───────────────────────────────────────────────── */
  function build() {
    var form = document.getElementById('entForm');
    if (!form || form.classList.contains(MARK)) return null;

    var sections = foldableSections(form);
    var fields = countFields(form);
    if (sections.length < MIN_SECTIONS || fields < MIN_FIELDS) return null;

    injectStyle();
    form.classList.add(MARK);

    sections.forEach(function (entry, idx) {
      var n = entry.grid.querySelectorAll('[data-fname]').length;

      var count = document.createElement('span');
      count.className = COUNT;
      count.textContent = '(' + num(n) + ')';

      var chev = document.createElement('span');
      chev.className = CHEV;
      chev.setAttribute('aria-hidden', 'true');
      chev.textContent = '⌃';

      entry.title.appendChild(count);
      entry.title.appendChild(chev);
      entry.title.setAttribute('role', 'button');
      entry.title.setAttribute('tabindex', '0');
      entry.title.setAttribute('aria-expanded', 'true');

      /* addEventListener لا .onclick — فلا يستطيع أحد أن يمحوه بصمت
         addEventListener, never .onclick, so nothing can silently erase it */
      entry.title.addEventListener('click', function () { toggle(entry); });
      entry.title.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          toggle(entry);
        }
      });

      /* ═══════════════════════════════════════════════════════════════
         🔴 الافتراضي: القسم الأول مفتوح، **وأي قسم فيه خانة مطلوبة**.
         أُصلح ١ سبتمبر ٢٠٢٦.

         ما كان هنا: `if (idx > 0)` وحدها، أي «الأول مفتوح والباقي مطويّ».
         وكان التعليق يقول إن الخانات المطلوبة محميّة بحارس الالتقاط —
         وهو صحيح، الحارس يفتح كل الأقسام عند الحفظ ويسمّي الناقص، فلا
         يعلق أحد. لكنّ الخطّة المكتوبة كانت تَعِد بشيء آخر: **صفر خانة
         مطلوبة مخفيّة عند الفتح، بالبناء لا بالإنقاذ.** والمشحون كان
         الخيار الأبسط، وسجلّي أنا قال إن المشحون هو الخيار الآخر — وكان
         ذلك غير صحيح، أمسكه المنسّق قبل أن يصل إلى صاحب العمل كحقيقة،
         وقاسه TRACK ENHANCER على الكود المشحون: **خانتان مطلوبتان مخفيّتان
         عند فتح شاشة «طلب فحص أعمال» — نوع العمل وبند العمل.**

         الفرق عملياً: بدل أن يملأ ما يراه ثم يُرفض حفظه ثم تنفتح الأقسام
         أمامه، يرى من البداية كل ما يجب أن يملأه. ضغطة ضائعة أقلّ في كل
         مستند، ومهندسو المواقع على هواتفهم من ١ سبتمبر.

         🔴 Default: the first section open, AND any section holding a
         must-fill box. Fixed 1 Sep 2026.
         What was here: `if (idx > 0)` alone — first open, rest folded. The
         old comment said required boxes are protected by the capture guard,
         and that is true: on save it opens every section and names what is
         missing, so nobody gets stuck. But the written plan promised
         something else — ZERO required boxes hidden at open, BY
         CONSTRUCTION rather than by rescue. What shipped was the simpler
         option, and my own handover recorded the shipped default as the
         other one. That was false; the coordinator caught it before it
         reached the owner as fact, and TRACK ENHANCER measured it on the
         shipped code: TWO required boxes hidden on opening «طلب فحص أعمال»
         — نوع العمل and بند العمل.
         In practice: instead of filling what he can see, being refused, and
         then watching sections open, he sees everything he must fill from
         the start. One wasted press fewer per document — and site engineers
         are on phones from 1 September.

         ⚠️ العلامة هي `.req` التي يرسمها entity.js:599 من `f.required`
         نفسها — أي الأثر المرسوم لكون الحقل مطلوباً، لا نسخة ثانية من
         القاعدة. وحقول السطور تعيش في #linesWrap خارج هذه الشبكات، فلا
         تدخل في الحساب.
         ⚠️ The marker is the `.req` span entity.js:599 draws from
         `f.required` itself — the rendered artifact of being required, not
         a second copy of the rule. Line-item fields live in #linesWrap,
         outside these grids, so they do not count. */
      var hasRequired = 0;
      try { hasRequired = entry.grid.querySelectorAll('.req').length; } catch (e) { hasRequired = 0; }

      if (idx > 0 && !hasRequired) {
        entry.section.classList.add(CLOSED);
        entry.title.setAttribute('aria-expanded', 'false');
      }
    });

    return { sections: sections.length, fields: fields };
  }

  /* ── ٥ · حارس السلامة: افتح كل شيء قبل أن يعمل أي تحقّق ─────────────── */
  function installSafetyHook() {
    if (global.__azSecfoldHook) return;
    document.addEventListener('click', function (e) {
      try {
        var t = e.target;
        var btn = null;
        while (t && t !== document) {
          if (t.tagName === 'BUTTON') { btn = t; break; }
          t = t.parentNode;
        }
        if (!btn) return;
        var foot = document.getElementById('modalFoot');
        if (!foot || !foot.contains || !foot.contains(btn)) return;
        /* «إلغاء» وحدها معفاة — ولو غاب وسمها انفتحت الأقسام عندها أيضاً،
           وهو غير ضارّ. Cancel alone is exempt — and if its tag ever
           disappears the fold expands there too, which is harmless. */
        if (btn.getAttribute && btn.getAttribute('data-az-leave') === '1') return;
        expandAll(document.getElementById('modalBody') || document);
      } catch (err) { /* لا نمنع حفظاً أبداً · never block a save */ }
    }, true);   /* ← طور الالتقاط: يسبق onclick الخاص بالزرّ */
    global.__azSecfoldHook = true;
  }

  /* ── ٦ · اللفّ ───────────────────────────────────────────────────────── */
  function install() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__azSecfoldInstalled) return false;
    var orig = UI.modal;
    UI.modal = function (opts) {
      var out = orig.apply(UI, arguments);
      /* ui.js يكتب الجسم تزامنياً، فالنموذج موجود بعد العودة مباشرة.
         لا نلمس opts إطلاقاً — لا onOpen ولا buttons — فموضعنا في سلسلة
         اللوافّ لا يقرّر هل نعمل.
         ui.js writes the body synchronously, so the form exists as soon as
         this returns. We touch opts not at all — neither onOpen nor
         buttons — so our position in the wrapper chain cannot decide
         whether we work. */
      try { setTimeout(build, 0); } catch (e) {}
      return out;
    };
    UI.__azSecfoldInstalled = true;
    installSafetyHook();
    return true;
  }

  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.FormSections = {
    build: build,
    expandAll: expandAll,
    foldableSections: foldableSections,
    MIN_SECTIONS: MIN_SECTIONS,
    MIN_FIELDS: MIN_FIELDS,
    __install: install
  };
})(window);
