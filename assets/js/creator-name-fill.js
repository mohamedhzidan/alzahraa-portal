/* =========================================================================
   creator-name-fill.js — يملأ اسم «قام بإنشائه» لدور لا يجلب Store له
                          جدول المستخدمين كاملاً
                          FILLS IN THE CREATOR'S NAME FOR A ROLE Store NEVER
                          LOADS THE FULL USERS TABLE FOR
   -------------------------------------------------------------------------
   المشكلة، مُثبَتة · THE PROBLEM, PROVEN (TESTS/approvals-inbox-trial.js A.6)

   store.js:62 يجلب جدول users كاملاً من الخادم لخمسة أدوار فقط:
   admin/gm/finance_manager/hr/auditor. لأي دور آخر — أ. محمد عمارة
   (hr_manager) في المقدمة، بالذات لأن صندوق الاعتماد الجديد لطلبات
   الإجازة يوجّهه إلى هذه الشاشة تحديداً — يبقى Store.all('users') في
   ذاكرة المتصفح صفّاً واحداً فقط: صفّ المستخدم نفسه (store.js:131-133
   يضيفه دوماً). فحين تطلب pages/approvals.js أو pages/entity.js اسم صاحب
   أي سجل آخر عبر Store.find('users', r.createdBy)، لا يوجد الصفّ، وتظهر
   «—» على كل سطر — عمارة لا يعرف على مَن يوقّع دون فتح كل مستند بنفسه.

   store.js:62 fetches the FULL users table from the server for only five
   roles: admin/gm/finance_manager/hr/auditor. For every other role — أ.
   محمد عمارة (hr_manager) foremost, precisely because the new leave
   approval inbox routes to this exact screen — the browser's
   Store.all('users') holds exactly one row: the user's own
   (store.js:131-133 always adds it). When pages/approvals.js or
   pages/entity.js ask for another record's creator via
   Store.find('users', r.createdBy), no row exists, and every line shows
   «—» — عمارة cannot see whose document he is signing without opening
   each one himself.

   -------------------------------------------------------------------------
   الحل، على نمط lookup-loader.js/site-options.js بالحرف · THE FIX, THE
   EXACT PATTERN lookup-loader.js/site-options.js ALREADY PROVE

   لأي دور خارج الخمسة، نجلب من الخادم مباشرة — عمودين اثنين فقط: id
   وname، من نفس الجدول المصدر الذي يستعمله Store نفسه (portal_users،
   store.js:71). لا بريد، لا دور، لا مشروعات، لا أي حقل آخر — لا نوسّع ما
   يُعرَض عن اسم المُنشئ إطلاقاً. نخزّنها في مخزن جانبي خاص بهذا الملف،
   ونغلّف Store.find فقط (ليس Store.all — انظر القسم التالي) لجدول users
   تحديداً: الصفّ الحقيقي يفوز دوماً، والمخزن الجانبي يُستشار فقط حين يكون
   الصفّ الحقيقي غائباً.

   For any role outside the five, we fetch straight from the server —
   exactly two columns: id and name, from the same source table Store
   itself uses (portal_users, store.js:71). No email, no role, no
   projects, no other field — we never widen what is shown about the
   creator. Rows land in a side cache private to this file, and only
   Store.find (never Store.all — see the next section) is wrapped, for
   table 'users' specifically: the real row always wins; the side cache is
   consulted only when the real row is missing.

   -------------------------------------------------------------------------
   عمداً لا نلفّ Store.all('users') · DELIBERATELY NOT WRAPPING Store.all

   Store.all('users') يغذّي شاشة إدارة المستخدمين (identity.js) ومؤشر
   المستخدمين النشطين في اللوحة (Auth.users()، auth.js:875-877) — كلاهما
   يحتاج الصفّ الكامل (البريد، الدور، الحالة...) لا اسماً فقط. مخزن جانبي
   بعمودين هناك سيُظهر بيانات ناقصة بدل أن يُصلح شيئاً. تلك الشاشات مقصورة
   على Auth.isAdmin() (admin/breakglass فقط، auth.js:983). ملاحظة جانبية
   مكتشَفة أثناء بناء هذا الملف: دور breakglass نفسه يملك canManageUsers
   =true لكنه ليس ضمن قائمة store.js:62 الخمسة، فشاشة إدارة المستخدمين
   تظهر له ناقصة (مستخدم واحد فقط) اليوم — عطل منفصل تماماً عن هذا الملف،
   غير مُصلَح هنا، مسجَّل في ROADMAP.md.

   Store.all('users') feeds the Users administration screen (identity.js)
   and the dashboard's active-users count (Auth.users(), auth.js:875-877)
   — both need the FULL row (email, role, status…), not a name only. A
   two-column side cache there would show incomplete data instead of
   fixing anything. Those screens are gated by Auth.isAdmin() (admin/
   breakglass only, auth.js:983). Side finding while building this file:
   breakglass itself holds canManageUsers=true but is NOT in store.js:62's
   five-role list, so its OWN Users admin screen already shows incomplete
   data (one user only) today — a separate bug, unrelated to this file,
   not fixed here, logged in ROADMAP.md.

   -------------------------------------------------------------------------
   الطبقات الثلاث · THE THREE LAYERS

   المتصفح: هذا الملف. القاعدة: غير معروف من هذا الجهاز هل سياسة القراءة
   على portal_users تسمح بهذا الاستعلام (id, name فقط) لأدوار خارج الخمسة
   — إن رفضتها، يفشل الجلب بصمت (نفس نمط lookup-loader.js: رفض نهائي من
   الخادم لا يُعاد تكراره) وتبقى «—» كما هي اليوم بالضبط، لا أسوأ. استعلام
   الفحص للمالك أسفل هذا الملف. Edge Function: لا علاقة إطلاقاً — قراءة
   مباشرة عبر عميل Supabase، لا admin-users في أي مسار من هذا الملف.

   Browser: this file. Database: UNKNOWN from this Mac whether the read
   policy on portal_users allows this exact query (id, name only) for
   roles outside the five — if refused, the fetch fails silently (same
   pattern as lookup-loader.js: a final server refusal is never retried)
   and «—» stays exactly as it is today, never worse. The owner's check
   query is at the bottom of this file. Edge Function: entirely
   uninvolved — a plain client read, admin-users is never on any path in
   this file.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود كل شيء كما كان قبل
   الدفعة تماماً: «—» يظهر مكان اسم منشئ أي سجل لدور خارج الخمسة.
   Delete this file and everything reverts exactly: «—» returns in place
   of the creator's name for any role outside the five.

   ترتيب التحميل · LOAD POSITION: مباشرة بعد site-options.js — كلاهما يلفّ
   Store.find، لكن على جدولين مختلفين تماماً (sites/users) فلا تصادم، ووُضع
   هنا ليجاور الملفات الأخرى التي تُتمّم عمداً ما فاته store.js.
   Right after site-options.js — both wrap Store.find, but on entirely
   different tables (sites/users), so no collision; placed here to sit
   beside the other files that deliberately complete what store.js misses.
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Store || !global.Auth) {
      console.error('creator-name-fill.js: store.js and auth.js must load first');
      return;
    }
    if (global.Store.__creatorNameFillInstalled) return;
    global.Store.__creatorNameFillInstalled = true;

    var Store = global.Store, Auth = global.Auth;

    /* نسخة حرفية من شرط store.js:62 — إن تغيّر هناك يجب تحديثه هنا أيضاً؛
       store.js في قائمة الملفات المحظور تعديلها إلا للضرورة، فلا يمكن هذا
       الملف قراءة شرطه الخاص وقت التشغيل.
       A literal copy of store.js:62's condition — if it ever changes
       there, update it here too; store.js is on the do-not-edit list, so
       this file cannot read its private condition at runtime. */
    var FULL_USERS_ROLES = ['admin', 'gm', 'finance_manager', 'hr', 'auditor'];

    var sideCache = {};   /* id -> {id, name} فقط · id -> {id, name} only */
    var done = false;
    var lastUserId = null;

    async function loadAll() {
      var u = Auth.current();
      if (!u) return;
      if (FULL_USERS_ROLES.indexOf(u.role) !== -1) { done = true; return; } /* Store نفسه يكفي هذا الدور · Store itself already covers this role */

      if (u.id !== lastUserId) {
        /* دور خارج الخمسة دخل بحساب مختلف — نبدأ المخزن الجانبي من الصفر
           a different excluded-role user logged in — start the side cache clean */
        sideCache = {};
        lastUserId = u.id;
        done = false;
      }
      if (done) return;

      var client = Auth.client();
      if (!client) return; /* بلا اتصال — نعاود المحاولة عند حدث Store التالي · offline — retry on the next Store event */

      try {
        var res = await client.from('portal_users').select('id, name');
        if (res.error) {
          /* رفض من القاعدة — جواب نهائي، لا نكرر المحاولة. تبقى «—» تماماً
             كاليوم، لا أسوأ. a database refusal — a final answer, do not
             retry. Stays at exactly today's «—», never worse. */
          console.warn('creator-name-fill.js: could not load creator names — ' + res.error.message);
          done = true;
          return;
        }
        (res.data || []).forEach(function (row) { sideCache[row.id] = row; });
        done = true;
      } catch (e) {
        console.warn('creator-name-fill.js: could not load creator names', e); /* شبكة — نعاود المحاولة · network — retry later */
      }
    }

    var origFind = Store.find;
    Store.find = function (table, id) {
      var rec = origFind.call(Store, table, id);
      if (table !== 'users' || rec) return rec;
      return sideCache[id] || rec;
    };

    Store.onChange(function () {
      if (!Store.isInitialized()) return;
      loadAll();
    });

    console.info('creator-name-fill.js: installed.');
  }

  if (global.Store && global.Auth) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);

/* ═════════════════════════════════════════════════════════════════════
   استعلام الفحص للمالك (اختياري) · OWNER'S CHECK QUERY (optional)

   في محرر SQL في Supabase — يبيّن هل سياسة القراءة على portal_users
   تسمح لأدوار خارج admin/gm/finance_manager/hr/auditor بقراءة id وname:

   select policyname, cmd, roles, qual
   from pg_policies
   where tablename in ('portal_users','users');

   إن كانت كل سياسة SELECT مقصورة على تلك الأدوار الخمسة فقط، فهذا الملف
   يفشل بصمت لكل دور آخر وتبقى «—» كما هي اليوم — لا خطر، لكن الإصلاح غير
   مكتمل حتى تُضاف سياسة قراءة محدودة (id, name فقط) لبقية الأدوار.
   If every SELECT policy is restricted to those five roles only, this file
   fails silently for every other role and «—» stays exactly as today — no
   danger, but the fix is not complete until a narrow read policy (id, name
   only) is added for the remaining roles.
   ═════════════════════════════════════════════════════════════════════ */
