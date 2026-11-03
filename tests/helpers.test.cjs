const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function demo(){
 const values=new Map();const ctx={window:null,sb:null,APP_CONFIG:{DEMO_MODUS:true},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},Math,Number,Date};ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['demo-data.js','api.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',file),'utf8'),ctx);
 return ctx.API;
}
test('demo helper belongs to Fest A without entering an email, never automatically to B',async()=>{const api=demo();assert.equal(await api.istHelferFuer('demo-weinfest'),false);api.setDemoRolle('helfer');assert.equal(await api.istHelferFuer('demo-weinfest'),true);assert.equal(await api.istHelferFuer('demo-sommerfest'),false);api.setDemoRolle('gast');assert.equal(await api.istHelferFuer('demo-weinfest'),false);});
test('custom festival helpers match normalized email and require W1',async()=>{const api=demo();const {data:f}=await api.festSpeichern({name:'Test',w1_aktiv:true,helfer:[{name:'Test helper',email:' HELPER@EXAMPLE.ORG '}]});api.setDemoEmail('helper@example.org');assert.equal(await api.istHelferFuer(f.id),true);api.setDemoEmail('other@example.org');assert.equal(await api.istHelferFuer(f.id),false);const {data:g}=await api.festSpeichern({name:'W2 only',w1_aktiv:false,helfer:[{email:'other@example.org'}]});assert.equal(await api.istHelferFuer(g.id),false);assert.equal(await api.istHelferFuer('missing'),false);});
test('booking rejects unassigned festival and revoked membership without altering balance',async()=>{const api=demo(),user=await api.getUser();await api.aufladen('demo-weinfest',10);await api.aufladen('demo-sommerfest',10);api.setDemoRolle('helfer');assert.ok((await api.abbuchen('demo-sommerfest',user.id,3)).error);assert.equal(await api.getGuthaben('demo-sommerfest'),10);assert.equal((await api.abbuchen('demo-weinfest',user.id,3)).error,null);assert.equal(await api.getGuthaben('demo-weinfest'),7);api.setDemoRolle('gast');assert.ok((await api.abbuchen('demo-weinfest',user.id,3)).error);assert.equal(await api.getGuthaben('demo-weinfest'),7);});

test('owner can edit own festival and help, payment modes remain immutable', async()=>{
 const api=demo();api.setDemoRolle('betreiber');
 const {data:f}=await api.festSpeichern({name:'Before',w1_aktiv:true,w2_aktiv:false,helfer:[]});
 assert.equal(await api.istBetreiberFuer(f.id),true);assert.equal(await api.istHelferFuer(f.id),true);
 await api.festSpeichern({...f,name:'After',w1_aktiv:false,w2_aktiv:true});
 const changed=await api.getFest(f.id);assert.equal(changed.name,'After');assert.equal(changed.w1_aktiv,true);assert.equal(changed.w2_aktiv,false);
 api.setDemoRolle('gast');assert.ok((await api.festSpeichern({...changed,name:'Denied'})).error);assert.equal((await api.getFest(f.id)).name,'After');
});
test('festival visibility includes start, excludes end, and keeps unscheduled demos',async()=>{
 const api=demo(), f={start:'2026-11-03T10:00:00Z',ende:'2026-11-03T12:00:00Z'};
 assert.equal(api.istFestAktiv(f,Date.parse('2026-11-03T09:59:59Z')),false);
 assert.equal(api.istFestAktiv(f,Date.parse(f.start)),true);
 assert.equal(api.istFestAktiv(f,Date.parse(f.ende)),false);
 assert.equal(api.istFestAktiv({}),true);
});
