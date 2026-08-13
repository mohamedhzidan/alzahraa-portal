/* =========================================================================
   knowledge.js — الخبرة المهنية لكل وظيفة
                  Professional know-how for every job
   -------------------------------------------------------------------------
   ما يعرفه موظف ممتاز في هذه الوظيفة داخل شركة مقاولات مصرية:
   ماذا يفحص قبل الاعتماد · أين تختفي الأموال عادةً · ما الخطأ الشائع ·
   ما المؤشر الذي يقيس أداءه · ما الذي يجب ألا يفعله أبداً.

   What an excellent person in this job knows inside an Egyptian contracting
   company: what to check before approving, where money usually leaks, the
   common mistakes, the KPI that measures them, and the never-do list.

   ⭐ أضف خبرة شركتكم هنا — كل ما تكتبه سيستخدمه المساعد فوراً.
   ========================================================================= */
(function (global) {
  'use strict';

  var KB = {

    /* ─────────────────────────── أمين المخزن ─────────────────────── */
    storekeeper: {
      title: { ar: 'أمين المخزن', en: 'Storekeeper' },
      mission: {
        ar: 'كل جرام يدخل المخزن يخرج بمستند، وكل فرق له سبب مكتوب.',
        en: 'Everything that enters leaves against a document, and every variance has a written reason.'
      },
      beforeYouApprove: [
        { ar: 'طابق الكمية على إذن التوريد واعتماد الشراء قبل التوقيع — لا توقّع ثم تعُدّ.',
          en: 'Match quantities to the delivery note and the approval before signing.' },
        { ar: 'افحص الجودة فعلياً: الأسمنت غير متحجّر، الحديد بالقطر الصحيح، الطوب غير مكسور.',
          en: 'Inspect for real: cement not hardened, steel of the right diameter, blocks unbroken.' },
        { ar: 'سجّل المرفوض في نفس الإذن — لا تتركه «نتفاهم بعدين».',
          en: 'Record rejected quantities on the same note.' },
        { ar: 'اكتب اسم السائق ورقم السيارة ورقم بطاقة المندوب. هذا ما ينقذك عند أي خلاف.',
          en: 'Log the driver, the vehicle and the rep ID number.' }
      ],
      whereMoneyLeaks: [
        { ar: 'التحويل بين المخازن بلا إثبات استلام في الوجهة — أكبر ثغرة على الإطلاق.',
          en: 'Transfers with no destination receipt — the single biggest gap.' },
        { ar: 'الصرف بإذن شفهي «والورق بعدين» — الورق لا يأتي أبداً.',
          en: 'Verbal issues with paperwork "later" — it never comes.' },
        { ar: 'الأسمنت والحديد في العراء: فقد طبيعي يتحول لعجز كبير.',
          en: 'Cement and steel stored uncovered: natural loss becomes a big shortage.' },
        { ar: 'صنف واحد بأسماء مختلفة — يظهر رصيد وهمي في مكان ونقص في آخر.',
          en: 'One item under several names — phantom stock in one place, shortage in another.' }
      ],
      commonMistakes: [
        { ar: 'تسجيل الاستلام آخر اليوم بدل لحظته، فتُنسى التفاصيل.',
          en: 'Recording receipts at day end instead of on arrival.' },
        { ar: 'ترك بند التكلفة فارغاً في إذن الصرف — التكلفة تضيع من تقارير المشروع.',
          en: 'Leaving the cost item blank on issues.' },
        { ar: 'الجرد بالتقدير بدل العد الفعلي.', en: 'Counting by estimate rather than physically.' }
      ],
      kpis: [
        { ar: 'دقة الجرد: فرق أقل من ١٪ من قيمة المخزون ممتاز.', en: 'Count accuracy: under 1% variance is excellent.' },
        { ar: 'صفر أيام توقف بسبب نفاد مادة.', en: 'Zero stoppage days caused by a stock-out.' },
        { ar: 'كل إذن صرف موقّع من مستلمه.', en: 'Every issue note signed by its receiver.' }
      ],
      neverDo: [
        { ar: 'لا تصرف بدون إذن معتمد مهما كان الضغط — أنت من سيُسأل.',
          en: 'Never issue without an approved note, whatever the pressure.' },
        { ar: 'لا تعدّل كمية في مستند معتمد — اطلب تسوية جرد.',
          en: 'Never edit a quantity on an approved document.' }
      ]
    },

    /* ─────────────────────────── المحاسب ─────────────────────────── */
    accountant: {
      title: { ar: 'المحاسب', en: 'Accountant' },
      mission: {
        ar: 'لا يُصرف جنيه بلا مستند ثلاثي: اعتماد شراء + استلام + فاتورة مطابقة.',
        en: 'No pound leaves without the three-way match: approval, receipt, invoice.'
      },
      beforeYouApprove: [
        { ar: 'المطابقة الثلاثية: قيمة الفاتورة = المعتمد = المستلم فعلاً. أي فرق يوقف السداد.',
          en: 'Three-way match. Any difference stops the payment.' },
        { ar: 'تأكد أن رقم فاتورة المورد لم يُسجّل من قبل — السداد المكرر أشهر خسارة صامتة.',
          en: 'Check the invoice number is not already recorded — duplicate payment is the classic silent loss.' },
        { ar: 'راجع الرقم الضريبي ونسبة الخصم والتحصيل قبل الترحيل.',
          en: 'Verify the tax ID and withholding rate before posting.' },
        { ar: 'كل مستند بلا مشروع وبند تكلفة = تقرير مشروع خاطئ.',
          en: 'Any document without project and cost item breaks project reporting.' }
      ],
      whereMoneyLeaks: [
        { ar: 'سداد فاتورة مرتين بأرقام مستندات مختلفة.', en: 'Paying one invoice twice under different vouchers.' },
        { ar: 'عهد قديمة لم تُسوَّ ثم يترك صاحبها الشركة.', en: 'Old custody never settled before the holder leaves.' },
        { ar: 'خصم وتحصيل لم يُورَّد للضرائب في موعده — غرامات.', en: 'Withholding tax not remitted on time.' },
        { ar: 'مصروفات تُحمّل على «مصروفات عامة» بدل المشروع، فتبدو المشروعات رابحة زوراً.',
          en: 'Costs dumped into overheads instead of the project.' }
      ],
      commonMistakes: [
        { ar: 'قيد غير متوازن يُترك مسودة ثم يُنسى.', en: 'An unbalanced draft journal left and forgotten.' },
        { ar: 'تسجيل الفاتورة بتاريخ التسجيل لا بتاريخ الفاتورة.', en: 'Booking on entry date instead of invoice date.' },
        { ar: 'نسيان الاحتجاز أو الدفعة المقدمة عند التسوية.', en: 'Forgetting retention or advance on settlement.' }
      ],
      kpis: [
        { ar: 'إقفال الشهر خلال ٥ أيام عمل.', en: 'Month-end close within 5 working days.' },
        { ar: 'صفر فواتير متأخرة عن الاستحقاق بلا سبب موثّق.', en: 'Zero unexplained overdue invoices.' },
        { ar: 'ميزان المراجعة متوازن دائماً.', en: 'Trial balance always balanced.' }
      ],
      neverDo: [
        { ar: 'لا تعدّل مستنداً معتمداً — استخدم العكس دائماً.', en: 'Never edit an approved document; always reverse.' },
        { ar: 'لا تسدّد على أساس صورة واتساب لفاتورة.', en: 'Never pay against a WhatsApp photo of an invoice.' }
      ]
    },

    /* ───────────────────────── المشتريات ─────────────────────────── */
    procurement: {
      title: { ar: 'مسؤول المشتريات', en: 'Procurement officer' },
      mission: {
        ar: 'المادة الصحيحة بالسعر الصحيح في الوقت الصحيح — وبمستند يحمي الشركة.',
        en: 'Right material, right price, right time — with a document that protects the company.'
      },
      beforeYouApprove: [
        { ar: 'قارن السعر بآخر شراء لنفس الصنف. ارتفاع فوق ١٥٪ يحتاج تبريراً مكتوباً.',
          en: 'Compare with the last purchase price; over 15% needs written justification.' },
        { ar: 'تحقق من رصيد المخزن أولاً — كثير من الطلبات لمواد موجودة بالفعل.',
          en: 'Check stock first; many requests are for material you already hold.' },
        { ar: 'راجع المتاح في الموازنة قبل الإرسال، لا بعد الاعتماد.',
          en: 'Check the budget before submitting, not after.' },
        { ar: 'اطلب البطاقة الضريبية من أي مورد جديد قبل أول تعامل.',
          en: 'Get the tax card from any new supplier before the first deal.' }
      ],
      whereMoneyLeaks: [
        { ar: 'الشراء العاجل المتكرر: تدفع أعلى سعر لأنك لم تخطّط.',
          en: 'Repeated emergency buying: you pay a premium for poor planning.' },
        { ar: 'تقسيم أمر كبير لأوامر صغيرة للالتفاف على حد الاعتماد — مخالفة جسيمة.',
          en: 'Splitting a large order to dodge the approval limit — a serious breach.' },
        { ar: 'مورد واحد لكل شيء بلا مقارنة أسعار دورية.',
          en: 'A single supplier for everything with no periodic price comparison.' }
      ],
      commonMistakes: [
        { ar: 'وصف الصنف غير دقيق فيصل شيء آخر ثم تُرفض البضاعة.',
          en: 'Vague specification, wrong goods arrive, rejection follows.' },
        { ar: 'عدم تحديد تاريخ الاحتياج فيصل متأخراً.', en: 'No required-by date, so it arrives late.' }
      ],
      kpis: [
        { ar: 'متوسط زمن الاعتماد أقل من ٣ أيام.', en: 'Average approval time under 3 days.' },
        { ar: 'نسبة الشراء العاجل أقل من ١٠٪ من الأوامر.', en: 'Emergency purchases under 10% of orders.' },
        { ar: 'صفر توقف في الموقع بسبب توريد متأخر.', en: 'Zero site stoppages from late delivery.' }
      ],
      neverDo: [
        { ar: 'لا تلتزم مع مورد شفهياً قبل الاعتماد — الالتزام يصبح ديناً على الشركة.',
          en: 'Never commit verbally before approval.' },
        { ar: 'لا تقبل عمولة أو هدية من مورد.', en: 'Never accept a commission or gift from a supplier.' }
      ]
    },

    /* ──────────────────────── مدير المشروع ───────────────────────── */
    project_manager: {
      title: { ar: 'مدير المشروع', en: 'Project manager' },
      mission: {
        ar: 'تسليم في الموعد داخل الموازنة، وكل تأخير أو تغيير موثّق يوم حدوثه.',
        en: 'Deliver on time within budget, with every delay and change documented the day it happens.'
      },
      beforeYouApprove: [
        { ar: 'لا تعتمد كميات مقاول باطن قبل معاينتها على الطبيعة — الورق يكذب والموقع لا يكذب.',
          en: 'Never certify subcontractor quantities without inspecting them physically.' },
        { ar: 'قارن المنصرف على كل بند تكلفة لا الإجمالي فقط — الإجمالي يخفي بنداً ينزف.',
          en: 'Compare spend per cost item, not just the total.' },
        { ar: 'تأكد أن الرسمة المستخدمة في التنفيذ هي آخر مراجعة.',
          en: 'Confirm the site is building from the latest revision.' }
      ],
      whereMoneyLeaks: [
        { ar: 'أعمال إضافية تُنفَّذ بأمر شفهي من العميل ثم يرفض دفعها.',
          en: 'Extra work done on a verbal client instruction, then refused.' },
        { ar: 'مواد تُصرف للمقاول من مخزنك ولا تُخصم من مستخلصه.',
          en: 'Materials issued to a subcontractor and never deducted from his IPC.' },
        { ar: 'معدة واقفة في الموقع وتكلفتها تجري.', en: 'Idle equipment still accruing cost.' },
        { ar: 'إعادة عمل بسبب رسمة قديمة — تكلفة مضاعفة بلا مقابل.',
          en: 'Rework from an outdated drawing.' }
      ],
      commonMistakes: [
        { ar: 'إهمال التقرير اليومي، ثم لا يوجد دليل عند المطالبة بالتأخير.',
          en: 'Skipping daily reports, then having no evidence for a delay claim.' },
        { ar: 'قياس الإنجاز بالتقدير الشخصي لا بالكميات المنفذة.',
          en: 'Measuring progress by feel instead of executed quantities.' }
      ],
      kpis: [
        { ar: 'الانحراف عن الموازنة أقل من ٥٪.', en: 'Budget variance under 5%.' },
        { ar: 'تقرير يومي لكل يوم عمل بلا انقطاع.', en: 'A daily report for every working day.' },
        { ar: 'كل أمر تغيير موقّع قبل بدء تنفيذه.', en: 'Every variation signed before work starts.' }
      ],
      neverDo: [
        { ar: 'لا تبدأ عملاً إضافياً بلا أمر تغيير مكتوب مهما ألحّ العميل.',
          en: 'Never start extra work without a written variation.' },
        { ar: 'لا تعتمد مستخلصاً أنت أعددته — النظام يمنعك وهذا لحمايتك.',
          en: 'Never approve an IPC you prepared yourself.' }
      ]
    },

    /* ──────────────────────── المكتب الفني ───────────────────────── */
    technical: {
      title: { ar: 'المكتب الفني', en: 'Technical office' },
      mission: {
        ar: 'كل كمية محسوبة بدقة، وكل رسمة في الموقع هي الأحدث، وكل مستخلص يعكس الواقع.',
        en: 'Every quantity accurate, every drawing current, every IPC reflecting reality.'
      },
      beforeYouApprove: [
        { ar: 'راجع الكميات التراكمية: لا يجوز أن يقل التراكمي عن المستخلص السابق أبداً.',
          en: 'Cumulative quantities can never fall below the previous IPC.' },
        { ar: 'تأكد أن نسبة الاحتجاز والدفعة المقدمة مطابقة لبنود العقد حرفياً.',
          en: 'Retention and advance recovery must match the contract exactly.' },
        { ar: 'أرفق حصر الكميات ومستندات القياس مع كل مستخلص.',
          en: 'Attach the measurement sheets to every IPC.' }
      ],
      whereMoneyLeaks: [
        { ar: 'حصر ناقص في المستخلص — تخسر مالاً نفّذته فعلاً.',
          en: 'Under-measuring in the IPC — you lose money you already earned.' },
        { ar: 'تأخير تقديم المستخلص شهراً = تأخير التحصيل شهراً.',
          en: 'A month late submitting is a month late collecting.' },
        { ar: 'عدم توثيق أوامر التغيير فور صدورها.', en: 'Variations not documented as they are issued.' }
      ],
      commonMistakes: [
        { ar: 'رسمة قديمة تُرسل للموقع بلا سحب النسخة السابقة.',
          en: 'A superseded drawing left on site.' },
        { ar: 'موازنة بنود غير مطابقة لبنود العقد فيصعب المقارنة.',
          en: 'Budget lines not aligned to contract items.' }
      ],
      kpis: [
        { ar: 'تقديم المستخلص خلال ٥ أيام من نهاية الفترة.', en: 'IPC submitted within 5 days of period end.' },
        { ar: 'صفر أعمال منفّذة برسمة ملغاة.', en: 'Zero work built from a superseded drawing.' }
      ],
      neverDo: [
        { ar: 'لا تُصدر رسمة للتنفيذ قبل اعتمادها.', en: 'Never issue a drawing for construction before approval.' }
      ]
    },

    /* ──────────────────────── المدير المالي ──────────────────────── */
    finance_manager: {
      title: { ar: 'المدير المالي', en: 'Finance manager' },
      mission: {
        ar: 'سيولة كافية دائماً، وربحية كل مشروع معروفة لحظياً، وصفر مفاجآت.',
        en: 'Always enough cash, per-project profitability known live, zero surprises.'
      },
      beforeYouApprove: [
        { ar: 'قبل أي اعتماد كبير: هل السيولة تكفي هذا الشهر بعد الرواتب والالتزامات؟',
          en: 'Before any large approval: does cash cover this month after payroll and commitments?' },
        { ar: 'راجع الالتزامات غير المفوترة — هي ديون قادمة لم تظهر بعد في الدفاتر.',
          en: 'Review uninvoiced commitments — debt that has not hit the books yet.' },
        { ar: 'قارن مستحقاتك بالتزاماتك: لو الالتزامات أكبر، أنت تموّل عملاءك من جيبك.',
          en: 'If payables exceed receivables you are financing your clients.' }
      ],
      whereMoneyLeaks: [
        { ar: 'مستخلصات لم تُحصّل ٩٠ يوماً فأكثر — سيولة محبوسة.',
          en: 'IPCs uncollected past 90 days — locked-up cash.' },
        { ar: 'احتجازات منتهية المدة لم يُطالَب بها.', en: 'Retentions due for release never claimed.' },
        { ar: 'مشروع خاسر يستمر لأن لا أحد يحسب ربحيته شهرياً.',
          en: 'A loss-making project continuing because nobody computes it monthly.' },
        { ar: 'غرامات ضريبية بسبب تأخير التوريد.', en: 'Tax penalties from late remittance.' }
      ],
      commonMistakes: [
        { ar: 'الاعتماد على رصيد البنك كمؤشر سيولة بدل التدفق المتوقع.',
          en: 'Using the bank balance instead of forecast cash flow.' },
        { ar: 'إقفال الشهر متأخراً فتصل الأرقام بعد فوات القرار.',
          en: 'Closing late so the numbers arrive after the decision.' }
      ],
      kpis: [
        { ar: 'متوسط أيام التحصيل أقل من ٦٠ يوماً.', en: 'Average collection under 60 days.' },
        { ar: 'ربحية كل مشروع محدّثة شهرياً.', en: 'Per-project margin refreshed monthly.' },
        { ar: 'رصيد سيولة يغطي ٣ أشهر من المصروفات الثابتة.', en: 'Cash covering 3 months of fixed costs.' }
      ],
      neverDo: [
        { ar: 'لا تعتمد صرفاً يجعل رصيد الخزينة سالباً.', en: 'Never approve a payment that drives cash negative.' },
        { ar: 'لا تسمح بحساب مشترك بين موظفين — ينهار سجل المراجعة.',
          en: 'Never allow a shared account.' }
      ]
    },

    /* ────────────────────── الموارد البشرية ──────────────────────── */
    hr: {
      title: { ar: 'الموارد البشرية', en: 'Human resources' },
      mission: {
        ar: 'كل موظف بعقد ساري وحضور مسجّل وراتب صحيح في موعده.',
        en: 'Every employee on a valid contract, attendance recorded, paid correctly and on time.'
      },
      beforeYouApprove: [
        { ar: 'قارن مسير هذا الشهر بالشهر السابق — أي فرق كبير له سبب.',
          en: 'Compare this payroll with last month; any big change has a reason.' },
        { ar: 'راجع الإضافي: ساعات كثيرة على موظف واحد تعني إما نقص عمالة أو خطأ تسجيل.',
          en: 'Heavy overtime on one person means either understaffing or a recording error.' },
        { ar: 'تأكد أن كل من في المسير له حضور مسجّل فعلاً.',
          en: 'Everyone on the payroll must have real attendance behind them.' }
      ],
      whereMoneyLeaks: [
        { ar: 'موظف ترك العمل ولا يزال في المسير.', en: 'A leaver still on the payroll.' },
        { ar: 'عمالة يومية تُصرف نقداً بلا كشف موقّع.', en: 'Daily labour paid cash with no signed sheet.' },
        { ar: 'عقود منتهية تُجدَّد تلقائياً بشروط قديمة.', en: 'Expired contracts auto-renewing on old terms.' }
      ],
      commonMistakes: [
        { ar: 'تسجيل الحضور أسبوعياً من الذاكرة.', en: 'Recording attendance weekly from memory.' },
        { ar: 'عدم توزيع تكلفة العمالة على المشاريع فتظهر كمصروف عام.',
          en: 'Not allocating labour cost to projects.' }
      ],
      kpis: [
        { ar: 'صرف الرواتب في موعدها ١٠٠٪.', en: 'Payroll on time, every time.' },
        { ar: 'صفر عقود منتهية بلا تجديد أو إنهاء.', en: 'Zero expired contracts left hanging.' }
      ],
      neverDo: [
        { ar: 'لا تشارك بيانات رواتب أحد مع زميل مهما كان منصبه.',
          en: 'Never share anyone’s pay data with a colleague.' }
      ]
    },

    /* ───────────────────────── المدير العام ──────────────────────── */
    gm: {
      title: { ar: 'المدير العام', en: 'General manager' },
      mission: {
        ar: 'قرارات مبنية على أرقام حديثة، ورقابة تمنع الخطأ قبل وقوعه لا بعده.',
        en: 'Decisions on current numbers, with controls that prevent errors rather than discover them.'
      },
      beforeYouApprove: [
        { ar: 'قبل الاعتماد اسأل: هل هذا داخل الموازنة؟ ومن راجعه؟ وما البديل؟',
          en: 'Before approving ask: is it in budget, who reviewed it, what is the alternative?' },
        { ar: 'انتبه للمستندات المتوقفة طويلاً — التأخير يكلّف أكثر من الخطأ أحياناً.',
          en: 'Watch documents stuck in approval; delay can cost more than error.' }
      ],
      whereMoneyLeaks: [
        { ar: 'مشروع خاسر يُكتشف متأخراً.', en: 'A loss-making project found too late.' },
        { ar: 'تركيز الصلاحيات في شخص واحد.', en: 'Authority concentrated in one person.' },
        { ar: 'قرارات بلا أرقام لأن الأرقام تتأخر شهراً.', en: 'Decisions without numbers because reporting lags.' }
      ],
      commonMistakes: [
        { ar: 'الاعتماد بالجملة دون قراءة — يُفقد الغرض من الرقابة.',
          en: 'Bulk approving without reading defeats the control.' }
      ],
      kpis: [
        { ar: 'كل مشروع نشط له موازنة معتمدة.', en: 'Every active project has an approved budget.' },
        { ar: 'صفر مستندات معلّقة أكثر من ٧ أيام.', en: 'Zero documents stuck beyond 7 days.' }
      ],
      neverDo: [
        { ar: 'لا تعتمد مستنداً أنت أنشأته أو راجعته.', en: 'Never approve what you created or reviewed.' }
      ]
    },

    legal: {
      title: { ar: 'الشؤون القانونية', en: 'Legal affairs' },
      mission: { ar: 'لا يمر تاريخ انتهاء دون تنبيه، ولا يُوقَّع عقد دون مراجعة.',
                 en: 'No expiry passes unnoticed, no contract is signed unreviewed.' },
      beforeYouApprove: [
        { ar: 'راجع بنود الغرامات والاحتجاز ومدة الضمان قبل التوقيع.',
          en: 'Check penalties, retention and warranty terms before signing.' },
        { ar: 'تأكد أن خطاب الضمان ساري طوال مدة العقد وليس أقل.',
          en: 'Ensure the bank guarantee covers the full contract period.' }
      ],
      whereMoneyLeaks: [
        { ar: 'ترخيص منتهٍ يوقف صرف مستخلص أو يمنع دخول مناقصة.',
          en: 'An expired licence blocking an IPC or a tender.' },
        { ar: 'غرامات تأخير تُقبل بلا مراجعة استحقاقها.',
          en: 'Delay penalties accepted without checking entitlement.' }
      ],
      commonMistakes: [{ ar: 'حفظ المستندات ورقياً فقط.', en: 'Keeping documents on paper only.' }],
      kpis: [{ ar: 'صفر مستندات منتهية.', en: 'Zero expired documents.' }],
      neverDo: [{ ar: 'لا توقّع عقداً بلا قراءة بند إنهاء التعاقد.', en: 'Never sign without reading the termination clause.' }]
    },

    it: {
      title: { ar: 'تقنية المعلومات', en: 'IT' },
      mission: { ar: 'الأنظمة تعمل، والبيانات محفوظة، والصلاحيات صحيحة.',
                 en: 'Systems up, data backed up, permissions correct.' },
      beforeYouApprove: [
        { ar: 'قبل منح أي صلاحية اسأل: هل يحتاجها فعلاً لأداء عمله؟',
          en: 'Before granting access ask whether the job truly needs it.' }
      ],
      whereMoneyLeaks: [
        { ar: 'حساب موظف تركَ الشركة ولا يزال شغّالاً.', en: 'A leaver’s account still active.' },
        { ar: 'نسخة احتياطية لم تُختبر أبداً.', en: 'A backup never tested.' }
      ],
      commonMistakes: [{ ar: 'تأجيل التحديثات الأمنية.', en: 'Postponing security updates.' }],
      kpis: [{ ar: 'اختبار استعادة ناجح كل ٣ أشهر.', en: 'A successful restore test every quarter.' }],
      neverDo: [{ ar: 'لا ترسل كلمة مرور في واتساب.', en: 'Never send a password over WhatsApp.' }]
    },

    auditor: {
      title: { ar: 'المراجع الداخلي', en: 'Internal auditor' },
      mission: { ar: 'تتبّع الأثر، لا الأشخاص. كل رقم له مستند وكل مستند له توقيع.',
                 en: 'Follow the trail, not the people. Every number has a document, every document a signature.' },
      beforeYouApprove: [
        { ar: 'ابدأ من المستندات المعكوسة وأسبابها — هناك تُدفن الأخطاء.',
          en: 'Start with reversed documents and their reasons.' },
        { ar: 'راجع من اعتمد ماذا: أي حالة اعتماد ذاتي هي خلل رقابي.',
          en: 'Check who approved what; any self-approval is a control failure.' }
      ],
      whereMoneyLeaks: [
        { ar: 'تقسيم المشتريات للالتفاف على حدود الاعتماد.', en: 'Split purchasing to dodge approval limits.' },
        { ar: 'موردون بلا بيانات ضريبية كاملة.', en: 'Suppliers with incomplete tax data.' }
      ],
      commonMistakes: [{ ar: 'الاكتفاء بالعينة الصغيرة.', en: 'Relying on too small a sample.' }],
      kpis: [{ ar: 'تغطية كل دورة مستندية مرة سنوياً على الأقل.', en: 'Cover every document cycle at least annually.' }],
      neverDo: [{ ar: 'لا تعدّل بيانات — دورك القراءة والتوثيق.', en: 'Never modify data; your role is read and report.' }]
    },

    employee: {
      title: { ar: 'الموظف', en: 'Employee' },
      mission: { ar: 'اعمل بمستند، واحفظ حقك بالتوثيق.', en: 'Work against documents; protect yourself by recording.' },
      beforeYouApprove: [],
      whereMoneyLeaks: [],
      commonMistakes: [
        { ar: 'طلب الإجازة شفهياً ثم إنكارها لاحقاً.', en: 'Requesting leave verbally and it being denied later.' }
      ],
      kpis: [],
      neverDo: [{ ar: 'لا تشارك كلمة مرورك مع أي زميل.', en: 'Never share your password.' }]
    },

    /* ───────────────────────── مهندس الموقع ───────────────────────── */
    site_engineer: {
      title: { ar: 'مهندس موقع', en: 'Site engineer' },
      mission: {
        ar: 'يُنفَّذ الصحيح من أول مرة، ويُوثَّق يوم حدوثه لا بعد شهر.',
        en: 'Built right the first time, and recorded the day it happens — not a month later.'
      },
      beforeYouApprove: [
        { ar: 'قبل أي صب: النجارة والحدادة والمناسيب معتمدة كتابةً. الصب لا يُهدم بسهولة.',
          en: 'Before any pour: formwork, steel and levels approved in writing. Concrete is not easily undone.' },
        { ar: 'تأكد أن الرسمة في يدك هي آخر مراجعة قبل أن تبدأ، لا بعد أن تنتهي.',
          en: 'Confirm your drawing is the latest revision before you start, not after you finish.' },
        { ar: 'لا تغطِّ طبقة قبل أن يعاينها الاستشاري ويوقّع. ما يُغطّى بلا توقيع يُفتح مرة أخرى.',
          en: 'Never cover a layer before the consultant inspects and signs. Covered work without a signature gets reopened.' },
        { ar: 'راجع نتائج الدمك والحرارة قبل السماح بالطبقة التالية.',
          en: 'Check compaction and temperature before allowing the next layer.' }
      ],
      whereMoneyLeaks: [
        { ar: 'عمل إضافي بأمر شفهي: تنفّذه ثم يُنكَر ولا يُدفع. لا شيء بلا ورق.',
          en: 'Extra work on a verbal instruction: you build it, they deny it, nobody pays.' },
        { ar: 'مواد تُصرف لمقاول الباطن من مخزنك ولا تُخصم من مستخلصه.',
          en: 'Material issued to a subcontractor and never deducted from his IPC.' },
        { ar: 'كميات منفّذة لم تُحصر يوم تنفيذها فتضيع من المستخلص نهائياً.',
          en: 'Quantities not measured the day they were built, lost from the IPC for good.' },
        { ar: 'إعادة عمل بسبب رسمة قديمة — أغلى خطأ في الموقع على الإطلاق.',
          en: 'Rework from a superseded drawing — the most expensive mistake on any site.' },
        { ar: 'معدة واقفة في الموقع وإيجارها يجري.', en: 'Idle equipment still on hire.' },
        { ar: 'خلطة أسفلت باردة تُفرد فتُرفض الطبقة كاملة بعد أسبوع.',
          en: 'Cold asphalt laid, and the whole section is rejected a week later.' }
      ],
      commonMistakes: [
        { ar: 'تأجيل كتابة التقرير اليومي للمساء ثم للغد ثم لا يُكتب.',
          en: 'Postponing the daily report to the evening, then tomorrow, then never.' },
        { ar: 'تقدير الكمية بالنظر بدل قياسها.', en: 'Estimating quantities by eye instead of measuring.' },
        { ar: 'الاعتماد على الواتساب في التعليمات المهمة.',
          en: 'Relying on WhatsApp for instructions that matter.' },
        { ar: 'عدم تسجيل سبب توقف العمل — ثم لا يوجد دليل عند المطالبة بالتأخير.',
          en: 'Not recording why work stopped, then having no evidence for a delay claim.' }
      ],
      kpis: [
        { ar: 'صفر أعمال منفّذة برسمة ملغاة.', en: 'Zero work built from a superseded drawing.' },
        { ar: 'نسبة قبول طلبات الفحص من أول مرة فوق ٩٠٪.', en: 'First-time inspection pass rate above 90%.' },
        { ar: 'تقرير يومي لكل يوم عمل بلا استثناء.', en: 'A daily report for every working day.' },
        { ar: 'كل تقرير عدم مطابقة مُغلق في موعده.', en: 'Every NCR closed on time.' }
      ],
      neverDo: [
        { ar: 'لا تبدأ عملاً إضافياً بلا أمر مكتوب مهما ألحّ الاستشاري أو العميل.',
          en: 'Never start extra work without a written instruction, however much they insist.' },
        { ar: 'لا تصبّ خرسانة بلا إذن صب معتمد.', en: 'Never pour without an approved pour card.' },
        { ar: 'لا تستخدم مادة قبل ظهور نتيجة اختبارها.', en: 'Never use a material before its test result is out.' }
      ]
    },

    /* ───────────────────────── ضبط المستندات ───────────────────────── */
    document_control: {
      title: { ar: 'ضبط المستندات', en: 'Document control' },
      mission: {
        ar: 'كل مستند له رقم ومراجعة ومكان، وكل موعد له تنبيه قبل فواته.',
        en: 'Every document numbered, revised and located; every deadline flagged before it passes.'
      },
      beforeYouApprove: [
        { ar: 'قبل إصدار أي مراجعة جديدة: تأكد أن القديمة سُحبت من الموقع بتوقيع.',
          en: 'Before issuing a new revision, confirm the old one was recalled from site against a signature.' },
        { ar: 'لا تُصدر مستنداً للتنفيذ قبل أن تكون حالته «معتمد» رسمياً.',
          en: 'Never issue a document for construction before its status is formally approved.' },
        { ar: 'راجع مواعيد الإخطارات التعاقدية أسبوعياً — بعضها يسقط الحق بفواته.',
          en: 'Review contractual notice deadlines weekly — some forfeit the right if missed.' }
      ],
      whereMoneyLeaks: [
        { ar: 'نسخة ملغاة بقيت في الموقع فنُفّذ عليها عمل كامل. أغلى خطأ مستندي على الإطلاق.',
          en: 'A superseded copy left on site and built from. The single most expensive document error.' },
        { ar: 'إخطار تعاقدي فات موعده فسقطت مطالبة كاملة.',
          en: 'A contractual notice missed, and an entire claim forfeited with it.' },
        { ar: 'تأخير رد على طلب معلومات لم يُوثَّق فلم تُقبل مطالبة تمديد المدة.',
          en: 'An RFI delay never documented, so the extension-of-time claim failed.' },
        { ar: 'مستند أُرسل بلا إثبات استلام ثم أنكر الطرف الآخر استلامه.',
          en: 'A document sent without acknowledgement, then its receipt denied.' },
        { ar: 'شراء مادة قبل اعتمادها فرُفضت في الموقع وخُصمت من المستخلص.',
          en: 'A material bought before approval, rejected on site and deducted from the IPC.' }
      ],
      commonMistakes: [
        { ar: 'الاعتماد على مجلدات شخصية على أجهزة الموظفين بدل سجل مركزي.',
          en: 'Relying on personal folders on staff laptops instead of a central register.' },
        { ar: 'ترقيم غير منتظم يجعل البحث مستحيلاً بعد سنتين.',
          en: 'Inconsistent numbering that makes retrieval impossible two years later.' },
        { ar: 'الأرشيف بلا نسخة إلكترونية — حريق أو تسريب مياه يمحو تاريخ الشركة.',
          en: 'A paper archive with no scans — one fire or leak erases the company history.' },
        { ar: 'عدم تسجيل من استعار مستنداً من الأرشيف.',
          en: 'Not recording who borrowed a document from the archive.' }
      ],
      kpis: [
        { ar: 'صفر نسخ ملغاة في الموقع.', en: 'Zero superseded copies on site.' },
        { ar: 'صفر إخطارات تعاقدية فاتت مواعيدها.', en: 'Zero missed contractual notices.' },
        { ar: 'كل مستند صادر له إثبات استلام خلال أسبوع.', en: 'Every outgoing document acknowledged within a week.' },
        { ar: 'استخراج أي مستند خلال ٥ دقائق.', en: 'Any document retrievable within 5 minutes.' }
      ],
      neverDo: [
        { ar: 'لا تُصدر رسمة للتنفيذ قبل اعتمادها.', en: 'Never issue a drawing for construction before approval.' },
        { ar: 'لا تُعدم مستنداً يخص نزاعاً قائماً مهما انتهت مدة حفظه.',
          en: 'Never destroy a document relating to a live dispute, whatever its retention date.' },
        { ar: 'لا تسلّم مستنداً سرّياً بلا التحقق من مصفوفة التوزيع.',
          en: 'Never release a confidential document without checking the distribution matrix.' }
      ]
    },

    admin: {
      title: { ar: 'مسؤول النظام', en: 'System administrator' },
      mission: { ar: 'النظام يعمل، الصلاحيات صحيحة، والبيانات محمية ومنسوخة.',
                 en: 'System running, permissions correct, data protected and backed up.' },
      beforeYouApprove: [
        { ar: 'قبل منح دور «مسؤول نظام» لأحد: هل تثق به على كل بيانات الشركة؟',
          en: 'Before granting admin: do you trust them with everything?' }
      ],
      whereMoneyLeaks: [
        { ar: 'صلاحيات واسعة مُنحت مؤقتاً ولم تُسحب.', en: 'Broad access granted temporarily and never revoked.' }
      ],
      commonMistakes: [{ ar: 'عدم اختبار الاستعادة.', en: 'Never testing a restore.' }],
      kpis: [{ ar: 'مراجعة قائمة المستخدمين شهرياً.', en: 'Monthly user review.' }],
      neverDo: [{ ar: 'لا تنشر مفتاح service_role إطلاقاً.', en: 'Never publish the service_role key.' }]
    }
  };

  KB.reviewer = KB.auditor;

  function forRole(role) { return KB[role] || KB.employee; }

  /* نصيحة اليوم — تدور على المعرفة بدل تكرار نفس السطر */
  function tipOfDay(role) {
    var kb = forRole(role);
    var pool = []
      .concat(kb.beforeYouApprove || [])
      .concat(kb.whereMoneyLeaks || [])
      .concat(kb.commonMistakes || [])
      .concat(kb.neverDo || []);
    if (!pool.length) return null;
    var day = Math.floor(Date.now() / 86400000);
    return pool[day % pool.length];
  }

  global.Knowledge = { KB: KB, forRole: forRole, tipOfDay: tipOfDay };
})(window);
