/* =========================================================================
   line-stock-balance.js — الرصيد بجانب كل صنف أثناء الصرف، والتنبيه للمخزن الخطأ
   line-stock-balance.js — the balance beside each item while issuing, and the
                           wrong-store warning

   ── من طلبه، وبكلماته ───────────────────────────────────────────────────
   🔴 صُحّح ١ سبتمبر ٢٠٢٦: كان مكتوباً هنا «أمين مخزن المعمل» — وهو لقب
   **مُختلَق**. الكتيّب يقول **«محاسب»** بإدارة **«المخازن»**، و«المعمل» لا
   ترد فيه ولا مرّة. أمسكه المنسّق قبل الشحن وتحقّقتُ منه بنفسي.
   🔴 Corrected 1 Sep 2026: this said "storekeeper of the workshop store" —
   an INVENTED title. The booklet says «محاسب» (accountant) in «المخازن»,
   and «المعمل» appears nowhere in it. Caught by the coordinator before
   shipping; verified by me in the file.

   أ. أحمد السيد سليمان محمد — **محاسب** بإدارة **المخازن**، وبكلماته:
   «ثلاث مخازن — أنا فقط أمين المخازن» (سؤال ١). كتيّب الأسئلة ١ سبتمبر ٢٠٢٦:

     «المعلومة اللي تفرق معايا كل صباح؟
        ظهور الرصيد بجانب كل صنف أثناء عملية الصرف.»

     «النظام ينبّهني على إيه؟
        على العجز في الأصناف، أو على خطأ — مثال: صرف في مخزن بدلاً من مخزن آخر.»

   طلبان اثنان، ومكانهما واحد: سطر الصنف وقت الصرف. فهما ملف واحد لأنهما
   لحظة واحدة في يده، لا لأنهما فكرة واحدة.

   ── ما كان موجوداً، وما لم يكن ──────────────────────────────────────────
   الحساب موجود بالفعل: rules.js:127-142 ينادي
   `Dashboard.analytics.stockQty(item, warehouse)` **عند الحفظ** ويمنع صرف
   أكثر من الرصيد. الناقص ليس الحساب — الناقص أن يراه وهو يكتب، لا بعد أن
   يملأ الإذن كلّه ويضغط حفظ.
   **فلا يُكتب هنا حساب ثانٍ.** نفس الدالة، نفس الوسائط، نفس الرقم — لأن
   رقمين لنفس الشيء يختلفان يوماً ما، وهو «خطأ التوأم الهشّ» الذي دفع هذا
   المشروع ثمنه أكثر من مرّة.

   ── كيف يُعرف «المخزن الخطأ» أصلاً ─────────────────────────────────────
   البورتال لا يعرف أي مخزن كان **يقصده**. لكنه يعرف بصمة الخطأ: **الرصيد
   صفر في المخزن المختار، وموجود في مخزن آخر.** هذه بالضبط صورة «صرف في
   مخزن بدلاً من مخزن آخر»، وتُقال له وقت الاختيار لا وقت الحفظ.
   ولا نقول «أنت مخطئ» — نقول أين البضاعة ونتركه يحكم.

   ── 🔴 لماذا لا عمود جديد ──────────────────────────────────────────────
   قيد العرض من v2.0.21: إضافة نصّ إلى أزرار الصفّ وسّعت جدولاً من ٤٣٣ إلى
   ٤٥١ بكسل. وعمود كامل على هاتف أسوأ. فالرقم يظهر **تحت اسم الصنف داخل
   نفس الخانة** — «بجانب الصنف» كما طلب، وبلا عمود ولا عرض إضافي.

   ── 🔴 لماذا لا يظهر في الجرد ──────────────────────────────────────────
   شاشة الجرد (stockCounts) مستثناة عمداً: عرض رصيد النظام بجانب الصنف
   أثناء الجرد **يفسد الجرد** — يكتب ما يقوله النظام بدل ما عدّه بيده،
   ويصير الجرد مرآة لا فحصاً. الاستثناء قرار، لا سهو.

   ── 🔴 لماذا مراقب وليس لفّ ────────────────────────────────────────────
   `renderLines` (pages/entity.js:710) دالة **محلّية داخل الإغلاق** وليست
   مُصدَّرة — المُصدَّر هو `render, openForm, openDetail, doTransition` فقط
   (:906-908). فلفّ أي اسم عام لا يعترضها، وهو طُعم «التصدير الميّت» الذي
   لدغ هذا المشروع ثماني مرّات. وهي تكتب `wrap.innerHTML = h` (:727) فتمحو
   الجدول كلّه عند كل إضافة أو حذف سطر.
   فالعلاج المُثبَت في المستودع: مراقب على `#linesWrap` بـ **subtree:false**
   — يرى استبدال الجدول (ابن مباشر) ولا يرى كتاباتنا نحن داخل الخلايا
   (أحفاد)، فلا يستدعي نفسه. نفس تصميم authority-ipc-register.js:432-441.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   Two asks from أ. Ahmed's booklet — he is an ACCOUNTANT in the stores
   department and, in his own words, the only stores keeper across three
   stores — and both asks land in one place: the item row while issuing.
   "The balance shown next to each item while issuing", and "warn me about
   shortages, and about mistakes — for example issuing from one store
   instead of another."

   The ARITHMETIC ALREADY EXISTS: rules.js:127-142 calls
   Dashboard.analytics.stockQty(item, warehouse) AT SAVE and blocks issuing
   more than the balance. What is missing is not the number — it is seeing
   it while typing rather than after filling in the whole note. So NO second
   computation is written here: same function, same arguments, same number.
   Two numbers for one thing disagree eventually — the fragile-twin mistake
   this project has already paid for.

   HOW "wrong store" is knowable at all: the portal cannot know which store
   he MEANT, but it knows the fingerprint — zero here, stock elsewhere. That
   is exactly "issued from one store instead of another", said while he is
   choosing rather than at save. It never says "you are wrong"; it says
   where the goods are and lets him judge.

   NO NEW COLUMN: the v2.0.21 width constraint — adding text to row buttons
   pushed a table from 433 to 451px, and a whole column on a phone is worse.
   The number goes UNDER the item name inside the same cell.

   NOT ON THE STOCK-COUNT SCREEN, deliberately: showing the system balance
   during a count corrupts the count — he writes what the system says
   instead of what he counted, and the count becomes a mirror, not a check.

   OBSERVER, NOT A WRAP: renderLines (pages/entity.js:710) is closure-local
   and NOT exported (:906-908 exports render/openForm/openDetail/
   doTransition only), and it does wrap.innerHTML = h (:727), wiping the
   table on every add or remove. So a MutationObserver on #linesWrap with
   subtree:false — it sees the table being replaced (a direct child) and
   never sees our own writes inside the cells (descendants), so it cannot
   re-trigger itself. Same design as authority-ipc-register.js:432-441.

   حذف هذا الملف يعيد سلوك اليوم حرفياً — لا حقل، لا جدول، لا صلاحية، ولا
   تغيير في أي مسار حفظ.
   Deleting this file restores today exactly — no field, no table, no
   permission, and no change to any save path.

   مُثبَت بالتشغيل / proven by running: TESTS/line-stock-balance-trial.js
   (v2.0.31)
   ========================================================================= */
(function (global) {
  'use strict';

  var MARK  = 'az-stockbal';
  var STYLE = 'azStockBalStyle';

  /* الشاشات التي تُخرج بضاعة من مخزن مصدر — وهي وحدها.
     Screens that take goods OUT of a source warehouse — and only those. */
  var SOURCE_FIELD = { out: 'warehouse', transfer: 'fromWarehouse' };

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  function num(v) {
    try { if (global.I18N && I18N.num) return I18N.num(v, 2); } catch (e) {}
    return String(v);
  }

  function injectStyle() {
    if (document.getElementById(STYLE)) return;
    var css =
      '.' + MARK + '{display:block;font-size:.78em;line-height:1.5;margin-block-start:2px;' +
      'color:var(--muted,#666)}' +
      '.' + MARK + '.' + MARK + '-warn{color:var(--danger,#b3261e);font-weight:600}' +
      /* أرقام مساعدة لا معلومات مستند — لا تُطبع مع الإذن.
         A working aid, not document content: never printed with the note. */
      '@media print{.' + MARK + '{display:none}}';
    var el = document.createElement('style');
    el.id = STYLE;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* 🔴 نفس دالة rules.js — لا حساب ثانٍ · the SAME function rules.js uses */
  function qtyOf(itemId, warehouseId) {
    try {
      return Number(Dashboard.analytics.stockQty(itemId, warehouseId)) || 0;
    } catch (e) { return null; }   /* null = «لا أعرف»، وليس صفراً */
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 «صفر» و«لا حركة» ليسا نفس الشيء — وهذا يوم الإطلاق كل الأصناف.

     stockQty يجمع من `posted()` وحدها (pages/dashboard.js:22): الحالة
     `approved` أو `reversed` فقط. فيوم الإطلاق لا شيء معتمد بعد، وكل صنف
     في البورتال يعطي 0.00. ولو كتبنا «الرصيد: 0» بثقة لخرج أ. أحمد يشتري
     ما يملكه فعلاً — وهو أسوأ من ألّا نعرض رقماً إطلاقاً.

     فنفرّق ثلاث حالات بدل واحدة، وكلها قابلة للفحص:
       · لا مستند فيه هذا الصنف أصلاً        ⇒ «صنف جديد، لا حركة عليه»
       · مستندات موجودة ولا واحد معتمد        ⇒ «لا توجد حركة معتمدة»
       · حركة معتمدة وصافيها صفر              ⇒ «الرصيد صفر» (وهذا صادق)

     ⚠️ هذه فحوص **وجود** لا حساب أرصدة — لا تجمع كمّيات ولا تنافس
     stockQty، فلا يمكن أن يختلف رقمان. الحالة المستعملة هنا منسوخة عن
     dashboard.js:22 نصّاً، وأي تغيير هناك يجب أن يتبعه هنا.

     🔴 "Zero" and "no movement" are not the same thing — and on launch day
     every item is the second one.
     stockQty sums from posted() alone (pages/dashboard.js:22): status
     `approved` or `reversed` only. On day one nothing is approved yet, so
     every item in the portal reads 0.00. Writing a confident "Balance: 0"
     would send أ. أحمد out to buy what he already owns — worse than showing
     no number at all.
     So three cases instead of one, each checkable:
       · the item is in no document at all   ⇒ "new item, no movement"
       · documents exist, none approved      ⇒ "no approved movement"
       · approved movement netting to zero   ⇒ "balance is zero" (true)
     ⚠️ These are PRESENCE checks, not balance arithmetic — they sum
     nothing and never compete with stockQty, so two numbers cannot
     disagree. The status set is copied verbatim from dashboard.js:22, and
     a change there must be followed here. */
  var MOVEMENT_TABLES = ['goodsReceipts', 'stockIssues', 'stockTransfers'];
  var POSTED_STATUS = ['approved', 'reversed'];   /* dashboard.js:22 */

  function movementOf(itemId) {
    var any = false, posted = false;
    MOVEMENT_TABLES.forEach(function (tb) {
      var rows = [];
      try { rows = Store.all(tb) || []; } catch (e) { return; }
      /* نفس السياج هنا أيضاً — «هل تحرّك هذا الصنف؟» سؤال عن مستندات، وقد
         تكون مستندات موقع آخر. لا نجيب عمّا لا يراه.
         The same fence here too — "has this item moved?" is a question
         about documents, which may belong to another site. We do not
         answer about what he cannot see. */
      try { rows = Auth.scopeRows(tb, rows) || []; } catch (e) { return; }
      rows.forEach(function (d) {
        if (!d || d.deleted === true || !Array.isArray(d.lines)) return;
        var hit = d.lines.some(function (l) { return l && l.item === itemId; });
        if (!hit) return;
        any = true;
        if (POSTED_STATUS.indexOf(d.status) !== -1) posted = true;
      });
    });
    return { any: any, posted: posted };
  }

  function warehouseName(id) {
    try {
      var w = Store.find('warehouses', id);
      return w && w.name ? String(w.name) : '';
    } catch (e) { return ''; }
  }

  /* أين يوجد هذا الصنف غير هنا — سؤال «المخزن الخطأ» بعينه.
     Where else this item is — the wrong-store question itself. */
  function elsewhere(itemId, exceptWarehouseId) {
    var out = [];
    var all = [];
    try { all = Store.all('warehouses') || []; } catch (e) { return out; }
    /* 🔴 سياج المواقع — أُضيف ٢ سبتمبر ٢٠٢٦ بعد أن أمسكت بوابة TRACK
       ENHANCER تسريباً حقيقياً في هذا الملف بالذات.
       كان هذا السطر يقرأ كل المخازن بلا سياج، فيقول لأمين مخزن الروبيكي
       «متاح ١٢٠ في مخزن سوهاج» — أي **اسم مخزن من موقع لا يراه**. على
       الشاشة وفي رسالة الحفظ معاً. وهو نفس الباب الخلفي الذي يحذّر منه رأس
       ref-search-picker.js: قائمة مقصوصة صحيحة، وفوقها شيء جديد يعرض ما
       قُصّ. أخطر ما في هذه الدفعة، ولم أره أنا.
       العلاج ليس سياجاً ثانياً: ننادي Auth.scopeRows نفسها التي تحرس بقية
       البورتال — تنفيذ واحد للقاعدة، لا نسخة تتباعد.
       🔴 THE SITE FENCE — added 2 Sep 2026 after TRACK ENHANCER's gate
       caught a REAL leak in this very file. This line read every warehouse
       unfenced, so an Elrobaki storekeeper was told "120 available at مخزن
       سوهاج" — the NAME OF A STORE AT A SITE HE CANNOT SEE, on screen and
       in the save message. Exactly the back door ref-search-picker.js's own
       header warns about: a correctly pruned list with something new above
       it showing what was pruned. The worst thing in this batch, and I did
       not find it.
       The cure is not a second fence: call the same Auth.scopeRows that
       guards the rest of the portal. One implementation, never a copy. */
    try { all = Auth.scopeRows('warehouses', all) || []; } catch (e) { return out; }
    all.forEach(function (w) {
      if (!w || w.id === exceptWarehouseId) return;
      if (w.deleted === true) return;
      var q = qtyOf(itemId, w.id);
      if (q !== null && q > 0) out.push({ name: w.name || w.id, qty: q });
    });
    out.sort(function (a, b) { return b.qty - a.qty; });
    return out;
  }

  function activeModule() {
    var form = document.getElementById('entForm');
    if (!form || !form.getAttribute) return null;
    /* pages/entity.js:545 يكتب data-module عمداً وإضافياً — «لا شيء في هذا
       الملف يقرأها». هذا الملف يقرأها.
       pages/entity.js:545 writes data-module deliberately and additively —
       "nothing in this file reads them". This file reads them. */
    var id = form.getAttribute('data-module');
    if (!id) return null;
    var mod = null;
    try { mod = Schema.get(id); } catch (e) { return null; }
    if (!mod || !mod.lines) return null;
    var effect = mod.lines.stockEffect;
    if (!SOURCE_FIELD[effect]) return null;      /* in / adjust → مستثناة */
    return { mod: mod, form: form, sourceField: SOURCE_FIELD[effect] };
  }

  function sourceWarehouseId(ctx) {
    var el = ctx.form.querySelector('[name="' + ctx.sourceField + '"]');
    return el && el.value ? el.value : null;
  }

  /* ── الرسم ─────────────────────────────────────────────────────────── */
  function paint() {
    var ctx = activeModule();
    if (!ctx) return 0;
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return 0;

    injectStyle();
    var whId = sourceWarehouseId(ctx);
    var rows = wrap.querySelectorAll('[data-li]');
    var painted = 0;

    rows.forEach(function (tr) {
      var sel = tr.querySelector('[name="item"]');
      if (!sel) return;
      var cell = sel.parentNode;
      if (!cell) return;

      var tag = cell.querySelector('.' + MARK);
      if (!tag) {
        tag = document.createElement('span');
        tag.className = MARK;
        cell.appendChild(tag);
      }

      var itemId = sel.value;
      if (!itemId) { tag.textContent = ''; tag.className = MARK; return; }

      if (!whId) {
        tag.className = MARK;
        tag.textContent = L({
          ar: 'اختر المخزن أولاً ليظهر الرصيد',
          en: 'Choose the warehouse to see the balance'
        });
        painted++;
        return;
      }

      var q = qtyOf(itemId, whId);
      if (q === null) {
        /* 🔴 «لا أعرف» تُقال، ولا تُعرض صفراً. صفرٌ كاذب هنا يوقف صرفاً صحيحاً.
           🔴 "I cannot tell" is SAID, never shown as zero. A false zero here
           would stop a correct issue. */
        tag.className = MARK + ' ' + MARK + '-warn';
        tag.textContent = L({
          ar: 'تعذّر حساب الرصيد — الرقم غير معروف، وليس صفراً',
          en: 'The balance could not be worked out — unknown, not zero'
        });
        painted++;
        return;
      }

      var qtyEl = tr.querySelector('[name="qty"]');
      var wanted = qtyEl ? Number(qtyEl.value) || 0 : 0;

      if (q > 0) {
        var short = wanted > q;
        if (short) {
          tag.className = MARK + ' ' + MARK + '-warn';
          tag.textContent = L({
            ar: 'الرصيد ' + num(q) + ' — المطلوب أكبر من الموجود',
            en: 'Balance ' + num(q) + ' — more requested than there is'
          });
          painted++;
          return;
        }

        /* ── العجز: النصف الآخر من طلبه الثالث ────────────────────────────
           «ينبّهني على **العجز في الأصناف**، أو على خطأ». بنيتُ نصف «الخطأ»
           (المخزن الغلط) وتركتُ نصف «العجز» — أمسكه المنسّق.
           الحدّ الأدنى موجود بالفعل كحقل `reorderLevel` (schema.js) وتقرؤه
           alerts.js:63، لكنه نائم لأن لا أحد كتب حدوداً — وأ. أحمد أجاب
           «لا» عن وجود حدّ أدنى. فحين يُكتب حدّ، هذا السطر يوقظه في اللحظة
           التي تهمّ: قبل الصرف لا بعده.
           🔴 ولا ننبّه على حقل فارغ: الشرط يفحص **وجود** الحدّ أولاً
           (`Number(lvl) > 0`) — القاعدة المكتوبة في .claude/rules/frontend.md
           بعد أن أطلق فحصان إنذاراً على كل صفّ لأن حقلهما اختياري.
           ── The shortage: the other half of his third ask ──
           "warn me about SHORTAGES, or about a mistake". I built the
           mistake half (wrong store) and dropped the shortage half; the
           coordinator caught it.
           The minimum already exists as the `reorderLevel` field and
           alerts.js:63 reads it — but it sleeps because nobody has typed
           any minimums, and أ. أحمد answered "no" when asked if he had one.
           The day a minimum is typed, this line wakes it at the moment that
           matters: before the issue, not after.
           🔴 And it never alarms on an empty box: the condition tests that
           the level is PRESENT first (`Number(lvl) > 0`) — the rule written
           in .claude/rules/frontend.md after two checks alarmed on every
           row because their trigger field was optional. */
        var lvl = 0;
        try {
          var itRec = Store.find('items', itemId);
          lvl = itRec ? Number(itRec.reorderLevel) || 0 : 0;
        } catch (e) { lvl = 0; }
        var left = q - wanted;
        if (lvl > 0 && wanted > 0 && left < lvl) {
          tag.className = MARK + ' ' + MARK + '-warn';
          tag.textContent = L({
            ar: 'الرصيد ' + num(q) + ' — بعد الصرف يتبقّى ' + num(left) +
                '، أقل من الحد الأدنى (' + num(lvl) + ').',
            en: 'Balance ' + num(q) + ' — this issue leaves ' + num(left) +
                ', below the minimum (' + num(lvl) + ').'
          });
          painted++;
          return;
        }

        tag.className = MARK;
        tag.textContent = L({ ar: 'الرصيد: ' + num(q), en: 'Balance: ' + num(q) });
        painted++;
        return;
      }

      /* ── الرصيد صفر هنا: هذه لحظة «المخزن الخطأ» ──────────────────── */
      var other = elsewhere(itemId, whId);
      tag.className = MARK + ' ' + MARK + '-warn';
      if (other.length) {
        var first = other[0];
        var more = other.length > 1
          ? L({ ar: ' (و' + (other.length - 1) + ' مخزن آخر)',
                en: ' (and ' + (other.length - 1) + ' more)' })
          : '';
        tag.textContent = L({
          ar: 'الرصيد هنا صفر — متاح ' + num(first.qty) + ' في «' + first.name + '»' + more +
              '. تأكّد من المخزن.',
          en: 'Zero here — ' + num(first.qty) + ' available at "' + first.name + '"' + more +
              '. Check the warehouse.'
        });
      } else {
        /* 🔴 لا «صفر» واثقة قبل أن نعرف أن هناك حركة معتمدة أصلاً.
           🔴 No confident zero until we know there is approved movement. */
        var mv = movementOf(itemId);
        if (!mv.any) {
          tag.textContent = L({
            ar: 'صنف جديد — لا توجد أي حركة مسجّلة عليه بعد. هذا ليس رصيداً صفراً.',
            en: 'New item — no movement recorded for it yet. This is not a zero balance.'
          });
        } else if (!mv.posted) {
          tag.textContent = L({
            ar: 'لا توجد حركة معتمدة لهذا الصنف — الرصيد يُحسب من المستندات ' +
                'المعتمدة وحدها، فقد تكون البضاعة موجودة والإذن لم يُعتمد بعد.',
            en: 'No approved movement for this item — the balance counts only approved ' +
                'documents, so the goods may be there with the note not yet approved.'
          });
        } else {
          tag.textContent = L({
            ar: 'الرصيد صفر في كل المخازن',
            en: 'Zero in every warehouse'
          });
        }
      }
      painted++;
    });

    return painted;
  }

  /* ── المراقبة ──────────────────────────────────────────────────────────
     subtree:false مقصود: يرى استبدال الجدول (ابن مباشر لـ#linesWrap) ولا
     يرى الوسوم التي نكتبها داخل الخلايا (أحفاد) — فلا يستدعي نفسه أبداً.
     subtree:false is deliberate: it sees the table being replaced (a direct
     child of #linesWrap) and never the tags we write inside cells
     (descendants) — so it can never re-trigger itself. */
  function watchLines() {
    var wrap = document.getElementById('linesWrap');
    if (!wrap || wrap.__azStockBalObs) return;
    wrap.__azStockBalObs = true;
    try {
      new MutationObserver(function () {
        try { paint(); } catch (e) { console.error('line-stock-balance.js: paint failed', e); }
      }).observe(wrap, { childList: true, subtree: false });
    } catch (e) { /* بيئة بلا MutationObserver — نكمل بالمستمع المفوَّض */ }
    paint();
  }

  function watchModal() {
    var host = document.getElementById('modalHost');
    if (!host || host.__azStockBalHostObs) return;
    host.__azStockBalHostObs = true;
    try {
      new MutationObserver(function () {
        try { watchLines(); } catch (e) { console.error('line-stock-balance.js: attach failed', e); }
      }).observe(host, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* مستمع مفوَّض على document في طور الالتقاط — نفس أسلوب date-sanity.js:48-55.
     يعمل مهما كان توقيت رسم الحقول، ولا يلفّ شيئاً.
     One delegated listener on document in the capture phase — the
     date-sanity.js:48-55 technique. It works regardless of when the fields
     were drawn, and wraps nothing. */
  function onAnyChange(e) {
    var t = e && e.target;
    if (!t || !t.getAttribute) return;
    var name = t.getAttribute('name');
    if (name !== 'item' && name !== 'qty' &&
        name !== 'warehouse' && name !== 'fromWarehouse') return;
    try { paint(); } catch (err) { console.error('line-stock-balance.js: paint failed', err); }
  }

  document.addEventListener('change', onAnyChange, true);
  document.addEventListener('input', onAnyChange, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { watchModal(); watchLines(); });
  } else { watchModal(); watchLines(); }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 نفس الحقيقة عند الحفظ أيضاً — لا على الشاشة وحدها.

     rules.js:134-140 يقول عند الحفظ: «الكمية المطلوبة من «س» (٥) أكبر من
     الرصيد المتاح (٠).» ولا يذكر أبداً أن الصنف موجود في مخزن آخر. فهو
     يخبره أنه ناقص بينما يملك عشرة في المخزن المجاور — نفس عطل «الصفر
     الواثق»، لكن في اللحظة التي يُرفض فيها حفظه.

     نضيف سطراً ثانياً ولا نعيد كتابة رسالتهم: الأصلية تبقى حرفياً كما هي،
     ويليها «متاح ١٢٠ في «مخزن كذا»». إضافة، لا استبدال — وحذف هذا الملف
     يعيد الرسالة الأصلية وحدها بالضبط.

     ⚠️ ولا يعمل إلا حين يكون هناك عجز فعلاً — أي حين تكون rules.js قد
     اعترضت أصلاً. فلا رسالة زائدة على حفظ سليم.

     🔴 The same truth at SAVE, not only on the screen.
     rules.js:134-140 says at save: "the quantity requested of X (5) exceeds
     the available stock (0)" — and never mentions that the item is sitting
     in another store. It tells him he is short while he owns ten next door:
     the confident-zero fault again, at the moment his save is refused.
     We ADD a second line and never rewrite theirs: the original stays word
     for word, followed by "120 available at «store»". Additive — delete
     this file and the original message returns exactly as it was.
     ⚠️ It fires only when there is a real shortage, i.e. only when rules.js
     already objected. No extra words on a healthy save. */
  if (global.Rules && typeof Rules.validateSave === 'function') {
    var origValidateSave = Rules.validateSave;
    Rules.validateSave = function (mod, draft, editingId) {
      var check = origValidateSave.apply(Rules, arguments);
      try {
        /* mod قد يكون نصّاً — assistant-pro.js:147، عطل قائم مسبقاً.
           mod may be a STRING — assistant-pro.js:147, a pre-existing bug. */
        if (!check || !Array.isArray(check.errors)) return check;
        if (!mod || typeof mod !== 'object' || !mod.lines) return check;
        var field = SOURCE_FIELD[mod.lines.stockEffect];
        if (!field || !draft || !Array.isArray(draft.lines)) return check;
        var whId = draft[field];
        if (!whId) return check;

        /* 🔴 لا نضيف خطأً لم تضعه القاعدة الأصلية — أمسكته بوابة TRACK
           ENHANCER (H.5). كان هذا يدفع سطراً في `errors` كلّما وجد عجزاً،
           **حتى لو كان صاحب العمل قد أطفأ حارس الرصيد السالب بنفسه**
           (Rules.SETTINGS.blockNegativeStock). فكان ملفي يرفض حفظاً سمح به
           هو عمداً — أي أنني غيّرت قراره من حيث لا أدري.
           القاعدة الآن: **سطري تعليقٌ على خطئهم، لا خطأ من عندي.** لا
           يظهر إلا إذا كانت القاعدة الأصلية قد اعترضت على هذا الصنف
           بالذات. فإن سكتت، سكتُّ.
           🔴 Never add an error the original rule did not — caught by TRACK
           ENHANCER's gate (H.5). This used to push a line into `errors`
           whenever it found a shortage, EVEN IF THE OWNER HAD TURNED THE
           negative-stock guard OFF himself
           (Rules.SETTINGS.blockNegativeStock). My file was refusing a save
           he had deliberately allowed — silently overriding his decision.
           The rule now: MY LINE IS A COMMENT ON THEIR ERROR, never an error
           of my own. It appears only where the original already objected to
           that same item. If they were silent, I am silent. */
        var told = {};
        draft.lines.forEach(function (ln) {
          if (!ln || !ln.item || !(Number(ln.qty) > 0)) return;
          if (told[ln.item]) return;
          var it0 = null;
          try { it0 = Store.find('items', ln.item); } catch (e) {}
          var nm0 = it0 && it0.name ? String(it0.name) : '';
          var objected = nm0 && check.errors.some(function (e) {
            return String(e).indexOf(nm0) !== -1;
          });
          if (!objected) return;              /* القاعدة الأصلية لم تعترض */
          var here = qtyOf(ln.item, whId);
          if (here === null || Number(ln.qty) <= here) return;   /* لا عجز */
          var other = elsewhere(ln.item, whId);
          if (!other.length) return;
          told[ln.item] = true;
          var it = null;
          try { it = Store.find('items', ln.item); } catch (e) {}
          var nm = it && it.name ? String(it.name) : '';
          check.errors.push(L({
            ar: '«' + nm + '» متاح ' + num(other[0].qty) + ' في «' + other[0].name + '»' +
                (other.length > 1 ? ' (و' + (other.length - 1) + ' مخزن آخر)' : '') +
                ' — راجع المخزن المختار قبل أن تطلب توريداً.',
            en: '"' + nm + '" — ' + num(other[0].qty) + ' available at "' + other[0].name + '"' +
                (other.length > 1 ? ' (and ' + (other.length - 1) + ' more)' : '') +
                '. Check the chosen warehouse before ordering more.'
          }));
        });
      } catch (e) {
        console.error('line-stock-balance.js: save-time hint failed, save continues', e);
      }
      return check;
    };
  }

  global.LineStockBalance = {
    paint: paint,
    qtyOf: qtyOf,
    elsewhere: elsewhere,
    movementOf: movementOf,
    activeModule: activeModule,
    __watchLines: watchLines
  };

  console.info('line-stock-balance.js ready — balance beside each item while issuing, ' +
    'and a wrong-store warning (أ. أحمد\'s asks 2 and 3)');
})(window);
