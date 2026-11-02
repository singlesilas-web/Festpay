/* =========================================================
   betreiber.js – Betreiber-Bereich
   Fest anlegen: Name, Ort, Zone auf Karte zeichnen (Punkte antippen),
   W1/W2 aktivieren, Aufladebeträge, Speisekarte.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  if ((await API.getRolle()) !== "betreiber") {
    root.innerHTML = `<div class="empty"><i data-lucide="shield-alert"></i><h3>Nur für Betreiber</h3><p>Im Profil kannst du im Klickdummy die Rolle wechseln.</p>
      <a class="btn btn-dark" style="margin-top:16px" href="profil.html">Zum Profil</a></div>`;
    return UI.icons();
  }
  const ICONS = ["cup-soda", "beer", "wine", "coffee", "sandwich", "pizza", "ice-cream-cone", "utensils"];
  const f = { name: "", ort: "", zone: [], w1_aktiv: true, w2_aktiv: true, aufladeoptionen: [10, 20, 30], speisekarte: [] };

  root.innerHTML = `
    <div class="page-head"><h1>Fest anlegen</h1><p>Steck deinen Bereich digital ab und leg fest, wie Gäste zahlen.</p></div>
    <div class="page stack">
      <label class="field"><span>Name des Fests</span><input class="input" id="name" placeholder="Name eingeben"></label>
      <label class="field"><span>Ort</span><input class="input" id="ort" placeholder="Ort eingeben"></label>

      <h3 style="margin-top:12px">Fest-Zone</h3>
      <p class="small muted">Tippe Eckpunkte auf die Karte (mind. 3).</p>
      <div class="mini-map" id="mm"></div>
      <button class="btn btn-ghost btn-sm" id="resetZone"><i data-lucide="rotate-ccw"></i>Zone zurücksetzen</button>

      <h3 style="margin-top:12px">Bezahlwege</h3>
      <div class="card">
        <label class="switch"><span><b>W1 Festguthaben</b><br><span class="small muted">QR-Guthaben, Helfer bucht ab</span></span><input type="checkbox" id="w1" checked></label>
        <label class="switch"><span><b>W2 Festmarken</b><br><span class="small muted">Speisekarte, Gast entwertet</span></span><input type="checkbox" id="w2" checked></label>
      </div>

      <div id="w1box"><h3 style="margin-top:12px">Aufladebeträge (W1)</h3>
        <div class="tag-list" id="tops"></div>
        <div class="row" style="margin-top:10px"><input class="input" id="newTop" type="number" min="1" placeholder="Betrag in €"><button class="icon-btn" id="addTop" aria-label="Hinzufügen"><i data-lucide="plus"></i></button></div>
      </div>

      <div id="w2box"><h3 style="margin-top:12px">Speisekarte (W2)</h3>
        <div class="list" id="menu"></div>
        <div class="card stack" style="margin-top:10px">
          <input class="input" id="iName" placeholder="Artikel">
          <div class="grid-2"><input class="input" id="iPreis" type="number" step="0.5" placeholder="Preis €"><input class="input" id="iKat" placeholder="Kategorie"></div>
          <select class="input" id="iIcon">${ICONS.map((i) => `<option>${i}</option>`).join("")}</select>
          <button class="btn btn-dark btn-sm" id="addItem" style="width:100%"><i data-lucide="plus"></i>Artikel hinzufügen</button>
        </div>
      </div>
    </div>
    <div class="cta-bar"><button class="btn" id="save"><i data-lucide="save"></i>Fest veröffentlichen</button></div>`;
  UI.icons();

  // ---------- Zone zeichnen ----------
  const mm = document.getElementById("mm");
  function drawMap() {
    mm.innerHTML = `<svg viewBox="0 0 1000 1000">
      <rect width="1000" height="1000" fill="var(--map-land)"/>
      <rect x="80" y="620" width="300" height="300" rx="40" fill="var(--map-green)"/>
      <g stroke="var(--map-road)" stroke-width="24" fill="none"><path d="M0 330 L1000 300"/><path d="M0 640 Q500 610 1000 660"/><path d="M350 160 L340 1000"/><path d="M680 160 Q700 500 660 1000"/></g>
      ${f.zone.length > 1 ? `<polygon points="${f.zone.map((p) => p.join(",")).join(" ")}" fill="var(--zone)" stroke="var(--zone-line)" stroke-width="6"/>` : ""}
      ${f.zone.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="var(--ink)"/>`).join("")}</svg>`;
  }
  mm.onclick = (e) => {
    const r = mm.getBoundingClientRect();
    f.zone.push([Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)]);
    drawMap();
  };
  document.getElementById("resetZone").onclick = () => { f.zone = []; drawMap(); };

  // ---------- W1/W2 ----------
  const w1 = document.getElementById("w1"), w2 = document.getElementById("w2");
  const sync = () => { f.w1_aktiv = w1.checked; f.w2_aktiv = w2.checked;
    document.getElementById("w1box").classList.toggle("hidden", !w1.checked); document.getElementById("w2box").classList.toggle("hidden", !w2.checked); };
  w1.onchange = w2.onchange = sync;

  function drawTops() {
    document.getElementById("tops").innerHTML = f.aufladeoptionen.sort((a, b) => a - b)
      .map((b, i) => `<span>${b} €<button data-rt="${i}" aria-label="Entfernen"><i data-lucide="x"></i></button></span>`).join("") || `<span class="muted">Keine Beträge</span>`;
    UI.icons();
    document.querySelectorAll("[data-rt]").forEach((b) => (b.onclick = () => { f.aufladeoptionen.splice(+b.dataset.rt, 1); drawTops(); }));
  }
  document.getElementById("addTop").onclick = () => {
    const v = Number(document.getElementById("newTop").value);
    if (v > 0 && !f.aufladeoptionen.includes(v)) f.aufladeoptionen.push(v);
    document.getElementById("newTop").value = ""; drawTops();
  };

  function drawMenu() {
    document.getElementById("menu").innerHTML = f.speisekarte.map((i, n) => `
      <div class="list-item"><span class="badge-icon soft"><i data-lucide="${i.icon}"></i></span>
        <span style="flex:1"><div class="title">${i.name}</div><div class="sub">${i.kategorie} · ${UI.euro(i.preis)}</div></span>
        <button data-ri="${n}" aria-label="Entfernen"><i data-lucide="trash-2"></i></button></div>`).join("")
      || `<div class="list-item muted">Noch keine Artikel</div>`;
    UI.icons();
    document.querySelectorAll("[data-ri]").forEach((b) => (b.onclick = () => { f.speisekarte.splice(+b.dataset.ri, 1); drawMenu(); }));
  }
  document.getElementById("addItem").onclick = () => {
    const name = document.getElementById("iName").value.trim(), preis = Number(document.getElementById("iPreis").value);
    if (!name || !(preis > 0)) return UI.toast("Name und Preis angeben", "info");
    f.speisekarte.push({ id: Math.random().toString(36).slice(2), name, preis, kategorie: document.getElementById("iKat").value.trim() || "Sonstiges", icon: document.getElementById("iIcon").value });
    ["iName", "iPreis", "iKat"].forEach((id) => (document.getElementById(id).value = "")); drawMenu();
  };

  document.getElementById("save").onclick = async () => {
    f.name = document.getElementById("name").value.trim(); f.ort = document.getElementById("ort").value.trim();
    if (!f.name) return UI.toast("Name fehlt", "info");
    if (f.zone.length < 3) return UI.toast("Zone braucht mind. 3 Punkte", "info");
    const res = await API.festSpeichern(f);
    if (res.error) return UI.toast(res.error.message, "alert-triangle");
    UI.toast("Fest veröffentlicht"); setTimeout(() => (location.href = "index.html"), 700);
  };

  drawMap(); drawTops(); drawMenu();
})();
