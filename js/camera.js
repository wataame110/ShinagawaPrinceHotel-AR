/**
 * ======================================================================
 * カメラモジュール (camera.js)
 * カメラの初期化、インカメラ/アウトカメラ切り替え、エラーハンドリングを担当
 * 
 * グローバル変数 (app.jsで定義):
 * - stream, currentFacingMode: カメラ状態
 * - loadingOverlay, cameraVideo, switchCameraBtn: DOM要素
 * ======================================================================
 */

/**
 * カメラを初期化してライブプレビューを開始
 * 
 * @param {string} [facingMode] - カメラ方向 ('user'=前面 / 'environment'=背面)
 *                                省略時は currentFacingMode を使用
 * @async
 * @returns {Promise<void>}
 */
async function initCamera(facingMode) {
    if (facingMode !== undefined) {
        currentFacingMode = facingMode;
    }

    loadingOverlay.classList.remove('hidden');

    try {
        const constraints = {
            video: {
                facingMode: { ideal: currentFacingMode },
                width:  { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 }
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = stream;

        await new Promise((resolve, reject) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play().then(resolve).catch(reject);
            };
            cameraVideo.onerror = reject;
            setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });

        // インカメラ時のみ映像を左右反転（自撮り鏡像表示）
        cameraVideo.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';

        // カメラ切り替えボタンのアイコンを更新
        updateSwitchCameraBtn();

        loadingOverlay.classList.add('hidden');
        showScreen('camera');

    } catch (error) {
        console.error('Camera error:', error);

        let errorMessage = 'カメラへのアクセスに失敗しました。\n';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'カメラの使用を許可してください。\n設定からブラウザのカメラ権限を確認してください。';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'カメラが見つかりませんでした。\nカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'カメラが他のアプリケーションで使用中です。\n他のアプリを閉じてから再試行してください。';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += '指定された解像度が対応していません。\n別の設定で再試行します。';
            setTimeout(() => initCameraWithFallback(), 1000);
            return;
        } else {
            errorMessage += 'エラー: ' + error.message;
        }

        loadingOverlay.classList.add('hidden');
        showError(errorMessage);
    }
}

/**
 * フォールバック用カメラ初期化
 * 高解像度で失敗した場合に制約なしで再試行
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initCameraWithFallback() {
    loadingOverlay.classList.remove('hidden');

    try {
        const constraints = {
            video: { facingMode: { ideal: currentFacingMode } },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = stream;

        await new Promise((resolve, reject) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play().then(resolve).catch(reject);
            };
            cameraVideo.onerror = reject;
            setTimeout(() => reject(new Error('Fallback camera timeout')), 10000);
        });

        cameraVideo.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
        updateSwitchCameraBtn();

        loadingOverlay.classList.add('hidden');
        showScreen('camera');

    } catch (error) {
        console.error('Fallback camera error:', error);
        loadingOverlay.classList.add('hidden');
        showError('カメラの起動に失敗しました。\nデバイスを再起動してください。');
    }
}

/**
 * インカメラ / アウトカメラを切り替える
 * 現在のストリームを停止して反対側のカメラで再起動
 * 
 * @async
 * @returns {Promise<void>}
 */
async function switchCamera() {
    // 切り替えボタンを一時無効化（連打防止）
    if (switchCameraBtn) switchCameraBtn.disabled = true;

    // 現在のストリームを停止
    stopCamera();

    // カメラ方向を反転
    const newMode = currentFacingMode === 'user' ? 'environment' : 'user';

    await initCamera(newMode);

    if (switchCameraBtn) switchCameraBtn.disabled = false;
}

/**
 * カメラ切り替えボタンのアイコン/ラベルを更新
 * 現在のカメラ方向に応じた表示にする
 * 
 * @returns {void}
 */
function updateSwitchCameraBtn() {
    if (!switchCameraBtn) return;
    if (currentFacingMode === 'user') {
        switchCameraBtn.title = 'アウトカメラに切り替え';
        switchCameraBtn.textContent = '🔄';
    } else {
        switchCameraBtn.title = 'インカメラに切り替え';
        switchCameraBtn.textContent = '🤳';
    }
}

/**
 * カメラストリームを停止
 * アプリケーション終了時やカメラ切り替え時に呼び出す
 * 
 * @returns {void}
 */
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}
