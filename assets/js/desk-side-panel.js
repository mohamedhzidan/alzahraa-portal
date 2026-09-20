/* =========================================================================
   desk-side-panel.js — رصيد العهدة/فواتير المورّد المفتوحة/سجلّ المعدة —
                        بلا مغادرة الخانة (الخطة §١، §٥.٢ "التركيز بعد إغلاق
                        اللوحة")
                        Custody balance / supplier open invoices / recent
                        equipment cost — without leaving the cell
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢).

   لماذا لا نافذة ثانية · WHY NOT A SECOND MODAL
   -------------------------------------------------------------------------
   #modalHost عنصر واحد فقط في الصفحة (ui.js:94-143) — فتح UI.modal ثانٍ
   فوق نموذج التسوية يمحو النموذج نفسه (نفس السبب الذي جعل شاشة تأكيد
   الحذف في المعاينة تُبنى يدوياً، وattachment-reader.js:292 قبلها). هذا
   الملف يرسم لوحة داخل النموذج نفسه (aside ثابت بجانب الشبكة على سطح
   المكتب) بدل نافذة، فلا خطر من هذا النوع إطلاقاً.
   There is exactly ONE #modalHost on the page (ui.js:94-143) — opening a
   SECOND UI.modal over the settlement form destroys the form itself (the
   same reason the preview's delete-confirm was hand-built, and
   attachment-reader.js:292 before it). This file draws its panel INSIDE
   the same form (a fixed aside beside the grid on desktop) instead of a
   window, so this class of bug cannot happen here at all.

   يقرأ desk-ledgers.js فقط — لا حساب ثانٍ للرصيد · reads desk-ledgers.js
   only — no second balance computation.

   إضافي بالكامل — حذف هذا الملف يعيد نموذج التسوية إلى شبكة بلا لوحة
   جانبية، بلا أثر على الحفظ أو التحقّق.
   Fully additive — deleting this file returns the settlement form to a
   grid with no side panel, no effect on saving or validation.
   ========================================================================= */
(function (global) {
  'use strict';

  function money(v) { return (global.I18N && I18N.money) ? I18N.money(v || 0) : String(v || 0); }
  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }
  function L2(o) { return (global.L ? L(o) : o.ar); }

  function panelHTML(mod, draft) {
    if (mod.id !== 'custodySettlements') return '';
    var boxId = draft.custodyAccount;
    if (!boxId || !global.DeskLedgers) {
      return '<aside class="azd-side"><p class="small muted">' +
        esc(L2({ ar: 'اختر خزينة العهدة لعرض رصيدها', en: 'Choose the custody box to see its balance' })) + '</p></aside>';
    }
    var b = DeskLedgers.boxBalance(boxId);
    return '<aside class="azd-side" id="azdSidePanel">' +
      '<h4>' + esc(L2({ ar: 'رصيد العهدة', en: 'Custody balance' })) + '</h4>' +
      '<dl class="azd-side-dl">' +
        '<dt>' + esc(L2({ ar: 'مموَّل + افتتاحي', en: 'Funded + opening' })) + '</dt><dd>' + money(b.opening + b.funded) + '</dd>' +
        '<dt>' + esc(L2({ ar: 'مقبول حتى الآن', en: 'Accepted so far' })) + '</dt><dd>' + money(b.accepted) + '</dd>' +
        '<dt>' + esc(L2({ ar: 'قيد المراجعة', en: 'Under review' })) + '</dt><dd>' + money(b.pending + b.reviewedPending) + '</dd>' +
        '<dt><b>' + esc(L2({ ar: 'المتاح', en: 'Available' })) + '</b></dt><dd><b>' + money(b.available) + '</b></dd>' +
      '</dl>' +
      '<div id="azdShortcutsPanel" hidden>' + shortcutsHTML() + '</div>' +
    '</aside>';
  }

  function shortcutsHTML() {
    return '<h4>' + esc(L2({ ar: 'اختصارات لوحة المفاتيح', en: 'Keyboard shortcuts' })) + '</h4><ul class="azd-shortcuts">' +
      '<li><kbd>Enter</kbd> — ' + esc(L2({ ar: 'التالي، أو فتح قائمة البحث', en: 'Next, or open the search list' })) + '</li>' +
      '<li><kbd>Shift</kbd>+<kbd>Enter</kbd> — ' + esc(L2({ ar: 'رجوع خطوة', en: 'Step back' })) + '</li>' +
      '<li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> — ' + esc(L2({ ar: 'حفظ مسودة فوراً', en: 'Save a draft at once' })) + '</li>' +
      '<li><kbd>Esc</kbd> — ' + esc(L2({ ar: 'إغلاق قائمة البحث فقط', en: 'Close the search list only' })) + '</li>' +
      '<li><kbd>Tab</kbd> — ' + esc(L2({ ar: 'التنقّل المعتاد', en: 'Normal navigation' })) + '</li>' +
    '</ul>';
  }

  function insertPanel() {
    var form = document.getElementById('entForm');
    if (!form) return;
    var modId = form.getAttribute('data-module');
    var mod = global.Schema ? Schema.get(modId) : null;
    if (!mod || mod.id !== 'custodySettlements') return;
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return;
    var section = wrap.closest('.form-section');
    if (!section || section.querySelector('#azdSidePanel')) { if (section) refreshBalance(); return; }
    var draft = { custodyAccount: (document.querySelector('#entForm [name="custodyAccount"]') || {}).value };
    var flexWrap = document.createElement('div');
    flexWrap.className = 'azd-side-flex';
    var placeholder = document.createElement('div');
    placeholder.className = 'azd-side-main';
    section.parentNode.insertBefore(flexWrap, section);
    flexWrap.appendChild(placeholder);
    placeholder.appendChild(section);
    flexWrap.insertAdjacentHTML('beforeend', panelHTML(mod, draft));

    var custodySel = document.querySelector('#entForm [name="custodyAccount"]');
    if (custodySel) custodySel.addEventListener('change', refreshBalance);

    var sc = document.getElementById('addLine');
    if (sc && !document.getElementById('azdShortcutsBtn')) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.id = 'azdShortcutsBtn'; btn.className = 'btn btn-outline btn-sm';
      btn.style.marginInlineStart = '6px';
      btn.textContent = '؟ ' + (global.L ? L({ ar: 'اختصارات', en: 'Shortcuts' }) : 'اختصارات');
      btn.addEventListener('click', function () {
        var p = document.getElementById('azdShortcutsPanel');
        if (p) p.hidden = !p.hidden;
      });
      sc.parentNode.appendChild(btn);
    }
  }

  function refreshBalance() {
    var custodySel = document.querySelector('#entForm [name="custodyAccount"]');
    var panel = document.getElementById('azdSidePanel');
    var mod = global.Schema ? Schema.get('custodySettlements') : null;
    if (!panel || !custodySel || !mod) return;
    var draft = { custodyAccount: custodySel.value };
    panel.outerHTML = panelHTML(mod, draft);
  }

  function installModalWrap() {
    if (!global.UI || !UI.modal || UI.modal.__azdSideWrapped) return;
    var orig = UI.modal;
    var wrapped = function (opts) {
      opts = opts || {};
      var origOnOpen = opts.onOpen;
      opts.onOpen = function () {
        if (origOnOpen) origOnOpen();
        setTimeout(insertPanel, 0);
      };
      return orig.call(UI, opts);
    };
    wrapped.__azdSideWrapped = true;
    UI.modal = wrapped;
  }
  installModalWrap();

  global.DeskSidePanel = { insertPanel: insertPanel, refreshBalance: refreshBalance };
  console.info('desk-side-panel.js ready — custody balance panel wired for the settlement form.');
})(window);
