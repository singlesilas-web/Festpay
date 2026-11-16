/* =========================================================
   demnaechst.js – Tab „Demnächst“
   Zeigt angekündigte Feste: Demo-Ankündigungen (demo-data.js) und
   eigene Feste, deren Anfang in der Zukunft liegt.
   „Erinnern“ merkt sich ein Fest lokal im Browser (Klickdummy,
   keine echte Benachrichtigung).
   ========================================================= */
(async function () {
  const root = document.getElementById("root");
  const MERKEN = "nearbuy_erinnerungen_v1";
  let gemerkt; try { gemerkt = new Set(JSON.parse(localStorage.getItem(MERKEN) || "[]")); } catch { gemerkt = new Set(); }

  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const demo = API.istDemo() && window.DEMO_DATA?.ankuendigungen ? DEMO_DATA.ankuendigungen.map((a) => {
    const start = new Date(heute.getTime() + a.inTagen * 864e5);
    const [h, m] = a.von.split(":"); start.setHours(+h, +m);
    return { ...a, start: start.toISOString(), eigen: false };
  }) : [];
  const eigene = [];
  for (const f of await API.getFeste()) if (f.start && Date.parse(f.start) > Date.now()) eigene.push({ ...f, eigen: await API.istBetreiberFuer(f.id) });
  const liste = [...eigene, ...demo].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const tageBis = (iso) => Math.round((new Date(iso).setHours(0, 0, 0, 0) - heute) / 864e5);
  const wann = (iso) => { const t = tageBis(iso); return t <= 0 ? "Heute" : t === 1 ? "Morgen" : `In ${t} Tagen`; };
  const datum = (iso) => new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long" });
  const zeit = (f) => f.von ? `${f.von}–${f.bis} Uhr` : new Date(f.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";

  function render() {
    root.innerHTML = `
      <div class="page-head"><h1>Demnächst</h1><p>Feste, die bald in deiner Nähe stattfinden.</p></div>
      <div class="page stack">
        ${liste.length ? liste.map((f) => {
          const d = new Date(f.start);
          const an = gemerkt.has(f.id);
          return `<article class="event-card">
            <div class="event-date"><span>${d.toLocaleDateString("de-DE", { month: "short" }).replace(".", "")}</span><b>${d.getDate()}</b></div>
            <div class="event-body">
              <div class="event-when">${wann(f.start)} · ${datum(f.start)}</div>
              <h3>${UI.escape(f.name)}</h3>
              <div class="small muted"><i data-lucide="map-pin"></i>${UI.escape(f.ort || "Ort folgt")} · ${zeit(f)}</div>
              ${f.info ? `<p class="small">${UI.escape(f.info)}</p>` : ""}
              <div class="event-tags">
                ${f.w1_aktiv ? `<span class="tag"><i data-lucide="qr-code"></i>Festguthaben</span>` : ""}
                ${f.w2_aktiv ? `<span class="tag"><i data-lucide="ticket"></i>Festmarken</span>` : ""}
                ${f.eigen ? `<span class="tag own">Dein Fest</span>` : ""}
              </div>
              <div class="event-actions">
                <button class="btn btn-sm ${an ? "" : "btn-ghost"}" data-track="${an ? "erinnerung-aus" : "erinnerung-an"}" data-merken="${UI.escape(f.id)}" aria-pressed="${an}">
                  <i data-lucide="${an ? "bell-ring" : "bell"}"></i>${an ? "Erinnerung an" : "Erinnern"}</button>
                ${f.eigen ? `<a class="btn btn-sm btn-ghost" data-track="ankuendigung-bearbeiten" href="betreiber.html?id=${encodeURIComponent(f.id)}"><i data-lucide="pencil"></i>Bearbeiten</a>` : ""}
              </div>
            </div>
          </article>`;
        }).join("") : `<div class="empty"><i data-lucide="calendar-clock"></i><h3>Keine Ankündigungen</h3><p>Sobald Betreiber ein Fest mit Termin in der Zukunft anlegen, erscheint es hier.</p></div>`}
        <a class="btn btn-ghost" data-track="fest-ankuendigen" href="betreiber.html"><i data-lucide="plus"></i>Eigenes Fest ankündigen</a>
      </div>`;
    UI.icons();
    root.querySelectorAll("[data-merken]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.merken;
      if (gemerkt.has(id)) gemerkt.delete(id); else { gemerkt.add(id); UI.toast("Wir erinnern dich (Klickdummy)", "bell-ring"); }
      localStorage.setItem(MERKEN, JSON.stringify([...gemerkt]));
      render();
    }));
  }
  render();
})();
