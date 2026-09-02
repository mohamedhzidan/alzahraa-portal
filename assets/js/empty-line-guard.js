/* ═══════════════════════════════════════════════════════════════════════
   empty-line-guard.js  ·  v2.0.31
   ───────────────────────────────────────────────────────────────────────
   المهمّة، في سطر: يمنع صفّ بنود فارغ (null) من أن يصل إلى أيّ قارئ —
   **ويقول ذلك بصوت عالٍ، ولا يحذف شيئاً في صمت أبداً.**

   ───────────────────────────────────────────────────────────────────────
   العطل الذي يمنعه، وقد أُعيد إنتاجه قبل كتابة هذا الملف
   `node TESTS/rules-null-line-repro.js`
   ───────────────────────────────────────────────────────────────────────
   مستندٌ مخزنيّ يحتوي صفّ بنود فارغاً واحداً كان يُسقط **أربعة** قرّاء
   مختلفين، وكلٌّ منهم يقرأ `ln.item` بلا حماية:

     ١) pages/entity.js:772  lineInput ← renderLines   ← **عند الفتح**
     ٢) pages/entity.js:677  recalc                     ← عند الحفظ
     ٣) stock-in-transit.js:372  اللافّة على validateSave ← عند الحفظ
     ٤) rules.js:191  الفحص الأساسي                     ← عند الحفظ

   والأوّل هو الأسوأ، وليس هو ما كان مسجَّلاً في السجلّ: المستند **يُفتَح
   ويبدو سليماً تماماً** — النموذج موجود وزرّ الحفظ موجود — بينما جدول
   البنود **فارغ تماماً**. قِيسَ فعلياً: صفر بند مرسوم من أصل اثنين
   محفوظَين. فلو ضغط «حفظ» لحفظ مستنداً فقد كلّ بنوده، ولا رسالة واحدة
   تقول له شيئاً.

   ولماذا ملفٌّ واحد بدل أربعة حرّاس: لأنّ اثنين من المواضع الأربعة داخل
   `pages/entity.js` وهو ملفٌّ للقراءة فقط. **وإذا لم تصل القيمة الفارغة
   إلى أحد، لا يستطيع أيٌّ من الأربعة أن ينهار.** فالعلاج عند المنبع.

   ───────────────────────────────────────────────────────────────────────
   🔴 THE RULE THIS FILE OBEYS ON ITSELF
   ───────────────────────────────────────────────────────────────────────
   **A file whose whole job is REMOVING rows must be the loudest thing in
   the batch.** Silently dropping a line from a stores document is exactly
   the fault we are curing — it is never a technique we may use ourselves.
   So every removal is counted, named by document, and announced once.

   THE BUG IT PREVENTS. One empty (null) line row in a stores document
   crashed FOUR different readers, each reading `ln.item` unguarded:
   entity.js:772 lineInput (ON OPEN — the worst), entity.js:677 recalc,
   stock-in-transit.js:372's decorator, and rules.js:191.
   The first is the worst and is NOT what the ledger recorded: the document
   OPENS AND LOOKS FINE — form present, save button present — while the
   lines table is COMPLETELY EMPTY. Measured: 0 rows drawn out of 2 stored.
   Pressing save would store a document that had lost every line, with no
   message of any kind.
   ONE file instead of four guards, because two of the four sites live in
   `pages/entity.js`, which is read-only — and because if the empty value
   never reaches anyone, none of the four can throw. Cure it at the source.

   الحذف: احذف هذا الملف من loader.js فيعود السلوك السابق حرفياً.
   Deleting this file from loader.js restores the previous behaviour exactly.
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  if (!global.Store || typeof Store.all !== 'function') {
    console.warn('[empty-line-guard] Store is not loaded — nothing wrapped.');
    return;
  }
  if (Store.__azEmptyLineGuard) return;   /* التحميل مرّتين لا يلفّ مرّتين */
  Store.__azEmptyLineGuard = true;

  function L(o) {
    return (global.I18N && I18N.lang === 'en') ? o.en : o.ar;
  }

  /* ماذا يُعَدّ صفّاً غير صالح: null · undefined · وأي شيء ليس كائناً.
     كلّها تُسقط القرّاء الأربعة بنفس الطريقة.
     What counts as an invalid row: null, undefined, and anything that is
     not an object. All of them break the four readers identically. */
  function isBadRow(ln) {
    return !ln || typeof ln !== 'object' || Array.isArray(ln);
  }

  /* ما قيل عنه بالفعل — مرّة واحدة لكل مستند، لا مرّة مع كل قراءة.
     Store.all ينادى عشرات المرّات في الرسمة الواحدة؛ رسالة مع كل نداء
     تكون ضجيجاً يعلّمه تجاهلها، وهي القاعدة نفسها التي تمنع «حرجاً» على
     خانة اختيارية.
     Told already — ONCE per document, not once per read. Store.all is
     called dozens of times per render; a message on every call is noise
     that teaches him to ignore it — the same rule that forbids a
     "critical" on an optional empty box. */
  var told = {};
  var log = [];

  function docLabel(rec) {
    return String((rec && (rec.docNo || rec.name || rec.code)) || '').trim() ||
      L({ ar: '(بلا رقم)', en: '(no number)' });
  }

  /* ينظّف سجلّاً واحداً في مكانه. يُعيد عدد ما أُزيل — وصفراً إذا لم يمسّ
     شيئاً، وهي الحالة العادية الساحقة.
     Cleans ONE record in place. Returns how many rows were removed — zero
     if it touched nothing, which is the overwhelmingly normal case. */
  function scrub(table, rec) {
    if (!rec || !Array.isArray(rec.lines) || !rec.lines.length) return 0;

    /* مسار سريع: لا نبني مصفوفة جديدة إلّا إذا كان هناك فعلاً ما يُزال.
       المستند السليم لا يُلمَس إطلاقاً — لا نسخة، ولا مرجع جديد، ولا أي
       فرق يمكن قياسه.
       FAST PATH: no new array is built unless there is genuinely something
       to remove. A correct document is NOT TOUCHED AT ALL — no copy, no
       new reference, no measurable difference of any kind. */
    var bad = 0, i;
    for (i = 0; i < rec.lines.length; i++) { if (isBadRow(rec.lines[i])) bad++; }
    if (!bad) return 0;

    var kept = [];
    for (i = 0; i < rec.lines.length; i++) {
      if (!isBadRow(rec.lines[i])) kept.push(rec.lines[i]);
    }
    rec.lines = kept;

    var key = table + '/' + (rec.id || docLabel(rec));
    if (!told[key]) {
      told[key] = true;
      log.push({ table: table, id: rec.id, doc: docLabel(rec), removed: bad });
      announce(table, rec, bad);
    }
    return bad;
  }

  /* 🔴 الإعلان — نصف عمل هذا الملف، لا زينة عليه.
       🔴 THE ANNOUNCEMENT — half this file's job, not decoration on it. */
  function announce(table, rec, n) {
    var msg = L({
      ar: 'المستند «' + docLabel(rec) + '» فيه ' + n + ' بند فارغ، أُخفي حتى يمكن فتحه. ' +
          'راجعه: سطرٌ ضاع في الاستيراد أو في مسوّدة محفوظة، والبنود المكتوبة سليمة.',
      en: 'Document "' + docLabel(rec) + '" has ' + n + ' empty line(s), hidden so it can be ' +
          'opened. Check it: a row was lost on import or in a saved draft. The written lines ' +
          'are fine.'
    });
    /* تحذير لا خطأ: الورقة تُفتح وتُحفَظ، والرسالة لتنبيهه لا لمنعه.
       A warning, not an error: the paper still opens and saves; the message
       is to tell him, not to stop him. */
    if (global.UI && UI.toast) {
      setTimeout(function () { UI.toast(msg, 'warn', 12000); }, 400);
    }
    console.warn('[empty-line-guard] ' + table + '/' + (rec && rec.id) + ' — ' + n + ' empty row(s) hidden');
  }

  /* ── اللافّات · THE WRAPS ────────────────────────────────────────────
     Store.all يُعيد نسخة سطحية من المصفوفة، والكائنات نفسها مشتركة —
     فالتنظيف في مكانه يصل إلى كلّ قارئ لاحق، بما فيهم قارئا entity.js
     اللذان لا نملك تعديلهما.
     Store.all returns a shallow copy of the ARRAY while the record objects
     are shared — so scrubbing in place reaches every later reader,
     including the two inside entity.js that we may not edit. */
  var realAll = Store.all;
  Store.all = function (table) {
    var rows = realAll.apply(Store, arguments);
    if (Array.isArray(rows)) {
      for (var i = 0; i < rows.length; i++) scrub(table, rows[i]);
    }
    return rows;
  };

  var realFind = Store.find;
  Store.find = function (table, id) {
    var rec = realFind.apply(Store, arguments);
    if (rec) scrub(table, rec);
    return rec;
  };

  global.EmptyLineGuard = {
    /* ما أُزيل في هذه الجلسة — يقرأه أي فحص أو أي إنسان.
       What was removed this session — readable by any check, or by a human. */
    report: function () { return log.slice(); },
    scrub: scrub,
    isBadRow: isBadRow,
    __reset: function () { told = {}; log = []; }
  };

  console.info('empty-line-guard.js ready — empty line rows are hidden and announced, never ' +
    'silently dropped.');
})(window);
