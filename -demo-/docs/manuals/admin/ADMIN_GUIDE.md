# 品川プリンスホテル 記念日フォトフレーム撮影システム
# 管理者ガイド（通常版）

---

## 1. 本書の対象読者

本書は、本システムのサーバー管理・設定変更・トラブルシューティングを行う **システム管理者** を対象としています。
HTML/CSS/JavaScriptの基礎知識がある方を想定しています。

---

## 2. システム概要

| 項目 | 内容 |
|------|------|
| システム名 | 品川プリンスホテル 記念日フォトフレーム撮影システム |
| 種別 | ブラウザ完結型 静的Webアプリケーション |
| バックエンド | なし（静的ファイルのみで動作） |
| データベース | なし |
| サーバー保存 | なし（撮影写真はお客様端末に保存） |
| 認証 | レストラン別パスワード（sessionStorage管理） |
| アクセス解析 | Google Analytics 4（測定ID: G-FN6X4ZH0QT） |
| 対応言語 | 9言語（日/英/簡体字/繁体字/韓/仏/西/独/葡） |

---

## 3. 技術スタック

| 技術 | 用途 |
|------|------|
| HTML5 / CSS3 / JavaScript（ES6+） | アプリケーション本体 |
| MediaDevices API（getUserMedia） | カメラ起動・映像取得 |
| Canvas 2D API | 写真合成（映像 + フレーム + フィルター + テキスト） |
| MediaPipe Face Mesh（CDN） | 顔認識（468点座標）→ Face ARデコレーション |
| Web Share API | 写真の共有（フォトライブラリ保存） |
| Web Audio API | シャッター音（マナーモード時も再生） |
| Service Worker | オフラインキャッシュ |
| Google Analytics 4 | アクセス解析・イベントトラッキング |

---

## 4. ディレクトリ構成

```
AR-Web_Photo/
├── index.html                 … メイン撮影画面
├── login.html                 … ログイン画面（パスワード認証）
├── sw.js                      … Service Worker（ルート配置必須）
│
├── css/
│   ├── style.css              … メイン画面スタイル
│   ├── login.css              … ログイン画面スタイル
│   ├── reset.css              … ブラウザリセット
│   └── qr-generator.css       … QRコード生成ツール用
│
├── js/
│   ├── app.js                 … アプリ初期化・グローバル変数
│   ├── camera.js              … カメラ制御（起動/停止/切替）
│   ├── capture.js             … 撮影・Canvas合成・保存
│   ├── ui.js                  … UI制御（画面遷移/パネル開閉/フレーム選択）
│   ├── filter.js              … 写真フィルター（10種）
│   ├── face-filter.js         … Face ARデコレーション（MediaPipe）
│   ├── i18n.js                … 多言語対応（9言語）
│   ├── sound.js               … シャッター音
│   ├── analytics.js           … GA4イベント送信
│   └── sw.js                  … Service Worker登録
│
├── assets/
│   ├── config/
│   │   ├── restaurants.json   … レストラン一覧（ID/名称/パスワード）
│   │   └── frames-config.json … フレーム設定（共通11種 + 各店オリジナル2種）
│   └── images/
│       ├── logo-shinagawa-prince.png  … ヘッダーロゴ
│       └── frames/
│           ├── common/        … 共通フレーム画像（11枚）
│           └── restaurants/   … 各店オリジナルフレーム画像
│
├── tools/                     … 管理ツール（本番不要）
│   └── qr-generator.html     … QRコード一括生成
│
└── docs/                      … ドキュメント
```

---

## 5. サーバー要件とデプロイ

### 5-1. サーバー要件

| 要件 | 内容 |
|------|------|
| Webサーバー | Apache / Nginx / Cloudflare Pages / GitHub Pages 等 |
| SSL/TLS | **必須**（HTTPSでないとカメラAPIが動作しない） |
| サーバーサイド処理 | 不要（全て静的ファイル） |
| 推奨帯域 | 初回読み込み約5MB（フレーム画像含む） |

### 5-2. デプロイ手順

1. 全ファイルをドキュメントルートにアップロード
2. `sw.js` は必ず **ルート直下** に配置（Service Workerのスコープ制約）
3. `docs/` と `tools/` は本番アップロード不要（管理用）

### 5-3. デプロイ後の確認チェックリスト

- [ ] HTTPS（鍵マーク付きURL）でアクセスできる
- [ ] login.html が正常に表示される
- [ ] 全12レストランのパスワードでログインできる
- [ ] カメラが起動する（インカメ/アウトカメ両方）
- [ ] フレームが表示・切替できる
- [ ] 撮影 → プレビュー → 保存の一連の流れが動作する
- [ ] 言語切替が全画面で反映される
- [ ] GA4のリアルタイムレポートにイベントが表示される

---

## 6. 設定変更ガイド

### 6-1. レストランのパスワード変更

**変更ファイル:** `assets/config/restaurants.json`

```json
{
  "id": "hapuna",
  "password": "新しいパスワード"
}
```

`password` の値を変更 → サーバーにアップロード → sw.js のバージョンを上げる

### 6-2. レストランの追加

1. `assets/config/restaurants.json` の `restaurants` 配列に新エントリを追加
2. `assets/config/frames-config.json` の `restaurantFrames` に対応するキーを追加
3. `login.html` のパスワード照合ロジックは自動対応（JSON読み込みのため変更不要）

### 6-3. フレーム画像の差し替え・追加

**変更ファイル:** 画像ファイル + `assets/config/frames-config.json`

- 同名上書きの場合 → 画像の上書きだけでOK（JSONの変更不要）
- 別名の場合 → JSONの `path` と `thumbnail` を更新
- 新規追加 → JSONの `commonFrames` 配列に新エントリを追加

画像仕様:
- PNG形式（透過必須）
- 1080 x 1920px（9:16）
- 500KB以下推奨

詳細: `docs/FRAME_REPLACE_GUIDE.md` / `docs/FRAME_MANUAL_EASY.md` 参照

### 6-4. デフォルトメッセージの変更

**変更ファイル:** `js/app.js`

`messageConfig` の初期値を変更:
```javascript
text: { enabled: true, value: '新しいデフォルトメッセージ' }
```

**注意:** `js/i18n.js` の各言語のデフォルト値も合わせて変更すること。

### 6-5. UIカラーの変更

**変更ファイル:** `css/style.css`

`:root` 内のCSS変数を変更:
```css
--color-gold-primary: #D4AF37;  /* メインカラー（ゴールド） */
--color-navy-dark: #1a2332;     /* 背景色（ダークネイビー） */
```

### 6-6. ロゴ画像の変更

`assets/images/logo-shinagawa-prince.png` を上書き（PNG推奨、高さ60px程度）。

### 6-7. GA4 測定IDの変更

**変更ファイル:** `login.html` + `index.html`

両ファイルの `<head>` 内にある `gtag('config', 'G-XXXXXXXX')` のIDを変更。

---

## 7. Service Worker / キャッシュ管理

| 項目 | 内容 |
|------|------|
| 配置場所 | ルートディレクトリ（/sw.js） |
| 現在のバージョン | v20 |
| キャッシュ戦略 | コアアセット事前キャッシュ + ネットワーク優先 |

### キャッシュバージョンの更新方法

CSS/JS/画像/JSONを変更したら **必ず** sw.js のバージョンを上げる:

```javascript
const CACHE_VERSION = 'v21';  // 数字を1つ上げる
```

これにより次回アクセス時に全クライアントのキャッシュが自動更新される。

---

## 8. Google Analytics 4 設定

### 8-1. トラッキング対象イベント

| イベント名 | タイミング | 主要パラメータ |
|-----------|-----------|---------------|
| login | ログイン成功時 | restaurant_id, restaurant_name |
| frame_select | フレーム選択時 | frame_name |
| filter_use | 写真フィルター適用時 | filter_name |
| face_deco_use | Face ARデコレーション適用時 | decoration_name |
| photo_capture | 撮影時 | frame_name, filter_name |
| photo_save | 保存時 | save_method |
| camera_switch | カメラ切替時 | camera_direction |
| lang_change | 言語変更時 | language |
| message_edit | メッセージ編集時 | restaurant_name |

### 8-2. カスタムディメンションの登録

GA4管理画面 →「管理」→「カスタム定義」→「カスタムディメンションを作成」:

| ディメンション名 | スコープ | イベントパラメータ名 |
|------------------|---------|---------------------|
| レストラン名 | イベント | restaurant_name |
| フレーム名 | イベント | frame_name |
| フィルター名 | イベント | filter_name |
| デコレーション名 | イベント | decoration_name |
| 保存方法 | イベント | save_method |
| カメラ方向 | イベント | camera_direction |
| 言語 | イベント | language |

---

## 9. 写真保存の仕組み（3段構え）

| 方法 | 技術 | 対応端末 | 保存先 |
|------|------|---------|--------|
| 「保存する」ボタン | `<a download>` | 全端末 | ダウンロードフォルダ |
| 「共有」ボタン | Web Share API | iOS 15+, Android Chrome | 写真アプリ |
| 画像長押し | `<img>` ネイティブメニュー | iOS/iPadOS | 写真アプリ |

**技術補足:**
- `<canvas>` はiOS Safariで長押しメニュー無効 → 撮影後に `<img src=blob:...>` に変換
- `<img>` に `-webkit-touch-callout: default` を設定しネイティブメニュー有効化
- Web Share APIは `navigator.canShare({ files: [file] })` で事前確認

---

## 10. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| カメラが起動しない | HTTPS未対応 | SSL証明書を設定 |
| カメラが起動しない | ブラウザの権限が「拒否」 | 端末設定からカメラ権限を許可 |
| フレームが表示されない | 画像パスが間違い / ファイル未配置 | DevTools → Networkタブで404を確認 |
| フレームが古いまま | Service Workerキャッシュ | sw.jsのCACHE_VERSIONを上げる |
| ログインできない | パスワード不一致 | restaurants.jsonのpasswordを確認 |
| GA4にイベントが来ない | カスタムディメンション未登録 | GA4管理画面で登録 |
| 画面レイアウトが崩れる | キャッシュが古い | sw.jsバージョンアップ + ブラウザキャッシュクリア |
| Face ARが動作しない | MediaPipe CDN接続不可 | インターネット接続を確認 |
| JSON変更が反映されない | キャッシュ | sw.jsバージョンアップ |
| 全画面が真っ白 | JSONの書式エラー | jsonlint.com で構文チェック |

### ブラウザキャッシュのクリア方法

| 端末 | 手順 |
|------|------|
| iPhone Safari | 設定 → Safari → 履歴とWebサイトデータを消去 |
| Android Chrome | Chrome → 設定 → プライバシー → 閲覧データの削除 |

---

## 11. セキュリティ

- パスワードはクライアントサイドで照合（サーバーにはパスワードのハッシュ等の機構なし）
- restaurants.json は一般公開状態のため、URLを知っていれば誰でもアクセス可能
- sessionStorageはタブを閉じると自動消去される
- 撮影写真は一切サーバーに送信されない（お客様端末にのみ保存）
- GA4にはイベント名とパラメータのみ送信（個人情報は含まない）

---

## 12. 変更作業の早見表

| 作業内容 | 変更ファイル | 備考 |
|----------|-------------|------|
| パスワード変更 | restaurants.json | |
| レストラン追加 | restaurants.json + frames-config.json | |
| フレーム差替（同名） | 画像ファイルのみ | |
| フレーム差替（別名） | 画像 + frames-config.json | |
| フレーム追加/削除 | 画像 + frames-config.json | |
| ロゴ変更 | logo-shinagawa-prince.png | 上書き |
| UIカラー変更 | css/style.css の :root | |
| デフォルトメッセージ | js/app.js + js/i18n.js | |
| GA4 測定ID変更 | login.html + index.html | |
| 翻訳追加/修正 | js/i18n.js | |
| **上記いずれかの後** | **sw.js のCACHE_VERSIONを上げる** | **必須** |

---

## 13. レストラン一覧とパスワード

| レストラン名 | ID | パスワード |
|-------------|-----|-----------|
| DINING & BAR TABLE 9 TOKYO | table9 | table9tokyo |
| LUXE DINING HAPUNA | hapuna | hapuna2026 |
| 味街道 五十三次 | gojusantsugi | gojusan53 |
| 中国料理 品川大飯店 | daihanten | daihanten88 |
| ICHOZAKA Bistro Japonais | ichozaka | ichozaka99 |
| SHINAGAWA PIVOT | pivot | pivot2026 |
| Jojoen Shinagawa Prince Hotel | jojoen | jojoen777 |
| Mauna Kea Coffee Lounge | maunakea | maunakea55 |
| Boulangerie Shinagawa | boulangerie | boulang365 |
| Food Court Shinagawa Kitchen | kitchen | kitchen123 |
| Cafe & Party Garden SHINAGAWA | garden | garden456 |
| 鉄板焼き 天王洲 | tennouzu | tennouzu38 |

---

最終更新日: 2026年3月16日
