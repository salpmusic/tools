# 第18回：辞書をもう一歩
# items・get・更新と削除、関数と組み合わせる

# 1. 辞書の復習
print("1. 辞書の復習")

scores = {"太郎": 80, "花子": 90, "三郎": 75}

print(scores)
print("太郎の点数:", scores["太郎"])

# 2. keys()・values()・items()
print("\n2. 辞書の一覧表示")

print("名前の一覧")
for name in scores.keys():
    print(name)

print("点数の一覧")
for score in scores.values():
    print(score)

print("名前と点数の一覧")
for name, score in scores.items():
    print(name, ":", score, "点")

# 3. get() で安全に取り出す
print("\n3. get() で取り出す")

print("花子:", scores.get("花子", 0))
print("四郎:", scores.get("四郎", 0))

# 4. 辞書を更新する
print("\n4. 辞書の更新")

scores["太郎"] = 85
scores.update({"花子": 95, "四郎": 70})

print(scores)

# 5. 辞書から削除する
print("\n5. 辞書の削除")

removed = scores.pop("三郎", None)
print("削除した点数:", removed)
print(scores)

# 6. 辞書を関数に渡す
print("\n6. 辞書を関数に渡す")

def show_scores(data):
    for name, score in data.items():
        print(f"{name}さんは{score}点です")

show_scores(scores)

# 7. 関数から辞書を返す
print("\n7. 関数から辞書を返す")

def make_student(name, score):
    return {"名前": name, "点数": score}

student = make_student("五郎", 88)
print(student)
print(student.get("名前", "不明"))
