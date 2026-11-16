import * as THREE from './vendor/three.module.js';

// Keep the previous prototype's actual artwork. UVs place its painted surfaces
// on the walkable room, so every camera shares the same textures and layout.
const loader=new THREE.TextureLoader();
const [worn,fresh,portraits,barista]=await Promise.all([
  loader.loadAsync('assets/room-worn-unfitted.png'),
  loader.loadAsync('assets/room-unfitted.png'),
  loader.loadAsync('assets/barista-characters.png'),loader.loadAsync('assets/barista-cafe.png')
]);
for(const t of [worn,fresh,portraits,barista]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;}
const cache=new Map();
export function paintedPatch(clean,rect,lit=false){
  const key=[clean,...rect,lit].join('/');if(cache.has(key))return cache.get(key);
  let source=clean?fresh:worn;if(clean&&rect[1]>=600){source=barista;rect=[180,630,1100,100]}else if(clean&&rect[1]>=290&&rect[1]<390){source=barista;rect=[610,850,400,160]}const t=source.clone(),[x,y,w,h]=rect;
  t.offset.set(x/1536,1-(y+h)/1024);t.repeat.set(w/1536,h/1024);t.needsUpdate=true;
  const m=lit?new THREE.MeshLambertMaterial({map:t,color:0xffffff,emissive:0x777777,emissiveMap:t,emissiveIntensity:.24}):new THREE.MeshBasicMaterial({map:t,toneMapped:false,side:THREE.DoubleSide});cache.set(key,m);return m;
}
export function paintedFloor(upgraded){
  const geo=new THREE.PlaneGeometry(12,14,40,40),uv=geo.attributes.uv;
  // Projective rectification of the original painted floor (not a backdrop).
  for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=1-uv.getY(i),depth=v/(1.773-.773*v),x=(418+(1284-418)*u)*(1-depth)+(0+1535*u)*depth,y=390+633*depth;uv.setXY(i,x/1536,1-y/1024);}
  const m=new THREE.MeshBasicMaterial({map:upgraded?fresh:worn,toneMapped:false});
  const mesh=new THREE.Mesh(geo,m);mesh.rotation.x=-Math.PI/2;mesh.position.y=.003;mesh.userData.surface='floor';
  const shadow=new THREE.Mesh(geo.clone(),new THREE.ShadowMaterial({opacity:.23,depthWrite:false}));shadow.position.z=.002;shadow.receiveShadow=true;mesh.add(shadow);return mesh;
}
export function wallSkin(parent,axis,sign,length,paint,clean){
  // Wall plaster and the original dark paneling remain independent repairs.
  const g=new THREE.Group();g.position.set(axis==='x'?sign*5.90:0,0,axis==='z'?sign*6.90:0);
  g.rotation.y=axis==='x'?(sign<0?Math.PI/2:-Math.PI/2):(sign<0?0:Math.PI);parent.add(g);
  if(axis!=='z'||sign!==1){
    for(let i=0;i<Math.ceil(length/1.45);i++){
      const w=Math.min(1.45,length-i*1.45),panel=new THREE.Mesh(new THREE.PlaneGeometry(w,2.94),paintedPatch(paint,[[1317,2,111,270],[346,8,58,260],[1220,8,75,240],[1325,40,95,235]][i%4]));panel.position.set(-length/2+i*1.45+w/2,2.53,0);if(i%3===2)panel.scale.x=-1;panel.userData.surface='paint';g.add(panel);
    }
  }
  const wood=new THREE.Mesh(new THREE.PlaneGeometry(length,1.04),paintedPatch(clean,[441,298,744,82]));wood.position.y=.53;wood.userData.surface='clean';g.add(wood);return g;
}
export function windowPainting(clean,index=0){return paintedPatch(clean,[440+(index%3)*216,35,210,229]);}

// Exact Barista portraits and the original drawn bodies, rendered as sprites.
const people=[{box:[319,350,203],points:'342,427 343,411 360,401 349,386 371,379 374,364 396,370 420,357 445,367 468,368 475,381 490,389 500,411 493,431 487,441 486,458 489,473 476,492 458,505 443,513 441,527 454,539 426,550 400,538 400,522 384,511 367,498 354,485 351,469 345,459 345,445'},{box:[145,355,190],points:'174,444 164,430 168,407 175,392 191,373 224,362 258,361 286,377 305,407 320,419 312,443 308,459 313,472 306,490 289,503 269,512 267,528 280,538 246,550 220,538 223,520 204,511 190,502 179,487 169,481 167,462'}];
const guestTextures=new Map();
function guestTexture(index,seated){
  const key=index%2+'/'+seated;if(guestTextures.has(key))return guestTextures.get(key);
  const cv=document.createElement('canvas');cv.width=340;cv.height=seated?406:540;const c=cv.getContext('2d');c.scale(2,2);
  c.strokeStyle='#372a26';c.lineWidth=3;c.lineJoin='round';
  const path=(d,color,stroke=true)=>{const p=new Path2D(d);if(color){c.fillStyle=color;c.fill(p)}if(stroke)c.stroke(p)};
  const shirt=index%2?'#417253':'#4d628b',shade=index%2?'#2f503c':'#344563';
  path('M58 190h54l-3 64H89l-5-44-4 44H59Z','#585561');
  path('M59 249h21v12H50q-1-8 9-12Zm30 0h20q10 4 11 12H90Z','#493e37');
  path('M59 131 39 147 30 193q9 8 17 2l14-38m49-26 20 16 9 46q-9 8-17 2l-14-38',shade);
  path('M30 188 27 201q7 13 17 3l3-15m92-1 4 13q-7 13-17 3l-3-15','#e6b283');
  path('M60 128q25-10 49 0l8 71q-31 9-64 0Z',shirt);
  c.strokeStyle='#d4ceba';path('M64 132q21 18 41 0');c.strokeStyle=shade;path('M61 185h47');
  const data=people[index%2],s=Math.min(140/data.box[2],145/210);c.save();c.translate(15+(140-data.box[2]*s)/2,(145-210*s)/2);c.scale(s,s);c.translate(-data.box[0],-data.box[1]);const clip=new Path2D('M'+data.points.replaceAll(' ',' L')+' Z');c.clip(clip);c.drawImage(portraits.image,0,0);c.restore();
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;guestTextures.set(key,t);return t;
}
export function paintedCustomer(index){
  const g=new THREE.Group(),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:guestTexture(index,false),alphaTest:.05,toneMapped:false}));sprite.center.set(.5,0);sprite.scale.set(1.04,1.65,1);g.add(sprite);
  const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.fillStyle=index%2?'#937052':'#5a766c';c.strokeStyle='#473627';c.lineWidth=5;c.beginPath();c.ellipse(64,78,44,29,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#6c4b36';c.beginPath();c.arc(64,52,27,0,Math.PI*2);c.fill();c.stroke();const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
  const top=new THREE.Mesh(new THREE.PlaneGeometry(.65,.65),new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.05,toneMapped:false}));top.rotation.x=-Math.PI/2;top.position.y=1.35;g.add(top);g.userData={sprite,top,index,painted:true};return g;
}
export function animatePaintedCustomer(g,phase,mode,now,reducedMotion){
  const {sprite,top,index}=g.userData;if(!sprite)return;
  sprite.visible=mode!=='bird';top.visible=mode==='bird';const seated=phase==='seated';
  sprite.material.map=guestTexture(index,seated);sprite.scale.y=seated?1.24:1.65;sprite.position.y=(seated?.45:0)+(phase==='walking'&&!reducedMotion?Math.sin(now*.016)*.015:0);
  sprite.material.rotation=phase==='walking'&&!reducedMotion?Math.sin(now*.016)*.017:0;
}
