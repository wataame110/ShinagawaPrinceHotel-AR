# フレーム画像 差し替えガイド

## 変更が必要なもの（チェックリスト）

フレーム画像を差し替える際は、以下の **2つ** を行えば反映されます。

### 1. 画像ファイルを配置する
### 2. `frames-config.json` のパスを書き換える

**それだけでOKです。** JS・HTML・CSSの変更は不要です。

---

## 画像ファイルの仕様

| 項目 | 仕様 |
|---|---|
| フォーマット | PNG（透過必須） |
| アスペクト比 | **9:16**（横1080 x 縦1920 推奨） |
| 解像度 | 幅 1080px 以上を推奨（撮影写真の最大出力に合わせるため） |
| 背景 | 必ず **透明**（被写体が写る部分を透過にする） |
| ファイルサイズ | 1枚あたり 500KB 以下を推奨（スマホの通信負荷軽減のため） |

---

## ディレクトリ構造

```
assets/images/frames/
├── common/                     ← 全レストラン共通フレーム（7種）
│   ├── common_iy02.png
│   ├── common_k01.png
│   ├── common_k03.png
│   ├── common_i1.png
│   ├── common_i3.png
│   ├── common_m01.png
│   └── common_pink_floral.png
│
├── restaurants/                ← レストランオリジナルフレーム
│   ├── table9/                 ← TABLE 9 TOKYO 用
│   │   ├── table9_frame1.png
│   │   └── table9_frame2.png
│   ├── hapuna/                 ← LUXE DINING HAPUNA 用
│   │   ├── hapuna_frame1.png
│   │   └── hapuna_frame2.png
│   ├── gojusantsugi/           ← 味街道 五十三次 用
│   ├── daihanten/              ← 品川大飯店 用
│   ├── ichozaka/               ← いちょう坂 用
│   ├── pivot/                  ← SHINAGAWA PIVOT 用
│   ├── jojoen/                 ← 叙々苑 用
│   ├── maunakea/               ← マウナケア 用
│   ├── boulangerie/            ← ブーランジェリー 用
│   ├── kitchen/                ← 品川キッチン 用
│   └── garden/                 ← カフェ＆ガーデン 用
│
├── placeholder_1.png           ← 「準備中」仮画像①
└── placeholder_2.png           ← 「準備中」仮画像②
```

---

## 差し替え手順（具体例）

### 例: HAPUNA のオリジナルフレーム①を差し替える場合

#### Step 1 — フォルダを作成（初回のみ）

```
assets/images/frames/restaurants/hapuna/
```

#### Step 2 — 画像ファイルを配置

```
assets/images/frames/restaurants/hapuna/hapuna_frame1.png
```

#### Step 3 — `assets/config/frames-config.json` を編集

変更前:
```json
{
  "id": "hapuna_original_1",
  "name": "HAPUNA オリジナル①",
  "path": "assets/images/frames/restaurants/placeholder_1.png",
  "thumbnail": "assets/images/frames/restaurants/placeholder_1.png",
  "_note": "差し替え先: assets/images/frames/restaurants/hapuna/hapuna_frame1.png"
}
```

変更後:
```json
{
  "id": "hapuna_original_1",
  "name": "HAPUNA オリジナル①",
  "path": "assets/images/frames/restaurants/hapuna/hapuna_frame1.png",
  "thumbnail": "assets/images/frames/restaurants/hapuna/hapuna_frame1.png"
}
```

**変更するのは `path` と `thumbnail` の2箇所だけです。**

#### Step 4 — サーバーにアップロード

変更した `frames-config.json` と、新しい画像ファイルをサーバーにアップロードしてください。

---

## 共通フレームを差し替える場合

#### Step 1 — 画像ファイルを上書き配置

```
assets/images/frames/common/common_iy02.png  ← このファイルを新しい画像で上書き
```

**同じファイル名で上書きする場合は `frames-config.json` の変更は不要です。**

ファイル名を変更する場合のみ `frames-config.json` の `path` と `thumbnail` を更新してください。

---

## 共通フレームを追加・削除する場合

`frames-config.json` の `commonFrames` 配列にエントリーを追加/削除します。

追加例:
```json
{
  "id": "common_new_design",
  "name": "新デザイン",
  "path": "assets/images/frames/common/common_new_design.png",
  "thumbnail": "assets/images/frames/common/common_new_design.png",
  "description": "新しいデザインのフレーム"
}
```

**JS・HTML・CSSの変更は一切不要です。JSON に追加するだけで自動的にメニューに表示されます。**

---

## キャッシュに関する注意点

本アプリは Service Worker でファイルをキャッシュしています。
フレーム画像を差し替えた後、ユーザーの端末に古い画像が残る場合があります。

### 対処法（いずれか1つ）

**方法A: Service Worker のバージョンを上げる（推奨）**

`sw.js` の1行目付近:
```js
const CACHE_VERSION = 'v14';  // ← この数字を v15 等に上げる
```

これだけで、次回アクセス時に全ユーザーのキャッシュが更新されます。

**方法B: ファイル名を変更する**

画像ファイル名を `hapuna_frame1_v2.png` のように変えれば、キャッシュの影響を受けません。
（この場合 `frames-config.json` のパスも変更が必要です）

---

## 変更が反映されない場合のトラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| フレームが表示されない | 画像ファイルが存在しない or パスが間違っている | ブラウザの開発者ツール → Network タブで 404 を確認 |
| 古い画像が表示される | Service Worker キャッシュ | `sw.js` の `CACHE_VERSION` を上げる |
| 「準備中」バッジが消えない | `path` に `placeholder_` が含まれている | パスを実際のフレーム画像に変更する |
| サムネイルだけ変わらない | `thumbnail` のパスが古いまま | `path` と `thumbnail` の両方を変更する |
| JSONの書式エラーで全部壊れる | カンマの過不足など | JSON validator で構文チェック（https://jsonlint.com/） |

---

## まとめ: 変更箇所の早見表

| 作業 | 変更ファイル | 変更箇所 |
|---|---|---|
| フレーム画像の差し替え（同名上書き） | 画像ファイルのみ | なし |
| フレーム画像の差し替え（別名） | 画像ファイル + `frames-config.json` | `path` と `thumbnail` |
| フレームの追加・削除 | 画像ファイル + `frames-config.json` | 配列にエントリー追加/削除 |
| キャッシュ更新 | `sw.js` | `CACHE_VERSION` の数字を上げる |
| フレーム名の変更 | `frames-config.json` | `name` |
| JS / HTML / CSS | **変更不要** | — |
