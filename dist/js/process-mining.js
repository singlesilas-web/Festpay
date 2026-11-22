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
  const taskGoals={gast_guthaben:'wallet_qr_shown',gast_marken:'token_redeemed',helfer:'wallet_charged',betreiber_marken:'festival_created',betreiber_guthaben:'festival_helper_saved'};
  const goalForTask=task=>taskGoals[task];
  const currentSessions=(sessions,version,task)=>sessions.filter(s=>s.version===version&&!!taskGoals[s.task]&&(!task||s.task===task));
  const assignedGoal = task => ({w1: 'wallet_topped_up', w2: 'token_redeemed', gast_guthaben: 'wallet_qr_shown', gast_marken: 'token_redeemed', helfer: 'wallet_charged', betreiber_marken: 'festival_created', betreiber_guthaben: 'festival_helper_saved'}[task] || task);
  const clickLabels = {
    'article-more-icons': 'Weitere Artikel-Icons aufklappen',
    'article-icon-select': 'Artikel-Icon auswählen',
    'karte-guthaben': 'Guthaben direkt von der Karte aufladen',
    'zone-start': 'Festzone zeichnen oder bearbeiten',
    'zone-points': 'Zeichenart: Punkte setzen',
    'zone-rectangle': 'Zeichenart: Rechteck aufziehen',
    'zone-undo': 'Zeichenschritt rückgängig machen',
    'zone-cancel': 'Zeichnen abbrechen',
    'helper-product-add': 'Artikel hinzufügen (+)',
    'helper-product-remove': 'Artikel entfernen (−)',
    'nav-entdecken': 'Hotbar: Entdecken', 'nav-demnaechst': 'Hotbar: Demnächst',
    'nav-bezahlen': 'Hotbar: Bezahlen', 'nav-kasse': 'Hotbar: Kasse',
    'nav-aktivitaeten': 'Hotbar: Aktivitäten', 'nav-profil': 'Hotbar: Profil',
    'menu-open': 'Menü öffnen', 'menu-close': 'Menü schließen',
    'menu-entdecken': 'Menü: Entdecken', 'menu-demnaechst': 'Menü: Demnächst',
    'menu-bezahlen': 'Menü: Bezahlen', 'menu-marken': 'Menü: Meine Festmarken',
    'menu-guthaben': 'Menü: Mein Guthaben', 'menu-aktivitaeten': 'Menü: Aktivitäten',
    'menu-profil': 'Menü: Profil und Rolle', 'menu-login': 'Menü: Anmelden',
    'menu-fest-anlegen': 'Menü: Neues Fest anlegen', 'menu-eigenes-fest': 'Menü: Eigenes Fest öffnen',
    '#sheetSearch': 'Festsuche öffnen', '#btnSearchClose': 'Festsuche schließen',
    'karte-fest-oeffnen': 'Fest auf der Karte öffnen', 'karte-suchergebnis': 'Fest aus Suchergebnissen wählen',
    'erinnerung-an': 'Erinnerung aktivieren', 'erinnerung-aus': 'Erinnerung deaktivieren',
    'ankuendigung-bearbeiten': 'Angekündigtes Fest bearbeiten', 'fest-ankuendigen': 'Eigenes Fest ankündigen',
    'aktivitaeten-fest': 'Aktivitäten für ein Fest öffnen', 'aktivitaeten-zurueck': 'Alle Aktivitäten anzeigen',
    'zahlen-karte': 'Fest auf der Karte finden', 'zahlen-fest-wechseln': 'Fest für Guthaben-QR wechseln',
    'zahlen-aufladen': 'Guthaben aus Bezahlen-Tab aufladen', 'marken-entwertete-anzeigen': 'Entwertete Marken ein- oder ausklappen'
  };
  const newScreens = new Set(['zahlen.html', 'demnaechst.html', 'aktivitaeten.html']);
  function eventScreen(event) {
    const source = event.props?.source;
    const screen = typeof source === 'string' && source.startsWith('screen:') ? source.slice(7) : '';
    return event.screen === 'index.html' && newScreens.has(screen) ? screen : event.screen;
  }
  const names = {
    ...clickLabels,
    map_festival_selected: 'Festfläche antippen',
    zone_rectangle_drawn: 'Rechteck gezeichnet oder angepasst',
    zone_invalid: 'Festzone unvollständig',
    zone_point_moved: 'Eckpunkt verschoben',
    zone_accepted: 'Festzone übernommen',
    'zahlen.html': 'Bezahlen (Hotbar)', 'demnaechst.html': 'Demnächst',
    'aktivitaeten.html': 'Aktivitäten', 'login.html': 'Anmelden',
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
  const actions = new Set([...Object.keys(clickLabels),'#btnSearch','#btnLocate','#go','#pay','#save','#mm','#addTop','#addItem','#addHelfer','#sim','#cam','#book','#clearOrder']);
  function step(event) {
    if (event.type === 'session_end') return 'session_end';
    if (event.type === 'activity') return event.props?.activity;
    if (event.type === 'page_view') return eventScreen(event);
    if (event.type === 'map_pan' || event.type === 'map_zoom') return event.type;
    if (event.type === 'click' && actions.has(event.props?.target)) return event.props.target;
  }
  const label = key => names[key] || key;
  const directRoutes = {
    wallet_topped_up: [['guthaben.html','bezahlen.html']],
    wallet_qr_shown: [['guthaben.html'], ['guthaben.html','bezahlen.html','guthaben.html'], ['zahlen.html'], ['guthaben.html','bezahlen.html','zahlen.html'], ['zahlen.html','guthaben.html','bezahlen.html','zahlen.html']],
    tokens_purchased: [['speisekarte.html','bezahlen.html']],
    token_redeemed: [['marken.html'], ['speisekarte.html','bezahlen.html','marken.html'], ['zahlen.html'], ['speisekarte.html','bezahlen.html','zahlen.html']],
    festival_created: [['betreiber.html']],
    festival_updated: [['betreiber.html']],
    festival_helper_saved: [['betreiber.html']],
    wallet_charged: [['helfer.html']]
  };
  function happyPath(goal, events) {
    // Role selection and the optional festival overview are valid entry steps.
    const pages = events.filter(e => e.type === 'page_view').map(eventScreen);
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
  // One analytical case per person, assigned task and UI version. Raw cases remain available.
  // Compare observed progress, never elapsed time: waiting/repeated clicks are not progress.
  const progressStages = {
    gast_guthaben: [
      ['page:guthaben.html','page:zahlen.html'], ['click:#go','page:bezahlen.html'],
      ['click:#pay'], ['activity:wallet_topped_up'], ['activity:wallet_qr_shown']
    ],
    gast_marken: [
      ['page:speisekarte.html'], ['click:#go','page:bezahlen.html'], ['click:#pay'],
      ['activity:tokens_purchased'], ['page:marken.html'], ['activity:token_redeemed']
    ],
    helfer: [
      ['page:helfer.html'], ['activity:helper_scanner_opened','click:#cam','click:#sim'],
      ['activity:helper_qr_recognized'], ['click:helper-product-add','click:#book'], ['activity:wallet_charged']
    ],
    betreiber_marken: [
      ['page:betreiber.html'], ['click:#name','click:#startDateTrigger','click:zone-start','click:zone-rectangle','click:#mm'],
      ['activity:zone_accepted','click:#w2'], ['click:#addItem'], ['click:#save'], ['activity:festival_created']
    ],
    betreiber_guthaben: [
      ['page:betreiber.html'], ['click:#name','click:#w1','activity:zone_accepted'],
      ['click:#save','activity:festival_created'], ['click:#addHelfer'], ['activity:festival_helper_saved']
    ]
  };
  function attemptProgress(c) {
    const keys = new Set();
    for (const event of c.trace) {
      const screen = eventScreen(event);
      if (event.type === 'page_view') keys.add('page:' + screen);
      if (event.type === 'activity' && event.props?.activity && !event.props.activity.endsWith('_failed')) keys.add('activity:' + event.props.activity);
      if (event.type === 'click' && event.props?.target) keys.add('click:' + event.props.target);
      if (event.type === 'field_focus' && event.props?.target) keys.add('field:' + screen + ':' + event.props.target);
    }
    const stages = progressStages[c.session.task] || [];
    let stage = 0;
    stages.forEach((milestones, i) => { if (milestones.some(key => keys.has(key))) stage = i + 1; });
    return [Number(c.completed), stage, keys.size];
  }
  function representativeCases(cases) {
    const participantsByCode = new Map(cases.filter(c => c.session.participant_id && c.session.participant_code)
      .map(c => [c.session.participant_code, c.session.participant_id]));
    const groups = new Map();
    for (const c of cases) {
      const s = c.session;
      const participant = s.participant_id || participantsByCode.get(s.participant_code);
      const identity = participant ? ['participant',participant] : s.participant_code ? ['code',s.participant_code] : ['session',s.id];
      const key = JSON.stringify([identity,s.task,s.version]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    return [...groups.values()].map(group => {
      const scored = group.map(c => ({c, score:attemptProgress(c)}));
      scored.sort((a,b) => {
        for (let i=0;i<a.score.length;i++) if (a.score[i] !== b.score[i]) return b.score[i] - a.score[i];
        return (a.c.session.attempt_number ?? Infinity) - (b.c.session.attempt_number ?? Infinity)
          || (Date.parse(a.c.session.started_at) || 0) - (Date.parse(b.c.session.started_at) || 0)
          || String(a.c.session.id).localeCompare(String(b.c.session.id));
      });
      const winner = scored[0];
      const tied = scored.length > 1 && winner.score.every((value,i) => value === scored[1].score[i]);
      const reason = group.length === 1 ? 'Einziger Versuch' : tied ? 'Gleicher Fortschritt: früherer Versuch'
        : winner.c.completed ? 'Zielschritt erreicht' : 'Weitester beobachteter Fortschritt';
      return {...winner.c, selection:{
        policy:'best-progress-per-person-task-version-v1', reason, tied, attemptCount:group.length,
        alternatives:scored.slice(1).map(({c}) => ({id:c.session.id,code:c.session.attempt_code})),
        candidates:scored.map(({c,score}) => ({id:c.session.id,code:c.session.attempt_code,completed:c.completed,stage:score[1],distinctActions:score[2]}))
      }};
    });
  }
  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a,b) => a-b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return {goals, label, step, eventScreen, casesForGoal, representativeCases, median, goalForTask, currentSessions};
})();
