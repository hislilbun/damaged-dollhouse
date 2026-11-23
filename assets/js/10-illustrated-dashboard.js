/* Illustrated dashboard display preference, separate from existing light/dark palettes. */
(function(){'use strict';
const KEY='damaged-dollhouse-dashboard-scene-v1';const scenes=['daydream','haven','nightmare','off'];
function read(){try{const v=localStorage.getItem(KEY);return scenes.includes(v)?v:'daydream'}catch(e){return 'daydream'}}
function apply(v){if(!scenes.includes(v))return;document.documentElement.dataset.scene=v;for(const id of ['dashboardSceneSetting','dashboardSceneQuick']){const el=document.getElementById(id);if(el&&v!=='off')el.value=v;else if(el&&id==='dashboardSceneSetting')el.value=v;}const quick=document.querySelector('.scene-header');if(quick)quick.hidden=false;try{localStorage.setItem(KEY,v)}catch(e){}}
document.addEventListener('DOMContentLoaded',()=>{
 // Keep the one existing Light/Dark control in the header.
 // Earlier builds moved it into Settings on DOMContentLoaded, hiding it from the header.
 const toggle=document.getElementById('themeToggle');
 const headerControls=document.querySelector('header .header-controls');
 if(toggle&&headerControls&&toggle.parentElement!==headerControls)headerControls.appendChild(toggle);
 const section=document.querySelector('.illustration-settings');
 if(section){
   const hint=section.querySelector('p.hint');
   if(hint)hint.textContent='Choose a dashboard illustration or turn it off to show the original rainbow palette. Use the Light / Dark button beneath the scene selector in the header to change the base interface palette.';
 }
 apply(read());const setting=document.getElementById('dashboardSceneSetting');const quick=document.getElementById('dashboardSceneQuick');setting?.addEventListener('change',e=>apply(e.target.value));quick?.addEventListener('change',e=>apply(e.target.value));});
})();
