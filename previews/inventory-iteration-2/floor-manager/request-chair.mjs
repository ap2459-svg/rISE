import * as THREE from './vendor/three.module.js';
import {CATALOG} from './catalog.mjs?v=chair-shortcut-31';
import {upgradeCost} from './upgrade-designs.mjs?v=chair-shortcut-31';
import {requestFor} from './request-system.mjs?v=chair-shortcut-31';

export function chairUpgradeQuote(sim,state,guest){
 if(!sim||sim.done||guest?.phase!=='seated'||!['day-running','intervene'].includes(state.phase))return null;
 const request=requestFor(sim,guest),seat=sim.seats.find(s=>s.id===guest.seat?.id);
 if(request?.kind!=='comfort'||request.status!=='active'||!seat)return null;
 const target=state.objects.find(o=>o.id===(seat.builtIn?seat.tableId:seat.id));
 if(!target||target.upgraded&&['upholstered','curved'].includes(target.design))return null;
 if(seat.builtIn&&(!Number.isInteger(seat.seatIndex)||target.seatUpgrades?.[seat.seatIndex]))return null;
 const fullPrice=seat.builtIn?40:upgradeCost(target.type,CATALOG[target.type].price,'upholstered',target.upgraded);
 return {target,seatIndex:seat.seatIndex,builtIn:!!seat.builtIn,fullPrice,price:Math.max(0,fullPrice-(state.upgradeCredits||0))};
}
export function upgradeRequestedChair(sim,state,guest){
 const quote=chairUpgradeQuote(sim,state,guest);
 if(!quote||state.money<quote.price)return null;
 state.money-=quote.price;state.upgradeCredits=Math.max(0,(state.upgradeCredits||0)-quote.fullPrice);
 if(quote.builtIn){quote.target.seatUpgrades||={};quote.target.seatUpgrades[quote.seatIndex]=true;}
 else{quote.target.upgraded=true;quote.target.design='upholstered';delete quote.target.finish;}
 return quote;
}

// Built-in seating gets support at the requested seat, without replacing its
// table or altering the other seats, footprint, orientation or route.
export function addSeatCushions(group,item,seats){
 if(!item.seatUpgrades)return;
 const a=item.r||0,c=Math.cos(a),s=Math.sin(a);
 for(const seat of seats.filter(seat=>seat.tableId===item.id&&item.seatUpgrades[seat.seatIndex])){
  const pad=new THREE.Group(),dx=seat.x-item.x,dz=seat.z-item.z;
  pad.position.set(dx*c+dz*s,seat.y-.04,-dx*s+dz*c);pad.rotation.y=-(seat.r-a);
  const material=new THREE.MeshStandardMaterial({color:item.customColor||'#97ab8a',roughness:.85});
  const cushion=new THREE.Mesh(new THREE.BoxGeometry(.48,.07,.42),material);pad.add(cushion);
  const support=new THREE.Mesh(new THREE.BoxGeometry(.46,.28,.07),material);support.position.set(0,.17,.21);pad.add(support);
  group.add(pad);
 }
}
