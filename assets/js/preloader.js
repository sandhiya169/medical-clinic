/* Preloader: shows until the page has loaded (min 700ms so it never flashes), with a 6s failsafe. */
(() => {
  const root = document.documentElement;
  const el = document.getElementById('preloader');
  if (!el) return;

  root.classList.add('is-loading');
  const start = performance.now();
  let closed = false;

  function hide() {
    if (closed) return;
    closed = true;
    el.classList.add('is-done');
    root.classList.remove('is-loading');
    el.setAttribute('aria-hidden', 'true');
    setTimeout(() => el.remove(), 1000);
    window.dispatchEvent(new Event('preloader:done'));
  }

  function finish() {
    const wait = Math.max(0, 700 - (performance.now() - start));
    setTimeout(hide, wait);
  }

  if (document.readyState === 'complete') finish();
  else addEventListener('load', finish, { once: true });

  setTimeout(hide, 6000); // failsafe if a CDN asset hangs
})();
