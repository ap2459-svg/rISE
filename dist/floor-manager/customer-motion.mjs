import {steeringStep} from './congestion.mjs?v=flow-48';
import {free,lineFree} from './layout.mjs?v=flow-48';
// Visual group members use the same obstacle-aware routes as the lead guest.
export function seatingRoute(sim, from, seat) {
  const approach = sim.seatPath(seat)?.path?.at(-2);
  if (!approach) return null;
  const path = visualRoute(sim, from, approach);
  return path ? path.slice(1) : null;
}
export function departureRoute(sim, from, seat, exit) {
  const approach = sim.seatPath(seat)?.path?.at(-2);
  if (!approach) return null;
  const atSeat = Math.hypot(from.x-seat.x, from.z-seat.z) < .25;
  const path = visualRoute(sim, atSeat ? approach : from, exit);
  return path ? (atSeat ? [approach, ...path.slice(1)] : path.slice(1)) : null;
}
export function advanceGuest(position,path,distance,blockers=[],options={}) {
 const next={x:position.x,z:position.z},objects=options.objects||[];
 // Other guests never stop this route. Furniture remains solid.
 distance*=options.color==='red'?.68:options.color==='yellow'?.86:1;
 let iterations=0;
 while(path?.length&&distance>0&&iterations++<40){
  const target=path[0],length=Math.hypot(target.x-next.x,target.z-next.z);
  if(length<.005){path.shift();continue;}
  const containing=objects.filter(o=>!free(next,[o],.24));
  const ignore=containing.length===1?containing[0]:null;
  const travel=Math.min(.1,distance,length),proposal=steeringStep(next,target,travel,objects,.24,[],ignore);
  if(!proposal)break;
  next.x=proposal.x;next.z=proposal.z;distance-=travel;
  if(Math.hypot(next.x-target.x,next.z-target.z)<.005)path.shift();
 }
 return next;
}

// Recover a rendered group member that clipped a chair/booth while following.
// Only its containing furniture is ignored on the short step OUT into an aisle.
export function visualRoute(sim,from,target){
 if(free(from,sim.obs,.24))return sim.path(from,target);
 const containing=sim.obs.filter(o=>!free(from,[o],.24));
 if(containing.length!==1)return null;
 const own=containing[0];
 for(const radius of [.3,.6,.9,1.2,1.8,2.4])for(let i=0;i<16;i++){
  const p={x:from.x+Math.cos(i*Math.PI/8)*radius,z:from.z+Math.sin(i*Math.PI/8)*radius};
  if(!free(p,sim.obs,.24)||!lineFree(from,p,sim.obs,.24,own))continue;
  const tail=sim.path(p,target);if(tail)return [{x:from.x,z:from.z},...tail];
 }
 return null;
}
export function refreshSeatRoute(sim,data,position,seat){
 const key=seat.id+':'+seat.x+':'+seat.z+':'+sim.layoutRevision;
 if(data.seatId===seat.id&&data.seatRoute?.length===0&&data.routeSeatX===seat.x&&data.routeSeatZ===seat.z){data.routeAttemptKey=key;data.routeRevision=sim.layoutRevision;return;}
 if(data.routeAttemptKey===key&&(data.seatRoute!==null||sim.time<(data.routeRetryAt||0)))return;
 data.routeAttemptKey=key;data.routeRetryAt=sim.time+1;
 data.seatRoute=seatingRoute(sim,position,seat);
 if(data.seatRoute){if(data.seatId!==seat.id){delete data.sitStart;delete data.sitFrom;delete data.departure;}data.seatId=seat.id;data.routeSeatX=seat.x;data.routeSeatZ=seat.z;data.routeRevision=sim.layoutRevision;}
}
