/* =========================================================================
   design-b-phone.js — شريط تبويب سفلي للهاتف
                       A bottom tab bar for phones
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ لماذا ══════════════════════════════════════════════════════════════
   الموقع اليوم يعطي الهاتف الشريط الجانبي نفسه ينزلق من الحافة، ولا شيء
   غير ذلك. Today the portal gives a phone the same sidebar sliding in from
   the edge and nothing else.

   ══ الوجهات تُقرأ من القائمة نفسها، لا من قائمة مكتوبة ══════════════════
   كل زرّ تبويب يوجّه إلى مسارٍ **موجود فعلاً في قائمة هذا المستخدم**. ولا
   يُخترع مسار واحد. والتبويبات هي الوجهات الخمس نفسها في design-b-nav.js
   (AZBNav.dests)، فلا يختلف الهاتف عن الحاسب في مكان أيّ شاشة.
   Each tab points at a route that genuinely exists in THIS user's menu. No
   route is ever invented. The tabs ARE the five destinations of
   design-b-nav.js (AZBNav.dests), so phone and desktop can never disagree
   about where a screen lives — and a group is recognised by its identity,
   not its (language-dependent) title.

   ══ هدف اللمس ══════════════════════════════════════════════════════════
   44×44 بكسل هدفُ هذا المشروع — وليس الحدّ الأدنى في WCAG 2.2 AA (24×24).
   44x44 is THIS PROJECT'S target — NOT the WCAG 2.2 AA minimum (24x24).
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-phone.js needs design-b-kit.js first'); return; }

  function dests() { return (global.AZBNav && AZBNav.dests) || []; }

  /* أول مسار متاح فعلاً داخل وجهةٍ ما لهذا المستخدم
     The first route that genuinely exists inside a destination for THIS user */
  function firstRouteIn(dest) {
    var nav = document.getElementById('mainNav');
    if (!nav || !global.AZBNav) return null;
    var groups = nav.querySelectorAll('.nav-group');
    for (var i = 0; i < groups.length; i++) {
      if (AZBNav.destFor(AZBNav.groupId(groups[i])).id !== dest.id) continue;
      var item = groups[i].querySelector('.nav-item[data-route]');
      if (item) return item.getAttribute('data-route');
    }
    return null;
  }

  function badge(route) {
    var b = document.querySelector('#mainNav .nav-item[data-route="' + route + '"] .nav-count');
    if (!b || b.hidden) return 0;
    var n = parseInt((b.textContent || '').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function currentRoute() {
    try { return (global.App && App.route) ? App.route() : (location.hash || '').replace('#', ''); }
    catch (e) { return ''; }
  }

  function build() {
    if (!AZB.isOn()) return;
    var nav = document.getElementById('mainNav');
    if (!nav || !nav.querySelector('.nav-group') || !dests().length) return;

    var bar = document.getElementById('azbTabs');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'azbTabs';
      bar.className = 'azb-tabs';
      document.body.appendChild(bar);
    }
    bar.setAttribute('aria-label', AZB.t({ ar: 'التنقّل السريع', en: 'Quick navigation' }));

    var route = currentRoute();
    /* 🔴 التبويب النشط = وجهة الشاشة الحالية، لا مطابقة أوّل مسار فقط. قِيس: في
          «إذون الاستلام» بقي «شغلي» مضاءً، لأنّ تبويب «المخزن والمال» يشير إلى أوّل
          شاشة في مجموعته فقط.
       🔴 The active tab = the CURRENT screen's destination, not just a match on the
          first route. Measured: on «goods receipts» the «My work» tab stayed lit,
          because the «Stores & money» tab points at its group's first screen only. */
    var curDest = null;
    try {
      var it = document.querySelector('#mainNav .nav-item[data-route="' + route + '"]');
      var grp = it && it.closest('.nav-group');
      if (grp && global.AZBNav) curDest = AZBNav.destFor(AZBNav.groupId(grp)).id;
    } catch (e) { curDest = null; }
    var inbox = badge('inbox') + badge('alerts');
    var html = '';
    dests().forEach(function (d) {
      var drawer = d.id === 'more';
      var target = d.id === 'work' ? 'dashboard' : (drawer ? null : firstRouteIn(d));
      /* لا زرّ بلا وجهة حقيقية — زرٌّ يقود إلى رفض أسوأ من غيابه
         No button without a real destination. */
      if (!drawer && !target) return;
      var isHere = curDest ? curDest === d.id : (!drawer && target === route);
      html += '<button type="button" class="azb-tab" data-tab="' + d.id + '"' +
        (target ? ' data-route="' + AZB.esc(target) + '"' : '') +
        (drawer ? ' data-drawer="1" aria-haspopup="true"' : '') +
        (isHere ? ' aria-current="page"' : '') + '>' +
        AZB.icon(d.icon) + '<span class="lbl">' + AZB.esc(AZB.t(d)) + '</span>' +
        (d.id === 'work' && inbox ? '<b aria-label="' + AZB.esc(AZB.t({ ar: 'بانتظارك ', en: 'waiting ' }) + inbox) + '">' + inbox + '</b>' : '') +
        '</button>';
    });
    bar.innerHTML = html;

    [].forEach.call(bar.querySelectorAll('.azb-tab'), function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-drawer')) {
          /* «المزيد» يفتح الشريط الجانبي القائم بزرّه القائم — لا درج جديد
             "More" opens the portal's OWN sidebar with its OWN button. */
          if (global.AZBNav) AZBNav.show('more');
          var mb = document.getElementById('menuBtn');
          if (mb) mb.click();
          return;
        }
        var r = b.getAttribute('data-route');
        if (r && global.App && App.go) App.go(r);
      });
    });
  }

  function watch() {
    /* مستمع واحد فقط لتغيّر المسار — watch() تُنادى مرّتين عند الإقلاع
       ONE hashchange listener only — watch() is called twice at boot. */
    if (!global.__azbTabsHash) { global.__azbTabsHash = true; window.addEventListener('hashchange', build); }
    /* 🔴 app.js يغيّر العنوان بـ history.replaceState (app.js:239) فلا يُطلَق hashchange
          أبداً — فكان التبويب النشط لا يتبع التنقّل. نعيد البناء حين يُرسم محتوى
          شاشة جديدة (childList على #content، كما في خطّاف السجلّ).
       🔴 app.js changes the address with history.replaceState (app.js:239), which
          never fires hashchange — so the active tab did not follow navigation.
          Rebuild when a new screen's content is drawn (childList on #content, as
          the register hook does). */
    var content = document.getElementById('content');
    if (content && !content.__azbTabsWatched && global.MutationObserver) {
      content.__azbTabsWatched = true;
      var last = '';
      new MutationObserver(function () { var r = currentRoute(); if (r !== last) { last = r; build(); } }).observe(content, { childList: true });
    }
    var nav = document.getElementById('mainNav');
    if (nav && !nav.__azbTabsWatched) {
      nav.__azbTabsWatched = true;
      new MutationObserver(build).observe(nav, { childList: true });
    }
    build();
  }

  function boot() {
    watch();
    var tries = 0;
    var t = setInterval(function () {
      if (++tries > 40) { clearInterval(t); return; }
      var nav = document.getElementById('mainNav');
      if (nav && nav.querySelector('.nav-group')) { watch(); clearInterval(t); }
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.AZBPhone = { build: build };
})(window);
