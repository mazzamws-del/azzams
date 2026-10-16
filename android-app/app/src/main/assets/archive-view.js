/* Closing removes completed records from daily lists; originals stay available. */
(function(){'use strict';
function boot(){for(const id of ['delivered','returns','expenses']){const section=document.getElementById('section-'+id);if(!section)continue;const bar=document.createElement('div');bar.className='rd-filter-bar';const label=document.createElement('label');label.textContent='عرض السجلات';const select=document.createElement('select');select.id='archive-view-'+id;select.append(new Option('الشغل الحالي','current'),new Option('أرشيف التقفيلات','archive'));label.append(select);bar.append(label);section.prepend(bar);select.onchange=()=>{window.azzamsArchiveView=select.value==='archive'?id:'';for(const other of ['delivered','returns','expenses'])if(other!==id)document.getElementById('archive-view-'+other).value='current';updateUI();};}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,60));else boot();
})();
