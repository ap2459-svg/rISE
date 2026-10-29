import assert from 'node:assert/strict';
import {newDay} from '../../dist/floor-manager/day.mjs';
import {createDayUI} from '../../dist/floor-manager/day-ui.mjs';
const elements=new Map();globalThis.document={body:{dataset:{}},querySelector:s=>{if(!elements.has(s))elements.set(s,{hidden:false,open:false,style:{},dataset:{},setAttribute(){},addEventListener(){},close(){},showModal(){}});return elements.get(s)},querySelectorAll:()=>[]};
for(const blocked of [false,true]){const state=newDay();if(blocked)state.objects.push({id:'obstruction',type:'fixture',x:6,z:7.25,width:3,depth:2});let started=false;const ui=createDayUI(state,{cancel(){},changed(){},begin(slot,snapshot){started=true;assert.equal(slot,'day');assert.equal(snapshot.dayNumber,1)},toast(){throw Error('Opening must not be blocked')}});ui.requestRun();assert(started);assert.equal(state.phase,'day-running');}
console.log('PASS: empty café and blocked-entrance café both start service through the actual opening handler.');
