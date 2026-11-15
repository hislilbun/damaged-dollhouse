/* Illustrated dashboard display preference, separate from existing light/dark palettes. */
(function(){'use strict';
const KEY='damaged-dollhouse-dashboard-scene-v1';const scenes=['daydream','haven','nightmare','off'];
function read(){try{const v=localStorage.getItem(KEY);return scenes.includes(v)?v:'daydream'}catch(e){return 'daydream'}}
function apply(v){if(!scenes.includes(v))return;document.documentElement.dataset.scene=v;for(const id of ['dashboardSceneSetting','dashboardSceneQuick']){const el=document.getElementById(id);if(el&&v!=='off')el.value=v;else if(el&&id==='dashboardSceneSetting')el.value=v;}const quick=document.querySelector('.scene-header');if(quick)quick.hidden=false;try{localStorage.setItem(KEY,v)}catch(e){}}
document.addEventListener('DOMContentLoaded',()=>{
 const oldToggle=document.getElementById('themeToggle');
 const section=document.querySelector('.illustration-settings');
 if(oldToggle&&section){
   const holder=document.createElement('div');holder.id='basePaletteControls';
   const label=document.createElement('strong');label.textContent='Base palette';
   holder.append(label,oldToggle);section.appendChild(holder);
   const hint=section.querySelector('p.hint');if(hint)hint.textContent='Choose a dashboard illustration or turn it off to show the original rainbow palette. The Light / Dark control below changes the base interface palette.';
 }
 apply(read());const setting=document.getElementById('dashboardSceneSetting');const quick=document.getElementById('dashboardSceneQuick');setting?.addEventListener('change',e=>apply(e.target.value));quick?.addEventListener('change',e=>apply(e.target.value));});
})();
