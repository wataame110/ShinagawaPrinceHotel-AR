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
        const framesData = await framesResp.json();
        const restsData  = await restsResp.json();

        const authId = sessionStorage.getItem('restaurantId');
        if (!authId) { window.location.href = 'login.html'; return; }

        // 認証レストランの情報
        const rest = restsData.restaurants.find(r => r.id === authId);
        if (!rest)  { window.location.href = 'login.html'; return; }

        // レストラン独自フレーム2種（なければ空）
        const ownFrames    = (framesData.restaurantFrames && framesData.restaurantFrames[authId]) || [];
        // 共通フレーム4種
        const commonFrames = framesData.commonFrames || [];

        // 合計6種をまとめる（独自2種が先頭）
        const allFrames = [...ownFrames, ...commonFrames];

        framesConfig = { hotelName: framesData.hotelName, frames: allFrames };

        // 最初のフレームをデフォルト選択
        if (allFrames.length > 0) {
            currentFrameId = allFrames[0].id;
            loadFrameImage(allFrames[0].path);
            frameOverlay.src = allFrames[0].path;
        }

        renderFrameList();

    } catch (err) {
        console.warn('loadFramesConfig failed:', err);
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

    // 独自フレーム（先頭2件）と共通フレーム（残り4件）を視覚的に分ける
    const ownCount = Math.min(2, framesConfig.frames.filter(f => !f.id.startsWith('common')).length);

    framesConfig.frames.forEach((frame, idx) => {
        if (idx === ownCount && ownCount > 0) {
            const sep = document.createElement('div');
            sep.className = 'frame-list-sep';
            sep.textContent = '── 共通フレーム ──';
            frameList.appendChild(sep);
        }

        const item = document.createElement('div');
        item.className = 'frame-item' + (frame.id === currentFrameId ? ' selected' : '');
        item.dataset.frameId = frame.id;

        const thumbSrc = frame.thumbnail || frame.path;
        item.innerHTML = `
            <img src="${thumbSrc}" alt="${frame.name}"
                 onerror="this.style.background='#2c3e50';this.alt='${frame.name}'">
            <div class="frame-item-name">${frame.name}</div>
        `;
        item.addEventListener('click', () => selectFrame(frame.id));
        frameList.appendChild(item);
    });
}

/** フレームを選択して適用 */
function selectFrame(frameId) {
    currentFrameId = frameId;
    const frame = framesConfig.frames.find(f => f.id === frameId);
    if (frame) {
        frameOverlay.src = frame.path;
        loadFrameImage(frame.path);
        document.querySelectorAll('.frame-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.frameId === frameId);
        });
    }
    closeFrameSelector();
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

    const lines = [];
    if (cfg.date.enabled && cfg.date.value) {
        const d = new Date(cfg.date.value);
        if (!isNaN(d)) lines.push(`📅 ${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`);
    }
    if (cfg.text.enabled     && cfg.text.value)     lines.push(`💐 ${cfg.text.value}`);
    if (cfg.location.enabled && cfg.location.value) lines.push(`📍 ${cfg.location.value}`);

    previewGuideText.innerHTML = lines.length
        ? lines.join('<br>')
        : 'フレーム内に収まるよう調整してください';
}

function applyMessageSettings() {
    messageConfig.date.enabled     = messageDateEnableCheckbox.checked;
    messageConfig.date.value       = messageDateInput.value;
    messageConfig.text.enabled     = messageTextEnableCheckbox.checked;
    messageConfig.text.value       = messageTextInput.value;
    messageConfig.location.enabled = messageLocationEnableCheckbox.checked;
    messageConfig.location.value   = messageLocationInput.value;
    updatePreviewGuide();
    closeMessageEditor();
}

function openMessageEditor()  { messageEditor.classList.add('active'); messageEditor.classList.remove('hidden'); }
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

document.getElementById('location-edit-btn')?.addEventListener('click', () => {
    if (messageLocationInput.readOnly) {
        messageLocationInput.readOnly = false;
        messageLocationInput.classList.remove('location-readonly');
        document.getElementById('location-edit-btn').textContent = '固定';
    } else {
        messageLocationInput.readOnly = true;
        messageLocationInput.classList.add('location-readonly');
        document.getElementById('location-edit-btn').textContent = '編集';
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
    if (typeof stopFaceLoop === 'function' && typeof faceFilterActive !== 'undefined' && faceFilterActive) {
        // 顔フィルターループを再開
        faceFilterActive = true;
        startFaceLoop();
    }
});

// --- 保存 ---
document.getElementById('download-btn')?.addEventListener('click', downloadImage);

// --- ログアウト ---
logoutBtn?.addEventListener('click', () => {
    if (!confirm('ログアウトしますか？')) return;
    sessionStorage.clear();
    stopCamera();
    if (typeof stopFaceLoop === 'function') stopFaceLoop();
    window.location.href = 'login.html';
});
