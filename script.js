const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileLayoutQuery = window.matchMedia('(max-width: 900px)');

let stableViewportHeight = window.innerHeight;
let lastLayoutWidth = window.innerWidth;
let scrollTicking = false;

function refreshStableViewport() {
  stableViewportHeight = window.innerHeight;

  if (!mobileLayoutQuery.matches) {
    document.documentElement.style.removeProperty('--hero-height');
    document.documentElement.style.removeProperty('--hero-row-height');
    return;
  }

  const rowHeight = stableViewportHeight * 0.25;
  document.documentElement.style.setProperty('--hero-height', `${stableViewportHeight}px`);
  document.documentElement.style.setProperty('--hero-row-height', `${rowHeight}px`);
}

refreshStableViewport();

window.addEventListener('orientationchange', () => {
  window.setTimeout(refreshStableViewport, 150);
});

mobileLayoutQuery.addEventListener('change', refreshStableViewport);

function buildRevealChars(textEl) {
  if (!textEl) return [];

  const raw = textEl.textContent.trim();
  textEl.textContent = '';

  const chars = [];

  for (const char of raw) {
    const span = document.createElement('span');
    span.className = 'reveal-char';
    span.textContent = char;
    span.setAttribute('aria-hidden', 'true');
    textEl.appendChild(span);
    chars.push(span);
  }

  return chars;
}

function updateReveal(chars, textEl, sectionEl) {
  if (!textEl || !sectionEl || chars.length === 0) return 0;

  if (prefersReducedMotion) {
    chars.forEach((char) => char.classList.add('is-read'));
    return 1;
  }

  const sectionRect = sectionEl.getBoundingClientRect();
  const textRect = textEl.getBoundingClientRect();
  const viewportHeight = stableViewportHeight;

  let progress;

  if (textRect.top >= viewportHeight) {
    progress = 0;
  } else if (sectionRect.top <= 0) {
    progress = 1;
  } else {
    const endTextTop = Math.max(0, (viewportHeight - textRect.height) / 2);
    const range = viewportHeight - endTextTop;
    progress = range > 0 ? (viewportHeight - textRect.top) / range : 1;
    progress = Math.min(1, Math.max(0, progress));
  }

  const readCount = Math.floor(progress * chars.length);

  chars.forEach((char, index) => {
    char.classList.toggle('is-read', index < readCount);
  });

  return progress;
}

const statementSection = document.getElementById('statement');
const statementText = document.getElementById('statement-text');
const statementChars = buildRevealChars(statementText);

const tilesZone = document.getElementById('occasions');
const tilesPin = document.querySelector('.tiles-pin');
const tilesInner = document.querySelector('.tiles-inner');
const tilesIntro = document.getElementById('tiles-intro');
const tilesIntroChars = buildRevealChars(tilesIntro);
const tiles = [...document.querySelectorAll('.tile')];
const featuresSection = document.getElementById('features');

const desktopTilesQuery = window.matchMedia('(min-width: 901px)');

const lerp = (from, to, t) => from + (to - from) * t;

let tilesMetrics = null;

function measureTilesMetrics() {
  if (!tilesZone || !tilesPin || !tilesInner || !featuresSection) return;

  const viewportHeight = window.innerHeight;
  const sectionPad = parseFloat(getComputedStyle(featuresSection).paddingTop);

  tilesInner.style.gap = 'var(--tiles-gap-collapsed)';
  const collapsedInnerHeight = tilesInner.offsetHeight;
  const collapsedHeight = collapsedInnerHeight + sectionPad * 2;
  const collapsedGapPx = parseFloat(getComputedStyle(tilesInner).rowGap);

  tilesInner.style.gap = 'var(--tiles-gap-expanded)';
  const expandedInnerHeight = tilesInner.offsetHeight;
  const expandedPad = Math.max(0, (viewportHeight - expandedInnerHeight) / 2);
  const expandedGapPx = parseFloat(getComputedStyle(tilesInner).rowGap);
  const runway = Math.max(0, viewportHeight - collapsedHeight);

  tilesMetrics = {
    expandedHeight: viewportHeight,
    collapsedHeight,
    expandedPad,
    collapsedPad: sectionPad,
    expandedGapPx,
    collapsedGapPx,
    runway,
  };

  tilesInner.style.removeProperty('gap');
  tilesZone.style.height = `${viewportHeight + runway}px`;
}

function getTilesCompressProgress() {
  if (!tilesZone || !tilesMetrics || !desktopTilesQuery.matches) return 0;

  const rect = tilesZone.getBoundingClientRect();
  const { runway } = tilesMetrics;

  if (runway <= 0 || rect.top > 0) return 0;

  return Math.min(1, Math.max(0, -rect.top / runway));
}

function updateTilesCompress() {
  if (!tilesPin || !tilesInner || !tilesMetrics) return;

  if (!desktopTilesQuery.matches) {
    tilesZone.style.height = '';
    tilesPin.style.height = '';
    tilesPin.style.paddingTop = '';
    tilesPin.style.paddingBottom = '';
    tilesInner.style.removeProperty('gap');
    return;
  }

  const progress = getTilesCompressProgress();
  const {
    expandedHeight,
    collapsedHeight,
    expandedPad,
    collapsedPad,
    expandedGapPx,
    collapsedGapPx,
  } = tilesMetrics;

  tilesPin.style.height = `${lerp(expandedHeight, collapsedHeight, progress)}px`;
  tilesPin.style.paddingTop = `${lerp(expandedPad, collapsedPad, progress)}px`;
  tilesPin.style.paddingBottom = `${lerp(expandedPad, collapsedPad, progress)}px`;
  tilesInner.style.gap = `${lerp(expandedGapPx, collapsedGapPx, progress)}px`;
}

function updateTilesEntrance(introProgress) {
  if (tiles.length === 0 || !tilesZone) return;

  if (!desktopTilesQuery.matches) {
    tiles.forEach((tile) => tile.classList.add('is-visible'));
    return;
  }

  if (introProgress < 1) {
    tiles.forEach((tile) => tile.classList.remove('is-visible'));
    return;
  }

  if (prefersReducedMotion) {
    tiles.forEach((tile) => tile.classList.add('is-visible'));
    return;
  }

  const sectionRect = tilesZone.getBoundingClientRect();
  const viewportHeight = stableViewportHeight;
  const pastIntro = Math.max(0, -sectionRect.top);
  const flyInDistance = tilesMetrics?.runway
    ? Math.min(viewportHeight * 0.5, tilesMetrics.runway * 0.55)
    : viewportHeight * 0.45;
  const tileProgress = flyInDistance > 0 ? Math.min(1, pastIntro / flyInDistance) : 1;

  tiles.forEach((tile, index) => {
    const threshold = index / tiles.length;
    tile.classList.toggle('is-visible', tileProgress > threshold);
  });
}

function runScrollUpdates() {
  updateReveal(statementChars, statementText, statementSection);
  const tilesIntroProgress = updateReveal(tilesIntroChars, tilesIntro, tilesZone);
  updateTilesEntrance(tilesIntroProgress);
  updateTilesCompress();
}

function onScroll() {
  if (scrollTicking) {
    return;
  }

  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    runScrollUpdates();
  });
}

function onResize() {
  const width = window.innerWidth;

  if (width !== lastLayoutWidth) {
    lastLayoutWidth = width;
    refreshStableViewport();
    measureTilesMetrics();
    remeasureFloatingCta();
  }

  runScrollUpdates();
}

function remeasureFloatingCta() {
  if (!ctaFloatWrap || !actionSection) {
    return;
  }

  measureCtaMetrics();

  if (ctaFloatWrap.classList.contains('is-floating')) {
    pinFloatingPosition(true);
  }

  updateCtaFloat();
}

if (tilesZone && tilesPin && tilesInner) {
  measureTilesMetrics();
  window.addEventListener('resize', onResize);
}

window.addEventListener('scroll', onScroll, { passive: true });
runScrollUpdates();

/* Testimonials carousel — wide cards, infinite loop via edge clones */
const testimonialsViewport = document.getElementById('testimonials-viewport');
const testimonialsTrack = document.getElementById('testimonials-track');
const testimonialOriginals = testimonialsTrack
  ? [...testimonialsTrack.querySelectorAll('.testimonial-card')]
  : [];

let testimonialCards = [];
let testimonialCount = 0;
let activeTestimonial = 1;
let testimonialTimer;

function setupInfiniteTestimonials() {
  if (!testimonialsTrack || testimonialOriginals.length < 2) {
    testimonialCards = testimonialOriginals;
    testimonialCount = testimonialCards.length;
    activeTestimonial = 0;
    return;
  }

  const firstClone = testimonialOriginals[0].cloneNode(true);
  const lastClone = testimonialOriginals[testimonialOriginals.length - 1].cloneNode(true);

  firstClone.classList.add('is-clone');
  lastClone.classList.add('is-clone');
  firstClone.setAttribute('aria-hidden', 'true');
  lastClone.setAttribute('aria-hidden', 'true');
  firstClone.removeAttribute('data-index');
  lastClone.removeAttribute('data-index');

  testimonialsTrack.insertBefore(lastClone, testimonialOriginals[0]);
  testimonialsTrack.appendChild(firstClone);

  testimonialCards = [...testimonialsTrack.querySelectorAll('.testimonial-card')];
  testimonialCount = testimonialOriginals.length;
  activeTestimonial = 1;
}

function jumpTestimonialLoopIfNeeded() {
  if (testimonialCount < 2) return;

  if (activeTestimonial === 0) {
    activeTestimonial = testimonialCount;
    positionTestimonials(false);
  } else if (activeTestimonial === testimonialCount + 1) {
    activeTestimonial = 1;
    positionTestimonials(false);
  }
}

function positionTestimonials(animate = true) {
  if (!testimonialsViewport || !testimonialsTrack || testimonialCards.length === 0) return;

  const activeCard = testimonialCards[activeTestimonial];
  const viewportWidth = testimonialsViewport.offsetWidth;
  const cardLeft = activeCard.offsetLeft;
  const cardWidth = activeCard.offsetWidth;
  const offset = cardLeft - (viewportWidth - cardWidth) / 2;

  testimonialsTrack.style.transition = animate && !prefersReducedMotion ? '' : 'none';
  testimonialsTrack.style.transform = `translateX(-${offset}px)`;

  if (!animate || prefersReducedMotion) {
    void testimonialsTrack.offsetHeight;
    testimonialsTrack.style.transition = '';
  }

  testimonialCards.forEach((card, index) => {
    const isActive = index === activeTestimonial;
    const isAdjacent = Math.abs(index - activeTestimonial) === 1;
    card.classList.toggle('is-active', isActive);
    card.classList.toggle('is-adjacent', !isActive && isAdjacent);
  });
}

function goToTestimonial(index) {
  if (testimonialCards.length === 0) return;

  if (testimonialCount < 2) {
    activeTestimonial = (index + testimonialCount) % testimonialCount;
  } else {
    activeTestimonial = index;
  }

  positionTestimonials(true);

  if (prefersReducedMotion) {
    jumpTestimonialLoopIfNeeded();
  }

  resetTestimonialTimer();
}

function resetTestimonialTimer() {
  clearInterval(testimonialTimer);
  if (prefersReducedMotion || testimonialCount < 2) return;
  testimonialTimer = setInterval(() => {
    goToTestimonial(activeTestimonial + 1);
  }, 5000);
}

if (testimonialOriginals.length > 0) {
  setupInfiniteTestimonials();

  testimonialCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (index !== activeTestimonial) goToTestimonial(index);
    });
  });

  if (testimonialsTrack && testimonialCount >= 2) {
    testimonialsTrack.addEventListener('transitionend', (event) => {
      if (event.propertyName !== 'transform' || event.target !== testimonialsTrack) return;
      jumpTestimonialLoopIfNeeded();
    });
  }

  window.addEventListener('resize', () => positionTestimonials(false));
  positionTestimonials(false);
  resetTestimonialTimer();
}
/* Header menu */
const menuChip = document.getElementById('menu-chip');
const menuBtn = document.querySelector('.menu-btn');
const siteNav = document.getElementById('site-nav');

let menuAnimating = false;

function isShapeExpanded() {
  return menuChip?.classList.contains('is-shape-expanded') ?? false;
}

function updateMenuA11y(expanded) {
  if (!menuBtn) return;
  menuBtn.setAttribute('aria-expanded', String(expanded));
  menuBtn.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
}

function waitForTransition(element, propertyName, callback) {
  if (prefersReducedMotion) {
    callback();
    return;
  }

  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    element.removeEventListener('transitionend', onEnd);
    clearTimeout(fallback);
    callback();
  };

  const onEnd = (event) => {
    if (event.target !== element || event.propertyName !== propertyName) return;
    finish();
  };

  const fallback = window.setTimeout(finish, 900);

  element.addEventListener('transitionend', onEnd);
}

function waitForShapeExpand(callback) {
  if (prefersReducedMotion) {
    callback();
    return;
  }

  let widthDone = false;
  let heightDone = false;

  const maybeFinish = () => {
    if (widthDone && heightDone) callback();
  };

  waitForTransition(menuChip, 'width', () => {
    widthDone = true;
    maybeFinish();
  });

  waitForTransition(siteNav, 'grid-template-rows', () => {
    heightDone = true;
    maybeFinish();
  });
}

function waitForShapeCollapse(callback) {
  waitForShapeExpand(callback);
}

function openMenu() {
  if (!menuChip || !siteNav || menuAnimating || isShapeExpanded()) return;

  if (prefersReducedMotion) {
    siteNav.hidden = false;
    menuChip.classList.add('is-shape-expanded', 'is-open');
    updateMenuA11y(true);
    return;
  }

  menuAnimating = true;
  siteNav.hidden = false;
  menuChip.classList.add('is-shape-expanded');
  updateMenuA11y(true);

  waitForShapeExpand(() => {
    menuChip.classList.add('is-open');
    waitForTransition(siteNav, 'opacity', () => {
      menuAnimating = false;
    });
  });
}

function closeMenu() {
  if (!menuChip || !siteNav || menuAnimating || !isShapeExpanded()) return;

  if (prefersReducedMotion) {
    menuChip.classList.remove('is-shape-expanded', 'is-open');
    siteNav.hidden = true;
    updateMenuA11y(false);
    return;
  }

  menuAnimating = true;
  menuChip.classList.remove('is-open');
  menuChip.classList.add('is-closing');

  waitForShapeCollapse(() => {
    menuChip.classList.remove('is-shape-expanded', 'is-closing');
    siteNav.hidden = true;
    updateMenuA11y(false);
    menuAnimating = false;
  });
}

if (menuChip && menuBtn && siteNav) {
  menuBtn.addEventListener('click', () => {
    if (isShapeExpanded()) {
      closeMenu();
      return;
    }

    openMenu();
  });

  document.addEventListener('click', (event) => {
    if (!isShapeExpanded()) return;
    if (menuChip.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}


/* Floating CTA — viewport anchor when scrolling up, never below original position */
const actionSection = document.getElementById('action');
const actionCta = document.getElementById('action-cta');
const ctaFloatWrap = document.getElementById('action-cta-float-wrap');
const ctaButton = document.getElementById('cta-button');
const ctaAnchor = document.getElementById('action-cta-anchor');
const ctaDismiss = document.getElementById('cta-dismiss');
const siteFooter = document.querySelector('.site-footer');

let ctaSeen = false;
let ctaDismissed = false;
let ctaFloatBottom = 0;
let originalButtonDocBottom = 0;
let footerInView = false;

function measureCtaMetrics() {
  if (!actionSection || !ctaFloatWrap || ctaFloatWrap.classList.contains('is-floating')) return;

  const actionRect = actionSection.getBoundingClientRect();
  const wrapRect = ctaFloatWrap.getBoundingClientRect();
  ctaFloatBottom = Math.max(0, actionRect.bottom - wrapRect.bottom);
  originalButtonDocBottom = wrapRect.bottom + window.scrollY;
  document.documentElement.style.setProperty('--cta-float-bottom', `${ctaFloatBottom}px`);
}

function pinFloatingPosition(useAnchor = false) {
  if (!ctaFloatWrap || !actionCta) return;

  const width = ctaFloatWrap.offsetWidth;
  let left;

  if (useAnchor) {
    const ctaRect = actionCta.getBoundingClientRect();
    left = ctaRect.left + (ctaRect.width - width) / 2;
  } else {
    left = ctaFloatWrap.getBoundingClientRect().left;
  }

  document.documentElement.style.setProperty('--cta-float-left', `${left}px`);
  document.documentElement.style.setProperty('--cta-float-width', `${width}px`);
}

function unpinCtaFloat() {
  if (!ctaFloatWrap || !ctaAnchor) {
    return;
  }

  ctaFloatWrap.classList.remove('is-floating');
  ctaAnchor.style.height = '0';
}

function updateCtaFloat() {
  if (!ctaSeen || ctaDismissed || !ctaFloatWrap || !ctaAnchor || !originalButtonDocBottom) return;

  if (mobileLayoutQuery.matches) {
    unpinCtaFloat();
    return;
  }

  if (footerInView) {
    unpinCtaFloat();
    return;
  }

  const viewportHeight = stableViewportHeight;
  const stickyLine = viewportHeight - ctaFloatBottom;
  const floatDocBottom = window.scrollY + viewportHeight - ctaFloatBottom;
  const canFloat = floatDocBottom <= originalButtonDocBottom + 1;

  const naturalBottom = ctaFloatWrap.classList.contains('is-floating')
    ? ctaAnchor.getBoundingClientRect().bottom
    : ctaFloatWrap.getBoundingClientRect().bottom;

  const shouldFloat = canFloat && (
    naturalBottom >= viewportHeight ||
    naturalBottom > stickyLine
  );

  if (shouldFloat && !ctaFloatWrap.classList.contains('is-floating')) {
    pinFloatingPosition(false);
    ctaAnchor.style.height = `${ctaFloatWrap.offsetHeight}px`;
    ctaFloatWrap.classList.add('is-floating');
  } else if (!shouldFloat && ctaFloatWrap.classList.contains('is-floating')) {
    unpinCtaFloat();
  }
}

function dismissCtaFloat() {
  if (!ctaFloatWrap || !ctaAnchor) return;

  ctaDismissed = true;
  unpinCtaFloat();
}

if (siteFooter) {
  const footerObserver = new IntersectionObserver(
    (entries) => {
      footerInView = entries.some((entry) => entry.isIntersecting);
      updateCtaFloat();
    },
    { threshold: 0 }
  );

  footerObserver.observe(siteFooter);
}

if (actionSection && ctaButton && actionCta && ctaFloatWrap) {
  const ctaObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        ctaSeen = true;
        measureCtaMetrics();
        updateCtaFloat();
        ctaObserver.disconnect();
      }
    },
    { threshold: 0.35 }
  );

  ctaObserver.observe(ctaButton);

  ctaDismiss?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissCtaFloat();
  });

  window.addEventListener('scroll', updateCtaFloat, { passive: true });
}

/* Airtable interface forms do not send autosize events — heights are measured per width */
function getAirtableFormHeight(iframeWidth) {
  if (iframeWidth <= 360) {
    return 980;
  }

  if (iframeWidth <= 450) {
    return 940;
  }

  if (iframeWidth <= 550) {
    return 760;
  }

  if (iframeWidth <= 750) {
    return 690;
  }

  return 640;
}

function setupAirtableFormEmbed(iframe) {
  if (!iframe || iframe.dataset.airtableInit === 'true') {
    return;
  }

  iframe.dataset.airtableInit = 'true';
  iframe.setAttribute('scrolling', 'no');

  function postToIframe(message) {
    iframe.contentWindow?.postMessage(message, '*');
  }

  function notifyViewport() {
    const rect = iframe.getBoundingClientRect();
    postToIframe({
      key: 'airtableEmbedViewportChanged',
      embedRectInViewport: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      },
      embedViewportSize: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    });
  }

  function applyHeight() {
    const width = iframe.getBoundingClientRect().width;
    if (!width) {
      return;
    }

    const height = getAirtableFormHeight(width);
    iframe.style.height = `${height}px`;
    iframe.setAttribute('height', String(height));
    notifyViewport();
  }

  applyHeight();

  iframe.addEventListener('load', () => {
    postToIframe({ key: 'airtableDisableScrollbar' });
    applyHeight();
    window.setTimeout(applyHeight, 500);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(applyHeight, 200);
  }, { passive: true });

  return applyHeight;
}

function initAirtableFormEmbeds() {
  document.querySelectorAll('iframe.airtable-embed.airtable-dynamic-height').forEach((iframe) => {
    if (iframe.src || !iframe.dataset.src) {
      setupAirtableFormEmbed(iframe);
    }
  });
}

initAirtableFormEmbeds();

const ORDER_FORM_SRC = 'https://airtable.com/embed/appmNgmruz2Hb4JU2/pageVyjotVc9UuWWO/form';

function initOrderModal() {
  const modal = document.getElementById('order-modal');
  const openBtn = document.getElementById('cta-button');
  const closeBtn = document.getElementById('order-modal-close');
  const backdrop = modal?.querySelector('[data-order-modal-close]');
  const iframe = document.getElementById('order-form-embed');

  if (!modal || !openBtn) {
    return;
  }

  let lastFocus = null;
  let refreshEmbedHeight = null;

  function ensureEmbed() {
    if (!iframe) {
      return;
    }

    if (!iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }

    refreshEmbedHeight = setupAirtableFormEmbed(iframe) ?? refreshEmbedHeight;
    window.setTimeout(() => refreshEmbedHeight?.(), 100);
    window.setTimeout(() => refreshEmbedHeight?.(), 500);
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.classList.add('order-modal-open');
    ensureEmbed();
    closeBtn?.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('order-modal-open');

    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

initOrderModal();

function initLegalTiles() {
  const tiles = document.querySelectorAll('.legal-tile');
  if (!tiles.length) {
    return;
  }

  function openFromHash() {
    const id = window.location.hash.slice(1);
    if (!id) {
      return;
    }

    const tile = document.getElementById(id);
    if (tile?.classList.contains('legal-tile')) {
      tile.open = true;
      window.setTimeout(() => {
        tile.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }, 50);
    }
  }

  document.querySelectorAll('a[href^="#legal-"]').forEach((link) => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href')?.slice(1);
      const tile = id ? document.getElementById(id) : null;
      if (tile) {
        tile.open = true;
      }
    });
  });

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
}

initLegalTiles();