/* =========================================================================
   refusal-explain.js — رفض القاعدة يُشرح بصدق، بلا وعد كاذب بإعادة المحاولة
                        A DATABASE REFUSAL IS EXPLAINED HONESTLY, WITH NO
                        FALSE PROMISE TO RETRY
   -------------------------------------------------------------------------
   العطل · THE BUG

   الرفض الحقيقي الذي وقع في الإنتاج (٢٦ أغسطس ٢٠٢٦، rfi.replyDue فارغ):
   المستخدم رأى «حُفظ على جهازك مشفّراً — جارٍ الرفع والتأكد من الخادم
   الآن…»، ثم شريط أحمر «حفظ مرفوض» (save-guard.js)، ثم تحذير أصفر يقول
   حرفياً «سيُحاول النظام مرة أخرى، وستظهر لك التفاصيل إن تكرّر الرفض»
   (save-modes.js:376-380). لكن رفض NOT NULL/CHECK نهائي بطبيعته — لا
   يُصلحه أي عدد من المحاولات، وsave-modes.js:311-319 يتحقق هو نفسه من
   هذا (isTerminal) ويحذف مهمته من الطابور بلا إعادة محاولة، ثم يُصعِّد
   failed++ إلى نفس رسالة «سيُحاول مرة أخرى» العامة على أي حال — وعد كاذب
   بالحرف لهذه الحالة تحديداً.

   THE BUG. The real production refusal (26 August 2026, rfi.replyDue
   empty): the user saw "Saved on your device, encrypted — uploading and
   confirming with the server now…", then save-guard.js's red "save
   refused" bar, then a yellow warning that literally says "The portal
   will try again, and will show you the reason if it keeps failing"
   (save-modes.js:376-380). But a NOT NULL/CHECK refusal is terminal by
   nature — no number of retries fixes it, and save-modes.js:311-319
   already detects this itself (isTerminal) and removes its own job from
   the queue without retrying, yet still escalates failed++ into that
   same generic "will try again" message regardless — a literally false
   promise for this exact case.

   -------------------------------------------------------------------------
   لماذا لا نلمس save-modes.js · WHY save-modes.js IS NOT TOUCHED

   save-modes.js من الملفات الإضافية التي لا تُعدَّل. بدلاً من ذلك: (أ)
   نستمع لحدث store.js الحقيقي عند الرفض الفعلي (store.js:45/294 —
   alzahraa:store، النوع conflict/sync-error) ونُظهر شرحاً صادقاً فوراً؛
   (ب) نلفّ UI.toast لنكتم — لثوانٍ معدودة فقط بعد رفض نهائي مؤكَّد —
   تحذير «سيُحاول مرة أخرى» نفسه، حتى لا يرى المستخدم رسالتين
   متناقضتين تماماً في نفس الثواني.

   save-modes.js is one of the additive files that is not edited. Instead:
   (a) we listen to store.js's own real event at the moment of an actual
   refusal (store.js:45/294 — alzahraa:store, type conflict/sync-error)
   and show an honest explanation immediately; (b) we wrap UI.toast to
   suppress — for a few seconds only, right after a confirmed terminal
   refusal — that exact "will try again" warning, so the user never sees
   two flatly contradicting messages within the same few seconds.

   -------------------------------------------------------------------------
   لماذا 23502/23514 تحديداً، وكيف نتعرَّف عليهما بلا الكود الرقمي ·
   WHY 23502/23514 SPECIFICALLY, AND HOW WE RECOGNISE THEM WITHOUT THE
   NUMERIC CODE

   store.js:278 (flush) يبني detail من رسالة الخطأ النصية فقط —
   String(error.message || error) — لا يمرّر error.code إطلاقاً. لكن
   نص Postgres لكل SQLSTATE ثابت الشكل: رسالة 23502 (NOT NULL) هي حرفياً
   null value in column "X" of relation "Y" violates not-null constraint
   — وهذا مطابق حرفاً لملف التعارض الحقيقي المُصدَّر فعلاً
   (Downloads/alzahraa-sync-conflicts-2026-08-27.json). رسالة 23514
   (CHECK) هي new row for relation "Y" violates check constraint "Z".
   نطابق هذين الشكلين الثابتين مباشرة بدل الاعتماد على كود غير موجود في
   الحدث أصلاً. أي رسالة أخرى (تكرار، صلاحيات، خطأ خادم عام) لا تُطابق
   فتمرّ دون أي تدخّل من هذا الملف — الشاشات والتنبيهات القائمة (save-
   guard.js) تتولاها كما هي اليوم بالحرف.

   store.js:278 (flush) builds `detail` from the error's text message
   only — String(error.message || error) — never passing error.code at
   all. But Postgres's message text for each SQLSTATE has a fixed shape:
   the 23502 (NOT NULL) message is literally
   null value in column "X" of relation "Y" violates not-null constraint
   — matching the real, already-exported conflict file word for word
   (Downloads/alzahraa-sync-conflicts-2026-08-27.json). The 23514 (CHECK)
   message is new row for relation "Y" violates check constraint "Z". We
   match these two fixed shapes directly instead of relying on a code
   that was never in the event to begin with. Any other message
   (duplicate, permission, generic server error) does not match, so it
   passes through untouched — the existing screens and warnings (save-
   guard.js) handle it exactly as they do today.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and every refusal reverts to
   today's exact wording — the misleading "will try again" toast included
   — nothing else in the portal changes; store.js and save-modes.js are
   both untouched.

   يُحمَّل بعد save-modes.js — يستمع فقط، ولا يعتمد على ترتيب التحميل مع
   أي ملف آخر باستثناء وجود UI.toast وقت التطبيق (محروس بحزام محاولات).
   Loads after save-modes.js — it only listens, and depends on load order
   with no other file except UI.toast existing by the time it applies
   (guarded by its own retry ladder).
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* أشكال رسائل Postgres الثابتة لكل SQLSTATE — لا تعتمد على وجود error.code
     Fixed Postgres message shapes per SQLSTATE — do not depend on error.code
     being present at all. */
  var RE_NOT_NULL = /null value in column "([^"]+)" of relation "([^"]+)" violates not-null constraint/i;
  var RE_CHECK    = /new row for relation "([^"]+)" violates check constraint "([^"]+)"/i;

  function moduleFor(table) {
    return (global.Schema && Schema.MODULES || []).filter(function (m) { return m.table === table; })[0] || null;
  }
  function moduleLabel(table) {
    var m = moduleFor(table);
    return m ? L(m.label) : table;
  }
  function fieldLabel(table, column) {
    var m = moduleFor(table);
    if (!m) return column;
    var f = (m.fields || []).filter(function (x) { return x.name === column; })[0] ||
      (m.lines && (m.lines.fields || []).filter(function (x) { return x.name === column; })[0]);
    return f ? L(f.label) : column;
  }

  /* نافذة قمع قصيرة بعد كل رفض نهائي مؤكَّد فعلياً — لا تُفعَّل إلا هنا،
     ولا تُطيل نفسها أبداً؛ توقيتها أطول بكثير من انتظار save-modes.js
     الثابت (٢٬٦٠٠ مللي‌ثانية) فتغطّيه دائماً.
     A short suppression window opened only after a real, confirmed
     terminal refusal — never extends itself; comfortably longer than
     save-modes.js's own fixed 2,600ms wait, so it always covers it. */
  var suppressUntil = 0;
  function armSuppression() { suppressUntil = Date.now() + 8000; }

  function explainNotNull(m) {
    var column = m[1], table = m[2];
    armSuppression();
    if (global.UI && UI.toast) {
      UI.toast(L({
        ar: 'تعذّر حفظ «' + moduleLabel(table) + '» لأن الحقل «' + fieldLabel(table, column) +
            '» فارغ، وهو إجباري في قاعدة البيانات ولا يقبل الفراغ حتى في مسودة. ' +
            'بياناتك محفوظة بأمان تحت «تعارضات» ولن تضيع — لكن النظام لن يعيد المحاولة تلقائياً. ' +
            'افتحها من هناك، أكمل «' + fieldLabel(table, column) + '»، ثم احفظ من جديد.',
        en: 'Could not save "' + moduleLabel(table) + '" because "' + fieldLabel(table, column) +
            '" is empty, and the database requires it even for a draft. Your data is safely ' +
            'preserved under "Conflicts" and will not be lost — but the portal will NOT retry ' +
            'automatically. Open it from there, fill in "' + fieldLabel(table, column) + '", and save again.'
      }), 'error', 12000);
    }
  }

  function explainCheck(m) {
    var table = m[1], constraint = m[2];
    var column = constraint.indexOf(table + '_') === 0
      ? constraint.slice(table.length + 1).replace(/_check$/i, '')
      : constraint.replace(/_check$/i, '');
    armSuppression();
    if (global.UI && UI.toast) {
      UI.toast(L({
        ar: 'تعذّر حفظ «' + moduleLabel(table) + '» لأن القيمة المختارة في «' + fieldLabel(table, column) +
            '» غير مسموحة في قاعدة البيانات. بياناتك محفوظة بأمان تحت «تعارضات» ولن تضيع — ' +
            'لكن النظام لن يعيد المحاولة تلقائياً. عدّل القيمة ثم احفظ من جديد.',
        en: 'Could not save "' + moduleLabel(table) + '" because the value chosen for "' +
            fieldLabel(table, column) + '" is not allowed by the database. Your data is safely ' +
            'preserved under "Conflicts" and will not be lost — but the portal will NOT retry ' +
            'automatically. Correct the value and save again.'
      }), 'error', 12000);
    }
  }

  function explain(text) {
    var m = RE_NOT_NULL.exec(String(text || ''));
    if (m) { explainNotNull(m); return true; }
    var c = RE_CHECK.exec(String(text || ''));
    if (c) { explainCheck(c); return true; }
    return false;
  }

  global.addEventListener('alzahraa:store', function (e) {
    var d = e && e.detail;
    if (!d || (d.type !== 'conflict' && d.type !== 'sync-error')) return;
    try { explain(d.data && d.data.error); } catch (err) { console.warn('[refusal-explain] failed', err); }
  });

  /* كتم التحذير الكاذب — فقط في الثواني القليلة التالية لرفض نهائي مؤكَّد،
     وفقط لهذا النص بعينه. أي toast آخر يمرّ دون لمس. */
  function wrapToast() {
    if (!global.UI || !UI.toast || UI.__azRefusalToastWrapped) return;
    var orig = UI.toast;
    var MARK_AR = 'سيُحاول النظام مرة أخرى';
    var MARK_EN = 'The portal will try again';
    UI.toast = function (msg) {
      if (Date.now() < suppressUntil && typeof msg === 'string' &&
          (msg.indexOf(MARK_AR) !== -1 || msg.indexOf(MARK_EN) !== -1)) {
        console.info('[refusal-explain] suppressed the "will retry" toast — a terminal database ' +
          'refusal was just explained honestly instead of promising a retry that will never happen.');
        return;
      }
      return orig.apply(UI, arguments);
    };
    UI.__azRefusalToastWrapped = true;
  }
  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapToast, ms); });
  document.addEventListener('DOMContentLoaded', wrapToast);
  wrapToast();

  global.RefusalExplain = { explain: explain };
})(window);
