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
