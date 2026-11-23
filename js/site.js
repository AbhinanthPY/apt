// Keep Apple links created by the original galleries on Apple's site.
(() => {
  const appleOrigin = 'https://www.apple.com';
  function normalizeLinks(root) {
    const anchors = root.matches?.('a[href]') ? [root] : [...(root.querySelectorAll?.('a[href]') || [])];
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      if (!href || href === '/' || href.startsWith('//') || !href.startsWith('/')) continue;
      anchor.setAttribute('href', appleOrigin + href);
    }
  }
  normalizeLinks(document);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) normalizeLinks(node);
    }
  }).observe(document.body, {childList:true, subtree:true});
})();

const hero = document.querySelector('.solar-hero');
const stage = hero.querySelector('.solar-stage');
const header = document.querySelector('.solar-header');
const video = hero.querySelector('video');
const wordmark = hero.querySelector('.solar-wordmark');
const cue = hero.querySelector('.solar-scroll-cue');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const loader = document.querySelector('.solar-loader[open]');
const videoScroll = 0.88 * (220 / 320);
const extraBrandScroll = 100 / 320;
const brandStart = 0.63 * videoScroll;
const brandLength = extraBrandScroll + 0.07 * videoScroll;
// Measure the artwork and the clear area inside its p in source-image pixels.
const artwork = { centerX: 1070, centerY: 382.5, width: 1810, height: 513 };
const opening = { centerX: 715, centerY: 380, width: 98, height: 110 };
let scheduledFrame = 0;
let cueReady = false;

function clampProgress(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function syncWordmark(progress) {
  if (progress === 0 || progress === 1) {
    wordmark.style.opacity = '0';
    return;
  }

  const reveal = easeInOut(clampProgress(progress / 0.18));
  const zoom = easeInOut(clampProgress((progress - 0.34) / 0.66));
  const focus = easeInOut(clampProgress(zoom / 0.35));
  const aspect = stage.clientWidth / stage.clientHeight;
  const wideView = Math.max(artwork.width / 0.84, artwork.height * aspect / 0.32) * (1.10 - 0.10 * reveal);
  const counterView = Math.min(opening.width, opening.height * aspect);
  const width = wideView * Math.pow(counterView / wideView, zoom);
  const height = width / aspect;
  const drift = 22 * Math.sin(Math.PI * clampProgress(progress / 0.34));
  const startX = artwork.centerX + 36 * (1 - reveal);
  const startY = artwork.centerY - 48 * (1 - reveal) + drift;
  const centerX = startX + (opening.centerX - startX) * focus;
  const centerY = startY + (opening.centerY - startY) * focus;
  wordmark.setAttribute('viewBox', `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`);
  wordmark.style.opacity = reveal;
}

function syncScrollVideo() {
  scheduledFrame = 0;
  const { top: heroTop, bottom: heroBottom } = hero.getBoundingClientRect();
  const atFinishedHero = document.documentElement.hasAttribute('data-home-return') &&
    -heroTop >= Math.max(0, hero.offsetHeight - stage.offsetHeight) * .94;
  const afterHero = heroBottom <= 1 || atFinishedHero;
  header.toggleAttribute('data-nav-visible', afterHero);
  header.toggleAttribute('inert', !afterHero);
  if (cueReady) cue.toggleAttribute('data-cue-hidden', heroTop < -12);
  if (!hero.hasAttribute('data-scroll-video')) return;

  const scrollDistance = hero.offsetHeight - stage.offsetHeight;
  const progress = clampProgress(-heroTop / scrollDistance);
  const brandProgress = clampProgress((progress - brandStart) / brandLength);
  // Slow the coastal shot during the wordmark, then resume the original pace.
  const playbackProgress = clampProgress((progress - brandProgress * extraBrandScroll) / videoScroll);
  syncWordmark(brandProgress);
  hero.toggleAttribute('data-intro', playbackProgress < 1);

  if (!Number.isFinite(video.duration) || video.seeking) return;
  // Seek just inside the last frame so browsers keep it on screen at the end.
  const time = playbackProgress * Math.max(0, video.duration - 0.02);
  if (Math.abs(video.currentTime - time) >= 0.02) video.currentTime = time;
}

function scheduleScrollVideo() {
  if (!scheduledFrame) scheduledFrame = requestAnimationFrame(syncScrollVideo);
}

function configureScrollVideo() {
  const enabled = !reducedMotion.matches && CSS.supports('position', 'sticky') && !video.error;
  hero.toggleAttribute('data-scroll-video', enabled);
  if (!enabled) {
    hero.removeAttribute('data-intro');
    wordmark.style.opacity = '0';
    scheduleScrollVideo();
    return;
  }

  if (video.preload === 'none' && !loader?.open) {
    video.preload = 'auto';
    video.load();
  }
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) hero.setAttribute('data-frame-ready', '');
  syncScrollVideo();
}

window.addEventListener('scroll', scheduleScrollVideo, { passive: true });
window.addEventListener('resize', scheduleScrollVideo);
window.addEventListener('pageshow', scheduleScrollVideo);
video.addEventListener('loadedmetadata', scheduleScrollVideo);
video.addEventListener('loadeddata', () => {
  hero.setAttribute('data-frame-ready', '');
  scheduleScrollVideo();
});
video.addEventListener('seeked', scheduleScrollVideo);
video.addEventListener('error', configureScrollVideo);
reducedMotion.addEventListener?.('change', configureScrollVideo);
loader?.addEventListener('close', configureScrollVideo, { once: true });

cue.addEventListener('click', event => {
  if (!hero.hasAttribute('data-scroll-video') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.scrollBy({ top: stage.offsetHeight * 0.9, behavior: 'smooth' });
});

configureScrollVideo();

// Fresh entry starts at zero; returning from an inner page lands on the final hero frame.
const homeEntry = window.aptechHomeEntry;
function positionHomeEntry() {
  if (!homeEntry?.homeHash) return;
  const top = homeEntry.returning
    ? hero.offsetTop + Math.max(0, hero.offsetHeight - stage.offsetHeight)
    : 0;
  window.scrollTo({ top, behavior: 'instant' });
  syncScrollVideo();
}
positionHomeEntry();
if (homeEntry) homeEntry.prepare = async () => {
  positionHomeEntry();
  if (!homeEntry.returning || !Number.isFinite(video.duration) || !hero.hasAttribute('data-scroll-video')) return;
  // Keep the loader over the page until the final video frame is decoded.
  if (video.seeking) await new Promise(resolve => {
    const done = () => { video.removeEventListener('seeked', done); clearTimeout(deadline); resolve(); };
    const deadline = setTimeout(done, 3000);
    video.addEventListener('seeked', done, { once: true });
  });
};
window.addEventListener('pageshow', event => {
  if (!event.persisted || !homeEntry) return;
  try {
    if (sessionStorage.getItem('aptech:home-return') !== '1') return;
    sessionStorage.removeItem('aptech:home-return');
  } catch { return; }
  homeEntry.homeHash = !location.hash || location.hash === '#home';
  homeEntry.returning = homeEntry.homeHash;
  document.documentElement.toggleAttribute('data-home-return', homeEntry.returning);
  requestAnimationFrame(positionHomeEntry);
});
// Paint the collapsed lens first so it can expand on the opening frame.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    cueReady = true;
    scheduleScrollVideo();
  });
});

const productViewer = document.querySelector('.section-product-viewer');
const productIntro = productViewer.querySelector('#landing-mac-video');

function prepareProductIntro() {
  // Start while visitors are still in the hero or orbital cards.
  for (const frame of productViewer.querySelectorAll('[data-video-id="landing-mac-video"] img[src]')) {
    const image = new Image();
    image.fetchPriority = 'low';
    image.src = frame.src;
  }
  if (!reducedMotion.matches) productIntro.preload = 'auto';
}

if (loader) loader.addEventListener('close', prepareProductIntro, { once: true });
else prepareProductIntro();

{
  const power = document.querySelector('.solar-power');
  const scene = power.querySelector('.solar-power-stage');
  const cards = [...power.querySelectorAll('.solar-power-card')];
  const frontCount = power.querySelectorAll('.solar-power-card:not(.solar-power-pattern)').length;
  const featured = cards[0];
  let orbitVisible = false;
  let orbitFrame = 0;
  let lastFrame = 0;
  let openingStart = null;
  let orbitAngle = 0.12;
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;

  function easeBetween(value, start, end) {
    return easeInOut(clampProgress((value - start) / (end - start)));
  }

  function renderOrbit(now) {
    orbitFrame = 0;
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    const distance = power.offsetHeight - height;
    const top = power.getBoundingClientRect().top;
    const progress = clampProgress(-top / Math.max(1, distance));
    const ramp = (start, end) => easeBetween(progress, start, end);
    if (openingStart === null && top <= height * 0.18) openingStart = now;
    const openingTime = Math.max(openingStart === null ? 0 : (now - openingStart) / 1000, progress * 14);
    const turn = easeBetween(openingTime, 0.32, 0.8);
    const unfold = easeBetween(openingTime, 0.55, 1.55);
    const fan = easeBetween(openingTime, 0.67, 1.67);
    const typeIn = easeBetween(openingTime, 1.2, 2.12);
    const beyondIn = ramp(0.015, 0.115);
    const titleOut = ramp(0.21, 0.35);
    const gather = ramp(0.23, 0.41);
    const orbitOut = ramp(0.33, 0.41);
    const featureOut = ramp(0.43, 0.48);
    const chapterIn = ramp(0.48, 0.55);
    const chapterOut = ramp(0.58, 0.74);
    const featureFadeIn = ramp(0.74, 0.81);
    const featureLanding = ramp(0.74, 0.95);
    const featureRoll = ramp(0.76, 0.94);
    const finaleIn = ramp(0.74, 0.90);
    const finaleTypeIn = ramp(0.79, 0.94);
    const featureGrow = ramp(0.94, 0.98);
    const finalCardScale = featureGrow
      ? Math.max(1, Math.min(2.64, width * 0.9 / featured.offsetWidth, height * 0.76 / featured.offsetHeight))
      : 1;
    const elapsed = lastFrame ? Math.min(now - lastFrame, 40) : 0;
    lastFrame = now;
    orbitAngle += elapsed * 0.00048 * (1 - gather) * fan;
    const follow = 1 - Math.exp(-elapsed / 140);
    tiltX += (pointerX - tiltX) * follow;
    tiltY += (pointerY - tiltY) * follow;

    scene.style.setProperty('--power-cover-opacity', 1 - easeBetween(openingTime, 0.51, 0.76));
    scene.style.setProperty('--power-cover-turn', `${turn * 94}deg`);
    scene.style.setProperty('--power-canvas-opacity', easeBetween(openingTime, 0.47, 0.68));
    scene.style.setProperty('--power-canvas-transform', unfold === 1 ? 'none' :
      `perspective(1100px) rotateY(${-28 * (1 - unfold)}deg) rotateZ(${-7 * (1 - unfold)}deg) scale(${0.13 + 0.87 * unfold})`);
    scene.style.setProperty('--power-type-edge', `${typeIn * 114}%`);
    scene.style.setProperty('--power-beyond-edge', `${beyondIn * 112}%`);
    scene.style.setProperty('--power-beyond-opacity', Math.min(1, beyondIn * 2.25));
    scene.style.setProperty('--power-title-opacity', typeIn ? 1 - titleOut : 0);
    scene.style.setProperty('--power-title-shift', `${-titleOut * height * 0.25}px`);
    scene.style.setProperty('--power-chapter-opacity', chapterIn * (1 - chapterOut));
    scene.style.setProperty('--power-chapter-shift', `${((1 - chapterIn) * 0.58 - chapterOut * 0.72) * height}px`);
    scene.style.setProperty('--power-finale-opacity', finaleIn);
    scene.style.setProperty('--power-finale-type-opacity', Math.min(1, finaleTypeIn * 2));
    scene.style.setProperty('--power-finale-type-edge', `${finaleTypeIn * 112}%`);
    featured.style.setProperty('--power-feature-turn', `${featureRoll * 720}deg`);
    featured.style.setProperty('--power-feature-bank', `${Math.sin(featureRoll * Math.PI) * -13}deg`);

    const featureDrop = progress >= 0.74 ? (featureLanding - 1) * height * 0.53 : 0;

    const radius = Math.min(width * 0.34, height * 0.75);
    const depth = Math.min(285, width * 0.22);
    const perspectiveOffset = height * 0.04;
    for (const [index, card] of cards.entries()) {
      const rear = index >= frontCount * 2;
      const pattern = rear || index % 2 === 1;
      const slot = rear ? (index - frontCount * 2) * 2 + 0.38 : index;
      const angle = orbitAngle + Math.PI * slot / frontCount - progress * 2.8 + tiltX * 0.28;
      const side = Math.sin(angle);
      const near = Math.cos(angle);
      const spread = (0.46 + fan * 0.54) * (1 - gather);
      const x = side * radius * spread;
      const lane = rear ? -0.22 : pattern ? 0.17 : 0.012;
      const y = (lane + side * 0.15 + near * 0.09 + tiltY * 0.05) * height * spread;
      const z = (near * depth - (rear ? 140 : pattern ? 45 : 0)) * (1 - gather);
      const yaw = -side * 74 * (1 - gather);
      const tilt = (pattern ? 8 : -5) * side * (1 - gather);
      const light = (pattern ? 0.69 : 0.58) + (near + 1) * 0.21;
      const isFeatured = card === featured;
      const orbitLayer = 2 + (near + 1) * 16 + (rear ? 0 : 9);
      const foreground = card.hasAttribute('data-power-foreground') && near > -0.25 && gather < 0.6;
      const scale = isFeatured ? 1 + featureGrow * (finalCardScale - 1) : 1 - gather * 0.24;
      const orbitOpacity = Math.min(1, 0.43 + light * 0.55);
      const opacity = isFeatured
        ? (1 - featureOut + featureFadeIn) * (orbitOpacity + (1 - orbitOpacity) * gather)
        : (1 - orbitOut) * orbitOpacity;

      const cardY = y + (isFeatured ? featureDrop : 0);
      card.style.transform = `translateY(${-perspectiveOffset}px) perspective(1000px) translate3d(${x}px, ${cardY + perspectiveOffset}px, ${z}px) rotateY(${yaw}deg) rotateZ(${tilt}deg) scale(${scale})`;
      const entry = easeBetween(openingTime, 0.59 + index * 0.034, 0.98 + index * 0.034);
      card.style.opacity = entry * opacity;
      card.style.filter = `brightness(${isFeatured ? light + (1 - light) * gather : light})`;
      const depthLayer = isFeatured ? orbitLayer + (cards.length * 5 - orbitLayer) * gather : orbitLayer;
      card.style.zIndex = Math.round(foreground ? 50 + near * 8 : depthLayer);
      if (pattern) card.style.setProperty('--power-reflection', Math.max(0, Math.cos(angle + 0.86)) ** 3);
    }

    if (orbitVisible && openingStart !== null && gather < 1) orbitFrame = requestAnimationFrame(renderOrbit);
  }

  function scheduleOrbit() {
    if (orbitVisible && !orbitFrame) orbitFrame = requestAnimationFrame(renderOrbit);
  }

  function configureOrbit() {
    const animated = !reducedMotion.matches && CSS.supports('position', 'sticky');
    power.toggleAttribute('data-motion', animated);
    if (animated) {
      renderOrbit(performance.now());
      observer.observe(power);
      return;
    }
    observer.unobserve(power);
    orbitVisible = false;
    cancelAnimationFrame(orbitFrame);
    orbitFrame = lastFrame = 0;
    openingStart = null;
    for (const card of cards) card.removeAttribute('style');
  }

  const observer = new IntersectionObserver(([entry]) => {
    orbitVisible = entry.isIntersecting;
    lastFrame = 0;
    if (!orbitVisible && entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? innerHeight)) {
      openingStart = null;
      orbitAngle = 0.12;
    }
    scheduleOrbit();
  });

  window.addEventListener('scroll', scheduleOrbit, { passive: true });
  window.addEventListener('resize', scheduleOrbit);
  scene.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !power.hasAttribute('data-motion')) return;
    const bounds = scene.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
  }, { passive: true });
  scene.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
  reducedMotion.addEventListener?.('change', configureOrbit);
  configureOrbit();
}

const prepareTour = new IntersectionObserver(([entry], observer) => {
  if (!entry.isIntersecting) return;
  observer.disconnect();
  for (const video of productViewer.querySelectorAll('video[data-play-once]')) {
    video.poster = reducedMotion.matches ? video.dataset.finalFrame : video.dataset.poster;
  }
  // A short head start for optional clips. The tour retains control of playback.
  if (!reducedMotion.matches) {
    productViewer.querySelector('#product-viewer-sizes').preload = 'metadata';
    for (const video of productViewer.querySelectorAll('video[data-play-once]')) video.preload = 'metadata';
  }
}, { rootMargin: `${Math.ceil(window.innerHeight * 2)}px 0px` });
prepareTour.observe(productViewer);

for (const video of productViewer.querySelectorAll('video[data-play-once]')) {
  const button = document.getElementById(video.dataset.playOnce);
  const startFrame = video.dataset.poster;
  let visible = false;
  let finished = false;

  function syncVideo() {
    const active = button.getAttribute('aria-expanded') === 'true';
    if (!active || !visible || reducedMotion.matches || finished) {
      if (!video.paused) video.pause();
      return;
    }
    if (video.paused) video.play().catch(() => {});
  }

  function updateMotion() {
    if (video.hasAttribute('poster')) {
      video.poster = reducedMotion.matches || finished ? video.dataset.finalFrame : startFrame;
    }
    syncVideo();
  }

  new MutationObserver(syncVideo).observe(button, {
    attributes: true,
    attributeFilter: ['aria-expanded']
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.15;
    syncVideo();
  }, { threshold: 0.15 }).observe(video);
  video.addEventListener('ended', () => {
    finished = true;
    video.poster = video.dataset.finalFrame;
  });
  reducedMotion.addEventListener?.('change', updateMotion);
  updateMotion();
}

{
  const estimator = document.querySelector('.solar-estimator');
  const location = estimator.querySelector('#solar-estimator-location');
  const bill = estimator.querySelector('#solar-estimator-bill');
  const amount = estimator.querySelector('#solar-estimator-amount');
  const slider = estimator.querySelector('.solar-estimator-slider');
  const status = estimator.querySelector('#solar-estimator-status');
  const outputs = Object.fromEntries(
    Array.from(estimator.querySelectorAll('[data-estimate]'), (element) => [element.dataset.estimate, element])
  );
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
  const lakhs = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const daysPerMonth = 30;
  const tariff = 8;
  const yieldByLocation = {
    kochi: [3.6, 4.3],
    thiruvananthapuram: [3.9, 4.6],
    kozhikode: [3.4, 4.1]
  };

  function range(low, high, formatter = number) {
    const start = formatter.format(low);
    const end = formatter.format(high);
    return start === end ? start : `${start}–${end}`;
  }

  function renderEstimate(announce = false) {
    const monthlyBill = bill.valueAsNumber;
    const [lowYield, highYield] = yieldByLocation[location.value];
    const dailyUsage = monthlyBill / tariff / daysPerMonth;
    const averageYield = (lowYield + highYield) / 2;
    const size = Math.max(1, Math.ceil(dailyUsage / averageYield * 2) / 2);
    const lowGeneration = size * lowYield;
    const highGeneration = size * highYield;
    const lowCost = size * 55_000;
    const highCost = size * 65_000;
    const lowSavings = Math.min(monthlyBill, lowGeneration * daysPerMonth * tariff) * 0.6;
    const highSavings = Math.min(monthlyBill, highGeneration * daysPerMonth * tariff) * 0.8;

    amount.value = inr.format(monthlyBill);
    bill.setAttribute('aria-valuetext', `${amount.value} per month`);
    slider.style.setProperty('--bill-progress', (monthlyBill - Number(bill.min)) / (Number(bill.max) - Number(bill.min)));

    outputs.size.textContent = `${number.format(size)} kW`;
    outputs.generation.textContent = `${range(Math.round(lowGeneration), Math.round(highGeneration))} kWh`;
    outputs.cost.textContent = lowCost >= 100_000
      ? `₹${range(lowCost / 100_000, highCost / 100_000, lakhs)} lakh`
      : `₹${range(lowCost, highCost)}`;
    outputs.monthly.textContent = `₹${range(Math.round(lowSavings), Math.round(highSavings))}`;
    outputs.daily.textContent = `₹${range(Math.round(lowSavings / daysPerMonth), Math.round(highSavings / daysPerMonth))}`;
    outputs.payback.textContent = `${range(Math.round(lowCost / (highSavings * 12)), Math.round(highCost / (lowSavings * 12)))} years`;

    if (announce) {
      status.textContent = `Illustrative estimate: ${outputs.size.textContent}, ${outputs.monthly.textContent} in monthly savings.`;
    }
  }

  function endDrag() {
    slider.removeAttribute('data-dragging');
  }

  bill.addEventListener('input', () => renderEstimate());
  bill.addEventListener('change', () => renderEstimate(true));
  location.addEventListener('change', () => renderEstimate(true));
  bill.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) slider.setAttribute('data-dragging', '');
  });
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('blur', endDrag);
  bill.addEventListener('blur', endDrag);
  window.addEventListener('pageshow', () => renderEstimate());
  renderEstimate();
}

// Scroll the About scenes without trapping native scrolling.
{
  const about = document.querySelector('.solar-about');
  const openingScene = about.querySelector('.solar-about__opening');
  const manifesto = about.querySelector('.solar-about__manifesto');
  const sequence = about.querySelector('.solar-about__sequence');
  const word = about.querySelector('.solar-about__word');
  const closing = about.querySelector('.solar-about__closing');
  const cards = [...sequence.querySelectorAll('figure')];
  const photos = [...about.querySelectorAll('.solar-about__story-photo, .solar-about__team-photo, .solar-about__feature-photo')];
  const tallViewport = matchMedia('(min-height: 540px) and (min-width: 340px)');
  let aboutMotion = false;
  let aboutFrame = 0;

  function phase(progress, start, end) {
    return easeInOut(clampProgress((progress - start) / (end - start)));
  }

  function sceneProgress(scene, bounds) {
    const travel = Math.max(1, bounds.height - scene.firstElementChild.offsetHeight);
    return clampProgress(-bounds.top / travel);
  }

  function viewportProgress(bounds, height) {
    return clampProgress((height - bounds.top) / (height + bounds.height));
  }

  function setAboutStyles(element, properties) {
    for (const [name, value] of Object.entries(properties)) {
      element.style.setProperty('--about-' + name, value);
    }
  }

  function renderAbout() {
    aboutFrame = 0;
    if (!aboutMotion) return;
    const height = window.innerHeight;
    const sectionBounds = about.getBoundingClientRect();
    if (sectionBounds.bottom < 0 || sectionBounds.top > height) return;

    const openingBounds = openingScene.getBoundingClientRect();
    const manifestoBounds = manifesto.getBoundingClientRect();
    const sequenceBounds = sequence.getBoundingClientRect();
    const openingProgress = sceneProgress(openingScene, openingBounds);
    const manifestoProgress = sceneProgress(manifesto, manifestoBounds);
    const cardProgress = sceneProgress(sequence, sequenceBounds);
    const wordProgress = viewportProgress(word.getBoundingClientRect(), height);
    const closingProgress = viewportProgress(closing.getBoundingClientRect(), height);
    const photoProgress = photos.map(photo => viewportProgress(photo.getBoundingClientRect(), height));

    const entrance = phase(openingBounds.top / height, 0, 0.8);
    const camera = phase(openingProgress, .08, .98);
    const ring = phase(openingProgress, .24, .96);
    const ringFade = phase(openingProgress, .91, 1);
    setAboutStyles(openingScene, {
      'window-scale': .96 + .04 * (1 - entrance) + (innerWidth < 735 ? .38 : .64) * camera,
      'window-x': `${-12 * camera}%`,
      'window-opacity': 1 - .23 * phase(openingProgress, .86, 1),
      'landscape-scale': 1.04 + .13 * camera,
      'intro-y': `${32 * entrance - 25 * camera}px`,
      'iris-scale': .12 + 5.3 * ring,
      'iris-opacity': .9 * phase(openingProgress, .22, .43) * (1 - ringFade),
    });

    const glass = phase(1 - manifestoBounds.top / height, .12, 1.16);
    setAboutStyles(manifesto, {
      'arch-inset': `${(1 - glass) * 21}%`,
      'arch-radius': `${(1 - glass) * 40}vw`,
      'glass-light': `${32 + 53 * manifestoProgress}%`,
      'manifesto-y': `${(1 - glass) * 24 - manifestoProgress * 20}px`,
    });

    word.style.setProperty('--about-word-x', `${(wordProgress - .5) * 4}vw`);
    closing.style.setProperty('--about-closing-light', `${115 - closingProgress * 85}%`);
    for (const [index, photo] of photos.entries()) {
      setAboutStyles(photo, {
        'photo-y': `${(photoProgress[index] - .5) * 12}%`,
        'photo-scale': 1.14,
      });
    }

    const arrivals = [
      1,
      phase(cardProgress, .21, .47),
      phase(cardProgress, .55, .85),
    ];
    const tilts = [-5, 6, -3];
    for (const [index, card] of cards.entries()) {
      const arrival = arrivals[index];
      const depth = arrivals.slice(index + 1).reduce((sum, next) => sum + next, 0);
      setAboutStyles(card, {
        'card-x': `${(1 - arrival) * (index === 1 ? 25 : -22) - depth * 6}%`,
        'card-y': `${(1 - arrival) * 48 - depth * 6}%`,
        'card-angle': `${tilts[index] * (1 - arrival + depth)}deg`,
        'card-scale': 1 - .075 * depth,
        'card-opacity': phase(arrival, 0, .45),
        'card-image-scale': 1 + .12 * (1 - arrival),
      });
    }
  }

  function scheduleAbout() {
    if (!aboutFrame && aboutMotion) aboutFrame = requestAnimationFrame(renderAbout);
  }

  const reveals = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute('data-about-visible', '');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -9% 0px' });

  function updateAboutMotion() {
    aboutMotion = !reducedMotion.matches && tallViewport.matches && CSS.supports('position', 'sticky');
    about.toggleAttribute('data-about-motion', aboutMotion);
    if (!aboutMotion) {
      for (const element of [openingScene, manifesto, word, closing, ...photos, ...cards]) {
        element.removeAttribute('style');
      }
    }
    scheduleAbout();
  }

  for (const element of about.querySelectorAll('[data-about-reveal]')) reveals.observe(element);
  window.addEventListener('scroll', scheduleAbout, { passive: true });
  window.addEventListener('resize', scheduleAbout);
  window.addEventListener('pageshow', scheduleAbout);
  reducedMotion.addEventListener('change', updateAboutMotion);
  tallViewport.addEventListener('change', updateAboutMotion);
  updateAboutMotion();
}
