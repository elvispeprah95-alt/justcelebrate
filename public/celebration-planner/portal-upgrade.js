'use strict';
(() => {
  const PLAN_KEY='just-celebrate-private-planner-v1';
  const STATUS_KEY='just-celebrate-service-status-v1';
  const categories={
    venue:{name:'Venue',find:'Find venues',hash:'vendors-venues'},
    music:{name:'DJ & music',find:'Find DJs',hash:'vendors-djs-music'},
    photography:{name:'Photography',find:'Find photographers',hash:'vendors-photography-video'},
    catering:{name:'Catering',find:'Find caterers',hash:'vendors-catering'},
    cake:{name:'Cake & treats',find:'Find cake suppliers',hash:'vendors-cakes-treats'},
    decor:{name:'Decor & balloons',find:'Find decorators',hash:'vendors-decor-balloons'},
    entertainment:{name:'Entertainment',find:'Find entertainment',hash:'vendors-entertainment'},
    transport:{name:'Transport',find:'Find transport',hash:'vendors-transport'}
  };
  const statusOrder=['Not started','Vendors saved','Enquiry sent','Replied','Booked'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readPlan=()=>{try{return JSON.parse(localStorage.getItem(PLAN_KEY)||'null')}catch{return null}};
  const readStatuses=()=>{try{return JSON.parse(localStorage.getItem(STATUS_KEY)||'{}')}catch{return {}}};
  const writeStatuses=v=>{try{localStorage.setItem(STATUS_KEY,JSON.stringify(v))}catch{}};
  function inferredStatus(id,plan){
    const suppliers=(plan.suppliers||[]).filter(s=>s.category===id);
    if(!suppliers.length)return 'Not started';
    if(suppliers.some(s=>s.status==='Booked'))return 'Booked';
    if(suppliers.some(s=>s.status==='Contacted'))return 'Enquiry sent';
    return 'Vendors saved';
  }
  function upgradePortal(){
    const workspace=document.querySelector('#workspace');
    const portal=document.querySelector('#portal-content');
    if(!workspace||!portal||document.querySelector('#service-plan-overview'))return;
    const plan=readPlan();
    if(!plan||plan.step!==3||!Array.isArray(plan.services)||!plan.services.length)return;
    const saved=readStatuses();
    const cards=plan.services.filter(id=>categories[id]).map(id=>{
      const c=categories[id];
      const inferred=inferredStatus(id,plan);
      const status=statusOrder.includes(saved[id])?saved[id]:inferred;
      const supplierCount=(plan.suppliers||[]).filter(s=>s.category===id).length;
      return `<article class="service-plan-card ${status==='Booked'?'is-booked':''}"><div class="service-plan-copy"><div class="service-plan-heading"><h3>${esc(c.name)}</h3><span class="service-plan-status">${esc(status)}${status==='Booked'?' ✓':''}</span></div><p>${supplierCount?supplierCount+' vendor'+(supplierCount===1?'':'s')+' saved':'Ready when you are'}</p></div><div class="service-plan-actions"><select data-plan-status="${esc(id)}" aria-label="Planning status for ${esc(c.name)}">${statusOrder.map(s=>`<option ${s===status?'selected':''}>${esc(s)}</option>`).join('')}</select><a class="service-find-button" href="/vendors#${c.hash}">${esc(c.find)} <span aria-hidden="true">→</span></a></div></article>`;
    }).join('');
    const finished=plan.services.filter(id=>{const s=saved[id]||inferredStatus(id,plan);return s==='Booked'}).length;
    const overview=document.createElement('section');
    overview.id='service-plan-overview';
    overview.className='service-plan-overview';
    overview.innerHTML=`<div class="service-plan-intro"><div><p class="service-plan-kicker">YOUR CELEBRATION PLAN</p><h3>${finished} of ${plan.services.length} services sorted</h3><p>Work through each part at your own pace. Your next step is always right here.</p></div><div class="service-plan-progress" aria-label="${finished} of ${plan.services.length} services booked"><span style="width:${plan.services.length?finished/plan.services.length*100:0}%"></span></div></div><div class="service-plan-list">${cards}</div>`;
    portal.prepend(overview);
    overview.querySelectorAll('[data-plan-status]').forEach(select=>select.addEventListener('change',()=>{const next=readStatuses();next[select.dataset.planStatus]=select.value;writeStatuses(next);overview.remove();upgradePortal();}));
  }
  function addStartNew(){
    const nav=document.querySelector('.planner-header-actions');
    if(!nav||document.querySelector('.start-new-celebration'))return;
    const link=document.createElement('a');
    link.className='start-new-celebration';
    link.href='/celebration-planner/index.html?fresh=1';
    link.textContent='+ Start a new celebration';
    link.addEventListener('click',e=>{if(!confirm('Start a new celebration? Your current plan will be kept as a backup in this browser.'))e.preventDefault();});
    nav.insertBefore(link,nav.firstChild);
  }
  function run(){addStartNew();upgradePortal();}
  const observer=new MutationObserver(()=>requestAnimationFrame(run));
  window.addEventListener('DOMContentLoaded',()=>{run();const workspace=document.querySelector('#workspace');if(workspace)observer.observe(workspace,{childList:true,subtree:true});});
  window.addEventListener('storage',run);
})();
