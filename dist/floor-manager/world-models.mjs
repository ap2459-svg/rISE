import {floorPattern} from './upgrade-designs.mjs?v=four-days-11';
import * as THREE from './vendor/three.module.js';
import {box,cyl,ball,plant,windowPanel,chalkboard,wallMap,textured,cobweb,makeItem} from './models.mjs?v=four-days-11';
import {paintedFloor,paintedPatch,wallSkin} from './painted.mjs?v=four-days-11';

// The original painted café, with a bigger usable floor and real extensions.
export function makeCafeRoom(state){
 const group=new THREE.Group(),walls=[],surfaces=[],dayWindows=[];
 // A grounded, café-only terrace: no unrelated neighborhood scenery.
 box(group,31,.25,29,-1.3,-.58,0,0x8b9277);
 box(group,23,.18,21,-1.3,-.37,0,0xb5a487);
 for(let x=-12;x<10;x+=1.5)for(let z=-10;z<11;z+=1.5)box(group,1.46,.018,1.46,x,-.268,z,((Math.round(x*2)+Math.round(z*2))%3)?0xc5b79b:0xb9ab8f,false);
 for(const [x,z] of [[-12,8.8],[-12,-8.8],[9,8.8],[9,-8.8]]){box(group,1.25,.55,1.25,x,-.02,z,0x6e6551);plant(group,x,.25,z,1.3)}
 const plaster=textured(wallMap(!!state.paint)),wood=paintedPatch(state.clean,[441,298,744,82],true);
 box(group,19.1,.28,16.5,-1.9,-.16,0,0x46372d);const floor=paintedFloor(state.floor);if(state.floor&&state.floorPattern&&state.floorPattern!=='wood'){const uv=floor.geometry.attributes.uv;const pos=floor.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+6)/12,(pos.getY(i)+7)/14);uv.needsUpdate=true;floor.material=new THREE.MeshStandardMaterial({map:floorPattern(state.floorPattern,state.surfaceColors?.floor),roughness:.8})}floor.scale.set(18.8/12,16.2/14,1);floor.position.x=-1.9;group.add(floor);surfaces.push(floor);
 function wall(axis,sign,center,length,position,fresh=false){const g=new THREE.Group();group.add(g);walls.push({group:g,axis,sign});const x=axis==='x'?position:center,z=axis==='z'?position:center;
  const w=axis==='x'?box(g,.18,4,length,x,2,z,fresh?textured(wallMap(true)):plaster,false):box(g,length,4,.18,x,2,z,fresh?textured(wallMap(true)):plaster,false);w.userData.surface='paint';surfaces.push(w);
  const skin=wallSkin(g,axis,sign,length,fresh||!!state.paint,fresh||!!state.clean);skin.position.set(axis==='x'?position-sign*.1:center,0,axis==='z'?position-sign*.1:center);
  if(axis==='x'){box(g,.21,.18,length,x,.12,z,wood);box(g,.22,.09,length,x,1.07,z,0xa17748);box(g,.22,.18,length,x,3.96,z,wood)}else{box(g,length,.18,.21,x,.12,z,wood);box(g,length,.09,.22,x,1.07,z,0xa17748);box(g,length,.18,.22,x,3.96,z,wood)}
  if(!fresh&&!state.clean){const web=cobweb(.9);web.position.set(axis==='x'?position-sign*.2:center-length/2+.03,3.88,axis==='z'?position-sign*.2:center-length/2+.03);if(axis==='x')web.rotation.y=Math.PI/2;g.add(web)}return g;
 }
 const back=wall('z',-1,-1.9,18.8,-8.1),left=wall('x',-1,0,16.2,-11.3),front=wall('z',1,-1.9,18.8,8.1);
 const rights=[];if(state.renovations?.nook){rights.push(wall('x',1,-5.05,6.1,7.5),wall('x',1,5.85,4.5,7.5));const header=new THREE.Group();group.add(header);walls.push({group:header,axis:'x',sign:1});box(header,.22,.45,5.6,7.5,3.8,.8,wood);
  box(group,3.8,.28,5.6,9.35,-.16,.8,0x46372d);const nf=paintedFloor(true);nf.scale.set(3.7/12,5.6/14,1);nf.position.set(9.35,.004,.8);nf.userData.surface=null;group.add(nf);
  wall('z',-1,9.35,3.7,-2,true);wall('z',1,9.35,3.7,3.6,true);const side=wall('x',1,.8,5.6,11.2,true);windowPanel(side,11.08,2.45,.8,2.6,2,'x',{clean:true},surfaces);plant(group,10.7,0,-1.55,.9);
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(3.7,5.6),new THREE.MeshBasicMaterial({color:0xd9c49e,side:THREE.DoubleSide}));ceiling.rotation.x=Math.PI/2;ceiling.position.set(9.35,4.04,.8);group.add(ceiling);group.userData.nookCeiling=ceiling;
  const rug=makeItem('rug',true);rug.position.set(8.2,0,.8);rug.scale.set(.5,1,1.6);group.add(rug);
 }else rights.push(wall('x',1,0,16.2,7.5));
 for(const z of[-4.8,-.6,3.7])windowPanel(left,-11.14,2.35,z,3.3,2.3,'x',state,surfaces);
 for(const x of[-9.2,-5.4,-1.5,2.4])windowPanel(front,x,2.35,7.96,3.4,2.3,'z',state,surfaces);
 if(state.renovations?.window)windowPanel(rights.at(-1),7.34,2.4,5.1,2.7,2.3,'x',{clean:true},surfaces);
 // Entrance leaf swings inward as arrivals cross the threshold.
 box(front,1.6,3.1,.13,6,1.55,7.94,0x4a3828);const door=new THREE.Group();door.position.set(5.28,0,7.84);front.add(door);box(door,1.42,2.98,.11,.71,1.50,0,0x637451);windowPanel(door,.71,2.04,-.08,1.06,1.58,'z',state,surfaces);ball(door,.055,1.25,1.18,-.14,0xc6a45e);group.userData.entryDoor=door;
 label(back,'STUDY CORNER',-9.1,3.25,-7.96,3.1);
 const boards=new THREE.Group();boards.position.z=-1.13;back.add(boards);for(const [i,x]of[-3.6,-1.42,.76].entries())chalkboard(boards,x,['COFFEE','BAKERY','SPECIALS'][i]);
 // Pale plaster, olive cabinetry, brass and plants from the Barista room.
 box(group,.88,1.76,.75,-6.55,.89,-7.25,0xbab9a2);box(group,.76,1.25,.04,-6.55,1,-6.85,0x97a68c);box(group,.05,.4,.06,-6.24,1.12,-6.81,0x354339);
 cyl(group,.28,.24,.61,-6.7,.32,-4.9,0x344a43,16,true);cyl(group,.29,.29,.04,-6.7,.64,-4.9,0x536452,16,true);
 if(state.renovations?.bathroom)bathrooms(group,walls,state.renovations.bathrooms);else{const shelf=makeItem('bookshelf',false);shelf.position.set(6,0,-7);group.add(shelf);}
 if(!state.waste){for(const [x,z]of[[-4.9,2.4],[4.75,-2.9]]){const trash=makeItem('trash');trash.position.set(x,0,z);trash.traverse(o=>{if(o.isMesh)o.userData.surface='waste'});group.add(trash)}for(let i=0;i<12;i++){const p=box(group,.25,.008,.20,-5.5+(i*1.371)%11,.014,-3.6+(i*2.317)%10.4,0xc4b393,false);p.rotation.y=i*.73;p.userData.surface='waste'}}
 group.traverse(o=>{if(o.isMesh&&o.userData.surface==='clean'&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.depth===.025){o.material=o.material.clone();o.userData.dayWindow=true;dayWindows.push(o)}});
 group.userData.dayWindows=dayWindows;return {group,walls,surfaces};
}
function label(parent,text,x,y,z,w){const c=document.createElement('canvas');c.width=384;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#30483b';ctx.fillRect(0,0,384,128);ctx.strokeStyle='#c6a56a';ctx.lineWidth=10;ctx.strokeRect(5,5,374,118);ctx.fillStyle='#fff3d6';ctx.font='bold 40px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,192,67);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/3),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);parent.add(m)}
function bathrooms(root,walls,dual){const g=new THREE.Group();root.add(g);const front=new THREE.Group(),side=new THREE.Group(),divider=new THREE.Group();g.add(front,side,divider);walls.push({group:front,axis:'z',sign:1},{group:side,axis:'x',sign:-1},{group:divider,axis:'x',sign:1});
 box(g,2.8,.025,3.25,5.8,.02,-6.225,0xc4c7ab);for(let x=4.5;x<7.15;x+=.4)for(let z=-7.7;z<-4.7;z+=.4){box(g,.38,.01,.38,x,.04,z,(Math.round(x*10)+Math.round(z*10))%3?0xd1ceb7:0xb7bea3,false)}
 box(side,.12,2.7,3.25,4.4,1.35,-6.225,0xd8d7bf);if(dual)box(divider,.10,2.7,3.25,5.8,1.35,-6.225,0xd8d7bf);
 box(g,.12,.38,3.25,4.4,.19,-6.225,0xc7c9ad);if(dual)box(g,.10,.38,3.25,5.8,.19,-6.225,0xc7c9ad);for(const [x,w]of(dual?[[4.47,.14],[5.8,.48],[7.13,.14]]:[[4.875,.95],[6.775,.85]])){box(front,w,2.55,.13,x,1.275,-4.6,0xd8d7bf);box(g,w,.38,.13,x,.19,-4.6,0xc7c9ad)}
 const centers=dual?[5.05,6.55]:[5.85];for(const [i,x]of centers.entries()){box(front,dual?1.35:2.8,.35,.13,dual?x:5.8,2.7,-4.6,0xd8d7bf);for(const dx of[-.51,.51])box(front,.12,2.55,.14,x+dx,1.27,-4.6,0x786440);box(front,.94,2.48,.10,x,1.24,-4.63,0x6e8363);ball(front,.05,x+.32,1.13,-4.55,0xc5a659);label(front,dual?(i?'BOYS':'GIRLS'):'BATHROOM',x,2.1,-4.56,.83);
  box(g,.48,.75,.25,x,.4,-7.48,0xe9e7d8);const bowl=ball(g,.32,x,.32,-7.10,0xf4f0df,1,.8,1.25);cyl(g,.29,.29,.055,x,.53,-7.10,0xf8f5e5,28);cyl(g,.20,.20,.06,x,.56,-7.10,0x93a29a,24);box(g,.60,.12,.40,x,.86,-5.35,0xedead7);cyl(g,.16,.16,.025,x,.93,-5.35,0x899c91,20);box(g,.035,.18,.035,x,.99,-5.50,0xb9b99d);}
}
