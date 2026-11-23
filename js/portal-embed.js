(() => {
  const section = document.querySelector('#portal-to-the-future');
  if (!section) return;
  const frame = section.querySelector('iframe');
  const origin = location.origin;
  let animationFrame = 0;
  let contentHeight = innerHeight;
  let scale = 1;
  let anchorPending = '';

  function queueAnchor() {
    const hash = location.hash;
    anchorPending = ['#portal-to-the-future', '#contact', '#services'].includes(hash) ? hash : '';
    if (anchorPending) frame.loading = 'eager';
    schedule();
  }

  function resizeFrame() {
    const width = section.clientWidth;
    // Keep the reference's desktop composition when the host page is narrower.
    const canvasWidth = Math.max(1024, width);
    scale = width / canvasWidth;
    frame.style.width = canvasWidth + 'px';
    frame.style.height = innerHeight / scale + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    section.style.height = Math.max(innerHeight, contentHeight * scale) + 'px';
    schedule();
  }

  function sync() {
    animationFrame = 0;
    if (anchorPending && section.hasAttribute('data-portal-ready')) {
      const start = scrollY + section.getBoundingClientRect().top;
      if (anchorPending === '#portal-to-the-future') {
        window.scrollTo({ top: start, behavior: 'instant' });
      } else {
        const contact = frame.contentDocument?.getElementById(anchorPending === '#services' ? 'work-areas' : 'contact')
          || (anchorPending === '#services' ? frame.contentDocument?.getElementById('work-areas-title')?.closest('section') : null);
        if (contact) {
          const offset = contact.getBoundingClientRect().top + frame.contentWindow.scrollY;
          window.scrollTo({ top: start + offset * scale, behavior: 'instant' });
          anchorPending = '';
        }
      }
    }
    const bounds = section.getBoundingClientRect();
    const active = bounds.top <= 1 && bounds.bottom >= innerHeight - 1;
    document.body.toggleAttribute('data-portal-active', active);
    const assembly = frame.contentDocument?.getElementById('solar-installation');
    const viewportHeight = innerHeight / scale;
    const assemblyTop = assembly && frame.contentWindow
      ? assembly.getBoundingClientRect().top + frame.contentWindow.scrollY
      : Infinity;
    document.body.toggleAttribute('data-portal-assembly-nav',
      active && -bounds.top / scale >= assemblyTop - viewportHeight * .18);
    if (!frame.contentWindow || bounds.top > innerHeight || bounds.bottom < 0) return;
    frame.contentWindow.postMessage({
      type: 'portal:position',
      top: Math.max(0, Math.min(contentHeight - innerHeight / scale, -bounds.top / scale)),
    }, origin);
  }

  function schedule() {
    if (!animationFrame) animationFrame = requestAnimationFrame(sync);
  }

  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== origin) return;
    const data = event.data;
    if (data?.type === 'portal:height' && Number.isFinite(data.height)) {
      contentHeight = Math.max(innerHeight / scale, data.height);
      section.style.height = contentHeight * scale + 'px';
      section.setAttribute('data-portal-ready', '');
      schedule();
    }
    if (data?.type === 'portal:scroll' && Number.isFinite(data.delta)) {
      anchorPending = '';
      window.scrollBy({ top: data.delta * (data.logical ? scale : 1), behavior: 'instant' });
    }
    if (data?.type === 'portal:seek' && Number.isFinite(data.top)) {
      if (anchorPending) return;
      const sectionTop = scrollY + section.getBoundingClientRect().top;
      window.scrollTo({ top: sectionTop + data.top * scale, behavior: 'instant' });
    }
  });

  frame.addEventListener('load', schedule);
  window.addEventListener('hashchange', queueAnchor);
  document.addEventListener('click', event => {
    if (event.target.closest('a[href="#contact"]') && location.hash === '#contact') queueAnchor();
  });
  for (const eventName of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(eventName, () => { anchorPending = ''; }, { passive: true });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(resizeFrame).observe(section);
  window.addEventListener('resize', resizeFrame);
  window.addEventListener('pageshow', schedule);
  resizeFrame();
  queueAnchor();
})();
