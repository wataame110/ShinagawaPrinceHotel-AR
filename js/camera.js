/**
 * ======================================================================
 * カメラモジュール (camera.js)
 * カメラの初期化、アクセス管理、エラーハンドリングを担当
 * 
 * グローバル変数:
 * - stream: app.jsで定義されたカメラストリーム
 * - loadingOverlay, cameraVideo, cameraScreen: app.jsで定義されたDOM要素
 * ======================================================================
 */

/**
 * カメラを初期化してライブプレビューを開始
 * 
 * 処理フロー:
 * 1. ローディング表示を開始
 * 2. カメラアクセス権限を要求
 * 3. 高解像度でカメラを起動 (1920x1080理想値)
 * 4. ビデオ要素にストリームを設定
 * 5. カメラ画面を表示
 * 
 * エラー時の動作:
 * - 権限拒否: ユーザーに権限付与を促すメッセージ
 * - カメラ未検出: デバイス接続確認を促すメッセージ
 * - 使用中エラー: 他アプリ終了を促すメッセージ
 * - 解像度エラー: 低解像度で再試行
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initCamera() {
    // ローディングオーバーレイを表示
    loadingOverlay.classList.remove('hidden');
    
    try {
        // カメラアクセスの制約設定
        // facingMode: 'user' = インカメラを使用
        // width/height: 理想解像度と最小解像度を指定
        const constraints = {
            video: {
                facingMode: 'user',        // インカメラを使用（自撮り用）
                width: { ideal: 1920, min: 1280 },  // 幅: 理想1920px, 最小1280px
                height: { ideal: 1080, min: 720 }   // 高さ: 理想1080px, 最小720px
            },
            audio: false  // 音声は不要
        };

        // カメラアクセスを要求
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // ビデオ要素にストリームを設定
        cameraVideo.srcObject = stream;
        
        // ビデオのメタデータ読み込みを待機
        await new Promise((resolve, reject) => {
            // メタデータ読み込み完了時に再生開始
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play()
                    .then(resolve)
                    .catch(reject);
            };
            
            // ビデオエラー時の処理
            cameraVideo.onerror = reject;
            
            // 10秒のタイムアウト設定
            setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
        
        // ローディングを非表示にしてカメラ画面を表示
        loadingOverlay.classList.add('hidden');
        showScreen('camera');
        
    } catch (error) {
        console.error('Camera error:', error);
        
        // エラーメッセージの組み立て
        let errorMessage = 'カメラへのアクセスに失敗しました。\n';
        
        // エラー種別に応じたメッセージを追加
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            // 権限が拒否された場合
            errorMessage += 'カメラの使用を許可してください。\n設定からブラウザのカメラ権限を確認してください。';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            // カメラデバイスが見つからない場合
            errorMessage += 'カメラが見つかりませんでした。\nカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            // カメラが他のアプリで使用中の場合
            errorMessage += 'カメラが他のアプリケーションで使用中です。\n他のアプリを閉じてから再試行してください。';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            // 指定した解像度に対応していない場合
            errorMessage += '指定された解像度が対応していません。\n別の設定で再試行します。';
            
            // 1秒後に低解像度で再試行
            setTimeout(() => initCameraWithFallback(), 1000);
            return;
        } else {
            // その他のエラー
            errorMessage += 'エラー: ' + error.message;
        }
        
        // ローディングを非表示にしてエラー画面を表示
        loadingOverlay.classList.add('hidden');
        showError(errorMessage);
    }
}

/**
 * フォールバック用カメラ初期化
 * 高解像度で失敗した場合に低解像度で再試行
 * 
 * 処理内容:
 * - 解像度を1280x720に下げて再試行
 * - その他の処理は initCamera() と同じ
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initCameraWithFallback() {
    loadingOverlay.classList.remove('hidden');
    
    try {
        // 低解像度の制約設定
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },   // 幅: 1280pxを理想値に
                height: { ideal: 720 }    // 高さ: 720pxを理想値に
            },
            audio: false
        };

        // カメラアクセスを要求
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = stream;
        await cameraVideo.play();
        
        // ローディングを非表示にしてカメラ画面を表示
        loadingOverlay.classList.add('hidden');
        showScreen('camera');
        
    } catch (error) {
        console.error('Fallback camera error:', error);
        loadingOverlay.classList.add('hidden');
        showError('カメラの起動に失敗しました。\nデバイスを再起動してください。');
    }
}

/**
 * カメラストリームを停止
 * アプリケーション終了時やエラー時に呼び出される
 * 
 * 処理内容:
 * - ストリーム内の全トラックを停止
 * - カメラのLEDが消灯する
 */
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}
