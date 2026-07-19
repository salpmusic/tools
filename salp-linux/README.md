# salp Linux v1.1 — External Image Edition

## 配置
tools/salp-linux/ に以下を置きます。

- salp-linux.html
- salp-browser.html
- coi-serviceworker.js

## URL
https://salpmusic.github.io/tools/salp-linux/salp-linux.html?v=11

## 新機能
- 外部ストレージ上のext2 URLを設定
- URLと表示名をlocalStorageへ保存
- 接続テスト
- 読み込み失敗時は公式Alpineへフォールバック
- 現在のイメージ名を表示
- 公式Alpine固定・設定削除

## 外部ストレージの必要条件
- HTTPS
- CORS対応
- Range Request対応
- 大容量配信対応

候補:
- Cloudflare R2
- Backblaze B2
- Amazon S3
- S3互換ストレージ

## 手順
1. salp-browser.ext2を外部ストレージへアップロード
2. Browser OSで「⚙ Image」
3. URLを入力
4. 接続テスト
5. 保存
6. 再起動
7. GUI Linux起動
8. Browser検出
9. Browser起動
