// AutoRateFinder public comparison preview.
// IMPORTANT: Keep private API keys, insurer credentials and personal customer data off GitHub Pages.
// Live quote partners should be connected through a secure server-side integration.
(function(){
  const PARTNER_URL = '';
  const modal = document.getElementById('quoteModal');
  const panels = [...document.querySelectorAll('.step-panel')];
  const progress = document.getElementById('progressBar');
  const state = { zip:'', age:'', vehicleYear:'', vehicleMake:'', vehicleModel:'', record:'', coverage:'', profile:'' };
  let step = 1;

  function showStep(target){
    step = target;
    panels.forEach(p=>p.classList.toggle('active',String(p.dataset.step)===String(target)));
    if(target === 'result') progress.style.width = '100%';
    else progress.style.width = `${Math.min(100,Number(target)*20)}%`;
  }

  function openModal(opts={}){
    if(opts.zip) state.zip = opts.zip;
    if(opts.goal) state.coverage = opts.goal;
    if(opts.profile) state.profile = opts.profile;
    const z = document.getElementById('modalZip');
    z.value = state.zip || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    showStep(1);
    setTimeout(()=>z.focus(),80);
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  function validZip(zip){ return /^\d{5}$/.test(zip); }
  function selected(field){ return document.querySelector(`.choice-grid[data-field="${field}"] .selected`); }

  document.querySelectorAll('.js-start').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    openModal({goal:btn.dataset.goal||'',profile:btn.dataset.profile||''});
  }));

  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeModal));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && modal.classList.contains('open')) closeModal(); });

  const zipInput = document.getElementById('zipInput');
  document.getElementById('zipStart').addEventListener('click',()=>{
    const zip = zipInput.value.trim();
    if(!validZip(zip)) { zipInput.focus(); zipInput.setCustomValidity('Enter a valid 5-digit ZIP code.'); zipInput.reportValidity(); return; }
    zipInput.setCustomValidity(''); openModal({zip});
  });
  zipInput.addEventListener('input',()=>zipInput.setCustomValidity(''));
  zipInput.addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('zipStart').click(); });

  document.querySelectorAll('.quick-goals button').forEach(btn=>btn.addEventListener('click',()=>{
    openModal({goal:btn.dataset.goal||''});
  }));

  document.querySelectorAll('.choice-grid button').forEach(btn=>btn.addEventListener('click',()=>{
    const group = btn.closest('.choice-grid');
    group.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
  }));

  document.querySelectorAll('.next-step').forEach(btn=>btn.addEventListener('click',()=>{
    if(step===1){
      const zip = document.getElementById('modalZip').value.trim();
      if(!validZip(zip)){ document.getElementById('modalZip').focus(); return; }
      state.zip=zip;
    }
    if(step===2){ const s=selected('age'); if(!s) return; state.age=s.textContent.trim(); }
    if(step===3){
      state.vehicleYear=document.getElementById('vehicleYear').value.trim();
      state.vehicleMake=document.getElementById('vehicleMake').value.trim();
      state.vehicleModel=document.getElementById('vehicleModel').value.trim();
      if(!/^\d{4}$/.test(state.vehicleYear) || !state.vehicleMake || !state.vehicleModel) return;
    }
    if(step===4){ const s=selected('record'); if(!s) return; state.record=s.textContent.trim(); }
    showStep(Math.min(5,step+1));
    if(step===5 && state.coverage){
      const match=[...document.querySelectorAll('.choice-grid[data-field="coverage"] button')].find(b=>b.dataset.value===state.coverage);
      if(match){ match.click(); }
    }
  }));

  document.getElementById('finishQuote').addEventListener('click',()=>{
    const s=selected('coverage');
    if(!s) return;
    state.coverage=s.dataset.value || s.textContent.trim();
    const labels={minimum:'Lowest legal coverage',value:'Best value',full:'Full coverage'};
    document.getElementById('rZip').textContent=state.zip||'—';
    document.getElementById('rCoverage').textContent=labels[state.coverage]||state.coverage||'—';
    document.getElementById('rRecord').textContent=state.record||'—';
    const p=document.getElementById('partnerBtn');
    if(PARTNER_URL){ p.textContent='View licensed partner quotes →'; p.disabled=false; }
    else { p.textContent='Live quotes opening soon'; p.disabled=true; }
    showStep('result');
  });

  document.getElementById('partnerBtn').addEventListener('click',()=>{
    if(PARTNER_URL) window.location.href=PARTNER_URL;
  });
})();