(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AzzamsPreparation=api;})(globalThis,function(){
'use strict';
const normalize=value=>String(value||'').toLowerCase().normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
function details(item){
 const qty=Number(item.qty),note=String(item.preparationNote||'').trim(),custom=note?Number(item.customizationQty??1):0;
 if(!Number.isInteger(qty)||qty<1)throw Error('كمية المنتج غير صحيحة');
 if(!Number.isInteger(custom)||custom<0||custom>qty||(note&&custom===0))throw Error('عدد القطع المخصصة يجب أن يكون من 1 إلى كمية المنتج');
 if(note.length>1000)throw Error('وصف التجهيز أطول من 1000 حرف');
 return {qty,note,custom};
}
function summarize(entries){
 const groups=new Map(),warnings=[];let units=0;
 for(const [orderId,sale] of entries){
  const items=Array.isArray(sale.items)&&sale.items.length?sale.items:[{name:sale.name,qty:sale.qty||1}];
  if(sale.notes)warnings.push({orderId,text:'ملاحظة أوردر تحتاج مراجعة: '+sale.notes});
  items.forEach((item,index)=>{
   const name=String(item.commName||item.name||'').trim();let d;
   try{d=details(item);}catch(e){warnings.push({orderId,text:e.message});return;}
   if(!name){warnings.push({orderId,text:'منتج بدون اسم؛ راجع الأوردر'});return;}
   // Actual item names matter: one stock ID can represent several models/colours.
   // Only spelling/spacing normalization is automatic; fuzzy guesses never merge variants.
   const key=(item.isBundle?'bundle:':'item:')+normalize(name);
   if(!groups.has(key))groups.set(key,{key,name,qty:0,custom:0,ordinary:0,lines:[],stockIds:new Set()});
   const group=groups.get(key);group.qty+=d.qty;group.custom+=d.custom;group.ordinary+=d.qty-d.custom;units+=d.qty;
   if(item.id)group.stockIds.add(item.id);
   group.lines.push({orderId,index,qty:d.qty,custom:d.custom,note:d.note});
   if(item.isBundle)warnings.push({orderId,text:'عرض مركب: '+name+' — راجع مكوناته قبل التجهيز'});
  });
 }
 const rows=[...groups.values()].map(g=>({...g,stockIds:[...g.stockIds]})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
 for(const row of rows)if(row.stockIds.length>1)warnings.push({orderId:'',text:'الاسم «'+row.name+'» مرتبط بأكثر من صنف مخزون؛ راجع أكواد الأصناف قبل السحب'});
 return {rows,warnings,units,orders:entries.length};
}
return {normalize,details,summarize};
});
