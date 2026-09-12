/* =========================================================================
   attach-button-target.js — زرّ «📎 مرفقات» يصل إلى لوحة مرفقات السجلّ المعروض أمامك، ولا غيره
   attach-button-target.js — the 📎 Attachments button reaches the attachments
                             panel of the record ON SCREEN, and no other

   v2.0.34 · نسخة الرفع بعد المراجعة · release copy, after review. (v3-final · ١١ سبتمبر: حارس النصف-رفع)

   ── العطل الذي صوّره المالك ───────────────────────────────────────────────
   «📎 مرفقات» (يرسمه dc-requests.js:805-841، والضغط في :812) يبحث عن `azAttachSection` وحده،
   فإن لم يجده قال «احفظ هذا السجل أولاً، ثم افتحه لإرفاق الملفات». قِسنا كلّ باب بالزرّ الحقيقي
   (_trials/attach-button-doors-trial.js) على نسخةٍ مطابقة للموقع الحيّ — الجملة الكاذبة تُطبع من بابين:
     ١) «جديد»: لوحة ما-قبل-الحفظ اسمها azAttachBeforeSave وصندوقها azAbsInput (attach-before-save.js:271، :296).
     ٢) فتح سجلٍّ **محفوظ** بزرّ العين 👁 أو بالنقر على صفّه: entity.js:256 و:264 يستدعيان openDetail
        **الداخلية** فلا تمرّ بلافّة attachments.js ولا ترسم لوحة، ولا #entForm، فيحكم dc-requests.js:832
        بأنّه «غير محفوظ» — وهو محفوظ. (بُحث في كلّ الملفّات: لا يستدعي الداخلية غيرهما.)
   ⚠️ ملاحظة قديمة تسمّي اللوحة `azAttachFromFormNew` — لا وجود لها؛ ذاك معرّف فقرة الرفض (attach-from-form.js:118).

   ── v3 · ١١ سبتمبر — ما وجده «صائد الأخطاء» في v2، وكيف أُغلق ─────────────
   v2 كان يعيد فتح السجلّ ثمّ ينتظر «أيّ لوحة» في الصفحة كلّها ٤ ثوانٍ ويضغط صندوقها. وattachments.js
   يُلحق لوحته بعد انتظار الخادم دون أن يتحقّق أنّ النافذة نفسها ما زالت معروضة (attachments.js:496-507).
   فعلى خطٍّ بطيء هبطت لوحة السجلّ (أ) في نافذة (ب) وفتح v2 صندوقها — ملفٌّ في السجلّ الخطأ.
   وللسجلّات بلا رقم مستند (معدّات، مشروعات، موظفون) لم يكن فحص الهويّة يقارن شيئاً، وذاكرة «آخر سجلّ»
   لم تنتهِ أبداً. (BUG-REPORTER-SAVING-2.md، البنود ١ و٢ و٦ و٧.) v3:
     • لا ينظر إلّا داخل النافذة المفتوحة (#modalBody)، أبداً في الصفحة كلّها.
     • هويّة النافذة بعدّاد نوافذ (يزيد مع كلّ UI.modal) لا بالعنوان: ما نعرفه عن سجلٍّ صالحٌ ما دامت نافذته
       هي المعروضة، ويسقط لحظة تُفتح غيرها — لا ذاكرة تعيش بعد نافذتها.
     • كلّ انتظار مربوطٌ بتلك النافذة: إن أُغلقت أو تغيّرت توقّف بلا ضغطٍ وبلا رسالة.
     • في «جديد» لا تُقبل إلّا لوحة ما-قبل-الحفظ؛ وفي «تعديل» لا تُقبل إلّا اللوحة التي رسمها attach-from-form.js
       (يتحقّق هو من السجلّ بعد انتظاره، :243-244).
     • نعيد فتح السجلّ فقط إن فُتح بالباب الداخلي (لا لوحة ستأتي أبداً)؛ وإن فُتح بالباب المُصدَّر فلوحته في
       الطريق — ننتظرها ولا نفتحه ثانيةً (كان v2 يرسم لوحتين).
     • لا نتدخّل في نافذةٍ ليست سجلّاً (مثل «ملفي الشخصي»): العنوان يجب أن يبدأ باسم شاشةٍ معروفة.
     • الرسالة الصادقة لا تعد بزرّ ✏️ قد لا يكون موجوداً.
   ⚠️ وحده لا يكفي: السباق في attachments.js نفسه يُصلَح في patch/changed-files/attachments.js (سطور قليلة
   بعد الانتظار). و🔴 **لا يُعاد فتح سجلٍّ ولا يُنتظَر بلا attachments.js المُعدَّل**: إن غاب (لا عدّاد نوافذ
   UI.__azAttachWinGen) قيلت الرسالة الصادقة بدل إعادة الفتح أو الانتظار — فرفعُ هذا الملفّ وحده لا يزيد الموقع
   سوءاً (صائد الأخطاء، الجولة ٢، البند N1: كانت إعادة الفتح تُسقط لوحة السجلّ السابق في النافذة التالية).
   ولا يزال الاثنان يُرفعان معاً: بلا الملفّ المُعدَّل يبقى سباق الموقع الحيّ كما هو، ولا يُغلَق الباب الثاني.

   ── لماذا طور الالتقاط، ولا نلمس dc-requests.js ─────────────────────────
   الزرّ يُبنى مع كلّ نافذة ويُسنَد له b.onclick مباشرةً — لا تصدير نلفّه. مستمعٌ على document بـ capture:true
   يجري قبل الزرّ، فـ stopPropagation() تمنع onclick الأصلي. أُثبت بالتشغيل. وحيث نسقط إلى السلوك القديم لا نوقف
   الحدث؛ وحيث نسقط إليه **بعد** انتظار نعيد الضغط على الزرّ نفسه متجاوزين أنفسنا مرّةً واحدة. وحذف هذا الملفّ
   من loader.js يعيد السلوك السابق حرفياً. لا اسم قسم ولا قائمة شاشات هنا (القاعدة ٢١).

   ── ENGLISH ─────────────────────────────────────────────────────────────
   THE FAULT THE OWNER PHOTOGRAPHED: «📎 مرفقات» (dc-requests.js:805-841, onclick :812) looks up
   `azAttachSection` alone and otherwise says "Save this record first, then reopen it to attach files".
   Pressed for real on a live-equivalent copy, the false sentence comes from TWO doors: (1) «جديد» New —
   the before-save panel is azAttachBeforeSave / azAbsInput; (2) a SAVED record opened with the 👁 eye or a
   row click — entity.js:256/:264 call the INTERNAL openDetail, which skips attachments.js's wrapper, so no
   panel and no #entForm, and dc-requests.js:832 decides "unsaved". (Searched: nothing else calls it.)

   v3 · 11 Sept — WHAT THE BUG-REPORTER FOUND IN v2, AND HOW IT IS CLOSED. v2 re-opened the record and then
   waited for ANY panel anywhere on the page for 4 s and clicked its box. attachments.js appends its panel
   after waiting for the server without checking the same window is still showing (attachments.js:496-507).
   On a slow line record A's panel landed in record B's window and v2 opened its box — a file on the wrong
   record. Records with no docNo defeated the identity check, and the "last record" memory never expired.
   v3: looks ONLY inside the open window (#modalBody); identifies a window by a window counter bumped on every
   UI.modal, not by its title — what we know about a record is valid only while ITS window is showing; every
   wait is bound to that window and stops, with no click and no message, when it closes or changes; a New form
   accepts only the before-save panel and an Edit form only attach-from-form's panel (which re-checks the
   record after its own wait, :243-244); a record is re-opened only if it came through the internal door (no
   panel will ever come) — one opened through the export door already has its panel on the way, so we wait
   instead (v2 drew two panels); windows that are not records (e.g. «My profile») are left alone — the title
   must start with a known screen label; the truthful message no longer promises a ✏️ that may not exist.
   ⚠️ NOT SUFFICIENT ALONE: the race inside attachments.js itself is cured in patch/changed-files/attachments.js
   (a few lines after its wait). And 🔴 this file NEVER re-opens a record and NEVER waits without the changed
   attachments.js: if it is absent (no UI.__azAttachWinGen window counter) it says the truthful message instead —
   so a half upload of this file alone cannot make the site worse (bug-reporter round 2, N1: the re-open used to
   drop the previous record's panel into the next window). The two still ship together: without the changed file
   the live race stays as it is and the second door stays shut.

   WHY CAPTURE PHASE, and why dc-requests.js is untouched: the button is rebuilt with every window and
   given b.onclick directly — nothing to wrap. A capture listener on document runs first. Where we fall
   through we do not stop the event; where we fall through AFTER a wait we press the same button again,
   skipping ourselves once. Removing this file from loader.js restores the previous behaviour exactly.
   Portal-wide (rule 21): no department name, no screen list.
   ========================================================================= */

(function (global) {
  'use strict';

  var BTN = 'azAttachJump';
  /* ١٢ ثانية (كانت ٦). قِيس ١١ سبتمبر ١١:٢٥ في لوحة متصفّح مخفيّة: رسم عرض السجلّ ١٫٢ ثانية + مؤقّت اللوحة ١٢٠ مللي
     تأخّر إلى ١٫٣ ثانية + خطّ بطيء ٣ ثوانٍ صار ٣٫٨ = ٦٫٦ ثانية، فسبقت الرسالةُ الصادقة اللوحةَ بجزءٍ من الثانية. الانتظار
     الأطول آمن: مع attachments.js المُعدَّل لا تهبط لوحة سجلٍّ آخر في هذه النافذة أبداً، وبلا المُعدَّل لا ننتظر أصلاً (الحارس).
     بعد نحو ٥ ثوانٍ قد يمنع المتصفّح فتح مربّع الملفّات تلقائياً — لكنّ اللوحة تكون أمامه وزرّها «＋ إضافة ملف» يعمل بلمسة.
     12 s (was 6). Measured 11 Sept 11:25 in a hidden browser pane: drawing the record view 1.2 s + the panel's 120 ms
     timer stretched to 1.3 s + a 3 s slow line stretched to 3.8 s = 6.6 s, so the truthful message beat the panel by a
     fraction of a second. Waiting longer is safe: with the changed attachments.js another record's panel can never land
     in this window, and without it we do not wait at all (the guard). After ~5 s a browser may refuse to open the file
     box by itself — but the panel is then in front of the person and its «＋ إضافة ملف» button works with one tap. */
  var WAIT_MS = 12000;

  /* اللوحتان الحقيقيتان · the two real panels (kept for the trials' unit checks) */
  var PANELS = [
    { panel: 'azAttachSection',    input: 'azAttachInput' },
    { panel: 'azAttachBeforeSave', input: 'azAbsInput' }
  ];
  /* attach-from-form.js:250 يضع data-azAttachFromForm="1" — والمتصفّح يخفض حروف اسم الخاصية
     attach-from-form.js:250 sets data-azAttachFromForm="1" — HTML lower-cases the attribute name */
  var FORM_PANEL_MARK = 'data-azattachfromform';

  var TRUTH = {
    ar: 'هذا السجل محفوظ بالفعل — لم تظهر لوحة مرفقاته في هذه النافذة بعد. انتظر لحظة واضغط 📎 مرّة أخرى، أو أغلق النافذة وافتح السجل من جديد.',
    en: 'This record is already saved — its attachments panel has not appeared in this window yet. Wait a moment and press 📎 again, or close the window and open the record again.'
  };

  function L(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return (global.I18N && I18N.getLang && I18N.getLang() === 'en') ? (v.en || v.ar) : (v.ar || v.en);
  }
  function toastInfo(msg) { try { if (global.UI && UI.toast) UI.toast(L(msg), 'info'); } catch (e) {} }

  /* ── عدّاد النوافذ · the window counter ─────────────────────────────── */
  var win = 0;
  /* نقرة صفّ/عين لُوحظت ولم تُرسم نافذتها بعد · a row/eye click observed whose window is not drawn yet */
  var pendingOpen = null;   /* { module, id, at } */
  function trackWindows() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__azP2Win) return !!(global.UI && UI.__azP2Win);
    var realModal = UI.modal;
    UI.modal = function () {
      win++;
      var r = realModal.apply(this, arguments);
      try { claimPending(); } catch (e) {}
      return r;
    };
    UI.__azP2Win = true;
    return true;
  }
  /* 🔴 نعرف سجلّ النافذة **لحظة رسمها**، داخل الحدث نفسه — لا بمؤقّت. أوّل نسخة من v3 انتظرت setTimeout(0)
     بعد النقرة، وفي لوحةٍ مخفيّة يتأخّر المؤقّت فضُغط 📎 قبل أن نعرف السجلّ (قِيس ١١ سبتمبر ٠٠:٤٠). الإنسان
     لا يضغط بهذه السرعة — لكنّ «يعمل لأنّ الإنسان بطيء» ليس حارساً.
     🔴 Learn the window's record AT THE MOMENT IT IS DRAWN, inside the same event — no timer. The first v3
     waited setTimeout(0) after the click; in a hidden pane the timer runs late and 📎 was pressed before the
     record was known (measured 11 Sept 00:40). A person never presses that fast — but "works because people
     are slow" is not a guard. */
  function claimPending() {
    if (!pendingOpen) return;
    var p = pendingOpen; pendingOpen = null;
    if (Date.now() - p.at > 2000) return;                             /* نقرةٌ قديمة لم تفتح شيئاً · a stale click */
    if (document.getElementById('entForm')) return;                   /* نموذج لا عرض · a form, not a view */
    var want = expectedTitle(p.module, p.id);
    if (want && titleNow() === want) view = { win: win, module: p.module, id: p.id, door: 'internal' };
  }
  function modalOpen() { var h = document.getElementById('modalHost'); return !!(h && !h.hidden); }
  function body() { return document.getElementById('modalBody'); }

  /* ما نعرفه عن النافذة المعروضة — صالحٌ ما دام win لم يتغيّر · what we know about the window on screen */
  var view = null;          /* { win, module, id, door: 'internal' | 'export' } */
  function currentView() { return (view && view.win === win && modalOpen()) ? view : null; }

  function currentRoute() {
    try { return global.App && typeof App.route === 'function' ? App.route() : null; } catch (e) { return null; }
  }
  function titleNow() { return ((document.getElementById('modalTitle') || {}).textContent || '').trim(); }
  /* عنوان عرض السجلّ كما يكتبه entity.js:431 حرفياً · the record view's title exactly as entity.js:431 writes it */
  function expectedTitle(moduleId, id) {
    try {
      var mod = Schema.get(moduleId);
      if (!mod) return null;
      var rec = Store.find(mod.table, id);
      if (!rec) return null;
      return L(mod.label) + (rec.docNo ? ' — ' + rec.docNo : (rec.name ? ' — ' + rec.name : ''));
    } catch (e) { return null; }
  }
  /* هل تبدأ النافذة باسم شاشةٍ معروفة؟ (لا «ملفي الشخصي» ولا نافذة تأكيد)
     Does the window start with a known screen's label? (not «My profile», not a confirm dialog) */
  function titleIsAScreen(t) {
    try {
      var mods = (Schema.list && Schema.list()) || Schema.MODULES || [];
      for (var i = 0; i < mods.length; i++) {
        var lab = L(mods[i].label);
        if (lab && (t === lab || t.indexOf(lab + ' — ') === 0)) return true;
      }
    } catch (e) {}
    return false;
  }
  function isRecordView() {
    var b = body();
    return !!(modalOpen() && b && !document.getElementById('entForm') && b.querySelector('.detail-grid') && titleIsAScreen(titleNow()));
  }

  /* ── الباب الداخلي: نلاحظ نقرة الصفّ/العين ولا نتدخّل (entity.js:253-268) ─
     The internal door: OBSERVE the row/eye click, never interfere ────────── */
  function noteRegisterOpen(t) {
    var content = document.getElementById('content');
    if (!content || !content.contains(t)) return false;
    var eye = t.closest('[data-act="view"][data-id]');
    var row = eye ? null : t.closest('tr[data-id]');
    if (row && t.closest('.row-actions')) return false;            /* كما entity.js:255 · as entity.js:255 */
    var el = eye || row;
    if (!el || !content.contains(el)) return false;
    var mod = currentRoute(), id = el.getAttribute('data-id');
    if (!mod || !id) return false;
    /* تُرسم النافذة داخل هذا الحدث نفسه (entity.js:256/:264 ← UI.modal)، فيأخذها claimPending لحظة الرسم —
       إن كان عنوانها عنوانَ هذا السجلّ بالحرف. وإن مرّت النقرة بالباب المُصدَّر (التصميم «ب») كتب wrapExport الهويّة
       بعد ذلك فوقها، وهو الأصدق.
       The window is drawn inside this same event (entity.js:256/:264 → UI.modal), so claimPending takes it
       at the moment of drawing — if its title is exactly this record's title. If the click went through the
       export door (Design B), wrapExport writes the identity after that, and it is the more exact one. */
    pendingOpen = { module: mod, id: id, at: Date.now() };
    return true;
  }

  /* ── الباب المُصدَّر: نعرف السجلّ يقيناً · the export door: the record is known for certain ── */
  function wrapExport() {
    if (!global.EntityPage || typeof EntityPage.openDetail !== 'function' || EntityPage.__azP2View) return !!(global.EntityPage && EntityPage.__azP2View);
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      var before = win;
      var r = orig.apply(this, arguments);
      if (win !== before) view = { win: win, module: moduleId, id: id, door: 'export' };
      return r;
    };
    EntityPage.__azP2View = true;
    return true;
  }

  /* ── العثور على اللوحة داخل النافذة المفتوحة وحدها · find the panel INSIDE the open window only ── */
  function panelIn(kind) {
    var b = body();
    if (!b || !modalOpen()) return null;
    if (kind === 'new') {
      var abs = b.querySelector('#azAttachBeforeSave');
      return abs ? { el: abs, inputId: 'azAbsInput' } : null;
    }
    var s = b.querySelector('#azAttachSection');
    if (!s) return null;
    if (kind === 'edit' && !s.hasAttribute(FORM_PANEL_MARK)) return null;   /* ليست لوحة attach-from-form · not attach-from-form's */
    return { el: s, inputId: 'azAttachInput' };
  }

  function reveal(found, now) {
    try { if (found.el.scrollIntoView) found.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (e) { try { found.el.scrollIntoView(); } catch (e2) {} }
    var input = found.el.querySelector('#' + found.inputId) || found.el.querySelector('input[type="file"]');
    if (!input) return false;
    /* ٤٠٠ مللي كما في dc-requests.js؛ وبعد انتظارٍ نضغط فوراً كي لا تنتهي «لمسة المستخدم» في الهاتف
       400 ms as dc-requests.js does; after a wait we press at once so the phone's "user tap" does not expire */
    if (now) { try { input.click(); } catch (e) {} }
    else global.setTimeout(function () { try { input.click(); } catch (e) {} }, 400);
    return true;
  }

  /* ننتظر اللوحة في **هذه** النافذة فقط: مراقبٌ على #modalBody ومهلةٌ واحدة
     Wait for the panel in THIS window only: an observer on #modalBody and ONE timeout */
  function waitInWindow(w, kind, done) {
    var b = body();
    var finished = false, obs = null, to = null;
    function end(f) {
      if (finished) return; finished = true;
      if (obs) obs.disconnect(); if (to) global.clearTimeout(to);
      done(f);
    }
    function look() {
      if (win !== w || !modalOpen()) { end('gone'); return; }        /* تغيّرت النافذة أو أُغلقت · window changed or closed */
      var f = panelIn(kind);
      if (f) end(f);
    }
    look();
    if (finished) return;
    if (b && global.MutationObserver) {
      obs = new MutationObserver(look);
      obs.observe(b, { childList: true, subtree: true });
    }
    to = global.setTimeout(function () {
      if (win !== w || !modalOpen()) end('gone'); else end(panelIn(kind));
    }, WAIT_MS);
  }

  /* أثرٌ قصير لكلّ ضغطة: أيّ فرعٍ سلكناه ولماذا — للفحوص وللمراجع، لا يغيّر السلوك. أُضيف ١١ سبتمبر بعد ضغطةٍ واحدة
     من ١٤ قالت الرسالة الصادقة بدل إعادة الفتح ولم يُعرف سببها من الخارج (فحص الأبواب، أمين المخزن، النسخة المُصلَحة).
     A short trace per press: which branch we took and why — for trials and the reviewer, changes no behaviour. Added
     11 Sept after ONE press in 14 said the truthful message instead of re-opening and nothing outside could tell why
     (doors trial, storekeeper, repair copy). */
  var trace = [];
  function note(ev) { try { ev.at = Date.now(); ev.win = win; trace.push(ev); if (trace.length > 40) trace.shift(); } catch (e) {} }

  var bypass = false, busyWin = -1;
  /* نسقط إلى السلوك القديم بعد انتظار: نضغط الزرّ نفسه ونتجاوز أنفسنا مرّةً واحدة
     Fall through AFTER a wait: press the same button, skipping ourselves once */
  function fallThrough(btn) {
    if (!btn || !btn.isConnected) return;
    bypass = true;
    try { btn.click(); } finally { bypass = false; }
  }

  function onCaptureClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (noteRegisterOpen(t)) return;                                  /* نقرة صفّ/عين: ملاحظة فقط · observe only */
    var btn = t.closest('#' + BTN);
    if (!btn || bypass) return;
    if (!modalOpen()) return;
    trackWindows();

    var f = document.getElementById('entForm');
    var w = win;

    /* ١) نموذج جديد · a NEW form — only the before-save panel */
    if (f && !f.getAttribute('data-record-id')) {
      var nf = panelIn('new');
      e.stopPropagation(); e.preventDefault();
      if (nf) { reveal(nf, false); return; }
      waitInWindow(w, 'new', function (x) { if (x && x !== 'gone') reveal(x, true); else if (x !== 'gone') fallThrough(btn); });
      return;
    }
    /* ٢) نموذج تعديل · an EDIT form — only attach-from-form's panel */
    if (f) {
      var ef = panelIn('edit');
      e.stopPropagation(); e.preventDefault();
      if (ef) { reveal(ef, false); return; }
      waitInWindow(w, 'edit', function (x) { if (x && x !== 'gone') reveal(x, true); else if (x !== 'gone') fallThrough(btn); });
      return;
    }
    /* ٣) ليست عرض سجلّ ⇒ لا نتدخّل · not a record view ⇒ do not interfere */
    if (!isRecordView()) { note({ branch: 'not-record-view' }); return; }

    /* ٤) عرض سجلٍّ محفوظ — «احفظ أولاً» كاذبة هنا دائماً · a saved record's view — "save first" is always false here */
    e.stopPropagation(); e.preventDefault();
    var vf = panelIn('view');
    if (vf) { note({ branch: 'panel-now' }); reveal(vf, false); return; }
    if (busyWin === w) { note({ branch: 'busy' }); return; }           /* ضغطة ثانية أثناء الانتظار · a second press while waiting */
    var v = currentView();
    if (!v) { note({ branch: 'no-identity', viewWin: view && view.win, open: modalOpen() }); toastInfo(TRUTH); return; }   /* لا نعرف سجلّ هذه النافذة يقيناً · identity not known for certain */
    /* 🔴 حارس النصف-رفع (صائد الأخطاء، الجولة ٢، N1): بلا attachments.js المُعدَّل — لا عدّاد نوافذ
       UI.__azAttachWinGen — لا نعيد الفتح ولا ننتظر من أيّ باب: لوحةٌ متأخّرة من سجلٍّ سابق قد تهبط في هذه
       النافذة نفسها فنضغط صندوقها (ملفٌّ في السجلّ الخطأ، وهو طريقٌ لا يملكه الموقع الحيّ اليوم). نقول الحقيقة
       ونتوقّف. اللوحة الموجودة فعلاً الآن (السطر أعلاه) تُكشَف كما يفعل الموقع الحيّ اليوم — لا أسوأ.
       🔴 The half-upload guard (bug-reporter round 2, N1): without the changed attachments.js — no
       UI.__azAttachWinGen window counter — we neither re-open nor wait, from either door: a late panel from an
       earlier record could land in this very window and we would press its box (a file on the wrong record, a
       path today's live site does not have). Say the truth and stop. A panel ALREADY here (the line above) is
       revealed exactly as the live site does today — never worse. */
    if (!(global.UI && UI.__azAttachWinGen)) { note({ branch: 'no-partner', door: v.door }); toastInfo(TRUTH); return; }
    busyWin = w;
    if (v.door === 'export') {
      /* لوحته في الطريق — ننتظرها ولا نفتحه ثانيةً · its panel is on its way — wait, never re-open */
      note({ branch: 'export-wait', module: v.module, id: v.id });
      waitInWindow(w, 'view', function (x) { busyWin = -1; note({ branch: 'export-wait-end', result: x === 'gone' ? 'gone' : (x ? 'panel' : 'timeout') }); if (x && x !== 'gone') reveal(x, true); else if (x !== 'gone') toastInfo(TRUTH); });
      return;
    }
    /* الباب الداخلي: لا لوحة ستأتي أبداً ⇒ نفتح السجلّ نفسه من الباب المُصدَّر، ونربط الانتظار بالنافذة الجديدة
       the internal door: no panel will ever come ⇒ open the SAME record through the export door, and bind
       the wait to the NEW window */
    if (!global.EntityPage || typeof EntityPage.openDetail !== 'function') { busyWin = -1; note({ branch: 'no-export-fn' }); toastInfo(TRUTH); return; }
    try { EntityPage.openDetail(v.module, v.id); } catch (err) { busyWin = -1; note({ branch: 'threw', err: String(err && err.message).slice(0, 120) }); toastInfo(TRUTH); return; }
    var w2 = win;
    if (w2 === w) {                                                     /* لم تُرسم نافذة · no window was drawn */
      var recNow = null; try { var m0 = Schema.get(v.module); recNow = !!(m0 && Store.find(m0.table, v.id)); } catch (e0) { recNow = 'err'; }
      busyWin = -1; note({ branch: 'no-window', module: v.module, id: v.id, recordInStore: recNow, open: modalOpen() }); toastInfo(TRUTH); return;
    }
    busyWin = w2;
    note({ branch: 'internal-reopen', module: v.module, id: v.id, w2: w2 });
    waitInWindow(w2, 'view', function (x) { busyWin = -1; note({ branch: 'internal-wait-end', result: x === 'gone' ? 'gone' : (x ? 'panel' : 'timeout') }); if (x && x !== 'gone') reveal(x, true); else if (x !== 'gone') toastInfo(TRUTH); });
  }

  function install() {
    if (!global.document || !document.addEventListener) return false;
    trackWindows();
    wrapExport();
    if (document.__azAttachButtonTarget) return true;
    document.__azAttachButtonTarget = true;
    document.addEventListener('click', onCaptureClick, true);   /* capture */
    return true;
  }

  install();
  /* إن حُمِّل قبل ui.js أو entity.js · in case ui.js / entity.js load later */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  global.setTimeout(install, 1500);

  /* للفحوص وللقراءة البشرية · for trials and for a human to read.
     __findPanel(): الباحث القديم على مستوى الصفحة، للفحوص A/L في browser-journey-trial.js فقط — الزرّ لا يستعمله.
     __findPanel(): the legacy page-wide finder, for browser-journey-trial.js sections A/L ONLY — the button
     does not use it; the button's real path is proven by _trials/attach-button-doors-trial.js. */
  global.AttachButtonTarget = {
    __findPanel: function () {
      for (var i = 0; i < PANELS.length; i++) {
        var el = document.getElementById(PANELS[i].panel);
        if (el) return { el: el, inputId: PANELS[i].input };
      }
      return null;
    },
    __panels: function () { return PANELS.slice(); },
    __install: install,
    __view: function () { var v = currentView(); return v ? { module: v.module, id: v.id, door: v.door } : null; },
    __forget: function () { view = null; },
    __truthText: function () { return L(TRUTH); },
    __win: function () { return win; },
    /* هل attachments.js المُعدَّل حاضر؟ (للفحوص: نصف-رفع = false) · is the changed attachments.js present? (trials: half upload = false) */
    __partnerPresent: function () { return !!(global.UI && UI.__azAttachWinGen); },
    __trace: function () { return trace.slice(); },
    __version: 'v3-final'
  };

  console.info('attach-button-target.js v3-final ready — 📎 reaches the panel of the record on screen, in its own window only; never re-opens without the changed attachments.js.');
})(window);
