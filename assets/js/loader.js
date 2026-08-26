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
    'assets/js/schema.js',
    /* يضيف حقل تاريخ الإفراج عن الاحتجاز — يجب أن يسبق agents.js */
    'assets/js/retention-release-field.js',
    /* يضيف خصم وتحصيل الضريبة على مستخلصات العميل — بعد retention-release-field.js مباشرة */
    'assets/js/client-ipc-withholding.js',
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
    'assets/js/auth.js',
    'assets/js/identity.js',
    'assets/js/workflow.js',
    'assets/js/workflow-policy.js',
    /* يفكّ عَلَق مستندات التوقيع الواحد — بعد workflow-policy.js حتماً */
    'assets/js/one-step-approval.js',
    'assets/js/ui.js',
    /* يجعل الصيغ المكتوبة كدوالّ تُحسب فعلاً — ثمانية حقول في الموارد
       البشرية كانت تعرض صفراً. بعد ui.js حتماً وقبل pages/entity.js.
       Makes function-style formulas actually compute — eight HR fields were
       reading zero. After ui.js, and before pages/entity.js. */
    'assets/js/calc-formulas.js',
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
    'assets/js/dc-alerts.js',
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
    'assets/js/save-modes.js',
    'assets/js/attachments.js',
    /* كشف حساب الموظف — يلفّ EntityPage.openDetail مثل attachments.js
       تماماً، فيأتي بعده ليظهر الكشف تحت المرفقات لا فوقها.
       The employee statement wraps EntityPage.openDetail exactly as
       attachments.js does, so it comes after it and lands below it. */
    'assets/js/employee-statement.js',

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
    'assets/js/import.js',
    /* استيراد PDF ووورد وأوتوكاد من نفس زر «استيراد» — بعد import.js حتماً،
       لأنه يعيد ربط الزر الذي يُنشئه import.js نفسه، لا يستبدل دالته.
       PDF/Word/AutoCAD import from the same Import button — necessarily
       after import.js, because it rebinds the button import.js itself
       creates, rather than replacing its function. */
    'assets/js/import-documents.js',
    'assets/js/app.js',
    /* آخر ملف: يلفّ Store بعد أن يكتمل كل شيء */
    'assets/js/save-guard.js',
    'assets/js/access-check.js',
    /* يملأ قوائم الاختيار لصلاحية lookup — بعد auth.js وstore.js وschema.js
       حتماً، وبعد save-guard.js/access-check.js لأنهما يثبتان أن Store
       متصل بدور موثوق قبل أن نقرأ صلاحياته */
    'assets/js/lookup-loader.js',
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
    /* يوصّل أحداث الأمان (تصدير · كلمات مرور · بيانات الشركة) للسجل الدائم
       — بعد audit-trail.js حتماً لأنه يحتاج AuditTrail.write */
    'assets/js/audit-security-events.js',
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
