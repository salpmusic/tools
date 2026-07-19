salp Linux v0.8 BROWSER LAUNCHER

同じ salp-linux フォルダーへ:
- salp-linux.html
- salp-browser.html  ← 新規
- coi-serviceworker.js
- README.txt

確認URL:
https://salpmusic.github.io/tools/salp-linux/salp-linux.html?v=08

流れ:
1. Debian Linuxを起動
2. DesktopのBrowserアイコンを押す
3. salp Browser Labを起動
4. GUI Linux起動
5. Browser検出
6. 見つかればURL付きで起動

v0.8で確実に使えるGUIアプリ:
- xterm
- Thunar または PCManFM
- rofiアプリランチャー
- Xorg / i3

重要:
公式Alpine GUIイメージのDockerfileにはChromium・Firefox等は含まれていません。
そのためv0.8はブラウザーを自動検出し、未導入の場合は明確に表示します。
次段階ではChromium/NetSurf等を含むカスタムext2イメージが必要です。
