export const RENOVATIONS={
 bathroom:{name:'A bathroom',price:700,description:'A reason to stay a little longer.',detail:'One shared bathroom. Customers can take a break and return to their seats.',x:5.85,z:-6.2},
 nook:{name:'Study nook',price:1350,description:'Build a quiet corner.',detail:'Adds a new room with two booths, outlets and warm task lighting.',x:9.1,z:.7},
 window:{name:'A new window',price:450,description:'Let the afternoon light in.',detail:'Open up the right wall and brighten nearby seats.',x:7.4,z:5.1},
 bathrooms:{name:'Girls’ & boys’ bathrooms',price:950,requires:'bathroom',description:'More room. Less waiting.',detail:'Expand the bathroom into two separate rooms, so two visitors can take a break at once.',x:5.85,z:-6.2}
};
export const NOOK={left:7.1,right:10.95,back:-1.85,front:3.35};
export const BATHROOM={left:4.4,right:7.2,back:-7.85,front:-4.6};
export function renovationState(s){s.renovations||={nook:false,window:false,bathroom:false,bathrooms:false};s.dayNumber||=1;s.history||=[];return s}
export function renovationAvailability(s,key){const item=RENOVATIONS[key];if(!item)return'Unavailable';if(s.renovations?.[key])return'Built';if(item.requires&&!s.renovations?.[item.requires])return'Build a bathroom first';if(!['design','renovate','adjust','day-running'].includes(s.phase))return'Build before opening';if(s.money<item.price)return`Save $${item.price-s.money} more`;return null}
export function purchaseRenovation(s,key){if(renovationAvailability(s,key))return false;const item=RENOVATIONS[key];s.money-=item.price;s.renovations[key]=true;if(key==='nook'){for(const o of s.objects){if(['poster','wallDecor','outlet'].includes(o.type)&&o.wallAxis==='x'&&o.wallSign===1&&o.z>-2&&o.z<3.6)o.x=11.08;}s.objects.push({id:'nook-area',type:'nookArea',x:9,z:.7,r:0,upgraded:true});for(const [i,z]of[-.55,2.05].entries()){s.objects.push({id:'nook-booth-'+i,type:'booth',x:9.3,z,r:0,upgraded:true},{id:'nook-outlet-'+i,type:'outlet',x:10.86,z,y:0,r:-Math.PI/2,wallAxis:'x',wallSign:1,upgraded:true});s.lights.push({id:'nook-light-'+i,type:'light',x:9.3,z,r:0,upgraded:true,lightType:'daylight',brightness:95})}}return true}
export function bathroomDoors(s){if(!s.renovations?.bathroom)return[];return s.renovations.bathrooms?[{x:5.05,z:-4.28},{x:6.55,z:-4.28}]:[{x:5.85,z:-4.28}]}
