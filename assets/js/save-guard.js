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
     المصنّف المشترك — سبب الرفض بكلمات واضحة، نسخة واحدة فقط
        يستخدمه الإنذار الأحمر، والشريط العلوي، ونافذة المراجعة معاً —
        بدل ثلاث نسخ منفصلة من نفس المنطق قد تختلف عن بعضها بمرور الوقت.
     A SHARED CLASSIFIER — the refusal cause in plain words, one copy.
     Used by the red alarm, the top banner, and the review window
     together — instead of three separate copies of the same logic that
     could drift apart over time.
     ═══════════════════════════════════════════════════════════════════ */
  function explain(detail) {
    detail = String(detail || '');

    if (/permission|row-level|42501|401|403/i.test(detail)) {
      return { ar: 'قاعدة البيانات رفضت الكتابة لأسباب صلاحيات.',
               en: 'The database refused the write on permission grounds.' };
    }
    if (/not-null|23502/i.test(detail)) {
      /* Postgres يكتب: null value in column "X" violates not-null constraint
         — نستخرج اسم العمود من نص الخطأ نفسه بدل أن نطلب من أحد قراءته. */
      var col = (detail.match(/null value in column "([^"]+)"/i) || [])[1];
      return { ar: 'حقل مطلوب فارغ' + (col ? (': ' + col) : '') + '.',
               en: 'A required field was empty' + (col ? (': ' + col) : '') + '.' };
    }
    if (/duplicate|23505/i.test(detail)) {
      return { ar: 'سجل مكرر — يوجد سجل بنفس الرقم بالفعل.',
               en: 'Duplicate record — a record with the same number already exists.' };
    }
    if (/conflict:record-changed-on-server/i.test(detail)) {
      /* الحالة الوحيدة التي يجوز فيها استخدام كلمة «تعارض» — تعديل
         متزامن حقيقي، لا خطأ حقل ولا صلاحية ولا رفض صامت.
         The only case allowed to use the word "conflict" — a real
         concurrent edit, not a field error, a permission refusal, or a
         silent one. */
      return { ar: 'عُدّل هذا السجل على الخادم أثناء عملك — تعارض حقيقي.',
               en: 'This record was edited on the server while you were working — a real conflict.' };
    }
    if (/column|42703/i.test(detail)) {
      return { ar: 'الشاشة أرسلت حقلاً لا يوجد له عمود في قاعدة البيانات، فرُفض الصف كله.',
               en: 'The screen sent a field with no column in the database, so the whole row was refused.' };
    }
    if (/relation|42P01/i.test(detail)) {
      return { ar: 'الجدول نفسه غير موجود في قاعدة البيانات.',
               en: 'The table itself does not exist in the database.' };
    }
    if (!detail) {
      return { ar: 'لم تُرجع قاعدة البيانات خطأً، ومع ذلك لا يوجد الصف عندها. ' +
          'هذا يحدث عندما يُسمح بالكتابة ويُمنع القراءة — أي أن دالة az_role() ' +
          'تُرجع قيمة فارغة لحسابك. أشهر سبب: كلمة المرور لم تُغيَّر بعد.',
        en: 'The database returned no error, yet the row is not there. That happens when ' +
          'the write is permitted and the read is blocked — az_role() returning null for ' +
          'your account. The commonest cause is a password that has not been changed yet.' };
    }
    return null;   /* سبب لم نتوقعه — لا نخترع تفسيراً، نعرض نص قاعدة البيانات الخام فقط */
  }

  /* عنوان السجل المرفوض — رقم المستند أو الاسم، أياً كان الموجود */
  function headline(row) {
    row = row || {};
    return row.docNo || row.name || row.title || '';
  }

  /* اسم الحقل بالعربية من تعريف الشاشة في schema.js؛ مفتاح غير معروف
     (شاشة حُذفت، أو حقل داخلي) يُعرض كما هو بدل إخفائه — فالغرض إبقاء
     القيم قابلة للقراءة حتى لسبب رفض لم نتوقعه. */
  function fieldLabel(mod, key) {
    var f = mod && mod.fields ? mod.fields.filter(function (x) { return x.name === key; })[0] : null;
    return f ? L(f.label) : key;
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
    banner(table, detail);

    if (alarmShown || !global.UI || !UI.modal) return;

    /* ⚠️ خطأ كان هنا — نافذتان تتنازعان #modalHost في آنٍ واحد
       -------------------------------------------------------------------
       إن كان store.js قد سجّل بالفعل تعارضاً لنفس هذا الصف من مساره
       الخاص (يحدث فوراً تقريباً عند رفض حقيقي، قبل أن يصل فحص هذا
       الملف البطيء)، فإظهار الإنذار العام هنا فوقها يعني نافذتين
       تتنازعان مكان العرض نفسه، والثانية تكتب فوق الأولى بصمت.

       THE BUG THAT WAS HERE — two modals fighting over #modalHost at
       once. If store.js already filed a conflict for this exact row
       through its own path (happens almost immediately on a real
       refusal, before this file's slower check catches up), showing the
       generic alarm on top of it means two modals racing for the same
       spot, and the second silently overwrites the first.

       الإصلاح: إن وُجد تعارض مسجَّل لهذا المعرّف، نتخطى الإنذار العام
       ونفتح نافذة المراجعة الفعلية مباشرة — تعرض القيم وتتيح إعادة
       الإدخال، لا مجرد تنبيه. الشريط الأحمر أعلى الصفحة يبقى كما هو.
       THE FIX: if a conflict is already recorded for this id, skip the
       generic alarm and open the real recovery window directly — it
       shows the values and offers to re-enter them, not just a warning.
       The red top banner stays exactly as it was. */
    var already = (global.Store && Store.conflicts) ? Store.conflicts() : [];
    var hasConflict = already.some(function (c) {
      var j = c.job || {};
      var jid = j.id || (j.row && j.row.id);
      return jid && id && jid === id;
    });
    if (hasConflict) {
      /* ⚠️ خطأ وجده الفاحص — فتحة ثلاثية عند الضغط السريع مرتين
         alarm() يُستدعى مرة واحدة لكل ضغطة عبر verify()، وكان هذا
         الفرع يفتح نافذة المراجعة مباشرة بلا مرور بالمِجدوِل المُقيَّد
         أعلاه. فضغطتان سريعتان على الزر الذهبي = نداءا alarm() بلا
         تقييد + مؤقّت واحد مُقيَّد من حدث conflict/sync-error = ثلاث
         فتحات للنافذة بدل فتحة واحدة.

         THE BUG THE VERIFIER FOUND — a triple-open burst on a rapid
         double press. alarm() fires once per press via verify(), and
         this branch used to open the review window directly, bypassing
         the throttled scheduler above entirely. Two rapid gold-button
         presses = two unthrottled alarm() opens + one throttled open
         from a conflict/sync-error event = three window opens instead
         of one.

         الإصلاح: نمرّ بالمِجدوِل نفسه، فتتراكم الفتحات مع أي فتحة
         أخرى مجدولة من مسار conflict/sync-error في مؤقّت واحد مشترك.
         الشريط الأحمر أعلى الصفحة يبقى كما هو دون أي تغيير.
         THE FIX: route through the same scheduler, so this collapses
         together with any reopen already scheduled from the
         conflict/sync-error path into one shared timer. The red top
         banner is unchanged. */
      scheduleAutoReopen(400);
      return;
    }

    alarmShown = true;
    /* يعود الحارس للعمل بعد نصف دقيقة حتى لو أُغلقت النافذة بالـ×.
       The guard re-arms after thirty seconds even if the window was
       closed with the × instead of the button. */
    setTimeout(function () { alarmShown = false; }, 30000);

    var whyObj = explain(detail);
    var why = whyObj ? L(whyObj) : '';

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
      buttons: [
        { label: L({ ar: 'فهمت', en: 'Understood' }), cls: 'btn-primary',
          onClick: function () { alarmShown = false; } },
        /* لا يوجد تعارض مسجَّل بعد وقت ظهور هذا الإنذار — لكنه قد يُسجَّل
           بعد لحظات (مسار store.js أبطأ أحياناً من فحص هذا الملف)، أو في
           الحالة الصامتة (أُدرج فعلاً لكن مُنعت القراءة) لن يُسجَّل تعارض
           إطلاقاً. الزر هنا يفتح نافذة المراجعة الفعلية إن وُجد فيها شيء.
           No conflict is recorded yet at the moment this alarm appears —
           but one may be filed moments later (store.js's own path is
           sometimes slower than this file's check), or in the silent
           case (actually inserted but the read-back is blocked) none will
           ever be filed. This button opens the real recovery window if
           anything has landed in it. */
        { label: L({ ar: 'نسختك محفوظة — اعرضها', en: 'Your copy is saved — show it' }),
          cls: 'btn-outline', keepOpen: true,
          onClick: function () { conflictsShown = false; showExistingConflicts(); } }
      ]
    });
  }

  function banner(table, detail) {
    if (document.getElementById('azSaveGuardBar')) return;
    var bar = document.createElement('div');
    bar.id = 'azSaveGuardBar';
    bar.style.cssText =
      'position:fixed;inset-inline:0;top:0;z-index:9999;background:#b42318;color:#fff;' +
      'padding:10px 16px;font:600 14px/1.6 Tahoma,Arial,sans-serif;text-align:center;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.3)';
    /* نفس المصنّف المشترك يُستخدم هنا أيضاً — سبب واحد، لا نص عام فقط. */
    var whyObj = explain(detail);
    var whyLine = whyObj ? (' — ' + esc(L(whyObj))) : '';
    bar.innerHTML = esc(L({
      ar: '⛔ آخر عملية حفظ لم تصل إلى قاعدة البيانات — لا تعتمد على ما تراه على الشاشة',
      en: '⛔ The last save did not reach the database — do not rely on what you see on screen'
    })) + whyLine + ' <button id="azSaveGuardX" style="margin-inline-start:14px;background:#fff;' +
      'color:#b42318;border:0;border-radius:5px;padding:3px 12px;cursor:pointer;font-weight:700">' +
      esc(L({ ar: 'إغلاق', en: 'Close' })) + '</button>';
    document.body.appendChild(bar);
    var x = document.getElementById('azSaveGuardX');
    if (x) x.onclick = function () { bar.remove(); };
  }

  /* ═══════════════════════════════════════════════════════════════════
     التعارضات القديمة — إظهار ما تخفيه البوابة بالفعل، وعرض البيانات
     نفسها للاستعادة، لا نص خطأ خام فقط
     -------------------------------------------------------------------
     كتب store.js عند كل رفض:

         conflictsCache.push(await OfflineDB.conflictAdd(user, job, detail))

     و`detail` هو نص الخطأ الحرفي من قاعدة البيانات، وjob.row يحمل كل ما
     كتبه الموظف كاملاً. لكن كلاهما لم يظهر إلا لمن يفتح «الإعدادات ←
     البيانات» ويعرف أن عليه البحث هناك — وحتى هناك، النافذة القديمة
     كانت تعرض نص الخطأ الخام فقط دون القيم المكتوبة، وزر «امسح» كان هو
     الافتراضي، فضغطة واحدة عجولة تمحو كل نسخة محفوظة للأبد.

     store.js records the database's verbatim error on every refusal, and
     job.row carries everything the employee typed in full. But neither
     was visible to anyone but someone who opens Settings → Data and knows
     to look — and even there, the old window showed only the raw error
     text, not the typed values, and "Clear" was the DEFAULT button, so
     one hasty click erased every preserved copy forever.

     نعرضها هنا فور فتح البوابة — بالسبب بكلمات واضحة، والقيم قابلة
     للعرض والنسخ، وخيار فتح نموذج معبأ بها لإعادة المحاولة مباشرة.
     We show them the moment the portal opens — the cause in plain
     words, the values readable and copyable, and an option to open a
     pre-filled form to retry directly.
     ═══════════════════════════════════════════════════════════════════ */
  var conflictsShown = false;

  /* نفس قائمة الحقول التي يحذفها duplicate() في entity.js (سطور 314-316)
     — حتى يخرج النموذج المعبّأ نظيفاً كأنه مستند جديد، لا نسخة من مرفوض،
     زائد ثلاثة حقول داخلية لا معنى لها خارج هذا الملف وملف save-modes.js.
     The exact list entity.js's own duplicate() strips (entity.js:314-316)
     — so the pre-filled form comes out clean, like a new document, not a
     copy of a refused one — plus three internal fields meaningless
     outside this file and save-modes.js. */
  var DUPLICATE_STRIP = ['id', 'docNo', 'status', 'trail', 'createdAt', 'createdBy',
    'updatedAt', 'updatedBy', 'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt',
    'approvedBy', 'approvedAt', 'postedAt', 'rejectedBy', 'rejectedAt', 'rejectReason',
    'returnReason', '_syncState', '_syncError', '__az_queued_until_online'];

  function presetFromJob(job) {
    var copy = JSON.parse(JSON.stringify((job && job.row) || {}));
    DUPLICATE_STRIP.forEach(function (k) { delete copy[k]; });
    return copy;
  }

  /* قائمة كل حقل بقيمته المكتوبة — تعمل حتى لسبب رفض لم نتوقعه، لأنها
     تقرأ مفاتيح job.row مباشرة بدل الاعتماد على تصنيف السبب. */
  function fieldRowsHTML(mod, row) {
    row = row || {};
    var keys = Object.keys(row).filter(function (k) {
      return k.charAt(0) !== '_' && k !== '__az_queued_until_online';
    });
    if (!keys.length) {
      return '<div class="muted small">' + esc(L({ ar: 'لا قيم لعرضها', en: 'No values to show' })) + '</div>';
    }
    return keys.map(function (k) {
      var v = row[k];
      var text = (v && typeof v === 'object') ? JSON.stringify(v)
        : (v === null || v === undefined || v === '' ? '—' : String(v));
      return '<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px dashed #eee">' +
        '<span style="min-width:140px;color:#667;font-weight:600">' + esc(fieldLabel(mod, k)) + '</span>' +
        '<span style="direction:ltr;text-align:left;word-break:break-all">' + esc(text) + '</span></div>';
    }).join('');
  }

  function conflictRowHTML(c) {
    var job = c.job || {};
    var table = job.table || '—';
    var mod = moduleForTable(table);
    var moduleId = mod ? mod.id : null;
    var whyObj = explain(c.detail);
    var whyText = whyObj ? L(whyObj) : (String(c.detail || '').trim() ||
      L({ ar: 'سبب غير معروف — انظر النص أسفله.', en: 'Unknown cause — see the text below.' }));
    var head = headline(job.row);
    var op = job.op || (job.kind === 'update' ? 'update' : 'insert');

    var actions = '<button type="button" class="btn btn-outline btn-sm" data-action="toggle">' +
      esc(L({ ar: 'عرض القيم', en: 'Show values' })) + '</button>';

    if (op === 'insert' && moduleId) {
      /* نموذج جديد معبّأ — فقط للإدراج؛ التعديل يعيد فتح السجل الحقيقي
         بدل استنساخه (op:'update' أدناه). Pre-filled NEW form — insert
         only; an update re-opens the real record instead of cloning it
         (op:'update' below). */
      actions += '<button type="button" class="btn btn-outline btn-sm" data-action="preset">' +
        esc(L({ ar: 'افتح نموذجاً معبأ بهذه البيانات', en: 'Open a form pre-filled with this data' })) + '</button>';
    } else if (op === 'update' && moduleId && job.id) {
      actions += '<button type="button" class="btn btn-outline btn-sm" data-action="edit">' +
        esc(L({ ar: 'فتح نموذج التعديل', en: 'Open the edit form' })) + '</button>';
    }

    actions += '<button type="button" class="btn btn-ghost btn-sm" data-action="dismiss">' +
      esc(L({ ar: 'تمت المراجعة', en: 'Mark reviewed' })) + '</button>';

    return '<div class="card" style="margin-bottom:10px;border:1px solid #e5e5e5;' +
        'border-radius:8px;padding:10px 12px" data-conflict-id="' + esc(c.conflictId) + '">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        '<strong>' + esc(screenName(table)) + (head ? ' — ' + esc(head) : '') + '</strong>' +
        '<span class="muted small num">' + esc(global.I18N && I18N.dateTime ? I18N.dateTime(c.at) : (c.at || '')) + '</span>' +
      '</div>' +
      '<div class="alert alert-danger" style="margin:8px 0">' + esc(whyText) + '</div>' +
      '<div data-fields hidden style="background:#faf9f7;border-radius:6px;padding:8px 10px;margin-bottom:8px">' +
        fieldRowsHTML(mod, job.row) +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + actions + '</div>' +
    '</div>';
  }

  /* تفعيل الأزرار داخل كل صف — يعمل بعد رسم النافذة (onOpen)، لأن
     UI.modal يكتب body.innerHTML مباشرة ولا يمرّ بأزرار buttons[] هنا. */
  function wireConflictRows(list) {
    var host = document.getElementById('azConflictRows');
    if (!host) return;
    host.querySelectorAll('[data-conflict-id]').forEach(function (row) {
      var id = row.getAttribute('data-conflict-id');
      var c = list.filter(function (x) { return x.conflictId === id; })[0];
      if (!c) return;
      var job = c.job || {};
      var mod = moduleForTable(job.table || '');
      var moduleId = mod ? mod.id : null;

      var toggleBtn = row.querySelector('[data-action="toggle"]');
      if (toggleBtn) toggleBtn.onclick = function () {
        var box = row.querySelector('[data-fields]');
        if (box) box.hidden = !box.hidden;
      };

      var presetBtn = row.querySelector('[data-action="preset"]');
      if (presetBtn) presetBtn.onclick = function () {
        if (!moduleId || !global.EntityPage) return;
        var preset = presetFromJob(job);
        UI.closeModal();
        /* نفس نمط تسلسل النوافذ الذي يستخدمه entity.js نفسه (سطر 408) —
           فتح نموذج جديد فور إغلاق نافذة قبل انتهاء حركة الإغلاق يتعارك
           مع #modalHost. The same modal-chaining pattern entity.js itself
           uses (line 408) — opening a new form the instant one closes,
           before the close animation finishes, fights over #modalHost. */
        setTimeout(function () { EntityPage.openForm(moduleId, null, preset); }, 60);
      };

      var editBtn = row.querySelector('[data-action="edit"]');
      if (editBtn) editBtn.onclick = function () {
        if (!moduleId || !global.EntityPage || !job.id) return;
        UI.closeModal();
        setTimeout(function () { EntityPage.openForm(moduleId, job.id); }, 60);
      };

      var dismissBtn = row.querySelector('[data-action="dismiss"]');
      if (dismissBtn) dismissBtn.onclick = function () {
        UI.confirm({
          title: L({ ar: 'تمت المراجعة؟', en: 'Marked as reviewed?' }),
          message: L({
            ar: 'تأكد أنك قرأت القيم أو صدّرتها أو أعدت إدخالها قبل إخفاء هذا السجل.',
            en: 'Confirm you have read the values, exported them, or re-entered them before hiding this record.' }),
          okLabel: L({ ar: 'تمت المراجعة', en: 'Mark reviewed' }),
          /* ⚠️ UI.modal يملك فتحة واحدة فقط في الصفحة (#modalHost)؛ فتح
             نافذة التأكيد هذه يستبدل محتوى نافذة المراجعة الحالية في
             مكانها. لو مسحنا هذا الصف من DOM مباشرة هنا (row.remove())
             لن يفعل شيئاً — العنصر نفسه استُبدل فعلاً بمحتوى نافذة
             التأكيد ولم يعد جزءاً من الصفحة. بدلاً من ذلك نعيد فتح
             نافذة المراجعة كاملة بعد إغلاق نافذة التأكيد (بنفس مهلة الـ٦٠
             مللي ثانية التي يستخدمها entity.js نفسه لتسلسل النوافذ)،
             فتُبنى القائمة من جديد من Store.conflicts() الفعلية —
             وتختفي هذا السجل تلقائياً لأنه لم يعد فيها، أو تُغلق النافذة
             تماماً إن لم يبق شيء.
             UI.modal has only one slot on the page (#modalHost); opening
             this confirm dialog replaces the review window's content in
             place. Removing this row from the DOM directly here
             (row.remove()) would do nothing — the element itself has
             already been replaced by the confirm dialog's content and is
             no longer part of the page. Instead, reopen the whole review
             window after the confirm dialog closes (using the same 60ms
             delay entity.js itself uses for modal chaining), so the list
             is rebuilt from the real Store.conflicts() — this row
             disappears automatically because it is no longer in it, or
             the window closes entirely if nothing is left. */
          onOk: function () {
            return Promise.resolve(Store.dismissConflict(id)).then(function () {
              setTimeout(function () { conflictsShown = false; showExistingConflicts(); }, 60);
            });
          }
        });
      };
    });
  }

  /* نفس شكل الملف الذي يستخدمه pages/settings.js (سطور 534-538) — حتى
     يفتح كلا الملفَّين بنفس الطريقة إن احتاج أحد المقارنة بينهما. */
  function exportAllConflicts() {
    if (!global.UI || !UI.downloadJSON || !global.Store) return;
    UI.downloadJSON(
      { __app: 'alzahraa-portal', __scope: 'current-user-sync-conflicts', conflicts: Store.conflicts() },
      'alzahraa-sync-conflicts-' + new Date().toISOString().slice(0, 10) + '.json');
  }

  function confirmClearAllConflicts() {
    if (!global.UI || !UI.confirm) return;
    UI.confirm({
      title: L({ ar: '🗑 امسح كل عمليات الحفظ المرفوضة؟', en: '🗑 Clear all refused saves?' }),
      message: L({
        ar: 'صُدِّر كل شيء الآن إلى ملف قبل هذا السؤال. بعد المسح لن تظهر هذه النسخ هنا مرة أخرى في هذا المتصفح.',
        en: 'Everything was just exported to a file before this question. After clearing, these copies will not appear here again on this browser.' }),
      warn: L({
        ar: 'تأكد أنك فتحت الملف المُصدَّر أو أعدت إدخال كل سجل قبل المتابعة.',
        en: 'Make sure you have opened the exported file or re-entered every record before continuing.' }),
      danger: true,
      okLabel: L({ ar: 'امسح الكل', en: 'Clear all' }),
      onOk: function () { clearAll(Store.conflicts()); }
    });
  }

  function showExistingConflicts() {
    if (conflictsShown) return;
    if (!global.Store || !Store.conflicts || !global.UI || !UI.modal) return;

    var list = Store.conflicts() || [];
    if (!list.length) return;
    conflictsShown = true;

    list.forEach(function (c, i) {
      var job = c.job || {};
      console.error('[save-guard] conflict ' + (i + 1) + ' · table=' + (job.table || '?') +
                    ' · op=' + (job.op || '?') + ' · ' + (c.detail || ''));
    });

    UI.modal({
      title: L({ ar: '⚠️ عمليات حفظ رفضها الخادم — ما كتبتَه محفوظ هنا',
                 en: '⚠️ Saves the server refused — what you wrote is preserved here' }),
      wide: true,
      body:
        '<p>' + esc(L({
          ar: 'كل عملية هنا لم تصل إلى قاعدة البيانات. اضغط «عرض القيم» لقراءة ما كتبتَه، ' +
              'أو «افتح نموذجاً معبأ» لإعادة المحاولة دون طباعة يدوية.',
          en: 'Every entry here did not reach the database. Press "Show values" to read what ' +
              'you wrote, or "Open a pre-filled form" to retry without retyping.' })) + '</p>' +
        '<div id="azConflictRows" style="max-height:56vh;overflow:auto">' +
          list.map(conflictRowHTML).join('') +
        '</div>',
      buttons: [
        /* «إغلاق» أصبح الافتراضي الآمن — لا يمحو شيئاً. Close is now the
           SAFE default — it deletes nothing. */
        { label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-primary' },
        { label: L({ ar: 'تصدير الكل (ملف)', en: 'Export all (file)' }), cls: 'btn-outline', keepOpen: true,
          onClick: function () { exportAllConflicts(); } },
        /* ⚠️ زر المسح كان هو الافتراضي (btn-primary) — ضغطة واحدة عجولة
           تمحو كل نسخة محفوظة من عمليات رُفضت. أُنزل هنا إلى btn-ghost،
           ويُصدَّر كل شيء تلقائياً أولاً قبل أن يُسأل المستخدم أصلاً —
           فحتى ضغطة بالخطأ لا تُفقد شيئاً.
           The clear button used to be the DEFAULT (btn-primary) — one
           hasty click erased every preserved copy of a refused save.
           Demoted here to btn-ghost, and everything is exported
           automatically first, before the user is even asked — so even
           an accidental click loses nothing. */
        { label: L({ ar: '🗑 امسح الكل', en: '🗑 Clear all' }), cls: 'btn-ghost', keepOpen: true,
          onClick: function () { exportAllConflicts(); confirmClearAllConflicts(); } }
      ],
      onOpen: function () { wireConflictRows(list); }
    });
  }

  function clearAll(list) {
    if (!global.Store || !Store.dismissConflict) return;
    list = list || [];
    var done = 0;
    if (!list.length) return;
    list.forEach(function (c) {
      try {
        Promise.resolve(Store.dismissConflict(c.conflictId)).then(function () {
          done++;
          if (done === list.length && global.UI && UI.toast) {
            UI.toast(L({
              ar: 'مُسحت ' + done + ' عمليات مرفوضة. أعد إدخال المستندات التي لم تُحفظ.',
              en: done + ' refused saves cleared. Re-enter the documents that were not saved.' }),
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
     شارة الأسفل — «تعارضات» كلمة مضلِّلة لموظف لم يعدّل شيئاً في وقت
     واحد مع أحد؛ هو ببساطة سجل رفضه الخادم. نعيد كتابتها هنا فوق نص
     store.js نفسه دون لمس store.js على الإطلاق.
     THE FOOTER BADGE — "Conflicts" is misleading wording for an
     employee who never edited anything at the same time as someone
     else; it is simply a record the server refused. We rewrite it here,
     over store.js's own text, without touching store.js at all.
     ═══════════════════════════════════════════════════════════════════ */
  function relabelBadge() {
    var el = document.getElementById('azSyncBadge');
    if (!el) return;
    var text = el.textContent || '';
    if (text.indexOf('تعارضات ·') === 0) {
      el.textContent = text.replace('تعارضات ·', 'حفظ مرفوض ·');
    } else if (text.indexOf('Conflicts ·') === 0) {
      el.textContent = text.replace('Conflicts ·', 'Refused saves ·');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     جدولة إعادة الفتح التلقائية — مؤقّت واحد فقط في كل مرة، ومسافة دنيا
     بين فتحة تلقائية وأخرى
     -------------------------------------------------------------------
     ⚠️ الخطأ الذي وجده الفاحص — كل حدث «conflict»/«sync-error» كان
     يجدول فتحاً تلقائياً خاصاً به بعد 400ms، بلا أي تنسيق مع فتحة أخرى
     مجدولة بالفعل. الزر الذهبي بعد إصلاحه صار يستدعي flushQueue فوراً
     عند كل ضغطة إن كان الاتصال متاحاً، فضغطتان سريعتان عليه تُنتجان
     أكثر من نداء واحد لـ flushQueue، وكل نداء قد يُطلق حدث تعارض خاصاً
     به من مسار store.js — فتتراكم عدة مؤقّتات مستقلة، كل منها يفتح
     النافذة من جديد ولو كانت مفتوحة بالفعل من مؤقّت سابق، فتُفتح ثلاث
     مرات بدل مرة واحدة.

     THE BUG THE VERIFIER FOUND — every "conflict"/"sync-error" event
     scheduled its own auto-reopen 400ms later, with no coordination
     with a reopen already pending. After the gold-button fix, a press
     now calls flushQueue() immediately when a connection is available,
     so two rapid presses produce more than one flushQueue() call, and
     each call can trigger its own conflict event from store.js's own
     path — so several independent timers pile up, each reopening the
     window even if one is already open from an earlier timer, opening
     it three times instead of once.

     الإصلاح: مؤقّت واحد فقط يُتتبَّع في متغيّر واحد؛ حدث جديد أثناء
     وجود مؤقّت معلَّق لا يضيف مؤقّتاً ثانياً. ونتحقّق من DOM مباشرة
     (modalHost.hidden) لا من العلم conflictsShown — لأن العلم يبقى true
     بعد إغلاق النافذة يدوياً لأسباب لا علاقة لها بهذا العطل، والاعتماد
     عليه هنا كان سيمنع أي تعارض جديد لاحقاً في نفس الجلسة من الظهور
     تلقائياً أبداً. القائمة تُبنى من Store.conflicts() الحيّة عند كل
     فتح، فالفتحة الواحدة بعد الدفعة تعرض كل شيء تراكم فيها.

     THE FIX: only one timer, tracked in one variable; a new event while
     one is already pending does not add a second. We check the DOM
     directly (modalHost.hidden) rather than the conflictsShown flag —
     because that flag stays true after the window is closed manually
     for reasons unrelated to this fault, and relying on it here would
     have stopped any later, genuinely new conflict from ever
     auto-appearing again for the rest of the session. The list is
     rebuilt from live Store.conflicts() on every open, so the one
     reopen after a burst shows everything that piled up in it.

     ملحوظة: هذا لا يغيّر الفتحتين عند بدء الصفحة (٢ ثانية / ٦ ثوانٍ) —
     تلك محاولة واحدة واحتياطية عند التحميل، لا سلسلة أحداث متكررة، وليست
     العطل المُبلَّغ عنه. النداء اليدوي (SaveGuard.conflicts()) وزر
     الإنذار «نسختك محفوظة — اعرضها» يبقيان بلا تقييد كما طُلب.
     Note: this does not change the two page-load opens (2s / 6s) — that
     is one retry attempt at load, not a repeating event chain, and is
     not the reported fault. The manual call (SaveGuard.conflicts()) and
     the alarm's "your copy is saved" button stay unthrottled as asked.
     ═══════════════════════════════════════════════════════════════════ */
  var reopenTimer = null;
  var lastAutoReopenAt = 0;
  var MIN_REOPEN_GAP_MS = 1500;

  function scheduleAutoReopen(delayMs) {
    if (reopenTimer) return;                 /* مؤقّت معلَّق بالفعل — لا نضيف آخر */
    var host = document.getElementById('modalHost');
    if (host && !host.hidden) return;         /* نافذة ما مفتوحة الآن — لا نتزاحم معها */
    var wait = Math.max(delayMs || 0, MIN_REOPEN_GAP_MS - (Date.now() - lastAutoReopenAt));
    reopenTimer = setTimeout(function () {
      reopenTimer = null;
      lastAutoReopenAt = Date.now();
      conflictsShown = false;
      showExistingConflicts();
    }, wait);
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
        /* ⚠️ store.js يستدعي paintStatus() — الذي يكتب «تعارضات · N» —
           مباشرة بعد كل المستمعين، بما فيهم هذا. لو أعدنا كتابة الشارة
           هنا فوراً، ستُكتب فوقها نسخة store.js بعد لحظة وتُلغي التعديل.
           ننتظر tick فارغاً (setTimeout(fn,0)) حتى ينتهي paintStatus()
           أولاً، ثم نكتب نحن فوقه.
           store.js calls paintStatus() — which writes "Conflicts · N" —
           right after all listeners, including this one. If we rewrote
           the badge here immediately, store.js's own text would overwrite
           it a moment later and undo the change. Wait for an empty tick
           (setTimeout(fn,0)) so paintStatus() finishes first, then write
           over it ourselves. */
        setTimeout(relabelBadge, 0);
        /* عبر المجدوِل المُقيَّد أعلاه، لا نداءً مباشراً لـ setTimeout —
           فدفعة أحداث متتالية (ضغطتان سريعتان على الزر الذهبي مثلاً)
           تنتج مؤقّتاً واحداً فقط بدل مؤقّت لكل حدث.
           Through the throttled scheduler above, not a direct
           setTimeout call — so a burst of consecutive events (two rapid
           gold-button presses, for example) produces exactly one timer
           instead of one per event. */
        if (type === 'ready-online' || type === 'ready-offline') {
          scheduleAutoReopen(1500);
        }
        if (type === 'conflict' || type === 'sync-error') {
          scheduleAutoReopen(400);
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
