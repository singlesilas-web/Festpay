'use strict';
(() => {
  // No click recording or app accounts. Shared trial ID only for consented research linkage.
  const identity = window.FestPayIdentity;
  const endpoint = 'https://orrprvpypsvuzspwzevf.supabase.co/rest/v1/festpay_survey_responses';
  const key = 'sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1';
  const form = document.getElementById('survey');
  form.elements.trial_id.value = identity.read() || '';
  const sections = [...document.querySelectorAll('[data-step]')];
  const back = document.getElementById('back'), next = document.getElementById('next'), submit = document.getElementById('submit');
  const error = document.getElementById('error');
  const labels = ['Dein Test', 'Deine Aufgaben', 'Bedienung & Gestaltung', 'Dein Fazit'];
  let step = 0, sending = false, sent = false, pendingPayload = null;
  const id = crypto.randomUUID(); // One independent submission ID, retained for retries only.
  const context = [
    ['real_roles','Welche Rolle passt im echten Leben am ehesten zu dir? (Mehrfachauswahl möglich)', [['guest','Gast auf Festen'],['helper','Helfer/in am Verkaufsstand'],['organizer','Veranstalter'],['none','Keine dieser Rollen']]],
    ['legacy_payment_satisfaction','Wie zufrieden bist du mit dem aktuell auf kleinen Festen verbreiteten Bezahlprozess mit physischen Bons oder Verzehrkarten zum Abstreichen?', [['1','Sehr unzufrieden'],['2','Eher unzufrieden'],['3','Weder zufrieden noch unzufrieden'],['4','Eher zufrieden'],['5','Sehr zufrieden']]],
    ['payment_preference','Wie würdest du auf einem Fest am liebsten bezahlen?', [['cash','Bargeld'],['tokens','Wertmarken'],['cards','Verzehrkarten'],['digital','digital / bargeldlos'],['no_preference','keine Präferenz']]]
  ];
  const experience = [
    ['ease','Die App ist einfach zu bedienen.'],
    ['navigation','Ich wusste, was ich als Nächstes tun kann.'],
    ['design','Die App sieht ansprechend aus.'],
    ['enjoyment','Die Bedienung hat mir Spaß gemacht.'],
    ['payment_clarity','Der Ablauf beim Bezahlen war für mich verständlich.'],
    ['balance_clarity','Ich konnte erkennen, wie viel Guthaben bzw. welche Marken ich noch hatte.']
  ];
  const value = [['usefulness','Festpay bietet die Funktionen, die ich auf einem Fest brauche.']];
  const perspectives = [
    ['guest_usefulness','Stell dir vor, du bist Gast auf einem Fest, auf dem Festpay als Bezahlweg angeboten wird. Wie nützlich wäre Festpay für dich?'],
    ['organizer_usefulness','Für wie sinnvoll hältst du es, als Veranstalter Festpay auf einem Fest als Bezahlmöglichkeit anzubieten?']
  ];
  function question(name, title, options, rating = false, ratingLabels = ['','stimme gar nicht zu','stimme eher nicht zu','neutral','stimme eher zu','stimme voll zu']) {
    const field = document.createElement('fieldset'); field.dataset.name = name;
    const legend = document.createElement('legend'); legend.textContent = title; field.append(legend);
    const list = document.createElement('div'); list.className = rating ? 'ratings' : 'options';
    for (const [val, text] of options) {
      const label = document.createElement('label'); label.className = rating ? `rating${val === '0' ? ' na' : ''}` : 'option';
      const input = document.createElement('input'); input.type = name === 'real_roles' ? 'checkbox' : 'radio'; input.name = name; input.value = val; input.required = name !== 'real_roles';
      if (rating) input.setAttribute('aria-label', val === '0' ? text : `${val} – ${ratingLabels[Number(val)]}`);
      const span = document.createElement('span'); span.textContent = text;
      label.append(input, span); list.append(label);
    }
    field.append(list); return field;
  }
  context.forEach(q => document.getElementById('context-questions').append(question(...q)));
  const tasks = [
  [
    "task_guest_balance",
    "Gast",
    "Demo-Fest B: 20 € aufladen und Getränk A bezahlen"
  ],
  [
    "task_guest_tokens",
    "Gast",
    "Demo-Fest A: Wertmarken für Getränk A und Speise B auswählen und entwerten"
  ],
  [
    "task_helper_checkout",
    "Helfer",
    "Demo-Fest B: 2× Getränk A und Speise B erfassen, auf 1× Getränk A ändern und abbuchen"
  ],
  [
    "task_organizer_tokens",
    "Betreiber",
    "Fest mit Festmarken anlegen: Spezi und Currywurst mit Pommes eintragen"
  ],
  [
    "task_organizer_balance",
    "Betreiber",
    "Fest mit Festguthaben anlegen: 10, 20 und 50 € sowie Spezi, Fanta, Bier, Rote Wurst und Currywurst mit Pommes eintragen"
  ],
  [
    "task_organizer_helper",
    "Betreiber",
    "Max Mustermann als Helfer zum Fest mit Festguthaben hinzufügen"
  ]
];
  const statuses = [['done','Geschafft'],['with_help','Mit Hilfe geschafft'],['failed','Nicht geschafft'],['not_tried','Nicht ausprobiert']];
  const taskQuestions = document.getElementById('task-questions');
  let previousRole;
  for (const [index, [name, role, title]] of tasks.entries()) {
    if (role !== previousRole) {
      const heading = document.createElement('h3');
      heading.className = 'task-role';
      heading.textContent = 'Rolle ' + role;
      taskQuestions.append(heading);
      previousRole = role;
    }
    const card = document.createElement('div');
    card.className = 'task-card';
    const field = question(name, (index + 1) + '. ' + title, statuses);
    card.append(field);
    taskQuestions.append(card);
  }
  function updateTasks() {
    const allDone = tasks.every(([name]) => form.elements[name].value === 'done');
    document.getElementById('all-done').setAttribute('aria-pressed', String(allDone));
  }
  document.getElementById('all-done').addEventListener('click', () => {
    for (const [name] of tasks) form.elements[name].value = 'done';
    document.querySelectorAll('.task-card .invalid').forEach(el => el.classList.remove('invalid'));
    error.hidden = true;
    updateTasks();
  });
  const scale = [['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['0','Nicht beurteilbar']];
  experience.forEach(([name,title]) => document.getElementById('experience-questions').append(question(name,title,scale,true)));
  value.forEach(([name,title]) => document.getElementById('value-ratings').append(question(name,title,scale,true)));
  const usefulnessLabels = ['', 'überhaupt nicht nützlich', 'eher nicht nützlich', 'mäßig nützlich', 'eher nützlich', 'sehr nützlich'];
  const perspectiveRatings = document.getElementById('perspective-ratings');
  const [guest, organizer] = perspectives;
  perspectiveRatings.append(question(...guest, scale, true, usefulnessLabels));

  const meaningfulnessLabels = ['', 'überhaupt nicht sinnvoll', 'eher nicht sinnvoll', 'mäßig sinnvoll', 'eher sinnvoll', 'sehr sinnvoll'];
  const organizerScale = document.createElement('p');
  organizerScale.className = 'scale-key';
  organizerScale.textContent = meaningfulnessLabels.slice(1).map((label, index) => `${index + 1} = ${label}`).join(' · ');
  perspectiveRatings.append(organizerScale, question(...organizer, scale, true, meaningfulnessLabels));
  const selectedRoles = () => [...form.querySelectorAll('input[name="real_roles"]:checked')].map(el => el.value);
  function updateRole() {
    const roles = selectedRoles();
    const guestFeedback = document.getElementById('guest-abuse-field');
    guestFeedback.hidden = !roles.includes('guest');
    form.elements.guest_abuse_feedback.disabled = guestFeedback.hidden;
    const hide = roles.includes('none');
    document.getElementById('value-questions').hidden = hide;
    document.querySelectorAll('#value-ratings input').forEach(el => { el.disabled = hide; el.required = !hide; });
    const field = document.getElementById('organizer-fee-field');
    const input = document.getElementById('organizer_transaction_fee_percent');
    const showFee = roles.includes('organizer');
    field.hidden = !showFee;
    input.disabled = !showFee;
    input.required = showFee;
    if (!showFee) input.value = '';
  }
  updateRole();
  function showStep() {
    sections.forEach((s,i) => { s.hidden = i !== step; });
    back.hidden = step === 0; next.hidden = step === labels.length-1; submit.hidden = step !== labels.length-1;
    document.getElementById('step-label').textContent = `${step+1} von ${labels.length} · ${labels[step]}`;
    document.getElementById('progress-text').textContent = ['Los geht’s','Deine Erfahrungen','Dein Eindruck','Fast geschafft'][step];
    document.getElementById('progress').value = step+1;
    error.hidden = true; document.getElementById(`heading-${step}`).focus();
  }
  function validate() {
    if (step === 0 && !identity.normalize(form.elements.trial_id.value)) {
      error.textContent='Bitte die vollständige Versuchs-ID aus dem Test übernehmen.';error.hidden=false;form.elements.trial_id.focus();return false;
    }
    if (step === 0 && selectedRoles().length === 0) {
      error.textContent = 'Bitte wähle mindestens eine Rolle aus.';
      error.hidden = false;
      const field = form.querySelector('[data-name="real_roles"]');
      field.classList.add('invalid');
      field.querySelector('input').focus();
      return false;
    }
    const invalid = [...sections[step].querySelectorAll('input,select,textarea')].find(el => !el.disabled && !el.checkValidity());
    if (!invalid) return true;
    error.textContent = invalid.name === 'consent' ? 'Bitte stimme der Speicherung und Auswertung zu, wenn du teilnehmen möchtest.' : 'Bitte beantworte die markierte Frage. Du kannst bei Skalen auch „Nicht beurteilbar“ wählen.';
    error.hidden = false; (invalid.closest('fieldset') || invalid.closest('label')).classList.add('invalid'); invalid.focus(); return false;
  }
  form.addEventListener('change', e => {
    if (e.target.name === 'real_roles' && e.target.checked) {
      const choices = [...form.querySelectorAll('input[name="real_roles"]')];
      if (e.target.value === 'none') choices.filter(el => el.value !== 'none').forEach(el => { el.checked = false; });
      else choices.find(el => el.value === 'none').checked = false;
    }
    e.target.closest('.invalid')?.classList.remove('invalid');
    error.hidden = true;
    updateRole(); updateTasks();
  });
  next.addEventListener('click', () => { if (validate()) { step++; showStep(); } });
  back.addEventListener('click', () => { if (!sending) { step--; showStep(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending || sent) return;
    if (step < labels.length-1) { next.click(); return; }
    if (!validate()) return;
    const data = new FormData(form);
    const roles = selectedRoles();
    const fee = data.get('organizer_transaction_fee_percent');
    const payload = {id, trial_id:identity.save(form.elements.trial_id.value), age:data.get('age') === '' ? null : Number(data.get('age')), survey_version:5, real_role:roles[0], real_roles:roles, organizer_transaction_fee_percent:roles.includes('organizer') ? Number(fee) : null, legacy_payment_satisfaction:Number(data.get('legacy_payment_satisfaction')), guest_abuse_feedback:data.get('guest_abuse_feedback')?.trim() || null, payment_preference:data.get('payment_preference'), feedback:data.get('feedback').trim(), consent:true};
    for (const [name] of tasks) payload[name] = data.get(name);
    for (const [name] of [...experience,...value,...perspectives]) payload[name] = data.has(name) ? Number(data.get(name)) : null;
    // Retry the exact same payload after an ambiguous network failure.
    pendingPayload ||= payload;
    sending = true; submit.disabled = true; back.disabled = true; submit.textContent = 'Wird gespeichert …'; error.hidden = true;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(pendingPayload),signal:controller.signal});
      let duplicate = false;
      if (response.status === 409) { const result = await response.json(); duplicate = result.code === '23505' && result.message?.includes('festpay_survey_responses_pkey'); }
      if (!response.ok && !duplicate) { pendingPayload = null; throw new Error('save'); }
      sent = true; document.getElementById('survey-shell').hidden = true; document.getElementById('success').hidden = false; document.querySelector('#success h2').focus();
    } catch {
      error.textContent = 'Das Speichern konnte nicht bestätigt werden. Pro Versuchs-ID ist nur ein Fragebogen möglich. Bitte prüfe die Versuchs-ID und deine Internetverbindung und versuche es erneut. Deine Antworten bleiben hier erhalten; bei unklarem Versandstatus senden wir dieselbe Antwort erneut.';
      error.hidden = false;
    } finally { clearTimeout(timeout); sending = false; submit.disabled = false; back.disabled = false; submit.textContent = 'Feedback absenden'; }
  });
})();
