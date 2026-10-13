/* Shared browser/server accounting. All monetary totals are integer piastres. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AzzamsFinance=api;})(globalThis,function(){
'use strict';
const cents=v=>{const n=Number(v??0);if(!Number.isFinite(n))throw Error('مبلغ غير صالح');const x=Math.round((n+Number.EPSILON)*100);if(!Number.isSafeInteger(x))throw Error('المبلغ خارج الحدود');return x;};
const day=v=>{if(!v)return '';if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const d=new Date(v);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(d);};
const addDay=(s,n)=>new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const terminal=s=>['تم التوصيل','مرتجع','ملغي'].includes(s.status);
function eventDay(s){const direct=s.status==='تم التوصيل'?(s.deliveredAt||s.courierResultAt):s.status==='مرتجع'?(s.returnedAt||s.courierResultAt):s.statusUpdatedAt;const h=Object.values(s.statusHistory||{}).filter(x=>x.to===s.status).sort((a,b)=>b.at-a.at)[0];return {date:day(direct||h?.at||s.statusUpdatedAt||s.date),estimated:!direct&&!h&&!s.statusUpdatedAt};}
function report(data,from,to){
 const result={version:1,from,to,createdOrders:0,delivered:0,returned:0,cancelled:0,pending:0,revenue:0,cogs:0,shippingMargin:0,wrapping:0,returnCost:0,expenses:0,advertising:0,profit:0,receivable:0,payable:0,estimatedDates:0,missingCosts:0,orderLines:[],expenseLines:[],days:{},groups:{governorates:{},couriers:{},moderators:{},campaigns:{},products:{}}};
 const inside=d=>d&&d>=from&&d<=to;
 function group(type,key,s,profit){key=String(key||'غير محدد');const g=result.groups[type][key]||(result.groups[type][key]={orders:0,delivered:0,revenue:0,profit:0});g.orders++;if(s.status==='تم التوصيل'){g.delivered++;g.revenue+=cents(s.revenue)-cents(s.discount);g.profit+=profit;}}
 for(const[id,s]of Object.entries(data.sales||{})){
  if(inside(day(s.date))){result.createdOrders++;if(!terminal(s))result.pending++;}
  if(s.courierResult&&!s.courierSettledAt){const collected=cents(s.customerCollectedAmount??s.courierCollectedAmount),fee=cents(s.courierShippingFee??(s.courierResult==='cancelled'?0:s.actualShippingCost??s.shipping));result.receivable+=s.storeDueFromCourier!=null?cents(s.storeDueFromCourier):Math.max(0,collected-fee);result.payable+=s.courierDueFromStore!=null?cents(s.courierDueFromStore):Math.max(0,fee-collected);}
  const ev=eventDay(s);if(!terminal(s)||!inside(ev.date))continue;
  if(ev.estimated)result.estimatedDates++;
  const line={id,date:ev.date,status:s.status,customer:s.customer||'',revenue:0,cogs:0,shippingMargin:0,wrapping:0,returnCost:0,profit:0};
  if(s.status==='تم التوصيل'){result.delivered++;if(s.cogs==null)result.missingCosts++;line.revenue=cents(s.revenue)-cents(s.discount);line.cogs=cents(s.cogs);line.shippingMargin=(s.freeShipping?0:cents(s.shipping))-cents(s.courierShippingFee??s.actualShippingCost??s.shipping);line.wrapping=s.freeWrapping?cents(s.wrappingCost??data.settings?.giftWrapCost??15):0;}
  if(s.status==='مرتجع')result.returned++;if(s.status==='ملغي')result.cancelled++;
  if(s.status!=='تم التوصيل')line.returnCost=s.returnCost!=null?cents(s.returnCost):(s.courierResult?cents(s.courierShippingFee)-cents(s.customerCollectedAmount??s.courierCollectedAmount):0);
  line.profit=line.revenue-line.cogs+line.shippingMargin-line.wrapping-line.returnCost;
  for(const k of ['revenue','cogs','shippingMargin','wrapping','returnCost'])result[k]+=line[k];
  result.orderLines.push(line);const daily=result.days[ev.date]||(result.days[ev.date]={revenue:0,profit:0,orders:0});daily.revenue+=line.revenue;daily.profit+=line.profit;daily.orders++;
  for(const[type,key]of [['governorates',s.gov],['couriers',s.courierId],['moderators',s.moderatorId],['campaigns',s.campaignId]])group(type,key,s,line.profit);
  for(const i of s.items||[]){const key=i.name||i.id||'غير محدد',g=result.groups.products[key]||(result.groups.products[key]={qty:0,revenue:0});if(s.status==='تم التوصيل'){g.qty+=Number(i.qty)||0;g.revenue+=cents(i.price)*(Number(i.qty)||0);}}
 }
 for(const[id,e]of Object.entries(data.expenses||{}))if(inside(day(e.date))){const amount=cents(e.amount);result.expenses+=amount;if(e.campaignId)result.advertising+=amount;result.expenseLines.push({id,date:day(e.date),amount,category:e.category||'',desc:e.desc||'',campaignId:e.campaignId||''});const d=result.days[day(e.date)]||(result.days[day(e.date)]={revenue:0,profit:0,orders:0});d.profit-=amount;}
 result.profit=result.revenue-result.cogs+result.shippingMargin-result.wrapping-result.returnCost-result.expenses;return result;
}
function campaign(data,id){const orders=Object.values(data.sales||{}).filter(s=>s.campaignId===id),expenses=Object.fromEntries(Object.entries(data.expenses||{}).filter(([,e])=>e.campaignId===id));const r=report({...data,sales:Object.fromEntries(orders.map((s,i)=>[i,s])),expenses},'0000-01-01','9999-12-31');return {orders,delivered:orders.filter(s=>s.status==='تم التوصيل'),returned:orders.filter(s=>['مرتجع','ملغي'].includes(s.status)),pending:orders.filter(s=>!terminal(s)),revenue:r.revenue/100,cogs:r.cogs/100,shipSubsidy:-r.shippingMargin/100,returnCost:r.returnCost/100,actualSpend:r.expenses/100,netProfit:r.profit/100,returnRate:orders.length?Math.round((r.returned+r.cancelled)/orders.length*100):0,cpa:r.delivered?r.expenses/100/r.delivered:0,roas:r.expenses?(r.revenue/r.expenses).toFixed(2):'—'};}
function periods(start,today,closingDay=0){if(!/^\d{4}-\d{2}-\d{2}$/.test(start||''))return [];closingDay=Number(closingDay)||0;if(!Number.isInteger(closingDay)||closingDay<0||closingDay>28)throw Error('يوم التقفيل من 1 إلى 28 أو صفر لنهاية الشهر');let from=start,out=[];for(let i=0;i<1200;i++){const[y,m]=from.split('-').map(Number);let end=closingDay?`${y}-${String(m).padStart(2,'0')}-${String(closingDay).padStart(2,'0')}`:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);if(end<from)end=new Date(Date.UTC(y,m,closingDay)).toISOString().slice(0,10);if(end>=today)break;out.push({id:from+'_'+end,from,to:end});from=addDay(end,1);}return out;}
function startDate(data){return data.settings?.accountingStartDate||[...Object.values(data.sales||{}),...Object.values(data.expenses||{})].map(x=>day(x.date)).filter(Boolean).sort()[0]||'';}
return {cents,day,addDay,eventDay,report,campaign,periods,startDate};
});
