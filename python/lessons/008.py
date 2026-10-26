# 第8回：リストの基本
# 3つの点数をリストにまとめる
scores = [80, 90, 70]

# リスト全体を表示
print("点数一覧:", scores)

# 番号を指定して取り出す
print("1番目:", scores[0])
print("2番目:", scores[1])
print("3番目:", scores[2])

# len() で個数を調べる
print("点数の個数:", len(scores))

# for文で順番に取り出す
print("点数を順番に表示")
for score in scores:
    print(score)

# 合計と平均を計算する
total = 0
for score in scores:
    total = total + score
print("合計:", total)
print("平均:", total / len(scores))
