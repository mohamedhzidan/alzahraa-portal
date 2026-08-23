/* =========================================================================
   save-guard.js — تأكيد أن ما حُفظ قد وصل فعلاً
                   Proving that what was saved actually arrived
   -------------------------------------------------------------------------
   المشكلة التي يعالجها هذا الملف — وهي أخطر مشكلة في النظام كله

   أ. أحمد يكتب مستنداً، يضغط «حفظ»، يقرأ «تم الحفظ»، ثم يحدّث الصفحة
   فلا يجد شيئاً. لا رسالة خطأ، ولا علامة، ولا أثر.

   السبب في store.js:

       Store.create()  →  يضع الصف في الذاكرة
                       →  يضيفه لطابور الإرسال
                       →  return row          ← «تم الحفظ» تظهر هنا،
                                                 قبل أن يردّ الخادم أصلاً

   ثم في execute():

       return res.data && res.data[0] ? res.data[0] : job.row;

   فإذا سمحت قاعدة البيانات بالإدراج ومنعت القراءة — وهو ما يحدث عندما
   تُرجع دالة az_role() قيمة فارغة — يعود الردّ بلا خطأ وبلا صفوف،
   فيعتبره النظام نجاحاً كاملاً ويمسح الطابور. الصف ضاع بصمت.

   THE PROBLEM THIS FILE SOLVES — the most dangerous one in the portal.

   Ahmed writes a document, presses Save, reads "saved", refreshes, and
   finds nothing. No error, no mark, no trace.

   store.js shows "saved" the moment the row enters the outbound queue,
   before the server has replied. And in execute(), a reply with no error
   and no rows is treated as success. That is exactly what an insert
   returns when the write is permitted but the read-back is blocked by
   row security — which happens whenever az_role() returns null.

   -------------------------------------------------------------------------
   ما يفعله هذا الملف

   بعد كل حفظ، يسأل الخادم مباشرة: هل هذا الصف موجود عندك؟
   إن لم يكن موجوداً، يظهر تحذير أحمر لا يُغلق تلقائياً، مع سبب الرفض
   الحقيقي من قاعدة البيانات، وتبقى بيانات المستخدم معروضة أمامه لينسخها.

   After every save it asks the server directly: do you have this row?
   If not, it shows a red warning that does not dismiss itself, carrying
   the database's real reason, and keeps the data on screen to be copied.

   لا يغيّر هذا الملف طريقة الحفظ ولا يمنع شيئاً. يتحقّق ويخبر فقط.
   This file changes nothing about how saving works. It verifies and tells.

   إضافي بالكامل · ADDITIVE. Delete it and the portal behaves as before.
   يُحمَّل بعد store.js — ويُفضَّل في آخر القائمة.
   ========================================================================= */
(function (global) {
  'use strict';

  var WAIT_MS = 2500;      /* مهلة قبل السؤال — تكفي لإتمام الإرسال */

  /* ⚠️ خطآن كشفهما الاختبار في هذا الملف نفسه:
     ١) كان يتذكّر الصف بمعرّفه للأبد، فتعديل نفس المستند مرة ثانية لا
        يُفحص إطلاقاً — وهو أكثر ما يفعله ضابط المستندات: يفتح ويعدّل.
     ٢) بعد أول إنذار كان يصمت للأبد، فلو فشلت عشرة حفظات بعده لما
        عرف أحد. حارس يصمت بعد أول مشكلة ليس حارساً.

     TWO BUGS THE TEST FOUND IN THIS FILE ITSELF:
     1) it remembered a row id forever, so editing the same document a
        second time was never checked — and editing is most of the work.
     2) after the first alarm it went silent permanently. A guard that
        stops warning after the first problem is not a guard. */
  var lastCheck = {};      /* معرّف الصف → وقت آخر فحص */
  var REPEAT_MS = 10000;   /* لا نكرّر الفحص لنفس الصف خلال عشر ثوانٍ */

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }

  function moduleForTable(table) {
    if (!global.Schema || !Schema.MODULES) return null;
    return Schema.MODULES.filter(function (m) { return m.table === table; })[0] || null;
  }
  function screenName(table) {
    var m = moduleForTable(table);
    return m ? L(m.label) : table;
  }

  /* ═══════════════════════════════════════════════════════════════════
     التحقّق — نسأل الخادم عن الصف بالاسم
     ═══════════════════════════════════════════════════════════════════ */
  function verify(table, id, what) {
    if (!id) return;
    var now = Date.now();
    if (lastCheck[id] && now - lastCheck[id] < REPEAT_MS) return;
    lastCheck[id] = now;

    /* دون اتصال: الصف في الطابور بحق، وهذا سلوك سليم لا تحذير فيه. */
    if (global.Store && Store.isOnline && !Store.isOnline()) return;
    var client = global.Auth && Auth.client && Auth.client();
    if (!client) return;

    setTimeout(function () {
      var q;
      try { q = client.from(table).select('id').eq('id', id).maybeSingle(); }
      catch (e) { return; }

      Promise.resolve(q).then(function (res) {
        if (res && !res.error && res.data && res.data.id) return;   /* وصل — لا شيء */

        /* لم يصل. اسأل مرة أخرى بعد مهلة أطول قبل الإزعاج، فقد يكون
           الطابور بطيئاً على اتصال ضعيف في الموقع. */
        setTimeout(function () {
          Promise.resolve(client.from(table).select('id').eq('id', id).maybeSingle())
            .then(function (again) {
              if (again && !again.error && again.data && again.data.id) return;
              alarm(table, id, what, (again && again.error) || (res && res.error));
            })
            .catch(function () { alarm(table, id, what, res && res.error); });
        }, 4000);
      }).catch(function (err) { alarm(table, id, what, err); });
    }, WAIT_MS);
  }

  /* ═══════════════════════════════════════════════════════════════════
     الإنذار — أحمر، لا يُغلق وحده، ويحمل السبب الحقيقي
     ═══════════════════════════════════════════════════════════════════ */
  var alarmShown = false;
  function alarm(table, id, what, error) {
    var detail = error ? String(error.message || error.details || error.code || error) : '';

    console.error('[save-guard] NOT SAVED on the server · table=' + table +
                  ' id=' + id + (detail ? ' · ' + detail : ''));

    /* شريط أحمر ثابت أعلى الصفحة — يبقى حتى يُغلق يدوياً */
    banner(table);

    if (alarmShown || !global.UI || !UI.modal) return;
    alarmShown = true;
    /* يعود الحارس للعمل بعد نصف دقيقة حتى لو أُغلقت النافذة بالـ×.
       The guard re-arms after thirty seconds even if the window was
       closed with the × instead of the button. */
    setTimeout(function () { alarmShown = false; }, 30000);

    var why = '';
    if (/permission|row-level|42501|401|403/i.test(detail)) {
      why = L({
        ar: 'قاعدة البيانات رفضت الكتابة لأسباب صلاحيات.',
        en: 'The database refused the write on permission grounds.' });
    } else if (/column|42703/i.test(detail)) {
      why = L({
        ar: 'الشاشة أرسلت حقلاً لا يوجد له عمود في قاعدة البيانات، فرُفض الصف كله.',
        en: 'The screen sent a field with no column in the database, so the whole row was refused.' });
    } else if (/relation|42P01/i.test(detail)) {
      why = L({
        ar: 'الجدول نفسه غير موجود في قاعدة البيانات.',
        en: 'The table itself does not exist in the database.' });
    } else if (!detail) {
      why = L({
        ar: 'لم تُرجع قاعدة البيانات خطأً، ومع ذلك لا يوجد الصف عندها. ' +
            'هذا يحدث عندما يُسمح بالكتابة ويُمنع القراءة — أي أن دالة az_role() ' +
            'تُرجع قيمة فارغة لحسابك. أشهر سبب: كلمة المرور لم تُغيَّر بعد.',
        en: 'The database returned no error, yet the row is not there. That happens when ' +
            'the write is permitted and the read is blocked — az_role() returning null for ' +
            'your account. The commonest cause is a password that has not been changed yet.' });
    }

    UI.modal({
      title: L({ ar: '⛔ لم يُحفظ على الخادم', en: '⛔ Not saved on the server' }),
      body:
        '<div class="alert alert-danger">' + esc(L({
          ar: 'ما كتبتَه لم يصل إلى قاعدة البيانات. سيختفي عند تحديث الصفحة.',
          en: 'What you wrote did not reach the database. It will disappear when you refresh.'
        })) + '</div>' +
        '<p><strong>' + esc(L({ ar: 'الشاشة: ', en: 'Screen: ' })) + '</strong>' +
          esc(screenName(table)) + '</p>' +
        (why ? '<p>' + esc(why) + '</p>' : '') +
        (detail ? '<p class="muted small" style="direction:ltr;text-align:left;' +
                  'font-family:monospace;background:#fdeceb;padding:6px 8px;border-radius:5px">' +
                  esc(detail) + '</p>' : '') +
        '<p><strong>' + esc(L({
          ar: 'لا تكمل العمل. انسخ ما كتبتَه الآن قبل التحديث، وأبلغ الإدارة.',
          en: 'Do not carry on working. Copy what you wrote before refreshing, and tell your administrator.'
        })) + '</strong></p>',
      buttons: [{ label: L({ ar: 'فهمت', en: 'Understood' }), cls: 'btn-primary',
                  onClick: function () { alarmShown = false; } }]
    });
  }

  function banner(table) {
    if (document.getElementById('azSaveGuardBar')) return;
    var bar = document.createElement('div');
    bar.id = 'azSaveGuardBar';
    bar.style.cssText =
      'position:fixed;inset-inline:0;top:0;z-index:9999;background:#b42318;color:#fff;' +
      'padding:10px 16px;font:600 14px/1.6 Tahoma,Arial,sans-serif;text-align:center;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.3)';
    bar.innerHTML = esc(L({
      ar: '⛔ آخر عملية حفظ لم تصل إلى قاعدة البيانات — لا تعتمد على ما تراه على الشاشة',
      en: '⛔ The last save did not reach the database — do not rely on what you see on screen'
    })) + ' <button id="azSaveGuardX" style="margin-inline-start:14px;background:#fff;' +
      'color:#b42318;border:0;border-radius:5px;padding:3px 12px;cursor:pointer;font-weight:700">' +
      esc(L({ ar: 'إغلاق', en: 'Close' })) + '</button>';
    document.body.appendChild(bar);
    var x = document.getElementById('azSaveGuardX');
    if (x) x.onclick = function () { bar.remove(); };
  }

  /* ═══════════════════════════════════════════════════════════════════
     التعارضات القديمة — إظهار ما تخفيه البوابة بالفعل
     -------------------------------------------------------------------
     كتب store.js عند كل رفض:

         conflictsCache.push(await OfflineDB.conflictAdd(user, job, detail))

     و`detail` هو نص الخطأ الحرفي من قاعدة البيانات. لكنه لا يظهر إلا
     لمن يفتح «الإعدادات ← البيانات» ويعرف أن عليه البحث هناك. فبقي
     السبب مكتوباً بوضوح ومخفياً في آنٍ واحد، بينما يقول أسفل الشاشة
     «تعارضات · ٣» فقط.

     store.js records the database's verbatim error on every refusal, but
     it is only visible to someone who opens Settings → Data and knows to
     look. So the cause sat there, written plainly and hidden at the same
     time, while the footer said only "Conflicts · 3".

     نعرضها هنا فور فتح البوابة — بنصّها كما ردّت قاعدة البيانات.
     We show them the moment the portal opens, in the database own words.
     ═══════════════════════════════════════════════════════════════════ */
  var conflictsShown = false;

  function showExistingConflicts() {
    if (conflictsShown) return;
    if (!global.Store || !Store.conflicts || !global.UI || !UI.modal) return;

    var list = Store.conflicts() || [];
    if (!list.length) return;
    conflictsShown = true;

    var rows = list.map(function (c, i) {
      var job = c.job || {};
      var table = job.table || '—';
      var detail = String(c.detail || '').trim() || '—';
      console.error('[save-guard] conflict ' + (i + 1) + ' · table=' + table +
                    ' · op=' + (job.op || '?') + ' · ' + detail);
      return '<tr>' +
        '<td style="padding:7px 9px;font-weight:600">' + esc(screenName(table)) + '</td>' +
        '<td style="padding:7px 9px;color:#667">' + esc(job.op || '—') + '</td>' +
        '<td style="padding:7px 9px;direction:ltr;text-align:left;font-family:monospace;' +
            'font-size:12px;background:#fdeceb;color:#912018;border-radius:5px">' +
            esc(detail) + '</td>' +
      '</tr>';
    }).join('');

    UI.modal({
      title: L({ ar: '⚠️ عمليات حفظ رفضتها قاعدة البيانات',
                 en: '⚠️ Saves the database refused' }),
      wide: true,
      body:
        '<p>' + esc(L({
          ar: 'هذه العمليات لم تصل. النص على اليسار هو ردّ قاعدة البيانات حرفياً — ' +
              'أرسله كما هو لمن يصلح النظام.',
          en: 'These did not go through. The text on the left is the database verbatim reply — ' +
              'send it as it is to whoever maintains the system.' })) + '</p>' +
        '<div style="max-height:52vh;overflow:auto"><table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="border-bottom:2px solid #ddd">' +
          '<th style="padding:8px 9px;text-align:start">' + esc(L({ ar: 'الشاشة', en: 'Screen' })) + '</th>' +
          '<th style="padding:8px 9px;text-align:start">' + esc(L({ ar: 'العملية', en: 'Operation' })) + '</th>' +
          '<th style="padding:8px 9px;text-align:start">' + esc(L({ ar: 'ردّ قاعدة البيانات', en: 'Database reply' })) + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>',
      buttons: [
        { label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-ghost' },
        /* بدون هذا الزر تعود النافذة عند كل تحديث للأبد، لأنها تعرض
           التعارضات المخزَّنة لا الجديدة — فيظن المستخدم أن العطل مستمر
           بعد إصلاحه. الزر يمسحها من متصفحه.
           Without this the window returns on every refresh forever,
           because it lists STORED failures, not new ones — so the person
           believes the fault is still there after it has been fixed. */
        { label: L({ ar: '🗑 امسح هذه التعارضات (' + list.length + ')',
                     en: '🗑 Clear these conflicts (' + list.length + ')' }),
          cls: 'btn-primary',
          onClick: function () { clearAll(list); } }
      ]
    });
  }

  function clearAll(list) {
    if (!global.Store || !Store.dismissConflict) return;
    var done = 0;
    list.forEach(function (c) {
      try {
        Promise.resolve(Store.dismissConflict(c.conflictId)).then(function () {
          done++;
          if (done === list.length && global.UI && UI.toast) {
            UI.toast(L({
              ar: 'مُسحت ' + done + ' تعارضات. أعد إدخال المستندات التي لم تُحفظ.',
              en: done + ' conflicts cleared. Re-enter the documents that were not saved.' }),
              'success', 7000);
            var bar = document.getElementById('azSaveGuardBar');
            if (bar) bar.remove();
          }
        }).catch(function () {});
      } catch (e) {}
    });
    conflictsShown = true;   /* لا تعرضها ثانية في هذه الجلسة */
  }

  /* ═══════════════════════════════════════════════════════════════════
     التركيب — نلفّ Store.create و Store.save ولا نغيّر سلوكهما
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.Store || Store.__saveGuard) return;
    Store.__saveGuard = true;

    var origCreate = Store.create;
    Store.create = function (table, data, opts) {
      var row = origCreate.apply(Store, arguments);
      if (row && row.id) verify(table, row.id, 'create');
      return row;
    };

    var origSave = Store.save;
    Store.save = function (table, id, patch, opts) {
      var row = origSave.apply(Store, arguments);
      if (row && row.id) verify(table, row.id, 'update');
      return row;
    };

    console.info('save-guard.js ready — every save is now confirmed against the server.');

    /* اعرض التعارضات المخزَّنة بعد أن تكتمل تهيئة البيانات */
    [2000, 6000].forEach(function (ms) { setTimeout(showExistingConflicts, ms); });
    if (Store.onChange) {
      Store.onChange(function (type) {
        if (type === 'ready-online' || type === 'ready-offline') {
          setTimeout(showExistingConflicts, 1500);
        }
        if (type === 'conflict' || type === 'sync-error') {
          conflictsShown = false;
          setTimeout(showExistingConflicts, 400);
        }
      });
    }
  }

  install();
  [0, 500, 2000, 5000].forEach(function (ms) { setTimeout(install, ms); });

  global.SaveGuard = {
    verify: verify,
    conflicts: showExistingConflicts,
    /* افحص يدوياً: SaveGuard.check('docRegister') — يقارن ما على الشاشة بما على الخادم */
    check: function (table) {
      var client = global.Auth && Auth.client && Auth.client();
      if (!client) return Promise.resolve(null);
      var local = (global.Store && Store.all(table)) || [];
      return Promise.resolve(client.from(table).select('id')).then(function (res) {
        var server = (res && res.data) || [];
        var out = { table: table, onScreen: local.length, onServer: server.length,
                    error: res && res.error ? String(res.error.message) : null };
        console.info('[save-guard] ' + table + ' — on screen: ' + out.onScreen +
                     ' · on server: ' + out.onServer + (out.error ? ' · ' + out.error : ''));
        return out;
      });
    }
  };
})(window);
