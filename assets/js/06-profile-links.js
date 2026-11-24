/* v1.7D: opt-in links between stable directory IDs and existing check-ins. */
(function(){
'use strict';
const LINK_KEY='damaged-dollhouse-checkin-profile-links-v1';
const PROFILE_KEY='damaged-dollhouse-profiles-v1';
const $=id=>document.getElementById(id);
let links={};let safe=true;
function readProfiles(){try{const v=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(v)?v.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'):[]}catch(e){return []}}
function readLinks(){try{const raw=localStorage.getItem(LINK_KEY);if(raw){const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data)||Object.entries(data).some(([k,v])=>typeof k!=='string'||typeof v!=='string'))throw Error('Invalid links');links=data}}catch(e){safe=false;$('linksMessage').textContent='⚠ Links could not be read. Link editing disabled to protect stored data.';$('linkedProfile').disabled=true}}
function key(){const date=$('entryDate').value;return currentCheckin==='legacy'?'legacy-'+date:currentCheckin==='new'?null:currentCheckin}
function persist(next){if(!safe)return false;try{localStorage.setItem(LINK_KEY,JSON.stringify(next));links=next;return true}catch(e){$('linksMessage').textContent='⚠ Profile links could not be saved';return false}}
function options(){const select=$('linkedProfile'),value=select.value;select.replaceChildren(new Option('No linked profile / manual author',''));for(const p of readProfiles()){if((p.archived||p.showInCharacterSelect===false)&&p.id!==links[key()])continue;const opt=new Option((p.emoji?p.emoji+' ':'')+p.name+(p.archived?' (archived)':p.showInCharacterSelect===false?' (inactive)':''),p.id);select.add(opt)}select.value=[...select.options].some(o=>o.value===value)?value:''}
function refresh(){options();const id=links[key()];if(id){if(![...$('linkedProfile').options].some(o=>o.value===id))$('linkedProfile').add(new Option('Unavailable profile ('+id+')',id));$('linkedProfile').value=id}else $('linkedProfile').value=''}
function downloadFile(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
const previousLoad=loadCheckin;
loadCheckin=function(date,selected){previousLoad(date,selected);refresh()};
const originalExportedRows=exportedRows;
exportedRows=function(){const profileMap=new Map(readProfiles().map(p=>[p.id,p]));return originalExportedRows().map(row=>{const p=profileMap.get(links[row.id]);return p?{...row,author:p.name,profileId:p.id}:row})};
window.addEventListener('DOMContentLoaded',()=>{
 readLinks();refresh();
 $('linkedProfile').addEventListener('change',()=>{const p=readProfiles().find(x=>x.id===$('linkedProfile').value);if(p){$('authorTag').value=p.name;$('authorTag').dispatchEvent(new Event('input',{bubbles:true}))}});
 $('save').addEventListener('click',()=>{if(!safe)return;const id=key();if(!id||!$('saveMessage').textContent.startsWith('♡ Check-in saved'))return;const selected=$('linkedProfile').value;const next={...links};if(selected)next[id]=selected;else delete next[id];if(persist(next))refresh()});
 $('deleteEntry').addEventListener('click',()=>{if(!safe)return;const next={...links};for(const id of Object.keys(next)){if(id.startsWith('legacy-')&&!db[id.slice(7)])delete next[id];else if(!id.startsWith('legacy-')&&!checkins.some(x=>x.id===id))delete next[id]}persist(next);refresh()});
 document.querySelector('[data-tab="daily"]').addEventListener('click',refresh);
 document.querySelector('[data-tab="directory"]').addEventListener('click',()=>{options()});
 $('exportLinks').onclick=()=>downloadFile('damaged-dollhouse-profile-links-'+localDate()+'.json',{format:'damaged-dollhouse-profile-links-v1',exportedAt:new Date().toISOString(),links});
 $('importLinks').onclick=()=>$('importLinksFile').click();
 $('importLinksFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(!safe)throw Error('Current link storage is unreadable');if(file.size>2*1024*1024)throw Error('File too large');const obj=JSON.parse(await file.text());if(obj?.format!=='damaged-dollhouse-profile-links-v1'||!obj.links||typeof obj.links!=='object'||Array.isArray(obj.links)||Object.entries(obj.links).some(([k,v])=>!k||typeof v!=='string'||!v))throw Error('Invalid link backup');if(!confirm('Import profile links? Matching check-in IDs will be overwritten. Back up your current links first.'))return;if(persist({...links,...obj.links})){$('linksMessage').textContent='♡ Profile links imported';refresh()}}catch(err){$('linksMessage').textContent='⚠ '+err.message}finally{e.target.value=''}});
});
})();
