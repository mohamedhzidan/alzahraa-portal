/*
 * Runtime configuration for the production portal.
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are public browser credentials. They are
 * intentionally kept separate from the application code so they can be
 * replaced later without changing employee records or rebuilding the portal.
 * Never place the Supabase service-role key or the OpenAI API key here.
 */
(function (global) {
  'use strict';

  var injected = global.__ALZAHRAA_ENV__ || {};
  global.ALZAHRAA_CONFIG = Object.freeze({
    mode: 'production',
    /* ⚠️ هذا الرقم يُرفع مع رقم الذاكرة في service-worker.js في نفس
       الرفعة — دائماً معاً. شاشة الإعدادات ← الشركة تقرأ هذا الرقم
       بالذات (settings.js:560)، فظل يقول «2.0.1» طوال ثماني عشرة
       رفعة بينما الموقع يتقدّم؛ ولمّا يسأل موظف «أنا على أي نسخة؟»
       كانت الإجابة خاطئة دائماً. تذييل الصفحة كان قد عولج من قبل
       (version-badge.js يقرأ اسم الذاكرة الحقيقي ويكتبه)، أما هذه
       الشاشة فلا يلمسها أحد — فلا بديل عن رفع الرقم هنا.
       ⚠️ Bump this WITH the service-worker CACHE number in the same
       upload — always together. Settings → Company reads exactly this
       value (settings.js:560), so it said "2.0.1" for eighteen releases
       while the site moved on, and "which version am I on?" always got
       a wrong answer. The footer was already handled (version-badge.js
       reads the real cache name), but nothing touches this screen — so
       the number here has to be raised by hand. */
    version: '2.0.20',
    supabaseUrl: injected.SUPABASE_URL || '',
    supabaseAnonKey: injected.SUPABASE_ANON_KEY || '',
    authFunction: 'auth-login',
    userAdminFunction: 'admin-users',
    passwordFunction: 'change-password',
    aiFunction: 'ai-assistant',
    aiEnabled: injected.AI_ENABLED !== false,
    offlineEnabled: injected.OFFLINE_ENABLED !== false,
    cacheMaxAgeDays: 30,
    supportEmail: injected.SUPPORT_EMAIL || '',
    isConfigured: function () {
      return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(this.supabaseUrl) &&
        typeof this.supabaseAnonKey === 'string' && this.supabaseAnonKey.length > 40;
    }
  });
})(window);
