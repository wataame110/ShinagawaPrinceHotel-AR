/**
 * ======================================================================
 * Google Analytics 4 イベントトラッキング (analytics.js)
 *
 * 各モジュールから呼び出す共通イベント送信ヘルパー。
 * gtag が未ロードの場合は何もしない（オフライン時の安全弁）。
 * ======================================================================
 */

/**
 * GA4 カスタムイベントを送信
 * @param {string} eventName - イベント名
 * @param {Object} [params]  - イベントパラメータ
 */
function trackEvent(eventName, params) {
    if (typeof gtag !== 'function') {
        console.warn('[GA] gtag not loaded — event dropped:', eventName);
        return;
    }
    try {
        var restaurant = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('restaurantName')) || '';
        var base = { restaurant_name: restaurant };
        var merged = Object.assign(base, params || {});
        gtag('event', eventName, merged);
        console.log('[GA] ✓', eventName, merged);
    } catch (e) {
        console.warn('[GA] send error:', eventName, e);
    }
}

/* ── 各イベント送信関数 ──────────────────────────────────── */

/** ログイン成功 */
function trackLogin(restaurantName, restaurantId) {
    trackEvent('login', {
        method: 'password',
        restaurant_id: restaurantId || '',
        restaurant_name: restaurantName || ''
    });
}

/** カメラ画面表示 */
function trackCameraView() {
    trackEvent('page_view_camera');
}

/** フレーム選択 */
function trackFrameSelect(frameName) {
    trackEvent('frame_select', {
        frame_name: frameName || 'none'
    });
}

/** 写真フィルター適用 */
function trackFilterUse(filterName) {
    trackEvent('filter_use', {
        filter_name: filterName || 'none'
    });
}

/** Face AR デコレーション選択 */
function trackFaceDecoUse(decoName) {
    trackEvent('face_deco_use', {
        decoration_name: decoName || 'none'
    });
}

/** 写真撮影 */
function trackPhotoCapture(frameName, filterName) {
    trackEvent('photo_capture', {
        frame_name: frameName || 'none',
        filter_name: filterName || 'none'
    });
}

/** 写真保存 */
function trackPhotoSave(method) {
    trackEvent('photo_save', {
        save_method: method || 'download'
    });
}

/** カメラ切替 */
function trackCameraSwitch(direction) {
    trackEvent('camera_switch', {
        camera_direction: direction || ''
    });
}

/** 言語変更 */
function trackLangChange(langCode) {
    trackEvent('lang_change', {
        language: langCode || ''
    });
}

/** メッセージ編集 */
function trackMessageEdit() {
    trackEvent('message_edit');
}
