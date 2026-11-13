import assert from 'node:assert/strict';
import {CafeSimulation,cafeSnapshot} from '../../dist/floor-manager/day.mjs';
import {createSet} from '../../dist/floor-manager/seating-sets.mjs';
import {makeRequest,updateRequests,REQUEST_RULES,requestStats} from '../../dist/floor-manager/request-system.mjs';
import {SIMULATION_RATE} from '../../dist/floor-manager/shift-clock.mjs';
import {availableFix,applyFix,urgency,stage} from '../../dist/floor-manager/urgent-actions.mjs';
import {emptyCafe,seatGuest} from './fixtures.mjs';
for(let day=1;day<=4;day++){
 const state=emptyCafe();state.dayNumber=day;state.money=300;state.objects.push(...createSet('soloSet','work',-9,-1));
 const sim=new CafeSimulation(cafeSnapshot(state),'day'),g=seatGuest(sim,'study','work');
 const r=makeRequest(sim,'outlets',[g]);assert(r);assert.equal(r.total,REQUEST_RULES[day-1].seconds*SIMULATION_RATE);assert.equal(stage(g),'yellow');
 r.remaining=r.total*.5;assert.equal(stage(g),'orange');r.remaining=r.total*.1;assert.equal(stage(g),'red');
 assert.equal(makeRequest(sim,'outlets',[g]),null,'A guest cannot have overlapping requests');
 const fix=availableFix(sim,g,state);assert.equal(fix?.id,'tableOutlet');assert.equal(fix.price,45);assert.equal(availableFix(sim,g,{...state,money:44}),null);
 assert(applyFix(sim,g,state));assert.equal(state.money,255);assert(state.objects.some(o=>o.type==='tableOutlet'));
 updateRequests(sim,1.3*SIMULATION_RATE);assert.equal(r.status,'resolved');assert.equal(g.concern,null);assert.equal(urgency(g),0);assert.equal(requestStats(sim).completedRequests,1);
 assert.equal(applyFix(sim,g,state),null);assert.equal(state.money,255);
 const lost=new CafeSimulation(cafeSnapshot(emptyCafe()),'day');lost.cafe.dayNumber=day;
 const unhappy=lost.parties.find(p=>p.type==='study');Object.assign(unhappy,{phase:'seekingSeat',pos:{...lost.pickup},enter:0,served:true});
 const missing=makeRequest(lost,'seating',[unhappy]);assert(missing);missing.remaining=.05;updateRequests(lost,.1);
 assert.equal(missing.status,'expired');assert(['exiting','departed'].includes(unhappy.phase));assert(unhappy.requestExpired);assert.equal(requestStats(lost).completedRequests,0);
}
console.log('PASS: four-day request deadlines, urgency, affordable charging, actual resolution, duplicate protection and unresolved-request departure.');
