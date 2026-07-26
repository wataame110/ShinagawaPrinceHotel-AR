/**
 * ======================================================================
 * フィルターモジュール (filter.js)
 * 写真撮影前後に適用できる画像効果フィルターを管理する
 *
 * リアルタイムプレビュー: CSS filter を video 要素に適用
 * 撮影時:               Canvas 2D API + ピクセル操作で合成
 * ======================================================================
 */

/**
 * 利用可能なフィルター定義
 * cssFilter : リアルタイムプレビュー用 CSS filter 文字列（強め設定）
 * apply     : 撮影 Canvas に追加処理するコールバック（null = CSS のみ）
 */
const FILTERS = [
    {
        id: 'none',
        name: 'なし',
        icon: '⬜',
        cssFilter: 'none',
        apply: null
    },
    {
        id: 'film',
        name: 'フィルム風',
        icon: '🎞',
        cssFilter: 'contrast(1.5) saturate(0.72) brightness(0.85) sepia(38%)',
        apply: (ctx, w, h) => {
            applyGrain(ctx, w, h, 44, true);
            applyVignette(ctx, w, h, 0.58);
        }
    },
    {
        id: 'mono',
        name: 'モノクロ',
        icon: '⬛',
        cssFilter: 'grayscale(100%) contrast(1.8) brightness(1.05)',
        apply: (ctx, w, h) => applyVignette(ctx, w, h, 0.62)
    },
    {
        id: 'sepia',
        name: 'セピア',
        icon: '🟫',
        cssFilter: 'sepia(100%) contrast(1.32) brightness(0.84) saturate(1.55)',
        apply: (ctx, w, h) => {
            applyGrain(ctx, w, h, 22, false);
            applyVignette(ctx, w, h, 0.52);
        }
    },
    {
        id: 'soft',
        name: 'ソフト/グロウ',
        icon: '✨',
        cssFilter: 'brightness(1.42) saturate(1.65) contrast(0.76)',
        apply: (ctx, w, h) => applyGlow(ctx, w, h)
    },
    {
        id: 'warm',
        name: 'フィルム（温）',
        icon: '🌅',
        cssFilter: 'sepia(58%) saturate(2.4) hue-rotate(-22deg) brightness(1.14) contrast(1.1)',
        apply: (ctx, w, h) => applyVignette(ctx, w, h, 0.42)
    },
    {
        id: 'cool',
        name: 'フィルム（冷）',
        icon: '🧊',
        cssFilter: 'brightness(1.08) contrast(1.22) saturate(0.78)',
        apply: (ctx, w, h) => {
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            const t = currentFilterIntensity;
            for (let i = 0; i < d.length; i += 4) {
                d[i]     = Math.max(0, Math.min(255, d[i]     - 22 * t));
                d[i + 1] = Math.max(0, Math.min(255, d[i + 1] - 6 * t));
                d[i + 2] = Math.min(255, d[i + 2] + 30 * t);
            }
            ctx.putImageData(imageData, 0, 0);
            applyVignette(ctx, w, h, 0.38 * t);
        }
    },
    {
        id: 'watercolor',
        name: '水彩',
        icon: '🎨',
        cssFilter: 'saturate(2.5) brightness(1.2) contrast(0.7)',
        apply: (ctx, w, h) => applyWatercolor(ctx, w, h)
    },
    {
        id: 'noise',
        name: 'ノイズ/テクスチャ',
        icon: '📺',
        cssFilter: 'contrast(1.38) brightness(0.88) saturate(0.65)',
        apply: (ctx, w, h) => applyGrain(ctx, w, h, 72, false)
    },
    {
        id: 'sketch',
        name: 'スケッチ',
        icon: '✏️',
        cssFilter: 'grayscale(100%) contrast(2.3) brightness(1.22)',
        apply: (ctx, w, h) => applySketch(ctx, w, h)
    }
];

let currentFilterId = 'none';
let currentFilterIntensity = 0.5; // 0.0〜1.0（デフォルト50%）

/**
 * 画像調整パラメータ（各 0〜100、50 = ニュートラル）
 * カラーフィルターと独立して併用可能
 */
let imageAdjustments = {
    brightness: 50,   // 明るさ:       ガンマカーブで知覚的に均一な調整
    contrast:   50,   // コントラスト:  S曲線で自然なトーンカーブ調整
    highlights: 50,   // ハイライト:    明部のみ smoothstep 重みで色比率保持調整
    shadows:    50,   // シャドウ:      暗部のみ smoothstep 重みで色比率保持調整
    exposure:   50,   // 露出度:        リニア光空間で EV stops ベースの物理的露出
    detail:     50    // ディテール:    <50=エッジ保持スムージング, >50=アンシャープマスク
};

// ======================================================================
// フィルター取得・設定
// ======================================================================

function getCurrentFilter() {
    return FILTERS.find(f => f.id === currentFilterId) || FILTERS[0];
}

function setFilter(filterId) {
    currentFilterId = filterId;
    applyFilterToPreview();
    if (typeof trackFilterUse === 'function') {
        var f = FILTERS.find(function(x){ return x.id === filterId; });
        trackFilterUse(f ? f.name : filterId);
    }
}

/**
 * CSS filter 文字列を強度スケール (0〜1) に合わせてスケールする
 * - identity 値（contrast:1, brightness:1, saturate:1, grayscale:0, sepia:0 等）からの差分を intensity 倍
 */
function scaleCSSFilter(filterStr, intensity) {
    if (!filterStr || filterStr === 'none') return filterStr;
    if (intensity >= 1.0) return filterStr;
    if (intensity <= 0.0) return 'none';
    const IDENTITY = { contrast: 1, brightness: 1, saturate: 1, grayscale: 0, sepia: 0, invert: 0, blur: 0, 'hue-rotate': 0 };
    return filterStr.replace(/([\w-]+)\(([^)]+)\)/g, (match, fn, valStr) => {
        const idVal = IDENTITY[fn];
        if (idVal === undefined) return match;
        const v = parseFloat(valStr);
        const unit = valStr.replace(/^[\d.\s-]+/, '');
        const scaled = idVal + (v - idVal) * intensity;
        return `${fn}(${scaled.toFixed(4)}${unit})`;
    });
}

// ======================================================================
// リアルタイムプレビュー（video 要素の CSS filter を更新）
// カラーフィルター + 画像調整の両方を反映
// ======================================================================

function applyFilterToPreview() {
    if (!cameraVideo) return;
    const filter = getCurrentFilter();
    let css = scaleCSSFilter(filter.cssFilter, currentFilterIntensity);

    // 画像調整の CSS を追加
    const adjCSS = _getAdjustmentCSSString();
    if (adjCSS) {
        css = (css && css !== 'none') ? css + ' ' + adjCSS : adjCSS;
    }

    cameraVideo.style.filter = (!css || css === 'none') ? '' : css;
}

/**
 * 画像調整パラメータを CSS filter 文字列に変換（プレビュー用近似）
 * 撮影時はピクセル操作で高精度に適用されるため、CSS はリアルタイム確認用
 */
function _getAdjustmentCSSString() {
    var a = imageAdjustments;
    if (a.brightness === 50 && a.contrast === 50 && a.exposure === 50 &&
        a.highlights === 50 && a.shadows === 50) return '';

    var parts = [];

    // 露出度: EV stops（リニア光空間の乗算を CSS brightness で近似）
    if (a.exposure !== 50) {
        parts.push('brightness(' + Math.pow(2, (a.exposure - 50) / 12.5).toFixed(4) + ')');
    }
    // 明るさ: ガンマカーブを CSS brightness で近似 (0→0.35, 50→1.0, 100→1.65)
    if (a.brightness !== 50) {
        parts.push('brightness(' + (0.35 + a.brightness * 0.013).toFixed(4) + ')');
    }
    // コントラスト: S曲線を CSS contrast で近似
    if (a.contrast !== 50) {
        var cStr = (a.contrast - 50) / 50;
        var cMul = cStr >= 0 ? 1.0 + cStr * 1.4 : 1.0 + cStr * 0.6;
        parts.push('contrast(' + cMul.toFixed(4) + ')');
    }
    // ハイライト・シャドウ: CSSでは正確に表現不可（撮影時にピクセル操作で高精度適用）

    return parts.join(' ');
}

// ======================================================================
// Canvas 描画時のフィルター文字列を返す
// captureImage() 内で ctx.filter に設定して drawImage() する前に使う
// ======================================================================

function getCanvasFilterString() {
    const filter = getCurrentFilter();
    let css = scaleCSSFilter(filter.cssFilter, currentFilterIntensity) || 'none';
    const adjCSS = _getAdjustmentCSSString();
    if (adjCSS) {
        css = (css && css !== 'none') ? css + ' ' + adjCSS : adjCSS;
    }
    return css || 'none';
}

// ======================================================================
// ピクセル操作フィルター群
// ======================================================================

/**
 * フィルムグレイン（ランダムノイズ）を追加
 * @param {boolean} colorGrain - true でチャンネル独立ノイズ（フィルム粒子らしい）
 */
function applyGrain(ctx, w, h, intensity, colorGrain) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const base = (Math.random() - 0.5) * intensity * 2;
        if (colorGrain) {
            data[i]     = Math.min(255, Math.max(0, data[i]     + base + (Math.random() - 0.5) * intensity * 0.6));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + base + (Math.random() - 0.5) * intensity * 0.6));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + base + (Math.random() - 0.5) * intensity * 0.6));
        } else {
            data[i]     = Math.min(255, Math.max(0, data[i]     + base));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + base));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + base));
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

/**
 * 周辺減光（ヴィネット）効果 — 四隅を暗くする
 * @param {number} strength 0.0 〜 1.0（大きいほど強い）
 */
function applyVignette(ctx, w, h, strength) {
    const cx = w / 2, cy = h / 2;
    const inner = Math.min(cx, cy) * 0.5;
    const outer = Math.sqrt(cx * cx + cy * cy) * 1.05;
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, strength)})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

/**
 * グロウ（光溢れ）効果 — 複数ブラーレイヤーを screen ブレンドで重ねる
 */
function applyGlow(ctx, w, h) {
    const snapshot = ctx.getImageData(0, 0, w, h);
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tCtx = tmp.getContext('2d');
    tCtx.putImageData(snapshot, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    ctx.filter = 'blur(20px) brightness(1.7)';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(tmp, 0, 0);

    ctx.filter = 'blur(9px) brightness(1.4)';
    ctx.globalAlpha = 0.32;
    ctx.drawImage(tmp, 0, 0);

    ctx.filter = 'blur(3px) brightness(1.15)';
    ctx.globalAlpha = 0.18;
    ctx.drawImage(tmp, 0, 0);

    ctx.restore();
}

/**
 * 水彩絵の具風 — CSS blur でソフト化後、彩度をピクセル単位で強調
 */
function applyWatercolor(ctx, w, h) {
    const snapshot = ctx.getImageData(0, 0, w, h);
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d').putImageData(snapshot, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.filter = 'blur(5px)';
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';

    const blurred = ctx.getImageData(0, 0, w, h);
    const data = blurred.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const avg = (r + g + b) / 3;
        data[i]     = Math.min(255, Math.round(avg + (r - avg) * 1.9));
        data[i + 1] = Math.min(255, Math.round(avg + (g - avg) * 1.9));
        data[i + 2] = Math.min(255, Math.round(avg + (b - avg) * 1.9));
    }
    ctx.putImageData(blurred, 0, 0);

    applyGrain(ctx, w, h, 7, false);
}

/**
 * スケッチ — Sobel エッジ検出（RGB平均でグレイスケール化してからソベル演算）
 */
function applySketch(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);
    const stride = w * 4;
    const gray = (idx) => (copy[idx] + copy[idx + 1] + copy[idx + 2]) / 3;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4;
            const tl = gray(i - stride - 4), tc = gray(i - stride), tr = gray(i - stride + 4);
            const ml = gray(i - 4),                                  mr = gray(i + 4);
            const bl = gray(i + stride - 4), bc = gray(i + stride), br = gray(i + stride + 4);
            const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
            const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
            const edge = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 1.6);
            const val  = Math.max(0, 255 - edge * 2.8);
            data[i] = data[i + 1] = data[i + 2] = val;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// ======================================================================
// Canvas 撮影時用: ピクセル操作で全フィルター効果を確実に適用
// iOS Safari 等 ctx.filter 非対応ブラウザでも動作する
// ======================================================================

function applyFilterToCanvas(ctx, w, h) {
    const filter = getCurrentFilter();
    if (filter && filter.id !== 'none') {
        if (filter.cssFilter && filter.cssFilter !== 'none') {
            _applyCSSAsPixels(ctx, w, h, filter.cssFilter);
        }
        if (typeof filter.apply === 'function') {
            filter.apply(ctx, w, h);
        }
    }
    // 画像調整（明るさ・コントラスト・ハイライト・シャドウ・露出度）
    _applyAdjustmentsToPixels(ctx, w, h);
}

/**
 * 画像調整パラメータをピクセル操作で Canvas に適用（高精度版）
 *
 * 処理パイプライン:
 *   1. ディテール（エッジ保持スムージング / アンシャープマスク）
 *   2. 露出（sRGB→リニア光→EV乗算→sRGB: 物理的に正確）
 *   3. 明るさ（ガンマカーブ: 知覚的に均一）
 *   4. コントラスト（ピースワイズ・パワーS曲線: 白飛び・黒つぶれ防止）
 *   5. ハイライト（smoothstep重み + 色比率保持: 明部のみ自然に調整）
 *   6. シャドウ（smoothstep重み + 色比率保持: 暗部のみ自然に調整）
 *
 * 手順 2-4 は 256 エントリの LUT で一括処理し高速化。
 */
function _applyAdjustmentsToPixels(ctx, w, h) {
    var a = imageAdjustments;
    var needTone = (a.brightness !== 50 || a.contrast !== 50 ||
                    a.highlights !== 50 || a.shadows !== 50 || a.exposure !== 50);
    var needDetail = (a.detail !== 50);

    if (!needTone && !needDetail) return;

    // ── Step 1: ディテール ──
    if (needDetail) _applyDetail(ctx, w, h, a.detail);
    if (!needTone) return;

    var imageData = ctx.getImageData(0, 0, w, h);
    var d = imageData.data;
    var len = d.length;

    // ── パラメータ算出 ──
    var eStops = (a.exposure - 50) / 12.5;                              // -4.0〜+4.0 EV
    var eMul   = Math.pow(2, eStops);                                    // 露出乗数
    var bGamma = 1.0 / Math.max(0.08, 1.0 + (a.brightness - 50) / 62.5); // 明るさガンマ
    var cStr   = (a.contrast - 50) / 50;                                 // S曲線強度
    var hStr   = (a.highlights - 50) / 50;                               // ハイライト
    var sStr   = (a.shadows - 50) / 50;                                  // シャドウ

    // ── 統合 LUT（256エントリ）: sRGB→リニア→露出→sRGB→明るさ→コントラスト ──
    var lut = new Uint8Array(256);
    for (var v = 0; v < 256; v++) {
        var srgb = v / 255.0;

        // sRGB → リニア光（IEC 61966-2-1 準拠）
        var lin = srgb <= 0.04045
            ? srgb / 12.92
            : Math.pow((srgb + 0.055) / 1.055, 2.4);

        // 露出（リニア光空間で乗算 = 実際のカメラセンサーと同等）
        lin = Math.max(0, Math.min(1, lin * eMul));

        // リニア → sRGB
        var sg = lin <= 0.0031308
            ? lin * 12.92
            : 1.055 * Math.pow(lin, 1.0 / 2.4) - 0.055;
        sg = Math.max(0, Math.min(1, sg));

        // 明るさ（知覚的ガンマカーブ — Lightroom の Brightness に近い挙動）
        sg = Math.pow(sg, bGamma);

        // コントラスト（ピースワイズ・パワー S曲線 — 端部を保護しつつ中間調を調整）
        if (cStr !== 0) sg = _adjSCurve(sg, cStr);

        lut[v] = Math.max(0, Math.min(255, (sg * 255 + 0.5) | 0));
    }

    // ── ハイライト・シャドウ ──
    var needHS = (hStr !== 0 || sStr !== 0);

    // ── ピクセルループ ──
    for (var i = 0; i < len; i += 4) {
        var r = lut[d[i]];
        var g = lut[d[i + 1]];
        var b = lut[d[i + 2]];

        if (needHS) {
            var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;  // BT.709
            var lumN = lum / 255.0;

            if (hStr !== 0) {
                // ハイライト: 上位階調に smoothstep (0.25→0.85) で滑らかに遷移
                // 二乗で先端に集中させ「明るい部分だけ」を正確にターゲット
                var hW = _adjSmoothstep(0.25, 0.85, lumN);
                hW *= hW;
                var hAmount = hStr * 120 * hW;
                if (lum > 1) {
                    var hRatio = Math.max(0, Math.min(3, (lum + hAmount) / lum));
                    r *= hRatio; g *= hRatio; b *= hRatio;
                } else {
                    r += hAmount * 0.35; g += hAmount * 0.35; b += hAmount * 0.35;
                }
            }

            if (sStr !== 0) {
                // シャドウ: 下位階調に smoothstep (0.15→0.75) の逆で滑らかに遷移
                // 二乗で底部に集中させ「暗い部分だけ」を正確にターゲット
                var sW = 1.0 - _adjSmoothstep(0.15, 0.75, lumN);
                sW *= sW;
                var sAmount = sStr * 120 * sW;
                lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                if (lum > 1) {
                    var sRatio = Math.max(0, Math.min(3, (lum + sAmount) / lum));
                    r *= sRatio; g *= sRatio; b *= sRatio;
                } else {
                    r += sAmount * 0.4; g += sAmount * 0.4; b += sAmount * 0.4;
                }
            }
        }

        d[i]     = r > 255 ? 255 : r < 0 ? 0 : (r + 0.5) | 0;
        d[i + 1] = g > 255 ? 255 : g < 0 ? 0 : (g + 0.5) | 0;
        d[i + 2] = b > 255 ? 255 : b < 0 ? 0 : (b + 0.5) | 0;
    }

    ctx.putImageData(imageData, 0, 0);
}

/**
 * ピースワイズ・パワー S曲線
 * 0.5 を境に上下でパワー関数を適用。端部の白飛び・黒つぶれを防ぐ。
 * @param {number} x - 0〜1
 * @param {number} strength - -1.0(平坦化)〜+1.0(急峻化)
 */
function _adjSCurve(x, strength) {
    var gamma = strength >= 0
        ? Math.max(0.15, 1.0 - strength * 0.75)   // 0.25〜1.0
        : 1.0 - strength * 1.8;                     // 1.0〜2.8
    return x <= 0.5
        ? 0.5 * Math.pow(2.0 * x, gamma)
        : 1.0 - 0.5 * Math.pow(2.0 * (1.0 - x), gamma);
}

/**
 * GLSL smoothstep 互換 — エルミート補間 (edge0→edge1 で 0→1)
 */
function _adjSmoothstep(edge0, edge1, x) {
    var t = (x - edge0) / (edge1 - edge0);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3.0 - 2.0 * t);
}

/**
 * ディテール調整
 * < 50: エッジ保持スムージング（肌荒れ軽減。エッジ部分は保持し肌面だけ平滑化）
 * = 50: 無変化
 * > 50: アンシャープマスク（ディテール・テクスチャ強調）
 */
function _applyDetail(ctx, w, h, detailValue) {
    if (detailValue === 50) return;

    var original = ctx.getImageData(0, 0, w, h);
    var tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(original, 0, 0);

    if (detailValue < 50) {
        // ── エッジ保持スムージング ──
        var smoothAmt = (50 - detailValue) / 50;   // 0〜1
        var blurPx = Math.max(1, Math.round(smoothAmt * 6));

        ctx.save();
        ctx.filter = 'blur(' + blurPx + 'px)';
        ctx.drawImage(tmp, 0, 0);
        ctx.filter = 'none';
        ctx.restore();

        var blurred = ctx.getImageData(0, 0, w, h);
        var od = original.data, bd = blurred.data;
        var blend = smoothAmt * 0.88;
        var edgeThreshold = 20 + smoothAmt * 15; // 強スムージング時はエッジ閾値を上げる

        for (var i = 0; i < od.length; i += 4) {
            var oL = 0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2];
            var bL = 0.299 * bd[i] + 0.587 * bd[i + 1] + 0.114 * bd[i + 2];
            // エッジ強度が高いほどスムージングを抑制（輪郭・髪の毛を保護）
            var edge = Math.min(1, Math.abs(oL - bL) / edgeThreshold);
            var eff = blend * (1 - edge);
            bd[i]     = od[i]     + (bd[i]     - od[i])     * eff;
            bd[i + 1] = od[i + 1] + (bd[i + 1] - od[i + 1]) * eff;
            bd[i + 2] = od[i + 2] + (bd[i + 2] - od[i + 2]) * eff;
        }
        ctx.putImageData(blurred, 0, 0);
    } else {
        // ── アンシャープマスク（シャープン）──
        var sharpAmt = (detailValue - 50) / 50;    // 0〜1
        var sharpPx = Math.max(1, Math.round(sharpAmt * 3));

        ctx.save();
        ctx.filter = 'blur(' + sharpPx + 'px)';
        ctx.drawImage(tmp, 0, 0);
        ctx.filter = 'none';
        ctx.restore();

        var blurred = ctx.getImageData(0, 0, w, h);
        var od = original.data, bd = blurred.data;
        var strength = sharpAmt * 2.2;

        for (var i = 0; i < od.length; i += 4) {
            bd[i]     = Math.min(255, Math.max(0, od[i]     + (od[i]     - bd[i])     * strength));
            bd[i + 1] = Math.min(255, Math.max(0, od[i + 1] + (od[i + 1] - bd[i + 1]) * strength));
            bd[i + 2] = Math.min(255, Math.max(0, od[i + 2] + (od[i + 2] - bd[i + 2]) * strength));
        }
        ctx.putImageData(blurred, 0, 0);
    }
}

function _applyCSSAsPixels(ctx, w, h, filterStr) {
    const t = currentFilterIntensity;
    if (t <= 0) return;
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const len = d.length;
    const ops = [];
    filterStr.replace(/([\w-]+)\(([^)]+)\)/g, (_, fn, val) => {
        ops.push({ fn, val: parseFloat(val), pct: val.indexOf('%') !== -1 });
    });
    for (const op of ops) {
        const v = _scaleToIdentity(op.fn, op.val, t);
        switch (op.fn) {
            case 'brightness':  _pxBrightness(d, len, v); break;
            case 'contrast':    _pxContrast(d, len, v); break;
            case 'saturate':    _pxSaturate(d, len, v); break;
            case 'grayscale':   _pxGrayscale(d, len, op.pct ? v / 100 : v); break;
            case 'sepia':       _pxSepia(d, len, op.pct ? v / 100 : v); break;
            case 'hue-rotate':  _pxHueRotate(d, len, v); break;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function _scaleToIdentity(fn, v, t) {
    var id = { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, 'hue-rotate': 0 }[fn];
    return id === undefined ? v : id + (v - id) * t;
}
function _pxBrightness(d, len, v) {
    for (var i = 0; i < len; i += 4) {
        d[i] = Math.min(255, d[i] * v);
        d[i+1] = Math.min(255, d[i+1] * v);
        d[i+2] = Math.min(255, d[i+2] * v);
    }
}
function _pxContrast(d, len, v) {
    for (var i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, Math.max(0, (d[i]   - 128) * v + 128));
        d[i+1] = Math.min(255, Math.max(0, (d[i+1] - 128) * v + 128));
        d[i+2] = Math.min(255, Math.max(0, (d[i+2] - 128) * v + 128));
    }
}
function _pxSaturate(d, len, v) {
    for (var i = 0; i < len; i += 4) {
        var g = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        d[i]   = Math.min(255, Math.max(0, g + v * (d[i]   - g)));
        d[i+1] = Math.min(255, Math.max(0, g + v * (d[i+1] - g)));
        d[i+2] = Math.min(255, Math.max(0, g + v * (d[i+2] - g)));
    }
}
function _pxGrayscale(d, len, amt) {
    amt = Math.min(1, Math.max(0, amt));
    for (var i = 0; i < len; i += 4) {
        var g = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        d[i]   = d[i]   + (g - d[i])   * amt;
        d[i+1] = d[i+1] + (g - d[i+1]) * amt;
        d[i+2] = d[i+2] + (g - d[i+2]) * amt;
    }
}
function _pxSepia(d, len, amt) {
    amt = Math.min(1, Math.max(0, amt));
    for (var i = 0; i < len; i += 4) {
        var r = d[i], g = d[i+1], b = d[i+2];
        var sr = 0.393*r + 0.769*g + 0.189*b;
        var sg = 0.349*r + 0.686*g + 0.168*b;
        var sb = 0.272*r + 0.534*g + 0.131*b;
        d[i]   = Math.min(255, r + (sr - r) * amt);
        d[i+1] = Math.min(255, g + (sg - g) * amt);
        d[i+2] = Math.min(255, b + (sb - b) * amt);
    }
}
function _pxHueRotate(d, len, deg) {
    var rad = deg * Math.PI / 180;
    var cs = Math.cos(rad), sn = Math.sin(rad);
    var m00 = 0.213 + cs*0.787 - sn*0.213;
    var m01 = 0.715 - cs*0.715 - sn*0.715;
    var m02 = 0.072 - cs*0.072 + sn*0.928;
    var m10 = 0.213 - cs*0.213 + sn*0.143;
    var m11 = 0.715 + cs*0.285 + sn*0.140;
    var m12 = 0.072 - cs*0.072 - sn*0.283;
    var m20 = 0.213 - cs*0.213 - sn*0.787;
    var m21 = 0.715 - cs*0.715 + sn*0.715;
    var m22 = 0.072 + cs*0.928 + sn*0.072;
    for (var i = 0; i < len; i += 4) {
        var r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, Math.max(0, m00*r + m01*g + m02*b));
        d[i+1] = Math.min(255, Math.max(0, m10*r + m11*g + m12*b));
        d[i+2] = Math.min(255, Math.max(0, m20*r + m21*g + m22*b));
    }
}

// ======================================================================
// フィルター選択 UI の構築
// ======================================================================

function buildFilterUI() {
    const list = document.getElementById('filter-list');
    if (!list) return;
    list.innerHTML = '';

    // 強度スライダー（現在値を反映）
    const initVal = Math.round(currentFilterIntensity * 100);
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'filter-intensity-row';
    const intensityLabel = (typeof t === 'function') ? t('intensity_label') : '強度';
    sliderWrap.innerHTML = `
        <label class="filter-intensity-label">${intensityLabel}
            <span id="photo-intensity-val">${initVal}%</span>
        </label>
        <input type="range" id="photo-intensity-slider" min="0" max="100" value="${initVal}" class="filter-intensity-slider">
    `;
    list.appendChild(sliderWrap);
    const slider = sliderWrap.querySelector('#photo-intensity-slider');
    const valSpan = sliderWrap.querySelector('#photo-intensity-val');
    slider.addEventListener('input', () => {
        currentFilterIntensity = slider.value / 100;
        valSpan.textContent = slider.value + '%';
        applyFilterToPreview();
    });

    // フィルター一覧
    FILTERS.forEach(f => {
        const item = document.createElement('div');
        item.className = 'filter-item' + (f.id === currentFilterId ? ' selected' : '');
        item.dataset.filterId = f.id;
        item.innerHTML = `<div class="filter-icon">${f.icon}</div><span class="filter-name">${f.name}</span>`;
        item.addEventListener('click', () => {
            list.querySelectorAll('.filter-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            setFilter(f.id);
        });
        list.appendChild(item);
    });

    // ==============================================================
    // 画像調整スライダー（明るさ・コントラスト・ハイライト・シャドウ・露出度）
    // カラーフィルターと独立して併用可能
    // ==============================================================
    const adjDefs = [
        { key: 'brightness', name: '明るさ',       icon: '☀️' },
        { key: 'contrast',   name: 'コントラスト', icon: '◐'  },
        { key: 'highlights', name: 'ハイライト',   icon: '💡' },
        { key: 'shadows',    name: 'シャドウ',     icon: '🌑' },
        { key: 'exposure',   name: '露出度',       icon: '📷' },
        { key: 'detail',     name: 'ディテール',   icon: '🔍' }
    ];

    const adjWrap = document.createElement('div');
    adjWrap.style.cssText = 'grid-column: 1 / -1;';

    const adjSep = document.createElement('div');
    adjSep.className = 'frame-list-sep';
    adjSep.textContent = '── 画像調整 ──';
    adjWrap.appendChild(adjSep);

    adjDefs.forEach(adj => {
        const row = document.createElement('div');
        row.className = 'filter-adj-row';
        row.innerHTML =
            '<label class="filter-adj-label">' + adj.icon + ' ' + adj.name + '</label>' +
            '<input type="range" class="filter-intensity-slider filter-adj-slider"' +
            ' min="0" max="100" value="' + imageAdjustments[adj.key] + '"' +
            ' data-adj-key="' + adj.key + '">' +
            '<span class="filter-adj-val">' + imageAdjustments[adj.key] + '%</span>';

        const sl = row.querySelector('input');
        const vl = row.querySelector('.filter-adj-val');
        sl.addEventListener('input', () => {
            imageAdjustments[adj.key] = parseInt(sl.value);
            vl.textContent = sl.value + '%';
            applyFilterToPreview();
        });
        adjWrap.appendChild(row);
    });

    list.appendChild(adjWrap);
}
