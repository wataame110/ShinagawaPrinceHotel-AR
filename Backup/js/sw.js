/**
 * ======================================================================
 * Service Worker (sw.js)
 * オフライン対応、リソースキャッシュ管理を担当
 * ======================================================================
 */

const CACHE_NAME = 'photo-frame-v6';

/**
 * キャッシュするファイル一覧（JS/CSS/静的アセット）
 * JSONコンフィグはネットワーク優先のため含めない
 */
const urlsToCache = [
    './',
    './index.html',
    './login.html',
    './config/manifest.json',
    './css/style.css',
    './js/app.js',
    './js/camera.js',
    './js/capture.js',
    './js/ui.js',
    './js/filter.js',
    './js/face-filter.js',
    './js/i18n.js',
    './js/sound.js',
    './assets/images/frames/frame-placeholder.png',
    './assets/images/frames/common/common_iy02.png',
    './assets/images/frames/common/common_k01.png',
    './assets/images/frames/common/common_k03.png',
    './assets/images/frames/common/common_i1.png',
    './assets/images/frames/common/common_i3.png',
    './assets/images/frames/common/common_m01.png'
];

/** 常にネットワークから取得すべき設定ファイルのパターン */
const NETWORK_FIRST_PATTERNS = [
    /assets\/config\//,
    /frames-config\.json/,
    /restaurants\.json/
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .catch((err) => console.error('Cache install failed:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.map((n) => {
                if (n !== CACHE_NAME) {
                    console.log('Deleting old cache:', n);
                    return caches.delete(n);
                }
            }))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // JSONコンフィグはネットワーク優先（常に最新データを取得）
    const isNetworkFirst = NETWORK_FIRST_PATTERNS.some((p) => p.test(url));
    if (isNetworkFirst) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // その他はキャッシュ優先
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
                return response;
            });
        }).catch(() => caches.match('./index.html'))
    );
});
