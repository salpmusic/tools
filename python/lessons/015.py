# 第15回：デフォルト引数とキーワード引数

# 1. デフォルト引数
# ending を省略すると "!" が使われる
def greet(name, ending="!"):
    return f"Hello, {name}{ending}"


print("1. デフォルト引数")
print(greet("Mika"))
print(greet("Ken", "."))
print(greet("Yuki", "!!"))


# 2. キーワード引数
# 引数の名前を指定して値を渡す
def introduce(name, city):
    return f"{name} lives in {city}."


print()
print("2. キーワード引数")
# 普通は定義した順番で渡す
print(introduce("Mika", "Tokyo"))
# 名前を指定すれば順番を入れ替えられる
print(introduce(city="Osaka", name="Ken"))


# 3. デフォルト引数とキーワード引数
# tax_rate の初期値は 0.10（10%）
def total_price(price, tax_rate=0.10):
    total = price * (1 + tax_rate)
    return round(total)


print()
print("3. 税込み価格")
print("1000円 → " + str(total_price(1000)) + "円")
print("1000円 → " + str(total_price(1000, 0.08)) + "円")
print("2000円 → " + str(total_price(2000, tax_rate=0.08)) + "円")


# 4. 位置引数とキーワード引数の組み合わせ
print()
print("4. 引数の組み合わせ")
print(greet("Hana", ending="♪"))
print(greet("Taro"))
