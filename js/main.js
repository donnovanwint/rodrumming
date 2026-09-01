// RoDrumming — shared front-end behavior
// Nav toggle, GSAP scroll reveals, animated snare/stick illustration, FAQ accordion.

document.addEventListener('DOMContentLoaded', function () {

  /* Lucide icons -------------------------------------------------------- */
  if (window.lucide) lucide.createIcons();

  /* Mobile nav ------------------------------------------------------------ */
  var toggle = document.querySelector('.nav-toggle');
  var body = document.body;
  if (toggle) {
    toggle.addEventListener('click', function () {
      var isOpen = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.querySelectorAll('.mobile-panel a').forEach(function (link) {
      link.addEventListener('click', function () {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Current nav highlight --------------------------------------------------- */
  var path = window.location.pathname;
  if (path !== '/' && path.slice(-1) !== '/') path += '/';
  document.querySelectorAll('a[data-nav]').forEach(function (link) {
    if (link.getAttribute('data-nav') === path) {
      link.setAttribute('aria-current', 'page');
    }
  });

  /* FAQ accordion ------------------------------------------------------------ */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var wasOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach(function (el) {
        el.classList.remove('is-open');
      });
      if (!wasOpen) item.classList.add('is-open');
    });
  });

  /* Booking form — posts to /api/contact, a Vercel serverless function that emails
     the request to Rodrumming@outlook.com via Resend. --- */
  var form = document.getElementById('booking-form');
  if (form) {

    // Simple human-check: a randomized addition question. The two numbers ride
    // along as hidden fields so the server can verify the answer itself — a
    // bot posting straight to /api/contact without ever rendering this page
    // won't have them. A form-load timestamp rides along too, so near-instant
    // submissions (script filling every field in one shot) can be flagged.
    var mathQuestionEl = document.getElementById('math-question');
    var mathNum1El = document.getElementById('math_num1');
    var mathNum2El = document.getElementById('math_num2');
    var startedAtEl = document.getElementById('form_started_at');

    function newMathQuestion() {
      if (!mathQuestionEl || !mathNum1El || !mathNum2El) return;
      var a = 1 + Math.floor(Math.random() * 9);
      var b = 1 + Math.floor(Math.random() * 9);
      mathQuestionEl.textContent = a + ' + ' + b;
      mathNum1El.value = a;
      mathNum2El.value = b;
      var answerEl = document.getElementById('math_answer');
      if (answerEl) answerEl.value = '';
      if (startedAtEl) startedAtEl.value = Date.now();
    }
    newMathQuestion();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var status = document.getElementById('form-status');
      var submitBtn = form.querySelector('button[type="submit"]');

      function setStatus(text, isError) {
        if (!status) return;
        status.textContent = text;
        status.classList.add('is-visible');
        status.classList.toggle('is-error', !!isError);
      }

      var formData = new FormData(form);

      // Honeypot — a real visitor never fills this in.
      if (formData.get('_gotcha')) return;

      var payload = {
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        level: formData.get('level') || '',
        platform: formData.get('platform') || '',
        lesson_length: formData.get('lesson_length') || '',
        preferred_days: formData.getAll('preferred_days'),
        time_range: formData.get('time_range') || '',
        message: formData.get('message') || '',
        math_num1: formData.get('math_num1') || '',
        math_num2: formData.get('math_num2') || '',
        math_answer: formData.get('math_answer') || '',
        form_started_at: formData.get('form_started_at') || ''
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Sending…';
      }
      if (status) status.classList.remove('is-visible', 'is-error');

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) {
              var apiMessage = data && typeof data.error === 'string' ? data.error : '';
              throw new Error(apiMessage || 'Something went wrong. Please email Rodrumming@outlook.com directly.');
            }
            return data;
          });
        })
        .then(function () {
          setStatus("Thanks — your request is in! I'll follow up by email shortly to confirm a time.", false);
          form.reset();
          newMathQuestion();
        })
        .catch(function (err) {
          setStatus((err && err.message) || 'Something went wrong. Please email Rodrumming@outlook.com directly.', true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalHtml;
          }
        });
    });
  }

  /* GSAP scroll reveals ---------------------------------------------------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.gsap && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    // Generic reveal-on-scroll for any [data-reveal] element
    var reveals = gsap.utils.toArray('[data-reveal]');
    reveals.forEach(function (el, i) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: (i % 4) * 0.06,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      });
    });

    // Hero entrance (plays immediately, not scroll-gated)
    var heroTl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    if (document.querySelector('.hero-title')) {
      heroTl
        .to('.hero-title', { opacity: 1, y: 0, duration: 0.6 })
        .to('.hero-lede', { opacity: 1, y: 0, duration: 0.6 }, '-=0.35')
        .to('.hero-actions', { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .to('.free-lesson-note', { opacity: 1, y: 0, duration: 0.4 }, '-=0.25')
        .to('.hero-features', { opacity: 1, y: 0, duration: 0.5 }, '-=0.2')
        .to('.hero-photo-bg', { opacity: 1, duration: 0.8 }, '-=0.6');
    }

    // Gentle hero parallax
    var heroPanel = document.querySelector('.hero-panel');
    if (heroPanel) {
      gsap.to(heroPanel, {
        y: -24,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }
  } else {
    // No GSAP / reduced motion: just show everything
    document.querySelectorAll('[data-reveal], .hero-title, .hero-lede, .hero-actions, .free-lesson-note, .hero-features, .hero-photo-bg').forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

});
