# Python入門コーナー 更新手順(1日1レッスン)

1. `python/src/lesson-template.md` をコピーして `python/src/lessons/00N.md` を書く(最初の ```python ブロックがレッスンのメインコード)。
2. メインコードと同じ内容を `python/lessons/00N.py` に保存(build.py が一致を確認)。
3. `python/lessons.json` の `lessons` に1行追加:
   `{"no":N,"date":"YYYY-MM-DD","title":"…","goal":"…","html":"lessons/00N.html","py":"lessons/00N.py"}`
4. `python3 python/src/build.py` → `lessons/00N.html` が生成され、前後リンクも更新される(manual.html も再生成)。同時に `lessons/00N.ipynb`(Colab用ノートブック)が `00N.py` から生成され、レッスンページに「📒 Colabで開く」ボタン(`https://colab.research.google.com/github/salpmusic/tools/blob/main/python/lessons/00N.ipynb`)が付く。ipynb は手で編集しない。
5. コードを salp Linux Lite で確認: `https://salpmusic.github.io/tools/salp-linux/salp-linux-lite.html?py=../python/lessons/00N.py&run=1`
6. commit → push。一覧(python/index.html)は lessons.json から自動表示。ホームのカード文言は任意(件数表示「N LESSONS」を変える程度)。

注意: salp Linux Lite の Python は 3.7.3(Debian 10)。`:=`(3.8)、`f"{x=}"`(3.8)、`match`(3.10) は使えない。
受け渡し: `?py=<同一サイトの .py パス>` または `#py=<UTF-8のbase64url>`、`&run=1` で起動後に自動実行。
Colab用ノートブック: .py を空行2つで区切るとコードセルが分かれる(1つなら1セル)。Colab は push 後に main ブランチの ipynb を読む。
