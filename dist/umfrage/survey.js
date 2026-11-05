'use strict';
(() => {
  // Deliberately standalone: no app scripts, auth, analytics, cookies or app storage.
  const endpoint = 'https://orrprvpypsvuzspwzevf.supabase.co/rest/v1/festpay_survey_responses';
  const key = 'sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1';
  const form = document.getElementById('survey');
  const sections = [...document.querySelectorAll('[data-step]')];
  const back = document.getElementById('back'), next = document.getElementById('next'), submit = document.getElementById('submit');
  const error = document.getElementById('error');
  const labels = ['Dein Test', 'Deine Aufgaben', 'Bedienung & Gestaltung', 'Dein Fazit'];
  let step = 0, sending = false, sent = false, pendingPayload = null;
  const id = crypto.randomUUID(); // One independent submission ID, retained for retries only.
  const context = [
    ['real_role','Welche Rolle passt im echten Leben am ehesten zu dir?', [['guest','Gast auf Festen'],['helper','Helfer/in am Verkaufsstand'],['organizer','Veranstalter/in oder Vereinsorganisation'],['none','Keine dieser Rollen']]],
    ['coupon_practicality','Wie praktisch findest du es, auf einem Fest an einem Stand mit Bargeld Wertmarken oder Essens- und Getränkecoupons zu kaufen und damit zu bezahlen?', [['1','Sehr unpraktisch'],['2','Eher unpraktisch'],['3','Weder praktisch noch unpraktisch'],['4','Eher praktisch'],['5','Sehr praktisch'],['0','Keine Erfahrung']]],
    ['payment_preference','Wie würdest du auf einem Fest am liebsten bezahlen?', [['cash','Bargeld'],['tokens','Wertmarken'],['digital','Digital und bargeldlos'],['no_preference','Keine Präferenz'],['cannot_judge','Kann ich nicht beurteilen']]]
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
    ['organizer_usefulness','Stell dir vor, du veranstaltest ein Fest. Wie nützlich wäre es für dich, Festpay als Bezahlweg anzubieten?']
  ];
  function question(name, title, options, rating = false, ratingLabels = ['','stimme gar nicht zu','stimme eher nicht zu','neutral','stimme eher zu','stimme voll zu']) {
    const field = document.createElement('fieldset'); field.dataset.name = name;
    const legend = document.createElement('legend'); legend.textContent = title; field.append(legend);
    const list = document.createElement('div'); list.className = rating ? 'ratings' : 'options';
    for (const [val, text] of options) {
      const label = document.createElement('label'); label.className = rating ? `rating${val === '0' ? ' na' : ''}` : 'option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = val; input.required = true;
      if (rating) input.setAttribute('aria-label', val === '0' ? text : `${val} – ${ratingLabels[Number(val)]}`);
      const span = document.createElement('span'); span.textContent = text;
      label.append(input, span); list.append(label);
    }
    field.append(list); return field;
  }
  context.forEach(q => document.getElementById('context-questions').append(question(...q)));
  const tasks = [
    ['task_topup', 'Festguthaben aufladen'],
    ['task_qr', 'Den eigenen QR-Code zum Bezahlen finden und anzeigen'],
    ['task_buy_tokens', 'Festmarken kaufen'],
    ['task_redeem_token', 'Eine Festmarke entwerten']
  ];
  const statuses = [['done','Geschafft'],['with_help','Mit Hilfe geschafft'],['failed','Nicht geschafft'],['not_tried','Nicht ausprobiert']];
  for (const [index, [name, title]] of tasks.entries()) {
    const card = document.createElement('div'); card.className = 'task-card'; card.dataset.task = name;
    card.innerHTML = `<fieldset><legend><span class="task-heading"><span class="task-number">${index+1}</span><span>${title}</span></span></legend><select name="${name}" id="${name}" required aria-label="${title}: Ergebnis"><option value="" disabled selected>Ergebnis auswählen</option>${statuses.map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select><label class="task-note" hidden for="${name}_note">Wo bist du hängen geblieben? <span class="optional">Optional</span><textarea id="${name}_note" name="${name}_note" maxlength="300" rows="2" disabled placeholder="Zum Beispiel: Ich habe den nächsten Schritt nicht gefunden."></textarea><span class="hint">Ein kurzer Satz reicht. Bitte keine persönlichen Daten.</span></label></fieldset>`;
    document.getElementById('task-questions').append(card);
  }
  function updateTasks() {
    for (const [name] of tasks) {
      const card = document.querySelector(`[data-task="${name}"]`), select = form.elements[name];
      const needsNote = ['with_help','failed'].includes(select.value);
      card.querySelector('.task-note').hidden = !needsNote;
      form.elements[`${name}_note`].disabled = !needsNote;
      card.dataset.status = select.value;
    }
    document.getElementById('all-done').setAttribute('aria-pressed', String(tasks.every(([name]) => form.elements[name].value === 'done')));
  }
  document.getElementById('all-done').addEventListener('click', () => {
    for (const [name] of tasks) form.elements[name].value = 'done';
    document.querySelectorAll('.task-card .invalid').forEach(el => el.classList.remove('invalid'));
    error.hidden = true; updateTasks();
  });
  const scale = [['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['0','Nicht beurteilbar']];
  experience.forEach(([name,title]) => document.getElementById('experience-questions').append(question(name,title,scale,true)));
  value.forEach(([name,title]) => document.getElementById('value-ratings').append(question(name,title,scale,true)));
  const usefulnessLabels = ['', 'überhaupt nicht nützlich', 'eher nicht nützlich', 'mäßig nützlich', 'eher nützlich', 'sehr nützlich'];
  perspectives.forEach(([name,title]) => document.getElementById('perspective-ratings').append(question(name,title,scale,true,usefulnessLabels)));
  function updateRole() {
    const hide = form.elements.real_role.value === 'none';
    document.getElementById('value-questions').hidden = hide;
    document.querySelectorAll('#value-ratings input').forEach(el => { el.disabled = hide; el.required = !hide; });
  }
  function showStep() {
    sections.forEach((s,i) => { s.hidden = i !== step; });
    back.hidden = step === 0; next.hidden = step === labels.length-1; submit.hidden = step !== labels.length-1;
    document.getElementById('step-label').textContent = `${step+1} von ${labels.length} · ${labels[step]}`;
    document.getElementById('progress-text').textContent = ['Los geht’s','Deine Erfahrungen','Dein Eindruck','Fast geschafft'][step];
    document.getElementById('progress').value = step+1;
    error.hidden = true; document.getElementById(`heading-${step}`).focus();
  }
  function validate() {
    const invalid = [...sections[step].querySelectorAll('input,select,textarea')].find(el => !el.disabled && !el.checkValidity());
    if (!invalid) return true;
    error.textContent = invalid.name === 'consent' ? 'Bitte stimme der Speicherung und Auswertung zu, wenn du teilnehmen möchtest.' : 'Bitte beantworte die markierte Frage. Du kannst bei Skalen auch „Nicht beurteilbar“ wählen.';
    error.hidden = false; (invalid.closest('fieldset') || invalid.closest('label')).classList.add('invalid'); invalid.focus(); return false;
  }
  form.addEventListener('change', e => { e.target.closest('.invalid')?.classList.remove('invalid'); error.hidden = true; updateRole(); updateTasks(); });
  next.addEventListener('click', () => { if (validate()) { step++; showStep(); } });
  back.addEventListener('click', () => { if (!sending) { step--; showStep(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending || sent) return;
    if (step < labels.length-1) { next.click(); return; }
    if (!validate()) return;
    const data = new FormData(form);
    const payload = {id, survey_version:3, real_role:data.get('real_role'), coupon_practicality:Number(data.get('coupon_practicality')), payment_preference:data.get('payment_preference'), feedback:data.get('feedback').trim(), consent:true};
    for (const [name] of tasks) { payload[name] = data.get(name); payload[`${name}_note`] = data.has(`${name}_note`) ? data.get(`${name}_note`).trim() : ''; }
    for (const [name] of [...experience,...value,...perspectives]) payload[name] = data.has(name) ? Number(data.get(name)) : null;
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

