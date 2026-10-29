import {size,local,placement} from './layout.mjs?v=four-days-11';
export const SETS={
 longSet:{name:'Communal table · 4 seats',type:'longTable',price:330,offsets:[[-.75,-1,Math.PI],[.75,-1,Math.PI],[-.75,1,0],[.75,1,0]]},
 soloSet:{name:'Solo study desk · 1 seat',type:'smallTable',price:95,offsets:[[0,.9,0]]},
 squareSet:{name:'Coffee date · 2 seats',type:'table',price:200,offsets:[[-1.1,0,Math.PI/2],[1.1,0,-Math.PI/2]]},

 smallSet:{name:'Study pair · 2 seats',type:'smallTable',price:100,offsets:[[-.87,0,Math.PI/2],[.87,0,-Math.PI/2]]},
 roundSet:{name:'Round set · 4 seats',type:'roundTable',price:275,offsets:[[-1.2,0,Math.PI/2],[1.2,0,-Math.PI/2],[0,-1.2,Math.PI],[0,1.2,0]]},
 groupSet:{name:'Friends’ table · 6 seats',type:'groupTable',price:450,offsets:[[-1.95,0,Math.PI/2],[1.95,0,-Math.PI/2],[-.7,-1.14,Math.PI],[.7,-1.14,Math.PI],[-.7,1.14,0],[.7,1.14,0]]}
};
export function createSet(key,id,x=0,z=2){const s=SETS[key];return[{id,type:s.type,x,z,r:0,upgraded:true,setId:id},...s.offsets.map(([dx,dz,r],i)=>({id:id+'-chair-'+i,type:'chair',x:x+dx,z:z+dz,r,upgraded:true,setId:id}))]}
export function members(o,objects){return o.type!=='chair'&&o.setId?objects.filter(n=>n.setId===o.setId):[o]}
export function rememberSet(o,objects){return members(o,objects).map(n=>({id:n.id,x:n.x,z:n.z,r:n.r||0}))}
export function transformSet(o,originals,objects){const origin=originals.find(n=>n.id===o.id);if(!origin)return;const a=(o.r||0)-origin.r;for(const saved of originals){if(saved.id===o.id)continue;const item=objects.find(n=>n.id===saved.id);if(!item)continue;const x=saved.x-origin.x,z=saved.z-origin.z;Object.assign(item,{x:o.x+x*Math.cos(a)-z*Math.sin(a),z:o.z+x*Math.sin(a)+z*Math.cos(a),r:saved.r+a})}}
export function setPlacement(o,objects){const group=members(o,objects),results=group.map(n=>placement(n,objects));return results.includes('blocked')?'blocked':results.includes('tight')?'tight':'clear'}
export function linkStartingSets(s){for(const t of s.objects.filter(o=>['table','smallTable','roundTable','longTable','groupTable'].includes(o.type))){if(t.setId)continue;t.setId=t.id;for(const c of s.objects.filter(o=>o.type==='chair'&&!o.setId)){const p=local(c,t),h=size(t);if(Math.hypot(Math.max(0,Math.abs(p.x)-h.x),Math.max(0,Math.abs(p.z)-h.z))<.9)c.setId=t.id}}}
