const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');

test('research upgrade: exact attempt linkage, repetitions, age conflicts and RLS',async t=>{
  const db=new PGlite();
  t.after(()=>db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  for(const file of ['analytics.sql','observation.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase',file),'utf8'));
  // Minimal pre-upgrade survey fixture: v7 only adds columns and reads its row as JSON.
  // Full v5 validation remains owned by survey-v5.sql, unchanged by this upgrade.
  await db.exec(`create table public.festpay_survey_responses(
    id uuid primary key,created_at timestamptz default now(),consent boolean not null,
    survey_version int not null,task_guest_balance text
  );alter table public.festpay_survey_responses enable row level security;
  grant insert(id,consent,survey_version,task_guest_balance) on public.festpay_survey_responses to anon;
  grant all on public.festpay_survey_responses to service_role;
  create policy survey_submission on public.festpay_survey_responses for insert to anon with check(consent);`);
  const old=randomUUID(),trial=randomUUID(),other=randomUUID(),attempt=randomUUID(),repeat=randomUUID(),admin=randomUUID();
  await db.query("insert into analytics_sessions(id,token_hash,task,version,consent_version) values($1,'hash','gast_guthaben','old','old')",[old]);
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/research-linkage-v7.sql'),'utf8'));
  const createAttempt=(id,trialId,task='gast_guthaben')=>db.query("insert into analytics_sessions(id,trial_id,token_hash,task,version,consent_version) values($1,$2,'hash',$3,'festpay-2026-11-10-v7-linked','2026-11-10-v3-linked')",[id,trialId,task]);
  await createAttempt(attempt,trial);await createAttempt(repeat,trial);
  const observation=(id,trialId,attemptId,age=65,task='gast_guthaben')=>db.query(`insert into festpay_observations(id,trial_id,form_version,participant_code,app,test_date,age,observations)
    values($1,$2,1,'Pseudonym','FestPay',current_date,$3,$4)`,[id,trialId,age,JSON.stringify({[task]:{attempt_id:attemptId,duration_ms:40000,result:'independent'}})]);
  const role=async(name,run)=>{await db.exec('set role '+name);try{return await run();}finally{await db.exec('reset role');}};
  const read=async()=> (await db.query('select * from festpay_research_attempts order by id')).rows;
  await t.test('v7 attempts require linkage and updated consent',async()=>{
    await assert.rejects(db.query("insert into analytics_sessions(token_hash,task,version,consent_version) values('hash','gast_guthaben','festpay-2026-11-10-v7-linked','old')"),e=>e.code==='23514');
  });
  await t.test('anonymous submission succeeds with matching composite keys',async()=>{
    await role('anon',()=>observation(randomUUID(),trial,attempt));
    await role('anon',()=>db.query('insert into festpay_survey_responses(id,trial_id,age,consent,survey_version) values($1,$2,65,true,5)',[randomUUID(),trial]));
    const rows=await read();assert.equal(rows.length,3);
    const linked=rows.find(x=>x.id===attempt);assert.equal(linked.age,65);assert.equal(linked.linkage,'complete');
    assert.equal(rows.find(x=>x.id===repeat).observation_id,null);
    assert.equal(rows.find(x=>x.id===old).linkage,'unlinked');
  });
  await t.test('wrong trial, wrong task, missing attempt and duplicate observation are rejected atomically',async()=>{
    for(const [trialId,id,task,code] of [[other,repeat,'gast_guthaben','23503'],[trial,repeat,'helfer','23503'],[trial,randomUUID(),'gast_guthaben','23503'],[trial,attempt,'gast_guthaben','23505']]){
      await assert.rejects(role('anon',()=>observation(randomUUID(),trialId,id,65,task)),e=>e.code===code);
    }
    assert.equal((await db.query('select count(*)::int n from festpay_observations')).rows[0].n,1);
  });
  await t.test('repeating a task links a separate observation without multiplying rows',async()=>{
    await role('anon',()=>observation(randomUUID(),trial,repeat));
    const rows=await read();assert.equal(rows.length,3);
    assert.equal(rows.filter(x=>x.linkage==='complete').length,2);
    await assert.rejects(role('anon',()=>db.query('insert into festpay_survey_responses(id,trial_id,consent,survey_version) values($1,$2,true,5)',[randomUUID(),trial])),e=>e.code==='23505');
  });
  await t.test('inconsistent ages are flagged and never silently assigned an age group',async()=>{
    await db.query('update festpay_survey_responses set age=24 where trial_id=$1',[trial]);
    const linked=(await read()).filter(x=>x.trial_id===trial);
    assert.ok(linked.every(x=>x.age===null && x.age_conflict && x.age_group==='Unbekannt'));
  });
  await t.test('anonymous and unapproved authenticated users cannot read research data',async()=>{
    await assert.rejects(role('anon',()=>read()),e=>e.code==='42501');
    await assert.rejects(role('anon',()=>db.query('select * from festpay_observation_attempts')),e=>e.code==='42501');
    assert.equal((await role('authenticated',()=>read())).length,0);
    await assert.rejects(role('anon',()=>db.exec('select festpay_private.link_observation_attempts()')),e=>e.code==='42501');
  });
  await t.test('approved analyst sees rows, excluded sessions stay out',async()=>{
    await db.query('insert into auth.users values($1)',[admin]);await db.query('insert into analytics_admins values($1)',[admin]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    assert.equal((await role('authenticated',()=>read())).length,3);
    await db.query('update analytics_sessions set excluded=true where id=$1',[repeat]);
    assert.equal((await role('authenticated',()=>read())).length,2);
  });
});
