# 第12回：辞書の基本

# 1. 辞書を作る（キー: 値）
scores = {"太郎": 80, "花子": 90, "次郎": 70}
print("1. 辞書そのもの")
print(scores)


# 2. キーで値を取り出す
print("2. キーで取り出す")
print("太郎の点数:", scores["太郎"])
print("花子の点数:", scores["花子"])


# 3. 追加と更新
print("3. 追加と更新")
scores["三郎"] = 85
print("三郎を追加:", scores)
scores["太郎"] = 88
print("太郎を更新:", scores)


# 4. キーがあるか調べる
print("4. キーがあるか")
if "花子" in scores:
    print("花子はあります")
if "四郎" not in scores:
    print("四郎はありません")
