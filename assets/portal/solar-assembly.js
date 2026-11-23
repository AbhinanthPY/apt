(() => {
  const section = document.querySelector('.solar-assembly');
  if (!section) return;

  const layers = [...section.querySelectorAll('.solar-assembly__layer')];
  const label = section.querySelector('.solar-assembly__step');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Start, settle, horizontal offset and vertical offset for each piece.
  const assembly = [
    [0, .22, 0, 14],
    [.12, .39, -7, 12],
    [.28, .55, 1, -19],
    [.44, .72, -12, -23],
    [.56, .85, 12, -29],
  ];
  const finalLabel = 'Rooftop solar installed';
  let frame = 0;

  const clamp = value => Math.max(0, Math.min(1, value));

  function render() {
    frame = 0;
    if (motion.matches) return;

    const bounds = section.getBoundingClientRect();
    // Start revealing the foundation just before the stage reaches its pinned position.
    const lead = innerHeight * .18;
    const progress = clamp((lead - bounds.top) / (bounds.height - innerHeight + lead));
    section.style.setProperty('--assembly-progress', progress.toFixed(4));
    section.style.setProperty('--assembly-camera', `${(5 - progress * 9).toFixed(2)}%`);

    layers.forEach((layer, index) => {
      const [start, end, offsetX, offsetY] = assembly[index];
      const time = clamp((progress - start) / (end - start));
      const remaining = (1 - time) ** 2.4;
      layer.style.setProperty('--layer-opacity', clamp(time * 3).toFixed(3));
      layer.style.setProperty('--layer-x', `${(offsetX * remaining).toFixed(3)}%`);
      layer.style.setProperty('--layer-y', `${(offsetY * remaining).toFixed(3)}%`);
    });

    const current = progress >= .85 ? finalLabel
      : progress >= .44 ? 'Mounting the solar panels'
      : progress >= .28 ? 'Fitting the roof'
      : 'Assembling the modular home';
    if (label.textContent !== current) label.textContent = current;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function resize() {
    const width = window.frameElement?.getBoundingClientRect().width || innerWidth;
    section.style.setProperty('--assembly-ui-scale', Math.max(1, innerWidth / width));
    section.toggleAttribute('data-compact', width < 620 && innerHeight > innerWidth);
    schedule();
  }

  function updateMotion() {
    section.toggleAttribute('data-animate', !motion.matches);
    if (motion.matches) {
      section.style.removeProperty('--assembly-camera');
      for (const layer of layers) layer.removeAttribute('style');
      label.textContent = finalLabel;
    }
    schedule();
  }

  // The embed bridge synchronises the parent scroll with this document.
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  if (window.frameElement) new ResizeObserver(resize).observe(window.frameElement);
  motion.addEventListener('change', updateMotion);
  resize();
  updateMotion();
})();
