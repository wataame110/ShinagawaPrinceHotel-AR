/**
 * ======================================================================
 * UIモジュール (ui.js)
 * ユーザーインターフェース操作、画面遷移、パネル制御を担当
 * 
 * グローバル変数:
 * - frameImage, framesConfig, currentFrameId, messageConfig: app.jsで定義
 * - 各DOM要素: app.jsで定義
 * ======================================================================
 */

/**
 * 画面を切り替える
 * カメラ画面、結果画面、エラー画面の表示を制御
 * 
 * @param {string} screenName - 表示する画面名 ('camera' | 'result' | 'error')
 * @returns {void}
 */
function showScreen(screenName) {
    // 全ての画面を非表示
    cameraScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    errorScreen.classList.remove('active');

    // 指定された画面を表示
    switch (screenName) {
        case 'camera':
            cameraScreen.classList.add('active');
            break;
        case 'result':
            resultScreen.classList.add('active');
            break;
        case 'error':
            errorScreen.classList.add('active');
            break;
    }
}

/**
 * エラーメッセージを表示
 * 
 * @param {string} message - 表示するエラーメッセージ
 * @returns {void}
 */
function showError(message) {
    errorText.textContent = message;
    showScreen('error');
}

// ======================================================================
// フレーム選択機能
// ======================================================================

/**
 * フレーム設定ファイルを読み込み
 * 
 * 処理フロー:
 * 1. assets/config/restaurants.json を読み込み
 * 2. 認証されたレストランの情報を取得
 * 3. フレームリストUIを生成（認証レストランのみ表示）
 * 4. 失敗時はデフォルトフレームを使用
 * 
 * @async
 * @returns {Promise<void>}
 */
async function loadFramesConfig() {
    try {
        // レストラン設定ファイルを読み込み
        const response = await fetch('assets/config/restaurants.json');
        const restaurantsData = await response.json();
        
        // 認証されたレストランIDを取得
        const authRestaurantId = window.authRestaurantId || sessionStorage.getItem('restaurantId');
        
        if (authRestaurantId && restaurantsData.restaurants) {
            // 認証されたレストランを検索
            const authenticatedRestaurant = restaurantsData.restaurants.find(r => r.id === authRestaurantId);
            
            if (authenticatedRestaurant) {
                // 認証されたレストランのみを表示
                framesConfig = {
                    hotelName: restaurantsData.hotelName,
                    frames: [{
                        id: authenticatedRestaurant.id,
                        name: authenticatedRestaurant.name,
                        restaurantName: authenticatedRestaurant.fullName,
                        path: authenticatedRestaurant.framePath,
                        thumbnail: authenticatedRestaurant.frameThumb,
                        description: authenticatedRestaurant.description
                    }]
                };
                
                // デフォルト選択を認証レストランに設定
                currentFrameId = authenticatedRestaurant.id;
                
                // フレームオーバーレイを更新
                frameOverlay.src = authenticatedRestaurant.framePath;
                
                // フレームリストUIを生成
                renderFrameList();
            }
        } else {
            // 認証情報がない場合、ログイン画面にリダイレクト
            window.location.href = 'login.html';
        }
        
    } catch (error) {
        console.warn('Failed to load restaurants config, redirecting to login');
        window.location.href = 'login.html';
    }
}

/**
 * フレーム選択リストUIを生成
 * 各フレームのサムネイルとクリックイベントを設定
 * 
 * HTML構造:
 * <div class="frame-item [selected]">
 *   <img src="thumbnail" alt="name">
 *   <div class="frame-item-name">name</div>
 * </div>
 * 
 * @returns {void}
 */
function renderFrameList() {
    // 既存のフレームリストをクリア
    frameList.innerHTML = '';
    
    // 各フレームのアイテムを生成
    framesConfig.frames.forEach(frame => {
        // フレームアイテム要素を作成
        const frameItem = document.createElement('div');
        frameItem.className = 'frame-item';
        
        // 現在選択中のフレームにselectedクラスを追加
        if (frame.id === currentFrameId) {
            frameItem.classList.add('selected');
        }
        
        // サムネイル画像とフレーム名を設定
        // onerror: サムネイルが無い場合はフルサイズ画像を表示
        frameItem.innerHTML = `
            <img src="${frame.thumbnail}" alt="${frame.name}" onerror="this.src='${frame.path}'">
            <div class="frame-item-name">${frame.name}</div>
        `;
        
        // クリックイベントを設定
        frameItem.addEventListener('click', () => {
            selectFrame(frame.id);
        });
        
        // フレームリストに追加
        frameList.appendChild(frameItem);
    });
}

/**
 * フレームを選択
 * 
 * 処理内容:
 * 1. 選択フレームIDを更新
 * 2. フレーム画像を読み込み
 * 3. オーバーレイ画像を切り替え
 * 4. 選択状態のUIを更新
 * 5. フレーム選択パネルを閉じる
 * 
 * @param {string} frameId - 選択するフレームのID
 * @returns {void}
 */
function selectFrame(frameId) {
    // 現在選択中のフレームIDを更新
    currentFrameId = frameId;
    
    // フレーム情報を取得
    const frame = framesConfig.frames.find(f => f.id === frameId);
    
    if (frame) {
        // オーバーレイ画像を切り替え
        frameOverlay.src = frame.path;
        
        // プリロード用の画像オブジェクトを作成
        frameImage = new Image();
        frameImage.src = frame.path;
        
        // 全フレームアイテムからselectedクラスを削除
        document.querySelectorAll('.frame-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 選択したフレームにselectedクラスを追加
        const selectedItem = Array.from(frameList.children).find((item, index) => {
            return framesConfig.frames[index].id === frameId;
        });
        
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    }
    
    // フレーム選択パネルを閉じる
    closeFrameSelector();
}

/**
 * フレーム選択パネルを開く
 * スライドアップアニメーションで表示
 * 
 * @returns {void}
 */
function openFrameSelector() {
    frameSelector.classList.add('active');
    frameSelector.classList.remove('hidden');
}

/**
 * フレーム選択パネルを閉じる
 * スライドダウンアニメーションで非表示
 * 
 * @returns {void}
 */
function closeFrameSelector() {
    frameSelector.classList.remove('active');
    
    // アニメーション完了後に完全に非表示
    setTimeout(() => {
        frameSelector.classList.add('hidden');
    }, 300);  // CSS transitionの時間と同期
}

// ======================================================================
// メッセージ編集機能
// ======================================================================

/**
 * カメラヘッダータイトルを更新
 * レストラン名をヘッダーに表示
 * 
 * @returns {void}
 */
function updateCameraHeader() {
    const restaurantName = window.authRestaurantName || sessionStorage.getItem('restaurantName');
    if (restaurantName && cameraHeaderTitle) {
        cameraHeaderTitle.textContent = `品川プリンスホテル　${restaurantName}`;
    }
}

/**
 * プレビューガイドを更新
 * 現在のメッセージ設定に基づいてプレビューガイドテキストを更新
 * 
 * @returns {void}
 */
function updatePreviewGuide() {
    if (!previewGuideText) return;
    
    const lines = [];
    
    // 日付が有効な場合
    if (messageConfig.date.enabled && messageConfig.date.value) {
        const dateObj = new Date(messageConfig.date.value);
        const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        lines.push(`📅 ${formattedDate}`);
    }
    
    // メッセージが有効な場合
    if (messageConfig.text.enabled && messageConfig.text.value) {
        lines.push(`💐 ${messageConfig.text.value}`);
    }
    
    // 場所が有効な場合
    if (messageConfig.location.enabled && messageConfig.location.value) {
        lines.push(`📍 ${messageConfig.location.value}`);
    }
    
    // すべて無効な場合のデフォルトメッセージ
    if (lines.length === 0) {
        lines.push('フレーム内に収まるように調整してください');
    }
    
    // HTMLとして設定（改行を<br>に変換）
    previewGuideText.innerHTML = lines.join('<br>');
}

/**
 * メッセージ編集パネルを開く
 * スライドアップアニメーションで表示
 * 
 * @returns {void}
 */
function openMessageEditor() {
    messageEditor.classList.add('active');
    messageEditor.classList.remove('hidden');
}

/**
 * メッセージ編集パネルを閉じる
 * スライドダウンアニメーションで非表示
 * 
 * @returns {void}
 */
function closeMessageEditor() {
    messageEditor.classList.remove('active');
    
    // アニメーション完了後に完全に非表示
    setTimeout(() => {
        messageEditor.classList.add('hidden');
    }, 300);  // CSS transitionの時間と同期
}

/**
 * メッセージ設定を適用
 * 
 * 処理内容:
 * 1. フォームから入力値を取得
 * 2. messageConfigオブジェクトを更新
 * 3. メッセージ編集パネルを閉じる
 * 
 * 更新される設定:
 * - date.enabled: 日付表示の有効/無効
 * - date.value: 記念日の日付
 * - text.enabled: メッセージ表示の有効/無効
 * - text.value: メインメッセージ
 * - location.enabled: 場所表示の有効/無効
 * - location.value: 場所名
 * 
 * @returns {void}
 */
function applyMessageSettings() {
    // 各入力フィールドから値を取得してmessageConfigを更新
    messageConfig.date.enabled = messageDateEnableCheckbox.checked;
    messageConfig.date.value = messageDateInput.value;
    
    messageConfig.text.enabled = messageTextEnableCheckbox.checked;
    messageConfig.text.value = messageTextInput.value;
    
    messageConfig.location.enabled = messageLocationEnableCheckbox.checked;
    messageConfig.location.value = messageLocationInput.value;
    
    // プレビューガイドを更新
    updatePreviewGuide();
    
    // メッセージ編集パネルを閉じる
    closeMessageEditor();
}

// ======================================================================
// イベントリスナー登録
// ======================================================================

// 撮影ボタン
captureBtn.addEventListener('click', () => {
    startCountdown();
});

// 再撮影ボタン
retakeBtn.addEventListener('click', () => {
    retake();
});

// 保存ボタン
downloadBtn.addEventListener('click', () => {
    downloadImage();
});

// 再試行ボタン（エラー画面）
retryBtn.addEventListener('click', () => {
    initCamera();
});

// フレームオーバーレイ画像の読み込み完了
frameOverlay.addEventListener('load', () => {
    // プリロード用の画像オブジェクトを作成
    frameImage = new Image();
    frameImage.src = frameOverlay.src;
});

// フレームオーバーレイ画像の読み込み失敗
frameOverlay.addEventListener('error', () => {
    console.warn('Frame image failed to load, continuing without frame');
});

// フレーム選択トグルボタン
frameSelectToggle.addEventListener('click', () => {
    openFrameSelector();
});

// フレーム選択パネルの閉じるボタン
frameSelectorClose.addEventListener('click', () => {
    closeFrameSelector();
});

// メッセージ編集トグルボタン
messageToggle.addEventListener('click', () => {
    openMessageEditor();
});

// メッセージ編集パネルの閉じるボタン
messageEditorClose.addEventListener('click', () => {
    closeMessageEditor();
});

// メッセージ適用ボタン
messageApplyBtn.addEventListener('click', () => {
    applyMessageSettings();
});

// 場所編集ボタン
editLocationBtn.addEventListener('click', () => {
    if (messageLocationInput.hasAttribute('readonly')) {
        // 読み取り専用を解除して編集可能にする
        messageLocationInput.removeAttribute('readonly');
        messageLocationInput.classList.remove('location-readonly');
        messageLocationInput.focus();
        editLocationBtn.textContent = '固定';
    } else {
        // 読み取り専用に戻す
        messageLocationInput.setAttribute('readonly', 'readonly');
        messageLocationInput.classList.add('location-readonly');
        editLocationBtn.textContent = '編集';
    }
});

// ログアウトボタン
logoutBtn.addEventListener('click', () => {
    // 確認ダイアログ
    if (confirm('ログアウトしますか？')) {
        // セッションストレージをクリア
        sessionStorage.removeItem('authenticated');
        sessionStorage.removeItem('restaurantId');
        sessionStorage.removeItem('restaurantName');
        
        // カメラストリームを停止
        stopCamera();
        
        // ログイン画面にリダイレクト
        window.location.href = 'login.html';
    }
});

// メッセージ入力欄の変更時にリアルタイムでプレビューを更新
messageDateInput.addEventListener('change', () => {
    messageConfig.date.value = messageDateInput.value;
    updatePreviewGuide();
});

messageTextInput.addEventListener('input', () => {
    messageConfig.text.value = messageTextInput.value;
    updatePreviewGuide();
});

messageLocationInput.addEventListener('input', () => {
    messageConfig.location.value = messageLocationInput.value;
    updatePreviewGuide();
});

// チェックボックスの変更時にリアルタイムでプレビューを更新
messageDateEnableCheckbox.addEventListener('change', () => {
    messageConfig.date.enabled = messageDateEnableCheckbox.checked;
    updatePreviewGuide();
});

messageTextEnableCheckbox.addEventListener('change', () => {
    messageConfig.text.enabled = messageTextEnableCheckbox.checked;
    updatePreviewGuide();
});

messageLocationEnableCheckbox.addEventListener('change', () => {
    messageConfig.location.enabled = messageLocationEnableCheckbox.checked;
    updatePreviewGuide();
});
