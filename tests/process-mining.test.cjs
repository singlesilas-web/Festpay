const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/js/process-mining.js'),'utf8'),context);
const {casesForGoal} = context.window.FestPayMining;

test('each scripted task maps to its observed end goal without changing historical assignments', () => {
  const assignments = {gast_guthaben:'wallet_qr_shown',gast_marken:'token_redeemed',helfer:'wallet_charged',betreiber_marken:'festival_created',betreiber_guthaben:'festival_helper_saved',w1:'wallet_topped_up'};
  for (const [task,goal] of Object.entries(assignments)) {
    const cases = casesForGoal([{id:'one',task,version:'festpay-2026-11-09-v6-tasks',started_at:new Date().toISOString()}],[],goal);
    assert.equal(cases.length,1);
    assert.equal(cases[0].assigned,true);
    assert.equal(cases[0].completed,false);
  }
});

test('ending a test is distinct from reaching a goal and is retained for full exports', () => {
  const session = {id:'one',task:'betreiber_marken',version:'festpay-2026-11-09-v6-tasks'};
  const end = {session_id:'one',seq:2,type:'session_end',screen:'betreiber.html',elapsed:10000,props:{reason:'return_to_task_selection'}};
  const withoutGoal = casesForGoal([session],[end],'festival_created')[0];
  assert.equal(withoutGoal.completed,false);
  assert.equal(withoutGoal.status,'Beendet ohne Ziel');
  const goal = {session_id:'one',seq:1,type:'activity',screen:'betreiber.html',elapsed:5000,props:{activity:'festival_created'}};
  const completed = casesForGoal([session],[goal,end],'festival_created')[0];
  assert.equal(completed.duration,5000);
  assert.equal(completed.trace.length,1);
  assert.equal(completed.fullTrace.length,2);
  assert.equal(completed.endReason,'return_to_task_selection');
});

test('current run accepts only the five scripted tasks and exact current version',()=>{
 const current='festpay-2026-11-10-v9-clean';
 const tasks=['gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben'];
 const fixtures=[...tasks.map((task,i)=>({id:'current-'+i,task,version:current})),{id:'old-task',task:'explore',version:current},{id:'old-version',task:'helfer',version:'festpay-2026-11-10-v8-linked'}];
 const mining=context.window.FestPayMining;
 assert.equal(mining.currentSessions(fixtures,current).length,5);
 assert.equal(mining.currentSessions(fixtures,current,'helfer').length,1);
 assert.equal(mining.currentSessions([],current).length,0);
 assert.equal(mining.goalForTask('gast_guthaben'),'wallet_qr_shown');
 assert.equal(mining.goalForTask('festival_updated'),undefined);
});

test('discovery labels hotbar clicks and recognizes the new payment screen without changing goals', () => {
  const {eventScreen, label, step} = context.window.FestPayMining;
  const events = [
    {type:'page_view',screen:'index.html'},
    {type:'click',screen:'index.html',props:{target:'nav-bezahlen'}},
    {type:'page_view',screen:'index.html',props:{source:'screen:zahlen.html'}},
    {type:'click',screen:'index.html',props:{source:'screen:zahlen.html',target:'zahlen-fest-wechseln'}},
    {type:'activity',screen:'index.html',props:{source:'screen:zahlen.html',activity:'wallet_qr_shown'}}
  ].map((event, i) => ({...event, session_id:'one', seq:i}));
  const [result] = casesForGoal([{id:'one',task:'gast_guthaben'}],events,'wallet_qr_shown');
  assert.equal(result.route,'happy');
  assert.equal(result.completed,true);
  assert.equal(eventScreen(events[3]),'zahlen.html');
  assert.equal(label(step(events[1])),'Hotbar: Bezahlen');
  assert.equal(label(step(events[3])),'Fest für Guthaben-QR wechseln');
  assert.equal(eventScreen({screen:'demnaechst.html'}),'demnaechst.html');
  assert.equal(eventScreen({screen:'index.html',props:{source:'screen:unexpected.html'}}),'index.html');
});

test('festival selection, zone editing and cash register clicks appear as distinct process steps', () => {
  const {label, step} = context.window.FestPayMining;
  const trail = [
    [{type:'activity',props:{activity:'map_festival_selected'}}, 'Festfläche antippen'],
    [{type:'click',props:{target:'karte-guthaben'}}, 'Guthaben direkt von der Karte aufladen'],
    [{type:'click',props:{target:'zone-rectangle'}}, 'Zeichenart: Rechteck aufziehen'],
    [{type:'activity',props:{activity:'zone_invalid'}}, 'Festzone unvollständig'],
    [{type:'activity',props:{activity:'zone_point_moved'}}, 'Eckpunkt verschoben'],
    [{type:'activity',props:{activity:'zone_accepted'}}, 'Festzone übernommen'],
    [{type:'click',props:{target:'helper-product-add'}}, 'Artikel hinzufügen (+)'],
    [{type:'click',props:{target:'helper-product-remove'}}, 'Artikel entfernen (−)']
  ];
  for (const [event, expected] of trail) assert.equal(label(step(event)), expected);
});

const {representativeCases}=context.window.FestPayMining;
function attempt(id,person='person',task='gast_guthaben',version='v2',number=1){return {id,participant_id:person,task,version,attempt_number:number};}
function trail(id,events){return events.map((e,i)=>({session_id:id,seq:i+1,elapsed:(i+1)*1000,...e}));}
const activity=name=>({type:'activity',screen:'guthaben.html',props:{activity:name}});
const click=target=>({type:'click',props:{target}});
test('one representative per person, task and version, with anonymous attempts kept separate',()=>{
 const sessions=[attempt('old','p','gast_guthaben','v1'),attempt('new','p'),attempt('repeat','p'),attempt('other-task','p','helfer'),attempt('other-person','q'),attempt('anon-1',null),attempt('anon-2',null)];
 const cases=sessions.map(session=>({session,trace:[],completed:false}));
 assert.equal(representativeCases(cases).length,6);
 assert.equal(cases.length,7);
 const mixed=[{session:{id:'a',participant_id:'p',participant_code:'P001'},trace:[]},{session:{id:'b',participant_code:'P001'},trace:[]}];
 assert.equal(representativeCases(mixed).length,1);
});
test('goal success wins over a long incomplete attempt and a later accidental restart',()=>{
 const sessions=[attempt('long'),attempt('success','person','gast_guthaben','v2',2),attempt('restart','person','gast_guthaben','v2',3)];
 const events=[...trail('long',Array.from({length:100},()=>click('#pay'))),...trail('success',[activity('wallet_qr_shown'),{type:'session_end'}]),...trail('restart',[{type:'page_view',screen:'index.html'}])];
 const raw=casesForGoal(sessions,events,'wallet_qr_shown');const [chosen]=representativeCases(raw);
 assert.equal(chosen.session.id,'success');assert.equal(chosen.selection.attemptCount,3);
 assert.equal(chosen.fullTrace.length,2);assert.equal(chosen.trace.length,1);assert.equal(raw.length,3);
});
test('task progress wins over navigation noise, repeated clicks and passive events',()=>{
 const sessions=[attempt('noise'),attempt('progress')];
 const events=[...trail('noise',[...Array.from({length:50},()=>click('menu-open')),...Array.from({length:50},()=>({type:'heartbeat'}))]),...trail('progress',[activity('wallet_topped_up')])];
 assert.equal(representativeCases(casesForGoal(sessions,events,'wallet_qr_shown'))[0].session.id,'progress');
});
test('equal progress uses a stable earlier attempt, independent of input order or duration',()=>{
 const sessions=[attempt('second','person','gast_guthaben','v2',2),attempt('first')];
 const events=[...trail('second',[{type:'page_view',screen:'index.html',elapsed:999999}]),...trail('first',[{type:'page_view',screen:'index.html'}])];
 const raw=casesForGoal(sessions,events,'wallet_qr_shown');const [chosen]=representativeCases(raw);
 assert.equal(chosen.session.id,'first');assert.equal(chosen.selection.tied,true);
 assert.equal(representativeCases([...raw].reverse())[0].session.id,'first');
});
test('route filtering cannot resurrect a discarded failed attempt of a successful person',()=>{
 const sessions=[attempt('failed'),attempt('success')];const events=trail('success',[activity('wallet_qr_shown')]);
 const cases=representativeCases(casesForGoal(sessions,events,'wallet_qr_shown'));
 assert.equal(cases.filter(c=>c.route==='open').length,0);
});
