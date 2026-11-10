const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../dist');
test('empty dashboard loads exactly five tasks, chooses matching goals and queries only the current build',async()=>{
 const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 const element=()=>({value:'',hidden:false,innerHTML:'',textContent:'',options:[],controls:new Map(),querySelector(s){if(!this.controls.has(s))this.controls.set(s,element());return this.controls.get(s);},replaceChildren(...options){this.options=options;this.value=options[0]?.value||'';},add(option){this.options.push(option);this.value ||= option.value;},getContext(){return {fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};}});
 const els=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element()]));
 const queries=[];
 const client={from(table){const ops=[];queries.push({table,ops});const q={select(){return q;},eq(...args){ops.push(['eq',...args]);return q;},in(...args){ops.push(['in',...args]);return q;},order(){return q;},range(){return Promise.resolve({data:[],error:null});},then(resolve,reject){return Promise.resolve({data:table==='analytics_admins'?[{user_id:'admin'}]:[],error:null}).then(resolve,reject);}};return q;},auth:{signInWithPassword:async()=>({error:null}),getSession:async()=>({data:{session:null}})}};
 const ctx={window:null,console,document:{getElementById:id=>{assert.ok(els.has(id),'Removed/unknown control referenced: '+id);return els.get(id);}},localStorage:{setItem(){}},sessionStorage:{removeItem(){}},supabase:{createClient:()=>client},Option:function(text,value){this.text=text;this.value=value;},APP_CONFIG:{ANALYTICS_URL:'https://example.org',ANALYTICS_KEY:'public',BUILD_VERSION:'current-build'},setTimeout(){}};ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['test-tasks.js','process-mining.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),ctx);
 await vm.runInContext(fs.readFileSync(path.join(root,'js/admin.js'),'utf8'),ctx);
 await els.get('login').querySelector('form').onsubmit({preventDefault(){}});
 assert.equal(els.get('task').options.length,5);
 assert.deepEqual(els.get('task').options.map(o=>o.value),['gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben']);
 assert.match(els.get('goalDescription').textContent,/Guthaben-QR anzeigen/);
 assert.match(els.get('sessions').innerHTML,/keine Fälle/);
 els.get('task').value='helfer';els.get('task').onchange();
 assert.match(els.get('goalDescription').textContent,/Guthaben am Stand abbuchen/);
 for(const table of ['analytics_sessions','study_attempt_analysis']){
  const q=queries.find(q=>q.table===table);assert.ok(q.ops.some(o=>o[0]==='eq'&&o[1]==='version'&&o[2]==='current-build'));
  assert.ok(q.ops.some(o=>o[0]==='in'&&o[1]==='task'&&o[2].length===5));
 }
 assert.ok(!els.has('version')&&!els.has('goal')&&!els.has('sample'));
});
