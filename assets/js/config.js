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
    version: '2.0.1',
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
