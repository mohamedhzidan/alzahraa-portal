/* =========================================================================
   robot-role.js — يُسجِّل دور «robot» في المتصفح، تكملة للسور الذي بناه
                   الملف 20-ROBOT-ACCOUNT.sql في قاعدة البيانات وحدها
                   Registers the "robot" role in the browser — the missing
                   half of the fence 20-ROBOT-ACCOUNT.sql built in the
                   database alone
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف — مُثبَت بتجربة حقيقية (BUG-LEDGER.md، دفعة
   ٢٧ أغسطس ٢٠٢٦، run 4، TESTS/robot-role-login-trial.js 17/17)
   THE BUG THIS FILE PREVENTS — proven by a real trial (BUG-LEDGER.md,
   27 Aug 2026, run 4, TESTS/robot-role-login-trial.js 17/17)

   auth.js لا يعرف اسم الدور «robot» إطلاقاً — تسجيل الدخول ينجح، لكن
   permsFor() ترجع null بتحذير في الطرفية فقط، فتُمنع كل صلاحية في
   المتصفح: القائمة الجانبية تعرض ستة عناصر ثابتة فقط ولا شاشة عمل واحدة
   من ٣٣ شاشة يفترض أن يقرأها. حساب الاختبار الذي بناه محمد زيدان في
   Supabase يدخل بوابة فارغة — الأسوار في قاعدة البيانات مثالية،
   والمتصفح أعمى.

   auth.js does not know the role name "robot" at all — login succeeds,
   but permsFor() returns null with a console-only warning, so EVERY
   browser-side permission is denied: the side menu shows only its six
   fixed items, and none of the 33 screens it is meant to read. The test
   account Mohamed Zidan built in Supabase walks into an empty portal —
   the database's walls are perfect, the browser is blind.

   عطل ثانٍ مُثبَت مصاحب: زر «ملفي» (الملف الشخصي) يعطب — app.js:379
   يقرأ Auth.ROLES[u.role] بلا حراسة، فيعود undefined ثم app.js:387 يقرأ
   .desc من undefined فيرمي استثناءً. تسجيل الدور هنا يُصلح هذا تلقائياً
   لأن ROLES.robot يصبح موجوداً — app.js نفسه لا يُلمس (على قائمة القراءة
   فقط، ولا حاجة له).
   A second, accompanying proven crash: the "my profile" button breaks —
   app.js:379 reads Auth.ROLES[u.role] unguarded, gets undefined, then
   app.js:387 reads .desc off undefined and throws. Registering the role
   here fixes this automatically because ROLES.robot now exists — app.js
   itself is never touched (it is read-only, and does not need to be).

   -------------------------------------------------------------------------
   ⭐ الفخ الثاني الذي يمنعه هذا الملف — allProjects إجباري لا اختياري
      THE SECOND TRAP THIS FILE PREVENTS — allProjects is MANDATORY, not
      optional

   Auth.scopeRows (auth.js) يفشل مغلقاً: أي دور غير مُدرَج في
   GLOBAL_PROJECT_ROLES وبلا allProjects صريح يفقد كل صف يحمل مشروعاً بعد
   إعادة تحميل الصفحة (مُثبَت في G.1). لو سُجِّل الدور هنا بلا allProjects
   صراحةً، لاختفت سجلات الروبوت نفسه من الشاشة بعد أول تحديث — سور يحمي
   من لا أحد، ويعمي صاحبه عن عمله.

   Auth.scopeRows (auth.js) fails closed: any role not listed in
   GLOBAL_PROJECT_ROLES and without an explicit allProjects loses every
   row carrying a project after a reload (proven in G.1). If the role
   were registered here without allProjects, the robot's OWN rows would
   vanish from its screen after the very next refresh — a fence
   protecting nobody, and blinding its own occupant.

   -------------------------------------------------------------------------
   قوائم الصلاحيات — مطابقة حرفياً لِما بناه 20-ROBOT-ACCOUNT.sql في قاعدة
   البيانات، لا صلاحية جديدة تُخترع هنا
   THE PERMISSION LISTS — transcribed exactly from what
   20-ROBOT-ACCOUNT.sql already built in the database; no new authority is
   invented here

     · WRITE_SCREENS (33 جدولاً، view/create/edit/delete): نفس مصفوفة
       القسم ٥ في 20-ROBOT-ACCOUNT.sql (الأسطر ١٧٧-١٨٧) ناقص 'sites' —
       الجدول الوحيد من الـ٣٤ الذي لا شاشة بوابة له (مُثبَت في BUG-LEDGER).
       Same array as section 5 of 20-ROBOT-ACCOUNT.sql (lines 177-187)
       minus 'sites' — the only one of the 34 with no portal screen
       (proven in BUG-LEDGER).
     · READ_ONLY_SCREENS (11 جدولاً، view فقط): القسم ٤ (الأسطر ١٢٦-١٣٩)
       ناقص كل ما في WRITE_SCREENS — نفس الفارق الحسابي في BUG-LEDGER
       (٤٥ قراءة − ٣٤ كتابة = ١١).
       Section 4 (lines 126-139) minus everything in WRITE_SCREENS — the
       same arithmetic difference recorded in BUG-LEDGER (45 read − 34
       write = 11).
     · القسم ٦ (البشر) — employees/payroll/users/audit وكل عائلة الحضور
       والسلف والعقود: غائبة عمداً من كلتا القائمتين. الغياب هنا يعني
       رفضاً في auth.js تماماً كما تعني السياسة الغائبة رفضاً في
       القاعدة — سوران متطابقان، لا يُضاف أي منها هنا مهما حدث.
       Section 6 (humans) — employees/payroll/users/audit and the whole
       attendance/advances/contracts family: deliberately absent from
       both lists. Absence here means denial in auth.js exactly as an
       absent policy means denial in the database — two matching fences;
       none of these is ever added here, whatever happens.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود الدور «robot» غير معرَّف
   في المتصفح تماماً كما كان — تسجيل الدخول ينجح والصلاحيات كلها تُمنع
   بصمت (نفس ما كان قبل هذا الملف)، والقاعدة تبقى محمية كما هي دائماً.
   auth.js لم يُعدَّل بحرف واحد.
   ADDITIVE. Delete this file and the "robot" role goes back to being
   completely unknown in the browser, exactly as before — login succeeds
   and every permission is silently denied (the pre-existing state), and
   the database stays protected exactly as always. auth.js is not
   changed by one character.

   يُحمَّل مباشرة بعد auth.js — يحتاج Auth.ROLES موجوداً ليضيف إليه.
   Loads immediately after auth.js — needs Auth.ROLES to already exist to
   add to it.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Auth || !Auth.ROLES) { console.error('robot-role.js: auth.js must load first'); return; }
  if (Auth.ROLES.robot) return; /* مُسجَّل بالفعل — لا نستبدل شيئاً */

  var ALL   = ['view', 'create', 'edit', 'delete'];
  var VIEW  = ['view'];

  /* القسم ٥ في 20-ROBOT-ACCOUNT.sql (الأسطر ١٧٧-١٨٧) ناقص 'sites' فقط.
     Section 5 of 20-ROBOT-ACCOUNT.sql (lines 177-187) minus 'sites' only. */
  var WRITE_SCREENS = [
    'suppliers', 'customers', 'costItems', 'goodsReceipts',
    'items', 'warehouses', 'stockIssues', 'stockTransfers',
    'projects', 'clientContracts', 'subcontractors', 'subContracts',
    'drawings', 'siteReports', 'equipment', 'equipmentLogs',
    'legalDocs', 'itAssets', 'wir', 'mir',
    'pourCards', 'asphaltRecords', 'surveyRecords', 'ncr',
    'siteInstructions', 'safetyReports', 'docRegister', 'transmittals',
    'rfi', 'submittals', 'correspondence', 'distribution',
    'docArchive'
  ];

  /* القسم ٤ (الأسطر ١٢٦-١٣٩) ناقص كل ما في WRITE_SCREENS أعلاه.
     Section 4 (lines 126-139) minus everything already in WRITE_SCREENS. */
  var READ_ONLY_SCREENS = [
    'accounts', 'journal', 'purchaseApprovals', 'supplierInvoices',
    'payments', 'receipts', 'cashAccounts', 'stockCounts',
    'budgets', 'clientIPCs', 'subIPCs'
  ];

  var perms = { sites: VIEW };
  WRITE_SCREENS.forEach(function (t) { perms[t] = ALL; });
  READ_ONLY_SCREENS.forEach(function (t) { perms[t] = VIEW; });

  Auth.ROLES.robot = {
    label: { ar: 'حساب تجربة آلي', en: 'Automated test account' },
    desc: { ar: 'حساب اختبار مسوَّر بالكامل داخل قاعدة البيانات — يقرأ ويكتب سجلاته الخاصة فقط، مختومة بموقع وهمي، ولا يرى بيانات الموظفين أو الرواتب أو المستخدمين إطلاقاً',
            en: 'A test account walled off entirely inside the database — reads and writes only its own rows, stamped with an imaginary site, and never sees employee, payroll or user data' },
    dept: 'system',
    perms: perms,
    /* ⚠️ إجباري — انظر الشرح أعلى الملف. بلا هذا يفقد الروبوت سجلاته هو
       نفسه بعد أي تحديث للصفحة (Auth.scopeRows فشل مغلق).
       ⚠️ MANDATORY — see the explanation above. Without this the robot
       loses its OWN rows after any page reload (Auth.scopeRows fails
       closed). */
    allProjects: true,
    canManageUsers: false
  };

  console.info('robot-role.js: role "robot" registered in the browser — ' +
               WRITE_SCREENS.length + ' write screens, ' + READ_ONLY_SCREENS.length +
               ' read-only screens, human tables absent on purpose. auth.js itself is unchanged.');
})(window);
