/* =========================================================================
   amount-in-words.js — المبلغ بالأرقام وحده على كل ورقة مالية · E-18
                         Every money paper prints figures only
   -------------------------------------------------------------------------
   العلّة
   -------
   كل مستند مالي يطبع الرقم فقط. مستخلص هيئة الطرق خرج من التجربة بمبلغ
   ٨٠٧,٥٠٠ جنيه بالأرقام وحدها. سطر «فقط ... لا غير» هو العرف المصري
   المعتاد في السندات والشيكات، بالضبط حتى لا يُبدَّل رقم أو يُقرأ خطأ.
   print.js:239-243 يطبع «المبلغ:» ثم I18N.money(...) — أي الرقم مرة أخرى،
   لا كلاماً. لا كود تفقيط في أي مكان في المشروع (بحث شامل، نفي مع ضابط
   إيجابي — V20).

   THE PROBLEM
   -----------
   Every money document prints figures only. A هيئة الطرق مستخلص left the
   trial at 807,500 EGP in digits alone. The «فقط … لا غير» words line is
   standard Egyptian voucher/cheque practice precisely so a figure cannot
   be altered or misread. print.js:239-243's own "amount in words" block
   prints the numeral again, never words. No tafqit code exists anywhere
   in the portal (a full search, with a positive control, found none).

   النطاق — مقيس لا مفترَض
   --------------------------
   خمسة عشر شاشة تحمل amountField (نتيجة تشغيل حقيقي على ملفات schema.js
   وhr-department.js، لا قراءة): journal, purchaseApprovals, goodsReceipts,
   supplierInvoices, payments, receipts, stockIssues, stockTransfers,
   stockCounts, budgets, clientIPCs, subIPCs, payroll, employeeAdvances,
   dailyLabour. كلها تربح السطر من نفس نقطة الحقن. sheets-templates.js
   بلا amountField عمداً (قرار المالك ٢٧ أغسطس) فتُستثنى تلقائياً دون أي
   لمس لذلك القرار. employee-statement.js يطبع من نافذته المستقلة الخاصة
   (تعليق الملف نفسه :195-196 يقول ذلك) فلا يربح هذا السطر — عمل منفصل لو
   طُلب لاحقاً.

   SCOPE — measured, not assumed
   ------------------------------
   Fifteen modules carry amountField (a real run against schema.js and
   hr-department.js). All fifteen gain the line from one landing spot.
   sheets-templates.js deliberately has none (owner's 27 Aug decision) and
   is excluded automatically. employee-statement.js prints through its own
   standalone window and is out of scope — a separate small job if wanted.

   الآلية — لفّ Print.doc، لا تعديل print.js
   ---------------------------------------------
   doc() تبني HTML كاملاً وتُسلّمه إلى open() الداخلية التي تستعمل
   window.open ثم document.write ثم win.print() بعد 500ms — كل ما قبل
   document.close() متزامن داخل doc(). فنستبدل window.open مؤقتاً بنسخة
   تلتقط النافذة الحقيقية، ننادي doc() الأصلية، نُعيد window.open في
   finally (حتى عند رمي استثناء)، ثم نبحث عن صندوق .words داخل الوثيقة
   الملتقطة ونُلحق سطراً واحداً بداخله. لماذا لفّ لا تعديل مباشر
   لسطر print.js:239-243: (أ) القاعدة الإضافية — حذف ملف واحد يعيد الورقة
   كما هي اليوم بالضبط؛ (ب) قاعدة ١٧ — تعديل يعني لصق ٣٤١ سطراً كاملة كل
   مرة، وأي تعديل مستقبلي على print.js يحمل سطرنا معه للأبد؛ (ج) شرط
   محروس داخل print.js (window.Tafqit && ...) يربط الملفين فعلياً على أي
   حال. الخطة تُجيز صراحةً العودة إلى التعديل المباشر لو وجد الفاحص ثغرة
   حقيقية في اللفّ.

   THE MECHANISM — wrap Print.doc, do not edit print.js
   --------------------------------------------------------
   doc() builds the full HTML and hands it to the closure-internal open(),
   which uses window.open, then document.write, then win.print() on a
   500ms timer — everything before document.close() is synchronous inside
   doc(). So we temporarily swap window.open for a capturing version,
   call the real doc(), restore window.open in a finally (even on throw),
   then find .words inside the captured document and append one line.

   التفقيط — عرف بيتي بلا اعتماديات، مقفَل تماماً
   ---------------------------------------------------
   يغطي 0 < v < 1e12، بمنازل قروش (Math.round(v*100)) — نفس تقريب الرقم
   المطبوع (I18N.num(v,2))، فلا يمكن أن يختلف الكلام عن الرقم على قيمة
   مقرَّبة. أي قيمة سالبة أو غير محدودة أو NaN أو ≥ 1e12 تُعيد '' — السطر
   يغيب، ولا يظهر كلام خطأ أبداً. الغياب دائماً أفضل من كلام غلط على ورقة
   مالية.

   THE TAFQIT CONVENTION — house-written, no dependency, fully closed
   ------------------------------------------------------------------
   Coverage 0 < v < 1e12, to قروش precision (Math.round(v*100)) — the same
   rounding as the printed figure, so words and figure can never disagree
   on a rounded value. Any negative, non-finite, NaN or ≥1e12 value returns
   '' — the line is simply absent, never a wrong sentence. Absence always
   beats a wrong sentence on a money paper.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────
     الجزء أ · المحوِّل — window.Tafqit، دالة صِرفة يمكن للتجربة مناداتها
     مباشرة بلا أي DOM.
     PART A — the converter, exported as window.Tafqit, a pure function so
     the trial can call it directly with no DOM involved.
     ───────────────────────────────────────────────────────────────────── */
  var ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  var TEENS = ['أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
               'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']; /* 11..19 */
  var TENS = { 20: 'عشرون', 30: 'ثلاثون', 40: 'أربعون', 50: 'خمسون',
               60: 'ستون', 70: 'سبعون', 80: 'ثمانون', 90: 'تسعون' };
  var HUNDREDS = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
                  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  /* فهرس المرتبة: ١=ألف، ٢=مليون، ٣=مليار — يكفي لأن السقف 1e12 لا يبلغ
     التريليون. Scale index: 1=thousand, 2=million, 3=billion — enough
     because the 1e12 ceiling never reaches a trillion. */
  var SCALE_SING = { 1: 'ألف', 2: 'مليون', 3: 'مليار' };
  var SCALE_DUAL = { 1: 'ألفان', 2: 'مليونان', 3: 'ملياران' };
  var SCALE_PLUR = { 1: 'آلاف', 2: 'ملايين', 3: 'مليارات' };

  /* رقم من ١ إلى ٩٩ — «واحد وعشرون» (الآحاد ثم العشرات بواو الجمع)،
     نمط ثابت لكل تركيب في هذا الملف. A number 1..99 — unit-then-ten
     joined with و, the fixed composition pattern used everywhere below. */
  function twoDigit(r) {
    if (r <= 10) return ONES[r];
    if (r <= 19) return TEENS[r - 11];
    var tens = Math.floor(r / 10) * 10, ones = r % 10;
    return ones === 0 ? TENS[tens] : (ONES[ones] + ' و' + TENS[tens]);
  }

  /* رقم من ١ إلى ٩٩٩ — مئات + الباقي بواو الجمع. A number 1..999 —
     hundreds + remainder, joined with و. */
  function threeDigit(n) {
    var h = Math.floor(n / 100), r = n % 100;
    var hWord = h ? HUNDREDS[h] : '';
    var rWord = r ? twoDigit(r) : '';
    if (hWord && rWord) return hWord + ' و' + rWord;
    return hWord || rWord;
  }

  /* مجموعة ثلاثية مضروبة بمرتبة (ألف/مليون/مليار): ١ ⇐ كلمة المرتبة
     مجرَّدة («ألف» لا «واحد ألف»)، ٢ ⇐ المثنى مجرَّداً («ألفان»)، وباقي
     المائة بين ٣ و١٠ ⇐ جمع («آلاف»)، غير ذلك ⇐ مفرد («ألف»).
     A 3-digit group at a scale (thousand/million/billion): 1 → the bare
     scale word (never "one thousand"), 2 → the bare dual, remainder mod
     100 in 3..10 → plural, else → singular. */
  function scaledGroup(n, scaleIdx) {
    if (n === 1) return SCALE_SING[scaleIdx];
    if (n === 2) return SCALE_DUAL[scaleIdx];
    var word = threeDigit(n);
    var mod = n % 100;
    var scale = (mod >= 3 && mod <= 10) ? SCALE_PLUR[scaleIdx] : SCALE_SING[scaleIdx];
    return word + ' ' + scale;
  }

  /* عدد صحيح موجب إلى مجموعات ثلاثية (وحدات/آلاف/ملايين/مليارات)، ثم
     تركيبها من الأعلى للأقل بواو الجمع، متجاوزة أي مجموعة صفرية.
     A positive integer into 3-digit groups (units/thousands/millions/
     billions), composed high-to-low with و, skipping any zero group. */
  function groupsToWords(value) {
    var groups = [0, 0, 0, 0], n = value;
    for (var i = 0; i < 4; i++) { groups[i] = n % 1000; n = Math.floor(n / 1000); }
    var parts = [];
    for (var i = 3; i >= 0; i--) {
      if (!groups[i]) continue;
      parts.push(i === 0 ? threeDigit(groups[i]) : scaledGroup(groups[i], i));
    }
    return parts.join(' و');
  }

  /* عبارة الجنيهات أو القروش الكاملة — واحد ⇐ «اسم النوع واحد» بلا رقم
     سابق، اثنان ⇐ صيغة المثنى وحدها، وباقي المائة بين ٣ و١٠ ⇐ جمع، غير
     ذلك ⇐ رقم + مفرد. نفس المنطق للجنيه وللقرش بنفس الدالة.
     The full pounds/qirsh phrase — 1 → "noun واحد" with no leading
     number, 2 → the bare dual noun alone, remainder mod 100 in 3..10 →
     plural, else → number + singular. Same logic serves both جنيه and
     قرش through this one function. */
  function moneyPhrase(n, forms) {
    if (n === 0) return '';
    if (n === 1) return forms.one;
    if (n === 2) return forms.two;
    var mod = n % 100;
    var noun = (mod >= 3 && mod <= 10) ? forms.few : forms.many;
    return (forms.words(n)) + ' ' + noun;
  }

  var POUND_FORMS = { one: 'جنيه واحد', two: 'جنيهان', few: 'جنيهات', many: 'جنيه', words: groupsToWords };
  var QIRSH_FORMS = { one: 'قرش واحد', two: 'قرشان', few: 'قروش', many: 'قرش', words: twoDigit };

  /* Tafqit.egp(v) → «فقط ... لا غير» أو '' — الفشل هنا هو الأمان دائماً.
     Tafqit.egp(v) → the full sentence, or '' — failure here is always
     the SAFE outcome. */
  function egp(v) {
    var n = Number(v);
    /* التغطية ٠ < v < 1e12 حرفياً — صفر وما دونه وما لا نهاية له وNaN
       و1e12 فأكثر كلها تُعيد '' فوراً. Number('') === 0 في جافاسكربت،
       فتسقط تلقائياً هنا مع الصفر — لا حاجة لفحصها بمفردها.
       Coverage is literally 0 < v < 1e12 — zero and below, non-finite,
       NaN, and 1e12-and-above all return '' immediately. Number('') is 0
       in JavaScript, so it falls through here with zero — no separate
       check needed. */
    if (!isFinite(n) || n <= 0 || n >= 1e12) return '';

    /* نفس تقريب الرقم المطبوع تماماً (i18n.js:309-317 يقرِّب لمنزلتين) —
       الكلام والرقم لا يختلفان أبداً على قيمة مقرَّبة.
       The exact same rounding the printed figure uses (i18n.js:309-317
       rounds to 2 places) — words and figure can never disagree on a
       rounded value. */
    var tp = Math.round(n * 100);
    if (tp <= 0) return ''; /* قيمة تُقرَّب إلى صفر — لا كلام لصفر */
    var pounds = Math.floor(tp / 100);
    var qirsh = tp % 100;

    var poundsSection = moneyPhrase(pounds, POUND_FORMS);
    var qirshSection = moneyPhrase(qirsh, QIRSH_FORMS);

    var body = poundsSection && qirshSection ? (poundsSection + ' و' + qirshSection)
             : (poundsSection || qirshSection);
    if (!body) return ''; /* لا يحدث عملياً بعد فحص tp<=0 أعلاه — احتياط صريح */

    /* «مصري» غير مكتوبة عمداً — تتبع العرف اليومي وقرار ENHANCER المسجَّل؛
       تبديل سطر واحد لو طُلبت لاحقاً. اللغة عربية دائماً بصرف النظر عن
       لغة الواجهة — العرف المصري الرسمي عربي، والقراءتان تطبعان نفس
       السطر القانوني (قرار مُتَّخذ، القسمان يؤديان لنفس الشكل).
       "مصري" deliberately omitted — follows everyday practice and the
       recorded ENHANCER decision; a one-line swap if ever wanted. Always
       Arabic regardless of UI language — the official convention is
       Arabic and both readings must print the identical legal line. */
    return 'فقط ' + body + ' لا غير';
  }

  global.Tafqit = { egp: egp };

  /* ─────────────────────────────────────────────────────────────────────
     الجزء ب · خطاف الطباعة — لفّ Print.doc
     PART B — the print hook, wrapping Print.doc
     ───────────────────────────────────────────────────────────────────── */
  if (!global.Print || typeof global.Print.doc !== 'function') return;

  var origDoc = global.Print.doc;

  global.Print.doc = function (moduleId, recId) {
    var realOpen = global.open, captured = null;
    /* التقاط النافذة الحقيقية بلا تغيير سلوكها — نمرّر النداء كما هو
       ونحتفظ بالمرجع فقط. Capture the real window with no change to its
       behaviour — pass the call through and just keep the reference. */
    global.open = function () {
      captured = realOpen.apply(global, arguments);
      return captured;
    };
    try {
      return origDoc.apply(global.Print, arguments);
    } finally {
      /* الاستعادة تحدث حتى عند رمي origDoc استثناءً — finally لا catch.
         Restoration happens even if origDoc throws — finally, not catch. */
      global.open = realOpen;
      try { inject(captured, moduleId, recId); }
      catch (e) { /* الكلام إضافة على الطباعة — فشله لا يفسدها أبداً */ }
    }
  };

  function inject(win, moduleId, recId) {
    /* نافذة منعها المتصفح — print.js نفسه أظهر تنبيهه بالفعل؛ لا شيء نفعله.
       Popup blocked by the browser — print.js has already shown its own
       toast; nothing left to do here. */
    if (!win || !win.document) return;

    /* التزامن الذاتي مع شرط print.js نفسه (:240): صندوق .words لا يوجد
       إلا حين mod.amountField && rec[mod.amountField] صادقان — فلا رقم
       غائب يمكن أن يختلف مع الكلام أبداً، لأن الكلام لا يُلحَق إلا حيث
       الرقم موجود أصلاً.
       Self-syncing with print.js's own condition (:240): the .words box
       exists only when mod.amountField && rec[mod.amountField] is
       truthy — so an absent figure can never disagree with words, since
       words are appended only where a figure already is. */
    var box = win.document.querySelector('.words');
    if (!box) return;

    var mod = global.Schema && global.Schema.get(moduleId);
    if (!mod || !mod.amountField) return;
    var rec = global.Store && global.Store.find(mod.table, recId);
    if (!rec) return;

    var text = egp(rec[mod.amountField]);
    if (!text) return;

    /* عنصر جديد بنص خام (textContent لا innerHTML) — لا شيء هنا يُقرأ
       كترميز مهما كان محتوى النص. A fresh element with raw text
       (textContent, never innerHTML) — nothing here is ever parsed as
       markup, whatever the text contains. */
    var div = win.document.createElement('div');
    div.style.fontWeight = '700';
    div.textContent = text;
    box.appendChild(div);
  }

})(typeof window !== 'undefined' ? window : this);
