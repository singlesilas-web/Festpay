/* Versioned, consent-gated event log. No input contents, DOM text or raw URLs. */
(() => {
  const C=window.APP_CONFIG, KEY='festpay_test_session_v3', OFF='festpay_exclude_device';
  const screen=location.pathname.split('/').pop()||'index.html';
  let session, currentRequest=null, stopped=false, pill, scrollTimer, finishing=false, lastZoom=1, clicks=[], returnButton;
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  }
  session = readSession();
  if(session && (Date.now()-session.started>4*60*60*1000 || sessionStorage.getItem('festpay_ended'))){session=null;sessionStorage.removeItem(KEY);sessionStorage.removeItem('festpay_ended');}
  const ready=()=>/^https:\/\//.test(C.ANALYTICS_URL)&&!!C.ANALYTICS_KEY;
  const analystSignedIn=()=>{try{return !!JSON.parse(localStorage.getItem('festpay_analyst_auth'))?.access_token;}catch{return false;}};
  const active=()=>session&&!stopped&&localStorage.getItem(OFF)!=='1'&&!analystSignedIn();
  const persist = () => sessionStorage.setItem(KEY, JSON.stringify(session));
  function dimensions(){const a=document.querySelector('.app')?.getBoundingClientRect();const state=document.querySelector('.validate-overlay')?'redemption':document.querySelector('.drawer.open')?'drawer':document.querySelector('.search-panel.open')?'search':document.querySelector('.scan-confirm')?'scan_confirmation':document.querySelector('.topup-guide-open')?'topup_success':document.querySelector('#tabHelfer:not(.hidden)')?'helpers':'main';return {ui_state:state,map_scale:Number(document.getElementById('map')?.dataset.scale||1),vw:innerWidth,vh:innerHeight,aw:Math.round(a?.width||innerWidth),dh:Math.max(document.documentElement.scrollHeight,innerHeight),scroll:Math.round(scrollY),browser_scale:window.visualViewport?.scale||1};}
  function event(type,props={}){
    if (!active()) return;
    const saved = readSession();
    if (!saved || saved.id !== session.id) return;
    session = saved;
    const elapsed = Date.now() - session.started;
    if (elapsed < 0 || elapsed > 14400000 || session.seq >= 5000) return;
    if (type !== 'session_end' && (session.ending || session.seq >= 4999)) return;
    const e = {id:crypto.randomUUID(),seq:++session.seq,type,screen,at:new Date().toISOString(),elapsed,props:{...dimensions(),...props}};
    (session.pending ||= []).push(e);
    persist();
    if (session.pending.length >= 15) flush();
  }
  async function send(body,keepalive=false){
    let authorization;try{authorization=JSON.parse(localStorage.getItem('festpay_analyst_auth'))?.access_token;}catch{}
    const res=await fetch(C.ANALYTICS_URL+'/functions/v1/test-events',{method:'POST',headers:{'Content-Type':'application/json',apikey:C.ANALYTICS_KEY,...(authorization?{Authorization:'Bearer '+authorization}:{})},body:JSON.stringify(body),keepalive});
    if(!res.ok)throw Error('telemetry '+res.status);return res.json();
  }
  async function flush(keepalive = false) {
    if (currentRequest) return currentRequest;
    if (!active() || !ready()) return;
    const saved = readSession();
    if (!saved || saved.id !== session.id || !saved.pending?.length) return;
    const batch = saved.pending.slice(0, 25);
    currentRequest = (async () => {
      try {
        await send({action:'events',session_id:saved.id,token:saved.token,events:batch},keepalive);
        const latest = readSession();
        if (latest?.id === saved.id) {
          const sent = new Set(batch.map(event => event.id));
          latest.pending = latest.pending.filter(event => !sent.has(event.id));
          sessionStorage.setItem(KEY,JSON.stringify(latest));
        }
        if (pill) pill.querySelector('span').textContent = 'Test läuft · Daten übertragen';
      } catch {
        if (pill) pill.querySelector('span').textContent = 'Test läuft · Übertragung ausstehend';
      } finally {
        currentRequest = null;
      }
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
  function resetPreview(){stopped=true;session=null;sessionStorage.removeItem(KEY);localStorage.setItem(OFF,'1');}
  async function finish(reason){
    if (finishing) return;
    finishing = true;
    const button = pill.querySelector('button');
    button.disabled = true;
    if (returnButton) returnButton.disabled = true;
    if (!readSession()?.ending) {
      event('session_end', {reason});
      session = readSession();
      if (session) { session.ending = true; persist(); }
    }
    await currentRequest;
    let remaining = readSession()?.pending?.length || 0;
    while (remaining && active()) {
      await flush();
      const next = readSession()?.pending?.length || 0;
      if (next >= remaining) break;
      remaining = next;
    }
    if (remaining) {
      finishing = false;
      button.disabled = false;
      if (returnButton) returnButton.disabled = false;
      alert('Noch nicht alle Daten übertragen. Bitte erneut versuchen, sobald du online bist.');
      return;
    }
    sessionStorage.setItem('festpay_ended','1');resetPreview();location.replace('index.html?mode=choose');
  }
  function showPill(){
    pill=document.createElement('div');pill.className='test-pill';pill.dataset.noTrack='1';
    pill.innerHTML=active()?'<span>Test läuft</span><button>Zur Testauswahl</button>':'<span>Vorschau · keine Aufzeichnung</span><button>Testauswahl</button><a href="admin.html">Auswertung</a>';
    pill.querySelector('button').onclick=()=>active()?finish('return_to_task_selection'):(location.href='index.html?mode=choose');document.body.append(pill);const study=document.createElement('button');study.dataset.study='1';study.textContent='IDs / Fragebögen';study.onclick=()=>{if(active()&&!session.participant_id){alert('Dieser ältere Versuch hat noch keine gemeinsame Zuordnung. Beende ihn und starte einen neuen Versuch mit Testpersonen-ID.');return;}FestPayStudy.show(session?.participant_id||FestPayStudy.current());};pill.append(study);
    if (active()) {
      returnButton = document.createElement('button');
      returnButton.className = 'test-return';
      returnButton.dataset.noTrack = '1';
      returnButton.textContent = '← Zur Testauswahl';
      returnButton.setAttribute('aria-label', 'Testversuch beenden und zur Testauswahl zurückkehren');
      returnButton.onclick = () => finish('return_to_task_selection');
      document.body.append(returnButton);
      document.body.classList.add('test-running');
    }
  }
  function gate(){
    const g=document.createElement('section');g.className='test-gate';g.dataset.noTrack='1';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-label','FestPay Nutzertest');
    g.innerHTML='<div class="test-card"><div class="eyebrow">FESTPAY / NUTZERTEST</div><h1>Welche Aufgabe testest du?</h1><p>Teste unseren Klickdummy. Alle Beträge und Zahlungen sind simuliert.</p><label class="study-field">Testpersonen-ID<input id="studyParticipant" aria-label="Testpersonen-ID" required></label><button type="button" class="secondary" id="newParticipant">Neue Testperson</button><button type="button" class="secondary" id="studyLinks">IDs und Links zu den Fragebögen</button><select aria-label="Testaufgabe"></select><p id="taskInstructions" class="task-instructions"></p><p>Mit deiner Zustimmung erfassen wir Klickpositionen, Seitenwechsel, Scrollen, Zoom, Zeitpunkte und erfolgreiche Schritte unter einer zufälligen Sitzungs-ID. Die Testpersonen-ID und die Versuchs-ID verknüpfen diese Aufzeichnung mit Fragebogen und Beobachtungsbogen, einschließlich freiwilliger Altersangaben. Keine Eingabetexte, Passwörter oder echten Zahlungsdaten. Aktuell erfolgt keine automatische Löschung. Die Projektverantwortlichen verwalten die Aufbewahrung und Löschung der Testdaten.</p><label><input type="checkbox">Ich möchte am aufgezeichneten Nutzertest teilnehmen.</label><p class="test-alert" id="testStatus"></p><button id="startTest" disabled>Aufgabe starten</button><button class="secondary" id="previewTest">Admin / Vorschau ohne Aufzeichnung</button><a href="admin.html">Zur geschützten Auswertung</a></div>';
    const personInput=g.querySelector('#studyParticipant');personInput.value=FestPayStudy.current();
    g.querySelector('#newParticipant').onclick=()=>{personInput.value=FestPayStudy.choose(crypto.randomUUID());};
    g.querySelector('#studyLinks').onclick=()=>{if(FestPayStudy.valid(personInput.value.trim())){FestPayStudy.choose(personInput.value.trim());FestPayStudy.show();}};
    const taskSelect = g.querySelector('select');
    taskSelect.replaceChildren(...window.FestPayTasks.map(([id,role,title], index) => new Option((index+1)+'. '+role+' · '+title, id)));
    const instructions = () => { g.querySelector('#taskInstructions').textContent = window.FestPayTasks.find(task => task[0] === taskSelect.value)[3]; };
    taskSelect.onchange = instructions;
    instructions();
    document.body.append(g);g.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...g.querySelectorAll('select,input,button:not(:disabled),a')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});const btn=g.querySelector('#startTest'),status=g.querySelector('#testStatus');
    status.textContent=ready()?'Die Aufzeichnung beginnt erst nach dem Start.':'Testaufzeichnung noch nicht freigeschaltet. Die Supabase-Anbindung wird vorbereitet. Nutze bis dahin die Vorschau.';
    g.querySelector('input[type=checkbox]').onchange=e=>btn.disabled=!e.target.checked||!ready();
    g.querySelector('#previewTest').onclick=()=>{resetPreview();g.remove();showPill();};
    btn.onclick=async()=>{
      if(analystSignedIn()){status.textContent='Auf diesem Gerät ist ein Analyse-Account angemeldet. Bitte zuerst in der Auswertung abmelden oder die Vorschau nutzen.';return;}
      btn.disabled=true;status.textContent='Testsitzung wird angelegt …';
      try{
        const participant=personInput.value.trim().toLowerCase();
        if(!FestPayStudy.valid(participant)){status.textContent='Bitte eine gültige Testpersonen-ID eingeben oder Neue Testperson wählen.';btn.disabled=false;return;}
        FestPayStudy.choose(participant);
        const task=g.querySelector('select').value;
        const data=await send({action:'start',task,participant_id:participant,version:C.BUILD_VERSION,consent_version:'2026-11-10-linked-v1'});
        localStorage.removeItem('festpay_demo_v1');localStorage.removeItem('festpay_zahlart');
        for(const key of Object.keys(localStorage))if(key.startsWith('festpay_hidden_'))localStorage.removeItem(key);
        sessionStorage.removeItem('checkout');sessionStorage.removeItem('topupSuccess');
        if (API.istDemo()) {
          const role = window.FestPayTasks.find(entry => entry[0] === task)?.[1].toLowerCase();
          API.setDemoRolle(role || 'gast');
          if (role === 'helfer') {
            // Starting condition, prepared before this attempt starts logging.
            await API.aufladen('demo-sommerfest', 20);
          }
        }
        sessionStorage.removeItem('festpay_ended');
        localStorage.removeItem(OFF);session={id:data.id,token:data.token,started:Date.now(),seq:0,task,participant_id:participant};stopped=false;persist();FestPayStudy.remember(data.id,task,participant);g.remove();
        // Restart to render a clean demo state for every participant.
        location.replace('index.html');
      }catch{status.textContent='Testsitzung konnte nicht gestartet werden. Bitte erneut versuchen.';btn.disabled=false;}
    };
    g.querySelector('select').focus();
  }
  window.TestLog={event,returnToSelection:()=>active()?finish('return_to_task_selection'):(location.href='index.html?mode=choose')};
  // Semantic outcomes are emitted only after successful business actions.
  const saveFestival = API.festSpeichern;
  API.festSpeichern = async function(festival) {
    const existingId = festival.id;
    const previous = existingId && active() ? await API.getFest(existingId) : null;
    const knownHelpers = new Set((previous?.helfer || []).map(helper => helper.email.trim().toLowerCase()));
    const result = await saveFestival.call(this, festival);
    if (result && !result.error) {
      event('activity', {activity: existingId ? 'festival_updated' : 'festival_created'});
      if ((festival.helfer || []).some(helper => !knownHelpers.has(helper.email.trim().toLowerCase()))) {
        event('activity', {activity: 'festival_helper_saved'});
      }
    }
    else if (result?.error) event('activity', {activity: 'festival_save_failed'});
    return result;
  };
  for(const [method,activity] of Object.entries({aufladen:'wallet_topped_up',markenKaufen:'tokens_purchased',markeEntwerten:'token_redeemed',abbuchen:'wallet_charged'})){
    const original=API[method];API[method]=async function(...args){const result=await original(...args);if (result && !result.error) event('activity', {activity});
      else if (result?.error) event('activity', {activity: activity + '_failed'});
      return result;};
  }
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode==='preview'){resetPreview();history.replaceState(null,'',location.pathname+location.search.replace(/[?&]mode=preview/,'').replace(/^&/,'?'));}
  if(mode==='choose' && active()){showPill();finish('return_to_task_selection');}
  else if(mode==='choose'){resetPreview();gate();}
  else if(!session&&localStorage.getItem(OFF)!=='1')gate();else showPill();
  if(active())event('page_view');
  document.addEventListener('click',e=>{
    if(!active() || e.isTrusted === false || e.target.closest('[data-no-track],.test-gate,.test-pill'))return;
    const el=e.target.closest('button,a,input,select,.marke')||e.target;
    const viewport = window.visualViewport;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const x = (e.clientX - (viewport?.offsetLeft || 0)) / width;
    const y = (e.clientY - (viewport?.offsetTop || 0)) / height;
    const position = e.detail !== 0 && x >= 0 && x <= 1 && y >= 0 && y <= 1
      ? {x, y, coordinate_space: 'viewport_v1', viewport_width: Math.round(width), viewport_height: Math.round(height)}
      : {};
    const id = target(el);
    event('click', {target: id, ...position, interactive: !!el.closest('button,a,input,select,.marke')});
    const now=Date.now();clicks=clicks.filter(c=>now-c.t<1000);clicks.push({id,t:now});if(clicks.filter(c=>c.id===id).length===3)event('repeated_click',{target:id});
    const link=el.closest('a');if(link)flush(true);
  },true);
  document.addEventListener('focusin',e=>{if(e.target.matches('input,textarea,select')&&!e.target.closest('[data-no-track]'))event('field_focus',{target:target(e.target)});});
  document.addEventListener('scroll',e=>{const el=e.target===document?document.documentElement:e.target;if(el.closest?.('[data-no-track]'))return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>event('scroll',{target:el===document.documentElement?'page':target(el),depth:Math.round(((el===document.documentElement?scrollY:el.scrollTop)+(el===document.documentElement?innerHeight:el.clientHeight))/Math.max(el.scrollHeight,1)*100)}),350);},{passive:true,capture:true});
  window.visualViewport?.addEventListener('resize',()=>{const scale=visualViewport.scale;if(Math.abs(scale-lastZoom)>.04){lastZoom=scale;event('browser_zoom',{scale});}});
  document.addEventListener('visibilitychange',()=>{event(document.hidden?'page_hidden':'page_visible');if(document.hidden)flush(true);});
  window.addEventListener('pagehide',()=>{event('page_leave');flush(true);});
  window.addEventListener('pageshow',e=>{if(e.persisted){session=readSession();if(active())event('page_view');else if(returnButton)location.replace('index.html?mode=choose');}});
  window.addEventListener('storage',e=>{if((e.key===OFF&&e.newValue==='1')||(e.key==='festpay_analyst_auth'&&analystSignedIn())){resetPreview();pill?.remove();showPill();}});
  setInterval(()=>flush(),1500);
  setInterval(()=>{if(active()&&!document.hidden)event('heartbeat');},20000);
})();
