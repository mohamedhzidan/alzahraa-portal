/* =========================================================================
   money-owed.js — كم سُدِّد فعلاً من فاتورة المورد، وكم حُصِّل فعلاً من
                   مستخلص العميل
                   How much of a supplier invoice / client IPC is actually
                   settled
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   كل فاتورة مورد وكل مستخلص عميل يظهران على تسع شاشات وكأن كامل المبلغ
   ما زال مستحقاً إلى الأبد. supplierInvoices.paidAmount (schema.js:332)
   وclientIPCs.collectedAmount (schema.js:693) حقلان readonly ولا يوجد
   أي كود في الموقع يكتب فيهما أصلاً. الحقيقة موجودة في مكان آخر تماماً:
   payments.supplierInvoice (schema.js:359) وreceipts.clientIPC
   (schema.js:387)، بحالة "approved" فقط.

   Every supplier invoice and every client IPC shows the FULL amount as
   still owed forever, on nine screens. supplierInvoices.paidAmount
   (schema.js:332) and clientIPCs.collectedAmount (schema.js:693) are
   `readonly` fields that nothing in the site ever writes. The truth
   lives elsewhere: payments.supplierInvoice (schema.js:359) and
   receipts.clientIPC (schema.js:387), status "approved" only.

   الحل · THE FIX

   MoneyOwed.paidOf(invoiceId) يجمع amount من كل صف في سندات الصرف
   (payments) مرتبط بهذه الفاتورة وحالته "approved".
   MoneyOwed.collectedOf(ipcId) يفعل نفس الشيء على سندات القبض
   (receipts) لهذا المستخلص.

   MoneyOwed.paidOf(invoiceId) sums `amount` across approved payment
   vouchers linked to that invoice. MoneyOwed.collectedOf(ipcId) does the
   same across approved receipt vouchers for that IPC.

   ⚠️ لا علاقة لهذا الملف بدوال agents.js الخاصة بنفس الاسمين
      (paidOf/collectedOf عند agents.js:40 و51) — تلك دوال محلية داخل
      IIFE خاص بذلك الملف ولا تصل للخارج؛ لم يُمس agents.js هنا إطلاقاً.
   This file has nothing to do with agents.js's own same-named helpers
   (paidOf/collectedOf at agents.js:40 and 51) — those are private to
   that file's own IIFE and never reach outside it. agents.js is not
   touched here at all.

   الأداء · PERFORMANCE

   هاتان الدالتان تعملان عند كل رسم للوحة التحكم على تسع شاشات، فلا
   يصح حساب المجموع من الصفر لكل فاتورة/مستخلص في كل مرة (O(مدفوعات ×
   فواتير)). بدلاً من ذلك نبني فهرسين {معرّف: مجموع} مرة واحدة عند أول
   استدعاء فعلي (بحث O(1) بعدها)، ونُبطلهما عند أي تغيير في البيانات —
   Store.onChange (store.js:364) يبثّ عند كل عملية.

   These two functions run on every dashboard paint across nine screens,
   so summing from scratch per invoice/IPC every time (O(payments ×
   invoices)) is not acceptable. Instead we build two lazy index maps
   {id: sum} once on first real use (O(1) lookup after that), and
   invalidate them on any data change — Store.onChange (store.js:364)
   fires on every emit.

   ⭐ التدهور الرشيق — الجزء الحرج · GRACEFUL DEGRADATION — THE CRITICAL PART
   -------------------------------------------------------------------
   المشتريات (procurement) يرى فواتير الموردين بلا صلاحية رؤية سندات
   الصرف؛ والمكتب الفني (technical) ومدير المشروع (project_manager)
   يريان مستخلصات العملاء بلا صلاحية رؤية سندات القبض. إن لم يملك
   المستخدم Auth.canSee('payments') فإن paidOf ترجع صفراً، وبالمثل
   collectedOf مع Auth.canSee('receipts') — وهذا مطابق تماماً لسلوك
   اليوم (الحقل القديم الفارغ كان يُطرح كصفر أيضاً)، فلا يزداد أي رقم
   سوءاً لأي أحد.

   procurement sees supplierInvoices without payments permission;
   technical and project_manager see clientIPCs without receipts
   permission. If the user lacks Auth.canSee('payments'), paidOf returns
   0; same for collectedOf with Auth.canSee('receipts') — this is
   byte-identical to today's behaviour (the empty readonly field also
   subtracted 0 in every formula that used it), so no number gets worse
   for anyone.

   إضافي بالكامل: احذف هذا الملف وتعود كل الشاشات إلى قراءة الحقول
   readonly الفارغة كما كانت — نفس الرقم الخاطئ القديم، لا أسوأ.
   ADDITIVE: delete this file and every screen reverts to reading the
   empty readonly fields exactly as before — the same old wrong number,
   never worse.

   يُحمَّل بين print.js وalerts.js. Load between print.js and alerts.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store) { console.error('money-owed.js needs store.js first'); return; }

  var paidIndex = null, collectedIndex = null;

  function buildPaidIndex() {
    var idx = {};
    Store.all('payments').forEach(function (p) {
      if (p.status !== 'approved' || !p.supplierInvoice) return;
      idx[p.supplierInvoice] = (idx[p.supplierInvoice] || 0) + (Number(p.amount) || 0);
    });
    return idx;
  }

  function buildCollectedIndex() {
    var idx = {};
    Store.all('receipts').forEach(function (r) {
      if (r.status !== 'approved' || !r.clientIPC) return;
      idx[r.clientIPC] = (idx[r.clientIPC] || 0) + (Number(r.amount) || 0);
    });
    return idx;
  }

  /* أي تغيير في أي جدول قد يعني سند صرف أو قبض جديداً اعتُمد للتوّ —
     أبسط وأسلم من تخمين أسماء الجداول التي يُعتنى بها، وإعادة البناء
     نفسها لا تُنفَّذ إلا عند الاستدعاء الفعلي التالي، لا عند كل حدث.
     Any table change might be a payment or receipt just approved —
     simpler and safer than guessing which table names matter, and the
     rebuild itself only runs on the next real call, not on every event. */
  Store.onChange(function () { paidIndex = null; collectedIndex = null; });

  function paidOf(invoiceId) {
    if (!global.Auth || !Auth.canSee('payments')) return 0;
    if (!paidIndex) paidIndex = buildPaidIndex();
    return paidIndex[invoiceId] || 0;
  }

  function collectedOf(ipcId) {
    if (!global.Auth || !Auth.canSee('receipts')) return 0;
    if (!collectedIndex) collectedIndex = buildCollectedIndex();
    return collectedIndex[ipcId] || 0;
  }

  global.MoneyOwed = { paidOf: paidOf, collectedOf: collectedOf };
})(window);
