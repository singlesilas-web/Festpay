/* Analyse aus beobachteten Ereignissen; die Testauswahl ist kein Erfolgsnachweis. */
window.FestPayMining = (() => {
  const goals = {
  "wallet_topped_up": "Guthaben aufladen",
  "wallet_qr_shown": "Guthaben-QR anzeigen",
  "tokens_purchased": "Festmarken kaufen",
  "token_redeemed": "Festmarke entwerten",
  "festival_created": "Fest anlegen",
  "festival_updated": "Fest bearbeiten",
  "festival_helper_saved": "Helfer hinzufügen und speichern",
  "wallet_charged": "Guthaben am Stand abbuchen"
};
  const assignedGoal = task => ({w1: 'wallet_topped_up', w2: 'token_redeemed', gast_guthaben: 'wallet_qr_shown', gast_marken: 'token_redeemed', helfer: 'wallet_charged', betreiber_marken: 'festival_created', betreiber_guthaben: 'festival_helper_saved'}[task] || task);
  const names = {
    ...goals, 'index.html': 'Karte', 'fest.html': 'Fest', 'guthaben.html': 'Guthaben',
    'speisekarte.html': 'Speisekarte', 'bezahlen.html': 'Bezahlen', 'marken.html': 'Meine Festmarken',
    'betreiber.html': 'Festverwaltung', 'helfer.html': 'Kasse & Scanner', 'profil.html': 'Profil',
    session_end: 'Testversuch beendet', helper_scanner_opened: 'Scanner geöffnet', helper_qr_recognized: 'Gast-QR erkannt',
    festival_save_failed: 'Fest konnte nicht gespeichert werden', wallet_topped_up_failed: 'Aufladen fehlgeschlagen',
    tokens_purchased_failed: 'Markenkauf fehlgeschlagen', token_redeemed_failed: 'Entwertung fehlgeschlagen',
    wallet_charged_failed: 'Abbuchung fehlgeschlagen',
    map_pan: 'Karte verschieben', map_zoom: 'Karte zoomen', '#btnSearch': 'Festsuche öffnen', '#btnLocate': 'Nächstes Fest anzeigen',
    '#go': 'Aufladung starten', '#pay': 'Zahlung bestätigen', '#save': 'Fest speichern',
    '#mm': 'Zonenpunkt setzen', '#addTop': 'Aufladebetrag hinzufügen', '#addItem': 'Artikel hinzufügen',
    '#addHelfer': 'Helfer vormerken', '#sim': 'Scan simulieren', '#cam': 'Kamera öffnen',
    '#book': 'Abbuchung bestätigen', '#clearOrder': 'Bestellung zurücksetzen'
  };
  const actions = new Set(['#btnSearch','#btnLocate','#go','#pay','#save','#mm','#addTop','#addItem','#addHelfer','#sim','#cam','#book','#clearOrder']);
  function step(event) {
    if (event.type === 'session_end') return 'session_end';
    if (event.type === 'activity') return event.props?.activity;
    if (event.type === 'page_view') return event.screen;
    if (event.type === 'map_pan' || event.type === 'map_zoom') return event.type;
    if (event.type === 'click' && actions.has(event.props?.target)) return event.props.target;
  }
  const label = key => names[key] || key;
  const directRoutes = {
    wallet_topped_up: [['guthaben.html','bezahlen.html']],
    wallet_qr_shown: [['guthaben.html'], ['guthaben.html','bezahlen.html','guthaben.html']],
    tokens_purchased: [['speisekarte.html','bezahlen.html']],
    token_redeemed: [['marken.html'], ['speisekarte.html','bezahlen.html','marken.html']],
    festival_created: [['betreiber.html']],
    festival_updated: [['betreiber.html']],
    festival_helper_saved: [['betreiber.html']],
    wallet_charged: [['helfer.html']]
  };
  function happyPath(goal, events) {
    // Role selection and the optional festival overview are valid entry steps.
    const pages = events.filter(e => e.type === 'page_view').map(e => e.screen);
    if (pages[0] === 'index.html') pages.shift();
    if (pages[0] === 'profil.html') {
      pages.shift();
      if (pages[0] === 'index.html') pages.shift();
    }
    if (pages[0] === 'fest.html') pages.shift();
    if (goal === 'wallet_charged' && pages[0] === 'betreiber.html') pages.shift();
    if (events.some(e => (e.type === 'click' && e.props?.target === '#clearOrder') || (e.type === 'activity' && e.props?.activity?.endsWith('_failed')))) return false;
    return directRoutes[goal].some(route => route.join() === pages.join());
  }
  function casesForGoal(sessions, events, goal, now = Date.now()) {
    const bySession = new Map();
    for (const event of events) {
      if (!bySession.has(event.session_id)) bySession.set(event.session_id, []);
      bySession.get(event.session_id).push(event);
    }
    const cases = [];
    for (const session of sessions) {
      const ordered = (bySession.get(session.id) || []).sort((a, b) => a.seq - b.seq);
      // Earlier builds emitted festival_created for edits as well as new festivals.
      const ambiguousSave = goal === 'festival_created' && /^festpay-2026-11-02-v[34]/.test(session.version);
      const end = ambiguousSave ? -1 : ordered.findIndex(event => event.type === 'activity' && event.props?.activity === goal);
      const assigned = assignedGoal(session.task) === goal;
      if (end < 0 && !assigned) continue;
      const completed = end >= 0;
      const trace = completed ? ordered.slice(0, end + 1) : ordered;
      const last = trace.at(-1);
      const ended = trace.some(event => event.type === 'session_end');
      const idle = now - Date.parse(last?.received_at || last?.at || session.started_at) >= 1800000;
      const status = completed ? 'Ziel erreicht' : ended ? 'Beendet ohne Ziel' : idle ? 'Vermuteter Abbruch' : 'Offen';
      const path = trace.map(step).filter(Boolean);
      const route = completed ? (happyPath(goal, trace) ? 'happy' : 'other') : 'open';
      cases.push({
        session, trace, fullTrace: ordered, endReason: ordered.find(e => e.type === 'session_end')?.props?.reason, completed, assigned, status, route, path,
        variant: JSON.stringify([route, path]),
        clicks: trace.filter(event => event.type === 'click').length,
        duration: last?.elapsed ?? null
      });
    }
    return cases;
  }
  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a,b) => a-b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return {goals, label, step, casesForGoal, median};
})();
