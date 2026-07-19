# salp Linux v1.0 — Browser OS

このZIPは、ブラウザー入りLinuxディスクをGitHub Actionsで生成するソース一式です。

## 重要
`salp-browser.ext2`本体はZIPに入っていません。
約1.4GBのためGitHub Actionsで作ります。

## 手順
1. ZIPの中身をGitHubリポジトリのルートへアップロード
2. GitHubのActionsを開く
3. `Build salp Linux v1 Browser Image`を実行
4. 完了後、Artifactから`salp-browser.ext2`を取得
5. `tools/salp-linux/salp-browser.ext2`へアップロード
6. HTML類も`tools/salp-linux/`へアップロード
7. 次を開く

https://salpmusic.github.io/tools/salp-linux/salp-linux.html?v=10

## v1.0で追加されるもの
- NetSurf（利用不可ならDillo）
- `/usr/local/bin/salp-browser`
- デスクトップ用salp Browserアイコン

## ネット接続
ブラウザー本体はLinux内に入ります。
公開インターネットへ出るにはTailscaleとExit Nodeが必要です。

## サイズ
CheerpXのカスタムイメージは2GB以下が必要です。
このビルドは1.4GBのext2を作成します。
