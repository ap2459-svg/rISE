const assert=require('node:assert/strict');
global.window=global;
require('../dist/inventory-engine.js');
const {CONFIG,MENU}=RESCUE;

const g=new InventorySim(42);
assert.equal(g.planningTimeLeft(100000),90,'briefing time does not consume planning time');
g.resumePlanningClock(100000);
for(let now=101000;now<=130000;now+=1000)g.resumePlanningClock(now);
assert.equal(g.planningTimeLeft(130000),60,'repeated resumes do not reset the deadline');
g.tickPlanning(75);g.advancePlanning();
assert.equal(g.planningTimeLeft(130000),60,'logistics and speed do not change real planning time');
const saved=g.save(130000),restored=InventorySim.restore(saved);
assert.equal(restored.planningTimeLeft(900000),60,'saved game waits for intentional resume');
assert.equal(g.planningTimeLeft(140000),50,'autosave does not pause the active countdown');
restored.resumePlanningClock(900000);restored.pausePlanningClock(910000);
assert.equal(restored.planningTimeLeft(999999),50,'intentional mode exit retains the remaining time');
restored.resumePlanningClock(1000000);
assert.equal(restored.planningTimeLeft(2000000),0,'delayed callbacks clamp at zero');
restored.pausePlanningClock(2000000);
restored.resumePlanningClock(3000000);
assert.equal(restored.planningTimeLeft(3000000),0,'expired time cannot be renewed');
const legacy=JSON.parse(saved);delete legacy.state.planningRemaining;delete legacy.state.planningExpiresAt;
assert.equal(InventorySim.restore(JSON.stringify(legacy)).planningTimeLeft(),90,'pre-timer saves still load');
for(const invalid of [-1,91,'90',null]){
  legacy.state.planningRemaining=invalid;
  assert.equal(InventorySim.restore(JSON.stringify(legacy)),null,'invalid timer saves are rejected');
}

// Every day uses the same opening rules and pays overhead only once.
for(let day=1;day<=5;day++){
  assert.equal(g.day,day);
  if(day>1)assert.equal(g.planningTimeLeft(),90,'next morning has a fresh allowance');
  g.resumePlanningClock(0);
  g.pausePlanningClock(1000000);
  assert.equal(g.planningTimeLeft(),0);
  const before=g.cash;
  assert(g.open(),'expiry does not bypass required preparation');
  assert.equal(g.cash,before,'failed opening does not purchase or charge');
  g.briefed=true;g.introSeen=true;g.skipTutorial();
  INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
  g.observe('supplier','quick');g.observe('supplier','budget');g.observe('tab','trends');
  const options={1:{servings:6,supplier:'quick'},2:{servings:6,buffer:2,reorder:2},3:{strategy:'hybrid',buffer:2,reorder:2,capacity:'buffer',investment:'hold',reason:'cash'},4:{prices:{latte:6,oat:7}},5:{servings:6,buffer:2,reorder:2,capacity:'buffer',investment:'hold',reason:'cash'}};
  assert.equal(g.commitPlan(options[day]),null);
  if(day===1){
    assert.equal(g.placeOrder([{name:'Cup',qty:1,supplier:'quick',frozen:false,express:false}]),null);
    g.advancePlanning();g.deliveries.forEach(d=>g.shelve(d.id,true));
  }
  for(const name of new Set(MENU.filter(p=>['latte','oat','cookie'].includes(p.id)).flatMap(p=>p.recipe)))g.addLot(name,4,.1,14);
  const cash=g.cash,plan=JSON.stringify(g.lesson.plan);
  assert.equal(g.open(),null);
  assert.equal(g.cash,cash-CONFIG.dailyOverhead);
  assert(g.open(),'a second start is rejected');
  assert.equal(g.cash,cash-CONFIG.dailyOverhead,'no duplicate overhead charge');
  assert.equal(JSON.stringify(g.lesson.plan),plan,'opening retains confirmed decisions');
  assert.equal(g._planningDeadline,null,'opening clears the runtime deadline');
  assert.equal(g.planningTimeLeft(),0);
  g.finish();assert.equal(g.reflect(g.reviewOptions().correct),null);
  if(day<5)assert(g.nextDay());
}
console.log('PASS: planning deadlines, pause/resume, save compatibility, delayed callbacks, all five mornings and once-only opening.');
