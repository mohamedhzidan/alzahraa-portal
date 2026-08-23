/* Recovery form-save layer: ordinary saves wait for Supabase confirmation. */
(function (global) {
  'use strict';

  function isAr() { return !global.I18N || I18N.getLang() === 'ar'; }
  function L(ar, en) { return isAr() ? ar : en; }
  function errText(error) {
    if (!error) return L('خطأ غير معروف.', 'Unknown error.');
    return String(error.message || error.details || error.code || error);
  }

  function currentModule(opts) {
    if (!global.Schema || !Schema.MODULES) return null;
    var title = String((opts && opts.title) || '');
    for (var i = 0; i < Schema.MODULES.length; i++) {
      var m = Schema.MODULES[i];
      var ar = m.label && m.label.ar ? String(m.label.ar) : '';
      var en = m.label && m.label.en ? String(m.label.en) : '';
      if ((ar && title.indexOf(ar) !== -1) || (en && title.indexOf(en) !== -1)) return m;
    }
    return null;
  }

  function withoutRequired(mod, fn) {
    if (!mod || !mod.fields) return fn();
    var touched = [];
    mod.fields.forEach(function (f) {
      if (f.required) { touched.push(f); f.required = false; }
    });
    try { return fn(); }
    finally { touched.forEach(function (f) { f.required = true; }); }
  }

  function installConfirmedSaveWrapper() {
    if (!global.UI || !global.Store || UI.__confirmedSaveRecovery) return;
    var originalModal = UI.modal;
    var realClose = UI.closeModal;
    var realToast = UI.toast;

    async function runConfirmed(fn) {
      var oldCreate = Store.create;
      var oldSave = Store.save;
      var oldDestroy = Store.destroy;
      var oldClose = UI.closeModal;
      var oldToast = UI.toast;
      var oldRefresh = global.App && App.refresh;
      var pending = null;
      var action = null;

      Store.create = function (table, data) {
        action = 'create';
        pending = Store.createConfirmed(table, data);
        return { id: data && data.id ? data.id : 'pending-confirmation' };
      };
      Store.save = function (table, id, data) {
        action = 'save';
        pending = Store.saveConfirmed(table, id, data);
        return { id: id };
      };
      Store.destroy = function (table, id) {
        action = 'delete';
        pending = Store.destroyConfirmed(table, id);
        return true;
      };
      UI.closeModal = function () {};
      UI.toast = function () {};
      if (global.App && App.refresh) App.refresh = function () {};

      var result;
      try { result = fn(); }
      finally {
        Store.create = oldCreate;
        Store.save = oldSave;
        Store.destroy = oldDestroy;
        UI.closeModal = oldClose;
        UI.toast = oldToast;
        if (global.App && oldRefresh) App.refresh = oldRefresh;
      }

      if (!pending) return result;

      realToast(L('جارٍ التحقق من الحفظ على الخادم…', 'Confirming the save with the server…'), 'info', 2500);
      try {
        await pending;
        realClose.call(UI);
        realToast(L('تم الحفظ والتأكد من وصوله إلى الخادم.', 'Saved and confirmed by the server.'), 'success', 4000);
        if (global.App && App.refresh) App.refresh();
        return true;
      } catch (error) {
        console.error('[confirmed-save] ' + action + ' rejected', error);
        realToast(L('لم يتم الحفظ. بياناتك ما زالت أمامك. السبب: ', 'Not saved. Your form is still open. Reason: ') + errText(error), 'error', 9000);
        return false;
      }
    }

    function wrapEntityButtons(opts) {
      if (!opts || !Array.isArray(opts.buttons)) return opts;
      var mod = currentModule(opts);
      opts.buttons.forEach(function (button) {
        if (!button || typeof button.onClick !== 'function') return;
        var original = button.onClick;
        var label = String(button.label || '').toLowerCase();

        if (button.cls === 'btn-primary' && button.keepOpen && (label === 'save' || label === 'حفظ' || label.indexOf('save') !== -1)) {
          button.__azOriginal = original;
          button.onClick = function () { return runConfirmed(original); };
          return;
        }

        if (button.cls === 'btn-gold' && /save|احفظ/.test(label)) {
          button.__azOriginal = original;
          button.onClick = function () { return runConfirmed(original); };
        }
      });

      var saveIndex = -1;
      for (var i = 0; i < opts.buttons.length; i++) {
        var b = opts.buttons[i];
        var text = String((b && b.label) || '').toLowerCase();
        if (b && b.cls === 'btn-primary' && b.keepOpen && (text === 'save' || text === 'حفظ' || text.indexOf('save') !== -1)) { saveIndex = i; break; }
      }
      if (saveIndex !== -1 && global.DraftDB && mod) {
        var saveButton = opts.buttons[saveIndex];
        var runOriginal = saveButton.__azOriginal || saveButton.onClick;
        var localDraftButton = {
          label: L('حفظ مسودة محلية', 'Save local draft'),
          cls: 'btn-outline',
          keepOpen: true,
          onClick: function () {
            var oldCreate = Store.create;
            var oldSave = Store.save;
            var oldClose2 = UI.closeModal;
            var oldToast2 = UI.toast;
            var oldRefresh2 = global.App && App.refresh;
            var captured = null;

            Store.create = function (table, data) {
              captured = { table: table, recordId: null, data: Object.assign({}, data) };
              return { id: (data && data.id) || 'local-draft' };
            };
            Store.save = function (table, id, data) {
              captured = { table: table, recordId: id, data: Object.assign({}, data) };
              return { id: id };
            };
            UI.closeModal = function () {};
            UI.toast = function () {};
            if (global.App && App.refresh) App.refresh = function () {};

            var result;
            try {
              result = withoutRequired(mod, function () { return runOriginal(); });
            } finally {
              Store.create = oldCreate;
              Store.save = oldSave;
              UI.closeModal = oldClose2;
              UI.toast = oldToast2;
              if (global.App && oldRefresh2) App.refresh = oldRefresh2;
            }
            if (result === false || !captured) return false;

            var user = global.Auth && Auth.current ? Auth.current() : null;
            if (!user) { realToast(L('لا يوجد مستخدم نشط.', 'No active user.'), 'error'); return false; }
            captured.moduleId = mod.id;
            captured.data.status = captured.data.status || 'draft';
            DraftDB.save(user.id, captured).then(function () {
              realClose.call(UI);
              realToast(L('حُفظت المسودة مشفّرة على هذا الجهاز فقط.', 'Draft saved encrypted on this device only.'), 'success', 5000);
              refreshDraftBadge();
            }).catch(function (error) {
              realToast(L('تعذر حفظ المسودة المحلية: ', 'Could not save local draft: ') + errText(error), 'error', 8000);
            });
            return false;
          }
        };
        opts.buttons.splice(saveIndex, 0, localDraftButton);
      }
      return opts;
    }

    UI.modal = function (opts) {
      try { wrapEntityButtons(opts); } catch (e) { console.warn('[confirmed-save] modal wrapper failed', e); }
      return originalModal.apply(UI, arguments);
    };
    UI.__confirmedSaveRecovery = true;
  }

  async function refreshDraftBadge() {
    if (!global.DraftDB || !global.Auth || !Auth.current) return;
    var user = Auth.current();
    if (!user) return;
    var count = 0;
    try { count = (await DraftDB.list(user.id)).length; } catch (e) { return; }
    var button = document.getElementById('azLocalDraftsBtn');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'azLocalDraftsBtn';
      button.className = 'btn btn-ghost btn-sm';
      button.style.cssText = 'position:fixed;bottom:18px;inset-inline-end:18px;z-index:1200;box-shadow:0 4px 18px rgba(0,0,0,.18)';
      button.addEventListener('click', openDraftCenter);
      document.body.appendChild(button);
    }
    button.hidden = count === 0;
    button.textContent = L('مسودات محلية: ', 'Local drafts: ') + count;
  }

  async function openDraftCenter() {
    var user = global.Auth && Auth.current ? Auth.current() : null;
    if (!user || !global.DraftDB || !global.UI) return;
    var drafts = await DraftDB.list(user.id);
    if (!drafts.length) { UI.toast(L('لا توجد مسودات محلية.', 'No local drafts.')); refreshDraftBadge(); return; }
    var body = '<div class="stack">';
    drafts.forEach(function (d) {
      var mod = global.Schema && Schema.get ? Schema.get(d.moduleId) : null;
      var title = mod && mod.label ? (isAr() ? mod.label.ar : mod.label.en) : d.moduleId;
      body += '<div class="card" style="padding:12px;margin-bottom:8px">' +
        '<strong>' + (global.UI && UI.esc ? UI.esc(title) : title) + '</strong>' +
        '<div class="small muted">' + new Date(d.savedAt).toLocaleString() + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn btn-primary btn-sm" data-draft-open="' + d.draftId + '">' + L('فتح', 'Open') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-draft-delete="' + d.draftId + '">' + L('حذف', 'Delete') + '</button>' +
        '</div></div>';
    });
    body += '</div>';
    UI.modal({ title: L('المسودات المحلية', 'Local drafts'), body: body, buttons: [{ label: L('إغلاق', 'Close'), cls: 'btn-ghost' }] });
    setTimeout(function () {
      document.querySelectorAll('[data-draft-open]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var d = drafts.filter(function (x) { return x.draftId === btn.getAttribute('data-draft-open'); })[0];
          if (!d || !global.EntityPage) return;
          UI.closeModal();
          if (d.recordId) {
            var originalFind = Store.find;
            Store.find = function (table, id) {
              if (table === d.table && id === d.recordId) {
                var base = originalFind.call(Store, table, id) || {};
                return Object.assign({}, base, d.data);
              }
              return originalFind.call(Store, table, id);
            };
            try { EntityPage.openForm(d.moduleId, d.recordId); }
            finally { Store.find = originalFind; }
          } else {
            EntityPage.openForm(d.moduleId, null, Object.assign({}, d.data));
          }
          await DraftDB.remove(user.id, d.draftId);
          refreshDraftBadge();
        });
      });
      document.querySelectorAll('[data-draft-delete]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await DraftDB.remove(user.id, btn.getAttribute('data-draft-delete'));
          UI.closeModal();
          refreshDraftBadge();
          openDraftCenter();
        });
      });
    }, 0);
  }

  global.addEventListener('alzahraa:store', function (ev) {
    var type = ev && ev.detail && ev.detail.type;
    if (/ready|online|remote-change|synced/.test(String(type || ''))) refreshDraftBadge();
  });

  function boot() {
    installConfirmedSaveWrapper();
    setTimeout(refreshDraftBadge, 600);
  }

  boot();
})(window);
