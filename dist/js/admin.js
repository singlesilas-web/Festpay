(async()=>{
  localStorage.setItem('festpay_exclude_device','1');sessionStorage.removeItem('festpay_test_session_v3');
  const $=id=>document.getElementById(id),C=APP_CONFIG;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {goals, label, step, casesForGoal, median, goalForTask, currentSessions} = FestPayMining;
  let client,sessions=[],events=[],selected=[],linked=[];
  const configured=/^https:\/\//.test(C.ANALYTICS_URL)&&!!C.ANALYTICS_KEY;
  if(configured&&window.supabase)client=supabase.createClient(C.ANALYTICS_URL,C.ANALYTICS_KEY,{auth:{storageKey:'festpay_analyst_auth'}});
  $('status').textContent=configured?'Mit eurem freigegebenen Analyse-Account anmelden.':'Supabase ist noch nicht eingerichtet.';
  $('login').querySelector('button').disabled=!client;$('register').disabled=!client;
  $('register').onclick=async()=>{if(!$('login').querySelector('form').reportValidity())return;const {error}=await client.auth.signUp({email:$('email').value,password:$('password').value});$('password').value='';$('status').textContent=error?'Registrierung fehlgeschlagen. Bitte gültige E-Mail und ein starkes Passwort mit mindestens 8 Zeichen verwenden.':'Falls eine neue Registrierung möglich war, wurde eine Bestätigungsmail versandt. Bestätige die E-Mail und melde dich anschließend hier an. Der Account benötigt zusätzlich eine Admin-Freigabe durch die Projektverantwortlichen.';};
  $('login').querySelector('form').onsubmit=async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email:$('email').value,password:$('password').value});$('password').value='';if(error){$('status').textContent='Anmeldung fehlgeschlagen.';return;}await load();};
  $('logout').onclick=async()=>{await client.auth.signOut();location.reload();};
  async function all(table,columns){let rows=[];for(let offset=0;;offset+=1000){let query=client.from(table).select(columns);if(table==='analytics_sessions')query=query.eq('excluded',false);if(['analytics_sessions','study_attempt_analysis'].includes(table))query=query.eq('version',C.BUILD_VERSION).in('task',window.FestPayTasks.map(t=>t[0]));if(table==='analytics_events'){if(!sessions.length)return [];query=query.in('session_id',sessions.map(s=>s.id));}const {data,error}=await query.order(['analytics_sessions','study_attempt_analysis'].includes(table)?'started_at':['festpay_survey_responses','festpay_observations'].includes(table)?'created_at':'received_at',{ascending:true}).order(table==='study_attempt_analysis'?'attempt_id':'id',{ascending:true}).range(offset,offset+999);if(error)throw error;rows.push(...data);if(data.length<1000)return rows;}}
  async function load(){try{const {data,error}=await client.from('analytics_admins').select('user_id');if(error||!data.length){$('status').textContent='Dieser Account hat keine Analysefreigabe.';$('logout').hidden=false;return;}sessions=await all('analytics_sessions','id,participant_id,task,version,started_at');events=await all('analytics_events','id,session_id,seq,type,screen,at,received_at,elapsed,props');linked=await all('study_attempt_analysis','*');show();$('logout').hidden=false;}catch{$('status').textContent='Daten konnten nicht geladen werden. Verbindung und Zugriffsrechte prüfen.';}}
  const routeNames = {happy:'Happy Path', other:'Anderer erfolgreicher Weg', open:'Ohne Zielerfolg'};
  const taskNames=Object.fromEntries(window.FestPayTasks.map(([id,role,title])=>[id,role+' · '+title]));
  const duration = ms => ms == null ? '—' : (ms < 60000 ? Math.round(ms / 1000) + ' s' : Math.floor(ms / 60000) + ' min ' + Math.floor(ms % 60000 / 1000) + ' s');
  function options(id, values, empty = '') {
    const select = $(id);
    const previous = select.value;
    select.replaceChildren(...values.map(([key, title]) => new Option(title, key)));
    if (!values.length) select.add(new Option(empty, ''));
    if (values.some(([key]) => key === previous)) select.value = previous;
  }
  function show() {
    $('login').hidden = true;
    $('dashboard').hidden = false;
    $('reload').hidden = false;
    $('notice').textContent = 'Aktuelle Testreihe · Fünf Aufgaben';
    options('task',window.FestPayTasks.map(([id,role,title],i)=>[id,(i+1)+'. '+role+' · '+title]));
    render();
  }
  function linkedSelection(){
    const task=$('task').value;
    return linked.filter(r=>r.version===C.BUILD_VERSION&&r.task===task);
  }
  function renderLinked(){
    const rows=linkedSelection();
    $('linkedRows').innerHTML=rows.map(r=>'<tr><td>'+esc(r.participant_id||'—')+'</td><td>'+esc(r.attempt_id)+'</td><td>'+esc(taskNames[r.task]||r.task)+'</td><td>'+esc(r.age_conflict?'Widersprüchlich':r.age??'—')+'</td><td>'+esc(r.observation_result||'—')+'</td><td>'+duration(r.goal_elapsed_ms)+'</td><td>'+esc(r.linkage_status)+' · '+r.survey_count+' Fragebögen / '+r.observation_count+' Beobachtungen</td></tr>').join('')||'<tr><td colspan="7">Noch keine passenden Versuche.</td></tr>';
    $('linkSummary').textContent=rows.length+' Versuche · '+new Set(rows.map(r=>r.participant_id).filter(Boolean)).size+' Testpersonen · '+rows.filter(r=>r.linkage_status==='all_three_linked').length+' vollständig verknüpft · '+rows.filter(r=>r.age_conflict).length+' mit widersprüchlichem Alter.';
  }
  $('linkedCsv').onclick=()=>{
    const columns=['participant_id','attempt_id','task','version','started_at','age','age_group','age_conflict','linkage_status','survey_ids','observation_ids','survey_count','observation_count','selected_survey_id','selected_observation_id','survey_task_result','survey_reported_task_result','survey_task_attempt_count','survey_helper_result','observation_result','observation_duration_ms','goal_elapsed_ms','end_elapsed_ms','last_elapsed_ms','clicks','recorded_errors','repeated_clicks','mining_outcome','survey_ease','survey_navigation'];
    const quote=value=>'"'+String(Array.isArray(value)?value.join('|'):value??'').replace(/"/g,'""')+'"';
    download('festpay-linked-study.csv','\uFEFF'+[columns,...linkedSelection().map(row=>columns.map(k=>row[k]))].map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  function variants(cases) {
    const groups = new Map();
    for (const c of cases) {
      if (!groups.has(c.variant)) groups.set(c.variant, {path:c.path, route:c.route, cases:[]});
      groups.get(c.variant).cases.push(c);
    }
    return [...groups].sort((a,b) => b[1].cases.length - a[1].cases.length);
  }
  const pathText = path => path.map(label).join(' → ') || 'Keine Schritte erfasst';
  const metric = (value, name) => '<div class="metric"><b>' + esc(value) + '</b><span>' + esc(name) + '</span></div>';
  function render() {
    const goal=goalForTask($('task').value),route=$('route').value;
    $('goalDescription').textContent='Gemessener Zielschritt: '+label(goal);
    renderLinked();
    const cases = casesForGoal(currentSessions(sessions,C.BUILD_VERSION,$('task').value), events, goal);
    const filtered = cases.filter(c => route === 'all' || route === c.route);
    const groups = variants(filtered);
    options('variant', [['all','Alle Varianten'], ...groups.map(([key,v],i) => [key, 'Weg ' + (i+1) + ' · ' + v.cases.length + ' Fälle · ' + routeNames[v.route]])]);
    selected = filtered.filter(c => $('variant').value === 'all' || c.variant === $('variant').value);
    const completed = selected.filter(c => c.completed);
    const assigned = selected.filter(c => c.assigned);
    const reached = assigned.filter(c => c.completed);
    $('metrics').innerHTML = metric(completed.length,'Zielschritt erreicht')
      + metric(assigned.length ? reached.length + ' / ' + assigned.length : '—','Zielschritt erreicht / Versuche')
      + metric(duration(median(completed.map(c => c.duration))),'Median bis Zielschritt')
      + metric(median(completed.map(c => c.clicks)) ?? '—','Median Klicks bis Ziel');
    $('sessions').innerHTML = selected.map(c =>
      '<tr><td>' + esc(c.session.id.slice(0,12)) + '</td><td>' + esc(taskNames[c.session.task] || c.session.task) +
      '</td><td>' + esc(c.status) + (c.endReason ? ' · Versuch beendet' : '') + '</td><td>' + c.clicks + '</td><td>' + duration(c.duration) +
      '</td><td><details><summary>' + routeNames[c.route] + '</summary><p>' + esc(pathText(c.path)) + '</p></details></td></tr>'
    ).join('') || '<tr><td colspan="6">Für dieses Endziel und diese Filter liegen noch keine Fälle vor.</td></tr>';
    const visibleGroups = variants(selected);
    $('variants').innerHTML = visibleGroups.map(([,v]) => {
      const completed = v.cases.filter(c => c.completed);
      return '<div class="variant"><b>' + v.cases.length + '× · ' + routeNames[v.route] + '</b><p>' + esc(pathText(v.path)) +
        '</p><small>Median bis Ziel ' + duration(median(completed.map(c => c.duration))) + ' · ' +
        (median(completed.map(c => c.clicks)) ?? '—') + ' Klicks</small></div>';
    }).join('');
    drawGraph(visibleGroups);
    const clicks = heatClicks();
    options('screen', [...new Set(clicks.map(e => e.screen))].map(screen => [screen,label(screen)]), 'Keine Klickpositionen');
    contexts();
  }
  function drawGraph(groups) {
    const layers = [];
    const edges = new Map();
    const top = groups.slice(0, 10);
    const colors = {happy:'#177653', other:'#aa4d1d', open:'#657281'};
    for (const [,variant] of top) {
      let previous;
      const count = variant.cases.length;
      const path = variant.path.length > 22 ? [...variant.path.slice(0, 12), '…', ...variant.path.slice(-9)] : variant.path;
      ['Start', ...path, ...(variant.route === 'open' ? ['Ohne Zielerfolg'] : [])].forEach((key,depth) => {
        const layer = layers[depth] ||= new Map();
        if (!layer.has(key)) layer.set(key,{key,depth,row:layer.size,count:0});
        const node = layer.get(key);
        node.count += count;
        if (previous) {
          const id = JSON.stringify([depth,previous.key,key,variant.route]);
          if (!edges.has(id)) edges.set(id,{from:previous,to:node,route:variant.route,count:0});
          edges.get(id).count += count;
        }
        previous = node;
      });
    }
    if (!layers.length) {
      $('graph').textContent = 'Für dieses Endziel gibt es noch keine beobachteten Wege.';
      $('graphNote').textContent = '';
      return;
    }
    const rows = Math.max(...layers.map(layer => layer.size));
    const width = layers.length * 226, height = rows * 76 + 36;
    const x = node => node.depth * 226 + 10;
    const y = node => node.row * 76 + 18 + (rows - layers[node.depth].size) * 38;
    const arrows = Object.entries(colors).map(([route,color]) => '<marker id="arrow-'+route+'" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="'+color+'"/></marker>').join('');
    const links = [...edges.values()].map(e => {
      const offset = {happy:-10, other:0, open:10}[e.route];
      const x1=x(e.from)+170, x2=x(e.to)-3, y1=y(e.from)+22+offset, y2=y(e.to)+22+offset;
      const color=colors[e.route], mid=(x1+x2)/2;
      return '<path d="M'+x1+','+y1+' C'+mid+','+y1+' '+mid+','+y2+' '+x2+','+y2+
        '" fill="none" stroke="'+color+'" stroke-width="'+Math.min(8,1.5+Math.log2(e.count+1))+'" marker-end="url(#arrow-'+e.route+')" />'+
        '<text x="'+mid+'" y="'+((y1+y2)/2-6)+'" text-anchor="middle" class="edge-count" fill="'+color+'">'+e.count+'</text>';
    }).join('');
    const nodes = layers.flatMap(layer => [...layer.values()]).map(n => {
      const name = label(n.key);
      return '<g transform="translate('+x(n)+','+y(n)+')"><title>'+esc(name)+' · '+n.count+' Fälle</title>'+
        '<rect width="170" height="44" rx="8" fill="'+(goals[n.key] ? '#dff2e9' : '#e9eff6')+'"/>'+
        '<text x="10" y="18">'+esc(name.length>23 ? name.slice(0,22)+'…' : name)+'</text><text class="node-count" x="10" y="34">'+n.count+' Fälle</text></g>';
    }).join('');
    $('graph').innerHTML = '<svg role="img" aria-label="Prozessdiagramm nach beobachteten Wegen" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><defs>'+arrows+'</defs>'+links+nodes+'</svg>';
    $('graphNote').textContent = 'Diagramm: ' + top.length + ' von ' + groups.length + ' Varianten. Lange Wege sind in der Mitte gekürzt. Vollständige Varianten stehen darunter.';
  }
  function heatClicks() {
    return selected.flatMap(c => c.trace.filter(e => {
      if (e.type !== 'click') return false;
      const {x,y} = e.props || {};
      return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
    }));
  }
  function context(event) {
    const p = event.props;
    const state = p.ui_state || 'main';
    if (p.coordinate_space === 'viewport_v1') return 'Sichtbar · '+p.viewport_width+' × '+p.viewport_height+' · '+state;
    return 'Alt · gesamte Seite '+(p.aw || 360)+' × '+(p.dh || 800)+' · '+state;
  }
  function contexts() {
    const counts = new Map();
    for (const e of heatClicks().filter(e => e.screen === $('screen').value)) counts.set(context(e), (counts.get(context(e)) || 0) + 1);
    options('context', [...counts].sort((a,b) => Number(b[0].startsWith('Sichtbar')) - Number(a[0].startsWith('Sichtbar')) || b[1]-a[1]).map(([key,n]) => [key, key+' · '+n+' Klicks']), 'Keine Ansicht');
    heat();
  }
  function heat() {
    const clicks = heatClicks().filter(e => e.screen === $('screen').value && context(e) === $('context').value);
    const canvas = $('heat');
    const props = clicks[0]?.props || {};
    const viewport = props.coordinate_space === 'viewport_v1';
    const aspect = viewport ? props.viewport_height / props.viewport_width : (props.dh || 800) / (props.aw || 360);
    canvas.width = 300;
    canvas.height = Math.max(160, Math.min(1100, Math.round(300 * (aspect || 2))));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4f7fa';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = '#dce4ec';
    for (let i=1;i<10;i++) {
      ctx.beginPath();
      ctx.moveTo(i*canvas.width/10,0);
      ctx.lineTo(i*canvas.width/10,canvas.height);
      ctx.moveTo(0,i*canvas.height/10);
      ctx.lineTo(canvas.width,i*canvas.height/10);
      ctx.stroke();
    }
    for (const e of clicks) {
      const x=e.props.x*canvas.width, y=e.props.y*canvas.height;
      const g=ctx.createRadialGradient(x,y,0,x,y,20);
      g.addColorStop(0,'rgba(220,55,17,.7)');
      g.addColorStop(.5,'rgba(255,130,0,.4)');
      g.addColorStop(1,'rgba(255,220,0,0)');
      ctx.fillStyle=g;
      ctx.fillRect(x-20,y-20,40,40);
    }
    $('heatNote').textContent = clicks.length ? clicks.length+' Klicks · '+(viewport ? 'oben und unten entsprechen dem sichtbaren Bildschirm' : 'Altdaten: oben und unten entsprechen der gesamten Seite') : 'Noch keine Klickpositionen für diese Auswahl.';
  }
  function download(name,data,type) {
    const url = URL.createObjectURL(new Blob([data],{type}));
    const a = document.createElement('a');
    a.href=url;
    a.download=name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  $('csv').onclick = () => {
    const quote = value => '"'+String(value??'').replace(/"/g,'""')+'"';
    const rows = [['case_id','activity','timestamp','sequence','task','version','goal','outcome','route','elapsed_ms','end_reason']];
    for (const c of selected) for (const e of c.fullTrace) {
      const key = step(e);
      if (key) rows.push([c.session.id,label(key),e.at,e.seq,c.session.task,c.session.version,goalForTask($('task').value),c.status,c.route,e.elapsed,c.endReason]);
    }
    download('festpay-process-log.csv','\uFEFF'+rows.map(row => row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  $('raw').onclick = () => download('festpay-events.json',JSON.stringify({
    example:false, goal:goalForTask($('task').value), sessions:selected.map(c => c.session), events:selected.flatMap(c => c.fullTrace)
  },null,2),'application/json');
  for(const id of ['task','route','variant'])$(id).onchange=render;
  $('screen').onchange=contexts;
  $('context').onchange=heat;
  $('reload').onclick=load;
  if(client){const {data}=await client.auth.getSession();if(data.session)load();}
})();
