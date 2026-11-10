-- Transactional integration check: all synthetic rows are rolled back.
begin;
do $$
declare
  person uuid:=gen_random_uuid(); other_person uuid:=gen_random_uuid();
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  survey uuid:=gen_random_uuid(); observation uuid:=gen_random_uuid(); rejected boolean:=false;
begin
  insert into public.study_participants(id) values(person),(other_person);
  insert into public.analytics_sessions(id,token_hash,task,version,consent_version,participant_id)
  values(a,'internal-sql-test','gast_marken','festpay-2026-11-10-v8-linked','2026-11-10-linked-v1',person),
        (b,'internal-sql-test','gast_marken','festpay-2026-11-10-v8-linked','2026-11-10-linked-v1',person);
  insert into public.analytics_events(id,session_id,seq,type,screen,at,elapsed,props)
  values(gen_random_uuid(),a,1,'activity','marken.html',now(),40000,'{"activity":"token_redeemed"}'),
        (gen_random_uuid(),a,2,'session_end','marken.html',now(),42000,'{"reason":"internal_qa"}');
  insert into public.festpay_survey_responses(id,survey_version,real_role,ease,navigation,design,enjoyment,payment_clarity,balance_clarity,consent,participant_id,attempt_ids,linkage_consent,age,task_guest_tokens,task_guest_balance,task_helper_checkout,task_organizer_tokens,task_organizer_balance,task_organizer_helper,real_roles,usefulness,guest_usefulness,organizer_usefulness,legacy_payment_satisfaction,payment_preference)
  values(survey,5,'guest',4,4,4,4,4,4,true,person,array[a,b],true,65,'done','not_tried','not_tried','not_tried','not_tried','not_tried',array['guest'],4,4,4,3,'digital');
  insert into public.festpay_observations(id,form_version,participant_code,app,test_date,observations,participant_id,attempt_ids,linkage_consent,age)
  values(observation,1,'internal-sql-test','FestPay',current_date,jsonb_build_object('gast_marken',jsonb_build_object('session_id',a,'duration_ms',41000,'result','independent')),person,array[a],true,65);
  if not exists(select 1 from public.study_attempt_analysis where attempt_id=a and age=65 and not age_conflict and linkage_status='all_three_linked' and goal_elapsed_ms=40000 and end_elapsed_ms=42000 and survey_task_result is null and survey_reported_task_result='done' and survey_task_attempt_count=2) then raise exception 'Joined or repeated-attempt result incorrect'; end if;
  if (select count(*) from public.study_attempt_analysis where participant_id=person)<>2 then raise exception 'Attempt rows were multiplied'; end if;
  update public.festpay_observations set age=66 where id=observation;
  if not exists(select 1 from public.study_attempt_analysis where attempt_id=a and age is null and age_conflict) then raise exception 'Age conflict not flagged'; end if;
  begin
    insert into public.festpay_observations(id,form_version,participant_code,app,test_date,observations,participant_id,attempt_ids,linkage_consent)
    values(gen_random_uuid(),1,'internal-sql-test','FestPay',current_date,jsonb_build_object('gast_marken',jsonb_build_object('session_id',a,'duration_ms',1,'result','independent')),other_person,array[a],true);
  exception when others then rejected=true; end;
  if not rejected then raise exception 'Cross-person link accepted'; end if;
  rejected=false;
  begin
    insert into public.festpay_observations(id,form_version,participant_code,app,test_date,observations,participant_id,attempt_ids,linkage_consent)
    values(gen_random_uuid(),1,'internal-sql-test','FestPay',current_date,jsonb_build_object('helfer',jsonb_build_object('session_id',a,'duration_ms',1,'result','independent')),person,array[a],true);
  exception when others then rejected=true; end;
  if not rejected then raise exception 'Wrong task accepted'; end if;
  update public.analytics_sessions set excluded=true where id=a;
  if exists(select 1 from public.study_attempt_analysis where attempt_id=a) then raise exception 'Excluded QA attempt visible'; end if;
end $$;
rollback;
