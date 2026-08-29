/* ============================================================================
   account-fence.js — سياج الرتب لإدارة الحسابات المفوّضة
                      The rank fence for delegated account management

   ما الذي يفعله هذا الملف (بالعربية أولاً):
   ------------------------------------------------------------------------
   قبل هذا الملف: محمد زيدان وحده (admin) يستطيع إنشاء حساب أو إعادة ضبط
   كلمة مرور أو إيقاف حساب. مهندسو الموقع يبدأون ١ سبتمبر، فيصير هو عنق
   الزجاجة لكل حساب جديد.

   بعد هذا الملف: أ. محمد عمارة (hr_manager) وأ. حسانين (finance_manager)
   يديران حسابات أي موقع، لكن **فقط للرتب الأدنى منهما تماماً**. وموظف
   شؤون العاملين بالموقع (hr) يدير حسابات فئة الموظفين **في موقعه هو فقط**.

   ⚠️ القاعدة الحاكمة: «أدنى تماماً» — لا مساواة أبداً. عمارة لا يستطيع
   إنشاء hr_manager آخر، ولا لمس حسانين (نفس الرتبة)، ولا لمس هشام (أعلى).
   هذه إجابة المالك الحرفية على السؤال الثاني: «no».

   ------------------------------------------------------------------------
   THE ONE GATE — لماذا كل شيء يمر من دالة واحدة
   ------------------------------------------------------------------------
   المواصفة تشترط أن **نفس سياج الرتب** يحكم صلاحية الإدارة **وصلاحية رؤية
   سجل النشاط**، حتى لا ينفصلا أبداً. لذلك لا توجد هنا دالتان متشابهتان:
   توجد دالة داخلية واحدة `evaluate()` وكل شيء آخر ينادي عليها.

   The spec requires the SAME rank fence to drive BOTH management rights AND
   audit visibility so the two can never drift apart. So there are not two
   similar functions here — there is ONE internal `evaluate()` and everything
   else calls it. `canManageAccount` and `canSeeAccountAudit` are the SAME
   code path; the only difference is that the audit question asks about no
   target role. Attack D5 in 8-SECURITY/ATTACK-LIST-delegation.md exists to
   prove exactly this, and it can only pass because of the shape below.

   ------------------------------------------------------------------------
   ⚠️ THE LADDER IS THE SINGLE SOURCE OF TRUTH — ثلاث نسخ، مصدر واحد
   ------------------------------------------------------------------------
   الجدول `RANKS` أدناه هو الأصل. تُشتق منه نسختان أخريان:
     1. دالة SQL  `az_role_rank()`  في ملف قاعدة البيانات المرقّم
     2. كتلة داخل الـ Edge Function  `admin-users`
   أي تعديل هنا يوجب تعديل الاثنين. الانفصال بينها هو الخطأ الصامت الذي
   كلّف هذا المشروع يومين، مرتين (HISTORY rule 2 / permissions.md).

   The ladder below is the ORIGINAL. Two mirrors are generated from it: the
   SQL function `az_role_rank()` and a block inside the admin-users Edge
   Function. Editing one without the others is the silent failure that has
   cost this project two days, twice. All three files say this sentence.

   ------------------------------------------------------------------------
   الملف إضافي بالكامل — حذفه يعيد السلوك القديم تماماً (admin وحده).
   Fully additive: deleting this file restores admin-only behaviour exactly.
   ============================================================================ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     ١ · السلّم — البيانات. THE LADDER — data, not code.
     رقم أعلى = سلطة أعلى. المقارنة دائماً «أدنى تماماً» (<) وليست (<=).
     Higher number = more authority. Comparison is always STRICTLY BELOW.
     ══════════════════════════════════════════════════════════════════════ */
  var RANKS = {
    /* ٥ · لا يُمسّون — Untouchable. */
    admin: 5,
    breakglass: 5,
    /* ٤ · المدير العام (هشام) — untouchable by every delegate. */
    gm: 4,
    /* ٣ · المديران المفوَّضان — عمارة وحسانين. متساويان عمداً، فلا يلمس
           أحدهما الآخر (هجوم A8). Deliberately equal so neither can touch
           the other. */
    finance_manager: 3,
    hr_manager: 3,
    /* ٢ · رؤساء الأقسام والمواقع. */
    accountant: 2,
    procurement: 2,
    storekeeper: 2,
    project_manager: 2,
    technical: 2,
    site_engineer: 2,
    document_control: 2,
    hr: 2,
    legal: 2,
    it: 2,
    reviewer: 2,
    /* ١ · فئة الموظفين. */
    employee: 1,
    /* ٠ · حسابات خاصة — لها رتبة كي لا تكون «مجهولة»، لكنها ممنوعة تماماً
           على كل مفوَّض (هجوم E3). auditor يقرأ كل شيء على مستوى الشركة،
           فمن يصنع auditor يصنع بابًا خلفيًا لتسريب البيانات.
           They carry a rank so they are never "unknown", but the hard-deny
           set below refuses them outright: an auditor reads everything
           company-wide, so a delegate minting one is an exfiltration path. */
    auditor: 0,
    robot: 0
  };

  /* أدوار لا يجوز لأي مفوَّض إنشاؤها ولا تعديلها ولا إسنادها — مهما كانت رتبته.
     تُفحص قبل أي مقارنة رتب، فلا تنقذها ثغرة في الأرقام.
     Never creatable, editable or assignable by ANY delegate, whatever their
     rank. Checked BEFORE any number comparison, so no arithmetic hole can
     rescue them. (Attack E3.) */
  var NEVER_TOUCH = ['admin', 'breakglass', 'robot', 'auditor'];

  /* ══════════════════════════════════════════════════════════════════════
     ٢ · جدول التفويض — من يدير ماذا، وفي أي نطاق.
     THE DELEGATION TABLE — who manages what, and in which scope.
     ══════════════════════════════════════════════════════════════════════ */
  var DELEGATES = {
    hr_manager:      { tier: 2, scope: 'any',  assign: 'below-rank' },
    finance_manager: { tier: 2, scope: 'any',  assign: 'below-rank' },
    /* الفئة الثالثة: شؤون عاملين الموقع — موقعه هو فقط، وفئة الموظفين فقط. */
    hr:              { tier: 3, scope: 'site', assign: ['employee'] }
  };

  /* الأدوار التي تملك canManageUsers في auth.js اليوم (admin, breakglass).
     هذه تمرّ دون أي سياج — سلوكها لا يتغيّر بحرف.
     The roles that already hold canManageUsers in auth.js. They pass through
     untouched — their behaviour does not change by one character.

     ⚠️ لا نعتمد على تحميل auth.js قبلنا. لو سُئل السياج قبل جاهزية Auth
     لكان admin نفسه سيُرفض وتتعطّل شاشة المالك. لذلك نعرف الرتبة ٥ من
     السلّم أيضاً — والمصدران متطابقان عمداً (admin و breakglass وحدهما).
     We do not depend on auth.js having loaded first. If the fence were asked
     before Auth was ready, the OWNER himself would be refused and his own
     screen would break. So rank 5 from our own ladder counts too; the two
     sources are deliberately identical (admin and breakglass only). Found by
     TESTS/users-delegation-fence-trial.js trial P6, not by reading. */
  var FULL_ADMIN_RANK = 5;
  function isFullAdmin(actor) {
    if (!actor) return false;
    if (RANKS[actor.role] === FULL_ADMIN_RANK) return true;
    var r = global.Auth && Auth.ROLES && Auth.ROLES[actor.role];
    return !!(r && r.canManageUsers);
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٣ · الرتبة — تفشل مغلقة. RANK — fails closed.
     دور غير معروف ⇒ null. و null يُرفض في الاتجاهين: لا يَحكم ولا يُحكَم
     عليه (هجوم F2). القيمة 0 صحيحة وليست غيابًا، لذلك المقارنة صريحة.
     An unknown role returns null, and null is refused in BOTH directions —
     it can neither manage nor be managed (attack F2). 0 is a real rank, not
     an absence, so the check is explicit rather than falsy.
     ══════════════════════════════════════════════════════════════════════ */
  function rank(role) {
    if (typeof role !== 'string' || !role) return null;
    return Object.prototype.hasOwnProperty.call(RANKS, role) ? RANKS[role] : null;
  }

  function siteOf(row) {
    if (!row) return null;
    var s = row.site;
    /* '' و null و undefined كلها «بلا موقع». الفراغ ليس موقعًا يُطابَق.
       Empty string, null and undefined are all "no site". An empty site is
       never a match — see the C2 note in evaluate(). */
    return (typeof s === 'string' && s.trim()) ? s.trim() : null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٤ · البوابة الواحدة. THE ONE GATE.

     evaluate(actor, subject, targetRole, opts) → { ok, code, reason }

       actor      — الحساب الذي يحاول الفعل (المستخدم الحالي)
       subject    — صف الحساب المستهدف من جدول users
       targetRole — الدور الذي يُسنَد (عند الإنشاء أو تغيير الدور). null إن
                    كان السؤال عن رؤية سجل فقط.
       opts.newSite — الموقع الجديد عند محاولة نقل حساب بين المواقع.

     الترتيب مقصود: الفحوص التي تفشل مغلقة أولاً.
     The order is deliberate: the checks that fail closed come first.
     ══════════════════════════════════════════════════════════════════════ */
  function deny(code, ar, en) {
    return { ok: false, code: code, reason: global.L ? L({ ar: ar, en: en }) : ar };
  }

  function evaluate(actor, subject, targetRole, opts) {
    opts = opts || {};

    if (!actor || !subject) {
      return deny('no-actor', 'تعذّر التحقق من الصلاحية.', 'Permission could not be checked.');
    }

    /* ٤.١ — المدير الكامل (admin/breakglass) يمرّ كما كان دائماً. */
    if (isFullAdmin(actor)) return { ok: true, code: 'full-admin', reason: '' };

    /* ٤.٢ — هل هذا الدور مفوَّض أصلاً؟ */
    var d = DELEGATES[actor.role];
    if (!d) {
      return deny('not-delegate', 'هذا الحساب لا يملك صلاحية إدارة الحسابات.',
        'This account may not manage accounts.');
    }

    /* ٤.٣ — رتبة الفاعل. مجهولة ⇒ رفض (F2). */
    var aRank = rank(actor.role);
    if (aRank === null) {
      return deny('actor-unranked', 'دور هذا الحساب غير معروف للسياج، فالطلب مرفوض.',
        'This account\'s role is unknown to the fence, so the request is refused.');
    }

    /* ٤.٤ — لا أحد يدير حساب نفسه، مهما كانت رتبته (هجوم A4: رفع الذات).
             Nobody manages their own account — the self-elevation attack. */
    if (subject.id && actor.id && String(subject.id) === String(actor.id)) {
      return deny('self', 'لا يمكنك تعديل حسابك أنت من هذه الشاشة.',
        'You cannot act on your own account here.');
    }

    /* ٤.٥ — الحسابات الخاصة ممنوعة تماماً، قبل أي حساب أرقام (هجوم E3). */
    if (NEVER_TOUCH.indexOf(subject.role) !== -1) {
      return deny('protected-account', 'هذا حساب محميّ ولا يُدار من هنا.',
        'This is a protected account and is not managed from here.');
    }
    /* الحساب المسمّى admin محميّ باسمه أيضاً، لا برتبته وحدها. */
    if (subject.username === 'admin') {
      return deny('protected-account', 'هذا حساب محميّ ولا يُدار من هنا.',
        'This is a protected account and is not managed from here.');
    }

    /* ٤.٦ — رتبة المستهدف. مجهولة ⇒ رفض (F2، الاتجاه الثاني). */
    var sRank = rank(subject.role);
    if (sRank === null) {
      return deny('subject-unranked', 'دور هذا الحساب غير معروف للسياج، فالطلب مرفوض.',
        'That account\'s role is unknown to the fence, so the request is refused.');
    }

    /* ٤.٧ — ⭐ القلب: أدنى تماماً. المساواة مرفوضة (A1، A6، A8، F1).
             THE HEART: strictly below. Equal rank is refused. */
    if (!(sRank < aRank)) {
      return deny('rank', 'لا يمكنك إدارة حساب في رتبتك أو أعلى منها.',
        'You cannot manage an account at or above your own level.');
    }

    /* ٤.٨ — نطاق الموقع للفئة الثالثة (شؤون عاملين الموقع).
             ⚠️ الموقع الفارغ لا يُطابق شيئاً. في قاعدة البيانات
             `az_can_site(NULL)` ترجع true — أي أن الحساب بلا موقع مرئي
             للجميع (08-SITES.sql). لو ورثنا ذلك السلوك هنا لصار كل حساب
             بلا موقع في متناول كل موظف شؤون عاملين في الشركة. لذلك
             المطابقة هنا صارمة (هجوم C2). */
    if (d.scope === 'site') {
      var aSite = siteOf(actor);
      var sSite = siteOf(subject);
      if (!aSite) {
        return deny('actor-no-site', 'حسابك غير مرتبط بموقع، فلا يمكنك إدارة حسابات.',
          'Your account has no site, so you cannot manage accounts.');
      }
      if (!sSite || sSite !== aSite) {
        return deny('site', 'هذا الحساب ليس في موقعك.', 'That account is not at your site.');
      }
      /* نقل حساب إلى موقع آخر أو منه = تجاوز للنطاق (هجوم C3). */
      if (opts.newSite !== undefined && opts.newSite !== null) {
        var nSite = siteOf({ site: opts.newSite });
        if (!nSite || nSite !== aSite) {
          return deny('site-move', 'لا يمكنك نقل حساب إلى موقع آخر.',
            'You cannot move an account to another site.');
        }
      }
    }

    /* ٤.٩ — الدور المُسنَد. هذا هو هجوم A5 «التصعيد بالوكالة»: حساب أدنى
             رتبة يُعدَّل ليصير gm. الفحص على الدور **الجديد**، لا على
             رتبة الصف الحالي وحدها. يشمل مسار التحديث كما الإنشاء (B5).
             Attack A5, escalation-by-proxy: the fence checks the role being
             ASSIGNED, not only the current rank of the row being edited —
             and it runs on UPDATE exactly as on CREATE (attack B5). */
    if (targetRole !== undefined && targetRole !== null && targetRole !== '') {
      if (NEVER_TOUCH.indexOf(targetRole) !== -1) {
        return deny('assign-protected', 'لا يمكنك إسناد هذا الدور.',
          'You cannot assign that role.');
      }
      var tRank = rank(targetRole);
      if (tRank === null) {
        return deny('assign-unranked', 'هذا الدور غير معروف للسياج، فالطلب مرفوض.',
          'That role is unknown to the fence, so the request is refused.');
      }
      if (!(tRank < aRank)) {
        return deny('assign-rank', 'لا يمكنك إسناد دور في رتبتك أو أعلى منها.',
          'You cannot assign a role at or above your own level.');
      }
      if (Array.isArray(d.assign) && d.assign.indexOf(targetRole) === -1) {
        return deny('assign-class', 'يمكنك إسناد دور الموظف فقط.',
          'You may assign the employee role only.');
      }
    }

    return { ok: true, code: 'ok', reason: '' };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٥ · الواجهات العامة — كلها تنادي evaluate().
     PUBLIC SURFACES — every one of them calls evaluate().
     ══════════════════════════════════════════════════════════════════════ */

  function canManageAccount(actor, subject, targetRole, opts) {
    return evaluate(actor, subject, targetRole, opts);
  }

  /* رؤية سجل النشاط = نفس السؤال بلا دور مُسنَد. **نفس مسار الكود** —
     وهذا ما يجعل الانفصال مستحيلاً بالبناء لا بالوعد (هجوم D5).
     Audit visibility is the same question with no assigned role. The SAME
     code path — which is what makes drift impossible by construction rather
     than by promise (attack D5). */
  function canSeeAccountAudit(actor, subject) {
    return evaluate(actor, subject, null, {}).ok;
  }

  /* الأدوار التي تظهر في القائمة المنسدلة. مبنية من نفس السلّم، فلا يمكن
     أن تعرض القائمة ما يرفضه السياج. */
  function assignableRoles(actor) {
    if (isFullAdmin(actor)) return Object.keys((global.Auth && Auth.ROLES) || RANKS);
    var d = DELEGATES[actor && actor.role];
    if (!d) return [];
    var aRank = rank(actor.role);
    if (aRank === null) return [];
    var known = Object.keys((global.Auth && Auth.ROLES) || RANKS);
    return known.filter(function (r) {
      if (NEVER_TOUCH.indexOf(r) !== -1) return false;
      var tr = rank(r);
      if (tr === null || !(tr < aRank)) return false;
      if (Array.isArray(d.assign) && d.assign.indexOf(r) === -1) return false;
      return true;
    });
  }

  function isDelegate(actor) { return !!(actor && DELEGATES[actor.role]); }

  /* هل تُفتح تبويبة «المستخدمون»؟ ⚠️ لا نوسّع Auth.isAdmin() أبداً — فهي
     تحكم أيضاً تعديل بيانات الشركة وبذر المواقع والمسار الافتراضي، وتوسيعها
     يمنح المفوَّض أشياء لم يوافق عليها المالك.
     We never broaden Auth.isAdmin(): it also gates company-profile editing,
     site seeding and the default route. Broadening it would hand a delegate
     powers the owner never approved. */
  function canOpenUsersTab(actor) {
    return isFullAdmin(actor) || isDelegate(actor);
  }

  /* الموقع المفروض على أي حساب ينشئه مفوَّض من الفئة الثالثة. */
  function forcedSiteFor(actor) {
    var d = DELEGATES[actor && actor.role];
    if (d && d.scope === 'site') return siteOf(actor);
    return null;
  }

  global.AccountFence = {
    RANKS: RANKS,
    DELEGATES: DELEGATES,
    NEVER_TOUCH: NEVER_TOUCH,
    rank: rank,
    evaluate: evaluate,
    canManageAccount: canManageAccount,
    canSeeAccountAudit: canSeeAccountAudit,
    assignableRoles: assignableRoles,
    isDelegate: isDelegate,
    isFullAdmin: isFullAdmin,
    canOpenUsersTab: canOpenUsersTab,
    forcedSiteFor: forcedSiteFor
  };
})(window);

/* ============================================================================
   ٦ · التغليف — ربط السياج بالمتصفح.
   THE WRAPPERS — binding the fence to the browser layer.

   ⚠️ هذه الطبقة الأولى من ثلاث. المتصفح **ليس** السياج: من يفتح الطرفية
   (console) يتجاوزه في ثانية. الطبقتان الأخريان (سياسات قاعدة البيانات،
   والـ Edge Function) ترفضان كلٌّ على حدة، وهذا ما تثبته التجارب السلبية.
   This is layer ONE of three. The browser is NOT the fence — anyone with a
   console bypasses it in a second. The database policies and the Edge
   Function each refuse on their own; the negative trials prove each alone.
   ============================================================================ */
(function (global) {
  'use strict';

  function ready() { return global.Auth && global.AccountFence; }

  function install() {
    if (!ready()) { setTimeout(install, 120); return; }
    if (Auth.__accountFenceInstalled) return;
    Auth.__accountFenceInstalled = true;

    var Fence = global.AccountFence;

    /* ── ٦.١ · تغليف Auth.adminUsers ─────────────────────────────────────
       admin يمرّ إلى الأصل بلا تغيير. المفوَّض يُفحص أولاً، ثم يُنادى
       الـ Edge Function مباشرة (لأن الأصل يرفض غير الـ admin عند auth.js:905).
       Admin passes to the original untouched. A delegate is fenced first,
       then invokes the Edge Function directly — the original refuses every
       non-admin before any network call (auth.js:905). */
    var origAdminUsers = Auth.adminUsers;

    Auth.adminUsers = async function (action, payload) {
      var me = Auth.current();
      if (Fence.isFullAdmin(me)) return origAdminUsers.call(Auth, action, payload);
      if (!Fence.isDelegate(me)) return origAdminUsers.call(Auth, action, payload);

      payload = payload || {};

      /* migrate_domain يعيد كتابة بريد كل حساب في الشركة — يبقى للمالك وحده.
         migrate_domain rewrites every account's login. Owner only. */
      if (action === 'migrate_domain') {
        return { ok: false, error: L({ ar: 'هذا الإجراء للمالك وحده.', en: 'That action is for the owner only.' }) };
      }

      var verdict;
      if (action === 'create') {
        /* عند الإنشاء لا يوجد صف بعد: الرتبة المُقاسة هي الدور المطلوب نفسه. */
        var forced = Fence.forcedSiteFor(me);
        if (forced) payload.site = forced;          /* الفئة الثالثة: الموقع مفروض */
        var pseudo = { id: null, role: payload.role, site: payload.site || null, username: payload.username };
        verdict = Fence.canManageAccount(me, pseudo, payload.role, {});
        /* ⚠️ حساب بلا موقع يرى كل المواقع (08-SITES.sql). فرض الموقع هنا
           ليس تجميلاً — بدونه أول حساب ينشئه موظف موقع يولد مطّلعاً على
           كل المواقع. الخادم يفرضه مرة أخرى؛ هذه ليست الحارس الوحيد. */
        if (verdict.ok && !payload.site) {
          return { ok: false, error: L({ ar: 'يجب اختيار الموقع قبل حفظ الحساب.', en: 'A site must be chosen before the account is saved.' }) };
        }
      } else {
        var subject = findUser(payload.userId);
        if (!subject) {
          return { ok: false, error: L({ ar: 'تعذّر العثور على الحساب.', en: 'Account not found.' }) };
        }
        verdict = Fence.canManageAccount(me, subject, payload.role, { newSite: payload.site });
      }

      if (!verdict.ok) return { ok: false, error: verdict.reason };

      var client = Auth.client();
      if (!client) return { ok: false, error: 'no-client' };
      var res = await client.functions.invoke('admin-users', {
        body: Object.assign({ action: action }, payload)
      });
      if (res.error) {
        var body = (res.error && res.error.message) || '';
        /* ⚠️ الحالة المتوقَّعة قبل تحديث برنامج الحسابات: البرنامج يرفض كل
           من ليس المالك، فيصل الرفض هنا نصاً غامضاً («forbidden»، «invalid
           account data»، أو 401/403). لو تُرك كما هو لظنّ أ. محمد عمارة أن
           الموقع معطّل، ولسأل المالك، ولضاع وقت الاثنين على شيء معروف.
           نترجمه إلى جملة تقول الحقيقة: الخطوة الأخيرة لم تُنفَّذ بعد.
           ⚠️ The expected state BEFORE the accounts program is updated: it
           refuses anyone who is not the owner, and the refusal arrives here
           as an opaque string — "forbidden", "invalid account data", or a
           bare 401/403. Left raw, عمارة would think the site was broken, ask
           the owner, and both would lose time on something already known.
           This turns it into a sentence that tells the truth: the last step
           has not been done yet. No file number is named — a shipped message
           naming an internal file number has leaked that way before. */
        if (/forbidden|not allowed|unauthor|invalid account|401|403/i.test(body)) {
          return { ok: false, error: L({
            ar: 'لم يُنفَّذ التعديل: برنامج الحسابات على الخادم لم يُحدَّث بعد ليسمح لك بهذا. ' +
                'لم يتغيّر شيء ولم يُنشأ أي حساب. أبلغ محمد زيدان أن الخطوة الأخيرة ما زالت مطلوبة.',
            en: 'Nothing was changed: the accounts program on the server has not yet been updated to ' +
                'allow you to do this. No account was created. Tell Mohamed Zidan the last step is still needed.'
          }) };
        }
        return { ok: false, error: body || 'admin-operation-failed' };
      }
      return res.data || { ok: true };
    };

    /* ── ٦.٢ · تغليف Auth.users ──────────────────────────────────────────
       store.js لا يزامن جدول users إلا لخمسة أدوار، و hr_manager ليس منها
       (store.js:62، ودالة خاصة لا يمكن تغليفها). فلو فُتحت الشاشة للمفوَّض
       دون هذا، لعرضت صفاً واحداً — هو نفسه — وانفجر زر إعادة الضبط.
       store.js syncs the users table for five roles only and hr_manager is
       not one of them (store.js:62, inside a PRIVATE function that no
       wrapper can reach). Without this the delegate's screen would show one
       row — himself — and the reset button would throw. */
    var origUsers = Auth.users;
    var cache = null;

    Auth.users = function () {
      var me = Auth.current();
      if (!Fence.isDelegate(me)) return origUsers.call(Auth);
      return cache || origUsers.call(Auth);
    };

    Auth.refreshDelegateUsers = async function () {
      var me = Auth.current();
      if (!Fence.isDelegate(me)) return null;
      var client = Auth.client();
      if (!client) return null;
      try {
        var res = await client.from('portal_users').select('*');
        if (res.error || !res.data) return null;
        cache = res.data;
        return cache;
      } catch (e) { return null; }
    };

    /* هل وصلت القائمة؟ الشاشة تسأل قبل أن ترسم، فلا تدخل في حلقة جلب لا
       تنتهي. `cache` قد تكون مصفوفة فارغة شرعاً، لذلك الفحص على null تحديداً.
       Has the list arrived? The screen asks before drawing so it cannot fall
       into an endless fetch loop. An empty array is a legitimate answer, so
       the test is against null specifically, never against length. */
    global.AccountFence.hasUserCache = function () { return cache !== null; };

    /* بعد أي إنشاء أو تعديل أو إيقاف: Store.reload لا يجلب هذه القائمة
       لأن جدول المستخدمين لا يُزامَن للمفوَّض أصلاً — فنُبطل النسخة يدوياً
       وإلا بقيت الشاشة تعرض الحالة القديمة بعد فعل ناجح.
       After any create/edit/deactivate: Store.reload does NOT refetch this
       list, because the users table is never synced for a delegate. Without
       this the screen would keep showing the OLD state after a successful
       action — the worst kind of wrong, because it looks like it worked and
       then appears to have been undone on the next visit. */
    global.AccountFence.invalidateUsers = function () { cache = null; };

    function findUser(id) {
      if (!id) return null;
      var list = Auth.users() || [];
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
      if (global.Store && Store.find) return Store.find('users', id);
      return null;
    }

    global.AccountFence.findUser = findUser;
  }

  install();
})(window);
