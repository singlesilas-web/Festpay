/* =========================================================
   fest.js – Fest-Übersicht: Auswahl W1 Festguthaben / W2 Festmarken
   Eingetragene Helfer sehen zusätzlich die Karte "Helfer" -> Scanner.
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const fest = await API.getFest(UI.param("id"));
  if (!fest) {
    root.innerHTML = `<div class="empty"><i data-lucide="calendar-x-2"></i><h3>Fest nicht gefunden</h3><p>Geh zurück zur Karte.</p></div>`;
    return UI.icons();
  }
  const saldo = await API.getGuthaben(fest.id);
  const helfer = fest.w1_aktiv && (await API.istHelferFuer(fest.id));
  root.innerHTML = `
    <div class="page-head"><h1>${fest.name}</h1><p>${fest.ort || ""} – Wie möchtest du bezahlen?</p></div>
    <div class="page stack">
      ${await API.istBetreiberFuer(fest.id) ? `<a class="btn btn-dark" href="betreiber.html?id=${encodeURIComponent(fest.id)}">Bearbeiten</a>` : ""}
      ${saldo > 0 ? `<a class="btn" href="guthaben.html?id=${encodeURIComponent(fest.id)}">Meinen QR-Code zeigen</a>` : ""}

      <a class="weg-card dark ${fest.w1_aktiv ? "" : "off"}" href="guthaben.html?id=${fest.id}">
        <div class="tag">W1</div><h2>Festguthaben</h2>
        <p>Einmal aufladen, QR-Code zeigen – der Helfer bucht direkt am Stand ab.</p>
        ${saldo ? `<p style="margin-top:10px;opacity:1"><b>Guthaben: ${UI.euro(saldo)}</b></p>` : ""}
        <i data-lucide="wallet" class="big-icon"></i></a>
      <a class="weg-card ${fest.w2_aktiv ? "" : "off"}" href="speisekarte.html?id=${fest.id}">
        <div class="tag">W2</div><h2>Festmarken</h2>
        <p>Aus der Speisekarte wählen, nur zahlen was du willst, Marke am Stand selbst entwerten.</p>
        <i data-lucide="ticket" class="big-icon"></i></a>
      ${helfer ? `<a class="weg-card" href="helfer.html?fest=${encodeURIComponent(fest.id)}" data-track="festival-helper-scanner">
        <div class="tag">HELFER</div><h2>Scanner öffnen</h2>
        <p>QR-Code des Gastes scannen und Betrag vom Festguthaben abbuchen.</p>
        <i data-lucide="scan-line" class="big-icon"></i></a>` : ""}
      ${!fest.w1_aktiv || !fest.w2_aktiv ? `<p class="small muted center">Ausgegraute Wege bietet dieses Fest nicht an.</p>` : ""}
      <div class="info"><i data-lucide="zap"></i><span>Keine Kasse, kein Anstehen: Du bezahlst direkt in der App.</span></div>
    </div>`;
  UI.icons();
})();
