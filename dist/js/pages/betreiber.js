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
      <h3 style="margin-top:12px">Fest-Zone</h3>
      <p class="small muted">Tippe Eckpunkte auf die Karte (mind. 3).</p>
      <div class="mini-map" id="mm" tabindex="-1"></div>
      <button class="btn btn-ghost btn-sm" id="resetZone"><i data-lucide="rotate-ccw"></i>Zone zurücksetzen</button>

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
