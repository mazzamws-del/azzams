/* Read-only reporting. Never changes source records or closing snapshots. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./finance-core.js'));else root.AzzamsAnalytics=factory(root.AzzamsFinance);})(globalThis,function(F){
'use strict';
const terminal=s=>['تم التوصيل','مرتجع','ملغي'].includes(s.status);
function validDay(v){const d=F.day(v);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d?d:'';}
function bounds(data){const orders=Object.values(data.sales||{}),dates=orders.map(s=>validDay(s.date)).filter(Boolean).sort(),activity=[...dates,...orders.map(s=>validDay(F.eventDay(s).date)),...Object.values(data.expenses||{}).map(e=>validDay(e.date))].filter(Boolean).sort();return {firstOrder:dates[0]||'',lastOrder:dates.at(-1)||'',from:activity[0]||'',to:activity.at(-1)||''};}
const phone=v=>String(v||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/\D/g,'').replace(/^0020/,'0').replace(/^20(?=1\d{9}$)/,'0');
function analyze(data,from,to){
 if(!validDay(from)||!validDay(to)||from>to)throw Error('راجع تاريخ بداية ونهاية التقرير');
 const r=F.report(data,from,to),inside=d=>d&&d>=from&&d<=to,cohort={orders:0,delivered:0,returned:0,cancelled:0,pending:0},months={},groups={governorates:{},sources:{},moderators:{},couriers:{},campaigns:{}},customers={},products={},quality={missingDates:0,missingNames:0,missingPhones:0,missingSource:0,missingCampaign:0},orderRows=[];
 const bucket=()=>({orders:0,delivered:0,returned:0,cancelled:0,pending:0,revenue:0,contribution:0,spend:0});
 const month=d=>months[d.slice(0,7)]||(months[d.slice(0,7)]={...bucket(),expenses:0,profit:0});
 const keys=s=>({governorates:s.gov||'غير محدد',sources:s.source||'غير محدد',moderators:s.sellerId||s.moderatorId||'غير محدد',couriers:s.courierId||'غير محدد',campaigns:s.campaignId||'غير منسوب'});
 for(const [id,s] of Object.entries(data.sales||{})){
  const date=validDay(s.date);if(!date)quality.missingDates++;
  if(!inside(date))continue;
  const state=s.status==='تم التوصيل'?'delivered':s.status==='مرتجع'?'returned':s.status==='ملغي'?'cancelled':'pending';cohort.orders++;cohort[state]++;month(date).orders++;
  for(const [kind,key] of Object.entries(keys(s))){const g=groups[kind][key]||(groups[kind][key]=bucket());g.orders++;g[state]++;}
  if(!s.customer)quality.missingNames++;if(!phone(s.phone))quality.missingPhones++;if(!s.source)quality.missingSource++;if(!s.campaignId)quality.missingCampaign++;
  const p=phone(s.phone);if(p){const c=customers[p]||(customers[p]={name:s.customer||'',orders:0,delivered:0,revenue:0});c.orders++;if(state==='delivered')c.delivered++;}
  orderRows.push({id,displayId:s.id||id,customer:s.customer||'',date,status:s.status||'غير محدد',gov:s.gov||'',source:s.source||'',value:F.cents(s.revenue)-F.cents(s.discount)});
 }
 for(const line of r.orderLines){const s=data.sales[line.id],m=month(line.date);m.revenue+=line.revenue;m.profit+=line.profit;
  for(const[k,key]of Object.entries(keys(s))){const g=groups[k][key]||(groups[k][key]=bucket());g.revenue+=line.revenue;g.contribution+=line.profit;}
  if(s.status==='تم التوصيل'){
   const p=phone(s.phone);if(p&&customers[p])customers[p].revenue+=line.revenue;
   for(const i of s.items||[]){const name=String(i.commName||i.name||i.id||'غير محدد'),key=JSON.stringify([i.id||'',name]),g=products[key]||(products[key]={name,qty:0,grossRevenue:0});const qty=Number(i.qty)||0;g.qty+=qty;g.grossRevenue+=F.cents(i.price)*qty;}
  }
 }
 for(const e of r.expenseLines){const m=month(e.date);m.expenses+=e.amount;m.profit-=e.amount;if(e.campaignId){const g=groups.campaigns[e.campaignId]||(groups.campaigns[e.campaignId]=bucket());g.spend+=e.amount;}}
 for(const g of Object.values(groups.campaigns))g.net=g.contribution-g.spend;
 const customerRows=Object.values(customers),repeatCustomers=customerRows.filter(c=>c.orders>1).length;
 return {from,to,bounds:bounds(data),financial:r,cohort,months,groups,products,customers:customerRows,repeatCustomers,quality,orders:orderRows.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)),deliveryRate:cohort.orders?cohort.delivered/cohort.orders:null,averageDelivered:r.delivered?r.revenue/r.delivered:null,profitMargin:r.revenue?r.profit/r.revenue:null};
}
return {bounds,analyze,validDay,phone};
});
