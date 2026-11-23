// Decide the home entry point before the first page paint.
(() => {
  const key = 'aptech:home-return';
  const visitedKey = 'aptech:home-visited';
  const homeHash = !location.hash || location.hash === '#home';
  let returning = false;
  try {
    returning = sessionStorage.getItem(key) === '1' && sessionStorage.getItem(visitedKey) === '1';
    sessionStorage.removeItem(key);
    sessionStorage.setItem(visitedKey, '1');
  } catch {
    try {
      const previous = new URL(document.referrer);
      returning = previous.origin === location.origin && /\/(about|services|contact|booking)\.html$/.test(previous.pathname);
    } catch {}
  }
  returning = returning && homeHash;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.documentElement.toggleAttribute('data-home-return', returning);
  window.aptechHomeEntry = { returning, homeHash };
})();
