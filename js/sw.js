/**
 * ======================================================================
 * Service Worker (sw.js)
 * オフライン対応、リソースキャッシュ管理を担当
 * ======================================================================
 */

/**
 * キャッシュ名
 * バージョンを変更するとキャッシュが更新される
 * @type {string}
 */
const CACHE_NAME = 'photo-frame-v1';

/**
 * キャッシュするファイル一覧
 * アプリケーションの動作に必要な全てのファイル
 * @type {string[]}
 */
const urlsToCache = [
    './',
    './index.html',
    './config/manifest.json',
    './css/style.css',
    './js/app.js',
    './js/camera.js',
    './js/capture.js',
    './js/ui.js',
    './js/sw.js',
    './assets/config/frames-config.json',
    './assets/images/frames/frame1-happy.png',
    './assets/images/frames/frame2.png',
    './assets/images/frames/frame3.png',
    './assets/images/frames/frame4.png',
    './assets/images/frames/frame1-happy.png',
    './assets/images/frames/frame2-thumb.png',
    './assets/images/frames/frame3-thumb.png',
    './assets/images/frames/frame4-thumb.png'
];

/**
 * Service Workerインストール時の処理
 * 
 * 処理内容:
 * 1. キャッシュストレージを開く
 * 2. 必要なファイルを全てキャッシュに追加
 * 3. インストール完了後すぐに有効化
 * 
 * @param {ExtendableEvent} event - インストールイベント
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // 全ファイルをキャッシュに追加
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Cache install failed:', error);
            })
    );
    
    // 待機せずに即座に有効化
    self.skipWaiting();
});

/**
 * Service Worker有効化時の処理
 * 
 * 処理内容:
 * 1. 古いキャッシュを削除
 * 2. 新しいバージョンのキャッシュのみ保持
 * 3. 全てのクライアントを制御
 * 
 * @param {ExtendableEvent} event - 有効化イベント
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 現在のキャッシュ名と異なる古いキャッシュを削除
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // 即座に全てのクライアントを制御
    self.clients.claim();
});

/**
 * リソース取得時の処理
 * キャッシュ優先戦略を実装
 * 
 * 戦略:
 * 1. キャッシュにあればキャッシュから返す（高速）
 * 2. キャッシュになければネットワークから取得
 * 3. 取得したリソースをキャッシュに追加（次回用）
 * 4. ネットワークエラー時はフォールバック
 * 
 * @param {FetchEvent} event - fetchイベント
 */
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // まずキャッシュを確認
        caches.match(event.request)
            .then((response) => {
                // キャッシュにあればそれを返す
                if (response) {
                    return response;
                }
                
                // キャッシュになければネットワークから取得
                return fetch(event.request).then((response) => {
                    // レスポンスが無効な場合はそのまま返す
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // レスポンスをクローン（一度しか読めないため）
                    const responseToCache = response.clone();
                    
                    // キャッシュに追加
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // ネットワークエラー時はindex.htmlを返す
                return caches.match('./index.html');
            })
    );
});
