/* =========================================================================
   hr-manager-links.js — يصل دور «مدير الموارد البشرية» بثلاث شاشات كانت
                          تتجاهله بسبب مطابقة حرفية على "hr"
                          Links the hr_manager role into three screens that
                          matched only the literal string "hr"
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   أ. محمد عمارة (hr_manager) يفتح المساعد فيجد إرشاد «الموظف العادي»
   الفارغ، ولوحة المفتّش تُظهر له صفراً من الفحوصات الـ٥٨ التلقائية —
   لأن knowledge.js وinspector.js يبحثان حرفياً عن الدور "hr" فقط ولا
   يعرفان "hr_manager" شيئاً. إخفاقا بحث (lookup misses) على نفس
   السلسلة الحرفية. والأخطر: أول سطر في الإرشاد الغائب هو «قارن هذا
   المسير بالشهر الماضي؛ أي فرق كبير له سبب» — وهو تحديداً الفحص الذي
   كان سيكشف خطأ صافي الراتب. الرجل الذي يشغّل الرواتب هو الوحيد الذي
   لا يُعرض عليه.

   Mohamed Amara (hr_manager) opens the assistant and gets the empty
   ordinary-employee guidance, and the inspector shows him zero of the
   58 automatic checks — because knowledge.js and inspector.js look up
   the literal string "hr" only and know nothing about "hr_manager".
   Two lookup misses on the same literal string. The sharpest part: the
   first line of the guidance he is missing is "compare this payroll
   with last month; any big change has a reason" — precisely the check
   that would have caught the net-pay bug. The man who runs payroll is
   the one person not shown it.

   الحل · THE FIX

   أسماء مستعارة (aliases) فقط — لا صلاحيات جديدة، فقط توصيل ما هو
   موجود بالفعل تحت اسم الدور الآخر. السابقة الموجودة فعلاً:
   KB.reviewer = KB.auditor في knowledge.js:527.

   Aliases only — no new permissions, just wiring what already exists
   onto the second role name. Precedent already in this codebase:
   KB.reviewer = KB.auditor at knowledge.js:527.

   ⭐ مجموعة «hr» فقط · "hr" group ONLY
   -------------------------------------------------------------------
   لا نُدخل hr_manager في AREA_ROLES.management ولا أي مجموعة أخرى —
   ذلك كان سيُظهر له نتائج مالية على مستوى الشركة كلها، بخلاف ما استقر
   في DECISIONS.md.
   We do NOT add hr_manager to AREA_ROLES.management or any other group
   — that would show him company-wide financial findings, against what
   DECISIONS.md settled.

   ⚠️ ما لم يُبنَ هنا عمداً — لوحة الصفحة الرئيسية
      DELIBERATELY NOT BUILT HERE — the homepage dashboard
   -------------------------------------------------------------------
   الخطة الأولى قالت إن hr_manager يحصل على لوحة «الموظف العادي» وطلبت
   إضافة RoleView.VIEWS.hr_manager هنا. بحثنا أولاً كما تفرض القاعدة
   الخامسة، فوجدنا أنه **موجود ومضبوط بالفعل** عند
   dc-requests.js:977 — `RoleView.VIEWS.hr_manager = RoleView.VIEWS.hr
   || RoleView.VIEWS.employee`. أي أن لوحته الرئيسية سليمة اليوم على
   الموقع الحيّ، والنقص الحقيقي اثنان لا ثلاثة: الخبرة والفحوصات.
   إضافة سطر ثانٍ هنا كانت ستصنع تعريفاً مكرراً لنفس الشيء — وهو بالضبط
   الفخ الذي كلّف ست ساعات في حادثة trade/trades.

   The first plan said hr_manager falls back to the ordinary-employee
   dashboard and asked for RoleView.VIEWS.hr_manager to be set here. We
   grepped first, as rule 5 requires, and found it is **already set** at
   dc-requests.js:977 — `RoleView.VIEWS.hr_manager = RoleView.VIEWS.hr
   || RoleView.VIEWS.employee`. His homepage is therefore already
   correct on the live site, and the real gap is TWO things, not three:
   the guidance and the checks. Adding a second line here would have
   created a duplicate definition of the same thing — precisely the trap
   that cost six hours in the trade/trades incident.

   إضافي بالكامل: احذف هذا الملف يعود السلوك السابق حرفياً لدور
   hr_manager وحده — لا يمسّ أي دور آخر.
   ADDITIVE: delete this file and previous behaviour returns exactly,
   for the hr_manager role only — no other role is touched.

   يُحمَّل بعد inspector-departments.js وقبل assistant.js، حتى تكون
   Knowledge وInspector موجودتين وقت التركيب.
   Load after inspector-departments.js and before assistant.js, so
   Knowledge and Inspector both exist by install time.
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    var K = global.Knowledge, I = global.Inspector;
    /* الاثنان لازمان معاً — بلا أحدهما لا نغيّر شيئاً بصمت.
       RoleView غير مطلوب هنا: لوحته مضبوطة سلفاً في dc-requests.js.
       both are required together — missing either, we change nothing,
       silently. RoleView is NOT needed here: his dashboard is already
       set in dc-requests.js. */
    if (!K || !I) return;
    if (global.__hrManagerLinksInstalled) return;
    global.__hrManagerLinksInstalled = true;

    /* ١ · خبرة المساعد المهني لموارد بشرية — نفس خبرة الدور "hr" */
    if (K.KB && K.KB.hr && !K.KB.hr_manager) K.KB.hr_manager = K.KB.hr;

    /* ٢ · دور "اختراق الزجاج" الطارئ (breakglass) — موجود في auth.js:143
       ولم تكن له خبرة خاصة، فيرث خبرة المسؤول */
    if (K.KB && K.KB.admin && !K.KB.breakglass) K.KB.breakglass = K.KB.admin;

    /* ٣ · الفحوصات الـ٥٨ التلقائية لقسم الموارد البشرية فقط —
       precedent لهذا الأسلوب في inspector-departments.js:567-578 */
    if (I.AREA_ROLES && I.AREA_ROLES.hr && I.AREA_ROLES.hr.indexOf('hr_manager') === -1) {
      I.AREA_ROLES.hr.push('hr_manager');
    }

    /* لا رابع هنا. لوحة الصفحة الرئيسية مضبوطة سلفاً في
       dc-requests.js:977 — انظر الملاحظة أعلاه. لا نكرّر تعريفاً.
       No fourth item. The homepage dashboard is already set at
       dc-requests.js:977 — see the note above. We do not duplicate a
       definition. */

    console.info('hr-manager-links.js: hr_manager linked to hr knowledge and checks.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  /* شبكة أمان: لو تأخر تحميل أحد الثلاثة عن DOMContentLoaded لأي سبب
     safety net in case any of the three loads later than DOMContentLoaded */
  [0, 400, 1500, 4000].forEach(function (ms) { setTimeout(install, ms); });
})(window);
