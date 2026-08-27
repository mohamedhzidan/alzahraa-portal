/* =========================================================================
   payroll-review-flags.js — ملاحظات قبل الاعتماد، لا اعتراض
                            Pre-approval flags — notes, never an objection
   -------------------------------------------------------------------------
   الثغرة · THE GAP

   من يراجع أو يعتمد مسير رواتب اليوم يفتح السجل ويضغط «مراجعة» ثم
   «اعتماد» — لا شيء على الشاشة يلفت نظره إلى موظف تُرك على المسير بعد
   ترك الخدمة، أو صافي قفز فجأة، أو سلفة متبقية لم يُخصم منها شيء. القرار
   يمر على ٤٥٠ سطر بلا قراءة فعلية، وهذا بالضبط ما يسمح لخطأ كتابي واحد
   بالمرور بلا ملاحظة (نفس عطل payroll-net.js الأصلي، من زاوية أخرى).

   Whoever reviews or approves a payroll run today opens the record and
   presses "review" then "approve" — nothing on the screen draws attention
   to an employee left on the sheet after leaving service, a net figure
   that suddenly jumped, or an outstanding advance with nothing deducted.
   The decision passes over 450 lines with no real reading, which is
   exactly what lets one typo through unnoticed (the same bug payroll-net.js
   fixed, seen from another angle).

   -------------------------------------------------------------------------
   ⛔ هذا الملف لا يمنع، لا يعدّل، لا يحفظ · FLAGS ONLY, NEVER A GATE

   سبع فحوص للقراءة فقط. كل واحد منها يقرأ السجل والملفات الأخرى، ولا يكتب
   في أيٍّ منها إطلاقاً. لا يُرفض اعتماد، ولا يُغيَّر رقم، ولا يُستدعى
   Store.save أو Store.create من هذا الملف على الإطلاق — لو فعل، فهذا خطأ
   في هذا الملف يجب إصلاحه، لا سلوكاً مقصوداً.

   Seven read-only checks. Each reads the record and other files and writes
   to none of them. No approval is ever refused, no figure is ever changed,
   and Store.save/Store.create are never called from this file at all — if
   they ever are, that is a bug in this file, not intended behaviour.

   -------------------------------------------------------------------------
   لا حساب مكرر · ZERO COPIED ARITHMETIC (HISTORY #9)

   كل رقم هنا يُحسب بنداء مباشر لدالة موجودة سلفاً:
     · UI.computeValue(lineTotalField, line)   — نفس صيغة الصافي التي بناها
       payroll-net.js، أياً كانت في لحظة الاستدعاء (calc-formulas.js يلفّها).
     · PayrollInsurance.compute(wage)          — نفس تأمينات الموظف المتوقعة.
     · HRDepartment.statement(employeeId)       — نفس رصيد السلفة الحقيقي.
     · Schema.refLabel(employeeField, id)       — نفس اسم يظهر أصلاً في جدول
       بنود المسير، لا نسخة منه.
   لو تغيّرت أيٌّ من هذه الصيغ يوماً، يتغيّر هذا الملف معها تلقائياً بلا
   أي تعديل هنا — لأنه لا يملك نسخته الخاصة من أي حساب.

   Every figure here comes from a direct call to a function that already
   exists: UI.computeValue for net pay (whatever formula payroll-net.js
   installed, at call time — calc-formulas.js wraps it), PayrollInsurance
   .compute for expected insurance, HRDepartment.statement for the real
   advance balance, and Schema.refLabel for the same name already shown on
   the payroll lines table. If any of those formulas ever changes, this
   file changes with it automatically — because it owns no copy of any of
   them.

   -------------------------------------------------------------------------
   قاعدة الصدق لكل فحص · THE PER-CHECK HONESTY RULE

   فحص لم يُجرَ (لغياب صلاحية، أو تعذّر قراءة الشهر، أو غياب ملف يعتمد
   عليه) لا يُعامَل كأنه أُجري ووجد لا شيء — بل يُذكر صراحة أنه لم يُجرَ
   وبِمَ. الصمت هنا أخطر من التنبيه: مراجع يظن أن سبعة فحوص قالت "سليم"
   بينما أُجري ثلاثة فقط هو أسوأ من مراجع لم يُطمأن إطلاقاً.

   A check that did not run (no permission, an unreadable period, or a file
   it depends on missing) is never treated as if it ran and found nothing —
   it says plainly that it did not run, and why. Silence here is more
   dangerous than a flag: a reviewer who thinks seven checks said "clean"
   when only three ran is worse off than one never reassured at all.

   -------------------------------------------------------------------------
   لماذا لا تحتاج الفحوص ١ و٣ صلاحية «الموظفون» بذاتها
   WHY CHECKS 1 AND 3 DO NOT NEED THE "employees" PERMISSION ON THEIR OWN

   اسم الموظف في هاتين الرسالتين هو نفسه المعروض أصلاً في عمود «الموظف»
   بجدول بنود المسير نفسه — أي من يملك صلاحية مسير الرواتب يراه بالفعل في
   نفس الشاشة. أما الفحوص ٢/٤/٥ فتقرأ حقولاً لا تظهر على المسير إطلاقاً
   (الحالة، الراتب الأساسي على البطاقة، أجر الاشتراك التأميني) — فتحتاج
   صلاحية «الموظفون» صراحة قبل قراءتها.

   The employee name in these two messages is the exact name already shown
   in the payroll lines table's own "employee" column — anyone who can see
   the payroll screen already sees it there. Checks 2/4/5 read fields that
   never appear on the payroll sheet at all (status, the card's basic
   salary, the insurance wage) — so they require the "employees" permission
   explicitly before reading them.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف فتختفي لوحة الملاحظات من شاشة
   تفاصيل المسير ومن مسار الاعتماد السريع بصندوق الوارد، ولا يتغيّر حساب
   واحد ولا حالة اعتماد واحدة في أي مكان آخر.

   Delete this file and the notes panel disappears from the payroll detail
   view and from the inbox's quick-approve path, and not one calculation or
   approval state changes anywhere else.

   -------------------------------------------------------------------------
   لماذا يوجد مسار ثانٍ (لوحة الوارد) لا مسار واحد فقط
   WHY THERE IS A SECOND SURFACE (THE INBOX), NOT JUST ONE

   أزرار «مراجعة/اعتماد» السريعة في صندوق الوارد (pages/approvals.js:43-46)
   تنادي EntityPage.doTransition المُصدَّرة مباشرة، بلا فتح شاشة التفاصيل
   إطلاقاً — فلو اقتصرت اللوحة على شاشة التفاصيل وحدها لتجاوزها كل اعتماد
   سريع من صندوق الوارد بلا أن يراها أحد. هذا القرار المأخوذ هنا قابل
   للإلغاء بحذف سطرين (تعطيل installTransitionHook أدناه) إن قرر محمد زيدان
   خلاف ذلك.

   The inbox's quick review/approve buttons (pages/approvals.js:43-46) call
   the exported EntityPage.doTransition directly, without ever opening the
   detail view — so if the panel lived only in the detail view, every
   quick approval from the inbox would bypass it unseen. This taken default
   is a two-line strike to remove (disable installTransitionHook below) if
   Mohamed Zidan decides otherwise.

   يُحمَّل بعد sheets-templates.js (وبعد employee-statement.js الذي يليه
   هو أيضاً) — يحتاج pages/entity.js, ui.js+calc-formulas.js,
   payroll-insurance.js, hr-department.js كلها محمَّلة سلفاً.
   Loaded after sheets-templates.js (and, by extension, after
   employee-statement.js) — needs pages/entity.js, ui.js+calc-formulas.js,
   payroll-insurance.js and hr-department.js already loaded.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema || !global.Store) {
    console.error('payroll-review-flags.js needs schema.js and store.js first'); return;
  }

  /* ---------- نفس أدوات الأسلوب المستعملة في employee-statement.js ----------
     Same small helper set employee-statement.js already uses. */
  function L(o) { return (global.I18N && I18N.L) ? I18N.L(o) : (o && (o.ar || o.en)) || ''; }
  function ar() { return !global.I18N || I18N.getLang() === 'ar'; }
  function esc(v) { return global.UI ? UI.esc(v) : String(v == null ? '' : v); }
  function moneyFmt(v) { return global.I18N ? I18N.money(v) : String(v); }

  /* رقم بلا كسر زائد — نفس قاعدة fmt في payroll-insurance.js، تنسيق فقط
     لا حساباً. A number with no forced trailing decimal — the same rule as
     payroll-insurance.js's fmt, formatting only, not arithmetic. */
  function numFmt(v) {
    var n = Number(v) || 0;
    return global.I18N ? I18N.num(n, n % 1 === 0 ? 0 : 2) : String(n);
  }
  function pctFmt(v) { return numFmt(v) + (ar() ? '٪' : '%'); }

  /* ═══════════════════════════════════════════════════════════════════
     ٠ · أرقام الأرقام العربية → لاتينية، لأن period وstartPeriod نصّان
        حرّان قد يُكتبان بأي رقمين (schema.js/hr-department.js يعطيان
        «٢٠٢٦-٠٩» كمثال في نص المساعدة نفسه).
        Arabic-Indic digits → Latin, because `period` and `startPeriod`
        are free-text and the help text itself gives "٢٠٢٦-٠٩" as the
        example.
     لا يوجد مُطبِّع أرقام مُصدَّر في arabic-text.js (فُحص صراحة) — خريطة
     محلية صغيرة بديلاً، حسب الخطة.
     No exported digit-normaliser exists in arabic-text.js (checked
     explicitly) — a tiny local map instead, as the plan allows.
     ═══════════════════════════════════════════════════════════════════ */
  function normDigits(s) {
    return String(s == null ? '' : s).replace(/[٠-٩]/g, function (ch) {
      return String(ch.charCodeAt(0) - 0x0660);
    });
  }
  function periodParts(v) {
    var m = /^(\d{4})-(\d{2})$/.exec(normDigits(v).trim());
    return m ? { norm: m[1] + '-' + m[2], y: Number(m[1]), mo: Number(m[2]) } : null;
  }
  function prevPeriodOf(p) {
    var mo = p.mo - 1, y = p.y;
    if (mo < 1) { mo = 12; y -= 1; }
    return y + '-' + (mo < 10 ? '0' + mo : String(mo));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الحد المسموح لنسبة تغيّر الصافي — نفس نمط rates() في
        payroll-insurance.js:139-151 بالضبط، مفتاح واحد بدل ثلاثة.
        The allowed net-change threshold — exactly payroll-insurance.js's
        rates() pattern (:139-151), one key instead of three.
     ═══════════════════════════════════════════════════════════════════ */
  function threshold() {
    var meta = (global.Store && Store.meta) ? (Store.meta() || {}) : {};
    var o = meta.payrollFlags || {};
    var n = Number(o.netChangePct);
    return (isFinite(n) && n > 0) ? n : 10;
  }

  /* اسم الموظف كما يظهر بالفعل في عمود «الموظف» بجدول بنود المسير —
     Schema.refLabel نفسها، لا نسخة منها (انظر شرح أعلى الملف).
     The employee's name exactly as it already appears in the payroll
     lines table's "employee" column — Schema.refLabel itself, not a
     copy (see the file header). */
  function employeeName(empId) {
    var mod = Schema.get('payroll');
    var f = mod && mod.lines && mod.lines.fields.filter(function (x) { return x.name === 'employee'; })[0];
    return f ? Schema.refLabel(f, empId) : (empId || '—');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · الفحوص السبعة · THE SEVEN CHECKS
        كل فحص try/catch مستقل — عطل في فحص واحد لا يُسقط البقية ولا يُسقط
        فتح السجل. Each check is independently try/catch'd — a failure in
        one check never drops the rest and never breaks opening the record.
     ═══════════════════════════════════════════════════════════════════ */
  function compute(rec) {
    var out = { flags: [], ran: [], skipped: [], prevPeriod: null, prevRunCount: 0 };
    if (!rec || !global.Auth) return out;

    function push(n, ar_, en_, lineIndex) {
      out.flags.push({ check: n, lineIndex: lineIndex || null, ar: ar_, en: en_ });
    }
    function skip(n, ar_, en_) { out.skipped.push({ n: n, ar: ar_, en: en_ }); }
    function ran(n) { out.ran.push(n); }

    var lines = Array.isArray(rec.lines) ? rec.lines : [];
    var canPayroll = Auth.canSee('payroll');
    var canEmployees = Auth.canSee('employees');
    var canAdvances = Auth.canSee('employeeAdvances');
    var canAttendance = Auth.canSee('attendance') || Auth.canSee('siteAttendance');

    var thisPeriod = periodParts(rec.period);

    var lineTotalField = null;
    try {
      var payMod = Schema.get('payroll');
      lineTotalField = payMod && payMod.lines &&
        payMod.lines.fields.filter(function (f) { return f.name === 'lineTotal'; })[0] || null;
    } catch (e) { lineTotalField = null; }

    var NOPERM = {
      1: { ar: 'لا صلاحية اطلاع على مسير الرواتب', en: 'No permission to view payroll' },
      2: { ar: 'لا صلاحية اطلاع على بيانات الموظفين', en: 'No permission to view employee records' },
      3: { ar: 'لا صلاحية اطلاع على مسير الرواتب', en: 'No permission to view payroll' },
      4: { ar: 'لا صلاحية اطلاع على بيانات الموظفين', en: 'No permission to view employee records' },
      5: { ar: 'لا صلاحية اطلاع على بيانات الموظفين', en: 'No permission to view employee records' },
      6: { ar: 'لا صلاحية اطلاع على سلف الموظفين', en: 'No permission to view employee advances' },
      7: { ar: 'لا صلاحية اطلاع على الحضور والانصراف', en: 'No permission to view attendance' }
    };

    /* ── ١ · تغيّر الصافي عن الشهر السابق · net change vs previous month ── */
    (function check1() {
      if (!canPayroll) return skip(1, NOPERM[1].ar, NOPERM[1].en);
      if (!lineTotalField) return skip(1, 'تعذّر إيجاد صيغة الصافي في الشاشة', 'Could not find the net-pay formula on screen');
      if (!thisPeriod) {
        return skip(1, 'تعذّر قراءة شهر هذا المسير — لا يمكن المقارنة بالشهر السابق',
          "Could not read this payroll's month — cannot compare to the previous one");
      }
      try {
        var prevP = prevPeriodOf(thisPeriod);
        out.prevPeriod = prevP;
        var candidates = Store.all('payroll').filter(function (p) {
          var pp = periodParts(p.period);
          return pp && pp.norm === prevP && p.status === 'approved' && p.id !== rec.id;
        });
        out.prevRunCount = candidates.length;
        if (!candidates.length) {
          return skip(1, 'أول مسير — لا يوجد مسير معتمد لشهر ' + prevP + ' للمقارنة',
            'First run — no approved payroll for ' + prevP + ' to compare against');
        }
        ran(1);
        var prevPresent = {}, prevSum = {};
        candidates.forEach(function (p) {
          (p.lines || []).forEach(function (l) {
            if (!l.employee) return;
            prevPresent[l.employee] = true;
            prevSum[l.employee] = (prevSum[l.employee] || 0) + UI.computeValue(lineTotalField, l);
          });
        });
        var curSum = {}, curLine = {};
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          curSum[l.employee] = (curSum[l.employee] || 0) + UI.computeValue(lineTotalField, l);
          if (curLine[l.employee] === undefined) curLine[l.employee] = i + 1;
        });
        var thr = threshold();
        Object.keys(curSum).forEach(function (empId) {
          if (!prevPresent[empId]) return; /* غائب عن الشهر السابق — لا فحص · absent from prev — no check */
          var prev = prevSum[empId] || 0, cur = curSum[empId];
          var name = employeeName(empId);
          if (prev > 0) {
            var pct = Math.abs(cur - prev) / prev * 100;
            if (pct > thr) {
              var sign = cur >= prev ? '+' : '-';
              push(1,
                'صافي "' + name + '" تغيّر من ' + moneyFmt(prev) + ' إلى ' + moneyFmt(cur) +
                ' (' + sign + pctFmt(pct) + ') عن مسير ' + prevP + ' — الحد ' + pctFmt(thr) +
                ' (بند ' + curLine[empId] + ')',
                '"' + name + '" net changed from ' + moneyFmt(prev) + ' to ' + moneyFmt(cur) +
                ' (' + sign + pctFmt(pct) + ') vs ' + prevP + ' — threshold ' + pctFmt(thr) +
                ' (line ' + curLine[empId] + ')',
                curLine[empId]);
            }
          } else if (prev === 0 && cur !== 0) {
            push(1,
              'صافي "' + name + '" كان صفراً في مسير ' + prevP + ' وأصبح ' + moneyFmt(cur) + ' الآن (بند ' + curLine[empId] + ')',
              '"' + name + '" net was zero in ' + prevP + ' and is now ' + moneyFmt(cur) + ' (line ' + curLine[empId] + ')',
              curLine[empId]);
          }
        });
      } catch (e) { console.warn('[payroll-review-flags] check1 failed', e); skip(1, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٢ · تركه الخدمة لكنه على المسير · left service but on the sheet ── */
    (function check2() {
      if (!canEmployees) return skip(2, NOPERM[2].ar, NOPERM[2].en);
      try {
        ran(2);
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          var emp = Store.find('employees', l.employee);
          if (emp && emp.status === 'left') {
            var name = employeeName(l.employee);
            push(2,
              'الموظف "' + name + '" حالته «انتهت خدمته» لكنه على هذا المسير — بند رقم ' + (i + 1),
              '"' + name + '" is marked "left" but appears on this payroll — line ' + (i + 1),
              i + 1);
          }
        });
      } catch (e) { console.warn('[payroll-review-flags] check2 failed', e); skip(2, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٣ · موظف مكرر على المسير · duplicate employee on the sheet ── */
    (function check3() {
      if (!canPayroll) return skip(3, NOPERM[3].ar, NOPERM[3].en);
      try {
        ran(3);
        var byEmp = {};
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          (byEmp[l.employee] = byEmp[l.employee] || []).push(i + 1);
        });
        Object.keys(byEmp).forEach(function (empId) {
          if (byEmp[empId].length < 2) return;
          var name = employeeName(empId);
          push(3,
            'الموظف "' + name + '" مكرر على المسير — في البنود ' + byEmp[empId].join(' و'),
            '"' + name + '" appears more than once on this payroll — lines ' + byEmp[empId].join(', '),
            byEmp[empId][0]);
        });
      } catch (e) { console.warn('[payroll-review-flags] check3 failed', e); skip(3, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٤ · الأساسي على المسير ≠ الأساسي على البطاقة · basic ≠ card ── */
    (function check4() {
      if (!canEmployees) return skip(4, NOPERM[4].ar, NOPERM[4].en);
      try {
        ran(4);
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          var emp = Store.find('employees', l.employee);
          if (!emp) return;
          var card = Number(emp.basicSalary);
          if (!isFinite(card)) return; /* لا بطاقة راتب لهذا الموظف — لا فحص */
          var line = Number(l.basic) || 0;
          if (Math.round(line * 100) !== Math.round(card * 100)) {
            var name = employeeName(l.employee);
            push(4,
              'الأساسي على المسير لـ"' + name + '" هو ' + moneyFmt(line) + ' بينما بطاقته ' + moneyFmt(card) + ' — بند رقم ' + (i + 1),
              'On this payroll, "' + name + '"\'s basic is ' + moneyFmt(line) + ' but their card says ' + moneyFmt(card) + ' — line ' + (i + 1),
              i + 1);
          }
        });
      } catch (e) { console.warn('[payroll-review-flags] check4 failed', e); skip(4, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٥ · تأمينات الموظف ≠ المتوقع · insurance ≠ expected ── */
    (function check5() {
      if (!canEmployees) return skip(5, NOPERM[5].ar, NOPERM[5].en);
      if (!global.PayrollInsurance || typeof PayrollInsurance.compute !== 'function') {
        return skip(5, 'ملف حساب التأمينات غير محمَّل', 'The insurance-calculation file is not loaded');
      }
      try {
        ran(5);
        var rates = PayrollInsurance.rates ? PayrollInsurance.rates() : { defaultWage: 3000 };
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          var emp = Store.find('employees', l.employee);
          if (!emp) return;
          var raw = Number(emp.insuranceWage);
          var wage = (isFinite(raw) && raw > 0) ? raw : rates.defaultWage;
          var expected = PayrollInsurance.compute(wage).employee;
          var line = Number(l.insurance) || 0;
          if (Math.round(line * 100) !== Math.round(expected * 100)) {
            var name = employeeName(l.employee);
            push(5,
              'تأمينات الموظف "' + name + '" على المسير ' + moneyFmt(line) + ' بينما المتوقع ' + moneyFmt(expected) +
              ' (أجر الاشتراك ' + moneyFmt(wage) + ') — بند رقم ' + (i + 1),
              '"' + name + '"\'s insurance on this payroll is ' + moneyFmt(line) + ' but ' + moneyFmt(expected) +
              ' was expected (insurance wage ' + moneyFmt(wage) + ') — line ' + (i + 1),
              i + 1);
          }
        });
      } catch (e) { console.warn('[payroll-review-flags] check5 failed', e); skip(5, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٦ · سلفة متبقية وخصم صفر · outstanding advance, zero deduction ── */
    (function check6() {
      if (!canAdvances) return skip(6, NOPERM[6].ar, NOPERM[6].en);
      if (!global.HRDepartment || typeof HRDepartment.statement !== 'function') {
        return skip(6, 'ملف كشف حساب الموظف غير محمَّل', 'The employee-statement file is not loaded');
      }
      try {
        ran(6);
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          var st = HRDepartment.statement(l.employee);
          if (!st || !(st.outstanding > 0)) return;
          if ((Number(l.advanceDeduction) || 0) !== 0) return;

          /* تعليق: لو كل سلف هذا الموظف غير المسدَّدة تبدأ بعد شهر هذا
             المسير، فالخصم غير مستحق بعد — لا نُبلِّغ. أي سلفة تاريخها غير
             مفهوم تُحسب "مستحقة الآن" احتياطاً، لا العكس.
             Suppression note: if every one of this employee's unsettled
             advances starts after this run's period, the deduction is not
             due yet — do not flag. An advance with an unreadable start
             date counts as "due now" by default, never the opposite. */
          var suppressed = false;
          if (thisPeriod) {
            var open = Store.all('employeeAdvances').filter(function (a) {
              return a.employee === l.employee && a.status !== 'reversed' && a.status !== 'rejected' && !a.settled;
            });
            if (open.length) {
              suppressed = open.every(function (a) {
                var sp = periodParts(a.startPeriod);
                return sp && sp.norm > thisPeriod.norm;
              });
            }
          }
          if (suppressed) return;

          var name = employeeName(l.employee);
          push(6,
            'على الموظف "' + name + '" سلفة متبقية ' + moneyFmt(st.outstanding) + ' ولم يُخصم منها شيء في هذا المسير — بند رقم ' + (i + 1),
            '"' + name + '" has an outstanding advance of ' + moneyFmt(st.outstanding) + ' with nothing deducted on this payroll — line ' + (i + 1),
            i + 1);
        });
      } catch (e) { console.warn('[payroll-review-flags] check6 failed', e); skip(6, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    /* ── ٧ · لا حضور مسجَّل هذا الشهر · zero attendance this month ── */
    (function check7() {
      if (!canAttendance) return skip(7, NOPERM[7].ar, NOPERM[7].en);
      if (!thisPeriod) {
        return skip(7, 'تعذّر قراءة شهر هذا المسير — لا يمكن فحص الحضور',
          "Could not read this payroll's month — attendance cannot be checked");
      }
      try {
        ran(7);
        var allAttendance = Store.all('attendance');
        var allSheets = Store.all('siteAttendance').filter(function (s) {
          var sp = String(s.date || '');
          return sp.indexOf(thisPeriod.norm) === 0 && s.status !== 'rejected' && s.status !== 'reversed';
        });
        lines.forEach(function (l, i) {
          if (!l.employee) return;
          var statuses = [];
          allAttendance.forEach(function (a) {
            if (a.employee === l.employee && String(a.date || '').indexOf(thisPeriod.norm) === 0) statuses.push(a.attStatus);
          });
          allSheets.forEach(function (s) {
            (s.lines || []).forEach(function (sl) {
              if (sl.employee === l.employee) statuses.push(sl.attStatus);
            });
          });
          if (!statuses.length) return; /* لا صفوف إطلاقاً — لا فحص · zero rows — no flag */
          var okSeen = statuses.some(function (st) { return st === 'present' || st === 'mission'; });
          var absentCount = statuses.filter(function (st) { return st === 'absent'; }).length;
          if (!okSeen && absentCount >= 1) {
            var name = employeeName(l.employee);
            push(7,
              'لا يوجد تسجيل حضور ولا مأمورية للموظف "' + name + '" هذا الشهر — ' + numFmt(absentCount) +
              ' يوم غياب مسجَّل — حسب المسجَّل في البوابة فقط (بند رقم ' + (i + 1) + ')',
              'No "present" or "mission" record for "' + name + '" this month — ' + numFmt(absentCount) +
              ' absence day(s) logged — per what is recorded in the portal only (line ' + (i + 1) + ')',
              i + 1);
          }
        });
      } catch (e) { console.warn('[payroll-review-flags] check7 failed', e); skip(7, 'تعذّر إجراء الفحص', 'The check failed to run'); }
    })();

    return out;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · اللوحة نفسها · THE PANEL
     ═══════════════════════════════════════════════════════════════════ */
  function flagIconHTML() { return global.UI ? UI.icon('alert', 15) : '⚠'; }

  function panelHTML(rec) {
    var res = compute(rec);
    var A = ar();
    var body = '';

    if (res.flags.length) {
      body += '<div style="display:flex;flex-direction:column;gap:8px">';
      res.flags.forEach(function (f) {
        var clickAttr = f.lineIndex ? ' data-flag-line="' + f.lineIndex + '" style="cursor:pointer"' : '';
        body += '<div class="alert alert-warn"' + clickAttr + '>' + flagIconHTML() +
          '<span>' + esc(A ? f.ar : f.en) + '</span></div>';
      });
      body += '</div>';
    } else if (res.ran.length === 7) {
      body += '<div class="alert alert-success">' + (global.UI ? UI.icon('check', 17) : '') +
        '<span>' + esc(A ? 'لا ملاحظات — سبع فحوص خضراء' : 'No notes — all seven checks are clean') + '</span></div>';
    } else {
      body += '<div class="alert alert-success">' + (global.UI ? UI.icon('check', 17) : '') +
        '<span>' + esc(A ? ('لا ملاحظات — أُجريت ' + res.ran.length + ' من ٧ فحوص') :
          ('No notes — ' + res.ran.length + ' of 7 checks ran')) + '</span></div>';
      if (res.skipped.length) {
        body += '<ul class="small muted" style="margin:8px 0 0;padding-' + (A ? 'right' : 'left') + ':18px">';
        res.skipped.forEach(function (s) {
          body += '<li>' + esc(A ? s.ar : s.en) + '</li>';
        });
        body += '</ul>';
      }
    }

    return '<div class="card mb-2" id="azPayrollFlagsPanel">' +
      '<div class="card-head"><h3 class="card-title">' + flagIconHTML() + ' ' +
        esc(A ? 'ملاحظات قبل الاعتماد' : 'Notes before approving') + '</h3></div>' +
      '<div class="card-body">' + body + '</div></div>';
  }

  /* نقرة على ملاحظة لها بند → تمرير سلس إلى ذلك الصف في جدول البنود
     وومضة قصيرة — تجميلي بحت، try/catch لأن جدول البنود قد لا يكون في نفس
     النافذة (لوحة الوارد مثلاً).
     Clicking a flag that names a line → smooth-scroll to that row in the
     lines table and a brief flash — purely cosmetic, try/catch because the
     lines table may not exist in this same window (the inbox gate, e.g.). */
  function wireFlagClicks(container) {
    if (!container) return;
    var items = container.querySelectorAll('[data-flag-line]');
    items.forEach(function (el) {
      el.addEventListener('click', function () {
        try {
          var n = parseInt(el.getAttribute('data-flag-line'), 10);
          if (!n) return;
          var rows = document.querySelectorAll('#modalBody .lines-table tbody tr');
          var row = rows[n - 1];
          if (!row) return;
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var prevBg = row.style.backgroundColor;
          row.style.transition = 'background-color .2s';
          row.style.backgroundColor = '#fff3cd';
          setTimeout(function () { row.style.backgroundColor = prevBg; }, 900);
        } catch (e) { /* تجميلي بحت · purely cosmetic */ }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · الحقن رقم ١ — أعلى شاشة تفاصيل المسير
        نفس أسلوب employee-statement.js:304-322 بالضبط، بفارق واحد مقصود:
        insertBefore(firstChild) لا appendChild، لأن اللوحة يجب أن تظهر
        أعلى التفاصيل لا أسفل المرفقات والكشف.
        THE FIRST INJECTION — top of the payroll detail view. The exact
        pattern employee-statement.js:304-322 uses, with one deliberate
        difference: insertBefore(firstChild), not appendChild, because the
        panel must sit above the details, not below attachments/statement.
     ═══════════════════════════════════════════════════════════════════ */
  function injectDetail(moduleId, id) {
    if (moduleId !== 'payroll') return;
    var body = document.getElementById('modalBody');
    if (!body || document.getElementById('azPayrollFlagsPanel')) return;
    var rec = Store.find('payroll', id);
    if (!rec) return;
    var html = panelHTML(rec);
    if (!html) return;
    var div = document.createElement('div');
    div.innerHTML = html;
    var node = div.firstChild;
    body.insertBefore(node, body.firstChild);
    wireFlagClicks(node);
  }

  function installDetailHook() {
    if (!global.EntityPage || EntityPage.__azPayrollFlagsInstalled) return;
    var orig = EntityPage.openDetail;
    if (typeof orig !== 'function') return;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      /* ٢٠٠ مللي ثانية: بعد المرفقات (١٢٠) وكشف حساب الموظف (١٦٠)، حتى لا
         يتنافس ثلاثتها على نفس اللحظة — وترتيبها فيما بينها غير مهم هنا
         لأن هذه اللوحة تُدرَج بالقوة في أول العنصر لا آخره.
         200ms: after attachments (120) and the employee statement (160), so
         the three do not race at the same instant — their relative order
         does not matter here because this panel is force-inserted at the
         front, not the back. */
      setTimeout(function () { try { injectDetail(moduleId, id); } catch (e) {} }, 200);
    };
    EntityPage.__azPayrollFlagsInstalled = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · الحقن رقم ٢ — الاعتماد السريع من صندوق الوارد
        يلفّ EntityPage.doTransition المُصدَّرة فقط — أزرار شاشة التفاصيل
        تنادي الدالة الداخلية المغلقة (pages/entity.js) فلا تتأثر بهذا
        اللف؛ صندوق الوارد وحده (pages/approvals.js:43-46) ينادي النسخة
        المُصدَّرة، فهذا اللف يعمل هناك فقط تلقائياً بلا أي كشف يدوي
        للمصدر. صفر ملاحظات → مرور مباشر بلا لوحة إطلاقاً.
        THE SECOND INJECTION — the inbox's quick-approve path. Wraps only
        the EXPORTED EntityPage.doTransition — the detail view's own
        buttons call the closure-internal function (pages/entity.js), so
        they are untouched by this wrap; only the inbox
        (pages/approvals.js:43-46) calls the exported one, so this wrap
        fires there and only there, automatically, with no manual source
        detection. Zero flags → straight through, no panel at all.
     ═══════════════════════════════════════════════════════════════════ */
  function showFlagsGate(rec, proceed) {
    var A = ar();
    var html = panelHTML(rec);
    UI.modal({
      title: L({ ar: 'ملاحظات قبل الاعتماد', en: 'Notes before approving' }),
      body: '<div id="azPayrollFlagsGateBody">' + html + '</div>',
      buttons: [
        { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
        {
          /* دائماً قابل للنقر — لا يوجد شرط يعطّله. هذا الملف لا يرفض شيئاً.
             Always clickable — nothing disables it. This file refuses nothing. */
          label: L({ ar: 'متابعة الاعتماد رغم الملاحظات', en: 'Proceed with approval anyway' }),
          cls: 'btn-gold',
          onClick: function () { proceed(); }
        }
      ]
    });
    setTimeout(function () {
      try { wireFlagClicks(document.getElementById('azPayrollFlagsGateBody')); } catch (e) {}
    }, 0);
  }

  function installTransitionHook() {
    if (!global.EntityPage || EntityPage.__azPayrollFlagsTransitionInstalled) return;
    var orig = EntityPage.doTransition;
    if (typeof orig !== 'function') return;
    EntityPage.doTransition = function (moduleId, id, action, reason) {
      try {
        if (moduleId === 'payroll' && (action === 'review' || action === 'approve')) {
          var rec = Store.find('payroll', id);
          if (rec) {
            var res = compute(rec);
            if (res.flags.length) {
              var args = arguments;
              showFlagsGate(rec, function () { orig.apply(EntityPage, args); });
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[payroll-review-flags] transition gate failed — passing through unchanged', e);
      }
      return orig.apply(EntityPage, arguments);
    };
    EntityPage.__azPayrollFlagsTransitionInstalled = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · التركيب · INSTALL — نفس نمط DOMContentLoaded + setTimeout(1500)
        الاحتياطي في employee-statement.js، لكلا اللفّتين معاً.
        Same DOMContentLoaded + setTimeout(1500) fallback pattern
        employee-statement.js uses, for both wraps together.
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    installDetailHook();
    installTransitionHook();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else { install(); }
  setTimeout(install, 1500);   /* في حال تأخّر تحميل entity.js عنّا */

  global.PayrollReviewFlags = { compute: compute, panelHTML: panelHTML, threshold: threshold };
})(window);
