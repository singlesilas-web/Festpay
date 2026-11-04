'use strict';
(() => {
  // Deliberately standalone: no app scripts, auth, analytics, cookies or app storage.
  const endpoint = 'https://orrprvpypsvuzspwzevf.supabase.co/rest/v1/festpay_survey_responses';
  const key = 'sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1';
  const form = document.getElementById('survey');
  const sections = [...document.querySelectorAll('[data-step]')];
  const back = document.getElementById('back'), next = document.getElementById('next'), submit = document.getElementById('submit');
  const error = document.getElementById('error');
  const labels = ['Dein Test', 'Bedienung & Gestaltung', 'Dein Fazit'];
  let step = 0, sending = false, sent = false, pendingPayload = null;
  const id = crypto.randomUUID(); // One independent submission ID, retained for retries only.
  const context = [
    ['real_role','Welche Rolle passt im echten Leben am ehesten zu dir?', [['guest','Gast auf Festen'],['helper','Helfer/in am Verkaufsstand'],['organizer','Veranstalter/in oder Vereinsorganisation'],['none','Keine dieser Rollen']]],
    ['prior_problem','Hast du auf Festen schon Schwierigkeiten mit Bargeld oder Papiermarken erlebt?', [['yes','Ja'],['partly','Teilweise'],['no','Nein'],['no_experience','Bisher keine Erfahrung damit']]],
    ['task_success','Wie viele deiner Testaufgaben konntest du ohne Hilfe abschließen?', [['all','Alle'],['mostly','Die meisten'],['partly','Einige'],['none','Keine'],['free','Ich habe die App frei erkundet']]]
  ];
  const experience = [
    ['ease','Die App ist einfach zu bedienen.'],
    ['navigation','Ich wusste, was ich als Nächstes tun kann.'],
    ['design','Die App sieht ansprechend aus.'],
    ['enjoyment','Die Bedienung hat mir Spaß gemacht.'],
    ['payment_clarity','Der Ablauf beim Bezahlen war für mich verständlich.'],
    ['balance_clarity','Ich konnte erkennen, wie viel Guthaben bzw. welche Marken ich noch hatte.']
  ];
  const value = [['usefulness','Festpay bietet die Funktionen, die ich auf einem Fest brauche.'],['intent','Ich würde Festpay auf einem Fest nutzen.']];
  function question(name, title, options, rating = false) {
    const field = document.createElement('fieldset'); field.dataset.name = name;
    const legend = document.createElement('legend'); legend.textContent = title; field.append(legend);
    const list = document.createElement('div'); list.className = rating ? 'ratings' : 'options';
    for (const [val, text] of options) {
      const label = document.createElement('label'); label.className = rating ? `rating${val === '0' ? ' na' : ''}` : 'option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = val; input.required = true;
      if (rating) input.setAttribute('aria-label', val === '0' ? text : `${val} – ${['','stimme gar nicht zu','stimme eher nicht zu','neutral','stimme eher zu','stimme voll zu'][Number(val)]}`);
      const span = document.createElement('span'); span.textContent = text;
      label.append(input, span); list.append(label);
    }
    field.append(list); return field;
  }
  context.forEach(q => document.getElementById('context-questions').append(question(...q)));
  const scale = [['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['0','Nicht beurteilbar']];
  experience.forEach(([name,title]) => document.getElementById('experience-questions').append(question(name,title,scale,true)));
  value.forEach(([name,title]) => document.getElementById('value-ratings').append(question(name,title,scale,true)));
  function updateRole() {
    const hide = form.elements.real_role.value === 'none';
    document.getElementById('value-questions').hidden = hide;
    document.querySelectorAll('#value-ratings input').forEach(el => { el.disabled = hide; el.required = !hide; });
  }
  function showStep() {
    sections.forEach((s,i) => { s.hidden = i !== step; });
    back.hidden = step === 0; next.hidden = step === 2; submit.hidden = step !== 2;
    document.getElementById('step-label').textContent = `${step+1} von 3 · ${labels[step]}`;
    document.getElementById('progress-text').textContent = ['Los geht’s','Dein Eindruck','Fast geschafft'][step];
    document.getElementById('progress').value = step+1;
    error.hidden = true; document.getElementById(`heading-${step}`).focus();
  }
  function validate() {
    const invalid = [...sections[step].querySelectorAll('input,textarea')].find(el => !el.disabled && !el.checkValidity());
    if (!invalid) return true;
    error.textContent = invalid.name === 'consent' ? 'Bitte stimme der Speicherung und Auswertung zu, wenn du teilnehmen möchtest.' : 'Bitte beantworte die markierte Frage. Du kannst bei Skalen auch „Nicht beurteilbar“ wählen.';
    error.hidden = false; (invalid.closest('fieldset') || invalid.closest('label')).classList.add('invalid'); invalid.focus(); return false;
  }
  form.addEventListener('change', e => { e.target.closest('.invalid')?.classList.remove('invalid'); updateRole(); });
  next.addEventListener('click', () => { if (validate()) { step++; showStep(); } });
  back.addEventListener('click', () => { if (!sending) { step--; showStep(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending || sent) return;
    if (step < 2) { next.click(); return; }
    if (!validate()) return;
    const data = new FormData(form);
    const payload = {id, survey_version:1, real_role:data.get('real_role'), prior_problem:data.get('prior_problem'), task_success:data.get('task_success'), feedback:data.get('feedback').trim(), consent:true};
    for (const [name] of [...experience,...value]) payload[name] = data.has(name) ? Number(data.get(name)) : null;
    // Retry the exact same payload after an ambiguous network failure.
    pendingPayload ||= payload;
    sending = true; submit.disabled = true; back.disabled = true; submit.textContent = 'Wird gespeichert …'; error.hidden = true;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(pendingPayload),signal:controller.signal});
      let duplicate = false;
      if (response.status === 409) { const result = await response.json(); duplicate = result.code === '23505'; }
      if (!response.ok && !duplicate) { pendingPayload = null; throw new Error('save'); }
      sent = true; document.getElementById('survey-shell').hidden = true; document.getElementById('success').hidden = false; document.querySelector('#success h2').focus();
    } catch {
      error.textContent = 'Das Speichern konnte nicht bestätigt werden. Bitte prüfe deine Internetverbindung und versuche es erneut. Deine Antworten bleiben hier erhalten; bei unklarem Versandstatus senden wir dieselbe Antwort erneut.';
      error.hidden = false;
    } finally { clearTimeout(timeout); sending = false; submit.disabled = false; back.disabled = false; submit.textContent = 'Feedback absenden'; }
  });
})();
