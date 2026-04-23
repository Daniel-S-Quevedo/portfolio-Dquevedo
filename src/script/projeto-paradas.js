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

(function initPowerAppsDemo() {
  const frame = document.getElementById('js-pa-demo');
  if (!frame) return;

  // ── State ──────────────────────────────────────────────────
  const MACHINES = [
    { id: 'CNC-01',   status: 'rodando' },
    { id: 'CNC-02',   status: 'parada'  },
    { id: 'TORNO-01', status: 'rodando' },
    { id: 'TORNO-02', status: 'inativa' },
    { id: 'FRES-01',  status: 'rodando' },
    { id: 'FRES-02',  status: 'rodando' },
  ];
  let nextId = 2;
  let openStops = [
    { id: 1, machine: 'CNC-02', cause: 'MANUTENÇÃO PREV.', operator: 'CARLOS M.', startMs: Date.now() - 6120000 },
  ];
  let history = [
    { machine: 'TORNO-02', cause: 'SETUP',             operator: 'PEDRO A.',  date: '22/04', duration: '45min',    status: 'finalizada' },
    { machine: 'FRES-01',  cause: 'AJUSTE',            operator: 'LUCAS S.',  date: '21/04', duration: '22min',    status: 'finalizada' },
    { machine: 'CNC-01',   cause: 'FALHA ELÉTRICA',    operator: 'MARCOS R.', date: '21/04', duration: '38min',    status: 'finalizada' },
    { machine: 'TORNO-01', cause: 'FALTA DE MATERIAL', operator: 'CARLOS M.', date: '20/04', duration: '1h 15min', status: 'finalizada' },
    { machine: 'CNC-02',   cause: 'MANUTENÇÃO PREV.',  operator: 'CARLOS M.', date: '19/04', duration: '1h 20min', status: 'finalizada' },
  ];

  // ── Helpers ────────────────────────────────────────────────
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowDate() {
    const d = new Date();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  function nowTime() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function elapsed(ms) {
    const s = Math.floor((Date.now() - ms) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${pad(m)}min ${pad(ss)}s`;
    if (m > 0) return `${m}min ${pad(ss)}s`;
    return `${ss}s`;
  }
  function durationFromMs(ms) {
    const s = Math.floor((Date.now() - ms) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${pad(m)}min` : `${m > 0 ? m : 1}min`;
  }

  // ── Navigation ─────────────────────────────────────────────
  const screens = {
    'home':        document.getElementById('pa-s-home'),
    'nova-parada': document.getElementById('pa-s-nova-parada'),
    'finalizar':   document.getElementById('pa-s-finalizar'),
    'consulta':    document.getElementById('pa-s-consulta'),
  };

  function goTo(name) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('pa-screen--active'); });
    if (screens[name]) screens[name].classList.add('pa-screen--active');
    if (name === 'home')        renderHome();
    if (name === 'nova-parada') prepareForm();
    if (name === 'finalizar')   renderStops();
    if (name === 'consulta')    renderTable(null);
  }

  frame.addEventListener('click', e => {
    const navBtn = e.target.closest('[data-pa-goto]');
    if (navBtn) goTo(navBtn.dataset.paGoto);
  });

  // ── Home ───────────────────────────────────────────────────
  function calcKpis() {
    const running = MACHINES.filter(m => m.status === 'rodando').length;
    const pct = Math.round((running / MACHINES.length) * 100);
    const open = openStops.length;
    const avgMin = history.length
      ? Math.round(history.reduce((acc, h) => {
          const mh = h.duration.match(/(\d+)h\s*(\d+)min/);
          if (mh) return acc + (+mh[1] * 60 + +mh[2]);
          const mm = h.duration.match(/(\d+)min/);
          return acc + (mm ? +mm[1] : 0);
        }, 0) / history.length)
      : 0;
    return { pct, open, avgMin };
  }

  function animCount(el, to, suffix, ms) {
    if (!el) return;
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderHome() {
    const { pct, open, avgMin } = calcKpis();
    animCount(document.getElementById('js-k-op'),   pct,    '%',    700);
    animCount(document.getElementById('js-k-st'),   open,   '',     500);
    animCount(document.getElementById('js-k-mttr'), avgMin, ' min', 700);

    const grid = document.getElementById('js-pa-machines');
    if (!grid) return;
    const colors = { rodando: '#22c55e', inativa: '#64748b', parada: '#ef4444' };
    grid.innerHTML = MACHINES.map(m => {
      const stop = openStops.find(s => s.machine === m.id);
      const timeStr = stop
        ? `<span class="pa-mcard__time" data-elapsed-id="${stop.id}">${elapsed(stop.startMs)}</span>`
        : '';
      return `<div class="pa-mcard pa-mcard--${m.status}">
        <span class="pa-mstatus" style="background:${colors[m.status]}"></span>
        <span class="pa-mcard__info"><span class="pa-mcard__id">${m.id}</span>${timeStr}</span>
      </div>`;
    }).join('');
  }

  // ── Form ───────────────────────────────────────────────────
  function setDateTimeMode(isManual) {
    const dateEl = document.getElementById('pa-f-date');
    const timeEl = document.getElementById('pa-f-time');
    if (!dateEl || !timeEl) return;
    dateEl.readOnly = !isManual;
    timeEl.readOnly = !isManual;
    dateEl.classList.toggle('pa-inp--manual', isManual);
    timeEl.classList.toggle('pa-inp--manual', isManual);
    if (!isManual) {
      dateEl.value = nowDate();
      timeEl.value = nowTime();
    }
  }

  function prepareForm() {
    const form = document.getElementById('js-pa-form');
    const msg = document.getElementById('js-pa-msg');
    if (form) form.reset();
    if (msg) { msg.textContent = ''; msg.className = 'pa-msg'; }
    setDateTimeMode(false);

    const modeEl = document.getElementById('pa-f-mode');
    if (modeEl) modeEl.onchange = () => setDateTimeMode(modeEl.value === 'manual');
  }

  const submitBtn = document.getElementById('js-pa-submit');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    const form = document.getElementById('js-pa-form');
    const msg  = document.getElementById('js-pa-msg');
    const machine  = form.elements['machine'].value;
    const cause    = form.elements['cause'].value;
    const operator = form.elements['operator'].value;

    if (!machine || !cause || !operator) {
      msg.textContent = '! Preencha os campos obrigatórios.';
      msg.className = 'pa-msg pa-msg--err';
      return;
    }
    const mObj = MACHINES.find(m => m.id === machine);
    if (mObj && mObj.status === 'parada') {
      msg.textContent = `! ${machine} já possui parada em aberto.`;
      msg.className = 'pa-msg pa-msg--err';
      return;
    }
    if (mObj) mObj.status = 'parada';
    openStops.push({ id: ++nextId, machine, cause, operator, startMs: Date.now() });
    msg.textContent = `✓ Parada registrada para ${machine}.`;
    msg.className = 'pa-msg pa-msg--ok';
    setTimeout(() => goTo('home'), 1100);
  });

  // ── Finalizar ──────────────────────────────────────────────
  function renderStops() {
    const el = document.getElementById('js-pa-stops');
    if (!el) return;
    if (!openStops.length) {
      el.innerHTML = '<div class="pa-empty-msg">NENHUMA PARADA EM ABERTO</div>';
      return;
    }
    el.innerHTML = openStops.map(s =>
      `<div class="pa-stop-row">
        <div class="pa-stop-info">
          <span class="pa-stop-machine">${s.machine}</span>
          <span class="pa-stop-cause">${s.cause}</span>
          <span class="pa-stop-op">${s.operator}</span>
          <span class="pa-stop-elapsed" data-stop-id="${s.id}">${elapsed(s.startMs)}</span>
        </div>
        <button class="pa-fin-btn" data-finalize="${s.id}">FINALIZAR</button>
      </div>`
    ).join('');
  }

  frame.addEventListener('click', e => {
    const btn = e.target.closest('[data-finalize]');
    if (!btn) return;
    const id = Number(btn.dataset.finalize);
    const idx = openStops.findIndex(s => s.id === id);
    if (idx === -1) return;
    const stop = openStops[idx];
    history.unshift({
      machine: stop.machine, cause: stop.cause, operator: stop.operator,
      date: nowDate().slice(0, 5), duration: durationFromMs(stop.startMs), status: 'finalizada',
    });
    const mObj = MACHINES.find(m => m.id === stop.machine);
    if (mObj) mObj.status = 'rodando';
    openStops.splice(idx, 1);
    renderStops();
  });

  setInterval(() => {
    openStops.forEach(s => {
      const t = elapsed(s.startMs);
      document.querySelectorAll(`[data-stop-id="${s.id}"], [data-elapsed-id="${s.id}"]`).forEach(el => {
        el.textContent = t;
      });
    });
  }, 1000);

  // ── Consulta ───────────────────────────────────────────────
  function renderTable(filters) {
    const el = document.getElementById('js-pa-table');
    if (!el) return;
    const all = [
      ...openStops.map(s => ({
        machine: s.machine, cause: s.cause, operator: s.operator,
        date: nowDate().slice(0, 5), duration: elapsed(s.startMs), status: 'aberta',
      })),
      ...history,
    ];
    const rows = filters
      ? all.filter(r =>
          (!filters.machine  || r.machine  === filters.machine)  &&
          (!filters.cause    || r.cause    === filters.cause)    &&
          (!filters.operator || r.operator === filters.operator) &&
          (!filters.status   || r.status   === filters.status))
      : all;

    if (!rows.length) {
      el.innerHTML = '<div class="pa-empty-msg" style="padding:24px 0">NENHUM REGISTRO ENCONTRADO</div>';
      return;
    }
    el.innerHTML = `<table class="pa-table"><thead><tr>
      <th>MÁQUINA</th><th>CAUSA</th><th>OPERADOR</th><th>DATA</th><th>DURAÇÃO</th><th>STATUS</th>
    </tr></thead><tbody>${rows.map(r =>
      `<tr>
        <td>${r.machine}</td><td>${r.cause}</td><td>${r.operator}</td>
        <td>${r.date}</td><td>${r.duration}</td>
        <td><span class="pa-badge pa-badge--${r.status === 'finalizada' ? 'fin' : 'open'}">${r.status === 'finalizada' ? 'FINALIZADA' : 'EM ABERTO'}</span></td>
      </tr>`
    ).join('')}</tbody></table>`;
  }

  const applyBtn = document.getElementById('js-fc-apply');
  const clearBtn = document.getElementById('js-fc-clear');
  if (applyBtn) applyBtn.addEventListener('click', () => {
    renderTable({
      machine:  document.getElementById('js-fc-mach').value,
      cause:    document.getElementById('js-fc-cause').value,
      operator: document.getElementById('js-fc-oper').value,
      status:   document.getElementById('js-fc-status').value,
    });
  });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    ['js-fc-mach', 'js-fc-cause', 'js-fc-oper', 'js-fc-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    renderTable(null);
  });

  const refreshBtn = document.getElementById('js-pa-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => renderHome());

  // ── Date picker ─────────────────────────────────────────────
  (function initDatePicker() {
    const dateInput = document.getElementById('pa-f-date');
    if (!dateInput) return;

    const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const WD = ['D','S','T','Q','Q','S','S'];
    let cy, cm, sel = null;

    const cal = document.createElement('div');
    cal.className = 'pa-cal';
    cal.innerHTML =
      `<div class="pa-cal__hd">` +
        `<button class="pa-cal__nav" id="jc-prev">‹</button>` +
        `<span class="pa-cal__ttl" id="jc-title"></span>` +
        `<button class="pa-cal__nav" id="jc-next">›</button>` +
      `</div>` +
      `<div class="pa-cal__wd">${WD.map(d => `<span>${d}</span>`).join('')}</div>` +
      `<div class="pa-cal__grid" id="jc-grid"></div>`;

    frame.appendChild(cal);

    function draw() {
      cal.querySelector('#jc-title').textContent = `${MONTHS[cm]} ${cy}`;
      const firstDay    = new Date(cy, cm, 1).getDay();
      const daysInMonth = new Date(cy, cm + 1, 0).getDate();
      const today       = new Date();
      let h = Array(firstDay).fill('<span class="pa-cal__d pa-cal__d--x"></span>').join('');
      for (let d = 1; d <= daysInMonth; d++) {
        const isTd  = d === today.getDate() && cm === today.getMonth()  && cy === today.getFullYear();
        const isSel = sel && d === sel.getDate() && cm === sel.getMonth() && cy === sel.getFullYear();
        h += `<button class="pa-cal__d${isTd ? ' pa-cal__d--td' : ''}${isSel ? ' pa-cal__d--sel' : ''}" data-d="${d}">${d}</button>`;
      }
      cal.querySelector('#jc-grid').innerHTML = h;
    }

    cal.querySelector('#jc-prev').addEventListener('click', e => { e.stopPropagation(); if (--cm < 0) { cm = 11; cy--; } draw(); });
    cal.querySelector('#jc-next').addEventListener('click', e => { e.stopPropagation(); if (++cm > 11) { cm = 0; cy++; } draw(); });

    cal.addEventListener('click', e => {
      const btn = e.target.closest('[data-d]');
      if (!btn) return;
      e.stopPropagation();
      const d = Number(btn.dataset.d);
      sel = new Date(cy, cm, d);
      dateInput.value = `${pad(d)}/${pad(cm + 1)}/${cy}`;
      cal.classList.remove('pa-cal--open');
      draw();
    });

    dateInput.addEventListener('click', e => {
      e.stopPropagation();
      if (dateInput.readOnly) return;
      if (cal.classList.contains('pa-cal--open')) { cal.classList.remove('pa-cal--open'); return; }

      const inputRect = dateInput.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const CAL_W = 210, CAL_H = 222;

      let left = inputRect.left - frameRect.left;
      if (left + CAL_W > frameRect.width - 8) left = frameRect.width - CAL_W - 8;

      const spaceBelow = frameRect.bottom - inputRect.bottom;
      const top = spaceBelow >= CAL_H + 8
        ? inputRect.bottom - frameRect.top + 6
        : inputRect.top  - frameRect.top  - CAL_H - 6;

      cal.style.left = `${Math.max(8, left)}px`;
      cal.style.top  = `${top}px`;

      const now = new Date();
      cy = now.getFullYear(); cm = now.getMonth();
      draw();
      cal.classList.add('pa-cal--open');
    });

    document.addEventListener('click', () => cal.classList.remove('pa-cal--open'));
  })();

  // ── Compare lightbox ────────────────────────────────────────
  (function initLightbox() {
    const lb = document.createElement('div');
    lb.className = 'pa-lightbox';
    lb.innerHTML =
      `<button class="pa-lightbox__close" aria-label="Fechar">&times;</button>` +
      `<img class="pa-lightbox__img" src="" alt=""/>` +
      `<div class="pa-lightbox__caption"></div>`;
    document.body.appendChild(lb);

    const lbImg   = lb.querySelector('.pa-lightbox__img');
    const lbCap   = lb.querySelector('.pa-lightbox__caption');
    const lbClose = lb.querySelector('.pa-lightbox__close');

    function open(src, alt, caption) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lbCap.textContent = caption || '';
      lb.classList.add('pa-lightbox--open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lb.classList.remove('pa-lightbox--open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.pa-compare__item img').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        const caption = img.closest('.pa-compare__item')?.querySelector('figcaption')?.textContent;
        open(img.src, img.alt, caption);
      });
    });

    lbClose.addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();

  renderHome();
})();
