/* Fixed-order production loader plus a deployment self-check.
   Recovery branch: use the partial-load/server-confirmed Store and keep
   local drafts in a separate encrypted database. */
(function () {
  'use strict';
  var FILES = [
    'assets/js/env.js',
    'assets/js/config.js',
    'assets/js/offline-db.js',
    'assets/js/draft-db.js',
    'assets/js/i18n.js',
    'assets/js/store-recovery.js',
    'assets/js/schema.js',
    'assets/js/departments.js',
    'assets/js/auth.js',
    'assets/js/identity.js',
    'assets/js/workflow.js',
    'assets/js/ui.js',
    'assets/js/rules.js',
    'assets/js/print.js',
    'assets/js/alerts.js',
    'assets/js/roleview.js',
    /* Professional assistant stack. The AI source will be audited separately
       before any server-side model key is enabled. */
    'assets/js/knowledge.js',
    'assets/js/inspector.js',
    'assets/js/inspector-departments.js',
    'assets/js/assistant.js',
    'assets/js/assistant-pro.js',
    'assets/js/agents.js',
    'assets/js/pages/dashboard.js',
    'assets/js/pages/dashboard-render.js',
    'assets/js/pages/entity.js',
    'assets/js/page-availability.js',
    'assets/js/form-save-recovery.js',
    /* Keep the mature XLSX/CSV parser, but replace its row-by-row commit with
       a single server-confirmed statement. */
    'assets/js/import.js',
    'assets/js/import-transaction-recovery.js',
    'assets/js/pages/approvals.js',
    'assets/js/pages/reports.js',
    'assets/js/pages/settings.js',
    'assets/js/app.js'
  ];
  var NEEDED = [
    ['ALZAHRAA_CONFIG','assets/js/config.js'],
    ['OfflineDB','assets/js/offline-db.js'],
    ['DraftDB','assets/js/draft-db.js'],
    ['I18N','assets/js/i18n.js'],
    ['Store','assets/js/store-recovery.js'],
    ['Schema','assets/js/schema.js'],
    ['Auth','assets/js/auth.js'],
    ['Workflow','assets/js/workflow.js'],
    ['UI','assets/js/ui.js'],
    ['Dashboard','assets/js/pages/dashboard.js'],
    ['EntityPage','assets/js/pages/entity.js'],
    ['DataImport','assets/js/import.js'],
    ['AtomicImportRecovery','assets/js/import-transaction-recovery.js'],
    ['ApprovalsPage','assets/js/pages/approvals.js'],
    ['ReportsPage','assets/js/pages/reports.js'],
    ['SettingsPage','assets/js/pages/settings.js'],
    ['App','assets/js/app.js']
  ];

  window.AZ_LOAD_FAILED = [];

  function loadOne(path, done) {
    var script = document.createElement('script');
    script.src = path;
    script.async = false;
    script.onload = function () { done(); };
    script.onerror = function () { window.AZ_LOAD_FAILED.push(path); done(); };
    document.head.appendChild(script);
  }

  function showMissing() {
    var missing = window.AZ_LOAD_FAILED.slice();
    for (var i = 0; i < NEEDED.length; i++) {
      if (!window[NEEDED[i][0]] && missing.indexOf(NEEDED[i][1]) === -1) missing.push(NEEDED[i][1]);
    }
    if (window.Schema && !window.Schema.DEPARTMENT_MODULES &&
        missing.indexOf('assets/js/departments.js') === -1) {
      missing.push('assets/js/departments.js');
    }
    try {
      var probe = getComputedStyle(document.documentElement).getPropertyValue('--green-800');
      if (!probe || !probe.trim()) missing.push('assets/css/styles.css');
    } catch (e) { missing.push('assets/css/styles.css'); }
    if (!missing.length) return;

    var card = document.querySelector('.login-card') || document.body;
    card.setAttribute('style', 'background:#fff;color:#12211c;max-width:640px;margin:40px auto;padding:28px;border-radius:14px;font-family:Tahoma,Arial,sans-serif;line-height:1.9;box-shadow:0 10px 40px rgba(0,0,0,.3);position:relative;z-index:99');
    var items = missing.map(function (path) {
      return '<li style="font-family:monospace;direction:ltr;text-align:left;background:#fdeceb;color:#b42318;padding:4px 8px;border-radius:5px;margin:5px 0;display:block">' + path.replace(/[&<>"']/g, '') + '</li>';
    }).join('');
    card.innerHTML = '<h2 style="color:#b42318;margin:0 0 6px">⚠️ الموقع ناقص ملفات · Missing files</h2>' +
      '<p>أعد رفع المجلدات مع الحفاظ على ترتيبها، ثم حدّث الصفحة. Re-upload the folders without flattening them, then hard-refresh.</p>' +
      '<ul style="padding:0;margin:0;list-style:none">' + items + '</ul>';
  }

  var index = 0;
  (function next() {
    if (index >= FILES.length) {
      window.AZ_LOAD_DONE = true;
      setTimeout(showMissing, 80);
      return;
    }
    loadOne(FILES[index++], next);
  })();
})();
