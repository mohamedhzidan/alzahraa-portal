/* =========================================================================
   delete-honesty.js — «تم الحذف» يجب أن تعني أنه حُذف
   delete-honesty.js — "Deleted" must mean it was deleted

   ── العطل ───────────────────────────────────────────────────────────────
   pages/entity.js:302 يفعل هذا بالضبط:

       Store.destroy(mod.table, id);
       UI.toast(t('g.deleted'));          ← «تم الحذف»، أياً كانت النتيجة
       render(moduleId, host);

   والقيمة المُعادة تُرمى. وStore.destroy الحيّة ليست تلك التي في store.js:
   audit-trail.js يستبدلها بالكامل بـcancelRecord — «الحذف صار إلغاءً» —
   وهي تُعيد **false** حين يُرفض الحفظ (audit-trail.js: `if (!saved) return
   false;`)، وstore.js الأصلية تُعيد false أيضاً بلا اتصال
   (`if (!writableOnline()) { notifyBlocked(); return false; }`).

   فالنتيجة على الشاشة: يقال له **«تم الحذف»** ثم يُعاد رسم القائمة
   **والصفّ ما زال فيها**. الرسالة تناقض ما يراه بعينه في اللحظة نفسها.

   ── لماذا هذا أهون من إخوته، ومع ذلك يُصلَح ─────────────────────────────
   **لا شيء يضيع هنا**: السجل باقٍ، والصفّ ظاهر، والتناقض مرئيّ. هذا خطأ في
   الرسالة لا فقدان عمل — ولذلك رُتّب بعد المال والمرفقات. لكنّ ترك فردٍ من
   عائلةٍ بلا إصلاح بينما تُصلَح إخوته هو الخطأ الذي وقع فيه هذا المشروع
   أربع مرّات في يوم واحد، فيُصلَح.

   ── الشكل ───────────────────────────────────────────────────────────────
   ١) **إضافي بالكامل** — نلفّ Store.destroy ولا نلمس pages/entity.js، وهو
      ملف للقراءة فقط. والسابقة مُثبتة لا مفترضة: audit-trail.js:258 يلفّها
      بالفعل، فالمَغرز حيّ ومستعمَل.
   ٢) 🔴 **الرسالة مؤجَّلة ٦٠ مللي عمداً.** «تم الحذف» تُطلَق **بعد** عودة
      Store.destroy مباشرةً، فرسالةٌ فورية منّا تسبقها ويكون آخر ما يقرأه
      هو الكذبة. التأجيل يجعل **آخر ما على الشاشة هو الحقيقة**. وهو نفس
      النمط المستعمل في import.js:864 وفي إصلاحَي هذه الليلة — لا علاج
      سابع مخترَع.
   ٣) لا نمنع شيئاً ولا نغيّر أي سلوك: الحذف يجري كما كان، والقيمة المُعادة
      تُمرَّر كما هي، فسلسلة اللوافّ القائمة لا تتأثّر.

   ── ENGLISH ─────────────────────────────────────────────────────────────
   pages/entity.js:302 calls Store.destroy, THROWS THE RETURN AWAY, and says
   «تم الحذف» either way — then re-renders with the row still on screen. The
   message contradicts what he can see at that moment.
   The LIVE Store.destroy is not store.js's: audit-trail.js replaces it with
   cancelRecord ("delete is now cancel"), which returns false when the save
   is refused; store.js's original also returns false when offline.
   Nothing is LOST here — the record survives and the contradiction is
   visible — which is why it ranked below the money and attachment work. But
   leaving one member of a family unfixed while fixing its siblings is the
   mistake this project made four times in one day.

   THE SHAPE: fully additive (wrap Store.destroy, never touch the read-only
   pages/entity.js; audit-trail.js:258 already wraps it, so the seam is
   proven) · the message is DEFERRED 60ms on purpose, because «تم الحذف»
   fires immediately after Store.destroy returns and an instant message of
   ours would be overwritten by the lie — deferring makes THE LAST THING ON
   SCREEN THE TRUTH · nothing is blocked and no behaviour changes; the
   return value is passed through untouched.

   احذف هذا الملف من loader.js فيعود السلوك السابق حرفياً.
   Deleting this file from loader.js restores the previous behaviour exactly.
   ========================================================================= */

(function (global) {
  'use strict';

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  function install() {
    if (!global.Store || typeof Store.destroy !== 'function') {
      console.warn('[delete-honesty] Store.destroy is not available — nothing wrapped.');
      return false;
    }
    if (Store.__azDeleteHonesty) return true;
    Store.__azDeleteHonesty = true;

    var inner = Store.destroy;
    Store.destroy = function (table, id) {
      var ok = inner.apply(Store, arguments);

      /* 🔴 التأجيل هو الإصلاح كلّه تقريباً.
         entity.js:302 ينادي Store.destroy ثم **فوراً** UI.toast('تم الحذف').
         فلو تكلّمنا الآن لكتبت رسالتُه فوق رسالتنا وبقيت الكذبة آخر ما يُقرأ.
         بستّين مللي تصل رسالتنا بعدها، فيكون آخر ما على الشاشة هو الحقيقة.
         🔴 The deferral is nearly the whole fix. entity.js:302 calls
         Store.destroy and IMMEDIATELY toasts «تم الحذف». Speaking now would
         let its message overwrite ours and leave the lie as the last thing
         read. At 60ms ours lands after it, so the last thing on screen is
         the truth. Same pattern as import.js:864 — no seventh cure. */
      if (ok === false) {
        setTimeout(function () {
          if (global.UI && UI.toast) {
            UI.toast(L({
              ar: '⛔ لم يُحذف — الرسالة السابقة غير صحيحة. الصفّ ما زال موجوداً، ' +
                  'وغالباً السبب أن الجهاز غير متّصل بالإنترنت. أعد المحاولة بعد عودة الاتصال.',
              en: '⛔ NOT deleted — the previous message was wrong. The row is still there, ' +
                  'most likely because the device is offline. Try again once the connection returns.'
            }), 'error', 12000);
          }
          console.warn('[delete-honesty] destroy refused for ' + table + '/' + id +
                       ' — the row is still present and «تم الحذف» was shown in error');
        }, 60);
      }

      /* القيمة تُمرَّر كما هي — لا نغيّر عقد الدالّة لأحد.
         Passed through untouched — nobody's contract with this function
         changes. */
      return ok;
    };
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  global.DeleteHonesty = { install: install };

  console.info('delete-honesty.js ready — «تم الحذف» now only stands when the row really went.');
})(window);
