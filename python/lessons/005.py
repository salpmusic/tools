# 第5回：比較とif文の例

print("=== 比較演算子の例 ===")
a = 10
b = 20
print("a == 10 :", a == 10)
print("a != 10 :", a != 10)
print("a < b   :", a < b)
print("a > b   :", a > b)
print("a <= 10 :", a <= 10)
print("a >= 20 :", a >= 20)
print()

print("=== if文の基本 ===")
age = 18
if age >= 18:
    print("成人です")
else:
    print("未成年です")
print()

print("=== elif の例 ===")
score = 75
if score >= 80:
    print("よくできました")
elif score >= 60:
    print("合格です")
else:
    print("もう少し頑張りましょう")
print()

print("=== 練習問題1の実行結果 ===")
temp = 25
if temp >= 30:
    print("暑いです")
elif temp >= 20:
    print("ちょうどいいです")
else:
    print("寒いです")
print()

print("=== 練習問題2の実行結果 ===")
name = "太郎"
if name == "太郎":
    print("こんにちは、太郎さん")
else:
    print("はじめまして")
print()

print("=== == と = の違い（エラーにならない例） ===")
x = 5          # これは代入
print("x の値:", x)
if x == 5:     # これは比較
    print("x は 5 です")
