'use strict';
(() => {
  const tasks = [
  [
    "gast_guthaben",
    "Gast",
    "Guthaben und Getränk A",
    "Finde Demo Fest B mit Bezahlmethode Festguthaben. Lade 20 € auf. Bezahle Getränk A."
  ],
  [
    "gast_marken",
    "Gast",
    "Festmarken auswählen und entwerten",
    "Finde Demo Fest A mit der Bezahlmethode Festmarken. Wähle Getränke A und Speise B. Und entwerte die Wertmarken."
  ],
  [
    "helfer",
    "Helfer",
    "Bestellung ändern und abbuchen",
    "Finde das Fest Demo Fest B. Öffne den Scanner. Der Gast bestellt zunächst 2× Getränk A und einmal Speise B. Gib das genauso ein. Daraufhin sagt der Gast, dass er Getränk A doch nur einmal möchte. Entferne Getränk A einmal. Buch den passenden Betrag beim Gast ab."
  ],
  [
    "betreiber_marken",
    "Betreiber",
    "Fest mit Festmarken anlegen",
    "Wechsel in der Menüansicht die Rolle auf Betreiber und lege ein neues Fest an. Befülle die Kopfdaten des Festes und wähle als Bezahlweg Festmarken. Dein Speise- und Getränkeangebot: Spezi – 3,50 €. Currywurst mit Pommes – 5,00 €. Alle Artikel benötigen passende Kategorie und Icon."
  ],
  [
    "betreiber_guthaben",
    "Betreiber",
    "Fest mit Festguthaben und Helfer anlegen",
    "Wechsel in der Menüansicht die Rolle auf Betreiber und lege ein neues Fest an. Befülle die Kopfdaten des Festes und wähle als Bezahlweg Festguthaben. Die Gäste sollen 10 €, 20 € und 50 € aufladen können. Getränke: Spezi – 3,50 €; Fanta – 3,50 €; Bier – 4,00 €. Speisen: Rote Wurst – 3,50 €; Currywurst mit Pommes – 5,00 €. Alle Artikel benötigen passende Kategorie und Icon. Füge den Helfer hinzu: Max.Mustermann@web.de."
  ]
];
  const form = document.querySelector('#observation');
  const draftKey = 'festpay-observation-v1';
  const statuses = {independent:'ohne Hilfe', help:'mit Hilfe', aborted:'abgebrochen'};
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem(draftKey)); } catch {}
  const state = draft || {id:crypto.randomUUID(), fields:{}, tasks:{}, active:null};
  const store = () => sessionStorage.setItem(draftKey, JSON.stringify(state));
  const elapsed = task => task.elapsed_ms + (task.started ? Math.max(0, Date.now() - task.started) : 0);
  const format = ms => {
    const seconds = Math.floor(ms / 1000);
    return String(Math.floor(seconds / 60)) + ':' + String(seconds % 60).padStart(2,'0');
  };
  const cards = new Map();
  const textFields = ['blockage','quote','frustration','liked'];
  const fieldLabels = ['Wo gestockt? (Screen → was passiert)','Zitat (wörtlich)','Was hat Sie in dieser Rolle/bei dieser Aufgabe am meisten gestört? Was hat gefehlt?','Was hat Ihnen am besten gefallen?'];
  for (const [key,role,title,instruction] of tasks) {
    const task = state.tasks[key] ||= {elapsed_ms:0,started:null,result:'',notes:{}};
    const card = document.createElement('details');
    card.className = 'observation-task';
    card.open = state.active === key || (key === tasks[0][0] && !draft);
    card.innerHTML = '<summary><b>'+role+' · '+title+'</b><span data-summary></span></summary>'+
      '<p class="readout"><b>Aufgabe (vorlesen)</b><br>'+instruction+'</p>'+
      '<div class="timer-row"><output aria-label="Stoppuhr">0:00 min</output><button class="secondary" type="button" data-timer>Zeit starten</button>'+
      '<label class="duration">Dauer (min)<input type="text" placeholder="1:15" maxlength="7" pattern="[0-9]{1,4}:[0-5][0-9]" aria-label="Dauer in Minuten und Sekunden"></label></div>'+
      '<div class="outcomes" role="group" aria-label="Geschafft?">'+Object.entries(statuses).map(([value,label])=>'<button class="secondary" type="button" data-result="'+value+'" aria-pressed="false">'+label+'</button>').join('')+'</div>'+
      '<div class="observation-fields">'+textFields.slice(0,2).map((field,i)=>'<label>'+fieldLabels[i]+'<textarea data-field="'+field+'" rows="2" maxlength="4000"></textarea></label>').join('')+'</div>'+
      '<details class="followup"><summary>Nachfragen nach Abschluss einer Aufgabe</summary><div class="observation-fields">'+textFields.slice(2).map((field,i)=>'<label>'+fieldLabels[i+2]+'<textarea data-field="'+field+'" rows="2" maxlength="4000"></textarea></label>').join('')+'</div></details>';
    cards.set(key,card);
    document.getElementById('tasks').append(card);
    const duration = card.querySelector('.duration input');
    duration.value = task.elapsed_ms ? format(task.elapsed_ms) : '';
    duration.oninput = () => {
      const value = duration.value;
      stop(key);
      duration.value = value;
      const match = /^(\d{1,4}):([0-5]\d)$/.exec(value);
      const ms = match ? (Number(match[1]) * 60 + Number(match[2])) * 1000 : 0;
      const valid = !value || (match && ms <= 86400000);
      duration.setCustomValidity(valid ? '' : 'Bitte Minuten und Sekunden eingeben, zum Beispiel 1:15.');
      if (valid) task.elapsed_ms = ms;
      update();
    };
    for (const field of card.querySelectorAll('textarea')) {
      field.value = task.notes[field.dataset.field] || '';
      field.oninput = () => { task.notes[field.dataset.field] = field.value; store(); };
    }
    card.querySelector('[data-timer]').onclick = () => {
      const wasRunning = !!task.started;
      if (state.active) stop(state.active);
      if (!wasRunning) { state.active = key; task.started = Date.now(); }
      update();
    };
    for (const button of card.querySelectorAll('[data-result]')) button.onclick = () => {
      stop(key);
      task.result = task.result === button.dataset.result ? '' : button.dataset.result;
      update();
    };
  }
  function stop(key) {
    const task = state.tasks[key];
    if (!task?.started) return;
    task.elapsed_ms = elapsed(task);
    task.started = null;
    state.active = null;
    const input = cards.get(key).querySelector('.duration input');
    input.value = format(task.elapsed_ms);
    input.setCustomValidity('');
  }
  function update() {
    for (const [key,card] of cards) {
      const task = state.tasks[key];
      card.querySelector('[data-timer]').textContent = task.started ? 'Pause' : task.elapsed_ms ? 'Fortsetzen' : 'Zeit starten';
      for (const button of card.querySelectorAll('[data-result]')) button.setAttribute('aria-pressed', String(button.dataset.result === task.result));
    }
    tick();
    store();
  }
  function tick() {
    for (const [key,card] of cards) {
      const task = state.tasks[key];
      const time = format(elapsed(task));
      card.querySelector('output').textContent = time + ' min';
      card.querySelector('[data-summary]').textContent = [task.result && statuses[task.result], (task.started || task.elapsed_ms) && (time + ' min')].filter(Boolean).join(' · ');
    }
  }
  const day = new Date();
  form.elements.test_date.value = new Date(day.getTime() - day.getTimezoneOffset()*60000).toISOString().slice(0,10);
  for (const field of ['participant_code','age','gender','app','test_date','moderator','observer','other']) {
    const input = form.elements[field];
    if (state.fields[field] != null) input.value = state.fields[field];
    input.addEventListener('input', () => {state.fields[field]=input.value;store();});
  }
  update();
  setInterval(tick, 250);
  const error = document.getElementById('error');
  const submit = form.querySelector('[type=submit]');
  let sending = false;
  form.addEventListener('invalid', event => {
    const card = event.target.closest('.observation-task');
    if (card) card.open = true;
  }, true);
  form.onsubmit = async event => {
    event.preventDefault();
    if (sending) return;
    if (state.active) stop(state.active);
    update();
    const values = new FormData(form);
    const observations = Object.fromEntries(tasks.flatMap(([key]) => {
      const task = state.tasks[key];
      if (!task.result && !task.elapsed_ms && !Object.values(task.notes).some(value=>value.trim())) return [];
      return [[key,{result:task.result||null,duration_ms:task.elapsed_ms,...Object.fromEntries(textFields.map(field=>[field,(task.notes[field]||'').trim()]))}]];
    }));
    if (!Object.keys(observations).length && !state.pending) {
      error.textContent = 'Erfasse mindestens eine Aufgabe, bevor du den Bogen speicherst.';
      error.hidden = false;
      return;
    }
    state.pending ||= {
      id:state.id,form_version:1,
      ...Object.fromEntries(['participant_code','app','test_date','moderator','observer','other'].map(key=>[key,String(values.get(key)||'').trim()])),
      age: values.get('age') === '' ? null : Number(values.get('age')),
      gender: values.get('gender') || null,
      observations
    };
    store();
    sending = true;
    submit.disabled = true;
    error.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://orrprvpypsvuzspwzevf.supabase.co/rest/v1/festpay_observations', {
        method:'POST',credentials:'omit',referrerPolicy:'no-referrer',
        headers:{apikey:'sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1','Content-Type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify(state.pending),signal:controller.signal
      });
      const duplicate = response.status === 409 && (await response.json()).code === '23505';
      if (!response.ok && !duplicate) {
        delete state.pending;
        store();
        throw Error('save');
      }
      sessionStorage.removeItem(draftKey);
      form.hidden = true;
      document.getElementById('success').hidden = false;
      document.getElementById('success').scrollIntoView();
    } catch {
      error.textContent = 'Speichern konnte nicht bestätigt werden. Der Entwurf bleibt erhalten. Bei unklarem Versandstatus wird derselbe Stand erneut gesendet.';
      error.hidden = false;
    } finally {
      clearTimeout(timeout);
      submit.disabled = false;
      sending = false;
    }
  };
  document.getElementById('again').onclick = () => location.reload();
})();
