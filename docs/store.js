/* Production data layer: Supabase is authoritative; IndexedDB supports safe offline drafts. */
(function (global) {
  'use strict';

  var cache = {};
  var metaCache = {};
  var client = null;
  var activeUser = null;
  var queue = [];
  var conflictsCache = [];
  var flushing = false;
  var initialized = false;
  var remoteReady = false;
  var listeners = [];
  var channel = null;
  var lifecycle = 0;
  var OFFLINE_SAFE = ['itTickets', 'siteReports', 'attendance'];

  function randomToken(bytes) {
    if (!global.crypto || !crypto.getRandomValues) throw new Error('secure-random-unavailable');
    var data = new Uint8Array(bytes || 12);
    crypto.getRandomValues(data);
    return Array.prototype.map.call(data, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  function uid(prefix) {
    if (global.crypto && crypto.randomUUID) return (prefix || 'id') + '_' + crypto.randomUUID();
    return (prefix || 'id') + '_' + randomToken(16);
  }

  function now() { return new Date().toISOString(); }

  function online() {
    return navigator.onLine !== false && !!client;
  }

  function writableOnline() {
    return online() && remoteReady;
  }

  function emit(type, detail) {
    listeners.forEach(function (fn) { try { fn(type, detail || {}); } catch (e) {} });
    try { global.dispatchEvent(new CustomEvent('alzahraa:store', { detail: { type: type, data: detail || {} } })); } catch (e) {}
    paintStatus();
  }

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

  function tableNames() {
    var names = ['app_meta', 'audit'];
    if (activeUser && ['admin', 'gm', 'finance_manager', 'hr', 'auditor'].indexOf(activeUser.role) !== -1) names.push('users');
    if (global.Schema && Schema.MODULES) {
      Schema.MODULES.forEach(function (mod) {
        if (!global.Auth || Auth.canSee(mod.id)) names.push(mod.table);
      });
    }
    return names.filter(function (name, i, all) { return all.indexOf(name) === i; });
  }

  async function fetchTable(table) {
    var rows = [], from = 0, pageSize = 1000;
    var source = table === 'users' ? 'portal_users' : table === 'employees' ? 'portal_employees' : table;
    while (true) {
      var res = await client.from(source).select('*').range(from, from + pageSize - 1);
      if (res.error) throw res.error;
      var page = res.data || [];
      rows = rows.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
      if (from >= 50000) throw new Error('table-limit-exceeded:' + table);
    }
    return rows;
  }

  function absorbMeta() {
    metaCache = {};
    (cache.app_meta || []).forEach(function (row) { metaCache[row.key] = row.value; });
  }

  async function saveSnapshot() {
    if (!activeUser || !global.OfflineDB || !global.ALZAHRAA_CONFIG.offlineEnabled) return;
    try {
      await OfflineDB.saveSnapshot(activeUser.id, {
        version: 2,
        savedAt: now(),
        tables: cache,
        meta: metaCache
      });
    } catch (e) { console.warn('offline snapshot failed', e); }
  }

  async function loadSnapshot() {
    if (!activeUser || !global.OfflineDB || !global.ALZAHRAA_CONFIG.offlineEnabled) return false;
    var snap = await OfflineDB.loadSnapshot(activeUser.id, ALZAHRAA_CONFIG.cacheMaxAgeDays || 30);
    if (!snap || !snap.tables) return false;
    cache = snap.tables;
    metaCache = snap.meta || {};
    if (!cache.users) cache.users = [];
    if (!cache.users.some(function (u) { return u.id === activeUser.id; })) cache.users.push(activeUser);
    return true;
  }

  async function loadRemote() {
    remoteReady = false;
    var names = tableNames();
    var results = await Promise.all(names.map(async function (table) {
      try { return { table: table, rows: await fetchTable(table) }; }
      catch (error) { return { table: table, error: error }; }
    }));
    var failures = results.filter(function (result) { return !!result.error; });
    if (failures.length) {
      failures.forEach(function (result) {
        console.warn('table unavailable', result.table, result.error.message || result.error);
      });
      throw new Error('database-load-failed:' + failures.map(function (result) { return result.table; }).join(','));
    }
    results.forEach(function (result) {
      cache[result.table] = result.rows;
    });
    cache.users = cache.users || [];
    var i = cache.users.findIndex(function (u) { return u.id === activeUser.id; });
    if (i === -1) cache.users.push(activeUser); else cache.users[i] = activeUser;
    absorbMeta();
    remoteReady = true;
    await saveSnapshot();
  }

  async function initialize(supabaseClient, user) {
    lifecycle++;
    client = supabaseClient;
    activeUser = user;
    cache = {};
    metaCache = {};
    queue = global.OfflineDB ? await OfflineDB.queueList(user.id) : [];
    conflictsCache = global.OfflineDB ? await OfflineDB.conflicts(user.id) : [];
    var loaded = false;
    if (navigator.onLine !== false) {
      try { await loadRemote(); loaded = true; }
      catch (e) { console.warn('remote startup failed', e); }
    }
    if (!loaded) loaded = await loadSnapshot();
    if (!loaded) throw new Error('first-login-requires-internet');
    initialized = true;
    subscribe();
    flush();
    emit(loaded && remoteReady ? 'ready-online' : 'ready-offline');
    return { online: remoteReady, pending: queue.length, conflicts: conflictsCache.length };
  }

  async function close() {
    lifecycle++;
    try { if (client && channel && client.removeChannel) await client.removeChannel(channel); } catch (e) {}
    channel = null;
    cache = {};
    metaCache = {};
    queue = [];
    conflictsCache = [];
    activeUser = null;
    client = null;
    initialized = false;
    remoteReady = false;
    flushing = false;
    var badge = document.getElementById('azSyncBadge');
    if (badge) badge.hidden = true;
  }

  function moduleForTable(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    return Schema.MODULES.filter(function (m) { return m.table === table; })[0] || null;
  }

  function offlineAllowed(table, op, row) {
    if (table === 'audit') return true;
    var mod = moduleForTable(table);
    if (mod && mod.workflow) return ['draft', 'returned', null, undefined].indexOf(row && row.status) !== -1;
    if (OFFLINE_SAFE.indexOf(table) !== -1) {
      return !row || !row.createdBy || (activeUser && row.createdBy === activeUser.id);
    }
    return false;
  }

  function notifyBlocked() {
    var msg = global.I18N && I18N.getLang() === 'ar'
      ? 'هذا الإجراء يحتاج اتصالاً بالإنترنت. يمكنك حفظ المسودة الآن وإكمال الإجراء بعد عودة الاتصال.'
      : 'This action requires internet. Save a draft now and complete it when the connection returns.';
    if (global.UI && UI.toast) UI.toast(msg, 'error', 6000);
  }

  async function enqueue(job) {
    var userId = activeUser && activeUser.id;
    if (!userId) throw new Error('no-active-user');
    queue.push(job);
    if (global.OfflineDB) await OfflineDB.queueAdd(userId, job);
    emit('queued', { pending: queue.length });
    flush();
  }

  function queueWrite(op, table, row, baseUpdatedAt) {
    if (!activeUser) return false;
    if (!writableOnline() && !offlineAllowed(table, op, row)) { notifyBlocked(); return false; }
    var job = {
      queueId: uid('q'), op: op, table: table, row: clean(row),
      id: row && row.id, baseUpdatedAt: baseUpdatedAt || null, at: now()
    };
    enqueue(job).catch(function (e) { console.error('queue failed', e); });
    return true;
  }

  function replaceCached(table, row) {
    cache[table] = cache[table] || [];
    var idx = cache[table].findIndex(function (r) { return r.id === row.id; });
    if (idx === -1) cache[table].push(row); else cache[table][idx] = row;
  }

  function classifyError(error) {
    var text = String((error && (error.message || error.details || error.code)) || error || '').toLowerCase();
    if (!navigator.onLine || /fetch|network|timeout|connection|offline/.test(text)) return 'network';
    if (/row-level security|permission|not authorized|jwt|42501|401|403/.test(text)) return 'permission';
    if (/duplicate|unique|23505|conflict/.test(text)) return 'conflict';
    return 'server';
  }

  async function execute(job) {
    var res;
    if (job.op === 'insert') {
      res = await client.from(job.table).insert(job.row).select();
      if (res.error && String(res.error.code) === '23505') {
        var existing = await client.from(job.table).select('*').eq('id', job.id).maybeSingle();
        if (!existing.error && existing.data && existing.data.createdBy === job.row.createdBy) return existing.data;
      }
    } else if (job.op === 'update') {
      var query = client.from(job.table).update(job.row).eq('id', job.id);
      if (job.baseUpdatedAt) query = query.eq('updatedAt', job.baseUpdatedAt);
      res = await query.select();
      if (!res.error && !(res.data || []).length) throw new Error('conflict:record-changed-on-server');
    } else if (job.op === 'delete') {
      var del = client.from(job.table).delete().eq('id', job.id);
      if (job.baseUpdatedAt) del = del.eq('updatedAt', job.baseUpdatedAt);
      res = await del.select('id');
      if (!res.error && !(res.data || []).length) throw new Error('conflict:record-changed-on-server');
    } else if (job.op === 'meta') {
      res = await client.from('app_meta').upsert({ key: job.row.key, value: job.row.value }, { onConflict: 'key' }).select();
    } else {
      throw new Error('unsupported-operation');
    }
    if (res.error) throw res.error;
    return res.data && res.data[0] ? res.data[0] : job.row;
  }

  async function flush() {
    if (flushing || !online() || !queue.length || !initialized) return;
    flushing = true;
    var run = lifecycle;
    emit('syncing', { pending: queue.length });
    while (queue.length && online() && run === lifecycle) {
      var job = queue[0];
      try {
        var serverRow = await execute(job);
        if (run !== lifecycle) { flushing = false; return; }
        if (job.table !== 'app_meta' && job.op !== 'delete' && serverRow && serverRow.id) replaceCached(job.table, serverRow);
        queue.shift();
        if (global.OfflineDB) await OfflineDB.queueRemove(job.queueId);
      } catch (error) {
        if (run !== lifecycle) { flushing = false; return; }
        var type = classifyError(error);
        if (type === 'network') { remoteReady = false; break; }
        var detail = String(error.message || error);
        var conflict = global.OfflineDB
          ? await OfflineDB.conflictAdd(activeUser.id, job, detail)
          : { conflictId: uid('conf'), job: job, detail: detail, at: now() };
        conflictsCache.push(conflict);
        if (job.table !== 'app_meta') {
          // Never present a rejected optimistic write as saved. Preserve the
          // attempted row in the encrypted conflict record and flag the local
          // copy visibly until the user reviews it.
          var localRow = job.op === 'delete' ? job.row : (Store.find(job.table, job.id) || job.row);
          if (localRow && localRow.id) {
            replaceCached(job.table, Object.assign({}, localRow, { _syncState: 'conflict', _syncError: detail }));
          }
        }
        queue.shift();
        if (global.OfflineDB) await OfflineDB.queueRemove(job.queueId);
        emit(type === 'conflict' ? 'conflict' : 'sync-error', { table: job.table, id: job.id, error: detail });
      }
    }
    flushing = false;
    if (!queue.length) remoteReady = navigator.onLine !== false;
    await saveSnapshot();
    emit(queue.length ? 'offline' : 'synced', { pending: queue.length, conflicts: conflictsCache.length });
  }

  function subscribe() {
    if (!client || !client.channel || channel || navigator.onLine === false) return;
    try {
      channel = client.channel('alzahraa-live-' + activeUser.id);
      tableNames().filter(function (t) { return ['app_meta','users','employees','payroll'].indexOf(t) === -1; }).forEach(function (table) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: table }, function (payload) {
          var row = payload.new || payload.old;
          if (!row || !row.id) return;
          cache[table] = cache[table] || [];
          var idx = cache[table].findIndex(function (r) { return r.id === row.id; });
          if (payload.eventType === 'DELETE') { if (idx !== -1) cache[table].splice(idx, 1); }
          else if (idx === -1) cache[table].push(row);
          else cache[table][idx] = row;
          saveSnapshot();
          emit('remote-change', { table: table, id: row.id });
        });
      });
      channel.subscribe();
    } catch (e) { console.warn('realtime unavailable', e); }
  }

  function meta() { return Object.assign({}, metaCache); }

  function setMeta(patch) {
    if (!writableOnline()) { notifyBlocked(); return meta(); }
    Object.keys(patch || {}).forEach(function (key) {
      metaCache[key] = patch[key];
      var row = { key: key, value: patch[key] };
      cache.app_meta = cache.app_meta || [];
      var idx = cache.app_meta.findIndex(function (r) { return r.key === key; });
      if (idx === -1) cache.app_meta.push(row); else cache.app_meta[idx] = row;
      queueWrite('meta', 'app_meta', row);
    });
    saveSnapshot();
    return meta();
  }

  function nextDocNo(prefix) {
    return (prefix || 'DOC') + '-DRAFT-' + Date.now().toString(36).toUpperCase() + '-' + randomToken(4).toUpperCase();
  }

  var Store = {
    initialize: initialize,
    close: close,
    isInitialized: function () { return initialized; },
    isOnline: writableOnline,
    pending: function () { return queue.length; },
    conflicts: function () { return conflictsCache.slice(); },
    dismissConflict: async function (conflictId) {
      conflictsCache = conflictsCache.filter(function (item) { return item.conflictId !== conflictId; });
      if (global.OfflineDB) await OfflineDB.conflictRemove(conflictId);
      emit('conflict-dismissed', { conflicts: conflictsCache.length });
      return true;
    },
    flush: flush,
    reload: async function () { await loadRemote(); emit('remote-change', { table: '*' }); return true; },
    uid: uid,
    nextDocNo: nextDocNo,
    meta: meta,
    setMeta: setMeta,
    adapterName: function () { return 'supabase+encrypted-indexeddb'; },
    onChange: function (fn) { listeners.push(fn); },

    all: function (table) { return (cache[table] || []).slice(); },
    find: function (table, id) { return (cache[table] || []).filter(function (r) { return r.id === id; })[0] || null; },
    where: function (table, cond) {
      var rows = this.all(table);
      if (typeof cond === 'function') return rows.filter(cond);
      if (!cond) return rows;
      return rows.filter(function (row) {
        return Object.keys(cond).every(function (key) { return row[key] === cond[key]; });
      });
    },

    create: function (table, data, opts) {
      opts = opts || {};
      var row = Object.assign({}, data);
      row.id = row.id || uid(table);
      row.createdAt = row.createdAt || now();
      row.createdBy = activeUser ? activeUser.id : 'system';
      row.updatedAt = row.createdAt;
      row.updatedBy = row.createdBy;
      if (!writableOnline() && !offlineAllowed(table, 'insert', row)) { notifyBlocked(); return null; }
      row._syncState = 'pending';
      replaceCached(table, row);
      queueWrite('insert', table, row);
      if (opts.silent !== true) Store.log('create', table, row.id, row.docNo || row.name || row.id);
      saveSnapshot();
      return row;
    },

    save: function (table, id, patch, opts) {
      opts = opts || {};
      var original = Store.find(table, id);
      if (!original) return null;
      var updated = Object.assign({}, original, patch, {
        updatedAt: now(), updatedBy: activeUser ? activeUser.id : 'system', _syncState: 'pending'
      });
      if (!writableOnline() && !offlineAllowed(table, 'update', updated)) { notifyBlocked(); return null; }
      replaceCached(table, updated);
      queueWrite('update', table, updated, original.updatedAt || null);
      if (opts.silent !== true) Store.log('update', table, id, updated.docNo || updated.name || id);
      saveSnapshot();
      return updated;
    },

    destroy: function (table, id, opts) {
      opts = opts || {};
      var row = Store.find(table, id);
      if (!row) return false;
      if (!writableOnline()) { notifyBlocked(); return false; }
      cache[table] = (cache[table] || []).filter(function (r) { return r.id !== id; });
      queueWrite('delete', table, row, row.updatedAt || null);
      if (opts.silent !== true) Store.log('delete', table, id, row.docNo || row.name || id);
      saveSnapshot();
      return true;
    },

    replaceAll: function () { throw new Error('bulk-replace-disabled-in-production'); },
    wipe: function () { throw new Error('database-wipe-disabled-in-production'); },

    log: function (action, entity, recordId, label, extra) {
      cache.audit = cache.audit || [];
      cache.audit.push({
        id: uid('aud-local'), action: action, entity: entity, recordId: recordId || '',
        label: label || '', extra: extra || '', userId: activeUser ? activeUser.id : 'system',
        userName: activeUser ? activeUser.name : 'system', at: now(), _localOnly: true
      });
      if (cache.audit.length > 3000) cache.audit = cache.audit.slice(-2500);
    },
    auditLog: function () { return (cache.audit || []).slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); }); },

    exportAll: function () {
      var tables = {};
      Object.keys(cache).forEach(function (table) { tables[table] = cache[table].map(clean); });
      return { __app: 'alzahraa-portal', __version: 2, __scope: 'current-user', __at: now(), tables: tables, meta: meta() };
    },
    importAll: function () { return false; },
    usage: function () {
      var bytes = 0;
      try { bytes = new Blob([JSON.stringify(cache)]).size; } catch (e) {}
      var limit = 50 * 1024 * 1024;
      return { bytes: bytes, limit: limit, pct: Math.min(100, bytes / limit * 100), pending: queue.length, conflicts: conflictsCache.length };
    }
  };

  function paintStatus() {
    var el = document.getElementById('azSyncBadge');
    if (!el || !activeUser) return;
    var isAr = !global.I18N || I18N.getLang() === 'ar';
    el.hidden = false;
    el.className = 'sync-badge ' + (conflictsCache.length ? 'pending' : writableOnline() && !queue.length ? 'online' : queue.length ? 'pending' : 'offline');
    if (conflictsCache.length) el.textContent = (isAr ? 'تعارضات · ' : 'Conflicts · ') + conflictsCache.length;
    else if (writableOnline() && !queue.length) el.textContent = isAr ? 'متصل · تم الحفظ' : 'Online · saved';
    else if (queue.length) el.textContent = (isAr ? 'غير متصل · ' : 'Offline · ') + queue.length + (isAr ? ' في الانتظار' : ' pending');
    else el.textContent = isAr ? 'غير متصل' : 'Offline';
  }

  async function reconnect() {
    if (!initialized || !client || navigator.onLine === false) return;
    var run = lifecycle;
    remoteReady = false;
    emit('reconnecting');
    try {
      var probe = await client.from('app_meta').select('key').limit(1);
      if (run !== lifecycle) return;
      if (probe.error) throw probe.error;
      remoteReady = true;
      await flush();
      emit('online');
    } catch (error) {
      if (run === lifecycle) { remoteReady = false; emit('offline', { error: String(error.message || error) }); }
    }
  }

  global.addEventListener('online', function () { reconnect(); });
  global.addEventListener('offline', function () { remoteReady = false; emit('offline'); });
  global.Store = Store;
})(window);
