/* =========================================================
   layout.js – gemeinsame Helfer für alle Seiten
   Menü (Drawer), untere Navigationsleiste, Toast, Euro-Format, URL-Parameter, Icons.
   ========================================================= */
window.UI = (function () {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  const param = (k) => new URLSearchParams(location.search).get(k);
  const icons = () => window.lucide && lucide.createIcons();

  function festIcon(id) {
    const choices = ["party-popper", "music", "ferris-wheel", "balloon", "flag", "pennant", "sparkles", "calendar-days", "drum", "ticket"];
    // Festival IDs are random; hashing assigns a stable, varied icon across devices.
    let hash = 2166136261;
    for (const char of String(id || "")) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return choices[hash % choices.length];
  }

  function toast(text, icon = "check-circle-2") {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.innerHTML = `<i data-lucide="${icon}"></i><span>${text}</span>`;
    icons(); t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2400);
  }

  async function gastZugang(festId) {
    if ((await API.getRolle()) !== "helfer") return true;
    location.replace(festId && await API.istHelferFuer(festId) ? `helfer.html?fest=${encodeURIComponent(festId)}` : "index.html");
    return false;
  }
  // ---------- Untere Navigationsleiste (Hotbar) ----------
  // Seiten mit <body data-tab="…"> zeigen die Leiste. Seiten mit eigener
  // Aktionsleiste unten (Checkout, Aufladen, Speisekarte, Kasse) zeigen sie nicht.
  async function tabbar(rolle) {
    const aktiv = document.body.dataset.tab;
    if (!aktiv) return;
    let mitte = { id: "bezahlen", href: "zahlen.html", icon: "qr-code", label: "Bezahlen" };
    if (rolle === "helfer") {
      const helferFeste = [];
      for (const f of await API.getFeste()) if (await API.istHelferFuer(f.id)) helferFeste.push(f);
      mitte = { id: "bezahlen", href: helferFeste.length === 1 ? `helfer.html?fest=${encodeURIComponent(helferFeste[0].id)}` : "index.html", icon: "scan-line", label: "Kasse" };
    }
    const tabs = [
      { id: "entdecken", href: "index.html", icon: "map", label: "Entdecken" },
      { id: "demnaechst", href: "demnaechst.html", icon: "calendar-days", label: "Demnächst" },
      mitte,
      { id: "aktivitaeten", href: "aktivitaeten.html", icon: "receipt-text", label: "Aktivitäten" },
      { id: "profil", href: "profil.html", icon: "user-round", label: "Profil" },
    ];
    const bar = document.createElement("nav");
    bar.className = "tabbar"; bar.setAttribute("aria-label", "Hauptnavigation");
    bar.innerHTML = tabs.map((t) => `<a href="${t.href}" data-track="nav-${t.id === "bezahlen" && rolle === "helfer" ? "kasse" : t.id}" class="tab${t.id === "bezahlen" ? " tab-center" : ""}${t.id === aktiv ? " active" : ""}" ${t.id === aktiv ? 'aria-current="page"' : ""}>
        <span class="tab-icon"><i data-lucide="${t.icon}"></i></span><span class="tab-label">${t.label}</span></a>`).join("");
    document.body.classList.add("has-tabbar");
    document.body.appendChild(bar);
  }

  async function menu() {
    const rolle = await API.getRolle();
    document.querySelectorAll("[data-guest-only]").forEach(el => el.hidden = rolle === "helfer");
    const eigene = [];
    for (const f of await API.getFeste()) if (await API.istBetreiberFuer(f.id)) eigene.push(f);
    await tabbar(rolle);
    const bg = document.createElement("div"); bg.className = "drawer-bg";
    const d = document.createElement("nav"); d.className = "drawer";
    d.innerHTML = `
      <div class="row" style="margin-bottom:20px">
        <h2>Menü</h2><div class="spacer"></div>
        <button class="icon-btn light" data-track="menu-close" data-close aria-label="Schließen"><i data-lucide="x"></i></button>
      </div>
      <a class="drawer-create" data-track="menu-fest-anlegen" href="betreiber.html"><span class="badge-icon accent"><i data-lucide="plus"></i></span><span><b>Neues Fest anlegen</b><small>Zone, Bezahlweg &amp; Speisekarte festlegen</small></span></a>
      <span class="role-tag">Rolle: ${rolle}</span>
      <div class="drawer-section">
        <div class="drawer-title">Navigation</div>
        <a href="index.html" data-track="menu-entdecken"><i data-lucide="map"></i>Entdecken (Karte)</a>
        <a href="demnaechst.html" data-track="menu-demnaechst"><i data-lucide="calendar-days"></i>Demnächst</a>
        ${rolle !== "helfer" ? `<a href="zahlen.html" data-track="menu-bezahlen"><i data-lucide="qr-code"></i>Bezahlen (QR-Code &amp; Marken)</a><a href="marken.html" data-track="menu-marken"><i data-lucide="ticket"></i>Meine Festmarken</a><a href="guthaben.html" data-track="menu-guthaben"><i data-lucide="wallet"></i>Mein Guthaben / QR-Code</a>` : ""}
        <a href="aktivitaeten.html" data-track="menu-aktivitaeten"><i data-lucide="receipt-text"></i>Aktivitäten</a>
      </div>
      ${eigene.length ? `<div class="drawer-section"><div class="drawer-title">Meine Feste</div>${eigene.map(f => `<a data-track="menu-eigenes-fest" href="fest.html?id=${encodeURIComponent(f.id)}"><i data-lucide="${UI.festIcon(f.id)}"></i>${escape(f.name)}</a>`).join("")}</div>` : ""}
      <div class="drawer-section">
        <div class="drawer-title">Konto</div>
        <a href="profil.html" data-track="menu-profil"><i data-lucide="user-round"></i>Profil &amp; Rolle</a>
        <a href="login.html" data-track="menu-login"><i data-lucide="log-in"></i>Anmelden</a>
      </div>
      <div class="drawer-section" data-no-track="1">
        <div class="drawer-title">Nutzertest <span class="test-status" data-test-status></span></div>
        <a href="index.html?mode=choose" data-test-home data-no-track="1"><i data-lucide="house"></i>Zur Testauswahl</a>
        <a href="#" data-test-ids data-no-track="1"><i data-lucide="id-card"></i>IDs / Fragebögen</a>
        <a href="admin.html" data-test-admin data-no-track="1"><i data-lucide="bar-chart-3"></i>Auswertung</a>
      </div>`;
    document.body.append(bg, d);
    const close = () => { bg.classList.remove("open"); d.classList.remove("open"); };
    d.querySelector('[data-test-home]').onclick = e => { e.preventDefault(); window.TestLog.returnToSelection(); };
    // Die Testleiste (telemetry.js) ist ausgeblendet; das Menü nutzt ihre Schaltflächen weiter.
    d.querySelector('[data-test-ids]').onclick = e => { e.preventDefault(); close(); document.querySelector('.test-pill [data-study]')?.click(); };
    const testStatus = () => {
      const pill = document.querySelector('.test-pill');
      d.querySelector('[data-test-status]').textContent = pill ? '· ' + (pill.querySelector('span')?.textContent || '') : '';
      d.querySelector('[data-test-admin]').hidden = !pill?.querySelector('a[href="admin.html"]');
      d.querySelector('[data-test-ids]').hidden = !pill;
    };
    bg.onclick = close; d.querySelector("[data-close]").onclick = close;
    document.querySelectorAll("[data-menu]").forEach((b) => (b.onclick = () => { testStatus(); bg.classList.add("open"); d.classList.add("open"); }));
    icons();
  }

  function demoFlag() {
    if (!API.istDemo()) return;
    const f = document.createElement("div"); f.className = "demo-flag";
    f.textContent = "Klickdummy · keine echten Zahlungen"; document.body.appendChild(f);
  }

  document.addEventListener("DOMContentLoaded", () => { menu(); demoFlag(); icons(); });
  return { festIcon, gastZugang, escape, euro, param, icons, toast };
})();
