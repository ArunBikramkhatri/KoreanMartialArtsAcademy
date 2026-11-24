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
const revealElements = document.querySelectorAll('.section-title, .section-intro, .program-card, .schedule-heading, .schedule-card, .schedule-note, .principle-intro, .principle-list article, .coach-card, .faq-list details, .gallery-item, .contact-copy, .contact-details > div');
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
document.querySelectorAll('.mobile-menu').forEach((menu) => {
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') menu.removeAttribute('open');
  });
});

// Gallery viewer: tap a photo to see it large; swipe or use the arrows for the next one.
const lightbox = document.querySelector('.lightbox');
const galleryLinks = [...document.querySelectorAll('[data-lightbox]')];
if (lightbox && galleryLinks.length && typeof lightbox.showModal === 'function') {
  const image = lightbox.querySelector('img');
  const caption = lightbox.querySelector('figcaption');
  const navButtons = lightbox.querySelectorAll('.lightbox-nav');
  let current = 0;
  const show = (index) => {
    current = (index + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[current];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    caption.textContent = link.closest('figure').querySelector('figcaption')?.textContent || '';
  };
  navButtons.forEach((button) => { button.hidden = galleryLinks.length < 2; });
  galleryLinks.forEach((link, index) => link.addEventListener('click', (event) => {
    event.preventDefault();
    show(index);
    lightbox.showModal();
  }));
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox || event.target.tagName === 'FIGURE') lightbox.close(); });
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
  let touchStart = null;
  lightbox.addEventListener('touchstart', (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (event) => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 50 && galleryLinks.length > 1) show(current + (distance < 0 ? 1 : -1));
    touchStart = null;
  });
  lightbox.addEventListener('close', () => { image.removeAttribute('src'); });
}
