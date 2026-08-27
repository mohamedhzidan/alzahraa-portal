/* =========================================================================
   audit-trail.js — من فعل ماذا ومتى · Who did what, and when
   -------------------------------------------------------------------------
   طُلب: «أريد حذف عقد، لكن أريد أن يصل كل شيء للإدارة — من أنشأ ومن
   عدّل ومن حذف ومتى، في كل الأقسام لا في ضبط المستندات وحده.»

   ما وجدتُه عند قراءة store.js قبل كتابة سطر واحد:

     ١) الحذف حذف حقيقي — DELETE على الخادم. العقد يختفي نهائياً.
     ٢) Store.log يكتب في ذاكرة المتصفح فقط بعلامة _localOnly، ولا يصل
        الخادم أبداً، ثم يمسحه loadRemote عند فتح الصفحة التالية.

     أي أن «من حذف العقد» لم يكن مسجَّلاً في أي مكان دائم.

   WHAT I FOUND BEFORE WRITING ANY CODE. Delete was a real DELETE — the
   contract vanished permanently. And Store.log wrote to browser memory
   with a _localOnly flag, never reaching the server, then was wiped on
   the next page load. "Who deleted the contract" was recorded nowhere.

   -------------------------------------------------------------------------
   ما يفعله هذا الملف

   ١· الإلغاء بدل المحو
      «حذف» تصبح «إلغاء المستند» بسبب إجباري. الصف يبقى في قاعدة
      البيانات، ويُخفى عن القوائم، ويحمل اسم من ألغاه ومتى ولماذا.
      والإدارة تستطيع استعادته. لا شيء يُمحى في شركة مقاولات.

   ٢· سجل دائم على الخادم
      كل إنشاء وتعديل وإلغاء واستعادة يُكتب في جدول audit على الخادم —
      لا في المتصفح. ومع التعديل نُسجّل الحقول التي تغيّرت بالضبط.

   ٣· تاريخ كل مستند أمام عينك
      لوحة في أسفل كل مستند: من أنشأه ومتى، من عدّله وماذا غيّر،
      من ألغاه ولماذا.

   ٤· شاشة «سجل المسؤولية» للإدارة
      كل ما جرى في الشركة، مرتّباً، قابلاً للبحث والتصدير.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the portal returns to
   its previous behaviour exactly.
   يُحمَّل بعد pages/entity.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }
  function nowISO() { return new Date().toISOString(); }

  function me() { return (global.Auth && Auth.current && Auth.current()) || null; }
  function modFor(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    return Schema.MODULES.filter(function (m) { return m.table === table; })[0] || null;
  }
  function screenName(table) {
    var m = modFor(table);
    return m ? L(m.label) : table;
  }
  /* ⚠️ أول محاولة كتبت «أعمال حدادة» بدل «SC-001» على عقد الباطن، لأن
     قائمتي الثابتة لم تعرف contractNo. والقوائم الثابتة ستظل ناقصة —
     هناك drawingNo و refNo و period و boxNo وغيرها عبر ٥٥ شاشة.

     الحل: نسأل الشاشة نفسها. أول عمود في جدولها هو ما اختاره من صمّمها
     ليُعرّف السجل — وهو ما يراه المستخدم في القائمة. فليكن هو الاسم.

     My first attempt labelled a subcontract «أعمال حدادة» instead of
     SC-001, because my fixed list did not know contractNo — and a fixed
     list will always be missing something across 55 screens.
     So ask the screen: its first table column is what its designer chose
     to identify a record by, and what the user already sees in the list. */
  function recordLabel(row, table) {
    if (!row) return '';
    var m = table ? modFor(table) : null;
    if (m && Array.isArray(m.columns)) {
      for (var i = 0; i < m.columns.length; i++) {
        var c = m.columns[i];
        if (c === 'status' || c === 'date' || c === 'site') continue;
        var v = row[c];
        if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') {
          return String(v);
        }
      }
    }
    return row.docNo || row.contractNo || row.code || row.name ||
           row.title || row.subject || row.id || '';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الكتابة في السجل — على الخادم، لا في المتصفح
     -------------------------------------------------------------------
     نكتب مباشرة عبر عميل Supabase ولا نمرّ بـ Store، لأن Store.create
     سيستدعي هذا الملف مرة أخرى فتدور الدائرة بلا نهاية.
     We write straight through the Supabase client rather than through
     Store, because Store.create would call back into this file and loop.
     ═══════════════════════════════════════════════════════════════════ */
  var pending = [];

  function write(action, table, recordId, label, extra) {
    var u = me();
    var entry = {
      id: 'aud_' + (global.Store && Store.uid ? Store.uid('x').split('_').pop()
                                              : Date.now() + '_' + Math.random().toString(16).slice(2)),
      action: action, entity: table, recordId: recordId || '',
      label: String(label || '').slice(0, 300),
      extra: String(extra || '').slice(0, 2000),
      userId: u ? u.id : 'system',
      userName: u ? (u.name || u.username || '') : 'system',
      at: nowISO(),
      site: u ? (u.site || null) : null
    };

    var client = global.Auth && Auth.client && Auth.client();
    if (!client) { pending.push(entry); return Promise.resolve(false); }

    return Promise.resolve(client.from('audit').insert(entry)).then(function (res) {
      if (res && res.error) {
        /* لا نُفشل عملية المستخدم بسبب السجل، لكن لا نبتلع الخطأ صامتين */
        console.error('[audit] could not write the log entry:', res.error.message || res.error);
        pending.push(entry);
        return false;
      }
      return true;
    }).catch(function (e) {
      console.error('[audit] log write failed', e);
      pending.push(entry);
      return false;
    });
  }

  /* إعادة محاولة ما تعذّر كتابته — دون اتصال مثلاً */
  function flushPending() {
    if (!pending.length) return;
    var client = global.Auth && Auth.client && Auth.client();
    if (!client) return;
    var batch = pending.splice(0, pending.length);
    Promise.resolve(client.from('audit').insert(batch)).then(function (res) {
      if (res && res.error) { pending = batch.concat(pending); }
      else console.info('[audit] ' + batch.length + ' pending log entries written.');
    }).catch(function () { pending = batch.concat(pending); });
  }
  global.addEventListener('online', function () { setTimeout(flushPending, 2000); });
  setInterval(flushPending, 60000);

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · ما الذي تغيّر بالضبط
     -------------------------------------------------------------------
     «عُدّل العقد» لا تفيد الإدارة. «تغيّرت قيمة العقد من ٢٫٤ مليون إلى
     ٣٫١ مليون» تفيد. لذلك نقارن قبل وبعد ونسجّل الفروق.
     "The contract was edited" tells management nothing. "Contract value
     changed from 2.4m to 3.1m" tells them everything. So we diff.
     ═══════════════════════════════════════════════════════════════════ */
  var NOISE = ['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'trail',
               '_syncState', '_syncError', 'deletedAt', 'deletedBy'];

  function labelOfField(table, name) {
    var m = modFor(table);
    if (!m || !m.fields) return name;
    var f = m.fields.filter(function (x) { return x.name === name; })[0];
    return f ? L(f.label) : name;
  }
  function shortVal(v) {
    if (v === null || v === undefined || v === '') return isAr() ? '(فارغ)' : '(empty)';
    if (typeof v === 'boolean') return v ? (isAr() ? 'نعم' : 'yes') : (isAr() ? 'لا' : 'no');
    if (typeof v === 'object') return isAr() ? '(بيانات)' : '(data)';
    return String(v).slice(0, 60);
  }

  function diff(table, before, after) {
    if (!before) return '';
    var out = [];
    Object.keys(after || {}).forEach(function (k) {
      if (k.charAt(0) === '_' || NOISE.indexOf(k) !== -1) return;
      var a = before[k], b = after[k];
      if (a === b) return;
      if ((a === null || a === undefined || a === '') &&
          (b === null || b === undefined || b === '')) return;
      if (typeof a === 'object' || typeof b === 'object') return;
      out.push(labelOfField(table, k) + ': ' + shortVal(a) + ' ← ' + shortVal(b));
    });
    return out.slice(0, 25).join(' · ');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الإلغاء بدل المحو
     ═══════════════════════════════════════════════════════════════════ */
  function cancelRecord(table, id, reason) {
    var u = me();
    var row = global.Store && Store.find(table, id);
    if (!row) return false;

    var patch = {
      deleted: true,
      deletedAt: nowISO(),
      deletedBy: u ? u.id : 'system',
      deleteReason: String(reason || '').slice(0, 500)
    };
    var saved = Store.save(table, id, patch);
    if (!saved) return false;

    write('delete', table, id, recordLabel(row, table),
          (isAr() ? 'السبب: ' : 'Reason: ') + (reason || '—'));
    return true;
  }

  function restoreRecord(table, id) {
    var row = global.Store && Store.find(table, id);
    if (!row) return false;
    var saved = Store.save(table, id, {
      deleted: false, deletedAt: null, deletedBy: null, deleteReason: null
    });
    if (!saved) return false;
    write('restore', table, id, recordLabel(row, table), '');
    return true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · اعتراض الحفظ والحذف
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.Store || Store.__auditInstalled) return;
    Store.__auditInstalled = true;

    var origCreate = Store.create;
    Store.create = function (table, data, opts) {
      var row = origCreate.apply(Store, arguments);
      if (row && row.id && table !== 'audit') {
        write('create', table, row.id, recordLabel(row, table), '');
      }
      return row;
    };

    var origSave = Store.save;
    Store.save = function (table, id, patch, opts) {
      var before = Store.find(table, id);
      var beforeCopy = before ? JSON.parse(JSON.stringify(before)) : null;
      var row = origSave.apply(Store, arguments);
      if (row && row.id && table !== 'audit') {
        /* الإلغاء والاستعادة يُسجَّلان في مكانهما بنصّ أوضح */
        var isCancel = patch && (patch.deleted === true || patch.deleted === false) &&
                       Object.keys(patch).length <= 4;
        if (!isCancel) {
          var what = diff(table, beforeCopy, row);
          if (what) write('update', table, row.id, recordLabel(row, table), what);
        }
      }
      return row;
    };

    /* ⭐ الحذف لم يعد حذفاً.
       Store.destroy كانت ترسل DELETE فيختفي المستند نهائياً. الآن تُحوّل
       إلى إلغاء موثّق. من أراد المحو الحقيقي فليفعله من قاعدة البيانات
       بصلاحية مسؤول — لا من شاشة يستعملها موظف كل يوم.
       Delete is no longer delete. Anyone who genuinely needs to erase a
       row can do it in the database with administrator rights — not from
       a screen an employee uses every day. */
    var origDestroy = Store.destroy;
    Store.destroy = function (table, id, opts) {
      var reason = (opts && opts.reason) || (global.__azCancelReason || '');
      global.__azCancelReason = '';
      return cancelRecord(table, id, reason);
    };
    Store.__origDestroy = origDestroy;

    console.info('audit-trail.js ready — deletions are now cancellations, and every change is logged on the server.');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · إخفاء الملغى عن القوائم
        يبقى في قاعدة البيانات، ويظهر للإدارة عند الطلب.
     ═══════════════════════════════════════════════════════════════════ */
  var SHOW_CANCELLED = false;

  function installScope() {
    if (!global.Auth || Auth.__auditScoped) return;
    Auth.__auditScoped = true;
    var orig = Auth.scopeRows;
    Auth.scopeRows = function (moduleId, rows) {
      var out = orig ? orig.apply(Auth, arguments) : rows;
      if (!Array.isArray(out) || SHOW_CANCELLED) return out;
      return out.filter(function (r) { return !r || r.deleted !== true; });
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · زر الإلغاء وسبب إجباري
     ═══════════════════════════════════════════════════════════════════ */
  function askCancel(table, id, after) {
    var row = global.Store && Store.find(table, id);
    if (!row || !global.UI || !UI.modal) return;

    UI.modal({
      title: L({ ar: 'إلغاء المستند', en: 'Cancel this document' }),
      body:
        '<div class="alert alert-warn">' + esc(L({
          ar: 'المستند لن يُمحى. سيبقى في قاعدة البيانات محمّلاً باسمك وتاريخ اليوم ' +
              'وسببك، ويختفي من القوائم. تستطيع الإدارة استعادته ومراجعته.',
          en: 'The document will not be erased. It stays in the database carrying your name, ' +
              'today\'s date and your reason, and disappears from the lists. Management can ' +
              'review and restore it.' })) + '</div>' +
        '<p><strong>' + esc(screenName(table)) + '</strong> — ' + esc(recordLabel(row, table)) + '</p>' +
        '<label class="field span-full"><span class="field-label">' +
          esc(L({ ar: 'سبب الإلغاء (إجباري)', en: 'Reason for cancelling (required)' })) +
        '</span><textarea class="textarea" id="azCancelReason" rows="3"></textarea></label>' +
        '<div class="err-msg" id="azCancelErr" hidden></div>',
      buttons: [
        { label: L({ ar: 'تراجع', en: 'Back' }), cls: 'btn-ghost' },
        { label: L({ ar: 'إلغاء المستند وتسجيل السبب', en: 'Cancel it and record the reason' }),
          cls: 'btn-danger', keepOpen: true,
          onClick: function () {
            var box = document.getElementById('azCancelReason');
            var err = document.getElementById('azCancelErr');
            var reason = box ? String(box.value || '').trim() : '';
            if (reason.length < 5) {
              if (err) {
                err.textContent = L({ ar: 'اكتب سبباً واضحاً — سيقرأه من يراجع بعد شهور.',
                                      en: 'Write a clear reason — someone will read it months from now.' });
                err.hidden = false;
              }
              return false;
            }
            var ok = cancelRecord(table, id, reason);
            if (global.UI && UI.closeModal) UI.closeModal();
            if (global.UI && UI.toast) {
              UI.toast(ok
                ? L({ ar: 'أُلغي المستند وسُجّل باسمك في سجل المسؤولية.',
                      en: 'Cancelled, and recorded against your name in the accountability log.' })
                : L({ ar: 'تعذّر الإلغاء.', en: 'Could not cancel.' }),
                ok ? 'success' : 'error', 6000);
            }
            if (ok && global.App && App.refresh) App.refresh();
            if (typeof after === 'function') after(ok);
            return true;
          } }
      ]
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · تاريخ المستند أسفل كل سجل
     ═══════════════════════════════════════════════════════════════════ */
  function historyHTML(table, id) {
    var rows = (global.Store && Store.all('audit')) || [];
    var mine = rows.filter(function (a) {
      return a && a.entity === table && a.recordId === id;
    }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); }).slice(0, 40);

    if (!mine.length) {
      return '<p class="muted small">' + esc(L({
        ar: 'لا توجد حركات مسجّلة لهذا المستند بعد.',
        en: 'No recorded activity for this document yet.' })) + '</p>';
    }

    var VERB = {
      create:  { ar: 'أنشأه',   en: 'created by' },
      update:  { ar: 'عدّله',   en: 'edited by' },
      'delete':{ ar: 'ألغاه',   en: 'cancelled by' },
      restore: { ar: 'استعاده', en: 'restored by' }
    };
    var TONE = { create: '#1a7f37', update: '#0000A3', 'delete': '#b42318', restore: '#B8860B' };

    return '<table style="width:100%;border-collapse:collapse">' +
      mine.map(function (a) {
        return '<tr style="border-bottom:1px solid #eee">' +
          '<td style="padding:6px 8px;white-space:nowrap;color:' + (TONE[a.action] || '#475467') +
            ';font-weight:700">' + esc(L(VERB[a.action] || { ar: a.action, en: a.action })) + '</td>' +
          '<td style="padding:6px 8px;font-weight:600">' + esc(a.userName || a.userId || '—') + '</td>' +
          '<td style="padding:6px 8px;white-space:nowrap;color:#667" class="num">' +
            esc(global.I18N && I18N.dateTime ? I18N.dateTime(a.at) : a.at) + '</td>' +
          '<td style="padding:6px 8px;color:#475467">' + esc(a.extra || '') + '</td>' +
        '</tr>';
      }).join('') + '</table>';
  }

  function injectHistory(moduleId, id) {
    var mod = global.Schema && Schema.get(moduleId);
    if (!mod) return;
    var host = document.querySelector('#modalHost .modal-body, .modal-body');
    if (!host || host.querySelector('#azHistoryPanel')) return;

    var row = global.Store && Store.find(mod.table, id);
    var box = document.createElement('div');
    box.id = 'azHistoryPanel';
    box.className = 'form-section';
    box.innerHTML =
      '<div class="form-section-title">' +
        esc(L({ ar: 'سجل المسؤولية — من فعل ماذا ومتى', en: 'Accountability — who did what, and when' })) +
      '</div>' +
      (row && row.deleted
        ? '<div class="alert alert-danger">' + esc(L({ ar: 'هذا المستند ملغى. ', en: 'This document is cancelled. ' })) +
          esc(L({ ar: 'السبب: ', en: 'Reason: ' })) + esc(row.deleteReason || '—') + '</div>'
        : '') +
      historyHTML(mod.table, id);
    host.appendChild(box);
  }

  function wrapDetail() {
    if (!global.EntityPage || EntityPage.__auditDetail) return;
    EntityPage.__auditDetail = true;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      [80, 350].forEach(function (ms) {
        setTimeout(function () { injectHistory(moduleId, id); addCancelButton(moduleId, id); }, ms);
      });
    };
  }

  function addCancelButton(moduleId, id) {
    if (!global.Auth || !Auth.can(moduleId, 'delete')) return;
    var mod = Schema.get(moduleId);
    if (!mod) return;
    var row = Store.find(mod.table, id);
    if (!row) return;
    /* الفوتر الحقيقي لكل نافذة هو .modal-foot (index.html:195، id="modalFoot") —
       class="modal-footer" لا وجود لها في الموقع كله. بسبب هذا الاسم الخطأ لم
       يكن زر «⊘ إلغاء المستند / ↩ استعادة» يظهر أبداً: الاستعادة مستحيلة، وكل
       إلغاء يُسجَّل بسبب فارغ لأن نافذة السبب الإلزامية لا تُفتح أصلاً.
       The real footer for every modal is .modal-foot (index.html:195,
       id="modalFoot") — class="modal-footer" does not exist anywhere on the
       site. This wrong name is why «⊘ Cancel / ↩ Restore» never rendered:
       restores were impossible and every cancellation recorded an empty
       reason because the mandatory-reason dialog never opened. */
    var host = document.querySelector('#modalHost .modal-foot');
    if (!host || host.querySelector('#azCancelBtn')) return;

    var b = document.createElement('button');
    b.id = 'azCancelBtn';
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.style.color = row.deleted ? '#B8860B' : '#b42318';
    b.textContent = row.deleted
      ? L({ ar: '↩ استعادة المستند', en: '↩ Restore document' })
      : L({ ar: '⊘ إلغاء المستند', en: '⊘ Cancel document' });
    b.onclick = function () {
      if (row.deleted) {
        var ok = restoreRecord(mod.table, id);
        if (global.UI && UI.closeModal) UI.closeModal();
        if (global.UI && UI.toast) {
          UI.toast(ok ? L({ ar: 'أُعيد المستند وسُجّل ذلك.', en: 'Restored, and recorded.' })
                      : L({ ar: 'تعذّرت الاستعادة.', en: 'Could not restore.' }),
                   ok ? 'success' : 'error');
        }
        if (ok && global.App && App.refresh) App.refresh();
      } else {
        if (global.UI && UI.closeModal) UI.closeModal();
        setTimeout(function () { askCancel(mod.table, id); }, 120);
      }
    };
    host.insertBefore(b, host.firstChild);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · التشغيل
     ═══════════════════════════════════════════════════════════════════ */
  function start() {
    install(); installScope(); wrapDetail();
    [0, 400, 1500, 4000].forEach(function (ms) {
      setTimeout(function () { install(); installScope(); wrapDetail(); }, ms);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.AuditTrail = {
    write: write,
    cancel: cancelRecord,
    restore: restoreRecord,
    askCancel: askCancel,
    diff: diff,
    historyHTML: historyHTML,
    showCancelled: function (on) { SHOW_CANCELLED = !!on; if (global.App && App.refresh) App.refresh(); },
    isShowingCancelled: function () { return SHOW_CANCELLED; },
    pending: function () { return pending.length; }
  };
})(window);
