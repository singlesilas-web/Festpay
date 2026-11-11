const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/test-events/index.ts','utf8'));
let handler;const context={Deno:{env:{get:()=>''},serve:f=>handler=f},Response};vm.createContext(context);vm.runInContext(source,context);
for(const origin of ['https://singlesilas-web.github.io','https://festpay-klicktest-silas.chicchair12.chatgpt.site']){
 test('form preflight permits all headers actually sent by both forms: '+origin,async()=>{
  for(const form of ['dist/beobachtung/observation.js','dist/umfrage/survey.js']){
   const js=fs.readFileSync(form,'utf8');
   const literal=js.match(/headers:\{([^}]+)\}/)[1];
   const sent=[...literal.matchAll(/(?:^|,)\s*['"]?([\w-]+)['"]?\s*:/g)].map(m=>m[1].toLowerCase());
   assert.ok(sent.includes('prefer'));
   const response=await handler(new Request('https://test',{method:'OPTIONS',headers:{origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':sent.join(',')}}));
   assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),origin);
   const allowed=response.headers.get('access-control-allow-headers').split(',').map(s=>s.trim().toLowerCase());
   for(const header of sent)assert.ok(allowed.includes(header),form+' needs '+header);
  }
 });
}
test('form CORS retains the explicit origin restriction',async()=>{
 const r=await handler(new Request('https://test',{method:'OPTIONS',headers:{origin:'https://unknown.example'}}));assert.equal(r.status,403);
});
