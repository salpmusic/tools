# 第10回：リストのインデックスとスライス

fruits = ["りんご", "みかん", "バナナ", "ぶどう", "もも"]

# 正のインデックス（先頭は0）
print("先頭:", fruits[0])
print("3番目:", fruits[2])

# 負のインデックス（末尾は-1）
print("最後:", fruits[-1])
print("後ろから2番目:", fruits[-2])

# スライス（終了位置は含まない）
print("1番目から3番目:", fruits[0:3])
print("2番目から4番目:", fruits[1:4])

# 開始・終了の省略
print("先頭から3個:", fruits[:3])
print("3番目から最後:", fruits[2:])
print("全部:", fruits[:])

# スライスの結果は新しいリスト
part = fruits[1:3]
print("取り出したリスト:", part)
