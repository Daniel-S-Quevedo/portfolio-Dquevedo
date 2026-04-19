
/**
 * CADENCE — Daniel Quevedo Portfolio
 * script.js — Refatorado para produção
 *
 * Módulos:
 * 1. Utilitários
 * 2. Intro Screen
 * 3. Cursor Personalizado
 * 4. Topbar (scroll)
 * 5. Menu Mobile
 * 6. Navegação por Âncora
 * 7. Scroll Reveal (IntersectionObserver)
 * 8. Contadores animados
 * 9. Barra de Progresso de Projetos
 * 10. Skill Bars
 * 11. Dots de navegação + active nav
 */

'use strict';

/* ─── 1. UTILITÁRIOS ──────────────────────────────────── */

/**
 * Executa fn imediatamente se DOM pronto, senão aguarda DOMContentLoaded.
 */
function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }
}

/**
 * Throttle via rAF — evita listeners de scroll pesados.
 * @param {Function} fn
 * @returns {Function}
 */
function rafThrottle(fn) {
  let ticking = false;
  return function (...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

/**
 * Scroll suave até um elemento por ID.
 * @param {string} id
 */
function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ─── 2. INTRO ────────────────────────────────────────── */
(function initIntro() {
  const el = document.getElementById('js-intro');
  if (!el) return;

  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    el.classList.add('intro--fade-out');

    const t = setTimeout(() => el.classList.add('intro--gone'), 800);
    el.addEventListener('transitionend', () => {
      clearTimeout(t);
      el.classList.add('intro--gone');
    }, { once: true });
  }

  // Caminho normal: 1.9s
  setTimeout(dismiss, 1900);

  // Rede de segurança: 3s máximo absoluto
  setTimeout(() => {
    if (!dismissed) {
      dismissed = true;
      el.style.transition = 'none';
      el.classList.add('intro--fade-out', 'intro--gone');
    }
  }, 3000);

  // Qualquer interação do usuário dispensa imediatamente
  const interactionEvents = ['click', 'touchstart', 'touchend', 'keydown', 'scroll'];
  interactionEvents.forEach(ev => {
    document.addEventListener(ev, dismiss, { once: true, passive: true });
  });
})();

/* ─── 3. CURSOR PERSONALIZADO ─────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('js-cursor');
  if (!cursor || window.matchMedia('(hover: none)').matches) return;

  // Rastreia posição via CSS custom properties — zero reflow
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  }, { passive: true });

  document.addEventListener('mousedown', () => cursor.classList.add('cursor--press'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('cursor--press'));

  onReady(() => {
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('cursor--hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--hover'));
    });
  });
})();

/* ─── 4. TOPBAR ────────────────────────────────────────── */
(function initTopbar() {
  const bar = document.getElementById('js-topbar');
  if (!bar) return;

  function update() {
    bar.classList.toggle('topbar--scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', rafThrottle(update), { passive: true });
})();

/* ─── 5. MENU MOBILE ───────────────────────────────────── */
(function initMobileMenu() {
  const hamburger = document.getElementById('js-hamburger');
  const menu      = document.getElementById('js-mobile-menu');
  const closeBtn  = document.getElementById('js-menu-close');
  if (!hamburger || !menu) return;

  let isOpen = false;

  function open() {
    isOpen = true;
    menu.classList.add('mobile-menu--open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    // Foca o primeiro elemento focalizável do menu após animação
    const firstFocusable = menu.querySelector('button, a, [tabindex]');
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 350);
  }

  function close() {
    isOpen = false;
    menu.classList.remove('mobile-menu--open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    hamburger.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  hamburger.addEventListener('click', () => (isOpen ? close() : open()));
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Links do menu mobile
  menu.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scrollTo;
      close();
      setTimeout(() => scrollToId(id), 420);
    });
  });
})();

/* ─── 6. NAVEGAÇÃO POR ÂNCORA ──────────────────────────── */
(function initAnchorNav() {
  onReady(() => {
    // Botões desktop com data-scroll-to
    document.querySelectorAll('[data-scroll-to]').forEach(btn => {
      if (btn.closest('#js-mobile-menu')) return; // Mobile tratado separado
      btn.addEventListener('click', () => scrollToId(btn.dataset.scrollTo));
    });

    // Links <a href="#id">
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ─── 7. SCROLL REVEAL ─────────────────────────────────── */
(function initScrollReveal() {
  onReady(() => {
    const elements = document.querySelectorAll('[data-reveal]');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.07,
      rootMargin: '0px 0px -40px 0px',
    });

    elements.forEach(el => observer.observe(el));
  });
})();

/* ─── 8. CONTADORES ANIMADOS ───────────────────────────── */
(function initCounters() {
  onReady(() => {
    // Contadores gerais (métricas do hero)
    const heroCounters = document.querySelectorAll('[data-count]');
    // Contadores de projetos
    const projCounters = document.querySelectorAll('[data-count-project]');

    if (!heroCounters.length && !projCounters.length) return;

    /**
     * Easing cúbico ease-out
     */
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Anima um contador de 0 até target.
     * @param {HTMLElement} el
     * @param {number} target
     * @param {string} prefix
     * @param {string} suffix
     * @param {number} duration ms
     */
    function animateCounter(el, target, prefix, suffix, duration) {
      const start = performance.now();
      let prev = -1;

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value    = Math.round(easeOut(progress) * target);

        if (value !== prev) {
          el.textContent = prefix + value + suffix;
          prev = value;
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
    }

    function makeCounterObserver(threshold, duration) {
      return new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el     = entry.target;
          const target = parseInt(el.dataset.count || el.dataset.countProject, 10);
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || el.dataset.suf || '';
          animateCounter(el, target, prefix, suffix, duration);
          counterObserver.unobserve(el);
        });
      }, { threshold });
    }

    const counterObserver = makeCounterObserver(0.6, 1400);
    heroCounters.forEach(el => counterObserver.observe(el));

    const projObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.dataset.countProject, 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, prefix, suffix, 1600);
        projObserver.unobserve(el);
      });
    }, { threshold: 0.4 });

    projCounters.forEach(el => projObserver.observe(el));
  });
})();

/* ─── 9. BARRA DE PROGRESSO DE PROJETOS ────────────────── */
(function initProjectProgress() {
  onReady(() => {
    const progressFill = document.getElementById('js-progress-fill');
    const projectsSection = document.getElementById('projetos');
    if (!progressFill || !projectsSection) return;

    function update() {
      const rect   = projectsSection.getBoundingClientRect();
      const total  = projectsSection.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct    = total > 0 ? Math.min(scrolled / total, 1) * 100 : 0;
      progressFill.style.height = pct + '%';
    }

    window.addEventListener('scroll', rafThrottle(update), { passive: true });
  });
})();

/* ─── 10. SKILL BARS ───────────────────────────────────── */
(function initSkillBars() {
  onReady(() => {
    const skillsContainer = document.getElementById('js-skills');
    if (!skillsContainer) return;

    let animated = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || animated) return;
        animated = true;

        skillsContainer.querySelectorAll('.skill-row__fill').forEach((bar, i) => {
          setTimeout(() => {
            bar.style.width = (bar.dataset.width || 0) + '%';
          }, i * 100);
        });

        observer.disconnect();
      });
    }, { threshold: 0.2 });

    observer.observe(skillsContainer);
  });
})();

/* ─── 11. FORMULÁRIO DE CONTATO ────────────────────────── */
(function initContactForm() {
  onReady(() => {
    const form      = document.getElementById('js-contact-form');
    const noteEl    = document.getElementById('js-form-note');
    const submitBtn = document.getElementById('js-form-submit');

    if (!form) return;

    // ── EmailJS config ── preencha com suas credenciais em emailjs.com
    const EMAILJS_PUBLIC_KEY  = 'hPQe8W-qDpmBMCsDb';
    const EMAILJS_SERVICE_ID  = 'service_afv5732';
    const EMAILJS_TEMPLATE_ID = 'template_fehbnpg';

    if (window.emailjs) {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name    = form.elements['name'].value.trim();
      const email   = form.elements['email'].value.trim();
      const message = form.elements['message'].value.trim();

      noteEl.className = 'contact__form-note';

      if (!name || !email || !message) {
        noteEl.textContent = 'Preencha nome, e-mail e mensagem.';
        noteEl.classList.add('contact__form-note--error');
        return;
      }

      submitBtn.disabled = true;
      noteEl.textContent = 'Enviando…';

      window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        name:     name,
        email:    email,
        message:  message,
        reply_to: email,
      })
      .then(() => {
        noteEl.textContent = 'Mensagem enviada! Entrarei em contato em breve.';
        noteEl.classList.add('contact__form-note--ok');
        form.reset();
        submitBtn.disabled = false;
      })
      .catch((err) => {
        console.error('EmailJS error:', err);
        noteEl.textContent = 'Erro ao enviar. Tente pelo e-mail direto.';
        noteEl.classList.add('contact__form-note--error');
        submitBtn.disabled = false;
      });
    });
  });
})();

/* ─── 12. DOTS + ACTIVE NAV ────────────────────────────── */
(function initSectionNav() {
  onReady(() => {
    const dots    = document.querySelectorAll('.nav-dot');
    const navLinks = document.querySelectorAll('.nav-desktop [data-scroll-to]');
    const sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.dataset.section;

        dots.forEach(dot => {
          dot.classList.toggle('nav-dot--active', dot.dataset.scrollTo === id);
        });

        navLinks.forEach(link => {
          if (link.dataset.scrollTo === id) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { threshold: 0.4 });

    sections.forEach(s => observer.observe(s));

    // Click nos dots
    dots.forEach(dot => {
      dot.addEventListener('click', () => scrollToId(dot.dataset.scrollTo));
    });
  });
})();

