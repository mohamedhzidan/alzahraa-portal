/* =========================================================================
   design-b-register.js — السجلّ: «الكل» افتراضياً، ورقاقة «ينتظرني»، وسطر
                          يقول ما الذي يعنيه «الكل»، وبطاقات على الهاتف
   THE REGISTER: «All» by default, a «Waiting for me» chip, one line saying
   what «All» means, and cards on a phone
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ لماذا رقاقةٌ داخل صفّ الموقع، لا صفٌّ جديد ═══════════════════════════
   الموقع **يملك** صفّ رقائق حالة (`.chip-row`، entity.js:52-61). بناء صفٍّ
   ثانٍ كان سيضع تصفيتين متنافستين فوق جدول واحد — وهو ما يمنعه التكليف.
   The portal ALREADY has a status chip row (`.chip-row`, entity.js:52-61).
   A second row would put two competing filters over one table — exactly
   what the brief forbids. So ONE chip, inside the portal's own row.

   ══ قرار محمد زيدان، ١٠ سبتمبر — (٢) ═════════════════════════════════════
   الافتراضي «الكل»: كل ما يحقّ للموظّف رؤيته، مع رقاقة واضحة التسمية
   «ينتظرني». و«الكل» لا يعني أبداً كل ما في الشركة. لذلك يُضاف سطرٌ واحد
   فوق الجدول يقول ذلك صراحةً، ويسمّي النطاق الذي يطبّقه السياج نفسه.
   DEFAULT «All»: everything this employee is allowed to see, with a clearly
   labelled «Waiting for me» chip. «All» never means the whole company — so
   one line above the table says so outright and names the scope the fence
   itself applies.

   ══ ثلاثة قيود ═════════════════════════════════════════════════════════
   ١ · لا يُفعَّل «ينتظرني» افتراضياً. ٢ · مصدره Workflow.inbox() نفسها، فلا
   يختلف عن الشارة ولا عن طابور الصفحة الأولى. ٣ · حين يُخفي صفوفاً يقول كم.
   1) «Waiting for me» is never on by default. 2) Its source is
   Workflow.inbox() itself, so it cannot disagree with the badge or the home
   queue. 3) When it hides rows it SAYS how many and offers «show all».
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-register.js needs design-b-kit.js first'); return; }
  if (!global.EntityPage || typeof EntityPage.render !== 'function') {
    console.error('design-b-register.js: EntityPage.render not found — load order is wrong');
    return;
  }
  var T = AZB.t;

  /* المستندات التي تنتظر هذا المستخدم في هذه الشاشة. null = «لا نعرف»،
     وليس مجموعة فارغة تُقرأ صمتاً على أنها «لا شيء».
     The documents waiting for this user on this screen. null = "we do not
     know", never an empty set that silently reads as "none". */
  function myMoveIds(moduleId) {
    try {
      var box = global.Workflow && Workflow.inbox ? Workflow.inbox() : null;
      if (!box) return null;
      var set = {}, n = 0;
      ['toApprove', 'toReview'].forEach(function (k) {
        (box[k] || []).forEach(function (e) {
          if (e && e.module && e.module.id === moduleId && e.record) { set[e.record.id] = true; n++; }
        });
      });
      return { set: set, n: n };
    } catch (e) { return null; }
  }

  /* صفّ الرقائق الذي يحمل حالات دورة الاعتماد فعلاً — وليس صفّ المواقع.
     (Workflow.STATES مصفوفة لا كائن — فخّ قِيس في النسخة الأولى.)
     The chip row that genuinely carries workflow statuses — not the sites
     row. (Workflow.STATES is an ARRAY, not an object — a measured trap.) */
  function statusChipRow(host) {
    var rows = [].slice.call(host.querySelectorAll('.chip-row'));
    if (!rows.length) return null;
    var states = [];
    try {
      var S = (global.Workflow && Workflow.STATES) || [];
      var keys = Array.isArray(S) ? S : Object.keys(S);
      keys.forEach(function (k) {
        var lbl = Workflow.label ? Workflow.label(k) : null;
        if (lbl) states.push(String(lbl).trim());
      });
    } catch (e) {}
    if (!states.length) return null;
    for (var i = 0; i < rows.length; i++) {
      var texts = [].slice.call(rows[i].querySelectorAll('.filter-chip'))
        .map(function (c) { return (c.textContent || '').trim(); });
      if (texts.filter(function (t) { return states.indexOf(t) !== -1; }).length >= 2) return rows[i];
    }
    return null;
  }

  /* ── سطر النطاق: ما الذي يعنيه «الكل» هنا ─────────────────────────────
     THE SCOPE LINE: what «All» means here. It names the SAME fences the
     register applies — site (sites.js) and projects (auth.js:1008-1023) —
     and says plainly when a project fence leaves this person nothing. */
  function scopeLine(moduleId, host) {
    if (host.querySelector('.azb-regscope')) return;
    var mod = null; try { mod = Schema.get(moduleId); } catch (e) {}
    if (!mod) return;
    var hasProject = (mod.fields || []).some(function (f) { return f.name === 'project'; });
    var u = null; try { u = Auth.current(); } catch (e) {}
    var allSites = false; try { allSites = !!(Auth.seesAllSites && Auth.seesAllSites()); } catch (e) {}
    var siteTxt = '', noSite = false;
    try {
      var sid = Auth.site && Auth.site();
      var s = (Store.all('sites') || []).filter(function (x) { return x.id === sid; })[0];
      siteTxt = allSites ? T({ ar: 'كل المواقع', en: 'all sites' }) : ((s && s.name) || sid || T({ ar: 'غير محدَّد', en: 'not set' }));
      noSite = !sid && !(u && u.allSites === true);
    } catch (e) { siteTxt = allSites ? T({ ar: 'كل المواقع', en: 'all sites' }) : ''; }
    var projTxt = '', warns = [];
    if (hasProject) {
      var allP = false; try { allP = !!(Auth.hasAllProjects && Auth.hasAllProjects()); } catch (e) {}
      var n = (u && u.projects || []).length;
      projTxt = allP ? T({ ar: 'كل المشروعات', en: 'all projects' })
              : n ? T({ ar: n + ' مشروع مسند إليك', en: n + ' project(s) assigned to you' })
              : T({ ar: 'لا مشروع مسند إليك', en: 'no project assigned to you' });
      if (!allP && !n) warns.push(T({ ar: 'لذلك لا تظهر لك مستندات أي مشروع في هذا السجلّ — القائمة القصيرة هنا ليست كل ما في الشركة.',
                                      en: 'So no project\'s documents appear to you in this register — a short list here is not everything in the company.' }));
    }
    /* (DESIGN-B-3) حسابٌ بلا موقع: sites.js يعرض له كل المواقع عمداً (قِيس) — يُقال كما هو،
       كما في الصفحة الأولى، في سطرٍ خاصّ به فلا يُقرأ سبباً لسطر المشروعات.
       (DESIGN-B-3) An account with no site: sites.js shows it every site on purpose
       (measured) — said as it is, as on the home, on its OWN line so it is never read
       as the reason for the projects line. */
    if (noSite) warns.push(T({ ar: 'حسابك غير مربوط بموقع — لذلك تعرض لك هذه القائمة بيانات كل المواقع. أبلغ مسؤول النظام ليربطه بموقعك.',
                               en: 'Your account is not linked to a site — so this list shows you every site\'s data. Ask the system administrator to link it to your site.' }));
    var line = document.createElement('div');
    line.className = 'azb-regscope';
    line.setAttribute('role', 'note');
    line.innerHTML = AZB.icon('info') + '<span>' +
      '<b>' + AZB.esc(T({ ar: '«الكل» هنا = كل ما يحقّ لك رؤيته', en: '«All» here = everything you are allowed to see' })) + '</b> — ' +
      AZB.esc(T({ ar: 'الموقع: ', en: 'site: ' })) + '<b>' + AZB.esc(siteTxt) + '</b>' +
      (projTxt ? ' · ' + AZB.esc(T({ ar: 'المشروعات: ', en: 'projects: ' })) + '<b>' + AZB.esc(projTxt) + '</b>' : '') +
      warns.map(function (w) { return '<br><span class="azb-regscope-warn">' + AZB.icon('lock') + AZB.esc(w) + '</span>'; }).join('') +
      '</span>';
    var card = host.querySelector('.card');
    if (card && card.parentNode) card.parentNode.insertBefore(line, card);
  }

  /* ── الهاتف: كل صفّ بطاقة — بالعناصر نفسها ────────────────────────────
     PHONE: every row a card — using the SAME elements. Each cell is given
     its column heading as data-azb-label, and the CSS below 640px lays the
     row out as a card. The row, its click handler, its buttons and its
     data-id are untouched: the table is restyled, never rebuilt. */
  function labelCells(host) {
    var table = host.querySelector('.table-wrap .data-table');
    if (!table || table.classList.contains('azb-cards')) return;
    var heads = [].slice.call(table.querySelectorAll('thead th')).map(function (th) {
      var c = th.cloneNode(true);
      [].forEach.call(c.querySelectorAll('.sort-ind'), function (s) { s.parentNode.removeChild(s); });
      return (c.textContent || '').trim();
    });
    [].forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      [].forEach.call(tr.children, function (td, i) {
        if (heads[i] && !td.classList.contains('col-actions')) td.setAttribute('data-azb-label', heads[i]);
      });
    });
    table.classList.add('azb-cards');
  }

  function build(moduleId, host) {
    scopeLine(moduleId, host);
    labelCells(host);

    var chipRow = statusChipRow(host);
    if (!chipRow || chipRow.querySelector('.azb-mine-chip')) return;
    var rows = [].slice.call(host.querySelectorAll('tr[data-id]'));
    if (!rows.length) return;
    var mine = myMoveIds(moduleId);
    if (!mine || !mine.n) return;               /* لا شيء ينتظره هنا — لا رقاقة كاذبة */

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip azb-mine-chip';
    chip.setAttribute('data-azb', 'mine');
    chip.setAttribute('aria-pressed', 'false');
    chip.title = T({ ar: 'المستندات التي تنتظر اعتمادك أو مراجعتك', en: 'Documents waiting for your approval or review' });
    chip.innerHTML = AZB.icon('send') + ' ' + AZB.esc(T({ ar: 'ينتظرني', en: 'Waiting for me' })) + ' <b>' + mine.n + '</b>';
    chipRow.appendChild(chip);

    var note = document.createElement('div');
    note.className = 'azb-scope';
    note.setAttribute('role', 'status');
    note.hidden = true;
    var wrap = host.querySelector('.table-wrap');
    if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(note, wrap);

    function clear() {
      rows.forEach(function (tr) { tr.hidden = false; tr.removeAttribute('data-azb-hidden'); });
      chip.classList.remove('active');
      chip.setAttribute('aria-pressed', 'false');
      note.hidden = true;
    }

    chip.addEventListener('click', function () {
      if (chip.classList.contains('active')) { clear(); return; }
      [].forEach.call(chipRow.querySelectorAll('.filter-chip'), function (c) { if (c !== chip) c.classList.remove('active'); });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      var shown = 0;
      rows.forEach(function (tr) {
        var keep = !!mine.set[tr.getAttribute('data-id')];
        tr.hidden = !keep;
        if (keep) tr.removeAttribute('data-azb-hidden'); else tr.setAttribute('data-azb-hidden', '1');
        if (keep) shown++;
      });
      /* 🔴 الصفحة الواحدة من السجلّ ١٥ صفّاً (entity.js:12)؛ فالعدد هنا لما في
            هذه الصفحة، ويُقال ذلك — لا نَعِد بأكثر ممّا نعدّ.
         🔴 One register page holds 15 rows (entity.js:12); the count here is
            for THIS page, and says so — never promising more than was counted. */
      var hiddenCount = rows.length - shown;
      note.hidden = false;
      note.innerHTML = AZB.icon('info') + '<span class="azb-scope-v">' + AZB.esc(T({
        ar: 'تعرض ' + shown + ' من ' + rows.length + ' في هذه الصفحة — ' + hiddenCount + ' مخفيّة بهذا العرض، وليست محذوفة. (ينتظرك في هذه الشاشة كلها: ' + mine.n + ')',
        en: 'Showing ' + shown + ' of ' + rows.length + ' on this page — ' + hiddenCount + ' hidden by this view, not deleted. (Waiting for you on this whole screen: ' + mine.n + ')' })) +
        '</span><span style="flex:1"></span>' +
        '<button type="button" class="btn azb-showall">' + AZB.esc(T({ ar: 'اعرض كل السجل', en: 'Show the whole register' })) + '</button>';
      var sa = note.querySelector('.azb-showall');
      if (sa) sa.addEventListener('click', function () { clear(); chip.focus(); });
    });

    [].forEach.call(chipRow.querySelectorAll('.filter-chip'), function (c) {
      if (c === chip) return;
      c.addEventListener('click', function () { clear(); });
    });
  }

  /* يُسجَّل في خطّاف السجلّ الواحد (design-b-kit.js) فيعمل بعد **كل** رسم —
     لا بعد الرسم الأوّل وحده. قِيس: اللفّ الخاصّ كان يضيع بأوّل نقرة رقاقة.
     Registered on the ONE register hook (design-b-kit.js), so it runs after
     EVERY draw — not only the first. Measured: a private wrap was lost on
     the first chip press. */
  AZB.onRegister(build);

  global.AZBRegister = { build: build, scopeLine: scopeLine, labelCells: labelCells };
})(window);
