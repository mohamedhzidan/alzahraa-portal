/* db-hard-columns.js — مُولَّد آلياً، لا تُعدَّل يدوياً · GENERATED, DO NOT HAND-EDIT
   -------------------------------------------------------------------------
   Regenerate:  node TESTS/generate-db-hard-columns.js — v2.0.38: made by that same generator, unedited, over the chain below
                (the same generator, unedited, over 1-SUPABASE 01→77 + package 81→84 + cut 85→90 — v2.0.38)
   Sources (86): 1-SUPABASE/_baseline-2026-08-12-do-not-run/01-SUPABASE-SETUP.sql, 1-SUPABASE/_baseline-2026-08-12-do-not-run/06-DEPARTMENTS-RECOVERY.sql, 1-SUPABASE/04-PRODUCTION-GRANTS.sql, 1-SUPABASE/05-VERIFY-PRODUCTION.sql, 1-SUPABASE/06-HR-DEPARTMENT.sql, 1-SUPABASE/07-HR-APPROVALS.sql, 1-SUPABASE/08-SITES.sql, 1-SUPABASE/09-SITE-ENFORCEMENT.sql, 1-SUPABASE/10-ATTACHMENTS.sql, 1-SUPABASE/11-FIX-AHMED-ROLE.sql, 1-SUPABASE/12-DC-REQUESTS.sql, 1-SUPABASE/13-DEPARTMENT-TABLES.sql, 1-SUPABASE/14-WHY-NOTHING-SAVES.sql, 1-SUPABASE/15-FIX-INVISIBLE-DATA.sql, 1-SUPABASE/16-FIND-THE-CONFLICT.sql, 1-SUPABASE/17-ROLE-POLICIES.sql, 1-SUPABASE/18-UNSTICK-DRAFTS.sql, 1-SUPABASE/19-ACCOUNTABILITY.sql, 1-SUPABASE/20-ROBOT-ACCOUNT.sql, 1-SUPABASE/21-TECHNICAL-AND-GM-FIXES.sql, 1-SUPABASE/22-RETENTION-RELEASED-DATE.sql, 1-SUPABASE/23-CLOSE-HR-SECURITY-HOLE.sql, 1-SUPABASE/24-ONE-STEP-APPROVAL.sql, 1-SUPABASE/25-CLIENT-IPC-WITHHOLDING.sql, 1-SUPABASE/26-LOOKUP-POLICIES.sql, 1-SUPABASE/27-MIR-APPROVERS.sql, 1-SUPABASE/28-DC-DISCOVERY.sql, 1-SUPABASE/29-HEALTH-CHECK.sql, 1-SUPABASE/30-DOCUMENT-NUMBERING.sql, 1-SUPABASE/31-DOCUMENT-NUMBERING-YEAR.sql, 1-SUPABASE/32-ATTACHMENT-TEXT.sql, 1-SUPABASE/33-INSURANCE-WAGE.sql, 1-SUPABASE/34-ATTACHMENT-SITE-REPAIR.sql, 1-SUPABASE/35-SHEET-TEMPLATES.sql, 1-SUPABASE/36-SITES-READ-SCOPE.sql, 1-SUPABASE/37-EXPECTED-COLLECTION-DATE.sql, 1-SUPABASE/38-PROJECT-SITE.sql, 1-SUPABASE/39-DOCREGISTER-SAVE-TRAPS.sql, 1-SUPABASE/40-AUTHORITY-IPC-FIELDS.sql, 1-SUPABASE/41-LEAVE-TWO-SIGNATURES.sql, 1-SUPABASE/42-HR-MANAGER-SEES-EMPLOYEE-DATA.sql, 1-SUPABASE/43-ATTACHMENT-DELETE-LOCK.sql, 1-SUPABASE/44-ATTACHMENT-READ-FENCE.sql, 1-SUPABASE/45-CHECK-EVERYTHING.sql, 1-SUPABASE/46-AUDIT-SIGNATURE-LOCK.sql, 1-SUPABASE/47-STOCK-TRANSFER-PRECHECK.sql, 1-SUPABASE/48-STOCK-ARRIVAL-DOOR.sql, 1-SUPABASE/49-DELEGATED-ACCOUNTS.sql, 1-SUPABASE/50-WHO-OPENED-THE-PORTAL.sql, 1-SUPABASE/51-CORRESPONDENCE-REPLY-DATE.sql, 1-SUPABASE/52-IS-THE-SITE-FENCE-ON-DOCUMENTS.sql, 1-SUPABASE/53-WHO-REALLY-SEES-WHICH-SITES.sql, 1-SUPABASE/54-CHECK-BEFORE-v2028.sql, 1-SUPABASE/55-STOCK-APPROVAL-ROLES.sql, 1-SUPABASE/56-TEST-ACCOUNT-SEES-ONLY-TEST-SITE.sql, 1-SUPABASE/57-CLOSE-THE-THREE-OPEN-TABLES.sql, 1-SUPABASE/58-LOCK-THE-DELETE-AND-CLOSE-PAY.sql, 1-SUPABASE/59-RETIRE-THE-SPARE-TEST-ACCOUNT.sql, 1-SUPABASE/60-REPAIR-THE-BLANK-SITES.sql, 1-SUPABASE/61-CANCELLING-NEEDS-TWO-SIGNATURES.sql, 1-SUPABASE/62-STAFF-LIST-MANAGERS-ONLY.sql, 1-SUPABASE/63-PRIVATE-FILES-AND-DELETE-WITH-REASON.sql, 1-SUPABASE/64-EMERGENCY-LOGIN-ACTUALLY-WORKS.sql, 1-SUPABASE/65-SAMPLE-DATA-FOR-THE-TEST-SITE.sql, 1-SUPABASE/66-AUDIT-SITE-COLUMN.sql, 1-SUPABASE/67-EMPLOYEE-NAMES-FOR-DROPDOWNS.sql, 1-SUPABASE/68-EMPTY-PROJECT-LIST-MEANS-NOTHING.sql, 1-SUPABASE/69-ONE-STEP-APPROVE-WORKS-SAFELY.sql, 1-SUPABASE/70-ROBOT-READ-ONLY-SHARED-LISTS.sql, 1-SUPABASE/71-NEW-DOCUMENTS-START-AS-DRAFTS.sql, 1-SUPABASE/72-SEND-THROUGH-ONE-DOOR-AND-LOCK-ADVANCES.sql, 1-SUPABASE/73-ONE-EMPLOYEE-NUMBER.sql, 1-SUPABASE/74-MONEY-TOTALS-AGREE.sql, 1-SUPABASE/75-BLANK-SITE-SALARIES-STAY-HIDDEN.sql, 1-SUPABASE/76-APPROVED-DOCUMENT-KEEPS-ITS-ATTACHMENTS.sql, 1-SUPABASE/77-THE-COMPANY-DAY-IS-CAIRO.sql, 1-SUPABASE/81-EMPLOYEE-SHEET-COLUMNS.sql, 1-SUPABASE/82-PAYROLL-DRAFT-BUILDER.sql, 1-SUPABASE/83-LEAVE-BALANCES.sql, 1-SUPABASE/84-INSURANCE-WAGE-VISIBLE.sql, 1-SUPABASE/85-ACC-SITES-AND-MONEY-SITE.sql, 1-SUPABASE/86-BOOKS-AUTOMATIC-ACCOUNTING.sql, 1-SUPABASE/87-CUSTODY-DOCUMENTS.sql, 1-SUPABASE/88-BOOKS-FOR-CUSTODY-AND-SUPPLIERS.sql, 1-SUPABASE/89-SUPPLIERS-ALLOCATIONS-STATEMENTS.sql, 1-SUPABASE/90-BOOKS-STAY-OFF.sql
   Generated:   2026-09-19T16:17:08.860Z
   Tables with hard columns: 70   Hard columns total: 224
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
  "az_p11_insurance_band": [
    "max_wage",
    "min_wage"
  ],
  "az_p11_leave_entitlement": [
    "annual_days"
  ],
  "az_p11_leave_ledger": [
    "days",
    "employee",
    "kind",
    "year"
  ],
  "az_p12_account_map": [
    "account",
    "role"
  ],
  "az_p12_currency_alias": [
    "code"
  ],
  "az_p12_entry_source": [
    "route",
    "source_id",
    "source_table"
  ],
  "az_p12_lock_override": [
    "action",
    "period",
    "reason"
  ],
  "az_p12_posting_rules": [
    "amount_source",
    "doc_type",
    "line_key",
    "note_ar",
    "note_en",
    "role",
    "side"
  ],
  "az_p12_settings": [
    "value"
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
  "custodySettlements": [
    "custodyAccount",
    "date"
  ],
  "custodyTransfers": [
    "amount",
    "date",
    "fromCashAccount",
    "toCashAccount"
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
  "policy_backup_acc": [
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
  "site_repair_60": [
    "outcome",
    "row_id",
    "source",
    "table_name"
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
