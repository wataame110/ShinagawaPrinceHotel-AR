/**
 * ======================================================================
 * フィルターモジュール (filter.js)
 * 写真撮影前後に適用できる画像効果フィルターを管理する
 *
 * リアルタイムプレビュー: CSS filter を video / canvas に適用
 * 撮影時:               Canvas 2D API / ピクセル操作で合成
 * ======================================================================
 */

/**
 * 利用可能なフィルター定義
 * cssFilter : リアルタイムプレビュー用 CSS filter 文字列
 * apply     : Canvas 描画後に追加処理が必要な場合のコールバック
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
        cssFilter: 'contrast(1.15) saturate(1.3) brightness(0.92) sepia(15%)',
        apply: (ctx, w, h) => applyGrain(ctx, w, h, 18)
    },
    {
        id: 'mono',
        name: 'モノクロ',
        icon: '⬛',
        cssFilter: 'grayscale(100%) contrast(1.15) brightness(1.05)',
        apply: null
    },
    {
        id: 'sepia',
        name: 'セピア',
        icon: '🟫',
        cssFilter: 'sepia(85%) brightness(0.95) contrast(1.1)',
        apply: null
    },
    {
        id: 'soft',
        name: 'ソフト/グロウ',
        icon: '✨',
        cssFilter: 'brightness(1.18) saturate(1.25) contrast(0.9)',
        apply: (ctx, w, h) => applyGlow(ctx, w, h)
    },
    {
        id: 'warm',
        name: 'フィルム（温）',
        icon: '🌅',
        cssFilter: 'sepia(35%) saturate(1.6) hue-rotate(-15deg) brightness(1.08)',
        apply: null
    },
    {
        id: 'cool',
        name: 'フィルム（冷）',
        icon: '🧊',
        cssFilter: 'hue-rotate(20deg) saturate(1.35) brightness(1.08) contrast(1.05)',
        apply: null
    },
    {
        id: 'watercolor',
        name: '水彩',
        icon: '🎨',
        cssFilter: 'saturate(1.8) brightness(1.1) contrast(0.85)',
        apply: (ctx, w, h) => applyWatercolor(ctx, w, h)
    },
    {
        id: 'noise',
        name: 'ノイズ/テクスチャ',
        icon: '📺',
        cssFilter: 'contrast(1.2) brightness(0.95)',
        apply: (ctx, w, h) => applyGrain(ctx, w, h, 35)
    },
    {
        id: 'sketch',
        name: '点描/スケッチ',
        icon: '✏️',
        cssFilter: 'grayscale(80%) contrast(1.5) brightness(1.1)',
        apply: (ctx, w, h) => applySketch(ctx, w, h)
    }
];

/** 現在選択中のフィルターID */
let currentFilterId = 'none';

// ======================================================================
// フィルター取得
// ======================================================================

function getCurrentFilter() {
    return FILTERS.find(f => f.id === currentFilterId) || FILTERS[0];
}

function setFilter(filterId) {
    currentFilterId = filterId;
    applyFilterToPreview();
}

// ======================================================================
// リアルタイムプレビュー（video 要素の CSS filter を更新）
// ======================================================================

function applyFilterToPreview() {
    if (!cameraVideo) return;
    const filter = getCurrentFilter();
    cameraVideo.style.filter = filter.cssFilter === 'none' ? '' : filter.cssFilter;
}

// ======================================================================
// Canvas 描画時のフィルター適用
// captureImage() 内で呼び出す
// ======================================================================

/**
 * Canvas に CSS filter 相当の処理を適用する
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w   Canvas 幅
 * @param {number} h   Canvas 高さ
 */
function applyFilterToCanvas(ctx, w, h) {
    const filter = getCurrentFilter();

    // CSS filter を Canvas filter として設定（Chrome/Firefox 対応）
    if (filter.cssFilter !== 'none') {
        ctx.filter = filter.cssFilter;
    }

    // 追加のピクセル操作フィルター
    if (filter.apply) {
        ctx.filter = 'none'; // ピクセル操作の前にリセット
        filter.apply(ctx, w, h);
    }
}

/**
 * Canvas の再描画に filter を適用するためのラッパー
 * captureImage() でビデオを drawImage する前に ctx.filter を設定する
 * @returns {string} CSS filter 文字列
 */
function getCanvasFilterString() {
    const filter = getCurrentFilter();
    return filter.cssFilter === 'none' ? 'none' : filter.cssFilter;
}

// ======================================================================
// ピクセル操作フィルター
// ======================================================================

/** フィルムグレイン（ランダムノイズ）を追加 */
function applyGrain(ctx, w, h, intensity) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        data[i]     = Math.min(255, Math.max(0, data[i]     + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
}

/** グロウ（ソフト発光）効果 */
function applyGlow(ctx, w, h) {
    // 現在の描画内容を取得
    const snapshot = ctx.getImageData(0, 0, w, h);

    // 一時 Canvas でぼかしレイヤーを作成
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.putImageData(snapshot, 0, 0);

    // ぼかしを掛けたレイヤーを Screen ブレンドで重ねる
    ctx.save();
    ctx.filter = 'blur(6px) brightness(1.3)';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(tmpCanvas, 0, 0);
    ctx.restore();
}

/** 水彩風：彩度を上げてエッジをソフトに */
function applyWatercolor(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    // 隣接ピクセルの平均でソフト化（3x3 box blur 簡易版）
    const copy = new Uint8ClampedArray(data);
    const stride = w * 4;
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
                data[i + c] = Math.round((
                    copy[i - stride - 4 + c] + copy[i - stride + c] + copy[i - stride + 4 + c] +
                    copy[i - 4 + c]          + copy[i + c]           + copy[i + 4 + c] +
                    copy[i + stride - 4 + c] + copy[i + stride + c] + copy[i + stride + 4 + c]
                ) / 9);
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

/** スケッチ風：エッジを強調 */
function applySketch(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);
    const stride = w * 4;
    // Sobel edge detection (grayscale)
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4;
            const tl = copy[i - stride - 4], tc = copy[i - stride], tr = copy[i - stride + 4];
            const ml = copy[i - 4],                                  mr = copy[i + 4];
            const bl = copy[i + stride - 4], bc = copy[i + stride], br = copy[i + stride + 4];
            const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
            const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
            const edge = Math.min(255, Math.sqrt(gx * gx + gy * gy));
            const val = Math.max(0, 255 - edge * 1.5);
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
    FILTERS.forEach(f => {
        const item = document.createElement('div');
        item.className = 'filter-item' + (f.id === currentFilterId ? ' selected' : '');
        item.dataset.filterId = f.id;
        item.innerHTML = `
            <div class="filter-icon">${f.icon}</div>
            <span class="filter-name">${f.name}</span>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            setFilter(f.id);
        });
        list.appendChild(item);
    });
}
