(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  AOS.init({ duration: reduce ? 0 : 800, once: true, offset: 60, easing: 'ease-out-cubic' });

  
  document.getElementById('goBack').addEventListener('click', () => {
    let saved = null, internal = false;
    try {
      const s = JSON.parse(sessionStorage.getItem('cameFrom') || 'null');
      if (s && s.url && Date.now() - s.t < 10 * 60 * 1000 && new URL(s.url).origin === location.origin) saved = s.url;
      sessionStorage.removeItem('cameFrom');
    } catch (e) { }
    try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { }
    if ((internal || saved) && history.length > 1) history.back();
    else location.href = saved || 'index.html';
  });

  // Show the address that was requested
  const reqPath = document.getElementById('reqPath');
  reqPath.textContent = location.pathname.split('/').slice(-2).join('/') || '/';
  reqPath.title = location.pathname;

  // Monitor elements
  const trace = document.getElementById('trace'), dot = document.getElementById('traceDot'),
    ring = document.getElementById('ring'), bpm = document.getElementById('bpm'),
    status = document.getElementById('status'), led = document.querySelector('.mon-dot');
  const len = trace.getTotalLength();

  const flatline = () => {
    ring.classList.add('flat'); led.classList.add('off');
    bpm.textContent = '0'; status.textContent = "No pulse at this address. Let's find the right page.";
  };

  if (reduce) { gsap.set(trace, { strokeDasharray: len, strokeDashoffset: 0 }); dot.setAttribute('cx', 600); flatline(); return; }

  gsap.set(trace, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(dot, { opacity: 0 });

  // Page-load sequence: text in, monitor reveals, trace beats then flatlines
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.nf .kicker', { y: 20, opacity: 0, duration: .6 })
    .from('.nf h1', { y: 40, opacity: 0, duration: .9 }, '-=.3')
    .from('.nf .lead, .nf .hero-actions', { y: 24, opacity: 0, duration: .7, stagger: .12 }, '-=.5')
    .from('.monitor', { clipPath: 'inset(100% 0 0 0)', duration: 1.1, ease: 'power4.inOut' }, 0.2)
    .from('.mon-code span', { y: 40, opacity: 0, duration: .7, stagger: .12 }, '-=.4');

  const pulse = gsap.to(ring, { scale: 1.1, duration: .35, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true });
  const st = { p: 0 };
  tl.add(() => { pulse.play(); gsap.set(dot, { opacity: 1 }); });
  tl.to(st, {
    p: 1, duration: 4.2, ease: 'none',
    onUpdate() {
      trace.style.strokeDashoffset = len * (1 - st.p);
      const pt = trace.getPointAtLength(len * st.p);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      // heartbeat fades out as the line approaches the flat section
      const f = Math.min(1, Math.max(0, (st.p - .5) / .2));
      bpm.textContent = Math.round(72 * (1 - f));
    },
    onComplete() {
      pulse.pause(); gsap.to(ring, { scale: 1, duration: .3 });
      flatline();
      gsap.to(dot, { opacity: .2, duration: .5, yoyo: true, repeat: -1, ease: 'none' });
      gsap.from(status, { y: 8, opacity: 0, duration: .5 });
    }
  });
})();