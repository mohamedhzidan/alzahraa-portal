/* =========================================================================
   attachment-delete-reason.js — سبب مكتوب قبل حذف أي مرفق
   A WRITTEN REASON BEFORE ANY ATTACHMENT IS DELETED
   -------------------------------------------------------------------------
   لماذا هذا الملف موجود · WHY THIS FILE EXISTS

   ملف قاعدة البيانات 63-PRIVATE-FILES-AND-DELETE-WITH-REASON.sql يجعل
   الخادم يرفض حذف أي مرفق بلا سبب مكتوب، ويقصر الحذف على من رفع الملف أو
   المدير العام أو المالك. لكن attachments.js لا يرسل سبباً إطلاقاً: دالته
   remove() تكتب deleted/deletedAt/deletedBy مباشرة على جدول attachments
   ولا تمرّ بـ Store.destroy — أي أن نافذة السبب الموجودة أصلاً في
   audit-trail.js (askCancel، خمسة أحرف على الأقل) لا تُفتح للمرفقات أبداً.

   النتيجة لو رُفع الملف ٦٣ وحده: أول ضغطة على ✕ تُرفض بالعربية، ولا يستطيع
   أحد حذف أي مرفق إطلاقاً. هذا الملف هو ما يجعل تشغيل الملف ٦٣ آمناً،
   والاثنان يُرفعان معاً في نفس الدفعة.

   File 63 in the database makes the server refuse to delete an attachment
   without a written reason, and limits deleting to the uploader, the GM and
   the owner. But attachments.js never sends a reason: its remove() writes
   deleted/deletedAt/deletedBy straight onto the attachments table and never
   goes through Store.destroy — so the reason dialog that already exists in
   audit-trail.js (askCancel, minimum five characters) never opens for an
   attachment.

   If SQL 63 shipped alone, the first press of ✕ would be refused in Arabic
   and NOBODY could delete an attachment at all. This file is what makes SQL
   63 safe to run; the two ship together.

   -------------------------------------------------------------------------
   كيف يعترض هذا الملف الزر دون لمس attachments.js
   HOW IT INTERCEPTS THE BUTTON WITHOUT TOUCHING attachments.js

   دالة remove() ودالة wirePanel داخل إغلاق attachments.js، وزرّ ✕ يُربط
   بالنداء المحلي remove(...) لا بـ Attachments.remove — فلفّ الصادرة
   العامة وحده لا يعترض الزر إطلاقاً (نفس فخّ upload() الموصوف في
   attachments.js نفسه). لذلك نلتقط الضغطة على مستوى document في «مرحلة
   الالتقاط» (capture) — وهي تسبق onclick الخاص بالزر — فنوقف الحدث ونتولّى
   نحن. ثم ننادي Attachments.remove المُصدَّرة (وهي نفس الدالة تماماً)، فتعمل
   كل حراساتها كما هي: المستند المعتمد، والاتصال، والملف غير الموجود.

   attachments.js's remove() and wirePanel live inside its closure, and the
   ✕ button is bound to the closure-local remove(...), not to
   Attachments.remove — so wrapping the public export alone would intercept
   nothing (the very trap attachments.js documents about upload()). We
   therefore catch the press on document in the CAPTURE phase, which runs
   before the button's own onclick, stop the event and take over. Then we
   call the exported Attachments.remove — the same function object — so every
   one of its guards still runs: approved parent, connection, missing row.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود زرّ ✕ إلى نافذة التأكيد
   القديمة بلا سبب، حرفياً كما كان. لا سطر واحد في attachments.js تغيّر.
   Delete this file and ✕ returns to the old confirm-without-a-reason dialog,
   exactly as it was. Not one line of attachments.js changed.
   يُحمَّل بعد attachments.js · Load AFTER attachments.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var MIN_REASON = 5;   /* نفس الحد في audit-trail.js:316 · same threshold as audit-trail.js:316 */

  /* ⭐ نصّ الرفض حرفاً بحرف كما يرفعه المشغّل في
     63-PRIVATE-FILES-AND-DELETE-WITH-REASON.sql:711 و:718. متطابقان عمداً
     حتى لا تقول الشاشة شيئاً ويقول الخادم شيئاً آخر عن نفس المنع.
     ⭐ The refusal sentences, letter for letter as the trigger raises them in
     63-PRIVATE-FILES-AND-DELETE-WITH-REASON.sql:711 and :718. Deliberately
     identical so the screen and the server never disagree about the same
     refusal. */
  var SAY_NO_REASON = 'لا يمكن حذف مرفق بدون كتابة سبب — اكتب السبب ثم أعد المحاولة.';
  var SAY_NOT_YOURS = 'حذف المرفق مسموح لمن رفعه أو للمدير العام أو المالك فقط.';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }
  function client() { return global.Auth && Auth.client && Auth.client(); }
  function me() { return (global.Auth && Auth.current && Auth.current()) || null; }
  function toast(msg, kind, ms) {
    if (global.UI && UI.toast) UI.toast(msg, kind, ms);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · من يُسمح له بالحذف — مرآة لقاعدة الخادم، لا حكم جديد
        WHO MAY DELETE — a mirror of the server's rule, never a new rule
     -------------------------------------------------------------------
     الحقيقة في قاعدة البيانات (المشغّل az_attach_delete_guard في الملف ٦٣،
     سطر ٧١٦-٧٢٠): من رفع الملف، أو دور admin، أو دور gm. نكرّر نفس الشرط
     هنا لسبب واحد: أن يعرف الموظف أنه ممنوع **قبل** أن يكتب سبباً كاملاً
     ثم يُرفض. الخادم يبقى هو الحَكَم — لو اختلفنا فرأيه هو الذي ينفذ.

     ⚠️ حالة واحدة يقول فيها المتصفح «مسموح» ويرفض الخادم بحق:
     az_user_id() تعيد null ما دام mustChangePassword مضبوطاً (الملف ٢٠،
     سطر ٧٥-٨٣)، فحتى الرافع نفسه يُرفض حتى يغيّر كلمته مرة واحدة. لا نخفي
     ذلك: رسالة الخادم نفسها تُعرض كما هي في القسم ٤.

     The truth lives in the database (az_attach_delete_guard in file 63,
     lines 716-720): the uploader, or role admin, or role gm. We repeat the
     condition here for one reason only — so a person is told they may not
     delete BEFORE they type out a full reason and get refused. The server
     stays the judge; if we ever disagree, its answer is the one that counts.

     ⚠️ One case where the browser says "allowed" and the server rightly
     refuses: az_user_id() returns null while mustChangePassword is still set
     (file 20, lines 75-83), so even the uploader is refused until the
     password is changed once. We do not hide that — the server's own
     sentence is shown verbatim in section 4.
     ═══════════════════════════════════════════════════════════════════ */
  function mayDelete(row) {
    var u = me();
    if (!u || !row) return false;
    if (u.role === 'admin' || u.role === 'gm') return true;
    /* uploadedBy يحمل Auth.current().id (attachments.js:231)، وaz_user_id()
       تعيد نفس users.id — فالمقارنة على نفس القيمة في الطرفين.
       uploadedBy holds Auth.current().id (attachments.js:231) and
       az_user_id() returns that same users.id — both sides compare the same
       value. */
    return !!(row.uploadedBy && row.uploadedBy === u.id);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · نافذة السبب — بنفس أسلوب audit-trail.js:289-338 (askCancel)
        THE REASON DIALOG — in the established style of askCancel
     ═══════════════════════════════════════════════════════════════════ */
  function askReason(row, onConfirm) {
    if (!global.UI || !UI.modal) return;

    UI.modal({
      title: L({ ar: 'حذف المرفق', en: 'Delete this attachment' }),
      body:
        '<div class="alert alert-warn">' + esc(L({
          ar: 'الملف نفسه لن يُمحى — يبقى محفوظاً على الخادم ويمكن استرجاعه. ' +
              'يختفي المرفق من القائمة فقط، ويُسجَّل باسمك وتاريخ اليوم وسببك ' +
              'في سجل المسؤولية، ولا يستطيع أحد تعديل ذلك السطر بعدها.',
          en: 'The file itself is NOT erased — it stays on the server and can be ' +
              'brought back. Only the entry disappears from the list, and your ' +
              'name, today\'s date and your reason are written into the ' +
              'accountability log, where nobody can edit that line afterwards.' })) + '</div>' +
        '<p><strong>' + esc(row.fileName || row.path || '') + '</strong></p>' +
        '<label class="field span-full"><span class="field-label">' +
          esc(L({ ar: 'سبب الحذف (إجباري)', en: 'Reason for deleting (required)' })) +
        '</span><textarea class="textarea" id="azAttachDelReason" rows="3"></textarea></label>' +
        '<div class="err-msg" id="azAttachDelErr" hidden></div>',
      buttons: [
        { label: L({ ar: 'تراجع', en: 'Back' }), cls: 'btn-ghost' },
        { label: L({ ar: 'حذف المرفق وتسجيل السبب', en: 'Delete it and record the reason' }),
          cls: 'btn-danger', keepOpen: true,
          onClick: function () {
            var box = document.getElementById('azAttachDelReason');
            var err = document.getElementById('azAttachDelErr');
            var reason = box ? String(box.value || '').trim() : '';

            /* الحدّ الأدنى هنا يطابق نافذة إلغاء المستند (خمسة أحرف). الخادم
               يرفض الفراغ وحده، لكن «.» ليس سبباً يقرأه أحد بعد شهور.
               The minimum matches the cancel-document dialog (five
               characters). The server only refuses an empty string, but "."
               is not a reason anyone can read months later. */
            if (reason.length < MIN_REASON) {
              if (err) {
                err.textContent = L({
                  ar: 'اكتب سبباً واضحاً — سيقرأه من يراجع بعد شهور.',
                  en: 'Write a clear reason — someone will read it months from now.' });
                err.hidden = false;
              }
              return false;   /* keepOpen مع false = النافذة تبقى والسبب لا يضيع */
            }
            if (err) err.hidden = true;
            return onConfirm(reason, err);
          } }
      ],
      onOpen: function () {
        var b = document.getElementById('azAttachDelReason');
        if (b && b.focus) b.focus();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · إرسال السبب إلى العمود الذي ينتظره الخادم: "deleteReason"
        SENDING THE REASON TO THE COLUMN THE SERVER EXPECTS
     -------------------------------------------------------------------
     اسم العمود مقروء من الملف ٦٣ نفسه، لا مُخمَّناً:
       · القسم ١، سطر ٢٠٣: alter table public.attachments
                            add column if not exists "deleteReason" text;
       · المشغّل، سطر ٧١٠:  btrim(coalesce(new."deleteReason", '')) = ''
     وجدول attachments لم يكن يحمل هذا العمود قبل الملف ٦٣ (الملف ١٩ أضافه
     إلى ٥٥ جدولاً وليس هذا منها) — لذلك لا يعمل هذا الملف قبل تشغيل ٦٣،
     ولا يضرّ: عمود مجهول يجعل الخادم يرفض التحديث برسالة صريحة تُعرض كما هي.

     The column name was READ from file 63 itself, never guessed:
       · section 1, line 203:  add column if not exists "deleteReason" text
       · the trigger, line 710: btrim(coalesce(new."deleteReason",'')) = ''

     -------------------------------------------------------------------
     لماذا نلفّ نداء واحداً مؤقتاً بدل إعادة كتابة الحذف كاملاً:
     remove() في attachments.js تحمل حراسات لا يجوز أن يوجد لها توأم في
     ملف ثانٍ (المستند المعتمد، تعذّر قراءة حالة الأصل، الاتصال). فنُبقيها
     هي صاحبة العمل، ونعترض نداء التحديث الوحيد الذي ترسله على جدول
     attachments لنضيف السبب — ثم نُعيد العميل إلى حاله فوراً في finally.
     نسخ منطق الحذف هنا كان سيصنع «توأماً هشّاً»: سطرين في ملفين يجب أن
     يظلّا متطابقين إلى الأبد، وهو عطل كلّف هذا المشروع من قبل.

     WHY a single temporary wrap instead of rewriting the delete: remove()
     carries guards that must never have a twin in a second file (approved
     parent, unreadable parent status, connection). So it stays the one doing
     the work, and we intercept only the single update call it makes on the
     attachments table to add the reason — then put the client back exactly
     as it was in finally. Copying the delete logic here would create a
     "fragile twin", two lines in two files that must stay identical forever,
     a fault that has already cost this project once.
     ═══════════════════════════════════════════════════════════════════ */
  async function removeWithReason(attachmentId, reason) {
    var c = client();
    if (!c || typeof c.from !== 'function' || !global.Attachments ||
        typeof Attachments.remove !== 'function') {
      return { ok: false, error: L({ ar: 'لا يوجد اتصال بالخادم.',
                                     en: 'No server connection.' }) };
    }

    var origFrom = c.from;
    var hadOwnFrom = Object.prototype.hasOwnProperty.call(c, 'from');

    c.from = function (table) {
      var b = origFrom.apply(c, arguments);
      if (table !== 'attachments' || !b || typeof b.update !== 'function') return b;
      var origUpdate = b.update;
      b.update = function (patch) {
        /* لحظة الحذف وحدها — أي تحديث آخر يمرّ كما هو بلا لمس
           only the delete moment — every other update passes untouched */
        if (patch && patch.deleted === true) {
          var withReason = {};
          for (var k in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, k)) withReason[k] = patch[k];
          }
          withReason.deleteReason = String(reason || '');
          return origUpdate.call(b, withReason);
        }
        return origUpdate.apply(b, arguments);
      };
      return b;
    };

    try {
      /* ⚠️ نتيجة remove() تُعاد كما هي بلا أي فحص إضافي على الملف نفسه.
         الملف ٦٣ يمنع محو البايتات عمداً (سياسة az_keep_the_file، سطر
         ٦١٤-٦١٩) حتى يبقى الملف قابلاً للاسترجاع، وattachments.js يتجاهل
         نتيجة storage.remove أصلاً (سطر ٣٤٨، داخل try/catch بلا فحص خطأ).
         فرفض محو البايتات صحيح ومقصود — ولو حوّلناه إلى «فشل» لكذبت الشاشة
         على الموظف في كل عملية حذف ناجحة.
         ⚠️ remove()'s result is returned untouched, with no extra check on
         the file itself. File 63 deliberately blocks erasing the bytes
         (policy az_keep_the_file, lines 614-619) so the file stays
         recoverable, and attachments.js already ignores the result of
         storage.remove (line 348, inside a try/catch with no error check).
         That refusal is correct and intended — turning it into a "failure"
         would make the screen lie on every successful delete. */
      return await Attachments.remove(attachmentId);
    } finally {
      if (hadOwnFrom) c.from = origFrom;
      else { try { delete c.from; } catch (e) { c.from = origFrom; } }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · رسالة الرفض: كلام الخادم نفسه، لا «تعذّر الحفظ»
        THE REFUSAL: the server's own sentence, never "could not save"
     -------------------------------------------------------------------
     مشغّل الملف ٦٣ يرفع جملتين عربيتين مفهومتين، فنعرضهما كما هما. أما لو
     جاء رفض بلا حرف عربي واحد (سياسة صفوف تردّ بالإنجليزية مثلاً) فلا نتركه
     نصّاً إنجليزياً خامّاً على شاشة عربية — وهو عطل معروف هنا — بل نضع أمامه
     جملة عربية صريحة ونُبقي نصّ الخادم كاملاً بعدها.
     File 63's trigger raises two understandable Arabic sentences, so we show
     them as they are. But a refusal with no Arabic letter in it (a bare
     row-level-security line, say) is never left as raw English on an Arabic
     screen — a known failure here — so we put a plain Arabic sentence in
     front of it and keep the server's full text after it. */
  function serverSays(message) {
    var txt = String(message || '').trim();
    if (!txt) return L({ ar: 'رفض الخادم حذف المرفق بلا سبب معلن.',
                         en: 'The server refused the delete without stating a reason.' });
    if (/[؀-ۿ]/.test(txt)) return txt;
    return L({ ar: 'رفض الخادم حذف المرفق. رسالة الخادم: ' + txt,
               en: 'The server refused the delete. Server message: ' + txt });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · مسار الضغطة كاملاً
        THE WHOLE PRESS, START TO FINISH
     ═══════════════════════════════════════════════════════════════════ */
  async function start(attachmentId) {
    var c = client();
    /* نفس رسالة attachments.js:285 حرفياً — بلا اتصال لا شيء يُحذف
       the same sentence as attachments.js:285 — nothing is deleted offline */
    if (!c || navigator.onLine === false) {
      toast(L({ ar: 'حذف المرفق يحتاج اتصالاً بالإنترنت.',
                en: 'Deleting an attachment requires internet.' }), 'error', 6000);
      return;
    }

    /* نقرأ الصف من الخادم لا من الذاكرة — جدول attachments ليس شاشة فلا
       يحتفظ Store بصفوفه (attachments.js:92-101). ونحتاج uploadedBy لنعرف
       هل يُسمح لهذا الشخص أصلاً.
       Read the row from the server, not the cache — attachments is not a
       screen so Store holds none of its rows (attachments.js:92-101). We
       need uploadedBy to know whether this person may delete at all. */
    var got;
    try {
      got = await c.from('attachments')
        .select('id, path, fileName, uploadedBy, module, recordId')
        .eq('id', attachmentId).maybeSingle();
    } catch (e) {
      got = { error: e, data: null };
    }
    if (!got || got.error || !got.data) {
      /* لا نخمّن أن الحذف مسموح لأن القراءة فشلت — نفس مبدأ «الأب المجهول
         ليس دليل أمان» في attachments.js:296-321.
         A failed read is never taken as permission — the same "an unknown
         parent is not proof of safety" principle as attachments.js:296-321. */
      toast(L({ ar: 'تعذّر قراءة بيانات المرفق — لم يُحذف. ',
                en: 'Could not read the attachment — it was NOT deleted. ' }) +
            ((got && got.error && got.error.message) ? serverSays(got.error.message) : ''),
            'error', 7000);
      return;
    }

    var row = got.data;
    if (!mayDelete(row)) {
      /* يُقال له قبل أن يكتب حرفاً واحداً — لا بعد أن يكتب سبباً كاملاً
         told before typing a single letter, not after writing a full reason */
      toast(SAY_NOT_YOURS, 'error', 8000);
      return;
    }

    askReason(row, async function (reason, errBox) {
      var r = await removeWithReason(attachmentId, reason);
      if (r && r.ok) {
        if (global.UI && UI.closeModal) UI.closeModal();
        /* الصياغة تقول الحقيقة كاملة: الصف اختفى والملف باقٍ. لو قلنا
           «حُذف الملف نهائياً» لكانت الشاشة تكذب بعد الملف ٦٣.
           The wording tells the whole truth: the entry is gone and the file
           is kept. Saying "the file was permanently removed" would be a lie
           on the screen after file 63. */
        toast(L({ ar: 'حُذف المرفق من القائمة وسُجّل السبب باسمك. الملف نفسه محفوظ ويمكن استرجاعه.',
                  en: 'The attachment was removed from the list and your reason recorded. The file itself is kept and can be brought back.' }),
              'success', 6000);
        return true;
      }
      /* نُبقي النافذة مفتوحة بسببه المكتوب — إغلاقها يعني أن يكتبه مرة أخرى
         keep the dialog open with what they typed — closing it means typing
         the whole reason again */
      var msg = serverSays(r && r.error);
      if (errBox) { errBox.textContent = msg; errBox.hidden = false; }
      toast(msg, 'error', 9000);
      return false;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · الاعتراض — مرحلة الالتقاط على document
        THE INTERCEPT — capture phase on document
     -------------------------------------------------------------------
     مستمع واحد على document يكفي للوحة كلها ولكل إعادة رسم لها: attachments.js
     يعيد بناء اللوحة بعد كل تغيير ويعيد ربط onclick في كل مرة، ومستمعنا لا
     يتأثر بذلك إطلاقاً — بينما إعادة الربط على الأزرار نفسها كانت ستحتاج
     مراقبة الشاشة وتفوتها أول ضغطة بعد كل رسم.
     زرّ ✕ لا يوجد داخل نموذج التعديل أصلاً (attach-from-form.js ينزعه هناك
     لئلا تضيع كتابة غير محفوظة)، وزرّ الحذف في لوحة ما قبل الحفظ يحمل سمة
     أخرى تماماً (data-az-abs-del في attach-before-save.js) — فلا تصادم مع
     أيّ منهما.
     One listener on document covers the whole panel and every redraw of it:
     attachments.js rebuilds the panel after any change and re-binds onclick
     each time, and our listener is untouched by that — whereas re-binding the
     buttons ourselves would need a screen watcher and would miss the first
     press after every redraw.
     ✕ does not exist inside the edit form at all (attach-from-form.js strips
     it there so unsaved typing cannot be lost), and the pre-save panel's own
     delete carries a completely different attribute (data-az-abs-del in
     attach-before-save.js) — so neither collides with this.
     ═══════════════════════════════════════════════════════════════════ */
  function buttonFor(node) {
    if (!node) return null;
    if (node.closest) return node.closest('[data-az-del]');
    for (var n = node; n; n = n.parentNode) {
      if (n.getAttribute && n.getAttribute('data-az-del')) return n;
    }
    return null;
  }

  function onCapturedClick(ev) {
    var btn = buttonFor(ev && ev.target);
    if (!btn) return;
    /* لو غاب attachments.js لأي سبب فلا نعترض شيئاً — يبقى السلوك كما هو
       if attachments.js is absent for any reason we intercept nothing */
    if (!global.Attachments || typeof Attachments.remove !== 'function') return;
    if (ev.__azDelReasonSeen) return;
    ev.__azDelReasonSeen = true;

    if (ev.preventDefault) ev.preventDefault();
    /* إيقاف الانتشار في مرحلة الالتقاط يمنع onclick الخاص بالزر — أي أن
       نافذة التأكيد القديمة (بلا سبب) لا تفتح أبداً ما دام هذا الملف موجوداً.
       Stopping propagation during capture prevents the button's own onclick,
       so the old confirm-without-a-reason dialog never opens while this file
       is present. */
    if (ev.stopPropagation) ev.stopPropagation();

    var id = btn.getAttribute && btn.getAttribute('data-az-del');
    if (!id) return;
    start(id);
  }

  document.addEventListener('click', onCapturedClick, true);

  global.AttachmentDeleteReason = {
    MIN_REASON: MIN_REASON,
    COLUMN: 'deleteReason',
    SAY_NO_REASON: SAY_NO_REASON,
    SAY_NOT_YOURS: SAY_NOT_YOURS,
    mayDelete: mayDelete,
    askReason: askReason,
    removeWithReason: removeWithReason,
    serverSays: serverSays,
    start: start
  };

  console.info('attachment-delete-reason.js ready — ✕ on an attachment now asks for a written reason ' +
               'and sends it as "deleteReason", which is what SQL 63 requires. attachments.js is untouched.');
})(window);
