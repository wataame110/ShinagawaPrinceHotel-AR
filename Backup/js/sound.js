/**
 * ======================================================================
 * 撮影音モジュール (sound.js)
 * Web Audio API でシャッター音を生成・再生する
 *
 * 注意: iOS のマナーモード（サイレントスイッチ ON）ではシステム制限により
 * ブラウザから音を鳴らすことは不可能です。
 * マナーモードが OFF の状態では必ず再生されます。
 * ======================================================================
 */

let _audioCtx = null;
let _audioReady = false;

/**
 * AudioContext を初期化する
 * ユーザーの最初のタッチ/クリック時に必ず呼び出すこと（iOS セキュリティ制限）
 */
function initAudioContext() {
    if (_audioCtx) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        _audioCtx = new AC();
        _audioReady = true;
    } catch (e) {
        console.warn('AudioContext init failed:', e);
    }
}

/**
 * シャッター音を再生する
 * 「カシャ」に近い短い機械音を Web Audio API で合成
 */
function playShutterSound() {
    if (!_audioReady || !_audioCtx) return;

    try {
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }

        const now = _audioCtx.currentTime;

        // --- 高音クリック（シャッター幕の衝突音） ---
        const click = _audioCtx.createOscillator();
        const clickGain = _audioCtx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(3000, now);
        click.frequency.exponentialRampToValueAtTime(800, now + 0.04);
        clickGain.gain.setValueAtTime(0.6, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        click.connect(clickGain);
        clickGain.connect(_audioCtx.destination);
        click.start(now);
        click.stop(now + 0.08);

        // --- 低音ボディ（カメラボディの鳴り） ---
        const body = _audioCtx.createOscillator();
        const bodyGain = _audioCtx.createGain();
        body.type = 'sine';
        body.frequency.setValueAtTime(220, now + 0.02);
        body.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        bodyGain.gain.setValueAtTime(0.3, now + 0.02);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        body.connect(bodyGain);
        bodyGain.connect(_audioCtx.destination);
        body.start(now + 0.02);
        body.stop(now + 0.14);

    } catch (e) {
        console.warn('Shutter sound error:', e);
    }
}
