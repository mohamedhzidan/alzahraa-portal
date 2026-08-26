/* =========================================================================
   lookup-loader.js — يملأ القوائم المنسدلة التي لا تفتح شاشتها
                      Fills dropdowns for screens the role cannot open
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   صلاحية «lookup» موجودة في auth.js منذ إضافتها (auth.js:15-17، 822-826)
   وتَعِد بأن أي دور معه lookup على شاشة يستطيع اختيار اسم من قائمتها
   المنسدلة دون فتح الشاشة نفسها. لكن هذا الوعد لم يتحقق أبداً:

     · قوائم الاختيار (ref) في pages/entity.js تُبنى من Store.all(table)
       (entity.js:581 و:742).
     · Store لا يجلب من الخادم إلا الجداول التي يسمح بها
       Auth.canSee(mod.id) (store.js:60-68 — tableNames()).
     · canSee تشترط 'view' فقط (auth.js:818)، وLOOKUP لا تحتوي 'view'.
     · Auth.canLookup موجودة ومُصدَّرة (auth.js:822-826) لكن لا يستدعيها
       أي ملف في المشروع — تحقّقنا بالبحث في كل assets/js.

   فالنتيجة: أي دور معه lookup فقط على شاشة يرى قائمة اختيار فارغة
   تماماً، وكأن الصلاحية غير موجودة إطلاقاً.

   `lookup` has existed in auth.js since it was added (auth.js:15-17,
   822-826) and promises that a role holding it on a screen can resolve a
   name in that screen's dropdown without opening the screen itself. That
   promise was never delivered:

     · ref dropdowns in pages/entity.js are built from Store.all(table)
       (entity.js:581 and :742).
     · Store only fetches tables Auth.canSee(mod.id) allows
       (store.js:60-68 — tableNames()).
     · canSee requires 'view' only (auth.js:818), and LOOKUP never
       contains 'view'.
     · Auth.canLookup exists and is exported (auth.js:822-826) but is
       called nowhere else — confirmed by grepping every file in
       assets/js.

   Result: any role with lookup-only on a screen sees a completely empty
   dropdown, as if the permission did not exist at all.

   الحل · THE FIX

   بعد كل تهيئة لـ Store، نجلب من الخادم مباشرة — عبر Auth.client()، بنفس
   أسلوب attachments.js — كل جدول لصلاحية الدور عليه lookup فقط (لا view).
   نخزّن الصفوف في مخزن جانبي خاص بهذا الملف، ونغلّف Store.all وStore.find
   ليصلا إليه فقط عندما تكون الذاكرة الأصلية فارغة **و** الجدول من هذا
   النوع تحديداً — الصفوف التي وصلت عبر Store العادي تبقى كما هي، لا نمسّها.

   After every Store initialization, we fetch straight from the server —
   through Auth.client(), the same way attachments.js does — every table
   the role holds lookup-only (not view) on. Rows land in a private side
   cache local to this file, and Store.all / Store.find are wrapped to
   fall back to it only when the real cache is empty **and** the table is
   one of these lookup-only ones — rows that arrived through the normal
   Store are left completely untouched.

   ما يُجلب فقط · WHAT IS FETCHED, AND NOTHING ELSE

   auth.js:15-17 يَعِد أن lookup «لا يقرأ أي حقل حساس». هذا الملف يأخذ
   الوعد حرفياً: id فقط + أعمدة العنوان (name، docNo، code) + status —
   لا مرتب، لا رقم قومي، لا حساب بنكي، ولا أي حقل آخر مهما كان الجدول.

   auth.js:15-17 promises lookup "reads no sensitive field." This file
   takes that literally: id only, plus the label columns (name, docNo,
   code) and status — no salary, no national ID, no bank account, no
   other field, whatever the table.

   بلا اتصال · OFFLINE

   إن كان Auth.client() فارغاً (غير متصل) لا نرمي خطأ أثناء الدخول —
   نتجاهل بصمت ونعيد المحاولة عند أول حدث Store تالٍ. القوائم تبقى
   فارغة كما هي اليوم، لا أسوأ.

   If Auth.client() is null (offline), we never throw during login — we
   no-op silently and retry on the next Store event. Dropdowns stay
   empty exactly as they are today, never worse.

   هذا يفكّ كل قائمة اختيار في الموقع لا الثلاث فقط · THIS UN-BREAKS
   EVERY LOOKUP DROPDOWN PORTAL-WIDE, NOT ONLY THE THREE IN THIS BATCH

   الشرط Auth.canLookup(mod.id) && !Auth.canSee(mod.id) عام على كل شاشات
   Schema.MODULES — هذا هو التصميم الذي وعد به auth.js أصلاً، لا استثناء
   محلي لثلاث شاشات فقط.

   The condition Auth.canLookup(mod.id) && !Auth.canSee(mod.id) applies to
   every screen in Schema.MODULES — this is the design auth.js already
   promised, not a local exception carved out for three screens.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود كل شيء لسابق عهده
   تماماً: القوائم المبنية على lookup فقط تعود فارغة كما كانت قبل الدفعة.
   Delete this file and everything reverts exactly: dropdowns built on
   lookup-only permission go back to empty, same as before this batch.

   ترتيب التحميل · LOAD POSITION

   يجب أن يأتي بعد auth.js وstore.js وschema.js (يستعمل الثلاثة). وُضع
   بعد منطقة save-guard.js/access-check.js تحديداً لأن هذين الملفين هما
   من يُثبتان أن Store أصبح متصلاً بدور معروف يمكن الوثوق بصلاحياته —
   قبلهما قد يكون az_role() فارغاً (انظر تعليق access-check.js) فتُقرأ
   صلاحيات lookup من مستخدم لم تُتحقق هويته بعد على الخادم.

   Must load after auth.js, store.js and schema.js (it uses all three).
   Placed right after the save-guard.js/access-check.js region because
   those two files are what prove Store is now talking to a database
   role it can trust — before them az_role() can still be null (see
   access-check.js's own comment), so reading lookup permissions any
   earlier could act on a user whose identity the server has not yet
   confirmed.
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Store || !global.Auth || !global.Schema) {
      console.error('lookup-loader.js: store.js, auth.js and schema.js must load first');
      return;
    }
    if (global.Store.__lookupLoaderInstalled) return;
    global.Store.__lookupLoaderInstalled = true;

    var Store = global.Store, Auth = global.Auth, Schema = global.Schema;

    /* أعمدة العنوان المسموح بها فقط — لا شيء غيرها مهما كان الجدول
       the only label columns ever selected — nothing else, whatever the table */
    var LABEL_COLS = ['name', 'docNo', 'code'];

    var sideCache = {};   /* table -> rows، خاص بهذا الملف فقط */
    var done = false;     /* اكتملت محاولة الجلب لهذه الجلسة */
    var lastUserId = null;

    function targets() {
      var out = [];
      (Schema.MODULES || []).forEach(function (mod) {
        if (Auth.canLookup(mod.id) && !Auth.canSee(mod.id)) out.push(mod);
      });
      return out;
    }

    /* أعمدة الاختيار لهذا الجدول: id + status إن كان حقلاً حقيقياً أو
       الشاشة سير عمل (status عمود نظامي حينها) + أي من name/docNo/code
       موجود فعلاً كحقل — docNo عمود نظامي أيضاً على شاشات سير العمل حتى
       حين لا يظهر في fields. هذا يمنع طلب عمود غير موجود فيرفضه الخادم
       بالكامل (400) ويُسقط كل الأعمدة الأخرى معه.

       Select columns for this table: id + status if it is either a real
       field or the module is workflow (status is then a system column) +
       whichever of name/docNo/code is an actual field — docNo is also a
       system column on workflow screens even when absent from `fields`.
       This avoids asking for a column that does not exist, which the
       server refuses for the WHOLE request (400), taking every other
       column down with it. */
    function selectCols(mod) {
      var fields = mod.fields || [];
      var has = function (name) { return fields.some(function (f) { return f.name === name; }); };
      var cols = ['id'];
      LABEL_COLS.forEach(function (c) {
        if (has(c) || (c === 'docNo' && mod.workflow)) cols.push(c);
      });
      if (has('status') || mod.workflow) cols.push('status');
      return cols;
    }

    /* تُعيد true إذا **ردّ الخادم** — نجاحاً كان أو رفضاً — وfalse فقط
       إذا لم يصل الطلب أصلاً (شبكة مقطوعة). هذا الفرق هو ما يقرّر إعادة
       المحاولة: رفض الخادم جواب نهائي لا يُعاد، وانقطاع الشبكة ليس جواباً.
       Returns true when the SERVER ANSWERED — success or refusal — and
       false only when the request never got there (dead network). That
       distinction is what decides retrying: a refusal is a final answer
       and must not loop; a dead network is not an answer at all. */
    async function fetchOne(client, mod) {
      var cols = selectCols(mod);
      try {
        var res = await client.from(mod.table).select(cols.join(','));
        if (res.error) {
          /* عمود مفقود فعلياً أو رفض من قاعدة البيانات — لا نكرر
             المحاولة على هذا الجدول، ونترك القائمة فارغة كما كانت قبل
             هذا الملف بدل تعليق الصفحة. a real column mismatch or an RLS
             refusal — do not retry this table forever; leave its
             dropdown empty as before this file, rather than hang. */
          console.warn('lookup-loader.js: could not load ' + mod.table + ' — ' + res.error.message);
          return true;
        }
        sideCache[mod.table] = res.data || [];
        return true;
      } catch (e) {
        console.warn('lookup-loader.js: could not load ' + mod.table, e);
        return false;   /* شبكة — نعاود المحاولة · network — retry later */
      }
    }

    async function loadAll() {
      var client = Auth.client();
      if (!client) return; /* بلا اتصال — نعاود المحاولة عند حدث Store التالي */

      var u = Auth.current();
      var uid = u && u.id;
      if (uid !== lastUserId) {
        /* مستخدم جديد دخل بدور مختلف — نبدأ المخزن الجانبي من الصفر
           حتى لا يظهر لدور جديد بقايا صلاحيات الدور السابق.
           a different user logged in with a different role — start the
           side cache clean so a new role never sees leftovers from the
           previous one. */
        sideCache = {};
        lastUserId = uid;
        done = false;
      }
      if (done) return;

      var mods = targets();
      var answered = 0, filled = 0;
      for (var i = 0; i < mods.length; i++) {
        var before = sideCache[mods[i].table];
        if (await fetchOne(client, mods[i])) answered++;
        if (sideCache[mods[i].table] !== before) filled++;
      }
      /* ⚠️ لا نُعلن الانتهاء إلا إذا نجح جلب واحد على الأقل.
         كانت النسخة الأولى تضع done = true حتى لو فشل كل شيء بسبب
         انقطاع الشبكة — فتبقى القوائم فارغة إلى أن يُحدِّث المستخدم
         الصفحة، رغم أن التعليق أسفله يَعِد بإعادة المحاولة. الآن
         الفشل الشبكي يترك done = false فتُعاد المحاولة عند حدث Store
         التالي، أي بمجرد عودة الاتصال.
         ⚠️ Only declare success if at least one fetch actually landed.
         The first version set done = true even when every fetch failed
         on a dead network, so the dropdowns stayed empty until the user
         reloaded — contradicting the retry promise in the comment
         below. Now a network failure leaves done = false and the retry
         happens on the next Store event, i.e. as soon as the connection
         returns. (No targets at all is a real, final answer, so that
         still counts as done.) */
      if (answered || !mods.length) done = true;
      if (filled) console.info('lookup-loader.js: filled ' + filled + ' lookup-only dropdown(s).');
    }

    /* ═════ تغليف Store.all وStore.find ═══════════════════════════════
       المخزن الحقيقي أولاً دائماً؛ المخزن الجانبي فقط حين يكون الأصلي
       فارغاً — وهو فارغ دوماً لهذه الجداول تحديداً لأن Store لا يجلبها
       أصلاً (tableNames() تشترط canSee). Store.find لازم أيضاً وإلا
       تعذّر على شاشة العرض ترجمة id المحفوظ سابقاً إلى اسم.

       The real cache always wins; the side cache only fills in when the
       real one is empty — which it always is for these exact tables,
       since Store never fetches them (tableNames() requires canSee).
       Store.find must be wrapped too, or a saved record can never
       resolve its stored id back to a name in the list/detail view. */
    var origAll = Store.all;
    Store.all = function (table) {
      var rows = origAll.call(Store, table);
      if (rows && rows.length) return rows;
      var side = sideCache[table];
      return (side && side.length) ? side.slice() : rows;
    };

    var origFind = Store.find;
    Store.find = function (table, id) {
      var rec = origFind.call(Store, table, id);
      if (rec) return rec;
      var side = sideCache[table];
      if (side) {
        for (var i = 0; i < side.length; i++) {
          if (side[i].id === id) return side[i];
        }
      }
      return rec;
    };

    /* ═════ التشغيل بعد الدخول ══════════════════════════════════════
       أول حدث Store يكون فيه isInitialized() صحيحاً يبدأ الجلب. إن كنا
       بلا اتصال حينها، loadAll() تعود دون فعل شيء وتترك done=false، فيعاد
       المحاولة تلقائياً عند أي حدث Store تالٍ (مثل online/synced).
       The first Store event where isInitialized() is true starts the
       fetch. If we are offline at that moment, loadAll() returns having
       done nothing and leaves done=false, so it retries automatically on
       any later Store event (such as online/synced). */
    Store.onChange(function () {
      if (!Store.isInitialized()) return;
      loadAll();
    });

    console.info('lookup-loader.js: installed.');
  }

  if (global.Store && global.Auth && global.Schema) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
