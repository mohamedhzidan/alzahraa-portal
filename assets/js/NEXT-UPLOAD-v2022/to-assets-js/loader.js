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
       على dailyLabour) وUI.displayValue (اللفافة الثالثة، بعد الاثنتين
       أعلاه ليكون الأخارجي). بعد hr-department.js (٤٥) حتماً.
       Compulsory national ID per worker on the daily-labour sheet, and
       last-4 display in lists/print — needs Schema (to install
       lines.validate on dailyLabour) and UI.displayValue (the third
       wrapper, after the two above so it is outermost). Necessarily after
       hr-department.js (45). */
    'assets/js/daily-labour-id.js',
    'assets/js/rules.js',
    'assets/js/print.js',
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
    'assets/js/save-modes.js',
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
    /* رقم النسخة في تذييل الصفحة من الذاكرة الفعلية — آخر ملف عمداً،
       فحص رفعة محمد زيدان */
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
