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

  /* ═══════════════════════════════════════════════════════════════════
     🔴 صفٌّ واحد سيّئ كان يُخفي الطابور كلّه — أُصلح ٣٠ أغسطس ٢٠٢٦

     ما كان يحدث، مُثبَتاً بالتشغيل (TESTS/engineer-offline-day-trial.js
     قسم D2): صفّ تالف الشكل يجعل unseal تُرجع **null** (سطر ٨٣، لا ترمي)،
     فيدخل null إلى المصفوفة، ثم يحاول الفرز أدناه قراءة `a.at` من null
     فيرمي — والرمي كان يهرب من هذه الدالة كلّها. وحارس الدخول
     (offline-db-guard.js) يلتقطه ويُرجع [] نظيفة، فتصير النتيجة: خمسة
     صفوف مخزّنة، صفر معروضة، الشارة تختفي، ولا شيء يُرفع. عمل يوم كامل
     يبقى على الجهاز غير مرئي.

     القاعدة المطبَّقة هنا، وهي ثلاث قواعد في تغيير واحد:
       ١) فشل صفّ واحد يبقى في صفّه — لا يُسقط جيرانه أبداً.
       ٢) unseal التي تُرجع null وunseal التي ترمي تُعامَلان بالضبط نفس
          المعاملة — الفرق بينهما كان مصدر العطل كلّه.
       ٣) الصفوف غير المقروءة تُعَدّ ويُبلَّغ عنها، ولا تُتجاهَل بصمت.

     لماذا العدّاد غير قابل للتعداد (non-enumerable): كل من ينادي هذه
     الدالة اليوم يتوقّع مصفوفة عادية (store.js:145، save-modes.js:158
     و:202 و:391). خاصية غير قابلة للتعداد لا تظهر في أي حلقة ولا في
     JSON.stringify ولا في نسخ المصفوفة — فلا يتغيّر شكل شيء لأي قارئ
     قائم، بينما تستطيع شارة «بانتظار الرفع» قراءتها حين تُبنى.

     🔴 ONE BAD ROW USED TO HIDE THE WHOLE QUEUE — fixed 30 Aug 2026.

     Proven by running (TESTS/engineer-offline-day-trial.js, section D2): a
     malformed row makes unseal RETURN NULL (line 83, it does not throw),
     null enters the array, the sort below then reads `a.at` off null and
     THROWS, and that throw escaped this whole function. The sign-in guard
     (offline-db-guard.js) caught it and returned a clean [] — so five rows
     stored became zero shown, the badge disappeared, and nothing flushed.
     A full day's work sat on the device, invisible.

     Three rules in one change: (1) a per-row failure stays per-row and
     never removes its neighbours; (2) unseal-returns-null and
     unseal-throws are handled identically — the difference between them
     WAS the bug; (3) unreadable rows are counted and reported, never
     silently skipped.

     Why the counter is non-enumerable: every current caller expects a
     plain array (store.js:145, save-modes.js:158/:202/:391). A
     non-enumerable property never appears in a loop, in JSON.stringify or
     in an array copy — so no existing reader changes shape at all, while
     the "waiting to upload" indicator can read it when it is built.
     ═══════════════════════════════════════════════════════════════════ */
  function withUnreadableCount(list, unreadable) {
    try {
      Object.defineProperty(list, '__unreadable', {
        value: unreadable.slice(), enumerable: false, writable: false, configurable: true
      });
    } catch (e) { /* لا نُفشل القراءة كلها لأجل عدّاد · never fail the read for a counter */ }
    return list;
  }

  async function readSealedRows(storeName, userId, keyName) {
    var rows = await transaction(storeName, 'readonly', function (s) { return request(s.index('userId').getAll(userId)); });
    var out = [], unreadable = [];
    for (var i = 0; i < rows.length; i++) {
      var one = null;
      /* null والرمي: نفس المعاملة تماماً · null and throw: treated identically */
      try { one = await unseal(userId, rows[i].payload); } catch (e) { one = null; }
      if (one && one.at) out.push(one);
      else unreadable.push(rows[i] && rows[i][keyName]);
    }
    if (unreadable.length) {
      try {
        console.warn('[offline-db] ' + unreadable.length + ' of ' + rows.length +
          ' stored ' + storeName + ' row(s) could not be read; the rest are intact and are NOT hidden.',
          unreadable);
      } catch (e) {}
    }
    return withUnreadableCount(out, unreadable);
  }

  async function queueList(userId) {
    var out = await readSealedRows('queue', userId, 'queueId');
    var unreadable = out.__unreadable || [];
    /* الفرز آمن الآن لأن كل عنصر باقٍ يحمل `at` حقيقياً (فُحص أعلاه)
       the sort is safe now because every surviving row has a real `at` */
    out.sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
    return withUnreadableCount(out, unreadable);
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

  /* التوأم الذي لم يسمّه أحد: نفس الالتقاط الفارغ بالضبط كان هنا أيضاً.
     التعارضات أقلّ خطراً من الطابور (لا فرز يرمي هنا)، لكن صفّاً غير مقروء
     كان يختفي بلا عدّ أيضاً — ونفس القاعدة تنطبق.
     The twin nobody had named: the identical empty catch was here too.
     Conflicts are less dangerous than the queue (no sort to throw), but an
     unreadable row still vanished uncounted — the same rule applies. */
  async function conflicts(userId) {
    return readSealedRows('conflicts', userId, 'conflictId');
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
