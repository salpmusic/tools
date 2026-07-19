salp Linux v0.3 OFFICIAL INPUT

上書き:
- salp-linux.html
- coi-serviceworker.js

確認URL:
https://salpmusic.github.io/tools/salp-linux/salp-linux.html?v=03

v0.3の重要修正:
v0.2ではxterm.jsの入力をTextEncoderでUTF-8バイト化していました。
CheerpX公式仕様では、xterm.js onDataの文字列をcharCodeAt()で
1文字ずつsetCustomConsoleのsend関数へ渡します。

これにより:
- 英数字入力
- Enter
- Backspace
- TAB
- Ctrl+C
- 矢印キーの制御シーケンス
がbashへ正しく届く構成です。

テスト:
uname -a
pwd
ls -la
python3 --version
