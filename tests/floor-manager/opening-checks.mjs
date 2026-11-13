import assert from 'node:assert/strict';
import {newDay} from '../../dist/floor-manager/day.mjs';
import {createDayUI} from '../../dist/floor-manager/day-ui.mjs';
import {repair} from '../../dist/floor-manager/cleanup.mjs';
const elements=new Map();globalThis.document={body:{dataset:{}},querySelector:s=>{if(!elements.has(s))elements.set(s,{hidden:false,open:false,style:{},dataset:{},setAttribute(){},addEventListener(){},close(){},showModal(){}});return elements.get(s)},querySelectorAll:()=>[]};
for(const missing of [null,'barista','order','pickup','espresso']){
 const state=newDay();let started=0,message='';
 const ui=createDayUI(state,{cancel(){},changed(){},begin(slot,snapshot){started++;assert.equal(slot,'day');assert.equal(snapshot.dayNumber,1)},toast(m){message=m}});
 ui.requestRun();assert.equal(started,0);assert.equal(message,'Finish Cleanup first');assert.equal(state.phase,'design');
 for(const key of ['waste','floor','paint'])assert(repair(state,key));
 if(missing==='espresso')state.soldFixtures=['espresso'];else if(missing)state.objects=state.objects.filter(o=>o.type!==missing);
 ui.requestRun();assert.equal(started,missing?0:1);assert.equal(state.phase,missing?'design':'day-running');
 if(missing)assert.match(message,/^Restore /);else{ui.requestRun();assert.equal(started,1,'Repeated opening cannot restart the shift');}
}
console.log('PASS: cleanup and required equipment gate the real opening handler; a ready café starts once.');
