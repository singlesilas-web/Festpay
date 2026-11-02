/* =========================================================
   helfer.js – Helfer-Scanner (W1)
   QR des Gastes scannen -> Guthaben sehen -> Betrag eintippen -> abbuchen.
   Kamera via html5-qrcode; im Klickdummy zusätzlich "Scan simulieren".
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const rolle = await API.getRolle();
  if (rolle === "gast") {
    root.innerHTML = `<div class="empty"><i data-lucide="shield-alert"></i><h3>Nur für Helfer</h3><p>Im Profil kannst du im Klickdummy die Rolle wechseln.</p>
      <a class="btn btn-dark" style="margin-top:16px" href="profil.html">Zum Profil</a></div>`;
    return UI.icons();
  }
  let gescannt = null, betrag = "";

  root.innerHTML = `
    <div class="page-head"><h1>Scannen</h1><p>QR-Code vom Festguthaben des Gastes scannen.</p></div>
    <div class="page stack">
      <div class="scanner"><div id="reader"></div><div class="frame"></div></div>
      <div class="grid-2">
        <button class="btn btn-dark btn-sm" id="cam" style="width:100%"><i data-lucide="camera"></i>Kamera starten</button>
        <button class="btn btn-ghost btn-sm" id="sim" style="width:100%"><i data-lucide="wand-sparkles"></i>Scan simulieren</button>
      </div>
      <div id="result"></div>
    </div>`;
  UI.icons();

  document.getElementById("cam").onclick = () => {
    if (!window.Html5Qrcode) return UI.toast("Kamera-Bibliothek nicht geladen", "alert-triangle");
    const q = new Html5Qrcode("reader");
    q.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (txt) => { q.stop(); onScan(txt); })
      .catch(() => UI.toast("Kein Kamerazugriff", "camera-off"));
  };
  document.getElementById("sim").onclick = async () => {
    // Klickdummy: nimmt den eigenen QR-Code des ersten Fests mit Guthaben
    const u = await API.getUser(); const feste = await API.getFeste();
    for (const f of feste) if ((await API.getGuthaben(f.id)) > 0) return onScan(`FESTPAY|${f.id}|${u.id}`);
    UI.toast("Erst als Gast Guthaben aufladen", "info");
  };

  async function onScan(txt) {
    const [tag, festId, userId] = txt.split("|");
    if (tag !== "FESTPAY") return UI.toast("Kein FestPay-Code", "x-circle");
    const fest = await API.getFest(festId);
    gescannt = { festId, userId, fest, saldo: await API.getGuthaben(festId, userId) };
    betrag = ""; showResult();
  }

  function showResult() {
    const r = document.getElementById("result");
    r.innerHTML = `<div class="card result stack">
      <div class="row"><span class="badge-icon accent"><i data-lucide="wallet"></i></span>
        <div style="flex:1"><div class="small muted">${gescannt.fest?.name || ""}</div><h3>Guthaben ${UI.euro(gescannt.saldo)}</h3></div></div>
      <div class="center"><div class="small muted">Abbuchen</div><h1 id="amt">${UI.euro(Number(betrag || 0) / 100)}</h1></div>
      <div class="keypad">${[1,2,3,4,5,6,7,8,9,"C",0,"<"].map((k) => `<button data-k="${k}">${k === "<" ? '<i data-lucide="delete"></i>' : k}</button>`).join("")}</div>
      <button class="btn" id="book"><i data-lucide="check"></i>Abbuchen</button></div>`;
    UI.icons();
    r.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      betrag = k === "C" ? "" : k === "<" ? betrag.slice(0, -1) : (betrag + k).slice(0, 6);
      document.getElementById("amt").textContent = UI.euro(Number(betrag || 0) / 100);
    }));
    document.getElementById("book").onclick = async () => {
      const eur = Number(betrag || 0) / 100;
      if (!eur) return UI.toast("Betrag eingeben", "info");
      const res = await API.abbuchen(gescannt.festId, gescannt.userId, eur);
      if (res.error) return UI.toast(res.error.message, "alert-triangle");
      if (navigator.vibrate) navigator.vibrate(30);
      UI.toast(`${UI.euro(eur)} abgebucht`);
      gescannt.saldo -= eur; betrag = ""; showResult();
    };
  }
})();
