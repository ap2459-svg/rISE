import * as THREE from './vendor/three.module.js';
import {paintedPatch} from './painted.mjs?v=four-days-11';

// All dimensions are metres. Origins sit on the floor and fronts face local -Z.
const C={ink:0x3d3029,walnut:0x82532f,cream:0xe8dbc1,sage:0x74876a,dark:0x344a43,brass:0xb59050,terra:0xb36745};
const materials=new Map(),labels=new Map();
function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.92}));return materials.get(color)}
const outlineMaterial=new THREE.LineBasicMaterial({color:C.ink,transparent:true,opacity:.72});
function mesh(g,geometry,color,x=0,y=0,z=0,outline=true){const m=new THREE.Mesh(geometry,typeof color==='number'?material(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);if(outline){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,24),outlineMaterial);edges.userData.isOutline=true;m.add(edges)}return m}
function box(g,w,h,d,x,y,z,color,outline=true){return mesh(g,new THREE.BoxGeometry(w,h,d),color,x,y,z,outline)}
function cylinder(g,r1,r2,h,x,y,z,color,n=20,outline=false){return mesh(g,new THREE.CylinderGeometry(r1,r2,h,n),color,x,y,z,outline)}
function rod(g,a,b,r,color){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const m=cylinder(g,r,r,delta.length(),0,0,0,color,10);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m}
function stroke(g,points,color=C.ink,opacity=.5){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:true,opacity}));g.add(m);return m}
function wood(up){return paintedPatch(up,[590,710,410,245],true)}
function wear(g,w,d,y){for(let i=0;i<8;i++){const x=(i*.231%1-.5)*w*.85,z=(i*.387%1-.5)*d*.8;stroke(g,[[x,y,z],[x+.08+(i%2)*.08,y,z+.025]],0xd1b98f,.6)}}
function tabletop(g,w,d,height,up){box(g,w,.11,d,0,height-.055,0,wood(up));box(g,w-.13,.11,d-.13,0,height-.16,0,up?C.walnut:0x625343);for(const x of[-1,1])for(const z of[-1,1]){const m=box(g,.10,height-.12,.10,x*(w/2-.13),(height-.12)/2,z*(d/2-.13),up?C.walnut:0x665844);m.rotation.z=x*.025}if(!up)wear(g,w,d,height+.002)}
function labelTexture(text,sub='',arrow=false){const key=text+'/'+sub+'/'+arrow;if(labels.has(key))return labels.get(key);const canvas=document.createElement('canvas');canvas.width=384;canvas.height=320;const c=canvas.getContext('2d');c.fillStyle='#33463d';c.fillRect(0,0,384,320);c.strokeStyle='rgba(239,228,200,.15)';c.lineWidth=1;for(let i=0;i<40;i++){c.beginPath();c.moveTo(18,(i*71)%300+10);c.lineTo(24+(i*33)%330,(i*71)%300+9);c.stroke()}c.strokeStyle='#cfbd98';c.lineWidth=3;c.strokeRect(15,15,354,290);c.fillStyle='#eee4c9';c.font='bold 47px Georgia';c.textAlign='center';const lines=text.split('\n');lines.forEach((s,i)=>c.fillText(s,192,lines.length>1?101+i*58:119,340));if(arrow){c.lineWidth=10;c.strokeStyle='#d9c28a';c.lineCap='round';c.beginPath();c.moveTo(105,219);c.lineTo(278,219);c.moveTo(243,188);c.lineTo(278,219);c.lineTo(243,250);c.stroke()}else if(sub){c.font='25px Georgia';c.fillStyle='#cdbb93';c.fillText(sub,192,236,330)}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});labels.set(key,m);return m}
function board(g,text,w,h,y,z,sub='',arrow=false){box(g,w+.07,h+.07,.075,0,y,z,wood(true));const face=mesh(g,new THREE.PlaneGeometry(w,h),labelTexture(text,sub,arrow),0,y,z-.041,false);face.rotation.y=Math.PI;return face}
function leaf(g,x,y,z,i,scale=1){const m=mesh(g,new THREE.SphereGeometry(1,10,6),[0x527444,0x74945a,0x436540][i%3],x,y,z,false);m.scale.set(.09*scale,.28*scale,.035*scale);m.rotation.set(Math.cos(i*2.4)*.7,i*2.4,Math.sin(i*2.4)*.75);return m}
function plantCluster(g,x,z,height=1){for(let i=0;i<7;i++){const a=i*2.399,end=[x+Math.sin(a)*.15,height+(i%3)*.11,z+Math.cos(a)*.13];rod(g,[x,.52,z],end,.012,0x566141);leaf(g,...end,i,.9)}}
function bench(g,z,up){const sign=Math.sign(z);box(g,2.4,.20,.47,0,.30,z,wood(up));box(g,2.32,.12,.48,0,.46,z,up?C.sage:0x766f57);box(g,2.4,.65,.10,0,.74,sign*.885,wood(up));box(g,2.26,.47,.055,0,.79,sign*.832,up?C.sage:0x766f57);box(g,2.44,.05,.13,0,1.085,sign*.885,C.walnut);for(const x of[-1.12,1.12])box(g,.075,.17,.37,x,.085,z,C.walnut);for(const x of[-.58,0,.58])stroke(g,[[x,.58,sign*.795],[x,.99,sign*.795]],0x526049,.6);if(!up)wear(g,2.3,.4,.523)}
function stool(g,x,up){cylinder(g,.22,.23,.085,x,.705,0,wood(up),28,true);for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;rod(g,[x+Math.cos(a)*.20,.05,Math.sin(a)*.20],[x+Math.cos(a)*.145,.665,Math.sin(a)*.145],.026,C.dark)}const ring=mesh(g,new THREE.TorusGeometry(.195,.016,6,24),C.brass,x,.28,0,false);ring.rotation.x=Math.PI/2;if(up)cylinder(g,.20,.20,.035,x,.765,0,C.sage,24,true)}
function floorMark(g,color=0xbdad7c){const m=mesh(g,new THREE.RingGeometry(.34,.44,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),0,.014,-.07,false);m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=false;return m}

export function makeExpansionItem(type,upgraded=true,options={}){
 const g=new THREE.Group();g.userData.type=type;g.userData.upgraded=upgraded;
 if(type==='booth'){
  tabletop(g,1.94,.72,.82,upgraded);bench(g,-.64,upgraded);bench(g,.64,upgraded);
  g.userData.seats=[{x:-.57,z:-.64,r:Math.PI,y:.52},{x:.57,z:-.64,r:Math.PI,y:.52},{x:-.57,z:.64,r:0,y:.52},{x:.57,z:.64,r:0,y:.52}];
 }else if(type==='highTable'){
  tabletop(g,1.1,.75,1.08,upgraded);stool(g,-.72,upgraded);stool(g,.72,upgraded);
  g.userData.seats=[{x:-.72,z:0,r:Math.PI/2,y:upgraded?.783:.748},{x:.72,z:0,r:-Math.PI/2,y:upgraded?.783:.748}];
 }else if(type==='smallTable')tabletop(g,.85,.85,.8,upgraded);
 else if(type==='groupTable'){
  tabletop(g,3.0,1.35,.8,upgraded);for(const z of[-.43,.43])rod(g,[-1.32,.26,z],[1.32,.26,z],.035,C.walnut);stroke(g,[[-1.44,.802,0],[1.44,.802,0]],0x59452f,.36);
 }else if(type==='divider'){
  box(g,1.6,.47,.42,0,.28,0,wood(upgraded));box(g,1.6,.06,.42,0,.535,0,C.walnut);box(g,1.49,.025,.33,0,.575,0,0x4d4430,false);for(const x of[-.64,.64])box(g,.11,.065,.31,x,.032,0,C.dark);for(let i=0;i<5;i++)plantCluster(g,-.59+i*.295,Math.sin(i)*.04,.69+(i%2)*.04);
 }else if(type==='trashCan'){
  cylinder(g,.265,.235,.62,0,.34,0,upgraded?0x627364:0x645b4c,28,true);cylinder(g,.275,.275,.055,0,.665,0,C.dark,28,true);cylinder(g,.205,.205,.012,0,.696,0,0x262e27,28,false);for(let i=0;i<12;i++){const a=i*Math.PI/6;stroke(g,[[Math.cos(a)*.245,.10,Math.sin(a)*.245],[Math.cos(a)*.263,.60,Math.sin(a)*.263]],0xa9ad91,.38)}box(g,.16,.055,.08,0,.055,-.23,C.dark);const face=mesh(g,new THREE.PlaneGeometry(.22,.24),labelTexture('BIN'),0,.38,-.268,false);face.rotation.y=Math.PI;
 }else if(type==='sign'){
  for(const x of[-.265,.265]){rod(g,[x,.025,-.18],[x,.93,0],.025,C.walnut);rod(g,[x,.025,.18],[x,.93,0],.025,C.walnut)}
  board(g,options.label||'ORDER\nPICKUP',.55,.69,.81,-.025,'',true);box(g,.59,.035,.06,0,1.19,-.025,C.walnut);
 }else if(type==='wallDecor'){
  box(g,1.0,1.1,.08,0,1.9,0,wood(upgraded));const canvas=document.createElement('canvas');canvas.width=300;canvas.height=340;const c=canvas.getContext('2d');c.fillStyle='#e8dab9';c.fillRect(0,0,300,340);c.strokeStyle='#53694c';c.lineWidth=7;c.beginPath();c.moveTo(143,285);c.quadraticCurveTo(110,160,164,67);c.stroke();for(let i=0;i<7;i++){const x=132+Math.sin(i*.7)*18,y=92+i*24,side=i%2?-1:1;c.save();c.translate(x,y);c.rotate(side*.75);c.fillStyle=i%2?'#658450':'#8d9b66';c.beginPath();c.ellipse(side*26,-8,31,12,side*.4,0,Math.PI*2);c.fill();c.strokeStyle='#405a40';c.lineWidth=2;c.stroke();c.restore()}c.font='bold 24px Georgia';c.fillStyle='#5a4e38';c.textAlign='center';c.fillText('MAKE ROOM TO GROW',150,318,275);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;const p=mesh(g,new THREE.PlaneGeometry(.88,.98),new THREE.MeshBasicMaterial({map:t,toneMapped:false}),0,1.9,-.044,false);p.rotation.y=Math.PI;
 }else if(type==='order'||type==='pickup'){
  floorMark(g,type==='order'?0xc4aa72:0x8fa88a);const sign=new THREE.Group();sign.position.set(0,0,.30);g.add(sign);box(sign,.38,.035,.24,0,.022,0,C.walnut);rod(sign,[0,.04,0],[0,.79,0],.028,C.walnut);board(sign,type==='order'?'ORDER':'PICKUP',.55,.38,.68,-.012,type==='order'?'here':'collect here');
  g.userData.walkable=true;
 }else if(type==='path'){
  const mat=new THREE.MeshBasicMaterial({color:0xc9b780,transparent:true,opacity:.46,side:THREE.DoubleSide,depthWrite:false});for(const x of[-.53,.53])for(let i=0;i<5;i++){const m=mesh(g,new THREE.PlaneGeometry(.035,.21),mat,x,.012,-.83+i*.415,false);m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=false}
  for(let i=0;i<2;i++){const z=-.35+i*.7;stroke(g,[[-.14,.014,z+.13],[0,.014,z],[.14,.014,z+.13]],0xd5c390,.5)}g.userData.walkable=true;
 }else return null;
 return g;
}
