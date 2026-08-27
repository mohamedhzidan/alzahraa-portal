/* Al Zahraa Portal PWA shell cache. Business records stay in encrypted IndexedDB.
   ---------------------------------------------------------------------------
   v2.0.16 — 27 أغسطس ٢٠٢٦ (حُدِّثت هذه الدفعة نفسها لاحقاً — انظر البند ٥)
   عند كتابتها أولاً كانت «لا ملف جديد» فعلاً. لم تُنشر هذه النسخة بعد على
   الموقع الحيّ (تحقّقنا بقراءة service-worker.js الحيّ فعلياً: لا يزال على
   v2.0.15) فأُلحِق بها بعد ذلك ملفان جديدان (البند ٥) بلا حاجة لرقم نسخة
   آخر — لأن اسم الذاكرة v2.0.16 نفسه لم يُنشر لأي متصفح موظف بعد، فأي رفع
   له سيكون تنزيلاً كاملاً جديداً يشمل كل شيء تلقائياً، لا فرقاً جزئياً.
   هذه النسخة تجمع خمسة أشياء الآن:

     ١) إصلاح موقع المرفقات: attachments.js يحمل الآن ختم الموقع الصحيح
        على كل ملف مرفوع (كان الأمر ٩.١ في السجل).
     ٢) تأمينات الرواتب: payroll-insurance.js يحسب أجر الاشتراك التأميني
        والخصم آلياً (٣٣٠ عن الموظف، ٥٦٢٫٥ عن الشركة عند حد أدنى ٣٠٠٠ جنيه)
        بدل الصفر الذي كان يظهر دائماً.
     ٣) الزرّان الميتان: audit-trail.js وdc-requests.js كانا يبحثان عن
        class="modal-footer" غير الموجودة في الموقع أبداً؛ الاسم الصحيح
        .modal-foot. بسبب هذا لم يكن زر «⊘ إلغاء المستند / ↩ استعادة» يظهر
        قط (فالاستعادة مستحيلة وكل إلغاء يُسجَّل بسبب فارغ)، ولا زر
        «📎 مرفقات» الذي طلبه أ. أحمد عبد الحي بالاسم.
     ٤) كشف حضور الموقع (قيد العمل بالتوازي مع هذه الدفعة): إصلاح عطل
        يمنع القائمة من الرسم إطلاقاً بمجرد وجود سجل واحد.
     ٥) تقويم النقدية لاثني عشر أسبوعاً — ملفان جديدان:
        · expected-collection-field.js يضيف «متوقع تحصيله في» لمستخلصات
          العميل (تقدير فريقنا، لا وعد العميل).
        · cash-forecast.js يبني تبويب «توقعات النقدية» داخل صفحة التقارير:
          كل ما سيخرج مؤكداً (فواتير موردين · مستخلصات باطن · رواتب · سلف
          · عمالة يومية) مقابل كل ما يُتوقَّع دخوله تقديرياً، أسبوعاً
          بأسبوع، مع تحذير واضح أول أسبوع تنكشف فيه الخزينة.
        قاصر على من يرى أموال الشركة كاملة (admin · gm · finance_manager)
        فقط — نفس قاعدة roleview.js الموجودة، لا بوابة جديدة.
     ٦) الأرقام العشرية لم تعد تُقرَّب: منسوب مساحي 98.76 كان يظهر ويُطبَع
        99 (فرق 24 سم على شيت مناسيب موقَّع)، وحجم خرسانة 7.5 م³ كان يظهر
        8 — ملف واحد جديد: number-decimals.js. money/percent/calc غير
        متأثرة، لها تنسيقها الخاص أصلاً.

   بلا هذا الرقم، يستمر متصفح كل موظف في خدمة الملفات القديمة إلى الأبد —
   رغم رفع كل الملفات أعلاه فعلاً — لأن اسم الذاكرة نفسه لم يتغيّر فلا
   يعرف المتصفح أن هناك جديداً ليحذف القديم من أجله.

   v2.0.16 — 27 August 2026 (this same batch was extended later — see item 5)
   When first written this really was "no new file." This version has
   never been published to the live site (confirmed by actually reading
   the live service-worker.js: it is still on v2.0.15), so two new files
   (item 5) were added to it afterwards with no need for a further version
   number — because the name v2.0.16 itself has never reached any
   employee's browser yet, so uploading it will be a full fresh install
   that picks up everything automatically, not a partial diff. This
   version now bundles five things:

     1) Attachments site fix: attachments.js now stamps the correct site
        on every uploaded file (roadmap item 9.1).
     2) Payroll insurance: payroll-insurance.js now computes the
        registered insurance wage and its deduction automatically (330
        from the employee, 562.5 from the company at the 3000 EGP
        minimum) instead of the zero that always showed before.
     3) The two dead buttons: audit-trail.js and dc-requests.js were both
        looking for class="modal-footer", which never exists anywhere on
        the site — the real class is .modal-foot. Because of this, «⊘
        Cancel document / ↩ Restore» never rendered at all (restores were
        impossible and every cancellation recorded an empty reason), and
        neither did the «📎 Attachments» button أ. أحمد عبد الحي asked
        for by name.
     4) Site attendance (being built in parallel with this batch): a fix
        for the fault that stops the list from rendering at all as soon
        as one record exists.
     5) The 12-week cash calendar — two new files:
        · expected-collection-field.js adds "expected collection date" to
          client IPCs (our team's estimate, never a client promise).
        · cash-forecast.js builds a "Cash forecast" tab inside the
          Reports page: everything firm going out (supplier invoices,
          subcontractor certificates, payroll, advances, daily labour)
          against everything estimated coming in, week by week, with a
          clear warning at the first week the cash box runs short.
        Restricted to whoever sees the company's full money (admin, gm,
        finance_manager) only — the same existing roleview.js rule, no
        new gate invented.
     6) Decimal numbers no longer round away: a survey level of 98.76 used
        to display AND print as 99 (a 24cm gap on a signed levels sheet),
        and a concrete volume of 7.5 m³ showed as 8 — one new file:
        number-decimals.js. money/percent/calc are unaffected; they already
        have their own formatting.

   Without this new number, every employee's browser keeps serving the
   old files forever — even though everything above is already
   uploaded — because the cache's own name never changed, so the browser
   never learns there is anything new to replace the old with.
   ---------------------------------------------------------------------------
   v2.0.15 — 27 أغسطس ٢٠٢٦
   لا ملف جديد — عُدِّل ملفان موجودان في مكانهما: save-modes.js وsave-guard.js.
   إصلاح أربعة أعطاب في «مسودة حتى الاتصال» ونافذة عمليات الحفظ المرفوضة:
   الزر الذهبي كان يتجاهل الطابور المحلي إن وُجد اتصال فيحرم الموظف من
   الحماية بالضبط حين يحتاجها؛ إعادة محاولة الرفع كانت تحذف المسودة القديمة
   قبل التأكد من نجاح الإضافة الجديدة؛ نافذة المراجعة كانت تعرض نص الخطأ
   الخام فقط دون القيم المكتوبة وكان زر «امسح» هو الافتراضي الخطير؛ وشارة
   الأسفل كانت تكتب «تعارضات» لرفض عادي لم يشترك فيه أحد آخر.

   بلا رفع هذا الملف، سيستمر متصفح كل موظف في تقديم النسختين القديمتين من
   save-modes.js وsave-guard.js إلى الأبد — رغم رفع الملفين الجديدين —
   لأن رقم النسخة هو ما يجبر المتصفح على حذف الذاكرة القديمة والتحديث.

   v2.0.15 — 27 August 2026
   No new file — two existing files changed in place: save-modes.js and
   save-guard.js. Fixed four faults in "Draft until connected" and the
   refused-saves review window: the gold button used to skip the local
   queue whenever a connection existed, denying the employee protection at
   exactly the moment it was needed; a retry used to delete the old draft
   before confirming the new one had actually been added; the review
   window showed only the raw error text, not the typed values, and
   "Clear" was the dangerous default button; and the footer badge said
   "Conflicts" for an ordinary refusal nobody else was involved in.

   Without uploading this file, every employee's browser keeps serving the
   two OLD copies of save-modes.js and save-guard.js forever — even after
   the two changed files are uploaded — because the version number is
   what forces the browser to drop the old cache and refresh.
   ---------------------------------------------------------------------------
   v2.0.14 — 26 أغسطس ٢٠٢٦
   ملف جديد واحد: import-documents.js — يجعل زر «⬆ استيراد» الموجود يقرأ
   PDF ووورد وأوتوكاد أيضاً، لا الإكسل فقط، ويميّز رسمة PDF عن مستند PDF
   تلقائياً. لا يُعدَّل import.js ولا attachments.js ولا attachment-reader.js.

   رقم النسخة ارتفع من v2.0.13 (وهو مُستهلَك — يخدم الموقع الحيّ اليوم،
   تأكَّد بقراءة service-worker.js الحيّ فعلياً قبل الترقيم) لإجبار المتصفح
   على حذف النسخة القديمة، وإلا استمر في تقديم الملفات القديمة بلا الملف
   الجديد حتى لو رُفع.

   v2.0.14 — 26 August 2026
   One new file: import-documents.js — makes the existing «⬆ Import» button
   read PDF, Word and AutoCAD too, not spreadsheets only, and tells a PDF
   drawing apart from a PDF document automatically. import.js, attachments.js
   and attachment-reader.js are all untouched.

   Bumped from v2.0.13 — which is SPENT, it is what the live site runs today
   (confirmed by actually reading the live service-worker.js before
   numbering) — to force the browser to drop the old cache; otherwise it
   keeps serving the old file set, missing the new file, even after upload.
   ---------------------------------------------------------------------------
   v2.0.12 — 26 أغسطس ٢٠٢٦
   ثمانية ملفات جديدة من ورقتَي الاكتشاف معاً:

   من ورقة ضبط المستندات — أ. أحمد عبد الحي، ١٥ أغسطس:
     · dc-alerts.js         ردود متأخرة، إخطارات تعاقدية، نسخة قديمة بالموقع
     · dc-tuning.js         تعديلات شاشات ضبط المستندات من إجاباته الفعلية

   من ورقة الموارد البشرية — أ. محمد عمارة، ١٥ أغسطس:
     · calc-formulas.js     ثمانية حقول محسوبة كانت تعرض صفراً دائماً
     · advance-balance.js   «المسدَّد» و«المتبقي» الحقيقيان على السلف
     · employee-statement.js كشف حساب الموظف — أول ما طلبه في ورقته
     · hr-alerts.js         الرقم القومي، رخصة القيادة، مصوغات التوظيف
     · payroll-net.js       صافي الراتب يحسب البنود الثمانية على الشاشة

   وبطلب محمد زيدان «أصلحها لكل الأقسام لا لشاشات أحمد الخمس فقط»:
     · doc-numbering.js     أرقام مستندات حقيقية لكل الشاشات وكل الأقسام
                            (نصفها الآخر: 1-SUPABASE/30-DOCUMENT-NUMBERING.sql)

   ⚠️ نُقل الترقيم من dc-tuning.js إلى doc-numbering.js، فلا توجد نسختان
      من منطق الترقيم.

   رقم النسخة ارتفع من v2.0.11 (وهو مُستهلَك — يخدم الموقع الحيّ اليوم)
   لإجبار المتصفح على حذف النسخة القديمة، وإلا استمر في تقديم الملفات
   القديمة دون هذه الملفات حتى لو رُفع الجديد.

   v2.0.12 — 26 August 2026
   Eight new files, from both discovery sheets at once.

   From the Document Control sheet (Ahmed Abdelhay, 15 August):
   dc-alerts.js (overdue replies, contractual notice deadlines, superseded
   copy still on site) and dc-tuning.js (the DC screens tuned to his actual
   answers).

   From the HR sheet (Mohamed Amara, 15 August): calc-formulas.js (eight
   calculated fields that always showed zero), advance-balance.js (real
   repaid/outstanding on advances), employee-statement.js (the account
   statement, the first thing he asked for), hr-alerts.js (national ID,
   driving licence, recruitment documents) and payroll-net.js (net pay
   counts the eight items that are on the screen).

   And from Mohamed Zidan's instruction to fix numbering for every
   department rather than Ahmed's five screens only: doc-numbering.js,
   whose other half is 1-SUPABASE/30-DOCUMENT-NUMBERING.sql.

   ⚠️ Numbering MOVED out of dc-tuning.js into doc-numbering.js — there are
      not two copies of the numbering logic.

   Bumped from v2.0.11 — which is SPENT, it is what the live site runs
   today — to force the browser to drop the old cache; otherwise it keeps
   serving the old file set, missing all eight, even after the upload.
   ---------------------------------------------------------------------------
   v2.0.11 — 26 أغسطس ٢٠٢٦
   لا ملف جديد — auth.js نفسه تغيّر (طلب فحص المواد صار يعتمده مدير
   المشروع والمكتب الفني معاً، لا المدير العام وحده). auth.js موجود
   أصلاً في قائمة الغلاف أدناه، فيظل المتصفح يقدّم نسخته القديمة من
   الذاكرة المؤقتة إلى الأبد ما لم يتغيّر اسم النسخة — تعديل صلاحية
   داخل auth.js يحتاج اسم ذاكرة جديداً تماماً كملف جديد. هذا هو فخ
   AUDIT-25 يظهر للمرة الرابعة.

   v2.0.11 — 26 August 2026
   No new file — auth.js itself changed (a Material Inspection Request
   is now signed by both the project manager and the technical office,
   not the general manager alone). auth.js is already in the shell list
   below, so without a new cache name the browser keeps serving its old
   cached copy forever — a permission change inside auth.js needs a new
   cache name exactly as much as a brand-new file does. This is the
   AUDIT-25 trap's fourth appearance.
   ---------------------------------------------------------------------------
   v2.0.10 — 26 أغسطس ٢٠٢٦
   أُضيف ملفان جديدان:
     · client-ipc-withholding.js  (خصم وتحصيل الضريبة على مستخلصات العميل)
     · lookup-loader.js           (يملأ قوائم اختيار lookup الفارغة)
   رقم النسخة ارتفع من v2.0.9 (وهو رقم الحزمة الأولى، لم يُنشر بعد —
   الموقع الحيّ ما زال على v2.0.8 وقت كتابة هذا السطر)
   لإجبار المتصفح على حذف النسخة القديمة، وإلا استمر في تقديم الملفات
   القديمة دون هذين الملفين حتى لو رُفع الجديد.

   v2.0.10 — 26 August 2026
   Two new files added: client-ipc-withholding.js (withholding tax on
   client IPCs) and lookup-loader.js (fills previously-empty lookup
   dropdowns). Bumped from v2.0.9 — the FIRST batch's number, not yet
   published; the live site was still on v2.0.8 when this was written.
   Both v2.0.9 and v2.0.10 are unspent, so batch one must go up before
   batch two or batch one's loader would un-wire these two files.
   The bump forces the browser to drop the old cache; otherwise it keeps
   serving the old file set, missing both, even after the upload.
   (This header first wrongly claimed v2.0.9 was already live — caught
   by integrator before hand-off. Getting this number wrong is the
   AUDIT-25 trap, and it has now come up three times.)
   ---------------------------------------------------------------------------

   v2.0.9 — 26 أغسطس ٢٠٢٦
   أُضيفت أربعة ملفات جديدة:
     · hr-manager-links.js  (يوصّل مدير الموارد البشرية بخبرة/فحوصات/لوحة hr)
     · money-owed.js        (المبلغ المسدَّد/المحصَّل الحقيقي من السندات المعتمدة)
     · hr-signals.js        (تاريخ انتهاء العقد الحقيقي وحضور اليوم الحقيقي)
     · version-badge.js     (رقم النسخة في التذييل من الذاكرة الفعلية)
   رقم النسخة ارتفع من v2.0.8 (وهو مُستهلَك بالفعل — يخدم الموقع الحيّ
   اليوم) لإجبار المتصفح على حذف النسخة القديمة، وإلا استمر في تقديم
   الملفات القديمة دون هذه الملفات الأربعة حتى لو رُفع الجديد.

   v2.0.9 — 26 August 2026
   Four new files added: hr-manager-links.js (links the HR manager role
   into HR knowledge/checks/dashboard), money-owed.js (the real
   paid/collected amounts from approved vouchers), hr-signals.js (the
   real contract-expiry date and real headcount present today), and
   version-badge.js (footer version read from the real cache). The
   version was bumped from v2.0.8 — which is SPENT, it is what the live
   site runs today — to force the browser to drop the old cache;
   otherwise it keeps serving the old file set, missing all four, even
   after the upload.
   ---------------------------------------------------------------------------

   v2.0.8 — 26 أغسطس ٢٠٢٦ (تاريخي · historical)
   أُضيفت أربعة ملفات: retention-release-field.js · one-step-approval.js ·
   report-access.js · audit-security-events.js.

   ⚠️ خطأ صُحِّح حينها: كُتبت تلك النسخة أولاً باسم v2.0.7 — رقم كان قد
   استُهلك بالفعل في نشر ٢٥ أغسطس. ولأن المتصفح لا يحذف إلا ما اختلف
   اسمه، كان الرفع سيبدو ناجحاً ولا يصل الملف الجديد لأحد. هذا الفخ
   نفسه هو سبب حرص v2.0.9 أعلاه على التأكد أن v2.0.8 مُستهلَك فعلاً قبل
   الترقيم.

   Four files were added then: retention-release-field.js,
   one-step-approval.js, report-access.js, audit-security-events.js.
   CORRECTED at the time: first written as v2.0.7 — already spent by the
   25 August deploy. Since the browser only deletes caches whose name
   DIFFERS, the upload would have looked successful and reached no one.
   This exact trap is why v2.0.9 above double-checked that v2.0.8 was
   truly spent before numbering.
   ---------------------------------------------------------------------------
   TWO CHANGES IN v2.0.2 — both matter:

   1) CACHE NAME BUMPED  v2.0.1 → v2.0.2
      The activate handler deletes every cache whose name is not the current
      one. If the name had stayed the same, browsers would have kept serving
      the OLD auth.js and loader.js out of the cache, and the upload would
      have looked like it did nothing.

      تغيير رقم النسخة يجبر المتصفح على حذف النسخة القديمة. بدونه سيظل
      الموقع يعمل بالملفات القديمة ولو رفعت الجديدة.

   2) SIX NEW FILES ADDED to the shell list.
      Without them the AI and the two new departments would not have been
      available offline — which is the one thing that was asked for most.

      بدون إضافتها لن يعمل الذكاء الاصطناعي ولا القسمان الجديدان بدون إنترنت.
   --------------------------------------------------------------------------- */
var CACHE = 'alzahraa-shell-v2.0.16';

var SHELL = [
  './', './index.html', './manifest.webmanifest', './robots.txt',

  './assets/css/styles.css', './assets/css/brand.css',

  './assets/img/favicon.svg', './assets/img/icon-192.png', './assets/img/icon-512.png',
  './assets/img/logo-full.svg', './assets/img/logo-mark.svg',
  './assets/img/logo-mark-white.svg', './assets/img/logo-stacked.svg',

  './assets/vendor/chart-4.4.1.umd.js', './assets/vendor/supabase-2.112.3.js',

  './assets/js/frame-guard.js', './assets/js/loader.js', './assets/js/env.js',
  './assets/js/config.js', './assets/js/offline-db.js', './assets/js/i18n.js',
  './assets/js/store.js', './assets/js/schema.js',

  /* ── جديد في v2.0.16 · NEW in v2.0.16 ──────────────────────────────── */
  /* تقويم النقدية لاثني عشر أسبوعاً — «متوقع تحصيله في» على مستخلصات
     العميل، ثم تبويب «توقعات النقدية» في صفحة التقارير.
     The 12-week cash calendar — "expected collection date" on client
     IPCs, then the "Cash forecast" tab inside the Reports page. */
  './assets/js/expected-collection-field.js',
  './assets/js/cash-forecast.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.14 · NEW in v2.0.14 ──────────────────────────────── */
  /* PDF ووورد وأوتوكاد من نفس زر «استيراد»، وتمييز رسمة PDF عن مستندها
     PDF, Word and AutoCAD from the same Import button, and telling a PDF
     drawing apart from a PDF document */
  './assets/js/import-documents.js',
  /* ذاكرة ربط الأعمدة، عيّنات إضافية، تحذير الحقول المطلوبة وعلامات الثقة
     على نافذة الربط اليدوي — رقم CACHE لم يُرفع لهذا الملف عمداً، يُجمَّع مع
     الدفعة التالية. Column-mapping memory, extra samples, a required-field
     warning and confidence markers on the manual mapping dialog — CACHE was
     deliberately not bumped for this file alone; it is batched with the
     next release. */
  './assets/js/import-mapping-plus.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.12 · NEW in v2.0.12 ──────────────────────────────── */
  /* ردود متأخرة، إخطارات تعاقدية، نسخة قديمة على الموقع
     overdue replies, contractual notice deadlines, superseded copy on site */
  './assets/js/dc-alerts.js',
  /* تعديلات شاشات ضبط المستندات على إجابات أ. أحمد عبد الحي
     the document-control screens tuned to Ahmed Abdelhay answers */
  './assets/js/dc-tuning.js',

  /* الصيغ المكتوبة كدوالّ — ثمانية حقول في الموارد البشرية كانت صفراً
     function-style formulas — eight HR fields were reading zero */
  './assets/js/calc-formulas.js',
  /* أرقام مستندات حقيقية لكل الشاشات وكل الأقسام
     real document numbers, every screen, every department */
  './assets/js/doc-numbering.js',
  /* «المسدَّد» و«المتبقي» الحقيقيان على سلف الموظفين
     the real repaid and outstanding figures on employee advances */
  './assets/js/advance-balance.js',
  /* كشف حساب الموظف — السلف وخصمها
     the employee account statement — advances and their deduction */
  './assets/js/employee-statement.js',
  /* شيت مناسيب · طلب خرسانة جاهزة · إذن فحص مواد داخلي — ثلاث شاشات جديدة
     للمكتب الفني. رقم CACHE لم يُرفع لهذا الملف عمداً، يُجمَّع مع الدفعة
     التالية، بنفس أسلوب import-mapping-plus.js وsite-options.js أعلاه.
     Levels sheet, ready-mix concrete request, internal material
     inspection permit — three new technical-office screens. CACHE was
     deliberately not bumped for this file alone; batched with the next
     release, same pattern as import-mapping-plus.js and site-options.js
     above. */
  './assets/js/sheets-templates.js',
  /* قراءة الملفات المرفقة — الملفات الخمسة صغيرة وتُخزَّن مسبقاً.
     مكتبات vendor الكبيرة ليست هنا عمداً: يلتقطها التخزين أثناء الاستعمال
     (السطور ٣٠٣-٣٢١) عند أول قراءة، فتعمل بلا إنترنت بعدها.
     Reading attached files — these five are small and pre-cached. The big
     vendor libraries are deliberately NOT here: the runtime cache picks
     them up on first use (lines 303-321), so they work offline after that. */
  './assets/js/arabic-text.js',
  './assets/js/read-docx.js',
  './assets/js/read-pdf.js',
  './assets/js/read-dwg.js',
  './assets/js/attachment-reader.js',
  /* تنبيهات الرقم القومي ورخصة القيادة ومصوغات التوظيف والسلف المتعثّرة
     national ID, driving licence, recruitment file and stuck-advance alerts */
  './assets/js/hr-alerts.js',
  /* صافي الراتب يحسب البنود الثمانية المكتوبة على الشاشة
     net pay counts the eight items that are on the screen */
  './assets/js/payroll-net.js',
  /* أجر الاشتراك التأميني وحساب التأمينات آلياً — بلا إنترنت أيضاً، فيبقى
     ملء خانتي التأمينات يعمل في الموقع حتى بلا اتصال.
     Insurance wage and computing insurance automatically — offline too, so
     the two insurance boxes still fill on site with no connection. */
  './assets/js/payroll-insurance.js',
  /* ملاحظات ما قبل اعتماد الرواتب — سبع فحوص قراءة فقط، جزء من دفعة
     v2.0.16 أعلاه. لا يحفظ ولا يعدّل شيئاً، فيعمل بلا إنترنت مثل بقية
     ملفات الرواتب هنا.
     Payroll pre-approval notes — seven read-only checks, part of the
     v2.0.16 batch above. Saves and changes nothing, so it works offline
     like the rest of the payroll files here. */
  './assets/js/payroll-review-flags.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.10 · NEW in v2.0.10 ──────────────────────────────── */
  /* خصم وتحصيل الضريبة على مستخلصات العميل
     withholding tax on client IPCs */
  './assets/js/client-ipc-withholding.js',
  /* يملأ قوائم اختيار lookup الفارغة
     fills previously-empty lookup dropdowns */
  './assets/js/lookup-loader.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.9 · NEW in v2.0.9 ──────────────────────────────── */
  /* يوصّل مدير الموارد البشرية بخبرة/فحوصات/لوحة hr
     links the HR manager role into HR knowledge/checks/dashboard */
  './assets/js/hr-manager-links.js',
  /* المبلغ المسدَّد/المحصَّل الحقيقي من السندات المعتمدة
     the real paid/collected amounts from approved vouchers */
  './assets/js/money-owed.js',
  /* تاريخ انتهاء العقد الحقيقي وحضور اليوم الحقيقي
     the real contract-expiry date and real headcount present today */
  './assets/js/hr-signals.js',
  /* رقم النسخة في التذييل من الذاكرة الفعلية
     footer version read from the real cache */
  './assets/js/version-badge.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.8 · NEW in v2.0.8 ──────────────────────────────── */
  './assets/js/retention-release-field.js',
  /* يفكّ عَلَق مستندات التوقيع الواحد · unsticks one-step documents */
  './assets/js/one-step-approval.js',
  /* يخفي زر التقارير عمّن لا تقارير له · hides Reports where empty */
  './assets/js/report-access.js',
  /* أحداث الأمان للسجل الدائم · security events to the permanent log */
  './assets/js/audit-security-events.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── NEW in v2.0.2 · الجديد في هذه النسخة ────────────────────────────
     departments.js must be cached, or the Site Engineers and Document
     Control screens vanish the moment the connection drops.
     The other five are the assistant: without them a site engineer with
     no signal loses every check and every piece of job knowledge. */
  './assets/js/departments.js',
  './assets/js/hr-department.js',
  './assets/js/dc-requests.js',
  './assets/js/save-guard.js',
  './assets/js/access-check.js',
  './assets/js/audit-trail.js',
  './assets/js/sites.js',
  /* يصحّح تسريب قائمة «الموقع» (سوهاج تصل للروبيكي) وعطلاً كامناً في اطّلاع
     القرين/المكتب — رقم CACHE لم يُرفع لهذا الملف عمداً، يُجمَّع مع الدفعة
     التالية، بنفس أسلوب import-mapping-plus.js أعلاه (v2.0.14).
     Fixes the "site" dropdown leak (Sohag reaching Elrobaki) and a latent
     Elqurien/HQ visibility bug — CACHE deliberately not bumped for this
     file alone; batched with the next release, same pattern as
     import-mapping-plus.js above (v2.0.14). */
  './assets/js/site-options.js',
  './assets/js/knowledge.js',
  './assets/js/inspector.js',
  './assets/js/inspector-departments.js',
  './assets/js/assistant-pro.js',
  './assets/js/agents.js',
  './assets/js/save-modes.js',
  './assets/js/attachments.js',
  './assets/js/import.js',
  './assets/js/workflow-policy.js',
  /* ─────────────────────────────────────────────────────────────────── */

  './assets/js/auth.js', './assets/js/identity.js', './assets/js/workflow.js',
  './assets/js/ui.js',
  /* يمنع تقريب الأرقام العشرية إلى صحيح عند العرض والطباعة (منسوب 98.76
     كان يُطبَع 99) — جزء من دفعة v2.0.16 غير المنشورة بعد، فلا حاجة لرقم
     نسخة جديد (نفس منطق import-mapping-plus.js وsheets-templates.js أعلاه).
     Stops decimal fields rounding to a whole number on screen and print
     (a level of 98.76 used to print as 99) — part of the still-unpublished
     v2.0.16 batch, so no new CACHE number is needed (same logic as
     import-mapping-plus.js and sheets-templates.js above). */
  './assets/js/number-decimals.js',
  './assets/js/rules.js', './assets/js/print.js',
  './assets/js/alerts.js', './assets/js/roleview.js', './assets/js/assistant.js',

  './assets/js/pages/dashboard.js', './assets/js/pages/dashboard-render.js',
  './assets/js/pages/entity.js', './assets/js/pages/approvals.js',
  './assets/js/pages/reports.js', './assets/js/pages/settings.js',

  /* هاتف المهندس بالموقع — لمس أكبر وشريط حالة وإجراءات سريعة موحّدة،
     يعمل بلا اتصال أيضاً. The site engineer's phone — bigger touch
     targets, a status strip, unified quick actions; works offline too. */
  './assets/js/mobile-field.js',

  './assets/js/app.js'
];

/* cache.addAll() is all-or-nothing: one missing file and the whole service
   worker fails to install, leaving no offline support at all and no clue why.
   We try the fast path first, and if it fails we cache each file individually
   and name the ones that did not make it in the console. Offline support then
   still works for everything that did arrive.

   الطريقة السريعة أولاً، فإن فشلت نخزّن كل ملف على حدة ونطبع أسماء الملفات
   الناقصة، بدل أن يفشل كل شيء بصمت. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).catch(function (firstError) {
        console.warn('[SW] bulk cache failed, falling back to one-by-one:', firstError);
        var missing = [];
        return Promise.all(SHELL.map(function (path) {
          return cache.add(path).catch(function () { missing.push(path); });
        })).then(function () {
          if (missing.length) {
            console.error('[SW] these files are NOT available offline:', missing);
          } else {
            console.info('[SW] all shell files cached on the second attempt.');
          }
        });
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE;
    }).map(function (key) {
      console.info('[SW] deleting old cache:', key);
      return caches.delete(key);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(event.request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || (event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Promise.reject(new Error('offline')));
      });
    }));
  }
});
