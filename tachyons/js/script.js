const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Boot sequence ----
const boot = document.getElementById('boot');
const bootLog = document.getElementById('boot-log');
const bootPrompt = document.getElementById('boot-prompt');
const heroTyped = document.getElementById('hero-typed');
const HERO_TEXT = 'TACHYONS.eu';

const BOOT_LINES = [
  'loading tachyons.eu...',
  'is this website larp?... <span class="affermative">done</span>',
  'asking fable 5 to fix my life... out of tokens',
  'initializing larp.exe...',
  '<span class="ok">ready.</span>'
];

function typeHero() {
  if (!heroTyped) return;
  if (prefersReducedMotion) {
    heroTyped.textContent = HERO_TEXT;
    return;
  }
  let i = 0;
  const type = () => {
    heroTyped.textContent = HERO_TEXT.slice(0, i);
    i++;
    if (i <= HERO_TEXT.length) setTimeout(type, 55);
  };
  type();
}

function skipToSite() {
  window.removeEventListener('keydown', skipToSite);
  window.removeEventListener('click', skipToSite);
  window.removeEventListener('touchstart', skipToSite);
  if (!boot) { typeHero(); return; }
  boot.classList.add('is-hidden');
  document.body.style.overflow = '';
  setTimeout(() => {
    boot.classList.remove('is-active');
  }, 500);
  try { sessionStorage.setItem('tachyons-booted', '1'); } catch (e) {}
  typeHero();
}

function runBoot() {
  if (!boot || !bootLog) { typeHero(); return; }

  let alreadyBooted = false;
  try { alreadyBooted = sessionStorage.getItem('tachyons-booted') === '1'; } catch (e) {}

  if (prefersReducedMotion || alreadyBooted) {
    typeHero();
    return;
  }

  boot.classList.add('is-active');
  document.body.style.overflow = 'hidden';

  let line = 0;
  const showNextLine = () => {
    if (line >= BOOT_LINES.length) {
      bootPrompt.hidden = false;
      window.addEventListener('keydown', skipToSite);
      window.addEventListener('click', skipToSite);
      window.addEventListener('touchstart', skipToSite);
      setTimeout(skipToSite, 3200);
      return;
    }
    const p = document.createElement('p');
    p.innerHTML = '<span class="ok">&gt;</span> ' + BOOT_LINES[line];
    bootLog.appendChild(p);
    line++;
    setTimeout(showNextLine, 260);
  };
  setTimeout(showNextLine, 200);
}

runBoot();

// ---- Mobile nav toggle ----
const toggle = document.getElementById('nav-toggle');
const links = document.getElementById('nav-links');

if (toggle && links) {
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    });
  });
}

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && revealEls.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => observer.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

// ---- Footer year ----
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ---- Attenua il Prism BG allo scroll (effetto fioco) ----
const prismBg = document.getElementById('prism-bg');

if (prismBg) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    if (maxScroll > 0) {
      const scrollPercent = scrollY / maxScroll;
      // Il valore 0.35 stabilisce l'opacità minima sotto la quale non scenderà mai
      const minOpacity = 0.35;
      const currentOpacity = Math.max(minOpacity, 1 - (scrollPercent * 1.2));
      prismBg.style.opacity = currentOpacity;
    }
  }, { passive: true });
}

// ---- Evidenziatore di testo allo scroll ----
const aboutText = document.getElementById('about-text');

if (aboutText) {
  // Dividi il testo in parole usando un'espressione regolare per gestire spazi multipli/a capo
  const words = aboutText.textContent.trim().split(/\s+/);
  aboutText.innerHTML = ''; 
  
  words.forEach(word => {
    const span = document.createElement('span');
    span.textContent = word + ' '; 
    aboutText.appendChild(span);
  });

  const spans = aboutText.querySelectorAll('span');

  window.addEventListener('scroll', () => {
    const rect = aboutText.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    
    // Il progresso parte da 0 (quando entra nello schermo) a 1 (quando supera il 55% dello schermo)
    let progress = (viewHeight - rect.top) / (viewHeight * 0.55); 
    progress = Math.max(0, Math.min(1, progress));

    const wordsToHighlight = Math.floor(progress * spans.length);

    spans.forEach((span, index) => {
      if (index < wordsToHighlight) {
        span.classList.add('highlighted');
      } else {
        span.classList.remove('highlighted');
      }
    });
  }, { passive: true });
}

// ---- Copia testo al clic per il bottone Discord ----
const discordBtn = document.getElementById('discord-btn');

if (discordBtn) {
  discordBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Evita che la pagina ricarichi o segua il link vuoto
    
    // Scegli cosa copiare: 
    // Opzione A: Copia solo "spaghettiallassasina"
    const textToCopy = 'spaghettiallassassina';
    
    // Opzione B (alternativa): Se vuoi copiare tutto il testo dentro il bottone, scommenta la riga sotto:
    // const textToCopy = discordBtn.textContent.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = discordBtn.textContent;
      discordBtn.textContent = 'copied';
      
      setTimeout(() => {
        discordBtn.textContent = originalText;
      }, 2000); // Dopo 2 secondi rimette il testo originale
    }).catch(err => {
      console.error('Errore durante la copia:', err);
    });
  });
}