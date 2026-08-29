/* ref-label-resolve.js — الاسم الحقيقي بدل رقم قاعدة البيانات، في كل مكان
   The real name instead of the raw database id, everywhere. v2.0.21.

   إضافي بالكامل: يلفّ Schema.refLabel ولا يعدّل schema.js إطلاقاً. حذف هذا
   الملف (مع سطره في loader.js وservice-worker.js) يعيد سلوك اليوم بالضبط.
   Purely additive: wraps Schema.refLabel and never edits schema.js.
   Deleting this file (with its loader.js and service-worker.js lines)
   restores today's behaviour exactly.

   الخلل الذي يمنعه، بالحرف: أحمد يختار رسمة في إرسالية ويترك الخانات
   الحرّة فارغة، فيُطبع على خطاب موجَّه إلى هيئة الطرق سطرٌ يعرّف الرسمة
   بأنها `dr1` — رقم قاعدة البيانات الخام، بلا كود ولا عنوان ولا مراجعة.
   السبب (المصيدة المغلقة الرابعة الموثَّقة في هذا المشروع): refLabel داخل
   schema.js ينادي دالة get الداخلية المغلقة عليها، لا النسخة المصدَّرة
   التي لفّتها ملفات التسجيل الخارجية (sites.js وdepartments.js
   وhr-department.js وsheets-templates.js) — فأي شاشة سُجّلت خارج schema.js
   لا يجدها، ويرتدّ إلى الرقم الخام. القياس التجريبي (V18): أربعة من ٢١
   هدفاً مكسورة — sites وwir وpourCards وdocRegister — والعطب أوسع من
   الطباعة: البحث بالاسم لا يجد شيئاً، والفرز يرتّب بالرقم، وملف CSV
   المصدَّر يحمل الرقم الخام أيضاً (pages/entity.js:169/:182/:283).
   وrefLabel لا مُنادي داخلياً له في schema.js، فكل المستهلكين يمرّون من
   النسخة المصدَّرة — لذلك هذا اللف الواحد يصلح الشاشة والطباعة والبحث
   والفرز والتصدير معاً.
   The bug, verbatim: Ahmed picks a drawing on a transmittal, leaves the
   free-text boxes empty, and the covering note to the Roads Authority
   identifies the drawing as `dr1` — the raw database id. Cause (the
   FOURTH documented closure trap on this project): refLabel inside
   schema.js calls its closure-internal get, not the exported one that
   the external registrar files wrapped — so any screen registered
   outside schema.js is never found and it falls back to the raw id.
   Measured (V18): 4 of 21 targets broken — sites, wir, pourCards,
   docRegister — and the damage covers search, sort and CSV export, not
   just print. refLabel has no internal caller in schema.js, so every
   consumer goes through the export — which is why this ONE wrap fixes
   screen, print, search, sort and export together.

   لماذا يُقرأ Schema.get وقتَ النداء لا وقتَ التحميل: ملفات التسجيل تلفّ
   get واحدة فوق الأخرى، وبعضها قد يُحمَّل بعدنا — القراءة وقت النداء ترى
   السلسلة كاملة مهما كان الترتيب. (نفس درس app.js:326: الإمساك بالمرجع
   وقت التحميل هو أصل هذه العائلة من الأعطال.)
   Why Schema.get is read AT CALL TIME, never captured at load: the
   registrar files wrap get one on top of another, and some may load
   after us — call-time reading sees the whole chain in any order. (The
   app.js:326 lesson: capturing a reference at load time is the root of
   this whole family of faults.) */
(function (global) {
  'use strict';

  function install() {
    var S = global.Schema;
    if (!S || !S.refLabel || !S.get) {
      if (typeof setTimeout === 'function') setTimeout(install, 200);
      return;
    }
    var orig = S.refLabel;
    S.refLabel = function (f, value) {
      /* الفارغ يبقى «—» كما كان — الأصل يتكفّل به.
         Empty stays '—' exactly as before — the original handles it. */
      if (!value) return orig.call(S, f, value);
      try {
        var target = global.Schema.get(f && f.ref);
        if (target && target.table && global.Store && global.Store.find) {
          var row = global.Store.find(target.table, value);
          if (row) {
            return row[f.refLabel || 'name'] || row.name || row.docNo ||
                   row.code || value;
          }
        }
      } catch (e) { /* أي عطل هنا يعني: تصرّف كما قبل هذا الملف تماماً */ }
      /* لم نجد أفضل من سلوك الأصل — نعيده كما هو (سجل محذوف، هدف مجهول…)
         Nothing better found — hand back exactly the original behaviour
         (deleted record, unknown target, …). */
      return orig.call(S, f, value);
    };
  }

  install();
})(typeof window !== 'undefined' ? window : this);
