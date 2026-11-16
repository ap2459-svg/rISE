/* Guided practice only; the original shift and artwork stay unchanged. */
let lesson=null,lessonResult=null;
const originalStart=start,originalUpdate=update,originalStationUpdate=updateStation,originalOpen=openStation,originalHandoff=handoff;
const rating=n=>n>=95?'Great':n>=80?'Good':n>=55?'Fair':'Poor';
function notice(title,body,callback,label='Continue'){paused=true;document.querySelector('.modal-backdrop')?.remove();modalKind='tutorial-result';const e=document.createElement('div');e.className='modal-backdrop';e.innerHTML=`<section class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><p>${body}</p><button class="big-btn">${label}</button></section>`;document.body.appendChild(e);e.querySelector('button').onclick=()=>{closeModal();callback?.();};}
start=function(){sim=new QueueCafe();sim.tutorial=true;sim.arrivals=[0];sim.tick(.001);sim.duration=99999;sim.satisfaction=()=>100;sim.active.recipe={size:'Medium',syrup:'Vanilla',milk:'Oat Milk',coffee:'Original Blend',topping:['Whipped Cream','Caramel Drizzle'],bakery:'Croissant'};paused=false;servedAnimation=null;lesson=0;lessonResult=null;render();tutorialUpdate();};
update=function(){originalUpdate();if(sim?.tutorial){document.querySelector('#time-left').textContent='Practice';document.querySelector('#served-count').textContent='Tutorial customer';document.querySelector('#helper').disabled=true;document.querySelector('#rush-ribbon').hidden=true;tutorialUpdate();}};
updateStation=function(){originalStationUpdate();tutorialUpdate();};
openStation=function(k){if(lesson!==null&&!tutorialAllows(k))return;originalOpen(k);tutorialUpdate();};
const lessons=[
['Take your first order','Click Take order. This practice customer does not lose patience.','#take-order',()=>sim.active?.accepted],
['Open the syrup station','Click the Syrup tab.','#station-syrup',()=>stationPanel?.key==='syrup'],
['Choose Vanilla','Click the Vanilla bottle. Compare it with the ticket.','[data-choice="Vanilla"]',()=>sim.active.selections.syrup==='Vanilla'],
['Pour syrup','Hold the nozzle, release at the syrup line, then click Finish step.','#nozzle',()=>sim.active.fills.syrup!==undefined],
['Open milk','Click Milk.','#station-milk',()=>stationPanel?.key==='milk'],
['Choose Oat Milk','Click the Oat Milk carton.','[data-choice="Oat Milk"]',()=>sim.active.selections.milk==='Oat Milk'],
['Pour milk','Hold and release at the milk line, then Finish step. Leave room for toppings.','#nozzle',()=>sim.active.fills.milk!==undefined],
['Open coffee','Click Coffee to prepare the next layer.','#station-coffee',()=>stationPanel?.key==='coffee'],
['Choose Original Blend','Click Original Blend.','[data-choice="Original Blend"]',()=>sim.active.selections.coffee==='Original Blend'],
['Pour coffee','Hold the nozzle to the coffee line. Release, then Finish step.','#nozzle',()=>sim.active.fills.coffee!==undefined],
['Try the oven','Click Baking.','#station-baking',()=>stationPanel?.key==='baking'],
['Load the croissant','Drag Croissant into a slot, or select it and click an empty slot.','[data-food="Croissant"]',()=>sim.ovenSlots.some(Boolean)],

['Open toppings','Return to the queue, then open Toppings while the croissant bakes.','#station-topping',()=>stationPanel?.key==='topping'],
['Swirl cream','Select Whipped Cream, then hold the green Dispense button until the swirl reaches 100%.','[data-top-tool="Whipped Cream"]',()=>sim.active.appliedToppings.includes('Whipped Cream')],
['Drizzle caramel','Select Caramel Drizzle, then hold Dispense to 100%. The sauce flows automatically over the cream.','[data-top-tool="Caramel Drizzle"]',()=>sim.active.appliedToppings.includes('Caramel Drizzle')],
['Finish the drink','Click Finish drink.','#finish-toppings',()=>sim.active.lid],
['Collect your food','Open Baking and click Collect when the 20-second timer finishes.','#station-baking',()=>!!sim.active.bakeryResult],
['Hand it over','Return to the queue and click Give to Customer.','#give',()=>false]
];
function tutorialAllows(k){if(lesson===null)return true;const allowed=lesson<=3?'syrup':lesson<=6?'milk':lesson<=9?'coffee':lesson<=11?'baking':lesson<=15?'topping':lesson===16?'baking':null;return k===allowed;}
function tutorialUpdate(){document.querySelectorAll('.tutorial-target').forEach(e=>e.classList.remove('tutorial-target'));if(lesson===null||!sim?.tutorial){document.querySelector('#tutorial-coach')?.remove();return;}if(lessonResult)return;const step=lessons[lesson];if(!step)return;if(step[3]()){const old=lesson;lesson++;if([3,6,9].includes(old)){lessonResult=true;const k={3:'syrup',6:'milk',9:'coffee'}[old],score=sim.scores().steps[k];notice(rating(score)+'! '+Math.round(score)+'% accuracy','Your ingredient and fill level both affect quality. You can retry steps during a real shift.',()=>{lessonResult=null;tutorialUpdate();});return;}return tutorialUpdate();}let e=document.querySelector('#tutorial-coach');if(!e){e=document.createElement('aside');e.id='tutorial-coach';document.body.appendChild(e);}e.innerHTML=`<small>INTERACTIVE TUTORIAL · ${lesson+1}/${lessons.length}</small><b>${step[0]}</b><p>${step[1]}</p>`;document.querySelector(step[2])?.classList.add('tutorial-target');}

handoff=function(){if(!sim?.tutorial){originalHandoff();return;}if(!sim.ready())return;closeStation();const r=sim.serve();lesson=null;document.querySelector('#tutorial-coach')?.remove();notice('Tutorial Complete',`You practiced taking an order, pouring, baking, decorating, and handing it over. Your order accuracy was ${r.accuracy}%. You’re ready for your first shift!`,()=>{originalStart();},'Start the real shift');};
const originalShowModal=showModal;
showModal=function(kind){if(sim?.tutorial&&kind==='rush')return;if(sim?.tutorial&&kind==='pause'){notice('Practice paused','Your practice customer will wait. Finish the tutorial to begin the real shift.',()=>{},'Resume tutorial');return;}originalShowModal(kind);};
roles();

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalKind==='tutorial-result'){e.preventDefault();e.stopImmediatePropagation();}},true);
