(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const role = document.body.dataset.role;

  /* ---------- Header identity (email comes from the login redirect, never stored) ---------- */
  const q = new URLSearchParams(location.search);
  const rawEmail = (q.get('email') || '').trim().slice(0, 80);
  const via = (q.get('via') || '').trim().replace(/[^\w ]/g, '').slice(0, 20);
  // Clean the URL — remove query string and hash so the address bar stays tidy
  history.replaceState(null, '', location.pathname);
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail);
  const label = okEmail ? rawEmail : via ? via + ' account' : 'Guest preview';
  $('#mail').textContent = label; $('#mail').title = label;
  $('#av').textContent = label[0].toUpperCase();
  const sm = $('#sideMail'); if (sm) { sm.textContent = label; sm.parentElement.title = label; }
  const first = okEmail ? rawEmail.split('@')[0].split(/[._\-+\d]+/).filter(Boolean)[0] : '';
  const name = first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : (role === 'admin' ? 'Admin' : 'there');
  $$('[data-name]').forEach(e => e.textContent = name);
  $$('[data-mail]').forEach(e => e.textContent = okEmail ? rawEmail : 'Not signed in');

  /* ---------- Mobile drawer ---------- */
  const side = $('#side'), scrim = $('#scrim'), burger = $('#dBurger');
  const setNav = o => {
    side.classList.toggle('open', o); scrim.classList.toggle('on', o);
    burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    document.body.style.overflow = o ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setNav(!side.classList.contains('open')));
  scrim.addEventListener('click', () => setNav(false));
  addEventListener('keydown', e => e.key === 'Escape' && setNav(false));
  addEventListener('resize', () => innerWidth > 980 && setNav(false));

  /* ---------- View switching (stays inside the dashboard layout) ---------- */
  const links = $$('.d-link[data-view]'), views = $$('.d-view'), crumb = $('#crumb');
  const fmt = (v, el) => (el.dataset.prefix || '') + (+v).toLocaleString('en-IN', { minimumFractionDigits: +el.dataset.dec || 0, maximumFractionDigits: +el.dataset.dec || 0 }) + (el.dataset.suffix || '');

  function animate(v) {
    if (reduce) return;
    gsap.fromTo($$('.d-vhead, .d-card', v), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .1, ease: 'power3.out', clearProps: 'transform,opacity' });
    gsap.from($$('.bar i', v), { scaleY: 0, duration: .9, stagger: .07, ease: 'power3.out', delay: .25 });
    gsap.from($$('.meter i', v), { scaleX: 0, duration: 1, stagger: .08, ease: 'power3.out', delay: .3 });
    $$('[data-count]', v).forEach(el => {
      const o = { n: 0 };
      gsap.to(o, { n: +el.dataset.count, duration: 1.4, ease: 'power2.out', delay: .2, onUpdate: () => el.textContent = fmt(o.n, el), onComplete: () => el.textContent = fmt(el.dataset.count, el) });
    });
    $$('.draw', v).forEach(p => {
      const len = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, ease: 'none', delay: .3, onComplete: () => p.style.strokeDasharray = 'none' });
    });
  }

  function show(id, initial) {
    const v = document.getElementById('v-' + id), l = links.find(x => x.dataset.view === id);
    if (!v || !l) return;
    views.forEach(x => x.hidden = x !== v);
    links.forEach(x => { const on = x === l; x.classList.toggle('active', on); on ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'); });
    crumb.textContent = l.textContent.trim();
    history.replaceState(null, '', location.pathname);
    if (!initial) scrollTo(0, 0);
    animate(v);
  }
  links.forEach(l => l.addEventListener('click', () => { show(l.dataset.view); setNav(false); }));
  const start = location.hash.slice(1);
  show(links.some(l => l.dataset.view === start) ? start : links[0].dataset.view, true);

  if (!reduce) gsap.from('.d-menu li', { x: -18, opacity: 0, duration: .5, stagger: .07, delay: .1, clearProps: 'all' });

  /* ---------- Admin: live patient search ---------- */
  const search = $('#q');
  if (search) search.addEventListener('input', () => {
    const t = search.value.trim().toLowerCase();
    $$('#ptable tbody tr').forEach(r => r.hidden = t && !r.textContent.toLowerCase().includes(t));
  });
})();