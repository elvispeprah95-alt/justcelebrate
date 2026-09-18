'use strict';
(()=>{
const PLAN='just-celebrate-private-planner-v1',SAVED='just-celebrate-suppliers',DRAFT='just-celebrate-enquiry-draft',BATCH='just-celebrate-enquiry-batch-v1';
const SUPABASE_URL='https://hohddtjiapyjztrskcaz.supabase.co',SUPABASE_KEY='sb_publishable_nKZ3DnE9IDgKLMQFhVh1Jg_KST0Ebhf';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const client=()=>window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY);
const TEST_VENDOR={id:'manual-test-just-celebrate',business_name:'Just Celebrate Test Vendor',email:'elvispeprah95+vendor@gmail.com',town:'London'};
function addPrivateTestVendor(){
  if(new URLSearchParams(location.search).get('test')!=='1')return;
  const plan=read(PLAN,{});
  if(!plan||plan.version!==1||!Array.isArray(plan.services)||!Array.isArray(plan.suppliers))return;
  if(!plan.services.includes('music'))plan.services.push('music');
  if(!plan.suppliers.some(s=>s?.id===TEST_VENDOR.id))plan.suppliers.push({id:TEST_VENDOR.id,category:'music',name:TEST_VENDOR.business_name,website:'',notes:'Private test supplier — safe to use for an enquiry test.',status:'Shortlisted'});
  plan.updatedAt=new Date().toISOString();
  write(PLAN,plan);
  const saved=read(SAVED,[]),withoutTest=(Array.isArray(saved)?saved:[]).filter(s=>s?.id!==TEST_VENDOR.id);
  write(SAVED,[...withoutTest,TEST_VENDOR]);
  location.replace(location.pathname+location.hash);
}
function savedSuppliers(){const plan=read(PLAN,{}),ids=new Set((plan.suppliers||[]).map(x=>x?.id)),items=read(SAVED,[]);return Array.isArray(items)?items.filter(x=>x&&ids.has(x.id)&&x.business_name&&x.email?.trim()):[]}
async function continueVendorLogin(){
  if(localStorage.getItem('just-celebrate-post-auth')!=='messages')return;
  const supabase=client();
  if(!supabase)return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  localStorage.removeItem('just-celebrate-post-auth');
  location.replace('/messages');
}
function setupVendorLogin(){
  const trigger=document.querySelector('.vendor-login-link');
  if(!trigger||trigger.dataset.loginReady)return;
  trigger.dataset.loginReady='1';
  trigger.addEventListener('click',event=>{
    event.preventDefault();
    let dialog=document.querySelector('#jc-vendor-login');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='jc-vendor-login';document.body.appendChild(dialog)}
    dialog.innerHTML=`<form class="jc-enquiry-card"><div class="jc-enquiry-head"><div><p>JUST CELEBRATE</p><h2>Vendor login</h2></div><button type="button" value="cancel" aria-label="Close">×</button></div><p class="jc-enquiry-note">Enter your business email and we’ll send you a secure sign-in link.</p><div class="jc-enquiry-fields"><label>Your business email<input id="jc-vendor-email" name="jc_vendor_email" type="email" required autocomplete="off" placeholder="you@business.com"></label></div><p class="jc-enquiry-note">Use the vendor’s email address, not the customer email used to send the enquiry.</p><p id="jc-vendor-feedback" class="jc-enquiry-feedback" hidden aria-live="polite"></p><div class="jc-enquiry-actions"><button type="button" value="cancel" class="secondary">Cancel</button><button type="submit" id="jc-vendor-submit">Email me a login link</button></div></form>`;
    const feedback=(message,error)=>{const box=dialog.querySelector('#jc-vendor-feedback');box.textContent=message;box.hidden=!message;box.classList.toggle('is-error',Boolean(error))};
    dialog.showModal();
    dialog.querySelectorAll('[value="cancel"]').forEach(button=>button.onclick=()=>dialog.close());
    dialog.querySelector('form').onsubmit=async submitEvent=>{
      submitEvent.preventDefault();
      const supabase=client(),email=dialog.querySelector('#jc-vendor-email').value.trim().toLowerCase(),button=dialog.querySelector('#jc-vendor-submit');
      if(!supabase){feedback('Secure login is temporarily unavailable. Please refresh and try again.',true);return}
      localStorage.setItem('just-celebrate-post-auth','messages');
      button.disabled=true;button.textContent='Sending link…';
      const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin,shouldCreateUser:true,data:{account_type:'vendor'}}});
      if(error){localStorage.removeItem('just-celebrate-post-auth');const reason=String(error.message||'Please try again.');const wait=/rate|too many|security purposes/i.test(reason)?' Please wait a minute before requesting another link.':'';feedback(`We couldn't send your login link: ${reason}${wait}`,true);button.disabled=false;button.textContent='Email me a login link';return}
      feedback('Check your email and open the secure sign-in link.');button.textContent='Link sent ✓';
    };
  });
}
function setFeedback(dialog,message,error){const el=dialog.querySelector('#jc-enquiry-feedback');if(!el)return;el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',Boolean(error))}
function contactPanel(){const overview=document.querySelector('#service-plan-overview');if(!overview||document.querySelector('#jc-contact-suppliers'))return;const plan=read(PLAN,{}),ready=savedSuppliers(),total=Array.isArray(plan.suppliers)?plan.suppliers.length:0;if(!total)return;const panel=document.createElement('section');panel.id='jc-contact-suppliers';panel.className='jc-contact-suppliers';panel.innerHTML=`<div><p class="service-plan-kicker">WHEN YOU’RE READY</p><h3>Ready to contact suppliers?</h3><p>Review the businesses you saved, choose who to contact, then send secure enquiries together.</p>${ready.length?`<span>${ready.length} of ${total} supplier${total===1?'':'s'} available to contact</span>`:`<span>No saved suppliers are accepting enquiries yet</span>`}</div><button type="button" ${ready.length?'':'disabled'}>Review enquiries →</button>`;overview.appendChild(panel);panel.querySelector('button')?.addEventListener('click',openBatch)}
function openBatch(){const plan=read(PLAN,{}),details=plan.details||{},suppliers=savedSuppliers();if(!suppliers.length)return;let dialog=document.querySelector('#jc-enquiry-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='jc-enquiry-dialog';document.body.appendChild(dialog)}const message=`Hi, I'm planning ${details.name||details.occasion||'a celebration'} and would like to check your availability and pricing for my event.`;dialog.innerHTML=`<form class="jc-enquiry-card"><div class="jc-enquiry-head"><div><p>REVIEW ENQUIRIES</p><h2>Contact your suppliers</h2></div><button type="button" value="cancel" aria-label="Close">×</button></div><div class="jc-enquiry-event"><strong>${esc(details.name||details.occasion||'My celebration')}</strong>${details.date?`<span>${esc(details.date)}</span>`:''}${details.location?`<span>${esc(details.location)}</span>`:''}${details.guests?`<span>${esc(details.guests)} guests</span>`:''}</div><div class="jc-enquiry-fields"><label>Your name<input id="jc-enquiry-name" required maxlength="100" autocomplete="name" placeholder="Your name"></label><label>Your email<input id="jc-enquiry-email" required type="email" maxlength="254" autocomplete="email" placeholder="you@example.com"></label><label class="full">Your message<textarea id="jc-enquiry-message" required maxlength="5000" rows="5">${esc(message)}</textarea></label></div><fieldset class="jc-enquiry-suppliers"><legend>Choose suppliers to contact</legend>${suppliers.map((s,i)=>`<label><input type="checkbox" name="supplier" value="${esc(s.id)}" ${i===0?'checked':''}><span><strong>${esc(s.business_name)}</strong>${s.town?`<small>${esc(s.town)}</small>`:''}</span></label>`).join('')}</fieldset><p class="jc-enquiry-note">A secure link is sent to your email first. Your enquiries are only sent after you confirm it.</p><p id="jc-enquiry-feedback" class="jc-enquiry-feedback" hidden aria-live="polite"></p><div class="jc-enquiry-actions"><button type="button" value="cancel" class="secondary">Cancel</button><button type="submit" id="jc-send-enquiry">Send secure link →</button></div></form>`;dialog.showModal();dialog.querySelectorAll('[value="cancel"]').forEach(b=>b.onclick=()=>dialog.close());dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const supabase=client(),customerName=dialog.querySelector('#jc-enquiry-name').value.trim(),customerEmail=dialog.querySelector('#jc-enquiry-email').value.trim().toLowerCase(),message=dialog.querySelector('#jc-enquiry-message').value.trim(),ids=[...dialog.querySelectorAll('input[name="supplier"]:checked')].map(x=>x.value),chosen=suppliers.filter(s=>ids.includes(s.id)),send=dialog.querySelector('#jc-send-enquiry');if(!chosen.length){setFeedback(dialog,'Choose at least one supplier to continue.',true);return}if(!supabase){setFeedback(dialog,'Secure enquiries are temporarily unavailable. Please refresh and try again.',true);return}const batch=chosen.map(v=>({vendorId:v.id,vendorName:v.business_name,vendorEmail:v.email.trim(),customerName,customerEmail,subject:`Enquiry for ${v.business_name}`,eventDate:details.date||'',eventLocation:details.location||'',message}));write(BATCH,batch);localStorage.removeItem(DRAFT);send.disabled=true;send.textContent='Preparing secure link…';const {data:{user}}=await supabase.auth.getUser();if(user?.email?.toLowerCase()===customerEmail){location.assign('/complete-enquiry');return}const {error}=await supabase.auth.signInWithOtp({email:customerEmail,options:{emailRedirectTo:window.location.origin,shouldCreateUser:true,data:{display_name:customerName,account_type:'customer'}}});if(error){setFeedback(dialog,'We could not send the secure link. Please try again in a moment.',true);send.disabled=false;send.textContent='Send secure link →';return}setFeedback(dialog,`Check your email and click the secure link. We’ll then send ${batch.length} enquir${batch.length===1?'y':'ies'} and open your private inbox.`);send.textContent='Link sent ✓'};}
async function continueBatch(){const pending=read(BATCH,null),supabase=client();if(!Array.isArray(pending)||!pending.length||!supabase)return;const {data:{user}}=await supabase.auth.getUser();if(user?.email?.toLowerCase()===String(pending[0].customerEmail||'').toLowerCase())location.replace('/complete-enquiry')}
function guideIndividualButtons(){document.querySelectorAll('.visual-supplier').forEach(row=>{const button=[...row.querySelectorAll('a,button')].find(x=>x.textContent.trim()==='Send enquiry');if(!button||button.dataset.batchReady)return;button.dataset.batchReady='1';button.textContent='Review enquiries';button.removeAttribute('href');button.setAttribute('role','button');button.onclick=e=>{e.preventDefault();document.querySelector('#jc-contact-suppliers')?.scrollIntoView({behavior:'smooth',block:'center'});document.querySelector('#jc-contact-suppliers button')?.focus()}})}
function run(){contactPanel();guideIndividualButtons();setupVendorLogin()}new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('DOMContentLoaded',()=>{addPrivateTestVendor();run();setTimeout(continueBatch,250);setTimeout(continueVendorLogin,300)});
})();
