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

  // Image fallback if a remote photo fails to load
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

  // Count-up stats
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || (el.hasAttribute('data-plus') ? '+' : ''), o = { v: 0 };
    const set = v => el.textContent = Math.round(v).toLocaleString('en-IN') + suf;
    if (!G) return set(end);
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () =>
      gsap.to(o, { v: end, duration: reduce ? 0 : 2, ease: 'power2.out', onUpdate: () => set(o.v) }) });
  });

  // Timeline fallback state (no GSAP or reduced motion): everything lit
  const litAll = () => $$('.tl-item').forEach(li => li.classList.add('lit'));

  if (G && !reduce) {
    // 1. Hero intro: one orchestrated sequence
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .from('.crumbs', { y: 16, opacity: 0, duration: .5 })
      .from('.ab-hero .kicker', { y: 20, opacity: 0, duration: .6 }, '-=.2')
      .from('.ab-hero h1', { y: 40, opacity: 0, duration: .9 }, '-=.3')
      .from('.ab-hero .lead, .ab-hero .hero-actions, .ab-mini', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
      .from('.ab-arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'power4.inOut' }, 0.2)
      .from('.ab-circle', { scale: .5, opacity: 0, duration: .8, ease: 'back.out(1.8)' }, 0.9)
      .from('.ab-pill', { scale: .5, opacity: 0, duration: .8, ease: 'back.out(1.8)' }, 1.05)
      .from('.ab-seal', { scale: 0, rotation: -90, opacity: 0, duration: .8, ease: 'back.out(2)' }, 1.2);
    // Hold the intro until the preloader lifts, so the heading animation is actually seen
    { const pre = document.getElementById('preloader'), go = () => heroTl.play();
      pre && !pre.classList.contains('is-done') ? addEventListener('preloader:done', go, { once: true }) : go(); }

    // Seal text turns slowly; photos float gently
    gsap.to('.seal-ring', { rotation: 360, svgOrigin: '60 60', duration: 24, repeat: -1, ease: 'none' });
    gsap.to('.ab-circle', { y: -10, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.ab-pill', { y: 10, duration: 3.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.ab-arch img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.ab-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // 2. Statement: words fill in as you scroll
    const st = $('.ab-statement');
    if (st) {
      const words = st.textContent.trim().split(/\s+/);
      st.textContent = '';
      words.forEach(w => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; st.append(s, ' '); });
      gsap.fromTo('.ab-statement .w', { opacity: .15 }, { opacity: 1, stagger: .1, ease: 'none',
        scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 55%', scrub: true } });
    }

    // 3. Timeline: line draws, dots light up
    gsap.fromTo('.tl-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.tl-wrap', start: 'top 60%', end: 'bottom 60%', scrub: true } });
    $$('.tl-item').forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 62%',
      onEnter: () => li.classList.add('lit'), onLeaveBack: () => li.classList.remove('lit') }));

    // 4 + 6. Parallax inside photo frames (inner image only, so AOS on the frame never conflicts)
    $$('.ab-par img').forEach(img => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // 5. Team: earlier cards recede as the next one slides over (desktop only)
    gsap.matchMedia().add('(min-width:861px)', () => {
      const cards = $$('.ab-card');
      cards.forEach((c, i) => {
        if (!cards[i + 1]) return;
        gsap.to(c, { scale: .95, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top 90%', end: 'top 20%', scrub: true } });
      });
    });

    // 6. Marquee: endless loop, pauses on hover
    const mq = $('.ab-marquee'), track = $('.ab-track');
    if (mq && track) {
      const set = track.innerHTML;
      track.insertAdjacentHTML('beforeend', set + set);
      $$('.ab-track span').forEach((s, i) => i >= track.children.length / 3 && s.setAttribute('aria-hidden', 'true'));
      const loop = gsap.to(track, { xPercent: -33.333, duration: 22, repeat: -1, ease: 'none' });
      mq.addEventListener('mouseenter', () => loop.pause());
      mq.addEventListener('mouseleave', () => loop.play());
    }

    // 7. CTA: ECG line draws once
    const p = $('#ctaEcg');
    if (p) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      ScrollTrigger.create({ trigger: '.ab-cta', start: 'top 75%', once: true,
        onEnter: () => gsap.to(p, { strokeDashoffset: 0, duration: 2.2, ease: 'none' }) });
    }
  } else {
    litAll();
    const mq = $('.ab-marquee');
    mq && mq.classList.add('static');
  }

  // Values: mark the principle currently in view
  const vItems = $$('.val-item');
  if (vItems.length && window.IntersectionObserver) {
    const vio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) vItems.forEach(el => el.classList.toggle('on', el === e.target));
    }), { rootMargin: '-45% 0px -45% 0px' });
    vItems.forEach(el => vio.observe(el));
  }

  if (G) addEventListener('load', () => ScrollTrigger.refresh());
})();