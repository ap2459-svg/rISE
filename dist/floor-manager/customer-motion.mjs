// Visual group members use the same obstacle-aware routes as the lead guest.
export function seatingRoute(sim, from, seat) {
  const approach = sim.seatPath(seat)?.path?.at(-2);
  if (!approach) return null;
  const path = sim.path(from, approach);
  return path ? [...path.slice(1), {x:seat.x, z:seat.z}] : null;
}
export function departureRoute(sim, from, seat, exit) {
  const approach = sim.seatPath(seat)?.path?.at(-2);
  if (!approach) return null;
  const atSeat = Math.hypot(from.x-seat.x, from.z-seat.z) < .25;
  const path = sim.path(atSeat ? approach : from, exit);
  return path ? (atSeat ? [approach, ...path.slice(1)] : path.slice(1)) : null;
}
export function advanceGuest(position, path, distance) {
  const next = {...position};
  while (path?.length && distance > 0) {
    const target = path[0], dx = target.x-next.x, dz = target.z-next.z, length = Math.hypot(dx,dz);
    if (length <= distance) { next.x=target.x;next.z=target.z;path.shift();distance-=length; }
    else { next.x+=dx/length*distance;next.z+=dz/length*distance;distance=0; }
  }
  return next;
}
