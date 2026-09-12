/* =========================================================================
   disabled-button-wrap.js — زرّ الشرح الرمادي ينزل سطراً بدل أن يخرج من الشاشة
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف (وجده الباحث عن الأخطاء، ١١ سبتمبر ٢٠٢٦،
   بمتصفح Chromium حقيقي وملفّات الأنماط الحقيقية):

   كل زرّ في البوابة مضبوط على «لا تكسر السطر أبداً» (styles.css:.btn
   white-space:nowrap). الأزرار الرمادية المعطَّلة في أسفل نافذة المستند هي
   جُمَل شرح لا أسماء أفعال — «لماذا لا تستطيع الاعتماد، ومن يعتمد» — وبعضها
   طويل. على هاتف عرضه ٣٦٠ نقطة تخرج الجملة عن حافة الشاشة، وفي العربية
   (من اليمين لليسار) الجزء الذي يختفي هو **أوّلها** — أي الجزء الذي يقول من
   يعتمد. الملف الذي وُجد ليشرح لا يشرح.

   THE FAULT THIS FILE PREVENTS (found by the bug reporter, 11 Sept 2026,
   in a real Chromium with the real stylesheets): every portal button is set
   to "never break the line" (styles.css .btn white-space:nowrap). The grey
   disabled buttons at the foot of a document window are explanation
   SENTENCES, not action names — "why you cannot approve, and who does" —
   and some are long. On a 360-point phone the sentence runs off the edge,
   and in Arabic (right to left) the part that disappears is its START —
   the part that says who signs. The button that exists to explain does not.

   ---------------------------------------------------------------------
   ما يفعله · WHAT IT DOES
   قاعدة أنماط واحدة، على الأزرار المعطَّلة في أسفل النافذة فقط: اسمح بكسر
   السطر، ولا تتجاوز عرض النافذة. زرّ معطَّل «مؤقتاً» أثناء الحفظ (aria-busy،
   ui.js) مستثنى — نصّه قصير أصلاً، ولا نريد أن يقفز شكله لحظة الضغط.
   One style rule, for DISABLED buttons in the window's foot only: allow
   the line to break, never wider than the window. A button disabled only
   WHILE SAVING (aria-busy, ui.js) is excluded — its label is short anyway,
   and its shape must not jump at the moment of the click.

   لا يمسّ أي زرّ مُفعَّل، ولا أي شاشة أخرى، ولا أي ملف للقراءة فقط.
   سياسة أمان الموقع تسمح بالأنماط المضمَّنة (index.html:23 'unsafe-inline')،
   ونفس الطريقة مستعملة في form-sections.js وmobile-field.js.
   Touches no enabled button, no other screen, no read-only file. The
   site's security policy allows inline styles (index.html:23
   'unsafe-inline'); form-sections.js and mobile-field.js already inject
   style rules the same way.

   إضافي بحت · PURELY ADDITIVE — حذف هذا الملف يعيد الأزرار إلى سطر واحد
   كما كانت قبل ١١ سبتمبر ٢٠٢٦. Deleting this file puts the buttons back on
   one line, exactly as before 11 Sept 2026.

   مُثبَت بالتشغيل · proven by running: TESTS/disabled-button-wrap-trial.js
   (Chromium حقيقي، هاتف ٣٦٠ وسطح مكتب ١٢٨٠ · a real Chromium, 360 phone
   and 1280 desktop)
   ========================================================================= */
(function (global) {
  'use strict';

  var STYLE_ID = 'az-disabled-button-wrap';
  /* ⭐ القاعدة نفسها تقرؤها التجربة من هذا السطر ويقيسها Chromium — لا نسخة
     مكتوبة باليد في التجربة. ⭐ The trial reads THIS line and Chromium
     measures it — never a hand-typed copy inside the trial. */
  var CSS = '.modal-foot .btn:disabled:not([aria-busy]){white-space:normal;text-align:start;max-width:100%;line-height:1.5}';

  function install() {
    var doc = global.document;
    if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return;
    var el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    doc.head.appendChild(el);
  }

  if (global.document && global.document.head) install();
  else if (global.document) global.document.addEventListener('DOMContentLoaded', install);
})(window);
