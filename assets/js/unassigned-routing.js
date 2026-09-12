/* =========================================================================
   unassigned-routing.js — «مستندات بلا معتمد يمكنه الوصول إليها»
   ---------------------------------------------------------------------
   نصف حكم صاحب العمل، ١٠ سبتمبر ٢٠٢٦: «إن تعذّر تحديد وجهة مخوَّلة،
   اعرض حالة توجيه غير مُسنَد قابلة للتصرّف واحفظ السجل المعلَّق لحلٍّ
   مخوَّل.» inbox-project-fence.js يمنع عرض السجل على من يستبعده السياج
   — هذا الملف يجيب سؤالاً مختلفاً تماماً: هل بقي لهذا السجل أي إنسان
   حقيقي يستطيع الوصول إليه أصلاً؟ حساب واحد صحيح النطاق يكفي لإسقاطه من
   هذه القائمة. لا يُخترَع بديل أبداً — «لا أحد يعتمد شيئاً» هو قرار
   محمد زيدان، لا قرار هذا الملف.

   HALF OF THE OWNER'S RULING, 10 Sept 2026: "if no authorised
   destination can be determined, show an actionable unassigned
   condition and keep the pending record for authorised resolution."
   inbox-project-fence.js stops OFFERING a record to whoever the fence
   excludes — this file answers a different question entirely: is there
   still any real human who can reach this record at all? One correctly
   scoped account is enough to drop a document off this list. No
   replacement is ever invented — "nobody can approve this" is Mohamed
   Zidan's decision to make, never this file's.

   ── لِمن هذه الشاشة ────────────────────────────────────────────────────
   لمسؤول النظام (Auth.isAdmin()) فقط — تقرير إعدادات، لا شاشة اعتماد.
   مسؤول النظام لا يعتمد شيئاً أبداً (قرار قائم: auth.js دور admin بلا
   review/approve إطلاقاً)، فهذا الملف لا يمنحه ذلك ولا يقترح بديلاً —
   يعرض الحقائق فقط ليصحّح هو الإعداد من شاشة المستخدمين.

   WHO THIS SCREEN IS FOR: the system administrator (Auth.isAdmin())
   only — a configuration report, never an approval screen. The
   administrator never approves anything (a standing decision: admin's
   role in auth.js carries no review/approve at all), so this file
   grants none and suggests no replacement — it states facts only, so
   HE can fix the configuration from the Users screen.

   ── الأهلية محسوبة بقاعدة المتصفح نفسها، بالاسم ────────────────────────
   Auth.ROLES[u.role].perms[mod.id] || perms['*']، مع احترام
   u.overrides (auth.js:949-951)، وAuth.hasAllProjects وAuth.seesAllSites
   (sites.js) وu.status وu.mustChangePassword وrec.createdBy
   وrec.reviewedBy — نفس القواعد الحقيقية حرفياً، لا نسخة موازية قد
   تنحرف عنها يوماً.

   ELIGIBILITY IS COMPUTED WITH THE BROWSER'S OWN RULE, BY NAME:
   Auth.ROLES[u.role].perms[mod.id] || perms['*'], honouring
   u.overrides (auth.js:949-951), Auth.hasAllProjects and
   Auth.seesAllSites (sites.js), u.status, u.mustChangePassword,
   rec.createdBy and rec.reviewedBy — the real rules verbatim, never a
   parallel copy that could one day drift from them.

   ── إضافي بحت، لا يُعدِّل سجلاً واحداً ───────────────────────────────────
   يلفّ ApprovalsPage.render مرة أخرى (لفّة مستقلة عن inbox-project-
   fence.js، لا تتصادمان — كلتاهما تُلحِق بعد الرسم الأصلي). لا كتابة
   على قاعدة البيانات ولا على Store إطلاقاً. حذف هذا الملف يعيد سلوك
   اليوم حرفياً: لا بطاقة إضافية على شاشة الاعتمادات.

   PURELY ADDITIVE, MODIFIES NOT ONE RECORD — wraps ApprovalsPage.render
   a second time (independent of inbox-project-fence.js's own wrap;
   they do not collide — both append after the original render). No
   write to the database or to Store, ever. Deleting this file restores
   today's behaviour exactly: no extra card on the approvals screen.

   مُثبَت بالتشغيل / proven by running: TESTS/inbox-project-fence-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function txt(pair) { return (global.L ? L(pair) : (isAr() ? pair.ar : pair.en)); }

  var REASON = {
    inactive:  { ar: 'الحساب موقوف', en: 'account inactive' },
    pwd:       { ar: 'لم يغيّر كلمة المرور بعد', en: 'password not yet changed' },
    creator:   { ar: 'هو من أنشأ المستند', en: 'is the creator' },
    reviewer:  { ar: 'هو من راجع المستند', en: 'is the reviewer' },
    project:   { ar: 'مشروع المستند غير مُدرَج في مشروعات حسابه', en: 'the document\'s project is not ticked on this account' },
    site:      { ar: 'المستند من موقع آخر غير موقعه', en: 'the document is from a different site' }
  };

  /* الفعل المطلوب فعلاً لدفع المستند للأمام — نفس القراءة التي يعتمدها
     inbox() وone-step-approval.js: «قيد الانتظار» بخطوة واحدة يحتاج
     اعتماداً مباشرة، بخطوتين يحتاج مراجعة أولاً؛ «مُراجَع» يحتاج اعتماداً
     دائماً. The action actually needed to move the document forward —
     the same reading inbox() and one-step-approval.js already use:
     one-step "pending" needs approval directly, two-step needs review
     first; "reviewed" always needs approval. */
  function neededAction(mod, rec) {
    if (rec.status === 'reviewed') return 'approve';
    return mod.skipReview ? 'approve' : 'review';
  }

  /* الأدوار التي تملك هذا الفعل على هذه الشاشة حسب تعريفها — حقيقة عن
     النظام، بصرف النظر عن وجود حساب يحملها فعلاً أم لا.
     The roles that hold this action on this screen BY DEFINITION — a
     fact about the system, regardless of whether any account actually
     carries that role. */
  function rolesHoldingAction(mod, action) {
    var out = [];
    Object.keys(Auth.ROLES || {}).forEach(function (rk) {
      var r = Auth.ROLES[rk];
      if (!r || !r.perms) return;
      var p = r.perms[mod.id] || r.perms['*'];
      if (p && p.indexOf(action) !== -1) out.push(rk);
    });
    return out;
  }

  /* هل يملك هذا الحساب الفعل على هذه الشاشة؟ نفس قاعدة permsFor حرفياً،
     بما فيها أسبقية overrides (auth.js:949-951).
     Does this account hold the action on this screen? permsFor's own
     rule verbatim, including overrides taking priority (auth.js:949-951). */
  function accountHoldsAction(u, mod, action) {
    var p = (u.overrides && u.overrides[mod.id]) ||
            (Auth.ROLES[u.role] && (Auth.ROLES[u.role].perms[mod.id] || Auth.ROLES[u.role].perms['*']));
    return !!(p && p.indexOf(action) !== -1);
  }

  var hasProjectField = {}, hasSiteField = {};
  function modHasField(mod, name, cache) {
    if (cache[mod.id] !== undefined) return cache[mod.id];
    return (cache[mod.id] = (mod.fields || []).some(function (f) { return f.name === name; }));
  }

  /* السبب الوحيد الذي يمنع هذا الحساب بعينه — أو null إن كان يصلح فعلاً.
     الترتيب: حالة الحساب أولاً، ثم منع الاعتماد الذاتي، ثم المشروع، ثم
     الموقع — نفس ترتيب الفحص الذي يطبّقه Auth.scopeRows نفسه (مشروع ثم
     موقع، sites.js يلفّ فوق auth.js).
     The ONE reason this specific account is blocked — or null if it
     genuinely qualifies. Order: account state first, then the
     no-self-approval rule, then project, then site — the same order
     Auth.scopeRows itself applies (project, then site — sites.js wraps
     on top of auth.js). */
  function reasonForAccount(u, mod, rec, action) {
    if (u.status === 'inactive') return 'inactive';
    if (u.mustChangePassword) return 'pwd';
    if (rec.createdBy === u.id) return 'creator';
    if (action === 'approve' && rec.reviewedBy === u.id) return 'reviewer';

    if (modHasField(mod, 'project', hasProjectField) && !Auth.hasAllProjects(u)) {
      var allowedP = u.projects || [];
      if (rec.project && allowedP.indexOf(rec.project) === -1) return 'project';
    }
    if (modHasField(mod, 'site', hasSiteField) && global.Auth.seesAllSites && !Auth.seesAllSites(u)) {
      var mySite = global.Auth.site ? Auth.site(u) : (u.site || null);
      if (rec.site && rec.site !== mySite) return 'site';
    }
    return null;
  }

  function computeUnassigned(users) {
    var out = [];
    (global.Schema.MODULES || []).forEach(function (mod) {
      if (!mod.workflow) return;
      var rows = (global.Store.all(mod.table) || []).filter(function (r) {
        return r.status === 'pending' || r.status === 'reviewed';
      });
      rows.forEach(function (rec) {
        var action = neededAction(mod, rec);
        var candidates = users.filter(function (u) { return accountHoldsAction(u, mod, action); });
        var accounts = candidates.map(function (u) { return { user: u, reason: reasonForAccount(u, mod, rec, action) }; });
        var reachable = accounts.some(function (a) { return !a.reason; });
        if (reachable) return;   /* حساب واحد صالح يكفي — ليس هذا المستند غير مُسنَد */
        out.push({
          mod: mod, rec: rec, action: action,
          roles: rolesHoldingAction(mod, action),
          accounts: accounts
        });
      });
    });
    return out;
  }

  function waitingSince(rec) {
    return rec.reviewedAt || rec.submittedAt || rec.createdAt || rec.date || null;
  }

  function rowHTML(item) {
    var proj = item.rec.project && global.Store.find('projects', item.rec.project);
    var site = item.rec.site && global.Store.find('sites', item.rec.site);
    var when = waitingSince(item.rec);
    var accountsHTML = item.accounts.length
      ? '<ul style="margin:4px 0 0 0;padding-inline-start:18px">' + item.accounts.map(function (a) {
          return '<li>' + UI.esc(a.user.name || a.user.username || a.user.id) + ' (' + UI.esc(a.user.role) + ') — ' +
            UI.esc(txt(REASON[a.reason] || { ar: '—', en: '—' })) + '</li>';
        }).join('') + '</ul>'
      : '<p class="muted small" style="margin:4px 0 0 0">' +
        UI.esc(txt({ ar: 'لا يوجد أي حساب اليوم يحمل هذا الدور أصلاً', en: 'no account today carries a role with this action at all' })) + '</p>';

    return '<div class="card mb-2"><div class="card-body">' +
      '<strong>' + UI.esc(txt(item.mod.label)) + '</strong> — ' + UI.esc(item.rec.docNo || item.rec.id) +
      ' <span class="badge b-info plain">' + UI.esc(item.action) + '</span>' +
      '<div class="muted small" style="margin-top:2px">' +
      UI.esc(txt({ ar: 'المشروع', en: 'Project' })) + ': ' + UI.esc(proj ? (proj.name || proj.id) : '—') + ' · ' +
      UI.esc(txt({ ar: 'الموقع', en: 'Site' })) + ': ' + UI.esc(site ? (site.name || site.id) : '—') + ' · ' +
      UI.esc(txt({ ar: 'الحالة', en: 'Status' })) + ': ' + UI.esc(item.rec.status) + ' · ' +
      UI.esc(txt({ ar: 'بانتظار منذ', en: 'Waiting since' })) + ': ' + UI.esc(when ? String(when).slice(0, 10) : '—') +
      '</div>' +
      '<div class="muted small" style="margin-top:4px">' +
      UI.esc(txt({ ar: 'الأدوار التي تملك هذا الفعل', en: 'Roles holding this action' })) + ': ' +
      UI.esc(item.roles.length ? item.roles.join(', ') : (isAr() ? 'لا يوجد' : 'none')) +
      '</div>' + accountsHTML +
      '</div></div>';
  }

  function cardHTML(items) {
    return '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.esc(txt({ ar: '⚠️ مستندات بلا معتمد يمكنه الوصول إليها', en: '⚠️ Documents with no reachable approver' })) +
      '</h3><span class="badge b-danger plain num">' + items.length + '</span></div>' +
      '<div class="card-body"><p class="muted small">' +
      UI.esc(txt({
        ar: 'تقرير إعدادات لمسؤول النظام فقط — لا اعتماد ولا اقتراح بديل. ' +
            'حسّن مشروعات/مواقع الحسابات من شاشة المستخدمين.',
        en: 'A configuration report for the system administrator only — no approving, no suggested ' +
            'replacement. Fix the accounts\' projects/sites from the Users screen.'
      })) + '</p></div>' +
      items.map(rowHTML).join('') + '</div>';
  }

  function honestLineHTML() {
    return '<div class="card mb-2"><div class="card-body"><p class="muted small">' +
      UI.esc(txt({
        ar: 'تعذّر حساب «مستندات بلا معتمد يمكنه الوصول إليها» — قائمة الحسابات لم تُحمَّل بعد.',
        en: 'Cannot compute "documents with no reachable approver" — the accounts list has not loaded yet.'
      })) + '</p></div></div>';
  }

  function renderCard(host) {
    if (!Auth.isAdmin()) return;
    var users = global.Store.all('users') || [];
    /* «لم تُحمَّل» و«حساب واحد فعلاً» لا يمكن تمييزهما من هنا — نختار
       الجانب الآمن دوماً: سطر صريح، لا بطاقة فارغة تُقرأ خطأً «كل شيء
       مُوجَّه». "Did not load" and "genuinely just one account" cannot
       be told apart from here — we always choose the safe side: an
       explicit line, never an empty card that could be misread as
       "everything is routed". */
    /* host.innerHTML += … لا insertAdjacentHTML — نفس اختيار inbox-project-
       fence.js بالضبط ولنفس السبب. host.innerHTML += … not
       insertAdjacentHTML — the exact same choice as inbox-project-
       fence.js, for the same reason. */
    if (users.length <= 1) { host.innerHTML = host.innerHTML + honestLineHTML(); return; }
    var items = computeUnassigned(users);
    if (!items.length) return;   /* صفر محسوب فعلاً — لا بطاقة، بنفس قاعدة العلَم في الملف الآخر */
    host.innerHTML = host.innerHTML + cardHTML(items);
  }

  function install() {
    if (!global.ApprovalsPage || !global.Auth || !global.Schema || !global.Store || ApprovalsPage.__unassignedRoutingInstalled) return;
    ApprovalsPage.__unassignedRoutingInstalled = true;
    var origRender = ApprovalsPage.render;
    ApprovalsPage.render = function (host) {
      origRender.apply(ApprovalsPage, arguments);
      renderCard(host);
    };
    console.info('unassigned-routing.js ready — admin-only report of documents with no reachable approver.');
  }

  if (global.ApprovalsPage) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
