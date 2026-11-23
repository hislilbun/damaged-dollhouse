/* v1.7E — Complete, offline snapshot export/restore. Existing import/export buttons remain. */
(function(){
'use strict';
const KEYS=[
 'petal-pages-v1',
 'bunnie-burrow-checkins-v1',
 'bunnie-burrow-drafts-v1',
 'damaged-dollhouse-profiles-v1',
 'damaged-dollhouse-checkin-profile-links-v1',
 'bunnie-burrow-preferences-v1',
 'bunnie-burrow-palettes-v1',
 'petal-pages-theme',
 'damaged-dollhouse-journals-v1',
 'damaged-dollhouse-dashboard-scene-v1',
 'damaged-dollhouse-character-launch-v1',
 'damaged-dollhouse-remembered-workspace-v1',
 'damaged-dollhouse-chat-categories-v1',
 'damaged-dollhouse-chat-channels-v1',
 'damaged-dollhouse-chat-messages-v1',
 'damaged-dollhouse-chat-drafts-v1',
 'damaged-dollhouse-chat-tombstones-v1',
 'damaged-dollhouse-chat-reads-v1'
];
const FORMAT='damaged-dollhouse-unified-v4';
const V3_FORMAT='damaged-dollhouse-unified-v3';
const V2_FORMAT='damaged-dollhouse-unified-v2';
const LEGACY_FORMAT='damaged-dollhouse-unified-v1';
const $=id=>document.getElementById(id);
const notice=s=>{$('unifiedMessage').textContent=s};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function snapshot(){
 const items={};
 for(const key of KEYS)items[key]=localStorage.getItem(key);
 return {format:FORMAT,exportedAt:new Date().toISOString(),items};
}
function validate(s){
 if(!plain(s)||![FORMAT,V3_FORMAT,V2_FORMAT,LEGACY_FORMAT].includes(s.format)||!plain(s.items))throw Error('Not a supported complete Dollhouse backup');
 const keys=s.format===LEGACY_FORMAT?KEYS.slice(0,8):s.format===V2_FORMAT?KEYS.slice(0,9):s.format===V3_FORMAT?KEYS.slice(0,17):KEYS;
 if(Object.keys(s.items).length!==keys.length||Object.keys(s.items).some(k=>!keys.includes(k)))throw Error('Backup contains missing or unexpected storage categories');
 for(const key of keys){
   const raw=s.items[key];
   if(raw!==null&&typeof raw!=='string')throw Error('Invalid stored value for '+key);
   if(raw===null)continue;
   if(key.startsWith('damaged-dollhouse-chat-')){window.DollhouseEchoStore.validate(key,raw);continue;}
   if(key==='damaged-dollhouse-dashboard-scene-v1'){if(!['daydream','haven','nightmare','off'].includes(raw))throw Error('Invalid dashboard scene');continue;}
   if(key==='damaged-dollhouse-character-launch-v1'){if(!['ask','remember'].includes(raw))throw Error('Invalid character launch preference');continue;}
   if(key==='damaged-dollhouse-remembered-workspace-v1'){if(raw.length>200)throw Error('Invalid remembered workspace');continue;}
   if(key==='petal-pages-theme'){
     if(!['light','dark'].includes(raw))throw Error('Invalid theme');
     continue;
   }
   let value;
   try{value=JSON.parse(raw)}catch(e){throw Error('Invalid JSON in '+key)}
   if(key==='petal-pages-v1'){
     if(!plain(value))throw Error('Invalid daily entries');
     validateBackup({format:'petal-pages-v1',entries:value});
   }else if(key==='bunnie-burrow-checkins-v1'){
     if(!Array.isArray(value))throw Error('Invalid additional check-ins');
     validateFull({format:'bunnie-burrow-v1.5',entries:{},checkins:value,drafts:{}});
   }else if(key==='damaged-dollhouse-profiles-v1'){
     if(!Array.isArray(value)||value.length>10000)throw Error('Invalid profiles');
     const ids=new Set();
     for(const p of value){
       if(!plain(p)||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.color!=='string'||!/^#[0-9a-f]{6}$/i.test(p.color)||typeof p.archived!=='boolean'||typeof p.pronouns!=='string'||typeof p.emoji!=='string'||!Array.isArray(p.roles)||p.roles.some(x=>typeof x!=='string')||!Array.isArray(p.tags)||p.tags.some(x=>typeof x!=='string')||typeof p.notes!=='string')throw Error('Invalid directory profile');
       ids.add(p.id);
     }
   }else if(key==='damaged-dollhouse-journals-v1'){
     if(!Array.isArray(value)||value.length>10000)throw Error('Invalid journal collection');
     const ids=new Set();
     for(const e of value){
       if(!plain(e)||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.title.length>160||typeof e.body!=='string'||e.body.length>100000||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!['personal','shared'].includes(e.scope)||typeof e.authorId!=='string'||!Array.isArray(e.tags)||e.tags.some(x=>typeof x!=='string')||typeof e.createdAt!=='string'||typeof e.updatedAt!=='string')throw Error('Invalid journal entry');
       ids.add(e.id);
     }
   }else if(key==='damaged-dollhouse-checkin-profile-links-v1'){
     if(!plain(value)||Object.entries(value).some(([k,v])=>!k||typeof v!=='string'||!v))throw Error('Invalid profile links');
   }else if(!plain(value))throw Error('Invalid settings or drafts in '+key);
 }
 return {items:s.items,legacy:s.format===LEGACY_FORMAT,format:s.format};
}
window.DollhouseValidateUnifiedBackup=validate;
function downloadBackup(){
 try{
   const data=JSON.stringify(snapshot(),null,2);
   const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='damaged-dollhouse-complete-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
   notice('♡ Complete backup prepared. Check that the file was downloaded and store it somewhere private.');
 }catch(e){notice('⚠ Backup failed: '+e.message)}
}
async function restore(e){
 const file=e.target.files[0];if(!file)return;
 try{
   if(file.size>40*1024*1024)throw Error('Backup file exceeds 40 MB');
   const checked=validate(JSON.parse(await file.text()));
   const items=checked.items;
   if(!confirm('This will REPLACE '+Object.keys(items).length+' categories present in this backup. Categories absent from older backups will be PRESERVED. It will NOT merge existing records within included categories. Have you downloaded a backup of your current data?'))return;
   if(prompt('To replace your current Dollhouse data, type RESTORE:')!=='RESTORE'){notice('Restore canceled; nothing changed.');return}
   const previous={};for(const key of KEYS)previous[key]=localStorage.getItem(key);
   try{
     for(const key of KEYS){if(!Object.prototype.hasOwnProperty.call(items,key))continue;if(items[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,items[key]);}
   }catch(err){
     let rollbackFailed=false;
     for(const key of KEYS){try{if(previous[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[key])}catch(e){rollbackFailed=true}}
     throw Error(rollbackFailed?'Restore failed AND automatic rollback was incomplete. Do not edit data; recover using your backup.':'Restore failed; previous data was restored. '+err.message);
   }
   notice('♡ Restore completed. Reloading the app to update all modules.');
   location.reload();
 }catch(err){notice('⚠ '+err.message)}finally{e.target.value=''}
}
window.addEventListener('DOMContentLoaded',()=>{
 $('exportUnified').addEventListener('click',downloadBackup);
 $('importUnified').addEventListener('click',()=>$('importUnifiedFile').click());
 $('importUnifiedFile').addEventListener('change',restore);
});
})();
