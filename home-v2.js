(function(){
  const tabs=[...document.querySelectorAll('.tab')];
  const panes={drivers:document.getElementById('driversPane'),privacy:document.getElementById('privacyPane'),faq:document.getElementById('faqPane')};
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    tabs.forEach(t=>t.classList.remove('active'));
    Object.values(panes).forEach(p=>p&&p.classList.remove('active'));
    tab.classList.add('active');
    const pane=panes[tab.dataset.tab];
    if(pane) pane.classList.add('active');
  }));
})();