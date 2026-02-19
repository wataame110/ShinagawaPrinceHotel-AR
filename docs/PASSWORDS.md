# レストランパスワード一覧

**⚠️ 機密情報 - スタッフ用**

このファイルには各レストランのログインパスワードが記載されています。
外部への漏洩に十分ご注意ください。

---

## 📋 レストランごとのパスワード

### 1. DINING & BAR TABLE 9 TOKYO
- **レストランID**: `table9`
- **パスワード**: `table9tokyo`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=table9`

### 2. LUXE DINING HAPUNA
- **レストランID**: `hapuna`
- **パスワード**: `hapuna2026`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=hapuna`

### 3. 味街道 五十三次
- **レストランID**: `gojusantsugi`
- **パスワード**: `gojusan53`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=gojusantsugi`

### 4. 中国料理 品川大飯店
- **レストランID**: `daihanten`
- **パスワード**: `daihanten88`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=daihanten`

### 5. ICHOZAKA Bistro Japonais
- **レストランID**: `ichozaka`
- **パスワード**: `ichozaka99`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=ichozaka`

### 6. SHINAGAWA PIVOT
- **レストランID**: `pivot`
- **パスワード**: `pivot2026`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=pivot`

### 7. Jojoen Shinagawa Prince Hotel
- **レストランID**: `jojoen`
- **パスワード**: `jojoen777`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=jojoen`

### 8. Mauna Kea Coffee Lounge
- **レストランID**: `maunakea`
- **パスワード**: `maunakea55`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=maunakea`

### 9. Boulangerie Shinagawa
- **レストランID**: `boulangerie`
- **パスワード**: `boulang365`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=boulangerie`

### 10. Food Court Shinagawa Kitchen
- **レストランID**: `kitchen`
- **パスワード**: `kitchen123`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=kitchen`

### 11. Café & Party Garden SHINAGAWA
- **レストランID**: `garden`
- **パスワード**: `garden456`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=garden`

### 12. 鉄板焼き 天王洲
- **レストランID**: `tennouzu`
- **パスワード**: `tennouzu38`
- **QRコードURL**: `https://your-domain.com/login.html?restaurant=tennouzu`

---

## 🔐 パスワード変更方法

パスワードを変更する場合は、以下のファイルを編集してください：

**ファイル**: `assets/config/restaurants.json`

```json
{
  "id": "hapuna",
  "password": "新しいパスワード"
}
```

変更後、必ずブラウザのキャッシュをクリアしてください。

---

## 📱 QRコード生成方法

### ツールを使用する場合
1. `tools/qr-generator.html` をブラウザで開く
2. ベースURLを入力（例: `https://shinagawa-prince.com/login.html`）
3. 「全レストランのQRコードを生成」ボタンをクリック
4. 各QRコードを個別にダウンロード、または「印刷用ページを開く」で一括印刷

### オンラインツールを使用する場合
1. QRコード生成サイト（例: https://www.qrcode-monkey.com/）にアクセス
2. 上記のQRコードURLを入力
3. デザインをカスタマイズ（オプション）
4. ダウンロードして印刷

---

## 🖨️ レストランでの案内方法

### 1. QRコード掲示
- テーブル上のPOPに設置
- 入口のウェルカムボードに掲示
- メニュー表に印刷

### 2. スタッフからの案内
```
「本日は記念日でのご来店、誠におめでとうございます。
当ホテルでは記念日のお客様限定で、
特別なフォトフレームでの撮影サービスをご用意しております。

こちらのQRコードを読み取り、パスワード「○○○」を入力すると
ご利用いただけます。素敵な思い出をお残しください。」
```

### 3. パスワード案内カード（サンプル）
```
┌─────────────────────────────┐
│  品川プリンスホテル           │
│  記念日フォトフレーム         │
│                               │
│  [QRコード]                   │
│                               │
│  パスワード: hapuna2026        │
│                               │
│  ※このパスワードは             │
│    本日限り有効です            │
└─────────────────────────────┘
```

---

## ⚠️ セキュリティ上の注意

1. **パスワードの管理**
   - スタッフ以外に漏らさない
   - 定期的に変更する（推奨: 月1回）
   - 使い回しを避ける

2. **QRコードの管理**
   - 使用後は回収または破棄
   - 不正利用を発見した場合は即座にパスワード変更

3. **ゲストへの案内**
   - パスワードは口頭またはカードで渡す
   - SNS等への投稿は控えるよう案内

---

## 🆘 トラブルシューティング

### パスワードが合わない
1. 大文字・小文字を確認
2. 全角・半角を確認
3. スペースが入っていないか確認

### ログインできない
1. ブラウザのキャッシュをクリア
2. 別のブラウザで試す
3. パスワード設定ファイルを確認

### QRコードが読み取れない
1. 印刷品質を確認
2. 照明を確認（反射で読み取れない場合がある）
3. QRコード生成時のエラー訂正レベルを上げる

---

**最終更新日**: 2026年2月19日
