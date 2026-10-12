(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  AOS.init({ duration: reduce ? 0 : 800, once: true, offset: 40, easing: 'ease-out-cubic' });

  /* ---------- helpers ---------- */
  const setErr = (input, text) => {
    const f = input.closest('.field') || input.closest('.check');
    f.classList.toggle('bad', !!text);
    const e = f.querySelector('.err'); if (e) e.textContent = text || '';
    input.setAttribute('aria-invalid', !!text);
    return !text;
  };
  const shake = el => { if (!reduce) gsap.fromTo(el, { x: 0 }, { keyframes: { x: [-10, 10, -6, 6, 0] }, duration: .45, ease: 'none', clearProps: 'transform' }); };

  // Show / hide password
  $$('.pw-toggle').forEach(b => b.addEventListener('click', () => {
    const i = b.parentElement.querySelector('input'), show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.firstElementChild.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
  }));

  // Brand panel intro + ECG
  const ecg = $('#ecgPath');
  if (ecg && !reduce) {
    const len = ecg.getTotalLength();
    gsap.set(ecg, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(ecg, { strokeDashoffset: 0, duration: 2.4, ease: 'none', delay: .5 });
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.au-brand .kicker', { y: 20, opacity: 0, duration: .6 })
      .from('.au-brand h1', { y: 36, opacity: 0, duration: .8 }, '-=.3')
      .from('.au-brand .lead, .au-ticks li', { y: 20, opacity: 0, duration: .6, stagger: .1 }, '-=.4')
      .from('.au-arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.1, ease: 'power4.inOut' }, 0.3);
  }

  /* ---------- LOGIN ---------- */
  const login = $('#loginForm');
  if (login) {
    const targets = { user: 'patient-dashboard.html', admin: 'doctor-dashboard.html' };
    const copy = {
      user: { t: 'Welcome back', s: 'Sign in to see your appointments, reports and prescriptions.', b: 'Sign in as Patient' },
      admin: { t: 'Doctor sign in', s: 'Manage patients and clinic reports.', b: 'Sign in as Doctor' }
    };
    let role = 'user';
    const box = $('#role'), tabs = $$('.role button'), msg = $('#msg');
    const setRole = r => {
      role = r; box.dataset.role = r;
      tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.role === r));
      $('#title').textContent = copy[r].t; $('#sub').textContent = copy[r].s; $('#submitBtn').textContent = copy[r].b;
      msg.textContent = '';
      if (!reduce) gsap.fromTo('#title, #sub', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .08, clearProps: 'all' });
    };
    tabs.forEach(t => t.addEventListener('click', () => setRole(t.dataset.role)));

    if (new URLSearchParams(location.search).get('signup') === 'success') {
      $('#notice').hidden = false;
      // Clean the URL so ?signup=success is not left in the address bar
      try { history.replaceState(null, '', location.pathname); } catch (_) {}
    }

    const email = login.email, pass = login.password;
    const vEmail = () => setErr(email, !email.value.trim() ? 'Enter your email address.' : !emailRe.test(email.value.trim()) ? 'Enter a valid email, like name@example.com.' : '');
    const vPass = () => setErr(pass, !pass.value ? 'Enter your password.' : pass.value.length < 8 ? 'Password must be at least 8 characters.' : '');
    email.addEventListener('blur', vEmail); pass.addEventListener('blur', vPass);
    email.addEventListener('input', () => email.closest('.field').classList.contains('bad') && vEmail());
    pass.addEventListener('input', () => pass.closest('.field').classList.contains('bad') && vPass());

    login.addEventListener('submit', e => {
      e.preventDefault();
      const a = vEmail(), b = vPass();
      if (!(a && b)) { msg.className = 'msg'; msg.style.color = '#c0392b'; msg.textContent = 'Please fix the highlighted fields.'; shake(login); (a ? pass : email).focus(); return; }
      // Validation only: nothing is stored or checked. Only the email is passed to the dashboard header.
      const mail = email.value.trim(); pass.value = '';
      msg.style.color = ''; msg.className = 'msg ok'; msg.textContent = 'Signing you in…';
      $('#submitBtn').disabled = true;
      setTimeout(() => { location.href = targets[role] + '?email=' + encodeURIComponent(mail); }, reduce ? 0 : 800);
    });

  }

  /* ---------- SIGNUP ---------- */
  const signup = $('#signupForm');
  if (signup) {
    const f = signup, msg = $('#msg');
    const rules = {
      name: v => !v.trim() ? 'Enter your full name.' : !/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(v.trim()) ? 'Use letters only, at least 2 characters.' : '',
      email: v => !v.trim() ? 'Enter your email address.' : !emailRe.test(v.trim()) ? 'Enter a valid email, like name@example.com.' : '',
      phone: v => { const d = v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''); return !v.trim() ? 'Enter your phone number.' : !/^[6-9]\d{9}$/.test(d) ? 'Enter a valid 10-digit mobile number.' : ''; },
      role: v => !v ? 'Please select your role.' : '',
      password: v => !v ? 'Create a password.' : v.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Include at least one letter and one number.' : '',
      confirm: v => !v ? 'Confirm your password.' : v !== f.password.value ? 'Passwords do not match.' : '',
      terms: () => f.terms.checked ? '' : 'Please accept the terms to continue.'
    };
    const check = n => setErr(f[n], rules[n](f[n].type === 'checkbox' ? '' : f[n].value));
    Object.keys(rules).forEach(n => {
      f[n].addEventListener(n === 'terms' ? 'change' : 'blur', () => check(n));
      f[n].addEventListener('input', () => { const w = f[n].closest('.field, .check'); w.classList.contains('bad') && check(n); });
    });

    // Re-check confirm field when password changes
    f.password.addEventListener('input', () => { if (f.confirm.value) check('confirm'); });

    f.addEventListener('submit', e => {
      e.preventDefault();
      const res = Object.keys(rules).map(check);
      if (res.includes(false)) {
        msg.className = 'msg'; msg.style.color = '#c0392b'; msg.textContent = 'Please fix the highlighted fields.';
        shake(f); const bad = $('.bad input, .bad select', f); bad && bad.focus(); return;
      }
      // Redirect to the login page after successful signup
      f.reset();
      msg.style.color = ''; msg.className = 'msg ok';
      msg.textContent = 'Account created! Taking you to sign in…';
      $('#submitBtn').disabled = true;
      setTimeout(() => { location.href = 'login.html?signup=success'; }, reduce ? 600 : 1500);
    });
  }
})();