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
        cssFilter: 'hue-rotate(38deg) saturate(2.1) brightness(1.06) contrast(1.22)',
        apply: null
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
let currentFilterIntensity = 1.0; // 0.0〜1.0（デフォルト100%）

// ======================================================================
// フィルター取得・設定
// ======================================================================

function getCurrentFilter() {
    return FILTERS.find(f => f.id === currentFilterId) || FILTERS[0];
}

function setFilter(filterId) {
    currentFilterId = filterId;
    applyFilterToPreview();
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
// ======================================================================

function applyFilterToPreview() {
    if (!cameraVideo) return;
    const filter = getCurrentFilter();
    const scaled = scaleCSSFilter(filter.cssFilter, currentFilterIntensity);
    cameraVideo.style.filter = (scaled === 'none' || !scaled) ? '' : scaled;
}

// ======================================================================
// Canvas 描画時のフィルター文字列を返す
// captureImage() 内で ctx.filter に設定して drawImage() する前に使う
// ======================================================================

function getCanvasFilterString() {
    const filter = getCurrentFilter();
    return scaleCSSFilter(filter.cssFilter, currentFilterIntensity) || 'none';
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
            // フィルター選択後にパネルを自動で閉じる
            if (typeof closeFilterSelector === 'function') closeFilterSelector();
            if (typeof hidePanelOverlay === 'function') hidePanelOverlay();
        });
        list.appendChild(item);
    });
}
