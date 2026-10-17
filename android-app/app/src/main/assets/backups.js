(function(){
'use strict';
const INTERVAL=15*60*1000,STORE='snapshots',META='metadata';let connection,busy=null,lastAttempt=0;
const status={text:'في انتظار أول نسخة تلقائية',error:false};
function open(){if(connection)return connection;connection=new Promise((resolve,reject)=>{const request=indexedDB.open('azzams-recovery-v1',2);request.onupgradeneeded=()=>{const local=request.result;if(!local.objectStoreNames.contains(STORE))local.createObjectStore(STORE,{keyPath:'id'});if(!local.objectStoreNames.contains(META)){const meta=local.createObjectStore(META,{keyPath:'id'}),cursor=request.transaction.objectStore(STORE).openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(row){const {payload,...details}=row.value;meta.put(details);row.continue();}};}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('أغلق النسخ الأخرى من النظام وحاول مجددًا'));});connection.catch(()=>{connection=null;});return connection;}
async function list(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(META,'readonly'),request=tx.objectStore(META).getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.at-a.at));request.onerror=()=>reject(request.error);});}
async function get(id){const local=await open();return new Promise((resolve,reject)=>{const request=local.transaction(STORE,'readonly').objectStore(STORE).get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function day(at){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date(at));}
function retained(rows){const sorted=[...rows].sort((a,b)=>b.at-a.at),keep=new Set(sorted.slice(0,48).map(x=>x.id)),days=new Set();for(const row of [...sorted].reverse()){const age=Math.floor((Date.now()-row.at)/86400000);if(age<=30&&!days.has(day(row.at))){days.add(day(row.at));keep.add(row.id);}}return keep;}
async function save(snapshot){const db=await open(),rows=await list(),keep=retained([...rows,snapshot]);keep.add(snapshot.id);return new Promise((resolve,reject)=>{const tx=db.transaction([STORE,META],'readwrite'),store=tx.objectStore(STORE),meta=tx.objectStore(META);store.put(snapshot);const {payload,...details}=snapshot;meta.put(details);for(const row of rows)if(!keep.has(row.id)){store.delete(row.id);meta.delete(row.id);}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('تعذر حفظ النسخة'));});}
function counts(data){return Object.fromEntries(['sales','products','expenses','customers','couriers','monthly_closures'].map(k=>[k,Object.keys(data[k]||{}).length]));}
function setStatus(text,error=false){Object.assign(status,{text,error});const node=document.getElementById('backup-status');if(node){node.textContent=text;node.style.color=error?'#a32323':'#205d45';}}
async function capture(reason='automatic',required=false){
 if(busy){const result=await busy;if(required&&!result)throw Error('تعذر تأمين نسخة قبل التقفيل');return result;}
 if(reason==='automatic'&&Date.now()-lastAttempt<INTERVAL)return;
 lastAttempt=Date.now();
 busy=(async()=>{try{
  if(navigator.onLine===false)throw Error('لا يوجد اتصال؛ النسخ السابقة محفوظة');
  const snapshot=await db.ref().once('value'),data=snapshot.val();
  if(!data||typeof data!=='object'||Array.isArray(data)||!Object.keys(data).length)throw Error('القاعدة فارغة؛ لم تُستبدل أي نسخة سابقة');
  const at=Date.now(),payload=JSON.stringify(data),latest=(await list())[0],previous=latest?await get(latest.id):null;
  const currentCounts=counts(data);if(previous&&['sales','products'].some(key=>previous.counts[key]>0&&currentCounts[key]===0))throw Error('اختفاء مجموعة بيانات كاملة؛ احتفظنا بالنسخ السابقة للمراجعة');
  if(previous&&previous.payload===payload){setStatus('آخر نسخة محفوظة: '+new Date(previous.at).toLocaleString('ar-EG')+' — البيانات لم تتغير');return previous;}
  const row={id:at+'-'+Math.random().toString(36).slice(2),at,reason,project:'azzams-system',schema:1,counts:counts(data),payload};
  await save(row);setStatus('تم حفظ نسخة على هذا الجهاز: '+new Date(at).toLocaleString('ar-EG'));await renderList();return row;
 }catch(e){setStatus('لم تُحفظ نسخة جديدة: '+e.message,true);if(required)throw e;return null;}finally{busy=null;}})();return busy;
}
async function download(id){const row=await get(id);if(!row)throw Error('النسخة غير موجودة');JSON.parse(row.payload);const name='Azzams_Backup_'+new Date(row.at).toISOString().replace(/[:.]/g,'-')+'.json';
 if(window.AndroidBridge?.saveBackupJson){AndroidBridge.saveBackupJson(name,row.payload);return;}
 const url=URL.createObjectURL(new Blob([row.payload],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function renderList(){const select=document.getElementById('backup-select');if(!select)return;const rows=await list();select.replaceChildren();for(const row of rows)select.add(new Option(new Date(row.at).toLocaleString('ar-EG')+' — '+row.counts.sales+' أوردر / '+row.counts.products+' منتج',row.id));if(!rows.length)select.add(new Option('لا توجد نسخ محفوظة بعد',''));}
function mount(){const section=document.getElementById('section-settings');if(!section)return;const card=document.createElement('section');card.id='backup-panel';card.style.cssText='padding:20px;margin:16px 0;background:#fff;border:1px solid #ddd;border-radius:16px;direction:rtl';card.innerHTML='<h2>النسخ الاحتياطي</h2><p>نسخة تلقائية كل ١٥ دقيقة أثناء فتح تطبيق الإدارة، وقبل التقفيل. الاحتفاظ بآخر ٤٨ نسخة ونسخة يومية لمدة ٣٠ يومًا، حسب المساحة المتاحة.</p><p><b>النسخ على هذا الجهاز فقط:</b> مسح بيانات التطبيق أو فقد الجهاز قد يفقدها. نزّل نسخة مستقلة واحتفظ بها خارج الجهاز.</p><p id="backup-status" role="status"></p><button type="button" class="btn btn-primary" id="backup-now">حفظ نسخة الآن</button><label style="display:block;margin-top:14px">النسخ المحفوظة<select id="backup-select" style="width:100%;padding:12px;margin:8px 0"></select></label><button type="button" class="btn btn-ghost" id="backup-download">تنزيل النسخة المختارة JSON</button><p><b>النسخ السحابي: لم يتم التحقق من تفعيله.</b> لتشغيل نسخة يومية حتى والتطبيق مقفول، افتح Firebase ← Realtime Database ← Backups. يحتاج خطة Blaze. لا تحفظ النسخ داخل نفس قاعدة البيانات.</p><p>الاسترجاع يتم بعد مراجعة الملف وحفظ نسخة من الحالة الحالية؛ لا يوجد زر يستبدل القاعدة دون مراجعة.</p>';
 section.prepend(card);document.getElementById('backup-now').onclick=async()=>{await capture('manual');};document.getElementById('backup-download').onclick=()=>download(document.getElementById('backup-select').value).catch(e=>setStatus(e.message,true));setStatus(status.text,status.error);renderList().then(async()=>{const rows=await list();if(rows.length)setStatus('آخر نسخة على الجهاز: '+new Date(rows[0].at).toLocaleString('ar-EG'));}).catch(e=>setStatus('التخزين المحلي غير متاح: '+e.message,true));
}
window.AzzamsBackups={capture,list,get,download,retained,counts};
azzamsReady(()=>{mount();setTimeout(()=>capture(),10000);setInterval(()=>{if(!document.hidden)capture();},INTERVAL);document.addEventListener('visibilitychange',()=>{if(!document.hidden)capture();});});
})();
