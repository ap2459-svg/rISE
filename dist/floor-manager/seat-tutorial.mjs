// A read-only guide to the existing seatOffer/offerSeat flow. It never reserves
// furniture, changes a guest, spends money, or pauses service.
export function availableLessonTables(sim,guest){
 if(!guest?.served||!['seated','seekingSeat','toWait'].includes(guest.phase))return [];
 return sim.tables.filter(t=>sim.seatOffer(guest,t.id));
}
export function updateSeatLesson(lesson,sim,context={}){
 if(!sim||sim.done)return null;
 let guest=sim.parties.find(g=>g.id===lesson?.guestId);
 if(lesson?.step==='walking'){
  if(guest?.phase==='seated'&&guest.tableId===lesson.tableId)return {...lesson,step:'success'};
  if(guest&&!['exiting','departed'].includes(guest.phase))return lesson;
  lesson=null;
 }
 if(lesson?.step==='success')return lesson;
 let tables=availableLessonTables(sim,guest);
 if(!tables.length){
  if(guest?.served&&['seated','seekingSeat','toWait'].includes(guest.phase)&&(context.selectedId===guest.id||context.assigningId===guest.id))return {guestId:guest.id,step:'waiting'};
  guest=sim.parties.find(g=>(!context.visible||context.visible(g.id))&&availableLessonTables(sim,g).length);
  if(!guest)return null;
  tables=availableLessonTables(sim,guest);lesson={guestId:guest.id,step:'customer'};
 }
 // Follow any suitable guest the player selects, rather than rejecting a
 // correct action simply because a different guest was highlighted.
 const selected=sim.parties.find(g=>g.id===(context.assigningId||context.selectedId));
 if(selected&&availableLessonTables(sim,selected).length){guest=selected;tables=availableLessonTables(sim,guest);}
 const step=context.assigningId===guest.id?'table':context.selectedId===guest.id?'button':'customer';
 const visibleTables=context.tableVisible?tables.filter(t=>context.tableVisible(t.id)):tables;
 const choices=visibleTables.length?visibleTables:tables;
 return {guestId:guest.id,tableId:choices.some(t=>t.id===lesson?.tableId)?lesson.tableId:choices[0].id,step};
}
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
export function seatCoachPosition(width,height,card,focus,obstacles=[]){
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const xs=[12,width-card.width-12,(width-card.width)/2],ys=[90,height-card.height-90,(height-card.height)/2];
 if(focus){xs.push(focus.x-card.width-18,focus.x+focus.width+18);ys.push(focus.y-card.height-18,focus.y+focus.height+18);}
 const candidates=xs.flatMap(x=>ys.map(y=>({x:clamp(x,8,width-card.width-8),y:clamp(y,8,height-card.height-8),...card})));
 const safe=focus?candidates.filter(p=>overlap(p,focus)===0):candidates;
 const score=p=>obstacles.reduce((sum,o)=>sum+overlap(p,o)*(o.weight||1),0)+(focus?overlap(p,focus)*10000:0);
 return (safe.length?safe:candidates).reduce((a,b)=>score(a)<=score(b)?a:b);
}
export function createSeatTutorial(state,actions){
 const panel=document.createElement('aside');panel.id='seatWalkthrough';panel.hidden=true;panel.setAttribute('aria-label','Offer Seat tutorial');document.body.append(panel);
 let lesson=null,lastUpdate=-Infinity,markup='',successUntil=0;
 const text={waiting:['WAITING FOR SPACE','That table was just taken','Keep serving. We’ll highlight a suitable table when one becomes free.'],customer:['1 / 3 · Select a customer','Click the highlighted customer','Choose this guest to see their seating options.'],button:['2 / 3 · Offer a seat','Click “Offer seat”','The highlighted button lets you choose a different table.'],table:['3 / 3 · Choose a table','Click the highlighted table','Choose its tabletop, or another green table. Drag to look around if you need a clearer view.'],walking:['ON THEIR WAY','Watch them walk over','The seat is reserved. We’ll confirm when they sit down.'],success:['SEATED ✓','You did it!','They reached their new seat. You can offer seats to other guests the same way.']};
 function hide(){panel.hidden=true;actions.highlight(null);}
 function finish(){state.seatTutorialDone=true;if(state.attemptStart)state.attemptStart.seatTutorialDone=true;actions.save();lesson=null;hide();}
 function update(force=false){
  const now=performance.now();if(!force&&now-lastUpdate<140)return;lastUpdate=now;
  if(state.dayNumber!==1||!['day-running','intervene'].includes(state.phase)||state.seatTutorialDone&&lesson?.step!=='success'){hide();return;}
  if(actions.busy?.()){hide();return;}
  const context=actions.context();const next=updateSeatLesson(lesson,context.sim,context);
  if(!next){lesson=null;hide();return;}
  if(next.step==='success'&&lesson?.step!=='success'){successUntil=now+5000;state.seatTutorialDone=true;if(state.attemptStart)state.attemptStart.seatTutorialDone=true;actions.save();}
  lesson=next;if(lesson.step==='success'&&now>=successUntil){finish();return;}
  const [progress,title,body]=text[lesson.step];
  const content=`<button id="dismissSeatTutorial" aria-label="Dismiss seat tutorial">×</button><small>${progress}</small><h3>${title}</h3><p>${body}</p>`;
  if(content!==markup){panel.innerHTML=content;markup=content;panel.querySelector('button').onclick=finish;}
  panel.hidden=false;
  const focus=actions.highlight(['walking','waiting'].includes(lesson.step)?'customer':lesson.step,lesson.step==='table'?lesson.tableId:lesson.guestId);
  const protectedRects=actions.protectedRects?.()||[];
  for(const selector of ['#shop','#objectMenu','#customerCard','#cameraControls','#seatGuide','#topBank','#shiftProfitHud','#missionPanel','#dayHud','#simControls']){
   const e=document.querySelector(selector);if(!e||e.hidden||!e.getClientRects().length)continue;
   const r=e.getBoundingClientRect();protectedRects.push({x:r.x-8,y:r.y-8,width:r.width+16,height:r.height+16,weight:20});
  }
  const r=panel.getBoundingClientRect(),pos=seatCoachPosition(innerWidth,innerHeight,{width:r.width,height:r.height},focus,protectedRects);
  panel.style.left=pos.x+'px';panel.style.top=pos.y+'px';
 }
 return {update,assigned(guestId,tableId){if(state.seatTutorialDone||state.dayNumber!==1||!lesson)return;lesson={guestId,tableId,step:'walking'};update(true);},restart(){state.seatTutorialDone=false;lesson=null;actions.save();update(true);}};
}
