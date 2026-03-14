/**
 * ======================================================================
 * face-filter.js  – Face AR デコレーション（MediaPipe Face Mesh 468点版）
 *
 * MediaPipe Face Mesh の 468 点ランドマークを使用して
 * 顔の各パーツを高精度に追跡・描画する。
 *
 * 残デコレーション一覧（15種）
 *   👓 目元    : glasses / heart_eyes / star_eyes / round_glasses /
 *                eyepatch / nerd_glasses
 *   👃 鼻元    : pig_nose / clown_nose
 *   👄 口元    : mustache / lips_red
 *   ✨ アクセ  : monocle / flower_crown / star_stickers /
 *                butterfly_mask / diamond_tiara
 *
 * 主要ランドマークインデックス (468点中):
 *   右目中心: 159   左目中心: 386
 *   右目内端: 133   右目外端: 33    左目内端: 362   左目外端: 263
 *   鼻先:     1     鼻根:     6
 *   上唇中央: 13    下唇中央: 14    口左端: 61     口右端: 291
 *   右眉外端: 46    左眉外端: 276
 *   顔輪郭:   10(おでこ上) / 152(あご先)
 *   右こめかみ: 234  左こめかみ: 454
 * ======================================================================
 */

// ======================================================================
// カテゴリー定義
// ======================================================================

const FACE_DECORATION_CATEGORIES = [
    { id: 'none_cat',   name: 'なし',         icon: '🚫', nameKey: 'cat_none'      },
    { id: 'eyes',       name: '目元',          icon: '👓', nameKey: 'cat_eyes'      },
    { id: 'nose',       name: '鼻元',          icon: '👃', nameKey: 'cat_nose'      },
    { id: 'mouth',      name: '口元',          icon: '👄', nameKey: 'cat_mouth'     },
    { id: 'accessory',  name: 'アクセサリー',  icon: '✨', nameKey: 'cat_accessory' }
];

// ======================================================================
// デコレーション一覧（15種 + none）
// ======================================================================

const FACE_DECORATIONS = [
    { id: 'none',           name: 'なし',           icon: '🚫', category: 'none_cat' },

    // ── 目元（6種）
    { id: 'glasses',        name: 'サングラス',      icon: '😎', category: 'eyes' },
    { id: 'heart_eyes',     name: 'ハートアイ',      icon: '😍', category: 'eyes' },
    { id: 'star_eyes',      name: 'スターアイ',      icon: '🌟', category: 'eyes' },
    { id: 'round_glasses',  name: '丸眼鏡',          icon: '🔵', category: 'eyes' },
    { id: 'eyepatch',       name: 'アイパッチ',      icon: '🏴‍☠️', category: 'eyes' },
    { id: 'nerd_glasses',   name: 'ナード眼鏡',      icon: '🤓', category: 'eyes' },

    // ── 鼻元（2種）
    { id: 'pig_nose',       name: '豚鼻',            icon: '🐽', category: 'nose' },
    { id: 'clown_nose',     name: 'ピエロ鼻',        icon: '🔴', category: 'nose' },

    // ── 口元（2種）
    { id: 'mustache',       name: '口ひげ',          icon: '🥸', category: 'mouth' },
    { id: 'lips_red',       name: '赤リップ',        icon: '💋', category: 'mouth' },

    // ── アクセサリー（5種）
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
let faceMesh                = null;
let faceMeshReady           = false;
let faceCanvas              = null;
let faceCtx                 = null;
let faceAnimFrame           = null;
let faceFilterActive        = false;
let faceLoopGen             = 0;

// ======================================================================
// スムージング（複数人対応）
// ======================================================================

const MAX_TRACKED_FACES   = 5;
const SMOOTH_ALPHA        = 0.40;
const FACE_TIMEOUT_FRAMES = 8;

let trackedFaces = [];
let _nextFaceId  = 0;

function resetTrackedFaces() { trackedFaces = []; }

function smoothLandmark(state, idx, rawX, rawY) {
    const kx = 'x' + idx, ky = 'y' + idx;
    state[kx] = (state[kx] == null) ? rawX : state[kx] * (1 - SMOOTH_ALPHA) + rawX * SMOOTH_ALPHA;
    state[ky] = (state[ky] == null) ? rawY : state[ky] * (1 - SMOOTH_ALPHA) + rawY * SMOOTH_ALPHA;
    return { x: state[kx], y: state[ky] };
}

function matchAndTrack(faces) {
    const matched = new Map();
    for (const tf of trackedFaces) tf.missed++;

    const canvasMax = faceCanvas ? Math.max(faceCanvas.width, faceCanvas.height) : 500;
    const matchThreshold = canvasMax * 0.25;

    for (let fi = 0; fi < faces.length; fi++) {
        const lm = faces[fi];
        const cx = lm[1].x, cy = lm[1].y;
        let bestDist = matchThreshold, bestTF = null;

        for (const tf of trackedFaces) {
            if ([...matched.values()].includes(tf)) continue;
            const d = Math.hypot(cx - tf.cx, cy - tf.cy);
            if (d < bestDist) { bestDist = d; bestTF = tf; }
        }

        if (bestTF) {
            bestTF.cx = cx; bestTF.cy = cy; bestTF.missed = 0;
            matched.set(fi, bestTF);
        } else if (trackedFaces.length < MAX_TRACKED_FACES) {
            const newTF = { id: _nextFaceId++, cx, cy, s: {}, missed: 0 };
            trackedFaces.push(newTF);
            matched.set(fi, newTF);
        }
    }

    trackedFaces = trackedFaces.filter(tf => tf.missed < FACE_TIMEOUT_FRAMES);
    return matched;
}

// ======================================================================
// 468点ランドマーク → 描画用座標への変換
// ======================================================================

// 主要インデックス定数
const LM = {
    // 右目
    RIGHT_EYE_CENTER: 159, RIGHT_EYE_INNER: 133, RIGHT_EYE_OUTER: 33,
    RIGHT_EYE_TOP: 158, RIGHT_EYE_BOTTOM: 145,
    // 左目
    LEFT_EYE_CENTER: 386, LEFT_EYE_INNER: 362, LEFT_EYE_OUTER: 263,
    LEFT_EYE_TOP: 385, LEFT_EYE_BOTTOM: 374,
    // 眉
    RIGHT_BROW_OUTER: 46, RIGHT_BROW_INNER: 105,
    LEFT_BROW_OUTER: 276, LEFT_BROW_INNER: 334,
    // 鼻
    NOSE_TIP: 1, NOSE_BRIDGE: 6, NOSE_BOTTOM: 2,
    NOSE_RIGHT: 129, NOSE_LEFT: 358,
    // 口
    UPPER_LIP: 13, LOWER_LIP: 14, MOUTH_LEFT: 61, MOUTH_RIGHT: 291,
    UPPER_LIP_TOP: 0, LOWER_LIP_BOTTOM: 17,
    // 顔輪郭
    FOREHEAD: 10, CHIN: 152,
    RIGHT_CHEEK: 234, LEFT_CHEEK: 454,
    RIGHT_JAW: 132, LEFT_JAW: 361,
    // こめかみ（フレーム用）
    RIGHT_TEMPLE: 127, LEFT_TEMPLE: 356
};

function extractCoords(landmarks, state, W, H) {
    const p = (idx) => {
        const raw = landmarks[idx];
        const sm = smoothLandmark(state, idx, raw.x, raw.y);
        return sm;
    };

    const rEye    = p(LM.RIGHT_EYE_CENTER);
    const lEye    = p(LM.LEFT_EYE_CENTER);
    const rEyeIn  = p(LM.RIGHT_EYE_INNER);
    const rEyeOut = p(LM.RIGHT_EYE_OUTER);
    const lEyeIn  = p(LM.LEFT_EYE_INNER);
    const lEyeOut = p(LM.LEFT_EYE_OUTER);
    const rEyeT   = p(LM.RIGHT_EYE_TOP);
    const rEyeB   = p(LM.RIGHT_EYE_BOTTOM);
    const lEyeT   = p(LM.LEFT_EYE_TOP);
    const lEyeB   = p(LM.LEFT_EYE_BOTTOM);

    const rBrowO  = p(LM.RIGHT_BROW_OUTER);
    const lBrowO  = p(LM.LEFT_BROW_OUTER);

    const noseTip = p(LM.NOSE_TIP);
    const noseBr  = p(LM.NOSE_BRIDGE);
    const noseR   = p(LM.NOSE_RIGHT);
    const noseL   = p(LM.NOSE_LEFT);

    const mouthU  = p(LM.UPPER_LIP);
    const mouthD  = p(LM.LOWER_LIP);
    const mouthL  = p(LM.MOUTH_LEFT);
    const mouthR  = p(LM.MOUTH_RIGHT);
    const lipTop     = p(LM.UPPER_LIP_TOP);
    const lipBottom  = p(LM.LOWER_LIP_BOTTOM);
    const noseBottom = p(LM.NOSE_BOTTOM);

    const forehead = p(LM.FOREHEAD);
    const chin     = p(LM.CHIN);
    const rCheek   = p(LM.RIGHT_CHEEK);
    const lCheek   = p(LM.LEFT_CHEEK);
    const rTemple  = p(LM.RIGHT_TEMPLE);
    const lTemple  = p(LM.LEFT_TEMPLE);

    const rBrowIn = p(LM.RIGHT_BROW_INNER);
    const lBrowIn = p(LM.LEFT_BROW_INNER);

    const eyeMidX = (rEye.x + lEye.x) / 2;
    const eyeMidY = (rEye.y + lEye.y) / 2;
    const eyeSep  = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);

    const rEyeW = Math.hypot(rEyeIn.x - rEyeOut.x, rEyeIn.y - rEyeOut.y);
    const lEyeW = Math.hypot(lEyeIn.x - lEyeOut.x, lEyeIn.y - lEyeOut.y);
    const rEyeH = Math.hypot(rEyeT.x - rEyeB.x, rEyeT.y - rEyeB.y);
    const lEyeH = Math.hypot(lEyeT.x - lEyeB.x, lEyeT.y - lEyeB.y);

    const faceW = Math.hypot(rCheek.x - lCheek.x, rCheek.y - lCheek.y);
    const faceH = Math.hypot(forehead.x - chin.x, forehead.y - chin.y);

    const mouthW = Math.hypot(mouthL.x - mouthR.x, mouthL.y - mouthR.y);
    const mouthMidX = (mouthL.x + mouthR.x) / 2;
    const mouthMidY = (mouthU.y + mouthD.y) / 2;
    const mouthH = Math.abs(lipTop.y - lipBottom.y);

    const noseW = Math.hypot(noseR.x - noseL.x, noseR.y - noseL.y);
    const philtrumY = (noseBottom.y + lipTop.y) / 2;

    const angle = Math.atan2(lEye.y - rEye.y, lEye.x - rEye.x);

    return {
        rEye, lEye, rEyeIn, rEyeOut, lEyeIn, lEyeOut,
        rEyeT, rEyeB, lEyeT, lEyeB,
        rEyeW, lEyeW, rEyeH, lEyeH,
        rBrowO, lBrowO, rBrowIn, lBrowIn,
        noseTip, noseBr, noseR, noseL, noseW, noseBottom,
        mouthU, mouthD, mouthL, mouthR, mouthW, mouthMidX, mouthMidY, mouthH,
        lipTop, lipBottom, philtrumY,
        forehead, chin, rCheek, lCheek, rTemple, lTemple,
        eyeMidX, eyeMidY, eyeSep,
        faceW, faceH, angle,
        W, H
    };
}

// ======================================================================
// Face Mesh 検出ループ
// ======================================================================

function startFaceLoop(gen) {
    if (!faceMeshReady || !faceFilterActive || gen !== faceLoopGen) return;
    faceAnimFrame = requestAnimationFrame(async () => {
        if (gen !== faceLoopGen || !faceFilterActive) return;
        if (cameraVideo && cameraVideo.readyState >= 2) {
            syncFaceCanvas();
            try { await faceMesh.send({ image: cameraVideo }); } catch (e) { console.warn('FaceMesh send error:', e.message || e); }
        }
        if (faceFilterActive && gen === faceLoopGen) startFaceLoop(gen);
    });
}

function stopFaceLoop() {
    faceLoopGen++;
    faceFilterActive = false;
    if (faceAnimFrame) { cancelAnimationFrame(faceAnimFrame); faceAnimFrame = null; }
    if (faceCtx && faceCanvas) faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    resetTrackedFaces();
}

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
    return { scale, offsetX: (vw * scale - cw) / 2, offsetY: (vh * scale - ch) / 2, vw, vh, cw, ch };
}

// ======================================================================
// 検出結果コールバック (Face Mesh)
// ======================================================================

function onFaceMeshResults(results) {
    if (!faceCtx || !faceCanvas) return;
    faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        resetTrackedFaces();
        return;
    }
    if (currentDecorationId === 'none') return;

    const W = faceCanvas.width;
    const H = faceCanvas.height;
    const isFlipped = (currentFacingMode === 'user');

    const disp = getObjectFitCoverOffset();
    if (!disp) return;
    const { scale, offsetX, offsetY, vw, vh } = disp;

    // Face Mesh の座標は 0.0-1.0 正規化。表示ピクセルに変換
    const allFaces = results.multiFaceLandmarks.map(lms =>
        lms.map(pt => ({
            x: pt.x * vw * scale - offsetX,
            y: pt.y * vh * scale - offsetY
        }))
    );

    const matched = matchAndTrack(allFaces);

    const faceCount  = allFaces.length;
    const countScale = faceCount === 1 ? 1.0 : faceCount === 2 ? 0.90 : 0.80;
    const intensity  = faceDecorationIntensity * countScale;

    for (const [fi, tf] of matched) {
        const landmarks = allFaces[fi];
        if (!landmarks || landmarks.length < 468) continue;

        const coords = extractCoords(landmarks, tf.s, W, H);

        faceCtx.save();
        if (isFlipped) { faceCtx.translate(W, 0); faceCtx.scale(-1, 1); }

        drawDecoration(faceCtx, currentDecorationId, coords, intensity);

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
        const a = (i * Math.PI) / spikes - Math.PI / 2;
        const d = i % 2 === 0 ? outer : inner;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
                : ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// ======================================================================
// デコレーション描画ルーター（468点座標対応版）
// ======================================================================

function drawDecoration(ctx, id, c, intensity) {
    ctx.globalAlpha = Math.max(0, Math.min(1, intensity));

    const {
        rEye, lEye, rEyeIn, rEyeOut, lEyeIn, lEyeOut,
        rEyeW, lEyeW,
        rBrowO, lBrowO,
        noseTip, noseR, noseL, noseW,
        mouthU, mouthD, mouthL, mouthR, mouthW, mouthMidX, mouthMidY,
        forehead, chin, rCheek, lCheek, rTemple, lTemple,
        eyeMidX, eyeMidY, eyeSep,
        faceW, faceH, angle
    } = c;

    switch (id) {

        // ── 目元 ──────────────────────────────────────────────────

        case 'glasses': {
            const gR = eyeSep * 0.30;
            ctx.save();
            ctx.translate(eyeMidX, eyeMidY);
            ctx.rotate(angle);
            const halfSep = eyeSep / 2;
            ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = faceW * 0.025;
            ctx.fillStyle = 'rgba(20,20,20,0.52)';
            [-halfSep, halfSep].forEach(ox => {
                ctx.beginPath(); ctx.arc(ox, 0, gR, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(-halfSep + gR, 0); ctx.lineTo(halfSep - gR, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-halfSep - gR, 0); ctx.lineTo(-eyeSep * 0.72, faceW * 0.02); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(halfSep + gR, 0); ctx.lineTo(eyeSep * 0.72, faceW * 0.02); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            [-halfSep, halfSep].forEach(ox => {
                ctx.beginPath(); ctx.ellipse(ox - gR * 0.3, -gR * 0.3, gR * 0.24, gR * 0.16, -0.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();
            break;
        }

        case 'heart_eyes': {
            const hR = eyeSep * 0.26;
            [[rEye.x, rEye.y], [lEye.x, lEye.y]].forEach(([ex, ey]) => {
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
            const sR = eyeSep * 0.22;
            [[rEye.x, rEye.y], [lEye.x, lEye.y]].forEach(([ex, ey]) => {
                drawStar(ctx, ex, ey, sR, '#FFD700');
                ctx.strokeStyle = '#FF8800'; ctx.lineWidth = faceW * 0.01; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.arc(ex - sR * 0.28, ey - sR * 0.28, sR * 0.18, 0, Math.PI * 2); ctx.fill();
            });
            break;
        }

        case 'round_glasses': {
            const rgR = eyeSep * 0.28;
            ctx.save();
            ctx.translate(eyeMidX, eyeMidY);
            ctx.rotate(angle);
            const hs = eyeSep / 2;
            ctx.strokeStyle = '#A06820'; ctx.lineWidth = faceW * 0.02;
            ctx.fillStyle = 'rgba(160, 230, 255, 0.22)';
            [-hs, hs].forEach(ox => {
                ctx.beginPath(); ctx.arc(ox, 0, rgR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(-hs + rgR, 0); ctx.lineTo(hs - rgR, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-hs - rgR, 0); ctx.lineTo(-eyeSep * 0.70, faceW * 0.02); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(hs + rgR, 0); ctx.lineTo(eyeSep * 0.70, faceW * 0.02); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            [-hs, hs].forEach(ox => {
                ctx.beginPath(); ctx.ellipse(ox - rgR * 0.28, -rgR * 0.28, rgR * 0.22, rgR * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore();
            break;
        }

        case 'eyepatch': {
            const epR = eyeSep * 0.32;
            const epX = rEye.x, epY = rEye.y;
            ctx.strokeStyle = '#3a2200'; ctx.lineWidth = faceW * 0.022;
            ctx.beginPath();
            ctx.moveTo(epX + epR * 0.7, epY - epR * 0.7);
            ctx.quadraticCurveTo(forehead.x + faceW * 0.05, forehead.y - faceH * 0.02, lTemple.x, lTemple.y - faceH * 0.01);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(epX - epR * 0.7, epY - epR * 0.7);
            ctx.quadraticCurveTo(rBrowO.x - faceW * 0.08, forehead.y + faceH * 0.01, rTemple.x - faceW * 0.02, rTemple.y);
            ctx.stroke();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.arc(epX, epY, epR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = faceW * 0.018; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.ellipse(epX - epR * 0.28, epY - epR * 0.28, epR * 0.22, epR * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'nerd_glasses': {
            const ngR = eyeSep * 0.28;
            ctx.save();
            ctx.translate(eyeMidX, eyeMidY);
            ctx.rotate(angle);
            const hs2 = eyeSep / 2;
            ctx.strokeStyle = '#2244AA'; ctx.lineWidth = faceW * 0.022;
            ctx.fillStyle = 'rgba(200,230,255,0.22)';
            [-hs2, hs2].forEach(ox => {
                ctx.beginPath(); ctx.rect(ox - ngR, -ngR * 0.7, ngR * 2, ngR * 1.4); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath(); ctx.ellipse(ox - ngR * 0.3, -ngR * 0.2, ngR * 0.22, ngR * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(200,230,255,0.22)';
            });
            ctx.beginPath(); ctx.moveTo(-hs2 + ngR, 0); ctx.lineTo(hs2 - ngR, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-hs2 - ngR, 0); ctx.lineTo(-eyeSep * 0.70, faceW * 0.02); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(hs2 + ngR, 0); ctx.lineTo(eyeSep * 0.70, faceW * 0.02); ctx.stroke();
            ctx.restore();
            break;
        }

        // ── 鼻元 ──────────────────────────────────────────────────

        case 'pig_nose': {
            const pnRx = noseW * 0.70;
            const pnRy = pnRx * 0.65;
            const pnX = noseTip.x;
            const pnY = (noseTip.y + noseBottom.y) / 2;
            ctx.fillStyle = '#FF8DA0';
            ctx.beginPath(); ctx.ellipse(pnX, pnY, pnRx, pnRy, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FF6070'; ctx.lineWidth = faceW * 0.014; ctx.stroke();
            ctx.fillStyle = 'rgba(120,40,60,0.72)';
            const nh = noseW * 0.22;
            [[-pnRx * 0.36, 0], [pnRx * 0.36, 0]].forEach(([ox, oy]) => {
                ctx.beginPath(); ctx.ellipse(pnX + ox, pnY + oy, nh, nh * 0.82, 0, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.beginPath(); ctx.ellipse(pnX - pnRx * 0.3, pnY - pnRy * 0.35, pnRx * 0.2, pnRy * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'clown_nose': {
            const cnR = noseW * 0.55;
            const grad = ctx.createRadialGradient(noseTip.x - cnR * 0.3, noseTip.y - cnR * 0.3, 0, noseTip.x, noseTip.y, cnR);
            grad.addColorStop(0, '#FF3030'); grad.addColorStop(1, '#CC0000');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(noseTip.x, noseTip.y, cnR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.32)';
            ctx.beginPath(); ctx.ellipse(noseTip.x - cnR * 0.3, noseTip.y - cnR * 0.3, cnR * 0.28, cnR * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ── 口元 ──────────────────────────────────────────────────

        case 'mustache': {
            const muW = mouthW * 0.85, muH = faceH * 0.05;
            const muX = mouthMidX, muY = philtrumY + faceH * 0.01;
            ctx.fillStyle = '#2A1A0A';
            ctx.beginPath();
            ctx.moveTo(muX, muY);
            ctx.bezierCurveTo(muX - muW * 0.10, muY - muH,        muX - muW * 0.50, muY - muH * 0.80, muX - muW * 0.52, muY + muH * 0.30);
            ctx.bezierCurveTo(muX - muW * 0.40, muY + muH * 1.10, muX - muW * 0.12, muY + muH * 0.50, muX,              muY + muH * 0.30);
            ctx.bezierCurveTo(muX + muW * 0.12, muY + muH * 0.50, muX + muW * 0.40, muY + muH * 1.10, muX + muW * 0.52, muY + muH * 0.30);
            ctx.bezierCurveTo(muX + muW * 0.50, muY - muH * 0.80, muX + muW * 0.10, muY - muH,        muX,              muY);
            ctx.closePath(); ctx.fill();
            break;
        }

        case 'lips_red': {
            const lpW = mouthW * 0.53;
            const lpH = Math.max(mouthH * 0.50, faceH * 0.03);
            const lpX = mouthMidX;
            const lpUpperY = mouthU.y;
            const lpLowerY = mouthD.y;
            const lpMidY = (lpUpperY + lpLowerY) / 2;
            ctx.fillStyle = '#C00020';
            ctx.beginPath();
            ctx.moveTo(lpX - lpW, lpMidY);
            ctx.bezierCurveTo(lpX - lpW * 0.55, lpUpperY - lpH * 0.9, lpX - lpW * 0.18, lpUpperY - lpH * 1.2, lpX, lpUpperY - lpH * 0.3);
            ctx.bezierCurveTo(lpX + lpW * 0.18, lpUpperY - lpH * 1.2, lpX + lpW * 0.55, lpUpperY - lpH * 0.9, lpX + lpW, lpMidY);
            ctx.bezierCurveTo(lpX + lpW * 0.40, lpMidY + lpH * 0.1, lpX - lpW * 0.40, lpMidY + lpH * 0.1, lpX - lpW, lpMidY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#E0003A';
            ctx.beginPath();
            ctx.moveTo(lpX - lpW, lpMidY);
            ctx.bezierCurveTo(lpX - lpW * 0.45, lpLowerY + lpH * 0.6, lpX + lpW * 0.45, lpLowerY + lpH * 0.6, lpX + lpW, lpMidY);
            ctx.bezierCurveTo(lpX + lpW * 0.40, lpMidY + lpH * 0.15, lpX - lpW * 0.40, lpMidY + lpH * 0.15, lpX - lpW, lpMidY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,180,180,0.25)';
            ctx.beginPath(); ctx.ellipse(lpX - lpW * 0.25, lpUpperY - lpH * 0.1, lpW * 0.15, lpH * 0.3, -0.2, 0, Math.PI * 2); ctx.fill();
            break;
        }

        // ── アクセサリー ──────────────────────────────────────────

        case 'monocle': {
            const moR = eyeSep * 0.30;
            ctx.strokeStyle = '#C8A83C'; ctx.lineWidth = faceW * 0.025;
            ctx.fillStyle = 'rgba(200,230,200,0.18)';
            ctx.beginPath(); ctx.arc(rEye.x, rEye.y, moR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#B8962A'; ctx.lineWidth = faceW * 0.012;
            ctx.setLineDash([faceW * 0.015, faceW * 0.01]);
            const chainEndX = rCheek.x + faceW * 0.03;
            const chainEndY = chin.y - faceH * 0.08;
            ctx.beginPath();
            ctx.moveTo(rEye.x + moR * 0.5, rEye.y + moR * 0.85);
            ctx.bezierCurveTo(rEye.x + moR, rCheek.y, rCheek.x + faceW * 0.06, rCheek.y + faceH * 0.08, chainEndX, chainEndY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.ellipse(rEye.x - moR * 0.3, rEye.y - moR * 0.3, moR * 0.22, moR * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'flower_crown': {
            const fcY = forehead.y - faceH * 0.07;
            const crownW = faceW * 0.72;
            const colors6 = ['#FF6B9E', '#FF9A3C', '#FFD700', '#6BD96B', '#6BAAFF', '#D06BFF'];
            for (let i = 0; i < 9; i++) {
                const t = i / 8;
                const fx = eyeMidX - crownW / 2 + crownW * t;
                const fy = fcY + Math.sin(t * Math.PI) * faceH * 0.03;
                const fr = faceW * 0.045;
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
            const stars = [
                [rBrowO.x, rBrowO.y - faceH * 0.06, '#FFD700', faceW * 0.05],
                [lBrowO.x, lBrowO.y - faceH * 0.06, '#FFD700', faceW * 0.05],
                [rCheek.x - faceW * 0.06, rCheek.y, '#FF88FF', faceW * 0.04],
                [lCheek.x + faceW * 0.06, lCheek.y, '#FF88FF', faceW * 0.04],
                [eyeMidX, forehead.y - faceH * 0.06, '#44DDFF', faceW * 0.045],
                [rTemple.x, forehead.y, '#FF8800', faceW * 0.035],
                [lTemple.x, forehead.y, '#FF8800', faceW * 0.035]
            ];
            stars.forEach(([sx, sy, sc, sr]) => {
                drawStar(ctx, sx, sy, sr, sc);
                ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = faceW * 0.01;
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
            const bmH = faceH * 0.12;
            const bmSpanX = faceW * 0.42;
            const bmY = eyeMidY;
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
                ctx.strokeStyle = 'rgba(200,100,255,0.6)'; ctx.lineWidth = faceW * 0.012; ctx.stroke();
            };
            drawWing(eyeMidX, -1); drawWing(eyeMidX, 1);
            ctx.fillStyle = 'rgba(80,10,130,0.88)';
            ctx.beginPath(); ctx.ellipse(eyeMidX, bmY, eyeSep * 0.22, bmH * 0.28, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'diamond_tiara': {
            const dtY = forehead.y - faceH * 0.02;
            const dtW = faceW * 0.65;
            const bandGrad = ctx.createLinearGradient(eyeMidX - dtW / 2, dtY, eyeMidX + dtW / 2, dtY);
            bandGrad.addColorStop(0, '#B8860B'); bandGrad.addColorStop(0.5, '#FFD700'); bandGrad.addColorStop(1, '#B8860B');
            ctx.save();
            ctx.translate(eyeMidX, dtY);
            ctx.rotate(angle);
            ctx.fillStyle = bandGrad;
            ctx.beginPath(); ctx.rect(-dtW / 2, -faceH * 0.02, dtW, faceH * 0.04); ctx.fill();
            ctx.strokeStyle = '#8B6914'; ctx.lineWidth = faceW * 0.01; ctx.stroke();
            const drawDiamond = (dx, dy, dw, dh) => {
                ctx.fillStyle = '#B0E8FF';
                ctx.beginPath(); ctx.moveTo(dx, dy - dh); ctx.lineTo(dx + dw, dy);
                ctx.lineTo(dx, dy + dh * 0.6); ctx.lineTo(dx - dw, dy); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#88CCFF'; ctx.lineWidth = faceW * 0.008; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath(); ctx.moveTo(dx - dw * 0.4, dy - dh * 0.5);
                ctx.lineTo(dx, dy - dh); ctx.lineTo(dx + dw * 0.4, dy - dh * 0.5); ctx.closePath(); ctx.fill();
            };
            drawDiamond(0, -faceH * 0.06, faceW * 0.06, faceH * 0.09);
            drawDiamond(-dtW * 0.30, -faceH * 0.02, faceW * 0.04, faceH * 0.06);
            drawDiamond(dtW * 0.30, -faceH * 0.02, faceW * 0.04, faceH * 0.06);
            drawDiamond(-dtW * 0.48, faceH * 0.01, faceW * 0.028, faceH * 0.04);
            drawDiamond(dtW * 0.48, faceH * 0.01, faceW * 0.028, faceH * 0.04);
            ctx.fillStyle = '#FFD700';
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath(); ctx.arc((dtW * 0.12) * i, 0, faceW * 0.014, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            break;
        }

        default: break;
    }

    ctx.globalAlpha = 1.0;
}

// ======================================================================
// 初期化（MediaPipe Face Mesh）
// ======================================================================

async function initFaceFilter() {
    faceCanvas = document.getElementById('face-filter-canvas');
    if (!faceCanvas) return;
    faceCtx = faceCanvas.getContext('2d');

    if (faceMeshReady) return;
    if (faceMesh) return;

    if (typeof FaceMesh === 'undefined') {
        console.warn('MediaPipe FaceMesh not loaded. Face filters unavailable.');
        return;
    }
    try {
        faceMesh = new FaceMesh({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
        });
        faceMesh.setOptions({
            maxNumFaces: MAX_TRACKED_FACES,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        faceMesh.onResults(onFaceMeshResults);
        await faceMesh.initialize();
        faceMeshReady = true;
        console.log('FaceMesh (468 landmarks) initialized');
    } catch (err) {
        console.error('FaceMesh init error:', err);
        faceMesh = null;
        faceMeshReady = false;
    }
}

// ======================================================================
// Face AR UI ビルダー
// ======================================================================

function buildFaceFilterUI() {
    const container = document.getElementById('face-filter-list');
    if (!container) return;
    container.innerHTML = '';

    const _t = (key, fallback) => (typeof t === 'function') ? t(key) : fallback;

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

    FACE_DECORATION_CATEGORIES.forEach(cat => {
        const items = FACE_DECORATIONS.filter(d => d.category === cat.id);
        if (items.length === 0) return;

        if (cat.id !== 'none_cat') {
            const hdr = document.createElement('div');
            hdr.className = 'face-filter-cat-header';
            const catLabel = cat.nameKey ? _t(cat.nameKey, cat.name) : cat.name;
            hdr.textContent = `${cat.icon} ${catLabel}`;
            container.appendChild(hdr);
        }

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

function selectFaceDecoration(id) {
    currentDecorationId = id;
    if (typeof trackFaceDecoUse === 'function') trackFaceDecoUse(id);

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

    faceLoopGen++;
    const myGen = faceLoopGen;

    if (faceAnimFrame) { cancelAnimationFrame(faceAnimFrame); faceAnimFrame = null; }
    faceFilterActive = true;
    resetTrackedFaces();

    if (faceMeshReady) {
        startFaceLoop(myGen);
    } else {
        initFaceFilter().then(() => {
            if (faceFilterActive && faceMeshReady && myGen === faceLoopGen) {
                startFaceLoop(myGen);
            }
        });
    }
}

function getCurrentDecorationId() { return currentDecorationId; }
