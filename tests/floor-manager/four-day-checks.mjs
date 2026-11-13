import assert from 'node:assert/strict';
import {DAYS,settleDay} from '../../dist/floor-manager/campaign.mjs';
import {newDay,loadDay,CafeSimulation,cafeSnapshot} from '../../dist/floor-manager/day.mjs';
import {createSet} from '../../dist/floor-manager/seating-sets.mjs';
import {makeRequest,requestStats} from '../../dist/floor-manager/request-system.mjs';
import {availableFix,applyFix} from '../../dist/floor-manager/urgent-actions.mjs';
import {emptyCafe,seatGuest} from './fixtures.mjs';
assert.deepEqual(DAYS.map(d=>d.name),['A functioning café','A place for everyone','Different needs, one café','Rush-hour mastery']);
const old=newDay();old.campaignVersion=2;old.dayNumber=5;old.money=321;old.objects.push(...createSet('smallSet','paid',-8,1));
const migrated=loadDay(old);assert.equal(migrated.dayNumber,4);assert.equal(migrated.money,321);assert.deepEqual(migrated.objects,old.objects);assert.equal(migrated.campaignVersion,3);
for(let d=1;d<=4;d++){const s=newDay();s.dayNumber=d;s.phase='day-report';s.reports.current={profit:20,served:0,satisfaction:0,types:{}};assert.equal(settleDay(s),20);assert.equal(s.money,2020,'No automatic mission cash');assert.equal(s.phase,d===4?'campaign-complete':'renovate');assert.equal(s.dayNumber,d===4?4:d+1);assert.equal(settleDay(s),false);}
const state=emptyCafe();state.dayNumber=2;state.phase='day-running';state.money=350;state.objects.push(...createSet('smallSet','comfort',-8,0));for(const o of state.objects.filter(o=>o.type==='chair'))o.upgraded=false;
const sim=new CafeSimulation(cafeSnapshot(state),'day'),g=seatGuest(sim,'casual','comfort');
const request=makeRequest(sim,'comfort',[g]);assert(request);const fix=availableFix(sim,g,state);assert.equal(fix?.id,'comfort');assert(fix.price>0);
assert.equal(availableFix(sim,g,{...state,money:fix.price-1}),null);const before=state.money;assert(applyFix(sim,g,state));assert.equal(state.money,before-fix.price);assert.equal(g.concern,null);assert.equal(request.status,'resolved');assert.equal(requestStats(sim).completedRequests,1);
assert.equal(applyFix(sim,g,state),null);assert.equal(state.money,before-fix.price,'One request cannot charge twice');
assert.equal(sim.time,0,'A verified seating fix resolves while paused');assert.equal(sim.emotionalState(g),'happy');
console.log('PASS: current four missions, legacy save migration, retained cash/furniture, settlement, actual comfort request, affordability and duplicate-charge protection.');
