(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll (Lenis) driven by GSAP's ticker
  const lenis = new Lenis({ duration: reduce ? 0 : 1.15 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); closeMenu(); }
    }));

  AOS.init({ duration: reduce ? 0 : 800, once: true, offset: 80, easing: 'ease-out-cubic' });

  // Image fallback if a remote photo fails to load
  document.querySelectorAll('img').forEach(i => i.addEventListener('error', () => { i.style.visibility = 'hidden'; }));

  // Nav: solid on scroll + mobile menu
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

  // Active menu state: highlight the link that matches the current page
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('#menu a:not(.btn)').forEach(a => {
    const on = a.getAttribute('href').toLowerCase() === page;
    a.classList.toggle('active', on);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });

  if (!reduce) {
    // Hero intro: one orchestrated sequence
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .from('.kicker', { y: 20, opacity: 0, duration: .6 })
      .from('.hero h1', { y: 40, opacity: 0, duration: .9 }, '-=.3')
      .from('.hero .lead, .hero-actions, .hero-points', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
      .from('.arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'power4.inOut' }, 0.2)
      .from('.hero-bar', { y: 40, opacity: 0, duration: .8 }, '-=.3');
    // Hold the intro until the preloader lifts, so the heading animation is actually seen
    { const pre = document.getElementById('preloader'), go = () => heroTl.play();
      pre && !pre.classList.contains('is-done') ? addEventListener('preloader:done', go, { once: true }) : go(); }

    // ECG line draws as the hero scrolls
    const p = document.getElementById('ecgPath'), len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(p, { strokeDashoffset: 0, duration: 2.2, ease: 'none', delay: .6 });
    gsap.to('.ecg', { yPercent: 200, opacity: 0, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Parallax on photos
    gsap.utils.toArray('.px').forEach((el, i) =>
      gsap.to(el, { yPercent: i ? -12 : 8, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.to('.arch img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-bg img', { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  }

  // Count-up stats
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || (el.hasAttribute('data-plus') ? '+' : ''), o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true, onEnter: () =>
        gsap.to(o, { v: end, duration: reduce ? 0 : 2, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-IN') + suf })
    });
  });

  // FAQ accordion (GSAP height tween)
  document.querySelectorAll('.acc-item').forEach(item => {
    const btn = item.querySelector('button'), panel = item.querySelector('div');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.acc-item').forEach(o => {
        o.querySelector('button').setAttribute('aria-expanded', 'false');
        gsap.to(o.querySelector('div'), { height: 0, duration: .35 });
      });
      if (!open) { btn.setAttribute('aria-expanded', 'true'); gsap.to(panel, { height: 'auto', duration: .4 }); }
      setTimeout(() => ScrollTrigger.refresh(), 450);
    });
  });

  // Booking form: basic validation + confirmation
  const form = document.getElementById('form'), msg = document.getElementById('msg');
  form.date.min = new Date().toISOString().split('T')[0];
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = ['name', 'phone', 'date'].filter(n => !form[n].value.trim());
    ['name', 'phone', 'date'].forEach(n => form[n].classList.toggle('bad', bad.includes(n)));
    if (bad.length) { msg.style.color = '#c0392b'; msg.textContent = 'Please fill in your name, phone and preferred date.'; return; }
    // Valid: clear every field and the message, then go to the 404 page
    msg.style.color = ''; msg.textContent = '';
    form.reset();
    location.assign('404.html');
  });
  // If the visitor comes back with the browser's Back button, make sure the form is empty
  addEventListener('pageshow', e => { if (e.persisted) { form.reset(); msg.textContent = ''; } });

  // Services: expanding panels (hover on desktop, tap on mobile)
  const panels = [...document.querySelectorAll('.panel')];
  const pick = p => panels.forEach(x => x.classList.toggle('active', x === p));
  panels.forEach(p => {
    p.addEventListener('click', () => {
      pick(p);
      // On phones the open panel above collapses, so bring the tapped one back into view
      if (!matchMedia('(min-width:861px)').matches) setTimeout(() => {
        const t = p.getBoundingClientRect().top;
        if (t < 90 || t > innerHeight * .5) lenis.scrollTo(p, { offset: -90 });
      }, 650);
    });
    p.addEventListener('focus', () => pick(p));
    p.addEventListener('mouseenter', () => matchMedia('(min-width:861px)').matches && pick(p));
  });

  // Doctors: dot indicators under the swipeable row (phones and tablets only, hidden by CSS on desktop)
  const drGrid = document.querySelector('.dr-grid');
  if (drGrid && drGrid.children.length > 1) {
    const cards = [...drGrid.children], wrap = document.createElement('div');
    wrap.className = 'dr-dots'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Choose a doctor');
    const dotEls = cards.map((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show doctor ' + (i + 1));
      b.addEventListener('click', () => drGrid.scrollTo({ left: c.offsetLeft - cards[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' }));
      wrap.appendChild(b); return b;
    });
    drGrid.after(wrap);
    const sync = () => {
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - cards[0].offsetLeft - drGrid.scrollLeft); if (d < dist) { dist = d; best = i; } });
      if (drGrid.scrollLeft + drGrid.clientWidth >= drGrid.scrollWidth - 4 && drGrid.scrollWidth > drGrid.clientWidth) best = cards.length - 1;
      dotEls.forEach((b, i) => { b.classList.toggle('on', i === best); i === best ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    };
    drGrid.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();

    // Auto-scroll: move to the next doctor every 4 seconds while the row is on screen.
    // Pauses when the visitor touches, hovers or focuses it, and resumes a few seconds later.
    const swipeMq = matchMedia('(max-width:860px)');
    let auto = null, onScreen = false, held = false, resumeT;
    const goTo = i => drGrid.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
    const stopAuto = () => { clearInterval(auto); auto = null; };
    const startAuto = () => {
      stopAuto();
      if (reduce || held || !onScreen || !swipeMq.matches) return;
      auto = setInterval(() => { const i = dotEls.findIndex(b => b.classList.contains('on')); goTo((i + 1) % cards.length); }, 2000);
    };
    const hold = () => { held = true; stopAuto(); clearTimeout(resumeT); };
    const release = (delay = 5000) => { clearTimeout(resumeT); resumeT = setTimeout(() => { held = false; startAuto(); }, delay); };
    ['touchstart', 'pointerdown', 'wheel'].forEach(ev => drGrid.addEventListener(ev, hold, { passive: true }));
    ['touchend', 'touchcancel', 'pointerup'].forEach(ev => drGrid.addEventListener(ev, () => release(), { passive: true }));
    wrap.addEventListener('pointerdown', hold); wrap.addEventListener('pointerup', () => release());
    drGrid.addEventListener('focusin', hold); drGrid.addEventListener('focusout', () => release(2000));
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; startAuto(); }, { threshold: .4 }).observe(drGrid);
    swipeMq.addEventListener('change', startAuto);
    document.addEventListener('visibilitychange', () => document.hidden ? stopAuto() : startAuto());
  }

  // Reviews: rotating testimonial with dot controls
  const slides = [...document.querySelectorAll('.slide')], dots = document.getElementById('dots');
  let cur = 0, timer;
  slides.forEach((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Show review ' + (i + 1)); b.onclick = () => { show(i); }; dots.appendChild(b); });
  function show(i) { cur = i; slides.forEach((s, k) => s.classList.toggle('on', k === i));[...dots.children].forEach((d, k) => d.classList.toggle('on', k === i)); clearInterval(timer); if (!reduce) timer = setInterval(() => show((cur + 1) % slides.length), 6000); }
  document.getElementById('prev').addEventListener('click', () => show((cur - 1 + slides.length) % slides.length));
  document.getElementById('next').addEventListener('click', () => show((cur + 1) % slides.length));
  show(0);
})();