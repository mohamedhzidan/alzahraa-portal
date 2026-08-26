/* =========================================================================
   audit-security-events.js — أحداث الأمان تصل السجل الدائم على الخادم
                              Security events reach the permanent server log
   -------------------------------------------------------------------------
   الخطأ الذي يمنعه هذا الملف: خمسة أحداث حساسة كانت تُسجَّل في ذاكرة
   المتصفح فقط (Store.log بعلامة _localOnly) وتُمحى مع أول تحديث للصفحة:

     ١ · تصدير بيانات الشركة كاملة            (app.js:402)
     ٢ · مسؤول يعيد ضبط كلمة مرور موظف        (identity.js:172)
     ٣ · موظف يغيّر كلمة مروره                 (identity.js:196)
     ٤ · تحويل كل الحسابات لبريد الشركة        (identity.js:227)
     ٥ · تعديل بيانات الشركة الرسمية           (pages/settings.js:104)

   القرار المكتوب في DECISIONS.md: «سجل يمكن تعديله ليس سجلاً» — وهذه
   الخمسة كانت لا تصل السجل أصلاً. الآن تُكتب عبر AuditTrail.write في
   جدول audit الذي لا يستطيع أحد تعديله أو حذفه، ولا حتى مسؤول النظام.

   THE BUG THIS PREVENTS: five security-relevant events were recorded in
   browser memory only and wiped on the next page load. Per DECISIONS.md
   "a log that can be altered is not a log" — these five never reached
   the log at all. They now go through AuditTrail.write into the audit
   table nobody can edit or erase, not even the administrator.

   ويصلح أيضاً الازدواج: كان كل إنشاء/تعديل/إلغاء يظهر سطرين في شاشة
   السجل (سطر محلي + سطر الخادم) حتى أول تحديث. سطر الخادم يصل وحده
   خلال ثانية عبر البث المباشر (store.js:307 يشترك في جدول audit)،
   فنوقف السطر المحلي المكرر.
   ALSO FIXES the double entry: every ordinary action showed two lines
   in the audit screen (local + server) until a refresh. The server line
   arrives on its own within a second via realtime (store.js:307
   subscribes to the audit table), so the duplicate local push stops.

   إضافي بالكامل: احذف هذا الملف يعود السلوك السابق حرفياً.
   ADDITIVE: delete this file and previous behaviour returns exactly.
   يُحمَّل بعد audit-trail.js · Loads after audit-trail.js
   ========================================================================= */
(function (global) {
  'use strict';

  var SECURITY_ACTIONS = ['export', 'password_reset', 'password_changed', 'migrate_email'];

  function install() {
    var S = global.Store, A = global.AuditTrail;
    if (!S || !S.log || !A || !A.write) return;   /* بدون audit-trail لا نغيّر شيئاً */
    if (S.__securityAuditInstalled) return;
    S.__securityAuditInstalled = true;

    var origLog = S.log;

    S.log = function (action, entity, recordId, label, extra) {
      /* ١ · الأحداث الأمنية + تعديل بيانات الشركة → السجل الدائم.
             AuditTrail.write يتكفل بالاسم والوقت وطابور إعادة المحاولة.
         1 · Security events + company-profile edits → the permanent log.
             AuditTrail.write adds who/when and retries when offline. */
      if (SECURITY_ACTIONS.indexOf(action) !== -1 || entity === 'settings') {
        A.write(action, entity, recordId, label, extra);
        return;
      }
      /* ٢ · إنشاء/تعديل/إلغاء: audit-trail.js يكتبها على الخادم بالفعل
             ويصل سطرها عبر البث المباشر — فلا نكرّرها محلياً.
         2 · create/update/delete: audit-trail.js already writes these to
             the server and realtime delivers the line — skip the local
             duplicate that used to vanish on refresh anyway. */
      if (S.__auditInstalled &&
          ['create', 'update', 'delete'].indexOf(action) !== -1) return;
      /* ٣ · الباقي (login/logout مثلاً) يبقى كما كان تماماً.
         3 · Everything else (login/logout etc.) behaves exactly as before. */
      return origLog.apply(S, arguments);
    };
  }

  function start() {
    install();
    [0, 400, 1500, 4000].forEach(function (ms) { setTimeout(install, ms); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
