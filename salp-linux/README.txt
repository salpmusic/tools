salp Linux v0.9 BROWSER SETUP

同じ salp-linux フォルダーへ:
- salp-linux.html
- salp-browser.html
- coi-serviceworker.js
- README.txt

確認URL:
https://salpmusic.github.io/tools/salp-linux/salp-linux.html?v=09

手順:
1. GUI Linux起動
2. Tailscale接続
3. 認証ページを開いてログイン
4. 通信テスト
5. NetSurf導入
6. Browser検出
7. URLを入力して起動

重要:
CheerpX内の一般TCP/IP通信はTailscale経由です。
公開インターネットへ接続するには、Tailnet内にExit Nodeが必要です。

インストール:
apk update
apk add netsurf
失敗時は apk add dillo を試します。

Tailscaleの認証情報はHTMLへ保存しません。
CheerpXのインタラクティブログインを使います。
