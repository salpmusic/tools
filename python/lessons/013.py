# 第13回：関数の定義

# 1. 引数なしの関数
def say_hello():
    print("こんにちは")
    print("今日もよろしく")


print("1. 引数なし")
say_hello()
say_hello()


# 2. 引数ありの関数
def greet(name):
    print("こんにちは、" + name + "さん")


print("2. 引数あり")
greet("太郎")
greet("花子")


# 3. 戻り値（return）を軽く
def add(a, b):
    return a + b


print("3. 戻り値")
total = add(3, 5)
print("3 + 5 =", total)
print("10 + 20 =", add(10, 20))
