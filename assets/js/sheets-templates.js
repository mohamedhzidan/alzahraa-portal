/* =========================================================================
   sheets-templates.js — ثلاث شاشات مطلوبة من المكتب الفني: شيت مناسيب،
   طلب خرسانة جاهزة، إذن فحص مواد داخلي.
   Three technical-office screens: levels sheet, ready-mix concrete
   request, internal material inspection permit.
   -------------------------------------------------------------------------
   إضافي بالكامل. يسجّل ثلاث وحدات جديدة بنفس أسلوب hr-department.js
   (departments.js:43 / hr-department.js:440-455): S.MODULES.push بحارس
   ضد التكرار، ثم يلفّ S.get/S.field لأن خريطة byId داخل schema.js
   (schema.js:1234-1235) تُبنى مرة واحدة عند تحميل الملف ولا تُعاد بناؤها
   — أي وحدة تُضاف بعد ذلك عبر S.MODULES.push وحدها تبقى غير قابلة للعثور
   عليها بـ Schema.get() بدون هذا اللف. هذا بالضبط ما يمنعه هذا التكرار.

   Fully additive. Registers three new modules the same way
   hr-department.js does: S.MODULES.push guarded against double-loading,
   then wraps S.get/S.field because schema.js's byId lookup map is built
   once when schema.js runs and never rebuilt — any module pushed onto
   S.MODULES afterwards would be invisible to Schema.get() without this
   wrap. That is exactly the bug this repeats-a-known-pattern file avoids.

   احذف هذا الملف فتختفي الشاشات الثلاث تماماً ويعود كل شيء كما كان —
   لا لمسة واحدة على schema.js أو entity.js أو auth.js (صلاحياتها في
   auth.js أضيفت كأسطر منفصلة، حذفها لا يكسر شيئاً آخر).
   Delete this file and the three screens vanish completely, with
   everything else exactly as it was — schema.js and entity.js are
   untouched; the auth.js lines are separate additions of their own.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('sheets-templates.js needs schema.js first'); return; }
  var S = global.Schema;
  if (S.__sheetsTemplatesInstalled) return;   /* تحميل مزدوج آمن · double-load safe */
  S.__sheetsTemplatesInstalled = true;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var SEC = {
    main:  { ar: 'البيانات الأساسية', en: 'Main information' },
    tech:  { ar: 'البيانات الفنية',   en: 'Technical data' },
    extra: { ar: 'بيانات إضافية',     en: 'Additional information' }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ١ · شيت مناسيب — levelsSheets
     -------------------------------------------------------------------
     تسجيل واقعة قياس، لا قرار ولا مال — بلا مفتاح workflow إطلاقاً وبلا
     عمود status، بنفس منطق الوحدات المُخفَّضة إلى RECORD في
     workflow-policy.js (asphaltRecords، surveyRecords وغيرها). عمود
     status في m.columns بلا حقل status حقيقي يُسقِط الشاشة على أول سجل
     (workflow-policy.js:120-134 يشرح السبب بالتفصيل) — لذلك لا يظهر هنا
     أصلاً، لا في m.fields ولا في m.columns.

     A record of a measurement — no decision, no money — carries no
     workflow key at all and no status column, the same shape as the
     screens already demoted to RECORD in workflow-policy.js. A "status"
     name in m.columns with no real status field crashes the screen on
     its first saved record; it is simply absent here, from both
     m.fields and m.columns.
     ═══════════════════════════════════════════════════════════════════ */
  var LEVELS_SHEETS = {
    id: 'levelsSheets', table: 'levelsSheets', group: 'site', icon: 'compass',
    docPrefix: 'LVL',
    label: { ar: 'شيت مناسيب', en: 'Levels sheet' },
    desc: { ar: 'قياسات مناسيب الموقع — تسجيل واقعة بلا اعتماد',
            en: 'Site level measurements — a record of fact, no approval' },
    columns: ['docNo', 'date', 'project', 'site', 'surveyor'],
    fields: [
      F('docNo', 'رقم الشيت', 'Sheet no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      F('project', 'المشروع', 'Project', 'ref',
        { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
      F('site', 'الموقع', 'Site', 'ref', { ref: 'sites', refLabel: 'name', section: SEC.main }),
      /* نص حر عمداً لا ref — المساح قد يكون مقاول باطن للمساحة، لا موظف مسجَّل */
      F('surveyor', 'اسم المساح', 'Surveyor', 'text', { section: SEC.main }),
      F('benchmark', 'نقطة الرجوع (Benchmark)', 'Benchmark', 'text', { section: SEC.tech }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ],
    lines: {
      label: { ar: 'نقاط القياس', en: 'Survey points' },
      fields: [
        F('point', 'رقم النقطة', 'Point no.', 'number', { width: '30%' }),
        F('level', 'المنسوب', 'Level', 'number', { width: '30%' }),
        F('note', 'ملاحظة', 'Note', 'text', { width: '40%' })
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · طلب خرسانة جاهزة — concreteRequests
     -------------------------------------------------------------------
     skipReview: true معلنة هنا في الوحدة نفسها لأن حلقة السياسة في
     workflow-policy.js (تعمل مرة واحدة عند تحميل الملف على وقت لقطة
     Schema.MODULES وقتها) تقرأ من جدول POLICY الداخلي فقط، ولا تعرف عن
     هذه الوحدة الجديدة شيئاً فلا تلمسها لا بالسلب ولا بالإيجاب. لكن
     الفحص الفعلي وقت العمل (Workflow.actions / Workflow.transition في
     workflow-policy.js:182-188) يستدعي Schema.get(moduleId) *ديناميكياً*
     عند كل ضغطة زر — وهو دائماً محدَّث لأننا لففناه أدناه — فتُخفى خطوة
     «المراجعة» وتُعتمد المستندات بتوقيع واحد تماماً كما تفعل mir.

     skipReview: true is declared on the module itself because
     workflow-policy.js's POLICY loop runs once, at load time, over
     whatever Schema.MODULES holds at that moment, and knows nothing
     about this brand-new module — it neither sets nor clears the flag.
     The actual runtime check (Workflow.actions / Workflow.transition in
     workflow-policy.js:182-188) calls Schema.get(moduleId) dynamically on
     every click, which is always current because we patch S.get below —
     so the review step is hidden and documents approve in one signature,
     exactly like mir.
     ═══════════════════════════════════════════════════════════════════ */
  var CONCRETE_REQUESTS = {
    id: 'concreteRequests', table: 'concreteRequests', group: 'site', icon: 'truck',
    workflow: true, skipReview: true, docPrefix: 'CR',
    label: { ar: 'طلبات الخرسانة الجاهزة', en: 'Ready-mix concrete requests' },
    desc: { ar: 'طلب صرف خرسانة جاهزة من المحطة لعنصر إنشائي محدد',
            en: 'Requesting ready-mix concrete from the plant for a specific structural element' },
    columns: ['docNo', 'date', 'project', 'site', 'element', 'totalVolume', 'status'],
    fields: [
      F('docNo', 'رقم الطلب', 'Request no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
      F('project', 'المشروع', 'Project', 'ref',
        { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
      F('site', 'الموقع', 'Site', 'ref', { ref: 'sites', refLabel: 'name', section: SEC.main }),
      F('element', 'العنصر المطلوب صبه', 'Element to be poured', 'text',
        { required: true, section: SEC.main }),
      F('pourDate', 'تاريخ الصب', 'Pour date', 'date', { section: SEC.tech }),
      F('pourTime', 'وقت الصب', 'Pour time', 'text', { section: SEC.tech, help: { ar: 'مثال 07:00', en: 'e.g. 07:00' } }),
      F('grade', 'درجة الخرسانة', 'Concrete grade', 'text',
        { section: SEC.tech, help: { ar: 'مثال: ٣٠ نيوتن', en: 'e.g. C30' } }),
      /* عمود حقيقي في قاعدة البيانات، يملؤه محرك المجاميع في entity.js:649-653
         عند كل تعديل لبنود السطور — انظر totals أدناه. مطلوب كحقل حقيقي هنا
         (لا فقط كعمود قاعدة بيانات) لسببين: يظهر كخانة للقراءة فقط أعلى
         النموذج، ويظهر في المستند المطبوع (print.js يقرأ من mod.fields
         حرفياً ولا يعرض قيمة لا تملك حقلاً معرَّفاً).
         A real database column, filled by the line-totals engine in
         entity.js:649-653 on every change to the line items — see totals
         below. Declared as a real field here (not only a database column)
         for two reasons: it shows as a read-only box at the top of the
         form, and it appears on the printed document — print.js reads
         literally from mod.fields and shows nothing for a value with no
         matching field. */
      F('totalVolume', 'إجمالي الكمية (م³)', 'Total volume (m³)', 'number', { readonly: true, section: SEC.tech }),
      F('plant', 'المحطة', 'Batching plant', 'text', { section: SEC.tech }),
      F('slump', 'الهبوط (سم)', 'Slump (cm)', 'number', { section: SEC.tech }),
      F('pourCard', 'إذن الصب المرتبط', 'Linked pour card', 'ref',
        { ref: 'pourCards', refLabel: 'docNo', section: SEC.tech }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ],
    lines: {
      label: { ar: 'بنود الخرسانة', en: 'Concrete items' },
      fields: [
        F('item', 'البند', 'Item', 'text', { width: '26%' }),
        F('grade', 'الرتبة', 'Grade', 'text', { width: '18%' }),
        F('volume', 'الكمية (م³)', 'Volume (m³)', 'number', { width: '18%' }),
        F('slump', 'الهبوط (سم)', 'Slump (cm)', 'number', { width: '18%' }),
        F('note', 'ملاحظة', 'Note', 'text', { width: '20%' })
      ],
      /* تنبيه: خانة الإجمالي أعلى النموذج (totalVolume) تعرض لقطة ثابتة من
         وقت فتح النموذج ولا تتحدّث حيّاً أثناء الكتابة في السطور — نفس ما
         يحدث لكل وحدة أخرى في هذا المشروع تضع اسم مجموع في m.fields
         (recalc في entity.js لا يحدّث DOM إلا لحقول type:'calc'، وهذا الحقل
         type:'number' عمداً كي يُطبَع). الرقم الصحيح دائماً يظهر حيّاً في
         صف المجموع أسفل جدول البنود (updateLineTotals، entity.js:766)
         ويُحفَظ صحيحاً دائماً لأن submitForm يحفظ من draft لا من الشاشة
         (entity.js:815). لم نُصلح هذا هنا لأنه يحتاج تعديل entity.js
         نفسه وهو خارج نطاق هذا الملف.
         NOTE: the total box at the top of the form shows a snapshot from
         when the form opened and does not live-update as you type in the
         lines — the same as every other module in this project that puts
         a totals target in m.fields (entity.js's recalc only refreshes
         the DOM for type:'calc' fields, and this one is deliberately
         type:'number' so it prints). The correct number always shows live
         in the totals row under the line-items table (updateLineTotals,
         entity.js:766) and is always saved correctly because submitForm
         saves from draft, not from the screen (entity.js:815). Not fixed
         here — it would need a change to entity.js itself, outside this
         file's scope. */
      totals: [
        { field: 'volume', target: 'totalVolume', label: { ar: 'إجمالي الكمية (م³)', en: 'Total volume (m³)' } }
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · إذن فحص مواد داخلي — inspectionPermits
     -------------------------------------------------------------------
     لا آلية شرط/إخفاء في entity.js (لا يوجد show/hide حسب قيمة حقل آخر)،
     فخانتا الفحص الخارجي (externalLab وexpectedCost) تظهران دائماً مع
     نص مساعد يوضّح أنهما للفحص الخارجي فقط — بدل اختراع آلية جديدة غير
     موجودة في المشروع.
     entity.js has no conditional show/hide machinery for one field based
     on another's value, so the two external-testing fields (externalLab,
     expectedCost) are always visible, with help text saying they apply
     only to external testing — rather than inventing a mechanism that
     does not exist anywhere else in this project.
     ═══════════════════════════════════════════════════════════════════ */
  /* ⚠️ لا تُضِف amountField: 'expectedCost' هنا — قرار محمد زيدان ٢٧ أغسطس ٢٠٢٦.
     التكلفة المتوقعة تقدير إعلامي فقط؛ فاتورة المعمل الفعلية تُسدَّد لاحقاً
     من المحاسبين بمستند مالي منفصل (بحسب إفادة أ. أحمد نفسه). لو صارت
     expectedCost هي «مبلغ المستند» الرسمي، تدخل حدود الاعتماد المالي في
     rules.js (validateTransition) فيتعطّل كل إذن فحص خارجي عن الاعتماد —
     ومدير المشروع والمكتب الفني (موقّعا هذه الشاشة) ليسا ضمن تلك الحدود
     أصلاً. توسيع حدود rules.js قرار سلطة مالية يخص صاحب الشركة، لا هذا
     البناء. الحقل expectedCost نفسه باقٍ في النموذج والتفاصيل والعمود في
     قاعدة البيانات — المحذوف فقط هو amountField.
     ⚠️ Do NOT add amountField: 'expectedCost' here — Mohamed Zidan's
     decision, 27 August 2026. The expected cost is an informational
     estimate only; the real lab invoice is paid later by the accountants
     through a separate financial document (per Ahmed's own answer). If
     expectedCost became the document's official "amount", it would fall
     under rules.js's money-approval limits (validateTransition) and every
     external-lab permit would be stranded — the project manager and
     technical office, who actually sign this screen, are not in those
     limits at all. Widening rules.js's limits is a money-authority
     decision for the owner, not for this build. The expectedCost field
     itself stays — in the form, the detail view and the database column;
     only the amountField key was removed. */
  var INSPECTION_PERMITS = {
    id: 'inspectionPermits', table: 'inspectionPermits', group: 'site', icon: 'clipboard',
    workflow: true, skipReview: true, docPrefix: 'IPT',
    label: { ar: 'أذون فحص المواد الداخلي', en: 'Internal material inspection permits' },
    desc: { ar: 'طلب فحص مادة داخل الموقع أو بمعمل خارجي',
            en: 'Requesting a material test on site or at an external lab' },
    columns: ['docNo', 'date', 'project', 'site', 'material', 'testScope', 'status'],
    fields: [
      F('docNo', 'رقم الإذن', 'Permit no.', 'text', { readonly: true, section: SEC.main }),
      F('date', 'التاريخ', 'Date', 'date', { required: true, section: SEC.main }),
      F('project', 'المشروع', 'Project', 'ref',
        { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
      F('site', 'الموقع', 'Site', 'ref', { ref: 'sites', refLabel: 'name', section: SEC.main }),
      F('material', 'المادة', 'Material', 'text', { required: true, section: SEC.main }),
      F('testScope', 'جهة الفحص', 'Test scope', 'select', {
        options: [
          { value: 'internal', label: { ar: 'داخلي', en: 'Internal' } },
          { value: 'external', label: { ar: 'خارجي', en: 'External' } }
        ], default: 'internal', section: SEC.tech
      }),
      F('externalLab', 'المعمل الخارجي', 'External lab', 'text',
        { section: SEC.tech, help: { ar: 'للفحص الخارجي فقط', en: 'External testing only' } }),
      F('expectedCost', 'التكلفة المتوقعة', 'Expected cost', 'money',
        { section: SEC.tech, help: { ar: 'للفحص الخارجي فقط', en: 'External testing only' } }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ],
    lines: {
      label: { ar: 'الاختبارات المطلوبة', en: 'Requested tests' },
      fields: [
        F('test', 'الاختبار', 'Test', 'text', { width: '34%' }),
        F('spec', 'المواصفة', 'Specification', 'text', { width: '33%' }),
        F('result', 'النتيجة', 'Result', 'text', { width: '33%' })
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     التسجيل — REGISTRATION
     نفس شكل hr-department.js:437-455 حرفياً.
     Registration, identical in shape to hr-department.js:437-455.
     ═══════════════════════════════════════════════════════════════════ */
  var NEW = [LEVELS_SHEETS, CONCRETE_REQUESTS, INSPECTION_PERMITS];
  var extraById = {};

  NEW.forEach(function (m) {
    if (!S.MODULES.some(function (x) { return x.id === m.id; })) S.MODULES.push(m);
    extraById[m.id] = m;
  });

  var origGet = S.get;
  S.get = function (id) { return origGet(id) || extraById[id] || null; };
  var origField = S.field;
  S.field = function (mid, fname) {
    var d = origField(mid, fname);
    if (d) return d;
    var m = extraById[mid];
    if (!m) return null;
    for (var i = 0; i < m.fields.length; i++) if (m.fields[i].name === fname) return m.fields[i];
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════════
     تواقيع الطباعة — PRINT SIGNATURES (print.js:19-102, نفس شكل _default)
     ═══════════════════════════════════════════════════════════════════ */
  if (global.Print && global.Print.SIGNATURES) {
    global.Print.SIGNATURES.concreteRequests = [
      { ar: 'التنفيذ', en: 'Site execution' },
      { ar: 'المكتب الفني', en: 'Technical office' },
      { ar: 'الجودة', en: 'Quality' },
      { ar: 'محطة الخرسانة', en: 'Batching plant' },
      { ar: 'مدير المشروع', en: 'Project manager' }
    ];
    global.Print.SIGNATURES.inspectionPermits = [
      { ar: 'أعدّه', en: 'Prepared by' },
      { ar: 'المكتب الفني', en: 'Technical office' },
      { ar: 'الجودة', en: 'Quality' },
      { ar: 'المحاسب (للفحص الخارجي)', en: 'Accountant (external testing only)' }
    ];
    global.Print.SIGNATURES.levelsSheets = [
      { ar: 'المساح', en: 'Surveyor' },
      { ar: 'راجعه', en: 'Reviewed by' }
    ];
  }

  /* ═══════════════════════════════════════════════════════════════════
     الاستيراد داخل بنود الشاشة — IMPORT INTO LINES
     -------------------------------------------------------------------
     نلفّ EntityPage.openForm بدل مراقبة #content: النماذج تُفتَح داخل
     #modalHost وتظهر بعد استدعاء الدالة مباشرة، فمراقبة DOM لا تراها.
     (save-modes.js يثبت هذا الأسلوب بالفعل).

     We wrap EntityPage.openForm instead of watching #content: forms open
     inside #modalHost right after the function is called, so watching the
     DOM would miss them — save-modes.js already proves this approach.
     ═══════════════════════════════════════════════════════════════════ */
  var IMPORTABLE = { levelsSheets: 1, concreteRequests: 1, inspectionPermits: 1 };

  function installImport() {
    if (!global.EntityPage || EntityPage.__sheetsImportInstalled) return;
    var origOpenForm = EntityPage.openForm;
    if (typeof origOpenForm !== 'function') return;

    EntityPage.openForm = function (moduleId, id, presetData) {
      origOpenForm.apply(EntityPage, arguments);
      /* زر الاستيراد على نموذج «جديد» فقط — openForm(id) يتجاهل presetData
         أصلاً (pages/entity.js:483-486)، فلا معنى لاستيراد فوق سجل قائم.
         Import button on the CREATE form only — openForm(id) ignores
         presetData entirely (pages/entity.js:483-486), so importing onto
         an existing record makes no sense. */
      if (IMPORTABLE[moduleId] && !id) {
        setTimeout(function () { injectImportButton(moduleId); }, 120);
      }
    };
    EntityPage.__sheetsImportInstalled = true;
  }

  function injectImportButton(moduleId) {
    var addBtn = document.getElementById('addLine');
    if (!addBtn || document.getElementById('azSheetImportBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'azSheetImportBtn';
    btn.className = 'btn btn-outline btn-sm';
    btn.style.marginInlineStart = '8px';
    btn.innerHTML = (global.UI ? UI.icon('file', 14) : '') + ' ' +
      esc(L({ ar: 'استيراد الصفوف من ملف', en: 'Import rows from file' }));
    addBtn.parentNode.insertBefore(btn, addBtn.nextSibling);
    btn.onclick = function () { startImport(moduleId); };
  }

  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }

  function startImport(moduleId) {
    if (!global.DataImport) {
      toast(L({ ar: 'وحدة الاستيراد غير محمَّلة — أعد تحميل الصفحة وحاول مجدداً',
                en: 'The import module is not loaded — reload the page and try again' }), 'error');
      return;
    }
    var mod = S.get(moduleId);
    if (!mod || !mod.lines) return;

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.csv';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      readRows(file).then(function (rows) {
        if (!rows || !rows.length) {
          toast(L({ ar: 'الملف فارغ أو غير مقروء', en: 'The file is empty or unreadable' }), 'error');
          return;
        }
        var dataRows = looksHeaderless(rows, mod.lines.fields) ? rows : rows.slice(1);
        if (!dataRows.length) {
          toast(L({ ar: 'لا توجد صفوف بيانات لاستيرادها', en: 'No data rows to import' }), 'error');
          return;
        }
        var mappedRows = dataRows.map(function (r) { return buildLineRow(mod, r); });
        /* نلتقط قيم الترويسة المكتوبة الآن — قبل فتح نافذة المعاينة، لأن
           UI.modal تعيد استخدام نفس عنصري #modalHost/#modalBody، فتفتح
           نافذة المعاينة فوق النموذج الحالي وتمحو #entForm من الصفحة قبل
           أن يضغط المستخدم «استيراد». لو أُجِّل الالتقاط لوقت الضغط، لن
           يبقى #entForm موجوداً لقراءته.
           Captured NOW, before opening the preview dialog: UI.modal reuses
           the same #modalHost/#modalBody elements, so opening the preview
           erases #entForm from the page before the user clicks Import.
           Deferring capture to click time would find no #entForm left. */
        var headerPreset = harvestHeader(mod);
        showPreview(mod, mappedRows, headerPreset);
      }).catch(function (e) {
        console.error('[sheets-templates] import failed', e);
        toast(L({ ar: 'تعذّرت قراءة الملف' + (e && e.message ? ': ' + e.message : ''),
                  en: 'Could not read the file' + (e && e.message ? ': ' + e.message : '') }), 'error', 6000);
      });
    };
    input.click();
  }

  function toast(msg, kind, ms) { if (global.UI && UI.toast) UI.toast(msg, kind, ms || 4500); }

  /* اكتشاف الملف بلا عناوين — إصلاح خطأ ضياع بيانات أثبته المُدقِّق:
     -------------------------------------------------------------------
     النسخة الأولى فحصت *كل* موضع بما فيها أعمدة نصية مثل «ملاحظة». في
     شيت المناسيب الحقيقي كان العمود الثالث (note) فارغاً شرعياً في أول
     صف، فرفضت الدالة اعتبار الصف الأول بيانات وحذفته كأنه عنوان — فضاع
     أول رصد فعلي (النقطة رقم ١). خلية فارغة في عمود نصي يجب ألا تُسقط
     قرار «بلا عناوين» أبداً؛ القرار يعتمد فقط على أعمدة الأرقام.
     الآن: نفحص فقط المواضع التي حقل السطر المقابل لها type:'number'
     (نقطة ومنسوب هنا، لا ملاحظة) — إن كانت كلها أرقاماً صريحة فالصف
     الأول بيانات ويُحتفَظ به؛ وإن وُجد عمود رقمي واحد غير رقمي فالصف
     الأول عناوين ويُحذف. لا عمود رقمي إطلاقاً (كما في inspectionPermits)
     → لا حكم ممكن، فالافتراض الأسلم هو وجود عناوين.

     Headerless detection — fixing a real data-loss bug the verifier
     proved: the first version checked *every* position, including text
     columns like "note". On the real levels sheet the third column
     (note) was legitimately blank on row 1, so the function refused to
     treat row 1 as data and dropped it as if it were a header — losing
     the first real survey point (point 1). A blank cell in a text column
     must never veto the "headerless" decision; the decision is based on
     the number columns alone. Now: only the positions whose matching
     line field is type:'number' are checked (point and level here, not
     note) — if every one of those parses as a number, row 1 is data and
     is kept; if even one is non-numeric, row 1 is a header and is
     dropped. With no number column at all (inspectionPermits' lines are
     all text) there is nothing to judge by, so the safer default is to
     assume a header exists. */
  function looksHeaderless(rows, lineFields) {
    var first = rows[0];
    if (!first) return false;
    var numberPositions = [];
    lineFields.forEach(function (f, i) { if (f.type === 'number') numberPositions.push(i); });
    if (!numberPositions.length) return false;
    for (var k = 0; k < numberPositions.length; k++) {
      var v = first[numberPositions[k]];
      if (v === undefined || String(v).trim() === '' || isNaN(Number(v))) return false;
    }
    return true;
  }

  /* ربط بالموضع: العمود A → أول حقل سطر، B → الثاني، وهكذا — كما طلبت الخطة.
     Position-based mapping: column A → first line field, B → second, and
     so on — as the plan specifies. */
  function buildLineRow(mod, cells) {
    var o = {};
    mod.lines.fields.forEach(function (f, i) {
      var raw = cells[i];
      if (f.type === 'number' || f.type === 'money' || f.type === 'percent') {
        o[f.name] = (raw === undefined || String(raw).trim() === '') ? 0 : (Number(raw) || 0);
      } else {
        o[f.name] = raw === undefined ? '' : String(raw).trim();
      }
    });
    return o;
  }

  function readRows(file) {
    return new Promise(function (resolve, reject) {
      var isXlsx = /\.xlsx$/i.test(file.name);
      var reader = new FileReader();
      reader.onerror = function () { reject(reader.error || new Error('read error')); };
      reader.onload = function () {
        if (isXlsx) {
          DataImport.readXLSX(reader.result).then(resolve).catch(reject);
        } else {
          try { resolve(DataImport.parseCSV(String(reader.result || ''))); }
          catch (e) { reject(e); }
        }
      };
      if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    });
  }

  /* نفس منطق readEl في pages/entity.js، مكتوب هنا من جديد لأن readEl
     مغلقة داخل تلك الوحدة ولا سبيل لاستدعائها من هنا.
     The same logic as readEl in pages/entity.js, rewritten here because
     readEl is closed inside that module with no way to call it from here. */
  function harvestHeader(mod) {
    var out = {};
    var form = document.getElementById('entForm');
    if (!form) return out;
    mod.fields.forEach(function (f) {
      var el = form.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      if (f.type === 'checkbox') { out[f.name] = el.checked; return; }
      if (f.type === 'number' || f.type === 'money' || f.type === 'percent') {
        out[f.name] = el.value === '' ? '' : Number(el.value);
        return;
      }
      out[f.name] = el.value;
    });
    return out;
  }

  function showPreview(mod, mappedRows, headerPreset) {
    var sample = mappedRows.slice(0, 3);
    var html = '<p>' + esc(L({
      ar: 'سيتم استيراد ' + mappedRows.length + ' صفاً. أول ثلاثة صفوف كمعاينة:',
      en: 'Importing ' + mappedRows.length + ' row(s). First three shown as a preview:'
    })) + '</p><table class="data-table"><thead><tr>';
    mod.lines.fields.forEach(function (f) { html += '<th>' + esc(L(f.label)) + '</th>'; });
    html += '</tr></thead><tbody>';
    sample.forEach(function (row) {
      html += '<tr>';
      mod.lines.fields.forEach(function (f) { html += '<td>' + esc(row[f.name] === undefined ? '' : row[f.name]) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';

    UI.modal({
      title: L({ ar: 'معاينة استيراد الصفوف', en: 'Row import preview' }),
      size: 'wide', body: html,
      buttons: [
        { label: (global.t ? t('g.cancel') : 'Cancel'), cls: 'btn-ghost' },
        {
          label: L({ ar: 'استيراد', en: 'Import' }), cls: 'btn-primary',
          onClick: function () {
            var preset = Object.assign({}, headerPreset, { lines: mappedRows });
            UI.closeModal();
            EntityPage.openForm(mod.id, null, preset);
            /* false يمنع UI.modal (ui.js:125) من إغلاق النافذة الجديدة التي
               فتحها openForm للتو — بعد onClick مباشرة تُغلَق أي نافذة ما لم
               يُرجَع false صراحة أو keepOpen:true، ونحن نريدها مفتوحة.
               false stops UI.modal (ui.js:125) from closing the new modal
               openForm just opened — right after onClick it closes whatever
               modal is open unless false is returned explicitly or
               keepOpen:true is set, and we want the new one to stay open. */
            return false;
          }
        }
      ]
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installImport);
  else installImport();
  setTimeout(installImport, 1500);   /* احتياطاً لو تأخر تحميل entity.js · in case entity.js loads late */

  console.info('sheets-templates.js ready — 3 screens registered: levelsSheets, concreteRequests, inspectionPermits.');
})(window);
