/* =========================================================================
   agents.js — وكلاء الذكاء الاصطناعي المتخصصون لكل قسم
               Specialist AI agents, one per department
   -------------------------------------------------------------------------
   الفرق بين هذا و assistant-pro.js:

     assistant-pro  = مساعد. تسأله فيجيب.
     agents         = خبير. له تخصص ومهام ينفّذها بنفسه ويخرج بنتيجة.

   كل وكيل هنا خبير في مجال واحد داخل مقاولات الطرق والكباري في مصر:
     · له شخصية ومرجعية مهنية (persona) تُرسل للنموذج اللغوي
     · له مرجع فني (reference) بأرقام ومعادلات حقيقية يعتمد عليها
     · له مهام (jobs) ينفّذها على بيانات الشركة الفعلية ويعيد نتيجة مكتوبة

   الوكيل لا يعتمد ولا يصرف ولا يحذف شيئاً أبداً. يقترح ويحسب ويكتشف فقط.
   An agent never approves, pays or deletes. It computes, detects and drafts.

   Load AFTER: knowledge.js · inspector.js · inspector-departments.js ·
               assistant-pro.js
   ========================================================================= */
(function (global) {
  'use strict';

  function S(t) { return (global.Store && Store.all(t)) || []; }
  function find(t, id) { return (global.Store && Store.find(t, id)) || null; }
  function n(v) { return Number(v) || 0; }
  function since(d) { return d ? Math.round((Date.now() - new Date(d)) / 86400000) : 0; }
  function money(v) { return n(v).toLocaleString('ar-EG', { maximumFractionDigits: 0 }); }
  function nm(t, id) { var r = find(t, id); return r ? (r.name || r.docNo || r.title || '') : '—'; }
  function approved(t) { return S(t).filter(function (r) { return r.status === 'approved'; }); }
  function live(t) { return S(t).filter(function (r) { return r.status !== 'reversed' && r.status !== 'void'; }); }

  /* ٢٥ أغسطس ٢٠٢٦ — إصلاح: لا يوجد حقل اسمه collected على مستخلصات العميل.
     التحصيل يُسجَّل كسند قبض منفصل يشير إلى المستخلص، لا كخانة عليه.
     نفس حساب Dashboard.analytics.receivable في pages/dashboard.js.
     25 August 2026 fix: there is no `collected` field on a client IPC.
     Collection is recorded as a separate receipt voucher pointing back at
     the IPC, not as a box on the IPC itself. Matches
     Dashboard.analytics.receivable in pages/dashboard.js. */
  function collectedOf(ipcId) {
    var s = 0;
    approved('receipts').forEach(function (r) { if (r.clientIPC === ipcId) s += n(r.amount); });
    return s;
  }

  /* نفس الفكرة لفواتير الموردين: المسدَّد سند صرف منفصل يشير للفاتورة،
     لا خانة «paid» على الفاتورة نفسها — لا يوجد حقل كهذا في schema.js.
     Same idea for supplier invoices: what's paid is a separate payment
     voucher pointing at the invoice, not a `paid` box on the invoice
     itself — no such field exists in schema.js. */
  function paidOf(invId) {
    var s = 0;
    approved('payments').forEach(function (p) { if (p.supplierInvoice === invId) s += n(p.amount); });
    return s;
  }

  /* ٢٥ أغسطس ٢٠٢٦ — لكل شاشة حقل مبلغ مختلف؛ لا يوجد حقل موحّد اسمه
     totalValue في أي مكان. المصدر: pages/dashboard.js وهي الحسبة
     المعتمدة فعلاً على اللوحة الرئيسية.
     25 August 2026 — each screen has its own amount field; there is no
     shared `totalValue` field anywhere. Source: pages/dashboard.js,
     which is the calculation already trusted on the main dashboard. */
  var AMOUNT = {
    supplierInvoices: 'subTotal',
    stockIssues:      'subTotal',
    subIPCs:          'currentWork',
    journal:          'totalDebit'
  };

  /* نتيجة مهمة واحدة */
  function R(title, lines, severity, numbers) {
    return { title: title, lines: lines || [], severity: severity || 'info', numbers: numbers || null };
  }

  var AGENTS = {};

  /* ═══════════════════════════════════════════════════════════════════
     ١ · وكيل الموارد البشرية — خبير في قوى عاملة المقاولات
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.hr = {
    id: 'hr',
    name: { ar: 'خبير الموارد البشرية للمقاولات', en: 'Construction HR specialist' },
    roles: ['hr', 'admin', 'gm'],
    persona: {
      ar: 'أنت خبير موارد بشرية بخبرة عشرين عاماً في شركات المقاولات المصرية، ' +
          'متخصص في قوى عاملة مشروعات الطرق والكباري: العمالة اليومية والموسمية، ' +
          'العمل بالمواقع البعيدة، بدلات السفر والاغتراب، الورديات، وتحميل تكلفة ' +
          'العمالة على بنود المشروع. تعرف قانون العمل المصري والتأمينات الاجتماعية ' +
          'وأثرهما على عقود العمالة المؤقتة. تجيب بلغة عملية مباشرة، وتذكر دائماً ' +
          'الأثر المالي على المشروع لا على الشركة فقط.',
      en: 'You are a construction HR specialist with twenty years in Egyptian ' +
          'contracting, focused on the workforce of road and bridge projects.'
    },
    reference: {
      ar: [
        'عمالة المقاولات ثلاثة أنواع: دائمة بعقد، ومؤقتة بعقد محدد المدة، ويومية. ولكلٍّ معاملة مختلفة في التأمينات والإنهاء.',
        'تكلفة العامل الحقيقية ليست الأجر: أضف التأمينات وبدل السفر والسكن والانتقال والوجبة. غالباً تزيد ٣٠٪ عن الأجر الأساسي.',
        'العمالة في المواقع البعيدة لها بدل اغتراب ومعدل دوران أعلى — خطّط لذلك في الموازنة.',
        'ساعات إضافية كثيرة على شخص واحد تعني نقص عمالة أو خطأ تسجيل، وكلاهما يكلّف.',
        'تكلفة العمالة يجب أن تُحمّل على بند التكلفة في المشروع، وإلا يبدو المشروع رابحاً وهو ليس كذلك.',
        'الحضور يُسجَّل يوم حدوثه. التسجيل الأسبوعي من الذاكرة يفتح باب الأجور الوهمية.'
      ]
    },
    jobs: {
      /* من في المسير وليس له حضور؟ */
      ghostPayroll: {
        label: { ar: 'من في مسير الرواتب بلا حضور مسجّل؟', en: 'Anyone on payroll without attendance?' },
        run: function () {
          var att = {}, out = [];
          S('attendance').forEach(function (a) { if (a.employee) att[a.employee] = (att[a.employee] || 0) + 1; });
          var emps = S('employees').filter(function (e) { return e.status === 'active'; });
          emps.forEach(function (e) {
            if (att[e.id]) return;
            out.push('• ' + (e.name || e.id) + ' — لا يوجد أي سجل حضور');
          });
          if (!out.length) return R('كل من في المسير له حضور مسجّل.', [], 'ok');
          return R('يوجد ' + out.length + ' موظف نشط بلا سجل حضور', out.concat([
            '', 'المطلوب: تأكد أنهم يعملون فعلاً، أو أوقف حساباتهم قبل مسير الشهر القادم.'
          ]), out.length > 3 ? 'high' : 'medium', { count: out.length });
        }
      },
      /* تكلفة عمالة غير محمّلة على مشروع */
      unallocatedLabour: {
        label: { ar: 'تكلفة عمالة لم تُحمّل على مشروع', en: 'Labour cost not charged to a project' },
        run: function () {
          var bad = approved('labourAllocation').filter(function (l) { return !l.project || !l.costItem; });
          if (!bad.length) return R('كل كشوف العمالة محمّلة على مشروع وبند تكلفة.', [], 'ok');
          var men = 0;
          var lines = bad.slice(0, 12).map(function (l) {
            var c = (l.lines || []).reduce(function (s, x) { return s + (n(x.count) || 1); }, 0);
            men += c;
            return '• ' + (l.docNo || '') + ' — ' + c + ' عامل — ' +
                   (l.project ? 'بلا بند تكلفة' : 'بلا مشروع');
          });
          return R(bad.length + ' كشف عمالة بلا تحميل صحيح', lines.concat([
            '', 'الأثر: تكلفة ' + men + ' عامل تظهر كمصروف عام، فيبدو المشروع أربح مما هو.',
            'المطلوب: حدّد المشروع وبند التكلفة في كل كشف.'
          ]), 'high', { sheets: bad.length, workers: men });
        }
      },
      /* إضافي غير طبيعي */
      overtimeOutliers: {
        label: { ar: 'ساعات إضافية غير طبيعية', en: 'Unusual overtime' },
        run: function () {
          var ot = {};
          approved('labourAllocation').forEach(function (l) {
            (l.lines || []).forEach(function (x) {
              if (!x.employee || !n(x.overtime)) return;
              ot[x.employee] = (ot[x.employee] || 0) + n(x.overtime);
            });
          });
          var rows = Object.keys(ot).map(function (k) { return { id: k, h: ot[k] }; })
                       .sort(function (a, b) { return b.h - a.h; });
          if (!rows.length) return R('لا توجد ساعات إضافية مسجّلة.', [], 'ok');
          var avg = rows.reduce(function (s, r) { return s + r.h; }, 0) / rows.length;
          var high = rows.filter(function (r) { return r.h > avg * 2 && r.h > 20; });
          if (!high.length) return R('توزيع الساعات الإضافية طبيعي.',
            ['المتوسط ' + Math.round(avg) + ' ساعة للفرد.'], 'ok');
          return R(high.length + ' حالة ساعات إضافية تزيد على ضعف المتوسط',
            high.slice(0, 10).map(function (r) {
              return '• ' + nm('employees', r.id) + ' — ' + r.h + ' ساعة (المتوسط ' + Math.round(avg) + ')';
            }).concat(['', 'السبب غالباً أحد اثنين: نقص عمالة في تخصص معيّن، أو خطأ في التسجيل. كلاهما يستحق المراجعة.']),
            'medium', { cases: high.length, average: Math.round(avg) });
        }
      },
      /* عقود ووثائق منتهية */
      expiringContracts: {
        label: { ar: 'عقود ومستندات موظفين تقترب من الانتهاء', en: 'Expiring employee contracts' },
        run: function () {
          var out = [];
          S('employees').forEach(function (e) {
            if (e.status !== 'active') return;
            ['contractEnd', 'nationalIdExpiry', 'drivingLicenceExpiry'].forEach(function (f) {
              if (!e[f]) return;
              var d = Math.round((new Date(e[f]) - Date.now()) / 86400000);
              if (d > 45) return;
              out.push('• ' + (e.name || '') + ' — ' +
                       (d < 0 ? 'انتهى منذ ' + Math.abs(d) + ' يوماً' : 'ينتهي خلال ' + d + ' يوماً'));
            });
          });
          if (!out.length) return R('لا توجد عقود أو مستندات تقترب من الانتهاء.', [], 'ok');
          return R(out.length + ' عقد أو مستند يحتاج تجديداً', out.slice(0, 15).concat([
            '', 'المطلوب: جدّد أو أنهِ رسمياً. العقد المنتهي الذي يستمر العمل به يتحول لعقد غير محدد المدة.'
          ]), 'high', { count: out.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · وكيل المكتب الفني — خبير الكميات والمستخلصات والتصميم
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.technical = {
    id: 'technical',
    name: { ar: 'خبير المكتب الفني والكميات', en: 'Technical office & quantities specialist' },
    roles: ['technical', 'project_manager', 'admin', 'gm'],
    persona: {
      ar: 'أنت مهندس مكتب فني أول بخبرة في مشروعات الطرق والكباري في مصر. ' +
          'تخصصك: حصر الكميات، إعداد المستخلصات، مراجعة الرسومات والمواصفات، ' +
          'الموازنات التقديرية، أوامر التغيير، ومطالبات تمديد المدة. ' +
          'تعرف بنود الكود المصري لأعمال الطرق، وتعرف أن الفرق بين الربح والخسارة ' +
          'في المقاولات يكمن في دقة الحصر وسرعة تقديم المستخلص. ' +
          'تجيب بأرقام ومعادلات، لا بعبارات عامة.',
      en: 'You are a senior technical-office engineer for Egyptian road and bridge projects.'
    },
    reference: {
      ar: [
        'المستخلص التراكمي لا ينقص أبداً عن سابقه. النقص يعني خطأ حصر أو سحب كمية معتمدة.',
        'صافي المستخلص = قيمة الأعمال المنفذة − الاحتجاز − استرداد الدفعة المقدمة − الخصومات + الأعمال الإضافية المعتمدة.',
        'الاحتجاز نسبة من قيمة الأعمال، يُفرج عن نصفه عند الاستلام الابتدائي والنصف الآخر بعد فترة الضمان.',
        'استرداد الدفعة المقدمة يبدأ عند نسبة إنجاز معينة ويُستقطع بنسبة ثابتة من كل مستخلص.',
        'كل يوم تأخير في تقديم المستخلص هو يوم تأخير في التحصيل. الشركة تموّل العميل بلا فائدة.',
        'أمر التغيير يُوقّع قبل التنفيذ لا بعده. بعد التنفيذ تفقد القدرة التفاوضية كاملة.',
        'حصر ناقص = مال نُفّذ ولن يُدفع أبداً. راجع الحصر مقابل التقارير اليومية والرفع المساحي.',
        'الرسمة المستخدمة في التنفيذ يجب أن تكون آخر مراجعة معتمدة، وإلا فالعمل معرّض للهدم.'
      ]
    },
    jobs: {
      ipcRegression: {
        label: { ar: 'مستخلص تراكمي أقل من سابقه', en: 'Cumulative IPC went backwards' },
        run: function () {
          var out = [];
          ['clientIPCs', 'subIPCs'].forEach(function (t) {
            var byKey = {};
            live(t).forEach(function (r) {
              var k = (r.project || '') + '|' + (r.contract || '') + '|' + (r.subcontractor || '');
              (byKey[k] = byKey[k] || []).push(r);
            });
            Object.keys(byKey).forEach(function (k) {
              var rows = byKey[k].sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
              for (var i = 1; i < rows.length; i++) {
                var prev = n(rows[i - 1].cumulativeWork);
                var cur = n(rows[i].cumulativeWork);
                if (prev > 0 && cur > 0 && cur < prev) {
                  out.push('• ' + (rows[i].docNo || '') + ' — التراكمي ' + money(cur) +
                           ' بعد أن كان ' + money(prev) + ' (فرق ' + money(prev - cur) + ' ج)');
                }
              }
            });
          });
          if (!out.length) return R('كل المستخلصات التراكمية متصاعدة بشكل سليم.', [], 'ok');
          return R(out.length + ' مستخلص تراكمي أقل من سابقه', out.concat([
            '', 'هذا إمّا خطأ حصر أو سحب كمية سبق اعتمادها. راجع قبل تقديم المستخلص القادم.'
          ]), 'critical', { count: out.length });
        }
      },
      lateIPC: {
        label: { ar: 'مستخلصات متأخرة عن التقديم أو التحصيل', en: 'IPCs late to submit or collect' },
        run: function () {
          var lateSubmit = [], lateCollect = [], total = 0;
          live('clientIPCs').forEach(function (r) {
            var age = since(r.date);
            if (r.status === 'draft' && age > 10)
              lateSubmit.push('• ' + (r.docNo || '') + ' — مسودة منذ ' + age + ' يوماً');
            if (r.status === 'approved' && collectedOf(r.id) < n(r.netDue) - 0.5 && age > 60) {
              var v = n(r.netDue) - collectedOf(r.id);
              total += v;
              lateCollect.push('• ' + (r.docNo || '') + ' — ' + money(v) + ' ج — منذ ' + age + ' يوماً');
            }
          });
          var lines = [];
          if (lateSubmit.length) lines = lines.concat(['مستخلصات لم تُقدَّم بعد:'], lateSubmit, ['']);
          if (lateCollect.length) lines = lines.concat(['مستخلصات معتمدة ولم تُحصَّل:'], lateCollect, ['',
            'إجمالي سيولة محبوسة: ' + money(total) + ' جنيه.']);
          if (!lines.length) return R('لا توجد مستخلصات متأخرة.', [], 'ok');
          return R('متابعة المستخلصات', lines, total > 0 ? 'high' : 'medium', { locked: total });
        }
      },
      budgetOverrun: {
        label: { ar: 'بنود تكلفة تجاوزت الموازنة', en: 'Cost items over budget' },
        run: function () {
          var budget = {}, spend = {}, out = [];
          live('budgets').forEach(function (b) {
            (b.lines || []).forEach(function (l) {
              if (!l.costItem) return;
              var k = (b.project || '') + '|' + l.costItem;
              budget[k] = (budget[k] || 0) + n(l.lineTotal);
            });
          });
          /* ٢٥ أغسطس ٢٠٢٦ — السداد (payments) استُبعد عمداً: هو غالباً سداد
             لفاتورة مورد محسوبة بالفعل ضمن supplierInvoices، وضمّه هنا
             يحسب نفس المصروف مرتين. نفس استبعاد pages/dashboard.js.
             25 August 2026 — payments deliberately excluded: it's usually
             settling a supplier invoice already counted above, and
             including it here double-counts the same cost. Matches the
             same exclusion in pages/dashboard.js. */
          Object.keys(AMOUNT).forEach(function (t) {
            approved(t).forEach(function (r) {
              if (!r.project || !r.costItem) return;
              var k = r.project + '|' + r.costItem;
              spend[k] = (spend[k] || 0) + n(r[AMOUNT[t]]);
            });
          });
          Object.keys(spend).forEach(function (k) {
            var b = budget[k]; if (!b) return;
            var s = spend[k];
            if (s <= b) return;
            var pct = Math.round((s - b) / b * 100);
            var p = k.split('|');
            out.push('• ' + nm('projects', p[0]) + ' — ' + nm('costItems', p[1]) +
                     ' — تجاوز ' + pct + '٪ (' + money(s) + ' مقابل ' + money(b) + ')');
          });
          if (!out.length) return R('لا يوجد بند تجاوز موازنته.', [], 'ok');
          return R(out.length + ' بند تكلفة تجاوز الموازنة',
            out.sort().slice(0, 15).concat(['', 'راجع كل بند: هل هو خطأ تحميل، أم كمية إضافية تحتاج أمر تغيير، أم تجاوز حقيقي؟']),
            'high', { count: out.length });
        }
      },
      drawingControl: {
        label: { ar: 'رسومات ملغاة ما زالت مستخدمة', en: 'Superseded drawings still in use' },
        run: function () {
          var bad = live('docRegister').filter(function (d) {
            return d.status === 'superseded' && d.issuedToSite && !d.oldCopyRecalled;
          });
          if (!bad.length) return R('لا توجد نسخ ملغاة في المواقع.', [], 'ok');
          return R(bad.length + ' نسخة ملغاة ما زالت في الموقع',
            bad.map(function (d) {
              return '• ' + (d.docCode || '') + ' ' + (d.revision || '') + ' — ' + (d.title || '');
            }).concat(['', 'أخطر حالة في المكتب الفني. اسحب النسخ اليوم وخذ توقيع الاستلام.']),
            'critical', { count: bad.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · وكيل المالية — خبير التدفق النقدي وربحية المشروع
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.finance = {
    id: 'finance',
    name: { ar: 'خبير مالية المقاولات', en: 'Contracting finance specialist' },
    roles: ['finance_manager', 'accountant', 'admin', 'gm'],
    persona: {
      ar: 'أنت مدير مالي بخبرة في شركات المقاولات المصرية. تعرف أن المقاولات ' +
          'تُفلس بسبب السيولة لا بسبب الخسارة: أرباح على الورق وخزينة فارغة. ' +
          'تخصصك: التدفق النقدي، ربحية كل مشروع على حدة، الاحتجازات، الدفعات ' +
          'المقدمة، الضريبة على القيمة المضافة والخصم والتحصيل، وتكلفة رأس المال ' +
          'العامل. تتحدث بالأرقام وتربط كل ملاحظة بأثرها على الخزينة.',
      en: 'You are a finance director for Egyptian contracting companies.'
    },
    reference: {
      ar: [
        'المقاولات تُفلس من السيولة لا من الخسارة. راقب التدفق قبل الربح.',
        'رصيد البنك ليس مؤشر سيولة. المؤشر هو التدفق المتوقع بعد الالتزامات القادمة.',
        'الالتزامات غير المفوترة (بضاعة استُلمت ولم تصل فاتورتها) ديون قادمة لم تظهر بعد.',
        'كل مستخلص غير محصّل هو قرض بلا فائدة للعميل. احسب تكلفته على الشركة.',
        'الاحتجاز المستحق الإفراج ولم يُطالَب به مال جاهز متروك.',
        'المصروف الذي يُحمّل على «مصروفات عامة» بدل المشروع يجعل مشروعاً خاسراً يبدو رابحاً.',
        'السداد المكرر أشهر خسارة صامتة: يُكتشف بعد شهور إن اكتُشف.',
        'الخصم والتحصيل الضريبي له مواعيد توريد. التأخير غرامة مؤكدة.'
      ]
    },
    jobs: {
      cashPosition: {
        label: { ar: 'موقف السيولة والالتزامات القادمة', en: 'Cash position and upcoming obligations' },
        run: function () {
          var cash = 0;
          /* لا يوجد حقل balance على cashAccounts — فقط openingBalance.
             الرصيد الحقيقي = الافتتاحي + القبض − الصرف، وهي حسبة
             Dashboard.analytics.cashBalance المعتمدة فعلاً.
             There is no `balance` field on cashAccounts — only
             `openingBalance`. The real balance is opening + receipts −
             payments, the same calculation Dashboard.analytics.cashBalance
             already trusts. */
          S('cashAccounts').forEach(function (a) {
            try { cash += Dashboard.analytics.cashBalance(a.id); }
            catch (e) { cash += n(a.openingBalance); }
          });
          var payable = 0, unbilled = 0, receivable = 0;
          live('supplierInvoices').forEach(function (i) {
            if (i.status === 'approved') payable += Math.max(0, n(i.grandTotal) - paidOf(i.id));
          });
          /* الربط يسير عكس ما كان مفترَضاً: الفاتورة تشير لإذن الاستلام،
             لا العكس — لا يوجد حقل invoiced أو supplierInvoice على
             goodsReceipts نفسها.
             The link runs the other way round from what was assumed: the
             invoice points at the goods receipt, not the reverse — there
             is no `invoiced`/`supplierInvoice` field on goodsReceipts
             itself. */
          var billedGRNs = {};
          live('supplierInvoices').forEach(function (i) { if (i.goodsReceipt) billedGRNs[i.goodsReceipt] = 1; });
          approved('goodsReceipts').forEach(function (g) {
            if (!billedGRNs[g.id]) unbilled += n(g.grandTotal);
          });
          live('clientIPCs').forEach(function (r) {
            if (r.status === 'approved') receivable += Math.max(0, n(r.netDue) - collectedOf(r.id));
          });
          var net = cash + receivable - payable - unbilled;
          var lines = [
            'الخزينة والبنوك ............... ' + money(cash) + ' ج',
            'مستحقات لدى العملاء .......... ' + money(receivable) + ' ج',
            'التزامات للموردين (مفوترة) ... ' + money(payable) + ' ج',
            'التزامات غير مفوترة .......... ' + money(unbilled) + ' ج',
            '─────────────────────────────',
            'الصافي المتوقع ............... ' + money(net) + ' ج'
          ];
          if (unbilled > 0) lines.push('', 'تنبيه: ' + money(unbilled) + ' ج بضاعة استُلمت ولم تصل فاتورتها بعد. هذه ديون قادمة لم تظهر في الدفاتر.');
          if (receivable > payable * 2) lines.push('', 'ملاحظة: مستحقاتك أكبر بكثير من التزاماتك — أنت تموّل عملاءك من سيولتك.');
          return R('موقف السيولة', lines, net < 0 ? 'critical' : (unbilled > cash ? 'high' : 'info'),
                   { cash: cash, receivable: receivable, payable: payable, unbilled: unbilled, net: net });
        }
      },
      projectMargin: {
        label: { ar: 'ربحية كل مشروع', en: 'Margin per project' },
        run: function () {
          var rev = {}, cost = {};
          live('clientIPCs').forEach(function (r) {
            if (r.status !== 'approved' || !r.project) return;
            rev[r.project] = (rev[r.project] || 0) + n(r.netDue);
          });
          Object.keys(AMOUNT).forEach(function (t) {
            approved(t).forEach(function (r) {
              if (!r.project) return;
              cost[r.project] = (cost[r.project] || 0) + n(r[AMOUNT[t]]);
            });
          });
          var keys = Object.keys(rev).concat(Object.keys(cost)).filter(function (v, i, a) { return a.indexOf(v) === i; });
          if (!keys.length) return R('لا توجد بيانات كافية لحساب الربحية بعد.', [], 'info');
          var lines = [], losing = 0;
          keys.map(function (k) {
            var r = rev[k] || 0, c = cost[k] || 0;
            return { k: k, r: r, c: c, m: r - c, pct: r ? Math.round((r - c) / r * 100) : null };
          }).sort(function (a, b) { return (a.pct === null ? 999 : a.pct) - (b.pct === null ? 999 : b.pct); })
            .forEach(function (x) {
              if (x.m < 0) losing++;
              lines.push('• ' + nm('projects', x.k) + ' — إيراد ' + money(x.r) + ' · تكلفة ' + money(x.c) +
                         ' · الهامش ' + money(x.m) + (x.pct !== null ? ' (' + x.pct + '٪)' : ''));
            });
          if (losing) lines.push('', losing + ' مشروع بهامش سالب. راجعه قبل أن يستمر شهراً آخر.');
          return R('ربحية المشروعات', lines, losing ? 'high' : 'info', { projects: keys.length, losing: losing });
        }
      },
      duplicatePayments: {
        label: { ar: 'سداد مكرر محتمل', en: 'Possible duplicate payments' },
        run: function () {
          var seen = {}, out = [];
          approved('payments').forEach(function (p) {
            var amt = n(p.amount || p.totalValue);
            if (!amt || !p.supplier) return;
            var k = p.supplier + '|' + amt.toFixed(2);
            if (seen[k]) {
              out.push('• ' + nm('suppliers', p.supplier) + ' — ' + money(amt) + ' ج — سندان: ' +
                       (seen[k].docNo || '') + ' و ' + (p.docNo || ''));
            } else seen[k] = p;
          });
          var inv = {}, dup = [];
          live('supplierInvoices').forEach(function (i) {
            var k = (i.supplier || '') + '|' + String(i.supplierInvoiceNo || i.invoiceNo || '').trim();
            if (!i.supplier || k.split('|')[1] === '') return;
            if (inv[k]) dup.push('• فاتورة مورد برقم مكرر: ' + k.split('|')[1] + ' — ' + nm('suppliers', i.supplier));
            else inv[k] = i;
          });
          var lines = out.concat(dup);
          if (!lines.length) return R('لا يوجد سداد أو فاتورة مكررة.', [], 'ok');
          return R(lines.length + ' حالة تكرار محتملة', lines.concat([
            '', 'راجع كل حالة قبل السداد القادم. السداد المكرر يُسترد بصعوبة بعد شهور.'
          ]), 'critical', { count: lines.length });
        }
      },
      retentionDue: {
        label: { ar: 'احتجازات مستحقة الإفراج', en: 'Retention due for release' },
        run: function () {
          var out = [], total = 0;
          live('clientIPCs').forEach(function (r) {
            var ret = n(r.retention);
            /* ٢٥ أغسطس ٢٠٢٦ — لم يوجد أي حقل يسمح بتعليم الاحتجاز
               «مُفرَج عنه» فكان يُبلَّغ عنه للأبد ولو سُدِّد فعلاً. أضيف
               حقل تاريخ جديد retentionReleasedDate (انظر
               retention-release-field.js) بدل صندوق اختيار — لأن التاريخ
               أفيد من علامة صح/خطأ ولا يلتبس مع retentionYears أو
               retentionUntil الموجودين بالفعل ويعنيان شيئاً آخر تماماً.
               25 August 2026 — no field existed to mark a retention
               "released," so it was reported forever even after it was
               genuinely paid back. A new date field, `retentionReleasedDate`
               (see retention-release-field.js), was added instead of a
               checkbox — a date is more useful than a tick, and it avoids
               colliding with `retentionYears`/`retentionUntil`, which
               already exist and mean something else entirely (how long to
               keep a document, not whether money was paid). */
            if (!ret || r.retentionReleasedDate) return;
            var age = since(r.date);
            if (age < 365) return;
            total += ret;
            out.push('• ' + (r.docNo || '') + ' — ' + money(ret) + ' ج محتجزة منذ ' + age + ' يوماً');
          });
          if (!out.length) return R('لا توجد احتجازات تجاوزت سنة بلا مطالبة.', [], 'ok');
          return R('احتجازات قديمة بقيمة ' + money(total) + ' جنيه', out.concat([
            '', 'راجع شروط الإفراج في العقد وطالب بها كتابةً. هذا مال جاهز متروك.'
          ]), 'high', { total: total, count: out.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · وكيل المخازن والمشتريات
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.supply = {
    id: 'supply',
    name: { ar: 'خبير المخازن والمشتريات', en: 'Stores & procurement specialist' },
    roles: ['storekeeper', 'procurement', 'finance_manager', 'admin', 'gm'],
    persona: {
      ar: 'أنت خبير سلاسل إمداد في مقاولات الطرق. تعرف مواد الرصف والخرسانة ' +
          'والحديد وأسعارها المتقلبة، وتعرف أن أكبر خسائر المخزن ليست السرقة ' +
          'بل الفقد الطبيعي غير المسجّل والتحويلات غير المُثبتة. تحسب دائماً ' +
          'بالكمية والقيمة معاً.',
      en: 'You are a supply-chain specialist for road contracting.'
    },
    reference: {
      ar: [
        'التحويل بين المخازن بلا إثبات استلام في الوجهة أكبر ثغرة في أي مخزن.',
        'السعر يُقارن دائماً بآخر شراء لنفس الصنف. ارتفاع فوق ١٥٪ يحتاج تبريراً مكتوباً.',
        'تقسيم أمر شراء كبير لأوامر صغيرة للالتفاف على حد الاعتماد مخالفة جسيمة لا خطأ إجرائي.',
        'الأسمنت والحديد في العراء: فقد طبيعي يتحول لعجز كبير في الجرد.',
        'الشراء العاجل المتكرر يعني ضعف تخطيط، وتدفع ثمنه في السعر.',
        'صنف واحد بأسماء مختلفة يُنتج رصيداً وهمياً في مكان وعجزاً في آخر.'
      ]
    },
    jobs: {
      transfersInLimbo: {
        label: { ar: 'تحويلات خرجت ولم تصل', en: 'Transfers sent but never received' },
        run: function () {
          /* stockTransfers لا تملك receivedBy/receivedDate — تلك حقول
             handover() الخاصة بشاشات departments.js فقط. حقول التحويل
             الحقيقية هي receivedByDest و arrivalDate.
             stockTransfers does not carry receivedBy/receivedDate —
             those belong to the handover() helper used only by
             departments.js screens. The real fields here are
             receivedByDest and arrivalDate. */
          var bad = approved('stockTransfers').filter(function (t) {
            return !t.receivedByDest && !t.arrivalDate && since(t.date) > 3;
          });
          if (!bad.length) return R('كل التحويلات مُثبت استلامها.', [], 'ok');
          return R(bad.length + ' تحويل بلا إثبات استلام',
            bad.slice(0, 15).map(function (t) {
              return '• ' + (t.docNo || '') + ' — من ' + nm('warehouses', t.fromWarehouse) +
                     ' إلى ' + nm('warehouses', t.toWarehouse) + ' — منذ ' + since(t.date) + ' يوماً';
            }).concat(['', 'البضاعة خرجت من مخزن ولم تدخل الآخر. هذه أكبر ثغرة في أي مخزن — أغلقها اليوم.']),
            'critical', { count: bad.length });
        }
      },
      priceDrift: {
        label: { ar: 'ارتفاع أسعار غير مبرر', en: 'Unexplained price increases' },
        run: function () {
          /* استُبعدت supplierInvoices: لا تملك أي بنود (lines) في
             schema.js — لا خطأ، لكن نصف الفحص كان يعمل على قائمة فارغة
             دوماً. أسعار المشتريات المعتمدة وحدها كافية لرصد الاتجاه.
             supplierInvoices excluded: it has no `lines` block at all in
             schema.js — not a crash, but half this check was always
             running against an empty list. Approved purchase prices
             alone are enough to catch the trend. */
          var hist = {};
          approved('purchaseApprovals').forEach(function (d) {
            (d.lines || []).forEach(function (l) {
              var key = String(l.item || '').trim(); if (!key) return;
              var price = n(l.unitPrice || l.price);
              if (!price) return;
              (hist[key] = hist[key] || []).push({ p: price, d: d.date, doc: d.docNo });
            });
          });
          var out = [];
          Object.keys(hist).forEach(function (k) {
            var rows = hist[k].sort(function (a, b) { return new Date(a.d) - new Date(b.d); });
            if (rows.length < 2) return;
            var last = rows[rows.length - 1], prev = rows[rows.length - 2];
            if (!prev.p) return;
            var pct = Math.round((last.p - prev.p) / prev.p * 100);
            if (pct < 15) return;
            out.push('• ' + k + ' — ارتفع ' + pct + '٪ (' + money(prev.p) + ' ← ' + money(last.p) + ') — ' + (last.doc || ''));
          });
          if (!out.length) return R('لا توجد قفزات أسعار تتجاوز ١٥٪.', [], 'ok');
          return R(out.length + ' صنف ارتفع سعره أكثر من ١٥٪', out.slice(0, 15).concat([
            '', 'اطلب تبريراً مكتوباً أو عروضاً بديلة قبل الاعتماد.'
          ]), 'high', { count: out.length });
        }
      },
      splitPurchases: {
        label: { ar: 'اشتباه تقسيم مشتريات', en: 'Suspected split purchasing' },
        run: function () {
          var byWeek = {};
          approved('purchaseApprovals').forEach(function (p) {
            if (!p.supplier || !p.date) return;
            var wk = new Date(p.date); wk.setDate(wk.getDate() - wk.getDay());
            var k = p.supplier + '|' + wk.toISOString().slice(0, 10);
            (byWeek[k] = byWeek[k] || []).push(p);
          });
          var out = [];
          Object.keys(byWeek).forEach(function (k) {
            var g = byWeek[k];
            if (g.length < 3) return;
            var total = g.reduce(function (s, x) { return s + n(x.grandTotal); }, 0);
            out.push('• ' + nm('suppliers', k.split('|')[0]) + ' — ' + g.length +
                     ' اعتماد في أسبوع واحد بإجمالي ' + money(total) + ' ج');
          });
          if (!out.length) return R('لا يوجد نمط تقسيم مشتريات.', [], 'ok');
          return R(out.length + ' حالة اشتباه تقسيم مشتريات', out.concat([
            '', 'عدة أوامر صغيرة لنفس المورد في أسبوع قد تكون التفافاً على حد الاعتماد.',
            'راجع من أصدرها ولماذا لم تُجمَّع في أمر واحد.'
          ]), 'critical', { count: out.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · وكيل الموقع
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.site = {
    id: 'site',
    name: { ar: 'خبير تنفيذ الطرق والكباري', en: 'Roads & bridges execution specialist' },
    roles: ['site_engineer', 'project_manager', 'technical', 'admin', 'gm'],
    persona: {
      ar: 'أنت مهندس تنفيذ أول في مشروعات الطرق والكباري بمصر. تعرف طبقات الرصف ' +
          'ونسب الدمك ودرجات حرارة الخلطة الأسفلتية ورتب الخرسانة واشتراطات الصب ' +
          'والمعالجة. تعرف أن أغلى خطأ في الموقع هو العمل برسمة قديمة، وأن الورق ' +
          'الذي لا يُكتب يوم حدوثه يضيع. تجيب بأرقام فنية محددة.',
      en: 'You are a senior execution engineer for Egyptian road and bridge works.'
    },
    reference: {
      ar: [
        'الدمك تحت الحد المسموح يعني رفض الطبقة كاملة ولو بعد أسابيع.',
        'الخلطة الأسفلتية الباردة لا تُدمك. حرارة التوريد والفرد تُسجّل لكل سيارة.',
        'لا صب بلا اعتماد النجارة والحدادة والمناسيب. الخرسانة لا تُهدم بسهولة.',
        'مكعبات الاختبار تُؤخذ بنسبة محددة من حجم الصبة، وتُسجَّل وقت الصب لا بعده.',
        'كل عمل يُغطّى قبل معاينة الاستشاري سيُفتح مرة أخرى على حسابك.',
        'أمر شفهي بعمل إضافي = عمل بلا مقابل. لا شيء بلا ورق موقّع.',
        'الكمية تُحصر يوم تنفيذها. الحصر المؤجَّل حصر ناقص.'
      ]
    },
    jobs: {
      qualityRisk: {
        label: { ar: 'مخاطر جودة تستدعي التوقف', en: 'Quality risks that warrant stopping' },
        run: function () {
          var lines = [], sev = 'ok';
          approved('pourCards').forEach(function (p) {
            var miss = [];
            if (!p.formworkOk) miss.push('النجارة');
            if (!p.steelOk) miss.push('الحدادة');
            if (!p.levelsOk) miss.push('المناسيب');
            if (miss.length) { sev = 'critical';
              lines.push('• صب ' + (p.docNo || '') + ' (' + (p.element || '') + ') بلا اعتماد ' + miss.join(' و')); }
          });
          live('asphaltRecords').forEach(function (a) {
            if (a.compaction && n(a.compaction) < 95) { sev = 'critical';
              lines.push('• أسفلت ' + (a.docNo || '') + ' — دمك ' + n(a.compaction) + '٪ (الحد ٩٥٪) — ' +
                         (a.chainageFrom || '') + ' إلى ' + (a.chainageTo || '')); }
            if (a.layTemp && n(a.layTemp) < 120) { if (sev !== 'critical') sev = 'high';
              lines.push('• أسفلت ' + (a.docNo || '') + ' — حرارة فرد ' + n(a.layTemp) + '° (الحد ١٢٠°)'); }
          });
          if (!lines.length) return R('لا توجد مخاطر جودة مسجّلة.', [], 'ok');
          return R(lines.length + ' مخاطرة جودة', lines.concat([
            '', 'كل بند هنا قابل للرفض من الاستشاري. عالجه قبل تغطيته أو تنفيذ الطبقة التالية فوقه.'
          ]), sev, { count: lines.length });
        }
      },
      freeWork: {
        label: { ar: 'أعمال تُنفَّذ بلا مقابل', en: 'Work being done for free' },
        run: function () {
          var out = [], total = 0;
          live('siteInstructions').forEach(function (s) {
            if (!s.costImpact || s.variationRaised) return;
            var c = n(s.estimatedCost); total += c;
            out.push('• ' + (s.docNo || '') + ' من ' + (s.issuedBy || '') + ' — ' + money(c) +
                     ' ج — منذ ' + since(s.date) + ' يوماً بلا أمر تغيير');
          });
          live('ncr').forEach(function (nr) {
            if (nr.responsibleParty !== 'subcon' || nr.backChargeSub || !n(nr.reworkCost)) return;
            total += n(nr.reworkCost);
            out.push('• ' + (nr.docNo || '') + ' — ' + money(nr.reworkCost) +
                     ' ج تكلفة خطأ ' + nm('subcontractors', nr.subcontractor) + ' لم تُخصم منه');
          });
          if (!out.length) return R('لا توجد أعمال بلا مقابل.', [], 'ok');
          return R('الشركة تتحمّل ' + money(total) + ' جنيه بلا مقابل', out.concat([
            '', 'كل بند هنا مال خرج من الشركة ويمكن استرداده بورقة موقّعة.',
            'المطلوب: أمر تغيير للتعليمات، وخصم من مستخلص المقاول للأخطاء.'
          ]), 'critical', { total: total, count: out.length });
        }
      },
      openItems: {
        label: { ar: 'بنود مفتوحة تتراكم', en: 'Open items piling up' },
        run: function () {
          var lines = [];
          live('ncr').filter(function (x) { return !x.closed; }).forEach(function (x) {
            lines.push('• عدم مطابقة ' + (x.docNo || '') + ' — مفتوح منذ ' + since(x.date) + ' يوماً');
          });
          live('wir').filter(function (w) { return w.result === 'pending' && since(w.date) > 3; })
            .forEach(function (w) {
              lines.push('• طلب فحص ' + (w.docNo || '') + ' — بلا معاينة منذ ' + since(w.date) + ' يوماً');
            });
          live('safetyReports').filter(function (s) { return !s.closed && s.kind === 'injury'; })
            .forEach(function (s) { lines.push('• حادث إصابة ' + (s.docNo || '') + ' — لم يُغلق'); });
          if (!lines.length) return R('لا توجد بنود مفتوحة متأخرة.', [], 'ok');
          return R(lines.length + ' بند مفتوح', lines.slice(0, 20).concat([
            '', 'البنود المفتوحة تُستخدم ضدك في الاستلام الابتدائي. أغلقها تباعاً.'
          ]), 'high', { count: lines.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · وكيل ضبط المستندات
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.dc = {
    id: 'dc',
    name: { ar: 'خبير ضبط المستندات والمطالبات', en: 'Document control & claims specialist' },
    roles: ['document_control', 'technical', 'legal', 'project_manager', 'admin', 'gm'],
    persona: {
      ar: 'أنت خبير ضبط مستندات ومطالبات في مقاولات البنية التحتية. تعرف أن ' +
          'المطالبات تُكسب أو تُخسر بالتواريخ والأوراق لا بالحق وحده، وأن الإخطار ' +
          'التعاقدي المتأخر يُسقط حقاً كاملاً مهما كان مستحقاً. تتابع المراجعات ' +
          'والمواعيد وتثبت الاستلام في كل خطوة.',
      en: 'You are a document control and claims specialist in infrastructure contracting.'
    },
    reference: {
      ar: [
        'المطالبة تُكسب بالتواريخ الموثّقة لا بالحق وحده.',
        'الإخطار التعاقدي المتأخر يُسقط الحق كاملاً مهما كان مستحقاً.',
        'كل مستند صادر بلا إثبات استلام هو مستند لم يُرسل قانونياً.',
        'الرسمة الملغاة الباقية في الموقع أغلى خطأ مستندي على الإطلاق.',
        'تأخير الرد على طلب معلومات يُوثَّق يوم حدوثه ليصبح أساس مطالبة تمديد.',
        'لا تُشترى مادة قبل صدور اعتمادها، وإلا تُرفض في الموقع وتُخصم من المستخلص.',
        'المستند الذي يخص نزاعاً قائماً لا يُعدم مهما انتهت مدة حفظه.'
      ]
    },
    jobs: {
      deadlineRadar: {
        label: { ar: 'رادار المواعيد التعاقدية', en: 'Contractual deadline radar' },
        run: function () {
          var urgent = [], missed = [];
          live('correspondence').forEach(function (c) {
            if (!c.contractualNotice || !c.noticeDeadline || c.replied) return;
            var left = Math.round((new Date(c.noticeDeadline) - Date.now()) / 86400000);
            var s = '• ' + (c.docNo || '') + ' — ' + (c.subject || '') + ' — ' + (c.party || '');
            if (left < 0) missed.push(s + ' — فات الموعد منذ ' + Math.abs(left) + ' يوماً');
            else if (left <= 14) urgent.push(s + ' — باقٍ ' + left + ' يوم');
          });
          var lines = [];
          if (missed.length) lines = lines.concat(['فات موعدها:'], missed, ['']);
          if (urgent.length) lines = lines.concat(['تقترب:'], urgent, ['']);
          if (!lines.length) return R('لا توجد مواعيد تعاقدية حرجة.', [], 'ok');
          lines.push('المطلوب: أرسل الإخطار قبل الموعد. المتأخر أبلغ به الشؤون القانونية اليوم.');
          return R('مواعيد تعاقدية', lines, missed.length ? 'critical' : 'high',
                   { missed: missed.length, urgent: urgent.length });
        }
      },
      claimOpportunities: {
        label: { ar: 'مطالبات ممكنة لم تُقدَّم', en: 'Claims available but not raised' },
        run: function () {
          var out = [], days = 0;
          live('rfi').forEach(function (r) {
            if (r.claimRaised) return;
            var d = n(r.daysDelayed) || (r.replyDue && !r.replyDate ? Math.max(0, since(r.replyDue)) : 0);
            if (d < 7) return;
            days += d;
            out.push('• ' + (r.docNo || '') + ' — تأخير رد ' + d + ' يوماً' +
                     (r.workStopped ? ' مع توقف العمل' : '') + ' — ' + (r.subject || ''));
          });
          live('siteInstructions').forEach(function (s) {
            if (!s.timeImpact || s.variationRaised) return;
            days += n(s.daysImpact);
            out.push('• ' + (s.docNo || '') + ' — ' + n(s.daysImpact) + ' يوم تأخير بأمر ' + (s.issuedBy || ''));
          });
          if (!out.length) return R('لا توجد مطالبات متاحة غير مقدَّمة.', [], 'ok');
          return R('أساس مطالبة بإجمالي ' + days + ' يوم تأخير', out.concat([
            '', 'هذه أيام موثّقة يمكن بناء مطالبة تمديد مدة عليها.',
            'جهّزها قبل انتهاء المدة التعاقدية لتقديم المطالبة.'
          ]), 'high', { days: days, count: out.length });
        }
      },
      revisionIntegrity: {
        label: { ar: 'سلامة المراجعات والتوزيع', en: 'Revision and distribution integrity' },
        run: function () {
          var lines = [];
          live('docRegister').forEach(function (d) {
            if (d.status === 'superseded' && d.issuedToSite && !d.oldCopyRecalled)
              lines.push('• ' + (d.docCode || '') + ' — نسخة ملغاة ما زالت في الموقع');
            if (d.issuedToSite && d.status !== 'issued' && d.status !== 'superseded' && d.status !== 'void')
              lines.push('• ' + (d.docCode || '') + ' — صدرت للموقع وحالتها «' + (d.status || '') + '»');
          });
          live('transmittals').forEach(function (t) {
            if (t.direction === 'out' && !t.acknowledged && since(t.date) > 7)
              lines.push('• ' + (t.docNo || '') + ' — أُرسل لـ' + (t.party || '') + ' منذ ' + since(t.date) + ' يوماً بلا إثبات استلام');
          });
          if (!lines.length) return R('سجل المستندات سليم.', [], 'ok');
          return R(lines.length + ' خلل في ضبط المستندات', lines.slice(0, 20).concat([
            '', 'ابدأ بالنسخ الملغاة في المواقع — هي الأخطر والأغلى.'
          ]), 'critical', { count: lines.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · وكيل الشؤون القانونية
     ═══════════════════════════════════════════════════════════════════ */
  AGENTS.legal = {
    id: 'legal',
    name: { ar: 'خبير عقود المقاولات', en: 'Construction contracts specialist' },
    roles: ['legal', 'admin', 'gm', 'finance_manager'],
    persona: {
      ar: 'أنت مستشار قانوني متخصص في عقود المقاولات والبنية التحتية في مصر. ' +
          'تركّز على بنود الغرامات والاحتجاز وخطابات الضمان ومدد الإخطار وشروط ' +
          'الإنهاء. تعرف أن أغلب خسائر المقاولين القانونية سببها مواعيد فائتة ' +
          'لا نصوص غامضة.',
      en: 'You are a legal adviser specialising in Egyptian construction contracts.'
    },
    reference: {
      ar: [
        'أغلب الخسائر القانونية في المقاولات سببها مواعيد فائتة لا نصوص غامضة.',
        'خطاب الضمان يجب أن يغطي مدة العقد كاملة زائد فترة الضمان.',
        'الترخيص المنتهي يوقف صرف مستخلص ويمنع دخول مناقصة.',
        'غرامة التأخير لا تُقبل قبل مراجعة استحقاقها ومسؤولية التأخير.',
        'بند الإنهاء يُقرأ قبل التوقيع لا عند الخلاف.'
      ]
    },
    jobs: {
      expiryRadar: {
        label: { ar: 'تراخيص وضمانات تقترب من الانتهاء', en: 'Expiring licences and guarantees' },
        run: function () {
          var out = [];
          live('legalDocs').forEach(function (d) {
            if (!d.expiryDate && !d.expiry) return;
            var e = d.expiryDate || d.expiry;
            var left = Math.round((new Date(e) - Date.now()) / 86400000);
            if (left > 60) return;
            out.push('• ' + (d.name || d.title || '') + ' — ' +
                     (left < 0 ? 'منتهٍ منذ ' + Math.abs(left) + ' يوماً' : 'ينتهي خلال ' + left + ' يوماً'));
          });
          if (!out.length) return R('لا توجد مستندات قانونية تقترب من الانتهاء.', [], 'ok');
          return R(out.length + ' مستند يحتاج تجديداً', out.concat([
            '', 'الترخيص المنتهي يوقف صرف المستخلصات ويمنع دخول المناقصات. جدّد قبل الانتهاء لا بعده.'
          ]), out.some(function (x) { return x.indexOf('منتهٍ') !== -1; }) ? 'critical' : 'high',
             { count: out.length });
        }
      },
      disputeExposure: {
        label: { ar: 'ملف النزاعات والمخاطر', en: 'Dispute and risk exposure' },
        run: function () {
          var lines = [], exposure = 0;
          live('correspondence').filter(function (c) {
            return c.category === 'claim' || c.category === 'delay';
          }).forEach(function (c) {
            lines.push('• ' + (c.docNo || '') + ' — ' + (c.subject || '') + ' — ' + (c.party || '') +
                       (c.replied ? '' : ' — بلا رد'));
          });
          live('ncr').filter(function (x) { return x.severity === 'critical' && !x.closed; })
            .forEach(function (x) {
              exposure += n(x.reworkCost);
              lines.push('• عدم مطابقة حرجة مفتوحة ' + (x.docNo || '') + ' — ' + money(x.reworkCost) + ' ج');
            });
          if (!lines.length) return R('لا توجد نزاعات أو مخاطر مفتوحة.', [], 'ok');
          return R('ملف المخاطر' + (exposure ? ' — تعرّض ' + money(exposure) + ' ج' : ''),
            lines.concat(['', 'احتفظ بكل مستند يخص هذه البنود ولا تُعدم شيئاً منها مهما انتهت مدة الحفظ.']),
            'high', { exposure: exposure, count: lines.length });
        }
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     التشغيل — RUNNING
     ═══════════════════════════════════════════════════════════════════ */

  /* الوكلاء المسموح بهم لدور المستخدم الحالي */
  function forMe() {
    var u = global.Auth && Auth.current();
    if (!u) return [];
    return Object.keys(AGENTS).filter(function (k) {
      return AGENTS[k].roles.indexOf(u.role) !== -1;
    }).map(function (k) { return AGENTS[k]; });
  }

  /* الوكيل الأساسي لهذا الدور */
  var PRIMARY = {
    hr: 'hr', technical: 'technical', project_manager: 'technical',
    finance_manager: 'finance', accountant: 'finance',
    storekeeper: 'supply', procurement: 'supply',
    site_engineer: 'site', document_control: 'dc',
    legal: 'legal', admin: 'finance', gm: 'finance'
  };
  function primary() {
    var u = global.Auth && Auth.current();
    if (!u) return null;
    return AGENTS[PRIMARY[u.role]] || forMe()[0] || null;
  }

  /* تشغيل مهمة واحدة */
  function runJob(agentId, jobId) {
    var a = AGENTS[agentId];
    if (!a) return { error: 'unknown-agent' };
    var u = global.Auth && Auth.current();
    if (!u || a.roles.indexOf(u.role) === -1) return { error: 'forbidden' };
    var j = a.jobs[jobId];
    if (!j) return { error: 'unknown-job' };
    try {
      var res = j.run();
      res.agent = a.id; res.job = jobId; res.label = j.label;
      return res;
    } catch (e) {
      console.error('agent job failed: ' + agentId + '.' + jobId, e);
      return { error: 'job-failed', detail: String(e && e.message) };
    }
  }

  /* تشغيل كل مهام وكيل — تقرير كامل */
  function runAgent(agentId) {
    var a = AGENTS[agentId];
    if (!a) return { error: 'unknown-agent' };
    var out = [];
    Object.keys(a.jobs).forEach(function (jid) {
      var r = runJob(agentId, jid);
      if (!r.error) out.push(r);
    });
    var worst = 'ok';
    var rank = { critical: 4, high: 3, medium: 2, info: 1, ok: 0 };
    out.forEach(function (r) { if (rank[r.severity] > rank[worst]) worst = r.severity; });
    return { agent: a.id, name: a.name, severity: worst, results: out };
  }

  /* تقرير نصّي جاهز للطباعة أو الإرسال */
  function report(agentId) {
    var r = runAgent(agentId);
    if (r.error) return '';
    var lines = ['═══ ' + r.name.ar + ' ═══', ''];
    r.results.forEach(function (x) {
      var mark = x.severity === 'ok' ? '✓' : (x.severity === 'critical' ? '‼' : '•');
      lines.push(mark + ' ' + x.title);
      x.lines.forEach(function (l) { lines.push('   ' + l); });
      lines.push('');
    });
    return lines.join('\n');
  }

  /* السياق المُرسل للنموذج اللغوي — شخصية الوكيل ومرجعه ونتائج مهامه */
  function contextFor(agentId, question) {
    var a = AGENTS[agentId];
    if (!a) return null;
    var run = runAgent(agentId);
    return {
      agent: a.id,
      persona: a.persona.ar,
      reference: a.reference.ar,
      question: String(question || '').slice(0, 2000),
      computed: (run.results || []).map(function (x) {
        return { title: x.title, severity: x.severity, detail: x.lines.join(' | '), numbers: x.numbers };
      })
    };
  }

  async function ask(agentId, question) {
    var ctx = contextFor(agentId, question);
    if (!ctx) return { ok: false, error: 'unknown-agent' };
    if (global.AssistantPro && AssistantPro.ask) {
      return AssistantPro.ask(question, { route: 'agent:' + agentId, agent: ctx });
    }
    return { ok: true, source: 'local', text: report(agentId) };
  }

  global.Agents = {
    ALL: AGENTS,
    forMe: forMe, primary: primary,
    runJob: runJob, runAgent: runAgent,
    report: report, contextFor: contextFor, ask: ask,
    count: Object.keys(AGENTS).length
  };

  console.info('agents.js: ' + Object.keys(AGENTS).length + ' department agents, ' +
    Object.keys(AGENTS).reduce(function (s, k) { return s + Object.keys(AGENTS[k].jobs).length; }, 0) + ' jobs.');
})(window);
