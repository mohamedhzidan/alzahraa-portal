/* =========================================================================
   payroll-insurance.js — أجر الاشتراك التأميني وحساب التأمينات آلياً
                          The insurance wage, and computing insurance for you
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   أ. محمد عمارة أعطى النسبتين أخيراً: ١١٪ على الموظف، ١٨٫٧٥٪ على الشركة —
   لكنهما لا تُحسبان على «الراتب الأساسي» كما هو مكتوب في الشاشة، بل على
   «أجر الاشتراك التأميني» القانوني، وهو رقم منفصل وله حد أدنى وحد أقصى.
   الشركة تسجّل الجميع اليوم بحد أدنى ٣٠٠٠ ج ما لم يُذكر غير ذلك. لا يوجد
   حقل لهذا الرقم في بيانات الموظف إطلاقاً، وخانتا التأمينات في مسير
   الرواتب (schema.js:1068 و hr-department.js:463) تُملآن يدوياً كل شهر —
   خطأ كتابي واحد في ٤٥٠ موظفاً يمر بلا ملاحظة.

   Mohamed Amara finally gave the two rates: 11% employee, 18.75% company —
   but they apply to the legal "insurance subscription wage", not to
   whatever is typed in "basic salary". That wage is a separate figure with
   its own floor and ceiling. Today the company registers everyone at the
   floor, 3,000 EGP, unless told otherwise. There was no field for that
   figure on the employee record at all, and the two insurance boxes on the
   payroll line (schema.js:1068, hr-department.js:463) were filled by hand
   every month — one typo across 450 staff goes unnoticed.

   ⛔ هذا الملف لا يشغّل رواتب حقيقية ولا يفرض رأياً في القانون. الحد
   الأدنى/الأقصى القانونيان ما زالا غائبين — سؤال أ. محمد عمارة لم يُجب
   بعد. حتى وصوله تبقى ٣٠٠٠ ج الافتراض المؤقت المعلن، لا رقماً قانونياً.

   ⛔ This file does not run real payroll and does not invent a legal
   answer. The statutory floor/ceiling are still missing — Mohamed Amara's
   question has not come back yet. Until it does, 3,000 EGP stays a
   declared placeholder, not a legal figure.

   -------------------------------------------------------------------------
   لماذا حساب صحيح المائة لا كسر عشري · WHY INTEGER-PERCENT, NOT A DECIMAL

   0.11 لا يُمثَّل تماماً في الفاصلة العائمة (floating point) — ٣٠٠٠×٠.١١
   قد يعطي ٣٢٩٫٩٩٩٩٩٩٩٩٩٩٩٩٩٤ في بعض الحالات. الحل هنا: خزّن النسبة كعدد
   صحيح (١١) واقسم الناتج على ١٠٠ بعد الضرب والتقريب — Math.round(wage *
   11) / 100 يعطي ٣٣٠٫٠٠ بالضبط دائماً.

   0.11 is not exactly representable in IEEE floating point — 3000 * 0.11
   can land on 329.99999999999994 in some engines. The fix: store the rate
   as a whole number (11) and round the product before dividing by 100.
   Math.round(wage * 11) / 100 always lands on exactly 330.00.

   -------------------------------------------------------------------------
   لماذا لا تُملأ إلا الخانة الفارغة أو الصفر · WHY ONLY AN EMPTY/ZERO BOX

   لو كتب أحد رقماً بيده — لأن الموظف مُسجَّل بأجر مختلف هذا الشهر، أو
   لتصحيح خطأ — فلا يجوز لهذا الملف أن يمحوه. الملء تلقائي فقط حين تكون
   الخانة فارغة أو صفراً، وهو نفس شرط «لا تكتب فوق يد الإنسان» المستخدم في
   كل هذا المشروع (compare save-modes.js).

   If someone typed a figure by hand — because this employee is registered
   at a different wage this month, or to fix a mistake — this file must
   never erase it. Auto-fill only fires when the box is empty or zero, the
   same "never overwrite a human's typing" rule used everywhere else in
   this project (compare save-modes.js).

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف فيختفي حقل «أجر الاشتراك
   التأميني»، ويعود ملء خانتي التأمينات يدوياً بالكامل كما كان — لا يتغيّر
   أي حساب آخر ولا صيغة صافي الراتب في payroll-net.js.

   Delete this file and the "insurance wage" field disappears, and filling
   the two insurance boxes goes back to fully manual — nothing else changes,
   and payroll-net.js's net-pay formula is untouched.

   يُحمَّل بعد auth.js لأن دفع الحقل داخل Auth.SENSITIVE.employees يحتاج
   Auth نفسه موجوداً أولاً — وقبله الحقل لا يُخفى عن غير قسم الموارد
   البشرية. Loaded after auth.js, because pushing the field into
   Auth.SENSITIVE.employees needs Auth to already exist — without it the
   field would not be hidden from anyone outside HR.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('payroll-insurance.js: schema.js must load first'); return; }
  if (!global.Auth) { console.error('payroll-insurance.js: auth.js must load first'); return; }

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  /* ═══ 1 · حقل أجر الاشتراك التأميني على بطاقة الموظف ═══════════════════
     THE INSURANCE-WAGE FIELD ON THE EMPLOYEE RECORD
     نفس نمط retention-release-field.js:47-56 — تحقّق من عدم التكرار، ثم
     أدرج بعد الحقل المذكور بالاسم، لا في آخر القائمة.
     Same pattern as retention-release-field.js:47-56 — guard against a
     duplicate, then insert after the named field, not at the end. */
  var emp = Schema.get('employees');
  if (emp && emp.fields && !emp.fields.some(function (f) { return f.name === 'insuranceWage'; })) {
    var i = emp.fields.findIndex(function (f) { return f.name === 'allowances'; });
    var field = F('insuranceWage', 'أجر الاشتراك التأميني', 'Insurance wage', 'money', {
      default: 3000,
      /* القيمة المالية الحرفية، لا مرجع SEC.money من schema.js — التجميع في
         الشاشة يقارن نص القسم لا المرجع (pages/entity.js:473)، فنص مطابق
         حرفياً يكفي ولا حاجة لقراءة متغيّر داخلي من ملف للقراءة فقط.
         The literal financial-values object, not a reference to schema.js's
         internal SEC.money — the form groups by the section TEXT, not the
         reference (pages/entity.js:473), so an identical literal is enough
         and avoids reaching into a read-only file's private variable. */
      section: { ar: 'القيم المالية', en: 'Financial values' },
      help: { ar: 'الشركة تسجِّل الجميع حالياً بالحد الأدنى ٣٠٠٠ ج — غيِّره فقط لمن سُجِّل بأجر أعلى',
              en: 'The company currently registers everyone at the floor, 3,000 EGP — change it only for someone registered at a higher wage' }
    });
    if (i === -1) emp.fields.push(field); else emp.fields.splice(i + 1, 0, field);
    console.info('payroll-insurance.js: insuranceWage added to employees.');
  }

  /* حقل مالي حساس مثل باقي رواتب الموظف — يُضاف لقائمة auth.js المرجعية
     نفسها (auth.js:49-54، مُصدَّرة بالمرجع في auth.js:957) بدل نسخها، حتى
     تبقى نسخة واحدة تُقرأ في fieldHidden/maskRecord (auth.js:894-908).
     A sensitive money field like the rest of the employee's pay — pushed
     into auth.js's own list (auth.js:49-54, exported by reference at
     auth.js:957) instead of copying it, so there stays exactly one list
     read by fieldHidden/maskRecord (auth.js:894-908). */
  if (Auth.SENSITIVE && Array.isArray(Auth.SENSITIVE.employees) &&
      Auth.SENSITIVE.employees.indexOf('insuranceWage') === -1) {
    Auth.SENSITIVE.employees.push('insuranceWage');
  }

  /* ═══ 2 · النسب والحساب — window.PayrollInsurance ═══════════════════════
     RATES AND ARITHMETIC — exported so the hook below (and anything else)
     can use exactly one source of truth. */
  var EMPLOYEE_PCT = 11;      /* نسبة الموظف · employee share, whole percent */
  var COMPANY_PCT = 18.75;    /* نسبة الشركة · company share, whole percent */
  var DEFAULT_WAGE = 3000;    /* الحد الأدنى المُعلَن حالياً · today's declared floor */

  /* القيم الثلاث قابلة للتغيير من app_meta.insuranceRates دون تعديل هذا
     الملف — لكن فقط إن كانت القيمة رقماً صحيحاً منتهياً وأكبر من صفر لكل
     مفتاح على حدة؛ غير ذلك تبقى الثوابت أعلاه هي المرجع. هذا يمنع قيمة
     تالفة أو صفرية واحدة من إسقاط النسبتين الأخريين معاً.
     The three values can be overridden from app_meta.insuranceRates without
     touching this file — but only when a value is finite and greater than
     zero, checked per key; otherwise the constants above remain the source
     of truth. This stops one corrupt or zero value from taking the other
     two rates down with it. */
  function rates() {
    var meta = (global.Store && Store.meta) ? (Store.meta() || {}) : {};
    var o = meta.insuranceRates || {};
    function pick(v, fallback) {
      var n = Number(v);
      return (isFinite(n) && n > 0) ? n : fallback;
    }
    return {
      employeePct: pick(o.employeePct, EMPLOYEE_PCT),
      companyPct: pick(o.companyPct, COMPANY_PCT),
      defaultWage: pick(o.defaultWage, DEFAULT_WAGE)
    };
  }

  /* Math.round(wage*pct)/100 — انظر شرح الفاصلة العائمة أعلى الملف.
     See the floating-point explanation at the top of this file. */
  function compute(wage) {
    var r = rates();
    var w = Number(wage) || 0;
    return {
      employee: Math.round(w * r.employeePct) / 100,
      company: Math.round(w * r.companyPct) / 100
    };
  }

  /* '' true · '0' true · 0 (number) true · أي شيء آخر false.
     '' true · '0' true · 0 (number) true · anything else false. */
  function shouldFill(boxValue) {
    return boxValue === '' || boxValue === '0' || boxValue === 0;
  }

  global.PayrollInsurance = { compute: compute, shouldFill: shouldFill, rates: rates };

  /* ═══ 3 · عناوين الأعمدة من النسب الفعلية ════════════════════════════════
     COLUMN LABELS BUILT FROM THE EFFECTIVE RATES
     أرقام بلا فواصل عشرية زائدة: صحيح بلا كسر، وكسر بأقل ما يلزم من الأرقام
     — نفس القاعدة المستعملة في نص التنبيه أدناه (دالة fmt).
     No forced trailing decimals: whole numbers show whole, fractions show
     only the digits they need — the same rule the toast text uses (fmt). */
  function fmt(v) {
    var n = Number(v) || 0;
    return (global.I18N ? I18N.num(n, n % 1 === 0 ? 0 : 2) : String(n % 1 === 0 ? n : n.toFixed(2)));
  }

  (function setLabels() {
    var pay = Schema.get('payroll');
    if (!pay || !pay.lines || !pay.lines.fields) {
      console.error('payroll-insurance.js: the payroll screen was not found — labels unchanged');
      return;
    }
    var r = rates();
    var insurance = pay.lines.fields.filter(function (f) { return f.name === 'insurance'; })[0];
    if (insurance) {
      insurance.label = {
        ar: 'تأمينات الموظف (' + fmt(r.employeePct) + '٪ من أجر الاشتراك)',
        en: 'Employee insurance (' + fmt(r.employeePct) + '% of insurance wage)'
      };
    }
    /* ⚠️ هذا الملف يُحمَّل بعد payroll-net.js (loader.js) فتكتب هذه السطور
       فوق نص payroll-net.js:177-183 — وهو مقصود، لا تعارض. أُبقي على عبارة
       «لا تُخصم من الموظف» حرفياً حتى لا يتضارب ملفان على نفس الخانة بنصّين
       مختلفين — درس HISTORY رقم ٩ مطبَّقاً على عنوان خانة، لا على صيغة.
       ⚠️ This file loads after payroll-net.js (loader.js), so this write
       lands on top of payroll-net.js:177-183 — deliberate, not a conflict.
       The phrase "not deducted from the employee" is kept verbatim so two
       files never fight over the same box with two different wordings —
       HISTORY lesson #9, applied to a label instead of a formula. */
    var insuranceEmployer = pay.lines.fields.filter(function (f) { return f.name === 'insuranceEmployer'; })[0];
    if (insuranceEmployer) {
      insuranceEmployer.label = {
        ar: 'تأمينات (حصة الشركة ' + fmt(r.companyPct) + '٪ من أجر الاشتراك — لا تُخصم من الموظف)',
        en: 'Insurance (employer share ' + fmt(r.companyPct) + '% of insurance wage — not deducted from the employee)'
      };
    }
  })();

  /* ═══ 4 · الملء التلقائي عند اختيار الموظف ═══════════════════════════════
     AUTO-FILL WHEN AN EMPLOYEE IS PICKED
     مستمع مفوَّض (delegated) على document بحدث change فقط — لا input، فلا
     داعي لإعادة الحساب مع كل حرف يُكتب في خانة أخرى. save-modes.js يثبت أن
     لفّ الأحداث/النماذج هو الطريقة الصحيحة هنا، لا مراقبة #content، لأن
     النماذج تُفتح داخل #modalHost (انظر frontend.md).
     A delegated 'change' listener on document — change only, not input, so
     nothing recomputes on every keystroke typed into an unrelated box.
     save-modes.js proves wrapping events/forms is the right approach here,
     not watching #content, because forms open inside #modalHost. */
  document.addEventListener('change', function (e) {
    var target = e.target;
    if (!target || target.tagName !== 'SELECT' || target.getAttribute('name') !== 'employee') return;

    var tr = target.closest('tr[data-li]');
    if (!tr) return;

    /* هذا الزوج من الخانات موجود فقط في بنود مسير الرواتب (schema.js:1068 +
       hr-department.js:463) — وجودهما معاً هو ما يميّز صف الرواتب عن أي
       جدول بنود آخر فيه عمود اسمه «employee».
       This pair of boxes exists only on payroll lines (schema.js:1068 +
       hr-department.js:463) — both being present together is what tells a
       payroll row apart from any other line table with an "employee" column. */
    var insEl = tr.querySelector('[name="insurance"]');
    var empEl = tr.querySelector('[name="insuranceEmployer"]');
    if (!insEl || !empEl) return;

    if (!global.Store || !target.value) return;
    var employee = Store.all('employees').filter(function (r) { return r.id === target.value; })[0];
    if (!employee) return;

    var r = rates();
    var rawWage = Number(employee.insuranceWage);
    var usedDefault = !(isFinite(rawWage) && rawWage > 0);
    var wage = usedDefault ? r.defaultWage : rawWage;
    var amounts = compute(wage);

    /* title على الخانتين دائماً — مرجع سريع بالتحويم حتى لو لم تُملآ الآن،
       لأن رقماً مكتوباً بيد إنسان يستحق نفس مرجع الحساب.
       title on both boxes always — a quick hover reference even when not
       filled this time, because a hand-typed figure deserves the same
       arithmetic reference too. */
    var defaultTag = usedDefault ? (global.I18N && I18N.getLang() === 'en' ? ' (default)' : ' (الافتراضي)') : '';
    var titleAr = 'أجر الاشتراك: ' + fmt(wage) + defaultTag + ' — تأمينات الموظف: ' + fmt(r.employeePct) +
      '٪ × ' + fmt(wage) + ' = ' + fmt(amounts.employee) + ' · حصة الشركة: ' + fmt(r.companyPct) +
      '٪ × ' + fmt(wage) + ' = ' + fmt(amounts.company) + ' (لا تُخصم من الموظف)';
    var titleEn = 'Insurance wage: ' + fmt(wage) + defaultTag + ' — employee: ' + fmt(r.employeePct) +
      '% x ' + fmt(wage) + ' = ' + fmt(amounts.employee) + ' · company: ' + fmt(r.companyPct) +
      '% x ' + fmt(wage) + ' = ' + fmt(amounts.company) + ' (not deducted from the employee)';
    var title = (global.I18N && I18N.getLang() === 'en') ? titleEn : titleAr;
    insEl.title = title;
    empEl.title = title;

    /* لا يُكتب فوق رقم أدخله إنسان بيده — يُملأ فقط ما كان فارغاً أو صفراً.
       إعادة اختيار موظف على خانة صُفِّرت عمداً تعيد ملأها، والتنبيه أدناه
       يجعل ذلك مرئياً بدل أن يحدث بصمت.
       Never overwrites a figure a human typed — only what was empty or
       zero gets filled. Re-picking an employee on a deliberately-zeroed row
       refills it, and the toast below makes that visible instead of silent. */
    var filledAny = false;
    if (shouldFill(insEl.value)) {
      insEl.value = String(amounts.employee);
      insEl.dispatchEvent(new Event('input', { bubbles: true }));
      filledAny = true;
    }
    if (shouldFill(empEl.value)) {
      empEl.value = String(amounts.company);
      empEl.dispatchEvent(new Event('input', { bubbles: true }));
      filledAny = true;
    }

    if (filledAny && global.UI && UI.toast) {
      var msg = 'تأمينات الموظف: ' + fmt(r.employeePct) + '٪ × ' + fmt(wage) + ' = ' + fmt(amounts.employee) +
        ' · حصة الشركة: ' + fmt(r.companyPct) + '٪ × ' + fmt(wage) + ' = ' + fmt(amounts.company) +
        ' (لا تُخصم من الموظف)' + defaultTag;
      var msgEn = 'Employee insurance: ' + fmt(r.employeePct) + '% x ' + fmt(wage) + ' = ' + fmt(amounts.employee) +
        ' · company share: ' + fmt(r.companyPct) + '% x ' + fmt(wage) + ' = ' + fmt(amounts.company) +
        ' (not deducted from the employee)' + defaultTag;
      UI.toast((global.I18N && I18N.getLang() === 'en') ? msgEn : msg, 'info', 6000);
    }
  });
})(window);
