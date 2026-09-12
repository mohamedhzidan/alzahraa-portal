/* =========================================================================
   inbox-project-fence.js — لا يُعرَض على أحد ما لا يملك مشروعه
   ---------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف، مُثبَت بالقياس لا بالملاحظة:

   بصفة project_manager عرض Workflow.inbox() أربعة أذون صرف بانتظار
   الاعتماد، بينما الشاشة نفسها لا تعرض شيئاً — ٤ في الصندوق و٠ على
   الشاشة. السبب: workflow.js:151-167 inbox() يتحقّق من الحالة ومن
   Auth.can(...) ومن أنك لست منشئ المستند فقط — بلا أي سياج مشروعات.
   والسجل نفسه يمرّ عبر Auth.scopeRows (auth.js:1020-1034) الذي يرفض
   بصمت (fail-closed) حين تكون قائمة مشروعات المستخدم فارغة. فالنتيجة:
   الصندوق يَعِد بأربعة، والسجل يُظهر صفراً — نفس الشخص، نفس اللحظة.

   THE FAULT THIS FILE PREVENTS, measured, not observed: as
   project_manager, Workflow.inbox() offered 4 stock issues to approve
   while the same screen showed 0 rows. workflow.js:151-167 inbox()
   gates only on status, Auth.can(...) and not-self — no project fence
   at all. The register itself goes through Auth.scopeRows
   (auth.js:1020-1034), which fails CLOSED on an empty project list. So
   the inbox promised four, the register showed zero — same person,
   same moment.

   ── حكم صاحب العمل، ١٠ سبتمبر ٢٠٢٦ (بالحرف) ─────────────────────────────
   «أبقِ قيود المشروع كما هي. أعلن التعارض ووجّه الطلب إلى معتمِد مخوَّل
   عبر قواعد التوجيه المعتمدة الموجودة. لا تمنح الشخص المُسنَد إليه
   أصلاً وصولاً إضافياً على المستندات/المشروعات/المرفقات. لا تخمّن بديلاً
   ولا تُضِف صلاحية توقيع. إن تعذّر تحديد وجهة مخوَّلة، اعرض حالة توجيه
   غير مُسنَد قابلة للتصرّف واحفظ السجل المعلَّق لحلٍّ مخوَّل. اتّبع قواعد
   السرّية القائمة حتى في رسالة التعارض.»

   THE OWNER'S RULING, 10 Sept 2026 (verbatim): keep the project
   restrictions. Flag the mismatch and route to an authorised approver
   using the existing routing rules. Never widen the originally assigned
   person's access. Never guess a replacement or add signing rights. If
   no authorised destination exists, show an actionable unassigned
   condition and keep the pending record. Follow confidentiality rules
   even in the mismatch message.

   ── لا يوجد جدول توجيه في هذا البورتال أصلاً ─────────────────────────────
   لا شيء هنا «مُسنَد» لشخص بعينه. أي مستند «قيد الانتظار»/«مُراجَع» يظهر
   لكل حساب يملك الفعل ولم يكن هو من أنشأه — ومنهم gm الذي يملك '*'
   شاملاً. فـ«توجيهه لمعتمِد مخوَّل» يعني هنا فقط: **لا تعرضه على من
   يستبعده السياج**، واتركه بلا تغيير لمن يملكه فعلاً. لا يُخترَع أحد،
   وحالة السجل لا تتغيّر أبداً — لا هنا ولا في أي مكان في هذا الملف.

   THE KEY DESIGN FACT: this portal has no routing table — nothing is
   ever assigned to a person. A pending/reviewed document already
   appears in the inbox of every account that holds the action and did
   not create it, gm included via its blanket '*'. So "route to an
   authorised approver" means only: stop OFFERING it to someone the
   fence excludes, and leave it exactly where it already sits. The
   record's status is never touched by this file.

   ── إضافي بحت ─────────────────────────────────────────────────────────
   يلفّ Workflow.inbox / Workflow.inboxCount / Workflow.actions /
   Workflow.transition و ApprovalsPage.render. لا يعدّل workflow.js ولا
   pages/approvals.js. حذف هذا الملف يعيد سلوك اليوم حرفياً: الصندوق
   يَعِد بما لا تراه الشاشة، كما كان.

   PURELY ADDITIVE — wraps Workflow.inbox / Workflow.inboxCount /
   Workflow.actions / Workflow.transition and ApprovalsPage.render.
   Neither workflow.js nor pages/approvals.js is touched. Deleting this
   file restores today's behaviour exactly: the inbox promising what
   the screen does not show.

   مُثبَت بالتشغيل / proven by running: TESTS/inbox-project-fence-trial.js
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function txt(pair) { return (global.L ? L(pair) : (isAr() ? pair.ar : pair.en)); }

  /* الأفعال الخمسة التي يعنيها الحكم بـ«اعتماد» على مستند — الإرسال
     ليس بينها عمداً، فأمين المخزن بقائمة فارغة يجب أن يستطيع إرسال
     مستنده هو رغم ذلك. The five actions the ruling means by "approval"
     on a document — submit is deliberately absent, so a storekeeper
     with an empty project list can still submit their own document. */
  var BLOCKED_ACTIONS = ['review', 'approve', 'return', 'reject', 'reverse'];

  /* هل هذا السجل خارج نطاق مشروعات/مواقع صاحب الحساب؟ نفس الحارس
     الذي يستعمله السجل نفسه — Auth.scopeRows على مصفوفة من عنصر واحد.
     لا نخترع قاعدة ثانية، لئلا تختلف عن قاعدة القائمة يوماً.
     Is this record outside the current account's project/site scope?
     The EXACT guard the register itself uses — Auth.scopeRows on a
     one-item array. Never a second rule, so it can never drift from
     the list's own rule. */
  function isFenced(moduleId, rec) {
    if (!rec) return false;
    try { return Auth.scopeRows(moduleId, [rec]).length === 0; }
    catch (e) { return false; }   /* عطل في الحارس نفسه لا يمنع أحداً هنا */
  }

  function noticeItem() {
    return {
      key: '_projectFenced', disabled: true, cls: 'btn-outline',
      label: txt({
        ar: 'هذا المستند على مشروع/موقع غير مسند إلى حسابك — راجع مسؤول النظام',
        en: 'This document is on a project/site not assigned to your account — contact the system administrator'
      })
    };
  }

  function refusalMessage() {
    return txt({
      ar: 'هذا الإجراء غير متاح — المستند على مشروع/موقع غير مسند إلى حسابك.',
      en: 'This action is not available — the document is on a project/site not assigned to your account.'
    });
  }

  /* بطاقة العَلَم في صندوق الاعتمادات — انظر القيود الصارمة في نهاية
     الملف قبل تعديل هذه الدالة: لا رقم مستند، لا اسم مشروع، لا منشئ،
     لا تاريخ، لا مبلغ. حكم المالك ينصّ صراحة: «اتّبع قواعد السرّية
     القائمة حتى في رسالة التعارض».
     The flag card — read the hard limits at the foot of this file
     before touching this function: no document number, no project
     name, no creator, no date, no amount. The owner's ruling states it
     explicitly: follow existing confidentiality rules even in the
     mismatch message. */
  function cardHTML(withheld) {
    var rows = (withheld.byModule || []).map(function (m) {
      var sentence = isAr()
        ? 'عدد ' + m.count + ' مستند (' + m.label + ') بانتظار اعتماد على مشروعات غير مسندة إلى حسابك، ' +
          'وقد تُرك لمن يملك اعتماده. إن كان اعتماده من عملك، اطلب من مدير النظام مراجعة قائمة مشروعاتك ' +
          '(الإعدادات ← المستخدمون).'
        : m.count + ' ' + m.label + ' document(s) await approval on projects not assigned to your account, ' +
          'and were left for whoever holds that approval. If approving them is your job, ask the system ' +
          'administrator to review your project list (Settings → Users).';
      return '<div class="muted small" style="margin-top:4px">' + UI.esc(sentence) + '</div>';
    }).join('');
    return '<div class="card mb-2"><div class="card-body">' +
      '<h4 style="margin:0 0 4px">' + UI.esc(txt({ ar: '⚠️ مستندات مسحوبة من صندوقك', en: '⚠️ Documents withheld from your inbox' })) + '</h4>' +
      rows + '</div></div>';
  }

  function install() {
    if (!global.Workflow || !global.Auth || !global.Schema || !global.Store || Workflow.__inboxFenceInstalled) return;
    Workflow.__inboxFenceInstalled = true;

    /* ١ · صندوق الاعتمادات — يُخفى عن الحساب ما يستبعده السياج، ويُحسب
       المسحوب لكل شاشة على حدة. يستدعي Auth.scopeRows مرة واحدة لكل
       شاشة موجودة في الصندوق، لا مرة لكل سجل — أرخص، ونفس ما تفعله
       القوائم أصلاً. «تحتاج تصحيحاً» (mine) لا تُمسّ إطلاقاً: عمل
       الشخص نفسه المُرجَع/المرفوض، لا صلة له بمشروع غيره.
       1 · The inbox — hides from the account whatever the fence
       excludes, and counts what was withheld, per screen. Calls
       Auth.scopeRows once per screen present in the box, not once per
       row — cheaper, and exactly what the register itself already
       does. "mine" is left completely untouched: a person's own
       returned/rejected work has nothing to do with someone else's
       project. */
    var origInbox = Workflow.inbox;
    Workflow.inbox = function () {
      var box = origInbox.apply(Workflow, arguments) || { toReview: [], toApprove: [], mine: [] };
      var withheldTotal = 0;
      var byModuleMap = {};

      ['toReview', 'toApprove'].forEach(function (key) {
        var items = box[key] || [];
        if (!items.length) return;
        var byMod = {};
        items.forEach(function (x) {
          var mid = x.module.id;
          (byMod[mid] = byMod[mid] || { module: x.module, items: [] }).items.push(x);
        });
        var kept = [];
        Object.keys(byMod).forEach(function (mid) {
          var entry = byMod[mid];
          var rows = entry.items.map(function (x) { return x.record; });
          var allowed;
          try { allowed = Auth.scopeRows(mid, rows); } catch (e) { allowed = rows; }
          var allowedIds = {};
          allowed.forEach(function (r) { allowedIds[r.id] = true; });
          entry.items.forEach(function (x) {
            if (allowedIds[x.record.id]) { kept.push(x); return; }
            withheldTotal++;
            var b = byModuleMap[mid] || (byModuleMap[mid] = { id: mid, label: txt(entry.module.label), count: 0 });
            b.count++;
          });
        });
        box[key] = kept;
      });

      box.withheld = { total: withheldTotal, byModule: Object.keys(byModuleMap).map(function (k) { return byModuleMap[k]; }) };
      return box;
    };

    /* العدّاد يُعاد بناؤه من Workflow.inbox الحالية أياً كانت — نفس
       أسلوب one-step-approval.js بالضبط، ويعمل سواء حُمِّل ذلك الملف
       قبل هذا الملف أو بعده أو غاب كلياً؛ لا يعتمد على أيّهما وُجد.
       The counter is rebuilt from whatever Workflow.inbox currently
       is — the exact same idiom one-step-approval.js already uses, and
       it works whether that file loaded before this one, after it, or
       not at all; it depends on neither's presence. */
    Workflow.inboxCount = function () {
      var i = Workflow.inbox();
      return i.toReview.length + i.toApprove.length + i.mine.length;
    };

    /* ٢ · أزرار شاشة المستند نفسها — باب ثانٍ غير صندوق الاعتمادات.
       دخول مباشر لسجل خارج النطاق (رابط مباشر مثلاً) لا يزال يُخفي
       أزرار الاعتماد، ويشرح السبب بدل شاشة صامتة.
       2 · The buttons on the document's own detail screen — a second
       door besides the inbox. Reaching an out-of-scope record directly
       (a deep link, for instance) still hides the approval buttons, and
       explains why instead of a silent screen. */
    var origActions = Workflow.actions;
    Workflow.actions = function (moduleId, rec) {
      var list = origActions.apply(Workflow, arguments) || [];
      if (!isFenced(moduleId, rec)) return list;
      var out = list.filter(function (a) { return BLOCKED_ACTIONS.indexOf(a.key) === -1; });
      if (!out.some(function (a) { return a.key === '_projectFenced'; })) out.push(noticeItem());
      return out;
    };

    /* ٣ · التنفيذ — يُرفض قبل أي نداء للخادم، أياً كان مسار
       Workflow.transition الحالي وقت التثبيت (السيرة العادية أو
       التوقيع الواحد)، لأننا نستدعي origTransition (وهو ما كان
       موجوداً وقت هذا اللفّ) فقط بعد أن نتأكد أن السجل ليس مسيَّجاً.
       3 · Execution — refused before any server call, whatever
       Workflow.transition's current path was at install time (the
       ordinary route or the one-step route), because origTransition
       (whatever existed at wrap time) is only ever called once the
       record has been proven NOT fenced. */
    var origTransition = Workflow.transition;
    Workflow.transition = async function (moduleId, id, action, reason) {
      if (BLOCKED_ACTIONS.indexOf(action) !== -1) {
        var mod = Schema.get(moduleId);
        var rec = mod && Store.find(mod.table, id);
        if (isFenced(moduleId, rec)) return { ok: false, error: refusalMessage() };
      }
      return origTransition.apply(Workflow, arguments);
    };

    /* ٤ · البطاقة على شاشة الاعتمادات — بعد الرسم الأصلي فقط، فلا
       تُمحى بإعادة الرسم؛ محروسة بعلَم خاص بها لأن ApprovalsPage قد لا
       يكون معرَّفاً بعد وقت تثبيت الأجزاء الثلاثة أعلاه.
       4 · The card on the approvals screen — appended AFTER the
       original render only, so a re-render never erases it; guarded by
       its own flag because ApprovalsPage may not exist yet at the
       moment the three pieces above are installed. */
    function wrapApprovalsRender() {
      if (!global.ApprovalsPage || ApprovalsPage.__fenceCardInstalled) return;
      ApprovalsPage.__fenceCardInstalled = true;
      var origRender = ApprovalsPage.render;
      ApprovalsPage.render = function (host) {
        origRender.apply(ApprovalsPage, arguments);
        var box = Workflow.inbox();
        /* host.innerHTML += … لا insertAdjacentHTML — أبسط وأضمن توافقاً
           مع أي جذر DOM يصل إليه host، ونفس ما يفعله pages/approvals.js
           بنفسه في هذا السطر بالضبط (host.innerHTML = html أعلاه).
           host.innerHTML += … not insertAdjacentHTML — simpler and safer
           against whatever DOM root `host` turns out to be, and exactly
           what pages/approvals.js itself already does one line earlier
           (host.innerHTML = html above). */
        if (box.withheld && box.withheld.total > 0) host.innerHTML = host.innerHTML + cardHTML(box.withheld);
      };
    }
    if (global.ApprovalsPage) wrapApprovalsRender();
    else document.addEventListener('DOMContentLoaded', wrapApprovalsRender);

    console.info('inbox-project-fence.js ready — the inbox no longer offers documents outside the account\'s own projects/sites.');
  }

  if (global.Workflow) install();
  else document.addEventListener('DOMContentLoaded', install);
})(window);
