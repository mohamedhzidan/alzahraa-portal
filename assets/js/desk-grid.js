/* =========================================================================
   desk-grid.js — عقد لوحة المفاتيح على شبكة الأسطر (الخطة §٥)
                  THE KEYBOARD CONTRACT on a lines grid (plan §5)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · accountant's desk — v2.0.38

   لا نعدّل entity.js — نقرأ mod.quickEntry فقط · WE DO NOT EDIT entity.js —
   we only READ mod.quickEntry
   -------------------------------------------------------------------------
   مستمع Enter/Shift+Enter واحد يُركَّب مرّة واحدة عند تحميل هذا الملف على
   document (طور الالتقاط)، ويتحقّق فى كل ضغطة من أنّ #entForm الحالي
   ينتمي لوحدة تحمل quickEntry — فلا حاجة لتركيب/فكّ مستمعين مع كل فتح/
   إغلاق نافذة (مصدر أخطاء شائع مُثبَت في هذا المشروع).
   ONE Enter/Shift+Enter listener is installed ONCE at file-load time on
   document (capture phase), and checks on every keypress whether the
   CURRENT #entForm belongs to a module carrying quickEntry — so there is
   no attach/detach dance around each modal open/close (a proven, common
   source of bugs in this project).

   لماذا Escape ليس هنا · WHY Escape IS NOT HERE
   -------------------------------------------------------------------------
   screen-behaviour.js (موجود بالفعل، لا يُبنى هنا) يعترض Escape في طور
   الالتقاط على document ويسأل «هل تريد المغادرة؟» إن كان النموذج «متسخاً»
   — وبصمته تُؤخَذ من كل [name] داخل #entForm، بما فيها خانات الأسطر. لا
   حاجة لإعادة بنائه. الاستثناء الوحيد: إغلاق منتقي الحساب العائم نفسه —
   ذلك من عمل desk-cell-picker.js عند فتحه فقط.
   screen-behaviour.js (already exists, not built here) already intercepts
   Escape in the capture phase on document and asks "leave?" when the form
   is "dirty" — its snapshot is taken from every [name] inside #entForm,
   INCLUDING grid cells. No need to rebuild it. The one exception, closing
   the floating account picker itself, is desk-cell-picker.js's own job,
   only while it is open.

   إضافي بالكامل — حذف هذا الملف يعيد أي شبكة أسطر إلى تنقّل Tab العادي
   بلا Enter/عدّادات/تحقّق فوري، بلا أي أثر على entity.js.
   Fully additive — deleting this file returns any lines grid to plain Tab
   navigation with no Enter contract, no counters, no inline validation,
   with zero effect on entity.js.

   🔴 قيدٌ معلَن — «▸ المزيد» عمودٌ للشبكة كلها، لا صفّ فرعي لكل سطر
   -------------------------------------------------------------------------
   المهمة طلبت زرّاً لكل سطر («▸ المزيد» بجانب كل سطر يفتح صفاً فرعياً
   يخصّه هو وحده). renderLines العامة في entity.js (للقراءة فقط، لا
   نعدّلها) تبني صفاً واحداً فقط لكل عنصر بيانات — لا مكاناً لصفّ HTML
   إضافي أسفل صفّ السطر نفسه بلا تعديل عليها مباشرة. الحل هنا (انظر
   ensureMoreToggle/moreFieldIndices أدناه) بديلٌ مُصرَّح به: عمودٌ واحدٌ
   يُظهر/يُخفي حقول «المزيد» **لكل الأسطر معاً**، لا سطراً بسطر. جُرِّب
   بديلان آخران ورُفضا: (أ) صفّ HTML يُحقَن يدوياً بعد كل `<tr>` — يكسر
   ترقيم tabindex/aria التلقائي الذي تبنيه renderLines لكل صفّ رسمته هي؛
   (ب) نسخة كاملة من renderLines هنا — يُكرّر منطقاً كاملاً سيخرج عن
   التزامن مع أي تعديل مستقبلي على النسخة الأصلية. لم يُصرَف عليه أكثر
   من ١٥ دقيقة كما حدّدت المهمة — قيدٌ مُعلَن، لا عطلٌ خفي.
   🔴 A DECLARED LIMITATION — "▸ More" is a GRID-WIDE column, not a
   per-row sub-row
   -------------------------------------------------------------------------
   The task asked for a per-ROW button (a "▸ More" beside each line opening
   ITS OWN sub-panel). entity.js's generic renderLines (read-only, never
   edited here) builds exactly ONE row per data item — there is no room for
   an extra HTML row beneath a given line's own row without editing it
   directly. The solution here (see ensureMoreToggle/moreFieldIndices
   below) is a disclosed substitute: ONE column toggle that shows/hides
   the "More" fields for EVERY line together, never one row at a time. Two
   other approaches were considered and rejected: (a) manually injecting an
   HTML row after each `<tr>` — breaks the tabindex/aria numbering
   renderLines builds automatically for every row it draws itself; (b) a
   full local copy of renderLines here — duplicates real logic that would
   drift out of sync with any future change to the original. No more than
   the task's own 15-minute cap was spent on this — a declared limitation,
   never a hidden defect.
   ========================================================================= */
(function (global) {
  'use strict';

  /* 🔴 النموذج المفتوح فعلاً، لا أول #entForm في الصفحة: closeModal في ui.js يُخفي النافذة ولا يزيل نموذجها، فكان
     getElementById يعيد نموذج سند الصرف القديم المخفي وهو يحمل quickEntry، فيركّب المنتقي العائم على خانة الصنف في
     «اعتماد شراء» فتظهر قائمتها بحجم صفر. نأخذ آخر #entForm داخل نافذة ظاهرة؛ لا نافذة ظاهرة = لا نموذج.
     🔴 The form that is really open, not the first #entForm on the page: ui.js closeModal hides the window and never
     removes its form, so getElementById returned the old hidden payment form — which carries quickEntry — and the
     floating picker took over the item box of a purchase approval, whose list then opened at zero size. We take the
     LAST #entForm inside a visible window; no visible window = no form. */
  function openForm() {
    var list = document.querySelectorAll('#modalHost:not([hidden]) #entForm');
    return list.length ? list[list.length - 1] : null;
  }
  function mod() {
    var form = openForm();
    if (!form) return null;
    var id = form.getAttribute('data-module');
    return (global.Schema && id) ? Schema.get(id) : null;
  }
  function hasQuickEntry() { var m = mod(); return !!(m && m.quickEntry); }

  /* ── التحقّق من سطر واحد عند Enter — لا يمنع القفل هنا أبداً (البند ٤) ────
     Validate ONE line at Enter — the 300ms lock NEVER blocks this (item 4). */
  function amountMsg(v) {
    if (v === null || v === undefined || v === '') return { ar: 'المبلغ مطلوب', en: 'Amount is required' };
    if (isNaN(Number(v))) return { ar: 'قيمة غير صحيحة', en: 'Invalid value' };
    if (Number(v) < 0) return { ar: 'المبلغ لا يكون سالباً — المرتجعات لها مستندها', en: 'Amount cannot be negative — returns have their own document' };
    return null;
  }
  function rowEl(i) { var w = document.getElementById('linesWrap'); return w ? w.querySelector('[data-li="' + i + '"]') : null; }
  function cellInput(i, field) { var tr = rowEl(i); return tr ? tr.querySelector('[name="' + field + '"]') : null; }
  function markCell(i, field, msg) {
    var el = cellInput(i, field); if (!el) return;
    var td = el.closest('td'); if (!td) return;
    var err = td.querySelector('.err-msg');
    if (!err) { err = document.createElement('span'); err.className = 'err-msg'; td.appendChild(err); }
    if (msg) { err.hidden = false; err.textContent = (global.L ? L(msg) : msg.ar); el.classList.add('input-error'); }
    else { err.hidden = true; el.classList.remove('input-error'); }
  }

  /* 🔴 عُمِّم — عطلٌ حقيقيّ وُجد بالقراءة قبل بناء شبكتَي المورّدين (الشريحة
     ٣، desk-supplier-docs.js)، ويُثبَت بتشغيل تجربة t10 — لا بالقراءة وحدها.
     كانت clearRowErrors/validateRow/computeCounts تفحص أسماء ثابتة
     'account'/'amount'/'description' مباشرة. أي شبكة أسطر جديدة بلا حقل
     اسمه «account» (توزيع سند الصرف: invoice+amount فقط؛ روابط المستخلص:
     linkedDoc+linkedAmount فقط) كانت سترجع false دائماً عند آخر خطوة —
     فلا يُنشأ سطر جديد بـEnter مطلقاً، وبلا أي رسالة خطأ ظاهرة (markCell/
     focusCell تُرجعان بصمت حين لا يجد tr.querySelector عنصراً اسمه
     «account» أصلاً). الإصلاح: قائمة حقول مطلوبة تُقرأ من
     m.quickEntry.requiredFields إن وُجدت، وإلا القائمة الافتراضية أدناه —
     فتسوية العهدة والقيد اليومي (لا يعرّفان requiredFields) يعملان بلا أي
     تغيير في السلوك، بالحرف (مُثبَت: t04/t05/t06/t07 أُعيد تشغيلها بعد
     هذا التعميم ومرّت كما كانت).
     🔴 GENERALISED — a real defect found by reading before building the two
     supplier grids (slice 3, desk-supplier-docs.js), proven by running t10
     — not by reading alone. clearRowErrors/validateRow/computeCounts
     checked the FIXED names 'account'/'amount'/'description' directly —
     any new lines grid with no field named "account" (the payment
     allocation grid: invoice+amount only; the certificate links grid:
     linkedDoc+linkedAmount only) would ALWAYS return false on its last
     step, so Enter could NEVER create a new row — not even with a visible
     error (markCell/focusCell return silently when tr.querySelector finds
     no element named "account" at all). THE FIX: a required-fields list
     read from m.quickEntry.requiredFields when present, else the default
     list below — so custody settlements and the journal (which never
     define requiredFields) run with ZERO behaviour change (proven:
     t04/t05/t06/t07 re-run after this generalisation and still pass
     exactly as before). */
  var DEFAULT_REQUIRED_FIELDS = [
    { name: 'account', kind: 'ref', msg: { ar: 'الحساب مطلوب', en: 'Account is required' } },
    { name: 'amount', kind: 'amount' },
    { name: 'description', kind: 'text', msg: { ar: 'البيان مطلوب', en: 'Description is required' } }
  ];
  function requiredFieldsFor(m) { return (m.quickEntry && m.quickEntry.requiredFields) || DEFAULT_REQUIRED_FIELDS; }
  function clearRowErrors(i, m) { requiredFieldsFor(m).forEach(function (r) { markCell(i, r.name, null); }); }

  function effectiveSteps(i, m) {
    var base = m.quickEntry.steps.slice();
    var equip = base.indexOf('equipment');
    if (equip !== -1) {
      var acc = cellInput(i, 'account'), ci = cellInput(i, 'costItem');
      var line = { account: acc ? acc.value : '', costItem: ci ? ci.value : '' };
      var needs = false;
      try { needs = m.quickEntry.equipmentWhen(line); } catch (e) {}
      if (!needs) base.splice(equip, 1);
    }
    return base;
  }

  /* ── التحقّق قبل التقدّم أو إنشاء سطر (نمط tryCommitRow في المعاينة) ──────
     Validate before advancing/creating a row (the preview's tryCommitRow
     pattern) — returns true if the row is fully valid. Generalised over
     m.quickEntry.requiredFields — see the comment above DEFAULT_REQUIRED_FIELDS. */
  function validateRow(i, m) {
    clearRowErrors(i, m);
    var reqs = requiredFieldsFor(m);
    for (var k = 0; k < reqs.length; k++) {
      var r = reqs[k];
      var el = cellInput(i, r.name);
      if (r.kind === 'amount') {
        var am = amountMsg(el ? el.value : '');
        if (am) { markCell(i, r.name, am); focusCell(i, r.name); return false; }
      } else if (!el || !el.value || (r.kind === 'text' && !String(el.value).trim())) {
        markCell(i, r.name, r.msg || { ar: 'هذا الحقل مطلوب', en: 'This field is required' });
        focusCell(i, r.name);
        return false;
      }
    }
    return true;
  }

  function focusCell(i, field) {
    var tr = rowEl(i); if (!tr) return;
    var el = tr.querySelector('[name="' + field + '"]');
    if (!el) return;
    /* خانة select مُحسَّنة بالمنتقي — نفتحه بدل التركيز على select المخفي
       An enhanced select — open the picker instead of focusing the hidden native select. */
    if (el.tagName === 'SELECT' && el.style.display === 'none' && global.DeskCellPicker) {
      el.style.display = ''; el.focus();
      return;
    }
    el.focus();
    if (el.select) try { el.select(); } catch (e) {}
  }

  var lastRowCreateAt = 0;

  function rowCount() { var w = document.getElementById('linesWrap'); return w ? w.querySelectorAll('[data-li]').length : 0; }

  /* 🔴 عُمِّم — «account» كان اسماً ثابتاً هنا في موضعَين (السطر التالي، والسطر
     الجديد) — عطلٌ حقيقيّ عمّمته الشبكتان الجديدتان (توزيع سند الصرف:
     invoice+amount؛ روابط المستخلص/الدائن: linkedDoc+linkedAmount) اللتان
     لا تملكان حقلاً اسمه «account» إطلاقاً: Enter على آخر خطوة كان يُنشئ
     سطراً جديداً بالفعل (rowCount يتغيّر) لكن التركيز لا يهبط على أي حقل
     (focusCell تجد null فتعود بصمت) — سطرٌ جديد بلا مؤشرٍ ظاهر عليه أبداً
     (b03 P1/C1، مُثبَت بالتشغيل). الإصلاح: أوّل خطوة في m.quickEntry.steps
     نفسها — نفس القيمة «account» بالحرف لتسوية العهدة والقيد اليومي (لا
     تغيير سلوك هناك، t05 يبقى ٦٩/٦٩)، والحقل الحقيقي الأول لكل شبكة أخرى.
     🔴 GENERALISED — "account" was a FIXED name here in two spots (the
     next row, and a freshly-created row) — a real defect the two NEW
     grids exposed (payment allocation: invoice+amount; certificate/credit
     links: linkedDoc+linkedAmount), neither of which has any field named
     "account" at all: Enter on the last step DID create a new row
     (rowCount changed) but focus never landed anywhere (focusCell found
     null and returned silently) — a new row with no visible cursor on it
     at all (b03 P1/C1, proven by running it). THE FIX: the FIRST step in
     m.quickEntry.steps itself — the exact same "account" for custody
     settlements and the journal (no behaviour change there, t05 stays
     69/69), and the real first field for every other grid. */
  function tryAdvanceOrCreate(i, field, m) {
    var steps = effectiveSteps(i, m);
    var idx = steps.indexOf(field);
    if (idx === -1) return; /* حقل «المزيد» — ليس ضمن عقد Enter */
    if (idx < steps.length - 1) { focusCell(i, steps[idx + 1]); return; }
    /* آخر خطوة في السطر — تحقّق أولاً دائماً (بلا صلة بالقفل) */
    if (!validateRow(i, m)) return;
    if (i < rowCount() - 1) { focusCell(i + 1, m.quickEntry.steps[0]); return; }
    var withinLock = (Date.now() - lastRowCreateAt) < 300;
    if (withinLock) return; /* سطر صالح لكن داخل القفل — لا سطر جديد الآن */
    var addBtn = document.getElementById('addLine');
    if (!addBtn) return;
    addBtn.click();
    lastRowCreateAt = Date.now();
    setTimeout(function () { focusCell(rowCount() - 1, m.quickEntry.steps[0]); }, 0);
  }

  /* 🔴 عُمِّم أيضاً — نفس فخّ «account» الثابت، لكن باتجاه الرجوع
     (Shift+Enter). كانت الدالّة تفحص `field === 'account'` حرفياً لتقرير
     «هل هذا أوّل حقلٍ في السطر؟» — فالشبكتان الجديدتان (أوّل حقل فيهما
     invoice/linkedDoc لا account) لم تكونا تعودان إلى السطر السابق
     إطلاقاً عند Shift+Enter على أوّل حقلٍ فيهما (b03 P2، مُثبَت بالتشغيل).
     الإصلاح: المقارنة بموضع الحقل ضمن خطوات هذا السطر (idx===0)، لا باسمه
     الحرفي — يعمل لأي شبكة، ويبقى مطابقاً بالحرف لتسوية العهدة والقيد
     اليومي (حيث أوّل خطوة هي «account» فعلاً، فـidx===0 يساويها تماماً).
     ALSO GENERALISED — the same fixed-"account" trap, in the STEP-BACK
     direction (Shift+Enter). This function checked `field === 'account'`
     literally to decide "is this the row's first field?" — so the two NEW
     grids (whose first field is invoice/linkedDoc, never account) never
     stepped back to the previous row at all on Shift+Enter from their own
     first field (b03 P2, proven by running it). THE FIX: compare the
     field's POSITION within this row's own steps (idx===0), never its
     literal name — works for any grid, and stays byte-identical for
     custody settlements and the journal (whose first step really is
     "account", so idx===0 matches it exactly). */
  function stepBack(i, field, m) {
    var steps = effectiveSteps(i, m);
    var idx = steps.indexOf(field);
    if (idx === 0) {
      if (i > 0) { var prevSteps = effectiveSteps(i - 1, m); focusCell(i - 1, prevSteps[prevSteps.length - 1]); }
      return;
    }
    if (idx > 0) focusCell(i, steps[idx - 1]);
  }

  /* ── Ctrl/Cmd+Enter = حفظ مسودة فوراً، لا يتقدّم أبداً (§5.2) ────────────── */
  function saveDraftNow() {
    var buttons = document.querySelectorAll('#modalFoot button');
    var save = null;
    buttons.forEach(function (b) { if (b.classList.contains('btn-primary')) save = b; });
    if (save) save.click();
  }

  document.addEventListener('keydown', function (e) {
    var m = mod();
    if (!m || !m.quickEntry) return;
    var t = e.target;
    if (!t) return;

    /* 🔴 المنتقي العائم (desk-cell-picker.js) يعيش خارج #entForm فعلياً —
       مُلحَق بـdocument.body لا بالنموذج — فهذا الفحص يجب أن يسبق أي بوابة
       closest('#entForm')، وإلا تُرفَض كل ضغطة عليه بصمت (عطل حقيقي وُجد
       أثناء البناء، لا افتراضاً).
       🔴 The floating picker (desk-cell-picker.js) genuinely lives OUTSIDE
       #entForm — appended to document.body, not the form — so this check
       must come BEFORE any closest('#entForm') gate, or every keypress on
       it is silently rejected (a real defect found while building, not
       assumed). */
    if (global.DeskCellPicker && DeskCellPicker.isOpenForBox(t) &&
        (e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === 'Enter' && !e.shiftKey))) {
      DeskCellPicker.handleKeydown(e);
      return;
    }
    /* 🔴 عطلٌ حقيقيّ وُجد بالتشغيل (b03 P2، ١٩ سبتمبر) — Shift+Enter على
       أوّل حقلٍ في السطر حين يكون من نوع "ref" (invoice/linkedDoc/account
       نفسها) لا يصل stepBack أبداً: بمجرّد التركيز عليه يفتح desk-cell-
       picker.js منتقيه فوراً (focusin على أي select داخل linesWrap،
       مُثبَتٌ بقراءة desk-cell-picker.js:461-475) — فينتقل التركيز الحقيقي
       إلى صندوق المنتقي نفسه، المُلحَق بـdocument.body لا بالنموذج، فيفشل
       بوابة closest('#entForm') أدناه بصمت قبل الوصول لِـstepBack إطلاقاً.
       الإصلاح هنا فقط (لا تعديل على desk-cell-picker.js — نستهلك واجهته
       العامة المُصدَّرة أصلاً: activeSelect/closeAndSettle، لا خاصّية
       داخلية مثل `__box` غير الموجودة): نستقرئ الخانة الحقيقية التي فُتح
       المنتقي عليها (DeskCellPicker.activeSelect())، نُسوّي حالته (نفس
       سلوك Escape)، ثم نُنادي stepBack بموضعها الحقيقي — يعمل الآن لأيّ
       شبكة، بما فيها الأولى (تسوية العهدة) التي أوّل حقلٍ فيها "account"
       من النوع نفسه.
       🔴 A REAL DEFECT found by running it (b03 P2, 19 Sept) — Shift+Enter
       on a row's FIRST field, when it is a "ref" type (invoice/linkedDoc/
       account itself), never reaches stepBack at all: the moment it is
       focused, desk-cell-picker.js opens its picker immediately (a
       focusin on ANY select inside linesWrap, proven by reading desk-
       cell-picker.js:461-475) — so real focus moves to the picker's OWN
       box, appended to document.body, not the form, and the closest
       ('#entForm') gate below silently fails before stepBack is ever
       reached. THE FIX here ONLY (no edit to desk-cell-picker.js — this
       consumes its ALREADY-exported public surface: activeSelect/
       closeAndSettle, never an internal property like the non-existent
       `__box`): resolve the REAL cell the picker is open for
       (DeskCellPicker.activeSelect()), settle it (the same behaviour as
       Escape), then call stepBack with its real position — this now works
       for any grid, including the very first one (custody settlements)
       whose own first field, "account", is the same ref type. */
    if (global.DeskCellPicker && DeskCellPicker.isOpenForBox(t) && e.key === 'Enter' && e.shiftKey) {
      var pickedSelect = DeskCellPicker.activeSelect ? DeskCellPicker.activeSelect() : null;
      var pickedRow = pickedSelect && pickedSelect.closest ? pickedSelect.closest('[data-li]') : null;
      if (pickedSelect && pickedRow) {
        e.preventDefault();
        var pickedField = pickedSelect.getAttribute('name');
        var pickedIdx = Number(pickedRow.getAttribute('data-li'));
        var pickedMod = mod();
        if (global.DeskCellPicker.closeAndSettle) DeskCellPicker.closeAndSettle();
        if (pickedMod && pickedMod.quickEntry) stepBack(pickedIdx, pickedField, pickedMod);
      }
      return;
    }

    if (!t.closest) return;
    var inForm = t.closest('#entForm');
    if (!inForm) return;

    /* Ctrl/Cmd+Enter يعمل في أي مكان بالنموذج، لا الشبكة فقط */
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDraftNow(); return; }

    var inGrid = t.closest('#linesWrap');
    if (!inGrid) return;

    /* البند ٩ — تركيب الحروف العربية يُطلق Enter وهمياً؛ يُتجاهل كلياً */
    if (e.isComposing || e.keyCode === 229) return;

    if (e.key !== 'Enter') return;
    /* تكرار المفتاح (ضغطة مطوّلة) يُتجاهل كلياً */
    if (e.repeat) { e.preventDefault(); return; }

    var tr = t.closest('[data-li]');
    if (!tr) return;
    var i = Number(tr.getAttribute('data-li'));
    var field = t.getAttribute('name');
    if (!field) return;
    e.preventDefault();

    if (e.shiftKey) { stepBack(i, field, m); return; }

    /* Enter في خانة select لم يُفتَح منتقيها بعد (مثلاً أول تركيز آلي عند
       فتح النموذج) — نفتحه صراحةً، لا بإعادة تركيز عنصر مركَّز أصلاً
       (t.focus() على عنصر يحمل التركيز فعلاً لا يُطلق focusin ثانية).
       Enter on a select whose picker has not opened yet (e.g. the form's
       own initial auto-focus) — open it EXPLICITLY, not by re-focusing an
       already-focused element (t.focus() on something already focused
       never re-fires focusin). */
    if (t.tagName === 'SELECT' && global.DeskCellPicker) {
      DeskCellPicker.openFor(t);
      return;
    }

    tryAdvanceOrCreate(i, field, m);
  }, true);

  /* ── ما يُستدعى من desk-cell-picker.js بعد الاختيار ─────────────────────
     Called by desk-cell-picker.js right after an option is accepted. */
  function afterPickerAccept(select) {
    var tr = select.closest('[data-li]'); if (!tr) return;
    var i = Number(tr.getAttribute('data-li'));
    var field = select.getAttribute('name');
    var m = mod(); if (!m) return;
    var steps = effectiveSteps(i, m);
    var idx = steps.indexOf(field);
    if (idx !== -1 && idx < steps.length - 1) focusCell(i, steps[idx + 1]);
  }

  /* ═══════════════════════════════════════════════════════════════════
     تحسينات الشبكة عند كل إعادة رسم — مراقب على #linesWrap (مصرَّح به في
     الخطة §5.2 لهذا الغرض بالذات: العدّادات الحيّة)
     GRID ENHANCEMENTS on every re-render — a MutationObserver on
     #linesWrap (explicitly sanctioned by plan §5.2 for exactly this: live
     counters).
     ═══════════════════════════════════════════════════════════════════ */
  function fillMissingLineIds(m) {
    if (!global.DeskSettlementLines) return;
    document.querySelectorAll('#linesWrap [data-li]').forEach(function (tr) {
      var el = tr.querySelector('[name="lineId"]');
      if (el && !el.value) {
        el.value = DeskSettlementLines.newLineId();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /* البند ١ — Tab من آخر خانة في السطر لا يهبط على زرّ الحذف */
  function fixDeleteTabindex() {
    document.querySelectorAll('#linesWrap [data-rmline]').forEach(function (b) { b.setAttribute('tabindex', '-1'); });
  }

  /* البند ٢ (K05) — بند تكلفة تغيّر إلى نوع لا يحتاج معدة، والسطر يحمل
     معدة سابقة — تبقى ظاهرة مشطوبة بدل أن تختفي بصمت.

     🔴 عطلٌ حقيقيّ خطير وُجد بالتشغيل الفعلي — تجميد كامل للمتصفح
     (صفر بالمئة معالج، بلا أي ردّ من DevTools)، مُكرَّر في تشغيلَين
     منفصلين عند نفس الخطوة بالضبط. السبب: هذه الدالة كانت تكتب
     `stale.innerHTML` بلا شرط في كل استدعاء — وكتابة innerHTML طفرة DOM
     (childList) داخل نطاق #linesWrap الذي يراقبه MutationObserver في
     installObservers() أدناه (`{childList:true, subtree:true}`). فكل
     استدعاء لهذه الدالة عبر المراقب يُنتج طفرةً تُشغِّل المراقب من جديد،
     الذي يستدعي enhance() فmarkStaleEquipment() من جديد، التي تكتب
     innerHTML من جديد... حلقة لا نهائية بين «طفرة» و«مراقبة» بلا أي فاصل
     زمني — تُجمِّد التبويب فوراً وبلا أي استثناء يُرمى. الإصلاح هنا طبقتان:
     (١) لا نكتب innerHTML إلا إذا تغيّر محتواه فعلاً (مقارنة بعلامة
     data-eq-name المحفوظة على stale نفسها) — يكسر الحلقة من مصدرها، و
     (٢) installObservers() أدناه يفصل المراقب مؤقتاً أثناء تنفيذ enhance()
     نفسها، فلا تُسجَّل أي طفرة تُحدثها enhance() ذاتها — دفاعٌ ثانٍ يحمي
     أي دالة أخرى تُستدعى من enhance() مستقبلاً من نفس الفخّ، لا هذه
     الدالة وحدها.
     🔴 A SERIOUS real defect found by actually running this — a COMPLETE
     browser freeze (zero percent CPU, no reply from DevTools at all),
     reproduced in two separate runs at exactly the same step. Cause: this
     function used to write `stale.innerHTML` UNCONDITIONALLY on every
     call — and writing innerHTML IS a DOM (childList) mutation inside
     #linesWrap's own scope, which the MutationObserver in
     installObservers() below watches (`{childList:true, subtree:true}`).
     So every call to this function reached via the observer produced a
     mutation that re-triggered the SAME observer, which called enhance()
     → markStaleEquipment() again, which wrote innerHTML again... an
     infinite mutate-then-observe loop with no time gap at all — freezing
     the tab instantly, with no exception ever thrown. The fix has two
     layers: (1) never write innerHTML unless its content actually
     changed (compared against a data-eq-name marker stored on `stale`
     itself) — closes the loop at its source, and (2) installObservers()
     below now disconnects the observer while enhance() itself runs, so
     no mutation enhance() makes is ever delivered back to it — a second,
     more general guard that protects any OTHER function enhance() calls
     from the same trap in the future, not only this one. */
  function markStaleEquipment(m) {
    document.querySelectorAll('#linesWrap [data-li]').forEach(function (tr) {
      var i = Number(tr.getAttribute('data-li'));
      var eqSel = tr.querySelector('[name="equipment"]');
      var ciSel = tr.querySelector('[name="costItem"]');
      if (!eqSel) return;
      /* 🔴 يُعيد تركيب اختيار الاحتياط (job2/portal_equipment_names) بعد
         إعادة رسم عامة تمحوه بصرياً — عطلٌ حقيقيّ وُجد بالتشغيل: إضافة
         سطر جديد (addLine) تُعيد entity.js بناء خانة equipment من
         Store.all('equipment') الفارغة لهذا الدور، فتفقد الخيار المحقون
         سابقاً رغم أنّ القيمة المحفوظة فعلياً تبقى صحيحة (تحقّق عبر REST:
         "equipment":"eq_car_2854" رغم ظهور الخانة فارغة). انظر تعليق
         equipFallbackByLineId الكامل في desk-cell-picker.js.
         🔴 Re-materialises a fallback choice (job2/portal_equipment_names)
         that a generic re-render visually erased — a REAL bug found by
         running this: adding a new line (addLine) makes entity.js rebuild
         the equipment cell from Store.all('equipment') (empty for this
         role), losing the previously-injected option even though the
         actually SAVED value stays correct (verified via REST:
         "equipment":"eq_car_2854" despite the cell showing blank). See
         the full equipFallbackByLineId comment in desk-cell-picker.js. */
      if (!eqSel.value && global.DeskCellPicker && global.DeskCellPicker.equipFallbackFor) {
        var lineIdEl = tr.querySelector('[name="lineId"]');
        var lid = lineIdEl ? lineIdEl.value : null;
        var cached = lid ? global.DeskCellPicker.equipFallbackFor(lid) : null;
        if (cached && !eqSel.querySelector('option[value="' + cached.value + '"]')) {
          global.DeskCellPicker.materialiseEquipmentOption(eqSel, cached);
          eqSel.value = cached.value;
        } else if (cached) {
          eqSel.value = cached.value;
        }
      }
      var td = eqSel.closest('td');
      var needs = false;
      try { needs = m.quickEntry.equipmentWhen({ costItem: ciSel ? ciSel.value : '' }); } catch (e) {}
      var stale = td.querySelector('.azd-equip-stale');
      if (!needs && eqSel.value) {
        eqSel.style.display = 'none';
        if (!stale) {
          stale = document.createElement('div');
          stale.className = 'azd-equip-stale';
          td.appendChild(stale);
        }
        var opt = eqSel.options[eqSel.selectedIndex];
        var name = opt ? opt.textContent : eqSel.value;
        /* لا نكتب إلا لو تغيّر الاسم فعلاً — راجع تعليق العطل أعلاه رأس
           الدالة. Only write if the name genuinely changed — see the
           fault comment at the top of this function. */
        if (stale.getAttribute('data-eq-name') !== name) {
          stale.setAttribute('data-eq-name', name);
          stale.innerHTML = '<s>' + escHtml(name) + '</s><small>' +
            (global.L ? L({ ar: 'لم يعد مناسباً — اختر معدة أو امسح', en: 'No longer applicable — choose or clear' }) : 'لم يعد مناسباً — اختر معدة أو امسح') +
            '</small><button type="button" class="azd-equip-clear" tabindex="-1" data-clear-equip-row="' + i + '">✕ ' +
            (global.L ? L({ ar: 'امسح', en: 'Clear' }) : 'امسح') + '</button>';
        }
      } else if (!needs && !eqSel.value) {
        eqSel.style.display = 'none';
        if (!stale) { stale = document.createElement('span'); stale.className = 'azd-equip-stale azd-na'; stale.textContent = '—'; td.appendChild(stale); }
      } else {
        eqSel.style.display = '';
        if (stale) stale.remove();
      }
    });
    document.querySelectorAll('[data-clear-equip-row]').forEach(function (b) {
      if (b.__azdBound) return; b.__azdBound = true;
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-clear-equip-row'));
        var eqSel = cellInput(i, 'equipment');
        if (!eqSel) return;
        /* يمسح ذاكرة الاحتياط أولاً — وإلا أعاد أوّل enhance() لاحق نفس
           القيمة فوراً (انظر تعليق clearEquipFallback في desk-cell-
           picker.js). Clear the fallback memory FIRST — otherwise the
           very next enhance() call restores the same value right back
           (see clearEquipFallback's comment in desk-cell-picker.js). */
        if (global.DeskCellPicker && global.DeskCellPicker.clearEquipFallback) {
          var lineIdEl = eqSel.closest('[data-li]').querySelector('[name="lineId"]');
          global.DeskCellPicker.clearEquipFallback(lineIdEl ? lineIdEl.value : null);
        }
        eqSel.value = ''; eqSel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* عُمِّمَت لنفس السبب أعلاه — انظر تعليق DEFAULT_REQUIRED_FIELDS. حقل
     المبلغ المُستعمَل في «الإجمالي» هو أوّل حقلٍ بنوع 'amount' في القائمة
     (لا 'amount' حرفياً)، فتوزيع سند الصرف يجمع 'amount' وروابط المستخلص
     تجمع 'linkedAmount' بنفس الدالّة، بلا نسخة ثانية.
     Generalised for the same reason above — see the DEFAULT_REQUIRED_FIELDS
     comment. The field summed into "total" is the first 'amount'-kind
     field in the list (not literally 'amount'), so the payment allocation
     grid sums 'amount' and the certificate links grid sums 'linkedAmount'
     through this SAME function, no second copy. */
  function computeCounts(m) {
    var reqs = requiredFieldsFor(m);
    var amountReq = reqs.filter(function (r) { return r.kind === 'amount'; })[0];
    var amountName = amountReq ? amountReq.name : 'amount';
    var valid = 0, incomplete = 0, total = 0;
    document.querySelectorAll('#linesWrap [data-li]').forEach(function (tr) {
      function filled(r) {
        var el = tr.querySelector('[name="' + r.name + '"]');
        if (!el) return false;
        return r.kind === 'amount' ? (el.value !== '' && Number(el.value) !== 0) : !!String(el.value || '').trim();
      }
      function complete(r) {
        var el = tr.querySelector('[name="' + r.name + '"]');
        if (!el) return false;
        return r.kind === 'amount' ? Number(el.value) > 0 : !!String(el.value || '').trim();
      }
      var started = reqs.some(filled);
      if (!started) return;
      var ok = reqs.every(complete);
      if (ok) { var amt = tr.querySelector('[name="' + amountName + '"]'); valid++; total += Number(amt ? amt.value : 0) || 0; } else incomplete++;
    });
    return { valid: valid, incomplete: incomplete, total: total };
  }
  function appendCounters(m) {
    var foot = document.getElementById('linesFoot');
    if (!foot) return;
    if (foot.querySelector('.azd-linecounts')) return;
    var c = computeCounts(m);
    var money = (global.I18N && I18N.money) ? I18N.money(c.total) : String(c.total);
    var span = document.createElement('tr');
    span.className = 'azd-linecounts';
    var colspan = (m.lines.fields.length || 1);
    span.innerHTML = '<td colspan="' + colspan + '" class="text-e small muted">' +
      (global.L ? L({ ar: 'سطور صالحة', en: 'Valid lines' }) : 'سطور صالحة') + ' <b>' + c.valid + '</b> · ' +
      (global.L ? L({ ar: 'ناقصة', en: 'Incomplete' }) : 'ناقصة') + ' <b class="warn">' + c.incomplete + '</b></td><td class="money small">' + money + '</td><td></td>';
    foot.insertBefore(span, foot.firstChild);
  }

  /* ── تبديل «المزيد» — على مستوى الشبكة كلها (تبسيط مُصرَّح به في تقرير
     التسليم: عمود لا صفّ فرعي لكل سطر، لأنّ renderLines عامّة لا تدعم صفاً
     فرعياً بلا تعديل entity.js) ─────────────────────────────────────────
     "More" toggle — GRID-WIDE (a disclosed simplification: whole columns,
     not a per-row sub-row, because the generic renderLines has no support
     for a per-row sub-panel without editing entity.js). */
  var moreOpen = false;
  function moreFieldIndices(m) {
    var idx = [];
    (m.quickEntry.moreFields || []).forEach(function (name) {
      var i = m.lines.fields.findIndex(function (f) { return f.name === name; });
      if (i !== -1) idx.push(i + 2); /* +1 لعمود «#»، +1 لأنّ nth-child يبدأ من 1 */
    });
    return idx;
  }
  function ensureMoreToggle(m) {
    var wrap = document.getElementById('linesWrap');
    var table = wrap ? wrap.querySelector('table') : null;
    if (!table) return;
    var idxs = moreFieldIndices(m);
    idxs.forEach(function (n) {
      table.querySelectorAll('tr > *:nth-child(' + n + ')').forEach(function (cell) {
        cell.style.display = moreOpen ? '' : 'none';
      });
    });
    var host = document.getElementById('addLine');
    if (host && !document.getElementById('azdMoreToggle')) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.id = 'azdMoreToggle'; btn.className = 'btn btn-outline btn-sm';
      btn.style.marginInlineStart = '6px';
      btn.textContent = (moreOpen ? '▾ ' : '▸ ') + (global.L ? L({ ar: 'حقول إضافية', en: 'More fields' }) : 'حقول إضافية');
      btn.addEventListener('click', function () { moreOpen = !moreOpen; ensureMoreToggle(m); btn.textContent = (moreOpen ? '▾ ' : '▸ ') + (global.L ? L({ ar: 'حقول إضافية', en: 'More fields' }) : 'حقول إضافية'); });
      host.parentNode.appendChild(btn);
    }
  }

  function enhance() {
    var m = mod();
    if (!m || !m.quickEntry) return;
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return;
    fillMissingLineIds(m);
    fixDeleteTabindex();
    markStaleEquipment(m);
    ensureMoreToggle(m);
    appendCounters(m);
  }

  var wrapObserver = null, footObserver = null;
  function installObservers() {
    var wrap = document.getElementById('linesWrap');
    if (!wrap || wrap.__azdObserved) return;
    wrap.__azdObserved = true;
    enhance();
    /* 🔴 حارس ثانٍ عام — يفصل المراقب أثناء تنفيذ enhance() نفسها، فلا
       تُسجَّل أي طفرة تُحدثها enhance() (markStaleEquipment أو أي دالة
       تُضاف مستقبلاً) كإشعار جديد يُعيد استدعاء enhance() من جديد. هذا لا
       يُصلح عطل markStaleEquipment وحده (المُصلَح أعلاه أصلاً بمقارنة
       data-eq-name) — يحمي أيضاً أي دالة أخرى داخل enhance() تكتب DOM
       مستقبلاً من الوقوع في نفس الحلقة اللانهائية (طفرة ← مراقبة ← طفرة)،
       بلا أي فحص محتوى يخصّها هي بالذات.
       🔴 A SECOND, general guard — disconnects the observer while
       enhance() itself runs, so no mutation enhance() makes (from
       markStaleEquipment or any function added here later) is ever
       delivered back as a new record that calls enhance() again. This
       does not by itself fix markStaleEquipment's own fault (already
       fixed above by comparing data-eq-name) — it protects any OTHER
       future DOM-writing function inside enhance() from falling into the
       same mutate-then-observe infinite loop, with no content check of
       its own needed. */
    wrapObserver = new MutationObserver(function () {
      wrapObserver.disconnect();
      enhance();
      wrapObserver.observe(wrap, { childList: true, subtree: true });
    });
    wrapObserver.observe(wrap, { childList: true, subtree: true });
    /* 🔴 مُثبَت بالتشغيل الفعلي: المراقب أعلاه لا يلتقط تغيير بند التكلفة
       وحده — set select.value + dispatchEvent('change') لا يُحدثان أي
       طفرة DOM (لا childList ولا attribute)، فمنطق K05 (المعدة القديمة
       المشطوبة) لم يكن يُعاد تقييمه إطلاقاً بعد إدخال حقيقي عبر المنتقي —
       عطلٌ حقيقيّ، لا افتراضيّ، وُجد أثناء تجربة t05. حلّه: الاستماع
       لحدث change على #linesWrap نفسه (تفويض)، لا انتظار طفرة DOM.
       🔴 PROVEN BY ACTUALLY RUNNING IT: the observer above never catches a
       cost-item change ALONE — select.value + dispatchEvent('change')
       creates NO DOM mutation (no childList, no attribute), so K05's own
       logic (the stale struck-through equipment) was never re-evaluated
       after a real entry through the picker — a REAL defect, not
       assumed, found while running t05. Fix: listen for 'change' on
       #linesWrap itself (delegated), never wait for a DOM mutation that
       this kind of update does not produce. */
    wrap.addEventListener('change', function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('name') === 'costItem') enhance();
    });
  }

  /* ── فتح النموذج — نلفّ UI.modal لضبط المراقبين بعد ظهور #linesWrap (بعد
     onOpen، ui.js يؤجّله بـsetTimeout) ─────────────────────────────────── */
  function installModalWrap() {
    if (!global.UI || !UI.modal || UI.modal.__azdWrapped) return;
    var orig = UI.modal;
    var wrapped = function (opts) {
      opts = opts || {};
      var origOnOpen = opts.onOpen;
      opts.onOpen = function () {
        if (origOnOpen) origOnOpen();
        var m = mod();
        if (m && m.quickEntry) setTimeout(installObservers, 0);
      };
      return orig.call(UI, opts);
    };
    wrapped.__azdWrapped = true;
    UI.modal = wrapped;
  }
  installModalWrap();

  global.DeskGrid = {
    currentModule: mod,
    currentModuleHasQuickEntry: hasQuickEntry,
    afterPickerAccept: afterPickerAccept,
    enhance: enhance
  };
  console.info('desk-grid.js ready — keyboard contract installed for modules declaring mod.quickEntry.');
})(window);
