(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll (Lenis) driven by GSAP's ticker
  const lenis = new Lenis({ duration: reduce ? 0 : 1.15 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); closeMenu(); }
  }));
  AOS.init({ duration: reduce ? 0 : 800, once: true, offset: 80, easing: 'ease-out-cubic' });
  document.querySelectorAll('img').forEach(i => i.addEventListener('error', () => { i.style.visibility = 'hidden'; }));

  // Header: solid on scroll, mobile menu, active page
  const nav = document.getElementById('nav'), burger = document.getElementById('burger'), menu = document.getElementById('menu');
  ScrollTrigger.create({ start: 40, onUpdate: s => nav.classList.toggle('solid', s.scroll() > 40) });
  function closeMenu() { menu.classList.remove('open'); nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); lenis.start(); }
  burger.addEventListener('click', () => {
    const o = menu.classList.toggle('open');
    nav.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o);
    o ? lenis.stop() : lenis.start();
  });
  addEventListener('keydown', e => e.key === 'Escape' && closeMenu());
  addEventListener('resize', () => innerWidth > 860 && closeMenu());
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('#menu a:not(.btn)').forEach(a => {
    const on = a.getAttribute('href').toLowerCase() === page;
    a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });

  // Live opening status + today's row (India time)
  const hours = { 0: [9, 13], 1: [8, 21], 2: [8, 21], 3: [8, 21], 4: [8, 21], 5: [8, 21], 6: [8, 21] };
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const [o, c] = hours[ist.getDay()], hr = ist.getHours() + ist.getMinutes() / 60;
  const st = document.getElementById('status'), fmt = h => (h % 12 || 12) + (h < 12 ? ' am' : ' pm');
  const isOpen = hr >= o && hr < c;
  st.classList.toggle('open', isOpen);
  st.querySelector('span').textContent = isOpen ? `Open now, until ${fmt(c)}` : 'Closed now. We reply first thing when we open';
  document.querySelector(`.week li[data-d="${ist.getDay()}"]`)?.classList.add('today');

  if (!reduce) {
    // Hero: one orchestrated entrance
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .from('.crumbs', { y: 16, opacity: 0, duration: .5 })
      .from('.c-hero .eyebrow', { y: 16, opacity: 0, duration: .45 }, '-=.35')
      .from('.c-hero h1', { y: 40, opacity: 0, duration: .9 }, '-=.2')
      .from('.c-hero .lead, .status', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
      .from('.c-hero .hero-actions .btn', { y: 18, opacity: 0, duration: .5, stagger: .08 }, '-=.45')
      .from('.c-hero .trust li', { y: 16, opacity: 0, duration: .5, stagger: .08 }, '-=.35')
      .from('.c-hero .c-ring', { scale: .88, opacity: 0, duration: 1.1 }, .15)
      .from('.c-hero .arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'power4.inOut' }, .2)
      .from('.c-hero .float-card', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)' }, '-=.3')
      .from('.c-hero .float-chip', { scale: .6, opacity: 0, duration: .5, ease: 'back.out(2)' }, '-=.35');
    // Hold the intro until the preloader lifts, so the heading animation is actually seen
    { const pre = document.getElementById('preloader'), go = () => heroTl.play();
      pre && !pre.classList.contains('is-done') ? addEventListener('preloader:done', go, { once: true }) : go(); }
    gsap.to('.c-hero .arch img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.c-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Hours bars grow in
    gsap.from('.track i', { scaleX: 0, duration: 1, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: '.week', start: 'top 80%' } });

    // Flow line draws with scroll
    const flow = document.querySelector('.flow'), bar = document.createElement('span');
    bar.className = 'bar'; flow.prepend(bar);
    const vertical = () => matchMedia('(max-width:860px)').matches;
    gsap.to(bar, { [vertical() ? 'scaleY' : 'scaleX']: 1, ease: 'none', scrollTrigger: { trigger: flow, start: 'top 75%', end: 'bottom 60%', scrub: true } });
    gsap.from('.flow li', { y: 30, opacity: 0, stagger: .2, duration: .7, scrollTrigger: { trigger: flow, start: 'top 80%' } });
  }

  // Form: live counter, per-field validation, reset + redirect on success
  const form = document.getElementById('cform'), msg = document.getElementById('fmsg'), count = document.getElementById('count');
  const rules = {
    name: v => !v.trim() ? 'Please enter your full name.'
      : v.trim().length < 2 ? 'Name must be at least 2 characters.'
      : !/^\p{L}[\p{L}\s.'-]*$/u.test(v.trim()) ? 'Use letters only (spaces, . - \' allowed).' : '',
    phone: v => {
      const d = v.replace(/\D/g, '');
      if (!v.trim()) return 'Please enter your phone number.';
      const ok = (d.length === 10 && /^[6-9]/.test(d)) || (d.length === 12 && d.startsWith('91') && /^[6-9]/.test(d[2]));
      return ok ? '' : 'Enter a valid 10-digit mobile number.';
    },
    email: v => !v.trim() ? 'Please enter your email address.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Enter a valid email, like name@example.com.' : '',
    topic: () => form.topic.value ? '' : 'Please choose what you are contacting us about.',
    when: () => form.when.value ? '' : 'Please choose the best time to call.',
    msg: v => !v.trim() ? 'Please write a short message.'
      : v.trim().length < 10 ? 'Message must be at least 10 characters.' : ''
  };
  const box = n => ['topic', 'when'].includes(n) ? document.getElementById('f-' + n) : form[n];

  function check(n) {
    const err = rules[n](form[n].value || '');
    const el = box(n), out = document.getElementById('e-' + n);
    el.classList.toggle('bad', !!err);
    if (['topic', 'when'].includes(n)) el.setAttribute('aria-invalid', !!err);
    else form[n].setAttribute('aria-invalid', !!err);
    out.textContent = err;
    return !err;
  }
  function clearErrors() {
    Object.keys(rules).forEach(n => {
      box(n).classList.remove('bad'); document.getElementById('e-' + n).textContent = '';
      const f = ['topic', 'when'].includes(n) ? box(n) : form[n]; f.removeAttribute('aria-invalid');
    });
    msg.textContent = '';
  }
  function resetForm() { form.reset(); count.textContent = '0 / 300'; clearErrors(); }

  form.msg.addEventListener('input', () => count.textContent = `${form.msg.value.length} / 300`);
  // Phone: only digits, spaces, + and -
  form.phone.addEventListener('input', () => { form.phone.value = form.phone.value.replace(/[^\d\s+-]/g, ''); });
  // Validate each field on blur, then keep it live once it has been flagged
  ['name', 'phone', 'email', 'msg'].forEach(n => {
    form[n].addEventListener('blur', () => check(n));
    form[n].addEventListener('input', () => { if (box(n).classList.contains('bad')) check(n); });
  });
  ['topic', 'when'].forEach(n => form.querySelectorAll(`input[name="${n}"]`).forEach(r => r.addEventListener('change', () => check(n))));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const results = Object.keys(rules).map(n => [n, check(n)]);
    const firstBad = results.find(r => !r[1]);
    if (firstBad) {
      msg.style.color = '#c0392b'; msg.textContent = 'Please fix the highlighted fields and try again.';
      const el = box(firstBad[0]);
      (el.matches('fieldset') ? el.querySelector('input') : el).focus({ preventScroll: true });
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    resetForm();
    try { sessionStorage.setItem('cameFrom', JSON.stringify({ url: location.href, t: Date.now() })); } catch (err) { }
    location.assign('404.html');
  });
  // Coming back with the browser Back button: make sure the form is empty
  addEventListener('pageshow', e => { if (e.persisted) resetForm(); });

  // Branch tabs switch the map and details
  const tabs = [...document.querySelectorAll('.tab')], map = document.getElementById('map');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
    const q = encodeURIComponent(t.dataset.map);
    map.style.visibility = ''; map.src = t.dataset.img; map.alt = `Map of the ${t.dataset.name} area`;
    document.getElementById('mName').textContent = t.dataset.name;
    document.getElementById('mAddr').textContent = t.dataset.addr;
    const internal = !!t.dataset.link, href = t.dataset.link || `https://www.google.com/maps/search/?api=1&query=${q}`;
    [document.getElementById('mLink'), document.getElementById('mHot')].forEach(a => {
      a.href = href;
      if (internal) { a.removeAttribute('target'); a.removeAttribute('rel'); } else { a.target = '_blank'; a.rel = 'noopener'; }
    });
    document.getElementById('mHot').setAttribute('aria-label', internal ? `Open ${t.dataset.name} page` : `Open ${t.dataset.name} in Google Maps`);
    if (!reduce) gsap.fromTo('.mapcap', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .5 });
  }));

  // Channel switcher: tabs on the left, live preview on the right
  const pks = [...document.querySelectorAll('.pk')], panes = [...document.querySelectorAll('.pane')];
  function pickCh(i, focus) {
    pks.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    panes.forEach((p, k) => p.classList.toggle('on', k === i));
    if (!reduce) {
      gsap.fromTo(panes[i].children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .1, ease: 'power3.out' });
      gsap.from(panes[i].querySelectorAll('.b'), { y: 16, opacity: 0, scale: .9, duration: .5, stagger: .45, delay: .3, ease: 'back.out(1.6)' });
    }
    if (focus) pks[i].focus();
  }
  pks.forEach((b, i) => {
    b.addEventListener('click', () => pickCh(i));
    b.addEventListener('keydown', e => {
      const n = pks.length;
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); pickCh((i + 1) % n, true); }
      if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); pickCh((i - 1 + n) % n, true); }
    });
  });
})();