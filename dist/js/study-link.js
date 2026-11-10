/* Pseudonymous study identity. Contains IDs only: no answers, age, names or session tokens. */
window.FestPayStudy = (() => {
  const key='festpay_study_v1';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const valid=value=>typeof value==='string' && uuid.test(value);
  function read(){try{return JSON.parse(localStorage.getItem(key))||{people:{}};}catch{return {people:{}};}}
  function write(state){localStorage.setItem(key,JSON.stringify(state));}
  function choose(id){if(!valid(id))throw Error('Ungültige Testpersonen-ID');const s=read();s.people ||= {};s.current=id.toLowerCase();s.people[s.current] ||= [];write(s);return s.current;}
  function current(){const s=read();return valid(s.current)?s.current:choose(crypto.randomUUID());}
  function attempts(id=current()){return (read().people?.[id.toLowerCase()]||[]).filter(a=>valid(a.id));}
  function remember(id,task,person=current()){if(!valid(id)||!valid(person))throw Error('Ungültige Zuordnung');id=id.toLowerCase();person=person.toLowerCase();const s=read();s.people ||= {};const list=s.people[person] ||= [];if(!list.some(a=>a.id===id))list.push({id,task});write(s);}
  function importLink(){
    const p=new URLSearchParams((location.hash||'').slice(1));
    if(!p.has('participant'))return;
    const id=p.get('participant');if(!valid(id))return;
    choose(id);const ids=(p.get('attempts')||'').split(','),tasks=(p.get('tasks')||'').split(',');
    if(ids.length<=100)ids.forEach((value,index)=>{if(valid(value))remember(value,/^[a-z_]{1,40}$/.test(tasks[index]||'')?tasks[index]:'',id);});
    // IDs stay in local storage; remove the share fragment from the visible page.
    history.replaceState(null,'',location.pathname+location.search);
  }
  function fragment(id=current()){
    const list=attempts(id);return '#'+new URLSearchParams({participant:id,attempts:list.map(a=>a.id).join(','),tasks:list.map(a=>a.task).join(',')});
  }
  function root(){const url=new URL(location.href);url.hash='';url.search='';if(/\/(umfrage|beobachtung)\//.test(url.pathname))return new URL('../',url);return new URL('./',url);}
  function url(kind,id=current()){return new URL(kind==='app'?'index.html':kind+'/',root()).href+fragment(id);}
  function show(person=current()){
    const d=document.createElement('dialog');d.className='study-dialog';d.dataset.noTrack='1';
    const title=document.createElement('h2');title.textContent='Zuordnung dieser Testperson';d.append(title);
    const copy=document.createElement('p');copy.textContent='Dieselbe Testpersonen-ID verbindet alle Aufgaben. Jede Aufgabe hat zusätzlich eine eigene Versuchs-ID. Für einen anderen Rechner einen der Links kopieren.';d.append(copy);
    const input=document.createElement('input');input.readOnly=true;input.value=person;input.setAttribute('aria-label','Testpersonen-ID');d.append(input);
    for(const [kind,label] of [['umfrage','Fragebogen für diese Testperson'],['beobachtung','Beobachtungsbogen für diese Testperson']]){const a=document.createElement('a');a.href=url(kind,person);a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;d.append(a);}
    for(const a of attempts(person)){const line=document.createElement('p');line.textContent=a.task+' · '+a.id;d.append(line);}
    const close=document.createElement('button');close.textContent='Schließen';close.onclick=()=>d.remove();d.append(close);d.addEventListener('cancel',()=>d.remove());document.body.append(d);d.showModal();
  }
  importLink();
  return {valid,choose,current,attempts,remember,fragment,url,show};
})();
