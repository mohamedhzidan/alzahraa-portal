/* Recovery data layer: partial remote loading + server-confirmed writes. */
(function (global) {
  'use strict';

  var cache = {};
  var metaCache = {};
  var client = null;
  var activeUser = null;
  var queue = [];
  var conflictsCache = [];
  var unavailable = {};
  var stale = {};
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
  function online() { return navigator.onLine !== false && !!client; }
  function writableOnline() { return online() && remoteReady; }

  function emit(type, detail) {
    listeners.forEach(function (fn) { try { fn(type, detail || {}); } catch (e) {} });
    try {
      global.dispatchEvent(new CustomEvent('alzahraa:store', { detail: { type: type, data: detail || {} } }));
    } catch (e) {}
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

  function addName(names, name) {
    if (name && names.indexOf(name) === -1) names.push(name);
  }

  function tableNames() {
    var names = ['app_meta', 'audit'];
    if (activeUser && ['admin', 'gm', 'finance_manager', 'hr', 'auditor'].indexOf(activeUser.role) !== -1) addName(names, 'users');
    if (global.Schema && Schema.MODULES) {
      Schema.MODULES.forEach(function (mod) {
        if (!global.Auth || Auth.canSee(mod.id)) {
          addName(names, mod.table);
          var fields = (mod.fields || []).slice();
          if (mod.lines && mod.lines.fields) fields = fields.concat(mod.lines.fields);
          fields.forEach(function (f) {
            if (f && f.type === 'ref' && f.ref) {
              var target = Schema.get(f.ref);
              if (target) addName(names, target.table);
            }
          });
        }
      });
    }
    return names;
  }

  function sourceFor(table) {
    if (table === 'users') return 'portal_users';
    if (table === 'employees') return 'portal_employees';
    return table;
  }

  async function fetchTable(table) {
    var rows = [], from = 0, pageSize = 1000;
    var source = sourceFor(table);
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
    if (!activeUser || !global.OfflineDB || !global.ALZAHRAA_CONFIG || !ALZAHRAA_CONFIG.offlineEnabled) return;
    try {
      await OfflineDB.saveSnapshot(activeUser.id, {
        version: 3,
        savedAt: now(),
        tables: cache,
        meta: metaCache
      });
    } catch (e) { console.warn('offline snapshot failed', e); }
  }

  async function loadSnapshot() {
    if (!activeUser || !global.OfflineDB || !global.ALZAHRAA_CONFIG || !ALZAHRAA_CONFIG.offlineEnabled) return false;
    var snap = await OfflineDB.loadSnapshot(activeUser.id, ALZAHRAA_CONFIG.cacheMaxAgeDays || 30);
    if (!snap || !snap.tables) return false;
    cache = snap.tables || {};
    metaCache = snap.meta || {};
    if (!cache.users) cache.users = [];
    if (!cache.users.some(function (u) { return u.id === activeUser.id; })) cache.users.push(activeUser);
    return true;
  }

  function classifyError(error) {
    var text = String((error && (error.message || error.details || error.code)) || error || '').toLowerCase();
    if (!navigator.onLine || /fetch|network|timeout|connection|offline/.test(text)) return 'network';
    if (/row-level security|permission|not authorized|jwt|42501|401|403/.test(text)) return 'permission';
    if (/duplicate|unique|23505|conflict/.test(text)) return 'conflict';
    return 'server';
  }

  async function loadRemote() {
    remoteReady = false;
    unavailable = {};
    stale = {};
    var names = tableNames();
    var results = await Promise.all(names.map(async function (table) {
      try { return { table: table, rows: await fetchTable(table) }; }
      catch (error) { return { table: table, error: error }; }
    }));

    var successes = 0;
    var networkFailures = 0;
    results.forEach(function (result) {
      if (result.error) {
        var detail = String(result.error.message || result.error);
        unavailable[result.table] = detail;
        if (classifyError(result.error) === 'network') networkFailures++;
        if (cache[result.table] && cache[result.table].length) stale[result.table] = true;
        console.warn('table unavailable', result.table, detail);
      } else {
        cache[result.table] = result.rows || [];
        delete unavailable[result.table];
        delete stale[result.table];
        successes++;
      }
    });

    if (!successes && results.length && networkFailures === results.length) {
      throw new Error('database-network-failed');
    }

    cache.users = cache.users || [];
    var i = cache.users.findIndex(function (u) { return u.id === activeUser.id; });
    if (i === -1) cache.users.push(activeUser); else cache.users[i] = activeUser;
    absorbMeta();
    remoteReady = online();
    await saveSnapshot();
    if (Object.keys(unavailable).length) {
      emit('partial-data', { unavailable: Object.keys(unavailable), stale: Object.keys(stale) });
    }
    return { successes: successes, failures: Object.keys(unavailable).length };
  }

  async function initialize(supabaseClient, user) {
    lifecycle++;
    client = supabaseClient;
    activeUser = user;
    cache = {};
    metaCache = {};
    unavailable = {};
    stale = {};
    queue = global.OfflineDB ? await OfflineDB.queueList(user.id) : [];
    queue = queue.filter(function (job) { return job && job.op && job.table; });
    conflictsCache = global.OfflineDB ? await OfflineDB.conflicts(user.id) : [];

    var snapshotLoaded = await loadSnapshot();
    var remoteLoaded = false;
    if (navigator.onLine !== false) {
      try { await loadRemote(); remoteLoaded = true; }
      catch (e) { console.warn('remote startup failed', e); }
    }
    if (!remoteLoaded && !snapshotLoaded) throw new Error('first-login-requires-internet');

    initialized = true;
    subscribe();
    flush();
    emit(remoteLoaded ? (Object.keys(unavailable).length ? 'ready-partial' : 'ready-online') : 'ready-offline');
    return {
      online: remoteReady,
      partial: Object.keys(unavailable).length > 0,
      unavailable: Object.keys(unavailable),
      pending: queue.length,
      conflicts: conflictsCache.length
    };
  }

  async function close() {
    lifecycle++;
    try { if (client && channel && client.removeChannel) await client.removeChannel(channel); } catch (e) {}
    channel = null;
    cache = {};
    metaCache = {};
    queue = [];
    conflictsCache = [];
    unavailable = {};
    stale = {};
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
      ? 'هذا الإجراء يحتاج اتصالاً آمناً بالخادم. احفظ مسودة محلية إذا كانت الشاشة تسمح بذلك.'
      : 'This action needs a safe server connection. Save a local draft if this screen allows it.';
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

  function removeCached(table, id) {
    cache[table] = (cache[table] || []).filter(function (r) { return r.id !== id; });
  }

  async function execute(job) {
    var res;
    if (job.op === 'insert') {
      res = await client.from(job.table).insert(job.row).select();
      if (res.error && String(res.error.code) === '23505') {
        var existing = await client.from(job.table).select('*').eq('id', job.id).maybeSingle();
        if (!existing.error && existing.data && existing.data.createdBy === job.row.createdBy) return existing.data;
      }
      if (!res.error && !(res.data || []).length) throw new Error('server-write-not-readable:' + job.table);
    } else if (job.op === 'update') {
      var query = client.from(job.table).update(job.row).eq('id', job.id);
      if (job.baseUpdatedAt) query = query.eq('updatedAt', job.baseUpdatedAt);
      res = await query.select();
      if (!res.error && !(res.data || []).length) throw new Error('conflict-or-write-not-readable:' + job.table);
    } else if (job.op === 'delete') {
      var del = client.from(job.table).delete().eq('id', job.id);
      if (job.baseUpdatedAt) del = del.eq('updatedAt', job.baseUpdatedAt);
      res = await del.select('id');
      if (!res.error && !(res.data || []).length) throw new Error('conflict-or-delete-not-readable:' + job.table);
    } else if (job.op === 'meta') {
      res = await client.from('app_meta').upsert({ key: job.row.key, value: job.row.value }, { onConflict: 'key' }).select();
      if (!res.error && !(res.data || []).length) throw new Error('meta-write-not-readable');
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
        if (job.op === 'delete') removeCached(job.table, job.id);
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
          var localRow = job.op === 'delete' ? job.row : (Store.find(job.table, job.id) || job.row);
          if (localRow && localRow.id) replaceCached(job.table, Object.assign({}, localRow, { _syncState: 'conflict', _syncError: detail }));
        }
        queue.shift();
        if (global.OfflineDB) await OfflineDB.queueRemove(job.queueId);
        emit(type === 'conflict' ? 'conflict' : 'sync-error', { table: job.table, id: job.id, error: detail });
      }
    }
    flushing = false;
    if (!queue.length && online()) remoteReady = true;
    await saveSnapshot();
    emit(queue.length ? 'offline' : 'synced', { pending: queue.length, conflicts: conflictsCache.length });
  }

  function subscribe() {
    if (!client || !client.channel || channel || navigator.onLine === false) return;
    try {
      channel = client.channel('alzahraa-live-' + activeUser.id);
      tableNames().filter(function (t) {
        return ['app_meta', 'users', 'employees', 'payroll'].indexOf(t) === -1 && !unavailable[t];
      }).forEach(function (table) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: table }, function (payload) {
          var row = payload.new || payload.old;
          if (!row || !row.id) return;
          if (payload.eventType === 'DELETE') removeCached(table, row.id);
          else replaceCached(table, row);
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

  function prepareRow(data, id, createdAt, createdBy) {
    var row = Object.assign({}, data);
    row.id = id || row.id || uid('rec');
    row.createdAt = createdAt || row.createdAt || now();
    row.createdBy = createdBy || row.createdBy || (activeUser ? activeUser.id : 'system');
    row.updatedAt = now();
    row.updatedBy = activeUser ? activeUser.id : row.createdBy;
    return row;
  }

  async function createConfirmed(table, data, opts) {
    opts = opts || {};
    if (!writableOnline()) throw new Error('online-required');
    if (unavailable[table]) throw new Error('table-unavailable:' + table + ':' + unavailable[table]);
    var row = prepareRow(data);
    var serverRow = await execute({ op: 'insert', table: table, row: clean(row), id: row.id, baseUpdatedAt: null });
    replaceCached(table, serverRow);
    if (opts.silent !== true) Store.log('create', table, serverRow.id, serverRow.docNo || serverRow.name || serverRow.id);
    await saveSnapshot();
    emit('write-confirmed', { op: 'create', table: table, id: serverRow.id });
    return serverRow;
  }

  async function saveConfirmed(table, id, patch, opts) {
    opts = opts || {};
    if (!writableOnline()) throw new Error('online-required');
    if (unavailable[table]) throw new Error('table-unavailable:' + table + ':' + unavailable[table]);
    var original = Store.find(table, id);
    if (!original) throw new Error('record-not-loaded:' + table + ':' + id);
    var updated = prepareRow(Object.assign({}, original, patch), id, original.createdAt, original.createdBy);
    var serverRow = await execute({ op: 'update', table: table, row: clean(updated), id: id, baseUpdatedAt: original.updatedAt || null });
    replaceCached(table, serverRow);
    if (opts.silent !== true) Store.log('update', table, id, serverRow.docNo || serverRow.name || id);
    await saveSnapshot();
    emit('write-confirmed', { op: 'update', table: table, id: id });
    return serverRow;
  }

  async function destroyConfirmed(table, id, opts) {
    opts = opts || {};
    if (!writableOnline()) throw new Error('online-required');
    if (unavailable[table]) throw new Error('table-unavailable:' + table + ':' + unavailable[table]);
    var row = Store.find(table, id);
    if (!row) throw new Error('record-not-loaded:' + table + ':' + id);
    await execute({ op: 'delete', table: table, row: clean(row), id: id, baseUpdatedAt: row.updatedAt || null });
    removeCached(table, id);
    if (opts.silent !== true) Store.log('delete', table, id, row.docNo || row.name || id);
    await saveSnapshot();
    emit('write-confirmed', { op: 'delete', table: table, id: id });
    return true;
  }

  var Store = {
    initialize: initialize,
    close: close,
    isInitialized: function () { return initialized; },
    isOnline: function () { return writableOnline(); },
    isTableAvailable: function (table) { return !unavailable[table]; },
    tableStatus: function (table) {
      if (unavailable[table] && stale[table]) return 'stale';
      if (unavailable[table]) return 'unavailable';
      return 'ready';
    },
    tableError: function (table) { return unavailable[table] || ''; },
    unavailableTables: function () { return Object.assign({}, unavailable); },
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
    adapterName: function () { return 'supabase+encrypted-indexeddb-recovery'; },
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
      var row = prepareRow(data);
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
      var updated = prepareRow(Object.assign({}, original, patch), id, original.createdAt, original.createdBy);
      updated._syncState = 'pending';
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
      removeCached(table, id);
      queueWrite('delete', table, row, row.updatedAt || null);
      if (opts.silent !== true) Store.log('delete', table, id, row.docNo || row.name || id);
      saveSnapshot();
      return true;
    },
    createConfirmed: createConfirmed,
    saveConfirmed: saveConfirmed,
    destroyConfirmed: destroyConfirmed,
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
      return { __app: 'alzahraa-portal', __version: 3, __scope: 'current-user', __at: now(), tables: tables, meta: meta() };
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
    var ar = !global.I18N || I18N.getLang() === 'ar';
    var partial = Object.keys(unavailable).length;
    el.hidden = false;
    el.className = 'sync-badge ' + (conflictsCache.length || partial ? 'pending' : writableOnline() && !queue.length ? 'online' : queue.length ? 'pending' : 'offline');
    if (conflictsCache.length) el.textContent = (ar ? 'تعارضات · ' : 'Conflicts · ') + conflictsCache.length;
    else if (partial) el.textContent = (ar ? 'بيانات جزئية · ' : 'Partial data · ') + partial;
    else if (writableOnline() && !queue.length) el.textContent = ar ? 'متصل · تم الحفظ' : 'Online · saved';
    else if (queue.length) el.textContent = (ar ? 'غير متصل · ' : 'Offline · ') + queue.length + (ar ? ' في الانتظار' : ' pending');
    else el.textContent = ar ? 'غير متصل' : 'Offline';
  }

  async function reconnect() {
    if (!initialized || !client || navigator.onLine === false) return;
    var run = lifecycle;
    remoteReady = false;
    emit('reconnecting');
    try {
      await loadRemote();
      if (run !== lifecycle) return;
      remoteReady = true;
      await flush();
      emit(Object.keys(unavailable).length ? 'partial-data' : 'online', { unavailable: Object.keys(unavailable) });
    } catch (error) {
      if (run === lifecycle) { remoteReady = false; emit('offline', { error: String(error.message || error) }); }
    }
  }

  global.addEventListener('online', function () { reconnect(); });
  global.addEventListener('offline', function () { remoteReady = false; emit('offline'); });
  global.Store = Store;
})(window);
