// One deterministic customer cohort per day: retries compare layouts fairly.
export const DAYS = [
 {name:'A functioning café',hint:'Build a usable café and earn your first profit.',mix:['casual','commuter','study','pickup','remote'],parties:16,interval:6.8,reward:0,goals:[['profit',300,'Earn $300 profit'],['clearTables',4,'Fit 4 tables · clear routes'],['stars',2,'Rating 2★ or higher'],['completedRequests',3,'Complete 3 requests']]},
 {name:'A place for everyone',hint:'Balance social, focus and cozy spaces.',mix:['study','social','casual','remote','study','casual'],parties:14,interval:7.2,reward:0,goals:[['profit',350,'Earn $350 profit'],['areasReady',3,'Create 3 café areas'],['completedRequests',4,'Complete 4 requests'],['comfortImproved',3,'Improve comfort for 3'],['rearrangedRequests',2,'Solve 2 by rearranging'],['stars',3,'Finish at 3★ or higher']]},
 {name:'Different needs, one café',hint:'Resolve competing needs while keeping access clear.',mix:['remote','social','casual','study','social','remote'],parties:16,interval:6.4,reward:0,goals:[['profit',400,'Earn $400 profit'],['completedRequests',5,'Complete 5 requests'],['conflictsResolved',3,'Resolve 3 conflicts · both 3★'],['accessClear',100,'Keep seats + bathroom reachable'],['stars',4,'Finish at 4★ overall'],['minGroupStars',3,'Every group at 3★']]},
 {name:'Rush-hour mastery',hint:'Handle a busier café without losing ergonomic quality.',mix:['commuter','social','study','remote','teens','casual'],parties:20,interval:5.2,rush:true,reward:0,goals:[['profit',450,'Earn $450 profit'],['purchaseRate',85,'Serve 85% of arrivals'],['completedRequests',7,'Complete 7 requests'],['conflictsResolved',4,'Resolve 4 conflicts · both 3★'],['accessClear',100,'Keep all access clear'],['stars',4,'Finish at 4★ overall'],['minGroupStars',3.5,'Every group at 3.5★']]}
];
export const mission = s => DAYS[Math.max(0,Math.min(DAYS.length-1,(s.dayNumber||1)-1))];
export function categoryResults(types={}) {
 return [['study','Students',['study']],['social','Social',['social','teens','casual']],['remote','Remote workers',['remote']]].map(([key,name,keys])=>{
  const list=keys.map(k=>types[k]).filter(t=>t?.count),count=list.reduce((n,t)=>n+t.count,0);
  return {key,name,count,satisfaction:count?list.reduce((n,t)=>n+t.satisfaction*t.count,0)/count:null};
 });
}
export function missionProgress(s,r) {
 const seen=Object.values(r?.types||{}).filter(t=>t.count);
 const values={...r,stars:(r?.satisfaction||0)/20,minGroupStars:seen.length?Math.min(...seen.map(t=>t.satisfaction/20)):0,purchaseRate:r?.people?r.served/r.people*100:0};
 return mission(s).goals.map(([key,target,label])=>{const pending=['stars','minGroupStars','purchaseRate','accessClear'].includes(key)&&(r?.observedDepartures||0)<3;return {key,target,label,value:Math.max(0,values[key]||0),pending,met:!pending&&(values[key]||0)>=target};});
}
export function rewardFor(){return 0}
export function settleDay(s){
 if(s.phase!=='day-report'||!s.reports.current)return false;
 const r=s.reports.current,reward=rewardFor(s,r),earned=(r.settlementNet??r.profit)+reward,goals=missionProgress(s,r);
 if(s.campaignHistory.some(d=>d.day===s.dayNumber))return false;
 s.reputation=r.reputation??s.reputation??70;s.upgradeCredits=(s.upgradeCredits||0)+(r.upgradeRewards||0);s.money=Math.max(0,s.money+earned-(s.liveCredited||0));s.liveCredited=0;s.campaignHistory.push({day:s.dayNumber,mission:mission(s).name,report:r,reward,earned,goals,start:s.attemptStart?JSON.parse(JSON.stringify(s.attemptStart)):null,layout:JSON.parse(JSON.stringify(s.objects))});
 s.levelStartLayout=JSON.parse(JSON.stringify({objects:s.objects,lights:s.lights,atmosphere:s.atmosphere}));s.attemptStart=null;s.runSnapshot=null;s.runElapsed=0;s.interventions=[];s.reports={};s.attempt=1;s.opened=false;
 if(s.dayNumber>=DAYS.length)s.phase='campaign-complete';else{s.dayNumber++;s.phase='renovate'}
 return earned;
}
