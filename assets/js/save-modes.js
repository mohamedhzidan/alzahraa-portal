/* =========================================================================
   save-modes.js — ثلاثة أزرار للحفظ · Three save buttons
   -------------------------------------------------------------------------
   يضيف زرّين بجوار زر «حفظ» الموجود:

     ١) حفظ                    (الزر الأصلي — بلا تغيير)
        يتحقق من الحقول المطلوبة، يطبّق قواعد الحماية، ويُرسل للخادم.

     ٢) مسودة                  (جديد)
        يحفظ العمل الناقص. لا يشترط ملء الحقول المطلوبة، فيمكنك ترك
        المستند نصف مكتمل والعودة إليه. الحالة تبقى «مسودة».

     ٣) مسودة حتى الاتصال      (جديد)
        يحفظ على هذا الجهاز فقط — مشفّراً — ولا يلمس الخادم إطلاقاً.
        عند عودة الإنترنت يُرفع تلقائياً بدون أن تفتح المستند مرة أخرى.

   -------------------------------------------------------------------------
   THIS FILE IS ADDITIVE. It does not modify entity.js.
   It wraps UI.modal, so if you delete this file the portal returns to
   exactly one Save button and nothing else changes.

   ملف إضافي بالكامل. لا يعدّل entity.js. حذفه يعيد كل شيء كما كان.

   Load AFTER: ui.js · store.js · offline-db.js · pages/entity.js
   ========================================================================= */
(function (global) {
  'use strict';

  var QUEUE_FLAG = '__az_queued_until_online';

  function L(x) { return global.L ? global.L(x) : (x && x.ar) || x; }
  function t(k) { return global.t ? global.t(k) : k; }
  function isAr() { return global.I18N && I18N.getLang ? I18N.getLang() === 'ar' : true; }

  /* المستخدم الحالي — مفتاح التشفير في OfflineDB مرتبط به */
  function uid() {
    var u = global.Auth && Auth.current();
    return u ? u.id : null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الوضع الحالي للحفظ
     ═══════════════════════════════════════════════════════════════════ */
  var MODE = 'normal';   /* 'normal' | 'draft' | 'queue' */

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · تعليق الحقول المطلوبة مؤقتاً أثناء حفظ المسودة
        A draft is by definition unfinished, so the required-field check
        is suspended for that one save and restored immediately after —
        even if the save throws.
     ═══════════════════════════════════════════════════════════════════ */
  function withoutRequired(mod, fn) {
    var touched = [];
    (mod.fields || []).forEach(function (f) {
      if (f.required) { touched.push(f); f.required = false; }
    });
    try { return fn(); }
    finally { touched.forEach(function (f) { f.required = true; }); }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الطابور المحلي — «مسودة حتى الاتصال»
     ═══════════════════════════════════════════════════════════════════ */
  function jobId() {
    var r = (global.crypto && crypto.getRandomValues)
      ? Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(8)),
          function (b) { return b.toString(16).padStart(2, '0'); }).join('')
      : String(Date.now()) + Math.random().toString(16).slice(2);
    return 'q_' + r;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ⚠️ الخطأ الذي كان يمحو المسودات دون اتصال — «unsupported-operation»
     -------------------------------------------------------------------
     هذا الملف و store.js يتشاركان طابور الانتظار نفسه في المتصفح،
     لكنهما كانا يكتبان فيه بشكلين مختلفين:

         save-modes.js  →  { kind: 'create', payload: {...} }
         store.js       →  { op:   'insert', row:     {...} }

     وعند عودة الاتصال يقرأ store.js الطابور كاملاً — بما فيه مهامّنا —
     فلا يجد op، فيرمي 'unsupported-operation'، ويسجّلها تعارضاً،
     ثم يحذف المهمة من الطابور. فتضيع المسودة التي كتبها الموظف دون
     اتصال، ويُطلب منه إعادة إدخالها. وهو ما حدث بالضبط.

     THE BUG THAT DESTROYED OFFLINE DRAFTS. This file and store.js share
     one browser queue but wrote two different job shapes. On reconnect
     store.js reads the whole queue, finds no `op`, throws
     'unsupported-operation', files a conflict, and DELETES the job — so
     the offline draft is gone and the employee is asked to type it again.

     الإصلاح: نكتب المهمة بالشكلين معاً في نفس السجل. فأيّاً كان من
     يصل إليها أولاً — store.js عند فتح الصفحة، أو هذا الملف عند عودة
     الاتصال — يفهمها ويرسلها صحيحة. ومن يصل ثانياً يجدها مرفوعة.

     THE FIX: write both shapes into the same job. Whichever reaches it
     first — store.js at page load, or this file on reconnect —
     understands it and sends it correctly. The other finds it gone.
     ═══════════════════════════════════════════════════════════════════ */
  function nowISO() { return new Date().toISOString(); }

  async function queueRecord(table, id, payload, moduleLabel) {
    var user = uid();
    if (!user || !global.OfflineDB) return { ok: false, error: 'no-offline-store' };

    /* معرّف ثابت يُولَّد الآن، لا عند الرفع. لولاه لأنتجت كل محاولة رفع
       معرّفاً جديداً، فتتكرّر نفس المسودة عند أي إعادة إرسال.
       A stable id generated now, not at upload time. Without it every
       retry would mint a new id and duplicate the same draft. */
    var row = Object.assign({}, payload);
    delete row[QUEUE_FLAG];
    row.id = row.id || id ||
      ((global.Store && Store.uid) ? Store.uid(table) : 'q_' + jobId());
    if (!id) {
      row.createdAt = row.createdAt || nowISO();
      row.createdBy = row.createdBy || user;
    }
    row.updatedAt = nowISO();
    row.updatedBy = user;

    var job = {
      queueId: jobId(),

      /* ── الشكل الذي يفهمه store.js ── */
      op: id ? 'update' : 'insert',
      table: table,
      row: row,
      id: row.id,
      baseUpdatedAt: null,
      at: nowISO(),

      /* ── الشكل الذي يفهمه هذا الملف ── */
      kind: id ? 'update' : 'create',
      recordId: id || null,
      payload: row,
      moduleLabel: moduleLabel || table,
      by: user
    };
    try {
      await OfflineDB.queueAdd(user, job);
      return { ok: true, job: job };
    } catch (e) {
      console.error('[save-modes] could not queue', e);
      return { ok: false, error: String(e && e.message) };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ترقية المسودات القديمة العالقة في الطابور بالشكل القديم
     Repair drafts already queued in the old shape, so nothing written
     before this fix is lost.
     ═══════════════════════════════════════════════════════════════════ */
  async function migrateQueue() {
    var user = uid();
    if (!user || !global.OfflineDB) return 0;
    var fixed = 0;
    try {
      var jobs = await OfflineDB.queueList(user);
      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        if (!j || j.op || !j.kind || !j.table) continue;   /* سليمة أو ليست لنا */
        var row = Object.assign({}, j.payload || {});
        delete row[QUEUE_FLAG];
        row.id = row.id || j.recordId ||
          ((global.Store && Store.uid) ? Store.uid(j.table) : 'q_' + jobId());
        row.updatedAt = row.updatedAt || j.at || nowISO();
        var upgraded = Object.assign({}, j, {
          op: j.kind === 'update' ? 'update' : 'insert',
          row: row, id: row.id, baseUpdatedAt: null, payload: row
        });
        /* ⚠️ لا نحذف قبل الإضافة. upgraded يحمل نفس queueId فيكتب queueAdd
           فوق المهمة القديمة مباشرة (put بنفس المفتاح — offline-db.js:114-117،
           keyPath queueId)، فهي عملية واحدة ذرّية: إن فشلت الإضافة تبقى
           المسودة القديمة سليمة تماماً بدل أن تكون قد حُذفت بالفعل.
           We do not delete before adding. upgraded carries the same
           queueId, so queueAdd overwrites the old job directly (a put on
           the same key — offline-db.js:114-117, keyPath queueId): one
           atomic operation. If the add throws, the old draft survives
           untouched instead of having already been deleted. */
        await OfflineDB.queueAdd(user, upgraded);
        fixed++;
      }
      if (fixed) console.info('[save-modes] upgraded ' + fixed + ' queued draft(s) to the shared format.');
    } catch (e) { console.warn('[save-modes] queue migration skipped', e); }
    return fixed;
  }

  /* رفع الطابور — يُستدعى عند عودة الاتصال وعند فتح الموقع */
  var flushing = false;
  async function flushQueue(silent) {
    if (flushing) return;
    if (!global.OfflineDB || !global.Store) return;
    var user = uid();
    if (!user) return;
    if (navigator.onLine === false) return;

    flushing = true;
    var sent = 0, failed = 0;
    var attempted = [];
    try {
      await migrateQueue();          /* أصلح القديم قبل أي إرسال */
      var jobs = await OfflineDB.queueList(user);
      /* only our own jobs; Store may keep its own entries in the same queue */
      jobs = jobs.filter(function (j) { return j && j.kind && j.table && j.payload; });

      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        try {
          var body = Object.assign({}, j.payload);
          delete body[QUEUE_FLAG];

          /* الترقية جعلت payload يحمل id ثابتاً — نستخدمه كما هو */
          if ((j.kind === 'update' || j.op === 'update') && (j.recordId || j.id)) {
            /* If someone changed the record while we were offline, do not
               overwrite silently — record a conflict for a human to read. */
            var current = Store.find(j.table, j.recordId);
            if (current && j.payload.updatedAt && current.updatedAt &&
                new Date(current.updatedAt) > new Date(j.payload.updatedAt)) {
              await OfflineDB.conflictAdd(user, j,
                isAr() ? 'عُدّل المستند على الخادم أثناء عملك دون اتصال.'
                       : 'The record changed on the server while you were offline.');
              await OfflineDB.queueRemove(j.queueId);
              failed++;
              continue;
            }
            Store.save(j.table, j.recordId || j.id, body);
          } else {
            Store.create(j.table, body);
          }
          /* ⚠️ لا نحذف المهمة من الطابور هنا.
             كان السطر التالي هو الكارثة:

                 await OfflineDB.queueRemove(j.queueId);   ← حذف فوري
                 sent++;                                    ← «تم الرفع»

             لكن Store.create ترجع قبل أن يردّ الخادم أصلاً. فإن رفض
             الخادم الصف بعدها بلحظة، تكون المسودة قد حُذفت من الطابور
             ومن الخادم معاً — فتختفي، ويقول النظام إنها رُفعت.
             وهذا بالضبط ما رأيتَه.

             WE DO NOT REMOVE THE JOB HERE. Store.create returns before
             the server has answered, so removing it now means a later
             refusal wipes the draft from the queue AND the server, while
             the portal reports success. Exactly what you saw.

             نبقيها في الطابور حتى يؤكّد الخادم وجودها بنفسه. */
          attempted.push({ job: j, table: j.table, id: body.id || j.recordId || j.id });
        } catch (e) {
          console.warn('[save-modes] job failed, will retry later', j.queueId, e);
          failed++;
        }
      }

      /* ── التأكيد: نسأل الخادم عن كل صف قبل حذف مهمته ──────────────
         Confirmation: ask the server for each row before deleting its job. */
      if (attempted.length) {
        await new Promise(function (r) { setTimeout(r, 2600); });
        var client = global.Auth && Auth.client && Auth.client();

        for (var k = 0; k < attempted.length; k++) {
          var a = attempted[k];
          /* ⚠️ خطأ وجده الفاحص — استثناء غير متوقع هنا (مساحة التخزين
             ممتلئة أثناء إعادة المحاولة، مثلاً) كان يهرب من flushQueue
             كله دون التقاطه، فلا تُشغَّل صناديق toast أدناه (326-339)،
             ولا أحد يستدعي flushQueue() بـ .catch()، فيصير رفضاً غير
             معالَج بصمت. المسودة نفسها كانت تبقى بأمان في الطابور — لم
             نحذفها قبل هذه اللحظة — لكن الموظف لا يرى أي تحذير إطلاقاً.
             هذا الحاجز الخارجي يضمن أن أي فشل غير متوقع لأي صف يُحسب
             فاشلاً ويُسجَّل، ولا يُسقِط الدورة كلها.

             THE BUG THE VERIFIER FOUND — an unexpected exception here
             (storage full during a retry, for example) used to escape
             flushQueue() entirely uncaught, so the toast blocks below
             (326-339) never ran, and no call site attaches .catch() to
             flushQueue(), turning it into a silent unhandled rejection.
             The draft itself stayed safely in the queue — we never
             removed it before this point — but the employee saw no
             warning at all. This outer barrier makes sure any
             unexpected failure for one row counts as failed and is
             logged, without dropping the whole cycle. */
          try {
            var landed = false;
            if (client && a.id) {
              try {
                var res = await client.from(a.table).select('id').eq('id', a.id).maybeSingle();
                landed = !!(res && !res.error && res.data && res.data.id);
              } catch (e) { landed = false; }
            }

            if (landed) {
              await OfflineDB.queueRemove(a.job.queueId);
              sent++;
            } else {
              /* لم يصل — تبقى المسودة في الطابور ولا تضيع.

                 ⚠️ أولاً: هل رفضها الخادم رفضاً نهائياً بالفعل؟ إن كان
                 store.js قد سجّل تعارضاً لنفس الصف من مساره الخاص (وهو ما
                 يحدث فوراً عند رفض حقيقي)، فإعادة المحاولة هنا عبث — الخادم
                 رفض بيقين، والتعارض محفوظ بالفعل بكل ما كتبه الموظف. نزيل
                 مهمتنا دون تسجيل تعارض ثانٍ، حتى لا تتكرّر نفس المسودة مرة
                 عند كل محاولة زائد مرة أخرى عند المحاولة الخامسة.

                 First: did the server already give a definitive refusal? If
                 store.js's own path already filed a conflict for this same
                 row (which happens immediately on a real refusal), retrying
                 here is pointless — the server has refused for certain, and
                 the conflict already preserves everything the employee typed.
                 Remove our job WITHOUT filing a second conflict, so one
                 refused save produces exactly one preserved copy — not one
                 per retry plus one more at the fifth try. */
              var already = (global.Store && Store.conflicts) ? Store.conflicts() : [];
              var isTerminal = already.some(function (c) {
                var j = c.job || {};
                var jid = j.id || (j.row && j.row.id);
                return jid && a.id && jid === a.id;
              });

              if (isTerminal) {
                await OfflineDB.queueRemove(a.job.queueId);
              } else {
                /* لم يُرفض نهائياً بعد — قد تكون هفوة شبكة عابرة، أو الحالة
                   الصامتة (أُدرج لكن مُنعت القراءة). نُبقي على منطق «خمس
                   محاولات» كما هو، لكن الآن — بعد إصلاح (ب) أعلاه — إعادة
                   الإدراج لا تحذف المهمة القديمة قبل التأكد من نجاح الإضافة. */
                var tries = (a.job.tries || 0) + 1;
                if (tries >= 5) {
                  await OfflineDB.conflictAdd(user, a.job, isAr()
                    ? 'حاول النظام رفع هذه المسودة خمس مرات ورفضها الخادم في كل مرة.'
                    : 'The portal tried to upload this draft five times and the server refused each time.');
                  await OfflineDB.queueRemove(a.job.queueId);
                } else {
                  /* ⚠️ إصلاح مباشر للعطل الذي وجده الفاحص — queueAdd هنا
                     بلا شبكة أمان كان استثناؤه (تخزين ممتلئ مثلاً) يهرب من
                     الحلقة كلها. الآن نلتقطه محلياً: المهمة القديمة لم
                     تُحذف بعد (بفضل إصلاح 1b أعلاه)، فلا شيء يضيع، ونكتفي
                     بتسجيل تحذير — failed++ يعمل كالمعتاد بعد هذا الفرع.

                     THE EXACT FIX FOR THE FAULT THE VERIFIER FOUND —
                     queueAdd here had no safety net, so its exception
                     (storage full, for example) used to escape the whole
                     loop. Now it is caught locally: the old job was never
                     removed first (thanks to fix 1b above), so nothing is
                     lost, and we just log a warning — failed++ still runs
                     as normal right after this branch. */
                  try {
                    await OfflineDB.queueAdd(user, Object.assign({}, a.job, { tries: tries }));
                  } catch (e) {
                    console.warn('[save-modes] could not re-queue after a failed attempt; ' +
                      'the previous copy of this job is still safely in the queue', a.job.queueId, e);
                  }
                }
              }
              failed++;
            }
          } catch (e) {
            /* حاجز أخير لهذا الصف تحديداً — أي خطأ لم نتوقعه في الخطوات
               أعلاه لا يجوز أن يُسقِط بقية الصفوف ولا صناديق toast تحتها.
               A last barrier for this one row specifically — any error we
               did not anticipate in the steps above must not take down the
               remaining rows or the toast blocks below it. */
            console.warn('[save-modes] confirmation step failed unexpectedly for a queued job',
              a && a.job && a.job.queueId, e);
            failed++;
          }
        }
      }

      if (sent && !silent && global.UI && UI.toast) {
        UI.toast(isAr()
          ? 'رُفع ' + sent + ' مستند وتأكّد وجوده على الخادم.'
          : sent + ' document(s) uploaded and confirmed on the server.', 'success', 5000);
        if (global.App && App.refresh) App.refresh();
      }
      if (failed && global.UI && UI.toast) {
        UI.toast(isAr()
          ? 'لم يُرفع ' + failed + ' مستند — ما زال محفوظاً على جهازك ولن يضيع. ' +
            'سيُحاول النظام مرة أخرى، وستظهر لك التفاصيل إن تكرّر الرفض.'
          : failed + ' document(s) did not upload — still saved on your device and not lost. ' +
            'The portal will try again and will show you the reason if it keeps failing.',
          'warn', 9000);
      }
    } finally { flushing = false; }
  }

  /* عدد المستندات المنتظرة */
  async function pendingCount() {
    if (!global.OfflineDB) return 0;
    var user = uid();
    if (!user) return 0;
    try {
      var jobs = await OfflineDB.queueList(user);
      return jobs.filter(function (j) { return j && j.kind && j.table; }).length;
    } catch (e) { return 0; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · اعتراض الحفظ — Store wrappers
        When MODE is 'queue' the record never reaches the server.
        When MODE is 'draft' the status is forced to draft.
     ═══════════════════════════════════════════════════════════════════ */
  var queuedThisSave = null;

  /* ═══════════════════════════════════════════════════════════════════
     ⚠️ الخطأ الذي كان هنا — «المسودة لا تُحفظ ولا تخرج من المسودة أبداً»
     -------------------------------------------------------------------
     كان السطر:   data.status = 'draft'
     يُطبَّق على كل الشاشات بلا استثناء.

     لكن «الحالة» تعني شيئين مختلفين تماماً في هذا النظام:

       • شاشة لها دورة اعتماد (مستخلص، سند صرف…)
         الحالة = مسودة · قيد المراجعة · معتمد …  ← «مسودة» صحيحة هنا

       • شاشة بيانات أساسية (مقاولو الباطن، الموردون، الأصناف…)
         الحالة = نشط · موقوف فقط         ← «مسودة» قيمة غير موجودة أصلاً

     فما حدث في «مقاولو الباطن»: حُفظ السجل بحالة draft، ثم عند فتحه
     للتعديل لا تجد القائمة المنسدلة خياراً يطابق draft فتظهر فارغة،
     فلا يلمسها المستخدم، فتُحفظ draft مرة أخرى. سجل لا يخرج من المسودة أبداً.

     THE BUG THAT WAS HERE. `data.status = 'draft'` was applied to every
     screen. But "status" means two different things: on an approval
     document it is a workflow state where draft is valid; on master data
     it is only Active/Inactive, where draft is not an option at all.

     So a subcontractor saved as draft could never leave that state: the
     dropdown matches no option, shows blank, the user does not touch it,
     and draft is written straight back on every save.

     الإصلاح: «مسودة» تفرض الحالة على شاشات الاعتماد فقط. أما البيانات
     الأساسية فتُحفظ حفظاً عادياً كاملاً — مع التساهل في الحقول المطلوبة
     وحده، وهو الغرض الحقيقي من الزر هناك.
     THE FIX: draft forces the status only on workflow screens. Master
     data saves completely normally — with only the required-field check
     relaxed, which is all the button was ever meant to do there.
     ═══════════════════════════════════════════════════════════════════ */
  function tableHasWorkflow(table) {
    if (!global.Schema || !Schema.MODULES) return false;
    var m = Schema.MODULES.filter(function (x) { return x.table === table; })[0];
    return !!(m && m.workflow);
  }

  function install() {
    if (!global.Store || Store.__saveModesInstalled) return;

    var origCreate = Store.create;
    var origSave = Store.save;

    Store.create = function (table, data) {
      if (MODE === 'queue') {
        var payload = Object.assign({}, data);
        /* نفس القاعدة: الحالة «مسودة» لشاشات الاعتماد فقط */
        if (tableHasWorkflow(table)) payload.status = payload.status || 'draft';
        payload[QUEUE_FLAG] = true;
        queuedThisSave = { table: table, id: null, payload: payload };
        /* Return a truthy object so entity.js believes the save succeeded
           and closes the form. The real upload happens on reconnect. */
        return payload;
      }
      if (MODE === 'draft' && tableHasWorkflow(table)) {
        data = Object.assign({}, data);
        data.status = 'draft';
      }
      return origCreate.apply(Store, [table, data]);
    };

    Store.save = function (table, id, data) {
      if (MODE === 'queue') {
        var payload = Object.assign({}, data);
        payload[QUEUE_FLAG] = true;
        queuedThisSave = { table: table, id: id, payload: payload };
        return payload;
      }
      if (MODE === 'draft' && tableHasWorkflow(table)) {
        data = Object.assign({}, data);
        if (!data.status || data.status === 'draft') data.status = 'draft';
      }
      return origSave.apply(Store, [table, id, data]);
    };

    Store.__saveModesInstalled = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · حقن الزرّين في نافذة الحفظ
        We wrap UI.modal. When entity.js opens a create/edit form it passes
        a primary Save button with keepOpen; that is our hook. Nothing else
        in the portal matches that shape, so no other dialog is touched.
     ═══════════════════════════════════════════════════════════════════ */
  function wrapModal() {
    if (!global.UI || UI.__saveModesWrapped) return;
    var origModal = UI.modal;

    UI.modal = function (opts) {
      try {
        var btns = opts && opts.buttons;
        if (Array.isArray(btns)) {
          var idx = -1;
          for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            if (b && b.cls === 'btn-primary' && b.keepOpen && typeof b.onClick === 'function'
                && b.label === t('g.save')) { idx = i; break; }
          }
          if (idx !== -1) {
            var saveBtn = btns[idx];
            var runSave = saveBtn.onClick;

            var draftBtn = {
              label: isAr() ? 'مسودة' : 'Draft',
              cls: 'btn-outline', keepOpen: true,
              onClick: function () {
                MODE = 'draft';
                var mod = currentModule(opts);
                var result;
                try {
                  result = mod ? withoutRequired(mod, runSave) : runSave();
                } finally { MODE = 'normal'; }
                /* الكذبة التي كانت هنا (أثبتتها تجربة B.3): result قد يكون
                   Promise لحفظ غير متزامن (settings.js:339 مثلاً) — وPromise
                   لا يساوي false أبداً، فكان الشرط أدناه يُطلق «حُفظت
                   كمسودة»/«حُفظ بالكامل» فوراً، قبل أن يردّ الخادم بشيء،
                   حتى لو رفض الحفظ فعلياً. الإصلاح: إن كانت النتيجة
                   Promise ننتظرها ونطلق التنبيه بعد ردّها فقط؛ التزامن
                   العادي (entity.js) لا يتغيّر إطلاقاً.
                   THE LIE THAT WAS HERE (proven by trial B.3): result can be
                   a Promise for an async save (e.g. settings.js:339) — and a
                   Promise is never ===false, so the check below fired «Saved
                   as a draft»/«Saved in full» immediately, before the server
                   answered anything, even when the save was actually
                   refused. THE FIX: when the result is a Promise, wait for
                   it and fire the toast only after it resolves; the ordinary
                   synchronous path (entity.js) is completely unchanged. */
                var wf = mod && mod.workflow;
                function fireDraftToast() {
                  if (!global.UI || !UI.toast) return;
                  UI.toast(
                    wf ? (isAr() ? 'حُفظت كمسودة. يمكنك إكمالها لاحقاً.'
                                 : 'Saved as a draft. You can finish it later.')
                       : (isAr() ? 'حُفظ بالكامل. هذه الشاشة بلا دورة اعتماد، فالسجل نشط ' +
                                   'ويمكنك إكمال باقي الحقول متى شئت.'
                                 : 'Saved in full. This screen has no approval cycle, so the record ' +
                                   'is active and you can complete the remaining fields any time.'),
                    'success', 6000);
                }
                if (result && typeof result.then === 'function') {
                  /* لا تنبيه عند الرفض — الحوار نفسه يعرض خطأه (تجربة E)
                     no toast on rejection — the dialog's own error handling
                     already speaks (proven in trial E: settings shows its
                     own error toast). */
                  result.then(function (r) { if (r !== false) fireDraftToast(); });
                } else if (result !== false) {
                  fireDraftToast();
                }
                return result;
              }
            };

            var queueBtn = {
              label: isAr() ? 'مسودة حتى الاتصال' : 'Draft until connected',
              cls: 'btn-gold', keepOpen: true,
              onClick: function () {
                /* ⚠️ الخطأ الذي كان هنا — الزر الذهبي يتجاهل نفسه إذا كان
                   هناك اتصال، فيحفظ مسودة عادية بدل أن يمر بالطابور أبداً.
                   فأي موظف على شبكة موقع ضعيفة، متقطّعة، لكنها «متصلة»
                   تقنياً وقت الضغط، كان يُحرم من الحماية المحلية بالكامل —
                   وهي أهم وقت يحتاجها.

                   THE BUG THAT WAS HERE. The gold button skipped itself
                   whenever there was any connection, saving a plain draft
                   and never touching the queue at all. Any site worker on
                   a weak, intermittent network that was technically
                   "online" the instant the button was pressed lost the
                   local protection entirely — exactly when it mattered most.

                   الإصلاح: الزر الذهبي يُقيّد دائماً محلياً أولاً، ثم يرفع
                   فوراً إن كان الاتصال متاحاً — بدل أن يقرر تجاهل الطابور.
                   THE FIX: the gold button always queues locally first,
                   then uploads immediately if a connection is available —
                   instead of deciding to skip the queue altogether. */
                if (!global.OfflineDB || !uid()) {
                  /* الطابور المحلي غير متاح على هذا المتصفح (OfflineDB معطّل
                     أو لا يوجد مستخدم). لا معنى للانتظار — نحفظ كمسودة على
                     الخادم فوراً حتى يبقى الزر يعمل بدل أن يفشل بصمت.
                     The local queue is unavailable on this browser
                     (OfflineDB is broken, or there is no signed-in user).
                     Waiting makes no sense — save as a draft on the server
                     immediately instead, so the button still works rather
                     than failing silently. */
                  MODE = 'draft';
                  var m0 = currentModule(opts);
                  var r0;
                  try { r0 = m0 ? withoutRequired(m0, runSave) : runSave(); }
                  finally { MODE = 'normal'; }
                  /* نفس الكذبة (فرع الزر الذهبي، تجربة B.3): r0 قد يكون
                     Promise أيضاً — لا نُطلق النجاح قبل ردّ الخادم.
                     Same lie, gold-button fallback path (trial B.3): r0 can
                     be a Promise too — never fire success before the server
                     answers. */
                  function fireLocalUnavailableToast() {
                    if (!global.UI || !UI.toast) return;
                    UI.toast(isAr()
                      ? 'تعذّر الحفظ المحلي على هذا الجهاز، فحُفظ على الخادم مباشرة كمسودة.'
                      : 'Local saving is unavailable on this device, so it was saved to the server directly as a draft.',
                      'warn', 6000);
                  }
                  if (r0 && typeof r0.then === 'function') {
                    r0.then(function (r) { if (r !== false) fireLocalUnavailableToast(); });
                  } else if (r0 !== false) {
                    fireLocalUnavailableToast();
                  }
                  return r0;
                }

                MODE = 'queue';
                queuedThisSave = null;
                var mod = currentModule(opts);
                var result;
                try {
                  result = mod ? withoutRequired(mod, runSave) : runSave();
                } finally { MODE = 'normal'; }

                if (result === false) return false;

                var captured = queuedThisSave;
                queuedThisSave = null;
                if (!captured) return result;

                queueRecord(captured.table, captured.id, captured.payload,
                            mod ? L(mod.label) : captured.table)
                  .then(function (r) {
                    if (r.ok) {
                      updateBadge();
                      /* الاتصال متاح فعلاً وقت الحفظ — لا داعي لجعل الموظف
                         ينتظر حتى يمر الفحص الدوري كل دقيقتين. نرفع الآن
                         مباشرة ونؤكّد مع الخادم.
                         A connection is actually available right now — no
                         reason to make the employee wait for the periodic
                         two-minute check. Upload immediately and confirm
                         with the server. */
                      if (navigator.onLine !== false) {
                        if (global.UI && UI.toast) {
                          UI.toast(isAr()
                            ? 'حُفظ على جهازك مشفّراً — جارٍ الرفع والتأكد من الخادم الآن…'
                            : 'Saved on your device, encrypted — uploading and confirming with the server now…',
                            'success', 6000);
                        }
                        flushQueue(false);
                      } else if (global.UI && UI.toast) {
                        UI.toast(isAr()
                          ? 'حُفظ على هذا الجهاز مشفّراً. سيُرفع تلقائياً عند عودة الإنترنت.'
                          : 'Saved on this device, encrypted. It will upload itself when the connection returns.',
                          'success', 6000);
                      }
                    } else {
                      /* فشل الطابور نفسه — والنموذج قد أُغلق بالفعل لأن
                         Store.save/create المُقنَّع أعاد قيمة صحيحة. البيانات
                         موجودة هنا في captured.payload ولن تختفي: نرسلها
                         للخادم مباشرة بدل تركها تتبخر بصمت.
                         The queue itself failed — and the form has already
                         closed because the wrapped Store.save/create
                         returned a truthy value. The data is still here in
                         captured.payload and must not evaporate: send it to
                         the server directly instead of letting it vanish
                         silently. */
                      var fallback = Object.assign({}, captured.payload);
                      delete fallback[QUEUE_FLAG];
                      try {
                        if (captured.id) Store.save(captured.table, captured.id, fallback);
                        else Store.create(captured.table, fallback);
                        if (global.UI && UI.toast) {
                          UI.toast(isAr()
                            ? 'تعذّر الحفظ على الجهاز، فأُرسلت البيانات إلى الخادم مباشرة بدلاً من ذلك.'
                            : 'Could not save on the device, so the data was sent straight to the server instead.',
                            'warn', 7000);
                        }
                      } catch (e) {
                        if (global.UI && UI.toast) {
                          UI.toast(isAr()
                            ? 'تعذّر الحفظ على الجهاز وعلى الخادم معاً. انسخ بياناتك الآن قبل إغلاق الصفحة.'
                            : 'Could not save on the device or the server. Copy your data now before closing the page.',
                            'error', 9000);
                        }
                      }
                    }
                  });
                return result;
              }
            };

            /* Draft · Draft-until-connected · Save   (Save stays last/primary) */
            btns.splice(idx, 0, draftBtn, queueBtn);
          }
        }
      } catch (e) { console.warn('[save-modes] could not add buttons', e); }
      return origModal.apply(UI, arguments);
    };

    UI.__saveModesWrapped = true;
  }

  /* Work out which module the open form belongs to, from the modal title. */
  function currentModule(opts) {
    if (!global.Schema || !opts || !opts.title) return null;
    var title = String(opts.title);
    var found = null;
    (Schema.MODULES || []).forEach(function (m) {
      var lab = L(m.label);
      if (lab && title.indexOf(lab) !== -1) {
        if (!found || L(found.label).length < lab.length) found = m;
      }
    });
    return found;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · شارة «في انتظار الرفع» + الرفع التلقائي
     ═══════════════════════════════════════════════════════════════════ */
  function updateBadge() {
    pendingCount().then(function (n) {
      var el = document.getElementById('azQueueBadge');
      if (!n) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement('button');
        el.id = 'azQueueBadge';
        el.type = 'button';
        el.setAttribute('style',
          'position:fixed;inset-inline-end:18px;bottom:18px;z-index:60;border:0;cursor:pointer;' +
          'background:#B8860B;color:#fff;border-radius:999px;padding:10px 16px;font:600 13px Tahoma,Arial;' +
          'box-shadow:0 6px 20px rgba(0,0,0,.28)');
        el.onclick = function () { flushQueue(false); };
        document.body.appendChild(el);
      }
      /* «في انتظار الاتصال» غير صحيحة إن كان الاتصال متاحاً بالفعل — هذه
         الحالة الآن تعني رفعاً وتأكيداً جاريَيْن، لا انتظاراً لشيء غائب.
         "Waiting for a connection" is wrong wording when a connection is
         already available — this state now means an upload and a
         confirmation are in progress, not a wait for something absent. */
      el.textContent = navigator.onLine !== false
        ? (isAr()
            ? n + ' مستند قيد الرفع والتأكد — اضغط للمحاولة الآن'
            : n + ' document(s) uploading and confirming — tap to retry now')
        : (isAr()
            ? n + ' مستند في انتظار الاتصال — اضغط للرفع الآن'
            : n + ' document(s) waiting for a connection — tap to upload now');
    });
  }

  function start() {
    install();
    wrapModal();

    global.addEventListener('online', function () {
      setTimeout(function () { flushQueue(false).then(updateBadge); }, 1200);
    });
    global.addEventListener('offline', updateBadge);

    /* also try on load, and every two minutes */
    setTimeout(function () { flushQueue(true).then(updateBadge); }, 3000);
    setInterval(function () { flushQueue(true).then(updateBadge); }, 120000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }

  global.SaveModes = {
    migrateQueue: migrateQueue,
    flush: flushQueue,
    pending: pendingCount,
    updateBadge: updateBadge,
    mode: function () { return MODE; }
  };

  console.info('save-modes.js ready — Draft and Draft-until-connected buttons active.');
})(window);
