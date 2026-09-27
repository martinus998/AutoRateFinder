(() => {
  const endpoint='https://bkyuyqicybqqifenhhux.supabase.co/functions/v1/live-analytics/collect';
  let owner=false;
  try{owner=localStorage.getItem('autoratefinder_owner_device')==='1';}catch{}
  if(owner) return;
  if(!crypto?.randomUUID) return;
  const getId=(storage,key)=>{
    try{
      let v=storage.getItem(key);
      if(!v){v=crypto.randomUUID();storage.setItem(key,v);}
      return v;
    }catch{return crypto.randomUUID();}
  };
  const visitorId=getId(localStorage,'arf_live_visitor_v1');
  const sessionId=getId(sessionStorage,'arf_live_session_v1');
  let sentView=false;
  let lastActivity=Date.now();
  let lastPing=0;
  function sourcePayload(){
    let referrer_host='';
    try{
      if(document.referrer){
        const u=new URL(document.referrer);
        if(u.hostname&&u.hostname!==location.hostname) referrer_host=u.hostname.toLowerCase();
      }
    }catch{}
    const qs=new URLSearchParams(location.search);
    return {
      referrer_host,
      utm_source:(qs.get('utm_source')||'').slice(0,120),
      utm_medium:(qs.get('utm_medium')||'').slice(0,120),
      utm_campaign:(qs.get('utm_campaign')||'').slice(0,160)
    };
  }
  async function ping(pageview=false){
    if(document.visibilityState==='hidden'&&!pageview) return;
    if(!pageview&&Date.now()-lastActivity>60000) return;
    lastPing=Date.now();
    try{
      await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          site:'autoratefinder',
          visitor_id:visitorId,
          session_id:sessionId,
          path:location.pathname,
          pageview,
          active_at:new Date(lastActivity).toISOString(),
          ...sourcePayload()
        })
      });
    }catch{}
  }

  function funnel(event){
    try{
      fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          site:'autoratefinder',
          visitor_id:visitorId,
          session_id:sessionId,
          path:location.pathname,
          event
        }),
        keepalive:true
      }).catch(()=>{});
    }catch{}
  }
  window.AutoRateFunnel={track:funnel};
  document.addEventListener('focusin',e=>{
    if(e.target && e.target.closest && e.target.closest('#reviewForm')) funnel('tool_start');
  },{once:true});
  document.addEventListener('click',e=>{
    if(e.target && e.target.closest && e.target.closest('#reviewPay')) funnel('checkout_start');
  },true);
  if(new URLSearchParams(location.search).has('session_id')) funnel('checkout_return');


  const seoPaidPages = new Set([
    '/car-insurance-quotes.html',
    '/compare-car-insurance.html',
    '/car-insurance-deductible-guide.html',
    '/car-insurance-rates-by-zip-code.html',
    '/cheap-car-insurance.html',
    '/full-coverage-car-insurance.html',
    '/car-insurance-discounts.html',
    '/why-did-my-car-insurance-go-up.html',
    '/electric-car-insurance-cost.html',
    '/car-insurance-telematics-app.html',
    '/car-insurance-quote-review.html'
  ]);
  if (seoPaidPages.has(location.pathname) && matchMedia('(max-width: 760px)').matches) {
    const bar = document.createElement('div');
    bar.id = 'arfMobilePaidCta';
    bar.setAttribute('role','region');
    bar.setAttribute('aria-label','Quote review');
    bar.innerHTML = '<span><b>Already have a quote?</b><small>Full review · one-time $2.99</small></span><a href="/?utm_source=mobile_seo_cta&utm_medium=internal&utm_campaign=paid_quote_review#reviewForm">Review it →</a>';
    Object.assign(bar.style,{
      position:'fixed',left:'10px',right:'10px',bottom:'10px',zIndex:'9998',
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',
      padding:'10px 11px',border:'1px solid rgba(84,232,183,.55)',borderRadius:'14px',
      background:'rgba(4,24,45,.96)',boxShadow:'0 14px 36px rgba(0,0,0,.42)',
      backdropFilter:'blur(10px)',fontFamily:'inherit'
    });
    const span=bar.querySelector('span');
    if(span) Object.assign(span.style,{display:'grid',gap:'1px',minWidth:'0'});
    const b=bar.querySelector('b');
    if(b) Object.assign(b.style,{fontSize:'12px',color:'#f7fbff'});
    const small=bar.querySelector('small');
    if(small) Object.assign(small.style,{fontSize:'9px',color:'#9fc0d6'});
    const a=bar.querySelector('a');
    if(a) Object.assign(a.style,{
      flex:'0 0 auto',padding:'9px 11px',borderRadius:'10px',background:'#ff9b3d',
      color:'#102033',textDecoration:'none',fontSize:'11px',fontWeight:'900'
    });
    document.body.appendChild(bar);
    funnel('pricing_view');
    a?.addEventListener('click',()=>funnel('plan_select'),{once:true});
  }

  function markActive(){lastActivity=Date.now();if(document.visibilityState==='visible'&&Date.now()-lastPing>25000)void ping(false);}
  function first(){if(!sentView){sentView=true;lastActivity=Date.now();void ping(true);}}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',first,{once:true}); else first();
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,markActive,{passive:true}));
  setInterval(()=>void ping(false),30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lastActivity=Date.now();void ping(false);}});
})();

// Independent presentation module: no changes to the quote or payment flow.
(() => {
  if (document.querySelector('script[data-fast-checkout-labels]')) return;
  const wallets = document.createElement('script');
  wallets.src = '/fast-checkout-labels.js?v=20260925-wallets1';
  wallets.dataset.fastCheckoutLabels = '1';
  document.head.append(wallets);
})();
