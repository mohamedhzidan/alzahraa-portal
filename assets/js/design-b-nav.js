/* =========================================================================
   design-b-nav.js — خمس وجهات بدل سبع مجموعات
                     Five destinations instead of seven groups
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ القرار التقني الأهم في هذا الملف، ولماذا ═════════════════════════════
   لا يُحذف ولا يُعاد بناء أيّ زرّ في القائمة. app.js يبني الأزرار ويعلّق على
   كلٍّ منها onclick خاصّاً به (go(id))، وdc-requests.js يضيف مجموعاته ويراقب
   القائمة بـ MutationObserver ويعيد الإضافة كلّما تغيّرت.
   فلو مسحنا القائمة وأعدنا بناءها: لضاعت معالجات النقر الأصلية، ولدخلنا في
   حلقة مع مراقب dc-requests، ولانكسرت الروابط المباشرة (#route) بلا إنذار.
   لذلك: **نُخفي ونُظهر، ولا نبني.**

   No menu button is ever removed or rebuilt. app.js builds the buttons and
   attaches each one's own onclick; dc-requests.js appends its groups and
   watches the nav. Wiping and rebuilding would lose the handlers, fight that
   observer, and break deep links silently. So: **we hide and show; we never
   build.** The buttons remain the very same buttons with the very same
   handlers, and we add a destination rail above them that controls what is
   DISPLAYED, never what exists.

   ══ 🔴 أُعيد 10 سبتمبر (DESIGN-B-2): التعرّف على المجموعة بهويّتها، لا بعنوانها ══
   النسخة السابقة طابقت **عنوان** المجموعة العربي بالحرف. قِيس في الواجهة
   الإنجليزية: العناوين تصير «Finance, Procurement & Stores»… فلا يطابق شيء،
   فتسقط كل المجموعات في «المزيد» وتختفي الوجهات الأربع الأخرى — التصميم كله
   ينهار في لغةٍ واحدة من لغتي الموقع، والشاشة تبدو سليمة.
   الآن تُعرف المجموعة بثلاث طرق، بالترتيب: سمة data-az-group التي يضعها
   dc-requests، ثم مطابقة العنوان بتسميتَي Schema.GROUPS (عربي وإنجليزي)، ثم
   مسارات بنودها نفسها. وما لا يُعرف يذهب إلى «المزيد» ولا يُسقط أبداً.

   🔴 REWORKED 10 Sept (DESIGN-B-2): a group is recognised by its IDENTITY,
   not its title. The previous version matched the Arabic TITLE verbatim.
   In the English interface the titles become "Finance, Procurement &
   Stores"… nothing matched, every group fell into «More», and the other
   four destinations vanished — the whole design collapsed in one of the
   portal's two languages while the screen looked fine.
   Now a group is identified three ways, in order: the data-az-group
   attribute dc-requests sets, then its title against BOTH labels in
   Schema.GROUPS, then the routes of its own items. Anything unrecognised
   goes to «More» and is NEVER dropped.

   ══ القرار المعتمد (١٠ سبتمبر): خمس وجهات، والعنوانان ظاهران ══════════════
   «المشروعات والمكتب الفني» و«الموقع والتنفيذ» معاً تحت «المشروعات والموقع»،
   وعنوانا المجموعتين الأصليّان ظاهران داخلها. — قرار محمد زيدان، ١٠ سبتمبر.
   APPROVED 10 Sept: five destinations; «Projects & Technical Office» and
   «Site & Execution» together under «Projects & Site», with both original
   headings visible inside it — Mohamed Zidan's decision.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-nav.js needs design-b-kit.js first'); return; }

  /* الوجهات الخمس — تُعرَّف بهويّات المجموعات، لا بعناوينها.
     التسمية «المخزن والمال» كما في المعاينة المعتمدة (B.src.html:221).
     The five destinations — defined by group IDS, never by titles.
     «المخزن والمال» is the approved preview's own label (B.src.html:221). */
  var DESTS = [
    { id: 'work',  icon: 'inbox',  ar: 'شغلي',             en: 'My work',
      sub: { ar: 'ما ينتظر إجراءً منك', en: 'What is waiting for you' }, groups: ['main'] },
    { id: 'docs',  icon: 'folder', ar: 'المستندات',         en: 'Documents',
      sub: { ar: 'مراسلات · اعتمادات · طلبات', en: 'Letters · submittals · requests' }, groups: ['dc'] },
    { id: 'money', icon: 'box',    ar: 'المخزن والمال',     en: 'Stores & money',
      sub: { ar: 'صرف · استلام · شراء · فواتير', en: 'Issue · receive · buy · invoices' }, groups: ['finance'] },
    { id: 'proj',  icon: 'brief',  ar: 'المشروعات والموقع', en: 'Projects & site',
      sub: { ar: 'مشروعات · مكتب فني · تنفيذ', en: 'Projects · technical office · execution' }, groups: ['projects', 'site'] },
    { id: 'more',  icon: 'menu',   ar: 'المزيد',            en: 'More',
      sub: { ar: 'أفراد · تقارير · إعدادات', en: 'People · reports · settings' }, groups: ['people', 'system'], catchAll: true }
  ];

  /* المسارات التي لا تنتمي إلى شاشة في Schema.MODULES — مكتوبة في app.js:169-181
     Routes that are not Schema.MODULES screens — as written in app.js:169-181. */
  var HAND_ROUTES = { dashboard: 'main', inbox: 'main', alerts: 'main', assistant: 'main', reports: 'system', settings: 'system' };

  var current = 'work';
  var rendering = false;          /* حارس ضدّ الحلقة مع مراقب dc-requests */

  /* ── قاطع الدائرة / THE CIRCUIT BREAKER ────────────────────────────────
     أكثر من ٢٠٠ رسم في خمس ثوانٍ يفصل المراقب نهائياً ويصرخ في الطرفية.
     التصميم يتوقّف عن التحديث — والموقع يبقى صالحاً. تجميد شاشة موظّف في
     الموقع ليس خياراً مقبولاً أبداً.
     More than 200 renders in five seconds disconnects the observer for good,
     with a shout in the console. The design stops updating; the portal stays
     usable. Freezing someone's screen is never an acceptable outcome. */
  var renderCount = 0, windowStart = 0, brokenOpen = false;
  var MAX_RENDERS = 200, WINDOW_MS = 5000;

  function tripped() {
    if (brokenOpen) return true;
    var now = Date.now();
    if (now - windowStart > WINDOW_MS) { windowStart = now; renderCount = 0; }
    if (++renderCount > MAX_RENDERS) {
      brokenOpen = true;
      if (observer) { try { observer.disconnect(); } catch (e) {} }
      console.error('design-b-nav: circuit breaker tripped — ' + MAX_RENDERS +
        ' renders in under ' + (WINDOW_MS / 1000) + 's. The destination rail has stopped ' +
        'updating on purpose; the portal itself is unaffected. This is a bug in ' +
        'design-b-nav.js and should be reported, not ignored.');
      return true;
    }
    return false;
  }
  var observer = null;

  function navEl() { return document.getElementById('mainNav'); }

  /* هويّة المجموعة — ثلاث طرق، بالترتيب، ولا تخمين
     The group's identity — three ways, in order, and no guessing. */
  function groupId(g) {
    var tagged = g.getAttribute('data-az-group');
    if (tagged) return tagged;
    var tEl = g.querySelector('.nav-group-title');
    var title = tEl ? tEl.textContent.trim() : '';
    var G = (global.Schema && Schema.GROUPS) || [];
    for (var i = 0; i < G.length; i++) {
      var lb = G[i].label || {};
      if (title && (title === lb.ar || title === lb.en)) return G[i].id;
    }
    /* من مسارات البنود نفسها: أغلبية مجموعات شاشاتها
       From the items' own routes: the majority group of their screens. */
    var votes = {};
    [].forEach.call(g.querySelectorAll('.nav-item[data-route]'), function (b) {
      var r = b.getAttribute('data-route');
      var gid = HAND_ROUTES[r];
      if (!gid) { try { var m = Schema.get(r); gid = m && m.group; } catch (e) {} }
      if (gid) votes[gid] = (votes[gid] || 0) + 1;
    });
    var best = null, n = 0;
    Object.keys(votes).forEach(function (k) { if (votes[k] > n) { n = votes[k]; best = k; } });
    return best || '';
  }

  function readGroups() {
    var nav = navEl();
    if (!nav) return [];
    return [].map.call(nav.querySelectorAll('.nav-group'), function (g) {
      var t = g.querySelector('.nav-group-title');
      return { el: g, id: groupId(g), title: t ? t.textContent.trim() : '', items: g.querySelectorAll('.nav-item').length };
    });
  }

  function destFor(gid) {
    for (var i = 0; i < DESTS.length; i++) if (DESTS[i].groups.indexOf(gid) !== -1) return DESTS[i];
    for (var j = 0; j < DESTS.length; j++) if (DESTS[j].catchAll) return DESTS[j];
    return DESTS[DESTS.length - 1];
  }

  /* عدّاد الشارة: من شارة الموقع نفسها، فيبقى رقماً واحداً في الموقع كلّه.
     The badge count is read from the portal's OWN badge, never recomputed. */
  function badgeOf(route) {
    var b = document.querySelector('#mainNav .nav-item[data-route="' + route + '"] .nav-count');
    if (!b || b.hidden) return 0;
    var n = parseInt((b.textContent || '').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function render() {
    if (rendering || brokenOpen) return;
    var nav = navEl();
    if (!nav) return;
    if (tripped()) return;
    rendering = true;
    try {
      var groups = readGroups();
      if (!groups.length) return;

      var bucket = {};
      DESTS.forEach(function (d) { bucket[d.id] = []; });
      groups.forEach(function (g) { bucket[destFor(g.id).id].push(g); });

      /* أظهر مجموعات الوجهة الحالية فقط — ولا تلمس الأزرار نفسها */
      groups.forEach(function (g) { g.el.hidden = (destFor(g.id).id !== current); });

      var rail = document.getElementById('azbDests');
      if (!rail) {
        rail = document.createElement('div');
        rail.id = 'azbDests';
        rail.className = 'azb-dests';
        rail.setAttribute('role', 'group');
        nav.parentNode.insertBefore(rail, nav);
      }
      rail.setAttribute('aria-label', AZB.t({ ar: 'الوجهات', en: 'Destinations' }));

      var inbox = badgeOf('inbox'), alerts = badgeOf('alerts');
      rail.innerHTML = DESTS.map(function (d) {
        var count = bucket[d.id].reduce(function (n, g) { return n + g.items; }, 0);
        if (!count) return '';                       /* وجهة بلا شاشات لهذا الدور لا تُعرض */
        var badge = '';
        if (d.id === 'work' && (inbox || alerts)) {
          badge = '<b class="azb-count' + (alerts ? ' hot' : '') + '" aria-label="' +
            AZB.esc(AZB.t({ ar: 'بانتظارك ', en: 'waiting ' }) + (inbox + alerts)) + '">' + (inbox + alerts) + '</b>';
        }
        return '<button type="button" class="azb-dest" data-dest="' + d.id + '"' +
               (d.id === current ? ' aria-current="true"' : '') + '>' +
                 AZB.icon(d.icon) +
                 '<span class="azb-dest-t"><b>' + AZB.esc(AZB.t(d)) + '</b>' +
                 '<span>' + AZB.esc(AZB.t(d.sub)) + '</span></span>' + badge +
               '</button>';
      }).join('');

      [].forEach.call(rail.querySelectorAll('.azb-dest'), function (b) {
        b.addEventListener('click', function () {
          current = b.getAttribute('data-dest');
          render();
          /* يبقى التركيز على الزرّ نفسه بعد إعادة الرسم — وإلا فقده من يستعمل
             لوحة المفاتيح وعاد إلى أعلى الصفحة.
             Keep focus on the same button after re-render — otherwise a
             keyboard user loses their place and is thrown to the top. */
          var again = rail.querySelector('[data-dest="' + current + '"]');
          if (again && document.activeElement !== again) again.focus();
        });
      });

      /* «كل الشاشات» — الباب الذي يضمن ألّا يختفي شيء أبداً */
      var all = document.getElementById('azbAll');
      if (!all) {
        all = document.createElement('div');
        all.id = 'azbAll';
        all.className = 'azb-all';
        nav.parentNode.appendChild(all);
      }
      var total = groups.reduce(function (n, g) { return n + g.items; }, 0);
      var showingAll = current === '__all';
      all.innerHTML =
        '<button type="button" class="azb-dest" data-all="1"' + (showingAll ? ' aria-current="true"' : '') + '>' +
          AZB.icon('grid') + '<span class="azb-dest-t"><b>' +
          AZB.esc(AZB.t({ ar: 'كل الشاشات', en: 'All screens' })) + ' (' + total + ')</b>' +
          '<span>' + AZB.esc(showingAll ? AZB.t({ ar: 'اضغط للعودة إلى الوجهات', en: 'Press to return to destinations' })
                                        : AZB.t({ ar: 'الترتيب القديم كما هو', en: 'The previous arrangement, unchanged' })) + '</span></span>' +
        '</button>' +
        /* 🔴 كان النصّ الفرعي «أو اكتب رقم مستند». قِيس بقراءة app.js:449-470:
              لوحة الأوامر تبحث في أسماء الشاشات وأوامر «جديد» فقط، لا في أرقام
              المستندات. فكان وعداً كاذباً على الشاشة — أُزيل.
           🔴 The sub-label used to say «or type a document number». Measured by
              reading app.js:449-470: the palette searches screen names and
              «new» commands only, NOT document numbers. A false promise on
              screen — removed. */
        /* ✅ صار الوعد صادقاً: design-b-search.js يضيف المستندات برقمها إلى اللوحة
              نفسها، ومُثبَت بـ journey-search-limit.js. فيعود السطر الفرعي.
           ✅ The promise is now true: design-b-search.js adds documents by
              number to the same palette, proven by journey-search-limit.js. */
        '<button type="button" class="azb-dest" data-palette="1">' +
          AZB.icon('search') + '<span class="azb-dest-t"><b>' + AZB.esc(AZB.t({ ar: 'ابحث عن شاشة أو مستند', en: 'Find a screen or a document' })) + '</b>' +
          '<span>' + AZB.esc(AZB.t({ ar: 'برقم المستند', en: 'by its number' })) + ' · <span class="azb-ltr-sub">Ctrl K</span></span></span>' +
        '</button>';

      all.querySelector('[data-all]').addEventListener('click', function () {
        current = showingAll ? 'work' : '__all';
        render();
        var again = all.querySelector('[data-all]');
        if (again) again.focus();
      });
      /* البحث يفتح **لوحة الأوامر القائمة أصلاً** — لا بديل منافس
         Search opens the portal's OWN command palette — no competing copy. */
      all.querySelector('[data-palette]').addEventListener('click', function () {
        var btn = document.getElementById('globalSearchBtn');
        if (btn) { btn.click(); return; }
        var inp = document.getElementById('paletteInput');
        if (inp) { inp.focus(); return; }
        console.error('design-b-nav: no command palette found to open');
      });

      if (showingAll) groups.forEach(function (g) { g.el.hidden = false; });
    } finally {
      rendering = false;
    }
  }

  function watch() {
    var nav = navEl();
    if (!nav || nav.__azbWatched || brokenOpen) return;
    nav.__azbWatched = true;
    /* childList فقط — نغيّر hidden على المجموعات، وما يهمّنا هو إعادة بناء
       app.js للقائمة (تغيير أبناء مباشرين).
       childList ONLY — what matters is app.js rebuilding the menu. */
    observer = new MutationObserver(function () { if (!rendering) render(); });
    observer.observe(nav, { childList: true });
    render();
  }

  function boot() {
    watch();
    /* القائمة تُبنى بعد الدخول — نحاول بهدوء ونتوقّف بمجرّد النجاح
       The nav is built after login — retry quietly, stop the moment it works. */
    var tries = 0;
    var t = setInterval(function () {
      if (++tries > 40 || brokenOpen) { clearInterval(t); return; }
      var nav = navEl();
      if (nav && nav.querySelector('.nav-group')) { watch(); clearInterval(t); }
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.AZBNav = { render: render, dests: DESTS, groupId: groupId, destFor: destFor,
                    show: function (id) { current = id; render(); } };
})(window);
