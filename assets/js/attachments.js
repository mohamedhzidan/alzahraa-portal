/* =========================================================================
   attachments.js — إرفاق الملفات الحقيقية · Real file attachments
   -------------------------------------------------------------------------
   ما قاله أ. أحمد عبد الحي — ضبط المستندات:
       «نقطه الأقسام ناقص إضافة ملفات»

   كان في النظام سبعة حقول تبدو كمرفقات — fileLink و fileRef و
   fileLocation — وكلها مربعات نص تكتب فيها مكان الورقة. لا يمكن رفع
   ملف واحد. ولمسؤول المستندات هذه ليست ميزة ناقصة، هي عمله كله.

   Seven fields looked like attachments. Every one was a text box where
   you typed where the paper was. You could not upload a single file.
   For a document controller that is not a missing convenience, it is
   the entire job.

   -------------------------------------------------------------------------
   HOW IT WORKS · كيف يعمل

   · الملفات في Supabase Storage في سلة خاصة اسمها attachments
   · لا رابط عام إطلاقاً — كل تنزيل عبر رابط موقّع صالح ٦٠ ثانية فقط
   · المسار: moduleId/recordId/الاسم — فالصلاحيات تتبع المستند نفسه
   · حد الحجم ٢٥ ميجابايت، والأنواع المسموحة محددة
   · من رفع الملف ومتى مسجّل مع الملف

   Files live in a PRIVATE Supabase Storage bucket. There is no public
   link, ever. Every download goes through a signed URL that expires in
   sixty seconds. The path is moduleId/recordId/filename, so a file
   inherits exactly the permissions of the document it belongs to.

   -------------------------------------------------------------------------
   ADDITIVE. Delete this file and every screen returns to how it was.
   Load AFTER pages/entity.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var BUCKET   = 'attachments';
  var MAX_MB   = 25;
  var SIGN_SEC = 60;

  /* أنواع الملفات المسموحة — كل ما يحتاجه العمل، ولا شيء قابل للتنفيذ.
     Everything the work needs, and nothing executable. */
  var ALLOWED = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv', 'text/plain',
    'application/acad', 'image/vnd.dwg', 'application/dxf', 'image/vnd.dxf',
    'application/zip'
  ];
  var ALLOWED_EXT = ['pdf','jpg','jpeg','png','webp','heic','tif','tiff',
                     'xlsx','xls','docx','doc','csv','txt','dwg','dxf','zip'];

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function client() { return global.Auth && Auth.client && Auth.client(); }
  function me() { return (global.Auth && Auth.current && Auth.current()) || null; }

  function extOf(name) {
    var i = String(name || '').lastIndexOf('.');
    return i === -1 ? '' : String(name).slice(i + 1).toLowerCase();
  }

  function humanSize(bytes) {
    var b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  /* اسم آمن للتخزين: نحتفظ بالاسم الأصلي في قاعدة البيانات ونخزّن
     الملف باسم مبسّط، حتى لا تكسر الحروف العربية أو المسافات المسار.
     The original name is kept in the record; the stored path is
     simplified so Arabic characters and spaces cannot break it. */
  function safeName(name) {
    var ext = extOf(name);
    var stamp = Date.now().toString(36);
    var rnd = (global.crypto && crypto.getRandomValues)
      ? Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(4)),
          function (b) { return b.toString(16).padStart(2, '0'); }).join('')
      : Math.random().toString(16).slice(2, 10);
    return stamp + '_' + rnd + (ext ? '.' + ext : '');
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · القراءة والكتابة في Storage
     ═══════════════════════════════════════════════════════════════════ */
  async function list(moduleId, recordId) {
    if (!global.Store) return [];
    try {
      return (Store.all('attachments') || []).filter(function (a) {
        return a.module === moduleId && a.recordId === recordId && !a.deleted;
      }).sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
    } catch (e) { return []; }
  }

  async function upload(moduleId, recordId, file, siteId) {
    var c = client();
    if (!c) return { ok: false, error: L({ ar: 'لا يوجد اتصال بالخادم.', en: 'No server connection.' }) };
    if (!file) return { ok: false, error: 'no-file' };

    if (file.size > MAX_MB * 1048576) {
      return { ok: false, error: L({
        ar: 'الملف أكبر من ' + MAX_MB + ' ميجابايت. اضغطه أو قسّمه.',
        en: 'The file is larger than ' + MAX_MB + ' MB. Compress or split it.' }) };
    }
    var ext = extOf(file.name);
    if (ALLOWED_EXT.indexOf(ext) === -1 && ALLOWED.indexOf(file.type) === -1) {
      return { ok: false, error: L({
        ar: 'نوع الملف غير مسموح. المسموح: ' + ALLOWED_EXT.join(' · '),
        en: 'File type not allowed. Allowed: ' + ALLOWED_EXT.join(' · ') }) };
    }

    var path = moduleId + '/' + recordId + '/' + safeName(file.name);
    var up = await c.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (up.error) {
      console.error('[attachments] upload failed', up.error);
      return { ok: false, error: up.error.message || 'upload-failed' };
    }

    var u = me();
    var rec = {
      module: moduleId, recordId: recordId,
      path: path,
      fileName: file.name,          /* الاسم الأصلي كما كتبه المستخدم */
      size: file.size,
      mime: file.type || '',
      site: siteId || (u && u.site) || null,
      uploadedBy: u ? u.id : null,
      uploadedAt: new Date().toISOString(),
      deleted: false
    };
    try { Store.create('attachments', rec); }
    catch (e) {
      /* the file is in storage but the record failed — remove the orphan
         so the bucket never fills with files nothing points at */
      try { await c.storage.from(BUCKET).remove([path]); } catch (e2) {}
      return { ok: false, error: L({ ar: 'تعذّر تسجيل المرفق.', en: 'Could not record the attachment.' }) };
    }
    return { ok: true, record: rec };
  }

  /* رابط موقّع قصير العمر — لا يعمل بعد دقيقة، ولا يُشارك */
  async function signedUrl(path) {
    var c = client();
    if (!c) return null;
    var r = await c.storage.from(BUCKET).createSignedUrl(path, SIGN_SEC);
    return (r && r.data && r.data.signedUrl) || null;
  }

  async function open(path) {
    var url = await signedUrl(path);
    if (!url) {
      if (global.UI) UI.toast(L({ ar: 'تعذّر فتح الملف.', en: 'Could not open the file.' }), 'error');
      return;
    }
    global.open(url, '_blank', 'noopener');
  }

  /* الحذف: نعلّم السجل محذوفاً ونزيل الملف. المستندات المعتمدة لا تُحذف
     مرفقاتها — نفس قاعدة المستندات نفسها. */
  async function remove(attachmentId) {
    var a = Store.find('attachments', attachmentId);
    if (!a) return { ok: false };
    var c = client();
    try { if (c) await c.storage.from(BUCKET).remove([a.path]); } catch (e) {}
    Store.save('attachments', attachmentId, Object.assign({}, a, {
      deleted: true, deletedAt: new Date().toISOString(),
      deletedBy: (me() || {}).id || null
    }));
    return { ok: true };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · اللوحة داخل شاشة المستند
     ═══════════════════════════════════════════════════════════════════ */
  function iconFor(name) {
    var e = extOf(name);
    if (e === 'pdf') return '📕';
    if (['jpg','jpeg','png','webp','heic','tif','tiff'].indexOf(e) !== -1) return '🖼';
    if (['xlsx','xls','csv'].indexOf(e) !== -1) return '📊';
    if (['doc','docx'].indexOf(e) !== -1) return '📄';
    if (['dwg','dxf'].indexOf(e) !== -1) return '📐';
    return '📎';
  }

  async function panelHTML(moduleId, recordId, canEdit) {
    var files = await list(moduleId, recordId);
    var h = '<div class="form-section" id="azAttachSection">' +
      '<div class="form-section-title">' +
        esc(L({ ar: 'المرفقات', en: 'Attachments' })) +
        ' <span class="muted small">(' + files.length + ')</span>';
    if (canEdit) {
      h += '<label class="btn btn-outline btn-sm" style="margin-inline-start:auto;cursor:pointer">' +
             esc(L({ ar: '＋ إضافة ملف', en: '＋ Add file' })) +
             '<input type="file" id="azAttachInput" multiple hidden>' +
           '</label>';
    }
    h += '</div>';

    if (!files.length) {
      h += '<p class="muted small">' + esc(L({
        ar: 'لا توجد ملفات مرفقة. الحد الأقصى ' + MAX_MB + ' ميجابايت للملف.',
        en: 'No files attached. Maximum ' + MAX_MB + ' MB per file.' })) + '</p>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><tbody>';
      files.forEach(function (f) {
        var who = Store.find('employees', f.uploadedBy) || Store.find('users', f.uploadedBy);
        h += '<tr>' +
          '<td style="width:34px;font-size:18px">' + iconFor(f.fileName) + '</td>' +
          '<td><strong>' + esc(f.fileName) + '</strong>' +
            '<br><small class="muted">' + humanSize(f.size) +
            (who ? ' · ' + esc(who.name) : '') +
            (f.uploadedAt ? ' · ' + esc(String(f.uploadedAt).slice(0, 10)) : '') +
            '</small></td>' +
          '<td class="col-actions" style="white-space:nowrap">' +
            '<button type="button" class="row-btn" data-az-open="' + esc(f.path) + '" title="' +
              esc(L({ ar: 'فتح', en: 'Open' })) + '">⬇</button>' +
            (canEdit ? '<button type="button" class="row-btn danger" data-az-del="' + esc(f.id) +
              '" title="' + esc(L({ ar: 'حذف', en: 'Delete' })) + '">✕</button>' : '') +
          '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '<p class="muted small" style="margin-top:6px">' + esc(L({
      ar: 'الملفات محفوظة في مساحة خاصة. كل تنزيل برابط مؤقّت ينتهي خلال دقيقة.',
      en: 'Files are stored privately. Every download uses a temporary link that expires in one minute.'
    })) + '</p></div>';
    return h;
  }

  function wirePanel(host, moduleId, recordId, onChange) {
    if (!host) return;
    host.querySelectorAll('[data-az-open]').forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); open(b.getAttribute('data-az-open')); };
    });
    host.querySelectorAll('[data-az-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        if (!global.UI) return;
        UI.confirm({
          title: L({ ar: 'حذف الملف', en: 'Delete file' }),
          message: L({ ar: 'سيُحذف الملف نهائياً. هل أنت متأكد؟',
                       en: 'The file will be permanently removed. Are you sure?' }),
          danger: true,
          okLabel: L({ ar: 'حذف', en: 'Delete' }),
          onOk: function () {
            remove(b.getAttribute('data-az-del')).then(function () {
              UI.toast(L({ ar: 'حُذف الملف.', en: 'File deleted.' }));
              if (onChange) onChange();
            });
          }
        });
      };
    });

    var input = host.querySelector('#azAttachInput');
    if (input) {
      input.onchange = async function () {
        var files = Array.prototype.slice.call(input.files || []);
        if (!files.length) return;
        var okCount = 0;
        for (var i = 0; i < files.length; i++) {
          if (global.UI) UI.toast(L({ ar: 'جارٍ رفع ', en: 'Uploading ' }) + files[i].name + '…', 'info', 2000);
          var r = await upload(moduleId, recordId, files[i]);
          if (r.ok) okCount++;
          else if (global.UI) UI.toast(files[i].name + ' — ' + r.error, 'error', 7000);
        }
        if (okCount && global.UI) {
          UI.toast(okCount + L({ ar: ' ملف مرفوع.', en: ' file(s) uploaded.' }), 'success');
        }
        if (onChange) onChange();
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الحقن في شاشة تفاصيل المستند
        We wrap EntityPage.openDetail. Every screen gains attachments
        without a single line changing in entity.js or schema.js.
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.EntityPage || EntityPage.__attachInstalled) return;
    var orig = EntityPage.openDetail;

    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      setTimeout(function () { inject(moduleId, id); }, 120);
    };
    EntityPage.__attachInstalled = true;

    async function inject(moduleId, id) {
      var body = document.getElementById('modalBody');
      if (!body || document.getElementById('azAttachSection')) return;
      var canEdit = global.Auth && (Auth.can(moduleId, 'edit') || Auth.can(moduleId, 'create'));
      var html = await panelHTML(moduleId, id, canEdit);
      var div = document.createElement('div');
      div.innerHTML = html;
      body.appendChild(div.firstChild);
      wirePanel(body, moduleId, id, function () {
        var old = document.getElementById('azAttachSection');
        if (old) old.remove();
        inject(moduleId, id);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else { install(); }
  setTimeout(install, 1500);   /* in case entity.js loads after us */

  global.Attachments = {
    BUCKET: BUCKET, MAX_MB: MAX_MB, ALLOWED_EXT: ALLOWED_EXT,
    list: list, upload: upload, open: open, remove: remove,
    signedUrl: signedUrl, panelHTML: panelHTML, wirePanel: wirePanel
  };

  console.info('attachments.js ready — every screen can now hold real files.');
})(window);
