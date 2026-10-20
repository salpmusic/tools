# Python入門編マニュアル

BASICを知っている人が、Pythonの基本を一通り理解するための短いマニュアルです。  
各章に **BASICとの比較表** と **短いコード例** を入れています。

## 第1章 はじめに：PythonとBASICの違い

PythonはBASICより「読みやすく」「構造をはっきり書ける」言語です。  
行番号も `LET` も不要。代わりにインデントでブロックを表します。

| 項目 | BASIC | Python |
|------|-------|--------|
| 行番号 | 必要（またはGOTO） | 不要 |
| 代入 | `LET a = 10` または `a = 10` | `a = 10` |
| 出力 | `PRINT` | `print()` |
| 入力 | `INPUT` | `input()` |
| 条件 | `IF ... THEN` | `if ... :` |
| 繰り返し | `FOR ... NEXT` | `for ... :` / `while ... :` |
| サブルーチン | `GOSUB` / `RETURN` | 関数 `def` |
| 配列 | 次元配列など | リスト `[]` |
| ブロック | 行番号やEND IFなど | インデント（字下げ） |

**短い例（Hello World）**

```python
print("Hello from Python!")
```

## 第2章 変数とデータ型

変数は「名前をつけた箱」です。BASICと違い、`LET` は不要です。

| BASIC | Python |
|-------|--------|
| `LET a = 5` | `a = 5` |
| `LET name$ = "Taro"` | `name = "Taro"` |
| 型を宣言する必要は少ない | 型を宣言しない（動的型付け） |

**コード例**

```python
age = 20          # 整数
price = 1.5       # 小数
name = "塩田"     # 文字列
is_ok = True      # 真偽値（True/False）

print(age)
print(name)
```

**ポイント**: 変数名は小文字＋アンダースコアが一般的（例: `user_name`）。

## 第3章 入出力（print と input）

| BASIC | Python |
|-------|--------|
| `PRINT "名前は"; name$` | `print("名前は", name)` または f文字列 |
| `INPUT "名前を入力"; n$` | `n = input("名前を入力: ")` |

**コード例**

```python
name = input("名前を入力してください: ")
print("こんにちは、", name, "さん！")
```

**注意**: `input()` は常に文字列を返す。数字として使いたいときは `int()` や `float()` で変換する。

## 第4章 制御構文（if / for / while）

### if文

| BASIC | Python |
|-------|--------|
| `IF score >= 60 THEN PRINT "合格"` | `if score >= 60:`<br>`    print("合格")` |
| `IF ... THEN ... ELSE ...` | `if ...:`<br>`else:` |

**コード例**

```python
score = 75
if score >= 60:
    print("合格")
else:
    print("不合格")
```

### for文

| BASIC | Python |
|-------|--------|
| `FOR i = 1 TO 5`<br>`PRINT i`<br>`NEXT i` | `for i in range(1, 6):`<br>`    print(i)` |

**コード例**

```python
for i in range(1, 6):
    print(i)
```

### while文

```python
count = 0
while count < 3:
    print(count)
    count += 1
```

## 第5章 リスト

リストは「複数の値を順番に入れる箱」です。BASICの配列に近いですが、より柔軟です。

**コード例**

```python
fruits = ["りんご", "みかん", "バナナ"]
print(fruits[0])          # 最初の要素（0番目）
fruits.append("ぶどう")   # 追加
print(fruits)
```

| 操作 | Python |
|------|--------|
| 作成 | `a = [1, 2, 3]` |
| 長さ | `len(a)` |
| 追加 | `a.append(4)` |
| 削除 | `a.remove(2)` または `del a[0]` |

## 第6章 関数

BASICの `GOSUB` に近いですが、Pythonの関数は「引数と戻り値」を持てます。

| BASIC | Python |
|-------|--------|
| `GOSUB 1000` | `def greet():`<br>`    ...`<br>`greet()` |
| 戻り値なしが多い | `return` で値を返せる |

**コード例**

```python
def add(a, b):
    return a + b

result = add(3, 5)
print(result)  # 8
```

## 第7章 モジュール（math と random）

標準ライブラリを `import` して使います。

**コード例**

```python
import math
import random

print(math.sqrt(16))      # 4.0
print(random.randint(1, 6))  # 1〜6の乱数
```

## 第8章 次のステップ

ここまでで基本は一通り終わりです。  
次に挑戦すると良いこと：

- 小さなプログラムを自分で書いてみる（計算機、簡単なゲームなど）
- エラーメッセージを読み慣れる
- 公式ドキュメントや簡単なチュートリアルを読む
