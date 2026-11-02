/* Versioned, consent-gated event log. No input contents, DOM text or raw URLs. */
(() => {
  const C=window.APP_CONFIG, KEY='festpay_test_session_v2', OFF='festpay_exclude_device';
  const screen=location.pathname.split('/').pop()||'index.html';
  let session, queue=[], inflight=[], busy=false, currentRequest=null, stopped=false, seq=0, pill, scrollTimer, lastZoom=1, clicks=[];
  try { session=JSON.parse(sessionStorage.getItem(KEY)); } catch {}
  if(session && (Date.now()-session.started>4*60*60*1000 || sessionStorage.getItem('festpay_ended'))){session=null;sessionStorage.removeItem(KEY);sessionStorage.removeItem('festpay_ended');}
  const ready=()=>/^https:\/\//.test(C.ANALYTICS_URL)&&!!C.ANALYTICS_KEY;
  const analystSignedIn=()=>{try{return !!JSON.parse(localStorage.getItem('festpay_analyst_auth'))?.access_token;}catch{return false;}};
  const active=()=>session&&!stopped&&localStorage.getItem(OFF)!=='1'&&!analystSignedIn();
  if(session)queue=session.pending||[];
  const persist=()=>{if(session){session.pending=[...inflight,...queue];sessionStorage.setItem(KEY,JSON.stringify(session));}};
  function dimensions(){const a=document.querySelector('.app')?.getBoundingClientRect();const state=document.querySelector('.validate-overlay')?'redemption':document.querySelector('.drawer.open')?'drawer':document.querySelector('.search-panel.open')?'search':'main';return {ui_state:state,map_scale:Number(document.getElementById('map')?.dataset.scale||1),vw:innerWidth,vh:innerHeight,aw:Math.round(a?.width||innerWidth),dh:Math.max(document.documentElement.scrollHeight,innerHeight),scroll:Math.round(scrollY),browser_scale:window.visualViewport?.scale||1};}
  function event(type,props={}){
    if(!active())return;
    const e={id:crypto.randomUUID(),seq:++session.seq,type,screen,at:new Date().toISOString(),elapsed:Date.now()-session.started,props:{...dimensions(),...props}};
    queue.push(e); if(queue.length>300)queue.shift(); persist();
    if(queue.length>=15)flush();
  }
  async function send(body,keepalive=false){
    let authorization;try{authorization=JSON.parse(localStorage.getItem('festpay_analyst_auth'))?.access_token;}catch{}
    const res=await fetch(C.ANALYTICS_URL+'/functions/v1/test-events',{method:'POST',headers:{'Content-Type':'application/json',apikey:C.ANALYTICS_KEY,...(authorization?{Authorization:'Bearer '+authorization}:{})},body:JSON.stringify(body),keepalive});
    if(!res.ok)throw Error('telemetry '+res.status);return res.json();
  }
  async function flush(keepalive=false){
    if(busy)return currentRequest;
    if(!active()||!queue.length||!ready())return;
    busy=true;const batch=queue.splice(0,25);inflight=batch;persist();
    currentRequest=(async()=>{
      try{await send({action:'events',session_id:session.id,token:session.token,events:batch},keepalive);if(pill)pill.querySelector('span').textContent='Test läuft · Daten übertragen';}
      catch{queue.unshift(...batch);if(pill)pill.querySelector('span').textContent='Test läuft · Übertragung ausstehend';}
      finally{inflight=[];busy=false;persist();}
    })();
    return currentRequest;
  }
  function target(el){
    const path=[];let n=el;
    for(let i=0;n&&i<5;i++,n=n.parentElement){
      if(n.dataset.track)return n.dataset.track;
      if(n.id&&!/q-|ovClock|clock/.test(n.id)){path.unshift('#'+n.id);break;}
      let index=1;for(let s=n.previousElementSibling;s;s=s.previousElementSibling)if(s.tagName===n.tagName)index++;
      path.unshift(n.tagName.toLowerCase()+':nth-of-type('+index+')');
    }
    return path.join('>');
  }
  function resetPreview(){stopped=true;queue=[];session=null;sessionStorage.removeItem(KEY);localStorage.setItem(OFF,'1');}
  async function finish(reason){
    event('session_end',{reason});
    for(let i=0;queue.length&&i<12;i++){await flush();if(queue.length&&pill?.textContent.includes('ausstehend'))break;}
    if(queue.length){alert('Noch nicht alle Daten übertragen. Bitte erneut versuchen, sobald du online bist.');return;}
    sessionStorage.setItem('festpay_ended','1');resetPreview();location.href='index.html?mode=choose';
  }
  function showPill(){
    pill=document.createElement('div');pill.className='test-pill';pill.dataset.noTrack='1';
    pill.innerHTML=active()?'<span>Test läuft</span><button>Test beenden</button>':'<span>Vorschau · keine Aufzeichnung</span><button>Testauswahl</button><a href="admin.html">Auswertung</a>';
    pill.querySelector('button').onclick=()=>active()?finish('participant_finished'):(location.href='index.html?mode=choose');document.body.append(pill);
  }
  function gate(){
    const g=document.createElement('section');g.className='test-gate';g.dataset.noTrack='1';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-label','FestPay Nutzertest');
    g.innerHTML='<div class="test-card"><div class="eyebrow">FESTPAY / NUTZERTEST</div><h1>Ein Fest. Zwei Wege zu bezahlen.</h1><p>Teste unseren Klickdummy. Alle Beträge und Zahlungen sind simuliert.</p><select aria-label="Testaufgabe"><option value="explore">Frei erkunden</option><option value="w1">W1 · Guthaben aufladen</option><option value="w2">W2 · Marke kaufen und entwerten</option></select><p>Mit deiner Zustimmung erfassen wir Klickpositionen, Seitenwechsel, Scrollen, Zoom, Zeitpunkte und erfolgreiche Schritte unter einer zufälligen Sitzungs-ID. Keine Eingabetexte, Passwörter oder echten Zahlungsdaten. Aktuell erfolgt keine automatische Löschung. Die Projektverantwortlichen verwalten die Aufbewahrung und Löschung der Testdaten.</p><label><input type="checkbox">Ich möchte am aufgezeichneten Nutzertest teilnehmen.</label><p class="test-alert" id="testStatus"></p><button id="startTest" disabled>Als Testgast starten</button><button class="secondary" id="previewTest">Admin / Vorschau ohne Aufzeichnung</button><a href="admin.html">Zur geschützten Auswertung</a></div>';
    document.body.append(g);g.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...g.querySelectorAll('select,input,button:not(:disabled),a')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});const btn=g.querySelector('#startTest'),status=g.querySelector('#testStatus');
    status.textContent=ready()?'Die Aufzeichnung beginnt erst nach dem Start.':'Testaufzeichnung noch nicht freigeschaltet. Die Supabase-Anbindung wird vorbereitet. Nutze bis dahin die Vorschau.';
    g.querySelector('input').onchange=e=>btn.disabled=!e.target.checked||!ready();
    g.querySelector('#previewTest').onclick=()=>{resetPreview();g.remove();showPill();};
    btn.onclick=async()=>{
      if(analystSignedIn()){status.textContent='Auf diesem Gerät ist ein Analyse-Account angemeldet. Bitte zuerst in der Auswertung abmelden oder die Vorschau nutzen.';return;}
      btn.disabled=true;status.textContent='Testsitzung wird angelegt …';
      try{
        const task=g.querySelector('select').value;
        const data=await send({action:'start',task,version:C.BUILD_VERSION,consent_version:'2026-11-02-v2'});
        localStorage.removeItem(OFF);session={id:data.id,token:data.token,started:Date.now(),seq:0,task};stopped=false;persist();
        localStorage.removeItem('festpay_demo_v1');localStorage.removeItem('festpay_zahlart');sessionStorage.removeItem('checkout');g.remove();
        // Restart to render a clean demo state for every participant.
        location.replace('index.html');
      }catch{status.textContent='Testsitzung konnte nicht gestartet werden. Bitte erneut versuchen.';btn.disabled=false;}
    };
    g.querySelector('select').focus();
  }
  window.TestLog={event};
  // Semantic outcomes are emitted only after successful business actions.
  for(const [method,activity] of Object.entries({aufladen:'wallet_topped_up',markenKaufen:'tokens_purchased',markeEntwerten:'token_redeemed',abbuchen:'wallet_charged',festSpeichern:'festival_created'})){
    const original=API[method];API[method]=async function(...args){const result=await original(...args);if(!result?.error)event('activity',{activity});return result;};
  }
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode==='preview'){resetPreview();history.replaceState(null,'',location.pathname+location.search.replace(/[?&]mode=preview/,'').replace(/^&/,'?'));}
  if(mode==='choose'){resetPreview();gate();}
  else if(!session&&localStorage.getItem(OFF)!=='1')gate();else showPill();
  if(active())event('page_view');
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-no-track],.test-gate,.test-pill'))return;
    const el=e.target.closest('button,a,input,select,.marke')||e.target;
    const a=document.querySelector('.app')?.getBoundingClientRect();
    const x=(e.clientX-(a?.left||0))/(a?.width||innerWidth),y=(e.clientY+scrollY)/Math.max(document.documentElement.scrollHeight,innerHeight);
    const id=target(el);event('click',{target:id,x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y)),interactive:!!el.closest('button,a,input,select,.marke')});
    const now=Date.now();clicks=clicks.filter(c=>now-c.t<1000);clicks.push({id,t:now});if(clicks.filter(c=>c.id===id).length===3)event('repeated_click',{target:id});
    const link=el.closest('a');if(link)flush(true);
  },true);
  document.addEventListener('focusin',e=>{if(e.target.matches('input,textarea,select')&&!e.target.closest('[data-no-track]'))event('field_focus',{target:target(e.target)});});
  document.addEventListener('scroll',e=>{const el=e.target===document?document.documentElement:e.target;if(el.closest?.('[data-no-track]'))return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>event('scroll',{target:el===document.documentElement?'page':target(el),depth:Math.round(((el===document.documentElement?scrollY:el.scrollTop)+(el===document.documentElement?innerHeight:el.clientHeight))/Math.max(el.scrollHeight,1)*100)}),350);},{passive:true,capture:true});
  window.visualViewport?.addEventListener('resize',()=>{const scale=visualViewport.scale;if(Math.abs(scale-lastZoom)>.04){lastZoom=scale;event('browser_zoom',{scale});}});
  document.addEventListener('visibilitychange',()=>{event(document.hidden?'page_hidden':'page_visible');if(document.hidden)flush(true);});
  window.addEventListener('pagehide',()=>{event('page_leave');flush(true);});
  window.addEventListener('storage',e=>{if((e.key===OFF&&e.newValue==='1')||(e.key==='festpay_analyst_auth'&&analystSignedIn())){resetPreview();pill?.remove();showPill();}});
  setInterval(()=>flush(),1500);
  setInterval(()=>{if(active()&&!document.hidden)event('heartbeat');},20000);
})();
