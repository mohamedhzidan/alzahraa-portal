/* Frame guard + silent no-flash boot.
   ─────────────────────────────────────────────────────────────────────────
   NO LOADING SCREEN. You asked for a normal refresh, so there is no panel,
   no logo and no message. The login form is simply held invisible for the
   moment the browser spends asking Supabase whether your session is still
   valid, then whichever screen is correct appears. Nothing flashes and
   nothing is added.

   لا توجد شاشة تحميل. عند التحديث تُخفى شاشة الدخول فقط للحظة التي يسأل
   فيها الموقع عن صلاحية جلستك، ثم تظهر الشاشة الصحيحة مباشرة.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (window.self !== window.top) {
    try { window.top.location = window.self.location; } catch (e) {}
    return;
  }
  document.documentElement.classList.remove('frame-pending');

  /* No saved session means nothing to wait for: show the login form at once. */
  var hasSession = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) {
        var v = localStorage.getItem(k);
        if (v && v.length > 20) { hasSession = true; break; }
      }
    }
  } catch (e) { hasSession = false; }
  if (!hasSession) return;

  var MAX_WAIT = 6000;
  var s = document.createElement('style');
  s.id = 'azNoFlash';
  s.textContent = 'html.az-booting #loginScreen{visibility:hidden !important}';
  (document.head || document.documentElement).appendChild(s);
  document.documentElement.classList.add('az-booting');

  function reveal() {
    document.documentElement.classList.remove('az-booting');
    var st = document.getElementById('azNoFlash');
    if (st) st.remove();
  }

  function begin() {
    var shell = document.getElementById('appShell');
    var done = false;
    function finish() { if (done) return; done = true; if (obs) obs.disconnect(); reveal(); }
    if (shell && !shell.hasAttribute('hidden')) { finish(); return; }

    var obs = new MutationObserver(function () {
      if (shell && !shell.hasAttribute('hidden')) return finish();
      var err = document.getElementById('loginError');
      if (err && !err.hasAttribute('hidden')) return finish();
    });
    if (shell) obs.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
    var e0 = document.getElementById('loginError');
    if (e0) obs.observe(e0, { attributes: true, attributeFilter: ['hidden'] });
    setTimeout(finish, MAX_WAIT);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin);
  else begin();
})();
