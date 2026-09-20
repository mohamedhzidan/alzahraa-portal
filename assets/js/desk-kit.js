/* =========================================================================
   desk-kit.js — المحرّك القابل لإعادة الاستعمال لأي «مكتب» قسم
                 The reusable engine for any department "desk"
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ١).

   الفكرة (الخطة §1.3) · THE IDEA (plan §1.3)
   -------------------------------------------------------------------------
   ملف واحد يرسم أي «مكتب»: شريط النطاق، طابور العمل بأربع مجموعات، أزرار
   البدء السريع، بلاطات الكشوف، وصفّ شرائح السجلّات — من كائن ضبط واحد
   `{ id, group, label, roleGate, quickStarts, queueModules, statements,
   registers }` يُسجَّله ملف القسم (هنا desk-finance.js) بـ
   `DeskKit.register(config)`. لا اسم قسم مكتوب هنا بالحرف.
   ONE file draws ANY desk: scope bar, four-group work queue, quick-start
   buttons, statement tiles, and a register chip row — from ONE config
   object registered by the department's own file (desk-finance.js here)
   via `DeskKit.register(config)`. No department name is hard-coded here.

   لماذا مسار لا شاشة Schema · WHY A ROUTE, NEVER A SCHEMA MODULE
   -------------------------------------------------------------------------
   store.js:60-69 يجلب جدولاً لكل وحدة Schema **ظاهرة** عند الدخول
   ويرمي عطلاً إن غاب جدولها (store.js:121-126) — فلا يستطيع أحد في
   المالية الدخول لو صار المكتب وحدة Schema بلا جدول حقيقي. لذلك: مسار
   عادي يمرّ عبر EntityPage.render (app.js:254 `else EntityPage.render
   (route, host)`), نلفّه هنا، ونرسم بأنفسنا.
   store.js fetches a table for EVERY VISIBLE Schema module at login and
   throws if one's table is missing — so nobody in finance could log in if
   the desk were a Schema module with no real table. So: an ordinary route
   that falls through app.js's catch-all to EntityPage.render, wrapped
   here, drawn by us.

   كيف تُحقن الأزرار — نُخفي ونُظهر، لا نبني (نمط design-b-nav.js بالحرف)
   HOW BUTTONS ARE INJECTED — hide/show, never rebuild (design-b-nav.js's
   own rule, verbatim): app.js يمحو #mainNav ويعيد بناءه بالكامل عند كل
   دخول وكل تبديل لغة (app.js:166 `nav.innerHTML = ''`). فأيّ عنصر نضيفه
   يُمحى معه، فنراقب #mainNav بـ MutationObserver ونعيد الحقن كلّما
   أُعيد البناء — تماماً كنمط dc-requests.js:1033-1040 وdesign-b-nav.js.
   app.js WIPES #mainNav and rebuilds it whole on every login and every
   language switch — so anything we add is wiped with it. We watch
   #mainNav with a MutationObserver and re-inject whenever it rebuilds —
   the exact pattern dc-requests.js and design-b-nav.js already use.

   التراجع · ROLLBACK
   -------------------------------------------------------------------------
   حذف هذا الملف (مع desk-finance.js وبقية ملفات المكتب) يعيد القائمة
   والصفحة الأولى ولوحة الأوامر إلى شكلها اليوم تماماً — لا شيء يُعدَّل
   في app.js أو design-b-*.js. وفي المتصفح: `AZB.off()` يزيل عناصرنا
   فوراً (نلفّها هنا لأن قائمة design-b-kit.js's OURS ثابتة، §1.2).
   Deleting this file (with desk-finance.js and the rest) restores the
   menu, home page and command palette to exactly today's shape — nothing
   in app.js or design-b-*.js is edited. In the browser: `AZB.off()`
   removes our elements at once (wrapped here because design-b-kit.js's
   OURS list is fixed, plan §1.2).
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB || !global.EntityPage || !global.Auth || !global.Schema) {
    console.error('desk-kit.js needs design-b-kit.js, auth.js, schema.js and pages/entity.js first — not installed');
    return;
  }
  var T = AZB.t;
  var DESKS = {};                 /* id -> config */
  var workingSite = {};           /* deskId -> site chosen في «أُدخل نيابةً عن موقع» */

  function register(config) {
    if (!config || !config.id) { console.error('DeskKit.register: config.id required'); return; }
    DESKS[config.id] = config;
    /* 🔴 مثبَت بالتشغيل — فجوة سباق حقيقية بين هذا الملف وdesk-finance.js.
       bootNav() يستدعي injectNav() فور تحميل هذا الملف؛ وdesk-finance.js
       يُسجِّل «مكتب المحاسب» في الملف **التالي** مباشرة. حين تُبنى القائمة
       بسرعة (إعادة تحميل بجلسة دافئة، مقيسة بإعادة تحميل حقيقية)، يسبق
       الفحصُ الأوّل تسجيلَ desk-finance.js فيجد DESKS فارغة — ولا شيء
       يعيد الفحص بعدها أبداً (مراقب #mainNav لا يرى تسجيلاً، والفاصل
       الزمني استهلك فرصته الوحيدة). الحلّ: كل تسجيل يعيد الفحص فوراً بنفسه،
       فتُغلَق الفجوة أيّاً كان ترتيب التحميل والبناء الفعليّ.
       🔴 PROVEN BY RUNNING — a real race between this file and desk-
       finance.js. bootNav() calls injectNav() the moment THIS file loads;
       desk-finance.js registers "the accountant's desk" in the VERY NEXT
       file. When the menu builds fast (a warm-session reload, measured
       with a real reload), the FIRST scan runs before desk-finance.js's
       registration lands, finds DESKS empty — and nothing ever re-scans
       afterward (the #mainNav observer sees no further mutation, and the
       interval already spent its one successful call). Fix: every
       registration re-scans immediately, closing the gap regardless of
       the real load/build order. */
    try { injectNav(); } catch (e) { console.error('DeskKit.register: injectNav re-scan failed: ' + (e && e.message), e); }
  }
  function deskFor(id) { return DESKS[id] || null; }

  /* ══ ١ · هل الوحدة مركَّبة؟ («سياج التركيب» — الخطر ١ في الخطة) ═══════
     IS THE MODULE INSTALLED? (the "not installed" fence — plan danger #1) */
  function moduleOf(modId) { try { return Schema.get(modId); } catch (e) { return null; } }
  function notInstalledNotice(missingIds) {
    return '<section class="azd-notice" role="note">' + AZB.icon('warn') +
      '<div><h3>' + AZB.esc(T({ ar: 'الجزء الخاص بقاعدة البيانات لم يُركَّب بعد', en: 'The database part is not installed yet' })) + '</h3>' +
      '<p>' + AZB.esc(T({ ar: 'أبلغ مسؤول النظام (الملفات: ' + missingIds.join('، ') + ').',
                          en: 'Tell the system administrator (files: ' + missingIds.join(', ') + ').' })) + '</p></div></section>';
  }

  /* ══ ٢ · شريط «أُدخل نيابةً عن موقع» — لمحاسبٍ يرى كل المواقع فقط ══════
     THE "on behalf of a site" bar — for an all-sites-seeing account only. */
  function isCentral() { try { return !!(Auth.seesAllSites && Auth.seesAllSites()); } catch (e) { return false; } }
  function siteOptions() {
    try { return (Store.all('sites') || []).filter(function (s) { return !s.allSites; }); } catch (e) { return []; }
  }
  function onBehalfBar(deskId) {
    if (!isCentral()) return '';
    var opts = siteOptions();
    var cur = workingSite[deskId] || '';
    return '<div class="azd-onbehalf" role="note">' +
      '<label for="azdOnBehalf-' + AZB.esc(deskId) + '">' + AZB.esc(T({ ar: 'أُدخل نيابةً عن موقع', en: 'Entering on behalf of site' })) + '</label>' +
      '<select id="azdOnBehalf-' + AZB.esc(deskId) + '" data-azd-onbehalf="' + AZB.esc(deskId) + '">' +
        '<option value="">' + AZB.esc(T({ ar: '— اختر —', en: '— choose —' })) + '</option>' +
        opts.map(function (s) { return '<option value="' + AZB.esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + AZB.esc(s.name) + '</option>'; }).join('') +
      '</select>' +
      (cur ? '<span class="azd-onbehalf-hint">' + AZB.icon('info') + AZB.esc(T({ ar: 'المستندات الجديدة تُختم بهذا الموقع، بطريق «ورقي»', en: 'New documents are stamped with this site, via the "paper" route' })) + '</span>' : '') +
    '</div>';
  }
  function presetFor(deskId) {
    var site = workingSite[deskId];
    if (!site) return null;
    if (global.DeskMoneySite && DeskMoneySite.buildPreset) return DeskMoneySite.buildPreset(site);
    return { site: site, entryRoute: 'paper' };
  }

  /* ══ ٣ · طابور العمل — أربع مجموعات من نفس المصادر التي تستعملها
     الصفحة الأولى وصندوق الاعتمادات (Workflow.inbox، Auth.scopeRows،
     Auth.can) — لا حالة جديدة، لا سياج جديد ══════════════════════════════
     THE WORK QUEUE — four groups from the SAME sources the home page and
     approvals inbox use. No new state, no new fence. */
  function amountCell(mod, rec) {
    var f = mod && mod.amountField, raw = f ? rec[f] : undefined;
    if (raw === undefined || raw === null || raw === '' || !isFinite(Number(raw))) return AZB.na({ ar: 'لم يُسجَّل مبلغ', en: 'no amount recorded' });
    return '<b class="num">' + AZB.esc(global.I18N ? I18N.money(Number(raw)) : String(raw)) + '</b>';
  }
  function docCard(mod, rec, hint) {
    var label = T(mod.label) || mod.id, docNo = rec.docNo || rec.id || '';
    var badge = ''; try { badge = global.Workflow && Workflow.badgeHTML ? Workflow.badgeHTML(rec.status) : ''; } catch (e) {}
    return '<article class="azb-card">' +
      '<div class="azb-ic">' + AZB.icon('file') + '</div>' +
      '<div class="azb-body">' +
        '<div class="azb-top"><span class="azb-ltr azb-docno">' + AZB.esc(docNo) + '</span><span class="azb-modname">' + AZB.esc(label) + '</span>' + badge + '</div>' +
        '<div class="azb-meta">' + (mod.amountField ? '<span>' + AZB.esc(T({ ar: 'القيمة', en: 'Value' })) + ' ' + amountCell(mod, rec) + '</span>' : '') +
          (rec.date ? '<span>' + AZB.esc(T({ ar: 'تاريخ المستند', en: 'Document date' })) + ' <b class="num azb-ltr">' + AZB.esc(global.I18N && I18N.date ? I18N.date(rec.date) : String(rec.date).slice(0, 10)) + '</b></span>' : '') + '</div>' +
        (hint ? '<p class="azb-card-limit">' + AZB.icon('lock') + '<span>' + AZB.esc(hint) + '</span></p>' : '') +
        '<div class="azb-acts"><button type="button" class="btn btn-outline btn-sm azd-open" data-mod="' + AZB.esc(mod.id) + '" data-rid="' + AZB.esc(rec.id) + '">' +
          AZB.icon('eye') + ' ' + AZB.esc(T({ ar: 'فتح', en: 'Open' })) + '</button></div>' +
      '</div></article>';
  }
  function queueGroup(key, title, icon, items, note) {
    if (!items.length) return '';
    return '<section class="azb-grp" data-grp="' + key + '"><h2 class="azb-grp-h">' + AZB.icon(icon) + AZB.esc(title) +
      ' <span class="n">(' + items.length + ')</span></h2>' + (note ? '<p class="azb-grp-note">' + AZB.esc(note) + '</p>' : '') +
      items.map(function (it) { return docCard(it.mod, it.rec, it.hint); }).join('') + '</section>';
  }
  /* «عند غيري الآن» — الأدوار التي تملك الآن اعتماده/مراجعته، لا اسم
     شخص (الخطة §1.1؛ Rules.approverHint، لا اختراع معتمِد).
     "With someone else now" — the ROLES that currently hold review/
     approve, never a person's name (plan §1.1; Rules.approverHint, no
     invented approver). */
  function ownerHint(mod, rec) {
    try { return global.Rules && Rules.approverHint ? Rules.approverHint(mod, rec) : null; } catch (e) { return null; }
  }
  /* «ينتظر إجراءً منّي» — حدّ الاعتماد قبل الضغط، نفس AZBHome.overLimitHint
     البتة (design-b-home.js:187-196) — لا قاعدة جديدة.
     "Waiting for my action" — the approval limit BEFORE the press, the
     exact same AZBHome.overLimitHint (design-b-home.js:187-196) — no new
     rule. */
  function overLimitHint(mod, rec) {
    try { return (global.AZBHome && AZBHome.overLimitHint) ? AZBHome.overLimitHint(mod, rec) : null; } catch (e) { return null; }
  }
  function buildQueue(config) {
    var me = null; try { me = Auth.current && Auth.current(); } catch (e) {}
    if (!me) return '';
    var mods = (config.queueModules || []).map(moduleOf).filter(Boolean);
    if (!mods.length) return '';
    var drafts = [], returned = [], waiting = [], withOthers = [];
    mods.forEach(function (mod) {
      var rows = []; try { rows = Auth.scopeRows(mod.id, Store.all(mod.table) || []); } catch (e) { rows = []; }
      rows.forEach(function (r) {
        if (r.status === 'draft' && r.createdBy === me.id) drafts.push({ mod: mod, rec: r });
        else if ((r.status === 'returned' || r.status === 'rejected') && r.createdBy === me.id) returned.push({ mod: mod, rec: r });
        else if (r.status === 'pending' && Auth.can(mod.id, 'review') && r.createdBy !== me.id) waiting.push({ mod: mod, rec: r, hint: null });
        else if (r.status === 'reviewed' && Auth.can(mod.id, 'approve') && r.createdBy !== me.id && r.reviewedBy !== me.id) waiting.push({ mod: mod, rec: r, hint: overLimitHint(mod, r) });
        else if ((r.status === 'pending' || r.status === 'reviewed') && r.createdBy === me.id) withOthers.push({ mod: mod, rec: r, hint: ownerHint(mod, r) });
      });
    });
    var total = drafts.length + returned.length + waiting.length + withOthers.length;
    if (!total) {
      return '<section class="azb-grp azb-queue"><h2 class="azb-grp-h">' + AZB.icon('checkc') +
        AZB.esc(T({ ar: 'لا شيء ينتظر إجراءً منك هنا', en: 'Nothing here is waiting for you' })) + '</h2></section>';
    }
    return '<div class="azb-queue" data-azd-total="' + total + '">' +
      queueGroup('drafts', T({ ar: 'مسوّداتي', en: 'My drafts' }), 'file', drafts) +
      queueGroup('returned', T({ ar: 'أُعيد إليّ', en: 'Returned to me' }), 'warn', returned,
        T({ ar: 'أُعيدت إليك أو رُفضت — افتحها لترى السبب.', en: 'Returned to you or rejected — open one to see why.' })) +
      queueGroup('waiting', T({ ar: 'ينتظر إجراءً منّي', en: 'Waiting for my action' }), 'checkc', waiting) +
      queueGroup('withOthers', T({ ar: 'عند غيري الآن', en: 'With someone else now' }), 'eye', withOthers,
        T({ ar: 'من يملك صلاحية الاعتماد أو المراجعة على قيمته يراه في طابوره.', en: 'Whoever holds approval or review on its value sees it in their own queue.' })) +
    '</div>';
  }

  /* ══ ٣ب · أيقونة آمنة لأيقونات المخطَّط (schema.js) ═════════════════════
     🔴 مثبَت بالتشغيل — schema.js يستعمل قاموس أيقونات UI.icon الواسع
     ('arrow-up' لسندات الصرف، 'arrow-down' للقبض، 'edit' لليومية…)، وAZB.icon
     (design-b-kit.js) يحمل قاموساً أضيق بكثير (٢٤ اسماً فقط) — فتمرير اسم
     أيقونة وحدة Schema مباشرةً كان يطبع «AZB.icon: no icon named…» في كل
     مرة يظهر فيها زرّ بدء سريع، وهي أعطالٌ حقيقية مقيسة بالتشغيل، لا وهماً.
     🔴 PROVEN BY RUNNING — schema.js uses UI.icon's WIDE dictionary
     ('arrow-up' for payments, 'arrow-down' for receipts, 'edit' for the
     journal…), while AZB.icon (design-b-kit.js) carries a much NARROWER
     set (only ~24 names) — passing a Schema module's icon straight through
     printed "AZB.icon: no icon named…" every time a quick-start button
     drew, a real measured fault, not a guess. */
  var SAFE_AZB_ICONS = { inbox: 1, folder: 1, box: 1, brief: 1, menu: 1, grid: 1, search: 1, clock: 1, warn: 1,
    check: 1, checkc: 1, lock: 1, send: 1, file: 1, eye: 1, info: 1, build: 1, users: 1, chevron: 1, chart: 1 };
  function safeAzbIcon(name) { return SAFE_AZB_ICONS[name] ? name : 'file'; }

  /* ══ ٤ · أزرار البدء السريع — «غير متاح مع السبب»، لا مخفياً ══════════
     QUICK-START buttons — "unavailable, with the reason", never hidden. */
  function quickStartsHTML(config) {
    var deskId = config.id;
    var list = (config.quickStarts || []).map(function (modId) {
      var mod = moduleOf(modId);
      var installed = !!mod;
      var can = installed && Auth.can(modId, 'create');
      var label = installed ? T(mod.label) : modId;
      var icon = safeAzbIcon(installed ? mod.icon : 'file');
      var reason = !installed ? T({ ar: 'الجزء الخاص بقاعدة البيانات لم يُركَّب بعد', en: 'The database part is not installed yet' })
                 : !can ? T({ ar: 'الإنشاء ليس ضمن صلاحيتك — (' + (Auth.roleLabel ? Auth.roleLabel(Auth.current().role) : Auth.current().role) + ')',
                              en: 'Creating is not within your permission — (' + (Auth.roleLabel ? Auth.roleLabel(Auth.current().role) : Auth.current().role) + ')' })
                 : '';
      return '<button type="button" class="btn ' + (can ? 'btn-primary' : 'btn-outline') + ' azd-qs"' + (can ? '' : ' disabled aria-disabled="true"') +
        (can ? ' data-mod="' + AZB.esc(modId) + '" data-desk="' + AZB.esc(deskId) + '"' : '') +
        (reason ? ' title="' + AZB.esc(reason) + '"' : '') + '>' +
        AZB.icon(icon) + '<span>' + AZB.esc(label) + '</span>' + (reason ? '<small>' + AZB.esc(reason) + '</small>' : '') + '</button>';
    });
    return '<section class="azd-section"><h2 class="azd-h">' + AZB.esc(T({ ar: 'ابدأ', en: 'Start' })) + '</h2>' +
      '<div class="azd-quickstarts">' + list.join('') + '</div></section>';
  }

  /* ══ ٥ · بلاطات الكشوف — «قادم في الشريحة ٣» هذه الشريحة فقط ══════════
     STATEMENT tiles — "coming in slice 3", this slice only. */
  function statementsHTML(config) {
    var items = config.statements || [];
    if (!items.length) return '';
    return '<section class="azd-section"><h2 class="azd-h">' + AZB.esc(T({ ar: 'الكشوف', en: 'Statements' })) + '</h2>' +
      '<div class="azd-statements">' + items.map(function (s) {
        return '<button type="button" class="btn btn-outline azd-statement" data-note="1">' + AZB.icon('chart') + '<span>' + AZB.esc(T(s.label)) + '</span></button>';
      }).join('') + '</div></section>';
  }

  /* ══ ٦ · صفّ شرائح السجلّات — الشاشات الحقيقية كما هي، بلا إعادة بناء ══
     REGISTER chips — the real screens, unchanged, never rebuilt. */
  function registersHTML(config) {
    var ids = (config.registers || []).filter(function (id) { return Auth.canSee(id); });
    if (!ids.length) return '';
    return '<section class="azd-section"><h2 class="azd-h">' + AZB.esc(T({ ar: 'السجلّات', en: 'Registers' })) + '</h2>' +
      '<div class="chip-row azd-registers">' + ids.map(function (id) {
        var mod = moduleOf(id); if (!mod) return '';
        return '<button type="button" class="filter-chip azd-reg" data-mod="' + AZB.esc(id) + '">' + AZB.esc(T(mod.label)) + '</button>';
      }).join('') + '</div></section>';
  }

  /* ══ ٧ · الرسم الكامل ══════════════════════════════════════════════ */
  function render(config, host) {
    var missing = (config.quickStarts || []).concat(config.queueModules || [])
      .filter(function (id, i, a) { return a.indexOf(id) === i; })
      .filter(function (id) { return !moduleOf(id) && DESK_MODULE_IDS(config).indexOf(id) !== -1; });
    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + AZB.icon(config.navIcon || 'box') + ' ' + AZB.esc(T(config.label)) + '</h1>' +
      '<p class="page-sub">' + AZB.esc(T(config.desc || {})) + '</p></div></div>';
    html += (global.AZBHome && AZBHome.scopeBar) ? AZBHome.scopeBar() : '';
    html += onBehalfBar(config.id);
    html += (global.AZBHome && AZBHome.setupNotice) ? AZBHome.setupNotice() : '';
    if (missing.length) html += notInstalledNotice(missing);
    html += buildQueue(config);
    html += quickStartsHTML(config);
    html += statementsHTML(config);
    html += registersHTML(config);
    host.innerHTML = html;
    wireEvents(config, host);
    rewriteCrumbs(config);
  }
  /* الوحدات التي يعلن عنها هذا المكتب صراحةً كـ«جزء قاعدة بيانات جديد» —
     غير المُركَّب منها فقط يستحقّ إشعار «لم يُركَّب بعد» (لا نزعج بشاشة
     ناقصة الصلاحية، فقط بشاشة ناقصة الجدول). Only modules the desk itself
     declares as "a new database part" earn the "not installed" notice —
     never a screen that simply lacks a permission. */
  function DESK_MODULE_IDS(config) { return (global.DeskFinanceModules && DeskFinanceModules.NEW_MODULE_IDS) || []; }

  function wireEvents(config, host) {
    [].forEach.call(host.querySelectorAll('.azd-open'), function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-mod'), id = b.getAttribute('data-rid');
        if (global.EntityPage && EntityPage.openDetail) EntityPage.openDetail(m, id);
      });
    });
    [].forEach.call(host.querySelectorAll('.azd-qs'), function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-mod'), d = b.getAttribute('data-desk');
        if (!m) return;
        var preset = presetFor(d) || {};
        if (global.EntityPage && EntityPage.openForm) EntityPage.openForm(m, null, preset);
      });
    });
    [].forEach.call(host.querySelectorAll('.azd-statement'), function (b) {
      b.addEventListener('click', function () {
        if (global.UI && UI.toast) UI.toast(T({ ar: 'الكشوف تُبنى في الشريحة ٣ من هذا العمل — لم تُبنَ بعد.', en: 'Statements are built in slice 3 of this work — not built yet.' }), 'info', 5000);
      });
    });
    [].forEach.call(host.querySelectorAll('.azd-reg'), function (b) {
      b.addEventListener('click', function () { if (global.App && App.go) App.go(b.getAttribute('data-mod')); });
    });
    var sel = host.querySelector('[data-azd-onbehalf]');
    if (sel) sel.addEventListener('change', function () {
      workingSite[sel.getAttribute('data-azd-onbehalf')] = sel.value || null;
      render(config, host);   /* إعادة رسم فورية — القيمة تُقرأ من الحالة نفسها */
    });
  }

  /* الخطة §1.4: app.js:260-277 تطبع اسم المسار الخام؛ نصحّحه بعد الرسم
     plan §1.4: app.js prints the raw route id; we correct it after drawing. */
  function rewriteCrumbs(config) {
    var el = document.getElementById('breadcrumbs');
    if (!el) return;
    var g = (global.Schema.GROUPS || []).filter(function (x) { return x.id === config.group; })[0];
    el.innerHTML = (g ? '<span>' + AZB.esc(T(g.label)) + '</span><span class="sep">/</span>' : '') +
      '<span class="crumb-current">' + AZB.esc(T(config.label)) + '</span>';
  }

  /* ══ ٨ · لفّ EntityPage.render — مسار المكتب يُرسَم هنا، والباقي يمرّ ══ */
  function installRenderWrap() {
    if (EntityPage.__deskKitWrapped) return;
    EntityPage.__deskKitWrapped = true;
    var orig = EntityPage.render;
    EntityPage.render = function (moduleId, host) {
      var config = deskFor(moduleId);
      if (!config) return orig.apply(this, arguments);
      if (!Auth.can(moduleId, 'view')) {
        host.innerHTML = '<div class="alert alert-danger">' + AZB.icon('lock') + '<span>' + AZB.esc(T({ ar: 'لا صلاحية لك على هذه الشاشة', en: 'You have no permission on this screen' })) + '</span></div>';
        return;
      }
      render(config, host);
    };
  }

  /* ══ ٩ · حقن زرّ المكتب أوّلَ المجموعة + طيّ السجلّات ═══════════════
     INJECT the desk button first in its group + collapse the registers.
     تحديد المجموعة بمحتواها لا بعنوانها (نمط design-b-nav.js:109-133) —
     يعمل بلغتَي الموقع ولا يعتمد على data-az-group (غير موضوعة على
     مجموعات app.js الأصلية). Identify the group by CONTENT not title
     (design-b-nav.js:109-133's own pattern) — works in both languages and
     never relies on data-az-group (never set on app.js's native groups). */
  function findGroupEl(groupId) {
    var nav = document.getElementById('mainNav');
    if (!nav) return null;
    var groups = nav.querySelectorAll('.nav-group');
    for (var i = 0; i < groups.length; i++) {
      var items = groups[i].querySelectorAll('.nav-item[data-route]');
      for (var j = 0; j < items.length; j++) {
        var route = items[j].getAttribute('data-route');
        var m = null; try { m = Schema.get(route); } catch (e) {}
        if (m && m.group === groupId) return groups[i];
      }
    }
    return null;
  }
  var OURS_NAV = [];   /* عناصرنا في القائمة — لتنظيف AZB.off() */
  function injectNav() {
    var injected = false;
    Object.keys(DESKS).forEach(function (id) {
      var config = DESKS[id];
      if (!Auth.can(id, 'view')) return;
      var g = findGroupEl(config.group);
      if (!g || g.querySelector('[data-azd-desk="' + id + '"]')) return;
      injected = true;

      var btn = document.createElement('button');
      btn.className = 'nav-item azd-nav-btn';
      btn.setAttribute('data-route', id);
      btn.setAttribute('data-azd-desk', id);
      btn.innerHTML = '<span class="nav-icon">' + AZB.icon(config.navIcon || 'box') + '</span><span class="nav-label">' + AZB.esc(T(config.label)) + '</span>';
      btn.addEventListener('click', function () { if (global.App && App.go) App.go(id); });
      /* أوّل .nav-item فعلياً — أي مباشرة بعد عنوان المجموعة (وليس قبله،
         فالعنوان هو أوّل ابن دائماً — app.js:189). The actual FIRST
         .nav-item — right after the group's own title div (never before
         it; the title is always the group's first child — app.js:189). */
      var titleEl = g.querySelector('.nav-group-title');
      g.insertBefore(btn, titleEl ? titleEl.nextSibling : g.firstChild);
      OURS_NAV.push(btn);

      var others = [].filter.call(g.querySelectorAll('.nav-item'), function (b) { return b !== btn; });
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-item azd-nav-toggle';
      toggle.setAttribute('data-azd-toggle', id);
      var collapsed = true;
      function paint() {
        toggle.innerHTML = '<span class="nav-icon">' + AZB.icon('chevron') + '</span><span class="nav-label">' +
          AZB.esc(T({ ar: 'السجلّات ▸', en: 'Registers ▸' })) + '</span>';
        others.forEach(function (b) { b.hidden = collapsed; });
      }
      toggle.addEventListener('click', function () { collapsed = !collapsed; paint(); });
      paint();
      btn.parentNode.insertBefore(toggle, btn.nextSibling);
      OURS_NAV.push(toggle);
    });
    /* 🔴 مثبَت بالتشغيل — سباق حقيقي مع design-b-phone.js: مراقبه على
       #mainNav لا يلتقط إدراجنا (نُدخل الزرّ داخل .nav-group، وهو ابنٌ
       غير مباشر لـ#mainNav، وchildList بلا subtree لا يرى إلا تغيّر أبناء
       #mainNav المباشرين). فحين يبني هاتفٌ شريط تبويباته أوّل مرة قبل أن
       يعمل حقننا، يبقى هدف تبويب «المخزن والمال» أوّل شاشة أصلية (measured:
       "accounts") لا مكتبنا، ولا يُصحَّح أبداً من تلقاء نفسه. الحلّ: نطلب
       من design-b-phone.js إعادة بناء شريطه صراحةً كلّما أدخلنا شيئاً.
       🔴 PROVEN BY RUNNING — a real race with design-b-phone.js: its own
       #mainNav observer never sees our insertion (we add the button
       INSIDE a .nav-group, an INDIRECT child of #mainNav; childList
       without subtree only sees #mainNav's own direct children change).
       So when the phone tab bar builds once before our injection runs,
       the "المخزن والمال" tab target stays the first NATIVE screen
       (measured: "accounts"), never ours, and never self-corrects. Fix:
       explicitly ask design-b-phone.js to rebuild whenever we inject. */
    if (injected && global.AZBPhone && AZBPhone.build) AZBPhone.build();
  }
  function watchNav() {
    var nav = document.getElementById('mainNav');
    if (!nav || nav.__azdWatched) return;
    nav.__azdWatched = true;
    new MutationObserver(function () { injectNav(); }).observe(nav, { childList: true });
    injectNav();
  }
  function bootNav() {
    watchNav();
    var tries = 0;
    var t = setInterval(function () {
      if (++tries > 40) { clearInterval(t); return; }
      var nav = document.getElementById('mainNav');
      if (nav && nav.querySelector('.nav-group')) { watchNav(); clearInterval(t); }
    }, 500);
  }

  /* ══ ١٠ · التراجع: AZB.off يُنظِّف عناصرنا أيضاً (design-b-kit.js:158-164
     OURS ثابتة، فنلفّها هنا) ═══════════════════════════════════════════ */
  function installOffWrap() {
    if (!AZB || AZB.__deskKitOffWrapped) return;
    AZB.__deskKitOffWrapped = true;
    var origOff = AZB.off;
    AZB.off = function () {
      var r = origOff.apply(AZB, arguments);
      OURS_NAV.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      OURS_NAV = [];
      var nav = document.getElementById('mainNav');
      if (nav) [].forEach.call(nav.querySelectorAll('.nav-item[hidden]'), function (b) { b.hidden = false; });
      return r;
    };
  }

  /* ══ ١١ · بطاقة الصفحة الأولى «افتح مكتب المحاسب» ═════════════════════
     THE HOME CARD "Open the accountant's desk" — يُضاف بعد أن يرسم
     design-b-home.js نسخته الملفوفة (نلفّ ما هو ملفوف بالفعل). */
  function installHomeCard() {
    if (!global.DashboardView || DashboardView.__deskKitWrapped) return;
    DashboardView.__deskKitWrapped = true;
    var orig = DashboardView.render;
    DashboardView.render = function (host) {
      var r = orig.apply(this, arguments);
      try {
        if (!AZB.isOn()) return r;
        var el = host || document.getElementById('content');
        if (!el || el.querySelector('.azd-home-cards')) return r;
        var cards = Object.keys(DESKS).filter(function (id) { try { return Auth.can(id, 'view'); } catch (e) { return false; } })
          .map(function (id) {
            var c = DESKS[id];
            return '<button type="button" class="btn btn-outline azd-home-open" data-desk="' + AZB.esc(id) + '">' +
              AZB.icon(c.navIcon || 'box') + AZB.esc(T({ ar: 'افتح ' + T(c.label), en: 'Open ' + T(c.label) })) + '</button>';
          });
        if (!cards.length) return r;
        var wrap = document.createElement('div');
        wrap.className = 'azd-home-cards';
        wrap.innerHTML = cards.join('');
        var anchor = el.querySelector('.azb-queue') || el.querySelector('.kpi-grid');
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling); else el.appendChild(wrap);
        [].forEach.call(wrap.querySelectorAll('.azd-home-open'), function (b) {
          b.addEventListener('click', function () { if (global.App && App.go) App.go(b.getAttribute('data-desk')); });
        });
      } catch (e) { console.error('desk-kit home card: ' + (e && e.message), e); }
      return r;
    };
  }

  /* ══ ١٢ · مدخل في لوحة الأوامر (Ctrl+K) ═══════════════════════════════
     A PALETTE (Ctrl+K) ENTRY — نمط design-b-search.js:106-112 بالحرف:
     نُسجَّل بعد مستمع app.js فنرسم بعد أن يرسم الموقع نتائجه. */
  function installPalette() {
    var inp = document.getElementById('paletteInput');
    if (!inp || inp.__azdDesks) return !!inp;
    inp.__azdDesks = true;
    function render2() {
      if (!AZB.isOn()) return;
      var host = document.getElementById('paletteResults');
      if (!host) return;
      var old = host.querySelector('.azd-deskres'); if (old) old.parentNode.removeChild(old);
      var q = (inp.value || '').trim().toLowerCase();
      var hits = Object.keys(DESKS).filter(function (id) {
        try { if (!Auth.can(id, 'view')) return false; } catch (e) { return false; }
        var lbl = (T(DESKS[id].label) || '').toLowerCase();
        return !q || lbl.indexOf(q) !== -1;
      });
      if (!hits.length) return;
      var box = document.createElement('div');
      box.className = 'azd-deskres';
      box.innerHTML = hits.map(function (id) {
        return '<button type="button" class="palette-item azd-desk-hit" data-desk="' + AZB.esc(id) + '">' + AZB.icon(DESKS[id].navIcon || 'box') +
          '<span>' + AZB.esc(T(DESKS[id].label)) + '</span></button>';
      }).join('');
      host.appendChild(box);
      [].forEach.call(box.querySelectorAll('.azd-desk-hit'), function (b) {
        b.addEventListener('click', function () {
          var ph = document.getElementById('paletteHost'); if (ph) ph.hidden = true;
          if (global.App && App.go) App.go(b.getAttribute('data-desk'));
        });
      });
    }
    inp.addEventListener('input', render2);
    return true;
  }

  installRenderWrap();
  installOffWrap();
  bootNav();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { installHomeCard(); if (!installPalette()) setTimeout(installPalette, 1500); });
  else { installHomeCard(); if (!installPalette()) setTimeout(installPalette, 1500); }

  global.DeskKit = { register: register, deskFor: deskFor, workingSite: workingSite };
  console.info('desk-kit.js ready — reusable desk engine installed.');
})(window);
