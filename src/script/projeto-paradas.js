'use strict';

(function initPageTransition() {
  const curtain = document.createElement('div');
  curtain.className = 'page-curtain';
  curtain.setAttribute('aria-hidden', 'true');
  curtain.innerHTML =
    '<div class="page-curtain__top"></div>' +
    '<div class="page-curtain__line"></div>' +
    '<div class="page-curtain__bottom"></div>';
  document.body.appendChild(curtain);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => curtain.classList.add('page-curtain--open'));
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || link.target === '_blank') return;

    e.preventDefault();
    curtain.classList.remove('page-curtain--open');
    curtain.classList.add('page-curtain--close');
    setTimeout(() => { window.location.href = href; }, 480);
  });
})();

(function initGallery() {
  const mainImg = document.getElementById('js-gallery-main');
  if (!mainImg) return;
  const thumbs = document.querySelectorAll('[data-gallery-src]');

  thumbs.forEach(btn => {
    btn.addEventListener('click', () => {
      mainImg.src = btn.dataset.gallerySrc;
      thumbs.forEach(t => t.classList.remove('app-gallery__thumb--active'));
      btn.classList.add('app-gallery__thumb--active');
    });
  });
})();

(function initSidePanel() {
  const trigger  = document.getElementById('js-sp-trigger');
  const panel    = document.getElementById('js-side-panel');
  const closeBtn = document.getElementById('js-sp-close');
  const overlay  = document.getElementById('js-sp-overlay');
  const form     = document.getElementById('js-sp-form');
  const submitBtn= document.getElementById('js-sp-submit');
  const noteEl   = document.getElementById('js-sp-note');
  if (!trigger || !panel) return;

  let open = false;

  function openPanel() {
    open = true;
    panel.classList.add('side-panel--open');
    overlay.classList.add('side-panel__overlay--visible');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn.focus(), 350);
  }

  function closePanel() {
    open = false;
    panel.classList.remove('side-panel--open');
    overlay.classList.remove('side-panel__overlay--visible');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    trigger.focus();
  }

  function onKey(e) { if (e.key === 'Escape') closePanel(); }

  trigger.addEventListener('click', () => open ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  panel.querySelectorAll('[data-sp-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.spScroll);
      closePanel();
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
    });
  });

  if (!form) return;

  const EMAILJS_PUBLIC_KEY  = 'hPQe8W-qDpmBMCsDb';
  const EMAILJS_SERVICE_ID  = 'service_afv5732';
  const EMAILJS_TEMPLATE_ID = 'template_fehbnpg';

  let ejsReady = false;
  function ensureEmailJS() {
    if (!ejsReady && window.emailjs) {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      ejsReady = true;
    }
    return ejsReady;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = form.elements['name'].value.trim();
    const email   = form.elements['email'].value.trim();
    const message = form.elements['message'].value.trim();

    noteEl.className = 'side-panel__note';

    if (!name || !email || !message) {
      noteEl.textContent = 'Preencha todos os campos.';
      noteEl.classList.add('side-panel__note--error');
      return;
    }

    if (!ensureEmailJS()) {
      noteEl.textContent = 'Serviço indisponível. Tente pelo e-mail direto.';
      noteEl.classList.add('side-panel__note--error');
      return;
    }

    submitBtn.disabled = true;
    noteEl.textContent = 'Enviando…';

    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name, email, message, reply_to: email
    })
    .then(() => {
      noteEl.textContent = 'Mensagem enviada! Entrarei em contato em breve.';
      noteEl.classList.add('side-panel__note--ok');
      form.reset();
      submitBtn.disabled = false;
    })
    .catch((err) => {
      console.error('EmailJS error:', err);
      noteEl.textContent = 'Erro ao enviar. Tente pelo e-mail direto.';
      noteEl.classList.add('side-panel__note--error');
      submitBtn.disabled = false;
    });
  });
})();
