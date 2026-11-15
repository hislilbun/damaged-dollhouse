/* Damaged Dollhouse v1.8D.2 — Retro Character Select UI. No author/fronting side effects. */
(function(){
'use strict';
const DIRECTORY_KEY='damaged-dollhouse-profiles-v1';
const MODE_KEY='damaged-dollhouse-character-launch-v1';
const REMEMBER_KEY='damaged-dollhouse-remembered-workspace-v1';
const SHARED='shared';
let active=null, pending=SHARED, menuOpen=false, initial=true, lastFocus=null;
const $=id=>document.getElementById(id);
const validId=id=>typeof id==='string'&&id.length>0;
function roster(){
 try{
  const raw=localStorage.getItem(DIRECTORY_KEY);
  if(raw===null)return {profiles:[],safe:true};
  const value=JSON.parse(raw);
  if(!Array.isArray(value)||value.some(p=>!p||typeof p!=='object'||!validId(p.id)||typeof p.name!=='string'||typeof p.archived!=='boolean')||new Set(value.map(p=>p.id)).size!==value.length)throw Error('invalid directory');
  return {profiles:value.filter(p=>!p.archived),safe:true};
 }catch(e){return {profiles:[],safe:false}}
}
function validWorkspace(id,r=roster()){
 return id===SHARED||(r.safe&&validId(id)&&r.profiles.some(p=>p.id===id));
}
function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
function write(key,value){try{localStorage.setItem(key,value);return true}catch(e){return false}}
function mode(){return read(MODE_KEY)==='remember'?'remember':'ask'}
function label(id){if(id===SHARED)return 'Shared';const p=roster().profiles.find(x=>x.id===id);return p?(p.emoji?p.emoji+' ':'')+p.name:'Unavailable character'}
function announce(){
 const el=$('characterSessionStatus');if(el){el.textContent='Workspace: '+(active===null?'Choose a character':label(active))+' ♡';el.setAttribute('aria-label','Switch Dollhouse workspace. Current: '+(active===null?'not selected':label(active)));}
 window.dispatchEvent(new CustomEvent('dollhouse:workspace-changed',{detail:{workspaceId:active}}));
}
function show(reason){
 const modal=$('characterSessionGate');if(!modal)return;
 if(!menuOpen)lastFocus=document.activeElement;
 menuOpen=true;pending=validWorkspace(active)?active:SHARED;
 const appRoot=document.querySelector('.wrap');if(appRoot)appRoot.inert=true;
 modal.hidden=false;modal.classList.remove('hidden');
 $('characterSessionReason').textContent=reason||'PLEASE SELECT YOUR DOLL';
 render();const focusTarget=$('characterSessionChoices').querySelector('[aria-pressed="true"]')||$('characterSessionShared');focusTarget.focus();
}
function render(){
 const r=roster(), list=$('characterSessionChoices');list.replaceChildren();
 const warning=$('characterSessionWarning');warning.textContent=r.safe?'':'⚠ Doll Directory could not be read. Existing profiles are not being changed. Restore your directory data before selecting a doll.';
 if(!r.profiles.length){const msg=document.createElement('p');msg.className='character-session-empty';msg.textContent='No active dolls yet. Enter as Shared, then create or restore profiles in Doll Directory.';list.append(msg)}
 for(const p of r.profiles){
  const b=document.createElement('button');b.type='button';b.className='character-session-choice character-session-doll';
  const avatar=document.createElement('span');avatar.className='character-session-mini-avatar';avatar.textContent=p.emoji||'♡';avatar.setAttribute('aria-hidden','true');
  const name=document.createElement('span');name.className='character-session-mini-name';name.textContent=p.name;b.append(avatar,name);
  b.style.setProperty('--choice-color',/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#c1adf0');b.setAttribute('aria-pressed',String(pending===p.id));
  b.setAttribute('aria-label','Preview '+p.name+(p.pronouns?', '+p.pronouns:''));
  b.addEventListener('click',()=>{pending=p.id;render();const selected=[...list.querySelectorAll('button')].find(x=>x.getAttribute('data-workspace-id')===p.id);if(selected)selected.focus()});
  b.setAttribute('data-workspace-id',p.id);list.append(b);
 }
 const shared=$('characterSessionShared');shared.setAttribute('aria-pressed',String(pending===SHARED));
 const selected=r.profiles.find(p=>p.id===pending);
 const portrait=$('characterSessionPortrait');portrait.textContent=selected?.emoji||'♡';portrait.style.setProperty('--portrait-color',selected&&/^#[0-9a-f]{6}$/i.test(selected.color)?selected.color:'#c1adf0');
 $('characterSessionPreviewName').textContent=selected?.name||'Shared';
 $('characterSessionPreviewPronouns').textContent=selected?.pronouns||'';
 $('characterSessionEnter').disabled=!validWorkspace(pending,r);
 $('characterSessionCancel').hidden=initial;
}
function hide(){menuOpen=false;const appRoot=document.querySelector('.wrap');if(appRoot)appRoot.inert=false;const modal=$('characterSessionGate');modal.hidden=true;modal.classList.add('hidden');if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
function commit(){
 const r=roster();if(!validWorkspace(pending,r)){pending=SHARED;render();return}
 // A workspace is only navigation context. No form, draft, journal, or check-in values are touched.
 active=pending;initial=false;
 if(mode()==='remember')write(REMEMBER_KEY,active);
 hide();announce();
}
function cancel(){if(initial)return;hide()}
function reconcile(){
 const r=roster();
 if(active!==null&&!validWorkspace(active,r)){
  // Never silently replace an archived/missing character with another character.
  active=null;announce();show('PREVIOUS CHARACTER UNAVAILABLE · PLEASE SELECT A DOLL');return;
 }
 if(menuOpen){if(!validWorkspace(pending,r))pending=SHARED;render()}
}
function setMode(next){
 if(!['ask','remember'].includes(next))return false;
 if(!write(MODE_KEY,next))return false;
 if(next==='remember'&&active!==null)write(REMEMBER_KEY,active);
 $('characterSessionMode').value=mode();return true;
}
window.DollhouseCharacterSession=Object.freeze({
 getActive:()=>active,
 getMode:mode,
 getRoster:()=>roster().profiles.map(p=>({id:p.id,name:p.name,pronouns:p.pronouns,emoji:p.emoji,color:p.color})),
 isValid:validWorkspace,
 open:()=>show(),
 setMode,
 reconcile
});
window.addEventListener('DOMContentLoaded',()=>{
 $('characterSessionShared').addEventListener('click',()=>{pending=SHARED;render();$('characterSessionShared').focus()});
 $('characterSessionEnter').addEventListener('click',commit);
 $('characterSessionCancel').addEventListener('click',cancel);
 $('characterSessionMode').value=mode();
 $('characterSessionStatus').addEventListener('click',()=>{if(!menuOpen&&active!==null)show('SELECT A CHARACTER · CANCEL TO KEEP YOUR CURRENT DOLL');});
 $('characterSessionMode').addEventListener('change',e=>{const status=$('characterSessionSettingsMessage');if(!setMode(e.target.value)){e.target.value=mode();status.textContent='⚠ Could not save launch preference on this device.';}else status.textContent=e.target.value==='remember'?'Last selected workspace will be used on your next launch. Use the header workspace button to switch anytime.':'Character Select will appear on your next launch.';});
 $('characterSessionGate').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!initial){e.preventDefault();cancel()}else e.preventDefault()}
  if(e.key==='Tab'){
   const focusable=[...$('characterSessionGate').querySelectorAll('button:not([hidden]):not(:disabled),select:not([disabled]),[tabindex="0"]')].filter(x=>x.getClientRects().length);
   const i=focusable.indexOf(document.activeElement);
   if(e.shiftKey&&i===0){e.preventDefault();focusable[focusable.length-1].focus()}
   else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus()}
  }
 });
 window.addEventListener('dollhouse:directory-updated',reconcile);
 window.addEventListener('storage',e=>{if(e.key===DIRECTORY_KEY)reconcile()});
 const remembered=read(REMEMBER_KEY);
 if(mode()==='remember'&&remembered!==null&&validWorkspace(remembered)){
  active=remembered;initial=false;announce();
 }else show(remembered!==null&&mode()==='remember'?'REMEMBERED CHARACTER UNAVAILABLE · PLEASE SELECT A DOLL':'PLEASE SELECT YOUR DOLL');
});
})();
