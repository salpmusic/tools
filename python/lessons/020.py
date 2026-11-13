# 第20回：データの並べ替え
# sortedとsortで順番を整理する

# 1. sorted() で小さい順に並べる
print("1. sorted() で並べ替え")

scores = [80, 95, 70, 85]

new_scores = sorted(scores)

print("元のリスト:", scores)
print("並べ替え後:", new_scores)

# 2. 大きい順に並べる
print("\n2. 大きい順に並べる")

high_scores = sorted(scores, reverse=True)

print("大きい順:", high_scores)
print("元のリスト:", scores)

# 3. sort() で元のリストを並べ替える
print("\n3. sort() で並べ替え")

numbers = [5, 2, 8, 1, 4]

print("並べ替え前:", numbers)

numbers.sort()

print("並べ替え後:", numbers)

numbers.sort(reverse=True)

print("大きい順:", numbers)

# 4. 文字列を並べ替える
print("\n4. 文字列の並べ替え")

fruits = ["orange", "apple", "banana"]

print("元のリスト:", fruits)
print("アルファベット順:", sorted(fruits))

# 5. 辞書のリストを点数順に並べる
print("\n5. 辞書のリストを並べる")

students = [
    {"名前": "太郎", "点数": 80},
    {"名前": "花子", "点数": 95},
    {"名前": "三郎", "点数": 70}
]

def get_score(student):
    return student["点数"]

sorted_students = sorted(students, key=get_score)

print("点数の低い順")
for student in sorted_students:
    print(student["名前"], student["点数"], "点")

# 6. 点数の高い順に並べる
print("\n6. 点数の高い順")

ranking = sorted(students, key=get_score, reverse=True)

for student in ranking:
    print(student["名前"], student["点数"], "点")

# 7. 元の順番を確認する
print("\n7. 元の順番を確認")

for student in students:
    print(student["名前"], student["点数"], "点")
