/* =========================================================================
   app.js — boot, login, navigation, routing, shell behaviour
   ========================================================================= */
(function (global) {
  'use strict';

  var route = 'dashboard';

  /* ======================================================================
     BOOT
     ==================================================================== */
  async function boot() {
    I18N.init();

    /* theme */
    var theme = null;
    try { theme = localStorage.getItem('az_theme'); } catch (e) {}
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    wireLogin();
    wireShell();
    registerServiceWorker();

    var authInit = await Auth.init();
    if (!authInit.ok) {
      showSetupRequired(authInit.error);
      return;
    }

    /* Supabase keeps the signed-in session across refreshes and browser restarts. */
    var u = await Auth.restore();
    if (u) {
      try { await loadWorkspace(u); }
      catch (error) { showLoginError(error.message === 'first-login-requires-internet' ? 'first-online' : 'load'); }
    }

    I18N.onChange(function () {
      I18N.applyStatic();
      if (!document.getElementById('appShell').hidden) {
        buildNav();
        renderRoute();
        paintUser();
      }
      var lb = document.getElementById('langBtn');
      var llb = document.getElementById('loginLangBtn');
      var txt = I18N.getLang() === 'ar' ? 'English' : 'العربية';
      if (lb) lb.textContent = txt;
      if (llb) llb.textContent = txt;
    });

    Store.onChange(function (type) {
      if (type === 'remote-change' && document.getElementById('modalHost').hidden) refresh();
      if (type === 'conflict' || type === 'sync-error') {
        UI.toast(I18N.getLang() === 'ar'
          ? 'لم تُكتب إحدى المسودات على الخادم. حُفظت نسختك المشفّرة ويمكن مراجعة التعارض من الإعدادات ← البيانات.'
          : 'A draft was not written to the server. Your encrypted copy is preserved under Settings → Data conflicts.', 'error', 8500);
      }
      updateStorage();
    });
  }

  /* ======================================================================
     LOGIN
     ==================================================================== */
  function showSetupRequired() {
    var form = document.getElementById('loginForm');
    if (form) form.hidden = true;
    var notice = document.getElementById('setupNotice');
    if (notice) notice.hidden = false;
  }

  function showLoginError(kind) {
    var err = document.getElementById('loginError');
    if (!err) return;
    err.textContent = kind === 'disabled'
      ? (I18N.getLang() === 'ar' ? 'هذا الحساب موقوف. تواصل مع مسؤول النظام.' : 'This account is disabled. Contact the administrator.')
      : kind === 'profile'
        ? (I18N.getLang() === 'ar' ? 'الحساب غير مربوط بملف موظف.' : 'This sign-in is not linked to an employee profile.')
        : kind === 'first-online'
          ? (I18N.getLang() === 'ar' ? 'أول دخول على هذا الجهاز يحتاج اتصالاً بالإنترنت.' : 'The first sign-in on this device requires internet.')
          : kind === 'load'
            ? (I18N.getLang() === 'ar' ? 'تعذّر تحميل بيانات عملك. تحقق من الاتصال ثم حاول مرة أخرى.' : 'Your workspace could not be loaded. Check the connection and try again.')
            : t('login.bad');
    err.hidden = false;
  }

  function wireLogin() {
    var form = document.getElementById('loginForm');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = document.getElementById('loginError');
      var button = form.querySelector('[type="submit"]');
      err.hidden = true;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      var res;
      try { res = await Auth.login(document.getElementById('loginUser').value, document.getElementById('loginPass').value); }
      catch (error) { res = { ok: false, error: 'load' }; }
      if (!res.ok) {
        showLoginError(res.error);
        button.disabled = false;
        button.removeAttribute('aria-busy');
        return;
      }
      try { await loadWorkspace(res.user); }
      catch (error) { showLoginError(error.message === 'first-login-requires-internet' ? 'first-online' : 'load'); }
      button.disabled = false;
      button.removeAttribute('aria-busy');
    });

    document.getElementById('loginLangBtn').onclick = function () {
      I18N.setLang(I18N.getLang() === 'ar' ? 'en' : 'ar');
    };
  }

  async function loadWorkspace(user) {
    await Store.initialize(Auth.client(), user);
    enterApp(user);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !global.ALZAHRAA_CONFIG.offlineEnabled) return;
    navigator.serviceWorker.register('./service-worker.js').catch(function (error) {
      console.warn('service worker unavailable', error);
    });
  }

  function enterApp(user) {
    document.getElementById('loginScreen').hidden = true;
    document.getElementById('appShell').hidden = false;
    paintUser();
    buildNav();
    route = firstAllowedRoute();
    renderRoute();
    updateInboxBadge();
    updateStorage();
    var fv = document.getElementById('footerVersion');
    if (fv) fv.textContent = 'v' + (global.ALZAHRAA_CONFIG.version || '2.0.1');
    UI.toast(t('login.welcome') + user.name, 'success');

    /* The database withholds every business role until this succeeds. */
    if (user.mustChangePassword && global.Identity) {
      setTimeout(function () { Identity.promptPasswordChange(true); }, 0);
    }
  }

  function firstAllowedRoute() {
    if (Auth.canSee('projects') || Auth.isAdmin() || Auth.current().role === 'gm') return 'dashboard';
    /* every role can at least see the dashboard; fall back to first visible module */
    return 'dashboard';
  }

  function paintUser() {
    var u = Auth.current();
    if (!u) return;
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userRole').textContent = Auth.roleLabel(u.role);
    document.getElementById('userAvatar').textContent = (u.name || '؟').trim().charAt(0);
  }

  /* ======================================================================
     NAVIGATION
     ==================================================================== */
  function buildNav() {
    var nav = document.getElementById('mainNav');
    nav.innerHTML = '';

    var groups = [
      { id: 'main', items: [
        { id: 'dashboard', icon: 'grid', label: { ar: 'لوحة التحكم', en: 'Dashboard' } },
        { id: 'inbox', icon: 'inbox', label: { ar: 'صندوق الاعتمادات', en: 'Approvals inbox' }, badge: true },
        { id: 'alerts', icon: 'alert', label: { ar: 'التنبيهات', en: 'Alerts' }, alertBadge: true },
        { id: 'assistant', icon: 'life-buoy', label: { ar: 'مساعدي', en: 'My assistant' } }
      ] },
      { id: 'finance',  items: modulesIn('finance') },
      { id: 'projects', items: modulesIn('projects') },
      { id: 'people',   items: modulesIn('people') },
      { id: 'system', items: [
        { id: 'reports', icon: 'chart', label: { ar: 'التقارير', en: 'Reports' } },
        { id: 'settings', icon: 'settings', label: { ar: 'الإعدادات', en: 'Settings' } }
      ] }
    ];

    groups.forEach(function (g) {
      if (!g.items.length) return;
      var gEl = document.createElement('div');
      gEl.className = 'nav-group';
      var gt = Schema.GROUPS.filter(function (x) { return x.id === g.id; })[0];
      gEl.innerHTML = '<div class="nav-group-title">' + UI.esc(gt ? L(gt.label) : g.id) + '</div>';

      g.items.forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'nav-item' + (route === it.id ? ' active' : '');
        b.setAttribute('data-route', it.id);
        b.innerHTML = '<span class="nav-icon">' + UI.icon(it.icon, 17) + '</span>' +
          '<span class="nav-label">' + UI.esc(L(it.label)) + '</span>' +
          (it.badge ? '<span class="nav-count" data-inbox-count hidden>0</span>' : '') +
          (it.alertBadge ? '<span class="nav-count danger" data-alert-count hidden>0</span>' : '');
        b.onclick = function () { go(it.id); };
        gEl.appendChild(b);
      });
      nav.appendChild(gEl);
    });

    updateInboxBadge();

    /* sidebar filter box */
    var sb = document.getElementById('navSearch');
    sb.value = '';
    sb.oninput = function () {
      var q = sb.value.trim().toLowerCase();
      nav.querySelectorAll('.nav-item').forEach(function (b) {
        var txt = b.textContent.toLowerCase();
        b.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
      });
      nav.querySelectorAll('.nav-group').forEach(function (g) {
        var any = Array.prototype.some.call(g.querySelectorAll('.nav-item'), function (b) { return b.style.display !== 'none'; });
        g.style.display = any ? '' : 'none';
      });
    };
  }

  function modulesIn(group) {
    return Schema.MODULES.filter(function (m) {
      return m.group === group && Auth.canSee(m.id);
    }).map(function (m) {
      return { id: m.id, icon: m.icon, label: m.label };
    });
  }

  function go(r) {
    route = r;
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-route') === r);
    });
    closeSidebar();
    renderRoute();
    document.getElementById('content').scrollIntoView({ block: 'start' });
    try { history.replaceState(null, '', '#' + r); } catch (e) {}
  }

  function renderRoute() {
    var host = document.getElementById('content');
    Dashboard.destroyCharts();
    host.innerHTML = '';
    setCrumbs();

    if (route === 'dashboard') { (global.DashboardView ? DashboardView : Dashboard).render(host); }
    else if (route === 'inbox') { ApprovalsPage.render(host); }
    else if (route === 'alerts') { Alerts.invalidate(); Alerts.render(host); }
    else if (route === 'assistant') { Assistant.render(host); }
    else if (route === 'reports') { ReportsPage.render(host); }
    else if (route === 'settings') { SettingsPage.render(host); }
    else { EntityPage.render(route, host); }

    updateInboxBadge();
    updateStorage();
  }

  function setCrumbs() {
    var el = document.getElementById('breadcrumbs');
    var name, groupName = '';
    if (route === 'dashboard') name = t('dash.title');
    else if (route === 'inbox') name = t('inbox.title');
    else if (route === 'alerts') name = t('alerts.title');
    else if (route === 'assistant') name = t('ai.title');
    else if (route === 'reports') name = t('rep.title');
    else if (route === 'settings') name = t('set.title');
    else {
      var m = Schema.get(route);
      name = m ? L(m.label) : route;
      var g = m && Schema.GROUPS.filter(function (x) { return x.id === m.group; })[0];
      groupName = g ? L(g.label) : '';
    }
    el.innerHTML = (groupName ? '<span>' + UI.esc(groupName) + '</span><span class="sep">/</span>' : '') +
      '<span class="crumb-current">' + UI.esc(name) + '</span>';
  }

  function refresh() { renderRoute(); }

  /* ======================================================================
     SHELL
     ==================================================================== */
  function wireShell() {
    document.getElementById('menuBtn').onclick = openSidebar;
    document.getElementById('sidebarClose').onclick = closeSidebar;
    document.getElementById('sidebarBackdrop').onclick = closeSidebar;

    document.getElementById('langBtn').onclick = function () {
      I18N.setLang(I18N.getLang() === 'ar' ? 'en' : 'ar');
    };

    document.getElementById('themeBtn').onclick = function () {
      var html = document.documentElement;
      var dark = html.getAttribute('data-theme') === 'dark';
      if (dark) html.removeAttribute('data-theme'); else html.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('az_theme', dark ? 'light' : 'dark'); } catch (e) {}
      renderRoute();
    };

    document.getElementById('inboxBtn').onclick = function () { go('inbox'); };
    var alBtn = document.getElementById('alertsBtn');
    if (alBtn) alBtn.onclick = function () { go('alerts'); };
    document.getElementById('globalSearchBtn').onclick = openPalette;

    /* user dropdown */
    var ub = document.getElementById('userBtn');
    var dd = document.getElementById('userDropdown');
    ub.onclick = function (e) { e.stopPropagation(); dd.hidden = !dd.hidden; };
    document.addEventListener('click', function () { dd.hidden = true; });
    dd.onclick = function (e) { e.stopPropagation(); };
    dd.querySelectorAll('[data-action]').forEach(function (b) {
      b.onclick = function () {
        dd.hidden = true;
        var a = b.getAttribute('data-action');
        if (a === 'logout') doLogout();
        if (a === 'settings') go('settings');
        if (a === 'profile') showProfile();
        if (a === 'password') Identity.promptPasswordChange(false);
        if (a === 'backup') backup();
        if (a === 'restore') restorePrompt();
      };
    });

    /* modal */
    document.getElementById('modalClose').onclick = UI.dismissModal;
    document.getElementById('modalBackdrop').onclick = UI.dismissModal;

    /* command palette */
    document.getElementById('paletteBackdrop').onclick = closePalette;
    document.getElementById('paletteInput').addEventListener('input', renderPalette);
    document.getElementById('paletteInput').addEventListener('keydown', paletteKeys);

    /* keyboard */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!document.getElementById('appShell').hidden) openPalette();
      }
      if (e.key === 'Escape') {
        if (!document.getElementById('paletteHost').hidden) closePalette();
        else if (!document.getElementById('modalHost').hidden) UI.dismissModal();
        else closeSidebar();
      }
    });

    /* hash routing */
    window.addEventListener('hashchange', function () {
      var r = location.hash.replace('#', '');
      if (r && r !== route && !document.getElementById('appShell').hidden) go(r);
    });
  }

  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  }

  function doLogout() {
    UI.confirm({
      title: t('menu.logout'),
      message: I18N.getLang() === 'ar' ? 'هل تريد تسجيل الخروج؟' : 'Sign out of the portal?',
      okLabel: t('menu.logout'),
      onOk: async function () {
        await Auth.logout();
        document.getElementById('appShell').hidden = true;
        document.getElementById('loginScreen').hidden = false;
        document.getElementById('loginPass').value = '';
      }
    });
  }

  function showProfile() {
    var u = Auth.current();
    var r = Auth.ROLES[u.role];
    var mods = Schema.MODULES.filter(function (m) { return Auth.canSee(m.id); });
    var body = '<dl class="detail-grid">' +
      '<div class="detail-item"><dt>' + L({ ar: 'الاسم', en: 'Name' }) + '</dt><dd>' + UI.esc(u.name) + '</dd></div>' +
      '<div class="detail-item"><dt>' + t('login.user') + '</dt><dd class="num">' + UI.esc(u.username) + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'الدور', en: 'Role' }) + '</dt><dd>' + UI.esc(Auth.roleLabel(u.role)) + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'الشاشات المتاحة', en: 'Screens available' }) + '</dt><dd class="num">' + mods.length + '</dd></div>' +
      '</dl>' +
      '<div class="alert alert-info mt-2">' + UI.icon('eye', 16) + '<span>' + UI.esc(L(r.desc)) + '</span></div>' +
      '<div class="mt-2"><div class="field-label mb-2">' + L({ ar: 'الشاشات التي يمكنك الوصول إليها', en: 'Screens you can access' }) + '</div>' +
      '<div class="chip-row">' + mods.map(function (m) {
        var acts = ['create', 'edit', 'review', 'approve'].filter(function (a) { return Auth.can(m.id, a); });
        return '<span class="filter-chip">' + UI.esc(L(m.label)) + (acts.length ? ' <small class="muted">(' + acts.map(function (a) { return t('perm.' + a); }).join('، ') + ')</small>' : '') + '</span>';
      }).join('') + '</div></div>';

    UI.modal({ title: t('menu.profile'), body: body, buttons: [{ label: t('g.close'), cls: 'btn-ghost' }] });
  }

  /* ---------- scoped export / protected recovery ---------- */
  function backup() {
    var dump = Store.exportAll();
    var name = 'alzahraa-accessible-data-' + new Date().toISOString().slice(0, 10) + '.json';
    UI.downloadJSON(dump, name);
    Store.log('export', 'system', '', name);
    UI.toast(t('set.backupOk'));
  }
  function restorePrompt() {
    UI.toast(I18N.getLang() === 'ar'
      ? 'الاستعادة المباشرة متوقفة في النسخة الفعلية لحماية قاعدة البيانات. استخدم نسخة Supabase الاحتياطية.'
      : 'Direct restore is disabled in production to protect the database. Use the protected Supabase backup.', 'info', 6500);
  }
  /* ---------- badges & meters ---------- */
  function updateInboxBadge() {
    var n = 0;
    try { n = Workflow.inboxCount(); } catch (e) {}
    var b = document.getElementById('inboxBadge');
    if (b) { b.textContent = n; b.hidden = !n; }
    document.querySelectorAll('[data-inbox-count]').forEach(function (el) {
      el.textContent = n; el.hidden = !n;
    });

    var an = 0;
    try { Alerts.invalidate(); an = Alerts.count(); } catch (e) {}
    document.querySelectorAll('[data-alert-count]').forEach(function (el) {
      el.textContent = an; el.hidden = !an;
    });
    var ab = document.getElementById('alertBadge');
    if (ab) { ab.textContent = an; ab.hidden = !an; }
  }
  function updateStorage() {
    var u = Store.usage();
    var bar = document.getElementById('storageBar');
    var txt = document.getElementById('storageText');
    if (bar) bar.style.width = Math.max(2, u.pct).toFixed(1) + '%';
    if (txt) txt.textContent = (u.bytes / 1024).toFixed(0) + ' KB' +
      (u.pending ? (' · ' + u.pending + ' ' + (I18N.getLang() === 'ar' ? 'في الانتظار' : 'pending')) : '') +
      (u.conflicts ? (' · ' + u.conflicts + ' ' + (I18N.getLang() === 'ar' ? 'تعارض' : 'conflicts')) : '');
  }

  /* ---------- command palette ---------- */
  var palIndex = 0, palItems = [];
  function openPalette() {
    document.getElementById('paletteHost').hidden = false;
    var inp = document.getElementById('paletteInput');
    inp.value = '';
    renderPalette();
    setTimeout(function () { inp.focus(); }, 30);
  }
  function closePalette() { document.getElementById('paletteHost').hidden = true; }

  function renderPalette() {
    var q = (document.getElementById('paletteInput').value || '').trim().toLowerCase();
    var out = [];

    [['dashboard', t('dash.title'), 'grid'], ['inbox', t('inbox.title'), 'inbox'],
     ['alerts', t('alerts.title'), 'alert'], ['assistant', t('ai.title'), 'life-buoy'],
     ['reports', t('rep.title'), 'chart'], ['settings', t('set.title'), 'settings']].forEach(function (x) {
      out.push({ route: x[0], label: x[1], icon: x[2], hint: t('grp.main') });
    });

    Schema.MODULES.forEach(function (m) {
      if (!Auth.canSee(m.id)) return;
      var g = Schema.GROUPS.filter(function (x) { return x.id === m.group; })[0];
      out.push({ route: m.id, label: L(m.label), icon: m.icon, hint: g ? L(g.label) : '' });
      if (Auth.can(m.id, 'create')) {
        out.push({ route: m.id, label: t('g.new') + ' — ' + L(m.label), icon: 'plus', hint: t('dash.quickActions'), create: true });
      }
    });

    if (q) out = out.filter(function (x) { return x.label.toLowerCase().indexOf(q) !== -1 || (x.hint || '').toLowerCase().indexOf(q) !== -1; });
    palItems = out.slice(0, 40);
    palIndex = 0;

    var host = document.getElementById('paletteResults');
    if (!palItems.length) {
      host.innerHTML = '<div class="palette-item muted">' + t('g.noResults') + '</div>';
      return;
    }
    host.innerHTML = palItems.map(function (x, i) {
      return '<button class="palette-item' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
        UI.icon(x.icon, 16) + '<span>' + UI.esc(x.label) + '</span><small>' + UI.esc(x.hint || '') + '</small></button>';
    }).join('');
    host.querySelectorAll('[data-i]').forEach(function (b) {
      b.onclick = function () { pickPalette(Number(b.getAttribute('data-i'))); };
    });
  }

  function paletteKeys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
    if (e.key === 'Enter') { e.preventDefault(); pickPalette(palIndex); }
  }
  function movePalette(d) {
    if (!palItems.length) return;
    palIndex = (palIndex + d + palItems.length) % palItems.length;
    var host = document.getElementById('paletteResults');
    host.querySelectorAll('.palette-item').forEach(function (b, i) { b.classList.toggle('sel', i === palIndex); });
    var sel = host.querySelector('.palette-item.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function pickPalette(i) {
    var x = palItems[i];
    if (!x) return;
    closePalette();
    if (x.create) { go(x.route); setTimeout(function () { EntityPage.openForm(x.route, null); }, 120); }
    else go(x.route);
  }

  /* ---------- expose ---------- */
  global.App = {
    go: go, refresh: refresh, backup: backup, restorePrompt: restorePrompt,
    route: function () { return route; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
