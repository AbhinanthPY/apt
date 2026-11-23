(() => {
  // A subsequent Home navigation (including browser Back) resumes after the intro.
  try {
    if (sessionStorage.getItem('aptech:home-visited') === '1') {
      sessionStorage.setItem('aptech:home-return', '1');
    }
  } catch {}

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!motion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold: .08 });
    for (const section of document.querySelectorAll('[data-reveal]')) {
      section.classList.add('is-pending');
      observer.observe(section);
    }
    motion.addEventListener('change', () => {
      if (motion.matches) document.querySelectorAll('.is-pending').forEach(el => el.classList.remove('is-pending'));
    });
  }

  const form = document.getElementById('site-visit-form');
  if (!form) return;
  const review = document.getElementById('booking-review');
  const summary = document.getElementById('booking-summary');
  const send = document.getElementById('booking-send');
  const edit = document.getElementById('booking-edit');
  const status = document.getElementById('booking-status');
  const date = form.elements.namedItem('date');
  const service = form.elements.namedItem('service');
  function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  date.min = localDate();
  const requestedService = new URLSearchParams(location.search).get('service');
  if ([...service.options].some(option => option.value === requestedService)) service.value = requestedService;
  date.addEventListener('input', () => date.setCustomValidity(''));

  function setStep(isReview) {
    form.hidden = isReview;
    review.hidden = !isReview;
    for (const label of document.querySelectorAll('[data-step-label]')) {
      if ((label.dataset.stepLabel === 'review') === isReview) label.setAttribute('aria-current', 'step');
      else label.removeAttribute('aria-current');
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    date.min = localDate();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const formattedDate = new Date(`${values.get('date')}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const rows = [
      ['Name', values.get('name').trim()],
      ['Phone', values.get('phone').trim()],
      ['Town / area', values.get('area').trim()],
      ['Service', service.selectedOptions[0].textContent],
      ['Roof', values.get('roof') || 'To discuss'],
      ['Monthly bill', values.get('bill') || 'To discuss'],
      ['Preferred date', formattedDate],
      ['Preferred time', values.get('time')],
    ];
    const message = values.get('message').trim();
    if (message) rows.push(['Notes', message]);
    summary.replaceChildren();
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      summary.append(row);
    }
    const text = `Hi Aptech, I’d like to request a solar site visit.\n\n${rows.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\nPlease contact me to confirm availability and the appointment.`;
    send.href = `https://wa.me/919447324542?text=${encodeURIComponent(text)}`;
    status.textContent = '';
    setStep(true);
    review.focus({ preventScroll: true });
    review.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
  });
  edit.addEventListener('click', () => {
    setStep(false);
    form.elements.namedItem('name').focus({ preventScroll: true });
    form.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
  });
  send.addEventListener('click', () => {
    status.textContent = 'Send your message in WhatsApp. Aptech will contact you to confirm a visit time.';
  });
})();
