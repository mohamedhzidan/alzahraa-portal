/* Encrypted, per-user IndexedDB cache and offline draft queue. */
(function (global) {
  'use strict';

  var DB_NAME = 'alzahraa-portal-production';
  var DB_VERSION = 1;
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('indexeddb-unavailable')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys');
        if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots');
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles');
        if (!db.objectStoreNames.contains('queue')) {
          var q = db.createObjectStore('queue', { keyPath: 'queueId' });
          q.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('conflicts')) {
          var c = db.createObjectStore('conflicts', { keyPath: 'conflictId' });
          c.createIndex('userId', 'userId', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('indexeddb-open-failed')); };
    });
    return dbPromise;
  }

  function request(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('indexeddb-request-failed')); };
    });
  }

  async function transaction(storeName, mode, fn) {
    var db = await open();
    var tx = db.transaction(storeName, mode);
    var result = await fn(tx.objectStore(storeName));
    await new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('indexeddb-transaction-failed')); };
      tx.onabort = function () { reject(tx.error || new Error('indexeddb-transaction-aborted')); };
    });
    return result;
  }

  async function keyFor(userId) {
    var existing = await transaction('keys', 'readonly', function (s) { return request(s.get(userId)); });
    if (existing) return existing;
    if (!global.crypto || !crypto.subtle) throw new Error('webcrypto-unavailable');
    var key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await transaction('keys', 'readwrite', function (s) { return request(s.put(key, userId)); });
    return key;
  }

  function bytesToBase64(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return btoa(out);
  }

  function base64ToBytes(value) {
    var raw = atob(value), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function seal(userId, value) {
    var key = await keyFor(userId);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var plain = new TextEncoder().encode(JSON.stringify(value));
    var cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
    return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(cipher)), at: new Date().toISOString() };
  }

  async function unseal(userId, payload) {
    if (!payload || !payload.iv || !payload.data) return null;
    var key = await keyFor(userId);
    var plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(payload.iv) }, key, base64ToBytes(payload.data)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function saveSnapshot(userId, snapshot) {
    var payload = await seal(userId, snapshot);
    return transaction('snapshots', 'readwrite', function (s) { return request(s.put(payload, userId)); });
  }

  async function loadSnapshot(userId, maxAgeDays) {
    var payload = await transaction('snapshots', 'readonly', function (s) { return request(s.get(userId)); });
    if (!payload) return null;
    var age = Date.now() - new Date(payload.at).getTime();
    if (maxAgeDays && age > maxAgeDays * 86400000) return null;
    try { return await unseal(userId, payload); } catch (e) { return null; }
  }

  async function saveProfile(userId, profile) {
    var payload = await seal(userId, profile);
    return transaction('profiles', 'readwrite', function (s) { return request(s.put(payload, userId)); });
  }

  async function loadProfile(userId) {
    var payload = await transaction('profiles', 'readonly', function (s) { return request(s.get(userId)); });
    try { return payload ? await unseal(userId, payload) : null; } catch (e) { return null; }
  }

  async function queueAdd(userId, job) {
    var row = { queueId: job.queueId, userId: userId, payload: await seal(userId, job), at: job.at };
    return transaction('queue', 'readwrite', function (s) { return request(s.put(row)); });
  }

  async function queueList(userId) {
    var rows = await transaction('queue', 'readonly', function (s) { return request(s.index('userId').getAll(userId)); });
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      try { out.push(await unseal(userId, rows[i].payload)); } catch (e) {}
    }
    return out.sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
  }

  function queueRemove(queueId) {
    return transaction('queue', 'readwrite', function (s) { return request(s.delete(queueId)); });
  }

  async function conflictAdd(userId, job, detail) {
    if (!global.crypto || !crypto.getRandomValues) throw new Error('secure-random-unavailable');
    var random = crypto.getRandomValues(new Uint8Array(8));
    var token = Array.prototype.map.call(random, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
    var conflictId = 'conf_' + token;
    var value = { conflictId: conflictId, job: job, detail: detail || '', at: new Date().toISOString() };
    var row = { conflictId: conflictId, userId: userId, payload: await seal(userId, value), at: value.at };
    await transaction('conflicts', 'readwrite', function (s) { return request(s.put(row)); });
    return value;
  }

  async function conflicts(userId) {
    var rows = await transaction('conflicts', 'readonly', function (s) { return request(s.index('userId').getAll(userId)); });
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      try { out.push(await unseal(userId, rows[i].payload)); } catch (e) {}
    }
    return out;
  }

  function conflictRemove(conflictId) {
    return transaction('conflicts', 'readwrite', function (s) { return request(s.delete(conflictId)); });
  }

  async function clearUser(userId) {
    await transaction('snapshots', 'readwrite', function (s) { return request(s.delete(userId)); });
    await transaction('profiles', 'readwrite', function (s) { return request(s.delete(userId)); });
    var jobs = await queueList(userId);
    for (var i = 0; i < jobs.length; i++) await queueRemove(jobs[i].queueId);
  }

  global.OfflineDB = {
    open: open,
    saveSnapshot: saveSnapshot,
    loadSnapshot: loadSnapshot,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    queueAdd: queueAdd,
    queueList: queueList,
    queueRemove: queueRemove,
    conflictAdd: conflictAdd,
    conflicts: conflicts,
    conflictRemove: conflictRemove,
    clearUser: clearUser
  };
})(window);
