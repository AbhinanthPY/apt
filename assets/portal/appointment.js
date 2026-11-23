(() => {
  const section = document.querySelector('#contact.aptech-contact');
  const bookButtons = section.querySelectorAll('[data-chat-book]');
  const dialog = document.getElementById('aptech-appointment');
  const form = dialog.querySelector('form');
  const details = form.elements.namedItem('details');
  const submit = form.querySelector('[type="submit"]');
  const note = form.querySelector('[role="status"]');
  const copyField = dialog.querySelector('[data-copy-request]');
  const whatsapp = form.dataset.whatsapp.replace(/[+\s()-]/g, '');
  const email = form.dataset.email.trim();
  const sms = form.dataset.sms.trim();
  const canWhatsApp = /^[1-9]\d{7,14}$/.test(whatsapp);
  const canEmail = /^[^\s?&@]+@[^\s?&@]+\.[^\s?&@]+$/.test(email);
  const canSms = /^\+[1-9]\d{7,14}$/.test(sms);
  let opener;

  if (canWhatsApp) {
    submit.textContent = 'Continue to WhatsApp';
    note.textContent = 'Review and send your request in WhatsApp.';
  } else if (canEmail) {
    submit.textContent = 'Open email draft';
    note.textContent = 'Review and send your request in your email app.';
  } else if (canSms) {
    submit.textContent = 'Open text message';
    note.textContent = 'Review and send your request in your messaging app.';
  }

  function sizeForViewport() {
    const bounds = window.frameElement?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    const zoom = Math.max(1, innerWidth / bounds.width);
    section.style.setProperty('--contact-zoom', zoom);
    section.style.setProperty('--contact-width', `${bounds.width}px`);
    section.style.setProperty('--contact-height', `${bounds.height}px`);
    section.toggleAttribute('data-chat-narrow', bounds.width < 760);
    dialog.style.setProperty('--contact-zoom', zoom);
    dialog.style.setProperty('--contact-width', `${bounds.width}px`);
    dialog.style.setProperty('--contact-height', `${bounds.height}px`);
  }

  function openDialog(trigger) {
    if (dialog.open) return;
    opener = trigger;
    copyField.hidden = true;
    sizeForViewport();
    dialog.showModal();
  }

  for (const button of bookButtons) button.addEventListener('click', () => openDialog(button));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));

  window.addEventListener('resize', sizeForViewport);
  if (window.frameElement) new ResizeObserver(sizeForViewport).observe(window.frameElement);
  sizeForViewport();

  const messages = [...section.querySelectorAll('[data-chat-message]')];
  const history = section.querySelector('.solar-chat-history');
  const track = section.querySelector('.solar-chat-track');
  const draft = section.querySelector('.solar-chat-draft');
  const typing = section.querySelector('.solar-chat-typing');
  const status = section.querySelector('[data-chat-status]');
  const preview = section.querySelector('[data-chat-preview]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const whatsappCta = section.querySelector('.solar-whatsapp-cta');
  // Reveal from the green icon into a full pill when it enters the viewport.
  const ctaObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      whatsappCta.classList.add('is-visible');
      ctaObserver.disconnect();
    }
  }, { threshold: .5 });
  ctaObserver.observe(whatsappCta);
  whatsappCta.addEventListener('focus', () => whatsappCta.classList.add('is-visible'));
  let showFull = false;
  let frame = 0;

  function renderConversation() {
    frame = 0;
    const bounds = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - innerHeight)));
    const position = showFull || motion.matches ? messages.length : Math.min(messages.length, progress / .88 * messages.length);
    section.toggleAttribute('data-chat-static', showFull || motion.matches);
    history.tabIndex = showFull || motion.matches ? 0 : -1;
    const step = Math.floor(position);
    const fraction = position - step;
    const pending = messages[step];
    const outgoing = pending?.classList.contains('solar-chat-row--out');
    const sent = step + (fraction >= .78 ? 1 : 0);
    messages.forEach((message, index) => {
      const wasHidden = message.hidden;
      message.hidden = index >= sent;
      if (wasHidden && !message.hidden && !motion.matches && !showFull) {
        message.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' });
      }
    });
    const isTyping = pending && !outgoing && fraction > .12 && fraction < .78;
    typing.hidden = !isTyping;
    status.textContent = isTyping ? 'Typing…' : 'Site visits & consultations';
    const text = pending?.querySelector('p').textContent || '';
    const writing = outgoing && fraction > .05 && fraction < .78;
    draft.textContent = writing ? text.slice(0, Math.ceil(text.length * Math.min(1, fraction / .68))) : 'Message Aptech…';
    draft.toggleAttribute('data-writing', writing);
    preview.textContent = sent === messages.length ? 'Your site visit is booked.' : 'Site visits & consultations';
    // Move earlier messages upward as replies arrive, keeping the newest bubble in view.
    const room = history.clientHeight - 56;
    track.style.transform = showFull || motion.matches ? 'none' : `translateY(${-Math.max(0, track.offsetHeight - room)}px)`;
  }

  function scheduleConversation() {
    if (!frame) frame = requestAnimationFrame(renderConversation);
  }

  window.addEventListener('scroll', scheduleConversation, { passive: true });
  window.addEventListener('resize', scheduleConversation);
  motion.addEventListener('change', scheduleConversation);
  new ResizeObserver(scheduleConversation).observe(history);
  document.fonts.ready.then(scheduleConversation);
  scheduleConversation();

  form.addEventListener('input', event => {
    event.target.setCustomValidity('');
    copyField.hidden = true;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('name').trim();
    const phone = data.get('phone').trim();
    const location = data.get('location').trim();
    if (!name || !location) {
      const field = name ? form.elements.namedItem('location') : form.elements.namedItem('name');
      field.setCustomValidity(name ? 'Enter your town or PIN code.' : 'Enter your name.');
      field.reportValidity();
      return;
    }
    const phoneDigits = phone.replace(/[+\s().-]/g, '');
    if (!/^\d{7,15}$/.test(phoneDigits)) {
      const phoneField = form.elements.namedItem('phone');
      phoneField.setCustomValidity('Enter a valid phone number.');
      phoneField.reportValidity();
      return;
    }

    const request = [
      'Hello Aptech, I’d like to request a solar consultation.',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Town or PIN code: ${location}`,
      details.value.trim() && `Details: ${details.value.trim()}`,
    ].filter(Boolean).join('\n');

    if (canWhatsApp) {
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(request)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (canEmail) {
      window.location.href = `mailto:${email}?subject=Solar%20consultation%20request&body=${encodeURIComponent(request)}`;
      return;
    }
    if (canSms) {
      window.location.href = `sms:${sms}?body=${encodeURIComponent(request)}`;
      return;
    }
    try {
      await navigator.clipboard.writeText(request);
      note.textContent = 'Request copied. Online booking is currently unavailable.';
    } catch {
      copyField.hidden = false;
      const field = copyField.querySelector('textarea');
      field.value = request;
      field.focus();
      field.select();
    }
  });
})();
