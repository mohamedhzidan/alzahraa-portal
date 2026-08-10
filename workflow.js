/* =========================================================================
   workflow.js — the fixed document route required by the SRS
   ---------------------------------------------------------------------
        draft ──submit──▶ pending ──review──▶ reviewed ──approve──▶ approved
                             │                    │                    │
                             └──return──▶ returned┘                    └──reverse──▶ reversed
                             └──reject───▶ rejected ◀──reject──────────┘

   Hard rules enforced here (segregation of duties):
     • The person who CREATED a document can never review or approve it.
     • The person who REVIEWED a document can never approve it.
     • A rejection or a return ALWAYS requires a written reason.
     • An approved document can never be edited or deleted — only reversed.
   ========================================================================= */
(function (global) {
  'use strict';

  var STATES = ['draft', 'pending', 'reviewed', 'approved', 'rejected', 'returned', 'reversed'];

  var BADGE = {
    draft: 'b-draft', pending: 'b-pending', reviewed: 'b-reviewed',
    approved: 'b-approved', rejected: 'b-rejected', returned: 'b-returned', reversed: 'b-reversed'
  };

  function label(status) { return t('wf.' + (status || 'draft')); }
  function badgeClass(status) { return BADGE[status] || 'b-draft'; }

  function badgeHTML(status) {
    return '<span class="badge ' + badgeClass(status) + '">' + label(status) + '</span>';
  }

  /* Is this document locked against editing? */
  function isLocked(rec) {
    if (!rec) return false;
    return ['pending', 'reviewed', 'approved', 'reversed', 'rejected'].indexOf(rec.status) !== -1;
  }
  function isPosted(rec) { return rec && rec.status === 'approved'; }

  /* Which actions can the CURRENT user take on this document right now? */
  function actions(moduleId, rec) {
    var out = [];
    if (!rec) return out;
    var u = Auth.current();
    if (!u) return out;
    var st = rec.status || 'draft';

    if (st === 'draft' || st === 'returned') {
      if (rec.createdBy === u.id || Auth.can(moduleId, 'edit')) {
        out.push({ key: 'submit', label: t('wf.submit'), cls: 'btn-primary' });
      }
    }
    if (st === 'pending' && Auth.can(moduleId, 'review')) {
      if (rec.createdBy !== u.id) {
        out.push({ key: 'review', label: t('wf.review'), cls: 'btn-primary' });
        out.push({ key: 'return', label: t('wf.return'), cls: 'btn-outline', needsReason: true });
        out.push({ key: 'reject', label: t('wf.reject'), cls: 'btn-danger', needsReason: true });
      } else {
        out.push({ key: '_blockedReview', label: t('wf.noSelfReview'), disabled: true, cls: 'btn-outline' });
      }
    }
    if (st === 'reviewed' && Auth.can(moduleId, 'approve')) {
      if (rec.createdBy !== u.id && rec.reviewedBy !== u.id) {
        out.push({ key: 'approve', label: t('wf.approve'), cls: 'btn-success' });
        out.push({ key: 'return', label: t('wf.return'), cls: 'btn-outline', needsReason: true });
        out.push({ key: 'reject', label: t('wf.reject'), cls: 'btn-danger', needsReason: true });
      } else {
        out.push({ key: '_blockedApprove', label: t('wf.noSelfApprove'), disabled: true, cls: 'btn-outline' });
      }
    }
    if (st === 'approved' && Auth.can(moduleId, 'approve')) {
      out.push({ key: 'reverse', label: t('wf.reverse'), cls: 'btn-danger', needsReason: true });
    }
    return out;
  }

  /* Perform a transition. Returns {ok:true, record} or {ok:false, error:'...'} */
  function transition(moduleId, recId, action, reason) {
    var mod = Schema.get(moduleId);
    if (!mod) return { ok: false, error: 'module' };
    var rec = Store.find(mod.table, recId);
    if (!rec) return { ok: false, error: 'record' };
    var u = Auth.current();
    if (!u) return { ok: false, error: t('wf.noPerm') };

    var now = new Date().toISOString();
    var patch = {};
    var trail = (rec.trail || []).slice();

    function push(kind, note) {
      trail.push({ action: kind, userId: u.id, userName: u.name, at: now, note: note || '' });
    }

    switch (action) {
      case 'submit':
        if (['draft', 'returned'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        patch.status = 'pending';
        patch.submittedBy = u.id; patch.submittedAt = now;
        push('submit');
        break;

      case 'review':
        if (rec.status !== 'pending') return { ok: false, error: t('wf.noPerm') };
        if (!Auth.can(moduleId, 'review')) return { ok: false, error: t('wf.noPerm') };
        if (rec.createdBy === u.id) return { ok: false, error: t('wf.noSelfReview') };
        patch.status = 'reviewed';
        patch.reviewedBy = u.id; patch.reviewedAt = now;
        push('review', reason);
        break;

      case 'approve':
        if (rec.status !== 'reviewed') return { ok: false, error: t('wf.noPerm') };
        if (!Auth.can(moduleId, 'approve')) return { ok: false, error: t('wf.noPerm') };
        if (rec.createdBy === u.id || rec.reviewedBy === u.id) return { ok: false, error: t('wf.noSelfApprove') };
        patch.status = 'approved';
        patch.approvedBy = u.id; patch.approvedAt = now;
        patch.postedAt = now;
        push('approve', reason);
        break;

      case 'return':
        if (['pending', 'reviewed'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        patch.status = 'returned';
        patch.returnReason = reason;
        push('return', reason);
        break;

      case 'reject':
        if (['pending', 'reviewed'].indexOf(rec.status) === -1) return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        patch.status = 'rejected';
        patch.rejectReason = reason;
        patch.rejectedBy = u.id; patch.rejectedAt = now;
        push('reject', reason);
        break;

      case 'reverse':
        if (rec.status !== 'approved') return { ok: false, error: t('wf.noPerm') };
        if (!reason) return { ok: false, error: t('wf.reasonReq') };
        /* create the mirror correcting document, never delete the original */
        var copy = JSON.parse(JSON.stringify(rec));
        delete copy.id; delete copy.trail;
        copy.docNo = Store.nextDocNo((mod.docPrefix || 'DOC') + '-REV');
        copy.status = 'approved';
        copy.reversalOf = rec.id;
        copy.isReversal = true;
        copy.notes = (copy.notes ? copy.notes + ' | ' : '') +
          (I18N.getLang() === 'ar' ? 'مستند عكسي لـ ' + rec.docNo : 'Reversal of ' + rec.docNo);
        /* flip every money value */
        negateAmounts(mod, copy);
        copy.approvedBy = u.id; copy.approvedAt = now; copy.postedAt = now;
        copy.trail = [{ action: 'reverse-create', userId: u.id, userName: u.name, at: now, note: reason }];
        Store.create(mod.table, copy);

        patch.status = 'reversed';
        patch.reversedBy = u.id; patch.reversedAt = now; patch.reverseReason = reason;
        push('reverse', reason);
        break;

      default:
        return { ok: false, error: 'unknown' };
    }

    patch.trail = trail;
    var saved = Store.save(mod.table, recId, patch, { silent: true });
    Store.log('status', mod.table, recId, rec.docNo || recId, action + (reason ? ' — ' + reason : ''));
    return { ok: true, record: saved };
  }

  function negateAmounts(mod, rec) {
    mod.fields.forEach(function (f) {
      if ((f.type === 'money' || f.type === 'calc') && typeof rec[f.name] === 'number') {
        rec[f.name] = -rec[f.name];
      }
    });
    ['subTotal', 'grandTotal', 'totalDebit', 'totalCredit', 'netTotal', 'netDue', 'amount'].forEach(function (k) {
      if (typeof rec[k] === 'number') rec[k] = -Math.abs(rec[k]) === rec[k] ? Math.abs(rec[k]) : -rec[k];
    });
    if (Array.isArray(rec.lines)) {
      rec.lines = rec.lines.map(function (l) {
        var c = Object.assign({}, l);
        ['qty', 'debit', 'credit', 'lineTotal', 'qtyReceived', 'qtyAccepted', 'qtyRejected'].forEach(function (k) {
          if (typeof c[k] === 'number') c[k] = -c[k];
        });
        return c;
      });
    }
  }

  /* Documents waiting on the current user */
  function inbox() {
    var u = Auth.current();
    var out = { toReview: [], toApprove: [], mine: [] };
    if (!u) return out;

    Schema.MODULES.forEach(function (mod) {
      if (!mod.workflow) return;
      var rows = Store.all(mod.table);
      rows.forEach(function (r) {
        var item = { module: mod, record: r };
        if (r.status === 'pending' && Auth.can(mod.id, 'review') && r.createdBy !== u.id) out.toReview.push(item);
        else if (r.status === 'reviewed' && Auth.can(mod.id, 'approve') && r.createdBy !== u.id && r.reviewedBy !== u.id) out.toApprove.push(item);
        else if ((r.status === 'returned' || r.status === 'rejected') && r.createdBy === u.id) out.mine.push(item);
      });
    });
    return out;
  }

  function inboxCount() {
    var i = inbox();
    return i.toReview.length + i.toApprove.length + i.mine.length;
  }

  /* Human-readable trail for the detail view */
  function trailHTML(rec) {
    var trail = (rec && rec.trail) || [];
    if (!trail.length) {
      return '<p class="muted small">' + (I18N.getLang() === 'ar' ? 'لم يبدأ مسار الاعتماد بعد.' : 'The approval trail has not started yet.') + '</p>';
    }
    var names = {
      submit: t('wf.submit'), review: t('wf.review'), approve: t('wf.approve'),
      reject: t('wf.reject'), 'return': t('wf.return'), reverse: t('wf.reverse'),
      'reverse-create': t('wf.reverse')
    };
    var html = '<div class="timeline">';
    trail.forEach(function (s, i) {
      var cls = s.action === 'reject' ? 'rejected' : (i === trail.length - 1 ? 'current' : 'done');
      html += '<div class="tl-item ' + cls + '">' +
        '<div class="tl-title">' + (names[s.action] || s.action) + '</div>' +
        '<div class="tl-meta">' + t('wf.by') + ' <strong>' + UI.esc(s.userName) + '</strong> — ' + I18N.dateTime(s.at) + '</div>' +
        (s.note ? '<div class="tl-meta">« ' + UI.esc(s.note) + ' »</div>' : '') +
        '</div>';
    });
    return html + '</div>';
  }

  global.Workflow = {
    STATES: STATES, label: label, badgeClass: badgeClass, badgeHTML: badgeHTML,
    isLocked: isLocked, isPosted: isPosted, actions: actions, transition: transition,
    inbox: inbox, inboxCount: inboxCount, trailHTML: trailHTML
  };
})(window);
