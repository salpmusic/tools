# 第3回：文字列のあつかい（BASICのA$との比較）
# Python 3.7 で動く文法のみ

print("=== 文字列の基本 ===")
message = "こんにちは"          # BASICの A$ に相当（$ は不要）
print(message)

print("\n=== つなげる（+） ===")
name = "太郎"
print(name + "さん")
print("こんにちは、" + name)

print("\n=== 長さを調べる（len） ===")
text = "Python"
print(len(text))               # → 6

print("\n=== f-string で埋め込み ===")
name2 = "花子"
print(f"こんにちは、{name2}さん")
print(f"{name2} の長さは {len(name2)} 文字です")

print("\n=== 練習問題1の答え ===")
greeting = "おはよう"
name = "花子"
print(greeting + "、" + name + "さん")

print("\n=== 練習問題2の答え ===")
text = "Python入門"
print(f"{text}の長さは{len(text)}文字です")

print("\n=== おまけ：数字を文字列にする ===")
age = 25
print("年齢は" + str(age) + "歳です")     # str() で文字列に変換
print(f"年齢は{age}歳です")               # f-stringなら自動で変換される
