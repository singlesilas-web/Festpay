/* =========================================================
   profil.js – Profil & Rolle
   Klickdummy: Rolle Gast / Helfer / Betreiber frei umschaltbar.
   Echtbetrieb: Rolle kommt aus Tabelle user_roles (nur Admin vergibt).
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const user = await API.getUser();
  const rolle = await API.getRolle();
  const rollen = [
    { id: "gast", name: "Gast", sub: "Aufladen, Marken kaufen & entwerten", icon: "user-round" },
    { id: "helfer", name: "Helfer", sub: "QR-Codes scannen & abbuchen", icon: "scan-line" },
    { id: "betreiber", name: "Betreiber", sub: "Feste, Zonen & Speisekarten anlegen", icon: "layout-dashboard" },
  ];
  root.innerHTML = `
    <div class="page-head"><h1>Profil</h1><p>${user?.email || "Nicht angemeldet"}</p></div>
    <div class="page stack">
      <h3>Rolle ${API.istDemo() ? '<span class="small muted">(Klickdummy: umschaltbar)</span>' : ""}</h3>
      <div class="list">${rollen.map((r) => `
        <button class="list-item ${r.id === rolle ? "selected" : ""}" data-r="${r.id}" ${API.istDemo() ? "" : "disabled"}>
          <span class="badge-icon ${r.id === rolle ? "accent" : ""}"><i data-lucide="${r.icon}"></i></span>
          <span style="flex:1"><div class="title">${r.name}</div><div class="sub">${r.sub}</div></span>
          <i data-lucide="${r.id === rolle ? "circle-check" : "circle"}"></i></button>`).join("")}</div>
      ${rolle === "helfer" || rolle === "betreiber" ? `<a class="btn btn-dark" href="helfer.html"><i data-lucide="scan-line"></i>Zum Scanner</a>` : ""}
      ${rolle === "betreiber" ? `<a class="btn" href="betreiber.html"><i data-lucide="plus"></i>Fest anlegen</a>` : ""}
      ${window.sb ? `<button class="btn btn-ghost" id="out"><i data-lucide="log-out"></i>Abmelden</button>` : `<a class="btn btn-ghost" href="login.html"><i data-lucide="log-in"></i>Anmelden</a>`}
    </div>`;
  UI.icons();
  root.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { API.setDemoRolle(b.dataset.r); location.reload(); }));
  const out = document.getElementById("out");
  if (out) out.onclick = async () => { await API.logout(); location.href = "login.html"; };
})();
