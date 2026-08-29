/* =========================================================================
   stock-arrival-gate.js — يُنهي إصلاح المخزون: يُلصق Dashboard.analytics
                           بالحساب المصحَّح، ويفتح باباً لتسجيل الوصول على
                           تحويل معتمد ومقفل
                           FINISHES THE STOCK FIX: wires Dashboard.analytics
                           to the corrected computation, and opens a door
                           to record arrival on an approved, locked transfer
   -------------------------------------------------------------------------
   لماذا ملف ثانٍ، لا نفس ملف stock-in-transit.js · WHY A SECOND FILE, NOT
   PART OF stock-in-transit.js

   stock-in-transit.js يُحمَّل بين hr-alerts.js وdc-alerts.js — قبل أن يوجد
   Dashboard (يُنشأ في pages/dashboard.js) أو EntityPage (يُنشأ في pages/
   entity.js) بكثير. لا يمكن لملف واحد أن يشغل الفتحتين معاً؛ وتأجيل لصق
   Dashboard.analytics لهذا الملف عبر مؤقّت أو حدث تحميل لا يمكن إثبات
   خلوّه من سباق مقابل رابط مباشر لشاشة التقارير. لذلك فتحتان مُثبَتتان،
   كل ملف في مكانه الصحيح.

   stock-in-transit.js loads between hr-alerts.js and dc-alerts.js — long
   before Dashboard exists (created inside pages/dashboard.js) or
   EntityPage exists (created inside pages/entity.js). One file cannot
   occupy both slots, and deferring the Dashboard.analytics patch to a
   timer or a load event cannot be proven race-free against a deep link
   straight into the reports screen. Hence two proven slots, one file each.

   -------------------------------------------------------------------------
   الجزء الأول · PART ONE — يُصحّح ما تراه شاشة التقارير فعلاً

   pages/reports.js:413 (تفصيل المخزون لكل مخزن) وrules.js:132 (حارس
   الرصيد السالب) يقرآن Dashboard.analytics.stockQty مباشرة. stock-in-
   transit.js بنى الحساب الصحيح (StockInTransit.qty) لكنه لا يستطيع لمس
   Dashboard — غير موجود بعد وقت تحميله. هنا، حيث Dashboard موجود فعلاً،
   نُلصق الخاصيتين **على نفس الكائن الموجود دون استبداله** — reports.js:
   7-8 يخزّن مرجع الكائن (A = A || Dashboard.analytics) ويقرأ .stockQty
   وقت النداء لا وقت التخزين؛ استبدال الكائن نفسه كان سيُبقي reports.js
   عالقاً على النسخة القديمة إلى الأبد.

   pages/reports.js:413 (the per-warehouse stock breakdown) and rules.js:
   132 (the negative-stock guard) both read Dashboard.analytics.stockQty
   directly. stock-in-transit.js built the correct computation
   (StockInTransit.qty) but cannot touch Dashboard — it does not exist yet
   at its load time. Here, where Dashboard genuinely exists, we patch both
   properties **on the SAME existing object, never by replacing it** —
   reports.js:7-8 caches the object reference (A = A || Dashboard.
   analytics) and reads .stockQty at call time, not at cache time;
   replacing the object itself would strand reports.js on the old one
   forever.

   -------------------------------------------------------------------------
   الجزء الثاني · PART TWO — الباب الوحيد لتسجيل الوصول

   workflow.js:13/33-36: مستند معتمد لا يُعدَّل أو يُحذف أبداً — فقط
   يُعكَس. pages/entity.js:88/:407 تُخفي زر التعديل على أي سجل مقفل. فلا
   طريق موجود اليوم لملء arrivalDate على تحويل معتمد. لو صحّحنا الحساب
   دون فتح هذا الباب لَتجمَّد كل مخزن وجهة عند صفر إلى الأبد — بالضبط فشل
   "تعليم الموظفين أن الموقع خطأ" الذي يمنعه هذا المشروع كله.

   workflow.js:13/33-36: an approved document is never edited or deleted —
   only reversed. pages/entity.js:88/:407 hides the edit button on any
   locked record. So there is NO existing path to fill arrivalDate on an
   approved transfer today. Correcting the arithmetic without opening this
   door would freeze every destination warehouse at zero forever — exactly
   the "teach staff the portal is wrong" failure this whole project exists
   to prevent.

   الحل: نلفّ EntityPage.openDetail (نفس أسلوب attachments.js وemployee-
   statement.js المُثبَت) ونحقن زرّاً «تسجيل وصول التحويل» على أي تحويل
   معتمد بلا تاريخ وصول. الزر يفتح نافذة (UI.modal) لإدخال arrivalDate
   (وreceivedByDest اختيارياً)، ثم يكتب **عبر باب القاعدة الموقّع
   az_record_arrival (الملف 48)** لا عبر Store.save — لأن سياسة التعديل
   ترفض كتابة أمين المخزن على مستند معتمد مهما فعل المتصفح، وحارس
   الجداول — إن كان مفعّلاً — يرفضها للجميع؛ الدالة وحدها تملك مفتاحه
   وتفحص الدور والموقع والحالة وتكتب الحقلين فقط. النجاح لا يُصدَّق إلا
   بقراءة الصف الذي أعادته الدالة نفسها (لا تُصدِّق «تم الحفظ» أبداً)،
   ومسار RPC لا يكتب نسخة متفائلة محلياً أصلاً — فالرفض نظيف بلا بقايا.

   The fix: wrap EntityPage.openDetail (the proven technique of
   attachments.js and employee-statement.js) and inject a "Record
   transfer arrival" button on any approved transfer with no arrival date
   yet. The button opens a modal for arrivalDate (and optionally
   receivedByDest), then writes **through the signed database door
   az_record_arrival (file 48)**, never Store.save — the UPDATE policy
   refuses a storekeeper's write to an approved row whatever the browser
   does, and the table guard (if live) refuses it for everyone; only the
   function holds its key, checks role/site/status, and writes exactly
   the two fields. Success is believed only by reading the row the
   function itself returned (never trust "saved"), and the RPC path
   writes no optimistic local copy at all — a refusal leaves zero residue.

   -------------------------------------------------------------------------
   بوابتان · TWO GATES

   Auth.can('stockTransfers','edit') — أمين المخزن يملكها (auth.js:291) —
   وعبر الاتصال فقط، بنفس قاعدة workflow.js:85-89 للانتقالات: الزر يظهر
   دائماً لمن يملك الصلاحية (لا نخفيه حسب الاتصال، تماماً كما تفعل أزرار
   الاعتماد نفسها)، لكن الضغط عليه دون اتصال يُرفض فوراً برسالة صريحة، لا
   بمحاولة صامتة تفشل لاحقاً.

   Auth.can('stockTransfers','edit') — the storekeeper holds it (auth.js:
   291) — and online only, matching workflow.js:85-89's own rule for
   transitions: the button always shows for whoever holds the permission
   (never hidden based on connectivity, exactly like the approval buttons
   themselves), but pressing it while offline is refused immediately with
   an honest message, not a silent attempt that fails later.

   -------------------------------------------------------------------------
   نصف الإصلاح، من هذا الطرف · THE HALF-STATE, FROM THIS SIDE

   لو غاب stock-in-transit.js (StockInTransit غير موجود)، لا نلمس
   Dashboard.analytics إطلاقاً — لصقه بدالّة تنادي كائناً غير موجود كان
   سيُفجِّر كل شاشة تقارير وكل حفظ فوراً. نترك اليوم كما هو، ونُحذّر بصوت
   عالٍ في الكونسول وبإشعار toast مباشر — لا عبر سلسلة Alerts، لأنها
   تجمَّدت بالفعل عند dc-alerts.js قبل أن يُحمَّل هذا الملف بكثير (انظر
   تعليق loader.js نفسه عند doc-status-field.js لنفس الملاحظة)؛ لفّ
   Alerts.list هنا كان سيظهر فقط عند نداء مباشر نادر (assistant.js) ولن
   يظهر أبداً في الشاشة أو الشارة الجانبية أو بطاقتَي اللوحة — فشل صامت من
   نوع آخر لا نريده.

   If stock-in-transit.js is missing (StockInTransit does not exist), we
   touch Dashboard.analytics NOT AT ALL — patching it to call a
   non-existent object would blow up every reports screen and every save
   immediately. We leave today's behaviour exactly as it is, and warn
   loudly in the console plus a direct toast — not through the Alerts
   chain, because it is already frozen at dc-alerts.js long before this
   file loads (see loader.js's own comment at doc-status-field.js for the
   identical observation); wrapping Alerts.list here would only ever
   surface through one rare direct call (assistant.js) and never reach the
   screen, the sidebar badge or either dashboard card — a different flavour
   of silent failure we do not want either.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف (وstock-in-transit.js) فتعود
   حسابات المخزون والحارس إلى سلوك اليوم تماماً. السجلات التي مرّت عليها
   نافذة تسجيل الوصول تبقى صالحة تحت الكود القديم، الذي يتجاهل الحقلين
   كلياً على أي حال.
   Delete this file (and stock-in-transit.js) and stock arithmetic and the
   guard revert to exactly today's behaviour. Records touched by the
   arrival modal remain valid under the old code, which ignores both
   fields entirely anyway.

   ⚠️ ترتيب التحميل إلزامي · MANDATORY LOAD ORDER — مباشرة بعد pages/
   entity.js وقبل employee-statement.js وفق خطة هذه الدفعة (الفتحة
   الحقيقية المختارة: مباشرة بعد employee-statement.js، بحيث يكون Dashboard
   وDashboardView وEntityPage كلها موجودة فعلاً). يحتاج Dashboard/
   EntityPage/Store/Schema/Auth/UI/Workflow موجودين.
   Immediately after employee-statement.js, so Dashboard, DashboardView and
   EntityPage all already exist. Needs Dashboard/EntityPage/Store/Schema/
   Auth/UI/Workflow already loaded.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Dashboard || !global.EntityPage || !global.Store || !global.Schema ||
      !global.Auth || !global.UI || !global.Workflow) {
    console.error('stock-arrival-gate.js needs dashboard.js, entity.js, store.js, schema.js, auth.js, ui.js and workflow.js loaded first');
    return;
  }
  if (Dashboard.__azStockArrivalGateInstalled) return; /* حارس ضد لفّ مزدوج */
  Dashboard.__azStockArrivalGateInstalled = true;

  function L(o) { return (global.I18N && I18N.L) ? I18N.L(o) : (o && (o.ar || o.en)) || ''; }

  /* ----------------------------------------------------------------------
     ١ · إلصاق Dashboard.analytics بالحساب المصحَّح — في المكان، لا استبدال
        PATCH Dashboard.analytics onto the corrected computation — IN
        PLACE, never by replacing the object
     -------------------------------------------------------------------- */
  if (!global.StockInTransit) {
    console.warn('[stock-arrival-gate] stock-in-transit.js is missing — Dashboard.analytics ' +
      'left UNCHANGED (today\'s uncorrected behaviour). Re-upload both files together: ' +
      'stock-in-transit.js and stock-arrival-gate.js.');
    if (global.UI && UI.toast) {
      setTimeout(function () {
        UI.toast(L({
          ar: 'نصف إصلاح التحويلات فقط مُحمَّل (stock-in-transit.js غائب) — أعد رفع الملفين معاً.',
          en: 'Only half of the stock-transfer fix is loaded (stock-in-transit.js is missing) — re-upload both files together.'
        }), 'error', 12000);
      }, 1500); /* بعد أن يستقر toastHost على الشاشة */
    }
  } else {
    Dashboard.analytics.stockQty = function (itemId, warehouseId) {
      return StockInTransit.qty(itemId, warehouseId);
    };
    /* نفس منطق dashboard.js:121-127 حرفاً، بقيمة الوجهة الوحيدة المصحَّحة —
       stockValue لا وسيط مخزن له أصلاً فقيمته لا تتغيّر رقمياً (التحويلات
       تُصفَّر شركياً بالبناء)، لكنه يُلصق أيضاً ليبقى تعريف واحد للمخزون لا
       اثنين. Byte-for-byte dashboard.js:121-127, with the one corrected
       value source — stockValue never took a warehouse argument to begin
       with, so its number does not change (transfers net to zero
       company-wide by construction), but it is patched too so there
       remains ONE definition of stock, not two. */
    Dashboard.analytics.stockValue = function () {
      var v = 0;
      Store.all('items').forEach(function (it) {
        v += StockInTransit.qty(it.id) * (Number(it.lastPrice) || 0);
      });
      return v;
    };
    StockInTransit.__gatePatched = true; /* يقرأه فحص "نصف الإصلاح" في stock-in-transit.js */
  }

  /* ----------------------------------------------------------------------
     ٢ · الباب الوحيد لتسجيل الوصول · THE ONE DOOR TO RECORD ARRIVAL
     -------------------------------------------------------------------- */
  function canRecordArrival(rec) {
    return !!rec && rec.status === 'approved' && !rec.arrivalDate;
  }

  function employeeOptionsHTML(selected) {
    var opts = '<option value="">' + UI.esc(L({ ar: '—', en: '—' })) + '</option>';
    Store.all('employees')
      .filter(function (e) { return e.status === 'active'; })
      .slice()
      .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'ar'); })
      .forEach(function (e) {
        opts += '<option value="' + UI.attr(e.id) + '"' + (e.id === selected ? ' selected' : '') + '>' + UI.esc(e.name) + '</option>';
      });
    return opts;
  }

  /* (كانت هنا دالة waitSettled لانتظار استقرار مزامنة Store.save — حُذفت
     مع التحول لمسار RPC في نفس يوم البناء: الدالة az_record_arrival تعيد
     الصف المكتوب نفسه، فلا مزامنة تُنتظر ولا بقايا تعارض تُدار.
     A waitSettled helper lived here for the Store.save sync — removed
     the same build day with the switch to the RPC path: az_record_arrival
     returns the written row itself, so there is no sync to await and no
     conflict residue to manage.) */

  function openArrivalModal(id, rec) {
    var today = (global.I18N && I18N.today) ? I18N.today() : new Date().toISOString().slice(0, 10);
    var minD = rec.date || '';
    var body =
      '<label class="field"><span class="field-label">' +
        L({ ar: 'تاريخ الوصول الفعلي', en: 'Actual arrival date' }) + ' <span class="req">*</span></span>' +
        '<input type="date" class="input" id="azArrivalDateInput" value="' + UI.attr(today) + '"' +
        (minD ? ' min="' + UI.attr(minD) + '"' : '') + ' max="' + UI.attr(today) + '">' +
        '<span class="err-msg" id="azArrivalDateErr" hidden></span>' +
      '</label>' +
      '<label class="field mt-2"><span class="field-label">' +
        L({ ar: 'المستلم بمخزن الوجهة', en: 'Received by (destination)' }) + '</span>' +
        '<select class="select" id="azReceivedByInput">' + employeeOptionsHTML(rec.receivedByDest) + '</select>' +
      '</label>';

    UI.modal({
      size: 'narrow',
      title: L({ ar: 'تسجيل وصول التحويل', en: 'Record transfer arrival' }),
      body: body,
      buttons: [
        { label: t('g.cancel'), cls: 'btn-ghost' },
        {
          label: L({ ar: 'تأكيد الوصول', en: 'Confirm arrival' }), cls: 'btn-primary', keepOpen: true,
          onClick: function () {
            var dateEl = document.getElementById('azArrivalDateInput');
            var empEl = document.getElementById('azReceivedByInput');
            var errEl = document.getElementById('azArrivalDateErr');
            var v = dateEl && dateEl.value;

            function showErr(msg) {
              if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
              if (dateEl) dateEl.classList.add('input-error');
              return false;
            }

            if (!v) return showErr(t('g.required'));
            if (minD && v < minD) {
              return showErr(L({ ar: 'تاريخ الوصول لا يمكن أن يسبق تاريخ التحويل (' + minD + ').',
                                  en: 'Arrival date cannot be before the transfer date (' + minD + ').' }));
            }
            if (v > today) {
              return showErr(L({ ar: 'لا يمكن تسجيل وصول بتاريخ مستقبلي.', en: 'Arrival cannot be recorded on a future date.' }));
            }
            if (!Store.isOnline()) {
              UI.toast(L({
                ar: 'تسجيل الوصول يحتاج اتصالاً بالإنترنت. حاول مرة أخرى بعد عودة الاتصال.',
                en: 'Recording arrival requires internet. Try again once you are back online.'
              }), 'error', 6000);
              return false;
            }

            return (async function () {
              /* عبر باب القاعدة الموقّع az_record_arrival (الملف 48) لا عبر
                 Store.save — لسببين مُثبَتين: سياسة التعديل ترفض كتابة أمين
                 المخزن على مستند معتمد مهما فعل المتصفح، وحارس الجداول —
                 إن كان مفعّلاً — يرفضها للجميع؛ الدالة وحدها تملك مفتاحه.
                 والمكسب الثالث: مسار RPC لا يكتب نسخة متفائلة محلياً، فعطل
                 «تاريخ مرفوض يبقى على الشاشة تحت تعارضات» لا يحدث هنا أصلاً.
                 Through the signed database door az_record_arrival (file
                 48), not Store.save — for two proven reasons: the UPDATE
                 policy refuses a storekeeper's write to an approved row
                 whatever the browser does, and the table guard — if live —
                 refuses it for everyone; only the function holds its key.
                 Third win: the RPC path never writes an optimistic local
                 copy, so the known "refused date lingers under Conflicts"
                 fault cannot happen here at all. */
              var client = global.Auth && Auth.client && Auth.client();
              if (!client || !client.rpc) {
                UI.toast(L({
                  ar: 'تعذّر الاتصال بالخادم. حاول مرة أخرى.',
                  en: 'Could not reach the server. Try again.'
                }), 'error', 6000);
                return false;
              }
              var rpc = await client.rpc('az_record_arrival', {
                p_id: id,
                p_arrival_date: v,
                p_received_by: (empEl && empEl.value) || null
              });
              if (rpc.error) {
                /* رسالة الخادم تُعرض حرفياً — الدالة تكتبها ثنائية اللغة
                   وتشخّص السبب (الدور، الحالة، التاريخ…). ولو كانت «الدالة
                   غير موجودة» فالملف 48 لم يُشغَّل بعد — قولها صراحةً.
                   The server's message is shown verbatim — the function
                   writes it bilingual and diagnosed. And "function does
                   not exist" means file 48 has not been run yet — say so. */
                var msg = rpc.error.message || '';
                if (/az_record_arrival.*does not exist|function public\.az_record_arrival/i.test(msg)) {
                  msg = L({ ar: 'ملف قاعدة البيانات 48 لم يُشغَّل بعد — الباب غير موجود. أخبر محمد زيدان.',
                            en: 'Database file 48 has not been run yet — the door does not exist. Tell Mohamed Zidan.' });
                }
                UI.toast(L({ ar: 'رفض الخادم تسجيل الوصول: ', en: 'The server refused the arrival: ' }) + msg,
                  'error', 12000);
                return false;
              }
              /* لا نُصدِّق النجاح إلا بقراءة الصف العائد نفسه — الدالة تعيد
                 السجل كاملاً بعد الكتابة. Never trust success except by
                 reading the returned row itself — the function returns the
                 full record after writing. */
              if (!rpc.data || rpc.data.arrivalDate !== v) {
                UI.toast(L({
                  ar: 'لم يتأكَّد وصول القيمة للخادم — أعد المحاولة.',
                  en: 'Could not confirm the value reached the server — try again.'
                }), 'error', 10000);
                return false;
              }
              /* الصف الحقيقي من الخادم يحلّ محل النسخة المحلية فوراً، فترى
                 كل الشاشات — وعدّاد المخزون المصحَّح — القيمة المؤكَّدة.
                 The real server row replaces the local copy at once, so
                 every screen — and the corrected stock count — sees the
                 CONFIRMED value (same pattern as one-step-approval). */
              try {
                var cached = Store.find('stockTransfers', id);
                if (cached) Object.assign(cached, rpc.data);
              } catch (e) {}

              UI.closeModal();
              UI.toast(L({ ar: 'تم تسجيل الوصول.', en: 'Arrival recorded.' }));
              /* أفضل جهد فقط — يفتح تفاصيل التحويل من جديد ليرى أمين
                 المخزن الرقم المحدَّث فوراً؛ لا شيء يعتمد على نجاح هذا.
                 Best-effort only — reopens the transfer detail so the
                 storekeeper sees the updated figure immediately; nothing
                 depends on this succeeding. */
              setTimeout(function () { try { EntityPage.openDetail('stockTransfers', id); } catch (e) {} }, 50);
              return true;
            })();
          }
        }
      ]
    });
  }

  function panelHTML() {
    return '<div class="form-section" id="azArrivalWrap">' +
      '<div class="form-section-title">' + L({ ar: 'وصول التحويل', en: 'Transfer arrival' }) + '</div>' +
      '<button type="button" class="btn btn-gold" id="azArrivalBtn">' +
        UI.icon('truck', 15) + ' ' + L({ ar: 'تسجيل وصول التحويل', en: 'Record transfer arrival' }) +
      '</button>' +
    '</div>';
  }

  function inject(moduleId, id) {
    if (moduleId !== 'stockTransfers') return;
    if (!Auth.can('stockTransfers', 'edit')) return; /* auth.js:291 — أمين المخزن يملكها */
    var rec = Store.find('stockTransfers', id);
    if (!canRecordArrival(rec)) return;
    var body = document.getElementById('modalBody');
    if (!body || document.getElementById('azArrivalWrap')) return;
    var div = document.createElement('div');
    div.innerHTML = panelHTML();
    body.appendChild(div.firstChild);
    var btn = document.getElementById('azArrivalBtn');
    if (btn) {
      btn.onclick = function () {
        /* الزرّ يظهر دائماً لمن يملك الصلاحية (بنفس منطق أزرار الاعتماد في
           workflow.js) — الرفض عند الضغط فقط لو بلا اتصال، لا بإخفاء الزر.
           The button always shows for whoever holds the permission (same
           logic as the approval buttons in workflow.js) — refusal happens
           only on click if offline, never by hiding the button. */
        if (!Store.isOnline()) {
          UI.toast(L({
            ar: 'تسجيل الوصول يحتاج اتصالاً بالإنترنت. حاول مرة أخرى بعد عودة الاتصال.',
            en: 'Recording arrival requires internet. Try again once you are back online.'
          }), 'error', 6000);
          return;
        }
        openArrivalModal(id, rec);
      };
    }
  }

  function install() {
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      /* ٢٠٠ مللي ثانية: بعد attachments.js (١٢٠) وemployee-statement.js
         (١٦٠)، فيظهر زرّنا تحتهما لا فوقهما. 200ms: after attachments.js's
         120 and employee-statement.js's 160, so our button lands below
         both rather than above them. */
      setTimeout(function () { try { inject(moduleId, id); } catch (e) { console.error('[stock-arrival-gate] inject failed', e); } }, 200);
    };
  }
  install();

  global.StockArrivalGate = {
    canRecordArrival: canRecordArrival,
    /* يُفشِح للاختبار الآلي فقط — لا يناديه أي كود حي */
    openArrivalModal: openArrivalModal
  };

  console.info('stock-arrival-gate.js ready — Dashboard.analytics now reflects recorded ' +
    'arrivals, and approved transfers with no arrival date show a "Record transfer ' +
    'arrival" button on their detail screen.');
})(window);
