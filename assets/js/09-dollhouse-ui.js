/* v1.8A.1 dashboard routing: original module buttons remain as event dispatch targets. */
'use strict';
(function(){
  const oldTab=tab;
  tab=function(name){
    if(name==='dashboard'||name==='looking-glass'){
      document.querySelectorAll('.tab').forEach(node=>node.classList.add('hidden'));
      document.getElementById('dashboard').classList.toggle('hidden',name!=='dashboard');
      document.getElementById('looking-glass').classList.toggle('hidden',name!=='looking-glass');
      document.querySelectorAll('[data-tab]').forEach(node=>node.classList.remove('active'));
    }else{
      document.getElementById('dashboard').classList.add('hidden');
      document.getElementById('looking-glass').classList.add('hidden');
      oldTab(name);
    }
    document.querySelectorAll('.module-breadcrumb').forEach(node=>node.classList.toggle('hidden',name==='dashboard'||node.dataset.owner!==name));
    window.scrollTo(0,0);
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const names={daily:'Pretty Little Problems',history:'Lost Time',journals:'Porcelain Pages',directory:'Doll Directory',insights:'Overview & Stats',parts:'Individual Breakdown',backup:'Bandaged Buttons','echo-chamber':'The Echo Chamber'};
    document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
      const name=button.dataset.open;
      if(name==='looking-glass'||name==='echo-chamber'){tab(name);return}
      const legacy=document.querySelector('.legacy-nav [data-tab="'+name+'"]');
      if(legacy)legacy.click();
    }));
    for(const [id,name] of Object.entries(names)){
      const section=document.getElementById(id);
      if(!section)continue;
      const bar=document.createElement('div');bar.className='module-breadcrumb hidden';bar.dataset.owner=id;
      const home=document.createElement('button');home.type='button';home.textContent='⌂ Dollhouse Home';home.addEventListener('click',()=>tab('dashboard'));bar.append(home);
      if(id==='insights'||id==='parts'){
        const back=document.createElement('button');back.type='button';back.textContent='← The Looking Glass';back.addEventListener('click',()=>tab('looking-glass'));bar.append(back);
      }
      section.before(bar);
    }
    // The Looking Glass hub also needs its own route home.
    const glassHub=document.getElementById('looking-glass');
    if(glassHub){
      const bar=document.createElement('div');
      bar.className='module-breadcrumb hidden';
      bar.dataset.owner='looking-glass';
      const home=document.createElement('button');
      home.type='button';
      home.textContent='⌂ Dollhouse Home';
      home.addEventListener('click',()=>tab('dashboard'));
      bar.append(home);
      glassHub.before(bar);
    }
    // New sessions open on the dashboard; no data is changed.
    tab('dashboard');
  });
})();
