/* =========================================================================
   project-site-field.js — «الموقع» على شاشة المشروعات
                            A "site" field on the Projects screen
   -------------------------------------------------------------------------
   العطل الذي يمنعه هذا الملف · THE BUG THIS FILE PREVENTS

   08-SITES.sql/sites.js أضافا عمود وحقل site لثلاثين شاشة، لكن «المشروعات»
   لم تكن بينها. فاسم الموقع بقي داخل اسم المشروع نفسه («مشروع سوهاج —
   رصف الطرق»)، وقائمة «المشروع» المنسدلة على شاشات أحمد في الروبيكي
   تعرض مشروع سوهاج كاملاً بلا أي تمييز — التسريب في الاسم نفسه، لا في
   سجلات مرتبطة به (مطابق تماماً لِما أثبته 36-SITES-READ-SCOPE.sql عن
   جدول sites نفسه).

   08-SITES.sql/sites.js added a site column and field to thirty screens,
   but "Projects" was not one of them. So the site's name stayed baked
   inside the project's own name ("Sohag — road paving project"), and the
   "Project" dropdown on Ahmed's screens at Elrobaki shows the whole Sohag
   project with no distinction at all — the leak is in the name itself,
   not in records that point at it (exactly what 36-SITES-READ-SCOPE.sql
   already proved for the sites table itself).

   -------------------------------------------------------------------------
   لماذا هذا كافٍ لتقييد القوائم أيضاً · WHY THIS ALONE ALSO SCOPES LISTS

   sites.js:229-238 (scopeBySite) لا تفحص اسم الشاشة — تفحص فقط: «هل تملك
   هذه الوحدة حقلاً اسمه site؟». بمجرد أن يصبح لـ projects هذا الحقل،
   يدخل تلقائياً تحت نفس التصفية التي تعمل بها كل الشاشات الثلاثين
   الأخرى — بلا أي كود إضافي هنا.

   sites.js:229-238 (scopeBySite) does not check the screen's name — only
   "does this module have a field called site?". The moment projects has
   that field, it automatically falls under the exact same filtering that
   already runs the other thirty screens — no extra code needed here.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the projects module
   loses the site field again — sites.js's scopeBySite() stops touching
   "projects" (it keys purely on "does this module have a field named
   site"), and SQL 38 alone leaves the column NULL for everyone (visible
   to all, per az_can_site(null) = true), so nothing breaks; the leak
   this file closes simply returns.

   يُحمَّل بعد sites.js (يحتاج SITE_FIELD نفس شكله، ويحتاج scopeBySite
   جاهزة لتلتقط الحقل الجديد).
   Load after sites.js (matches its SITE_FIELD shape, and needs
   scopeBySite already installed to pick the new field up).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('project-site-field.js needs schema.js first'); return; }
  var S = global.Schema;

  var mod = S.get('projects');
  if (!mod || !mod.fields) {
    console.error('project-site-field.js: the projects module was not found — nothing changed');
    return;
  }

  if (mod.fields.some(function (f) { return f.name === 'site'; })) {
    console.info('project-site-field.js: projects already has a site field — nothing to do.');
  } else {
    /* نفس شكل SITE_FIELD في sites.js بالحرف — ref إلى sites، refLabel name */
    var field = {
      name: 'site', label: { ar: 'الموقع', en: 'Site' }, type: 'ref',
      ref: 'sites', refLabel: 'name',
      section: { ar: 'البيانات الأساسية', en: 'Main information' },
      help: { ar: 'الموقع الذي يتبعه هذا المشروع — يحدّد من يراه في القوائم المنسدلة والسجلات',
              en: 'The site this project belongs to — decides who sees it in dropdowns and lists' }
    };
    /* بعد «مدير المشروع» مباشرة — نفس منطق sites.js: يلي حقل project حيث
       وُجد؛ هنا لا يوجد project (هذه هي شاشة المشروعات نفسها)، فنضعه
       بجوار آخر حقل «مكاني» (manager) بدل أول الشاشة.
       Straight after "Project manager" — same logic sites.js uses
       elsewhere (follow the project field where one exists); here there
       is no project field (this IS the projects screen), so it follows
       the nearest "where" field instead. */
    var i = mod.fields.findIndex(function (f) { return f.name === 'manager'; });
    if (i === -1) mod.fields.push(field); else mod.fields.splice(i + 1, 0, field);
    console.info('project-site-field.js: site field added to projects, after "manager".');
  }

  global.ProjectSiteField = { installed: true };
})(window);
