# FxTwitter Share (FxEmbed)

X（旧Twitter）の共有メニューに「**fxtwitterで共有**」を追加する、Chromium 系ブラウザ向けの拡張機能です。  
ポストの URL を `fixupx.com`（末尾 `/ja` 付き）へ自動変換してコピーできるため、Discord や LINE などで共有したときに埋め込みプレビューや動画がきれいに表示されます。

## 主な特徴

- **X 純正メニューに馴染むデザイン**  
  既存の「リンクをコピー」要素をもとに項目を追加しているため、ライト／ダークテーマを問わず違和感なく表示されます。
- **通常のコピー操作に影響しない**  
  「fxtwitterで共有」をクリックした直後のみ URL を変換します。通常の「リンクをコピー」やテキストのコピーは普段どおり動作します。
- **余計な権限なし・軽量設計**  
  Manifest V3 に対応し、追加のブラウザ権限（`permissions`）を一切使いません。外部サーバーへの通信も不要です。

## URL の変換例

クエリパラメータ（`?s=20` など）を取り除き、ドメインを `fixupx.com` に置き換えたうえで末尾に `/ja` を付与します。

```text
変換前: https://x.com/username/status/1234567890?s=20
変換後: https://fixupx.com/username/status/1234567890/ja
```

`twitter.com` や `mobile.x.com`、`www.` 付きの URL にも対応しています。

## 対応環境

- **ブラウザ**：Manifest V3 対応の Chromium 系ブラウザ（Google Chrome、Microsoft Edge、Brave、Arc など）
- **対象サイト**：
  - `https://x.com/*`
  - `https://twitter.com/*`
  - `https://mobile.x.com/*`
  - `https://mobile.twitter.com/*`

## インストール方法

1. このリポジトリをクローン、または ZIP でダウンロードして解凍します。
   ```bash
   git clone https://github.com/azukiba1005/fwtwitter.git
   ```
2. ブラウザのアドレスバーに `chrome://extensions/` と入力して拡張機能ページを開きます（Edge の場合は `edge://extensions/`）。
3. 右上の **デベロッパー モード** をオンにします。
4. **パッケージ化されていない拡張機能を読み込む** をクリックし、`manifest.json` が入っているフォルダを選択します。

## 使い方

1. X で共有したいポストの **共有ボタン** をクリックします。
2. メニュー内の「リンクをコピー」の下に表示される **fxtwitterで共有** をクリックします。
3. 変換済みの URL がクリップボードにコピーされるので、そのままチャットや SNS に貼り付けます。

## カスタマイズ

変換先のドメインや翻訳言語を変えたいときは、`content.js` の先頭にある定数を編集してください。

```javascript
// content.js
const FXEMBED_DOMAIN_NAME = 'fixupx.com'; // 例: 'fxtwitter.com' など
const LANGUAGE_NAME = 'ja';               // 例: 'en' など
```

編集後は、拡張機能管理ページ（`chrome://extensions/`）から対象拡張機能の **更新ボタン** を押して反映します。

## ファイル構成

```text
.
├── manifest.json   # 拡張機能の設定（Manifest V3）
├── content.js      # メニュー項目の追加と URL 変換処理
├── styles.css      # 追加メニューのホバー／クリック時スタイル
└── icons/          # 拡張機能アイコン（16 / 48 / 128px）
```

## 注意事項

- 本拡張機能は X および FxEmbed（FixupX）の非公式ツールです。
- X 側の UI や DOM 構造の変更により、予告なく動作しなくなる場合があります。

## ライセンス

<!-- 使用するライセンス（MIT License など）に合わせて記載してください -->
MIT License