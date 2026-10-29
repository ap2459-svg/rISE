// One deterministic customer cohort per day: retries compare layouts fairly.
export const DAYS = [
 {name:'Grand Reopening',hint:'Bring your rundown café back to life. Choose your repairs and furniture, then open whenever you’re ready.',mix:['casual','commuter','study','pickup'],parties:10,interval:8,reward:100,goals:[['served',6,'Serve 6 customers']]},
 {name:'Make Them Stay',hint:'Give guests a reason to stay—and a clear path to get there. Balance comfortable seats, useful amenities and room to move.',mix:['casual','study','commuter','remote','social'],parties:12,interval:7,reward:190,goals:[['satisfaction',55,'55% happiness'],['averageStay',15,'15-minute average visit'],['flow',65,'65% flow']]},
 {name:'Different Customers, Different Needs',hint:'Students need quiet, friends want company, and workers need space. Find your balance.',mix:['study','social','remote','teens','study','remote'],parties:14,interval:6,reward:180,goals:[['studyFit',55,'55% student happiness'],['remoteFit',55,'55% worker happiness'],['socialFit',55,'55% social happiness']]},
 {name:'The Rush Hour Challenge',hint:'Your café is getting popular. Keep customers happy under pressure and turn good service into profit.',mix:['commuter','social','study','pickup','remote','teens'],parties:18,interval:4.8,rush:true,reward:220,goals:[['profit',100,'Earn $100 profit'],['satisfaction',55,'55% happiness']]}
];
export const mission = s => DAYS[Math.max(0,Math.min(DAYS.length-1,(s.dayNumber||1)-1))];
export function categoryResults(types={}) {
 return [['study','Students',['study']],['social','Social',['social','teens','casual']],['remote','Remote workers',['remote']]].map(([key,name,keys])=>{
  const list=keys.map(k=>types[k]).filter(t=>t?.count),count=list.reduce((n,t)=>n+t.count,0);
  return {key,name,count,satisfaction:count?list.reduce((n,t)=>n+t.satisfaction*t.count,0)/count:null};
 });
}
export function missionProgress(s,r) {
 const groups=Object.fromEntries(categoryResults(r?.types).map(t=>[t.key,t.satisfaction||0]));
 const values={...r,studyFit:groups.study,remoteFit:groups.remote,socialFit:groups.social,purchaseRate:r?.people?r.served/r.people*100:0,floorFund:s.floor?250:s.money-(s.liveCredited||0)+(r?.profit||0)};
 return mission(s).goals.map(([key,target,label])=>({key,target,label,value:Math.max(0,values[key]||0),met:(values[key]||0)>=target}));
}
export function rewardFor(s,r){const goals=missionProgress(s,r);return Math.round(mission(s).reward*goals.filter(g=>g.met).length/goals.length)}
export function settleDay(s){
 if(s.phase!=='day-report'||!s.reports.current)return false;
 const r=s.reports.current,reward=rewardFor(s,r),earned=r.profit+reward,goals=missionProgress(s,r);
 if(s.campaignHistory.some(d=>d.day===s.dayNumber))return false;
 s.reputation=r.reputation??s.reputation??70;s.upgradeCredits=(s.upgradeCredits||0)+(r.upgradeRewards||0);s.money=Math.max(0,s.money+earned-(s.liveCredited||0));s.liveCredited=0;s.campaignHistory.push({day:s.dayNumber,mission:mission(s).name,report:r,reward,earned,goals,layout:JSON.parse(JSON.stringify(s.objects))});
 s.runSnapshot=null;s.runElapsed=0;s.interventions=[];s.reports={};s.attempt=1;s.opened=false;
 if(s.dayNumber>=DAYS.length)s.phase='campaign-complete';else{s.dayNumber++;s.phase='renovate'}
 return earned;
}
