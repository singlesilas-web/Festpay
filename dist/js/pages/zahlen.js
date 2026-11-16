/* =========================================================
   zahlen.js – Tab „Bezahlen“
   Oben: eigener QR-Code für das Festguthaben (W1). Bei mehreren
   Festen mit Guthaben wird oben zwischen ihnen umgeschaltet.
   Unten: Festmarken (W2) – gerendert von marken.js in #markenRoot.
   QR-Inhalt wie in guthaben.js: FESTPAY|<festId>|<userId>
   (technische Kennung, bleibt für Scanner-Kompatibilität unverändert).
   ========================================================= */
(async function () {
  if (!(await UI.gastZugang(UI.param("id")))) return;
  const user = await API.getUser();

  const mitGuthaben = [];
  for (const f of await API.getFeste()) if (f.w1_aktiv && (await API.getGuthaben(f.id)) > 0) mitGuthaben.push(f);
  let fest = mitGuthaben.find((f) => f.id === UI.param("id")) || mitGuthaben[0] || null;

  const bereich = document.getElementById("qrBereich");
  let saldo = 0, qrReported = false, observer = null;

  function reportQr() {
    const qr = document.getElementById("qr");
    if (!qr || qrReported || saldo <= 0 || document.hidden) return;
    const r = qr.getBoundingClientRect();
    const sichtbar = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / (r.height || 1);
    if (sichtbar >= 0.5) { qrReported = true; window.TestLog?.event("activity", { activity: "wallet_qr_shown" }); }
  }

  async function render() {
    if (!fest) {
      bereich.innerHTML = `<div class="card qr-empty">
          <span class="badge-icon soft"><i data-lucide="wallet"></i></span>
          <div><b>Noch kein Festguthaben</b><p class="small muted">Wähle auf der Karte ein Fest mit Festguthaben und lade Guthaben auf. Dein QR-Code erscheint dann hier.</p></div>
        </div>
        <a class="btn btn-ghost" data-track="zahlen-karte" href="index.html"><i data-lucide="map"></i>Fest auf der Karte finden</a>`;
      return UI.icons();
    }
    saldo = await API.getGuthaben(fest.id);
    bereich.innerHTML = `
      ${mitGuthaben.length > 1 ? `<div class="fest-switch" role="tablist" aria-label="Fest wählen">${mitGuthaben.map((f) =>
        `<button role="tab" data-track="zahlen-fest-wechseln" data-fest="${UI.escape(f.id)}" aria-selected="${f.id === fest.id}" class="${f.id === fest.id ? "active" : ""}">${UI.escape(f.name)}</button>`).join("")}</div>` : ""}
      <div class="wallet">
        <div class="small" style="opacity:.75">${UI.escape(fest.name)} · Dein Guthaben</div>
        <div class="saldo" id="saldo">${UI.euro(saldo)}</div>
        <div class="qr-box"><div id="qr"></div></div>
        <div class="live-time"><i data-lucide="radio"></i><span id="clock"></span></div>
      </div>
      <a class="btn btn-ghost" data-track="zahlen-aufladen" href="guthaben.html?id=${encodeURIComponent(fest.id)}"><i data-lucide="plus-circle"></i>Guthaben aufladen</a>`;
    UI.icons();
    new QRCode(document.getElementById("qr"), { text: `FESTPAY|${fest.id}|${user?.id}`, width: 210, height: 210 });
    bereich.querySelectorAll("[data-fest]").forEach((b) => (b.onclick = () => {
      fest = mitGuthaben.find((f) => f.id === b.dataset.fest);
      history.replaceState(null, "", `zahlen.html?id=${encodeURIComponent(fest.id)}`);
      render();
    }));
    observer?.disconnect();
    observer = new IntersectionObserver(reportQr, { threshold: 0.5 });
    observer.observe(document.getElementById("qr"));
    reportQr();
  }
  await render();

  document.addEventListener("visibilitychange", reportQr);
  setInterval(() => { const c = document.getElementById("clock"); if (c) c.textContent = "Live · " + new Date().toLocaleTimeString("de-DE"); }, 1000);
  // Guthaben live aktualisieren (Helfer bucht auf anderem Gerät ab)
  setInterval(async () => {
    if (!fest) return;
    const neu = await API.getGuthaben(fest.id);
    if (neu !== saldo) { saldo = neu; document.getElementById("saldo").textContent = UI.euro(saldo); UI.toast("Guthaben aktualisiert", "wallet"); reportQr(); }
  }, 3000);
})();
