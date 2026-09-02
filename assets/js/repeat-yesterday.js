/* =========================================================================
   repeat-yesterday.js — «كرّر كشف أمس» بضغطة واحدة
   repeat-yesterday.js — "repeat yesterday's sheet" in one press

   ── الحاجة ──────────────────────────────────────────────────────────────
   كشف العمالة اليومية يتكرّر كل يوم بنفس الأسماء تقريباً. اليوم على
   المهندس أن يجد كشف أمس في القائمة، ثم يضغط زرّ النسخ في صفّه. على هاتف
   في الموقع ذلك بحث وتمرير قبل أي كتابة.

   ── 🔴 لماذا هذا زرّ على مستوى الشاشة، لا زرّ في الصفّ ───────────────────
   وهذان سببان مستقلان، وكلاهما كافٍ وحده:

   ١) **الغرض كلّه هو ألّا يبحث عن صفّ أمس.** زرّ في الصفّ يفترض أنه وجده
      بالفعل — أي يحلّ نصف المشكلة ويترك النصف الذي يؤلم. وشاشة entity.js
      تحمل فعلاً زرّ نسخ في كل صفّ (data-act="dup", :91)، فزرّ ثانٍ بجواره
      لا يضيف شيئاً إطلاقاً.

   ٢) 🔴 **قيد العرض من v2.0.21.** إضافة نصّ «كرّر» إلى أزرار الصفّ توسّع
      عمود الإجراءات ومعه الجدول كله — قيست dailyLabour ٤٣٣ ← ٤٥١ بكسل.
      أزرار الصفّ أيقونات فقط بعنوان title (entity.js:87-93)، وهذا مقصود.
      وضعُ الزرّ في شريط `.page-actions` أعلى الصفحة يتجنّب المشكلة تماماً
      بدل أن يخفّفها: **عمود الإجراءات لا يُمسّ إطلاقاً.**

   ── ماذا يفعل ───────────────────────────────────────────────────────────
   يجد أحدث كشف يراه المستخدم فعلاً (عبر الصفوف المعروضة له، لا باستعلام
   جديد)، ويفتح نموذجاً جديداً مملوءاً منه — بلا رقم مستند، بلا تاريخ، بلا
   حالة اعتماد، بلا أثر توقيعات. أي أنه **مسودة جديدة**، لا نسخة من سجل
   قديم بحالته.

   🔴 **لا يحفظ شيئاً.** يفتح النموذج فقط. الحفظ يبقى ضغطة المستخدم، ويمرّ
   على كل الحُرّاس القائمة كما لو كتبه بيده. زرّ يحفظ نيابةً عن الناس هو
   زرّ يُنشئ سجلات لم يقصدها أحد.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The daily labour sheet repeats each day with nearly the same names. Today
   the engineer must FIND yesterday's sheet in the list and press copy on its
   row. On a site phone that is searching and scrolling before any typing.

   🔴 Why a SCREEN-level button and not a row button — two independent
   reasons, either sufficient alone:
   1) The whole point is not having to find yesterday's row. A row button
      assumes he already found it — solving half the problem and leaving the
      half that hurts. entity.js already puts a copy button on every row
      (data-act="dup", :91), so a second one beside it adds nothing.
   2) 🔴 The v2.0.21 WIDTH constraint. Adding the text «كرّر» to row buttons
      widens the actions column and the whole table with it — dailyLabour was
      measured at 433 → 451px. Row buttons are icon-only with a title
      (entity.js:87-93), deliberately. Putting this in the `.page-actions`
      bar AVOIDS the problem rather than easing it: **the actions column is
      never touched at all.**

   It finds the most recent sheet the person can actually see (from the rows
   already scoped for them, never a fresh query) and opens a NEW form filled
   from it — no document number, no date, no approval status, no signature
   trail. A new draft, not a copy of an old record's state.

   🔴 It SAVES NOTHING. It only opens the form. Saving stays the person's own
   press and passes every existing guard as if they had typed it. A button
   that saves on someone's behalf is a button that creates records nobody
   meant to make.

   مُثبَت بالتشغيل / proven by running: TESTS/repeat-yesterday-trial.js
   (v2.0.29)
   ========================================================================= */
(function (global) {
  'use strict';

  var BTN_ID = 'azRepeatYesterday';

  /* الشاشات التي يتكرّر عملها يومياً. ليست قائمة أقسام — هي قائمة عادات.
     Screens whose work genuinely repeats daily. Not a department list — a
     list of habits. */
  var DAILY = ['dailyLabour', 'siteReports', 'siteAttendance', 'equipmentLogs'];

  /* حقول لا تُنسخ أبداً: هوية السجل وحالته ومساره في دورة الاعتماد.
     Never copied: the record's identity, its state, and its path through
     the approval cycle. */
  var NEVER_COPY = ['id', 'docNo', 'date', 'status', 'trail', 'createdAt',
    'createdBy', 'updatedAt', 'updatedBy', 'reviewedBy', 'reviewedAt',
    'approvedBy', 'approvedAt', 'postedAt', 'reversedAt', 'signedBy'];

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* أحدث سجل **يراه هذا المستخدم** — من الصفوف المفحوصة لا من استعلام جديد.
     The most recent record THIS PERSON CAN SEE — from already-scoped rows,
     never a fresh query, so the site fence is inherited rather than
     re-implemented. */
  function latestVisible(moduleId) {
    if (!global.Schema || !global.Store || !global.Auth) return null;
    var mod = Schema.get(moduleId);
    if (!mod) return null;
    var rows;
    try {
      rows = Auth.scopeRows(moduleId, Store.all(mod.table) || []) || [];
    } catch (e) { return null; }
    if (!rows.length) return null;
    var best = null;
    rows.forEach(function (r) {
      if (!r) return;
      var when = r.date || r.createdAt || '';
      if (!best) { best = r; return; }
      var bw = best.date || best.createdAt || '';
      if (String(when) > String(bw)) best = r;
    });
    return best;
  }

  function draftFrom(rec, mod) {
    var out = {};
    Object.keys(rec || {}).forEach(function (k) {
      if (NEVER_COPY.indexOf(k) !== -1) return;
      out[k] = rec[k];
    });
    /* السطور تُنسخ بلا معرّفاتها · lines are copied without their own ids */
    if (mod && mod.lines && Array.isArray(rec[mod.lines.name || 'lines'])) {
      var key = mod.lines.name || 'lines';
      out[key] = rec[key].map(function (ln) {
        var c = {};
        Object.keys(ln || {}).forEach(function (k) { if (k !== 'id') c[k] = ln[k]; });
        return c;
      });
    }
    return out;
  }

  function repeat(moduleId) {
    var mod = global.Schema && Schema.get(moduleId);
    var rec = latestVisible(moduleId);
    if (!rec) {
      if (global.UI && UI.toast) {
        UI.toast(L({
          ar: 'لا يوجد كشف سابق لتكراره — ابدأ بكشف جديد.',
          en: 'There is no earlier sheet to repeat — start a new one.'
        }), 'info');
      }
      return null;
    }
    var draft = draftFrom(rec, mod);
    /* 🔴 نفتح النموذج فقط ولا نحفظ. entity.js يملأ رقم المستند والتاريخ
       بنفسه عند الحفظ، والحفظ يبقى ضغطة المستخدم.
       🔴 Open the form only, never save. entity.js fills the document number
       and date itself on save, and saving stays the person's own press. */
    if (global.EntityPage && typeof EntityPage.openForm === 'function') {
      EntityPage.openForm(moduleId, null, draft);
    }
    return draft;
  }

  /* ── الزرّ: في شريط الصفحة، لا في الصفّ ─────────────────────────────── */
  function addButton(moduleId, host) {
    if (DAILY.indexOf(moduleId) === -1) return null;
    if (!host || !host.querySelector) return null;
    if (host.querySelector('#' + BTN_ID)) return null;
    /* بجوار «جديد» — ولو غاب فالمستخدم بلا صلاحية إنشاء، فلا زرّ تكرار.
       Beside «new» — and if that is absent the person cannot create, so
       there is no repeat button either. */
    var nb = host.querySelector('[data-x="new"]');
    if (!nb || !nb.parentNode) return null;

    var b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';

    /* ═══════════════════════════════════════════════════════════════════
       🔴 الزرّ يسمّي اليوم الذي وجده فعلاً — أُصلح ١ سبتمبر ٢٠٢٦.

       كان مكتوباً «⟳ كرّر كشف أمس»، والكود لا يجد أمس: `latestVisible`
       أعلاه تجد **أحدث كشف يراه المستخدم**، ورأس هذا الملف يقول ذلك
       بلغتين. والجمعة إجازة على هذا العقد، **فالكلمة كاذبة كل يوم سبت**،
       وبعد العيد (٣+٣ مسجّلة عن أ. محمد عمارة)، وبعد أي توقّف.

       والبيانات التي ينسخها صحيحة — الكلمة وحدها هي الكاذبة. وهذا مستند
       أجور لنحو ٢٠٠ عامل يومية، وهذا المشروع يعامل ادّعاءً غير مسنود على
       ورقة أجور كعطل حقيقي: خانات «لا» في إذن الصبّة أُصلحت بنفس المنطق
       بالضبط.

       العلاج: يقول التاريخ الذي وجده، بالنصّ كما هو مخزَّن — بلا مُنسِّق
       جديد ولا اسم شهر مُخترَع ولا سؤال عن شكل الأرقام (i18n.js:308:
       أرقام لاتينية). ولو لم يجد كشفاً سابقاً لا يدّعي شيئاً على الإطلاق.

       🔴 The button names the day it actually found — fixed 1 Sep 2026.
       It used to read "⟳ Repeat yesterday", and the code does not find
       yesterday: latestVisible() above finds THE MOST RECENT SHEET THE
       PERSON CAN SEE, and this file's own header says so in both
       languages. Friday is the day off on this contract, so the word is
       false EVERY SATURDAY, and after Eid (3+3, recorded from
       أ. محمد عمارة), and after any stoppage.
       The data it copies is right; only the word was false. This is a wage
       document for ~200 daily labourers, and this project already treats an
       unsupported claim on a wage paper as a real defect — the «لا»
       tick-boxes on the pour note were fixed on exactly this reasoning.
       The cure: say the date it found, verbatim as stored — no new
       formatter, no invented month name, and no digit-set question
       (i18n.js:308: Latin digits). With no earlier sheet it claims
       nothing at all. */
    var found = null;
    try { found = latestVisible(moduleId); } catch (e) { found = null; }
    var foundDate = found && found.date ? String(found.date) : '';

    b.textContent = foundDate
      ? L({ ar: '⟳ كرّر كشف ' + foundDate, en: '⟳ Repeat sheet of ' + foundDate })
      : L({ ar: '⟳ كرّر آخر كشف', en: '⟳ Repeat the last sheet' });

    b.setAttribute('title', foundDate
      ? L({
          ar: 'يفتح كشفاً جديداً مملوءاً من كشف ' + foundDate + ' — وهو آخر كشف ' +
              'تراه، وليس بالضرورة كشف أمس. بلا رقم ولا تاريخ، ولا يُحفظ حتى تضغط حفظ.',
          en: 'Opens a new sheet filled from the sheet of ' + foundDate + ' — the last ' +
              'one you can see, not necessarily yesterday. No number, no date, and ' +
              'nothing is saved until you press save.'
        })
      : L({
          ar: 'لا يوجد كشف سابق تراه — اضغط لتعرف، أو ابدأ بكشف جديد.',
          en: 'There is no earlier sheet you can see — press to check, or start a new one.'
        }));
    b.addEventListener('click', function () { repeat(moduleId); });
    nb.parentNode.insertBefore(b, nb);
    return b;
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔴 لماذا لا يكفي تغليف EntityPage.render وحده — وهذا هو العطل الذي
     شُحن لولا بوابة فحص مستقلة.

     entity.js يعيد الرسم داخلياً في خمسة مواضع (الفرز، البحث، الصفحة
     التالية، شريحة الحالة، الحذف) وينادي دالة render **الخاصّة داخل
     الإغلاق**، لا EntityPage.render المُصدَّرة. فالزرّ المزروع عبر تغليف
     المُصدَّرة **يختفي عند أول فرز أو بحث** ولا يعود أبداً.

     وهذه سابع مرة تظهر فيها عائلة «المُصدَّر الميت» في هذا المشروع.
     والأسوأ: **تجربتي أنا كانت عمياء عنها**، لأنها نادت الدالة المُصدَّرة
     مباشرة — أي أنها اختبرت الطريق الذي لا يسلكه المستخدم.
     🔴 القاعدة: حين تلفّ شيئاً في entity.js، اسأل دائماً «هل يعيد الرسم
     داخلياً؟» — ولا تختبر أبداً عبر النداء المُصدَّر وحده.

     العلاج مكتوب في هذا المستودع مرتين: site-activity.js:585-591 (موثّق في
     :59-68) وreport-access.js:56-62 — مراقب طفرات على #content يعيد الزرع
     كلما مُحي. نضيفه بجوار التغليف، ولا نغيّر شيئاً آخر.

     🔴 Why wrapping EntityPage.render is not enough — and this is the fault
     that would have shipped but for an independent gate.
     entity.js re-renders internally in five places (sort, search, next page,
     status chip, delete) by calling its PRIVATE render closure, not the
     exported EntityPage.render. A button planted only through wrapping the
     export DISAPPEARS on the first sort or search and never returns.
     Seventh instance of the dead-export family here. Worse: MY OWN TRIAL WAS
     BLIND TO IT, because it called the exported function directly — testing
     the path a user never takes.
     🔴 The rule: when wrapping anything in entity.js, always ask "does it
     re-render internally?" — and never test through the exported call alone.
     The cure is written in this repo twice: site-activity.js:585-591
     (documented at :59-68) and report-access.js:56-62 — a MutationObserver
     on #content that re-plants whatever was wiped. Added beside the wrapper;
     nothing else changes. */
  var observing = false;
  function installContentObserver() {
    if (observing || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    var content = document.getElementById('content');
    if (!content) return;
    observing = true;
    new MutationObserver(function () {
      /* نقرأ الشاشة المفتوحة الآن من App.route() في كل مرة، لا من حالة
         قديمة — فالمستخدم قد يكون انتقل لشاشة أخرى تماماً.
         Read the currently-open screen from App.route() every time, never
         from stale state — the person may have moved to another screen. */
      try {
        var moduleId = global.App && global.App.route && App.route();
        if (!moduleId) return;
        addButton(moduleId, content);
      } catch (e) {}
    }).observe(content, { childList: true, subtree: true });
  }

  function install() {
    if (!global.EntityPage || typeof EntityPage.render !== 'function' ||
        EntityPage.__azRepeatInstalled) return false;
    var orig = EntityPage.render;
    EntityPage.render = function (moduleId, host) {
      var out = orig.apply(EntityPage, arguments);
      try { addButton(moduleId, host); } catch (e) {
        try { console.warn('[repeat-yesterday] could not add the button', e); } catch (e2) {}
      }
      return out;
    };
    EntityPage.__azRepeatInstalled = true;
    installContentObserver();
    return true;
  }

  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }

  global.RepeatYesterday = {
    repeat: repeat,
    installContentObserver: installContentObserver,
    latestVisible: latestVisible,
    draftFrom: draftFrom,
    addButton: addButton,
    DAILY: DAILY,
    NEVER_COPY: NEVER_COPY,
    __install: install
  };
})(window);
