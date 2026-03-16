/**
 * ======================================================================
 * capture.js
 * countdown -> capture -> canvas composite -> share / receipt print
 * ======================================================================
 */

// ======================================================================
// Print settings (global state, set from UI)
// ======================================================================

var printSettings = {
    ratio:     '1:1',
    marginPos: 'none',
    marginCm:  0
};

// ======================================================================
// Countdown
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
// Capture & Canvas composite
// ======================================================================

function captureImage() {
    if (!cameraVideo || !cameraVideo.videoWidth || !cameraVideo.videoHeight) {
        alert('カメラ映像が準備できていません。もう一度お試しください。');
        captureBtn.disabled = false;
        return;
    }

    try {
        const videoW = cameraVideo.videoWidth;
        const videoH = cameraVideo.videoHeight;

        var ratio = (typeof printSettings !== 'undefined' && printSettings.ratio) ? printSettings.ratio : '9:16';
        var rParts = ratio.split(':').map(Number);
        var targetAspect = rParts[0] / rParts[1];
        const videoAspect = videoW / videoH;

        let srcX, srcY, srcW, srcH;
        if (videoAspect > targetAspect) {
            srcH = videoH;
            srcW = Math.round(videoH * targetAspect);
            srcX = Math.round((videoW - srcW) / 2);
            srcY = 0;
        } else {
            srcW = videoW;
            srcH = Math.round(videoW / targetAspect);
            srcX = 0;
            srcY = Math.round((videoH - srcH) / 2);
        }

        const scale = Math.min(1920 / srcW, 1920 / srcH, 1);
        const outW  = Math.round(srcW * scale);
        const outH  = Math.round(srcH * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const filterStr = (typeof getCanvasFilterString === 'function') ? getCanvasFilterString() : 'none';
        ctx.filter = filterStr;

        if (currentFacingMode === 'user') {
            ctx.save();
            ctx.translate(outW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(cameraVideo, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
            ctx.restore();
        } else {
            ctx.drawImage(cameraVideo, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        }
        ctx.filter = 'none';

        const _currentFilter = (typeof getCurrentFilter === 'function') ? getCurrentFilter() : null;
        if (_currentFilter && _currentFilter.apply) {
            _currentFilter.apply(ctx, outW, outH);
        }

        if (typeof drawFaceFilterOnCanvas === 'function') {
            try { drawFaceFilterOnCanvas(ctx, outW, outH); } catch (_) {}
        }

        if (frameImage && frameImage.complete && frameImage.naturalWidth > 0) {
            try { ctx.drawImage(frameImage, 0, 0, outW, outH); } catch (_) {}
        }

        try { drawMessageOnCanvas(ctx, outW, outH); } catch (_) {}

        resultCanvas.width  = outW;
        resultCanvas.height = outH;
        var rCtx = resultCanvas.getContext('2d');
        rCtx.drawImage(canvas, 0, 0);

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
// Message drawing (Canvas)
// ======================================================================

function drawMessageOnCanvas(ctx, width, height) {
    var cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
    if (!cfg) return;

    var hasDate     = cfg.date     && cfg.date.enabled     && cfg.date.value;
    var hasText     = cfg.text     && cfg.text.enabled     && cfg.text.value;
    var hasLocation = cfg.location && cfg.location.enabled && cfg.location.value;
    if (!hasDate && !hasText && !hasLocation) return;

    ctx.save();

    var userFontPx = cfg.style && cfg.style.fontSize ? parseInt(cfg.style.fontSize) : 16;
    var userFont   = "'Meiryo', sans-serif";
    var userPos    = cfg.style && cfg.style.position ? cfg.style.position : 'bottom-center';

    var scaleFactor  = Math.max(height, width) / 960;
    var baseFontSize = Math.round(userFontPx * scaleFactor);
    var lineH        = baseFontSize * 1.7;
    var lines        = [];

    if (hasDate) {
        var parts = cfg.date.value.split('-').map(Number);
        var d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cfg.date.value);
        if (!isNaN(d)) {
            var lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';
            var localeMap = {
                'ja': 'ja-JP', 'en': 'en-US', 'zh': 'zh-CN', 'zh-TW': 'zh-TW',
                'ko': 'ko-KR', 'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'pt': 'pt-PT'
            };
            var locale = localeMap[lang] || 'en-US';
            try {
                var fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });
                lines.push(fmt.format(d));
            } catch (_) {
                lines.push(d.getFullYear() + '\u5e74' + (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65e5');
            }
        }
    }
    if (hasText)     lines.push(cfg.text.value);
    if (hasLocation) lines.push(cfg.location.value);
    if (lines.length === 0) { ctx.restore(); return; }

    var totalH = lines.length * lineH + baseFontSize * 1.4;
    var boxW   = width  * 0.88;
    var boxH   = totalH + baseFontSize;
    var margin = height * 0.04;

    var isTop    = userPos.startsWith('top');
    var isLeft   = userPos.endsWith('left');
    var isRight  = userPos.endsWith('right');

    var boxY = isTop ? margin : height - boxH - margin;
    var boxX;
    if (isLeft)       boxX = margin;
    else if (isRight) boxX = width - boxW - margin;
    else              boxX = (width - boxW) / 2;

    ctx.fillStyle = 'rgba(26, 35, 50, 0.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    var textX = boxX + boxW * 0.5;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    lines.forEach(function(line, i) {
        var y = boxY + baseFontSize * 0.9 + (i + 0.5) * lineH;
        ctx.font      = 'bold ' + baseFontSize + 'px ' + userFont;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(line, textX + 1, y + 1);
        ctx.fillStyle = i === 0 ? '#D4AF37' : '#FAF9F6';
        ctx.fillText(line, textX, y);
    });

    ctx.restore();
}

// ======================================================================
// Result image preparation (for long-press save & share)
// ======================================================================

var _lastResultBlobUrl = null;

function prepareResultImage() {
    if (_lastResultBlobUrl) { URL.revokeObjectURL(_lastResultBlobUrl); _lastResultBlobUrl = null; }
    var img = document.getElementById('result-image');
    if (!img || !resultCanvas || !resultCanvas.width) return;
    resultCanvas.toBlob(function(blob) {
        if (!blob) return;
        _lastResultBlobUrl = URL.createObjectURL(blob);
        img.src = _lastResultBlobUrl;
        img.style.display = 'none';
        resultCanvas.style.display = 'none';
    }, 'image/jpeg', 0.93);

    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.style.display = (typeof navigator.share === 'function') ? 'flex' : 'none';
    }

    buildReceiptPreview();
}

function buildReceiptPreview() {
    var preview = document.getElementById('receipt-preview');
    if (!preview || !resultCanvas || !resultCanvas.width) return;

    var settings = (typeof printSettings !== 'undefined') ? printSettings : {};
    var ratio     = settings.ratio || '1:1';
    var marginPos = settings.marginPos || 'none';
    var marginCm  = parseFloat(settings.marginCm) || 0;

    var ratioParts = ratio.split(':').map(Number);
    var rW = ratioParts[0];
    var rH = ratioParts[1];

    var paperWidthMm = 74;
    var photoWMm = paperWidthMm;
    var photoHMm = paperWidthMm * (rH / rW);

    var marginMm    = marginCm * 10;
    var marginTopMm = (marginPos === 'top')    ? marginMm : 0;
    var marginBotMm = (marginPos === 'bottom') ? marginMm : 0;

    var dataUrl = resultCanvas.toDataURL('image/jpeg', 0.90);

    var rpPhoto = document.getElementById('rp-photo');
    if (rpPhoto) {
        rpPhoto.src = dataUrl;
        rpPhoto.style.width = '100%';
        rpPhoto.style.aspectRatio = rW + ' / ' + rH;
    }

    var scaleRatio = 1;
    var paperEl = preview.querySelector('.receipt-paper');
    if (paperEl) {
        var paperPxW = paperEl.clientWidth - 24;
        scaleRatio = paperPxW > 0 ? paperPxW / paperWidthMm : 1;
    }

    var rpMarginTop = document.getElementById('rp-margin-top');
    if (rpMarginTop) rpMarginTop.style.height = (marginTopMm * scaleRatio) + 'px';

    var rpMarginBot = document.getElementById('rp-margin-bottom');
    if (rpMarginBot) rpMarginBot.style.height = (marginBotMm * scaleRatio) + 'px';

    var cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
    var infoHtml = '';
    if (cfg) {
        if (cfg.date && cfg.date.enabled && cfg.date.value) {
            var parts = cfg.date.value.split('-').map(Number);
            var d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(cfg.date.value);
            if (!isNaN(d)) infoHtml += '<div>' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + '</div>';
        }
        if (cfg.text && cfg.text.enabled && cfg.text.value) {
            infoHtml += '<div class="rp-msg">' + _escapeHtml(cfg.text.value) + '</div>';
        }
        if (cfg.location && cfg.location.enabled && cfg.location.value) {
            infoHtml += '<div>' + _escapeHtml(cfg.location.value) + '</div>';
        }
    }
    var now = new Date();
    infoHtml += '<div style="margin-top:2px;">' + now.getFullYear() + '/' + pad2(now.getMonth()+1) + '/' + pad2(now.getDate()) +
                ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + '</div>';

    var rpInfo = document.getElementById('rp-info');
    if (rpInfo) rpInfo.innerHTML = infoHtml;

    preview.style.display = 'block';
}

function _cropToRatio(srcCanvas, rW, rH) {
    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    var targetAspect = rW / rH;
    var srcAspect    = sw / sh;

    var cx, cy, cw, ch;
    if (srcAspect > targetAspect) {
        ch = sh;
        cw = Math.round(sh * targetAspect);
        cx = Math.round((sw - cw) / 2);
        cy = 0;
    } else {
        cw = sw;
        ch = Math.round(sw / targetAspect);
        cx = 0;
        cy = Math.round((sh - ch) / 2);
    }

    var out = document.createElement('canvas');
    out.width  = cw;
    out.height = ch;
    var ctx = out.getContext('2d');
    ctx.drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return out;
}

function _escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ======================================================================
// Share (Web Share API)
// ======================================================================

function _makeFilename() {
    var now     = new Date();
    var dateStr = '' + now.getFullYear() + pad2(now.getMonth()+1) + pad2(now.getDate());
    var timeStr = pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    return 'ARPhoto_' + dateStr + '_' + timeStr + '.jpg';
}

function _makeBlob() {
    return new Promise(function(resolve, reject) {
        resultCanvas.toBlob(
            function(b) { b ? resolve(b) : reject(new Error('toBlob failed')); },
            'image/jpeg', 0.93
        );
    });
}

async function shareImage() {
    if (!resultCanvas || !resultCanvas.width) return;

    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.disabled = true;

    try {
        var blob     = await _makeBlob();
        var filename = _makeFilename();
        var file     = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'AR Photo' });
            if (typeof trackPhotoSave === 'function') trackPhotoSave('share_api');
        } else if (typeof navigator.share === 'function') {
            var tempUrl = URL.createObjectURL(blob);
            await navigator.share({ title: 'AR Photo', url: tempUrl });
            setTimeout(function() { URL.revokeObjectURL(tempUrl); }, 1000);
            if (typeof trackPhotoSave === 'function') trackPhotoSave('share_url');
        } else {
            alert('この端末では共有機能を利用できません。');
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Share failed:', err);
    } finally {
        if (shareBtn) shareBtn.disabled = false;
    }
}

// ======================================================================
// Receipt print - delegates to ThermalPrinter (printer.js)
// Bluetooth / USB direct -> fallback to window.print()
// ======================================================================

async function printReceipt() {
    if (!resultCanvas || !resultCanvas.width) {
        alert('画像がありません。もう一度撮影してください。');
        return;
    }

    var btn = document.getElementById('print-btn');
    if (btn) { btn.disabled = true; btn.textContent = '印刷中...'; }

    var overlay = document.getElementById('print-status-overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
        var settings = (typeof printSettings !== 'undefined') ? printSettings : {};
        await ThermalPrinter.printReceipt(resultCanvas, settings);
        if (typeof trackPhotoSave === 'function') trackPhotoSave('receipt_print');
        _showPrintResult(true);
    } catch (err) {
        console.error('printReceipt error:', err);
        _showPrintResult(false);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'レシート印刷'; }
    }
}

function _showPrintResult(success) {
    var overlay = document.getElementById('print-status-overlay');
    var statusEl = document.getElementById('print-status');
    if (!overlay) return;
    var spinner = overlay.querySelector('.print-spinner');
    if (spinner) spinner.style.display = 'none';
    if (statusEl) {
        statusEl.innerHTML = success
            ? '<div class="print-status-ok">&#10003;</div>印刷完了'
            : '<div class="print-status-err">&#10007;</div>印刷に失敗しました';
    }
    setTimeout(function () {
        overlay.style.display = 'none';
        if (spinner) spinner.style.display = 'block';
        if (statusEl) statusEl.textContent = '';
    }, 2000);
}

function pad2(n) { return String(n).padStart(2, '0'); }
