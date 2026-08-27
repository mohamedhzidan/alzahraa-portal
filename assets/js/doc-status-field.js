/* =========================================================================
   doc-status-field.js — «صادر للتنفيذ» يُحفظ فعلاً بدل أن يُرفض دائماً
                         "ISSUED FOR CONSTRUCTION" ACTUALLY SAVES INSTEAD
                         OF ALWAYS BEING REFUSED
   -------------------------------------------------------------------------
   العطل · THE BUG

   departments.js:491 يعرّف حقل شاشة اسمه «status» بخيارات
   draft/issued/review/superseded/void، فيكتب مباشرة في عمود القاعدة
   status — وهو عمود دورة الاعتماد (workflow) نفسه، مقيَّد بـ CHECK
   (06-DEPARTMENTS-RECOVERY.sql:515) لا يقبل إلا
   draft/pending/reviewed/approved/rejected/returned/reversed. فاختيار
   «صادر للتنفيذ» — الخيار اليومي العادي على أي مستند صدر فعلاً — يُرفض
   من القاعدة دائماً، بلا استثناء. هذا هو نفس عطل trade/trades: حقلان
   مختلفا المعنى يتشاركان اسماً واحداً.

   departments.js:491 defines a screen field named "status" with options
   draft/issued/review/superseded/void, so it writes straight into the
   database's status column — the WORKFLOW column itself, constrained by
   a CHECK (06-DEPARTMENTS-RECOVERY.sql:515) to only
   draft/pending/reviewed/approved/rejected/returned/reversed. So picking
   "Issued for construction" — the ordinary, everyday choice for any
   document that has actually been issued — is refused by the database,
   every single time. This is the exact trade/trades bug shape: two
   fields with different meanings sharing one name.

   -------------------------------------------------------------------------
   الإصلاح · THE FIX

   عمود "documentStatus" موجود بالفعل في القاعدة، بلا استخدام قط
   (06-DEPARTMENTS-RECOVERY.sql:499؛ 39-DOCREGISTER-SAVE-TRAPS.sql يضيفه
   بأمان لأي نسخة لم تُشغَّل عليها 06 بعد، ويضيف له قائمة CHECK مطابقة).
   نعيد تسمية حقل الشاشة فقط — بلا لمس departments.js — ليكتب هناك بدلاً
   من عمود دورة الاعتماد.

   المطابقة مزدوجة الشرط عمداً: name === 'status' AND الخيارات تحوي
   'issued' — بحثنا في كل الشاشات (grep) فلا يوجد حقل آخر بخيار
   'issued'، فهذا يستهدف حقل docRegister وحده مهما تغيّرت الشاشات لاحقاً،
   بدل أن يخمّن بالاسم فقط ويصطدم بحقل status عادي (نشط/موقوف) في شاشة
   أخرى.

   The database column "documentStatus" already exists, never written to
   (06-DEPARTMENTS-RECOVERY.sql:499; 39-DOCREGISTER-SAVE-TRAPS.sql adds it
   safely for any copy that never ran 06 yet, plus a matching CHECK list).
   We only rename the SCREEN field — departments.js is not touched — so it
   writes there instead of the workflow column.

   The match is deliberately double-keyed: name === 'status' AND its
   options contain 'issued' — grepped across every screen, no other field
   anywhere uses an 'issued' option, so this targets docRegister's field
   alone no matter how the screens change later, instead of guessing by
   name alone and colliding with an ordinary active/inactive status field
   on some other screen.

   -------------------------------------------------------------------------
   الأعمدة في جدول القائمة · THE LIST-VIEW COLUMNS

   dc-requests.js اشتق mod.columns تلقائياً وقت تحميله (الشاشة لم تُعرِّف
   أعمدتها) وانتهى بترتيب ينتهي بـ 'status' — شارة دورة الاعتماد يجب أن
   تبقى آخر عمود كما في كل شاشة أخرى. هنا نُدرج 'documentStatus' قبل
   'status' مباشرة، فيصبح الجدول ٧ أعمدة، لا يُمسّ ترتيب الباقي.

   dc-requests.js derived mod.columns automatically at its own load time
   (the screen never declared its own) and ended with an order finishing
   in 'status' — the workflow badge must stay the last column, as on every
   other screen. Here we insert 'documentStatus' immediately before
   'status', making the table 7 columns; nothing else in the order moves.

   -------------------------------------------------------------------------
   ما لم يُبنَ هنا، وبصراحة · WHAT WAS DELIBERATELY NOT BUILT HERE

   الخطة طلبت أيضاً لفّ Alerts.list لإعادة تنبيه «نسخة ملغاة ما زالت في
   الموقع» بعد إعادة التسمية. قراءة dc-alerts.js نفسه (تعليقه الخاص،
   الأسطر ٤١-٨٢) تثبت أن هذا لا يكفي: الشاشة الفعلية وشارة القائمة
   الجانبية وبطاقتَا لوحة التحكم لا تستدعي Alerts.list المُصدَّرة إطلاقاً
   — تستدعي إغلاقاً (closure) داخلياً في dc-alerts.js نفسه
   (mergedList())، وهذا الإغلاق لا يرى أي استبدال خارجي لاحق لـ
   Alerts.list. فلفّ Alerts.list هنا، بعد أن حمَّل dc-alerts.js بالفعل
   (يُحمَّل هذا الملف بعده كما تطلب الخطة)، يعمل فقط عبر assistant.js:36
   ولا يظهر في الشاشة نفسها ولا الشارة ولا لوحة التحكم — نفس الفخ الذي
   وثَّقه dc-alerts.js عن نفسه وأصلحه باستبدال الدوال الخمس معاً، لا لفّ
   واحدة فقط. توقّفنا عن هذا الجزء تحديداً وأبلغنا عنه بدل شحن إصلاح
   يبدو تاماً ولا يظهر لأحد أبداً.

   The plan also asked for wrapping Alerts.list to restore the "a
   superseded copy is still on site" alert after the rename. Reading
   dc-alerts.js itself (its own comment, lines 41-82) proves this is not
   enough: the real alerts screen, the sidebar badge and both dashboard
   cards never call the exported Alerts.list at all — they call a private
   closure inside dc-alerts.js itself (mergedList()), and that closure
   cannot see any later outside replacement of Alerts.list. So wrapping
   Alerts.list here, after dc-alerts.js has already loaded (this file
   loads after it, as the plan asks), would only be reachable through
   assistant.js:36 — never the real screen, the badge, or the dashboard.
   The exact trap dc-alerts.js documents about itself and fixed by
   replacing all five exported functions together, not by wrapping one.
   We stopped on this specific piece and are reporting it rather than
   shipping a fix that looks complete and is never seen by anyone.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the field reverts to its
   name "status" exactly as departments.js defines it, mod.columns reverts
   to dc-requests.js's own derivation, and «صادر للتنفيذ» refuses again —
   nothing else in the portal is touched.

   يُحمَّل بعد dc-alerts.js (الترتيب مذكور أعلاه لسبب واحد فقط: كي يبقى
   واضحاً أن أي محاولة لاحقة للفّ Alerts هنا ستقع بعد أن تجمَّد دواله
   الخمسة بالفعل).
   Load after dc-alerts.js (the position is recorded above for one reason
   only: to keep it obvious that any later attempt to wrap Alerts here
   would run after its five functions are already frozen in place).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema || !Schema.MODULES) { console.error('doc-status-field.js needs schema.js first'); return; }

  var target = null, targetField = null;
  Schema.MODULES.forEach(function (m) {
    if (target || !m.fields) return;
    var f = m.fields.filter(function (x) {
      return x.name === 'status' && Array.isArray(x.options) &&
        x.options.some(function (o) { return o.value === 'issued'; });
    })[0];
    if (f) { target = m; targetField = f; }
  });

  if (!target || !targetField) {
    console.error('doc-status-field.js: no module matched name==="status" with an "issued" option — nothing changed');
    return;
  }

  if (targetField.name === 'documentStatus') {
    console.info('doc-status-field.js: already renamed — nothing to do.');
  } else {
    targetField.name = 'documentStatus';

    if (Array.isArray(target.columns)) {
      var iStatus = target.columns.indexOf('status');
      if (target.columns.indexOf('documentStatus') === -1) {
        if (iStatus === -1) target.columns.push('documentStatus');
        else target.columns.splice(iStatus, 0, 'documentStatus');
      }
    }

    console.info('doc-status-field.js: ' + target.id + '.status (options draft/issued/review/superseded/void) ' +
      'renamed to documentStatus — writes the real, unused DB column instead of the workflow status column. ' +
      'Table columns now: ' + (target.columns || []).join(', '));
  }

  global.DocStatusField = { module: target ? target.id : null };
})(window);
