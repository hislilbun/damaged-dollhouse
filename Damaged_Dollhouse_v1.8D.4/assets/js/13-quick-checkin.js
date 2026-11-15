/* v1.8B.10 — Quick Check-In Foundation. Uses existing field IDs and persistence. */
(function(){
'use strict';
const defaultIds=['quality','anxiety','energy','fatigue','pain','dizzy','spacey','lostTime','sleepQuality','memoryGaps'];
const PREF='bunnie-burrow-preferences-v1';
function validIds(v){return Array.isArray(v)&&v.length>0&&v.length<=all.length&&v.every(id=>typeof id==='string'&&Object.hasOwn(byId,id))&&new Set(v).size===v.length}
function getIds(){try{const v=JSON.parse(localStorage.getItem(PREF)||'{}').quickQuestionIds;return validIds(v)?v.slice():defaultIds.slice()}catch(e){return defaultIds.slice()}}
let ids=getIds();
const $=id=>document.getElementById(id);
let active=false;
function currentRow(){const date=$('entryDate').value;return currentCheckin==='legacy'?db[date]||{}:checkins.find(x=>x.id===currentCheckin&&x.date===date)?.data||{}}
function syncFromNative(){for(const id of ids){const f=byId[id],source=$('f-'+id),dest=$('q-'+id);if(!dest)continue;if(f[2]==='multi'){dest.querySelectorAll('input').forEach(c=>{const original=Array.from(document.querySelectorAll('[data-multi="'+id+'"]')).find(x=>x.value===c.value);c.checked=!!original?.checked})}else if(source)dest.value=source.value}}
function setMode(on){
 active=on;
 if(on&&easyMode){easyMode=false;showEasy()}
 $('quickQuestions').hidden=!on;
 if(!on&&$('quickEditor'))$('quickEditor').hidden=true;
 $('questions').hidden=on;
 const wizard=$('littleWizard');if(wizard)wizard.hidden=on||!easyMode;
 for(const id of ['expandAll','collapseAll','nextMissing'])$(id).hidden=on;
 $('quickToggle').setAttribute('aria-pressed',String(on));$('quickToggle').classList.toggle('quick-active',on);
 $('quickToggle').textContent=on?'⚡ Quick Check-In: On':'⚡ Quick Check-In';
 if(on)syncFromNative();
}
let editorDraft=[];
function openEditor(){editorDraft=ids.slice();$('quickEditor').hidden=false;renderEditor();$('quickEditor').scrollIntoView({block:'nearest'});}
function renderEditor(){
 const root=$('quickEditorList');root.replaceChildren();
 const search=$('quickSearch').value.trim().toLowerCase();
 $('quickEditorCount').textContent=editorDraft.length+' selected';
 const selected=el('div',{class:'quick-editor-selected'});
 for(const id of editorDraft){const f=byId[id];if(search&&!f[1].toLowerCase().includes(search))continue;
 const row=el('div',{class:'quick-editor-row'}),name=el('span',{},f[1]);
 const up=el('button',{type:'button','aria-label':'Move '+f[1]+' up'},'↑'),down=el('button',{type:'button','aria-label':'Move '+f[1]+' down'},'↓'),remove=el('button',{type:'button','aria-label':'Remove '+f[1]},'×');
 up.disabled=editorDraft.indexOf(id)===0;down.disabled=editorDraft.indexOf(id)===editorDraft.length-1;
 up.onclick=()=>move(id,-1);down.onclick=()=>move(id,1);remove.onclick=()=>{editorDraft=editorDraft.filter(x=>x!==id);renderEditor()};
 row.append(name,up,down,remove);selected.append(row)
 }
 root.append(el('h4',{},'Selected questions (in display order)'),selected);
 for(const [section,fields] of sections){const matches=fields.filter(f=>!search||f[1].toLowerCase().includes(search)||section.toLowerCase().includes(search));if(!matches.length)continue;
 const group=el('div',{class:'quick-editor-group'});group.append(el('h4',{},section));
 for(const f of matches){const label=el('label',{class:'quick-editor-choice'}),check=el('input',{type:'checkbox'});check.checked=editorDraft.includes(f[0]);check.onchange=()=>{if(check.checked){editorDraft.push(f[0])}else{editorDraft=editorDraft.filter(x=>x!==f[0])}renderEditor()};label.append(check,document.createTextNode(f[1]));group.append(label)}root.append(group)
 }
}
function move(id,step){const i=editorDraft.indexOf(id),j=i+step;if(j<0||j>=editorDraft.length)return;[editorDraft[i],editorDraft[j]]=[editorDraft[j],editorDraft[i]];renderEditor()}
function saveEditor(){if(!editorDraft.length){$('quickEditorMessage').textContent='Choose at least one question.';return}
 try{const p=JSON.parse(localStorage.getItem(PREF)||'{}');const next=p&&typeof p==='object'&&!Array.isArray(p)?p:{};next.quickQuestionIds=editorDraft.slice();localStorage.setItem(PREF,JSON.stringify(next));ids=editorDraft.slice();make();syncFromNative();$('quickEditor').hidden=true;$('quickEditorMessage').textContent='';}catch(e){$('quickEditorMessage').textContent='Could not save preferences. Check browser storage.'}}
function make(){
 const root=$('quickQuestions');root.replaceChildren();
 root.append(el('h3',{},'⚡ Quick Check-In'),el('p',{class:'hint'},'Just the essentials ♡ Every question is optional. Skipped means not recorded.'));
 const actions=el('div',{class:'quick-actions'});
 const customize=el('button',{type:'button'},'⚙ Customize Questions');customize.onclick=openEditor;actions.append(customize);
 const expand=el('button',{type:'button'},'Open in Full Check-In');expand.onclick=()=>setMode(false);
 actions.append(expand);root.append(actions);
 const grid=el('div',{class:'quick-grid'});
 ids.forEach(id=>{
 const f=byId[id],native=$('f-'+id);if(!f||!native)return;
 const item=el('div',{class:'quick-item'}),label=el('label',{for:'q-'+id},f[1]);
 let input;
 if(f[2]==='yn'||f[2]==='choice'||f[2]==='s10'||f[2]==='s4'||f[2]==='positive10'||f[2]==='positive4'){
 input=el('select',{id:'q-'+id});for(const option of native.options)input.append(el('option',{value:option.value},option.textContent));
 }else if(f[2]==='multi'){input=el('div',{id:'q-'+id,class:'quick-multi'});for(const option of f[3]){const wrap=el('label',{class:'quick-multi-option'});const check=el('input',{type:'checkbox',value:option});check.checked=Array.from(document.querySelectorAll('[data-multi="'+id+'"]')).some(x=>x.value===option&&x.checked);check.onchange=()=>{const original=Array.from(document.querySelectorAll('[data-multi="'+id+'"]')).find(x=>x.value===option);if(original){original.checked=check.checked;original.dispatchEvent(new Event('change',{bubbles:true}))}};wrap.append(check,document.createTextNode(option));input.append(wrap)}}else{input=el('input',{id:'q-'+id,type:f[2]==='hours'?'number':f[2]==='time'?'time':'text'});if(f[2]==='hours'){input.min='0';input.max='24';input.step='0.5'}}
 if(f[2]!=='multi')input.onchange=()=>{native.value=input.value;native.dispatchEvent(new Event('change',{bubbles:true}))};
 item.append(label,input);grid.append(item);
 });root.append(grid);
 root.append(el('p',{class:'hint'},'Answers are saved using the regular Save entry button below. Expand to Full to add more questions to this same check-in.'));
}
window.addEventListener('DOMContentLoaded',()=>{
 make();
 $('quickSearch').oninput=renderEditor;
 $('quickEditorSave').onclick=saveEditor;
 $('quickEditorCancel').onclick=()=>{$('quickEditor').hidden=true;$('quickEditorMessage').textContent=''};
 $('quickEditorReset').onclick=()=>{editorDraft=defaultIds.slice();renderEditor()};
 $('quickToggle').onclick=()=>setMode(!active);
 const oldLoad=loadCheckin;
 loadCheckin=function(date,selected){
   oldLoad(date,selected);
   if(currentCheckin!=='new'){
     const dateValue=$('entryDate').value;
     const row=currentCheckin==='legacy'?db[dateValue]:checkins.find(x=>x.id===currentCheckin&&x.date===dateValue)?.data;
     const mode=row?._checkinMode;
     if(mode==='easy'){setMode(false);easyMode=true;showEasy()}
     else {if(easyMode){easyMode=false;showEasy()}setMode(mode==='quick')}
   }
   if(active)syncFromNative();
 };
 $('entryDate').addEventListener('change',()=>{if(active)syncFromNative()});
 $('easyToggle').addEventListener('click',()=>{if(easyMode&&active)setMode(false)});
 // Mark the saved row without altering the original question schema or backup format.
 const originalSave=$('save').onclick;
 $('save').onclick=function(e){
   const mode=active?'quick':easyMode?'easy':'full';
   originalSave.call(this,e);
   if(currentCheckin==='new')return;
   const date=$('entryDate').value;
   const row=currentCheckin==='legacy'?db[date]:checkins.find(x=>x.id===currentCheckin&&x.date===date)?.data;
   if(!row)return;
   const previous=row._checkinMode;
   row._checkinMode=mode;
   const ok=currentCheckin==='legacy'?persist():saveCheckins();
   if(!ok){if(previous===undefined)delete row._checkinMode;else row._checkinMode=previous;return}
   populateCheckins(date,currentCheckin);
 };
 const originalPopulate=populateCheckins;
 populateCheckins=function(date,selected){originalPopulate(date,selected);for(const option of $('checkinSelect').options){const x=checkins.find(v=>v.id===option.value&&v.date===date);if(x?.data?._checkinMode==='quick')option.textContent+=' · ⚡ Quick';else if(x?.data?._checkinMode==='easy')option.textContent+=' · 🐰 Easy'}};
});
})();
