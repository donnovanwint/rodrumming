// Rodrumming — shared front-end behavior
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

  /* Booking form — posts to Formspree (formspree.io), which emails Rodrumming@outlook.com --- */
  var form = document.getElementById('booking-form');
  if (form) {
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

      if (form.action.indexOf('YOUR_FORM_ID') !== -1) {
        setStatus('Form is not configured yet — add your Formspree form ID in contact/index.html.', true);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Sending…';
      }
      if (status) status.classList.remove('is-visible', 'is-error');

      fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) {
          if (res.ok) return res;
          return res.json().catch(function () { return {}; }).then(function (data) {
            var message = data && data.errors && data.errors.length
              ? data.errors.map(function (e) { return e.message; }).join(' ')
              : 'Something went wrong. Please email Rodrumming@outlook.com directly.';
            throw new Error(message);
          });
        })
        .then(function () {
          setStatus("Thanks — your request is in! I'll follow up by email shortly to confirm a time.", false);
          form.reset();
        })
        .catch(function (err) {
          setStatus(err.message || 'Something went wrong. Please email Rodrumming@outlook.com directly.', true);
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
        .to('.hero-visual', { opacity: 1, x: 0, duration: 0.7 }, '-=0.6');
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
    document.querySelectorAll('[data-reveal], .hero-title, .hero-lede, .hero-actions, .free-lesson-note, .hero-features, .hero-visual').forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

});
