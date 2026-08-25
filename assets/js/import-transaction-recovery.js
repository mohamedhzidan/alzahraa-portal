/* Recovery import guard: make the existing Import UI commit all validated rows
   in ONE Supabase INSERT statement. A failure rolls the whole statement back. */
(function (global) {
  'use strict';

  function ar() { return !global.I18N || I18N.getLang() === 'ar'; }
  function msg(a, e) { return ar() ? a : e; }
  function text(error) { return String((error && (error.message || error.details || error.code)) || error || 'unknown error'); }

  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value === '' ? null : value;
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (key.charAt(0) === '_' || value[key] === undefined || typeof value[key] === 'function') return;
      out[key] = clean(value[key]);
    });
    return out;
  }

  function prepare(table, data) {
    var user = global.Auth && Auth.current ? Auth.current() : null;
    if (!user) throw new Error('no-active-user');
    var row = clean(Object.assign({}, data));
    var now = new Date().toISOString();
    row.id = row.id || (global.Store && Store.uid ? Store.uid('rec') : ('rec_' + crypto.randomUUID()));
    row.createdAt = row.createdAt || now;
    row.createdBy = row.createdBy || user.id;
    row.updatedAt = now;
    row.updatedBy = user.id;
    return row;
  }

  async function atomicInsert(table, rows) {
    if (!rows.length) throw new Error('no-importable-rows');
    if (!global.Auth || !Auth.client || !Auth.client()) throw new Error('no-server-client');
    if (!global.Store || !Store.isOnline || !Store.isOnline()) throw new Error('online-required');
    if (Store.isTableAvailable && !Store.isTableAvailable(table)) {
      throw new Error('table-unavailable:' + table + ':' + (Store.tableError ? Store.tableError(table) : ''));
    }

    var payload = rows.map(function (row) { return prepare(table, row); });
    /* PostgREST turns an array INSERT into one SQL INSERT statement. PostgreSQL
       statements are atomic: if any row violates RLS/constraints/triggers, none
       of the rows from this statement are committed. */
    var result = await Auth.client().from(table).insert(payload);
    if (result.error) throw result.error;

    /* Never fabricate local success. Re-read from the server only after the
       statement succeeds. */
    if (Store.reload) await Store.reload();
    return payload.length;
  }

  function install() {
    if (!global.UI || !global.Store || UI.__atomicImportRecovery) return;
    var originalModal = UI.modal;
    var closeModal = UI.closeModal;
    var toast = UI.toast;

    UI.modal = function (opts) {
      try {
        var title = String((opts && opts.title) || '').toLowerCase();
        var isPreview = title.indexOf('import preview') !== -1 || title.indexOf('معاينة الاستيراد') !== -1;
        if (isPreview && opts && Array.isArray(opts.buttons)) {
          opts.buttons.forEach(function (button) {
            if (!button || typeof button.onClick !== 'function' || button.cls !== 'btn-primary') return;
            var label = String(button.label || '').toLowerCase();
            if (label.indexOf('import') === -1 && label.indexOf('استورد') === -1) return;

            var oldCommit = button.onClick;
            button.keepOpen = true;
            button.onClick = async function () {
              var oldCreate = Store.create;
              var oldToast = UI.toast;
              var oldRefresh = global.App && App.refresh;
              var captured = [];
              var table = null;
              var captureError = null;

              Store.create = function (t, rec) {
                if (table && table !== t) {
                  captureError = new Error('mixed-import-tables');
                  return null;
                }
                table = t;
                captured.push(clean(rec));
                return rec || {};
              };
              UI.toast = function () {};
              if (global.App && App.refresh) App.refresh = function () {};

              try {
                oldCommit();
              } catch (error) {
                captureError = error;
              } finally {
                Store.create = oldCreate;
                UI.toast = oldToast;
                if (global.App && oldRefresh) App.refresh = oldRefresh;
              }

              if (captureError) {
                toast(msg('تعذر تجهيز الاستيراد: ', 'Could not prepare the import: ') + text(captureError), 'error', 8000);
                return false;
              }
              if (!table || !captured.length) {
                toast(msg('لا توجد صفوف صالحة للاستيراد.', 'There are no valid rows to import.'), 'error', 6000);
                return false;
              }

              toast(msg('جارٍ حفظ كل الصفوف كعملية واحدة…', 'Saving all rows as one transaction…'), 'info', 3500);
              try {
                var count = await atomicInsert(table, captured);
                closeModal.call(UI);
                toast(msg('تم استيراد ' + count + ' صفاً بنجاح. لم يحدث أي حفظ جزئي.',
                          count + ' rows imported successfully. No partial import occurred.'), 'success', 7000);
                if (global.App && App.refresh) App.refresh();
                return true;
              } catch (error) {
                console.error('[atomic-import] rejected', error);
                toast(msg('فشل الاستيراد بالكامل ولم يتم حفظ أي صف من هذه العملية. السبب: ',
                          'The entire import failed; no row from this operation was saved. Reason: ') + text(error), 'error', 10000);
                return false;
              }
            };
          });
        }
      } catch (error) {
        console.warn('[atomic-import] modal wrapper failed', error);
      }
      return originalModal.apply(UI, arguments);
    };

    UI.__atomicImportRecovery = true;
  }

  global.AtomicImportRecovery = { atomicInsert: atomicInsert, install: install };
  install();
})(window);
