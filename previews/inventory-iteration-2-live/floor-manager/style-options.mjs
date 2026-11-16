export const FINISHES={original:{name:'Original',color:null},sage:{name:'Botanical',color:'#a5c4a1'},rose:{name:'Rose café',color:'#edb6c2'},coastal:{name:'Coastal',color:'#a9cbdc'},cream:{name:'Cream',color:'#fff0ce'},espresso:{name:'Espresso',color:'#9b785f'},midnight:{name:'Midnight',color:'#657384'}};
export function finishColor(o){return /^#[0-9a-f]{6}$/i.test(o.customColor||'')?o.customColor:FINISHES[o.finish]?.color||null}
export const mood=v=>v==null?'😶':v<35?'😠':v<55?'😕':v<75?'🙂':'😍';
// Materials are cloned per item, leaving shared furniture materials untouched.
export function tintModel(root,color){if(!color)return;root.traverse(m=>{if(!m.isMesh||!m.material||(m.material.emissiveIntensity>0&&m.material.emissive?.getHex()>0))return;const tint=material=>{const n=material.clone();if(n.color){n.color.set(color);if(n.map)n.color.lerp({r:1,g:1,b:1},.35)}return n};m.material=Array.isArray(m.material)?m.material.map(tint):tint(m.material)})}
