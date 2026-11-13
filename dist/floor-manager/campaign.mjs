// One deterministic customer cohort per day: retries compare layouts fairly.
export const DAYS = [
 {name:'A functioning café',hint:'Learn to create usable workspaces and respond to guests.',mix:['casual','commuter','study','pickup','remote'],parties:16,interval:6.8,reward:0,goals:[['profit',200,'Earn $200 profit'],['served',10,'Serve drinks to 10 customers'],['completedRequests',2,'Meet 2 customer needs']]},
 {name:'A place for everyone',hint:'Use comfortable seats and suitable areas for different activities.',mix:['study','social','casual','remote','study','casual'],parties:18,interval:5.9,reward:0,goals:[['profit',350,'Earn $350 profit'],['served',14,'Serve drinks to 14 customers'],['areasReady',2,'Create 2 café areas'],['completedRequests',3,'Meet 3 customer needs'],['ergonomicVisits',2,'Support 2 visits · comfort, light + access']]},
 {name:'Different needs, one café',hint:'Prioritize individual needs and keep routes usable.',mix:['remote','social','casual','study','casual','remote'],parties:21,interval:5.1,reward:0,goals:[['profit',450,'Earn $450 profit'],['ergonomicVisits',3,'Support 3 visits · comfort, light + access'],['completedRequests',4,'Meet 4 customer needs'],['served',18,'Serve drinks to 18 customers']]},
 {name:'Rush-hour mastery',hint:'Manage more requests with limited time and resources.',mix:['commuter','social','study','remote','teens','casual'],parties:24,interval:4.5,rush:true,reward:0,goals:[['profit',550,'Earn $550 profit'],['ergonomicVisits',4,'Support 4 visits · comfort, light + access'],['purchaseRate',60,'Serve 60% of arrivals'],['completedRequests',4,'Meet 4 customer needs'],['served',24,'Serve drinks to 24 customers']]}
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
 if(!missionProgress(s,s.reports.current).every(g=>g.met)||s.isePassedDay!==s.dayNumber)return false;
 const r=s.reports.current,reward=rewardFor(s,r),earned=(r.settlementNet??r.profit)+reward,goals=missionProgress(s,r);
 if(s.campaignHistory.some(d=>d.day===s.dayNumber))return false;
 s.reputation=r.reputation??s.reputation??70;s.upgradeCredits=(s.upgradeCredits||0)+(r.upgradeRewards||0);s.money=Math.max(0,s.money+earned-(s.liveCredited||0));s.liveCredited=0;s.campaignHistory.push({day:s.dayNumber,mission:mission(s).name,report:r,reward,earned,goals,start:s.attemptStart?JSON.parse(JSON.stringify(s.attemptStart)):null,layout:JSON.parse(JSON.stringify(s.objects))});
 s.levelStartLayout=JSON.parse(JSON.stringify({objects:s.objects,lights:s.lights,atmosphere:s.atmosphere}));s.attemptStart=null;s.runSnapshot=null;s.runElapsed=0;s.interventions=[];s.reports={};s.attempt=1;s.opened=false;
 if(s.dayNumber>=DAYS.length)s.phase='campaign-complete';else{s.dayNumber++;s.phase='renovate'}
 return earned;
}
