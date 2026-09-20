/* =========================================================================
   payroll-vouchers.js — «إنشاء سندات صرف الرواتب» بزرٍّ في يد المالية
   payroll-vouchers.js — the finance button that raises the payment vouchers
   for an approved payroll run.
   -------------------------------------------------------------------------
   شاشة مَن · WHOSE SCREEN: تفاصيل مسير رواتب **معتمد** ← «إنشاء سندات صرف
   الرواتب». يُنشئ **مسودتَي** سند صرف: إجمالي التحويل البنكي، وإجمالي الكاش.
   The detail of an APPROVED payroll run → «إنشاء سندات صرف الرواتب». It
   creates TWO payment vouchers as DRAFTS: one bank total, one cash total.

   🔴 لماذا زرٌّ لا مُشغِّل تلقائي · WHY A BUTTON AND NOT A TRIGGER — مقيس:
      الصفّ الجديد يُختم «أنشأه» باسم الفاعل الحالي (`03:459-462`)، والمعتمِد
      لا يعتمد ما أنشأه بنفسه (`03:672`). فسندٌ يُنشأ تلقائياً لحظة اعتماد
      المسير يصير «أنشأه» المعتمِد — ولو تجاوز ١٠٠٬٠٠٠ لاحتاج المدير العام،
      وهو نفسه من أنشأه، فيُرفض. الزرّ في يد المالية يحلّ ذلك بلا حيلة.
      A new row is stamped createdBy = the current actor (03:459-462), and an
      approver may not approve what they created (03:672). A voucher raised
      automatically at approval would be "created by" the approver — and above
      100,000 it needs the GM, who would then be refused as its own creator.
      A finance button dissolves that with no trickery. (Owner decision 2.)

   🔴 مرّة واحدة لكل مسير ولكل طريقة صرف — والقاعدة هي التي تمنع، لا هذا الملف.
      فهرس فريد على (payrollRun, method) في ملف P11-A. الضغط مرّتين يُرفض من
      القاعدة، لا من زرٍّ معطَّل في المتصفح.
      ONE voucher per run per method — enforced by a unique index in file
      P11-A, not by this file. Pressing twice is refused by the DATABASE, not
      by a greyed-out button, because a greyed-out button is not a rule.

   بنك أم كاش · BANK OR CASH: من له رقم حساب بنكي في ملفه ⇒ تحويل، ومن لا
   ⇒ كاش. **هذا افتراضٌ معلَن لا قاعدة مؤكَّدة** — سؤال أ. محمد عمارة ١٠ في
   دفعة ٢٨. ويُكتب في وصف السند بنصّه، فلا يظنّه أحد حكماً.
   A bank account on file ⇒ transfer, otherwise cash. **A STATED DEFAULT, not
   a confirmed rule** — عمارة's question ١٠. It is written into the voucher's
   own description so nobody mistakes it for a ruling.

   🔴 القرار D4 (مُعتمَد من TRACK MANAGER-4) — لماذا نافذة اختيار حسابٍ لا
      نموذج «تأكيد» بسيط: عمود `payments."cashAccount"` نصٌّ **NOT NULL** ولا
      شيء يُخفّفه (`01-SUPABASE-SETUP.sql:369`، والحالة الافتراضية `status`
      عند الخادم هي 'draft' فقط — `01-SUPABASE-SETUP.sql:378`). وكان هذا
      الملف يُنشئ المسودتين بلا حقل `cashAccount` إطلاقاً فيرفضهما الخادم
      بصمت («null value in column "cashAccount"») بينما يقول الزرّ «...
      في طريقها للخادم» وكأنّ شيئاً نجح. الآن تُختار الخزينة/البنك **قبل**
      الإنشاء، من نافذةٍ حقيقية (`UI.modal`، لأن `UI.confirm` يعرض نصّاً
      فقط داخل `<p>` ولا يستطيع حمل عناصر `<select>` — `ui.js:154-165`)،
      ولا يُنشأ شيء إن تُركت خانة مطلوبة فارغة. وعملة الحساب
      (`cashAccounts.currency`، نصٌّ حرّ — `schema.js:419`) شُوهدت فيها
      «ج.م» و«egp» وفارغة معاً؛ فلا تُعرض إلا حسابات الجنيه، وأيّ عملة غير
      معروفة تُستبعد صراحة بدل افتراض أنها جنيه.
      🔴 DECISION D4 (approved by TRACK MANAGER-4) — WHY an account-picker
      window and not a plain confirm: `payments."cashAccount"` is a **NOT
      NULL** text column with nothing relaxing it
      (`01-SUPABASE-SETUP.sql:369`; the server's own default for `status` is
      only 'draft' — `01-SUPABASE-SETUP.sql:378`). This file used to create
      both drafts with the `cashAccount` field omitted entirely, so the
      server silently refused both ("null value in column \"cashAccount\"")
      while the button said "... on its way to the server" as if something
      had worked. The cash box / bank account is now chosen **before**
      creation, in a real window (`UI.modal`, because `UI.confirm` renders
      only escaped text inside a `<p>` and cannot hold `<select>` elements —
      `ui.js:154-165`), and nothing is created if a required box is left
      empty. The account's currency (`cashAccounts.currency`, free text —
      `schema.js:419`) has been seen as «ج.م», «egp» and blank, all at once;
      only pound accounts are offered, and any unrecognised currency is
      excluded rather than assumed to be the pound.

   إضافيّ بالكامل · WHOLLY ADDITIVE.  v2.0.37 · نسخة الرفع بعد المراجعة · release copy, after review.
   ========================================================================= */
(function (global) {
  'use strict';

  var missing = [];
  ['Schema', 'Auth', 'Store', 'UI', 'I18N'].forEach(function (k) { if (!global[k]) missing.push(k); });
  if (!missing.length) {
    ['esc', 'toast', 'modal', 'confirm'].forEach(function (f) { if (typeof UI[f] !== 'function') missing.push('UI.' + f); });
    if (typeof Store.create !== 'function') missing.push('Store.create');
    if (typeof Auth.can !== 'function') missing.push('Auth.can');
  }
  if (missing.length) {
    console.error('payroll-vouchers.js NOT installed — missing: ' + missing.join(', ') +
                  '. No voucher button will appear, deliberately: a half-working money button is worse than none.');
    return;
  }
  /* 🔴 طريقةُ الدفع تُقرأ من الشاشة نفسها، ولا تُكتب بالاسم أبداً.
     أثبته التشغيل: كان هذا الملف يكتب 'bank'، وشاشةُ المدفوعات لا تحمل هذا
     الخيار أصلاً — خياراتها cash / cheque / transfer (schema.js:58-62). فلمّا
     تُفتح الاستمارة تقع الخانة على الخيار **الفارغ**، وأيُّ حفظٍ يُفرّغ طريقة
     الدفع. وحينها ينهار الفهرس الذي يمنع صرف المسير مرّتين، لأن الفارغ لا
     يساوي الفارغ في فهرسٍ فريد: **سندان لنفس المسير يُقبلان معاً** — أي
     رواتب شهرٍ تُصرف مرّتين. وفوق ذلك يظهر «bank» بالإنجليزية على شاشة عربية
     ويسقط كلُّ تصفيةٍ محاسبية على «تحويل بنكي».
     🔴 The payment method is READ from the screen, never spelled out here.
     Proven by running: this file wrote 'bank', and the payments screen has no
     such option — its options are cash / cheque / transfer (schema.js:58-62).
     So opening the form lands the box on the EMPTY option and any save blanks
     the method. The index that stops a run being paid twice then collapses,
     because NULL never equals NULL in a unique index: TWO vouchers for the
     same run are both accepted — a month's payroll paid twice. And «bank»
     showed as an English word on an Arabic screen, invisible to every
     accounting filter on «تحويل بنكي». */
  var PAY = (function () {
    var f = ((Schema.get('payments') || {}).fields || []).filter(function (x) { return x.name === 'method'; })[0];
    var opts = (f && f.options || []).map(function (o) { return o.value; });
    return { transfer: opts.indexOf('transfer') !== -1 ? 'transfer' : null,
             cash:     opts.indexOf('cash') !== -1 ? 'cash' : null,
             all:      opts };
  })();
  if (!PAY.transfer || !PAY.cash) {
    console.error('payroll-vouchers.js NOT installed — the payments screen does not offer both ' +
                  '"transfer" and "cash". It offers: [' + PAY.all.join(', ') + ']. Writing a method the ' +
                  'screen cannot show empties the box on the first save, and an empty method lets the ' +
                  'same payroll run be paid twice. No button will appear, deliberately.');
    return;
  }

  if (UI.__p11Vouchers) return;
  UI.__p11Vouchers = true;

  var ar = function () { return I18N.getLang() === 'ar'; };
  var L = function (o) { return I18N.L ? I18N.L(o) : (ar() ? o.ar : o.en); };
  var n2 = function (v) { return Math.round((Number(v) || 0) * 100) / 100; };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ═══ ٠ · حسابات الجنيه فقط — العملة نصٌّ حرّ ولا يُحسم بمساواة صارمة ═══
     العملة (`cashAccounts.currency`, schema.js:419) نصٌّ حرٌّ افتراضه 'EGP'،
     وشُوهدت فيه «ج.م» و«egp» وفارغة معاً. مساواة صارمة `=== 'EGP'` كانت
     ستُسقط «ج.م» بالخطأ (حساب جنيهٍ حقيقي يُستبعد ظلماً). فنُطبّع (نزيل
     النقاط والمسافات ونُحوّل لحروف صغيرة) ونقارن بقائمة أشكال الجنيه
     المقبولة فقط؛ أيّ نصّ آخر غير فارغ **يُستبعد صراحة**، فلا نفترض قطّ أنّ
     عملةً لا نعرفها هي الجنيه — الصرف بعملة أجنبية من حساب جنيهٍ خطأ محاسبي
     أثقل من حسابٍ مفقود من القائمة.
     THE ONLY POUND CURRENCY IS OFFERED — currency is free text, never a
     strict equality. `cashAccounts.currency` (schema.js:419) is free text
     defaulting to 'EGP', and «ج.م», «egp» and blank have all been seen. A
     strict `=== 'EGP'` would wrongly drop «ج.م» (a real pound account
     unjustly excluded). We normalise (strip dots/spaces, lower-case) and
     compare against the accepted pound spellings only; any OTHER non-blank
     text is EXCLUDED, never assumed to be the pound — paying in a foreign
     currency from what looked like a pound account is a heavier accounting
     mistake than one missing account from a list. */
  /* 🔴 بلاغ الأعطال ١٣ سبتمبر: القائمة القديمة (٥ أشكال فقط) رفضت ١١ كتابةً
     حقيقية للجنيه — «جنيه مصرى» بالألف المقصورة (لوحة المفاتيح المصرية
     المعتادة)، «جنية» (خطأ تاء مربوطة شائع جداً)، مسافةً زائدة في آخر
     النص، «E£»/«£E»، علامة اتجاهٍ خفيّة (RLM) من لصقٍ من إكسل، مسافةً غير
     فاصلة (NBSP)، تطويلاً (ـ) داخل الكلمة، «مصري» وحدها، الجمع «جنيهات»،
     «EGY»، والفاصلة العشرية العربية (٫) بدل النقطة — فتختفي حساباتٌ جنيهيةٌ
     حقيقية من قائمة الاختيار بلا أي تفسير. التطبيع الآن يزيل علامات
     الاتجاه/الخفاء أولاً، ثم يُسقط التطويل، ثم يُوحِّد الألف المقصورة
     والتاء المربوطة إلى حرفَيهما العاديين، ثم يحوّل الفاصلة العربية إلى
     نقطة (تُحذف لاحقاً مع النقاط)، ثم يحوّل المسافة غير الفاصلة إلى مسافة
     عادية، ثم يُطبَّق ما كان موجوداً: قصّ، تصغير، حذف النقاط والمسافات.
     القائمة المقبولة توسّعت لتغطية كل شكلٍ رآه التقرير — وبقي كل شيءٍ آخر
     (USD، دولار، EUR، SAR، ريال) مُستبعَداً كما كان، لأن الصرف بعملةٍ
     أجنبية من حساب ظنّه المستخدم جنيهاً أثقل من حسابٍ ناقصٍ من القائمة.
     رمز الجنيه المفرد «£» وحده لم يُضَف عمداً: هو عالمياً رمز الجنيه
     الإسترليني لا المصري، ولم يظهر في أي حسابٍ حقيقي رآه هذا الملف، فقبوله
     كان سيُخاطر بلا فائدة تُذكر.
     🔴 Bug report, 13 Sept: the old list (5 shapes only) rejected 11 REAL
     pound spellings — «جنيه مصرى» with alef-maqsura (the common Egyptian
     keyboard spelling), «جنية» (a very common taa-marbuta typo), a trailing
     space, «E£»/«£E», an invisible direction mark (RLM) from an Excel
     paste, a non-breaking space, a tatweel (kashida) inside the word,
     «مصري» alone, the plural «جنيهات», «EGY», and the Arabic decimal
     separator (٫) instead of a dot — so real pound accounts vanished from
     the picker with no explanation at all. Normalisation now strips
     direction/invisible marks first, then drops the tatweel, then folds
     alef-maqsura and taa-marbuta to their plain letters, then turns the
     Arabic decimal separator into a dot (removed later with the dots),
     then turns a non-breaking space into a normal one, then applies what
     already existed: trim, lower-case, strip dots and spaces. The accepted
     list grew to cover every shape the report found — everything else
     (USD, دولار, EUR, SAR, ريال) stays excluded exactly as before, because
     paying in a foreign currency from what looked like a pound account is
     heavier than one missing account from a list. The bare pound sign «£»
     alone was deliberately NOT added: internationally it is sterling, not
     the Egyptian pound, and no real account seen by this file has ever
     carried it — accepting it would risk something for no real benefit. */
  function isPoundCurrency(raw) {
    var v = (raw === null || raw === undefined) ? '' : String(raw).trim();
    if (!v) return true;                          /* فارغ = الافتراض EGP · blank = the schema default EGP */
    /* نقرأ علامات الاتجاه/الخفاء باسمها الرمزي \u… لا بلصقها مباشرةً في الكود — حرفٌ خفيٌ ملصقٌ مباشرة لا يمكن تدقيقه بالعين ولا هو مضمونٌ أن يبقى سليماً بعد أي حفظٍ أو تحويل ترميزٍ؛ الاسم الرمزي يبقى صحيحاً دائماً ويمكن لأي أحدٍ قراءته والتحقق منه.
       INVISIBLE MARKS BY THEIR \u… ESCAPE NAME, NEVER PASTED DIRECTLY
       into the source — a pasted invisible character cannot be eyeballed
       and is not guaranteed to survive a save or an encoding change; the
       escape name always stays correct and anyone can read and verify
       it. */
    var norm = v
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF]/g, '')  /* bidi/zero-width marks */
      .replace(/\u0640/g, '')                          /* التطويل · tatweel (kashida) */
      .replace(/\u0649/g, '\u064A')                     /* ى (ألف مقصورة) ← ي · alef-maqsura → yaa */
      .replace(/\u0629/g, '\u0647')                     /* ة (تاء مربوطة) ← ه · taa-marbuta → haa */
      .replace(/[\u066B\u060C]/g, '.')                  /* ٫ ، ← . · Arabic decimal separator / comma → dot */
      .replace(/\u00A0/g, ' ')                          /* مسافة غير فاصلة ← مسافة عادية · NBSP → normal space */
      .trim()
      .toLowerCase()
      .replace(/[.\s]/g, '');
    var POUND = ['egp', 'egy', 'le', 'جم', 'جنيه', 'جنيهمصري', 'جنيهات', 'مصري', 'e£', '£e'];
    return POUND.indexOf(norm) !== -1;
  }

  /* حسابات الخزائن/البنوك المتاحة لنوعٍ بعينه، بالجنيه فقط، ونشطة فقط.
     نتبع هنا بالضبط نمط اختيار `ref` الحقيقي في `entity.js:612-622`: قراءة
     مباشرة من `Store.all(table)` وتصفية `status !== 'inactive'` بلا
     `Auth.scopeRows` — لأن وحدة `cashAccounts` لا تحمل حقل `project` أصلاً
     (`schema.js:401-424`)، و`scopeRows` تُعيد الصفوف كما هي حين لا يوجد هذا
     الحقل (`auth.js:1020-1025`)، فاستدعاؤها هنا كان سيكون بلا أثر البتّة.
     Available cash/bank accounts of one kind, pound-only, active-only. This
     follows the REAL `ref` picker exactly (`entity.js:612-622`): read
     straight from `Store.all(table)` and filter `status !== 'inactive'`,
     with no `Auth.scopeRows` — because the `cashAccounts` module carries no
     `project` field at all (`schema.js:401-424`), and `scopeRows` returns
     rows unchanged when that field is absent (`auth.js:1020-1025`), so
     calling it here would have had zero effect. */
  function pickerAccounts(kind) {
    var all = Store.all('cashAccounts').filter(function (r) { return r.status !== 'inactive'; });
    var byKind = all.filter(function (r) { return r.kind === kind; });
    var out = [];
    byKind.forEach(function (r) {
      if (isPoundCurrency(r.currency)) { out.push(r); return; }
      /* أيّ حسابٍ يُستبعد يُطبَع، فحسابُ جنيهٍ استُبعِد ظلماً يظهر لا يختفي.
         Every excluded account is logged, so a pound account wrongly
         excluded is VISIBLE, not silently gone. */
      console.warn('payroll-vouchers.js: excluded cash account "' + (r.name || r.code || r.id) +
                    '" — non-pound currency "' + r.currency + '"');
    });
    return out;
  }

  /* ═══ ١ · القسمة بنك/كاش — وكل اسمٍ يُعدّ مرّة واحدة ═════════════════ */
  function split(run) {
    var bank = { total: 0, names: [] }, cash = { total: 0, names: [] };
    (run.lines || []).forEach(function (l) {
      var e = Store.find('employees', l.employee) || {};
      var amt = n2(l.lineTotal);
      if (amt <= 0) return;                       /* صافي صفر لا يُصرف · a zero net is not paid */
      var box = (e.bankAccount && String(e.bankAccount).trim()) ? bank : cash;
      box.total = n2(box.total + amt);
      box.names.push(e.name || l.employee);
    });
    return { bank: bank, cash: cash };
  }

  /* ═══ ٢ · إنشاء المسودتين ════════════════════════════════════════════
     `accounts` = { bank: <معرّف حساب بنكي>, cash: <معرّف خزينة نقدية> } —
     يضمنها المُتحقّق في النافذة قبل استدعاء هذه الدالّة (انظر القسم ٣)، فلا
     تُستدعى إلا وقد اختير الحساب المطلوب لكلّ سندٍ سيُنشأ فعلاً.
     `accounts` = { bank: <bank account id>, cash: <cash box id> } — the
     window's validator (section 3) guarantees these before this function is
     ever called, so it never runs without the account a real voucher needs. */
  /* 🔴 ١٥ سبتمبر ٢٠٢٦ (المرور 3i، FINISHER-8 بأمر MANAGER-4): مسيرٌ بلا تاريخ يأخذ سنداه تاريخَ اليوم — ويجب أن يكون يوم القاهرة، وإلا حمل سندٌ صُرف بعد منتصف الليل تاريخَ أمس
     (وجده بحث MANAGER-4 عن العائلة، ١٥ سبتمبر).
     كان السطر يقصّ نصّ التاريخ بصيغة ISO إلى عشرة أحرف، وتلك الصيغة بتوقيت غرينتش دائماً، فبين 00:00 و03:00 بالقاهرة (02:00 شتاءً)
     يكون «اليوم» يومَ أمس. نفس عائلة إصلاح i18n.js في ٢ سبتمبر وملف 77. I18N.today أولاً (مصدرٌ واحد لليوم في البورتال كله)، وإن غاب:
     الحساب نفسه من مُحصِّلات الوقت المحلي.
     🔴 15 Sept 2026 (pass 3i, FINISHER-8 on MANAGER-4's order): a run with no date gives its vouchers today's date — and it must be Cairo's day, or a voucher made after midnight carries
     yesterday's date (found by MANAGER-4's family search, 15 Sept).
     The line cut the ISO date string to ten characters, and that string is always UTC, so between 00:00 and 03:00 Cairo (02:00 in
     winter) «today» was yesterday. Same family as i18n.js's 2 Sept fix and file 77. I18N.today first (one source for the day across
     the portal); if it is missing, the same computation from local getters. */
  function localToday() {
    if (global.I18N && typeof global.I18N.today === 'function') return global.I18N.today();
    var d = new Date(), m = String(d.getMonth() + 1), day = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
  }

  async function create(run, accounts) {
    var A = ar();
    var s = split(run);
    var made = [], refused = [];
    accounts = accounts || {};

    for (var i = 0; i < 2; i++) {
      var isBank = i === 0;
      var part = isBank ? s.bank : s.cash;
      if (!part.total) continue;
      var chosenAccount = isBank ? accounts.bank : accounts.cash;
      var payload = {
        date: run.date || localToday(),
        payeeType: 'employee',
        beneficiary: A ? ('رواتب ' + (run.period || '') + ' — ' + part.names.length + ' موظف')
                       : ('Payroll ' + (run.period || '') + ' — ' + part.names.length + ' employees'),
        method: isBank ? PAY.transfer : PAY.cash,
        amount: part.total,
        project: run.project || null,
        payrollRun: run.id,
        /* 🔴 D4: `cashAccount` نصٌّ NOT NULL بالخادم (01-SUPABASE-SETUP.sql:369)
           ولم يعد يُترك فارغاً — يُختار في نافذة الزرّ قبل هذا الاستدعاء.
           🔴 D4: `cashAccount` is NOT NULL at the server
           (01-SUPABASE-SETUP.sql:369) and is no longer left blank — it is
           chosen in the button's window before this call is ever made. */
        cashAccount: chosenAccount,
        description: A
          ? ('صرف رواتب مسير ' + (run.docNo || '') + ' لشهر ' + (run.period || '') +
             ' — ' + (isBank ? 'تحويل بنكي لمن لديه رقم حساب في ملفه' : 'نقداً لمن ليس لديه رقم حساب في ملفه') +
             '. (قسمة البنك/الكاش افتراضٌ بانتظار تأكيد أ. محمد عمارة.)')
          : ('Payroll run ' + (run.docNo || '') + ' for ' + (run.period || '') +
             ' — ' + (isBank ? 'bank transfer for those with an account on file' : 'cash for those without') +
             '. (The bank/cash split is a default awaiting أ. محمد عمارة\'s confirmation.)')
      };
      /* 🔴🔴 قِيس في `store.js:377-392`، ولم يُفترض:
         · `Store.create` **ليست async** وتعود فوراً، وتضع الكتابة في طابور.
         · وحين تُمنع (بلا اتصال وغير مسموح) **تعيد `null` ولا ترمي خطأ**،
           فـ`try/catch` وحده كان سيبلّغ «تمّ» عن سندٍ لم يُنشأ إطلاقاً.
         · ورفض الفهرس الفريد يقع على **الخادم** بعد المزامنة، فلا يراه هذا
           المكان أبداً.
         فلا يُقال «أُنشئ على الخادم» هنا مباشرة — يُنتظر الطابور ثم يُقرأ من
         الخادم نفسه (القسم ٤)، ولا يُقال شيءٌ نهائيّ قبل ذلك.
         🔴🔴 MEASURED at store.js:377-392, not assumed:
         · `Store.create` is NOT async; it returns at once and QUEUES the write.
         · When blocked (offline and not permitted) it RETURNS `null` and does
           NOT throw — so a try/catch alone would have reported "done" for a
           voucher that was never created at all.
         · And the unique-index refusal happens on the SERVER after sync, so
           it is never visible here.
         So nothing here says "created on the server" outright — the queue is
         drained and then read back FROM the server (section 4) before any
         final word is said. */
      var rec = null;
      try { rec = Store.create('payments', payload); }
      catch (e) { refused.push({ method: payload.method, error: (e && e.message) || String(e) }); continue; }
      if (!rec || !rec.id) {
        refused.push({ method: payload.method, error: L({
          ar: 'رفض البرنامج إنشاء السند (غالباً لا يوجد اتصال والصرف لا يُسجَّل بلا اتصال). لم يُنشأ شيء.',
          en: 'The portal refused to create the voucher (most likely offline, and payments are not recorded offline). Nothing was created.'
        }) });
        continue;
      }
      made.push({ method: payload.method, amount: part.total, id: rec.id, cashAccount: chosenAccount, syncState: rec._syncState || null });
    }
    return { made: made, refused: refused, split: s };
  }

  /* ═══ ٣ · تأكّدٌ حقيقيّ من الخادم — لا «تمّ» بلا دليل ═════════════════
     نفس نمط `payroll-draft-builder.js:340-360` بالضبط: ننتظر الطابور، ثم
     نقرأ الصفوف **من الخادم نفسه** بمعرّفاتها، ونتحقّق أن كل سندٍ أُنشئ
     موجودٌ فعلاً، حالته 'draft' (القيمة الافتراضية بالخادم،
     01-SUPABASE-SETUP.sql:378)، وحساب الصندوق فيه هو ما اخترناه بالضبط —
     ولا تعارض محليّ (`_syncState === 'conflict'`, store.js:289) على نسخته.
     Exactly the pattern of `payroll-draft-builder.js:340-360`: wait for the
     queue, then read the rows back FROM THE SERVER by id, and confirm every
     created voucher really exists, its status is 'draft' (the server's own
     default, 01-SUPABASE-SETUP.sql:378), and its cash account is exactly the
     one chosen — and no local conflict flag (`_syncState === 'conflict'`,
     store.js:289) sits on its cached copy. */
  /* 🔴 المرور 3b (١٤ سبتمبر، حكم MANAGER-4، نفس عائلة P3 في attendance-quick-fill.js): قراءة السندات من الخادم كانت بلا حدّ
     زمني، وعلَم «creating» للصفحة كلها لا يُحرَّر إلا بعدها. قراءةٌ لا تُجيب كانت تُميت زرّ «إنشاء سندات صرف الرواتب» على كل
     مسيرٍ بعدها بصمت حتى إعادة تحميل الصفحة. الآن: ٢٠ ثانية ثم رسالة واضحة، والعلَم يُحرَّر دائماً.
     🔴 Pass 3b (14 Sept, MANAGER-4's ruling, the same family as P3 in attendance-quick-fill.js): the server read of the vouchers
     had no time limit, and the page-wide «creating» flag was released only after it. A read that never answered silently
     killed «إنشاء سندات صرف الرواتب» on every later run until the page was reloaded. Now: 20 s, then a clear message, and the
     flag is always released. Old copy: _evidence/old-bytes-2026-09-14-before-pass3b/staged-browser/payroll-vouchers.js (8845038b). */
  var VERIFY_READ_MS = 20000;
  /* وعدٌ لا ينتظر إلى الأبد (نفس دالّة attendance-quick-fill.js). · a promise that never waits forever (the same helper as
     attendance-quick-fill.js). A timeout rejects with e.p11Timeout = true so the caller can tell it from a server refusal. */
  function withTimeLimit(promise, ms) {
    var st = global.setTimeout, ct = global.clearTimeout;
    if (typeof st !== 'function' || !promise || typeof promise.then !== 'function') return promise;
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = st.call(global, function () {
        if (done) return;
        done = true;
        var err = new Error('no answer from the server within ' + Math.round(ms / 1000) + ' s');
        err.p11Timeout = true;
        reject(err);
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); resolve(v);
      }, function (err) {
        if (done) return;
        done = true; if (typeof ct === 'function') ct.call(global, t); reject(err);
      });
    });
  }

  async function verifyOnServer(createdRows) {
    var deadline = Date.now() + 15000;
    while (Store.pending() > 0 && Date.now() < deadline) { await sleep(250); }
    if (Store.pending() > 0) return { confirmed: false, pendingTimeout: true };

    var ids = createdRows.map(function (r) { return r.id; });
    var back = null;
    try {
      back = await withTimeLimit(Auth.client().from('payments')
        .select('id,method,status,cashAccount,payrollRun').in('id', ids), VERIFY_READ_MS);
    } catch (e) {
      /* لم يُجب الخادم خلال ٢٠ ثانية: لا نقول «أُنشئ» ولا «رُفض» — نقول إننا لم نتأكّد. · no answer in 20 s: never «created»,
         never «refused» — only «not confirmed». */
      if (e && e.p11Timeout) return { confirmed: false, pendingTimeout: false, readTimeout: true, reasonText: '', perRow: {} };
      back = { error: e };
    }

    var rows = (back && !back.error && Array.isArray(back.data)) ? back.data : null;
    var byId = {};
    (rows || []).forEach(function (r) { byId[r.id] = r; });

    var allMatch = !!rows && createdRows.every(function (m) {
      var srv = byId[m.id];
      if (!srv) return false;
      if (srv.status !== 'draft') return false;
      if (srv.cashAccount !== m.cashAccount) return false;
      var local = Store.find('payments', m.id);
      if (local && local._syncState === 'conflict') return false;
      return true;
    });

    var reasons = createdRows.map(function (m) {
      var local = Store.find('payments', m.id);
      return (local && local._syncError) ? local._syncError : null;
    }).filter(Boolean);
    var serverMsg = (back && back.error && back.error.message) ? back.error.message : '';

    /* 🔴 نتيجةٌ لكل سندٍ على حدة — التقرير كان يلصق سبب رفض السند النقدي
       («موجود بالفعل») على التحويل البنكي الذي أُنشئ فعلاً على الخادم
       (قاسه t20 على شاشة حقيقية، ١٣ سبتمبر).
       🔴 One outcome PER voucher — the report used to stamp the refused cash
       voucher's reason («already exists») onto the bank transfer that really
       was created on the server (measured by t20 on a real screen, 13 Sept). */
    var perRow = {};
    createdRows.forEach(function (m) {
      var srv = byId[m.id];
      var local = Store.find('payments', m.id);
      var ok = !!rows && !!srv && srv.status === 'draft' && srv.cashAccount === m.cashAccount &&
               !(local && local._syncState === 'conflict');
      var why = (local && local._syncError) ? local._syncError : (!rows ? serverMsg : '');
      perRow[m.id] = { ok: ok, reason: why };
    });

    return { confirmed: allMatch, pendingTimeout: false, reasonText: reasons.join(' — ') || serverMsg, perRow: perRow };
  }

  /* ═══ ٣ب · تقريرٌ واحد يجمع ما أُنشئ وما رُفض معاً — لا رسالتان منفصلتان
     3b · ONE report joining what was created and what was refused —
     never two disconnected messages

     🔴 بلاغ الأعطال ١٣ سبتمبر — «فشلٌ جزئيٌّ في السندات» (سندٌ أُنشئ،
     وآخر رُفض): كانت رسالة النجاح («أُنشئ سندان») منفصلةً تماماً عن نافذة
     الرفض («لم يُنشأ سند»)، ولا تذكر رسالة النجاح الطريقة ولا المبلغ
     أصلاً — فحين ينجح سندٌ ويُرفض آخر يرى المستخدم رسالتين لا تربط بينهما
     ولا تفصحان عمّا نجح بالضبط. تقريرٌ واحد الآن يذكر الاثنين معاً: ما
     أُنشئ (بطريقته ومبلغه وحالة تأكّده) وما رُفض (وسببه)، حتى لا يُقرأ
     نجاحٌ جزئي على أنه فشلٌ كامل أو نجاحٌ كامل.
     🔴 Bug report, 13 Sept — "partial voucher failure" (one created, one
     refused): the success toast («2 vouchers created») was entirely
     separate from the refusal window («A voucher was not created»), and
     the success toast never even named the method or amount. ONE report
     now states both: what was created (its method, amount and confirmation
     state) and what was refused (and why) — so a PARTIAL success is never
     read as a total failure or a total success.

     🔴 ولا نطبع نصّ الخادم الخام أبداً حين يكون سبب الرفض فهرساً فريداً —
     ضغطةٌ ثانية على الزرّ ترفعها القاعدة برسالةٍ إنجليزية («duplicate key
     value violates…»)، فتُستبدَل بجملةٍ عربية تقول ما يعنيه هذا الرفض
     فعلاً: أن السند موجودٌ بالفعل، لا عطلاً غامضاً.
     🔴 And the raw server text is never printed when the refusal IS the
     unique index — a second press gets an English «duplicate key value
     violates…» from the database, and it is replaced with an Arabic
     sentence that says what the refusal actually means: the voucher
     already exists, not some vague fault. */
  function isDuplicateReason(msg) {
    var m = String(msg || '').toLowerCase();
    return m.indexOf('duplicate key') !== -1 || m.indexOf('unique constraint') !== -1 ||
           m.indexOf('already exists') !== -1;
  }
  function friendlyReason(msg) {
    if (isDuplicateReason(msg)) {
      return L({
        ar: 'هذا السند موجود بالفعل لهذا المسير ولهذه الطريقة — لا يُصرف مسيرٌ مرّتين.',
        en: 'This voucher already exists for this run and this method — a run is not paid twice.'
      });
    }
    return msg;
  }
  function methodLabel(m) {
    return m === PAY.transfer ? L({ ar: 'تحويل بنكي', en: 'bank transfer' }) : L({ ar: 'نقداً', en: 'cash' });
  }
  /* 🔴 المرور 3d (N-3، حكم MANAGER-4): حين تكون نافذةٌ أخرى مفتوحة يُقال التقرير في تنبيهٍ طويل (3c) — لكن التنبيه يختفي بعد ٣٠
     ثانية، فكان التقرير يضيع إن لم يُقرأ (قاسه مُبلِّغ الأخطاء bq4c K5). الآن يُحفظ التقرير ويُفتح في نافذته حين تُغلق تلك النافذة،
     ويبقى التنبيه إشارةً إليه. ui.js يغلق نوافذه بدالّته الداخلية closeModal (ui.js:144-147) من أزراره وعلامة ✕ والخلفية وEscape،
     فتغليف UI.closeModal يفوتها كلها؛ لذا يُقرأ «هل #modalHost مخفي؟» مرة كل ثانية، ما دام تقريرٌ ينتظر فقط، وحتى تُغلق تلك النافذة مهما طال (منذ 3f؛ كان ثلاثين دقيقة على
     الأكثر. تقريرٌ أحدث يحلّ محلّ المنتظر (ضغطةٌ واحدة تُنشئ في كل مرة — «creating» يمنع الثانية).
     🔴 Pass 3d (N-3, MANAGER-4's ruling): with another window open the report goes out as a long toast (3c) — but the toast is gone
     after 30 s, so an unread report was lost (measured by the bug-reporter's bq4c K5). Now the report is kept and opens as its own
     window when that other window closes; the toast stays as the pointer. ui.js closes its windows through its INTERNAL closeModal
     (ui.js:144-147) from its buttons, the ✕, the backdrop and Escape, so wrapping UI.closeModal would miss all four; «is #modalHost
     hidden?» is therefore read once a second, only while a report is waiting, until that window closes (since 3f; it was at most 30 minutes). A newer report replaces the
     waiting one (one press creates at a time — «creating» refuses a second). Old copy:
     _evidence/old-bytes-2026-09-14-before-pass3d/staged-browser/payroll-vouchers.js (a2df2668). */
  /* 🔴 المرور 3f (حكم MANAGER-4 الثالث، الإضافة ٥ — عائلة N-4 عند مُبلِّغ الأخطاء، المرور 3e، والأمر ٣٨ «أين غير ذلك؟»): تقريرٌ انتظر
     ثلاثين دقيقة كان يُرمى بلا أي علامة على الشاشة — العطل نفسه الذي قاسه bq11 C5 في نتيجة الاستيراد، وهذا الملف أصل ذلك الرقم. الآن لا
     حدّ أقصى: يبقى التقرير حتى تُغلق النافذة المفتوحة، مهما طال (قاسه t29 V9).
     🔴 Pass 3f (MANAGER-4's ruling 3, addendum 5 — the family of the pass-3e bug-reporter's N-4, and Order 38 «where else?»): a report
     that had waited 30 minutes was thrown away with no sign on screen — the very fault bq11 C5 measured in the import result, whose
     number came from this file. Now there is no maximum: the report waits until the open window closes, however long (t29 V9). */
  var REPORT_WAIT_POLL_MS = 1000;
  var waitingReport = null, waitingTimer = null;
  function queueCreateReport(res, verify) {
    waitingReport = { res: res, verify: verify, since: Date.now() };
    var st = global.setTimeout;
    if (waitingTimer || typeof st !== 'function') return;
    var tick = function () {
      waitingTimer = null;
      if (!waitingReport) return;
      var host = document.getElementById('modalHost');
      if (!host || host.hidden) { var w = waitingReport; waitingReport = null; showCreateReport(w.res, w.verify); return; }
      waitingTimer = st.call(global, tick, REPORT_WAIT_POLL_MS);
    };
    waitingTimer = st.call(global, tick, REPORT_WAIT_POLL_MS);
  }
  function showCreateReport(res, verify) {
    var rows = [], plain = [];
    res.made.forEach(function (m) {
      var state;
      if (verify && verify.readTimeout) {
        state = L({ ar: ' — أُرسل، لكن الخادم لم يؤكّده خلال ٢٠ ثانية', en: ' — sent, but the server did not confirm it within 20 seconds' });
      } else if (verify && verify.pendingTimeout) {
        state = L({ ar: ' — لم يتأكّد الخادم بعد', en: ' — not yet confirmed by the server' });
      } else if (verify && verify.perRow && verify.perRow[m.id]) {
        var one = verify.perRow[m.id];
        state = one.ok
          ? L({ ar: ' — أُنشئ وتأكّد من الخادم', en: ' — created and confirmed by the server' })
          : ' — ' + (one.reason ? friendlyReason(one.reason)
                                : L({ ar: 'لم يُعثر عليه على الخادم كما أُنشئ — راجع السندات قبل الصرف', en: 'not found on the server as created — check the vouchers before paying' }));
      } else if (verify && !verify.confirmed) {
        state = ' — ' + friendlyReason(verify.reasonText);
      } else {
        state = L({ ar: ' — أُنشئ وتأكّد من الخادم', en: ' — created and confirmed by the server' });
      }
      rows.push('<li>' + UI.esc(methodLabel(m.method)) + ' — ' + UI.esc(I18N.money(m.amount)) + UI.esc(state) + '</li>');
      plain.push(methodLabel(m.method) + ' — ' + I18N.money(m.amount) + state);
    });
    res.refused.forEach(function (r) {
      rows.push('<li style="color:#b00020">' + UI.esc(methodLabel(r.method)) + ' — ' + UI.esc(friendlyReason(r.error)) + '</li>');
      plain.push(methodLabel(r.method) + ' — ' + friendlyReason(r.error));
    });
    /* 🔴 المرور 3c (N1، حكم MANAGER-4): قد يجهز التقرير بعد ٢٠ ثانية من «تأكيد»، وفي أثنائها قد تُفتح نافذةٌ أخرى (سند دفعٍ جديد
       نصف مكتوب). UI.modal يستبدل جسم النافذة وأزرارها (ui.js:98-100)، فكان يمسح ما كُتب فيها (قاسه bq4 K1). الآن: إن كانت
       نافذةٌ مفتوحة، يُقال التقرير نفسه في تنبيهٍ طويل يذكر «المدفوعات»، ولا تُمسّ النافذة المفتوحة. وفي المرور نفسه (N7) صارت
       رسائل هذا الملف بصيغةٍ محايدة، لا بمخاطبة امرأة.
       🔴 Pass 3c (N1, MANAGER-4's ruling): the report can be ready 20 s after «تأكيد»; meanwhile another window may be opened (a
       half-typed new payment). UI.modal replaces the window's body and buttons (ui.js:98-100), so it wiped what was typed there
       (measured bq4 K1). Now: when a window is open, the same report is given as a long toast naming «المدفوعات», and the open
       window is never touched. In the same pass (N7) this file's messages address the reader neutrally, not as a woman.
       Old copy: _evidence/old-bytes-2026-09-14-before-pass3c/staged-browser/payroll-vouchers.js (43e36219). */
    var openHost = document.getElementById('modalHost');
    if (openHost && !openHost.hidden) {
      UI.toast(L({
        ar: 'نتيجة إنشاء سندات صرف الرواتب: ' + plain.join(' · ') + (verify && verify.readTimeout
          ? ' — لم يُجب الخادم خلال ٢٠ ثانية؛ يُرجى التأكد من شاشة «المدفوعات» قبل الضغط مرة أخرى.'
          : ' — التفاصيل في شاشة «المدفوعات».') + ' ويفتح التقرير في نافذته حين تُغلق النافذة المفتوحة.',
        en: 'Payroll voucher creation result: ' + plain.join(' · ') + (verify && verify.readTimeout
          ? ' — the server did not answer within 20 seconds; check «المدفوعات» before pressing again.'
          : ' — the details are in «المدفوعات».') + ' The report opens in its own window when the open window closes.'
      }), 'warn', 30000);
      queueCreateReport(res, verify);   /* 3d (N-3): the toast is the pointer; the report still reaches finance as its window */
      return;
    }
    UI.modal({
      title: L({ ar: 'نتيجة إنشاء سندات صرف الرواتب', en: 'Payroll voucher creation result' }),
      /* 3b: حين لم يُجب الخادم خلال ٢٠ ثانية، يُقال ذلك أولاً وبوضوح — ولا يُدعى أحدٌ لإعادة الضغط قبل أن ينظر في «المدفوعات».
         3b: when the server did not answer within 20 s, that is said first and plainly — nobody is invited to press again
         before looking in «المدفوعات». A duplicate is refused by the database's unique index (file 78) and named in Arabic. */
      body: (verify && verify.readTimeout ? '<p>' + UI.esc(L({
        ar: 'لم يُجب الخادم خلال ٢٠ ثانية، فلا نعرف بعد إن كانت السندات وصلت إليه. يُرجى فتح شاشة «المدفوعات» والتأكد قبل الضغط مرة أخرى — وإن ضُغط الزر والسند موجود فعلاً، يرفضه البرنامج ولا يُصرف المسير مرّتين.',
        en: 'The server did not answer within 20 seconds, so it is not yet known whether the vouchers reached it. Open «المدفوعات» and check before pressing again — if you press and the voucher does exist, the portal refuses it and the run is not paid twice.'
      })) + '</p>' : '') + '<ul>' + rows.join('') + '</ul>',
      buttons: [{ label: L({ ar: 'تمام', en: 'OK' }), cls: 'btn-ghost' }]
    });
  }

  /* ═══ ٤ · الزرّ ══════════════════════════════════════════════════════ */
  var PAYROLL_LABEL = (function () { var m = Schema.get('payroll'); return m && m.label ? L(m.label) : null; })();

  var creating = false;   /* حارس ذاتُ التبويب فقط — القاعدة (فهرس فريد) هي المانع الحقيقي، هذا مجرد أدب ضدّ ضغطة سريعة مزدوجة
                              same-tab courtesy guard only — the DATABASE unique index remains the real gate; this just
                              refuses a fast accidental double-fire before the first Store.create() has even queued */

  var origModal = UI.modal;
  UI.modal = function (opts) {
    var out = origModal.apply(UI, arguments);
    try {
      if (!PAYROLL_LABEL || !Auth.can('payments', 'create')) return out;
      var title = opts && opts.title ? String(opts.title) : '';
      if (title.indexOf(PAYROLL_LABEL) !== 0 || title.indexOf(' — ') === -1) return out;
      var run = Store.all('payroll').filter(function (r) { return r.docNo === title.split(' — ').pop().trim(); })[0];
      if (!run) return out;
      /* المسير غير المعتمد لا يُصرف — ولا يُعرض الزرّ أصلاً · not approved, no button */
      if (run.status !== 'approved') return out;
      /* 🔴 المرور 3g (حكم MANAGER-4 الثالث، الإضافة ٦ — B-1 عند مُبلِّغ الأخطاء، المرور 3f، bq18 V1): مسيرٌ عليه علامة «مستند عكسي» لا
         يُصرف أبداً، ولا يُعرض عليه الزرّ. نسخة العكس الأولى سالبة فلا يُصرف منها شيء أصلاً، لكن زرّ «عكس» يُعرض على أي صفٍّ معتمد
         ومنه نسخة العكس (workflow.js:70-71)، فعكسُها يُنتج مسيراً «موجباً» عليه العلامة — وكان هذا الزرّ يُنشئ له سندَي صرف بجوار
         سندات المسير المصحَّح لنفس الشهر. قاعدة البيانات (الملف ٨٢) تمنع الآن ذلك المسير نفسه؛ وهذا السطر يمنع الزرّ في المتصفح أيضاً.
         🔴 Pass 3g (MANAGER-4's ruling 3, addendum 6 — the pass-3f bug-reporter's B-1, bq18 V1): a run marked «reversal» is never
         paid, and gets no button. The first reversal copy is negative, so it pays nothing anyway; but «عكس» is offered on ANY
         approved row, the reversal copy included (workflow.js:70-71), and reversing it gives a POSITIVE run carrying the mark —
         this button used to create two payment vouchers for it beside the corrected run's vouchers for the same month. The
         database (file 82) now refuses that run itself; this line refuses the button in the browser as well. */
      if (run.isReversal === true || run.isReversal === 'true') return out;

      var foot = document.getElementById('modalFoot');
      if (!foot) return out;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-outline btn-sm';
      b.textContent = L({ ar: 'إنشاء سندات صرف الرواتب', en: 'Create payroll payment vouchers' });
      b.title = L({
        ar: 'مسودتان: إجمالي التحويل البنكي وإجمالي الكاش. يُختار حساب البنك والخزينة الآن، ثم يُرسَل السندان من شاشة المدفوعات.',
        en: 'Two drafts: the bank total and the cash total. Pick the bank account and cash box now, then send them from Payments.'
      });

      /* 🔴 لماذا `UI.modal` بأزرارٍ يدويّة لا `UI.confirm`:
         `UI.confirm` يعرض `opts.message` نصّاً مهروباً داخل `<p>` فقط
         (`ui.js:154-165`) — لا مكان فيه لعنصري `<select>`. فنبني نافذةً
         حقيقية بجسمٍ HTML، وزرّ «تأكيد» بخاصّية `keepOpen: true` (تماماً
         كنمط `askReason`, ui.js:167-192، والنمط المُستعمَل فعلاً في
         `entity.js:298-306` لكائن `onOk`): لا يُغلَق الزرّ النافذة تلقائياً،
         فيتحقّق أولاً من الاختيار، ويرفض بصمتٍ مرئيّ (سطرٌ أحمر) إن كانت
         خانة مطلوبة فارغة، ولا يُغلق النافذة ولا يُنشئ شيئاً حتى يُختار كلّ
         حسابٍ لازم.
         🔴 WHY `UI.modal` with hand-built buttons, not `UI.confirm`:
         `UI.confirm` renders `opts.message` as escaped text inside a `<p>`
         only (`ui.js:154-165`) — there is no room in it for `<select>`
         elements. So a real window is built with an HTML body, and the
         «تأكيد»/Confirm button carries `keepOpen: true` (exactly the
         `askReason` pattern, ui.js:167-192, and the object-with-`onOk`
         pattern actually used at `entity.js:298-306`): the button does not
         close the window on its own — it validates the picks first, refuses
         with a visible red line if a required box is empty, and creates and
         closes nothing until every needed account is chosen. */
      function openAccountPicker() {
        var s = split(run);
        var need = { bank: s.bank.total > 0, cash: s.cash.total > 0 };
        var bankOpts = need.bank ? pickerAccounts('bank') : [];
        var cashOpts = need.cash ? pickerAccounts('cash') : [];

        function optionsHTML(opts) {
          return opts.map(function (o) {
            var cur = (o.currency && String(o.currency).trim()) ? String(o.currency).trim() : 'EGP';
            var label = (o.name || o.code || o.id) + ' — ' + cur;
            return '<option value="' + UI.attr(o.id) + '">' + UI.esc(label) + '</option>';
          }).join('');
        }

        var body = '<p>' + UI.esc(L({
          ar: 'سيُنشأ سندا صرف مسودة: بنك ' + I18N.money(s.bank.total) + ' لـ' + s.bank.names.length + ' موظف، وكاش ' +
              I18N.money(s.cash.total) + ' لـ' + s.cash.names.length + ' موظف.',
          en: 'Two draft vouchers will be created: bank ' + I18N.money(s.bank.total) + ' for ' + s.bank.names.length +
              ', cash ' + I18N.money(s.cash.total) + ' for ' + s.cash.names.length + '.'
        })) + '</p>';

        if (need.bank) {
          body += '<label class="field"><span class="field-label">' +
            UI.esc(L({ ar: 'حساب البنك لسند التحويل', en: 'Bank account for the transfer voucher' })) + '</span>';
          body += bankOpts.length
            ? ('<select class="select" id="p11VouAccBank"><option value="">' +
               UI.esc(L({ ar: 'اختر…', en: 'Choose…' })) + '</option>' + optionsHTML(bankOpts) + '</select>')
            : ('<span class="err-msg">' + UI.esc(L({
                ar: 'لا يوجد حساب بنكي بالجنيه متاح.',
                en: 'No pound bank account is available to you.'
              })) + '</span>');
          body += '</label>';
        }
        if (need.cash) {
          body += '<label class="field"><span class="field-label">' +
            UI.esc(L({ ar: 'الخزينة لسند النقدي', en: 'Cash box for the cash voucher' })) + '</span>';
          body += cashOpts.length
            ? ('<select class="select" id="p11VouAccCash"><option value="">' +
               UI.esc(L({ ar: 'اختر…', en: 'Choose…' })) + '</option>' + optionsHTML(cashOpts) + '</select>')
            : ('<span class="err-msg">' + UI.esc(L({
                ar: 'لا يوجد خزينة نقدية بالجنيه متاحة.',
                en: 'No pound cash box is available.'
              })) + '</span>');
          body += '</label>';
        }
        body += '<div class="err-msg" id="p11VouErr" hidden></div>';

        UI.modal({
          size: 'narrow',
          title: L({ ar: 'إنشاء سندات صرف الرواتب', en: 'Create payroll payment vouchers' }),
          body: body,
          buttons: [
            { label: L({ ar: 'إلغاء', en: 'Cancel' }), cls: 'btn-ghost' },
            {
              label: L({ ar: 'تأكيد', en: 'Confirm' }), cls: 'btn-primary', keepOpen: true,
              onClick: function () {
                var chosen = {};
                var missing = false;
                if (need.bank) {
                  if (!bankOpts.length) { missing = true; }
                  else {
                    var bEl = document.getElementById('p11VouAccBank');
                    if (!bEl || !bEl.value) missing = true; else chosen.bank = bEl.value;
                  }
                }
                if (need.cash) {
                  if (!cashOpts.length) { missing = true; }
                  else {
                    var cEl = document.getElementById('p11VouAccCash');
                    if (!cEl || !cEl.value) missing = true; else chosen.cash = cEl.value;
                  }
                }
                if (missing) {
                  /* 🔴 رفضٌ بصمتٍ مرئيّ: لا يُغلَق شيء ولا يُنشَأ شيء · a visible-silent refusal: nothing closes, nothing is created */
                  var errEl = document.getElementById('p11VouErr');
                  if (errEl) {
                    errEl.textContent = L({ ar: 'يُرجى اختيار الحساب لكل سند.', en: 'Choose the account for each voucher.' });
                    errEl.hidden = false;
                  }
                  return false;
                }
                UI.closeModal();
                doCreateConfirmed(run, chosen);
                return true;
              }
            }
          ]
        });
      }

      /* ═══ إنشاء بعد الاختيار + تأكّدٌ حقيقيّ من الخادم (قسم ٣) ══════════ */
      function doCreateConfirmed(run, chosen) {
        /* 🔴 3b: الضغطة الثانية أثناء الإنشاء لا تصمت — تقول إن الإنشاء جارٍ. والعلَم يُحرَّر دائماً: قراءة التأكّد وإعادة التحميل
           كلتاهما بحدّ ٢٠ ثانية (verifyOnServer، وwithTimeLimit حول Store.reload أدناه).
           🔴 3b: a second press while creating is no longer silent — it says creation is under way. And the flag is always
           released: the confirming read and the reload both have a 20 s limit (verifyOnServer, and withTimeLimit around
           Store.reload below). */
        if (creating) {
          UI.toast(L({
            ar: 'جاري إنشاء سندات صرف الرواتب والتأكد منها على الخادم — يُرجى الانتظار لحظة وعدم الضغط مرة أخرى.',
            en: 'The payroll vouchers are still being created and confirmed on the server — one moment, do not press again.'
          }), 'info', 6000);
          return;
        }
        creating = true;
        (async function () {
          try {
            var res = await create(run, chosen);
            var verify = null;
            if (res.made.length) {
              verify = await verifyOnServer(res.made);
              if (verify.confirmed && !res.refused.length) {
                /* المسار السعيد وحده: كل شيءٍ نجح ولا شيء رُفض — تنبيهٌ خفيف يكفي، بطريقته ومبلغه
                   the happy path alone: everything succeeded, nothing refused — a light toast is enough, naming method and amount */
                var namedAll = res.made.map(function (m) {
                  return methodLabel(m.method) + ' ' + I18N.money(m.amount);
                }).join(L({ ar: '، ', en: ', ' }));
                UI.toast(L({
                  ar: 'أُنشئ وتأكّد على الخادم: ' + namedAll + ' — يُستكمل إرسالهما من «المدفوعات».',
                  en: 'Created and confirmed on the server: ' + namedAll + ' — send them from Payments.'
                }), 'success', 8000);
              } else {
                /* نجاحٌ جزئيّ أو رفضٌ بعد إنشاء محليّ — تقريرٌ واحد يذكر الاثنين معاً (٣ب أعلاه)
                   a partial success, or a refusal after a local create — ONE report states both (3b above) */
                showCreateReport(res, verify);
                /* 3b: إعادة التحميل بحدّ ٢٠ ثانية، ولا تُحاوَل بعد قراءةٍ لم تُجب أصلاً (الاتصال متوقّف).
                   3b: the reload has a 20 s limit, and is not tried after a read that never answered (the connection is stalled). */
                if (!verify.confirmed && !verify.pendingTimeout && !verify.readTimeout) {
                  try { await withTimeLimit(Store.reload(), VERIFY_READ_MS); }
                  catch (eReload) { console.warn('payroll-vouchers.js: reload after the report did not finish — ' + (eReload && eReload.message ? eReload.message : eReload)); }
                }
              }
            } else if (res.refused.length) {
              /* لا شيء أُنشئ حتى محلياً — كل السندات رُفضت فوراً · nothing was created even locally — every voucher was refused at once */
              showCreateReport(res, null);
            }
          } finally { creating = false; }
        })();
      }

      b.addEventListener('click', openAccountPicker);
      foot.insertBefore(b, foot.firstChild);      /* by TEXT in trials, never by position */
    } catch (e) { console.error('payroll-vouchers.js: ' + e.message); }
    return out;
  };
  UI.__p11VouchersModalWrapped = true;

  global.PayrollVouchers = { split: split, create: create, isPoundCurrency: isPoundCurrency, pickerAccounts: pickerAccounts };
  console.info('payroll-vouchers.js: the finance voucher button is installed on approved payroll runs.');
})(window);
