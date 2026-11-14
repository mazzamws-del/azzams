(function(){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function summaryHTML(entries){
 const r=AzzamsPreparation.summarize(entries);
 return '<section class="prep-summary"><h2>كشف سحب المنتجات فقط</h2><p>'+r.orders+' أوردر · '+r.rows.length+' صنف · '+r.units+' قطعة. الكمية الإجمالية تشمل التخصيص؛ لا تجمعها مرة ثانية.</p><table><thead><tr><th>المنتج / اللون</th><th>المطلوب</th><th>منها تخصيص</th></tr></thead><tbody>'+r.rows.map(row=>'<tr><td>'+esc(row.name)+'</td><td data-label="المطلوب">'+row.qty+'</td><td data-label="منها تخصيص">'+row.custom+'</td></tr>').join('')+'</tbody></table>'+(r.warnings.length?'<details><summary>تنبيهات للمراجعة</summary>'+r.warnings.map(w=>'<p>'+esc(w.text)+'</p>').join('')+'</details>':'')+'</section>';
}
const style=document.createElement('style');style.textContent='.prep-summary{padding:18px;background:#fff;border:1px solid #ddd;border-radius:16px;margin:12px 0;direction:rtl}.prep-summary h2{font-size:20px}.prep-summary p{font-size:13px;color:#666}.prep-table-wrap{overflow:auto}.prep-summary table{width:100%;border-collapse:collapse;min-width:580px}.prep-summary th,.prep-summary td{padding:12px;text-align:right;border-bottom:1px solid #ddd;vertical-align:top}.prep-summary th{background:#f3e9dc}.prep-special{display:block;color:#4a1425;padding:5px 0;white-space:pre-wrap}.prep-summary details{background:#fff7e8;padding:10px;margin-top:12px}.prep-private{display:block;font-size:12px;white-space:pre-wrap;background:#fff5e6;padding:7px;margin-top:5px}.prep-edit-field{display:block;margin-top:8px}.prep-edit-field input{width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;min-height:44px}.prep-edit-field label{font-size:12px;display:block}@media screen and (max-width:650px){.prep-summary table{min-width:0;display:block}.prep-summary thead{display:none}.prep-summary tbody{display:block}.prep-summary tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #ddd;border-radius:12px;margin:10px 0;overflow:hidden}.prep-summary td{display:block;padding:10px;overflow-wrap:anywhere}.prep-summary td:first-child,.prep-summary td:last-child{grid-column:1/-1}.prep-summary td[data-label]:before{content:attr(data-label);display:block;font-size:11px;color:#666}.prep-summary td:first-child{background:#f3e9dc}}';document.head.append(style);
window.azzamsPreparationSummaryHTML=summaryHTML;
const originalPacking=window.renderPackingStation,B=AzzamsPrepBatches;
let mode='pick',batches={},selected='',loaded=false,busy=false;
function action(text,fn){const b=document.createElement('button');b.type='button';b.className='btn btn-ghost';b.textContent=text;b.disabled=busy;b.onclick=fn;return b;}
async function mutate(fn){if(busy)return;busy=true;try{await azzamsAtomic(fn);return true;}catch(e){alert(e.message);return false;}finally{busy=false;renderPackingStation();}}
function printEntries(entries,distribution=false){const holder=document.createElement('div');holder.hidden=true;for(const[id]of entries){const c=document.createElement('input');c.type='checkbox';c.className='batch-print-selection';c.checked=true;c.value=id;holder.append(c);}document.body.append(holder);printPreparationList('.batch-print-selection:checked',distribution?'orders':'pick');holder.remove();}
window.renderPackingStation=function(){
 originalPacking();const list=document.getElementById('v62-packing-list');if(!list)return;
 let panel=document.getElementById('prep-pick-summary');if(!panel){panel=document.createElement('section');panel.id='prep-pick-summary';list.before(panel);}
 let nav=document.getElementById('prep-mode-nav');if(!nav){nav=document.createElement('div');nav.id='prep-mode-nav';panel.before(nav);}nav.replaceChildren(action('١ · سحب المنتجات',()=>{mode='pick';renderPackingStation();}),action('٢ · توزيع وتغليف الأوردرات',()=>{mode='orders';renderPackingStation();}));
 const batch=batches[selected],used=new Set(Object.values(batches).filter(b=>!b.closedAt).flatMap(b=>Object.keys(b.orders||{}))),q=v62NormalizeArabic(document.getElementById('v62-pack-search')?.value||'');
 const candidates=Object.entries(salesData).filter(([id,s])=>B.eligible(s)&&!used.has(id)&&(!q||v62OrderSearchText(id,s).includes(q)));
 const entries=batch?Object.entries(batch.orders):candidates,r=AzzamsPreparation.summarize(entries),changed=batch?B.changes(batch,salesData):[];
 panel.innerHTML='<div class="prep-batch-head"><div><h2>'+ (mode==='pick'?'اسحب المطلوب مرة واحدة':'وزّع من القطع المسحوبة')+'</h2><p>'+ (mode==='pick'?'ابدأ تجهيز مجموعة طلبات، وسجّل عدد القطع التي سحبتها فعليًا.':'راجع التخصيص والرسالة والتغليف، ثم اعتمد كل أوردر.')+'</p></div><label>مجموعة الطلبات<select id="prep-batch-select"></select></label></div><div id="prep-batch-actions"></div><div id="prep-batch-content"></div>';
 const select=document.getElementById('prep-batch-select');select.add(new Option('طلبات جديدة — لم يبدأ تجهيزها',''));for(const[id,b]of Object.entries(batches).sort((a,b)=>b[1].createdAt-a[1].createdAt))select.add(new Option((b.closedAt?'مكتملة · ':'مفتوحة · ')+new Date(b.createdAt).toLocaleString('ar-EG')+' · '+Object.keys(b.orders).length+' أوردر',id));select.value=selected;select.onchange=()=>{selected=select.value;renderPackingStation();};
 const actions=document.getElementById('prep-batch-actions'),body=document.getElementById('prep-batch-content');
 if(!batch){const b=action('بدء تجهيز الطلبات ('+candidates.length+')',()=>startPreparation(candidates.map(([k])=>k)));b.disabled=!loaded||!candidates.length||busy;actions.append(b);body.innerHTML=summaryHTML(candidates)+'<p>اضغط بدء التجهيز لحفظ المسحوب والمتبقي لهذه الطلبات. الطلبات الجديدة تظل منفصلة.</p>';}

 else {
 actions.append(action('طباعة كشف السحب',()=>{if(changed.length)return alert('راجع الأوردرات المتغيرة قبل الطباعة');const win=window.open('','_blank');if(!win)return alert('اسمح بنافذة الطباعة');const rows=r.rows.map(row=>'<tr><td>'+esc(row.name)+'</td><td>'+row.qty+'</td><td>'+B.picked(batch,row.key)+'</td><td>'+Math.max(0,row.qty-B.picked(batch,row.key))+'</td></tr>').join('');win.document.write('<html dir="rtl"><head><title>كشف سحب دفعة</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid;padding:12px}@media print{button{display:none}}</style></head><body><h1>كشف سحب فقط — '+esc(selected)+'</h1><p>المتبقي وقت الطباعة؛ راجع النظام قبل إعادة السحب. '+esc(new Date().toLocaleString('ar-EG'))+'</p><table><thead><tr><th>المنتج</th><th>المطلوب</th><th>تم سحبه</th><th>المتبقي</th></tr></thead><tbody>'+rows+'</tbody></table><button onclick="print()">طباعة</button></body></html>');win.document.close();}),action('طباعة التوزيع والتخصيص',()=>{if(changed.length)return alert('راجع تغييرات الدفعة أولًا');printEntries(entries,true);}));
 if(!batch.closedAt)actions.append(action('إلغاء الدفعة بعد إعادة القطع غير المعبأة',()=>{if(!confirm('أكد فقط بعد إعادة كل القطع المسحوبة التي لم تُعبأ للمخزن، ومراجعة الأوردرات المجهزة. سيتم حفظ الدفعة كسجل ملغي وإتاحة غير المجهز لدفعة جديدة.'))return;mutate(d=>B.cancel(d,selected,batch.revision,Date.now()));}));
 if(!batch.closedAt)actions.append(action('إنهاء الدفعة بعد اعتماد كل الأوردرات',()=>mutate(d=>B.close(d,selected,batch.revision,Date.now()))));
 if(changed.length)body.innerHTML='<div role="alert" class="prep-alert">توقف: محتويات أو حالة أوردر اتغيرت. راجع القطع المسحوبة قبل أي سحب إضافي. الأوردرات: '+esc(B.changeText(batch,salesData))+' . الدفعة محفوظة ولم تُصفّر كمياتها.</div>';
 if(mode==='pick'){
 const sorted=[...r.rows].sort((a,b)=>(B.picked(batch,a.key)>=a.qty)-(B.picked(batch,b.key)>=b.qty));
 const grid=document.createElement('div');grid.className='prep-product-grid';for(const row of sorted){const count=B.picked(batch,row.key),card=document.createElement('article');card.className='prep-product'+(count>=row.qty?' complete':'');card.innerHTML='<h3>'+esc(row.name)+'</h3><div class="prep-remaining"><span>المتبقي</span><strong>'+Math.max(0,row.qty-count)+'</strong></div><p>المطلوب '+row.qty+' · تم سحبه '+count+' · منها تخصيص '+row.custom+'</p>';
 const input=document.createElement('input');input.type='number';input.min=0;input.max=row.qty;input.step=1;input.value=count;input.setAttribute('aria-label','عدد المسحوب من '+row.name);input.disabled=!!batch.closedAt||!!changed.length||busy;
 const save=action('حفظ عدد المسحوب',()=>mutate(d=>B.pick(d,selected,row.key,Number(input.value),batch.revision,Date.now())));save.disabled=input.disabled;card.append(input,save);grid.append(card);}body.append(grid);
 }else body.insertAdjacentHTML('beforeend','<p class="prep-alert">هذه قائمة توزيع من القطع المسحوبة؛ ليست قائمة سحب جديدة. افتح «سحب المنتجات» لمراجعة المتبقي.</p>');
 }
 const complete=batch&&r.rows.every(row=>B.picked(batch,row.key)>=row.qty);if(mode==='orders'&&batch&&!complete)body.insertAdjacentHTML('beforeend','<p class="prep-alert">أكمل تسجيل سحب الدفعة أولًا قبل توزيع الأوردرات.</p>');const show=mode==='orders'&&!!batch&&complete&&!changed.length&&!batch.cancelledAt;list.style.setProperty('display',show?'grid':'none','important');const tabs=document.getElementById('v63-pack-tabs');if(tabs)tabs.style.display=show?'':'none';
 if(show)for(const card of list.querySelectorAll('[data-order-key]'))card.hidden=!batch.orders[card.dataset.orderKey];
};
let starting=false;
async function startPreparation(ids){
 if(starting||busy)return;if(!ids.length)return alert('حدد أوردرات أولًا');starting=true;
 try{
  if(navigator.onLine===false)throw Error('اتصل بالإنترنت لتحديث الطلبات');
  const snap=await db.ref().once('value'),data=snap.val();if(!data||!data.sales)throw Error('لم تكتمل قراءة الأوردرات؛ لم يتغير شيء');
  const p=B.preview(data,ids);batches=data.preparation_batches||{};
  if(!p.ready.length){const groups=[...new Set(p.excluded.map(x=>x.batchId).filter(Boolean))];if(groups.length===1&&p.excluded.every(x=>x.batchId===groups[0])){selected=groups[0];showSection('packing');renderPackingStation();return;}
   throw Error('لا توجد طلبات جاهزة لبدء التجهيز ضمن التحديد:\n'+p.excluded.map(x=>'#'+x.displayId+' — '+x.reason).join('\n'));
  }
  const message='بدء تجهيز '+p.ready.length+' أوردر؟ سيتم حفظ المسحوب والمتبقي.'+(p.excluded.length?'\n\nلن تدخل الطلبات التالية:\n'+p.excluded.map(x=>'#'+x.displayId+' — '+x.reason).join('\n'):'');
  if(!confirm(message))return;
  const id=db.ref('preparation_batches').push().key;const ok=await mutate(d=>B.create(d,p.ready,id,Date.now()));if(ok){selected=id;showSection('packing');renderPackingStation();}
 }catch(err){alert(err.message);}finally{starting=false;}
}
const legacyPrint=window.printPreparationList;
window.printPreparationList=function(selector,mode){if(mode)return legacyPrint(selector,mode);return startPreparation([...new Set([...document.querySelectorAll(selector)].map(x=>x.value))]);};
window.v62MarkPacked=async function(key){
 const checks=[...document.querySelectorAll('.pack-check-'+CSS.escape(key))];if(!checks.length||checks.some(x=>!x.checked))return alert('راجع وحدد كل أصناف الأوردر أولًا');
 const batchId=selected;
 await mutate(d=>{const b=d.preparation_batches?.[batchId];if(!b||b.closedAt||!b.orders[key])throw Error('راجع دفعة الأوردر');if(B.changes(b,d.sales||{}).length)throw Error(B.changeText(b,d.sales||{})+' — عدد المسحوب محفوظ');const r=AzzamsPreparation.summarize(Object.entries(b.orders));if(r.rows.some(row=>B.picked(b,row.key)<row.qty))throw Error('أكمل سحب الدفعة أولًا');const s=d.sales[key];if(s.packedAt)return d;const ts=Date.now();Object.assign(s,{packedAt:ts,readyToShipAt:ts,statusUpdatedAt:ts,updatedAt:ts,revision:Number(s.revision||0)+1});return d;});
};
azzamsReady(()=>db.ref('preparation_batches').on('value',snap=>{batches=snap.val()||{};loaded=true;if(document.getElementById('section-packing')?.classList.contains('active'))renderPackingStation();},err=>{loaded=false;alert('تعذر تحميل دفعات التجهيز: '+err.message);}));
style.textContent+='#prep-mode-nav,#prep-batch-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.prep-batch-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.prep-batch-head select{display:block;max-width:100%;padding:12px;border:1px solid #ddd;border-radius:10px}.prep-product-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:16px 0}.prep-product{background:#fff;border:1px solid #e5dfd8;border-radius:18px;padding:20px}.prep-product h3{font-size:18px}.prep-product.complete{background:#edf7f1}.prep-remaining{display:flex;justify-content:space-between;align-items:center}.prep-remaining strong{font-size:40px;color:#4a1425}.prep-product input{width:80px;padding:10px;border:1px solid #ccc;border-radius:8px;margin:5px}.prep-alert{padding:15px;background:#fff3d9;border-radius:12px;margin:12px 0}.v62-pack-card[hidden]{display:none!important}@media(max-width:650px){.prep-product-grid{grid-template-columns:1fr}.prep-batch-head select{width:100%}}';
window.azzamsPreparationPrintStyle=()=>style.textContent+'@media print{.prep-table-wrap{overflow:visible}.prep-summary table{min-width:0}.prep-summary tr{break-inside:avoid}}';
})();
