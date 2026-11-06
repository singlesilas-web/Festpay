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
  const id = encodeURIComponent(fest.id);
  if (await API.istBetreiberFuer(fest.id)) {
    location.replace(`betreiber.html?id=${id}`);
    return;
  }
  if (!(await UI.gastZugang(fest.id))) return;
  location.replace(`${fest.w1_aktiv ? "guthaben" : "speisekarte"}.html?id=${id}`);
})();
