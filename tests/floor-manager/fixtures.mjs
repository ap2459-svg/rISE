import assert from 'node:assert/strict';
import {newDay} from '../../dist/floor-manager/day.mjs';
// Explicitly remove today's starter furniture when a scenario needs an empty room.
export function emptyCafe(){const s=newDay();s.objects=s.objects.filter(o=>!o.id.startsWith('starter-'));s.clean=s.waste=s.floor=s.paint=true;return s;}
export function seatGuest(sim,type,tableId){
 const g=sim.parties.find(g=>g.type===type),seat=sim.seats.find(s=>s.tableId===tableId);
 assert(g&&seat);const route=sim.seatPath(seat);assert(route,'Fixture seat must be reachable');
 Object.assign(g,{size:1,phase:'seated',enter:0,served:true,service:1,pos:{x:seat.x,z:seat.z},seat,tableId,tableIds:[tableId],memberSeats:[seat],seatApproach:route.path.at(-2),seatTime:5,sat:.6,satIntegral:3});
 sim.booked.set(tableId,g);return g;
}
