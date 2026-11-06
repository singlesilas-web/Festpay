const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/js/telemetry.js'),'utf8');
function runtime({preview=false,guest=false,previous=[]}={}){
 const local=new Map(preview?[['festpay_exclude_device','1']]:[]),session=new Map(),listeners={},timers=[];
 const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 if(guest)session.set('festpay_test_session_v2',JSON.stringify({id:'test',token:'token',started:Date.now(),seq:5,task:'w1',pending:previous}));
 const element=()=>({dataset:{},className:'',innerHTML:'',textContent:'',setAttribute(){},addEventListener(){},querySelector(){return element()},querySelectorAll(){return[]},append(){},focus(){},remove(){}});
 const document={getElementById:()=>null,documentElement:{scrollHeight:800},hidden:false,body:{append(){},appendChild(){}},addEventListener:(n,f)=>listeners[n]=f,createElement:element,querySelector:s=>s==='.app'?{getBoundingClientRect:()=>({width:390,left:0})}:null};
 const api={};for(const k of ['aufladen','markenKaufen','markeEntwerten','abbuchen','festSpeichern'])api[k]=async()=>({error:null});
 const context={console,crypto,document,API:api,Date,URLSearchParams,innerWidth:390,innerHeight:800,scrollY:0,localStorage:store(local),sessionStorage:store(session),location:{pathname:'/index.html',search:'',href:''},history:{replaceState(){}},setInterval(fn){timers.push(fn)},setTimeout(){},clearTimeout(){},alert(){},fetch:async()=>({ok:true,json:async()=>({})})};
 context.window=context;context.APP_CONFIG={ANALYTICS_URL:'https://test.supabase.co',ANALYTICS_KEY:'public',BUILD_VERSION:'test'};context.addEventListener=()=>{};
 vm.createContext(context);vm.runInContext(source,context);return{context,listeners,session,timers,queue:()=>JSON.parse(session.get('festpay_test_session_v2')||'{"pending":[]}').pending};
}
test('no consent creates no session and emits nothing',()=>{const r=runtime();r.context.TestLog.event('click',{target:'secret'});assert.equal(r.session.size,0)});
test('preview suppresses all analytics including successful actions',async()=>{const r=runtime({preview:true,guest:true});await r.context.API.aufladen();assert.equal(r.queue().length,0)});
test('navigation restores pending events and advances sequence',()=>{const old={id:'prior',seq:5,type:'activity'};const r=runtime({guest:true,previous:[old]});assert.equal(r.queue()[0].id,'prior');assert.equal(r.queue()[1].type,'page_view');assert.equal(r.queue()[1].seq,6)});
test('field focus logs structural target without input value',()=>{const r=runtime({guest:true});const input={dataset:{},id:'password',value:'MY-PRIVATE-PASSWORD',matches:()=>true,closest:()=>null};r.listeners.focusin({target:input});assert.equal(r.queue().at(-1).type,'field_focus');assert.ok(!JSON.stringify(r.queue()).includes('MY-PRIVATE-PASSWORD'))});
test('semantic activity follows successful simulated action',async()=>{const r=runtime({guest:true});await r.context.API.aufladen();assert.equal(r.queue().at(-1).props.activity,'wallet_topped_up')});


test('scrolled tap uses the visible viewport including its offset', () => {
 const r = runtime({guest:true});
 r.context.scrollY = 530;
 r.context.visualViewport = {width:360,height:700,offsetLeft:10,offsetTop:20};
 const element = {id:'target',dataset:{},closest:()=>null};
 r.listeners.click({target:element,clientX:28,clientY:685,detail:1});
 const {x,y,coordinate_space,viewport_height} = r.queue().at(-1).props;
 assert.equal(coordinate_space,'viewport_v1');
 assert.equal(viewport_height,700);
 assert.equal(x,.05);
 assert.equal(y,.95);
});

test('a delayed acknowledgement preserves events appended by the next page', async () => {
 const r = runtime({guest:true});
 let acknowledge;
 r.context.fetch = () => new Promise(resolve => { acknowledge = resolve; });
 const request = r.timers[0]();
 const key = 'festpay_test_session_v2';
 const next = JSON.parse(r.session.get(key));
 next.pending.push({id:'next-page',seq:++next.seq,type:'page_view'});
 r.session.set(key,JSON.stringify(next));
 acknowledge({ok:true,json:async()=>({})});
 await request;
 assert.deepEqual(r.queue().map(event => event.id),['next-page']);
 assert.equal(JSON.parse(r.session.get(key)).seq,next.seq);
});
