/* mobile-field.js — إضافي بالكامل، لا يعدّل أي ملف قديم.
   Purely additive: wraps existing globals, touches nothing else.

   أربع مهام لهاتف المهندس في الموقع (شبكة ضعيفة، شمس، إصبع كبير):
     A· تكبير مساحات اللمس والخط على الشاشات الصغيرة فقط (max-width:680px)
     B· شريط حالة ثابت أعلى الشاشة يلخّص شارة المزامنة الحالية بلا اتصال/قيد الانتظار
     C· ترتيب أزرار "إجراءات سريعة" في اللوحة الرئيسية بحيث تتصدّرها شاشات الموقع
        (طلب فحص مواد، طلب فحص مواد وارد، توزيع العمالة) وزيادة العدد المعروض

   Four jobs for the site engineer's phone (weak signal, sun glare, thick
   fingers): A) enlarge touch targets and text on small screens only,
   B) a fixed status strip summarising the existing sync badge,
   C) reorder + widen the dashboard's Quick Actions panel so site screens
   lead. Deleting this file restores the desktop-only layout exactly. */
(function (global) {
  'use strict';
  if (typeof document === 'undefined') return;

  /* ══════════════════ A · نمط اللمس على الهاتف · TOUCH-SIZE STYLE ══════════════════
     لا !important ولا تعديل على styles.css أو brand.css — وسم <style> مُلحَق
     بعدهما في <head> يفوز بترتيب التتالي (cascade order) وحده يكفي.
     No !important, no edit to styles.css/brand.css — a <style> tag appended
     AFTER them in <head> wins purely by cascade order, so none is needed. */
  function injectStyle() {
    var css =
      '@media only screen and (max-width:680px){' +
        /* خط 16px يمنع Safari من تكبير الشاشة تلقائياً عند لمس أي حقل —
           أقل من 16px محسوباً (computed) يُفعِّل تكبير iOS القسري.
           16px stops iOS's automatic focus-zoom; anything computed below
           16px triggers it, however the CSS declares the size. */
        'body{font-size:16px;line-height:1.7}' +
        '.input,.select,.textarea,.input-sm{font-size:16px}' +
        /* 44px هو الحد الأدنى المعتمد عالمياً لمساحة لمس آمنة بإصبع — الحشو
           (padding) الأصلي لم يُمسّ، فقط أقل ارتفاع.
           44px is the standard minimum safe touch target — original padding
           is untouched, only a floor on height. */
        '.btn,.btn-sm{min-height:44px}' +
        '.check-row input[type=checkbox]{width:22px;height:22px}' +
        '.check-row{min-height:44px}' +
        /* الشريط الثابت أعلى الشاشة — راجع الشرح الكامل عند إنشائه أدناه.
           The fixed top strip — see the full explanation where it is built below. */
        '#azMobileBanner{' +
          'position:fixed;inset-inline:0;top:0;height:40px;z-index:45;' +
          'display:flex;align-items:center;justify-content:center;' +
          'padding:0 14px;font-size:13px;font-weight:700;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
          'font-family:Tahoma,Arial,sans-serif' +
        '}' +
        '#azMobileBanner.az-mobile-pending{color:#9a5b00;background:#fff1d6}' +
        '#azMobileBanner.az-mobile-offline{color:#4b5563;background:#e5e7eb}' +
        /* يزيح المحتوى والشريط العلوي اللاصق (topbar) لأسفل بمقدار ارتفاع
           الشريط بالضبط، فيبقى topbar مرئياً تحته لا خلفه — topbar نفسه
           position:sticky;top:0;z-index:20 في styles.css:217، فلولا هذا
           الإزاحة لغطّى شريطنا (z-index:45) عليه من الأعلى دائماً.
           Pushes .main and the sticky .topbar down by exactly the banner's
           height, so the topbar stays visible BELOW the banner instead of
           hidden behind it — the topbar is position:sticky;top:0;z-index:20
           at styles.css:217, and without this offset our higher z-index:45
           banner would permanently sit on top of it. */
        'body.az-mobile-banner .main{padding-top:40px}' +
        'body.az-mobile-banner .topbar{top:40px}' +
      '}' +
      /* الطباعة لا تحتاج أبداً شريط حالة اتصال — استعلام مستقل خارج
         max-width حتى لا يظهر الشريط سهواً في نسخة PDF/ورق.
         Printing never needs a connectivity strip — a separate query
         outside the width check so it cannot leak into a PDF/paper copy. */
      '@media print{#azMobileBanner{display:none !important}}';
    var style = document.createElement('style');
    style.setAttribute('data-az', 'mobile-field');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ══════════════════ B · شريط الحالة · STATUS BANNER ══════════════════
     لماذا MutationObserver على الشارة، لا حدث alzahraa:store:
     store.js يبعث الحدث alzahraa:store قبل استدعاء paintStatus() التي
     تُحدِّث نص الشارة فعلياً (السطر ٤٥ ثم ٤٦) — أي مستمع على الحدث نفسه
     سيقرأ النص القديم بفارق حالة واحدة دائماً. مراقبة الشارة بعد رسمها
     هي المصدر الوحيد الموثوق.
     Why a MutationObserver on the badge, not the alzahraa:store event:
     store.js dispatches alzahraa:store BEFORE calling paintStatus(), which
     is what actually rewrites the badge's text (line 45, then line 46) — a
     listener on the event itself would always read text one state stale.
     Watching the badge after it repaints is the only reliable source. */
  var MOBILE_MQ = null;
  try { MOBILE_MQ = global.matchMedia && global.matchMedia('(max-width:680px)'); } catch (e) {}

  function ensureBanner() {
    var el = document.getElementById('azMobileBanner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'azMobileBanner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    /* شريط للعرض فقط — لا يستقبل تركيز أو نقر، فلا يعترض أي زر تحته */
    el.setAttribute('aria-hidden', 'false');
    el.tabIndex = -1;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function evaluate() {
    var el = ensureBanner();
    var badge = document.getElementById('azSyncBadge');
    var isMobile = MOBILE_MQ ? !!MOBILE_MQ.matches : (global.innerWidth || 0) <= 680;
    var saveGuardBar = document.getElementById('azSaveGuardBar');

    var show = isMobile && badge && !badge.hidden &&
      badge.className.indexOf('online') === -1 &&
      !saveGuardBar; /* شريط الحفظ المرفوض الأحمر أهم دائماً — لا نتنازع معه على نفس المساحة */

    if (!show) {
      el.style.display = 'none';
      document.body.classList.remove('az-mobile-banner');
      return;
    }

    /* النص منسوخ حرفياً من الشارة نفسها — مصدر واحد للحقيقة لصياغة
       paintStatus ولغتها، فلا نكتب صياغة مستقلة قد تتعارض معها لاحقاً.
       Text copied VERBATIM from the badge — one source of truth for
       paintStatus's own wording and language, so we never fork a phrasing
       that could drift from it later. */
    el.textContent = badge.textContent;
    el.className = badge.className.indexOf('pending') !== -1
      ? 'az-mobile-pending' : 'az-mobile-offline';
    el.style.display = 'flex';
    document.body.classList.add('az-mobile-banner');
  }

  function startWatching() {
    var badge = document.getElementById('azSyncBadge');
    if (badge) {
      /* class وtextContent وhidden كلها تتغيّر معاً في paintStatus() —
         مراقبة الثلاثة تضمن التقاط أي تحديث. هذه هي مصادر التحديث الثلاثة
         المعتمدة بالضبط: الشارة، التقييم الأول أدناه، ودوران الشاشة —
         لا مراقب إضافي على body لم يُقرَّه المخطط.
         These are exactly the three approved update sources: the badge,
         the initial evaluation below, and orientation change — no extra
         body-wide observer the plan did not approve. */
      new MutationObserver(evaluate).observe(badge, {
        attributes: true, attributeFilter: ['class', 'hidden'], childList: true, characterData: true, subtree: true
      });
    }
    if (MOBILE_MQ) {
      var onChange = function () { evaluate(); };
      if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener('change', onChange);
      else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(onChange); /* Safari قديم */
    }
    evaluate();
  }

  /* السكربت يُحمَّل من نهاية <body> عبر loader.js، فالـDOM موجود فعلاً هنا */
  injectStyle();
  startWatching();

  /* ══════════════════ C · إجراءات سريعة موحّدة · UNIFIED QUICK ACTIONS ══════════════════
     الاستبدال يعمل بلا أي تعديل في dashboard-render.js: render() يستدعي
     P[p]() بالبحث عن الخاصية وقت التشغيل (dashboard-render.js:614)، فآخر
     ملف يستبدل DashboardView.PANELS.quickActions هو الذي يفوز.
     Works with zero dashboard-render.js edits: render() calls P[p]() by
     property LOOKUP AT CALL TIME (dashboard-render.js:614), so whichever
     file replaces DashboardView.PANELS.quickActions LAST wins. */
  function installQuickActions() {
    if (!global.DashboardView || !global.DashboardView.PANELS || !global.DashboardView.PANELS.quickActions) return;

    global.DashboardView.PANELS.quickActions = function () {
      /* ملاحظة: المعرّف الصحيح هو labourAllocation — dailyLabour معرّف آخر
         تماماً (نموذج مختلف في hr-department.js)؛ هذا هو درس trades/trade
         نفسه يتكرر. Note: the correct id is labourAllocation — dailyLabour
         is a wholly different id (a separate module in hr-department.js);
         this is the trades/trade lesson repeating. */
      var picks = ['wir', 'mir', 'labourAllocation', 'siteReports',
        'purchaseApprovals', 'goodsReceipts', 'stockIssues', 'stockTransfers', 'stockCounts',
        'clientIPCs', 'subIPCs', 'payments', 'receipts', 'journal', 'supplierInvoices',
        'drawings', 'attendance', 'leaves', 'itTickets', 'announcements'];
      var buttons = '', n = 0;
      picks.forEach(function (id) {
        if (n >= 8 || !Auth.can(id, 'create')) return;
        var m = Schema.get(id); if (!m) return;
        n++;
        buttons += '<button class="btn btn-outline btn-sm" data-newin="' + UI.attr(id) + '" style="justify-content:flex-start">' +
          UI.icon(m.icon, 15) + ' ' + UI.esc(L(m.label)) + '</button>';
      });
      if (!n) return '';
      return '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
        UI.icon('send', 17) + ' ' + t('dash.quickActions') + '</h3></div><div class="card-body">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px">' +
        buttons + '</div></div></div>';
    };
  }

  installQuickActions();
})(window);
