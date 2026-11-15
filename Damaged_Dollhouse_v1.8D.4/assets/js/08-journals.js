/* v1.8A: journals are deliberately separate from Bunnie Burrow records. */
(function(){
'use strict';
const KEY='damaged-dollhouse-journals-v1';
const PROFILE_KEY='damaged-dollhouse-profiles-v1';
const $=id=>document.getElementById(id);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const dateOK=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'));
let entries=[],editing=null;
// Workspace views are read-only filters. Never infer authorship from the active workspace.
let workspaceFilter='all';
function activeWorkspace(){return window.DollhouseCharacterSession?.getActive()??'shared'}
function refreshWorkspaceFilter(reset=false){
 const select=$('journalWorkspaceFilter');if(!select)return;
 const current=activeWorkspace(),all=profiles(),previous=reset?(current==='shared'?'all':'doll:'+current):workspaceFilter;
 select.replaceChildren(new Option('All Dolls (all entries)','all'));
 if(current!=='shared'){const p=all.find(x=>x.id===current&&!x.archived);if(p)select.add(new Option('Current doll: '+(p.emoji||'♡')+' '+p.name,'doll:'+p.id))}
 select.add(new Option('Shared entries','shared'));select.add(new Option('Unassigned author','unassigned'));
 // Keep an explicit profile view available if the roster changed or the user selected it previously.
 if(previous.startsWith('doll:')&&!Array.from(select.options).some(o=>o.value===previous)){const id=previous.slice(5),p=all.find(x=>x.id===id);if(p)select.add(new Option('Doll: '+p.name+(p.archived?' (archived)':''),previous))}
 workspaceFilter=Array.from(select.options).some(o=>o.value===previous)?previous:'all';select.value=workspaceFilter;
 $('journalWorkspaceHint').textContent='View only · '+(workspaceFilter==='all'?'all journal entries remain accessible':workspaceFilter==='shared'?'entries marked Shared':workspaceFilter==='unassigned'?'entries with no assigned author':'entries explicitly attributed to this doll')+'. This does not change authorship or fronting.';
}
function matchesWorkspace(e){
 if(workspaceFilter==='all')return true;
 if(workspaceFilter==='shared')return e.scope==='shared';
 if(workspaceFilter==='unassigned')return !e.authorId;
 if(workspaceFilter.startsWith('doll:'))return e.authorId===workspaceFilter.slice(5);
 return true;
}
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(x))throw Error('not an array');if(!x.every(e=>plain(e)&&typeof e.id==='string'&&e.id.length>0&&typeof e.title==='string'&&typeof e.body==='string')||new Set(x.map(e=>e.id)).size!==x.length)throw Error('Invalid or duplicate journal records');return x}catch(err){$('journalMessage').textContent='⚠ Could not read saved journals. Your stored data was not changed.';return null}}
function profiles(){try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(p)?p.filter(x=>plain(x)&&typeof x.id==='string'&&typeof x.name==='string'):[]}catch{return []}}
function authorName(id){if(!id)return 'Unassigned';const p=profiles().find(x=>x.id===id);return p?p.name:'Unknown / removed profile'}
function message(t){$('journalMessage').textContent=t}
function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));entries=next;return true}catch(err){message('⚠ Could not save: '+err.message);return false}}
function refreshAuthors(selected=''){
 const el=$('journalAuthor');el.replaceChildren();const base=document.createElement('option');base.value='';base.textContent='Unassigned / unknown';el.append(base);
 for(const p of profiles()){const o=document.createElement('option');o.value=p.id;o.textContent=(p.emoji||'')+' '+p.name+(p.archived?' (archived)':'');el.append(o)}
 if(selected&&!profiles().some(p=>p.id===selected)){const o=document.createElement('option');o.value=selected;o.textContent='Unknown / removed profile';el.append(o)}
 el.value=selected;
}
function close(){editing=null;$('journalEditor').classList.add('hidden');$('journalForm').reset();$('journalDelete').classList.add('hidden')}
function open(entry){editing=entry?entry.id:null;$('journalEditor').classList.remove('hidden');$('journalEditorTitle').textContent=entry?'Edit journal entry':'New journal entry';$('journalTitle').value=entry?.title||'';$('journalDate').value=entry?.date||new Date().toLocaleDateString('en-CA');$('journalScope').value=entry?.scope||'personal';$('journalTags').value=(entry?.tags||[]).join(', ');$('journalBody').value=entry?.body||'';refreshAuthors(entry?.authorId||'');$('journalDelete').classList.toggle('hidden',!entry);$('journalTitle').focus()}
function render(){
 const list=$('journalList');list.replaceChildren();const q=$('journalSearch').value.trim().toLocaleLowerCase(),scope=$('journalFilter').value;
 const filtered=entries.filter(e=>matchesWorkspace(e)&&(scope==='all'||e.scope===scope)&&(!q||[e.title,e.body,...(e.tags||[])].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.updatedAt||'').localeCompare(a.updatedAt||''));
 if(!filtered.length){const p=document.createElement('p');p.className='muted';p.textContent='No journal entries match this view yet.';list.append(p);return}
 for(const e of filtered){const box=document.createElement('div');box.className='field';box.style.marginBottom='10px';const h=document.createElement('h3');h.textContent=e.title;const info=document.createElement('p');info.className='hint';info.textContent=[e.date,e.scope==='shared'?'Shared':'Personal',authorName(e.authorId),...(e.tags||[])].filter(Boolean).join(' · ');const preview=document.createElement('p');preview.style.whiteSpace='pre-wrap';preview.textContent=e.body.length>220?e.body.slice(0,220)+'…':e.body;const b=document.createElement('button');b.type='button';b.textContent='View / edit';b.addEventListener('click',()=>open(e));box.append(h,info,preview,b);list.append(box)}
}
function init(){const loaded=read();if(loaded===null)return;entries=loaded;
 refreshWorkspaceFilter(true);
 $('journalWorkspaceFilter').addEventListener('change',e=>{workspaceFilter=e.target.value;refreshWorkspaceFilter();render()});
 window.addEventListener('dollhouse:workspace-changed',()=>{refreshWorkspaceFilter(true);render()});
 window.addEventListener('dollhouse:directory-updated',()=>{refreshWorkspaceFilter();render()});
 window.addEventListener('storage',e=>{if(e.key===PROFILE_KEY){refreshWorkspaceFilter();render()}});
 $('journalNew').addEventListener('click',()=>open(null));$('journalCancel').addEventListener('click',close);$('journalSearch').addEventListener('input',render);$('journalFilter').addEventListener('change',render);
 document.querySelector('[data-tab="journals"]').addEventListener('click',()=>{render();if(!$('journalEditor').classList.contains('hidden'))refreshAuthors($('journalAuthor').value)});
 $('journalForm').addEventListener('submit',ev=>{ev.preventDefault();const title=$('journalTitle').value.trim(),date=$('journalDate').value;if(!title||!dateOK(date)){message('Enter a title and valid date.');return}
 const existing=entries.find(e=>e.id===editing),now=new Date().toISOString();const entry={...(existing||{}),id:existing?.id||('journal-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))),title,date,authorId:$('journalAuthor').value,scope:$('journalScope').value,tags:[...new Set($('journalTags').value.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,40),body:$('journalBody').value,createdAt:existing?.createdAt||now,updatedAt:now};const next=existing?entries.map(e=>e.id===editing?entry:e):[...entries,entry];if(persist(next)){close();render();message('♡ Journal entry saved.')}});
 $('journalDelete').addEventListener('click',()=>{if(!editing)return;if(!confirm('Permanently delete this journal entry? This cannot be undone unless you have a backup.'))return;if(persist(entries.filter(e=>e.id!==editing))){close();render();message('Journal entry deleted.')}});
 render();
}
window.addEventListener('DOMContentLoaded',init);
})();
