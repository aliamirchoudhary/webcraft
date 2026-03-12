/* ============================================================
   WebCraft – script.js
   ============================================================ */

/* ── 0. Enable CSS reveal animations only when JS runs ── */
document.documentElement.classList.add('js-loaded');

/* ============================================================
   1. CANVAS PARTICLE BACKGROUND
   ============================================================ */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles, animId, t = 0;
  let mouse = { x: -9999, y: -9999 };

  /* Track mouse for repulsion */
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticle(fromEdge) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.4 + 0.08;
    return {
      x: fromEdge ? (Math.random() < 0.5 ? 0 : W) : Math.random() * W,
      y: fromEdge ? (Math.random() < 0.5 ? 0 : H) : Math.random() * H,
      r: Math.random() * 2 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.08,
      alpha: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      /* phase offset for twinkle */
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.02 + 0.005,
      life: 0,
      maxLife: Math.random() * 500 + 300,
    };
  }

  function initParticles() {
    const count = Math.min(Math.floor((W * H) / 9000), 160);
    particles = Array.from({ length: count }, () => makeParticle(false));
  }

  /* Subtle flowing gradient overlay */
  function drawBackground() {
    const cx = W / 2 + Math.sin(t * 0.0004) * W * 0.15;
    const cy = H / 2 + Math.cos(t * 0.0003) * H * 0.1;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    grad.addColorStop(0, `rgba(30, 60, 40, ${0.06 + Math.sin(t * 0.0005) * 0.02})`);
    grad.addColorStop(0.5, `rgba(20, 40, 30, ${0.03})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    t++;
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    const maxDist = 150;
    const mouseRepel = 100;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life++;

      /* Mouse repulsion */
      const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < mouseRepel && mdist > 0) {
        const force = (1 - mdist / mouseRepel) * 0.8;
        p.x += (mdx / mdist) * force;
        p.y += (mdy / mdist) * force;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.phase += p.phaseSpeed;

      /* Fade in/out over lifetime */
      const lifeRatio = p.life / p.maxLife;
      const fadeFactor = lifeRatio < 0.1 ? lifeRatio / 0.1
                       : lifeRatio > 0.85 ? (1 - lifeRatio) / 0.15
                       : 1;
      /* Twinkle */
      const twinkle = 0.7 + Math.sin(p.phase) * 0.3;
      p.alpha = p.baseAlpha * fadeFactor * twinkle;

      if (p.life > p.maxLife || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        Object.assign(p, makeParticle(false));
        p.life = 0;
        continue;
      }

      /* Draw particle with glow on larger ones */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.r > 1.5) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(153,255,204,${p.alpha * 0.8})`;
      }
      ctx.fillStyle = `rgba(153,255,204,${p.alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* Draw connections */
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const op = (1 - dist / maxDist) * Math.min(p.alpha, q.alpha) * 0.9;
          if (op < 0.005) continue;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(153,255,204,${op})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(draw);
  }

  resize();
  initParticles();
  draw();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cancelAnimationFrame(animId);
      resize();
      initParticles();
      draw();
    }, 150);
  });
})();

/* ============================================================
   2. HEADER – sticky shadow
   ============================================================ */
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* ============================================================
   3. HAMBURGER MENU
   ============================================================ */
const hamburger = document.getElementById('hamburger');
const mainNav   = document.getElementById('main-nav');

function closeNav() {
  mainNav.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

hamburger.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeNav));
document.addEventListener('click', e => { if (!header.contains(e.target)) closeNav(); });

/* ============================================================
   4. SMOOTH SCROLL
   ============================================================ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
  window.scrollTo({ top, behavior: 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const id = href.slice(1);
    if (document.getElementById(id)) {
      e.preventDefault();
      closeNav();
      scrollToSection(id);
    }
  });
});

/* ============================================================
   5. SCROLL SPY
   ============================================================ */
const allSections = document.querySelectorAll('main .section');
const allNavLinks = document.querySelectorAll('.main-nav .nav-link');

const spyObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      allNavLinks.forEach(l =>
        l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`)
      );
    }
  });
}, { rootMargin: `-${header.offsetHeight}px 0px -50% 0px`, threshold: 0 });

allSections.forEach(s => spyObs.observe(s));

/* ============================================================
   6. REVEAL ON SCROLL
   ============================================================ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -50px 0px', threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ============================================================
   7. MODAL SYSTEM
   ============================================================ */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
}

function closeModal(overlay) {
  overlay.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay);
  });
  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal(overlay));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not([hidden])').forEach(closeModal);
  }
});

/* Service card → modal (not when Order btn clicked) */
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('click', e => {
    if (e.target.closest('.order-from-service')) return;
    const modalId = card.dataset.modal;
    if (modalId) openModal(modalId);
  });
});

/* Kind card → modal */
document.querySelectorAll('.kind-card').forEach(card => {
  card.addEventListener('click', () => {
    const modalId = card.dataset.modal;
    if (modalId) openModal(modalId);
  });
});

/* "Order This Package" inside modals */
document.querySelectorAll('.modal-order-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const serviceName = btn.dataset.service;
    document.querySelectorAll('.modal-overlay:not([hidden])').forEach(closeModal);
    prefillOrder(serviceName);
    scrollToSection('order');
  });
});

/* ============================================================
   8. ORDER SECTION – PRE-FILL LOGIC
   ============================================================ */
const orderBanner       = document.getElementById('order-banner');
const bannerServiceName = document.getElementById('banner-service-name');
const bannerChangeBtn   = document.getElementById('banner-change-btn');
const orderServiceArea  = document.getElementById('order-service-area');
const radioLabels       = document.querySelectorAll('.radio-label');
const serviceRadios     = document.querySelectorAll('input[name="service"]');

let selectedService = '';

function prefillOrder(serviceName) {
  selectedService = serviceName;

  bannerServiceName.textContent = serviceName;
  orderBanner.removeAttribute('hidden');
  orderServiceArea.style.display = 'none';

  serviceRadios.forEach(r => { r.checked = r.value === serviceName; });
  radioLabels.forEach(l => {
    const r = l.querySelector('input[type="radio"]');
    l.classList.toggle('selected', r && r.value === serviceName);
  });

  const svcErr = document.getElementById('service-error');
  if (svcErr) svcErr.textContent = '';
}

function clearPrefill() {
  selectedService = '';
  orderBanner.setAttribute('hidden', '');
  orderServiceArea.style.display = '';
  serviceRadios.forEach(r => { r.checked = false; });
  radioLabels.forEach(l => l.classList.remove('selected'));
}

bannerChangeBtn.addEventListener('click', clearPrefill);

/* Radio label visual toggle */
radioLabels.forEach(label => {
  label.addEventListener('click', () => {
    radioLabels.forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
    const radio = label.querySelector('input[type="radio"]');
    if (radio) selectedService = radio.value;
    const svcErr = document.getElementById('service-error');
    if (svcErr) svcErr.textContent = '';
  });
});

/* Order buttons on service cards */
document.querySelectorAll('.order-from-service').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    prefillOrder(btn.dataset.service);
    scrollToSection('order');
  });
});

/* Check URL param on load: ?service=Full-Stack */
(function checkURLParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const svc = params.get('service');
    if (svc) prefillOrder(decodeURIComponent(svc));
  } catch (_) {}
})();

/* ============================================================
   9. FORM VALIDATION HELPERS
   ============================================================ */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function setError(input, msg) {
  input.classList.add('error');
  input.classList.remove('valid');
  const err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = msg;
}

function setValid(input) {
  input.classList.remove('error');
  input.classList.add('valid');
  const err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = '';
}

function clearFieldState(input) {
  input.classList.remove('error', 'valid');
  const err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = '';
}

function attachLiveValidation(form) {
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('blur', () => {
      if (el.required && !el.value.trim()) {
        setError(el, 'This field is required.');
      } else if (el.type === 'email' && el.value && !isValidEmail(el.value)) {
        setError(el, 'Please enter a valid email address.');
      } else if (el.value.trim()) {
        setValid(el);
      } else {
        clearFieldState(el);
      }
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('error') && el.value.trim()) clearFieldState(el);
    });
  });
}

/* ============================================================
   FORM ERROR BANNER HELPER
   ============================================================ */
function showFormError(form, message) {
  /* Remove any existing error banner */
  const existing = form.querySelector('.form-server-error');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'form-server-error';
  banner.textContent = '⚠ ' + message;
  form.appendChild(banner);
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => banner.remove(), 8000);
}

/* ============================================================
   10. CONTACT FORM
   ============================================================ */
const contactForm    = document.getElementById('contact-form');
const contactSuccess = document.getElementById('contact-success');

attachLiveValidation(contactForm);

contactForm.addEventListener('submit', async e => {
  e.preventDefault();
  let valid = true;

  const name    = contactForm.querySelector('#c-name');
  const email   = contactForm.querySelector('#c-email');
  const confirm = contactForm.querySelector('#c-confirm-email');
  const message = contactForm.querySelector('#c-message');

  if (!name.value.trim())            { setError(name, 'Name is required.');               valid = false; } else setValid(name);
  if (!isValidEmail(email.value))    { setError(email, 'Please enter a valid email.');     valid = false; } else setValid(email);
  if (confirm.value !== email.value) { setError(confirm, 'Emails do not match.');          valid = false; } else if (confirm.value.trim()) setValid(confirm);
  if (!message.value.trim())         { setError(message, 'Message is required.');          valid = false; } else setValid(message);

  if (!valid) return;

  const submitBtn = contactForm.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  const payload = {
    name:    name.value.trim(),
    email:   email.value.trim(),
    subject: contactForm.querySelector('#c-subject').value,
    message: message.value.trim(),
  };

  try {
    const res = await fetch('/send-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      contactForm.reset();
      contactForm.querySelectorAll('input, textarea').forEach(clearFieldState);
      contactSuccess.removeAttribute('hidden');
      setTimeout(() => contactSuccess.setAttribute('hidden', ''), 6000);
    } else {
      /* Show server error message to user */
      showFormError(contactForm, data.message || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('Contact fetch error:', err);
    showFormError(contactForm, 'Could not reach the server. Make sure it is running on port 3000.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});

/* ============================================================
   11. ORDER FORM
   ============================================================ */
const orderForm    = document.getElementById('order-form');
const orderSuccess = document.getElementById('order-success');

attachLiveValidation(orderForm);

orderForm.addEventListener('submit', async e => {
  e.preventDefault();
  let valid = true;

  const name    = orderForm.querySelector('#o-name');
  const email   = orderForm.querySelector('#o-email');
  const confirm = orderForm.querySelector('#o-confirm-email');
  const qty     = orderForm.querySelector('#o-qty');
  const svcErr  = document.getElementById('service-error');

  /* Resolve service from state or checked radio */
  if (!selectedService) {
    const checked = orderForm.querySelector('input[name="service"]:checked');
    if (checked) selectedService = checked.value;
  }

  if (!selectedService) {
    svcErr.textContent = 'Please select a service first.';
    orderServiceArea.style.display = '';
    valid = false;
  } else {
    svcErr.textContent = '';
  }

  if (!name.value.trim())            { setError(name, 'Name is required.');            valid = false; } else setValid(name);
  if (!isValidEmail(email.value))    { setError(email, 'Please enter a valid email.'); valid = false; } else setValid(email);
  if (confirm.value !== email.value) { setError(confirm, 'Emails do not match.');      valid = false; } else if (confirm.value.trim()) setValid(confirm);

  if (!valid) return;

  const submitBtn = orderForm.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const payload = {
    service:     selectedService,
    name:        name.value.trim(),
    email:       email.value.trim(),
    quantity:    parseInt(qty.value) || 1,
    description: orderForm.querySelector('#o-desc').value.trim(),
    timeline:    orderForm.querySelector('#o-timeline').value,
  };

  try {
    const res = await fetch('/send-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      orderForm.reset();
      orderForm.querySelectorAll('input, textarea').forEach(clearFieldState);
      clearPrefill();
      orderSuccess.removeAttribute('hidden');
      setTimeout(() => orderSuccess.setAttribute('hidden', ''), 6000);
    } else {
      showFormError(orderForm, data.message || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('Order fetch error:', err);
    showFormError(orderForm, 'Could not reach the server. Make sure it is running on port 3000.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Order';
  }
});
