/* =========================================================================
   rollout-meter.js — عدّاد التشغيل: من يستعمل البوابة فعلاً هذا الأسبوع
                      THE ROLLOUT METER — who is really using the portal
                      this week
   -------------------------------------------------------------------------
   .claude/memory/PLAN-rollout-meter.md · بند v2.0.24 (رقم النسخة انتقل من
   v2.0.23 إلى v2.0.24 يوم البناء لأن دفعة أخرى أخذت الرقم السابق).

   المشكلة · THE PROBLEM (مثبَّتة بالخطة، مُعاد التحقق منها هنا حرفياً)

   لا شاشة في البوابة تجمع النشاط باسم الشخص. «آخر الحركات» في اللوحة
   (dashboard-render.js:536-549) تعرض ١٠ صفوف خام لدور auditor فقط؛ تبويب
   السجل في الإعدادات (settings.js:437-465) يعرض ٤٠٠ صف بلا تجميع؛ تاريخ
   السجل الواحد (audit-trail.js) يخص مستنداً واحداً. محمد زيدان لا يستطيع
   معرفة من لم يدخل شيئاً هذا الأسبوع إلا بالسؤال — وهذا يكلّفه مكانته مع
   موظفيه في كل مرة (الأمر الدائم ٦).

   No screen aggregates activity by PERSON. "Latest activity" on the
   dashboard shows 10 raw rows for the auditor role only; the Settings
   audit tab shows 400 flat rows; a document's own history covers one
   record. Mohamed Zidan cannot see who entered nothing this week except by
   asking — which costs him standing with his own staff every time.

   -------------------------------------------------------------------------
   🔴 لماذا لا Store.all('audit') أبداً — ثلاثة أسباب حقيقية في store.js
      WHY NEVER Store.all('audit') — three real reasons, read in store.js

   ١) store.js:75 يُصفّح (.range) بلا .order() إطلاقاً — وترتيب صفحات
      PostgREST بلا order غير مضمون، وaudit يتلقّى إدراجاً مستمراً. فوق
      ١٠٠٠ صف (تُعبَر خلال أسابيع لا سنوات عند التحميل الكامل للشركة،
      4-CAPACITY/REPORT-1) قد تتكرر صفوف أو تختفي بصمت في نسخة المتصفح.
   ٢) store.js:431 يقصّ الذاكرة المخبّأة لآخر ٢٥٠٠ سطر بترتيب الوصول، لا
      بترتيب التاريخ — وهذه المصفوفة تحمل صفوف الخادم أيضاً.
   ٣) store.js:81 يرمي عند ٥٠٠٠٠ صف فيسقط تحميل الصفحة كلها للقطة
      دون اتصال القديمة بصمت — العدّاد لا يجوز أن يُبنى فوق هذا العطل.

   لذلك هذا الملف يجلب بنفسه استعلاماً ضيقاً مرتَّباً محدود التاريخ — بنفس
   أسلوب creator-name-fill.js:145-149 تماماً (عمودان فقط، جدول مصدر واحد)
   — لا يمرّ بـStore إطلاقاً لهذا الغرض.

   1) store.js:75 pages with `.range()` and NO `.order()` — unordered
      paging past 1,000 rows can silently duplicate/skip rows, and audit
      crosses 1,000 rows within weeks at full company load.
   2) store.js:431 trims the cached array to the last 2,500 by ARRIVAL
      order, not date order — and that array holds server rows too.
   3) store.js:81 throws at 50,000 rows, silently falling the whole page
      back to a stale offline snapshot. The meter must not sit on that bug.

   So this file runs its OWN narrow, ordered, date-bounded fetch — exactly
   creator-name-fill.js:145-149's technique (two columns, one source
   table) — never through Store for this purpose.

   -------------------------------------------------------------------------
   🔴 الإشارة الصلبة «لم يُفعَّل الحساب أبداً» · THE HARD "NEVER ACTIVATED" SIGNAL

   .claude/rules/permissions.md وباقة الدوال الأمنية في القاعدة تمنع أي
   قراءة عن حساب طالما mustChangePassword=true — فوجود هذا العلم صحيحاً
   يعني حرفياً «لم يُستعمل هذا الحساب قط»، بلا استنتاج. أما passwordSetAt
   فتاريخ تفعيل حقيقي إن وُجد، لكن تغطيته تبدأ فقط بعد ٢٦ أغسطس ٢٠٢٦
   (audit-security-events.js) — أ. أحمد وأ. عمارة فعّلا حسابيهما قبل ذلك
   ولن يظهر لهما صف. لذلك هذا الملف لا يبني عمود «تاريخ التفعيل» إطلاقاً
   من صفوف password_changed — الفجوة صادقة ولا تُملأ بتخمين، ولا تُعرض شاشة
   تُخطئ في حق أحمد وعمارة بادّعاء أنهما «لم يُفعّلا قط».

   mustChangePassword===true means, with no inference, "this account has
   never successfully been used" — the database itself refuses to answer
   any query while the flag is set. passwordSetAt would give a real
   activation date but its coverage begins only after 26 Aug 2026, so
   Ahmed and عمارة (activated earlier) would show no row — this file
   deliberately builds NO "activation date" column from password_changed
   rows, so the honest gap is never turned into a false accusation against
   the two people it cannot see.

   -------------------------------------------------------------------------
   🔴 التجميع بالدور لا بالموقع · GROUPED BY ROLE, NEVER BY SITE

   portal_users (03-PRODUCTION-HARDENING.sql:125-131) لا يُصدِّر عمود site
   إطلاقاً رغم وجوده في public.users — إضافته للعرض ممنوع
   (.claude/rules/database.md: عمود تُرجعه واجهة تخفي أعمدة قد يُمحى في أي
   حفظ تالٍ). صفوف audit تحمل site فعلاً (من Auth.current().site وقت
   الكتابة) لكن هذا معروف فقط لمن كتب شيئاً — لا لكل الموظفين. لذلك التجميع
   هنا بالدور حصراً، وتُكتب هذه الحقيقة على الشاشة، لا تُخفى.

   portal_users never selects `site` even though public.users has it —
   adding it here is forbidden (a masking view's extra column can be wiped
   on the next unrelated save). Audit rows DO carry site, but only for
   people who wrote something — not for everyone. So grouping here is by
   ROLE only, and that fact is printed on the screen, not hidden.

   -------------------------------------------------------------------------
   🔴 «آخر دخول للموقع» يحتاج ملف قاعدة بيانات لم يُكتب بعد — ويتدهور بلطف بدونه
      "LAST OPENED" NEEDS A SQL FILE NOT YET WRITTEN — AND DEGRADES GRACEFULLY

   لا حدث تسجيل دخول يصل الخادم إطلاقاً اليوم (auth.js:868 محلي فقط
   وSECURITY_ACTIONS في audit-security-events.js لا يشمل login/logout).
   Supabase نفسه يحفظ auth.users.last_sign_in_at مجاناً بلا أي كتابة
   جديدة — ملف مستقبلي (رقمه يُحدَّد بالأمر وقت كتابته، القاعدة ١٦: لا تأخذ
   رقماً قبل تشغيل الأمر) يقرأ هذا فقط، عبر دالة public.az_last_seen()،
   ولا يكتب شيئاً ولا يغيّر أي سياسة. **هذا الملف لا يفترض تشغيله أبداً ولا
   يذكر رقمه في أي نص يراه المستخدم** — إن غاب الاستدعاء أو رُفض، يُطبع نص
   صريح بلا رقم في عمود واحد فقط، وتبقى كل الأعمدة الأخرى صحيحة تماماً. لا
   شاشة معطوبة أبداً بسبب ملف لم يُشغَّل بعد، ولا رسالة تشير لرقم قد يتغيّر.

   No login event reaches the server today at all. Supabase itself already
   stores auth.users.last_sign_in_at for free — a future SQL file (its
   number decided by command at write time, Standing Order 16 — never taken
   in advance) only reads it, writes nothing, changes no policy. This file
   NEVER assumes that file has run, and NEVER names its number in anything
   the user sees — if the call is missing or refused, ONE column shows a
   plain, number-free sentence, and every other column still renders
   correctly.

   -------------------------------------------------------------------------
   البوابة — من يرى العدّاد · THE GATE — who may see the meter

   لا صلاحية جديدة، ولا تعديل على auth.js. الفحص هنا فقط:
   role === 'admin' || role === 'gm' (كلمة محمد زيدان نفسه للمبتكر: «أنت
   وهشام والـ admin فقط»)، ويفشل مغلقاً عند أي خطأ. القاعدة أوسع (تسمح أيضاً
   بـauditor/finance_manager/hr_manager) — بوابة المتصفح هنا أضيق، وهذا
   الاتجاه الآمن دوماً، لا تناقض.

   No new permission, no auth.js edit. The gate here is a raw role check,
   deliberately narrower than what the database itself would allow, and it
   fails closed on any error.

   -------------------------------------------------------------------------
   أين يعيش · WHERE IT LIVES

   بطاقة على اللوحة (نفس نمط dashboard-render.js:540-542 لزر «السجل
   الكامل →») + تبويب «عدّاد التشغيل» في التقارير (نفس نمط
   authority-ipc-register.js بالحرف: لفّ ReportsPage.render + مراقب DOM
   مستقل خاص بهذا الملف علمه وعنصره، subtree:false، لأن تبويبات reports.js
   الداخلية تنادي دالة render(host) المغلقة مباشرة لا الاسم العام).

   A dashboard card (same shape as the existing "Full log →" button) plus
   a "Rollout meter" tab in Reports, wired exactly like
   authority-ipc-register.js: wrap ReportsPage.render AND watch the DOM
   with this file's OWN flag/element ids, subtree:false, because reports.js
   internal tab clicks call the closured render() directly, bypassing the
   wrapped global name.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف فتختفي البطاقة والتبويب تماماً
   — لا شيء آخر يتغيّر. يُحمَّل بعد authority-ipc-register.js (يحتاج نفس
   pages/dashboard-render.js وpages/reports.js وroleview.js، وكلاهما محمَّل
   قبله بالفعل).
   Delete this file and the card + tab disappear completely — nothing else
   changes. Loads after authority-ipc-register.js (needs the same
   dashboard-render.js/reports.js, both already loaded by then).

   ⚠️ ٢٩ أغسطس ٢٠٢٦: هذا الملف مبني ومُخزَّن فقط في
   9-UPLOAD-ALL/NEXT-UPLOAD-v2024/to-assets-js/ — لم يُوصَّل بعد بـ
   portal/assets/js/loader.js ولا service-worker.js بأمر المنسّق (تجميد
   بناء أثناء عمل مهندس آخر على الصلاحيات). انظر WIRING-NOTES.md بجوار هذا
   الملف للخطوات الميكانيكية الأربع عند الوصل.
   29 Aug 2026: staged only, not yet wired into portal/ per the
   coordinator's freeze. See the sibling WIRING-NOTES.md for the exact
   mechanical steps once wiring is announced.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || !global.Auth || !global.Schema) {
    console.error('rollout-meter.js needs store.js, auth.js and schema.js first');
    return;
  }

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }

  /* ═══════════════════════════════════════════════════════════════════
     ٠ · البوابة — تفشل مغلقة دوماً · THE GATE — always fails closed
     ═══════════════════════════════════════════════════════════════════ */
  function gate() {
    try {
      var u = global.Auth && Auth.current && Auth.current();
      return !!(u && (u.role === 'admin' || u.role === 'gm'));
    } catch (e) { return false; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · حساب أسبوع القاهرة — مقاوم للتوقيت الصيفي حقيقةً
        CAIRO WEEK ARITHMETIC — genuinely DST-proof
     -----------------------------------------------------------------
     مصر تُطبِّق التوقيت الصيفي مجدداً منذ ٢٠٢٣ (سبتمبر ٢٠٢٦ = UTC+3، لا
     UTC+2) — مُثبَت بالتشغيل، لا بالافتراض (انظر PLAN §4.2). كل حساب هنا
     يمرّ عبر Date.UTC على أرقام التقويم المُستخرجة لتوقيت القاهرة فقط —
     فرق الأيام يبقى صحيحاً حتى لو كانت آلة التشغيل نفسها (لا القاهرة) في
     منطقة تُطبِّق توقيتاً صيفياً بتواريخ مختلفة تماماً؛ لا نستعمل
     new Date(y,m,d) المحلية للطرح إطلاقاً لهذا السبب بالذات.

     Egypt observes DST again since 2023. Every calculation here goes
     through Date.UTC on calendar numbers already extracted for Africa/
     Cairo — day-difference arithmetic stays correct even if the machine
     RUNNING this code (not Cairo) sits in a timezone with DST on entirely
     different dates; local `new Date(y,m,d)` subtraction is deliberately
     never used for exactly that reason.
     ═══════════════════════════════════════════════════════════════════ */
  var DAY_MS = 86400000;

  function cairoInfo(dateObj) {
    var s = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(dateObj);
    var b = s.split('-');
    var y = Number(b[0]), m = Number(b[1]), d = Number(b[2]);
    return { y: y, m: m, d: d, epochDay: Math.floor(Date.UTC(y, m - 1, d) / DAY_MS) };
  }
  /* ١٩٧٠-٠١-٠١ (يوم الحقبة صفر) كان خميساً — getDay()=4. مطابقة بالحساب لا بالتخمين.
     1970-01-01 (epoch day 0) was a Thursday — getDay()=4. Matched by arithmetic. */
  function weekdayOf(epochDay) { return ((epochDay % 7) + 7 + 4) % 7; }
  /* الأسبوع يبدأ السبت — قرار محمد زيدان (أسبوع العمل المصري سبت-خميس). */
  function saturdayStart(epochDay) { return epochDay - ((weekdayOf(epochDay) + 1) % 7); }
  function epochDayToYMD(epochDay) {
    var d = new Date(epochDay * DAY_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }
  function isoOfEpochDay(epochDay) { return new Date(epochDay * DAY_MS).toISOString(); }
  function fmtDM(ymd) { return String(ymd.d) + '/' + String(ymd.m); }
  function weekRangeText(startEpochDay) {
    var s = epochDayToYMD(startEpochDay), e = epochDayToYMD(startEpochDay + 6);
    return L({ ar: 'الأسبوع من السبت ' + fmtDM(s) + ' إلى الجمعة ' + fmtDM(e),
               en: 'Week from Saturday ' + fmtDM(s) + ' to Friday ' + fmtDM(e) });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · الجلب — ضيق، مرتَّب، محدود التاريخ · own narrow, ordered, bounded fetch
     ═══════════════════════════════════════════════════════════════════ */
  var WORK_ACTIONS = ['create', 'update', 'delete', 'restore'];
  var CARD_CACHE_MS = 5 * 60 * 1000;
  var CARD_ROW_CAP = 6000;     /* أعلى بكثير من المُقاس فعلياً لأسبوعين (REPORT-1) */
  var TAB_ROW_CAP = 30000;     /* حدّ الخطة §4.1 — لو بُلغ، يُقال بصراحة لا يُخفى */
  var MAX_LAST_EVER_QUERIES = 40;

  function client() { try { return global.Auth.client(); } catch (e) { return null; } }

  /* صفحات مرتَّبة فعلاً (خلافاً لـstore.js:75) حتى لا يتكرر أو يسقط صف
     بصمت — ثم حدّ أقصى صريح بدل تصفّح بلا نهاية.
     Genuinely ORDERED paging (unlike store.js:75) so no row silently
     duplicates or drops — then an explicit hard cap instead of endless
     paging. */
  async function fetchAuditRows(c, cols, sinceISO, cap) {
    var rows = [], from = 0, pageSize = 1000, capped = false;
    while (true) {
      var res = await c.from('audit').select(cols).gte('at', sinceISO)
        .order('at', { ascending: true }).range(from, from + pageSize - 1);
      if (res.error) throw res.error;
      var page = res.data || [];
      rows = rows.concat(page);
      if (rows.length >= cap) { capped = rows.length > cap; if (capped) rows = rows.slice(0, cap); break; }
      if (page.length < pageSize) break;
      from += pageSize;
    }
    return { rows: rows, capped: capped };
  }

  /* الحارس من التكرار ومن السطر المحلي — انظر PLAN §1.4 سبب ١ و§1.5.
     Guards against duplicate ids and the local-only client-side row —
     PLAN §1.4 reason 1 and §1.5. */
  function dedupeRows(rows) {
    var seen = {}, out = [];
    (rows || []).forEach(function (r) {
      if (!r || r._localOnly || !r.id) return;
      if (seen[r.id]) return;
      seen[r.id] = true;
      out.push(r);
    });
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · وسم «استيراد محتمل» — ≥٢٠ إنشاءً على شاشة واحدة خلال ١٠ دقائق
        "LIKELY IMPORT" FLAG — ≥20 creates on one screen within 10 minutes
     -----------------------------------------------------------------
     بلا هذا، استيراد ٥٠ صفاً بعد ظهر واحد يجعل شخصاً يبدو أنشط بعشر مرات
     من غيره ظلماً (PLAN §2). نافذة منزلقة على كل (مستخدم، شاشة) على حدة.
     Without this, one afternoon's 50-row import makes one person look ten
     times more productive than everyone else. A sliding window per
     (user, screen) pair.
     ═══════════════════════════════════════════════════════════════════ */
  function detectImportBursts(createRows, thresholdCount, windowMs) {
    thresholdCount = thresholdCount || 20;
    windowMs = windowMs || 10 * 60 * 1000;
    var byKey = {};
    (createRows || []).forEach(function (r) {
      if (!r || r.action !== 'create' || !r.userId || !r.at) return;
      var k = r.userId + '|' + r.entity;
      (byKey[k] = byKey[k] || []).push(new Date(r.at).getTime());
    });
    var flagged = {};
    Object.keys(byKey).forEach(function (k) {
      var userId = k.slice(0, k.indexOf('|'));
      var times = byKey[k].slice().sort(function (a, b) { return a - b; });
      var lo = 0;
      for (var hi = 0; hi < times.length; hi++) {
        while (times[hi] - times[lo] > windowMs) lo++;
        if (hi - lo + 1 >= thresholdCount) {
          var wk = saturdayStart(cairoInfo(new Date(times[hi])).epochDay);
          flagged[userId + '|' + wk] = true;
        }
      }
    });
    return flagged;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · اسم الشاشة من اسم الجدول — نفس أسلوب audit-trail.js:53-56 حرفياً
        MODULE LABEL FROM TABLE NAME — audit-trail.js:53-56's own technique
     ═══════════════════════════════════════════════════════════════════ */
  function screenLabel(table) {
    if (!global.Schema || !Schema.MODULES) return table;
    var m = Schema.MODULES.filter(function (x) { return x.table === table; })[0];
    return m ? L(m.label) : table;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · محرك الحساب الصِرف — بلا أي DOM أو شبكة، قابل للاختبار وحده
        THE PURE COMPUTE ENGINE — no DOM, no network, testable alone
     ═══════════════════════════════════════════════════════════════════ */

  /* بطاقة اللوحة: ثلاثة أعداد فقط لهذا الأسبوع.
     Dashboard card: three counts for THIS week only. */
  function computeCardData(rows, users, nowDate) {
    var thisStart = saturdayStart(cairoInfo(nowDate).epochDay);
    var active = (users || []).filter(function (u) { return u && u.status !== 'inactive'; });
    var hasThisWeek = {};
    (rows || []).forEach(function (r) {
      if (!r || !r.at || !r.userId) return;
      if (saturdayStart(cairoInfo(new Date(r.at)).epochDay) === thisStart) hasThisWeek[r.userId] = true;
    });
    var entered = [], notEntered = [], neverAct = [];
    active.forEach(function (u) {
      if (u.mustChangePassword === true) neverAct.push(u.id);
      else if (hasThisWeek[u.id]) entered.push(u.id);
      else notEntered.push(u.id);
    });
    return {
      weekStartEpochDay: thisStart,
      enteredCount: entered.length, notEnteredCount: notEntered.length, neverActivatedCount: neverAct.length,
      enteredUserIds: entered, notEnteredUserIds: notEntered, neverActivatedUserIds: neverAct
    };
  }

  /* تبويب التقارير: جدول كامل بالشخص، ونشاط الشركة بالشاشة هذا الأسبوع.
     Reports tab: the full per-person table, and company-wide screen usage
     this week. */
  function computeTabData(rows, users, nowDate, lastEverOverrides) {
    var thisStart = saturdayStart(cairoInfo(nowDate).epochDay);
    var prevStart = thisStart - 7;
    var active = (users || []).filter(function (u) { return u && u.status !== 'inactive'; });

    var perUser = {};
    active.forEach(function (u) { perUser[u.id] = { lastAt: null, thisCreate: 0, prevCreate: 0, thisUpdate: 0, screens: {} }; });

    var future = [];
    var createRows = [];
    var companyScreens = {};

    (rows || []).forEach(function (r) {
      if (!r || !r.at || !r.userId) return;
      var wk = saturdayStart(cairoInfo(new Date(r.at)).epochDay);
      /* تواريخ مستقبلية (ساعة جهاز خاطئة) — لا تُهمَل أبداً، تُعرَض بدلوها الخاص.
         Future-dated rows (a wrong device clock) — never dropped, shown in
         their own bucket instead. */
      if (wk > thisStart) { future.push(r); return; }

      /* كل ما يلي مقصور على مستخدم "نشط" له صفّ في الجدول — حتى لا يظهر
         عدد في تجميع الشركة لا يستطيع محمد زيدان تتبّعه إلى صفّ مرئي (لا
         يجوز أن يقول رقم إجمالي شيئاً لا يقوله صفّ واحد على الأقل، الأمر
         الدائم ٢٠: «رقم يستطيع مراجعته بنفسه»).
         Everything below is scoped to an "active" user who has a visible
         row — so no company-wide total can ever show a number Mohamed
         Zidan cannot trace back to at least one visible row (Standing
         Order 20: "a number he can cross-check by hand"). */
      var slot = perUser[r.userId];
      if (!slot) return;
      if (!slot.lastAt || r.at > slot.lastAt) slot.lastAt = r.at;
      slot.screens[r.entity] = (slot.screens[r.entity] || 0) + 1;
      if (r.action === 'create') { if (wk === thisStart) slot.thisCreate++; else if (wk === prevStart) slot.prevCreate++; }
      if (r.action === 'update' && wk === thisStart) slot.thisUpdate++;
      if (r.action === 'create') createRows.push(r);
      if (wk === thisStart && WORK_ACTIONS.indexOf(r.action) !== -1) {
        companyScreens[r.entity] = (companyScreens[r.entity] || 0) + 1;
      }
    });

    var bursts = detectImportBursts(createRows);

    var people = active.map(function (u) {
      var slot = perUser[u.id];
      var lastAt = slot.lastAt || (lastEverOverrides && lastEverOverrides[u.id]) || null;
      var screens = Object.keys(slot.screens)
        .map(function (e) { return { entity: e, count: slot.screens[e] }; })
        .sort(function (a, b) { return b.count - a.count; });
      return {
        id: u.id, name: u.name, role: u.role,
        neverActivated: u.mustChangePassword === true,
        lastActivityAt: lastAt,
        createsThisWeek: slot.thisCreate, createsThisWeekImport: !!bursts[u.id + '|' + thisStart],
        createsLastWeek: slot.prevCreate, createsLastWeekImport: !!bursts[u.id + '|' + prevStart],
        updatesThisWeek: slot.thisUpdate,
        screens: screens
      };
    });

    return {
      weekStartEpochDay: thisStart, prevWeekStartEpochDay: prevStart,
      people: people, companyScreens: companyScreens, futureRows: future
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · الطبقة غير المتزامنة — الشبكة فقط، لا حساب هنا إطلاقاً
        THE ASYNC LAYER — network only, no arithmetic lives here
     ═══════════════════════════════════════════════════════════════════ */
  var cardCache = null, cardCacheAt = 0;

  async function fetchCardData(nowDate) {
    var now = nowDate || new Date();
    if (cardCache && (now.getTime() - cardCacheAt) < CARD_CACHE_MS) return cardCache;
    var c = client();
    if (!c) return { error: true };
    try {
      var thisStart = saturdayStart(cairoInfo(now).epochDay);
      var since = isoOfEpochDay(thisStart - 7); /* أسبوعان — نفس نطاق الخطة §4.1 */
      /* 🐛 وُجد بالتشغيل، لا بالقراءة: الخطة §4.1 كتبت عمودي "userId",at,action
         فقط، لكن §1.4 نفسها تُلزم بالحذف حسب id — بلا id في العمود
         المُختار، dedupeRows تُسقِط كل صفّ (id يصبح undefined). أُضيف id هنا.
         FOUND BY RUNNING, not by reading: PLAN §4.1 lists only
         "userId",at,action, but §1.4 itself requires dedup-by-id — without
         id in the select list, dedupeRows drops every row (id comes back
         undefined). id is added here to make the two sections agree. */
      var got = await fetchAuditRows(c, '"id","userId",at,action', since, CARD_ROW_CAP);
      var rows = dedupeRows(got.rows);
      var data = computeCardData(rows, Store.all('users'), now);
      data.capped = got.capped;
      cardCache = data; cardCacheAt = now.getTime();
      return data;
    } catch (e) {
      console.error('rollout-meter.js: card fetch failed', e);
      return { error: true };
    }
  }

  var lastTabRows = [];   /* للنقر على أي عدد وإظهار صفوفه الحقيقية · for click-to-drill-down */

  async function fetchLastEverOverrides(c, userIds) {
    var out = {};
    var capped = (userIds || []).slice(0, MAX_LAST_EVER_QUERIES);
    for (var i = 0; i < capped.length; i++) {
      try {
        var res = await c.from('audit').select('at').eq('userId', capped[i])
          .order('at', { ascending: false }).limit(1);
        if (!res.error && res.data && res.data[0]) out[capped[i]] = res.data[0].at;
      } catch (e) { /* شبكة — يبقى بلا قيمة، لا يظهر خطأ فادح · network — stays absent, no fatal error */ }
    }
    return out;
  }

  async function fetchLastSeenMap(c) {
    /* الملف المستقبلي لم يُشغَّل بعد = دالة غير موجودة أو خطأ — نُعامله
       كغياب صريح، لا عطل. The future SQL file not yet run = missing
       function or an error — treated as a plain absence, never a crash. */
    try {
      var res = await c.rpc('az_last_seen');
      if (res && !res.error && Array.isArray(res.data)) {
        var map = {};
        res.data.forEach(function (r) { if (r && r.user_id) map[r.user_id] = r.last_sign_in || null; });
        return map;
      }
      return null;
    } catch (e) { return null; }
  }

  async function fetchTabData(nowDate) {
    var now = nowDate || new Date();
    var c = client();
    if (!c) return { error: true };
    try {
      var thisStart = saturdayStart(cairoInfo(now).epochDay);
      var since = isoOfEpochDay(thisStart - 7 * 7); /* ٨ أسابيع · 8 weeks */
      /* نفس تصحيح البطاقة أعلاه — id لازم للحذف حسب المعرّف · same fix as
         the card above — id is required for dedup-by-id. */
      var got = await fetchAuditRows(c, '"id","userId","userName",action,entity,at', since, TAB_ROW_CAP);
      var rows = dedupeRows(got.rows);
      lastTabRows = rows;

      var users = Store.all('users').filter(function (u) { return u && u.status !== 'inactive'; });
      var haveRow = {};
      rows.forEach(function (r) { if (r && r.userId) haveRow[r.userId] = true; });
      var missing = users.filter(function (u) { return !haveRow[u.id]; }).map(function (u) { return u.id; });

      var lastEver = await fetchLastEverOverrides(c, missing);
      var lastSeenMap = await fetchLastSeenMap(c);

      var earliestAt = null, totalCount = null;
      try {
        var er = await c.from('audit').select('at').order('at', { ascending: true }).limit(1);
        if (!er.error && er.data && er.data[0]) earliestAt = er.data[0].at;
      } catch (e) {}
      try {
        var cr = await c.from('audit').select('*', { count: 'exact', head: true });
        if (!cr.error && typeof cr.count === 'number') totalCount = cr.count;
      } catch (e) {}

      var computed = computeTabData(rows, Store.all('users'), now, lastEver);
      var offlineSites = null;
      try {
        var sites = Store.all('sites');
        offlineSites = sites.filter(function (s) { return s && s.status !== 'inactive' && s.hasInternet === false; }).length;
      } catch (e) {}

      return {
        computed: computed, lastSeenMap: lastSeenMap, lastSeenAvailable: !!lastSeenMap,
        earliestAt: earliestAt, totalCount: totalCount, capped: got.capped,
        offlineSitesCount: offlineSites
      };
    } catch (e) {
      console.error('rollout-meter.js: tab fetch failed', e);
      return { error: true };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · نصوص الأمانة الثلاث — يجب أن تُطبع، غير قابلة للحذف
        THE THREE HONESTY SENTENCES — must be printed, never optional
     ═══════════════════════════════════════════════════════════════════ */
  var S1 = { ar: 'العدّاد يقيس وصول البيانات للنظام، لا شطارة الموظف. القراءة والاطلاع لا يُسجَّلان — من عمله أن يقرأ فقط سيظهر هنا بلا نشاط وهو ليس متوقفاً.',
             en: 'The meter measures whether data reached the system, not how good an employee is. Reading and viewing are never logged — someone whose job is only to read will show no activity here, and that does not mean they have stopped working.' };
  var S2 = { ar: 'التواريخ بساعة جهاز المستخدم، فالدقة باليوم لا بالساعة.',
             en: 'Dates are stamped by the user’s own device clock, so accuracy is by day, never by hour.' };
  function s3(earliestAt) {
    var when = earliestAt ? (global.I18N ? I18N.date(earliestAt) : earliestAt) : L({ ar: 'غير معروف بعد', en: 'not known yet' });
    return L({ ar: 'السجل يبدأ من ' + when + ' — ما قبله غير معروف.',
               en: 'The log begins on ' + when + ' — nothing before that is known.' });
  }
  /* لم يُتحقَّق من هذا الجهاز هل ملف ٤٦ (قفل توقيع السجل) شُغِّل — تُعرَض
     افتراضياً حتى يؤكد محمد زيدان، فلا نَعِد بدليل لا نملكه.
     Whether SQL 46 (the audit signature lock) has run cannot be seen from
     this Mac — shown by default until he confirms, so we never promise
     proof we do not have. */
  var S4 = { ar: 'العدّاد مؤشر على وصول البيانات، ولا يصلح دليلاً على شخص بعينه.',
             en: 'The meter is an indicator that data reached the system — it is not proof of which specific person entered it.' };

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · البطاقة على اللوحة · THE DASHBOARD CARD
     ═══════════════════════════════════════════════════════════════════ */
  var CARD_ID = 'azRolloutMeterCard';
  var wantTabOnOpen = false;

  function statBlock(n, label) {
    return '<div style="min-width:110px"><div class="num" style="font-size:21px;font-weight:700">' + n +
      '</div><div class="muted small">' + esc(label) + '</div></div>';
  }

  function cardInnerHTML(data) {
    if (data.error) {
      return '<div class="card-body muted small">' + esc(L({ ar: 'تعذّر تحميل عدّاد التشغيل الآن.', en: 'Could not load the rollout meter right now.' })) + '</div>';
    }
    var range = weekRangeText(data.weekStartEpochDay);
    return '<div class="card-head"><h3 class="card-title">' + UI.icon('clipboard', 17) + ' ' +
        esc(L({ ar: 'عدّاد التشغيل', en: 'Rollout meter' })) + '</h3></div>' +
      '<div class="card-body">' +
        '<p class="muted small" style="margin:0 0 8px">' + esc(range) + '</p>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">' +
          statBlock(data.enteredCount, L({ ar: 'أدخلوا شغلاً هذا الأسبوع', en: 'entered work this week' })) +
          statBlock(data.notEnteredCount, L({ ar: 'لم يدخلوا شيئاً', en: 'entered nothing' })) +
          statBlock(data.neverActivatedCount, L({ ar: 'لم يفعّلوا حسابهم أصلاً', en: 'never activated their account' })) +
        '</div>' +
        '<button class="btn btn-outline btn-sm" id="azRolloutMeterOpen">' +
          esc(L({ ar: 'افتح العدّاد الكامل', en: 'Open the full meter' })) + ' →</button>' +
      '</div>';
  }

  function wireCard(div) {
    var btn = div.querySelector('#azRolloutMeterOpen');
    if (btn) btn.onclick = function () { wantTabOnOpen = true; global.App.go('reports'); };
  }

  function ensureCard(host) {
    if (!gate()) return; /* لا بطاقة، ولا حتى محاولة جلب · no card, and no fetch is even attempted */
    if (host.querySelector('#' + CARD_ID)) return; /* حارس مضاعفة — انظر تعليق الخطة §4.3 · duplicate guard, PLAN §4.3 */
    var div = document.createElement('div');
    div.id = CARD_ID;
    div.className = 'card mb-2';
    div.innerHTML = '<div class="card-body muted small">' + esc(L({ ar: 'جارٍ التحميل…', en: 'Loading…' })) + '</div>';
    host.appendChild(div);
    fetchCardData(new Date()).then(function (data) {
      /* getElementById يمشي الشجرة الحيّة فعلياً — إن استُبدل host.innerHTML
         أثناء الانتظار (تنقّل بعيداً) لن يجد بطاقتنا بعد الآن، خلافاً لفحص
         .parentNode الذي قد يبقى صحيحاً خطأً على عقدة مفصولة.
         getElementById genuinely walks the LIVE tree — if host.innerHTML
         was replaced while we waited (navigated away), it will no longer
         find our card, unlike a .parentNode check which can stay wrongly
         true on a detached node. */
      if (document.getElementById(CARD_ID) !== div) return;
      div.innerHTML = cardInnerHTML(data);
      wireCard(div);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٩ · تبويب التقارير · THE REPORTS TAB
        (نفس نمط authority-ipc-register.js بالحرف — انظر تعليقه)
     ═══════════════════════════════════════════════════════════════════ */
  var TAB_ID = 'repRolloutTab';
  var registerActive = false;
  var lastTabData = null;

  function fmtDateTime(iso) { return iso ? (global.I18N ? I18N.dateTime(iso) : iso) : '—'; }

  function screensListHTML(screens) {
    if (!screens.length) return '—';
    var top = screens.slice(0, 3).map(function (s) { return esc(screenLabel(s.entity)) + ' (' + s.count + ')'; }).join('، ');
    var extra = screens.length > 3 ? ' <span class="muted">+' + (screens.length - 3) + '</span>' : '';
    return top + extra;
  }

  function countCellHTML(n, importFlag, kind, userId) {
    var badge = importFlag ? ' <span class="muted small" title="' +
      esc(L({ ar: 'استيراد محتمل', en: 'likely import' })) + '">⚠</span>' : '';
    if (!n) return '<span class="num">0</span>';
    return '<button type="button" class="ai-doc-link" data-drill="' + esc(kind) + '" data-uid="' + esc(userId) +
      '" style="background:none;border:none;padding:0;font:inherit;color:var(--green-700);cursor:pointer;text-decoration:underline">' +
      '<span class="num">' + n + '</span></button>' + badge;
  }

  function tabHTML(full) {
    if (full.error) {
      return '<div class="card"><div class="card-body muted small">' +
        esc(L({ ar: 'تعذّر تحميل بيانات العدّاد الآن.', en: 'Could not load the meter’s data right now.' })) + '</div></div>';
    }
    var d = full.computed;
    var range = weekRangeText(d.weekStartEpochDay);
    var prevRange = weekRangeText(d.prevWeekStartEpochDay);

    var h = '<div class="card mb-2"><div class="card-body">' +
      '<p><strong>' + esc(range) + '</strong> — ' + esc(L({ ar: 'الأسبوع الماضي: ', en: 'previous week: ' })) + esc(prevRange) + '</p>' +
      '<p class="muted small">' + esc(S1.ar) + '<br>' + esc(S1.en) + '</p>' +
      '<p class="muted small">' + esc(S2.ar) + '<br>' + esc(S2.en) + '</p>' +
      '<p class="muted small">' + esc(s3(full.earliestAt)) + '</p>' +
      '<p class="muted small">' + esc(S4.ar) + '<br>' + esc(S4.en) + '</p>' +
      (full.capped ? '<p class="muted small" style="color:var(--red-600,#b42318)">' +
        esc(L({ ar: 'بلغ عدد الحركات الحدّ الأقصى للعرض — الأرقام قد تكون غير مكتملة.',
                en: 'Row count hit the display cap — numbers may be incomplete.' })) + '</p>' : '') +
      (typeof full.totalCount === 'number' ? '<p class="muted small">' +
        esc(L({ ar: 'إجمالي الحركات المسجَّلة منذ البداية: ', en: 'Total recorded activity since the beginning: ' })) +
        full.totalCount + '</p>' : '') +
      (full.offlineSitesCount ? '<p class="muted small">' +
        esc(L({ ar: 'مواقع بلا إنترنت ثابت (تعتمد على الحفظ دون اتصال): ', en: 'Sites without reliable internet (rely on offline saving): ' })) +
        full.offlineSitesCount + '</p>' : '') +
      '</div></div>';

    h += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + esc(L({ ar: 'الاسم · الدور', en: 'Name · role' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'حالة الحساب', en: 'Account' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'آخر دخول للموقع', en: 'Last opened' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'آخر شغل أدخله', en: 'Last activity' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'مستندات جديدة هذا الأسبوع', en: 'New this week' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'الأسبوع الماضي', en: 'Last week' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'تعديلات هذا الأسبوع', en: 'Edits this week' })) + '</th>' +
      '<th class="no-sort">' + esc(L({ ar: 'الشاشات المستعملة', en: 'Screens used' })) + '</th>' +
      '</tr></thead><tbody>';

    if (!d.people.length) h += '<tr><td colspan="8">' + esc(t('g.noData')) + '</td></tr>';
    d.people.forEach(function (p) {
      var lastLogin = !full.lastSeenAvailable
        /* بلا رقم ملف أبداً — الرقم يُحدَّد بالأمر وقت الكتابة (القاعدة ١٦)
           وقد يتغيّر؛ رسالة تسمّي رقماً خاطئاً أفخّ من عمود فارغ.
           Never names a file number — the number is decided by command at
           write time (Standing Order 16) and can change; a message naming
           the wrong number is a worse trap than a plain blank column. */
        ? '<span class="muted small">' + esc(L({ ar: 'غير مفعَّل بعد — يحتاج خطوة قاعدة بيانات لم تُنفَّذ بعد', en: 'not enabled yet — needs a database step that has not been run yet' })) + '</span>'
        : (full.lastSeenMap[p.id] ? fmtDateTime(full.lastSeenMap[p.id]) : esc(L({ ar: 'لم يدخل أبداً', en: 'never signed in' })));
      h += '<tr>' +
        '<td><strong>' + esc(p.name || p.id) + '</strong><br><small class="muted">' + esc(global.Auth.roleLabel(p.role)) + '</small></td>' +
        '<td>' + (p.neverActivated
          ? '<span style="color:#B8860B">' + esc(L({ ar: 'لم يُفعَّل بعد', en: 'never activated' })) + '</span>'
          : esc(L({ ar: 'مُفعَّل', en: 'activated' }))) + '</td>' +
        '<td>' + lastLogin + '</td>' +
        '<td>' + (p.lastActivityAt ? fmtDateTime(p.lastActivityAt) : esc(L({ ar: 'لا شيء إطلاقاً', en: 'nothing at all' }))) + '</td>' +
        '<td>' + countCellHTML(p.createsThisWeek, p.createsThisWeekImport, 'thisCreate', p.id) + '</td>' +
        '<td>' + countCellHTML(p.createsLastWeek, p.createsLastWeekImport, 'prevCreate', p.id) + '</td>' +
        '<td>' + countCellHTML(p.updatesThisWeek, false, 'thisUpdate', p.id) + '</td>' +
        '<td class="small">' + screensListHTML(p.screens) + '</td>' +
      '</tr>';
    });
    h += '</tbody></table></div>';

    var screenKeys = Object.keys(d.companyScreens);
    if (screenKeys.length) {
      h += '<div class="card mt-2"><div class="card-body">' +
        '<h4>' + esc(L({ ar: 'الشاشات المستعملة في الشركة هذا الأسبوع', en: 'Screens actually used company-wide this week' })) + '</h4>';
      screenKeys.sort(function (a, b) { return d.companyScreens[b] - d.companyScreens[a]; }).forEach(function (k) {
        h += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">' +
          '<span>' + esc(screenLabel(k)) + '</span><span class="num">' + d.companyScreens[k] + '</span></div>';
      });
      h += '</div></div>';
    }

    if (d.futureRows.length) {
      h += '<div class="card mt-2"><div class="card-body">' +
        '<h4 style="color:#b42318">' + esc(L({ ar: 'تواريخ غير منطقية (مستقبلية — ساعة جهاز خاطئة على الأرجح)', en: 'Illogical (future) dates — likely a wrong device clock' })) + '</h4>';
      d.futureRows.slice(0, 20).forEach(function (r) {
        h += '<div class="small">' + esc(r.userName || r.userId || '—') + ' · ' + esc(screenLabel(r.entity)) + ' · ' + fmtDateTime(r.at) + '</div>';
      });
      if (d.futureRows.length > 20) h += '<div class="small muted">+' + (d.futureRows.length - 20) + '</div>';
      h += '</div></div>';
    }

    return h;
  }

  /* النقر على أي عدد يفتح الصفوف الحقيقية وراءه — «رقم يستطيع مراجعته
     بنفسه» (الخطة §8). Clicking any count opens the real rows behind it —
     "a number he can cross-check himself" (PLAN §8). */
  function wireDrill(scope) {
    scope.querySelectorAll('[data-drill]').forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-drill'), uid = b.getAttribute('data-uid');
        var wk = kind === 'prevCreate' ? (lastTabData ? lastTabData.prevWeekStartEpochDay : null)
                                        : (lastTabData ? lastTabData.weekStartEpochDay : null);
        var action = kind === 'thisUpdate' ? 'update' : 'create';
        var rows = lastTabRows.filter(function (r) {
          if (!r || r.userId !== uid || r.action !== action || !r.at) return false;
          return saturdayStart(cairoInfo(new Date(r.at)).epochDay) === wk;
        });
        var body = rows.length
          ? rows.map(function (r) { return '<div class="small" style="padding:3px 0;border-bottom:1px solid var(--border)">' +
              esc(screenLabel(r.entity)) + ' — ' + fmtDateTime(r.at) + '</div>'; }).join('')
          : '<p class="muted">' + esc(L({ ar: 'لا صفوف — الصفحة لم تُحمَّل بعد أو انتهت صلاحية العرض.', en: 'No rows — the tab may need to reload.' })) + '</p>';
        if (global.UI && UI.modal) {
          UI.modal({ title: L({ ar: 'الحركات وراء هذا العدد', en: 'The rows behind this count' }), body: body,
            buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-ghost' }] });
        }
      };
    });
  }

  function toggleFilterRow(hide) {
    var fFrom = document.getElementById('fFrom');
    var card = fFrom ? fFrom.closest('.card') : null;
    if (card) card.style.display = hide ? 'none' : '';
  }

  function renderTabBody(host) {
    var body = document.getElementById('repBody');
    if (!body) return;
    body.innerHTML = '<p class="muted">' + esc(L({ ar: 'جارٍ التحميل…', en: 'Loading…' })) + '</p>';
    fetchTabData(new Date()).then(function (full) {
      if (!registerActive) return; /* بدّل التبويب أثناء الانتظار · switched tabs while waiting */
      lastTabData = full.computed || null;
      body.innerHTML = tabHTML(full);
      wireDrill(body);
    });
  }

  function activateTab(host) { registerActive = true; ensureTab(host); }

  function ensureTab(host) {
    if (!gate()) return; /* لا تبويب، ولا محاولة جلب · no tab, and no fetch attempted */
    var tabs = host.querySelector('.tabs');
    if (!tabs) return; /* دور بلا أي تقرير أصلاً · a role with no reports at all */
    var btn = tabs.querySelector('#' + TAB_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = TAB_ID; btn.type = 'button';
      btn.onclick = function () { activateTab(host); };
      tabs.appendChild(btn);
    }
    if (wantTabOnOpen) { wantTabOnOpen = false; registerActive = true; }
    btn.className = 'tab' + (registerActive ? ' active' : '');
    btn.innerHTML = UI.icon('clipboard', 15) + ' ' + esc(L({ ar: 'عدّاد التشغيل', en: 'Rollout meter' }));
    if (registerActive) {
      tabs.querySelectorAll('.tab').forEach(function (b) { if (b !== btn) b.classList.remove('active'); });
      renderTabBody(host);
      toggleFilterRow(true);
    }
  }

  /* مراقب مستقل تماماً عن مراقبَي cash-forecast.js وauthority-ipc-register.js
     — علمه وعنصره الخاصان، فلا يتصادم ولا يُركَّب مرتين.
     Fully independent of the other two files' observers — its own flag and
     element id, so it cannot collide or be installed twice. */
  function ensureObserver(host) {
    if (host.__azRolloutMeterObs) return;
    host.__azRolloutMeterObs = true;
    new MutationObserver(function () {
      try { registerActive = false; ensureTab(host); }
      catch (e) { console.error('rollout-meter.js: observer failed', e); }
    }).observe(host, { childList: true, subtree: false });
  }

  if (!global.DashboardView || typeof global.DashboardView.render !== 'function') {
    console.error('rollout-meter.js needs pages/dashboard-render.js first');
    return;
  }
  var originalDashboardRender = global.DashboardView.render;
  global.DashboardView.render = function (host) {
    originalDashboardRender(host);
    try { ensureCard(host); } catch (e) { console.error('rollout-meter.js: dashboard card failed', e); }
  };

  if (!global.ReportsPage || typeof global.ReportsPage.render !== 'function') {
    console.error('rollout-meter.js needs pages/reports.js first');
    return;
  }
  var originalReportsRender = global.ReportsPage.render;
  global.ReportsPage.render = function (host) {
    originalReportsRender(host);
    try { ensureTab(host); ensureObserver(host); }
    catch (e) { console.error('rollout-meter.js: failed to attach the rollout-meter tab', e); }
  };

  /* يُقرأ من فاحص الحزمة مباشرة بلا أي DOM — نفس نمط AuthorityIPCRegister.compute.
     Read directly by the test harness with no DOM at all — same shape as
     AuthorityIPCRegister.compute. */
  global.RolloutMeter = {
    gate: gate,
    cairoInfo: cairoInfo, saturdayStart: saturdayStart, epochDayToYMD: epochDayToYMD,
    detectImportBursts: detectImportBursts,
    dedupeRows: dedupeRows,
    computeCardData: computeCardData,
    computeTabData: computeTabData
  };

  console.info('rollout-meter.js ready — dashboard card + "Rollout meter" tab beside "Authority IPCs" in Reports; grouped by role, never by site; own fetch, never Store.all(\'audit\').');
})(window);
