const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../dist');
test('dashboard, linked table, routes, graph, heatmap and exports use the same representative attempts',async()=>{
 const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 const element=()=>({value:'',innerHTML:'',textContent:'',options:[],controls:new Map(),querySelector(s){if(!this.controls.has(s))this.controls.set(s,element());return this.controls.get(s);},replaceChildren(...options){this.options=options;this.value=options[0]?.value||'';},add(o){this.options.push(o);},getContext(){return {fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};}});
 const els=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element()]));
 const session=(id,participant_id,version='v2')=>({id,participant_id,participant_code:participant_id,attempt_code:id,task:'gast_guthaben',version});
 const sessions=[session('discarded','P001'),session('winner','P001'),session('only-failure','P002'),session('old-version','P001','v1')];
 const events=[{session_id:'discarded',type:'page_view',screen:'index.html',seq:1},{session_id:'winner',type:'click',screen:'guthaben.html',seq:1,props:{target:'#go',x:.5,y:.5}},{session_id:'winner',type:'activity',screen:'guthaben.html',seq:2,props:{activity:'wallet_qr_shown'},elapsed:5000},{session_id:'winner',type:'session_end',seq:3,props:{reason:'return_to_task_selection'}},{session_id:'only-failure',type:'page_view',screen:'index.html',seq:1}];
 const linked=sessions.map(s=>({...s,attempt_id:s.id,observation_ids:s.id==='discarded'?['obs-1']:[],observation_count:s.id==='discarded'?1:0,survey_count:0}));
 const client={from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},order(){return q;},range(start,end){let data=table==='analytics_sessions'?sessions.map(s=>({...s,excluded:false})):table==='analytics_events'?events:linked;return Promise.resolve({data:data.filter(r=>filters.every(f=>f(r))).slice(start,end+1)});},then(resolve,reject){return Promise.resolve({data:[{user_id:'admin'}]}).then(resolve,reject);}};return q;},auth:{getSession:async()=>({data:{session:null}}),signInWithPassword:async()=>({})}};
 const blobs=[],downloads=[];
 const ctx={console,Blob,document:{getElementById:id=>{assert.ok(els.has(id),id);return els.get(id);},createElement(){return {click(){downloads.push(this.download);}};}},URL:{createObjectURL(b){blobs.push(b);return 'blob:test';},revokeObjectURL(){}},localStorage:{setItem(){}},sessionStorage:{removeItem(){}},supabase:{createClient:()=>client},Option:function(text,value){this.text=text;this.value=value;},APP_CONFIG:{ANALYTICS_URL:'https://example.org',ANALYTICS_KEY:'public',BUILD_VERSION:'v2',STUDY_VERSIONS:[['v1','V1'],['v2','V2']]},setTimeout(){}};ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['test-tasks.js','process-mining.js','admin.js'])await vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),ctx);
 await els.get('login').querySelector('form').onsubmit({preventDefault(){}});
 assert.match(els.get('attemptSummary').textContent,/2 ausgewählte Fälle aus 3/);
 assert.match(els.get('metrics').innerHTML,/1 \/ 2/);
 for(const id of ['sessions','linkedRows']){assert.match(els.get(id).innerHTML,/winner/);assert.doesNotMatch(els.get(id).innerHTML,/discarded|old-version/);}
 assert.match(els.get('linkedRows').innerHTML,/Beobachtungsbogen an anderem Versuch/);
 assert.match(els.get('heatNote').textContent,/1 Klicks/);assert.match(els.get('graph').innerHTML,/Guthaben-QR anzeigen/);
 els.get('raw').onclick();const raw=JSON.parse(await blobs.at(-1).text());assert.deepEqual(raw.sessions.map(s=>s.id),['winner','only-failure']);assert.equal(raw.attempt_selection[0].attemptCount,2);assert.equal(raw.events.length,4);
 els.get('csv').onclick();const csv=await blobs.at(-1).text();assert.match(csv,/winner/);assert.doesNotMatch(csv,/discarded|old-version/);assert.match(csv,/Testversuch beendet/);
 els.get('linkedCsv').onclick();const linkedCsv=await blobs.at(-1).text();assert.equal(linkedCsv.split('\r\n').length,3);assert.match(linkedCsv,/attempt_selection_policy/);
 els.get('route').value='open';els.get('route').onchange();assert.doesNotMatch(els.get('sessions').innerHTML,/winner|discarded/);assert.match(els.get('sessions').innerHTML,/only-failure/);
 els.get('version').value='v1';await els.get('version').onchange();assert.match(els.get('sessions').innerHTML,/old-version/);assert.doesNotMatch(els.get('sessions').innerHTML,/winner/);
});
