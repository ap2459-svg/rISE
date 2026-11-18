export const PREPARATION_SECONDS=180;
export function startPreparation(state,now=Date.now()){state.prepDuration=PREPARATION_SECONDS;state.prepDeadline=now+PREPARATION_SECONDS*1000;}
export function migratePreparation(state,now=Date.now()){
 if(state.prepDeadline&&state.prepDuration!==PREPARATION_SECONDS){state.prepDeadline=Math.max(now,state.prepDeadline)+90000;state.prepDuration=PREPARATION_SECONDS;}
}
export function placementCompleted(step,event){
 if(!event?.changed)return false;
 if(step==='placed')return true;
 return step==='light'&&['light','floorLamp','deskLamp'].includes(event.type);
}
export function cameraDelta(yaw,right,forward,amount){return {x:(Math.cos(yaw)*right-Math.sin(yaw)*forward)*amount,z:(-Math.sin(yaw)*right-Math.cos(yaw)*forward)*amount};}
export function edgeDirection(x,y,width,height,margin=28){
 return {right:x<margin?-(margin-x)/margin:x>width-margin?(x-width+margin)/margin:0,forward:y<margin?(margin-y)/margin:y>height-margin?-(y-height+margin)/margin:0};
}
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
// Avoid interactive controls and the current scene target before other furniture.
export function coachPosition(width,height,card,obstacles=[],previous=null){
 const xs=[12,Math.max(12,width-card.width-12),Math.max(12,(width-card.width)/2)],ys=[90,Math.max(90,height-card.height-95),Math.max(90,(height-card.height)/2)];
 const candidates=xs.flatMap(x=>ys.map(y=>({x,y,width:card.width,height:card.height})));
 if(previous)candidates.unshift({...previous,...card});
 const score=p=>obstacles.reduce((n,r)=>n+overlap(p,r)*(r.weight||1),0);
 return candidates.reduce((a,b)=>score(a)<=score(b)?a:b);
}
