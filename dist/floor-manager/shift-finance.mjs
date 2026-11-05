export const RUNNING_COST=30;
export function orderUnitPrice(type,day=1,repeat=false){
 const level=Math.max(0,Math.min(3,(day||1)-1));
 // Longer visits in levels 2–3 support larger orders. Rush hour uses regular
 // orders at higher existing demand; no extra arrivals or faster pacing.
 const base={remote:28,study:26,social:28,teens:24,casual:28,commuter:23,late:23,pickup:24}[type];
 return repeat?15+[0,2,4,0][level]:base+[0,5,8,0][level];
}

// Asset-sale cash is paid immediately. Keep its total separately so reselling
// an item never erases its purchase expense or pays out again at settlement.
export function recordAssetSale(state,amount){
 if(!Number.isFinite(amount)||amount<=0)return;
 state.money+=amount;
 state.assetSaleTotal=(state.assetSaleTotal||0)+amount;
}
export function syncShiftFinances(sim,state,netSales=sim.revenue-sim.costs,hintCosts=sim.hintCosts){
 const netPurchases=sim.openingMoney+netSales-state.money-hintCosts;
 const recordedSales=Math.max(0,(state.assetSaleTotal||0)-sim.openingAssetSales);
 // Older saved edits have cash snapshots but no separate sale ledger.
 sim.assetSales=Math.max(recordedSales,-netPurchases,0);
 sim.purchaseCosts=Math.max(0,netPurchases+sim.assetSales);
}
export function shiftProfit(sim){
 return sim.revenue+(sim.assetSales||0)-sim.costs-RUNNING_COST-(sim.hintCosts||0)-(sim.purchaseCosts||0);
}
