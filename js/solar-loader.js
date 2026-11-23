(() => {
  const loader = document.querySelector('.solar-loader');
  if (!loader) return;
  const canvas = loader.querySelector('canvas');
  const context = canvas.getContext('2d');
  const light = loader.querySelector('.solar-loader__progress-button');
  const status = loader.querySelector('[role="status"]');
  const progress = loader.querySelector('progress');
  const percent = loader.querySelector('.solar-loader__percent');
  const retry = loader.querySelector('.solar-loader__retry');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const video = document.querySelector('.solar-hero video');
  const poster = document.querySelector('.solar-hero-poster');
  const interaction = new AbortController();
  const { signal: interactionSignal } = interaction;
  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  let radius = 0;
  let frame = 0;
  let revealStarted = 0;
  let finishReveal;

  // Use the open attribute for first paint, then move to a modal dialog for
  // keyboard focus and native inertness of the page underneath.
  loader.removeAttribute('open');
  if (typeof loader.showModal === 'function') loader.showModal();
  else loader.setAttribute('open', '');
  loader.addEventListener('cancel', event => event.preventDefault());

  function draw(now) {
    frame = 0;
    if (!context) return;
    const animated = !motion.matches;
    const time = animated ? now / 1000 : 0;
    const reveal = finishReveal ? Math.min((now - revealStarted) / 520, 1) : 0;
    const growth = reveal * reveal;
    const target = Math.min(width, height) * (.115 + .22 * progress.value / 100);
    radius = animated ? radius + (target - radius) * .12 : target;
    const edge = radius + Math.hypot(width, height) * .75 * growth;
    const x = width / 2;
    const y = height / 2;
    const bright = light.getAttribute('aria-pressed') === 'true';
    const contour = new Path2D();
    for (let point = 0; point < 120; point++) {
      const angle = point / 120 * Math.PI * 2;
      const wave = Math.sin(angle * 3 - time * 2.1) * .068 +
        Math.sin(angle * 5 + time * 1.4) * .038 +
        Math.sin(angle * 11 - time * 2.6) * .018 +
        Math.sin(angle * 19 + time * 2) * .008;
      const distance = edge * (1 + wave);
      const px = x + Math.cos(angle) * distance * 1.04 + pointerX;
      const py = y + Math.sin(angle) * distance * .96 + pointerY;
      if (point === 0) contour.moveTo(px, py);
      else contour.lineTo(px, py);
    }
    contour.closePath();

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    if (finishReveal) {
      context.globalCompositeOperation = 'destination-out';
      context.fill(contour);
      context.globalCompositeOperation = 'source-over';
    }

    context.save();
    context.clip(contour);
    const lightX = x + Math.cos(time * .8) * edge * .45 + pointerX;
    const lightY = y + Math.sin(time * .7) * edge * .55 + pointerY;
    const glass = context.createRadialGradient(lightX, lightY, 0, x, y, edge * 1.15);
    glass.addColorStop(0, 'rgba(150, 151, 154, .32)');
    glass.addColorStop(.45, 'rgba(53, 54, 57, .19)');
    glass.addColorStop(.72, 'rgba(15, 16, 17, .43)');
    glass.addColorStop(1, 'rgba(141, 142, 146, .42)');
    context.globalAlpha = 1 - Math.sqrt(reveal);
    context.fillStyle = glass;
    context.fillRect(0, 0, width, height);
    const sheen = context.createLinearGradient(x - edge, y - edge, x + edge, y + edge);
    sheen.addColorStop(.18, '#17181900');
    sheen.addColorStop(.36 + Math.sin(time) * .08, '#b6b9c132');
    sheen.addColorStop(.52 + Math.sin(time) * .08, '#02020365');
    sheen.addColorStop(.74, '#17181900');
    context.fillStyle = sheen;
    context.fillRect(0, 0, width, height);
    context.restore();

    context.globalAlpha = 1 - reveal;
    context.strokeStyle = bright ? '#b9c7e376' : '#8e939f5c';
    context.lineWidth = bright ? 4 : 2.8;
    context.shadowColor = bright ? '#e8efff' : '#b9c4d4';
    context.shadowBlur = bright ? 15 : 8;
    context.stroke(contour);
    context.shadowBlur = 0;
    context.strokeStyle = '#e5e5e3';
    context.lineWidth = 1.05;
    context.stroke(contour);
    context.globalAlpha = 1;

    if (reveal === 1) {
      finishReveal();
      return;
    }
    frame = animated || finishReveal ? requestAnimationFrame(draw) : 0;
  }

  function scheduleFrame() {
    if (context && !frame) frame = requestAnimationFrame(draw);
  }

  function sizeCanvas() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(devicePixelRatio, 1.25, 1280 / width);
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    context?.setTransform(scale, 0, 0, scale, 0, 0);
    scheduleFrame();
  }

  light.addEventListener('click', () => {
    light.setAttribute('aria-pressed', String(light.getAttribute('aria-pressed') === 'false'));
    scheduleFrame();
  }, { signal: interactionSignal });
  loader.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    pointerX = (event.clientX - width / 2) * .028;
    pointerY = (event.clientY - height / 2) * .038;
  }, { passive: true, signal: interactionSignal });
  loader.addEventListener('pointerleave', () => { pointerX = pointerY = 0; }, { signal: interactionSignal });
  window.addEventListener('resize', sizeCanvas, { signal: interactionSignal });
  motion.addEventListener('change', scheduleFrame, { signal: interactionSignal });
  sizeCanvas();

  function showProgress(value) {
    if (progress.value === value) return;
    progress.value = value;
    percent.textContent = `${value}%`;
    scheduleFrame();
  }

  function loadVideo(signal) {
    // Keep the original URL: native byte-range loading avoids holding the entire
    // MP4 in memory and works when mobile browsers limit media preloading.
    return new Promise((resolve, reject) => {
      function finish(error) {
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error);
        else resolve();
      }
      const ready = () => finish();
      const failed = () => finish(video.error || new Error('Video unavailable'));
      const aborted = () => finish(new Error('Video still buffering'));
      video.addEventListener('loadeddata', ready);
      video.addEventListener('error', failed);
      signal.addEventListener('abort', aborted, { once: true });
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.load();
      if (video.readyState >= 2) ready();
    });
  }

  async function prepareSite() {
    const controller = new AbortController();
    const animated = !motion.matches && CSS.supports('position', 'sticky');
    const tasks = [() => poster.decode()];
    if (animated) tasks.push(() => loadVideo(controller.signal));
    let completed = 0;
    let deadline;
    retry.hidden = true;
    status.textContent = 'Loading Aptech Solar';
    showProgress(0);
    try {
      // Only the first frame is useful for entry. Neither a slow video, a
      // missing image, nor iOS withholding loadeddata may trap the visitor.
      await Promise.race([
        Promise.allSettled(tasks.map(async load => {
          try { await load(); }
          finally { showProgress(Math.round(++completed / tasks.length * 100)); }
        })),
        new Promise(resolve => { deadline = setTimeout(resolve, 3500); }),
      ]);
    } finally {
      clearTimeout(deadline);
      controller.abort();
    }

    try { await window.aptechHomeEntry?.prepare?.(); } catch {}
    showProgress(100);
    status.textContent = 'Ready';
    if (!motion.matches && context) {
      await new Promise(resolve => {
        // Also finish if requestAnimationFrame is suspended in a mobile tab.
        const deadline = setTimeout(resolve, 700);
        finishReveal = () => { clearTimeout(deadline); resolve(); };
        revealStarted = performance.now();
        loader.setAttribute('data-revealing', '');
        scheduleFrame();
      });
    }
    cancelAnimationFrame(frame);
    interaction.abort();
    // Closing releases native modal focus/inertness and notifies site.js.
    if (typeof loader.close === 'function') loader.close();
    loader.remove();
  }

  retry.addEventListener('click', prepareSite);
  prepareSite();
})();
