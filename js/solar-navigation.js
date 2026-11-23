// Move the glass selection and clip the light labels to the same shape.
{
  const track = document.querySelector('.solar-nav-track');
  const list = track.querySelector('.solar-nav-links');
  const lens = track.querySelector('.solar-nav-lens');
  const mirror = list.cloneNode(true);
  mirror.classList.add('solar-nav-mirror');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.setAttribute('inert', '');
  track.append(mirror);

  const homeItem = list.querySelector('[href$="#home"]:not(.solar-logo)');
  const contactItem = list.querySelector('[href$="#contact"]');
  const servicesItem = list.querySelector('[href$="#services"]');
  let selected = list.querySelector('[aria-current="page"]') || homeItem;
  let lensAnimation;
  let labelAnimation;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function moveLens(animate) {
    const trackWidth = track.clientWidth;
    const currentWidth = lens.offsetWidth;
    const targetWidth = selected.offsetWidth;
    const startX = lens.offsetLeft;
    const endX = selected.offsetLeft;
    lensAnimation?.cancel();
    labelAnimation?.cancel();
    track.style.setProperty('--lens-x', `${endX}px`);
    track.style.setProperty('--lens-width', `${targetWidth}px`);
    track.setAttribute('data-lens-ready', '');

    const distance = endX - startX;
    if (!animate || motion.matches || !lens.animate || Math.abs(distance) < 1) return;

    const stretch = Math.min(24, Math.abs(distance) * 0.18);
    const wide = Math.min(trackWidth, Math.max(currentWidth, targetWidth) + stretch);
    const middle = Math.max(0, Math.min(trackWidth - wide, startX + distance * 0.58 - stretch / 2));
    const overshoot = Math.max(0, Math.min(trackWidth - targetWidth, endX + Math.sign(distance) * 8));
    const frames = [
      { x: startX, width: currentWidth, offset: 0, easing: 'ease-out' },
      { x: middle, width: wide, offset: 0.32, easing: 'ease-out' },
      { x: overshoot, width: targetWidth, offset: 0.68, easing: 'ease-in-out' },
      { x: endX, width: targetWidth, offset: 1 },
    ];
    lensAnimation = lens.animate(frames.map(({ x, width, offset, easing }) => ({
      left: `${x}px`, width: `${width}px`, offset, easing,
    })), 540);
    labelAnimation = mirror.animate(frames.map(({ x, width, offset, easing }) => ({
      clipPath: `inset(0 ${trackWidth - x - width}px 0 ${x}px round 999px)`, offset, easing,
    })), 540);
  }

  function selectItem(item, animate) {
    if (!item || item === selected) return;
    if (selected.matches('button')) selected.setAttribute('aria-pressed', 'false');
    selected.removeAttribute('aria-current');
    selected = item;
    if (selected.matches('button')) selected.setAttribute('aria-pressed', 'true');
    if (selected.matches('a')) selected.setAttribute('aria-current', 'location');
    moveLens(animate);
  }

  list.addEventListener('click', event => {
    const item = event.target.closest('.solar-nav-item');
    if (item) selectItem(item, true);
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#contact') selectItem(contactItem, true);
    if (location.hash === '#services') selectItem(servicesItem, true);
    if (!location.hash || location.hash === '#home') selectItem(homeItem, true);
  });
  if (location.hash === '#contact') selectItem(contactItem, false);
  moveLens(false);
  new ResizeObserver(() => moveLens(false)).observe(track);
}


// Compact mobile navigation: explicit toggle, outside click and keyboard dismissal.
(() => {
  const header = document.querySelector('.solar-header');
  const toggle = header.querySelector('.solar-menu-toggle');
  const panel = header.querySelector('.solar-mobile-menu');
  const mobile = matchMedia('(max-width: 600px)');
  function setOpen(open, restoreFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    panel.hidden = !open;
    panel.inert = !open;
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
  });
  header.addEventListener('focusout', event => { if (event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false); });
  mobile.addEventListener('change', () => setOpen(false));
})();
