/* salp Tools Service Worker v2.7.2 — S26 Edition */
const CACHE_NAME = 'salp-tools-v2.7.2-s26';

// 実在する主要ファイルだけを対象にする。
// 1つ欠けてもService Worker全体が失敗しないよう個別に保存する。
const CORE_FILES = [
  './',
  './index.html',
  './music.html',
  './manifest.webmanifest',
  './salp-s26-basic.html',
  './s26basic.html',
  './s26basic-core.html'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      CORE_FILES.map(async path => {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response);
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML・画面遷移・manifestはネット優先。
  // 更新版を最優先し、オフライン時だけキャッシュへ戻る。
  const networkFirst =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/manifest.webmanifest');

  if (networkFirst) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          Response.error();
      }
    })());
    return;
  }

  // 画像・CSS・JSなどはキャッシュを即表示し、裏で最新版へ更新。
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const networkPromise = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    return cached || (await networkPromise) || Response.error();
  })());
});
