/* v1.8E.2b: unified comparison, reviewed conflict resolution, mobile backup link. */
(function(){'use strict';
const KEYS=['petal-pages-v1','bunnie-burrow-checkins-v1','bunnie-burrow-drafts-v1','damaged-dollhouse-profiles-v1','damaged-dollhouse-checkin-profile-links-v1','bunnie-burrow-preferences-v1','bunnie-burrow-palettes-v1','petal-pages-theme','damaged-dollhouse-journals-v1','damaged-dollhouse-dashboard-scene-v1','damaged-dollhouse-character-launch-v1','damaged-dollhouse-remembered-workspace-v1','damaged-dollhouse-chat-categories-v1','damaged-dollhouse-chat-channels-v1','damaged-dollhouse-chat-messages-v1','damaged-dollhouse-chat-drafts-v1','damaged-dollhouse-chat-tombstones-v1','damaged-dollhouse-chat-reads-v1'];
const LABELS={'petal-pages-v1':'Daily entries','bunnie-burrow-checkins-v1':'Additional check-ins','bunnie-burrow-drafts-v1':'Drafts','damaged-dollhouse-profiles-v1':'Doll profiles','damaged-dollhouse-checkin-profile-links-v1':'Check-in profile links','bunnie-burrow-preferences-v1':'Preferences','bunnie-burrow-palettes-v1':'Color palettes','petal-pages-theme':'Theme','damaged-dollhouse-journals-v1':'Journals'};
const ARRAY_KEYS=new Set(['bunnie-burrow-checkins-v1','damaged-dollhouse-profiles-v1','damaged-dollhouse-journals-v1','damaged-dollhouse-chat-categories-v1','damaged-dollhouse-chat-channels-v1','damaged-dollhouse-chat-messages-v1','damaged-dollhouse-chat-drafts-v1','damaged-dollhouse-chat-tombstones-v1','damaged-dollhouse-chat-reads-v1']);
const LABELS_CHAT={'damaged-dollhouse-chat-categories-v1':'Chat categories','damaged-dollhouse-chat-channels-v1':'Chat channels','damaged-dollhouse-chat-messages-v1':'Chat messages','damaged-dollhouse-chat-drafts-v1':'Chat drafts','damaged-dollhouse-chat-tombstones-v1':'Chat tombstones','damaged-dollhouse-chat-reads-v1':'Chat read markers'};Object.assign(LABELS,LABELS_CHAT);
const OBJECT_KEYS=new Set(['petal-pages-v1','damaged-dollhouse-checkin-profile-links-v1']);
const $=id=>document.getElementById(id);
const canonical=x=>JSON.stringify(normalize(x));
function normalize(x){if(Array.isArray(x))return x.map(normalize);if(x&&typeof x==='object'){const o=Object.create(null);Object.keys(x).sort().forEach(k=>Object.defineProperty(o,k,{value:normalize(x[k]),enumerable:true,writable:true,configurable:true}));return o}return x}
function parsed(raw,key){return raw===null?null:key==='petal-pages-theme'?raw:JSON.parse(raw)}
function conflictKey(key,id){return JSON.stringify([key,id])}
let pending=null, backupUrl=null;
function clearBackup(){if(backupUrl){URL.revokeObjectURL(backupUrl);backupUrl=null}$('mergeBackupReady').hidden=true;$('mergeBackupVerified').checked=false;if(pending){pending.downloaded=false;pending.snapshotFingerprint=null}}
function snapshot(){const items={};for(const key of KEYS)items[key]=localStorage.getItem(key);return {format:'damaged-dollhouse-unified-v4',exportedAt:new Date().toISOString(),items}}
function build(incoming,current,choices={}){
 const output={},counts={added:0,unchanged:0,retained:0,conflicts:0,resolved:0},conflicts=[],issues=[],byCategory={};
 function resolve(key,id,left,right,apply){const ck=conflictKey(key,id),choice=choices[ck];counts.conflicts++;conflicts.push({key,id,left,right,ck,choice});if(choice==='incoming'){apply(right);counts.resolved++}else if(choice==='existing'){counts.resolved++}}
 for(const key of KEYS){if(!Object.prototype.hasOwnProperty.call(incoming,key))continue;
  const before={...counts};
  const oldRaw=current[key],newRaw=incoming[key];let a,b;
  try{a=parsed(oldRaw,key);b=parsed(newRaw,key)}catch(e){issues.push(key+': invalid current or incoming data');continue}
  if(ARRAY_KEYS.has(key)){
   if(a!==null&&!Array.isArray(a)||b!==null&&!Array.isArray(b)){issues.push(key+': invalid collection');continue}
   const left=a||[],right=b||[],result=left.slice(),seen=new Map(),incomingIds=new Set();let bad=false;
   for(let i=0;i<left.length;i++){const item=left[i];if(!item||typeof item.id!=='string'||!item.id||seen.has(item.id)){issues.push(key+': existing record missing/duplicate ID');bad=true;break}seen.set(item.id,i)}
   if(bad)continue;
   for(const item of right){if(!item||typeof item.id!=='string'||!item.id||incomingIds.has(item.id)){issues.push(key+': incoming record missing/duplicate ID');bad=true;break}incomingIds.add(item.id);
    if(!seen.has(item.id)){result.push(item);counts.added++}else{const i=seen.get(item.id);if(canonical(result[i])===canonical(item))counts.unchanged++;else resolve(key,item.id,result[i],item,value=>result[i]=value)}}
   if(bad)continue;
   for(const item of left)if(!incomingIds.has(item.id))counts.retained++;
   output[key]=oldRaw===null&&newRaw===null?null:JSON.stringify(result);
  }else if(OBJECT_KEYS.has(key)){
   if(a!==null&&(typeof a!=='object'||Array.isArray(a))||b!==null&&(typeof b!=='object'||Array.isArray(b))){issues.push(key+': invalid object');continue}
   const left=a||{},right=b||{},result=Object.assign(Object.create(null),left);
   for(const [id,item] of Object.entries(right)){if(['__proto__','constructor','prototype'].includes(id)){issues.push(key+': unsafe record key '+id);continue}if(!Object.prototype.hasOwnProperty.call(left,id)){result[id]=item;counts.added++}else if(canonical(left[id])===canonical(item))counts.unchanged++;else resolve(key,id,left[id],item,value=>result[id]=value)}
   for(const id of Object.keys(left))if(!Object.prototype.hasOwnProperty.call(right,id))counts.retained++;
   output[key]=oldRaw===null&&newRaw===null?null:JSON.stringify(result);
  }else{
   if(oldRaw===null){output[key]=newRaw;if(newRaw!==null)counts.added++}
   else if(newRaw===null){output[key]=oldRaw;counts.retained++}
   else if(canonical(a)===canonical(b)){output[key]=oldRaw;counts.unchanged++}
   else{output[key]=oldRaw;resolve(key,'whole-category',a,b,value=>output[key]=newRaw)}
  }
  byCategory[key]={added:counts.added-before.added,unchanged:counts.unchanged-before.unchanged,retained:counts.retained-before.retained,conflicts:counts.conflicts-before.conflicts};
 }
 
 // Reject newly introduced dangling references. Existing historical orphan references
 // are reported separately by the app; this guard does not erase or rewrite them.
 try {
  const profiles=JSON.parse(output['damaged-dollhouse-profiles-v1']??current['damaged-dollhouse-profiles-v1']??'[]');
  const profileIds=new Set(profiles.map(p=>p.id));
  const previousProfiles=JSON.parse(current['damaged-dollhouse-profiles-v1']??'[]');
  const previousIds=new Set(previousProfiles.map(p=>p.id));
  const journals=JSON.parse(output['damaged-dollhouse-journals-v1']??current['damaged-dollhouse-journals-v1']??'[]');
  const oldJournals=JSON.parse(current['damaged-dollhouse-journals-v1']??'[]');
  const oldJournalById=new Map(oldJournals.map(j=>[j.id,j]));
  for(const j of journals){
   if(j.authorId && !profileIds.has(j.authorId) &&
      (!oldJournalById.has(j.id) || oldJournalById.get(j.id).authorId!==j.authorId))
     issues.push('Journal '+j.id+' references missing profile '+j.authorId);
  }
  const links=JSON.parse(output['damaged-dollhouse-checkin-profile-links-v1']??current['damaged-dollhouse-checkin-profile-links-v1']??'{}');
  const oldLinks=JSON.parse(current['damaged-dollhouse-checkin-profile-links-v1']??'{}');
  for(const [id,profileId] of Object.entries(links))
   if(!profileIds.has(profileId) && oldLinks[id]!==profileId)
    issues.push('Check-in link '+id+' references missing profile '+profileId);
 }catch(e){issues.push('Unable to verify merged profile references: '+e.message)}
 try{
  const get=(key)=>JSON.parse(output[key]??current[key]??'[]');
  const cats=new Set(get('damaged-dollhouse-chat-categories-v1').map(x=>x.id));
  const chans=get('damaged-dollhouse-chat-channels-v1');const channelIds=new Set(chans.map(x=>x.id));
  const oldChannels=new Map(JSON.parse(current['damaged-dollhouse-chat-channels-v1']??'[]').map(x=>[x.id,x]));
  for(const c of chans)if(!cats.has(c.categoryId)&&(!oldChannels.has(c.id)||oldChannels.get(c.id).categoryId!==c.categoryId))issues.push('Chat channel '+c.id+' has missing category');
  const profiles=new Set(JSON.parse(output['damaged-dollhouse-profiles-v1']??current['damaged-dollhouse-profiles-v1']??'[]').map(x=>x.id));
  const oldMsgs=new Map(JSON.parse(current['damaged-dollhouse-chat-messages-v1']??'[]').map(x=>[x.id,x]));
  const tombs=new Set(get('damaged-dollhouse-chat-tombstones-v1').map(x=>x.messageId));
  const messages=get('damaged-dollhouse-chat-messages-v1');
  for(const m of messages){
   if(tombs.has(m.id))issues.push('Deleted message '+m.id+' cannot be automatically restored from backup');
   if(!channelIds.has(m.channelId)&&(!oldMsgs.has(m.id)||oldMsgs.get(m.id).channelId!==m.channelId))issues.push('Message '+m.id+' references missing channel');
   for(const pid of m.author.profileIds)if(!profiles.has(pid)&&(!oldMsgs.has(m.id)||JSON.stringify(oldMsgs.get(m.id).author)!==JSON.stringify(m.author)))issues.push('Message '+m.id+' references missing author '+pid);
  }
  const oldDrafts=new Map(JSON.parse(current['damaged-dollhouse-chat-drafts-v1']??'[]').map(x=>[x.id,x]));
  for(const d of get('damaged-dollhouse-chat-drafts-v1'))if(!channelIds.has(d.channelId)&&(!oldDrafts.has(d.id)||oldDrafts.get(d.id).channelId!==d.channelId))issues.push('Draft '+d.id+' references missing channel');
 }catch(e){issues.push('Unable to verify chat references: '+e.message)}
 return {output,counts,conflicts,issues,byCategory};
}
function say(s){$('mergeCommitMessage').textContent=s}
function prepareDownload(obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 backupUrl=URL.createObjectURL(blob);
 const a=$('mergeBackupLink');a.href=backupUrl;a.download='damaged-dollhouse-PRE-MERGE-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 $('mergeBackupReady').hidden=false;
}
function refresh(){if(!pending)throw Error('Select a backup first');const now=snapshot(),plan=build(pending.incoming,now.items,pending.choices);return {now,plan}}
function updateButtons(plan){$('mergeSnapshotButton').disabled=!pending||plan.issues.length>0||plan.conflicts.some(c=>!c.choice);$('mergeCommitButton').disabled=$('mergeSnapshotButton').disabled||!pending.downloaded||!$('mergeBackupVerified').checked}
function render(){const {plan}=refresh(),wrap=$('mergeConflictList');wrap.replaceChildren();
 const holder=$('mergeComparisonResults');holder.replaceChildren();const table=document.createElement('table');table.style.cssText='width:100%;font-size:.9em;text-align:left';
 const header=document.createElement('tr');for(const label of ['Category','Same','Add','Keep existing','Conflicts']){const th=document.createElement('th');th.textContent=label;header.append(th)}table.append(header);
 for(const [key,counts] of Object.entries(plan.byCategory)){const row=document.createElement('tr');for(const value of [LABELS[key],counts.unchanged,counts.added,counts.retained,counts.conflicts]){const td=document.createElement('td');td.textContent=String(value);row.append(td)}table.append(row)}holder.append(table);

 for(const c of plan.conflicts){const section=document.createElement('div');section.className='note';section.style.margin='12px 0';const title=document.createElement('strong');title.textContent=c.key+' · '+c.id;section.append(title);
 const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Compare both versions';detail.append(summary);
 for(const [label,value] of [['Existing',c.left],['Incoming',c.right]]){const h=document.createElement('strong');h.textContent=label;const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;font-size:12px';pre.textContent=JSON.stringify(value,null,2);detail.append(h,pre)}section.append(detail);
 const label=document.createElement('label');label.textContent='Resolution: ';const sel=document.createElement('select');sel.setAttribute('aria-label','Resolution for '+c.key+' '+c.id);
 for(const [value,text] of [['','Choose a resolution'],['existing','Keep existing version'],['incoming','Use incoming version']]){const opt=document.createElement('option');opt.value=value;opt.textContent=text;sel.append(opt)}sel.value=c.choice||'';
 sel.addEventListener('change',()=>{pending.choices[c.ck]=sel.value;clearBackup();render()});label.append(sel);section.append(label);wrap.append(section)}
 const unresolved=plan.conflicts.filter(c=>!c.choice).length;
 say('Comparison: '+plan.counts.added+' additions, '+plan.counts.unchanged+' identical, '+plan.counts.retained+' existing-only, '+plan.conflicts.length+' conflicts ('+unresolved+' unresolved). '+(plan.issues.length?'BLOCKED: '+plan.issues.join('; '):unresolved?'Choose a resolution for every conflict.':'Ready for a pre-merge backup. Nothing has been changed.'));
 updateButtons(plan);
}
async function select(e){clearBackup();pending=null;$('mergeConflictList').replaceChildren();$('mergeSnapshotButton').disabled=true;$('mergeCommitButton').disabled=true;
 try{const f=e.target.files?.[0];if(!f)return;if(f.size>40*1024*1024)throw Error('Backup exceeds 40 MB');const raw=JSON.parse(await f.text()),validated=window.DollhouseValidateUnifiedBackup(raw),incoming={...validated.items};for(const key of KEYS)if(!Object.prototype.hasOwnProperty.call(incoming,key))delete incoming[key];pending={incoming,choices:{},downloaded:false};render()}
 catch(err){pending=null;say('⚠ '+err.message)}finally{e.target.value=''}
}
function saveSnapshot(){if(!pending)return;try{const {now,plan}=refresh();if(plan.issues.length||plan.conflicts.some(c=>!c.choice))throw Error('Resolve all conflicts first');clearBackup();prepareDownload(now);pending.downloaded=true;pending.snapshotFingerprint=JSON.stringify(now.items);updateButtons(plan);say('Safety backup is ready. Tap the Save PRE-MERGE backup file link, verify it saved, then check the confirmation box to enable merging. Nothing has changed.')}catch(e){say('⚠ '+e.message)}}
function commit(){if(!pending||!pending.downloaded)return;
 try{const {now,plan}=refresh();if(plan.issues.length||plan.conflicts.some(c=>!c.choice))throw Error('Merge blocked: unresolved conflicts or invalid records');if(plan.issues.length===0){
  const candidate={format:'damaged-dollhouse-unified-v4',items:{...now.items,...plan.output}};
  window.DollhouseValidateUnifiedBackup(candidate);
 }
 if(JSON.stringify(now.items)!==pending.snapshotFingerprint)throw Error('Browser data changed since the safety backup. Download a new pre-merge backup before continuing.');
 if(!confirm('Merge '+plan.counts.added+' new records and apply '+plan.counts.resolved+' explicit conflict decisions? Verify your PRE-MERGE backup was downloaded.'))return;
 if(prompt('Type MERGE to proceed:')!=='MERGE'){say('Merge canceled.');return}
 const old=now.items,changed=KEYS.filter(k=>Object.prototype.hasOwnProperty.call(plan.output,k)&&plan.output[k]!==old[k]);
 try{for(const key of changed){const v=plan.output[key];if(v===null)localStorage.removeItem(key);else localStorage.setItem(key,v)}for(const key of changed)if(localStorage.getItem(key)!==plan.output[key])throw Error('Post-write verification failed for '+key)}
 catch(e){let failed=false;for(const key of changed){try{if(old[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,old[key])}catch(_){failed=true}}throw Error(failed?'Merge failed and rollback incomplete. Restore your PRE-MERGE backup.':'Merge failed; rollback attempted. '+e.message)}
 clearBackup();pending=null;$('mergeCommitButton').disabled=true;$('mergeSnapshotButton').disabled=true;say('Merge complete. Reloading…');location.reload();
 }catch(e){say('⚠ '+e.message)}
}
window.addEventListener('DOMContentLoaded',()=>{$('mergeCommitSelect').addEventListener('click',()=>$('mergeCommitFile').click());$('mergeCommitFile').addEventListener('change',select);$('mergeSnapshotButton').addEventListener('click',saveSnapshot);$('mergeCommitButton').addEventListener('click',commit);$('mergeBackupVerified').addEventListener('change',()=>{if(pending)updateButtons(refresh().plan)})});
})();
