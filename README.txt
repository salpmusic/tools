salp Tools PWA v2.5.0

GitHub Pages の /tools/ 直下へ、次の構成でアップロードしてください。

index.html
manifest.webmanifest
sw.js
icons/
  icon-192.png
  icon-512.png
  icon-maskable-512.png

重要:
- sw.js と manifest.webmanifest は index.html と同じ階層です。
- icons フォルダ名とファイル名は変更しないでください。
- 最初の公開後、Safariでサイトを一度開き直してから「ホーム画面に追加」し直すと確実です。
- 以後の更新では sw.js の CACHE_VERSION を変更してください。
