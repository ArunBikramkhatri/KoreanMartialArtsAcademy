// Korean Martial Arts Academy: photo manager.
//
// This Worker sits in front of the GitHub Pages site on koreanmartialarts.com.np.
//   /admin              phone-friendly page where the academy changes photos (password protected)
//   /api/*              JSON API used by the admin page
//   /photos/<slot>      the replaceable site photos (coaches, logo, share image)
//   /gallery-photos/... gallery images
//   everything else     passed through to GitHub Pages; HTML pages get the latest photos
//                       and gallery written into them before they reach the visitor.
//
// Photos and the list of uploads live in a Cloudflare D1 database (binding DB), which is part of
// the free Workers plan. The tables are created automatically on first use.

import ADMIN_HTML from './admin.html';

// Each slot has an original file in the GitHub repo, used until a new photo is uploaded.
const SLOTS = {
  'coach-taekwondo': '/takenwondo_guru.png',
  'coach-muaythai': '/muay_thai_guru.png',
  logo: '/logo.png',
  share: '/og.png',
};
const HERO_SLOTS = ['coach-taekwondo', 'coach-muaythai'];

// D1 stores at most 2 MB in one row. The admin page shrinks photos well below this.
const MAX_UPLOAD_BYTES = 1_900_000;
const MAX_GALLERY = 200;
const MAX_CAPTION = 120;
const COOKIE = 'kmaa_admin';
const SESSION_SECONDS = 180 * 24 * 60 * 60;
const ID_PATTERN = /^[a-z0-9-]{6,40}$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        console.error(error);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
    }
    if (path === '/admin' || path === '/admin/') return adminPage();
    if (path.startsWith('/photos/')) return servePhoto(request, env, ctx, url);
    if (path.startsWith('/gallery-photos/')) return serveGalleryPhoto(request, env, ctx, url);
    // The Worker's own source is in the repo too; there is no reason to serve it.
    if (path.startsWith('/worker/')) return new Response('Not found', { status: 404 });

    return proxyToSite(request, env, url);
  },
};

/* ---------- Public site ---------- */

async function proxyToSite(request, env, url) {
  // In production the Worker runs on the site's own route, so fetch(request) reaches GitHub Pages.
  // For local testing, ORIGIN points at a local static server instead.
  const upstream = env.ORIGIN
    ? new Request(new URL(url.pathname + url.search, env.ORIGIN), request)
    : request;
  const response = await fetch(upstream);
  const type = response.headers.get('content-type') || '';
  if (request.method !== 'GET' || !type.includes('text/html')) return response;

  let manifest;
  try {
    manifest = await readManifest(env);
  } catch (error) {
    // If storage is unavailable, show the site with its original photos rather than failing.
    console.error(error);
    return response;
  }

  const headers = new Headers(response.headers);
  // The page content now depends on uploads, so browsers must not reuse an old copy.
  headers.set('cache-control', 'no-cache');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.delete('content-length');
  const page = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  return pageRewriter(manifest, url.origin).transform(page);
}

function pageRewriter(manifest, origin) {
  const rewriter = new HTMLRewriter().on('[data-slot]', {
    element(el) {
      const key = el.getAttribute('data-slot');
      const slot = manifest.slots[key];
      if (!slot) return;
      const src = slotUrl(key, slot);
      if (el.tagName === 'img') {
        el.setAttribute('src', src);
        el.setAttribute('data-custom', '');
        if (slot.w && slot.h) {
          el.setAttribute('width', String(slot.w));
          el.setAttribute('height', String(slot.h));
        }
      } else if (el.tagName === 'link') {
        el.setAttribute('href', src);
      } else if (el.tagName === 'meta') {
        el.setAttribute('content', origin + src);
      }
    },
  });

  // Once either hero coach is a normal photo, show both hero images as framed photos,
  // so a cut-out and a photo never sit side by side looking mismatched.
  if (HERO_SLOTS.some((key) => manifest.slots[key])) {
    rewriter.on('[data-hero-photos]', { element(el) { el.setAttribute('data-framed', ''); } });
  }

  if (manifest.gallery.length) {
    const figures = manifest.gallery.map(galleryFigure).join('');
    rewriter
      .on('[data-gallery]', { element(el) { el.removeAttribute('hidden'); } })
      .on('[data-gallery-grid]', { element(el) { el.setInnerContent(figures, { html: true }); } });
  }
  return rewriter;
}

function galleryFigure(item) {
  const alt = item.caption || 'Training at Korean Martial Arts Academy Nepal';
  const caption = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : '';
  return `<figure class="gallery-item"><a href="${galleryUrl(item, 'full')}" data-lightbox><img src="${galleryUrl(item, 'thumb')}" width="${item.tw}" height="${item.th}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></a>${caption}</figure>`;
}

const slotUrl = (key, slot) => `/photos/${key}?v=${slot.v}`;
const galleryUrl = (item, size) => `/gallery-photos/${item.id}${size === 'thumb' ? '/thumb' : ''}?v=${item.v}`;

async function servePhoto(request, env, ctx, url) {
  const key = url.pathname.slice('/photos/'.length);
  if (!(key in SLOTS)) return new Response('Not found', { status: 404 });
  return serveStored(request, env, ctx, url, `slot/${key}`, () =>
    // Nothing uploaded for this slot: send the original file from the repo.
    new Response(null, { status: 302, headers: { location: SLOTS[key], 'cache-control': 'public, max-age=60' } }),
  );
}

async function serveGalleryPhoto(request, env, ctx, url) {
  const [id, size] = url.pathname.slice('/gallery-photos/'.length).split('/');
  if (!ID_PATTERN.test(id || '') || (size && size !== 'thumb')) return new Response('Not found', { status: 404 });
  return serveStored(request, env, ctx, url, `gallery/${id}/${size || 'full'}`);
}

async function serveStored(request, env, ctx, url, objectKey, fallback) {
  const versioned = url.searchParams.has('v');
  const cache = caches.default;
  if (versioned) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }
  const db = await database(env);
  const row = await db.prepare('SELECT type, data FROM photos WHERE key = ?').bind(objectKey).first();
  if (!row) return fallback ? fallback() : new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', row.type);
  headers.set('x-content-type-options', 'nosniff');
  // Versioned URLs change whenever the photo changes, so they can be cached for a long time.
  headers.set('cache-control', versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  const response = new Response(toBytes(row.data), { headers });
  if (versioned) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

/* ---------- Admin ---------- */

function adminPage() {
  return new Response(ADMIN_HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-frame-options': 'DENY',
      'referrer-policy': 'same-origin',
    },
  });
}

async function handleApi(request, env, url) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'The admin password has not been set up yet.' }, 503);
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const method = request.method;

  if (parts[0] === 'login' && method === 'POST') return login(request, env);
  if (parts[0] === 'logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });

  if (!(await isSignedIn(request, env))) return json({ error: 'Please log in again.' }, 401);

  if (parts[0] === 'state' && method === 'GET') return json(await adminState(env));

  if (parts[0] === 'slots' && parts.length === 2 && parts[1] in SLOTS) {
    if (method === 'PUT') return uploadSlot(request, env, parts[1]);
    if (method === 'DELETE') return restoreSlot(env, parts[1]);
  }

  if (parts[0] === 'gallery') {
    if (parts.length === 1 && method === 'POST') return addGalleryPhoto(request, env);
    if (parts.length === 2 && ID_PATTERN.test(parts[1])) {
      if (method === 'PATCH') return updateGalleryPhoto(request, env, parts[1]);
      if (method === 'DELETE') return deleteGalleryPhoto(env, parts[1]);
    }
  }
  return json({ error: 'Not found' }, 404);
}

async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (!(await passwordMatches(password, env.ADMIN_PASSWORD))) {
    // Slow down repeated guessing.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return json({ error: 'That password is not right. Please try again.' }, 401);
  }
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expires}.${await sign(String(expires), env)}`;
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, SESSION_SECONDS) });
}

function sessionCookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/api; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

async function isSignedIn(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return false;
  const [expires, signature] = match[1].split('.');
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const key = await sessionKey(env);
  const bytes = base64UrlDecode(signature);
  if (!bytes) return false;
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(expires));
}

// Sessions are signed with a key derived from the password, so changing the
// password logs every phone out.
async function sessionKey(env) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`kmaa-session:${env.ADMIN_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(text, env) {
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(env), new TextEncoder().encode(text));
  return base64UrlEncode(new Uint8Array(signature));
}

async function passwordMatches(given, expected) {
  const digest = async (text) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function adminState(env) {
  const manifest = await readManifest(env);
  const slots = Object.fromEntries(
    Object.entries(SLOTS).map(([key, original]) => {
      const slot = manifest.slots[key];
      return [key, { custom: Boolean(slot), url: slot ? slotUrl(key, slot) : original }];
    }),
  );
  const gallery = manifest.gallery.map((item) => ({
    id: item.id,
    caption: item.caption,
    thumb: galleryUrl(item, 'thumb'),
    full: galleryUrl(item, 'full'),
  }));
  return { slots, gallery, galleryLimit: MAX_GALLERY };
}

async function uploadSlot(request, env, key) {
  const image = await readImage(await request.arrayBuffer());
  if (image.error) return json({ error: image.error }, 400);
  const db = await database(env);
  // A batch runs as one transaction: the photo and its record change together.
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO photos (key, type, data) VALUES (?, ?, ?)').bind(`slot/${key}`, image.type, image.bytes),
    db.prepare('INSERT OR REPLACE INTO slots (slot, v, w, h) VALUES (?, ?, ?, ?)').bind(
      key,
      newVersion(),
      dimension(request.headers.get('x-image-width')),
      dimension(request.headers.get('x-image-height')),
    ),
  ]);
  return json(await adminState(env));
}

async function restoreSlot(env, key) {
  const db = await database(env);
  await db.batch([
    db.prepare('DELETE FROM photos WHERE key = ?').bind(`slot/${key}`),
    db.prepare('DELETE FROM slots WHERE slot = ?').bind(key),
  ]);
  return json(await adminState(env));
}

async function addGalleryPhoto(request, env) {
  const db = await database(env);
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM gallery').first();
  if (count >= MAX_GALLERY) {
    return json({ error: `The gallery is full (${MAX_GALLERY} photos). Delete some old photos first.` }, 400);
  }
  const form = await request.formData();
  const full = form.get('full');
  const thumb = form.get('thumb');
  if (!(full instanceof File) || !(thumb instanceof File)) return json({ error: 'No photo was received.' }, 400);
  const [fullImage, thumbImage] = await Promise.all([readImage(await full.arrayBuffer()), readImage(await thumb.arrayBuffer())]);
  const problem = fullImage.error || thumbImage.error;
  if (problem) return json({ error: problem }, 400);

  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await db.batch([
    db.prepare('INSERT INTO photos (key, type, data) VALUES (?, ?, ?)').bind(`gallery/${id}/full`, fullImage.type, fullImage.bytes),
    db.prepare('INSERT INTO photos (key, type, data) VALUES (?, ?, ?)').bind(`gallery/${id}/thumb`, thumbImage.type, thumbImage.bytes),
    db.prepare('INSERT INTO gallery (id, v, caption, tw, th, created) VALUES (?, ?, ?, ?, ?, ?)').bind(
      id,
      newVersion(),
      cleanCaption(form.get('caption')),
      dimension(form.get('tw')) || 640,
      dimension(form.get('th')) || 640,
      Date.now(),
    ),
  ]);
  return json(await adminState(env));
}

async function updateGalleryPhoto(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const db = await database(env);
  const result = await db.prepare('UPDATE gallery SET caption = ? WHERE id = ?').bind(cleanCaption(body.caption), id).run();
  if (!result.meta.changes) return json({ error: 'That photo no longer exists.' }, 404);
  return json(await adminState(env));
}

async function deleteGalleryPhoto(env, id) {
  const db = await database(env);
  await db.batch([
    db.prepare('DELETE FROM photos WHERE key IN (?, ?)').bind(`gallery/${id}/full`, `gallery/${id}/thumb`),
    db.prepare('DELETE FROM gallery WHERE id = ?').bind(id),
  ]);
  return json(await adminState(env));
}

/* ---------- Storage helpers ---------- */

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS photos (key TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)',
  'CREATE TABLE IF NOT EXISTS slots (slot TEXT PRIMARY KEY, v TEXT NOT NULL, w INTEGER NOT NULL DEFAULT 0, h INTEGER NOT NULL DEFAULT 0)',
  "CREATE TABLE IF NOT EXISTS gallery (id TEXT PRIMARY KEY, v TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', tw INTEGER NOT NULL, th INTEGER NOT NULL, created INTEGER NOT NULL)",
];
let schemaReady = null;

// Creates the tables once per Worker instance, so no separate database setup step is needed.
async function database(env) {
  schemaReady ??= env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return env.DB;
}

// Everything a page needs to know: which spots have new photos, and the gallery, newest first.
async function readManifest(env) {
  const db = await database(env);
  const [slotRows, galleryRows] = await db.batch([
    db.prepare('SELECT slot, v, w, h FROM slots'),
    db.prepare('SELECT id, v, caption, tw, th FROM gallery ORDER BY created DESC'),
  ]);
  return {
    slots: Object.fromEntries(slotRows.results.filter((row) => row.slot in SLOTS).map(({ slot, ...rest }) => [slot, rest])),
    gallery: galleryRows.results,
  };
}

// D1 may hand back a BLOB as an ArrayBuffer or as a plain array of numbers.
function toBytes(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return data;
  return Uint8Array.from(data);
}

// Accept only real JPEG, PNG or WebP files, judged by their bytes rather than their name.
async function readImage(buffer) {
  if (!buffer.byteLength) return { error: 'No photo was received.' };
  if (buffer.byteLength > MAX_UPLOAD_BYTES) return { error: 'That photo is too large. Please choose a different photo.' };
  const bytes = new Uint8Array(buffer);
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  let type = null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) type = 'image/jpeg';
  else if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') type = 'image/png';
  else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') type = 'image/webp';
  if (!type) return { error: 'That file is not a photo this website can use. Please choose a JPG or PNG photo.' };
  return { bytes, type };
}

const newVersion = () => Date.now().toString(36);

function dimension(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 && number <= 10000 ? number : 0;
}

function cleanCaption(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION) : '';
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  });
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(text) {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
