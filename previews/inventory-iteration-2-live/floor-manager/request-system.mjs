import {SIMULATION_RATE,SHIFT_MINUTES} from './shift-clock.mjs?v=crowds-40';
import {lightAt,outletAt,noiseAt,WINDOWS,worldPoint} from './day.mjs?v=crowds-40';
import {placement,overlap,ENTRY} from './layout.mjs?v=crowds-40';
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const active=g=>g&&!['pending','departed','exiting'].includes(g.phase);
const seated=g=>g?.phase==='seated';
export const REQUEST_RULES=[{seconds:75,max:1},{seconds:60,max:2},{seconds:45,max:3},{seconds:35,max:4}];
export const ruleFor=sim=>REQUEST_RULES[Math.min(3,(sim.cafe.dayNumber||1)-1)];
export const DEFINITIONS={
 outlets:{label:'Charging',lines:['No outlet at this table.'],hint:'Add charging at their table, or offer a reachable seat with power.',thanks:'Perfect—I can charge now!'},
 lighting:{label:'Reading light',lines:['It’s too dark to read.'],hint:'Place a hanging ceiling lamp above their table, or offer a brighter seat near an open window.',thanks:'I can read comfortably now.'},
 comfort:{label:'Seating comfort',lines:['This chair needs better support.'],hint:'Upgrade their chair’s upholstery, or offer a supportive seat.',thanks:'This seat feels much better.'},
 seating:{label:'Seating',lines:['We need somewhere to sit.'],hint:'Offer enough reachable seats at one table.',thanks:'We have seats now!'},
 access:{label:'Clear access',lines:['I can’t get through this walkway.'],hint:'Move furniture away from the route to their seat or bathroom.',thanks:'I can get through now.'},
 noise:{label:'Quiet and conversation',lines:['The college students are too loud.','We need somewhere to chat and study together.'],hint:'Separate work and group seats, or seat one party in an acoustic booth.',thanks:'I have the space I need.'},
 temperature:{label:'Cool and cozy',lines:['I need AC. It’s hot.','I like it warm and cozy.'],hint:'Place AC near the hot customer. Keep the other customer outside its blue cooling area.',thanks:'This temperature works for me.'},
 lightConflict:{label:'Bright and cozy',lines:['It’s too dark to read.','I like dim, cozy lighting.'],hint:'Use a local reading lamp instead of brightening the whole café.',thanks:'The lighting works for me.'},
 space:{label:'Chair clearance',lines:['I need more room behind my chair.','Your chair is pushing into mine.'],hint:'Move the tables farther apart while keeping both parties seated.',thanks:'There’s room for my chair now.'},
 sharedPower:{label:'Sharing a socket',lines:['My battery is low, but the nearby socket is already in use.','I’m using that socket for work. Please keep my laptop plugged in.'],hint:'Add a charging outlet to the first customer’s table. Keep the other customer’s power connected.',thanks:'We both have power now—thank you!'},
 bathroom:{label:'Bathroom',lines:['There’s nowhere to use the bathroom.'],hint:'Build a bathroom in Renovations and keep its doorway reachable.',thanks:'Thanks for adding a bathroom.'},
 groupPower:{label:'Power and group seating',lines:['I’m using this table because it has an outlet.','There are four of us. Can we use the bigger table?'],hint:'Add power to a smaller desk, offer it to the solo customer, then seat the group at the larger table.',thanks:'This table works for me.'},
 glare:{label:'Daylight and screens',lines:['Can you open the blinds? It feels dark.','The sunlight makes my screen hard to see.'],hint:'Open the nearby blind and rotate the laptop desk so the screen faces away from the window.',thanks:'Daylight without the glare—thank you.'}
};
export function initRequests(sim){sim.requests=[];sim.nextRequestAt=0;sim.hintCosts=0;sim.purchaseCosts=0;sim.assetSales=0;sim.openingMoney=sim.cafe.money||0;sim.openingAssetSales=sim.cafe.assetSaleTotal||0;sim.comfortIds=new Set();sim.accessSamples=0;sim.clearAccessSamples=0;sim.requestSeq=0;}
export function requestFor(sim,g){return sim.requests?.find(r=>r.id===g?.requestId)||null;}
export function nearbyWindow(sim,g){return WINDOWS.filter(w=>!sim.cafe.soldWindows?.includes(w.id)).sort((a,b)=>distance(a,g?.seat||g?.pos)-distance(b,g?.seat||g?.pos))[0];}
export function coolingAt(sim,g){return sim.cafe.objects.some(o=>o.type==='ac'&&o.enabled!==false&&distance(o,g.seat||g.pos)<3.5);}
export function requestFeedback(sim,r,index=0){
 const definition=DEFINITIONS[r.kind];
 if(r.kind==='temperature'&&['active','resolved'].includes(r.status)){
  if(r.progress[index])return index===0?'It’s cooler now—thanks!':'Still warm and cozy.';
  const guest=sim.parties.find(g=>g.id===r.guests[index]);
  if(seated(guest)){
   if(index===1&&coolingAt(sim,guest))return 'The AC makes my seat too cold.';
   if(index===0&&sim.cafe.objects.some(o=>o.type==='ac'&&o.enabled!==false))return 'The AC isn’t reaching my seat.';
  }
 }
 return r.status==='resolved'?definition.thanks:r.lines?.[index]||definition.lines[index]||definition.lines[0];
}
export function glareAt(sim,g){const w=nearbyWindow(sim,g),t=sim.tables.find(t=>t.id===g.tableId);if(!w||!t||distance(w,g.seat)>4.8||sim.cafe.blinds?.[w.id]==='closed')return false;const dx=w.x-t.x,dz=w.z-t.z,len=Math.hypot(dx,dz)||1;return Math.abs((-Math.sin(t.r||0)*dx-Math.cos(t.r||0)*dz)/len)>.7;}
export function chairClear(sim,g){if(!g.seat)return false;if(g.seat.builtIn)return !!sim.seatPath(g.seat);const behind=worldPoint(g.seat,0,.65);return !sim.cafe.objects.some(o=>o.id!==g.seat.id&&o.id!==g.tableId&&overlap(o,{type:'fixture',x:behind.x,z:behind.z,width:.7,depth:.7},.04))&&!!sim.seatPath(g.seat);}
function groupFits(sim,g){return seated(g)&&g.memberSeats?.length>=g.size&&g.memberSeats.every(s=>!!sim.seatPath(s));}
function factors(sim,g){const table=sim.tables.find(t=>t.id===g?.tableId);return g?.seat&&table?sim.factors(g,g.seat,table):null;}
export function evaluateRequest(sim,r){const [a,b]=r.guests.map(id=>sim.parties.find(g=>g.id===id)),fa=factors(sim,a),fb=factors(sim,b),valid=seated(a);const quiet=g=>{const f=factors(sim,g);return seated(g)&&f?.quiet>=.82;};switch(r.kind){
 case'outlets':return [valid&&!!fa?.outlet];
 case'lighting':return [valid&&lightAt(sim.cafe,a.seat)>=.35];
 case'comfort':return [valid&&fa?.comfort>=.95];
 case'seating':return [groupFits(sim,a)];
 case'access':return [active(a)&&!!sim.path(ENTRY,a.seatApproach||a.pos,a.accessible?.34:.18)&&(!sim.bathrooms.length||sim.bathrooms.some(d=>sim.path(a.seatApproach||a.pos,d)))];
 case'noise':return [quiet(a),groupFits(sim,b)];
 case'temperature':return [valid&&coolingAt(sim,a),seated(b)&&!coolingAt(sim,b)];
 case'lightConflict':return [valid&&fa?.light>=.5,seated(b)&&lightAt(sim.cafe,b.seat)<=.58];
 case'space':return [valid&&chairClear(sim,a),seated(b)&&chairClear(sim,b)];
 case'sharedPower':return [valid&&!!fa?.outlet,seated(b)&&!!fb?.outlet];
 case'bathroom':return [active(a)&&!!(a.usedBathroom||a.bathroomDone||sim.bathroomAvailable(a))];
 case'groupPower':return [valid&&fa?.outlet&&a.tableId!==r.originalTable,groupFits(sim,b)&&b.tableId!==a.tableId];
 case'glare':{const w=nearbyWindow(sim,a);return [valid&&w&&sim.cafe.blinds?.[w.id]!=='closed'&&distance(w,a.seat)<4.8,seated(b)&&!glareAt(sim,b)];}
 default:return [false];}}
export function makeRequest(sim,kind,guests){if(kind==='bathroom'&&sim.bathrooms.length)return null;const rules=ruleFor(sim),total=rules.seconds*SIMULATION_RATE;if(sim.time+total>SHIFT_MINUTES||sim.requests.filter(r=>r.status==='active').length>=rules.max||guests.some(g=>!active(g)||requestFor(sim,g)?.status==='active'))return null;
 const r={id:'request-'+(++sim.requestSeq),kind,key:kind,guests:guests.map(g=>g.id),status:'active',total,remaining:total,started:sim.time,revision:sim.layoutRevision,originalTable:guests[0].tableId,baseline:sim.cafe.objects.map(o=>({id:o.id,x:o.x,z:o.z,r:o.r||0})),costAtStart:sim.purchaseCosts,progress:guests.map(()=>false),hintBought:false,stable:0};r.progress=evaluateRequest(sim,r);if(r.progress.every(Boolean))return null;r.lines=[...DEFINITIONS[kind].lines];if(kind==='groupPower')r.lines[1]='There are '+guests[1].size+' of us. Can we use the bigger table?';if(kind==='temperature'){guests[0].temperaturePreference='cool';guests[1].temperaturePreference='warm';}if(kind==='glare'&&sim.cafe.blinds?.[nearbyWindow(sim,guests[0])?.id]!=='closed')r.lines[0]='I like the daylight here.';sim.requests.push(r);for(const g of guests){g.requestId=r.id;g.concern=r;g.requestSeen||=[];g.requestSeen.push(kind);g.requestLog||=[];g.requestLog.push({id:r.id,kind,status:'active'});g.requestCooldown=sim.time+10*SIMULATION_RATE;}sim.nextRequestAt=sim.time+Math.max(2,9-(sim.cafe.dayNumber||1)*2)*SIMULATION_RATE;return r;}
function resolveRequest(sim,r){r.status='resolved';r.resolvedAt=sim.time;r.progress=r.guests.map(()=>true);sim.completedRequestIds.add(r.id);const moved=r.baseline.some(o=>{const n=sim.cafe.objects.find(n=>n.id===o.id);return n&&(distance(o,n)>.15||Math.abs(o.r-(n.r||0))>.1)});r.rearranged=moved&&sim.purchaseCosts<=r.costAtStart+.01;for(const id of r.guests){const g=sim.parties.find(g=>g.id===id);if(!g)continue;g.concern=null;g.pendingNeed=null;g.rescued=true;g.reliefUntil=sim.time+5;g.requestCooldown=sim.time+12*SIMULATION_RATE;g.sat=Math.min(1,g.sat+.12);g.requestLog.find(x=>x.id===r.id).status='resolved';sim.say(g,DEFINITIONS[r.kind].thanks);}r.ratingAtResolution=r.guests.map(id=>sim.parties.find(g=>g.id===id)?.sat||0);}
function expireRequest(sim,r){r.status='expired';for(const id of r.guests){const g=sim.parties.find(g=>g.id===id);if(!g)continue;const log=g.requestLog.find(x=>x.id===r.id);const met=r.progress[r.guests.indexOf(id)];if(log)log.status=met?'met':'unresolved';g.concern=null;g.requestCooldown=met?sim.time+10*SIMULATION_RATE:Infinity;if(!met&&active(g)){g.sat=Math.min(g.sat,.4);sim.say(g,'I couldn’t get what I needed.');g.requestExpired=true;sim.leave(g,r.kind==='access'?'unresolvedAccess':r.kind);}}}
function refreshComfortProgress(sim){for(const g of sim.parties.filter(seated)){const f=factors(sim,g);if(!f)continue;if(g.seatTime>=5&&f.comfort>=.95&&lightAt(sim.cafe,g.seat)>=.35&&(!['study','remote'].includes(g.type)||f.outlet)&&g.memberSeats?.every(s=>sim.seatPath(s)))g.ergonomicVisit=true;if(g.initialComfort==null){const baseline=sim.cafe.comfortBaseline?.objects.find(o=>o.id===g.seat.id)||sim.cafe.comfortBaseline?.objects.find(o=>o.id===g.tableId);g.initialComfort=baseline?(baseline.seatUpgrades?.[g.seat.seatIndex]?1:baseline.upgraded?(['upholstered','curved'].includes(baseline.design)?1:.88):.43):f.comfort;}if(f.comfort-g.initialComfort>.05&&f.comfort>=.8)sim.comfortIds.add(g.id);}}
export function updateRequests(sim,dt=0){if(!sim.requests)return;
 for(const r of sim.requests.filter(r=>r.status==='active')){if(r.kind==='bathroom'&&sim.bathrooms.length&&!r.guests.every(id=>{const g=sim.parties.find(g=>g.id===id);return g&&sim.bathroomAvailable(g);})){r.kind=r.key='access';r.lines=[DEFINITIONS.access.lines[0]];for(const id of r.guests){const g=sim.parties.find(g=>g.id===id);const log=g?.requestLog?.find(l=>l.id===r.id);if(log)log.kind='access';}}if(r.kind==='bathroom'&&r.guests.every(id=>{const g=sim.parties.find(g=>g.id===id);return g&&active(g)&&sim.bathroomAvailable(g);})){for(const id of r.guests){const g=sim.parties.find(g=>g.id===id);if(g.phase==='needsBathroom')sim.bathroomTrip(g);}resolveRequest(sim,r);continue;}r.remaining=Math.max(0,r.remaining-dt);r.progress=evaluateRequest(sim,r);const allHere=r.guests.every(id=>active(sim.parties.find(g=>g.id===id)));if(!allHere){expireRequest(sim,r);continue;}r.stable=r.solutionAttempt&&r.progress.every(Boolean)?r.stable+dt:0;if(r.stable>=1.2*SIMULATION_RATE){resolveRequest(sim,r);continue;}for(const id of r.guests){const g=sim.parties.find(g=>g.id===id);if(!r.progress[r.guests.indexOf(id)])g.sat=Math.max(.1,g.sat-dt*.0015);}if(r.remaining<=0)expireRequest(sim,r);}
 refreshComfortProgress(sim);
 for(const g of sim.parties){ if(seated(g)&&!g.concern&&g.seatTime>=5&&!g.preparedNeedCounted){const f=factors(sim,g);if(f&&lightAt(sim.cafe,g.seat)>=.35&&(!['study','remote'].includes(g.type)||f.outlet)&&f.comfort>=.95){g.preparedNeedCounted=true;sim.comfortIds.add(g.id);const id='request-'+(++sim.requestSeq);sim.requests.push({id,kind:'comfort',guests:[g.id],status:'resolved',progress:[true],prepared:true});sim.completedRequestIds.add(id);g.requestLog||=[];g.requestLog.push({id,kind:'comfort',status:'resolved',prepared:true});}}}

 if(dt>0&&Math.floor(sim.time)!==sim.lastAccessCheck){sim.lastAccessCheck=Math.floor(sim.time);const occupied=sim.parties.filter(seated);if(occupied.length){sim.accessSamples++;if(occupied.every(g=>g.memberSeats.every(s=>sim.seatPath(s)))&&sim.bathrooms.length&&occupied.every(g=>sim.bathrooms.some(d=>sim.path(g.seatApproach,d,g.accessible?.34:.18))))sim.clearAccessSamples++;}}
 if(dt===0||sim.time<sim.nextRequestAt||sim.time+ruleFor(sim).seconds*SIMULATION_RATE>SHIFT_MINUTES||sim.requests.filter(r=>r.status==='active').length>=ruleFor(sim).max)return;
 const free=sim.parties.filter(g=>active(g)&&(g.served||g.phase==='helpRoute')&&!requestFor(sim,g)?.status?.includes('active')&&sim.time>=(g.requestCooldown||0)),available=(g,k)=>g&&!g.requestSeen?.includes(k),study=free.filter(g=>['study','remote'].includes(g.type)),groups=free.filter(g=>['social','teens'].includes(g.type)),sit=free.filter(seated),level=sim.cafe.dayNumber||1;
 const offer=(kind,guests)=>guests.every(g=>available(g,kind))&&makeRequest(sim,kind,guests);
 if(false){for(const a of study.filter(g=>seated(g)&&!factors(sim,g)?.outlet)){const b=study.find(g=>g!==a&&seated(g)&&g.tableId!==a.tableId&&factors(sim,g)?.outlet&&distance(g.seat,a.seat)<6);if(b&&offer('sharedPower',[a,b]))return;}
 for(const a of study.filter(seated)){const b=groups.find(g=>g.size>=3&&['seekingSeat','toWait'].includes(g.phase));if(b&&a.capacity>=b.size&&outletAt(sim.cafe,a.seat)&&offer('groupPower',[a,b]))return;}
 for(const a of sit.filter(g=>!['study','remote'].includes(g.type))){const w=nearbyWindow(sim,a),b=study.find(g=>seated(g)&&glareAt(sim,g));if(w&&b&&distance(w,a.seat)<4.8&&offer('glare',[a,b]))return;}}
 if(false){for(const a of study.filter(seated)){const b=groups.find(g=>seated(g)&&distance(g.seat,a.seat)<6);if(b&&noiseAt(sim.cafe,a.seat,sim.parties)>.18&&offer('noise',[a,b]))return;}
 if(level===2||level===4){const hot=sit.find(g=>g.index%3===0&&!coolingAt(sim,g)),warm=sit.find(g=>g!==hot);if(hot&&warm&&offer('temperature',[hot,warm]))return;
 const reader=study.find(g=>seated(g)&&factors(sim,g).light<.5),cozy=sit.find(g=>g!==reader&&!['study','remote'].includes(g.type));if(reader&&cozy&&offer('lightConflict',[reader,cozy]))return;
 for(const a of sit){const b=sit.find(g=>g!==a&&distance(g.seat,a.seat)<2);if(b&&(!chairClear(sim,a)||!chairClear(sim,b))&&offer('space',[a,b]))return;}}}
 for(const g of free){let kind;if(g.phase==='needsBathroom'){if(sim.bathrooms.length){sim.bathroomTrip(g);continue;}kind='bathroom';}else if(g.phase==='helpRoute')kind='access';else if(['seekingSeat','toWait'].includes(g.phase))kind='seating';else if(seated(g)&&((level===1)||g.seatTime>=5)){const f=factors(sim,g);if(['study','remote'].includes(g.type)&&!f.outlet)kind='outlets';else if(lightAt(sim.cafe,g.seat)<.35)kind='lighting';else if(level>=2&&f.comfort<.95)kind='comfort';}if(kind&&offer(kind,[g]))return;

}
}
export function buyHint(sim,r,state){if(!r||sim.cafe.dayNumber<2)return false;if(r.hintBought)return true;if(state.money<30)return false;state.money-=30;state.hintSpent=(state.hintSpent||0)+30;r.hintBought=true;sim.hintCosts+=30;return true;}
export function restoreHint(sim,id){const r=sim.requests.find(r=>r.id===id);if(r&&!r.hintBought){r.hintBought=true;sim.hintCosts+=30;}}
export function requestStats(sim){const done=sim.requests.filter(r=>r.status==='resolved'),conflicts=done.filter(r=>r.guests.length===2&&r.guests.every(id=>{const g=sim.parties.find(g=>g.id===id);return g&&g.sat>=.6;}));return {ergonomicVisits:sim.parties.filter(g=>g.ergonomicVisit).length,completedRequests:done.length,conflictsResolved:conflicts.length,rearrangedRequests:done.filter(r=>r.rearranged).length,comfortImproved:[...sim.comfortIds].reduce((n,id)=>n+(sim.parties.find(g=>g.id===id)?.size||0),0),accessClear:sim.accessSamples?sim.clearAccessSamples/sim.accessSamples*100:0};}
export function recognizeAreas(sim){const areas={social:[],focus:[],cozy:[]};for(const t of sim.tables){const seats=sim.seats.filter(s=>s.tableId===t.id&&sim.seatPath(s));if(!seats.length)continue;const p=seats[0],f=sim.factors({type:'study',size:1},p,t),noise=noiseAt(sim.cafe,p,sim.parties);if(seats.length>=3)areas.social.push(t.id);else if(outletAt(sim.cafe,p)&&f.light>=.5&&noise<=.32)areas.focus.push(t.id);else if(['armchair','sofa','bench'].includes(t.type)||f.comfort>=.95&&lightAt(sim.cafe,p)<=.58)areas.cozy.push(t.id);}return areas;}
export function layoutMissionStats(sim){const area=recognizeAreas(sim);const reachable=sim.tables.filter(t=>sim.seats.some(s=>s.tableId===t.id)&&sim.seats.filter(s=>s.tableId===t.id).every(s=>sim.seatPath(s))),routeClear=!!sim.path(ENTRY,sim.order)&&!!sim.path(sim.order,sim.pickup)&&reachable.length===sim.tables.length;return{clearTables:routeClear?reachable.length:0,areasReady:Object.values(area).filter(a=>a.length).length,areas:area};}
export function customerReviews(sim){return sim.parties.filter(g=>g.enter!==null).map(g=>{const logs=g.requestLog||[],resolved=logs.filter(l=>['resolved','met'].includes(l.status)),unresolved=logs.filter(l=>!['resolved','met'].includes(l.status));let text;if(unresolved.length)text=({outlets:'I still had no charging at my table.',lighting:'My table stayed too dark.',comfort:'My chair still needed support.',noise:'The noise issue wasn’t resolved.',temperature:'The temperature still didn’t suit me.',lightConflict:'The lighting still didn’t work for us.',space:'Our chairs still felt crowded.',sharedPower:'We still couldn’t both charge our laptops.',bathroom:'I couldn’t use a bathroom.',groupPower:'We couldn’t get suitable seats and charging.',glare:'The daylight and glare problem remained.',access:'My route stayed blocked.',seating:'We couldn’t find usable seats.'})[unresolved.at(-1).kind];else if(resolved.length&&resolved.every(l=>l.prepared))text='My seat already had the comfort, light, and charging I needed.';else if(resolved.length)text=g.sat<.6?'My request was fixed, but the rest of my visit needed work.':DEFINITIONS[resolved.at(-1).kind].thanks;else text=!g.served?'I left without my order.':g.sat>=.7?'Comfortable space and a good visit.':g.sat>=.5?'A decent visit. There’s room to improve.':'The café wasn’t comfortable for me.';return{id:g.id,name:guestName(g),type:g.type,stars:Math.round(g.sat*50)/10,text,resolved:resolved.length,unresolved:unresolved.length};});}

export function requestBeforeEdit(sim){return new Map(sim.requests.filter(r=>r.status==='active').map(r=>[r.id,{progress:evaluateRequest(sim,r),bathrooms:sim.bathrooms.length,seating:sim.selectTable(sim.parties.find(g=>g.id===r.guests[0]))?.table.id}]));}
export function requestAfterEdit(sim,before){
 for(const r of sim.requests.filter(r=>r.status==='active')){
  const old=before.get(r.id);if(!old)continue;
  const now=evaluateRequest(sim,r);
  if(now.some((v,i)=>v&&!old.progress[i])||r.kind==='bathroom'&&sim.bathrooms.length>old.bathrooms||r.kind==='seating'&&!old.seating&&sim.selectTable(sim.parties.find(g=>g.id===r.guests[0])))r.solutionAttempt=true;
  // Committed edits must refresh feedback even while the shift is paused.
  r.progress=now;
  // Seated guests already experience their new support or cooling.
  // Complete verified improvements without advancing a paused shift.
  if(['lighting','outlets','comfort','sharedPower'].includes(r.kind)&&r.solutionAttempt&&now.every(Boolean))resolveRequest(sim,r);
 }
 refreshComfortProgress(sim);
}

export function guestName(g){return ['Alex','Sam','Jordan','Taylor','Morgan','Riley','Casey','Jamie','Avery','Drew','Cameron','Robin','Skyler','Emerson','Blake','Quinn'][g.index%16]+' '+['M','R','T','K','L','P','S'][(g.index*3)%7]+'.';}
