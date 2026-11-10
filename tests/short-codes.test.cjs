const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const {stripTypeScriptTypes}=require('node:module');
const edge=stripTypeScriptTypes(fs.readFileSync('supabase/functions/test-events/index.ts','utf8'));
const pid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
function backend(attempts){let handler,saved;const ctx={crypto,TextEncoder,Request,Response,Set,Date,JSON,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},fetch:async(url,init={})=>{
 const path=url.split('/rest/v1/')[1];let rows=[];
 if(path.startsWith('study_participants?'))rows=[{id:pid,participant_code:'P007'}];
 else if(path.startsWith('analytics_sessions?'))rows=attempts;
 else if(init.method==='POST'){saved=JSON.parse(init.body);rows=null;}
 else if(saved)rows=[{participant_id:pid}];
 return new Response(rows===null?'':JSON.stringify(rows),{status:200});
 }};vm.createContext(ctx);vm.runInContext(edge,ctx);
 return {send:async(payload)=>{const r=await handler(new Request('https://test',{method:'POST',headers:{Origin:'https://singlesilas-web.github.io'},body:JSON.stringify({action:'observation',payload:{id:crypto.randomUUID(),participant_id:'p007',attempt_ids:[],linkage_consent:true,observations:{helfer:{session_id:'',result:'independent',duration_ms:2000}},...payload}})}));return {status:r.status,data:await r.json(),saved};}};
}
test('one observed task maps from short person code without manual attempt ID',async()=>{
 const b=backend([{id:sid,task:'helfer',attempt_code:'P007-A3-1',attempt_number:1}]);const r=await b.send();
 assert.equal(r.status,200);assert.equal(r.saved.participant_id,pid);assert.deepEqual(r.saved.attempt_ids,[sid]);assert.equal(r.saved.observations.helfer.session_id,sid);assert.equal(r.saved.participant_code,'P007');
});
test('repeated task requires a specific short attempt and rejects another task',async()=>{
 const rows=[{id:sid,task:'helfer',attempt_code:'P007-A3-1'},{id:crypto.randomUUID(),task:'helfer',attempt_code:'P007-A3-2'}];
 const b=backend(rows),ambiguous=await b.send();assert.equal(ambiguous.status,400);assert.equal(ambiguous.data.error,'attempt_required');assert.equal(ambiguous.saved,undefined);
 const selected=await b.send({observations:{helfer:{session_id:'p007-a3-2',result:'help'}}});assert.equal(selected.status,200);assert.equal(selected.saved.attempt_ids[0],rows[1].id);
 const wrong=await backend(rows).send({observations:{gast_guthaben:{session_id:'P007-A3-1'}}});assert.equal(wrong.status,400);
});
test('short person and attempt codes survive sharing and resolve to original UUIDs',()=>{
 const source=fs.readFileSync('dist/js/study-link.js','utf8'),values=new Map();const ctx={window:null,crypto,URL,URLSearchParams,location:{hash:'#participant=p007&attempts=p007-a3-1&tasks=helfer',href:'https://example.org/index.html',pathname:'/index.html',search:''},history:{replaceState(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);const s=ctx.FestPayStudy;
 assert.equal(s.current(),'P007');s.registerPerson(pid,'P007');s.remember(sid,'helfer',pid,'P007-A3-1',1);
 assert.equal(s.current(),pid);assert.equal(s.attempts().length,1);assert.equal(s.attempts()[0].id,sid);assert.ok(s.url('umfrage').includes('participant=P007'));assert.ok(!s.url('umfrage').includes(pid));
});
