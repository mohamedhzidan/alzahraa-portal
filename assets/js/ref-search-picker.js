/* =========================================================================
   ref-search-picker.js — اكتب لتصفية قائمة طويلة بدل التمرير في ٢٥٠ اسماً
   ref-search-picker.js — type to filter a long list instead of scrolling 250

   ── الحاجة ──────────────────────────────────────────────────────────────
   اختيار موظف من قائمة فيها مئتان وخمسون اسماً على هاتف في الموقع تمرير
   طويل. مهندسو المواقع يبدأون ١ سبتمبر، ومعظمهم على هواتف.

   ── 🔴 هذه ميزة خصوصية قبل أن تكون راحة ─────────────────────────────────
   ref-dropdown-scope.js يقصّ خيارات كل قائمة مرتبطة بجدول آخر، فلا يرى
   موظفُ الروبيكي أسماءَ سوهاج. لو بنى هذا الملف قائمته من مصدر آخر — أو
   قرأ الخيارات **قبل** أن يعمل ذلك القصّ — لأعاد التسريب من الباب الخلفي:
   قائمة منسدلة أصلية مقصوصة بشكل صحيح، وفوقها منتقٍ جديد يعرض الجميع.

   🔴 **ولماذا التوقيت هو الخطر بالذات:** ref-dropdown-scope.js:150 يجدول
   القصّ على [0, 60, 300, 900] مللي ثانية. أي أن الخيارات الخام موجودة
   فعلاً في الصفحة للحظة قبل أن تُقصّ. منتقٍ يُبنى في تلك اللحظة يلتقط
   القائمة كاملة ويحتفظ بها إلى الأبد — والقائمة الأصلية تُقصّ بعده وتُخفى،
   فلا يظهر أي أثر للخطأ.

   ── العلاج، وهو استعمال لا نسخ ──────────────────────────────────────────
   ننادي **RefDropdownScope.applyFence() بأنفسنا وتزامنياً** قبل أن نقرأ
   خياراً واحداً. تنفيذ واحد للقاعدة، لا نسخة ثانية تتباعد (خطأ «التوأم
   الهشّ»). ثم نبني من `select.options` **بعد** القصّ — فما لا يجوز أن يراه
   الموظف ليس موجوداً أصلاً وقت البناء.

   والقائمة الأصلية تبقى مصدر الحقيقة: الاختيار يكتب `select.value` ويُطلق
   `change`، فيسمعه entity.js كما لو ضغط المستخدم القائمة بنفسه. حذف هذا
   الملف يعيد سلوك اليوم حرفياً.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   Picking one employee from 250 on a site phone is a long scroll. Site
   engineers start 1 September, mostly on phones.

   🔴 THIS IS A PRIVACY FEATURE BEFORE IT IS A CONVENIENCE.
   ref-dropdown-scope.js prunes every reference dropdown so an Elrobaki
   employee never sees Sohag's names. If this file built its list from
   another source — or read the options BEFORE that pruning ran — it would
   reopen the leak through the back door: a correctly pruned native select,
   with a new picker above it showing everyone.

   🔴 WHY THE TIMING IS THE DANGER: ref-dropdown-scope.js:150 schedules its
   pruning at [0, 60, 300, 900] ms. The raw options genuinely sit in the page
   for a moment before they are cut. A picker built in that moment captures
   the FULL list and keeps it for ever — and the native select is pruned and
   hidden afterwards, so nothing on screen ever shows the mistake.

   THE CURE, AND IT IS REUSE NOT COPYING: we call
   RefDropdownScope.applyFence() ourselves, SYNCHRONOUSLY, before reading a
   single option. One implementation of the rule, never a second copy that
   drifts (the fragile-twin mistake). Then we build from `select.options`
   AFTER the pruning — so what the person may not see does not exist at
   build time.

   The native select stays the source of truth: choosing writes
   `select.value` and fires `change`, which entity.js hears exactly as if the
   person had used the dropdown. Deleting this file restores today exactly.

   ⚠️ قائمة «الموقع» (ref: sites) مستثناة هنا كما في ref-dropdown-scope —
   site-options.js يتولاها بأسلوب أدقّ (يلفّ Store.all/Store.find لا الخيارات).
   ⚠️ The sites list is excluded here as it is there — site-options.js handles
   it with a more precise technique (wrapping Store.all/Store.find).

   مُثبَت بالتشغيل / proven by running: TESTS/ref-search-picker-trial.js
   (v2.0.29)
   ========================================================================= */
(function (global) {
  'use strict';

  var MARK     = 'az-refsearch';
  var BOX      = 'az-refsearch-box';
  var LIST     = 'az-refsearch-list';
  var ITEM     = 'az-refsearch-item';
  var STYLE_ID = 'azRefSearchStyle';

  /* دون هذا العدد لا فائدة: القائمة الأصلية أسرع من الكتابة.
     Below this many options the native list is faster than typing. */
  var MIN_OPTIONS = 12;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.' + BOX + '{width:100%;margin-block-end:4px}' +
      '.' + LIST + '{max-height:180px;overflow-y:auto;border:1px solid var(--line,#d8d8d8);' +
      'border-radius:6px;background:var(--card,#fff)}' +
      '.' + ITEM + '{padding:7px 10px;cursor:pointer;font-size:.92em}' +
      '.' + ITEM + '[aria-selected="true"]{background:var(--accent-soft,#eef)}' +
      /* أدوات لا معلومات — لا تُطبع · controls, not information: never print */
      '@media print{.' + BOX + ',.' + LIST + '{display:none}}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* 🔴 اقرأ الخيارات **بعد** القصّ، لا قبله — وهذا هو الملف كله.
     🔴 Read the options AFTER pruning, never before — this IS the file. */
  function prunedOptionsOf(select) {
    var out = [];
    for (var i = 0; i < select.options.length; i++) {
      var o = select.options[i];
      if (!o.value) continue;                    /* الخيار الفارغ «اختر…» */
      out.push({ value: o.value, label: o.textContent || o.value });
    }
    return out;
  }

  function enhance(select) {
    if (!select || select.getAttribute(MARK) === '1') return null;
    var opts = prunedOptionsOf(select);
    if (opts.length < MIN_OPTIONS) return null;

    injectStyle();
    select.setAttribute(MARK, '1');

    var wrap = select.parentNode;
    if (!wrap || !wrap.insertBefore) return null;

    var box = document.createElement('input');
    box.type = 'text';
    box.className = 'input ' + BOX;
    box.setAttribute('placeholder', L({ ar: 'اكتب للبحث…', en: 'Type to search…' }));
    box.setAttribute('aria-label', L({ ar: 'ابحث في القائمة', en: 'Search the list' }));

    var list = document.createElement('div');
    list.className = LIST;
    list.setAttribute('role', 'listbox');

    /* 🔴 المطابقة تمرّ على ArabicText.searchFold — ولا نكتب تطبيعاً هنا.
       كانت هذه الدالة تستعمل toLowerCase/indexOf وحدهما، وtoLowerCase لا
       تفعل شيئاً للعربية إطلاقاً. فكان «احمد» و«فاطمه» و«مصطفي» و«ابراهيم»
       — أي الكتابة الطبيعية في موقع مصري — كلها ترجع «لا نتيجة»، ولا يطابق
       إلا الشكل المهموز الدقيق. أربع من كل خمس كتابات واقعية كانت تفشل.
       أمسكته بوابة فحص مستقلة، لا أنا. والتطبيع يعيش في arabic-text.js —
       ملف النصّ العربي — فنسخة ثانية هنا كانت ستتباعد عنه.
       ولو غاب ذلك الملف نعود إلى المطابقة الحرفية: أضعف، لكنها لا تنهار.
       🔴 Matching goes through ArabicText.searchFold — no normaliser is
       written here. This used to be toLowerCase/indexOf alone, and
       toLowerCase does nothing whatever for Arabic, so «احمد», «فاطمه»,
       «مصطفي», «ابراهيم» — ordinary typing on an Egyptian site — all
       returned "no match"; only the exact hamza-carrying form matched. Four
       of five realistic typings failed. An independent gate caught it, not
       me. The normalisation lives in arabic-text.js, the Arabic text file; a
       second copy here would drift from it. If that file is ever absent we
       fall back to literal matching — weaker, but it does not break. */
    function fold(s) {
      try {
        if (global.ArabicText && typeof ArabicText.searchFold === 'function') {
          return ArabicText.searchFold(s);
        }
      } catch (e) {}
      return String(s == null ? '' : s).toLowerCase();
    }

    /* 🔴 التمريرة الثانية — بلا مسافات. أُضيفت ٣١ أغسطس ٢٠٢٦.
       «عبدالله» و«عبد الله» اسم واحد يُكتب بطريقتين، وكلتاهما صحيحة.
       التمريرة الأولى وحدها كانت ترجع «لا نتيجة» في خمس حالات من خمس
       جُرِّبت على الملف الحقيقي — منها «عبد الحي»، اسم أ. أحمد نفسه.
       والتطبيع يعيش في arabic-text.js كالأولى تماماً؛ لا نكتب نسخة هنا.
       🔴 Second pass — spaces removed. Added 31 Aug 2026.
       «عبدالله» and «عبد الله» are one name spelled two ways, both
       correct. The first pass alone returned "no match" on five of five
       realistic cases tried against the real file — among them «عبد
       الحي», أ. أحمد's own name. The normalisation lives in
       arabic-text.js exactly as the first one does; no copy is written
       here. */
    function tight(s) {
      try {
        if (global.ArabicText && typeof ArabicText.searchFoldTight === 'function') {
          return ArabicText.searchFoldTight(s);
        }
      } catch (e) {}
      return fold(s).replace(/\s+/g, '');
    }

    function render(filter) {
      list.innerHTML = '';
      var q = fold(filter);
      /* 🔴 «القديم أو الجديد» — والقديم أولاً عمداً.
         هذا الترتيب هو الضمانة نفسها: الشرط الأصلي باقٍ حرفياً كما كان،
         فكل ما كان يَظهر لا يزال يَظهر. التمريرة الثانية تُضيف ولا تحجب
         أبداً — وهذا ما يجعلها قراراً هندسياً لا قراراً لصاحب العمل.
         ولو حُذفت هذه الدالة عاد السلوك إلى ما كان عليه بالضبط.
         🔴 "old OR new" — and the old one first, deliberately.
         The ordering IS the guarantee: the original condition is still
         there word for word, so everything that showed before still
         shows. The second pass can only ADD, never hide — which is what
         makes it an engineering decision and not an owner question.
         Delete the tight() call and behaviour returns to exactly today. */
      var qTight = tight(filter);
      var shown = 0;
      opts.forEach(function (o) {
        if (q &&
            fold(o.label).indexOf(q) === -1 &&
            !(qTight && tight(o.label).indexOf(qTight) !== -1)) return;
        shown++;
        var item = document.createElement('div');
        item.className = ITEM;
        item.setAttribute('role', 'option');
        item.setAttribute('data-value', o.value);
        item.textContent = o.label;
        if (select.value === o.value) item.setAttribute('aria-selected', 'true');
        item.addEventListener('click', function () { choose(o.value); });
        list.appendChild(item);
      });
      if (!shown) {
        var none = document.createElement('div');
        none.className = ITEM;
        none.textContent = L({ ar: 'لا نتيجة', en: 'No match' });
        list.appendChild(none);
      }
    }

    /* القائمة الأصلية تبقى مصدر الحقيقة — نكتب فيها ونُطلق change، فيسمعه
       entity.js كما لو استعمل المستخدم القائمة بنفسه.
       The native select stays the source of truth — we write into it and
       fire change, which entity.js hears as if the person used it. */
    function choose(value) {
      select.value = value;
      try {
        var ev = document.createEvent ? document.createEvent('HTMLEvents') : null;
        if (ev && ev.initEvent) { ev.initEvent('change', true, false); select.dispatchEvent(ev); }
        else if (global.Event) select.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      render(box.value);
    }

    box.addEventListener('input', function () { render(box.value); });
    render('');

    wrap.insertBefore(box, select);
    wrap.insertBefore(list, select);
    /* لا نحذف القائمة الأصلية أبداً — نخفيها فقط، فتبقى قيمتها هي المحفوظة
       ويعود كل شيء بحذف هذا الملف.
       The native select is never removed, only hidden — its value is still
       what gets saved, and deleting this file restores everything. */
    select.style.display = 'none';

    return { count: opts.length, box: box, list: list };
  }

  function enhanceAll() {
    /* 🔴 القصّ أولاً، تزامنياً، بتنفيذه هو لا بنسخة منه. لو غاب الملف
       لأي سبب لا نُحسّن شيئاً إطلاقاً — منتقٍ بلا سياج أسوأ من لا منتقٍ.
       🔴 Prune FIRST, synchronously, using ITS implementation and never a
       copy. If that file is absent for any reason we enhance NOTHING — a
       picker without the fence is worse than no picker. */
    if (!global.RefDropdownScope || typeof RefDropdownScope.applyFence !== 'function') {
      try { console.warn('[ref-search-picker] ref-dropdown-scope.js is absent — ' +
        'no picker built, because a searchable list without its privacy fence ' +
        'could show one site\'s people to another.'); } catch (e) {}
      return 0;
    }
    try { RefDropdownScope.applyFence(); } catch (e) { return 0; }

    var built = 0;
    var form = document.getElementById('entForm');
    if (!form) return 0;

    /* 🔴 بنود السطور مستثناة صراحةً — وهذا عطل حقيقي قيس ولم يُفترض.
       entity.js:556 يضع `#linesWrap` **داخل** `<form id="entForm">`، فكان
       هذا الاستعلام يصل إلى قوائم السطور فعلاً. القياس:
       TESTS/picker-line-items-trial.js وجد منتقياً واحداً داخل الجدول، ثم
       اثنين بعد إضافة سطر.
       ولماذا هذا خطأ لا ميزة:
         ١) بند السطور **جدول** بخلايا ضيّقة؛ خانة بحث وقائمة ارتفاعها ١٨٠
            بكسل داخل خلية تُخرّب التخطيط — نفس عائلة قيد العرض في v2.0.21.
         ٢) **منتقٍ لكل سطر**: عشرة سطور = عشرة منتقين، بلا معنى.
         ٣) والسطر المُضاف بعد الفتح لا يحصل على واحد — فنصف الجدول بمنتقٍ
            ونصفه بلا منتقٍ. **وهذا أسوأ من لا منتقٍ إطلاقاً**: تناقض يراه
            المستخدم ولا يفهمه.
       ولا خسارة في الخصوصية: ref-dropdown-scope.js يقصّ قوائم `#linesWrap`
       أصلاً (سطر ١٤٩)، فالقائمة الأصلية هناك مسيّجة كما كانت تماماً.

       🔴 Line items are EXCLUDED explicitly — a real defect, MEASURED not
       assumed. entity.js:556 puts `#linesWrap` INSIDE `<form id="entForm">`,
       so this query really did reach line selects:
       TESTS/picker-line-items-trial.js found ONE picker inside the table,
       then TWO after adding a row.
       Why that is a fault and not a feature:
         1) Line items are a TABLE with narrow cells; a search box and a
            180px list inside a cell wrecks the layout — the same family as
            the v2.0.21 width constraint.
         2) ONE PICKER PER ROW: ten lines = ten pickers, meaningless.
         3) A row added after opening gets none — half the table with a
            picker and half without. **That is worse than none at all**: a
            contradiction the person can see and cannot explain.
       No privacy is lost: ref-dropdown-scope.js already prunes `#linesWrap`
       selects (:149), so the native dropdown there stays fenced exactly as
       before. */
    var lines = document.getElementById('linesWrap');
    var sels = form.querySelectorAll('select[name]');
    for (var i = 0; i < sels.length; i++) {
      if (lines && lines.contains && lines.contains(sels[i])) continue;
      if (enhance(sels[i])) built++;
    }
    return built;
  }

  function install() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__azRefSearchInstalled) return false;
    var orig = UI.modal;
    UI.modal = function () {
      var out = orig.apply(UI, arguments);
      /* بعد العودة: ref-dropdown-scope قد ضبط lastOpts بالفعل (لافّته أدخل
         منّا)، فـapplyFence تعمل صحيحاً حين نناديها.
         After the call returns, ref-dropdown-scope has already set its
         lastOpts (its wrapper is inner to ours), so applyFence works when we
         call it. */
      try { setTimeout(enhanceAll, 0); } catch (e) {}
      return out;
    };
    UI.__azRefSearchInstalled = true;
    return true;
  }

  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.RefSearchPicker = {
    enhance: enhance,
    enhanceAll: enhanceAll,
    prunedOptionsOf: prunedOptionsOf,
    MIN_OPTIONS: MIN_OPTIONS,
    __install: install
  };
})(window);
