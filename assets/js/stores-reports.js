/* =========================================================================
   stores-reports.js — تقارير المخازن الثلاثة التي طلبها بالاسم
   stores-reports.js — the three stores reports he asked for by name

   ── من طلبها، وبكلماته ──────────────────────────────────────────────────
   أ. أحمد السيد سليمان محمد — محاسب بإدارة المخازن — في «ملاحظات إضافية»
   من كتيّب ١ سبتمبر ٢٠٢٦، كتب الأعمدة بخطّ يده:

     «أن يكون متاحاً بالبرنامج عمل تقرير مفصّل سواء بالصرف أو المشتريات:
      ١) تقرير مشتريات وارد ويحتوي على: التاريخ · اسم الصنف · الكمية ·
         تكلفة الوحدة · القيمة
      ٢) تقرير المنصرف من المخزن ويحتوي على: التاريخ · اسم الصنف ·
         الكمية · القيمة · اسم مركز التكلفة
      ٣) تقرير بالمحوّل من مخزن إلى مخزن آخر»

   **الأعمدة هنا هي أعمدته حرفياً وبترتيبه.** لم يُضَف عمود لم يطلبه ولم
   يُحذف عمود طلبه. التقرير الثالث لم يسمِّ أعمدته، فأخذ نفس شكل الأول مع
   «من مخزن» و«إلى مخزن» — وهما جوهر التحويل.

   ⚠️ **التقرير الرابع (المصروف على كل معدة) ليس هنا** — يحتاج حقل رقم
   المعدة على المشتريات والصرف، وهو عمل الجلسة الرابعة.

   ── 🔴 لماذا زرّ في قائمته الجانبية وليس تبويباً في «التقارير» ──────────
   هذا هو الفخّ الذي وقع فيه هذا المشروع من قبل، والقاعدة ١٩ مكتوبة بسببه:
   **ابنِ حيث يذهب فعلاً.**
   قِسْتُ الأمر ولم أفترضه: شغّلتُ `ReportsPage.allowed()` لكل تقرير من
   الخمسة على دور `storekeeper` وعلى دور `accountant` — **النتيجة صفر
   تقارير مسموحة لكليهما.** وreport-access.js يحذف زرّ «التقارير» من
   القائمة لمن لا تقرير له. فتبويبٌ داخل «التقارير» كان سيكون **غير مرئي
   تماماً** للرجل الذي طلبه. نفس ما اكتشفه doc-delay-register.js لأ. أحمد
   عبد الحي، ونفس علاجه.

   ── 🔴 وكيف نجد مجموعته في القائمة بلا الاعتماد على نصّ عربي ────────────
   app.js:168-202 يبني المجموعات بـ`class="nav-group"` **بلا** أي سمة
   تعرّفها — والعنوان نصّ عربي، والنصّ ليس عقداً في هذا المشروع.
   فنبحث عن المجموعة التي **تحتوي زرّ شاشة إذون الصرف**
   (`[data-route="stockIssues"]`) — مرساة بنيوية لا لفظية. ولو لم يكن
   للمستخدم شاشات مخازن أصلاً فلا مرساة، ولا زرّ — وهذا هو الصواب.

   ── 🔴 الصدق في الأرقام: المعتمَد وحده يتحرّك ───────────────────────────
   حركة المخزن الحقيقية هي المستندات **المعتمَدة** (pages/dashboard.js:22:
   approved أو reversed). لكن يوم الإطلاق لا شيء معتمد بعد، فلو رشّحنا
   بصمت لرأى ثلاثة تقارير فارغة وظنّها معطّلة.
   فالتقرير يعرض المعتمَد، **ويطبع تحته عدد المستندات المستبعَدة لأنها لم
   تُعتمد بعد**. لا صفر صامت، ولا رقم يوحي بأن لا شيء حدث.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The three reports أ. Ahmed asked for by name, with HIS columns, in HIS
   order, nothing added and nothing dropped. The fourth report he wants —
   spend per machine — is NOT here: it needs a vehicle field on purchases
   and issues, which is sitting 4.

   🔴 A SIDE-MENU BUTTON, NOT A REPORTS TAB, and this was measured rather
   than assumed: I ran ReportsPage.allowed() for all five reports against
   both `storekeeper` and `accountant` — ZERO reports allowed for either,
   and report-access.js removes the Reports button from a role with none.
   A tab would have been completely invisible to the man who asked for it.
   The same discovery doc-delay-register.js made, and the same cure.

   🔴 FINDING HIS GROUP WITHOUT RELYING ON ARABIC TEXT: app.js:168-202
   builds groups as `class="nav-group"` with NO identifying attribute, and
   the heading is Arabic text — and text is not a contract in this project.
   So we find the group CONTAINING the stock-issues button
   (`[data-route="stockIssues"]`) — a structural anchor. No stores screens
   means no anchor and no button, which is correct.

   🔴 HONEST NUMBERS: real stock movement is APPROVED documents only
   (dashboard.js:22). On launch day nothing is approved, so a silent filter
   would show three empty reports and he would think they are broken. Each
   report shows approved rows AND prints how many documents were left out
   for not being approved yet.

   حذف هذا الملف يعيد سلوك اليوم حرفياً — لا حقل، لا جدول، لا صلاحية.
   Deleting this file restores today exactly — no field, no table, no
   permission.

   مُثبَت بالتشغيل / proven by running: TESTS/stores-reports-trial.js
   (v2.0.31)
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.EntityPage || typeof EntityPage.render !== 'function') {
    console.error('stores-reports.js needs pages/entity.js first — not installed');
    return;
  }

  var ROUTE = 'storesReports';
  var NAV_LABEL = { ar: 'تقارير المخازن', en: 'Stores reports' };

  /* نفس مجموعة الحالات التي يعتمد عليها الرصيد — dashboard.js:22.
     The same posted set the balance relies on — dashboard.js:22. */
  var POSTED = ['approved', 'reversed'];

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return UI.esc(String(s == null ? '' : s)); }
  function money(v) { try { return I18N.money(Number(v) || 0, false); } catch (e) { return String(v); } }
  function qty(v) { try { return I18N.num(Number(v) || 0, 2); } catch (e) { return String(v); } }

  /* 🔴 لا يُطبع معرّف قاعدة بيانات في ورقة يقرأها إنسان — أمسكته بوابة
     TRACK ENHANCER (G.3): سجلّ يشير إلى بند تكلفة محذوف كان يطبع
     «c_missing» في عمود «اسم مركز التكلفة».
     «c_missing» ليست معلومة — هي تسريب لشكل قاعدة البيانات، وهي نفس عائلة
     «المعرّف الخام» التي طُبعت يوماً على مستند يخرج إلى هيئة الطرق.
     فإن لم يوجد السجلّ نقول ذلك بالعربية ونتوقّف.
     🔴 A database id is never printed on a paper a human reads — caught by
     TRACK ENHANCER's gate (G.3): a record pointing at a deleted cost item
     printed «c_missing» in the cost-centre column. That is not information;
     it is a leak of the database's shape, the same raw-id family that once
     printed onto a document leaving the company. If the record is not
     found we say so in words and stop. */
  function nameOf(table, id) {
    if (!id) return '—';
    try {
      var r = Store.find(table, id);
      if (r && (r.name || r.code)) return String(r.name || r.code);
    } catch (e) {}
    return L({ ar: '(سجل محذوف أو غير متاح)', en: '(deleted or unavailable)' });
  }

  /* ── التعريفات: أعمدته حرفياً ────────────────────────────────────────
     ── The definitions: HIS columns, verbatim ── */
  var REPORTS = [
    {
      id: 'purchasesIn',
      table: 'goodsReceipts',
      title: { ar: 'تقرير مشتريات وارد', en: 'Goods received' },
      cols: [
        { ar: 'التاريخ',        en: 'Date' },
        { ar: 'اسم الصنف',      en: 'Item' },
        { ar: 'الكمية',         en: 'Quantity' },
        { ar: 'تكلفة الوحدة',   en: 'Unit cost' },
        { ar: 'القيمة',         en: 'Value' }
      ],
      /* موضع عمود القيمة — رقم صريح، لا بحث عن كلمة «القيمة».
         Index of the value column — an explicit number, never a search for
         the word «القيمة»: keying on a heading's text is how a check
         silently stops matching the day someone rewords a heading. */
      valueCol: 4,
      row: function (d, l) {
        var q = Number(l.qtyAccepted) || 0;
        var p = Number(l.price) || 0;
        return {
          cells: [esc(d.date), esc(nameOf('items', l.item)), qty(q), money(p),
                  money(l.lineTotal !== undefined ? l.lineTotal : q * p)],
          value: Number(l.lineTotal !== undefined ? l.lineTotal : q * p) || 0
        };
      }
    },
    {
      id: 'issuesOut',
      table: 'stockIssues',
      title: { ar: 'تقرير المنصرف من المخزن', en: 'Issued from store' },
      cols: [
        { ar: 'التاريخ',            en: 'Date' },
        { ar: 'اسم الصنف',          en: 'Item' },
        { ar: 'الكمية',             en: 'Quantity' },
        { ar: 'القيمة',             en: 'Value' },
        { ar: 'اسم مركز التكلفة',   en: 'Cost centre' }
      ],
      /* 🔴 هنا كان العطل: القيمة ثالثة، ومركز التكلفة أخيراً. والتذييل كان
         يضع الإجمالي دائماً في العمود الأخير — فكان **مبلغُ المال يُطبع
         تحت عنوان «اسم مركز التكلفة»**، و«القيمة» بلا إجمالي إطلاقاً.
         التقريران الآخران سليمان بالمصادفة وحدها: آخر عمود فيهما هو
         «القيمة». ولهذا مرّت تجربة التقارير ٢٠/٠ ولم ترَ شيئاً.
         🔴 THIS IS WHERE THE FAULT WAS: value is third and the cost centre
         is last, and the footer always put the total in the LAST column —
         so THE MONEY TOTAL PRINTED UNDER «اسم مركز التكلفة» and «القيمة»
         got no total at all. The other two reports were correct only by
         coincidence: their last column IS «القيمة». That is why the
         reports trial passed 20/0 and never saw it. */
      valueCol: 3,
      row: function (d, l) {
        var q = Number(l.qty) || 0;
        var v = Number(l.lineTotal !== undefined ? l.lineTotal : q * (Number(l.price) || 0)) || 0;
        return {
          cells: [esc(d.date), esc(nameOf('items', l.item)), qty(q), money(v),
                  esc(nameOf('costItems', d.costItem))],
          value: v
        };
      }
    },
    {
      id: 'transfers',
      table: 'stockTransfers',
      title: { ar: 'تقرير المحوَّل من مخزن إلى مخزن آخر', en: 'Transferred between stores' },
      /* لم يسمِّ أعمدة هذا التقرير، فأخذ شكل الأول مع طرفَي التحويل —
         وهما المعلومة التي لا معنى للتقرير بدونها.
         He named no columns for this one, so it takes the first report's
         shape plus the two ends of the transfer — without which the
         report means nothing. */
      cols: [
        { ar: 'التاريخ',    en: 'Date' },
        { ar: 'اسم الصنف',  en: 'Item' },
        { ar: 'الكمية',     en: 'Quantity' },
        { ar: 'من مخزن',    en: 'From store' },
        { ar: 'إلى مخزن',   en: 'To store' },
        { ar: 'القيمة',     en: 'Value' }
      ],
      valueCol: 5,
      row: function (d, l) {
        var q = Number(l.qty) || 0;
        var v = Number(l.lineTotal !== undefined ? l.lineTotal : q * (Number(l.price) || 0)) || 0;
        return {
          cells: [esc(d.date), esc(nameOf('items', l.item)), qty(q),
                  esc(nameOf('warehouses', d.fromWarehouse)),
                  esc(nameOf('warehouses', d.toWarehouse)), money(v)],
          value: v
        };
      }
    }
  ];

  /* ── البناء ──────────────────────────────────────────────────────────
     يمرّ على Auth.scopeRows فيرث سياج المواقع بدل أن يعيد كتابته.
     Goes through Auth.scopeRows so the site fence is inherited, never
     re-implemented. */
  function build(def, from, to) {
    var rows = [];
    try { rows = Store.all(def.table) || []; } catch (e) { rows = []; }
    try { rows = Auth.scopeRows(def.table, rows) || []; } catch (e) { /* بلا سياج إضافي */ }

    var out = [], total = 0, unapproved = 0, outOfRange = 0;

    rows.forEach(function (d) {
      if (!d || d.deleted === true) return;
      if (POSTED.indexOf(d.status) === -1) { unapproved++; return; }
      var dt = String(d.date || '');
      if (from && dt && dt < from) { outOfRange++; return; }
      if (to && dt && dt > to) { outOfRange++; return; }
      (d.lines || []).forEach(function (l) {
        if (!l || !l.item) return;
        var r = def.row(d, l);
        out.push(r.cells);
        total += r.value;
      });
    });

    out.sort(function (a, b) { return String(a[0]) < String(b[0]) ? 1 : -1; });
    return { rows: out, total: total, unapproved: unapproved, outOfRange: outOfRange };
  }

  function tableHTML(def, data) {
    var h = '<div class="card" style="margin-block-end:14px">' +
      '<div class="card-head"><h3>' + esc(L(def.title)) + '</h3>' +
      '<button type="button" class="btn btn-outline btn-sm" data-az-csv="' + def.id + '">' +
      esc(L({ ar: 'تصدير', en: 'Export' })) + '</button></div>';

    if (!data.rows.length) {
      h += '<p class="muted" style="padding:10px 12px">' +
        esc(L({
          ar: 'لا توجد حركة معتمدة في هذه الفترة.',
          en: 'No approved movement in this period.'
        })) + '</p>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr>';
      def.cols.forEach(function (c) { h += '<th>' + esc(L(c)) + '</th>'; });
      h += '</tr></thead><tbody>';
      data.rows.forEach(function (r) {
        h += '<tr>';
        r.forEach(function (c) { h += '<td>' + c + '</td>'; });
        h += '</tr>';
      });
      /* الإجمالي يقع تحت عمود القيمة في التقارير الثلاثة، لا تحت آخر عمود.
         الحلّ عامّ لكل التقارير عمداً — لا استثناء لتقرير بعينه، وإلّا عاد
         العطل مع أوّل تقرير رابع.
         The total lands under the VALUE column on all three reports, not
         under the last column. Deliberately general — no special case for
         one report, or the fault returns with the first fourth report. */
      var vc = (typeof def.valueCol === 'number') ? def.valueCol : def.cols.length - 1;
      var nAfter = def.cols.length - vc - 1;
      h += '</tbody><tfoot><tr>';
      if (vc > 0) {
        h += '<td colspan="' + vc + '"><strong>' +
          esc(L({ ar: 'الإجمالي', en: 'Total' })) + '</strong></td>';
      }
      h += '<td><strong>' + money(data.total) + '</strong></td>';
      if (nAfter > 0) h += '<td colspan="' + nAfter + '"></td>';
      h += '</tr></tfoot></table></div>';
    }

    /* 🔴 المستبعَد يُقال، ولا يُبتلع · what is left out is SAID, never swallowed */
    var notes = [];
    if (data.unapproved) {
      notes.push(L({
        ar: data.unapproved + ' مستند لم يُعتمد بعد — غير محسوب هنا. ' +
            'التقرير يعدّ الحركة المعتمدة وحدها.',
        en: data.unapproved + ' document(s) not approved yet — not counted here. ' +
            'This report counts approved movement only.'
      }));
    }
    if (data.outOfRange) {
      notes.push(L({
        ar: data.outOfRange + ' مستند خارج الفترة المختارة.',
        en: data.outOfRange + ' document(s) outside the chosen period.'
      }));
    }
    if (notes.length) {
      h += '<p class="muted" style="padding:6px 12px 10px;font-size:.85em">· ' +
        notes.map(esc).join('<br>· ') + '</p>';
    }
    return h + '</div>';
  }

  function renderPage(host) {
    if (!host) return;
    var today = (global.I18N && I18N.today) ? I18N.today() : '';
    var from = host.__azFrom || '';
    var to = host.__azTo || today;

    var h = '<div class="page-head"><h2>' + esc(L(NAV_LABEL)) + '</h2></div>' +
      '<div class="card" style="margin-block-end:14px"><div class="form-grid" ' +
      'style="padding:10px 12px">' +
      '<label class="field"><span class="field-label">' +
      esc(L({ ar: 'من تاريخ', en: 'From' })) + '</span>' +
      '<input type="date" class="input" id="azSrFrom" value="' + esc(from) + '"></label>' +
      '<label class="field"><span class="field-label">' +
      esc(L({ ar: 'إلى تاريخ', en: 'To' })) + '</span>' +
      '<input type="date" class="input" id="azSrTo" value="' + esc(to) + '"></label>' +
      '</div></div>';

    var built = {};
    REPORTS.forEach(function (def) {
      built[def.id] = build(def, from, to);
      h += tableHTML(def, built[def.id]);
    });

    host.innerHTML = h;

    var f = host.querySelector('#azSrFrom');
    var t = host.querySelector('#azSrTo');
    function reload() {
      host.__azFrom = f ? f.value : '';
      host.__azTo = t ? t.value : '';
      renderPage(host);
    }
    if (f) f.addEventListener('change', reload);
    if (t) t.addEventListener('change', reload);

    host.querySelectorAll('[data-az-csv]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-az-csv');
        var def = REPORTS.filter(function (d) { return d.id === id; })[0];
        if (!def) return;
        try {
          UI.exportCSV(id + '.csv',
            def.cols.map(function (c) { return L(c); }),
            built[id].rows);
        } catch (e) { console.error('stores-reports.js: export failed', e); }
      };
    });
  }

  /* ── الطريق ──────────────────────────────────────────────────────────
     app.js:254 يمرّر أي طريق غير معروف إلى EntityPage.render — نفس مرساة
     doc-delay-register.js. كل طريق آخر يمرّ كما هو بلا أي تغيير.
     app.js:254 passes any unrecognised route to EntityPage.render — the
     same anchor doc-delay-register.js uses. Every other route passes
     through untouched. */
  var originalRender = EntityPage.render;
  EntityPage.render = function (moduleId, host) {
    if (moduleId === ROUTE) {
      try { renderPage(host); }
      catch (e) {
        console.error('stores-reports.js: render failed', e);
        if (host) {
          host.innerHTML = '<div class="alert alert-danger">' +
            esc(String(e && e.message || e)) + '</div>';
        }
      }
      return;
    }
    return originalRender.apply(EntityPage, arguments);
  };

  /* ── زرّ القائمة ────────────────────────────────────────────────────── */
  function ensureNavItem() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    if (!(global.Auth && Auth.current && Auth.current())) return;
    /* 🔴 مرساة بنيوية: المجموعة التي فيها زرّ إذون الصرف. لا نصّ عربي.
       🔴 Structural anchor: the group holding the stock-issues button.
       No Arabic text. */
    var anchor = nav.querySelector('[data-route="stockIssues"]');
    if (!anchor || !anchor.parentNode) return;   /* لا شاشات مخازن ⇒ لا زرّ */
    var group = anchor.parentNode;
    if (group.querySelector('[data-route="' + ROUTE + '"]')) return;

    var b = document.createElement('button');
    var here = (global.App && App.route) ? App.route() : '';
    b.className = 'nav-item' + (here === ROUTE ? ' active' : '');
    b.setAttribute('data-route', ROUTE);
    b.innerHTML = '<span class="nav-icon">' + UI.icon('chart', 17) + '</span>' +
                  '<span class="nav-label">' + esc(L(NAV_LABEL)) + '</span>';
    b.onclick = function () { if (global.App && App.go) App.go(ROUTE); };
    group.appendChild(b);
  }

  function watchMainNav() {
    var nav = document.getElementById('mainNav');
    if (!nav || nav.__azStoresReportsWatched) return;
    nav.__azStoresReportsWatched = true;
    try {
      new MutationObserver(function () {
        try { ensureNavItem(); }
        catch (e) { console.error('stores-reports.js: nav observer failed', e); }
      }).observe(nav, { childList: true, subtree: false });
    } catch (e) {}
    ensureNavItem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchMainNav);
  } else { watchMainNav(); }

  global.StoresReports = {
    ROUTE: ROUTE,
    REPORTS: REPORTS,
    build: build,
    __ensureNavItem: ensureNavItem
  };

  console.info('stores-reports.js ready — «تقارير المخازن» in the stores menu group; ' +
    'wraps EntityPage.render for id "' + ROUTE + '" only.');
})(window);
