document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const progressBar = document.querySelector('.scroll-progress span');
const heroPhoto = document.querySelector('.hero-photo');

requestAnimationFrame(() => document.body.classList.add('page-ready'));

function updateScrollEffects() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${scrollable > 0 ? scrollTop / scrollable : 0})`;
  header.classList.toggle('is-scrolled', scrollTop > 32);

  if (!reduceMotion && scrollTop < window.innerHeight * 1.15) {
    heroPhoto.style.setProperty('--hero-shift', `${Math.min(scrollTop * 0.085, 54)}px`);
  }
}

window.addEventListener('scroll', updateScrollEffects, { passive: true });
updateScrollEffects();

const revealGroups = [
  ['.section-heading', 0],
  ['.class-card', 85],
  ['.method-copy', 0],
  ['.benefits article', 100],
  ['.coach-card', 130],
  ['.coach-note', 0],
  ['.gallery-photo', 75],
  ['.contact-callout', 0],
  ['.contact-details > div', 85]
];

const revealElements = [];
revealGroups.forEach(([selector, stagger]) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.classList.add('reveal-target');
    element.style.setProperty('--reveal-delay', `${index * stagger}ms`);
    revealElements.push(element);
  });
});

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8%', threshold: 0.08 });

  revealElements.forEach((element) => revealObserver.observe(element));
}

const navigationLinks = [...document.querySelectorAll('.desktop-nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navigationLinks.forEach((link) => {
        link.classList.toggle('active', link.hash === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-38% 0px -54%' });
  sections.forEach((section) => sectionObserver.observe(section));
}

document.querySelectorAll('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', () => link.closest('details').removeAttribute('open'));
});

const finePointer = window.matchMedia('(pointer: fine)').matches;
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.class-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.style.setProperty('--rotate-x', `${((y / box.height) - 0.5) * -3.5}deg`);
      card.style.setProperty('--rotate-y', `${((x / box.width) - 0.5) * 3.5}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
    });
  });

  document.querySelectorAll('.button, .header-cta').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const box = button.getBoundingClientRect();
      button.style.setProperty('--magnet-x', `${(event.clientX - box.left - box.width / 2) * 0.12}px`);
      button.style.setProperty('--magnet-y', `${(event.clientY - box.top - box.height / 2) * 0.16}px`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--magnet-x', '0px');
      button.style.setProperty('--magnet-y', '0px');
    });
  });
}
