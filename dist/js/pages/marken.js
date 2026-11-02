/* =========================================================
   marken.js – W2 Festmarken-Wallet
   Gast hält eine Marke 1,5 s gedrückt -> wird entwertet.
   Danach Vollbild-Animation mit laufender Uhr + Bewegung:
   so erkennt der Helfer sofort, dass es kein Screenshot ist.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const HALTEZEIT = 1500;

  async function render() {
    const marken = await API.getMarken();
    const offen = marken.filter((m) => m.status === "offen");
    const alt = marken.filter((m) => m.status !== "offen");
    const feste = Object.fromEntries((await API.getFeste()).map((f) => [f.id, f.name]));
    const karte = (m) => `
      <div class="marke ${m.status === "offen" ? "" : "used"}" data-id="${m.id}">
        <div class="head"><span class="badge-icon ${m.status === "offen" ? "accent" : "soft"}"><i data-lucide="${m.icon || "ticket"}"></i></span>
          <div><div class="name">${m.name}</div><div class="small" style="opacity:.7">${feste[m.fest_id] || ""}</div></div></div>
        <div class="perf"></div>
        ${m.status === "offen"
          ? `<div class="hold-hint"><i data-lucide="hand"></i>Am Stand gedrückt halten zum Entwerten</div>
             <svg class="ring" viewBox="0 0 54 54"><circle class="bg" cx="27" cy="27" r="24"/><circle class="fg" cx="27" cy="27" r="24"/></svg>`
          : `<div class="hold-hint"><i data-lucide="check-check"></i>Entwertet ${m.entwertet_am ? new Date(m.entwertet_am).toLocaleString("de-DE") : ""}</div>`}
      </div>`;
    root.innerHTML = `
      <div class="page-head"><h1>Meine Festmarken</h1><p>${offen.length} offen</p></div>
      <div class="page">
        ${marken.length ? "" : `<div class="empty"><i data-lucide="ticket"></i><h3>Noch keine Marken</h3><p>Kauf auf einem Fest über W2 Festmarken.</p></div>`}
        ${offen.map(karte).join("")}
        ${alt.length ? `<div class="cat-title" style="margin-top:28px">Entwertet</div>` + alt.map(karte).join("") : ""}
      </div>`;
    UI.icons(); bind();
  }

  function bind() {
    root.querySelectorAll(".marke:not(.used)").forEach((el) => {
      const fg = el.querySelector(".fg"); let t0 = 0, raf = 0;
      const stop = () => { cancelAnimationFrame(raf); el.classList.remove("holding"); fg.style.strokeDashoffset = 151; };
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / HALTEZEIT);
        fg.style.strokeDashoffset = 151 * (1 - p);
        if (p >= 1) { stop(); entwerten(el.dataset.id, el.querySelector(".name").textContent); } else raf = requestAnimationFrame(tick);
      };
      el.addEventListener("pointerdown", () => { t0 = performance.now(); el.classList.add("holding"); if (navigator.vibrate) navigator.vibrate(15); raf = requestAnimationFrame(tick); });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, stop));
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    });
  }

  async function entwerten(id, name) {
    await API.markeEntwerten(id);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    const ov = document.createElement("div"); ov.className = "validate-overlay";
    ov.innerHTML = `<div class="pulse"></div><div>
      <div class="stamp"><i data-lucide="check"></i></div>
      <h1>Entwertet</h1><p style="font-size:20px;margin-top:6px">${name}</p>
      <div class="clock" id="ovClock"></div>
      <p class="small" style="margin-top:28px;opacity:.85">Tippen zum Schließen</p></div>`;
    document.body.appendChild(ov); UI.icons();
    const c = ov.querySelector("#ovClock");
    const upd = () => (c.textContent = new Date().toLocaleTimeString("de-DE") + "." + String(new Date().getMilliseconds()).padStart(3, "0").slice(0, 1));
    upd(); const h = setInterval(upd, 100);
    ov.onclick = () => { clearInterval(h); ov.remove(); render(); };
  }

  render();
})();
