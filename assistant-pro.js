/* =========================================================================
   assistant-pro.js — المساعد المهني لكل وظيفة
                      The professional assistant, per job
   -------------------------------------------------------------------------
   يتكوّن المساعد من نصفين:

     النصف الأول — يعمل دائماً، بإنترنت أو بدونه، ولا يخطئ ولا يخمّن:
       · knowledge.js  خبرة الوظيفة نفسها
       · inspector.js  ٥٨ فحصاً يبحث عن الأخطاء في المستندات الفعلية
       هذا النصف هو ما يجعل المساعد «موظفاً ممتازاً» لا «روبوت محادثة».

     النصف الثاني — يعمل بإنترنت فقط:
       · دالة ai-assistant على Supabase التي تستدعي OpenAI
       تشرح النتائج بلغة طبيعية وتجيب عن الأسئلة التي لم تُبرمَج.

   الترتيب مقصود: النموذج اللغوي لا يخترع مشكلة — يشرح مشكلة اكتشفها المفتّش
   بالفعل من بيانات حقيقية، ولا يرى إلا ما يسمح به دور المستخدم.

   Two halves. The first works offline, never guesses, and finds the mistakes.
   The second explains them in natural language when there is internet.
   The model never invents a finding: it only explains what the inspector
   already detected from real records the user is allowed to see.

   يُحمَّل بعد: knowledge.js · inspector.js · inspector-departments.js · assistant.js
   ========================================================================= */
(function (global) {
  'use strict';

  var CFG = function () { return global.ALZAHRAA_CONFIG || {}; };

  /* ═══════════════════════════════════════════════════════════════════
     ١ · حالة الاتصال والقدرات المتاحة
     ═══════════════════════════════════════════════════════════════════ */
  function online() { return navigator.onLine !== false; }

  function capability() {
    return {
      knowledge: !!global.Knowledge,
      inspector: !!global.Inspector,
      language:  online() && !!(global.Auth && Auth.client()) && CFG().aiEnabled !== false
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · ما يعرفه المساعد عن صاحب الحساب
     ═══════════════════════════════════════════════════════════════════ */
  function me() {
    var u = global.Auth && Auth.current();
    if (!u) return null;
    var kb = global.Knowledge ? Knowledge.forRole(u.role) : null;
    return {
      id: u.id, name: u.name, role: u.role,
      roleLabel: global.Auth ? Auth.roleLabel(u.role) : u.role,
      knowledge: kb,
      projects: u.projects || []
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · النتائج التي تخصّني، مرتّبة بالخطورة
     ═══════════════════════════════════════════════════════════════════ */
  var SEV_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
  var SEV_LABEL = {
    critical: { ar: 'حرج',   en: 'Critical' },
    high:     { ar: 'مهم',   en: 'High' },
    medium:   { ar: 'متوسط', en: 'Medium' },
    low:      { ar: 'بسيط',  en: 'Low' }
  };

  function myFindings(limit) {
    if (!global.Inspector) return [];
    var list;
    try { list = Inspector.findings() || []; }
    catch (e) { console.error('inspector failed', e); return []; }
    list = list.slice().sort(function (a, b) {
      return (SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0);
    });
    return limit ? list.slice(0, limit) : list;
  }

  function findingCounts() {
    var c = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    myFindings().forEach(function (f) {
      if (c[f.severity] !== undefined) c[f.severity]++;
      c.total++;
    });
    return c;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · إحاطة الصباح — ماذا يجب أن أفعل اليوم
     ═══════════════════════════════════════════════════════════════════ */
  function briefing() {
    var u = me();
    if (!u) return null;

    var counts = findingCounts();
    var top = myFindings(5);
    var tip = global.Knowledge ? Knowledge.tipOfDay(u.role) : null;

    var headline;
    if (counts.critical > 0) {
      headline = { ar: 'يوجد ' + counts.critical + ' أمر حرج يحتاج تدخّلك اليوم.',
                   en: counts.critical + ' critical items need you today.' };
    } else if (counts.high > 0) {
      headline = { ar: 'لا يوجد أمر حرج. ' + counts.high + ' أمر مهم يستحق المتابعة.',
                   en: 'Nothing critical. ' + counts.high + ' items worth following up.' };
    } else if (counts.total > 0) {
      headline = { ar: 'كل شيء تحت السيطرة. ' + counts.total + ' ملاحظة بسيطة فقط.',
                   en: 'All under control. ' + counts.total + ' minor observations.' };
    } else {
      headline = { ar: 'لا توجد مشاكل في نطاق عملك. عمل نظيف.',
                   en: 'No problems in your area. Clean work.' };
    }

    return {
      user: u, counts: counts, headline: headline,
      findings: top, tip: tip,
      capability: capability()
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · مهام يقوم بها المساعد نيابةً عنك
        Tasks the assistant performs, not just answers
     ═══════════════════════════════════════════════════════════════════ */
  var TASKS = {};

  /* مراجعة مستند قبل إرساله للاعتماد */
  TASKS.reviewDocument = function (moduleId, record) {
    var problems = [], warnings = [], ok = [];
    var mod = global.Schema && Schema.get(moduleId);
    if (!mod || !record) return null;

    /* أ · الحقول المطلوبة */
    (mod.fields || []).forEach(function (f) {
      if (!f.required) return;
      var v = record[f.name];
      if (v === undefined || v === null || v === '') {
        problems.push({ ar: 'حقل مطلوب فارغ: ' + f.label.ar, en: 'Required field empty: ' + f.label.en });
      }
    });

    /* ب · قواعد الحماية الموجودة */
    if (global.Rules && Rules.validateSave) {
      try {
        var r = Rules.validateSave(moduleId, record);
        if (r && r.errors) r.errors.forEach(function (e) { problems.push(typeof e === 'string' ? { ar: e, en: e } : e); });
        if (r && r.warnings) r.warnings.forEach(function (w) { warnings.push(typeof w === 'string' ? { ar: w, en: w } : w); });
      } catch (e) {}
    }

    /* ج · التسليم والاستلام */
    var handFields = ['receivedBy', 'handedTo', 'preparedBy'];
    var hasHand = (mod.fields || []).some(function (f) { return handFields.indexOf(f.name) !== -1; });
    if (hasHand && !record.receivedBy && !record.handedTo) {
      warnings.push({ ar: 'لا يوجد اسم مستلم — لن يكون هناك من يُسأل عن هذا المستند.',
                      en: 'No receiver recorded — nobody is accountable for this document.' });
    }

    /* د · الربط بالمشروع وبند التكلفة */
    var hasProject = (mod.fields || []).some(function (f) { return f.name === 'project'; });
    if (hasProject && !record.project) {
      warnings.push({ ar: 'بلا مشروع — لن تظهر التكلفة في تقارير المشروع.',
                      en: 'No project — the cost will not appear in project reporting.' });
    }
    var hasCost = (mod.fields || []).some(function (f) { return f.name === 'costItem'; });
    if (hasCost && !record.costItem) {
      warnings.push({ ar: 'بلا بند تكلفة — التكلفة ستُحمّل على المصروفات العامة.',
                      en: 'No cost item — this will land in overheads.' });
    }

    /* هـ · تواريخ مستقبلية */
    (mod.fields || []).forEach(function (f) {
      if (f.type !== 'date' || !record[f.name]) return;
      if (new Date(record[f.name]) > new Date(Date.now() + 86400000)) {
        warnings.push({ ar: 'تاريخ في المستقبل: ' + f.label.ar, en: 'Future date: ' + f.label.en });
      }
    });

    if (!problems.length) ok.push({ ar: 'كل الحقول المطلوبة مكتملة.', en: 'All required fields complete.' });

    return {
      verdict: problems.length ? 'blocked' : (warnings.length ? 'caution' : 'clear'),
      problems: problems, warnings: warnings, ok: ok
    };
  };

  /* ما الذي يجب أن أفعله أولاً — ترتيب المهام بالأثر لا بالتاريخ */
  TASKS.prioritise = function () {
    var out = [];
    myFindings().forEach(function (f) {
      out.push({
        weight: (SEV_ORDER[f.severity] || 0) * 100,
        severity: f.severity, title: f.title,
        evidence: f.evidence, action: f.action,
        module: f.module, recordId: f.recordId
      });
    });
    /* المستندات المنتظرة اعتمادي */
    if (global.Workflow && global.Store && global.Schema) {
      (Schema.MODULES || []).forEach(function (m) {
        if (!m.workflow) return;
        if (!global.Auth.can(m.id, 'approve') && !global.Auth.can(m.id, 'review')) return;
        Store.all(m.table).filter(function (r) {
          return r.status === 'pending' || r.status === 'reviewed';
        }).forEach(function (r) {
          var age = Math.round((Date.now() - new Date(r.updatedAt || r.date)) / 86400000);
          out.push({
            weight: 150 + Math.min(age * 5, 200),
            severity: age > 7 ? 'high' : 'medium',
            title: { ar: 'مستند ينتظر قرارك منذ ' + age + ' يوماً',
                     en: 'Document awaiting your decision for ' + age + ' days' },
            evidence: (r.docNo || r.name || '') + ' — ' + (m.label ? m.label.ar : m.id),
            action: { ar: 'راجعه أو أعده بسبب مكتوب.', en: 'Decide or return it with a written reason.' },
            module: m.id, recordId: r.id
          });
        });
      });
    }
    return out.sort(function (a, b) { return b.weight - a.weight; });
  };

  /* ملخص تنفيذي للأرقام التي تخصّ دوري */
  TASKS.summarise = function () {
    if (!global.RoleView || !global.RoleView.VIEWS) return null;
    var u = global.Auth && Auth.current();
    if (!u) return null;
    try { return RoleView.VIEWS[u.role] ? RoleView.kpis && RoleView.kpis(u.role) : null; }
    catch (e) { return null; }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · النصف اللغوي — يستدعي OpenAI عبر Supabase عند توفّر الإنترنت
     ═══════════════════════════════════════════════════════════════════ */

  /* السياق المرسل للنموذج. يحتوي فقط على ما يسمح به دور المستخدم،
     ولا يحتوي أي بيانات شخصية حساسة إطلاقاً. */
  function buildContext(question) {
    var u = me();
    if (!u) return null;
    var kb = u.knowledge || {};
    var pick = function (arr) { return (arr || []).map(function (x) { return x.ar; }); };

    return {
      question: String(question || '').slice(0, 2000),
      user: { role: u.role, roleLabel: u.roleLabel, name: u.name },
      expertise: {
        mission:      kb.mission ? kb.mission.ar : '',
        checkBefore:  pick(kb.beforeYouApprove),
        moneyLeaks:   pick(kb.whereMoneyLeaks),
        commonErrors: pick(kb.commonMistakes),
        neverDo:      pick(kb.neverDo),
        kpis:         pick(kb.kpis)
      },
      /* النتائج الحقيقية المكتشفة من مستندات المستخدم — لا يخترع النموذج غيرها */
      detectedProblems: myFindings(25).map(function (f) {
        return {
          severity: f.severity, area: f.area, module: f.module,
          title: f.title, evidence: f.evidence,
          recommendedAction: f.action && (f.action.ar || f.action)
        };
      }),
      counts: findingCounts(),
      language: (global.I18N && I18N.lang && I18N.lang()) || 'ar'
    };
  }

  async function ask(question, options) {
    var cap = capability();
    var ctx = buildContext(question);
    if (!ctx) return { ok: false, error: 'no-user' };

    /* أولاً: هل يمكن الإجابة محلياً بدقة؟ يوفّر وقتاً وتكلفة ويعمل بلا إنترنت */
    var localAnswer = answerLocally(question, ctx);

    if (!cap.language) {
      return {
        ok: true, source: 'local', offline: !online(),
        text: localAnswer,
        note: { ar: 'إجابة محلية — تعمل بدون إنترنت. عند الاتصال يصبح الشرح أوسع.',
                en: 'Local answer — works offline. Richer explanations return when online.' }
      };
    }

    try {
      /* The Edge Function's contract is { question, language, route } — not
         { prompt, context }. Sending the wrong field names returns
         "question_required" and the assistant silently falls back to local
         answers forever, which looks like the AI simply never works. */
      var res = await Auth.client().functions.invoke(CFG().aiFunction || 'ai-assistant', {
        body: {
          question: question,
          language: ctx.language,
          route: (options && options.route) || 'assistant',
          agent: (options && options.agent) || null,
          clientContext: ctx
        }
      });
      var payload = res && res.data;
      if (res.error || !payload || (!payload.answer && !payload.text)) {
        return { ok: true, source: 'local', text: localAnswer,
                 note: { ar: 'تعذّر الوصول للمساعد المتقدّم — هذه إجابة محلية.',
                         en: 'Advanced assistant unavailable — this is the local answer.' } };
      }
      return { ok: true, source: payload.mode === 'advanced' ? 'ai' : 'server',
               text: payload.answer || payload.text,
               findings: payload.findings || [], citations: payload.sources || [] };
    } catch (e) {
      return { ok: true, source: 'local', text: localAnswer,
               note: { ar: 'تعذّر الاتصال — هذه إجابة محلية.',
                       en: 'Connection failed — this is the local answer.' } };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · الإجابة المحلية — تعمل دائماً بدون إنترنت
     ═══════════════════════════════════════════════════════════════════ */
  var INTENTS = [
    { id: 'problems', keys: ['مشاكل', 'أخطاء', 'مشكلة', 'خطأ', 'ملاحظات', 'problems', 'errors', 'issues'] },
    { id: 'priority', keys: ['أبدأ', 'الأهم', 'أولوية', 'أولويات', 'ماذا أفعل', 'priority', 'what should i do'] },
    { id: 'advice',   keys: ['نصيحة', 'كيف أتجنب', 'أفضل طريقة', 'advice', 'best practice'] },
    { id: 'leaks',    keys: ['خسارة', 'ضياع', 'تسرب', 'أين يضيع', 'money', 'leak', 'loss'] },
    { id: 'kpi',      keys: ['أدائي', 'مؤشرات', 'كيف أقيس', 'kpi', 'performance'] },
    { id: 'never',    keys: ['ممنوع', 'لا يجوز', 'أخطر', 'never', 'forbidden'] }
  ];

  function detect(q) {
    var s = String(q || '').toLowerCase(), best = null, score = 0;
    INTENTS.forEach(function (i) {
      var sc = 0;
      i.keys.forEach(function (k) { if (s.indexOf(k) !== -1) sc += 1 + k.length / 20; });
      if (sc > score) { score = sc; best = i.id; }
    });
    return score > 0 ? best : null;
  }

  function bullets(arr) {
    return (arr || []).map(function (x) { return '• ' + (x.ar || x); }).join('\n');
  }

  function answerLocally(question, ctx) {
    var intent = detect(question);
    var kb = (ctx.user && global.Knowledge) ? Knowledge.forRole(ctx.user.role) : null;
    var c = ctx.counts;

    if (intent === 'problems' || (!intent && c.total)) {
      if (!c.total) return 'لا توجد مشاكل مكتشفة في نطاق عملك الآن.';
      var lines = ['وجدت ' + c.total + ' ملاحظة في نطاق عملك' +
                   (c.critical ? '، منها ' + c.critical + ' حرجة' : '') + ':', ''];
      ctx.detectedProblems.slice(0, 8).forEach(function (p, i) {
        lines.push((i + 1) + '. [' + (SEV_LABEL[p.severity] ? SEV_LABEL[p.severity].ar : p.severity) + '] ' +
                   (p.title.ar || p.title));
        lines.push('   الدليل: ' + p.evidence);
        lines.push('   المطلوب: ' + (p.recommendedAction || ''));
        lines.push('');
      });
      return lines.join('\n');
    }

    if (intent === 'priority') {
      var list = TASKS.prioritise().slice(0, 6);
      if (!list.length) return 'لا يوجد ما يستدعي تدخّلك الآن.';
      return 'ابدأ بهذا الترتيب:\n\n' + list.map(function (t, i) {
        return (i + 1) + '. ' + (t.title.ar || t.title) + '\n   ' + (t.evidence || '');
      }).join('\n');
    }

    if (kb) {
      if (intent === 'advice') return 'قبل أن تعتمد أي شيء:\n\n' + bullets(kb.beforeYouApprove);
      if (intent === 'leaks')  return 'أين يضيع المال عادةً في عملك:\n\n' + bullets(kb.whereMoneyLeaks);
      if (intent === 'kpi')    return 'مؤشرات أدائك:\n\n' + bullets(kb.kpis);
      if (intent === 'never')  return 'ما يجب ألا تفعله إطلاقاً:\n\n' + bullets(kb.neverDo);
    }

    /* لا نية واضحة — أعطِ إحاطة مفيدة بدل الاعتذار */
    var b = briefing();
    var parts = [];
    if (b) {
      parts.push(b.headline.ar);
      if (kb && kb.mission) parts.push('\nمهمتك: ' + kb.mission.ar);
      if (b.tip) parts.push('\nتذكير اليوم: ' + (b.tip.ar || b.tip));
    }
    parts.push('\nيمكنك أن تسألني: ما المشاكل في عملي؟ · بماذا أبدأ؟ · أين يضيع المال؟ · ما الممنوع؟');
    return parts.join('\n');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · اقتراحات جاهزة حسب الدور
     ═══════════════════════════════════════════════════════════════════ */
  function suggestions() {
    var u = me();
    var base = [
      { ar: 'ما المشاكل في نطاق عملي؟', en: 'What problems are in my area?' },
      { ar: 'بماذا أبدأ اليوم؟',        en: 'What should I start with today?' },
      { ar: 'أين يضيع المال في عملي؟',  en: 'Where does money leak in my work?' }
    ];
    if (!u) return base;
    var extra = {
      storekeeper:      { ar: 'هل يوجد صرف بلا توقيع مستلم؟', en: 'Any issue without a signed receiver?' },
      accountant:       { ar: 'هل يوجد سداد مكرر؟',           en: 'Any duplicate payment?' },
      procurement:      { ar: 'هل يوجد تقسيم مشتريات؟',       en: 'Any split purchasing?' },
      site_engineer:    { ar: 'هل يوجد صب بلا اعتماد؟',       en: 'Any pour without approvals?' },
      document_control: { ar: 'هل توجد نسخة ملغاة في الموقع؟', en: 'Any superseded copy still on site?' },
      project_manager:  { ar: 'ما بنود التكلفة المتجاوزة؟',    en: 'Which cost items are overrunning?' },
      finance_manager:  { ar: 'ما المستخلصات غير المحصّلة؟',   en: 'Which IPCs are uncollected?' },
      hr:               { ar: 'هل توجد عقود منتهية؟',          en: 'Any expired contracts?' },
      legal:            { ar: 'هل توجد مستندات منتهية؟',       en: 'Any expired documents?' },
      technical:        { ar: 'هل يوجد مستخلص متأخر؟',        en: 'Any late IPC?' }
    }[u.role];
    return extra ? base.concat([extra]) : base;
  }

  global.AssistantPro = {
    capability: capability,
    me: me,
    briefing: briefing,
    findings: myFindings,
    counts: findingCounts,
    tasks: TASKS,
    ask: ask,
    answerLocally: answerLocally,
    buildContext: buildContext,
    suggestions: suggestions,
    SEV_LABEL: SEV_LABEL
  };

  console.info('assistant-pro.js ready — knowledge:' + capability().knowledge +
               ' inspector:' + capability().inspector);
})(window);
