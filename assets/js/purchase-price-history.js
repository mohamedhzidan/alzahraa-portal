/* =========================================================================
   purchase-price-history.js — تاريخ الأسعار وأرخص مورد لكل صنف
                                Purchase price history & cheapest supplier
   =========================================================================

   بالكلام العادي · IN PLAIN WORDS

     اليوم: لا توجد طريقة لمعرفة كم دفعت الشركة فعلاً مقابل صنف معيّن عبر
     الزمن، ولا أي مورد كان الأرخص — هذه المعلومة موجودة لكنها مبعثرة داخل
     إذون الاستلام، ولا أحد يستطيع رؤيتها دون تصفّح المستندات واحداً واحداً.
     بعد هذا الملف: عند فتح أي صنف من شاشة «الأصناف»، يظهر تلقائياً قسم
     للقراءة فقط يعرض كل سعر سُجِّل لهذا الصنف عبر إذون استلام مُعتمدة، ويحدد
     أرخص سعر سُجِّل على الإطلاق ومن أي مورد وفي أي تاريخ.

     Today: there is no way to see what the company has actually paid for a
     given item over time, or which supplier was cheapest — that data exists
     but is scattered across goods-receipt documents, invisible without
     opening them one at a time. After this file: opening any item on the
     Items screen automatically shows a read-only section listing every
     price recorded for it through approved goods receipts, and names the
     cheapest price ever recorded, from which supplier, and on what date.

   ⚠️ القاعدة التي لا تُكسر · THE RULE THAT IS NEVER BROKEN

     هذا القسم **للقراءة فقط**. لا زر تعديل، لا حفظ، لا كتابة في أي جدول —
     يقرأ `goodsReceipts` الموجودة فعلاً ولا يغيّر فيها حرفاً.

     This section is **read-only**. No edit button, no save, no write to any
     table — it reads the existing `goodsReceipts` records and changes
     nothing in them.

   -------------------------------------------------------------------------
   لماذا لا حاجة لـ MutationObserver — تحقّق مباشر لا افتراض منقول
   ------------------------------------------------------------------
   `attachment-reader.js` يحتاج MutationObserver لأن لوحة المرفقات التي
   يراقبها تُبنى بجلب غير متزامن (`Attachments.list`) بعد أن يعود
   `openDetail`. هنا الوضع مختلف، وتم التحقّق منه بقراءة الملفين مباشرة لا
   بنقل افتراض الخطة: `openDetail` (pages/entity.js) يبني سلسلة HTML واحدة
   ثم يُسلّمها لـ `UI.modal({body: ...})`، والأخيرة (ui.js) تكتب
   `document.getElementById('modalBody').innerHTML = opts.body` **بالتزامن
   الكامل** — لا `await` ولا `Promise` ولا `setTimeout` في أيّ من الدالّتين
   على مسار العرض. مصدر بياناتنا (`Store.all('goodsReceipts')`) متزامن هو
   الآخر (بيانات في الذاكرة فعلاً، لا طلب شبكة). فبمجرد أن يعود
   `orig.apply(...)` في اللفّة أدناه، تكون `#modalBody` قد امتلأت فعلاً
   بمحتوى `entity.js` الأساسي، وإلحاق قسمنا بعدها مباشرة آمن ولا يحتاج مراقبة
   لظهور شيء لاحقاً. فحص إضافي: `loader.js` يحمّل كل ملف عبر
   `<script async=false>` بسلسلة `onload` متتابعة (`loadOne`, loader.js) —
   فحين يبدأ هذا الملف بالتنفيذ يكون `pages/entity.js` قد اكتمل تحميله
   وتنفيذه فعلاً، و`EntityPage` معرَّفة يقيناً، لا احتمالاً.

   WHY NO MutationObserver IS NEEDED — verified directly, not carried over
   as an assumption. `attachment-reader.js` needs one because the panel it
   watches for is built by an ASYNC fetch (`Attachments.list`) that runs
   after `openDetail` already returned. Here it is different, confirmed by
   reading both files directly rather than trusting the plan's note:
   `openDetail` (pages/entity.js) builds one HTML string and hands it to
   `UI.modal({body: ...})`, and `UI.modal` (ui.js) sets
   `document.getElementById('modalBody').innerHTML = opts.body`
   **fully synchronously** — no `await`, no `Promise`, no `setTimeout` on
   that render path in either function. Our own data source
   (`Store.all('goodsReceipts')`) is synchronous too — it is already in
   memory, not a network call. So the instant `orig.apply(...)` below
   returns, `#modalBody` already holds `entity.js`'s own base content, and
   appending our section right after is safe with nothing left to wait for.
   Extra check made while building this file: `loader.js` loads every file
   through a chained `<script async=false>` `onload` sequence (`loadOne`,
   loader.js) — by the time this file's own top-level code runs,
   `pages/entity.js` has already finished loading AND executing, so
   `EntityPage` is guaranteed defined, not merely likely.

   -------------------------------------------------------------------------
   حارسان لم يطلبهما أحد صراحةً، وكلاهما يمنع تسريباً حقيقياً — لا زخرفة
   --------------------------------------------------------------------
   ١) طبقة الصلاحية · Auth.canSee('goodsReceipts') — رؤية صنف لا تعني رؤية
      إذون الاستلام. لولا هذا الحارس، دور محروم من شاشة المشتريات/الموردين
      كان سيرى تلك البيانات بالضبط مُهرَّبةً عبر شاشة الأصناف. إن كانت false
      لا نعرض شيئاً إطلاقاً — لا رسالة، لا صندوق فارغ، غياب صامت تام.
   ٢) نطاق الموقع/المشروع · Auth.scopeRows('goodsReceipts', ...) — بالضبط
      كما تستعملها شاشة إذون الاستلام نفسها (entity.js:157) لإخفاء إذون
      مرتبطة بمشروعات لا يراها الدور (المكتب/الخلاطة يريان كل شيء، سوهاج
      والروبيكي لا يرى كل منهما الآخر). تجاوز هذا الحارس كان سيسمح لدور
      محدود الموقع برؤية أسعار شراء من مشروع لا يُفترض أن يراه إطلاقاً.

   TWO GUARDS nobody explicitly asked for by name, and both close a real
   leak — not decoration.
   1) Permission layer · Auth.canSee('goodsReceipts') — seeing an item does
      not imply seeing goods receipts. Without this guard, a role denied
      the procurement/suppliers screen would see that exact data smuggled
      through the Items screen. If false, nothing is rendered at all — no
      message, no empty box, total silent absence.
   2) Site/project scope · Auth.scopeRows('goodsReceipts', ...) — the exact
      call the Goods Receipts list screen itself uses (entity.js:157) to
      hide receipts tied to projects a role cannot see (المكتب/الخلاطة see
      everything; سوهاج and الروبيكي are mutually invisible). Skipping this
      would let a site-limited role see purchase prices from a project it
      is not supposed to see at all.

   -------------------------------------------------------------------------
   لماذا نستبعد المستندات العكسية — التبرير الأول كان خطأً، هذا هو الصحيح
   🔴 صُحِّح بعد المراجعة المستقلة، 29 أغسطس 2026 — الفلتر نفسه لم يتغيّر،
   فقط تبريره كان خاطئاً وليس مجرد ناقص.
   ----------------------------------------------------------------
   التصحيح: الادّعاء الأول هنا («المستند العكسي يحمل سعراً بإشارة معكوسة»)
   تحقّقتُ منه بقراءة الكود الحقيقي على الخادم لا بالتخمين، وتبيّن أنه خطأ.
   `az_negate_lines` — الدالة الحقيقية التي تبني فعلياً سطور أي مستند عكسي
   (1-SUPABASE/_baseline-2026-08-12-do-not-run/03-PRODUCTION-HARDENING.sql:
   373-393) — تعكس إشارة الكمّيات والمجاميع فقط (qty، qtyAccepted،
   lineTotal، ...)، و**لا تلمس `price` إطلاقاً**، لا في نسخة العميل
   الميتة (`workflow.js` دالة `negateAmounts`) ولا في الخادم الحقيقي.

   السبب الحقيقي الذي أثبتته المراجعة تجريبياً: عكسُ مستندٍ معكوسٍ أصلاً.
   `az_transition_document` يسمح بعكس أي مستند `status:'approved'` — بما
   فيها مستند عكسي هو نفسه `approved` — بلا أي مانع يمنع عكس العكس. لو
   حدث ذلك: الكمّية تعود موجبة (انعكست مرتين)، والسعر يبقى موجباً كما كان
   دائماً (لم يُلمس قط)، و`isReversal` يبقى `true` على الصف الجديد. فلولا
   هذا الفلتر، كان ذلك الصف — بسعره الموجب الحقيقي — سيدخل السجل خطأً
   وكأنه شراء منفصل فعلي. أُثبت هذا بسلسلة عكس-لعكس حقيقية طُبِّقت على
   هذا الملف كما هو، والفلتر استبعدها بنجاح.

   `!r.isReversal` هنا مطابق حرفياً لنفس الشرط في `dashboard.js:16` و
   `stock-in-transit.js:216` — نمط مُثبَت بالاستعمال الفعلي، لا اختراع
   جديد؛ الفلتر نفسه كان صحيحاً دائماً، والتصحيح هنا في التبرير فقط.

   WHY REVERSAL DOCUMENTS ARE EXCLUDED — the first justification was
   wrong; this is the real one.
   🔴 CORRECTED after independent verification, 29 August 2026 — the
   filter itself never changed, only its stated reason was wrong, not
   merely incomplete.
   Correction: the original claim here ("a reversal document carries a
   sign-negated price") was checked against the real server code, not
   assumed, and found false. `az_negate_lines` — the actual function that
   builds a reversal document's lines
   (1-SUPABASE/_baseline-2026-08-12-do-not-run/03-PRODUCTION-HARDENING.sql:
   373-393) — negates only quantities and totals (qty, qtyAccepted,
   lineTotal, ...). **`price` is never in that list**, neither in the dead
   client-side mirror (`workflow.js`'s `negateAmounts`) nor in the real
   server function.

   The real reason, proven by running it: reversing an already-reversed
   document. `az_transition_document` allows reversing any
   `status:'approved'` document — including a reversal document itself,
   which is also `approved` — with nothing blocking a reversal of a
   reversal. If that happens: the quantity flips back positive (negated
   twice), the price stays positive and untouched (it was never touched to
   begin with), and `isReversal` stays `true` on the new row. Without this
   filter, that row — carrying a genuine, real positive price — would
   wrongly enter the history as a separate real purchase. Proven directly:
   a real reversal-of-a-reversal chain was built and run against this
   exact file, and the filter correctly excluded it.

   `!r.isReversal` here is the exact same condition already proven in
   real, running code at `dashboard.js:16` and `stock-in-transit.js:216`
   — a proven pattern, not a new invention; the filter itself was always
   correct, only this comment's explanation needed fixing.

   -------------------------------------------------------------------------
   لماذا الفلترة على qtyAccepted، لا على قائمة نتيجة الفحص المنسدلة
   -------------------------------------------------------------------
   قاعدة المشروع (`.claude/rules/frontend.md`): «لا تُبنَ أي فحص على قيمة
   خيار من قائمة منسدلة». حقل رأس المستند `inspectionResult` (منسدلة،
   schema.js) قد يكون `'partial'` بينما بعض **الأسطر** مقبولة بالكامل وبعضها
   مرفوض بالكامل — رأس «مقبول جزئياً» لا يعني أن كل سطر جزئي. الفلترة على
   `qtyAccepted` (رقم على مستوى السطر نفسه) تستبعد تلقائياً وبشكل صحيح أي
   سطر مرفوض بالكامل، بصرف النظر تماماً عن قيمة حقل رأس المستند.

   WHY THE FILTER IS ON qtyAccepted, NEVER ON THE INSPECTION-RESULT DROPDOWN.
   House rule (`.claude/rules/frontend.md`): never key a check on a
   dropdown's option value. The header field `inspectionResult` (a select)
   can read `'partial'` while individual **lines** are fully accepted or
   fully rejected — a "partially accepted" header does not mean every line
   is partial. Filtering on `qtyAccepted` (a per-line number) correctly and
   automatically excludes any fully-rejected line, entirely independent of
   the header dropdown's value.

   -------------------------------------------------------------------------
   حساب «الأرخص على الإطلاق» — وكسر التعادل
   -------------------------------------------
   نُرتّب الأسطر ذات السعر المسجَّل تصاعدياً بالتاريخ، ثم نبحث عن أدنى سعر
   بمقارنة صارمة (`<` لا `<=`) — فإن تكرر أدنى سعر في أكثر من مستند، يفوز
   أقدمها تاريخاً لأن الترتيب التصاعدي يجعله أول من يُقابَل، والمقارنة
   الصارمة لا تستبدله بأحدث مساوٍ له. أما **جدول العرض** فيُرتَّب تنازلياً
   (الأحدث أولاً)، مطابقاً تماماً لتقليد قوائم `entity.js` نفسها
   (entity.js:188، `if (!s.sort) all.reverse();`).

   COMPUTING "CHEAPEST EVER" — and the tie-break. Priced lines are sorted
   ascending by date, then reduced for the strict minimum (`<`, never
   `<=`) — so if the lowest price repeats across more than one document,
   the EARLIEST one wins, because ascending order presents it first and the
   strict comparison never replaces it with a later equal price. The
   **displayed table**, separately, is sorted newest-first, matching
   entity.js's own list convention exactly (entity.js:188,
   `if (!s.sort) all.reverse();`).

   -------------------------------------------------------------------------
   سطر بسعر صفري أو فارغ — يُعرض، ولا يفوز أبداً
   -------------------------------------------------
   خطأ إدخال بيانات شائع: سطر مقبول كمياً لكن سعره صفر أو فارغ. لا نُخفيه —
   يظهر في الجدول بخانة سعر تقول «— غير مسجَّل» بدل رقم مضلِّل («٠ جنيه» قد
   تُقرأ خطأً كأرخص سعر حقيقي)، ويُستبعد فقط من حساب الأرخص أعلاه.

   A ZERO-OR-BLANK-PRICE LINE — shown, never a winner. A common data-entry
   gap: a quantity-accepted line whose price is zero or blank. It is not
   hidden — it appears in the table with a price cell reading "— not
   recorded" instead of a misleading number ("0 EGP" could be misread as a
   genuine record low), and is excluded only from the cheapest computation
   above.

   -------------------------------------------------------------------------
   حدود صادقة — ما لا يفعله هذا الملف، بالتصريح لا بالإخفاء
   -----------------------------------------------------------
   · لا يقرأ `supplierInvoices` (لا بنود فيه إطلاقاً — schema.js) ولا
     `purchaseApprovals` (سعره تقديري لا فعلي، وحقل الصنف فيه نص حر لا ربط
     حقيقي بجدول الأصناف) — كلاهما لا يضيف بيانات سعر فعلي موثوقة لكل صنف.
   · لا يقارن نتيجته بحقل `lastPrice` اليدوي القديم على الصنف نفسه — محمد
     زيدان يستطيع مقارنة الرقمين بعينه على نفس الشاشة، بلا حاجة لتنبيه آلي.
   · دقّته التاريخية تعتمد على أن الموظفين أنشأوا واعتمدوا المستند فعلاً —
     سعر كُتب في إذن استلام لم يُقدَّم للاعتماد لن يظهر هنا أبداً، بالتصميم.

   HONEST LIMITS — what this file does NOT do, stated not hidden.
   · Does not read `supplierInvoices` (no line items at all — schema.js) or
     `purchaseApprovals` (its price is an estimate, not what was actually
     paid, and its item field is free text, not a real link to the items
     table) — neither adds reliable actual per-item price data.
   · Does not compare its result against the item's old manual `lastPrice`
     field — Mohamed Zidan can compare the two numbers himself on the same
     screen; no automatic warning is built.
   · Historical accuracy depends on staff having actually submitted and
     approved the document — a price typed into a goods receipt never
     submitted for approval will never appear here, by design.

   -------------------------------------------------------------------------
   إضافي بالكامل · FULLY ADDITIVE — حذف هذا الملف يعيد سلوك اليوم بالضبط:
   شاشة الأصناف تُغلق تماماً كما كانت، بلا هذا القسم. لا لمسة واحدة على
   entity.js أو schema.js أو auth.js أو ui.js. لم يُوصَل بعد في loader.js
   ولا service-worker.js — انظر WIRING-NOTES.md المرافق في نفس المجلد.

   FULLY ADDITIVE — delete this file and today's behaviour returns exactly:
   the Items screen closes exactly as it does today, with no such section.
   Not one character of entity.js, schema.js, auth.js or ui.js changes. Not
   yet wired into loader.js or service-worker.js — see the accompanying
   WIRING-NOTES.md in this same folder.
   ========================================================================= */
(function (global) {
  'use strict';

  /* لا عمل بلا الأساسيات — دفاعي بحت، لأن ترتيب loader.js يضمن وجودها كلها
     فعلياً وقت تنفيذ هذا الملف (بعد store.js/schema.js/auth.js/ui.js/i18n.js
     وpages/entity.js جميعاً)؛ يحمي فقط من ترتيب مستقبلي مختلف لم نره بعد.
     No work without the basics — purely defensive, since loader.js's real
     order already guarantees all of these exist by the time this file runs
     (after store.js/schema.js/auth.js/ui.js/i18n.js and pages/entity.js);
     this only guards against a future reordering we have not seen yet. */
  if (typeof global === 'undefined' || !global.Store || !global.Auth || !global.Schema ||
      !global.UI || !global.I18N) return;

  /* ═══════════════════════════════════════════════════════════════════
     ١ · جمع البيانات — سطر مؤهَّل واحد لكل بند مقبول فعلياً في مستند مُعتمد
        DATA GATHERING — one qualifying row per genuinely-accepted line on
        an approved document
     ═══════════════════════════════════════════════════════════════════ */

  /* سطر واحد مؤهَّل: يخص الصنف المطلوب، وكميته المقبولة أكبر من صفر —
     مفتاح الفلترة الوحيد هو هذا الرقم، أبداً حقل rein نتيجة الفحص المنسدلة
     أعلى المستند. هذا السطر هو هدف حقن العطل في التجربة المرفقة، بنصّه
     الحرفي — أي تعديل في صياغته يجب أن يُصحَّح في التجربة أيضاً.
     One qualifying line: belongs to the wanted item, and its accepted
     quantity is greater than zero — that number is the ONLY filter key,
     never the header's inspection-result dropdown. This exact line is the
     fault-injection target in the accompanying trial, by its literal text
     — rewording it must be mirrored in the trial too. */
  function lineQualifies(ln, itemId) {
    return !!ln && ln.item === itemId && Number(ln.qtyAccepted) > 0;
  }

  /* يمسح كل إذون الاستلام المُعتمدة وغير العكسية، بعد تمريرها أولاً عبر
     نطاق الموقع/المشروع — لا Store.all خام أبداً. صف واحد لكل سطر مؤهَّل:
     تاريخ رأس المستند، المورد، والسعر (أو null إن كان صفراً/فارغاً/سالباً،
     فلا يفوز أبداً بلقب الأرخص لاحقاً).
     Scans every approved, non-reversal goods receipt, after first passing
     it through project/site scope — never raw Store.all. One row per
     qualifying line: the document header's date, the supplier, and the
     price (or null if zero/blank/negative, so it can never win "cheapest"
     later). */
  function gather(itemId) {
    var receipts = Auth.scopeRows('goodsReceipts', Store.all('goodsReceipts') || [])
      .filter(function (r) { return r && r.status === 'approved' && !r.isReversal; });

    var rows = [];
    receipts.forEach(function (r) {
      (r.lines || []).forEach(function (ln) {
        if (!lineQualifies(ln, itemId)) return;
        var priceNum = Number(ln.price);
        rows.push({
          receiptId: r.id,
          date: r.date,
          supplier: r.supplier,
          price: priceNum > 0 ? priceNum : null
        });
      });
    });
    return rows;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · الأرخص على الإطلاق، وترتيب العرض
        CHEAPEST EVER, and the display order
     ═══════════════════════════════════════════════════════════════════ */

  /* مقارنة نصية صرفة على تواريخ ISO ('YYYY-MM-DD'، I18N.today()) — تعمل
     بشكل صحيح ومحدَّد دائماً بلا أي اعتماد على لغة الجهاز (localeCompare
     تتأثر باللغة، المقارنة النصية المباشرة لا تتأثر بشيء).
     Plain string comparison on ISO dates ('YYYY-MM-DD', I18N.today()) —
     always correct and deterministic, with no locale dependency at all
     (localeCompare is locale-sensitive; plain string comparison is not). */
  function dateKey(row) { return String(row.date || ''); }

  function cheapestOf(rows) {
    var priced = rows.filter(function (r) { return r.price !== null; });
    if (!priced.length) return null;
    priced.sort(function (a, b) {
      var da = dateKey(a), db = dateKey(b);
      return da < db ? -1 : da > db ? 1 : 0;
    });
    /* مقارنة صارمة (< لا <=) — كسر تعادل السعر يبقى للأقدم لأنه يظهر أولاً
       بعد الترتيب التصاعدي أعلاه ولا يُستبدَل بمساوٍ له لاحقاً.
       Strict comparison (< not <=) — a price tie stays with the earliest
       occurrence because it appears first after the ascending sort above
       and is never replaced by a later equal value. */
    var best = priced[0];
    for (var i = 1; i < priced.length; i++) {
      if (priced[i].price < best.price) best = priced[i];
    }
    return best;
  }

  function sortNewestFirst(rows) {
    return rows.slice().sort(function (a, b) {
      var da = dateKey(a), db = dateKey(b);
      return da < db ? 1 : da > db ? -1 : 0;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · بناء القسم — نصوص واستحقاق التسمية من الحقول الحقيقية نفسها
        BUILDING THE SECTION — labels resolved from the real fields
        themselves, never invented strings
     ═══════════════════════════════════════════════════════════════════ */

  /* عناوين الأعمدة مأخوذة من تعريفات schema.js الحقيقية لنفس المفاهيم —
     لا نص جديد يخترع مصطلحاً مختلفاً لِما له اسم رسمي بالفعل في البوابة.
     Column headings pulled from schema.js's own real field definitions for
     the same concepts — no new text inventing a different term for
     something that already has an official name in the portal. */
  function priceFieldLabel() {
    var mod = Schema.get('goodsReceipts');
    var fields = (mod && mod.lines && mod.lines.fields) || [];
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].name === 'price') return fields[i].label;
    }
    return { ar: 'السعر', en: 'Price' };
  }

  function sectionHTML(rows) {
    var html = '<div class="form-section-title">' + UI.esc(L({
      ar: 'تاريخ الأسعار وأرخص مورد', en: 'Purchase price history & cheapest supplier'
    })) + '</div>';

    if (!rows.length) {
      return html + UI.empty(
        L({ ar: 'لا يوجد سجل أسعار بعد', en: 'No price history yet' }),
        L({ ar: 'لم يُعتمد أي إذن استلام يتضمن هذا الصنف حتى الآن.',
            en: 'No approved goods receipt including this item yet.' })
      );
    }

    var dateField = Schema.field('goodsReceipts', 'date');
    var supplierField = Schema.field('goodsReceipts', 'supplier');

    /* نداء الأرخص يُخفى تماماً إن لم يوجد سعر واحد مسجَّل حقيقي — لا نُعلن
       رقماً غير موجود، الجدول أدناه وحده يكفي لعرض «— غير مسجَّل» في كل صف.
       The cheapest callout is fully omitted when no genuinely priced row
       exists — we never announce a number that is not there; the table
       below alone is enough, showing "— not recorded" on every row. */
    var best = cheapestOf(rows);
    if (best) {
      html += '<div class="alert alert-info">' + UI.icon('eye', 17) + '<span>' +
        UI.esc(L({ ar: 'أرخص سعر سُجِّل لهذا الصنف على الإطلاق: ',
                    en: 'Cheapest price ever recorded for this item: ' })) +
        '<strong class="money">' + I18N.money(best.price) + '</strong>' +
        ' — ' + UI.esc(Schema.refLabel(supplierField, best.supplier)) +
        ' — <span class="num">' + I18N.date(best.date) + '</span>' +
        '</span></div>';
    }

    html += '<div class="table-wrap"><table class="data-table lines-table"><thead><tr>' +
      '<th>' + UI.esc(L(dateField ? dateField.label : { ar: 'التاريخ', en: 'Date' })) + '</th>' +
      '<th>' + UI.esc(L(supplierField ? supplierField.label : { ar: 'المورد', en: 'Supplier' })) + '</th>' +
      '<th>' + UI.esc(L(priceFieldLabel())) + '</th>' +
      '</tr></thead><tbody>';

    sortNewestFirst(rows).forEach(function (r) {
      html += '<tr><td><span class="num">' + I18N.date(r.date) + '</span></td>' +
        '<td>' + UI.esc(Schema.refLabel(supplierField, r.supplier)) + '</td>' +
        '<td>' + (r.price !== null
          ? '<span class="money">' + I18N.money(r.price) + '</span>'
          : '<span class="muted">' + UI.esc(L({ ar: '— غير مسجَّل', en: '— not recorded' })) + '</span>') +
        '</td></tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · العرض — يُستدعى بعد أن ترسم entity.js الشاشة الأساسية بالتزامن
        RENDER — called after entity.js has already drawn the base screen,
        synchronously
     ═══════════════════════════════════════════════════════════════════ */
  function render(id) {
    var item = Store.find('items', id);
    if (!item) return;   /* السجل حُذف أثناء النقر · record deleted mid-click */

    /* modalHost.hidden هو نفسه العلم الذي يستعمله ui.js لإظهار/إخفاء
       النافذة كاملة (modal(): host.hidden=false · closeModal():
       host.hidden=true) — دفاعي بحت، فـ openDetail الحقيقي ينادي
       UI.modal() دون أي مخرج مبكر قبلها متى وُجد السجل.
       modalHost.hidden is the exact flag ui.js itself uses to show/hide
       the whole window (modal(): host.hidden=false · closeModal():
       host.hidden=true) — purely defensive, since the real openDetail
       calls UI.modal() with no early exit before it once the record
       exists. */
    var host = document.getElementById('modalHost');
    var modalBody = document.getElementById('modalBody');
    if (!modalBody || (host && host.hidden)) return;

    /* الحارس الأول: طبقة الصلاحية — انظر شرح الملف أعلاه · GUARD ONE:
       permission layer — see the file header above. */
    if (!Auth.canSee('goodsReceipts')) return;

    var rows = gather(id);

    /* عنصر جديد خاص بنا فقط — لا نلمس innerHTML الخاص بـ modalBody نفسه،
       فلا خطر إطلاقاً على محتوى entity.js الأساسي المرسوم للتوّ.
       A brand-new element that belongs only to us — we never touch
       modalBody's own innerHTML directly, so there is zero risk to the
       base entity.js content just rendered. */
    var section = document.createElement('div');
    section.className = 'form-section';
    section.id = 'azPriceHistorySection';
    section.innerHTML = sectionHTML(rows);
    modalBody.appendChild(section);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · التركيب — بلا لمس entity.js، نفس نمط attachment-reader.js
        INSTALL — without touching entity.js, same shape as
        attachment-reader.js
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.EntityPage || EntityPage.__azPriceHistoryInstalled) return;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      if (moduleId !== 'items') return;   /* صفر عمل لبقية الثلاثين شاشة تقريباً */
      render(id);
    };
    EntityPage.__azPriceHistoryInstalled = true;
    console.info('purchase-price-history.js ready — «تاريخ الأسعار وأرخص مورد» يظهر عند فتح أي صنف.');
  }

  install();
  /* EntityPage موجودة يقيناً وقت تحميل هذا الملف (ترتيب loader.js يضمن
     ذلك)، لكن نُبقي إعادة المحاولة على نفس نمط attachment-reader.js/
     employee-count-fill.js تحسّباً لإعادة ترتيب مستقبلية لم نرها بعد.
     EntityPage is guaranteed to exist by the time this file loads
     (loader.js's order ensures it), but the retry is kept on the same
     pattern as attachment-reader.js/employee-count-fill.js in case of a
     future reordering we have not seen yet. */
  [0, 500, 2000, 5000].forEach(function (ms) { setTimeout(install, ms); });

  /* سطح اختبار — يتيح للتجربة المرفقة فحص منطق البيانات مباشرة (gather/
     cheapestOf) دون المرور بكامل مسار DOM في كل حالة.
     A test surface — lets the accompanying trial exercise the data logic
     directly (gather/cheapestOf) without going through the full DOM path
     for every case. */
  global.PurchasePriceHistory = {
    gather: gather, cheapestOf: cheapestOf, sortNewestFirst: sortNewestFirst, render: render
  };

})(window);
