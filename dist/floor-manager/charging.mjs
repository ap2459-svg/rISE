export const TABLE_OUTLET_PRICE=45;
const HEIGHTS={table:.84,roundTable:.84,longTable:.84,smallTable:.8,groupTable:.8,booth:.8,highTable:1.08,windowCounter:1.1};
export function supportsCharging(table){return !!table&&HEIGHTS[table.type]!=null;}
export function tableOutlet(table,id){const a=table.r||0;return {id,type:'tableOutlet',parentTableId:table.id,x:table.x-Math.sin(a)*.12,z:table.z+Math.cos(a)*.12,y:HEIGHTS[table.type],r:a,upgraded:true};}
export function hasTableOutlet(s,table){return s.objects.some(o=>o.type==='tableOutlet'&&o.parentTableId===table.id);}
export function installTableOutlet(s,table,id){if(!supportsCharging(table)||hasTableOutlet(s,table)||s.money<TABLE_OUTLET_PRICE)return null;const o=tableOutlet(table,id);s.money-=TABLE_OUTLET_PRICE;s.objects.push(o);return o;}
