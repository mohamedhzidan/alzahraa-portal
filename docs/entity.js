/* =========================================================================
   pages/entity.js — the generic screen engine
   Renders the list, the form and the detail view for EVERY module
   described in schema.js. Adding a screen requires no code here.
   ========================================================================= */
(function (global) {
  'use strict';

  var state = {}; /* per-module view state: search, page, sort, filter */

  function st(id) {
    if (!state[id]) state[id] = { q: '', page: 1, per: 15, sort: null, dir: 'asc', filter: 'all' };
    return state[id];
  }

  /* ======================================================================
     LIST
     ==================================================================== */
  function render(moduleId, host) {
    var mod = Schema.get(moduleId);
    if (!mod) { host.innerHTML = '<div class="alert alert-danger">Unknown screen: ' + UI.esc(moduleId) + '</div>'; return; }
    if (!Auth.canSee(moduleId)) {
      host.innerHTML = '<div class="alert alert-danger">' + UI.icon('alert', 18) + '<span>' + t('perm.none') + '</span></div>';
      return;
    }
    var s = st(moduleId);
    var rows = dataFor(mod, s);

    var canCreate = Auth.can(moduleId, 'create');

    var html = '';
    html += '<div class="page-head">' +
      '<div class="page-head-text">' +
        '<h1 class="page-title">' + UI.icon(mod.icon, 22) + ' ' + UI.esc(L(mod.label)) + '</h1>' +
        '<p class="page-sub">' + UI.esc(L(mod.desc)) + '</p>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-outline btn-sm" data-x="export">' + UI.icon('download', 15) + ' ' + t('g.export') + '</button>' +
        '<button class="btn btn-outline btn-sm" data-x="print">' + UI.icon('printer', 15) + ' ' + t('g.print') + '</button>' +
        (canCreate ? '<button class="btn btn-primary" data-x="new">' + UI.icon('plus', 15) + ' ' + t('g.new') + '</button>' : '') +
      '</div>' +
    '</div>';

    html += '<div class="card">';

    /* toolbar */
    html += '<div class="table-toolbar">' +
      '<div class="search-wrap">' + UI.icon('search', 16) +
        '<input type="search" class="input input-sm" id="tblSearch" placeholder="' + t('g.search') + '..." value="' + UI.attr(s.q) + '">' +
      '</div>';

    if (mod.workflow) {
      html += '<div class="chip-row">';
      var chips = [['all', t('g.all')]].concat(
        ['draft', 'pending', 'reviewed', 'approved', 'rejected', 'returned'].map(function (k) { return [k, t('wf.' + k)]; })
      );
      chips.forEach(function (c) {
        html += '<button class="filter-chip' + (s.filter === c[0] ? ' active' : '') + '" data-filter="' + c[0] + '">' + c[1] + '</button>';
      });
      html += '</div>';
    }
    html += '<span class="muted small" style="margin-inline-start:auto">' + t('g.count') + ': <strong class="num">' + rows.total + '</strong></span>';
    html += '</div>';

    /* table */
    if (!rows.page.length) {
      html += rows.total === 0 && !s.q
        ? UI.empty(t('g.noData'), t('g.noDataHint'))
        : UI.empty(t('g.noResults'), '');
    } else {
      html += '<div class="table-wrap"><table class="data-table"><thead><tr>';
      mod.columns.forEach(function (cn) {
        var f = colField(mod, cn);
        var sorted = s.sort === cn;
        html += '<th data-sort="' + cn + '" class="' + (sorted ? 'sorted' : '') + '">' +
          UI.esc(colLabel(mod, cn)) +
          '<span class="sort-ind">' + (sorted ? (s.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span></th>';
      });
      html += '<th class="col-actions no-sort">' + t('g.actions') + '</th></tr></thead><tbody>';

      rows.page.forEach(function (r) {
        html += '<tr class="clickable" data-id="' + UI.attr(r.id) + '">';
        mod.columns.forEach(function (cn) {
          html += '<td>' + cellHTML(mod, cn, r) + '</td>';
        });
        html += '<td class="col-actions"><div class="row-actions">' +
          '<button class="row-btn" data-act="view" data-id="' + UI.attr(r.id) + '" title="' + t('g.view') + '">' + UI.icon('eye', 16) + '</button>' +
          (Auth.can(moduleId, 'edit') && !Workflow.isLocked(r)
            ? '<button class="row-btn" data-act="edit" data-id="' + UI.attr(r.id) + '" title="' + t('g.edit') + '">' + UI.icon('edit', 16) + '</button>' : '') +
          (Auth.can(moduleId, 'create')
            ? '<button class="row-btn" data-act="dup" data-id="' + UI.attr(r.id) + '" title="' + t('g.duplicate') + '">' + UI.icon('copy', 16) + '</button>' : '') +
          (Auth.can(moduleId, 'delete') && !Workflow.isPosted(r) && r.status !== 'reversed'
            ? '<button class="row-btn danger" data-act="del" data-id="' + UI.attr(r.id) + '" title="' + t('g.delete') + '">' + UI.icon('trash', 16) + '</button>' : '') +
          '</div></td></tr>';
      });
      html += '</tbody></table></div>';

      /* footer + pager */
      html += '<div class="table-foot">' +
        '<span>' + t('g.showing') + ' <strong class="num">' + rows.from + '–' + rows.to + '</strong> ' + t('g.of') + ' <strong class="num">' + rows.total + '</strong></span>' +
        '<div class="pager">' + pagerHTML(rows.pages, s.page) + '</div>' +
        '</div>';
    }
    html += '</div>';

    host.innerHTML = html;
    wire(moduleId, host);
  }

  /* Totals produced by the line-items engine are not declared fields,
     so they get their labels and money formatting from here. */
  var VIRTUAL_COLS = {
    subTotal:    { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal' },
    taxAmount:   { ar: 'قيمة الضريبة',          en: 'Tax amount' },
    grandTotal:  { ar: 'الإجمالي',              en: 'Total' },
    totalDebit:  { ar: 'إجمالي المدين',         en: 'Total debit' },
    totalCredit: { ar: 'إجمالي الدائن',         en: 'Total credit' },
    netTotal:    { ar: 'صافي الإجمالي',         en: 'Net total' }
  };

  function colField(mod, name) {
    for (var i = 0; i < mod.fields.length; i++) if (mod.fields[i].name === name) return mod.fields[i];
    if (mod.lines) {
      for (var j = 0; j < mod.lines.fields.length; j++) if (mod.lines.fields[j].name === name) return mod.lines.fields[j];
    }
    return null;
  }
  function colLabel(mod, name) {
    if (name === 'docNo') return t('g.docNo');
    if (name === 'status') return t('wf.status');
    if (name === 'createdBy') return t('g.createdBy');
    if (VIRTUAL_COLS[name]) return L(VIRTUAL_COLS[name]);
    var f = colField(mod, name);
    return f ? L(f.label) : name;
  }
  function cellHTML(mod, name, rec) {
    if (name === 'status') {
      if (mod.workflow) return Workflow.badgeHTML(rec.status);
      var f0 = colField(mod, 'status');
      var val = Schema.optionLabel(f0, rec.status);
      var cls = (rec.status === 'active' || rec.status === 'valid') ? 'b-active' : 'b-inactive';
      return '<span class="badge ' + cls + '">' + UI.esc(val) + '</span>';
    }
    if (name === 'docNo') return '<strong class="num">' + UI.esc(rec.docNo || '—') + '</strong>';
    if (name === 'createdBy') {
      var u = Store.find('users', rec.createdBy);
      return UI.esc(u ? u.name : '—');
    }
    if (name === 'progress') return UI.progress(rec.progress) + '<small class="num muted">' + I18N.pct(rec.progress || 0, 0) + '</small>';
    if (VIRTUAL_COLS[name]) return '<span class="money">' + I18N.money(rec[name] || 0) + '</span>';
    var f = colField(mod, name);
    if (!f) return UI.esc(rec[name] === undefined ? '—' : rec[name]);
    return UI.displayValue(f, rec);
  }

  function dataFor(mod, s) {
    var all = Auth.scopeRows(mod.id, Store.all(mod.table));

    if (mod.workflow && s.filter !== 'all') {
      all = all.filter(function (r) { return (r.status || 'draft') === s.filter; });
    }
    if (s.q) {
      var q = s.q.toLowerCase();
      var keys = (mod.search || []).concat(mod.columns);
      all = all.filter(function (r) {
        for (var i = 0; i < keys.length; i++) {
          var f = colField(mod, keys[i]);
          var raw = r[keys[i]];
          var txt = f && f.type === 'ref' ? Schema.refLabel(f, raw)
                  : f && f.type === 'select' ? Schema.optionLabel(f, raw)
                  : raw;
          if (txt !== undefined && txt !== null && String(txt).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
    }

    var sortKey = s.sort || (mod.workflow ? 'docNo' : (mod.columns[0] || 'createdAt'));
    var f = colField(mod, sortKey);
    all.sort(function (a, b) {
      var av = a[sortKey], bv = b[sortKey];
      if (f && f.type === 'ref') { av = Schema.refLabel(f, av); bv = Schema.refLabel(f, bv); }
      if (typeof av === 'number' || typeof bv === 'number') { av = Number(av) || 0; bv = Number(bv) || 0; return s.dir === 'asc' ? av - bv : bv - av; }
      av = String(av === undefined || av === null ? '' : av);
      bv = String(bv === undefined || bv === null ? '' : bv);
      return s.dir === 'asc' ? av.localeCompare(bv, 'ar') : bv.localeCompare(av, 'ar');
    });
    if (!s.sort) all.reverse(); /* newest first by default */

    var total = all.length;
    var pages = Math.max(1, Math.ceil(total / s.per));
    if (s.page > pages) s.page = pages;
    var start = (s.page - 1) * s.per;
    return {
      all: all, total: total, pages: pages,
      page: all.slice(start, start + s.per),
      from: total ? start + 1 : 0,
      to: Math.min(total, start + s.per)
    };
  }

  function pagerHTML(pages, cur) {
    if (pages <= 1) return '';
    var h = '<button data-page="' + Math.max(1, cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + '>‹</button>';
    var list = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - cur) <= 1) list.push(i);
      else if (list[list.length - 1] !== '…') list.push('…');
    }
    list.forEach(function (p) {
      h += p === '…' ? '<button disabled>…</button>'
        : '<button data-page="' + p + '" class="' + (p === cur ? 'active' : '') + '">' + p + '</button>';
    });
    h += '<button data-page="' + Math.min(pages, cur + 1) + '"' + (cur === pages ? ' disabled' : '') + '>›</button>';
    return h;
  }

  function wire(moduleId, host) {
    var s = st(moduleId);
    var mod = Schema.get(moduleId);

    var sb = host.querySelector('#tblSearch');
    if (sb) {
      var tm;
      sb.addEventListener('input', function () {
        clearTimeout(tm);
        tm = setTimeout(function () { s.q = sb.value; s.page = 1; render(moduleId, host); }, 220);
      });
    }
    host.querySelectorAll('[data-filter]').forEach(function (b) {
      b.onclick = function () { s.filter = b.getAttribute('data-filter'); s.page = 1; render(moduleId, host); };
    });
    host.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.onclick = function () {
        var k = th.getAttribute('data-sort');
        if (s.sort === k) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
        else { s.sort = k; s.dir = 'asc'; }
        render(moduleId, host);
      };
    });
    host.querySelectorAll('[data-page]').forEach(function (b) {
      b.onclick = function () { s.page = Number(b.getAttribute('data-page')); render(moduleId, host); };
    });

    var nb = host.querySelector('[data-x="new"]');
    if (nb) nb.onclick = function () { openForm(moduleId, null); };

    var ex = host.querySelector('[data-x="export"]');
    if (ex) ex.onclick = function () { doExport(moduleId); };
    var pr = host.querySelector('[data-x="print"]');
    if (pr) pr.onclick = function () { window.print(); };

    host.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.onclick = function (e) {
        if (e.target.closest('.row-actions')) return;
        openDetail(moduleId, tr.getAttribute('data-id'));
      };
    });
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-id');
        var act = b.getAttribute('data-act');
        if (act === 'view') openDetail(moduleId, id);
        if (act === 'edit') openForm(moduleId, id);
        if (act === 'dup') duplicate(moduleId, id);
        if (act === 'del') removeRec(moduleId, id, host);
      };
    });
  }

  function doExport(moduleId) {
    var mod = Schema.get(moduleId);
    var s = st(moduleId);
    var rows = dataFor(mod, s).all;
    var headers = mod.columns.map(function (c) { return colLabel(mod, c); });
    var body = rows.map(function (r) {
      return mod.columns.map(function (c) {
        if (c === 'status') return mod.workflow ? Workflow.label(r.status) : Schema.optionLabel(colField(mod, 'status'), r.status);
        if (c === 'docNo') return r.docNo || '';
        var f = colField(mod, c);
        if (!f) return r[c] === undefined ? '' : r[c];
        if (f.type === 'ref') return Schema.refLabel(f, r[c]);
        if (f.type === 'select') return Schema.optionLabel(f, r[c]);
        if (f.type === 'money' || f.type === 'calc') return UI.computeValue(f, r);
        if (f.type === 'date') return I18N.date(r[c]);
        return r[c] === undefined || r[c] === null ? '' : r[c];
      });
    });
    UI.exportCSV(L(mod.label).replace(/\s+/g, '_'), headers, body);
    UI.toast(t('g.export') + ' ✓');
  }

  function removeRec(moduleId, id, host) {
    var mod = Schema.get(moduleId);
    var rec = Store.find(mod.table, id);
    if (Workflow.isPosted(rec)) { UI.toast(t('wf.lockedDelete'), 'error'); return; }
    UI.confirm({
      title: t('g.delete'), message: t('g.deleteQ'), warn: t('g.deleteWarn'), danger: true,
      okLabel: t('g.delete'),
      onOk: function () {
        Store.destroy(mod.table, id);
        UI.toast(t('g.deleted'));
        render(moduleId, host || document.getElementById('content'));
      }
    });
  }

  function duplicate(moduleId, id) {
    var mod = Schema.get(moduleId);
    var src = Store.find(mod.table, id);
    if (!src) return;
    var copy = JSON.parse(JSON.stringify(src));
    ['id', 'docNo', 'status', 'trail', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
     'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt', 'approvedBy', 'approvedAt',
     'postedAt', 'rejectedBy', 'rejectedAt', 'rejectReason', 'returnReason'].forEach(function (k) { delete copy[k]; });
    openForm(moduleId, null, copy);
  }

  /* ======================================================================
     DETAIL (read-only view + workflow buttons)
     ==================================================================== */
  function openDetail(moduleId, id) {
    var mod = Schema.get(moduleId);
    var rec = Store.find(mod.table, id);
    if (!rec) return;

    var body = '';

    if (mod.workflow) {
      body += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' +
        '<strong class="num" style="font-size:16px">' + UI.esc(rec.docNo || '') + '</strong>' +
        Workflow.badgeHTML(rec.status) +
        (rec.isReversal ? '<span class="badge b-gold">' + (I18N.getLang() === 'ar' ? 'مستند عكسي' : 'Reversal') + '</span>' : '') +
        '</div>';
      if (rec.returnReason && rec.status === 'returned') {
        body += '<div class="alert alert-warn">' + UI.icon('alert', 17) + '<span><strong>' + t('wf.return') + ':</strong> ' + UI.esc(rec.returnReason) + '</span></div>';
      }
      if (rec.rejectReason && rec.status === 'rejected') {
        body += '<div class="alert alert-danger">' + UI.icon('alert', 17) + '<span><strong>' + t('wf.reject') + ':</strong> ' + UI.esc(rec.rejectReason) + '</span></div>';
      }
    }

    /* grouped detail fields */
    var sections = groupFields(mod.fields);
    sections.forEach(function (sec) {
      body += '<div class="form-section"><div class="form-section-title">' + UI.esc(sec.title) + '</div><dl class="detail-grid">';
      sec.fields.forEach(function (f) {
        body += '<div class="detail-item"><dt>' + UI.esc(L(f.label)) + '</dt><dd>' + UI.displayValue(f, rec) + '</dd></div>';
      });
      body += '</dl></div>';
    });

    /* lines */
    if (mod.lines && Array.isArray(rec.lines) && rec.lines.length) {
      body += '<div class="form-section"><div class="form-section-title">' + UI.esc(L(mod.lines.label)) + '</div>' +
        '<div class="table-wrap"><table class="data-table lines-table"><thead><tr><th>#</th>';
      mod.lines.fields.forEach(function (lf) { body += '<th>' + UI.esc(L(lf.label)) + '</th>'; });
      body += '</tr></thead><tbody>';
      rec.lines.forEach(function (ln, i) {
        body += '<tr><td class="num">' + (i + 1) + '</td>';
        mod.lines.fields.forEach(function (lf) { body += '<td>' + UI.displayValue(lf, ln) + '</td>'; });
        body += '</tr>';
      });
      body += '</tbody><tfoot>';
      (mod.lines.totals || []).forEach(function (tot) {
        body += '<tr><td colspan="' + mod.lines.fields.length + '" class="text-e">' + UI.esc(L(tot.label)) + '</td>' +
          '<td class="money">' + I18N.money(rec[tot.target] || 0) + '</td></tr>';
      });
      if (mod.lines.grandTotal) {
        body += '<tr><td colspan="' + mod.lines.fields.length + '" class="text-e">' + t('g.tax') + '</td>' +
          '<td class="money">' + I18N.money(rec.taxAmount || 0) + '</td></tr>' +
          '<tr><td colspan="' + mod.lines.fields.length + '" class="text-e strong">' + t('g.total') + '</td>' +
          '<td class="money strong">' + I18N.money(rec.grandTotal || 0) + '</td></tr>';
      }
      body += '</tfoot></table></div></div>';
    }

    /* audit footer */
    var cu = Store.find('users', rec.createdBy);
    body += '<div class="form-section"><div class="form-section-title">' + t('g.history') + '</div>';
    body += '<dl class="detail-grid">' +
      '<div class="detail-item"><dt>' + t('g.createdBy') + '</dt><dd>' + UI.esc(cu ? cu.name : '—') + '</dd></div>' +
      '<div class="detail-item"><dt>' + t('g.createdAt') + '</dt><dd class="num">' + I18N.dateTime(rec.createdAt) + '</dd></div>' +
      '<div class="detail-item"><dt>' + t('g.updatedAt') + '</dt><dd class="num">' + I18N.dateTime(rec.updatedAt) + '</dd></div>' +
      '</dl>';
    if (mod.workflow) body += '<div class="mt-2">' + Workflow.trailHTML(rec) + '</div>';
    body += '</div>';

    /* who is allowed to approve this value */
    if (global.Rules && mod.workflow) {
      var hint = Rules.approverHint(mod, rec);
      if (hint && ['pending', 'reviewed'].indexOf(rec.status) !== -1) {
        body += '<div class="alert alert-info">' + UI.icon('eye', 17) + '<span>' + UI.esc(hint) + '</span></div>';
      }
    }

    /* buttons */
    var buttons = [{ label: t('g.close'), cls: 'btn-ghost' }];
    buttons.push({
      label: L({ ar: 'طباعة المستند الرسمي', en: 'Print official document' }), cls: 'btn-outline', keepOpen: true,
      onClick: function () {
        if (global.Print) Print.doc(moduleId, id); else window.print();
        return false;
      }
    });
    if (Auth.can(moduleId, 'edit') && !Workflow.isLocked(rec)) {
      buttons.push({ label: t('g.edit'), cls: 'btn-outline', onClick: function () { setTimeout(function () { openForm(moduleId, id); }, 60); } });
    }
    if (mod.workflow) {
      Workflow.actions(moduleId, rec).forEach(function (a) {
        buttons.push({
          label: a.label, cls: a.cls, disabled: a.disabled,
          onClick: function () {
            if (a.disabled) return;
            if (a.needsReason) {
              setTimeout(function () {
                UI.askReason(a.label, function (reason) { doTransition(moduleId, id, a.key, reason); });
              }, 60);
            } else {
              doTransition(moduleId, id, a.key, null);
            }
          }
        });
      });
    }

    UI.modal({
      title: L(mod.label) + (rec.docNo ? ' — ' + rec.docNo : (rec.name ? ' — ' + rec.name : '')),
      size: 'wide', body: body, buttons: buttons
    });
  }

  function doTransition(moduleId, id, action, reason) {
    /* balance / business validation must pass before submitting or approving */
    var mod = Schema.get(moduleId);
    if (action === 'submit' && mod.lines && mod.lines.validate) {
      var rec = Store.find(mod.table, id);
      var err = mod.lines.validate(rec);
      if (err) { UI.toast(L(err), 'error', 5000); return; }
    }

    /* spending authority: is this person allowed to approve this amount? */
    if (global.Rules) {
      var record = Store.find(mod.table, id);
      var gate = Rules.validateTransition(mod, record, action);
      if (gate.errors.length) { showGuard(gate.errors, [], null); return; }
      if (gate.confirms.length) {
        showGuard([], gate.confirms, function () {
          finishTransition(moduleId, id, action, reason);
        });
        return;
      }
    }
    finishTransition(moduleId, id, action, reason);
  }

  async function finishTransition(moduleId, id, action, reason) {
    var res = await Workflow.transition(moduleId, id, action, reason);
    if (!res.ok) { UI.toast(res.error || t('wf.noPerm'), 'error', 4500); return; }
    await Store.reload();
    var msgs = {
      submit: t('wf.submitted'), review: t('wf.reviewedMsg'), approve: t('wf.approvedMsg'),
      reject: t('wf.rejectedMsg'), 'return': t('wf.returnedMsg'), reverse: t('wf.reversedMsg')
    };
    UI.toast(msgs[action] || t('g.saved'), action === 'reject' ? 'warn' : 'success');
    App.refresh();
  }

  function groupFields(fields) {
    var order = [], map = {};
    fields.forEach(function (f) {
      var key = f.section ? L(f.section) : (I18N.getLang() === 'ar' ? 'بيانات' : 'Information');
      if (!map[key]) { map[key] = { title: key, fields: [] }; order.push(key); }
      map[key].fields.push(f);
    });
    return order.map(function (k) { return map[k]; });
  }

  /* ======================================================================
     FORM (create / edit)
     ==================================================================== */
  function openForm(moduleId, id, presetData) {
    var mod = Schema.get(moduleId);
    var editing = !!id;
    var rec = editing ? Store.find(mod.table, id) : (presetData || {});
    if (editing && !rec) return;

    if (editing && Workflow.isLocked(rec)) { UI.toast(t('wf.lockedEdit'), 'error'); return; }
    if (!editing && !Auth.can(moduleId, 'create')) { UI.toast(t('wf.noPerm'), 'error'); return; }
    if (editing && !Auth.can(moduleId, 'edit')) { UI.toast(t('wf.noPerm'), 'error'); return; }

    var draft = JSON.parse(JSON.stringify(rec || {}));
    var personalEmployee = Auth.current() && Auth.current().role === 'employee' ? Auth.current().employeeId : null;
    if (Auth.current() && Auth.current().role === 'employee' && (moduleId === 'leaves' || moduleId === 'itTickets')) {
      if (!personalEmployee) {
        UI.toast(L({ ar: 'حسابك غير مربوط بملف موظف. تواصل مع مسؤول النظام.', en: 'Your account is not linked to an employee record. Contact the administrator.' }), 'error', 6000);
        return;
      }
      if (editing && rec.createdBy !== Auth.current().id) { UI.toast(t('wf.noPerm'), 'error'); return; }
      if (moduleId === 'leaves') draft.employee = personalEmployee;
      if (moduleId === 'itTickets') draft.requester = personalEmployee;
    }
    if (!editing) {
      mod.fields.forEach(function (f) {
        if (draft[f.name] === undefined && f.default !== undefined) {
          draft[f.name] = f.default === 'today' ? I18N.today() : f.default;
        }
      });
      if (!draft.lines && mod.lines) draft.lines = [blankLine(mod)];
    }
    if (mod.lines && (!draft.lines || !draft.lines.length)) draft.lines = [blankLine(mod)];

    var body = '<form id="entForm" autocomplete="off">';
    groupFields(mod.fields).forEach(function (sec) {
      body += '<div class="form-section"><div class="form-section-title">' + UI.esc(sec.title) + '</div><div class="form-grid">';
      sec.fields.forEach(function (f) { body += fieldHTML(f, draft, personalFieldLocked(moduleId, f.name)); });
      body += '</div></div>';
    });

    if (mod.lines) {
      body += '<div class="form-section"><div class="form-section-title">' + UI.esc(L(mod.lines.label)) +
        '<button type="button" class="btn btn-outline btn-sm" id="addLine" style="margin-inline-start:auto">' +
        UI.icon('plus', 14) + ' ' + t('g.addLine') + '</button></div>' +
        '<div class="table-wrap" id="linesWrap"></div></div>';
    }
    body += '</form>';

    UI.modal({
      title: (editing ? t('g.edit') : t('g.new')) + ' — ' + L(mod.label),
      size: 'wide', body: body,
      buttons: [
        { label: t('g.cancel'), cls: 'btn-ghost' },
        {
          label: t('g.save'), cls: 'btn-primary', keepOpen: true,
          onClick: function () { return submitForm(mod, editing ? id : null, draft); }
        }
      ],
      onOpen: function () {
        bindForm(mod, draft);
        if (mod.lines) { renderLines(mod, draft); }
        var first = document.querySelector('#entForm .input, #entForm .select');
        if (first) first.focus();
      }
    });
  }

  function blankLine(mod) {
    var o = {};
    mod.lines.fields.forEach(function (f) { o[f.name] = f.default !== undefined ? f.default : (f.type === 'number' || f.type === 'money' ? 0 : ''); });
    return o;
  }

  function personalFieldLocked(moduleId, fieldName) {
    var u = Auth.current();
    if (!u || u.role !== 'employee') return false;
    if (moduleId === 'leaves') return fieldName === 'employee';
    if (moduleId === 'itTickets') return ['requester','assignedTo','ticketStatus','resolution'].indexOf(fieldName) !== -1;
    return false;
  }

  function fieldHTML(f, rec, forcedReadonly) {
    var v = rec[f.name];
    var readonly = !!(f.readonly || forcedReadonly);
    var cls = f.full ? 'span-full' : '';
    var req = f.required ? ' <span class="req">*</span>' : '';
    var h = '<label class="field ' + cls + '" data-fname="' + UI.attr(f.name) + '">' +
      '<span class="field-label">' + UI.esc(L(f.label)) + req + '</span>';

    if (f.type === 'textarea') {
      h += '<textarea class="textarea" name="' + UI.attr(f.name) + '"' + (readonly ? ' disabled' : '') + '>' + UI.esc(v || '') + '</textarea>';
    } else if (f.type === 'select') {
      h += '<select class="select" name="' + UI.attr(f.name) + '"' + (readonly ? ' disabled' : '') + '>';
      h += '<option value="">' + t('g.selectOne') + '</option>';
      (f.options || []).forEach(function (o) {
        h += '<option value="' + UI.attr(o.value) + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' + UI.esc(L(o.label)) + '</option>';
      });
      h += '</select>';
    } else if (f.type === 'ref') {
      var target = Schema.get(f.ref);
      var opts = target ? Store.all(target.table) : [];
      opts = opts.filter(function (r) { return r.status !== 'inactive'; });
      h += '<select class="select" name="' + UI.attr(f.name) + '"' + (readonly ? ' disabled' : '') + '>';
      h += '<option value="">' + t('g.selectOne') + '</option>';
      opts.forEach(function (o) {
        var lab = o[f.refLabel || 'name'] || o.name || o.docNo || o.code || o.id;
        h += '<option value="' + UI.attr(o.id) + '"' + (v === o.id ? ' selected' : '') + '>' + UI.esc(lab) + '</option>';
      });
      h += '</select>';
    } else if (f.type === 'checkbox') {
      h += '<span class="check-row"><input type="checkbox" name="' + UI.attr(f.name) + '"' + (v ? ' checked' : '') + '></span>';
    } else if (f.type === 'calc') {
      h += '<input type="text" class="input" name="' + UI.attr(f.name) + '" data-calc="1" value="' + UI.attr(I18N.money(UI.computeValue(f, rec), false)) + '" disabled>';
    } else {
      var type = f.type === 'date' ? 'date'
        : (f.type === 'number' || f.type === 'money' || f.type === 'percent') ? 'number'
        : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text';
      var step = (f.type === 'money' || f.type === 'percent') ? ' step="0.01"' : (f.type === 'number' ? ' step="any"' : '');
      h += '<input type="' + type + '" class="input" name="' + UI.attr(f.name) + '"' + step +
        (readonly ? ' disabled' : '') + ' value="' + UI.attr(v === undefined || v === null ? '' : v) + '">';
    }
    if (f.help) h += '<span class="field-hint">' + UI.esc(L(f.help)) + '</span>';
    h += '<span class="err-msg" hidden></span></label>';
    return h;
  }

  function bindForm(mod, draft) {
    var form = document.getElementById('entForm');
    if (!form) return;
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.name) return;
      var f = fieldByName(mod, el.name);
      if (!f) return;
      draft[el.name] = readEl(el, f);
      recalc(mod, draft);
    });
    form.addEventListener('change', function (e) {
      var el = e.target;
      if (!el.name) return;
      var f = fieldByName(mod, el.name);
      if (!f) return;
      draft[el.name] = readEl(el, f);
      recalc(mod, draft);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  function fieldByName(mod, name) {
    for (var i = 0; i < mod.fields.length; i++) if (mod.fields[i].name === name) return mod.fields[i];
    return null;
  }
  function readEl(el, f) {
    if (f.type === 'checkbox') return el.checked;
    if (f.type === 'number' || f.type === 'money' || f.type === 'percent') {
      return el.value === '' ? '' : Number(el.value);
    }
    return el.value;
  }

  function recalc(mod, draft) {
    /* line totals + header totals */
    if (mod.lines) {
      (draft.lines || []).forEach(function (ln) {
        mod.lines.fields.forEach(function (lf) {
          if (lf.type === 'calc') ln[lf.name] = UI.computeValue(lf, ln);
        });
      });
      (mod.lines.totals || []).forEach(function (tot) {
        var sum = 0;
        (draft.lines || []).forEach(function (ln) { sum += Number(ln[tot.field]) || 0; });
        draft[tot.target] = sum;
      });
      if (mod.lines.grandTotal) {
        var rate = Number(draft.taxRate) || 0;
        draft.taxAmount = (Number(draft.subTotal) || 0) * rate / 100;
        draft.grandTotal = (Number(draft.subTotal) || 0) + draft.taxAmount;
      }
      var wrap = document.getElementById('linesWrap');
      if (wrap) updateLineTotals(mod, draft);
    }
    /* header calc fields */
    mod.fields.forEach(function (f) {
      if (f.type !== 'calc') return;
      var val = UI.computeValue(f, draft);
      draft[f.name] = val;
      var el = document.querySelector('#entForm [name="' + f.name + '"][data-calc]');
      if (el) el.value = I18N.money(val, false);
    });
    /* Scalar invoices do not have a lines footer to populate taxAmount. */
    if (!mod.lines && draft.subTotal !== undefined && draft.taxRate !== undefined && draft.grandTotal !== undefined) {
      draft.taxAmount = (Number(draft.subTotal) || 0) * (Number(draft.taxRate) || 0) / 100;
    }
  }

  /* ---------- line-items editor ---------- */
  function renderLines(mod, draft) {
    var wrap = document.getElementById('linesWrap');
    if (!wrap) return;
    var lf = mod.lines.fields;

    var h = '<table class="data-table lines-table"><thead><tr><th style="width:34px">#</th>';
    lf.forEach(function (f) { h += '<th style="width:' + (f.width || 'auto') + '">' + UI.esc(L(f.label)) + '</th>'; });
    h += '<th style="width:38px"></th></tr></thead><tbody>';

    (draft.lines || []).forEach(function (ln, i) {
      h += '<tr data-li="' + i + '"><td class="num">' + (i + 1) + '</td>';
      lf.forEach(function (f) {
        h += '<td>' + lineInput(f, ln, i) + '</td>';
      });
      h += '<td><button type="button" class="row-btn danger" data-rmline="' + i + '" title="' + t('g.delete') + '">' + UI.icon('trash', 15) + '</button></td></tr>';
    });
    h += '</tbody><tfoot id="linesFoot"></tfoot></table>';
    wrap.innerHTML = h;

    wrap.querySelectorAll('[data-li] [name]').forEach(function (el) {
      el.addEventListener('input', onLineChange);
      el.addEventListener('change', onLineChange);
    });
    function onLineChange(e) {
      var el = e.target;
      var tr = el.closest('[data-li]');
      var idx = Number(tr.getAttribute('data-li'));
      var name = el.getAttribute('name');
      var f = null;
      lf.forEach(function (x) { if (x.name === name) f = x; });
      if (!f) return;
      draft.lines[idx][name] = readEl(el, f);
      recalc(mod, draft);
      /* refresh calc cells in this row only (keeps focus) */
      lf.forEach(function (x) {
        if (x.type !== 'calc') return;
        var cell = tr.querySelector('[name="' + x.name + '"]');
        if (cell) cell.value = I18N.money(draft.lines[idx][x.name] || 0, false);
      });
    }

    wrap.querySelectorAll('[data-rmline]').forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.getAttribute('data-rmline'));
        draft.lines.splice(i, 1);
        if (!draft.lines.length) draft.lines.push(blankLine(mod));
        recalc(mod, draft);
        renderLines(mod, draft);
      };
    });

    var add = document.getElementById('addLine');
    if (add) add.onclick = function () {
      draft.lines.push(blankLine(mod));
      recalc(mod, draft);
      renderLines(mod, draft);
    };

    recalc(mod, draft);
  }

  function lineInput(f, ln, i) {
    var v = ln[f.name];
    if (f.type === 'ref') {
      var target = Schema.get(f.ref);
      var opts = target ? Store.all(target.table).filter(function (r) { return r.status !== 'inactive'; }) : [];
      var h = '<select class="select input-sm" name="' + UI.attr(f.name) + '"><option value="">—</option>';
      opts.forEach(function (o) {
        var lab = o[f.refLabel || 'name'] || o.name || o.docNo || o.code || o.id;
        h += '<option value="' + UI.attr(o.id) + '"' + (v === o.id ? ' selected' : '') + '>' + UI.esc(lab) + '</option>';
      });
      return h + '</select>';
    }
    if (f.type === 'select') {
      var h2 = '<select class="select input-sm" name="' + UI.attr(f.name) + '"><option value="">—</option>';
      (f.options || []).forEach(function (o) {
        h2 += '<option value="' + UI.attr(o.value) + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' + UI.esc(L(o.label)) + '</option>';
      });
      return h2 + '</select>';
    }
    if (f.type === 'calc') {
      return '<input type="text" class="input input-sm num" name="' + UI.attr(f.name) + '" value="' + UI.attr(I18N.money(v || 0, false)) + '" disabled>';
    }
    var type = (f.type === 'number' || f.type === 'money') ? 'number' : 'text';
    var step = f.type === 'money' ? ' step="0.01"' : (f.type === 'number' ? ' step="any"' : '');
    return '<input type="' + type + '" class="input input-sm" name="' + UI.attr(f.name) + '"' + step +
      ' value="' + UI.attr(v === undefined || v === null ? '' : v) + '">';
  }

  function updateLineTotals(mod, draft) {
    var foot = document.getElementById('linesFoot');
    if (!foot) return;
    var span = mod.lines.fields.length;
    var h = '';
    (mod.lines.totals || []).forEach(function (tot) {
      h += '<tr><td colspan="' + span + '" class="text-e">' + UI.esc(L(tot.label)) + '</td>' +
        '<td class="money">' + I18N.money(draft[tot.target] || 0) + '</td><td></td></tr>';
    });
    if (mod.lines.grandTotal) {
      h += '<tr><td colspan="' + span + '" class="text-e">' + t('g.tax') + ' (' + (draft.taxRate || 0) + '%)</td>' +
        '<td class="money">' + I18N.money(draft.taxAmount || 0) + '</td><td></td></tr>' +
        '<tr><td colspan="' + span + '" class="text-e strong">' + t('g.total') + '</td>' +
        '<td class="money strong">' + I18N.money(draft.grandTotal || 0) + '</td><td></td></tr>';
    }
    foot.innerHTML = h;
  }

  /* ---------- save ---------- */
  function submitForm(mod, id, draft) {
    var form = document.getElementById('entForm');
    var ok = true;

    form.querySelectorAll('.err-msg').forEach(function (e) { e.hidden = true; });
    form.querySelectorAll('.input-error').forEach(function (e) { e.classList.remove('input-error'); });

    mod.fields.forEach(function (f) {
      if (!f.required) return;
      var v = draft[f.name];
      if (v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v))) {
        ok = false;
        var lab = form.querySelector('[data-fname="' + f.name + '"]');
        if (lab) {
          var err = lab.querySelector('.err-msg');
          if (err) { err.textContent = t('g.required'); err.hidden = false; }
          var inp = lab.querySelector('.input,.select,.textarea');
          if (inp) inp.classList.add('input-error');
        }
      }
    });

    if (!ok) { UI.toast(t('g.required'), 'error'); return false; }

    /* module-level business validation (e.g. journal must balance) */
    if (mod.lines && mod.lines.validate) {
      var err2 = mod.lines.validate(draft);
      if (err2) { UI.toast(L(err2), 'error', 5000); return false; }
    }

    recalc(mod, draft);

    /* human-error guards: hard errors block, warnings ask for confirmation */
    if (global.Rules) {
      var check = Rules.validateSave(mod, draft, id);
      if (check.errors.length) { showGuard(check.errors, [], null); return false; }
      if (check.warnings.length) {
        showGuard([], check.warnings, function () { commit(mod, id, draft); });
        return false;
      }
    }

    return commit(mod, id, draft);
  }

  function commit(mod, id, draft) {
    var saved;
    if (id) {
      saved = Store.save(mod.table, id, draft);
    } else {
      if (mod.workflow) { draft.status = draft.status || 'draft'; draft.trail = draft.trail || []; }
      if (mod.docPrefix && !draft.docNo) draft.docNo = Store.nextDocNo(mod.docPrefix);
      saved = Store.create(mod.table, draft);
    }
    if (!saved) return false;
    UI.closeModal();
    UI.toast(Store.isOnline() ? t('g.saved') : L({ ar: 'تم حفظ المسودة على هذا الجهاز وستُزامن عند عودة الاتصال.', en: 'Draft saved on this device and will sync when back online.' }));
    App.refresh();
    return true;
  }

  /* One dialog for both blocking errors and "are you sure" warnings. */
  function showGuard(errors, warnings, onProceed) {
    var body = '';
    errors.forEach(function (e) {
      body += '<div class="alert alert-danger">' + UI.icon('alert', 17) + '<span>' + UI.esc(e) + '</span></div>';
    });
    warnings.forEach(function (w) {
      body += '<div class="alert alert-warn">' + UI.icon('alert', 17) + '<span>' + UI.esc(w) + '</span></div>';
    });
    if (errors.length) {
      body += '<p class="small muted mt-2">' +
        L({ ar: 'صحّح ما سبق ثم احفظ مرة أخرى.', en: 'Correct the above, then save again.' }) + '</p>';
    }
    var buttons = errors.length
      ? [{ label: t('g.close'), cls: 'btn-primary' }]
      : [{ label: t('g.cancel'), cls: 'btn-ghost' },
         { label: L({ ar: 'راجعتُ وأتحمّل المسؤولية — احفظ', en: 'I have checked — save anyway' }),
           cls: 'btn-gold', onClick: onProceed }];

    UI.modal({
      title: errors.length
        ? L({ ar: 'لا يمكن الحفظ', en: 'Cannot save' })
        : L({ ar: 'تنبيه قبل الحفظ', en: 'Please confirm' }),
      body: body, buttons: buttons
    });
  }

  global.EntityPage = {
    render: render, openForm: openForm, openDetail: openDetail, doTransition: doTransition
  };
})(window);
