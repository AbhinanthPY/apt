(() => {
  const designer = document.querySelector('.section--ai-designer');
  if (designer) {
    designer.setAttribute('data-portal-ticket', '1');
    for (const button of designer.querySelectorAll('[regen]')) {
      button.setAttribute('role', 'button');
      button.tabIndex = 0;
      button.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        button.click();
      });
      button.addEventListener('click', () => {
        const current = Number(designer.getAttribute('data-portal-ticket'));
        designer.setAttribute('data-portal-ticket', String(Math.min(3, current + 1)));
      });
    }
  }
  if (window.parent === window) return;
  const origin = location.origin;
  const appointment = document.getElementById('aptech-appointment');
  let touchY = null;
  let targetScroll = 0;

  function send(type, data) {
    parent.postMessage({ type, ...data }, origin);
  }

  function reportHeight() {
    send('portal:height', { height: Math.ceil(document.body.offsetHeight) });
  }

  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== origin || event.data?.type !== 'portal:position') return;
    const top = event.data.top;
    if (!Number.isFinite(top)) return;
    targetScroll = top;
    if (Math.abs(scrollY - top) > .5) scrollTo({ top, behavior: 'instant' });
  });

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.target.closest('[data-chat-static] .solar-chat-history')) return;
    if (appointment?.open) {
      if (!appointment.contains(event.target)) event.preventDefault();
      return;
    }
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    send('portal:scroll', { delta: event.deltaY * unit });
  }, { passive: false });

  window.addEventListener('touchstart', event => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  }, { passive: true });

  window.addEventListener('touchmove', event => {
    if (event.target.closest('[data-chat-static] .solar-chat-history')) return;
    if (appointment?.open) {
      if (!appointment.contains(event.target)) event.preventDefault();
      return;
    }
    if (touchY === null || event.touches.length !== 1) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    send('portal:scroll', { delta: touchY - y, logical: true });
    touchY = y;
  }, { passive: false });

  window.addEventListener('touchend', () => { touchY = null; }, { passive: true });

  window.addEventListener('keydown', event => {
    if (appointment?.open || event.target.closest('input, textarea, select, button, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return;
    const steps = {
      ArrowDown: 64, ArrowUp: -64,
      PageDown: innerHeight * .85, PageUp: -innerHeight * .85,
      ' ': innerHeight * (event.shiftKey ? -.85 : .85),
    };
    if (Object.hasOwn(steps, event.key)) {
      event.preventDefault();
      send('portal:scroll', { delta: steps[event.key], logical: true });
    }
  });

  // Keep keyboard focus and internal anchor navigation in sync with the host page.
  window.addEventListener('scroll', () => {
    if (Math.abs(scrollY - targetScroll) > 2) {
      targetScroll = scrollY;
      send('portal:seek', { top: scrollY });
    }
  }, { passive: true });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="http"]');
    if (!link) return;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  new ResizeObserver(reportHeight).observe(document.body);
  document.fonts.ready.then(reportHeight);
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  reportHeight();
})();
