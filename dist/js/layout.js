/* =========================================================
   layout.js – gemeinsame Helfer für alle Seiten
   Menü (Drawer), Toast, Euro-Format, URL-Parameter, Icons.
   ========================================================= */
window.UI = (function () {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  const param = (k) => new URLSearchParams(location.search).get(k);
  const icons = () => window.lucide && lucide.createIcons();

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
  async function menu() {
    const rolle = await API.getRolle();
    document.querySelectorAll("[data-guest-only]").forEach(el => el.hidden = rolle === "helfer");
    const eigene = [];
    for (const f of await API.getFeste()) if (await API.istBetreiberFuer(f.id)) eigene.push(f);
    const bg = document.createElement("div"); bg.className = "drawer-bg";
    const d = document.createElement("nav"); d.className = "drawer";
    d.innerHTML = `
      <div class="row" style="margin-bottom:20px">
        <h2>Menü</h2><div class="spacer"></div>
        <button class="icon-btn light" data-close aria-label="Schließen"><i data-lucide="x"></i></button>
      </div>
      <span class="role-tag">Rolle: ${rolle}</span>
      <div style="margin-top:16px">
        <a href="index.html"><i data-lucide="map"></i>Karte</a>
        ${rolle !== "helfer" ? `<a href="marken.html"><i data-lucide="ticket"></i>Meine Festmarken</a><a href="guthaben.html"><i data-lucide="qr-code"></i>Mein Guthaben / QR-Code</a>` : ""}
        <a href="profil.html"><i data-lucide="user-round"></i>Profil &amp; Rolle</a>
        ${rolle === "betreiber" ? `<a href="betreiber.html"><i data-lucide="layout-dashboard"></i>Betreiber-Bereich</a>` : ""}
        ${eigene.map(f => `<a href="fest.html?id=${encodeURIComponent(f.id)}">${escape(f.name)}</a>`).join("")}
        <a href="login.html"><i data-lucide="log-in"></i>Anmelden</a>
      </div>`;
    document.body.append(bg, d);
    const close = () => { bg.classList.remove("open"); d.classList.remove("open"); };
    bg.onclick = close; d.querySelector("[data-close]").onclick = close;
    document.querySelectorAll("[data-menu]").forEach((b) => (b.onclick = () => { bg.classList.add("open"); d.classList.add("open"); }));
    icons();
  }

  function demoFlag() {
    if (!API.istDemo()) return;
    const f = document.createElement("div"); f.className = "demo-flag";
    f.textContent = "Klickdummy · keine echten Zahlungen"; document.body.appendChild(f);
  }

  document.addEventListener("DOMContentLoaded", () => { menu(); demoFlag(); icons(); });
  return { gastZugang, escape, euro, param, icons, toast };
})();
