/* Basic fail-closed frame guard for static hosts that cannot set response
   headers — plus the fix for the login screen flashing on every refresh.

   ─────────────────────────────────────────────────────────────────────────
   WHY THE LOGIN SCREEN FLASHED
   ─────────────────────────────────────────────────────────────────────────
   index.html contains the login screen as ordinary visible HTML, so the
   browser paints it the instant the page arrives. Only afterwards does
   app.js call Auth.restore(), which has to ask Supabase whether the saved
   session is still valid. That round trip takes one to two seconds, and
   during it the already-painted login form sits there in full view before
   being replaced by the dashboard.

   Nothing was broken. You were simply watching the page wait for an answer.

   This file now hides the login form until the answer arrives, and shows a
   quiet "checking your session" panel instead. The moment either the
   dashboard or the real login form is ready, the cover is removed.

   ─────────────────────────────────────────────────────────────────────────
   لماذا كانت شاشة الدخول تظهر ثم تختفي

   صفحة index.html تحتوي على نموذج الدخول كعنصر ظاهر، فيرسمه المتصفح فوراً.
   بعد ذلك فقط يسأل الموقع Supabase إن كانت جلستك ما زالت صالحة، وهذا يستغرق
   ثانية أو اثنتين تظهر خلالها شاشة الدخول ثم تُستبدل بلوحة التحكم.

   لم يكن هناك عطل. كنت ترى الصفحة وهي تنتظر الرد.
   هذا الملف يخفي النموذج حتى يصل الرد، ويعرض بدلاً منه لوحة «جارٍ التحقق».
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ---------- 1 · the original frame guard, unchanged ---------- */
  if (window.self !== window.top) {
    try { window.top.location = window.self.location; } catch (e) {}
    /* If the top page blocks navigation, frame-pending keeps the portal hidden. */
    return;
  }
  document.documentElement.classList.remove('frame-pending');

  /* ---------- 2 · no-flash boot cover ---------- */

  /* If there is no saved session there is nothing to wait for, so show the
     login form immediately and skip the cover entirely. The Supabase client
     stores its session under a key beginning with "sb-". */
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

  if (!hasSession) return;   /* first-time visitor: no cover, no delay */

  var STYLE_ID = 'azBootCoverStyle';
  var COVER_ID = 'azBootCover';
  var MAX_WAIT = 8000;       /* never trap the user behind the cover */

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      'html.az-booting #loginScreen{visibility:hidden !important}' +
      '#' + COVER_ID + '{position:fixed;inset:0;z-index:9999;display:flex;' +
      'align-items:center;justify-content:center;flex-direction:column;gap:18px;' +
      'background:#0000A3;color:#fff;font-family:Tahoma,Arial,sans-serif}' +
      '#' + COVER_ID + ' .azb-mark{width:60px;height:60px;opacity:.95;' +
      'animation:azbPulse 1.4s ease-in-out infinite}' +
      '#' + COVER_ID + ' .azb-txt{font-size:14px;opacity:.85;letter-spacing:.3px}' +
      '@keyframes azbPulse{0%,100%{opacity:.45;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}';
    (document.head || document.documentElement).appendChild(s);
  }

  function addCover() {
    if (document.getElementById(COVER_ID)) return;
    var d = document.createElement('div');
    d.id = COVER_ID;
    d.setAttribute('role', 'status');
    d.setAttribute('aria-live', 'polite');
    d.innerHTML =
      '<svg class="azb-mark" viewBox="0 0 19.24 19.30" aria-hidden="true">' +
      '<g fill="#FFFFFF" fill-rule="evenodd">' +
      '<path d="M 12.754 6.145L 13.473 4.895L 15.262 1.797L 16.301 0L 12.766 0L 12.598 0.289L 11.75 1.762L 9.219 6.145ZM 12.754 6.145"/>' +
      '<path d="M 17.562 16.242L 13.191 16.242L 13.645 15.461L 15.43 12.359L 15.414 12.324L 12 12.324L 9.656 16.242L 7.891 19.301L 19.242 19.301ZM 17.562 16.242"/>' +
      '<path d="M 16.363 10.168L 14.688 7.109L 5.148 7.109L 5.707 6.145L 9.254 0L 5.723 0L 0 9.91L 1.723 13.047L 3.383 10.168L 6.898 10.168L 3.43 16.164L 5.152 19.301L 10.43 10.168ZM 16.363 10.168"/>' +
      '</g></svg>' +
      '<div class="azb-txt">جارٍ التحقق من الجلسة… · Checking your session…</div>';
    (document.body || document.documentElement).appendChild(d);
  }

  function reveal() {
    document.documentElement.classList.remove('az-booting');
    var c = document.getElementById(COVER_ID);
    if (c) c.remove();
  }

  document.documentElement.classList.add('az-booting');
  addStyle();

  function begin() {
    addCover();

    var shell = document.getElementById('appShell');
    var login = document.getElementById('loginScreen');
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      if (obs) obs.disconnect();
      reveal();
    }

    /* Already decided before we even got here. */
    if (shell && !shell.hasAttribute('hidden')) { finish(); return; }

    /* Watch for app.js revealing the dashboard, or for the login form
       gaining an error message, which means the session was rejected. */
    var obs = new MutationObserver(function () {
      if (shell && !shell.hasAttribute('hidden')) return finish();
      var err = document.getElementById('loginError');
      if (err && !err.hasAttribute('hidden')) return finish();
    });
    if (shell) obs.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
    var err0 = document.getElementById('loginError');
    if (err0) obs.observe(err0, { attributes: true, attributeFilter: ['hidden'] });

    /* Safety net: whatever happens, never hold the screen longer than this. */
    setTimeout(finish, MAX_WAIT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin);
  } else { begin(); }
})();
