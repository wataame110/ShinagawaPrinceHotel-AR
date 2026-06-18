# フォトフレーム & Face AR デコレーション 増減ガイド

> このドキュメントは、フォトフレームおよびFace ARデコレーションの
> 追加・削除・一時非表示の手順をまとめたものです。

---

## 目次

1. [フォトフレームの増減](#1-フォトフレームの増減)
2. [Face AR デコレーションの増減](#2-face-ar-デコレーションの増減)
3. [変更後の共通手順](#3-変更後の共通手順)

---

# 1. フォトフレームの増減

## 1-1. 関係するファイル

| ファイル | 役割 |
|---------|------|
| `assets/config/frames-config.json` | **唯一の設定ファイル。ここだけ編集する** |
| `assets/images/frames/common/` | 共通フレーム画像の置き場 |
| `assets/images/frames/restaurants/{レストランID}/` | 各レストラン専用フレーム画像の置き場 |
| `sw.js` | キャッシュバージョン（変更後に番号を上げる） |

**編集不要なファイル:** `js/ui.js`, `js/capture.js`, `index.html` → フレームの増減では触らない

---

## 1-2. 共通フレームを追加する

### 手順

**ステップ1: 画像ファイルを用意**

```
形式: PNG（背景透明）
サイズ: 1080 x 1920 px（9:16 縦長）
ファイル名: 半角英数とアンダースコアのみ（例: common_sakura.png）
```

**ステップ2: 画像を配置**

```
assets/images/frames/common/ フォルダに入れる
```

**ステップ3: frames-config.json に追記**

`"commonFrames"` 配列の **最後のフレームの `}` の直後** にカンマを付けて、新エントリを追加:

```json
    {
      "id": "common_iy02",
      "name": "ピンクフローラル",
      ...
    },            ← この最後のフレームの } の後ろにカンマがあることを確認
    {
      "id": "common_sakura",
      "name": "さくらフレーム",
      "path": "assets/images/frames/common/common_sakura.png",
      "thumbnail": "assets/images/frames/common/common_sakura.png",
      "description": "桜が舞い散る春らしいフレーム"
    }             ← 配列の最後のフレームにはカンマを付けない
  ],
```

**各フィールドの意味:**

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | 必須 | 一意のID。`common_` で始めること。他と重複不可 |
| `name` | 必須 | 画面に表示される名前（日本語OK） |
| `path` | 必須 | フレーム画像のパス |
| `thumbnail` | 必須 | サムネイル画像のパス（通常は path と同じでOK） |
| `description` | 任意 | 説明文 |
| `disabled` | 任意 | `true` にすると非表示になる（後述） |
| `_note` | 任意 | メモ（プログラムには影響しない） |

---

## 1-3. レストラン専用フレームを追加する

### 手順

**ステップ1: 画像を用意して配置**

```
assets/images/frames/restaurants/{レストランID}/ フォルダに入れる

例: HAPUNAの場合
assets/images/frames/restaurants/hapuna/hapuna_special.png
```

**ステップ2: frames-config.json の該当レストランの配列に追記**

```json
  "hapuna": [
    {
      "id": "hapuna_original_1",
      "name": "HAPUNA オリジナル①",
      "path": "assets/images/frames/restaurants/hapuna/hapuna_frame1.png",
      "thumbnail": "assets/images/frames/restaurants/hapuna/hapuna_frame1.png"
    },
    {
      "id": "hapuna_special",
      "name": "HAPUNA 季節限定",
      "path": "assets/images/frames/restaurants/hapuna/hapuna_special.png",
      "thumbnail": "assets/images/frames/restaurants/hapuna/hapuna_special.png"
    }
  ],
```

**注意:** `id` は `common_` で始めないこと（`common_` で始まるIDは共通フレーム扱い）

---

## 1-4. フレームを一時非表示にする（disabled 方式）

JSONではコメントアウト（`//`）が使えません。
代わりに `"disabled": true` を追加してください。

### 非表示にする

```json
    {
      "id": "common_cat",
      "name": "キャットフレーム",
      "path": "assets/images/frames/common/common_cat.png",
      "thumbnail": "assets/images/frames/common/common_cat.png",
      "disabled": true
    },
```

`"disabled": true` を1行追加するだけ。画像ファイルの削除は不要。

### 再表示する

`"disabled": true` の行を削除する、または `"disabled": false` に変更する。

### 完全に削除する

フレームの `{ ... }` ブロック全体を削除する。
前後のカンマに注意（最後のフレームの後ろにカンマがあるとエラー）。

---

## 1-5. フレームの枠数を増やす・減らす

`frames-config.json` の `commonFrames` 配列にエントリを追加・削除するだけ。
**JS/HTML/CSSの変更は一切不要。** 配列の中身が何個あっても自動的に表示される。

| やりたいこと | やること |
|------------|---------|
| 15種 → 20種に増やす | commonFrames に5エントリ追加 + 画像配置 |
| 15種 → 10種に減らす | 5エントリに `"disabled": true` を追加（または削除） |
| レストラン専用を3種に増やす | restaurantFrames の該当レストラン配列に1エントリ追加 + 画像配置 |

---

## 1-6. JSON編集時の注意事項

```
★ 「"」は必ず半角ダブルクォーテーションを使用
★ 最後のエントリの } の後ろにカンマを付けない
★ フィールド名とコロンの間にスペースを入れても入れなくてもOK
★ 編集後は https://jsonlint.com/ でエラーチェックできる
```

---

# 2. Face AR デコレーションの増減

## 2-1. 関係するファイル

| ファイル | 役割 |
|---------|------|
| `js/face-filter.js` | **唯一の設定ファイル。ここだけ編集する** |
| `sw.js` | キャッシュバージョン（変更後に番号を上げる） |

**編集不要なファイル:** `index.html`, `css/style.css`, `js/ui.js` → デコレーションの増減では触らない

---

## 2-2. デコレーションの構造

`face-filter.js` の中に2つの重要な部分がある:

### A. デコレーション一覧（FACE_DECORATIONS 配列）— 約43行目～

```javascript
const FACE_DECORATIONS = [
    { id: 'none',           name: 'なし',      icon: '🚫', category: 'none_cat' },
    { id: 'glasses',        name: 'サングラス', icon: '😎', category: 'eyes' },
    ...
];
```

各エントリのフィールド:

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | 必須 | 一意のID（半角英数とアンダースコアのみ） |
| `name` | 必須 | 画面に表示される名前（日本語OK） |
| `icon` | 必須 | 一覧に表示される絵文字アイコン |
| `category` | 必須 | 所属カテゴリーのID（下記参照） |

### B. 描画処理（drawDecoration 関数の switch 文）— 約378行目～

```javascript
function drawDecoration(ctx, id, c, intensity) {
    switch (id) {
        case 'glasses': {
            // ここにサングラスの描画コードが入っている
            break;
        }
        case 'heart_eyes': {
            // ここにハートアイの描画コードが入っている
            break;
        }
        ...
    }
}
```

---

## 2-3. 既存のカテゴリー一覧

```
FACE_DECORATION_CATEGORIES 配列（31行目～）:

  none_cat  → なし（これは固定。変更不可）
  eyes      → 👓 目元
  nose      → 👃 鼻元
  mouth     → 👄 口元
  accessory → ✨ アクセサリー
```

---

## 2-4. デコレーションを追加する

### 手順

**ステップ1: FACE_DECORATIONS 配列にエントリを追加**

```javascript
// ── 目元（5種）
{ id: 'glasses',        name: 'サングラス',      icon: '😎', category: 'eyes' },
{ id: 'heart_eyes',     name: 'ハートアイ',      icon: '😍', category: 'eyes' },
...
{ id: 'cat_eyes',       name: 'キャットアイ',    icon: '🐱', category: 'eyes' },  // ← 追加
```

**ステップ2: drawDecoration 関数の switch 文に描画コードを追加**

```javascript
case 'cat_eyes': {
    // 描画コード（既存のデコレーションを参考に書く）
    // ctx = Canvas描画コンテキスト
    // c   = 顔座標情報（rEye, lEye, eyeSep, angle 等）
    // intensity = フィルター強度（0.0～1.0）
    break;
}
```

### 使える顔座標（c オブジェクト）

```
目元:
  rEye      右目の中心 {x, y}
  lEye      左目の中心 {x, y}
  rEyeIn    右目の内端    rEyeOut   右目の外端
  lEyeIn    左目の内端    lEyeOut   左目の外端
  rEyeW     右目の幅      lEyeW     左目の幅
  eyeMidX   両目の中間X   eyeMidY   両目の中間Y
  eyeSep    両目の間隔

眉:
  rBrowO    右眉の外端    rBrowIn   右眉の内端
  lBrowO    左眉の外端    lBrowIn   左眉の内端

鼻:
  noseTip   鼻先          noseR / noseL  鼻の左右端
  noseW     鼻の幅        noseBottom     鼻の下端

口元:
  mouthU    上唇の中央    mouthD    下唇の中央
  mouthL    口の左端      mouthR    口の右端
  mouthW    口の幅        mouthH    口の高さ
  mouthMidX 口の中心X     mouthMidY 口の中心Y
  lipTop    上唇の上端    lipBottom 下唇の下端
  philtrumY 鼻と上唇の間

顔全体:
  forehead  おでこの上端  chin      あご先
  rCheek    右頬          lCheek    左頬
  rTemple   右こめかみ    lTemple   左こめかみ
  faceW     顔の横幅      faceH     顔の縦幅
  angle     顔の傾き（ラジアン）
```

### 描画コードのテンプレート（目元の例）

```javascript
case 'cat_eyes': {
    ctx.save();
    ctx.translate(eyeMidX, eyeMidY);  // 両目の中心に移動
    ctx.rotate(angle);                // 顔の傾きに合わせて回転

    const r = eyeSep * 0.3;           // サイズの基準（目の間隔に比例）
    const halfSep = eyeSep / 2;

    // 右目の描画
    ctx.beginPath();
    // ... 描画処理 ...
    ctx.fill();

    // 左目の描画
    ctx.beginPath();
    // ... 描画処理 ...
    ctx.fill();

    ctx.restore();
    break;
}
```

---

## 2-5. デコレーションを削除する（一時的 / 完全）

### 一時的に非表示にする

`FACE_DECORATIONS` 配列の該当エントリをJavaScriptの `//` でコメントアウト:

```javascript
// { id: 'cat_eyes',  name: 'キャットアイ', icon: '🐱', category: 'eyes' },
```

※ JSONとは違い、JavaScriptでは `//` でコメントアウトが使えます

### 完全に削除する

1. `FACE_DECORATIONS` 配列から該当エントリを削除
2. `drawDecoration()` の switch 文から該当 case ブロックを削除
3. （両方とも消さないと、片方だけ残っていても問題にはならないが不要コードが残る）

---

## 2-6. カテゴリーを追加する

**ステップ1: FACE_DECORATION_CATEGORIES 配列に追加（31行目付近）**

```javascript
const FACE_DECORATION_CATEGORIES = [
    { id: 'none_cat',   name: 'なし',         icon: '🚫', nameKey: 'cat_none'      },
    { id: 'eyes',       name: '目元',          icon: '👓', nameKey: 'cat_eyes'      },
    ...
    { id: 'headwear',   name: '帽子・ヘア',    icon: '🎩', nameKey: 'cat_headwear'  },  // ← 追加
];
```

**ステップ2: 新カテゴリーに属するデコレーションを追加**

```javascript
{ id: 'top_hat', name: 'シルクハット', icon: '🎩', category: 'headwear' },
```

**ステップ3: 多言語対応（任意）**

`js/i18n.js` の `TRANSLATIONS` に `nameKey` に対応する翻訳を追加:

```javascript
cat_headwear: 'Headwear',   // 英語
cat_headwear: '帽子/头发',   // 中国語（簡体）
```

---

## 2-7. デコレーション増減時のチェックリスト

- [ ] `FACE_DECORATIONS` 配列にエントリを追加/削除した
- [ ] `drawDecoration()` の switch 文に case を追加/削除した
- [ ] エントリの `category` が `FACE_DECORATION_CATEGORIES` に存在するIDと一致している
- [ ] エントリの `id` が他のデコレーションと重複していない
- [ ] `node -c js/face-filter.js` で構文エラーがないことを確認した
- [ ] `sw.js` の CACHE_VERSION を上げた

---

# 3. 変更後の共通手順

**どの変更をした場合でも、最後に必ず以下を行う:**

### ステップ1: 構文チェック

```bash
# フレーム設定を変えた場合
# → https://jsonlint.com/ に frames-config.json の中身を貼り付けて検証

# Face AR を変えた場合
node -c js/face-filter.js
```

### ステップ2: sw.js のバージョンを上げる

`sw.js` を開いて、上の方にある数字を 1 つ上げる:

```javascript
const CACHE_VERSION = 'v22';   // ← 1つ上げる
```

### ステップ3: サーバーにアップロード

変更したファイル + sw.js をアップロード。

---

# クイックリファレンス（早見表）

## フォトフレーム

| やりたいこと | 変更するもの |
|------------|------------|
| 共通フレームを追加 | 画像配置 + `frames-config.json` の commonFrames に追記 |
| レストラン専用フレームを追加 | 画像配置 + `frames-config.json` の restaurantFrames に追記 |
| フレームを差し替え（同名） | 画像ファイルを上書きするだけ |
| フレームを差し替え（別名） | 画像配置 + `frames-config.json` の path/thumbnail を変更 |
| フレームを一時非表示 | `frames-config.json` のエントリに `"disabled": true` を追加 |
| フレームを再表示 | `"disabled": true` を削除、または `false` に変更 |
| フレームを完全削除 | `frames-config.json` から `{ ... }` ブロックを削除 |

## Face AR デコレーション

| やりたいこと | 変更するもの |
|------------|------------|
| デコレーションを追加 | `FACE_DECORATIONS` に追記 + `drawDecoration()` に case 追加 |
| デコレーションを一時非表示 | `FACE_DECORATIONS` の該当行を `//` でコメントアウト |
| デコレーションを完全削除 | `FACE_DECORATIONS` と `drawDecoration()` 両方から削除 |
| カテゴリーを追加 | `FACE_DECORATION_CATEGORIES` に追記 |

## 共通（全変更後に必ず実施）

| 手順 | 内容 |
|------|------|
| 1 | 構文チェック（jsonlint.com / `node -c`） |
| 2 | `sw.js` の CACHE_VERSION を +1 |
| 3 | 変更ファイル + sw.js をサーバーにアップロード |

---

最終更新日: 2026年3月17日
