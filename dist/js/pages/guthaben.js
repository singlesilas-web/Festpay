/* =========================================================
   guthaben.js – W1 Festguthaben
   Aufladebetrag wählen -> bezahlen.html -> zurück: QR mit Guthaben.
   QR-Inhalt: FESTPAY|<festId>|<userId>  (Helfer liest Guthaben live)
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const fest = await API.getFest(UI.param("id"));
  if (!fest) { root.innerHTML = `<div class="empty"><i data-lucide="calendar-x-2"></i><h3>Fest nicht gefunden</h3></div>`; return UI.icons(); }
  const user = await API.getUser();
  const optionen = await API.getAufladeoptionen(fest.id);
  let saldo = await API.getGuthaben(fest.id);
  let wahl = null;

  root.innerHTML = `
    <div class="page-head"><div class="small muted"><b>W1</b> · ${fest.name}</div><h1>Festguthaben</h1></div>
    <div class="page stack">
      <div class="wallet">
        <div class="small" style="opacity:.7">Dein Guthaben</div>
        <div class="saldo" id="saldo">${UI.euro(saldo)}</div>
        <div class="qr-box"><div id="qr"></div><div class="qr-scanline"></div></div>
        <div class="live-time"><i data-lucide="radio"></i><span id="clock"></span></div>
      </div>
      <p class="small muted center">Zeig diesen Code am Stand. Der Helfer scannt und bucht ab.</p>
      <h3 style="margin-top:24px">Aufladen</h3>
      ${optionen.length
        ? `<div class="chips">${optionen.map((b) => `<button class="chip" data-b="${b}">${b} €</button>`).join("")}</div>`
        : `<div class="empty"><i data-lucide="coins"></i><p>Der Betreiber hat noch keine Aufladebeträge hinterlegt.</p></div>`}
    </div>
    <div class="cta-bar"><button class="btn" id="go" disabled><i data-lucide="plus-circle"></i>Betrag wählen</button></div>`;
  UI.icons();

  new QRCode(document.getElementById("qr"), { text: `FESTPAY|${fest.id}|${user?.id}`, width: 210, height: 210 });
  const clock = document.getElementById("clock");
  setInterval(() => (clock.textContent = "Live · " + new Date().toLocaleTimeString("de-DE")), 1000);

  const go = document.getElementById("go");
  root.querySelectorAll(".chip").forEach((c) => (c.onclick = () => {
    root.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active"); wahl = Number(c.dataset.b);
    go.disabled = false; go.innerHTML = `<i data-lucide="plus-circle"></i>${UI.euro(wahl)} aufladen`; UI.icons();
  }));
  go.onclick = () => {
    sessionStorage.setItem("checkout", JSON.stringify({ typ: "w1", festId: fest.id, betrag: wahl, zurueck: `guthaben.html?id=${fest.id}` }));
    location.href = "bezahlen.html";
  };

  // Guthaben live aktualisieren (Helfer bucht auf anderem Gerät ab)
  setInterval(async () => {
    const neu = await API.getGuthaben(fest.id);
    if (neu !== saldo) { saldo = neu; document.getElementById("saldo").textContent = UI.euro(saldo); UI.toast("Guthaben aktualisiert", "wallet"); }
  }, 3000);
})();
