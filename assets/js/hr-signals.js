/* =========================================================================
   hr-signals.js — تاريخ انتهاء العقد الحقيقي، وعدد الحاضرين اليوم الحقيقي
                   The real contract-expiry date, and the real headcount
                   present today
   -------------------------------------------------------------------------
   المشكلة الأولى · PROBLEM ONE — تنبيه انتهاء العقد أعمى عن شاشته الجديدة

   تنبيه انتهاء العقد يقرأ employees.contractEnd، بينما شاشة «عقود العمل /
   Employment Contracts» (hr-department.js) تكتب في employmentContracts
   بحقل باسم مختلف تماماً: endDate. النتيجة أن أي عقد جديد يُسجَّل على
   الشاشة الصحيحة لا يظهر له تنبيه انتهاء إطلاقاً.

   The contract-expiry warning reads employees.contractEnd, while the
   Employment Contracts screen (hr-department.js) writes to
   employmentContracts with an entirely different field name: endDate.
   Any contract recorded on the correct screen never triggers a warning.

   المشكلة الثانية · PROBLEM TWO — «حضور اليوم» يقرأ جدولاً مهجوراً

   «حضور اليوم» يعدّ صفوف الجدول القديم attendance فقط، بينما شاشة
   «كشف حضور الموقع اليومي» (siteAttendance) — وهي الشاشة الفعلية التي
   يستخدمها محاسبو المواقع — تكتب الأسماء داخل lines[] لكل كشف، لا في
   جدول attendance إطلاقاً.

   "Present today" counts rows in the old attendance table only, while
   the daily site attendance sheet (siteAttendance) — the screen site
   accountants actually use — writes names inside each sheet's lines[],
   never into the attendance table at all.

   الحل · THE FIX

   HRSignals.contractEndOf(emp) يعيد الأحدث (اللاحق زمنياً) بين
   emp.contractEnd القديم وأقصى endDate بين عقود هذا الموظف في
   employmentContracts. الأحدث يفوز دائماً — لا نتحوّل للحقل الجديد فقط
   لأن موظفاً تاريخه موجود على الكرت القديم وحده يجب ألا يفقد تنبيهه،
   وموظفاً عقده الجديد يمدّد التاريخ يجب ألا يبقى على القديم.

   HRSignals.contractEndOf(emp) returns the LATER of the old
   emp.contractEnd and the max endDate across that employee's
   employmentContracts rows. Later always wins — we never simply switch
   to the new field, because an employee whose date exists only on the
   old card must keep the warning, and one whose new contract extends
   the date must not stay pinned to the old one.

   ⚠️ الحالة المستبعَدة الوحيدة هي "terminated" — والسبب مهم
      THE ONLY EXCLUDED STATUS IS "terminated" — and the reason matters
   -------------------------------------------------------------------
   كانت الخطة الأولى تطلب استبعاد "inactive"/"reversed"/"void"، وهي قيم
   لا وجود لها أصلاً في هذا الجدول. حقل status الحقيقي في
   employmentContracts (hr-department.js:378-385) قيمه:
   active / expiring / expired / renewed / terminated.

   العقد المُنهى (terminated) هو العقد الوحيد الذي قد يحمل تاريخ انتهاء
   **في المستقبل** — لأنه قُطع قبل موعده، وبجواره حقل «سبب الإنهاء».
   لو أدخلناه في حساب «أبعد تاريخ انتهاء» لقال النظام إن عقد الموظف
   ساري حتى ذلك التاريخ البعيد، **فيختفي تحذير قرب انتهاء العقد لموظف
   عقده انتهى فعلاً**. أما expired فتاريخه في الماضي ولا يؤثر على دالة
   «الأبعد»، وrenewed تجديدٌ حقيقي يجب أن يُحسب.

   The first plan asked to exclude "inactive"/"reversed"/"void" — values
   that do not exist on this table at all. The real status field
   (hr-department.js:378-385) holds:
   active / expiring / expired / renewed / terminated.

   A **terminated** contract is the only one that can carry an end date
   still in the FUTURE — it was cut short, which is why the screen has a
   "reason for termination" box beside it. Feeding it into "latest end
   date" would tell the portal the employee's contract runs until that
   far-off date, and **the expiry warning would vanish for someone whose
   contract has actually ended.** "expired" is in the past and cannot
   affect a max(); "renewed" is a real extension and must count.

   المشكلة الثانية — الحل · PROBLEM TWO — THE FIX

   HRSignals.presentTodayCount() يعدّ موظفين مميّزين (بلا تكرار) حاضرين
   اليوم من مصدرين معاً: صفوف attendance القديمة، وlines[] كل كشف
   siteAttendance بتاريخ اليوم. لا نشترط اعتماد الكشف — كشف مسودة هو
   واقع اليوم الفعلي، واشتراط الاعتماد كان سيجمّد الرقم عند صفر طوال
   الصباح؛ فقط نستبعد الكشوف المُلغاة (reversed/void).

   HRSignals.presentTodayCount() counts distinct employees present today
   across BOTH sources: old attendance rows, and today's siteAttendance
   sheets' lines[]. We do NOT require the sheet to be approved — a draft
   sheet is still today's reality, and requiring approval would pin the
   number at 0 all morning. We only exclude cancelled sheets
   (reversed/void).

   إضافي بالكامل: احذف هذا الملف وتعود الشاشتان لسلوكهما السابق حرفياً.
   ADDITIVE: delete this file and both screens revert to their previous
   behaviour exactly.

   يُحمَّل بين print.js وalerts.js. Load between print.js and alerts.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store) { console.error('hr-signals.js needs store.js first'); return; }

  function contractEndOf(emp) {
    var end = (emp && emp.contractEnd) || null;
    if (!emp) return end;

    Store.all('employmentContracts').forEach(function (c) {
      if (c.employee !== emp.id) return;
      /* عقد مُنهى قد يحمل تاريخ انتهاء مستقبلياً فيُخفي التحذير — انظر أعلاه.
         a terminated contract can carry a future end date and would hide
         the warning — see the note above. */
      if (c.status === 'terminated') return;
      if (!c.endDate) return;
      if (!end || new Date(c.endDate) > new Date(end)) end = c.endDate;
    });

    return end;
  }

  function presentTodayCount() {
    if (!global.I18N || !I18N.today) return 0;
    var today = I18N.today();
    var seen = new Set();

    /* المصدر القديم · the old source */
    Store.all('attendance').forEach(function (a) {
      if (a.date === today && a.attStatus === 'present' && a.employee) seen.add(a.employee);
    });

    /* المصدر الفعلي المستخدم اليوم على المواقع · the source sites actually use */
    Store.all('siteAttendance').forEach(function (sheet) {
      if (sheet.date !== today) return;
      if (['reversed', 'void'].indexOf(sheet.status) !== -1) return;
      (sheet.lines || []).forEach(function (l) {
        if (l.attStatus === 'present' && l.employee) seen.add(l.employee);
      });
    });

    return seen.size;
  }

  global.HRSignals = { contractEndOf: contractEndOf, presentTodayCount: presentTodayCount };
})(window);
