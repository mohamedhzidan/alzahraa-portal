/* =========================================================================
   delete-outcome-truth.js — رسالة واحدة عن الحذف، تُقال بعد أن تُعرف النتيجة
   delete-outcome-truth.js — ONE delete message, spoken after the outcome is
                             known instead of before it

   v2.0.34 · نسخة الرفع بعد المراجعة · release copy, after review.

   ── سجلّ النسخ · VERSION LOG ────────────────────────────────────────────
   v1 · ٩ سبتمبر — زرّ 🗑 في القائمة (Store.destroy) وحده.
   v2 · ١٠ سبتمبر — أُضيف ما فات v1، وكلّه مقيسٌ بزرٍّ حقيقي وحسابٍ مخوَّل:
        ١) زرّ «⊘ إلغاء المستند» — كان يقول «أُلغي المستند وسُجّل باسمك» والخادم
           لم يُلغِ شيئاً وضاع السبب المكتوب.
        ٢) زرّ «↩ استعادة المستند» — الشكل نفسه في الاتجاه المعاكس.
        ٣) السبب الحقيقي من حالة المستند («بانتظار المراجعة»، «تمت المراجعة»…)
           بدل «لو كان يجب أن تملك الصلاحية» الذي كان يخطئ التشخيص.
   v1 · 9 Sept — the list 🗑 button (Store.destroy) only.
   v2 · 10 Sept — adds what v1 missed, each measured through a real button by
        an authorized account: (1) «⊘ Cancel document» said "cancelled and
        recorded against your name" while the server cancelled nothing and the
        typed reason was lost; (2) «↩ Restore document», the same shape in
        reverse; (3) the real reason from the document's status instead of
        v1's "if you should have this permission", which misdiagnosed it.

   ── ما يراه الموظّف اليوم، مقيساً بالمللي ثانية ─────────────────────────
   يضغط «حذف» على سجلٍّ لا يملك الخادمُ أن يسمح بحذفه:

     t+1ms   «تم الحذف»                                        ← نجاح
     t+69ms  «⛔ لم يُحذف — الرسالة السابقة غير صحيحة. الصفّ ما زال
              موجوداً، وغالباً السبب أن الجهاز غير متّصل بالإنترنت.»

   رسالتان لفعلٍ واحد: بشارةٌ ثمّ تكذيبها. **والتكذيبُ نفسه يخطئ التشخيص** —
   قِسنا الحالة والجهازُ **متّصل**؛ السببُ الحقيقي أنّ الصفّ خارج نطاق هذا
   الحساب. فالموظّف يقرأ كذبةً ثمّ تصحيحاً خاطئاً، ويستنتج أنّ الإنترنت عنده
   ضعيف فيعيد المحاولة إلى الأبد.

   ── السبب ───────────────────────────────────────────────────────────────
   pages/entity.js:302-304 يفعل هذا بالترتيب:
       Store.destroy(mod.table, id);
       UI.toast(t('g.deleted'));      ← تُقال **قبل** أن تُعرف النتيجة
       render(...);
   والقيمة المُعادة تُرمى. وdelete-honesty.js:90 يلحق بتصحيحٍ مؤجَّل ٦٠ مللي —
   وهو علاجٌ صحيح لمشكلةٍ صحيحة، لكنّه يترك **رسالتين**، وكان مطلوباً منه
   ذلك لأنّه لا يستطيع منع الرسالة الأولى.

   ── ما يفعله هذا الملفّ، ولماذا يستطيع ما لم يستطعه سابقُه ──────────────
   يلفّ `Store.destroy` **و**`UI.toast` معاً. فحين يعود الحذف مرفوضاً نفتح
   نافذةً قصيرة نبتلع فيها:
     ١) «تم الحذف» — قبل أن تُرسم أصلاً، فلا يقرؤها أحد
     ٢) تصحيحَ delete-honesty.js — لأنّنا نقول الحقيقة مرّة واحدة بدلاً منه
   ثمّ نكتب **جملةً واحدة** بالسبب الحقيقي.

   🔴 المَغرز مُثبَت بالاستعمال لا مفترَض: audit-trail.js:258 وdelete-honesty.js:78
   يلفّان `Store.destroy` بالفعل، وقِسنا أنّ لافّة `UI.toast` تعترض رسائل
   تُكتَب من داخل إغلاقات ملفّات أخرى.

   ── السبب الحقيقي: نسأل، لا نخمّن ───────────────────────────────────────
   `cancelRecord` (audit-trail.js:188) يُعيد false في حالتين متمايزتين:
   الصفُّ غير موجود عند هذا الحساب (`!row`)، أو الحفظُ رُفض (`!saved`).
   فنميّز بينهما بسؤالين رخيصين — هل الجهاز متّصل؟ وهل يرى هذا الحسابُ
   الصفَّ أصلاً؟ — بدل جملة «وغالباً السبب…» التي أخطأت في القياس.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   WHAT STAFF SEE TODAY, measured in milliseconds: pressing delete on a
   record the server will not let them touch gives «تم الحذف» (Deleted) at
   t+1ms and a retraction at t+69ms. Two messages for one action — and THE
   RETRACTION ITSELF MISDIAGNOSES: it blames the connection while the device
   was online; the real reason is that the row is outside this account's
   reach. The person reads a lie, then a wrong correction, concludes their
   internet is weak, and retries forever.

   THE CAUSE: pages/entity.js:302-304 toasts «تم الحذف» BEFORE the outcome is
   known and throws the return value away. delete-honesty.js:90 follows with
   a 60ms deferred correction — a correct cure for a real problem, but it
   leaves TWO messages, because it cannot prevent the first one.

   WHAT THIS FILE DOES: it wraps Store.destroy AND UI.toast together, so on a
   refusal it swallows (1) «تم الحذف» before it is ever painted and (2)
   delete-honesty's correction, and writes ONE sentence carrying the true
   reason. The seam is proven by use, not assumed: audit-trail.js:258 and
   delete-honesty.js:78 already wrap Store.destroy, and a UI.toast wrapper
   was measured intercepting messages written from inside other closures.

   THE TRUE REASON IS ASKED FOR, NOT GUESSED: cancelRecord returns false
   either because the row is not available to this account or because the
   save was refused. Two cheap questions separate them.

   احذف هذا الملف من loader.js فيعود السلوك السابق حرفياً (رسالتان).
   Deleting this file from loader.js restores the previous behaviour exactly
   (both messages return).
   ========================================================================= */

(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* نصّ «تم الحذف» كما يكتبه i18n.js:38 و:164، ونسأل I18N نفسها أوّلاً حتى
     لا نحمل نسخةً ثانية من سلسلةٍ تتباعد عن أصلها.
     The «Deleted» text as i18n.js:38/:164 writes it. We ask I18N itself
     first so we do not carry a second copy of a string that would drift. */
  function deletedTexts() {
    var out = ['تم الحذف', 'Deleted'];
    try {
      if (global.I18N && I18N.t) {
        var t = String(I18N.t('g.deleted') || '');
        if (t && out.indexOf(t) === -1) out.push(t);
      }
    } catch (e) {}
    return out;
  }

  /* الشظيّة المميّزة لتصحيح delete-honesty.js:94-97 — منقولة من المصدر.
     The distinctive fragment of delete-honesty.js's correction at :94-97. */
  var CORRECTION_FRAGMENTS = ['الرسالة السابقة غير صحيحة', 'the previous message was wrong'];

  function hasAny(s, list) {
    s = String(s == null ? '' : s);
    for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) !== -1) return true;
    return false;
  }
  function isExactly(s, list) {
    s = String(s == null ? '' : s).trim();
    for (var i = 0; i < list.length; i++) if (s === list[i]) return true;
    return false;
  }

  /* نافذة الكبح: تُفتَح لحظةَ رفضِ الحذف وتُغلق بعد أن يمرّ تصحيح
     delete-honesty (٦٠ مللي) بهامش.
     The suppression window: opened the moment a delete comes back refused,
     closed after delete-honesty's 60ms correction has gone by, with margin. */
  var win = null;

  function trueReason(table, id) {
    var offline = (global.navigator && navigator.onLine === false);
    if (offline) {
      return L({
        ar: 'الجهاز غير متّصل بالإنترنت، والحذف يحتاج اتصالاً. الصفّ ما زال موجوداً — أعد المحاولة بعد عودة الاتصال.',
        en: 'The device is not connected, and deleting needs a connection. The row is still there — try again once the connection returns.'
      });
    }
    var visible = null;
    try { visible = global.Store && Store.find ? Store.find(table, id) : null; } catch (e) {}
    if (!visible) {
      return L({
        ar: 'هذا السجل غير متاح لحسابك — قد يكون تابعاً لموقع آخر أو أُزيل بالفعل. لم يتغيّر شيء.',
        en: 'This record is not available to your account — it may belong to another site or have been removed already. Nothing changed.'
      });
    }
    return L({
      ar: 'رفض الخادم الحذف. الصفّ ما زال موجوداً كما هو. لو كان يجب أن تملك هذه الصلاحية فأبلغ المسؤول — إعادة المحاولة وحدها لن تغيّر شيئاً.',
      en: 'The server refused the delete. The row is exactly as it was. If you should have this permission, report it — retrying alone will not change anything.'
    });
  }

  /* ── v2 · 🔴 السبب الحقيقي في أغلب الحالات ليس «صلاحية» بل «حالة المستند» ──
     قِيس صباح ١٠ سبتمبر بتشغيل التحديث نفسه كأمين مخزن على إذنَي استلام من
     موقعه، واحدٌ «بانتظار المراجعة» والآخر «تمت المراجعة». جواب الخادم للاثنين:
         P0001 · Submitted, approved and reversed documents are immutable
     والقاعدة في مصدرها لا في ملاحظة: 03-PRODUCTION-HARDENING.sql:449-450
     و:475-476 — مستند سير العمل لا يُلغى إلّا وهو «مسودة» أو «معاد للتعديل».
     ومسار «الإعادة للتعديل» موجودٌ فعلاً (نفس الملف :739 يضع status='returned').
     فرسالة v1 «لو كان يجب أن تملك هذه الصلاحية فأبلغ المسؤول» كانت **تخطئ
     التشخيص** — وهو بالضبط العيب الذي أخذته على تصحيح delete-honesty. أمين
     المخزن يملك الصلاحية؛ المستند هو الذي تجاوز مرحلة الإلغاء.
     ── v2 · 🔴 The real reason is usually not "permission" but "the document's
     status". Measured on 10 Sept by running the same update as a storekeeper
     on two receipts from its own site, one «بانتظار المراجعة», one «تمت
     المراجعة». The server answered both: P0001 · Submitted, approved and
     reversed documents are immutable. The rule, from its source and not a
     note: 03-PRODUCTION-HARDENING.sql:449-450 and :475-476 — a workflow
     document can be cancelled only while it is «مسودة» or «معاد للتعديل»; the
     "return for editing" step really exists (:739 sets status='returned').
     v1's «if you should have this permission, report it» MISDIAGNOSED it —
     exactly the fault I held against delete-honesty's correction. The
     storekeeper HAS the permission; the document is past cancelling. */
  var CANCELLABLE = ['draft', 'returned'];

  function moduleForTable(table) {
    try {
      var list = (global.Schema && (Schema.MODULES || (Schema.list && Schema.list()))) || [];
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].table === table) return list[i];
    } catch (e) {}
    return null;
  }

  /* يُعيد جملة السبب إن كان المستند مقفلاً بحالته، أو null إن لم يكن.
     Returns the reason sentence if the document is locked by its status, or
     null when it is not (so the caller keeps its other diagnosis). */
  function lockedReason(table, status) {
    var mod = moduleForTable(table);
    if (!mod || !mod.workflow || !status || CANCELLABLE.indexOf(status) !== -1) return null;
    var label = (global.Workflow && Workflow.label) ? Workflow.label(status) : status;
    var canBeReturned = (status === 'pending' || status === 'reviewed');
    return L({
      ar: 'حالة المستند الآن «' + label + '»، والنظام لا يسمح بإلغاء مستندٍ بعد تقديمه — يُلغى فقط وهو ' +
          '«مسودة» أو «معاد للتعديل». المستند باقٍ كما هو ولم يتغيّر شيء.' +
          (canBeReturned ? ' لو قُدِّم بالخطأ فاطلب ممّن يراجعه أن يعيده للتعديل، وبعدها يمكن إلغاؤه.' : ''),
      en: 'The document is now «' + label + '», and the system does not allow cancelling a document once it has been ' +
          'submitted — only while it is a draft or returned for editing. It is unchanged.' +
          (canBeReturned ? ' If it was submitted by mistake, ask whoever reviews it to return it for editing; then it can be cancelled.' : '')
    });
  }

  /* ── v3 · ١١ سبتمبر — حارس المستند المُرسَل (r4) يتكلّم قبلنا، فنصمت ──────────
     مرشّح الصلاحيات r4 يضيف sent-document-cancel-guard.js: يلفّ Store.save **من الخارج** (يُحمَّل بعد
     save-project-fence.js، أي بعدنا) ويرفض إلغاء مستندٍ حالته المحلّية ليست «مسودة» ولا «معاد للتعديل» قبل
     أيّ حفظ، ويقول سببه بنفسه. على طريق سلّة المهملات (Store.destroy ← cancelRecord ← Store.save) يعود
     الرفض إلينا كـ ok === false — وكنّا سنقول جملتنا فوق جملته: رسالتان صادقتان متكدّستان. الآن: إن كان
     الحارس محمَّلاً والحالة المحلّية مقفلة بحالتها — أي بالضبط شرط رفضه هو — نصمت، ونُبقي كبح «تم الحذف»
     كما هو. وإن كانت النسخة المحلّية قديمة (تقول «مسودة» والخادم يقول «بانتظار المراجعة») فالحارس أعمى
     ونحن من يمسك الرفض بعد سؤال الخادم — قِيس بالحقن في _trials/cancel-guard-interplay-trial.js.
     ── v3 · 11 Sept — r4's sent-document guard speaks first, so we stay silent. The permissions candidate
     r4 adds sent-document-cancel-guard.js: it wraps Store.save OUTERMOST (loaded after save-project-fence.js,
     i.e. after us) and refuses to cancel a document whose LOCAL status is neither draft nor returned, before
     any save, with its own reason. On the trash-can path (Store.destroy → cancelRecord → Store.save) that
     refusal reaches us as ok === false — and we would have spoken on top of it: two stacked truthful toasts.
     Now: if the guard is loaded and the local status is locked by status — exactly its own refusal rule — we
     say nothing and keep swallowing «تم الحذف». If the local copy is STALE (says draft while the server says
     pending) the guard is blind and WE catch the refusal after asking the server — proven by injection in
     _trials/cancel-guard-interplay-trial.js. */
  /* 🔴 نسأل الحارس نفسه (refused المُصدَّرة) ولا نقلّد قاعدته: أوّل نسخة قلّدتها بـ lockedReason، فاختلفت عنه في
     حالتين (workflow:1 بدل true، وغياب Schema.MODULES) — وكلّ اختلاف صمتٌ في غير محلّه (صائد الأخطاء، الجولة ٣، E/E2:
     المرآة اختلفت في ٢ من ١٠ حالات؛ نداءُ الحارس نفسه: ٠). إن غاب الحارس أو تصديره تكلّمنا نحن — رسالة زائدة خيرٌ من صمت.
     🔴 Ask the guard ITSELF (its exported refused()) instead of mirroring its rule: the first version mirrored it with
     lockedReason and disagreed in two cases (workflow:1 instead of true; Schema.MODULES absent) — every disagreement
     is a silence in the wrong place (bug-reporter round 3, E/E2: the mirror differed in 2 of 10 cases; calling the
     guard's own function: 0). If the guard or its export is absent WE speak — a spare message beats a silence. */
  function guardSpoke(table, id) {
    try {
      if (!(global.Store && Store.__sentDocumentCancelGuard)) return false;
      var g = global.SentDocumentCancelGuard;
      if (!g || typeof g.refused !== 'function') return false;
      return g.refused(table, id, { deleted: true }) === true;
    } catch (e) { return false; }
  }

  /* ── 🔴 العطل الأخطر، ولم يظهر إلّا بتشغيل التجربة بدورٍ ثانٍ ──────────
     `Store.destroy` تعيد **true** بينما الخادم لم يحذف شيئاً.

     المقياس، بحساب مشتريات على سجلٍّ في موقع آخر:
       Store.destroy(...)            → true
       نسخة المتصفّح بعدها           → deleted: true   (فيختفي الصفّ من القائمة)
       الخادم بعدها                  → deleted: false, deletedBy: null

     أي أنّ الموظّف يقرأ «تم الحذف»، ويرى الصفّ يختفي أمامه، **ولم يُحذف
     شيء**. ويعود الصفّ عند أوّل تحديث للصفحة. والسبب معروفٌ في هذا المشروع
     ومكتوبٌ في قواعده: `Store.save` تعود **قبل** أن يردّ الخادم، فشرط
     `if (!saved) return false` في audit-trail.js:200 لا يقع أصلاً.

     🔴 وdelete-honesty.js **لا يمسك هذه الحالة**، لأنّه يستيقظ على
     `ok === false` وحدها: فهو يغطّي الرفضَ الذي يُبلّغ عن نفسه، ويفوته
     الرفضُ الذي يدّعي النجاح — وهو الأسوأ.

     العلاج: **لا نتكلّم حتى تُعرف النتيجة من الخادم.** نكتم «تم الحذف»
     لحظةَ صدورها، نسأل الخادم هل الصفّ محذوفٌ فعلاً، ثمّ نقول جملةً واحدة
     صادقة. تأخيرُ البشارة أجزاءَ من الثانية ثمنٌ لا يُذكر مقابل ألّا تكون
     كاذبة. وهي قاعدة المشروع نفسها: «لا تثق بـ(تم الحفظ) — أكّد بالمعرّف
     من الخادم».

     ── ENGLISH ────────────────────────────────────────────────────────────
     🔴 THE WORSE FAULT, which only appeared when the trial was run as a
     SECOND role. `Store.destroy` returns TRUE while the server deleted
     nothing. Measured, as a procurement account on a record at another site:
       Store.destroy(...)      → true
       the browser's copy      → deleted: true   (the row leaves the list)
       the SERVER              → deleted: false, deletedBy: null
     The person reads «تم الحذف», watches the row disappear, AND NOTHING WAS
     DELETED. The row returns on the next reload. The cause is already
     written in this project's own rules: Store.save returns BEFORE the
     server answers, so `if (!saved) return false` (audit-trail.js:200)
     never fires.
     🔴 delete-honesty.js DOES NOT CATCH THIS — it wakes only on
     `ok === false`, so it covers the refusal that announces itself and
     misses the refusal that claims success, which is the dangerous one.
     THE CURE: say nothing until the outcome is known. Swallow «تم الحذف» as
     it is spoken, ask the SERVER whether the row is really deleted, then say
     ONE true sentence. Delaying good news by a fraction of a second is a
     trivial price for it not being false — and it is this project's own
     rule: never trust "saved", confirm by id against the server. */
  /* 🔴 الاستقرار قبل الحكم — وهذا خطأٌ وقعتُ فيه هنا وأمسكه الفحص.
     أوّل نسخةٍ سألت الخادم **فوراً** بعد عودة Store.destroy، فقرأت
     `deleted: false` لأنّ الكتابة لم تكن قد وصلت بعد — فأعلنت «رفض الخادم
     الحذف» على حذفٍ ناجح تماماً. أي أنّها كانت ستُحوّل عطلاً إلى عطلٍ معاكس.
     ولهذا المشروع سابقةٌ مسجَّلة بالحرف: «البوّابة تحتاج استقراراً قبل أن
     تثق» — فحصان صحيحان سقطا مرّتين لهذا السبب نفسه.
     فنسأل عدّة مرّات بتباعدٍ متزايد، ونقطع عند أوّل تأكيد. ولا نحكم بالرفض
     إلّا بعد آخر محاولة.
     🔴 SETTLE BEFORE JUDGING — a mistake I made here and the trial caught.
     A first version asked the server IMMEDIATELY after Store.destroy
     returned and read `deleted: false` because the write had not landed yet
     — announcing "the server refused the delete" on a perfectly successful
     one. It would have turned one fault into its opposite. This project has
     the precedent in writing: gates need a settle before trust; two correct
     builds were failed by exactly this. So we ask several times with growing
     gaps, stop at the first confirmation, and only call it a refusal after
     the last attempt. */
  /* التباعد مقيسٌ لا مختار: الحذف الناجح يتأكّد عند أوّل عيّنة تقريباً
     (قِيس ~٢ ثانية)، والرفض يستهلك العيّنات الأربع لأنّ الصفّ لا يصير محذوفاً
     أبداً (قِيس ~٨ ثوانٍ على خادم التمرين، وأغلبها زمنُ الخادم لا انتظارُنا).
     ثمانِ ثوانٍ من الصمت ثمّ الحقيقة أفضل من كذبةٍ فورية — لكنّها ليست مجّانية:
     الصفّ يكون قد اختفى من القائمة بالفعل. فالتباعد مشدود إلى أقصى ما يبقى
     آمناً، ولا يُشدّ أكثر: عيّنةٌ مبكّرة جدّاً تقرأ كتابةً لم تصل بعد وتصرخ
     «رفض» على حذفٍ ناجح — وهو الخطأ في الاتجاه المعاكس، وقد وقعتُ فيه مرّة.
     Measured, not chosen: a successful delete confirms on roughly the first
     sample (~2s measured), while a refusal spends all four because the row
     never becomes deleted (~8s on the practice server, most of it the
     server's own time rather than our waiting). Eight seconds of silence and
     then the truth beats an instant lie — but it is not free: the row has
     already left the list. So the gaps are tightened as far as stays safe and
     no further: too early a sample reads a write that has not landed and
     shouts "refused" at a successful delete, which is the same error in the
     opposite direction, and I made it once. */
  var CONFIRM_DELAYS = [200, 400, 800, 1600];

  /* v2: `want` هو الحال التي نتوقّعها لو نجحت العملية — true للحذف والإلغاء،
     false للاستعادة — ونقرأ الحالة (status) أيضاً لنعرف السبب الحقيقي للرفض.
     v2: `want` is the state we expect if the operation succeeded — true for
     delete/cancel, false for restore — and status is read too, so a refusal
     can be explained by its real cause. */
  async function confirmOnServer(table, id, want) {
    if (want === undefined) want = true;
    var c = null;
    try { c = global.Auth && Auth.client ? Auth.client() : null; } catch (e) {}
    if (!c) return { known: false, why: 'no-client' };
    var lastWhy = null, lastStatus = null;
    for (var i = 0; i < CONFIRM_DELAYS.length; i++) {
      await new Promise(function (r) { setTimeout(r, CONFIRM_DELAYS[i]); });
      try {
        var got = await c.from(table).select('id, deleted, status').eq('id', id).maybeSingle();
        if (got.error) { lastWhy = got.error.message; continue; }
        if (!got.data) {
          /* الصفّ لم يعد يُقرأ: للحذف يعني ذهب، وللاستعادة لا يُثبت شيئاً
             the row no longer reads: for a delete that means gone; for a
             restore it proves nothing, so it is not taken as success */
          if (want === true) return { known: true, done: true, deleted: true };
          lastWhy = 'row-not-readable'; continue;
        }
        lastStatus = got.data.status || null;
        var isDeleted = got.data.deleted === true;
        if (isDeleted === want) return { known: true, done: true, deleted: isDeleted, status: lastStatus };
        lastWhy = null;                                          /* قرأنا بنجاح، ولم يتغيّر بعد · read fine, not changed yet */
      } catch (e) { lastWhy = (e && e.message) || 'threw'; }
    }
    if (lastWhy) return { known: false, why: lastWhy, status: lastStatus };
    return { known: true, done: false, deleted: !want, status: lastStatus };   /* استقرّ على «لم يتغيّر» · settled as UNCHANGED */
  }

  function wrapDestroy() {
    if (!global.Store || typeof Store.destroy !== 'function') return false;
    if (Store.__azDeleteOutcomeTruth) return true;
    Store.__azDeleteOutcomeTruth = true;

    var inner = Store.destroy;
    Store.destroy = function (table, id) {
      /* النافذة تُفتَح **قبل** النداء، لا بعده: entity.js:303 ينادي التوست
         تزامنياً بعد العودة، فلا بدّ أن نكون جاهزين لكتمه.
         The window opens BEFORE the call, not after: entity.js:303 toasts
         synchronously on return, so we must already be ready to swallow it. */
      win = { table: table, id: id, spoken: false, until: Date.now() + 800 };
      var ok;
      try { ok = inner.apply(Store, arguments); }
      catch (e) { win = null; throw e; }

      try {
        if (ok === false) {
          /* رفضٌ يُبلّغ عن نفسه: لا شيء أُرسِل، فلا حاجة لسؤال الخادم.
             A refusal that announces itself: nothing was sent, so there is
             nothing to ask the server about. */
          if (guardSpoke(table, id)) {
            /* v3: حارس r4 قالها للتوّ — نكتم «تم الحذف» ونصمت · v3: r4's guard just said it — swallow «تم الحذف», say nothing */
            win.spoken = true;
          } else {
            global.setTimeout(function () {
              if (win && !win.spoken && win.id === id) speak(table, id, trueReason(table, id));
            }, 120);
          }
        } else {
          /* ادّعاءُ نجاح: **لا نصدّقه**. نسأل الخادم ثمّ نتكلّم مرّة واحدة.
             A claimed success: DO NOT BELIEVE IT. Ask the server, then speak
             exactly once. */
          win.until = Date.now() + 12000;
          win.awaitingConfirm = true;
          confirmOnServer(table, id, true).then(function (r) {
            if (!win || win.id !== id || win.spoken) return;
            if (r.known && r.done) {
              /* صحيحةٌ فعلاً — نقول الجملة الأصلية نفسها، بعد أن صارت صادقة.
                 Genuinely true — say the ORIGINAL sentence, now that it is. */
              speak(table, id, null, deletedTexts()[0]);
            } else if (r.known && !r.done) {
              /* v2: السبب من حالة المستند على الخادم أوّلاً، ثمّ «صلاحية» فقط إن
                 لم يكن المستند مقفلاً بحالته. v2: the reason comes from the
                 document's status on the server first; "permission" only when
                 the document is not locked by its status. */
              var why = lockedReason(table, r.status) || L({
                ar: 'رفض الخادم الحذف، والسجل ما زال موجوداً عنده. لم يتغيّر شيء. لو كان يجب أن تملك هذه الصلاحية فأبلغ المسؤول.',
                en: 'The server refused the delete and still holds the record. Nothing changed. If you should have this permission, report it.'
              });
              speak(table, id, why + L({
                ar: ' سيعود السجل إلى القائمة عند تحديث الصفحة.',
                en: ' The record will come back to the list when the page reloads.'
              }));
            } else {
              speak(table, id, L({
                ar: 'تعذّر التأكد من الخادم هل حُذف السجل أم لا (' + (r.why || '—') + '). ' +
                    'حدّث الصفحة وتحقّق من القائمة قبل أن تعتبره محذوفاً.',
                en: 'Could not confirm with the server whether the record was deleted (' + (r.why || '—') + '). ' +
                    'Reload the page and check the list before treating it as deleted.'
              }), null, true);
            }
          });
        }
      } catch (e) { try { console.error('[delete-outcome-truth]', e); } catch (e2) {} }
      /* القيمة تُمرَّر كما هي — لا يتغيّر عقد الدالّة لأحد.
         Passed through untouched — nobody's contract changes. */
      return ok;
    };
    return true;
  }

  /* جملةٌ واحدة، تُقال مرّة واحدة، بعد أن تُعرف النتيجة.
     نكتب عبر النسخة التي تحت لافّتنا حتى لا تُعترَض رسالتُنا نحن.
     ONE sentence, said once, after the outcome is known. Written through the
     toast beneath our own wrapper so our message is not re-intercepted. */
  function speak(table, id, reasonText, successText, isWarn) {
    if (!win || win.spoken) return;
    win.spoken = true;
    try {
      if (!(global.UI && UI.__azDeleteOutcomeTruthInner)) return;
      if (successText) {
        UI.__azDeleteOutcomeTruthInner.call(UI, successText, 'success', 4000);
        return;
      }
      UI.__azDeleteOutcomeTruthInner.call(UI,
        L({ ar: '⛔ لم يُحذف السجل. ', en: '⛔ The record was NOT deleted. ' }) +
          (reasonText || trueReason(table, id)),
        isWarn ? 'warn' : 'error', 12000);
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     v2 · زرّا «⊘ إلغاء المستند» و«↩ استعادة المستند» — المساران اللذان فاتا v1
     ═══════════════════════════════════════════════════════════════════
     🔴 v1 غطّى مسار الحذف الأوّل وحده (زرّ 🗑 في القائمة ← Store.destroy).
     لكن في البوابة **مساران آخران** يثقان بالقيمة الكاذبة نفسها، ولم أرَهما
     ليلة ٩ سبتمبر. قِيسا صباح ١٠ سبتمبر بزرٍّ حقيقي وحسابٍ مخوَّل:

       أمين مخزن (Auth.can(goodsReceipts,'delete') = true) ← شاشة إذن استلام
       «تمت المراجعة» من موقعه ← «⊘ إلغاء المستند» ← كتب سبباً ← تأكيد:
         الشاشة: «أُلغي المستند وسُجّل باسمك في سجل المسؤولية.»
         الخادم بعد ٠٫٥ ثم ١ ثم ٢ ثم ٣ ثوانٍ: deleted=false · deletedBy=null ·
                 deleteReason=null — لم يُلغَ شيء، ولم يُسجَّل اسم، **وضاع السبب
                 الذي كتبه**.

     لماذا فاتت v1: askCancel في audit-trail.js:323 تنادي cancelRecord
     **المحلّية** مباشرةً، لا Store.destroy — فلافّتي لم تُستدعَ أصلاً. ولفّ
     AuditTrail.cancel لا يفيد (فخّ التصدير المُغلَق مرّةً أخرى). المَغرز الحيّ
     الوحيد: cancelRecord وrestoreRecord تناديان **Store.save** العامّة
     (audit-trail.js:199 و:210)، وهي تُعترَض. فنراقبها ولا نغيّر شيئاً فيها.

     🔴 v1 covered only the FIRST delete path (🗑 in the list → Store.destroy).
     The portal has TWO MORE paths trusting the same false value, and I did
     not see them on 9 Sept. Measured on 10 Sept through a real button by an
     authorized account (above). WHY v1 MISSED THEM: askCancel
     (audit-trail.js:323) calls the CLOSURE-LOCAL cancelRecord directly, never
     Store.destroy, so my wrapper was never reached; wrapping AuditTrail.cancel
     would be the closure-export decoy again. The only live seam: cancelRecord
     and restoreRecord call the GLOBAL Store.save (audit-trail.js:199, :210),
     which is interceptable. We observe it and change nothing in it. */

  /* نصّا النجاح كما يكتبهما audit-trail.js حرفياً (:327-328 و:441) — منقولان
     من المصدر لا مؤلَّفان، فلو تغيّر المصدر ظهر ذلك فحصاً فاشلاً لا صمتاً.
     The two success sentences exactly as audit-trail.js writes them
     (:327-328, :441) — copied from source, never composed. */
  var CANCEL_OK  = ['أُلغي المستند وسُجّل باسمك في سجل المسؤولية.',
                    'Cancelled, and recorded against your name in the accountability log.'];
  var RESTORE_OK = ['أُعيد المستند وسُجّل ذلك.', 'Restored, and recorded.'];

  var sw = null;   /* { kind: 'cancel'|'restore', table, id, at, spoken } */

  function wrapSave() {
    if (!global.Store || typeof Store.save !== 'function') return false;
    if (Store.__azDeleteOutcomeTruthSave) return true;
    Store.__azDeleteOutcomeTruthSave = true;
    var inner = Store.save;
    Store.save = function (table, id, patch) {
      try {
        /* المسار الأوّل يمرّ من هنا أيضاً (Store.destroy ← cancelRecord ←
           Store.save) وله نافذته الخاصّة — فلا نحسبه مرّتين.
           Path 1 passes through here too (Store.destroy → cancelRecord →
           Store.save) and already has its own window — never counted twice. */
        var path1 = win && win.id === id && Date.now() <= win.until;
        if (!path1 && patch && typeof patch === 'object') {
          if (patch.deleted === true && Object.prototype.hasOwnProperty.call(patch, 'deleteReason')) {
            sw = { kind: 'cancel', table: table, id: id, at: Date.now(), spoken: false };
          } else if (patch.deleted === false && Object.prototype.hasOwnProperty.call(patch, 'deletedAt')) {
            sw = { kind: 'restore', table: table, id: id, at: Date.now(), spoken: false };
          }
        }
      } catch (e) {}
      /* القيمة تُمرَّر كما هي · passed through untouched */
      return inner.apply(Store, arguments);
    };
    return true;
  }

  function say(state, text, kind, ms) {
    if (!state || state.spoken) return;
    state.spoken = true;
    try { if (global.UI && UI.__azDeleteOutcomeTruthInner) UI.__azDeleteOutcomeTruthInner.call(UI, text, kind, ms); } catch (e) {}
  }

  /* يُستدعى حين تصل جملة النجاح لمسار ٢ أو ٣: نكتمها ونسأل الخادم ثمّ نقول
     الحقيقة مرّة واحدة. Called when a path-2/3 success sentence arrives: it
     is swallowed, the server is asked, and the truth is said exactly once. */
  function verifyCancelOrRestore(state, originalText) {
    var want = state.kind === 'cancel';                          /* cancel ⇒ expect deleted=true */
    confirmOnServer(state.table, state.id, want).then(function (r) {
      if (r.known && r.done) { say(state, originalText, 'success', 6000); return; }
      if (r.known && !r.done) {
        if (state.kind === 'cancel') {
          say(state, L({ ar: '⛔ لم يُلغَ المستند، ولم يُسجَّل السبب الذي كتبته. ',
                         en: '⛔ The document was NOT cancelled, and the reason you typed was not recorded. ' }) +
            (lockedReason(state.table, r.status) || L({
              ar: 'رفض الخادم الإلغاء. لو كان يجب أن تملك هذه الصلاحية فأبلغ المسؤول.',
              en: 'The server refused the cancellation. If you should have this permission, report it.' })) +
            L({ ar: ' سيعود المستند إلى القائمة عند تحديث الصفحة.',
                en: ' It will come back to the list when the page reloads.' }), 'error', 12000);
        } else {
          say(state, L({
            ar: '⛔ لم يُستعَد المستند — ما زال ملغىً عند الخادم، وسيختفي من القائمة مجدّداً عند تحديث الصفحة. رفض الخادم الاستعادة.',
            en: '⛔ The document was NOT restored — the server still holds it as cancelled, and it will disappear from the list again when the page reloads. The server refused the restore.'
          }), 'error', 12000);
        }
        return;
      }
      say(state, L({
        ar: 'تعذّر التأكد من الخادم هل تمّت العملية أم لا (' + (r.why || '—') + '). حدّث الصفحة وتحقّق من القائمة.',
        en: 'Could not confirm with the server whether this went through (' + (r.why || '—') + '). Reload the page and check the list.'
      }), 'warn', 12000);
    });
  }

  function wrapToast() {
    if (!global.UI || typeof UI.toast !== 'function') return false;
    if (UI.__azDeleteOutcomeTruth) return true;
    UI.__azDeleteOutcomeTruth = true;

    var inner = UI.toast;
    UI.__azDeleteOutcomeTruthInner = inner;   /* نكتب رسالتنا من تحت اللافّة · we write ours beneath the wrapper */

    UI.toast = function (msg, kind, ms) {
      try {
        /* ١) تصحيح delete-honesty يُبتلع **دائماً** ما دام هذا الملفّ محمّلاً،
           بلا نافذةٍ زمنية إطلاقاً.
           🔴 ولماذا لا نافذة: قِستُ التصحيح مرّةً عند ٦٩ مللي ومرّةً عند
           ٥٥٤ مللي — الفارق أنّ الخيط الرئيسي كان مشغولاً بردّ الخادم
           وإعادة الرسم. فأيّ نافذةٍ زمنية تنجح في القياس الهادئ وتفشل على
           جهازٍ بطيء أو شبكةٍ ثقيلة — أي **تفشل عند الموظّف بالذات وتنجح
           عندي**. والربط الصحيح بالعملية لا بالساعة: كلا الملفّين يلفّان
           `Store.destroy` ويستيقظان على `ok === false` نفسها، ولافّتنا هي
           الخارجية، فكلّ رفضٍ يراه delete-honesty نراه نحن ونتكلّم عنه —
           فلا توجد حالةٌ نريد فيها تصحيحَه إلى جانب رسالتنا.
           1) delete-honesty's correction is ALWAYS swallowed while this file
           is loaded — no time window at all.
           🔴 WHY NO WINDOW: the correction was measured once at 69ms and
           once at 554ms; the difference was a main thread busy with the
           server reply and a re-render. Any time window therefore passes in
           a quiet measurement and fails on a slow device or a heavy network
           — that is, IT FAILS FOR STAFF AND PASSES FOR ME. The correct tie
           is to the OPERATION, not the clock: both files wrap Store.destroy
           and wake on the same `ok === false`, and our wrapper is the outer
           one, so every refusal delete-honesty sees, we see and speak about.
           There is no case where its correction is wanted beside ours. */
        if (hasAny(msg, CORRECTION_FRAGMENTS)) return;

        /* v2 · ٣) جملتا نجاح «الإلغاء» و«الاستعادة» — تُكتمان فقط إن سبقهما
           Store.save من النوع نفسه للتوّ. audit-trail.js يطبعهما تزامنياً بعد
           cancelRecord/restoreRecord (:323-328 و:438-441)، فالفارق أجزاءٌ من
           الثانية؛ والثلاث ثوانٍ هامشٌ لا انتظار. وخارج ذلك تمرّان كما هما.
           v2 · 3) The "cancelled" and "restored" success sentences — swallowed
           only when a Store.save of the same kind has JUST happened.
           audit-trail.js prints them synchronously after
           cancelRecord/restoreRecord (:323-328, :438-441), so the gap is a
           fraction of a second; three seconds is a margin, not a wait.
           Otherwise they pass untouched. */
        if (sw && !sw.spoken && Date.now() - sw.at <= 3000) {
          if (sw.kind === 'cancel' && isExactly(msg, CANCEL_OK)) {
            verifyCancelOrRestore(sw, String(msg)); return;
          }
          if (sw.kind === 'restore' && isExactly(msg, RESTORE_OK)) {
            verifyCancelOrRestore(sw, String(msg)); return;
          }
        }

        /* ٢) «تم الحذف» — تُبتلع فقط داخل نافذة رفضٍ حقيقية، لأنّ الحذف
           **الناجح** يطبع النصّ نفسه ويجب أن يظهر. وهذه النافذة زمنيّةٌ عن
           حقّ: entity.js:303 ينادي التوست **تزامنياً** بعد عودة Store.destroy،
           فالفارق ميكروثوانٍ لا مئات المللي.
           2) «Deleted» — swallowed only inside a real refusal window, because
           a SUCCESSFUL delete prints the same words and must be shown. This
           window is legitimately time-based: entity.js:303 calls the toast
           SYNCHRONOUSLY after Store.destroy returns, so the gap is
           microseconds, not hundreds of milliseconds. */
        if (win && Date.now() <= win.until && isExactly(msg, deletedTexts())) {
          /* 🔴 نكتمها **ولا نتكلّم بعدُ** إن كان سؤال الخادم ما زال جارياً.
             خطأٌ وقعتُ فيه هنا وأمسكه الفحص: كانت هذه السطور تنادي speak()
             فوراً، فتسبق التأكيدَ الذي بدأته للتوّ وتطبع سبباً مخمَّناً من
             الذاكرة على حذفٍ **ناجح** — أي تكذب في الاتجاه المعاكس.
             فالكتم هنا، والكلام هناك، حين تُعرف النتيجة.
             🔴 Swallow it, but DO NOT SPEAK YET while the server is still
             being asked. A mistake I made here and the trial caught: these
             lines called speak() immediately, overtaking the confirmation
             just started and printing a reason guessed from the cache on a
             SUCCESSFUL delete — lying in the opposite direction. Swallow
             here; speak there, once the outcome is known. */
          if (!win.awaitingConfirm) speak(win.table, win.id);
          return;
        }
      } catch (e) {
        try { console.error('[delete-outcome-truth]', e); } catch (e2) {}
      }
      return inner.apply(UI, arguments);
    };
    return true;
  }

  function install() {
    var a = wrapDestroy(), b = wrapToast(), c = wrapSave();
    if (!a || !b || !c) {
      try { console.warn('[delete-outcome-truth] not fully installed — Store.destroy:' + a +
                         ' UI.toast:' + b + ' Store.save:' + c); } catch (e) {}
    }
    return a && b && c;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
  setTimeout(install, 1500);

  global.DeleteOutcomeTruth = {
    VERSION: 3,
    __install: install,
    __window: function () { return win; },
    __saveWindow: function () { return sw; },
    __trueReason: trueReason,
    __lockedReason: lockedReason,
    __guardSpoke: guardSpoke,
    __texts: function () { return { cancelOk: CANCEL_OK, restoreOk: RESTORE_OK }; }
  };

  console.info('delete-outcome-truth.js v3 ready — one delete message, spoken after the outcome is known; silent behind r4\'s sent-document guard.');
})(window);
