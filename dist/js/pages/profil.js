/* =========================================================
   profil.js – Profil & Rolle
   Klickdummy: Rolle Gast / Helfer / Betreiber frei umschaltbar.
   Echtbetrieb: Rolle kommt aus Tabelle user_roles (nur Admin vergibt).
   Klickdummy: Demo-E-Mail für die Helfer-Zuordnung pro Fest.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const user = await API.getUser();
  const rolle = await API.getRolle();
  const rollen = [
    { id: "gast", name: "Gast", sub: "Aufladen, Marken kaufen & entwerten", icon: "user-round" },
    { id: "helfer", name: "Helfer", sub: "Bei Demo-Fest A als Helfer mitmachen", icon: "scan-line" },
    { id: "betreiber", name: "Betreiber", sub: "Feste, Zonen & Speisekarten anlegen", icon: "layout-dashboard" },
  ];
  const demoMail = API.istDemo() ? (await API.getEmail()) || "" : "";
  root.innerHTML = `
    <div class="page-head"><h1>Profil</h1><p>${user?.email || "Nicht angemeldet"}</p></div>
    <div class="page stack">
      ${API.istDemo() ? `<label class="field"><span>Demo-E-Mail (für Helfer-Zuordnung)</span>
        <input class="input" id="demoMail" type="email" placeholder="E-Mail eingeben" value="${UI.escape(demoMail)}"></label>
        <p class="small muted">Für selbst angelegte Feste wird diese E-Mail mit der Helferliste abgeglichen. Die Rolle Helfer ist bereits Demo-Fest A zugeordnet.</p>` : ""}
      <h3>Rolle ${API.istDemo() ? '<span class="small muted">(Klickdummy: umschaltbar)</span>' : ""}</h3>
      <div class="list">${rollen.map((r) => `
        <button class="list-item ${r.id === rolle ? "selected" : ""}" data-r="${r.id}" ${API.istDemo() ? "" : "disabled"}>
          <span class="badge-icon ${r.id === rolle ? "accent" : ""}"><i data-lucide="${r.icon}"></i></span>
          <span style="flex:1"><div class="title">${r.name}</div><div class="sub">${r.sub}</div></span>
          <i data-lucide="${r.id === rolle ? "circle-check" : "circle"}"></i></button>`).join("")}</div>
      ${rolle === "helfer" ? `<div class="info"><i data-lucide="scan-line"></i><span>Du bist bei Demo-Fest A als Helfer eingetragen. Öffne dein Fest, um Gäste-Codes zu scannen.</span></div><a class="btn btn-dark" href="index.html"><i data-lucide="map"></i>Feste ansehen</a>` : ""}
      ${rolle === "betreiber" ? `<a class="btn" href="betreiber.html"><i data-lucide="plus"></i>Fest anlegen</a>` : ""}
      ${window.sb ? `<button class="btn btn-ghost" id="out"><i data-lucide="log-out"></i>Abmelden</button>` : `<a class="btn btn-ghost" href="login.html"><i data-lucide="log-in"></i>Anmelden</a>`}
    </div>`;
  UI.icons();
  root.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { API.setDemoRolle(b.dataset.r); location.reload(); }));
  const dm = document.getElementById("demoMail");
  if (dm) dm.onchange = () => { API.setDemoEmail(dm.value); UI.toast("Demo-E-Mail gespeichert"); };
  const out = document.getElementById("out");
  if (out) out.onclick = async () => { await API.logout(); location.href = "login.html"; };
})();
