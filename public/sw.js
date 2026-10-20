// ホーム画面のアプリとして入れるための最小の Service Worker。
// 何もキャッシュしない（古い画面が残らないように、毎回ネットから読む）。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req));
});
