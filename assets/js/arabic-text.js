/* =========================================================================
   arabic-text.js — إصلاح النص العربي المستخرج من ملفات PDF
                    Repairing Arabic text pulled out of PDF files
   =========================================================================

   المشكلة · THE PROBLEM

     النص العربي داخل ملف PDF لا يُخزَّن كما يكتبه الإنسان. يُخزَّن على هيئة
     «أشكال العرض» — أي الشكل المرسوم لكل حرف حسب موضعه في الكلمة — وكثيراً ما
     يخرج بترتيب مقلوب لأن البرنامج يقرأ الحروف من اليسار إلى اليمين كما هي
     موضوعة على الورقة، لا كما تُقرأ.

     فكلمة «شركة» قد تخرج «ﺷﺮﻛﺔ» (أشكال عرض، صحيحة الترتيب) أو «ﺔﻛﺮﺷ»
     (مقلوبة تماماً). والصفحة تبدو سليمة على الشاشة في الحالتين — الخطأ في
     النص المستخرج وحده. هذه علة معروفة في pdf.js منذ ٢٠١٠ (العدد ٢١٤١) ولم
     تُغلق حتى اليوم.

     Arabic inside a PDF is not stored the way a human types it. It is stored
     as "presentation forms" — the drawn shape of each letter according to its
     position in the word — and it frequently comes out in reversed order,
     because the reader takes the glyphs left-to-right as they sit on the page
     rather than as they are read. The page LOOKS perfect either way; only the
     extracted text is wrong. Known pdf.js issue #2141, open since 2010.

   ما يفعله هذا الملف · WHAT THIS FILE DOES — وما لا يفعله · AND WHAT IT DOES NOT

     ١) يُعيد الحروف من أشكال العرض إلى حروفها الأصلية. مُثبَت بالتجربة:
        NFKC وحدها تكفي لهذا، وتفكّ أيضاً ليجاتورة «لا» إلى لام + ألف.
     ٢) يكتشف الترتيب المقلوب ويُصلحه — وهذا ما لا تفعله NFKC إطلاقاً.
     ٣) يقول بصراحة كم هو واثق. النتيجة تحمل دائماً درجة ثقة.

     **لا يضمن الصواب.** لهذا السبب بالذات لا يُكتب أي نص مستخرج في أي خانة
     تلقائياً أبداً — يُعرض بجانب صورة الصفحة ليؤكده إنسان بعينه. القاعدة
     مكتوبة هنا لأن كسرها لاحقاً يُنتج أرقاماً خاطئة بصمت، وهو أسوأ من الرفض.

     It does NOT guarantee correctness. That is exactly why extracted text is
     never written into any field automatically — it is shown beside a picture
     of the page for a human to confirm. Breaking that rule produces silently
     wrong numbers, which is worse than refusing.

   كيف نعرف أن السطر مقلوب · HOW WE KNOW A RUN IS REVERSED

     قبل تحويل الأشكال نعرف موضع كل حرف من شكله: الشكل «الأولي» لا يقع إلا في
     أول الكلمة، و«النهائي» لا يقع إلا في آخرها. فإذا وجدنا شكلاً نهائياً في
     أول السطر وشكلاً أولياً في آخره، فالسطر مقلوب يقيناً.

     Before converting the shapes we can read each letter's position FROM its
     shape: an "initial" form only ever starts a word, a "final" form only ever
     ends one. A final form at the start of a run and an initial form at its
     end means the run is reversed. This must be computed BEFORE normalising,
     because normalising destroys the shape information that proves it.

   الجدول مشتقّ لا مكتوب · THE TABLE IS DERIVED, NOT TYPED

     جدول الأشكال يُبنى وقت التشغيل من يونيكود نفسه، فلا يمكن أن يحمل خطأ
     مطبعياً. داخل الكتلة تأتي الحروف في مجموعات مرتّبة: [منفصل، نهائي] أو
     [منفصل، نهائي، أولي، وسطي]. أُثبت بالتشغيل: ٣٦ حرفاً — واحد بشكل واحد،
     ١٢ بشكلين، ٢٣ بأربعة أشكال — و١٨ ليجاتورة.

     The form table is built at runtime from Unicode itself, so it cannot carry
     a typing mistake. Proven by running it: 36 letters — one with 1 form, 12
     with 2, 23 with 4 — plus 18 ligatures.

   ========================================================================= */

(function (global) {
  'use strict';

  /* نطاقات أشكال العرض العربية · Arabic presentation form blocks */
  var PRES_A_LO = 0xFB50, PRES_A_HI = 0xFDFF;   /* Presentation Forms-A */
  var PRES_B_LO = 0xFE70, PRES_B_HI = 0xFEFF;   /* Presentation Forms-B */

  /* الحروف العربية الأصلية · base Arabic letters and marks */
  function isArabicBase(cp) {
    return (cp >= 0x0600 && cp <= 0x06FF) ||
           (cp >= 0x0750 && cp <= 0x077F) ||
           (cp >= 0x08A0 && cp <= 0x08FF);
  }
  function isPresentationForm(cp) {
    return (cp >= PRES_A_LO && cp <= PRES_A_HI) ||
           (cp >= PRES_B_LO && cp <= PRES_B_HI);
  }
  function isArabicAny(cp) { return isArabicBase(cp) || isPresentationForm(cp); }

  /* ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     الرموز التي تُفسدها NFKC · codepoints NFKC would damage
     U+FDFC (﷼) يتحول إلى «ریال» بياء فارسية (U+06CC) لا عربية. نحميه.
     U+FDFC (the riyal sign) becomes "ریال" with a PERSIAN yeh (U+06CC), not
     an Arabic one. Proven by running it. We protect such codepoints rather
     than let normalisation quietly change the script of a letter.
     ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  /* حروف فارسية/أردية ليست من العربية. وجودها في ناتج التطبيع دليلٌ على أن
     التطبيع غيّر لغة الحرف لا شكله — وهذا إفساد صامت.
     الفخ الحقيقي الذي كشفه الاختبار: ﷼ (U+FDFC) تتحول إلى «ریال» بياء
     فارسية (U+06CC) لا عربية. وهي داخل النطاق العربي، فلا يكشفها فحص
     النطاق وحده. لهذا يوجد هذا الجدول.

     Persian/Urdu letters that are not Arabic. Their appearance in a
     normalisation result means normalisation changed the letter's LANGUAGE,
     not its shape — a silent corruption. The real trap, caught by the test:
     ﷼ (U+FDFC) becomes "ریال" with a PERSIAN yeh (U+06CC), not an Arabic
     one. It sits inside the Arabic block, so a range check alone misses it.
     That is why this table exists. */
  var NON_ARABIC_LETTERS = {
    0x067E: 1, /* پ */ 0x0686: 1, /* چ */ 0x0698: 1, /* ژ */
    0x06A9: 1, /* ک keheh */ 0x06AF: 1, /* گ */ 0x06CC: 1, /* ی farsi yeh */
    0x06BE: 1, /* ھ */ 0x06C1: 1, /* ہ */ 0x06D2: 1  /* ے */
  };

  var PROTECT = null;
  function protectedSet() {
    if (PROTECT) return PROTECT;
    PROTECT = {};
    for (var cp = PRES_A_LO; cp <= PRES_B_HI; cp++) {
      var ch = String.fromCodePoint(cp);
      var norm = ch.normalize('NFKC');
      if (norm === ch) continue;
      for (var i = 0; i < norm.length; i++) {
        var ncp = norm.codePointAt(i);
        if (ncp > 0xFFFF) i++;              /* تخطّي النصف الثاني من الزوج البديل */
        /* خارج العربية تماماً، أو حرف من لغة أخرى داخل النطاق العربي */
        if ((ncp > 0x7F && !isArabicBase(ncp)) || NON_ARABIC_LETTERS[ncp]) {
          PROTECT[cp] = true; break;
        }
      }
    }
    return PROTECT;
  }

  /* ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     جدول الأشكال، مشتقّ من يونيكود · the form table, derived from Unicode
     ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  var FORMS = null;
  var FORM_NAMES_4 = ['isolated', 'final', 'initial', 'medial'];
  var FORM_NAMES_2 = ['isolated', 'final'];

  function formTable() {
    if (FORMS) return FORMS;
    FORMS = {};
    var groups = {};      /* base letter -> [codepoints, in block order] */
    var order = [];
    for (var cp = PRES_B_LO; cp <= 0xFEFC; cp++) {
      var ch = String.fromCodePoint(cp);
      var base = ch.normalize('NFKC');
      if (base === ch) continue;
      /* الليجاتورات (لا، لأ…) تُطبَّع إلى حرفين — تُستبعد من جدول الأشكال */
      if (Array.from(base).length > 1) continue;
      if (!groups[base]) { groups[base] = []; order.push(base); }
      groups[base].push(cp);
    }
    for (var k = 0; k < order.length; k++) {
      var cps = groups[order[k]];
      var names = cps.length === 4 ? FORM_NAMES_4
                : cps.length === 2 ? FORM_NAMES_2
                : null;                       /* مجموعة بحرف واحد: منفصل فقط */
      for (var j = 0; j < cps.length; j++) {
        FORMS[cps[j]] = names ? names[j] : 'isolated';
      }
    }
    return FORMS;
  }

  function formOf(cp) { return formTable()[cp] || null; }

  /* ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     هل هذا السطر مقلوب؟ · is this run reversed?
     تُرجع: 1 مقلوب · -1 سليم · 0 لا دليل
     Returns 1 reversed, -1 correct, 0 no evidence. Never guesses on 0.
     ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  function reversalScore(run) {
    var shaped = [];
    for (var i = 0; i < run.length; i++) {
      var cp = run.codePointAt(i);
      if (cp > 0xFFFF) i++;
      var f = formOf(cp);
      if (f === 'initial' || f === 'final') shaped.push(f);
    }
    if (shaped.length < 2) return 0;

    var first = shaped[0], last = shaped[shaped.length - 1];
    if (first === 'final' && last === 'initial') return 1;    /* دليل قاطع */
    if (first === 'initial' && last === 'final') return -1;   /* دليل قاطع */

    /* لا دليل قاطع: نوازن الكفّتين — أين تتجمّع النهائيات؟
       No decisive pair: weigh where the final forms cluster. In correct
       order finals sit late in the run; reversed, they sit early. */
    var half = shaped.length / 2, early = 0, late = 0;
    for (var n = 0; n < shaped.length; n++) {
      if (shaped[n] !== 'final') continue;
      if (n < half) early++; else late++;
    }
    if (early > late) return 1;
    if (late > early) return -1;
    return 0;
  }

  /* تقسيم النص إلى مقاطع عربية وغير عربية · split into Arabic / non-Arabic runs */
  function splitRuns(text) {
    var runs = [], cur = '', curIsAr = null;
    for (var i = 0; i < text.length; i++) {
      var cp = text.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      if (cp > 0xFFFF) i++;
      var ar = isArabicAny(cp);
      /* المسافات والترقيم تلتحق بالمقطع الجاري حتى لا تتفتّت الجملة */
      var neutral = /\s|[ـ‌‍]/.test(ch);
      if (curIsAr === null) { curIsAr = ar; cur = ch; continue; }
      if (ar === curIsAr || (neutral && cur)) { cur += ch; continue; }
      runs.push({ text: cur, arabic: curIsAr });
      cur = ch; curIsAr = ar;
    }
    if (cur) runs.push({ text: cur, arabic: curIsAr });
    return runs;
  }

  function reverseRun(s) {
    /* قلب آمن يحترم الأزواج البديلة · surrogate-safe reverse */
    return Array.from(s).reverse().join('');
  }

  /* قلب حروف كل كلمة مع بقاء ترتيب الكلمات · reverse letters inside each
     word, keeping word order — the second of the two possible readings */
  function reverseEachWord(s) {
    return s.split(/(\s+)/).map(function (part) {
      return /\s/.test(part) ? part : reverseRun(part);
    }).join('');
  }

  function normalizeProtected(s) {
    var prot = protectedSet(), keep = [], out = '';
    for (var i = 0; i < s.length; i++) {
      var cp = s.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      if (cp > 0xFFFF) i++;
      if (prot[cp]) { out += '' + String.fromCharCode(0xE100 + keep.length); keep.push(ch); }
      else out += ch;
    }
    out = out.normalize('NFKC');
    for (var k = 0; k < keep.length; k++) {
      out = out.split('' + String.fromCharCode(0xE100 + k)).join(keep[k]);
    }
    return out;
  }

  /* ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
     الدالة الرئيسية · THE MAIN CALL
     ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
  function repair(text) {
    var result = {
      text: text == null ? '' : String(text),
      hadPresentationForms: false,
      reversedRuns: 0,
      arabicRuns: 0,
      undecided: 0,
      confidence: 'none'
    };
    if (!result.text) return result;

    for (var i = 0; i < result.text.length; i++) {
      if (isPresentationForm(result.text.codePointAt(i))) { result.hadPresentationForms = true; break; }
    }

    /* ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
       قراءتان، لا تخمين واحد · TWO READINGS, NOT ONE GUESS

       العطب يأتي على نوعين لا يمكن التفريق بينهما من النص وحده:
         (أ) انقلب السطر كله بما فيه المسافات — وهذا ما يفعله pdf.js فعلاً،
             ويُصلَح بقلب السطر كله مرة واحدة. مُثبَت: ١٨ من ١٨.
         (ب) انقلبت حروف كل كلمة وبقي ترتيب الكلمات سليماً — ويُصلَح بقلب
             كل كلمة على حدة.
       قلب السطر كله يُصلح (أ) تماماً، ويترك (ب) بكلمات صحيحة بترتيب مقلوب.

       لا يوجد دليل في النص نفسه يفرّق بينهما. فبدل التخمين — وهو ما يُنتج
       أرقاماً خاطئة بصمت — نحسب القراءتين ونضع أمام الإنسان زرّاً واحداً
       يبدّل بينهما وهو ينظر إلى صورة الصفحة. القرار له، لا للبرنامج.

       The breakage comes in two kinds that the text alone cannot separate.
       Reversing the whole run fixes (a) exactly and leaves (b) with correct
       words in flipped order. Rather than guess — guessing is what produces
       silently wrong output — we compute BOTH readings and give the person
       one button to swap, with the page picture in front of them.
       ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ */
    var runs = splitRuns(result.text), out = '', alt = '';
    for (var r = 0; r < runs.length; r++) {
      var run = runs[r];
      if (!run.arabic) { out += run.text; alt += run.text; continue; }
      result.arabicRuns++;
      var score = reversalScore(run.text);
      if (score === 1) {
        out += reverseRun(run.text);                 /* (أ) قلب السطر كله */
        alt += reverseEachWord(run.text);            /* (ب) قلب كل كلمة */
        result.reversedRuns++;
      } else {
        out += run.text; alt += run.text;
        if (score === 0) result.undecided++;
      }
    }

    result.text = normalizeProtected(out);
    var altText = normalizeProtected(alt);
    result.alternativeText = altText === result.text ? null : altText;
    result.hasAlternative = result.alternativeText !== null;

    if (result.arabicRuns === 0)        result.confidence = 'none';
    else if (!result.hadPresentationForms) result.confidence = 'high';
    else if (result.undecided === 0)    result.confidence = 'high';
    else if (result.undecided < result.arabicRuns) result.confidence = 'medium';
    else                                 result.confidence = 'low';

    return result;
  }

  /* هل يحتاج هذا النص إصلاحاً أصلاً؟ · does this text need repair at all? */
  function needsRepair(text) {
    if (!text) return false;
    for (var i = 0; i < text.length; i++) {
      if (isPresentationForm(text.codePointAt(i))) return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 searchFold — تطبيع البحث العربي · Arabic search folding
     أُضيفت ٣٠ أغسطس ٢٠٢٦ لأن منتقي البحث الجديد كان يفشل فشلاً كاملاً على
     الكتابة الطبيعية: «احمد» و«فاطمه» و«مصطفي» و«ابراهيم» كلها ترجع «لا
     نتيجة»، ولا يطابق إلا الشكل المهموز الدقيق. السبب أن toLowerCase لا
     تفعل شيئاً للعربية إطلاقاً.
     وفي موقع مصري، الكتابة بلا همزة هي **الحالة الطبيعية** لا الاستثناء —
     أربع من كل خمس كتابات واقعية كانت تُقرأ «لا نتيجة».

     لماذا هنا وليس داخل ملف المنتقي: هذا هو ملف النصّ العربي. تطبيعٌ ثانٍ
     مكتوب في مكان آخر يتباعد عن هذا، وهو خطأ «التوأم الهشّ» بعينه. أي
     شاشة تحتاج مطابقة بحث عربي تنادي هذه، ولا تكتب نسختها.

     ⚠️ وهي **ليست** norm() الخاصة بالاستيراد (import.js:317، ونسختها
     المُعلَنة في import-mapping-plus.js:99). تلك تطابق **عناوين أعمدة**:
     تحذف ما بين الأقواس، وتُسقط «ال» التعريف، وتمسح كل ما ليس حرفاً أو
     رقماً — وهي تصرّفات صحيحة لعنوان عمود وخاطئة تماماً لاسم شخص. عملان
     مختلفان يجوز أن يختلف تطبيعهما؛ ما لا يجوز هو نسختان لنفس العمل.

     🔴 Added 30 Aug 2026 because the new search picker failed completely on
     ordinary typing: «احمد», «فاطمه», «مصطفي», «ابراهيم» all returned "no
     match" — only the exact hamza-carrying form matched. The cause is that
     toLowerCase does nothing whatsoever for Arabic. On an Egyptian site,
     typing without the hamza IS the normal case, not the exception: four of
     five realistic typings read "no match".

     Why here and not inside the picker: this is the Arabic text file. A
     second normaliser written elsewhere drifts away from this one — the
     fragile-twin mistake exactly. Any screen needing Arabic search matching
     calls this and never writes its own.

     ⚠️ This is NOT import's norm() (import.js:317, and its declared copy at
     import-mapping-plus.js:99). That one matches COLUMN HEADINGS: it strips
     bracketed text, drops the definite article «ال», and deletes everything
     that is not a letter or digit — all correct for a heading and all wrong
     for a person's name. Two different jobs may normalise differently; what
     is not allowed is two copies of the SAME job. */
  function searchFold(s) {
    var out = String(s == null ? '' : s);
    try { out = normalizeProtected(out); } catch (e) { /* NFKC غير متاح — نكمل */ }
    return out
      .toLowerCase()                                  /* للاتينية وحدها */
      .replace(/[ً-ْٰـ]/g, '')    /* تشكيل وتطويل */
      .replace(/[آأإٱ]/g, 'ا') /* آ أ إ ٱ → ا */
      .replace(/ة/g, 'ه')                   /* ة → ه */
      .replace(/ى/g, 'ي')                   /* ى → ي */
      .replace(/ؤ/g, 'و')                   /* ؤ → و */
      .replace(/ئ/g, 'ي')                   /* ئ → ي */
      .replace(/[٠-٩]/g, function (d) {     /* ٠-٩ → 0-9 */
        return String(d.charCodeAt(0) - 0x0660);
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 searchFoldTight — التمريرة الثانية: بلا مسافات إطلاقاً
     أُضيفت ٣١ أغسطس ٢٠٢٦.

     العطل الذي تمنعه، وقد أُعيد إنتاجه على الملف الحقيقي قبل كتابة سطر
     واحد: الأسماء المركّبة تُكتب بمسافة وبغير مسافة، والاثنتان صحيحتان.
     «عبدالله» و«عبد الله» · «عبدالرحمن» و«عبد الرحمن» · «أبو العلا»
     و«ابوالعلا». searchFold تُوحّد المسافات المتكرّرة إلى مسافة واحدة —
     وهذا صحيح — لكنها لا تستطيع أن تجسر مسافةً غائبة. فخمس حالات من خمس
     كانت ترجع «لا نتيجة»، ومنها **«عبد الحي»** — اسم أ. أحمد عبد الحي
     نفسه، أكثر اسم سيُكتب في هذا البورتال.

     ولماذا دالة ثانية بدل تعديل searchFold: لأن حذف كل المسافات تصرّف
     خاطئ في مواضع أخرى قد تنادي searchFold لاحقاً، ولأن تعديلها كان
     سيغيّر سلوكاً قائماً بدل أن يضيف إليه. هذه تبني فوق تلك حرفياً —
     تناديها ثم تحذف المسافات — فلا يمكن أن تتباعد عنها أبداً. نسخة ثانية
     من التطبيع مكتوبة بيدٍ أخرى هي خطأ «التوأم الهشّ» بعينه، وتعليق
     searchFold أعلاه يحرّمه صراحةً.

     ⚠️ القاعدة التي تجعل هذا آمناً: تُستعمل **بالإضافة** إلى searchFold،
     لا بدلاً منها — الشرط يبقى «القديم أو الجديد». فما كان يظهر يظل
     يظهر، ولا يمكن لهذه التمريرة أن تُخفي نتيجة واحدة. لذلك هي قرار
     بناء لا قرار صاحب العمل: لا تغيّر صلاحية أحد ولا تُنقص ما يراه.

     🔴 searchFoldTight — the second pass: no spaces at all.
     Added 31 Aug 2026.

     The fault it prevents, reproduced against the real file before a line
     was written: compound Arabic names are written both with and without
     the space, and both spellings are correct. «عبدالله» / «عبد الله»,
     «عبدالرحمن» / «عبد الرحمن», «أبو العلا» / «ابوالعلا». searchFold
     collapses repeated spaces to one — correct — but it cannot bridge a
     space that was never typed. Five realistic cases out of five returned
     "no match", among them **«عبد الحي»** — أ. أحمد عبد الحي's own name,
     the name most often typed in this portal.

     Why a second function rather than changing searchFold: deleting every
     space is wrong for other callers that may use searchFold later, and
     editing it would change existing behaviour instead of adding to it.
     This one is built literally on top of that one — it calls it, then
     strips the spaces — so the two can never drift apart. A second copy of
     the normalisation written by another hand is the fragile-twin mistake,
     which searchFold's own comment above forbids outright.

     ⚠️ The rule that makes this safe: it is used IN ADDITION to
     searchFold, never instead of it — the condition stays "old OR new".
     So whatever showed before still shows, and this pass cannot hide a
     single result. That is why it is a build decision and not an owner
     question: it changes nobody's authority and removes nothing from
     anybody's view. */
  function searchFoldTight(s) {
    return searchFold(s).replace(/\s+/g, '');
  }

  global.ArabicText = {
    repair: repair,
    searchFold: searchFold,
    searchFoldTight: searchFoldTight,
    needsRepair: needsRepair,
    formOf: formOf,
    reversalScore: reversalScore,
    splitRuns: splitRuns,
    isArabicBase: isArabicBase,
    isPresentationForm: isPresentationForm,
    _formTable: formTable
  };

  /* فحص ذاتي عند التحميل — يظهر في الكونسول، ويكشف أي عطب فوراً
     Self-check at load. Visible in the console; catches breakage at once. */
  try {
    var probe = repair('ﺷﺮﻛﺔ');       /* ﺷﺮﻛﺔ */
    var rev   = repair('ﺔﻛﺮﺷ');       /* ﺔﻛﺮﺷ — مقلوبة */
    console.info('arabic-text.js ready — ' +
      Object.keys(formTable()).length + ' shaped letters mapped · ' +
      'forms→letters ' + (probe.text === 'شركة' ? 'OK' : 'FAILED') + ' · ' +
      'reversed→fixed ' + (rev.text === 'شركة' ? 'OK' : 'FAILED'));
  } catch (e) {
    console.error('arabic-text.js self-check threw', e);
  }
})(typeof window !== 'undefined' ? window : globalThis);
