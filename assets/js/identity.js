/* =========================================================================
   identity.js — أسماء المستخدمين وكلمات المرور والانتقال للبريد لاحقاً
                 Usernames, passwords, and the future move to company email
   -------------------------------------------------------------------------
   🔑 الفكرة الأساسية التي تحميك:
      كل مستند في النظام مرتبط برقم الموظف الداخلي (id) — وليس باسم المستخدم.
      لذلك تستطيع تغيير اسم المستخدم إلى بريد إلكتروني في أي وقت
      دون أن يضيع أي مستند أو توقيع أو سطر في سجل المراجعة.

   🔑 The key idea that protects you:
      Every document is linked to the employee's internal id — never to the
      username. So you can switch usernames to company emails at any time
      without losing a single document, signature or audit-log line.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     SETTINGS
     ═══════════════════════════════════════════════════════════════════ */
  var SETTINGS = {
    /* نطاق بريد الشركة — املأه عندما تشتريه، ثم اضغط زر التحويل */
    companyDomain: '',            /* مثال: 'alzahraa-contracting.com' */

    /* إجبار الموظف على تغيير كلمة المرور أول مرة يدخل فيها */
    forceChangeOnFirstLogin: true,

    /* الحد الأدنى لطول كلمة المرور التي يختارها الموظف بنفسه */
    minPasswordLength: 12
  };

  /* Temporary passwords are generated with Web Crypto and shown once. */
  var WORDS = ['Zahraa', 'Obour', 'Cairo', 'Bridge', 'Tower', 'Steel', 'Nile',
               'Delta', 'Summit', 'Anchor', 'Falcon', 'Cedar', 'Marble',
               'Granite', 'Horizon', 'Pillar', 'Beacon', 'Harbour'];
  var SYMS = ['#', '@', '!', '*'];

  function randInt(n) {
    try {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % n;
    } catch (e) { throw new Error('secure-random-unavailable'); }
  }

  function makePassword() {
    return WORDS[randInt(WORDS.length)] + '-' +
           WORDS[randInt(WORDS.length)] +
           SYMS[randInt(SYMS.length)] +
           String(100000 + randInt(900000)) +
           SYMS[randInt(SYMS.length)];
  }

  /* ------------------------------------------------------------------
     Username from an Arabic (or English) full name.
     "أ. رمضان السيد"  →  "ramadan.elsayed"
     ------------------------------------------------------------------ */
  var AR2LAT = {
    'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'g','ح':'h',
    'خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d',
    'ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m',
    'ن':'n','ه':'h','ة':'a','و':'w','ي':'y','ى':'a','ء':'','ؤ':'o','ئ':'e','ـ':''
  };
  var TITLES = ['أ.', 'م.', 'د.', 'الأستاذ', 'المهندس', 'الدكتور', 'mr', 'eng', 'dr'];

  /* Arabic omits short vowels, so a letter-by-letter conversion gives
     "rmdan" instead of "ramadan". This dictionary covers the names you
     actually meet in an Egyptian company, so usernames look professional.
     Add any name your staff have that comes out wrong. */
  var NAMES = {
    'محمد':'mohamed','احمد':'ahmed','أحمد':'ahmed','محمود':'mahmoud','مصطفى':'mostafa',
    'رمضان':'ramadan','السيد':'elsayed','سيد':'sayed','طارق':'tarek','منصور':'mansour',
    'هالة':'hala','نورهان':'nourhan','صلاح':'salah','كريم':'karim','فؤاد':'fouad',
    'سامي':'samy','عبدالله':'abdullah','عبد':'abd','الله':'allah','مروة':'marwa',
    'حسن':'hassan','حسين':'hussein','عمرو':'amr','عمر':'omar','يوسف':'youssef',
    'عادل':'adel','خالد':'khaled','هشام':'hesham','زيدان':'zidan','ايهاب':'ehab',
    'إيهاب':'ehab','سلمى':'salma','ابراهيم':'ibrahim','إبراهيم':'ibrahim','دينا':'dina',
    'سمير':'samir','جمال':'gamal','صابر':'saber','بدوي':'badawy','الشناوي':'elshenawy',
    'فاطمة':'fatma','علي':'ali','ياسر':'yasser','وليد':'walid','شريف':'sherif',
    'نبيل':'nabil','رامي':'ramy','هاني':'hany','ايمن':'ayman','أيمن':'ayman',
    'اسلام':'islam','إسلام':'islam','سعيد':'saeed','رضا':'reda','منى':'mona',
    'ولاء':'walaa','نور':'nour','ليلى':'laila','سارة':'sara','ياسمين':'yasmin',
    'الدين':'eldin','عبدالرحمن':'abdelrahman','عبدالعزيز':'abdelaziz','فتحي':'fathy',
    'لطفي':'lotfy','زكي':'zaky','كامل':'kamel','رأفت':'raafat','نادر':'nader',
    'ماهر':'maher','عاطف':'atef','مجدي':'magdy','عصام':'essam','طه':'taha',
    'الديب':'eldeeb','عبدالعال':'abdelaal','راشد':'rashed','فريد':'farid',
    'حمدي':'hamdy','رفعت':'refaat','سلامة':'salama','شعبان':'shaaban','صبري':'sabry'
  };

  function translit(name) {
    var s = String(name || '').trim();
    TITLES.forEach(function (t) {
      if (s.indexOf(t) === 0) s = s.slice(t.length).trim();
    });
    s = s.replace(/[ً-ْ]/g, '');           /* التشكيل */

    /* known names first — gives ramadan, not rmdan */
    var words = s.split(/\s+/).filter(Boolean);
    var mapped = words.map(function (w) {
      var clean = w.replace(/[^\u0600-\u06FFa-zA-Z]/g, '');
      return NAMES[clean] !== undefined ? NAMES[clean] : null;
    });
    if (mapped.some(function (x) { return x !== null; })) {
      var res = [];
      for (var k = 0; k < words.length; k++) {
        res.push(mapped[k] !== null ? mapped[k] : letterwise(words[k]));
      }
      return res.join(' ').replace(/\s+/g, ' ').trim();
    }
    return letterwise(s);
  }

  function letterwise(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (AR2LAT[c] !== undefined) out += AR2LAT[c];
      else if (/[a-zA-Z0-9]/.test(c)) out += c.toLowerCase();
      else if (/\s/.test(c)) out += ' ';
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function suggestUsername(fullName, existing) {
    var parts = translit(fullName).split(' ').filter(Boolean);
    var base;
    if (parts.length >= 2) base = parts[0] + '.' + parts[parts.length - 1];
    else if (parts.length === 1) base = parts[0];
    else base = 'user';
    base = base.replace(/[^a-z0-9.]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    if (!base) base = 'user';

    var taken = {};
    (existing || Store.all('users')).forEach(function (u) {
      taken[String(u.username || '').toLowerCase()] = true;
      if (u.email) taken[String(u.email).toLowerCase().split('@')[0]] = true;
    });
    if (!taken[base]) return base;
    for (var n = 2; n < 100; n++) {
      if (!taken[base + n]) return base + n;
    }
    return base + randInt(9999);
  }

  /* ------------------------------------------------------------------
     Create a portal account for an employee record
     ------------------------------------------------------------------ */
  async function createFor(employeeId, role, opts) {
    opts = opts || {};
    var emp = Store.find('employees', employeeId);
    if (!emp) return null;
    var uname = opts.username || suggestUsername(emp.name);
    var pass = opts.password || makePassword();
    var result = await Auth.adminUsers('create', {
      name: emp.name,
      username: uname,
      temporaryPassword: pass,
      email: SETTINGS.companyDomain ? uname + '@' + SETTINGS.companyDomain : (emp.email || ''),
      role: role || 'employee',
      employeeId: emp.id,
      projects: opts.projects || []
    });
    if (!result || result.ok === false) return result || { ok: false, error: 'create-failed' };
    return { ok: true, user: result.user, password: result.temporaryPassword || pass };
  }

  /* Reset someone's password and return the new one so it can be printed */
  async function resetPassword(userId) {
    var pass = makePassword();
    var result = await Auth.adminUsers('reset_password', { userId: userId, temporaryPassword: pass });
    if (!result || result.ok === false) return result || { ok: false, error: 'reset-failed' };
    /* نفس السبب: بدون هذا يُسجَّل «إعادة ضبط كلمة مرور» بلا اسم صاحبها
       حين يفعلها مفوَّض — سطر في السجل لا يقول عمّن يتحدث.
       Same reason: without this a delegate's password reset is logged with
       no name at all — an audit line that does not say who it was about. */
    Store.log('password_reset', 'users', userId,
      ((Store.find('users', userId) ||
        (global.AccountFence && AccountFence.findUser ? AccountFence.findUser(userId) : null) ||
        {}).name) || '');
    return { ok: true, password: result.temporaryPassword || pass };
  }

  /* The employee changes their own password */
  async function changeOwnPassword(oldPass, newPass) {
    var u = Auth.current();
    if (!u) return { ok: false, error: 'no-user' };
    var p = String(newPass || '').trim();
    if (p.length < SETTINGS.minPasswordLength || !/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) {
      return { ok: false, error: L({
        ar: 'استخدم ' + SETTINGS.minPasswordLength + ' حرفاً على الأقل، تشمل حرفاً كبيراً وصغيراً ورقماً ورمزاً',
        en: 'Use at least ' + SETTINGS.minPasswordLength + ' characters with uppercase, lowercase, a number, and a symbol' }) };
    }
    if (p === String(oldPass)) {
      return { ok: false, error: L({ ar: 'اختر كلمة مرور مختلفة عن الحالية', en: 'Choose a password different from the current one' }) };
    }
    var result = await Auth.updatePassword(oldPass, p);
    if (!result.ok) {
      return { ok: false, error: result.error === 'bad-old-password'
        ? L({ ar: 'كلمة المرور الحالية غير صحيحة', en: 'Current password is incorrect' })
        : result.error };
    }
    u.mustChangePassword = false;
    Store.log('password_changed', 'users', u.id, u.name);
    return { ok: true };
  }

  /* ------------------------------------------------------------------
     🔴 THE MIGRATION — usernames → company email, losing nothing
     ------------------------------------------------------------------ */
  function previewMigration(domain) {
    var d = String(domain || SETTINGS.companyDomain || '').trim().replace(/^@/, '').toLowerCase();
    return Store.all('users').map(function (u) {
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        currentEmail: u.email || '',
        newEmail: u.email || (d ? u.username + '@' + d : ''),
        alreadyHas: !!u.email
      };
    });
  }

  async function applyMigration(domain, overwrite) {
    var d = String(domain || '').trim().replace(/^@/, '').toLowerCase();
    if (!d || d.indexOf('.') === -1) {
      return { ok: false, error: L({ ar: 'اكتب نطاقاً صحيحاً مثل alzahraa-contracting.com',
                                    en: 'Enter a valid domain such as alzahraa-contracting.com' }) };
    }
    var result = await Auth.adminUsers('migrate_domain', { domain: d, overwrite: !!overwrite });
    if (!result || result.ok === false) return result || { ok: false, error: 'migration-failed' };
    Store.setMeta({ companyDomain: d });
    SETTINGS.companyDomain = d;
    Store.log('migrate_email', 'users', '', d, (result.count || 0) + ' accounts');
    return { ok: true, count: result.count || 0, domain: d };
  }

  /* ------------------------------------------------------------------
     Printable credential slips
     ------------------------------------------------------------------ */
  function slips(userIds, passwords) {
    var url = location.href.split('#')[0].split('?')[0];
    var ar = I18N.getLang() === 'ar';
    var cards = '';

    (userIds || []).forEach(function (uid) {
      /* ⚠️ Store.find('users') فارغ للمفوَّض — جدول المستخدمين لا يُزامَن
         لدوره. النتيجة كانت صامتة وقاسية: أ. محمد عمارة ينشئ حساباً، يرى
         «تم الحفظ»، ولا تُطبع أي ورقة — فلا يملك كلمة المرور ليعطيها
         للموظف الجديد، والحساب موجود فعلاً ولا سبيل لدخوله.
         ⚠️ Store.find('users') is empty for a delegate — his role never syncs
         that table. The failure was silent and cruel: عمارة creates an
         account, sees "saved", and NO slip prints — so he has no password to
         hand the new employee, while the account really does exist and
         cannot be signed into. Guarded: without the fence file this line
         behaves exactly as it did before. */
      var u = Store.find('users', uid) ||
              (global.AccountFence && AccountFence.findUser ? AccountFence.findUser(uid) : null);
      if (!u) return;
      var pw = (passwords && passwords[uid]) || '—';
      var login = u.email || u.username;
      cards +=
      '<div class="slip">' +
        '<div class="s-hd">' +
          '<svg viewBox="0 0 19.24 19.3" width="30" height="30"><g fill="#0000A3" fill-rule="evenodd">' +
          '<path d="M 12.754 6.145L 13.473 4.895L 15.262 1.797L 16.301 0L 12.766 0L 12.598 0.289L 11.75 1.762L 9.219 6.145ZM 12.754 6.145"/>' +
          '<path d="M 17.562 16.242L 13.191 16.242L 13.645 15.461L 15.43 12.359L 15.414 12.324L 12 12.324L 9.656 16.242L 7.891 19.301L 19.242 19.301ZM 17.562 16.242"/>' +
          '<path d="M 16.363 10.168L 14.688 7.109L 5.148 7.109L 5.707 6.145L 9.254 0L 5.723 0L 0 9.91L 1.723 13.047L 3.383 10.168L 6.898 10.168L 3.43 16.164L 5.152 19.301L 10.43 10.168ZM 16.363 10.168"/>' +
          '</g></svg>' +
          '<div><b>شركة الزهراء للمقاولات العامة</b><small>بيانات الدخول لنظام إدارة الشركة</small></div>' +
        '</div>' +
        '<div class="s-name">' + UI.esc(u.name) + '</div>' +
        '<div class="s-role">' + UI.esc(Auth.roleLabel(u.role)) + '</div>' +
        '<table class="s-tbl">' +
          '<tr><th>الرابط</th><td class="ltr">' + UI.esc(url) + '</td></tr>' +
          '<tr><th>اسم المستخدم</th><td class="ltr big">' + UI.esc(login) + '</td></tr>' +
          '<tr><th>كلمة المرور</th><td class="ltr big pw">' + UI.esc(pw) + '</td></tr>' +
        '</table>' +
        '<div class="s-note">' +
          '<b>مهم:</b> سيُطلب منك تغيير كلمة المرور أول مرة تدخل فيها.<br>' +
          'كلمة المرور شخصية — لا تشاركها مع أي زميل. كل حركة تُسجَّل باسمك.' +
        '</div>' +
        '<div class="s-cut">✂ احتفظ بهذه الورقة في مكان آمن ولا تتركها على المكتب</div>' +
      '</div>';
    });

    var css = [
      '@page{size:A4;margin:10mm}',
      'body{font-family:Cairo,Tahoma,sans-serif;direction:rtl;margin:0;padding:8px;background:#fff;color:#14162E}',
      '.wrap{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.slip{border:1.5px dashed #7B7FA0;border-radius:10px;padding:12px;break-inside:avoid;page-break-inside:avoid}',
      '.s-hd{display:flex;gap:9px;align-items:center;border-bottom:2px solid #0000A3;padding-bottom:7px;margin-bottom:9px}',
      '.s-hd b{display:block;font-size:10.5pt;color:#0000A3;line-height:1.3}',
      '.s-hd small{display:block;font-size:7.5pt;color:#7B7FA0}',
      '.s-name{font-size:13pt;font-weight:800;margin-bottom:1px}',
      '.s-role{font-size:9pt;color:#7B7FA0;margin-bottom:9px}',
      '.s-tbl{width:100%;border-collapse:collapse;margin-bottom:9px}',
      '.s-tbl th{text-align:start;font-size:8.5pt;color:#7B7FA0;padding:4px 6px;width:32%;vertical-align:middle}',
      '.s-tbl td{padding:4px 6px;font-size:9.5pt;border-bottom:1px solid #E4E6F2;word-break:break-all}',
      '.ltr{direction:ltr;text-align:start;font-family:Consolas,monospace}',
      '.big{font-size:12pt;font-weight:700}',
      '.pw{background:#EDEDF8;border-radius:5px;letter-spacing:.5px}',
      '.s-note{font-size:7.5pt;color:#474B69;background:#FDF1E0;padding:6px 8px;border-radius:6px;line-height:1.6}',
      '.s-cut{font-size:7pt;color:#7B7FA0;margin-top:7px;text-align:center}',
      '@media print{.noprint{display:none}}',
      '.noprint{background:#0000A3;color:#fff;padding:10px 14px;border-radius:8px;margin-bottom:10px;font-size:10pt}'
    ].join('\n');

    var win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      UI.toast(L({ ar: 'المتصفح منع النافذة. اسمح بالنوافذ المنبثقة.',
                   en: 'Pop-up blocked. Allow pop-ups for this site.' }), 'error');
      return;
    }
    win.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
      '<title>بيانات الدخول</title>' +
      '<style>' + css + '</style></head><body>' +
      '<div class="noprint">اطبع هذه الصفحة، قصّ كل بطاقة، وسلّمها لصاحبها يداً بيد. ' +
      'لا ترسل كلمات المرور في واتساب. هذه الرسالة لن تُطبع.</div>' +
      '<div class="wrap">' + cards + '</div></body></html>');
    win.document.close();
    setTimeout(function () { try { win.print(); } catch (e) {} }, 500);
  }

  /* ------------------------------------------------------------------
     Forced password change dialog (first login)
     ------------------------------------------------------------------ */
  function promptPasswordChange(force) {
    var u = Auth.current();
    if (!u) return;
    var body =
      (force ? '<div class="alert alert-warn">' + UI.icon('alert', 17) + '<span>' +
        L({ ar: 'لأمانك، اختر كلمة مرور جديدة تعرفها أنت وحدك قبل المتابعة.',
            en: 'For your security, choose a new password only you know before continuing.' }) +
        '</span></div>' : '') +
      '<label class="field"><span class="field-label">' +
        L({ ar: 'كلمة المرور الحالية', en: 'Current password' }) + '</span>' +
        '<input type="password" class="input" id="pwOld"></label>' +
      '<label class="field mt-1"><span class="field-label">' +
        L({ ar: 'كلمة المرور الجديدة', en: 'New password' }) + '</span>' +
        '<input type="password" class="input" id="pwNew"></label>' +
      '<label class="field mt-1"><span class="field-label">' +
        L({ ar: 'أعد كتابة الجديدة', en: 'Repeat new password' }) + '</span>' +
        '<input type="password" class="input" id="pwNew2"></label>' +
      '<div class="err-msg mt-1" id="pwErr" hidden></div>' +
      '<p class="field-hint mt-1">' +
        L({ ar: 'لا تقل عن ' + SETTINGS.minPasswordLength + ' حرفاً وتشمل حرفاً كبيراً وصغيراً ورقماً ورمزاً. لا تستخدمها في مكان آخر.',
            en: 'At least ' + SETTINGS.minPasswordLength + ' characters with uppercase, lowercase, a number, and a symbol. Do not reuse it elsewhere.' }) +
      '</p>';

    var buttons = [];
    if (!force) buttons.push({ label: t('g.cancel'), cls: 'btn-ghost' });
    buttons.push({
      label: L({ ar: 'حفظ كلمة المرور', en: 'Save password' }), cls: 'btn-primary', keepOpen: true,
      onClick: async function () {
        var o = document.getElementById('pwOld').value;
        var a = document.getElementById('pwNew').value;
        var b = document.getElementById('pwNew2').value;
        var err = document.getElementById('pwErr');
        if (a !== b) {
          err.textContent = L({ ar: 'الكلمتان غير متطابقتين', en: 'The two passwords do not match' });
          err.hidden = false; return false;
        }
        var res = await changeOwnPassword(o, a);
        if (!res.ok) { err.textContent = res.error; err.hidden = false; return false; }
        if (force && global.Store && Store.isInitialized()) await Store.reload();
        UI.closeModal();
        UI.toast(L({ ar: 'تم تغيير كلمة المرور بنجاح', en: 'Password changed successfully' }));
        return true;
      }
    });

    UI.modal({
      size: 'narrow',
      dismissible: !force,
      title: L({ ar: 'تغيير كلمة المرور', en: 'Change password' }),
      body: body, buttons: buttons,
      onOpen: function () { var e = document.getElementById('pwOld'); if (e) e.focus(); }
    });
  }

  global.Identity = {
    SETTINGS: SETTINGS,
    makePassword: makePassword,
    suggestUsername: suggestUsername,
    translit: translit,
    createFor: createFor,
    resetPassword: resetPassword,
    changeOwnPassword: changeOwnPassword,
    previewMigration: previewMigration,
    applyMigration: applyMigration,
    slips: slips,
    promptPasswordChange: promptPasswordChange
  };
})(window);
