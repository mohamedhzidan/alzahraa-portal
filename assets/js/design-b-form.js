/* =========================================================================
   design-b-form.js — النموذج صفحةٌ كاملة، لا نافذة عائمة
                      The form as a FULL PAGE, not a floating dialog
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ 🔴 أهم قرار في هذا الملف: لا يُعاد بناء النموذج إطلاقاً ══════════════
   لا يُلمس محتوى #modalHost ولا أيّ معرّف بداخله. تبقى نفس العقدة ونفس
   الحقول ونفس الأزرار ونفس المعالِجات — ويتغيّر **عرضها**. السبب: إصلاح
   «الحفظ والمرفقات» (Prompt 2) ينتظر مراجعة مستقلّة ويعلّق على معرّفات بعينها
   هنا (azAttachJump، azAttachBeforeSave، azAbsInput). إعادة البناء كانت
   ستكسره وتصنع تعارض دمج. إعادة التنسيق لا تفعل.
   Nothing inside #modalHost is rebuilt — same node, fields, buttons and
   handlers; only PRESENTATION changes. Prompt 2's repair, awaiting
   independent review, hangs off specific ids here. Rebuilding would break
   it and create a merge conflict; restyling cannot.

   ══ أُضيف 10 سبتمبر (DESIGN-B-2) — ثلاثة أعطال وجدها التشغيل لا القراءة ══
   ١) **النوافذ الصغيرة صارت صفحات.** كانت الصفحة الكاملة تُطبَّق على كل نافذة،
      فصار «هل تريد الحذف؟» و«لا يمكن الحفظ» صفحةً بعرض 64rem بلا خلفية.
      المعتمد في «ب» هو النموذج صفحةً — والحوار يبقى حواراً. الآن: الصفحة
      للنوافذ العريضة وحدها (النماذج وعرض السجلّ، ui.js:99 'wide').
   ٢) **الرسائل المنبثقة تغطّي زرّ الحفظ.** قِيس في ثلاثة مقاسات: رسالة الترحيب
      أو «مطلوب» تقع فوق «حفظ» تماماً وتأكل النقرة ٣ ثوانٍ — والفحص نفسه ضغط
      «حفظ» فلم يحدث شيء. **موجود في الموقع اليوم بلا «ب» أيضاً** (قِيس).
      الآن: ما دامت صفحة النموذج مفتوحة ترتفع الرسائل فوق شريط الأزرار.
   ٣) **خطأ التحقّق لا ينقل التركيز.** يظهر «مطلوب» تحت الحقل ويبقى التركيز على
      زرّ الحفظ في أسفل الصفحة. الآن: ملخّص أعلى النموذج يسمّي الحقول الناقصة،
      والتركيز ينتقل إلى أوّل حقل ناقص — كما في حالة «خطأ التحقّق» في المعاينة.
   1) SMALL DIALOGS HAD BECOME PAGES. The full page applied to every dialog,
      so «Delete this?» and «Cannot save» became a 64rem page with no
      backdrop. B approved the FORM as a page — a dialog stays a dialog. Now:
      the page is for WIDE dialogs only (forms and record views, ui.js:99).
   2) TOASTS COVER THE SAVE BUTTON. Measured at three sizes: the welcome or
      «required» toast lands exactly on «Save» and eats the click for 3 s —
      the journey itself pressed Save and nothing happened. PRE-EXISTING in
      the portal without Design B too (measured). Now, while a form page is
      open, toasts rise above the button bar.
   3) A VALIDATION ERROR DID NOT MOVE FOCUS. «Required» appears under the
      field while focus stays on Save at the bottom. Now a summary at the top
      names the missing fields and focus moves to the first one — the
      preview's own «validation error» state.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-form.js needs design-b-kit.js first'); return; }
  var T = AZB.t;
  var HOST_ID = 'modalHost';

  function host() { return document.getElementById(HOST_ID); }

  /* هل النافذة المفتوحة الآن **عريضة** (نموذج أو سجلّ)؟ من الشاشة لا من ذاكرة
     Is the dialog open right now a WIDE one (form or record)? Read from the
     screen, never from private state that could drift. */
  function isOpenWide(h) {
    if (!h || h.hidden) return false;
    var m = h.querySelector('.modal');
    /* نقرأ className نصّاً: ui.js:99 يضبطه بالإسناد، والصندوق التجريبي في Node لا
       يزامن classList معه — فالقراءة النصّية تصدق في الاثنين.
       Read className as text: ui.js:99 sets it by assignment, and the Node
       stand-in DOM does not sync classList with it — text is true in both. */
    if (!m || (' ' + (m.className || '') + ' ').indexOf(' wide ') === -1) return false;
    var cs = global.getComputedStyle ? getComputedStyle(h) : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
    return true;
  }

  /* الرسائل فوق شريط الأزرار: نقيس أعلى الشريط ونرفع الرسائل فوقه
     Toasts above the button bar: measure the bar's top, lift toasts above it. */
  function liftToasts() {
    var root = document.documentElement;
    var h = host();
    var foot = document.getElementById('modalFoot');
    if (!AZB.isOn() || !isOpenWide(h) || !foot) {
      root.classList.remove('azb-form-open');
      if (root.style && root.style.removeProperty) root.style.removeProperty('--azb-toast-bottom');
      return;
    }
    if (typeof foot.getBoundingClientRect !== 'function') return;   /* صندوق Node التجريبي بلا تخطيط */
    var top = foot.getBoundingClientRect().top;
    var gap = Math.max(12, Math.round(global.innerHeight - top + 12));
    if (root.style && root.style.setProperty) root.style.setProperty('--azb-toast-bottom', gap + 'px');
    root.classList.add('azb-form-open');
  }

  /* ── ملخّص الأخطاء ونقل التركيز ─────────────────────────────────────────
     THE ERROR SUMMARY and moving focus. entity.js:822-840 un-hides one
     .err-msg per missing field; we read THOSE — no second validation. */
  var summaryTimer = null;
  function errorSummary() {
    var form = document.getElementById('entForm');
    var body = document.getElementById('modalBody');
    if (!form || !body) return;
    var old = body.querySelector('.azb-errsum');
    var bad = [].slice.call(form.querySelectorAll('.err-msg')).filter(function (e) { return !e.hidden; });
    if (!bad.length) { if (old) old.parentNode.removeChild(old); return; }
    var items = bad.map(function (e) {
      var lab = e.closest('[data-fname]');
      var name = lab ? lab.getAttribute('data-fname') : '';
      var txt = lab && lab.querySelector('.field-label') ? lab.querySelector('.field-label').textContent.replace(/\*/g, '').trim() : name;
      return { name: name, txt: txt, msg: e.textContent.trim() };
    });
    var box = old || document.createElement('div');
    box.className = 'azb-errsum';
    box.setAttribute('role', 'alert');
    box.setAttribute('tabindex', '-1');
    box.innerHTML = '<h3>' + AZB.icon('warn') + AZB.esc(T({ ar: 'لم يُحفَظ — ' + items.length + ' حقل ناقص', en: 'Not saved — ' + items.length + ' field(s) missing' })) + '</h3>' +
      '<ol>' + items.map(function (it) {
        return '<li><button type="button" class="azb-errjump" data-f="' + AZB.esc(it.name) + '">' + AZB.esc(it.txt) + '</button> — ' + AZB.esc(it.msg) + '</li>';
      }).join('') + '</ol>';
    if (!old) body.insertBefore(box, body.firstChild);
    [].forEach.call(box.querySelectorAll('.azb-errjump'), function (b) {
      b.onclick = function () {
        var el = form.querySelector('[data-fname="' + b.getAttribute('data-f') + '"] .input, [data-fname="' + b.getAttribute('data-f') + '"] .select, [data-fname="' + b.getAttribute('data-f') + '"] .textarea');
        if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
      };
    });
    /* 🔴 لا ننقل التركيز نحن: screen-behaviour.js §2 (سطر ٢٦٥) يمرّر إلى أوّل
          خانة حمراء ويركّز عليها ويسمّيها في التنبيه — وجده تشغيل الفحص لا
          القراءة. تركيزٌ ثانٍ منّا طبقةٌ مكرّرة تتنافس، وهو ما يمنعه التكليف.
          الملخّص وحده إضافة «ب» (حالة «خطأ التحقّق» في المعاينة).
       🔴 We do NOT move focus ourselves: screen-behaviour.js §2 (line 265)
          already scrolls to, focuses and names the first red field — found
          by running the check, not by reading. A second focus from us would
          be a duplicate competing layer, which the brief forbids. The
          summary alone is Design B's addition (the preview's validation
          state). */
  }

  /* ── أسماء خانات الأسطر — Prompt 4: «keyboard labels on line items» ──────
     entity.js:771-797 يرسم خانات الأسطر بلا اسمٍ يُسمَع: <input name="qty">
     وحده، فمن يتنقّل بلوحة المفاتيح أو بقارئ الشاشة يسمع «خانة تحرير» فقط.
     نضع aria-label من عنوان العمود ورقم السطر نفسيهما — سمةٌ فقط؛ الخانة
     ومعالجاتها وقيمتها كما هي. وتُعاد التسمية كلّما أُعيد رسم الأسطر.
     LINE-ITEM NAMES — Prompt 4's «keyboard labels on line items».
     entity.js:771-797 draws line inputs with no audible name — a bare
     <input name="qty"> — so a keyboard or screen-reader user hears only
     "edit text". We set aria-label from the column heading and the row
     number — an attribute only; the input, its handlers and its value are
     untouched — and re-label whenever the lines are redrawn. */
  function labelLines() {
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return;
    var heads = [].slice.call(wrap.querySelectorAll('thead th')).map(function (th) { return (th.textContent || '').trim(); });
    [].forEach.call(wrap.querySelectorAll('tbody tr[data-li]'), function (tr) {
      var row = Number(tr.getAttribute('data-li')) + 1;
      [].forEach.call(tr.children, function (td, i) {
        /* 🔴 (DESIGN-B-3) **كل** خانة في الخليّة، لا الأولى وحدها: خليّة «المهنة» في
              «كشف العمالة اليومية» و«توزيع العمالة» تحمل خانتين (القائمة الأصلية وقائمة
              اختيار متعدد يضيفها ملفٌّ آخر) — فبقيت الثانية بلا اسم. قِيس بجولة التغطية.
           🔴 (DESIGN-B-3) EVERY control in the cell, not only the first: the «trade»
              cell on daily labour and labour allocation holds TWO controls (the
              original list and a multi-select another file adds) — the second was left
              nameless. Measured by the coverage sweep. */
        var ctls = [].filter.call(td.querySelectorAll('input, select, textarea, button'), function (c) { return c.type !== 'hidden'; });
        ctls.forEach(function (ctl, k) {
          var name = heads[i] || (ctl.getAttribute('title') || '');
          if (ctl.tagName === 'BUTTON') name = (ctl.getAttribute('title') || T({ ar: 'حذف', en: 'Delete' }));
          if (ctls.length > 1 && k > 0) name += ' (' + (k + 1) + ')' + (ctl.multiple ? T({ ar: ' — اختيار متعدّد', en: ' — multiple choice' }) : '');
          var want = name + ' — ' + T({ ar: 'السطر ', en: 'line ' }) + row;
          if (ctl.hasAttribute('aria-label') && !ctl.hasAttribute('data-azb-aria')) return;   /* اسمٌ وضعه غيرنا — لا نمسّه */
          if (ctl.getAttribute('aria-label') !== want) { ctl.setAttribute('aria-label', want); ctl.setAttribute('data-azb-aria', '1'); }
        });
      });
    });
  }
  /* خانة اختيار الملفّ قبل الحفظ (azAbsInput — لوحة الموقع نفسها) بلا اسم يُسمَع.
     قِيس بفحص لوحة المفاتيح. نضع اسماً فقط إن لم يضع أحدٌ اسماً — وPrompt 2
     يعلّق على هذه الخانة، فلا نلمس غير السمة.
     The pre-save file box (azAbsInput — the portal's own panel) had no audible
     name — measured by the keyboard check. We name it ONLY if nobody else
     has; Prompt 2 hangs off this box, so nothing but the attribute is touched. */
  function nameFileBoxes() {
    [].forEach.call(document.querySelectorAll('#modalHost input[type="file"]'), function (el) {
      if (el.hasAttribute('aria-label') && !el.hasAttribute('data-azb-aria')) return;
      if (el.closest('label')) return;                      /* لها اسم من الملصق المحيط */
      var want = T({ ar: 'اختر ملفّات لإرفاقها بهذا السجلّ', en: 'Choose files to attach to this record' });
      if (el.getAttribute('aria-label') !== want) { el.setAttribute('aria-label', want); el.setAttribute('data-azb-aria', '1'); }
    });
  }
  var linesObs = null, linesWrapEl = null;
  function watchLines() {
    var wrap = document.getElementById('linesWrap');
    if (!wrap || wrap === linesWrapEl) { labelLines(); return; }
    if (linesObs) { try { linesObs.disconnect(); } catch (e) {} }
    linesWrapEl = wrap;
    /* childList على الحاوية وما تحتها: renderLines يستبدل innerHTML كلّه (entity.js:727)،
       وملفّات أخرى تضيف خانةً داخل خليّة بعد الرسم (قائمة المهن المتعدّدة — قِيس). لا نراقب
       السمات: labelLines تكتب سمات فقط، فلا حلقة.
       childList on the wrapper AND below: renderLines replaces its innerHTML, and other
       files add a control inside a cell after the draw (the multi-trade list — measured).
       Attributes are NOT observed: labelLines writes attributes only, so no loop. */
    linesObs = new MutationObserver(labelLines);
    linesObs.observe(wrap, { childList: true, subtree: true });
    labelLines();
  }

  /* ── ما خلف الصفحة لا يأخذ التركيز ─────────────────────────────────────
     قِيس: ٣٥ من ٦٠ ضغطة Tab داخل النموذج خرجت إلى أزرار القائمة الجانبية
     المغطّاة خلف الصفحة — التركيز يختفي عن عين الموظّف. ما دامت الصفحة
     مفتوحة يصير ما خلفها «خاملاً» (inert): لا يُركَّز عليه ولا يُنقر. شريط
     العنوان يبقى حيّاً لأنّه ظاهر فوق الصفحة. ويُرفع كلّه عند الإغلاق.
     WHAT IS BEHIND THE PAGE TAKES NO FOCUS. Measured: 35 of 60 Tab presses
     inside the form went to sidebar buttons COVERED by the page — focus
     vanished from sight. While the page is open, what lies behind it is
     made inert (no focus, no click). The top bar stays live because it is
     visible above the page. All removed on close. */
  /* 🔴 الشريط الجانبي خاملٌ على الحاسب وحده: هناك هو عمودٌ ثابت تغطّيه الصفحة.
        على الهاتف هو درجٌ يفتحه الموظّف عمداً بتبويب «المزيد» — لو صار خاملاً
        لفُتح ولم يستجب. #content مغطّى في كل المقاسات.
     🔴 The sidebar is made inert on DESKTOP only, where it is a fixed column
        the page covers. On a phone it is a drawer the person opens on purpose
        with the «More» tab — inert there would open it and ignore every tap.
        #content is covered at every width. */
  function behind() {
    var phone = global.matchMedia && matchMedia('(max-width:860px)').matches;
    return phone ? ['#content', '.app-footer'] : ['.sidebar', '#content', '.app-footer'];
  }
  function setBehindInert(on) {
    if (!on) {
      [].forEach.call(document.querySelectorAll('[data-azb-inert="1"]'), function (el) { el.removeAttribute('inert'); el.removeAttribute('data-azb-inert'); });
      return;
    }
    setBehindInert(false);
    behind().forEach(function (sel) {
      [].forEach.call(document.querySelectorAll(sel), function (el) {
        if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.setAttribute('data-azb-inert', '1'); }
      });
    });
  }

  /* ══ «قبل أن تبدأ» — حالة «إعداد ناقص» في المعاينة المعتمدة (B.src.html:692-701)
     أُضيف 10 سبتمبر (DESIGN-B-3). المعاينة المعتمدة رسمت نموذجاً يقول، **قبل** أن
     يملأه الموظّف، إنّ قائمة مطلوبة فارغة وإنّ الحفظ سيفشل؛ وPrompt 4 ينصّ: «أظهر
     الإعداد المرجعي المطلوب قبل أن يملأ الموظّف نموذجاً طويلاً». لم يُبنَ هذا من قبل.
     قِيس في هذا المشروع: أمين المخزن ومهندس الموقع ملآ إذن الصرف كلّه ثم وجدا قائمة
     «المستلم» فارغة (HANDOFF-FINDINGS §5).
     ── ما يقرؤه: الحقول **المطلوبة** في Schema وحدها، وقائمة <select> كما رسمها الموقع
        بعد أن ينقّيها ref-dropdown-scope.js (سُلّمه ينتهي عند 900ms، فننتظر 1100ms).
        لا تحقّق ثانٍ، ولا يُمنع الحفظ، ولا يُخفى النموذج — سطرٌ في أعلاه فقط.
     ── 🔴 لا إنذار كاذب: القائمة التي تمتلئ لاحقاً (وصول الأسماء من الخادم) تُزيل
        السطر فوراً عبر Store.onChange. ولا نخمّن السبب: الشاشة لا تميّز بين «لم تُعرَّف
        البيانات» و«نطاق حسابك لا يشملها»، فتقول ذلك بالحرف — إلّا قائمة «المشروع» حين
        لا مشروع مسند للحساب، فذلك معروف يقيناً (قرار صاحب العمل، FINISH-THREE-TRACKS).
     «BEFORE YOU START» — the approved preview's «missing setup» state. Added
     10 Sept (DESIGN-B-3). The approved preview drew a form that says, BEFORE the
     employee fills it, that a required list is empty and saving will fail; Prompt 4
     says «show required reference setup before an employee fills a long form».
     Never built before. Measured on this project: the storekeeper and the site
     engineer filled a whole issue note and then found «received by» empty.
     Reads only the REQUIRED fields in Schema and the <select> as the portal drew it
     after ref-dropdown-scope.js pruned it (its ladder ends at 900 ms; we wait 1100).
     No second validation, saving is not blocked, the form is not hidden — one block
     at the top. 🔴 No false alarm: a list that fills later removes the block at once
     (Store.onChange). No guessed cause: the screen cannot tell "not set up" from
     "outside your scope", so it says exactly that — except the PROJECT list when the
     account has no project, which is known for certain (the owner's decision). */
  var SETUP_DELAYS = [1100, 2600];
  function setupFacts() {
    var form = document.getElementById('entForm');
    if (!form) return null;
    var mod = null;
    try { mod = Schema.get(form.getAttribute('data-module')); } catch (e) {}
    if (!mod) return null;
    var empty = [];
    function probe(f, el, line) {
      if (!f.required || (f.type !== 'ref' && f.type !== 'select')) return;
      if (!el || el.tagName !== 'SELECT' || el.disabled) return;
      /* حقلٌ أخفاه ملفٌّ آخر عمداً لا يُحسب / a field another file hid on purpose is skipped */
      if (el.getClientRects && !el.getClientRects().length) return;
      var n = [].filter.call(el.options, function (o) { return o.value; }).length;
      if (!n) empty.push({ name: f.name, ref: f.ref || '', label: T(f.label) || f.name, line: line });
    }
    (mod.fields || []).forEach(function (f) { probe(f, form.querySelector('[name="' + f.name + '"]'), false); });
    var tr = form.querySelector('#linesWrap tr[data-li="0"]');
    if (tr && mod.lines && mod.lines.fields) {
      mod.lines.fields.forEach(function (f) { probe(f, tr.querySelector('[name="' + f.name + '"]'), true); });
    }
    return { mod: mod, empty: empty };
  }
  function noProjectAccount() {
    try {
      var u = Auth.current();
      return !!u && !(Auth.hasAllProjects && Auth.hasAllProjects()) && !(u.projects || []).length;
    } catch (e) { return false; }
  }
  function setupBlock() {
    var body = document.getElementById('modalBody');
    if (!body || !AZB.isOn()) return;
    var old = body.querySelector('.azb-setup');
    var facts = setupFacts();
    if (!facts || !facts.empty.length) { if (old) old.parentNode.removeChild(old); return; }
    var items = facts.empty.map(function (e) {
      var why = (e.ref === 'projects' && noProjectAccount())
        ? T({ ar: 'لا مشروع مسند إلى حسابك، فلا تستطيع إنشاء مستند على أيّ مشروع. أبلغ مسؤول النظام ليضيف مشروعاتك (الإعدادات ← المستخدمون).',
              en: 'No project is assigned to your account, so you cannot create a document on any project. Ask the system administrator to add your projects (Settings → Users).' })
        : T({ ar: 'القائمة لا تعرض لك أيّ اختيار.', en: 'the list offers you nothing to choose.' });
      return '<li><b>«' + AZB.esc(e.label) + '»' + (e.line ? AZB.esc(T({ ar: ' (في الأسطر)', en: ' (in the lines)' })) : '') + '</b> — ' + AZB.esc(why) + '</li>';
    }).join('');
    var box = old || document.createElement('div');
    box.className = 'azb-setup';
    box.setAttribute('role', 'note');
    box.setAttribute('data-azb-empty', facts.empty.map(function (e) { return e.name; }).join(','));
    box.innerHTML = '<h3>' + AZB.icon('warn') + AZB.esc(T({ ar: 'قبل أن تبدأ: هذا النموذج لا يمكن حفظه الآن', en: 'Before you start: this form cannot be saved yet' })) + '</h3>' +
      '<ul>' + items + '</ul>' +
      '<p>' + AZB.esc(T({
        ar: 'الحقل مطلوب، فسيُرفض الحفظ ما دامت قائمته فارغة. قد تكون بياناتها لم تُعرَّف بعد، وقد يكون نطاق حسابك لا يشملها — والشاشة لا تستطيع التمييز بينهما. أبلغ مسؤول النظام قبل أن تملأ باقي النموذج.',
        en: 'The field is required, so saving will be refused while its list is empty. Its data may not be set up yet, or your account\'s scope may not include it — the screen cannot tell which. Tell the system administrator before filling in the rest.' })) + '</p>';
    if (!old) body.insertBefore(box, body.firstChild);
  }
  var setupFormEl = null, setupHooked = false;
  function scheduleSetup() {
    var form = document.getElementById('entForm');
    if (!form || form === setupFormEl) return;
    setupFormEl = form;
    SETUP_DELAYS.forEach(function (ms) { setTimeout(function () { if (document.getElementById('entForm') === form) setupBlock(); }, ms); });
    if (!setupHooked && global.Store && Store.onChange) {
      setupHooked = true;
      /* قائمةٌ امتلأت بعد الفتح تُزيل السطر — لا إنذار يبقى بعد زوال سببه
         A list that filled after opening removes the block — no alarm outlives its cause. */
      Store.onChange(function () { if (document.getElementById('entForm') && document.querySelector('#modalBody .azb-setup')) setTimeout(setupBlock, 300); });
    }
  }

  function apply() {
    var h = host();
    if (!h) return;
    if (!AZB.isOn() || !isOpenWide(h)) {
      h.classList.remove('azb-page');
      setBehindInert(false);
      liftToasts();
      return;
    }
    if (!h.classList.contains('azb-page')) h.classList.add('azb-page');
    setBehindInert(true);
    liftToasts();
    watchErrors();
    watchLines();
    scheduleSetup();
    markNotes();
    /* الأسطر تُرسم في onOpen بعد setTimeout(0) (ui.js:143) — نعيد المحاولة مرّة
       Lines are drawn in onOpen after setTimeout(0) (ui.js:143) — retry once. */
    setTimeout(watchLines, 60);
    /* لوحة المرفقات تُحقن بعد فتح النافذة بلحظة (attach-from-form.js) — مرّتان
       The attachment panel is injected a moment after opening — twice. */
    setTimeout(nameFileBoxes, 60);
    setTimeout(nameFileBoxes, 500);
  }

  var errObs = null, errForm = null;
  function watchErrors() {
    var form = document.getElementById('entForm');
    if (!form || form === errForm) return;
    if (errObs) { try { errObs.disconnect(); } catch (e) {} }
    errForm = form;
    /* نراقب السمة hidden على رسائل الخطأ وحدها — لا الشجرة كلها
       Watch ONLY the hidden attribute on error messages — not the whole tree. */
    errObs = new MutationObserver(function (list) {
      var hit = list.some(function (m) { return m.target && m.target.classList && m.target.classList.contains('err-msg'); });
      if (!hit) return;
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(errorSummary, 60);
    });
    errObs.observe(form, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  /* ── حدّ الاعتماد في الشريط الملتصق — قبل الضغط، لا بعده ─────────────────
     قاعدة التصميم المعتمدة §5: «يُذكر حدّ الاعتماد قبل الضغط، لا بعده». عرض
     السجلّ في الموقع يكتب الجملة نفسها في جسم الصفحة (entity.js:391-396،
     Rules.approverHint) — فتختفي بالتمرير في سجلٍّ طويل، وتبقى أزرار الاعتماد
     ظاهرة في الأسفل. نضع **الجملة نفسها، من الدالّة نفسها، وبالشرط نفسه**
     (المستند «بانتظار المراجعة» أو «تمت المراجعة») في الشريط الملتصق بجوار
     الأزرار. لا رقم جديد، ولا حدّ جديد، ولا صلاحية تتغيّر.
     THE APPROVAL LIMIT IN THE STICKY BAR — before the press, never after.
     Approved design rule §5. The portal's record view writes this sentence in
     the page body (entity.js:391-396, Rules.approverHint), where it scrolls
     away on a long record while the approve buttons stay at the bottom. We
     place THE SAME SENTENCE, FROM THE SAME FUNCTION, UNDER THE SAME CONDITION
     (status pending or reviewed) in the sticky bar beside the buttons. No new
     number, no new limit, no permission changed. */
  function limitLine(moduleId, id) {
    try {
      if (!AZB.isOn() || !global.Rules || !Rules.approverHint) return;
      var mod = Schema.get(moduleId); if (!mod || !mod.workflow) return;
      var rec = Store.find(mod.table, id); if (!rec) return;
      if (['pending', 'reviewed'].indexOf(rec.status) === -1) return;      /* الشرط نفسه — entity.js:393 */
      var hint = Rules.approverHint(mod, rec);
      if (!hint) return;
      var foot = document.getElementById('modalFoot');
      if (!foot || foot.querySelector('.azb-limit')) return;
      var el = document.createElement('div');
      el.className = 'azb-limit';
      el.setAttribute('role', 'note');
      el.innerHTML = AZB.icon('lock') + '<span>' + AZB.esc(hint) + '</span>';
      foot.insertBefore(el, foot.firstChild);
    } catch (e) { console.error('design-b-form limit line: ' + (e && e.message), e); }
  }
  function wrapDetail() {
    if (!global.EntityPage || EntityPage.__azbLimit) return;
    EntityPage.__azbLimit = true;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      var r = orig.apply(this, arguments);
      limitLine(moduleId, id);
      return r;
    };
  }

  /* ══ الأزرار المعطَّلة التي هي «شرح» لا «فعل» — أُضيف 10 سبتمبر (DESIGN-B-3) ══════
     ملفّات أخرى تشرح غياب زرٍّ بزرٍّ معطَّل جملته طويلة: ROBOT-2 «هذا المستند على مشروع/موقع غير
     مسند إلى حسابك…» (inbox-project-fence.js)، و«حساب الطوارئ لا يعتمد المستندات المالية…»
     (emergency-money-hold.js)، و«لا يمكنك اعتماد مستند أنشأته» (one-step-approval.js). قِيس على
     هاتف ٣٧٥: جملة ROBOT-2 امتدّت من 37 إلى 562 بكسل — خارج الشاشة، لأنّ .btn لا يلتفّ
     (styles.css:281) — ونصفها شفّاف (.btn:disabled opacity .5). نُعلِّمها ونعرضها **سطرَ ملاحظة**
     يلتفّ ويُقرأ بكامل وضوحه. لا يُلمس زرّ «حفظ» (btn-primary) ولا أيّ زرّ يعمل؛ الزرّ يبقى
     معطَّلاً كما هو، والجملة جملة صاحبها بالحرف.
     DISABLED BUTTONS THAT ARE AN EXPLANATION, NOT AN ACTION — added 10 Sept (DESIGN-B-3).
     Other files explain a missing button with a DISABLED button carrying a long sentence:
     ROBOT-2's project fence, ROBOT-2's emergency-account hold, and one-step-approval's
     «you cannot approve your own document». Measured on a 375 px phone: ROBOT-2's sentence
     ran from 37 to 562 px — off the screen, because .btn never wraps (styles.css:281) —
     and at half opacity (.btn:disabled). They are tagged and shown as a NOTE line that
     wraps and reads at full strength. «Save» (btn-primary) and every working button are
     untouched; the button stays disabled; the sentence stays its author's, verbatim. */
  var NOTE_MIN_CHARS = 24;
  function markNotes() {
    var foot = document.getElementById('modalFoot');
    if (!foot || !AZB.isOn()) return;
    [].forEach.call(foot.querySelectorAll('button'), function (b) {
      var isNote = b.disabled && !b.classList.contains('btn-primary') && (b.textContent || '').trim().length >= NOTE_MIN_CHARS;
      if (isNote && b.getAttribute('data-azb-note') !== '1') b.setAttribute('data-azb-note', '1');
      else if (!isNote && b.hasAttribute('data-azb-note')) b.removeAttribute('data-azb-note');
    });
  }

  function boot() {
    wrapDetail();
    var h = host();
    if (!h) { console.error('design-b-form.js: #' + HOST_ID + ' not found'); return; }
    /* شريط الأزرار يُستبدل محتواه مع كل نافذة (ui.js modal) — نراقبه هو لا المضيف
       The button bar's content is replaced with every dialog — watch IT, not the host. */
    var footEl = document.getElementById('modalFoot');
    if (footEl && global.MutationObserver && !footEl.__azbNotes) {
      footEl.__azbNotes = true;
      new MutationObserver(markNotes).observe(footEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    }
    if (h.__azbFormWatched) return;
    h.__azbFormWatched = true;
    /* 🔴 attributeFilter: ['hidden'] وليس attributes: true — apply() تضيف صنفاً
          على هذه العقدة، ومراقبة كل السمات تصنع حلقة تجمّد الصفحة بلا خطأ.
       🔴 attributeFilter ['hidden'], NOT attributes:true — apply() adds a class
          to this very node; watching all attributes makes a loop that can
          freeze the page with no error. A SECOND observer watches #modal's
          class alone, because ui.js:99 changes the size class on #modal
          (a child) when one dialog replaces another in the same host. */
    new MutationObserver(apply).observe(h, {
      childList: true, subtree: false,
      attributes: true, attributeFilter: ['hidden']
    });
    var m = document.getElementById('modal');
    if (m) new MutationObserver(apply).observe(m, { attributes: true, attributeFilter: ['class'] });
    global.addEventListener('resize', function () { liftToasts(); if (isOpenWide(host())) setBehindInert(true); });
    var foot = document.getElementById('modalFoot');
    if (foot && global.ResizeObserver) new ResizeObserver(liftToasts).observe(foot);
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.AZBForm = { apply: apply, isOpen: function () { return isOpenWide(host()); }, errorSummary: errorSummary, limitLine: limitLine,
                     setupFacts: setupFacts, setupBlock: setupBlock, markNotes: markNotes };
})(window);
