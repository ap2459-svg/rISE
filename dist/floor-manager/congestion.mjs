import {free,lineFree} from './layout.mjs?v=flow-48';
const inactive=new Set(['pending','departed','seated','sitting','bathroom']);
export const movingPeople=parties=>parties.filter(p=>!inactive.has(p.phase));
export const CONGESTION_COLORS={green:0x22cf67,yellow:0xffc128,red:0xff3149};
// Movement and the existing overlays share this current-space assessment.
// Historic delays remain report data; they cannot permanently turn an aisle red.
export function congestionAt(point,objects,parties=[],self=null,ignore=null){
 const radius=self?.accessible?.34:.24,narrow=!free(point,objects,.48,ignore),blocked=!free(point,objects,radius,ignore);
 const nearby=movingPeople(parties).filter(p=>p!==self&&Math.hypot(p.pos.x-point.x,p.pos.z-point.z)<1.15),crowd=nearby.length;
 const trapped=crowd>0&&!Array.from({length:12},(_,i)=>({x:point.x+Math.cos(i*Math.PI/6)*.08,z:point.z+Math.sin(i*Math.PI/6)*.08})).some(p=>lineFree(point,p,objects,radius,ignore)&&clearOfPeople(point,p,nearby));
 const red=blocked||trapped||crowd>=4||narrow&&crowd>=2||crowd>=1&&!free(point,objects,.35,ignore);
 const color=red?'red':narrow||crowd>=2?'yellow':'green';
 return {color,speed:color==='green'?1:color==='yellow'?.86:.68,narrow,crowd};
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,d=dx*dx+dz*dz,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/d)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
// Stable right-side passing, checked against the entire swept step. A lower
// simulation speed never changes who has right of way or the chosen side.
export function clearOfPeople(from,to,people,gap=.42){return people.every(p=>{p=p.pos||p;const before=Math.hypot(from.x-p.x,from.z-p.z),after=Math.hypot(to.x-p.x,to.z-p.z);return before<gap?after>before+1e-6:segmentDistance(p,from,to)>=gap-1e-6;});}
export function steeringStep(from,target,distance,objects,radius=.24,people=[],ignore=null){
 const dx=target.x-from.x,dz=target.z-from.z,length=Math.hypot(dx,dz),travel=Math.min(distance,length);if(length<1e-7)return {...target};
 const direct={x:from.x+dx/length*travel,z:from.z+dz/length*travel};
 const clear=p=>lineFree(from,p,objects,radius,ignore)&&clearOfPeople(from,p,people);
 if(clear(direct))return direct;
 const heading=Math.atan2(dz,dx),turns=[Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI*2/3,-Math.PI*2/3,Math.PI*5/6,-Math.PI*5/6,Math.PI];
 return turns.map((turn,i)=>({x:from.x+Math.cos(heading+turn)*travel,z:from.z+Math.sin(heading+turn)*travel,i})).filter(clear).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||(a.i-b.i))[0]||null;
}
