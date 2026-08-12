const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const progress = document.querySelector('.progress span');

function updateScroll() {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${scrollable > 0 ? scrollY / scrollable : 0})`;
  header.classList.toggle('fixed', scrollY > 110);
}
addEventListener('scroll', updateScroll, { passive:true });
updateScroll();

const menu = document.querySelector('.menu');
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

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('visible');
  revealObserver.unobserve(entry.target);
}), { threshold:.08, rootMargin:'0px 0px -7%' });
document.querySelectorAll('.reveal').forEach((element,index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
  revealObserver.observe(element);
});

const arts = {
  muay:{ glyph:'๘', label:'The art of eight limbs', title:'Muay Thai', copy:'Build complete striking through focused pad work, movement, conditioning and controlled partner drills.', coach:'Santosh Ghalan', focus:'Striking · Timing · Conditioning' },
  kickboxing:{ glyph:'K', label:'Speed, rhythm and combinations', title:'Kickboxing', copy:'Connect sharp boxing with powerful kicks and confident footwork in energetic, progressive sessions.', coach:'Santosh Ghalan', focus:'Combinations · Footwork · Fitness' },
  taekwondo:{ glyph:'태', label:'Precision in every movement', title:'Taekwondo', copy:'Develop flexibility, balance, discipline and dynamic kicking through strong traditional foundations.', coach:'Raju Shrestha', focus:'Forms · Kicking · Discipline' }
};
const stage = document.querySelector('.art-stage');
document.querySelectorAll('.art-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.art-tab').forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  const art = arts[tab.dataset.art];
  stage.classList.remove('switching');
  void stage.offsetWidth;
  stage.classList.add('switching');
  stage.querySelector('.stage-glyph').textContent = art.glyph;
  stage.querySelector('.stage-label').textContent = art.label;
  stage.querySelector('h3').textContent = art.title;
  stage.querySelector('.stage-copy').textContent = art.copy;
  const values = stage.querySelectorAll('dd');
  values[0].textContent = art.coach;
  values[1].textContent = art.focus;
}));

const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  document.querySelectorAll('.site-header nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
}), { rootMargin:'-38% 0px -55%' });
document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));

const galleryImages = [
  'https://scontent.fktm8-1.fna.fbcdn.net/v/t39.30808-6/740779479_1606773668116626_4326039071979218667_n.jpg?stp=c256.0.1024.1024a_dst-jpg_tt6&cstp=mx1024x1024&ctp=s851x315&_nc_cat=104&ccb=1-7&_nc_sid=8a6525&_nc_ohc=sgSC14Cjqw8Q7kNvwHupj6r&_nc_oc=AdrsufT-zbuwBeRFAAFV458eHt6TXvp5RLAO2vzEdSj88fzE_epSWTjohyecgZtnQMFZwEP5RXKwCkuPaUX3jIjI&_nc_zt=23&_nc_ht=scontent.fktm8-1.fna&_nc_gid=vMYciiIqs-XOanXOIw03Vg&_nc_ss=7b289&oh=00_AQG7YTYsUTAp4sUFYZfLHV1vTEag8n32LR_gyCdLbcY9CQ&oe=6A7E728F',
  'https://scontent.fktm8-1.fna.fbcdn.net/v/t39.30808-6/586515026_1409772667816728_8399361134800902092_n.jpg?stp=c321.0.642.642a_dst-jpg_tt6&cstp=mx642x642&ctp=s851x315&_nc_cat=110&ccb=1-7&_nc_sid=8a6525&_nc_ohc=e_ABmZRAWVQQ7kNvwENKlcl&_nc_oc=AdrU-VdXhBDC1nUA-fE9SzFm9y9t2kITuCPTy2daC9S7HMXKOkCHdjwENjwlZb44HumSacjuVpIhowAPGRmshBns&_nc_zt=23&_nc_ht=scontent.fktm8-1.fna&_nc_gid=vMYciiIqs-XOanXOIw03Vg&_nc_ss=7b289&oh=00_AQHzTmx1-s35cI-DHb9xIpDsu-zzBc0sMU9v1wjKwkxMqA&oe=6A7E453B',
  'https://scontent.fktm8-1.fna.fbcdn.net/v/t39.30808-6/601027321_1426629659464362_4302908848032431522_n.jpg?stp=c210.0.540.540a_dst-jpg_tt6&cstp=mx540x540&ctp=s851x315&_nc_cat=109&ccb=1-7&_nc_sid=09d16d&_nc_ohc=WOg0NDnyTawQ7kNvwE4yuL0&_nc_oc=AdonnkczVHr9j3Fx7vnXtacnIuOG1GNZB97Og9KwcY6FD8UDswHjVY1TQprCyf2VeEwJOnHRenmdNIPgiHwm-JL1&_nc_zt=23&_nc_ht=scontent.fktm8-1.fna&_nc_gid=vMYciiIqs-XOanXOIw03Vg&_nc_ss=7b289&oh=00_AQHNCTjsvKyKHrFoIDAeJZdPCn5Y7Imj-54iTqRBSFIouw&oe=6A7E68A9',
  'https://scontent.fktm8-1.fna.fbcdn.net/v/t39.30808-6/571209777_1382130783914250_270466330775976848_n.jpg?stp=c282.0.720.720a_dst-jpg_tt6&cstp=mx720x720&ctp=s851x315&_nc_cat=110&ccb=1-7&_nc_sid=8a6525&_nc_ohc=dZRRRDtBdmAQ7kNvwEzTo6s&_nc_oc=Adq8E7G1eB-DqA1CpsCYRe19cx7Qmk8UJYBBqgbouV33sU8QdeBZ8dh7SJZJWgL8N9ZGa9WWNIvd2N2RWVQWpjaA&_nc_zt=23&_nc_ht=scontent.fktm8-1.fna&_nc_gid=vMYciiIqs-XOanXOIw03Vg&_nc_ss=7b289&oh=00_AQHK6i8PY5OistTmXHNibAGudJjz1gWjzC7SEiy1UDIktQ&oe=6A7E6DC8'
];
const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
document.querySelectorAll('.gallery-item').forEach((item,index) => item.addEventListener('click', () => {
  lightboxImage.src = galleryImages[index];
  lightboxImage.alt = `KMAA academy training photograph ${index + 1}`;
  lightbox.showModal();
}));
lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });

if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', event => {
      const box = element.getBoundingClientRect();
      element.style.transform = `translate(${(event.clientX-box.left-box.width/2)*.12}px,${(event.clientY-box.top-box.height/2)*.12}px)`;
    });
    element.addEventListener('pointerleave', () => element.style.transform = '');
  });
}
document.querySelector('#year').textContent = new Date().getFullYear();
