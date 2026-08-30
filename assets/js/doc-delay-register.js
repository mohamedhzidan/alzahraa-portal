/* =========================================================================
   doc-delay-register.js — سجل تأخير المستندات · The document-delay register
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   أ. أحمد عبد الحي يسأل نفسه كل يوم: «إيه اللي متأخر عليا دلوقتي، ومتأخر
   كام يوم، وواقف عند مين — عندنا ولا عند الاستشاري؟». محمد زيدان وهشام
   يسألان: «الاستشاري بيرد علينا في كام يوم فعلاً؟». اليوم dc-alerts.js
   يُنبّه على كل مستند متأخر على حدة، مختلطاً بتنبيهات أخرى، بلا إجمالي
   ولا فرز بالأيام ولا تقسيم «عندنا/عندهم» ولا تاريخ لكل جهة ولا طباعة.

   Ahmed asks daily: "what's late on me, how late, who's holding it up —
   us or the consultant?" Mohamed Zidan and Hisham ask: "how many days
   does the consultant actually take to reply?" dc-alerts.js fires a
   per-document alert mixed with others, with no total, no sort by days
   late, no us/them split, no per-party history, nothing printable.

   -------------------------------------------------------------------------
   🔴 أين تعيش الصفحة — قرار محمد زيدان الصريح، لا خياري
      WHERE THIS LIVES — HIS EXPLICIT RULING, NOT MY CHOICE

   DECISIONS.md، ٢٩ أغسطس ٢٠٢٦ ~١٠:١٥: صفحة في قائمة أحمد الجانبية الخاصة
   («القراءة A»)، لا تبويب داخل التقارير («القراءة B»). السبب مثبَت
   بقراءة الكود: report-access.js:41-53 يحذف زر «التقارير» من قائمة
   document_control تماماً، وpages/reports.js:86 تُرجع قائمة تقارير
   فارغة لدوره فلا يُرسم شريط التبويبات أصلاً (render() يأخذ فرع الحالة
   الفارغة عند :95). تبويب داخل التقارير كان سيكون غير مرئي تماماً
   لصاحب الشاشة الوحيد — فخ القاعدة ١٩ («لوحة لا وجود لها»).

   DECISIONS.md, 29 Aug 2026 ~10:15: a page in Ahmed's OWN side menu
   ("Reading A"), not a Reports tab ("Reading B"). Proven by reading the
   code: report-access.js:41-53 deletes the Reports button from
   document_control's menu entirely, and pages/reports.js:86 returns an
   empty report list for his role so the tab bar never renders (render()
   takes the empty-state branch at :95). A Reports tab would have been
   completely invisible to the one person this is for — Standing Order
   19's exact trap ("a panel that does not exist").

   -------------------------------------------------------------------------
   كيف تظهر الصفحة في القائمة، بلا لمس app.js
   HOW THE PAGE REACHES THE MENU, WITHOUT TOUCHING app.js

   app.js:164-166 يبني القائمة من خمس مجموعات مكتوبة يدوياً ويمسح
   #mainNav بالكامل في كل بناء. مجموعة «ضبط المستندات» (dc) تُضاف
   بمعزل بواسطة dc-requests.js:931-970 (addMissingNavGroups) التي تراقب
   #mainNav بمراقبها الخاص (watchNav، ٩٧٥) وتُعيدها بعد كل مسح — لكنها
   تبني أزرارها من Schema.MODULES فقط، و«سجل التأخيرات» ليس وحدة Schema.

   لذلك هذا الملف يملك مراقبه المستقل (ensureNavItem/watchMainNav أسفل
   الملف، نفس تقنية dc-requests.js:975-982 بالحرف: childList:true،
   subtree:false على #mainNav) يبحث عن [data-az-group="dc"] بعد أن
   تُنشئها dc-requests.js ويُلحق بها زراً واحداً في آخرها — بعد شاشاته
   السبع، أي «تحت شاشاته الأربع مباشرة» كما طلبت الخطة. علم مستقل
   (nav.__azDelayRegNavWatched) فلا يتصادم مع علم dc-requests.js
   (nav.__azWatched) ولا يتكرر أيّهما.

   app.js:164-166 builds the menu from five hand-written groups and wipes
   #mainNav on every build. The "dc" group is added independently by
   dc-requests.js:931-970, which watches #mainNav with its own observer
   and re-adds it after every wipe — but it only builds buttons from
   Schema.MODULES, and "delay register" is not a Schema module.

   So this file carries its own independent observer (ensureNavItem/
   watchMainNav below, the exact dc-requests.js:975-982 technique:
   childList:true, subtree:false on #mainNav) that looks for
   [data-az-group="dc"] after dc-requests.js has created it and appends
   ONE button at the end — after its seven buttons, i.e. "directly under
   his four document screens" as asked. Its own flag
   (nav.__azDelayRegNavWatched) never collides with or duplicates
   dc-requests.js's (nav.__azWatched).

   -------------------------------------------------------------------------
   🔴 لماذا نلفّ EntityPage.render — تقنية بلا سابقة، والعبور مُثبَت بالتشغيل
   WHY WE WRAP EntityPage.render — NO PRECEDENT, FALL-THROUGH PROVEN BY RUNNING

   app.js:254 يرسل أي مسار غير معروف مباشرة إلى EntityPage.render(route,
   host).

   🔴 تصحيح (٣٠ أغسطس ٢٠٢٦): كان مكتوباً هنا «لا ملف إضافي آخر لفّ هذه
   الدالة من قبل» — وكان ذلك غير صحيح وقت كتابته. site-activity.js:578
   يلفّ EntityPage.render أيضاً، وقد كُتب قبل هذا الملف بعشر ساعات.
   الترتيب الحقيقي: هذا الملف (loader سطر ٥٢١) داخلي، وsite-activity
   (سطر ٥٧٩) خارجي. ثبت بالتشغيل أنه غير ضار في الاتجاهين، لأن
   eligibleForTabs(null) ترجع false فلا يلمس شريطُ تبويبات المواقع هذه
   الصفحة إطلاقاً. اكتشفه فاحصُ الأخطاء بأمر grep، لا بالقراءة.
   القاعدة: تحقّق بأمر grep قبل كتابة «لا أحد غيري» — الملاحظة تتعفّن.

   🔴 CORRECTION (30 Aug 2026): this comment used to claim "No other file
   has wrapped it before." That was already FALSE when it was written.
   site-activity.js:578 also wraps EntityPage.render, and was written ten
   hours earlier. The real order: this file (loader line 521) is inner,
   site-activity (line 579) is outer. Proven harmless in both directions by
   running it, because eligibleForTabs(null) returns false so the site-tabs
   bar never touches this page. Found by the bug reporter with a grep, not
   by reading. The rule: run the grep before writing "nobody else does
   this" — such a note rots.

   اللفّة هنا محدودة: إن
   كانت الوحدة 'docDelayRegister' نرسم صفحتنا ونعود فوراً؛ لأي هوية
   أخرى — الستون شاشة الحقيقية كلها — نُمرِّر الاستدعاء لأصله بنفس
   الوسائط ونفس this عبر apply(EntityPage, arguments). فحص
   doc-delay-register-trial.js يُثبت هذا بالتشغيل: يفتح شاشات حقيقية
   أخرى قبل وبعد تحميل هذا الملف ويقارن الناتج حرفياً.

   app.js:254 sends any unrecognised route straight to
   EntityPage.render(route, host). No other file has wrapped it before.
   The wrap is narrow: id 'docDelayRegister' draws our page and returns;
   every other id — all sixty real screens — passes through to the
   original with identical arguments and `this`. The trial proves this by
   running it: real screens rendered before and after this file loads,
   output byte-compared.

   -------------------------------------------------------------------------
   لماذا Auth.scopeRows لا Store.all وحدها · WHY Auth.scopeRows, NEVER BARE Store.all

   dc-alerts.js:139 يستدعي Store.all(mod.table) بلا تحجيم — ثغرة قائمة
   اليوم في ذلك الملف، مسجَّلة في ROADMAP.md، خارج نطاق هذه الدفعة. الشاشة
   الحقيقية pages/entity.js:157 تستخدم Auth.scopeRows(mod.id,
   Store.all(mod.table))، التي تُطبِّق تحجيم المشروع (auth.js:1008) ثم
   تحجيم الموقع الذي يلفّها sites.js:245-248 (روبيكي/سوهاج لا يريان
   مستندات بعضهما). هذا الملف يستخدم نفس الاستدعاء المزدوج بالحرف —
   فأرقامه تُطابق دائماً ما يراه أحمد فعلاً على الشاشة الحقيقية.

   dc-alerts.js:139 calls Store.all(mod.table) unscoped — a pre-existing
   gap, logged in ROADMAP.md, out of scope here. The real screen,
   pages/entity.js:157, uses Auth.scopeRows(mod.id, Store.all(mod.table)),
   which applies project scoping then the site scoping layered on top by
   sites.js:245-248 (Elrobaki/Sohag cannot see each other). This file uses
   the identical double call — its numbers always match what Ahmed
   actually sees on the real screen.

   -------------------------------------------------------------------------
   🔴🔴 تصحيح جوهري على الخطة — وسم «مسودة» له معنى على الاعتمادات وحدها
   A MAJOR CORRECTION TO THE PLAN — "DRAFT" ONLY MEANS ANYTHING ON SUBMITTALS

   الخطة (§2.6.3) طلبت وسم «مسودة» على أي صف من الشاشات الأربع محفوظ
   كمسودة. تتبّعت هذا بتشغيل الكود، لا بالقراءة فقط، ووجدته صحيحاً على
   شاشة واحدة فقط:

     ١) workflow-policy.js:93-96 يضع docRegister/transmittals/
        correspondence/rfi على RECORD (m.workflow=false)؛ submittals
        يبقى APPROVE (m.workflow=true) — workflow-policy.js:71.
     ٢) pages/entity.js:835 لا يضبط status='draft' إلا حين
        mod.workflow=true. save-modes.js:453,476 يطبّق نفس الشرط. فلثلاث
        شاشات من الأربع لا مسار كود واحد يكتب status عند الحفظ.
     ٣) لكن عمود status في القاعدة (06-DEPARTMENTS-RECOVERY.sql:
        564,620,724) مُعرَّف `not null default 'draft'`. حين لا يرسل
        المتصفح قيمة تملأ القاعدة 'draft' تلقائياً — وتبقى للأبد، لأن
        هذه الشاشات RECORD-level بلا أي زر اعتماد (كل أزرار entity.js
        مشروطة بـmod.workflow — أسطر ٣٣٠,٣٨٧,٣٩١,٤١٠) ولا كود آخر في
        المشروع كله يكتب r.status لهذه الجداول الثلاثة (بُحث بالكامل).

   الخلاصة المُثبَتة بالتشغيل: r.status==='draft' صحيحة على ١٠٠٪ من صفوف
   rfi وcorrespondence وtransmittals، دائماً، بصرف النظر عمّا حدث فعلياً.
   تطبيق وسم الخطة حرفياً هنا كان سيُظهر «مسودة» على كل صف من ثلاث شاشات
   بلا استثناء — فخ .claude/rules/frontend.md («لا severity حرجة لصندوق
   ثابت القيمة» بنفس أثر «الصندوق الاختياري الفارغ»: جدار أحمر يُعلِّم
   الموظف تجاهل التنبيه). لذلك: الوسم يُحسب ويُعرض على submittals فقط
   (حيث تعمل دورة الاعتماد فعلاً)، ولا يُحسب إطلاقاً على الثلاث الأخرى —
   والسبب مطبوع بالحرف على وجه الشاشة (buildLimitsHTML أدناه).

   Plan §2.6.3 asked for a "draft" marker on any of the four screens' rows
   saved as a draft. Chased this by RUNNING the code, not just reading it,
   and found it true for only ONE screen:

     1) workflow-policy.js:93-96 sets docRegister/transmittals/
        correspondence/rfi to RECORD (m.workflow=false); submittals stays
        APPROVE (m.workflow=true) — workflow-policy.js:71.
     2) pages/entity.js:835 only sets status='draft' when mod.workflow is
        true; save-modes.js:453,476 applies the same condition. So three
        of the four screens have NO code path that ever writes status.
     3) But the database's status column (06-DEPARTMENTS-RECOVERY.sql:
        564,620,724) is `not null default 'draft'`. When the browser sends
        nothing, the database fills 'draft' in automatically — forever,
        since these are RECORD-level screens with no approval button at
        all (every entity.js workflow button is gated on mod.workflow —
        lines 330,387,391,410) and no other code anywhere writes r.status
        for these three tables (searched the whole project).

   Proven-by-running: r.status==='draft' is true for 100% of rfi,
   correspondence and transmittals rows, always, regardless of what
   actually happened. Applying the plan's marker literally would print
   "Draft" on every row of three whole screens — the exact trap in
   .claude/rules/frontend.md (a permanently-fixed value has the same
   practical effect as an empty optional box: a wall of red staff learn
   to ignore). So: the marker is computed and shown for submittals only
   (where the approval cycle genuinely runs); it is never computed for
   the other three — and the reason is printed in plain words on the
   screen's own face (buildLimitsHTML below).

   -------------------------------------------------------------------------
   «واقف عند مين» — مُشتقّ لا مُخترَع، الحالات الست بالضبط من الخطة §2.3
   "WHO IS HOLDING IT" — DERIVED, EXACTLY THE SIX CASES IN PLAN §2.3

     rfi:             !replyDate                    → عندهم (لا حالة "عندنا")
     submittals:       result='pending'               → عندهم
                        result='resubmit'|'rejected'    → عندنا (الكرة رجعت)
     correspondence:   direction='out'، !replied        → عندهم
                        direction='in'، !replied         → عندنا
     transmittals:     direction='out'، !replyReceived    → عندهم
                        (direction='in' لا حالة لها — تُستبعد كلياً، لا حالة سابعة)

   تعريف «انتهى» هنا (replyDate للـRFI، result معتمد/بملاحظات للاعتمادات،
   replied للمراسلات، replyReceived لمذكرات الإرسال) يختلف عمداً عن
   dc-alerts.js:124-131 (هناك: submittals تُعتبر «تم» بمجرد replyDate بلا
   نظر لـresult). سببان مختلفان: dc-alerts.js يسأل «هل وصل رد؟» لتنبيه
   بسيط؛ هذا السجل يسأل «هل انتهى فعلاً أم رجعت الكرة لنا؟» — نتيجة
   resubmit لها replyDate غالباً لكنها غير منتهية من هنا.

   Each "done" definition deliberately differs from dc-alerts.js:124-131
   (there, submittals is "done" once replyDate exists, regardless of
   result). Different questions: dc-alerts.js asks "did any reply
   arrive?"; this register asks "is it truly closed, or did the ball come
   back to us?" — a resubmit result usually carries a replyDate yet is not
   closed here.

   -------------------------------------------------------------------------
   الصلاحيات: لا شيء جديد — كل قسم مشروط بـAuth.canSee('rfi'|'submittals'|
   'correspondence'|'transmittals')، نفس أسلوب dc-alerts.js:136 بالحرف. لا
   دور جديد، لا SQL، لا تعديل Edge Function. دور بلا أيٍّ من الأربعة يرى
   حالة فارغة صادقة، لا رسالة خطأ.
   PERMISSIONS: NOTHING NEW — every section gated on the same four real
   Auth.canSee keys dc-alerts.js already uses. No new role, no SQL, no
   Edge Function change. A role with none of the four sees an honest
   empty state, never an error.

   قراءة فقط، لا تنبيهات — هذا الملف لا ينادي Alerts.* إطلاقاً؛
   dc-alerts.js يبقى المصدر الوحيد للتنبيهات الفعلية (plan §6.3).
   READ-ONLY, NO ALERTS — this file never calls Alerts.*; dc-alerts.js
   remains the sole source of real alerts (plan §6.3).

   الجدول على الهاتف: لا يوجد في هذا الموقع نمط «جدول يتحوّل بطاقات» —
   styles.css:385-386 يثبت .data-table{min-width:640px} داخل
   .table-wrap{overflow-x:auto} فقط (تمرير أفقي)، وmobile-field.js يضيف
   حجم لمس ٤٤px تلقائياً. لا معيار ثانٍ يُخترع هنا.
   THE TABLE ON A PHONE: no "table becomes cards" pattern exists anywhere
   in this codebase — styles.css:385-386 shows horizontal scroll only,
   and mobile-field.js already applies 44px touch targets automatically.
   No second standard is invented here.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف وحده فتختفي «سجل التأخيرات»
   من قائمة أحمد تماماً، ويعود المسار 'docDelayRegister' غير معروف، ولا
   يتغيّر حرف في entity.js/app.js/schema.js/dc-requests.js/dc-alerts.js.
   Delete this one file and "Delay register" disappears from Ahmed's menu
   completely, the route becomes unrecognised again, and not one
   character changes in entity.js/app.js/schema.js/dc-requests.js/
   dc-alerts.js.

   يُحمَّل بعد: departments.js وdc-requests.js وdoc-status-field.js (حقولها)
   · sites.js وauth.js (Auth.scopeRows) · pages/entity.js (يلفّها).
   Load after: departments.js, dc-requests.js, doc-status-field.js (their
   fields) · sites.js, auth.js (Auth.scopeRows) · pages/entity.js (wraps it).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || !global.Schema || !global.Auth || !global.UI || !global.I18N) {
    console.error('doc-delay-register.js needs store.js, schema.js, auth.js, ui.js and i18n.js first');
    return;
  }

  var REG_ID = 'docDelayRegister';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return (o && o.ar !== undefined) ? (isAr() ? o.ar : o.en) : o; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · أدوات التاريخ — نسخة محلية مطابقة لـauthority-ipc-register.js
        (toDateOnly + round) لا daysBetween البسيطة في dc-alerts.js، لأن
        الأولى مُثبَتة بمقارنة مستقلة بـpython3 في TESTS/authority-ipc-
        register-trial.js:20-31 وتُطابق أرقام هذا الملف حرفياً.
        DATE TOOLS — a local copy matching authority-ipc-register.js's
        own (toDateOnly + round), not dc-alerts.js's simpler daysBetween,
        because the former is independently proven against python3 in
        TESTS/authority-ipc-register-trial.js:20-31 and this file's own
        numbers match it exactly.
     ═══════════════════════════════════════════════════════════════════ */
  function toDateOnly(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  /* موجب = a بعد b بكذا يوم (متأخر) · سالب = a قبل b (لم يحن بعد)
     positive = a is N days AFTER b (late) · negative = a is before b (not yet due) */
  function daysBetween(a, b) { return Math.round((toDateOnly(a) - toDateOnly(b)) / 86400000); }
  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · تعريف الشاشات الأربع — كل الأسماء مقروءة من departments.js نفسه
        THE FOUR SCREENS — every field name read from departments.js
        rfi: replyDue:585 replyDate:586 daysDelayed:588 toParty:577
        submittals: replyDue:629 replyDate:630 result:620-628
        correspondence: replyDue:669 replied:671 party:652 direction:648
          noticeDeadline:668 contractualNotice:665
        transmittals: replyDue:548 replyReceived:549 party:523 direction:521
     ═══════════════════════════════════════════════════════════════════ */
  var SCREENS = [
    {
      id: 'rfi', icon: 'help', label: { ar: 'طلب معلومات RFI', en: 'RFI' },
      due: 'replyDue', partyField: 'toParty',
      done: function (r) { return !!r.replyDate; },
      holder: function () { return 'them'; },
      turnaround: function (r) { return (r.replyDate && r.date) ? daysBetween(r.replyDate, r.date) : null; }
    },
    {
      id: 'submittals', icon: 'check', label: { ar: 'اعتماد', en: 'Submittal' },
      due: 'replyDue', partyField: null,
      done: function (r) { return r.result === 'approved' || r.result === 'cond'; },
      holder: function (r) { return (r.result === 'resubmit' || r.result === 'rejected') ? 'us' : 'them'; },
      turnaround: function (r) { return (r.replyDate && r.date) ? daysBetween(r.replyDate, r.date) : null; }
    },
    {
      id: 'correspondence', icon: 'mail', label: { ar: 'خطاب', en: 'Letter' },
      due: 'replyDue', partyField: 'party',
      done: function (r) { return !!r.replied; },
      holder: function (r) { return r.direction === 'out' ? 'them' : 'us'; },
      turnaround: function () { return null; } /* Blocker A — لا تاريخ رد حقيقي، مربّع اختيار فقط */
    },
    {
      id: 'transmittals', icon: 'send', label: { ar: 'مذكرة إرسال', en: 'Transmittal' },
      due: 'replyDue', partyField: 'party',
      /* direction='in' لا حالة لها في جدول الخطة §2.3 — تُستبعد كلياً، لا حالة سابعة تُخترع */
      include: function (r) { return r.direction === 'out'; },
      done: function (r) { return !!r.replyReceived; },
      holder: function () { return 'them'; },
      turnaround: function () { return null; } /* نفس Blocker A */
    }
  ];

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · محرك الحساب الصِرف — بلا DOM إطلاقاً، يقرأه فاحص الحزمة مباشرة
        THE PURE COMPUTE ENGINE — no DOM at all, read directly by the trial
     ═══════════════════════════════════════════════════════════════════ */
  function compute(today) {
    var now = today ? new Date(today) : new Date();
    var waiting = [];
    var byParty = {};
    var rfiTurnByParty = {};
    var submittalTurnDays = [];
    var rfiDisagreements = [];
    var noticeDeadlines = [];
    var earliest = null;
    var visibleScreens = {};
    var agingBuckets = { b1_7: 0, b8_30: 0, b31_90: 0, b90p: 0 };

    SCREENS.forEach(function (cfg) {
      var visible = !!(global.Auth && Auth.canSee && Auth.canSee(cfg.id));
      visibleScreens[cfg.id] = visible;
      if (!visible) return;
      var mod = global.Schema && Schema.get(cfg.id);
      if (!mod) return;

      /* 🔴 الحارس — Auth.scopeRows لا Store.all وحدها، انظر شرح الرأس أعلاه */
      var rows = Auth.scopeRows(cfg.id, Store.all(mod.table));

      rows.forEach(function (r) {
        if (r.date && (!earliest || new Date(r.date) < new Date(earliest))) earliest = r.date;

        /* ٥ · تناقض الأيام المكتوبة يدوياً مقابل المحسوبة — RFI فقط،
           بصرف النظر عن كون الطلب مفتوحاً أم مغلقاً (plan §2.5) */
        if (cfg.id === 'rfi' && r.replyDue &&
            r.daysDelayed !== undefined && r.daysDelayed !== null && r.daysDelayed !== '') {
          var computedDelay = daysBetween(r.replyDate || now, r.replyDue);
          var typedDelay = Number(r.daysDelayed);
          if (typedDelay !== computedDelay) {
            rfiDisagreements.push({
              id: r.id, docNo: r.docNo || '', typedDelay: typedDelay,
              computedDelay: computedDelay, open: !cfg.done(r)
            });
          }
        }

        if (!r[cfg.due]) return;                        /* لا موعد رد — خارج نطاق السجل بالكامل */
        if (cfg.include && !cfg.include(r)) return;       /* مذكرة واردة — لا حالة لها في §2.3 */

        var done = cfg.done(r);
        if (done) {
          var t = cfg.turnaround(r);
          if (t !== null) {
            if (cfg.id === 'rfi' && r[cfg.partyField]) {
              var pk = r[cfg.partyField];
              rfiTurnByParty[pk] = rfiTurnByParty[pk] || [];
              rfiTurnByParty[pk].push(t);
            }
            if (cfg.id === 'submittals') submittalTurnDays.push(t);
          }
          return;                                         /* منتهٍ — لا يدخل قائمة الانتظار */
        }

        var daysLate = daysBetween(now, r[cfg.due]);
        var holder = cfg.holder(r);
        var row = {
          screenId: cfg.id, icon: cfg.icon, screenLabel: cfg.label,
          id: r.id, docNo: r.docNo || '',
          party: cfg.partyField ? (r[cfg.partyField] || '') : null,
          dueDate: r[cfg.due], daysLate: daysLate, holder: holder,
          /* 🔴 راجع تصحيح الخطة أعلاه — الوسم حقيقي على submittals فقط */
          isDraft: cfg.id === 'submittals' ? (r.status === 'draft') : null
        };
        waiting.push(row);

        if (daysLate > 0) {
          if (daysLate <= 7) agingBuckets.b1_7++;
          else if (daysLate <= 30) agingBuckets.b8_30++;
          else if (daysLate <= 90) agingBuckets.b31_90++;
          else agingBuckets.b90p++;
        }

        if (cfg.partyField && row.party) {
          byParty[row.party] = byParty[row.party] || { them: 0, us: 0 };
          if (holder === 'them') byParty[row.party].them++;
          else if (holder === 'us') byParty[row.party].us++;
        }
      });

      /* الإخطارات التعاقدية — مراسلات فقط، بصرف النظر عن حالة الرد */
      if (cfg.id === 'correspondence') {
        rows.forEach(function (r) {
          if (!r.contractualNotice || !r.noticeDeadline) return;
          noticeDeadlines.push({
            id: r.id, docNo: r.docNo || '',
            deadline: r.noticeDeadline, daysUntil: daysBetween(r.noticeDeadline, now)
          });
        });
      }
    });

    waiting.sort(function (a, b) { return b.daysLate - a.daysLate; });          /* الأكثر تأخراً أولاً */
    noticeDeadlines.sort(function (a, b) { return a.daysUntil - b.daysUntil; }); /* الأقرب موعداً أولاً */

    var turnaroundByParty = {};
    Object.keys(rfiTurnByParty).forEach(function (p) {
      turnaroundByParty[p] = { n: rfiTurnByParty[p].length, medianDays: median(rfiTurnByParty[p]) };
    });

    return {
      generatedAt: now, earliest: earliest, visibleScreens: visibleScreens,
      waiting: waiting, byParty: byParty, agingBuckets: agingBuckets,
      turnaroundByParty: turnaroundByParty,
      submittalTurnaround: { n: submittalTurnDays.length, medianDays: median(submittalTurnDays) },
      rfiDisagreements: rfiDisagreements, noticeDeadlines: noticeDeadlines
    };
  }

  /* يقرأها فاحص الحزمة مباشرة، بلا حاجة لأي DOM. */
  global.DocDelayRegister = { compute: compute, MODULE_ID: REG_ID, SCREENS: SCREENS };

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · طبقة الشاشة — DOM فقط، لا حساب جديد هنا إطلاقاً
        THE SCREEN LAYER — DOM only, no new arithmetic here
     ═══════════════════════════════════════════════════════════════════ */
  var TITLE = { ar: 'سجل تأخير المستندات', en: 'Document delay register' };
  var SUBTITLE = {
    ar: 'كل خطاب وطلب معلومات ومذكرة إرسال واعتماد متأخر الرد عليه الآن — كام يوم، وواقف عند مين',
    en: 'Every letter, RFI, transmittal and submittal currently overdue for a reply — how late, and who is holding it up'
  };
  var HOLDER_LABEL = {
    them: { ar: 'عند الجهة الأخرى', en: 'With the other party' },
    us: { ar: 'عندنا', en: 'With us' }
  };
  var NO_MEDIAN = { ar: 'لا يوجد رقم كافٍ بعد', en: 'Not enough data yet' };
  var DOC_LINK_STYLE = 'background:none;border:none;padding:0;font:inherit;color:var(--green-700);cursor:pointer;text-decoration:underline';

  function fmtHolder(h) {
    if (!h) return '—';
    var cls = h === 'them' ? 'b-pending' : 'b-info';
    return '<span class="badge ' + cls + '">' + UI.esc(L(HOLDER_LABEL[h])) + '</span>';
  }
  function fmtDaysLate(n) {
    if (n > 0) {
      return '<span class="neg">' + UI.esc(L({ ar: 'متأخر ', en: 'late ' })) + n + ' ' +
        UI.esc(L({ ar: 'يوم', en: 'day(s)' })) + '</span>';
    }
    return UI.esc(L({ ar: 'يستحق خلال ', en: 'due in ' })) + Math.abs(n) + ' ' + UI.esc(L({ ar: 'يوم', en: 'day(s)' }));
  }

  /* ٤.١ · بطاقة «حدود هذا السجل» — كل نقطة من §10 في الخطة، مطبوعة على
     وجه الشاشة، بما فيها تصحيحنا الخاص على وسم «مسودة» (الرأس أعلاه) */
  function buildLimitsHTML(data) {
    var items = [];
    items.push(data.earliest
      ? L({ ar: 'السجل يبدأ من: ' + I18N.date(data.earliest) + ' — أي متوسط محسوب من عدد قليل من المستندات ليس مؤشراً، وعدد المستندات مكتوب دائماً جنب كل رقم.',
            en: 'The register begins from: ' + I18N.date(data.earliest) + ' — a median built from a handful of documents is not a benchmark, and the record count is always printed beside every figure.' })
      : L({ ar: 'لا يوجد بعد أي مستند بتاريخ لتحديد بداية السجل.', en: 'No dated document exists yet to set the register’s start date.' }));
    items.push(L({ ar: 'الجهات مكتوبة يدوياً — «الاستشاري» و«الإستشاري» تُحسبان جهتين مختلفتين تماماً. لا دمج تلقائي حتى لا يُخترع رقم.',
                    en: 'Party names are hand-typed — "Consultant" spelled two different ways counts as two different parties. Nothing is merged automatically, to avoid inventing a number.' }));
    items.push(L({ ar: 'الاعتمادات ليس لها خانة «جهة» على الإطلاق — تظهر في قائمة المتأخر، ولا تدخل في أي تجميع حسب الجهة.',
                    en: 'Submittals have no "party" field at all — they appear in the overdue list, but never in any grouping by party.' }));
    items.push(L({ ar: 'الخطابات ومذكرات الإرسال: البوابة تعرف أنه تم الرد، ولا تعرف متى بالضبط — فلا يوجد لها متوسط سرعة رد، فقط منذ متى الصف مفتوح.',
                    en: 'Letters and transmittals: the register knows a reply arrived, not exactly when — so no reply-speed median exists for them, only how long an open row has been waiting.' }));
    items.push(L({ ar: 'كل التواريخ هنا مكتوبة يدوياً وقت التسجيل — السجل يقيس ما كُتب، لا بالضرورة ما حدث فعلياً.',
                    en: 'Every date here is typed by hand at registration time — the register measures what was written, not necessarily what actually happened.' }));
    items.push(L({ ar: 'وسم «مسودة» يظهر على الاعتمادات فقط. الطلبات والخطابات ومذكرات الإرسال شاشات «تسجيل مباشر» بلا خطوة اعتماد داخلية، فعمود حالتها في القاعدة ثابت على «مسودة» دائماً مهما اكتمل العمل عليها — لهذا لا يظهر الوسم عليها: لو ظهر لكان خاطئاً على كل صف بلا استثناء.',
                    en: 'The "Draft" marker appears on submittals only. RFIs, letters and transmittals are "record straight away" screens with no internal approval step, so their status column is permanently stuck on "draft" no matter how complete the work is — which is exactly why the marker is not shown for them: it would be wrong on every single row.' }));
    if (data.rfiDisagreements.length) {
      items.push(L({ ar: 'يوجد ' + data.rfiDisagreements.length + ' طلب معلومات (RFI) رقم الأيام المكتوب فيه يختلف عن المحسوب من التواريخ — انظر الجدول أدناه.',
                      en: data.rfiDisagreements.length + ' RFI(s) have a hand-typed day count that disagrees with the one computed from the dates — see the table below.' }));
    }
    return '<div class="card mb-2"><div class="card-body">' +
      '<h4 style="margin-top:0">' + UI.esc(L({ ar: 'حدود هذا السجل — تُقرأ قبل الأرقام', en: 'Limits of this register — read before the numbers' })) + '</h4>' +
      '<ul style="margin:6px 0 0;padding-inline-start:20px;color:var(--text-3);font-size:12.5px;line-height:1.8">' +
      items.map(function (i) { return '<li>' + UI.esc(i) + '</li>'; }).join('') +
      '</ul></div></div>';
  }

  function buildKPIs(data) {
    var them = 0, us = 0, overdueNow = 0;
    data.waiting.forEach(function (r) {
      if (r.holder === 'them') them++; else if (r.holder === 'us') us++;
      if (r.daysLate > 0) overdueNow++;
    });
    var html = '<div class="kpi-grid">' +
      UI.kpi({ label: L({ ar: 'إجمالي المنتظر الآن', en: 'Currently waiting' }),
        value: '<span class="num">' + data.waiting.length + '</span>', icon: 'clock' }) +
      UI.kpi({ label: L({ ar: 'متأخر فعلاً (تجاوز الموعد)', en: 'Actually overdue' }),
        value: '<span class="num">' + overdueNow + '</span>', icon: 'alert', tone: overdueNow ? 'danger' : '' }) +
      UI.kpi({ label: L(HOLDER_LABEL.them), value: '<span class="num">' + them + '</span>', icon: 'help' }) +
      UI.kpi({ label: L(HOLDER_LABEL.us), value: '<span class="num">' + us + '</span>', icon: 'check' }) +
      '</div>';
    var b = data.agingBuckets;
    html += '<p style="color:var(--text-3);font-size:12.5px;margin:8px 0 0">' +
      UI.esc(L({ ar: 'توزيع أيام التأخير — ', en: 'Days-late breakdown — ' })) +
      '1-7: ' + b.b1_7 + ' · 8-30: ' + b.b8_30 + ' · 31-90: ' + b.b31_90 + ' · 90+: ' + b.b90p + '</p>';
    return html;
  }

  function buildWaitingTable(data) {
    if (!data.waiting.length) {
      return '<div class="card mb-2"><div class="card-body">' + UI.empty(
        L({ ar: 'لا يوجد شيء متأخر أو منتظر رداً الآن', en: 'Nothing is late or waiting on a reply right now' }),
        L({ ar: 'كل ما هو مرئي لك من الطلبات والخطابات ومذكرات الإرسال والاعتمادات إمّا أُجيب عنه أو لم يحن موعده بعد.',
            en: 'Everything visible to you across RFIs, letters, transmittals and submittals is either answered, or not yet due.' })
      ) + '</div></div>';
    }
    var h = '<div class="card mb-2"><div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'النوع', en: 'Type' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'المستند', en: 'Document' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الجهة', en: 'Party' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'موعد الرد', en: 'Reply due' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الحالة', en: 'Status' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'واقف عند', en: 'Holding it' })) + '</th>' +
      '</tr></thead><tbody>';
    data.waiting.forEach(function (r) {
      h += '<tr>' +
        '<td>' + UI.icon(r.icon, 14) + ' ' + UI.esc(L(r.screenLabel)) + '</td>' +
        '<td><button type="button" class="ai-doc-link" style="' + DOC_LINK_STYLE + '" data-screen="' +
          UI.attr(r.screenId) + '" data-id="' + UI.attr(r.id) + '">' + UI.esc(r.docNo || '—') + '</button>' +
          (r.isDraft ? ' <span class="badge b-inactive" style="font-size:10px">' + UI.esc(L({ ar: 'مسودة', en: 'Draft' })) + '</span>' : '') +
        '</td>' +
        '<td>' + (r.party === null ? '—' : UI.esc(r.party || '—')) + '</td>' +
        '<td class="num">' + I18N.date(r.dueDate) + '</td>' +
        '<td class="num">' + fmtDaysLate(r.daysLate) + '</td>' +
        '<td>' + fmtHolder(r.holder) + '</td>' +
      '</tr>';
    });
    h += '</tbody></table></div></div></div>';
    return h;
  }

  function buildPartyBreakdown(data) {
    var parties = Object.keys(data.byParty);
    if (!parties.length) return '';
    parties.sort(function (a, b) {
      return (data.byParty[b].them + data.byParty[b].us) - (data.byParty[a].them + data.byParty[a].us);
    });
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.esc(L({ ar: 'المتأخر حسب الجهة', en: 'Overdue by party' })) + '</h3></div><div class="card-body flush">' +
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الجهة (كما كُتبت)', en: 'Party (as typed)' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L(HOLDER_LABEL.them)) + '</th>' +
      '<th class="no-sort">' + UI.esc(L(HOLDER_LABEL.us)) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'وسيط رد الاستشاري على RFI', en: 'RFI reply median' })) + '</th>' +
      '</tr></thead><tbody>';
    parties.forEach(function (p) {
      var t = data.turnaroundByParty[p];
      h += '<tr><td>' + UI.esc(p) + '</td><td class="num">' + data.byParty[p].them +
        '</td><td class="num">' + data.byParty[p].us + '</td><td class="num">' +
        (t && t.n > 0
          ? Math.round(t.medianDays) + ' ' + UI.esc(L({ ar: 'يوم (من ' + t.n + ')', en: 'day(s) (from ' + t.n + ')' }))
          : UI.esc(L(NO_MEDIAN))) +
        '</td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    return h;
  }

  function buildSubmittalsNote(data) {
    var t = data.submittalTurnaround;
    return '<p style="color:var(--text-3);font-size:12.5px">' +
      UI.esc(L({ ar: 'وسيط مدة رد الاستشاري على الاعتمادات (كل الجهات معاً — الاعتمادات لا خانة جهة لها): ',
                  en: 'Median consultant reply time on submittals (all parties combined — submittals have no party field): ' })) +
      (t.n > 0
        ? Math.round(t.medianDays) + ' ' + UI.esc(L({ ar: 'يوم (من ' + t.n + ' اعتماد مكتمل)', en: 'day(s) (from ' + t.n + ' completed submittal(s))' }))
        : UI.esc(L(NO_MEDIAN))) +
      '</p>';
  }

  function buildDisagreements(data) {
    if (!data.rfiDisagreements.length) return '';
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.esc(L({ ar: 'تناقض: الأيام المكتوبة يدوياً مقابل المحسوبة من التواريخ (RFI)', en: 'Disagreement: hand-typed days vs computed from dates (RFI)' })) +
      '</h3></div><div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الطلب', en: 'RFI' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'المكتوب', en: 'Typed' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'المحسوب من التواريخ', en: 'Computed from dates' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الحالة', en: 'Status' })) + '</th>' +
      '</tr></thead><tbody>';
    data.rfiDisagreements.forEach(function (r) {
      h += '<tr><td><button type="button" class="ai-doc-link" style="' + DOC_LINK_STYLE +
        '" data-screen="rfi" data-id="' + UI.attr(r.id) + '">' + UI.esc(r.docNo || '—') + '</button></td>' +
        '<td class="num">' + r.typedDelay + '</td><td class="num">' + r.computedDelay + '</td><td>' +
        (r.open ? UI.esc(L({ ar: 'ما زال مفتوحاً', en: 'Still open' })) : UI.esc(L({ ar: 'مُغلق', en: 'Closed' }))) +
        '</td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    return h;
  }

  function buildNoticeDeadlines(data) {
    if (!data.noticeDeadlines.length) return '';
    var passed = data.noticeDeadlines.filter(function (n) { return n.daysUntil < 0; }).length;
    var h = '<div class="card mb-2"><div class="card-head"><h3 class="card-title">' +
      UI.esc(L({ ar: 'الإخطارات التعاقدية ذات موعد محدد', en: 'Time-barred contractual notices' })) +
      '</h3><span class="badge ' + (passed ? 'b-rejected' : 'b-pending') + ' plain num">' + data.noticeDeadlines.length +
      '</span></div><div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الخطاب', en: 'Letter' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'آخر موعد', en: 'Deadline' })) + '</th>' +
      '<th class="no-sort">' + UI.esc(L({ ar: 'الحالة', en: 'Status' })) + '</th>' +
      '</tr></thead><tbody>';
    data.noticeDeadlines.forEach(function (n) {
      h += '<tr><td><button type="button" class="ai-doc-link" style="' + DOC_LINK_STYLE +
        '" data-screen="correspondence" data-id="' + UI.attr(n.id) + '">' + UI.esc(n.docNo || '—') + '</button></td>' +
        '<td class="num">' + I18N.date(n.deadline) + '</td><td class="num">' +
        (n.daysUntil < 0
          ? '<span class="neg">' + UI.esc(L({ ar: 'فات الموعد منذ ', en: 'passed ' })) + Math.abs(n.daysUntil) + ' ' + UI.esc(L({ ar: 'يوم', en: 'day(s) ago' })) + '</span>'
          : UI.esc(L({ ar: 'خلال ', en: 'in ' })) + n.daysUntil + ' ' + UI.esc(L({ ar: 'يوم', en: 'day(s)' }))) +
        '</td></tr>';
    });
    h += '</tbody></table></div></div></div>';
    return h;
  }

  function wireLinks(scope) {
    scope.querySelectorAll('.ai-doc-link').forEach(function (b) {
      b.onclick = function () {
        try { EntityPage.openDetail(b.getAttribute('data-screen'), b.getAttribute('data-id')); }
        catch (e) { console.error('doc-delay-register.js: could not open record', e); }
      };
    });
  }

  var lastData = null;
  function exportWaitingCSV() {
    if (!lastData) return;
    var headers = [
      L({ ar: 'النوع', en: 'Type' }), L({ ar: 'المستند', en: 'Document' }), L({ ar: 'الجهة', en: 'Party' }),
      L({ ar: 'موعد الرد', en: 'Reply due' }), L({ ar: 'أيام التأخير', en: 'Days late' }), L({ ar: 'واقف عند', en: 'Holding it' })
    ];
    var rows = lastData.waiting.map(function (r) {
      return [L(r.screenLabel), r.docNo || '', r.party || '', r.dueDate || '', String(r.daysLate),
        r.holder ? L(HOLDER_LABEL[r.holder]) : ''];
    });
    UI.exportCSV('سجل_تأخير_المستندات', headers, rows);
    UI.toast(t('g.export') + ' ✓');
  }

  /* تجميلي بحت — لا يوقف رسم الصفحة أبداً لو فشل (breadcrumb اسم عام
     app.js:270-271 يكتب معرّف الوحدة الخام لأي مسار غير معروف من Schema،
     فنحسّنه هنا فقط دون لمس app.js). Purely cosmetic — never blocks the
     page if it fails (app.js:270-271's fallback prints the raw route id
     for anything Schema doesn't know; we improve it here without
     touching app.js at all). */
  function patchBreadcrumb() {
    try {
      var el = document.getElementById('breadcrumbs');
      if (!el) return;
      var g = (global.Schema && Schema.GROUPS || []).filter(function (x) { return x.id === 'dc'; })[0];
      el.innerHTML = (g ? '<span>' + UI.esc(L(g.label)) + '</span><span class="sep">/</span>' : '') +
        '<span class="crumb-current">' + UI.esc(L(TITLE)) + '</span>';
    } catch (e) { /* لا شيء — تجميلي فقط */ }
  }

  function renderRegister(host) {
    var data = compute(new Date());
    lastData = data;
    var anyVisible = Object.keys(data.visibleScreens).some(function (k) { return data.visibleScreens[k]; });

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('clock', 22) + ' ' + UI.esc(L(TITLE)) + '</h1>' +
      '<p class="page-sub">' + UI.esc(L(SUBTITLE)) + '</p></div>' +
      '<div class="page-actions">' +
      (anyVisible ? '<button class="btn btn-outline btn-sm" id="ddrExport">' + UI.icon('download', 15) + ' ' + t('g.export') + '</button>' : '') +
      '<button class="btn btn-outline btn-sm" id="ddrPrint">' + UI.icon('printer', 15) + ' ' + t('g.print') + '</button>' +
      '</div></div>';

    if (!anyVisible) {
      html += '<div class="card"><div class="card-body">' + UI.empty(
        L({ ar: 'لا صلاحية لديك لعرض أيٍّ من الشاشات الأربع التي يلخّصها هذا السجل', en: 'You do not have permission to see any of the four screens this register summarises' }),
        L({ ar: 'طلبات المعلومات، الاعتمادات، المراسلات، مذكرات الإرسال — راجع صلاحياتك مع محمد زيدان إن كان هذا غير متوقَّع.',
            en: 'RFIs, submittals, correspondence, transmittals — check your permissions with Mohamed Zidan if this is unexpected.' })
      ) + '</div></div>';
      host.innerHTML = html;
      var pbEmpty = document.getElementById('ddrPrint');
      if (pbEmpty) pbEmpty.onclick = function () { window.print(); };
      patchBreadcrumb();
      return;
    }

    html += buildKPIs(data);
    html += buildLimitsHTML(data);
    html += buildWaitingTable(data);
    html += buildPartyBreakdown(data);
    if (data.visibleScreens.submittals) html += buildSubmittalsNote(data);
    html += buildDisagreements(data);
    if (data.visibleScreens.correspondence) html += buildNoticeDeadlines(data);

    host.innerHTML = html;
    wireLinks(host);
    var eb = document.getElementById('ddrExport');
    if (eb) eb.onclick = function () { exportWaitingCSV(); };
    var pb = document.getElementById('ddrPrint');
    if (pb) pb.onclick = function () { window.print(); };

    patchBreadcrumb();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · لفّ EntityPage.render — انظر شرح الرأس أعلاه لسبب هذه التقنية
        WRAP EntityPage.render — see the header comment for why
     ═══════════════════════════════════════════════════════════════════ */
  if (!global.EntityPage || typeof global.EntityPage.render !== 'function') {
    console.error('doc-delay-register.js needs pages/entity.js first');
    return;
  }
  var originalEntityRender = global.EntityPage.render;
  global.EntityPage.render = function (moduleId, host) {
    if (moduleId === REG_ID) {
      try {
        renderRegister(host);
      } catch (e) {
        console.error('doc-delay-register.js: render failed', e);
        host.innerHTML = '<div class="alert alert-danger">' + UI.esc(String(e && e.message || e)) + '</div>';
      }
      return;
    }
    /* أي هوية أخرى — كل الشاشات الحقيقية الأخرى — تُمرَّر كما هي بلا فرق */
    return originalEntityRender.apply(global.EntityPage, arguments);
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · زر القائمة الجانبية — يُلحَق بمجموعة dc التي يبنيها dc-requests.js
        انظر شرح الرأس أعلاه — نفس تقنية watchNav بالحرف، بعلم مستقل
        THE SIDE-MENU BUTTON — appended to the dc group dc-requests.js
        builds; see header comment — the exact watchNav technique, own flag
     ═══════════════════════════════════════════════════════════════════ */
  var NAV_LABEL = { ar: 'سجل التأخيرات', en: 'Delay register' };

  function atLeastOneVisible() {
    return SCREENS.some(function (cfg) { return global.Auth && Auth.canSee && Auth.canSee(cfg.id); });
  }

  function ensureNavItem() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    var group = nav.querySelector('[data-az-group="dc"]');
    if (!group) return;                                   /* dc-requests.js لم تبنِ المجموعة بعد */
    if (!(global.Auth && Auth.current && Auth.current())) return;
    if (!atLeastOneVisible()) return;                      /* لا شيء ليلخّصه هذا الزر لهذا الدور */
    if (group.querySelector('[data-route="' + REG_ID + '"]')) return;  /* موجود بالفعل — لا تكرار */

    var b = document.createElement('button');
    var here = (global.App && App.route) ? App.route() : '';
    b.className = 'nav-item' + (here === REG_ID ? ' active' : '');
    b.setAttribute('data-route', REG_ID);
    b.innerHTML = '<span class="nav-icon">' + UI.icon('clock', 17) + '</span>' +
                  '<span class="nav-label">' + UI.esc(L(NAV_LABEL)) + '</span>';
    b.onclick = function () { if (global.App && App.go) App.go(REG_ID); };
    group.appendChild(b);                                  /* آخر السبعة — «تحت شاشاته الأربع مباشرة» */
  }

  function watchMainNav() {
    var nav = document.getElementById('mainNav');
    if (!nav || nav.__azDelayRegNavWatched) return;
    nav.__azDelayRegNavWatched = true;
    new MutationObserver(function () {
      try { ensureNavItem(); } catch (e) { console.error('doc-delay-register.js: nav observer failed', e); }
    }).observe(nav, { childList: true, subtree: false });
    ensureNavItem();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchMainNav);
  else watchMainNav();

  console.info('doc-delay-register.js ready — «سجل التأخيرات» in أحمد’s own menu; ' +
               'wraps EntityPage.render for id "' + REG_ID + '" only, every other id passes through unchanged.');
})(window);
