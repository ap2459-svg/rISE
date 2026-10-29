import {CafeSimulation,staticAssessment,PROFILES} from './day.mjs?v=four-days-11';
import {ENTRY,free} from './layout.mjs?v=four-days-11';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),length=p=>p.slice(1).reduce((n,q,i)=>n+distance(q,p[i]),0);
export function forecast(cafe){
 const sim=new CafeSimulation(cafe,'day'),assessment=staticAssessment(cafe),routes=[],warnings=[];
 function add(name,a,b,path){path=path===undefined?sim.path(a,b):path;
  if(!path){routes.push({name,path:[],blocked:true,target:b});warnings.push(name+' is unreachable');return}
  let samples=0,narrow=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(distance(a,b)/.35));for(let j=0;j<=n;j++){samples++;if(!free({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n},sim.obs,.45))narrow++;}}
  const d=length(path),ratio=d/Math.max(.1,distance(a,b));routes.push({name,path,length:d,narrow:narrow/Math.max(1,samples),ratio,color:narrow/samples>.3||ratio>1.8?'red':narrow/samples>.10||ratio>1.25?'yellow':'green'});
 }
 add('Entrance → order',ENTRY,sim.order);add('Order → pickup',sim.order,sim.pickup);add('Pickup → exit',sim.pickup,ENTRY);
 let reachable=0;const fits={study:[],remote:[],social:[]};
 for(const t of sim.tables){const seats=sim.seats.filter(c=>c.tableId===t.id),seat=seats[0];if(!seat)continue;const approach=sim.seatPath(seat);if(approach){reachable+=seats.length;const path=approach.path.slice(0,-1);add('Pickup → seating',sim.pickup,path.at(-1),path);for(const key of Object.keys(fits)){const g={type:key,size:key==='social'?Math.min(4,seats.length):1};fits[key].push(sim.score(g,sim.factors(g,seat,t,[]))*100)}}else warnings.push('A table has no accessible seat');}
 for(const door of sim.bathrooms)add('Pickup → bathroom',sim.pickup,door);
 const available=routes.filter(r=>r.path.length),travel=available.length?available.reduce((n,r)=>n+r.length,0)/available.length:0;
 const blocked=routes.filter(r=>r.blocked).length,narrow=available.filter(r=>r.color!=='green').length;
 if(narrow)warnings.push(narrow+' routes have tight clearance or a detour');
 return {...assessment,routes,reachable,travel,blocked,narrow,warnings:[...new Set(warnings)].slice(0,3),types:Object.fromEntries(Object.entries(fits).map(([k,v])=>[k,v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null]))};
}
export function routeTraffic(path,traffic={}){let delay=0,time=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(distance(a,b)/.3));for(let j=0;j<=n;j++){const key=Math.round((a.x+(b.x-a.x)*j/n)*2)/2+','+Math.round((a.z+(b.z-a.z)*j/n)*2)/2,t=traffic[key];if(t){time+=t.visits;delay+=t.delay}}}return time?delay/time:0}
