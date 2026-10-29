import * as THREE from './vendor/three.module.js';
import {paintedPatch} from './painted.mjs?v=four-days-11';

// Floor origins; seats face local -Z unless their metadata says otherwise.
// These silhouettes use the café's painted timber, olive upholstery and ink edges.
const C={ink:0x3d3029,wood:0x80512e,woodDark:0x59402c,sage:0x758265,sageDark:0x525e46,ochre:0xba9056,cream:0xe5d7b6,brass:0xa68b51,iron:0x3b473b,terra:0xb96e4c};
const mats=new Map();
const ink=new THREE.LineBasicMaterial({color:C.ink,transparent:true,opacity:.64});
function mat(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.94}));return mats.get(color)}
function add(g,geo,color,x=0,y=0,z=0,edge=true){const m=new THREE.Mesh(geo,typeof color==='number'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);if(edge){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),ink);outline.userData.isOutline=true;m.add(outline)}return m}
function box(g,w,h,d,x,y,z,color,edge=true){return add(g,new THREE.BoxGeometry(w,h,d),color,x,y,z,edge)}
function cyl(g,rt,rb,h,x,y,z,color,n=24,edge=false){return add(g,new THREE.CylinderGeometry(rt,rb,h,n),color,x,y,z,edge)}
function line(g,points,color=C.ink,opacity=.45){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:true,opacity}));g.add(m);return m}
function rod(g,a,b,r,color){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),m=cyl(g,r,r,d.length(),0,0,0,color,10);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
function rounded(g,w,h,d,x,y,z,color,r=.055){r=Math.min(r,w/3,h/3,d/3);w-=1.4*r;h-=1.4*r;const s=new THREE.Shape(),l=-w/2+r,b=-h/2+r,rr=w/2-r,t=h/2-r;s.moveTo(l-r,b);s.quadraticCurveTo(l-r,b-r,l,b-r);s.lineTo(rr,b-r);s.quadraticCurveTo(rr+r,b-r,rr+r,b);s.lineTo(rr+r,t);s.quadraticCurveTo(rr+r,t+r,rr,t+r);s.lineTo(l,t+r);s.quadraticCurveTo(l-r,t+r,l-r,t);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.7,bevelSegments:2,steps:1,curveSegments:4});geo.translate(0,0,-(d-2*r)/2);return add(g,geo,color,x,y,z,true)}
function wood(up){return paintedPatch(up,[590,710,410,245],true)}
function wear(g,w,d,y){for(let i=0;i<6;i++){const x=(i*.193%1-.48)*w*.8,z=(i*.367%1-.5)*d*.75;line(g,[[x,y,z],[x+.07,y,z+.018]],0xc7b78f,.56)}}
function feet(g,w,d,y,up){for(const x of[-1,1])for(const z of[-1,1]){const a=[x*(w/2-.08),.035,z*(d/2-.1)],b=[x*(w/2-.115),y,z*(d/2-.13)];rod(g,a,b,.042,up?C.wood:0x655443);box(g,.085,.035,.085,a[0],.0175,a[2],C.woodDark,false)}}
function seatCushion(g,x,w,d,up,color){rounded(g,w,.135,d,x,.4525,-.035,up?color:0x82775f,.035);const z=-.035-d/2-.008;line(g,[[x-w/2+.045,.463,z],[x+w/2-.045,.463,z]],up?0xc7c5a2:0xa4987a,.6);if(!up)wear(g,w,d,.522)}
function backCushion(g,x,w,up,color){const m=rounded(g,w,.48,.15,x,.785,.365,up?color:0x7b725d,.045);m.rotation.x=-.10;line(g,[[x-w/2+.045,.63,.276],[x-w/2+.045,.92,.247],[x+w/2-.045,.92,.247],[x+w/2-.045,.63,.276]],up?0xb3b798:0xaaa085,.43);for(const px of[-.19,.19])cylButton(g,x+px,.79,.277,up?C.sageDark:0x625b4d)}
function cylButton(g,x,y,z,color){const m=cyl(g,.018,.018,.009,x,y,z,color,12);m.rotation.x=Math.PI/2;return m}
function throwPillow(g,x,up){const p=rounded(g,.30,.31,.13,x,.63,.205,up?C.cream:0xa99c7a,.035);p.rotation.z=x<0?.12:-.12;p.rotation.x=-.12;line(p,[[-.12,-.115,-.073],[-.12,.115,-.073],[.12,.115,-.073],[.12,-.115,-.073],[-.12,-.115,-.073]],0x967b51,.5);for(const dx of[-.07,0,.07])line(p,[[dx,-.10,-.077],[dx,.10,-.077]],up?0x9caa83:0x877c64,.62)}
function lounge(g,w,seats,up,armchair=false){const cloth=armchair?C.ochre:C.sage;feet(g,w,.90,.25,up);rounded(g,w-.06,.22,.85,0,.29,0,wood(up),.035);rounded(g,w-.13,.61,.17,0,.735,.405,wood(up),.035);for(const x of[-1,1]){rounded(g,.17,.39,.92,x*(w/2-.10),.515,-.015,up?(armchair?0xa47b48:C.sageDark):0x6e6652,.065);box(g,.11,.035,.81,x*(w/2-.10),.719,-.025,wood(up));}const inner=w-.42;for(let i=0;i<seats;i++){const x=seats===1?0:(i-.5)*1.10;seatCushion(g,x,inner/seats-.035,.72,up,cloth);backCushion(g,x,inner/seats-.03,up,cloth)}throwPillow(g,w*.29,up);if(seats>1)throwPillow(g,-w*.29,up)}
function stool(g,x,z,up){const y=.72;cyl(g,.195,.205,.065,x,y-.0325,z,wood(up),28,true);cyl(g,.177,.177,.025,x,y-.0125,z,up?C.sage:0x79745d,28,true);for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;rod(g,[x+Math.cos(a)*.18,.025,z+Math.sin(a)*.18],[x+Math.cos(a)*.125,y-.08,z+Math.sin(a)*.125],.023,C.iron)}const ring=add(g,new THREE.TorusGeometry(.165,.014,6,24),C.brass,x,.27,z,false);ring.rotation.x=Math.PI/2}
function leaf(g,start,end,width,color){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),d=b.clone().sub(a);const m=add(g,new THREE.SphereGeometry(1,10,6),color,0,0,0,false);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(width,d.length()/2,.012);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
function bloom(g,x,y,z,color,scale=1){for(let i=0;i<6;i++){const a=i*Math.PI/3,p=add(g,new THREE.SphereGeometry(1,9,6),color,x+Math.cos(a)*.035*scale,y+.006,z+Math.sin(a)*.035*scale,false);p.scale.set(.029*scale,.017*scale,.033*scale);p.rotation.y=-a}cyl(g,.018*scale,.022*scale,.027*scale,x,y+.019,z,0xc89e41,12)}

export function makeComfortItem(type,upgraded=true,options={}){
  const g=new THREE.Group();g.userData.type=type;g.userData.upgraded=upgraded;
  if(type==='armchair'){
    lounge(g,1,1,upgraded,true);g.userData.seats=[{x:0,z:0,r:0,y:.52}];
  }else if(type==='sofa'){
    lounge(g,2.3,2,upgraded);g.userData.seats=[{x:-.55,z:0,r:0,y:.52},{x:.55,z:0,r:0,y:.52}];
  }else if(type==='bench'){
    feet(g,1.82,.6,.4,upgraded);box(g,1.9,.09,.65,0,.40,0,wood(upgraded));for(const z of[-.205,0,.205])box(g,1.88,.055,.19,0,.4725,z,wood(upgraded));for(const x of[-.87,.87])rod(g,[x,.08,.25],[x,.94,.29],.034,C.woodDark);for(const y of[.68,.85]){const m=box(g,1.9,.12,.055,0,y,.29,wood(upgraded));m.rotation.x=-.08}rod(g,[-.83,.20,0],[.83,.20,0],.025,C.woodDark);if(!upgraded)wear(g,1.85,.6,.502);g.userData.seats=[{x:-.48,z:0,r:0,y:.5},{x:.48,z:0,r:0,y:.5}];
  }else if(type==='windowCounter'){
    box(g,2.5,.10,.5,0,1.00,.35,wood(upgraded));box(g,2.47,.045,.48,0,1.0725,.35,wood(upgraded));for(const x of[-1.12,1.12]){box(g,.10,.94,.10,x,.47,.48,C.wood);rod(g,[x,.55,.48],[x,.95,.11],.031,C.iron);box(g,.22,.045,.23,x,.025,.43,C.woodDark)}for(const x of[-.8,0,.8])stool(g,x,-.25,upgraded);line(g,[[-1.17,1.098,.35],[1.17,1.098,.35]],0x5c402c,.3);if(!upgraded)wear(g,2.4,.42,1.098);g.userData.seats=[-.8,0,.8].map(x=>({x,z:-.25,r:Math.PI,y:.72}));
  }else if(type==='deskLamp'){
    cyl(g,.17,.17,.055,0,.655,0,wood(upgraded),28,true);cyl(g,.037,.045,.56,0,.35,0,C.wood,16);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(g,[0,.13,0],[Math.cos(a)*.155,.028,Math.sin(a)*.155],.025,C.woodDark)}cyl(g,.092,.10,.035,0,.701,.035,C.brass,20,true);rod(g,[0,.725,.035],[0,1.10,.035],.019,C.brass);rod(g,[0,1.10,.035],[0,1.20,-.025],.017,C.brass);const shade=cyl(g,.055,.143,.16,0,1.206,-.025,upgraded?C.sageDark:0x706b55,28,true);shade.rotation.x=-.14;const rim=cyl(g,.145,.145,.018,0,1.122,-.013,C.brass,28,true);rim.rotation.x=-.14;const bulb=add(g,new THREE.SphereGeometry(.052,16,10),new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xffd38a,emissiveIntensity:.8,roughness:.45}),0,1.115,-.015,false);g.userData.light={x:0,y:1.1,z:-.015,color:0xffde9b};
  }else if(type==='floweringPlant'){
    cyl(g,.19,.145,.35,0,.205,0,upgraded?C.terra:0x8c755a,28,true);cyl(g,.203,.203,.045,0,.382,0,upgraded?0xcc8e63:0x9e8869,28,true);cyl(g,.174,.174,.018,0,.406,0,0x564b32,24);for(let i=0;i<11;i++){const a=i*2.399,r=.07+(i%3)*.045,tip=[Math.cos(a)*r,.805+(i%4)*.135,Math.sin(a)*r];rod(g,[0,.41,0],tip,.009,0x617342);for(let j=0;j<2;j++){const t=.43+j*.22,p=[tip[0]*t,.41+(tip[1]-.41)*t,tip[2]*t],angle=a+(j?-.7:.8),end=[p[0]+Math.cos(angle)*.13,p[1]+.11,p[2]+Math.sin(angle)*.13];leaf(g,p,end,.04,[0x6f874d,0x83975d,0x49643d][(i+j)%3])}bloom(g,...tip,i%3===0?0xe8d5a4:i%3===1?0xbd6e46:0xdba773,.82+(i%2)*.14)}for(const y of[.13,.19,.25]){const ring=add(g,new THREE.TorusGeometry(.161+(y-.13)*.12,.006,4,28),0xe0b27b,0,y,0,false);ring.rotation.x=Math.PI/2}
  }else return null;
  return g;
}
