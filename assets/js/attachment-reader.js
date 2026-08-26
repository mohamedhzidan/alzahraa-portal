/* =========================================================================
   attachment-reader.js — زر «اقرأ المحتوى» على كل ملف مرفق
                          The "read contents" button on every attached file
   =========================================================================

   بالكلام العادي · IN PLAIN WORDS

     اليوم: تفتح مستنداً، ترى الملفات المرفقة به، وتستطيع تنزيلها فقط.
     بعد هذا الملف: يظهر بجانب كل ملف يمكن قراءته زر «اقرأ المحتوى». تضغطه
     فتُفتح نافذة تعرض ما بداخل الملف — نص خطاب وورد، أو صور صفحات ملف PDF
     مع نصّها بجانبها، أو الصورة المصغّرة لرسمة أوتوكاد. وإن أردت، تحفظ
     النص مع المستند فيبقى ويمكن الرجوع إليه دون فتح الملف مرة أخرى.

     Today you open a record, see its attached files, and can only download
     them. After this file, a "read contents" button appears beside every
     readable one. It opens a window showing what is inside — a Word letter's
     text, a PDF's page pictures with their text beside them, or an AutoCAD
     drawing's thumbnail. You may then save the text with the record, so it
     is there later without opening the file again.

   ⚠️ القاعدة التي لا تُكسر · THE RULE THAT IS NEVER BROKEN

     **لا يُكتب أي نص مستخرج في أي خانة تلقائياً.** يُعرض ليقرأه إنسان
     ويقارنه بصورة الصفحة، وهو الذي ينسخ ما يتأكد منه. سبب ذلك مشروح كاملاً
     في read-pdf.js: النص العربي يخرج من ملفات PDF مقلوباً أحياناً بينما
     الصفحة تبدو سليمة، فالملء التلقائي يُنتج أرقاماً خاطئة بصمت.

     No extracted text is ever auto-written into any field. It is shown for a
     person to read against the page picture, and they copy what they
     confirm. Full reason in read-pdf.js.

   لماذا لا يُعدَّل attachments.js إطلاقاً · WHY attachments.js IS NOT TOUCHED

     كانت الخطة الأولى أن يُضاف «خطّاف» بخمسة أسطر داخل attachments.js، لأن
     لفّ دالته العامة لا يعمل — فهو ينادي نسخته الداخلية لا العامة، وهذا
     بالضبط عطل «trade / trades» الذي كلّف ست ساعات: كود يمرّ على كل
     الاختبارات والشاشة لا تتحرك.

     لكن اتضح وجود طريق أنظف: هذا الملف يلفّ EntityPage.openDetail بنفسه —
     تماماً كما يفعل attachments.js — ثم يراقب ظهور اللوحة ويضيف أزراره على
     صفوفها الموجودة. فلا يُغيَّر حرف واحد في attachments.js، **وحذف هذا
     الملف وحده يعيد كل شيء إلى ما كان عليه بالضبط.**

     The first plan was a 5-line hook inside attachments.js, because wrapping
     its public function does not work — it calls its own internal copy, the
     exact trade/trades failure that cost six hours: code that passes every
     test while the screen never moves. A cleaner route exists: this file
     wraps EntityPage.openDetail itself, the same way attachments.js does,
     watches for the panel, and decorates the rows already there. Not one
     character of attachments.js changes, and deleting THIS file alone
     restores the previous behaviour exactly.
   ========================================================================= */

(function (global) {
  'use strict';

  var OVERLAY_ID = 'azReaderOverlay';
  var TABLE      = 'attachment_text';
  var busy       = false;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o)   { return isAr() ? o.ar : o.en; }
  function esc(s) { return global.UI ? UI.esc(s) : String(s == null ? '' : s); }
  function client(){ return global.Auth && Auth.client && Auth.client(); }
  function me()   { return (global.Auth && Auth.current && Auth.current()) || null; }
  function toast(m, k) { if (global.UI && UI.toast) UI.toast(m, k || 'info'); }

  function extOf(name) {
    var i = String(name || '').lastIndexOf('.');
    return i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
  }

  /* أي الصيغ لها قارئ محمَّل فعلاً · which formats actually have a reader loaded */
  function readerFor(fileName) {
    var e = extOf(fileName);
    if (e === 'docx' && global.ReadDocx) return { kind: 'docx', mod: global.ReadDocx };
    if (e === 'pdf'  && global.ReadPdf)  return { kind: 'pdf',  mod: global.ReadPdf  };
    if (e === 'dwg'  && global.ReadDwg)  return { kind: 'dwg',  mod: global.ReadDwg  };
    if (e === 'doc'  && global.ReadDocx) return { kind: 'refuse-doc', mod: global.ReadDocx };
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · إضافة الأزرار إلى لوحة المرفقات القائمة
        Decorate the existing attachments panel
     ═══════════════════════════════════════════════════════════════════ */
  async function decorate(moduleId, recordId) {
    var section = document.getElementById('azAttachSection');
    if (!section || section.getAttribute('data-az-reader') === '1') return;
    section.setAttribute('data-az-reader', '1');

    var files = [];
    try { files = (global.Attachments && await Attachments.list(moduleId, recordId)) || []; }
    catch (e) { return; }
    if (!files.length) return;

    var byPath = {};
    files.forEach(function (f) { byPath[f.path] = f; });

    var rows = section.querySelectorAll('[data-az-open]');
    for (var i = 0; i < rows.length; i++) {
      (function (openBtn) {
        var f = byPath[openBtn.getAttribute('data-az-open')];
        if (!f) return;
        var r = readerFor(f.fileName);
        if (!r) return;

        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'row-btn';
        b.setAttribute('data-az-read', f.id);
        b.textContent = '👁';
        b.title = L({ ar: 'اقرأ المحتوى', en: 'Read contents' });
        b.style.marginInlineEnd = '4px';
        b.onclick = function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          openReader(f, moduleId, recordId, r);
        };
        openBtn.parentNode.insertBefore(b, openBtn);
      })(rows[i]);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · جلب الملف وقراءته
        Fetch the file and read it
     ═══════════════════════════════════════════════════════════════════ */
  async function fetchBlob(path) {
    var url = global.Attachments && await Attachments.signedUrl(path);
    if (!url) throw new Error(L({ ar: 'تعذّر إنشاء رابط للملف.', en: 'Could not create a link to the file.' }));
    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.blob();
  }

  async function openReader(file, moduleId, recordId, r) {
    if (busy) return;
    busy = true;

    if (r.kind === 'refuse-doc') {
      busy = false;
      var msg = ReadDocx.refusalFor(file.fileName);
      return showOverlay(file, '<div class="alert warn" style="padding:14px;line-height:1.9">' +
        esc(L(msg)) + '</div>', null, moduleId, recordId, null);
    }

    showOverlay(file, '<p class="muted" id="azReadProgress" style="padding:24px;text-align:center">' +
      esc(L({ ar: 'جارٍ فتح الملف… أول مرة تستغرق وقتاً أطول لأن أداة القراءة تُنزَّل مرة واحدة فقط.',
              en: 'Opening the file… the first time takes longer because the reader downloads once.' })) +
      '</p>', null, moduleId, recordId, null);

    try {
      var blob = await fetchBlob(file.path);
      var out;
      if (r.kind === 'docx') out = await ReadDocx.read(blob, file.fileName);
      else if (r.kind === 'pdf') out = await ReadPdf.read(blob, file.fileName, function (done, total) {
        var p = document.getElementById('azReadProgress');
        if (p) p.textContent = L({ ar: 'جارٍ قراءة الصفحة ', en: 'Reading page ' }) + done +
                               L({ ar: ' من ', en: ' of ' }) + total + '…';
      });
      else out = await ReadDwg.read(blob, file.fileName);

      showOverlay(file, renderBody(out, r.kind), out, moduleId, recordId, r.kind);
    } catch (e) {
      var m = (e && e.userMessage) ? L(e.userMessage)
            : L({ ar: 'تعذّرت قراءة هذا الملف: ', en: 'Could not read this file: ' }) + (e && e.message ? e.message : '');
      showOverlay(file, '<div class="alert error" style="padding:14px;line-height:1.9">' + esc(m) +
        '</div>', null, moduleId, recordId, null);
      console.error('[attachment-reader]', e);
    } finally {
      busy = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · رسم المحتوى
        Render what was read
     ═══════════════════════════════════════════════════════════════════ */
  function arabicWarning(conf) {
    if (conf === 'none') return '';
    return '<div class="alert warn" style="padding:10px 12px;margin-bottom:12px;line-height:1.8">' +
      '⚠️ ' + esc(L({
        ar: 'النص العربي المستخرج من ملفات PDF قد يخرج بترتيب حروف خاطئ حتى لو بدت الصفحة سليمة. ' +
            'قارنه بصورة الصفحة قبل نسخ أي رقم منه. لا يُكتب أي شيء من هنا في أي خانة تلقائياً.',
        en: 'Arabic pulled out of a PDF can come out in the wrong letter order even when the page ' +
            'looks perfect. Compare it against the page picture before copying any number. Nothing ' +
            'here is written into any field automatically.'
      })) + '</div>';
  }

  function renderBody(out, kind) {
    if (kind === 'dwg') return renderDwg(out);
    if (kind === 'pdf') return renderPdf(out);
    return renderDocx(out);
  }

  function renderDocx(out) {
    if (!out.text) {
      return '<p class="muted" style="padding:20px">' + esc(L({
        ar: 'الملف مفتوح لكنه لا يحتوي نصاً.', en: 'The file opened but holds no text.' })) + '</p>';
    }
    return '<div style="padding:4px">' +
      (out.meta.arabicRepairApplied ? arabicWarning(out.meta.arabicConfidence) : '') +
      '<div class="card" style="padding:14px;white-space:pre-wrap;line-height:2;max-height:60vh;overflow:auto" ' +
      'id="azReadText" dir="auto">' + esc(out.text) + '</div></div>';
  }

  function renderDwg(out) {
    var v = out.meta;
    var head = '<div class="card" style="padding:12px;margin-bottom:12px;line-height:2">' +
      '<strong>' + esc(L({ ar: 'رسمة أوتوكاد', en: 'AutoCAD drawing' })) + '</strong><br>' +
      esc(L({ ar: 'الإصدار: ', en: 'Version: ' })) + esc(isAr() ? v.versionAr : v.versionEn) +
      ' <span class="muted">(' + esc(v.version || '?') + ')</span></div>';

    if (out.previewFound) {
      return '<div style="padding:4px">' + head +
        '<div style="text-align:center;background:#f4f4f4;padding:16px;border-radius:8px">' +
        '<img src="' + out.image + '" alt="" style="max-width:100%;image-rendering:auto;border:1px solid #ddd;background:#fff">' +
        '</div><p class="muted small" style="margin-top:8px">' + esc(L({
          ar: 'هذه الصورة المصغّرة المحفوظة داخل الرسمة نفسها. تكفي لمعرفة أي رسمة هي، ولا تكفي لقراءة خانة العنوان. ' +
              'الملف الأصلي محفوظ كما هو ويُفتح بالأوتوكاد.',
          en: 'This is the thumbnail stored inside the drawing itself. Enough to tell which drawing it is, ' +
              'not enough to read a title block. The original file is stored as it is and opens in AutoCAD.'
        })) + '</p></div>';
    }
    return '<div style="padding:4px">' + head +
      '<div class="alert warn" style="padding:14px;line-height:1.9">' +
      esc(L(ReadDwg.noPreviewMessage())) + '</div></div>';
  }

  function renderPdf(out) {
    var h = '<div style="padding:4px">';
    if (out.looksScanned) {
      h += '<div class="alert warn" style="padding:12px;margin-bottom:12px;line-height:1.9">' +
        esc(L({ ar: 'هذا الملف صور ممسوحة ضوئياً ولا يحتوي نصاً يمكن استخراجه. صور الصفحات تظهر أدناه. ' +
                    'قراءة الورق الممسوح تحتاج أداة أخرى، وهي مؤجّلة بقرار.',
                en: 'This file is scanned images and holds no extractable text. The page pictures are below. ' +
                    'Reading scanned paper needs a different tool, deliberately parked for now.' })) + '</div>';
    } else {
      h += arabicWarning(out.meta.arabicConfidence);
    }

    if (out.meta.truncated) {
      h += '<p class="muted small">' + esc(L({ ar: 'ملف كبير — عُرضت ', en: 'Large file — showing ' }) +
        out.meta.pagesRead + L({ ar: ' صفحة من ', en: ' of ' }) + out.meta.pageCount + '.') + '</p>';
    }

    h += '<div style="display:grid;grid-template-columns:1fr;gap:14px;max-height:62vh;overflow:auto" id="azReadPages">';
    out.pages.forEach(function (p) {
      h += '<div class="card" style="padding:10px">' +
        '<div class="muted small" style="margin-bottom:6px">' +
          esc(L({ ar: 'صفحة ', en: 'Page ' })) + p.number + '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">' +
          (p.image
            ? '<img src="' + p.image + '" alt="" style="flex:1 1 300px;max-width:100%;border:1px solid #ddd;border-radius:4px">'
            : '') +
          '<div dir="auto" style="flex:1 1 300px;white-space:pre-wrap;line-height:2;min-width:220px">' +
            esc(repairPage(p.rawText)) + '</div>' +
        '</div></div>';
    });
    h += '</div></div>';
    return h;
  }

  function repairPage(raw) {
    if (!global.ArabicText) return raw;
    var r = ArabicText.repair(raw);
    return r.text;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · النافذة — طبقة خاصة بها، لا UI.modal
        The window — its own layer, deliberately NOT UI.modal

        UI.modal يستبدل محتوى #modalBody، وهو نفسه المكان الذي تعيش فيه
        شاشة المستند ولوحة المرفقات. فاستعماله هنا كان سيمسح الشاشة التي
        فُتح منها القارئ. لذلك طبقة مستقلة فوقها.

        UI.modal replaces #modalBody, which is exactly where the record
        screen and the attachments panel live — using it here would wipe out
        the screen the reader was opened from. Hence a separate layer above.
     ═══════════════════════════════════════════════════════════════════ */
  function closeOverlay() {
    var o = document.getElementById(OVERLAY_ID);
    if (o) o.remove();
    document.removeEventListener('keydown', onEsc);
  }
  function onEsc(e) { if (e.key === 'Escape') closeOverlay(); }

  function showOverlay(file, bodyHtml, out, moduleId, recordId, kind) {
    closeOverlay();
    var o = document.createElement('div');
    o.id = OVERLAY_ID;
    o.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    o.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:16px';

    var canSave = out && out.text && global.Auth &&
                  (Auth.can(moduleId, 'edit') || Auth.can(moduleId, 'create'));

    o.innerHTML =
      '<div class="modal wide" style="max-width:1100px;width:100%;max-height:92vh;display:flex;' +
        'flex-direction:column;background:var(--card,#fff);border-radius:10px;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e5e5e5">' +
          '<strong style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc(file.fileName) + '</strong>' +
          '<button type="button" class="btn btn-outline btn-sm" data-az-close>✕</button>' +
        '</div>' +
        '<div style="flex:1;overflow:auto;padding:14px 16px">' + bodyHtml + '</div>' +
        '<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e5e5e5;flex-wrap:wrap">' +
          (out && out.alternativeText
            ? '<button type="button" class="btn btn-outline btn-sm" data-az-swap>🔁 ' +
              esc(L({ ar: 'الترتيب يبدو معكوساً — جرّب القراءة الأخرى',
                      en: 'Order looks wrong — try the other reading' })) + '</button>' : '') +
          (canSave
            ? '<button type="button" class="btn btn-primary btn-sm" data-az-save>💾 ' +
              esc(L({ ar: 'احفظ النص مع المستند', en: 'Save the text with the record' })) + '</button>' : '') +
          '<span style="flex:1"></span>' +
          '<button type="button" class="btn btn-outline btn-sm" data-az-close>' +
            esc(L({ ar: 'إغلاق', en: 'Close' })) + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(o);
    document.addEventListener('keydown', onEsc);

    o.addEventListener('click', function (e) { if (e.target === o) closeOverlay(); });
    Array.prototype.forEach.call(o.querySelectorAll('[data-az-close]'), function (b) {
      b.onclick = closeOverlay;
    });

    var swap = o.querySelector('[data-az-swap]');
    if (swap) {
      var showingAlt = false;
      swap.onclick = function () {
        showingAlt = !showingAlt;
        var t = document.getElementById('azReadText');
        if (t) t.textContent = showingAlt ? out.alternativeText : out.text;
        swap.textContent = showingAlt
          ? '🔁 ' + L({ ar: 'ارجع للقراءة الأولى', en: 'Back to the first reading' })
          : '🔁 ' + L({ ar: 'الترتيب يبدو معكوساً — جرّب القراءة الأخرى',
                        en: 'Order looks wrong — try the other reading' });
      };
    }

    var saveBtn = o.querySelector('[data-az-save]');
    if (saveBtn) {
      saveBtn.onclick = async function () {
        saveBtn.disabled = true;
        saveBtn.textContent = L({ ar: 'جارٍ الحفظ…', en: 'Saving…' });
        try {
          var id = await saveText(file, moduleId, recordId, out, kind);
          toast(L({ ar: 'تم الحفظ وتأكيده من الخادم · ', en: 'Saved and confirmed by the server · ' }) + id, 'success');
          closeOverlay();
        } catch (e) {
          console.error('[attachment-reader] save', e);
          toast(L({ ar: 'لم يُحفظ: ', en: 'Not saved: ' }) + (e && e.message ? e.message : ''), 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 ' + L({ ar: 'احفظ النص مع المستند', en: 'Save the text with the record' });
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · الحفظ — ويُؤكَّد من الخادم بالرقم، لا بالصمت
        Saving — confirmed against the server BY ID, never by silence

        HISTORY.md رقم ٧: إدراج مسموح به وقراءته ممنوعة يُرجع لا خطأ ولا
        صفوفاً، ويُعامَل كنجاح كامل. لذلك نطلب الصف بعد الكتابة ونتحقق أنه
        عاد فعلاً. «تم الحفظ» وحدها لا تكفي في هذا المشروع.
     ═══════════════════════════════════════════════════════════════════ */
  async function saveText(file, moduleId, recordId, out, kind) {
    var c = client();
    if (!c) throw new Error(L({ ar: 'لا يوجد اتصال بالخادم.', en: 'No connection to the server.' }));
    var u = me();
    var now = new Date().toISOString();
    var id = 'atx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    var row = {
      id: id,
      attachmentId: file.id,
      module: moduleId,
      recordId: recordId,
      site: file.site || (u && u.site) || null,
      source: kind === 'refuse-doc' ? 'docx' : kind,
      pages: (out.meta && out.meta.pageCount) || null,
      textContent: out.text || '',
      meta: out.meta || {},
      arabicRepair: (out.meta && out.meta.arabicConfidence) || 'none',
      extractedAt: now,
      extractedBy: u ? u.id : null,
      deleted: false,
      createdAt: now,
      createdBy: u ? u.id : null,
      updatedAt: now,
      updatedBy: u ? u.id : null
    };

    var ins = await c.from(TABLE).upsert(row, { onConflict: 'attachmentId,source' }).select('id').single();
    if (ins.error) throw new Error(ins.error.message || 'insert refused');

    /* التأكيد: اسأل الخادم عن الصف بالرقم · confirm by asking for it back */
    var back = await c.from(TABLE).select('id').eq('attachmentId', file.id).eq('source', row.source).maybeSingle();
    if (back.error || !back.data || !back.data.id) {
      throw new Error(L({
        ar: 'الخادم قَبِل الكتابة ولم يُعِد الصف. غالباً لم يُشغَّل ملف قاعدة البيانات ٣٢ بعد.',
        en: 'The server accepted the write but did not return the row. Most likely database file 32 has not been run yet.'
      }));
    }
    return back.data.id;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · التركيب — بلا لمس attachments.js
        Install — without touching attachments.js
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.EntityPage || EntityPage.__azReaderInstalled) return;
    var orig = EntityPage.openDetail;

    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      watchFor(moduleId, id);
    };
    EntityPage.__azReaderInstalled = true;
  }

  /* لوحة المرفقات تُحقن بعد تأخير، وتُعاد بناؤها بعد كل رفع أو حذف.
     نراقب #modalBody فنلحق بها في الحالتين دون تعديل أي ملف آخر.
     The panel is injected after a delay and rebuilt after every upload or
     delete. Watching #modalBody catches both without changing any file. */
  var mo = null;
  function watchFor(moduleId, recordId) {
    if (mo) { mo.disconnect(); mo = null; }
    var body = document.getElementById('modalBody');
    if (!body) return;
    var tries = 0;
    mo = new MutationObserver(function () {
      if (++tries > 400) { mo.disconnect(); mo = null; return; }
      if (document.getElementById('azAttachSection')) decorate(moduleId, recordId);
    });
    mo.observe(body, { childList: true, subtree: true });
    setTimeout(function () { decorate(moduleId, recordId); }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  setTimeout(install, 1600);   /* لو حُمِّل entity.js بعدنا */

  global.AttachmentReader = {
    decorate: decorate,
    openReader: openReader,
    readerFor: readerFor,
    saveText: saveText,
    closeOverlay: closeOverlay,
    TABLE: TABLE
  };

  console.info('attachment-reader.js ready — "read contents" appears on Word, PDF and DWG attachments. ' +
               'attachments.js is untouched; deleting this file restores the old behaviour exactly.');
})(window);
