// Public ingest uses random session capabilities, never public table INSERT grants.
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigins=new Set(['https://festpay-klicktest-silas.chicchair12.chatgpt.site','https://singlesilas-web.github.io']);
const headers={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const screens=new Set(['index.html','fest.html','guthaben.html','speisekarte.html','bezahlen.html','marken.html','profil.html','login.html','helfer.html','betreiber.html']);
const types=new Set(['page_view','click','repeated_click','field_focus','scroll','browser_zoom','map_zoom','map_pan','activity','session_end','page_hidden','page_visible','page_leave','heartbeat']);
const numeric=new Set(['vw','vh','aw','dh','scroll','browser_scale','map_scale','x','y','scale','depth']);
const strings=new Set(['ui_state','target','source','activity','reason']);
async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function db(path:string,init:RequestInit={}){
 const r=await fetch(base+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers}});
 if(!r.ok)throw new Error('database');const t=await r.text();return t?JSON.parse(t):null;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!allowedOrigins.has(origin))return reply(403,{error:'origin'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,{error:'method'});
 try{
  // Do not ingest requests authenticated as one of the analysts.
  const auth=req.headers.get('Authorization');
  if(auth){const r=await fetch(base+'/auth/v1/user',{headers:{apikey:service,Authorization:auth}});if(r.ok){const u=await r.json();const admins=await db('analytics_admins?user_id=eq.'+u.id+'&select=user_id');if(admins.length)return reply(403,{error:'admin_excluded'});}}
  const raw=await req.text();if(raw.length>60000)return reply(413,{error:'size'});
  const b=JSON.parse(raw);
  if(b.action==='start'){
   if(!['w1','w2','explore'].includes(b.task)||b.consent_version!=='2026-11-02-v2'||b.version!=='festpay-2026-11-02-v3')return reply(400,{error:'start'});
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
   await db('analytics_sessions',{method:'POST',body:JSON.stringify({id,token_hash:await hash(token),task:b.task,version:b.version,consent_version:b.consent_version})});
   return reply(200,{id,token});
  }
  if(b.action!=='events'||!uuid.test(b.session_id)||typeof b.token!=='string'||b.token.length!==72||!Array.isArray(b.events)||!b.events.length||b.events.length>25)return reply(400,{error:'batch'});
  const sessions=await db('analytics_sessions?id=eq.'+b.session_id+'&select=token_hash,started_at,event_count');
  const s=sessions[0];if(!s||await hash(b.token)!==s.token_hash||Date.now()-Date.parse(s.started_at)>14400000)return reply(403,{error:'session'});
  const rows=b.events.map((e:any)=>{
   if(!uuid.test(e.id)||!Number.isInteger(e.seq)||e.seq<1||!types.has(e.type)||!screens.has(e.screen)||!Number.isInteger(e.elapsed)||e.elapsed<0||e.elapsed>14400000||!Number.isFinite(Date.parse(e.at))||Math.abs(Date.now()-Date.parse(e.at))>86400000)throw Error('validation');
   const props:Record<string,number|string|boolean>={};
   for(const [k,v] of Object.entries(e.props||{})){
    if(numeric.has(k)&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000)props[k]=v;
    if(strings.has(k)&&typeof v==='string'&&v.length<=180&&/^[\w#.:>() -]+$/.test(v))props[k]=v;
    if(k==='interactive'&&typeof v==='boolean')props[k]=v;
   }
   return {id:e.id,session_id:b.session_id,seq:e.seq,type:e.type,screen:e.screen,at:e.at,elapsed:e.elapsed,props};
  });
  await db('analytics_events?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(rows)});
  return reply(200,{accepted:rows.length});
 }catch{return reply(400,{error:'invalid_or_unavailable'});}
});
