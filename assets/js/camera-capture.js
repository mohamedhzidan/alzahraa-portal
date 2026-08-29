/* =========================================================================
   camera-capture.js — زر «📷 صوّر ورقة» بجانب «＋ إضافة ملف»
                       The «📷 Photograph a page» button next to «＋ Add file»
   =========================================================================

   بالكلام العادي · IN PLAIN WORDS

     اليوم: من يحمل ورقة — إذن توريد، نتيجة اختبار موقّعة، تعليمة موقع
     مكتوبة بخط اليد — لا طريقة لإدخالها في الموقع من جواله. يصوّرها
     بتطبيق الكاميرا، ينتظر حتى تصل لجهاز كمبيوتر، يفتح السجل، يضغط
     «＋ إضافة ملف» ويبحث عن الصورة في مجلد التنزيلات. بعد هذا الملف:
     يظهر بجانب «＋ إضافة ملف» زر «📷 صوّر ورقة» — يفتح كاميرا الجوال
     مباشرة، والصورة تُرفع فور التقاطها.

     Today a person holding a paper — a delivery note, a signed test
     result, a handwritten site instruction — has no way to get it into
     the portal from their phone. They photograph it with the camera app,
     wait until it reaches a computer, open the record, press «＋ إضافة
     ملف» and hunt for it in a downloads folder. After this file: a «📷
     صوّر ورقة» button sits beside «＋ إضافة ملف» — it opens the phone's
     camera directly, and the photo uploads the moment it is taken.

   ⚠️ لماذا لا يُعدَّل attachments.js إطلاقاً — فخّ الإغلاق (closure)
      WHY attachments.js IS NOT TOUCHED — THE CLOSURE TRAP

     attachments.js:517-521 يُصدِّر panelHTML وwirePanel وupload على
     Attachments العامة، لكن inject() الداخلية (attachments.js:490-508)
     تنادي النسخ المحلية من هذين الاسمين، لا العامة — فتعديل
     Attachments.panelHTML من هنا لن يُغيّر شيئاً على الشاشة الحقيقية.
     هذا نفس عطل «trade/trades» الذي كلّف ست ساعات: كود يمرّ كل اختبار
     والشاشة لا تتحرك. الفرق الحاسم: هذا الفخّ عن اللفّ (wrapping) لا عن
     المناداة (calling) — Attachments.upload وAttachments.panelHTML
     وAttachments.wirePanel وAttachments.ALLOWED_EXT هي نفس الكائنات التي
     تستعملها اللوحة، فمناداتها من هنا تُشغّل الكود الحقيقي بكل ضماناته
     (موقع المستند، رفض بلا إنترنت، حد الحجم، تأكيد الخادم، سجلّ التدقيق).
     فالتصميم هنا: لا نلفّ أي شيء في attachments.js أبداً؛ فقط ننادي
     صادراتها العامة، ونزيّن الشاشة التي رسمتها هي بالفعل — تماماً كما
     يفعل attachment-reader.js.

     attachments.js:517-521 exports panelHTML/wirePanel/upload onto the
     global Attachments, but its internal inject() (attachments.js:
     490-508) calls the LOCAL copies of those same names, not the exported
     ones — so patching Attachments.panelHTML from here would change
     nothing on the real screen. The exact trade/trades trap that cost six
     hours: code that passes every test while the screen never moves. The
     decisive difference: that trap is about WRAPPING, not CALLING —
     Attachments.upload/panelHTML/wirePanel/ALLOWED_EXT are the very same
     objects the panel itself uses, so calling them from here runs the
     real code with every one of its guarantees (the parent-site fix, the
     offline refusal, the size gate, the server confirmation, the audit
     line). So the design here: never wrap anything in attachments.js —
     only call its exports, and decorate the DOM it already rendered,
     exactly as attachment-reader.js does.

   ⚠️ لماذا لا نتحقّق من وجود مرفقات قبل رسم الزر — ولا ننسخ سطر
      attachment-reader.js:95 · WHY WE NEVER CHECK FOR EXISTING FILES
      FIRST — AND NEVER COPY attachment-reader.js:95

     attachment-reader.js:93-95 يجلب قائمة المرفقات ويتوقف إن كانت فارغة
     — منطقي هناك لأن زر «اقرأ» يحتاج ملفاً موجوداً بالفعل ليقرأه. نسخ
     هذا السطر هنا كان سيصنع فخاً: زر تصوير لا يظهر إلا بعد أن يرفع أحد
     غيره ملفاً أولاً — بينما كل الهدف من هذا الزر هو تصوير أول ورقة على
     سجل لا يحمل شيئاً بعد. لذلك: **لا يُنادى Attachments.list هنا إطلاقاً
     ولا يُتحقَّق من عدد الملفات** — الزر يظهر بمجرد وجود «＋ إضافة ملف»،
     بصرف النظر عن عدد المرفقات، صفراً كان أو مئة (تُثبته تجربة D.7).

     attachment-reader.js:93-95 fetches the attachment list and bails if
     it is empty — sound there, because the "read" button needs a file
     that already exists to read. Copying that line here would build a
     trap: a camera button that only appears once someone ELSE has
     already uploaded a file — while the entire point of this button is
     photographing the FIRST paper onto a record that holds nothing yet.
     So: **Attachments.list is never called here, and the file count is
     never checked** — the button appears the moment «＋ إضافة ملف» exists,
     regardless of how many attachments there are, zero or a hundred
     (proven by trial check D.7).

   ⚠️ بديل مرفوض عمداً — new DataTransfer() · REJECTED ALTERNATIVE —
      WHY WE DO NOT PUSH THE PHOTO INTO THE REAL azAttachInput VIA
      new DataTransfer()

     بديل بدا أنيقاً: بناء DataTransfer، وضع الصورة في .files، ثم إطلاق
     حدث change على azAttachInput الحقيقي — فيُنفَّذ مسار الرفع الأصلي
     بلا أي تكرار للكود. رُفض عمداً: بناء DataTransfer والكتابة على
     input.files هما بالضبط ما يختلف سلوكه بين إصدارات المتصفح، وهذا
     الزر مبنيّ خصيصاً للجوال، **ولا يمكن التأكد من دعم Safari iOS له من
     أي ملف في هذا المشروع أو من هذا الجهاز.** اختيار آلية لا يمكن التحقق
     منها على الجهاز الذي يبنيها، بينما توجد آلية أخرى يمكن التحقق منها،
     قرار خاطئ — فاستُعمل بدلاً منه مسار مستقل تماماً، تماماً كما يفعل
     attachment-reader.js.

     A tempting alternative: build a DataTransfer, put the photo in its
     .files, and fire a change event on the real azAttachInput, so the
     original upload path does everything with zero duplication.
     Deliberately rejected: constructing DataTransfer and assigning to
     input.files are exactly the things that vary by browser version,
     this button exists specifically for phones, and **iOS Safari's
     support for it cannot be established from any file in this project
     or from this machine.** Choosing a mechanism that cannot be verified
     on the machine that builds it, when a verifiable one exists, is the
     wrong trade — so a fully independent path is used instead, exactly
     as attachment-reader.js does.

   المرساة الوحيدة · THE ONLY ANCHOR

     الزر يظهر فقط إن وُجد #azAttachInput داخل #azAttachSection — وهذا
     العنصر لا يرسمه attachments.js إلا حين canEdit وcanNet معاً
     (attachments.js:389-390،499). فلا صلاحية ولا قائمة أدوار ولا قائمة
     وحدات في هذا الملف إطلاقاً — يستحيل أن ينحرف عن auth.js، لأنه لا
     يكرّره أبداً.

     The button renders only when #azAttachInput exists inside
     #azAttachSection — and attachments.js only draws that element when
     canEdit AND canNet are both true (attachments.js:389-390,499). So
     this file carries no permission logic, no role list, no module list
     at all — it cannot drift from auth.js, because it never duplicates it.

   إضافي بالكامل · ADDITIVE. حذف هذا الملف وحده يعيد كل شيء إلى ما كان:
   «＋ إضافة ملف» يبقى كما هو تماماً، ولا شيء آخر يتغيّر في أي ملف آخر.
   ADDITIVE. Deleting this file alone restores everything exactly: «＋ Add
   file» stays exactly as it was, and nothing else changes in any other
   file.

   يُحمَّل بعد attachments.js — يحتاج Attachments وEntityPage موجودَين.
   Loads after attachments.js — needs Attachments and EntityPage to exist.
   ========================================================================= */
(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o)   { return isAr() ? o.ar : o.en; }
  function toast(m, k, ms) { if (global.UI && UI.toast) UI.toast(m, k, ms); }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · تسمية الصورة — لا «image.jpg» أبداً
        NAMING THE PHOTO — never «image.jpg»
     -------------------------------------------------------------------
     كاميرا الجوال تُسلِّم اسماً عاماً (غالباً image.jpg)، فتظهر اثنتا
     عشرة صورة بنفس الاسم في اللوحة ولا يُعرف ترتيبها. نعيد التسمية هنا
     في المتصفح — بدل المراهنة على ما يرسله نظام التشغيل — بتاريخ ووقت
     غربيّي الأرقام دائماً (لا I18N.num؛ الأرقام العربية-الهندية تُفسد
     اسم الملف)، وامتداد مُستمَدّ من صادرة Attachments.ALLOWED_EXT
     الحقيقية، لا من نسخة ثانية هنا. لا صيغة آمنة معروفة؟ لا تسمية إطلاقاً
     — الملف الأصلي يمرّ كما هو ويرفضه upload() بصدق إن لزم.

     A phone camera hands back a generic name (often image.jpg), so twelve
     photographed pages would all read the same and their order would be
     unknown. We rename here, in the browser, instead of betting on what
     the OS sends — with a date/time stamp in Western digits always
     (never I18N.num; Arabic-Indic digits would corrupt the filename), and
     an extension taken from the REAL exported Attachments.ALLOWED_EXT, not
     a second local copy. No safe extension recognised? No rename at all —
     the original file passes through untouched and upload()'s own type
     gate refuses it honestly if it must.
     ═══════════════════════════════════════════════════════════════════ */
  var MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
                    'image/heic': 'heic', 'image/heif': 'heic' };

  function allowedExt(ext) {
    return !!(ext && global.Attachments && Attachments.ALLOWED_EXT &&
              Attachments.ALLOWED_EXT.indexOf(ext) !== -1);
  }
  function extFromMime(mime) {
    var e = MIME_EXT[String(mime || '').toLowerCase()];
    return allowedExt(e) ? e : null;
  }
  function extFromName(name) {
    var i = String(name || '').lastIndexOf('.');
    var e = i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
    return allowedExt(e) ? e : null;
  }
  function stamp() {
    var d = new Date();                                    /* توقيت الجهاز — القاهرة، لا UTC */
    function p2(n) { return String(n).padStart(2, '0'); }   /* أرقام غربية دائماً — أبداً I18N.num */
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
           p2(d.getHours()) + '-' + p2(d.getMinutes()) + '-' + p2(d.getSeconds());
  }
  function renameForHuman(file) {
    if (typeof global.File !== 'function') return file;      /* لا يوجد File هنا — مرّره كما هو */
    var ext = extFromMime(file.type) || extFromName(file.name);
    if (!ext) return file;      /* لا صيغة آمنة معروفة — لا تسمية قسرية أبداً (راجع رأس الملف) */
    var name = L({ ar: 'صورة ', en: 'Photo ' }) + stamp() + '.' + ext;
    try { return new File([file], name, { type: file.type || '' }); }
    catch (e) { return file; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · الزر نفسه — يُبنى بـ createElement فقط، لا innerHTML أبداً
        THE BUTTON ITSELF — createElement only, never innerHTML
     ═══════════════════════════════════════════════════════════════════ */
  function buildButton(moduleId, recordId) {
    var label = document.createElement('label');
    label.className = 'btn btn-outline btn-sm';
    label.style.cursor = 'pointer';
    label.style.marginInlineStart = '6px';   /* ثابت لا auto — auto ثانٍ يباعد الزرّين لطرفَي الصف (٥.٣) */
    label.title = L({
      ar: 'صوّر ورقة بكاميرا الهاتف — على الكمبيوتر يفتح اختيار صورة',
      en: 'Photograph a page with the phone camera — on a computer this opens an image picker' });
    label.appendChild(document.createTextNode(L({ ar: '📷 صوّر ورقة', en: '📷 Photograph a page' })));

    var input = document.createElement('input');
    input.type = 'file';
    input.id = 'azCameraInput';                     /* يجب أن يختلف عن azAttachInput — كلاهما مُستهدَف بالاسم من ملفين آخرين (٥.٦) */
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');    /* الكاميرا الخلفية — user تعني كاميرا السيلفي، خطأ للورق */
    input.hidden = true;
    input.onchange = function () { onCapture(input, moduleId, recordId); };
    label.appendChild(input);
    return label;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · التزيين — إضافة الزر بجانب «＋ إضافة ملف» فقط
        DECORATE — add the button beside «＋ Add file» only
     ═══════════════════════════════════════════════════════════════════ */
  function decorate(moduleId, recordId) {
    var section = document.getElementById('azAttachSection');
    if (!section || section.getAttribute('data-az-camera') === '1') return;

    /* المرساة الوحيدة (راجع رأس الملف) — لا Attachments.list هنا، ولا
       فحص لعدد الملفات. غياب الإدخال يعني عدم صلاحية أو عدم اتصال، لذا
       تبقى العلامة غير مضبوطة كي تنجح محاولة لاحقة.
       THE ONLY ANCHOR (see header) — no Attachments.list here, no file-
       count check. A missing input means no permission or no connection;
       the marker stays unset so a later attempt can still succeed. */
    var addInput = section.querySelector('#azAttachInput');
    if (!addInput) return;
    var addLabel = addInput.parentNode;
    if (!addLabel || !addLabel.parentNode) return;

    section.setAttribute('data-az-camera', '1');
    addLabel.parentNode.appendChild(buildButton(moduleId, recordId));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · لحظة الالتقاط
        THE CAPTURE MOMENT
     ═══════════════════════════════════════════════════════════════════ */
  async function onCapture(input, moduleId, recordId) {
    if (!global.Attachments) return;
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;   /* الكاميرا أُلغيت — يطابق attachments.js:465 لخانة الإضافة العادية */

    var file = renameForHuman(files[0]);
    toast(L({ ar: 'جارٍ رفع الصورة…', en: 'Uploading the photo…' }), 'info', 2000);

    var r = await Attachments.upload(moduleId, recordId, file);
    if (r.ok) toast(L({ ar: 'تم رفع الصورة.', en: 'The photo was uploaded.' }), 'success');
    else      toast(r.error, 'error', 7000);   /* رسالة الرفض جاهزة ثنائية اللغة من upload() نفسها */

    input.value = '';             /* لالتقاط صورة أخرى بنفس المدخل لاحقاً */
    await refreshPanel(moduleId, recordId);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · تحديث اللوحة بعد الرفع — نعيد بناء ما فعله attachments.js:504-508
        داخل إغلاقه الخاص، بصادراته العامة فقط (راجع رأس الملف)
        REFRESH AFTER UPLOAD — reproducing attachments.js:504-508's own
        closure-local refresh, using only its public exports
     ═══════════════════════════════════════════════════════════════════ */
  async function refreshPanel(moduleId, recordId) {
    if (!global.Attachments) return;
    var body = document.getElementById('modalBody');
    if (!body) return;
    var old = document.getElementById('azAttachSection');

    /* ⚠️ canEdit يُقرأ من اللوحة نفسها، لا يُعاد حسابه من Auth.
       الصيغة (Auth.can(edit) || Auth.can(create)) موجودة في
       attachments.js:499؛ نسخُها هنا كان يصنع «التوأم الهشّ» — سطرين في
       ملفين يجب أن يظلا متطابقين حرفاً بحرف إلى الأبد، وهو بالضبط العطل
       الذي كلّف هذا المشروع سابقاً (advance-balance.js:101 مقابل
       hr-department.js:485-487) وأُلغي بجعل القاعدة واحدة مشتركة. وجود
       #azAttachInput هو حكم اللوحة نفسها على الصلاحية، فنسأله بدل أن
       نحكم من جديد: لو غاب (لا صلاحية أو لا إنترنت) فـ canNet في
       attachments.js:389 يتكفّل بالحالتين ويعرض إشعار عدم الاتصال بصرف
       النظر. وبهذا لا يحمل هذا الملف أي منطق صلاحيات إطلاقاً — كما يقول
       رأسه بالضبط.
       ⚠️ canEdit is READ FROM THE PANEL, never recomputed from Auth.
       The expression (Auth.can(edit) || Auth.can(create)) lives at
       attachments.js:499; copying it here created a "fragile twin" — two
       lines in two files that must stay word-identical forever, which is
       exactly the fault that already cost this project once
       (advance-balance.js:101 vs hr-department.js:485-487) and was cured
       by making the rule shared. The presence of #azAttachInput IS the
       panel's own verdict on permission, so we ask it instead of judging
       again: if it is absent (no permission OR no connection), canNet at
       attachments.js:389 covers both cases and shows the offline notice
       regardless. This leaves ZERO permission logic in this file —
       exactly what its header claims. */
    var canEdit = !!(old && old.querySelector('#azAttachInput'));
    if (old) old.remove();

    var html = await Attachments.panelHTML(moduleId, recordId, canEdit);
    var div = document.createElement('div');
    div.innerHTML = html;
    body.appendChild(div.firstChild);
    Attachments.wirePanel(body, moduleId, recordId, function () { refreshPanel(moduleId, recordId); });
    decorate(moduleId, recordId);   /* أعد زرّنا نحن إلى القسم الجديد — العلامة اختفت معه */
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · التركيب — بلا لمس attachments.js، يطابق attachment-reader.js
        INSTALL — without touching attachments.js, mirrors
        attachment-reader.js's own proven install
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.EntityPage || EntityPage.__azCameraInstalled) return;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);   /* الأصل أولاً — اللوحة يجب أن تُرسم قبل أن نبحث عنها (خلافاً لـ read-ocr.js) */
      watchFor(moduleId, id);
    };
    EntityPage.__azCameraInstalled = true;   /* حارس إجباري — بلا هذا يُضاعِف زرَّنا محاولة ١٧٠٠ مل.ث */
  }

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
    setTimeout(function () { decorate(moduleId, recordId); }, 500);   /* شبكة موقع بطيئة قد تؤخّر حقن اللوحة */
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  setTimeout(install, 1700);   /* لو حُمِّل pages/entity.js بعدنا */

  global.CameraCapture = {
    decorate: decorate,
    renameForHuman: renameForHuman,
    install: install
  };

  console.info('camera-capture.js ready — «📷 صوّر ورقة» appears beside «＋ إضافة ملف» wherever it renders. ' +
               'attachments.js is untouched; deleting this file restores the old behaviour exactly.');
})(window);
