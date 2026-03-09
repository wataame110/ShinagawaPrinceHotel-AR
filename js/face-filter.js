/**
 * ======================================================================
 * face-filter.js  – Face AR デコレーション
 *
 * 残デコレーション一覧（15種）
 *   👓 目元    : glasses / heart_eyes / star_eyes / round_glasses /
 *                eyepatch / nerd_glasses
 *   👃 鼻元    : pig_nose / clown_nose
 *   👄 口元    : mustache / lips_red
 *   ✨ アクセ  : monocle / flower_crown / star_stickers /
 *                butterfly_mask / diamond_tiara
 *
 * 廃盤済み（削除）
 *   頭部・帽子 / 動物変身 / 季節・イベント 全種
 *   顔全体カテゴリ全種（panda_face 含む）
 *   口元 の beard（あごひげ）
 *
 * 精度改善ポイント
 *   ① minDetectionConfidence 0.55 で検出しやすく設定
 *   ② バウンディングボックスの最小サイズ・アスペクト比バリデーション
 *   ③ faceLoopGen 世代番号による二重ループ防止
 *   ④ 最大 5 人まで個別に面追跡スムージング（近接マッチング）
 *   ⑤ 被写体人数が増えるほど強度を若干スケールダウン
 * ======================================================================
 */

// ======================================================================
// カテゴリー定義（廃盤カテゴリー除外後）
// ======================================================================

const FACE_DECORATION_CATEGORIES = [
    { id: 'none_cat',   name: 'なし',         icon: '🚫', nameKey: 'cat_none'      },
    { id: 'eyes',       name: '目元',          icon: '👓', nameKey: 'cat_eyes'      },
    { id: 'nose',       name: '鼻元',          icon: '👃', nameKey: 'cat_nose'      },
    { id: 'mouth',      name: '口元',          icon: '👄', nameKey: 'cat_mouth'     },
    { id: 'accessory',  name: 'アクセサリー',  icon: '✨', nameKey: 'cat_accessory' }
];

// ======================================================================
// デコレーション一覧（廃盤除外後 17種 + none）
// ======================================================================

const FACE_DECORATIONS = [
    { id: 'none',           name: 'なし',           icon: '🚫', category: 'none_cat' },

    // ── 目元（6種）─────────────────────────────────────────────
    { id: 'glasses',        name: 'サングラス',      icon: '😎', category: 'eyes' },
    { id: 'heart_eyes',     name: 'ハートアイ',      icon: '😍', category: 'eyes' },
    { id: 'star_eyes',      name: 'スターアイ',      icon: '🌟', category: 'eyes' },
    { id: 'round_glasses',  name: '丸眼鏡',          icon: '🔵', category: 'eyes' },
    { id: 'eyepatch',       name: 'アイパッチ',      icon: '🏴‍☠️', category: 'eyes' },
    { id: 'nerd_glasses',   name: 'ナード眼鏡',      icon: '🤓', category: 'eyes' },

    // ── 鼻元（2種）─────────────────────────────────────────────
    { id: 'pig_nose',       name: '豚鼻',            icon: '🐽', category: 'nose' },
    { id: 'clown_nose',     name: 'ピエロ鼻',        icon: '🔴', category: 'nose' },

    // ── 口元（2種 ※ beard は廃盤）───────────────────────────────
    { id: 'mustache',       name: '口ひげ',          icon: '🥸', category: 'mouth' },
    { id: 'lips_red',       name: '赤リップ',        icon: '💋', category: 'mouth' },

    // ── アクセサリー（5種）──────────────────────────────────────
    { id: 'monocle',        name: '片眼鏡',          icon: '🧐', category: 'accessory' },
    { id: 'flower_crown',   name: '花冠',            icon: '🌺', category: 'accessory' },
    { id: 'star_stickers',  name: 'スター装飾',      icon: '✨', category: 'accessory' },
    { id: 'butterfly_mask', name: 'バタフライマスク', icon: '🦋', category: 'accessory' },
    { id: 'diamond_tiara',  name: 'ダイヤティアラ',  icon: '💎', category: 'accessory' }
];

// ======================================================================
// 状態変数
// ======================================================================

let faceDecorationIntensity = 1.0;
let currentDecorationId     = 'none';
let faceDetector            = null;
let faceDetectorReady       = false;   // initialize() 完了後に true
let faceCanvas              = null;
let faceCtx                 = null;
let faceAnimFrame           = null;
let faceFilterActive        = false;
let faceLoopGen             = 0;       // ループ世代番号（古いループを無効化する）

// ======================================================================
// 複数人対応: 面追跡テーブル
//   SMOOTH_ALPHA_POS:  位置スムージング（低いほど安定、高いほど即応）
//   SMOOTH_ALPHA_SIZE: サイズスムージング（ノイズが多いため位置より緩く）
//   STABLE_NEEDED: 1 = 即座に描画開始（遅延なし）
//   MATCH_DIST: 同一顔と判定する正規化距離の上限
// ======================================================================

const MAX_TRACKED_FACES   = 5;
const SMOOTH_ALPHA_POS    = 0.38;   // 位置: 安定重視（旧 0.55 → ガタつき軽減）
const SMOOTH_ALPHA_SIZE   = 0.25;   // サイズ: さらに緩くしてスケールノイズを抑制
const MATCH_DIST          = 0.30;
const STABLE_NEEDED       = 1;      // 即座に描画（遅延ゼロ）
const FACE_TIMEOUT_FRAMES = 8;
const FACE_MIN_SIZE       = 0.04;
const FACE_MAX_SIZE       = 0.95;
const FACE_MIN_ASPECT     = 0.45;
const FACE_MAX_ASPECT     = 2.20;

let faceStates  = [];
let _nextFaceId = 0;

/** スムージング関数（指数移動平均）
 * @param {object} s     - 追跡状態オブジェクト
 * @param {string} key   - キー名
 * @param {number} v     - 新しい値
 * @param {number} alpha - スムージング係数（省略時は位置用 SMOOTH_ALPHA_POS）
 */
function smoothVal(s, key, v, alpha) {
    const a = (alpha !== undefined) ? alpha : SMOOTH_ALPHA_POS;
    s[key] = (s[key] == null) ? v : s[key] * (1 - a) + v * a;
    return s[key];
}

/** 全追跡状態をリセット */
function resetFaceStates() {
    faceStates = [];
}

/**
 * 現フレームの検出リストと追跡テーブルをマッチング
 * @param {Array} validDets - バリデーション済み検出リスト
 * @returns {Map<number, object>} detectionIndex -> faceState
 */
function matchFaces(validDets) {
    // detectionIndex -> faceState のマップを返す（位置マッチングではなくインデックスで直接参照）
    const detToState = new Map();

    for (const st of faceStates) st.missedFrames++;

    for (let di = 0; di < validDets.length; di++) {
        const { cx, cy } = validDets[di];
        let bestDist = MATCH_DIST;
        let bestState = null;

        for (const st of faceStates) {
            if ([...detToState.values()].includes(st)) continue;
            const d = Math.hypot(cx - st.cx, cy - st.cy);
            if (d < bestDist) { bestDist = d; bestState = st; }
        }

        if (bestState) {
            bestState.cx = cx;
            bestState.cy = cy;
            bestState.missedFrames = 0;
            bestState.stableCount  = Math.min(bestState.stableCount + 1, STABLE_NEEDED + 2);
            detToState.set(di, bestState);
        } else if (faceStates.length < MAX_TRACKED_FACES) {
            const newSt = { id: _nextFaceId++, cx, cy, s: {}, stableCount: 1, missedFrames: 0 };
            faceStates.push(newSt);
            detToState.set(di, newSt);
        }
    }

    faceStates = faceStates.filter(st => st.missedFrames < FACE_TIMEOUT_FRAMES);

    return detToState;
}

// ======================================================================
// 顔検出ループ
// ======================================================================

function startFaceLoop(gen) {
    // 初期化未完了・非アクティブ・世代が古い場合は即終了
    if (!faceDetectorReady || !faceFilterActive || gen !== faceLoopGen) return;
    faceAnimFrame = requestAnimationFrame(async () => {
        // 非同期処理中に世代が変わっていたらここで止める（二重ループ防止）
        if (gen !== faceLoopGen || !faceFilterActive) return;
        if (cameraVideo && cameraVideo.readyState >= 2) {
            syncFaceCanvas();
            try { await faceDetector.send({ image: cameraVideo }); } catch (_) {}
        }
        // await 後も再チェック（stopFaceLoop が呼ばれた可能性があるため）
        if (faceFilterActive && gen === faceLoopGen) startFaceLoop(gen);
    });
}

function stopFaceLoop() {
    faceLoopGen++;             // 世代を上げて実行中の async コールバックを無効化
    faceFilterActive = false;
    if (faceAnimFrame) { cancelAnimationFrame(faceAnimFrame); faceAnimFrame = null; }
    if (faceCtx && faceCanvas) faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    resetFaceStates();
}

/** faceCanvas をビデオコンテナの CSS ピクセルに同期 */
function syncFaceCanvas() {
    if (!faceCanvas) return;
    const container = faceCanvas.parentElement;
    const cw = container ? container.clientWidth  : 0;
    const ch = container ? container.clientHeight : 0;
    if (!cw || !ch) return;
    if (faceCanvas.width !== cw || faceCanvas.height !== ch) {
        faceCanvas.width  = cw;
        faceCanvas.height = ch;
    }
}

/** object-fit:cover 時のスケール・オフセットを計算 */
function getObjectFitCoverOffset() {
    if (!cameraVideo || !cameraVideo.videoWidth) return null;
    const container = faceCanvas ? faceCanvas.parentElement : null;
    if (!container) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return null;
    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    const scale = Math.max(cw / vw, ch / vh);
    return { scale, offsetX: Math.max(0, (vw * scale - cw) / 2),
             offsetY: Math.max(0, (vh * scale - ch) / 2), vw, vh, cw, ch };
}

// ======================================================================
// 検出結果コールバック
// ======================================================================

function onFaceResults(results) {
    if (!faceCtx || !faceCanvas) return;
    faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    if (!results.detections || results.detections.length === 0) {
        resetFaceStates();
        return;
    }
    if (currentDecorationId === 'none') return;

    const W = faceCanvas.width;
    const H = faceCanvas.height;
    const isFlipped = (currentFacingMode === 'user');

    const disp = getObjectFitCoverOffset();
    if (!disp) return;
    const { scale, offsetX, offsetY, vw, vh } = disp;

    // 正規化座標 → 表示ピクセル ヘルパー
    const tdx = nx => nx * vw * scale - offsetX;
    const tdy = ny => ny * vh * scale - offsetY;
    const tdw = nw => nw * vw * scale;
    const tdh = nh => nh * vh * scale;

    // ── バリデーション：不正な検出を除外 ─────────────────────────
    const validDets = results.detections.filter(det => {
        const box = det.boundingBox;
        const w = box.width, h = box.height;
        // サイズチェック（正規化）
        if (w < FACE_MIN_SIZE || w > FACE_MAX_SIZE) return false;
        if (h < FACE_MIN_SIZE || h > FACE_MAX_SIZE) return false;
        // アスペクト比チェック（顔らしい形状のみ）
        const aspect = w / h;
        if (aspect < FACE_MIN_ASPECT || aspect > FACE_MAX_ASPECT) return false;
        return true;
    }).map(det => ({
        det,
        cx: det.boundingBox.xCenter,
        cy: det.boundingBox.yCenter
    }));

    if (validDets.length === 0) { resetFaceStates(); return; }

    // ── 面追跡マッチング ──────────────────────────────────────
    const detToState = matchFaces(validDets);

    // ── 人数に応じた強度スケーリング ─────────────────────────
    const faceCount   = validDets.length;
    const countScale  = faceCount === 1 ? 1.0
                      : faceCount === 2 ? 0.90
                      : 0.80;
    const baseIntensity = faceDecorationIntensity * countScale;

    // ── 各顔を描画（インデックスで det を直接参照） ───────────
    for (const [di, st] of detToState) {
        if (st.stableCount < STABLE_NEEDED) continue;

        const { det } = validDets[di];
        if (!det) continue;

        const box = det.boundingBox;
        const lm  = det.landmarks;

        // 表示座標に変換
        const rBx = tdx(box.xCenter);
        const rBy = tdy(box.yCenter);
        const rBw = tdw(box.width);
        const rBh = tdh(box.height);

        const rRex = lm ? tdx(lm[0].x) : rBx - rBw * 0.20;
        const rRey = lm ? tdy(lm[0].y) : rBy - rBh * 0.10;
        const rLex = lm ? tdx(lm[1].x) : rBx + rBw * 0.20;
        const rLey = lm ? tdy(lm[1].y) : rBy - rBh * 0.10;
        const rNx  = lm ? tdx(lm[2].x) : rBx;
        const rNy  = lm ? tdy(lm[2].y) : rBy + rBh * 0.07;
        const rMx  = lm ? tdx(lm[3].x) : rBx;
        const rMy  = lm ? tdy(lm[3].y) : rBy + rBh * 0.28;

        // 個別スムージング（サイズは位置より緩めのアルファで安定させる）
        const s   = st.s;
        const bx  = smoothVal(s, 'bx', rBx);
        const by  = smoothVal(s, 'by', rBy);
        const bw  = smoothVal(s, 'bw', rBw, SMOOTH_ALPHA_SIZE);
        const bh  = smoothVal(s, 'bh', rBh, SMOOTH_ALPHA_SIZE);
        const rex = smoothVal(s, 'rex', rRex);
        const rey = smoothVal(s, 'rey', rRey);
        const lex = smoothVal(s, 'lex', rLex);
        const ley = smoothVal(s, 'ley', rLey);
        const nx  = smoothVal(s, 'nx', rNx);
        const ny  = smoothVal(s, 'ny', rNy);
        const mx  = smoothVal(s, 'mx', rMx);
        const my  = smoothVal(s, 'my', rMy);

        // 派生座標
        const faceTop   = by - bh * 0.5;
        const faceBot   = by + bh * 0.5;
        const faceLeft  = bx - bw * 0.5;
        const faceRight = bx + bw * 0.5;
        const eyeMidX   = (rex + lex) / 2;
        const eyeMidY   = (rey + ley) / 2;
        const eyeSep    = Math.abs(rex - lex);

        faceCtx.save();
        if (isFlipped) { faceCtx.translate(W, 0); faceCtx.scale(-1, 1); }

        drawDecoration(faceCtx, currentDecorationId, {
            bx, by, bw, bh,
            rex, rey, lex, ley,
            nx, ny, mx, my,
            eyeMidX, eyeMidY, eyeSep,
            faceTop, faceBot, faceLeft, faceRight,
            W, H
        }, baseIntensity);

        faceCtx.restore();
    }
}

// ======================================================================
// Canvas 合成（captureImage から呼ばれる）
// ======================================================================

function drawFaceFilterOnCanvas(ctx, w, h) {
    if (!faceCanvas || currentDecorationId === 'none') return;
    ctx.drawImage(faceCanvas, 0, 0, w, h);
}

// ======================================================================
// ヘルパー描画関数
// ======================================================================

function drawStar(ctx, x, y, r, color) {
    const spikes = 5, outer = r, inner = r * 0.42;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const dist  = i % 2 === 0 ? outer : inner;
        i === 0 ? ctx.moveTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist)
                : ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// ======================================================================
// デコレーション描画ルーター
// ======================================================================

function drawDecoration(ctx, id, coords, intensity) {
    const {
        bx, by, bw, bh,
        rex, rey, lex, ley,
        nx, ny, mx, my,
        eyeMidX, eyeMidY, eyeSep,
        faceTop, faceBot, faceLeft, faceRight,
        W, H
    } = coords;

    ctx.globalAlpha = Math.max(0, Math.min(1, intensity));

    switch (id) {

        // ── 目元 ──────────────────────────────────────────────────

        case 'glasses': {
            const gR = eyeSep * 0.36;
            const gY = eyeMidY;
            ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = bw * 0.03;
            ctx.fillStyle = 'rgba(20,20,20,0.52)';
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.arc(ex, gY, gR, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
            });
            // ブリッジ
            ctx.beginPath(); ctx.moveTo(rex + gR, gY); ctx.lineTo(lex - gR, gY); ctx.stroke();
            // テンプル
            ctx.beginPath(); ctx.moveTo(rex - gR, gY); ctx.lineTo(faceLeft - bw * 0.07, gY + bh * 0.04); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + gR, gY); ctx.lineTo(faceRight + bw * 0.07, gY + bh * 0.04); ctx.stroke();
            // ハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.ellipse(ex - gR * 0.3, gY - gR * 0.3, gR * 0.24, gR * 0.16, -0.5, 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }

        case 'heart_eyes': {
            const hR = eyeSep * 0.32;
            const hY = eyeMidY;
            [[rex, hY], [lex, hY]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#FF1744';
                ctx.beginPath();
                ctx.moveTo(ex, ey + hR * 0.5);
                ctx.bezierCurveTo(ex - hR, ey - hR * 0.6, ex - hR * 1.4, ey + hR * 0.3, ex, ey + hR * 1.4);
                ctx.bezierCurveTo(ex + hR * 1.4, ey + hR * 0.3, ex + hR, ey - hR * 0.6, ex, ey + hR * 0.5);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.28)';
                ctx.beginPath(); ctx.ellipse(ex - hR * 0.32, ey + hR * 0.22, hR * 0.22, hR * 0.15, -0.4, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'star_eyes': {
            const sR = eyeSep * 0.28;
            const sY = eyeMidY;
            [[rex, sY, '#FFD700'], [lex, sY, '#FFD700']].forEach(([ex, ey, col]) => {
                drawStar(ctx, ex, ey, sR, col);
                ctx.strokeStyle = '#FF8800'; ctx.lineWidth = bw * 0.012; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.arc(ex - sR * 0.28, ey - sR * 0.28, sR * 0.18, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'round_glasses': {
            const rgR = eyeSep * 0.33;
            const rgY = eyeMidY;
            ctx.strokeStyle = '#A06820'; ctx.lineWidth = bw * 0.025;
            ctx.fillStyle = 'rgba(160, 230, 255, 0.22)';
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.arc(ex, rgY, rgR, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(rex + rgR, rgY); ctx.lineTo(lex - rgR, rgY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rex - rgR, rgY); ctx.lineTo(faceLeft - bw * 0.06, rgY + bh * 0.04); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + rgR, rgY); ctx.lineTo(faceRight + bw * 0.06, rgY + bh * 0.04); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.ellipse(ex - rgR * 0.28, rgY - rgR * 0.28, rgR * 0.22, rgR * 0.14, -0.5, 0, Math.PI * 2);
                ctx.fill();
            });
            break;
        }

        case 'eyepatch': {
            const epR = eyeSep * 0.40;
            const epY = rex < lex ? rey : ley;    // 右目（画面上の左）に装着
            const epX = rex < lex ? rex : lex;
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.arc(epX, epY, epR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = bw * 0.022; ctx.stroke();
            // バンド
            ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = bw * 0.025;
            ctx.beginPath();
            ctx.moveTo(epX - epR, epY - epR * 0.2);
            ctx.lineTo(faceLeft - bw * 0.1, epY - epR * 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(epX + epR, epY - epR * 0.2);
            ctx.lineTo(faceRight + bw * 0.1, epY - epR * 0.1);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.ellipse(epX - epR * 0.28, epY - epR * 0.28, epR * 0.22, epR * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'nerd_glasses': {
            const ngR = eyeSep * 0.34;
            const ngY = eyeMidY;
            ctx.strokeStyle = '#2244AA'; ctx.lineWidth = bw * 0.028;
            ctx.fillStyle = 'rgba(200,230,255,0.22)';
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.rect(ex - ngR, ngY - ngR * 0.7, ngR * 2, ngR * 1.4);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath(); ctx.ellipse(ex - ngR * 0.3, ngY - ngR * 0.2, ngR * 0.22, ngR * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(200,230,255,0.22)';
            });
            ctx.strokeStyle = '#2244AA';
            ctx.beginPath(); ctx.moveTo(rex + ngR, ngY); ctx.lineTo(lex - ngR, ngY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rex - ngR, ngY); ctx.lineTo(faceLeft - bw * 0.06, ngY + bh * 0.04); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + ngR, ngY); ctx.lineTo(faceRight + bw * 0.06, ngY + bh * 0.04); ctx.stroke();
            break;
        }

        // ── 鼻元 ──────────────────────────────────────────────────

        case 'pig_nose': {
            const pnR = bw * 0.13;
            ctx.fillStyle = '#FF8DA0';
            ctx.beginPath(); ctx.ellipse(nx, ny + pnR * 0.1, pnR, pnR * 0.72, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FF6070'; ctx.lineWidth = bw * 0.018; ctx.stroke();
            // 鼻孔
            ctx.fillStyle = 'rgba(120,40,60,0.72)';
            [[-pnR * 0.36, pnR * 0.08], [pnR * 0.36, pnR * 0.08]].forEach(([ox, oy]) => {
                ctx.beginPath(); ctx.ellipse(nx + ox, ny + oy, pnR * 0.22, pnR * 0.18, 0, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.beginPath(); ctx.ellipse(nx - pnR * 0.3, ny - pnR * 0.22, pnR * 0.2, pnR * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'clown_nose': {
            const cnR = bw * 0.11;
            const grad = ctx.createRadialGradient(nx - cnR * 0.3, ny - cnR * 0.3, 0, nx, ny, cnR);
            grad.addColorStop(0, '#FF3030'); grad.addColorStop(1, '#CC0000');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(nx, ny, cnR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.32)';
            ctx.beginPath(); ctx.ellipse(nx - cnR * 0.3, ny - cnR * 0.3, cnR * 0.28, cnR * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ── 口元 ──────────────────────────────────────────────────

        case 'mustache': {
            const muW = bw * 0.38, muH = bh * 0.08;
            const muY = my - bh * 0.06;
            ctx.fillStyle = '#2A1A0A';
            ctx.beginPath();
            ctx.moveTo(mx, muY);
            ctx.bezierCurveTo(mx - muW * 0.10, muY - muH,        mx - muW * 0.50, muY - muH * 0.80, mx - muW * 0.52, muY + muH * 0.30);
            ctx.bezierCurveTo(mx - muW * 0.40, muY + muH * 1.20, mx - muW * 0.12, muY + muH * 0.50, mx,             muY + muH * 0.30);
            ctx.bezierCurveTo(mx + muW * 0.12, muY + muH * 0.50, mx + muW * 0.40, muY + muH * 1.20, mx + muW * 0.52, muY + muH * 0.30);
            ctx.bezierCurveTo(mx + muW * 0.50, muY - muH * 0.80, mx + muW * 0.10, muY - muH,        mx,             muY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.ellipse(mx - muW * 0.20, muY - muH * 0.10, muW * 0.14, muH * 0.28, 0.3, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'lips_red': {
            const lpW = bw * 0.22, lpH = bh * 0.072;
            ctx.fillStyle = '#C00020';
            ctx.beginPath();
            ctx.moveTo(mx - lpW, my - lpH * 0.10);
            ctx.bezierCurveTo(mx - lpW * 0.60, my - lpH * 1.20, mx - lpW * 0.20, my - lpH * 1.60, mx,             my - lpH * 1.20);
            ctx.bezierCurveTo(mx + lpW * 0.20, my - lpH * 1.60, mx + lpW * 0.60, my - lpH * 1.20, mx + lpW,       my - lpH * 0.10);
            ctx.bezierCurveTo(mx + lpW * 0.40, my + lpH * 0.10, mx - lpW * 0.40, my + lpH * 0.10, mx - lpW,       my - lpH * 0.10);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#E0003A';
            ctx.beginPath();
            ctx.moveTo(mx - lpW, my);
            ctx.bezierCurveTo(mx - lpW * 0.50, my + lpH * 1.80, mx + lpW * 0.50, my + lpH * 1.80, mx + lpW,       my);
            ctx.bezierCurveTo(mx + lpW * 0.40, my + lpH * 0.10, mx - lpW * 0.40, my + lpH * 0.10, mx - lpW,       my);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,200,0.28)';
            ctx.beginPath(); ctx.ellipse(mx, my + lpH * 1.0, lpW * 0.38, lpH * 0.36, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ── アクセサリー ──────────────────────────────────────────

        case 'monocle': {
            const moR = eyeSep * 0.36;
            ctx.strokeStyle = '#C8A83C'; ctx.lineWidth = bw * 0.03;
            ctx.fillStyle = 'rgba(200,230,200,0.18)';
            ctx.beginPath(); ctx.arc(rex, eyeMidY, moR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#B8962A'; ctx.lineWidth = bw * 0.014;
            ctx.setLineDash([bw * 0.02, bw * 0.012]);
            ctx.beginPath(); ctx.moveTo(rex + moR, eyeMidY + moR * 0.2);
            ctx.quadraticCurveTo(rex + moR * 1.6, by + bh * 0.2, faceRight + bw * 0.06, by + bh * 0.3); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.ellipse(rex - moR * 0.3, eyeMidY - moR * 0.3, moR * 0.22, moR * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'flower_crown': {
            const fcY = faceTop - bh * 0.04;
            const colors6 = ['#FF6B9E', '#FF9A3C', '#FFD700', '#6BD96B', '#6BAAFF', '#D06BFF'];
            for (let i = 0; i < 9; i++) {
                const t = i / 8;
                const fx = faceLeft - bw * 0.04 + (bw * 1.08) * t;
                const fy = fcY + Math.sin(t * Math.PI) * bh * 0.06;
                const fr = bw * 0.06 + Math.sin(t * Math.PI) * bw * 0.01;
                const clr = colors6[i % colors6.length];
                for (let p = 0; p < 5; p++) {
                    const a = (p / 5) * Math.PI * 2;
                    ctx.fillStyle = clr;
                    ctx.beginPath();
                    ctx.ellipse(fx + Math.cos(a) * fr * 0.7, fy + Math.sin(a) * fr * 0.7,
                                fr * 0.45, fr * 0.28, a, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#FFD700';
                ctx.beginPath(); ctx.arc(fx, fy, fr * 0.3, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }

        case 'star_stickers': {
            const stars6 = [
                [rex - bw * 0.30, rey - bh * 0.28, '#FFD700', bw * 0.07],
                [lex + bw * 0.30, ley - bh * 0.28, '#FFD700', bw * 0.07],
                [bx - bw * 0.52, by,                '#FF88FF', bw * 0.055],
                [bx + bw * 0.52, by,                '#FF88FF', bw * 0.055],
                [bx, faceTop - bh * 0.18,           '#44DDFF', bw * 0.06],
                [bx - bw * 0.26, faceTop - bh * 0.3,'#FF8800', bw * 0.045],
                [bx + bw * 0.24, faceTop - bh * 0.3,'#FF8800', bw * 0.045]
            ];
            stars6.forEach(([sx, sy, sc, sr]) => {
                drawStar(ctx, sx, sy, sr, sc);
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = bw * 0.014;
                for (let i = 0; i < 4; i++) {
                    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(sx + Math.cos(a) * sr * 0.6, sy + Math.sin(a) * sr * 0.6);
                    ctx.lineTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3);
                    ctx.stroke();
                }
            });
            break;
        }

        case 'butterfly_mask': {
            const bmSpanX = bw * 0.54, bmH = bh * 0.22;
            const bmY = eyeMidY - bmH * 0.2;
            const drawWing = (wx, dir) => {
                const g = ctx.createLinearGradient(wx, bmY - bmH, wx + dir * bmSpanX * 0.5, bmY + bmH);
                g.addColorStop(0, 'rgba(100,20,160,0.82)');
                g.addColorStop(0.5, 'rgba(180,60,220,0.78)');
                g.addColorStop(1, 'rgba(60,0,120,0.65)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(wx, bmY);
                ctx.bezierCurveTo(wx + dir * bmSpanX * 0.08, bmY - bmH * 0.6,
                                  wx + dir * bmSpanX * 0.50, bmY - bmH,
                                  wx + dir * bmSpanX * 0.55, bmY - bmH * 0.14);
                ctx.bezierCurveTo(wx + dir * bmSpanX * 0.48, bmY + bmH * 0.5,
                                  wx + dir * bmSpanX * 0.22, bmY + bmH,
                                  wx, bmY);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(200,100,255,0.6)'; ctx.lineWidth = bw * 0.016; ctx.stroke();
                ctx.strokeStyle = 'rgba(255,200,255,0.45)'; ctx.lineWidth = bw * 0.01;
                ctx.beginPath(); ctx.ellipse(wx + dir * bmSpanX * 0.28, bmY - bmH * 0.18,
                    bmSpanX * 0.11, bmH * 0.28, dir * 0.3, 0, Math.PI * 2); ctx.stroke();
            };
            drawWing(bx, -1); drawWing(bx, 1);
            ctx.fillStyle = 'rgba(80,10,130,0.88)';
            ctx.beginPath(); ctx.ellipse(bx, bmY, eyeSep * 0.26, bmH * 0.28, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'diamond_tiara': {
            const dtY = faceTop - bh * 0.02;
            const dtW = bw * 0.82;
            const bandGrad = ctx.createLinearGradient(bx - dtW / 2, dtY, bx + dtW / 2, dtY);
            bandGrad.addColorStop(0, '#B8860B'); bandGrad.addColorStop(0.5, '#FFD700'); bandGrad.addColorStop(1, '#B8860B');
            ctx.fillStyle = bandGrad;
            ctx.beginPath(); ctx.rect(bx - dtW / 2, dtY - bh * 0.03, dtW, bh * 0.06); ctx.fill();
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = bw * 0.012; ctx.stroke();
            const drawDiamond = (dx, dy, dw, dh) => {
                ctx.fillStyle = '#B0E8FF';
                ctx.beginPath(); ctx.moveTo(dx, dy - dh); ctx.lineTo(dx + dw, dy);
                ctx.lineTo(dx, dy + dh * 0.6); ctx.lineTo(dx - dw, dy); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#88CCFF'; ctx.lineWidth = bw * 0.012; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath(); ctx.moveTo(dx - dw * 0.4, dy - dh * 0.5);
                ctx.lineTo(dx, dy - dh); ctx.lineTo(dx + dw * 0.4, dy - dh * 0.5);
                ctx.closePath(); ctx.fill();
            };
            drawDiamond(bx,                  dtY - bh * 0.10, bw * 0.08, bh * 0.14);
            drawDiamond(bx - bw * 0.25,      dtY - bh * 0.04, bw * 0.05, bh * 0.08);
            drawDiamond(bx + bw * 0.25,      dtY - bh * 0.04, bw * 0.05, bh * 0.08);
            drawDiamond(bx - bw * 0.38,      dtY,             bw * 0.035,bh * 0.06);
            drawDiamond(bx + bw * 0.38,      dtY,             bw * 0.035,bh * 0.06);
            // ゴールドドット
            ctx.fillStyle = '#FFD700';
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath(); ctx.arc(bx + (dtW * 0.12) * i, dtY, bw * 0.018, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }

        default: break;
    }

    ctx.globalAlpha = 1.0;
}

// ======================================================================
// 初期化
// ======================================================================

async function initFaceFilter() {
    faceCanvas = document.getElementById('face-filter-canvas');
    if (!faceCanvas) return;
    faceCtx = faceCanvas.getContext('2d');

    // 二重初期化防止（初期化完了済みの場合は即返す）
    if (faceDetectorReady) return;
    // 初期化中（faceDetector は設定済みだが未完了）の場合も重複防止
    if (faceDetector) return;

    if (typeof FaceDetection === 'undefined') {
        console.warn('MediaPipe FaceDetection not loaded. Face filters unavailable.');
        return;
    }
    try {
        faceDetector = new FaceDetection({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${f}`
        });
        faceDetector.setOptions({ model: 'short', minDetectionConfidence: 0.55 });
        faceDetector.onResults(onFaceResults);
        await faceDetector.initialize();
        faceDetectorReady = true;   // ← 完全初期化完了マーク
        console.log('FaceDetection initialized');
    } catch (err) {
        console.error('FaceDetection init error:', err);
        faceDetector = null;        // 失敗時はリセットして再試行を許可
        faceDetectorReady = false;
    }
}

// ======================================================================
// Face AR UI ビルダー
// ======================================================================

function buildFaceFilterUI() {
    const container = document.getElementById('face-filter-list');
    if (!container) return;
    container.innerHTML = '';

    // i18n ヘルパー（グローバル t() があれば使用）
    const _t = (key, fallback) => (typeof t === 'function') ? t(key) : fallback;

    // 強度スライダー
    const intensityRow = document.createElement('div');
    intensityRow.className = 'filter-intensity-row';
    intensityRow.innerHTML = `
        <div class="filter-intensity-label">
            <span>${_t('intensity_label', '強度')}</span>
            <span id="face-intensity-val">100%</span>
        </div>
        <input type="range" id="face-intensity-slider" class="filter-intensity-slider"
               min="0" max="100" value="100">
    `;
    container.appendChild(intensityRow);

    const slider  = intensityRow.querySelector('#face-intensity-slider');
    const valSpan = intensityRow.querySelector('#face-intensity-val');
    slider.addEventListener('input', () => {
        faceDecorationIntensity = parseInt(slider.value) / 100;
        valSpan.textContent = slider.value + '%';
    });

    // カテゴリーごとにグループ化してグリッド表示
    FACE_DECORATION_CATEGORIES.forEach(cat => {
        const items = FACE_DECORATIONS.filter(d => d.category === cat.id);
        if (items.length === 0) return;

        // 「なし」以外はカテゴリーヘッダーを表示
        if (cat.id !== 'none_cat') {
            const hdr = document.createElement('div');
            hdr.className = 'face-filter-cat-header';
            const catLabel = cat.nameKey ? _t(cat.nameKey, cat.name) : cat.name;
            hdr.textContent = `${cat.icon} ${catLabel}`;
            container.appendChild(hdr);
        }

        // アイテムをグリッドコンテナに収める
        const grid = document.createElement('div');
        grid.className = 'face-filter-cat-grid';

        items.forEach(deco => {
            const btn = document.createElement('button');
            btn.className = 'face-filter-btn' +
                            (deco.id === currentDecorationId ? ' active' : '');
            btn.dataset.id = deco.id;
            btn.innerHTML = `<span class="face-filter-icon">${deco.icon}</span>
                             <span class="face-filter-label">${deco.name}</span>`;
            btn.addEventListener('click', () => selectFaceDecoration(deco.id));
            grid.appendChild(btn);
        });

        container.appendChild(grid);
    });
}

/** デコレーションを選択して即時適用 */
function selectFaceDecoration(id) {
    currentDecorationId = id;

    // ボタンのアクティブ状態更新
    document.querySelectorAll('.face-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.id === id);
    });

    if (id === 'none') {
        stopFaceLoop();
        if (faceCtx && faceCanvas) {
            faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        }
        return;
    }

    // 世代を上げることで、既存の async ループを確実に無効化（二重ループ防止）
    faceLoopGen++;
    const myGen = faceLoopGen;

    if (faceAnimFrame) { cancelAnimationFrame(faceAnimFrame); faceAnimFrame = null; }
    faceFilterActive = true;
    resetFaceStates();

    if (faceDetectorReady) {
        startFaceLoop(myGen);
    } else {
        initFaceFilter().then(() => {
            if (faceFilterActive && faceDetectorReady && myGen === faceLoopGen) {
                startFaceLoop(myGen);
            }
        });
    }
}

/** 現在適用中のデコレーション ID を返す（外部参照用） */
function getCurrentDecorationId() { return currentDecorationId; }
