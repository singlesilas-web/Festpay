/* =========================================================
   api.js – ALLE Datenzugriffe an einer Stelle.
   Jede Funktion: mit Supabase -> echte Abfrage,
   ohne Supabase -> Klickdummy (localStorage) bzw. leer.
   Seiten rufen NUR diese Funktionen auf, nie direkt Supabase.
   ========================================================= */
window.API = (function () {
  const LS = "festpay_demo_v1";
  const demoOn = () => !window.sb && window.APP_CONFIG.DEMO_MODUS && window.DEMO_DATA;

  // ---------- lokaler Zustand für den Klickdummy ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
  }
  function save(s) { localStorage.setItem(LS, JSON.stringify(s)); }
  function state() {
    const s = load();
    s.guthaben ??= {}; s.marken ??= []; s.rolle ??= "gast"; s.eigeneFeste ??= [];
    s.userId ??= "gast-" + Math.random().toString(36).slice(2, 8);
    save(s); return s;
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- Auth / Rolle ----------
  async function getUser() {
    if (window.sb) { const { data } = await sb.auth.getUser(); return data.user; }
    return { id: state().userId, email: null };
  }
  async function getRolle() {
    if (window.sb) {
      const u = await getUser(); if (!u) return "gast";
      const { data } = await sb.from("user_roles").select("role").eq("user_id", u.id);
      const r = (data || []).map((x) => x.role);
      return r.includes("betreiber") ? "betreiber" : r.includes("helfer") ? "helfer" : "gast";
    }
    return state().rolle;
  }
  function setDemoRolle(r) { const s = state(); s.rolle = r; save(s); }
  async function login(email, passwort) {
    if (!window.sb) return { error: null, demo: true };
    return sb.auth.signInWithPassword({ email, password: passwort });
  }
  async function registrieren(email, passwort) {
    if (!window.sb) return { error: null, demo: true };
    return sb.auth.signUp({ email, password: passwort, options: { emailRedirectTo: location.origin } });
  }
  async function logout() { if (window.sb) await sb.auth.signOut(); }

  // ---------- Feste ----------
  async function getFeste() {
    if (window.sb) {
      const { data } = await sb.from("feste").select("*").eq("aktiv", true);
      return data || [];
    }
    if (!demoOn()) return [...state().eigeneFeste];
    return [...DEMO_DATA.feste, ...state().eigeneFeste];
  }
  async function getFest(id) {
    if (window.sb) {
      const { data } = await sb.from("feste").select("*").eq("id", id).maybeSingle();
      return data;
    }
    return (await getFeste()).find((f) => f.id === id) || null;
  }
  async function getAufladeoptionen(festId) {
    if (window.sb) {
      const { data } = await sb.from("aufladeoptionen").select("betrag").eq("fest_id", festId).order("betrag");
      return (data || []).map((d) => Number(d.betrag));
    }
    return (await getFest(festId))?.aufladeoptionen || [];
  }
  async function getSpeisekarte(festId) {
    if (window.sb) {
      const { data } = await sb.from("speisekarte_items").select("*").eq("fest_id", festId).eq("verfuegbar", true);
      return data || [];
    }
    return (await getFest(festId))?.speisekarte || [];
  }
  async function festSpeichern(fest) {
    if (window.sb) {
      const u = await getUser();
      const { data, error } = await sb.from("feste").insert({
        name: fest.name, ort: fest.ort, zone: fest.zone, owner_id: u.id,
        w1_aktiv: fest.w1_aktiv, w2_aktiv: fest.w2_aktiv,
      }).select().single();
      if (error) return { error };
      await sb.from("aufladeoptionen").insert(fest.aufladeoptionen.map((b) => ({ fest_id: data.id, betrag: b })));
      if (fest.speisekarte.length)
        await sb.from("speisekarte_items").insert(fest.speisekarte.map((i) => ({ fest_id: data.id, name: i.name, preis: i.preis, icon: i.icon, kategorie: i.kategorie })));
      // TODO Echtbetrieb: Tabelle fest_helfer (fest_id, name, email) inkl. RLS anlegen.
      if (fest.helfer?.length)
        await sb.from("fest_helfer").insert(fest.helfer.map((h) => ({ fest_id: data.id, name: h.name, email: h.email })));
      return { data };
    }
    const s = state();
    if (fest.id) {
      const index = s.eigeneFeste.findIndex(f => f.id === fest.id);
      if (index < 0 || !(await istBetreiberFuer(fest.id))) return { error: { message: "Kein Betreiberzugang" } };
      const old = s.eigeneFeste[index];
      s.eigeneFeste[index] = { ...fest, owner_id: old.owner_id || s.userId, w1_aktiv: old.w1_aktiv, w2_aktiv: old.w2_aktiv };
    } else { fest.id = "eigen-" + uid(); fest.owner_id = s.userId; s.eigeneFeste.push(fest); }
    save(s);
    return { data: fest };
  }

  async function istBetreiberFuer(id) {
    const f = await getFest(id), u = await getUser();
    return (await getRolle()) === "betreiber" && !!f && (f.owner_id === u?.id || (!window.sb && !f.owner_id && state().eigeneFeste.some(x => x.id === id)));
  }
  function istFestAktiv(f, now = Date.now()) {
    return (!f.start || Date.parse(f.start) <= now) && (!f.ende || now < Date.parse(f.ende));
  }
  // ---------- Helfer-Zuordnung pro Fest ----------
  // Ein Konto ist Helfer eines Fests, wenn seine E-Mail in der Helferliste des Fests steht.
  // Klickdummy: E-Mail wird im Profil als Demo-E-Mail hinterlegt.
  async function getEmail() {
    if (window.sb) return (await getUser())?.email || null;
    return state().email || null;
  }
  function setDemoEmail(mail) { const s = state(); s.email = (mail || "").trim().toLowerCase() || null; save(s); }
  async function istHelferFuer(festId) {
    if (!festId) return false;
    const fest = await getFest(festId);
    if (!fest?.w1_aktiv) return false;
    if (await istBetreiberFuer(festId)) return true;
    if ((await getRolle()) !== "helfer") return false;
    // Demo role grants membership in Fest A only; no mail entry is needed.
    if (!window.sb && festId === "demo-weinfest") return (await getRolle()) === "helfer";
    const mail = (await getEmail())?.trim().toLowerCase();
    if (!mail) return false;
    if (window.sb) {
      const { data } = await sb.from("fest_helfer").select("email").eq("fest_id", festId).ilike("email", mail).maybeSingle();
      return !!data;
    }
    return (fest.helfer || []).some((h) => (h.email || "").trim().toLowerCase() === mail);
  }

  // ---------- W1: Festguthaben ----------
  async function getGuthaben(festId, userId) {
    if (window.sb) {
      const u = userId || (await getUser())?.id;
      const { data } = await sb.from("guthaben").select("betrag").eq("fest_id", festId).eq("user_id", u).maybeSingle();
      return Number(data?.betrag || 0);
    }
    const s = state(); return s.guthaben[festId + ":" + (userId || s.userId)] || 0;
  }
  async function aufladen(festId, betrag, zahlungsart) {
    // TODO Echtbetrieb: Zahlung über Zahlungsanbieter (PayPal/Stripe) abwickeln,
    // Gutschrift erst per Webhook serverseitig buchen – nie direkt aus dem Browser!
    if (window.sb) return sb.rpc("guthaben_aufladen_demo", { _fest_id: festId, _betrag: betrag, _zahlungsart: zahlungsart });
    const s = state(); const k = festId + ":" + s.userId;
    s.guthaben[k] = (s.guthaben[k] || 0) + betrag; save(s); return { error: null };
  }
  async function abbuchen(festId, userId, betrag) {
    if (window.sb) return sb.rpc("guthaben_abbuchen", { _fest_id: festId, _user_id: userId, _betrag: betrag });
    if (!(await istHelferFuer(festId))) return { error: { message: "Für dieses Fest nicht als Helfer eingetragen" } };
    const s = state(); const k = festId + ":" + userId;
    if (!(betrag > 0) || !Number.isFinite(betrag)) return { error: { message: "Ungültiger Betrag" } };
    if ((s.guthaben[k] || 0) < betrag) return { error: { message: "Guthaben reicht nicht aus" } };
    s.guthaben[k] -= betrag; save(s); return { error: null, data: s.guthaben[k] };
  }

  // ---------- W2: Festmarken ----------
  async function markenKaufen(festId, warenkorb, zahlungsart) {
    // TODO Echtbetrieb: wie aufladen – Zahlung erst bestätigen, dann Marken anlegen.
    if (window.sb) return sb.rpc("marken_kaufen_demo", { _fest_id: festId, _items: warenkorb, _zahlungsart: zahlungsart });
    const s = state();
    warenkorb.forEach((pos) => {
      for (let i = 0; i < pos.menge; i++)
        s.marken.push({ id: uid(), fest_id: festId, name: pos.name, icon: pos.icon, preis: pos.preis, status: "offen", gekauft_am: Date.now() });
    });
    save(s); return { error: null };
  }
  async function getMarken() {
    if (window.sb) {
      const u = await getUser(); if (!u) return [];
      const { data } = await sb.from("marken").select("*, speisekarte_items(name, icon)").eq("user_id", u.id).order("created_at", { ascending: false });
      return (data || []).map((m) => ({ ...m, name: m.speisekarte_items?.name, icon: m.speisekarte_items?.icon }));
    }
    return state().marken;
  }
  async function markeEntwerten(id) {
    if (window.sb) return sb.rpc("marke_entwerten", { _marke_id: id });
    const s = state(); const m = s.marken.find((x) => x.id === id);
    if (m) { m.status = "entwertet"; m.entwertet_am = Date.now(); }
    save(s); return { error: null };
  }

  return {
    getUser, getRolle, setDemoRolle, login, registrieren, logout,
    istBetreiberFuer, istFestAktiv, getFeste, getFest, getAufladeoptionen, getSpeisekarte, festSpeichern,
    getEmail, setDemoEmail, istHelferFuer,
    getGuthaben, aufladen, abbuchen, markenKaufen, getMarken, markeEntwerten,
    istDemo: () => !window.sb,
  };
})();
