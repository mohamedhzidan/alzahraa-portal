/* db-hard-columns.js — مُولَّد آلياً، لا تُعدَّل يدوياً · GENERATED, DO NOT HAND-EDIT
   -------------------------------------------------------------------------
   Regenerate:  node TESTS/generate-db-hard-columns.js
   Sources (38): /Users/mohamedzidan/Downloads/01-SUPABASE-SETUP.sql, /Users/mohamedzidan/Downloads/06-DEPARTMENTS-RECOVERY.sql, 1-SUPABASE/04-PRODUCTION-GRANTS.sql, 1-SUPABASE/05-VERIFY-PRODUCTION.sql, 1-SUPABASE/06-HR-DEPARTMENT.sql, 1-SUPABASE/07-HR-APPROVALS.sql, 1-SUPABASE/08-SITES.sql, 1-SUPABASE/09-SITE-ENFORCEMENT.sql, 1-SUPABASE/10-ATTACHMENTS.sql, 1-SUPABASE/11-FIX-AHMED-ROLE.sql, 1-SUPABASE/12-DC-REQUESTS.sql, 1-SUPABASE/13-DEPARTMENT-TABLES.sql, 1-SUPABASE/14-WHY-NOTHING-SAVES.sql, 1-SUPABASE/15-FIX-INVISIBLE-DATA.sql, 1-SUPABASE/16-FIND-THE-CONFLICT.sql, 1-SUPABASE/17-ROLE-POLICIES.sql, 1-SUPABASE/18-UNSTICK-DRAFTS.sql, 1-SUPABASE/19-ACCOUNTABILITY.sql, 1-SUPABASE/20-ROBOT-ACCOUNT.sql, 1-SUPABASE/21-TECHNICAL-AND-GM-FIXES.sql, 1-SUPABASE/22-RETENTION-RELEASED-DATE.sql, 1-SUPABASE/23-CLOSE-HR-SECURITY-HOLE.sql, 1-SUPABASE/24-ONE-STEP-APPROVAL.sql, 1-SUPABASE/25-CLIENT-IPC-WITHHOLDING.sql, 1-SUPABASE/26-LOOKUP-POLICIES.sql, 1-SUPABASE/27-MIR-APPROVERS.sql, 1-SUPABASE/28-DC-DISCOVERY.sql, 1-SUPABASE/29-HEALTH-CHECK.sql, 1-SUPABASE/30-DOCUMENT-NUMBERING.sql, 1-SUPABASE/31-DOCUMENT-NUMBERING-YEAR.sql, 1-SUPABASE/32-ATTACHMENT-TEXT.sql, 1-SUPABASE/33-INSURANCE-WAGE.sql, 1-SUPABASE/34-ATTACHMENT-SITE-REPAIR.sql, 1-SUPABASE/35-SHEET-TEMPLATES.sql, 1-SUPABASE/36-SITES-READ-SCOPE.sql, 1-SUPABASE/37-EXPECTED-COLLECTION-DATE.sql, 1-SUPABASE/38-PROJECT-SITE.sql, 1-SUPABASE/39-DOCREGISTER-SAVE-TRAPS.sql
   Generated:   2026-08-27T17:45:34.025Z
   Tables with hard columns: 57   Hard columns total: 188
   -------------------------------------------------------------------------
   لكل جدول، أعمدة NOT NULL بلا قيمة افتراضية بعد استثناء ما يملؤه النظام
   تلقائياً — هذه هي الأعمدة التي سترفضها القاعدة إن وصلت فارغة، حتى في
   مسودة. يقرأها draft-guard.js فقط. أعد إنتاج هذا الملف كلما تغيّر SQL،
   ولا تكتب فيه شيئاً يدوياً أبداً — أي تعديل يدوي يضيع عند إعادة التوليد.

   For every table, the NOT NULL columns with no default, after excluding
   what the system fills automatically — these are the columns the
   database will refuse if they arrive empty, even in a draft. Read only
   by draft-guard.js. Regenerate this file whenever the SQL changes, and
   never hand-edit it — any manual change is lost on the next run.
 */
(function (global) {
  'use strict';
  global.DbHardColumns = {
  "accounts": [
    "code",
    "name",
    "type"
  ],
  "announcements": [
    "body",
    "date",
    "title"
  ],
  "asphaltRecords": [
    "date",
    "layerType",
    "project"
  ],
  "attachment_text": [
    "attachmentId",
    "module",
    "recordId",
    "source"
  ],
  "attachments": [
    "module",
    "path",
    "recordId"
  ],
  "attendance": [
    "attStatus",
    "date",
    "employee"
  ],
  "budgets": [
    "date",
    "project",
    "version"
  ],
  "cashAccounts": [
    "code",
    "kind",
    "name"
  ],
  "clientContracts": [
    "contractNo",
    "customer",
    "originalValue",
    "project",
    "title"
  ],
  "clientIPCs": [
    "cumulativeWork",
    "customer",
    "date",
    "ipcNo",
    "project"
  ],
  "correspondence": [
    "date",
    "direction",
    "party",
    "subject"
  ],
  "costItems": [
    "code",
    "name",
    "type"
  ],
  "customers": [
    "code",
    "name"
  ],
  "distribution": [
    "docKind",
    "name"
  ],
  "docArchive": [
    "boxNo",
    "location",
    "title"
  ],
  "docRegister": [
    "kind",
    "revision",
    "title"
  ],
  "doc_counters": [
    "prefix"
  ],
  "drawings": [
    "drawingNo",
    "project",
    "title"
  ],
  "employees": [
    "code",
    "department",
    "jobTitle",
    "name"
  ],
  "equipment": [
    "code",
    "name"
  ],
  "equipmentLogs": [
    "date",
    "equipment",
    "logType"
  ],
  "goodsReceipts": [
    "date",
    "supplier",
    "warehouse"
  ],
  "itAssets": [
    "code",
    "name"
  ],
  "itTickets": [
    "date",
    "description",
    "requester",
    "subject"
  ],
  "items": [
    "baseUnit",
    "code",
    "name"
  ],
  "journal": [
    "date",
    "description"
  ],
  "labourAllocation": [
    "date",
    "project"
  ],
  "leaves": [
    "days",
    "employee",
    "fromDate",
    "leaveType",
    "reason",
    "toDate"
  ],
  "legalDocs": [
    "docType",
    "refNo",
    "title"
  ],
  "mir": [
    "date",
    "item",
    "project"
  ],
  "ncr": [
    "date",
    "description",
    "project"
  ],
  "payments": [
    "amount",
    "beneficiary",
    "cashAccount",
    "date",
    "description",
    "payeeType"
  ],
  "payroll": [
    "date",
    "period"
  ],
  "policy_backup_09": [
    "policy_name",
    "table_name"
  ],
  "policy_backup_38": [
    "policy_name",
    "table_name"
  ],
  "pourCards": [
    "date",
    "element",
    "project",
    "volume"
  ],
  "projects": [
    "code",
    "contractValue",
    "customer",
    "name"
  ],
  "purchaseApprovals": [
    "costItem",
    "date",
    "project",
    "reason"
  ],
  "receipts": [
    "amount",
    "cashAccount",
    "customer",
    "date",
    "description"
  ],
  "rfi": [
    "date",
    "project",
    "question",
    "replyDue",
    "subject",
    "toParty"
  ],
  "safetyReports": [
    "date",
    "description",
    "kind",
    "project"
  ],
  "siteInstructions": [
    "date",
    "instruction",
    "issuedBy",
    "project"
  ],
  "siteReports": [
    "date",
    "project",
    "workDone"
  ],
  "stockCounts": [
    "date",
    "warehouse"
  ],
  "stockIssues": [
    "costItem",
    "date",
    "project",
    "purpose",
    "receivedBy",
    "warehouse"
  ],
  "stockTransfers": [
    "date",
    "fromWarehouse",
    "toWarehouse"
  ],
  "subContracts": [
    "contractNo",
    "contractValue",
    "project",
    "subcontractor",
    "title"
  ],
  "subIPCs": [
    "cumulativeWork",
    "date",
    "ipcNo",
    "project",
    "subcontractor"
  ],
  "subcontractors": [
    "code",
    "name"
  ],
  "submittals": [
    "date",
    "project",
    "title",
    "type"
  ],
  "supplierInvoices": [
    "date",
    "subTotal",
    "supplier",
    "supplierInvoiceNo"
  ],
  "suppliers": [
    "code",
    "name"
  ],
  "surveyRecords": [
    "date",
    "project",
    "purpose"
  ],
  "transmittals": [
    "date",
    "party",
    "subject"
  ],
  "users": [
    "name",
    "username"
  ],
  "warehouses": [
    "code",
    "name"
  ],
  "wir": [
    "date",
    "project",
    "workItem"
  ]
};
})(window);
