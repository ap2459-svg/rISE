import * as THREE from './vendor/three.module.js';
export const DESIGNS={classic:{name:'Classic timber',extra:0},trestle:{name:'Farmhouse',extra:25},pedestal:{name:'Sculpted pedestal',extra:35},glass:{name:'Glass & steel',extra:55},upholstered:{name:'Soft upholstery',extra:40},curved:{name:'Curved lounge',extra:65}};
export function choices(type){return ['table','smallTable','longTable','groupTable','roundTable','highTable'].includes(type)?['classic','trestle','pedestal','glass']:['chair','armchair','sofa','booth','bench'].includes(type)?['classic','upholstered','curved']:['classic']}
export function upgradeCost(type,base,style,already=false){return Math.round(base*(already?.45:1))+(DESIGNS[style]?.extra||0)}
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.75});
function mesh(g,geo,c,x,y,z){const m=new THREE.Mesh(geo,typeof c==='string'?mat(c):c);m.position.set(x,y,z);g.add(m);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:'#493d32',transparent:true,opacity:.5}));m.add(edges);return m}
const box=(g,w,h,d,x,y,z,c)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);
const cyl=(g,r1,r2,h,x,y,z,c)=>mesh(g,new THREE.CylinderGeometry(r1,r2,h,28),c,x,y,z);
// All variants fit the existing collision footprint and preserve seat count.
export function styledFurniture(type,o){if(!o.upgraded||!o.design||o.design==='classic')return null;const g=new THREE.Group(),color=o.customColor||'#9baf91',wood='#b98451',dark='#3b4746';
 if(['table','smallTable','longTable','groupTable','roundTable','highTable'].includes(type)){
  const w=({smallTable:.85,longTable:2.8,groupTable:3,highTable:1.9})[type]||1.3,d=({smallTable:.85,longTable:1.1,groupTable:1.35,highTable:.9})[type]||1.3,h=type==='highTable'?1.05:.78,round=type==='roundTable';
  const top=o.design==='glass'?new THREE.MeshPhysicalMaterial({color:'#bee2e7',transparent:true,opacity:.72,roughness:.12,metalness:.15,depthWrite:false}):mat(wood);
  if(round)cyl(g,.74,.74,.11,0,h,0,top);else box(g,w,.11,d,0,h,0,top);
  if(o.design==='pedestal'){cyl(g,.13,.28,h-.09,0,h/2,0,color);cyl(g,Math.min(w,d)*.38,Math.min(w,d)*.42,.08,0,.05,0,color)}
  else if(o.design==='trestle'){for(const x of [-w*.33,w*.33]){for(const side of [-1,1]){const leg=box(g,.12,h-.1,.12,x,h/2,side*d*.29,color);leg.rotation.x=side*.24}box(g,.17,.12,d*.77,x,.18,0,color)}box(g,w*.72,.10,.10,0,.25,0,color)}
  else for(const x of [-1,1])for(const z of [-1,1])cyl(g,.027,.027,h-.08,x*(w/2-.08),h/2,z*(d/2-.08),color);
  return g;
 }
 if(['chair','armchair','sofa','bench','booth'].includes(type)){
  const booth=type==='booth',w=type==='sofa'?2.2:type==='bench'?1.8:booth?2.4:type==='armchair'?.95:.59;
  const seating=(z,flip)=>{const subgroup=new THREE.Group();g.add(subgroup);subgroup.position.z=z;subgroup.rotation.y=flip?Math.PI:0;
   box(subgroup,w,.18,.55,0,.47,0,color);box(subgroup,w,.48,.12,0,.78,.26,color);
   if(o.design==='curved'){for(const side of [-1,1]){const arm=box(subgroup,.10,.33,.55,side*(w/2-.04),.69,.02,color);arm.rotation.z=-side*.12}const back=mesh(subgroup,new THREE.SphereGeometry(1,16,10),color,0,.91,.25);back.scale.set(w*.49,.22,.09)}
   for(const x of [-w*.37,w*.37])for(const zz of [-.21,.21]){const leg=cyl(subgroup,.035,.025,.4,x,.2,zz,dark);leg.rotation.z=x*.08}
  };
  if(booth){seating(-.62,false);seating(.62,true);box(g,2.1,.1,.63,0,.77,0,wood);cyl(g,.07,.12,.7,0,.36,0,dark)}else seating(0,false);
  return g;
 }return null;
}
export function floorPattern(kind,color='#e7d4af'){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,512,512);
 if(kind==='checker'){for(let a=0;a<8;a++)for(let b=0;b<8;b++){x.fillStyle=(a+b)%2?'#465c52':color;x.fillRect(a*64,b*64,64,64)}}
 if(kind==='terrazzo'){let seed=123;for(let i=0;i<1000;i++){seed=(seed*1664525+1013904223)>>>0;const a=seed%512;seed=(seed*1664525+1013904223)>>>0;const b=seed%512;x.fillStyle=['#c89577','#faf0d8','#6c8273','#9a8c7c'][i%4];x.beginPath();x.moveTo(a,b);x.lineTo(a+3+i%6,b+2);x.lineTo(a+2,b+5+i%5);x.fill()}}
 if(kind==='tile'){x.strokeStyle='#9e947f';x.lineWidth=3;for(let i=0;i<=512;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.moveTo(0,i);x.lineTo(512,i);x.stroke()}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;
}
