/* Navigation, session toggles, and automatic original-photo loading. */
(() => {
  const body = document.body;
  const menuToggle = document.querySelector('.menu-toggle');
  const navBackdrop = document.querySelector('.nav-backdrop');
  const sidebar = document.querySelector('.sidebar');
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const sessionCards = [...document.querySelectorAll('.session-card')];

  function closeMenu() {
    body.classList.remove('nav-open');
    navBackdrop.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }
  menuToggle.addEventListener('click', () => {
    if (body.classList.contains('nav-open')) {
      closeMenu();
      return;
    }
    body.classList.add('nav-open');
    navBackdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
    sidebar.querySelector('.nav-link').focus();
  });
  navBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('nav-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
  navLinks.forEach(link => link.addEventListener('click', closeMenu));

  // Highlight the section actually being viewed, not whichever observer callback ran last.
  // A clicked section stays highlighted while the browser scrolls smoothly to it.
  const mainSections = [...document.querySelectorAll('.page-section')];
  const sectionIds = new Set(mainSections.map(section => section.id));
  let pendingNavigation = null;
  let scrollUpdateQueued = false;
  let pendingTimeout = null;

  function activateNav(id) {
    navLinks.forEach(link => {
      const active = link.dataset.nav === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function currentVisibleSection() {
    // Use one continuous vertical reference line so the result is stable,
    // including when Learning Journey is much taller than the viewport.
    const referenceY = Math.max(110, Math.min(window.innerHeight * .29, 270));
    let activeId = mainSections[0].id;
    for (const section of mainSections) {
      if (section.getBoundingClientRect().top <= referenceY) activeId = section.id;
      else break;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) {
      activeId = mainSections[mainSections.length - 1].id;
    }
    return activeId;
  }

  function updateActiveNav() {
    scrollUpdateQueued = false;
    if (pendingNavigation) return;
    activateNav(currentVisibleSection());
  }

  function scheduleActiveNavUpdate() {
    if (scrollUpdateQueued) return;
    scrollUpdateQueued = true;
    window.requestAnimationFrame(updateActiveNav);
  }

  function finishPendingNavigation() {
    if (!pendingNavigation) return;
    pendingNavigation = null;
    if (pendingTimeout) window.clearTimeout(pendingTimeout);
    pendingTimeout = null;
    scheduleActiveNavUpdate();
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const destinationId = link.getAttribute('href').slice(1);
    if (!sectionIds.has(destinationId)) return;
    link.addEventListener('click', () => {
      activateNav(destinationId);  // Immediate feedback on click.
      pendingNavigation = destinationId;
      if (pendingTimeout) window.clearTimeout(pendingTimeout);
      // Fallback for browsers without scrollend, including short/no-scroll jumps.
      pendingTimeout = window.setTimeout(finishPendingNavigation, 1800);
    });
  });

  window.addEventListener('scroll', scheduleActiveNavUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveNavUpdate, { passive: true });
  window.addEventListener('scrollend', finishPendingNavigation);
  // If the user interrupts a navigation animation, resume normal scroll tracking.
  window.addEventListener('wheel', finishPendingNavigation, { passive: true });
  window.addEventListener('touchstart', finishPendingNavigation, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
      finishPendingNavigation();
    }
  });
  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (sectionIds.has(id)) activateNav(id);
    else if (id.startsWith('session-')) activateNav('learning');
    scheduleActiveNavUpdate();
  });
  window.addEventListener('pageshow', scheduleActiveNavUpdate);
  scheduleActiveNavUpdate();

  function setOpen(card, open) {
    const toggle = card.querySelector('.session-toggle');
    const content = card.querySelector('.session-content');
    card.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    content.hidden = !open;
    // Request photos when their session opens, including photos hidden in collapsed cards.
    if (open) card.querySelectorAll('[data-evidence-photo] img').forEach(img => { img.loading = 'eager'; });
  }
  sessionCards.forEach(card => {
    card.querySelector('.session-toggle').addEventListener('click', () => {
      setOpen(card, !card.classList.contains('is-open'));
    });
  });
  document.querySelector('#expand-all').addEventListener('click', () => {
    sessionCards.forEach(card => setOpen(card, true));
  });
  document.querySelector('#collapse-all').addEventListener('click', () => {
    sessionCards.forEach(card => setOpen(card, false));
  });

  // Add original photographs at the exact filename printed on each placeholder.
  // The image will automatically appear the next time the page is loaded.
  document.querySelectorAll('[data-evidence-photo]').forEach(card => {
    const img = card.querySelector('img');
    const markLoaded = () => {
      if (img.naturalWidth > 0) card.classList.add('has-image');
    };
    img.addEventListener('load', markLoaded);
    if (img.complete) markLoaded();
  });

  // Supports direct links such as #session-07 from a copied URL.
  function openFromHash() {
    const hash = window.location.hash;
    if (!/^#session-(?:intro|\d{2})$/.test(hash)) return;
    const card = document.querySelector(hash);
    if (card) setOpen(card, true);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
