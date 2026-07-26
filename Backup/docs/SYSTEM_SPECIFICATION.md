# 品川プリンスホテル 記念日フォトフレーム撮影システム
# システム仕様書（技術ドキュメント）

---

## 1. システム概要

| 項目 | 内容 |
|------|------|
| システム名 | 品川プリンスホテル 記念日フォトフレーム撮影システム |
| 種別 | ブラウザ完結型 静的Webアプリケーション |
| 目的 | 記念日ゲスト向け フレーム付き写真撮影・端末保存 |
| バックエンド | なし（静的ファイルのみ） |
| データベース | なし |
| サーバー保存 | なし（全データはクライアント端末に保存） |
| 認証方式 | レストラン別パスワード認証（セッション管理） |
| アクセス解析 | Google Analytics 4（GA4） |

---

## 2. 推奨動作環境

### 2-1. サーバー側

| 項目 | 要件 |
|------|------|
| Webサーバー | Apache / Nginx / Cloudflare Pages / GitHub Pages 等 |
| SSL/TLS | 必須（HTTPS環境でないとカメラAPIが利用不可） |
| サーバーサイド処理 | 不要（全て静的ファイル配信） |
| 推奨帯域 | フレーム画像（各500KB以下）× 最大9枚 ≒ 初回5MB程度 |

### 2-2. クライアント側（お客様端末）

| 端末 | OS | ブラウザ | 備考 |
|------|----|----------|------|
| iPhone | iOS 14 以降 | Safari | 推奨。Web Share API対応 |
| iPhone | iOS 14 以降 | Chrome for iOS | 動作可。内部はSafari WebKit |
| Android | Android 8 以降 | Google Chrome | 推奨 |
| Android | Android 8 以降 | Samsung Internet | 動作可 |
| iPad | iPadOS 14 以降 | Safari | 動作可。長押し保存推奨 |
| PC | - | Chrome / Edge / Safari | 開発・管理用途のみ |

### 2-3. 必須ブラウザAPI

| API | 用途 | 対応状況 |
|-----|------|----------|
| MediaDevices.getUserMedia | カメラ映像の取得 | iOS 11+, Android 5+ |
| Canvas 2D | 写真合成（映像 + フレーム + テキスト） | 全モダンブラウザ |
| Web Share API | 写真アプリへの保存（共有シート経由） | iOS 15+, Android Chrome |
| Web Audio API | シャッター音の再生 | 全モダンブラウザ |
| Service Worker | オフラインキャッシュ | iOS 11.3+, Android Chrome |
| MediaPipe Face Mesh | 顔座標検出（468点）→ Face ARデコレーション | CDN経由で読み込み |

---

## 3. ディレクトリ構成

```
AR-Web_Photo/
│
├── index.html                      … メイン撮影画面（カメラ・撮影・結果）
├── login.html                      … ログイン画面（パスワード認証）
├── sw.js                           … Service Worker（キャッシュ制御 / ルート配置必須）
│
├── css/
│   ├── style.css                   … メイン画面用スタイル（全UIコンポーネント）
│   ├── login.css                   … ログイン画面専用スタイル
│   ├── reset.css                   … ブラウザ差異リセット（html5doctor.com ベース）
│   └── qr-generator.css            … QRコード生成ツール用スタイル
│
├── js/
│   ├── app.js                      … アプリ初期化・グローバル変数定義・DOM参照
│   ├── camera.js                   … カメラ起動・停止・インカメ/アウトカメ切替
│   ├── capture.js                  … カウントダウン・撮影・Canvas合成・保存・共有
│   ├── ui.js                       … 画面遷移・パネル開閉・フレーム選択・イベント登録
│   ├── filter.js                   … 写真フィルター10種（CSS filter + Canvas pixel操作）
│   ├── face-filter.js              … Face ARデコレーション（MediaPipe Face Mesh 468点座標）
│   ├── i18n.js                     … 多言語対応（9言語）・翻訳データ・DOM自動適用
│   ├── sound.js                    … シャッター音（Web Audio API / マナーモード時も再生）
│   ├── analytics.js                … GA4 イベントトラッキング送信ヘルパー
│   └── sw.js                       … Service Worker登録スクリプト
│
├── assets/
│   ├── config/
│   │   ├── restaurants.json        … レストラン一覧（ID・名称・パスワード）
│   │   └── frames-config.json      … フレーム設定（共通7種 + 各店オリジナル2種×12店）
│   └── images/
│       ├── logo-shinagawa-prince.png  … ヘッダーロゴ画像
│       ├── favicon.ico             … ファビコン
│       ├── favicon.bmp             … ファビコン（BMP形式）
│       └── frames/
│           ├── common/             … 共通フレーム画像（7枚）
│           │   ├── common_iy02.png
│           │   ├── common_k01.png
│           │   ├── common_k03.png
│           │   ├── common_i1.png
│           │   ├── common_i3.png
│           │   ├── common_m01.png
│           │   └── common_pink_floral.png
│           └── restaurants/        … 各レストランオリジナルフレーム
│               ├── placeholder_1.png  … 「準備中」仮画像①
│               ├── placeholder_2.png  … 「準備中」仮画像②
│               ├── table9/         … TABLE 9 TOKYO 用
│               ├── hapuna/         … LUXE DINING HAPUNA 用
│               ├── gojusantsugi/   … 味街道 五十三次 用
│               ├── daihanten/      … 品川大飯店 用
│               ├── ichozaka/       … いちょう坂 用
│               ├── pivot/          … SHINAGAWA PIVOT 用
│               ├── jojoen/         … 叙々苑 用
│               ├── maunakea/       … マウナケア 用
│               ├── boulangerie/    … ブーランジェリー 用
│               ├── kitchen/        … 品川キッチン 用
│               └── garden/         … カフェ＆ガーデン 用
│
├── config/
│   └── manifest.json               … PWA マニフェスト（ホーム画面追加時の設定）
│
├── tools/                          … 管理用ツール（本番運用には不要）
│   ├── qr-generator.html           … QRコード一括生成ツール
│   ├── frame-generator.html        … フレーム画像テスト用ツール
│   └── generate-frames.js          … フレーム生成補助スクリプト
│
└── docs/                           … ドキュメント
    ├── USER_MANUAL.md              … 使い方マニュアル（スタッフ・お客様向け）
    ├── SYSTEM_SPECIFICATION.md     … 本書（システム仕様書）
    ├── FRAME_REPLACE_GUIDE.md      … フレーム画像差し替えガイド
    ├── PASSWORDS.md                … レストランパスワード一覧（機密）
    ├── QUICK_START.md              … クイックスタートガイド
    └── README.md                   … プロジェクト概要
```

---

## 4. 各ファイルの役割と記述内容

### 4-1. HTML ファイル

#### login.html — ログイン画面

| セクション | 内容 |
|------------|------|
| head | GA4タグ（G-FN6X4ZH0QT）、i18n.js読み込み、CSSリンク |
| .login-container | ロゴ表示、パスワード入力フォーム |
| script（インライン） | restaurants.json読み込み → パスワード照合 → sessionStorage保存 → index.htmlへリダイレクト |

認証フロー:
1. `assets/config/restaurants.json` をfetchでロード
2. URLパラメータ `?restaurant=xxx` があれば該当レストランのみ照合
3. なければ全レストランのパスワードと照合
4. 一致 → `sessionStorage` に `authenticated`, `restaurantId`, `restaurantName` を保存
5. GA4にloginイベント送信（event_callback後にリダイレクト）
6. `index.html?restaurant=xxx` へ遷移

#### index.html — メイン撮影画面

| セクション | 内容 |
|------------|------|
| head | GA4タグ、CSS（reset → login → style）、認証チェックスクリプト |
| #camera-screen | カメラプレビュー、フレームオーバーレイ、Face ARキャンバス、操作ボタン |
| #result-screen | 撮影結果表示（canvas + img）、保存/共有/再撮影ボタン |
| #error-screen | エラーメッセージ表示 |
| パネル群 | フレーム選択、フィルター選択、Face AR選択、メッセージ編集（各position: fixed） |
| script読み込み順 | i18n → analytics → app → sound → filter → face-filter → camera → capture → ui |

認証チェック:
- ページ読み込み直後に `sessionStorage.getItem('authenticated')` を確認
- 未認証なら即座に `login.html` へリダイレクト

---

### 4-2. JavaScript モジュール

#### js/app.js — アプリケーション初期化

| 記述内容 | 説明 |
|----------|------|
| DOM要素参照 | cameraVideo, frameOverlay, captureBtn 等のグローバル変数定義 |
| framesConfig | frames-config.jsonを読み込んで格納するオブジェクト |
| currentFrameId / currentFrameName | 現在選択中のフレームID・名称 |
| currentFacingMode | カメラ方向（'user' = インカメ / 'environment' = アウトカメ） |
| messageConfig | メッセージ設定（日付・テキスト・場所の値と有効/無効フラグ） |
| initApp() | 起動処理: restaurants.json読み込み → frames-config.json読み込み → カメラ初期化 |

#### js/camera.js — カメラモジュール

| 関数名 | 説明 |
|--------|------|
| initCamera(facingMode) | getUserMediaでカメラ起動。constraints: width ideal 1920, height ideal 1080 |
| initCameraWithFallback() | 高解像度で失敗時に制約なしで再試行 |
| switchCamera() | インカメ ↔ アウトカメ切替。現在ストリーム停止後に反対方向で再起動 |
| updateSwitchCameraBtn() | 切替ボタンのアイコン・ラベルを更新 |
| stopCamera() | 全トラックを停止してストリーム解放 |

カメラ制約:
- `facingMode: { ideal: currentFacingMode }` — idealにすることで端末に存在しないカメラでもエラーにならない
- `width: { ideal: 1920, min: 640 }` — landscape-first（スマホカメラの自然な出力方向）
- インカメ時は `cameraVideo.style.transform = 'scaleX(-1)'` で鏡像表示

#### js/capture.js — 撮影・合成・保存モジュール

| 関数名 | 説明 |
|--------|------|
| startCountdown() | 3秒カウントダウン表示後にcaptureImage()を呼び出し |
| captureImage() | Canvas合成の本体。以下の4レイヤーを重ね合わせ |
| drawMessageOnCanvas() | メッセージテキスト描画（6段階位置指定・書体・サイズ対応） |
| prepareResultImage() | 撮影後にcanvas → img変換（長押し保存用） |
| downloadImage() | 「保存する」ボタン: `<a download>` による端末ダウンロード |
| shareImage() | 「共有」ボタン: Web Share API（iOS: 写真に保存 / Android: 共有シート） |

Canvas合成レイヤー順序（下から上）:
1. カメラ映像（+ 写真フィルター適用）
2. ピクセル操作フィルター（grain/glow等）
3. Face ARデコレーション
4. フレーム画像（透過PNG）
5. メッセージテキスト

撮影写真の仕様:
- アスペクト比: 9:16（縦長）
- 最大解像度: 長辺1920px
- 保存形式: JPEG（品質0.93）
- ファイル名: `ShinagawaPrince_{レストラン名}_{日付}_{時刻}.jpg`

#### js/ui.js — UI制御モジュール

| 関数名 | 説明 |
|--------|------|
| showScreen(name) | 画面切替（'camera' / 'result' / 'error'） |
| buildFrameList() | frames-config.jsonからフレーム選択メニューを動的生成 |
| selectFrame(frameId) | フレーム選択 → frameImage読み込み → オーバーレイ表示 |
| openFrameSelector() / closeFrameSelector() | フレームパネルの開閉アニメーション |
| applyMessageConfig() | メッセージ編集パネルの入力値をmessageConfigに反映 |
| イベントリスナー登録 | 撮影ボタン・再撮影・保存・共有・カメラ切替・各パネルトグル |

#### js/filter.js — 写真フィルターモジュール

| 記述内容 | 説明 |
|----------|------|
| FILTERS配列 | 10種のフィルター定義（CSS filter文字列 + Canvas pixel操作関数） |
| selectFilter(id) | フィルター選択 → CSSプレビュー適用 |
| getCanvasFilterString() | 現在選択中フィルターのCSS filter文字列を返す |
| getCurrentFilter() | 現在のフィルターオブジェクトを返す |

フィルター一覧:
| ID | 名称 | 方式 |
|----|------|------|
| film | フィルム風 | CSS sepia + Canvas grain |
| mono | モノクロ | CSS grayscale |
| sepia | セピア | CSS sepia |
| soft | ソフトグロウ | CSS blur + brightness |
| warm | ウォームフィルム | CSS hue-rotate + saturate |
| cool | クールフィルム | CSS hue-rotate + brightness |
| oil | 油彩 | Canvas pixel averaging |
| blur | ぼかし | CSS blur |
| swirl | ゆがみ | Canvas pixel displacement |
| noise | ノイズ | Canvas random pixel overlay |

各フィルターはスライダー（0%〜100%）で強度調整可能。

#### js/face-filter.js — Face ARデコレーションモジュール

| 記述内容 | 説明 |
|----------|------|
| MediaPipe Face Mesh | CDN経由で読み込み。468点の顔座標をリアルタイム検出 |
| DECORATIONS配列 | デコレーション定義（カテゴリ・アイコン・描画関数・座標マッピング） |
| extractCoords(landmarks) | Face Mesh座標から各パーツ座標を抽出 |
| drawDecoration(ctx) | 検出した顔座標に基づきデコレーションをCanvas上に描画 |
| selectFaceDecoration(id) | デコレーション選択 → Face Mesh検出ループ開始 |
| matchAndTrack() | フレーム間の顔追跡（スムージング・ジッター防止） |

カテゴリ:
- 目元（ハートアイ、星目、涙目 等）
- 口元（赤リップ、アヒル口、吸血鬼の牙 等）
- 鼻（クマ鼻、犬鼻、ピエロ鼻 等）
- 小物（丸メガネ、サングラス、ティアラ 等）

※ 各デコレーションは顔パーツごとに最適な座標を使用
  （例: 赤リップ → lipTop/lipBottom、口ひげ → philtrumY）

#### js/i18n.js — 多言語対応モジュール

| 記述内容 | 説明 |
|----------|------|
| TRANSLATIONS | 9言語の翻訳データ（キー: 翻訳文字列のマッピング） |
| I18N_MAP | DOMセレクタ ↔ 翻訳キー ↔ 適用属性 のマッピング配列 |
| applyI18n(lang) | 指定言語の翻訳をDOMに一括適用 |
| t(key) | 現在の言語で翻訳文字列を取得する関数 |
| buildLanguageSelector(anchorId) | 言語切替UIを動的生成 |

対応言語:
| コード | 言語 |
|--------|------|
| ja | 日本語（デフォルト） |
| en | English |
| zh-CN | 简体中文 |
| zh-TW | 繁體中文 |
| ko | 한국어 |
| fr | Francais |
| es | Espanol |
| de | Deutsch |
| pt | Portugues |

login.htmlでも同じi18n.jsを読み込み、ログイン画面も多言語対応。

#### js/sound.js — シャッター音モジュール

| 記述内容 | 説明 |
|----------|------|
| playShutterSound() | Web Audio APIでシャッター音を合成再生 |

- マナーモード時もWeb Audio APIは再生可能（端末のシステム音声を使用しないため）
- AudioContextは初回ユーザー操作時に生成（ブラウザのautoplay policy準拠）

#### js/analytics.js — GA4 イベントトラッキング

| 関数名 | GA4イベント名 | パラメータ |
|--------|--------------|------------|
| trackLogin() | login | restaurant_id, restaurant_name, method |
| trackCameraView() | page_view_camera | restaurant_name |
| trackFrameSelect() | frame_select | frame_name |
| trackFilterUse() | filter_use | filter_name |
| trackFaceDecoUse() | face_deco_use | decoration_name |
| trackPhotoCapture() | photo_capture | frame_name, filter_name |
| trackPhotoSave() | photo_save | save_method (download / share_api / share_url) |
| trackCameraSwitch() | camera_switch | camera_direction |
| trackLangChange() | lang_change | language |
| trackMessageEdit() | message_edit | restaurant_name |

全イベントに `restaurant_name` が自動付与される（sessionStorageから取得）。
GA4管理画面で各パラメータを「カスタムディメンション」として登録する必要あり。
`transport_type: 'beacon'` 設定済み（ページ離脱時もイベント送信を保証）。
ブラウザDevToolsのConsoleで `[GA] ✓ イベント名` のログを確認可能。

#### sw.js — Service Worker

| 記述内容 | 説明 |
|----------|------|
| CACHE_VERSION | キャッシュバージョン（現在: 'v17'） |
| CORE_ASSETS | 事前キャッシュする静的ファイルリスト |
| install イベント | コアアセットをキャッシュに保存 |
| activate イベント | 古いバージョンのキャッシュを削除 |
| fetch イベント | キャッシュ優先 → ネットワークフォールバック（JSONはネットワーク優先） |

キャッシュ更新方法:
- `sw.js` の `CACHE_VERSION` の数値を上げる → 全クライアントのキャッシュが自動更新
- CSS/JS/画像ファイルを変更した際は必ずバージョンを上げること

---

### 4-3. CSS ファイル

#### css/reset.css — ブラウザリセット
html5doctor.comベースの全要素リセット。ブラウザ間の差異を統一。

#### css/login.css — ログイン画面
ログイン画面専用のスタイル。背景グラデーション、入力フォーム、ローディング表示。

#### css/style.css — メインスタイル

| セクション | 行範囲（目安） | 内容 |
|------------|---------------|------|
| :root 変数 | 冒頭 | カラーパレット定義（--color-gold-primary等）、ヘッダー/コントロール高さ |
| ベーススタイル | 30〜55 | html/body の高さ設定（dvh対応・--vhフォールバック） |
| #app | 58〜65 | アプリコンテナ（100dvh、overflow: hidden） |
| .screen | 70〜85 | 各画面の共通レイアウト（position: absolute、flex-column） |
| .camera-header | 90〜155 | カメラ画面ヘッダー（ロゴ・レストラン名・ボタン群） |
| #video-container | 212〜225 | カメラプレビュー領域（aspect-ratio: 9/16、object-fit: cover） |
| #controls | 287〜297 | 撮影ボタンエリア（固定高さ90px） |
| #result-screen | 452〜515 | 結果画面（プレビュー画像 + ボタン） |
| #result-image | 518〜532 | 長押し保存用img（-webkit-touch-callout: default） |
| #result-controls | 558〜587 | 結果画面ボタン（flex均等配置、white-space: nowrap） |
| .frame-selector | 608〜660 | フレーム選択パネル（position: fixed、bottom: 0） |
| .message-editor | 665〜720 | メッセージ編集パネル |
| .bottom-panel | 870〜890 | 写真フィルター/Face ARパネル共通 |
| @media (max-width: 380px) | 976〜1008 | 小画面端末対応 |
| @media (orientation: landscape) | 1010〜 | 横向き対応 |

CSS変数一覧:
| 変数名 | デフォルト値 | 用途 |
|--------|-------------|------|
| --color-gold-primary | #D4AF37 | メインアクセントカラー（ゴールド） |
| --color-gold-light | #F4D03F | ゴールド明色 |
| --color-gold-dark | #B8941E | ゴールド暗色 |
| --color-navy-dark | #1a2332 | 背景色（ダークネイビー） |
| --color-navy | #2c3e50 | 背景色（ネイビー） |
| --color-cream | #FAF9F6 | テキスト色（クリーム） |
| --font-luxury | 'Times New Roman', serif | 高級感のあるフォント |
| --font-modern | -apple-system, sans-serif | UIフォント |
| --header-height | 60px | ヘッダー高さ |
| --controls-height | 90px | 撮影ボタンエリア高さ |

---

### 4-4. 設定ファイル（JSON）

#### assets/config/restaurants.json — レストラン設定

各レストランの定義。1エントリの構造:
```
{
  "id":          "hapuna",                    … 一意の英字ID（URLパラメータに使用）
  "name":        "HAPUNA",                    … 短縮表示名
  "fullName":    "LUXE DINING HAPUNA",        … 正式名称（ヘッダー表示用）
  "category":    "ビュッフェ",                 … 業態カテゴリ
  "description": "大人向けブッフェレストラン",   … 説明文
  "password":    "hapuna2026"                 … ログインパスワード
}
```

パスワード変更: このファイルの `password` 値を変更するだけでOK。
レストラン追加: 配列に新しいオブジェクトを追加。

#### assets/config/frames-config.json — フレーム設定

| キー | 説明 |
|------|------|
| hotelName | ホテル名表示 |
| aspectRatio | 写真のアスペクト比（"9:16"） |
| commonFrames | 全レストラン共通フレーム配列（7種） |
| restaurantFrames | レストランID別のオリジナルフレーム配列（各2種） |

フレーム1エントリ:
```
{
  "id":          "common_k01",                           … 一意のフレームID
  "name":        "リーフアーチ",                          … 表示名
  "path":        "assets/images/frames/common/common_k01.png",  … フルサイズ画像パス
  "thumbnail":   "assets/images/frames/common/common_k01.png",  … サムネイル画像パス
  "description": "緑のリーフアーチが美しいフレーム"        … 説明（将来使用）
}
```

フレーム差し替え方法:
1. 画像ファイルを所定ディレクトリに配置
2. `path` と `thumbnail` のパスを更新
3. `sw.js` の `CACHE_VERSION` を上げる
→ JS・HTML・CSSの変更は不要

詳細は `docs/FRAME_REPLACE_GUIDE.md` を参照。

---

## 5. フレーム画像の仕様

| 項目 | 仕様 |
|------|------|
| フォーマット | PNG（透過必須） |
| アスペクト比 | 9:16（横1080 × 縦1920 推奨） |
| 解像度 | 幅1080px以上推奨 |
| 背景 | 被写体が写る部分は透明にする |
| ファイルサイズ | 1枚500KB以下推奨 |

---

## 6. 写真保存の仕組み（3段構え）

| 方法 | 技術 | 対応端末 | 保存先 |
|------|------|----------|--------|
| 「保存する」ボタン | `<a download>` | 全端末 | ダウンロードフォルダ |
| 「共有」ボタン | Web Share API | iOS 15+, Android Chrome | 写真アプリ（共有シート経由） |
| 画像長押し | `<img>` ネイティブメニュー | iOS/iPadOS | 写真アプリ（「写真に保存」） |

技術的な補足:
- `<canvas>` 要素はiOS Safariで長押しメニューが無効のため、撮影後に `<img src=blob:...>` に変換
- `<img>` 要素に `-webkit-touch-callout: default` を設定してネイティブメニューを有効化
- Web Share APIは `navigator.canShare({ files: [file] })` で事前にファイル共有対応を確認

---

## 7. 認証フロー

```
[QRコード読み取り]
    ↓
[login.html?restaurant=xxx]
    ↓
[パスワード入力]
    ↓
[restaurants.json と照合]
    ↓ 一致
[sessionStorage に保存]
  - authenticated = 'true'
  - restaurantId = 'xxx'
  - restaurantName = 'レストラン名'
    ↓
[GA4 login イベント送信]
    ↓ event_callback
[index.html?restaurant=xxx へ遷移]
    ↓
[sessionStorage確認 → カメラ起動]
```

※ sessionStorageはタブ/ウィンドウを閉じると消去される（ブラウザ仕様）
※ ログアウト時は sessionStorage.clear() を実行

---

## 8. Google Analytics 4 設定

### GA4プロパティ情報
- 測定ID: G-FN6X4ZH0QT
- 導入ファイル: login.html, index.html（両方のhead内）
- transport_type: beacon（ページ離脱時も送信保証）

### GA4管理画面で必要な設定

「管理」→「カスタム定義」→「カスタムディメンションを作成」で以下を登録:

| ディメンション名 | スコープ | イベントパラメータ名 |
|------------------|----------|---------------------|
| レストラン名 | イベント | restaurant_name |
| レストランID | イベント | restaurant_id |
| フレーム名 | イベント | frame_name |
| フィルター名 | イベント | filter_name |
| デコレーション名 | イベント | decoration_name |
| 保存方法 | イベント | save_method |
| カメラ方向 | イベント | camera_direction |
| 言語 | イベント | language |

### デバッグ方法
ブラウザのDevTools → Console で `[GA] ✓ イベント名 {パラメータ}` のログを確認。
GA4管理画面の「リアルタイム」レポートでもイベント到着を確認可能。

---

## 9. Service Worker / キャッシュ管理

| 項目 | 内容 |
|------|------|
| 配置場所 | ルートディレクトリ（/sw.js） |
| 現在のバージョン | v17 |
| キャッシュ戦略 | コアアセット事前キャッシュ + ネットワーク優先フォールバック |
| JSON/設定ファイル | ネットワーク優先（常に最新を取得） |
| 画像ファイル | リクエスト時にキャッシュ（LRU的に保持） |

バージョン更新手順:
1. `sw.js` を開く
2. `const CACHE_VERSION = 'v17';` の数字を上げる（例: 'v18'）
3. サーバーにアップロード
4. 次回アクセス時に全クライアントのキャッシュが自動更新

---

## 10. デプロイ手順

### 10-1. 必要なサーバー設定
1. HTTPS（SSL/TLS）が有効であること
2. 全ファイルをドキュメントルートにアップロード
3. `sw.js` はルート直下に配置（Service Workerのスコープ制約）

### 10-2. アップロードファイル
```
/（ルート）
├── index.html
├── login.html
├── sw.js
├── css/
├── js/
├── assets/
└── config/
```

※ `docs/` と `tools/` は管理用のため本番アップロードは任意

### 10-3. デプロイ後の確認チェックリスト
- [ ] HTTPS（鍵マーク）でアクセスできる
- [ ] login.html が表示される
- [ ] パスワード入力でログインできる
- [ ] カメラが起動する
- [ ] フレームが表示・切替できる
- [ ] 撮影ボタンでカウントダウン → 撮影できる
- [ ] 撮影写真が表示される
- [ ] 「保存する」で画像がダウンロードされる
- [ ] 「共有」で共有シートが表示される
- [ ] 言語切替が機能する
- [ ] 全レストランのパスワードで各ログインできる

---

## 11. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| カメラが起動しない | HTTPS未対応 | SSL証明書を設定 |
| カメラが起動しない | ブラウザの権限が「拒否」 | 端末設定からカメラ権限を許可 |
| フレームが表示されない | 画像パスが間違っている | DevToolsのNetworkタブで404を確認 |
| フレームが古いまま | Service Workerキャッシュ | sw.jsのCACHE_VERSIONを上げる |
| ログインできない | パスワード不一致 | restaurants.jsonのpasswordを確認 |
| GA4にイベントが来ない | カスタムディメンション未登録 | GA4管理画面で登録 |
| 画面が崩れる | キャッシュが古い | ブラウザのキャッシュをクリア |
| Face ARが動かない | MediaPipe CDN接続不可 | ネット接続を確認 |
| JSON変更が反映されない | キャッシュ | sw.jsバージョンアップ or ブラウザキャッシュクリア |

---

## 12. 変更作業の早見表

| 作業内容 | 変更するファイル |
|----------|-----------------|
| レストランのパスワード変更 | assets/config/restaurants.json |
| レストランの追加 | assets/config/restaurants.json + frames-config.json |
| フレーム画像の差し替え | 画像ファイル + assets/config/frames-config.json |
| フレームの追加・削除 | 画像ファイル + assets/config/frames-config.json |
| ホテルロゴの変更 | assets/images/logo-shinagawa-prince.png を上書き |
| UIカラーの変更 | css/style.css の :root 変数 |
| デフォルトメッセージの変更 | js/app.js の messageConfig 初期値 |
| GA4測定IDの変更 | login.html + index.html のgtag configタグ |
| 翻訳の追加・修正 | js/i18n.js の TRANSLATIONS オブジェクト |
| いずれかの変更後 | sw.js の CACHE_VERSION を上げる |

※ JS・HTML・CSSの変更は基本的に不要（設定ファイルのみで運用可能）

---

最終更新日: 2026年3月15日
