/* =========================================================================
   ui.js — shared building blocks: icons, toasts, modals, tables, forms
   ========================================================================= */
(function (global) {
  'use strict';

  /* ---------- escaping ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attr(s) { return esc(s); }

  /* ---------- icons (inline SVG, no external dependency) ---------- */
  var P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    inbox: '<path d="M4 4h16v10h-5l-2 3h-2l-2-3H4z"/><path d="M4 14v6h16v-6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    'truck-2': '<rect x="2" y="8" width="11" height="8" rx="1"/><path d="M13 11h4l4 3v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1a6 6 0 0 1 12 0v1"/><path d="M17 8.5a3 3 0 1 0 0-5"/><path d="M18 21v-1a5 5 0 0 0-3-4.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
    tag: '<path d="M20 12 12 20l-8-8V4h8z"/><circle cx="8" cy="8" r="1.5"/>',
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12h11l2.4-8H6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    'file-text': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    'file-signature': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/><path d="M14 3v5h5"/><path d="m16 15 4-4 2 2-4 4h-2z"/>',
    'arrow-up': '<path d="M12 20V5"/><path d="m5 12 7-7 7 7"/>',
    'arrow-down': '<path d="M12 4v15"/><path d="m5 12 7 7 7-7"/>',
    wallet: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14.5" r="1.4"/>',
    box: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
    clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2"/><path d="M10 22v-4h4v4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6"/>',
    'hard-hat': '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 18h20v2H2z"/><path d="M10 8V5h4v3"/>',
    'list-check': '<path d="M4 6h16M4 12h16M4 18h10"/><path d="m17 17 2 2 4-4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    wrench: '<path d="M14.7 6.3a4.5 4.5 0 0 0 6 6l-9 9a2.1 2.1 0 0 1-3-3z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    scale: '<path d="M12 3v18M7 21h10"/><path d="M6 7h12"/><path d="m3 13 3-6 3 6a3 3 0 0 1-6 0z"/><path d="m15 13 3-6 3 6a3 3 0 0 1-6 0z"/>',
    monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    'life-buoy': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5 5 3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 3 5-7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 19h16"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 15h12v6H6z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'
  };

  function icon(name, size) {
    var p = P[name] || P.grid;
    var s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }

  /* ---------- toasts ---------- */
  function toast(msg, kind, ms) {
    var host = document.getElementById('toastHost');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'success');
    var ic = kind === 'error' ? 'alert' : kind === 'warn' ? 'alert' : kind === 'info' ? 'eye' : 'check';
    el.innerHTML = icon(ic, 17) + '<span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 250);
    }, ms || 3200);
  }

  /* ---------- modal ---------- */
  var modalOnClose = null;
  var modalDismissible = true;
  function modal(opts) {
    var host = document.getElementById('modalHost');
    var box = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = opts.title || '';
    document.getElementById('modalBody').innerHTML = opts.body || '';
    var foot = document.getElementById('modalFoot');
    foot.innerHTML = '';

    box.className = 'modal' + (opts.size === 'wide' ? ' wide' : opts.size === 'narrow' ? ' narrow' : '');
    modalDismissible = opts.dismissible !== false;
    var closeButton = document.getElementById('modalClose');
    if (closeButton) closeButton.hidden = !modalDismissible;

    (opts.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || 'btn-outline');
      btn.textContent = b.label;
      if (b.disabled) btn.disabled = true;
      btn.onclick = async function () {
        if (btn.disabled) return;
        var original = btn.textContent;
        try {
          if (b.onClick) {
            var result = b.onClick();
            if (result && typeof result.then === 'function') {
              btn.disabled = true;
              btn.setAttribute('aria-busy', 'true');
              result = await result;
            }
            if (result === false) return;
          }
          if (b.keepOpen !== true) closeModal();
        } catch (error) {
          console.error(error);
          toast(I18N.getLang() === 'ar' ? 'تعذّر تنفيذ العملية. حاول مرة أخرى.' : 'The operation failed. Please try again.', 'error', 6000);
        } finally {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
          btn.textContent = original;
        }
      };
      foot.appendChild(btn);
    });

    modalOnClose = opts.onClose || null;
    host.hidden = false;
    document.body.style.overflow = 'hidden';
    if (opts.onOpen) setTimeout(opts.onOpen, 0);
    return box;
  }
  function closeModal() {
    document.getElementById('modalHost').hidden = true;
    document.body.style.overflow = '';
    if (modalOnClose) { var f = modalOnClose; modalOnClose = null; f(); }
  }

  function dismissModal() {
    if (modalDismissible) closeModal();
  }

  function confirm(opts) {
    return modal({
      size: 'narrow',
      title: opts.title || t('g.confirm'),
      body: '<p>' + esc(opts.message || '') + '</p>' +
        (opts.warn ? '<div class="alert alert-warn mt-2">' + icon('alert', 17) + '<span>' + esc(opts.warn) + '</span></div>' : ''),
      buttons: [
        { label: t('g.cancel'), cls: 'btn-ghost' },
        { label: opts.okLabel || t('g.confirm'), cls: opts.danger ? 'btn-danger' : 'btn-primary', onClick: opts.onOk }
      ]
    });
  }

  /* Ask for a mandatory written reason (used by reject / return / reverse) */
  function askReason(title, onOk) {
    modal({
      size: 'narrow', title: title,
      body: '<label class="field"><span class="field-label">' + t('wf.reason') +
        ' <span class="req">*</span></span><textarea class="textarea" id="reasonBox" rows="4"></textarea>' +
        '<span class="err-msg" id="reasonErr" hidden>' + t('wf.reasonReq') + '</span></label>',
      buttons: [
        { label: t('g.cancel'), cls: 'btn-ghost' },
        {
          label: t('g.confirm'), cls: 'btn-primary', keepOpen: true,
          onClick: function () {
            var v = (document.getElementById('reasonBox').value || '').trim();
            if (!v) {
              document.getElementById('reasonErr').hidden = false;
              document.getElementById('reasonBox').classList.add('input-error');
              return false;
            }
            closeModal();
            onOk(v);
          }
        }
      ],
      onOpen: function () { var b = document.getElementById('reasonBox'); if (b) b.focus(); }
    });
  }

  /* ---------- value formatting for tables & detail views ---------- */
  function displayValue(f, rec) {
    var v = rec ? rec[f.name] : undefined;
    switch (f.type) {
      case 'money':
      case 'calc':
        return '<span class="money">' + I18N.money(computeValue(f, rec)) + '</span>';
      case 'number':
        return '<span class="num">' + I18N.num(v, 0) + '</span>';
      case 'percent':
        return '<span class="num">' + I18N.pct(v || 0, 1) + '</span>';
      case 'date':
        return '<span class="num">' + I18N.date(v) + '</span>';
      case 'checkbox':
        return v ? t('g.yes') : t('g.no');
      case 'select':
        return esc(Schema.optionLabel(f, v));
      case 'ref':
        return esc(Schema.refLabel(f, v));
      case 'textarea':
        return esc(String(v || '—')).slice(0, 140);
      default:
        return esc(v === undefined || v === null || v === '' ? '—' : v);
    }
  }

  /* Evaluate a `calc` field's formula against a record */
  function computeValue(f, rec) {
    if (!rec) return 0;
    if (f.type !== 'calc') return Number(rec[f.name]) || 0;
    if (typeof rec[f.name] === 'number' && !f.formula) return rec[f.name];
    if (!f.formula) return Number(rec[f.name]) || 0;
    try {
      var expr = f.formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, function (name) {
        return '(' + (Number(rec[name]) || 0) + ')';
      });
      /* the formula strings are authored by us in schema.js, never by the user */
      var out = Function('"use strict";return (' + expr + ')')();
      return isFinite(out) ? out : 0;
    } catch (e) { return 0; }
  }

  /* ---------- CSV / Excel export ---------- */
  function exportCSV(filename, headers, rows) {
    var lines = [];
    lines.push(headers.map(csvCell).join(','));
    rows.forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
    /* BOM makes Excel read Arabic correctly */
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename + '.csv');
  }
  function csvCell(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    s = s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function downloadJSON(obj, name) {
    downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), name);
  }

  /* ---------- empty state ---------- */
  function empty(title, hint, actionHTML) {
    return '<div class="empty-state">' + icon('box', 46) +
      '<h4>' + esc(title) + '</h4>' +
      (hint ? '<p>' + esc(hint) + '</p>' : '') +
      (actionHTML || '') + '</div>';
  }

  /* ---------- KPI tile ---------- */
  function kpi(o) {
    return '<div class="kpi ' + (o.tone || '') + '">' +
      '<div class="kpi-label">' + (o.icon ? icon(o.icon, 15) : '') + esc(o.label) + '</div>' +
      '<div class="kpi-value">' + o.value + '</div>' +
      (o.foot ? '<div class="kpi-foot">' + o.foot + '</div>' : '') +
      '</div>';
  }

  /* ---------- progress bar ---------- */
  function progress(pct) {
    var p = Math.max(0, Math.min(150, Number(pct) || 0));
    var cls = p > 100 ? 'over' : p > 85 ? 'warn' : '';
    return '<div class="progress" title="' + I18N.pct(pct) + '"><span class="' + cls + '" style="width:' + Math.min(100, p) + '%"></span></div>';
  }

  global.UI = {
    esc: esc, attr: attr, icon: icon, toast: toast,
    modal: modal, closeModal: closeModal, dismissModal: dismissModal, confirm: confirm, askReason: askReason,
    displayValue: displayValue, computeValue: computeValue,
    exportCSV: exportCSV, downloadBlob: downloadBlob, downloadJSON: downloadJSON,
    empty: empty, kpi: kpi, progress: progress
  };
})(window);
