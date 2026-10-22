(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AzzamsOrderEdit=api;})(globalThis,function(){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),money=v=>Math.round(Number(v)*100)/100;
function apply(data,key,expected,actor,patch,rows,ts,F,P){
 const d=clone(data),old=d.sales?.[key];
 if(!old||old.sellerId!==actor.id||old.status!=='قيد التجهيز'||old.courierId||old.packedAt||old.courierSettledAt||old.courierResult)throw Error('الأوردر خرج من مرحلة التعديل؛ راجع الإدارة');
 const account=d.moderators?.[actor.id];if(!account||account.active===false||account.pinHash!==actor.pinHash)throw Error('حساب المودريتور غير متاح');
 if(F.canonical(old)!==F.canonical(expected))throw Error('الأوردر اتعدل؛ افتحه من جديد قبل الحفظ');
 if(!rows.length)throw Error('أضف منتجًا واحدًا على الأقل');
 const items=rows.map(row=>{
  const previous=Number.isInteger(row.originalIndex)?old.items?.[row.originalIndex]:null;
  const same=previous&&previous.id===row.id&&!!previous.isBundle===!!row.isBundle;
  const product=(row.isBundle?d.bundles:d.products)?.[row.id];if(!product)throw Error('المنتج غير موجود في المخزون');
  const price=same?Number(previous.price):Number(product.price);
  const cost=same?Number(previous.cost):row.isBundle?(product.items||[]).reduce((n,id)=>n+Number(d.products?.[id]?.cost||0),0):Number(product.cost||0);
  if(!Number.isFinite(price)||price<0||!Number.isFinite(cost)||cost<0)throw Error('سعر أو تكلفة المنتج غير صالحة');
  const item={...(same?previous:{}),id:row.id,name:product.name||row.id,stockName:product.name||row.id,commName:String(row.commName||product.name||row.id).trim(),qty:Number(row.qty),price,cost,isBundle:!!row.isBundle,preparationNote:String(row.preparationNote||'').trim(),customizationQty:row.preparationNote?Number(row.customizationQty??1):0};
  if(item.isBundle)item.stockComponents=same?(previous.stockComponents||product.items):product.items;
  P.details(item);return item;
 });
 const order={...old,...patch,items,qty:items.reduce((n,i)=>n+i.qty,0),name:items.map(i=>i.commName+' ×'+i.qty).join(' + '),revenue:money(items.reduce((n,i)=>n+i.price*i.qty,0)),cogs:money(items.reduce((n,i)=>n+i.cost*i.qty,0)),updatedAt:ts,moderatorEditedAt:ts,revision:F.num(old.revision)+1};
 F.validate(order);
 const before=F.held(old)?old.stockComponents||F.components(old,d.bundles||{}):{},after=F.components(order,d.bundles||{});
 for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
  const p=d.products?.[id];if(!p||!Number.isFinite(Number(p.qty)))throw Error('رصيد مخزون غير صالح');
  const qty=Number(p.qty)+Number(before[id]||0)-Number(after[id]||0);if(qty<0)throw Error('المخزون لا يكفي: '+(p.name||id));p.qty=qty;
 }
 order.stockAllocated=true;order.stockComponents=after;
 const total=money(order.revenue+(order.freeShipping?0:Number(order.shipping))-Number(order.discount||0)),pre=Number(order.prepaidAmount??order.deposit??0);
 order.paymentMethod=pre>=total&&total>0?'Prepaid':pre>0?'Mixed':'COD';
 const eventId='edit_'+key+'_'+order.revision;
 d.moderator_events=d.moderator_events||{};d.moderator_events[eventId]={id:eventId,type:'edit_order',orderId:key,moderatorId:actor.id,moderatorName:actor.name||'',customer:order.customer,timestamp:ts,date:order.date||'',beforeItems:old.items||[],afterItems:items};
 d.sales[key]=order;d.customers=d.customers||{};d.customers[order.phone]={...(d.customers[order.phone]||{}),name:order.customer,phone:order.phone,address:order.address,source:order.source||'',date:order.date||''};
 return d;
}
return {apply};
});
