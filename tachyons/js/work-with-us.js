'use strict';
(() => {
  const page = document.querySelector('.work-page');
  if (!page) return;
  // Page animations are always enabled, as requested for this page.
  const motionEnabled = true;
  page.classList.add('work-motion');
  const film = document.querySelector('.work-film');
  const video = document.getElementById('work-video');
  const videoButton = document.getElementById('work-video-toggle');
  const videoError = document.querySelector('.work-video-error');
  let userVideoChoice = null;
  let filmVisible = true;
  const syncVideoButton = () => {
    videoButton.firstElementChild.textContent = video.paused ? '▶' : 'Ⅱ';
    videoButton.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
  };
  const updateVideo = () => {
    if (document.hidden || !filmVisible || userVideoChoice === false || (!motionEnabled && userVideoChoice !== true)) {
      video.pause();
    } else {
      video.play().catch(syncVideoButton);
    }
    syncVideoButton();
  };
  video.muted = true;
  video.defaultMuted = true;
  video.addEventListener('play', syncVideoButton);
  video.addEventListener('pause', syncVideoButton);
  video.addEventListener('loadeddata', () => { videoError.hidden = true; updateVideo(); });
  video.addEventListener('error', () => { videoError.hidden = false; });
  video.querySelector('source').addEventListener('error', () => { videoError.hidden = false; });
  videoButton.addEventListener('click', () => { userVideoChoice = video.paused; updateVideo(); });
  document.addEventListener('visibilitychange', updateVideo);

  // Native scrolling stays in control. Only visible media and text are animated.
  const lines = [...document.querySelectorAll('.work-statement h2 > span')];
  let frame = 0;
  const renderScroll = () => {
    frame = 0;
    if (!motionEnabled) return;
    const rect = film.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      const offset = Math.max(-rect.height * .065, Math.min(rect.height * .065, (innerHeight * .5 - rect.top - rect.height * .5) * .1));
      film.style.setProperty('--film-offset', offset.toFixed(2) + 'px');
    }
    lines.forEach(line => {
      const rect = line.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight * .9 - rect.top) / (innerHeight * .35)));
      line.style.setProperty('--word-fill', (progress * 100).toFixed(2) + '%');
    });
  };
  const requestScroll = () => { if (!frame) frame = requestAnimationFrame(renderScroll); };
  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll, { passive: true });
  // Animate the contents of a box independently, through fixed clipping windows.
  const running = new Set();
  const originalText = new WeakMap();
  const scrambles = new Map();
  const ease = 'cubic-bezier(.65,.05,.35,1)';
  const animate = (element, keyframes, options = {}) => {
    if (!motionEnabled || !element?.animate) return null;
    const animation = element.animate(keyframes, { duration: 500, easing: ease, fill: 'both', ...options });
    running.add(animation);
    animation.finished.then(() => {
      if (options.fill !== 'forwards') { running.delete(animation); animation.cancel(); }
    }, () => running.delete(animation));
    return animation;
  };
  const finishAnimations = () => {
    [...running].forEach(animation => animation.finish());
    scrambles.forEach((state, element) => { cancelAnimationFrame(state.frame); state.visual.textContent = state.text; });
    scrambles.clear();
  };
  const plainText = element => {
    if (!originalText.has(element)) {
      originalText.set(element, [...element.childNodes].map(node => node.nodeName === 'BR' ? '\n' : node.textContent).join(''));
    }
    return originalText.get(element);
  };
  const accessibleVisual = (element, text) => {
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = text;
    const visual = document.createElement('span');
    visual.className = 'work-text-visual';
    visual.setAttribute('aria-hidden', 'true');
    element.replaceChildren(accessible, visual);
    return visual;
  };
  const splitLines = element => {
    const text = plainText(element);
    const visual = accessibleVisual(element, text);
    const words = [];
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/\s/.test(part[0])) {
        if (part.includes('\n')) visual.append(document.createElement('br'));
        else visual.append(document.createTextNode(' '));
      } else {
        const word = document.createElement('span');
        word.textContent = part;
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
      mask.className = 'work-text-mask';
      const line = document.createElement('span');
      line.className = 'work-text-line';
      line.textContent = group.words.join(' ');
      mask.append(line);
      return mask;
    }));
  };
  const revealLines = (element, delay = 0) => {
    element.querySelectorAll('.work-text-line').forEach((line, i) => {
      animate(line, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { delay: delay + i * 50 });
    });
  };
  const scramble = (element, delay = 0) => {
    if (!motionEnabled || !element) return;
    const text = plainText(element);
    const prior = scrambles.get(element);
    if (prior) cancelAnimationFrame(prior.frame);
    const visual = accessibleVisual(element, text);
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
  };

  const tablist = document.querySelector('.work-tabs');
  const tabs = [...tablist.querySelectorAll('[role=tab]')];
  const panelStage = document.querySelector('.work-panels');
  const panels = [...document.querySelectorAll('.work-culture-panel')];
  let selected = 0;
  let ghost = null;
  let ghostTimer = 0;
  const clearGhost = () => {
    clearTimeout(ghostTimer);
    ghost?.getAnimations({ subtree: true }).forEach(animation => { running.delete(animation); animation.cancel(); });
    ghost?.remove();
    ghost = null;
  };
  const moveIndicator = () => {
    tablist.style.setProperty('--tab-left', tabs[selected].offsetLeft + 'px');
    tablist.style.setProperty('--tab-width', tabs[selected].offsetWidth + 'px');
  };
  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[i].id);
    panel.tabIndex = 0;
    const count = panel.querySelector('.work-panel-index > .eyebrow');
    const digit = document.createElement('span');
    digit.className = 'work-counter-window';
    const value = document.createElement('span');
    value.className = 'work-counter-value';
    value.textContent = String(i + 1).padStart(2, '0');
    digit.append(value);
    count.replaceChildren(digit, document.createTextNode(' / ' + String(panels.length).padStart(2, '0')));
    const number = panel.querySelector('.work-panel-number');
    const numberValue = document.createElement('span');
    numberValue.className = 'work-number-value';
    numberValue.textContent = String(i + 1);
    number.replaceChildren(numberValue);
    const image = panel.querySelector('img');
    const window = document.createElement('div');
    window.className = 'work-image-window';
    image.before(window);
    window.append(image);
  });
  const lineElements = [...document.querySelectorAll('.work-intro h2, .work-intro p:not(.eyebrow), .work-section-heading h2, .work-opportunities-heading h2, .work-opportunities-heading > p, .work-contact h2, .work-contact-lead, .work-contact-steps h3, .work-contact-steps p')];
  const layoutText = () => {
    finishAnimations();
    clearGhost();
    lineElements.forEach(splitLines);
    document.querySelectorAll(".work-accordion details[open] .work-accordion-content p").forEach(text => {
      if (!text.querySelector("strong, a, em")) splitLines(text);
    });
    // All panels share one measured height, so switching never moves the next section.
    panelStage.classList.add('work-measuring');
    panels.forEach(panel => { panel.hidden = false; panel.style.removeProperty('min-height'); });
    panels.forEach(panel => splitLines(panel.querySelector('.work-panel-copy > p')));
    const height = Math.ceil(Math.max(...panels.map(panel => panel.getBoundingClientRect().height)));
    panels.forEach((panel, i) => { panel.style.minHeight = height + 'px'; panel.hidden = i !== selected; });
    panelStage.classList.remove('work-measuring');
    moveIndicator();
  };
  const animatePanelIn = panel => {
    revealLines(panel.querySelector('.work-panel-copy > p'));
    panel.querySelectorAll('.work-counter-value, .work-number-value').forEach(number => {
      animate(number, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 500 });
    });
    animate(panel.querySelector('img'), [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]);
    const title = panel.querySelector('h3');
    scramble(title, 100);
    animate(title, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }], { delay: 150, duration: 500 });
    [panel.querySelector('.work-text-link'), panel.querySelector('figcaption')].forEach(element => {
      animate(element, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: 220 });
    });
  };
  const animatePanelOut = panel => {
    panel.querySelectorAll('.work-text-line').forEach((line, i) => {
      animate(line, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { delay: i * 50, fill: 'forwards' });
    });
    panel.querySelectorAll('.work-counter-value, .work-number-value').forEach(number => {
      animate(number, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { fill: 'forwards' });
    });
    animate(panel.querySelector('img'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { fill: 'forwards' });
    [panel.querySelector('h3'), panel.querySelector('.work-text-link'), panel.querySelector('figcaption')].forEach(element => {
      animate(element, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    });
  };
  const selectTab = (index, focus = false) => {
    if (index === selected) { if (focus) tabs[index].focus(); return; }
    finishAnimations();
    clearGhost();
    if (motionEnabled) {
      ghost = panels[selected].cloneNode(true);
      ghost.classList.add('work-panel-ghost');
      ghost.removeAttribute('id');
      ghost.removeAttribute('role');
      ghost.removeAttribute('aria-labelledby');
      ghost.removeAttribute('tabindex');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.inert = true;
      ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      panelStage.append(ghost);
    }
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    moveIndicator();
    if (focus) tabs[index].focus();
    if (motionEnabled) {
      if (ghost) animatePanelOut(ghost);
      animatePanelIn(panels[index]);
      ghostTimer = setTimeout(clearGhost, 1050);
    }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', event => {
      let index;
      if (event.key === 'ArrowRight') index = (i + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(index, true);
    });
  });
  tablist.hidden = false;
  page.classList.add('work-enhanced');
  layoutText();
  let resizeTimer = 0;
  let layoutWidth = document.documentElement.clientWidth;
  addEventListener('resize', () => {
    if (layoutWidth === document.documentElement.clientWidth) return;
    layoutWidth = document.documentElement.clientWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutText, 120);
  }, { passive: true });
  document.fonts.ready.then(layoutText);

  const revealGroup = element => {
    if (!motionEnabled) return;
    lineElements.filter(text => element.contains(text)).forEach((text, i) => revealLines(text, i * 60));
    element.querySelectorAll('.eyebrow').forEach(label => {
      if (!label.closest('.work-panels')) scramble(label);
    });
    if (element.matches('.eyebrow')) scramble(element);
    if (element === panelStage) animatePanelIn(panels[selected]);
    if (element.classList.contains('work-accordion')) {
      element.querySelectorAll('summary').forEach((summary, i) => {
        animate(summary, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }], { delay: i * 90, duration: 650 });
      });
    }
  };
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('work-visible');
        revealGroup(entry.target);
        reveal.unobserve(entry.target);
      }
    }), { threshold: .15 });
    document.querySelectorAll('[data-work-reveal]').forEach(element => reveal.observe(element));
    new IntersectionObserver(entries => { filmVisible = entries[0].isIntersecting; updateVideo(); }, { threshold: .05 }).observe(film);
  }

  // Keep real <details> semantics and the no-JavaScript fallback.
  document.querySelectorAll('.work-accordion details').forEach(details => {
    const summary = details.querySelector('summary');
    let animation = null;
    let targetOpen = details.open;
    summary.addEventListener('click', event => {
      if (!motionEnabled || !details.animate) return;
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      targetOpen = animation ? !targetOpen : !details.open;
      if (animation) { animation.onfinish = null; animation.cancel(); }
      details.open = true;
      if (targetOpen) {
        const text = details.querySelector('.work-accordion-content p');
        if (text && !text.querySelector('strong, a, em')) {
          splitLines(text);
          revealLines(text, 100);
        } else if (text) {
          animate(text, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: 100 });
        }
      }
      const to = targetOpen ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
      details.style.overflow = 'hidden';
      animation = details.animate([{ height: from + 'px' }, { height: to + 'px' }], {
        duration: 350, easing: 'cubic-bezier(.22,1,.36,1)'
      });
      animation.onfinish = () => {
        details.open = targetOpen;
        details.style.removeProperty('overflow');
        animation = null;
        requestScroll();
      };
    });
  });
  updateVideo();
  requestScroll();
})();
