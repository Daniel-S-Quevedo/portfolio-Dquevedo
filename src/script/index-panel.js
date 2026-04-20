'use strict';

(function initIndexPanel() {
  const trigger  = document.getElementById('js-idx-trigger');
  const panel    = document.getElementById('js-idx-panel');
  const closeBtn = document.getElementById('js-idx-close');
  const overlay  = document.getElementById('js-idx-overlay');
  const form     = document.getElementById('js-idx-panel-form');
  const submitBtn= document.getElementById('js-idx-panel-submit');
  const noteEl   = document.getElementById('js-idx-panel-note');
  if (!trigger || !panel) return;

  let open = false;

  function openPanel() {
    open = true;
    panel.classList.add('idx-panel--open');
    overlay.classList.add('idx-panel__overlay--visible');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn.focus(), 350);
  }

  function closePanel() {
    open = false;
    panel.classList.remove('idx-panel--open');
    overlay.classList.remove('idx-panel__overlay--visible');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    trigger.focus();
  }

  function onKey(e) { if (e.key === 'Escape') closePanel(); }

  trigger.addEventListener('click', () => open ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  panel.querySelectorAll('[data-idx-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.idxScroll);
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

    noteEl.className = 'idx-panel__note';

    if (!name || !email || !message) {
      noteEl.textContent = 'Preencha todos os campos.';
      noteEl.classList.add('idx-panel__note--error');
      return;
    }

    if (!ensureEmailJS()) {
      noteEl.textContent = 'Serviço indisponível. Tente pelo e-mail direto.';
      noteEl.classList.add('idx-panel__note--error');
      return;
    }

    submitBtn.disabled = true;
    noteEl.textContent = 'Enviando…';

    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name, email, message, reply_to: email
    })
    .then(() => {
      noteEl.textContent = 'Mensagem enviada! Entrarei em contato em breve.';
      noteEl.classList.add('idx-panel__note--ok');
      form.reset();
      submitBtn.disabled = false;
    })
    .catch((err) => {
      console.error('EmailJS error:', err);
      noteEl.textContent = 'Erro ao enviar. Tente pelo e-mail direto.';
      noteEl.classList.add('idx-panel__note--error');
      submitBtn.disabled = false;
    });
  });
})();
