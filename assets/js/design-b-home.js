/* =========================================================================
   design-b-home.js — الصفحة الأولى: الطابور هو الصفحة، لا جدار أرقام
                      THE HOME: the queue IS the page, not a wall of numbers
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ من أين تأتي البيانات ═══════════════════════════════════════════════
   من Workflow.inbox() نفسها التي يستعملها «صندوق الاعتمادات» ويعدّها شارتُه
   (app.js:411-418). لا مصدر جديد، ولا حالة مخترعة. وفتح المستند يمرّ بـ
   EntityPage.openDetail، وهو ما يستدعيه pages/approvals.js:32 بالحرف.
   Data comes from the SAME Workflow.inbox() the approvals inbox uses and its
   badge counts (app.js:411-418). No new source, no invented status. Opening
   a document goes through EntityPage.openDetail, verbatim what
   pages/approvals.js:32 calls.

   ══ 🔴 ما لا يخترعه هذا الملف ════════════════════════════════════════════
   ١) لا «ينتظر منذ N يوماً» — submittedAt فارغ في البيانات، والتاريخ يُعرض
      باسمه الصحيح «تاريخ المستند».
   ٢) لا تُحذف بطاقة أرقام واحدة — كلّها موجودة، ثلاثٌ ظاهرة و«عرض كل
      الملخّصات» يُظهر الباقي.
   ٣) لا تُلمس قيمة ولا حساب ولا حدّ اعتماد، ولا يُخترع معتمِد.
   1) NO "waiting N days" — submittedAt is empty; the date carries its true
      name, "document date". 2) NO KPI card is removed — all exist; three show
      and «show all summaries» reveals the rest. 3) No value, calculation,
      approval limit or approver is invented.

   ══ قرارات محمد زيدان، ١٠ سبتمبر (MORNING-DECISIONS-2026-09-10.md) ════════
   (٣) ثلاث بطاقات رئيسية تحت طابور العمل، و«عرض كل الملخّصات» يُظهر كل
       بطاقة موجودة أخرى. تُستعمل بطاقات المعاينة المعتمدة للدور حيث عرّفتها:
       للمدير المشروع عرّفت المعاينة «المنصرف على مشروعاتي» و«الميزانية»
       (B.src.html:311-312) فهما منها؛ والثالثة في المعاينة («مرتجعات بلا
       تكلفة») لا يوجد لها رقم في الموقع، فلا تُخترع — تُكمَل الثلاث من ترتيب
       الموقع نفسه لذلك الدور. «ينتظر إجراءً منك» و«التنبيهات» تنتقلان خلف
       الزرّ لأنّ الطابور نفسه والشارة يعرضان الرقم ذاته.
   (٤) مستندٌ في صندوق الاعتماد خارج مشروعات الشخص: تُحفظ القيود كما هي،
       ويُعلَّم الأمر، ولا يُفتح له المستند، ولا يُخمَّن معتمِدٌ بديل، ولا يُكشف
       من تفاصيله أكثر ممّا يكشفه السجلّ نفسه (أي لا شيء). التنفيذ والتوجيه
       لـ ROBOT-2 — هذا الملف يعرض فقط.
   (3) Three main cards below the work queue; «show all summaries» exposes
       every other existing card. The approved preview's role cards are used
       where it defined them: for the project manager it defined «spent on my
       projects» and «budget» (B.src.html:311-312), so those two are in; its
       third («returns at no cost») has no number in the portal, so it is NOT
       invented — the three are completed from the portal's own order for
       that role. «Waiting for you» and «Alerts» move behind the button,
       because the queue itself and the badge show that same number.
   (4) An inbox document outside the person's projects: restrictions kept,
       the case FLAGGED, the document NOT opened for them, no substitute
       approver guessed, and nothing revealed beyond what the register itself
       shows (i.e. nothing). Enforcement and routing are ROBOT-2's — this file
       only presents.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-home.js needs design-b-kit.js first'); return; }
  if (!global.DashboardView || typeof DashboardView.render !== 'function') {
    console.error('design-b-home.js: DashboardView.render not found — load order is wrong');
    return;
  }
  var T = AZB.t;

  /* كم بطاقة تظهر في كل مجموعة قبل «اعرض الباقي هنا». قِيس: المدير العام
     عنده ٩٧ مستنداً للاعتماد، فكانت الأرقام بعد ٩٧ بطاقة — لا يصلها أحد.
     How many cards show per group before «show the rest here». Measured: the
     GM has 97 documents to approve, so the numbers sat below 97 cards —
     unreachable in reality. The rest open IN PLACE: one door, not two. */
  var FIRST = 5;

  /* ── بطاقات المعاينة المعتمدة لكل دور، حيث عرّفتها ─────────────────────
     The approved preview's cards per role, where it defined them. */
  var PREVIEW_KPIS = { project_manager: ['myActual', 'myBudget'] };
  var BEHIND = ['inbox', 'alerts'];     /* الطابور والشارة يعرضان الرقم نفسه */

  function amountCell(mod, rec) {
    var f = mod && mod.amountField;
    if (!f) return '';
    var raw = rec ? rec[f] : undefined;
    if (raw === undefined || raw === null || raw === '' || !isFinite(Number(raw))) {
      return AZB.na({ ar: 'لم يُسجَّل مبلغ', en: 'no amount recorded' });
    }
    return '<b class="num">' + AZB.esc(global.I18N ? I18N.money(Number(raw)) : String(raw)) + '</b>';
  }

  function siteName(id) {
    try {
      var rows = global.Store && Store.all ? Store.all('sites') : [];
      for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i].name || id;
    } catch (e) { /* نرجع المعرّف بدل اختراع اسم */ }
    return id || '';
  }

  /* نطاق المشروعات كما يطبّقه Auth.scopeRows بالحرف (auth.js:1008-1023) —
     فلا يَعِد الشريط بأكثر ممّا يعرضه السجلّ.
     The project scope exactly as Auth.scopeRows applies it (auth.js:1008-1023),
     so the bar never promises more than the register shows. */
  function projectScope() {
    var u = null;
    try { u = Auth.current && Auth.current(); } catch (e) {}
    if (!u) return { all: false, n: 0 };
    var all = false;
    try { all = !!(Auth.hasAllProjects && Auth.hasAllProjects()); } catch (e) {}
    return { all: all, n: (u.projects || []).length };
  }
  function projectScopeText(ps) {
    if (ps.all) return T({ ar: 'كل المشروعات', en: 'All projects' });
    if (ps.n) return T({ ar: ps.n + ' مشروع مسند إليك', en: ps.n + ' project(s) assigned to you' });
    return T({ ar: 'لا مشروع مسند إلى حسابك', en: 'No project assigned to your account' });
  }

  function scopeBar() {
    var u = null, roleLabel = '', site = '', all = false;
    try { u = Auth.current && Auth.current(); } catch (e) {}
    try { roleLabel = Auth.roleLabel ? Auth.roleLabel(u && u.role) : ''; } catch (e) {}
    try { site = Auth.site && Auth.site(); } catch (e) {}
    try { all = !!(Auth.seesAllSites && Auth.seesAllSites()); } catch (e) {}
    var ps = projectScope();
    return '<div class="azb-scope" role="note">' +
      '<span class="azb-scope-k">' + AZB.esc(T({ ar: 'الموقع', en: 'Site' })) + '</span>' +
      '<span class="azb-scope-v azb-wrap">' + AZB.esc(all ? T({ ar: 'كل المواقع', en: 'All sites' }) : (siteName(site) || T({ ar: 'غير محدَّد', en: 'Not set' }))) + '</span>' +
      '<span class="azb-scope-k">' + AZB.esc(T({ ar: 'المشروعات', en: 'Projects' })) + '</span>' +
      '<span class="azb-scope-v azb-wrap">' + AZB.esc(projectScopeText(ps)) + '</span>' +
      '<span class="azb-scope-k">' + AZB.esc(T({ ar: 'صلاحيتك', en: 'Your role' })) + '</span>' +
      '<span class="azb-scope-v">' + AZB.esc(roleLabel || T({ ar: 'غير معروفة', en: 'Unknown' })) + '</span>' +
      '<span style="flex:1"></span>' +
      (all ? '' : '<span class="azb-scope-warn">' + AZB.icon('warn') + AZB.esc(T({ ar: 'تعرض بيانات موقع واحد فقط', en: 'Showing one site only' })) + '</span>') +
      (!ps.all && !ps.n ? '<span class="azb-scope-warn">' + AZB.icon('lock') + AZB.esc(T({ ar: 'مستندات المشروعات لا تظهر لك', en: 'Project documents are not shown to you' })) + '</span>' : '') +
    '</div>';
  }

  /* ══ حالة «إعداد ناقص (بلا موقع)» في المعاينة المعتمدة (B.src.html:396-406) ════
     أُضيف 10 سبتمبر (DESIGN-B-3) — لم يُبنَ من قبل.
     🔴 نصّ المعاينة («قد يكون الطابور ناقصاً») **لا يصدق على هذا الموقع** — قِيس:
        sites.js seesAllSites() تعيد «كل المواقع» لحسابٍ بلا موقع عمداً («لا نحبس الشركة
        عن بياناتها في اليوم الأول»). فالحساب بلا موقع يرى **أكثر** لا أقلّ. فنقول
        الحقيقة المقيسة: غير مربوط، ولذلك تُعرض له بيانات كل المواقع، وما العمل.
        لا يُستثنى إلّا حسابٌ مُنح «كل المواقع» صراحةً (u.allSites === true).
     لا زرّ «اطلب ربطاً» — لا توجد في الموقع وظيفة كهذه، ولا نخترعها.
     THE PREVIEW'S «MISSING SETUP (NO SITE)» STATE — added 10 Sept (DESIGN-B-3).
     🔴 The preview's wording ("the queue may be incomplete") is NOT TRUE of this
        portal — measured: sites.js seesAllSites() deliberately returns "all sites"
        for an account with no site ("do not lock the company out of its own data
        on day one"). A no-site account sees MORE, not less. So the measured truth
        is said: not linked, therefore shown every site's data, and what to do.
        Only an account explicitly granted all sites (u.allSites === true) is exempt.
     No «request a link» button: the portal has no such function; none is invented. */
  function siteMissing() {
    try {
      var u = Auth.current && Auth.current();
      if (!u || u.allSites === true) return false;
      return !(Auth.site && Auth.site());
    } catch (e) { return false; }
  }
  function setupNotice() {
    if (!siteMissing()) return '';
    return '<section class="azb-setup" role="note" data-azb-setup="site">' +
      '<h3>' + AZB.icon('warn') + AZB.esc(T({ ar: 'حسابك غير مربوط بموقع', en: 'Your account is not linked to a site' })) + '</h3>' +
      '<p>' + AZB.esc(T({
        ar: 'إلى أن يُربط حسابك بموقع، تعرض لك هذه الصفحة والسجلّات بيانات كل المواقع — لأنّ الموقع لا يحصر حساباً لم يُربط بموقع بعد. ما تراه إذن ليس نطاق موقعك.',
        en: 'Until your account is linked to a site, this page and the registers show you every site\'s data — because the portal does not restrict an account that has no site yet. What you see is therefore not your site\'s scope.' })) + '</p>' +
      '<p><b>' + AZB.esc(T({ ar: 'ما العمل؟', en: 'What to do?' })) + '</b> ' + AZB.esc(T({
        ar: 'أبلغ مسؤول النظام ليربط حسابك بموقع (الإعدادات ← المستخدمون).',
        en: 'Ask the system administrator to link your account to a site (Settings → Users).' })) + '</p>' +
    '</section>';
  }

  /* ══ حدّ الاعتماد على البطاقة — قبل الضغط، لا بعده (قاعدة التصميم المعتمدة §5) ══
     أُضيف 10 سبتمبر (DESIGN-B-3). صندوق الاعتمادات في الموقع (workflow.js inbox) يعرض
     المستند على كل من يملك فعل «اعتماد» — ولا يسأل عن قيمة المستند. فبطاقة «ينتظر
     اعتمادك» كانت تَعِد المدير المالي بإذن دفعٍ فوق حدّه، وتَعِد حساب الطوارئ بمستندٍ
     قرّر صاحب العمل ألّا يعتمده (FINISH-THREE-TRACKS: «اعتماد المدفوعات يبقى معطَّلاً»)،
     ثم يرفض الزرُّ عند الضغط. نقرأ **القاعدة نفسها بالحرف**: Rules.requiredRolesFor
     بالقيمة نفسها التي يحسبها rules.js (amountOf: |رقم| أو صفر)، وبالشرط نفسه (القيمة
     > 0، rules.js validateTransition) — ونعرض **جملة الموقع نفسها** Rules.approverHint.
     لا قاعدة جديدة، ولا يُخفى مستند، ولا يتغيّر العدد — البطاقة تقول الحقيقة قبل الضغط.
     THE APPROVAL LIMIT ON THE CARD — before the press, never after (approved
     design rule §5). Added 10 Sept (DESIGN-B-3). The portal's inbox offers a
     document to everyone holding «approve», never asking its value — so a
     «waiting for your approval» card promised a finance manager a payment above
     his band, and promised the emergency account a document the owner decided
     it must not approve, then the button refused on the press. We read THE SAME
     RULE verbatim — Rules.requiredRolesFor on the same value rules.js computes
     (amountOf: |number| or 0) under the same condition (value > 0) — and show
     the portal's OWN sentence, Rules.approverHint. No new rule, no document
     hidden, no count changed: the card tells the truth before the press. */
  function overLimitHint(mod, rec) {
    try {
      if (!mod.amountField || !global.Rules || !Rules.requiredRolesFor || !Rules.approverHint) return null;
      var amt = Math.abs(Number(rec[mod.amountField]) || 0);          /* rules.js amountOf, بالحرف */
      if (!amt) return null;                                            /* الشرط نفسه: القيمة > 0 */
      var me = Auth.current() && Auth.current().role;
      if (Rules.requiredRolesFor(amt, mod.id).indexOf(me) !== -1) return null;
      return Rules.approverHint(mod, rec);
    } catch (e) { return null; }
  }

  /* ══ اسم المشروع لا معرّفه — عُثر عليه بالنظر إلى الصور، ١٢ سبتمبر ═════════════
     كانت البطاقة تطبع `rec.project` خاماً، فيرى الموظّف «prj_p_PRJ-HQ» في مكان اسم
     المشروع. والسجلّ يعرض «مشروع PRJ-HQ» صحيحاً — فالخلل في بطاقتنا وحدها.
     الحقل من نوع ref ويعلن جدوله (`ref`) وحقل تسميته (`refLabel`, وافتراضه name) في
     departments.js — فنقرأ ما يعلنه المخطَّط ولا نخترع تحويلاً جديداً (الأمر ١٩).
     وإن تعذّر الحلّ لأيّ سبب رجعنا للقيمة الخام: معرّفٌ ظاهر أفضل من خانةٍ فارغة.
     ══ the project's NAME, not its id — found by LOOKING at the stills, 12 Sept ══
     The card printed `rec.project` raw, so staff saw «prj_p_PRJ-HQ» where a project name
     belongs. The register renders «project PRJ-HQ» correctly, so the fault was ours
     alone. The field is type `ref` and declares its table (`ref`) and its label field
     (`refLabel`, defaulting to `name`) in departments.js — so we read what the SCHEMA declares
     rather than inventing a mapping (Order 19). If it cannot be resolved we fall back to the
     raw value: a visible id beats an empty box. */
  function refText(mod, rec, fieldName) {
    var raw = rec[fieldName];
    if (raw === null || raw === undefined || raw === '') return '';
    try {
      var f = (mod.fields || []).filter(function (x) { return x.name === fieldName; })[0];
      if (f && f.ref && global.Store && Store.find) {
        var row = Store.find(f.ref, raw);
        var lbl = row && row[f.refLabel || 'name'];
        if (lbl) return String(lbl);
      }
    } catch (e) { /* الرجوع للخام / fall back to raw */ }
    return String(raw);
  }

  function card(entry, kind) {
    var mod = entry.module, rec = entry.record;
    var label = T(mod.label) || mod.id;
    var docNo = rec.docNo || rec.id || '';
    var subject = rec.purpose || rec.subject || rec.title || rec.description || rec.name || '';
    var badge = '';
    try { badge = global.Workflow && Workflow.badgeHTML ? Workflow.badgeHTML(rec.status) : ''; } catch (e) {}
    var limit = kind === 'approve' ? overLimitHint(mod, rec) : null;
    var openLbl = kind === 'approve' ? (limit ? T({ ar: 'افتح للاطّلاع', en: 'Open to view' }) : T({ ar: 'افتح للاعتماد', en: 'Open to approve' }))
                : kind === 'review' ? T({ ar: 'افتح للمراجعة', en: 'Open to review' }) : T({ ar: 'افتح', en: 'Open' });

    return '<article class="azb-card">' +
      '<div class="azb-ic">' + AZB.icon(kind === 'approve' ? 'checkc' : kind === 'review' ? 'eye' : 'file') + '</div>' +
      '<div class="azb-body">' +
        '<div class="azb-top">' +
          '<span class="azb-ltr azb-docno">' + AZB.esc(docNo) + '</span>' +
          '<span class="azb-modname">' + AZB.esc(label) + '</span>' +
          badge +
        '</div>' +
        (subject ? '<h3 class="azb-wrap">' + AZB.esc(subject) + '</h3>' : '') +
        '<div class="azb-meta">' +
          (rec.project ? '<span class="azb-wrap">' + AZB.esc(T({ ar: 'المشروع', en: 'Project' })) + ' <b>' + AZB.esc(refText(mod, rec, 'project')) + '</b></span>' : '') +
          (mod.amountField ? '<span>' + AZB.esc(T({ ar: 'القيمة', en: 'Value' })) + ' ' + amountCell(mod, rec) + '</span>' : '') +
          (rec.date ? '<span>' + AZB.esc(T({ ar: 'تاريخ المستند', en: 'Document date' })) + ' <b class="num azb-ltr">' +
             AZB.esc(global.I18N && I18N.date ? I18N.date(rec.date) : String(rec.date).slice(0, 10)) + '</b></span>' : '') +
        '</div>' +
        (limit ? '<p class="azb-card-limit" data-azb-limit="1">' + AZB.icon('lock') + '<span><b>' +
          AZB.esc(T({ ar: 'فوق حدّ اعتمادك', en: 'Above your approval limit' })) + '</b> — ' + AZB.esc(limit) + '</span></p>' : '') +
        '<div class="azb-acts">' +
          '<button type="button" class="btn ' + (limit ? 'btn-outline' : 'btn-primary') + ' azb-open" data-mod="' + AZB.esc(mod.id) +
            '" data-rid="' + AZB.esc(rec.id) + '">' + AZB.icon('eye') + ' ' + AZB.esc(openLbl) +
            '<span class="azb-sr"> ' + AZB.esc(docNo) + '</span></button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* مجموعة: أوّل FIRST بطاقات، والباقي يُفتح في مكانه بزرٍّ يقول كم بقي
     A group: the first FIRST cards; the rest open in place, with a button
     that says how many remain. Nothing is hidden without saying so. */
  function group(key, title, icon, entries, kind, note) {
    if (!entries.length) return '';
    var rest = entries.length - FIRST;
    return '<section class="azb-grp" data-grp="' + key + '">' +
      '<h2 class="azb-grp-h">' + AZB.icon(icon) + AZB.esc(title) +
        ' <span class="n">(' + entries.length + ')</span></h2>' +
      (note ? '<p class="azb-grp-note">' + AZB.esc(note) + '</p>' : '') +
      entries.map(function (e, i) {
        return i < FIRST ? card(e, kind) : card(e, kind).replace('<article class="azb-card"', '<article class="azb-card" hidden data-azb-more="1"');
      }).join('') +
      (rest > 0 ? '<button type="button" class="btn btn-outline azb-more" data-grp="' + key + '">' +
        AZB.esc(T({ ar: 'اعرض الـ' + rest + ' الباقية هنا', en: 'Show the other ' + rest + ' here' })) + '</button>' : '') +
    '</section>';
  }

  /* ── قرار ٤: المستند خارج نطاق مشروعات الشخص ────────────────────────────
     هل يُخرجه سياج المشروعات نفسه (Auth.scopeRows)؟ السياج هو نفسه الذي يطبّقه
     السجلّ (entity.js:157)، فلا نضع قاعدة جديدة — نقرأ القاعدة القائمة.
     DECISION 4: is the document outside the person's projects? Asked of the
     SAME fence the register applies (entity.js:157) — no new rule, the
     existing rule read. */
  function outOfScope(entry) {
    try { return Auth.scopeRows(entry.module.id, [entry.record]).length === 0; }
    catch (e) { return false; }
  }

  /* بطاقة واحدة للمستندات خارج النطاق، بلا أي تفصيل من المستند نفسه: لا رقم،
     ولا موضوع، ولا قيمة، ولا مشروع — لأنّ السجلّ لا يُظهر لهذا الشخص أياً منها.
     ONE card for out-of-scope documents with NO detail from the documents
     themselves — no number, subject, value or project — because the register
     shows this person none of them. Only the screen names and counts. */
  function flaggedCard(byModule) {
    var list = byModule.map(function (m) {
      return '<li><b>' + AZB.esc(m.label) + '</b> — <span class="num">' + m.count + '</span></li>';
    }).join('');
    return '<article class="azb-card blocked" data-azb-flag="scope">' +
      '<div class="azb-ic">' + AZB.icon('lock') + '</div>' +
      '<div class="azb-body">' +
        '<h3>' + AZB.esc(T({ ar: 'طلبات اعتماد في مشروعات غير مسندة إليك', en: 'Approval requests in projects not assigned to you' })) + '</h3>' +
        '<ul class="azb-flaglist">' + list + '</ul>' +
        '<p class="azb-grp-note">' + AZB.esc(T({
          ar: 'لم نفتحها لك ولم نعرض تفاصيلها، لأنّ صلاحيتك على المشروعات لا تشملها — وهي القيود نفسها التي في السجلّ. ولم نحوّلها إلى أحدٍ بالتخمين. تبقى معلّقة كما هي حتى يتصرّف فيها معتمِدٌ مخوَّل على مشروعها.',
          en: 'Not opened for you and no details shown, because your project access does not include them — the same restrictions as the register. Not passed to anyone by guesswork. They stay pending, unchanged, until an approver authorised on their project acts on them.' })) + '</p>' +
        '<p class="azb-grp-note"><b>' + AZB.esc(T({ ar: 'ما العمل؟', en: 'What to do?' })) + '</b> ' + AZB.esc(T({
          ar: 'أبلغ مدير النظام ليوجّهها وفق قواعد الاعتماد القائمة.',
          en: 'Tell the system administrator so they can be routed under the existing approval rules.' })) + '</p>' +
      '</div>' +
    '</article>';
  }

  function queueHTML() {
    var box;
    try { box = global.Workflow && Workflow.inbox ? Workflow.inbox() : null; } catch (e) { box = null; }
    if (!box) {
      return '<div class="azb-scope" style="border-inline-start-color:var(--warn)">' + AZB.icon('warn') +
        '<span class="azb-scope-v">' + AZB.esc(T({ ar: 'تعذّر قراءة صندوق الاعتمادات — لم نعرض طابوراً قد يكون ناقصاً.', en: 'Could not read the approvals inbox — no queue shown rather than one that might be incomplete.' })) + '</span></div>';
    }
    /* 🔴 مصدرٌ واحد للتعريف: إن كان سياج ROBOT-2 (inbox-project-fence.js) مركّباً،
          فالصندوق نفسه قد استبعد ما هو خارج المشروعات وأعاد box.withheld — نعرضه
          كما هو ولا نعيد الحساب. وإلّا فنكشفه نحن بالسياج نفسه (Auth.scopeRows).
          والرقم الواحد يبقى واحداً: السياج يُخرج المستبعَد من عدّاد الشارة،
          فنُخرجه من «المجموع» كذلك؛ وبلا سياج تبقى الشارة شاملةً له.
       🔴 ONE source of definition: if ROBOT-2's fence (inbox-project-fence.js) is
          installed, the inbox has ALREADY removed what is outside the projects and
          returns box.withheld — shown as it is, never recounted. Otherwise we
          detect it with the same fence (Auth.scopeRows). The one number stays
          one: the fence removes the withheld from the badge count, so we remove
          it from our total; without the fence the badge includes them. */
    var fence = box.withheld && typeof box.withheld.total === 'number' ? box.withheld : null;
    var flagged = [];
    function split(list) { return (list || []).filter(function (e) { if (!fence && outOfScope(e)) { flagged.push(e); return false; } return true; }); }
    var approve = split(box.toApprove), review = split(box.toReview), mine = box.mine || [];
    var byModule, flaggedCount;
    if (fence) { byModule = fence.byModule || []; flaggedCount = fence.total; }
    else {
      var map = {};
      flagged.forEach(function (e) { var k = e.module.id; (map[k] = map[k] || { label: T(e.module.label) || k, count: 0 }).count++; });
      byModule = Object.keys(map).map(function (k) { return map[k]; });
      flaggedCount = flagged.length;
    }
    var badgeTotal = approve.length + review.length + mine.length + (fence ? 0 : flaggedCount);
    var shownTotal = approve.length + review.length + mine.length + flaggedCount;

    if (!shownTotal) {
      return '<section class="azb-grp azb-queue" data-azb-total="0"><h2 class="azb-grp-h">' + AZB.icon('checkc') +
        AZB.esc(T({ ar: 'لا شيء ينتظر إجراءً منك', en: 'Nothing is waiting for you' })) + '</h2>' +
        '<div class="azb-card"><div class="azb-ic">' + AZB.icon('checkc') + '</div><div class="azb-body">' +
        '<h3>' + AZB.esc(T({ ar: 'طابورك فارغ', en: 'Your queue is empty' })) + '</h3>' +
        '<div class="azb-meta"><span>' + AZB.esc(T({ ar: 'هذه حالة سليمة وليست عطلاً — تمتلئ الصفحة وحدها لحظة أن يُرسل إليك أحد مستنداً.', en: 'This is a healthy state, not a fault — the page fills by itself the moment someone sends you a document.' })) + '</span></div>' +
        '</div></div></section>';
    }

    /* data-azb-total = الرقم نفسه الذي تعدّه شارة الاعتمادات (inboxCount)
       data-azb-total = the SAME number the approvals badge counts (inboxCount) */
    return '<div class="azb-queue" data-azb-total="' + badgeTotal + '" data-azb-fence="' + (fence ? 'robot2' : 'designb') + '">' +
      group('approve', T({ ar: 'ينتظر اعتمادك', en: 'Waiting for your approval' }), 'checkc', approve, 'approve') +
      group('review', T({ ar: 'ينتظر مراجعتك', en: 'Waiting for your review' }), 'eye', review, 'review') +
      (flaggedCount ? '<section class="azb-grp" data-grp="scope"><h2 class="azb-grp-h">' + AZB.icon('lock') +
        AZB.esc(T({ ar: 'خارج نطاق مشروعاتك', en: 'Outside your projects' })) + ' <span class="n">(' + flaggedCount + ')</span></h2>' +
        flaggedCard(byModule) + '</section>' : '') +
      group('mine', T({ ar: 'مستنداتك المُعادة أو المرفوضة', en: 'Your returned or rejected documents' }), 'file', mine, 'mine',
            T({ ar: 'أُعيدت إليك أو رُفضت — افتحها لترى السبب.', en: 'Returned to you or rejected — open one to see why.' })) +
    '</div>';
  }

  /* ── قرار ٣: ثلاث بطاقات رئيسية، والباقي خلف «عرض كل الملخّصات» ────────
     DECISION 3: three main cards; the rest behind «show all summaries». */
  function mainKpis() {
    var view = null, role = '';
    try { view = global.RoleView && RoleView.viewFor ? RoleView.viewFor() : null; } catch (e) {}
    try { role = Auth.current().role; } catch (e) {}
    var order = (view && view.kpis) || [];
    var pick = [];
    (PREVIEW_KPIS[role] || []).forEach(function (k) { if (order.indexOf(k) !== -1 && pick.length < 3) pick.push(k); });
    order.forEach(function (k) { if (pick.length < 3 && pick.indexOf(k) === -1 && BEHIND.indexOf(k) === -1) pick.push(k); });
    order.forEach(function (k) { if (pick.length < 3 && pick.indexOf(k) === -1) pick.push(k); });
    return pick;
  }

  /* نُعلِّم كل بطاقة باسمها وهي تُبنى — فالتعرّف عليها لا يعتمد على الترتيب
     ولا على النصّ. التعليم سمةٌ فقط؛ محتوى البطاقة كما يبنيه الموقع بالحرف.
     Each card is TAGGED with its key as it is built, so identifying it never
     depends on order or text. The tag is an attribute only; the card's
     content is exactly what the portal builds. */
  var K = DashboardView.KPIS || {};
  Object.keys(K).forEach(function (k) {
    var f = K[k];
    if (typeof f !== 'function' || f.__azb) return;
    var w = function () {
      var h = f.apply(this, arguments);
      if (typeof h !== 'string') return h;
      return h.replace(/^(\s*<[a-zA-Z]+)/, '$1 data-azb-kpi="' + k + '"');
    };
    w.__azb = true; w.original = f;
    K[k] = w;
  });

  function arrangeKpis(el) {
    var grid = el.querySelector('.kpi-grid');
    if (!grid || grid.getAttribute('data-azb-kpis')) return;
    var main = mainKpis();
    var cards = [].slice.call(grid.children);
    var extra = cards.filter(function (c) { return main.indexOf(c.getAttribute('data-azb-kpi')) === -1; });
    grid.setAttribute('data-azb-kpis', main.join(','));
    if (!extra.length) return;
    extra.forEach(function (c) { c.classList.add('azb-kpi-extra'); c.hidden = true; });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline azb-sumtoggle';
    btn.setAttribute('aria-expanded', 'false');
    var showTxt = T({ ar: 'عرض كل الملخّصات (' + cards.length + ')', en: 'Show all summaries (' + cards.length + ')' });
    var hideTxt = T({ ar: 'اعرض الملخّصات الثلاثة الرئيسية فقط', en: 'Show the three main summaries only' });
    btn.textContent = showTxt;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      extra.forEach(function (c) { c.hidden = open; });
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      btn.textContent = open ? showTxt : hideTxt;
    });
    grid.parentNode.insertBefore(btn, grid.nextSibling);
  }

  var original = DashboardView.render;

  DashboardView.render = function (host) {
    var r = original.apply(this, arguments);
    try {
      if (!AZB.isOn()) return r;
      var el = host || document.getElementById('content');
      if (!el || el.querySelector('.azb-queue, .azb-scope')) return r;

      var frag = document.createElement('div');
      frag.innerHTML = scopeBar() + setupNotice() + queueHTML();

      var kpis = el.querySelector('.kpi-grid');
      var head = el.querySelector('.page-head');
      var anchor = kpis || (head ? head.nextSibling : el.firstChild);
      while (frag.firstChild) {
        if (anchor) el.insertBefore(frag.firstChild, anchor);
        else el.appendChild(frag.firstChild);
      }
      arrangeKpis(el);

      [].forEach.call(el.querySelectorAll('.azb-open'), function (b) {
        b.addEventListener('click', function () {
          var m = b.getAttribute('data-mod'), id = b.getAttribute('data-rid');
          if (global.EntityPage && EntityPage.openDetail) EntityPage.openDetail(m, id);
          else if (global.App) App.go(m);
        });
      });
      [].forEach.call(el.querySelectorAll('.azb-more'), function (b) {
        b.addEventListener('click', function () {
          var sec = b.closest('.azb-grp');
          var hidden = sec ? sec.querySelectorAll('[data-azb-more]') : [];
          [].forEach.call(hidden, function (c) { c.hidden = false; });
          /* التركيز على أوّل بطاقة ظهرت — لا يضيع من يستعمل لوحة المفاتيح
             Focus the first newly shown card's button — keyboard users keep their place. */
          var first = hidden.length ? hidden[0].querySelector('button') : null;
          b.parentNode.removeChild(b);
          if (first) first.focus();
        });
      });
    } catch (e) {
      /* لا نُسقط لوحة التحكّم أبداً بسبب خطأ في طبقتنا
         Our layer must never take the dashboard down. */
      console.error('design-b-home: ' + (e && e.message), e);
    }
    return r;
  };

  global.AZBHome = { queueHTML: queueHTML, scopeBar: scopeBar, mainKpis: mainKpis, outOfScope: outOfScope,
                     setupNotice: setupNotice, overLimitHint: overLimitHint, original: original, FIRST: FIRST };
})(window);
