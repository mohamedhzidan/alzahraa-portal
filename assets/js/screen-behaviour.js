/* screen-behaviour.js — أربعة إصلاحات لسلوك الشاشات، في ملف واحد قابل للحذف
   Four screen-behaviour fixes in one deletable file. v2.0.21.

   إضافي بالكامل: يلفّ الموجود ولا يعدّل أي ملف قديم. حذف هذا الملف (مع
   سطره في loader.js وservice-worker.js) يعيد سلوك اليوم بالضبط — بما فيه
   الإصلاح الرابع، لأن قواعد CSS الخاصة به تُحقن من هنا ولا تُكتب أبداً في
   styles.css.
   Purely additive: wraps what exists, edits no old file. Deleting this file
   (with its loader.js and service-worker.js lines) restores today's
   behaviour exactly — including fix 4, whose CSS is injected from here and
   never written into styles.css.

   ما يصلحه، بما يعيشه الإنسان لا بالمصطلحات:
     ١· مهندس يملأ ١٢ خانة في إذن صب ويلمس ✕ بإبهامه — كل شيء يضيع بلا
        سؤال. الآن: سؤال، و«ابقَ» هو الاختيار الآمن الجاهز.
     ٢· يضغط حفظ وخانة إجبارية فارغة فوق بثلاث شاشات — رسالة حمراء تحت
        والصفحة لا تتحرك. الآن: الشاشة تقفز للخانة نفسها والرسالة تسمّيها.
     ٣· يفتح سجلاً محفوظاً فيقرأ صفحتين من شرطات لخانات لم تُملأ. الآن:
        تنطوي خلف سطر واحد «غير مسجّلة (اعرضها)» — لا شيء يُحذف.
     ٤· أزرار الصف (اعتماد · رفض · نسخ · حذف) خارج حافة الشاشة على الهاتف
        كلياً — تظهر فقط بسحب الجدول جانبياً. الآن: مثبّتة على الحافة
        المرئية دائماً، وبمسافة حقيقية بين «نسخ» و«حذف».

   ⚠️ ما لا يفعله هذا الملف عمداً — يُقرأ قبل أي تعديل:
   هذا لا يضيف رسالة تأكيد على الاعتمادات الروتينية. الاعتماد بلمسة واحدة
   تصميم صحيح لمدير يمرّ على خمسة عشر طلب إجازة في صباح سبتمبر؛ سؤال تأكيد
   على كل واحد يجعل صباح عمارة أسوأ. الخلل كان في اجتماع أمرين: الزر غير
   مرئي حتى يُسحب الجدول جانبياً، فأول زر يجده المرء يجده في منتصف السحب،
   وتلك اللمسة العارضة نهائية. أصلِح الموضع فتصبح اللمسة الواحدة ميزة.
   وهل يستحق التوقيع الأول على الرواتب تأكيداً؟ سؤال عمل منفصل للمالك
   والمالية (rules.js:202 يحرس approve وحده وعلى المستندات ذات المبلغ فقط،
   فـreview غير محروس) — خارج نطاق هذا الملف صراحةً.
   This does NOT add a confirmation to routine approvals. One-tap approval
   is good design for a manager clearing fifteen leave requests on a
   September morning; a confirm on each makes عمارة's morning worse. The
   fault is the combination: the button is invisible until the table is
   dragged sideways, so the first one he ever finds is found mid-drag, and
   that accidental tap is final. Fix the position and the one-tap becomes a
   feature. Whether payroll's FIRST signature deserves a confirm is a
   separate business question for the owner and finance (rules.js:202 gates
   only `approve`, and only on documents with an amount, so `review` is
   ungated) — explicitly OUT of scope. */
(function (global) {
  'use strict';
  if (typeof document === 'undefined') return;

  /* كل سلوك له مفتاحه — قلب واحد إلى false يطفئه وحده ولا يمسّ البقية.
     Each behaviour has its own switch — flipping one to false disables
     exactly it and nothing else. dupLabel منفصل عن reachActions عمداً كي
     يمكن سحب كلمة «نسخ» وحدها دون خسارة العمود المثبّت. */
  var ON = { leaveGuard: true, errorScroll: true, foldEmpty: true,
             reachActions: true, dupLabel: true };

  function isAr() {
    try { return (global.I18N && I18N.getLang && I18N.getLang() === 'ar') ||
                 document.documentElement.getAttribute('dir') === 'rtl'; }
    catch (e) { return true; }
  }
  function tr(ar, en) { return isAr() ? ar : en; }

  /* ══════════════ ١ · سؤال قبل ترك نموذج كُتب فيه · LEAVE GUARD ══════════════
     المخارج الأربعة كلها تمرّ من هنا: ✕ والخلفية (app.js:326-327 تربطهما
     بالدالة بالمرجع وقت الإقلاع، فلفّ الدالة نفسها لا يغيّر شيئاً — لذلك
     نعترض النقرة في طور الالتقاط قبل أن تصلهما أصلاً)، وEscape (مستمع
     app.js:335 في طور الفقاعة، والتقاطنا يسبقه)، وزر «إلغاء» في ذيل
     النافذة (يُميَّز بأنه بلا onClick وبلا keepOpen — pages/entity.js:533).
     All four exits pass through here: the ✕ and backdrop (bound BY
     REFERENCE at boot in app.js:326-327, so wrapping the function itself
     changes nothing — we intercept the click in the CAPTURE phase before
     it ever reaches them), Escape (app.js:335 listens in the bubble phase;
     our capture runs first), and the footer «إلغاء» (recognised by having
     no onClick and no keepOpen — pages/entity.js:533). */

  var formSnapshot = null;      /* null = لا نموذج مفتوح · no form open */
  var GUARD_ID = 'azLeaveGuard';

  function serializeForm() {
    var form = document.getElementById('entForm');
    if (!form) return null;
    var parts = [];
    var els = form.querySelectorAll('[name]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      /* الحقول المحسوبة تُكتب برمجياً مع كل ضغطة (pages/entity.js:668)،
         فإدخالها في البصمة يجعل كل نموذج «متسخاً» فور أول حرف — حتى لو
         مُسح بعدها. والمعطَّل لا يكتبه المستخدم أصلاً.
         Calc fields are written programmatically on every keystroke
         (pages/entity.js:668) — including them marks every form dirty on
         the first character, even one emptied again. Disabled ones the
         user cannot type into at all. */
      if (el.disabled || el.hasAttribute('data-calc')) continue;
      var v = (el.type === 'checkbox') ? (el.checked ? '1' : '0')
                                       : String(el.value == null ? '' : el.value);
      parts.push(el.name + '=' + v);
    }
    return parts.join('');
  }

  function formIsDirty() {
    if (formSnapshot === null) return false;
    var now = serializeForm();
    return now !== null && now !== formSnapshot;
  }

  /* لفّ UI.modal — للتصنيف وأخذ البصمة فقط، لا لتغيير أي سلوك.
     Wrap UI.modal — only to tag leave buttons and take the snapshot. */
  function installModalWrap() {
    if (!global.UI || !UI.modal) return;
    var orig = UI.modal;
    UI.modal = function (opts) {
      opts = opts || {};
      var origOnOpen = opts.onOpen;
      /* البصمة تُؤخذ داخل onOpen لأن ui.js:141 يؤجّله بـsetTimeout(…,0)
         وpages/entity.js:539-544 يبني النموذج داخله — قبل ذلك لا نموذج.
         The snapshot is taken inside onOpen: ui.js:141 defers it and
         entity.js builds the form inside it — before that there is
         nothing to snapshot. */
      opts.onOpen = function () {
        if (origOnOpen) origOnOpen();
        formSnapshot = serializeForm();
      };
      var out = orig.apply(UI, arguments);
      /* opts.buttons تُقرأ بعد النداء لا قبله: user-dialog-guard.js:159
         يستبدل المصفوفة كلها، فقراءة سابقة قد تمسك نسخة قديمة.
         Read opts.buttons AFTER calling through: user-dialog-guard.js:159
         replaces the whole array; an earlier reference can be stale. */
      try {
        if (document.getElementById('entForm')) {
          var foot = document.getElementById('modalFoot');
          var btns = opts.buttons || [];
          if (foot && foot.children.length === btns.length) {
            for (var i = 0; i < btns.length; i++) {
              if (!btns[i].onClick && btns[i].keepOpen !== true) {
                foot.children[i].setAttribute('data-az-leave', '1');
              }
            }
          } else if (foot) {
            /* احتياط لو اختلف العدّان: طابق على النص نفسه.
               Fallback if the counts disagree: match on the label text. */
            var cancelTxt = (global.t ? [t('g.cancel'), t('g.close')] : []);
            for (var j = 0; j < foot.children.length; j++) {
              if (cancelTxt.indexOf(foot.children[j].textContent) !== -1) {
                foot.children[j].setAttribute('data-az-leave', '1');
              }
            }
          }
        } else {
          formSnapshot = null;   /* نافذة بلا نموذج — لا حراسة إطلاقاً */
        }
      } catch (e) { /* التصنيف زينة الحراسة لا شرطها — لا نكسر فتح النافذة */ }
      return out;
    };
  }

  /* لفّ UI.closeModal — فقط لتصفير البصمة عند أي إغلاق برمجي (حفظ ناجح،
     commit في pages/entity.js:840…) حتى لا تطارد بصمةُ نموذجٍ أُغلق
     نموذجاً تالياً.
     Wrap UI.closeModal — only to clear the snapshot on any programmatic
     close, so a dead form's snapshot never haunts the next one. */
  function installCloseWrap() {
    if (!global.UI || !UI.closeModal) return;
    var orig = UI.closeModal;
    UI.closeModal = function () {
      formSnapshot = null;
      removeGuard();
      return orig.apply(UI, arguments);
    };
  }

  function removeGuard() {
    var g = document.getElementById(GUARD_ID);
    if (g) g.remove();
  }

  function showGuard() {
    removeGuard();
    var o = document.createElement('div');
    o.id = GUARD_ID;
    o.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    /* z-index 75: فوق النافذة (60) ولوحة الأوامر (70)، تحت التنبيهات (90)
       — styles.css:459/481/497. البناء اليدوي وليس UI.modal لأن هناك
       #modalHost واحداً وui.js:97-100 يمسح modalBody في كل نداء — أي سؤال
       عبر UI.modal يدمّر النموذج الذي يسأل عنه. السابقة في المشروع:
       attachment-reader.js:292.
       z-index 75: above the modal (60) and palette (70), below toasts
       (90). Hand-built, never UI.modal: there is ONE #modalHost and
       ui.js:97-100 wipes modalBody on every call — asking through
       UI.modal destroys the very form it asks about. Precedent:
       attachment-reader.js:292. */
    o.innerHTML =
      '<div class="az-leave-box">' +
        '<p>' + tr('فيه بيانات مكتوبة لم تُحفظ. تخرج وتفقدها؟',
                   'There is unsaved typing here. Leave and lose it?') + '</p>' +
        '<div class="az-leave-btns">' +
          '<button type="button" class="btn btn-primary" data-az-stay>' +
            tr('ابقَ', 'Stay') + '</button>' +
          '<button type="button" class="btn btn-ghost" data-az-exit>' +
            tr('اخرج بدون حفظ', 'Leave without saving') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);
    o.querySelector('[data-az-stay]').onclick = removeGuard;
    o.querySelector('[data-az-exit]').onclick = function () {
      removeGuard();
      formSnapshot = null;          /* الخروج قرارٌ الآن — لا سؤال ثانياً */
      if (global.UI && UI.closeModal) UI.closeModal();
    };
    /* النقر على الخلفية = «ابقَ» — الخروج فعل متعمَّد بزرّه فقط.
       Clicking the dark backdrop = Stay. Leaving is only the button. */
    o.addEventListener('click', function (e) { if (e.target === o) removeGuard(); });
    o.querySelector('[data-az-stay]').focus();
  }

  function wantsToLeave(target) {
    if (!target || !target.closest) return false;
    if (target.closest('#modalClose')) return true;
    if (target.closest('#modalBackdrop')) return true;
    var fb = target.closest('#modalFoot button[data-az-leave="1"]');
    return !!fb;
  }

  function installLeaveListeners() {
    document.addEventListener('click', function (e) {
      if (!ON.leaveGuard) return;
      var host = document.getElementById('modalHost');
      if (!host || host.hidden) return;
      if (!document.getElementById('entForm')) return;
      if (!wantsToLeave(e.target)) return;
      if (!formIsDirty()) return;
      /* stopPropagation في طور الالتقاط يمنع وصول الحدث إلى onclick
         المربوط على الهدف نفسه — فالنافذة تبقى مفتوحة.
         stopPropagation in the CAPTURE phase keeps the event from ever
         reaching the target's own onclick — the window stays open. */
      e.preventDefault();
      e.stopPropagation();
      showGuard();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (!ON.leaveGuard || e.key !== 'Escape') return;
      var g = document.getElementById(GUARD_ID);
      if (g) { e.stopPropagation(); e.preventDefault(); removeGuard(); return; }
      var palette = document.getElementById('paletteHost');
      if (palette && !palette.hidden) return;         /* اللوحة أولاً كما في app.js */
      var host = document.getElementById('modalHost');
      if (!host || host.hidden) return;
      if (!document.getElementById('entForm')) return;
      var closeBtn = document.getElementById('modalClose');
      if (closeBtn && closeBtn.hidden) return;        /* نافذة غير قابلة للإغلاق أصلاً */
      if (!formIsDirty()) return;
      e.stopPropagation();
      e.preventDefault();
      showGuard();
    }, true);
  }

  /* ══════════ ٢ · القفز إلى أول خانة حمراء · SCROLL TO FIRST ERROR ══════════
     مراقب تحوّلات على #modalBody لا لفّ لأي دالة: input-error تُضاف في
     موضعين فقط في المشروع كله (pages/entity.js:802 وui.js:182)، فالمراقب
     يلتقط كل طريق رفض — ولا يمكن لأي تغيير مستقبلي في سلسلة اللفافات أن
     يكسره.
     A MutationObserver on #modalBody, no wrapping: input-error is added in
     exactly two places portal-wide, so the observer catches every refusal
     path and no future wrapper-chain change can break it. */
  var scrollQueued = false;
  function installErrorScroll() {
    var body = document.getElementById('modalBody');
    if (!body) { setTimeout(installErrorScroll, 300); return; }
    new MutationObserver(function (muts) {
      if (!ON.errorScroll || scrollQueued) return;
      var hit = false;
      for (var i = 0; i < muts.length; i++) {
        var el = muts[i].target;
        if (el && el.classList && el.classList.contains('input-error')) { hit = true; break; }
      }
      if (!hit) return;
      scrollQueued = true;
      setTimeout(function () {
        scrollQueued = false;
        var first = document.querySelector('#modalBody .input-error');
        if (!first) return;
        /* 'auto' وليس 'smooth' عمداً: التمرير الناعم غير متزامن، وقارئ
           القياس يقرأ الموضع في منتصف الحركة فيرى رقماً ليس قبلُ وليس
           بعدُ. 'auto', never 'smooth': smooth is asynchronous and the
           measuring gate would read mid-animation. */
        try { first.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) { first.scrollIntoView(); }
        try { first.focus({ preventScroll: true }); } catch (e2) {}
        nameTheBox(first);
      }, 0);
    }).observe(body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* «هذا الحقل مطلوب» لا يسمّي الخانة (pages/entity.js:807) — على نموذج
     بطول أربع شاشات، التمرير يريه أين والاسم يقول له ماذا. نعدّل نص آخر
     تنبيه أحمر فقط إن كان هو النص العام حرفياً — لا نلمس رسائل أخرى.
     «This field is required» names no box (entity.js:807). The scroll
     shows WHERE; the name says WHAT. We rewrite the newest red toast only
     when it is exactly that generic text — no other message is touched. */
  function nameTheBox(inputEl) {
    try {
      var lab = inputEl.closest('[data-fname]');
      if (!lab) return;
      var fl = lab.querySelector('.field-label');
      if (!fl) return;
      var clone = fl.cloneNode(true);
      var star = clone.querySelector('.req');
      if (star) star.remove();
      var name = clone.textContent.trim();
      if (!name) return;
      var hostT = document.getElementById('toastHost');
      if (!hostT || !hostT.lastElementChild) return;
      var last = hostT.lastElementChild;
      if (last.className.indexOf('error') === -1) return;
      var span = last.querySelector('span');
      var generic = global.t ? t('g.required') : '';
      if (!span || (generic && span.textContent !== generic)) return;
      span.textContent = isAr() ? ('«' + name + '» مطلوب') : ('"' + name + '" is required');
    } catch (e) { /* التسمية تحسين فوق التمرير — فشلها لا يمسّ القفزة نفسها */ }
  }

  /* ══════════ ٣ · طيّ الصفوف الفارغة في عرض السجل · FOLD EMPTY ROWS ══════════
     لفّ EntityPage.openDetail ومعالجة الشجرة المرسومة نفسها — ستة ملفات
     أخرى تلفّ نفس الدالة، والعمل على DOM لا على نص HTML هو ما يجعل الجميع
     يتعايشون. تمريرة متزامنة فور الرسم، وثانية واحدة عند ~450مللي تلتقط ما
     تحقنه اللفافات المتأخرة (audit-trail.js عند +80/+350، attachments.js
     عند +120) — كلاهما لا يكرّر ما عولج.
     Wrap EntityPage.openDetail and post-process the rendered DOM — six
     other files wrap the same function; working on the DOM is what lets
     everyone coexist. One synchronous pass, one idempotent pass at ~450ms
     for the late injectors. */
  function isEmptyDD(dd) {
    var txt = (dd.textContent || '').trim();
    /* «—» أو فراغ فقط. أبداً ليس 0 وأبداً ليس «لا»: صفر مكتوب و«لا» معروضة
       قد يكونان إجابتين حقيقيتين، وإخفاء إجابة حقيقية أسوأ من صفّ زائد —
       ذلك الالتباس مسجَّل كقضية منفصلة ولا يُحلّ هنا.
       '—' or blank ONLY. Never 0 and never «لا»: those may be real
       answers, and hiding a real answer is worse than an extra row — that
       ambiguity is logged as its own issue and is not solved here. */
    return txt === '' || txt === '—';
  }

  function foldPass() {
    if (!ON.foldEmpty) return;
    if (document.getElementById('entForm')) return;      /* نموذج؟ لا شأن لنا */
    var body = document.getElementById('modalBody');
    if (!body) return;
    var grids = body.querySelectorAll('.detail-grid');
    if (!grids.length) return;
    /* تمريرة الوسم: az-foldable علامة دائمة «هذا الصف كان فارغاً وقت
       الرسم» — الإخفاء الفعلي قرار منفصل في applyFoldState، فلا يُخمَّن
       display أصلي لأي عنصر عند الإظهار: نزيل صنف الإخفاء فقط.
       Tagging pass: az-foldable is a permanent marker "this row was empty
       when drawn" — actual hiding is a separate decision in
       applyFoldState, so revealing never guesses any element's original
       display: it only removes the hiding class. */
    for (var g = 0; g < grids.length; g++) {
      var grid = grids[g];
      if (grid.getAttribute('data-az-folded') === '1') continue;
      var items = grid.querySelectorAll('.detail-item');
      for (var i = 0; i < items.length; i++) {
        var dd = items[i].querySelector('dd');
        if (dd && isEmptyDD(dd)) items[i].classList.add('az-foldable');
      }
      grid.setAttribute('data-az-folded', '1');
    }
    applyFoldState(body);
  }

  function applyFoldState(body) {
    var open = body.getAttribute('data-az-fold-open') === '1';
    var foldable = body.querySelectorAll('.detail-item.az-foldable');
    for (var i = 0; i < foldable.length; i++) {
      foldable[i].classList.toggle('az-fold-hidden', !open);
    }
    /* قسم انطوت كل صفوفه ينطوي عنوانه معه — عنوان بلا معلومة صفٌّ ضائع.
       A section whose every row folded folds its heading with it. */
    var grids = body.querySelectorAll('.detail-grid');
    for (var g = 0; g < grids.length; g++) {
      var sec = grids[g].closest('.form-section');
      if (!sec) continue;
      var vis = grids[g].querySelectorAll('.detail-item:not(.az-fold-hidden)').length;
      sec.classList.toggle('az-fold-section', vis === 0);
    }
    var line = document.getElementById('azFoldLine');
    if (!foldable.length) { if (line) line.remove(); return; }
    var num = (global.I18N && I18N.num) ? I18N.num(foldable.length, 0) : String(foldable.length);
    var label = open
      ? tr('أخفِ الخانات غير المسجّلة', 'Hide the unrecorded boxes')
      : (isAr() ? (num + ' خانة غير مسجّلة (اعرضها)') : (num + ' unrecorded boxes (show them)'));
    if (!line) {
      line = document.createElement('button');
      line.id = 'azFoldLine';
      line.type = 'button';
      line.className = 'btn btn-ghost btn-sm az-fold-line';
      line.onclick = function () {
        var b = document.getElementById('modalBody');
        if (!b) return;
        b.setAttribute('data-az-fold-open',
          b.getAttribute('data-az-fold-open') === '1' ? '0' : '1');
        applyFoldState(b);
      };
      body.appendChild(line);
    }
    line.textContent = label;
  }

  function installFoldEmpty() {
    if (!global.EntityPage || !EntityPage.openDetail) { setTimeout(installFoldEmpty, 300); return; }
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function () {
      var out = orig.apply(this, arguments);
      var body = document.getElementById('modalBody');
      if (body) body.setAttribute('data-az-fold-open', '0');
      try { foldPass(); } catch (e) {}
      setTimeout(function () { try { foldPass(); } catch (e) {} }, 450);
      return out;
    };
  }

  /* ══════════ ٤ · أزرار الصف في متناول الإبهام · REACHABLE ROW BUTTONS ══════════
     يُحقن وسم <style> بعد styles.css وbrand.css وأيضاً بعد نمط
     mobile-field.js (خانة التحميل في loader.js بعده عمداً) فيفوز بترتيب
     التتالي وحده — النمط نفسه الموثَّق في mobile-field.js:19-23، لا
     !important ولا أي تعديل على styles.css.
     Injected <style> after styles.css, brand.css AND mobile-field.js's own
     style (our loader slot is after it on purpose) — wins purely by
     cascade order, the exact pattern documented in mobile-field.js:19-23. */
  function injectStyle() {
    var css = '';
    /* الطيّ للشاشة فقط: الورقة المطبوعة تُظهر كل الصفوف دائماً — على
       الورق لا يوجد زر «اعرضها»، وسجل رسمي ناقص الصفوف يوهم بالاكتمال.
       وسطر الطيّ نفسه لا يُطبع، فهو زر لا معلومة. (قرار مدوَّن بعد ملاحظة
       الفاحص أن الإخفاء كان يصل للطباعة بلا قرار من أحد.)
       Folding is SCREEN-ONLY: printed paper always shows every row — on
       paper there is no reveal button, and a formal record missing rows
       reads as complete. The fold line itself never prints — it is a
       button, not information. (Recorded decision, after the integrator
       noted the hiding reached print with nobody having decided it.) */
    css += '@media screen{.az-fold-hidden{display:none}' +
           '.form-section.az-fold-section{display:none}}';
    css += '@media print{.az-fold-line{display:none}}';
    css += '.az-fold-line{margin:6px 0 2px;opacity:.85}';
    /* حوار «ابقَ / اخرج» — z-index 75 بين اللوحة (70) والتنبيهات (90) */
    css += '#azLeaveGuard{position:fixed;inset:0;z-index:75;background:rgba(0,0,0,.55);' +
           'display:flex;align-items:center;justify-content:center;padding:16px}';
    css += '#azLeaveGuard .az-leave-box{background:var(--surface,#fff);border-radius:10px;' +
           'padding:20px;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25)}';
    css += '#azLeaveGuard p{margin:0 0 14px;font-weight:600}';
    css += '#azLeaveGuard .az-leave-btns{display:flex;gap:10px;flex-wrap:wrap}';

    if (ON.reachActions) {
      css += '@media only screen and (max-width:680px){';
      /* الجدول الأصلي 640px داخل شاشة 375px (styles.css:386) — عمود
         الإجراءات آخر عمود فيخرج دائماً. نثبّته على الحافة المرئية بدل
         تغيير بنية الجدول. ولمن يبحث لاحقاً عن col-actions: styles.css:602
         يخفيه أيضاً — لكن ذلك داخل @media print وحده ولا علاقة له بهذه
         القاعدة، وonly screen هنا تُبقي الطباعة خارج كل هذا أصلاً.
         The table is 640px inside a 375px screen and the action column is
         last, so it is always the part that is off. We pin it to the
         visible edge instead of restructuring the table. For anyone
         grepping col-actions later: styles.css:602 also hides it — inside
         @media print alone; `only screen` keeps print out of all of this. */

      /* border-collapse:separate ليست زينة: styles.css:91 يجعل الجداول
         collapse، وsticky على خلية عمود في جدول collapse هو الحالة
         الضعيفة على أجهزة أندرويد الرخيصة — عين الأسطول الحقيقي هنا.
         separate + border-spacing:0 يبقي الشكل مطابقاً ويجعل التثبيت
         يعمل. Not cosmetic: styles.css:91 collapses tables, and a sticky
         COLUMN cell on a collapsed table is the weak case on cheap
         Androids — the actual fleet. */
      css += '.data-table{border-collapse:separate;border-spacing:0}';
      /* inset-inline-end وليس right: i18n.js:285 يضبط اتجاه الصفحة،
         وهذه تعني «حافة نهاية السطر» فتصحّ في العربية والإنجليزية معاً —
         right كانت ستثبّت العمود على الحافة الخطأ بالعربية، لغة الجميع.
         Logical property, correct in both directions; right:0 would pin
         to the WRONG edge in Arabic — the language everyone uses. */
      css += '.data-table .col-actions{position:sticky;inset-inline-end:0;z-index:1;' +
             'background:var(--surface,#fff)}';
      css += '.data-table thead th.col-actions{z-index:3;background:var(--surface-3,#f3f4f6)}';
      css += '.data-table tbody tr:hover .col-actions{background:var(--surface-2,#f8f9fa)}';
      /* المسافة بين «نسخ» و«حذف» كانت 3px — إبهام واحد يغطيهما معاً.
         The gap between copy and delete was 3px — one thumb covers both. */
      css += '.row-actions{gap:8px}';

      if (ON.dupLabel) {
        /* كلمة «نسخ» على زر التكرار — بأقصر لفظ عمداً: النص الكامل
           «نسخ كمستند جديد» (i18n.js:47) كان سيوسّع العمود المثبّت ~110px
           ويهزم الإصلاح ٤ على نفس الشاشة.
           Deliberately the SHORT word: the full label would widen the
           pinned column ~110px and defeat fix 4 on the same screen. */
        css += 'html[dir="rtl"] .row-btn[data-act="dup"]::after{content:"نسخ"}';
        css += 'html[dir="ltr"] .row-btn[data-act="dup"]::after{content:"Copy"}';
        css += '.row-btn[data-act="dup"]{width:auto;padding:0 9px;gap:5px;' +
               'grid-auto-flow:column;font-size:12px}';
      }
      css += '}';
    }

    var tag = document.createElement('style');
    tag.id = 'azScreenBehaviourStyle';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ══════════════════════════ التركيب · INSTALL ══════════════════════════
     كل جزء داخل try خاصته — فشل واحد لا يطفئ البقية.
     Each part in its own try — one failure never darkens the rest. */
  try { if (ON.leaveGuard) { installModalWrap(); installCloseWrap(); installLeaveListeners(); } } catch (e1) { console.error('screen-behaviour: leaveGuard', e1); }
  try { if (ON.errorScroll) installErrorScroll(); } catch (e2) { console.error('screen-behaviour: errorScroll', e2); }
  try { if (ON.foldEmpty) installFoldEmpty(); } catch (e3) { console.error('screen-behaviour: foldEmpty', e3); }
  try { injectStyle(); } catch (e4) { console.error('screen-behaviour: style', e4); }

})(typeof window !== 'undefined' ? window : this);
