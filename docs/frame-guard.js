/* Basic fail-closed frame guard for static hosts that cannot set response headers. */
(function () {
  'use strict';
  if (window.self === window.top) {
    document.documentElement.classList.remove('frame-pending');
    return;
  }
  try { window.top.location = window.self.location; } catch (e) {}
  /* If the top page blocks navigation, frame-pending keeps the portal hidden. */
})();
