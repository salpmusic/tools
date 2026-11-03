# 第16回：可変長引数 *args
# Python 3.7.3 対応

# 1. いくつでも数を受け取る
def total(*args):
    return sum(args)

print("1. 合計")
print(total(10, 20))
print(total(10, 20, 30))
print(total(5, 10, 15, 20))


# 2. args の中身を確認する
def show_numbers(*args):
    print("受け取った値:", args)
    print("個数:", len(args))

print("\n2. args の中身")
show_numbers(10, 20, 30)


# 3. 平均を計算する
def average(*args):
    if len(args) == 0:
        return 0
    return sum(args) / len(args)

print("\n3. 平均")
print(average(80, 90, 70))
print(average(60, 80))
print(average())


# 4. 普通の引数と *args を組み合わせる
def show_scores(label, *scores):
    print(label)
    print("点数:", scores)

    if len(scores) == 0:
        print("平均: データなし")
    else:
        avg = sum(scores) / len(scores)
        print(f"平均: {avg:.1f}点")

print("\n4. 点数の表示")
show_scores("国語", 80, 90, 70)
show_scores("数学", 95, 85)
show_scores("英語")


# 5. print も複数の値を受け取れる
print("\n5. print の例")
print("りんご", "みかん")
print("赤", "青", "緑", "黄色")


# 6. *args を for 文で取り出す
def show_items(*args):
    for item in args:
        print("商品:", item)

print("\n6. 商品一覧")
show_items("パン", "牛乳", "卵")
