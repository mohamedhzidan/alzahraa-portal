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

  async function queueRecord(table, id, payload, moduleLabel) {
    var user = uid();
    if (!user || !global.OfflineDB) return { ok: false, error: 'no-offline-store' };
    var job = {
      queueId: jobId(),
      kind: id ? 'update' : 'create',
      table: table, recordId: id || null,
      payload: payload,
      moduleLabel: moduleLabel || table,
      at: new Date().toISOString(),
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
    try {
      var jobs = await OfflineDB.queueList(user);
      /* only our own jobs; Store may keep its own entries in the same queue */
      jobs = jobs.filter(function (j) { return j && j.kind && j.table && j.payload; });

      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        try {
          var body = Object.assign({}, j.payload);
          delete body[QUEUE_FLAG];

          if (j.kind === 'update' && j.recordId) {
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
            Store.save(j.table, j.recordId, body);
          } else {
            Store.create(j.table, body);
          }
          await OfflineDB.queueRemove(j.queueId);
          sent++;
        } catch (e) {
          console.warn('[save-modes] job failed, will retry later', j.queueId, e);
          failed++;
        }
      }

      if (sent && !silent && global.UI && UI.toast) {
        UI.toast(isAr()
          ? 'تم رفع ' + sent + ' مستند كان محفوظاً على الجهاز.'
          : sent + ' saved-on-device document(s) uploaded.', 'success', 5000);
        if (global.App && App.refresh) App.refresh();
      }
      if (failed && global.UI && UI.toast) {
        UI.toast(isAr()
          ? failed + ' مستند يحتاج مراجعتك قبل الرفع.'
          : failed + ' document(s) need your review before upload.', 'warn', 6000);
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

  function install() {
    if (!global.Store || Store.__saveModesInstalled) return;

    var origCreate = Store.create;
    var origSave = Store.save;

    Store.create = function (table, data) {
      if (MODE === 'queue') {
        var payload = Object.assign({}, data);
        payload.status = payload.status || 'draft';
        payload[QUEUE_FLAG] = true;
        queuedThisSave = { table: table, id: null, payload: payload };
        /* Return a truthy object so entity.js believes the save succeeded
           and closes the form. The real upload happens on reconnect. */
        return payload;
      }
      if (MODE === 'draft') { data = Object.assign({}, data); data.status = 'draft'; }
      return origCreate.apply(Store, [table, data]);
    };

    Store.save = function (table, id, data) {
      if (MODE === 'queue') {
        var payload = Object.assign({}, data);
        payload[QUEUE_FLAG] = true;
        queuedThisSave = { table: table, id: id, payload: payload };
        return payload;
      }
      if (MODE === 'draft') {
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
                if (result !== false && global.UI && UI.toast) {
                  UI.toast(isAr() ? 'حُفظت كمسودة. يمكنك إكمالها لاحقاً.'
                                  : 'Saved as a draft. You can finish it later.', 'success');
                }
                return result;
              }
            };

            var queueBtn = {
              label: isAr() ? 'مسودة حتى الاتصال' : 'Draft until connected',
              cls: 'btn-gold', keepOpen: true,
              onClick: function () {
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
                    if (!global.UI || !UI.toast) return;
                    if (r.ok) {
                      UI.toast(isAr()
                        ? 'حُفظ على هذا الجهاز مشفّراً. سيُرفع تلقائياً عند عودة الإنترنت.'
                        : 'Saved on this device, encrypted. It will upload itself when the connection returns.',
                        'success', 6000);
                      updateBadge();
                    } else {
                      UI.toast(isAr()
                        ? 'تعذّر الحفظ على الجهاز. احفظ عادي بدلاً من ذلك.'
                        : 'Could not save on the device. Use normal Save instead.', 'error', 7000);
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
      el.textContent = (isAr()
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
    flush: flushQueue,
    pending: pendingCount,
    updateBadge: updateBadge,
    mode: function () { return MODE; }
  };

  console.info('save-modes.js ready — Draft and Draft-until-connected buttons active.');
})(window);
