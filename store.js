/* =========================================================================
   store.js — Data layer
   ---------------------------------------------------------------------
   TODAY:  every record lives in the browser's localStorage (demo mode).
   LATER:  swap `LocalAdapter` for a `SupabaseAdapter` implementing the same
           six methods (list / get / insert / update / remove / bulk) and the
           whole application keeps working without any other change.
   ========================================================================= */
(function (global) {
  'use strict';

  var PREFIX = 'az_db_';
  var META_KEY = 'az_meta';

  /* ---------------------------------------------------------------------
     LocalAdapter — browser storage
     --------------------------------------------------------------------- */
  var LocalAdapter = {
    name: 'local',

    _read: function (table) {
      try {
        var raw = localStorage.getItem(PREFIX + table);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('read failed', table, e);
        return [];
      }
    },
    _write: function (table, rows) {
      try {
        localStorage.setItem(PREFIX + table, JSON.stringify(rows));
        return true;
      } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
          alert(I18N.getLang() === 'ar'
            ? 'مساحة التخزين على هذا المتصفح امتلأت. نزّل نسخة احتياطية ثم احذف بعض السجلات القديمة.'
            : 'Browser storage is full. Download a backup, then delete some old records.');
        }
        console.error('write failed', table, e);
        return false;
      }
    },

    list: function (table) { return this._read(table); },
    get: function (table, id) {
      var rows = this._read(table);
      for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
      return null;
    },
    insert: function (table, row) {
      var rows = this._read(table);
      rows.push(row);
      this._write(table, rows);
      return row;
    },
    update: function (table, id, patch) {
      var rows = this._read(table), out = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === id) { rows[i] = Object.assign({}, rows[i], patch); out = rows[i]; break; }
      }
      this._write(table, rows);
      return out;
    },
    remove: function (table, id) {
      var rows = this._read(table).filter(function (r) { return r.id !== id; });
      return this._write(table, rows);
    },
    bulk: function (table, rows) { return this._write(table, rows); },
    tables: function () {
      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
      }
      return out;
    },
    wipe: function () {
      this.tables().forEach(function (tb) { localStorage.removeItem(PREFIX + tb); });
      localStorage.removeItem(META_KEY);
    }
  };

  /* ---------------------------------------------------------------------
     SupabaseAdapter — SKELETON for the future real-database version.
     Read GUIDE-EN.md / GUIDE-AR.md section "Moving to a real database".
     --------------------------------------------------------------------- */
  /*
  var SupabaseAdapter = {
    name: 'supabase',
    _c: null,
    connect: function (url, anonKey) {
      this._c = global.supabase.createClient(url, anonKey);
    },
    list:   async function (t)        { const {data} = await this._c.from(t).select('*'); return data || []; },
    get:    async function (t,id)     { const {data} = await this._c.from(t).select('*').eq('id',id).single(); return data; },
    insert: async function (t,row)    { const {data} = await this._c.from(t).insert(row).select().single(); return data; },
    update: async function (t,id,p)   { const {data} = await this._c.from(t).update(p).eq('id',id).select().single(); return data; },
    remove: async function (t,id)     { await this._c.from(t).delete().eq('id',id); return true; },
    bulk:   async function (t,rows)   { await this._c.from(t).upsert(rows); return true; }
  };
  */

  var adapter = LocalAdapter;

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }

  function meta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setMeta(patch) {
    var m = Object.assign(meta(), patch);
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
    return m;
  }

  /* Sequential, human-readable document numbers, e.g. PA-2026-0007 */
  function nextDocNo(prefix) {
    var m = meta();
    var seqs = m.seqs || {};
    var year = new Date().getFullYear();
    var key = prefix + '-' + year;
    seqs[key] = (seqs[key] || 0) + 1;
    setMeta({ seqs: seqs });
    return prefix + '-' + year + '-' + String(seqs[key]).padStart(4, '0');
  }

  /* ---------------------------------------------------------------------
     Public API
     --------------------------------------------------------------------- */
  var Store = {
    uid: uid,
    nextDocNo: nextDocNo,
    meta: meta,
    setMeta: setMeta,
    adapterName: function () { return adapter.name; },
    use: function (a) { adapter = a; },

    all: function (table) { return adapter.list(table) || []; },

    find: function (table, id) { return adapter.get(table, id); },

    /* where = {field:value} or a predicate function */
    where: function (table, cond) {
      var rows = this.all(table);
      if (typeof cond === 'function') return rows.filter(cond);
      if (!cond) return rows;
      return rows.filter(function (r) {
        for (var k in cond) {
          if (!Object.prototype.hasOwnProperty.call(cond, k)) continue;
          if (r[k] !== cond[k]) return false;
        }
        return true;
      });
    },

    create: function (table, data, opts) {
      opts = opts || {};
      var user = global.Auth && Auth.current();
      var row = Object.assign({}, data);
      row.id = row.id || uid(table);
      row.createdAt = row.createdAt || new Date().toISOString();
      row.createdBy = row.createdBy || (user ? user.id : 'system');
      row.updatedAt = row.createdAt;
      row.updatedBy = row.createdBy;
      adapter.insert(table, row);
      if (opts.silent !== true) Store.log('create', table, row.id, row.docNo || row.name || row.id);
      return row;
    },

    save: function (table, id, patch, opts) {
      opts = opts || {};
      var user = global.Auth && Auth.current();
      var p = Object.assign({}, patch);
      p.updatedAt = new Date().toISOString();
      p.updatedBy = user ? user.id : 'system';
      var row = adapter.update(table, id, p);
      if (opts.silent !== true) Store.log('update', table, id, (row && (row.docNo || row.name)) || id);
      return row;
    },

    destroy: function (table, id, opts) {
      opts = opts || {};
      var row = adapter.get(table, id);
      var ok = adapter.remove(table, id);
      if (ok && opts.silent !== true) {
        Store.log('delete', table, id, (row && (row.docNo || row.name)) || id);
      }
      return ok;
    },

    replaceAll: function (table, rows) { return adapter.bulk(table, rows); },

    /* ----- audit log ----- */
    log: function (action, entity, recordId, label, extra) {
      var user = global.Auth && Auth.current();
      var rows = adapter.list('audit') || [];
      rows.push({
        id: uid('aud'),
        action: action,
        entity: entity,
        recordId: recordId || '',
        label: label || '',
        extra: extra || '',
        userId: user ? user.id : 'system',
        userName: user ? user.name : 'system',
        at: new Date().toISOString()
      });
      /* keep the log from growing without bound in demo mode */
      if (rows.length > 3000) rows = rows.slice(-2500);
      adapter.bulk('audit', rows);
    },
    auditLog: function () {
      return (adapter.list('audit') || []).slice().reverse();
    },

    /* ----- backup / restore ----- */
    exportAll: function () {
      var dump = { __app: 'alzahraa-portal', __version: 1, __at: new Date().toISOString(), tables: {}, meta: meta() };
      adapter.tables().forEach(function (tb) { dump.tables[tb] = adapter.list(tb); });
      return dump;
    },
    importAll: function (dump) {
      if (!dump || dump.__app !== 'alzahraa-portal' || !dump.tables) return false;
      adapter.wipe();
      Object.keys(dump.tables).forEach(function (tb) { adapter.bulk(tb, dump.tables[tb]); });
      if (dump.meta) { try { localStorage.setItem(META_KEY, JSON.stringify(dump.meta)); } catch (e) {} }
      return true;
    },
    wipe: function () { adapter.wipe(); },

    /* ----- storage usage (for the sidebar meter) ----- */
    usage: function () {
      var bytes = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
        }
      } catch (e) {}
      var limit = 5 * 1024 * 1024; /* browsers give ~5 MB */
      return { bytes: bytes, limit: limit, pct: Math.min(100, (bytes / limit) * 100) };
    }
  };

  global.Store = Store;
})(window);
