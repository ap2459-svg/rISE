import {TABLE_OUTLET_PRICE,supportsCharging,tableOutlet,hasTableOutlet} from './charging.mjs?v=crowds-40';
import {RENOVATIONS,bathroomDoors,purchaseRenovation} from './renovations.mjs?v=crowds-40';
import {rewardGuest} from './patience.mjs?v=crowds-40';
import {upgradeCost} from './upgrade-designs.mjs?v=crowds-40';
// Suggestions and execution share this evaluator. No purchase is charged until
// its placement and its effect on the requesting customer have been rechecked.
import {CafeSimulation,cafeSnapshot,clone,worldObstacles,seatsIn,PROFILES} from './day.mjs?v=crowds-40';
import {CATALOG,isTable} from './catalog.mjs?v=crowds-40';
import {SETS,createSet} from './seating-sets.mjs?v=crowds-40';
import {ROOM,ENTRY,placement,overlap} from './layout.mjs?v=crowds-40';
export const urgency=g=>g.concern&&!['exiting','departed','pending'].includes(g.phase)?Math.max(0,Math.min(1,1-g.concern.remaining/g.concern.total)):0;
export const stage=g=>!g.concern?'normal':urgency(g)<.35?'yellow':urgency(g)<.7?'orange':'red';
export function trialSimulation(sim,cafe){const t=Object.assign(Object.create(CafeSimulation.prototype),sim);t.cafe=clone(cafe);t.obs=worldObstacles(t.cafe);t.seats=seatsIn(t.cafe);t.tables=t.cafe.objects.filter(isTable);t.cache=new Map();t.bathrooms=bathroomDoors(t.cafe);return t}
function works(t,g){if(g.phase==='needsBathroom')return t.bathroomAvailable(g);if(['seekingSeat','toWait'].includes(g.phase)){const choice=t.selectTable(g);return !!choice&&choice.score>=PROFILES[g.type].threshold&&!!t.path(g.pos,choice.path.at(-2),g.accessible?.34:.18)}if(g.phase!=='seated')return false;const seat=t.seats.find(s=>s.id===g.seat?.id),table=t.tables.find(t=>t.id===g.tableId);if(!seat||!table)return false;const f=t.factors(g,seat,table);return ({outlets:f.outlet>.5,lighting:f.light>=.5&&(g.requestedAmenity!=='lighting'||t.cafe.objects.some(o=>o.type==='deskLamp'&&Math.hypot(o.x-g.seat.x,o.z-g.seat.z)<2)),comfort:f.comfort>=(g.requestedAmenity==='comfort'?.95:.8),noise:f.quiet>=.68,atmosphere:f.music>=.6})[g.concern.key]===true}
function safe(t,sim,added){if(added.some(o=>{const actual=t.cafe.objects.find(n=>n.id===o.id);return placement(actual,t.obs)==='blocked'}))return false;if(added.some(o=>sim.parties.some(p=>!['pending','departed','exiting'].includes(p.phase)&&overlap(o,{type:'fixture',x:p.pos.x,z:p.pos.z,width:.5,depth:.5}))))return false;if(t.routeProblems().length)return false;for(const p of sim.parties.filter(p=>p.phase==='seated'))if(!t.path(t.pickup,p.seatApproach))return false;return true}
export function availableFix(sim,g,state,choice=null){
 if(!g?.concern||['pending','departed','exiting'].includes(g.phase))return null;
 const key=g.concern.key,budget=state.money;
 const base=clone({...cafeSnapshot(state),phase:state.phase}),check=(cafe,added=[])=>{const t=trialSimulation(sim,cafe);return safe(t,sim,added)&&works(t,g)};
 if(key==='outlets'&&g.phase==='seated'){const table=sim.tables.find(t=>t.id===g.tableId);if(table&&sim.factors(g,g.seat,table).outlet)return{id:'connect-device',label:'Connect device to charger',price:0};}
 if(key==='outlets'){const table=state.objects.find(o=>o.id===g.tableId)||sim.selectTable(g)?.table;if(supportsCharging(table)&&!hasTableOutlet(state,table)&&budget>=TABLE_OUTLET_PRICE){const cafe=clone({...cafeSnapshot(state),phase:state.phase}),added=[tableOutlet(table,'care-charge-'+g.id+'-'+Math.round(sim.time*10))];cafe.objects.push(...added);if(check(cafe,added))return{id:'tableOutlet',label:'Add tabletop charging outlet',price:TABLE_OUTLET_PRICE,cafe,added};}}
 if(key==='bathroom'&&!state.renovations?.bathroom){const area={type:'fixture',x:5.8,z:-6.225,width:2.8,depth:3.25};if(state.objects.some(o=>o.type!=='nookArea'&&overlap(area,o,.1)))return null;const cafe=clone({...cafeSnapshot(state),phase:state.phase});if(!purchaseRenovation(cafe,'bathroom'))return null;return{id:'bathroom',label:'Build bathroom',price:RENOVATIONS.bathroom.price,cafe,added:[]};}
 if(['seekingSeat','toWait'].includes(g.phase)&&works(sim,g))return {id:'seat',label:'Take the available seats',price:0};
 if(choice!=='divider'&&key==='noise'&&state.atmosphere.volume>0&&state.atmosphere.music!=='off'){base.atmosphere.volume=0;if(check(base))return{id:'quiet',label:'Turn music down',price:0,cafe:base,added:[]}}
 if(key==='atmosphere'){const price=state.atmosphere.speaker?0:80;if(budget<price)return null;base.atmosphere={...base.atmosphere,speaker:true,music:'acoustic',volume:52};if(check(base))return{id:'music',label:(price?'Speaker + music':'Play music'),price,cafe:base,added:[]};return null}
 if(key==='comfort'){
  const candidates=g.phase==='seated'?[g.seat]:sim.seats.filter(seat=>!sim.booked.has(seat.tableId));
  for(const candidate of candidates){
   if(!candidate)continue;const cafe=clone({...cafeSnapshot(state),phase:state.phase}),seat=cafe.objects.find(o=>o.id===candidate.id)||cafe.objects.find(o=>o.id===candidate.tableId);
   if(!seat||seat.upgraded&&seat.design==='upholstered')continue;
   const price=upgradeCost(seat.type,CATALOG[seat.type].price,'upholstered',seat.upgraded);if(budget<price)continue;
   seat.upgraded=true;seat.design='upholstered';
   if(check(cafe))return{id:'comfort',label:'Upgrade to a comfy seat',price,cafe,added:[]};
  }return null;
 }
 const type=key==='noise'&&choice==='divider'?'divider':key==='outlets'?'outlet':key==='lighting'?'deskLamp':key==='groupSeating'?(g.size>4?'groupSet':g.size>2?'roundSet':'smallSet'):['noSeat','accessibility'].includes(key)?(g.size>4?'groupSet':g.size>2?'roundSet':'smallSet'):null;
 if(!type)return null;const price=(SETS[type]||CATALOG[type]).price;if(budget<price)return null;
 const target=g.seat||sim.selectTable(g)?.seats[0]||g.pos,points=[],seatTargets=g.seat?[g.seat]:sim.seats.filter(s=>!sim.booked.has(s.tableId));
 if(type==='outlet'){for(const seat of seatTargets)for(const [dx,dz]of[[.7,0],[-.7,0],[0,.7],[0,-.7]])points.push({x:seat.x+dx,z:seat.z+dz,portable:true});for(let z=ROOM.back+.5;z<ROOM.front;z+=.75)for(const x of [ROOM.left+.04,ROOM.right-.04])points.push({x,z,wallAxis:'x',wallSign:x<0?-1:1,r:x<0?Math.PI/2:-Math.PI/2});for(let x=ROOM.left+.5;x<ROOM.right;x+=.75)points.push({x,z:ROOM.back+.04,wallAxis:'z',wallSign:-1,r:Math.PI});}
 else for(let z=ROOM.back+1;z<ROOM.front-1;z+=['deskLamp','divider'].includes(type)?.8:1.8)for(let x=ROOM.left+1;x<ROOM.right-1;x+=['deskLamp','divider'].includes(type)?.8:1.8)points.push({x,z});
 points.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
 for(const point of points){if(['outlet','deskLamp'].includes(type)&&!seatTargets.some(s=>Math.hypot(point.x-s.x,point.z-s.z)<2.5))continue;const cafe=clone({...cafeSnapshot(state),phase:state.phase}),id='care-'+g.id+'-'+Math.round(sim.time*10),added=SETS[type]?createSet(type,id,point.x,point.z):[{id,type,...point,upgraded:true}];cafe.objects.push(...added);const t=trialSimulation(sim,cafe);if(safe(t,sim,added)&&works(t,g))return{id:type,label:SETS[type]?(g.size>1?'Buy table + '+SETS[type].offsets.length+' chairs':'Buy table + chairs'):type==='outlet'?'Install nearby outlet':type==='divider'?'Add divider':'Place reading lamp',price,cafe,added};}
 return null;
}
export function applyFix(sim,g,state,choice=null){const request=g?.concern?{...g.concern}:null;const fix=availableFix(sim,g,state,choice);if(!fix)return null;if(request?.key==='outlets')g.chargingConfirmed=true;if(fix.cafe){state.objects=fix.cafe.objects;state.atmosphere=fix.cafe.atmosphere;state.renovations=fix.cafe.renovations;state.money-=fix.price;sim.applyLayout(cafeSnapshot(state))}if(['seekingSeat','toWait'].includes(g.phase))sim.startSeating(g,true);else sim.patienceTick(g,0);if(request&&(!g.concern||g.concern.key!==request.key))sim.completedRequestIds.add(g.id);if(!g.concern&&g.rescued)rewardGuest(sim,g);return fix}

export function availableChoices(sim,g,state){const first=availableFix(sim,g,state),choices=first?[first]:[];if(g?.concern?.key==='noise'){const divider=availableFix(sim,g,state,'divider');if(divider)choices.push(divider);}return choices;}
