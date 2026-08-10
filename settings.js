/* =========================================================================
   pages/settings.js — company profile, users, roles, audit log, data
   ========================================================================= */
(function (global) {
  'use strict';

  var tab = 'company';

  function render(host) {
    var admin = Auth.isAdmin();
    var tabs = [
      { id: 'company', icon: 'building', label: t('set.company') },
      { id: 'users',   icon: 'users',    label: t('set.users'), adminOnly: true },
      { id: 'roles',   icon: 'user',     label: t('set.roles') },
      { id: 'audit',   icon: 'clipboard',label: t('set.audit') },
      { id: 'data',    icon: 'download', label: t('set.data') },
      { id: 'about',   icon: 'life-buoy',label: t('set.about') }
    ].filter(function (x) { return !x.adminOnly || admin; });

    if (!tabs.some(function (x) { return x.id === tab; })) tab = 'company';

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('settings', 22) + ' ' + t('set.title') + '</h1>' +
      '<p class="page-sub">' + t('set.sub') + '</p></div></div>';

    html += '<div class="tabs">';
    tabs.forEach(function (x) {
      html += '<button class="tab' + (tab === x.id ? ' active' : '') + '" data-tab="' + x.id + '">' + UI.icon(x.icon, 15) + ' ' + x.label + '</button>';
    });
    html += '</div><div id="setBody"></div>';

    host.innerHTML = html;
    host.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { tab = b.getAttribute('data-tab'); render(host); };
    });

    var body = document.getElementById('setBody');
    ({ company: company, users: usersTab, roles: roles, audit: audit, data: dataTab, about: about }[tab])(body);
  }

  /* ---------- company profile ---------- */
  function company(body) {
    var c = Store.meta().company || {
      name: 'شركة الزهراء للمقاولات العامة', nameEn: 'Alzahraa General Contracting Co.',
      address: '', taxId: '', commercialReg: '', phone: '', email: '', currency: 'EGP',
      fiscalStart: '01-01'
    };
    var fields = [
      ['name', { ar: 'الاسم القانوني (عربي)', en: 'Legal name (Arabic)' }, 'text'],
      ['nameEn', { ar: 'الاسم القانوني (إنجليزي)', en: 'Legal name (English)' }, 'text'],
      ['address', { ar: 'العنوان', en: 'Address' }, 'text'],
      ['phone', { ar: 'الهاتف', en: 'Phone' }, 'text'],
      ['email', { ar: 'البريد الإلكتروني', en: 'Email' }, 'email'],
      ['taxId', { ar: 'البطاقة الضريبية', en: 'Tax ID' }, 'text'],
      ['commercialReg', { ar: 'السجل التجاري', en: 'Commercial registry' }, 'text'],
      ['currency', { ar: 'العملة الأساسية', en: 'Base currency' }, 'text'],
      ['fiscalStart', { ar: 'بداية السنة المالية (شهر-يوم)', en: 'Fiscal year start (MM-DD)' }, 'text']
    ];
    var h = '<div class="card"><div class="card-body"><div class="form-grid">';
    fields.forEach(function (f) {
      h += '<label class="field"><span class="field-label">' + UI.esc(L(f[1])) + '</span>' +
        '<input type="' + f[2] + '" class="input" data-cf="' + f[0] + '" value="' + UI.attr(c[f[0]] || '') + '"' +
        (Auth.isAdmin() ? '' : ' disabled') + '></label>';
    });
    h += '</div>';
    if (Auth.isAdmin()) {
      h += '<div class="mt-2"><button class="btn btn-primary" id="saveCompany">' + t('g.save') + '</button></div>';
    } else {
      h += '<p class="muted small mt-2">' + L({ ar: 'مسؤول النظام فقط يمكنه تعديل هذه البيانات.', en: 'Only a system administrator can edit these details.' }) + '</p>';
    }
    h += '</div></div>';
    body.innerHTML = h;

    var sv = document.getElementById('saveCompany');
    if (sv) sv.onclick = function () {
      var out = {};
      body.querySelectorAll('[data-cf]').forEach(function (el) { out[el.getAttribute('data-cf')] = el.value; });
      Store.setMeta({ company: out });
      Store.log('update', 'settings', 'company', L({ ar: 'بيانات الشركة', en: 'Company profile' }));
      UI.toast(t('g.saved'));
    };
  }

  /* ---------- users ---------- */
  function usersTab(body) {
    var list = Auth.users();
    var h = '<div class="card"><div class="table-toolbar">' +
      '<strong>' + t('set.users') + '</strong>' +
      '<button class="btn btn-primary btn-sm" id="newUser" style="margin-inline-start:auto">' + UI.icon('plus', 14) + ' ' + t('g.new') + '</button>' +
      '</div><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + L({ ar: 'الاسم', en: 'Name' }) + '</th>' +
      '<th class="no-sort">' + t('login.user') + '</th>' +
      '<th class="no-sort">' + L({ ar: 'الدور', en: 'Role' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'المشروعات المسموحة', en: 'Allowed projects' }) + '</th>' +
      '<th class="no-sort">' + t('g.status') + '</th>' +
      '<th class="no-sort col-actions">' + t('g.actions') + '</th></tr></thead><tbody>';

    list.forEach(function (u) {
      var projs = (u.projects && u.projects.length)
        ? u.projects.map(function (pid) { var p = Store.find('projects', pid); return p ? p.name : pid; }).join('، ')
        : L({ ar: 'كل المشروعات', en: 'All projects' });
      h += '<tr><td><strong>' + UI.esc(u.name) + '</strong></td>' +
        '<td class="num">' + UI.esc(u.username) + '</td>' +
        '<td>' + UI.esc(Auth.roleLabel(u.role)) + '</td>' +
        '<td class="small muted">' + UI.esc(projs) + '</td>' +
        '<td><span class="badge ' + (u.status === 'inactive' ? 'b-inactive' : 'b-active') + '">' +
          (u.status === 'inactive' ? L({ ar: 'موقوف', en: 'Disabled' }) : L({ ar: 'نشط', en: 'Active' })) + '</span></td>' +
        '<td class="col-actions"><div class="row-actions">' +
        '<button class="row-btn" data-eu="' + UI.attr(u.id) + '">' + UI.icon('edit', 16) + '</button>' +
        (u.username !== 'admin' ? '<button class="row-btn danger" data-du="' + UI.attr(u.id) + '">' + UI.icon('trash', 16) + '</button>' : '') +
        '</div></td></tr>';
    });
    h += '</tbody></table></div></div>';
    h += '<div class="alert alert-warn mt-2">' + UI.icon('alert', 17) + '<span><strong>' +
      L({ ar: 'تنبيه أمني: ', en: 'Security note: ' }) + '</strong>' +
      L({ ar: 'في الوضع التجريبي تُحفظ كلمات المرور كنص عادي داخل متصفح كل مستخدم. لا تضع بيانات حقيقية قبل الانتقال لقاعدة بيانات حقيقية (اقرأ الدليل).',
          en: 'In demo mode passwords are stored as plain text inside each visitor\'s own browser. Do not enter real company data before moving to a real database (see the guide).' }) +
      '</span></div>';
    body.innerHTML = h;

    document.getElementById('newUser').onclick = function () { userForm(null, body); };
    body.querySelectorAll('[data-eu]').forEach(function (b) { b.onclick = function () { userForm(b.getAttribute('data-eu'), body); }; });
    body.querySelectorAll('[data-du]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm({
          title: t('g.delete'), message: t('g.deleteQ'), danger: true, okLabel: t('g.delete'),
          onOk: function () { Store.destroy('users', b.getAttribute('data-du')); UI.toast(t('g.deleted')); usersTab(body); }
        });
      };
    });
  }

  function userForm(id, body) {
    var u = id ? Store.find('users', id) : { name: '', username: '', password: '1234', role: 'employee', status: 'active', projects: [] };
    var projects = Store.all('projects');

    var h = '<div class="form-grid">' +
      '<label class="field"><span class="field-label">' + L({ ar: 'الاسم الكامل', en: 'Full name' }) + ' <span class="req">*</span></span>' +
      '<input class="input" id="uName" value="' + UI.attr(u.name) + '"></label>' +
      '<label class="field"><span class="field-label">' + t('login.user') + ' <span class="req">*</span></span>' +
      '<input class="input" id="uUser" value="' + UI.attr(u.username) + '"></label>' +
      '<label class="field"><span class="field-label">' + t('login.pass') + '</span>' +
      '<input class="input" id="uPass" value="' + UI.attr(u.password) + '"></label>' +
      '<label class="field"><span class="field-label">' + L({ ar: 'الدور', en: 'Role' }) + '</span><select class="select" id="uRole">';
    Object.keys(Auth.ROLES).forEach(function (k) {
      h += '<option value="' + k + '"' + (u.role === k ? ' selected' : '') + '>' + UI.esc(Auth.roleLabel(k)) + '</option>';
    });
    h += '</select></label>' +
      '<label class="field"><span class="field-label">' + t('g.status') + '</span><select class="select" id="uStatus">' +
      '<option value="active"' + (u.status !== 'inactive' ? ' selected' : '') + '>' + L({ ar: 'نشط', en: 'Active' }) + '</option>' +
      '<option value="inactive"' + (u.status === 'inactive' ? ' selected' : '') + '>' + L({ ar: 'موقوف', en: 'Disabled' }) + '</option>' +
      '</select></label>' +
      '<label class="field"><span class="field-label">' + L({ ar: 'البريد الإلكتروني', en: 'Email' }) + '</span>' +
      '<input class="input" id="uEmail" value="' + UI.attr(u.email || '') + '"></label>' +
      '</div>';

    h += '<div class="form-section mt-2"><div class="form-section-title">' +
      L({ ar: 'حصر المستخدم على مشروعات محددة', en: 'Restrict user to specific projects' }) + '</div>' +
      '<p class="field-hint mb-2">' + L({ ar: 'اترك الكل بدون تحديد ليرى جميع المشروعات.', en: 'Leave all unchecked to allow every project.' }) + '</p>';
    projects.forEach(function (p) {
      var on = (u.projects || []).indexOf(p.id) !== -1;
      h += '<label class="check-row"><input type="checkbox" data-up="' + UI.attr(p.id) + '"' + (on ? ' checked' : '') + '> ' + UI.esc(p.name) + '</label>';
    });
    h += '</div>';

    h += '<div class="alert alert-info mt-2">' + UI.icon('eye', 16) + '<span id="roleDesc"></span></div>';

    UI.modal({
      title: (id ? t('g.edit') : t('g.new')) + ' — ' + t('set.users'),
      body: h,
      buttons: [
        { label: t('g.cancel'), cls: 'btn-ghost' },
        {
          label: t('g.save'), cls: 'btn-primary', keepOpen: true, onClick: function () {
            var name = document.getElementById('uName').value.trim();
            var username = document.getElementById('uUser').value.trim();
            if (!name || !username) { UI.toast(t('g.required'), 'error'); return false; }
            var dup = Auth.users().filter(function (x) { return x.username.toLowerCase() === username.toLowerCase() && x.id !== id; });
            if (dup.length) { UI.toast(L({ ar: 'اسم المستخدم مستخدم بالفعل', en: 'Username already exists' }), 'error'); return false; }
            var projs = [];
            document.querySelectorAll('[data-up]:checked').forEach(function (c) { projs.push(c.getAttribute('data-up')); });
            var data = {
              name: name, username: username,
              password: document.getElementById('uPass').value || '1234',
              role: document.getElementById('uRole').value,
              status: document.getElementById('uStatus').value,
              email: document.getElementById('uEmail').value,
              projects: projs
            };
            if (id) Store.save('users', id, data); else Store.create('users', data);
            UI.closeModal();
            UI.toast(t('g.saved'));
            usersTab(body);
            return true;
          }
        }
      ],
      onOpen: function () {
        var sel = document.getElementById('uRole');
        var desc = document.getElementById('roleDesc');
        function upd() { var r = Auth.ROLES[sel.value]; desc.textContent = r ? L(r.desc) : ''; }
        sel.onchange = upd; upd();
      }
    });
  }

  /* ---------- roles matrix ---------- */
  function roles(body) {
    var mods = Schema.MODULES;
    var h = '<div class="card"><div class="card-head"><h3 class="card-title">' + t('set.roles') + '</h3>' +
      '<span class="muted small">' + L({ ar: 'مرجع للاطلاع — لتعديل الصلاحيات عدّل ملف auth.js', en: 'Reference view — edit auth.js to change permissions' }) + '</span></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + L({ ar: 'الدور', en: 'Role' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'الوصف', en: 'Description' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'عدد الشاشات المتاحة', en: 'Screens available' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'يعتمد؟', en: 'Approves?' }) + '</th>' +
      '<th class="no-sort">' + L({ ar: 'يراجع؟', en: 'Reviews?' }) + '</th>' +
      '</tr></thead><tbody>';

    Object.keys(Auth.ROLES).forEach(function (key) {
      var r = Auth.ROLES[key];
      var p = r.perms;
      var count = 0, canApp = false, canRev = false;
      mods.forEach(function (m) {
        var acts = p[m.id] || p['*'] || [];
        if (acts.indexOf('view') !== -1) count++;
        if (acts.indexOf('approve') !== -1) canApp = true;
        if (acts.indexOf('review') !== -1) canRev = true;
      });
      h += '<tr><td><strong>' + UI.esc(L(r.label)) + '</strong><br><small class="muted num">' + key + '</small></td>' +
        '<td class="small">' + UI.esc(L(r.desc)) + '</td>' +
        '<td class="num">' + count + ' / ' + mods.length + '</td>' +
        '<td>' + (canApp ? '<span class="badge b-approved">' + t('g.yes') + '</span>' : '<span class="badge b-inactive">' + t('g.no') + '</span>') + '</td>' +
        '<td>' + (canRev ? '<span class="badge b-reviewed">' + t('g.yes') + '</span>' : '<span class="badge b-inactive">' + t('g.no') + '</span>') + '</td>' +
        '</tr>';
    });
    h += '</tbody></table></div></div></div>';

    h += '<div class="alert alert-info mt-2">' + UI.icon('eye', 17) + '<span>' +
      L({ ar: 'قاعدة فصل المهام مفعّلة دائماً: من يُدخل المستند لا يراجعه، ومن يراجعه لا يعتمده — حتى لو كان يحمل الدورين.',
          en: 'Segregation of duties is always enforced: whoever creates a document cannot review it, and whoever reviews it cannot approve it — even if they hold both roles.' }) +
      '</span></div>';
    body.innerHTML = h;
  }

  /* ---------- audit log ---------- */
  function audit(body) {
    var log = Store.auditLog().slice(0, 400);
    if (!log.length) { body.innerHTML = '<div class="card"><div class="card-body">' + UI.empty(t('set.auditEmpty'), '') + '</div></div>'; return; }

    var names = {
      create: t('aud.create'), update: t('aud.update'), 'delete': t('aud.delete'),
      login: t('aud.login'), logout: t('aud.logout'), status: t('aud.status'),
      login_failed: L({ ar: 'محاولة دخول فاشلة', en: 'Failed sign-in' })
    };
    var h = '<div class="card"><div class="table-toolbar">' +
      '<strong>' + t('set.audit') + '</strong>' +
      '<span class="muted small">' + L({ ar: 'آخر ٤٠٠ حركة', en: 'Last 400 events' }) + '</span>' +
      '<button class="btn btn-outline btn-sm" id="expAudit" style="margin-inline-start:auto">' + UI.icon('download', 14) + ' ' + t('g.export') + '</button>' +
      '</div><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + t('aud.time') + '</th><th class="no-sort">' + t('aud.user') + '</th>' +
      '<th class="no-sort">' + t('aud.action') + '</th><th class="no-sort">' + t('aud.entity') + '</th>' +
      '<th class="no-sort">' + t('aud.record') + '</th><th class="no-sort">' + t('aud.detail') + '</th>' +
      '</tr></thead><tbody>';
    log.forEach(function (e) {
      var mod = Schema.MODULES.filter(function (m) { return m.table === e.entity; })[0];
      h += '<tr><td class="num nowrap small">' + I18N.dateTime(e.at) + '</td>' +
        '<td>' + UI.esc(e.userName) + '</td>' +
        '<td>' + UI.esc(names[e.action] || e.action) + '</td>' +
        '<td>' + UI.esc(mod ? L(mod.label) : e.entity) + '</td>' +
        '<td class="small">' + UI.esc(e.label) + '</td>' +
        '<td class="small muted">' + UI.esc(e.extra || '') + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    body.innerHTML = h;

    document.getElementById('expAudit').onclick = function () {
      UI.exportCSV('audit_log',
        [t('aud.time'), t('aud.user'), t('aud.action'), t('aud.entity'), t('aud.record'), t('aud.detail')],
        log.map(function (e) {
          var mod = Schema.MODULES.filter(function (m) { return m.table === e.entity; })[0];
          return [I18N.dateTime(e.at), e.userName, names[e.action] || e.action, mod ? L(mod.label) : e.entity, e.label, e.extra || ''];
        }));
      UI.toast(t('g.export') + ' ✓');
    };
  }

  /* ---------- data & backup ---------- */
  function dataTab(body) {
    var u = Store.usage();
    var counts = Schema.MODULES.map(function (m) { return { m: m, n: Store.all(m.table).length }; });

    var h = '<div class="grid-2">';
    h += '<div class="card"><div class="card-head"><h3 class="card-title">' + UI.icon('download', 17) + ' ' + t('set.data') + '</h3></div><div class="card-body">' +
      '<p class="small muted mb-2">' + L({
        ar: 'نزّل نسخة احتياطية من كل البيانات كملف واحد. احتفظ به في مكان آمن — يمكنك استعادته في أي وقت على أي جهاز.',
        en: 'Download a backup of all your data as one file. Keep it somewhere safe — you can restore it any time on any device.'
      }) + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="btnBackup">' + UI.icon('download', 15) + ' ' + t('menu.backup') + '</button>' +
      '<button class="btn btn-outline" id="btnRestore">' + UI.icon('copy', 15) + ' ' + t('menu.restore') + '</button>' +
      (Auth.isAdmin() ? '<button class="btn btn-danger" id="btnReset">' + UI.icon('trash', 15) + ' ' + t('set.reset') + '</button>' : '') +
      '</div>' +
      '<div class="mt-3"><div class="field-label mb-2">' + L({ ar: 'مساحة التخزين المستخدمة', en: 'Storage used' }) + '</div>' +
      '<div class="progress"><span class="' + (u.pct > 80 ? 'over' : u.pct > 60 ? 'warn' : '') + '" style="width:' + u.pct.toFixed(1) + '%"></span></div>' +
      '<small class="muted num">' + (u.bytes / 1024).toFixed(0) + ' KB / ' + (u.limit / 1024 / 1024).toFixed(0) + ' MB (' + u.pct.toFixed(1) + '%)</small></div>' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h3 class="card-title">' + UI.icon('grid', 17) + ' ' +
      L({ ar: 'عدد السجلات في كل شاشة', en: 'Records per screen' }) + '</h3></div>' +
      '<div class="card-body flush" style="max-height:420px;overflow:auto"><table class="data-table"><tbody>';
    counts.forEach(function (c) {
      h += '<tr><td>' + UI.icon(c.m.icon, 15) + ' ' + UI.esc(L(c.m.label)) + '</td><td class="num text-e">' + c.n + '</td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    body.innerHTML = h;

    document.getElementById('btnBackup').onclick = App.backup;
    document.getElementById('btnRestore').onclick = App.restorePrompt;
    var rb = document.getElementById('btnReset');
    if (rb) rb.onclick = function () {
      UI.confirm({
        title: t('set.resetQ'), message: t('set.resetWarn'), danger: true, okLabel: t('set.reset'),
        onOk: function () {
          Store.wipe();
          Seed.run(true);
          UI.toast(t('g.saved'));
          setTimeout(function () { location.reload(); }, 600);
        }
      });
    };
  }

  /* ---------- about ---------- */
  function about(body) {
    body.innerHTML = '<div class="card"><div class="card-body">' +
      '<h3 style="margin-bottom:12px">' + t('app.name') + '</h3>' +
      '<dl class="detail-grid">' +
      '<div class="detail-item"><dt>' + L({ ar: 'الإصدار', en: 'Version' }) + '</dt><dd class="num">1.0.0</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'وضع التشغيل', en: 'Mode' }) + '</dt><dd>' +
        L({ ar: 'تجريبي — تخزين محلي', en: 'Demo — local storage' }) + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'عدد الشاشات', en: 'Screens' }) + '</dt><dd class="num">' + Schema.MODULES.length + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'عدد الأدوار', en: 'Roles' }) + '</dt><dd class="num">' + Object.keys(Auth.ROLES).length + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'اللغات', en: 'Languages' }) + '</dt><dd>' + L({ ar: 'العربية / English', en: 'Arabic / English' }) + '</dd></div>' +
      '<div class="detail-item"><dt>' + L({ ar: 'المتصفح', en: 'Browser' }) + '</dt><dd class="small">' + UI.esc(navigator.userAgent.slice(0, 60)) + '…</dd></div>' +
      '</dl>' +
      '<div class="alert alert-info mt-3">' + UI.icon('eye', 17) + '<span>' +
      L({ ar: 'اقرأ ملف GUIDE-AR.md المرفق مع المشروع: يشرح خطوة بخطوة كيف تنشر الموقع على الإنترنت، كيف تعدّله، وكيف تنقله لقاعدة بيانات حقيقية.',
          en: 'Read GUIDE-EN.md shipped with this project: it explains step by step how to publish the site, edit it, and move it to a real database.' }) +
      '</span></div>' +
      '<div class="mt-2"><h4 style="margin-bottom:8px">' + L({ ar: 'اختصارات لوحة المفاتيح', en: 'Keyboard shortcuts' }) + '</h4>' +
      '<ul class="small muted" style="line-height:2;padding-inline-start:20px">' +
      '<li><strong>Ctrl + K</strong> — ' + L({ ar: 'بحث سريع عن أي شاشة', en: 'Quick search for any screen' }) + '</li>' +
      '<li><strong>Esc</strong> — ' + L({ ar: 'إغلاق النافذة المفتوحة', en: 'Close the open dialog' }) + '</li>' +
      '<li><strong>Ctrl + P</strong> — ' + L({ ar: 'طباعة الشاشة الحالية', en: 'Print the current screen' }) + '</li>' +
      '</ul></div>' +
      '</div></div>';
  }

  global.SettingsPage = { render: render };
})(window);
