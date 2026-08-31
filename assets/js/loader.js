/* Fixed-order production loader plus a deployment self-check.
   departments.js is loaded AFTER schema.js and BEFORE auth.js, because it
   registers the Site Engineers and Document Control screens that auth.js
   then grants permissions on. */
(function () {
  'use strict';
  var FILES = [
    'assets/js/env.js',
    'assets/js/config.js',
    'assets/js/offline-db.js',
    /* 🔴 الهاتف الممتلئ (أو التصفّح الخاص) كان يمنع الدخول تماماً:
       store.js:145-146 و:152 تنتظر ثلاثة نداءات على OfflineDB بلا
       try/catch، فيرفض التخزين ويموت الدخول برسالة «تحقق من الاتصال» —
       وكلمة السر صحيحة والإنترنت يعمل. يجب أن يأتي بعد offline-db.js
       مباشرة (يلفّه) وقبل أي استعمال له. store.js مقروء فقط بقاعدة
       المشروع، ولذلك هو ملف منفصل: حذفه يعيد سلوك اليوم حرفياً.
       مُثبَت بالتشغيل: TESTS/offline-db-guard-trial.js — القسم B يستنسخ
       الدخول الممنوع، والقسم G يثبت أن الفحص يحمرّ فعلاً.
       🔴 A full phone (or private browsing) used to block signing in
       entirely: store.js:145-146 and :152 await three OfflineDB calls with
       no try/catch, so storage refuses and the login dies with "check your
       connection" — while the password was right and the internet fine.
       Must load immediately after offline-db.js (it wraps it) and before
       anything uses it. store.js is read-only by project rule, hence a
       separate file: deleting it restores today's behaviour exactly.
       Proven by running TESTS/offline-db-guard-trial.js — section B
       reproduces the blocked login, section G proves the check can go
       red. (v2.0.27) */
    'assets/js/offline-db-guard.js',
    'assets/js/i18n.js',
    'assets/js/store.js',
    /* يمنع محو الرواتب حين يُعاد حفظ عمود مُقنَّع (عرض portal_employees يُعيد
       الأعمدة المخفية عن hr_manager كـ NULL صريح، لا يحذفها) — مباشرة بعد
       store.js ولا شيء قبل schema.js/auth.js، لأنه لا يعتمد عليهما ويجب أن
       يصبح أقرب لفّة إلى Store.save الأصلية، فتُطبَّق قاعدته قبل أي لفّة
       لاحقة (save-guard.js، audit-trail.js). انظر تعليق الملف نفسه للسلسلة
       كاملة، ومُثبَت بالتشغيل في TESTS/masked-null-writeback-trial.js.
       Stops a masked NULL from erasing real data on save (the
       portal_employees view returns hidden columns to hr_manager as
       explicit NULL, never omitted) — immediately after store.js and
       before schema.js/auth.js, since it needs neither and must become
       the innermost wrap around Store.save, so its rule runs before any
       later wrap (save-guard.js, audit-trail.js). See the file's own
       header for the full chain; proven by running
       TESTS/masked-null-writeback-trial.js. */
    'assets/js/null-writeback-guard.js',
    'assets/js/schema.js',
    /* يضيف حقل تاريخ الإفراج عن الاحتجاز — يجب أن يسبق agents.js */
    'assets/js/retention-release-field.js',
    /* يضيف خصم وتحصيل الضريبة على مستخلصات العميل — بعد retention-release-field.js مباشرة */
    'assets/js/client-ipc-withholding.js',
    /* يضيف «متوقع تحصيله في» لمستخلصات العميل — يقرأه cash-forecast.js لاحقاً؛
       نفس فتحة retention-release-field.js وclient-ipc-withholding.js تماماً */
    'assets/js/expected-collection-field.js',
    /* «تاريخ التقديم للهيئة» و«القيمة المعتمدة من الهيئة» على مستخلصات
       العميل — يقرأهما سجل مستخلصات الهيئة (authority-ipc-register.js)
       لاحقاً؛ نفس فتحة الثلاثة حقول التي تسبقه تماماً (v2.0.18).
       "Date submitted to the Authority" and "amount the Authority
       certified" on client IPCs — read later by the Authority-IPC
       register; the exact same slot as the three fields before it
       (v2.0.18). */
    'assets/js/authority-ipc-fields.js',
    'assets/js/departments.js',
    /* «تاريخ الرد الفعلي» على المراسلات فقط (لا على مذكرات الإرسال — قرار
       المالك ٢٩ أغسطس). لا يعمل قبل departments.js لأنه هو الذي يسجّل شاشة
       correspondence؛ لو حُمّل قبله لا يحدث خطأ ولا تظهر الخانة إطلاقاً —
       عطل صامت. مُثبَت بالتشغيل: TESTS/correspondence-reply-date-trial.js
       فحص العطل رقم ١.
       "Actual reply date" on correspondence letters ONLY (never on
       transmittals — the owner's ruling, 29 Aug). Does nothing before
       departments.js, which registers the correspondence screen; loaded
       earlier it throws no error and the box simply never appears — a
       silent failure. Proven by running
       TESTS/correspondence-reply-date-trial.js, fault injection #1.
       (v2.0.27) */
    'assets/js/correspondence-reply-date.js',
    'assets/js/hr-department.js',
    /* صافي الراتب يحسب البنود الثمانية التي أضافها hr-department.js —
       بعده مباشرة حتماً، لأنه يبني الصيغة من الحقول الموجودة فعلاً.
       Net pay counts the eight items hr-department.js adds — immediately
       after it, because it builds the formula from the fields that exist. */
    'assets/js/payroll-net.js',
    /* dc-requests.js يضيف حقولاً لشاشات departments.js، فيجب أن يأتي بعده */
    'assets/js/dc-requests.js',
    /* dc-tuning.js يوسّع نفس شاشات ضبط المستندات (أرقام حقيقية، بادئة SI،
       خيارات الاعتماد) — بعد dc-requests.js مباشرة */
    'assets/js/dc-tuning.js',
    'assets/js/sites.js',
    /* «الموقع» على شاشة المشروعات — تسريب اسم مشروع سوهاج لقوائم الروبيكي
       المنسدلة (السطر لم يكن يملك حقل site إطلاقاً). يحتاج SITE_FIELD/
       scopeBySite من sites.js، فيأتي بعده مباشرة.
       A "site" field on the Projects screen — the leak of Sohag project's
       name into Elrobaki's dropdowns (the row never had a site field at
       all). Needs sites.js's SITE_FIELD/scopeBySite, so it comes right
       after it. */
    'assets/js/project-site-field.js',
    'assets/js/auth.js',
    /* يُسجِّل دور «robot» في المتصفح — تكملة سور 20-ROBOT-ACCOUNT.sql في
       القاعدة وحدها؛ بعد auth.js حتماً ليضيف إلى Auth.ROLES الموجود
       فعلاً (v2.0.18). Registers the "robot" role in the browser — the
       missing half of 20-ROBOT-ACCOUNT.sql's database-only fence;
       necessarily after auth.js to add to the already-existing
       Auth.ROLES (v2.0.18). */
    'assets/js/robot-role.js',
    /* يُثبِّت حاجز المواقع الذي فشل sites.js نفسه في تثبيته وقته —
       Auth.__sitesInstalled أُثبت undefined على الإنتاج الحيّ. يعيد بناء
       نفس اللفّة من Sites.* المُصدَّرة، محروسة بنفس العلم، فلا لفّ مزدوج
       ممكناً. بعد auth.js حتماً — هو ما تنتظره لتوجد.
       Installs the site fence that sites.js's own attempt missed —
       Auth.__sitesInstalled was proven undefined on live production.
       Rebuilds the identical wrap from Sites.*'s exports, guarded by the
       same flag, so double-wrapping is impossible. Necessarily after
       auth.js — the very thing it is waiting to exist. */
    'assets/js/site-fence-retry.js',
    /* رفض القاعدة يظهر بصدق في شاشة الدخول بدل «كلمة مرور خاطئة» — يلفّ
       Auth.login، فيأتي بعد auth.js حتماً ولا يمكن لأي إنسان الضغط على
       زر الدخول قبل أن تكتمل هذه اللفة (v2.0.19).
       A database refusal shows honestly on the login screen instead of
       "wrong password" — wraps Auth.login, so it necessarily comes after
       auth.js, and no human can press the login button before this wrap
       completes (v2.0.19). */
    'assets/js/login-refusal-text.js',
    /* جلسة تموت تحت الواجهة لا تُترَك بلا تفسير — يستمع لحدث Supabase
       الحقيقي عبر Auth.client()، فيحتاج Auth موجوداً فقط، مثل الملف السابق
       تماماً (v2.0.19).
       A session that dies under the UI is never left unexplained —
       listens to Supabase's own real event through Auth.client(), so it
       only needs Auth to exist, exactly like the file before it (v2.0.19). */
    'assets/js/session-expiry-watch.js',
    /* أجر الاشتراك التأميني وحساب التأمينات — بعد auth.js حتماً، لأن دفع
       الحقل في Auth.SENSITIVE.employees يحتاج Auth موجوداً أولاً.
       Insurance wage and its arithmetic — necessarily after auth.js,
       because pushing the field into Auth.SENSITIVE.employees needs Auth
       to already exist. */
    'assets/js/payroll-insurance.js',
    'assets/js/identity.js',
    'assets/js/workflow.js',
    'assets/js/workflow-policy.js',
    /* 🔴 بعد workflow-policy.js حتماً. شاشات الاعتماد (طلبات فحص الأعمال،
       بطاقات الصبّة…) تكتب حالة السجل فعلاً لكن قائمتها لا تعرض عمود
       الحالة، لأن dc-requests.js deriveColumns يضيفه فقط إن وجد حقلاً اسمه
       status — وهذه الشاشات حالتها في عمود دورة الاعتماد لا في حقل شاشة.
       فالشاشات التي لها حالة حقيقية هي وحدها التي لا تعرضها. هذه شكوى
       المالك حرفياً: «شغل الموقع والتنفيذ… هي just there».
       يجب أن يأتي بعد workflow-policy.js لأنه يخفّض شاشات طبقة السجل إلى
       workflow=false؛ لو عملنا قبله لأضفنا العمود لشاشة بلا دورة اعتماد
       وأعدنا انهيار سجل المستندات (عمود status بلا حقل status).
       🔴 Necessarily AFTER workflow-policy.js. Approval screens really do
       write a status but their lists never show it, because deriveColumns
       adds that column only when a `status` FIELD exists — and their status
       lives in the workflow column, not a screen field. So the screens that
       HAVE a real state are the only ones not showing it. This is the
       owner's literal complaint. Must be after workflow-policy.js, which
       demotes RECORD-tier screens to workflow=false: running earlier we
       would add the column to a screen with no approval cycle and recreate
       the document-register crash. Proven by running
       TESTS/workflow-status-column-trial.js. (v2.0.28) */
    'assets/js/workflow-status-column.js',
    /* يفكّ عَلَق مستندات التوقيع الواحد — بعد workflow-policy.js حتماً */
    'assets/js/one-step-approval.js',
    /* يُعيد زر «مراجعة» على شاشة المستند نفسها لصاحب التوقيع الأول على
       مستندات التوقيع الواحد — بعد one-step-approval.js حتماً ليرى
       نتيجة زرّه المباشر أولاً (v2.0.18).
       Restores the "review" button on the document's own screen for the
       first-signature holder on one-step documents — necessarily after
       one-step-approval.js so it sees its direct button's result first
       (v2.0.18). */
    'assets/js/first-signature.js',
    'assets/js/ui.js',
    /* يمنع تقريب الأرقام العشرية (منسوب 98.76، حجم 7.5) إلى صحيح عند
       العرض والطباعة — يلفّ UI.displayValue فيحتاج ui.js محمَّلاً أولاً،
       ويجب أن يسبق print.js وpages/entity.js لأنهما يستهلكانه.
       Stops decimal fields (a level of 98.76, a volume of 7.5) rounding to
       a whole number on screen and on the printed page — wraps
       UI.displayValue so needs ui.js loaded first, and must precede
       print.js and pages/entity.js, which consume it. */
    'assets/js/number-decimals.js',
    /* يجعل الصيغ المكتوبة كدوالّ تُحسب فعلاً — ثمانية حقول في الموارد
       البشرية كانت تعرض صفراً. بعد ui.js حتماً وقبل pages/entity.js.
       Makes function-style formulas actually compute — eight HR fields were
       reading zero. After ui.js, and before pages/entity.js. */
    'assets/js/calc-formulas.js',
    /* الرقم القومي إجباري لكل عامل في كشف العمالة اليومية، ويظهر آخر ٤
       أرقام فقط في القوائم والطباعة — يحتاج Schema (لتثبيت lines.validate
       على dailyLabour) وUI.displayValue (اللفافة الثالثة من أربع، بعد
       الاثنتين أعلاه). بعد hr-department.js (٤٥) حتماً.
       Compulsory national ID per worker on the daily-labour sheet, and
       last-4 display in lists/print — needs Schema (to install
       lines.validate on dailyLabour) and UI.displayValue (the third of
       four wrappers, after the two above). Necessarily after
       hr-department.js (45). */
    'assets/js/daily-labour-id.js',
    /* اللفافة الرابعة على UI.displayValue — صندوق اختيار لم يُجَب يعرض «—»
       لا «لا». بعد daily-labour-id.js (الثالثة) مباشرة لتكون الأخارجية —
       الترتيب بين الأربع غير مهم وظيفياً (فروع منفصلة تماماً) لكن هذا
       يبقي كل لفافات UI.displayValue متجاورة في القائمة.
       The FOURTH UI.displayValue wrap — an unanswered checkbox now shows
       '—', never «لا». Immediately after daily-labour-id.js (the third)
       to be outermost — order among the four is functionally indifferent
       (entirely disjoint branches) but this keeps every UI.displayValue
       wrap adjacent in the list. */
    'assets/js/checkbox-three-states.js',
    'assets/js/rules.js',
    'assets/js/print.js',
    /* المبلغ بالأرقام وحده على كل ورقة مالية — هذا الملف يضيف «فقط ... لا
       غير» تحت الرقم على الخمسة عشر مستنداً التي تحمل amountField، بلفّ
       Print.doc. يحتاج Print موجوداً وقت التحميل، فبعد print.js حتماً.
       Every money paper printed figures only — this file adds the «فقط …
       لا غير» words line under the figure on all fifteen amountField
       documents, by wrapping Print.doc. Needs Print to exist at load
       time, so necessarily after print.js. */
    'assets/js/amount-in-words.js',
    /* المبلغ المسدَّد/المحصَّل الحقيقي من سندات الصرف/القبض المعتمدة —
       قبل alerts.js لأنه يقرأها */
    'assets/js/money-owed.js',
    /* تاريخ انتهاء العقد الحقيقي وعدد الحاضرين اليوم الحقيقي — قبل
       alerts.js لأنه يقرأهما */
    'assets/js/hr-signals.js',
    /* «المسدَّد» و«المتبقي» الحقيقيان على سلف الموظفين، من خصومات المسير
       المعتمد — قبل alerts.js/hr-alerts.js لأنهما يقرآنه */
    'assets/js/advance-balance.js',
    'assets/js/alerts.js',
    /* ⚠️ الترتيب الثلاثي هنا إلزامي ولا يجوز تبديله:
           alerts.js → hr-alerts.js → dc-alerts.js
       hr-alerts.js يلفّ Alerts.list وحدها، وdc-alerts.js هو الذي يُعيد بناء
       الخمس دوالّ المُصدَّرة من القائمة المدمجة. فلو سبق dc-alerts.js
       hr-alerts.js لاختفت تنبيهات الموارد البشرية من الشاشة بلا أي رسالة.

       ⚠️ This three-way order is mandatory. hr-alerts.js wraps Alerts.list
       only; dc-alerts.js is what rebuilds all five exported functions from
       the merged list. If dc-alerts.js came first, the HR alerts would
       vanish from the screen with no error at all. */
    'assets/js/hr-alerts.js',
    /* التحويل المخزني يُقيَّد فقط عند تسجيل الوصول الفعلي، لا عند الاعتماد
       الورقي — يلفّ Alerts.list ويحتاج أن يسبق dc-alerts.js بالضبط لنفس
       سبب hr-alerts.js أعلاه (انظر تعليقه). يحتاج Store/Schema/Auth/Rules/
       Alerts (كلها قبله). فالسلسلة الإلزامية الآن رباعية:
       alerts.js → hr-alerts.js → stock-in-transit.js → dc-alerts.js.
       Stock transfers are credited at the destination only once real
       arrival is recorded, never on paper approval alone — wraps
       Alerts.list and must precede dc-alerts.js for exactly hr-alerts.js's
       own reason above (see its comment). Needs Store/Schema/Auth/Rules/
       Alerts (all earlier). The mandatory chain is now FOUR files:
       alerts.js → hr-alerts.js → stock-in-transit.js → dc-alerts.js. */
    'assets/js/stock-in-transit.js',
    'assets/js/dc-alerts.js',
    /* «صادر للتنفيذ» كان يُرفض دائماً — حقل شاشة اسمه status (draft/issued/
       review/superseded/void) كان يكتب في عمود دورة الاعتماد نفسه، المقيَّد
       بقائمة CHECK مختلفة تماماً. يُعاد تسميته هنا إلى documentStatus —
       العمود الحقيقي غير المُستخدَم قط. بعد dc-alerts.js عمداً: أي محاولة
       لاحقة للفّ Alerts هنا تقع بعد أن تجمَّدت دواله الخمسة (انظر تعليق
       الملف نفسه لماذا لم نبنِ ذلك الجزء الليلة).
       "Issued for construction" was always refused — a screen field named
       status (draft/issued/review/superseded/void) wrote into the very
       workflow status column, constrained by a completely different CHECK
       list. Renamed here to documentStatus — the real column that was
       never used. Deliberately after dc-alerts.js: any later attempt to
       wrap Alerts here would run after its five functions are already
       frozen (see the file's own comment for why that part was not built
       tonight). */
    'assets/js/doc-status-field.js',
    'assets/js/roleview.js',
    /* ── المساعد المهني · the professional assistant ──
       الترتيب مهم: الخبرة، ثم المفتّش، ثم فحوصات الأقسام، ثم المساعد.
       Order matters: knowledge, inspector, department checks, then assistant. */
    'assets/js/knowledge.js',
    'assets/js/inspector.js',
    'assets/js/inspector-departments.js',
    /* يوصّل مدير الموارد البشرية بخبرة وفحوصات ولوحة "hr" — بعد الفحوصات
       الإضافية وقبل المساعد الذي يقرأها */
    'assets/js/hr-manager-links.js',
    'assets/js/assistant.js',
    'assets/js/assistant-pro.js',
    'assets/js/agents.js',
    'assets/js/pages/dashboard.js',
    'assets/js/pages/dashboard-render.js',
    'assets/js/pages/entity.js',
    'assets/js/pages/approvals.js',
    'assets/js/pages/reports.js',
    'assets/js/pages/settings.js',
    /* الحقيقة النيّة عن أعمدة القاعدة الإجبارية — مُولَّدة من SQL الإنتاج
       الحقيقي (TESTS/generate-db-hard-columns.js)، لا مكتوبة يدوياً أبداً.
       draft-guard.js وحده يقرأها، فيسبقه مباشرة.
       The raw fact about mandatory database columns — generated from the
       real production SQL (TESTS/generate-db-hard-columns.js), never
       hand-written. Only draft-guard.js reads it, so it comes right
       before it. */
    'assets/js/db-hard-columns.js',
    /* ⚠️ ترتيب إلزامي — يجب أن يسبق save-modes.js حتماً: كلاهما يلفّ
       UI.modal، وبتحميل هذا الملف أولاً يصبح لفّه الداخلي — فحين يلفّ
       save-modes.js (الأحدث تحميلاً) ويُدرِج زرّي «مسودة» في opts.buttons
       (save-modes.js:655) قبل مناداة الأصلية، يصل الاستدعاء إلى هذا الملف
       وopts.buttons يحمل الزرّين بالفعل، فيستطيع لفّ onClick كل منهما.
       عكس الترتيب يعني أن هذا الملف يرى opts.buttons قبل أن تُضاف
       الأزرار إطلاقاً — لا شيء يُلفّ، والعطل يعود كاملاً.
       ⚠️ MANDATORY ORDER — must precede save-modes.js: both wrap
       UI.modal, and loading this file first makes its wrap the inner
       one — when save-modes.js (loaded later) wraps and splices the two
       "Draft" buttons into opts.buttons (save-modes.js:655) before
       calling the original, the call reaches this file with those
       buttons already present, so it can wrap each one's onClick.
       Reversing the order means this file would see opts.buttons before
       the buttons are ever added — nothing gets wrapped, and the bug
       returns in full. */
    'assets/js/draft-guard.js',
    /* يمنع زرّي «مسودة» من الظهور على نوافذ لا تخصّ سجلاً في المخطط —
       المستخدمون هي الحالة المُثبَتة اليوم. يجب أن يسبق save-modes.js
       لنفس سبب draft-guard.js أعلاه بالضبط (ترتيب اللفّ)؛ الترتيب بينه
       وبين draft-guard.js نفسه لا يهمّ (v2.0.18).
       Strips the two "draft" buttons from dialogs with no backing schema
       record — the Users dialog is today's proven case. Must precede
       save-modes.js for exactly draft-guard.js's own reason above (wrap
       order); the order between this file and draft-guard.js itself does
       not matter (v2.0.18). */
    'assets/js/user-dialog-guard.js',
    /* 🔴 قبل save-modes.js حتماً، وهذا عكس attach-from-form.js عمداً.
       save-modes.js هو من يُنشئ زرَّي «مسودة» و«مسودة حتى الاتصال» داخل
       لافّته لـUI.modal. فلكي نرى الأزرار يجب أن يلفّنا هو لا العكس: يضيف
       أزراره إلى opts ثم ينادي ما تحته، فتصلنا opts وفيها الأزرار. لو
       حُمّلنا بعده لصرنا الأبعد ولعملنا قبل أن توجد الأزرار إطلاقاً.
       يغيّر الاسم فقط على الشاشات المخفَّضة (workflow=false وقت التشغيل)،
       حيث لا يصير أي سجل «مسودة» — ويمنع «التأكيد الكاذب»: عمود دورة
       حياة المستند يعرض «مسودة» افتراضياً سواء ضُغط الزرّ أم لا.
       🔴 Necessarily BEFORE save-modes.js — deliberately the opposite of
       attach-from-form.js. save-modes.js creates the two draft buttons
       inside its own UI.modal wrapper, so it must wrap US: it adds its
       buttons to opts and then calls through, so opts reaches us already
       carrying them. Loaded after, we would be outermost and would run
       before the buttons existed. Label only, on RUNTIME-demoted screens
       where nothing becomes a draft — and it breaks the FALSE CONFIRMATION:
       the document-lifecycle column shows «مسودة» by default whether or not
       the button was pressed. Proven by running
       TESTS/save-mode-labels-trial.js. (v2.0.28) */
    'assets/js/save-mode-labels.js',
    'assets/js/save-modes.js',
    /* «تم الحفظ» وحدها كانت تُقرأ كـ«تمّ كل شيء» بينما يظلّ السجل «مسودة».
       يغيّر الكلام فقط — لا يلمس status ولا يرقّي شيئاً. بعد save-modes.js
       حتماً: كلاهما يلفّ Store.save/Store.create، وهذا يجب أن يكون الأبعد
       فيرى ما وصل فعلاً. يقرأ mod.workflow **وقت التشغيل**، فلا يتكلّم عن
       شاشات طبقة RECORD التي خفّضها workflow-policy.js:117 ولا تُختم
       «مسودة» أصلاً. مُثبَت: TESTS/draft-save-honesty-trial.js (القسم I
       يثبت أن الفحص يحمرّ فعلاً).
       "Saved" alone read as "everything is done" while the record stayed a
       draft. Wording only — never touches status, never promotes anything.
       Necessarily after save-modes.js: both wrap Store.save/Store.create and
       this must be the outer one so it sees what actually arrived. Reads
       mod.workflow AT RUNTIME, so it stays silent about RECORD-tier screens
       demoted by workflow-policy.js:117, which never stamp drafts at all.
       Proven by running TESTS/draft-save-honesty-trial.js (section I proves
       the check can go red). (v2.0.28) */
    'assets/js/draft-save-honesty.js',
    /* كل قائمة اختيار ref تحترم الآن نطاق الاطّلاع (مشروعات/مواقع/إلخ) —
       بعد save-modes.js: كلاهما يلفّ UI.modal، والترتيب بينهما غير مهم
       (كل واحد يقرأ opts.buttons أو الـDOM، لا يتصادمان أبداً).
       Every ref dropdown now respects visibility scope (projects/sites/
       etc.) — after save-modes.js: both wrap UI.modal, and the order
       between the two does not matter (each reads either opts.buttons or
       the DOM, they never collide). */
    'assets/js/ref-dropdown-scope.js',
    /* رفض القاعدة يُشرح بصدق بدل وعد كاذب بإعادة المحاولة — يستمع لحدث
       store.js ويلفّ UI.toast؛ لا يحتاج ترتيباً محدداً مع ما سبقه هنا،
       وُضع بجوار الملفات الأخرى التي تلمس الحفظ لسهولة القراءة.
       A database refusal is explained honestly instead of a false
       "will retry" promise — listens to store.js's own event and wraps
       UI.toast; needs no specific order relative to what precedes it
       here, placed near the other save-related files for readability. */
    'assets/js/refusal-explain.js',
    'assets/js/attachments.js',
    /* كشف حساب الموظف — يلفّ EntityPage.openDetail مثل attachments.js
       تماماً، فيأتي بعده ليظهر الكشف تحت المرفقات لا فوقها.
       The employee statement wraps EntityPage.openDetail exactly as
       attachments.js does, so it comes after it and lands below it. */
    'assets/js/employee-statement.js',
    /* يُنهي إصلاح المخزون: يُلصق Dashboard.analytics بالحساب المصحَّح
       (يحتاج Dashboard موجوداً — بعد pages/dashboard.js)، ويضيف زرّ
       «تسجيل وصول التحويل» على تحويل معتمد عبر لفّ EntityPage.openDetail
       — بعد employee-statement.js فيظهر تحت لوحته لا فوقها، بنفس أسلوب
       attachments.js/employee-statement.js أعلاه.
       Finishes the stock fix: patches Dashboard.analytics onto the
       corrected computation (needs Dashboard to exist — after pages/
       dashboard.js), and adds a "Record transfer arrival" button on an
       approved transfer by wrapping EntityPage.openDetail — after
       employee-statement.js so it lands below its panel, not above,
       exactly like attachments.js/employee-statement.js above. */
    'assets/js/stock-arrival-gate.js',

    /* ثلاث شاشات مكتب فني جديدة (شيت مناسيب · طلب خرسانة · إذن فحص داخلي) —
       بعد employee-statement.js وقبل app.js حتماً، وقبل doc-numbering.js
       تحديداً: doc-numbering.js:229 يلتقط numberedTables() مرة واحدة عند
       تحميله من Schema.MODULES في تلك اللحظة — فلو سُجِّلت هذه الوحدات بعده
       لَما راقبت بادئاتها الثلاث (LVL/CR/IPT) أبداً.
       Three new technical-office screens (levels sheet, concrete request,
       internal inspection permit) — necessarily after employee-statement.js
       and before app.js, and specifically before doc-numbering.js:
       doc-numbering.js:229 snapshots numberedTables() once, from
       Schema.MODULES at that moment — registering these modules after it
       would mean their three prefixes (LVL/CR/IPT) are never watched. */
    'assets/js/sheets-templates.js',

    /* ملاحظات ما قبل اعتماد الرواتب — سبع فحوص قراءة فقط قبل «مراجعة/اعتماد».
       تحتاج pages/entity.js وui.js+calc-formulas.js وpayroll-insurance.js
       وhr-department.js محمَّلة سلفاً (كلها قبلها في هذه القائمة). بعد
       sheets-templates.js عمداً — لا علاقة بينهما، الترتيب بين الاثنين لا
       يهم (وحدتان مختلفتان)، لكن يجب أن تأتي بعد employee-statement.js حتى
       يبقى ترتيب اللفّ على EntityPage.openDetail ثابتاً ومتوقَّعاً.
       Payroll pre-approval notes — seven read-only checks before
       "review/approve". Needs pages/entity.js, ui.js+calc-formulas.js,
       payroll-insurance.js and hr-department.js already loaded (all earlier
       in this list). Deliberately after sheets-templates.js — unrelated to
       it, the order between the two does not matter (different modules) —
       but must come after employee-statement.js so the EntityPage.openDetail
       wrap order stays deterministic. */
    'assets/js/payroll-review-flags.js',

    /* ═══ قراءة الملفات المرفقة · READING ATTACHED FILES ═══
       الترتيب مقصود: arabic-text.js أولاً لأن قارئ PDF ينادي عليه لإصلاح
       الحروف العربية. القرّاء الثلاثة مستقلّون تماماً — حذف أيٍّ منهم يُلغي
       صيغته وحدها ولا يكسر شيئاً آخر. وattachment-reader.js آخرهم لأنه
       يبحث عنهم وقت الضغط على الزر، ويلفّ EntityPage.openDetail كما يفعل
       attachments.js تماماً — فيأتي بعده.
       ⚠️ لا يوجد ملف vendor في هذه القائمة عمداً: مكتبات القراءة تُنزَّل
       عند أول استعمال فقط، فلا يدفع مهندس الموقع ثمنها وهو يفتح شاشة أخرى.

       Order is deliberate: arabic-text.js first, because the PDF reader
       calls it to put Arabic letters back in order. The three readers are
       fully independent — deleting any one removes only its format.
       attachment-reader.js is last because it looks them up at click time
       and wraps EntityPage.openDetail the same way attachments.js does.
       ⚠️ No vendor file is in this list on purpose: the reading libraries
       download on first use only, so a site engineer never pays for them
       while opening an unrelated screen. */
    'assets/js/arabic-text.js',
    'assets/js/read-docx.js',
    'assets/js/read-pdf.js',
    'assets/js/read-dwg.js',
    'assets/js/attachment-reader.js',
    /* قراءة النص المطبوع من صور PDF الممسوحة ضوئياً والصور المرفقة —
       تجريبي ومجاني بالكامل. بعد attachment-reader.js حتماً: يلفّ
       ReadPdf.read العامة التي يناديها ذلك الملف، ويحتاج EntityPage
       موجوداً (v2.0.18). لا مكتبة vendor في هذه القائمة عمداً — تُنزَّل
       عند أول ضغطة فقط، بنفس سياسة القرّاء الثلاثة أعلاه.
       Reading printed text out of scanned PDF pages and photo
       attachments — experimental and entirely free. Necessarily after
       attachment-reader.js: it wraps the global ReadPdf.read that file
       calls, and needs EntityPage to exist (v2.0.18). No vendor library
       is in this list on purpose — it downloads on first press only,
       same policy as the three readers above. */
    'assets/js/read-ocr.js',
    /* زر «📷 صوّر ورقة» بجانب «＋ إضافة ملف» — بعد attachments.js وpages/entity.js
       حتماً: لا يلفّ شيئاً في attachments.js بل ينتظر اللوحة التي ترسمها هي.
       The «📷 Photograph a page» button beside «＋ Add file» — necessarily after
       attachments.js and pages/entity.js: it wraps nothing inside attachments.js,
       it waits for the panel attachments.js itself renders. (v2.0.26) */
    'assets/js/camera-capture.js',
    'assets/js/import.js',
    /* استيراد PDF ووورد وأوتوكاد من نفس زر «استيراد» — بعد import.js حتماً،
       لأنه يعيد ربط الزر الذي يُنشئه import.js نفسه، لا يستبدل دالته.
       PDF/Word/AutoCAD import from the same Import button — necessarily
       after import.js, because it rebinds the button import.js itself
       creates, rather than replacing its function. */
    'assets/js/import-documents.js',
    /* ذاكرة الربط، عيّنات إضافية، تحذير الحقول المطلوبة وعلامات الثقة —
       بعد الملفّين معاً حتماً، لأنها تلفّ DataImport.preview وتقرأ نافذة
       الربط اليدوي التي قد يفتحها أيّ منهما.
       Mapping memory, extra samples, required-field warning and confidence
       markers — necessarily after both files, because it wraps
       DataImport.preview and reads the manual mapping dialog either can open. */
    'assets/js/import-mapping-plus.js',
    /* الصف الأول لا يضيع بعد الآن إن كان بيانات رقمية لا عناوين أعمدة —
       يلفّ DataImport.preview فوق كل ما سبق، بعد import-mapping-plus.js
       حتماً ليصبح لفّنا الأخارجي ويستدعي كل الإضافات السابقة كما هي.
       The first row no longer disappears when it is numeric data, not
       column headers — wraps DataImport.preview on top of everything
       above, necessarily after import-mapping-plus.js so our wrap is the
       outermost and still calls every earlier addition unchanged. */
    'assets/js/import-headerless.js',
    'assets/js/app.js',
    /* آخر ملف: يلفّ Store بعد أن يكتمل كل شيء */
    'assets/js/save-guard.js',
    'assets/js/access-check.js',
    /* يملأ قوائم الاختيار لصلاحية lookup — بعد auth.js وstore.js وschema.js
       حتماً، وبعد save-guard.js/access-check.js لأنهما يثبتان أن Store
       متصل بدور موثوق قبل أن نقرأ صلاحياته */
    'assets/js/lookup-loader.js',
    /* يصحّح قائمة اختيار «الموقع» (تسريب سوهاج للروبيكي) ويحل عطلاً كامناً
       في اطّلاع القرين/المكتب — يجب أن يأتي مباشرة بعد lookup-loader.js
       ليُثبَّت تغليفه لـ Store.all/Store.find فوق تغليف lookup-loader نفسه.
       Fixes the "site" dropdown leak (Sohag reaching Elrobaki) and a latent
       Elqurien/HQ visibility bug — must load directly after lookup-loader.js
       so its Store.all/Store.find wrap installs outermost, above
       lookup-loader's own wrap. */
    'assets/js/site-options.js',
    /* يملأ اسم «قام بإنشائه» لدور خارج الخمسة التي يجلب لها store.js:62
       جدول users كاملاً — بعد site-options.js مباشرة: كلاهما يلفّ
       Store.find، لكن على جدولين مختلفين تماماً (sites/users) فلا تصادم
       (v2.0.19).
       Fills in the creator's display name for a role outside the five
       store.js:62 fetches the full users table for — right after
       site-options.js: both wrap Store.find, but on entirely different
       tables (sites/users), so no collision (v2.0.19). */
    'assets/js/creator-name-fill.js',
    /* يحوّل الحذف إلى إلغاء موثّق ويسجّل كل تغيير على الخادم */
    'assets/js/audit-trail.js',
    /* أرقام المستندات الحقيقية لكل الأقسام — آخر ملف يلفّ Store.create،
       بعد audit-trail.js حتماً، ويحتاج Auth.client() ليسأل الخادم عن
       الرقم الذي أصدره فعلاً.
       Real document numbers for every department — the last file to wrap
       Store.create, necessarily after audit-trail.js, and it needs
       Auth.client() to ask the server what number it issued. */
    'assets/js/doc-numbering.js',
    /* «عدد الموظفين» كان دائماً فارغاً: schema.js:1050 يعرّفه readonly ولا
       شيء يكتبه. هذا الملف يحسبه من بنود المسير الحقيقية عند كل إنشاء/حفظ
       (يستبعد السطر الفارغ)، بلفّ Store.create/Store.save — بعد
       doc-numbering.js مباشرة ليكون اللفّ الأخير.
       «عدد الموظفين» was always blank: schema.js:1050 defines it readonly
       and nothing ever wrote it. This computes it from the real payroll
       lines on every create/save (blank filler line excluded) by wrapping
       Store.create/Store.save — directly after doc-numbering.js so it is
       the outermost wrap. (v2.0.26) */
    'assets/js/employee-count-fill.js',
    /* تاريخ الأسعار وأرخص مورد لكل صنف — يلفّ EntityPage.openDetail ولا
       يعمل إلا على شاشة الأصناف. يقرأ إذون الاستلام المعتمدة عبر
       Auth.canSee/Auth.scopeRows بنفس الطريقة تماماً التي تستعملها شاشة
       إذون الاستلام نفسها، فلا يستطيع إظهار أكثر ممّا يراه الموظف أصلاً.
       أي موضع بعد pages/entity.js (سطر ٢٢٥) يعمل؛ وُضع هنا بجوار أحدث
       دفعة حتى لا يُفصل تعليق قائم عن ملفه.
       Purchase price history and cheapest supplier per item — wraps
       EntityPage.openDetail, active only on the Items screen. Reads
       approved goods receipts through Auth.canSee/Auth.scopeRows exactly
       as the Goods Receipts screen itself does, so it can never show more
       than that person could already see. Any position after
       pages/entity.js (line 225) works; placed here beside the most
       recent batch so no existing comment is split from its file.
       (v2.0.27) */
    'assets/js/purchase-price-history.js',
    /* يخفي زر التقارير عمّن لا تقارير له — الحماية نفسها داخل pages/reports.js */
    'assets/js/report-access.js',
    /* تقويم النقدية لاثني عشر أسبوعاً داخل صفحة التقارير — يلفّ
       ReportsPage.render (بعد pages/reports.js) ويستعمل
       RoleView.seesCompanyMoney (بعد roleview.js) وأسلوب مراقبة الـ DOM
       نفسه الذي يثبته report-access.js:56-62 (بعده مباشرة، آخر الثلاثة
       في ترتيب التحميل). Twelve-week cash calendar inside the Reports
       page — wraps ReportsPage.render (after pages/reports.js), uses
       RoleView.seesCompanyMoney (after roleview.js), and the exact
       DOM-watching technique report-access.js:56-62 already proves
       (loaded right after it, the last of the three in load order). */
    'assets/js/cash-forecast.js',
    /* سجل مستخلصات الهيئة — تبويب «مستخلصات الهيئة» بجوار «توقعات
       النقدية» داخل التقارير. بعد cash-forecast.js حتماً (يحتاج نفس
       pages/reports.js وroleview.js وreport-access.js)؛ الترتيب بين
       الاثنين لا يهمّ لأن كل ملف يراقب الـDOM بمراقبه المستقل (v2.0.18).
       The Authority-IPC register — an "Authority IPCs" tab beside "Cash
       forecast" inside Reports. Necessarily after cash-forecast.js
       (needs the same pages/reports.js, roleview.js, report-access.js);
       the order between the two does not matter since each watches the
       DOM with its own independent observer (v2.0.18). */
    'assets/js/authority-ipc-register.js',
    /* عدّاد التشغيل: بطاقة اللوحة + تبويب «عدّاد التشغيل» في التقارير —
       يحتاج بالضبط ما يسبقه: DashboardView (pages/dashboard-render.js)
       وReportsPage (pages/reports.js)، وكلاهما محمَّل قبله بالفعل.
       The rollout meter: a dashboard card + a "Rollout meter" Reports tab
       — needs exactly what already precedes it: DashboardView and
       ReportsPage, both already loaded by this point. */
    'assets/js/rollout-meter.js',
    /* يوصّل أحداث الأمان (تصدير · كلمات مرور · بيانات الشركة) للسجل الدائم
       — بعد audit-trail.js حتماً لأنه يحتاج AuditTrail.write */
    'assets/js/audit-security-events.js',
    /* هاتف المهندس بالموقع: تكبير مساحات اللمس، شريط حالة اتصال ثابت أعلى
       الشاشة، وترتيب أزرار «إجراءات سريعة» بحيث تتصدّرها شاشات الموقع —
       بعد dashboard-render.js حتماً لأنه يستبدل PANELS.quickActions.
       The site engineer's phone: bigger touch targets, a fixed connectivity
       strip, and Quick Actions reordered so site screens lead — necessarily
       after dashboard-render.js because it replaces PANELS.quickActions. */
    'assets/js/mobile-field.js',
    /* سجل تأخير المستندات — صفحة «سجل التأخيرات» داخل قائمة أ. أحمد
       الجانبية (ضبط المستندات)، تلخّص طلبات المعلومات والاعتمادات
       والمراسلات ومذكرات الإرسال المتأخرة. وُضع هنا لأنه يلفّ
       EntityPage.render (محمَّل من pages/entity.js سطر ٢٢٥) ويستعمل
       Auth.scopeRows (auth.js وsites.js)، وكلها فوقه بكثير. لا علاقة
       وظيفية بـ mobile-field.js — فقط مكان ثابت لا ينازعه أحد.
       🔴 لماذا صفحة في قائمته لا تبويب في التقارير: أ. أحمد لا يستطيع فتح
       صفحة التقارير إطلاقاً (reports.js:53-79 وreport-access.js:41-53
       يحذفان الزر من قائمته)، فتبويب هناك كان ليكون خفيّاً عن الشخص
       الوحيد المقصود به.
       Document-delay register — a «سجل التأخيرات» page inside Ahmed's own
       side menu (Document Control), summarising overdue RFIs, submittals,
       correspondence and transmittals. Placed here because it wraps
       EntityPage.render (pages/entity.js line 225) and uses
       Auth.scopeRows (auth.js, sites.js) — all far above. No functional
       link to mobile-field.js, simply an uncontested fixed spot.
       🔴 Why a page in HIS menu and not a Reports tab: Ahmed cannot open
       the Reports page at all (reports.js:53-79 and report-access.js:41-53
       delete the button from his menu), so a tab there would have been
       invisible to the only person it is for. (v2.0.27) */
    'assets/js/doc-delay-register.js',
    /* تحذير فقط — «السنة بعيدة عن اليوم؟» على أي حقل تاريخ في #entForm.
       لا يلمس الحفظ ولا Rules إطلاقاً (انظر تعليق الملف عن سبب ذلك
       تحديداً). قبل version-badge.js عمداً — لا علاقة وظيفية، فقط لضمان
       مكان ثابت قرب نهاية القائمة.
       Warn-only — "That year is far from today?" on any date field in
       #entForm. Never touches saving or Rules at all (see the file's own
       comment for exactly why). Deliberately before version-badge.js —
       no functional link, just a fixed place near the end of the list. */
    'assets/js/date-sanity.js',
    /* سلوك الشاشات — سؤال قبل ضياع نموذج، القفز لأول خانة حمراء، طيّ
       الصفوف الفارغة، أزرار الصف مثبّتة على الهاتف. موضعه هنا مقصود
       بثلاثة قيود: بعد audit-trail.js (آخر من يلفّ openDetail، فيجري
       الطيّ على الجسم المكتمل)، وبعد mobile-field.js (وسم <style>
       المحقون هنا يجب أن يتأخر عنه ليفوز بترتيب التتالي)، وقبل
       version-badge.js الموثَّق أنه الأخير عمداً. أما موضعه في سلسلة
       لفافات UI.modal فغير مهم عمداً — يقرأ opts.buttons بعد النداء لا
       قبله، فسلوكه واحد داخلياً كان أم خارجياً.
       Screen behaviour — ask before losing a typed form, jump to the
       first red box, fold empty rows, pinned row buttons on phones.
       This slot is deliberate on three constraints: after audit-trail.js
       (the last openDetail wrapper, so the fold runs on the finished
       body), after mobile-field.js (our injected <style> must follow its
       to win the cascade), and before version-badge.js which is
       documented as deliberately last. Its position in the UI.modal
       wrapper chain is deliberately irrelevant — it reads opts.buttons
       AFTER calling through, so it behaves identically inner or outer. */
    'assets/js/screen-behaviour.js',
    /* الاسم الحقيقي بدل رقم قاعدة البيانات الخام على الإرساليات والبحث
       والفرز وملف CSV — يلفّ Schema.refLabel عبر Schema.get المصدَّرة وقت
       النداء، فترتيبه بين الملفات المسجِّلة للشاشات غير مهم عمداً.
       The real name instead of the raw database id on transmittals,
       search, sort and CSV — wraps Schema.refLabel via the EXPORTED
       Schema.get at call time, so its order among the screen-registrar
       files is deliberately irrelevant. */
    'assets/js/ref-label-resolve.js',
    /* ── جديد في v2.0.23 · NEW in v2.0.23 ──────────────────────────────
       سياج الرتب لإدارة الحسابات المفوّضة. موضعه هنا مقصود: بعد auth.js
       (يلفّ Auth.adminUsers وAuth.users)، وبعد أي ملف يعدّل Auth.ROLES —
       فهو يقرأ الأدوار وقت النداء لا وقت التحميل، لكن ترتيبه بعد
       robot-role.js يجعل القائمة مكتملة عند أول رسم. وقبل version-badge.js
       الموثَّق أنه الأخير عمداً.
       The rank fence for delegated account management. This slot is
       deliberate: after auth.js (it wraps Auth.adminUsers and Auth.users),
       and after anything that mutates Auth.ROLES — it reads roles at call
       time, not load time, but sitting after robot-role.js means the list
       is complete at first render. Before version-badge.js, which is
       documented as deliberately last. */
    'assets/js/account-fence.js',
    /* صفحات نشاط المواقع + تبويبات المواقع على شاشات القوائم. بعد
       account-fence.js حتماً (يستعمل AccountFence لصفوف الحسابات)، وبعد
       audit-trail.js حتماً لأن كليهما يلفّ Auth.scopeRows وترتيب المرشّحات
       النقية بينهما آمن ومقصود، وبعد schema.js لأنه يسجّل شاشة جديدة.
       Site activity pages + the site tabs on list screens. Necessarily
       after account-fence.js (it uses AccountFence for account rows) and
       after audit-trail.js — both wrap Auth.scopeRows, and the order
       between pure filters is safe and deliberate — and after schema.js
       because it registers a new screen. */
    'assets/js/site-activity.js',
    /* الاسم الثامن للسند يتفق مع اسم المورد المختار — يلفّ UI.modal، فيصح
       في أي مكان بعد ui.js؛ هذا الموضع المتأخر متعمَّد فقط لإبقاء
       version-badge.js آخر الملفات كما هو موثَّق دائماً.
       The voucher's beneficiary name agrees with the chosen supplier —
       wraps UI.modal, so it is correct anywhere after ui.js; this late
       slot is deliberate only to keep version-badge.js last, as always
       documented. */
    'assets/js/beneficiary-fill.js',
    /* المرفقات من داخل نموذج التعديل — «تعديل ← مرفقات» لم يكن مساراً
       معطّلاً بل مساراً لم يُبنَ قط (أبلغ عنه المالك ٣٠ أغسطس ٢٠٢٦).
       اللافّة التاسعة لـUI.modal، وهي الأبعد في السلسلة. لكن موضعها بين
       اللوافّ **لا يقرّر** هل تعمل: نحقن بعد عودة النداء لا عبر opts.onOpen،
       لأن ملفات أخرى في السلسلة تستبدل onOpen. يحتاج attachments.js
       (ينادي panelHTML/wirePanel المُصدَّرتين) وentity.js (يقرأ
       data-record-id) — وكلاهما فوقه بكثير.
       Attachments from inside the edit form — «تعديل ← مرفقات» was not a
       broken path but a path never built (owner-reported 30 Aug 2026).
       The 9th UI.modal wrapper, outermost in the chain. But its position
       among the wrappers does NOT decide whether it works: we inject after
       the call returns, never via opts.onOpen, because other files in the
       chain replace onOpen. Needs attachments.js (it CALLS the exported
       panelHTML/wirePanel) and entity.js (it reads data-record-id) — both
       far above. (v2.0.28) */
    'assets/js/attach-from-form.js',
    /* رقم النسخة في تذييل الصفحة من الذاكرة الفعلية — آخر ملف عمداً،
       فحص رفعة محمد زيدان */
    /* 🔴 طيّ أقسام النماذج — يجب أن يأتي بعد screen-behaviour.js
       وmobile-field.js، لأنه يحقن <style> خاصاً به ويفوز بالتتابع بكونه
       الأحدث في الرأس فقط — بلا !important وبلا لمس styles.css. وقبل
       version-badge.js لأن ذاك موثّق أنه الأخير عمداً.
       موضعه في سلسلة لوافّ UI.modal غير مهمّ إطلاقاً وهذا مقصود: لا يقرأ
       opts ولا يستبدل onOpen، بل يبني بعد عودة النداء.
       🔴 Form-section folding — must come AFTER screen-behaviour.js and
       mobile-field.js, because it injects its own <style> and wins the
       cascade purely by being later in the head — no !important, no edit to
       styles.css. And BEFORE version-badge.js, which is documented as
       deliberately last. Its position in the UI.modal wrapper chain is
       deliberately irrelevant: it reads no opts and replaces no onOpen, it
       builds after the call returns.
       Proven by running TESTS/form-sections-trial.js. (v2.0.29) */
    /* 🔴 منتقي البحث في القوائم المرتبطة — **ميزة خصوصية قبل أن تكون
       راحة**. يجب أن يأتي بعد ref-dropdown-scope.js حتماً: لافّتنا تصير
       الخارجية، فيكون سياجه قد ضبط حالته حين نبني، وننادي applyFence()
       تزامنياً قبل قراءة أي خيار. ref-dropdown-scope يجدول القصّ على
       [0,60,300,900]ms، فالخيارات الخام موجودة لحظةً — ومنتقٍ يُبنى فيها
       يلتقط القائمة كاملة ويحتفظ بها، والقائمة الأصلية تُقصّ بعده وتُخفى
       فلا يظهر أثر للخطأ. ولو غاب ذلك الملف لا نبني شيئاً إطلاقاً.
       🔴 Searchable reference picker — a PRIVACY feature before it is a
       convenience. Necessarily AFTER ref-dropdown-scope.js: our wrapper is
       then the OUTER one, so its fence has already set its state when we
       build, and we call applyFence() synchronously before reading any
       option. It schedules pruning at [0,60,300,900]ms, so raw options
       exist for a moment — a picker built in that window captures the FULL
       list and keeps it, while the native select is pruned and hidden
       afterwards, leaving no visible trace of the mistake. If that file is
       absent we build nothing at all.
       Proven by running TESTS/ref-search-picker-trial.js — section D
       removes the fence call and BOTH forbidden names appear. (v2.0.29) */
    /* «كرّر كشف أمس» — زرّ في شريط الصفحة، لا في الصفّ، ولسببين مستقلين:
       (١) الغرض كله ألّا يبحث المهندس عن صفّ أمس، وزرّ الصفّ يفترض أنه
       وجده — وentity.js:91 فيه زرّ نسخ لكل صفّ أصلاً؛ (٢) قيد العرض من
       v2.0.21: نصّ «كرّر» في أزرار الصفّ وسّع dailyLabour ٤٣٣←٤٥١ بكسل ومعه
       الجدول. شريط .page-actions يتجنّب المشكلة بدل أن يخفّفها — عمود
       الإجراءات لا يُمسّ. يلفّ EntityPage.render، فيحتاج pages/entity.js
       قبله. لا يحفظ شيئاً: يفتح النموذج فقط.
       "Repeat yesterday" — a PAGE-bar button, never a row button, for two
       independent reasons: (1) the point is not having to find yesterday's
       row, and entity.js:91 already puts a copy button on every row;
       (2) the v2.0.21 width constraint — the text «كرّر» in row buttons
       widened dailyLabour 433→451px and the table with it. The
       .page-actions bar avoids the problem rather than easing it: the
       actions column is never touched. Wraps EntityPage.render, so it needs
       pages/entity.js above it. It saves nothing — it only opens the form.
       Proven by running TESTS/repeat-yesterday-trial.js. (v2.0.29) */
    'assets/js/repeat-yesterday.js',
    'assets/js/ref-search-picker.js',
    'assets/js/form-sections.js',
    'assets/js/version-badge.js'
  ];
  var NEEDED = [
    ['ALZAHRAA_CONFIG','assets/js/config.js'],
    ['OfflineDB','assets/js/offline-db.js'],
    ['I18N','assets/js/i18n.js'],
    ['Store','assets/js/store.js'],
    ['Schema','assets/js/schema.js'],
    ['Auth','assets/js/auth.js'],
    ['PayrollInsurance','assets/js/payroll-insurance.js'],
    ['Workflow','assets/js/workflow.js'],
    ['UI','assets/js/ui.js'],
    ['Dashboard','assets/js/pages/dashboard.js'],
    ['EntityPage','assets/js/pages/entity.js'],
    ['ApprovalsPage','assets/js/pages/approvals.js'],
    ['ReportsPage','assets/js/pages/reports.js'],
    ['SettingsPage','assets/js/pages/settings.js'],
    ['App','assets/js/app.js']
  ];

  window.AZ_LOAD_FAILED = [];

  function loadOne(path, done) {
    var script = document.createElement('script');
    script.src = path;
    script.async = false;
    script.onload = function () { done(); };
    script.onerror = function () { window.AZ_LOAD_FAILED.push(path); done(); };
    document.head.appendChild(script);
  }

  function showMissing() {
    var missing = window.AZ_LOAD_FAILED.slice();
    for (var i = 0; i < NEEDED.length; i++) {
      if (!window[NEEDED[i][0]] && missing.indexOf(NEEDED[i][1]) === -1) missing.push(NEEDED[i][1]);
    }
    /* departments.js is checked separately: it has no global of its own,
       it proves it ran by registering the new screens on Schema. */
    if (window.Schema && !window.Schema.DEPARTMENT_MODULES &&
        missing.indexOf('assets/js/departments.js') === -1) {
      missing.push('assets/js/departments.js');
    }
    try {
      var probe = getComputedStyle(document.documentElement).getPropertyValue('--green-800');
      if (!probe || !probe.trim()) missing.push('assets/css/styles.css');
    } catch (e) { missing.push('assets/css/styles.css'); }
    if (!missing.length) return;

    var card = document.querySelector('.login-card') || document.body;
    card.setAttribute('style', 'background:#fff;color:#12211c;max-width:640px;margin:40px auto;padding:28px;border-radius:14px;font-family:Tahoma,Arial,sans-serif;line-height:1.9;box-shadow:0 10px 40px rgba(0,0,0,.3);position:relative;z-index:99');
    var items = missing.map(function (path) {
      return '<li style="font-family:monospace;direction:ltr;text-align:left;background:#fdeceb;color:#b42318;padding:4px 8px;border-radius:5px;margin:5px 0;display:block">' + path.replace(/[&<>"']/g, '') + '</li>';
    }).join('');
    card.innerHTML = '<h2 style="color:#b42318;margin:0 0 6px">⚠️ الموقع ناقص ملفات · Missing files</h2>' +
      '<p>أعد رفع المجلدات مع الحفاظ على ترتيبها، ثم حدّث الصفحة. Re-upload the folders without flattening them, then hard-refresh.</p>' +
      '<ul style="padding:0;margin:0;list-style:none">' + items + '</ul>';
  }

  var index = 0;
  (function next() {
    if (index >= FILES.length) {
      window.AZ_LOAD_DONE = true;
      setTimeout(showMissing, 80);
      return;
    }
    loadOne(FILES[index++], next);
  })();
})();
