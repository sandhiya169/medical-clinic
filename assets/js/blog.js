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

  // Article filter + sort (GSAP animates only the inner link, AOS owns the <li>)
  const grid = $('#grid'), cards = $$('.bl-card'), chips = $$('.bl-filters button'), sortSel = $('#sort'), empty = $('#empty'), count = $('#count');
  const first = new Map(cards.map((c, i) => [c, i]));                           // original order
  const mins = c => parseInt($('.bl-by span:last-child', c).textContent, 10) || 0; // "5 min read" -> 5
  let cat = 'all', t;
  function apply(reflow) {
    const mode = sortSel.value;
    [...cards].sort((a, b) =>
      mode === 'short' ? mins(a) - mins(b) || first.get(a) - first.get(b) :
      mode === 'long' ? mins(b) - mins(a) || first.get(a) - first.get(b) :
      first.get(a) - first.get(b)
    ).forEach(c => grid.appendChild(c));
    let n = 0;
    cards.forEach(c => {
      const ok = cat === 'all' || c.dataset.cat === cat;
      const was = !c.hidden;
      c.hidden = !ok;
      if (!ok) return;
      n++;
      if ((!was || reflow === true) && G && !reduce) gsap.fromTo($('.bl-card-in', c), { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: .5, ease: 'power3.out', delay: n * .05, clearProps: 'transform,opacity' });
    });
    empty.hidden = n > 0;
    count.textContent = n + (n === 1 ? ' article' : ' articles');
    clearTimeout(t);
    t = setTimeout(() => { window.AOS && AOS.refresh(); G && ScrollTrigger.refresh(); }, 300);
  }
  chips.forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    chips.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    apply();
  }));
  sortSel.addEventListener('change', () => apply(true));

  // Quick reads strip: arrows + progress bar
  const strip = $('#strip'), bar = $('#bar');
  const prog = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    const w = Math.min(100, strip.clientWidth / strip.scrollWidth * 100);
    bar.style.width = w + '%';
    bar.style.marginLeft = (max > 0 ? strip.scrollLeft / max * (100 - w) : 0) + '%';
  };
  const step = () => (strip.firstElementChild ? strip.firstElementChild.offsetWidth + 16 : 300);
  $('#prev').addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
  $('#next').addEventListener('click', () => strip.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
  strip.addEventListener('scroll', prog, { passive: true });
  addEventListener('resize', prog); prog();

  // Marquee: cards glide across continuously and loop seamlessly.
  // Pauses on hover / focus / touch, when off-screen, and with the pause button.
  // Reduced-motion visitors keep the normal swipe/arrow strip instead.
  const play = $('#play'), playIcon = play.querySelector('i'), sec = $('#quick');
  if (reduce) {
    play.hidden = true;
  } else {
    const SPEED = 45;                                  // pixels per second
    const cardsList = [...strip.children];
    const track = document.createElement('div');
    track.className = 'bl-mq-track';
    cardsList.forEach(c => track.appendChild(c));
    strip.appendChild(track);
    // repeat the set until one half is wider than the screen, then duplicate that half for the loop
    const setW = track.scrollWidth || 1;
    const reps = Math.max(1, Math.ceil(Math.max(innerWidth, screen.width) / setW));
    const half = [];
    for (let r = 0; r < reps; r++) cardsList.forEach(c => half.push(r === 0 ? c : c.cloneNode(true)));
    half.forEach(c => { if (!c.parentNode) track.appendChild(c); });
    half.forEach(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); track.appendChild(k); });
    $$('.bl-tip', track).forEach(c => { if (c.getAttribute('aria-hidden')) c.querySelectorAll('a,button').forEach(x => x.tabIndex = -1); });
    sec.classList.add('mq');
    strip.removeAttribute('tabindex');
    const setDur = () => track.style.setProperty('--mq-dur', (track.scrollWidth / 2 / SPEED) + 's');
    setDur(); addEventListener('resize', setDur); addEventListener('load', setDur);

    let userPaused = false;
    const toggle = on => {
      userPaused = !on;
      strip.classList.toggle('paused', userPaused);
      play.setAttribute('aria-pressed', String(userPaused));
      play.setAttribute('aria-label', on ? 'Pause scrolling' : 'Play scrolling');
      playIcon.className = on ? 'fas fa-pause' : 'fas fa-play';
    };
    play.addEventListener('click', () => toggle(userPaused));
    // touch: hold while a finger is down, resume shortly after
    let tt;
    strip.addEventListener('touchstart', () => { clearTimeout(tt); strip.classList.add('hold'); }, { passive: true });
    strip.addEventListener('touchend', () => { tt = setTimeout(() => strip.classList.remove('hold'), 2500); }, { passive: true });
    // only animate while the section is on screen
    if ('IntersectionObserver' in window)
      new IntersectionObserver(es => strip.classList.toggle('off', !es[0].isIntersecting), { threshold: .05 }).observe(strip);
  }

  // Newsletter form
  const nf = $('#newsForm'), nm = $('#newsMsg');
  nf.addEventListener('submit', e => {
    e.preventDefault();
    const em = nf.email, ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
    em.classList.toggle('bad', !ok);
    if (!ok) { nm.style.color = '#c0392b'; nm.textContent = 'Please enter a valid email address.'; return; }
    nm.style.color = ''; nm.textContent = '';
    nf.reset();                         // clear the fields
    window.location.href = '404.html';  // redirect to the 404 page
  });
  // If the user comes back with the Back button, make sure the form is clean
  addEventListener('pageshow', () => { nf.reset(); nm.textContent = ''; nf.email.classList.remove('bad'); });

  if (G && !reduce) {
    // Hero intro: one orchestrated sequence
    const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .from('.crumbs', { y: 16, opacity: 0, duration: .5 })
      .from('.bl-hero .eyebrow', { y: 20, opacity: 0, duration: .5 }, '-=.2')
      .from('.bl-hero h1', { y: 40, opacity: 0, duration: .9 }, '-=.3')
      .from('.bl-hero .lead, .bl-hero .hero-actions', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
      .from('.bl-hero .trust li', { y: 16, opacity: 0, duration: .5, stagger: .08 }, '-=.4')
      .from('.bl-hero .b-ring', { scale: .9, opacity: 0, duration: 1.1, transformOrigin: '50% 50%' }, .1)
      .from('.bl-hero .arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.1, ease: 'power4.inOut' }, .2)
      .from('.bl-hero .float-card', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)' }, '-=.3')
      .from('.bl-hero .float-chip', { scale: .6, opacity: 0, duration: .5, ease: 'back.out(2)' }, '-=.35');
    // Hold the intro until the preloader lifts, so the heading animation is actually seen
    { const pre = document.getElementById('preloader'), go = () => heroTl.play();
      pre && !pre.classList.contains('is-done') ? addEventListener('preloader:done', go, { once: true }) : go(); }

    // Photo eases as the hero scrolls away
    gsap.to('.bl-hero .arch img', {
      scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: '.bl-hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Parallax inside photo frame
    $$('.bl-par > img').forEach(img => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // Gauges: healthy band grows from its left edge
    $$('.bl-zone').forEach(z => gsap.fromTo(z, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: z, start: 'top 90%', once: true } }));

    // Tip cards slide in as the strip enters
    gsap.from('.bl-tip', { x: 60, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out',
      scrollTrigger: { trigger: '.bl-strip', start: 'top 85%', once: true } });

    // CTA: ECG line draws once
    const p = $('#ctaEcg');
    if (p) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      ScrollTrigger.create({ trigger: '.bl-cta', start: 'top 75%', once: true,
        onEnter: () => gsap.to(p, { strokeDashoffset: 0, duration: 2.2, ease: 'none' }) });
    }
  }

  if (G) addEventListener('load', () => ScrollTrigger.refresh());
})();