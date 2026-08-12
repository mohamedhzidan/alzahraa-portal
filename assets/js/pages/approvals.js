/* =========================================================================
   pages/approvals.js — the approvals inbox
   ========================================================================= */
(function (global) {
  'use strict';

  function render(host) {
    var box = Workflow.inbox();
    var total = box.toReview.length + box.toApprove.length + box.mine.length;

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + UI.icon('inbox', 22) + ' ' + t('inbox.title') + '</h1>' +
      '<p class="page-sub">' + t('inbox.sub') + '</p></div></div>';

    if (!total) {
      html += '<div class="card"><div class="card-body">' +
        '<div class="empty-state">' + UI.icon('check', 46) + '<h4>' + t('inbox.empty') + '</h4></div>' +
        '</div></div>';
      host.innerHTML = html;
      return;
    }

    html += section(t('inbox.toReview'), box.toReview, 'review');
    html += section(t('inbox.toApprove'), box.toApprove, 'approve');
    html += section(t('inbox.mine'), box.mine, 'fix');

    host.innerHTML = html;

    host.querySelectorAll('[data-open]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        EntityPage.openDetail(b.getAttribute('data-open'), b.getAttribute('data-rid'));
      };
    });
    host.querySelectorAll('[data-quick]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var act = b.getAttribute('data-quick');
        var mid = b.getAttribute('data-mid');
        var rid = b.getAttribute('data-rid');
        if (act === 'reject' || act === 'return') {
          UI.askReason(t('wf.' + (act === 'return' ? 'return' : 'reject')), function (reason) {
            EntityPage.doTransition(mid, rid, act, reason);
          });
        } else {
          EntityPage.doTransition(mid, rid, act, null);
        }
      };
    });
  }

  function section(title, items, mode) {
    if (!items.length) return '';
    var h = '<div class="card mb-2"><div class="card-head">' +
      '<h3 class="card-title">' + UI.esc(title) + '</h3>' +
      '<span class="badge b-info plain num">' + items.length + '</span></div>' +
      '<div class="card-body flush"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="no-sort">' + t('g.docNo') + '</th>' +
      '<th class="no-sort">' + L({ ar: 'الشاشة', en: 'Screen' }) + '</th>' +
      '<th class="no-sort">' + t('g.date') + '</th>' +
      '<th class="no-sort">' + t('g.total') + '</th>' +
      '<th class="no-sort">' + t('g.createdBy') + '</th>' +
      '<th class="no-sort">' + t('wf.status') + '</th>' +
      '<th class="no-sort col-actions">' + t('g.actions') + '</th>' +
      '</tr></thead><tbody>';

    items.forEach(function (x) {
      var m = x.module, r = x.record;
      var amt = m.amountField ? r[m.amountField] : null;
      var creator = Store.find('users', r.createdBy);
      h += '<tr class="clickable" data-open="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' +
        '<td><strong class="num">' + UI.esc(r.docNo || '—') + '</strong></td>' +
        '<td>' + UI.icon(m.icon, 15) + ' ' + UI.esc(L(m.label)) + '</td>' +
        '<td class="num">' + I18N.date(r.date || r.createdAt) + '</td>' +
        '<td class="money">' + (amt !== null && amt !== undefined ? I18N.money(amt) : '—') + '</td>' +
        '<td>' + UI.esc(creator ? creator.name : '—') + '</td>' +
        '<td>' + Workflow.badgeHTML(r.status) + '</td>' +
        '<td class="col-actions"><div class="row-actions">';

      if (mode === 'review') {
        h += '<button class="btn btn-primary btn-sm" data-quick="review" data-mid="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' + t('wf.review') + '</button>' +
             '<button class="btn btn-outline btn-sm" data-quick="return" data-mid="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' + t('wf.return') + '</button>';
      } else if (mode === 'approve') {
        h += '<button class="btn btn-success btn-sm" data-quick="approve" data-mid="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' + t('wf.approve') + '</button>' +
             '<button class="btn btn-danger btn-sm" data-quick="reject" data-mid="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' + t('wf.reject') + '</button>';
      } else {
        h += '<button class="btn btn-outline btn-sm" data-open="' + UI.attr(m.id) + '" data-rid="' + UI.attr(r.id) + '">' + t('g.edit') + '</button>';
      }
      h += '</div></td></tr>';

      if (r.returnReason && r.status === 'returned') {
        h += '<tr><td colspan="7" style="background:var(--purple-bg);color:var(--purple);font-size:12.5px">' +
          '<strong>' + t('wf.reason') + ':</strong> ' + UI.esc(r.returnReason) + '</td></tr>';
      }
      if (r.rejectReason && r.status === 'rejected') {
        h += '<tr><td colspan="7" style="background:var(--danger-bg);color:var(--danger);font-size:12.5px">' +
          '<strong>' + t('wf.reason') + ':</strong> ' + UI.esc(r.rejectReason) + '</td></tr>';
      }
    });

    return h + '</tbody></table></div></div></div>';
  }

  global.ApprovalsPage = { render: render };
})(window);
