(() => {
 const root=document.querySelector('.about-experience');
 if (!root) return;
 const opening=root.querySelector('.about-opening');
 const people=root.querySelector('.about-people');
 const build=root.querySelector('.about-build');
 const craft=root.querySelector('.about-craft');
 const care=root.querySelector('.about-care');
 const steps=[...root.querySelectorAll('.about-build__steps li')];
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0;
 const clamp=n=>Math.max(0,Math.min(1,n));
 function render() {
  frame=0;
  if(motion.matches) return;
  const height=innerHeight;
  const b=build.getBoundingClientRect();
  const progress=clamp(-b.top/Math.max(1,b.height-build.querySelector('.about-build__stage').offsetHeight));
  build.style.setProperty('--build-progress',progress.toFixed(4));
  build.style.setProperty('--build-camera',`${(24-progress*48).toFixed(1)}px`);
  steps.forEach((step,i)=>step.toggleAttribute('data-active',i===Math.min(2,Math.floor(progress*3))));
  opening.style.setProperty('--opening-y',`${Math.min(80,Math.max(0,-opening.getBoundingClientRect().top)*.1).toFixed(1)}px`);
  opening.style.setProperty('--opening-scale',(1+clamp(-opening.getBoundingClientRect().top/height)*.025).toFixed(4));
  people.style.setProperty('--people-y',`${((height/2-people.getBoundingClientRect().top)*.045).toFixed(1)}px`);
  craft.style.setProperty('--craft-scale',(1.05-clamp((height-craft.getBoundingClientRect().top)/(height+craft.offsetHeight))*.05).toFixed(4));
  care.style.setProperty('--care-y',`${Math.max(-45,Math.min(45,(height/2-care.getBoundingClientRect().top)*.06)).toFixed(1)}px`);
 }
 function schedule(){if(!frame) frame=requestAnimationFrame(render);}
 function configure(){
  build.toggleAttribute('data-animated',!motion.matches);
  steps.forEach((step,i)=>step.toggleAttribute('data-active',motion.matches||i===0));
  schedule();
 }
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);
 window.addEventListener('pageshow',schedule);
 motion.addEventListener('change',configure);
 configure();
})();
