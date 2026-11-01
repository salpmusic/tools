# 第14回：関数の引数と戻り値

# 1. 引数を2つ渡す
def introduce(name, age):
    print(name + "さんは " + str(age) + " 歳です")


print("1. 引数を2つ")
introduce("太郎", 12)
introduce("花子", 15)


# 2. return で計算結果をもらう
def average(a, b):
    return (a + b) / 2


print("2. 戻り値で計算")
avg = average(70, 90)
print("70 と 90 の平均 =", avg)


# 3. 戻り値をさらに使う
def price_with_tax(price):
    return int(price * 1.1)


def make_label(item, price):
    return item + "：" + str(price) + "円"


print("3. 戻り値をつなげる")
pay = price_with_tax(500)
print(make_label("ノート", pay))
print("2冊なら", pay * 2, "円")
