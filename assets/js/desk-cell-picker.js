/* =========================================================================
   desk-cell-picker.js — منتقٍ عائم واحد لخانات الاختيار داخل شبكة الأسطر
                          ONE floating picker for the <select> cells inside
                          a lines grid (plan §5.3)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · accountant's desk — v2.0.38

   لماذا لا نستعمل ref-search-picker.js كما هو · WHY NOT ref-search-picker.js
   AS-IS
   -------------------------------------------------------------------------
   ذلك الملف يستثني #linesWrap عمداً وبثلاثة أسباب مقيسة (تخطيط الخلية
   الضيّقة، منتقٍ لكل سطر بلا معنى، سطر مُضاف لاحقاً بلا منتقٍ — انظر رأسه).
   هذا الملف يحلّ الثلاثة بمنتقٍ واحد للنموذج كله، يتعلّق عند التركيز
   (focus) على أي <select> داخل #linesWrap — فيغطّي أي سطر يُضاف لاحقاً
   تلقائياً، ولا يُبنى وقت الرسم إطلاقاً.

   That file excludes #linesWrap on purpose, for three MEASURED reasons
   (narrow-cell layout, a meaningless picker per row, a later-added row
   getting none — see its own header). This file solves all three with ONE
   picker for the whole form, attached on FOCUS of any <select> inside
   #linesWrap — so a row added later is covered automatically, and nothing
   is built at render time at all.

   القاعدة نفسها، لا نسخة ثانية منها · THE SAME RULE, NOT A SECOND COPY
   -------------------------------------------------------------------------
   RefDropdownScope.applyFence() يُنادى تزامنياً قبل قراءة خيار واحد —
   بالضبط كما يفعل ref-search-picker.js. لو غاب ذلك الملف لا نبني شيئاً
   (منتقٍ بلا سياج أسوأ من لا منتقٍ). المطابقة عبر ArabicText.searchFold/
   searchFoldTight — لا مطبِّع ثانٍ.
   RefDropdownScope.applyFence() is called synchronously before reading a
   single option — exactly as ref-search-picker.js does. If that file is
   absent, we build nothing (a picker without the fence is worse than
   none). Matching goes through ArabicText.searchFold/searchFoldTight — no
   second normaliser.

   حسابات: أصل›فرع، ورموز غير قابلة للاختيار · ACCOUNTS: parent›leaf,
   non-postable headings not selectable
   -------------------------------------------------------------------------
   الـ<select> الأصلي (lineInput في entity.js) لا يستبعد الحسابات غير
   القابلة للترحيل (postable=false) — هذا الملف لا يغيّر ذلك السلوك في
   القائمة الأصلية (لا نعدّل entity.js)، لكنّ *منتقينا* وحده يعرضها
   كعناوين غير قابلة للاختيار، ويعرض البقية بصيغة «أصل › فرع».

   إضافي بالكامل — حذف هذا الملف يعيد كل خانات الشبكة قوائم منسدلة عادية.
   Fully additive — deleting this file returns every grid cell to a plain
   native dropdown.

   يُحمَّل مع كتلة desk-kit.js، بعد ref-search-picker.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.RefDropdownScope || typeof RefDropdownScope.applyFence !== 'function') {
    console.warn('[desk-cell-picker] ref-dropdown-scope.js is absent — no picker built for grid cells, ' +
      'because a searchable list without its privacy fence could show one site\'s data to another.');
    return;
  }

  function fold(s) {
    try { if (global.ArabicText && typeof ArabicText.searchFold === 'function') return ArabicText.searchFold(s); } catch (e) {}
    return String(s == null ? '' : s).toLowerCase();
  }
  function tight(s) {
    try { if (global.ArabicText && typeof ArabicText.searchFoldTight === 'function') return ArabicText.searchFoldTight(s); } catch (e) {}
    return fold(s).replace(/\s+/g, '');
  }
  function digitsOnly(s) { return String(s == null ? '' : s).trim(); }

  var wrapEl = null, boxEl = null, listEl = null;
  var state = { open: false, select: null, box: null, hi: 0, items: [], noMatch: false, equipFallback: null };

  function ensureDom() {
    if (wrapEl) return;
    wrapEl = document.createElement('div');
    wrapEl.id = 'azdPicker';
    wrapEl.className = 'azd-picker';
    wrapEl.hidden = true;
    boxEl = document.createElement('input');
    boxEl.type = 'text';
    boxEl.autocomplete = 'off';
    boxEl.className = 'input input-sm azd-picker-box';
    listEl = document.createElement('div');
    listEl.className = 'azd-picker-list';
    wrapEl.appendChild(boxEl);
    wrapEl.appendChild(listEl);
    document.body.appendChild(wrapEl);

    /* mousedown يمنع فقدان التركيز قبل تسجيل النقرة — فخّ الـcombobox الكلاسيكي
       mousedown stops focus loss before the click registers — the classic
       combobox trap. */
    listEl.addEventListener('mousedown', function (e) { e.preventDefault(); });
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-idx]');
      if (!btn) return;
      accept(Number(btn.getAttribute('data-idx')));
    });
    boxEl.addEventListener('input', function () { render(boxEl.value); });
    boxEl.addEventListener('blur', function () {
      /* تأخير بسيط — لو كان الخروج بسبب نقرة على القائمة نفسها، mousedown
         أعلاه منع الblur أصلاً؛ هذا فقط لتفادي إغلاقٍ يسبق نقرة زرّ «امسح»
         المجاورة على الخلية (desk-grid.js).
         A short delay — a click on the list itself never reaches blur at
         all (mousedown above). This only avoids closing before a sibling
         "clear" button's own click (desk-grid.js) registers. */
      setTimeout(function () { if (state.open && document.activeElement !== boxEl) closeAndSettle(); }, 120);
    });
  }

  /* ── بناء خيارات حساب واحد بصيغة «أصل › فرع» ─────────────────────────────
     Build one account's "parent › leaf" label. */
  function accountLabel(select, opt) {
    if (select.getAttribute('data-ref') !== 'accounts') return opt.textContent;
    var pid = opt.getAttribute('data-parent');
    if (!pid) return opt.textContent;
    var parentOpt = select.querySelector('option[value="' + CSS.escape(pid) + '"]');
    return (parentOpt ? parentOpt.textContent : '') + ' › ' + opt.textContent;
  }

  /* ═══════════════════════════════════════════════════════════════════
     معدّة — احتياط الأسماء فقط لمن لا يملك صلاحية equipment (الخطة §4.3
     P04) · EQUIPMENT — a NAMES-ONLY fallback for a role with no
     "equipment" access at all (plan §4.3 P04)
     -----------------------------------------------------------------
     ملاحظة القراءة (t05-custody-browser.js): دور accountant لا يملك أي
     سياسة SELECT على "equipment" — Store.all('equipment') يعيد صفراً
     دائماً، والـ<select> نفسه يصل خالياً من entity.js. المصدر هنا REST
     مباشر إلى العرض portal_equipment_names (الملف 87 · file 87) —
     لا Store، لا RefDropdownScope (لا يوجد لديه شيء ليُصفّيه هنا: القائمة
     الحقيقية فارغة أصلاً، والاستبدال البديل هذا لا يمسّ أي حقل آخر إطلاقاً).
     يُخزَّن مرة واحدة لكل صفحة (وعدٌ واحد يُعاد استعماله)، ولا يُستعمَل
     أبداً إن كان لدى الدور خياراتٌ حقيقية بالفعل (سطر «إن كانت فارغة»
     أدناه) — فمهندس الموقع وصاحب الصلاحية الحقيقية يريان قائمتهما
     العادية دون أي تغيير.
     Read note (t05-custody-browser.js): the "accountant" role has NO
     SELECT policy on "equipment" at all — Store.all('equipment') always
     returns zero, and the <select> itself arrives from entity.js with no
     real options. The source here is a DIRECT REST call to the
     portal_equipment_names view (الملف 87 · file 87) — never Store,
     never RefDropdownScope (there is nothing for it to fence here: the
     REAL list is already empty, and this fallback never touches any
     OTHER field at all). Fetched once per page load (one promise,
     reused), and never used at all when the role already has real
     options (the "only if empty" check below) — a site engineer with
     genuine access sees their normal list, unchanged. */
  var equipmentNamesPromise = null;
  function equipmentNames() {
    if (equipmentNamesPromise) return equipmentNamesPromise;
    equipmentNamesPromise = (function () {
      try {
        if (!global.Auth || typeof Auth.client !== 'function') return Promise.resolve([]);
        var client = Auth.client();
        if (!client) return Promise.resolve([]);
        return client.from('portal_equipment_names').select('*').then(function (r) {
          if (r.error) { console.warn('[desk-cell-picker] portal_equipment_names read failed — equipment picker stays empty for roles with no equipment access:', r.error.message); return []; }
          return r.data || [];
        }).catch(function () { return []; });
      } catch (e) { return Promise.resolve([]); }
    })();
    return equipmentNamesPromise;
  }

  /* يُنشئ خياراً حقيقياً واحداً فقط — للقيمة المُختارة فعلاً، لا للقائمة
     كلها — لحظة القبول (accept()) فقط، لا عند الفتح. هذا هو «خطّاف سياج
     المنتقي» المقصود: RefDropdownScope.filterSelect لا يحذف أبداً
     الخيار المطابق لـselect.value الحالي (current) — فبمجرد أن نضبط
     القيمة، هذا الخيار الواحد محميٌّ بنفس قاعدة السياج الموجودة، بلا أي
     تجاوز لها ولا نسخة ثانية منها. باقي الأسماء لا تلمس DOM الـselect
     إطلاقاً، فلا شيء لدى RefDropdownScope ليُصفّيه لهذا الحقل تحديداً.
     Creates exactly ONE real option — for the value actually chosen,
     never the whole list — at ACCEPT time only, never at open time. This
     is the intended "picker's own fence hook": RefDropdownScope's
     filterSelect NEVER removes the option matching the select's CURRENT
     value — so the instant we set that value, this one option is
     protected by the SAME existing fence rule, no bypass and no second
     copy of it. Every other name never touches the select's DOM at all,
     so RefDropdownScope has nothing of its own to filter for this field. */
  function materialiseEquipmentOption(select, item) {
    var existing = select.querySelector('option[value="' + CSS.escape(item.value) + '"]');
    if (existing) return;
    var opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.rawLabel;
    if (item.code) opt.setAttribute('data-code', item.code);
    select.appendChild(opt);
  }

  function candidatesFor(select) {
    var isAccounts = select.getAttribute('data-ref') === 'accounts';
    var isEquipment = select.getAttribute('data-ref') === 'equipment';
    var out = [];
    var opts = select.querySelectorAll('option[value]:not([value=""])');
    opts.forEach(function (opt) {
      var postable = opt.getAttribute('data-postable');
      var heading = isAccounts && postable === '0';
      out.push({
        value: opt.value,
        label: isAccounts ? accountLabel(select, opt) : opt.textContent,
        rawLabel: opt.textContent,
        code: opt.getAttribute('data-code') || '',
        heading: heading
      });
    });
    /* الاحتياط: فقط لو كانت القائمة الحقيقية فارغة كلياً — دور يملك
       صلاحية حقيقية يرى قائمته العادية دون أي تغيير هنا.
       The fallback: ONLY when the real list is completely empty — a role
       with genuine access sees its normal list, untouched here. */
    if (isEquipment && out.length === 0 && Array.isArray(state.equipFallback)) {
      state.equipFallback.forEach(function (r) {
        var label = r.name + (r.plateNo ? ' — ' + r.plateNo : '');
        out.push({ value: r.id, label: label, rawLabel: label, code: r.code || '', heading: false, synthetic: true });
      });
    }
    return out;
  }

  function matches(item, q, qDigits) {
    if (!q) return true;
    if (fold(item.label).indexOf(q) !== -1) return true;
    if (tight(q) && tight(item.label).indexOf(tight(q)) !== -1) return true;
    if (qDigits && item.code && item.code.indexOf(qDigits) !== -1) return true;
    return false;
  }

  function render(query) {
    var q = fold(query);
    var qDigits = digitsOnly(query);
    var all = candidatesFor(state.select);
    var shown = all.filter(function (it) { return it.heading || matches(it, q, qDigits); });
    state.items = shown.filter(function (it) { return !it.heading; });
    if (state.hi >= state.items.length) state.hi = 0;
    state.noMatch = state.items.length === 0;
    if (state.noMatch) {
      listEl.innerHTML = '<div class="azd-pk-empty">' + (window.L ? L({ ar: 'لا نتيجة', en: 'No match' }) : 'لا نتيجة') + '</div>';
      return;
    }
    var html = '', shownIdx = 0;
    shown.forEach(function (it) {
      if (it.heading) { html += '<div class="azd-pk-head">' + esc(it.label) + '</div>'; return; }
      var idx = state.items.indexOf(it);
      html += '<button type="button" class="azd-pk-item' + (idx === state.hi ? ' hi' : '') + '" data-idx="' + idx + '">' +
        (it.code ? '<span class="azd-pk-code">' + esc(it.code) + '</span>' : '') + esc(it.label) + '</button>';
      shownIdx++;
    });
    listEl.innerHTML = html;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function place(select) {
    var r = select.getBoundingClientRect();
    wrapEl.style.top = (r.top + window.scrollY) + 'px';
    wrapEl.style.left = (r.left + window.scrollX) + 'px';
    wrapEl.style.width = Math.max(r.width, 220) + 'px';
    wrapEl.hidden = false;
  }

  /* ── فتح المنتقي على خانة معيّنة ──────────────────────────────────────── */
  function openFor(select) {
    ensureDom();
    if (state.open && state.select === select) return;
    state.open = true; state.select = select; state.hi = 0;
    place(select);
    var selectedOpt = select.options[select.selectedIndex];
    var startText = select.__azdRawText !== undefined ? select.__azdRawText
      : (selectedOpt && selectedOpt.value ? selectedOpt.textContent : '');
    boxEl.value = startText;
    boxEl.style.display = '';
    select.style.display = 'none';
    boxEl.focus();
    boxEl.select();
    /* معدّة بلا قائمة حقيقية — نجلب الاحتياط (مرة واحدة لكل صفحة، وعدٌ
       مُخزَّن) ونُعيد الرسم عند وصوله لو ما زال المنتقي مفتوحاً على نفس
       الخانة. Equipment with no real list — fetch the fallback (once per
       page, a stored promise) and re-render on arrival, only if the
       picker is still open on this same cell. */
    if (select.getAttribute('data-ref') === 'equipment' &&
        select.querySelectorAll('option[value]:not([value=""])').length === 0) {
      equipmentNames().then(function (rows) {
        state.equipFallback = rows;
        if (state.open && state.select === select) render(boxEl.value);
      });
    }
    render(startText);
  }

  function closePicker() { state.open = false; if (wrapEl) wrapEl.hidden = true; }

  /* ── إغلاق مع تسوية الحالة (Blur/Escape بلا اختيار) ──────────────────────
      البند ٣ — لا استرجاع صامت: النص المكتوب إمّا يطابق الخيار المحفوظ
      (فيُقبل صمتاً) أو يبقى ظاهراً بالضبط كما كتبه المستخدم مع علامة حمراء،
      والقيمة المحفوظة تبقى فى الـselect المخفي دون تغيير.
      CLOSE + settle (blur/Escape with no acceptance) — ITEM 3: no silent
      restore. Typed text either matches the stored option (accepted
      silently) or stays showing EXACTLY as typed, marked red, and the
      REAL stored value stays untouched inside the hidden select. */
  function closeAndSettle() {
    var select = state.select;
    if (!select) { closePicker(); return; }
    var typed = boxEl.value.trim();
    var selectedOpt = select.options[select.selectedIndex];
    var currentLabel = selectedOpt && selectedOpt.value ? selectedOpt.textContent : '';
    closePicker();
    select.style.display = '';
    if (typed === '' && select.value !== '') {
      /* إفراغ الخانة يُفرغ القيمة المحفوظة فوراً — لا عند الخروج فقط
         Emptying the cell clears the stored value at once, not only on leaving. */
      select.__azdRawText = undefined;
      select.value = '';
      fireChange(select);
      markCellError(select, null);
      return;
    }
    if (typed === currentLabel || typed === '') {
      select.__azdRawText = undefined;
      markCellError(select, null);
      return;
    }
    /* لم يُطابَق — يبقى النص كما كتبه، والقيمة المحفوظة (select.value) لا تتغيّر
       Not matched — the text stays exactly as typed; the stored value
       (select.value) is left untouched. */
    select.__azdRawText = typed;
    markCellError(select, { ar: 'اختر حساباً/بنداً من القائمة', en: 'Choose an item from the list' });
  }

  function markCellError(select, msg) {
    var td = select.closest('td'); if (!td) return;
    var err = td.querySelector('.err-msg');
    if (!err) { err = document.createElement('span'); err.className = 'err-msg'; td.appendChild(err); }
    if (msg) {
      err.hidden = false;
      err.textContent = (window.L ? L(msg) : msg.ar);
      select.classList.add('input-error');
      var displayBox = td.querySelector('.azd-picker-shadow');
      if (displayBox) displayBox.classList.add('input-error');
    } else {
      err.hidden = true;
      select.classList.remove('input-error');
    }
    /* عرض النص المكتوب (غير المطابَق) فوق الخلية المغلقة أيضاً — حتى بعد
       إغلاق المنتقي يبقى ظاهراً كما هو (البند ٣).
       Show the unmatched typed text over the CLOSED cell too — after the
       picker closes it must stay visible exactly as typed (item 3). */
    var shadow = td.querySelector('.azd-picker-shadow');
    if (select.__azdRawText !== undefined) {
      if (!shadow) {
        /* 🔴 يجب أن يبقى قابلاً للوصول بالتاب — والّا عَلِق المستخدم بنصٍّ
           خاطئ لا يقدر على تصحيحه إلا بالفأرة (عطل استُدرك أثناء البناء).
           tabindex + النقر/Enter تعيد فتح المنتقي بنفس النص المكتوب.
           🔴 This MUST stay Tab-reachable, or the user is stuck with wrong
           text they can only fix with a mouse (caught while building).
           tabindex + click/Enter reopen the picker with the same typed text. */
        shadow = document.createElement('div');
        shadow.className = 'azd-picker-shadow';
        shadow.setAttribute('tabindex', '0');
        shadow.setAttribute('role', 'textbox');
        shadow.addEventListener('click', function () { openFor(select); });
        shadow.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openFor(select); }
        });
        td.appendChild(shadow);
      }
      shadow.textContent = select.__azdRawText;
      select.style.display = 'none';
    } else if (shadow) {
      shadow.remove();
      select.style.display = '';
    }
  }

  function fireChange(select) {
    try {
      var ev = global.Event ? new Event('change', { bubbles: true }) : document.createEvent('HTMLEvents');
      if (ev.initEvent && !(global.Event)) ev.initEvent('change', true, false);
      select.dispatchEvent(ev);
    } catch (e) {}
  }

  /* ── ذاكرة اختيار الاحتياط لكل سطر، بمفتاح lineId ─────────────────────
     عطلٌ حقيقيٌّ وُجد بالتشغيل (t05، بعد دمج job2 مع K01/addLine): إضافة
     سطر جديد (addLine) تُعيد entity.js رسم شبكة الأسطر بالكامل من نموذج
     بياناتها الداخلي — والـ<select> المُعاد رسمه لخانة equipment يُبنى من
     Store.all('equipment') (فارغة لهذا الدور) فلا يحمل خيار
     eq_car_2854 إطلاقاً، فتبدو الخانة فارغة بصرياً رغم أنّ القيمة
     المحفوظة فعلياً صحيحة تماماً (تحقّقتُ عبر REST بعد الحفظ: البند
     يحمل "equipment":"eq_car_2854" رغم ظهور الخانة فارغة على الشاشة) —
     خللٌ بصريٌّ مربكٌ للمستخدم، لا فقدان بيانات، لكنه يستحق الإصلاح: قد
     يظن المحاسب أن اختياره ضاع فيُعيد اختياره أو يظن السطر ناقصاً.
     الإصلاح: نحفظ كل اختيار احتياطي بمفتاح lineId (يبقى ثابتاً عبر
     إعادة الرسم، بخلاف مرجع DOM نفسه)، ونعيد تركيبه في markStaleEquipment
     (desk-grid.js) كلما وجدت الدالّة خانة فارغة لسطرٍ معروفٍ لدينا.
     A LINE-KEYED memory for fallback equipment choices — a REAL bug found
     by running this (t05, after folding job2 into K01/addLine): adding a
     new line makes entity.js re-render the ENTIRE lines grid from its own
     internal data model, and the freshly rebuilt equipment <select> is
     built from Store.all('equipment') (empty for this role), so it never
     carries an option for eq_car_2854 — the cell LOOKS empty even though
     the value actually saved is perfectly correct (verified via REST
     after save: the line carries "equipment":"eq_car_2854" despite the
     screen showing blank) — a confusing VISUAL glitch, never data loss,
     but worth fixing: an accountant might think their choice vanished and
     re-pick it, or think the line is incomplete. Fix: remember every
     fallback choice by lineId (stable across re-renders, unlike the DOM
     node itself), and re-materialise it in markStaleEquipment
     (desk-grid.js) whenever that function finds an empty cell for a line
     we already have an answer for. */
  var equipFallbackByLineId = {};
  function rowLineId(select) {
    var tr = select.closest('[data-li]'); if (!tr) return null;
    var li = tr.querySelector('[name="lineId"]'); return li ? li.value : null;
  }

  function accept(idx) {
    var item = state.items[idx];
    if (!item) return;
    var select = state.select;
    /* عنصر احتياط المعدّة — لا يوجد له <option> حقيقي بعد، فselect.value=
       يفشل بصمت (لا خيار مطابق = يعود لا شيء مختار). نُنشئ الخيار الواحد
       هذا أولاً — راجع تعليق materialiseEquipmentOption أعلاه لسبب كونه
       آمناً مع RefDropdownScope.
       An equipment fallback item has no real <option> yet, so select.value=
       fails SILENTLY (no matching option = nothing ends up selected). Create
       that ONE option first — see materialiseEquipmentOption's comment
       above for why this is safe with RefDropdownScope. */
    if (item.synthetic) {
      materialiseEquipmentOption(select, item);
      var lid = rowLineId(select);
      if (lid) equipFallbackByLineId[lid] = item;
    }
    select.value = item.value;
    select.__azdRawText = undefined;
    fireChange(select);
    markCellError(select, null);
    closePicker();
    select.style.display = '';
    /* التركيز يعود إلى desk-grid.js (يعالج الخطوة التالية بعد opts أعلاه) */
    if (global.DeskGrid && typeof DeskGrid.afterPickerAccept === 'function') DeskGrid.afterPickerAccept(select);
  }

  /* ── مفاتيح المنتقي وهو مفتوح — يُنادَى من desk-grid.js فقط ─────────────
     Keys while the picker is open — called ONLY by desk-grid.js. */
  function handleKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAndSettle(); return true; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var max = state.items.length - 1;
      if (max >= 0) state.hi = e.key === 'ArrowDown' ? Math.min(state.hi + 1, max) : Math.max(state.hi - 1, 0);
      render(boxEl.value);
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      /* البند ٨ — لا نتيجة تبقي القائمة مفتوحة، لا تتقدّم ولا تُغلَق
         Item 8 — no match keeps the list OPEN, no advance, never closes. */
      if (state.noMatch || !state.items.length) { render(boxEl.value); return true; }
      accept(state.hi);
      return true;
    }
    return false;
  }

  /* ── تركيب المنتقي على أي select داخل #linesWrap عند التركيز ────────────
     Attach on FOCUS of any select inside #linesWrap. */
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'SELECT') return;
    var wrap = t.closest ? t.closest('#linesWrap') : null;
    if (!wrap) return;
    if (!global.DeskGrid || !DeskGrid.currentModuleHasQuickEntry()) return;
    try { RefDropdownScope.applyFence(); } catch (e2) { return; }
    if (!t.hasAttribute('data-ref')) {
      /* البيانات التي يحتاجها المنتقي (المرجع، الرمز، الأصل) — تُشتقّ مرّة
         واحدة من قائمة entity.js نفسها، بلا استعلام Store ثانٍ.
         The data the picker needs (ref target, code, parent) — derived
         ONCE from entity.js's own option list, no second Store query. */
      annotateSelect(t);
    }
    openFor(t);
  }, true);

  function annotateSelect(select) {
    var name = select.getAttribute('name');
    var mod = global.Schema && DeskGrid ? DeskGrid.currentModule() : null;
    var lf = mod && mod.lines ? mod.lines.fields.filter(function (f) { return f.name === name; })[0] : null;
    if (!lf || lf.type !== 'ref') return;
    select.setAttribute('data-ref', lf.ref);
    if (!global.Store || !Store.all) return;
    var rows = Store.all(lf.ref) || [];
    var byId = {}; rows.forEach(function (r) { byId[r.id] = r; });
    select.querySelectorAll('option[value]:not([value=""])').forEach(function (opt) {
      var rec = byId[opt.value];
      if (!rec) return;
      if (rec.code) opt.setAttribute('data-code', rec.code);
      if (rec.parent) opt.setAttribute('data-parent', rec.parent);
      if (rec.postable === false) opt.setAttribute('data-postable', '0');
    });
  }

  global.DeskCellPicker = {
    isOpen: function () { return state.open; },
    isOpenForBox: function (el) { return state.open && el === boxEl; },
    activeSelect: function () { return state.select; },
    openFor: openFor,
    handleKeydown: handleKeydown,
    closeAndSettle: closeAndSettle,
    /* يُنادى من desk-grid.js's markStaleEquipment فقط — يُعيد تركيب خيار
       الاحتياط المفقود بعد إعادة رسم عامة (انظر تعليق equipFallbackByLineId
       أعلاه). Called ONLY from desk-grid.js's markStaleEquipment — restores
       a lost fallback option after a generic re-render (see the
       equipFallbackByLineId comment above). */
    equipFallbackFor: function (lineId) { return equipFallbackByLineId[lineId] || null; },
    /* 🔴 يُنادى من زرّ «امسح» (desk-grid.js) — بلا هذا، الزرّ يمسح
       eqSel.value لحظياً لكن أي enhance() لاحق (K05 يعيد تقييم كل سطر في
       كل مرة) يُعيد تركيب القيمة من الذاكرة فوراً، فيبدو الزرّ معطوباً
       تماماً — عطلٌ ثانٍ حقيقيّ وُجد بالتشغيل، هذه المرة من إصلاح
       equipFallbackByLineId نفسه (نتيجة قياس واحدة، أثران — ذاكرة
       المشروع). Called from the «Clear» button (desk-grid.js) — without
       this, the button clears eqSel.value for a moment but ANY later
       enhance() call (K05 re-evaluates every row every time) immediately
       re-materialises the value from memory, making the button look
       completely broken — a SECOND real defect found by running this,
       this time caused BY the equipFallbackByLineId fix itself (one
       measurement, two consequences — project memory). */
    clearEquipFallback: function (lineId) { if (lineId) delete equipFallbackByLineId[lineId]; },
    materialiseEquipmentOption: materialiseEquipmentOption
  };
  console.info('desk-cell-picker.js ready — ONE floating combobox for grid <select> cells, fenced via RefDropdownScope.applyFence().');
})(window);
