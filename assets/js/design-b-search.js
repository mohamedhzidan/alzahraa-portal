/* =========================================================================
   design-b-search.js — البحث القائم يجد المستند برقمه أيضاً
                        The existing search also finds a document by its number
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ لماذا ══════════════════════════════════════════════════════════════
   المعاينة المعتمدة «ب» وعدت بـ«صندوق بحث واحد يجد أي شاشة أو أي مستند
   برقمه» (COMPARISON-ENGLISH.md، الجدول، البند ١). لوحة الأوامر في الموقع
   (app.js:449-470) تبحث في أسماء الشاشات وأوامر «جديد» فقط — قِيس بقراءة
   الشيفرة ثم بالتشغيل. فكان في «ب» سطرٌ يقول «أو اكتب رقم مستند» وهو وعدٌ
   كاذب، فأُزيل، وهذا الملف يجعل الوعد صادقاً.

   The approved preview promised "one search box that finds any screen OR
   ANY DOCUMENT BY NUMBER" (COMPARISON-ENGLISH.md, table, row 1). The portal's
   palette (app.js:449-470) searches screen names and «new» commands only —
   measured by reading, then by running. Design B carried a line saying «or
   type a document number», a false promise; it was removed, and this file
   makes the promise true.

   ══ لا بحث ثانٍ، ولا نافذة ثانية ═══════════════════════════════════════
   نضيف نتائج المستندات **تحت** نتائج الموقع في لوحته نفسها (#paletteResults).
   لا صندوق جديد ولا اختصار جديد: Ctrl+K نفسه، والكتابة نفسها.
   Document results are appended BELOW the portal's own results in its own
   palette (#paletteResults). No second box, no new shortcut.

   ══ 🔴 لا يرى أحدٌ هنا ما لا يراه في السجلّ ═══════════════════════════
   المستندات من Store.all نفسها التي يعرضها السجلّ، مصفّاةً بـ Auth.canSee
   وAuth.scopeRows — السياجان نفسهما (entity.js:22 و:157). فما لا يظهر لك في
   سجلّه لا يظهر لك هنا. ويُفتح المستند بـ EntityPage.openDetail، الباب نفسه.
   Records come from the same Store.all the register shows, filtered by
   Auth.canSee and Auth.scopeRows — the SAME two fences (entity.js:22, :157).
   What you cannot see in its register, you cannot find here. Opening goes
   through EntityPage.openDetail — the same door.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-search.js needs design-b-kit.js first'); return; }
  var T = AZB.t;
  var MAX = 8;

  function norm(s) {
    /* الأرقام العربية-الهندية تُقرأ أرقاماً غربية — «٠٠١٠» تجد «0010»
       Arabic-Indic digits read as Western digits — «٠٠١٠» finds «0010» */
    return String(s || '').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }).toLowerCase().trim();
  }

  function findDocs(q) {
    var out = [];
    if (!global.Schema || !global.Store || !global.Auth) return out;
    (Schema.MODULES || []).forEach(function (m) {
      if (out.length >= MAX) return;
      if (!Auth.canSee(m.id)) return;                                   /* السياج الأوّل — the first fence */
      var rows;
      try { rows = Auth.scopeRows(m.id, Store.all(m.table) || []); } catch (e) { return; }   /* السياج الثاني */
      for (var i = 0; i < rows.length && out.length < MAX; i++) {
        var r = rows[i];
        if (r && r.docNo && norm(r.docNo).indexOf(q) !== -1) out.push({ mod: m, rec: r });
      }
    });
    return out;
  }

  function render() {
    if (!AZB.isOn()) return;
    var inp = document.getElementById('paletteInput');
    var host = document.getElementById('paletteResults');
    if (!inp || !host) return;
    var old = host.querySelector('.azb-docres');
    if (old) old.parentNode.removeChild(old);
    var q = norm(inp.value);
    /* رقم مستند = فيه رقم واحد على الأقل، وثلاثة محارف أو أكثر
       A document number = at least one digit and three or more characters */
    if (q.length < 3 || !/\d/.test(q)) return;
    var docs = findDocs(q);
    var box = document.createElement('div');
    box.className = 'azb-docres';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', T({ ar: 'مستندات برقمٍ يطابق', en: 'Documents with a matching number' }));
    if (!docs.length) {
      box.innerHTML = '<div class="palette-item muted azb-docnone">' + AZB.esc(T({ ar: 'لا مستند برقمٍ يطابق «' + inp.value.trim() + '» ضمن ما يحقّ لك رؤيته', en: 'No document number matching «' + inp.value.trim() + '» among what you may see' })) + '</div>';
    } else {
      box.innerHTML = '<div class="azb-dochead">' + AZB.esc(T({ ar: 'مستندات برقمٍ يطابق', en: 'Documents with a matching number' })) + '</div>' +
        docs.map(function (d, i) {
          return '<button type="button" class="palette-item azb-doc" data-i="' + i + '">' + AZB.icon('file') +
            '<span class="azb-ltr">' + AZB.esc(d.rec.docNo) + '</span><small>' + AZB.esc(T(d.mod.label)) + '</small></button>';
        }).join('');
      [].forEach.call(box.querySelectorAll('.azb-doc'), function (b) {
        b.addEventListener('click', function () { open(docs[Number(b.getAttribute('data-i'))]); });
      });
    }
    host.appendChild(box);
  }

  function open(d) {
    if (!d) return;
    var ph = document.getElementById('paletteHost');
    if (ph) ph.hidden = true;                                      /* كما يفعل closePalette في app.js */
    if (global.App && App.go) App.go(d.mod.id);
    setTimeout(function () { if (global.EntityPage && EntityPage.openDetail) EntityPage.openDetail(d.mod.id, d.rec.id); }, 150);
  }

  function install() {
    var inp = document.getElementById('paletteInput');
    if (!inp || inp.__azbDocs) return !!inp;
    inp.__azbDocs = true;
    /* يُسجَّل بعد مستمع app.js (app.js:331) فيعمل بعد أن يرسم الموقع نتائجه
       Registered after app.js's listener, so it runs after the portal draws. */
    inp.addEventListener('input', render);
    /* لوحة المفاتيح: إن لم تجد الشاشات شيئاً، فـ Enter يفتح أوّل مستند، والسهم
       لأسفل ينقل التركيز إليه. وإلّا فالمفاتيح للموقع كما هي.
       Keyboard: when no SCREEN matched, Enter opens the first document and
       ArrowDown moves focus to it. Otherwise the keys stay the portal's. */
    inp.addEventListener('keydown', function (e) {
      if (!AZB.isOn()) return;
      var host = document.getElementById('paletteResults');
      var screens = host ? host.querySelectorAll('.palette-item:not(.muted):not(.azb-doc)').length : 0;
      var first = host ? host.querySelector('.azb-doc') : null;
      if (screens || !first) return;
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); first.click(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); first.focus(); }
    }, true);
    return true;
  }

  if (!install()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.AZBSearch = { findDocs: findDocs, render: render, norm: norm };
})(window);
