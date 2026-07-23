salp Tools PWA v2.7.1 — Auto Update Edition

更新時に古いページが残りにくいように改善しました。

主な変更:
- 新しいService Workerを自動で有効化
- 更新完了後にページを自動再読み込み
- sw.jsのURLへバージョン番号を付けてキャッシュを回避
- HTMLは常にネット優先で取得
- 古いHTMLをService Workerへ保存しない
- 起動直後と2.5秒後に更新を再確認
- PWAキャッシュをv2.7.1へ更新

/tools/直下へ上書き:
index.html
music.html
manifest.webmanifest
sw.js

icons/は既存のままです。

初回だけ旧Service Workerが残ることがあります。
その場合はSafariで https://salpmusic.github.io/tools/?v=271 を一度開けば、
以後は新しい自動更新方式へ切り替わります。
