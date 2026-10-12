(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = !!(window.gsap && window.ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  if (G) gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll (Lenis) driven by GSAP's ticker
  let lenis = null;
  if (G && window.Lenis) {
    lenis = new Lenis({ duration: reduce ? 0 : 1.15 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && $(id) && lenis) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); closeMenu(); }
    }));

  // AOS (one-shot reveals) with fallbacks
  if (window.AOS) {
    AOS.init({ duration: reduce ? 0 : 800, once: true, offset: 80, easing: 'ease-out-cubic' });
    addEventListener('load', () => AOS.refresh());
    setTimeout(() => {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('aos-animate'); io.unobserve(e.target); }
      }), { threshold: .1 });
      $$('[data-aos]:not(.aos-animate)').forEach(el => io.observe(el));
    }, 2500);
  } else {
    $$('[data-aos]').forEach(el => el.removeAttribute('data-aos'));
  }

  // Image fallback
  $$('img').forEach(i => i.addEventListener('error', () => { i.style.visibility = 'hidden'; }));

  // Nav: solid on scroll + mobile menu
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  const setSolid = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', setSolid, { passive: true }); setSolid();
  function closeMenu() { menu.classList.remove('open'); nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); }
  burger.addEventListener('click', () => {
    const o = menu.classList.toggle('open');
    nav.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o);
    if (lenis) o ? lenis.stop() : lenis.start();
  });
  addEventListener('keydown', e => e.key === 'Escape' && closeMenu());
  addEventListener('resize', () => innerWidth > 860 && closeMenu());

  // Active menu state
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('#menu a:not(.btn)').forEach(a => {
    const on = a.getAttribute('href').toLowerCase() === page;
    a.classList.toggle('active', on);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });

  // Department tabs (accessible: click, arrow keys, Home/End)
  const tabs = $$('[role="tab"]'), panels = $$('[role="tabpanel"]');
  function select(tab, focus) {
    tabs.forEach(x => { const on = x === tab; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    panels.forEach(p => {
      const on = p.id === tab.getAttribute('aria-controls'), was = !p.hidden;
      p.hidden = !on;
      if (on && !was && G && !reduce) {
        gsap.fromTo($$('.sv-p-body > *', p), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .06, ease: 'power3.out', clearProps: 'transform,opacity' });
        gsap.fromTo($('.sv-p-img img', p), { scale: 1.12 }, { scale: 1, duration: 1, ease: 'power2.out', clearProps: 'transform' });
      }
    });
    if (focus) tab.focus();
    if (tab.scrollIntoView && innerWidth <= 860) tab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const k = e.key, n = tabs.length;
      const next = k === 'ArrowDown' || k === 'ArrowRight' ? (i + 1) % n : k === 'ArrowUp' || k === 'ArrowLeft' ? (i - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
      if (next > -1) { e.preventDefault(); select(tabs[next], true); }
    });
  });
  // Hero directory rows open the matching tab
  $$('.sv-dir').forEach(a => a.addEventListener('click', () => { const t = $('#t-' + a.dataset.tab); t && select(t); }));

  // FAQ: keep one answer open at a time
  const faqs = $$('.sv-q');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
    window.AOS && AOS.refresh(); G && ScrollTrigger.refresh();
  }));

  if (G && !reduce) {
    // Hero intro: one orchestrated sequence
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .from('.crumbs', { y: 16, opacity: 0, duration: .5 })
      .from('.sv-hero .kicker', { y: 20, opacity: 0, duration: .6 }, '-=.2')
      .from('.sv-hero h1', { y: 40, opacity: 0, duration: .9 }, '-=.3')
      .from('.sv-hero .lead, .sv-hero .hero-actions, .sv-mini', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
      .from('.sv-board', { y: 60, opacity: 0, duration: 1, ease: 'power4.out' }, 0.3)
      .from('.sv-dir', { x: 30, opacity: 0, duration: .6, stagger: .1 }, '-=.5');
    // Hold the intro until the preloader lifts, so the heading animation is actually seen
    { const pre = document.getElementById('preloader'), go = () => heroTl.play();
      pre && !pre.classList.contains('is-done') ? addEventListener('preloader:done', go, { once: true }) : go(); }

    // Results ledger: rows slide in
    gsap.from('.sv-ledger tbody tr', { x: -40, opacity: 0, duration: .7, stagger: .12, ease: 'power3.out',
      scrollTrigger: { trigger: '.sv-ledger', start: 'top 85%', once: true } });

    // CTA: ECG line draws once
    const p = $('#ctaEcg');
    if (p) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      ScrollTrigger.create({ trigger: '.sv-cta', start: 'top 75%', once: true,
        onEnter: () => gsap.to(p, { strokeDashoffset: 0, duration: 2.2, ease: 'none' }) });
    }
  }

  if (G) addEventListener('load', () => ScrollTrigger.refresh());
})();