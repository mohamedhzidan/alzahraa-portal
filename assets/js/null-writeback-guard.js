/* =========================================================================
   null-writeback-guard.js — يمنع محو الرواتب حين يُعاد حفظ عمود مُقنَّع
   THE NULL WRITE-BACK GUARD — a shown-as-null column can never erase data
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف — مُثبَت بالتشغيل الفعلي في
   TESTS/masked-null-writeback-trial.js (قسم A، الفحوص A.6/A.7/A.9/A.10)

   السلسلة كاملة (كل سطر منها قُرئ فعلياً قبل كتابة هذا الملف):
   ١) عرض قاعدة البيانات portal_employees (03-PRODUCTION-HARDENING.sql:
      133-150) يُعيد الأعمدة المُقنَّعة عن دور معيَّن كـ NULL صراحةً —
      لا يحذفها من الصف. hr_manager (أ. محمد عمارة) خارج قائمة الأدوار
      التي تُلغي التقنيع، فتصله basicSalary وثمانية أعمدة أخرى NULL دائماً.
   ٢) store.js:73 يقرأ من هذا العرض بالذات، ويكتب لاحقاً إلى الجدول
      الأساسي employees مباشرة.
   ٣) pages/entity.js:493 يبني مسودة النموذج بنسخ JSON كامل من الصف
      المخزَّن في الذاكرة — فتحمل المسودة "basicSalary": null صراحةً حتى
      لو لم يفتح المستخدم خانة الراتب إطلاقاً — ثم :833 يرسل المسودة
      كلها إلى Store.save، لا الحقل الذي تغيّر وحده.
   ٤) store.js:398 — Store.save يدمج original (الصف المخزَّن، بقيمه
      المُقنَّعة) مع الرقعة، ويُرسِل الصف المُدمَج بالكامل، لا الرقعة
      وحدها. و clean() (store.js:49-58) يحذف فقط null/undefined أثناء
      … بل يحذف المفاتيح التي قيمتها undefined فقط؛ null يبقى صريحاً في
      الحمولة المرسَلة للخادم. النتيجة: تعديل «المسمى الوظيفي» وحده يمحو
      تسعة أعمدة حقيقية في الجدول الأساسي بصمت تام، بلا خطأ، بلا أثر في
      سجل التدقيق (لأن «قبل» الذي يُقارَن به سجل التدقيق هو نفسه النسخة
      المُقنَّعة — audit-trail.js:235-241).

   THE FULL PROVEN CHAIN: the view returns masked columns AS NULL, never
   omitted (root cause 1); store.js reads via that view and writes to the
   base table (2); entity.js's draft is a full JSON copy of the cached
   (masked) row, so it carries basicSalary:null even when the salary box
   was never touched (3); Store.save merges the WHOLE original row with
   the patch and sends the merged row, and clean() only drops keys whose
   value is undefined — null survives and reaches the server as an
   explicit column value (4). One innocent edit to jobTitle silently
   erases nine real columns, with no error and no audit trail entry.

   -------------------------------------------------------------------------
   ⚠️ لماذا الحارس هنا مبني على القيمة، لا على Auth.fieldHidden/SENSITIVE
   -------------------------------------------------------------------------
   اقتراح سابق — أحدها مني أنا — كان ربط هذا الحارس بـ Auth.fieldHidden.
   هذا خطأ أثبته قارئ الملفات الحقيقية: auth.js:56 يضع hr_manager نفسه
   داخل SENSITIVE_ROLES، فـ fieldHidden('employees','basicSalary') تُرجع
   false بالضبط لحساب أ. محمد عمارة — أي أن المتصفح "يظن" أنه مسموح له
   برؤية الراتب بينما قاعدة البيانات تُقنِّعه فعلاً. المتصفح وقاعدة
   البيانات مختلفان هنا، وهذا الاختلاف هو شكل العطل نفسه — فحارس مبني على
   أحد طرفي الاختلاف يتعطّل بالضبط في الحالة التي بُني من أجلها.
   القاعدة هنا مختلفة تماماً ولا تسأل «من يملك الإذن؟» بل تسأل حرفياً:
   «هل كانت هذه القيمة فارغة أصلاً على الشاشة التي رآها المستخدم؟» — وهو
   سؤال لا علاقة له بأي دور، فلا يتأثر إن تغيّرت الأدوار أو قائمة التقنيع
   مستقبلاً، ويغطي أيضاً email/notes التي لا يعرفها Auth.SENSITIVE، ولا
   يتأثر بتعديل SENSITIVE وقت التشغيل (payroll-insurance.js:119-120).

   A PREVIOUS SUGGESTION — including one of mine — was to key this guard
   off Auth.fieldHidden/Auth.SENSITIVE. Proven wrong by reading the real
   files: auth.js:56 puts hr_manager INSIDE SENSITIVE_ROLES, so
   fieldHidden('employees','basicSalary') returns FALSE for exactly أ.
   محمد عمارة's account — the browser believes he may read the salary
   while the database is masking it. That browser/database disagreement
   IS the bug's shape, so a guard keyed to one side of it fails on the
   exact case it exists to fix. This rule asks a different question
   entirely — not "who may read this?" but "was this value already blank
   on the screen the user saw?" — which needs no role at all, cannot
   drift when roles or the view's unmask list change later, covers
   email/notes (which Auth.SENSITIVE does not list), and is unaffected by
   SENSITIVE being mutated at runtime by payroll-insurance.js.

   -------------------------------------------------------------------------
   يحمي أيضاً مسار «إلغاء المستند» (audit-trail.js:190 cancelRecord/
   deleteRecord): ذلك المسار يستدعي Store.save برقعة من أربعة مفاتيح فقط
   (deleted/deletedAt/deletedBy/deleteReason)، لكن store.js:398 يدمج
   الرقعة مع original كاملاً — فتُحمَل قيم original المُقنَّعة (null) في
   الصف المُرسَل حتى لو لم تكن أصلاً في الرقعة. لهذا يفحص هذا الحارس
   اتحاد مفاتيح original والرقعة معاً، لا مفاتيح الرقعة وحدها — وإلا
   لظلّ إلغاء أي مستند موظف من قِبل عمارة يمحو رواتبه كما يفعل التعديل
   العادي بالضبط.

   This also protects the Cancel path (audit-trail.js:190
   cancelRecord/deleteRecord): it saves a 4-key patch, but store.js:398
   merges that patch into the FULL original row and sends the merge — so
   original's masked nulls ride along even though the patch never
   mentioned them. That is why this guard checks the UNION of original's
   keys and the patch's keys, not the patch's keys alone — otherwise
   cancelling any employee record would erase the same nine columns just
   as surely as an ordinary edit does.

   -------------------------------------------------------------------------
   القاعدة، بالضبط:
   لكل مفتاح في (original ∪ patch): إن كانت القيمة الصادرة (patch[key] إن
   وُجد، وإلا original[key]) فارغة (null/undefined/'') وكانت القيمة
   المخزَّنة أصلاً في original فارغة أيضاً → نجعل patch[key] = undefined
   قبل تسليم الاستدعاء للأصل. Object.assign في store.js:398 ينسخ
   undefined فوق قيمة original، فيحذفها clean() (store.js:54) تماماً —
   فلا يصل العمود إلى الحمولة أصلاً، فيبقى كما هو في قاعدة البيانات.
   كتابة null فوق ما رآه المستخدم أصلاً على أنه null هي دائماً عملية
   لا أثر لها منطقياً — لهذا هذا آمن لكل جدول ولكل دور بلا استثناء.

   مسح حقيقي مقصود يبقى يعمل: إن كانت القيمة المخزَّنة أصلاً غير فارغة
   (يملك المستخدم صلاحية رؤيتها فعلاً) وأرسل المستخدم قيمة فارغة عمداً،
   تمرّ كما هي دون أي تدخّل من هذا الملف — انظر فحص B الجديد في الاختبار.

   THE EXACT RULE: for every key in (cached original ∪ patch), if the
   OUTGOING value (patch[key] if present, else original[key]) is
   null/undefined/'' AND the value already cached in original was also
   null/undefined/'' → set patch[key] = undefined before delegating.
   store.js's Object.assign then copies that undefined over original's
   value, and clean() drops the key entirely — the column never enters
   the payload, so it is left untouched in the database. Writing null
   over what the user was shown as null is always a semantic no-op, so
   this is safe for every table and every role without exception.

   A genuine, intended clear still works: if the value cached in
   original was NOT empty (the user really could see it) and the user
   deliberately sent an empty value, it passes straight through
   untouched — see the trial's control case for exactly this.

   إضافي بالكامل · ADDITIVE — حذف هذا الملف يعيد سلوك اليوم بالضبط، بما
   في ذلك العطل. لا لمسة واحدة على store.js. يُحمَّل مباشرة بعد
   assets/js/store.js في loader.js — قبل schema.js وauth.js، فلا يعتمد
   على Auth ولا Schema إطلاقاً، ويصبح أقرب لفّة إلى Store.save الأصلية،
   فتُطبَّق قاعدته قبل أي لفّة لاحقة (save-guard.js، audit-trail.js).
   FULLY ADDITIVE — delete this file and today's behaviour returns
   exactly, bug included. No touch on store.js. Loaded immediately after
   assets/js/store.js in loader.js — before schema.js and auth.js, so it
   needs neither, and becomes the innermost wrap around Store.save, so
   its rule applies before any later wrap (save-guard.js, audit-trail.js)
   ever runs.
   ========================================================================= */
(function (global) {
  'use strict';

  function empty(v) { return v === null || v === undefined || v === ''; }

  /* الفحص الفعلي — انظر «القاعدة، بالضبط» أعلاه لسبب كل سطر.
     THE ACTUAL CHECK — see "THE EXACT RULE" above for why each line exists. */
  function stripMaskedNulls(original, patch) {
    if (!original || !patch || typeof patch !== 'object') return;
    var keys = {};
    Object.keys(original).forEach(function (k) { keys[k] = true; });
    Object.keys(patch).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (key) {
      var outgoing = (key in patch) ? patch[key] : original[key];
      if (!empty(outgoing)) return;          /* قيمة حقيقية صادرة — لا تُلمَس إطلاقاً */
      if (!empty(original[key])) return;     /* كانت القيمة حقيقية أصلاً — مسح مقصود، يمرّ كما هو */
      patch[key] = undefined;                /* كانت فارغة، وستظل فارغة — لا داعي لإرسالها أصلاً */
    });
  }

  function install() {
    if (!global.Store || Store.__nullWritebackGuard) return;
    Store.__nullWritebackGuard = true;

    var origSave = Store.save;
    Store.save = function (table, id, patch /* , opts */) {
      /* Store.find هنا حتماً هو ما سيراه الدمج داخل store.js:398 نفسه —
         نقرأه في نفس اللحظة، لا ننسخه مسبقاً، حتى لا نقارن بنسخة قديمة. */
      var original = Store.find(table, id);
      stripMaskedNulls(original, patch);
      return origSave.apply(Store, arguments);
    };

    console.info('null-writeback-guard.js ready — a value shown as blank can no longer erase real data on save.');
  }

  install();
  /* store.js يوجد فور تحميله في loader.js، لكن نُبقي إعادة المحاولة على
     نفس نمط save-guard.js وaudit-trail.js تحسّباً لأي إعادة بناء لاحقة
     لكائن Store لم نرها بعد. */
  [0, 500, 2000, 5000].forEach(function (ms) { setTimeout(install, ms); });

  global.NullWritebackGuard = { strip: stripMaskedNulls, install: install };
})(window);
