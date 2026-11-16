const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../dist/js/study-link.js'),'utf8');
function runtime(hash='',config){
 const values=new Map();const ctx={window:null,APP_CONFIG:config,crypto,URL,URLSearchParams,location:{hash,href:'https://example.org/Festpay/index.html',pathname:'/Festpay/index.html',search:''},history:{replaceState(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.FestPayStudy;
}
test('tasks and repeated attempts retain one person and distinct attempt IDs',()=>{
 const s=runtime(),person=s.current(),first=crypto.randomUUID(),second=crypto.randomUUID();
 s.remember(first,'gast_marken');s.remember(second,'gast_marken');s.remember(first,'gast_marken');
 assert.equal(s.current(),person);assert.equal(s.attempts().length,2);
 s.choose(crypto.randomUUID());assert.equal(s.attempts().length,0);assert.equal(s.attempts(person).length,2);
});
test('cross-device transfer carries exact person/task/attempt links but no session token',()=>{
 const a=runtime(),person=a.current(),id=crypto.randomUUID();a.remember(id,'helfer');
 const link=a.url('beobachtung');assert.ok(link.startsWith('https://example.org/Festpay/beobachtung/#'));
 const b=runtime(new URL(link).hash);assert.equal(b.current(),person);assert.equal(b.attempts()[0].id,id);assert.equal(b.attempts()[0].task,'helfer');
 assert.ok(!link.includes('token'));
});
test('malformed shared identities and attempt IDs cannot be imported',()=>{
 const bad=runtime('#participant=not-a-uuid&attempts=bad');assert.ok(bad.valid(bad.current()));assert.equal(bad.attempts().length,0);
 const id=crypto.randomUUID(),mixed=runtime('#participant='+id+'&attempts=not-a-uuid');assert.equal(mixed.current(),id);assert.equal(mixed.attempts().length,0);
 assert.throws(()=>mixed.choose(''));assert.throws(()=>mixed.remember('bad','helfer'));
});
test('UUID capitalization does not create a second person or duplicate attempt',()=>{
 const s=runtime(),person=crypto.randomUUID(),id=crypto.randomUUID();s.choose(person.toUpperCase());
 s.remember(id.toUpperCase(),'helfer',person.toUpperCase());s.remember(id,'helfer',person);
 assert.equal(s.current(),person);assert.equal(s.attempts(person.toUpperCase()).length,1);
});

test('round follows the shared form link while the new app always starts its own build',()=>{
 const old='festpay-2026-11-10-v9-clean',next='festpay-2026-11-16-v10-redesign';
 const app=runtime('',{BUILD_VERSION:next}),url=app.url('umfrage');assert.equal(new URLSearchParams(new URL(url).hash.slice(1)).get('version'),next);
 const form=runtime('#participant=P007&version='+old);assert.equal(form.version('P007'),old);assert.equal(form.version('P009'),null);
 const newApp=runtime('#participant=P007&version='+old,{BUILD_VERSION:next});assert.equal(newApp.version(),next);
});
