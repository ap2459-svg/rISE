// Later shifts introduce competing needs. Keep early-day ratings unchanged;
// use the same attainable scale for Days 3–4 (3 stars at 50, 4 at 60).
export function customerStars(report,dayNumber=report?.dayNumber||1){
 const satisfaction=Math.max(0,Math.min(100,Number(report?.satisfaction)||0));
 const thresholds=dayNumber>=3?[0,20,40,50,60,100]:[0,20,40,60,80,100];
 for(let star=1;star<thresholds.length;star++)if(satisfaction<=thresholds[star])return star-1+(satisfaction-thresholds[star-1])/(thresholds[star]-thresholds[star-1]);
 return 5;
}
// Do not display the next whole-star goal before it has actually been earned.
export const formatStars=rating=>(Math.floor((rating+1e-9)*10)/10).toFixed(1);
export function starsMarkup(report,label='Customer rating'){const rating=customerStars(report);return `<div class="restaurant-rating" role="img" aria-label="${label}: ${formatStars(rating)} out of 5"><div class="five-stars" aria-hidden="true"><span>★★★★★</span><span class="filled-stars" style="width:${rating/5*100}%">★★★★★</span></div><strong>${formatStars(rating)} / 5</strong></div>`;}
export function ratingChange(report,previous){if(!previous)return '';const delta=customerStars(report)-customerStars(previous);return Math.abs(delta)<.05?'Same rating as last shift':`${delta>0?'+':'−'}${Math.abs(delta).toFixed(1)} stars since last shift`;}
