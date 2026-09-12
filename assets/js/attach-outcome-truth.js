/* =========================================================================
   attach-outcome-truth.js — رسالة واحدة صادقة عن كلّ ملفّ، وحفظُ السجلّ
                             مفصولٌ عن رفع الملفّ
   attach-outcome-truth.js — one truthful sentence per file, with the record
                             save kept visibly separate from the file upload

   v2.0.34 · نسخة الرفع بعد المراجعة · release copy, after review.

   ── سجلّ النسخ · VERSION LOG ────────────────────────────────────────────
   v1 · ٩ سبتمبر — الأعطال الثلاثة أدناه.
   v2 · ١٠ سبتمبر — ثلاثة تصحيحات، كلّها مقيسة:
        ١) 🔴 **الملفّ اليتيم الذي فاتني.** قلتُ أدناه إنّ attachments.js:249
           يتولّى اليتيم — وهو يتولّى حالةً واحدة فقط. حين يرفض الخادمُ السجلَّ
           **نفسه** بعد أن أعاد Store.create صفّاً محلّياً، كان الملفّ يُرفَق
           بمعرّفٍ لا وجود له (قِيس: ١٥ من ١٥). الآن لا رفع قبل أن يُرى السجل
           على الخادم، و«✅ حُفظ السجل» لا تُقال إلّا حين يراه.
        ٢) كلّ الملفّات مرفوضة في اللوحة ⇒ لم تكن تُذكر بعد الحفظ إطلاقاً.
        ٣) مدّة رسائل الخطأ ١٢ ثانية لا ١٤ (كانت تطيل حجب زرّ «حفظ»).
   v1 · 9 Sept — the three faults below.
   v2 · 10 Sept — three corrections, each measured: (1) 🔴 THE ORPHAN I MISSED.
        The header below says attachments.js:249 handles orphans; it handles one
        case only. When the server refuses the RECORD ITSELF after Store.create
        has returned a local row, the file was attached to an id that exists
        nowhere (measured 15/15). Now nothing uploads until the record is seen on
        the server, and «✅ Record saved» is said only when it is. (2) When every
        chosen file was refused in the panel, none was mentioned after saving.
        (3) Error messages last 12 s, not 14 (they lengthened the Save block).
        (4) An OFFLINE draft («مسودة حتى الاتصال») closed the form and dropped
        the chosen file in silence while the portal said the draft "will upload
        automatically"; the file is now named and reselection required.
        (5) The batch message is matched by its WHOLE template — a fragment also
        matched pages/entity.js:874's offline message and would have swallowed it.

   ── الأعطال الثلاثة، مقيسةً على خادم حقيقي لا مُتخيَّلة ─────────────────
   ١) **وعدٌ كاذب.** يرفض الخادمُ الملفَّ والإنترنت يعمل، فيُقال للموظّف:
      «حُفظ السجل. 0 ملف أُرفِق، و1 لم يُرفَع بعد (عقد-المورد.pdf) —
      **سيُرفَع تلقائياً عند عودة الاتصال**.» والاتصالُ لم ينقطع أصلاً،
      فالطابور لا مخرج له إلّا حدث `online` الذي لن يقع. والسببُ الحقيقي
      كان معروفاً طبقةً واحدة تحت: «تعذّر تحديد موقع المستند — لم يُرفع
      الملف.» — فيُرمى ويُستبدَل بوعدٍ لا يُوفى.
   ٢) **الطابور يموت مع الصفحة.** `pending` في الذاكرة وحدها
      (attach-before-save.js:99). قِسناها: ملفٌّ في الطابور، ثمّ تحديث
      الصفحة ⇒ الطابور **فارغ**. فحتى لو عاد الاتصالُ حقّاً، لا شيء يرفع.
   ٣) **الملفّ المرفوض يختفي من الرسالة.** ثلاثة ملفّات: واحد سليم، وواحد
      ٢٦ م.ب، وواحد exe. الرسالة: «أُرفِقت 1 ملف مع السجل.» — وآخر ما
      يقرؤه نجاحٌ غير مشروط، ولا ذكر للاثنين اللذين لم يذهبا.

   ── 🔴 المَغرز الحيّ، وقد أُثبت بالتشغيل قبل كتابة سطر ──────────────────
   الطريق «الواضح» — استبدال `AttachBeforeSave.uploadHeld` — **ميّت**.
   attach-before-save.js:445 ينادي الرابطة **المحلّية** داخل الإغلاق، لا
   المُصدَّرة. قِسناها: لافّةٌ على المُصدَّر جرت **صفر** مرّة أثناء حفظٍ
   حقيقيّ. وهذا فخّ «التصدير المُغلَق» نفسه الذي وقع فيه المشروع اثنتي
   عشرة مرّة — ولو أخذناه لكان الإصلاح كلّه كوداً ميّتاً ينجح في كلّ فحص.

   المَغارز التي **جرت فعلاً** في القياس نفسه، وهي التي نستعملها:
     · `Store.create`        — نلتقط الملفّات الممسوكة **قبل** التسليم
     · `Attachments.upload`  — تُنادى كـ`global.Attachments.upload` فتُعترَض
     · `UI.toast`            — تُنادى كـ`global.UI.toast` فتُعترَض

   ── القرار الذي اتُّخذ ولم يُخترَع ───────────────────────────────────────
   لا نستطيع أن نُثبت أنّ الطابور ينجو من إغلاق الصفحة — بل أثبتنا العكس.
   وتخزينُ بايتات الملفّات على الجهاز ممنوعٌ هنا (سؤال سرّيّة الجهاز
   المشترك ما زال مفتوحاً). فالقاعدة صارت:
     · رفضٌ **والإنترنت يعمل** (صلاحية أو قاعدة أو تحقّق) ⇒ لا إعادة
       محاولة إطلاقاً، ونُخرجه من الطابور، ونقول السبب الحقيقي والخطوة
       المسموحة.
     · فشلٌ **والجهاز غير متّصل فعلاً** ⇒ يبقى في الطابور، ونقول بالحرف
       إنّه يُرفَع تلقائياً **ما دامت الصفحة مفتوحة**، وإن أُغلقت فلا بدّ
       من اختياره من جديد. لا وعدَ أبعد من ذلك.

   ── التكرار والملفّ اليتيم ──────────────────────────────────────────────
   قِسنا أنّ رفع الملفّ نفسه مرّتين يصنع **صفّين** — لأنّ `safeName()` يضيف
   لاحقةً فريدة فلا يتصادم المساران. فقبل كلّ رفع نسأل الخادم: هل لهذا
   السجلّ مرفقٌ بالاسم والحجم نفسيهما وغير محذوف؟ فإن وُجد لا نرفع ونقول
   إنّه مرفقٌ بالفعل. أمّا الملفّ اليتيم (وصل التخزينَ ورُفض صفُّه) فيتولّاه
   attachments.js:249 أصلاً، ولا نكرّر علاجه.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   THREE FAULTS, measured against a real server:
   1) A FALSE PROMISE. The server refuses a file while the internet is fine
      and the person is told "it will upload automatically when the
      connection returns." The connection never went, so the queue's only
      exit (the `online` event) can never fire. The true reason was known
      one layer down and was thrown away.
   2) THE QUEUE DIES WITH THE PAGE. `pending` is memory only
      (attach-before-save.js:99). Measured: a file in the queue, then a
      reload, and the queue is EMPTY.
   3) A REFUSED FILE VANISHES FROM THE MESSAGE. Three files chosen — one
      good, one 26 MB, one .exe — and the message reads "1 file attached to
      the record", naming neither of the two that never went.

   🔴 THE LIVE SEAM, PROVEN BY RUNNING BEFORE A LINE WAS WRITTEN.
   The obvious route — replacing `AttachBeforeSave.uploadHeld` — IS DEAD.
   attach-before-save.js:445 calls the CLOSURE-LOCAL binding, not the export.
   Measured: a wrapper on the export ran ZERO times during a real save. That
   is the closure-export decoy this project has hit twelve times; taking it
   would have produced a fix that passes every trial and changes nothing.
   The seams that DID fire, and which this file uses: Store.create (to
   capture the held files before the handoff), global Attachments.upload,
   and global UI.toast.

   THE DECISION, TAKEN NOT INVENTED: we cannot prove the queue survives a
   page close — we proved the opposite — and storing file bytes on the
   device is out of bounds here while the shared-device confidentiality
   question is still open. So: refused WHILE ONLINE (permission, rule,
   validation) ⇒ never retried, removed from the queue, true reason and the
   permitted next action stated. Failed WHILE GENUINELY OFFLINE ⇒ kept in
   the queue, and we say in plain words that it uploads by itself only WHILE
   THIS PAGE STAYS OPEN, and must be chosen again if it is closed. No
   promise beyond that.

   DUPLICATES: measured — uploading the same file twice makes TWO rows,
   because safeName() adds a unique suffix so the paths never collide. So
   before every upload we ask the server whether this record already holds a
   live attachment of the same name and size, and if it does we do not
   upload and say so. Orphaned files (storage accepted, row refused) are
   already cleaned by attachments.js:249 — no second cure is invented.

   احذف هذا الملف من loader.js فيعود السلوك السابق حرفياً.
   Deleting this file from loader.js restores the previous behaviour exactly.
   ========================================================================= */

(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* الشظايا المميّزة للرسالتين اللتين يكتبهما attach-before-save.js:373-385.
     منقولة من المصدر حرفياً، لا مؤلَّفة — فلو تغيّر المصدر انكشف الفحص.
     The distinctive fragments of the two sentences attach-before-save.js
     writes at :373-385. Copied from the source verbatim, never composed, so
     a change in the source shows up as a failing trial rather than silence. */
  var LIE_FRAGMENTS  = ['عند عودة الاتصال', 'when the connection returns'];
  var DONE_FRAGMENTS = ['مع السجل', 'attached to the record'];
  var FLUSH_FRAGMENTS = ['كان بانتظار الاتصال', 'waiting for the connection have uploaded'];

  /* v2 · 🔴 تُعرَف رسالة الدفعة **بقالبها الكامل**، لا بشظيّة. الشظيّة
     «عند عودة الاتصال» موجودةٌ أيضاً في رسالة الحفظ دون اتصال في
     pages/entity.js:874 («تم حفظ المسودة على هذا الجهاز وستُزامن عند عودة
     الاتصال»)، وتلك تصل **قبل** رسالة الرفع. فكانت اللافّة ستبتلع رسالةً صادقة
     ومهمّة، وتتكلّم قبل أن يجري أيّ رفع. والإنجليزية «when the connection
     returns» في store.js:196 أيضاً. القالبان أدناه منقولان من
     attach-before-save.js:375-384 حرفياً، وهما لا يظهران في أيّ ملفّ آخر.
     v2 · 🔴 The batch message is recognised by its WHOLE TEMPLATE, never a
     fragment. «عند عودة الاتصال» also appears in the offline save message at
     pages/entity.js:874 (and "when the connection returns" in store.js:196),
     which arrives BEFORE the upload message — the wrapper would have
     swallowed a true, important message and spoken before any upload ran.
     The two templates below are copied from attach-before-save.js:375-384
     verbatim and appear in no other file. */
  var DONE_TEMPLATES = [/^أُرفِقت \d+ ملف مع السجل\.$/, /^\d+ file\(s\) attached to the record\.$/];
  var LIE_TEMPLATES  = [/^حُفظ السجل\. \d+ ملف أُرفِق، و\d+ لم يُرفَع بعد \([\s\S]*\) — سيُرفَع تلقائياً عند عودة الاتصال\.$/,
                        /^Record saved\. \d+ file\(s\) attached, \d+ not uploaded yet \([\s\S]*\) — they will upload when the connection returns\.$/];
  function isBatchMessage(msg) {
    var t = String(msg == null ? '' : msg).trim();
    for (var i = 0; i < DONE_TEMPLATES.length; i++) if (DONE_TEMPLATES[i].test(t)) return true;
    for (var j = 0; j < LIE_TEMPLATES.length; j++) if (LIE_TEMPLATES[j].test(t)) return true;
    return false;
  }

  function hasAny(s, list) {
    s = String(s == null ? '' : s);
    for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) !== -1) return true;
    return false;
  }

  /* ── v2 · هل السجل موجود على الخادم؟ — بالاستقرار قبل الحكم ──────────
     نفس درس delete-outcome-truth.js: عيّنةٌ مبكّرة جدّاً تقرأ كتابةً لم تصل
     بعد، فتعلن «غير موجود» عن سجلٍّ حُفظ للتوّ. فنسأل عدّة مرّات بتباعدٍ
     متزايد، ونقطع عند أوّل ظهور. وخطأ القراءة نفسه **ليس** «غير موجود» — نعيد
     known:false فيمضي الرفع كالمعتاد، لا نمنع شيئاً على قراءةٍ فاشلة.
     v2 · Does the record exist on the server? — settle before judging. The
     same lesson as delete-outcome-truth.js: too early a sample reads a write
     that has not landed and calls a just-saved record missing. So we ask
     several times with growing gaps and stop at the first sighting. A READ
     ERROR is not "missing" — it returns known:false and the upload proceeds as
     before; nothing is ever blocked on a failed read. */
  var PARENT_DELAYS = [150, 300, 600, 1200];

  function tableOf(moduleId) {
    try { var m = global.Schema && Schema.get ? Schema.get(moduleId) : null; return (m && m.table) || moduleId; }
    catch (e) { return moduleId; }
  }

  async function confirmParent(table, id) {
    var c = null;
    try { c = global.Auth && Auth.client ? Auth.client() : null; } catch (e) {}
    if (!c || !table || !id) return { known: false };
    var readOk = false;
    for (var i = 0; i < PARENT_DELAYS.length; i++) {
      await new Promise(function (r) { setTimeout(r, PARENT_DELAYS[i]); });
      try {
        var got = await c.from(table).select('id').eq('id', id).maybeSingle();
        if (got.error) continue;
        readOk = true;
        if (got.data && got.data.id) return { known: true, exists: true };
      } catch (e) {}
    }
    return readOk ? { known: true, exists: false } : { known: false };
  }

  /* ── دفتر الدفعة · the batch ledger ────────────────────────────────── */
  var batch = null;
  var staleTimer = null;
  /* v2 · 🔴 الإغلاق مربوطٌ بالعملية لا بالساعة. كانت الدفعة تُغلَق بعد ٢٠
     ثانية ثابتة — فرفعُ رسمةٍ كبيرة على اتصال موقعٍ بطيء يتجاوزها بسهولة،
     فتُغلَق الدفعة قبل أن تصل رسالة uploadHeld، **فتمرّ الجملة القديمة
     الكاذبة كما هي**. قِيس في علامة تبويبٍ مخفيّة: مؤقّت ١٠٠ مللي استغرق ٨٩٤.
     الآن: لا إغلاق ما دام رفعٌ جارياً، والإغلاق بعد خمس دقائق **بلا نشاط**.
     v2 · 🔴 Closing is tied to the OPERATION, not the clock. The batch used to
     close after a fixed 20 s — a large drawing over a slow site connection
     exceeds that easily, the batch closes before uploadHeld's message arrives,
     AND THE OLD FALSE SENTENCE PASSES THROUGH UNCHANGED. Measured in a hidden
     tab: a 100 ms timer took 894 ms. Now: never closed while an upload is in
     flight, and closed after five minutes of NO ACTIVITY. */
  var STALE_MS = 5 * 60 * 1000;
  var inflight = 0;
  var inflightGuard = true;      /* يُطفأ في فحص الحقن وحده · switched off only by the injection check */
  function touch() {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(function staleCheck() {
      if (!batch || batch.spoken) return;
      if (inflightGuard && inflight > 0) { staleTimer = setTimeout(staleCheck, STALE_MS); return; }
      closeBatch();
    }, STALE_MS);
  }
  var lastBatchAt = 0;
  function openBatch(snapshot) {
    lastBatchAt = Date.now();
    batch = {
      chosen: snapshot,        /* [{name, size, error}] كما اختارها · as chosen */
      results: [],             /* [{name, ok, error, wasOffline, already, parentMissing}] */
      spoken: false,
      recordSaved: true
    };
    touch();
  }
  function closeBatch() {
    batch = null;
    if (staleTimer) { clearTimeout(staleTimer); staleTimer = null; }
  }

  var draining = false;        /* تصريفُ الطابور جارٍ · a queue drain is in flight */

  /* ── ١ · Store.create — نلتقط الملفّات قبل أن يمسحها uploadHeld ──────
     1 · Store.create — capture the held files before uploadHeld resets them.
     uploadHeld() calls reset() on its FIRST lines, so by the time the toast
     is written the refused files are already gone. This is the only point
     at which the full list still exists. */
  function wrapStoreCreate() {
    if (!global.Store || typeof Store.create !== 'function') return false;
    if (Store.__azAttachOutcomeTruth) return true;
    Store.__azAttachOutcomeTruth = true;

    var inner = Store.create;
    Store.create = function () {
      var snapshot = [];
      try {
        if (global.AttachBeforeSave && AttachBeforeSave.__held) {
          snapshot = AttachBeforeSave.__held().map(function (h) {
            return { name: h.name, size: h.size, error: h.error || null };
          });
        }
      } catch (e) { /* لا نكسر الحفظ لأجل رسالة · never break a save for a message */ }

      var row = inner.apply(Store, arguments);

      /* دفعةٌ تُفتَح فقط إن كان هناك ملفّات ممسوكة **وصفٌّ عاد**.
         حفظٌ مرفوض **في المتصفّح** يُعيد null ⇒ لا تسليم، والنموذج يبقى مفتوحاً
         بملفّاته. أمّا الرفض **من الخادم** فلا يظهر هنا — انظر v2 أدناه.
         A batch opens only when files were held AND a row came back. A save
         refused IN THE BROWSER returns null ⇒ no handoff, the form stays open
         with its files. A refusal FROM THE SERVER does not show here — see v2. */
      try {
        if (row && row.id && snapshot.length) {
          openBatch(snapshot);
          /* v2 · 🔴 نبدأ سؤال الخادم عن السجل **الآن**، قبل أيّ رفع.
             Store.create تُعيد الصفّ **قبل** أن يردّ الخادم. قِيس ١٠ سبتمبر:
             ١٥ ملفّاً مرفقاً بأصنافٍ رفضها الخادم — لا وجود لأيٍّ منها عنده —
             لأنّ الرفع بدأ على المعرّف المحلّي وحده. فالسؤال يبدأ هنا ويُنتظَر
             قبل الرفع، فلا يُرفَق ملفٌّ بسجلٍّ غير موجود.
             v2 · 🔴 Ask the server about the record NOW, before any upload.
             Store.create returns the row BEFORE the server answers. Measured on
             10 Sept: 15 files attached to items the server had refused — none
             of them exists there — because the upload started on the local id
             alone. The question starts here and is awaited before uploading. */
          batch.table = arguments[0];
          batch.recordId = row.id;
          batch.parent = confirmParent(arguments[0], row.id);

          /* v2 · 🔴 كلّ الملفّات المختارة مرفوضة في اللوحة ⇒ uploadHeld يعود
             مبكّراً **بلا أيّ رسالة** (attach-before-save.js:352). فالموظّف يختار
             رسمةً ٢٦ م.ب وحدها ويحفظ، ولا يقرأ بعد الحفظ أيّ ذكرٍ لها. نتكلّم
             نحن في هذه الحالة وحدها، بعد جواب الخادم عن السجل.
             v2 · 🔴 Every chosen file refused in the panel ⇒ uploadHeld returns
             early with NO message at all (attach-before-save.js:352). A person
             picks a single 26 MB drawing, saves, and reads nothing about it
             afterwards. We speak in this case only, after the server's answer. */
          if (snapshot.every(function (x) { return !!x.error; })) {
            var b0 = batch;
            b0.spoken = true;
            Promise.resolve(b0.parent).then(function (pp) {
              b0.parentConfirmed = !!(pp && pp.known && pp.exists);
              if (batch === b0) closeBatch();
              var s0 = sentence(b0);
              try { if (UI.__azAttachOutcomeTruthInner) UI.__azAttachOutcomeTruthInner.call(UI, s0.text, s0.kind, s0.ms); } catch (e3) {}
            });
          }
        }
      } catch (e2) {}
      return row;
    };
    return true;
  }

  /* ── ٢ · Attachments.upload — النتيجة الحقيقية لكلّ ملفّ، وحارس التكرار
     2 · Attachments.upload — the true per-file outcome, and the duplicate
     guard. Note `wasOffline` is read at the MOMENT of the attempt: that one
     boolean is the whole difference between a promise we can keep and one
     we cannot. */
  function wrapAttachmentsUpload() {
    if (!global.Attachments || typeof Attachments.upload !== 'function') return false;
    if (Attachments.__azAttachOutcomeTruth) return true;
    Attachments.__azAttachOutcomeTruth = true;

    var inner = Attachments.upload;
    Attachments.upload = async function (moduleId, recordId, file, opts) {
      /* أثناء التصريف: لا نرفع شيئاً، ونُعيد ok حتى يُسقطه flushPending من
         الطابور بدل أن يُعيده إليه. مقصودٌ ومكتوبٌ هنا صراحةً.
         During a drain: upload nothing and return ok so flushPending DROPS
         it from the queue instead of pushing it back. Deliberate, and said
         out loud here so nobody reads it as a success. */
      if (draining) return { ok: true, __drained: true };

      /* 🔴 دفعةٌ تُفتَح هنا أيضاً إن لم تكن مفتوحة. السبب مقيس لا مُتخيَّل:
         الدفتر كان يُفتَح في `Store.create` وحده، فأيّ مسارٍ يرفع بلا إنشاءٍ
         — إعادةُ المحاولة عند عودة الاتصال (`flushPending`)، أو أيّ نداءٍ
         مباشر — كان يمرّ بلا اعتراض **فتعود الجملة الكاذبة كما كانت**. أمسك
         ذلك فحصُ المتصفّح، لا القراءة. اللقطة تكون فارغة هنا، وهذا صحيح:
         الملفّات المرفوضة في اللوحة لا تصل إلى الرفع أصلاً.
         🔴 A batch is opened HERE too when none is open. Measured, not
         imagined: the ledger used to open only in Store.create, so any path
         that uploads without creating — the reconnect retry (flushPending),
         or any direct call — went past unintercepted AND THE FALSE SENTENCE
         CAME BACK. The browser trial caught that; reading the code did not.
         The snapshot is empty here, which is correct: panel-refused files
         never reach the upload step at all. */
      if (!batch) openBatch([]);
      inflight++; touch();
      try {

      var wasOffline = (global.navigator && navigator.onLine === false);

      /* v2 · 🔴 لا يُرفَق ملفٌّ بسجلٍّ لا يملكه الخادم — وهذا هو «الملفّ
         اليتيم» الذي فاتني في v1. ظننتُ أنّ attachments.js:249 يغطّي اليتيم،
         وهو لا يغطّي إلّا حالةً واحدة (وصل التخزينَ ورُفض صفّه). أمّا أن يُرفض
         **السجل نفسه** بعد أن أعاد Store.create صفّاً محلّياً، فكان الملفّ
         يُرفَع ويُسجَّل مرفقاً بمعرّفٍ لا وجود له. قِيس: ١٥ من ١٥.
         بلا اتصال لا نسأل — الرفع سيفشل بصدقٍ على أيّ حال ويسلك مساره.
         v2 · 🔴 No file is attached to a record the server does not hold — the
         "orphaned file" v1 missed. I believed attachments.js:249 covered
         orphans; it covers exactly one case (storage accepted, its row
         refused). When the RECORD ITSELF is refused after Store.create has
         returned a local row, the file was uploaded and registered against an
         id that exists nowhere. Measured: 15 out of 15. Offline we do not ask —
         the upload fails honestly anyway and takes its own path. */
      var parentMissing = false;
      if (!wasOffline && file) {
        var p = null;
        try {
          if (batch && batch.parent && batch.recordId === recordId) p = await batch.parent;
          else {
            p = await confirmParent(tableOf(moduleId), recordId);
            if (batch && !batch.parent) { batch.recordId = recordId; batch.parent = Promise.resolve(p); }
          }
        } catch (ep) { p = { known: false }; }
        if (p && p.known && !p.exists) parentMissing = true;
      }

      /* حارس التكرار — سؤالٌ للخادم، لا ذاكرة. قِسنا أنّ الرفع مرّتين
         يصنع صفّين لأنّ المسارين لا يتصادمان.
         The duplicate guard asks the SERVER, never the cache. Measured: two
         uploads make two rows because the two paths never collide. */
      var already = null;
      try {
        if (!parentMissing && file && typeof Attachments.list === 'function') {
          var existing = await Attachments.list(moduleId, recordId);
          if (Array.isArray(existing)) {
            for (var i = 0; i < existing.length; i++) {
              var e = existing[i];
              if (e && !e.deleted && e.fileName === file.name && Number(e.size) === Number(file.size)) { already = e; break; }
            }
          }
        }
      } catch (e1) { already = null; /* تعذّر السؤال ⇒ نرفع كالمعتاد، لا نمنع · cannot ask ⇒ upload as usual, never block */ }

      var r;
      if (parentMissing) {
        r = { ok: false, __parentMissing: true, error: L({
          ar: 'لم نجد السجل على الخادم بعد الحفظ.',
          en: 'The record could not be found on the server after saving.' }) };
      } else if (already) {
        r = { ok: true, record: already, __already: true };
      } else {
        try { r = await inner.apply(Attachments, arguments); }
        catch (err) { r = { ok: false, error: (err && err.message) || 'upload-threw' }; }
      }

      try {
        if (batch && file) {
          batch.results.push({
            name: file.name,
            ok: !!(r && r.ok),
            error: (r && r.error) || null,
            wasOffline: wasOffline,
            already: !!(r && r.__already),
            parentMissing: !!(r && r.__parentMissing)
          });
        }
      } catch (e2) {}
      return r;

      } finally { inflight = Math.max(0, inflight - 1); if (batch) touch(); }
    };
    return true;
  }

  /* ── ٣ · الجملة الصادقة · the truthful sentence ─────────────────────── */
  function sentence(b) {
    b = b || batch;
    var chosen = b.chosen || [];
    var results = b.results || [];

    var refusedInPanel = chosen.filter(function (c) { return c.error; });
    var uploaded = results.filter(function (r) { return r.ok && !r.already; });
    var alreadyThere = results.filter(function (r) { return r.already; });
    var parentMissing = results.filter(function (r) { return r.parentMissing; });
    var failedOnline = results.filter(function (r) { return !r.ok && !r.wasOffline && !r.parentMissing; });
    var failedOffline = results.filter(function (r) { return !r.ok && r.wasOffline; });

    var name = function (x) { return x.name; };
    var parts = [];

    var somethingWrong = !!(refusedInPanel.length || failedOnline.length || failedOffline.length || parentMissing.length);

    /* 🔴 حفظُ السجلّ يُقال صراحةً **حين يفشل ملفّ** — لأنّ الحدثين مختلفان
       وخلطهما هو ما جعل «حُفظ السجل» تبدو كأنّها تغطّي الملفّ أيضاً.
       أمّا حين ينجح كلّ شيء فلا نضيف سطراً: مسار المسودة يقول «حُفظت
       كمسودة» بالفعل، وقِسنا ثلاث رسائل على الشاشة معاً — وتكرارُ البشارة
       ضجيجٌ يعلّم الموظّف تجاهل الرسائل، وهو ما يجعل التحذير الحقيقي يضيع.
       🔴 The record save is stated EXPLICITLY only WHEN A FILE FAILED —
       the two events are different and running them together is what made
       "record saved" read as if it covered the file too. When everything
       worked we add no such line: the draft path already says «حُفظت
       كمسودة», and three toasts were measured on screen at once. Repeating
       good news is noise, and noise is what teaches staff to ignore the one
       message that matters. */
    /* v2 · 🔴 «✅ حُفظ السجل» تُقال فقط إن **رآه الخادم** — لا لأنّ Store.create
       أعاد صفّاً (فهي تُعيده قبل أن يردّ الخادم). وعند سجلٍّ مفقود لا تُقال أبداً.
       v2 · 🔴 «Record saved» is said only when the SERVER has seen it — never
       because Store.create returned a row (it does so before the server
       answers). Beside a missing record it is never said at all. */
    if (somethingWrong && !parentMissing.length && b.parentConfirmed === true) {
      parts.push(L({ ar: '✅ حُفظ السجل.', en: '✅ Record saved.' }));
    }
    parentMissing.forEach(function (f) {
      parts.push(L({
        ar: '⛔ لم يُرفَق «' + f.name + '»: لم نجد السجل على الخادم بعد الحفظ — غالباً رُفض حفظه — ولا يُرفَق ' +
            'ملفٌّ بسجلٍّ غير موجود، ولن يُعاد الرفع تلقائياً. تأكّد أولاً أنّ السجل محفوظ، ثمّ اختر الملف مرّة أخرى.',
        en: '⛔ «' + f.name + '» was NOT attached: the record could not be found on the server after saving — most ' +
            'likely its save was refused — and a file is never attached to a record that does not exist; this will ' +
            'NOT retry by itself. First make sure the record is saved, then choose the file again.'
      }));
    });

    if (uploaded.length) {
      parts.push(L({
        ar: '📎 أُرفِق ' + uploaded.length + ' ملف: ' + uploaded.map(name).join('، ') + '.',
        en: '📎 ' + uploaded.length + ' file(s) attached: ' + uploaded.map(name).join(', ') + '.'
      }));
    }

    if (alreadyThere.length) {
      parts.push(L({
        ar: 'ℹ️ ' + alreadyThere.map(name).join('، ') + ' مرفق بهذا السجل من قبل — لم يُرفَع مرّة ثانية.',
        en: 'ℹ️ ' + alreadyThere.map(name).join(', ') + ' was already attached to this record — it was not uploaded twice.'
      }));
    }

    /* الملفّات التي رفضتها اللوحة قبل الرفع — سببُ كلّ واحد معروف ومكتوب.
       Files the panel refused before any upload — each reason is known and
       is named. This is the half that used to disappear entirely. */
    refusedInPanel.forEach(function (c) {
      parts.push(L({
        ar: '⛔ لم يُرفَع «' + c.name + '»: ' + c.error + ' عالِج السبب واختر الملف من جديد بعد فتح السجل.',
        en: '⛔ «' + c.name + '» was NOT uploaded: ' + c.error + ' Fix that, then open the record and choose the file again.'
      }));
    });

    /* 🔴 رفضٌ والاتصال يعمل: لا وعدَ بإعادة اتصال إطلاقاً. عودةُ الاتصال لا
       تُصلح صلاحيةً ولا قاعدةَ تحقّق.
       🔴 Refused while connected: never a reconnection promise. Reconnecting
       repairs neither a permission nor a validation rule. */
    failedOnline.forEach(function (f) {
      parts.push(L({
        ar: '⛔ رفض الخادم رفع «' + f.name + '»: ' + (f.error || 'سبب غير معروف') +
            ' الاتصال يعمل، فلن يُعاد الرفع تلقائياً — افتح السجل واختر الملف مرّة أخرى.',
        en: '⛔ The server refused to upload «' + f.name + '»: ' + (f.error || 'reason not known') +
            ' The connection is working, so this will NOT retry by itself — open the record and choose the file again.'
      }));
    });

    /* فشلٌ والجهاز غير متّصل فعلاً: نَعِد بما نستطيع الوفاء به وحده — ما
       دامت الصفحة مفتوحة — ونقول الحدّ في الجملة نفسها.
       Genuinely offline: promise only what can be kept — while this page
       stays open — and state the limit in the same breath. */
    failedOffline.forEach(function (f) {
      parts.push(L({
        ar: '⚠️ لم يُرفَع «' + f.name + '» لأن الجهاز غير متّصل. سيُرفَع تلقائياً عند عودة الاتصال ' +
            '**ما دامت هذه الصفحة مفتوحة**؛ لو أغلقتها أو حدّثتها فاختر الملف من جديد.',
        en: '⚠️ «' + f.name + '» was not uploaded because the device is offline. It will upload by itself ' +
            'when the connection returns **only while this page stays open**; if you close or reload it, choose the file again.'
      }));
    });

    return {
      text: parts.join(' '),
      kind: somethingWrong ? 'error' : 'success',
      /* 🔴 ١٢ ثانية لا ١٤ — وهذا تراجعٌ صنعتُه أنا ثمّ قِسته وأزلته.
         الرسالة ترتسم في الركن الذي يقع فيه زرّ «حفظ» في شريط أزرار النموذج،
         ولا تُغلَق بالنقر عليها. قِيس على الشاشة: رسالة الرفض تغطّي «حفظ»
         و«مسودة» و«مسودة حتى الاتصال» فلا يستجيب أيٌّ منها طوال بقائها. هذا
         سابقٌ لنا — الرسالة الأصلية الكاذبة غطّت الأزرار الثلاثة نفسها ١٢
         ثانية — لكنّ ١٤ كانت تطيل الحجب ثانيتين. ١٢ هي مدّة البوابة نفسها
         للتحذيرات الطويلة (attach-before-save.js:385، delete-honesty.js:98)،
         فلا نزيد الحجب ولا نخترع مدّةً ثالثة. أمّا موضع الرسائل فوق الأزرار
         فهو تخطيط البوابة كلّها، وليس لنا أن نغيّره هنا.
         🔴 12 seconds, not 14 — a regression I introduced, then measured and
         removed. The message is drawn in the corner where the form's «حفظ»
         button sits and cannot be clicked away. Measured on screen: a refusal
         message covers «حفظ», «مسودة» and «مسودة حتى الاتصال», none of which
         respond while it shows. That predates us — the original false message
         covered the same three buttons for 12 s — but 14 s extended the block
         by two seconds. 12 s is the portal's own duration for long warnings
         (attach-before-save.js:385, delete-honesty.js:98), so the block is not
         lengthened and no third duration is invented. Where messages sit
         relative to the buttons is the whole portal's layout and not ours to
         change here. */
      ms: somethingWrong ? 12000 : 5000,
      nonRetryable: failedOnline.map(name).concat(parentMissing.map(name))
    };
  }

  /* ── ٤ · تصريف الطابور من كلّ ما لا تُصلحه عودةُ الاتصال ──────────────
     4 · Drain from the queue everything reconnecting cannot repair, so no
     phantom retry can fire later and no duplicate can be born from one. */
  function drainNonRetryable(names) {
    if (!names || !names.length) return;
    if (!global.AttachBeforeSave || typeof AttachBeforeSave.flushPending !== 'function') return;
    try {
      var still = AttachBeforeSave.__pending ? AttachBeforeSave.__pending() : [];
      var anyRetryable = still.some(function (p) { return names.indexOf(p.name) === -1; });
      /* 🔴 لا نصرّف إن كان في الطابور ملفٌّ **يستحقّ** إعادة المحاولة —
         تصريفُ الطابور كلّه لأجل واحدٍ فاسد يُضيّع عمل الآخر.
         🔴 Do not drain if the queue also holds a file that genuinely
         DESERVES a retry — draining all of it for one bad entry would throw
         away the other person's work. */
      if (anyRetryable) return;
      draining = true;
      Promise.resolve(AttachBeforeSave.flushPending()).then(function () { draining = false; },
                                                            function () { draining = false; });
    } catch (e) { draining = false; }
  }

  /* ── ٥ · UI.toast — نستبدل الجملة، ولا نضيف جملةً ثانية ──────────────
     5 · UI.toast — REPLACE the sentence; never add a second one. One action
     must leave exactly one message on the screen. */
  function wrapToast() {
    if (!global.UI || typeof UI.toast !== 'function') return false;
    if (UI.__azAttachOutcomeTruth) return true;
    UI.__azAttachOutcomeTruth = true;

    var inner = UI.toast;
    UI.__azAttachOutcomeTruthInner = inner;   /* لنكتب رسالتنا من تحت اللافّة · to write ours beneath the wrapper */
    UI.toast = function (msg, kind, ms) {
      try {
        /* رسالة نجاح التصريف لا تُعرض — لم يُرفَع شيء، إنّما نُظّف الطابور.
           The drain's own success line is never shown — nothing uploaded,
           the queue was merely cleaned. */
        if (draining && hasAny(msg, FLUSH_FRAGMENTS)) return;

        if (batch && !batch.spoken && isBatchMessage(msg)) {
          /* v2: نكتم الجملة القديمة الآن، وننتظر جواب الخادم عن السجل ثمّ نقول
             الحقيقة مرّة واحدة. الرفعُ نفسه انتظر الجوابَ نفسه، فالانتظار هنا
             لحظيّ في الواقع.  v2: swallow the old sentence now, wait for the
             server's answer about the record, then say the truth once. The
             uploads already awaited the same answer, so this wait is near-instant. */
          var b = batch;
          b.spoken = true;
          closeBatch();
          Promise.resolve(b.parent).then(function (pp) {
            b.parentConfirmed = !!(pp && pp.known && pp.exists);
            var s = sentence(b);
            inner.call(UI, s.text, s.kind, s.ms);
            drainNonRetryable(s.nonRetryable);
          }, function () {
            var s = sentence(b);
            inner.call(UI, s.text, s.kind, s.ms);
            drainNonRetryable(s.nonRetryable);
          });
          return;
        }
      } catch (e) {
        try { console.error('[attach-outcome-truth]', e); } catch (e2) {}
      }
      return inner.apply(UI, arguments);
    };
    return true;
  }

  /* ── v2 · 🔴 مسودةٌ دون اتصال تُغلق النموذج وتُسقط الملفّ في صمت ─────────
     قِيس بالزرّين الحقيقيّين: دون اتصال، «مسودة حتى الاتصال» تحفظ المسودة على
     الجهاز وتغلق النموذج، فيمسح attach-before-save.js الملفّاتِ الممسوكة
     (مراقب الإغلاق — لم يحدث تسليم). والبوابة تقول بصدقٍ عن **السجل**:
     «تم حفظ المسودة على هذا الجهاز وستُزامن عند عودة الاتصال» و«حُفظ على هذا
     الجهاز مشفّراً. سيُرفع تلقائياً…» — فيفهم الموظّف أنّ الرسمة ستُرفع أيضاً.
     **لن تُرفع؛ لقد اختفت.** ولا تُخزَّن بايتات الملفّات على الجهاز (سؤال
     السرّية مفتوح)، فالصادق أن نسمّي الملفّ ونطلب اختياره من جديد.
     نتكلّم فقط حين أُغلق النموذج بعد زرّ حفظٍ من شريط أزراره (لا «إلغاء»
     ولا «إغلاق» ولا ×)، والملفّات كانت ممسوكة لحظة الضغط، ولم تُفتح دفعةُ رفعٍ
     بعدها. الإلغاء يبقى صامتاً — اللوحة حذّرت منه مسبقاً.
     ── v2 · 🔴 An offline draft closes the form and drops the file in silence.
     Measured through the two real buttons: offline, «مسودة حتى الاتصال» saves
     the draft on the device and closes the form, and attach-before-save.js
     clears the held files (its close-watch — no handoff happened). The portal
     says, truthfully of the RECORD, "draft saved on this device, will sync"
     and "saved encrypted on this device, will upload automatically…" — so a
     person understands the drawing will upload too. IT WILL NOT; it is gone.
     File bytes are not stored on the device (the confidentiality question is
     open), so the honest answer is to name the file and ask for it again.
     We speak only when the form closed after a SAVE-type footer button (not
     «إلغاء», «إغلاق» or ×), files were held at the moment of the click, and
     no upload batch opened after it. A cancel stays silent — the panel warns
     about that beforehand. */
  var CANCEL_LABELS = ['إلغاء', 'Cancel', 'إغلاق', 'Close', '×', '✕'];
  var footClick = null;   /* { label, at, files[] } */

  function installDraftCloseWatch() {
    if (!global.document || document.__azAttachDraftClose) return !!(global.document && document.__azAttachDraftClose);
    var host = document.getElementById('modalHost');
    if (!host || !global.MutationObserver) return false;
    document.__azAttachDraftClose = true;
    document.addEventListener('click', function (e) {
      try {
        var btn = e.target && e.target.closest && e.target.closest('#modalHost .modal-foot button');
        if (!btn || !global.AttachBeforeSave || !AttachBeforeSave.__held) return;
        var files = AttachBeforeSave.__held().filter(function (h) { return !h.error; }).map(function (h) { return h.name; });
        footClick = files.length ? { label: (btn.textContent || '').trim(), at: Date.now(), files: files } : null;
      } catch (e1) {}
    }, true);
    new MutationObserver(function () {
      if (host.hidden !== true || !footClick) return;
      var fc = footClick; footClick = null;
      if (Date.now() - fc.at > 5000) return;
      if (CANCEL_LABELS.some(function (c) { return fc.label.indexOf(c) !== -1; })) return;
      /* بعد نبضة: يكون مراقبُ attach-before-save قد مسح، وأيّ تسليمٍ قد فتح دفعة
         after a tick: attach-before-save's watcher has cleared, and any handoff
         has already opened a batch */
      var ch = new MessageChannel();
      ch.port1.onmessage = function () {
        try {
          if (lastBatchAt >= fc.at) return;                         /* handed over — the batch speaks */
          if (AttachBeforeSave.__held().length) return;             /* still held — nothing lost */
          if (AttachBeforeSave.__handoff && AttachBeforeSave.__handoff() > 0) return;
          var names = fc.files.join(isAr() ? '، ' : ', ');
          var inner0 = UI.__azAttachOutcomeTruthInner || UI.toast;
          inner0.call(UI, L({
            ar: '⚠️ لم يُحفَظ الملفّ «' + names + '» مع هذه المسودة — المسودة المحفوظة على الجهاز لا تحمل الملفّات، ' +
                'ولن يُرفَع تلقائياً. بعد عودة الاتصال وحفظ السجل، افتحه واختر الملف مرّة أخرى.',
            en: '⚠️ The file «' + names + '» was NOT kept with this draft — a draft saved on this device does not carry ' +
                'files, and it will NOT upload by itself. Once the connection returns and the record is saved, open it and choose the file again.'
          }), 'warn', 12000);
        } catch (e2) {}
      };
      ch.port2.postMessage(0);
    }).observe(host, { attributes: true, attributeFilter: ['hidden'], subtree: false });
    return true;
  }

  function install() {
    installDraftCloseWatch();
    var a = wrapStoreCreate(), b = wrapAttachmentsUpload(), c = wrapToast();
    if (!a || !b || !c) {
      /* حارسٌ يتخطّى في صمت أسوأ من خطأ يصرخ — قاعدة مسجَّلة في هذا المشروع.
         A guard that skips in silence is worse than an error that shouts. */
      try {
        console.warn('[attach-outcome-truth] not fully installed — Store.create:' + a +
                     ' Attachments.upload:' + b + ' UI.toast:' + c);
      } catch (e) {}
    }
    return a && b && c;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
  /* شبكةُ أمان للترتيب: attachments.js قد يُحمَّل بعدنا · an ordering safety
     net, the same 1500ms attachments.js itself uses */
  setTimeout(install, 1500);

  global.AttachOutcomeTruth = {
    __install: install,
    __batch: function () { return batch; },
    /* للفحوص وحدها — لا يستعملها شيء في البوابة · trials only, nothing in the portal uses these */
    __setStaleMs: function (ms) { STALE_MS = ms; if (batch) touch(); return STALE_MS; },
    __setInflightGuard: function (on) { inflightGuard = !!on; return inflightGuard; },
    __inflight: function () { return inflight; },
    __sentence: function () { return batch ? sentence() : null; },
    __fragments: function () { return { lie: LIE_FRAGMENTS, done: DONE_FRAGMENTS, flush: FLUSH_FRAGMENTS }; },
    __isBatchMessage: isBatchMessage
  };

  console.info('attach-outcome-truth.js ready — one truthful message per save, with the file outcome named.');
})(window);
