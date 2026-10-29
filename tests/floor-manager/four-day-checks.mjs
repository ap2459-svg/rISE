import assert from 'node:assert/strict';
import {DAYS,settleDay} from '../../dist/floor-manager/campaign.mjs';
import {newDay,loadDay,CafeSimulation,cafeSnapshot} from '../../dist/floor-manager/day.mjs';
import {createSet} from '../../dist/floor-manager/seating-sets.mjs';
import {beginConcern,loseGuest,rewardGuest} from '../../dist/floor-manager/patience.mjs';
import {availableFix,applyFix} from '../../dist/floor-manager/urgent-actions.mjs';
assert.deepEqual(DAYS.map(d=>d.name),['Grand Reopening','Make Them Stay','Different Customers, Different Needs','The Rush Hour Challenge']);
const old=newDay();old.campaignVersion=2;old.dayNumber=5;old.money=321;old.objects.push(...createSet('smallSet','paid',-8,1));
const migrated=loadDay(old);assert.equal(migrated.dayNumber,4);assert.equal(migrated.money,321);assert.equal(migrated.objects.length,old.objects.length);assert.equal(migrated.campaignVersion,3);
for(let d=1;d<=4;d++){const s=newDay();s.dayNumber=d;s.phase='day-report';s.reports.current={profit:20,served:0,satisfaction:0,types:{}};settleDay(s);assert.equal(s.phase,d===4?'campaign-complete':'renovate');assert.equal(s.dayNumber,d===4?4:d+1);}
const state=newDay();state.phase='day-running';state.clean=state.waste=true;state.money=350;state.objects.push(...createSet('smallSet','comfort',-8,0));for(const o of state.objects.filter(o=>o.type==='chair'))o.upgraded=false;
const sim=new CafeSimulation(cafeSnapshot(state),'day'),g=sim.parties.find(p=>p.type==='casual');g.phase='seekingSeat';g.pos={...sim.pickup};g.served=true;g.need='comfort';g.size=1;
// Seat the real guest, then respond to the real discomfort condition.
assert(sim.startSeating(g,true));g.phase='seated';g.pos={x:g.seat.x,z:g.seat.z};g.seatTime=5;beginConcern(sim,g,'comfort');g.concern.remaining=10;
assert.equal(sim.emotionalState(g),'frustrated');g.concern.remaining=5;assert.equal(sim.emotionalState(g),'angry');
const fix=availableFix(sim,g,state);assert(fix&&fix.id==='comfort');assert.equal(fix.price,70,'Same basic chair + upholstery price as shop');const before=state.money;const result=applyFix(sim,g,state);assert(result);assert.equal(state.money,before-70);assert.equal(g.concern,null);assert.equal(sim.emotionalState(g),'happy');assert.equal(sim.streak,1,'A successful help is reflected immediately');assert.equal(applyFix(sim,g,state),null,'One click cannot charge twice after resolution');
const second=sim.parties.find(p=>p!==g);second.served=true;second.sat=.8;second.size=2;rewardGuest(sim,second);assert.equal(sim.streak,3);assert.equal(sim.upgradeRewards,30);const last=sim.parties.find(p=>p!==g&&p!==second);loseGuest(sim,last);assert.equal(sim.streak,0);assert.equal(sim.streakBreak.count,3);assert.equal(sim.streakBreak.id,1);loseGuest(sim,last);assert.equal(sim.streakBreak.id,1);
const noCash={...state,money:0};g.concern={key:'comfort',remaining:5,total:30};g.seat.upgraded=false;assert.equal(availableFix(sim,g,noCash),null);
console.log('PASS: four mission progression, saved bank/furniture retained, actual face states follow patience, direct paid upholstery rescue, immediate streak/tips, duplicate-charge protection and streak-break event.');
