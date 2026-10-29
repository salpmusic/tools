#!/usr/bin/env python3
"""Python入門コーナーのHTML生成 (標準ライブラリのみ)。
使い方: python3 python/src/build.py           -> lessons/*.html, lessons/*.ipynb(Colab用) と manual.html を再生成
  入力: src/lessons/00N.md (最初の ```python ブロック = lessons/00N.py と同じ内容であること), src/manual.md
"""
import base64, html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../python
RUN_FROM = {"lessons": "../run.html", "": "./run.html"}
LITE_FROM = {"lessons": "../../salp-linux/salp-linux-lite.html", "": "../salp-linux/salp-linux-lite.html"}
COLAB = "https://colab.research.google.com/github/salpmusic/tools/blob/main/python/"
TIOBE = '<p class="note">※<a href="https://www.tiobe.com/tiobe-index/" target="_blank" rel="noopener">TIOBE Index 2026年10月</a></p>'

def b64url(code):
    return base64.urlsafe_b64encode(code.encode("utf-8")).decode().rstrip("=")

def notebook(title, code):
    """nbformat 4: 見出しmarkdownセル + .pyを空行2つで区切ったコードセル"""
    def src(t):
        ls = t.split("\n"); return [x + "\n" for x in ls[:-1]] + ([ls[-1]] if ls[-1] else [])
    cells = [{"cell_type": "markdown", "metadata": {}, "source": src("# " + title)}]
    for c in [c.strip("\n") for c in re.split(r"\n\s*\n\s*\n", code) if c.strip()]:
        cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": src(c)})
    meta = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"}}
    return json.dumps({"cells": cells, "metadata": meta, "nbformat": 4, "nbformat_minor": 4}, ensure_ascii=False, indent=1) + "\n"

def inline(s):
    parts = s.split("`"); out = []
    for i, p in enumerate(parts):
        if i % 2: out.append("<code>" + html.escape(p, quote=False) + "</code>")
        else:
            p = html.escape(p, quote=False).replace("&lt;br&gt;", "<br>")
            p = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", p)
            out.append(p)
    return "".join(out)

def md2html(md, lite, main_py=None, colab=None, run="./run.html"):
    """main_py: (path_from_run, path_from_lite, code) -> 最初のpythonブロックにそのファイルを開くボタン / colab: Colab URL"""
    lines = md.split("\n"); out = []; i = 0; first = True; para = []
    def flush():
        if para: out.append("<p>" + "<br>".join(inline(x.rstrip()) for x in para) + "</p>"); para.clear()
    while i < len(lines):
        l = lines[i]
        if l.startswith("```"):
            flush(); lang = l[3:].strip(); j = i + 1; buf = []
            while not lines[j].startswith("```"): buf.append(lines[j]); j += 1
            code = "\n".join(buf) + "\n"
            out.append('<pre><code class="lang-%s">%s</code></pre>' % (lang or "text", html.escape(code.rstrip("\n"), quote=False)))
            if lang == "python":
                if first and main_py:
                    assert code == main_py[2], "lesson .md の最初のコードと .py が一致しません"
                    out.append('<a class="run" href="%s?py=%s">🐍 ブラウザで実行（軽量版）</a>' % (run, main_py[0]))
                    if colab: out.append('<a class="run colab" href="%s" target="_blank" rel="noopener">📒 Colabで開く</a>' % colab)
                    out.append('<a class="run small" href="%s?py=%s">🐧 PC向け Linux Lite</a>' % (lite, main_py[1]))
                else:
                    b = b64url(code)
                    out.append('<a class="run" href="%s#py=%s">▶ このコードを実行（軽量版）</a>' % (run, b))
                    out.append('<a class="run small" href="%s#py=%s">🐧 PC向け Linux Lite</a>' % (lite, b))
                first = False
            i = j + 1; continue
        if l.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", c) for c in cells): rows.append(cells)
                i += 1
            t = "<table><tr>" + "".join("<th>%s</th>" % inline(c) for c in rows[0]) + "</tr>"
            for r in rows[1:]: t += "<tr>" + "".join("<td>%s</td>" % inline(c) for c in r) + "</tr>"
            out.append(t + "</table>"); continue
        m = re.match(r"(#{1,3}) (.*)", l)
        if m:
            flush(); n = len(m[1]); out.append("<h%d>%s</h%d>" % (n, inline(m[2]), n)); i += 1; continue
        if re.match(r"(- |\d+\. )", l):
            flush(); tag = "ul" if l.startswith("- ") else "ol"; items = []
            while i < len(lines) and re.match(r"(- |\d+\. )", lines[i]):
                items.append(re.sub(r"^(- |\d+\. )", "", lines[i]).rstrip()); i += 1
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(x) for x in items), tag)); continue
        if not l.strip() or l.strip() == "---": flush(); i += 1; continue
        para.append(l); i += 1
    flush(); return "\n".join(out)

def page(title, crumb, body, css):
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} | salp Tools</title><link rel="stylesheet" href="{css}"></head>
<body><div class="wrap"><div class="crumb">{crumb}</div>
{body}
<footer>salp Tools · Python入門コーナー · コードは <a href="{'../' if css.startswith('../') else './'}run.html">軽量版 Python実行</a>(スマホOK)で実行できます。PCでは <a href="{'../' if css.startswith('../') else ''}../salp-linux/salp-linux-lite.html">salp Linux Lite</a>(ブラウザ上のDebian 10 / Python 3.7・重い)でも動作確認しています。</footer>
</div></body></html>
'''

def main():
    data = json.load(open(os.path.join(ROOT, "lessons.json"), encoding="utf-8"))
    for L in data["lessons"]:
        n = "%03d" % L["no"]
        md = open(os.path.join(ROOT, "src", "lessons", n + ".md"), encoding="utf-8").read()
        py = open(os.path.join(ROOT, L["py"]), encoding="utf-8").read()
        md = re.sub(r"^# .*\n", "", md, count=1)
        body = f'<div class="hero"><p class="catch">今1番人気のプログラミング言語 Python入門</p><h1>第{L["no"]}回：{html.escape(L["title"])}</h1>{TIOBE}</div>\n'
        body += md2html(md, LITE_FROM["lessons"], (L["py"], "../python/" + L["py"], py), COLAB + L["py"][:-3] + ".ipynb", RUN_FROM["lessons"])
        open(os.path.join(ROOT, L["py"][:-3] + ".ipynb"), "w", encoding="utf-8").write(notebook("Python入門 第%d回：%s" % (L["no"], L["title"]), py))
        prev = [x for x in data["lessons"] if x["no"] == L["no"] - 1]; nxt = [x for x in data["lessons"] if x["no"] == L["no"] + 1]
        nav = '<p class="panel">' + (f'<a href="../{prev[0]["html"]}">◀ 第{prev[0]["no"]}回</a> · ' if prev else "") + '<a href="../">レッスン一覧</a> · <a href="../manual.html">入門編マニュアル</a>' + (f' · <a href="../{nxt[0]["html"]}">第{nxt[0]["no"]}回 ▶</a>' if nxt else "") + "</p>"
        body += "\n" + nav
        crumb = '<a href="../../">salp Tools</a> › <a href="../">Python入門</a> › 第%d回' % L["no"]
        open(os.path.join(ROOT, L["html"]), "w", encoding="utf-8").write(page("Python入門 第%d回 %s" % (L["no"], L["title"]), crumb, body, "../style.css"))
    md = open(os.path.join(ROOT, "src", "manual.md"), encoding="utf-8").read()
    md = re.sub(r"^# .*\n", "", md, count=1)
    body = '<div class="hero"><p class="catch">今1番人気のプログラミング言語 Python入門</p><h1>入門編マニュアル(BASIC経験者向け)</h1>' + TIOBE + '</div>\n'
    body += '<p class="tip">各コード例の「▶ このコードを実行（軽量版）」を押すと軽量版のPython実行ページにコードが読み込まれます。「▶ 実行」を押すと動きます(初回はPythonの読み込みに少し時間がかかります・スマホOK)。PCでは「🐧 PC向け Linux Lite」で本物のLinux上でも試せます。</p>\n'
    body += md2html(md, LITE_FROM[""], run=RUN_FROM[""]) + '\n<p class="panel"><a href="./">レッスン一覧へ</a></p>'
    open(os.path.join(ROOT, "manual.html"), "w", encoding="utf-8").write(page("Python入門編マニュアル", '<a href="../">salp Tools</a> › <a href="./">Python入門</a> › マニュアル', body, "style.css"))
    print("built", len(data["lessons"]), "lessons + manual")

if __name__ == "__main__": main()
