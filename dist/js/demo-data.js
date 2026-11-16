/* =========================================================
   demo-data.js – NUR für den Klickdummy.
   Wird ignoriert, sobald Supabase in config.js eingetragen ist
   oder DEMO_MODUS = false. Kann später komplett gelöscht werden.
   Koordinaten der Zonen = Punkte auf der Klickdummy-Karte (0–1000).
   ========================================================= */
window.DEMO_DATA = {
  feste: [
    {
      id: "demo-weinfest",
      name: "Demo-Fest A",
      ort: "Marktplatz",
      datum: "Beispiel",
      zone: [[380, 360], [620, 330], [660, 560], [420, 600]],
      w1_aktiv: false,
      w2_aktiv: true,
      aufladeoptionen: [10, 20, 30],
      speisekarte: [
        { id: "d1", name: "Getränk A", preis: 3.5, icon: "cup-soda", kategorie: "Getränke" },
        { id: "d2", name: "Getränk B", preis: 4.0, icon: "wine", kategorie: "Getränke" },
        { id: "d3", name: "Speise A", preis: 5.0, icon: "sandwich", kategorie: "Essen" },
        { id: "d4", name: "Speise B", preis: 6.5, icon: "pizza", kategorie: "Essen" },
      ],
    },
    {
      id: "demo-sommerfest",
      name: "Demo-Fest B",
      ort: "Stadtpark",
      datum: "Beispiel",
      zone: [[120, 700], [300, 680], [320, 860], [140, 880]],
      w1_aktiv: true,
      w2_aktiv: false,
      aufladeoptionen: [10, 20, 50],
      speisekarte: [
        { id: "d1", name: "Getränk A", preis: 3.5, icon: "cup-soda", kategorie: "Getränke" },
        { id: "d2", name: "Getränk B", preis: 4.0, icon: "wine", kategorie: "Getränke" },
        { id: "d3", name: "Speise A", preis: 5.0, icon: "sandwich", kategorie: "Essen" },
        { id: "d4", name: "Speise B", preis: 6.5, icon: "pizza", kategorie: "Essen" },
      ],
    },
  ],
  // Demnächst: angekündigte Feste (nur Anzeige, erscheinen nicht auf der Karte).
  // Termine relativ zu heute, damit die Beispiele nie in der Vergangenheit liegen.
  ankuendigungen: [
    { id: "ankuendigung-herbstfest", name: "Demo-Fest C", ort: "Rathausplatz", inTagen: 6, von: "17:00", bis: "23:00", w1_aktiv: true, w2_aktiv: false, info: "Livemusik, Flammkuchen und Federweißer." },
    { id: "ankuendigung-weihnachtsmarkt", name: "Demo-Fest D", ort: "Kirchplatz", inTagen: 19, von: "15:00", bis: "21:00", w1_aktiv: false, w2_aktiv: true, info: "Glühwein, Waffeln und Kinderpunsch mit Festmarken." },
    { id: "ankuendigung-fruehlingsfest", name: "Demo-Fest E", ort: "Festwiese", inTagen: 45, von: "11:00", bis: "22:00", w1_aktiv: true, w2_aktiv: false, info: "Familienfest mit Grillstand und Kuchenbuffet." },
  ],
  // Aktivitäten: Beispielverlauf vergangener Feste, damit die Ansicht im Klickdummy nicht leer ist.
  vergangeneAktivitaeten: [
    { typ: "aufladen", fest_id: "vergangen-sommernacht", fest_name: "Beispiel: Sommernachtsfest", am: Date.now() - 38 * 864e5, betrag: 30, zahlungsart: "paypal" },
    { typ: "abbuchung", fest_id: "vergangen-sommernacht", fest_name: "Beispiel: Sommernachtsfest", am: Date.now() - 38 * 864e5 + 36e5, betrag: 7.5 },
    { typ: "abbuchung", fest_id: "vergangen-sommernacht", fest_name: "Beispiel: Sommernachtsfest", am: Date.now() - 38 * 864e5 + 72e5, betrag: 11 },
    { typ: "markenkauf", fest_id: "vergangen-dorffest", fest_name: "Beispiel: Dorffest", am: Date.now() - 64 * 864e5, betrag: 12, zahlungsart: "applepay",
      positionen: [{ name: "Getränk A", icon: "cup-soda", preis: 3.5, menge: 2 }, { name: "Speise A", icon: "sandwich", preis: 5, menge: 1 }] },
    { typ: "entwertung", fest_id: "vergangen-dorffest", fest_name: "Beispiel: Dorffest", am: Date.now() - 64 * 864e5 + 18e5, name: "Getränk A", icon: "cup-soda", preis: 3.5 },
    { typ: "entwertung", fest_id: "vergangen-dorffest", fest_name: "Beispiel: Dorffest", am: Date.now() - 64 * 864e5 + 54e5, name: "Speise A", icon: "sandwich", preis: 5 },
  ],
};
