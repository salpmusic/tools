# 第17回：キーワード可変長引数 **kwargs
# Python 3.7.3 対応

# 1. 名前付きの引数をまとめて受け取る
def show_info(**kwargs):
    print(kwargs)

print("1. kwargs の基本")
show_info(name="Taro", age=25)
show_info(name="Hanako", city="Tokyo", hobby="Music")


# 2. キーと値を取り出す
def show_profile(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print("\n2. キーと値")
show_profile(name="Mika", age=20, city="Osaka")


# 3. 個数を調べる
def count_info(**kwargs):
    print("情報の個数:", len(kwargs))

print("\n3. 情報の個数")
count_info(name="Taro", age=25, city="Tokyo")
count_info(name="Hanako")
count_info()


# 4. 普通の引数と **kwargs を組み合わせる
def show_card(title, **info):
    print("タイトル:", title)

    for key, value in info.items():
        print(f"{key}: {value}")

print("\n4. 情報カード")
show_card("自己紹介", name="Taro", age=25, city="Tokyo")
show_card("商品情報", name="Apple", price=150)


# 5. 特定のキーの値を取り出す
def show_student(**kwargs):
    name = kwargs.get("name", "名前なし")
    score = kwargs.get("score", 0)

    print(f"{name}さんの点数: {score}点")

print("\n5. 辞書から値を取り出す")
show_student(name="Yuki", score=90)
show_student(name="Ken")
show_student()


# 6. *args と **kwargs を組み合わせる
def show_data(*args, **kwargs):
    print("位置引数:", args)
    print("名前付き引数:", kwargs)

print("\n6. args と kwargs")
show_data(10, 20, name="Taro", city="Tokyo")


# 7. for で情報を一覧表示する
def show_items(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")

print("\n7. 商品一覧")
show_items(apple=150, banana=100, orange=120)
