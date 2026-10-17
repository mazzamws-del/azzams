const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('android-app/app/src/main/assets/index.html','utf8');
const source=html.slice(html.indexOf('window.azzamsTransaction=async'),html.indexOf('window.azzamsSave=async',html.indexOf('window.azzamsTransaction=async')));
const clone=v=>JSON.parse(JSON.stringify(v));
const context={window:{},navigator:{onLine:true},F:{clone},db:{}};vm.createContext(context);vm.runInContext(source,context);
function firebase(server,initial){const state={server:clone(server),writes:0,attempts:0};state.ref={once:async()=>({val:()=>clone(state.server)}),transaction:async update=>{let cached=clone(initial);for(let i=0;i<5;i++){state.attempts++;const next=update(clone(cached));if(next===undefined)return{committed:false,snapshot:{val:()=>clone(state.server)}};if(JSON.stringify(cached)!==JSON.stringify(state.server)){cached=clone(state.server);continue;}if(JSON.stringify(next)!==JSON.stringify(state.server))state.writes++;state.server=clone(next);return{committed:true,snapshot:{val:()=>clone(state.server)}};}throw Error('retry loop');}};return state;}
(async()=>{
 const tx=context.window.azzamsTransaction,original={revision:1,address:'old'};
 for(const cache of [null,{revision:0,address:'stale'}]){const f=firebase(original,cache);const value=await tx(f.ref,current=>{if(current.revision!==1)throw Error('conflict');return{...current,address:'new',revision:2}});assert.equal(value.address,'new');assert.equal(f.writes,1);assert.equal(f.attempts,2);}
 const conflict=firebase({revision:2,address:'other device'},original);await assert.rejects(tx(conflict.ref,current=>{if(current.revision!==1)throw Error('conflict');return{...current,address:'new',revision:2}}),/conflict/);assert.equal(conflict.writes,0);assert.equal(conflict.server.address,'other device');
 const root=firebase({sales:{a:original},products:{p:{qty:5}}},null);await tx(root.ref,data=>{data.products.p.qty-=2;data.sales.a.revision++;return data});assert.equal(root.server.products.p.qty,3);assert.equal(root.writes,1);
 const failed=firebase(root.server,root.server);await assert.rejects(tx(failed.ref,data=>{data.products.p.qty=0;throw Error('insufficient stock')}),/insufficient stock/);assert.equal(failed.server.products.p.qty,3);assert.equal(failed.writes,0);
 const missing=firebase(null,null);await assert.rejects(tx(missing.ref,()=>{throw Error('must not run')}),/السجل غير موجود/);assert.equal(missing.writes,0);
 console.log('PASS cold cache, stale cache, server-confirmed conflicts, stock exactly once, failure rollback, missing record');
})().catch(e=>{console.error(e);process.exitCode=1});
