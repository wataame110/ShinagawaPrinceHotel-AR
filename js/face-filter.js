/**
 * ======================================================================
 * 顔ARフィルターモジュール (face-filter.js)
 * MediaPipe Face Detection で顔を検出し、装飾を重ねる
 *
 * 依存: @mediapipe/face_detection (CDN)
 * Canvas ID: #face-filter-canvas （video の上・frame の下に重ねる）
 * ======================================================================
 */

const FACE_DECORATIONS = [
    { id: 'none',        name: 'なし',       icon: '😶' },
    { id: 'pig_nose',    name: '豚鼻',        icon: '🐽' },
    { id: 'cat_ears',   name: '猫耳',        icon: '🐱' },
    { id: 'rabbit_ears', name: 'ウサギ耳',   icon: '🐰' },
    { id: 'glasses',    name: 'サングラス',  icon: '🕶' },
    { id: 'crown',      name: 'クラウン',    icon: '👑' },
    { id: 'horns',      name: '悪魔の角',    icon: '😈' },
    { id: 'santa',      name: 'サンタ帽',    icon: '🎅' },
    { id: 'headband',   name: 'カチューシャ', icon: '🎀' }
];

let currentDecorationId = 'none';
let faceDetector = null;
let faceCanvas = null;
let faceCtx = null;
let faceAnimFrame = null;
let faceFilterActive = false;

// ======================================================================
// 初期化
// ======================================================================

async function initFaceFilter() {
    faceCanvas = document.getElementById('face-filter-canvas');
    if (!faceCanvas) return;
    faceCtx = faceCanvas.getContext('2d');

    // MediaPipe FaceDetection を CDN から読み込む
    if (typeof FaceDetection === 'undefined') {
        console.warn('MediaPipe FaceDetection not loaded. Face filters unavailable.');
        return;
    }

    try {
        faceDetector = new FaceDetection({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`
        });
        faceDetector.setOptions({
            model: 'short',          // short: 近距離向け（スマホの自撮りに最適）
            minDetectionConfidence: 0.6
        });
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
    if (faceAnimFrame) {
        cancelAnimationFrame(faceAnimFrame);
        faceAnimFrame = null;
    }
    if (faceCtx && faceCanvas) {
        faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    }
}

/** face canvas サイズを video container に同期 */
function syncFaceCanvas() {
    if (!faceCanvas || !videoContainer) return;
    const vw = videoContainer.offsetWidth;
    const vh = videoContainer.offsetHeight;
    if (faceCanvas.width !== vw || faceCanvas.height !== vh) {
        faceCanvas.width  = vw;
        faceCanvas.height = vh;
    }
}

// ======================================================================
// 顔検出結果の描画
// ======================================================================

function onFaceResults(results) {
    if (!faceCtx || !faceCanvas) return;
    faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);

    if (!results.detections || results.detections.length === 0) return;
    if (currentDecorationId === 'none') return;

    const w = faceCanvas.width;
    const h = faceCanvas.height;

    // インカメラ時は X 軸を反転して描画
    const isFlipped = currentFacingMode === 'user';

    results.detections.forEach(detection => {
        const box = detection.boundingBox;
        const lm  = detection.landmarks; // [right_eye, left_eye, nose, mouth, right_ear, left_ear]

        // bounding box を canvas 座標に変換
        const bx = box.xCenter * w;
        const by = box.yCenter * h;
        const bw = box.width   * w;
        const bh = box.height  * h;

        // 鼻の位置
        const noseX = lm ? lm[2].x * w : bx;
        const noseY = lm ? lm[2].y * h : by + bh * 0.1;

        // 目の中間点（頭の高さ計算用）
        const eyeMidX = lm ? ((lm[0].x + lm[1].x) / 2) * w : bx;
        const eyeMidY = lm ? ((lm[0].y + lm[1].y) / 2) * h : by - bh * 0.15;

        faceCtx.save();
        if (isFlipped) {
            faceCtx.translate(w, 0);
            faceCtx.scale(-1, 1);
        }

        drawDecoration(faceCtx, currentDecorationId, {
            bx, by, bw, bh, noseX, noseY, eyeMidX, eyeMidY, w, h
        });

        faceCtx.restore();
    });
}

// ======================================================================
// 装飾描画（SVG風 Canvas 2D で各デコレーションを描画）
// ======================================================================

function drawDecoration(ctx, id, p) {
    const { bx, by, bw, bh, noseX, noseY, eyeMidX, eyeMidY } = p;
    const headTop = by - bh * 0.1;
    const earW    = bw * 0.55;

    ctx.save();

    switch (id) {

        case 'pig_nose': {
            const r = bw * 0.18;
            ctx.fillStyle = 'rgba(255, 150, 160, 0.9)';
            ctx.beginPath();
            ctx.ellipse(noseX, noseY + bh * 0.05, r, r * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7B3F50';
            const nh = r * 0.22;
            ctx.beginPath(); ctx.ellipse(noseX - r * 0.35, noseY + bh * 0.04, nh, nh * 1.2, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(noseX + r * 0.35, noseY + bh * 0.04, nh, nh * 1.2,  0.2, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'cat_ears': {
            const ew = earW * 0.45;
            const eh = bh  * 0.45;
            drawTriangle(ctx, bx - bw * 0.28, headTop, ew, eh, '#F4A0B0', '#E75480');
            drawTriangle(ctx, bx + bw * 0.28, headTop, ew, eh, '#F4A0B0', '#E75480');
            break;
        }

        case 'rabbit_ears': {
            const rw = bw  * 0.16;
            const rh = bh  * 0.9;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            drawRoundRect(ctx, bx - bw * 0.28 - rw / 2, headTop - rh, rw, rh, rw * 0.5);
            ctx.fill(); ctx.stroke();
            drawRoundRect(ctx, bx + bw * 0.28 - rw / 2, headTop - rh, rw, rh, rw * 0.5);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFB6C1';
            drawRoundRect(ctx, bx - bw * 0.28 - rw * 0.28, headTop - rh + rh * 0.1, rw * 0.55, rh * 0.75, rw * 0.3);
            ctx.fill();
            drawRoundRect(ctx, bx + bw * 0.28 - rw * 0.28, headTop - rh + rh * 0.1, rw * 0.55, rh * 0.75, rw * 0.3);
            ctx.fill();
            break;
        }

        case 'glasses': {
            const gw = bw * 0.28;
            const gy = eyeMidY;
            const gx1 = bx - bw * 0.2;
            const gx2 = bx + bw * 0.2;
            ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = bw * 0.025; ctx.fillStyle = 'rgba(30,30,200,0.25)';
            ctx.beginPath(); ctx.ellipse(gx1, gy, gw * 0.5, gw * 0.38, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(gx2, gy, gw * 0.5, gw * 0.38, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx1 + gw * 0.5, gy); ctx.lineTo(gx2 - gw * 0.5, gy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx1 - gw * 0.5, gy); ctx.lineTo(bx - bw * 0.55, gy + bw * 0.04); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx2 + gw * 0.5, gy); ctx.lineTo(bx + bw * 0.55, gy + bw * 0.04); ctx.stroke();
            break;
        }

        case 'crown': {
            const cw = bw * 0.75;
            const ch = bh * 0.35;
            const cx = bx - cw / 2;
            const cy = headTop - ch * 0.85;
            ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy + ch);
            ctx.lineTo(cx, cy + ch * 0.3);
            ctx.lineTo(cx + cw * 0.25, cy + ch * 0.6);
            ctx.lineTo(cx + cw * 0.5,  cy);
            ctx.lineTo(cx + cw * 0.75, cy + ch * 0.6);
            ctx.lineTo(cx + cw, cy + ch * 0.3);
            ctx.lineTo(cx + cw, cy + ch);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ['#FF4444','#4444FF','#44FF44'].forEach((col, i) => {
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(cx + cw * (0.2 + i * 0.3), cy + ch * 0.7, ch * 0.1, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'horns': {
            const hw = bw * 0.18;
            const hh = bh * 0.4;
            drawTriangle(ctx, bx - bw * 0.22, headTop, hw, hh, '#CC0000', '#880000');
            drawTriangle(ctx, bx + bw * 0.22, headTop, hw, hh, '#CC0000', '#880000');
            break;
        }

        case 'santa': {
            const sw = bw * 0.85;
            const sh = bh * 0.65;
            const sx = bx - sw / 2;
            const sy = headTop - sh * 0.7;
            ctx.fillStyle = '#CC0000';
            ctx.beginPath();
            ctx.moveTo(sx, sy + sh * 0.5);
            ctx.lineTo(sx + sw * 0.5, sy);
            ctx.lineTo(sx + sw, sy + sh * 0.5);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'white'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
            ctx.fillRect(sx, sy + sh * 0.45, sw, sh * 0.18);
            ctx.beginPath(); ctx.arc(sx + sw * 0.5 + sh * 0.05, sy + sh * 0.06, sh * 0.12, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'headband': {
            const hw2 = bw * 0.65;
            const hbY = eyeMidY - bh * 0.42;
            ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = bh * 0.06;
            ctx.beginPath(); ctx.moveTo(bx - hw2, hbY); ctx.lineTo(bx + hw2, hbY); ctx.stroke();
            drawBow(ctx, bx, hbY - bh * 0.03, bw * 0.22, '#FF69B4', '#FF1493');
            break;
        }

        default: break;
    }

    ctx.restore();
}

// ======================================================================
// ヘルパー描画関数
// ======================================================================

function drawTriangle(ctx, cx, tipY, w, h, fill, stroke) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, tipY - h);
    ctx.lineTo(cx - w / 2, tipY);
    ctx.lineTo(cx + w / 2, tipY);
    ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawBow(ctx, cx, cy, size, fill, dark) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(cx - size * 0.5, cy, size * 0.45, size * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + size * 0.5, cy, size * 0.45, size * 0.28,  0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2); ctx.fill();
}

// ======================================================================
// 撮影時に face-filter-canvas の内容を合成
// ======================================================================

function drawFaceFilterOnCanvas(ctx, w, h) {
    if (!faceCanvas || currentDecorationId === 'none') return;
    // face-filter-canvas のサイズが出力 canvas と違う場合は拡縮して合成
    ctx.drawImage(faceCanvas, 0, 0, w, h);
}

// ======================================================================
// UI 構築
// ======================================================================

function buildFaceFilterUI() {
    const list = document.getElementById('face-filter-list');
    if (!list) return;
    list.innerHTML = '';
    FACE_DECORATIONS.forEach(d => {
        const item = document.createElement('div');
        item.className = 'filter-item' + (d.id === currentDecorationId ? ' selected' : '');
        item.dataset.filterId = d.id;
        item.innerHTML = `<div class="filter-icon">${d.icon}</div><span class="filter-name">${d.name}</span>`;
        item.addEventListener('click', () => {
            document.querySelectorAll('#face-filter-list .filter-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            currentDecorationId = d.id;
            if (d.id === 'none') {
                stopFaceLoop();
            } else {
                faceFilterActive = true;
                startFaceLoop();
            }
        });
        list.appendChild(item);
    });
}

function setDecoration(id) {
    currentDecorationId = id;
    if (id === 'none') {
        stopFaceLoop();
    } else {
        faceFilterActive = true;
        startFaceLoop();
    }
}
