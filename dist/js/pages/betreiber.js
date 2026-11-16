/* =========================================================
   betreiber.js – Betreiber-Bereich
   Fest anlegen: Name, Ort, Zone auf Karte zeichnen,
   W1/W2 aktivieren, Aufladebeträge, Speisekarte.
   Tab "Helfer": Helfer (Name + E-Mail) dem Fest zuordnen.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  if ((await API.getRolle()) !== "betreiber") {
    root.innerHTML = `<div class="empty"><i data-lucide="shield-alert"></i><h3>Nur für Betreiber</h3><p>Feste legen Betreiber an. ${API.istDemo() ? "Im Klickdummy kannst du direkt als Betreiber weitermachen." : "Im Profil siehst du deine Rolle."}</p>
      ${API.istDemo() ? `<button class="btn" style="margin-top:16px" id="alsBetreiber"><i data-lucide="plus"></i>Als Betreiber Fest anlegen</button>` : ""}
      <a class="btn btn-ghost" style="margin-top:10px" href="profil.html">Zum Profil</a></div>`;
    const alsBetreiber = document.getElementById("alsBetreiber");
    if (alsBetreiber) alsBetreiber.onclick = () => { API.setDemoRolle("betreiber"); location.reload(); };
    return UI.icons();
  }
  const ICONS = ["cup-soda", "beer", "wine", "coffee", "sandwich", "pizza", "ice-cream-cone", "utensils"];
  const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
    const minutes = index * 15;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
  const editId = UI.param("id");
  if (editId && !(await API.istBetreiberFuer(editId))) { root.textContent = "Kein Betreiberzugang zu diesem Fest."; return; }
  const f = editId ? structuredClone(await API.getFest(editId)) : { name: "", ort: "", zone: [], w1_aktiv: true, w2_aktiv: false, aufladeoptionen: [10, 20, 30], speisekarte: [], helfer: [] };

  f.helfer ??= []; f.speisekarte ??= [];
  root.innerHTML = `
    <div class="page-head"><h1>${editId ? "Fest bearbeiten" : "Fest anlegen"}</h1><p>Steck deinen Bereich digital ab und leg fest, wie Gäste zahlen.</p></div>
    <div class="page stack festival-form">
      ${editId && f.w1_aktiv ? `<a class="btn btn-dark" href="helfer.html?fest=${encodeURIComponent(editId)}">Kasse &amp; Scanner öffnen</a>` : ""}
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

      <div class="festival-dates">
        ${[["start", "Anfang"], ["ende", "Ende"]].map(([id, label]) => `
          <fieldset><legend>${label}</legend>
            <div class="field"><span>Datum</span><div class="date-picker" id="${id}DatePicker">
              <button class="input date-trigger" id="${id}DateTrigger" type="button" aria-haspopup="dialog" aria-expanded="false"><span id="${id}DateLabel">Datum wählen</span><i data-lucide="calendar-days"></i></button>
              <input id="${id}Date" type="hidden">
              <div class="date-calendar" role="dialog" aria-label="${label} Datum auswählen" hidden>
                <div class="calendar-head"><button type="button" data-month="-1" aria-label="Vorheriger Monat"><i data-lucide="chevron-left"></i></button><strong></strong><button type="button" data-month="1" aria-label="Nächster Monat"><i data-lucide="chevron-right"></i></button></div>
                <div class="calendar-weekdays" aria-hidden="true"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
                <div class="calendar-days" role="grid"></div>
              </div>
            </div></div>
            <div class="field"><span>Uhrzeit</span><div class="time-picker" id="${id}TimePicker">
              <button class="input time-trigger" id="${id}TimeTrigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span id="${id}TimeLabel">Uhrzeit wählen</span><i data-lucide="chevron-down"></i></button>
              <input id="${id}Time" type="hidden">
              <div class="time-options" role="listbox" aria-label="${label} Uhrzeit" hidden>${TIME_OPTIONS.map(time => `<button type="button" role="option" data-time="${time}">${time}</button>`).join("")}</div>
            </div></div>
          </fieldset>`).join("")}
      </div>
      <section class="zone-editor" aria-labelledby="zoneHeading">
        <h3 id="zoneHeading">Festzone</h3>
        <button type="button" class="btn btn-ghost btn-sm" id="zoneStart" data-track="zone-start">Festzone zeichnen</button>
        <div id="zoneModes" class="segment" role="group" aria-label="Zeichenart" hidden>
          <button type="button" id="zonePoints" data-track="zone-points">Punkte setzen</button>
          <button type="button" id="zoneRectangle" data-track="zone-rectangle">Rechteck aufziehen</button>
        </div>
        <p id="zoneHint" class="small muted" role="status"></p>
        <div class="mini-map" id="mm" tabindex="-1" aria-describedby="zoneHint"></div>
        <div id="zoneActions" class="zone-actions" hidden>
          <button type="button" class="btn btn-ghost btn-sm" id="zoneUndo" data-track="zone-undo">Letzten Punkt entfernen</button>
          <button type="button" class="btn btn-ghost btn-sm" id="zoneCancel" data-track="zone-cancel">Zeichnen abbrechen</button>
          <button type="button" class="btn btn-sm" id="zoneAccept" data-track="zone-accept">Festzone übernehmen</button>
        </div>
      </section>

      <h3 style="margin-top:12px">Bezahlweg</h3>
      <div class="card">
        <label class="switch"><span><b>W1 Festguthaben</b><br><span class="small muted">QR-Guthaben, Helfer bucht ab</span></span><input type="radio" name="payment" id="w1" checked></label>
        <label class="switch"><span><b>W2 Festmarken</b><br><span class="small muted">Speisekarte, Gast entwertet</span></span><input type="radio" name="payment" id="w2"></label>
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
  document.getElementById("name").value = f.name || "";
  for (const id of ["start", "ende"]) {
    const match = (f[id] || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
    if (!match) continue;
    const [, year, month, day, time] = match;
    document.getElementById(id + "Date").value = `${year}-${month}-${day}`;
    document.getElementById(id + "DateLabel").textContent = `${day}.${month}.${year}`;
    document.getElementById(id + "Time").value = time;
    document.getElementById(id + "TimeLabel").textContent = time;
  }
  function dateValue(id) {
    const date = document.getElementById(id + "Date").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(date + "T00:00:00Z");
    return Number.isFinite(+parsed) && parsed.toISOString().startsWith(date) ? date : null;
  }
  UI.icons();

  function closePickers() {
    root.querySelectorAll('.date-calendar, .time-options').forEach(menu => {
      menu.hidden = true;
      menu.closest('.date-picker, .time-picker').querySelector('[aria-expanded]').setAttribute('aria-expanded', 'false');
    });
  }

  root.querySelectorAll('.date-picker').forEach(picker => {
    const trigger = picker.querySelector('.date-trigger');
    const calendar = picker.querySelector('.date-calendar');
    const input = picker.querySelector('input[type="hidden"]');
    const label = trigger.querySelector('span');
    const monthLabel = picker.querySelector('.calendar-head strong');
    const days = picker.querySelector('.calendar-days');
    const selected = input.value ? input.value.split('-').map(Number) : null;
    let visibleMonth = selected ? new Date(selected[0], selected[1] - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    function iso(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function renderCalendar() {
      const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
      monthLabel.textContent = visibleMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      const today = iso(new Date());
      days.innerHTML = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(year, month, index - offset + 1);
        const value = iso(date);
        return `<button type="button" role="gridcell" data-date="${value}" class="${date.getMonth() === month ? '' : 'outside'} ${value === today ? 'today' : ''}" aria-selected="${value === input.value}">${date.getDate()}</button>`;
      }).join('');
      days.querySelectorAll('[data-date]').forEach(day => day.onclick = () => {
        input.value = day.dataset.date;
        const [year, month, date] = day.dataset.date.split('-');
        label.textContent = `${date}.${month}.${year}`;
        trigger.removeAttribute('aria-invalid');
        trigger.classList.remove('field-error');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closePickers(); trigger.focus();
      });
    }
    trigger.onclick = () => {
      const opening = calendar.hidden;
      closePickers();
      if (input.value) { const [year, month] = input.value.split('-').map(Number); visibleMonth = new Date(year, month - 1, 1); }
      if (opening) renderCalendar();
      calendar.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
    };
    picker.querySelectorAll('[data-month]').forEach(button => button.onclick = () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + Number(button.dataset.month), 1);
      renderCalendar();
    });
    picker.addEventListener('keydown', event => { if (event.key === 'Escape') { closePickers(); trigger.focus(); } });
  });

  root.querySelectorAll('.time-picker').forEach(picker => {
    const trigger = picker.querySelector('.time-trigger');
    const options = picker.querySelector('.time-options');
    const input = picker.querySelector('input[type="hidden"]');
    const label = trigger.querySelector('span');
    function close() { options.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
    trigger.onclick = () => {
      const opening = options.hidden;
      closePickers();
      options.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
      if (opening) options.querySelector(`[data-time="${input.value}"]`)?.scrollIntoView({ block: 'center' });
    };
    options.querySelectorAll('[data-time]').forEach(option => option.onclick = () => {
      input.value = option.dataset.time;
      label.textContent = option.dataset.time;
      trigger.removeAttribute('aria-invalid');
      trigger.classList.remove('field-error');
      options.querySelectorAll('[role="option"]').forEach(item => item.setAttribute('aria-selected', String(item === option)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      close(); trigger.focus();
    });
    picker.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); trigger.focus(); } });
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.date-picker, .time-picker')) return;
    closePickers();
  });

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
  const zoneStart = document.getElementById("zoneStart");
  const zoneModes = document.getElementById("zoneModes");
  const zoneActions = document.getElementById("zoneActions");
  const zoneHint = document.getElementById("zoneHint");
  const zonePoints = document.getElementById("zonePoints");
  const zoneRectangle = document.getElementById("zoneRectangle");
  const zoneUndo = document.getElementById("zoneUndo");
  let mode = null, draft = [], drag = null, previousRectangle = null;

  function zoneProblem(points) {
    if (points.length < 3) {
      const missing = 3 - points.length;
      return `Mindestens 3 Punkte nötig. Setze noch ${missing} ${missing === 1 ? "Punkt" : "Punkte"}.`;
    }
    const area = points.reduce((sum, [x, y], i) => {
      const [nextX, nextY] = points[(i + 1) % points.length];
      return sum + x * nextY - y * nextX;
    }, 0);
    return Math.abs(area) < 2 ? "Die Punkte müssen eine Fläche bilden. Setze einen Eckpunkt an eine andere Stelle." : "";
  }

  function drawMap() {
    const points = mode ? draft : f.zone;
    const filled = points.length >= 3 && !zoneProblem(points);
    const coordinates = points.map(p => p.join(",")).join(" ");
    mm.innerHTML = `<svg viewBox="0 0 1000 1000" aria-hidden="true">
      <rect width="1000" height="1000" fill="var(--map-land)"/>
      <rect x="80" y="620" width="300" height="300" rx="40" fill="var(--map-green)"/>
      <g stroke="var(--map-road)" stroke-width="24" fill="none"><path d="M0 330 L1000 300"/><path d="M0 640 Q500 610 1000 660"/><path d="M350 160 L340 1000"/><path d="M680 160 Q700 500 660 1000"/></g>
      ${filled ? `<polygon points="${coordinates}" fill="var(--zone)" stroke="var(--zone-line)" stroke-width="6"/>` :
        `<polyline points="${coordinates}" fill="none" stroke="var(--ink)" stroke-width="6"/>`}
      ${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="14" fill="var(--ink)"/>
        ${mode === "rectangle" && filled ? `<circle cx="${x}" cy="${y}" r="48" fill="transparent" data-corner="${i}"/>` : ""}`).join("")}
    </svg>`;
  }

  function renderZone() {
    zoneStart.hidden = !!mode;
    zoneStart.textContent = f.zone.length ? "Festzone bearbeiten" : "Festzone zeichnen";
    zoneModes.hidden = zoneActions.hidden = !mode;
    zonePoints.setAttribute("aria-pressed", String(mode === "points"));
    zoneRectangle.setAttribute("aria-pressed", String(mode === "rectangle"));
    mm.dataset.mode = mode || "preview";
    mm.removeAttribute("aria-invalid");
    mm.classList.remove("field-error");
    zoneUndo.hidden = mode === "rectangle" ? !previousRectangle : !draft.length;
    zoneUndo.textContent = mode === "rectangle" ? "Letzte Änderung rückgängig machen" : "Letzten Punkt entfernen";
    if (mode === "points") {
      const progress = draft.length < 3 ? `${draft.length} von mindestens 3 Punkten.` : `${draft.length} Eckpunkte gesetzt.`;
      zoneHint.textContent = progress + (draft.length < 3 ? " Tippe auf die Karte, um einen Punkt zu setzen." :
        " " + (zoneProblem(draft) || "Du kannst die Zone übernehmen oder weitere Punkte setzen."));
    } else if (mode === "rectangle") {
      zoneHint.textContent = draft.length ? "Ziehe eine Ecke zum Anpassen oder die Fläche neu auf." :
        "Ziehe von einer Ecke diagonal zur gegenüberliegenden Ecke.";
    } else {
      zoneHint.textContent = f.zone.length ? "Festzone übernommen." : "Lege die Fläche fest, auf der dein Fest stattfindet.";
    }
    drawMap();
  }

  function setMode(next) {
    if (mode === next) return;
    const original = mode && draft.length ? draft : f.zone;
    draft = next === "points" ? original.slice() : [];
    mode = next;
    previousRectangle = null;
    renderZone();
  }

  function mapCoordinates(e) {
    const r = mm.querySelector("svg").getBoundingClientRect();
    const coord = (value, origin, size) => Math.max(0, Math.min(1000, Math.round((value - origin) / size * 1000)));
    return [coord(e.clientX, r.left, r.width), coord(e.clientY, r.top, r.height)];
  }

  zoneStart.onclick = () => { setMode("points"); zonePoints.focus(); };
  zonePoints.onclick = () => setMode("points");
  zoneRectangle.onclick = () => setMode("rectangle");
  zoneUndo.onclick = () => {
    if (mode === "rectangle" && previousRectangle) {
      draft = previousRectangle;
      previousRectangle = null;
    } else if (mode === "points") draft.pop();
    renderZone();
  };
  zoneActions.querySelector("#zoneCancel").onclick = () => { mode = null; renderZone(); zoneStart.focus(); };
  zoneActions.querySelector("#zoneAccept").onclick = () => { if (acceptZone()) zoneStart.focus(); };

  mm.onclick = e => {
    if (mode !== "points") return;
    const point = mapCoordinates(e);
    if (draft.some(([x, y]) => x === point[0] && y === point[1])) return;
    draft.push(point);
    renderZone();
  };

  mm.onpointerdown = e => {
    if (mode !== "rectangle" || !e.isPrimary || e.button !== 0 || drag) return;
    const corner = e.target.dataset.corner;
    drag = {id:e.pointerId, before:draft, origin:[e.clientX, e.clientY],
      anchor:corner === undefined ? mapCoordinates(e) : draft[(Number(corner) + 2) % 4]};
    mm.setPointerCapture(e.pointerId);
  };
  mm.onpointermove = e => {
    if (drag?.id !== e.pointerId || Math.hypot(e.clientX - drag.origin[0], e.clientY - drag.origin[1]) < 5) return;
    const [x1, y1] = drag.anchor, [x2, y2] = mapCoordinates(e);
    draft = [[x1,y1], [x2,y1], [x2,y2], [x1,y2]];
    drawMap();
  };
  function finishRectangle(e) {
    if (drag?.id !== e.pointerId) return;
    if (e.type !== "pointerup" || zoneProblem(draft)) draft = drag.before;
    else if (draft !== drag.before) {
      previousRectangle = drag.before;
      window.TestLog?.event("activity", {activity:"zone_rectangle_drawn"});
    }
    drag = null;
    renderZone();
  }
  mm.onpointerup = mm.onpointercancel = mm.onlostpointercapture = finishRectangle;

  function acceptZone() {
    const problem = zoneProblem(mode ? draft : f.zone);
    if (problem) {
      if (!mode) setMode("points");
      zoneHint.textContent = problem;
      window.TestLog?.event("activity", {activity:"zone_invalid"});
      invalid("mm", problem);
      return false;
    }
    if (mode) {
      f.zone = draft;
      mode = null;
      renderZone();
      window.TestLog?.event("activity", {activity:"zone_accepted"});
    }
    return true;
  }

  // ---------- W1/W2 ----------
  const w1 = document.getElementById("w1"), w2 = document.getElementById("w2");
  const sync = () => { f.w1_aktiv = w1.checked; f.w2_aktiv = w2.checked;
    document.getElementById("w1box").classList.toggle("hidden", !w1.checked); document.getElementById("w2box").classList.toggle("hidden", !w1.checked && !w2.checked); };
  w1.checked = f.w1_aktiv; w2.checked = !f.w1_aktiv && f.w2_aktiv;
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
    if (!name) return invalid("iName", "Artikelname fehlt");
    if (!(preis > 0) || !Number.isFinite(preis)) return invalid("iPreis", "Gültigen Preis eingeben");
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

    function invalid(id, message) {
      document.querySelector('[data-tab="fest"]').click();
      const el = document.getElementById(id); el.classList.add("field-error"); el.setAttribute("aria-invalid", "true");
      el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({preventScroll:true}); UI.toast(message, "info");
    }
  document.getElementById("save").onclick = async () => {
    f.name = document.getElementById("name").value.trim();
    root.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.classList.remove("field-error"); });
    if (mode && zoneProblem(draft)) { acceptZone(); return; }
    const itemName = document.getElementById("iName").value.trim();
    const itemPrice = document.getElementById("iPreis").value;
    if (editingItem || itemName || itemPrice) {
      if (!itemName) return invalid("iName", "Artikelname fehlt");
      if (!(Number(itemPrice) > 0) || !Number.isFinite(Number(itemPrice))) return invalid("iPreis", "Gültigen Preis eingeben");
      document.getElementById("addItem").click();
    }
    if (!f.name) return invalid("name", "Name fehlt");
    for (const id of ["start", "ende"]) {
      const date = dateValue(id);
      const time = document.getElementById(id + "Time").value;
      if (!date) return invalid(id + "DateTrigger", "Datum auswählen");
      if (!time) return invalid(id + "TimeTrigger", "Uhrzeit auswählen");
      f[id] = `${date}T${time}`;
    }
    if (Date.parse(f.ende) <= Date.parse(f.start)) return invalid("endeTimeTrigger", "Ende muss nach dem Anfang liegen");
    if (!acceptZone()) return;
    if (!f.w1_aktiv && !f.w2_aktiv) return invalid("w1", "Mindestens einen Bezahlweg wählen");
    if (f.w1_aktiv && !f.aufladeoptionen.length) return invalid("newTop", "Aufladebetrag hinzufügen");
    if ((f.w1_aktiv || f.w2_aktiv) && !f.speisekarte.length) return invalid("iName", "Artikel zur Speisekarte hinzufügen");
    const res = await API.festSpeichern(f);
    if (res.error) return UI.toast(res.error.message, "alert-triangle");
    UI.toast(editId ? "Fest gespeichert" : "Fest veröffentlicht"); setTimeout(() => (location.href = "index.html"), 700);
  };

  root.addEventListener("input", e => { e.target.removeAttribute("aria-invalid"); e.target.classList.remove("field-error"); });
  renderZone(); drawTops(); drawMenu(); drawHelfer();
})();
