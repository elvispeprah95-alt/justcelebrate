(() => {
  const KEY = 'just-celebrate-private-planner-v1';

  // Keep celebration and supplier data intact, but retire checklist state.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      saved.portalTab = 'suppliers';
      saved.checks = {};
      saved.customTasks = [];
      localStorage.setItem(KEY, JSON.stringify(saved));
    }
  } catch {}

  function removeChecklistUI() {
    document.querySelectorAll('button, a, [role="tab"]').forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text.includes('checklist')) el.remove();
    });

    document.querySelectorAll('.summary-totals > div').forEach((el) => {
      if ((el.textContent || '').toLowerCase().includes('tasks complete')) el.remove();
    });

    document.querySelectorAll('h2, h3, h4, p').forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (!text.includes('checklist')) return;
      const panel = el.closest('.portal-panel, .checklist-panel, .task-panel');
      if (panel) panel.remove();
    });
  }

  removeChecklistUI();
  new MutationObserver(removeChecklistUI).observe(document.body, { childList: true, subtree: true });
})();
