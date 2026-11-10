const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {randomUUID,webcrypto}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
function page(file,hash=''){
 const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),{url:'https://example.test/'+file+hash,runScripts:'outside-only'});
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});
 w.runtimeErrors=[];w.addEventListener('error',e=>w.runtimeErrors.push(e.message));
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.load=file=>w.eval(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'));
 w.load('js/test-identity.js');return w;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function enter(w,selector,value){const el=w.document.querySelector(selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));return el;}

test('identity is shared explicitly through links and never includes session capability tokens',t=>{
 const trial=randomUUID(),w=page('umfrage/index.html','#trial='+trial.toUpperCase());t.after(()=>{w.close();assert.deepEqual(w.runtimeErrors,[]);});
 assert.equal(w.FestPayIdentity.read(),trial);assert.equal(w.FestPayIdentity.normalize('001'),null);
 assert.equal(w.FestPayIdentity.normalize(' '+trial+' '),trial);
 assert.equal(w.FestPayIdentity.link('../index.html',trial),'../index.html#trial='+trial);
 assert.notEqual(w.FestPayIdentity.create(),trial);
});

test('observation posts shared trial and exact task attempt; retry conflicts are distinguished',async t=>{
 const trial=randomUUID(),attempt=randomUUID(),w=page('beobachtung/index.html','#trial='+trial+'&attempt='+attempt+'&task=gast_guthaben');t.after(()=>{w.close();assert.deepEqual(w.runtimeErrors,[]);});
 let requests=[],conflict=true;
 w.fetch=async(_,init)=>{requests.push(JSON.parse(init.body));return conflict?{ok:false,status:409,json:async()=>({code:'23505',message:'duplicate key value violates unique constraint "festpay_observation_attempts_pkey"'})}:{ok:true,status:201};};
 w.load('js/test-tasks.js');w.load('beobachtung/observation.js');
 assert.equal(w.document.querySelector('[name=trial_id]').value,trial);
 assert.ok(w.document.querySelector('#appLink').href.endsWith('#trial='+trial));
 enter(w,'[name=participant_code]','P001');enter(w,'[name=age]','65');
 assert.equal(w.document.querySelector('.observation-task [data-attempt]').value,attempt);
 w.document.querySelector('[data-result=independent]').click();
 await w.document.querySelector('form').onsubmit({preventDefault(){}});
 assert.equal(w.document.querySelector('#success').hidden,true);
 assert.equal(requests[0].trial_id,trial);assert.equal(requests[0].observations.gast_guthaben.attempt_id,attempt);
 conflict=false;
 await w.document.querySelector('form').onsubmit({preventDefault(){}});
 assert.equal(w.document.querySelector('#success').hidden,false);
 assert.equal(requests[1].id,requests[0].id);
 assert.equal(w.sessionStorage.getItem('festpay-observation-v1'),null);
});

test('survey retains trial and age through all steps; unique trial conflict never reports success',async t=>{
 const trial=randomUUID(),w=page('umfrage/index.html','#trial='+trial);t.after(()=>{w.close();assert.deepEqual(w.runtimeErrors,[]);});
 let payload;w.fetch=async(_,init)=>{payload=JSON.parse(init.body);return {ok:false,status:409,json:async()=>({code:'23505',message:'duplicate key value violates unique constraint "festpay_survey_trial"'})};};
 w.load('umfrage/survey.js');const d=w.document;
 enter(w,'[name=age]','65');
 const check=selector=>{const el=d.querySelector(selector);el.checked=true;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 check('[name=real_roles][value=guest]');check('[name=legacy_payment_satisfaction][value="3"]');check('[name=payment_preference][value=digital]');
 d.querySelector('#next').click();d.querySelector('#all-done').click();d.querySelector('#next').click();
 for(const name of ['ease','navigation','design','enjoyment','payment_clarity','balance_clarity'])check(`[name=${name}][value="4"]`);
 d.querySelector('#next').click();for(const name of ['guest_usefulness','organizer_usefulness','usefulness'])check(`[name=${name}][value="4"]`);
 check('#consent');d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
 assert.equal(payload.trial_id,trial);assert.equal(payload.age,65);assert.equal(d.querySelector('#success').hidden,true);
 // The exact same submission primary key is the sole idempotent retry acknowledgement.
 w.fetch=async()=>({ok:false,status:409,json:async()=>({code:'23505',message:'duplicate key value violates unique constraint "festpay_survey_responses_pkey"'})});
 d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();assert.equal(d.querySelector('#success').hidden,false);
});

test('admin filters by linked age and exports one row per attempt',async t=>{
 const w=page('admin.html');t.after(()=>{w.close();assert.deepEqual(w.runtimeErrors,[]);});
 const trial=randomUUID(),id=randomUUID(),started_at=new Date().toISOString();
 const data={analytics_admins:[{user_id:randomUUID()}],analytics_sessions:[{id,trial_id:trial,task:'gast_guthaben',version:'festpay-2026-11-10-v7-linked',started_at}],
  analytics_events:[{id:randomUUID(),session_id:id,seq:1,type:'activity',screen:'guthaben.html',at:started_at,received_at:started_at,elapsed:40000,props:{activity:'wallet_qr_shown'}}],
  festpay_research_attempts:[{id,trial_id:trial,age:65,age_group:'50–80',age_conflict:false,linkage:'complete',survey_id:randomUUID(),observation_id:randomUUID(),observation:{result:'independent',duration_ms:42000},survey:{task_guest_balance:'done'}}]};
 const query=table=>({select(){return this},eq(){return this},order(){return this},range(){return this},then(resolve){return Promise.resolve({data:data[table],error:null}).then(resolve)}});
 w.supabase={createClient:()=>({from:query,auth:{getSession:async()=>({data:{session:{}}})}})};
 let blob;w.Blob=Blob;w.URL.createObjectURL=b=>{blob=b;return 'blob:example'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 for(const script of ['js/config.js','js/test-tasks.js','js/process-mining.js','js/admin.js'])w.load(script);
 await settle();await settle();
 const d=w.document;
 enter(w,'#task','gast_guthaben').dispatchEvent(new w.Event('change'));
 enter(w,'#ageGroup','50–80').dispatchEvent(new w.Event('change'));
 assert.ok(d.querySelector('#sessions').textContent.includes('65'));
 d.querySelector('#researchCsv').click();const csv=await blob.text();assert.equal(csv.split('\r\n').length,2);assert.ok(csv.includes(trial));assert.ok(csv.includes('40000'));assert.ok(csv.includes('42000'));
 enter(w,'#ageGroup','20–30').dispatchEvent(new w.Event('change'));assert.ok(d.querySelector('#sessions').textContent.includes('keine Fälle'));
});
