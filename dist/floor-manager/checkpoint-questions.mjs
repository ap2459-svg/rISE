// Question history belongs to the playthrough, including retries and replays.
export const QUESTIONS=[
 {id:'flow-pickup',day:1,q:'More tables were added, but fewer customers received drinks. The queue now blocks pickup. What would you test first?',a:['Move pickup away from the queue','Lower drink prices','Add chairs to the new tables'],correct:0,why:'Clearing the bottleneck can help customers collect drinks. Compare waiting time and customers served.'},
 {id:'budget-needs',day:1,q:'You can afford one improvement. What should guide your choice?',a:['Which item fills the most space','Which problem affects customers most','Which item matches the walls'],correct:1,why:'Use a limited budget where it can address an important customer problem.'},
 {id:'empty-seats',day:1,q:'People leave even though seats are empty. What should you investigate?',a:['Whether the café needs more tables','Whether the price signs are colorful','Whether those seats meet their needs'],correct:2,why:'Seats may be unsuitable because of access, noise, lighting or charging.'},
 {id:'test-one-change',day:1,q:'You want to learn why a queue is slow. What is a useful first test?',a:['Change one likely cause and compare waiting','Replace all the furniture at once','Measure only how full the room looks'],correct:0,why:'A focused change makes its effect easier to identify.'},
 {id:'quiet-social',day:2,q:'Students leave a study corner beside a lively group. What should you try?',a:['Add more chairs beside the group','Separate the activities and compare both groups','Remove every group table'],correct:1,why:'Different customers need different conditions. Separation can support both groups.'},
 {id:'large-table',day:2,q:'One person uses a six-seat table while a group cannot sit. What could help?',a:['Add a smaller work table and offer it to the solo guest','Remove all large tables','Play louder music'],correct:0,why:'Matching party sizes to table sizes makes better use of seating.'},
 {id:'support-seat',day:2,q:'A worker has good lighting but keeps shifting in an uncomfortable chair. What should you check?',a:['The number of posters','The drink menu size','The chair’s support and fit'],correct:2,why:'Comfort and support matter during long visits, even when other needs are met.'},
 {id:'overcrowd',day:2,q:'Adding chairs increases capacity but narrows the aisle. What else should you measure?',a:['Only the number of seats','How easily customers can move','Only the furniture’s color'],correct:1,why:'Extra capacity is less useful when people cannot reach or leave their seats.'},
 {id:'blocked-bathroom',day:3,q:'A bathroom exists, but a chair blocks its door. What should you do first?',a:['Build another bathroom','Move the chair and check the route','Add more signs inside the bathroom'],correct:1,why:'Fix access before spending on capacity that already exists.'},
 {id:'competing-light',day:3,q:'Brighter lighting helps a reader but bothers a nearby guest. What could work?',a:['Use local lighting suited to each area','Make every light as bright as possible','Ignore one guest because another is happy'],correct:0,why:'Local adjustments can meet competing needs without changing the whole café.'},
 {id:'urgent-budget',day:3,q:'Two guests need help and money is limited. What matters when deciding whom to help first?',a:['Who arrived most recently','Whose clothes match the café','Urgency, cost and likely benefit'],correct:2,why:'Prioritize the effect of an action along with the time and resources available.'},
 {id:'resource-access',day:3,q:'A power outlet is installed, but nobody uses it. What should you check?',a:['Whether it is near usable seating','Whether the walls need repainting','Whether more drinks are on the menu'],correct:0,why:'A resource only helps if customers can reach and use it.'},
 {id:'balanced-score',day:4,q:'A layout earns more but creates long waits and unhappy guests. How should you judge it?',a:['Profit alone proves it is best','Balance earnings, service and customer experience','The busiest layout must be best'],correct:1,why:'Improving one measure can harm another. Consider the whole system.'},
 {id:'bottleneck-capacity',day:4,q:'There are many empty seats, but ordering takes too long. What limits the café right now?',a:['The number of decorations','The seat colors','The ordering process'],correct:2,why:'Adding seats will not remove a bottleneck at ordering.'},
 {id:'fair-comparison',day:4,q:'How can you fairly compare two layouts?',a:['Use similar customer arrivals and measure the same results','Compare a quiet morning with a busy rush','Choose whichever layout looks fuller'],correct:0,why:'Comparable conditions help reveal the effect of the layout itself.'},
 {id:'long-stay',day:4,q:'Guests enjoy longer stays, but new visitors cannot find seats. What tradeoff should you consider?',a:['Long visits have no downside','Comfortable visits versus space for incoming guests','More music versus brighter walls'],correct:1,why:'Long visits can be valuable while also reducing turnover and available seating.'}
];
export function checkpointFor(state){
 state.questionHistory||=[];
 const run=state.checkpointSerial||0;
 if(state.checkpoint?.run===run)return QUESTIONS.find(q=>q.id===state.checkpoint.id)||null;
 const unused=QUESTIONS.filter(q=>!state.questionHistory.includes(q.id));
 const candidates=unused.filter(q=>q.day===state.dayNumber);
 const pool=candidates.length?candidates:unused;
 if(!pool.length)return null;
 const q=pool[Math.floor(Math.random()*pool.length)];state.questionHistory.push(q.id);state.checkpoint={run,id:q.id};return q;
}
export function retainQuestionHistory(target,source){
 target.questionHistory=[...new Set([...(target.questionHistory||[]),...(source.questionHistory||[])])];
 target.checkpointSerial=Math.max(target.checkpointSerial||0,source.checkpointSerial||0);delete target.checkpoint;
}
