/* =========================================================================
   site-options.js — تصحيح قائمة اختيار «الموقع» وتغذيتها باسم صحيح
                     Fixes the "site" dropdown/ref, and feeds it a real name
   -------------------------------------------------------------------------
   البُگ الأول · BUG ONE — تسريب قائمة المواقع

   قائمة جدول sites عبر Store.all('sites') كانت تصل كاملة لأي دور — لا
   تُفلتَر إطلاقاً، بعكس صفوف الشاشات الأخرى (employees وwir وغيرها) التي
   يُقيّدها sites.js بالفعل بحقل site. النتيجة: مهندس في الروبيكي يفتح
   قائمة «الموقع» على أي نموذج فيرى اسم «سوهاج — مشروع رصف الطرق» رغم أنه
   لا يفتح ولا يرى أي سجل تابع له — لأن هذا التسريب في اسم الموقع نفسه لا
   في سجلاته.

   BUG ONE — the Sohag dropdown leak. sites.js already scopes every OTHER
   screen's rows by the "site" field, but sites.js:229-238 (scopeBySite)
   only runs on tables that HAVE a "site" field — the sites table itself
   never did, because a site row does not point at a site. So the sites
   table's own rows reached Store.all('sites') completely unfiltered, and
   an Elrobaki engineer opening any "Site" dropdown saw "Sohag — road
   paving project" listed, even though every Sohag-owned record stays
   invisible to them everywhere else.

   البُگ الثاني (كامن) · BUG TWO (latent) — over-filtering القرين/المكتب

   sites.js:225-226 (seesAllSites) يستدعي Store.find('sites', sid) ليعرف
   إن كان موقع المستخدم "allSites". قبل هذا الملف، Store.find('sites', …)
   كانت تعتمد فقط على الذاكرة الأصلية لـ Store — الفارغة لأي دور ليس معه
   canSee('sites') — أو على مخزن lookup-loader.js الجانبي إن وُجد. فإن لم
   تصل صفوف sites بأي طريق (دور بلا lookup على شاشة المواقع أصلاً)، يعود
   seesAllSites() بقيمة false زوراً لمستخدم في القرين أو المكتب يفترض أن
   يرى كل شيء — فتُخفى عنه سجلات مواقع أخرى هو مخوَّل لرؤيتها فعلاً.

   BUG TWO (latent, not yet reported) — sites.js:225-226 (seesAllSites)
   calls Store.find('sites', sid) to learn whether the user's OWN site row
   has allSites=true. Before this file, Store.find('sites', …) depended
   only on Store's real cache (empty for any role without canSee('sites'))
   or lookup-loader.js's side cache (only present if that role also holds
   lookup on the Sites screen specifically). If neither ever populated,
   seesAllSites() silently returned false for an Elqurien/HQ user who
   should see everything — hiding other sites' rows from someone actually
   entitled to see them. This never surfaced yet only because most roles
   that need seesAllSites() also happen to hold lookup on Sites.

   الحل · THE FIX

   نجلب لقطة كاملة من جدول sites مرة واحدة بعد كل دخول (نفس نمط
   lookup-loader.js:190-231 — Store.onChange + isInitialized + إعادة
   المحاولة عند فشل الشبكة فقط، وتصفير عند تغيّر المستخدم). نخزّنها في
   localStorage (أسماء مواقع فقط، لا شيء حساس) لتبقى تعمل بلا اتصال بعد
   إعادة تحميل الصفحة. ثم نلفّ Store.all وStore.find لجدول sites فقط:

     · Store.find يُكمَّل من اللقطة دائماً (OVERLAY لا فلترة) — يحل البُگ
       الثاني لأن seesAllSites() يحصل الآن على صف site حقيقي دوماً.
     · Store.all يستبدل اللقطة محل السلسلة الفارغة، ثم — فقط حين
       effectiveAllSites() قيمتها false — يُبقي على صف موقع المستخدم فقط،
       فيحل البُگ الأول.

   Fetch one full snapshot of public.sites per login (same trigger pattern
   as lookup-loader.js:190-231 — Store.onChange + isInitialized, reset on
   user change, retry only on network failure, never on a server refusal).
   Store it in localStorage — site names only, nothing sensitive — so an
   offline reload still works. Then wrap Store.all/Store.find for the
   'sites' table only:

     · Store.find always overlays the snapshot (never filters) — fixes bug
       two, because seesAllSites() now always gets a real site row back.
     · Store.all substitutes the snapshot for an empty chain result, then
       — only when effectiveAllSites() is false — narrows it to the user's
       own site row, fixing bug one.

   ترتيب التحميل — إلزامي · LOAD POSITION — load-bearing

   يجب أن يأتي بعد lookup-loader.js مباشرة، حتى يُثبَّت هذا التغليف فوق كل
   تغليف سابق لـ Store.all/Store.find (بما فيها تغليف lookup-loader.js
   نفسه). لو سبقه هذا الملف، سيَستدعي origAll/origFind هنا نسخة Store
   الأصلية غير الملفوفة بعد بـ lookup-loader، فيفوّت مصدرها الجانبي حين
   يكون هو الوحيد الذي يملأ صفوف sites لمستخدم لا يملك canSee('sites').

   Must load directly after lookup-loader.js, so this wrap installs
   OUTERMOST over every earlier wrap of Store.all/Store.find (lookup-
   loader.js's own wrap included). If this file loaded first, its
   origAll/origFind here would capture the still-unwrapped Store, missing
   lookup-loader's side cache whenever that side cache is the only source
   of sites rows for a user without canSee('sites').

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود سلوك جدول sites لسابق
   عهده تماماً: كل الصفوف تصل غير مُفلترة لكل دور، كما كان قبل هذه الدفعة.
   Delete this file and public.sites behaviour reverts exactly: every row
   reaches every role unfiltered, same as before this batch.
   ========================================================================= */
(function (global) {
  'use strict';

  var SNAPSHOT_KEY = 'az_site_options_snapshot';

  function install() {
    if (!global.Store || !global.Auth || !global.Schema) {
      console.error('site-options.js: store.js, auth.js and schema.js must load first');
      return;
    }
    if (global.Store.__siteOptionsInstalled) return;
    global.Store.__siteOptionsInstalled = true;

    var Store = global.Store, Auth = global.Auth;
    var snapshot = [];   /* لقطة كاملة من sites — لا تُفلتر أبداً هنا · full sites snapshot, never filtered itself */
    var done = false;
    var lastUserId = null;

    /* مخزن محلي فقط — أسماء وأكواد مواقع، لا شيء حساس. كل وصول محاط
       بـ try/catch لأن متصفحاً خاصاً قد يرفض الكتابة بصمت.
       Local storage only — site names/codes, nothing sensitive. Every
       access is wrapped in try/catch: a private-browsing tab can refuse
       writes silently. */
    function loadCached() {
      try {
        var raw = global.localStorage.getItem(SNAPSHOT_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    function saveCached(rows) {
      try { global.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(rows)); } catch (e) {}
    }

    snapshot = loadCached();

    /* تُعيد true إذا ردّ الخادم (نجاحاً أو رفضاً) — نفس منطق fetchOne في
       lookup-loader.js: رفض الخادم جواب نهائي لا يُعاد، وانقطاع الشبكة ليس
       جواباً. Returns true when the server answered, success or refusal —
       same logic as lookup-loader.js's fetchOne: a refusal is final and
       must not retry forever; a dead network is not an answer at all. */
    async function fetchSnapshot(client) {
      try {
        var res = await client.from('sites').select('id,name,code,"allSites",status');
        if (res.error) {
          console.warn('site-options.js: could not load sites — ' + res.error.message);
          return true;
        }
        if (res.data && res.data.length) {
          snapshot = res.data;
          saveCached(snapshot);
        }
        return true;
      } catch (e) {
        console.warn('site-options.js: could not load sites', e);
        return false;   /* شبكة — نعاود المحاولة · network — retry later */
      }
    }

    async function loadAll() {
      var client = Auth.client();
      if (!client) return; /* بلا اتصال — نعتمد على اللقطة المخزّنة محلياً */

      var u = Auth.current();
      var uid = u && u.id;
      if (uid !== lastUserId) {
        /* مستخدم جديد — لا نُصفّر اللقطة المحلية (تبقى صالحة لأي مستخدم،
           فأسماء المواقع ليست سرّية لأحد)، فقط نعيد محاولة الجلب.
           A different user logged in — we do NOT clear the local snapshot
           (site names are not secret from anyone), only reset the fetch
           attempt. */
        lastUserId = uid;
        done = false;
      }
      if (done) return;

      if (await fetchSnapshot(client)) done = true;
    }

    /* effectiveAllSites() — من يرى كل المواقع في القائمة المنسدلة
       who sees every site in the dropdown
       ترتيب الفحص · check order:
         ١) Auth.current().allSites === true  → تجاوز شخصي · personal override
         ٢) لا موقع للمستخدم                  → true (لا نحجب شركة كاملة يوم واحد)
         ٣) صف موقعه allSites === true         → true
         ٤) صف موقعه allSites === false        → false
         ٥) الصف غير معروف أو allSites غير معرّفة → true (FAIL OPEN)

       FAIL OPEN متعمَّد: تضييق قوائم القرين/المكتب في أول ثوانٍ بلا اتصال
       أسوأ من بقائها واسعة — صفوف البيانات نفسها محمية من قاعدة البيانات
       بصرف النظر عمّا تعرضه هذه القائمة (08-SITES.sql: az_can_site).
       FAIL OPEN is deliberate: narrowing Elqurien/HQ's dropdown during the
       first offline seconds is worse than leaving it wide — the actual
       data rows stay DB-protected regardless of what this dropdown shows
       (08-SITES.sql: az_can_site). */
    function effectiveAllSites() {
      var u = global.Auth && Auth.current();
      if (!u) return true;
      if (u.allSites === true) return true;
      var sid = u.site || null;
      if (!sid) return true;
      var row = null;
      for (var i = 0; i < snapshot.length; i++) {
        if (snapshot[i].id === sid) { row = snapshot[i]; break; }
      }
      if (!row || row.allSites === undefined || row.allSites === null) return true;
      return row.allSites === true;
    }

    /* ═════ تغليف Store.all لجدول sites فقط ════════════════════════════
       نأخذ نتيجة السلسلة (Store الحقيقي أو مخزن lookup-loader الجانبي)،
       نستبدل اللقطة محلها إن كانت فارغة، ثم نُضيّق حسب effectiveAllSites().
       Take the delegate chain's result (real Store or lookup-loader's side
       cache), substitute the snapshot when it is empty, then narrow by
       effectiveAllSites(). */
    var origAll = Store.all;
    Store.all = function (table) {
      var rows = origAll.call(Store, table);
      if (table !== 'sites') return rows;
      if (!rows || !rows.length) rows = snapshot.length ? snapshot.slice() : rows;
      if (!rows || !rows.length) return rows;
      if (effectiveAllSites()) return rows;
      var u = global.Auth && Auth.current();
      var mine = u && u.site;
      if (!mine) return rows;
      return rows.filter(function (r) { return r.id === mine; });
    };

    /* ═════ تغليف Store.find لجدول sites فقط — OVERLAY دائماً، لا عند
       الغياب الكامل فقط ═══════════════════════════════════════════════
       خطأ صُحِّح هنا: النسخة الأولى كانت fallback-only — تُرجع صف
       الوكيل (origFind) فور وجوده، ولو كان ناقصاً، ولا تلجأ للقطة إلا
       حين لا يوجد صف إطلاقاً. لكن lookup-loader.js يُعيد صفاً لجدول sites
       لكل دور تقريباً (الجميع يملك lookup على sites) — لكنه صف ناقص، لأن
       selectCols في ذلك الملف لا تطلب allSites إطلاقاً (lookup-loader.js
       LABEL_COLS لا تشمل allSites). فكان rec يصل غير فارغ دوماً فيتوقف
       الكود عند "if (rec) return rec"، ولا تصل اللقطة أبداً — تحديداً
       الحالة التي بُني هذا الملف من أجلها: أ. محمد عمارة في الخلاطة يبقى
       allSites غير معرّف فتُرجع seesAllSites() قيمة false زوراً رغم أن
       اللقطة معه صحيحة. الإصلاح: ندمج صف اللقطة (حين تصل) فوق صف الوكيل،
       فيربح allSites/name/code/status من اللقطة دوماً — لا فقط حين يغيب
       الصف بالكامل. حين لا تصل اللقطة بعد لهذا الموقع (لا اتصال، أول
       ثوانٍ) نُبقي صف الوكيل كما هو — فشل مفتوح متعمَّد، لا نُسقط بياناً
       نملكه فعلاً.
       Corrected here: the first version was fallback-only — it returned
       the delegate's row (origFind) the instant one existed, even
       incomplete, and only reached for the snapshot when no row existed
       at all. But lookup-loader.js DOES return a sites row for nearly
       every role (everyone holds lookup on sites) — just an INCOMPLETE
       one, because that file's selectCols never requests allSites
       (lookup-loader.js's LABEL_COLS excludes it). So rec was never
       empty, "if (rec) return rec" always fired, and the snapshot never
       got a chance — exactly the case this file exists to fix: أ. محمد
       عمارة at الخلاطة kept allSites undefined, so seesAllSites() falsely
       returned false even though the snapshot held the right answer. The
       fix: MERGE the snapshot row over the delegate's row whenever the
       snapshot has one, so allSites/name/code/status always win from the
       snapshot — not only when the row is missing entirely. When the
       snapshot has no row yet for this site (offline, first seconds) the
       delegate's row is returned unchanged — deliberate fail-open, never
       discarding data we already have. */
    var origFind = Store.find;
    Store.find = function (table, id) {
      var rec = origFind.call(Store, table, id);
      if (table !== 'sites') return rec;
      var snapRow = null;
      for (var i = 0; i < snapshot.length; i++) {
        if (snapshot[i].id === id) { snapRow = snapshot[i]; break; }
      }
      if (!snapRow) return rec;
      return Object.assign({}, rec || {}, snapRow);
    };

    Store.onChange(function () {
      if (!Store.isInitialized()) return;
      loadAll();
    });

    console.info('site-options.js: installed.');
  }

  if (global.Store && global.Auth && global.Schema) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
