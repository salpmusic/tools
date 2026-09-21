# salp Linux v1.10.5 — CheerpX GUI Display Upgrade

ブラウザー上で動く salp Linux の表示・スマホ操作改善版です。v1.10.1 の Linux 起動、Firefox ESR、NetSurf fallback、Tailscale、外部 ext2、永続化、Builder を維持しつつ、**CheerpX の本物の Linux GUI Canvas** 側を修正しました。

## v1.10.5 の主な更新

- `salp-browser.html` の CheerpX `setKmsCanvas()` を PC / Mobile 表示切替と連動
- PC表示は Linux 仮想画面を **1366×768** に設定
- Mobile表示は表示領域の縦横比から **720px基準** の Linux 仮想解像度を計算
- Linux仮想解像度と、iPhone上での CSS 縮小率を分離
- **移動モード**を追加。ONの間だけ指ドラッグで Linux Canvas をパン
- 通常モードでは Canvas の入力を CheerpX / Linux 側へ優先
- `−` / `＋` で拡大縮小、`Fit` で全体表示、`◎` で中央へ復帰
- 小画面向けに表示操作バーをコンパクト化
- 画面回転・リサイズ時にフィットを再計算。Mobile表示では仮想解像度も再計算
- Desktop / Browser OS / Builder / build scripts のバージョンとキャッシュクエリを v1.10.5 に更新

## 重要：iframe と Linux GUI は別物

`salp-linux.html` 内の通常Webブラウザー表示は iframe です。一方、Linuxデスクトップ / Firefox ESR は `salp-browser.html` 内の CheerpX Canvas (`setKmsCanvas`) です。v1.10.5 の PC/Mobile・移動・Fit は **後者の Linux GUI Canvas** に実装されています。

## 操作

- `🖥 PC` : Linux仮想画面 1366×768
- `📱 Mobile` : 端末表示領域に合わせた仮想解像度
- `🖐 移動` : ONの間、ドラッグをLinux操作ではなく画面移動に使用
- `− / ＋` : 表示倍率変更
- `Fit` : Linux画面全体を現在の表示領域へ収める
- `◎` : 現在倍率のまま中央へ戻す

## 維持した機能

- CheerpX / Alpine Linux 起動
- Firefox ESR 優先検出・起動
- NetSurf / Dillo / Chromium fallback
- Tailscale 接続
- 外部 ext2 Image 設定と公式 Alpine fallback
- IDB Overlay による永続化
- Image Builder / GitHub Actions 用 build files

## 未確認事項

この環境では実機 iPhone / iOS Safari 上のタッチ操作と、実際に CheerpX + Xorg を最後まで起動した状態での表示確認はできません。HTML/JavaScript の静的構文、リンク、ZIP構成は生成時にチェックしています。特に CheerpX が CSS transform 後の Canvas pointer 座標をどのように扱うかは実機確認が必要です。問題がある場合でも `🖐 移動` をOFFにした通常入力と、Fit/中央復帰は独立しています。
