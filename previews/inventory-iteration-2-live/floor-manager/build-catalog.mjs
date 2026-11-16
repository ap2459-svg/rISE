import {CATALOG} from './catalog.mjs?v=crowds-40';
import {SETS} from './seating-sets.mjs?v=crowds-40';

export const BUILD_VARIANTS={
 comfortableChair:{name:'Comfortable chair',type:'chair',design:'upholstered',price:70}
};
export const FURNITURE_GROUPS={
 tables:['smallTable','roundTable','groupTable'],
 seating:['chair','comfortableChair','armchair','booth'],
 extras:['tableOutlet','outlet','light','divider','plant']
};
export const buildItem=type=>BUILD_VARIANTS[type]||SETS[type]||CATALOG[type];
export function buildObject(type,id){
 const variant=BUILD_VARIANTS[type];
 return {id,type:variant?.type||type,x:0,z:.8,r:0,upgraded:true,...(variant?{design:variant.design,catalogOffer:type}:{})};
}
export const furnitureName=o=>o.type==='chair'&&o.design==='upholstered'?'Comfortable chair':CATALOG[o.type]?.name||'Furniture';
export function productNeed(type){return ({
 wallDecor:'Wall décor',ac:'Cooling nearby',comfortableChair:'Better back support',chair:'Extra table seating',
 armchair:'Relaxed seating',sofa:'Lounge comfort',bench:'Shared seating',booth:'Sit together',soundBooth:'Quieter seating',
 tableOutlet:'Charging at the table',outlet:'Charging near a wall',deskLamp:'Light for reading',floorLamp:'Light nearby',light:'Brighter café',
 divider:'Separate busy spaces',bookshelf:'Study atmosphere',rug:'Cozy atmosphere',plant:'Welcoming décor',poster:'Wall décor',floweringPlant:'Welcoming décor',
 soloSet:'Individual study space',smallSet:'Study seating for two',squareSet:'Seats for two',roundSet:'Seats for four',longSet:'Group study space',groupSet:'Seats for six',
 table:'Everyday table space',roundTable:'Space to chat',longTable:'Shared workspace',smallTable:'Individual workspace',groupTable:'Room for a group',
 highTable:'Short visits',windowCounter:'Seats by the window'
 })[type]||'Café improvement';}
export function requestBuildCategory(kind){return ['comfort','space','seating','noise'].includes(kind)?'seating':['groupPower'].includes(kind)?'tables':'extras';}
