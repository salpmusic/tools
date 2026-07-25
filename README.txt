salp Tools v2.7.2 — S26 Complete Package

GitHub Pages の /tools/ フォルダーへ、このZIPの中身をアップロードしてください。

主なファイル:
- index.html
- music.html
- manifest.webmanifest
- sw.js
- salp-s26-basic.html（ホームから開く正式ファイル名）
- s26basic.html（予備エイリアス）
- s26basic-core.html

Service Worker改善:
- HTMLはネット優先
- 古いキャッシュを自動削除
- ファイルが1つ欠けてもインストール全体が停止しない
- skipWaiting / clients.claim で更新を早く反映

アップロード後、古いキャッシュが残る端末ではページを2回再読み込みしてください。
