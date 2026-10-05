# salp Browser Desktop — Reset v0.1

Android版 salp Linux Mobile PC の実際の画面HTMLを元に、ブラウザーで使う版を作成しました。
参照: https://github.com/salpmusic/salp-linux-mobile-pc/blob/df285d0e2f15dbb9a84eb003add32f6cd9b99eca/app/src/main/assets/index.html

## 開く

GitHub Pages等のHTTPSホストにこのフォルダを一式配置し、index.htmlを開きます。Android専用のGeckoViewは搭載していません。BrowserはSafari/Chromeで別タブを開きます。

## デスクトップ

Android版と同じデスクトップ・アイコン・Startメニュー・ウィンドウ構成です。スマホ向けに表示を調整しています。
- Files: 1MB以下のテキストファイルの読み込み、Editorで開く、書き出す。
- Editor: 下書きの自動保存、名前を付けたローカル保存、日本語ファイルの書き出し。
- Browser: URLと検索語の入力、Enterで開く。
- Command Tools: ブラウザー用のhelp/date/echo等。Linuxシェルではありません。

FilesとEditorの内容はこの端末のこのサイトのブラウザー保存領域に保存します。サイトデータ削除で失われるため必要なものは書き出してください。旧版のデータは削除していません。

## 実際のLinux

「Linux実行」は別ページlinux.htmlです。既存の複雑なGUIランチャーや表示切替は使っていません。CheerpX 1.3.5 + Alpineを使います。
- Terminalを初期モードにし、/bin/shによる短いコマンドの終了コードを確認してから/bin/ashを開始。
- GUIを選ぶ場合のみ、720×1080のKMSを一度設定して/sbin/initを開始。
- 仮想画面のサイズを起動後に変更しません。CSSで全体表示を調整。
- Linuxエラーが発生したら入力を停止して診断を表示。Desktopに戻れます。
- Terminalはテキスト表示です。vim等の全画面端末アプリの表示には対応していません。
- ブラウザー入りext2は付属しません。必要ならイメージURLを指定します。
- Linux内のインターネットにはTailscaleとExit Nodeが必要です。

## 検証

Chromiumのスマホ表示で、320/390/430/768pxの画面、Editor保存・再読込、Unicodeダウンロード、テキスト読み込み、ファイル名とコマンド出力のHTML無効化、URL/検索処理をテストしました。

実際のLinuxの実行テストも試みましたが、テスト環境のChromiumから外部CheerpXモジュールを読み込めず、Linux起動を確認できませんでした。iPhone上のcall_indirectエラーの根本原因は未特定です。この版で本物のLinuxが起動することを保証するものではありません。Desktopの動作確認とLinuxの実行確認は別です。

API参考: https://cheerpx.io/docs/reference/CheerpX.Linux/setCustomConsole
