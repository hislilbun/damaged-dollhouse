/* v1.8E.1: READ-ONLY safe merge inspection. No writes to localStorage. */
(function(){'use strict';
const KEYS=['petal-pages-v1','bunnie-burrow-checkins-v1','bunnie-burrow-drafts-v1','damaged-dollhouse-profiles-v1','damaged-dollhouse-checkin-profile-links-v1','bunnie-burrow-preferences-v1','bunnie-burrow-palettes-v1','petal-pages-theme','damaged-dollhouse-journals-v1'];
const LABELS=['Daily entries','Additional check-ins','Drafts','Doll profiles','Check-in profile links','Preferences','Color palettes','Theme','Journals'];
const MAX=40*1024*1024;
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
function read(raw,key){if(raw===null)return null;if(key==='petal-pages-theme')return raw;return JSON.parse(raw)}
function records(v,key){if(v===null)return new Map();if(Array.isArray(v)){
 const m=new Map();for(let i=0;i<v.length;i++){const item=v[i];const id=item&&typeof item.id==='string'&&item.id?item.id:null;
 // Never guess identity from content or array position. Unidentified records require manual review.
 const k=id?'id:'+id:'unidentified:'+i;if(m.has(k))throw Error('Duplicate record identity in '+key);m.set(k,item)}return m}
 if(v&&typeof v==='object')return new Map(Object.entries(v));return new Map([['value',v]])}
function compare(a,b,key){const left=records(a,key),right=records(b,key),out={unchanged:0,add:0,retained:0,conflict:0,review:0};
 for(const [id,value] of right){if(id.startsWith('unidentified:')){out.review++;continue}if(!left.has(id)){out.add++;continue}if(canonical(value)===canonical(left.get(id)))out.unchanged++;else out.conflict++}
 for(const id of left.keys())if(!right.has(id))out.retained++;
 // Unidentified current-side records also require manual review.
 for(const id of left.keys())if(id.startsWith('unidentified:'))out.review++;
 return out}
function show(text){document.getElementById('mergePreviewMessage').textContent=text}
async function preview(e){const file=e.target.files&&e.target.files[0];if(!file)return;const table=document.getElementById('mergePreviewResults');table.replaceChildren();
 try{if(file.size>MAX)throw Error('Backup exceeds 40 MB');const incoming=JSON.parse(await file.text());
 if(typeof window.DollhouseValidateUnifiedBackup!=='function')throw Error('Unified backup validator unavailable');
 const checked=window.DollhouseValidateUnifiedBackup(incoming);let totals={unchanged:0,add:0,retained:0,conflict:0,review:0};
 const head=document.createElement('tr');for(const s of ['Category','Same','Add','Keep existing','Conflicts','Review']){const th=document.createElement('th');th.textContent=s;head.append(th)}table.append(head);
 KEYS.forEach((key,i)=>{if(checked.legacy&&key==='damaged-dollhouse-journals-v1')return;
 const existingRaw=localStorage.getItem(key);const incomingRaw=checked.items[key];const a=read(existingRaw,key),b=read(incomingRaw,key);
 const result=compare(a,b,key);Object.keys(totals).forEach(k=>totals[k]+=result[k]);const tr=document.createElement('tr');
 for(const value of [LABELS[i],result.unchanged,result.add,result.retained,result.conflict,result.review]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}table.append(tr)});
 table.hidden=false;show('Read-only preview complete: '+totals.add+' additions, '+totals.unchanged+' unchanged, '+totals.retained+' existing-only, '+totals.conflict+' conflicts, '+totals.review+' needing manual review. Nothing was imported or changed. Settings and drafts are compared conservatively; this is NOT an approval to merge.');
 }catch(err){table.hidden=true;show('⚠ Preview unavailable: '+err.message+'. No data was changed.')}finally{e.target.value=''}}
window.addEventListener('DOMContentLoaded',()=>{document.getElementById('mergePreviewButton').addEventListener('click',()=>document.getElementById('mergePreviewFile').click());document.getElementById('mergePreviewFile').addEventListener('change',preview)});
})();


/* v1.8E.2: conservative, conflict-blocking, user-confirmed merge. */
(function(){'use strict';
const KEYS=['petal-pages-v1','bunnie-burrow-checkins-v1','bunnie-burrow-drafts-v1','damaged-dollhouse-profiles-v1','damaged-dollhouse-checkin-profile-links-v1','bunnie-burrow-preferences-v1','bunnie-burrow-palettes-v1','petal-pages-theme','damaged-dollhouse-journals-v1'];
const ARRAY_KEYS=new Set(['bunnie-burrow-checkins-v1','damaged-dollhouse-profiles-v1','damaged-dollhouse-journals-v1']);
const OBJECT_KEYS=new Set(['petal-pages-v1','damaged-dollhouse-checkin-profile-links-v1']);
const SAFE_NULLABLE=new Set(['bunnie-burrow-drafts-v1','bunnie-burrow-preferences-v1','bunnie-burrow-palettes-v1','petal-pages-theme']);
const $=id=>document.getElementById(id);
let pending=null;
const canonical=x=>JSON.stringify(normalize(x));
function normalize(x){if(Array.isArray(x))return x.map(normalize);if(x&&typeof x==='object'){const o={};Object.keys(x).sort().forEach(k=>o[k]=normalize(x[k]));return o}return x}
function parsed(raw,key){return raw===null?null:key==='petal-pages-theme'?raw:JSON.parse(raw)}
function build(incoming,current){const output={},counts={added:0,unchanged:0,retained:0},issues=[];
 for(const key of KEYS){if(!Object.prototype.hasOwnProperty.call(incoming,key))continue;
 const oldRaw=current[key],newRaw=incoming[key];let a,b;
 try{a=parsed(oldRaw,key);b=parsed(newRaw,key)}catch(e){issues.push(key+': invalid current data');continue}
 if(ARRAY_KEYS.has(key)){
   if(a!==null&&!Array.isArray(a)){issues.push(key+': invalid current collection');continue}
   if(b!==null&&!Array.isArray(b)){issues.push(key+': invalid incoming collection');continue}
   const left=a||[],right=b||[],seen=new Map(),result=left.slice();let bad=false;
   for(const item of left){if(!item||typeof item.id!=='string'||!item.id||seen.has(item.id)){issues.push(key+': existing record missing/duplicate ID');bad=true;break}seen.set(item.id,item)}
   if(bad)continue;
   const incomingIds=new Set();for(const item of right){if(!item||typeof item.id!=='string'||!item.id||incomingIds.has(item.id)){issues.push(key+': incoming record missing/duplicate ID');bad=true;break}incomingIds.add(item.id);
     if(!seen.has(item.id)){result.push(item);counts.added++}else if(canonical(seen.get(item.id))===canonical(item))counts.unchanged++;else issues.push(key+': conflicting record ID '+item.id)}
   if(bad)continue;
   for(const item of left)if(!incomingIds.has(item.id))counts.retained++;
   output[key]=oldRaw===null&&newRaw===null?null:JSON.stringify(result);
 }else if(OBJECT_KEYS.has(key)){
   if(a!==null&&(typeof a!=='object'||Array.isArray(a))||b!==null&&(typeof b!=='object'||Array.isArray(b))){issues.push(key+': invalid object');continue}
   const left=a||{},right=b||{},result={...left};
   for(const [id,item] of Object.entries(right)){if(!Object.prototype.hasOwnProperty.call(left,id)){result[id]=item;counts.added++}else if(canonical(left[id])===canonical(item))counts.unchanged++;else issues.push(key+': conflicting key '+id)}
   for(const id of Object.keys(left))if(!Object.prototype.hasOwnProperty.call(right,id))counts.retained++;
   output[key]=oldRaw===null&&newRaw===null?null:JSON.stringify(result);
 }else if(SAFE_NULLABLE.has(key)){
   if(oldRaw===null){output[key]=newRaw;if(newRaw!==null)counts.added++}
   else if(newRaw===null){output[key]=oldRaw;counts.retained++}
   else if(canonical(a)===canonical(b)){output[key]=oldRaw;counts.unchanged++}
   else{issues.push(key+': different settings/draft data; manual review required');output[key]=oldRaw}
 }
 }
 return {output,counts,issues};
}
function say(s){$('mergeCommitMessage').textContent=s}
function download(obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='damaged-dollhouse-PRE-MERGE-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function snapshot(){const items={};for(const key of KEYS)items[key]=localStorage.getItem(key);return {format:'damaged-dollhouse-unified-v2',exportedAt:new Date().toISOString(),items}}
function refresh(){const now=snapshot(),plan=build(pending.incoming,now.items);if(plan.issues.length)throw Error('Merge blocked: '+plan.issues.length+' conflict(s) or unsupported records. '+plan.issues.slice(0,3).join('; '));return {now,plan}}
async function select(e){const f=e.target.files?.[0];pending=null;$('mergeCommitButton').disabled=true;$('mergeSnapshotButton').disabled=true;
 try{if(!f)return;if(f.size>40*1024*1024)throw Error('Backup exceeds 40 MB');const raw=JSON.parse(await f.text()),validated=window.DollhouseValidateUnifiedBackup(raw);const incoming={...validated.items};if(validated.legacy)delete incoming['damaged-dollhouse-journals-v1'];pending={incoming,downloaded:false};const {plan}=refresh();
 say('Ready to merge: '+plan.counts.added+' additions, '+plan.counts.unchanged+' identical, '+plan.counts.retained+' retained-only. First download and KEEP the pre-merge snapshot, then confirm the merge.');$('mergeSnapshotButton').disabled=false;
 }catch(err){pending=null;say('⚠ '+err.message)}finally{e.target.value=''}
}
function saveSnapshot(){if(!pending)return;try{refresh();download(snapshot());pending.downloaded=true;$('mergeCommitButton').disabled=false;say('Pre-merge snapshot download initiated. Confirm it actually saved before continuing. Click Merge only after you have verified the downloaded file.')}catch(e){say('⚠ '+e.message)}}
function commit(){if(!pending||!pending.downloaded)return;let old;
 try{const {now,plan}=refresh();old=now.items;if(!confirm('MERGE '+plan.counts.added+' new records into this browser? Existing-only records stay. No conflicting records will be overwritten. Verify your PRE-MERGE backup was downloaded first.'))return;
 if(prompt('Type MERGE to proceed:')!=='MERGE'){say('Merge canceled.');return}
 const changed=KEYS.filter(k=>Object.prototype.hasOwnProperty.call(plan.output,k)&&plan.output[k]!==old[k]);
 try{for(const key of changed){const v=plan.output[key];if(v===null)localStorage.removeItem(key);else localStorage.setItem(key,v)}for(const key of changed)if(localStorage.getItem(key)!==plan.output[key])throw Error('Post-write verification failed for '+key)}catch(e){let failed=false;for(const key of changed){try{if(old[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,old[key])}catch(_){failed=true}}throw Error(failed?'Merge failed and rollback was incomplete. Use your PRE-MERGE backup; do not continue editing.':'Merge failed; rollback attempted. '+e.message)}
 pending=null;$('mergeCommitButton').disabled=true;$('mergeSnapshotButton').disabled=true;say('♡ Merge completed and verified for '+changed.length+' storage categories. Reloading…');location.reload();
 }catch(e){say('⚠ '+e.message)}
}
window.addEventListener('DOMContentLoaded',()=>{$('mergeCommitSelect').addEventListener('click',()=>$('mergeCommitFile').click());$('mergeCommitFile').addEventListener('change',select);$('mergeSnapshotButton').addEventListener('click',saveSnapshot);$('mergeCommitButton').addEventListener('click',commit)});
})();
