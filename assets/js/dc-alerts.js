/* =========================================================================
   dc-alerts.js — تنبيهات ضبط المستندات: ردود متأخرة، وأخطر نقطة في القسم
                  Document-control alerts: overdue replies, and the most
                  dangerous point in the department
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   alerts.js لا تقرأ replyDue ولا noticeDeadline إطلاقاً، وقاعدتها العامة
   عن «المستندات المعلَّقة» (alerts.js:134) تعمل فقط على شاشات
   workflow:true — لكن workflow-policy.js:93-96 يضبط docRegister
   وtransmittals وcorrespondence وrfi على RECORD، وRECORD تعني
   m.workflow = false (workflow-policy.js:116-117). فتخرج شاشات ضبط
   المستندات الأربع من تلك القاعدة تماماً ولا تُنتج أي تنبيه اليوم، رغم
   أن أ. أحمد عبد الحي طلب بالضبط هذا («كل ما سبق ذكره» — السؤال ٥٩)
   وحدَّد أسبوعاً (السؤال ٤٤).

   alerts.js has no rule reading replyDue or noticeDeadline at all, and
   its generic "stale document" rule (alerts.js:134) only runs on
   workflow:true screens — but workflow-policy.js:93-96 sets docRegister,
   transmittals, correspondence and rfi to RECORD, and RECORD means
   m.workflow = false (workflow-policy.js:116-117). So the four document-
   control screens fall outside that rule completely and produce almost
   no alerts today, even though Ahmed asked for exactly this ("all of the
   above" — Q59) with a one-week warning (Q44).

   القاعدة الأخطر · THE MOST IMPORTANT RULE

   أسئلة أحمد ١٧/١٨: رسمة نُفِّذت ثم تغيّرت، واستُبدلت دون غرامة هذه
   المرة — لكن الورقة نفسها تسمّي هذه «أخطر نقطة في القسم كله». القاعدة
   هنا تنبّه بخطورة دائمة على أي مستند أُلغي وصدر للموقع ولم تُؤكَّد
   إعادة نسخته القديمة، حتى تُتيك الخانة.

   Ahmed's answers to Q17/Q18 describe a drawing that was built from,
   then changed, and swapped out without a penalty this time — but the
   sheet itself calls this "the most dangerous point in the whole
   department." The rule below stays at danger level permanently for any
   document that was superseded and issued to site until the recall box
   is ticked.

   -------------------------------------------------------------------------
   ⚠️ لماذا لا نكتفي بلفّ Alerts.list فقط — فخ أثبته هذا الملف نفسه من قبل
      WHY WRAPPING Alerts.list ALONE IS NOT ENOUGH — a trap this exact
      codebase already hit and fixed once

   الشاشة الفعلية (app.js:250 → Alerts.render)، شارة القائمة الجانبية
   (app.js:421 → Alerts.count)، وبطاقتا لوحة التحكم (dashboard.js /
   dashboard-render.js → Alerts.count + Alerts.dashboardHTML) لا تستدعي
   Alerts.list المُصدَّرة إطلاقاً — كل واحدة تستدعي الدالة render/count/
   dashboardHTML الداخلية في alerts.js، وهذه بدورها تستدعي دالة list()
   الخاصة بإغلاق الملف (closure)، لا الخاصية المصدَّرة على الكائن. فلو
   استبدلنا Alerts.list فقط لظل كل مكان آخر يعرض التنبيهات القديمة بلا
   تنبيهات ضبط المستندات إطلاقاً — إلا نداء واحد في assistant.js:36.

   هذا فخ مطابق تماماً لِـ Workflow.inboxCount في one-step-approval.js
   (انظر تعليقه هناك سطر ١٤٤): العدّاد يستدعي نسخته الداخلية فلا يرى أي
   استبدال خارجي. الحل نفسه هنا: نستبدل كل الدوال الخمس المصدَّرة معاً
   (list · count · countBy · render · dashboardHTML) بحيث تُبنى كلها من
   نفس القائمة المدموجة.

   The real screen (app.js:250 → Alerts.render), the sidebar badge
   (app.js:421 → Alerts.count), and both dashboard cards (dashboard.js /
   dashboard-render.js → Alerts.count + Alerts.dashboardHTML) never call
   the exported Alerts.list at all — each calls alerts.js's own internal
   render/count/dashboardHTML function, which in turn calls that closure's
   own private list(), not the object's exported property. Replacing only
   Alerts.list would leave every other place showing the old alerts with
   no DC rules at all — except one call in assistant.js:36.

   This is the exact same trap as Workflow.inboxCount in
   one-step-approval.js (see its comment at line 144): the counter calls
   its own internal version and never sees an outside swap. Same fix
   here: replace all five exported functions (list, count, countBy,
   render, dashboardHTML) together, all built from one merged list.

   NOTE ON THE PLAN'S CITATION: the brief that asked for this file said
   money-owed.js and hr-signals.js "already prove" wrapping Alerts.list.
   They do not — they expose global.MoneyOwed / global.HRSignals, which
   alerts.js's OWN build() function was written to check for. alerts.js
   has no such hook for a brand-new rule family like this one, so that
   technique does not apply here; the real precedent for "replace every
   entry point that reads a private closure" is one-step-approval.js's
   Workflow.inboxCount fix, cited above.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and Alerts.list / count /
   countBy / render / dashboardHTML all revert to exactly what alerts.js
   itself defines — no DC rule fires anywhere, byte-identical to today.

   يُحمَّل بعد alerts.js (يلفّها) وبعد auth.js (يستخدم Auth.canSee) وبعد
   dc-requests.js وdc-tuning.js (يقرأ الحقول التي تضيفها، إن وُجدت).
   Load after alerts.js (it wraps it) and after auth.js (uses
   Auth.canSee). Also after dc-requests.js / dc-tuning.js in practice,
   though nothing here strictly requires it.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Alerts || !global.Store || !global.Schema || !global.Auth) {
    console.error('dc-alerts.js needs alerts.js, store.js, schema.js and auth.js first');
    return;
  }

  var LEVEL = { danger: 3, warn: 2, info: 1 };
  var WARN_DAYS = 7;   /* أسبوع — طلب أحمد صراحة، السؤال ٤٤ */

  function daysBetween(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
  function daysUntil(d) { return daysBetween(d, new Date()); }

  function mk(list, level, moduleId, icon, ar, en, recId) {
    list.push({ level: level, module: moduleId, icon: icon || 'file',
      text: L({ ar: ar, en: en }), recordId: recId || null });
  }

  /* ═════ القاعدة ١ · ردود متأخرة أو قريبة على أربع شاشات ═══════════════
     أسماء الحقول قُرئت من departments.js نفسه، لا خُمِّنت:
       rfi            replyDue (سطر ٥٨٥) · replyDate (سطر ٥٨٦)
       submittals     replyDue (سطر ٦٢٩) · replyDate (سطر ٦٣٠)
       correspondence replyDue (سطر ٦٦٩) · replied  (سطر ٦٧١، مربع اختيار)
       transmittals   replyDue (سطر ٥٤٨) · replyReceived (سطر ٥٤٩، مربع اختيار)
     Field names read from departments.js itself, not guessed — see the
     line numbers above for each screen's due-date and reply-recorded field.
     ═══════════════════════════════════════════════════════════════════ */
  var REPLY_SCREENS = [
    { id: 'rfi',            label: { ar: 'طلب معلومات RFI', en: 'RFI' },
      due: 'replyDue', done: function (r) { return !!r.replyDate; } },
    { id: 'submittals',     label: { ar: 'اعتماد',          en: 'Submittal' },
      due: 'replyDue', done: function (r) { return !!r.replyDate; } },
    { id: 'correspondence', label: { ar: 'خطاب',            en: 'Letter' },
      due: 'replyDue', done: function (r) { return !!r.replied; } },
    { id: 'transmittals',   label: { ar: 'مذكرة إرسال',     en: 'Transmittal' },
      due: 'replyDue', done: function (r) { return !!r.replyReceived; } }
  ];

  function repliesDue(out, can) {
    REPLY_SCREENS.forEach(function (cfg) {
      if (!can(cfg.id)) return;                 /* لا يرى أحد غير المخوَّل هذا التنبيه */
      var mod = Schema.get(cfg.id);
      if (!mod) return;
      Store.all(mod.table).forEach(function (r) {
        var due = r[cfg.due];
        if (!due || cfg.done(r)) return;
        var d = daysUntil(due);
        if (d > WARN_DAYS) return;               /* بعيد بما يكفي — لا داعي للتنبيه بعد */
        mk(out, d < 0 ? 'danger' : 'warn', cfg.id, mod.icon,
          cfg.label.ar + ' ' + (r.docNo || '') + (d < 0
            ? ' — الرد متأخر ' + Math.abs(d) + ' يوم'
            : ' — الرد مستحق خلال ' + d + ' يوم'),
          cfg.label.en + ' ' + (r.docNo || '') + (d < 0
            ? ' — reply overdue by ' + Math.abs(d) + ' day(s)'
            : ' — reply due in ' + d + ' day(s)'),
          r.id);
      });
    });
  }

  /* ═════ القاعدة ٢ · إخطار تعاقدي له موعد أخير ═══════════════════════
     correspondence.noticeDeadline — موجود فعلاً في departments.js:668. */
  function noticeDeadlines(out, can) {
    if (!can('correspondence')) return;
    var mod = Schema.get('correspondence');
    if (!mod) return;
    Store.all(mod.table).forEach(function (r) {
      if (!r.noticeDeadline) return;
      var d = daysUntil(r.noticeDeadline);
      if (d > WARN_DAYS) return;
      mk(out, d < 0 ? 'danger' : 'warn', 'correspondence', mod.icon,
        'خطاب ' + (r.docNo || '') + (d < 0
          ? ' — فات موعد الإخطار التعاقدي منذ ' + Math.abs(d) + ' يوم — قد يسقط الحق في المطالبة'
          : ' — موعد الإخطار التعاقدي خلال ' + d + ' يوم'),
        'Letter ' + (r.docNo || '') + (d < 0
          ? ' — contractual notice deadline passed ' + Math.abs(d) + ' day(s) ago — the right to claim may be forfeited'
          : ' — contractual notice deadline in ' + d + ' day(s)'),
        r.id);
    });
  }

  /* ═════ القاعدة ٣ · نسخة قديمة ما زالت في الموقع — الأخطر ═══════════
     docRegister: status='superseded' AND issuedToSite AND !oldCopyRecalled
     (الحقلان موجودان فعلاً في departments.js:502-506) → خطر دائم.

     drawings (schema.js:794): لا يوجد فيها حقل «صدرت للموقع» إطلاقاً —
     فقط drawingStatus والحقل الجديد oldCopyRecalled (أضافه dc-tuning.js).
     الخطة طلبت نفس شرط docRegister بالضبط، لكن لا وجود لـ issuedToSite
     هنا ولم تطلب الخطة إضافته، فحذفنا هذا الشرط لهذا الجدول فقط — بلا
     اختراع حقل جديد لم يُطلب.
     drawings has no "issued to site" field at all — only a status and
     the new oldCopyRecalled checkbox added by dc-tuning.js. The plan
     asked for the exact same condition as docRegister, but issuedToSite
     does not exist here and the plan never asked to add it — so that
     clause is dropped for this table only, rather than inventing a field.
     ═══════════════════════════════════════════════════════════════════ */
  function oldCopyOnSite(out, can) {
    if (can('docRegister')) {
      var modR = Schema.get('docRegister');
      if (modR) {
        Store.all(modR.table).forEach(function (r) {
          if (r.status !== 'superseded' || !r.issuedToSite || r.oldCopyRecalled) return;
          mk(out, 'danger', 'docRegister', modR.icon,
            'مستند «' + (r.docCode || r.docNo || '') + '»' + (r.revision ? ' مراجعة ' + r.revision : '') +
              ' أُلغي وصدرت نسخة أحدث، لكن النسخة القديمة لم تُسحب من الموقع بعد — خطر تنفيذ عمل برسمة ملغاة',
            'Document "' + (r.docCode || r.docNo || '') + '"' + (r.revision ? ' rev ' + r.revision : '') +
              ' was superseded but the old copy has not been confirmed recalled from site — risk of work executed to a cancelled drawing',
            r.id);
        });
      }
    }

    if (can('drawings')) {
      var modW = Schema.get('drawings');
      if (modW) {
        Store.all(modW.table).forEach(function (r) {
          if (r.drawingStatus !== 'superseded' || r.oldCopyRecalled) return;
          mk(out, 'danger', 'drawings', modW.icon,
            'رسم «' + (r.drawingNo || '') + '»' + (r.revision ? ' مراجعة ' + r.revision : '') +
              ' مُستبدل، ولم تُؤكَّد بعد إعادة النسخة القديمة من الموقع',
            'Drawing "' + (r.drawingNo || '') + '"' + (r.revision ? ' rev ' + r.revision : '') +
              ' has been superseded, and the old copy has not yet been confirmed recalled from site',
            r.id);
        });
      }
    }
  }

  function buildDC() {
    var out = [];
    if (!Auth.current()) return out;
    var can = function (m) { return Auth.canSee(m); };
    repliesDue(out, can);
    noticeDeadlines(out, can);
    oldCopyOnSite(out, can);
    return out;
  }

  /* ═════ الدمج — الدالة الوحيدة التي تحسب القائمة النهائية ═══════════ */
  var origList = Alerts.list;
  function mergedList() {
    var base = origList.apply(Alerts, arguments) || [];
    var extra = buildDC();
    if (!extra.length) return base;
    var merged = base.concat(extra);
    merged.sort(function (a, b) { return LEVEL[b.level] - LEVEL[a.level]; });
    return merged;
  }

  /* الخمسة كلها تُبنى من mergedList — انظر الشرح أعلاه عن سبب عدم كفاية
     استبدال list وحدها. all five are rebuilt from mergedList — see the
     note above on why replacing list alone is not enough. */
  Alerts.list = mergedList;
  Alerts.count = function () { return mergedList().length; };
  Alerts.countBy = function (level) {
    return mergedList().filter(function (a) { return a.level === level; }).length;
  };

  Alerts.render = function (host) {
    var all = mergedList();
    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('alert', 22) + ' ' + t('alerts.title') + '</h1>' +
      '<p class="page-sub">' + t('alerts.sub') + '</p></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-outline btn-sm" id="alPrint">' + UI.icon('printer', 15) + ' ' + t('g.print') + '</button>' +
      '</div></div>';

    if (!all.length) {
      html += '<div class="card"><div class="card-body"><div class="empty-state">' +
        UI.icon('check', 46) + '<h4>' + t('alerts.none') + '</h4></div></div></div>';
      host.innerHTML = html;
      return;
    }

    var byLevel = function (lvl) { return all.filter(function (a) { return a.level === lvl; }).length; };
    html += '<div class="kpi-grid">' +
      UI.kpi({ label: t('alerts.danger'), value: '<span class="num">' + byLevel('danger') + '</span>', icon: 'alert', tone: 'danger' }) +
      UI.kpi({ label: t('alerts.warn'), value: '<span class="num">' + byLevel('warn') + '</span>', icon: 'alert', tone: 'warn' }) +
      UI.kpi({ label: t('alerts.info'), value: '<span class="num">' + byLevel('info') + '</span>', icon: 'eye', tone: 'info' }) +
      '</div>';

    ['danger', 'warn', 'info'].forEach(function (lvl) {
      var items = all.filter(function (a) { return a.level === lvl; });
      if (!items.length) return;
      html += '<div class="card mb-2"><div class="card-head">' +
        '<h3 class="card-title">' + t('alerts.' + lvl) + '</h3>' +
        '<span class="badge ' + (lvl === 'danger' ? 'b-rejected' : lvl === 'warn' ? 'b-pending' : 'b-info') + ' plain num">' +
        items.length + '</span></div><div class="card-body flush">';
      items.forEach(function (a) {
        html += '<div class="alert-row" data-go="' + UI.attr(a.module) + '" data-rid="' + UI.attr(a.recordId || '') + '">' +
          '<span class="al-ic ' + lvl + '">' + UI.icon(a.icon, 16) + '</span>' +
          '<span class="al-tx">' + UI.esc(a.text) + '</span>' +
          '<span class="al-mod">' + UI.esc(L(Schema.get(a.module) ? Schema.get(a.module).label : { ar: '', en: '' })) + '</span>' +
          '</div>';
      });
      html += '</div></div>';
    });

    host.innerHTML = html;

    host.querySelectorAll('[data-go]').forEach(function (row) {
      row.onclick = function () {
        var m = row.getAttribute('data-go'), rid = row.getAttribute('data-rid');
        App.go(m);
        if (rid) setTimeout(function () { try { EntityPage.openDetail(m, rid); } catch (e) {} }, 220);
      };
    });
    var pb = document.getElementById('alPrint');
    if (pb) pb.onclick = function () { window.print(); };
  };

  Alerts.dashboardHTML = function (limit) {
    var all = mergedList().slice(0, limit || 6);
    if (!all.length) {
      return '<div class="empty-state" style="padding:26px">' + UI.icon('check', 34) +
        '<p>' + t('alerts.none') + '</p></div>';
    }
    var h = '';
    all.forEach(function (a) {
      h += '<div class="alert-row" data-alert="' + UI.attr(a.module) + '" data-rid="' + UI.attr(a.recordId || '') + '">' +
        '<span class="al-ic ' + a.level + '">' + UI.icon(a.icon, 15) + '</span>' +
        '<span class="al-tx">' + UI.esc(a.text) + '</span></div>';
    });
    return h;
  };

  console.info('dc-alerts.js: document-control alerts (overdue replies, notice deadlines, ' +
    'superseded copies still on site) now merged into Alerts.list/count/render/dashboardHTML.');
})(window);
