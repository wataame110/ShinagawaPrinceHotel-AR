/**
 * ======================================================================
 * 撮影モジュール (capture.js)
 * カウントダウン → 撮影 → Canvas合成 → 保存 を担当
 * ======================================================================
 */

// ======================================================================
// カウントダウン
// ======================================================================

async function startCountdown() {
    captureBtn.disabled = true;
    for (let i = 3; i > 0; i--) {
        countdown.textContent = i;
        countdown.classList.remove('hidden');
        await new Promise(r => setTimeout(r, 1000));
        countdown.classList.add('hidden');
    }
    captureImage();
    captureBtn.disabled = false;
}

// ======================================================================
// 撮影 & Canvas 合成
// ======================================================================

function captureImage() {
    // ---- 事前チェック ----
    if (!cameraVideo || !cameraVideo.videoWidth || !cameraVideo.videoHeight) {
        alert('カメラ映像が準備できていません。もう一度お試しください。');
        captureBtn.disabled = false;
        return;
    }

    try {
        const videoW = cameraVideo.videoWidth;
        const videoH = cameraVideo.videoHeight;

        // ---- 縦9:横16（縦16:横9）クロップ領域を計算 ----
        // フレーム画像・プレビューコンテナのアスペクト比（縦16:横9）に合わせて切り取る
        const targetAspect   = 9 / 16;              // 横:縦 = 9:16（縦長ポートレート）
        const videoAspect    = videoW / videoH;

        let srcX, srcY, srcW, srcH;
        if (videoAspect > targetAspect) {
            // ビデオが横長 → 上下フル、左右をクロップ
            srcH = videoH;
            srcW = Math.round(videoH * targetAspect);
            srcX = Math.round((videoW - srcW) / 2);
            srcY = 0;
        } else {
            // ビデオが縦長 → 左右フル、上下をクロップ
            srcW = videoW;
            srcH = Math.round(videoW / targetAspect);
            srcX = 0;
            srcY = Math.round((videoH - srcH) / 2);
        }

        // ---- 出力解像度（最大 1920px） ----
        const scale = Math.min(1920 / srcW, 1920 / srcH, 1);
        const outW  = Math.round(srcW * scale);
        const outH  = Math.round(srcH * scale);

        // ---- 作業 Canvas ----
        const canvas = document.createElement('canvas');
        canvas.width  = outW;
        canvas.height = outH;
        // alpha: true（デフォルト）にしないと透過PNGフレームが正常に合成されない
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // ---- レイヤー 1: カメラ映像 ----
        if (currentFacingMode === 'user') {
            ctx.save();
            ctx.translate(outW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(cameraVideo, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
            ctx.restore();
        } else {
            ctx.drawImage(cameraVideo, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        }

        // ---- レイヤー 1b: 写真フィルター（ピクセル操作で全ブラウザ対応） ----
        if (typeof applyFilterToCanvas === 'function') {
            try { applyFilterToCanvas(ctx, outW, outH); } catch (_) {}
        }

        // ---- レイヤー 2: 顔 AR 装飾 ----
        if (typeof drawFaceFilterOnCanvas === 'function') {
            try { drawFaceFilterOnCanvas(ctx, outW, outH); } catch (_) {}
        }

        // ---- レイヤー 3: フレーム画像 ----
        if (frameImage && frameImage.complete && frameImage.naturalWidth > 0) {
            try { ctx.drawImage(frameImage, 0, 0, outW, outH); } catch (_) {}
        }

        // ---- レイヤー 4: メッセージテキスト ----
        try { drawMessageOnCanvas(ctx, outW, outH); } catch (_) {}

        // ---- 結果 Canvas に転写 ----
        resultCanvas.width  = outW;
        resultCanvas.height = outH;
        const rCtx = resultCanvas.getContext('2d');
        rCtx.drawImage(canvas, 0, 0);

        // ---- 撮影音を鳴らす ----
        if (typeof playShutterSound === 'function') {
            try { playShutterSound(); } catch (_) {}
        }

        showScreen('result');
        prepareResultImage();
        if (typeof trackPhotoCapture === 'function') {
            var _fn = (typeof currentFrameName !== 'undefined') ? currentFrameName : '';
            var _fl = (typeof getCurrentFilter === 'function' && getCurrentFilter()) ? getCurrentFilter().name : '';
            trackPhotoCapture(_fn, _fl);
        }

    } catch (err) {
        console.error('captureImage error:', err);
        alert('撮影に失敗しました。もう一度お試しください。');
        captureBtn.disabled = false;
    }
}

// ======================================================================
// メッセージ描画（Canvas）
// ======================================================================

function drawMessageOnCanvas(ctx, width, height) {
    const cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
    if (!cfg) return;

    const hasDate     = cfg.date     && cfg.date.enabled     && cfg.date.value;
    const hasText     = cfg.text     && cfg.text.enabled     && cfg.text.value;
    const hasLocation = cfg.location && cfg.location.enabled && cfg.location.value;

    if (!hasDate && !hasText && !hasLocation) return;

    ctx.save();

    // 書体・サイズ・位置（messageConfig に保存 or DOM から読み取り）
    const userFontPx = cfg.style && cfg.style.fontSize ? parseInt(cfg.style.fontSize) : 16;
    const userFont   = cfg.style && cfg.style.fontFamily ? cfg.style.fontFamily : "'Meiryo', sans-serif";
    const userPos    = cfg.style && cfg.style.position ? cfg.style.position : 'bottom-center';

    // 出力解像度に対してスケール
    const scaleFactor  = Math.max(height, width) / 960;
    const baseFontSize = Math.round(userFontPx * scaleFactor);
    const lineH        = baseFontSize * 1.7;
    const lines        = [];

    if (hasDate) {
        // ISO日付文字列をローカルタイムとして解析（UTCにするとiOS/Safariで1日ずれる）
        const parts = cfg.date.value.split('-').map(Number);
        const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cfg.date.value);
        if (!isNaN(d)) {
            // 現在の言語に合わせた日付フォーマット
            const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';
            const localeMap = {
                'ja': 'ja-JP', 'en': 'en-US', 'zh': 'zh-CN', 'zh-TW': 'zh-TW',
                'ko': 'ko-KR', 'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'pt': 'pt-PT'
            };
            const locale = localeMap[lang] || 'en-US';
            try {
                const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });
                lines.push(fmt.format(d));
            } catch (_) {
                lines.push(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);
            }
        }
    }
    if (hasText)     lines.push(cfg.text.value);
    if (hasLocation) lines.push(cfg.location.value);

    if (lines.length === 0) { ctx.restore(); return; }

    const totalH   = lines.length * lineH + baseFontSize * 1.4;
    const boxW     = width  * 0.88;
    const boxH     = totalH + baseFontSize;
    const margin   = height * 0.04;

    // 位置を 6 段階で計算
    let boxX, boxY;
    const isTop    = userPos.startsWith('top');
    const isBottom = userPos.startsWith('bottom');
    const isLeft   = userPos.endsWith('left');
    const isCenter = userPos.endsWith('center');
    const isRight  = userPos.endsWith('right');

    boxY = isTop ? margin : height - boxH - margin;
    if (isLeft)        boxX = margin;
    else if (isRight)  boxX = width - boxW - margin;
    else               boxX = (width - boxW) / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(26, 35, 50, 0.72)';
    ctx.beginPath();
    ctx.roundRect
        ? ctx.roundRect(boxX, boxY, boxW, boxH, 14)
        : (ctx.rect(boxX, boxY, boxW, boxH));
    ctx.fill();

    // 枠線
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // テキスト
    const textX = isLeft ? boxX + boxW * 0.5 : isRight ? boxX + boxW * 0.5 : width / 2;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    lines.forEach((line, i) => {
        const y = boxY + baseFontSize * 0.9 + (i + 0.5) * lineH;

        // 影
        ctx.font      = `bold ${baseFontSize}px ${userFont}`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(line, textX + 1, y + 1);

        // 本文
        ctx.fillStyle = i === 0 ? '#D4AF37' : '#FAF9F6';
        ctx.fillText(line, textX, y);
    });

    ctx.restore();
}

// ======================================================================
// 保存 — 3段構え: ①ダウンロード  ②Web Share  ③長押し保存
// ======================================================================

var _lastResultBlobUrl = null;

/**
 * 撮影後に result-canvas → img 変換（長押し保存用）
 * showScreen('result') の直後に呼ばれる
 */
function prepareResultImage() {
    if (_lastResultBlobUrl) { URL.revokeObjectURL(_lastResultBlobUrl); _lastResultBlobUrl = null; }
    var img = document.getElementById('result-image');
    if (!img || !resultCanvas || !resultCanvas.width) return;
    resultCanvas.toBlob(function(blob) {
        if (!blob) return;
        _lastResultBlobUrl = URL.createObjectURL(blob);
        img.src = _lastResultBlobUrl;
        img.style.display = 'block';
        resultCanvas.style.display = 'none';
    }, 'image/jpeg', 0.93);

    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        var hasShare = (typeof navigator.share === 'function');
        shareBtn.style.display = hasShare ? 'flex' : 'none';
    }
}

function _makeFilename() {
    var now     = new Date();
    var dateStr = '' + now.getFullYear() + pad2(now.getMonth()+1) + pad2(now.getDate());
    var timeStr = pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    var rest    = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('restaurantName')) || 'Photo';
    return 'ShinagawaPrince_' + rest + '_' + dateStr + '_' + timeStr + '.jpg';
}

function _makeBlob() {
    return new Promise(function(resolve, reject) {
        resultCanvas.toBlob(
            function(b) { b ? resolve(b) : reject(new Error('toBlob failed')); },
            'image/jpeg', 0.93
        );
    });
}

/**
 * 「保存する」ボタン — 端末に直接ダウンロード保存（全端末対応）
 */
async function downloadImage() {
    if (!resultCanvas || !resultCanvas.width) {
        alert('画像がありません。もう一度撮影してください。');
        return;
    }

    var btn = document.getElementById('download-btn');
    if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

    try {
        var blob     = await _makeBlob();
        var filename = _makeFilename();

        var url  = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        if (typeof trackPhotoSave === 'function') trackPhotoSave('download');
        setTimeout(function() { document.body.removeChild(link); URL.revokeObjectURL(url); }, 500);
    } catch (err) {
        console.error('Download error:', err);
        alert('保存に失敗しました。もう一度お試しください。');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '保存する'; }
    }
}

/**
 * 「共有」ボタン — Web Share API（iOS: 写真に保存 / Android: Google Photos 等）
 */
async function shareImage() {
    if (!resultCanvas || !resultCanvas.width) return;

    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.disabled = true;

    try {
        var blob     = await _makeBlob();
        var filename = _makeFilename();
        var file     = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '品川プリンスホテル フォト' });
            if (typeof trackPhotoSave === 'function') trackPhotoSave('share_api');
        } else if (typeof navigator.share === 'function') {
            var tempUrl = URL.createObjectURL(blob);
            await navigator.share({ title: '品川プリンスホテル フォト', url: tempUrl });
            setTimeout(function() { URL.revokeObjectURL(tempUrl); }, 1000);
            if (typeof trackPhotoSave === 'function') trackPhotoSave('share_url');
        } else {
            alert('この端末では共有機能を利用できません。「保存する」ボタンをお使いください。');
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Share failed:', err);
        alert('共有に失敗しました。「保存する」ボタンをお使いください。');
    } finally {
        if (shareBtn) shareBtn.disabled = false;
    }
}

function pad2(n) { return String(n).padStart(2, '0'); }
