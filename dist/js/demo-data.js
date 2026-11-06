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
      aufladeoptionen: [5, 15, 25],
      speisekarte: [
        { id: "d1", name: "Getränk A", preis: 3.5, icon: "cup-soda", kategorie: "Getränke" },
        { id: "d2", name: "Getränk B", preis: 4.0, icon: "wine", kategorie: "Getränke" },
        { id: "d3", name: "Speise A", preis: 5.0, icon: "sandwich", kategorie: "Essen" },
        { id: "d4", name: "Speise B", preis: 6.5, icon: "pizza", kategorie: "Essen" },
      ],
    },
  ],
};
