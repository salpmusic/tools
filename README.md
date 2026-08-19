# salp Linux v1.9.2 — Firefox Upgrade

インストール不要でブラウザー上から起動する salp Linux のブラウザー強化版です。

## v1.9.2 の主な更新

- Linux版 **Firefox ESR** を custom ext2 image に標準搭載
- Xorg / i3 / LightDM は公式 Leaning Technologies Alpine image の既存GUI基盤を利用
- Browser OS は **Firefox ESR → Firefox → salp Browser → NetSurf → Dillo/Chromium** の順で検出
- `salp-browser` ランチャーも Firefox ESR を最優先
- Firefoxが起動できない場合の安全策として NetSurf を残す
- スタートページを Google に変更
- Firefox向けにソフトウェアレンダリング寄りの初期設定を追加
- Browser OSの「Firefox導入」から、ネット接続後に `firefox-esr` を追加導入可能
- Desktop内のブラウザー画面から `🦊 Linux Firefox` でBrowser OSへ移動可能
- ext2の推奨サイズを 2200MB に拡大
- GitHub Actions / Builder / Browser OS / Desktop の表記を v1.9.2 へ更新

## 重要：Firefoxの外部インターネット接続

CheerpX/WebVM上のLinuxから一般のWebへ直接TCP接続するにはネットワーク仮想化が必要です。
Browser OSには既存どおりTailscale接続を残しています。公開インターネットへ出る場合はTailnetのExit Nodeを使います。

## GitHub ActionsでFirefox入りImageを作る

1. リポジトリにこのZIPの内容を配置
2. GitHubの `Actions` を開く
3. `Build salp Linux v1.9.2 Firefox Image` を実行
4. Artifact `salp-firefox-v1.9.2-ext2` を保存
5. 中の `salp-browser.ext2` を Range Request + CORS 対応のHTTPSストレージへ配置
6. `salp-browser.html` の `⚙ Image` に直リンクを設定

生成物：

```text
salp-browser.ext2
salp-browser.ext2.sha256
salp-browser.ext2.manifest.txt
```

## 起動の流れ

```text
Browser
  ↓
CheerpX / WebAssembly
  ↓
Alpine Linux x86
  ↓
Xorg + i3
  ↓
Firefox ESR
```

Firefoxが環境依存で起動できない場合はNetSurfへフォールバックできます。
