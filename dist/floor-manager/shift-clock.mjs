// Exactly 240 active seconds includes service and closing. Pause freezes this clock.
export const MAX_SHIFT_SECONDS = 240;
export const SERVICE_MINUTES = 120;
export const SHIFT_MINUTES = 128;
export const SIMULATION_RATE = SHIFT_MINUTES / MAX_SHIFT_SECONDS;
export function shiftAdvance(elapsedSeconds, speed = 1) {
  return Math.max(0, elapsedSeconds) * SIMULATION_RATE * Math.max(0, speed);
}
export const shiftSecondsLeft = time => Math.max(0, Math.ceil((SHIFT_MINUTES-time)/SIMULATION_RATE));
