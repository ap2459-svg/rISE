import {REPAIRS} from './catalog.mjs?v=crowds-40';
export const CLEANUP_KEYS=['waste','floor','paint'];
export function cleanupGoals(s){return [['waste','Clear waste'],['floor','Replace floorboards'],['paint','Replace walls']].map(([key,label])=>({key,label,price:REPAIRS[key].price,met:!!s[key]}));}
export function cleanupReady(s){return true;}
export function openingBlocker(s){if(!cleanupReady(s))return 'Finish Cleanup first';for(const type of ['barista','order','pickup'])if(!s.objects.some(o=>o.type===type))return 'Restore '+({barista:'coffee station',order:'ordering point',pickup:'pickup point'})[type];if(s.soldFixtures?.includes('espresso'))return 'Restore espresso machine';return null;}
export function repair(s,key){if(!CLEANUP_KEYS.includes(key)||s[key]||s.money<REPAIRS[key].price)return false;s.money-=REPAIRS[key].price;s[key]=true;if(key==='waste')s.clean=true;return true;}
