/* =========================================================================
   schema.js — THE HEART OF THE SYSTEM
   ---------------------------------------------------------------------
   Every screen in the portal is described here as data, not code.
   To ADD a new screen: copy any block below, change the id/table/labels
   and its fields. The menu, the table, the form, the search, the export
   and the permissions are all generated automatically.

   FIELD TYPES
     text · textarea · number · money · percent · date · select
     ref (link to another screen) · checkbox · email · phone
   ========================================================================= */
(function (global) {
  'use strict';

  /* ---------- reusable option sets ---------- */
  var YESNO = [
    { value: 'active',   label: { ar: 'نشط',   en: 'Active' } },
    { value: 'inactive', label: { ar: 'موقوف', en: 'Inactive' } }
  ];

  var UNITS = [
    { value: 'pcs', label: { ar: 'قطعة', en: 'Piece' } },
    { value: 'ton', label: { ar: 'طن', en: 'Ton' } },
    { value: 'm3',  label: { ar: 'متر مكعب', en: 'Cubic metre' } },
    { value: 'm2',  label: { ar: 'متر مربع', en: 'Square metre' } },
    { value: 'm',   label: { ar: 'متر طولي', en: 'Linear metre' } },
    { value: 'kg',  label: { ar: 'كيلوجرام', en: 'Kilogram' } },
    { value: 'bag', label: { ar: 'شيكارة', en: 'Bag' } },
    { value: 'ltr', label: { ar: 'لتر', en: 'Litre' } },
    { value: 'day', label: { ar: 'يوم', en: 'Day' } },
    { value: 'hr',  label: { ar: 'ساعة', en: 'Hour' } },
    { value: 'ls',  label: { ar: 'مقطوعية', en: 'Lump sum' } }
  ];

  var COST_TYPES = [
    { value: 'material',  label: { ar: 'مواد', en: 'Materials' } },
    { value: 'labour',    label: { ar: 'عمالة', en: 'Labour' } },
    { value: 'equipment', label: { ar: 'معدات', en: 'Equipment' } },
    { value: 'subcon',    label: { ar: 'مقاول باطن', en: 'Subcontractor' } },
    { value: 'direct',    label: { ar: 'مصروف مباشر', en: 'Direct expense' } },
    { value: 'indirect',  label: { ar: 'مصروف غير مباشر', en: 'Indirect expense' } }
  ];

  var TAX_RATES = [
    { value: '0',  label: { ar: 'معفى 0%', en: 'Exempt 0%' } },
    { value: '5',  label: { ar: '5%', en: '5%' } },
    { value: '14', label: { ar: 'قيمة مضافة 14%', en: 'VAT 14%' } }
  ];

  var PROJECT_STATUS = [
    { value: 'planning',  label: { ar: 'تحت التخطيط', en: 'Planning' } },
    { value: 'active',    label: { ar: 'جاري التنفيذ', en: 'In progress' } },
    { value: 'suspended', label: { ar: 'متوقف', en: 'Suspended' } },
    { value: 'closed',    label: { ar: 'منتهي', en: 'Completed' } }
  ];

  var PAY_METHOD = [
    { value: 'cash',     label: { ar: 'نقدي', en: 'Cash' } },
    { value: 'cheque',   label: { ar: 'شيك', en: 'Cheque' } },
    { value: 'transfer', label: { ar: 'تحويل بنكي', en: 'Bank transfer' } }
  ];

  /* ---------- shared field builders ---------- */
  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }
  var SEC = {
    main:   { ar: 'البيانات الأساسية', en: 'Main information' },
    money:  { ar: 'القيم المالية',     en: 'Financial values' },
    link:   { ar: 'الربط والتحميل',    en: 'Links & cost allocation' },
    extra:  { ar: 'بيانات إضافية',     en: 'Additional information' },
    dates:  { ar: 'التواريخ',          en: 'Dates' },
    contact:{ ar: 'بيانات الاتصال',    en: 'Contact details' }
  };

  /* =======================================================================
     MODULES
     ===================================================================== */
  var MODULES = [

    /* ============ FINANCE, PROCUREMENT & STORES ============ */
    {
      id: 'accounts', table: 'accounts', group: 'finance', icon: 'book',
      label: { ar: 'دليل الحسابات', en: 'Chart of accounts' },
      desc: { ar: 'الحسابات الرئيسية والفرعية للشركة', en: 'Company main and sub accounts' },
      search: ['code', 'name'],
      columns: ['code', 'name', 'type', 'postable', 'openingBalance'],
      fields: [
        F('code', 'كود الحساب', 'Account code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم الحساب', 'Account name', 'text', { required: true, section: SEC.main }),
        F('type', 'طبيعة الحساب', 'Account nature', 'select', {
          required: true, section: SEC.main, options: [
            { value: 'asset',     label: { ar: 'أصول', en: 'Asset' } },
            { value: 'liability', label: { ar: 'خصوم', en: 'Liability' } },
            { value: 'equity',    label: { ar: 'حقوق ملكية', en: 'Equity' } },
            { value: 'revenue',   label: { ar: 'إيرادات', en: 'Revenue' } },
            { value: 'expense',   label: { ar: 'مصروفات', en: 'Expense' } }
          ]
        }),
        F('parent', 'الحساب الأب', 'Parent account', 'ref', { ref: 'accounts', refLabel: 'name', section: SEC.main }),
        F('postable', 'يقبل الترحيل', 'Allows posting', 'checkbox', { default: true, section: SEC.main }),
        F('openingBalance', 'الرصيد الافتتاحي', 'Opening balance', 'money', { section: SEC.money }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'journal', table: 'journal', group: 'finance', icon: 'edit',
      label: { ar: 'قيود اليومية', en: 'Journal entries' },
      desc: { ar: 'القيود المحاسبية اليدوية والتسويات', en: 'Manual journal entries and adjustments' },
      workflow: true, docPrefix: 'JV', amountField: 'totalDebit',
      search: ['docNo', 'description'],
      columns: ['docNo', 'date', 'description', 'project', 'totalDebit', 'status'],
      fields: [
        F('date', 'تاريخ القيد', 'Entry date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('description', 'البيان', 'Description', 'text', { required: true, section: SEC.main, full: true }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('reference', 'المرجع', 'Reference', 'text', { section: SEC.extra }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'أطراف القيد', en: 'Entry lines' },
        fields: [
          F('account', 'الحساب', 'Account', 'ref', { ref: 'accounts', refLabel: 'name', required: true, width: '34%' }),
          F('lineDesc', 'البيان', 'Description', 'text', { width: '30%' }),
          F('debit', 'مدين', 'Debit', 'money', { width: '18%' }),
          F('credit', 'دائن', 'Credit', 'money', { width: '18%' })
        ],
        totals: [
          { field: 'debit', target: 'totalDebit', label: { ar: 'إجمالي المدين', en: 'Total debit' } },
          { field: 'credit', target: 'totalCredit', label: { ar: 'إجمالي الدائن', en: 'Total credit' } }
        ],
        validate: function (rec) {
          var d = 0, c = 0;
          (rec.lines || []).forEach(function (l) { d += Number(l.debit) || 0; c += Number(l.credit) || 0; });
          if (Math.abs(d - c) > 0.009) {
            return { ar: 'القيد غير متوازن: المدين ' + I18N.money(d) + ' والدائن ' + I18N.money(c),
                     en: 'Entry is not balanced: debit ' + I18N.money(d) + ' vs credit ' + I18N.money(c) };
          }
          if (d === 0) return { ar: 'لا يمكن ترحيل قيد بقيمة صفر', en: 'Cannot post a zero-value entry' };
          return null;
        }
      }
    },

    {
      id: 'suppliers', table: 'suppliers', group: 'finance', icon: 'truck',
      label: { ar: 'الموردون', en: 'Suppliers' },
      desc: { ar: 'بيانات الموردين وأرصدتهم', en: 'Supplier master data and balances' },
      search: ['code', 'name', 'taxId'],
      columns: ['code', 'name', 'phone', 'taxId', 'openingBalance', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم المورد', 'Supplier name', 'text', { required: true, section: SEC.main }),
        F('category', 'التصنيف', 'Category', 'select', {
          section: SEC.main, options: [
            { value: 'materials', label: { ar: 'مواد بناء', en: 'Building materials' } },
            { value: 'services',  label: { ar: 'خدمات', en: 'Services' } },
            { value: 'equipment', label: { ar: 'معدات', en: 'Equipment' } },
            { value: 'fuel',      label: { ar: 'وقود وزيوت', en: 'Fuel & lubricants' } },
            { value: 'other',     label: { ar: 'أخرى', en: 'Other' } }
          ]
        }),
        F('contactPerson', 'مسؤول الاتصال', 'Contact person', 'text', { section: SEC.contact }),
        F('phone', 'الهاتف', 'Phone', 'phone', { section: SEC.contact }),
        F('email', 'البريد الإلكتروني', 'Email', 'email', { section: SEC.contact }),
        F('address', 'العنوان', 'Address', 'text', { section: SEC.contact, full: true }),
        F('taxId', 'البطاقة الضريبية', 'Tax ID', 'text', { section: SEC.extra }),
        F('commercialReg', 'السجل التجاري', 'Commercial registry', 'text', { section: SEC.extra }),
        F('bankAccount', 'الحساب البنكي', 'Bank account', 'text', { section: SEC.extra }),
        F('paymentTerms', 'شروط السداد (يوم)', 'Payment terms (days)', 'number', { section: SEC.money }),
        F('openingBalance', 'الرصيد الافتتاحي', 'Opening balance', 'money', { section: SEC.money }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'customers', table: 'customers', group: 'finance', icon: 'users',
      label: { ar: 'العملاء', en: 'Customers' },
      desc: { ar: 'بيانات العملاء وجهات التعاقد', en: 'Customer and client master data' },
      search: ['code', 'name', 'taxId'],
      columns: ['code', 'name', 'phone', 'taxId', 'openingBalance', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم العميل', 'Customer name', 'text', { required: true, section: SEC.main }),
        F('sector', 'القطاع', 'Sector', 'select', {
          section: SEC.main, options: [
            { value: 'government', label: { ar: 'حكومي', en: 'Government' } },
            { value: 'private',    label: { ar: 'قطاع خاص', en: 'Private sector' } },
            { value: 'developer',  label: { ar: 'مطور عقاري', en: 'Real-estate developer' } },
            { value: 'individual', label: { ar: 'أفراد', en: 'Individual' } }
          ]
        }),
        F('contactPerson', 'مسؤول الاتصال', 'Contact person', 'text', { section: SEC.contact }),
        F('phone', 'الهاتف', 'Phone', 'phone', { section: SEC.contact }),
        F('email', 'البريد الإلكتروني', 'Email', 'email', { section: SEC.contact }),
        F('address', 'العنوان', 'Address', 'text', { section: SEC.contact, full: true }),
        F('taxId', 'البطاقة الضريبية', 'Tax ID', 'text', { section: SEC.extra }),
        F('openingBalance', 'الرصيد الافتتاحي', 'Opening balance', 'money', { section: SEC.money }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'costItems', table: 'costItems', group: 'finance', icon: 'tag',
      label: { ar: 'بنود التكلفة', en: 'Cost items' },
      desc: { ar: 'تصنيف التكاليف داخل المشروعات (WBS)', en: 'Project cost breakdown structure (WBS)' },
      search: ['code', 'name'],
      columns: ['code', 'name', 'type', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم البند', 'Cost item name', 'text', { required: true, section: SEC.main }),
        F('type', 'نوع التكلفة', 'Cost type', 'select', { options: COST_TYPES, required: true, section: SEC.main }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'وصف', 'Description', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'purchaseApprovals', table: 'purchaseApprovals', group: 'finance', icon: 'cart',
      label: { ar: 'اعتمادات الشراء', en: 'Purchase approvals' },
      desc: { ar: 'طلب واعتماد شراء المواد والخدمات', en: 'Request and approve purchases of materials and services' },
      workflow: true, docPrefix: 'PA', amountField: 'grandTotal', commitment: true,
      search: ['docNo', 'reason'],
      columns: ['docNo', 'date', 'project', 'supplier', 'grandTotal', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', required: true, section: SEC.link }),
        F('warehouse', 'المخزن المستلم', 'Receiving warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', section: SEC.link }),
        F('supplier', 'المورد', 'Supplier', 'ref', { ref: 'suppliers', refLabel: 'name', section: SEC.main }),
        F('reason', 'سبب الشراء', 'Purchase reason', 'text', { required: true, section: SEC.main, full: true }),
        F('priority', 'الأولوية', 'Priority', 'select', {
          section: SEC.main, default: 'normal', options: [
            { value: 'normal', label: { ar: 'عادي', en: 'Normal' } },
            { value: 'urgent', label: { ar: 'عاجل', en: 'Urgent' } },
            { value: 'critical', label: { ar: 'حرج', en: 'Critical' } }
          ]
        }),
        F('neededBy', 'تاريخ الاحتياج', 'Needed by', 'date', { section: SEC.dates }),
        F('taxRate', 'نسبة الضريبة', 'Tax rate', 'select', { options: TAX_RATES, default: '14', section: SEC.money }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'بنود الطلب', en: 'Request lines' },
        fields: [
          F('item', 'الصنف / الخدمة', 'Item / service', 'text', { required: true, width: '32%' }),
          F('unit', 'الوحدة', 'Unit', 'select', { options: UNITS, width: '15%' }),
          F('qty', 'الكمية', 'Qty', 'number', { width: '14%', default: 1 }),
          F('price', 'السعر التقديري', 'Est. price', 'money', { width: '18%' }),
          F('lineTotal', 'الإجمالي', 'Total', 'calc', { width: '18%', formula: 'qty*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal' } }],
        grandTotal: true
      }
    },

    {
      id: 'goodsReceipts', table: 'goodsReceipts', group: 'finance', icon: 'inbox',
      label: { ar: 'إذون الاستلام والفحص', en: 'Goods receipt & inspection' },
      desc: { ar: 'استلام البضاعة من الموردين وفحصها', en: 'Receive and inspect goods from suppliers' },
      workflow: true, docPrefix: 'GRN', amountField: 'grandTotal',
      search: ['docNo', 'deliveryNote'],
      columns: ['docNo', 'date', 'warehouse', 'supplier', 'grandTotal', 'status'],
      fields: [
        F('date', 'تاريخ الاستلام', 'Receipt date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('purchaseApproval', 'اعتماد الشراء', 'Purchase approval', 'ref', { ref: 'purchaseApprovals', refLabel: 'docNo', section: SEC.link }),
        F('supplier', 'المورد', 'Supplier', 'ref', { ref: 'suppliers', refLabel: 'name', required: true, section: SEC.main }),
        F('warehouse', 'المخزن', 'Warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', required: true, section: SEC.link }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('deliveryNote', 'رقم إذن التوريد', 'Delivery note no.', 'text', { section: SEC.main }),
        F('inspector', 'مسؤول الفحص', 'Inspector', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('inspectionResult', 'نتيجة الفحص', 'Inspection result', 'select', {
          section: SEC.main, default: 'accepted', options: [
            { value: 'accepted', label: { ar: 'مطابق ومقبول', en: 'Accepted' } },
            { value: 'partial',  label: { ar: 'مقبول جزئياً', en: 'Partially accepted' } },
            { value: 'rejected', label: { ar: 'مرفوض', en: 'Rejected' } }
          ]
        }),
        F('taxRate', 'نسبة الضريبة', 'Tax rate', 'select', { options: TAX_RATES, default: '14', section: SEC.money }),
        F('notes', 'ملاحظات الفحص', 'Inspection notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'الأصناف المستلمة', en: 'Received items' },
        fields: [
          F('item', 'الصنف', 'Item', 'ref', { ref: 'items', refLabel: 'name', required: true, width: '28%' }),
          F('unit', 'الوحدة', 'Unit', 'select', { options: UNITS, width: '12%' }),
          F('qtyReceived', 'الكمية المستلمة', 'Received qty', 'number', { width: '14%' }),
          F('qtyAccepted', 'المقبولة', 'Accepted', 'number', { width: '13%' }),
          F('qtyRejected', 'المرفوضة', 'Rejected', 'number', { width: '13%' }),
          F('price', 'سعر الوحدة', 'Unit price', 'money', { width: '10%' }),
          F('lineTotal', 'الإجمالي', 'Total', 'calc', { width: '10%', formula: 'qtyAccepted*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal' } }],
        grandTotal: true,
        stockEffect: 'in'
      }
    },

    {
      id: 'supplierInvoices', table: 'supplierInvoices', group: 'finance', icon: 'file',
      label: { ar: 'فواتير الموردين', en: 'Supplier invoices' },
      desc: { ar: 'تسجيل فواتير الموردين ومطابقتها', en: 'Record and match supplier invoices' },
      workflow: true, docPrefix: 'SI', amountField: 'grandTotal',
      search: ['docNo', 'supplierInvoiceNo'],
      columns: ['docNo', 'date', 'supplier', 'supplierInvoiceNo', 'grandTotal', 'paidAmount', 'status'],
      fields: [
        F('date', 'تاريخ الفاتورة', 'Invoice date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('supplier', 'المورد', 'Supplier', 'ref', { ref: 'suppliers', refLabel: 'name', required: true, section: SEC.main }),
        F('supplierInvoiceNo', 'رقم فاتورة المورد', 'Supplier invoice no.', 'text', { required: true, section: SEC.main }),
        F('goodsReceipt', 'إذن الاستلام', 'Goods receipt', 'ref', { ref: 'goodsReceipts', refLabel: 'docNo', section: SEC.link }),
        F('purchaseApproval', 'اعتماد الشراء', 'Purchase approval', 'ref', { ref: 'purchaseApprovals', refLabel: 'docNo', section: SEC.link }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('subTotal', 'القيمة قبل الضريبة', 'Amount before tax', 'money', { required: true, section: SEC.money }),
        F('taxRate', 'نسبة الضريبة', 'Tax rate', 'select', { options: TAX_RATES, default: '14', section: SEC.money }),
        F('withholding', 'خصم وتحصيل', 'Withholding tax', 'money', { section: SEC.money }),
        F('grandTotal', 'الإجمالي المستحق', 'Total payable', 'calc', { section: SEC.money, formula: 'subTotal+subTotal*taxRate/100-withholding' }),
        F('paidAmount', 'المسدد', 'Paid amount', 'money', { readonly: true, section: SEC.money }),
        F('dueDate', 'تاريخ الاستحقاق', 'Due date', 'date', { section: SEC.dates }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'payments', table: 'payments', group: 'finance', icon: 'arrow-up',
      label: { ar: 'سندات الصرف', en: 'Payment vouchers' },
      desc: { ar: 'صرف نقدية للموردين والمقاولين والمصروفات', en: 'Payments to suppliers, subcontractors and expenses' },
      workflow: true, docPrefix: 'PV', amountField: 'amount',
      search: ['docNo', 'beneficiary', 'description'],
      columns: ['docNo', 'date', 'beneficiary', 'cashAccount', 'amount', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('payeeType', 'نوع المستفيد', 'Payee type', 'select', {
          required: true, section: SEC.main, default: 'supplier', options: [
            { value: 'supplier',      label: { ar: 'مورد', en: 'Supplier' } },
            { value: 'subcontractor', label: { ar: 'مقاول باطن', en: 'Subcontractor' } },
            { value: 'employee',      label: { ar: 'موظف / عهدة', en: 'Employee / custody' } },
            { value: 'expense',       label: { ar: 'مصروف مباشر', en: 'Direct expense' } }
          ]
        }),
        F('beneficiary', 'اسم المستفيد', 'Beneficiary', 'text', { required: true, section: SEC.main }),
        F('supplier', 'المورد (إن وُجد)', 'Supplier (if any)', 'ref', { ref: 'suppliers', refLabel: 'name', section: SEC.link }),
        F('supplierInvoice', 'الفاتورة المرتبطة', 'Related invoice', 'ref', { ref: 'supplierInvoices', refLabel: 'docNo', section: SEC.link }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('cashAccount', 'الخزينة / البنك', 'Cash / bank account', 'ref', { ref: 'cashAccounts', refLabel: 'name', required: true, section: SEC.money }),
        F('method', 'طريقة الدفع', 'Payment method', 'select', { options: PAY_METHOD, default: 'transfer', section: SEC.money }),
        F('chequeNo', 'رقم الشيك / التحويل', 'Cheque / transfer no.', 'text', { section: SEC.money }),
        F('amount', 'المبلغ', 'Amount', 'money', { required: true, section: SEC.money }),
        F('description', 'البيان', 'Description', 'text', { required: true, section: SEC.main, full: true }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'receipts', table: 'receipts', group: 'finance', icon: 'arrow-down',
      label: { ar: 'سندات القبض', en: 'Receipt vouchers' },
      desc: { ar: 'تحصيل النقدية من العملاء', en: 'Collections from customers' },
      workflow: true, docPrefix: 'RV', amountField: 'amount',
      search: ['docNo', 'payer', 'description'],
      columns: ['docNo', 'date', 'customer', 'cashAccount', 'amount', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('customer', 'العميل', 'Customer', 'ref', { ref: 'customers', refLabel: 'name', required: true, section: SEC.main }),
        F('payer', 'اسم الدافع', 'Payer name', 'text', { section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('clientIPC', 'المستخلص المرتبط', 'Related IPC', 'ref', { ref: 'clientIPCs', refLabel: 'docNo', section: SEC.link }),
        F('cashAccount', 'الخزينة / البنك', 'Cash / bank account', 'ref', { ref: 'cashAccounts', refLabel: 'name', required: true, section: SEC.money }),
        F('method', 'طريقة التحصيل', 'Collection method', 'select', { options: PAY_METHOD, default: 'transfer', section: SEC.money }),
        F('chequeNo', 'رقم الشيك / التحويل', 'Cheque / transfer no.', 'text', { section: SEC.money }),
        F('amount', 'المبلغ', 'Amount', 'money', { required: true, section: SEC.money }),
        F('description', 'البيان', 'Description', 'text', { required: true, section: SEC.main, full: true }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'cashAccounts', table: 'cashAccounts', group: 'finance', icon: 'wallet',
      label: { ar: 'الخزائن والبنوك', en: 'Cash & bank accounts' },
      desc: { ar: 'حسابات الخزينة والبنوك والعهد', en: 'Treasury, bank and custody accounts' },
      search: ['code', 'name', 'bankName'],
      columns: ['code', 'name', 'kind', 'bankName', 'openingBalance', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'الاسم', 'Name', 'text', { required: true, section: SEC.main }),
        F('kind', 'النوع', 'Type', 'select', {
          required: true, section: SEC.main, options: [
            { value: 'cash',    label: { ar: 'خزينة نقدية', en: 'Cash box' } },
            { value: 'bank',    label: { ar: 'حساب بنكي', en: 'Bank account' } },
            { value: 'custody', label: { ar: 'عهدة موظف', en: 'Employee custody' } }
          ]
        }),
        F('bankName', 'اسم البنك', 'Bank name', 'text', { section: SEC.extra }),
        F('accountNo', 'رقم الحساب / IBAN', 'Account no. / IBAN', 'text', { section: SEC.extra }),
        F('custodian', 'المسؤول / صاحب العهدة', 'Custodian', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('currency', 'العملة', 'Currency', 'text', { default: 'EGP', section: SEC.money }),
        F('openingBalance', 'الرصيد الافتتاحي', 'Opening balance', 'money', { section: SEC.money }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'items', table: 'items', group: 'finance', icon: 'box',
      label: { ar: 'الأصناف', en: 'Items master' },
      desc: { ar: 'بطاقات أصناف المخازن', en: 'Inventory item cards' },
      search: ['code', 'name'],
      columns: ['code', 'name', 'category', 'baseUnit', 'reorderLevel', 'lastPrice', 'status'],
      fields: [
        F('code', 'كود الصنف', 'Item code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم الصنف', 'Item name', 'text', { required: true, section: SEC.main }),
        F('category', 'المجموعة', 'Category', 'select', {
          section: SEC.main, options: [
            { value: 'cement',    label: { ar: 'أسمنت ومونة', en: 'Cement & mortar' } },
            { value: 'steel',     label: { ar: 'حديد تسليح', en: 'Reinforcement steel' } },
            { value: 'aggregate', label: { ar: 'ركام ورمل وزلط', en: 'Aggregates' } },
            { value: 'block',     label: { ar: 'طوب ومباني', en: 'Blocks & masonry' } },
            { value: 'finishing', label: { ar: 'تشطيبات', en: 'Finishing' } },
            { value: 'electrical',label: { ar: 'كهرباء', en: 'Electrical' } },
            { value: 'plumbing',  label: { ar: 'صحي وسباكة', en: 'Plumbing' } },
            { value: 'tools',     label: { ar: 'عدد وأدوات', en: 'Tools' } },
            { value: 'fuel',      label: { ar: 'وقود وزيوت', en: 'Fuel & lubricants' } },
            { value: 'other',     label: { ar: 'أخرى', en: 'Other' } }
          ]
        }),
        F('baseUnit', 'وحدة القياس', 'Base unit', 'select', { options: UNITS, required: true, section: SEC.main }),
        F('valuation', 'طريقة التقييم', 'Valuation method', 'select', {
          section: SEC.money, default: 'wavg', options: [
            { value: 'wavg', label: { ar: 'المتوسط المرجح المتحرك', en: 'Moving weighted average' } },
            { value: 'fifo', label: { ar: 'الوارد أولاً صادر أولاً (FIFO)', en: 'FIFO' } }
          ]
        }),
        F('reorderLevel', 'حد إعادة الطلب', 'Reorder level', 'number', { section: SEC.money }),
        F('lastPrice', 'آخر سعر شراء', 'Last purchase price', 'money', { section: SEC.money }),
        F('defaultCostItem', 'بند التكلفة الافتراضي', 'Default cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('specs', 'المواصفات الفنية', 'Technical specification', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'warehouses', table: 'warehouses', group: 'finance', icon: 'home',
      label: { ar: 'المخازن', en: 'Warehouses' },
      desc: { ar: 'مخازن الشركة والمواقع', en: 'Company and site warehouses' },
      search: ['code', 'name', 'location'],
      columns: ['code', 'name', 'location', 'keeper', 'project', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم المخزن', 'Warehouse name', 'text', { required: true, section: SEC.main }),
        F('location', 'الموقع', 'Location', 'text', { section: SEC.main }),
        F('keeper', 'أمين المخزن', 'Storekeeper', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('project', 'المشروع المرتبط', 'Linked project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'stockIssues', table: 'stockIssues', group: 'finance', icon: 'send',
      label: { ar: 'إذون الصرف المخزني', en: 'Stock issue notes' },
      desc: { ar: 'صرف المواد للمشروعات والإدارات', en: 'Issue materials to projects and departments' },
      workflow: true, docPrefix: 'SIS', amountField: 'subTotal',
      search: ['docNo', 'purpose'],
      columns: ['docNo', 'date', 'warehouse', 'project', 'subTotal', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('warehouse', 'المخزن الصارف', 'Issuing warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', required: true, section: SEC.link }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', required: true, section: SEC.link }),
        F('receivedBy', 'المستلم', 'Received by', 'ref', { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
        F('purpose', 'الغرض من الصرف', 'Purpose', 'text', { required: true, section: SEC.main, full: true }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'الأصناف المنصرفة', en: 'Issued items' },
        fields: [
          F('item', 'الصنف', 'Item', 'ref', { ref: 'items', refLabel: 'name', required: true, width: '38%' }),
          F('unit', 'الوحدة', 'Unit', 'select', { options: UNITS, width: '16%' }),
          F('qty', 'الكمية', 'Qty', 'number', { width: '16%' }),
          F('price', 'تكلفة الوحدة', 'Unit cost', 'money', { width: '15%' }),
          F('lineTotal', 'الإجمالي', 'Total', 'calc', { width: '15%', formula: 'qty*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'إجمالي التكلفة', en: 'Total cost' } }],
        stockEffect: 'out'
      }
    },

    {
      id: 'stockTransfers', table: 'stockTransfers', group: 'finance', icon: 'shuffle',
      label: { ar: 'التحويلات المخزنية', en: 'Stock transfers' },
      desc: { ar: 'نقل المواد بين المخازن', en: 'Move materials between warehouses' },
      workflow: true, docPrefix: 'STR', amountField: 'subTotal',
      search: ['docNo'],
      columns: ['docNo', 'date', 'fromWarehouse', 'toWarehouse', 'subTotal', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('fromWarehouse', 'من مخزن', 'From warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', required: true, section: SEC.link }),
        F('toWarehouse', 'إلى مخزن', 'To warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', required: true, section: SEC.link }),
        F('driver', 'السائق / الناقل', 'Driver / carrier', 'text', { section: SEC.main }),
        F('vehicle', 'رقم السيارة', 'Vehicle no.', 'text', { section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'الأصناف المحوَّلة', en: 'Transferred items' },
        fields: [
          F('item', 'الصنف', 'Item', 'ref', { ref: 'items', refLabel: 'name', required: true, width: '40%' }),
          F('unit', 'الوحدة', 'Unit', 'select', { options: UNITS, width: '18%' }),
          F('qty', 'الكمية', 'Qty', 'number', { width: '18%' }),
          F('price', 'تكلفة الوحدة', 'Unit cost', 'money', { width: '12%' }),
          F('lineTotal', 'الإجمالي', 'Total', 'calc', { width: '12%', formula: 'qty*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'إجمالي القيمة', en: 'Total value' } }],
        stockEffect: 'transfer'
      }
    },

    {
      id: 'stockCounts', table: 'stockCounts', group: 'finance', icon: 'clipboard',
      label: { ar: 'الجرد والتسويات', en: 'Stock count & adjustments' },
      desc: { ar: 'الجرد الفعلي وتسوية العجز والزيادة', en: 'Physical count and shortage/surplus adjustment' },
      workflow: true, docPrefix: 'SC', amountField: 'subTotal',
      search: ['docNo'],
      columns: ['docNo', 'date', 'warehouse', 'subTotal', 'status'],
      fields: [
        F('date', 'تاريخ الجرد', 'Count date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('warehouse', 'المخزن', 'Warehouse', 'ref', { ref: 'warehouses', refLabel: 'name', required: true, section: SEC.link }),
        F('committee', 'لجنة الجرد', 'Count committee', 'text', { section: SEC.main, full: true }),
        F('reason', 'سبب الفروق', 'Reason for differences', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'نتيجة الجرد', en: 'Count result' },
        fields: [
          F('item', 'الصنف', 'Item', 'ref', { ref: 'items', refLabel: 'name', required: true, width: '30%' }),
          F('bookQty', 'رصيد الدفاتر', 'Book qty', 'number', { width: '16%' }),
          F('countedQty', 'الجرد الفعلي', 'Counted qty', 'number', { width: '16%' }),
          F('diff', 'الفرق', 'Difference', 'calc', { width: '14%', formula: 'countedQty-bookQty' }),
          F('price', 'تكلفة الوحدة', 'Unit cost', 'money', { width: '12%' }),
          F('lineTotal', 'قيمة الفرق', 'Value', 'calc', { width: '12%', formula: '(countedQty-bookQty)*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'صافي التسوية', en: 'Net adjustment' } }],
        stockEffect: 'adjust'
      }
    },

    /* ============ PROJECTS & TECHNICAL OFFICE ============ */
    {
      id: 'projects', table: 'projects', group: 'projects', icon: 'building',
      label: { ar: 'المشروعات', en: 'Projects' },
      desc: { ar: 'سجل مشروعات الشركة', en: 'Company project register' },
      search: ['code', 'name', 'location'],
      columns: ['code', 'name', 'customer', 'contractValue', 'progress', 'status'],
      fields: [
        F('code', 'كود المشروع', 'Project code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم المشروع', 'Project name', 'text', { required: true, section: SEC.main }),
        F('customer', 'العميل', 'Customer', 'ref', { ref: 'customers', refLabel: 'name', required: true, section: SEC.main }),
        F('location', 'الموقع', 'Location', 'text', { section: SEC.main }),
        F('manager', 'مدير المشروع', 'Project manager', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('type', 'نوع المشروع', 'Project type', 'select', {
          section: SEC.main, options: [
            { value: 'residential', label: { ar: 'سكني', en: 'Residential' } },
            { value: 'commercial',  label: { ar: 'تجاري', en: 'Commercial' } },
            { value: 'industrial',  label: { ar: 'صناعي', en: 'Industrial' } },
            { value: 'infra',       label: { ar: 'بنية تحتية وطرق', en: 'Infrastructure & roads' } },
            { value: 'finishing',   label: { ar: 'تشطيبات', en: 'Finishing works' } }
          ]
        }),
        F('contractValue', 'قيمة العقد', 'Contract value', 'money', { required: true, section: SEC.money }),
        F('budgetTotal', 'إجمالي الموازنة', 'Total budget', 'money', { section: SEC.money }),
        F('advancePct', 'نسبة الدفعة المقدمة %', 'Advance payment %', 'percent', { section: SEC.money, default: 10 }),
        F('retentionPct', 'نسبة الاحتجاز %', 'Retention %', 'percent', { section: SEC.money, default: 5 }),
        F('startDate', 'تاريخ البداية', 'Start date', 'date', { section: SEC.dates }),
        F('endDate', 'تاريخ الانتهاء المخطط', 'Planned end date', 'date', { section: SEC.dates }),
        F('progress', 'نسبة الإنجاز %', 'Progress %', 'percent', { section: SEC.main, default: 0 }),
        F('status', 'الحالة', 'Status', 'select', { options: PROJECT_STATUS, default: 'active', required: true, section: SEC.main }),
        F('scope', 'نطاق الأعمال', 'Scope of works', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'budgets', table: 'budgets', group: 'projects', icon: 'target',
      label: { ar: 'موازنات المشروعات', en: 'Project budgets' },
      desc: { ar: 'موازنة كل مشروع حسب بنود التكلفة', en: 'Per-project budget by cost item' },
      workflow: true, docPrefix: 'BUD', amountField: 'subTotal',
      search: ['docNo', 'version'],
      columns: ['docNo', 'project', 'version', 'date', 'subTotal', 'status'],
      fields: [
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('version', 'رقم النسخة', 'Version', 'text', { required: true, default: 'V1', section: SEC.main }),
        F('date', 'تاريخ الإعداد', 'Prepared on', 'date', { required: true, default: 'today', section: SEC.main }),
        F('preparedBy', 'أعدها', 'Prepared by', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('notes', 'مبررات التعديل', 'Revision justification', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'بنود الموازنة', en: 'Budget lines' },
        fields: [
          F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', required: true, width: '32%' }),
          F('description', 'الوصف', 'Description', 'text', { width: '24%' }),
          F('unit', 'الوحدة', 'Unit', 'select', { options: UNITS, width: '12%' }),
          F('qty', 'الكمية', 'Qty', 'number', { width: '11%' }),
          F('price', 'سعر الوحدة', 'Unit price', 'money', { width: '11%' }),
          F('lineTotal', 'الإجمالي', 'Total', 'calc', { width: '10%', formula: 'qty*price' })
        ],
        totals: [{ field: 'lineTotal', target: 'subTotal', label: { ar: 'إجمالي الموازنة', en: 'Total budget' } }]
      }
    },

    {
      id: 'clientContracts', table: 'clientContracts', group: 'projects', icon: 'file-signature',
      label: { ar: 'عقود العملاء', en: 'Client contracts' },
      desc: { ar: 'العقود الأصلية وأوامر التغيير', en: 'Original contracts and change orders' },
      search: ['contractNo', 'title'],
      columns: ['contractNo', 'project', 'customer', 'originalValue', 'changeOrders', 'revisedValue', 'status'],
      fields: [
        F('contractNo', 'رقم العقد', 'Contract no.', 'text', { required: true, section: SEC.main }),
        F('title', 'موضوع العقد', 'Contract title', 'text', { required: true, section: SEC.main, full: true }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('customer', 'العميل', 'Customer', 'ref', { ref: 'customers', refLabel: 'name', required: true, section: SEC.main }),
        F('signDate', 'تاريخ التوقيع', 'Signature date', 'date', { section: SEC.dates }),
        F('startDate', 'تاريخ البدء', 'Start date', 'date', { section: SEC.dates }),
        F('durationMonths', 'مدة التنفيذ (شهر)', 'Duration (months)', 'number', { section: SEC.dates }),
        F('originalValue', 'القيمة الأصلية', 'Original value', 'money', { required: true, section: SEC.money }),
        F('changeOrders', 'قيمة أوامر التغيير', 'Change orders value', 'money', { section: SEC.money }),
        F('revisedValue', 'القيمة المعدلة', 'Revised value', 'calc', { section: SEC.money, formula: 'originalValue+changeOrders' }),
        F('advancePct', 'الدفعة المقدمة %', 'Advance %', 'percent', { section: SEC.money }),
        F('retentionPct', 'الاحتجاز %', 'Retention %', 'percent', { section: SEC.money }),
        F('penaltyTerms', 'شروط الغرامات', 'Penalty terms', 'textarea', { section: SEC.extra, full: true }),
        F('status', 'الحالة', 'Status', 'select', {
          default: 'active', section: SEC.main, options: [
            { value: 'draft',  label: { ar: 'تحت التفاوض', en: 'Under negotiation' } },
            { value: 'active', label: { ar: 'ساري', en: 'Active' } },
            { value: 'closed', label: { ar: 'منتهي', en: 'Closed' } }
          ]
        })
      ]
    },

    {
      id: 'clientIPCs', table: 'clientIPCs', group: 'projects', icon: 'receipt',
      label: { ar: 'مستخلصات العملاء', en: 'Client IPCs (progress invoices)' },
      desc: { ar: 'المستخلصات الدورية المقدمة للعميل', en: 'Periodic interim payment certificates' },
      workflow: true, docPrefix: 'IPC', amountField: 'netDue',
      search: ['docNo', 'periodLabel'],
      columns: ['docNo', 'date', 'project', 'ipcNo', 'currentWork', 'netDue', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('customer', 'العميل', 'Customer', 'ref', { ref: 'customers', refLabel: 'name', required: true, section: SEC.main }),
        F('contract', 'العقد', 'Contract', 'ref', { ref: 'clientContracts', refLabel: 'contractNo', section: SEC.link }),
        F('ipcNo', 'رقم المستخلص', 'IPC number', 'number', { required: true, section: SEC.main }),
        F('periodLabel', 'الفترة', 'Period', 'text', { section: SEC.main }),
        F('cumulativeWork', 'قيمة الأعمال التراكمية', 'Cumulative work value', 'money', { required: true, section: SEC.money }),
        F('previousWork', 'قيمة الأعمال السابقة', 'Previous work value', 'money', { section: SEC.money }),
        F('currentWork', 'أعمال هذا المستخلص', 'Current period work', 'calc', { section: SEC.money, formula: 'cumulativeWork-previousWork' }),
        F('advanceRecovery', 'استرداد الدفعة المقدمة', 'Advance recovery', 'money', { section: SEC.money }),
        F('retention', 'الاحتجاز', 'Retention', 'money', { section: SEC.money }),
        F('deductions', 'خصومات أخرى', 'Other deductions', 'money', { section: SEC.money }),
        F('taxRate', 'نسبة الضريبة', 'Tax rate', 'select', { options: TAX_RATES, default: '14', section: SEC.money }),
        F('netDue', 'صافي المستحق', 'Net due', 'calc', { section: SEC.money,
          formula: '(cumulativeWork-previousWork)-advanceRecovery-retention-deductions+((cumulativeWork-previousWork)*taxRate/100)' }),
        F('collectedAmount', 'المحصَّل', 'Collected', 'money', { readonly: true, section: SEC.money }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'subcontractors', table: 'subcontractors', group: 'projects', icon: 'hard-hat',
      label: { ar: 'مقاولو الباطن', en: 'Subcontractors' },
      desc: { ar: 'بيانات مقاولي الباطن', en: 'Subcontractor master data' },
      search: ['code', 'name', 'trade'],
      columns: ['code', 'name', 'trade', 'phone', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم المقاول', 'Subcontractor name', 'text', { required: true, section: SEC.main }),
        F('trade', 'التخصص', 'Trade', 'select', {
          section: SEC.main, options: [
            { value: 'concrete',  label: { ar: 'أعمال خرسانية', en: 'Concrete works' } },
            { value: 'masonry',   label: { ar: 'مباني ومحارة', en: 'Masonry & plaster' } },
            { value: 'electrical',label: { ar: 'أعمال كهربائية', en: 'Electrical' } },
            { value: 'plumbing',  label: { ar: 'أعمال صحية', en: 'Plumbing' } },
            { value: 'hvac',      label: { ar: 'تكييف وتهوية', en: 'HVAC' } },
            { value: 'finishing', label: { ar: 'تشطيبات', en: 'Finishing' } },
            { value: 'earthwork', label: { ar: 'أعمال ترابية', en: 'Earthworks' } },
            { value: 'aluminum',  label: { ar: 'ألوميتال وزجاج', en: 'Aluminium & glazing' } }
          ]
        }),
        F('contactPerson', 'مسؤول الاتصال', 'Contact person', 'text', { section: SEC.contact }),
        F('phone', 'الهاتف', 'Phone', 'phone', { section: SEC.contact }),
        F('email', 'البريد الإلكتروني', 'Email', 'email', { section: SEC.contact }),
        F('taxId', 'البطاقة الضريبية', 'Tax ID', 'text', { section: SEC.extra }),
        F('openingBalance', 'الرصيد الافتتاحي', 'Opening balance', 'money', { section: SEC.money }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'subContracts', table: 'subContracts', group: 'projects', icon: 'file-text',
      label: { ar: 'عقود مقاولي الباطن', en: 'Subcontracts' },
      desc: { ar: 'عقود الباطن وقيمها وشروطها', en: 'Subcontract values and terms' },
      search: ['contractNo', 'title'],
      columns: ['contractNo', 'project', 'subcontractor', 'contractValue', 'status'],
      fields: [
        F('contractNo', 'رقم العقد', 'Contract no.', 'text', { required: true, section: SEC.main }),
        F('title', 'موضوع العقد', 'Subject', 'text', { required: true, section: SEC.main, full: true }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('subcontractor', 'المقاول', 'Subcontractor', 'ref', { ref: 'subcontractors', refLabel: 'name', required: true, section: SEC.main }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('contractValue', 'قيمة العقد', 'Contract value', 'money', { required: true, section: SEC.money }),
        F('advancePct', 'الدفعة المقدمة %', 'Advance %', 'percent', { section: SEC.money }),
        F('retentionPct', 'الاحتجاز %', 'Retention %', 'percent', { section: SEC.money, default: 5 }),
        F('signDate', 'تاريخ التوقيع', 'Signature date', 'date', { section: SEC.dates }),
        F('startDate', 'تاريخ البدء', 'Start date', 'date', { section: SEC.dates }),
        F('endDate', 'تاريخ الانتهاء', 'End date', 'date', { section: SEC.dates }),
        F('status', 'الحالة', 'Status', 'select', {
          default: 'active', section: SEC.main, options: [
            { value: 'draft',  label: { ar: 'مسودة', en: 'Draft' } },
            { value: 'active', label: { ar: 'ساري', en: 'Active' } },
            { value: 'closed', label: { ar: 'منتهي', en: 'Closed' } }
          ]
        }),
        F('scope', 'نطاق الأعمال', 'Scope', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'subIPCs', table: 'subIPCs', group: 'projects', icon: 'list-check',
      label: { ar: 'مستخلصات مقاولي الباطن', en: 'Subcontractor IPCs' },
      desc: { ar: 'مستخلصات وأعمال مقاولي الباطن', en: 'Subcontractor progress claims' },
      workflow: true, docPrefix: 'SIPC', amountField: 'netDue',
      search: ['docNo'],
      columns: ['docNo', 'date', 'project', 'subcontractor', 'currentWork', 'netDue', 'status'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('subcontractor', 'المقاول', 'Subcontractor', 'ref', { ref: 'subcontractors', refLabel: 'name', required: true, section: SEC.main }),
        F('contract', 'العقد', 'Subcontract', 'ref', { ref: 'subContracts', refLabel: 'contractNo', section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('ipcNo', 'رقم المستخلص', 'IPC no.', 'number', { required: true, section: SEC.main }),
        F('cumulativeWork', 'الأعمال التراكمية', 'Cumulative work', 'money', { required: true, section: SEC.money }),
        F('previousWork', 'الأعمال السابقة', 'Previous work', 'money', { section: SEC.money }),
        F('currentWork', 'أعمال هذا المستخلص', 'Current work', 'calc', { section: SEC.money, formula: 'cumulativeWork-previousWork' }),
        F('advanceRecovery', 'استرداد الدفعة المقدمة', 'Advance recovery', 'money', { section: SEC.money }),
        F('retention', 'الاحتجاز', 'Retention', 'money', { section: SEC.money }),
        F('penalties', 'غرامات وخصومات', 'Penalties & deductions', 'money', { section: SEC.money }),
        F('withholding', 'خصم وتحصيل', 'Withholding tax', 'money', { section: SEC.money }),
        F('netDue', 'صافي المستحق', 'Net due', 'calc', { section: SEC.money,
          formula: '(cumulativeWork-previousWork)-advanceRecovery-retention-penalties-withholding' }),
        F('paidAmount', 'المسدد', 'Paid', 'money', { readonly: true, section: SEC.money }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'drawings', table: 'drawings', group: 'projects', icon: 'compass',
      label: { ar: 'المكتب الفني والرسومات', en: 'Technical office & drawings' },
      desc: { ar: 'ضبط الرسومات والمستندات الفنية ومراجعاتها', en: 'Drawing register, revisions and transmittals' },
      search: ['docNo', 'title', 'drawingNo'],
      columns: ['drawingNo', 'title', 'project', 'discipline', 'revision', 'drawingStatus', 'issueDate'],
      fields: [
        F('drawingNo', 'رقم الرسم', 'Drawing no.', 'text', { required: true, section: SEC.main }),
        F('title', 'عنوان الرسم', 'Drawing title', 'text', { required: true, section: SEC.main, full: true }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('discipline', 'التخصص', 'Discipline', 'select', {
          section: SEC.main, options: [
            { value: 'arch',       label: { ar: 'معماري', en: 'Architectural' } },
            { value: 'struct',     label: { ar: 'إنشائي', en: 'Structural' } },
            { value: 'electrical', label: { ar: 'كهربائي', en: 'Electrical' } },
            { value: 'mechanical', label: { ar: 'ميكانيكي', en: 'Mechanical' } },
            { value: 'plumbing',   label: { ar: 'صحي', en: 'Plumbing' } },
            { value: 'site',       label: { ar: 'أعمال موقع', en: 'Site works' } }
          ]
        }),
        F('revision', 'رقم المراجعة', 'Revision', 'text', { default: 'R0', section: SEC.main }),
        F('drawingStatus', 'حالة الرسم', 'Drawing status', 'select', {
          default: 'ifc', section: SEC.main, options: [
            { value: 'ifr',       label: { ar: 'للمراجعة (IFR)', en: 'For review (IFR)' } },
            { value: 'ifa',       label: { ar: 'للاعتماد (IFA)', en: 'For approval (IFA)' } },
            { value: 'ifc',       label: { ar: 'للتنفيذ (IFC)', en: 'For construction (IFC)' } },
            { value: 'asbuilt',   label: { ar: 'كما نُفذ (As-Built)', en: 'As-built' } },
            { value: 'superseded',label: { ar: 'ملغى / مستبدل', en: 'Superseded' } }
          ]
        }),
        F('issueDate', 'تاريخ الإصدار', 'Issue date', 'date', { section: SEC.dates }),
        F('preparedBy', 'أعده', 'Prepared by', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('fileRef', 'مرجع الملف / الرابط', 'File reference / link', 'text', { section: SEC.extra, full: true,
          help: { ar: 'ضع هنا رابط الملف على Google Drive أو OneDrive', en: 'Paste the Google Drive / OneDrive link here' } }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'siteReports', table: 'siteReports', group: 'projects', icon: 'sun',
      label: { ar: 'التقارير اليومية للمواقع', en: 'Daily site reports' },
      desc: { ar: 'يوميات الموقع والعمالة والمعدات', en: 'Site diary: manpower, equipment and progress' },
      search: ['docNo', 'workDone'],
      columns: ['date', 'project', 'weather', 'manpower', 'equipmentCount', 'createdBy'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
        F('weather', 'حالة الطقس', 'Weather', 'select', {
          section: SEC.main, options: [
            { value: 'clear', label: { ar: 'صافٍ', en: 'Clear' } },
            { value: 'hot',   label: { ar: 'حار', en: 'Hot' } },
            { value: 'rain',  label: { ar: 'ممطر', en: 'Rainy' } },
            { value: 'wind',  label: { ar: 'رياح', en: 'Windy' } },
            { value: 'dust',  label: { ar: 'أتربة', en: 'Dusty' } }
          ]
        }),
        F('manpower', 'عدد العمالة', 'Manpower count', 'number', { section: SEC.main }),
        F('equipmentCount', 'عدد المعدات', 'Equipment count', 'number', { section: SEC.main }),
        F('workDone', 'الأعمال المنفذة', 'Work executed', 'textarea', { required: true, section: SEC.main, full: true }),
        F('delays', 'المعوقات والتأخيرات', 'Delays & obstacles', 'textarea', { section: SEC.extra, full: true }),
        F('visitors', 'الزيارات', 'Site visits', 'text', { section: SEC.extra, full: true }),
        F('safetyNotes', 'ملاحظات السلامة', 'Safety notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'equipment', table: 'equipment', group: 'projects', icon: 'truck-2',
      label: { ar: 'المعدات والسيارات', en: 'Equipment & fleet' },
      desc: { ar: 'سجل المعدات والسيارات وحالتها', en: 'Equipment and vehicle register' },
      search: ['code', 'name', 'plateNo'],
      columns: ['code', 'name', 'kind', 'plateNo', 'project', 'condition', 'status'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم المعدة', 'Equipment name', 'text', { required: true, section: SEC.main }),
        F('kind', 'النوع', 'Type', 'select', {
          section: SEC.main, options: [
            { value: 'excavator', label: { ar: 'حفار', en: 'Excavator' } },
            { value: 'loader',    label: { ar: 'لودر', en: 'Loader' } },
            { value: 'crane',     label: { ar: 'ونش / رافعة', en: 'Crane' } },
            { value: 'mixer',     label: { ar: 'خلاطة خرسانة', en: 'Concrete mixer' } },
            { value: 'truck',     label: { ar: 'شاحنة', en: 'Truck' } },
            { value: 'car',       label: { ar: 'سيارة', en: 'Car' } },
            { value: 'generator', label: { ar: 'مولد كهرباء', en: 'Generator' } },
            { value: 'compactor', label: { ar: 'هراس / دكاكة', en: 'Compactor' } },
            { value: 'other',     label: { ar: 'أخرى', en: 'Other' } }
          ]
        }),
        F('plateNo', 'رقم اللوحة / الشاسيه', 'Plate / chassis no.', 'text', { section: SEC.main }),
        F('project', 'المشروع الحالي', 'Current project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('operator', 'المشغل / السائق', 'Operator / driver', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('ownership', 'الملكية', 'Ownership', 'select', {
          default: 'owned', section: SEC.main, options: [
            { value: 'owned',  label: { ar: 'مملوكة', en: 'Owned' } },
            { value: 'rented', label: { ar: 'مؤجرة', en: 'Rented' } }
          ]
        }),
        F('purchaseValue', 'قيمة الشراء / الإيجار الشهري', 'Purchase value / monthly rent', 'money', { section: SEC.money }),
        F('condition', 'الحالة الفنية', 'Condition', 'select', {
          default: 'good', section: SEC.main, options: [
            { value: 'good',        label: { ar: 'جيدة', en: 'Good' } },
            { value: 'maintenance', label: { ar: 'تحت الصيانة', en: 'Under maintenance' } },
            { value: 'broken',      label: { ar: 'متوقفة', en: 'Out of service' } }
          ]
        }),
        F('licenseExpiry', 'انتهاء الترخيص', 'Licence expiry', 'date', { section: SEC.dates }),
        F('lastMaintenance', 'آخر صيانة', 'Last maintenance', 'date', { section: SEC.dates }),
        F('status', 'الحالة', 'Status', 'select', { options: YESNO, default: 'active', section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'equipmentLogs', table: 'equipmentLogs', group: 'projects', icon: 'wrench',
      label: { ar: 'حركة وصيانة المعدات', en: 'Equipment usage & maintenance' },
      desc: { ar: 'ساعات التشغيل والوقود والصيانة', en: 'Operating hours, fuel and maintenance' },
      search: ['docNo', 'description'],
      columns: ['date', 'equipment', 'logType', 'hours', 'cost', 'project'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('equipment', 'المعدة', 'Equipment', 'ref', { ref: 'equipment', refLabel: 'name', required: true, section: SEC.main }),
        F('logType', 'نوع الحركة', 'Log type', 'select', {
          required: true, default: 'usage', section: SEC.main, options: [
            { value: 'usage',       label: { ar: 'تشغيل', en: 'Usage' } },
            { value: 'fuel',        label: { ar: 'تموين وقود', en: 'Refuelling' } },
            { value: 'maintenance', label: { ar: 'صيانة', en: 'Maintenance' } },
            { value: 'breakdown',   label: { ar: 'عطل', en: 'Breakdown' } }
          ]
        }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', section: SEC.link }),
        F('hours', 'ساعات التشغيل', 'Operating hours', 'number', { section: SEC.main }),
        F('fuelLitres', 'كمية الوقود (لتر)', 'Fuel (litres)', 'number', { section: SEC.main }),
        F('cost', 'التكلفة', 'Cost', 'money', { section: SEC.money }),
        F('description', 'البيان', 'Description', 'text', { section: SEC.main, full: true }),
        F('nextService', 'موعد الصيانة القادمة', 'Next service due', 'date', { section: SEC.dates })
      ]
    },

    /* ============ HR & ADMINISTRATION ============ */
    {
      id: 'employees', table: 'employees', group: 'people', icon: 'user',
      label: { ar: 'الموظفون', en: 'Employees' },
      desc: { ar: 'دليل موظفي الشركة وبياناتهم', en: 'Company employee directory' },
      search: ['code', 'name', 'jobTitle', 'nationalId'],
      columns: ['code', 'name', 'jobTitle', 'department', 'project', 'basicSalary', 'status'],
      fields: [
        F('code', 'الرقم الوظيفي', 'Employee no.', 'text', { required: true, section: SEC.main }),
        F('name', 'الاسم', 'Full name', 'text', { required: true, section: SEC.main }),
        F('jobTitle', 'المسمى الوظيفي', 'Job title', 'text', { required: true, section: SEC.main }),
        F('department', 'الإدارة', 'Department', 'select', {
          required: true, section: SEC.main, options: [
            { value: 'management',  label: { ar: 'الإدارة العليا', en: 'Executive management' } },
            { value: 'finance',     label: { ar: 'الحسابات والمالية', en: 'Finance & accounting' } },
            { value: 'procurement', label: { ar: 'المشتريات', en: 'Procurement' } },
            { value: 'stores',      label: { ar: 'المخازن', en: 'Stores' } },
            { value: 'projects',    label: { ar: 'المشروعات والتنفيذ', en: 'Projects & execution' } },
            { value: 'technical',   label: { ar: 'المكتب الفني', en: 'Technical office' } },
            { value: 'hr',          label: { ar: 'الموارد البشرية', en: 'Human resources' } },
            { value: 'legal',       label: { ar: 'الشؤون القانونية', en: 'Legal affairs' } },
            { value: 'it',          label: { ar: 'تقنية المعلومات', en: 'Information technology' } },
            { value: 'equipment',   label: { ar: 'المعدات والنقل', en: 'Equipment & transport' } },
            { value: 'admin',       label: { ar: 'الشؤون الإدارية', en: 'Administration' } }
          ]
        }),
        F('project', 'المشروع / الموقع', 'Project / site', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('nationalId', 'الرقم القومي', 'National ID', 'text', { section: SEC.extra }),
        F('phone', 'الهاتف', 'Phone', 'phone', { section: SEC.contact }),
        F('email', 'البريد الإلكتروني', 'Email', 'email', { section: SEC.contact }),
        F('address', 'العنوان', 'Address', 'text', { section: SEC.contact, full: true }),
        F('hireDate', 'تاريخ التعيين', 'Hire date', 'date', { section: SEC.dates }),
        F('contractType', 'نوع التعاقد', 'Contract type', 'select', {
          section: SEC.main, options: [
            { value: 'permanent', label: { ar: 'دائم', en: 'Permanent' } },
            { value: 'temporary', label: { ar: 'مؤقت', en: 'Temporary' } },
            { value: 'daily',     label: { ar: 'يومية', en: 'Daily wage' } }
          ]
        }),
        F('contractEnd', 'انتهاء العقد', 'Contract end', 'date', { section: SEC.dates }),
        F('basicSalary', 'الراتب الأساسي', 'Basic salary', 'money', { section: SEC.money }),
        F('allowances', 'البدلات', 'Allowances', 'money', { section: SEC.money }),
        F('insuranceNo', 'الرقم التأميني', 'Insurance no.', 'text', { section: SEC.extra }),
        F('bankAccount', 'الحساب البنكي', 'Bank account', 'text', { section: SEC.extra }),
        F('status', 'الحالة', 'Status', 'select', {
          default: 'active', section: SEC.main, options: [
            { value: 'active',    label: { ar: 'على رأس العمل', en: 'Active' } },
            { value: 'vacation',  label: { ar: 'في إجازة', en: 'On leave' } },
            { value: 'suspended', label: { ar: 'موقوف', en: 'Suspended' } },
            { value: 'left',      label: { ar: 'انتهت خدمته', en: 'Left' } }
          ]
        }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'attendance', table: 'attendance', group: 'people', icon: 'clock',
      label: { ar: 'الحضور والانصراف', en: 'Attendance' },
      desc: { ar: 'تسجيل حضور الموظفين والعمالة', en: 'Daily attendance records' },
      search: ['docNo'],
      columns: ['date', 'employee', 'project', 'checkIn', 'checkOut', 'overtimeHours', 'attStatus'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('employee', 'الموظف', 'Employee', 'ref', { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
        F('project', 'الموقع', 'Site', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('attStatus', 'الحالة', 'Status', 'select', {
          required: true, default: 'present', section: SEC.main, options: [
            { value: 'present', label: { ar: 'حاضر', en: 'Present' } },
            { value: 'absent',  label: { ar: 'غائب', en: 'Absent' } },
            { value: 'leave',   label: { ar: 'إجازة', en: 'On leave' } },
            { value: 'mission', label: { ar: 'مأمورية', en: 'Field mission' } },
            { value: 'sick',    label: { ar: 'إجازة مرضية', en: 'Sick leave' } }
          ]
        }),
        F('checkIn', 'وقت الحضور', 'Check-in', 'text', { section: SEC.main, help: { ar: 'مثال 08:00', en: 'e.g. 08:00' } }),
        F('checkOut', 'وقت الانصراف', 'Check-out', 'text', { section: SEC.main, help: { ar: 'مثال 17:00', en: 'e.g. 17:00' } }),
        F('overtimeHours', 'ساعات إضافية', 'Overtime hours', 'number', { section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'text', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'leaves', table: 'leaves', group: 'people', icon: 'calendar',
      label: { ar: 'طلبات الإجازات', en: 'Leave requests' },
      desc: { ar: 'طلبات الإجازات واعتمادها', en: 'Leave requests and approvals' },
      workflow: true, docPrefix: 'LV',
      search: ['docNo', 'reason'],
      columns: ['docNo', 'employee', 'leaveType', 'fromDate', 'toDate', 'days', 'status'],
      fields: [
        F('employee', 'الموظف', 'Employee', 'ref', { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
        F('leaveType', 'نوع الإجازة', 'Leave type', 'select', {
          required: true, section: SEC.main, options: [
            { value: 'annual',    label: { ar: 'سنوية', en: 'Annual' } },
            { value: 'sick',      label: { ar: 'مرضية', en: 'Sick' } },
            { value: 'casual',    label: { ar: 'عارضة', en: 'Casual' } },
            { value: 'unpaid',    label: { ar: 'بدون أجر', en: 'Unpaid' } },
            { value: 'maternity', label: { ar: 'وضع', en: 'Maternity' } }
          ]
        }),
        F('fromDate', 'من تاريخ', 'From date', 'date', { required: true, section: SEC.dates }),
        F('toDate', 'إلى تاريخ', 'To date', 'date', { required: true, section: SEC.dates }),
        F('days', 'عدد الأيام', 'Number of days', 'number', { required: true, section: SEC.main }),
        F('substitute', 'البديل أثناء الغياب', 'Substitute', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('reason', 'السبب', 'Reason', 'textarea', { required: true, section: SEC.main, full: true })
      ]
    },

    {
      id: 'payroll', table: 'payroll', group: 'people', icon: 'banknote',
      label: { ar: 'مسير الرواتب', en: 'Payroll runs' },
      desc: { ar: 'مسير رواتب شهري لكل الموظفين', en: 'Monthly payroll run' },
      workflow: true, docPrefix: 'PR', amountField: 'netTotal',
      search: ['docNo', 'period'],
      columns: ['docNo', 'period', 'date', 'employeeCount', 'netTotal', 'status'],
      fields: [
        F('period', 'الشهر', 'Period', 'text', { required: true, section: SEC.main, help: { ar: 'مثال: 2026-08', en: 'e.g. 2026-08' } }),
        F('date', 'تاريخ الإعداد', 'Prepared on', 'date', { required: true, default: 'today', section: SEC.main }),
        F('project', 'المشروع (اختياري)', 'Project (optional)', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('employeeCount', 'عدد الموظفين', 'Employee count', 'number', { readonly: true, section: SEC.main }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ],
      lines: {
        label: { ar: 'بنود المسير', en: 'Payroll lines' },
        fields: [
          F('employee', 'الموظف', 'Employee', 'ref', { ref: 'employees', refLabel: 'name', required: true, width: '24%' }),
          F('basic', 'الأساسي', 'Basic', 'money', { width: '13%' }),
          F('allowances', 'البدلات', 'Allowances', 'money', { width: '13%' }),
          F('overtime', 'إضافي', 'Overtime', 'money', { width: '12%' }),
          F('deductions', 'خصومات', 'Deductions', 'money', { width: '12%' }),
          F('insurance', 'تأمينات', 'Insurance', 'money', { width: '12%' }),
          F('lineTotal', 'الصافي', 'Net', 'calc', { width: '14%', formula: 'basic+allowances+overtime-deductions-insurance' })
        ],
        totals: [{ field: 'lineTotal', target: 'netTotal', label: { ar: 'إجمالي صافي الرواتب', en: 'Total net payroll' } }]
      }
    },

    {
      id: 'legalDocs', table: 'legalDocs', group: 'people', icon: 'scale',
      label: { ar: 'الشؤون القانونية', en: 'Legal affairs' },
      desc: { ar: 'العقود والتراخيص والقضايا والمستندات الرسمية', en: 'Contracts, licences, cases and official documents' },
      search: ['docNo', 'title', 'refNo'],
      columns: ['refNo', 'title', 'docType', 'party', 'expiryDate', 'legalStatus'],
      fields: [
        F('refNo', 'رقم المرجع', 'Reference no.', 'text', { required: true, section: SEC.main }),
        F('title', 'العنوان', 'Title', 'text', { required: true, section: SEC.main, full: true }),
        F('docType', 'النوع', 'Type', 'select', {
          required: true, section: SEC.main, options: [
            { value: 'licence',   label: { ar: 'ترخيص / سجل', en: 'Licence / registry' } },
            { value: 'contract',  label: { ar: 'عقد', en: 'Contract' } },
            { value: 'case',      label: { ar: 'قضية', en: 'Legal case' } },
            { value: 'insurance', label: { ar: 'وثيقة تأمين', en: 'Insurance policy' } },
            { value: 'guarantee', label: { ar: 'خطاب ضمان', en: 'Bank guarantee' } },
            { value: 'other',     label: { ar: 'أخرى', en: 'Other' } }
          ]
        }),
        F('party', 'الطرف الآخر', 'Counterparty', 'text', { section: SEC.main }),
        F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', section: SEC.link }),
        F('value', 'القيمة', 'Value', 'money', { section: SEC.money }),
        F('issueDate', 'تاريخ الإصدار', 'Issue date', 'date', { section: SEC.dates }),
        F('expiryDate', 'تاريخ الانتهاء', 'Expiry date', 'date', { section: SEC.dates }),
        F('responsible', 'المسؤول', 'Responsible', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('legalStatus', 'الحالة', 'Status', 'select', {
          default: 'valid', section: SEC.main, options: [
            { value: 'valid',    label: { ar: 'ساري', en: 'Valid' } },
            { value: 'expiring', label: { ar: 'قارب الانتهاء', en: 'Expiring soon' } },
            { value: 'expired',  label: { ar: 'منتهي', en: 'Expired' } },
            { value: 'ongoing',  label: { ar: 'جارٍ التقاضي', en: 'Ongoing' } },
            { value: 'closed',   label: { ar: 'مغلق', en: 'Closed' } }
          ]
        }),
        F('fileRef', 'مرجع الملف / الرابط', 'File reference / link', 'text', { section: SEC.extra, full: true }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'itAssets', table: 'itAssets', group: 'people', icon: 'monitor',
      label: { ar: 'أصول تقنية المعلومات', en: 'IT assets' },
      desc: { ar: 'أجهزة ولابتوبات وطابعات وخطوط', en: 'Computers, printers, phones and lines' },
      search: ['code', 'name', 'serialNo'],
      columns: ['code', 'name', 'assetType', 'assignedTo', 'serialNo', 'assetStatus'],
      fields: [
        F('code', 'الكود', 'Code', 'text', { required: true, section: SEC.main }),
        F('name', 'اسم الأصل', 'Asset name', 'text', { required: true, section: SEC.main }),
        F('assetType', 'النوع', 'Type', 'select', {
          section: SEC.main, options: [
            { value: 'laptop',  label: { ar: 'لابتوب', en: 'Laptop' } },
            { value: 'desktop', label: { ar: 'كمبيوتر مكتبي', en: 'Desktop' } },
            { value: 'printer', label: { ar: 'طابعة', en: 'Printer' } },
            { value: 'phone',   label: { ar: 'هاتف / خط', en: 'Phone / line' } },
            { value: 'network', label: { ar: 'أجهزة شبكة', en: 'Network device' } },
            { value: 'software',label: { ar: 'ترخيص برمجي', en: 'Software licence' } }
          ]
        }),
        F('assignedTo', 'مسلّم إلى', 'Assigned to', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('serialNo', 'الرقم التسلسلي', 'Serial number', 'text', { section: SEC.extra }),
        F('purchaseDate', 'تاريخ الشراء', 'Purchase date', 'date', { section: SEC.dates }),
        F('purchaseValue', 'قيمة الشراء', 'Purchase value', 'money', { section: SEC.money }),
        F('warrantyEnd', 'انتهاء الضمان', 'Warranty end', 'date', { section: SEC.dates }),
        F('assetStatus', 'الحالة', 'Status', 'select', {
          default: 'inuse', section: SEC.main, options: [
            { value: 'inuse',   label: { ar: 'قيد الاستخدام', en: 'In use' } },
            { value: 'spare',   label: { ar: 'احتياطي', en: 'Spare' } },
            { value: 'repair',  label: { ar: 'تحت الإصلاح', en: 'Under repair' } },
            { value: 'retired', label: { ar: 'مستبعد', en: 'Retired' } }
          ]
        }),
        F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'itTickets', table: 'itTickets', group: 'people', icon: 'life-buoy',
      label: { ar: 'طلبات الدعم الفني', en: 'IT support tickets' },
      desc: { ar: 'بلاغات وطلبات الدعم الفني', en: 'IT issues and support requests' },
      docPrefix: 'TIC',
      search: ['docNo', 'subject'],
      columns: ['docNo', 'date', 'subject', 'requester', 'priority', 'ticketStatus'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('subject', 'الموضوع', 'Subject', 'text', { required: true, section: SEC.main, full: true }),
        F('requester', 'مقدم الطلب', 'Requester', 'ref', { ref: 'employees', refLabel: 'name', required: true, section: SEC.main }),
        F('category', 'التصنيف', 'Category', 'select', {
          section: SEC.main, options: [
            { value: 'hardware', label: { ar: 'أجهزة', en: 'Hardware' } },
            { value: 'software', label: { ar: 'برامج', en: 'Software' } },
            { value: 'network',  label: { ar: 'شبكة وإنترنت', en: 'Network & internet' } },
            { value: 'access',   label: { ar: 'صلاحيات ودخول', en: 'Access & permissions' } },
            { value: 'other',    label: { ar: 'أخرى', en: 'Other' } }
          ]
        }),
        F('priority', 'الأولوية', 'Priority', 'select', {
          default: 'normal', section: SEC.main, options: [
            { value: 'low',    label: { ar: 'منخفضة', en: 'Low' } },
            { value: 'normal', label: { ar: 'عادية', en: 'Normal' } },
            { value: 'high',   label: { ar: 'عالية', en: 'High' } },
            { value: 'urgent', label: { ar: 'عاجلة', en: 'Urgent' } }
          ]
        }),
        F('assignedTo', 'مسند إلى', 'Assigned to', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.main }),
        F('ticketStatus', 'الحالة', 'Status', 'select', {
          default: 'open', section: SEC.main, options: [
            { value: 'open',        label: { ar: 'مفتوح', en: 'Open' } },
            { value: 'inprogress',  label: { ar: 'جارٍ العمل', en: 'In progress' } },
            { value: 'waiting',     label: { ar: 'بانتظار المستخدم', en: 'Waiting on user' } },
            { value: 'resolved',    label: { ar: 'تم الحل', en: 'Resolved' } },
            { value: 'closed',      label: { ar: 'مغلق', en: 'Closed' } }
          ]
        }),
        F('description', 'وصف المشكلة', 'Problem description', 'textarea', { required: true, section: SEC.main, full: true }),
        F('resolution', 'الحل المتخذ', 'Resolution', 'textarea', { section: SEC.extra, full: true })
      ]
    },

    {
      id: 'announcements', table: 'announcements', group: 'people', icon: 'megaphone',
      label: { ar: 'التعميمات والقرارات الإدارية', en: 'Announcements & memos' },
      desc: { ar: 'تعميمات الإدارة لكل الموظفين', en: 'Management circulars for all staff' },
      docPrefix: 'ANN',
      search: ['docNo', 'title', 'body'],
      columns: ['docNo', 'date', 'title', 'audience', 'importance'],
      fields: [
        F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
        F('title', 'العنوان', 'Title', 'text', { required: true, section: SEC.main, full: true }),
        F('audience', 'الموجّه إلى', 'Audience', 'select', {
          default: 'all', section: SEC.main, options: [
            { value: 'all',      label: { ar: 'جميع الموظفين', en: 'All employees' } },
            { value: 'managers', label: { ar: 'المديرون فقط', en: 'Managers only' } },
            { value: 'sites',    label: { ar: 'مواقع التنفيذ', en: 'Project sites' } },
            { value: 'office',   label: { ar: 'المقر الرئيسي', en: 'Head office' } }
          ]
        }),
        F('importance', 'الأهمية', 'Importance', 'select', {
          default: 'normal', section: SEC.main, options: [
            { value: 'normal', label: { ar: 'عادي', en: 'Normal' } },
            { value: 'high',   label: { ar: 'هام', en: 'Important' } },
            { value: 'urgent', label: { ar: 'عاجل', en: 'Urgent' } }
          ]
        }),
        F('effectiveDate', 'تاريخ السريان', 'Effective date', 'date', { section: SEC.dates }),
        F('body', 'نص التعميم', 'Body', 'textarea', { required: true, section: SEC.main, full: true })
      ]
    }
  ];

  /* ---------- group definitions (menu order) ---------- */
  var GROUPS = [
    { id: 'main',     label: { ar: 'الرئيسية', en: 'Main' } },
    { id: 'finance',  label: { ar: 'المالية والمشتريات والمخازن', en: 'Finance, Procurement & Stores' } },
    { id: 'projects', label: { ar: 'المشروعات والمكتب الفني', en: 'Projects & Technical Office' } },
    { id: 'people',   label: { ar: 'الموارد البشرية والإدارة', en: 'HR & Administration' } },
    { id: 'system',   label: { ar: 'التقارير والنظام', en: 'Reports & System' } }
  ];

  /* ---------- lookup helpers ---------- */
  var byId = {};
  MODULES.forEach(function (m) { byId[m.id] = m; });

  function get(id) { return byId[id] || null; }

  function field(moduleId, fieldName) {
    var m = get(moduleId);
    if (!m) return null;
    for (var i = 0; i < m.fields.length; i++) if (m.fields[i].name === fieldName) return m.fields[i];
    return null;
  }

  /* Resolve a ref value (an id) into a readable label */
  function refLabel(f, value) {
    if (!value) return '—';
    var target = get(f.ref);
    if (!target) return value;
    var row = Store.find(target.table, value);
    if (!row) return value;
    return row[f.refLabel || 'name'] || row.name || row.docNo || row.code || value;
  }

  /* Resolve a select value into its label object */
  function optionLabel(f, value) {
    if (!f.options) return value;
    for (var i = 0; i < f.options.length; i++) {
      if (String(f.options[i].value) === String(value)) return L(f.options[i].label);
    }
    return value || '—';
  }

  global.Schema = {
    MODULES: MODULES, GROUPS: GROUPS,
    UNITS: UNITS, COST_TYPES: COST_TYPES, TAX_RATES: TAX_RATES,
    PROJECT_STATUS: PROJECT_STATUS, PAY_METHOD: PAY_METHOD, YESNO: YESNO,
    get: get, field: field, refLabel: refLabel, optionLabel: optionLabel,
    list: function () { return MODULES; }
  };
})(window);
