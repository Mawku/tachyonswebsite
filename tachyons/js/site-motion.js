'use strict';
(() => {
  const root = document.body;
  root.classList.add('site-motion-on');
  const ease = 'cubic-bezier(.65,.05,.35,1)';
  const originals = new WeakMap();
  const lineElements = new Set();
  const records = new Map();
  const effects = new WeakMap();
  const scrambles = new Map();
  const mediaStates = new WeakMap();
  const activeMedia = new Set();
  let ready = false;

  function animate(element, frames, options = {}) {
    if (!element?.animate) return null;
    const animation = element.animate(frames, { duration: 550, easing: ease, fill: 'both', ...options });
    let group = effects.get(element);
    if (!group) effects.set(element, group = new Set());
    group.add(animation);
    animation.finished.then(() => { group.delete(animation); animation.cancel(); }, () => group.delete(animation));
    return animation;
  }
  function stop(element) {
    [element, ...element.querySelectorAll('*')].forEach(node => {
      effects.get(node)?.forEach(animation => animation.cancel());
      const state = scrambles.get(node);
      if (state) { cancelAnimationFrame(state.frame); state.visual.textContent = state.text; scrambles.delete(node); }
    });
  }
  function original(element) {
    if (!originals.has(element)) originals.set(element, element.innerHTML);
    return originals.get(element);
  }
  function plainText(element) {
    const holder = document.createElement('div');
    holder.innerHTML = original(element);
    holder.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return holder.textContent;
  }
  function makeVisual(element, text) {
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = text;
    const visual = document.createElement('span');
    visual.className = 'site-motion-visual';
    visual.setAttribute('aria-hidden', 'true');
    element.replaceChildren(accessible, visual);
    return visual;
  }
  function splitLines(element) {
    stop(element);
    const text = plainText(element);
    const visual = makeVisual(element, text);
    const words = [];
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/\s/.test(part[0])) visual.append(part.includes('\n') ? document.createElement('br') : document.createTextNode(' '));
      else {
        const word = document.createElement('span');
        word.textContent = part;
        word.style.display = 'inline';
        visual.append(word);
        words.push(word);
      }
    });
    const groups = [];
    words.forEach(word => {
      const top = Math.round(word.getBoundingClientRect().top);
      let group = groups[groups.length - 1];
      if (!group || Math.abs(group.top - top) > 3) { group = { top, words: [] }; groups.push(group); }
      group.words.push(word.textContent);
    });
    visual.replaceChildren(...groups.map(group => {
      const mask = document.createElement('span');
      mask.className = 'site-line-mask';
      const line = document.createElement('span');
      line.className = 'site-motion-line';
      line.textContent = group.words.join(' ');
      mask.append(line);
      return mask;
    }));
    element.classList.add('site-split-text');
    lineElements.add(element);
  }
  function revealLines(element, delay = 0) {
    element.querySelectorAll('.site-motion-line').forEach((line, i) => {
      animate(line, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { delay: delay + i * 50 });
    });
  }
  function scramble(element, delay = 0) {
    stop(element);
    const text = plainText(element);
    const visual = makeVisual(element, text);
    // The hidden original sets the label's size throughout the effect.
    element.classList.add('site-scramble-label');
    const size = document.createElement('span');
    size.className = 'site-scramble-size';
    size.setAttribute('aria-hidden', 'true');
    size.textContent = text;
    element.append(size);
    visual.textContent = text;
    const state = { text, visual, frame: 0, start: performance.now() + delay, tick: -1 };
    scrambles.set(element, state);
    const draw = time => {
      if (scrambles.get(element) !== state) return;
      const progress = Math.max(0, Math.min(1, (time - state.start) / 500));
      const tick = Math.floor(time / 45);
      if (tick !== state.tick) {
        state.tick = tick;
        const settled = Math.floor(progress * text.length);
        visual.textContent = [...text].map((char, i) => {
          if (i < settled || !/[a-z]/i.test(char)) return char;
          const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(i * 7 + tick * 13) % 26];
          return char === char.toLowerCase() ? letter.toLowerCase() : letter;
        }).join('');
      }
      if (progress < 1) state.frame = requestAnimationFrame(draw);
      else { visual.textContent = text; scrambles.delete(element); }
    };
    state.frame = requestAnimationFrame(draw);
  }
  function reveal(element, type, delay = 0) {
    if (type === 'lines') revealLines(element, delay);
    else if (type === 'label') scramble(element, delay);
    else if (type === 'image') animate(element, [
      { clipPath: 'inset(100% 0 0 0)', transform: 'translateY(22px)' },
      { clipPath: 'inset(0)', transform: 'translateY(0)' }
    ], { duration: 800, delay });
    else animate(element, [{ opacity: .1, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0)' }], { duration: 650, delay });
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    visible.forEach((entry, i) => {
      const record = records.get(entry.target);
      if (!record || record.seen) return;
      record.seen = true;
      entry.target.classList.add('site-motion-seen');
      reveal(entry.target, record.type, Math.min(i * 45, 180));
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 }) : null;
  function register(element, type) {
    if (!element || records.has(element) || !element.textContent.trim() && type !== 'image') return;
    // Preserve links, emphasis and structured content. Those blocks use a whole-block reveal.
    if (type === 'lines' && [...element.children].some(child => child.tagName !== 'BR')) type = 'block';
    if (type === 'lines') splitLines(element);
    records.set(element, { type, seen: false });
    if (observer) observer.observe(element);
  }

  function cleanMedia(stage) {
    const state = mediaStates.get(stage);
    if (!state) return;
    state.cancelled = true;
    clearTimeout(state.timer);
    state.ghost?.remove();
    state.image.style.removeProperty('visibility');
    stop(state.image);
    mediaStates.delete(stage);
    activeMedia.delete(stage);
  }
  function rollCounter(element, previous) {
    if (!element) return;
    stop(element);
    const next = element.textContent;
    const visual = makeVisual(element, next);
    element.classList.add('site-roll-counter');
    const incoming = document.createElement('span');
    incoming.className = 'site-counter-in';
    incoming.textContent = next;
    const outgoing = document.createElement('span');
    outgoing.className = 'site-counter-out';
    outgoing.textContent = previous;
    visual.replaceChildren(incoming, outgoing);
    const effect = animate(incoming, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }]);
    animate(outgoing, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }]);
    effect?.finished.then(() => outgoing.remove(), () => outgoing.remove());
  }
  function swapMedia({ stage, image, headings = [], labels = [], body = [], counter }, update) {
    const pending = mediaStates.get(stage);
    const previousImage = pending && image.style.visibility === 'hidden' ? pending.ghost.cloneNode(false) : image.cloneNode(false);
    cleanMedia(stage);
    const previousCounter = counter?.querySelector('.sr-only')?.textContent || counter?.textContent || '';
    const ghost = previousImage;
    ghost.removeAttribute('id');
    ghost.removeAttribute('loading');
    ghost.alt = '';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.className = 'site-media-ghost';
    ghost.style.removeProperty('visibility');
    update();
    if (!ready) return;
    const state = { image, ghost, cancelled: false, timer: 0 };
    mediaStates.set(stage, state);
    activeMedia.add(stage);
    stage.classList.add('site-media-stage');
    image.classList.add('site-media-current');
    image.before(ghost);
    // Decode before the wipe. A stale decode must never animate a newer selection.
    const startImage = () => {
      if (state.cancelled) return;
      const effect = animate(image, [{ clipPath: 'inset(100% 0 0)' }, { clipPath: 'inset(0)' }], { duration: 650 });
      effect?.finished.then(() => { ghost.remove(); }, () => { ghost.remove(); });
      state.timer = setTimeout(() => cleanMedia(stage), 850);
    };
    if (image.complete && image.naturalWidth) startImage();
    else {
      image.style.visibility = 'hidden';
      const finish = () => { if (!state.cancelled) { image.style.removeProperty('visibility'); startImage(); } };
      image.decode().then(finish, finish);
    }
    headings.forEach(element => { originals.delete(element); splitLines(element); revealLines(element, 60); });
    labels.forEach(element => { originals.delete(element); scramble(element, 100); });
    body.forEach(element => { stop(element); reveal(element, 'block', 100); });
    rollCounter(counter, previousCounter);
  }
  window.TachyonsMotion = { swapMedia };

  function animateMenu() {
    const menu = document.getElementById('navigation');
    if (!menu.open) { stop(menu); return; }
    menu.querySelectorAll('.menu-links a').forEach((link, i) => {
      stop(link);
      animate(link, [{ clipPath: 'inset(100% 0 0)', transform: 'translateY(22px)' }, { clipPath: 'inset(0)', transform: 'translateY(0)' }], { delay: i * 45, duration: 550 });
    });
    menu.querySelectorAll('.eyebrow').forEach(element => scramble(element, 80));
    reveal(menu.querySelector('.menu-feature img'), 'image', 160);
    reveal(menu.querySelector('.menu-feature h2'), 'block', 200);
  }
  new MutationObserver(animateMenu).observe(document.getElementById('navigation'), { attributes: true, attributeFilter: ['open'] });
  const search = document.getElementById('search-dialog');
  new MutationObserver(() => {
    if (search.open) { scramble(document.getElementById('search-title')); reveal(document.getElementById('site-search'), 'block'); }
    else stop(search);
  }).observe(search, { attributes: true, attributeFilter: ['open'] });
  new MutationObserver(() => {
    if (!search.open) return;
    document.querySelectorAll('.search-result').forEach((result, i) => reveal(result, 'block', Math.min(i * 40, 200)));
  }).observe(document.getElementById('search-results'), { childList: true });

  function prepare() {
    if (ready) return;
    ready = true;
    const main = document.querySelector('main');
    if (!root.classList.contains('work-page')) {
      main.querySelectorAll('h1, h2, h3').forEach(element => {
        if (element.closest('.feature-label') || element.id === 'robot-gallery-title') return;
        register(element, element.classList.contains('eyebrow') ? 'label' : 'lines');
      });
      main.querySelectorAll('.eyebrow').forEach(element => {
        if (element.closest('.feature-label') || element.hasAttribute('hidden')) return;
        register(element, 'label');
      });
      main.querySelectorAll('.interior-hero > p:not(.eyebrow), .story-section p, .story-pull p, .direction-row p, .duplex-copy p, .manifesto article > p, .contact-section > div > p:not(.eyebrow):not(.copy-status), .member-info > p:not(.eyebrow), .member-info blockquote, .robot-intro-bottom > p, .robot-updates-heading > p:not(.eyebrow), .robot-news-content > p:not(.eyebrow), .software-hero-bottom > p, .software-intro > p, .software-product-copy > p:not(.software-footnote):not(.software-download-status), .software-notes > div:last-child p').forEach(element => register(element, 'lines'));
      main.querySelectorAll('.member-art img, .duplex-art, .robot-news-image, .software-product-image img').forEach(element => register(element, 'image'));
      main.querySelectorAll('.member-art small, .robot-news-entry time, .policy-sidebar, .policy-content > p, .policy-content > ul, .policy-content > ol, .form-privacy-note, #contact-form, .feature-panel, #robot-gallery-stage').forEach(element => register(element, 'block'));
      document.querySelectorAll('.hero h1 > span').forEach(element => register(element, 'lines'));
      register(document.querySelector('.hero-copy > p'), 'block');
    }
    document.querySelectorAll('.footer-grid .eyebrow').forEach(element => register(element, 'label'));
    document.querySelectorAll('.footer-cta, .footer-wordmark, .footer-grid > div').forEach(element => register(element, 'block'));
    requestScroll();
  }
  document.fonts.ready.then(prepare);

  let width = document.documentElement.clientWidth;
  let resizeTimer;
  addEventListener('resize', () => {
    if (width === document.documentElement.clientWidth) return;
    width = document.documentElement.clientWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      activeMedia.forEach(cleanMedia);
      lineElements.forEach(element => { if (element.isConnected && element.getClientRects().length) splitLines(element); });
      requestScroll();
    }, 120);
  }, { passive: true });
  const statement = document.querySelector('.statement');
  let scrollFrame = 0;
  function requestScroll() {
    if (!statement || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const rect = statement.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight * .9 - rect.top) / (rect.height + innerHeight * .35)));
      statement.style.setProperty('--statement-fill', (progress * 100).toFixed(2) + '%');
    });
  }
  addEventListener('scroll', requestScroll, { passive: true });
  // Keyboard navigation and anchor links must always reveal their destination immediately.
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.site-split-text, .footer-cta, .search-result, .menu-links a');
    if (element) stop(element);
  });
})();
