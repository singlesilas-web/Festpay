/* =========================================================
   layout.js – gemeinsame Helfer für alle Seiten
   Menü (Drawer), Toast, Euro-Format, URL-Parameter, Icons.
   ========================================================= */
window.UI = (function () {
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

  async function menu() {
    const rolle = await API.getRolle();
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
        <a href="marken.html"><i data-lucide="ticket"></i>Meine Festmarken</a>
        <a href="profil.html"><i data-lucide="user-round"></i>Profil &amp; Rolle</a>
        ${rolle !== "gast" ? `<a href="helfer.html"><i data-lucide="scan-line"></i>Helfer-Scanner</a>` : ""}
        ${rolle === "betreiber" ? `<a href="betreiber.html"><i data-lucide="layout-dashboard"></i>Betreiber-Bereich</a>` : ""}
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
  return { euro, param, icons, toast };
})();
