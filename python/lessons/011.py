# 第11回：for文でリストを回す

# 1. 値だけ順に取り出す
fruits = ["りんご", "みかん", "バナナ"]
print("1. 果物を順番に")
for fruit in fruits:
    print(fruit)


# 2. 合計を求める（値だけあればよい例）
scores = [80, 90, 70]
print("2. 点数の合計")
total = 0
for score in scores:
    total = total + score
print("合計 =", total)


# 3. 番号も欲しいとき（BASICの添字ループに近い）
names = ["太郎", "花子", "次郎"]
print("3. 番号付きで表示")
for i in range(len(names)):
    print(i, "番目:", names[i])


# 4. 表示用に番号を1からにする
print("4. 1から数える表示")
for i in range(len(names)):
    print(i + 1, "人目:", names[i])
