(() => {
  const KEY = 'just-celebrate-private-planner-v1';
  const BACKUP_KEY = 'just-celebrate-saved-plan-v1';
  const SUPPLIERS_KEY = 'just-celebrate-suppliers';
  const SUPPLIERS_BACKUP_KEY = 'just-celebrate-saved-suppliers-v1';
  const vendorRoutes = { venue:'venues', music:'djs-music', photography:'photography-video', catering:'catering', cake:'cakes-treats', decor:'decor-balloons', entertainment:'entertainment', transport:'transport' };

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fresh') === '1') {
      const current = localStorage.getItem(KEY);
      const suppliers = localStorage.getItem(SUPPLIERS_KEY);
      if (current) localStorage.setItem(BACKUP_KEY, current);
      if (suppliers) localStorage.setItem(SUPPLIERS_BACKUP_KEY, suppliers);
      localStorage.removeItem(KEY);
      localStorage.removeItem(SUPPLIERS_KEY);
      localStorage.removeItem('just-celebrate-service-status-v1');
      localStorage.removeItem('just-celebrate-enquiry-draft');
      localStorage.removeItem('just-celebrate-enquiry-batch-v1');
      window.history.replaceState({}, '', '/');
      window.location.reload();
      return;
    }
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      saved.portalTab = 'suppliers';
      saved.checks = {};
      saved.customTasks = [];
      localStorage.setItem(KEY, JSON.stringify(saved));
    }
  } catch {}

  function serviceFromText(text) {
    const value = (text || '').toLowerCase();
    if (value.includes('venue')) return 'venue';
    if (value.includes('dj') || value.includes('music')) return 'music';
    if (value.includes('photo')) return 'photography';
    if (value.includes('cater')) return 'catering';
    if (value.includes('cake') || value.includes('treat')) return 'cake';
    if (value.includes('decor') || value.includes('balloon')) return 'decor';
    if (value.includes('entertain')) return 'entertainment';
    if (value.includes('transport')) return 'transport';
    return '';
  }

  function saveService(service) {
    try {
      const plan = JSON.parse(localStorage.getItem(KEY) || '{}');
      const services = Array.isArray(plan.services) ? plan.services : [];
      if (!services.includes(service)) services.push(service);
      localStorage.setItem(KEY, JSON.stringify({ ...plan, services, step:2, updatedAt:new Date().toISOString() }));
    } catch {}
  }

  function vendorUrl(service) { return `/planner#vendors-${vendorRoutes[service]}`; }

  function connectHomeLogos() {
    document.querySelectorAll('a.brand').forEach(el => {
      el.href = '/?fresh=1';
      el.title = 'Start a new celebration';
    });
  }

  function connectServiceCards() {
    document.querySelectorAll('button').forEach(el => {
      const service = serviceFromText(el.textContent || '');
      if (!service || !vendorRoutes[service]) return;
      const cardText = (el.textContent || '').toLowerCase();
      if (!cardText.includes('venue') && !cardText.includes('music') && !cardText.includes('photo') && !cardText.includes('cater') && !cardText.includes('cake') && !cardText.includes('decor') && !cardText.includes('entertain') && !cardText.includes('transport')) return;
      if (el.closest('dialog')) return;
      el.dataset.plannerVendorService = service;
      el.title = `Choose ${service === 'music' ? 'DJ & music' : service} vendors`;
    });
  }

  function connectVendorButtons() {
    document.querySelectorAll('button,a').forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (!text.includes('add to my portal')) return;
      const card = el.closest('article,section,div');
      const service = serviceFromText(card?.textContent || '');
      if (!service || !vendorRoutes[service]) return;
      el.dataset.vendorService = service;
      el.title = `Choose a ${service} vendor`;
    });
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-planner-vendor-service]');
    if (!target) return;
    const service = target.dataset.plannerVendorService;
    if (!service || !vendorRoutes[service]) return;
    event.preventDefault(); saveService(service); window.location.href = vendorUrl(service);
  }, true);

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-vendor-service]');
    if (!target) return;
    const service = target.dataset.vendorService;
    if (!service || !vendorRoutes[service]) return;
    event.preventDefault(); saveService(service); window.location.href = vendorUrl(service);
  }, true);

  function removeChecklistUI() {
    document.querySelectorAll('button,a,[role="tab"]').forEach(el => { if ((el.textContent || '').trim().toLowerCase().includes('checklist')) el.remove(); });
    document.querySelectorAll('.summary-totals > div').forEach(el => { if ((el.textContent || '').toLowerCase().includes('tasks complete')) el.remove(); });
    document.querySelectorAll('h2,h3,h4,p').forEach(el => { const text=(el.textContent||'').trim().toLowerCase(); if(!text.includes('checklist'))return; const panel=el.closest('.portal-panel,.checklist-panel,.task-panel'); if(panel)panel.remove(); });
  }

  function clarifyServicesHeading() {
    document.querySelectorAll('.panel-heading,h2').forEach(el => { if ((el.textContent || '').trim() === 'What would make it yours?') el.textContent = 'What do you need for your celebration?'; });
  }

  function enhance() { removeChecklistUI(); clarifyServicesHeading(); connectHomeLogos(); connectServiceCards(); connectVendorButtons(); }
  enhance(); new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
})();
