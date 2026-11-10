const {test}=require('node:test');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const {randomUUID,webcrypto}=require('node:crypto');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function endpoint(){
 let handler;const writes=[];
 const ctx={crypto:webcrypto,TextEncoder,Response,fetch:async(url,init)=>{writes.push(JSON.parse(init.body));return new Response('',{status:201})},
  Deno:{env:{get:()=> 'not-a-real-key'},serve:fn=>{handler=fn}}};
 vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/test-events/index.ts'),'utf8')),ctx);
 return {writes,call:body=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:'https://singlesilas-web.github.io'},body:JSON.stringify(body)}))};
}
test('v7 start requires trial UUID v4 and linkage consent; retries keep the trial and create distinct attempts',async()=>{
 const api=endpoint(),trial=randomUUID();
 const body={action:'start',task:'gast_guthaben',version:'festpay-2026-11-10-v7-linked',consent_version:'2026-11-10-v3-linked',trial_id:trial.toUpperCase()};
 for(const invalid of [{trial_id:null},{trial_id:'001'},{trial_id:42},{consent_version:'2026-11-02-v2'}])assert.equal((await api.call({...body,...invalid})).status,400);
 assert.equal(api.writes.length,0);
 const first=await (await api.call(body)).json(),second=await (await api.call(body)).json();
 assert.notEqual(first.id,second.id);assert.equal(first.trial_id,trial);assert.equal(second.trial_id,trial);
 assert.equal(api.writes[0].trial_id,trial);assert.ok(api.writes[0].token_hash);assert.equal(api.writes[0].token,undefined);
});
test('old consented clients remain unlinked even if they send a trial ID',async()=>{
 const api=endpoint();const result=await api.call({action:'start',task:'gast_guthaben',version:'festpay-2026-11-09-v6-tasks',consent_version:'2026-11-02-v2',trial_id:randomUUID()});
 assert.equal(result.status,200);assert.equal(api.writes[0].trial_id,undefined);
});
