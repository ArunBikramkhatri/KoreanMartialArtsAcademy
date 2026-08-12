const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const progress = document.querySelector('.page-progress span');

function updateScroll() {
  const total = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${total > 0 ? scrollY / total : 0})`;
  header.classList.toggle('scrolled', scrollY > 100);
}
addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.site-header nav');
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});
nav.addEventListener('click', event => {
  if (!event.target.matches('a')) return;
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
});

const reveals = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach(element => element.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }), { threshold: .08, rootMargin: '0px 0px -7%' });
  reveals.forEach((element, index) => {
    element.style.transitionDelay = `${(index % 3) * 55}ms`;
    revealObserver.observe(element);
  });
}

const programs = {
  muay: { tag:'Muay Thai', glyph:'๘', kicker:'Build power with purpose', title:'Learn the art of eight limbs.', copy:'Structured pad work, movement and progressive conditioning help you develop practical technique at your own pace.', coach:'Santosh Ghalan', build:'Timing · Fitness · Confidence', color:'#ed785d' },
  kickboxing: { tag:'Kickboxing', glyph:'K', kicker:'Move with speed and rhythm', title:'Combine fitness with practical skill.', copy:'Connect sharp punches, dynamic kicks and confident footwork in energetic sessions designed for steady progress.', coach:'Santosh Ghalan', build:'Movement · Stamina · Coordination', color:'#d5a83f' },
  taekwondo: { tag:'Taekwondo', glyph:'태', kicker:'Practice precision and control', title:'Build discipline from the ground up.', copy:'Develop flexibility, balance and dynamic kicking through clear traditional foundations and a meaningful path forward.', coach:'Raju Shrestha', build:'Balance · Flexibility · Discipline', color:'#397469' }
};
const detail = document.querySelector('.program-detail');
document.querySelectorAll('.program-option').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.program-option').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-selected', String(active));
  });
  const program = programs[button.dataset.program];
  detail.classList.remove('switching');
  void detail.offsetWidth;
  detail.classList.add('switching');
  detail.style.background = program.color;
  detail.querySelector('.detail-tag').textContent = program.tag;
  detail.querySelector('.detail-glyph').textContent = program.glyph;
  detail.querySelector('.detail-kicker').textContent = program.kicker;
  detail.querySelector('h3').textContent = program.title;
  detail.querySelector('.detail-copy > p:last-child').textContent = program.copy;
  const values = detail.querySelectorAll('.detail-bottom b');
  values[0].textContent = program.coach;
  values[1].textContent = program.build;
}));

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.site-header nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  }), { rootMargin: '-38% 0px -55%' });
  document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
}

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
document.querySelectorAll('.gallery-photo').forEach(photo => photo.addEventListener('click', () => {
  const image = photo.querySelector('img');
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightbox.showModal();
}));
lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
document.querySelector('#year').textContent = new Date().getFullYear();
