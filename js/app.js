/**
 * ======================================================================
 * メインアプリケーション (app.js)
 * アプリケーションの初期化、DOM要素の定義、グローバル設定を担当
 * ======================================================================
 */

// ======================================================================
// DOM要素の取得
// HTMLから各要素への参照を取得して変数に格納
// ======================================================================

// --- 画面要素 ---
// 3つのメイン画面（カメラ、結果、エラー）
const cameraScreen = document.getElementById('camera-screen');      // カメラプレビュー画面
const resultScreen = document.getElementById('result-screen');      // 撮影結果表示画面
const errorScreen = document.getElementById('error-screen');        // エラー表示画面

// ローディング表示
const loadingOverlay = document.getElementById('loading-overlay');  // カメラ起動中のオーバーレイ

// --- カメラ関連要素 ---
const cameraHeaderTitle = document.getElementById('camera-header-title');  // ヘッダータイトル
const cameraVideo = document.getElementById('camera-video');        // カメラライブプレビュー
const frameOverlay = document.getElementById('frame-overlay');      // 装飾フレーム画像
const previewGuideText = document.getElementById('preview-guide-text');    // プレビューガイドテキスト
const captureBtn = document.getElementById('capture-btn');          // 撮影ボタン
const countdown = document.getElementById('countdown');             // カウントダウン表示

// --- フレーム選択UI ---
const frameSelectToggle = document.getElementById('frame-select-toggle');  // フレーム選択開閉ボタン
const frameSelector = document.getElementById('frame-selector');            // フレーム選択パネル
const frameSelectorClose = document.getElementById('frame-selector-close'); // パネル閉じるボタン
const frameList = document.getElementById('frame-list');                    // フレーム一覧リスト

// --- ログアウトボタン ---
const logoutBtn = document.getElementById('logout-btn');                    // ログアウトボタン

// --- メッセージ編集UI ---
const messageToggle = document.getElementById('message-toggle');                // メッセージ編集開閉ボタン
const messageEditor = document.getElementById('message-editor');                // メッセージ編集パネル
const messageEditorClose = document.getElementById('message-editor-close');     // パネル閉じるボタン
const messageDateInput = document.getElementById('message-date');               // 日付入力欄
const messageTextInput = document.getElementById('message-text');               // メッセージ入力欄
const messageLocationInput = document.getElementById('message-location');       // 場所入力欄
const messageDateEnableCheckbox = document.getElementById('message-date-enable');      // 日付表示チェックボックス
const messageTextEnableCheckbox = document.getElementById('message-text-enable');      // メッセージ表示チェックボックス
const messageLocationEnableCheckbox = document.getElementById('message-location-enable'); // 場所表示チェックボックス
const editLocationBtn = document.getElementById('edit-location-btn');           // 場所編集ボタン
const messageApplyBtn = document.getElementById('message-apply');               // 適用ボタン

// --- 結果画面要素 ---
const resultCanvas = document.getElementById('result-canvas');      // 撮影画像表示用Canvas
const retakeBtn = document.getElementById('retake-btn');            // 再撮影ボタン
const downloadBtn = document.getElementById('download-btn');        // 保存ボタン

// --- エラー画面要素 ---
const errorText = document.getElementById('error-text');            // エラーメッセージテキスト
const retryBtn = document.getElementById('retry-btn');              // 再試行ボタン

// ======================================================================
// グローバル変数定義
// 各モジュールで共有される変数
// ======================================================================

/**
 * カメラストリームオブジェクト
 * @type {MediaStream|null}
 */
let stream = null;

/**
 * 現在読み込まれているフレーム画像オブジェクト
 * @type {HTMLImageElement|null}
 */
let frameImage = null;

/**
 * フレーム設定データ
 * @type {Object|null}
 */
let framesConfig = null;

/**
 * 現在選択中のフレームID
 * @type {string}
 */
let currentFrameId = 'hapuna';

/**
 * 記念日メッセージの設定
 * @type {Object}
 */
let messageConfig = {
    date: {
        enabled: true,
        value: ''
    },
    text: {
        enabled: true,
        value: '記念日おめでとうございます'
    },
    location: {
        enabled: true,
        value: ''
    }
};

// ======================================================================
// アプリケーション初期化
// ページ読み込み完了時に実行される処理
// ======================================================================

/**
 * アプリケーション起動時の初期化処理
 * 
 * 実行内容:
 * 1. 今日の日付をメッセージ入力欄に設定
 * 2. レストラン情報に基づいて場所を自動設定
 * 3. フレーム設定を読み込み
 * 4. カメラを起動
 * 5. Service Workerを登録（対応ブラウザのみ）
 */
window.addEventListener('load', async () => {
    // 今日の日付を取得してISO形式に変換（YYYY-MM-DD）
    const today = new Date().toISOString().split('T')[0];
    
    // 日付入力欄のデフォルト値を今日に設定
    messageDateInput.value = today;
    
    // メッセージ設定のデフォルト日付を今日に設定
    messageConfig.date.value = today;
    
    // レストラン情報を読み込んで場所を設定
    try {
        const response = await fetch('assets/config/restaurants.json');
        const restaurantsData = await response.json();
        const authRestaurantId = window.authRestaurantId || sessionStorage.getItem('restaurantId');
        
        if (authRestaurantId && restaurantsData.restaurants) {
            const restaurant = restaurantsData.restaurants.find(r => r.id === authRestaurantId);
            if (restaurant) {
                // 場所を「品川プリンスホテル {レストラン名}」形式で設定
                const locationText = `品川プリンスホテル　${restaurant.fullName}`;
                messageLocationInput.value = locationText;
                messageConfig.location.value = locationText;
            }
        }
    } catch (error) {
        console.error('Failed to load restaurant info:', error);
    }
    
    // フレーム設定ファイルを読み込み
    loadFramesConfig();
    
    // ヘッダーとプレビューガイドを更新
    updateCameraHeader();
    updatePreviewGuide();
    
    // カメラを初期化
    initCamera();
    
    // Service Workerの登録（対応ブラウザのみ）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./js/sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
});

// ======================================================================
// アプリケーション終了時の処理
// ブラウザを閉じる前にリソースを解放
// ======================================================================

/**
 * ページを離れる前のクリーンアップ処理
 * カメラストリームを停止してリソースを解放
 */
window.addEventListener('beforeunload', () => {
    // カメラストリームを停止
    stopCamera();
});
