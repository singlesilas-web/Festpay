/* =========================================================
   aktivitaeten.js – Tab „Aktivitäten“
   Übersicht: besuchte Feste mit Suche und Ausgaben je Fest.
   Detail (?fest=<id>): alle Buchungen dieses Fests – Aufladungen,
   Abbuchungen am Stand, gekaufte und entwertete Festmarken.
   Daten: API.getAktivitaeten() (Klickdummy: localStorage).
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const eintraege = await API.getAktivitaeten();
  const festNamen = Object.fromEntries((await API.getFeste()).map((f) => [f.id, f.name]));
  const zahlarten = { paypal: "PayPal", applepay: "Apple Pay", googlepay: "Google Pay", karte: "Kredit- / Debitkarte", klarna: "Sofort / Klarna" };
  const name = (e) => e.fest_name || festNamen[e.fest_id] || "Unbekanntes Fest";
  const zeit = (ms) => new Date(ms).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const tag = (ms) => new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  // Feste zusammenfassen: bezahlt = Aufladungen + Markenkäufe (tatsächlich ausgegebenes Geld)
  const feste = new Map();
  for (const e of eintraege) {
    if (!feste.has(e.fest_id)) feste.set(e.fest_id, { id: e.fest_id, name: name(e), beispiel: !!e.beispiel, zuletzt: e.am, bezahlt: 0, aufgeladen: 0, verbraucht: 0, marken: 0, eintraege: [] });
    const f = feste.get(e.fest_id);
    f.eintraege.push(e); f.zuletzt = Math.max(f.zuletzt, e.am);
    if (e.typ === "aufladen") { f.aufgeladen += e.betrag; f.bezahlt += e.betrag; }
    if (e.typ === "markenkauf") { f.bezahlt += e.betrag; f.marken += e.positionen.reduce((a, p) => a + p.menge, 0); }
    if (e.typ === "abbuchung") f.verbraucht += e.betrag;
  }
  const liste = [...feste.values()].sort((a, b) => b.zuletzt - a.zuletzt);

  function zeile(e) {
    if (e.typ === "aufladen") return { icon: "plus-circle", titel: "Guthaben aufgeladen", sub: zahlarten[e.zahlungsart] || "", betrag: `+ ${UI.euro(e.betrag)}`, klasse: "plus" };
    if (e.typ === "abbuchung") return { icon: "scan-line", titel: "Am Stand bezahlt", sub: "Abbuchung vom Festguthaben", betrag: `− ${UI.euro(e.betrag)}`, klasse: "" };
    if (e.typ === "markenkauf") return { icon: "shopping-bag", titel: "Festmarken gekauft", sub: [e.positionen.map((p) => `${p.menge}× ${UI.escape(p.name)}`).join(", "), zahlarten[e.zahlungsart]].filter(Boolean).join(" · "), betrag: UI.euro(e.betrag), klasse: "" };
    return { icon: e.icon || "ticket", titel: `Marke entwertet: ${UI.escape(e.name)}`, sub: e.preis ? `Wert ${UI.euro(e.preis)}` : "", betrag: "", klasse: "muted" };
  }

  function uebersicht() {
    root.innerHTML = `
      <div class="page-head"><h1>Aktivitäten</h1><p>Deine Feste und was du dort ausgegeben hast.</p></div>
      <div class="page stack">
        <label class="search-field"><i data-lucide="search"></i><input class="input" id="suche" type="search" placeholder="Fest suchen" aria-label="Fest suchen"></label>
        <div class="list" id="festListe"></div>
      </div>`;
    const ziel = root.querySelector("#festListe");
    function zeigen(q = "") {
      const treffer = liste.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));
      ziel.innerHTML = treffer.length ? treffer.map((f) => `
        <a class="list-item" data-track="aktivitaeten-fest" href="aktivitaeten.html?fest=${encodeURIComponent(f.id)}">
          <span class="badge-icon soft"><i data-lucide="${f.beispiel ? "history" : UI.festIcon(f.id)}"></i></span>
          <span style="flex:1;min-width:0"><div class="title">${UI.escape(f.name)}</div>
            <div class="sub">${tag(f.zuletzt)} · ${[f.aufgeladen ? "Festguthaben" : "", f.marken ? `${f.marken} Marken` : ""].filter(Boolean).join(" · ") || "Abbuchungen"}</div></span>
          <span class="amount">${UI.euro(f.bezahlt)}</span><i data-lucide="chevron-right"></i>
        </a>`).join("")
        : `<div class="empty"><i data-lucide="receipt-text"></i><h3>${liste.length ? "Kein Treffer" : "Noch keine Aktivitäten"}</h3><p>${liste.length ? "Versuch einen anderen Namen." : "Sobald du auf einem Fest auflädst oder Marken kaufst, erscheint es hier."}</p></div>`;
      UI.icons();
    }
    root.querySelector("#suche").oninput = (e) => zeigen(e.target.value);
    zeigen();
  }

  function detail(f) {
    const nachTag = new Map();
    for (const e of [...f.eintraege].sort((a, b) => b.am - a.am)) {
      const t = tag(e.am); if (!nachTag.has(t)) nachTag.set(t, []); nachTag.get(t).push(e);
    }
    root.innerHTML = `
      <div class="page-head"><a class="back-link" data-track="aktivitaeten-zurueck" href="aktivitaeten.html"><i data-lucide="arrow-left"></i>Alle Aktivitäten</a>
        <h1>${UI.escape(f.name)}</h1>${f.beispiel ? `<p class="small muted">Beispieldaten im Klickdummy</p>` : ""}</div>
      <div class="page stack">
        <div class="wallet activity-sum">
          <div class="small" style="opacity:.75">Insgesamt bezahlt</div>
          <div class="saldo">${UI.euro(f.bezahlt)}</div>
          <div class="sum-grid">
            <div><span>Aufgeladen</span><b>${UI.euro(f.aufgeladen)}</b></div>
            <div><span>Am Stand bezahlt</span><b>${UI.euro(f.verbraucht)}</b></div>
            <div><span>Festmarken</span><b>${f.marken}</b></div>
          </div>
        </div>
        ${[...nachTag].map(([t, liste]) => `<div class="cat-title">${t}</div><div class="list">${liste.map((e) => {
          const z = zeile(e);
          return `<div class="list-item activity-row ${z.klasse}"><span class="badge-icon soft"><i data-lucide="${z.icon}"></i></span>
            <span style="flex:1;min-width:0"><div class="title">${z.titel}</div><div class="sub">${zeit(e.am)}${z.sub ? " · " + z.sub : ""}</div></span>
            <span class="amount">${z.betrag}</span></div>`;
        }).join("")}</div>`).join("")}
      </div>`;
    UI.icons();
  }

  const gewaehlt = UI.param("fest");
  if (gewaehlt && feste.has(gewaehlt)) detail(feste.get(gewaehlt)); else uebersicht();
})();
