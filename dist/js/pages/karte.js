/* =========================================================
   karte.js – Logik der Startseite (index.html)
   - zeichnet die Karte (Klickdummy-SVG; später z.B. Leaflet/Mapbox)
   - Karte verschieben, Pin bleibt mittig
   - Pin in Fest-Zone => Fest erscheint im Bottom-Sheet
   ========================================================= */
(async function () {
  let SCALE = 1.6;               // 1 Karteneinheit = 1.6px
  const wrap = document.getElementById("mapWrap");
  const map = document.getElementById("map");
  const sheet = document.getElementById("sheet");
  const helperRole = (await API.getRolle()) === "helfer";
  const feste = [];
  for (const f of await API.getFeste()) if (API.istFestAktiv(f) && (!helperRole || await API.istHelferFuer(f.id))) feste.push(f);
  const balances = new Map(await Promise.all(feste.map(async f => [f.id, await API.getGuthaben(f.id)])));
  let tx = 0, ty = 0, aktuell = null;

  // ---------- Karte zeichnen ----------
  const zonen = feste.map((f) => {
    const pts = f.zone.map((p) => p.join(",")).join(" ");
    const cx = f.zone.reduce((a, p) => a + p[0], 0) / f.zone.length;
    const cy = f.zone.reduce((a, p) => a + p[1], 0) / f.zone.length;
    const w = Math.max(120, f.name.length * 13 + 40);
    return `<polygon class="zone" data-id="${f.id}" points="${pts}"/>
      <g class="zone-label" data-id="${f.id}" transform="translate(${cx - w / 2},${cy - 22})">
        <rect width="${w}" height="44" rx="12"/><text x="${w / 2}" y="29" text-anchor="middle">${f.name}</text></g>`;
  }).join("");

  map.innerHTML = `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="1000" fill="var(--map-land)"/>
    <path d="M0 120 Q300 60 520 140 T1000 110 V0 H0Z" fill="var(--map-water)"/>
    <rect x="80" y="620" width="300" height="300" rx="40" fill="var(--map-green)"/>
    <rect x="700" y="640" width="220" height="180" rx="30" fill="var(--map-green)"/>
    ${[[180,220,140,90],[400,210,120,80],[720,230,160,100],[700,420,120,140],[180,420,130,120],[470,700,150,110],[720,880,180,80]]
      .map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--map-build)"/>`).join("")}
    <g stroke="var(--map-road)" stroke-linecap="round" fill="none">
      <path d="M0 330 L1000 300" stroke-width="28"/>
      <path d="M0 640 Q500 610 1000 660" stroke-width="22"/>
      <path d="M350 160 L340 1000" stroke-width="24"/>
      <path d="M680 160 Q700 500 660 1000" stroke-width="20"/>
      <path d="M100 500 L900 520" stroke-width="12"/>
    </g>
    ${zonen}
  </svg>`;

  // ---------- Verschieben ----------
  function apply() { map.dataset.scale=SCALE; map.style.transform = `translate(${tx}px, ${ty}px) scale(${SCALE / 1.6})`; }
  function centerOn(x, y) {
    tx = wrap.clientWidth / 2 - x * SCALE;
    ty = wrap.clientHeight / 2 - y * SCALE; apply();
  }
  function mapPoint() { return [(wrap.clientWidth / 2 - tx) / SCALE, (wrap.clientHeight / 2 - ty) / SCALE]; }
  centerOn(520, 760);
  function zoomTo(next, x = wrap.clientWidth/2, y = wrap.clientHeight/2, source = 'button') {
    map.classList.remove('animate');const old = SCALE; SCALE = Math.max(.24, Math.min(4, next));
    tx = x - (x - tx) * SCALE/old; ty = y - (y - ty) * SCALE/old;
    apply(); check();
    clearTimeout(zoomTo.timer); zoomTo.timer = setTimeout(() => window.TestLog?.event('map_zoom', {scale:SCALE, source}), 250);
  }
  document.getElementById('zoomIn').onclick = () => zoomTo(SCALE * 1.7);
  document.getElementById('zoomOut').onclick = () => zoomTo(SCALE / 1.7);
  document.getElementById('zoomFit').onclick = () => { SCALE = Math.min(wrap.clientWidth,wrap.clientHeight)/1000; centerOn(500,500); check(); window.TestLog?.event('map_zoom',{scale:SCALE,source:'fit'}); };
  wrap.addEventListener('wheel', e => {
    if(e.target.closest('button,a,.sheet,.search-panel')) return;
    e.preventDefault(); const r=wrap.getBoundingClientRect(); zoomTo(SCALE*Math.exp(-Math.max(-240,Math.min(240,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?wrap.clientHeight:1)))*.008),e.clientX-r.left,e.clientY-r.top,'wheel');
  }, {passive:false});
  const pointers=new Map(); let start=null, pinch=null;
  const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  wrap.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,a,.sheet,.search-panel')) return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); wrap.setPointerCapture(e.pointerId);
    if(pointers.size===2){pinch={distance:distance(),scale:SCALE};start=null;}
    else start={x:e.clientX,y:e.clientY,tx,ty};
    wrap.classList.add('dragging','lifted');
  });
  wrap.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2 && pinch){const [a,b]=[...pointers.values()],r=wrap.getBoundingClientRect();zoomTo(pinch.scale*Math.pow(distance()/pinch.distance,1.9),(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,'pinch');}
    else if(start){tx=start.tx+e.clientX-start.x;ty=start.ty+e.clientY-start.y;apply();check(true);}
  });
  function end(e){
    if(!pointers.has(e.pointerId))return;
    const moved=start&&Math.hypot(tx-start.tx,ty-start.ty)>6;
    pointers.delete(e.pointerId);start=null;pinch=null;
    if(pointers.size===1){const a=[...pointers.values()][0];start={...a,tx,ty};}
    if(!pointers.size){wrap.classList.remove('dragging','lifted');check();if(moved)window.TestLog?.event('map_pan',{scale:SCALE});}
  }
  wrap.addEventListener('pointerup',end);wrap.addEventListener('pointercancel',end);
  window.addEventListener('resize',()=>{const [x,y]=mapPoint();centerOn(x,y);check();});

  // ---------- Zone prüfen ----------
  function inside([x, y], poly) {
    let r = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
    }
    return r;
  }
  function check(live) {
    const p = mapPoint();
    const f = feste.find((f) => inside(p, f.zone)) || null;
    document.querySelectorAll(".zone, .zone-label").forEach((el) => el.classList.toggle("active", f && el.dataset.id === f.id));
    wrap.classList.toggle("inside", !!f);
    const icon = document.querySelector(".pin-head i, .pin-head svg");
    if (icon && icon.dataset.state !== (f ? "in" : "out")) {
      icon.outerHTML = `<i data-lucide="${f ? "party-popper" : "footprints"}" data-state="${f ? "in" : "out"}"></i>`;
      UI.icons();
    }
    if (live && f === aktuell) return;
    if (f !== aktuell) { aktuell = f; renderSheet(); if (f && navigator.vibrate) navigator.vibrate(20); }
  }

  // ---------- Bottom-Sheet ----------
  function renderSheet() {
    wrap.classList.add("sheet-open");
    if (!feste.length) {
      sheet.innerHTML = `<div class="grip"></div><h2>Noch keine Feste</h2><p class="sub">Sobald Betreiber ein Fest anlegen, erscheint es hier auf der Karte.</p>`;
    } else if (!aktuell) {
      sheet.innerHTML = `<div class="grip"></div><h2>Kein Fest hier</h2>
        <p class="sub">Verschiebe die Karte in eine Fest-Zone oder suche nach einem Fest.</p>
        <button class="btn" id="sheetSearch"><i data-lucide="search"></i>Fest suchen</button>`;
      sheet.querySelector("#sheetSearch").onclick = openSearch;
    } else {
      const w = [aktuell.w1_aktiv && "Festguthaben", aktuell.w2_aktiv && "Festmarken"].filter(Boolean).join(" · ");
      sheet.innerHTML = `<div class="grip"></div><h2>Fest gefunden</h2><p class="sub">Du bist in der Zone von</p>
        <a class="fest-card" href="${helperRole ? `helfer.html?fest=${encodeURIComponent(aktuell.id)}` : `${balances.get(aktuell.id) > 0 ? "guthaben" : "fest"}.html?id=${encodeURIComponent(aktuell.id)}`}">
          <span class="badge-icon accent"><i data-lucide="tent"></i></span>
          <span style="flex:1"><div class="t">${helperRole ? "Scanner öffnen" : balances.get(aktuell.id) > 0 ? "Meinen QR-Code zeigen" : UI.escape(aktuell.name)}</div><div class="s">${aktuell.ort || ""} · ${w}</div></span>
          <i data-lucide="chevron-right"></i></a>`;
    }
    UI.icons();
  }

  // ---------- Suche & Standort ----------
  const panel = document.getElementById("searchPanel");
  function openSearch() {
    document.getElementById("festList").innerHTML = feste.length
      ? feste.map((f) => `<button class="list-item" data-id="${f.id}"><span class="badge-icon soft"><i data-lucide="tent"></i></span>
          <span style="flex:1"><div class="title">${f.name}</div><div class="sub">${f.ort || ""}</div></span><i data-lucide="map-pin"></i></button>`).join("")
      : `<div class="empty"><i data-lucide="calendar-x-2"></i><h3>Keine Feste</h3><p>Es sind noch keine Feste angelegt.</p></div>`;
    panel.classList.add("open"); UI.icons();
    panel.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => { panel.classList.remove("open"); fly(feste.find((f) => f.id === b.dataset.id)); }));
  }
  function fly(f) {
    const cx = f.zone.reduce((a, p) => a + p[0], 0) / f.zone.length;
    const cy = f.zone.reduce((a, p) => a + p[1], 0) / f.zone.length;
    map.classList.add("animate");
    tx = wrap.clientWidth / 2 - cx * SCALE; ty = wrap.clientHeight / 2 - cy * SCALE; apply();
    setTimeout(() => { map.classList.remove("animate"); check(); }, 300);
  }
  document.getElementById("btnSearch").onclick = openSearch;
  document.getElementById("btnSearchClose").onclick = () => panel.classList.remove("open");
  document.getElementById("btnLocate").onclick = () => {
    if (!feste.length) return UI.toast("Keine Feste vorhanden", "info");
    const [x, y] = mapPoint();
    const near = feste.slice().sort((a, b) => Math.hypot(a.zone[0][0] - x, a.zone[0][1] - y) - Math.hypot(b.zone[0][0] - x, b.zone[0][1] - y))[0];
    fly(near);
  };

  renderSheet();
})();
