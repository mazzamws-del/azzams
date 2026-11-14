/* Shared read-only presentation metrics. Amounts are integer piastres. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AzzamsWorkspaceCore=api;})(globalThis,function(){
'use strict';
const day=v=>{if(!v)return '';if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const d=new Date(v);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(d);};
const cents=n=>Math.round((Number(n)||0)*100);
const net=s=>cents(s.revenue)-cents(s.discount)-cents(s.exchangeRefund);
function deliveredDay(s){const history=Object.values(s.statusHistory||{}).filter(h=>h.to==='تم التوصيل').sort((a,b)=>b.at-a.at);return day(s.deliveredAt||s.courierResultAt||history[0]?.at||s.statusUpdatedAt);}
function performance(sales,person,from,to){const rows=Object.entries(sales||{}).filter(([,s])=>(s.sellerId||s.moderatorId)===person),inside=d=>!!d&&d>=from&&d<=to;
 const created=rows.filter(([,s])=>inside(day(s.date||s.timestamp))),delivered=rows.filter(([,s])=>s.status==='تم التوصيل'&&inside(deliveredDay(s)));
 const done=created.filter(([,s])=>s.status==='تم التوصيل'),returned=created.filter(([,s])=>s.status==='مرتجع'),cancelled=created.filter(([,s])=>s.status==='ملغي');
 return {created:created.length,createdIds:created.map(([id])=>id),salesValue:created.filter(([,s])=>s.status!=='ملغي').reduce((n,[,s])=>n+net(s),0),deliveredToday:delivered.length,deliveredIds:delivered.map(([id])=>id),deliveredValue:delivered.reduce((n,[,s])=>n+net(s),0),delivered:done.length,returned:returned.length,cancelled:cancelled.length,pending:created.length-done.length-returned.length-cancelled.length,deliveryRate:done.length+returned.length?Math.round(done.length/(done.length+returned.length)*100):null,unknownDeliveryDates:rows.filter(([,s])=>s.status==='تم التوصيل'&&!deliveredDay(s)).length};
}
function monthRange(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('اختر شهرًا صحيحًا');const [y,m]=month.split('-').map(Number);return {from:month+'-01',to:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)};}
return {day,cents,net,deliveredDay,performance,monthRange};
});
