/**
 * ======================================================================
 * 顔 AR フィルターモジュール (face-filter.js)
 * MediaPipe Face Detection で顔を検出し、装飾を Canvas に描画する
 *
 * 装飾 29 種（既存 9 + 新規 20）をカテゴリーごとに管理
 * ・頭部・帽子 8 種 / 目元 5 種 / 鼻元 2 種 / 顔全体 8 種 / 動物変身 5 種
 *
 * 精度向上施策
 * ・座標スムージング（指数移動平均）でジッター抑制
 * ・ランドマーク 6 点（右目・左目・鼻・口・右耳・左耳）を活用した精密配置
 * ・faceTop / faceBot / eyeSep など派生座標をすべて事前計算
 * ======================================================================
 */

// ======================================================================
// 装飾定義（カテゴリー付き）
// ======================================================================

const FACE_DECORATION_CATEGORIES = [
    { id: 'none_cat', name: 'なし',      icon: '✕' },
    { id: 'head',     name: '頭部・帽子', icon: '👑' },
    { id: 'eyes',     name: '目元',       icon: '👁' },
    { id: 'nose',     name: '鼻元',       icon: '👃' },
    { id: 'face',     name: '顔全体',     icon: '🎭' },
    { id: 'animal',   name: '動物変身',   icon: '🐾' }
];

const FACE_DECORATIONS = [
    // ── なし ──────────────────────────────
    { id: 'none',          name: 'なし',        icon: '✕',  category: 'none_cat' },

    // ── 頭部・帽子 ────────────────────────
    { id: 'crown',         name: 'クラウン',     icon: '👑', category: 'head' },
    { id: 'santa',         name: 'サンタ帽',     icon: '🎅', category: 'head' },
    { id: 'headband',      name: 'カチューシャ', icon: '🎀', category: 'head' },
    { id: 'horns',         name: '悪魔の角',     icon: '😈', category: 'head' },
    { id: 'ninja',         name: '忍者ハチマキ', icon: '🥷', category: 'head' },
    { id: 'halo',          name: '天使の輪',     icon: '😇', category: 'head' },
    { id: 'witch_hat',     name: '魔女の帽子',   icon: '🧙', category: 'head' },
    { id: 'ribbon_bow',    name: '大リボン',     icon: '🎀', category: 'head' },

    // ── 目元 ────────────────────────────
    { id: 'glasses',       name: 'サングラス',   icon: '🕶', category: 'eyes' },
    { id: 'heart_eyes',    name: 'ハート目',     icon: '😍', category: 'eyes' },
    { id: 'star_eyes',     name: 'スター目',     icon: '⭐', category: 'eyes' },
    { id: 'round_glasses', name: '丸眼鏡',       icon: '👓', category: 'eyes' },
    { id: 'eyepatch',      name: 'アイパッチ',   icon: '🏴', category: 'eyes' },

    // ── 鼻元 ────────────────────────────
    { id: 'pig_nose',      name: '豚鼻',         icon: '🐽', category: 'nose' },
    { id: 'clown_nose',    name: 'ピエロの鼻',   icon: '🤡', category: 'nose' },

    // ── 顔全体 ──────────────────────────
    { id: 'kabuki',        name: '歌舞伎メイク', icon: '🎭', category: 'face' },
    { id: 'maiko',         name: '舞妓メイク',   icon: '💮', category: 'face' },
    { id: 'oiran',         name: '花魁メイク',   icon: '🌸', category: 'face' },
    { id: 'clown_face',    name: 'ピエロ',       icon: '🤡', category: 'face' },
    { id: 'panda_face',    name: 'パンダ',       icon: '🐼', category: 'face' },
    { id: 'tiger_face',    name: 'トラ',         icon: '🐯', category: 'face' },
    { id: 'zombie',        name: 'ゾンビ',       icon: '🧟', category: 'face' },
    { id: 'oni',           name: '鬼メイク',     icon: '👹', category: 'face' },

    // ── 動物変身 ────────────────────────
    { id: 'cat_ears',      name: '猫耳',         icon: '🐱', category: 'animal' },
    { id: 'rabbit_ears',   name: 'ウサギ耳',     icon: '🐰', category: 'animal' },
    { id: 'dog_ears',      name: '犬耳',         icon: '🐶', category: 'animal' },
    { id: 'bear_ears',     name: 'クマ耳',       icon: '🐻', category: 'animal' },
    { id: 'fox_ears',      name: 'キツネ耳',     icon: '🦊', category: 'animal' }
];

let currentDecorationId = 'none';
let faceDetector        = null;
let faceCanvas          = null;
let faceCtx             = null;
let faceAnimFrame       = null;
let faceFilterActive    = false;

// ======================================================================
// 座標スムージング（指数移動平均）
// α が大きいほど最新値への追従が速い（ジッター大）
// α が小さいほど滑らか（追従遅い）
// ======================================================================

const SMOOTH_ALPHA = 0.38;
const _s = {}; // smoothing state

function smoothVal(key, v) {
    _s[key] = (_s[key] == null) ? v : _s[key] * (1 - SMOOTH_ALPHA) + v * SMOOTH_ALPHA;
    return _s[key];
}
function resetSmoothing() { Object.keys(_s).forEach(k => { _s[k] = null; }); }

// ======================================================================
// 初期化
// ======================================================================

async function initFaceFilter() {
    faceCanvas = document.getElementById('face-filter-canvas');
    if (!faceCanvas) return;
    faceCtx = faceCanvas.getContext('2d');

    if (typeof FaceDetection === 'undefined') {
        console.warn('MediaPipe FaceDetection not loaded. Face filters unavailable.');
        return;
    }
    try {
        faceDetector = new FaceDetection({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${f}`
        });
        faceDetector.setOptions({ model: 'short', minDetectionConfidence: 0.65 });
        faceDetector.onResults(onFaceResults);
        await faceDetector.initialize();
        console.log('Face filter ready');
    } catch (e) {
        console.warn('Face filter init error:', e);
        faceDetector = null;
    }
}

// ======================================================================
// 顔検出ループ
// ======================================================================

function startFaceLoop() {
    if (!faceDetector || !faceFilterActive) return;
    faceAnimFrame = requestAnimationFrame(async () => {
        if (cameraVideo && cameraVideo.readyState >= 2) {
            syncFaceCanvas();
            try { await faceDetector.send({ image: cameraVideo }); } catch (_) {}
        }
        if (faceFilterActive) startFaceLoop();
    });
}

function stopFaceLoop() {
    faceFilterActive = false;
    if (faceAnimFrame) { cancelAnimationFrame(faceAnimFrame); faceAnimFrame = null; }
    if (faceCtx && faceCanvas) faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    resetSmoothing();
}

function syncFaceCanvas() {
    if (!faceCanvas || !cameraVideo) return;
    const vw = cameraVideo.videoWidth  || faceCanvas.width;
    const vh = cameraVideo.videoHeight || faceCanvas.height;
    if (faceCanvas.width !== vw || faceCanvas.height !== vh) {
        faceCanvas.width = vw; faceCanvas.height = vh;
    }
}

// ======================================================================
// 検出結果コールバック
// ======================================================================

function onFaceResults(results) {
    if (!faceCtx || !faceCanvas) return;
    faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    if (!results.detections || results.detections.length === 0) { resetSmoothing(); return; }
    if (currentDecorationId === 'none') return;

    const W = faceCanvas.width;
    const H = faceCanvas.height;
    const isFlipped = (currentFacingMode === 'user');

    results.detections.forEach(det => {
        const box = det.boundingBox;
        const lm  = det.landmarks;   // [0]右目 [1]左目 [2]鼻 [3]口 [4]右耳 [5]左耳

        // ── Raw 座標（正規化 → ピクセル）──
        const rBx = box.xCenter * W;
        const rBy = box.yCenter * H;
        const rBw = box.width   * W;
        const rBh = box.height  * H;

        const rRex = lm ? lm[0].x * W : rBx - rBw * 0.2;
        const rRey = lm ? lm[0].y * H : rBy - rBh * 0.1;
        const rLex = lm ? lm[1].x * W : rBx + rBw * 0.2;
        const rLey = lm ? lm[1].y * H : rBy - rBh * 0.1;
        const rNx  = lm ? lm[2].x * W : rBx;
        const rNy  = lm ? lm[2].y * H : rBy + rBh * 0.07;
        const rMx  = lm ? lm[3].x * W : rBx;
        const rMy  = lm ? lm[3].y * H : rBy + rBh * 0.28;

        // ── スムージング適用 ──
        const bx  = smoothVal('bx', rBx),  by  = smoothVal('by', rBy);
        const bw  = smoothVal('bw', rBw),  bh  = smoothVal('bh', rBh);
        const rex = smoothVal('rex', rRex), rey = smoothVal('rey', rRey);
        const lex = smoothVal('lex', rLex), ley = smoothVal('ley', rLey);
        const nx  = smoothVal('nx', rNx),  ny  = smoothVal('ny', rNy);
        const mx  = smoothVal('mx', rMx),  my  = smoothVal('my', rMy);

        // ── 派生座標 ──
        const faceTop   = by - bh * 0.5;
        const faceBot   = by + bh * 0.5;
        const faceLeft  = bx - bw * 0.5;
        const faceRight = bx + bw * 0.5;
        const eyeMidX   = (rex + lex) / 2;
        const eyeMidY   = (rey + ley) / 2;
        const eyeSep    = Math.abs(rex - lex);   // 目間距離

        // ── 描画（フロントカメラ時は左右反転）──
        faceCtx.save();
        if (isFlipped) { faceCtx.translate(W, 0); faceCtx.scale(-1, 1); }

        drawDecoration(faceCtx, currentDecorationId, {
            bx, by, bw, bh,
            rex, rey, lex, ley,
            nx, ny, mx, my,
            eyeMidX, eyeMidY, eyeSep,
            faceTop, faceBot, faceLeft, faceRight,
            W, H
        });

        faceCtx.restore();
    });
}

// ======================================================================
// Canvas に顔フィルターを合成（captureImage から呼ばれる）
// ======================================================================

function drawFaceFilterOnCanvas(ctx, w, h) {
    if (!faceCanvas || currentDecorationId === 'none') return;
    ctx.drawImage(faceCanvas, 0, 0, w, h);
}

// ======================================================================
// 描画ディスパッチャー
// ======================================================================

function drawDecoration(ctx, id, p) {
    const { bx, by, bw, bh, rex, rey, lex, ley, nx, ny, mx, my,
            eyeMidX, eyeMidY, eyeSep, faceTop, faceBot, faceLeft, faceRight } = p;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    switch (id) {

        // ────────────────────────────────────────────────────────────
        // 頭部・帽子
        // ────────────────────────────────────────────────────────────

        case 'crown': {
            const cw = bw * 0.88, ch = bh * 0.4;
            const cx = bx - cw / 2, cy = faceTop - ch * 0.82;
            // 帯
            const grad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
            grad.addColorStop(0, '#FFD700'); grad.addColorStop(1, '#B8860B');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.rect(cx, cy + ch * 0.45, cw, ch * 0.55);
            ctx.fill();
            // 5 本の突起
            const pts = [0.05, 0.27, 0.5, 0.73, 0.95];
            const hs  = [0.45, 0.7, 1.0, 0.7, 0.45];
            pts.forEach((xr, i) => {
                ctx.beginPath();
                ctx.moveTo(cx + cw * xr, cy + ch * 0.45);
                ctx.lineTo(cx + cw * xr, cy + ch * (0.45 - hs[i] * 0.45));
                ctx.lineTo(cx + cw * (xr + (pts[1] - pts[0]) * 0.5), cy + ch * 0.45);
                ctx.closePath();
                ctx.fill();
            });
            // 宝石
            ctx.fillStyle = '#FF4444';
            ctx.beginPath(); ctx.arc(bx, cy + ch * 0.7, bw * 0.04, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#7B6000'; ctx.lineWidth = bw * 0.012;
            ctx.beginPath(); ctx.rect(cx, cy + ch * 0.45, cw, ch * 0.55); ctx.stroke();
            break;
        }

        case 'santa': {
            const hw = bw * 0.72, hh = bh * 0.7;
            const hx = bx - hw / 2, hy = faceTop - hh * 0.55;
            // 帽子本体（赤）
            ctx.fillStyle = '#CC0000';
            ctx.beginPath();
            ctx.moveTo(hx, hy + hh * 0.3);
            ctx.quadraticCurveTo(bx, hy - hh * 0.3, bx + hw * 0.32, hy + hh * 0.2);
            ctx.lineTo(hx + hw, hy + hh * 0.3);
            ctx.closePath();
            ctx.fill();
            // 白のボア
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(bx, hy + hh * 0.31, hw * 0.52, hh * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            // ポンポン
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(bx + hw * 0.3, hy - hh * 0.08, bw * 0.07, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'headband': {
            const bndY = faceTop + bh * 0.18;
            ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = bh * 0.07;
            ctx.beginPath();
            ctx.moveTo(faceLeft + bw * 0.05, bndY);
            ctx.quadraticCurveTo(bx, bndY - bh * 0.04, faceRight - bw * 0.05, bndY);
            ctx.stroke();
            drawBow(ctx, bx, bndY - bh * 0.04, bw * 0.28, '#FF69B4', '#C71585');
            break;
        }

        case 'horns': {
            const hornH = bh * 0.42, hornW = bw * 0.18;
            const lx = bx - bw * 0.22, rx = bx + bw * 0.22;
            const baseY = faceTop + bh * 0.04;
            ctx.fillStyle = '#8B0000';
            [lx, rx].forEach(hx => {
                ctx.beginPath();
                ctx.moveTo(hx - hornW / 2, baseY);
                ctx.quadraticCurveTo(hx - hornW * 0.2, baseY - hornH * 0.6,
                                     hx + hornW * 0.1, baseY - hornH);
                ctx.quadraticCurveTo(hx + hornW * 0.4, baseY - hornH * 0.5,
                                     hx + hornW / 2, baseY);
                ctx.closePath();
                ctx.fill();
            });
            ctx.fillStyle = '#FF4400';
            [lx, rx].forEach(hx => {
                ctx.beginPath();
                ctx.moveTo(hx - hornW * 0.15, baseY - hornH * 0.08);
                ctx.quadraticCurveTo(hx, baseY - hornH * 0.5,
                                     hx + hornW * 0.06, baseY - hornH * 0.92);
                ctx.quadraticCurveTo(hx + hornW * 0.2, baseY - hornH * 0.45,
                                     hx + hornW * 0.15, baseY - hornH * 0.08);
                ctx.closePath();
                ctx.fill();
            });
            break;
        }

        case 'ninja': {
            const bandH  = bh * 0.12;
            const bandW  = bw * 1.02;
            const bandY  = faceTop + bh * 0.18;
            const bandX  = bx - bandW / 2;
            ctx.fillStyle = 'rgba(240,238,230,0.92)';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bandX, bandY - bandH / 2, bandW, bandH, 6)
                          : ctx.rect(bandX, bandY - bandH / 2, bandW, bandH);
            ctx.fill();
            // 日の丸
            ctx.fillStyle = '#CC0000';
            ctx.beginPath();
            ctx.arc(bx, bandY, bandH * 0.38, 0, Math.PI * 2);
            ctx.fill();
            // 縁取り
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bandX, bandY - bandH / 2, bandW, bandH, 6)
                          : ctx.rect(bandX, bandY - bandH / 2, bandW, bandH);
            ctx.stroke();
            break;
        }

        case 'halo': {
            const ry = faceTop - bh * 0.1;
            const rx = bw * 0.33, rz = rx * 0.24;
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = bw * 0.055;
            ctx.shadowColor = 'rgba(255,215,0,0.8)'; ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.ellipse(bx, ry, rx, rz, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
        }

        case 'witch_hat': {
            const hh = bh * 0.82, hw = bw * 0.72;
            const tipX = bx + bw * 0.06, tipY = faceTop - hh * 0.62;
            const brimY = faceTop + bh * 0.01;
            const brimRx = hw * 0.56, brimRy = hw * 0.13;
            // 帽子本体
            const g = ctx.createLinearGradient(tipX, tipY, bx, brimY);
            g.addColorStop(0, '#1a0030'); g.addColorStop(1, '#2d0050');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(bx - hw / 2, brimY);
            ctx.lineTo(bx + hw / 2, brimY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#7B00D4'; ctx.lineWidth = bw * 0.02;
            ctx.stroke();
            // つば
            ctx.fillStyle = '#1a0030';
            ctx.beginPath();
            ctx.ellipse(bx, brimY, brimRx, brimRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#7B00D4'; ctx.stroke();
            // 星
            drawStar(ctx, tipX - hw * 0.16, tipY + hh * 0.28, bw * 0.035, '#CC66FF');
            drawStar(ctx, tipX + hw * 0.08, tipY + hh * 0.48, bw * 0.025, '#9933FF');
            break;
        }

        case 'ribbon_bow': {
            drawBow(ctx, bx, faceTop - bh * 0.16, bw * 0.42, '#FF69B4', '#C71585');
            break;
        }

        // ────────────────────────────────────────────────────────────
        // 目元
        // ────────────────────────────────────────────────────────────

        case 'glasses': {
            const gw = eyeSep * 0.72, gh = gw * 0.38;
            const bridgeG = eyeSep * 0.08;
            // レンズ（サングラス用 — 不透明）
            ctx.fillStyle = 'rgba(20,20,40,0.88)';
            ctx.beginPath();
            ctx.ellipse(rex, eyeMidY, gw / 2, gh / 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.ellipse(lex, eyeMidY, gw / 2, gh / 2, 0, 0, Math.PI * 2); ctx.fill();
            // フレーム
            ctx.strokeStyle = '#888'; ctx.lineWidth = bw * 0.022;
            ctx.beginPath(); ctx.ellipse(rex, eyeMidY, gw / 2, gh / 2, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(lex, eyeMidY, gw / 2, gh / 2, 0, 0, Math.PI * 2); ctx.stroke();
            // ブリッジ
            ctx.beginPath(); ctx.moveTo(rex + gw / 2, eyeMidY); ctx.lineTo(lex - gw / 2, eyeMidY); ctx.stroke();
            // ツル
            ctx.beginPath(); ctx.moveTo(rex - gw / 2, eyeMidY); ctx.lineTo(faceLeft - bw * 0.08, eyeMidY + bh * 0.03); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + gw / 2, eyeMidY); ctx.lineTo(faceRight + bw * 0.08, eyeMidY + bh * 0.03); ctx.stroke();
            // グレア
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.beginPath(); ctx.ellipse(rex - gw * 0.16, eyeMidY - gh * 0.18, gw * 0.14, gh * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(lex - gw * 0.16, eyeMidY - gh * 0.18, gw * 0.14, gh * 0.2, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'heart_eyes': {
            const hr = eyeSep * 0.38;
            drawHeart(ctx, rex, eyeMidY, hr, '#FF1493');
            drawHeart(ctx, lex, eyeMidY, hr, '#FF1493');
            // スパークル
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath(); ctx.arc(rex - hr * 0.3, eyeMidY - hr * 0.35, hr * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(lex - hr * 0.3, eyeMidY - hr * 0.35, hr * 0.1, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'star_eyes': {
            const sr = eyeSep * 0.36;
            drawStar(ctx, rex, eyeMidY, sr, '#FFD700');
            drawStar(ctx, lex, eyeMidY, sr, '#FFD700');
            // 白ハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(rex - sr * 0.28, eyeMidY - sr * 0.28, sr * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(lex - sr * 0.28, eyeMidY - sr * 0.28, sr * 0.12, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'round_glasses': {
            const rg = eyeSep * 0.36;
            ctx.fillStyle = 'rgba(160,210,255,0.18)';
            ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = bw * 0.025;
            [rex, lex].forEach(ex => {
                ctx.beginPath(); ctx.arc(ex, eyeMidY, rg, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // ハイライト
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.beginPath(); ctx.ellipse(ex - rg * 0.3, eyeMidY - rg * 0.3, rg * 0.2, rg * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(160,210,255,0.18)';
            });
            ctx.beginPath(); ctx.moveTo(rex + rg, eyeMidY); ctx.lineTo(lex - rg, eyeMidY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rex - rg, eyeMidY); ctx.lineTo(faceLeft - bw * 0.04, eyeMidY + bh * 0.04); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + rg, eyeMidY); ctx.lineTo(faceRight + bw * 0.04, eyeMidY + bh * 0.04); ctx.stroke();
            break;
        }

        case 'eyepatch': {
            const pr = eyeSep * 0.34;
            const px = lex, py = ley; // 人物左目 = カメラから見て右側（lex）
            const g2 = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, pr * 0.1, px, py, pr);
            g2.addColorStop(0, '#333'); g2.addColorStop(1, '#000');
            ctx.fillStyle = g2;
            ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.72, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#555'; ctx.lineWidth = bw * 0.02; ctx.stroke();
            // ストラップ
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = bw * 0.018;
            ctx.beginPath(); ctx.moveTo(px - pr, py - pr * 0.3); ctx.lineTo(faceLeft - bw * 0.05, py); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + pr, py - pr * 0.3); ctx.lineTo(faceRight + bw * 0.05, py); ctx.stroke();
            // 頭骨マーク
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.beginPath(); ctx.arc(px, py - pr * 0.1, pr * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px - pr * 0.2, py + pr * 0.26, pr * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px + pr * 0.2, py + pr * 0.26, pr * 0.1, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ────────────────────────────────────────────────────────────
        // 鼻元
        // ────────────────────────────────────────────────────────────

        case 'pig_nose': {
            const r = bw * 0.16;
            const gn = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, r * 0.1, nx, ny + bh * 0.03, r);
            gn.addColorStop(0, '#FFB5C0'); gn.addColorStop(0.5, '#FF8895'); gn.addColorStop(1, '#E06070');
            ctx.fillStyle = gn;
            ctx.beginPath(); ctx.ellipse(nx, ny + bh * 0.04, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#CC5566'; ctx.lineWidth = bw * 0.015; ctx.stroke();
            // 鼻の穴
            ctx.fillStyle = 'rgba(90,30,40,0.8)';
            ctx.beginPath(); ctx.ellipse(nx - r * 0.38, ny + bh * 0.04, r * 0.22, r * 0.3, -0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(nx + r * 0.38, ny + bh * 0.04, r * 0.22, r * 0.3, 0.25, 0, Math.PI * 2); ctx.fill();
            // ハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.ellipse(nx - r * 0.25, ny - bh * 0.01, r * 0.18, r * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'clown_nose': {
            const cr = bw * 0.1;
            const cg = ctx.createRadialGradient(nx - cr * 0.35, ny - cr * 0.35 + bh * 0.02, cr * 0.08, nx, ny + bh * 0.02, cr);
            cg.addColorStop(0, '#FF8080'); cg.addColorStop(0.5, '#FF2020'); cg.addColorStop(1, '#AA0000');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(nx, ny + bh * 0.02, cr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.beginPath(); ctx.ellipse(nx - cr * 0.3, ny - cr * 0.3 + bh * 0.02, cr * 0.22, cr * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ────────────────────────────────────────────────────────────
        // 顔全体
        // ────────────────────────────────────────────────────────────

        case 'kabuki': {
            // ① 白塗りベース
            ctx.fillStyle = 'rgba(248,243,238,0.78)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.03, bw * 0.44, bh * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // ② 隈取り（赤の隈）— 目の周り
            ctx.strokeStyle = '#C41E3A'; ctx.lineWidth = bw * 0.038;
            // 右目隈取り上
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.16, rey - bh * 0.02);
            ctx.bezierCurveTo(rex - bw * 0.28, rey - bh * 0.1, rex - bw * 0.3, rey - bh * 0.22, rex - bw * 0.26, rey - bh * 0.26); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.02, rey - bh * 0.06);
            ctx.bezierCurveTo(rex + bw * 0.1, rey - bh * 0.14, rex + bw * 0.18, rey - bh * 0.17, rex + bw * 0.2, rey - bh * 0.15); ctx.stroke();
            // 右目隈取り下
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.18, rey + bh * 0.04);
            ctx.bezierCurveTo(rex - bw * 0.22, rey + bh * 0.12, rex - bw * 0.18, rey + bh * 0.18, rex - bw * 0.1, rey + bh * 0.22); ctx.stroke();
            // 左目（鏡対称）
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.16, ley - bh * 0.02);
            ctx.bezierCurveTo(lex + bw * 0.28, ley - bh * 0.1, lex + bw * 0.3, ley - bh * 0.22, lex + bw * 0.26, ley - bh * 0.26); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.02, ley - bh * 0.06);
            ctx.bezierCurveTo(lex - bw * 0.1, ley - bh * 0.14, lex - bw * 0.18, ley - bh * 0.17, lex - bw * 0.2, ley - bh * 0.15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.18, ley + bh * 0.04);
            ctx.bezierCurveTo(lex + bw * 0.22, ley + bh * 0.12, lex + bw * 0.18, ley + bh * 0.18, lex + bw * 0.1, ley + bh * 0.22); ctx.stroke();

            // ③ 黒い太眉（弧状）
            ctx.strokeStyle = '#111'; ctx.lineWidth = bw * 0.042;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.16, rey - bh * 0.12);
            ctx.quadraticCurveTo(rex, rey - bh * 0.24, rex + bw * 0.1, rey - bh * 0.21); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.16, ley - bh * 0.12);
            ctx.quadraticCurveTo(lex, ley - bh * 0.24, lex - bw * 0.1, ley - bh * 0.21); ctx.stroke();

            // ④ 口紅（赤）
            ctx.fillStyle = '#C41E3A';
            ctx.beginPath(); ctx.ellipse(mx, my, bw * 0.1, bh * 0.04, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'maiko': {
            // ① 白塗りベース
            ctx.fillStyle = 'rgba(248,244,240,0.82)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.02, bw * 0.44, bh * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // ② 淡いピンクの眉
            ctx.strokeStyle = '#D0597C'; ctx.lineWidth = bw * 0.018;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.14, rey - bh * 0.1);
            ctx.quadraticCurveTo(rex + bw * 0.02, rey - bh * 0.18, rex + bw * 0.12, rey - bh * 0.16); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.14, ley - bh * 0.1);
            ctx.quadraticCurveTo(lex - bw * 0.02, ley - bh * 0.18, lex - bw * 0.12, ley - bh * 0.16); ctx.stroke();

            // ③ 下唇のみ赤
            ctx.fillStyle = '#DC143C';
            ctx.beginPath(); ctx.ellipse(mx, my + bh * 0.02, bw * 0.09, bh * 0.035, 0, 0, Math.PI * 2); ctx.fill();

            // ④ 目尻に淡い赤
            ctx.fillStyle = 'rgba(220,20,60,0.35)';
            ctx.beginPath(); ctx.ellipse(rex - bw * 0.15, rey + bh * 0.03, bw * 0.07, bh * 0.025, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(lex + bw * 0.15, ley + bh * 0.03, bw * 0.07, bh * 0.025, -0.3, 0, Math.PI * 2); ctx.fill();

            // ⑤ 花かんざし（頭上）
            drawFlowerOrnament(ctx, bx, faceTop - bh * 0.08, bw * 0.22);
            break;
        }

        case 'oiran': {
            // ① 白塗り
            ctx.fillStyle = 'rgba(248,244,240,0.84)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.02, bw * 0.44, bh * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // ② 黒目線（アイライナー）
            ctx.strokeStyle = '#111'; ctx.lineWidth = bw * 0.026;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.18, rey);
            ctx.bezierCurveTo(rex - bw * 0.05, rey - bh * 0.06, rex + bw * 0.12, rey - bh * 0.06, rex + bw * 0.2, rey + bh * 0.01); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.18, ley);
            ctx.bezierCurveTo(lex + bw * 0.05, ley - bh * 0.06, lex - bw * 0.12, ley - bh * 0.06, lex - bw * 0.2, ley + bh * 0.01); ctx.stroke();
            // 目尻を伸ばす
            ctx.lineWidth = bw * 0.02;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.18, rey); ctx.lineTo(rex - bw * 0.28, rey + bh * 0.03); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.18, ley); ctx.lineTo(lex + bw * 0.28, ley + bh * 0.03); ctx.stroke();

            // ③ 眉（細め黒）
            ctx.lineWidth = bw * 0.022;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.14, rey - bh * 0.11);
            ctx.quadraticCurveTo(rex + bw * 0.02, rey - bh * 0.2, rex + bw * 0.12, rey - bh * 0.18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.14, ley - bh * 0.11);
            ctx.quadraticCurveTo(lex - bw * 0.02, ley - bh * 0.2, lex - bw * 0.12, ley - bh * 0.18); ctx.stroke();

            // ④ 口紅（濃い赤）
            ctx.fillStyle = '#8B0000';
            ctx.beginPath(); ctx.ellipse(mx, my, bw * 0.1, bh * 0.042, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#DC143C';
            ctx.beginPath(); ctx.ellipse(mx, my + bh * 0.01, bw * 0.07, bh * 0.025, 0, 0, Math.PI * 2); ctx.fill();

            // ⑤ 頭上の飾り
            drawFlowerOrnament(ctx, bx - bw * 0.12, faceTop - bh * 0.1, bw * 0.18);
            drawFlowerOrnament(ctx, bx + bw * 0.1, faceTop - bh * 0.06, bw * 0.14);
            break;
        }

        case 'clown_face': {
            // ① 白塗り
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.02, bw * 0.46, bh * 0.52, 0, 0, Math.PI * 2); ctx.fill();

            // ② 目の上の三角（青）
            ctx.fillStyle = '#1E90FF';
            [[rex, rey], [lex, ley]].forEach(([ex, ey]) => {
                ctx.beginPath(); ctx.moveTo(ex, ey - bh * 0.22);
                ctx.lineTo(ex - bw * 0.12, ey - bh * 0.02); ctx.lineTo(ex + bw * 0.12, ey - bh * 0.02);
                ctx.closePath(); ctx.fill();
            });

            // ③ ほっぺの赤丸
            ctx.fillStyle = 'rgba(255,60,60,0.65)';
            ctx.beginPath(); ctx.arc(rex - bw * 0.22, ny, bw * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(lex + bw * 0.22, ny, bw * 0.12, 0, Math.PI * 2); ctx.fill();

            // ④ 赤い大きな口（アーク）
            ctx.strokeStyle = '#FF0000'; ctx.lineWidth = bw * 0.048;
            ctx.beginPath(); ctx.arc(mx, my - bh * 0.02, bw * 0.24, 0.15, Math.PI - 0.15); ctx.stroke();

            // ⑤ ピエロの鼻
            ctx.fillStyle = '#FF2020';
            ctx.beginPath(); ctx.arc(nx, ny + bh * 0.02, bw * 0.085, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'panda_face': {
            // 黒い目パッチ
            ctx.fillStyle = 'rgba(25,25,25,0.88)';
            ctx.beginPath(); ctx.ellipse(rex, rey, eyeSep * 0.38, eyeSep * 0.32, -0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(lex, ley, eyeSep * 0.38, eyeSep * 0.32, 0.25, 0, Math.PI * 2); ctx.fill();
            // 白目のハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.arc(rex + eyeSep * 0.1, rey - eyeSep * 0.1, eyeSep * 0.08, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(lex - eyeSep * 0.1, ley - eyeSep * 0.1, eyeSep * 0.08, 0, Math.PI * 2); ctx.fill();
            // 鼻
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(nx, ny + bh * 0.02, bw * 0.06, bh * 0.025, 0, 0, Math.PI * 2); ctx.fill();
            // 丸耳（黒）
            ctx.fillStyle = 'rgba(25,25,25,0.9)';
            [[bx - bw * 0.32, faceTop - bh * 0.02], [bx + bw * 0.32, faceTop - bh * 0.02]].forEach(([ex, ey]) => {
                ctx.beginPath(); ctx.arc(ex, ey, bw * 0.15, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'tiger_face': {
            // オレンジのほっぺ縞模様
            ctx.strokeStyle = '#CC6600'; ctx.lineWidth = bw * 0.028;
            const stripes = [[rex - bw * 0.06, rex - bw * 0.26], [rex - bw * 0.0, rex - bw * 0.22], [rex + bw * 0.06, rex - bw * 0.18]];
            stripes.forEach(([sx, ex]) => {
                ctx.beginPath(); ctx.moveTo(sx, ny - bh * 0.05); ctx.lineTo(ex, ny + bh * 0.12); ctx.stroke();
            });
            const stripesR = [[lex + bw * 0.06, lex + bw * 0.26], [lex + bw * 0.0, lex + bw * 0.22], [lex - bw * 0.06, lex + bw * 0.18]];
            stripesR.forEach(([sx, ex]) => {
                ctx.beginPath(); ctx.moveTo(sx, ny - bh * 0.05); ctx.lineTo(ex, ny + bh * 0.12); ctx.stroke();
            });
            // 鼻（黒）
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(nx, ny + bh * 0.02, bw * 0.06, bh * 0.025, 0, 0, Math.PI * 2); ctx.fill();
            // ヒゲ
            ctx.strokeStyle = '#555'; ctx.lineWidth = bw * 0.012;
            [[-1, 1]].forEach(() => {
                [[-0.3, 0.15], [0, 0.08], [0.3, 0.01]].forEach(([yOff, xFr]) => {
                    ctx.beginPath(); ctx.moveTo(nx - bw * 0.06, ny + bh * yOff); ctx.lineTo(faceLeft - bw * 0.04, ny + bh * yOff); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(nx + bw * 0.06, ny + bh * yOff); ctx.lineTo(faceRight + bw * 0.04, ny + bh * yOff); ctx.stroke();
                });
            });
            // トラ耳
            const trEarW = bw * 0.16, trEarH = bh * 0.28;
            [[bx - bw * 0.26, faceTop], [bx + bw * 0.26, faceTop]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#CC6600';
                ctx.beginPath(); ctx.moveTo(ex - trEarW / 2, ey + trEarH * 0.1);
                ctx.lineTo(ex, ey - trEarH * 0.9); ctx.lineTo(ex + trEarW / 2, ey + trEarH * 0.1); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#FF9933';
                ctx.beginPath(); ctx.moveTo(ex - trEarW * 0.28, ey + trEarH * 0.1);
                ctx.lineTo(ex, ey - trEarH * 0.65); ctx.lineTo(ex + trEarW * 0.28, ey + trEarH * 0.1); ctx.closePath(); ctx.fill();
            });
            break;
        }

        case 'zombie': {
            // グレーの肌
            ctx.fillStyle = 'rgba(160,175,140,0.55)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.02, bw * 0.46, bh * 0.52, 0, 0, Math.PI * 2); ctx.fill();
            // 目の隈
            ctx.fillStyle = 'rgba(50,30,30,0.7)';
            ctx.beginPath(); ctx.ellipse(rex, rey + bh * 0.04, eyeSep * 0.36, eyeSep * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(lex, ley + bh * 0.04, eyeSep * 0.36, eyeSep * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            // 傷（赤い線）
            ctx.strokeStyle = '#8B0000'; ctx.lineWidth = bw * 0.018;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.1, rey - bh * 0.22); ctx.lineTo(rex + bw * 0.04, rey + bh * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx + bw * 0.08, faceTop + bh * 0.12); ctx.lineTo(bx + bw * 0.18, ny + bh * 0.1); ctx.stroke();
            // 血滴
            ctx.fillStyle = '#8B0000';
            ctx.beginPath(); ctx.arc(rex - bw * 0.06, rey + bh * 0.08, bw * 0.015, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'oni': {
            // 赤いオーバーレイ
            ctx.fillStyle = 'rgba(200,30,30,0.45)';
            ctx.beginPath(); ctx.ellipse(bx, by + bh * 0.02, bw * 0.46, bh * 0.52, 0, 0, Math.PI * 2); ctx.fill();
            // 鬼眉（太くアンギュラー）
            ctx.strokeStyle = '#111'; ctx.lineWidth = bw * 0.048;
            ctx.beginPath(); ctx.moveTo(rex - bw * 0.16, rey - bh * 0.1);
            ctx.lineTo(rex - bw * 0.04, rey - bh * 0.2); ctx.lineTo(rex + bw * 0.1, rey - bh * 0.09); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(lex + bw * 0.16, ley - bh * 0.1);
            ctx.lineTo(lex + bw * 0.04, ley - bh * 0.2); ctx.lineTo(lex - bw * 0.1, ley - bh * 0.09); ctx.stroke();
            // 角（白）
            const oniHornH = bh * 0.45, oniHornW = bw * 0.14;
            [[bx - bw * 0.18, faceTop + bh * 0.04], [bx + bw * 0.18, faceTop + bh * 0.04]].forEach(([ox, oy]) => {
                ctx.fillStyle = '#F5F0E0';
                ctx.strokeStyle = '#AAA'; ctx.lineWidth = bw * 0.015;
                ctx.beginPath(); ctx.moveTo(ox - oniHornW / 2, oy);
                ctx.quadraticCurveTo(ox, oy - oniHornH, ox + oniHornW * 0.1, oy - oniHornH * 0.9);
                ctx.quadraticCurveTo(ox + oniHornW * 0.35, oy - oniHornH * 0.5, ox + oniHornW / 2, oy);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            });
            // 牙
            ctx.fillStyle = '#FFFEF0';
            ctx.strokeStyle = '#BBB'; ctx.lineWidth = bw * 0.012;
            [[mx - bw * 0.1, my], [mx + bw * 0.1, my]].forEach(([tx, ty]) => {
                ctx.beginPath(); ctx.moveTo(tx - bw * 0.04, ty); ctx.lineTo(tx, ty + bh * 0.1); ctx.lineTo(tx + bw * 0.04, ty); ctx.closePath(); ctx.fill(); ctx.stroke();
            });
            break;
        }

        // ────────────────────────────────────────────────────────────
        // 動物変身
        // ────────────────────────────────────────────────────────────

        case 'cat_ears': {
            const ew = bw * 0.22, eh = bh * 0.38;
            [[bx - bw * 0.26, faceTop - eh * 0.08], [bx + bw * 0.26, faceTop - eh * 0.08]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#F4A0B0';
                ctx.strokeStyle = '#E75480'; ctx.lineWidth = bw * 0.018;
                ctx.beginPath(); ctx.moveTo(ex - ew / 2, ey + eh * 0.12);
                ctx.lineTo(ex, ey - eh * 0.88); ctx.lineTo(ex + ew / 2, ey + eh * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
                // 内側（ピンク）
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath(); ctx.moveTo(ex - ew * 0.28, ey + eh * 0.12);
                ctx.lineTo(ex, ey - eh * 0.62); ctx.lineTo(ex + ew * 0.28, ey + eh * 0.12); ctx.closePath(); ctx.fill();
            });
            break;
        }

        case 'rabbit_ears': {
            const rw = bw * 0.14, rh = bh * 0.72;
            [[bx - bw * 0.2, faceTop - rh * 0.06], [bx + bw * 0.2, faceTop - rh * 0.06]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#F0E8F0';
                ctx.strokeStyle = '#D0A0C0'; ctx.lineWidth = bw * 0.016;
                ctx.beginPath(); ctx.ellipse(ex, ey - rh * 0.42, rw / 2, rh / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFB0C8';
                ctx.beginPath(); ctx.ellipse(ex, ey - rh * 0.4, rw * 0.28, rh * 0.38, 0, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'dog_ears': {
            const dw = bw * 0.26, dh = bh * 0.42;
            const dbY = faceTop - dh * 0.06;
            // 左耳（頭の左側からぶら下がる形）
            ctx.fillStyle = '#8B6340'; ctx.strokeStyle = '#5C3D20'; ctx.lineWidth = bw * 0.018;
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.28, dbY);
            ctx.bezierCurveTo(bx - bw * 0.46, dbY + dh * 0.22, bx - bw * 0.52, dbY + dh * 0.72, bx - bw * 0.4, dbY + dh);
            ctx.bezierCurveTo(bx - bw * 0.28, dbY + dh * 1.12, bx - bw * 0.12, dbY + dh * 0.9, bx - bw * 0.16, dbY + dh * 0.5);
            ctx.bezierCurveTo(bx - bw * 0.18, dbY + dh * 0.22, bx - bw * 0.2, dbY, bx - bw * 0.28, dbY);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // 内耳
            ctx.fillStyle = '#C4956A';
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.32, dbY + dh * 0.1);
            ctx.bezierCurveTo(bx - bw * 0.44, dbY + dh * 0.3, bx - bw * 0.46, dbY + dh * 0.68, bx - bw * 0.36, dbY + dh * 0.88);
            ctx.bezierCurveTo(bx - bw * 0.24, dbY + dh * 0.9, bx - bw * 0.18, dbY + dh * 0.76, bx - bw * 0.2, dbY + dh * 0.48);
            ctx.bezierCurveTo(bx - bw * 0.22, dbY + dh * 0.28, bx - bw * 0.24, dbY + dh * 0.1, bx - bw * 0.32, dbY + dh * 0.1);
            ctx.closePath(); ctx.fill();
            // 右耳
            ctx.fillStyle = '#8B6340'; ctx.strokeStyle = '#5C3D20'; ctx.lineWidth = bw * 0.018;
            ctx.beginPath();
            ctx.moveTo(bx + bw * 0.28, dbY);
            ctx.bezierCurveTo(bx + bw * 0.46, dbY + dh * 0.22, bx + bw * 0.52, dbY + dh * 0.72, bx + bw * 0.4, dbY + dh);
            ctx.bezierCurveTo(bx + bw * 0.28, dbY + dh * 1.12, bx + bw * 0.12, dbY + dh * 0.9, bx + bw * 0.16, dbY + dh * 0.5);
            ctx.bezierCurveTo(bx + bw * 0.18, dbY + dh * 0.22, bx + bw * 0.2, dbY, bx + bw * 0.28, dbY);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#C4956A';
            ctx.beginPath();
            ctx.moveTo(bx + bw * 0.32, dbY + dh * 0.1);
            ctx.bezierCurveTo(bx + bw * 0.44, dbY + dh * 0.3, bx + bw * 0.46, dbY + dh * 0.68, bx + bw * 0.36, dbY + dh * 0.88);
            ctx.bezierCurveTo(bx + bw * 0.24, dbY + dh * 0.9, bx + bw * 0.18, dbY + dh * 0.76, bx + bw * 0.2, dbY + dh * 0.48);
            ctx.bezierCurveTo(bx + bw * 0.22, dbY + dh * 0.28, bx + bw * 0.24, dbY + dh * 0.1, bx + bw * 0.32, dbY + dh * 0.1);
            ctx.closePath(); ctx.fill();
            break;
        }

        case 'bear_ears': {
            const beR = bw * 0.16, beY = faceTop + beR * 0.08;
            [[bx - bw * 0.3, beY], [bx + bw * 0.3, beY]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#6B4226'; ctx.strokeStyle = '#3E2414'; ctx.lineWidth = bw * 0.02;
                ctx.beginPath(); ctx.arc(ex, ey, beR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#A0674B';
                ctx.beginPath(); ctx.arc(ex, ey, beR * 0.58, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'fox_ears': {
            const fxW = bw * 0.2, fxH = bh * 0.42;
            [[bx - bw * 0.25, faceTop - fxH * 0.05], [bx + bw * 0.25, faceTop - fxH * 0.05]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#E05020'; ctx.strokeStyle = '#8B2500'; ctx.lineWidth = bw * 0.018;
                ctx.beginPath(); ctx.moveTo(ex - fxW / 2, ey + fxH * 0.1);
                ctx.lineTo(ex, ey - fxH * 0.9); ctx.lineTo(ex + fxW / 2, ey + fxH * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
                // 内側（クリーム）
                ctx.fillStyle = '#FFF0E0';
                ctx.beginPath(); ctx.moveTo(ex - fxW * 0.26, ey + fxH * 0.1);
                ctx.lineTo(ex, ey - fxH * 0.62); ctx.lineTo(ex + fxW * 0.26, ey + fxH * 0.1); ctx.closePath(); ctx.fill();
            });
            break;
        }

        default:
            break;
    }

    ctx.restore();
}

// ======================================================================
// 描画ヘルパー関数
// ======================================================================

/** 5 角形の星を描く */
function drawStar(ctx, cx, cy, outerR, color, pts = 5) {
    const innerR = outerR * 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
        const r = (i % 2 === 0) ? outerR : innerR;
        const a = (i * Math.PI / pts) - Math.PI / 2;
        i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
                : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
}

/** ハート形を描く */
function drawHeart(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.4);
    ctx.bezierCurveTo(cx - r * 2.2, cy - r * 1.0, cx - r * 2.2, cy - r * 3.0, cx, cy - r * 2.0);
    ctx.bezierCurveTo(cx + r * 2.2, cy - r * 3.0, cx + r * 2.2, cy - r * 1.0, cx, cy + r * 0.4);
    ctx.closePath(); ctx.fill();
}

/** リボン（蝶結び）を描く */
function drawBow(ctx, cx, cy, size, fill, dark) {
    ctx.fillStyle = fill;
    const s = size * 0.5;
    // 左ループ
    ctx.beginPath(); ctx.ellipse(cx - s * 0.65, cy, s * 0.7, s * 0.42, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = size * 0.028; ctx.stroke();
    // 右ループ
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(cx + s * 0.65, cy, s * 0.7, s * 0.42, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    // 中央の結び
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.22, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.7, cy - s * 0.12, s * 0.3, s * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
}

/** 花かんざし（舞妓・花魁用） */
function drawFlowerOrnament(ctx, cx, cy, size) {
    const petalR = size * 0.3;
    // 茎
    ctx.strokeStyle = '#228B22'; ctx.lineWidth = size * 0.06;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + size * 0.8); ctx.stroke();
    // 花びら
    const colors = ['#FF69B4', '#FF1493', '#FFB6C1', '#FF69B4', '#FF1493'];
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * petalR, cy + Math.sin(a) * petalR,
                    petalR * 0.6, petalR * 0.4, a, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(cx, cy, petalR * 0.28, 0, Math.PI * 2); ctx.fill();
}

// ======================================================================
// 顔 AR フィルター選択 UI（カテゴリー別）
// ======================================================================

function buildFaceFilterUI() {
    const list = document.getElementById('face-filter-list');
    if (!list) return;
    list.innerHTML = '';
    list.style.display = 'block';    // grid から block に変更しカテゴリー構造を使う

    FACE_DECORATION_CATEGORIES.forEach(cat => {
        const items = FACE_DECORATIONS.filter(d => d.category === cat.id);
        if (items.length === 0) return;

        // カテゴリーヘッダー
        if (cat.id !== 'none_cat') {
            const hdr = document.createElement('div');
            hdr.className = 'face-filter-cat-header';
            hdr.textContent = `${cat.icon} ${cat.name}`;
            list.appendChild(hdr);
        }

        // アイテムグリッド
        const grid = document.createElement('div');
        grid.className = 'face-filter-cat-grid';

        items.forEach(d => {
            const item = document.createElement('div');
            item.className = 'filter-item' + (d.id === currentDecorationId ? ' selected' : '');
            item.dataset.decorId = d.id;
            item.innerHTML = `<div class="filter-icon">${d.icon}</div><span class="filter-name">${d.name}</span>`;
            item.addEventListener('click', () => {
                list.querySelectorAll('.filter-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                currentDecorationId = d.id;
                if (d.id === 'none') {
                    stopFaceLoop();
                } else {
                    faceFilterActive = true;
                    startFaceLoop();
                }
            });
            grid.appendChild(item);
        });

        list.appendChild(grid);
    });
}
