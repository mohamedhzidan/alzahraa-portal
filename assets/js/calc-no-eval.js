/* =========================================================================
   calc-no-eval.js — الإجماليات تُحسب من جديد: آلة حاسبة صغيرة لا تحتاج «تشغيل نصّ كبرنامج»
                     Totals compute again: a small calculator that never runs text as code
   -------------------------------------------------------------------------
   العطل — قِيس في متصفّح حقيقي، لا بقراءة الشيفرة (١١ سبتمبر ٢٠٢٦، TRACK P10)
   THE FAULT — measured in a real browser, not by reading code (11 Sept 2026)

   ui.js:221-234 تحسب كل حقل «calc» صيغته نصّ (مثل 'qty*price') بتحويل النصّ إلى
   برنامج: Function('"use strict";return (' + expr + ')') في ui.js:231. وقاعدة
   الأمان في index.html نفسها (script-src 'self' 'wasm-unsafe-eval' — بلا
   'unsafe-eval') تمنع ذلك، فيرمي المتصفّح EvalError، ويبتلعه catch في ui.js:233،
   فترجع الدالّة 0 — بلا رسالة. النتيجة على الموقع الحيّ اليوم:
     · إجمالي كل سطر (كمية × سعر) يظهر 0.00 ويُحفَظ 0 — اعتماد شراء، استلام، صرف،
       تحويل، جرد، موازنة
     · إجمالي فاتورة المورّد، صافي الراتب، أعمال المستخلص وصافيه — كلها 0
   وقاعدة البيانات محقّة حين ترفض إرسال مستند إجماليّه 0 وبنوده ليست صفراً، فلا
   يُرسَل راتب ولا فاتورة ولا مستخلص. قِيس: 14 حقلاً من 14.
   و«لماذا لم يره أحد»: طرفية المطوّر (DevTools) وصندوق Node يتجاوزان قاعدة الأمان،
   فيعطيان الرقم الصحيح. الأداة الخطأ — قاعدة المشروع ٣٨.

   ui.js:221-234 evaluates every STRING-formula calc field (e.g. 'qty*price') by
   turning the text into a program: Function(...) at ui.js:231. The page's own
   safety rule (index.html: script-src 'self' 'wasm-unsafe-eval', WITHOUT
   'unsafe-eval') forbids that, so the browser throws EvalError, the catch at
   ui.js:233 swallows it, and 0 comes back — silently. On the live site today
   every line total, supplier-invoice total, net pay and certificate amount shows
   0.00 and is SAVED as 0, and the database rightly refuses to send it. Measured:
   14 fields of 14. DevTools and a Node sandbox bypass the safety rule and show
   the right number — the wrong instrument (Standing Order 38).

   -------------------------------------------------------------------------
   العلاج · THE FIX
   آلة حاسبة صغيرة تقرأ الصيغة حرفاً حرفاً وتحسبها بنفسها. تفهم فقط ما تستعمله
   الصيغ الأربع عشرة: أسماء الحقول، الأرقام، + − × ÷ والأقواس، والسالب. أيّ رمز
   آخر يُرفَض بصوت عالٍ (console.error) ويُسجَّل في UI.__azCalcNoEvalFailed، فيمنع
   money-send-check.js الإرسال بدل أن يمرّ صفرٌ صامت.
   قراءة قيمة الحقل هي نفسها حرفياً في ui.js:228: (Number(rec[name]) || 0) — لا
   قراءة جديدة للأرقام أو الفواصل. والنتيجة: isFinite(out) ? out : 0 مثل ui.js:232.
   A small calculator reads the formula character by character and computes it
   itself. It understands ONLY what the 14 formulas use: field names, numbers,
   + − × ÷, brackets and unary minus. Any other symbol is refused LOUDLY
   (console.error) and recorded in UI.__azCalcNoEvalFailed, so money-send-check.js
   blocks Send instead of a silent zero passing. A field's value is read EXACTLY
   as ui.js:228 reads it — (Number(rec[name]) || 0) — no new reading of digits or
   commas; the result is isFinite(out) ? out : 0 as at ui.js:232.

   ⚠️ displayValue مغلَّفة أيضاً — لماذا · WHY displayValue IS WRAPPED TOO
   ui.js:200 داخل displayValue تنادي computeValue **الداخلية المغلقة** لا UI.computeValue
   المُصدَّرة، فلفّ المُصدَّرة وحدها يُصلح النموذج ويترك القوائم وشاشة التفاصيل
   والطباعة على صفرها — الفخّ نفسه الذي وثّقه calc-formulas.js:69-82.
   ui.js:200 calls the CLOSURE-INTERNAL computeValue, not the exported one, so
   wrapping only the exported one fixes the form and leaves every list, detail
   view and printout at zero — the same trap calc-formulas.js:69-82 documents.
   We rebuild ui.js:199-200's exact output for string-formula calc fields only.

   ما لا يفعله · WHAT IT DOES NOT DO
   · لا يلمس صيغة «دالّة» (calc-formulas.js يتولّاها) ولا أيّ حقل غير «calc».
   · لا يكتب في المخزن ولا يرسل شيئاً — يحسب فقط.
   · لا يكتب صيغة بنفسه: يقرأ الصيغ كما وضعتها schema.js وpayroll-net.js
     وclient-ipc-withholding.js — فلا توجد نسخة ثانية تنحرف.
   · Never touches a FUNCTION formula (calc-formulas.js owns those) or a
     non-calc field. Writes and sends nothing. Holds no formula of its own: it
     reads them as schema.js, payroll-net.js and client-ipc-withholding.js set them.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف فيعود سلوك اليوم حرفياً (الصفر).
   Delete this file and today's behaviour (the zeros) returns exactly.
   يُحمَّل بعد calc-formulas.js مباشرة · Load immediately after calc-formulas.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var UI = global.UI;
  if (!UI || typeof UI.computeValue !== 'function' || typeof UI.displayValue !== 'function') {
    console.error('calc-no-eval.js needs ui.js first — calculated money boxes will stay at zero');
    return;
  }
  if (UI.__azCalcNoEval) return;
  UI.__azCalcNoEval = true;
  UI.__azCalcNoEvalFailed = UI.__azCalcNoEvalFailed || [];

  /* ═══ ١ · تقطيع الصيغة إلى رموز · splitting the formula into tokens ═══ */
  function tokenize(src) {
    var out = [], i = 0, c, m;
    while (i < src.length) {
      c = src.charAt(i);
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      if ('+-*/()'.indexOf(c) !== -1) { out.push({ t: 'op', v: c }); i++; continue; }
      m = /^(\d+(\.\d+)?|\.\d+)/.exec(src.slice(i));
      if (m) { out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      m = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(src.slice(i));
      if (m) { out.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      /* رمز لا تعرفه الآلة: يُرفض بصوت — لا تخمين · an unknown symbol: refused, never guessed */
      throw new Error('unknown symbol «' + c + '» at position ' + i + ' in formula «' + src + '»');
    }
    return out;
  }

  /* ═══ ٢ · قراءة الرموز بترتيب الحساب المعتاد (× ÷ قبل + −)
         parsing with ordinary precedence (× ÷ before + −) ═══
     expr   := term (('+'|'-') term)*
     term   := factor (('*'|'/') factor)*
     factor := ('+'|'-') factor | number | name | '(' expr ')'           */
  function parse(src) {
    var toks = tokenize(src), p = 0;
    function peek() { return toks[p]; }
    function take() { return toks[p++]; }
    function expr() {
      var node = term(), tk;
      while ((tk = peek()) && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) { take(); node = { op: tk.v, a: node, b: term() }; }
      return node;
    }
    function term() {
      var node = factor(), tk;
      while ((tk = peek()) && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) { take(); node = { op: tk.v, a: node, b: factor() }; }
      return node;
    }
    function factor() {
      var tk = take();
      if (!tk) throw new Error('formula ends too early: «' + src + '»');
      if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) return { op: 'u' + tk.v, a: factor() };
      if (tk.t === 'num') return { num: tk.v };
      if (tk.t === 'id') return { id: tk.v };
      if (tk.t === 'op' && tk.v === '(') {
        var inner = expr(), close = take();
        if (!close || close.t !== 'op' || close.v !== ')') throw new Error('missing «)» in formula «' + src + '»');
        return inner;
      }
      throw new Error('unexpected «' + tk.v + '» in formula «' + src + '»');
    }
    var tree = expr();
    if (p !== toks.length) throw new Error('unexpected «' + toks[p].v + '» in formula «' + src + '»');
    return tree;
  }

  function run(node, rec) {
    if (node.num !== undefined) return node.num;
    /* بالحرف كما ui.js:228 · exactly as ui.js:228 */
    if (node.id !== undefined) return (Number(rec[node.id]) || 0);
    switch (node.op) {
      case 'u-': return -run(node.a, rec);
      case 'u+': return +run(node.a, rec);
      case '+': return run(node.a, rec) + run(node.b, rec);
      case '-': return run(node.a, rec) - run(node.b, rec);
      case '*': return run(node.a, rec) * run(node.b, rec);
      case '/': return run(node.a, rec) / run(node.b, rec);
    }
    throw new Error('bad node');
  }

  var cache = {};
  function compile(src) {
    if (!Object.prototype.hasOwnProperty.call(cache, src)) cache[src] = parse(src);
    return cache[src];
  }
  function evaluate(src, rec) {
    var out = run(compile(src), rec || {});
    return isFinite(out) ? out : 0;       /* بالحرف كما ui.js:232 · exactly as ui.js:232 */
  }
  function isStringCalc(f) { return !!f && f.type === 'calc' && typeof f.formula === 'string'; }
  /* الفشل يُسجَّل بالاسم وبالصيغة نفسها: money-send-check.js يطابق بالصيغة، لأن «lineTotal» اسمٌ في عشر
     شاشات (bug-reporter P10، ١١ سبتمبر) · a failure is recorded by name AND by the formula itself:
     money-send-check.js matches on the formula, because «lineTotal» is a name on ten screens */
  UI.__azCalcNoEvalFailedFormulas = UI.__azCalcNoEvalFailedFormulas || [];
  function fail(f, e) {
    var name = (f && f.name) || '?';
    if (UI.__azCalcNoEvalFailed.indexOf(name) === -1) UI.__azCalcNoEvalFailed.push(name);
    if (f && typeof f.formula === 'string' && UI.__azCalcNoEvalFailedFormulas.indexOf(f.formula) === -1) UI.__azCalcNoEvalFailedFormulas.push(f.formula);
    console.error('[calc-no-eval] could not compute «' + name + '» — ' + (e && e.message ? e.message : e) +
      ' · Send will be blocked for documents that use it (money-send-check.js).');
  }

  /* ═══ ٣ · القيمة نفسها · the value itself ═══
     نفس خطوات ui.js:221-234 بالترتيب، والفرق الوحيد سطر الحساب.
     The same steps as ui.js:221-234 in order; only the calculation line differs. */
  var origCompute = UI.computeValue;
  UI.computeValue = function (f, rec) {
    if (!isStringCalc(f)) return origCompute.apply(UI, arguments);
    if (!rec) return 0;
    if (typeof rec[f.name] === 'number' && !f.formula) return rec[f.name];
    try { return evaluate(f.formula, rec); }
    catch (e) { fail(f, e); return origCompute.apply(UI, arguments); }
  };

  /* ═══ ٤ · العرض في القوائم والتفاصيل والطباعة — نفس مخرج ui.js:199-200 حرفياً
         display in lists, detail and print — ui.js:199-200's exact output ═══ */
  var origDisplay = UI.displayValue;
  UI.displayValue = function (f, rec) {
    if (!isStringCalc(f)) return origDisplay.apply(UI, arguments);
    return '<span class="money">' + I18N.money(UI.computeValue(f, rec)) + '</span>';
  };

  /* ═══ ٥ · فحص ذاتي عند التحميل: كل صيغة نصّية على الشاشات تُقرأ، ورقم معروف يُحسب
         load-time self-check: every string formula on every screen parses, and a
         known sum computes ═══ */
  function allStringFormulas() {
    var out = [];
    var mods = (global.Schema && Schema.MODULES) || [];
    mods.forEach(function (m) {
      (m.fields || []).concat(m.lines && m.lines.fields ? m.lines.fields : []).forEach(function (f) {
        if (isStringCalc(f)) out.push({ mod: m.id, name: f.name, formula: f.formula });
      });
    });
    return out;
  }
  var checked = 0;
  allStringFormulas().forEach(function (x) {
    try { compile(x.formula); checked++; } catch (e) { fail({ name: x.mod + '.' + x.name, formula: x.formula }, e); }
  });
  var probe = evaluate('qty*price', { qty: 2, price: 150.5 });
  if (probe !== 301 || UI.__azCalcNoEvalFailed.length) {
    console.error('calc-no-eval.js SELF-CHECK FAILED — 2 × 150.50 gave ' + probe + '; failed: ' + UI.__azCalcNoEvalFailed.join(', '));
  } else {
    console.info('calc-no-eval.js ready — ' + checked + ' string formulas compute without running text as code (self-check 2 × 150.50 = 301).');
  }

  /* للتجارب فقط: نفس الحاسبة، ليقارنها اختبار الانحراف بالطريقة القديمة
     For the trials: the same calculator, so the drift test can compare it with the old way. */
  global.CalcNoEval = { evaluate: evaluate, parse: parse, formulas: allStringFormulas, selfCheckCount: checked };
})(window);
