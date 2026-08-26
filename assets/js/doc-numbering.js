/* =========================================================================
   doc-numbering.js — أرقام مستندات حقيقية لكل الشاشات وكل الأقسام
                      Real document numbers, every screen, every department
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   store.js:340-342:
       function nextDocNo(prefix) {
         return (prefix || 'DOC') + '-DRAFT-' + Date.now()... + randomToken(4);
       }

   تُنادى من مكانين اثنين فقط في الموقع كله — pages/entity.js:836 عند
   الحفظ، وimport.js:800 عند الاستيراد — **ولا شيء في المشروع يستبدل
   كلمة DRAFT برقم مسلسل أبداً.** لا عدّاد، لا تسلسل، لا خطوة إنهاء.

   فكل مستند أنشأته الشركة منذ اليوم الأول يحمل رقماً مثل
   «PV-DRAFT-M8X2K1-A4F9» — سندات صرف، فواتير موردين، مستخلصات عملاء،
   اعتمادات شراء، الكل. وprint.js يطبع هذا الرقم على الورقة. فسند صرف
   يُسلَّم لمورد، أو مستند يُعرض على الهيئة، مكتوب عليه DRAFT إلى الأبد
   حتى بعد اعتماده بالكامل.

   Called from exactly two places in the whole portal, and NOTHING anywhere
   ever replaces "DRAFT" with a real serial. So every document the company
   has ever produced carries a number like "PV-DRAFT-M8X2K1-A4F9", and
   print.js puts it on the paper. A payment voucher handed to a supplier
   says DRAFT across it forever, even after full approval.

   -------------------------------------------------------------------------
   لماذا لا يُحسب الرقم في المتصفح · WHY THE NUMBER IS NOT COUNTED IN THE BROWSER

   الحلّ الواضح — «اقرأ أعلى رقم موجود وزد واحداً» — يعمل لضبط المستندات
   لأن أ. أحمد عبد الحي شخص واحد (سؤال ٢: «واحد»). لكنه **خطأ جسيم** على
   شاشات المال: عدة محاسبين يحفظون في نفس اللحظة على أجهزة مختلفة، وكلٌّ
   يقرأ نفس «أعلى رقم» قبل أن تصل مزامنة الآخر، فيخرجان بنفس الرقم.
   **رقمان متطابقان على سندَي صرف مختلفين أسوأ من رقم قبيح.**

   The obvious fix — read the highest number and add one — is safe for
   document control because أحمد is one person. It is seriously WRONG on the
   money screens: several accountants saving at the same moment on different
   devices each read the same "highest number" before the other syncs, and
   both get the same one. **Two identical numbers on two different payment
   vouchers is worse than an ugly number.**

   فالرقم يُصدر في قاعدة البيانات، حيث يضمن Postgres عدم التكرار:
   1-SUPABASE/30-DOCUMENT-NUMBERING.sql — عدّاد مقفول لكل جدول ومُشغِّل
   BEFORE INSERT. القاعدة هي المرجع الوحيد، لأي طريق دخل منه الصف:
   الشاشة، أو استيراد إكسل، أو طابور عدم الاتصال، أو أي استدعاء مباشر.

   The number is therefore issued INSIDE the database, where Postgres
   guarantees uniqueness — see 1-SUPABASE/30-DOCUMENT-NUMBERING.sql: a
   locked counter per table plus a BEFORE INSERT trigger. The database is
   the single authority, whichever path the row arrived by: the screen,
   an Excel import, the offline queue, or a direct API call.

   -------------------------------------------------------------------------
   عمل هذا الملف — شيئان لا ثالث لهما · WHAT THIS FILE DOES — exactly two things

   ١) يصلح تصادم البادئة SI قبل أن يُصدر أي رقم (القسم ٠ أدناه).
   ٢) بعد الحفظ، يسأل الخادم عن الرقم الذي أصدره فعلاً ويعرضه على الشاشة،
      بدل أن يظل المستخدم يرى الرقم المؤقت حتى يحدّث الصفحة.

   1) Fixes the SI prefix collision before any number is issued (section 0).
   2) After a save, asks the server what number it actually issued and shows
      it, instead of leaving the temporary one on screen until a refresh.

   ⚠️ هذا الملف **لا يخترع رقماً أبداً.** لو لم يُشغَّل ملف SQL رقم ٣٠،
      فلن يتغير شيء إطلاقاً: تبقى الأرقام المؤقتة كما هي اليوم بالضبط.
      ولو شُغِّل SQL ولم يُرفع هذا الملف، فالترقيم يعمل صحيحاً وتظهر
      الأرقام الحقيقية بعد أول تحديث للصفحة. **لا يوجد ترتيب إجباري بين
      النصفين، ولا حالة واحدة يكسر فيها أحدهما شيئاً.**

      This file NEVER invents a number. If SQL file 30 has not been run,
      nothing changes at all — the placeholder numbers stay exactly as they
      are today. If the SQL is run but this file is not uploaded, numbering
      works correctly and the real numbers appear after the next refresh.
      **There is no required order between the two halves, and no
      combination in which either one breaks anything.**

   إضافي بالكامل — احذف هذا الملف ويعود السلوك الحالي حرفياً.
   Fully additive — delete this file and today's behaviour returns exactly.

   يُحمَّل بعد audit-trail.js — آخر ملف يلفّ Store.create — وبعد auth.js
   لأنه يحتاج Auth.client() ليسأل الخادم.
   Load after audit-trail.js (the last file that wraps Store.create) and
   after auth.js, because it needs Auth.client() to ask the server.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema || !global.Store) {
    console.error('doc-numbering.js needs schema.js and store.js first');
    return;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٠ · تصادم البادئة SI — يُصحَّح أولاً، قبل أي رقم يُصدر
        THE SI PREFIX COLLISION — fixed first, before any number is issued
     -------------------------------------------------------------------
     تعليمات الموقع (departments.js:396) وفواتير الموردين (schema.js:317)
     تعلنان **نفس البادئة SI**. كان هذا بلا ضرر ما دام كل رقم عشوائياً،
     لكنه يصبح ضاراً في اللحظة التي يبدأ فيها الترقيم المسلسل: SI-0001
     تعني تعليمة موقع وفاتورة مورد في آنٍ واحد.

     siteInstructions (departments.js:396) and supplierInvoices
     (schema.js:317) both declare docPrefix 'SI'. Harmless while every
     number was random; harmful the moment serial numbering starts —
     SI-0001 would mean both a site instruction and a supplier invoice.

     [نُقل هذا القسم إلى هنا من dc-tuning.js، لأنه لم يعد شأناً خاصاً
      بضبط المستندات بعد أن صار الترقيم يشمل كل الأقسام. dc-tuning.js
      لم يعد يحتوي عليه — لا توجد نسختان.
      Moved here from dc-tuning.js: it stopped being a document-control
      matter once numbering covered every department. dc-tuning.js no
      longer contains it — there are not two copies.]

     ملاحظة: ملف SQL رقم ٣٠ يحمل نفس الخريطة (SIN لتعليمات الموقع)،
     والقاعدة هي التي تُصدر الرقم فعلاً. البادئة هنا تخصّ العرض المؤقت
     فقط، لكن إبقاءهما متطابقتين يمنع اختلاف ما يراه المستخدم لثانية
     عمّا سيصله من الخادم.
     Note: SQL file 30 carries the same map (SIN for site instructions) and
     the database is what actually issues the number. The prefix here only
     affects the temporary display, but keeping the two identical stops the
     user seeing one thing for a second and another from the server.
     ═══════════════════════════════════════════════════════════════════ */
  (function fixPrefixCollision() {
    var si = Schema.get('siteInstructions');
    var inv = Schema.get('supplierInvoices');
    if (si && inv && si.docPrefix === 'SI' && inv.docPrefix === 'SI') {
      si.docPrefix = 'SIN';
      console.info('[doc-numbering] siteInstructions docPrefix SI → SIN — it collided ' +
                   'with supplierInvoices, which also uses SI.');
    }
  })();

  /* ═══════════════════════════════════════════════════════════════════
     ١ · الشاشات التي لها أرقام مستندات إطلاقاً
     ═══════════════════════════════════════════════════════════════════ */
  function numberedTables() {
    var out = {};
    (Schema.MODULES || []).forEach(function (m) {
      if (m && m.table && m.docPrefix) out[m.table] = m.docPrefix;
    });
    return out;
  }

  function isPlaceholder(v) {
    return typeof v === 'string' && v.indexOf('-DRAFT-') !== -1;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · بعد الحفظ: اسأل الخادم عن الرقم الحقيقي واعرضه
     -------------------------------------------------------------------
     لماذا سؤال الخادم أصلاً؟ لأن store.js لا يُعيد رسم الشاشة بعد أن
     تصل نتيجة الإدراج: flush() يبثّ 'synced' بينما app.js:51 لا يُحدّث
     إلا على 'remote-change'. فبدون هذا القسم يبقى الرقم المؤقت معروضاً
     حتى يحدّث المستخدم الصفحة بنفسه — ويظن أن الترقيم لم يعمل.

     Why ask the server at all? Because store.js does not redraw after the
     insert result arrives: flush() emits 'synced', while app.js:51 only
     refreshes on 'remote-change'. Without this section the placeholder
     stays on screen until the user refreshes — and they conclude the
     numbering did not work.

     نتّبع القاعدة الثالثة: «لا تثق بكلمة حُفظ — تأكّد بالمعرّف من
     الخادم» — وهي نفس طريقة save-guard.js بالضبط.
     This follows rule 3 — never trust "saved", confirm by id against the
     server — the same method save-guard.js already uses.
     ═══════════════════════════════════════════════════════════════════ */
  var TRIES = [1200, 4000, 10000, 25000];   /* يكفي لاتصال موقع ضعيف */

  function showReal(table, id, docNo) {
    /* Store.find يُعيد الصف نفسه من الذاكرة لا نسخة منه (store.js:367)،
       فتعديله هنا يُصحّح ما تقرأه كل الشاشات. لا نستدعي Store.save —
       فذلك سيكتب على الخادم مرة أخرى بلا داعٍ ويُنشئ حلقة تحديث.
       Store.find returns the cached row itself, not a copy (store.js:367),
       so setting it here corrects what every screen reads. We deliberately
       do NOT call Store.save — that would write back to the server for no
       reason and create an update loop. */
    var rec = Store.find(table, id);
    if (!rec || rec.docNo === docNo) return false;
    rec.docNo = docNo;

    if (global.App && App.refresh) { try { App.refresh(); } catch (e) {} }
    if (global.UI && UI.toast) {
      var ar = 'رقم المستند: ' + docNo;
      var en = 'Document number: ' + docNo;
      UI.toast((global.I18N && I18N.getLang() === 'ar') ? ar : en, 'success', 5000);
    }
    console.info('[doc-numbering] ' + table + ' → ' + docNo);
    return true;
  }

  function watch(table, id) {
    var i = 0;
    (function step() {
      if (i >= TRIES.length) return;
      var wait = TRIES[i++];
      setTimeout(function () {
        /* دون اتصال الصف في الطابور بحق — لا سؤال ولا إزعاج. */
        if (Store.isOnline && !Store.isOnline()) return step();
        var client = global.Auth && Auth.client && Auth.client();
        if (!client) return step();

        var q;
        try { q = client.from(table).select('docNo').eq('id', id).maybeSingle(); }
        catch (e) { return step(); }

        Promise.resolve(q).then(function (res) {
          var real = res && !res.error && res.data && res.data.docNo;
          /* رقم حقيقي وصل → اعرضه وتوقّف. ما زال مؤقتاً → ملف SQL ٣٠ لم
             يُشغَّل بعد، وهذا ليس خطأ: نتوقف بهدوء بعد آخر محاولة.
             A real number arrived → show it and stop. Still a placeholder →
             SQL file 30 has not been run, which is not an error: we stop
             quietly after the last attempt. */
          if (real && !isPlaceholder(real)) { showReal(table, id, real); return; }
          step();
        }).catch(function () { step(); });
      }, wait);
    })();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · التركيب
     ═══════════════════════════════════════════════════════════════════ */
  (function install() {
    if (Store.__docNumbering) return;
    Store.__docNumbering = true;

    var TABLES = numberedTables();
    var origCreate = Store.create;

    Store.create = function (table, data, opts) {
      var row = origCreate.apply(Store, arguments);
      /* row فارغ = الحفظ رُفض أو وُضع في طابور عدم الاتصال (store.js:385،
         save-modes.js:365). لا شيء نتتبّعه، والقاعدة سترقّمه عند أول
         اتصال على أي حال.
         A null row means the save was refused or queued offline. Nothing
         to follow here, and the database will number it on the first
         reconnect regardless. */
      if (row && row.id && TABLES[table] && isPlaceholder(row.docNo)) watch(table, row.id);
      return row;
    };

    console.info('doc-numbering.js ready — ' + Object.keys(TABLES).length +
                 ' screens across every department will show the number the ' +
                 'database issues. Run 1-SUPABASE/30-DOCUMENT-NUMBERING.sql to switch it on.');
  })();

  global.DocNumbering = {
    tables: numberedTables,
    /* افحص يدوياً من الـ console: DocNumbering.check('payments')
       يعرض كم مستنداً على هذه الشاشة ما زال بلا رقم حقيقي.
       Manual check: DocNumbering.check('payments') reports how many
       documents on that screen still carry a placeholder number. */
    check: function (table) {
      var rows = Store.all(table) || [];
      var draft = rows.filter(function (r) { return isPlaceholder(r.docNo); });
      console.info('[doc-numbering] ' + table + ' — ' + rows.length + ' documents, ' +
                   draft.length + ' still unnumbered, ' + (rows.length - draft.length) + ' numbered');
      return { table: table, total: rows.length, unnumbered: draft.length,
               numbered: rows.length - draft.length };
    }
  };
})(window);
