/* =========================================================================
   design-b-kit.js — الأساس المشترك للتصميم «ب»: العلم، الأيقونات، أدوات صغيرة
                     Shared base for Design B: the flag, the icons, small tools
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.
      الملفّ الأساس لبقية ملفّات «ب»، ويُحمَّل أوّلَها. / The base the other Design B files use; it loads first of them.

   يُحمَّل أولاً بين ملفّات design-b، ولا يعدّل شيئاً بنفسه: يضع السمة
   data-az-designb="on" على <html> فتشتغل design-b.css، ويوفّر عائلة
   أيقونات واحدة للبقية.

   Loaded first among the design-b files. It changes nothing by itself: it
   sets data-az-designb="on" on <html>, which is what switches design-b.css
   on, and it provides ONE icon family for the rest.

   ── التراجع / ROLLBACK ────────────────────────────────────────────────
   AZB.off() في الطرفية يعيد الشاشة إلى شكلها السابق فوراً بلا إعادة تحميل،
   وحذف ملفّات design-b من loader.js يعيدها نهائياً. لا يُعدَّل أي ملف قائم.
   AZB.off() in the console returns the screen to its previous appearance
   immediately, with no reload; removing the design-b files from loader.js
   removes it permanently. No existing file is edited.

   ── أُضيف 10 سبتمبر (DESIGN-B-2) ─────────────────────────────────────────
   ١) AZB.t({ar,en}) — كل نصّ في «ب» بلغتين. قِيس: الواجهة الإنجليزية كانت
      تعرض عناوين «ب» بالعربية وحدها.
   ٢) رابط «تخطّي إلى المحتوى» أوّلَ ما يصل إليه المفتاح Tab — قاعدة التصميم
      المعتمد §8. قِيس: الموقع لا يملك واحداً.
   1) AZB.t({ar,en}) — every Design B string in both languages. Measured:
      the English interface showed Design B's labels in Arabic only.
   2) A «skip to content» link as the FIRST thing Tab reaches — approved
      design rule §8. Measured: the portal has none.
   ========================================================================= */
(function (global) {
  'use strict';

  if (global.AZB) return;                       /* حارس التحميل المزدوج */

  /* ── عائلة أيقونات واحدة: 24×24، سُمك 1.75، أطراف دائرية، بلا تعبئة ──
     ONE icon family: 24x24, stroke 1.75, round caps, no fill, currentColor.
     The portal draws icons from several sources at several weights; a mixed
     set is the fastest way to make a careful screen look careless. */
  var P = {
    inbox:   '<path d="M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    folder:  '<path d="M3.5 6.5h6l2 2.5h9a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 18V8a1.5 1.5 0 0 1 1.5-1.5z"/>',
    box:     '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    brief:   '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 13h18"/>',
    menu:    '<path d="M4 7h16M4 12h16M4 17h16"/>',
    grid:    '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    search:  '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5"/>',
    clock:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    warn:    '<path d="M12 4 2.5 20h19zM12 10v4M12 17.2v.1"/>',
    check:   '<path d="M4 12.5 9 17.5 20 6.5"/>',
    checkc:  '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2 11 14.7l4.5-4.9"/>',
    lock:    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    send:    '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4z"/>',
    file:    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/>',
    eye:     '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    info:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.1"/>',
    build:   '<path d="M4 20.5V4.5A1 1 0 0 1 5 3.5h9a1 1 0 0 1 1 1v16M15 10.5h4a1 1 0 0 1 1 1v9M2.5 20.5h19M7.5 7.5h1M11 7.5h1M7.5 11.5h1M11 11.5h1M7.5 15.5h1M11 15.5h1"/>',
    users:   '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
    chevron: '<path d="M14.5 6 9 12l5.5 6"/>',
    chart:   '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };

  function icon(name, cls) {
    var d = P[name];
    /* الأيقونة المفقودة تصرخ ولا تختفي: أيقونة غائبة بصمت تعني شاشة تبدو
       تامّة وهي ناقصة.  A missing icon SHOUTS rather than vanishing —
       a silently absent icon means a screen that looks finished and is not. */
    if (!d) {
      if (global.console) console.error('AZB.icon: no icon named "' + name + '"');
      d = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
           (cls ? ' class="' + cls + '"' : '') + '>' + d + '</svg>';
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── اللغة: نصّ «ب» يتبع لغة الموقع نفسها ─────────────────────────────
     LANGUAGE: Design B's text follows the portal's OWN language setting.
     عربيٌّ أوّلاً: إن غاب النصّ الإنجليزي عُرض العربي، لا فراغ.
     Arabic first: if the English is missing, the Arabic shows — never blank. */
  function lang() {
    try { return (global.I18N && I18N.getLang && I18N.getLang() === 'en') ? 'en' : 'ar'; }
    catch (e) { return 'ar'; }
  }
  function t(o) {
    if (o === null || o === undefined) return '';
    if (typeof o === 'string') return o;
    return lang() === 'en' ? (o.en || o.ar || '') : (o.ar || o.en || '');
  }

  /* ── قواعد المال الثلاث — عرضاً فقط ────────────────────────────────────
     THE THREE MONEY RULES — presentation only.
     🔴 لا تُغيَّر قيمة، ولا حساب، ولا حدّ اعتماد. صفرٌ حقيقي يبقى صفراً.
     🔴 No value, calculation or approval limit is changed. A real zero stays
     a zero and is rendered as an ordinary number, because zero IS a value. */

  /* غير متاح: الرقم غير موجود. لا يُعرض صفراً أبداً.
     UNAVAILABLE: the number does not exist. Never rendered as zero. */
  function na(why) {
    var w = t(why) || t({ ar: 'غير متاح', en: 'Not available' });
    return '<span class="azb-na" title="' + esc(w) + '">' +
             '<span class="azb-na-k">' + esc(t({ ar: 'غير متاح: ', en: 'Not available: ' })) + '</span>' + esc(w) + '</span>';
  }

  /* ناقص: السجلّ نفسه غير مكتمل، ويُسمَّى الناقص بالاسم — «ناقص» بلا تسمية
     تنقل البحث إلى الموظف.
     INCOMPLETE: the record itself is unfinished, and what is missing is
     NAMED. "Incomplete" without naming the gap just moves the search to the
     employee. */
  function inc(missing) {
    return '<span class="azb-inc">' + icon('warn') + esc(t({ ar: 'ناقص: ', en: 'Incomplete: ' })) + esc(t(missing)) + '</span>';
  }

  var FLAG = 'data-az-designb';

  /* ── «تخطّي إلى المحتوى» — أوّل ما يصل إليه Tab ───────────────────────
     SKIP TO CONTENT — the first thing Tab reaches. Hidden until focused;
     it moves focus to the portal's own #content, which already carries
     tabindex="-1" (index.html:190), so nothing in the portal is changed. */
  function addSkip() {
    if (document.getElementById('azbSkip') || !document.body) return;
    var a = document.createElement('a');
    a.id = 'azbSkip';
    a.className = 'azb-skip';
    a.href = '#content';
    a.textContent = t({ ar: 'تخطَّ إلى المحتوى', en: 'Skip to content' });
    a.addEventListener('click', function (e) {
      var c = document.getElementById('content');
      if (!c) return;
      e.preventDefault();          /* لا نغيّر #المسار — التوجيه في الموقع يقرأ الـ hash */
      c.focus();
    });
    document.body.insertBefore(a, document.body.firstChild);
  }

  function on() {
    document.documentElement.setAttribute(FLAG, 'on');
    if (document.body) addSkip();
    else document.addEventListener('DOMContentLoaded', addSkip);
  }
  /* 🔴 قائمة العناصر التي نضيفها — مكتوبة في مكان واحد لأن التراجع الناقص
        هو أسوأ من عدم وجود تراجع: يبقى أثرٌ ويظنّ الجميع أنّ الشاشة نظيفة.
        وقد رسب هذا فعلاً: أوّل نسخة من off() نسيت شريط عنوان النموذج وباب
        «كل الشاشات»، فوجدها الفحص G.6 لا القراءة.
        🔴 EVERY element we add, listed in ONE place, because an incomplete
        rollback is worse than none: a remnant is left and everyone believes
        the screen is clean. This genuinely failed — the first version of
        off() forgot the form heading bar and the «all screens» door, and
        check G.6 found it, not reading. Add to this list whenever a new
        element is introduced. */
  var OURS = ['azbDests', 'azbAll', 'azbTabs', 'azbSkip'];
  /* وأصنافٌ وسماتٌ نضعها على عناصر الموقع نفسها — تُزال كلّها كذلك
     Classes and attributes we put on the portal's OWN elements — all removed too. */
  var OUR_CLASSES = ['azb-page', 'azb-form-open', 'azb-kpi-extra', 'azb-cards'];
  /* (DESIGN-B-3) + .azb-setup — «قبل أن تبدأ» في النموذج و«بلا موقع» في الصفحة الأولى
     (DESIGN-B-3) + .azb-setup — the form's «before you start» and the home's «no site» */
  var OUR_SELECTORS = '.azb-queue, .azb-scope, .azb-sumtoggle, .azb-mine-chip, .azb-errsum, .azb-regscope, .azb-docres, .azb-limit, .azb-setup';

  function off() {
    document.documentElement.removeAttribute(FLAG);
    /* أظهر كل ما أخفيناه، فلا يبقى أثر / reveal everything we hid */
    var nav = document.getElementById('mainNav');
    if (nav) [].forEach.call(nav.querySelectorAll('.nav-group'), function (g) { g.hidden = false; });
    OURS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    [].forEach.call(document.querySelectorAll(OUR_SELECTORS), function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    OUR_CLASSES.forEach(function (c) {
      [].forEach.call(document.querySelectorAll('.' + c), function (el) {
        el.classList.remove(c);
        if (c === 'azb-kpi-extra') el.hidden = false;
      });
    });
    document.documentElement.classList.remove('azb-form-open');
    if (document.documentElement.style && document.documentElement.style.removeProperty) document.documentElement.style.removeProperty('--azb-toast-bottom');
    [].forEach.call(document.querySelectorAll('[data-azb-label]'), function (el) { el.removeAttribute('data-azb-label'); });
    [].forEach.call(document.querySelectorAll('[data-azb-note]'), function (el) { el.removeAttribute('data-azb-note'); });   /* (DESIGN-B-3) */
    [].forEach.call(document.querySelectorAll('[data-azb-aria]'), function (el) { el.removeAttribute('aria-label'); el.removeAttribute('data-azb-aria'); });
    [].forEach.call(document.querySelectorAll('[data-azb-inert]'), function (el) { el.removeAttribute('inert'); el.removeAttribute('data-azb-inert'); });
    [].forEach.call(document.querySelectorAll('tr[data-azb-hidden]'), function (tr) { tr.hidden = false; tr.removeAttribute('data-azb-hidden'); });
    /* 🔴 أعِد رسم الشاشة الحالية بيد الموقع نفسه: design-b-open-path.js أعاد ربط
          نقرة الصفّ، ولا يعود المعالج الأصلي إلّا برسمٍ جديد. بلا هذا يبقى أثرٌ
          خفيّ حتى أوّل تنقّل — وهو ما يمنعه قانون «التراجع لا يترك أثراً».
       🔴 Redraw the current screen with the portal's OWN render: open-path
          re-pointed the row clicks, and the original handler only returns with a
          fresh draw. Without this a hidden remnant survives until the next
          navigation — exactly what "rollback leaves nothing behind" forbids. */
    try { if (global.App && App.refresh) App.refresh(); } catch (e) { /* لا شاشة بعد — nothing drawn yet */ }
  }

  function isOn() { return document.documentElement.getAttribute(FLAG) === 'on'; }

  /* ══ 🔴 خطّاف واحد لكل رسمٍ للسجلّ — أُضيف 10 سبتمبر بعد قياسٍ فاضح ══════
     entity.js يعيد رسم السجلّ من داخله (رقاقة حالة، بحث، ترتيب، صفحة) بالدالّة
     render **الداخلية** — لا بـ EntityPage.render المُصدَّرة التي تلفّها ملفّات
     «ب». قِيس: بعد ضغطة «مسودة» أو كتابة حرف في البحث اختفى كل ما أضافته «ب»
     — ورجعت الخلايا التسع إلى «0.00 ج.م» لمبلغ لم يُسجَّل. فالإصلاح الذي قيل
     إنّه يعمل كان يعمل حتى أوّل نقرة فقط.
     الآن: خطّاف واحد يعمل في الحالتين — لفّ المُصدَّرة، ومراقبة #content حين
     يُستبدل محتواه. وكل ملفّ من ملفّات السجلّ يسجّل نفسه هنا بدل لفّه الخاصّ.

     🔴 ONE hook for every register draw — added 10 Sept after a damning
     measurement. entity.js redraws the register from INSIDE (status chip,
     search, sort, page) with its INTERNAL render — not the exported
     EntityPage.render that Design B's files wrapped. Measured: after one
     press of «draft» or one letter typed in search, everything Design B
     added was gone — and the nine cells went back to «0.00 ج.م» for an
     amount never recorded. The fix that was reported working worked until
     the first click. Now one hook covers both: the export is wrapped AND
     #content is watched for its contents being replaced. Every register file
     registers here instead of wrapping on its own. */
  var regHooks = [];
  function onRegister(fn) { if (typeof fn === 'function') regHooks.push(fn); }
  function runRegister(moduleId, host) {
    if (!isOn() || !host) return;
    var head = host.querySelector('.page-head');
    if (head) head.__azbReg = true;            /* هذه النسخة من الرسم عولجت */
    regHooks.forEach(function (fn) {
      try { fn(moduleId, host); } catch (e) { console.error('design-b register hook: ' + (e && e.message), e); }
    });
  }
  function installRegisterHook() {
    if (!global.EntityPage || EntityPage.__azbRegHook) return !!(global.EntityPage && EntityPage.__azbRegHook);
    EntityPage.__azbRegHook = true;
    var orig = EntityPage.render;
    EntityPage.render = function (moduleId, host) {
      var r = orig.apply(this, arguments);
      runRegister(moduleId, host || document.getElementById('content'));
      return r;
    };
    var c = document.getElementById('content');
    if (c && global.MutationObserver) {
      /* childList فقط على #content: الرسم الداخلي يستبدل innerHTML كلّه.
         childList ONLY on #content: the internal redraw replaces innerHTML. */
      new MutationObserver(function () {
        var head = c.querySelector('.page-head');
        if (!head || head.__azbReg || !c.querySelector('.table-toolbar')) return;
        var route = '';
        try { route = global.App && App.route ? App.route() : ''; } catch (e) {}
        var mod = null; try { mod = route && Schema.get(route); } catch (e) {}
        if (!mod) return;
        runRegister(route, c);
      }).observe(c, { childList: true });
    }
    return true;
  }
  if (!installRegisterHook()) {
    document.addEventListener('DOMContentLoaded', installRegisterHook);
    setTimeout(installRegisterHook, 1500);
  }

  global.AZB = {
    icon: icon, esc: esc, na: na, inc: inc, t: t, lang: lang,
    on: on, off: off, isOn: isOn, onRegister: onRegister, runRegister: runRegister,
    OURS: OURS
  };

  on();
})(window);
