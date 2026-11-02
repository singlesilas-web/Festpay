/* =========================================================
   bezahlen.js – Checkout für W1 (Aufladen) und W2 (Marken kaufen)
   Klickdummy: Zahlung wird simuliert.
   TODO Echtbetrieb: Zahlungsanbieter (PayPal / Stripe für Apple & Google Pay)
   über eine Server-Funktion anbinden, Buchung erst nach Bestätigung (Webhook).
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const c = JSON.parse(sessionStorage.getItem("checkout") || "null");
  if (!c) { root.innerHTML = `<div class="empty"><i data-lucide="shopping-cart"></i><h3>Nichts zu bezahlen</h3></div>`; return UI.icons(); }
  const fest = await API.getFest(c.festId);
  const arten = [
    { id: "paypal", name: "PayPal", icon: "badge-euro" },
    { id: "applepay", name: "Apple Pay", icon: "smartphone" },
    { id: "googlepay", name: "Google Pay", icon: "smartphone-nfc" },
    { id: "karte", name: "Kredit- / Debitkarte", icon: "credit-card" },
    { id: "klarna", name: "Sofort / Klarna", icon: "landmark" },
  ];
  let wahl = localStorage.getItem("festpay_zahlart") || "paypal";

  root.innerHTML = `
    <div class="page-head"><h1>Bestätigen</h1><p>Überprüfe Fest und Betrag.</p></div>
    <div class="page stack">
      <div class="info"><i data-lucide="info"></i><span>${c.typ === "w1" ? "Das Guthaben gilt nur auf diesem Fest." : "Deine Marken findest du danach unter „Meine Festmarken“."}</span></div>
      <div class="list">
        <div class="list-item"><span class="badge-icon accent"><i data-lucide="tent"></i></span>
          <span style="flex:1"><div class="title">${fest?.name || ""}</div><div class="sub">${c.typ === "w1" ? "W1 · Festguthaben aufladen" : "W2 · " + c.positionen.reduce((a, p) => a + p.menge, 0) + " Festmarken"}</div></span></div>
      </div>
      <h3 style="margin-top:20px">Zahlungsweise</h3>
      <div class="list" id="arten">${arten.map((a) => `
        <button class="list-item ${a.id === wahl ? "selected" : ""}" data-a="${a.id}">
          <span class="badge-icon"><i data-lucide="${a.icon}"></i></span><span class="title" style="flex:1">${a.name}</span>
          <i data-lucide="${a.id === wahl ? "circle-check" : "circle"}"></i></button>`).join("")}</div>
      <div class="row" style="margin-top:20px"><h3>Gesamt</h3><div class="spacer"></div><h2>${UI.euro(c.betrag)}</h2></div>
    </div>
    <div class="cta-bar"><button class="btn" id="pay"><i data-lucide="lock"></i>Jetzt bezahlen</button></div>`;
  UI.icons();

  root.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
    wahl = b.dataset.a; localStorage.setItem("festpay_zahlart", wahl);
    root.querySelectorAll("[data-a]").forEach((x) => {
      const on = x.dataset.a === wahl; x.classList.toggle("selected", on);
      x.lastElementChild.outerHTML = `<i data-lucide="${on ? "circle-check" : "circle"}"></i>`;
    });
    UI.icons();
  }));

  document.getElementById("pay").onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = `<i data-lucide="loader-circle"></i>Zahlung läuft …`; UI.icons();
    await new Promise((r) => setTimeout(r, 1200));
    const res = c.typ === "w1" ? await API.aufladen(c.festId, c.betrag, wahl) : await API.markenKaufen(c.festId, c.positionen, wahl);
    if (res?.error) { btn.disabled = false; btn.textContent = "Erneut versuchen"; return UI.toast(res.error.message, "alert-triangle"); }
    sessionStorage.removeItem("checkout");
    UI.toast("Zahlung erfolgreich");
    setTimeout(() => (location.href = c.zurueck), 700);
  };
})();
