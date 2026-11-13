import assert from 'node:assert/strict';
import {newDay,seatsIn,canEdit,noiseAt,clone,simulate} from '../../dist/floor-manager/day.mjs';
import {REPAIRS} from '../../dist/floor-manager/catalog.mjs';
import {repair} from '../../dist/floor-manager/cleanup.mjs';
import {DAYS,missionProgress,settleDay} from '../../dist/floor-manager/campaign.mjs';
const fresh=newDay();assert.equal(seatsIn(fresh).length,4);assert.equal(fresh.money,2000);assert.equal(fresh.openingRepairBudget,0);
assert.deepEqual(['waste','floor','paint'].map(k=>REPAIRS[k].price),[250,250,250]);
const cafe=clone(fresh);for(const key of ['waste','floor','paint']){assert(repair(cafe,key));assert.equal(repair(cafe,key),false,'No duplicate repair charge');}assert.equal(cafe.money,1250);assert(canEdit({...fresh,phase:'day-running'}));
const group={type:'social',size:4,phase:'seated',pos:{x:-2,z:1}},near=noiseAt(cafe,{x:-4,z:1},[group]),far=noiseAt(cafe,{x:-9,z:1},[group]);assert(near>far);const divided=clone(cafe);divided.objects.push({id:'divider',type:'divider',x:-3,z:1});assert(noiseAt(divided,{x:-4,z:1},[group])<near);
for(let day=1;day<=4;day++){const c=clone(cafe);c.dayNumber=day;const r=simulate(c,'day');assert.equal(r.actualDuration,128);assert.equal(r.revenue,r.transactions.reduce((sum,t)=>sum+t.amount,0));assert(r.types.study.satisfaction===null||Number.isFinite(r.types.study.satisfaction));}
const bank=clone(fresh);bank.phase='day-report';bank.liveCredited=100;bank.money=900;bank.reports.current={revenue:130,ingredientCosts:30,profit:70,served:0,satisfaction:0,types:{},reputation:68,upgradeRewards:0};settleDay(bank);assert.equal(bank.money,870);assert.equal(bank.upgradeCredits,0);assert.equal(bank.liveCredited,0);assert.equal(settleDay(bank),false);
assert.equal(DAYS.length,4);assert(missionProgress(fresh,{profit:300}).find(g=>g.key==='profit').met);
assert(!missionProgress(fresh,{satisfaction:100,observedDepartures:2}).find(g=>g.key==='stars').met,'Ratings require observed departures');
assert(missionProgress(fresh,{satisfaction:40,observedDepartures:3}).find(g=>g.key==='stars').met);
console.log('PASS: starter seats, $2000 budget, cleanup charges, live edits, noise, four bounded shifts, transaction accounting, settlement and measured mission goals.');
