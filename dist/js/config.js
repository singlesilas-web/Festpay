/* =========================================================
   config.js – Zugangsdaten & Schalter
   Hier tragt ihr eure Supabase-Daten ein (Supabase > Project Settings > API).
   Der anon/publishable Key darf öffentlich im Code stehen.
   NIEMALS den service_role Key hier eintragen!
   ========================================================= */
window.APP_CONFIG = {
  SUPABASE_URL: "DEINE_SUPABASE_URL",          // z.B. https://xyz.supabase.co
  SUPABASE_ANON_KEY: "DEIN_SUPABASE_ANON_KEY",

  // Klickdummy: true = Beispieldaten aus js/demo-data.js werden gezeigt,
  // solange Supabase noch nicht eingetragen ist.
  // false = ohne Supabase bleibt alles leer.
  DEMO_MODUS: true,
  ANALYTICS_URL: "https://orrprvpypsvuzspwzevf.supabase.co", // https://<project>.supabase.co
  ANALYTICS_KEY: "sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1", // publishable key only
  BUILD_VERSION: "festpay-2026-11-09-v6-tasks",
};

window.APP_CONFIG.isSupabaseReady = function () {
  const c = window.APP_CONFIG;
  return c.SUPABASE_URL.startsWith("https://") && !c.SUPABASE_ANON_KEY.startsWith("DEIN_");
};
