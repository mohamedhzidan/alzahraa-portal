/* Dedicated encrypted local drafts. These never enter the automatic sync queue. */
(function (global) {
  'use strict';

  var DB_NAME = 'alzahraa-portal-local-drafts';
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
        if (!db.objectStoreNames.contains('drafts')) {
          var s = db.createObjectStore('drafts', { keyPath: 'draftId' });
          s.createIndex('userId', 'userId', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('draft-db-open-failed')); };
    });
    return dbPromise;
  }

  function request(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('draft-db-request-failed')); };
    });
  }

  async function tx(store, mode, fn) {
    var db = await open();
    var tr = db.transaction(store, mode);
    var value = await fn(tr.objectStore(store));
    await new Promise(function (resolve, reject) {
      tr.oncomplete = resolve;
      tr.onerror = function () { reject(tr.error || new Error('draft-db-transaction-failed')); };
      tr.onabort = function () { reject(tr.error || new Error('draft-db-transaction-aborted')); };
    });
    return value;
  }

  async function keyFor(userId) {
    var key = await tx('keys', 'readonly', function (s) { return request(s.get(userId)); });
    if (key) return key;
    if (!global.crypto || !crypto.subtle) throw new Error('webcrypto-unavailable');
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await tx('keys', 'readwrite', function (s) { return request(s.put(key, userId)); });
    return key;
  }

  function b64(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return btoa(out);
  }
  function unb64(value) {
    var raw = atob(value), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function seal(userId, value) {
    var key = await keyFor(userId);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var plain = new TextEncoder().encode(JSON.stringify(value));
    var cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
    return { iv: b64(iv), data: b64(new Uint8Array(cipher)) };
  }
  async function unseal(userId, payload) {
    var key = await keyFor(userId);
    var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(payload.iv) }, key, unb64(payload.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function token() {
    var bytes = crypto.getRandomValues(new Uint8Array(10));
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function save(userId, draft) {
    if (!userId) throw new Error('no-active-user');
    var value = Object.assign({}, draft);
    value.draftId = value.draftId || 'draft_' + token();
    value.savedAt = new Date().toISOString();
    var payload = await seal(userId, value);
    await tx('drafts', 'readwrite', function (s) {
      return request(s.put({ draftId: value.draftId, userId: userId, savedAt: value.savedAt, payload: payload }));
    });
    return value;
  }

  async function list(userId) {
    var rows = await tx('drafts', 'readonly', function (s) { return request(s.index('userId').getAll(userId)); });
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      try { out.push(await unseal(userId, rows[i].payload)); } catch (e) { console.warn('local draft decrypt failed', e); }
    }
    return out.sort(function (a, b) { return new Date(b.savedAt) - new Date(a.savedAt); });
  }

  async function remove(userId, draftId) {
    var row = await tx('drafts', 'readonly', function (s) { return request(s.get(draftId)); });
    if (!row || row.userId !== userId) throw new Error('draft-not-owned');
    await tx('drafts', 'readwrite', function (s) { return request(s.delete(draftId)); });
    return true;
  }

  async function clearUser(userId) {
    var rows = await tx('drafts', 'readonly', function (s) { return request(s.index('userId').getAll(userId)); });
    for (var i = 0; i < rows.length; i++) {
      var draftId = rows[i].draftId;
      await tx('drafts', 'readwrite', function (s) { return request(s.delete(draftId)); });
    }
  }

  global.DraftDB = { open: open, save: save, list: list, remove: remove, clearUser: clearUser };
})(window);
