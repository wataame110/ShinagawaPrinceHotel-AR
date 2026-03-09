/**
 * sw.js  – Service Worker
 *
 * ポイント:
 *  - コア HTML / CSS / JS のみを事前キャッシュ（画像・JSON は含めない）
 *  - cache.addAll の失敗を個別 fetch で吸収し、SW インストールを安定化
 *  - fetch ハンドラは必ず有効な Response を返す（undefined を返さない）
 *  - JSON / 設定ファイルはネットワーク優先
 */

const CACHE_VERSION = 'v6';
const CACHE_NAME    = `sph-photo-${CACHE_VERSION}`;

// ── 事前キャッシュするコアアセット（確実に存在するもののみ）──────────
const CORE_ASSETS = [
    './',
    './index.html',
    './login.html',
    './css/reset.css',
    './css/style.css',
    './css/login.css',
    './js/i18n.js',
    './js/app.js',
    './js/camera.js',
    './js/capture.js',
    './js/ui.js',
    './js/filter.js',
    './js/face-filter.js',
    './js/sound.js',
    './assets/images/logo-shinagawa-prince.png',
];

// ── ネットワーク優先で扱うパターン（設定ファイル・JSON）────────────
const NETWORK_FIRST_RE = [
    /assets\/config\//,
    /frames-config\.json/,
    /restaurants\.json/,
];

// ── インストール: コアアセットをキャッシュ ──────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // 個別に fetch して失敗しても全体を止めない
            const results = await Promise.allSettled(
                CORE_ASSETS.map(url =>
                    fetch(url).then(res => {
                        if (res.ok) return cache.put(url, res);
                    }).catch(() => {})
                )
            );
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) console.warn(`[SW] ${failed} core asset(s) failed to cache`);
        })
    );
    // キャッシュ完了を待たずにアクティベート
    self.skipWaiting();
});

// ── アクティベート: 古いキャッシュを削除 ───────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('sph-photo-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── フェッチ: 必ず有効な Response を返す ───────────────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // 外部 CDN（MediaPipe 等）はキャッシュせず素通り
    if (url.origin !== location.origin) return;

    // ── ネットワーク優先（設定 JSON など）──────────────────────────
    if (NETWORK_FIRST_RE.some(re => re.test(url.pathname))) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
                .catch(() =>
                    caches.match(event.request).then(cached =>
                        cached || new Response('{"error":"offline"}', {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        })
                    )
                )
        );
        return;
    }

    // ── キャッシュ優先（コア HTML/CSS/JS）──────────────────────────
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request)
                .then(res => {
                    // 同一オリジンの成功レスポンスのみキャッシュ
                    if (res.ok && res.type === 'basic') {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return res;
                })
                .catch(() => {
                    // オフライン時: HTML リクエストなら index.html を返す
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html').then(
                            r => r || new Response('<h1>Offline</h1>', {
                                status: 503,
                                headers: { 'Content-Type': 'text/html; charset=utf-8' }
                            })
                        );
                    }
                    // その他は 503 を返す（undefined を返してネットワークエラーにしない）
                    return new Response('Service Unavailable', { status: 503 });
                });
        })
    );
});
