# 第19回：リストと辞書の入れ子
# 複数のデータをひとまとめにする

# 1. リストの中に辞書を入れる
print("1. リストの中に辞書")

students = [
    {"名前": "太郎", "年齢": 20, "点数": 80},
    {"名前": "花子", "年齢": 19, "点数": 90},
    {"名前": "三郎", "年齢": 21, "点数": 75}
]

print("人数:", len(students))
print("最初の生徒:", students[0])

# 2. 入れ子のデータを取り出す
print("\n2. データを取り出す")

print("最初の名前:", students[0]["名前"])
print("2番目の点数:", students[1]["点数"])

# 3. ループで全員を表示する
print("\n3. 全員の情報")

for student in students:
    print(f"{student['名前']}さん "
          f"{student['年齢']}歳 "
          f"{student['点数']}点")

# 4. 入れ子のデータを変更する
print("\n4. 点数を変更する")

students[0]["点数"] = 85

print("太郎の新しい点数:", students[0]["点数"])

# 5. 条件に合うデータを取り出す
print("\n5. 80点以上の生徒")

for student in students:
    if student["点数"] >= 80:
        print(student["名前"], student["点数"], "点")

# 6. 関数で合計と平均を計算する
print("\n6. 合計と平均")

def average_score(data):
    total = 0
    for student in data:
        total += student["点数"]
    if len(data) == 0:
        return 0
    return total / len(data)

total = sum(student["点数"] for student in students)

print("合計:", total)
print("平均:", average_score(students))

# 7. 辞書の中にリストを入れる
print("\n7. 辞書の中にリスト")

school = {
    "学校名": "さくら学校",
    "教科": ["国語", "数学", "英語"]
}

print("学校名:", school["学校名"])
print("教科:", school["教科"])
print("最初の教科:", school["教科"][0])
