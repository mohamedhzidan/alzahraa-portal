/* =========================================================================
   item-duplicate-guard.js — لا يُسجَّل الصنف مرّتين
   item-duplicate-guard.js — the same item cannot be registered twice

   ── من طلبه، وبكلماته ───────────────────────────────────────────────────
   🔴 صُحّح ١ سبتمبر ٢٠٢٦: كانت هذه السطور تصفه بـ«أمين مخزن المعمل».
   **هذا مُختلَق.** كتيّب الإجابات يقول مسمّاه الوظيفي **«محاسب»** وإدارته
   **«المخازن»**، وكلمة «المعمل» لا ترد في الملف ولا مرّة واحدة (عددتُها:
   صفر). أمسكه المنسّق قبل الشحن، وتحقّقتُ منه بنفسي في الملف. لقب مُختلَق
   في رأس ملف يصل إلى صاحب العمل هو نفس عائلة «الجواب المقتبَس بلا مصدر».
   🔴 Corrected 1 Sep 2026: these lines used to call him "storekeeper of the
   workshop store". THAT WAS INVENTED. The answered booklet gives his job
   title as «محاسب» (accountant) in the «المخازن» department, and the word
   «المعمل» appears zero times in it (I counted). The coordinator caught it
   before shipping and I verified it in the file myself. An invented title
   in a header the owner reads is the same family as a quoted answer with
   no source.

   أ. أحمد السيد سليمان محمد — **محاسب** بإدارة **المخازن**، وبكلماته في
   السؤال الأول: «ثلاث مخازن — أنا فقط أمين المخازن». من كتيّب الأسئلة
   (١ سبتمبر ٢٠٢٦)، سؤال «لو النظام عمل حاجة واحدة تسهّل شغلك؟» — وهو
   طلبه الأول:

       «أن لا يسمح النظام بتكرار الأصناف التي يتم تسجيلها.»

   وفي السؤال ٧، «أكثر خطأ بيتكرر معاك؟»، شرح السبب بنفسه:

       «الخطأ الذي يحدث يكون في عملية الصرف وذلك بسبب تكرار الأصناف على
        البرنامج.»

   فالسببية مكتوبة بخطّ يده: **بطاقتان لصنف واحد ⇒ يختار الخطأ منهما وقت
   الصرف ⇒ الرصيد منقسم على بطاقتين والجرد لا يضبط.** هذا الملف يقطع
   السلسلة عند أولها.

   ── ما كان موجوداً قبل هذا الملف: لا شيء ────────────────────────────────
   لا يوجد في البورتال كله أي فحص تكرار للأصناف. الفحص الوحيد المسمّى
   «مكرر» في rules.js هو للمدفوعات لا للأصناف. أُثبت بالبحث، لا بالذاكرة.

   ── لماذا «يمنع» أحياناً و«يحذّر» أحياناً ───────────────────────────────
   كتب «لا يسمح» — أي منع. والمنع الكامل على تشابه الاسم كان سيرفض عملاً
   صحيحاً: «فلتر زيت» اسم حقيقي لقطعتين مختلفتين على سيارتين مختلفتين،
   وبورتال يرفض إدخالاً صحيحاً هو بورتال يتوقّف الناس عن استعماله.
   فالانقسام مقصود ولكلّ فرع سببه:
     · كود مكرّر            ⇒ **منع**. الكود معرّف؛ بطاقتان بكود واحد خطأ دائماً.
     · اسم مكرّر وبطاقة فعّالة ⇒ **منع**. هذه شكواه حرفياً.
     · اسم مكرّر وبطاقة موقوفة ⇒ **تحذير**. قد تكون بطاقة قديمة أُوقفت عمداً.
     · نفس الصنف مرّتين في مستند واحد ⇒ **تحذير**.
   entity.js:852-857: `errors` تمنع الحفظ · `warnings` تسأل «أكمل؟» — فهذا
   الانقسام يستعمل سلوكاً قائماً، ولا يخترع شاشة جديدة.

   ── 🔴 الفخّ الذي كاد يبتلع هذا الملف: العلم الذي لا يقرأه أحد ──────────
   audit-trail.js:194 يضع `deleted: true` على السجلّ الملغى — و`Store.all`
   (store.js:366) **لا يرشّح شيئاً**، وrules.js لا تذكر `deleted` ولا مرّة
   واحدة (عددتُها: صفر). فبطاقة صنف ألغاها أحدهم كانت ستمنع تسجيل بطاقة
   جديدة صحيحة إلى الأبد، ولا أحد يفهم لماذا. نفس عائلة عطل السلف الملغاة:
   **الكاتب يضع علماً والقارئ لا يقرأه.** هنا يُقرأ.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   أ. Ahmed El-Sayed Suleiman Mohamed — an ACCOUNTANT in the stores
   department, and in his own words "three stores — I am the only stores
   keeper" — asked for this by name as his single most-wanted change
   (discovery booklet, 1 Sep 2026): "that the system not allow duplication of the items that are
   registered." In Q7 he gave the cause himself: errors happen during
   ISSUING because items are duplicated in the program. Two cards for one
   item ⇒ he picks the wrong one while issuing ⇒ the balance is split across
   two cards and the count never reconciles. This file cuts the chain at its
   start.

   Nothing checked for duplicate items anywhere in the portal before this —
   the only "duplicate" rule in rules.js is for PAYMENTS. Proven by grep.

   BLOCK vs WARN is deliberate: he wrote "do not allow", but a hard block on
   name similarity would refuse legitimate work ("فلتر زيت" is a real name
   for two different parts), and a portal that refuses a correct entry is one
   people stop using. Duplicate CODE blocks; duplicate name on an ACTIVE card
   blocks; a match against a STOPPED card warns; the same item twice in one
   document warns. entity.js:852-857 already treats errors as blocking and
   warnings as confirm-to-proceed, so this uses existing behaviour and
   invents no new screen.

   🔴 THE TRAP THIS FILE NEARLY WALKED INTO: audit-trail.js:194 marks a
   cancelled record `deleted: true`, and Store.all (store.js:366) filters
   NOTHING, while rules.js mentions `deleted` exactly zero times (I counted).
   A cancelled item card would have blocked a correct new one for ever, with
   nobody able to see why — the same family as the cancelled-advances bug:
   the writer sets a flag and the reader never reads it. Here it is read.

   حذف هذا الملف يعيد سلوك اليوم حرفياً — لا يضيف حقلاً ولا جدولاً ولا صلاحية.
   Deleting this file restores today exactly — no field, no table, no
   permission, no storage.

   مُثبَت بالتشغيل / proven by running: TESTS/item-duplicate-guard-trial.js
   (v2.0.31)
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Rules || typeof Rules.validateSave !== 'function') {
    console.error('item-duplicate-guard.js needs rules.js first — not installed');
    return;
  }

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* التطبيع يعيش في arabic-text.js — ملف النصّ العربي — ولا نكتب نسخة هنا.
     «فلتر زيت» و«فلتر  زيت» و«فلتر زيت » اسم واحد، وكذلك المكتوب بهمزة
     وبغيرها. ولو غاب ذلك الملف نعود إلى تطبيع حرفي أضعف لكنه لا ينهار —
     ونقول ذلك في التعليق بدل أن نتظاهر بأنه نفس الشيء.
     Normalisation lives in arabic-text.js, the Arabic text file; no copy is
     written here. If that file is absent we fall back to a weaker literal
     normalisation that still does not break — said plainly rather than
     pretended equivalent. */
  function norm(s) {
    try {
      if (global.ArabicText && typeof ArabicText.searchFold === 'function') {
        return ArabicText.searchFold(s);
      }
    } catch (e) {}
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 itemKey — مفتاح المقارنة القريبة وحدها. أُضيف ٢ سبتمبر ٢٠٢٦.

     ما وجدته بوابة TRACK ENHANCER: «فلترزيت» كانت تُمسَك (المسافات تُطوى)،
     لكن **«فلتر الزيت» كانت تمرّ بلا أي كلمة** — لأن searchFoldTight تطوي
     أشكال الحروف وتحذف المسافات، ولا تعرف «ال» التعريف. أعدتُ إنتاجها
     على الملف الحقيقي: «فلتر الزيت» و«الفلتر زيت» كلتاهما **صفر تحذير**.

     وهذا بالضبط ما سمّاه هو في السؤال ١٦ سبباً لفروق الجرد: «عدم توحيد
     مسميات الأصناف». «فلتر الزيت» و«فلتر زيت» هما تلك المشكلة حرفياً.

     🔴 ولماذا هنا وليس في arabic-text.js:
     ذلك الملف مُشترَك مع منتقي الأشخاص، وتعليقه يقول صراحةً إن حذف «ال»
     **خطأ لاسم إنسان**. فمعرفة أن هذه أسماء أصناف تعيش هنا وحدها، ويبقى
     الملف المشترك عن الحروف لا عن الأصناف.

     🔴 ولماذا في التحذير وحده وليس في المنع:
     المنع يجب أن يبقى دقيقاً. رفضُ «فلتر الزيت» لأن «فلتر زيت» موجود
     خطوةٌ أبعد ممّا يحتمله رفض. أمّا التحذير فيُظهر البطاقة ويترك القرار
     له — وحسابُ الربح والخسارة غير متماثل: **تحذير زائد يكلّفه نظرة،
     وتحذير ناقص يكلّفه بطاقة مكرّرة**، وهي طلبه الأول وسبب أكثر أخطائه.

     ⚠️ السابقة والحدّ: import.js:326 يحذف «ال» عمداً لعناوين الأعمدة —
     لكن **من أول النصّ كلّه فقط** (`^(ال)`)، وهو يكفي لعنوان عمود. أسماء
     الأصناف تحمل «ال» على أي كلمة («فلتر الزيت»، «زيت المحرك»)، فهذه
     تحذفها من **بداية كل كلمة**. توسيعٌ للتقنية، لا نسخ لها — وأقولها
     صراحةً بدل أن أدّعي سابقة لا تغطّيه.

     ⚠️ والثمن المعروف: كلمة أصلها يبدأ بـ«ال» مثل «ألياف» تصير «ياف».
     تحذير زائد محتمل، وهو الاتجاه الرخيص هنا بحكم اللاتماثل أعلاه.

     🔴 itemKey — the key for the NEAR-duplicate comparison ONLY.
     Added 2 Sep 2026. TRACK ENHANCER's gate found that «فلترزيت» was
     caught (spaces folded) but **«فلتر الزيت» passed with nothing said** —
     searchFoldTight folds letter shapes and strips spaces, and knows
     nothing of the definite article. I reproduced it on the real file:
     «فلتر الزيت» and «الفلتر زيت» both produced ZERO warnings.
     That is exactly what he named in Q16 as a cause of his stock
     differences: «عدم توحيد مسميات الأصناف» — item names not standardised.

     WHY HERE AND NOT IN arabic-text.js: that file is shared with the
     person-picker and its own comment says dropping «ال» is WRONG for a
     person's name. Knowing that these are ITEM names lives here alone; the
     shared file stays about letters.

     WHY WARN AND NOT BLOCK: a block must stay precise. Refusing
     «فلتر الزيت» because «فلتر زيت» exists is a step too far. A warning
     shows the card and leaves the judgement to him — and the trade is
     asymmetric: A FALSE WARNING COSTS HIM ONE GLANCE; A MISSED ONE COSTS A
     DUPLICATE CARD, which is his first ask and the cause of his most
     repeated error.

     ⚠️ PRECEDENT AND ITS LIMIT: import.js:326 deliberately drops «ال» for
     column headings — but only from the START OF THE WHOLE STRING
     (`^(ال)`), which is enough for a heading. Item names carry it on any
     word, so this strips it from the START OF EACH WORD. An extension of
     the technique, not a copy — said plainly rather than claiming a
     precedent that does not cover it.
     ⚠️ THE KNOWN COST: a word whose root begins with «ال», such as
     «ألياف», becomes «ياف». A possible extra warning, which is the cheap
     direction here by the asymmetry above. */
  function itemKey(s) {
    var folded = norm(s);
    if (!folded) return '';
    return folded.split(' ')
      .map(function (w) { return w.replace(/^ال/, ''); })
      .join('')
      .replace(/\s+/g, '');
  }

  /* 🔴 يقرأ العلم الذي لا يقرأه غيره — انظر رأس الملف.
     🔴 Reads the flag nobody else reads — see the file header. */
  function liveItems() {
    var rows = [];
    try { rows = Store.all('items') || []; } catch (e) { return []; }
    return rows.filter(function (r) { return r && r.deleted !== true; });
  }

  function isStopped(r) {
    return r && r.status && r.status !== 'active';
  }

  function describe(r) {
    var code = r && r.code ? String(r.code) : '';
    var name = r && r.name ? String(r.name) : '';
    if (code && name) return '«' + name + '» (' + code + ')';
    return '«' + (name || code || '—') + '»';
  }

  /* ── ١ · بطاقة صنف مكرّرة في دليل الأصناف — طلبه الحرفي ──────────────── */
  function masterDuplicates(draft, editingId, errors, warnings) {
    var others = liveItems().filter(function (r) { return r.id !== editingId; });

    var newCode = norm(draft.code);
    var newName = norm(draft.name);

    if (newCode) {
      var codeHit = others.filter(function (r) { return norm(r.code) === newCode; })[0];
      if (codeHit) {
        errors.push(L({
          ar: 'كود الصنف «' + String(draft.code) + '» مستعمَل بالفعل في بطاقة ' +
              describe(codeHit) + '. الكود لا يتكرّر — استعمل البطاقة الموجودة، ' +
              'أو غيّر الكود.',
          en: 'Item code "' + String(draft.code) + '" is already used by ' +
              describe(codeHit) + '. Codes cannot repeat — use the existing card, ' +
              'or change the code.'
        }));
      }
    }

    if (newName) {
      var nameHits = others.filter(function (r) { return norm(r.name) === newName; });
      var active = nameHits.filter(function (r) { return !isStopped(r); })[0];
      var stopped = nameHits.filter(isStopped)[0];

      /* ── القريب جداً: يختلف في طريقة الكتابة (مسافات أو «ال») ───────────
         «فلترزيت» و«فلتر زيت» ليسا متطابقين بالتطبيع الأول، لكنهما نفس
         الشيء عند كل إنسان. نستعمل searchFoldTight الشاحنة بالفعل منذ
         v2.0.30 — لا خوارزمية تشابه جديدة تُخترع هنا، ولا رقم عتبة
         مُختلَق. تحذير فقط: قد يكونان صنفين مختلفين فعلاً.
         ── The near-duplicate: differs in how it is written (spacing or «ال») ──
         «فلترزيت» and «فلتر زيت» are not equal under the first pass but are
         the same thing to any human. We use searchFoldTight, which has
         shipped since v2.0.30 — no new similarity algorithm is invented
         here and no threshold number. WARN only: they might genuinely be
         two different items. */
      var nearHit = null;
      if (!active && !stopped) {
        try {
          var tightNew = itemKey(draft.name);
          if (tightNew) {
            nearHit = others.filter(function (r) {
              return itemKey(r.name) === tightNew;
            })[0] || null;
          }
        } catch (e) { nearHit = null; }
      }

      if (nearHit) {
        warnings.push(L({
          /* 🔴 «الفرق في طريقة كتابة الاسم» — لا «مسافات فقط». صُحّح ٢ سبتمبر.
             كانت الجملة تقول «الفرق مسافات فقط»، وكانت صحيحة يوم كُتبت.
             ثم صار itemKey يحذف «ال» أيضاً، **فصارت الجملة كاذبة على
             الحالة التي أُضيفت من أجلها**: «فلتر الزيت» و«فلتر زيت» ليس
             بينهما مسافة.
             ولماذا هذا ليس تجميلاً: يقرأ أحمد السبب، يبحث عن مسافة، لا
             يجدها، فيستنتج أن النظام مرتبك — **ويُكمل، فيصنع البطاقة
             المكرّرة التي وُجد التحذير ليمنعها.** نفس عائلة «كرّر كشف
             أمس» حرفياً: عنوانٌ يدّعي ما ليس صحيحاً على ورقة يتصرّف
             بناءً عليها إنسان.
             والصياغة **محايدة لا محسوبة**: لا نضيف حساباً لأي الفرقين كان.
             البطاقة نفسها بكودها معروضة أمامه، وهي التي تُمكّنه من الحكم.
             🔴 "the difference is in how the name is written" — not "only
             spacing". Corrected 2 Sep. The old sentence was true the day it
             was written; then itemKey began stripping «ال» too, and it
             became FALSE for the very case it was extended to catch —
             «فلتر الزيت» vs «فلتر زيت» is not a space.
             Why that is not cosmetic: he reads the reason, looks for a
             space, cannot find one, concludes the system is confused, and
             CONTINUES — creating the duplicate card the warning existed to
             prevent. Exactly the «كرّر كشف أمس» family: a label asserting
             something untrue on a paper a person acts on.
             The wording is NEUTRAL, not computed — no which-difference-was-
             it calculation is added. The card itself, with its code, is in
             front of him and is what lets him judge. */
          ar: 'يوجد صنف قريب جداً من هذا الاسم: ' + describe(nearHit) + ' — الفرق ' +
              'في طريقة كتابة الاسم. لو هو نفسه، استعمل البطاقة الموجودة حتى لا ' +
              'ينقسم الرصيد؛ ولو صنف مختلف فعلاً، أكمل.',
          en: 'A very close item name already exists: ' + describe(nearHit) + ' — the ' +
              'difference is in how the name is written. If it is the same thing, use ' +
              'the existing card so the balance is not split; if it really is ' +
              'different, continue.'
        }));
      }

      if (active) {
        /* 🔴 منع — الحكم النهائي للمنسّق، ١ سبتمبر ٢٠٢٦.
           كتب أ. أحمد «لا يسمح»، وهذه هي شكواه حرفياً وسبب أكثر خطأ يتكرّر
           معه. مررتُ أولاً بصيغة «تحذير» ظنّاً أنها أسلم، والحكم النهائي
           أعادها إلى المنع — وهو الصواب: تحذيرٌ يُضغط عليه «أكمل» بالعادة
           لا يمنع البطاقة الثانية، وانقسام الرصيد على بطاقتين هو بالضبط ما
           طلب إيقافه.

           🔴 والشرط الذي يجعل المنع مقبولاً بدل أن يكون حائطاً: **المخرج
           مكتوب داخل الرفض نفسه.** لا يكفي أن نقول «لا» — نقول أي بطاقة
           وجدنا، وبكودها، ونعطيه الطريقين: استعمل الموجودة، أو ميّز الاسم.
           رفضٌ بلا مخرج هو ما يجعل الناس يتركون البورتال؛ ورفضٌ يحمل
           إجابته معه هو ما طلبه.
           🔴 BLOCK — the coordinator's final ruling, 1 Sep 2026.
           أ. أحمد wrote "do not allow", this is his complaint verbatim, and
           it is the cause of his most-repeated error. I passed through a
           WARN version thinking it safer; the final ruling put it back to a
           block, and that is right: a warning people habitually confirm
           through does not stop the second card, and a balance split across
           two cards is exactly what he asked to stop.

           🔴 The condition that makes a block acceptable rather than a
           wall: THE WAY OUT IS WORDED INSIDE THE REFUSAL. Saying "no" is
           not enough — we name the card we found, give its code, and offer
           both roads: use the existing one, or give this one a
           distinguishing name. A refusal with no way out is what makes
           people abandon a portal; a refusal carrying its own answer is
           what he asked for. */
        errors.push(L({
          ar: 'صنف بنفس الاسم مسجَّل بالفعل: ' + describe(active) + '. ' +
              'تسجيله مرّة ثانية يقسم الرصيد على بطاقتين — وهو سبب خطأ الصرف. ' +
              'أمامك طريقان: استعمل البطاقة الموجودة ' + describe(active) + '، ' +
              'أو — لو كان صنفاً مختلفاً فعلاً — أضف ما يميّزه في الاسم ' +
              '(المقاس أو الموديل أو المعدة) ثم احفظ.',
          en: 'An item with this name is already registered: ' + describe(active) + '. ' +
              'Registering it again splits the balance across two cards — the cause of ' +
              'the issuing error. Two ways forward: use the existing card ' +
              describe(active) + ', or — if it really is a different item — add what ' +
              'tells them apart (size, model, or the machine) to the name and save.'
        }));
      } else if (stopped) {
        warnings.push(L({
          ar: 'يوجد صنف قديم موقوف بنفس الاسم: ' + describe(stopped) + '. ' +
              'لو هو نفس الصنف، الأفضل إعادة تفعيل البطاقة القديمة بدل بطاقة جديدة، ' +
              'حتى لا ينقسم تاريخ الحركة.',
          en: 'A stopped item with the same name exists: ' + describe(stopped) + '. ' +
              'If it is the same thing, re-activating the old card is better than a ' +
              'new one, so its movement history is not split.'
        }));
      }
    }
  }

  /* ── ٢ · نفس الصنف مرّتين في سطور مستند واحد ──────────────────────────
     هذا ليس طلبه الحرفي — طلبه عن دليل الأصناف. لكنه نفس العائلة وفي نفس
     الشاشات، ويمنع مباشرةً «الخطأ في عملية الصرف» الذي وصفه. مكتوب هنا
     صراحةً بأنه إضافة، لا مدسوس: ذهب إليه سؤال نعم/لا في دفعته.
     NOT his literal ask — his was about the items master. It is the same
     family on the same screens and directly prevents the issuing error he
     described. Written down here EXPLICITLY as an addition rather than
     slipped in: a yes/no question about it went into his batch. */
  function lineDuplicates(mod, draft, warnings) {
    if (!mod || !mod.lines || !Array.isArray(draft.lines)) return;
    var hasItemField = (mod.lines.fields || []).some(function (f) {
      return f && f.name === 'item';
    });
    if (!hasItemField) return;

    var seen = {}, dupes = [];
    draft.lines.forEach(function (ln) {
      if (!ln || !ln.item) return;
      if (seen[ln.item]) { if (dupes.indexOf(ln.item) === -1) dupes.push(ln.item); }
      else seen[ln.item] = true;
    });
    if (!dupes.length) return;

    var names = dupes.map(function (id) {
      var it = null;
      try { it = Store.find('items', id); } catch (e) {}
      return it ? describe(it) : '«' + String(id) + '»';
    });
    warnings.push(L({
      ar: 'نفس الصنف مكتوب أكثر من مرّة في هذا المستند: ' + names.join(' · ') +
          '. لو كان مقصوداً أكمل؛ ولو لا، اجمعهما في سطر واحد حتى تكون ' +
          'الكمية صحيحة.',
      en: 'The same item appears more than once in this document: ' + names.join(' · ') +
          '. If that is intended, continue; if not, combine them into one line so ' +
          'the quantity is right.'
    }));
  }

  /* ── ٣ · اللفّ ─────────────────────────────────────────────────────────
     ننادي الأصلية أولاً ونضيف إلى نتيجتها — لا نستبدلها. حذف هذا الملف
     يعيد سلوك اليوم حرفياً.
     🔴 وrules.js لا تنادي validateSave داخلياً ولا مرّة (بحثتُ: صفر)،
     والمنادي الحقيقي pages/entity.js:852 يستعمل الاسم المُصدَّر — فاللفّ
     هنا يعترض فعلاً ما يفعله المستخدم، وليس طُعم «التصدير الميّت» الذي
     لدغ هذا المشروع ثماني مرّات.
     Call the original first and ADD to its result — never replace it.
     Deleting this file restores today exactly.
     🔴 rules.js never calls validateSave internally (I grepped: zero), and
     the real caller pages/entity.js:852 uses the EXPORTED name — so this
     wrap really does intercept what a person does, and is not the
     dead-export decoy that has bitten this project eight times. */
  var origValidateSave = Rules.validateSave;
  Rules.validateSave = function (mod, draft, editingId) {
    var check = origValidateSave.apply(Rules, arguments);

    /* 🔴 assistant-pro.js:147 ينادي هذه الدالة بمُعامل أول **نصّي** لا
       كائن — عطل قائم قبل هذا الملف ووثّقه stock-in-transit.js:351. فكل ما
       تحت يجب أن يمرّ بأمان على نصّ، ولا يرمي أبداً: حارس يرمي داخل الحفظ
       يمنع الحفظ كلّه.
       🔴 assistant-pro.js:147 calls this with a STRING first argument, not
       an object — a bug that predates this file and is documented at
       stock-in-transit.js:351. Everything below must therefore survive a
       string and must NEVER throw: a guard that throws inside save blocks
       every save. */
    try {
      if (!check || !Array.isArray(check.errors) || !Array.isArray(check.warnings)) {
        return check;
      }
      if (!draft || typeof draft !== 'object') return check;

      var id = mod && typeof mod === 'object' ? mod.id : null;
      if (id === 'items') masterDuplicates(draft, editingId, check.errors, check.warnings);
      lineDuplicates(mod, draft, check.warnings);
    } catch (e) {
      console.error('item-duplicate-guard.js: guard failed, save continues', e);
    }
    return check;
  };

  global.ItemDuplicateGuard = {
    norm: norm,
    itemKey: itemKey,
    liveItems: liveItems,
    masterDuplicates: masterDuplicates,
    lineDuplicates: lineDuplicates
  };

  console.info('item-duplicate-guard.js ready — duplicate item cards blocked, ' +
    'repeated lines warned (أ. أحمد\'s first ask)');
})(window);
