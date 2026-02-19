/**
 * ======================================================================
 * 撮影モジュール (capture.js)
 * 写真撮影、Canvas合成、画像ダウンロードを担当
 * 
 * グローバル変数:
 * - cameraVideo, captureBtn, countdown, resultCanvas, frameImage, messageConfig: app.jsで定義
 * ======================================================================
 */

/**
 * カウントダウンを開始して撮影実行
 * 
 * 処理フロー:
 * 1. 撮影ボタンを無効化（連打防止）
 * 2. 3秒間のカウントダウン表示
 * 3. 各秒でアニメーション実行
 * 4. カウント終了後に撮影実行
 * 5. 撮影ボタンを再度有効化
 * 
 * @async
 * @returns {Promise<void>}
 */
async function startCountdown() {
    // 撮影ボタンを無効化（連打防止）
    captureBtn.disabled = true;
    
    // 3, 2, 1 のカウントダウン
    for (let i = 3; i > 0; i--) {
        // カウント数字を表示
        countdown.textContent = i;
        countdown.classList.remove('hidden');
        
        // 1秒待機（アニメーション完了を待つ）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // カウント数字を非表示
        countdown.classList.add('hidden');
    }
    
    // 撮影を実行
    captureImage();
    
    // 撮影ボタンを再度有効化
    captureBtn.disabled = false;
}

/**
 * カメラ映像を撮影してCanvasに合成
 * 
 * 合成レイヤー構成:
 * 1. カメラ映像（反転表示）
 * 2. 装飾フレーム画像
 * 3. 記念日メッセージテキスト
 * 
 * 処理フロー:
 * 1. カメラ映像の準備確認
 * 2. Canvas作成と解像度設定
 * 3. カメラ映像を描画（鏡像反転）
 * 4. フレーム画像を重ね合わせ
 * 5. メッセージテキストを描画
 * 6. 結果画面に表示
 * 
 * @returns {void}
 */
function captureImage() {
    // カメラ映像の準備確認
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
        showError('カメラの映像が準備できていません。\nもう一度お試しください。');
        captureBtn.disabled = false;
        return;
    }
    
    // 作業用Canvasの作成
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { 
        alpha: true,                    // 透明度を有効化
        willReadFrequently: false,      // 読み取り頻度は低い（パフォーマンス最適化）
        desynchronized: false           // 同期描画モード
    });

    // カメラ映像の実解像度を取得
    const videoWidth = cameraVideo.videoWidth;
    const videoHeight = cameraVideo.videoHeight;

    // Canvasサイズをカメラ解像度に設定
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    try {
        // === レイヤー1: カメラ映像の描画 ===
        // 高品質レンダリング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 鏡像反転のための変換行列設定
        ctx.save();
        ctx.scale(-1, 1);  // X軸方向に反転
        
        // カメラ映像を描画（反転位置調整のため -videoWidth）
        ctx.drawImage(cameraVideo, -videoWidth, 0, videoWidth, videoHeight);
        
        // 変換行列をリセット
        ctx.restore();

        // === レイヤー2: フレーム画像の描画 ===
        if (frameImage && frameImage.complete) {
            // フレーム画像を全面に描画
            ctx.drawImage(frameImage, 0, 0, videoWidth, videoHeight);
        }

        // === レイヤー3: メッセージテキストの描画 ===
        // いずれかの項目が有効な場合にメッセージを描画
        const hasAnyMessage = 
            (messageConfig.date.enabled && messageConfig.date.value) ||
            (messageConfig.text.enabled && messageConfig.text.value) ||
            (messageConfig.location.enabled && messageConfig.location.value);
        
        if (hasAnyMessage) {
            drawMessageOnCanvas(ctx, videoWidth, videoHeight);
        }

        // === 結果Canvasにコピー ===
        // 結果表示用Canvasのサイズ設定
        resultCanvas.width = videoWidth;
        resultCanvas.height = videoHeight;
        
        // 結果Canvasのコンテキスト取得
        const resultCtx = resultCanvas.getContext('2d', { 
            alpha: true,
            willReadFrequently: false 
        });
        
        // 高品質レンダリング設定
        resultCtx.imageSmoothingEnabled = true;
        resultCtx.imageSmoothingQuality = 'high';
        
        // 作業用Canvasから結果Canvasにコピー
        resultCtx.drawImage(canvas, 0, 0);

        // 結果画面を表示
        showScreen('result');
        
    } catch (error) {
        console.error('Capture error:', error);
        showError('撮影に失敗しました。\nもう一度お試しください。');
        captureBtn.disabled = false;
    }
}

/**
 * Canvasに記念日メッセージを描画
 * 
 * 描画レイアウト:
 * - メインメッセージ: 画面下部、ゴールドカラー（大きめ）
 * - サブ情報: メッセージ下、ホワイトカラー（日付・場所）
 * 
 * テキストスタイル:
 * - フォント: システムフォント + ヒラギノ
 * - シャドウ: 黒の強いシャドウで視認性確保
 * - サイズ: 画面幅に応じて自動調整
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
 * @param {number} width - Canvas幅
 * @param {number} height - Canvas高さ
 * @returns {void}
 */
function drawMessageOnCanvas(ctx, width, height) {
    // レイアウト計算
    const padding = width * 0.05;                    // 余白: 幅の5%
    const fontSize = Math.max(width * 0.04, 24);     // フォントサイズ: 幅の4%、最小24px
    const lineHeight = fontSize * 1.4;               // 行高: フォントサイズの1.4倍
    
    // 描画設定の保存
    ctx.save();
    
    // === 共通スタイル設定 ===
    ctx.textAlign = 'center';
    
    // テキストシャドウ設定（視認性向上）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // 描画位置: 画面下部から計算
    let yPosition = height - padding;
    
    // 表示される行数をカウント
    let lineCount = 0;
    if (messageConfig.text.enabled && messageConfig.text.value) lineCount++;
    if (messageConfig.date.enabled && messageConfig.date.value) lineCount++;
    if (messageConfig.location.enabled && messageConfig.location.value) lineCount++;
    
    // 開始位置を調整
    yPosition = yPosition - (lineHeight * (lineCount - 1));
    
    // === メインメッセージ描画 ===
    if (messageConfig.text.enabled && messageConfig.text.value) {
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
        ctx.fillStyle = '#FFD700';  // ゴールドカラー
        ctx.fillText(messageConfig.text.value, width / 2, yPosition);
        yPosition += lineHeight;  // 次の行へ
    }
    
    // === 日付描画 ===
    if (messageConfig.date.enabled && messageConfig.date.value) {
        const smallFontSize = fontSize * 0.7;
        ctx.font = `${smallFontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
        ctx.fillStyle = '#FFFFFF';  // ホワイトカラー
        
        const date = new Date(messageConfig.date.value);
        const dateText = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        ctx.fillText(dateText, width / 2, yPosition);
        yPosition += lineHeight * 0.8;  // 次の行へ（少し間隔を詰める）
    }
    
    // === 場所描画 ===
    if (messageConfig.location.enabled && messageConfig.location.value) {
        const smallFontSize = fontSize * 0.7;
        ctx.font = `${smallFontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
        ctx.fillStyle = '#FFFFFF';  // ホワイトカラー
        
        ctx.fillText(messageConfig.location.value, width / 2, yPosition);
    }
    
    // 描画設定を復元
    ctx.restore();
}

/**
 * 撮影した画像をダウンロード保存
 * 
 * ファイル名形式:
 * ShinagawaPrince_{レストラン名}_YYYYMMDD_HHMMSS.png
 * 例: ShinagawaPrince_Hapuna_20260219_143025.png
 * 
 * 処理内容:
 * 1. 現在選択中のレストラン名を取得
 * 2. 現在日時からファイル名生成
 * 3. CanvasをPNG形式に変換（最高品質）
 * 4. ダウンロードリンクを作成してDOMに追加
 * 5. クリックイベントを発火してダウンロード実行
 * 6. リンクをDOMから削除
 * 
 * @returns {void}
 */
function downloadImage() {
    try {
        // Canvasが存在し、描画されているか確認
        if (!resultCanvas || !resultCanvas.width || !resultCanvas.height) {
            console.error('Canvas is not ready');
            alert('画像の準備ができていません。もう一度撮影してください。');
            return;
        }
        
        // ダウンロードリンク要素を作成
        const link = document.createElement('a');
        
        // 現在日時を取得
        const now = new Date();
        
        // 日付文字列の生成（YYYYMMDD形式）
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        
        // 時刻文字列の生成（HHMMSS形式）
        const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
        // 現在選択中のレストラン名を取得
        let restaurantName = 'Photo';
        if (framesConfig && framesConfig.frames) {
            const currentFrame = framesConfig.frames.find(f => f.id === currentFrameId);
            if (currentFrame && currentFrame.name) {
                // レストラン名を英数字に変換（日本語のまま使用）
                restaurantName = currentFrame.name;
            }
        }
        
        // ファイル名を設定（品川プリンスホテル + レストラン名形式）
        link.download = `ShinagawaPrince_${restaurantName}_${dateStr}_${timeStr}.png`;
        
        // CanvasをPNG形式のData URLに変換（品質: 1.0 = 最高品質）
        try {
            link.href = resultCanvas.toDataURL('image/png', 1.0);
        } catch (error) {
            console.error('Canvas to DataURL conversion failed:', error);
            alert('画像の変換に失敗しました。もう一度お試しください。');
            return;
        }
        
        // リンクをDOMに追加（Safari対応）
        document.body.appendChild(link);
        
        // リンクのスタイルを非表示に設定
        link.style.display = 'none';
        
        // ダウンロードを実行
        link.click();
        
        // 少し待ってからDOMから削除
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        console.log('Image download initiated:', link.download);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('画像の保存に失敗しました。\nブラウザの設定でダウンロードを許可してください。');
    }
}

/**
 * 再撮影を開始
 * 結果画面からカメラ画面に戻る
 * 
 * @returns {void}
 */
function retake() {
    showScreen('camera');
}
