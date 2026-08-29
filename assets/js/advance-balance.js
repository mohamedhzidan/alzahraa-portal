/* =========================================================================
   advance-balance.js — «المسدَّد» و«المتبقي» على سلف الموظفين، حقيقيَّين
                        Real "repaid" and "outstanding" on employee advances
   -------------------------------------------------------------------------
   المصدر · SOURCE

   أ. محمد عمارة، ورقة ١٥ أغسطس ٢٠٢٦، كتبها بخطّه قبل أن يجيب على أي سؤال:
     «عمل كشف حساب لكل موظف لتسجيل السلف وخصمها»
   وفي «ما الذي قد يجعلك لا تستخدم النظام؟»:
     «عدم ربط بيانات الموظف الأساسية بالإدارة المالية لتسجيل مصاريف
      وسلفه الأسبوعية»

   Mohamed Amara wrote this at the top of his sheet before answering a single
   question: "an account statement for every employee recording advances and
   their deduction" — and named its absence as what would stop him using the
   portal at all.

   -------------------------------------------------------------------------
   لماذا كان الرقم خطأً — سببان مستقلان، كلاهما حقيقي
   WHY THE FIGURE WAS WRONG — two independent causes, both real

   ١) حقل «المسدَّد حتى الآن» (hr-department.js:113) مكتوب تحته
      «يُحدَّث تلقائياً من مسير الرواتب». **لا شيء في المشروع كله يكتب فيه
      قيمة قط** — تحقّقنا بالبحث الشامل. فيبقى فارغاً إلى الأبد.

      The "repaid so far" field says "updated automatically from payroll".
      Nothing in the entire project ever writes a value into it — verified by
      a full search. It stays empty forever.

   ٢) حقل «المتبقي» (hr-department.js:116) صيغته **دالة**، وui.js:221 لا
      يفهم إلا الصيغ النصية، فيرمي ويبتلع الخطأ ويُعيد صفراً.
      (العلاج في assets/js/calc-formulas.js — هذا الملف يعتمد عليه.)

      The "outstanding" field's formula is a FUNCTION, and ui.js:221 only
      understands string formulas, so it throws, swallows the error and
      returns zero. (Fixed in calc-formulas.js, which this file depends on.)

   فالنتيجة على الشاشة كانت: **كل سلفة تبدو مسدَّدة بالكامل، أياً كانت.**
   وهذا بالضبط ما شكا منه: السلف لا تُسترد.

   The result on screen: EVERY advance looked fully repaid, whatever it was.
   Which is precisely his complaint — advances are never recovered.

   -------------------------------------------------------------------------
   من أين يأتي الرقم الصحيح · WHERE THE RIGHT NUMBER COMES FROM

   لا نكتب حساباً جديداً. hr-department.js:483 فيه بالفعل دالة statement
   مكتوبة بعناية تحسب المسدَّد الحقيقي، وتحرس عمداً ضد أخطر خطأ ممكن هنا:
   عدّ نفس المبلغ مرتين (مرة من حقل «المسدَّد» ومرة من خصم المسير) فيظهر
   الموظف مديناً بأقل مما عليه. مصدر المسدَّد الوحيد عندها هو **الخصم
   الفعلي من مسير رواتب معتمد**.

   We do not write a second calculation. hr-department.js:483 already holds a
   careful `statement` function that computes the true repaid figure and
   deliberately guards against the most dangerous error possible here —
   counting the same money twice (once from the "repaid" field, once from the
   payroll deduction) and showing an employee owing less than they do. Its
   single source is the ACTUAL deduction on an APPROVED payroll run.

   نستدعيها كما هي. فيستحيل أن يختلف رقم الشاشة عن رقم كشف الحساب، لأنهما
   ناتجان عن نفس السطر من الكود.
   We call it as it is. The list figure and the statement figure therefore
   cannot disagree, because they come from the same line of code.

   -------------------------------------------------------------------------
   التوزيع على السلف — الأقدم أولاً · ALLOCATION — OLDEST FIRST

   سطر مسير الرواتب يحمل «خصم سلف» للموظف، **ولا يقول أي سلفة**. فلا سبيل
   لمعرفة أي سلفة سُدِّدت بالضبط. القاعدة المحاسبية المعتادة — والمطبَّقة
   هنا — هي إطفاء الأقدم أولاً.

   A payroll line carries an advance deduction for the employee and does NOT
   say which advance it repays. There is no way to know exactly. The ordinary
   accounting convention — applied here — is oldest first.

   إجمالي الموظف صحيح دائماً مهما كان التوزيع؛ التوزيع يخصّ عرض كل سطر فقط.
   The employee's total is correct whatever the allocation; the allocation
   only affects how it is shown per row.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف فيعود «المسدَّد» خانة يدوية
   فارغة و«المتبقي» صفراً — أي سلوك اليوم بالضبط.
   Delete this file and "repaid" goes back to an empty manual box and
   "outstanding" back to zero — exactly today's behaviour.

   يُحمَّل بعد hr-department.js وcalc-formulas.js، وقبل alerts.js/hr-alerts.js
   Load after hr-department.js and calc-formulas.js, before alerts.js
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema || !global.Store) {
    console.error('advance-balance.js needs schema.js and store.js first');
    return;
  }

  var TABLE = 'employeeAdvances';

  /* الشرط نفسه من hr-department.js — نُنادي الدالة المُصدَّرة بدل نسخ
     شرطها هنا. النسخة القديمة كانت «نفس شرط hr-department.js:485-487
     حرفياً» في تعليق فقط — استشهاد تحلّل فعلاً (السطر الحقيقي صار 538-540
     بعد هذه الدفعة نفسها)، وهذا بالضبط الفخ الذي يُزال بالتصدير: لا حاجة
     لصيانة نسخة يدوية متطابقة في ملفين. لو غاب HRDepartment.countsAdvance
     (مستحيل في بوابة مُركَّبة بالكامل) نُعيد [] فيتدهور السلوك إلى صفر
     توزيع — وهو سلوك اليوم بالضبط قبل هذا الملف.

     Calls the exported predicate instead of keeping our own copy of its
     condition. The old comment claimed word-for-word agreement with
     hr-department.js:485-487 — a citation that had already rotted (the
     real line is now 538-540, after this very batch). Exporting the
     predicate removes the trap outright: no hand-maintained twin across
     two files. If HRDepartment.countsAdvance is missing (impossible in a
     fully wired portal) we return [], which degrades to today's exact
     zero-allocation behaviour before this file existed. */
  function countableAdvances(employeeId) {
    if (!global.HRDepartment || typeof HRDepartment.countsAdvance !== 'function') return [];
    return Store.all(TABLE).filter(function (a) {
      return HRDepartment.countsAdvance(a, employeeId);
    }).sort(function (a, b) {
      var d = new Date(a.date || 0) - new Date(b.date || 0);
      return d !== 0 ? d : String(a.docNo || '').localeCompare(String(b.docNo || ''));
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     الفهرس — يُحسب مرة ويُلغى عند أي تغيير في البيانات
     THE INDEX — computed once, dropped on any data change
     نفس أسلوب money-owed.js المُثبت في هذا الموقع.
     Same technique money-owed.js already proves in this codebase.
     ═══════════════════════════════════════════════════════════════════ */
  var index = null;

  function build(employeeId) {
    var perAdvance = {}, totalRepaid = 0, totalAdvanced = 0;

    if (global.HRDepartment && HRDepartment.statement) {
      var st = null;
      try { st = HRDepartment.statement(employeeId); } catch (e) { st = null; }
      if (st) {
        totalRepaid   = Number(st.totalRepaid) || 0;
        totalAdvanced = Number(st.totalAdvanced) || 0;
      }
    }

    var pool = totalRepaid;
    countableAdvances(employeeId).forEach(function (a) {
      var amount = Number(a.amount) || 0;
      var take = pool > 0 ? Math.min(pool, amount) : 0;
      perAdvance[a.id] = take;
      pool -= take;
    });

    return {
      totalAdvanced: totalAdvanced,
      totalRepaid:   totalRepaid,
      outstanding:   totalAdvanced - totalRepaid,
      perAdvance:    perAdvance,
      /* فائض غير موزَّع: خُصم من المسير أكثر مما عليه من سلف قائمة. ليس
         خطأ حسابياً بل إشارة إلى خصم زائد يستحق النظر — يعرضه كشف الحساب.
         Unallocated surplus: more was deducted on payroll than the open
         advances account for. Not an arithmetic error but a sign of an
         over-deduction worth looking at — the statement surfaces it. */
      overRepaid: pool > 0 ? pool : 0
    };
  }

  function forEmployee(employeeId) {
    if (!employeeId) return null;
    if (!index) index = {};
    if (!index[employeeId]) index[employeeId] = build(employeeId);
    return index[employeeId];
  }

  function repaidOf(rec) {
    if (!rec || !rec.employee || !rec.id) return 0;
    var ix = forEmployee(rec.employee);
    return (ix && Number(ix.perAdvance[rec.id])) || 0;
  }

  if (Store.onChange) Store.onChange(function () { index = null; });

  /* ═══════════════════════════════════════════════════════════════════
     تركيب الصيغتين على الشاشة
     ═══════════════════════════════════════════════════════════════════ */
  (function install() {
    var mod = Schema.get(TABLE);
    if (!mod || !mod.fields) {
      console.error('advance-balance.js: employeeAdvances screen not found — nothing changed');
      return;
    }
    function field(name) {
      return mod.fields.filter(function (f) { return f.name === name; })[0];
    }

    var repaid = field('repaid');
    if (repaid) {
      /* كانت خانة مال يدوية readonly لا يملؤها شيء. تصير محسوبة فعلاً،
         فيصدق أخيراً ما كُتب تحتها: «يُحدَّث تلقائياً من مسير الرواتب».
         Was a readonly manual money box nothing ever filled. It becomes
         genuinely computed, so its own help text — "updated automatically
         from payroll" — is true at last. */
      repaid.type = 'calc';
      repaid.formula = function (r) { return repaidOf(r); };
      repaid.help = {
        ar: 'مجموع ما خُصم فعلاً على مسيرات رواتب معتمدة — لا يُكتب يدوياً',
        en: 'Total actually deducted on approved payroll runs — never typed by hand'
      };
    }

    var outstanding = field('outstanding');
    if (outstanding) {
      /* لا نقرأ r.repaid هنا عمداً: ترتيب حساب الحقول داخل النموذج
         (pages/entity.js:663-668) ليس مضموناً، فنقرأ الفهرس مباشرة.
         Deliberately not reading r.repaid: the order in which form fields
         are recalculated (pages/entity.js:663-668) is not guaranteed, so we
         read the index directly instead of depending on a sibling field. */
      outstanding.formula = function (r) {
        return (Number(r.amount) || 0) - repaidOf(r);
      };
      outstanding.help = {
        ar: 'قيمة السلفة ناقص ما خُصم فعلاً من المسير',
        en: 'Advance amount less what payroll actually deducted'
      };
    }

    console.info('advance-balance.js ready — "repaid" and "outstanding" on employee ' +
                 'advances now come from approved payroll deductions, via the same ' +
                 'HRDepartment.statement the employee statement uses.');
  })();

  global.AdvanceBalance = {
    forEmployee: forEmployee,
    repaidOf: repaidOf,
    /* افحص يدوياً: AdvanceBalance.check() — يسرد الموظفين الذين عليهم سلف
       Manual check: AdvanceBalance.check() lists employees still owing */
    check: function () {
      var seen = {}, rows = [];
      Store.all(TABLE).forEach(function (a) {
        if (!a.employee || seen[a.employee]) return;
        seen[a.employee] = true;
        var ix = forEmployee(a.employee);
        if (!ix || ix.outstanding <= 0) return;
        rows.push({
          employee: (Store.find('employees', a.employee) || {}).name || a.employee,
          advanced: ix.totalAdvanced, repaid: ix.totalRepaid, outstanding: ix.outstanding
        });
      });
      rows.sort(function (x, y) { return y.outstanding - x.outstanding; });
      console.table(rows);
      return rows;
    }
  };
})(window);
