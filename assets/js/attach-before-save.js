/* =========================================================================
   attach-before-save.js — إرفاق الملفات من لحظة فتح النموذج، قبل أي حفظ
   attach-before-save.js — attaching files from the moment the form opens,
                           before any save

   ── ما طلبه المالك، مرّتين، والثانية توسّع الأولى ────────────────────────
   «أريد أن أرفق من البداية، لو مسودة لو لسّه مش متسجل، بلا حاجة للحفظ أولاً»
   «مش بس لما تكون مسودة — أنا عايز لما أبدأ حاجة جديدة عموماً أقدر أضيف
    المرفق في نفس الوقت، من غير ما أحفظ أو أعمل مسودة الأول»

   فهو **كل سجل جديد، في كل شاشة**، من لحظة فتح النموذج (القاعدة ٢١).
   وقد أرسل صورة الشاشة مرّتين وسأل «إنتم عملتم إيه في المرفقات» — ولم يكن
   قد بُني شيء. هذا الملف هو الجواب.

   ── لماذا لم يكن يعمل، وهو ليس عطلاً ────────────────────────────────────
   attachments.js يبحث عن السجل الأب ليعرف موقعه قبل أن يحفظ المرفق — فلا
   بدّ أن يكون السجل موجوداً وله معرّف. فالرسالة «احفظ السجل أولاً» كانت
   **صادقة**: الميزة لم تكن موجودة، لا معطّلة.

   ── الشكل، وقد تحقّقتُ من كل جزء منه قبل كتابة سطر ──────────────────────
   ١) الملفات تُمسك في الذاكرة كمقابض File — **لا تُقرأ محتوياتها إطلاقاً**
      حتى لحظة الرفع. مقبض File إشارةٌ إلى ملفٍ على القرص، فحملُ عشرين منها
      لا يكلّف شيئاً. قراءتها إلى ذاكرة الصفحة هو ما يكسر اللسان على رسمة
      كبيرة — ولذلك لا نفعله.
   ٢) 🔴 **الحفظ المرفوض هو الحالة السهلة، لا الصعبة** — وهذا تحقّقتُ منه
      في المصدر لا افترضته: pages/entity.js يفحص `if (!saved) return false;`
      **قبل** UI.closeModal(). فالنموذج **يبقى مفتوحاً** عند الرفض، فتبقى
      الملفات الممسوكة معه للسبب نفسه الذي يبقي كتابته. لا مخزن إنقاذ جديد،
      ولا تسلسل، ولا طريق فشل جديد. (حالة «Project access denied» التي صوّرها
      يوم ٢ سبتمبر هي هذه بعينها.)
   ٣) المَغرز: نلفّ `Store.create` — تُعيد الصفّ بمعرّفه عند النجاح و`null`
      عند الرفض، وهي بالضبط الإشارة المطلوبة. وستّة ملفات تلفّها بالفعل
      (save-modes · audit-trail · doc-numbering · import-documents ·
      employee-count-fill …) فالمَغرز مُثبَت بالاستعمال لا مُفترَض.
   ٤) بلا إنترنت: attachments.js يرفض الرفع **بصدق** ويقول ذلك، ولا يدّعي
      نجاحاً. فنُمسك الملفات ونسمّيها ونعيد المحاولة على حدث `online` —
      وهو الحدث نفسه الذي تستعمله audit-trail وsave-modes وstore بالفعل.

   ── الحدّ الذي لا نُخفيه ────────────────────────────────────────────────
   🔴 إغلاق اللسان أو تحديث الصفحة **يفقد الاختيار** (لا يفقد أي ملف مرفوع).
   مقابض File لا تُخزَّن، ونسخُ بايتات كل ملف إلى IndexedDB هو ما نُهينا عنه
   في الشرط ٤. فنقولها على الشاشة: اللوحة تسمّي الملفات الممسوكة وتقول متى
   تُرفَع — فلا يضيع شيء في صمت (الشرط ٥).

   ── الحذف يُعيد السلوك السابق حرفياً ────────────────────────────────────
   احذف هذا الملف من loader.js فتعود رسالة «احفظ السجل أولاً» كما كانت —
   attach-from-form.js يستدعي هذا الملف إن وُجد فقط، ويرجع إلى رسالته إن غاب.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The owner asked TWICE to attach files from the moment a NEW record's form
   opens, on ANY screen, with no save or draft first (Standing Order 21). He
   sent the screenshot twice and asked what had been done about attachments;
   nothing had been. This file is the answer.

   It was never broken: attachments.js resolves the PARENT record to learn
   its site, so the record must exist first. "Save this record first" was
   TRUE — the feature was missing, not faulty.

   THE SHAPE, every part verified before a line was written:
   1) Files are held as `File` HANDLES and never read until upload. A handle
      is a disk reference; twenty cost nothing. Reading bytes into the page
      is what breaks the tab on a big drawing, so it is not done.
   2) 🔴 A REFUSED SAVE IS THE EASY CASE, not the hard one — verified in
      source, not assumed: pages/entity.js checks `if (!saved) return false;`
      BEFORE UI.closeModal(), so the form STAYS OPEN on refusal and held
      files survive with it for the same reason his typing does. No rescue
      store, no serialisation, no new failure mode.
   3) The seam is `Store.create`: it returns the row with its id on success
      and null on refusal — exactly the signal needed — and SIX files already
      wrap it, so the seam is proven by use, not assumed.
   4) Offline, attachments.js refuses HONESTLY and never claims success. So
      we hold, name the files, and retry on the `online` event — the same
      event audit-trail.js, save-modes.js and store.js already use.

   🔴 THE LIMIT WE DO NOT HIDE: closing the tab loses the SELECTION (never an
   uploaded file). File handles cannot be stored, and copying every file's
   bytes into IndexedDB is what condition 4 forbids. So the panel NAMES the
   held files and says when they upload — nothing is silent (condition 5).

   Deleting this file from loader.js restores the previous behaviour exactly.
   ========================================================================= */

(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }

  /* الملفات الممسوكة للنموذج المفتوح الآن. #modalHost واحد، فنموذج واحد
     مفتوح في كل لحظة — لا حاجة لمفتاح مركّب.
     Files held for the form open right now. There is one #modalHost, so one
     form at a time — no compound key is needed. */
  var held = [];          /* [{ file, name, size, state, error }] */
  var heldModule = null;  /* moduleId the held files belong to */

  /* ملفات رُفعت محاولةً وفشلت بلا إنترنت، بانتظار عودة الاتصال.
     Files whose upload failed offline, waiting for the connection. */
  var pending = [];       /* [{ moduleId, recordId, file, name }] */

  function reset() { held = []; heldModule = null; }

  /* ── 🔴 A-ABS-ORPHAN — الملفّ المهجور كان يلتصق بسجلّ شخصٍ آخر ─────────
     العطل: يفتح «جديد»، يختار ملفاً، ثم **يغلق النموذج بلا حفظ**. كانت
     `held` تبقى في الذاكرة، فيلتقطها **أوّل حفظ تالٍ على نفس الشاشة**.
     والحارس الوحيد كان `:141` — `heldModule !== moduleId` — وهو لا ينظّف
     إلّا عند الانتقال إلى شاشة **أخرى**. فالعطل لا يقع على مسار نادر، بل
     على أكثر المسارات اعتيادية: إدخال عدّة موردين وراء بعضهم. يهجر الثالث،
     فيهبط مرفقه على الرابع. وقد أثبتت بوّابة ENHANCER أنه يهبط أيضاً على
     صفٍّ قادم من **استيراد** ملفّ إكسل.

     🔴 لماذا لا نلفّ `UI.closeModal` — وهو ما كان سيبدو الحلّ الطبيعي:
     **فخّ «التصدير المُغلَق» للمرّة الثانية عشرة.** `ui.js` ينادي
     `closeModal()` **داخلياً** في `:125` (زرّ الإلغاء نفسه) و`:151`
     (الإغلاق بالخلفية أو Escape) و`:185` — وكلّها ترتبط بالنسخة المحلّية
     داخل الإغلاق، لا بالتصدير. فلفُّ `UI.closeModal` كان سينجح في فحصٍ
     يناديه مباشرةً، و**لا يفعل شيئاً حين يضغط موظّف زرّ «إلغاء»**.

     المَغرز الصحيح: `closeModal()` — أيّاً كان من ناداه — يضع
     `modalHost.hidden = true` (ui.js:145)، والفتح يضع `false` (ui.js:139).
     فنراقب هذه الخاصّية وحدها بـ MutationObserver و`subtree:false`.
     **كل مسارات الإغلاق تمرّ من هنا، بلا استثناء.**

     والتمييز ثلاثيّ، لا لفّة واحدة:
     ١) إغلاق بلا حفظ            → نتخلّص من الملفّات (وهو ما وعدناه به:
                                    «لم تُرفَع بعد… ستحتاج لاختيارها من جديد»)
     ٢) حفظ **مرفوض**            → `entity.js:872` يعود `false` **قبل**
                                    `UI.closeModal()`، و`ui.js:120` يعود
                                    كذلك قبل الإغلاق. فالنموذج يبقى مفتوحاً
                                    ولا يُطلَق حدثٌ أصلاً ⇒ **الملفّات تبقى**.
                                    وهذا وعدُ الدفعة نفسه (فحص ٣ في الدليل).
     ٣) حفظ **ناجح**             → اللافّة تجدول `uploadHeld` بـ
                                    `setTimeout(…,0)`، فالإغلاق يقع **قبله**.
     🔴 ولولا العدّاد أدناه لكان العلاج نفسه يمسح الملفّات قبل رفعها —
     أي لكسر الميزة التي وُجدت الدفعة كلّها من أجلها.

     ── ENGLISH ──────────────────────────────────────────────────────────
     THE BUG: he opens «جديد», picks a file, then CLOSES THE FORM WITHOUT
     SAVING. `held` survived in memory and the NEXT save on the SAME screen
     picked it up. The only guard, `:141` (`heldModule !== moduleId`), clears
     merely on switching to a DIFFERENT screen — so this fired on the most
     ORDINARY path there is: entering several suppliers in a row. Abandon the
     third and its drawing lands on the fourth. ENHANCER's gate proved it also
     lands on a row created by a SPREADSHEET IMPORT.

     🔴 WHY NOT WRAP `UI.closeModal`, which looks like the obvious cure:
     THE CLOSURE-EXPORT DECOY, TWELFTH SIGHTING. `ui.js` calls `closeModal()`
     INTERNALLY at `:125` (the Cancel button itself), `:151` (backdrop/Escape)
     and `:185` — all bound to the closure-local function, not the export. A
     wrapper on `UI.closeModal` would pass a trial that calls it directly and
     DO NOTHING when a real member of staff presses «إلغاء».

     The true seam: whoever calls `closeModal()`, it sets
     `modalHost.hidden = true` (ui.js:145); opening sets `false` (ui.js:139).
     So we watch that ONE attribute with `subtree:false`. EVERY close path
     goes through it.

     A THREE-WAY discrimination, not a wrapper:
     1) closed without saving → discard (exactly what the panel promised him)
     2) save REFUSED          → `entity.js:872` returns false BEFORE
                                `UI.closeModal()`, and `ui.js:120` returns
                                before closing too. The form stays open, no
                                event fires ⇒ THE FILES SURVIVE. That is the
                                batch's own promise (guide Check 3).
     3) save SUCCEEDED        → the wrapper schedules `uploadHeld` on a
                                `setTimeout(…,0)`, so the close happens FIRST.
     🔴 Without the counter below, this very cure would wipe the files before
     they uploaded — breaking the feature the whole batch exists to deliver. */
  var handoff = 0;   /* حفظٌ ناجح سلّم الملفّات بالفعل · a successful save owns them */

  function onModalClosed() {
    /* تسليمٌ جارٍ ⇒ الحفظ الناجح يملك الملفّات، ولا نلمسها.
       A handoff is in flight ⇒ the successful save owns them; hands off. */
    if (handoff > 0) return;
    if (!held.length) return;
    reset();
  }

  function installCloseWatch() {
    if (!global.MutationObserver || !global.document) return false;
    var host = document.getElementById('modalHost');
    if (!host) return false;
    if (host.__azAbsCloseWatch) return true;
    host.__azAbsCloseWatch = true;
    /* subtree:false عمداً — نراقب خاصّية واحدة على عقدة واحدة. مراقبة الشجرة
       كلّها تُطلق على كل رسمة صفّ، وهي عشرات المرّات في كل عرض.
       subtree:false deliberately — ONE attribute on ONE node. Watching the
       tree fires on every row render, dozens of times per paint. */
    new MutationObserver(function () {
      if (host.hidden === true) onModalClosed();
    }).observe(host, { attributes: true, attributeFilter: ['hidden'], subtree: false });
    return true;
  }

  function sizeMB(n) { return Math.round((n / 1048576) * 10) / 10; }

  function extOf(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  /* نفس حدود attachments.js — نقرأها منه ولا نكتب نسخة ثانية تتباعد عنه.
     The same limits as attachments.js, READ FROM IT rather than copied — a
     second copy of a rule drifts from the first, which has cost this project
     before. */
  function limits() {
    var A = global.Attachments || {};
    return {
      maxMB: typeof A.MAX_MB === 'number' ? A.MAX_MB : 25,
      allowed: Array.isArray(A.ALLOWED_EXT) ? A.ALLOWED_EXT : []
    };
  }

  function rejectReason(file) {
    var lim = limits();
    if (lim.allowed.length && lim.allowed.indexOf(extOf(file.name)) === -1) {
      return L({ ar: 'نوع الملف غير مسموح (' + esc(extOf(file.name)) + ').',
                 en: 'File type not allowed (' + esc(extOf(file.name)) + ').' });
    }
    if (file.size > lim.maxMB * 1048576) {
      return L({ ar: 'أكبر من الحدّ (' + sizeMB(file.size) + ' م.ب، والحدّ ' + lim.maxMB + ').',
                 en: 'Larger than the limit (' + sizeMB(file.size) + ' MB, limit ' + lim.maxMB + ').' });
    }
    return null;
  }

  /* ── اللوحة داخل نموذج سجلّ جديد ─────────────────────────────────────
     يُنادى من attach-from-form.js في الفرع الذي كان يطبع «احفظ أولاً».
     Called by attach-from-form.js in the branch that used to print
     "save first". */
  function renderNewRecordPanel(moduleId, body) {
    if (!body) return false;
    /* ── 🔴 A-ABS-ORPHAN · الطبقة الأولى، وهي الأهمّ ────────────────────
       كان: `if (heldModule && heldModule !== moduleId) reset();`
       أي لا ينظّف إلّا عند الانتقال إلى شاشة **أخرى**. فمن يُدخل عدّة
       موردين وراء بعضهم على نفس الشاشة، ويهجر واحداً، كان مرفقُه يهبط على
       التالي. **صار: تصفير غير مشروط.**

       لماذا هذا آمن، وقد تحقّقتُ منه بالقراءة لا بالافتراض:
       · هذه الدالّة تُنادى **مرّة واحدة لكل فتح نموذج** — من
         `attach-from-form.js:225`، داخل `injectIntoForm`، التي تُجدوَل من
         **لفّة `UI.modal`** (`attach-from-form.js:292-305`). وهي قاعدة
         المشروع نفسها: «لفّ UI.modal ولا تراقب DOM».
       · إضافةُ ملفّ لا تمرّ من هنا إطلاقاً — بل من `paint()`. فالتصفير
         لا يمسّ ملفّاً اختاره للتوّ.
       · والحفظ **المرفوض** لا يُعيد رسم اللوحة (النموذج يبقى مفتوحاً كما
         هو)، فالملفّات تبقى — وهو وعد الدفعة نفسه.

       ── ENGLISH ────────────────────────────────────────────────────────
       WAS: `if (heldModule && heldModule !== moduleId) reset();` — it only
       cleared on switching to a DIFFERENT screen. Entering several suppliers
       in a row and abandoning one dropped its attachment onto the next.
       NOW: an unconditional reset. A form is opening, so anything still held
       belongs to a form that is gone.

       Why this is safe — established by reading the callers, not assumed:
       · called ONCE PER MODAL OPEN, from `attach-from-form.js:225` inside
         `injectIntoForm`, which is scheduled by the `UI.modal` WRAPPER
         (`attach-from-form.js:292-305`) — the project's own rule: wrap
         UI.modal, do not watch the DOM.
       · adding a file never comes through here; that is `paint()`. So this
         cannot discard a file he has just chosen.
       · a REFUSED save does not re-render the panel (the form stays open),
         so the files survive — which is the batch's own promise. */
    reset();
    heldModule = moduleId;

    var box = document.getElementById('azAttachBeforeSave');
    if (!box) {
      box = document.createElement('div');
      box.id = 'azAttachBeforeSave';
      box.style.marginTop = '10px';
      body.appendChild(box);
    }
    paint(box);
    return true;
  }

  function paint(box) {
    box = box || document.getElementById('azAttachBeforeSave');
    if (!box) return;
    var lim = limits();

    var rows = '';
    held.forEach(function (h, i) {
      rows += '<li style="margin:2px 0">' +
        (h.error ? '⛔ ' : '📎 ') + esc(h.name) +
        ' <span class="muted">(' + sizeMB(h.size) + ' MB)</span>' +
        (h.error ? ' <span class="muted">— ' + esc(h.error) + '</span>' : '') +
        ' <button type="button" class="btn btn-ghost btn-sm" data-az-abs-del="' + i + '">✕</button>' +
        '</li>';
    });

    box.innerHTML =
      '<label class="label">' + esc(L({ ar: 'مرفقات', en: 'Attachments' })) + '</label>' +
      '<input type="file" multiple id="azAbsInput" class="input" />' +
      (held.length
        ? '<ul style="list-style:none;padding:0;margin:6px 0">' + rows + '</ul>'
        : '') +
      '<p class="muted small" style="margin-top:4px">' +
      esc(held.length
        ? L({ ar: 'هذه الملفات تُرفَع تلقائياً بمجرّد حفظ السجل. لو رُفض الحفظ تبقى هنا وتُرفَع عند إعادة المحاولة.',
              en: 'These files upload automatically the moment the record saves. If the save is refused they stay here and upload when you try again.' })
        : L({ ar: 'اختر الملفات الآن — تُرفَع تلقائياً بمجرّد حفظ السجل. لا حاجة للحفظ أولاً.',
              en: 'Choose files now — they upload automatically the moment the record saves. No need to save first.' })) +
      '</p>' +
      /* 🔴 الحدّ يُقال على الشاشة، لا يُخفى — الشرط ٥.
         🔴 The limit is SAID on screen, never hidden — condition 5. */
      (held.length
        ? '<p class="muted small">' + esc(L({
            ar: 'لم تُرفَع بعد. لو أغلقت الصفحة قبل الحفظ ستحتاج اختيارها من جديد.',
            en: 'Not uploaded yet. If you close the page before saving you will need to choose them again.'
          })) + '</p>'
        : '') +
      '<p class="muted small">' + esc(L({
        ar: 'الحدّ ' + lim.maxMB + ' م.ب للملف.',
        en: 'Limit ' + lim.maxMB + ' MB per file.'
      })) + '</p>';

    var input = document.getElementById('azAbsInput');
    if (input) {
      input.onchange = function () {
        var files = Array.prototype.slice.call(input.files || []);
        files.forEach(function (f) {
          held.push({ file: f, name: f.name, size: f.size, error: rejectReason(f) });
        });
        input.value = '';
        paint();
      };
    }
    Array.prototype.slice.call(box.querySelectorAll('[data-az-abs-del]')).forEach(function (b) {
      b.onclick = function () {
        held.splice(Number(b.getAttribute('data-az-abs-del')), 1);
        paint();
      };
    });
  }

  /* ── الرفع بعد نجاح الحفظ ────────────────────────────────────────────
     تُنادى بعد أن يُعيد Store.create صفّاً حقيقياً — أي بعد أن صار للسجل
     معرّف. Called once Store.create has returned a real row — i.e. once the
     record has an id. */
  async function uploadHeld(moduleId, recordId) {
    /* التسليم تمّ: من هنا فصاعداً `held` فارغة على كل مسار أدناه، فمراقبُ
       الإغلاق يصير بلا أثر. و`Math.max` لأن الفحوص تنادي هذه الدالّة
       مباشرةً بلا لافّة ترفع العدّاد.
       The handoff is complete: from here `held` is emptied on every path
       below, so the close-watcher becomes a no-op. `Math.max` because trials
       call this directly, with no wrapper having raised the counter. */
    handoff = Math.max(0, handoff - 1);
    var mine = held.filter(function (h) { return !h.error; });
    if (!mine.length) { reset(); return { ok: true, uploaded: 0, failed: [] }; }
    reset();

    var uploaded = 0, failed = [];
    for (var i = 0; i < mine.length; i++) {
      var r = null;
      try {
        r = await Attachments.upload(moduleId, recordId, mine[i].file, undefined);
      } catch (e) {
        r = { ok: false, error: (e && e.message) || 'upload-threw' };
      }
      if (r && r.ok) uploaded++;
      else {
        failed.push({ name: mine[i].name, error: (r && r.error) || 'unknown' });
        /* بلا إنترنت: نحتفظ بها ونعيد المحاولة عند عودة الاتصال — لا نتخلّص
           منها في صمت. Offline: keep it and retry on reconnect, never
           discard it silently. */
        pending.push({ moduleId: moduleId, recordId: recordId, file: mine[i].file, name: mine[i].name });
      }
    }

    if (global.UI && UI.toast) {
      if (uploaded && !failed.length) {
        UI.toast(L({ ar: 'أُرفِقت ' + uploaded + ' ملف مع السجل.',
                     en: uploaded + ' file(s) attached to the record.' }), 'success', 5000);
      } else if (failed.length) {
        UI.toast(L({
          ar: 'حُفظ السجل. ' + uploaded + ' ملف أُرفِق، و' + failed.length +
              ' لم يُرفَع بعد (' + failed.map(function (f) { return f.name; }).join('، ') +
              ') — سيُرفَع تلقائياً عند عودة الاتصال.',
          en: 'Record saved. ' + uploaded + ' file(s) attached, ' + failed.length +
              ' not uploaded yet (' + failed.map(function (f) { return f.name; }).join(', ') +
              ') — they will upload when the connection returns.'
        }), 'warn', 12000);
      }
    }
    return { ok: !failed.length, uploaded: uploaded, failed: failed };
  }

  /* ── إعادة المحاولة عند عودة الاتصال ─────────────────────────────────
     نفس حدث `online` الذي تستعمله audit-trail.js وsave-modes.js وstore.js.
     The same `online` event audit-trail.js, save-modes.js and store.js use. */
  async function flushPending() {
    if (!pending.length) return { uploaded: 0, left: 0 };
    var queue = pending.slice();
    pending = [];
    var uploaded = 0;
    for (var i = 0; i < queue.length; i++) {
      var r = null;
      try { r = await Attachments.upload(queue[i].moduleId, queue[i].recordId, queue[i].file, undefined); }
      catch (e) { r = { ok: false }; }
      if (r && r.ok) uploaded++; else pending.push(queue[i]);
    }
    if (uploaded && global.UI && UI.toast) {
      UI.toast(L({ ar: 'رُفِع ' + uploaded + ' مرفق كان بانتظار الاتصال.',
                   en: uploaded + ' attachment(s) that were waiting for the connection have uploaded.' }),
        'success', 6000);
    }
    return { uploaded: uploaded, left: pending.length };
  }

  /* ── المَغرز: Store.create ────────────────────────────────────────────
     يُعيد الصفّ بمعرّفه عند النجاح و null عند الرفض. لا نلمس القيمة المُعادة
     إطلاقاً — نمرّرها كما هي، فسلسلة اللوافّ الستّ القائمة لا تتأثّر.
     Returns the row with its id on success, null on refusal. The return
     value is passed through UNTOUCHED, so the existing six-wrapper chain is
     unaffected. */
  function installStoreWrap() {
    if (!global.Store || typeof Store.create !== 'function') return false;
    if (Store.__azAttachBeforeSave) return true;
    Store.__azAttachBeforeSave = true;

    var inner = Store.create;
    Store.create = function (table, data, opts) {
      var row = inner.apply(Store, arguments);
      try {
        if (row && row.id && held.length && heldModule) {
          var mod = global.Schema && Schema.get ? Schema.get(heldModule) : null;
          var wanted = (mod && mod.table) || heldModule;
          /* الجدول نفسه فقط — نموذج مفتوح لشاشة أخرى لا يخطف الملفات
             only the matching table — a form open on another screen must
             not hijack the held files */
          if (table === wanted) {
            var moduleId = heldModule;
            /* 🔴 يُرفع **قبل** المؤقّت، لا داخله: `UI.closeModal()` يقع في
               نفس النبضة بعد رجوع Store.create، أي **قبل** أن يجري المؤقّت.
               فلو رفعناه داخله لوجد مراقبُ الإغلاق العدّادَ صفراً ومسح
               الملفّات قبل رفعها.
               🔴 Raised BEFORE the timer, not inside it: `UI.closeModal()`
               runs in the same tick after Store.create returns — i.e. BEFORE
               the timer fires. Raising it inside would let the close-watcher
               see a zero counter and wipe the files before they uploaded. */
            handoff++;
            setTimeout(function () { uploadHeld(moduleId, row.id); }, 0);
          }
        }
      } catch (e) { console.error('[attach-before-save]', e); }
      return row;
    };
    return true;
  }

  function install() {
    installStoreWrap();
    installCloseWatch();
    global.addEventListener('online', function () { setTimeout(flushPending, 2000); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  global.AttachBeforeSave = {
    renderNewRecordPanel: renderNewRecordPanel,
    uploadHeld: uploadHeld,
    flushPending: flushPending,
    /* للفحوص وللقراءة البشرية — لا يستعملها شيء في البورتال
       for trials and for a human to read — nothing in the portal uses these */
    __held: function () { return held.slice(); },
    __pending: function () { return pending.slice(); },
    __handoff: function () { return handoff; },
    __installCloseWatch: installCloseWatch,
    __reset: function () { reset(); pending = []; handoff = 0; }
  };

  console.info('attach-before-save.js ready — files can be chosen before a new record is saved.');
})(window);
