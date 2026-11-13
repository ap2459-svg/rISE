import {recognizeAreas} from './request-system.mjs?v=crowds-40';
import {footprint} from './layout.mjs?v=crowds-40';

export const CAFE_ZONES = {
 social: {name:'Social corner',color:'#d58a50',needs:'3+ reachable seats together',items:['roundSet','longSet','booth','plant']},
 focus: {name:'Focus space',color:'#6888b7',needs:'Quiet desks · light · charging',items:['soloSet','smallSet','comfortableChair','light','tableOutlet','outlet']},
 cozy: {name:'Cozy lounge',color:'#b47d9c',needs:'Comfortable lounge seating',items:['armchair','plant','light']}
};

// Use the mission's actual area recognition, never a manually assigned zone.
export function cafeZoneMap(sim){
 const areas=recognizeAreas(sim),patches=[];
 for(const [key,ids] of Object.entries(areas))for(const id of ids){
  const table=sim.tables.find(t=>t.id===id);
  const seats=sim.seats.filter(s=>s.tableId===id&&sim.seatPath(s));
  const points=[table,...seats].flatMap(o=>footprint(o,.12));
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
  const back=Math.min(...points.map(p=>p.z)),front=Math.max(...points.map(p=>p.z));
  patches.push({key,id,x:(left+right)/2,z:(back+front)/2,width:right-left,depth:front-back,labelX:table.x,labelZ:table.z});
 }
 return {areas,patches};
}
