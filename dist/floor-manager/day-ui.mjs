import {PREPARATION_SECONDS,startPreparation,migratePreparation,placementCompleted,coachPosition} from './classroom-controls.mjs?v=flow-48';
import {checkpointFor,retainQuestionHistory} from './checkpoint-questions.mjs?v=flow-48';
import {shiftProfit,visibleProfit} from './shift-finance.mjs?v=flow-48';
import {recognizeAreas,layoutMissionStats} from './request-system.mjs?v=flow-48';
import {CafeSimulation} from './day.mjs?v=flow-48';
import {starsMarkup,ratingChange,formatStars} from './ratings.mjs?v=flow-48';
import {cleanupReady,cleanupGoals,openingBlocker} from './cleanup.mjs?v=flow-48';
import {shiftSecondsLeft,SHIFT_MINUTES} from './shift-clock.mjs?v=flow-48';
import {mood} from './style-options.mjs?v=flow-48';
import {cafeSnapshot} from './day.mjs?v=flow-48';
import {DAYS,mission,missionProgress,rewardFor,settleDay,categoryResults} from './campaign.mjs?v=flow-48';
const $=s=>document.querySelector(s),n=v=>Math.round(v??0),pct=v=>v==null?'—':n(v)+'%',money=v=>(v<0?'−':'')+'$'+Math.abs(n(v)),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const bars=types=>categoryResults(types).map(t=>`<div class="satisfaction-row"><span>${t.name}</span><div class="satisfaction-track"><i style="width:${t.satisfaction??0}%;background-size:${t.satisfaction?10000/t.satisfaction:100}% 100%"></i></div><b>${pct(t.satisfaction)}</b></div>`).join('');
// Cache by element identity so newly opened panels always receive their content.
const uiMarkup=new WeakMap();
export function setMarkupIfChanged(element,markup){if(!element||uiMarkup.get(element)===markup)return false;element.innerHTML=markup;uiMarkup.set(element,markup);return true;}
export function createDayUI(state,actions){
 const modal=$('#dayModal');let speed=1,paused=false,inspecting=false,lastSim=null,planningMetrics=null,planningKey='';
 const celebrated=new Set();let missionTimer;
 const api={coachEvent,positionCoach,get coachStep(){return coachStep},togglePause:()=>{if(['day-running','intervene'].includes(state.phase))$('#pauseSim').click()},inspect:on=>{inspecting=on;refresh()},pause:()=>{paused=true;refresh()},refresh,requestRun,completed,live,restore,get speed(){return state.phase==='intervene'||paused?0:speed},setSpeed:value=>{speed=[1,2,3].includes(+value)?+value:1;refresh()},get paused(){return paused}};

 function beginPrep(){startPreparation(state);actions.save();$('#prepClock').hidden=false;}
 setInterval(()=>{if(!['design','renovate','adjust'].includes(state.phase)||!state.prepDeadline)return;const left=Math.max(0,Math.ceil((state.prepDeadline-Date.now())/1000));$('#prepClock').hidden=false;$('#prepClock').textContent='Prepare · '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(!left){const blocker=openingBlocker(state);if(blocker){$('#prepClock').textContent='Opening blocked: '+blocker;return;}requestRun();}},250);
 migratePreparation(state);
 let coachStep=-1,coachActivity='',coachPositionTimer=0,coachLastPosition=null;
 const coach=document.createElement('aside');coach.id='walkthrough';coach.hidden=true;document.body.append(coach);
 const guide=[
 ['Walk into your café',null,'Hold W/A/S/D or arrow keys to walk. In the overhead views, the same keys move the camera. There are no customers yet.','walk'],
 ['Look around',null,'Drag across the café to look around. In Bird’s-eye view, drag to pan; right-drag to rotate and tilt. R rotates the view when you are not placing an item.','look'],
 ['Try zooming','#zoomIn','Use the mouse wheel or the + / − buttons to see more of the room.','zoom'],
 ['Read your goals','#toggleMissions','Open Missions to see this day’s goals. Profit changes as customers buy drinks and you spend on improvements.','missions'],
 ['Open the shop','#storeToggle','Open the shop. Choose furniture with your limited budget. Buying an item starts a placement preview; you pay when you place it.','shop'],
 ['Place furniture',null,'Select a table or chair, choose Move, and move your cursor to a clear spot. R turns the item. Click to place when the outline is green; Esc cancels. Buying and placing a new item also counts.','placed'],
 ['Place a light',null,'Move any existing lamp, or choose Furniture → Extras → Hanging light. Move the preview near a table and click to place. Your next instruction appears after placement.','light'],
 ['Prepare, then open','#open','You have 3:00 to prepare. Open early whenever you are ready. We’ll then practice offering a customer a seat. P pauses or resumes service.','open']
 ];
 function positionCoach(force=false){
  if(coachStep<0||coach.hidden||!force&&performance.now()-coachPositionTimer<180)return;
  coachPositionTimer=performance.now();
  const context=actions.coachContext?.()||{},protectedRects=context.rects||[];
  for(const selector of ['#shop','#objectMenu','#customerCard','#cameraControls','#placement','#open','#simControls','#topBank','#missionPanel','#dayHud','#seatGuide','#tutorialHelp','#shiftProfitHud','#prepClock']){
   const e=$(selector);if(!e||e.hidden||!e.getClientRects().length)continue;const r=e.getBoundingClientRect();protectedRects.push({x:r.left-8,y:r.top-8,width:r.width+16,height:r.height+16,weight:20});
  }
  if(context.cursor)protectedRects.push({x:context.cursor.x-60,y:context.cursor.y-60,width:120,height:120,weight:40});
  const r=coach.getBoundingClientRect();const next=coachPosition(innerWidth,innerHeight,{width:r.width,height:r.height},protectedRects,force?null:coachLastPosition);
  coach.style.left=next.x+'px';coach.style.top=next.y+'px';coachLastPosition=next;
 }
 function paintCoach(){
  document.querySelectorAll('.walk-target').forEach(e=>e.classList.remove('walk-target'));if(coachStep<0)return;
  const [title,target,body,event]=guide[coachStep];coach.hidden=false;
  const instructions=coachActivity==='placing'?'Move your cursor over the café. Click a clear spot to place. R rotates; Esc cancels.':coachActivity==='assigning'?'Click a green-outlined table to offer its free chairs. Red tables cannot fit this party. Esc cancels.':body;
  coach.innerHTML='<button id="skipWalk" aria-label="Dismiss tutorial">×</button><small>HOW TO PLAY · '+(coachStep+1)+' / '+guide.length+'</small><h3>'+title+'</h3><p>'+instructions+'</p><small class="practice-status">Instructions advance after you complete the action.</small>'+(event==='light'&&coachActivity!=='placing'?'<button id="showPracticeLights">Show lights in shop</button>':'');
  if(target)$(target)?.classList.add('walk-target');$('#skipWalk').onclick=finishCoach;
  if($('#showPracticeLights'))$('#showPracticeLights').onclick=()=>actions.showLights?.();
  positionCoach(true);
 }
 function finishCoach(){coachStep=-1;coach.hidden=true;document.querySelectorAll('.walk-target').forEach(e=>e.classList.remove('walk-target'));state.tutorialDone=true;state.handsOnVersion=2;delete state.coachStep;actions.save();if(['design','adjust','renovate'].includes(state.phase)&&!state.prepDeadline)beginPrep();}
 function coachEvent(event,data={}){
  if(coachStep<0)return false;
  if(event==='placing'||event==='assigning'||event==='cancelPlacement'){coachActivity=event==='cancelPlacement'?'':event;paintCoach();return false;}
  const expected=guide[coachStep][3];
  if(event==='placed'?!placementCompleted(expected,data):expected!==event)return false;
  coachStep++;coachActivity='';state.coachStep=coachStep;actions.save();
  if(coachStep>=guide.length){finishCoach();return true;}
  paintCoach();if(guide[coachStep][3]==='open')beginPrep();return true;
 }
 function showTutorial(resume=false){
  // Old saves may be on the former seating steps. Hand them to the new live
  // lesson rather than restoring an Open button that is hidden during service.
  if(resume&&state.coachStep>=guide.length&&['day-running','intervene'].includes(state.phase)){finishCoach();return;}
  modal.close();if(!['design','adjust','renovate'].includes(state.phase)&&!resume){actions.toast('Start the tutorial before opening a shift.');return;}
  if(!resume){state.prepDeadline=null;$('#prepClock').hidden=true;coachStep=0;actions.startPractice?.();}else coachStep=Math.min(state.coachStep||0,guide.length-1);
  coachActivity='';state.coachStep=coachStep;actions.save();paintCoach();
 }
 $('#tutorialHelp').onclick=()=>{if(state.dayNumber===1&&['day-running','intervene'].includes(state.phase)){actions.seatingHelp?.();return;}showTutorial();};
 document.addEventListener('click',e=>{if(e.target.closest('#toggleMissions'))coachEvent('missions');else if(e.target.closest('#storeToggle,#shopToggle'))coachEvent('shop');},true);
 $('#toggleMissions').onclick=()=>{const goals=$('#dailyGoals');goals.hidden=!goals.hidden;$('#toggleMissions').setAttribute('aria-expanded',String(!goals.hidden));};
 function showCheckpoint(next){
  if(state.isePassedDay===state.dayNumber){next();return;}
  const q=checkpointFor(state);actions.save();
  if(!q){show('<h1>All checkpoints completed</h1><p>You have answered every question in this playthrough.</p><button id="iseContinue" class="green-btn">Continue</button>');$('#iseContinue').onclick=()=>{state.isePassedDay=state.dayNumber;actions.save();next();};return;}
  show('<span class="eyebrow">DAY '+state.dayNumber+' · ISE CHECKPOINT</span><h1>Check ISE Understanding</h1><p>'+q.q+'</p><div class="checkpoint-options">'+q.a.map((a,i)=>'<button data-answer="'+i+'">'+a+'</button>').join('')+'</div><p id="iseFeedback" role="status"></p><button id="iseContinue" class="green-btn" hidden>Continue</button>');
  for(const button of modal.querySelectorAll('[data-answer]'))button.onclick=()=>{const correct=+button.dataset.answer===q.correct;$('#iseFeedback').textContent=(correct?'Correct! ':'Try again. ')+q.why;if(correct){state.isePassedDay=state.dayNumber;actions.save();for(const b of modal.querySelectorAll('[data-answer]'))b.disabled=true;$('#iseContinue').hidden=false;$('#iseContinue').textContent=missionProgress(state,state.reports.current).every(g=>g.met)?'Unlock next day →':'Return to results · retry required';$('#iseContinue').onclick=next;}};
 }

 function changed(){state.opened=!['design','renovate','adjust','intervene','day-running'].includes(state.phase);actions.changed();refresh()}
 function show(html){modal.innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0}
 modal.addEventListener('cancel',e=>{e.preventDefault();modal.close()});
 function showMission(){const m=state.dayNumber===1?{...mission(state),name:'Grand Reopening',hint:'Learn your café controls, then prepare for your first customers.'}:mission(state),icons=['☕','🌿','📚','🔥'];show(`<div class="mission-intro"><div class="mission-ribbon">YOUR CAFÉ · YOUR CALL</div><div class="mission-medallion">${icons[state.dayNumber-1]}</div><span class="eyebrow">DAY ${state.dayNumber} OF ${DAYS.length}</span><h1>${esc(m.name)}</h1>${state.dayNumber===1?'<h2>Welcome, Floor Manager!</h2>':''}<p class="mission-hook">${esc(m.hint)}</p><p>Choose what matters. Watch your customers. Try a different approach.</p><section class="welcome-missions"><h3>Your missions</h3><ul>${m.goals.map(([,target,label])=>`<li>${esc(label)}</li>`).join('')}</ul></section><button id="beginPlanning" class="green-btn">Make it yours →</button></div>`);$('#beginPlanning').onclick=()=>{state.welcomeSeen=true;state.missionSeen=state.dayNumber;modal.close();actions.save();if(state.dayNumber===1&&!state.handsOnVersion)showTutorial();else beginPrep()}}
 function refresh(){
  const phase=state.phase,running=['day-running','intervene'].includes(phase),planning=['design','renovate','adjust'].includes(phase),m=mission(state);
  document.body.dataset.service=phase==='day-running'?'on':'';$('#slotNumber').textContent='DAY '+state.dayNumber+' / '+DAYS.length+(state.attempt>1?' · TRY '+state.attempt:'');$('#slotName').textContent=m.name;const brief=$('#shiftBrief');if(brief){brief.textContent=state.dayNumber===2?'Create focus and social spaces for different types of café visitors.':state.dayNumber===3?(state.renovations?.bathroom?'Bathroom added! Keep its doorway clear, and add a study nook for privacy.':'Customers are getting upset that there’s no bathroom. Add a bathroom and a study nook for privacy.'):'';brief.hidden=!brief.textContent;}
  $('#pauseSim').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');$('#quizProgress').textContent=phase==='intervene'?'Service paused. Move unoccupied furniture, then continue.':planning?m.hint:'';
  const profit=visibleProfit(state,lastSim);$('#shiftProfitHud').hidden=false;$('#shiftProfitHud').dataset.positive=profit>=0;$('#shiftProfitValue').textContent=money(profit);$('#changeBudget').hidden=true;$('#simControls').hidden=!running;$('#livePanel').hidden=!running||phase==='intervene';$('#resultsButton').hidden=!['day-report','campaign-complete'].includes(phase);$('#open').hidden=!(planning||phase==='intervene');$('#open').disabled=planning&&!!openingBlocker(state);$('#open').title=openingBlocker(state)||'Open café';$('#open').textContent=phase==='intervene'?'▶':'▶ Open';$('#simTime').hidden=!running;$('#streakCorner').hidden=!running;
  $('#interveneSim').hidden=!running;$('#interveneSim').textContent=phase==='intervene'?'▶':'✎';$('#pauseSim').textContent=paused?'▶':'Ⅱ';$('#pauseSim').disabled=phase==='intervene';
  for(const b of document.querySelectorAll('[data-speed]'))b.setAttribute('aria-pressed',+b.dataset.speed===speed);
  const r=lastSim&&running?lastSim.results(true):phase==='day-report'?state.reports.current:phase==='campaign-complete'?state.campaignHistory.at(-1)?.report:null;
  let display=r;if(planning){const key=JSON.stringify([state.objects,state.lights,state.atmosphere,state.renovations,state.blinds]);if(key!==planningKey){planningKey=key;planningMetrics=layoutMissionStats(new CafeSimulation({...cafeSnapshot(state),baselineLayout:undefined},'day'));}display=planningMetrics;}renderGoals(display);
  $('#dayDots').innerHTML=DAYS.map((d,i)=>`<span title="Day ${i+1}: ${d.name}" class="${i+1===state.dayNumber?'current':i+1<state.dayNumber?'done':''}">${i+1<state.dayNumber?'✓':i+1}</span>`).join('');
  $('#layoutPreview').hidden=!planning&&phase!=='intervene';
 }
 function renderGoals(r){const preparing=!cleanupReady(state)&&['design','renovate','adjust'].includes(state.phase),goals=preparing?cleanupGoals(state).map(g=>({...g,target:1,value:g.met?1:0})):missionProgress(state,r),met=goals.filter(g=>g.met).length;for(const goal of goals){const key=state.dayNumber+':'+goal.key;if(goal.met&&!celebrated.has(key)&&state.phase==='day-running'){celebrated.add(key);const notice=$('#missionToast');notice.textContent='Good Job! '+goal.label;notice.hidden=false;clearTimeout(missionTimer);missionTimer=setTimeout(()=>notice.hidden=true,2500);}}const summary=`${met} / ${goals.length} · ${preparing?'Restore before opening':'Missions'}`;if($('#missionSummary').textContent!==summary)$('#missionSummary').textContent=summary;
 let goalsMarkup=goals.map(g=>`<div class="mission-goal ${g.met?'met':''}"><span>${g.met?'✓':'○'} ${esc(g.label)}</span><b>${g.pending?'…':g.key==='profit'?money(g.value)+' / '+money(g.target):g.key==='satisfaction'&&state.dayNumber===1?(Math.round(g.value*10)/10)+'%':(g.key.includes('Stars')||g.key==='stars'?formatStars(Math.min(g.value,g.target)):n(Math.min(g.value,g.target)))+' / '+g.target}</b><progress max="${g.target}" value="${g.pending?0:Math.min(g.target,g.value)}" title="${g.pending?'Waiting for 3 completed visits':g.key==='completedRequests'?'Requests resolved and needs met by a suitable prepared seat count once.':g.key==='ergonomicRescues'?'Plan a better seat or fix discomfort: a guest must reach 3.25 stars. Planning improvements need 5 comfortable seated minutes. Each guest counts once.':esc(g.label)}" aria-label="${esc(g.label)}"></progress></div>`).join('');
 if(state.dayNumber>=2&&r?.areas){goalsMarkup+=`<div class="area-status">${[['social','Social corner'],['focus','Focus space']].map(([k,label])=>`<span>${(r.areas[k]||[]).length?'✓':'○'} ${label}</span>`).join('')}</div>`;}setMarkupIfChanged($('#dailyGoals'),goalsMarkup);setMarkupIfChanged($('#catalogMissionGoals'),goalsMarkup);
 const historyMarkup=(state.campaignHistory||[]).map(h=>`<button data-replay="${h.day}" ${state.phase==='day-running'||state.phase==='intervene'||state.practiceReturn?'disabled':''}>Day ${h.day}: ${h.goals.filter(g=>g.met).length}/${h.goals.length} standards · Replay</button>`).join('');
 setMarkupIfChanged($('#missionHistory'),historyMarkup);
 for(const b of document.querySelectorAll('[data-replay]'))b.onclick=()=>{const h=state.campaignHistory.find(h=>h.day===+b.dataset.replay);if(!h?.start){actions.toast('Replay is available for shifts completed after this update.');return}const saved=JSON.parse(JSON.stringify(state));for(const k of Object.keys(state))delete state[k];Object.assign(state,JSON.parse(JSON.stringify(h.start)));retainQuestionHistory(state,saved);state.challengeBests=saved.challengeBests;state.practiceReturn=saved;state.dayNumber=h.day;state.phase='adjust';state.reports={};state.attemptStart=null;lastSim=null;actions.renovate();changed();actions.toast('Practice replay: improve your record. Your current café and budget stay safe.');};
 }
 function requestRun(){
  if(coachStep>=0&&guide[coachStep][3]!=='open'){actions.toast('Complete this practice action first, or choose Skip practice.');return;}if(coachStep>=0)coachEvent('open');
  state.prepDeadline=null;$('#prepClock').hidden=true;
  if(state.phase==='intervene'){actions.cancel();state.phase='day-running';paused=false;changed();actions.resume?.();return}
  if(!['design','renovate','adjust'].includes(state.phase))return;const blocker=openingBlocker(state);if(blocker){actions.toast(blocker);actions.prepare?.();return;}state.openingRepairBudget=0;
  actions.cancel();state.attemptStart=JSON.parse(JSON.stringify({...state,practiceReturn:undefined,attemptStart:undefined}));state.phase='day-running';state.runSnapshot=cafeSnapshot(state);state.runElapsed=0;state.liveCredited=0;state.shiftHintStart=state.hintSpent||0;api.lastBreak=null;$('#streakNotice').hidden=true;state.interventions=[];paused=false;lastSim=null;modal.close();changed();actions.begin('day',state.runSnapshot);
 }
 function completed(report){if(coachStep>=0)finishCoach();state.checkpointSerial=(state.checkpointSerial||0)+1;delete state.checkpoint;creditSales(report);$('#comboHud').hidden=true;
 const success=missionProgress(state,report).every(g=>g.met);
 report.challengeScore=Math.max(0,Math.round((report.completedRequests||0)*100+(report.served||0)*20+(report.bestStreak||0)*25+Math.max(0,report.profit)));
 state.challengeBests||={};const oldBest=state.challengeBests[state.dayNumber]||0;report.newBest=report.challengeScore>oldBest;state.challengeBests[state.dayNumber]=Math.max(oldBest,report.challengeScore);
 report.medals=[success?'Mission master':null,report.bestStreak>=6?'Service streak · 6+':null,report.people&&report.served/report.people>=.9?'Service star · 90% served':null,success&&report.satisfaction>=80?'Café expert · 4★ guests':null].filter(Boolean);

  const completedGoals=missionProgress(state,report);report.missionsCompleted=completedGoals.filter(g=>g.met).length;report.missionsTotal=completedGoals.length;delete report.missionStars;state.isePassedDay=null;state.reports.first||=report;state.reports.current=report;state.phase='day-report';state.runElapsed=0;state.runSnapshot=null;lastSim=null;inspecting=false;changed();renderReport();
 }
 function renderReport(){
  const r=state.reports.current;if(!r)return;r.dayNumber??=state.dayNumber;if(r.inspection){show(`<div class="mission-intro"><div class="mission-medallion">🔑</div><h1>Ready to reopen!</h1><p>Open with the layout you chose.</p><p>Tomorrow your first customers will show you what works.</p><button id="acceptInspection" class="green-btn">Day 2 · Make Them Stay →</button></div>`);$('#acceptInspection').onclick=()=>{settleDay(state);modal.close();actions.renovate();changed();showMission()};return}const old=state.reports.previous,goals=missionProgress(state,r),reward=rewardFor(state,r);
  const previous=old||state.campaignHistory.at(-1)?.report;
  show(`<div class="report-head"><span class="eyebrow">SHIFT ${state.dayNumber} COMPLETE</span><h1>Your café’s rating</h1></div><div class="report-scroll">${starsMarkup(r)}${previous?`<p class="rating-change">${ratingChange(r,previous)}</p>`:''}<div class="mission-results">${goals.map(g=>`<span class="${g.met?'met':''}">${g.met?'✓':'○'} ${esc(g.label)}</span>`).join('')}</div><div class="metric-grid report-simple"><div class="metric"><small>Customer needs met</small><b>${r.completedRequests||0}</b></div><div class="metric"><small>Customers served</small><b>${r.served||0}</b></div><div class="metric"><small>Shift profit</small><b>${money(r.profit)}</b>${r.assetSales?`<span class="profit-sales">Item sales +${money(r.assetSales)}</span>`:''}</div></div><section class="challenge-results"><h2>${r.newBest?'New personal best!':'Your shift score'} · ${r.challengeScore||0}</h2><p>${(r.medals||[]).join(' · ')||'Next challenge: complete the missions and serve 6 happy customers in a row.'}</p><small>Replay to improve your score. Optional medals never block the next day.</small></section>${reviewCards(r)}</div><div class="report-actions"><button id="inspectAfter" class="paper-btn">View café</button><button id="retryDay" class="paper-btn">Retry shift</button><button id="acceptDay" class="green-btn">Check ISE Understanding →</button></div>`);
  $('#inspectAfter').onclick=()=>modal.close();$('#retryDay').onclick=()=>{const questions=JSON.parse(JSON.stringify(state)),bests=state.challengeBests,start=state.attemptStart,practice=state.practiceReturn,attempt=state.attempt+1;if(start){for(const k of Object.keys(state))delete state[k];Object.assign(state,JSON.parse(JSON.stringify(start)));}else{state.money-=state.liveCredited||0;}retainQuestionHistory(state,questions);state.challengeBests=bests;state.practiceReturn=practice;state.liveCredited=0;state.reports={previous:r};state.attempt=attempt;state.phase='adjust';state.runElapsed=0;state.runSnapshot=null;state.interventions=[];modal.close();lastSim=null;actions.renovate();changed();actions.toast('Starting funds and layout restored. Same customers, same arrivals.');celebrated.clear();beginPrep();};
  $('#acceptDay').onclick=()=>{showCheckpoint(()=>advance());};function advance(){if(!goals.every(g=>g.met)){renderReport();return;}if(state.practiceReturn){const saved=state.practiceReturn,h=saved.campaignHistory.find(h=>h.day===state.dayNumber),extra=Math.max(0,reward-(h.reward||0));if(goals.filter(g=>g.met).length>h.goals.filter(g=>g.met).length){h.goals=goals;h.report=r;h.reward=reward;h.earned+=extra;h.layout=JSON.parse(JSON.stringify(state.objects));}retainQuestionHistory(saved,state);saved.challengeBests={...saved.challengeBests,...state.challengeBests};saved.money+=extra;for(const k of Object.keys(state))delete state[k];Object.assign(state,saved);modal.close();actions.renovate();changed();actions.toast('Replay record saved');return;}const amount=settleDay(state);if(amount===false)return;modal.close();actions.renovate();changed();actions.toast('Shift complete');$('#bankTakings').textContent='$0';$('#bankNote').textContent='Spendable funds shown above';if(state.phase==='campaign-complete')renderFinal();else showMission()};
 }
 function renderFinal(){const h=state.campaignHistory,last=h.at(-1)?.report;show(`<div class="report-head"><span class="eyebrow">FOUR SHIFTS COMPLETE</span><h1>Your café’s final rating</h1></div><div class="report-scroll">${starsMarkup(last)}<div class="rating-history">${h.map(d=>`<div><strong>Shift ${d.day}</strong>${starsMarkup(d.report,'Shift '+d.day+' rating')}<span>${d.goals.filter(g=>g.met).length} / ${d.goals.length} missions</span></div>`).join('')}</div></div><div class="report-actions"><button class="green-btn" id="finishWeek">View my café</button></div>`);$('#finishWeek').onclick=()=>modal.close();window.RisePostSurvey?.offer('floor',modal.querySelector('.report-actions'));}
 function creditSales(report){const net=report.revenue-report.ingredientCosts,delta=net-(state.liveCredited||0);if(delta){state.money+=delta;state.liveCredited=net;$('#money').textContent=money(state.money);actions.market?.();actions.save()}}
 function live(sim){lastSim=sim;const combo=$('#comboHud');combo.hidden=false;const next=3-(sim.streak%3);const comboText=sim.streak+' happy in a row · '+Math.min(3,1+Math.floor(sim.streak/3)*.5)+'× tips'+(sim.streak<12?' · '+next+' to next boost':' · MAX');if(combo.textContent!==comboText)combo.textContent=comboText;creditSales({revenue:sim.revenue,ingredientCosts:sim.costs});const progress=Math.min(1,sim.time/120),hour=8+Math.floor(progress*10);$('#simTime').textContent=(hour>12?hour-12:hour)+':00 '+(hour>=12?'PM':'AM');
  $('#bankTakings').textContent=money(sim.revenue);$('#bankNote').textContent='Earnings added to available funds';
  const profit=shiftProfit(sim);if($('#shiftProfitValue').textContent!==money(profit))$('#shiftProfitValue').textContent=money(profit);$('#shiftProfitHud').hidden=false;$('#shiftProfitHud').dataset.positive=profit>=0;$('#liveProfit').textContent=money(profit);
  const left=shiftSecondsLeft(sim.time);if($('#closingNotice'))$('#closingNotice').hidden=left>30;
  const clock=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if($('#shiftCountdown').textContent!==clock)$('#shiftCountdown').textContent=clock;
  if(sim.streakBreak&&sim.streakBreak.id!==api.lastBreak){api.lastBreak=sim.streakBreak.id;const notice=$('#streakNotice');notice.textContent='Streak of '+sim.streakBreak.count+' lost — help the next guest!';notice.hidden=false;clearTimeout(api.noticeTimer);api.noticeTimer=setTimeout(()=>notice.hidden=true,3500);}
  // Bottom-bar metrics are intentionally absent from gameplay. Build full results only at closing.
  renderGoals(sim.results(true));

 }
 function restore(){refresh();if(Number.isInteger(state.coachStep)){showTutorial(true);return;}if(state.phase==='day-report')renderReport();if(state.phase==='campaign-complete')renderFinal();if(['design','renovate','adjust'].includes(state.phase)){if(state.dayNumber===1&&!state.handsOnVersion)showMission();else if(state.missionSeen!==state.dayNumber)showMission();else if(!state.prepDeadline)beginPrep();}}
 $('#resultsButton').onclick=()=>state.phase==='campaign-complete'?renderFinal():renderReport();$('#pauseSim').onclick=()=>{paused=!paused;refresh()};$('#interveneSim').onclick=()=>{if(state.phase==='intervene'){requestRun();return}actions.cancel();if(lastSim)state.runElapsed=lastSim.time;state.phase='intervene';changed();actions.intervene();actions.toast('Service paused. Clear a route or improve an empty seat.');};for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>{speed=+b.dataset.speed;refresh()};return api;
}

function reviewCards(report){return `<section class="customer-reviews"><h2>Customer reviews</h2>${(report.reviews||[]).filter((r,i,all)=>all.findIndex(x=>x.text===r.text)===i).slice(0,6).map(r=>`<article class="customer-review"><div class="review-avatar">${esc(r.name[0])}</div><div><strong>${esc(r.name)}</strong><span class="review-type">${esc(({study:'Student',remote:'Remote worker',social:'Social visitor',casual:'Casual visitor',teens:'Student group',commuter:'Commuter',pickup:'Pickup',late:'Commuter'})[r.type]||r.type)}</span><div class="review-stars" aria-label="${r.stars} out of 5 stars"><span>${'★'.repeat(Math.round(r.stars))}${'☆'.repeat(5-Math.round(r.stars))}</span> ${r.stars.toFixed(1)} / 5</div><p>${esc(r.text)}</p></div></article>`).join('')||'<p>No customer visits this shift.</p>'}</section>`;}
