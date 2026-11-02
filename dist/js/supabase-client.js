/* =========================================================
   supabase-client.js – Verbindung zu Supabase
   Erstellt window.sb, sobald config.js ausgefüllt ist.
   Benötigt: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ========================================================= */
(function () {
  window.sb = null;
  if (!window.APP_CONFIG.DEMO_MODUS && window.APP_CONFIG.isSupabaseReady() && window.supabase) {
    window.sb = window.supabase.createClient(
      window.APP_CONFIG.SUPABASE_URL,
      window.APP_CONFIG.SUPABASE_ANON_KEY
    );
  }
})();
