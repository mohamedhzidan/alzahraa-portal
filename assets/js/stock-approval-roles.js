/* =========================================================================
   stock-approval-roles.js — من يعتمد مستندات المخازن
   stock-approval-roles.js — who may approve a stores document

   ── العطل، وقد أثبتُّه بنفسي لا بملاحظة ─────────────────────────────────
   بحثتُ في auth.js عن أي دور يملك `approve` على أيٍّ من شاشات المخازن
   الأربع (goodsReceipts · stockIssues · stockTransfers · stockCounts).
   **النتيجة: لا أحد. ولا دور واحد.**
   الوحيد الذي يصل إليها هو المدير العام عبر بند `'*'` الشامل في دوره —
   أي بالمصادفة لا بالتصميم. وأ. أحمد يكتب نحو خمسة مستندات في اليوم،
   فكلّها كانت تقف عند رجل واحد.

   ── ما يمنحه هذا الملف، بحكم المنسّق ────────────────────────────────────
     · `project_manager` (مدير الموقع) ← `approve` على **إذون الصرف**
     · `finance_manager` (المدير المالي) ← `approve` على **الجرد والتسويات**
     · أ. أحمد لا يعتمد شيئاً — ولا يتغيّر دوره إطلاقاً.

   ── 🔴 الطبقات الثلاث، وهذا الملف واحدة منها فقط ────────────────────────
   صلاحية في هذا البورتال تعيش في ثلاثة أماكن، وسقوط واحد منها **يفشل
   بصمت**، وقد لدغ هذا المشروع مرّتين:
     ١) هذا الملف — يُظهر الزرّ في المتصفح.
     ٢) جدول `role_workflow_permissions` في قاعدة البيانات — يسمح بالفعل
        نفسه. بدونه يظهر الزرّ ويُرفض الضغط برسالة
        «Approval not allowed» (03-PRODUCTION-HARDENING.sql:673).
        **ملفه: `1-SUPABASE/55-STOCK-APPROVAL-ROLES.sql` — لا بدّ من
        تشغيله، وإلّا فهذا الملف وحده زينة.**
     ٣) دالة `admin-users` — وهي **ليست في مسار الاعتماد**: auth.js:904-912
        تحرسها بـ`isAdmin()` وتخدم إدارة المستخدمين وحدها. الطبقة الثالثة
        هنا هي **إسناد الدور للحساب** — أي أن يكون لمدير الموقع فعلاً
        حسابٌ دورُه `project_manager`. لا يُرى ذلك من هذا الجهاز.

   ── 🔴 نتيجة عملية يجب أن يعرفها صاحب العمل ─────────────────────────────
   **الجرد يحتاج شخصين، لا واحداً.** `workflow-policy.js:61` يضع
   `stockCounts` في مرتبة FULL — أي مسودة ← مراجعة ← اعتماد — وهو ليس من
   الجداول الثلاثة عشر المسموح لها بالاعتماد بخطوة واحدة
   (24-ONE-STEP-APPROVAL.sql:81-83، بحثتُ: صفر تطابق). والمراجعة على
   الجرد مقصورة على admin وgm وreviewer (03-PRODUCTION-HARDENING.sql:326-328).
   فالسلسلة العاملة: **أحمد يكتب ← هشام يراجع ← المدير المالي يعتمد.**
   وقاعدة البيانات ترفض أن يكون المُراجع هو المُعتمِد نفسه، أو أن يكون
   أيّهما كاتب المستند (:673). هذا تصميم مقصود على مستند يغيّر قيمة
   المخزون، ولا يُخفَّف من هنا.
   أمّا **إذن الصرف** فمرتبته APPROVE وهو من الثلاثة عشر — فيعتمده مدير
   الموقع بخطوة واحدة، وهذا هو المستند اليومي.

   ── لماذا التعديل على `Auth.ROLES` وليس لفّ دالة ───────────────────────
   `auth.js` ملف للقراءة فقط، ولا يُعدَّل. و`permsFor` (auth.js:925) تقرأ
   `ROLES[current.role].perms` — و`global.Auth.ROLES` **هو نفس الكائن**
   لا نسخة منه (auth.js:1026). فالإضافة إلى ذلك الكائن تصل إلى `permsFor`
   فعلاً. **جرّبتُ ذلك قبل أن أبني عليه** ولم أفترضه: قبل التعديل
   `can('stockIssues','approve')` = false، وبعده true — وهذا مُثبَت في
   التجربة أيضاً.
   ولفّ `permsFor` كان سيكون طُعم «التصدير الميّت» — فهي دالة محلّية داخل
   الإغلاق ولا تُصدَّر أصلاً.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   THE FAULT, established by my own grep, not from a note: NO role in
   auth.js holds `approve` on any of the four stores screens. The only
   reach is the general manager's blanket `'*'` entry — by accident, not by
   design. أ. Ahmed writes about five documents a day and every one of them
   queued behind one man.

   WHAT THIS GRANTS, by the coordinator's ruling: project_manager may
   approve stock ISSUES; finance_manager may approve stock COUNTS; أ. Ahmed
   approves nothing and his role does not change at all.

   🔴 THREE LAYERS, AND THIS FILE IS ONE OF THEM. A permission lives in
   three places and missing one FAILS SILENTLY — it has bitten this project
   twice. (1) this file shows the button; (2) the database table
   `role_workflow_permissions` permits the act — without it the button
   appears and the press is refused with "Approval not allowed"
   (03-PRODUCTION-HARDENING.sql:673); its file is
   `1-SUPABASE/55-STOCK-APPROVAL-ROLES.sql` and it MUST be run or this file
   is decoration; (3) the `admin-users` function is NOT in the approval
   path — auth.js:904-912 gates it behind isAdmin() and it serves user
   administration only. The third layer here is that the site manager's
   account actually carries the role `project_manager`, which cannot be
   seen from this machine.

   🔴 A CONSEQUENCE THE OWNER MUST KNOW: a stock COUNT needs two people,
   not one. workflow-policy.js:61 puts stockCounts at the FULL tier
   (draft → reviewed → approved) and it is NOT one of the thirteen
   one-step tables (24-ONE-STEP-APPROVAL.sql:81-83 — I grepped: zero
   matches). Review on a count is limited to admin, gm and reviewer
   (03-PRODUCTION-HARDENING.sql:326-328). So the working chain is:
   Ahmed writes → هشام reviews → the financial manager approves. The
   database also refuses the reviewer being the approver, or either being
   the author (:673). That is deliberate on a document that changes
   inventory value and is not weakened from here. A stock ISSUE is at the
   APPROVE tier and IS one of the thirteen, so the site manager approves it
   in one step — and that is the daily document.

   WHY MUTATE Auth.ROLES RATHER THAN WRAP: auth.js is read-only. permsFor
   (auth.js:925) reads ROLES[current.role].perms, and global.Auth.ROLES is
   THAT OBJECT, not a copy (auth.js:1026) — so adding to it genuinely
   reaches permsFor. I TESTED that before building on it rather than
   assuming: before, can('stockIssues','approve') was false; after, true.
   Wrapping permsFor would have been the dead-export decoy — it is
   closure-local and never exported.

   حذف هذا الملف يعيد صلاحيات اليوم حرفياً. لا حقل، لا جدول، لا شاشة.
   Deleting this file restores today's permissions exactly. No field, no
   table, no screen.

   مُثبَت بالتشغيل / proven by running: TESTS/stock-approval-roles-trial.js
   (v2.0.31)
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Auth || !Auth.ROLES) {
    console.error('stock-approval-roles.js needs auth.js first — not installed');
    return;
  }

  /* الحكم، في مكان واحد. أي تغيير يبدأ من هنا ومن ملف SQL 55 معاً.
     The ruling, in one place. Any change starts here AND in SQL 55
     together — never one alone. */
  var GRANTS = [
    { role: 'project_manager', module: 'stockIssues', actions: ['approve'] },
    { role: 'finance_manager', module: 'stockCounts', actions: ['approve'] }
  ];

  var applied = [];

  GRANTS.forEach(function (g) {
    var r = Auth.ROLES[g.role];
    if (!r || !r.perms) {
      console.error('stock-approval-roles.js: role "' + g.role + '" is not defined in ' +
        'auth.js — nothing granted for it');
      return;
    }
    var list = r.perms[g.module];
    if (!Array.isArray(list)) {
      /* الدور لا يرى الشاشة أصلاً. لا نخترع له رؤية — نقول ونتوقّف.
         The role cannot even see the screen. We do not invent visibility
         for it; we say so and stop. */
      console.error('stock-approval-roles.js: role "' + g.role + '" has no entry for "' +
        g.module + '" in auth.js, so approve was NOT granted — this needs a decision, ' +
        'not a silent default');
      return;
    }
    g.actions.forEach(function (a) {
      if (list.indexOf(a) === -1) {
        list.push(a);                       /* نفس المصفوفة التي تقرأها permsFor */
        applied.push(g.role + '.' + g.module + '.' + a);
      }
    });
  });

  global.StockApprovalRoles = {
    GRANTS: GRANTS,
    applied: applied,
    /* للتجربة: هل وصلت المنحة إلى permsFor فعلاً؟
       For the trial: did the grant actually reach permsFor? */
    check: function (moduleId, action) {
      try { return !!Auth.can(moduleId, action); } catch (e) { return null; }
    }
  };

  console.info('stock-approval-roles.js ready — ' + applied.length + ' grant(s) applied: ' +
    (applied.join(', ') || 'none') +
    '  ⚠️ the browser is only ONE of three layers; SQL 55 must also be run.');
})(window);
