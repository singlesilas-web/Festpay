/* Short display codes; random UUIDs remain internal keys and are never login credentials. */
window.FestPayStudy = (() => {
  const key='festpay_study_v2';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const personPattern=/^P[0-9]{3,}$/i,attemptPattern=/^P[0-9]{3,}-A[1-5]-[1-9][0-9]*$/i;
  const valid=value=>typeof value==='string'&&(uuid.test(value)||personPattern.test(value));
  const validAttempt=value=>typeof value==='string'&&(uuid.test(value)||attemptPattern.test(value));
  const norm=value=>uuid.test(value)?value.toLowerCase():value.toUpperCase();
  function read(){try{return JSON.parse(localStorage.getItem(key))||{people:{}};}catch{return {people:{}};}}
  function write(s){localStorage.setItem(key,JSON.stringify(s));}
  function choose(ref){
    if(!valid(ref))throw Error('Ungültiger Personencode');const s=read();s.people ||= {};s.codes ||= {};
    const input=norm(ref);s.current=Object.keys(s.codes).find(id=>s.codes[id]===input)||input;s.people[s.current] ||= [];write(s);return s.current;
  }
  function current(){const s=read();return valid(s.current)?s.current:choose(crypto.randomUUID());}
  function personCode(ref=current()){if(personPattern.test(ref))return ref.toUpperCase();return read().codes?.[norm(ref)]||'';}
  function attempts(ref=current()){const s=read(),input=norm(ref),id=Object.keys(s.codes||{}).find(id=>s.codes[id]===input)||input;return (s.people?.[id]||[]).filter(a=>validAttempt(a.id));}
  function registerPerson(id,code){
    if(!uuid.test(id)||!personPattern.test(code))return;id=norm(id);code=norm(code);const s=read();s.codes ||= {};s.people ||= {};s.codes[id]=code;
    s.people[id] ||= [];for(const a of s.people[code]||[])if(!s.people[id].some(b=>b.id===a.id||b.code&&b.code===a.code))s.people[id].push(a);
    delete s.people[code];if(s.current===code)s.current=id;write(s);
  }
  function remember(id,task,person=current(),code='',number=null){
    if(!validAttempt(id)||!valid(person))throw Error('Ungültige Zuordnung');id=norm(id);person=norm(person);const s=read();s.people ||= {};
    const real=Object.keys(s.codes||{}).find(k=>s.codes[k]===person)||person,list=s.people[real] ||= [];
    const old=list.find(a=>a.id===id||code&&a.code===code);const value={id,task,...(attemptPattern.test(code)?{code:norm(code),number}:{})};
    if(old)Object.assign(old,value);else list.push(value);write(s);
  }
  async function refresh(person=current()){
    if(!uuid.test(person))return;
    const C=window.APP_CONFIG||{ANALYTICS_URL:'https://orrprvpypsvuzspwzevf.supabase.co',ANALYTICS_KEY:'sb_publishable_IBp-YQesCAmLfB0qNwwsxw_j6O2cTU1'};
    const response=await fetch(C.ANALYTICS_URL+'/functions/v1/test-events',{method:'POST',headers:{apikey:C.ANALYTICS_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'labels',participant_id:person}),referrerPolicy:'no-referrer'});
    if(!response.ok)return;const data=await response.json();registerPerson(data.participant_id,data.participant_code);
    for(const a of data.attempts||[])remember(a.id,a.task,data.participant_id,a.attempt_code,a.attempt_number);
  }
  function importLink(){
    const p=new URLSearchParams((location.hash||'').slice(1));if(!p.has('participant'))return;
    const id=p.get('participant');if(!valid(id))return;choose(id);
    const ids=(p.get('attempts')||'').split(','),tasks=(p.get('tasks')||'').split(',');
    if(ids.length<=100)ids.forEach((value,i)=>{if(validAttempt(value))remember(value,/^[a-z_]{1,40}$/.test(tasks[i]||'')?tasks[i]:'',id,attemptPattern.test(value)?value:'');});
    history.replaceState(null,'',location.pathname+location.search);
  }
  function fragment(person=current()){
    const list=attempts(person);return '#'+new URLSearchParams({participant:personCode(person)||person,attempts:list.map(a=>a.code||a.id).join(','),tasks:list.map(a=>a.task).join(',')});
  }
  function root(){const u=new URL(location.href);u.hash='';u.search='';return /\/(umfrage|beobachtung)\//.test(u.pathname)?new URL('../',u):new URL('./',u);}
  function url(kind,person=current()){return new URL(kind==='app'?'index.html':kind+'/',root()).href+fragment(person);}
  async function show(person=current()){
    try{await refresh(person);}catch{}
    const d=document.createElement('dialog');d.className='study-dialog';d.dataset.noTrack='1';
    const title=document.createElement('h2');title.textContent='Zuordnung dieser Testperson';d.append(title);
    const text=document.createElement('p');text.textContent='Ein Personencode reicht für die normale Zuordnung. A1 bis A5 kennzeichnet die Aufgabe, die letzte Zahl den Durchlauf. Bei einer Wiederholung bleibt der Personencode gleich.';d.append(text);
    const input=document.createElement('input');input.readOnly=true;input.value=personCode(person)||'Wird beim ersten Aufgabenstart vergeben';input.setAttribute('aria-label','Personencode');d.append(input);
    if(personCode(person))for(const [kind,label] of [['umfrage','Fragebogen für diese Testperson'],['beobachtung','Beobachtungsbogen für diese Testperson']]){const a=document.createElement('a');a.href=url(kind,person);a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;d.append(a);}
    for(const a of attempts(person)){const line=document.createElement('p');line.textContent=a.code||'Aufgabe wird automatisch zugeordnet';d.append(line);}
    const close=document.createElement('button');close.textContent='Schließen';close.onclick=()=>d.remove();d.append(close);d.addEventListener('cancel',()=>d.remove());document.body.append(d);d.showModal();
  }
  importLink();return {valid,validAttempt,choose,current,personCode,registerPerson,attempts,remember,refresh,fragment,url,show};
})();
