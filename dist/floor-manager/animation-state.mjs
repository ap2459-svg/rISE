// Interpolate between simulation samples instead of teleporting on each tick.
export function interpolatedPosition(p,alpha){const from=p.renderFrom||p.pos,t=Math.max(0,Math.min(1,alpha));return{x:from.x+(p.pos.x-from.x)*t,z:from.z+(p.pos.z-from.z)*t};}
export function animationStep(d,elapsed,speed,moving){const active=Math.max(0,Math.min(.1,elapsed))*Math.max(0,speed);d.animationTime=(d.animationTime||0)+active*1000;if(active>0)d.movementHold=moving?.18:Math.max(0,(d.movementHold||0)-active);return {time:d.animationTime,walking:(d.movementHold||0)>0};}
