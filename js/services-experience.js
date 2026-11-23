(() => {
 const page=document.querySelector('.services-experience');
 if(!page) return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function select(buttons,selected){buttons.forEach(button=>button.setAttribute('aria-pressed',String(button===selected)));}
 const roof=page.querySelector('#assessment');
 const roofButtons=[...page.querySelectorAll('[data-roof-view]')];
 const roofCopy={space:'Explore the usable area. A site visit establishes what is practical.',shade:'Nearby trees and buildings can affect generation. Shade needs to be assessed at your property.',orientation:'Roof direction and tilt influence the layout. The final design follows the actual site conditions.'};
 roofButtons.forEach(button=>button.addEventListener('click',()=>{select(roofButtons,button);roof.dataset.roofView=button.dataset.roofView;page.querySelector('#roof-view-description').textContent=roofCopy[button.dataset.roofView];}));
 const comparison=page.querySelector('.svc-compare');
 const compare=page.querySelector('#planning-compare');
 compare.addEventListener('input',()=>{comparison.style.setProperty('--compare',compare.value+'%');compare.setAttribute('aria-valuetext',`${compare.value}% before view, ${100-Number(compare.value)}% after view`);} );
 const planButtons=[...page.querySelectorAll('[data-plan-view]')];
 const planCopy={layout:['Room for the right layout.','Panel position, access and available roof space shape the design.'],components:['Each component, considered together.','The panel array, inverter, mounting and optional storage work as one system.'],connections:['A clear route for power.','Cable routing, isolation and electrical protection are part of system planning.']};
 planButtons.forEach(button=>button.addEventListener('click',()=>{select(planButtons,button);const [title,copy]=planCopy[button.dataset.planView];page.querySelector('[data-plan-title]').textContent=title;page.querySelector('[data-plan-copy]').textContent=copy;comparison.dataset.planView=button.dataset.planView;comparison.style.setProperty('--plan-grid-opacity',button.dataset.planView==='connections'?'.8':'.35');}));
 const install=page.querySelector('#installation');
 const energy=page.querySelector('#storage');
 const energyButtons=[...page.querySelectorAll('[data-energy]')];
 energyButtons.forEach(button=>button.addEventListener('click',()=>{
  select(energyButtons,button);const night=button.dataset.energy==='night';energy.dataset.energyMode=button.dataset.energy;
  page.querySelector('.svc-energy-scene__day').setAttribute('aria-hidden',String(night));page.querySelector('.svc-energy-scene__night').setAttribute('aria-hidden',String(!night));
  page.querySelector('#energy-description').textContent=night?'After sunset: compatible storage can support selected household loads. Capacity and system design determine what is available.':'Daylight: solar can supply the home and charge compatible storage.';
 }));
 const periods={day:{title:'A day of solar',labels:['Morning','Midday','Evening'],path:'M0 200C80 200 130 150 180 95S250 20 285 55S365 180 500 200',alt:'Illustrative generation curve rising toward midday and falling toward evening'},week:{title:'A week of solar',labels:['Monday','Midweek','Sunday'],path:'M0 140C35 65 55 50 85 110S130 195 160 120S205 35 245 90S280 150 320 100S365 60 410 140S465 100 500 55',alt:'Illustrative daily generation changing through a week'},month:{title:'A month of solar',labels:['Early month','Mid-month','Late month'],path:'M0 170C40 120 60 155 90 110S135 45 170 85S210 125 245 65S290 45 320 95S365 145 400 75S455 120 500 70',alt:'Illustrative generation changes across a month'}};
 const periodButtons=[...page.querySelectorAll('[data-period]')];
 const timeline=page.querySelector('#monitoring-timeline');
 let period='day';
 function updateTimeline(){const value=Number(timeline.value);const labels=periods[period].labels;const label=labels[value<34?0:value>66?2:1];page.querySelector('#generation-cursor').setAttribute('x1',value*5);page.querySelector('#generation-cursor').setAttribute('x2',value*5);page.querySelector('#monitoring-readout').textContent=`${label} · illustrative generation view`;timeline.setAttribute('aria-valuetext',label);}
 periodButtons.forEach(button=>button.addEventListener('click',()=>{
  select(periodButtons,button);period=button.dataset.period;const data=periods[period];page.querySelector('#monitoring-chart-title').textContent=data.title;page.querySelector('#generation-line').setAttribute('d',data.path);page.querySelector('#generation-area').setAttribute('d',data.path+'L500 220H0Z');page.querySelector('#generation-chart').setAttribute('aria-label',data.alt);['start','middle','end'].forEach((key,i)=>page.querySelector(`[data-chart-${key}]`).textContent=data.labels[i]);updateTimeline();
 }));
 timeline.addEventListener('input',updateTimeline);updateTimeline();
 const supportButtons=[...page.querySelectorAll('[data-support]')];
 const supportCopy={question:['Ask about using your system, monitoring or the equipment installed at your home.','Hi Aptech, I have a question about my solar system.'],alert:['Tell us the inverter model and the alert you are seeing. We’ll discuss the next step.','Hi Aptech, I’m seeing an alert on my solar system and would like some guidance.'],maintenance:['Discuss cleaning, inspection and the care appropriate for the equipment at your home.','Hi Aptech, I’d like to discuss maintenance for my solar system.']};
 supportButtons.forEach(button=>button.addEventListener('click',()=>{select(supportButtons,button);const [copy,message]=supportCopy[button.dataset.support];page.querySelector('#support-description').textContent=copy;page.querySelector('#support-link').href='https://wa.me/919447324542?text='+encodeURIComponent(message);}));
 const indexTrack = page.querySelector('.svc-index__track');
 const mainHeader = document.querySelector('.solar-header');
 const indexLens = indexTrack.querySelector('.svc-index__lens');
 const indexLinks = [...indexTrack.querySelectorAll('a')];
 const indexSections = indexLinks.map(link => page.querySelector(link.hash));
 let activeIndex = -1;
 let lensAnimation;

 function positionIndexLens(animate) {
  const link = indexLinks[activeIndex];
  if (!link) return;

  const scrollLeft = indexTrack.scrollLeft;
  const origin = indexTrack.getBoundingClientRect().left + indexTrack.clientLeft - scrollLeft;
  const start = indexLens.getBoundingClientRect();
  const target = link.getBoundingClientRect();
  const startX = start.left - origin;
  const targetX = target.left - origin;
  const distance = targetX - startX;
  lensAnimation?.cancel();
  indexTrack.style.setProperty('--lens-x', `${targetX}px`);
  indexTrack.style.setProperty('--lens-width', `${target.width}px`);
  indexTrack.setAttribute('data-lens-ready', '');

  if (animate && indexLens.animate && start.width && Math.abs(distance) >= 1) {
   const leftEdge = indexLinks[0].getBoundingClientRect().left - origin;
   const rightEdge = indexLinks[indexLinks.length - 1].getBoundingClientRect().right - origin;
   const stretch = Math.min(26, Math.abs(distance) * .24);
   const stretchedWidth = Math.min(rightEdge - leftEdge, Math.max(start.width, target.width) + stretch);
   const stretchedX = Math.max(leftEdge, Math.min(rightEdge - stretchedWidth, startX + distance * .5 - stretch / 2));
   const overshootX = Math.max(leftEdge, Math.min(rightEdge - target.width, targetX + Math.sign(distance) * 6));
   lensAnimation = indexLens.animate([
    { left: `${startX}px`, width: `${start.width}px`, easing: 'cubic-bezier(.25,.65,.35,1)' },
    { left: `${stretchedX}px`, width: `${stretchedWidth}px`, offset: .38, easing: 'ease-out' },
    { left: `${overshootX}px`, width: `${target.width}px`, offset: .77, easing: 'ease-in-out' },
    { left: `${targetX}px`, width: `${target.width}px` },
   ], 500);
  }

  const padding = parseFloat(getComputedStyle(indexTrack).paddingInlineStart);
  const visibleLeft = scrollLeft + padding;
  const visibleRight = scrollLeft + indexTrack.clientWidth - padding;
  if (targetX < visibleLeft - 1 || targetX + target.width > visibleRight + 1) {
   const left = targetX < visibleLeft
    ? targetX - padding
    : targetX + target.width - indexTrack.clientWidth + padding;
   indexTrack.scrollTo({ left, behavior: animate ? 'smooth' : 'instant' });
  }
 }

 function updateIndex(height) {
  const anchorOffset = parseFloat(getComputedStyle(indexSections[0]).scrollMarginTop) || 0;
  const marker = Math.max(height * .45, anchorOffset + 1);
  let nextIndex = 0;
  for (const [index, section] of indexSections.entries()) {
   if (section.getBoundingClientRect().top <= marker) nextIndex = index;
  }
  if (nextIndex === activeIndex) return;
  const animate = activeIndex !== -1 && !motion.matches;
  indexLinks[Math.max(0, activeIndex)].removeAttribute('aria-current');
  activeIndex = nextIndex;
  indexLinks[activeIndex].setAttribute('aria-current', 'location');
  positionIndexLens(animate);
 }

 function updateMainHeader(height) {
  const { top, bottom } = indexTrack.getBoundingClientRect();
  const showHeader = bottom <= 0 || top >= height;
  if (mainHeader.hasAttribute('data-nav-visible') === showHeader) return;

  if (!showHeader) {
   mainHeader.querySelector('.solar-menu-toggle[aria-expanded="true"]')?.click();
   if (mainHeader.contains(document.activeElement)) {
    indexLinks[activeIndex].focus({ preventScroll: true });
   }
  }
  mainHeader.toggleAttribute('data-nav-visible', showHeader);
 }

 if ('ResizeObserver' in window) {
  const indexResize = new ResizeObserver(() => positionIndexLens(false));
  indexResize.observe(indexTrack);
  indexLinks.forEach(link => indexResize.observe(link));
 }
 if('IntersectionObserver' in window){
  const sections=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.toggleAttribute('data-in-view',entry.isIntersecting);if(entry.isIntersecting)entry.target.setAttribute('data-entered','');}},{rootMargin:'100px'});
  page.querySelectorAll('.svc-section').forEach(section=>sections.observe(section));
 }
 let frame=0;
 const hero=page.querySelector('.svc-hero');const support=page.querySelector('.svc-support');
 function render(){
  frame=0;const height=innerHeight;
  updateIndex(height);
  updateMainHeader(height);
  if(motion.matches)return;
  hero.style.setProperty('--hero-y',Math.max(0,Math.min(65,-hero.getBoundingClientRect().top*.08)).toFixed(1)+'px');
  const bounds=install.getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,-bounds.top/Math.max(1,install.offsetHeight-install.querySelector('.svc-install__stage').offsetHeight)));
  install.style.setProperty('--install-y',`${(25-progress*50).toFixed(1)}px`);
  install.style.setProperty('--install-scale',(1.02+progress*.045).toFixed(4));
  support.style.setProperty('--support-y',Math.max(-35,Math.min(35,(height/2-support.getBoundingClientRect().top)*.05)).toFixed(1)+'px');
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 function configure(){install.toggleAttribute('data-animated',!motion.matches);positionIndexLens(false);schedule();}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{positionIndexLens(false);schedule();});window.addEventListener('pageshow',schedule);window.addEventListener('hashchange',schedule);motion.addEventListener('change',configure);configure();
})();
