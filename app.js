document.documentElement.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const progressBar = document.querySelector('.scroll-progress span');
function updateScrollEffects() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${scrollable > 0 ? scrollTop / scrollable : 0})`;
  header.classList.toggle('is-scrolled', scrollTop > 24);
}
window.addEventListener('scroll', updateScrollEffects, { passive: true });
updateScrollEffects();
const revealElements = document.querySelectorAll('.section-title, .section-intro, .program-card, .schedule-heading, .schedule-card, .schedule-note, .principle-intro, .principle-list article, .coach-card, .contact-copy, .contact-details > div');
revealElements.forEach((element, index) => { element.classList.add('reveal-target'); element.style.setProperty('--reveal-delay', `${(index % 3) * 80}ms`); });
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (!entry.isIntersecting) return; entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }); }, { rootMargin: '0px 0px -8%', threshold: 0.08 });
  revealElements.forEach((element) => revealObserver.observe(element));
}
const navigationLinks = [...document.querySelectorAll('.desktop-nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (!entry.isIntersecting) return; navigationLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${entry.target.id}`)); }); }, { rootMargin: '-38% 0px -54%' });
  sections.forEach((section) => sectionObserver.observe(section));
}
document.querySelectorAll('.mobile-menu a').forEach((link) => { link.addEventListener('click', () => link.closest('details').removeAttribute('open')); });
