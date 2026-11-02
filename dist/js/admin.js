(async()=>{
  localStorage.setItem('festpay_exclude_device','1');sessionStorage.removeItem('festpay_test_session_v2');
  const $=id=>document.getElementById(id),C=APP_CONFIG;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={'index.html':'Karte','fest.html':'Fest','guthaben.html':'Guthaben','speisekarte.html':'Speisekarte','bezahlen.html':'Bezahlen','marken.html':'Meine Marken',wallet_topped_up:'Guthaben aufgeladen',tokens_purchased:'Marken gekauft',token_redeemed:'Marke entwertet',wallet_charged:'Guthaben abgebucht',helper_scanner_opened:'Helfer-Scanner geöffnet'};
  const label=e=>e.type==='activity'?(names[e.props.activity]||e.props.activity):(names[e.screen]||e.screen);
  let client,sessions=[],events=[],filtered=[],sample=false;
  const configured=/^https:\/\//.test(C.ANALYTICS_URL)&&!!C.ANALYTICS_KEY;
  if(configured&&window.supabase)client=supabase.createClient(C.ANALYTICS_URL,C.ANALYTICS_KEY,{auth:{storageKey:'festpay_analyst_auth'}});
  $('status').textContent=configured?'Mit eurem freigegebenen Analyse-Account anmelden.':'Supabase ist noch nicht eingerichtet. Die Auswertung lässt sich mit klar gekennzeichneten Beispieldaten ansehen.';
  $('login').querySelector('button').disabled=!client;$('register').disabled=!client;
  $('register').onclick=async()=>{if(!$('login').querySelector('form').reportValidity())return;const {error}=await client.auth.signUp({email:$('email').value,password:$('password').value});$('password').value='';$('status').textContent=error?'Registrierung fehlgeschlagen. Bitte gültige E-Mail und ein starkes Passwort mit mindestens 8 Zeichen verwenden.':'Falls eine neue Registrierung möglich war, wurde eine Bestätigungsmail versandt. Bestätige die E-Mail und melde dich anschließend hier an. Der Account benötigt zusätzlich eine Admin-Freigabe durch die Projektverantwortlichen.';};
  $('login').querySelector('form').onsubmit=async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email:$('email').value,password:$('password').value});$('password').value='';if(error){$('status').textContent='Anmeldung fehlgeschlagen.';return;}await load();};
  $('logout').onclick=async()=>{await client.auth.signOut();location.reload();};
  async function all(table,columns){let rows=[];for(let offset=0;;offset+=1000){let query=client.from(table).select(columns);if(table==='analytics_sessions')query=query.eq('excluded',false);const {data,error}=await query.order(table==='analytics_sessions'?'started_at':'received_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+999);if(error)throw error;rows.push(...data);if(data.length<1000)return rows;}}
  async function load(){try{const {data,error}=await client.from('analytics_admins').select('user_id');if(error||!data.length){$('status').textContent='Dieser Account hat keine Analysefreigabe.';$('logout').hidden=false;return;}sessions=await all('analytics_sessions','id,task,version,started_at');events=await all('analytics_events','id,session_id,seq,type,screen,at,received_at,elapsed,props');sample=false;show();$('logout').hidden=false;}catch{$('status').textContent='Daten konnten nicht geladen werden. Verbindung und Zugriffsrechte prüfen.';}}
  function show(){
    $('login').hidden=true;$('dashboard').hidden=false;$('reload').hidden=sample;
    $('notice').textContent=sample?'BEISPIELDATEN · Diese drei Sitzungen sind erfunden und werden nicht gespeichert.':'Live-Daten · Nur freigegebene Testsitzungen. Aktualisieren lädt neue Ereignisse.';
    $('version').innerHTML=[...new Set(sessions.map(s=>s.version))].map(v=>`<option>${esc(v)}</option>`).join('');render();
  }
  const outcome=(s,es)=>{
    const success=es.some(e=>e.type==='activity'&&((s.task==='w1'&&e.props.activity==='wallet_topped_up')||(s.task==='w2'&&e.props.activity==='token_redeemed')));
    if(success)return 'Ziel erreicht';if(es.some(e=>e.type==='session_end'))return s.task==='explore'?'Erkundung beendet':'Beendet ohne Ziel';
    const last=es.at(-1);return Date.now()-Date.parse(last?.received_at||last?.at||s.started_at)>180000?'Vermuteter Abbruch':'Läuft / offen';
  };
  function render(){
    const ss=sessions.filter(s=>($('task').value==='all'||s.task===$('task').value)&&s.version===$('version').value),ids=new Set(ss.map(s=>s.id));filtered=events.filter(e=>ids.has(e.session_id));
    const by=id=>filtered.filter(e=>e.session_id===id).sort((a,b)=>a.seq-b.seq);
    const clicks=filtered.filter(e=>e.type==='click'),goals=ss.filter(s=>s.task!=='explore');const reached=goals.filter(s=>outcome(s,by(s.id))==='Ziel erreicht').length;
    const metric=(value,text)=>`<div class="metric"><b>${value}</b><span>${text}</span></div>`;
    $('metrics').innerHTML=metric(ss.length,'Testsitzungen')+metric(goals.length?Math.round(reached/goals.length*100)+'%':'—','Aufgabenerfolg (W1/W2)')+metric(ss.length?(clicks.length/ss.length).toFixed(1):'—','Klicks je Sitzung')+metric(filtered.filter(e=>e.type==='repeated_click').length,'Schnelle Mehrfachklicks');
    const edges={},variants={};
    $('sessions').innerHTML=ss.map(s=>{const es=by(s.id),path=es.filter(e=>['page_view','activity'].includes(e.type)).map(label);const variant=path.join(' → ');variants[variant]=(variants[variant]||0)+1;for(let i=1;i<path.length;i++){const key=path[i-1]+' → '+path[i];edges[key]=(edges[key]||0)+1;}
      return `<tr><td>${esc(s.id.startsWith('beispiel-')?s.id:s.id.slice(0,8))}</td><td>${esc(s.task.toUpperCase())}</td><td class="status">${esc(outcome(s,es))}</td><td>${es.filter(e=>e.type==='click').length}</td><td>${Math.round((es.at(-1)?.elapsed||0)/1000)} s</td><td>${esc(names[es.at(-1)?.screen]||es.at(-1)?.screen||'—')}</td><td><details><summary>Schritte (${path.length})</summary><p>${esc(variant||'Noch keine Ereignisse')}</p></details></td></tr>`;
    }).join('')||'<tr><td colspan="7">Noch keine Testsitzungen.</td></tr>';
    $('edges').innerHTML=Object.entries(edges).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="edge"><span>${esc(k)}</span><b>${v}</b></div>`).join('')||'<p class="note">Noch keine Prozessübergänge.</p>';
    $('variants').innerHTML=Object.entries(variants).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="variant"><b>${v}×</b> ${esc(k||'Keine Schritte')}</div>`).join('');
    $('screen').innerHTML=[...new Set(clicks.map(e=>e.screen))].map(s=>`<option value="${esc(s)}">${esc(names[s]||s)}</option>`).join('');contexts();
  }
  function context(e){const p=e.props;return `${p.ui_state||'main'} / ${p.aw||360} × ${p.dh||800} / Zoom ${Math.round((p.map_scale||1)*10)/10}`;}
  function contexts(){const es=filtered.filter(e=>e.type==='click'&&e.screen===$('screen').value);$('context').innerHTML=[...new Set(es.map(context))].map(c=>`<option>${esc(c)}</option>`).join('');heat();}
  function heat(){const c=$('heat'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#ddd';for(let x=0;x<360;x+=36){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,550);ctx.stroke();}for(let y=0;y<550;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();}
    const es=filtered.filter(e=>e.type==='click'&&e.screen===$('screen').value&&context(e)===$('context').value);for(const e of es){const x=e.props.x*360,y=e.props.y*550;if(!Number.isFinite(x)||!Number.isFinite(y))continue;const g=ctx.createRadialGradient(x,y,0,x,y,24);g.addColorStop(0,'rgba(255,55,10,.6)');g.addColorStop(.4,'rgba(255,130,0,.3)');g.addColorStop(1,'rgba(255,220,0,0)');ctx.fillStyle=g;ctx.fillRect(x-24,y-24,48,48);}$('heatNote').textContent=es.length+' Klicks · oben = Seitenanfang · unten = Seitenende';
  }
  function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  $('csv').onclick=()=>{const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const rows=[['case_id','activity','timestamp','sequence','task','version'],...filtered.filter(e=>['page_view','activity'].includes(e.type)).sort((a,b)=>a.session_id.localeCompare(b.session_id)||a.seq-b.seq).map(e=>{const s=sessions.find(s=>s.id===e.session_id);return [e.session_id,label(e),e.at,e.seq,s.task,s.version];})];download('festpay-process-log.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');};
  $('raw').onclick=()=>download('festpay-events.json',JSON.stringify({example:sample,sessions:sessions.filter(s=>filtered.some(e=>e.session_id===s.id)),events:filtered},null,2),'application/json');
  $('task').onchange=render;$('version').onchange=render;$('screen').onchange=contexts;$('context').onchange=heat;$('reload').onclick=load;
  $('sample').onclick=()=>{
    sample=true;sessions=[];events=[];
    const paths=[['index.html','fest.html','guthaben.html','bezahlen.html','wallet_topped_up','guthaben.html'],['index.html','fest.html','speisekarte.html','bezahlen.html','tokens_purchased','marken.html','token_redeemed'],['index.html','fest.html','guthaben.html','fest.html','index.html']];
    paths.forEach((path,i)=>{const id='beispiel-'+(i+1),started=Date.now()-3600000;sessions.push({id,task:i===1?'w2':'w1',version:'BEISPIEL · v2',started_at:new Date(started).toISOString()});let seq=0;path.forEach((step,j)=>{const common={session_id:id,at:new Date(started+j*7000).toISOString(),received_at:new Date(started+j*7000).toISOString(),elapsed:j*7000};const props={aw:390,dh:844,ui_state:'main',map_scale:1.6};events.push({...common,id:id+'-'+(++seq),seq,type:step.endsWith('.html')?'page_view':'activity',screen:step.endsWith('.html')?step:'bezahlen.html',props:{...props,activity:step}});for(let k=0;k<2;k++)events.push({...common,id:id+'-'+(++seq),seq,type:'click',screen:step.endsWith('.html')?step:'bezahlen.html',props:{...props,x:.2+(j%3)*.24+k*.03,y:.18+(j%4)*.2}});});});show();
  };
  if(client){const {data}=await client.auth.getSession();if(data.session)load();}
})();
