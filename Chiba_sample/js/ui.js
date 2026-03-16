/**
 * ======================================================================
 * UIモジュール (ui.js)
 * 画面遷移・パネル制御・フレーム6種選択・フィルターUIを担当
 * ======================================================================
 */

// ======================================================================
// 画面遷移
// ======================================================================

function showScreen(name) {
    cameraScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    errorScreen.classList.remove('active');
    if (name === 'camera')  { cameraScreen.classList.add('active'); if (typeof trackCameraView === 'function') trackCameraView(); }
    if (name === 'result')  resultScreen.classList.add('active');
    if (name === 'error')   errorScreen.classList.add('active');
}

function showError(message) {
    const el = document.getElementById('error-text');
    if (el) el.textContent = message;
    showScreen('error');
}

// ======================================================================
// フレーム設定読み込み（比率別フレーム対応）
// ======================================================================

var _framesRawConfig = null;

async function loadFramesConfig() {
    try {
        const framesResp = await fetch('assets/config/frames-config.json');
        if (!framesResp.ok) throw new Error(`frames-config: HTTP ${framesResp.status}`);

        _framesRawConfig = await framesResp.json();
        rebuildFramesForCurrentRatio();

    } catch (err) {
        console.warn('loadFramesConfig failed (non-fatal):', err);
        _framesRawConfig = null;
        framesConfig = { appName: 'AR Photo & Print', frames: [] };
        renderFrameList();
    }
}

function rebuildFramesForCurrentRatio() {
    var cfg = _framesRawConfig;
    if (!cfg) return;

    var ratio = (typeof printSettings !== 'undefined' && printSettings.ratio) ? printSettings.ratio : '9:16';
    var baseDir = cfg.framesBaseDir || 'assets/images/frames/';
    var ratioSection = (cfg.ratioFrames && cfg.ratioFrames[ratio]) ? cfg.ratioFrames[ratio] : null;

    var dir = ratioSection ? (baseDir + ratioSection.dir) : (baseDir + '9x16/');
    var rawFrames = ratioSection ? (ratioSection.frames || []) : [];

    var mappedFrames = rawFrames.map(function(f) {
        return {
            id:        f.id,
            name:      f.name || f.id,
            path:      f.path || (dir + f.id + '.png'),
            thumbnail: f.thumbnail || f.path || (dir + f.id + '.png')
        };
    });

    var NO_FRAME = { id: 'no_frame', name: 'なし', path: null, thumbnail: null, isNone: true };
    var allFrames = [NO_FRAME].concat(mappedFrames);

    framesConfig = { appName: cfg.appName || 'AR Photo & Print', frames: allFrames };

    var prevId = currentFrameId;
    var stillExists = allFrames.some(function(f) { return f.id === prevId; });

    if (!stillExists) {
        var defaultFrame = mappedFrames[0] || null;
        if (defaultFrame) {
            currentFrameId = defaultFrame.id;
            loadFrameImage(defaultFrame.path);
            if (frameOverlay) {
                frameOverlay.src = defaultFrame.path;
                frameOverlay.style.opacity = '1';
            }
        } else {
            currentFrameId = 'no_frame';
            frameImage = null;
            if (frameOverlay) { frameOverlay.src = ''; frameOverlay.style.opacity = '0'; }
        }
    }

    renderFrameList();
}

/** フレーム画像を非同期でプリロード */
function loadFrameImage(path) {
    frameImage = null;
    if (!path) return;
    const img = new Image();
    img.onload  = () => { frameImage = img; };
    // キャプチャ用 Image の読み込み失敗時は frameImage を null にするだけ。
    // frameOverlay（可視 <img>）の opacity は selectFrame が制御するため
    // ここでは変更しない（opacity を '0' にすると表示が消えてしまうバグを修正）
    img.onerror = () => { frameImage = null; };
    img.src = path;
}

/** フレームリスト UI を生成 */
function renderFrameList() {
    frameList.innerHTML = '';

    var ratio = (typeof printSettings !== 'undefined' && printSettings.ratio) ? printSettings.ratio : '9:16';
    var ratioLabel = ratio + ' フレーム';

    if (!framesConfig || !framesConfig.frames) {
        frameList.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">フレームが見つかりません</p>';
        return;
    }

    var noneFrames   = framesConfig.frames.filter(function(f) { return  f.isNone; });
    var ratioFrames  = framesConfig.frames.filter(function(f) { return !f.isNone; });

    if (noneFrames.length === 0 && ratioFrames.length === 0) {
        frameList.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">この比率(' + ratio + ')のフレームはまだありません</p>';
        var noFrameItem = document.createElement('div');
        noFrameItem.className = 'frame-item selected';
        noFrameItem.innerHTML = '<div class="frame-item-none"><span class="frame-none-icon">✕</span><span class="frame-none-label">フレームなし</span></div>';
        noFrameItem.addEventListener('click', function() { selectFrame('no_frame'); });
        frameList.appendChild(noFrameItem);
        return;
    }

    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';
    const t    = (typeof I18N !== 'undefined' && I18N[lang]) ? I18N[lang] : {};

    function buildItem(frame) {
        const item = document.createElement('div');
        item.className = 'frame-item' + (frame.id === currentFrameId ? ' selected' : '');
        item.dataset.frameId = frame.id;

        const isPlaceholder = frame.path && frame.path.includes('placeholder_');

        if (frame.isNone) {
            item.innerHTML = `
                <div class="frame-item-none">
                    <span class="frame-none-icon">✕</span>
                    <span class="frame-none-label">${t.frame_none || 'フレームなし'}</span>
                </div>
                <div class="frame-item-name">${frame.name}</div>
            `;
        } else {
            const thumbSrc = frame.thumbnail || frame.path || 'assets/images/frames/frame-placeholder.png';
            item.innerHTML = `
                <div class="frame-thumb-wrap">
                    <img src="${thumbSrc}" alt="${frame.name}"
                         onerror="this.onerror=null;this.src='assets/images/frames/frame-placeholder.png'">
                    ${isPlaceholder ? '<span class="frame-badge-soon">準備中</span>' : ''}
                </div>
                <div class="frame-item-name">${frame.name}</div>
            `;
        }
        item.addEventListener('click', () => selectFrame(frame.id));
        return item;
    }

    function appendSection(label, frames) {
        if (frames.length === 0) return;

        if (label) {
            const sep = document.createElement('div');
            sep.className = 'frame-list-sep';
            sep.textContent = `── ${label} ──`;
            frameList.appendChild(sep);
        }

        const grid = document.createElement('div');
        grid.className = 'frame-section-grid';
        frames.forEach(f => grid.appendChild(buildItem(f)));
        frameList.appendChild(grid);
    }

    appendSection(null, noneFrames);
    appendSection(ratioLabel, ratioFrames);
}

/** フレームを選択して適用 */
function selectFrame(frameId) {
    currentFrameId = frameId;
    const frame = framesConfig.frames.find(f => f.id === frameId);
    if (!frame) return;
    currentFrameName = frame.name || frameId;

    if (frame.isNone) {
        // 「なし」: フレームオーバーレイを非表示にして frameImage を null に
        frameImage = null;
        if (frameOverlay) { frameOverlay.src = ''; frameOverlay.style.opacity = '0'; }
    } else {
        if (frameOverlay) frameOverlay.style.opacity = '1';
        frameOverlay.src = frame.path || '';
        loadFrameImage(frame.path);
    }

    updateCropGuide();

    document.querySelectorAll('.frame-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.frameId === frameId);
    });
    if (typeof trackFrameSelect === 'function') trackFrameSelect(frame ? frame.name : 'none');
    closeAllPanels();
}

function openFrameSelector()  {
    closeAllPanels();
    frameSelector.classList.add('active');
    frameSelector.classList.remove('hidden');
    showPanelOverlay();
}
function closeFrameSelector() {
    frameSelector.classList.remove('active');
}

// ======================================================================
// メッセージ編集
// ======================================================================

function updateCameraHeader() {
    if (cameraHeaderTitle) cameraHeaderTitle.textContent = 'AR Photo & Print';
}

function updatePreviewGuide() {
    if (!previewGuideText) return;
    const cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
    if (!cfg) return;

    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';

    const lines = [];
    if (cfg.date.enabled && cfg.date.value) {
        const nums = cfg.date.value.split('-').map(Number);
        const d = nums.length === 3 ? new Date(nums[0], nums[1] - 1, nums[2]) : new Date(cfg.date.value);
        if (!isNaN(d)) {
            const localeMap = {
                'ja': 'ja-JP', 'en': 'en-US', 'zh': 'zh-CN', 'zh-TW': 'zh-TW',
                'ko': 'ko-KR', 'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'pt': 'pt-PT'
            };
            const locale = localeMap[lang] || 'en-US';
            try {
                const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });
                lines.push(fmt.format(d));
            } catch (_) {
                lines.push(`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`);
            }
        }
    }
    if (cfg.text.enabled     && cfg.text.value)     lines.push(cfg.text.value);
    if (cfg.location.enabled && cfg.location.value) lines.push(cfg.location.value);

    previewGuideText.innerHTML = '';

    if (lines.length === 0) {
        const fallback = (typeof t === 'function') ? t('preview_guide_hint') : 'フレーム内に収まるよう調整してください';
        const span = document.createElement('span');
        span.className = 'preview-guide-line';
        span.textContent = fallback || '';
        previewGuideText.appendChild(span);
    } else {
        lines.forEach(text => {
            const span = document.createElement('span');
            span.className = 'preview-guide-line';
            span.textContent = text;
            previewGuideText.appendChild(span);
        });
    }

    fitPreviewText();
}

function fitPreviewText() {
    const spans = previewGuideText ? previewGuideText.querySelectorAll('.preview-guide-line') : [];
    if (!spans.length) return;
    const container = previewGuideText.parentElement;
    if (!container) return;

    const maxFontPx = 11;
    const minFontPx = 5;
    const availW = container.clientWidth - 20;
    if (availW <= 0) return;

    spans.forEach(span => {
        span.style.fontSize = maxFontPx + 'px';
        if (span.scrollWidth <= availW) return;

        let lo = minFontPx, hi = maxFontPx;
        while (hi - lo > 0.5) {
            const mid = (lo + hi) / 2;
            span.style.fontSize = mid + 'px';
            if (span.scrollWidth > availW) { hi = mid; } else { lo = mid; }
        }
        span.style.fontSize = lo + 'px';
    });
}

function applyMessageSettings() {
    messageConfig.date.enabled     = messageDateEnableCheckbox.checked;
    messageConfig.date.value       = messageDateInput.value;
    messageConfig.text.enabled     = messageTextEnableCheckbox.checked;
    messageConfig.text.value       = messageTextInput.value;
    messageConfig.location.enabled = messageLocationEnableCheckbox.checked;
    messageConfig.location.value   = messageLocationInput.value;

    var posGrid = document.getElementById('msg-position-grid');
    var activePos = posGrid ? posGrid.querySelector('.pos-btn.active') : null;
    var sizeBtns = document.getElementById('msg-size-btns');
    var activeSize = sizeBtns ? sizeBtns.querySelector('.size-btn.active') : null;

    messageConfig.style = {
        fontSize:   activeSize ? activeSize.getAttribute('data-size') : '16',
        position:   activePos  ? activePos.getAttribute('data-pos')  : 'bottom-center'
    };

    updatePreviewGuide();
    if (typeof trackMessageEdit === 'function') trackMessageEdit();
    closeAllPanels();
}

function openMessageEditor() {
    closeAllPanels();
    if (typeof messageConfig !== 'undefined') {
        if (messageDateInput)              messageDateInput.value              = messageConfig.date.value     || '';
        if (messageTextInput)              messageTextInput.value              = messageConfig.text.value     || '';
        if (messageLocationInput)          messageLocationInput.value          = messageConfig.location.value || '';
        if (messageDateEnableCheckbox)     messageDateEnableCheckbox.checked   = !!messageConfig.date.enabled;
        if (messageTextEnableCheckbox)     messageTextEnableCheckbox.checked   = !!messageConfig.text.enabled;
        if (messageLocationEnableCheckbox) messageLocationEnableCheckbox.checked = !!messageConfig.location.enabled;

        var curPos  = (messageConfig.style && messageConfig.style.position) || 'bottom-center';
        var curSize = (messageConfig.style && messageConfig.style.fontSize) || '16';
        var posGrid = document.getElementById('msg-position-grid');
        if (posGrid) {
            posGrid.querySelectorAll('.pos-btn').forEach(function(b) {
                b.classList.toggle('active', b.getAttribute('data-pos') === curPos);
            });
        }
        var sizeBtns = document.getElementById('msg-size-btns');
        if (sizeBtns) {
            sizeBtns.querySelectorAll('.size-btn').forEach(function(b) {
                b.classList.toggle('active', b.getAttribute('data-size') === curSize);
            });
        }
    }
    messageEditor.classList.add('active');
    messageEditor.classList.remove('hidden');
    showPanelOverlay();
}
function closeMessageEditor() {
    messageEditor.classList.remove('active');
}

// ======================================================================
// フィルターパネル
// ======================================================================

function openFilterSelector() {
    closeAllPanels();
    filterSelector.classList.add('active');
    filterSelector.classList.remove('hidden');
    showPanelOverlay();
    if (typeof buildFilterUI === 'function') buildFilterUI();
}
function closeFilterSelector() {
    filterSelector.classList.remove('active');
}

// ======================================================================
// 顔 AR フィルターパネル
// ======================================================================

function openFaceFilterSelector() {
    closeAllPanels();
    faceFilterSelector.classList.add('active');
    faceFilterSelector.classList.remove('hidden');
    showPanelOverlay();
    if (typeof buildFaceFilterUI === 'function') buildFaceFilterUI();
}
function closeFaceFilterSelector() {
    faceFilterSelector.classList.remove('active');
}

// ======================================================================
// 全パネル一括クローズ（排他制御 + オーバーレイ除去）
// ======================================================================

function closeAllPanels() {
    if (frameSelector)      frameSelector.classList.remove('active');
    if (messageEditor)      messageEditor.classList.remove('active');
    if (filterSelector)     filterSelector.classList.remove('active');
    if (faceFilterSelector) faceFilterSelector.classList.remove('active');
    var psp = document.getElementById('print-settings-panel');
    if (psp) psp.classList.remove('active');
    hidePanelOverlay();
}

// ======================================================================
// クロップガイド表示（印刷比率に応じたカメラプレビュー上の枠）
// ======================================================================

function updateCropGuide() {
    var guide = document.getElementById('crop-guide-overlay');
    if (!guide) return;
    var ratio = (typeof printSettings !== 'undefined' && printSettings.ratio) ? printSettings.ratio : '9:16';
    if (ratio === '9:16') {
        guide.style.display = 'none';
        if (frameOverlay) { frameOverlay.style.top = '0'; frameOverlay.style.height = '100%'; frameOverlay.style.left = '0'; frameOverlay.style.width = '100%'; }
        return;
    }
    guide.style.display = 'block';
    var rParts = ratio.split(':').map(Number);
    var rW = rParts[0], rH = rParts[1];
    var videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;
    var containerW = videoContainer.clientWidth;
    var containerH = videoContainer.clientHeight;
    var containerAspect = containerW / containerH;
    var targetAspect = rW / rH;

    var cropW, cropH, cropTop, cropLeft;
    if (targetAspect > containerAspect) {
        cropW = containerW;
        cropH = containerW / targetAspect;
    } else {
        cropH = containerH;
        cropW = containerH * targetAspect;
    }
    cropTop  = (containerH - cropH) / 2;
    cropLeft = (containerW - cropW) / 2;

    guide.style.borderTop    = cropTop + 'px solid rgba(0,0,0,0.5)';
    guide.style.borderBottom = cropTop + 'px solid rgba(0,0,0,0.5)';
    guide.style.borderLeft   = cropLeft + 'px solid rgba(0,0,0,0.5)';
    guide.style.borderRight  = cropLeft + 'px solid rgba(0,0,0,0.5)';

    if (frameOverlay) {
        frameOverlay.style.top    = cropTop + 'px';
        frameOverlay.style.left   = cropLeft + 'px';
        frameOverlay.style.width  = cropW + 'px';
        frameOverlay.style.height = cropH + 'px';
    }
}

// ======================================================================
// イベントリスナー登録
// ======================================================================

// --- パネル外タップで閉じる（オーバーレイ） ---
document.addEventListener('click', (e) => {
    if (e.target.id === 'panel-overlay') {
        closeAllPanels();
    }
});

function showPanelOverlay() {
    const ov = document.getElementById('panel-overlay');
    if (ov) ov.classList.add('active');
}
function hidePanelOverlay() {
    const ov = document.getElementById('panel-overlay');
    if (ov) ov.classList.remove('active');
}

// --- フレーム選択 ---
frameSelectToggle.addEventListener('click', () => {
    openFrameSelector();
});

document.getElementById('frame-selector-close')?.addEventListener('click', () => {
    closeAllPanels();
});

// --- メッセージ編集 ---
messageToggle.addEventListener('click', () => {
    openMessageEditor();
});

document.getElementById('message-editor-close')?.addEventListener('click', () => {
    closeAllPanels();
});

document.getElementById('message-apply')?.addEventListener('click', applyMessageSettings);

(function() {
    var posGrid = document.getElementById('msg-position-grid');
    if (posGrid) {
        posGrid.addEventListener('click', function(e) {
            var btn = e.target.closest('.pos-btn');
            if (!btn) return;
            posGrid.querySelectorAll('.pos-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    }
    var sizeBtns = document.getElementById('msg-size-btns');
    if (sizeBtns) {
        sizeBtns.addEventListener('click', function(e) {
            var btn = e.target.closest('.size-btn');
            if (!btn) return;
            sizeBtns.querySelectorAll('.size-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    }
})();

document.getElementById('edit-location-btn')?.addEventListener('click', () => {
    if (messageLocationInput.readOnly) {
        messageLocationInput.readOnly = false;
        messageLocationInput.classList.remove('location-readonly');
        document.getElementById('edit-location-btn').textContent = '固定';
    } else {
        messageLocationInput.readOnly = true;
        messageLocationInput.classList.add('location-readonly');
        document.getElementById('edit-location-btn').textContent = '編集';
    }
});

// リアルタイムプレビュー更新
[
    [messageDateInput,          () => { messageConfig.date.value     = messageDateInput.value;          updatePreviewGuide(); }],
    [messageTextInput,          () => { messageConfig.text.value     = messageTextInput.value;           updatePreviewGuide(); }],
    [messageLocationInput,      () => { messageConfig.location.value = messageLocationInput.value;       updatePreviewGuide(); }],
    [messageDateEnableCheckbox, () => { messageConfig.date.enabled     = messageDateEnableCheckbox.checked;  updatePreviewGuide(); }],
    [messageTextEnableCheckbox, () => { messageConfig.text.enabled     = messageTextEnableCheckbox.checked;  updatePreviewGuide(); }],
    [messageLocationEnableCheckbox, () => { messageConfig.location.enabled = messageLocationEnableCheckbox.checked; updatePreviewGuide(); }]
].forEach(([el, fn]) => { if (el) el.addEventListener('change', fn); if (el && el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'date') el.addEventListener('input', fn); });

// --- 写真フィルター ---
document.getElementById('filter-toggle')?.addEventListener('click', () => {
    openFilterSelector();
});

document.getElementById('filter-selector-close')?.addEventListener('click', () => {
    closeAllPanels();
});

// --- 顔 AR フィルター ---
document.getElementById('face-filter-toggle')?.addEventListener('click', () => {
    openFaceFilterSelector();
});

document.getElementById('face-filter-selector-close')?.addEventListener('click', () => {
    closeAllPanels();
});

// --- 撮影ボタン ---
captureBtn.addEventListener('click', () => {
    if (typeof initAudioContext === 'function') initAudioContext(); // iOS: ユーザー操作で AudioContext 解放
    startCountdown();
});

// --- カメラ切り替え ---
switchCameraBtn?.addEventListener('click', switchCamera);

// --- 再撮影 ---
document.getElementById('retake-btn')?.addEventListener('click', () => {
    var rImg = document.getElementById('result-image');
    if (rImg) { rImg.style.display = 'none'; rImg.src = ''; }
    var rPreview = document.getElementById('receipt-preview');
    if (rPreview) rPreview.style.display = 'none';
    if (resultCanvas) resultCanvas.style.display = 'block';
    showScreen('camera');
    // selectFaceDecoration 経由で再起動（gen 管理を一元化）
    if (typeof selectFaceDecoration === 'function' &&
        typeof currentDecorationId !== 'undefined' &&
        currentDecorationId !== 'none') {
        selectFaceDecoration(currentDecorationId);
    }
});

// --- 共有 ---
document.getElementById('share-btn')?.addEventListener('click', shareImage);

// --- レシート印刷 ---
document.getElementById('print-btn')?.addEventListener('click', () => {
    if (typeof printReceipt === 'function') printReceipt();
});

// --- 印刷設定パネル ---
const _printSettingsPanel = document.getElementById('print-settings-panel');
document.getElementById('print-settings-toggle')?.addEventListener('click', () => {
    if (_printSettingsPanel) {
        var isOpen = _printSettingsPanel.classList.contains('active');
        closeAllPanels();
        if (!isOpen) {
            _printSettingsPanel.classList.add('active');
            panelOverlay.classList.add('active');
        }
    }
});
document.getElementById('print-settings-close')?.addEventListener('click', () => { closeAllPanels(); });

document.getElementById('print-ratio-btns')?.addEventListener('click', (e) => {
    var btn = e.target.closest('.ratio-btn');
    if (!btn) return;
    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof printSettings !== 'undefined') printSettings.ratio = btn.dataset.ratio;
    rebuildFramesForCurrentRatio();
    updateCropGuide();
});

var _marginPosSelect = document.getElementById('print-margin-pos');
var _marginSliderWrap = document.getElementById('margin-slider-wrap');
var _marginCmInput   = document.getElementById('print-margin-cm');
var _marginCmLabel   = document.getElementById('print-margin-value');

if (_marginPosSelect) _marginPosSelect.addEventListener('change', () => {
    var pos = _marginPosSelect.value;
    if (typeof printSettings !== 'undefined') printSettings.marginPos = pos;
    if (_marginSliderWrap) _marginSliderWrap.style.display = (pos === 'none') ? 'none' : 'flex';
});

if (_marginCmInput) _marginCmInput.addEventListener('input', () => {
    var val = parseFloat(_marginCmInput.value) || 0;
    if (typeof printSettings !== 'undefined') printSettings.marginCm = val;
    if (_marginCmLabel) _marginCmLabel.textContent = val.toFixed(1) + 'cm';
});

// --- 言語セレクター初期化 ---
if (typeof buildLanguageSelector === 'function') {
    buildLanguageSelector('lang-selector-anchor');
}
if (typeof applyTranslations === 'function') {
    applyTranslations();
}
