/* =========================================================
   speisekarte.js – W2 Festmarken: Speisekarte & Warenkorb
   ========================================================= */
(async function () {
  if (!(await UI.gastZugang(UI.param("id")))) return;
  const root = document.getElementById("root");
  const fest = await API.getFest(UI.param("id"));
  if (!fest) { root.innerHTML = `<div class="empty"><i data-lucide="calendar-x-2"></i><h3>Fest nicht gefunden</h3></div>`; return UI.icons(); }
  const items = await API.getSpeisekarte(fest.id);
  const korb = {};

  const kats = [...new Set(items.map((i) => i.kategorie || "Sonstiges"))];
  root.innerHTML = `
    <div class="page-head"><div class="small muted"><b>W2</b> · ${fest.name}</div><h1>Speisekarte</h1><p>Wähle aus, du bekommst für jedes Teil eine digitale Festmarke.</p></div>
    <div class="page">
      ${items.length ? kats.map((k) => `<div class="cat-title">${k}</div>` + items.filter((i) => (i.kategorie || "Sonstiges") === k).map((i) => `
        <div class="menu-item">
          <span class="badge-icon soft"><i data-lucide="${i.icon || "utensils"}"></i></span>
          <div style="flex:1"><div class="name">${i.name}</div><div class="small muted">${UI.euro(i.preis)}</div></div>
          <div class="qty"><button data-m="${i.id}" aria-label="weniger"><i data-lucide="minus"></i></button><span id="q-${i.id}">0</span>
          <button class="plus" data-p="${i.id}" aria-label="mehr"><i data-lucide="plus"></i></button></div>
        </div>`).join("")).join("")
      : `<div class="empty"><i data-lucide="utensils-crossed"></i><h3>Keine Speisekarte</h3><p>Der Betreiber hat noch nichts hinterlegt.</p></div>`}
    </div>
    <div class="cta-bar"><button class="btn" id="go" disabled><i data-lucide="shopping-bag"></i>Warenkorb leer</button></div>`;
  UI.icons();

  const go = document.getElementById("go");
  function update() {
    let sum = 0, n = 0;
    items.forEach((i) => { const q = korb[i.id] || 0; sum += q * i.preis; n += q; document.getElementById("q-" + i.id).textContent = q; });
    go.disabled = !n;
    go.innerHTML = n ? `<i data-lucide="shopping-bag"></i>${n} Marke${n > 1 ? "n" : ""} · ${UI.euro(sum)}` : `<i data-lucide="shopping-bag"></i>Warenkorb leer`;
    UI.icons(); return sum;
  }
  root.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { korb[b.dataset.p] = (korb[b.dataset.p] || 0) + 1; update(); }));
  root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { korb[b.dataset.m] = Math.max(0, (korb[b.dataset.m] || 0) - 1); update(); }));
  go.onclick = () => {
    const pos = items.filter((i) => korb[i.id]).map((i) => ({ item_id: i.id, name: i.name, icon: i.icon, preis: i.preis, menge: korb[i.id] }));
    sessionStorage.setItem("checkout", JSON.stringify({ typ: "w2", festId: fest.id, betrag: update(), positionen: pos, zurueck: "marken.html" }));
    location.href = "bezahlen.html";
  };
})();
