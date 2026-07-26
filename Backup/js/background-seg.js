/**
 * ======================================================================
 * 背景合成モジュール (background-seg.js)
 * MediaPipe Selfie Segmentation によるリアルタイム背景合成
 *
 * 機能:
 * - 被写体（人物）をカメラ映像からリアルタイム切り抜き
 * - 選択した背景画像の上に被写体を合成
 * - Face AR デコレーションとの併用が可能
 *
 * 依存: app.js（グローバル変数 cameraVideo, frameOverlay, frameImage, currentFacingMode）
 * ======================================================================
 */

// ======================================================================
// 状態変数
// ======================================================================

/** 背景合成モードが有効かどうか */
var bgCompositeMode = false;

/** 現在選択中の背景画像（Image オブジェクト） */
var currentBgImage = null;

/** Selfie Segmentation インスタンス */
var _selfieSegmentation = null;

/** 背景合成用 Canvas の 2D コンテキスト */
var _bgCtx = null;

/** 処理ループの世代管理（停止判定用） */
var _bgLoopGen = 0;

/** Selfie Segmentation の準備完了フラグ */
var _bgSegReady = false;

/** 初期化中フラグ（二重初期化防止） */
var _bgSegInitializing = false;

/** 初回結果受信フラグ（キャンバス表示タイミング制御） */
var _bgFirstResult = false;

// ======================================================================
// CDN スクリプトの動的読み込み
// 初回の背景選択時にのみ読み込む（帯域節約）
// ======================================================================

/**
 * MediaPipe Selfie Segmentation の CDN スクリプトを動的に読み込む
 * @returns {Promise<void>}
 */
function _loadSelfieSegScript() {
    if (typeof SelfieSegmentation !== 'undefined') return Promise.resolve();
    return new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js';
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = function() { reject(new Error('Selfie Segmentation CDN load failed')); };
        document.head.appendChild(s);
    });
}

// ======================================================================
// Selfie Segmentation 初期化
// ======================================================================

/**
 * MediaPipe Selfie Segmentation モデルを初期化
 * CDN スクリプトの読み込み → モデルの読み込み → ウォームアップ
 * @returns {Promise<void>}
 */
async function _initSelfieSegmentation() {
    if (_bgSegReady || _bgSegInitializing) return;
    _bgSegInitializing = true;

    try {
        // CDN スクリプトを動的読み込み
        await _loadSelfieSegScript();

        _selfieSegmentation = new SelfieSegmentation({
            locateFile: function(file) {
                return 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/' + file;
            }
        });

        // modelSelection: 1 = landscape モデル（高精度）
        _selfieSegmentation.setOptions({
            modelSelection: 1,
            selfieMode: true
        });

        _selfieSegmentation.onResults(_onBgSegResults);

        // ウォームアップ: 小さなダミー画像を送信してモデルを完全にロード
        var warmup = document.createElement('canvas');
        warmup.width = 64;
        warmup.height = 64;
        warmup.getContext('2d').fillRect(0, 0, 64, 64);
        await _selfieSegmentation.send({ image: warmup });

        _bgSegReady = true;
        console.log('[BG-SEG] Selfie Segmentation ready');

    } catch (err) {
        console.error('[BG-SEG] Init failed:', err);
    } finally {
        _bgSegInitializing = false;
    }
}

// ======================================================================
// セグメンテーション結果コールバック
// 背景画像 + 切り抜かれた被写体 を bg-composite-canvas に描画
// ======================================================================

/**
 * Selfie Segmentation の結果を受け取り、合成画像を描画
 * 合成レイヤー順:
 *   1. セグメンテーションマスク（人物=不透明、背景=透明）
 *   2. カメラ映像を人物部分のみ描画（source-in）
 *   3. 背景画像を人物の後ろに描画（destination-over）
 *
 * @param {Object} results - MediaPipe の結果オブジェクト
 */
function _onBgSegResults(results) {
    var canvas = document.getElementById('bg-composite-canvas');
    if (!canvas || !_bgCtx || !currentBgImage || !bgCompositeMode) return;

    var w = canvas.width;
    var h = canvas.height;
    if (w === 0 || h === 0) return;

    // 初回結果でキャンバスを表示
    if (!_bgFirstResult) {
        _bgFirstResult = true;
        canvas.style.display = 'block';
    }

    // ---- ビデオの 9:16 クロップ計算 ----
    var imgW = results.image.videoWidth || results.image.naturalWidth || results.image.width || w;
    var imgH = results.image.videoHeight || results.image.naturalHeight || results.image.height || h;
    var targetAspect = 9 / 16;
    var videoAspect = imgW / imgH;
    var srcX, srcY, srcW, srcH;

    if (videoAspect > targetAspect) {
        srcH = imgH;
        srcW = Math.round(imgH * targetAspect);
        srcX = Math.round((imgW - srcW) / 2);
        srcY = 0;
    } else {
        srcW = imgW;
        srcH = Math.round(imgW / targetAspect);
        srcX = 0;
        srcY = Math.round((imgH - srcH) / 2);
    }

    var ctx = _bgCtx;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // ---- 反転判定: cameraFlipped を使用（設定パネルからも切替可能） ----
    var isFlipped = (typeof cameraFlipped !== 'undefined') ? cameraFlipped : false;

    if (isFlipped) {
        // ---- 反転モード: マスクとカメラ映像を同時に反転して整合性を保つ ----
        // Step 1: マスクを反転して描画
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.segmentationMask, srcX, srcY, srcW, srcH, 0, 0, w, h);
        ctx.restore();

        // Step 2: カメラ映像を反転して人物部分のみ描画（source-in）
        ctx.globalCompositeOperation = 'source-in';
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, srcX, srcY, srcW, srcH, 0, 0, w, h);
        ctx.restore();
    } else {
        // ---- 通常モード ----
        // Step 1: マスクを描画
        ctx.drawImage(results.segmentationMask, srcX, srcY, srcW, srcH, 0, 0, w, h);

        // Step 2: カメラ映像を人物部分のみ描画（source-in）
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, srcX, srcY, srcW, srcH, 0, 0, w, h);
    }

    // ---- Step 3: 背景画像を人物の後ろに描画（destination-over） ----
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(currentBgImage, 0, 0, w, h);

    // 合成モードをデフォルトに戻す
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ======================================================================
// 処理ループ
// ======================================================================

/**
 * 背景合成のフレーム処理ループを開始
 * requestAnimationFrame ベースでカメラフレームを連続処理
 */
function _startBgLoop() {
    _bgLoopGen++;
    var myGen = _bgLoopGen;

    var canvas = document.getElementById('bg-composite-canvas');
    if (!canvas) return;

    // ---- Canvas サイズ設定（9:16、最大長辺 720px） ----
    if (cameraVideo && cameraVideo.videoWidth) {
        var vw = cameraVideo.videoWidth;
        var vh = cameraVideo.videoHeight;
        var targetAspect = 9 / 16;
        var videoAspect = vw / vh;
        var cropW, cropH;
        if (videoAspect > targetAspect) {
            cropH = vh;
            cropW = Math.round(vh * targetAspect);
        } else {
            cropW = vw;
            cropH = Math.round(vw / targetAspect);
        }
        // パフォーマンスのため最大 720px に制限
        var scale = Math.min(720 / Math.max(cropW, cropH), 1);
        canvas.width  = Math.round(cropW * scale);
        canvas.height = Math.round(cropH * scale);
    } else {
        // ビデオ未準備時のデフォルト
        canvas.width  = 405;
        canvas.height = 720;
    }

    _bgCtx = canvas.getContext('2d');

    /**
     * メインループ関数
     * - 世代管理で古いループを自動停止
     * - カメラ画面表示中のみ処理（省電力）
     */
    async function loop() {
        if (myGen !== _bgLoopGen || !bgCompositeMode) return;

        // カメラが準備できていなければスキップして次フレームへ
        if (!cameraVideo || cameraVideo.paused || !cameraVideo.videoWidth) {
            requestAnimationFrame(loop);
            return;
        }

        // カメラ画面でなければスキップ（省電力）
        var cs = document.getElementById('camera-screen');
        if (!cs || !cs.classList.contains('active')) {
            requestAnimationFrame(loop);
            return;
        }

        // セグメンテーション処理
        if (_selfieSegmentation && _bgSegReady) {
            try {
                await _selfieSegmentation.send({ image: cameraVideo });
            } catch (e) {
                // フレームのドロップは許容（次のフレームで再試行）
            }
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

// ======================================================================
// 公開 API
// ======================================================================

/**
 * 背景合成モードを開始
 * フレーム選択から背景画像が選ばれた時に呼ばれる
 *
 * @param {HTMLImageElement} bgImage - 読み込み済みの背景画像
 */
async function startBgComposite(bgImage) {
    currentBgImage = bgImage;
    bgCompositeMode = true;
    _bgFirstResult = false;

    // フレームオーバーレイを非表示
    if (typeof frameOverlay !== 'undefined' && frameOverlay) {
        frameOverlay.style.opacity = '0';
        frameOverlay.src = '';
    }
    if (typeof frameImage !== 'undefined') frameImage = null;

    // 初回のみモデル読み込み（2回目以降はスキップ）
    if (!_bgSegReady) {
        await _initSelfieSegmentation();
    }

    // 処理ループ開始
    _startBgLoop();
    console.log('[BG-SEG] Composite started');
}

/**
 * 背景合成モードを停止
 * 通常のフレーム撮影に戻る時に呼ばれる
 */
function stopBgComposite() {
    if (!bgCompositeMode && !currentBgImage) return;
    bgCompositeMode = false;
    _bgLoopGen++;
    currentBgImage = null;
    _bgFirstResult = false;

    var canvas = document.getElementById('bg-composite-canvas');
    if (canvas) {
        canvas.style.display = 'none';
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    console.log('[BG-SEG] Composite stopped');
}

/**
 * 撮影時: 背景合成済み画像を出力 Canvas に描画
 * capture.js の captureImage() から呼ばれる
 *
 * @param {CanvasRenderingContext2D} ctx - 出力 Canvas のコンテキスト
 * @param {number} outW - 出力幅
 * @param {number} outH - 出力高さ
 * @returns {boolean} 描画したかどうか
 */
function drawBgCompositeOnCanvas(ctx, outW, outH) {
    var srcCanvas = document.getElementById('bg-composite-canvas');
    if (!srcCanvas || srcCanvas.width === 0 || !bgCompositeMode || !currentBgImage) return false;

    // bg-composite-canvas は CSS で反転表示されている場合があるが
    // ピクセルデータ自体は未反転。撮影時は cameraFlipped に合わせて反転描画する。
    if (typeof cameraFlipped !== 'undefined' && cameraFlipped) {
        ctx.save();
        ctx.translate(outW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(srcCanvas, 0, 0, outW, outH);
        ctx.restore();
    } else {
        ctx.drawImage(srcCanvas, 0, 0, outW, outH);
    }
    return true;
}
