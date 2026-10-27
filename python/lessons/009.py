# 第9回 リストの追加と削除
scores = [60, 70, 80]
print("最初:", scores)

# appendで末尾に追加
scores.append(90)
print("追加後:", scores)

# 値を書き換える
scores[0] = 100
print("書き換え後:", scores)

# removeで値を指定して削除
scores.remove(70)
print("70を削除:", scores)

# popで番号を指定して取り出す
taken = scores.pop(1)
print("取り出した値:", taken)
print("pop後:", scores)

# pop()は末尾を取り出す
last = scores.pop()
print("末尾の値:", last)
print("最後:", scores)
