/* =========================================================================
   site-field-required.js — خانة «الموقع» تملأ نفسها، ولا تُحفَظ فارغة،
                            ولا تعرض إلا المواقع التي يملكها صاحبها
   THE «الموقع» BOX FILLS ITSELF, IS NEVER SAVED EMPTY, AND OFFERS ONLY
   THE SITES THAT PERSON MAY ACTUALLY USE
   -------------------------------------------------------------------------
   العطل · THE BUG

   sites.js:199-233 يضيف خانة «الموقع» («الموقع الذي صدر منه هذا المستند»)
   إلى ٣٠ شاشة، وproject-site-field.js يضيفها للمشروعات فتصير ٣١. الخانة
   **اختيارية وتبدأ فارغة**، ومن لا يلمسها يحفظ صفّاً بلا موقع.

   وذلك الصفّ لا «ينقصه بيان» — بل يصير مقروءاً لكل موظف في الشركة:
     · TESTS/hand-typed-site-null-reproduction.js يثبت بالتشغيل، من
       pages/entity.js الحقيقي، أن مفتاح site يغيب من الحمولة تماماً (لا
       يُرسَل نصاً فارغاً)، فيُخزَّن العمود NULL.
     · 08-SITES.sql:136-143 (az_can_site) أول شرط فيه
       «row_site is null» → مسموح للجميع.
   فمهندس سوهاج يقرأ مستند الروبيكي، والعكس، بلا أي رسالة ولا أثر.

   sites.js:199-233 adds the «الموقع» box ("the site this document came
   from") to 30 screens; project-site-field.js adds it to Projects, making
   31. The box is OPTIONAL and starts BLANK, so anyone who does not touch
   it saves a row with no site.

   Such a row is not merely incomplete — it becomes readable by EVERY
   employee in the company:
     · TESTS/hand-typed-site-null-reproduction.js proves by RUNNING the
       real pages/entity.js that the `site` key is absent from the payload
       (it is never sent as an empty string), so the column stores NULL.
     · 08-SITES.sql:136-143 (az_can_site) opens with «row_site is null»
       → allowed for everyone.
   So the Sohag engineer reads Elrobaki's document and the reverse, with
   no message and no trace.

   -------------------------------------------------------------------------
   قرار المالك · THE OWNER'S RULING (محمد زيدان، ٩ سبتمبر ٢٠٢٦،
   .claude/memory/DECISIONS.md بند ٢)

     «املأها تلقائياً — البورتال يضع موقع الشخص نفسه في الخانة، ولا يحفظ
      السجل بدون موقع.»
     «why does someone in sohag even see robaki as an option why is that
      possible sohag should be only limited to sohag not even an option to
      choose otherwise»

   فثلاثة أعمال، لا اثنان: يملأ · يرفض الفارغ · يضيّق الخيارات.
   Three jobs, not two: pre-fill · refuse an empty box · narrow the list.

   -------------------------------------------------------------------------
   لماذا لم نعدّل site-options.js — القرار وسببه · THE site-options.js
   DECISION, STATED RATHER THAN TAKEN SILENTLY

   site-options.js:185-197 (effectiveAllSites) فيه أربعة «فشل مفتوح»:
   لا مستخدم → الكل · allSites شخصية → الكل · المستخدم بلا موقع → الكل ·
   صفّ الموقع غائب أو allSites فيه null/undefined → الكل. والرابع هو
   الطريق الحيّ لشكوى المالك: حين تفشل لقطة جدول sites (رفض من القاعدة أو
   انقطاع في أول ثوانٍ) يبقى مخزن lookup-loader.js الجانبي هو المصدر —
   وأعمدته لا تشمل allSites إطلاقاً — فتعود القيمة «الكل» ويرى موظف سوهاج
   الروبيكي. (مُعاد إنتاجه بالتشغيل في TESTS/site-field-required-trial.js
   القسم C.)

   ومع ذلك **لم نلمس ذلك الملف**، لثلاثة أسباب لا واحد:
     ١) ذلك الفشل المفتوح يحرس Store.all('sites') — وهي تُغذّي أكثر بكثير
        من نموذج السجل: شاشة «المواقع والفروع» نفسها، وقائمة الموقع في
        شاشة المستخدمين (pages/settings.js:455-461) حيث **يجب** أن يرى
        المدير كل المواقع ليُسنِد موظفاً لموقعه الحقيقي، وتبويبات
        site-activity.js، وفحص sites.js:153 قبل البذر. تضييقها هناك يكسر
        إسناد الحسابات بصمت — أي نُصلح شكوى ونفتح أسوأ منها.
     ٢) الفشل المفتوح موثَّق هناك أنه **متعمَّد** (site-options.js:178-184)
        لأن صفوف البيانات نفسها محميّة من القاعدة على أي حال. حذفه حذفٌ
        لسلوك صحيح قائم، لا إصلاح.
     ٣) القاعدة الإضافية للمشروع: ملف جديد يلفّ، لا تعديل ملف حيّ. حذف هذا
        الملف يعيد كل شيء كما كان حرفياً.
   فالتضييق هنا يقع على **الخيارات المرسومة داخل #entForm وحدها** — وهي
   بالضبط الخانة التي اشتكى منها المالك — ويفشل **مغلقاً** لا مفتوحاً.

   site-options.js:185-197 (effectiveAllSites) has four fail-OPEN returns:
   no user → all · personal allSites → all · user has no site → all · the
   site row missing or its allSites null/undefined → all. The fourth is the
   live path to the owner's complaint: when the sites snapshot fetch fails
   (a database refusal, or the first offline seconds) the only remaining
   source is lookup-loader.js's side cache, whose selected columns never
   include allSites — so the answer is "all" and a Sohag employee is
   offered Elrobaki. (Reproduced by RUNNING it: section C of
   TESTS/site-field-required-trial.js.)

   We nevertheless did NOT touch that file, for three reasons, not one:
     1) That fail-open guards Store.all('sites'), which feeds far more than
        a record form: the Sites screen itself, the site picker on the
        Users screen (pages/settings.js:455-461) where an administrator
        MUST see every site to post a person to the site they really work
        at, site-activity.js's tabs, and sites.js:153's pre-seed check.
        Narrowing it there silently breaks account assignment — curing one
        complaint by opening a worse one.
     2) The fail-open is documented there as DELIBERATE
        (site-options.js:178-184), because the data rows themselves stay
        database-protected regardless. Deleting it deletes correct existing
        behaviour; it is not a fix.
     3) The project's additive rule: a new file that wraps, never an edit
        to a live one. Deleting this file restores everything exactly.
   So the narrowing here applies to the OPTIONS DRAWN INSIDE #entForm only
   — precisely the box the owner complained about — and it fails CLOSED,
   never open.

   -------------------------------------------------------------------------
   المصدر الثاني للحقيقة · THE SECOND SOURCE OF TRUTH

   حين لا يعرف Store.find('sites', id) قيمة allSites، نسأل Sites.SEED
   (sites.js:125-147) — وهو نفس الملف الذي يبذر الجدول، فليس اختراعاً
   لبيانات: الروبيكي/سوهاج false، الخلاطة/المكتب true. وبهذا لا يُضيَّق
   المكتب ولا الخلاطة خطأً وقت انقطاع، ويُضيَّق سوهاج والروبيكي دائماً.
   وإن كان الموقع خامساً لا جواب له في أي مصدر → **يُضيَّق** (فشل مغلق)،
   وهو نصّ قرار المالك حرفاً.

   When Store.find('sites', id) cannot say what allSites is, we ask
   Sites.SEED (sites.js:125-147) — the very file that seeds the table, so
   this invents nothing: Elrobaki/Sohag false, Khalata/Office true. That
   keeps the two consolidating offices wide during an outage and keeps the
   two project sites narrow always. A fifth site with no answer anywhere is
   NARROWED (fail closed) — the owner's ruling, literally.

   -------------------------------------------------------------------------
   🔴 شاشة الموظفين مستثناة — وهذا مقيس لا مُفترَض · THE EMPLOYEES SCREEN
   IS EXCLUDED, AND THIS WAS MEASURED, NOT ASSUMED

   store.js:73 يقرأ employees من العرض portal_employees، وقائمة أعمدة ذلك
   العرض (42-HR-MANAGER-SEES-EMPLOYEE-DATA.sql:184-196) **لا تحوي عمود
   site إطلاقاً** — لا مُقنَّعاً ولا مكشوفاً. فخانة «الموقع» على نموذج
   الموظف تظهر فارغة لكل دور مهما كان الموقع المخزَّن فعلاً في الجدول
   الأساسي. لو ملأناها هنا لكتبنا موقع **المُحرِّر** فوق موقع **الموظف**
   عند أول تعديل (Store.save يبني الصفّ Object.assign({}, original, patch)
   — store.js:398 — فالمفتاح الحاضر في patch يفوز)، فينتقل موظف سوهاج إلى
   المكتب بصمت لأن مدير الموارد البشرية صحّح مسمّى وظيفته. هذه هي عائلة
   «العرض المُقنَّع» في صورة جديدة، ولذلك: الشاشة مستثناة صراحة.

   store.js:73 reads employees from the portal_employees view, and that
   view's column list (42-HR-MANAGER-SEES-EMPLOYEE-DATA.sql:184-196)
   contains NO site column at all — neither masked nor plain. So the site
   box on the employee form renders EMPTY for every role, whatever the base
   table really holds. Filling it here would write the EDITOR's site over
   the EMPLOYEE's site on the first edit (Store.save rebuilds the row as
   Object.assign({}, original, patch) — store.js:398 — so a key present in
   the patch wins), silently moving a Sohag worker to the Office because
   the HR manager corrected a job title. That is the masked-view family in
   a new shape. Hence: this screen is explicitly excluded.

   ما لا يفعله هذا الملف إطلاقاً: لا يكتب null ولا نصاً فارغاً في أي حقل،
   ولا يلمس أي حقل غير site. فلا يمكنه محو عمود.
   What this file never does: it never writes null or an empty string into
   any field, and never touches any field other than `site`. It therefore
   cannot erase a column.

   -------------------------------------------------------------------------
   لماذا نلفّ UI.modal · WHY WE WRAP UI.modal

   النماذج تُرسَم داخل #modalHost لا #content، وdraft وbindForm يعيشان في
   إغلاق pages/entity.js (ملف للقراءة فقط). فنلفّ UI.modal — نفس ما يثبته
   ref-dropdown-scope.js وdraft-guard.js في هذا الموقع بالضبط:
     · حزام [0,60,300,900]ms لأن حقول الأسطر تُرسم لاحقاً عبر onOpen
       (ui.js:141، setTimeout منفصل)،
     · وMutationObserver على #modalHost لأي إعادة رسم لاحقة.
   ولا نلمس draft مباشرة أبداً: نضبط قيمة الـ<select> ثم نُطلق حدث change
   حقيقياً يصعد، فيلتقطه المستمع الحقيقي في entity.js:651-658 ويكتب
   draft.site بنفسه. لا نصل إلى حالة خاصة لملف محميّ.

   Forms render into #modalHost, not #content, and `draft`/`bindForm` live
   inside pages/entity.js's closure (a read-only file). So we wrap UI.modal
   — exactly what ref-dropdown-scope.js and draft-guard.js already prove
   here: a [0,60,300,900]ms ladder because line fields render later via
   onOpen (ui.js:141, its own setTimeout), plus a MutationObserver on
   #modalHost for later re-renders. We never touch `draft` directly: we set
   the <select>'s value and fire a real bubbling change event, which the
   real listener at entity.js:651-658 picks up and writes draft.site
   itself. No private state of a protected file is reached into.

   -------------------------------------------------------------------------
   ترتيب التحميل — مهم لسببين · LOAD POSITION — load-bearing twice

   ١) **بعد site-options.js** حتماً: نقرأ Store.find('sites', …) ونريد
      لقطته المدموجة (فيها allSites) لا صفّ lookup-loader الناقص. هذا هو
      القيد الوحيد الحقيقي على الموضع.
   ٢) **بعد save-modes.js** — تُريحاً لا شرطاً. كنتُ قد كتبتُ هنا أن هذا
      الترتيب هو ما يجعل زرَّي «مسودة» يرثان الرفض، **وكان خطأً أمسكته
      التجربة**: save-modes.js يلفّ UI.modal داخل start() عند
      DOMContentLoaded (سطر ٧٩٧)، فترتيب اللفّ لا يتبع ترتيب التحميل
      أصلاً. فالملف الآن لا يعتمد على الترتيب إطلاقاً — يحرس الأزرار بعد
      عودة نداء UI.modal أيضاً (انظر تعليق afterModal). راجع القسم H من
      التجربة: كان أحمر، وهذا سببه.
   وموضعه بعد ref-dropdown-scope.js بلا تصادم: ذاك الملف يستثني قائمة
   sites صراحةً (سطر ١١٧)، وref-search-picker.js يستثنيها كذلك.

   1) Necessarily AFTER site-options.js: we call Store.find('sites', …) and
      want its merged snapshot (which carries allSites), not lookup-
      loader's incomplete row. This is the only real constraint on the slot.
   2) AFTER save-modes.js — tidiness, NOT a requirement. This header first
      claimed that order was what made the two «مسودة» buttons inherit the
      refusal. THAT WAS WRONG AND THE TRIAL CAUGHT IT: save-modes.js wraps
      UI.modal inside start(), which runs at DOMContentLoaded (its line
      797), so wrap order does not follow load order at all. The file now
      depends on order for nothing — it guards the buttons after UI.modal
      returns as well (see the afterModal comment). Section H of the trial
      was RED, and this was why.
   Its position after ref-dropdown-scope.js collides with nothing: that
   file excludes the sites dropdown explicitly (its line 117), and
   ref-search-picker.js excludes it too.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف وتعود الخانة اختيارية تبدأ
   فارغة وتعرض ما يعرضه site-options.js — بالحرف، ولا شيء آخر يتغيّر.
   Delete this file and the box goes back to optional, blank, and showing
   whatever site-options.js shows — exactly, with nothing else changed.
   ========================================================================= */
(function (global) {
  'use strict';

  /* الشاشات المستثناة عمداً — انظر «شاشة الموظفين» في الرأس أعلاه.
     Deliberately excluded screens — see the header's employees section. */
  var EXCLUDED = { employees: true };

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function T(k) { return typeof global.t === 'function' ? global.t(k) : k; }
  function doc() { return global.document || null; }

  /* ═══ ١ · من هو، وما المواقع التي يملكها ═══════════════════════════════
     WHO HE IS, AND WHICH SITES ARE HIS */

  function currentUser() {
    try { return (global.Auth && Auth.current) ? Auth.current() : null; } catch (e) { return null; }
  }
  function ownSiteId() {
    var u = currentUser();
    return (u && u.site) ? String(u.site) : null;
  }
  function siteRow(id) {
    if (!id || !global.Store || !Store.find) return null;
    try { return Store.find('sites', id) || null; } catch (e) { return null; }
  }
  /* Sites.SEED هو نفسه ما يبذر الجدول (sites.js:125-147) — مصدر ثانٍ
     حقيقي، لا قائمة مكتوبة بيدنا هنا.
     Sites.SEED is what seeds the table itself (sites.js:125-147) — a real
     second source, never a list hand-written in this file. */
  function seedRow(id) {
    var seed = (global.Sites && Sites.SEED) || null;
    if (!seed || !id) return null;
    for (var i = 0; i < seed.length; i++) if (seed[i].id === id) return seed[i];
    return null;
  }

  /* seesEverySite() — ترتيب الفحص، وآخره يفشل **مغلقاً** عكس
     site-options.js عمداً (السبب في الرأس).
     Check order; the last step fails CLOSED, deliberately the opposite of
     site-options.js (reason in the header). */
  function seesEverySite() {
    var u = currentUser();
    if (!u) return true;                       /* لا مستخدم بعد — لا نقصّ شيئاً */
    if (u.allSites === true) return true;      /* تجاوز شخصي على صفّ الحساب */
    var sid = ownSiteId();
    /* حساب بلا موقع: لا نعرف موقعه فلا نستطيع التضييق. نتركه واسعاً —
       والرفض في القسم ٤ يجبره على اختيار واعٍ. (شاشة المستخدمين ترفض
       أصلاً إنشاء حساب بلا موقع — pages/settings.js:506.)
       An account with no site: we cannot know which site to narrow to, so
       the list is left wide and the refusal below forces a deliberate
       choice. (The Users screen already refuses to create such an account
       — pages/settings.js:506.) */
    if (!sid) return true;
    var row = siteRow(sid);
    if (row && row.allSites === true) return true;
    if (row && row.allSites === false) return false;
    var seed = seedRow(sid);
    if (seed && seed.allSites === true) return true;
    if (seed && seed.allSites === false) return false;
    return false;                              /* 🔴 فشل مغلق · fail closed */
  }

  /* ═══ ٢ · العناصر ═══════════════════════════════════════════════════ */

  function entForm() {
    var d = doc();
    return d ? d.getElementById('entForm') : null;
  }
  function formModule(form) {
    return (form && form.getAttribute) ? String(form.getAttribute('data-module') || '') : '';
  }
  /* data-record-id موجود على نموذج التعديل وحده (entity.js:546).
     data-record-id exists on the EDIT form only (entity.js:546). */
  function isEditing(form) {
    return !!(form && form.getAttribute && form.getAttribute('data-record-id'));
  }
  function siteBox(form) {
    if (!form || !form.querySelector) return null;
    try { return form.querySelector('select[name="site"]'); } catch (e) { return null; }
  }
  /* الخيارات ذات القيمة فقط — الخيار الفارغ «اختر…» ليس اختياراً.
     Only options that carry a value — the empty «choose…» is not a choice. */
  function realOptions(sel) {
    var out = [];
    var list = [];
    try { list = sel.querySelectorAll('option') || []; } catch (e) { list = []; }
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].getAttribute('value')) out.push(list[i]);
    }
    return out;
  }
  function hasOption(sel, value) {
    var list = realOptions(sel);
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('value') === value) return true;
    return false;
  }

  /* حدث change حقيقي يصعد — هو ما يجعل entity.js:651-658 يكتب draft.site.
     لو تعذّر إطلاقه أعدنا false ولا ندّعي نجاحاً.
     A real bubbling change event — this is what makes entity.js:651-658
     write draft.site. If it cannot be fired we return false and claim
     nothing. */
  function fireChange(el) {
    if (!el || typeof el.dispatchEvent !== 'function') return false;
    var ev = null;
    try { if (typeof global.Event === 'function') ev = new global.Event('change', { bubbles: true }); }
    catch (e) { ev = null; }
    if (!ev) {
      try {
        var d = doc();
        if (d && d.createEvent) { ev = d.createEvent('HTMLEvents'); ev.initEvent('change', true, false); }
      } catch (e2) { ev = null; }
    }
    if (!ev) return false;
    try { el.dispatchEvent(ev); return true; } catch (e3) { return false; }
  }

  /* ═══ ٣ · التضييق ثم الملء ═══════════════════════════════════════════ */

  /* لا يُحذف الخيار المختار حالياً أبداً — نفس قاعدة ref-dropdown-scope.js:
     حذفه يُفرغ القيمة صامتاً عند الحفظ فيمحو ارتباطاً صحيحاً كتبه غيره.
     The currently-selected option is NEVER removed — ref-dropdown-scope.js's
     own rule: removing it silently blanks the value on save, erasing a
     valid link somebody else wrote while authorised. */
  function prune(sel) {
    if (seesEverySite()) return 0;
    var mine = ownSiteId();
    if (!mine) return 0;
    var current = String(sel.value || '');
    var removed = 0;
    realOptions(sel).forEach(function (opt) {
      var v = opt.getAttribute('value');
      if (v === mine || v === current) return;
      if (opt.parentNode && opt.remove) { opt.remove(); removed++; }
    });
    return removed;
  }

  /* لماذا نحقن خيار موقعه حين يغيب · WHY WE INJECT HIS OWN SITE WHEN IT IS
     MISSING: entity.js:615 يستبعد المواقع الموقوفة، وقد لا تصل صفوف sites
     إطلاقاً في أول ثوانٍ بلا اتصال. قائمة فارغة + رفض صارم = بورتال لا
     يستطيع أحد الحفظ عليه. حقن موقعه هو **الجواب الصحيح** لا حلّاً وسطاً:
     القيمة المكتوبة هي موقعه فعلاً.
     entity.js:615 filters out inactive sites, and the sites rows may not
     have arrived at all in the first offline seconds. An empty list plus a
     hard refusal is a portal nobody can save on. Injecting his own site is
     the CORRECT answer rather than a compromise: the value written is
     genuinely his site. */
  function ensureOwnOption(sel) {
    var mine = ownSiteId();
    if (!mine) return false;
    if (hasOption(sel, mine)) return true;
    var d = doc();
    if (!d || !d.createElement || !sel.appendChild) return false;
    var row = siteRow(mine) || seedRow(mine) || {};
    try {
      var opt = d.createElement('option');
      opt.setAttribute('value', mine);
      opt.textContent = row.name || mine;
      sel.appendChild(opt);
      return true;
    } catch (e) { return false; }
  }

  function prefill(sel, form) {
    if (String(sel.value || '') !== '') return false;   /* قيمة موجودة — لا تُلمس أبداً */
    var mine = ownSiteId();
    if (!mine) return false;

    /* 🔴 على سجلٍّ قائم لا نُخمّن نيابةً عمّن يرى كل المواقع.
       سجل قديم بموقع فارغ قد يكون مستند سوهاج؛ ختمه باسم «المكتب» لأن
       هشام فتحه ليصحّح خطأً مطبعياً يُخفيه عن كاتبه الحقيقي — ضرر صامت.
       ومن يملك موقعاً واحداً فقط لا خطر عنده: القائمة عنده لا تحوي غيره
       أصلاً، فالملء يساوي الاختيار الوحيد الممكن.
       🔴 On an EXISTING record we never guess on behalf of someone who
       sees every site. An old row with a blank site may be a Sohag
       document; stamping it «Office» because Hisham opened it to fix a
       typo would hide it from its own author — a silent harm. Someone with
       a single site risks nothing: their list holds nothing else, so
       filling it equals the only choice they had. */
    if (isEditing(form) && seesEverySite()) return false;

    if (!ensureOwnOption(sel)) return false;
    sel.value = mine;
    /* في متصفح حقيقي إسناد قيمة غير موجودة يجعل value = '' بصمت — نتحقق
       بدل أن نفترض. In a real browser assigning a value that is not in the
       list silently yields '' — verified, never assumed. */
    if (String(sel.value || '') !== mine) return false;
    fireChange(sel);
    return true;
  }

  var busy = false;
  function apply() {
    if (busy) return;
    var form = entForm();
    if (!form) return;
    if (EXCLUDED[formModule(form)]) return;
    var sel = siteBox(form);
    if (!sel) return;
    busy = true;   /* مراقب التغيّرات يستدعينا على تعديلاتنا نحن — لا ندخل مرتين */
    try { prune(sel); prefill(sel, form); }
    catch (e) { console.warn('[site-field-required] could not apply', e); }
    busy = false;
  }

  /* ═══ ٤ · الرفض ═══════════════════════════════════════════════════════
     نفس أسلوب الفحص القائم على شاشة المستخدمين (pages/settings.js:506-511):
     رسالة واضحة + التركيز على الخانة + عدم إغلاق النافذة. ونضيف العلامة
     الحمراء التي يعرفها الموظف من entity.js:830-836 على النموذج نفسه.
     The same manner as the existing site check on the Users screen
     (pages/settings.js:506-511): a clear message, focus the box, keep the
     window open. Plus the red mark the employee already knows from
     entity.js:830-836 on the form itself. */
  function refuse(sel, form) {
    var msg = L({
      ar: 'اختر الموقع أولاً — أي سجل بلا موقع يظهر لكل موظفي الشركة.',
      en: 'Choose the site first — a record with no site is visible to every employee in the company.'
    });
    if (global.UI && UI.toast) UI.toast(msg, 'error', 6000);
    try {
      var lab = form.querySelector('[data-fname="site"]');
      if (lab && lab.querySelector) {
        var err = lab.querySelector('.err-msg');
        if (err) { err.textContent = L({ ar: 'اختر الموقع', en: 'Choose the site' }); err.hidden = false; }
      }
      if (sel.classList && sel.classList.add) sel.classList.add('input-error');
      if (typeof sel.focus === 'function') sel.focus();
    } catch (e) {}
  }

  function guardSave(btn) {
    if (!btn || typeof btn.onClick !== 'function' || btn.__azSiteRequired) return;
    btn.__azSiteRequired = true;
    var orig = btn.onClick;
    btn.onClick = function () {
      try {
        var form = entForm();
        var sel = form && !EXCLUDED[formModule(form)] ? siteBox(form) : null;
        if (sel) {
          var v = String(sel.value || '').trim();
          if (v) {
            /* حزام أمان: نُعيد إطلاق change بالقيمة المعروضة لحظة الضغط،
               فلا يبقى احتمال أن تكون الشاشة ممتلئة وdraft فارغاً. عملية
               عديمة الأثر إن كانت draft محدَّثة أصلاً.
               Belt and braces: re-fire change with the value on screen at
               click time, so there is no window in which the screen is full
               while `draft` is empty. A no-op when draft already agrees. */
            fireChange(sel);
          } else if (realOptions(sel).length) {
            refuse(sel, form);
            return false;
          } else {
            /* لا شيء يمكن اختياره إطلاقاً (لم تصل المواقع، وصاحب الحساب
               بلا موقع). المنع هنا يوقف العمل كله بلا مخرج، فنمرّ ونقول.
               Nothing can be chosen at all (no sites arrived and the
               account has no site). Blocking here would halt all work with
               no way out, so we pass through and say so. */
            console.warn('[site-field-required] the site box is empty and offers nothing to choose — ' +
                         'saved without a site. Assign this account a site on the Users screen.');
          }
        }
      } catch (e) { console.warn('[site-field-required] guard failed open', e); }
      return orig.apply(this, arguments);
    };
  }

  /* ═══ ٥ · التغليف ═════════════════════════════════════════════════════ */

  /* الأزرار التي تحفظ فعلاً · THE BUTTONS THAT ACTUALLY SAVE
     ١) زرّ «حفظ» — نفس تعريفه حرفياً في save-modes.js:499-502.
     ٢) زرّا «مسودة» و«مسودة حتى الاتصال» — نفس تعريفهما حرفياً في
        draft-guard.js:169-170. مسودة بلا موقع تُخزَّن NULL وتُقرأ من كل
        موظف تماماً كالسجل النهائي، فاستثناؤها بلا معنى.
     نافذة المستخدمين تطابق الشكل الأول لكنها بلا #entForm، فيمرّ الحارس
     فيها دون أثر (ولها فحص موقعها الخاص في pages/settings.js:506).
     1) The Save button — its identification verbatim from
        save-modes.js:499-502.
     2) The «مسودة» / «مسودة حتى الاتصال» buttons — verbatim from
        draft-guard.js:169-170. A draft with no site stores NULL and is read
        by every employee exactly like a final record, so exempting it would
        be pointless.
     The Users dialog matches the first shape but has no #entForm, so the
     guard passes through with no effect there (and it already carries its
     own site check at pages/settings.js:506). */
  function isSaveLike(b) {
    if (!b || typeof b.onClick !== 'function' || !b.keepOpen || typeof b.label !== 'string') return false;
    if (b.cls === 'btn-primary' && b.label === T('g.save')) return true;
    if (b.cls === 'btn-outline' && b.label === (isAr() ? 'مسودة' : 'Draft')) return true;
    if (b.cls === 'btn-gold' && b.label === (isAr() ? 'مسودة حتى الاتصال' : 'Draft until connected')) return true;
    return false;
  }
  function guardButtons(opts) {
    var btns = opts && opts.buttons;
    if (!Array.isArray(btns)) return;
    btns.forEach(function (b) { if (isSaveLike(b)) guardSave(b); });
  }

  var lastOpts = null;

  /* 🔴 لماذا نحرس الأزرار **مرتين**: قبل النداء وبعده — وهذا ليس احتياطاً
     زائداً بل تصحيح لخطأ وقعتُ فيه وأمسكته التجربة.
     كنت أفترض أن ترتيب التحميل وحده يكفي: نحن الأحدث تحميلاً فنكون
     الأخارجية، فنستبدل onClick قبل أن يلتقطه save-modes.js:506 في runSave.
     **وهذا غير صحيح**: save-modes.js يُثبِّت لافّته داخل start() التي تعمل
     عند DOMContentLoaded (سطر ٧٩٧)، بينما كنا نُثبِّت لافّتنا لحظة تنفيذ
     السكربت — فصرنا الداخلية، والتقط runSave الدالّة الأصلية قبل حراستنا،
     فحُفظت «مسودة» بلا موقع (قسم H من التجربة، أحمر قبل هذا التصحيح).
     والترتيب نفسه غير مضمون: يعتمد على readyState لحظة تنفيذ كل ملف.
     فالحلّ ألّا نعتمد على الترتيب إطلاقاً: نحرس ما نراه قبل النداء، ثم
     نحرس **ما وصل فعلاً** بعد عودة النداء — وعندها تكون أزرار المسودة قد
     أُدرجت أياً كان الترتيب. وui.js:116-117 يقرأ b.onClick **لحظة الضغط**
     لا لحظة الرسم، فالاستبدال المتأخر نافذ فعلاً (مُثبَت بالتشغيل، H.2).
     🔴 WHY THE BUTTONS ARE GUARDED TWICE — before the call and after — and
     this is not belt-and-braces, it is the correction of a mistake the
     trial caught. I assumed load order alone was enough: loaded last, we
     would be the OUTER wrapper and would replace onClick before
     save-modes.js:506 captured it as runSave. THAT IS FALSE:
     save-modes.js installs its wrapper inside start(), which runs at
     DOMContentLoaded (its line 797), while we were installing ours at
     script-execution time — so we were INNER, runSave captured the
     unguarded original, and a «مسودة» saved with no site (section H of the
     trial, RED before this correction). The order is not even stable: it
     depends on document.readyState when each file executes. So we stop
     depending on order at all — guard what we can see before the call, then
     guard WHAT ACTUALLY ARRIVED after it returns, by which point the draft
     buttons have been spliced in whichever wrapper is outer. And
     ui.js:116-117 reads b.onClick AT CLICK TIME, not at draw time, so a
     late replacement really takes effect (proven by running, H.2). */
  function afterModal() {
    try { guardButtons(lastOpts); } catch (e) { console.warn('[site-field-required] could not guard the save buttons', e); }
    [0, 60, 300, 900].forEach(function (ms) { setTimeout(apply, ms); });
  }

  function wrapModal() {
    if (!global.UI || !UI.modal || UI.__azSiteFieldRequiredWrapped) return;
    var origModal = UI.modal;
    UI.modal = function (opts) {
      lastOpts = opts;
      try { guardButtons(opts); } catch (e) { console.warn('[site-field-required] could not guard the save buttons', e); }
      var out = origModal.apply(UI, arguments);
      afterModal();
      return out;
    };
    UI.__azSiteFieldRequiredWrapped = true;
  }

  /* نفس حزام dc-tuning.js/ref-dropdown-scope.js المُثبَت في هذا الموقع.
     The same retry ladder those two files already prove here. */
  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(wrapModal, ms); });
  if (doc()) {
    document.addEventListener('DOMContentLoaded', function () {
      wrapModal();
      var host = document.getElementById('modalHost');
      if (host && global.MutationObserver) new MutationObserver(apply).observe(host, { childList: true, subtree: true });
    });
  }
  wrapModal();

  global.SiteFieldRequired = {
    seesEverySite: seesEverySite,
    apply: apply,
    EXCLUDED: EXCLUDED
  };
})(window);
