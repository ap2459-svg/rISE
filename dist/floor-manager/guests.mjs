import * as THREE from './vendor/three.module.js';

// The faces are the original Barista artwork, not regenerated characters.
// Body frames are cached once per character, so a busy café does not redraw
// dozens of canvases on every animation frame.
const portraits = await new THREE.TextureLoader().loadAsync('assets/barista-characters.png');
portraits.colorSpace = THREE.SRGBColorSpace;
const people = [
  {box:[319,350,203,203],points:'342,427 343,411 360,401 349,386 371,379 374,364 396,370 420,357 445,367 468,368 475,381 490,389 500,411 493,431 487,441 486,458 489,473 476,492 458,505 443,513 441,527 454,539 426,550 400,538 400,522 384,511 367,498 354,485 351,469 345,459 345,445',shirt:'#4d628b',shade:'#344563',light:'#7d8fab',skin:'#e6b283',hair:'#302825',style:'collar'},
  {box:[145,355,190,198],points:'174,444 164,430 168,407 175,392 191,373 224,362 258,361 286,377 305,407 320,419 312,443 308,459 313,472 306,490 289,503 269,512 267,528 280,538 246,550 220,538 223,520 204,511 190,502 179,487 169,481 167,462',shirt:'#417253',shade:'#2f503c',light:'#709777',skin:'#e8b181',hair:'#462f24',style:'hood'},
  {box:[512,331,279,237],points:'521,487 535,440 556,397 588,366 622,349 663,340 696,345 727,361 750,393 762,430 774,464 773,500 784,529 776,553 754,568 723,571 698,553 681,560 657,559 639,549 619,553 599,545 581,540 560,548 540,547 527,524',shirt:'#e4dfc3',shade:'#3d7158',light:'#f3efda',skin:'#e4ad7c',hair:'#754525',style:'stripes'},
  {box:[0,379,158,178],points:'1,467 7,438 19,407 42,387 68,382 93,391 113,408 128,439 138,474 152,502 150,538 130,551 115,550 108,531 91,535 74,528 59,523 43,536 22,547 7,547 1,533',shirt:'#a07d9c',shade:'#745b79',light:'#b79cb1',skin:'#e9b68e',hair:'#754c32',style:'hood'}
];
const frames = new Map();
const ink = '#352923';

function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function drawPortrait(c,person,character,emotion,center=85,bottom=141,width=105,height=124){
  const [x,y,w,h]=person.box, scale=Math.min(width/w,height/h), headX=center-w*scale/2, headY=bottom-h*scale;
  c.save();c.translate(headX,headY);c.scale(scale,scale);c.translate(-x,-y);
  c.clip(new Path2D('M'+person.points.replaceAll(' ',' L')+' Z'));c.drawImage(portraits.image,0,0);
  // Redraw the original character's mouth and brows in portrait coordinates.
  // Hair, eyes, glasses, clothes and the rest of the painted face are retained.
  if(emotion!=='neutral'){
    const [mx,my,rx,ry,skin]=[[430,483,17,8,'#f6bc86'],[254,483,17,8,'#f7bc84'],[663,493,29,21,'#f7af7d'],[94,483,17,10,'#f8bf94']][character];
    c.fillStyle=skin;c.beginPath();c.ellipse(mx,my,rx,ry,character===2?-.25:0,0,Math.PI*2);c.fill();
    c.strokeStyle='#652b25';c.lineWidth=3.8;c.beginPath();c.moveTo(mx-rx*.65,my+1);c.quadraticCurveTo(mx,my+(emotion==='happy'?13:emotion==='angry'?-13:-7),mx+rx*.65,my+1);c.stroke();
    if(emotion==='angry'||emotion==='frustrated'){
      const brows=[[[394,432],[442,430]],[[215,440],[265,437]],[[601,447],[669,420]],[[55,440],[105,432]]][character];
      c.strokeStyle=person.hair;c.lineWidth=5;for(const [j,[bx,by]]of brows.entries()){c.beginPath();c.moveTo(bx,by+(j===0?-3:3));c.lineTo(bx+20,by+(j===0?4:-4));c.stroke();}
    }
  }c.restore();
}

// A seated frame has a fixed hip at y=196. Knees project forward from the
// chair, shins hang down, and arms rest at table height instead of at the hips.
function drawSeated(c,person,character,frame,activity,emotion,view){
  const side=view==='side',back=view==='back',cx=side?74:85;
  const path=(d,fill,stroke=true,width=2.2)=>{
    const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}
    if(stroke){c.strokeStyle=ink;c.lineWidth=width;c.stroke(p);}
  };
  const ellipse=(x,y,rx,ry,fill)=>{c.fillStyle=fill;c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();};
  const shoe=(x,y)=>path(`M${x-9} ${y-5}Q${x+4} ${y-7} ${x+12} ${y+1}L${x+17} ${y+4} ${x+16} ${y+10} ${x-12} ${y+10}Q${x-15} ${y+4} ${x-9} ${y-5}Z`,'#51443b');
  if(side){
    // Far and near thighs each bend at their own visible knee.
    path('M65 185Q85 185 111 194Q119 198 116 213L111 246 97 246 97 211 66 208Z','#4b4c5a');
    shoe(104,249);
    path('M54 186Q78 189 99 203Q105 208 100 222L89 250 74 247 83 217 56 210Q48 205 54 186Z','#72747e');
    shoe(80,252);
    path('M66 201 94 211 83 240',null,true,1.1);
  }else{
    path('M56 183Q85 176 114 183L119 204Q119 216 104 221L103 250 86 250 82 216 60 216Q51 209 56 183Z','#4c4e5c');
    path('M57 193Q70 195 81 209L76 251 58 251 56 219Q48 208 57 193Z','#72747e');
    path('M87 195Q99 194 109 205L104 219',null,true,1.2);
    shoe(64,253);shoe(96,253);
  }
  const props=()=>{
    const px=side?116:85,py=151;
    if(activity==='laptop'){
      path(`M${px-27} ${py-17}H${px+24}L${px+28} ${py+10}H${px-23}Z`,'#778c83');
      path(`M${px-23} ${py-13}H${px+20}L${px+22} ${py+5}H${px-20}Z`,back?'#bdcec0':'#d1ded2',true,1.1);
      path(`M${px-23} ${py+10}H${px+28}L${px+36} ${py+17}H${px-30}Z`,'#acb6a7');
      path(`M${px-15} ${py+12}H${px+18}`,null,true,1);
      ellipse(px,py-4,3,3,'#6c8277');
    }else if(activity==='book'){
      path(`M${px-31} ${py-1}Q${px-17} ${py-6} ${px} ${py}Q${px+16} ${py-6} ${px+31} ${py-1}L${px+27} ${py+19}Q${px+13} ${py+15} ${px} ${py+22}Q${px-13} ${py+15} ${px-27} ${py+19}Z`,'#eaddba');
      path(`M${px} ${py}V${py+21}M${px-24} ${py+4} ${px-8} ${py+6}M${px-24} ${py+9} ${px-8} ${py+11}M${px+8} ${py+6} ${px+24} ${py+4}M${px+8} ${py+11} ${px+24} ${py+9}`,null,true,1);
    }else{
      const sip=frame===1?13:0,xx=side?116:91,yy=146-sip;
      path(`M${xx-9} ${yy}H${xx+10}L${xx+8} ${yy+20}Q${xx} ${yy+25} ${xx-7} ${yy+20}Z`,'#f4ead3');
      path(`M${xx+10} ${yy+5}Q${xx+21} ${yy+3} ${xx+17} ${yy+14}L${xx+9} ${yy+16}`,null,true,2);
      ellipse(xx,yy,9,3,'#73513b');
    }
  };
  if(back)props();
  // A leaning torso and bent forearms distinguish sitting from a shortened walk.
  const torso=side?'M56 119Q75 112 89 125L91 189Q77 199 54 190L51 153Z':'M59 119Q85 111 111 119L116 190Q85 201 54 190Z';
  const gradient=c.createLinearGradient(cx-25,120,cx+27,194);gradient.addColorStop(0,person.light);gradient.addColorStop(.5,person.shirt);gradient.addColorStop(1,person.shade);
  path(torso,gradient);
  if(person.style==='stripes'){
    c.save();c.clip(new Path2D(torso));c.fillStyle=person.shade;for(const y of[139,160,181])c.fillRect(45,y,77,8);c.restore();
  }
  if(back){
    if(person.style==='hood')path('M60 121Q84 109 109 121L104 139Q84 151 65 139Z',person.shade);
    else path('M62 125Q85 133 108 125',null,true,1.4);
    path('M59 130 48 155Q46 164 57 165L66 150',person.shade);
    path('M109 130 121 155Q123 164 112 165L103 150',person.shirt);
  }else if(side){
    path('M77 124Q88 122 93 136L97 151 120 150 121 162 93 167Q84 166 81 157L71 138Z',person.shirt);
    path('M119 150Q127 145 131 150L136 156Q136 164 121 162Z',person.skin);
    path('M75 129 87 150',null,true,1.3);
  }else{
    path('M59 125Q47 123 45 138L41 155Q41 166 54 168L72 163 69 151 55 153 62 138Z',person.shade);
    path('M110 125Q122 124 126 138L130 155Q130 166 117 168L99 163 102 151 116 153 108 138Z',person.shirt);
    path('M65 152Q76 147 81 154L80 162Q73 167 67 162Z',person.skin);
    path('M105 152Q94 147 89 154L90 162Q97 167 103 162Z',person.skin);
    if(person.style==='collar'){path('M63 120 82 135 77 142 66 133Z','#eee7d8');path('M107 120 88 135 94 142 105 132Z','#eee7d8');}
    else if(person.style==='hood')path('M63 121Q85 141 107 121M77 137 75 151M95 137 97 151',null,true,1.5);
  }
  path(side?'M57 188Q72 194 88 187':'M58 188Q85 196 111 188',null,true,1.2);
  if(back){
    // The rear view follows each original silhouette and hair/cap palette.
    path('M77 111 93 111 96 127Q85 132 74 125Z',person.skin);
    if(character===0){
      path('M42 85 38 68 44 54 44 41 56 34 63 21 79 25 92 16 108 27 119 29 125 44 132 55 130 77 124 96 111 113 96 123 75 119 57 109Z',person.hair);
      path('M49 56Q62 40 70 45M82 31Q94 42 106 37M109 61Q121 73 115 86M60 88Q70 101 88 105',null,true,1.5);
    }else if(character===1){
      path('M43 63Q40 29 69 21Q98 10 118 34L129 69 121 100Q101 120 79 119L59 108 49 89Z',person.hair);
      path('M43 55Q44 19 77 18Q109 15 120 45L124 65Q84 49 43 68Z','#9b3e34');
      path('M48 59Q86 47 122 65',null,true,2);
    }else{
      path('M35 119Q43 95 41 75Q43 37 68 22Q89 10 111 30Q131 49 129 79Q128 104 140 123L124 133 112 128 101 134 87 129 73 134 60 128 45 133Z',person.hair);
      c.strokeStyle=character===2?'#97613a':'#936a4b';c.lineWidth=2;for(const x of[57,74,94,112]){c.beginPath();c.moveTo(x,45);c.bezierCurveTo(x-7,70,x+9,96,x+1,122);c.stroke();}
    }
  }else{
    c.save();
    if(side){c.translate(76,0);c.scale(.77,1);c.translate(-76,0);}
    drawPortrait(c,person,character,emotion,side?80:85,131,102,117);
    c.restore();
  }
  if(!back)props();
}

function frameTexture(index,pose,frame=0,activity='none',emotion='neutral',view='front') {
  const character = ((index % people.length) + people.length) % people.length;
  const key = `${character}/${pose}/${frame}/${activity}/${emotion}/${view}`;
  if (frames.has(key)) return frames.get(key);
  const person = people[character], seated = pose==='seated', walking = pose==='walking';
  const cv = document.createElement('canvas');cv.width=340;cv.height=540;
  const c=cv.getContext('2d');c.scale(2,2);c.lineJoin='round';c.lineCap='round';
  if(seated){
    drawSeated(c,person,character,frame,activity,emotion,view);
    // Keep soles near the floor while the hip aligns to the physical seat.
    const seatedCanvas=document.createElement('canvas');seatedCanvas.width=340;seatedCanvas.height=540;
    const sc=seatedCanvas.getContext('2d');sc.drawImage(cv,0,0,340,392,0,0,340,362);sc.drawImage(cv,0,392,340,148,0,362,340,178);
    const t=canvasTexture(seatedCanvas);frames.set(key,t);return t;
  }
  const cycle=frame/12*Math.PI*2, swing=walking?Math.sin(cycle):0, lift=walking?Math.abs(Math.cos(cycle)):0;
  const path=(d,fill,stroke=true,width=2.5)=>{
    const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}
    if(stroke){c.strokeStyle=ink;c.lineWidth=width;c.stroke(p);}
  };
  const limb=(x,y,angle,draw)=>{c.save();c.translate(x,y);c.rotate(angle);draw();c.restore();};
  const shoe=(x,y,angle=0)=>limb(x,y,angle,()=>{
    path('M-10 -5 8 -5Q13 -2 15 5L15 9 -14 9Q-16 0 -10 -5Z','#55453a');
    path('M-13 6H13',null,true,1.5);
  });
  const trouser='#555563',trouserLight='#74737c';
  // Opposing legs have separate knees, shoes and shadows in each walk frame.
  if(seated){
    path('M57 191 112 191 121 211Q120 219 106 220L98 220 101 250 84 250 79 220 58 220Q49 215 57 191Z',trouser);
    path('M58 208Q69 205 77 211L75 250 57 250 58 221Z',trouserLight);
    shoe(65,255,-.06);shoe(94,255,.08);
    path('M93 222 95 247',null,true,1.5);
  }else{
    for(const side of [1,-1]){
      const phase=swing*side, x=85+side*13, y=194;
      limb(x,y,phase*.13,()=>{
        const knee=phase*3, bottom=59-Math.max(0,phase)*8;
        path(`M-12 0 12 0 10 26Q${8+knee} 39 ${9+knee} ${bottom}L${-10+knee} ${bottom}Q${-10+knee} 33 -11 27Z`,side>0?trouser:trouserLight);
        shoe(knee,bottom+1,-phase*.08);
        path(`M1 8 1 28 ${knee+1} ${bottom-6}`,null,true,1.1);
      });
    }
  }
  // A slightly shaded shirt and independently swinging arms retain the
  // outlined, rounded shapes of the Barista artwork.
  const bodyY=0;
  c.save();c.translate(0,bodyY+(walking?lift*1.4:0));
  const arm=(side,front=false)=>{
    const x=85+side*26, angle=seated?side*-.62:side*.08-swing*side*.23;
    limb(x,132,angle,()=>{
      const end=seated?49:61;
      path(`M0 0Q${side*10} 0 ${side*13} 12L${side*15} ${end-10}Q${side*8} ${end-3} 0 ${end-9}L${-side*4} 14Z`,front?person.shirt:person.shade);
      path(`M${side*1} ${end-13} ${side*15} ${end-13} ${side*16} ${end-2}Q${side*10} ${end+8} ${side*2} ${end+1}Z`,person.skin);
      if(person.style==='stripes'){
        c.strokeStyle=person.light;c.lineWidth=5;c.beginPath();c.moveTo(side*1,23);c.lineTo(side*12,23);c.moveTo(side*1,40);c.lineTo(side*13,40);c.stroke();
      }
    });
  };
  arm(swing>=0?-1:1);
  const shirtGradient=c.createLinearGradient(55,129,116,194);shirtGradient.addColorStop(0,person.light);shirtGradient.addColorStop(.35,person.shirt);shirtGradient.addColorStop(1,person.shade);
  path('M60 128Q85 118 109 128L117 196Q85 205 53 196Z',shirtGradient);
  if(person.style==='stripes'){
    c.save();c.clip(new Path2D('M60 128Q85 118 109 128L117 196Q85 205 53 196Z'));
    c.fillStyle=person.shade;for(const y of[149,172,194])c.fillRect(51,y,69,9);c.restore();
  }
  if(person.style==='collar'){
    path('M64 126 83 139 78 146 65 136Z','#ede8d9');path('M105 126 86 139 92 146 105 136Z','#ede8d9');
  }else if(person.style==='hood'){
    path('M60 131Q59 120 71 121L85 137 100 121Q113 120 110 133L91 148 80 148Z',person.shade);
    path('M77 145 75 161M94 145 97 160',null,true,1.8);
    path('M66 181 72 172 99 172 105 181 102 189 69 189Z',person.shirt,true,1.5);
  }else path('M66 128Q85 143 104 128',null,true,2);
  path('M60 193Q84 199 111 193',null,true,1.2);
  arm(swing>=0?1:-1,true);
  if(activity==='barista'||activity==='serving'){
    // The café apron follows the same painted outline as the original bodies.
    path('M66 133 73 127 78 153 96 153 101 127 108 133 103 156 112 198Q85 205 57 198L66 156Z','#485b41');
    path('M70 174Q85 181 101 174L99 190Q85 194 72 190Z','#697953',true,1.7);
    path('M77 165H94',null,true,1.3);
  }
  drawPortrait(c,person,character,emotion);
  if(seated&&activity!=='laptop'&&activity!=='book'){
    // Hands rest at table height around a cup; legs remain visibly bent below.
    const sip=frame===1?6:0;
    path(`M69 ${177-sip}Q78 ${171-sip} 84 ${178-sip}L83 ${189-sip}Q71 ${194-sip} 66 ${184-sip}Z`,person.skin);
    path(`M99 ${177-sip}Q109 ${172-sip} 113 ${181-sip}L108 ${189-sip} 99 ${187-sip}Z`,person.skin);
    path(`M82 ${171-sip}H102L100 ${193-sip}Q91 ${198-sip} 84 ${192-sip}Z`,'#f4ead3',true,2);
    path(`M102 ${176-sip}Q114 ${174-sip} 111 ${185-sip}Q109 ${189-sip} 101 ${185-sip}`,null,true,2);
    c.fillStyle='#73513b';c.beginPath();c.ellipse(92,172-sip,9,3,0,0,Math.PI*2);c.fill();
  }
  if(activity==='laptop'){
    // A screen and resting hands make working legible without changing the face.
    path('M58 178 110 178 117 202 54 202Z','#8e9b98',true,2.3);
    path('M63 180 108 180 112 196 60 196Z','#c5d5cc',true,1.3);
    path('M57 203H117L123 208H49Z','#c1c4ae',true,2);
    path('M54 195Q47 189 51 184L62 188 65 196Z',person.skin,true,1.7);
    path('M113 195Q122 188 119 184L108 188 107 196Z',person.skin,true,1.7);
    c.fillStyle='#677f78';c.beginPath();c.arc(86,190,3,0,Math.PI*2);c.fill();
  }else if(activity==='book'){
    path('M53 180Q70 174 86 181Q103 174 120 180L116 204Q100 200 86 207Q72 200 56 204Z','#b78851',true,2.3);
    path('M56 180Q70 176 85 182L85 202Q71 196 59 201Z','#eee3bf',true,1.3);
    path('M87 182Q103 176 117 180L113 201Q100 196 87 202Z','#f5ebd0',true,1.3);
    path('M64 185 77 187M64 190 77 192M94 186 108 184M94 192 107 190',null,true,.8);
    path('M52 187Q45 184 47 192L56 201 60 197Z',person.skin,true,1.7);
    path('M119 187Q126 184 124 192L115 201 111 197Z',person.skin,true,1.7);
  }else if(activity==='drink'||activity==='serving'){
    const lift=activity==='serving'&&frame===1?10:0;
    path(`M109 ${176-lift}Q116 ${170-lift} 122 ${177-lift}L120 ${191-lift} 108 ${187-lift}Z`,person.skin,true,2);
    path(`M116 ${164-lift}H137L134 ${190-lift}Q126 ${195-lift} 120 ${189-lift}Z`,'#f5ead0',true,2);
    path(`M115 ${163-lift}H138L139 ${168-lift}H114Z`,'#74513b',true,1.8);
    path(`M119 ${176-lift}H135L134 ${184-lift}H121Z`,'#667953',true,1.2);
  }
  c.restore();
  const t=canvasTexture(cv);frames.set(key,t);return t;
}

let shadowTexture;
function makeShadow(){
  if(!shadowTexture){
    const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
    const gradient=c.createRadialGradient(64,64,12,64,64,62);gradient.addColorStop(0,'rgba(37,27,22,.28)');gradient.addColorStop(.6,'rgba(37,27,22,.12)');gradient.addColorStop(1,'rgba(37,27,22,0)');
    c.fillStyle=gradient;c.fillRect(0,0,128,128);shadowTexture=canvasTexture(cv);
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.78,.64),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;return shadow;
}

function overheadTexture(index,activity='none'){
  const character=((index%people.length)+people.length)%people.length,key=`top/${character}/${activity}`;
  if(frames.has(key))return frames.get(key);
  const p=people[character],cv=document.createElement('canvas');cv.width=cv.height=160;const c=cv.getContext('2d');
  c.strokeStyle=ink;c.lineWidth=4;c.lineJoin='round';
  const ellipse=(x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();};
  ellipse(80,104,45,29,p.shirt);ellipse(40,99,11,24,p.shade);ellipse(120,99,11,24,p.shade);
  ellipse(48,120,9,9,p.skin);ellipse(112,120,9,9,p.skin);
  ellipse(80,66,32,34,p.hair);ellipse(80,43,13,7,p.skin);
  if(character===1){ellipse(80,59,34,24,'#9c3934');ellipse(80,40,26,7,'#80302d');}
  else{c.strokeStyle=character===0?'#4e4238':'#946642';c.lineWidth=3;c.beginPath();c.moveTo(65,44);c.quadraticCurveTo(91,49,93,82);c.stroke();}
  const shape=(d,fill,width=3)=>{const q=new Path2D(d);c.fillStyle=fill;c.strokeStyle=ink;c.lineWidth=width;c.fill(q);c.stroke(q);};
  if(activity==='laptop'){
    shape('M43 123H117V151H43Z','#92a69d');
    shape('M47 126H113V145H47Z','#d0dfd3',2);
    shape('M43 150H117L123 157H37Z','#bac3b6',2);
  }else if(activity==='book'){
    shape('M40 126Q60 120 80 127Q100 120 120 126L116 152Q99 148 80 155Q60 148 44 152Z','#efdfb7');
    c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(80,127);c.lineTo(80,155);c.stroke();
  }else if(activity==='drink'||activity==='serving'){
    ellipse(119,127,13,14,'#f4e8ca');ellipse(119,127,8,8,'#74503b');
  }
  if(activity==='barista'||activity==='serving')shape('M64 111Q80 120 97 111L97 123Q79 130 64 123Z','#60764e',2);
  const t=canvasTexture(cv);frames.set(key,t);return t;
}

// Shared icon textures keep the information attached to each person compact.
// They are generated only when a type / action / mood combination first appears.
const badgeFrames = new Map();
const categoryStyle={
  study:{label:'Study',color:'#587e9b',icon:'book'},
  remote:{label:'Work',color:'#547b68',icon:'laptop'},
  social:{label:'Friends',color:'#a67a46',icon:'people'},
  quick:{label:'Quick',color:'#9c6a7b',icon:'cup'},
  casual:{label:'Guest',color:'#8d8061',icon:'cup'},
  barista:{label:'Barista',color:'#5c7050',icon:'cup'}
};
function categoryFor(value){
  const type=String(value||'').toLowerCase();
  if(type.includes('remote')||type==='work'||type==='worker')return'remote';
  if(type.includes('study')||type.includes('student'))return'study';
  if(type.includes('social')||type==='teens'||type==='friends')return'social';
  if(['commuter','late','pickup','quick'].some(t=>type.includes(t)))return'quick';
  return type==='barista'?'barista':'casual';
}
function emotionFor(value){
  if(typeof value==='number')return value>=.72?'happy':value>=.5?'neutral':value>=.35?'frustrated':'angry';
  if(['happy','satisfied','great'].includes(value))return'happy';
  if(['angry','leaving','ready to leave'].includes(value))return'angry';
  if(['frustrated','uncomfortable','sad'].includes(value))return'frustrated';
  return'neutral';
}
function actionLabel(action,category,phase){
  if(['exiting','leaving','departed'].includes(action))return'Leaving';
  if(['toOrder','arriving','entering'].includes(action))return'Arriving';
  if(['queue','queued','ordering','order'].includes(action))return'Order';
  if(['waiting','preparing','waitingPickup'].includes(action))return'Waiting';
  if(['pickup','toPickup','collecting'].includes(action))return'Pickup';
  if(['toBathroom','bathroom','returnSeat','bathroomQueue'].includes(action))return'Bathroom';
  if(action==='serving')return'Serving';
  if(action==='toSeat')return'Seating';
  if(phase==='seated'||['seated','working','studying','socializing'].includes(action))return category==='remote'?'Working':category==='study'?'Studying':category==='social'?'Chatting':'Enjoying';
  return categoryStyle[category].label;
}
function badgeTexture(category,emotion,label){
  const key=`${category}/${emotion}/${label}`;if(badgeFrames.has(key))return badgeFrames.get(key);
  const cv=document.createElement('canvas');cv.width=250;cv.height=78;const c=cv.getContext('2d');
  c.lineJoin='round';c.lineCap='round';
  const p=(d,fill,stroke=ink,width=3)=>{const q=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(q);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(q);}};
  p('M17 4H230Q245 4 245 19V59Q245 73 230 73H17Q4 73 4 59V19Q4 4 17 4Z','#f3ead6',ink,4);
  const style=categoryStyle[category];
  p('M17 8H59V69H17Q8 69 8 56V21Q8 8 17 8Z',style.color,null);
  c.strokeStyle='#f6edda';c.lineWidth=3;
  if(style.icon==='book'){
    p('M17 24Q28 21 34 26Q42 21 51 24V51Q42 48 34 53Q26 48 17 51Z',null,'#f6edda',3);
    p('M34 26V53',null,'#f6edda',2);
  }else if(style.icon==='laptop'){
    p('M19 24H49V46H19ZM15 51H53',null,'#f6edda',3);
  }else if(style.icon==='people'){
    for(const [x,y,r]of[[27,30,6],[42,31,5]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
    p('M16 53Q16 39 27 39Q38 39 38 53M36 42Q51 38 51 53',null,'#f6edda',3);
  }else{
    p('M20 25H43L41 51H23ZM43 29Q57 27 51 41H42M18 24H46',null,'#f6edda',3);
  }
  c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';c.font='700 23px Nunito, sans-serif';c.fillText(label,130,41,130);
  const texture=canvasTexture(cv);badgeFrames.set(key,texture);return texture;
}
function makeBadge(){
  const badge=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,toneMapped:false}));
  badge.center.set(.5,0);badge.scale.set(1.12,.35,1);badge.position.y=1.84;badge.visible=false;badge.renderOrder=4;return badge;
}

/** A billboard body with a true animated walk cycle and an overhead view.
 * Optional userData.facing: horizontal screen direction (-1/+1), or an
 * object with x. Seated callers pass seatHeight, seatFacing {x,z}, and
 * cameraDirection {x,z}; the body's hip is anchored to the actual chair.
 * World orientation for overhead rendering comes from the group's rotation.
 */
const outlines=new WeakMap();
function outlineTexture(texture){if(outlines.has(texture))return outlines.get(texture);const cv=document.createElement('canvas');cv.width=186;cv.height=286;const c=cv.getContext('2d');c.shadowColor='white';c.shadowBlur=8;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.drawImage(texture.image,8+Math.cos(a)*4,8+Math.sin(a)*4,170,270);}c.globalCompositeOperation='source-in';c.fillStyle='white';c.fillRect(0,0,186,286);c.shadowBlur=0;c.globalCompositeOperation='destination-out';c.drawImage(texture.image,8,8,170,270);const t=canvasTexture(cv);outlines.set(texture,t);return t;}
export function paintedCustomer(index=0){
  const g=new THREE.Group();
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:frameTexture(index,'waiting'),alphaTest:.05,depthWrite:false,toneMapped:false}));
  sprite.center.set(.5,0);sprite.scale.set(1.10,1.75,1);g.add(sprite);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(.78,.78),new THREE.MeshBasicMaterial({map:overheadTexture(index),transparent:true,alphaTest:.05,depthWrite:false,toneMapped:false}));
  top.rotation.x=-Math.PI/2;top.position.y=1.34;top.visible=false;g.add(top);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,toneMapped:false,depthTest:false,opacity:0}));glow.center.set(.5,0);glow.renderOrder=3;g.add(glow);const shadow=makeShadow();g.add(shadow);
  const badge=makeBadge();g.add(badge);
  g.userData={sprite,top,shadow,glow,badge,index,painted:true,phaseOffset:(index%17)*.43,facing:1,lastTexture:null};
  return g;
}

export function animatePaintedCustomer(g,phase,mode,now,reducedMotion=false){
  const d=g.userData,{sprite,top,shadow,index}=d;if(!sprite)return;
  const seated=phase==='seated',walking=phase==='walking',clock=now*.009+(d.phaseOffset||0);
  const pose=seated?'seated':walking&&!reducedMotion?'walking':'waiting';
  const frame=pose==='walking'?Math.floor((clock/(Math.PI*2)%1+1)%1*12):seated&&!reducedMotion&&Math.sin(now*.0007+index)>.94?1:0;
  const category=categoryFor(d.customerType),action=d.action||'';
  let activity='none';
  if(category==='barista')activity=action==='serving'?'serving':'barista';
  else if(seated&&category==='remote')activity='laptop';
  else if(seated&&category==='study')activity='book';
  else if(d.hasDrink&&!seated)activity='drink';
  const assetFrame=activity==='serving'&&!reducedMotion?Math.floor(now/260)%2:frame;
  let seatView='front',seatMirror=1;
  if(seated&&d.seatFacing&&d.cameraDirection){
    const f=d.seatFacing,v=d.cameraDirection,length=Math.hypot(v.x,v.z)||1;
    const towards=(f.x*v.x+f.z*v.z)/length;
    seatView=towards>.48?'front':towards<-.48?'back':'side';
    seatMirror=(f.x*v.z-f.z*v.x)<0?-1:1;
  }
  const texture=frameTexture(index,pose,assetFrame,activity,emotionFor(d.emotion),seatView);if(d.lastTexture!==texture){sprite.material.map=texture;d.lastTexture=texture;}
  sprite.visible=mode!=='bird';top.visible=mode==='bird';
  if(top.visible){const topTexture=overheadTexture(index,activity);if(top.material.map!==topTexture)top.material.map=topTexture;}
  const facing=typeof d.facing==='object'?d.facing.x:d.facing;
  const mirror=seated?(seatView==='side'?seatMirror:1):Number.isFinite(facing)&&facing<0?-1:1;
  sprite.scale.set(mirror*1.02,seated?1.62:1.75,1);
  const breathing=reducedMotion?0:Math.sin(now*.0015+index)*.004;
  // Anchor the actual hip pixel, not the billboard's bottom. Camera pitch then
  // cannot slide a seated guest behind or below the chair. Signed X scale also
  // mirrors around this same hip, so the anchor does not flip for side poses.
  sprite.center.set(seated&&seatView==='side'?74/170:.5,seated?89/270:0);
  sprite.position.y=(seated?(Number.isFinite(d.seatHeight)?d.seatHeight:.53):0)+breathing;
  sprite.material.rotation=walking&&!reducedMotion?Math.sin(clock)*.018:!reducedMotion&&d.urgency>.35?Math.sin(now*.007+index)*.035*d.urgency:0;
  top.position.y=seated?(Number.isFinite(d.seatHeight)?d.seatHeight:.53)+.56:1.34;
  top.scale.set(1,walking&&!reducedMotion?1+Math.sin(clock*2)*.025:1,1);
  if(d.badge){
    d.badge.visible=!!d.customerType&&d.showBadge!==false;
    if(d.badge.visible){
      const badgeMap=badgeTexture(category,emotionFor(d.emotion),actionLabel(action,category,phase));
      if(d.badge.material.map!==badgeMap){d.badge.material.map=badgeMap;d.badge.material.needsUpdate=true;}
      d.badge.position.y=(mode==='bird'?1.58:seated?(Number.isFinite(d.seatHeight)?d.seatHeight:.53)+1.10:1.91);
      d.badge.scale.set(mode==='bird'?1.02:1.12,mode==='bird'?.32:.35,1);
    }
  }
  const dt=Math.min(.1,(now-(d.glowTime||now))/1000);d.glowTime=now;
  const goal=d.warning?1:0;d.glowStrength=(d.glowStrength||0)+(goal-(d.glowStrength||0))*Math.min(1,dt*6);
  const glow=d.glow;if(glow){glow.visible=d.glowStrength>.01;glow.material.opacity=d.glowStrength*(reducedMotion?.95:.9+Math.sin(now*.005)*.06);glow.material.color.setStyle(`hsl(${Math.max(0,55-(d.urgency||0)*70)},100%,57%)`);if(glow.visible){const map=outlineTexture(mode==='bird'?top.material.map:texture);if(!glow.material.map)glow.material.needsUpdate=true;glow.material.map=map;}glow.scale.set(sprite.scale.x*186/170,sprite.scale.y*286/270,1);
    // Outline textures add eight pixels on each side of the source frame.
    glow.center.set((sprite.center.x*170+8)/186,(sprite.center.y*270+8)/286);
    glow.position.copy(sprite.position);glow.material.rotation=sprite.material.rotation;
    if(mode==='bird'){glow.center.set(.5,.5);glow.scale.set(.95,.95,1);glow.position.y=top.position.y;glow.material.rotation=0;} }
  // Keep the shadow on the floor when the caller raises a guest for a stool.
  shadow.position.y=.026-g.position.y;
  shadow.scale.set(seated?1.1:1,walking&&!reducedMotion?1-Math.abs(Math.sin(clock))*.06:1,1);
}

/** Same original portrait and painted body as the guests, with an olive apron.
 * Pass a real service state to animatePaintedBarista so the cup appears only
 * while an order is being prepared / handed over. No timer drives purchases.
 */
export function paintedBarista(index=2){
  const g=paintedCustomer(index);g.userData.customerType='barista';
  g.userData.emotion='happy';g.userData.action='waiting';g.userData.showBadge=false;
  g.userData.barista=true;return g;
}
export function animatePaintedBarista(g,serving,mode,now,reducedMotion=false){
  g.userData.customerType='barista';g.userData.action=serving?'serving':'barista';
  g.userData.hasDrink=!!serving;g.userData.emotion='happy';
  animatePaintedCustomer(g,'waiting',mode,now,reducedMotion);
  if(!reducedMotion&&mode!=='bird')g.userData.sprite.material.rotation=serving?Math.sin(now*.009)*.028:0;
}
