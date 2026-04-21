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

(function initCarousels() {
  const AUTOPLAY_MS   = 4500;
  const CIRCUMFERENCE = 94.25;

  // 3D fan: x is fraction of container width, ry = rotateY degrees
  const FAN = [
    { x: -0.60, ry:  55, s: 0.62, o: 0.22, z: 1 },  // offset -2
    { x: -0.28, ry:  43, s: 0.82, o: 0.55, z: 2 },  // offset -1
    { x:  0,    ry:   0, s: 1.00, o: 1.00, z: 5 },  // offset  0 (active)
    { x:  0.28, ry: -43, s: 0.82, o: 0.55, z: 2 },  // offset +1
    { x:  0.60, ry: -55, s: 0.62, o: 0.22, z: 1 },  // offset +2
  ];

  function initCarousel(el) {
    const stage        = el.querySelector('.carousel__stage');
    const slides       = Array.from(el.querySelectorAll('.carousel__slide'));
    const dots         = Array.from(el.querySelectorAll('.carousel__dot'));
    const prevBtn      = el.querySelector('.carousel__btn--prev');
    const nextBtn      = el.querySelector('.carousel__btn--next');
    const fill         = el.querySelector('.carousel__progress-fill');
    const counterInner = el.querySelector('.carousel__current-inner');
    const prog         = el.querySelector('.carousel__progress');
    const arcFill      = el.querySelector('.carousel__arc-fill');
    if (!slides.length || !stage) return;

    let idx = 0;
    const total = slides.length;
    let autoTimer = null;
    let dragStartX = 0;
    let isDragging = false;
    let containerW = el.offsetWidth;

    const ro = new ResizeObserver(() => { containerW = el.offsetWidth; applyFan(); });
    ro.observe(el);

    function getOffset(i) {
      let off = i - idx;
      const half = Math.floor(total / 2);
      while (off >  half) off -= total;
      while (off < -half) off += total;
      return off;
    }

    function applyFan() {
      slides.forEach((slide, i) => {
        const off    = getOffset(i);
        const fanIdx = off + 2;
        if (fanIdx < 0 || fanIdx >= FAN.length) {
          slide.style.cssText += ';opacity:0;pointer-events:none;z-index:0;';
          slide.classList.remove('carousel__slide--active');
          return;
        }
        const p = FAN[fanIdx];
        const xPx = p.x * containerW;
        slide.style.transform = `translateX(${xPx}px) rotateY(${p.ry}deg) scale(${p.s})`;
        slide.style.opacity   = String(p.o);
        slide.style.zIndex    = String(p.z);
        slide.style.pointerEvents = off === 0 ? 'auto' : 'none';
        slide.classList.toggle('carousel__slide--active', off === 0);
      });
    }

    function triggerScanline() {
      stage.classList.remove('carousel__stage--scanning');
      void stage.offsetWidth;
      stage.classList.add('carousel__stage--scanning');
      setTimeout(() => stage.classList.remove('carousel__stage--scanning'), 700);
    }

    function flipCounter(n) {
      if (!counterInner) return;
      counterInner.classList.remove('carousel__current-inner--in');
      counterInner.classList.add('carousel__current-inner--out');
      setTimeout(() => {
        counterInner.textContent = String(n + 1).padStart(2, '0');
        counterInner.classList.remove('carousel__current-inner--out');
        counterInner.classList.add('carousel__current-inner--in');
        setTimeout(() => counterInner.classList.remove('carousel__current-inner--in'), 280);
      }, 185);
    }

    function startArc() {
      if (!arcFill) return;
      arcFill.style.transition = 'none';
      arcFill.style.strokeDashoffset = String(CIRCUMFERENCE);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        arcFill.style.transition = `stroke-dashoffset ${AUTOPLAY_MS}ms linear`;
        arcFill.style.strokeDashoffset = '0';
      }));
    }
    function stopArc() {
      if (!arcFill) return;
      arcFill.style.transition = 'none';
      arcFill.style.strokeDashoffset = String(CIRCUMFERENCE);
    }

    function goTo(n) {
      n = ((n % total) + total) % total;
      if (n === idx) return;
      idx = n;

      applyFan();
      triggerScanline();
      flipCounter(idx);

      const pct = ((idx + 1) / total) * 100;
      fill.style.width = pct + '%';
      if (prog) prog.setAttribute('aria-valuenow', Math.round(pct));
      dots.forEach((d, i) => {
        d.classList.toggle('carousel__dot--active', i === idx);
        d.setAttribute('aria-selected', String(i === idx));
      });
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === total - 1;
    }

    function startAuto() {
      clearInterval(autoTimer);
      startArc();
      autoTimer = setInterval(() => {
        if (prevBtn && idx === total - 1) prevBtn.disabled = false;
        goTo((idx + 1) % total);
        startArc();
      }, AUTOPLAY_MS);
    }
    function stopAuto() { clearInterval(autoTimer); stopArc(); }

    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(idx - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(idx + 1); startAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAuto(); }));

    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', startAuto);

    stage.addEventListener('pointerdown', e => {
      dragStartX = e.clientX;
      isDragging = true;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointerup', e => {
      if (!isDragging) return;
      isDragging = false;
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 40) dx < 0 ? goTo(idx + 1) : goTo(idx - 1);
      startAuto();
    });
    stage.addEventListener('pointercancel', () => { isDragging = false; });

    el.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { goTo(idx - 1); startAuto(); }
      if (e.key === 'ArrowRight') { goTo(idx + 1); startAuto(); }
    });

    applyFan();
    if (prevBtn) prevBtn.disabled = true;
    startAuto();
  }

  document.querySelectorAll('.carousel').forEach(initCarousel);
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
