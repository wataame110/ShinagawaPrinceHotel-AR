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
    if (name === 'camera')  cameraScreen.classList.add('active');
    if (name === 'result')  resultScreen.classList.add('active');
    if (name === 'error')   errorScreen.classList.add('active');
}

function showError(message) {
    const el = document.getElementById('error-text');
    if (el) el.textContent = message;
    showScreen('error');
}

// ======================================================================
// フレーム設定読み込み（独自2種 + 共通4種）
// ======================================================================

async function loadFramesConfig() {
    try {
        const [framesResp, restsResp] = await Promise.all([
            fetch('assets/config/frames-config.json'),
            fetch('assets/config/restaurants.json')
        ]);

        // 4xx / 5xx のレスポンスはエラー扱いにする
        if (!framesResp.ok) throw new Error(`frames-config: HTTP ${framesResp.status}`);
        if (!restsResp.ok)  throw new Error(`restaurants: HTTP ${restsResp.status}`);

        const framesData = await framesResp.json();
        const restsData  = await restsResp.json();

        const authId = sessionStorage.getItem('restaurantId');
        // authId がなくてもリダイレクトせず、フレームなし状態で続行
        if (!authId) {
            console.warn('loadFramesConfig: no restaurantId in session (frames skipped)');
            framesConfig = { hotelName: '品川プリンスホテル', frames: [] };
            renderFrameList();
            return;
        }

        // 認証レストランの情報（見つからなくてもリダイレクトせず続行）
        const rest = restsData.restaurants.find(r => r.id === authId);
        if (!rest) {
            console.warn('loadFramesConfig: restaurant not found for id:', authId);
        }

        // レストラン独自フレーム2種（なければ空）
        const ownFrames    = (framesData.restaurantFrames && framesData.restaurantFrames[authId]) || [];
        // 共通フレーム
        const commonFrames = framesData.commonFrames || [];

        // 先頭に「なし」を追加
        const NO_FRAME = { id: 'no_frame', name: 'なし', path: null, thumbnail: null, isNone: true };
        const allFrames = [NO_FRAME, ...ownFrames, ...commonFrames];

        framesConfig = { hotelName: framesData.hotelName || '品川プリンスホテル', frames: allFrames };

        // デフォルト：独自フレームがあればその1枚目、なければ共通1枚目
        const defaultFrame = ownFrames[0] || commonFrames[0] || null;
        if (defaultFrame) {
            currentFrameId = defaultFrame.id;
            loadFrameImage(defaultFrame.path);
            if (frameOverlay) {
                frameOverlay.src = defaultFrame.path;
                frameOverlay.style.opacity = '1';
            }
        } else {
            currentFrameId = 'no_frame';
        }

        renderFrameList();

    } catch (err) {
        console.warn('loadFramesConfig failed (non-fatal):', err);
        // 設定読み込み失敗でもカメラ画面は動作させる（フレームなし状態）
        framesConfig = { hotelName: '品川プリンスホテル', frames: [] };
        renderFrameList();
    }
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
    if (!framesConfig || !framesConfig.frames || framesConfig.frames.length === 0) {
        frameList.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">フレームが見つかりません</p>';
        return;
    }

    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';
    const t    = (typeof I18N !== 'undefined' && I18N[lang]) ? I18N[lang] : {};

    // フレームを 3 グループに分類
    const noneFrames   = framesConfig.frames.filter(f =>  f.isNone);
    const ownFrames    = framesConfig.frames.filter(f => !f.isNone && !f.id.startsWith('common'));
    const commonFrames = framesConfig.frames.filter(f => !f.isNone &&  f.id.startsWith('common'));

    const ownLabel    = t.frame_section_own    || 'レストランオリジナル';
    const commonLabel = t.frame_section_common || '共通フレーム';

    /** フレームアイテム DOM を生成 */
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

    /** セクションを描画するヘルパー */
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

    // 「なし」+ レストランオリジナルを同じセクションに（空白セル削減）
    const firstGroup = [...noneFrames, ...ownFrames];
    const firstLabel = ownFrames.length > 0 ? ownLabel : null;

    appendSection(firstLabel, firstGroup);          // なし + レストランオリジナル
    appendSection(commonLabel, commonFrames);        // 共通フレーム
}

/** フレームを選択して適用 */
function selectFrame(frameId) {
    currentFrameId = frameId;
    const frame = framesConfig.frames.find(f => f.id === frameId);
    if (!frame) return;

    if (frame.isNone) {
        // 「なし」: フレームオーバーレイを非表示にして frameImage を null に
        frameImage = null;
        if (frameOverlay) { frameOverlay.src = ''; frameOverlay.style.opacity = '0'; }
    } else {
        if (frameOverlay) frameOverlay.style.opacity = '1';
        frameOverlay.src = frame.path || '';
        loadFrameImage(frame.path);
    }

    document.querySelectorAll('.frame-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.frameId === frameId);
    });
    closeFrameSelector();
    hidePanelOverlay();
}

function openFrameSelector()  { frameSelector.classList.add('active'); frameSelector.classList.remove('hidden'); }
function closeFrameSelector() {
    frameSelector.classList.remove('active');
    setTimeout(() => frameSelector.classList.add('hidden'), 350);
}

// ======================================================================
// メッセージ編集
// ======================================================================

function updateCameraHeader() {
    const name = sessionStorage.getItem('restaurantName');
    if (name && cameraHeaderTitle) cameraHeaderTitle.textContent = name;
}

function updatePreviewGuide() {
    if (!previewGuideText) return;
    const cfg = (typeof messageConfig !== 'undefined') ? messageConfig : null;
    if (!cfg) return;

    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ja';

    const parts = [];
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
                parts.push(fmt.format(d));
            } catch (_) {
                parts.push(`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`);
            }
        }
    }
    if (cfg.text.enabled     && cfg.text.value)     parts.push(cfg.text.value);
    if (cfg.location.enabled && cfg.location.value) parts.push(cfg.location.value);

    const fallback = (typeof t === 'function') ? t('preview_guide_hint') : 'フレーム内に収まるよう調整してください';
    const text = parts.length ? parts.join('　') : (fallback || '');
    previewGuideText.textContent = text;

    if (cfg.style) {
        if (cfg.style.fontFamily) previewGuideText.style.fontFamily = cfg.style.fontFamily;
    }

    fitPreviewText();
}

function fitPreviewText() {
    if (!previewGuideText) return;
    const container = previewGuideText.parentElement;
    if (!container) return;

    const maxFontPx = 11;
    const minFontPx = 5;
    const padH = 20;
    const availW = container.clientWidth - padH;

    if (availW <= 0) {
        previewGuideText.style.fontSize = maxFontPx + 'px';
        return;
    }

    previewGuideText.style.fontSize = maxFontPx + 'px';

    if (previewGuideText.scrollWidth <= availW) return;

    let lo = minFontPx, hi = maxFontPx;
    while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        previewGuideText.style.fontSize = mid + 'px';
        if (previewGuideText.scrollWidth > availW) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    previewGuideText.style.fontSize = lo + 'px';
}

function applyMessageSettings() {
    messageConfig.date.enabled     = messageDateEnableCheckbox.checked;
    messageConfig.date.value       = messageDateInput.value;
    messageConfig.text.enabled     = messageTextEnableCheckbox.checked;
    messageConfig.text.value       = messageTextInput.value;
    messageConfig.location.enabled = messageLocationEnableCheckbox.checked;
    messageConfig.location.value   = messageLocationInput.value;

    // 書体・サイズ・位置スタイル設定
    const fontSel = document.getElementById('msg-font-select');
    const sizeSel = document.getElementById('msg-size-select');
    const posSel  = document.getElementById('msg-position-select');
    messageConfig.style = {
        fontFamily: fontSel ? fontSel.value : "'Meiryo', sans-serif",
        fontSize:   sizeSel ? sizeSel.value  : '16',
        position:   posSel  ? posSel.value   : 'bottom-center'
    };

    updatePreviewGuide();
    closeMessageEditor();
    hidePanelOverlay();
}

function openMessageEditor() {
    // messageConfig → DOM 同期（パネルを開く前に現在の設定値を入力欄へ反映）
    if (typeof messageConfig !== 'undefined') {
        if (messageDateInput)              messageDateInput.value              = messageConfig.date.value     || '';
        if (messageTextInput)              messageTextInput.value              = messageConfig.text.value     || '';
        if (messageLocationInput)          messageLocationInput.value          = messageConfig.location.value || '';
        if (messageDateEnableCheckbox)     messageDateEnableCheckbox.checked   = !!messageConfig.date.enabled;
        if (messageTextEnableCheckbox)     messageTextEnableCheckbox.checked   = !!messageConfig.text.enabled;
        if (messageLocationEnableCheckbox) messageLocationEnableCheckbox.checked = !!messageConfig.location.enabled;
        const fontSel = document.getElementById('msg-font-select');
        const sizeSel = document.getElementById('msg-size-select');
        const posSel  = document.getElementById('msg-position-select');
        if (fontSel && messageConfig.style) fontSel.value = messageConfig.style.fontFamily || "'Meiryo', 'メイリオ', sans-serif";
        if (sizeSel && messageConfig.style) sizeSel.value = messageConfig.style.fontSize   || '16';
        if (posSel  && messageConfig.style) posSel.value  = messageConfig.style.position   || 'bottom-center';
    }
    messageEditor.classList.add('active');
    messageEditor.classList.remove('hidden');
}
function closeMessageEditor() {
    messageEditor.classList.remove('active');
    setTimeout(() => messageEditor.classList.add('hidden'), 350);
}

// ======================================================================
// フィルターパネル
// ======================================================================

function openFilterSelector()  { filterSelector.classList.add('active'); filterSelector.classList.remove('hidden'); }
function closeFilterSelector() {
    filterSelector.classList.remove('active');
    setTimeout(() => filterSelector.classList.add('hidden'), 350);
}

// ======================================================================
// 顔 AR フィルターパネル
// ======================================================================

function openFaceFilterSelector()  { faceFilterSelector.classList.add('active'); faceFilterSelector.classList.remove('hidden'); }
function closeFaceFilterSelector() {
    faceFilterSelector.classList.remove('active');
    setTimeout(() => faceFilterSelector.classList.add('hidden'), 350);
}

// ======================================================================
// イベントリスナー登録
// ======================================================================

// --- パネル外タップで閉じる（オーバーレイ） ---
document.addEventListener('click', (e) => {
    if (e.target.id === 'panel-overlay') {
        closeFrameSelector();
        closeMessageEditor();
        closeFilterSelector();
        closeFaceFilterSelector();
        hidePanelOverlay();
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
    showPanelOverlay();
});

document.getElementById('frame-selector-close')?.addEventListener('click', () => {
    closeFrameSelector(); hidePanelOverlay();
});

// --- メッセージ編集 ---
messageToggle.addEventListener('click', () => {
    openMessageEditor();
    showPanelOverlay();
});

document.getElementById('message-editor-close')?.addEventListener('click', () => {
    closeMessageEditor(); hidePanelOverlay();
});

document.getElementById('message-apply')?.addEventListener('click', applyMessageSettings);

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

// 書体・サイズ・位置のリアルタイム反映
const _msgFontSel = document.getElementById('msg-font-select');
const _msgSizeSel = document.getElementById('msg-size-select');
const _msgPosSel  = document.getElementById('msg-position-select');
if (_msgFontSel) _msgFontSel.addEventListener('change', () => {
    messageConfig.style.fontFamily = _msgFontSel.value;
    updatePreviewGuide();
});
if (_msgSizeSel) _msgSizeSel.addEventListener('change', () => {
    messageConfig.style.fontSize = _msgSizeSel.value;
    updatePreviewGuide();
});
if (_msgPosSel) _msgPosSel.addEventListener('change', () => {
    messageConfig.style.position = _msgPosSel.value;
    updatePreviewGuide();
});

// --- 写真フィルター ---
document.getElementById('filter-toggle')?.addEventListener('click', () => {
    openFilterSelector();
    showPanelOverlay();
    if (typeof buildFilterUI === 'function') buildFilterUI();
});

document.getElementById('filter-selector-close')?.addEventListener('click', () => {
    closeFilterSelector(); hidePanelOverlay();
});

// --- 顔 AR フィルター ---
document.getElementById('face-filter-toggle')?.addEventListener('click', () => {
    openFaceFilterSelector();
    showPanelOverlay();
    if (typeof buildFaceFilterUI === 'function') buildFaceFilterUI();
});

document.getElementById('face-filter-selector-close')?.addEventListener('click', () => {
    closeFaceFilterSelector(); hidePanelOverlay();
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
    showScreen('camera');
    // selectFaceDecoration 経由で再起動（gen 管理を一元化）
    if (typeof selectFaceDecoration === 'function' &&
        typeof currentDecorationId !== 'undefined' &&
        currentDecorationId !== 'none') {
        selectFaceDecoration(currentDecorationId);
    }
});

// --- 保存 ---
document.getElementById('download-btn')?.addEventListener('click', downloadImage);

// --- 長押し保存（result-canvas を長押しで写真を保存） ---
(function setupLongPress() {
    const resultCanvas = document.getElementById('result-canvas');
    if (!resultCanvas) return;
    let pressTimer = null;
    const LONG_PRESS_MS = 600;

    const startPress = () => {
        pressTimer = setTimeout(() => {
            pressTimer = null;
            downloadImage();
        }, LONG_PRESS_MS);
    };
    const cancelPress = () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };

    resultCanvas.addEventListener('touchstart', startPress, { passive: true });
    resultCanvas.addEventListener('touchend',   cancelPress);
    resultCanvas.addEventListener('touchmove',  cancelPress, { passive: true });
    resultCanvas.addEventListener('mousedown',  startPress);
    resultCanvas.addEventListener('mouseup',    cancelPress);
    resultCanvas.addEventListener('mouseleave', cancelPress);
})();

// --- 言語セレクター初期化 ---
if (typeof buildLanguageSelector === 'function') {
    buildLanguageSelector('lang-selector-anchor');
}
if (typeof applyTranslations === 'function') {
    applyTranslations();
}

// --- ログアウト ---
logoutBtn?.addEventListener('click', () => {
    if (!confirm('ログアウトしますか？')) return;
    sessionStorage.clear();
    stopCamera();
    if (typeof stopFaceLoop === 'function') stopFaceLoop();
    window.location.href = 'login.html';
});
