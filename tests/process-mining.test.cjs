const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/js/process-mining.js'),'utf8'),context);
const {casesForGoal} = context.window.FestPayMining;

test('each scripted task maps to its observed end goal without changing historical assignments', () => {
  const assignments = {gast_guthaben:'wallet_qr_shown',gast_marken:'token_redeemed',helfer:'wallet_charged',betreiber_marken:'festival_created',betreiber_guthaben:'festival_helper_saved',w1:'wallet_topped_up'};
  for (const [task,goal] of Object.entries(assignments)) {
    const cases = casesForGoal([{id:'one',task,version:'festpay-2026-11-09-v6-tasks',started_at:new Date().toISOString()}],[],goal);
    assert.equal(cases.length,1);
    assert.equal(cases[0].assigned,true);
    assert.equal(cases[0].completed,false);
  }
});

test('ending a test is distinct from reaching a goal and is retained for full exports', () => {
  const session = {id:'one',task:'betreiber_marken',version:'festpay-2026-11-09-v6-tasks'};
  const end = {session_id:'one',seq:2,type:'session_end',screen:'betreiber.html',elapsed:10000,props:{reason:'return_to_task_selection'}};
  const withoutGoal = casesForGoal([session],[end],'festival_created')[0];
  assert.equal(withoutGoal.completed,false);
  assert.equal(withoutGoal.status,'Beendet ohne Ziel');
  const goal = {session_id:'one',seq:1,type:'activity',screen:'betreiber.html',elapsed:5000,props:{activity:'festival_created'}};
  const completed = casesForGoal([session],[goal,end],'festival_created')[0];
  assert.equal(completed.duration,5000);
  assert.equal(completed.trace.length,1);
  assert.equal(completed.fullTrace.length,2);
  assert.equal(completed.endReason,'return_to_task_selection');
});

test('current run accepts only the five scripted tasks and exact current version',()=>{
 const current='festpay-2026-11-10-v9-clean';
 const tasks=['gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben'];
 const fixtures=[...tasks.map((task,i)=>({id:'current-'+i,task,version:current})),{id:'old-task',task:'explore',version:current},{id:'old-version',task:'helfer',version:'festpay-2026-11-10-v8-linked'}];
 const mining=context.window.FestPayMining;
 assert.equal(mining.currentSessions(fixtures,current).length,5);
 assert.equal(mining.currentSessions(fixtures,current,'helfer').length,1);
 assert.equal(mining.currentSessions([],current).length,0);
 assert.equal(mining.goalForTask('gast_guthaben'),'wallet_qr_shown');
 assert.equal(mining.goalForTask('festival_updated'),undefined);
});
