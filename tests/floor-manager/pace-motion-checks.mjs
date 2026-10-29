import assert from 'node:assert/strict';
import {newDay,cafeSnapshot,CafeSimulation,clone} from '../../dist/floor-manager/day.mjs';
import {createSet} from '../../dist/floor-manager/seating-sets.mjs';
import {ENTRY,lineFree} from '../../dist/floor-manager/layout.mjs';
import {MAX_SHIFT_SECONDS,SIMULATION_RATE,shiftAdvance} from '../../dist/floor-manager/shift-clock.mjs';
import {seatingRoute,departureRoute,advanceGuest} from '../../dist/floor-manager/customer-motion.mjs';

const furnished=newDay();furnished.clean=furnished.waste=furnished.floor=furnished.paint=true;
furnished.objects.push(...createSet('smallSet','pair',-8,-1),...createSet('roundSet','friends',-2,1),...createSet('soloSet','solo',4,2));
furnished.objects.push({id:'booth',type:'booth',x:-8,z:4.8,r:0,upgraded:true});
furnished.objects.push({id:'power',type:'outlet',x:-10.9,z:-1,upgraded:true});
furnished.lights.push({id:'desk-light',type:'light',x:-8,z:-1,upgraded:true});
const empty=newDay();
const blocked=clone(furnished);blocked.objects.push({id:'entrance-block',type:'fixture',x:ENTRY.x,z:ENTRY.z,width:3,depth:2});

// Run the exact fixed-step loop used by game.js, driven by the shared real-time clock.
function playback(state,frames){
 const sim=new CafeSimulation(cafeSnapshot(state),'day');let accumulator=0,activeSeconds=0,frame=0;
 while(!sim.done&&activeSeconds<MAX_SHIFT_SECONDS+2){const elapsed=frames[frame++%frames.length];activeSeconds+=elapsed;accumulator+=shiftAdvance(elapsed,1);while(accumulator>=.1-1e-8&&!sim.done){sim.tick(.1);accumulator-=.1}}
 assert(sim.done,`Day ${state.dayNumber} must finish within ${MAX_SHIFT_SECONDS} active seconds`);
 assert(Math.abs(sim.report.actualDuration/SIMULATION_RATE-MAX_SHIFT_SECONDS)<1e-6);
 assert.equal(sim.report.revenue,sim.report.transactions.reduce((sum,t)=>sum+t.amount,0));
 assert.equal(sim.report.profit,sim.report.revenue-sim.report.ingredientCosts-sim.report.operatingCosts);
 assert(sim.report.transactions.every(t=>sim.parties.some(g=>g.id===t.guest&&g.served)),'Every transaction belongs to a served guest');
 return {sim,activeSeconds};
}
assert.equal(shiftAdvance(12,0),0,'Pause must not advance the café clock');
assert.equal(shiftAdvance(-1),0);
assert.equal(shiftAdvance(.5),.5*SIMULATION_RATE,'Slow rendering must not truncate simulation progress');
const duration=[];
for(let day=1;day<=4;day++)for(const [layoutName,layout]of Object.entries({empty,furnished,blocked})){
 const s=clone(layout);s.dayNumber=day;
 const normal=playback(s,[1/60]);
 const slow=playback(s,[.25]);
 const interrupted=playback(s,[1/30,.5,1/30,1.8]);
 assert.deepEqual(slow.sim.report,normal.sim.report,`${layoutName}, day ${day}: low FPS must preserve outcomes`);
 assert.deepEqual(interrupted.sim.report,normal.sim.report,`${layoutName}, day ${day}: catch-up must preserve outcomes`);
 duration.push(normal.activeSeconds);
}
console.log(`PASS: all four days finish in ${Math.min(...duration).toFixed(2)}–${Math.max(...duration).toFixed(2)} active seconds across empty, furnished, and blocked cafés; pause, low-FPS catch-up and transaction accounting pass.`);

// A group member must turn at each route waypoint rather than cut across furniture.
const bend=[{x:1,z:0},{x:1,z:1},{x:2,z:1}];
const origin={x:0,z:0};
assert.deepEqual(advanceGuest(origin,bend,1.5),{x:1,z:.5});
assert.deepEqual(origin,{x:0,z:0},'Movement does not mutate the prior position');
assert.deepEqual(bend,[{x:1,z:1},{x:2,z:1}]);
assert.deepEqual(advanceGuest({x:1,z:.5},bend,10),{x:2,z:1});assert.equal(bend.length,0);
assert.deepEqual(advanceGuest(origin,null,1),origin);
const sim=new CafeSimulation(cafeSnapshot(furnished),'day');
for(const seat of sim.seats){
 const route=seatingRoute(sim,sim.pickup,seat);assert(route?.length,`${seat.id} has a seating route`);
 assert.deepEqual(route.at(-1),{x:seat.x,z:seat.z});
 let current={...sim.pickup};
 for(const point of route.slice(0,-1)){assert(lineFree(current,point,sim.obs,.18),`${seat.id}: approach avoids obstacles`);current=point;}
 if(!seat.builtIn){const chair=sim.cafe.objects.find(o=>o.id===seat.id);assert(lineFree(current,seat,sim.obs,.17,chair),`${seat.id}: last step crosses only its own chair`)}
 const walk=route.map(p=>({...p}));let position={...sim.pickup};for(let steps=0;walk.length&&steps<500;steps++)position=advanceGuest(position,walk,.15);
 assert.equal(walk.length,0);assert(Math.hypot(position.x-seat.x,position.z-seat.z)<1e-9);
 const departure=departureRoute(sim,seat,seat,ENTRY);assert(departure?.length);assert.deepEqual(departure.at(-1),ENTRY);
 for(let i=1;i<departure.length;i++)assert(lineFree(departure[i-1],departure[i],sim.obs,.18),`${seat.id}: departure avoids furniture after leaving its seat`);
}
const inaccessible={id:'missing-seat',x:0,z:0,tableId:'missing'};
const noSeatSim={seatPath:()=>null};assert.equal(seatingRoute(noSeatSim,ENTRY,inaccessible),null);assert.equal(departureRoute(noSeatSim,inaccessible,inaccessible,ENTRY),null);
console.log(`PASS: waypoint movement, ${sim.seats.length} reachable chair/booth positions, obstacle-aware approaches and departures, and unavailable-route handling.`);
