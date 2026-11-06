/* =========================================================
   guthaben.js – W1 Festguthaben
   Aufladebetrag wählen -> bezahlen.html -> zurück: QR mit Guthaben.
   QR-Inhalt: FESTPAY|<festId>|<userId>  (Helfer liest Guthaben live)
   ========================================================= */
(async function () {
  if (!(await UI.gastZugang(UI.param("id")))) return;
  const root = document.getElementById("root");
  let festId = UI.param("id");
  if (!festId) {
    const funded = [];
    for (const f of await API.getFeste()) if (f.w1_aktiv && await API.getGuthaben(f.id) > 0) funded.push(f);
    if (funded.length === 1) { location.replace(`guthaben.html?id=${encodeURIComponent(funded[0].id)}`); return; }
    root.innerHTML = `<div class="page-head"><h1>Mein Guthaben / QR-Code</h1></div><div class="page stack">${funded.length ? funded.map(f => `<a class="btn btn-dark" href="guthaben.html?id=${encodeURIComponent(f.id)}">${UI.escape(f.name)} · QR-Code zeigen</a>`).join("") : `<p>Noch kein Guthaben aufgeladen.</p><a class="btn" href="index.html">Fest auswählen</a>`}</div>`;
    return UI.icons();
  }
  const fest = await API.getFest(festId);
  if (!fest) { root.innerHTML = `<div class="empty"><i data-lucide="calendar-x-2"></i><h3>Fest nicht gefunden</h3></div>`; return UI.icons(); }
  const user = await API.getUser();
  const optionen = await API.getAufladeoptionen(fest.id);
  let saldo = await API.getGuthaben(fest.id);
  let wahl = null;
  const aufladenErfolgreich = sessionStorage.getItem("topupSuccess") === fest.id;
  if (aufladenErfolgreich) sessionStorage.removeItem("topupSuccess");

  root.innerHTML = `
    <div class="page-head"><div class="small muted"><b>W1</b> · ${fest.name}</div><h1>Festguthaben</h1></div>
    <div class="page stack">
      <div class="wallet">
        <div class="small" style="opacity:.7">Dein Guthaben</div>
        <div class="saldo" id="saldo">${UI.euro(saldo)}</div>
        <div class="qr-box"><div id="qr"></div><div class="qr-scanline"></div></div>
        <div class="live-time"><i data-lucide="radio"></i><span id="clock"></span></div>
      </div>
      <p class="small muted center qr-help">Zeig diesen Code am Stand. Du findest ihn jederzeit wieder, wenn du in der App auf dieses Fest tippst.</p>
      <h3 style="margin-top:24px">Aufladen</h3>
      ${optionen.length
        ? `<div class="chips">${optionen.map((b) => `<button class="chip" data-b="${b}">${b} €</button>`).join("")}</div>`
        : `<div class="empty"><i data-lucide="coins"></i><p>Der Betreiber hat noch keine Aufladebeträge hinterlegt.</p></div>`}
    </div>
    <div class="cta-bar"><button class="btn" id="go" disabled><i data-lucide="plus-circle"></i>Betrag wählen</button></div>`;
  UI.icons();
  new QRCode(document.getElementById("qr"), { text: `FESTPAY|${fest.id}|${user?.id}`, width: 210, height: 210 });
  if (aufladenErfolgreich) {
    const wallet = root.querySelector(".wallet");
    const shade = document.createElement("div");
    shade.className = "topup-shade";
    const guide = document.createElement("div");
    guide.className = "topup-guide";
    guide.setAttribute("role", "status");
    guide.innerHTML = `<span class="topup-guide-arrow" aria-hidden="true"><i data-lucide="arrow-up"></i></span>
      <strong>Guthaben erfolgreich aufgeladen</strong>
      <p>Dein QR-Code steht dir jederzeit in der App bereit. Zeige diesen QR-Code am Stand.</p>`;
    document.body.append(shade, guide);
    document.body.classList.add("topup-guide-open");
    wallet.classList.add("wallet-spotlight");
    UI.icons();

    function placeGuide() {
      const walletRect = wallet.getBoundingClientRect();
      const guideHeight = guide.offsetHeight;
      const top = Math.min(walletRect.bottom + 18, window.innerHeight - guideHeight - 14);
      guide.style.top = `${Math.max(walletRect.top + walletRect.height * .72, top)}px`;
    }
    function dismiss(event) {
      if (event.type === "keydown" && !["Escape", "Enter", " "].includes(event.key)) return;
      document.removeEventListener("click", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
      window.removeEventListener("resize", placeGuide);
      document.body.classList.remove("topup-guide-open");
      wallet.classList.remove("wallet-spotlight");
      shade.remove();
      guide.remove();
    }
    requestAnimationFrame(placeGuide);
    window.addEventListener("resize", placeGuide);
    document.addEventListener("click", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
  }
  const qr = document.getElementById("qr");
  let qrVisible = false, qrReported = false;
  function reportQr() {
    if (!qrReported && qrVisible && saldo > 0 && !document.hidden && !document.querySelector("dialog[open]")) {
      qrReported = true;
      window.TestLog?.event("activity", {activity: "wallet_qr_shown"});
      observer.disconnect();
      document.removeEventListener("visibilitychange", reportQr);
    }
  }
  const observer = new IntersectionObserver(([entry]) => {
    qrVisible = entry.intersectionRatio >= 0.5;
    reportQr();
  }, {threshold: 0.5});
  observer.observe(qr);
  document.querySelector("dialog[open]")?.addEventListener("close", reportQr);
  document.addEventListener("visibilitychange", reportQr);
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
    if (neu !== saldo) { saldo = neu; reportQr(); document.getElementById("saldo").textContent = UI.euro(saldo); UI.toast("Guthaben aktualisiert", "wallet"); }
  }, 3000);
})();
