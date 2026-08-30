/* =========================================================================
   workflow-status-column.js — شاشات الموقع والتنفيذ تُظهر حالة السجل
   workflow-status-column.js — site & execution screens show the record state

   ── شكوى المالك (٣٠ أغسطس ٢٠٢٦)، حرفياً ─────────────────────────────────
   «شغل الموقع والتنفيذ لا يظهر عليه أي دليل مسودة أو محفوظ — هي just there.»

   ── العطل، مقيساً بعد الدفعة ────────────────────────────────────────────
   شاشات مثل «طلبات فحص الأعمال» و«بطاقات الصبّة» شاشات اعتماد حقيقية
   (workflow:true وقت التشغيل) وتكتب الحالة فعلاً في السجل — لكن قائمتها
   لا تعرض عمود الحالة إطلاقاً. صفّ حقيقي يقرأ:
       WIR-002   30/08/2026   p1   —   —   —
   فالسجل «مسودة» في القاعدة، والشاشة لا تقول شيئاً. الموظف لا يعرف هل
   قدّمه أم لا، ولا لماذا لا يراه أحد.

   ── لماذا يحدث ذلك ─────────────────────────────────────────────────────
   dc-requests.js deriveColumns() يضيف عمود «الحالة» **فقط** إذا وجد حقلاً
   اسمه status داخل m.fields. وشاشات الاعتماد لا تُعرّف مثل هذا الحقل —
   حالتها تعيش في عمود دورة الاعتماد بالقاعدة، لا في حقل على الشاشة. فلا
   تُضاف. أي أن الشاشات التي **لها** حالة حقيقية هي وحدها التي لا تعرضها.

   ── لماذا الإضافة آمنة هنا ولا تكرّر انهيار سجل المستندات ───────────────
   🔴 هذا بالضبط ما حطّم شاشة سجل المستندات من قبل: عمود status بلا حقل
   status، فـ colField يُرجع null وentity.js يقرأ .options على لا شيء.
   لكن اقرأ entity.js:136-138: إن كانت الوحدة workflow **يعود فوراً**
   بـ Workflow.badgeHTML(rec.status) ولا يلمس colField إطلاقاً. الانهيار
   كان في الفرع الآخر — غير workflow. لذلك نضيف العمود **لشاشات الاعتماد
   وحدها**، ولا نضيفه أبداً لغيرها. هذا الشرط ليس تجميلاً، هو ما يمنع
   تكرار الانهيار.

   ── يعمل بعد التخفيض عمداً ─────────────────────────────────────────────
   يُحمَّل بعد workflow-policy.js، لأن ذاك يُنزّل شاشات طبقة السجل إلى
   workflow=false عند التحميل (شاشات أ. أحمد الأربع). لو عملنا قبله لرأينا
   القيمة المُعلَنة لا الحقيقية، ولأضفنا العمود لشاشات لا حالة اعتماد لها
   — أي لأعدنا الانهيار بأنفسنا.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   The owner, 30 Aug 2026: "site and execution work shows no draft/saved
   indication at all — they are just there."

   Screens like Work Inspection Requests and Pour Cards ARE real approval
   screens (workflow:true at runtime) and really do write a status — but
   their list shows no status column. A real row reads
       WIR-002   30/08/2026   p1   —   —   —
   so the record is a draft in the database and the screen says nothing.

   Why: dc-requests.js deriveColumns() appends the status column ONLY when it
   finds a field named `status` in m.fields. Approval screens define no such
   field — their status lives in the database's workflow column, not as a
   screen field. So the very screens that HAVE a real state are the ones that
   never show it.

   🔴 Why adding it is safe here, and does not repeat the document-register
   crash: that crash was a status column with NO status field, where
   colField returns null and entity.js reads .options off nothing. But
   entity.js:136-138 returns Workflow.badgeHTML(rec.status) IMMEDIATELY when
   the module is workflow, never touching colField. The crash was the other
   branch. So we add the column to APPROVAL screens ONLY, never to others.
   That condition is not tidiness — it is what prevents the crash returning.

   Loaded after workflow-policy.js on purpose: that file demotes RECORD-tier
   screens to workflow=false at load. Running earlier we would read the
   DECLARED flag instead of the real one and add the column to screens with
   no approval cycle — recreating the crash ourselves.

   مُثبَت بالتشغيل / proven by running:
   TESTS/workflow-status-column-trial.js  (v2.0.28)
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Schema || !Schema.MODULES) return false;
    if (Schema.__wfStatusColumnInstalled) return false;

    var added = [];
    (Schema.MODULES || []).forEach(function (m) {
      if (!m || !Array.isArray(m.columns)) return;
      /* 🔴 وقت التشغيل، بعد تخفيض workflow-policy.js:117
         RUNTIME, after workflow-policy.js:117's demotion */
      if (!m.workflow) return;
      if (m.columns.indexOf('status') !== -1) return;

      /* «الحالة» آخر عمود دائماً — هكذا تقرأ كل الشاشات الأخرى في البورتال،
         وهو نفس ما يفعله deriveColumns حين يجد حقلاً.
         Status is always the LAST column — how every other screen in the
         portal reads, and what deriveColumns itself does when it finds a
         field. */
      m.columns.push('status');
      added.push(m.id);
    });

    Schema.__wfStatusColumnInstalled = true;
    if (added.length) {
      try {
        console.info('[workflow-status-column] status column added to ' +
          added.length + ' approval screen(s): ' + added.join(', '));
      } catch (e) {}
    }
    global.WorkflowStatusColumn = { added: added };
    return true;
  }

  /* dc-requests.js يشتقّ الأعمدة عند تحميله، وworkflow-policy.js يخفّض
     الطبقات عند تحميله. كلاهما قبلنا في loader.js، فالتثبيت المباشر يكفي —
     والمحاولتان أدناه لحالة تحميل غير متوقّعة فقط.
     dc-requests.js derives the columns at its load and workflow-policy.js
     demotes tiers at its load. Both are before us in loader.js, so a direct
     install suffices — the retries below are only for an unexpected order. */
  if (!install() && global.document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', install);
    setTimeout(install, 1500);
  }
})(window);
