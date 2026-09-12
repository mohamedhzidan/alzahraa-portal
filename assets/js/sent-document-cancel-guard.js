/* =========================================================================
   sent-document-cancel-guard.js — لا يُلغى مستند أُرسِل أو اعتُمد من زرّ
   الإلغاء، حتى لو بدا أن الإلغاء نجح على الشاشة
   sent-document-cancel-guard.js — a document that was sent or approved
   cannot be "cancelled" from the cancel/delete button, even when the
   screen appears to say it worked
   -------------------------------------------------------------------------
   العطل، مُثبَت بقراءة الملفات الحقيقية لا بالتخمين
   THE FAULT, PROVEN BY READING THE REAL FILES

   زر «⊘ إلغاء المستند» (audit-trail.js:410-452، addCancelButton) يُرسَم
   طالما يملك المستخدم Auth.can(module,'delete') — بلا أي فحص لحالة
   المستند (status). فمن أرسل أو اعتمد مستنداً بالخطأ يضغطه، تفتح نافذة
   السبب الإلزامي (askCancel، :289-338)، ويضغط «إلغاء المستند وتسجيل
   السبب».

   cancelRecord (:188-205) يستدعي Store.save(table, id, {deleted:true, …}).
   وStore.save (store.js:394-407) **متزامن ومتفائل**: يُحدِّث النسخة
   المحلية في المتصفح ويُعيد الصفّ فوراً، بينما الكتابة الحقيقية للخادم
   تنتظر في طابور (enqueue/queueWrite/flush، store.js:200-301) وتُنفَّذ
   لاحقاً. فتُقرأ النتيجة «نجاح» فوراً: يُغلَق النموذج، يظهر توست أخضر
   «أُلغي المستند وسُجّل باسمك…» (audit-trail.js:327)، ويختفي الصفّ من
   القائمة (installScope، :275-284، تُخفي كل صفّ deleted===true).

   لكن كل جدول من جداول الدورة يرفض على الخادم أي تحديث على مستند ليست
   حالته draft/returned — نفس القائمة التي يستعملها workflow.js:45/95
   محلياً لزر «إرسال» (submit مسموح فقط من draft/returned). فحين يصل
   التحديث المُؤجَّل، يرفضه الخادم، وStore.js يسجّله «تعارض» (flush،
   :274-295) ويُبقي علم deleted:true محلياً — أي أن الصفّ **يبقى مختفياً
   عن المستخدم ومعتمَداً حقيقةً على الخادم**: سلفة موظف معتمدة تستمر في
   الخصم من راتبه بينما شاشته تقول إنها أُلغيت.

   نفس الطريق تماماً من زرّ سلة المهملات (audit-trail.js:258-264 يستبدل
   Store.destroy بالكامل بـcancelRecord).

   The ⊘ «Cancel document» button (audit-trail.js:410-452, addCancelButton)
   is drawn whenever the user holds Auth.can(module,'delete') — with no
   check of the document's status at all. Someone who sent or approved a
   document by mistake presses it, the mandatory-reason dialog opens
   (askCancel, :289-338), and they press "Cancel it and record the reason".

   cancelRecord (:188-205) calls Store.save(table, id, {deleted:true, …}).
   Store.save (store.js:394-407) is SYNCHRONOUS AND OPTIMISTIC: it updates
   the local browser copy and returns the row immediately, while the real
   server write waits in a queue (enqueue/queueWrite/flush, store.js:
   200-301) and runs later. The result reads as success right away: the
   dialog closes, a green toast «Cancelled, and recorded against your
   name…» appears (audit-trail.js:327), and the row disappears from the
   list (installScope, :275-284, hides every row with deleted===true).

   But every workflow table's server-side guard refuses any update on a
   document whose status is not draft/returned — the SAME list
   workflow.js:45/95 already tests locally for the «Send» button (submit
   is only allowed from draft/returned). When the deferred update reaches
   the server, it is refused, store.js records it as a "conflict" (flush,
   :274-295) and LEAVES the local deleted:true flag in place — the row
   stays HIDDEN from the user while it is genuinely still active on the
   server: an approved employee advance keeps being deducted from a
   salary while the screen says it was cancelled.

   The exact same road runs from the trash-can button (audit-trail.js:
   258-264 replaces Store.destroy outright with cancelRecord).

   -------------------------------------------------------------------------
   الإصلاح — WHAT THIS FILE DOES

   يلفّ Store.save، وهو الأبعد (يُحمَّل بعد كل لافّة أخرى لـStore.save —
   انظر loader.js عند موضع هذا السطر)، فيكون أول من يرى أي حفظ. حين تضع
   الرقعة deleted:true (إلغاء)، والجدول وحدة سير عمل حقيقية
   (Schema…workflow===true عند النداء نفسه، لا عند التحميل)، وحالة السجل
   المحلية الحالية ليست draft ولا returned — يُرفض **قبل** أي نداء
   لـStore.save الأصلية: لا كتابة محلية، لا طابور، لا نداء للخادم إطلاقاً.
   تُعاد false هنا — لكن Store.save الحقيقية نفسها لا تُعيد false عند
   رفضها؛ تُعيد null دائماً (store.js:397 حين لا يوجد سجل محلي لتحديثه، أو
   :401 حين الجهاز غير متصل ولا يُسمح بالعمل دون اتصال). لا فرق يظهر هنا،
   لأن cancelRecord (audit-trail.js:199-200) يكتب
   `var saved = Store.save(...); if (!saved) return false;` — وnull
   وfalse يُطابقان `!saved` بالتساوي، فتقرأها cancelRecord «لم يُحفظ» في
   الحالتين وتتوقف قبل أي شيء آخر: لا توست أخضر كاذب، لا اختفاء من
   القائمة، ولا سطر تدقيق يقول إن المستند أُلغي بينما لم يُلغَ.

   This wraps Store.save — the OUTERMOST wrapper (loaded after every other
   Store.save wrapper — see the loader.js comment at this line's slot), so
   it is the first thing any save passes through. When the patch sets
   deleted:true (a cancel), the table belongs to a genuine workflow module
   (Schema…workflow===true, checked at CALL time, never at load time), and
   the record's CURRENT LOCAL status is neither draft nor returned — it is
   refused BEFORE the real Store.save ever runs: no local write, no queue,
   no server call at all. It returns false here — but the real Store.save
   never returns false on its own refusals; it always returns null
   (store.js:397 when there is no local record to update, or :401 when the
   device is offline and the write is not allowed offline). That
   difference is invisible here, because cancelRecord
   (audit-trail.js:199-200) does
   `var saved = Store.save(...); if (!saved) return false;` — null and
   false both satisfy `!saved` identically, so cancelRecord reads "not
   saved" either way and stops before anything else: no false green
   toast, no vanishing from the list, no audit line claiming the
   document was cancelled when it was not.

   -------------------------------------------------------------------------
   لماذا مسح Schema.MODULES الحيّ، لا Schema.get() — WHY A LIVE
   Schema.MODULES SCAN, NOT Schema.get()

   schema.js:1234-1235 يبني خريطة byId مرة واحدة عند التحميل. الوحدات
   الأربع المذكورة في العطل (employeeAdvances، dailyLabour،
   concreteRequests، inspectionPermits؛ كلها workflow:true فعلاً —
   hr-department.js:81/310، sheets-templates.js:123/222) تُضاف لاحقاً عبر
   S.MODULES.push داخل hr-department.js وsheets-templates.js، وتلك
   الملفات تلفّ Schema.get بنفسها لتعويض ذلك (sheets-templates.js:9-12
   يشرح السبب حرفياً) — لكن الاعتماد على أن كل ملف مستقبلي يتذكّر ذلك
   اللفّ هشّ. audit-trail.js نفسه (modFor، :53-56) يتجنّب المشكلة بمسح
   Schema.MODULES الحيّة مباشرة في كل نداء بدل استعمال Schema.get() —
   نفس الأسلوب هنا بالضبط، وسبب اختياره تحديداً في هذا الملف.

   schema.js:1234-1235 builds its byId map once, at load time. The four
   modules named in the fault (employeeAdvances, dailyLabour,
   concreteRequests, inspectionPermits — all genuinely workflow:true,
   hr-department.js:81/310, sheets-templates.js:123/222) are pushed later
   via S.MODULES.push inside hr-department.js and sheets-templates.js, and
   those files wrap Schema.get themselves to compensate (sheets-
   templates.js:9-12 states the reason verbatim) — but relying on every
   future file remembering that wrap is fragile. audit-trail.js itself
   (modFor, :53-56) avoids the problem by scanning the live Schema.MODULES
   array on every call instead of calling Schema.get() — the exact same
   technique used here, and the reason it was chosen for this file
   specifically.

   -------------------------------------------------------------------------
   التوست الثاني — قُصِّي، لا أُخفي · THE SECOND TOAST — INVESTIGATED, NOT
   HIDDEN

   askCancel (audit-trail.js:311-335) يستدعي cancelRecord، وحين تُعاد false
   يعرض هو نفسه توستاً عاماً «تعذّر الإلغاء.» (:329) — بعد توستنا الواضح
   مباشرة، لأن UI.toast (ui.js:77-88) يُلحِق كل رسالة بـ#toastHost بلا
   إزالة السابقة (تكديس، لا استبدال). **لا طريقة لمنع هذا التوست الثاني
   دون تعديل audit-trail.js**، وهو ممنوع في نطاق هذه المهمة — فحُقِّق بدلاً
   من إخفائه: رسالتنا الواضحة تظهر أولاً (متزامنة، داخل نداء Store.save
   نفسه، قبل أن يُكمل cancelRecord ويعيد false لـaskCancel)، ثم رسالتهم
   العامة تظهر بعدها فوراً. ما يراه المستخدم فعلياً: توستان مكدّسان، أولهما
   — وهو الأوضح — هو الذي يُقرأ أولاً.

   طريق سلة المهملات (pages/entity.js:294-306، removeRec) أعقد بثلاث
   رسائل لا اثنتين: يعرض «تم الحذف» فوراً على السطر التالي مباشرة (خطأ،
   قبل معرفة النتيجة)، وdelete-honesty.js (مُثبَّت بالفعل، يلفّ
   Store.destroy) يعرض بعد ٦٠ مللي رسالته الخاصة «⛔ لم يُحذف — الرسالة
   السابقة غير صحيحة… غالباً السبب أن الجهاز غير متّصل بالإنترنت»
   (delete-honesty.js:94-97) — وهذا **التشخيص خاطئ هنا** (السبب حالة
   المستند لا الاتصال)، لكن **النتيجة التي يقرّرها («لم يُحذف») صحيحة**.
   فمستخدم سلة المهملات يرى: توستنا الواضح أولاً (لأنه يُطلَق أثناء نداء
   Store.save داخل Store.destroy نفسه)، ثم «تم الحذف» الخاطئة فوراً بعده،
   ثم تصحيح delete-honesty.js بسبب خاطئ بعد ٦٠ مللي. هذا كله خارج نطاق
   الملفات المسموح تعديلها في هذه المهمة (delete-honesty.js وpages/
   entity.js كلاهما ممنوعان هنا) — أُبلِغ به صراحة في التقرير، ولم يُلمَس
   حرفاً واحداً.

   askCancel (audit-trail.js:311-335) calls cancelRecord, and when it
   returns false shows its OWN generic toast «Could not cancel.» (:329) —
   right after ours, because UI.toast (ui.js:77-88) APPENDS every message
   to #toastHost without removing the previous one (they stack, they do
   not replace). **There is no way to stop that second toast without
   editing audit-trail.js**, which is out of this task's territory — so
   instead of hiding it: our clear message fires FIRST (synchronously,
   inside the very Store.save call, before cancelRecord finishes and
   returns false to askCancel), and their generic one follows immediately
   after. What the user actually sees: two stacked toasts, and the first —
   the clear one — is read first.

   The trash-can path (pages/entity.js:294-306, removeRec) is worse, with
   THREE messages, not two: it shows «Deleted» immediately on the very
   next line (wrong, before the outcome is known), and delete-honesty.js
   (already installed, wraps Store.destroy) shows its own message 60ms
   later: «⛔ NOT deleted — the previous message was wrong… most likely
   because the device is offline» (delete-honesty.js:94-97) — that
   DIAGNOSIS is wrong here (the cause is document status, not
   connectivity), but the OUTCOME it states («NOT deleted») is correct.
   So the trash-can user sees: our clear toast first (fired during the
   Store.save call inside Store.destroy itself), then the wrong «Deleted»
   immediately after, then delete-honesty.js's correction with the wrong
   reason 60ms later. All of this is outside the files this task may
   change (delete-honesty.js and pages/entity.js are both off-limits
   here) — reported plainly, and left completely untouched.

   -------------------------------------------------------------------------
   إضافي بحت · PURELY ADDITIVE
   يلفّ Store.save فقط، بنفس أسلوب save-project-fence.js. لا يلمس
   audit-trail.js ولا store.js ولا schema.js حرفاً واحداً. حذف هذا الملف
   (وسطره في loader.js وservice-worker.js) يعيد السلوك السابق تماماً —
   بما فيه العطل الموصوف أعلاه.

   Wraps Store.save only, the exact idiom save-project-fence.js uses.
   Never touches audit-trail.js, store.js or schema.js at all. Deleting
   this file (and its line in loader.js and service-worker.js) restores
   the previous behaviour exactly — including the fault described above.

   يُحمَّل بعد كل لافّة أخرى لـStore.save (آخرها اليوم save-project-fence.js)
   وقبل version-badge.js.
   Loads after every other Store.save wrapper (today's last is
   save-project-fence.js) and before version-badge.js.

   مُثبَت بالتشغيل · proven by running:
   TESTS/sent-document-cancel-guard-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }

  /* نفس القائمة التي يستعملها workflow.js:95 محلياً لزرّ «إرسال»
     (submit مسموح فقط من draft/returned) — لا قائمة جديدة مخترَعة هنا.
     The exact list workflow.js:95 already uses locally for the «Send»
     button (submit is only allowed from draft/returned) — no new list
     invented here. */
  var LIVE_STATUSES = ['draft', 'returned'];

  var MESSAGE = {
    ar: 'لا يُلغى مستند مُرسَل أو معتمد. قبل الاعتماد: «إرجاع» · بعد الاعتماد: «عكس» مع السبب — وكلاهما يبقى في السجل.',
    en: 'A sent or approved document cannot be cancelled. Before approval, use "Return"; after approval, use "Reverse" with a reason — both stay on the record.'
  };

  function refusalMessage() { return isAr() ? MESSAGE.ar : MESSAGE.en; }

  /* نفس أسلوب audit-trail.js (modFor، :53-56) وsave-project-fence.js
     (moduleForTable) — نمسح Schema.MODULES الحيّة عند كل نداء، لا مرة
     واحدة. انظر شرح أعلى الملف لسبب تجنّب Schema.get() هنا تحديداً.
     Same technique as audit-trail.js's modFor (:53-56) and
     save-project-fence.js's moduleForTable — scans the live
     Schema.MODULES on every call, never cached. See the file header for
     why Schema.get() is avoided here specifically. */
  function moduleForTable(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    for (var i = 0; i < Schema.MODULES.length; i++) {
      if (Schema.MODULES[i].table === table) return Schema.MODULES[i];
    }
    return null;
  }

  /* هل هذا الحفظ إلغاءً مرفوضاً؟ — الرقعة تضع deleted:true، والجدول وحدة
     سير عمل حقيقية، والحالة المحلية الحالية ليست draft ولا returned.
     الحالة الغائبة تُعامَل كـ'draft' — نفس قاعدة workflow.js:45
     (rec.status || 'draft') بالضبط، حتى لا نمنع إلغاء مستند لم يُخزَّن
     له status صراحةً بعد (لا يحدث عملياً — entity.js:868 يضبطها 'draft'
     عند الإنشاء — لكن نطابق القاعدة القائمة لا نخترع أخرى).
     Is this save a refused cancellation? — the patch sets deleted:true,
     the table belongs to a genuine workflow module, and the current
     LOCAL status is neither draft nor returned. A missing status is
     treated as 'draft' — the exact rule workflow.js:45 already uses
     (rec.status || 'draft'), so we never block a document with no status
     stored yet (does not happen in practice — entity.js:868 sets it to
     'draft' at creation — but we mirror the existing rule rather than
     invent a new one). */
  function refused(table, id, patch) {
    try {
      if (!patch || patch.deleted !== true) return false;
      var mod = moduleForTable(table);
      if (!mod || mod.workflow !== true) return false;
      var row = global.Store && Store.find(table, id);
      if (!row) return false;   /* لا سجل محليّ لنحكم عليه — لا نمنع شيئاً لم نره
                                    no local record to judge — never block what we cannot see */
      var status = row.status || 'draft';
      return LIVE_STATUSES.indexOf(status) === -1;
    } catch (e) {
      return false;   /* عطل في الحارس نفسه لا يجوز أن يمنع حفظاً صحيحاً
                          a fault in the guard itself must never block a legitimate save */
    }
  }

  function toastRefusal() {
    try { if (global.UI && typeof UI.toast === 'function') UI.toast(refusalMessage(), 'error', 7000); }
    catch (e) { /* لا نُفشل الرفض نفسه لأجل تعطّل التنبيه */ }
  }

  function installStoreWrap() {
    if (!global.Store || Store.__sentDocumentCancelGuard) return;
    Store.__sentDocumentCancelGuard = true;

    var origSave = Store.save;
    Store.save = function (table, id, patch /* , opts */) {
      if (refused(table, id, patch)) { toastRefusal(); return false; }
      return origSave.apply(Store, arguments);
    };

    console.info('sent-document-cancel-guard.js ready — a sent or approved document can no longer be "cancelled" out from under the workflow.');
  }

  installStoreWrap();
  /* إعادة محاولة — نفس نمط save-project-fence.js/null-writeback-guard.js،
     تحسّباً لإعادة بناء Store لاحقاً لم تُر بعد وقت التحميل الأول.
     Retried — the same idiom save-project-fence.js/null-writeback-guard.js
     use, in case Store is rebuilt later, not yet seen at first load. */
  [0, 500, 2000, 5000].forEach(function (ms) {
    setTimeout(function () { installStoreWrap(); }, ms);
  });

  global.SentDocumentCancelGuard = { refused: refused, moduleForTable: moduleForTable, message: refusalMessage };
})(window);
