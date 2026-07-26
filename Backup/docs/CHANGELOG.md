# 品川プリンスホテル 記念日フォトフレーム撮影システム
# 作業ログ / CHANGELOG

> 本ドキュメントは、全ての変更・修正・バグ対応の記録です。
> 今後の作業効率向上・同一トラブルの再発防止を目的として管理します。

---

## ログの読み方

| 項目 | 説明 |
|------|------|
| [NEW] | 新機能の追加 |
| [FIX] | バグ修正 |
| [CHANGE] | 既存機能の変更・調整 |
| [REFACTOR] | 内部構造の改善（動作変化なし） |
| [DOC] | ドキュメントの追加・更新 |
| [LESSON] | 今後のための教訓・注意事項 |

---

## Phase 1: 初期構築（2026-02-19）

### 作業内容
- [NEW] プロジェクト全体をゼロから構築
- [NEW] login.html — パスワード認証画面
- [NEW] index.html — メイン撮影画面（カメラ起動・撮影・保存）
- [NEW] レストラン12店舗の設定（restaurants.json）
- [NEW] フレーム選択機能（frames-config.json）
- [NEW] Service Worker によるオフラインキャッシュ

### ディレクトリ設計
```
css/ js/ assets/config/ assets/images/frames/ docs/ tools/
```
→ ファイル種別ごとにフォルダ分離。コメントアウトで記述内容を説明。

### この時点での問題
- 写真が撮れない（カメラ初期化処理のバグ）
- 保存ボタンが機能しない（download属性の実装不備）
- レスポンシブが壊れている（画面サイズ未考慮）

---

## Phase 2: カメラ・保存の基本修正（2026-02-19〜20）

### [FIX] カメラが起動しない
- **原因**: getUserMedia の constraints が不正
- **対処**: `js/camera.js` — constraints を `{ ideal: 1920, min: 640 }` に修正
- **教訓**: `exact` ではなく `ideal` を使うことで端末互換性を確保

### [FIX] 保存ボタンが機能しない
- **原因**: canvas.toBlob() のコールバック内で `<a download>` が正しく生成されていない
- **対処**: `js/capture.js` — downloadImage() を書き直し
- **教訓**: iOS Safari では `<a download>` がダウンロードフォルダにしか保存できない

### [NEW] アウトカメラ対応・カメラ切替
- `js/camera.js` — switchCamera() 追加
- インカメラ時のみ `scaleX(-1)` で鏡像表示

---

## Phase 3: レスポンシブ対応（2026-02-20〜03-01）

### [FIX] スマホ画面で全体が収まらない
- **原因**: 固定px値でレイアウトしていたため、小画面端末で溢れる
- **対処**: `css/style.css` — `100dvh` + `--vh` フォールバック、flex レイアウトに全面改修
- **影響範囲**: #app, .screen, #video-container, #controls, #result-screen 全て

### [FIX] 撮影後のプレビューがオーバースキャン
- **原因**: result-canvas に max-width/max-height 制約なし
- **対処**: `#result-canvas { max-width: 100%; max-height: 100%; }` を設定

### [FIX] フレーム選択メニューのレイアウト崩れ（iOS端末で顕著）
- **原因**: grid-template-columns の minmax 値が小さすぎ、gap が狭すぎ
- **対処**: `minmax(100px, 1fr)` + `gap: 12px` に統一
- **繰り返し発生**: 計5回以上修正。最終的に参照データ（ShinagawaPrinceHotel-AR2）の構造に合わせて安定

### [LESSON] レスポンシブ修正で学んだこと
1. **dvh を使う**: iOS Safari のアドレスバーで 100vh が変動する問題を回避
2. **flex: 1 + max-height の組み合わせ**: ビデオコンテナの高さ制御に最も安定
3. **object-fit: cover**: カメラプレビューは contain だとレターボックスが出る
4. **env(safe-area-inset-bottom)**: ノッチ付き端末のpadding確保に必須
5. **テストは複数端末で必ず実施**: iPhone 8, iPhone 11, iPad, Android で確認

---

## Phase 4: 写真比率 4:3 → 9:16 変更（2026-03-08〜09）

### [CHANGE] 撮影写真のアスペクト比を 9:16 に変更
- **変更箇所**:
  - `js/capture.js` — `targetAspect = 9/16` に変更
  - `css/style.css` — `#video-container { aspect-ratio: 9/16 }`, `.frame-item { aspect-ratio: 9/16 }`
- **理由**: フレーム画像が縦長1080×1920で制作されるため
- **保存形式**: PNG → JPEG（品質0.93）に変更、ファイルサイズ削減

### [LESSON] 比率変更時の影響箇所
- capture.js のクロップ計算
- style.css の video-container, frame-item, result-canvas
- フレーム画像自体のサイズ
→ **3箇所を連動して変更する必要がある**。1箇所だけ変えると不整合が起きる。

---

## Phase 5: フレーム画像の実装（2026-03-08〜10）

### [FIX] フレーム画像が表示されない
- **原因①**: frames-config.json の path が存在しないディレクトリを指していた
- **原因②**: 仮のプレースホルダー（緑色の正方形）が生成されたまま残っていた
- **原因③**: 共通フレームとレストランオリジナルフレームの分類が逆になっていた
- **対処**: frames-config.json を全面修正、画像ファイルを正しいディレクトリに配置

### [FIX] フレームを切り替えると撮影エラー
- **原因**: selectFrame() で frameImage の読み込み完了を待たずに撮影可能になっていた
- **対処**: loadFrameImage() に onload コールバックを追加

### [NEW] フレーム「なし」選択肢を追加
- frames-config.json に `isNone: true` フラグを持つエントリを追加
- selectFrame() で isNone 判定 → frameImage = null, overlay 非表示

### [LESSON] フレーム関連の注意事項
1. フレーム差し替えは **frames-config.json の path/thumbnail を変更 + 画像ファイル配置** の2手順のみ
2. JS/HTML/CSS の変更は不要
3. 変更後は **sw.js の CACHE_VERSION を上げる**こと（クライアントキャッシュ更新のため）

---

## Phase 6: 写真フィルター・Face ARデコレーション（2026-03-01〜10）

### [NEW] 写真フィルター 10種
- `js/filter.js` — CSS filter + Canvas pixel操作の2層構造
- フィルム風 / モノクロ / セピア / ソフト / ウォーム / クール / 油彩 / ぼかし / ゆがみ / ノイズ
- スライダーで強度0%〜100%調整可能

### [NEW] Face ARデコレーション
- `js/face-filter.js` — MediaPipe Face Mesh（468点座標）で顔検出
- 当初50種 → 精度不良で大量に廃止 → 最終的に安定動作する種類のみ残留

### [FIX] Face ARデコレーションが動作しない（複数回発生）
- **原因①**: extractCoords() で追加した新座標プロパティ（mouthH, lipTop, lipBottom, philtrumY, noseBottom）を drawDecoration() のデストラクチャリングに含めていなかった → undefined → NaN
  - **対処**: デストラクチャリングに全プロパティ追加
- **原因②**: matchAndTrack() の閾値が正規化座標用（0.25）のままピクセル座標に適用 → 全ての顔が「新規」扱い → スムージングなし
  - **対処**: `canvasMax * 0.25` に変更（動的ピクセル閾値）
- **原因③**: 「顔全体」カテゴリ（パンダ等）が不安定で他のカテゴリにまで影響
  - **対処**: 「顔全体」カテゴリを完全削除

### [FIX] コンテンツ追加後に口元デコレーションが動作しなくなる
- **原因**: 新しいデコレーション追加時に DECORATIONS 配列のオブジェクト構造が不統一
- **対処**: 全デコレーションの draw 関数を統一フォーマットで再実装

### [LESSON] Face AR関連の教訓
1. **デストラクチャリングの同期**: extractCoords() にプロパティを追加したら、drawDecoration() 側も必ず同時に更新
2. **正規化座標 vs ピクセル座標**: 閾値は座標系に合わせて動的に計算
3. **新コンテンツ追加時**: 既存の DECORATIONS 配列と同一のオブジェクト構造を厳守
4. **不安定な機能は潔く削除**: 品質を維持できないものを残すと他機能に波及する

---

## Phase 7: 多言語対応（2026-03-05〜10）

### [NEW] 9言語対応
- `js/i18n.js` — 翻訳データ + DOM自動適用
- 日本語(ja) / 英語(en) / 簡体字中国語(zh-CN) / 繁体字中国語(zh-TW) / 韓国語(ko) / フランス語(fr) / スペイン語(es) / ドイツ語(de) / ポルトガル語(pt)

### [FIX] 言語切替が部分的にしか適用されない
- **原因**: I18N_MAP の DOMセレクタが一部の要素しかカバーしていなかった
- **対処**: 全UI要素のセレクタを I18N_MAP に追加（ログイン画面含む）

### [FIX] 言語切替でカスタムメッセージがリセットされる（2026-03-15修正）
- **原因**: setLanguage() 内で messageConfig.text.value を無条件に言語デフォルト値で上書き
- **対処**: `_isKnownDefault()` ヘルパー関数を追加。ユーザーが編集済み（全言語のデフォルトと一致しない）の場合はスキップ
- **影響ファイル**: `js/i18n.js`

### [LESSON] i18n の注意事項
1. **ユーザー入力値は i18n で上書きしない**: デフォルト値と一致する場合のみ翻訳適用
2. **新しいUI要素を追加したら I18N_MAP にも追加する**

---

## Phase 8: 写真保存の改善（2026-03-14〜15）

### [FIX] 写真がフォトライブラリに保存できない
- **問題の詳細**:
  - iPhone 11: Web Share API で「画像を保存」が表示される（OK）
  - iPhone 8: Web Share API 非対応 → ダウンロードフォルダのみ
  - iPad: Web Share API 非対応 → ダウンロードフォルダのみ
  - Android: Share Sheet に「端末に保存」選択肢がない

### [NEW] 3段構え保存システム
- **方法①「保存する」ボタン**: `<a download>` — 全端末対応（ダウンロードフォルダ保存）
- **方法②「📤 共有」ボタン**: Web Share API — iOS 15+ で「写真に保存」表示
- **方法③ 画像長押し**: `<img src=blob:...>` のネイティブコンテキストメニュー — iOS/iPadOS で「写真に保存」

### 技術的なポイント
- **canvas → img 変換が必須**: iOS Safari は `<canvas>` 要素の長押しメニューを無効化するため
- `prepareResultImage()` で canvas.toBlob() → URL.createObjectURL() → img.src に設定
- `-webkit-touch-callout: default` を img 要素に設定してネイティブメニューを有効化

### [LESSON] 保存機能の教訓
1. **単一の保存方法では全端末をカバーできない**: 必ず複数のフォールバックを用意
2. **canvas要素はiOSで長押し保存不可**: img要素に変換する必要あり
3. **Web Share API の対応状況は端末・OSバージョンで大きく異なる**

---

## Phase 9: Google Analytics 4 導入（2026-03-14〜15）

### [NEW] GA4 イベントトラッキング
- 測定ID: G-FN6X4ZH0QT
- `js/analytics.js` — 共通イベント送信ヘルパー
- トラッキング対象: login, frame_select, filter_use, face_deco_use, photo_capture, photo_save, camera_switch, lang_change, message_edit

### [FIX] GA4 イベントが送信されない
- **原因①**: login.html でログインイベント送信直後にページ遷移 → イベントが送信完了前に中断
  - **対処**: `event_callback` でイベント送信完了を待ってからリダイレクト + `event_timeout: 1500`
- **原因②**: `transport_type: 'beacon'` が未設定 → ページ離脱時にXHRが中断される
  - **対処**: login.html + index.html の `gtag('config')` に `transport_type: 'beacon'` 追加
- **原因③**: `currentFrameName` 変数が未定義 → 撮影時のフレーム名が常に空
  - **対処**: `js/app.js` にグローバル変数追加、`js/ui.js` の selectFrame() でフレーム名を保存

### [LESSON] GA4 の注意事項
1. **ページ遷移前のイベントは event_callback で送信完了を待つ**
2. **transport_type: 'beacon' を必ず設定** — ページ離脱時のイベントロスを防ぐ
3. **カスタムパラメータは GA4 管理画面でカスタムディメンションとして登録しないとレポートに表示されない**
4. **デバッグ**: ブラウザDevTools の Console で `[GA] ✓` ログを確認

---

## Phase 10: UI/UX 調整（2026-03-15）

### [CHANGE] 結果画面ボタンのサイズ・レイアウト修正
- **問題**: 「保存する」ボタンの「る」だけが改行される端末が多数
- **対処**: `#result-controls .btn` に `white-space: nowrap`, `flex: 1`, `padding: 12px 20px`, `min-width: 0` を設定
- **影響ファイル**: `css/style.css`

### [CHANGE] 保存ヒントテキストの視認性向上
- **問題**: 「画像を長押しして…」のテキストが小さく（10px）余白もなく気づきにくい
- **対処**: フォントサイズ 10px → 13px、色の明度を 0.65 → 0.75、padding を上下10-12pxに拡大
- **影響ファイル**: `css/style.css`, `index.html`（インラインスタイル → クラスに統一）

### [CHANGE] フィルター強度デフォルトを 100% → 50% に変更
- **理由**: 100%だと効果が強すぎる。50%を起点に自分で強弱を調整できるように
- **対処**: `js/filter.js` — `currentFilterIntensity = 1.0` → `0.5`

### [CHANGE] デフォルトカメラをインカメラ → アウトカメラに変更
- **対処**: `js/app.js` — `currentFacingMode = 'user'` → `'environment'`

### [CHANGE] デフォルトメッセージを「Happy Anniversary」に変更
- **対処**: `js/app.js` + `js/i18n.js`（日本語のデフォルトも統一）

### [CHANGE] メッセージエディタ「適用」ボタンの見切れ修正
- **問題**: 端末によってパネル下部の「適用」ボタンが画面外に隠れる
- **対処**: `.message-editor` の max-height を 70vh → 80vh、padding-bottom に `env(safe-area-inset-bottom)` 追加、`-webkit-overflow-scrolling: touch` 追加

---

## Phase 11: パネル開閉バグ修正（2026-03-15）

### [FIX] パネルを×以外で閉じると表示がバグる
- **問題の詳細**: 
  - パネルAを開いた状態でパネルBのボタンを押すと両方がactiveになる
  - オーバーレイ（半透明の黒背景）が残骸として残る
  - 一部パネルが中途半端な状態で固まる

- **根本原因**:
  1. **排他制御なし**: 各 `openXxx()` が他のパネルを閉じずに自分だけ開く
  2. **setTimeout による hidden クラス付与**: `setTimeout(() => .add('hidden'), 350)` が、タイミング次第で後から開いたパネルに干渉
  3. **showPanelOverlay / hidePanelOverlay の呼び出し不統一**: open/close/toggle/×ボタン/適用ボタンで個別に呼んでおり、漏れが発生

- **対処**:
  1. `closeAllPanels()` 関数を新設 — 全パネルの active 除去 + オーバーレイ非表示を一元管理
  2. 全ての `openXxx()` で最初に `closeAllPanels()` を呼び出し（排他制御）
  3. `setTimeout` を全て撤廃 — パネルの表示/非表示は `active` クラスの transform アニメーションのみで制御
  4. 全ての close 呼び出し元（×ボタン・適用ボタン・フレーム選択完了・オーバーレイタップ）を `closeAllPanels()` に統一

- **影響ファイル**: `js/ui.js`

### [LESSON] パネル管理の教訓
1. **排他的UIは必ず一元管理関数を作る**: 個別の open/close を直接呼ぶと漏れが生じる
2. **setTimeout でDOM操作をしない**: タイミング依存のバグを招く。transitionend イベントか、transform による表示制御に置き換える
3. **オーバーレイは開閉と必ずセットで管理**: showPanelOverlay / hidePanelOverlay を個別に呼ばず、closeAllPanels() に含める

---

## Service Worker キャッシュバージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1〜v13 | 〜03-08 | 初期構築〜レスポンシブ・フィルター・Face AR・多言語対応 |
| v14 | 03-14 | Face AR座標修正、口元デコレーション追加 |
| v15 | 03-15 | 3段構え保存システム実装 |
| v16 | 03-15 | 結果画面ボタンサイズ・ヒントテキスト調整 |
| v17 | 03-15 | GA4 transport_type: beacon、currentFrameName修正 |
| v18 | 03-15 | フィルター強度50%、デフォルトカメラ/メッセージ変更 |
| v19 | 03-15 | パネル開閉バグ修正（closeAllPanels統一） |

> **重要**: CSS/JS/画像を変更したら必ず CACHE_VERSION を上げること。
> 上げないとクライアント端末に古いファイルがキャッシュされたまま残る。

---

## ファイル別 変更頻度ランキング（注意が必要なファイル）

| ファイル | 変更回数 | 主な変更理由 |
|----------|---------|-------------|
| css/style.css | 20回以上 | レスポンシブ修正、パネルスタイル、結果画面 |
| js/ui.js | 15回以上 | パネル開閉、フレーム選択、イベント登録 |
| js/capture.js | 10回以上 | 撮影ロジック、保存方法、比率変更 |
| js/face-filter.js | 10回以上 | Face AR追加・削除・座標修正 |
| js/i18n.js | 8回以上 | 翻訳追加、マッピング追加、メッセージリセット修正 |
| js/app.js | 6回以上 | グローバル変数追加、デフォルト値変更 |
| sw.js | 19回 | キャッシュバージョン更新（v1→v19） |

---

## 今後の変更時チェックリスト

### フレーム画像を変更する場合
- [ ] 画像ファイルを所定ディレクトリに配置
- [ ] `assets/config/frames-config.json` の path/thumbnail を更新
- [ ] `sw.js` の CACHE_VERSION を上げる

### UIを変更する場合
- [ ] `css/style.css` を修正
- [ ] iPhone 8, iPhone 11, iPad, Android の4端末でレスポンシブ確認
- [ ] `sw.js` の CACHE_VERSION を上げる

### JSロジックを変更する場合
- [ ] `node -c ファイル名.js` で構文チェック
- [ ] 関連するグローバル変数のデストラクチャリング・参照を確認
- [ ] `sw.js` の CACHE_VERSION を上げる

### 新しいUI要素を追加する場合
- [ ] `js/i18n.js` の I18N_MAP に翻訳セレクタを追加
- [ ] 全9言語の翻訳テキストを TRANSLATIONS に追加
- [ ] レスポンシブ対応の CSS を追加

### GA4イベントを追加する場合
- [ ] `js/analytics.js` にトラッキング関数を追加
- [ ] 呼び出し元で `if (typeof trackXxx === 'function') trackXxx(...)` で呼び出し
- [ ] GA4管理画面でカスタムディメンションを登録

---

最終更新日: 2026-03-15
SW バージョン: v19
