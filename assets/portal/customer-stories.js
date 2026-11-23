(() => {
  const workAreas = document.querySelector('.work-areas');
  if (workAreas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    workAreas.setAttribute('data-motion-ready', '');
    const observer = new IntersectionObserver(([entry]) => {
      workAreas.toggleAttribute('data-in-view', entry.isIntersecting);
    }, { threshold: 0.16 });
    observer.observe(workAreas);
  }

  const stories = [...document.querySelectorAll('[data-feedback-story]')];
  function show(story, value) {
    story.toggleAttribute('data-feedback-visible', value);
    story.querySelector('button').setAttribute('aria-expanded', String(value));
  }
  function close(story) {
    story.removeAttribute('data-feedback-open');
    show(story, false);
  }
  for (const story of stories) {
    const button = story.querySelector('button');
    story.addEventListener('pointerenter', () => show(story, true));
    story.addEventListener('pointerleave', () => {
      if (!story.hasAttribute('data-feedback-open') && !story.contains(document.activeElement)) show(story, false);
    });
    button.addEventListener('focus', () => show(story, true));
    button.addEventListener('blur', () => {
      if (!story.hasAttribute('data-feedback-open') && !story.matches(':hover')) show(story, false);
    });
    button.addEventListener('click', () => {
      const open = !story.hasAttribute('data-feedback-open');
      stories.forEach(close);
      story.toggleAttribute('data-feedback-open', open);
      show(story, open);
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-feedback-story]')) stories.forEach(close);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    stories.forEach(close);
  });
})();
