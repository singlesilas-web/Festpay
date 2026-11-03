/* =========================================================
   betreiber.js – Betreiber-Bereich
   Fest anlegen: Name, Ort, Zone auf Karte zeichnen (Punkte antippen),
   W1/W2 aktivieren, Aufladebeträge, Speisekarte.
   Tab "Helfer": Helfer (Name + E-Mail) dem Fest zuordnen.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  if ((await API.getRolle()) !== "betreiber") {
    root.innerHTML = `<div class="empty"><i data-lucide="shield-alert"></i><h3>Nur für Betreiber</h3><p>Im Profil kannst du im Klickdummy die Rolle wechseln.</p>
      <a class="btn btn-dark" style="margin-top:16px" href="profil.html">Zum Profil</a></div>`;
    return UI.icons();
  }
  const ICONS = ["cup-soda", "beer", "wine", "coffee", "sandwich", "pizza", "ice-cream-cone", "utensils"];
  const editId = UI.param("id");
  if (editId && !(await API.istBetreiberFuer(editId))) { root.textContent = "Kein Betreiberzugang zu diesem Fest."; return; }
  const f = editId ? structuredClone(await API.getFest(editId)) : { name: "", ort: "", zone: [], w1_aktiv: true, w2_aktiv: true, aufladeoptionen: [10, 20, 30], speisekarte: [], helfer: [] };

  f.helfer ??= []; f.speisekarte ??= [];
  root.innerHTML = `
    <div class="page-head"><h1>${editId ? "Fest bearbeiten" : "Fest anlegen"}</h1><p>Steck deinen Bereich digital ab und leg fest, wie Gäste zahlen.</p></div>
    <div class="page stack festival-form">
      <div class="segment"><button class="active" data-tab="fest">Fest</button><button data-tab="helfer">Helfer</button></div>

      <div id="tabHelfer" class="stack hidden">
        <p class="small muted">Eingetragene Helfer sehen beim Fest zusätzlich den Scanner. Zuordnung über die E-Mail ihres Kontos.</p>
        <div class="list" id="helferList"></div>
        <div class="card stack">
          <input class="input" id="hName" placeholder="Name" aria-label="Name des Helfers">
          <input class="input" id="hMail" type="email" placeholder="E-Mail" aria-label="E-Mail des Helfers">
          <button class="btn btn-dark btn-sm" id="addHelfer" style="width:100%"><i data-lucide="user-plus"></i>Helfer hinzufügen</button>
        </div>
      </div>

      <div id="tabFest" class="stack">
      <label class="field"><span>Name des Fests</span><input class="input" id="name" placeholder="Name eingeben"></label>

      <div class="festival-dates"><label class="field"><span>Anfang</span><input class="input" id="start" type="datetime-local"></label>
      <label class="field"><span>Ende</span><input class="input" id="ende" type="datetime-local"></label></div>
      <h3 style="margin-top:12px">Fest-Zone</h3>
      <p class="small muted">Tippe Eckpunkte auf die Karte (mind. 3).</p>
      <div class="mini-map" id="mm" tabindex="-1"></div>
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

      <div id="w2box"><h3 style="margin-top:12px">Speise- und Getränkekarte</h3>
        <div class="list" id="menu"></div>
        <div class="card stack" style="margin-top:10px">
          <input class="input" id="iName" placeholder="Artikel">
          <div class="grid-2"><input class="input" id="iPreis" type="number" step="0.5" placeholder="Preis €"><select class="input" id="iKat" aria-label="Kategorie"><option value="" disabled selected>Kategorie</option>${["Alkoholfreie Getränke", "Bier", "Wein & Sekt", "Cocktails & Spirituosen", "Kaffee & Tee", "Grillgerichte", "Warme Speisen", "Snacks & Beilagen", "Vegetarisch & Vegan", "Süßspeisen & Kuchen", "Sonstiges"].map(k => `<option>${k}</option>`).join("")}</select></div>
          <input type="hidden" id="iIcon" value="">
          <details class="icon-picker" open><summary><span id="iconPreview">Icon auswählen</span></summary>
            <div class="icon-options" role="group" aria-label="Icon auswählen">${ICONS.map(i => `<button type="button" data-icon="${i}" aria-label="${({"cup-soda":"Softdrink",beer:"Bier",wine:"Wein",coffee:"Kaffee",sandwich:"Sandwich",pizza:"Pizza","ice-cream-cone":"Eis",utensils:"Speise"})[i]}"><i data-lucide="${i}"></i></button>`).join("")}</div>
          </details>
          <button class="btn btn-dark btn-sm" id="addItem" style="width:100%"><i data-lucide="plus"></i>Artikel hinzufügen</button>
        </div>
      </div>
      </div>
    <button class="btn" id="save"><i data-lucide="save"></i>${editId ? "Änderungen speichern" : "Fest veröffentlichen"}</button></div>`;
  ["name", "start", "ende"].forEach(id => { document.getElementById(id).value = f[id] || ""; });
  UI.icons();

  function showIcon() {
    const value = document.getElementById("iIcon").value;
    document.getElementById("iconPreview").innerHTML = value ? `<i data-lucide="${value}"></i> Icon ändern` : "Icon auswählen";
    root.querySelectorAll('[data-icon]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.icon === value)));
    UI.icons();
  }
  root.querySelectorAll('[data-icon]').forEach(b => b.onclick = () => {
    document.getElementById("iIcon").value = b.dataset.icon; showIcon();
  });
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
    document.getElementById("w1box").classList.toggle("hidden", !w1.checked); document.getElementById("w2box").classList.toggle("hidden", !w1.checked && !w2.checked); };
  w1.checked = f.w1_aktiv; w2.checked = f.w2_aktiv;
  w1.disabled = w2.disabled = !!editId;
  w1.onchange = w2.onchange = sync; sync();

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

  let editingItem = null;
  function drawMenu() {
    document.getElementById("menu").innerHTML = f.speisekarte.map((i, n) => `
      <div class="list-item"><span class="badge-icon soft"><i data-lucide="${i.icon}"></i></span>
        <span style="flex:1"><div class="title">${UI.escape(i.name)}</div><div class="sub">${UI.escape(i.kategorie)} · ${UI.euro(i.preis)}</div></span>
        <button data-ei="${n}" aria-label="Artikel bearbeiten">Bearbeiten</button><button data-ri="${n}" aria-label="Entfernen"><i data-lucide="trash-2"></i></button></div>`).join("")
      || `<div class="list-item muted">Noch keine Artikel</div>`;
    UI.icons();
    document.querySelectorAll("[data-ei]").forEach(b => b.onclick = () => {
      const i = f.speisekarte[+b.dataset.ei]; editingItem = i.id;
      document.getElementById("iName").value = i.name; document.getElementById("iPreis").value = i.preis;
      const category = document.getElementById("iKat");
      if (![...category.options].some(o => o.value === i.kategorie)) category.add(new Option(i.kategorie, i.kategorie));
      category.value = i.kategorie; document.getElementById("iIcon").value = i.icon; showIcon();
      drawMenu(); document.getElementById("iName").focus();
    });
    document.querySelectorAll("[data-ri]").forEach((b) => (b.onclick = () => { f.speisekarte.splice(+b.dataset.ri, 1); drawMenu(); }));
  }
  document.getElementById("addItem").onclick = () => {
    const name = document.getElementById("iName").value.trim(), preis = Number(document.getElementById("iPreis").value);
    if (!name || !(preis > 0)) return UI.toast("Name und Preis angeben", "info");
    const item = { id: editingItem || Math.random().toString(36).slice(2), name, preis, kategorie: document.getElementById("iKat").value.trim() || "Sonstiges", icon: document.getElementById("iIcon").value || "utensils" };
    if (editingItem) f.speisekarte[f.speisekarte.findIndex(i => i.id === editingItem)] = item;
    else f.speisekarte.push(item);
    editingItem = null;
    ["iName", "iPreis", "iKat", "iIcon"].forEach((id) => (document.getElementById(id).value = "")); showIcon(); drawMenu();
  };

  // ---------- Tabs ----------
  root.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => {
    root.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
    document.getElementById("tabFest").classList.toggle("hidden", b.dataset.tab !== "fest");
    document.getElementById("tabHelfer").classList.toggle("hidden", b.dataset.tab !== "helfer");
  }));

  // ---------- Helfer ----------
  function drawHelfer() {
    document.getElementById("helferList").innerHTML = f.helfer.map((h, n) => `
      <div class="list-item"><span class="badge-icon soft"><i data-lucide="scan-line"></i></span>
        <span style="flex:1"><div class="title">${UI.escape(h.name)}</div><div class="sub">${UI.escape(h.email)}</div></span>
        <button data-rh="${n}" aria-label="Entfernen"><i data-lucide="trash-2"></i></button></div>`).join("")
      || `<div class="list-item muted">Noch keine Helfer</div>`;
    UI.icons();
    document.querySelectorAll("[data-rh]").forEach((b) => (b.onclick = () => { f.helfer.splice(+b.dataset.rh, 1); drawHelfer(); }));
  }
  document.getElementById("addHelfer").onclick = () => {
    const name = document.getElementById("hName").value.trim(), email = document.getElementById("hMail").value.trim().toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return UI.toast("Name und gültige E-Mail angeben", "info");
    if (f.helfer.some((h) => h.email === email)) return UI.toast("E-Mail ist schon eingetragen", "info");
    f.helfer.push({ name, email });
    ["hName", "hMail"].forEach((id) => (document.getElementById(id).value = "")); drawHelfer();
  };

  document.getElementById("save").onclick = async () => {
    f.name = document.getElementById("name").value.trim();
    function invalid(id, message) {
      document.querySelector('[data-tab="fest"]').click();
      const el = document.getElementById(id); el.classList.add("field-error"); el.setAttribute("aria-invalid", "true");
      el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({preventScroll:true}); UI.toast(message, "info");
    }
    root.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.classList.remove("field-error"); });
    f.start = document.getElementById("start").value; f.ende = document.getElementById("ende").value;
    if (editingItem || document.getElementById("iName").value.trim()) return invalid("iName", "Artikel zuerst mit Artikel hinzufügen übernehmen");
    if (!f.name) return invalid("name", "Name fehlt");
    if (!f.start) return invalid("start", "Anfang fehlt");
    if (!f.ende || Date.parse(f.ende) <= Date.parse(f.start)) return invalid("ende", "Ende muss nach dem Anfang liegen");
    if (f.zone.length < 3) return invalid("mm", "Zone braucht mind. 3 Punkte");
    if (!f.w1_aktiv && !f.w2_aktiv) return invalid("w1", "Mindestens einen Bezahlweg wählen");
    if (f.w1_aktiv && !f.aufladeoptionen.length) return invalid("newTop", "Aufladebetrag hinzufügen");
    if ((f.w1_aktiv || f.w2_aktiv) && !f.speisekarte.length) return invalid("iName", "Artikel zur Speisekarte hinzufügen");
    const res = await API.festSpeichern(f);
    if (res.error) return UI.toast(res.error.message, "alert-triangle");
    UI.toast(editId ? "Fest gespeichert" : "Fest veröffentlicht"); setTimeout(() => (location.href = "index.html"), 700);
  };

  root.addEventListener("input", e => { e.target.removeAttribute("aria-invalid"); e.target.classList.remove("field-error"); });
  drawMap(); drawTops(); drawMenu(); drawHelfer();
})();
