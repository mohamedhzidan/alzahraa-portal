/* =========================================================================
   money-send-check.js — قبل «إرسال»: هل الإجماليات المحفوظة تطابق البنود؟
                         Before «Send»: do the saved totals match the lines?
   -------------------------------------------------------------------------
   لماذا · WHY  (TRACK P10, 11 سبتمبر ٢٠٢٦)
   حتى يصل calc-no-eval.js كانت كل الإجماليات المحسوبة تُحفَظ صفراً (قاعدة الأمان
   تمنع طريقة ui.js:231). المسودّات المحفوظة قبل الإصلاح ما زالت تحمل هذه الأصفار،
   فإذا ضغط صاحبها «إرسال» دون أن يفتحها رفضت قاعدة البيانات برسالة إنجليزية
   لا يفهمها أحد: «Document line total does not match quantity and price».
   Until calc-no-eval.js, every calculated total was SAVED as zero (the page's
   safety rule blocks ui.js:231). Drafts saved before the fix still carry those
   zeros; pressing Send on one without opening it gets an English refusal from
   the database that nobody on site can read.

   ما يفعله · WHAT IT DOES
   ١) عند «إرسال» فقط: يعيد حساب إجماليات المستند المحفوظ بالطريقة نفسها التي
      يحسب بها النموذج (نسخة مطابقة لـ pages/entity.js:674-707 بلا شاشة)، ويقارنها
      بالمحفوظ بسماحية 0.02 — السماحية نفسها في قاعدة البيانات (03:596).
      إن اختلفا: لا يُرسَل، وتظهر رسالة عربية تقول ماذا يفعل: افتح ← تعديل ← حفظ.
   ٢) إن رفضت قاعدة البيانات لسبب مالي: تُترجم الرسالة إلى عربي بسيط، والإنجليزية
      بين قوسين كما هي — لا تُخفى ولا تُبتلع. الرفض يبقى رفضاً دائماً.
   1) On «Send» only: recompute the saved document's totals exactly as the form
      does (a screen-less copy of pages/entity.js:674-707), compare with what is
      saved at 0.02 — the database's own tolerance (03:596). If they differ: do
      not send; an Arabic message says what to do: open → Edit → Save.
   2) If the database refuses for a money reason: the message is put into plain
      Arabic with the English kept in brackets — never hidden, never swallowed.
      A refusal always stays a refusal.

   ما لا يفعله · WHAT IT DOES NOT DO
   · لا يكتب شيئاً ولا يحفظ تلقائياً (قرار المدير Q5: رسالة فقط). الحفظ ملكُ
     مسار Prompt-2 — هذا الملف لا ينادي Store.save ولا يلفّه.
   · لا يغيّر من يعتمد ماذا، ولا يمسّ المراجعة أو الاعتماد — «إرسال» فقط.
   · Writes nothing, never re-saves (manager ruling Q5). Saving belongs to the
     Prompt-2 lane — this file neither calls nor wraps Store.save. Changes no
     approval right; touches Send only.

   🔴 يجب أن يكون الغلاف الأخير (الأخارجي) على Workflow.transition
   🔴 It must be the OUTERMOST wrapper on Workflow.transition
   الأغلفة الموجودة بترتيب التحميل: workflow-route.js (يستبدل) ← workflow-policy.js
   ← one-step-approval.js ← inbox-project-fence.js ← emergency-money-hold.js ←
   sheet-approval-hold.js. لو لفّنا أحدٌ بعدنا لمرّ رفضُه قبل فحصنا أو بعده بلا
   ترتيب معروف. فبعد اكتمال التحميل (AZ_LOAD_DONE) وعند كل نداء: إن لم نكن
   الأخارجي، نصير «خاملين» (نمرّر كما هو) ونقول ذلك بصوت — لا نعمل في مكان خطأ.
   The existing wrappers in load order are listed above. If anything wrapped us
   AFTER us, its refusals would run in an unknown order around ours. So once
   loading is done (AZ_LOAD_DONE), and on every call: if we are not outermost we
   go INERT (pass straight through) and say so loudly — never working from the
   wrong place. Workflow.__azMoneySendCheck reports 'outermost' / 'NOT-OUTERMOST'.

   إضافي بالكامل · ADDITIVE. احذفه فيعود سلوك «إرسال» اليوم حرفياً.
   Delete it and today's Send behaviour returns exactly.
   🔴 الشرط الحقيقي: أن يكون آخر غلاف على Workflow.transition — أي بعد sheet-approval-hold.js (آخر من
   يلفّها في r6). أما sent-document-cancel-guard.js فيلفّ Store.save لا Workflow.transition، وهو مجرّد
   المكان الحرفيّ المريح في المحمِّل (صحّحه المدير-2، ١٢ سبتمبر).
   🔴 The real requirement: be the LAST wrapper on Workflow.transition — i.e. after sheet-approval-hold.js,
   the last file that wraps it in r6. sent-document-cancel-guard.js wraps Store.save, NOT
   Workflow.transition; it is only the convenient literal slot (corrected by MANAGER-2, 12 Sept).
   الفتحة الحرفية · the literal slot: after sent-document-cancel-guard.js, before version-badge.js.
   ========================================================================= */
(function (global) {
  'use strict';

  /* 🔴 عند التحميل نحتاج Workflow وحده. قِيس (١١ سبتمبر، مُتحقِّق P10): النسخة الأولى
     كانت تشترط UI أيضاً عند التحميل، فإذا حُمِّل الملف مبكراً (قبل ui.js) تعطّل بصمت
     إلى الأبد — بلا 'NOT-OUTERMOST' ولا أيّ حالة. الآن: Schema/Store/UI تُطلب لحظة
     «إرسال» فقط، والتحميل المبكر يُكشف بفحص «الأخارجي» أدناه ويُعلَن بصوت.
     🔴 At load we need Workflow only. MEASURED (11 Sept, the P10 verifier): the first
     version also required UI at load, so loaded early (before ui.js) it disabled itself
     silently forever — no 'NOT-OUTERMOST', no state at all. Now Schema/Store/UI are
     needed only at the moment of Send, and an early load is caught by the outermost
     check below and announced loudly. */
  if (!global.Workflow || typeof Workflow.transition !== 'function') {
    console.error('money-send-check.js: Workflow missing — NOT installed; Send is unchanged');
    global.__azMoneySendCheckState = 'NOT-INSTALLED: Workflow missing at load';
    return;
  }
  if (Workflow.__azMoneySendCheck) return;

  var TOL = 0.02;   /* نفس سماحية قاعدة البيانات · the database's own tolerance (03:596, 603, 624, 632, 644) */

  function lang() { return global.I18N && I18N.getLang ? I18N.getLang() : 'ar'; }
  function num(v) { return Number(v) || 0; }
  function labelOf(f) { return f && f.label ? (lang() === 'en' ? f.label.en : f.label.ar) || f.name : (f && f.name) || '?'; }

  /* ═══ ١ · نسخة بلا شاشة من pages/entity.js:674-707 (recalc) — نفس الخطوات بالترتيب
         a screen-less copy of pages/entity.js:674-707 (recalc) — same steps, same order ═══ */
  function recalcCopy(mod, d) {
    if (mod.lines) {
      (d.lines || []).forEach(function (ln) {
        mod.lines.fields.forEach(function (lf) { if (lf.type === 'calc') ln[lf.name] = UI.computeValue(lf, ln); });
      });
      (mod.lines.totals || []).forEach(function (tot) {
        var sum = 0;
        (d.lines || []).forEach(function (ln) { sum += Number(ln[tot.field]) || 0; });
        d[tot.target] = sum;
      });
      if (mod.lines.grandTotal) {
        var rate = Number(d.taxRate) || 0;
        d.taxAmount = (Number(d.subTotal) || 0) * rate / 100;
        d.grandTotal = (Number(d.subTotal) || 0) + d.taxAmount;
      }
    }
    mod.fields.forEach(function (f) { if (f.type === 'calc') d[f.name] = UI.computeValue(f, d); });
    if (!mod.lines && d.subTotal !== undefined && d.taxRate !== undefined && d.grandTotal !== undefined) {
      d.taxAmount = (Number(d.subTotal) || 0) * (Number(d.taxRate) || 0) / 100;
    }
    return d;
  }

  /* 🔴 نفحص فقط ما تفحصه قاعدة البيانات عند «إرسال» — لا كل حقل محسوب. قِيس (bug-reporter P10،
     ١١ سبتمبر): فحصُ كل حقل محسوب رفض سلفةً جديدة صحيحة برسالة كاذبة («حُفظ قبل إصلاح الحساب»)،
     لأن «المسدَّد/المتبقّي» في السلف يُحسب من سجلات أخرى ولا تفحصه قاعدة البيانات أصلاً.
     القائمة من 03:565-645 (بنود وإجماليات، فاتورة المورد، المستخلصات) ومن مشغّل P10 لكشف العمالة.
     🔴 Check ONLY what the database checks at Send — never every calculated box. MEASURED (P10
     bug-reporter, 11 Sept): checking every calc box refused a correct NEW advance with a false
     message, because an advance's repaid/outstanding boxes are computed from OTHER records and the
     database never checks them. The list comes from 03:565-645 and P10's daily-labour trigger. */
  var DB_CHECKED = {
    purchaseApprovals: { line: ['lineTotal'], head: ['subTotal', 'taxAmount', 'grandTotal'] },
    goodsReceipts:     { line: ['lineTotal'], head: ['subTotal', 'taxAmount', 'grandTotal'] },
    stockIssues:       { line: ['lineTotal'], head: ['subTotal'] },
    stockTransfers:    { line: ['lineTotal'], head: ['subTotal'] },
    stockCounts:       { line: ['lineTotal'], head: ['subTotal'] },
    budgets:           { line: ['lineTotal'], head: ['subTotal'] },
    payroll:           { line: ['lineTotal'], head: ['netTotal'] },
    supplierInvoices:  { line: [], head: ['taxAmount', 'grandTotal'] },
    clientIPCs:        { line: [], head: ['currentWork', 'netDue'] },
    subIPCs:           { line: [], head: ['currentWork', 'netDue'] },
    dailyLabour:       { line: ['lineTotal'], head: ['totalAmount'] }
  };
  /* أسماء عربية للمجاميع التي لا حقل لها في الشاشة (entity.js:112-119) — لا «taxAmount» خاماً أمام الموظّف
     Arabic names for totals that have no screen field (entity.js:112-119) — never a raw «taxAmount» in front of staff */
  var TOTAL_LABELS = {
    subTotal:    { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal' },
    taxAmount:   { ar: 'قيمة الضريبة', en: 'Tax amount' },
    grandTotal:  { ar: 'الإجمالي', en: 'Total' },
    netTotal:    { ar: 'صافي الإجمالي', en: 'Net total' },
    totalAmount: { ar: 'إجمالي الكشف', en: 'Sheet total' }
  };
  /* يقرأ فقط — لا يكتب شيئاً في تعريف الشاشة · reads only — never writes into the screen definition */
  function findField(mod, name, inLines) {
    var list = inLines ? (mod.lines ? mod.lines.fields : []) : (mod.fields || []);
    for (var k = 0; k < list.length; k++) if (list[k].name === name) return list[k];
    if (!inLines && mod.lines) {
      var ts = mod.lines.totals || [];
      for (var q = 0; q < ts.length; q++) if (ts[q].target === name) return { name: name, label: ts[q].label };
    }
    return null;
  }
  function labelFor(mod, name, inLines) {
    var f = findField(mod, name, inLines);
    if (f && f.label) return labelOf(f);
    var t = TOTAL_LABELS[name];
    return t ? (lang() === 'en' ? t.en : t.ar) : name;
  }
  /* 🔴 الفشل يُعرَف بالصيغة نفسها لا باسم الحقل: «lineTotal» اسمٌ في عشر شاشات، فالمطابقة بالاسم كانت
     توقف «إرسال» في كل الشاشات إن فشلت صيغة واحدة (bug-reporter P10). الصيغة نفسها تفشل في كل مكان أو لا تفشل.
     🔴 A failure is recognised by the FORMULA itself, never the field name: «lineTotal» is a name on ten
     screens, so name matching would block Send everywhere when one formula failed (P10 bug-reporter).
     The same formula fails everywhere or nowhere. */
  function usedFormulaFailed(mod, sel) {
    var failedF = UI.__azCalcNoEvalFailedFormulas || [];
    var failedN = UI.__azCalcNoEvalFailed || [];
    if (!failedF.length && !failedN.length) return [];
    var names = [];
    sel.head.concat(sel.line).forEach(function (name) {
      [findField(mod, name, false), findField(mod, name, true)].forEach(function (f) {
        if (f && f.type === 'calc' && ((typeof f.formula === 'string' && failedF.indexOf(f.formula) !== -1) || failedN.indexOf(mod.id + '.' + f.name) !== -1)) names.push(labelOf(f));
      });
    });
    return names;
  }

  function money(v) { return global.I18N && I18N.money ? I18N.money(v, false) : String(Math.round(v * 100) / 100); }

  /* ═══ ٢ · الفحص نفسه — يُرجع null إن طابق، أو رسالة الرفض
         the check itself — returns null when it matches, or the refusal text ═══ */
  var depsWarned = false, calcWarned = false;
  function checkBeforeSend(moduleId, recId) {
    if (!global.Schema || !global.Store || !global.UI) {
      /* لا يُحكم بلا أدوات — قاعدة البيانات تبقى الحَكَم · no judging without the tools — the database stays the authority */
      if (!depsWarned) { depsWarned = true; console.error('money-send-check.js: Schema/Store/UI missing at Send — the saved-totals check is skipped; the database still checks.'); }
      return null;
    }
    /* 🔴 F1 (مراجعة المدير-2، ١٢ سبتمبر): بلا الآلة الحاسبة (calc-no-eval.js) كل صيغة نصّية تُحسب صفراً،
       فإعادة الحساب هنا تعطي 0 وتكذّب على صاحب المستند: «المحفوظ ١٬٠٠٠٬٠٠٠ — الصحيح 0.00» وتطلب منه
       يحفظ من جديد، فيكتب الأصفار بيده. قِيس على موقع فيه هذا الملف وبلا الحاسبة (المحمِّل يكمل رغم فشل
       ملف). فلا حكم بلا أداة — قاعدة البيانات هي الحَكَم، تماماً كفرع النواقص أعلاه.
       🔴 F1 (MANAGER-2's review, 12 Sept): without calc-no-eval.js every string formula computes 0, so the
       recompute here returns 0 and LIES to the person: «saved 1,000,000 — correct 0.00», telling them to
       save again, which would write the zeros by hand. Measured on a site carrying this file without the
       calculator (the loader continues past a failed script). So: no judging without the tool — the
       database judges, exactly like the missing-dependency branch above. */
    if (!UI.__azCalcNoEval) {
      if (!calcWarned) { calcWarned = true; console.error('money-send-check.js: calc-no-eval.js is not installed — the saved-totals check is skipped; the database still checks every total.'); }
      return null;
    }
    var mod = Schema.get(moduleId);
    if (!mod) return null;
    var sel = DB_CHECKED[mod.table];
    if (!sel) return null;                                              /* قاعدة البيانات لا تفحص حساباً هنا · the database checks no arithmetic here */
    var rec = Store.find(mod.table, recId);
    if (!rec) return null;

    var broken = usedFormulaFailed(mod, sel);
    if (broken.length) {
      return lang() === 'en'
        ? 'Not sent. This device cannot compute ' + broken.join(', ') + ' right now — nothing was sent. Report it to support.'
        : 'لم يُرسَل. هذا الجهاز لا يستطيع حساب «' + broken.join('، ') + '» الآن — لم يُرسَل شيء. أبلغ الدعم.';
    }

    /* بنود ليست قائمة (نصّ مخزَّن) أو فيها سطر فارغ: لا نحكم — قاعدة البيانات تقرّر (bug-reporter P10: كان يرمي خطأً)
       lines that are not a list (stored as text) or hold an empty row: do not judge — the database decides (P10 bug-reporter: it used to throw) */
    if (mod.lines && rec.lines != null && (!Array.isArray(rec.lines) || rec.lines.some(function (l) { return !l || typeof l !== 'object'; }))) return null;
    var fresh = recalcCopy(mod, JSON.parse(JSON.stringify(rec)));
    var diffs = [];
    /* السماحية نفسها في قاعدة البيانات، مع هامش لكسور الحاسوب: 0.02 بالضبط كانت تُقرأ 0.020000000000000018
       the database's own tolerance, with room for float noise: exactly 0.02 used to read as 0.020000000000000018 */
    var off = function (a, b) { return Math.abs(a - b) > TOL + 1e-9; };
    sel.line.forEach(function (name) {
      (rec.lines || []).forEach(function (ln, i) {
        var want = num((fresh.lines[i] || {})[name]), got = num(ln[name]);
        if (off(want, got)) diffs.push({ label: labelFor(mod, name, true) + ' (' + (lang() === 'en' ? 'line ' : 'البند ') + (i + 1) + ')', got: got, want: want });
      });
    });
    sel.head.forEach(function (name) {
      if (rec[name] === undefined && fresh[name] === undefined) return;
      var want = num(fresh[name]), got = num(rec[name]);
      if (off(want, got)) diffs.push({ label: labelFor(mod, name, false), got: got, want: want });
    });
    if (!diffs.length) return null;

    var shown = diffs.slice(0, 3).map(function (x) {
      return lang() === 'en'
        ? x.label + ': saved ' + money(x.got) + ', correct ' + money(x.want)
        : x.label + ': المحفوظ ' + money(x.got) + ' — الصحيح ' + money(x.want);
    }).join(' · ') + (diffs.length > 3 ? (lang() === 'en' ? ' · and ' + (diffs.length - 3) + ' more' : ' · و' + (diffs.length - 3) + ' غيرها') : '');
    return lang() === 'en'
      /* F3: لا سبب مُخمَّن في الرسالة — نقول ما قِيس فقط (المدير-2، ١٢ سبتمبر)
         F3: no guessed reason in the message — say only what was measured (MANAGER-2, 12 Sept) */
      ? 'Not sent. The totals saved in this document do not match its lines. Open it → Edit → Save once, then Send. [' + shown + ']'
      : 'لم يُرسَل. الإجماليات المحفوظة لا تطابق بنوده. افتحه ← «تعديل» ← «حفظ» مرة واحدة، ثم أرسله. [' + shown + ']';
  }

  /* ═══ ٣ · ترجمة رفض قاعدة البيانات المالي — الإنجليزية تبقى بين قوسين
         the database's money refusals in Arabic — the English stays in brackets ═══
     النصوص الإنجليزية حرفياً من 03:549-653 و72:181-184 وملف P10 · verbatim from
     03:549-653, 72:181-184 and the P10 SQL file */
  var AR = [
    ['Document line total does not match quantity and price', 'إجمالي أحد البنود لا يساوي الكمية × السعر'],
    ['Document subtotal is inconsistent', 'مجموع المستند لا يساوي مجموع بنوده'],
    ['Document tax or grand total is inconsistent', 'الضريبة أو الإجمالي النهائي لا يطابق البنود'],
    ['Payroll total is inconsistent', 'إجمالي كشف الرواتب لا يساوي مجموع صافي الموظفين'],
    ['Payroll net amount cannot be negative', 'صافي راتب أحد الموظفين أقل من صفر — راجع الخصومات'],
    ['Invalid payroll amount', 'في كشف الرواتب رقم سالب في أحد البنود'],
    ['Invoice totals are inconsistent', 'إجمالي الفاتورة لا يساوي القيمة + الضريبة − الخصم والتحصيل'],
    ['Invoice amount must be positive', 'قيمة الفاتورة يجب أن تكون أكبر من صفر'],
    ['Invalid invoice tax values', 'نسبة الضريبة أو الخصم والتحصيل في الفاتورة غير صحيحة'],
    /* يرفض أيضاً حين تكون السابقة أكبر من التراكمية (03:632) — فالرسالة تقول السببين (bug-reporter P10)
       also refused when previous work exceeds cumulative (03:632) — the message names both reasons (P10 bug-reporter) */
    ['IPC current work is inconsistent', 'أعمال هذا المستخلص يجب أن تساوي الأعمال التراكمية − السابقة، ولا تكون بالسالب (الأعمال السابقة أكبر من التراكمية)'],
    ['IPC net due is inconsistent', 'صافي المستحق لا يطابق حساب المستخلص'],
    ['Invalid IPC tax values', 'الخصم والتحصيل في المستخلص لا يمكن أن يكون سالباً'],
    ['Invalid IPC tax rate', 'نسبة الضريبة في المستخلص غير صحيحة'],
    ['Invalid document quantity or price', 'في أحد البنود كمية صفر أو سعر سالب'],
    ['Document lines are required', 'المستند بلا بنود'],
    ['Document amount must be positive', 'المبلغ يجب أن يكون أكبر من صفر'],
    ['Daily labour line total does not match days and day rate', 'إجمالي أحد العمال لا يساوي الأيام × اليومية + الإضافي'],
    ['Daily labour sheet total is inconsistent', 'إجمالي الكشف لا يساوي مجموع العمال'],
    ['Invalid goods receipt quantities', 'كميات الاستلام غير صحيحة (المقبول + المرفوض أكبر من المستلَم)'],
    ['Invalid stock count quantities', 'كميات الجرد غير صحيحة'],
    ['Invalid tax rate', 'نسبة الضريبة غير صحيحة'],
    ['Insufficient source warehouse stock', 'رصيد المخزن المُحوَّل منه لا يكفي لهذه الكمية'],
    ['Insufficient warehouse stock', 'الرصيد في المخزن لا يكفي لهذه الكمية'],
    ['Stock count book quantity is stale', 'الرصيد الدفتري تغيّر منذ حفظ الجرد — افتح الجرد واحفظه من جديد'],
    ['Stock item is required', 'أحد البنود بلا صنف'],
    ['Unknown stock item', 'أحد الأصناف غير موجود في دليل الأصناف'],
    ['Duplicate supplier invoice number', 'رقم فاتورة المورد مسجّل من قبل لنفس المورد'],
    ['Future-dated workflow documents are not allowed', 'لا يُرسَل مستند تاريخه في المستقبل'],
    ['Journal debit and credit must balance', 'القيد غير متوازن: المدين لا يساوي الدائن'],
    ['A journal must contain lines', 'القيد بلا سطور'],
    ['Payment or receipt amount must be positive', 'المبلغ يجب أن يكون أكبر من صفر'],
    ['Finance manager approval limit exceeded', 'المبلغ فوق حدّ اعتماد المدير المالي (١٠٠٬٠٠٠) — يعتمده المدير العام']
  ];
  /* البادئة حسب الخطوة — «لم يُرسَل» خطأ على رفضٍ عند الاعتماد · the prefix follows the step — «not sent» is wrong for an approval refusal */
  var PREFIX = { submit: 'لم يُرسَل', review: 'لم تتمّ المراجعة', approve: 'لم يُعتمد', return: 'لم يُرجَع', reject: 'لم يُرفض', reverse: 'لم يُلغَ' };
  function explain(err, action) {
    if (typeof err !== 'string' || lang() === 'en') return err;
    for (var i = 0; i < AR.length; i++) if (err.indexOf(AR[i][0]) !== -1) return (PREFIX[action] || 'لم يتمّ') + ': ' + AR[i][1] + ' (' + err + ')';
    return err;
  }

  /* ═══ ٤ · التركيب — الأخارجي أو لا شيء · install — outermost or nothing ═══ */
  var inner = Workflow.transition;
  var state = 'installed';
  var self = async function (moduleId, recId, action, reason) {
    if (Workflow.transition !== self) {
      /* لفّنا أحدٌ بعدنا — لسنا الأخارجي: نمرّر كما هو ونقول ذلك
         something wrapped us after we loaded — not outermost: pass straight through, loudly */
      if (state !== 'NOT-OUTERMOST') { state = 'NOT-OUTERMOST'; Workflow.__azMoneySendCheck = state; console.error('money-send-check.js is NOT the outermost Send wrapper — it stays inert. Load it last (before version-badge.js).'); }
      return inner.apply(this, arguments);
    }
    if (action === 'submit') {
      /* خطأ داخل الفحص لا يوقف «إرسال» ولا يُبتلع بصمت: يُكتب في الطرفية وتحكم قاعدة البيانات
         an error inside the check never blocks Send and is never silent: it is logged and the database decides */
      var stop = null;
      try { stop = checkBeforeSend(moduleId, recId); }
      catch (e) { console.error('money-send-check.js: the saved-totals check failed (' + (e && e.message) + ') — sending to the database, which checks again.'); stop = null; }
      if (stop) return { ok: false, error: stop };
    }
    var res = await inner.apply(this, arguments);          /* خطأ مرميّ يمرّ كما هو · a thrown error passes through untouched */
    if (res && res.ok === false && res.error) return Object.assign({}, res, { error: explain(res.error, action) });
    return res;
  };
  Workflow.transition = self;
  Workflow.__azMoneySendCheck = state;

  (function settle(n) {
    if (global.AZ_LOAD_DONE || n > 150) {
      state = Workflow.transition === self ? 'outermost' : 'NOT-OUTERMOST';
      Workflow.__azMoneySendCheck = state;
      if (state === 'outermost') console.info('money-send-check.js ready — outermost Send wrapper; saved totals are checked before Send.');
      else console.error('money-send-check.js is NOT the outermost Send wrapper after loading — it stays inert.');
      return;
    }
    setTimeout(function () { settle(n + 1); }, 200);     /* حدّ أقصى ~30 ثانية · finite: ~30 s at most */
  })(0);

  global.MoneySendCheck = { check: checkBeforeSend, explain: explain, recalcCopy: recalcCopy };
})(window);
