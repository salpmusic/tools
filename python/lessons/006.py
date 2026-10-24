# 第6回：for文とrange

# 1. 5回くり返す
print("1. 5回くり返す")
for i in range(5):
    print("こんにちは", i)

# 2. 1から5まで表示
print("2. 1から5まで")
for i in range(1, 6):
    print(i)

# 3. 2ずつ増やす
print("3. 奇数を表示")
for i in range(1, 10, 2):
    print(i)

# 4. くり返しで合計を計算
print("4. 1から5の合計")
total = 0
for i in range(1, 6):
    total = total + i
print("合計 =", total)
