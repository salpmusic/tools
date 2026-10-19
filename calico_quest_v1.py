#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三毛猫の冒険 ～月の鈴をさがして～ v1.0
Python 3 standard library only. Works in line-based browser Linux terminals.
"""

import base64
import binascii
import json
import random
import zlib
from pathlib import Path

TITLE = "三毛猫の冒険 ～月の鈴をさがして～"
SAVE_NAME = ".salp_calico_quest_v1.json"
MAPS = {
    "village": {
        "name": "こもれび村 / Village",
        "rows": [
            "#################",
            "#..S........H...#",
            "#...............#",
            "#....##.........#",
            "#....##.........#",
            "#...............#",
            "#.......N.......#",
            "#...............#",
            "#............F..#",
            "#################",
        ],
    },
    "forest": {
        "name": "風の森 / Forest",
        "rows": [
            "#################",
            "#..C............#",
            "#...####........#",
            "#...............#",
            "#.....N.........#",
            "#....####....C..#",
            "#.........E.....#",
            "#...............#",
            "#V.........D....#",
            "#################",
        ],
    },
    "cave": {
        "name": "しずくの洞窟 / Cave",
        "rows": [
            "#################",
            "#...............#",
            "#...##C.........#",
            "#...............#",
            "#......###......#",
            "#..C...###..B...#",
            "#......###......#",
            "#...............#",
            "#F............T.#",
            "#################",
        ],
    },
    "shrine": {
        "name": "月の神殿 / Moon Shrine",
        "rows": [
            "#################",
            "#...............#",
            "#.......C.......#",
            "#...##.....##...#",
            "#...............#",
            "#.......B.......#",
            "#...............#",
            "#...............#",
            "#D..............#",
            "#################",
        ],
    },
}

# One-way arrival points sit next to (not on) the next map's entrance.
PORTALS = {
    ("village", "F"): ("forest", 2, 8),
    ("forest", "V"): ("village", 12, 8),
    ("forest", "D"): ("cave", 2, 8),
    ("cave", "F"): ("forest", 10, 8),
    ("cave", "T"): ("shrine", 2, 8),
    ("shrine", "D"): ("cave", 13, 8),
}

ENEMIES = {
    "slime": ("木の実スライム", 12, 4, 0, 7, 5),
    "crow": ("森のカラス", 15, 5, 1, 9, 7),
    "raccoon": ("いたずらタヌキ", 20, 6, 1, 12, 9),
    "bat": ("洞窟コウモリ", 18, 7, 1, 12, 9),
    "mushroom": ("歩くキノコ", 24, 8, 2, 15, 11),
    "shadow": ("影のネコ", 29, 10, 2, 19, 14),
    "forest_guard": ("森の門番", 26, 7, 1, 16, 12),
    "cave_boss": ("水晶オオカミ", 50, 10, 2, 34, 22),
    "last_boss": ("月影ドラゴン", 82, 12, 3, 62, 45),
}
WANDERERS = {
    "forest": ("slime", "crow", "raccoon"),
    "cave": ("bat", "mushroom"),
    "shrine": ("shadow", "mushroom"),
}


def new_game():
    return {
        "version": 1,
        "area": "village", "x": 3, "y": 2,
        "level": 1, "xp": 0, "hp": 32, "mp": 12, "gold": 25,
        "items": {"fish": 3, "tea": 1}, "gear": 0,
        "opened": [], "defeated": [], "flags": [], "steps": 0, "won": False,
    }


def hp_max(s):
    return 32 + (int(s["level"]) - 1) * 8


def mp_max(s):
    return 12 + (int(s["level"]) - 1) * 2


def attack(s):
    return 6 + (int(s["level"]) - 1) * 2


def defense(s):
    return 1 + (int(s["level"]) - 1) // 2 + int(s["gear"])


def xp_goal(level):
    return 15 * level * (level + 1) // 2


def say(message=""):
    print(message, flush=True)


def ask(message="操作 > "):
    try:
        return input(message).strip().lower()
    except (EOFError, KeyboardInterrupt):
        say("\n入力が終了しました。ここまでの冒険を保存します。")
        return "q"


def validate(s):
    """Validate imported data without trusting a save file or pasted code."""
    if not isinstance(s, dict) or s.get("version") != 1:
        raise ValueError("セーブデータの形式が違います。")
    a = s.get("area")
    if a not in MAPS:
        raise ValueError("マップ名が不正です。")
    for key, low, high in (
        ("x", 0, 100), ("y", 0, 100), ("level", 1, 99),
        ("xp", 0, 1000000), ("hp", 1, 10000), ("mp", 0, 10000),
        ("gold", 0, 1000000), ("gear", 0, 3), ("steps", 0, 9999999),
    ):
        value = s.get(key)
        if type(value) is not int or not low <= value <= high:
            raise ValueError(key + " の値が不正です。")
    if s["hp"] > hp_max(s) or s["mp"] > mp_max(s):
        raise ValueError("HPまたはMPの値が不正です。")
    rows = MAPS[a]["rows"]
    x, y = s["x"], s["y"]
    if not 0 <= y < len(rows) or not 0 <= x < len(rows[y]) or rows[y][x] == "#":
        raise ValueError("プレイヤーの位置が不正です。")
    items = s.get("items")
    if not isinstance(items, dict):
        raise ValueError("道具データが不正です。")
    for key in ("fish", "tea"):
        if type(items.get(key)) is not int or not 0 <= items[key] <= 999:
            raise ValueError("道具の数が不正です。")
    for key in ("opened", "defeated", "flags"):
        if not isinstance(s.get(key), list) or len(s[key]) > 100:
            raise ValueError(key + " が不正です。")
        if any(not isinstance(v, str) or len(v) > 80 for v in s[key]):
            raise ValueError(key + " の文字列が不正です。")
    if type(s.get("won")) is not bool:
        raise ValueError("クリア記録が不正です。")
    return s


def save_locations():
    try:
        home = Path.home()
    except Exception:
        home = Path.cwd()
    # The browser Linux filesystem may reset; backup code is recommended.
    return [home / SAVE_NAME, Path.cwd() / SAVE_NAME]


def save_game(s, quiet=False):
    data = json.dumps(validate(s), ensure_ascii=False, indent=2)
    tried = set()
    for p in save_locations():
        if str(p) in tried:
            continue
        tried.add(str(p))
        try:
            # Write to a separate file before replacing the saved game.
            temp = p.with_name(p.name + ".tmp")
            temp.write_text(data, encoding="utf-8")
            temp.replace(p)
            if not quiet:
                say("💾 保存しました: " + str(p))
            return True
        except (OSError, ValueError):
            pass
    if not quiet:
        say("⚠️ このLinuxではファイル保存できませんでした。'c' の引継コードを控えてね。")
    return False


def load_game():
    for p in save_locations():
        try:
            if p.is_file():
                return validate(json.loads(p.read_text(encoding="utf-8")))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return None


def make_code(s):
    content = json.dumps(validate(s), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return "MIKE1-" + base64.urlsafe_b64encode(zlib.compress(content, 9)).decode("ascii").rstrip("=")


def from_code(code):
    code = code.strip().replace(" ", "").replace("\n", "")
    if not code.upper().startswith("MIKE1-"):
        raise ValueError("MIKE1- で始まるコードを入力してね。")
    encoded = code[6:]
    if len(encoded) > 2500 or not encoded:
        raise ValueError("コードが長すぎるか、空です。")
    try:
        raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        # Limit decompressed size to avoid huge or malicious payloads.
        d = zlib.decompressobj()
        text = d.decompress(raw, 5000)
        if d.unconsumed_tail or not d.eof:
            raise ValueError("コードの内容が大きすぎるか不完全です。")
        return validate(json.loads(text.decode("utf-8")))
    except (ValueError, UnicodeDecodeError, binascii.Error, zlib.error) as e:
        raise ValueError("コードを読み取れません: " + str(e)) from e


def status(s):
    say("\n--- 三毛猫・みけのステータス ---")
    say("場所: " + MAPS[s["area"]]["name"])
    say("Lv.{level}   HP {hp}/{hpm}   MP {mp}/{mpm}".format(
        level=s["level"], hp=s["hp"], hpm=hp_max(s), mp=s["mp"], mpm=mp_max(s)))
    say("攻撃 {0} / 防御 {1} / お金 {2}G".format(attack(s), defense(s), s["gold"]))
    say("経験値 {0} / 次のLvまで {1}".format(s["xp"], max(0, xp_goal(s["level"]) - s["xp"])))
    relics = ["太陽のしずく" if "sun" in s["flags"] else "未発見", "月のかけら" if "moon" in s["flags"] else "未発見"]
    say("宝物: " + " / ".join(relics))
    say("首輪: " + ("なし", "木の首輪", "銀の首輪", "月光の首輪")[s["gear"]])
    say("冒険: {0}歩 / {1}".format(s["steps"], "★ 物語クリア！" if s["won"] else "月の神殿を目指そう"))


def help_screen():
    say("""
==== あそびかた / HOW TO PLAY ====
移動      : w=上  a=左  s=下  d=右  (入力後 Enter)
その他    : i=道具  p=状態  m=地図  h=ヘルプ
保存      : v=ファイル保存  c=引継コード  l=コード読込
終了      : q=保存して終了
戦闘      : 1=ひっかく 2=月の魔法 3=ガード 4=道具 5=逃げる
地図記号  : @=みけ #=壁 C=宝箱 S=店 H=回復 N=住人
            E=敵 B=ボス F/V/D/T=別マップへの入口

物語: 森で「太陽のしずく」、洞窟で「月のかけら」を集め、
      月の神殿で消えかけた月の鈴を取り戻そう！
注意: ブラウザーLinuxの仮想ディスクは再読み込みで消える
      場合があります。ときどき c で引継コードも控えてね。
""")


def chest_id(area, x, y):
    return "{}:{}:{}".format(area, x, y)


def tile_at(s, x, y):
    return MAPS[s["area"]]["rows"][y][x]


def draw_map(s):
    status_line = "[Lv.{0} HP {1}/{2} MP {3}/{4} {5}G]".format(
        s["level"], s["hp"], hp_max(s), s["mp"], mp_max(s), s["gold"])
    say("\n" + "=" * 34)
    say(MAPS[s["area"]]["name"] + " " + status_line)
    for y, row in enumerate(MAPS[s["area"]]["rows"]):
        output = []
        for x, tile in enumerate(row):
            ident = chest_id(s["area"], x, y)
            if (x, y) == (s["x"], s["y"]):
                output.append("@")
            elif tile == "C" and ident in s["opened"]:
                output.append("o")
            elif tile in ("E", "B") and ident in s["defeated"]:
                output.append(".")
            else:
                output.append(tile)
        say("".join(output))
    say("w/a/s/d=移動  i=道具  p=状態  h=説明  v=保存  q=終了")


def add_xp(s, amount):
    s["xp"] += amount
    while s["level"] < 99 and s["xp"] >= xp_goal(s["level"]):
        s["level"] += 1
        s["hp"] = hp_max(s)
        s["mp"] = mp_max(s)
        say("\n✨ レベルアップ！ Lv.{0}！ HPとMPが全回復！".format(s["level"]))


def use_item(s, kind):
    if s["items"][kind] <= 0:
        say("その道具はもう持っていないよ。")
        return False
    if kind == "fish":
        if s["hp"] >= hp_max(s):
            say("HPは満タンだよ。")
            return False
        gain = min(20, hp_max(s) - s["hp"])
        s["hp"] += gain
        say("🐟 おさかなを食べた！ HP +{0}".format(gain))
    elif kind == "tea":
        if s["mp"] >= mp_max(s):
            say("MPは満タンだよ。")
            return False
        gain = min(10, mp_max(s) - s["mp"])
        s["mp"] += gain
        say("🍵 あたたかいお茶！ MP +{0}".format(gain))
    s["items"][kind] -= 1
    return True


def inventory(s, battle=False):
    say("\n🎒 持ち物")
    say("1. おさかな ×{0} (HP +20)".format(s["items"]["fish"]))
    say("2. あたたかいお茶 ×{0} (MP +10)".format(s["items"]["tea"]))
    say("0. 戻る")
    while True:
        choice = ask("使う番号 > ")
        if choice in ("0", "", "q"):
            return False
        if choice == "1":
            used = use_item(s, "fish")
        elif choice == "2":
            used = use_item(s, "tea")
        else:
            say("1、2、0を選んでね。")
            continue
        if used and not battle:
            save_game(s, quiet=True)
        if used:
            return True


def faint(s):
    lost = s["gold"] // 5
    s["gold"] -= lost
    s["area"], s["x"], s["y"] = "village", 3, 2
    s["hp"], s["mp"] = hp_max(s), mp_max(s)
    say("\n💤 みけは力尽きた……村のベッドで目覚めた！")
    say("村のみんなに助けてもらい、HP/MP全回復。お金を {0}G 落とした。".format(lost))
    say("レベル・宝物・道具・宝箱の記録はそのままだよ。")
    save_game(s, quiet=True)


def battle(s, enemy_key, boss=False):
    name, max_hp, power, armor, exp, gold = ENEMIES[enemy_key]
    foe_hp = max_hp
    say("\n⚔️ {0} が現れた！".format(name))
    if boss:
        say("🔥 ボス戦！ 逃げることはできない！")
    guard = False
    while foe_hp > 0:
        say("\nみけ HP {0}/{1} MP {2}/{3} | {4} HP {5}/{6}".format(
            s["hp"], hp_max(s), s["mp"], mp_max(s), name, foe_hp, max_hp))
        say("1.ひっかく  2.月の魔法(4MP)  3.ガード(+1MP)  4.道具  5.逃げる")
        cmd = ask("戦う > ")
        if cmd in ("1", "a"):
            dmg = max(1, attack(s) + random.randint(-2, 3) - armor)
            foe_hp = max(0, foe_hp - dmg)
            say("🐾 みけのひっかき！ {0}ダメージ！".format(dmg))
        elif cmd in ("2", "magic"):
            if s["mp"] < 4:
                say("MPが足りない！")
                continue
            s["mp"] -= 4
            dmg = 10 + s["level"] * 3 + random.randint(0, 4)
            foe_hp = max(0, foe_hp - dmg)
            say("🌙 月の光！ {0}ダメージ！".format(dmg))
        elif cmd in ("3", "g"):
            guard = True
            s["mp"] = min(mp_max(s), s["mp"] + 1)
            say("🛡️ 身を丸めてガード！ 受けるダメージが減る。")
        elif cmd in ("4", "i"):
            if not inventory(s, battle=True):
                continue
        elif cmd in ("5", "r"):
            if boss:
                say("このボスからは逃げられない！")
                continue
            if random.random() < 0.72:
                say("💨 うまく逃げられた！")
                save_game(s, quiet=True)
                return "ran"
            say("逃げられなかった！")
        elif cmd == "q":
            save_game(s, quiet=True)
            say("💾 冒険を保存して終了しました。次は戦闘の最初から再開します。")
            raise SystemExit(0)
        else:
            say("1～5から選んでね。")
            continue

        if foe_hp <= 0:
            say("\n🎉 {0} に勝った！ 経験値 +{1} / {2}G".format(name, exp, gold))
            s["gold"] += gold
            add_xp(s, exp)
            save_game(s, quiet=True)
            return "won"
        dmg = max(1, power + random.randint(-2, 2) - defense(s))
        if guard:
            dmg = max(1, (dmg + 1) // 2)
        guard = False
        s["hp"] = max(0, s["hp"] - dmg)
        say("💥 {0} の攻撃！ みけに {1}ダメージ！".format(name, dmg))
        if s["hp"] <= 0:
            faint(s)
            return "lost"
    return "won"


def shop(s):
    while True:
        say("\n🏪 こもれび商店 (所持金 {0}G)".format(s["gold"]))
        say("1. おさかな +1 …… 8G   (HP +20)")
        say("2. あたたかいお茶 +1 …… 10G (MP +10)")
        if s["gear"] == 0:
            say("3. 木の首輪 …… 20G (防御 +1)")
        elif s["gear"] == 1:
            say("3. 銀の首輪 …… 45G (防御 +1、買い替え)")
        else:
            say("3. 首輪 …… 売り切れ")
        say("0. お店を出る")
        cmd = ask("買い物 > ")
        if cmd in ("0", "", "q"):
            return
        item = {"1": ("fish", 8), "2": ("tea", 10)}.get(cmd)
        if item:
            kind, price = item
            if s["gold"] < price:
                say("お金が足りないよ。")
            else:
                s["gold"] -= price
                s["items"][kind] += 1
                say("お買い上げありがとう！")
                save_game(s, quiet=True)
        elif cmd == "3" and s["gear"] < 2:
            price = 20 if s["gear"] == 0 else 45
            if s["gold"] < price:
                say("お金が足りないよ。")
            else:
                s["gold"] -= price
                s["gear"] += 1
                say("✨ 新しい首輪を装備！ 防御が1上がった！")
                save_game(s, quiet=True)
        else:
            say("その商品は選べないよ。")


def chest(s, ident):
    if ident in s["opened"]:
        say("空の宝箱だ。")
        return
    area, pos = s["area"], (s["x"], s["y"])
    say("\n🎁 宝箱を開けた！")
    if area == "forest" and pos == (3, 1):
        say("☀️ 『太陽のしずく』を見つけた！")
        if "sun" not in s["flags"]:
            s["flags"].append("sun")
        say("森の奥に暖かな光が戻った。")
    elif area == "forest":
        say("🐟 おさかなを2つ見つけた！")
        s["items"]["fish"] += 2
    elif area == "cave" and pos == (6, 2):
        say("🍵 お茶を2つ見つけた！")
        s["items"]["tea"] += 2
    elif area == "cave":
        say("🐟 おさかなを3つ見つけた！")
        s["items"]["fish"] += 3
    else:
        say("🐟 おさかな2つ、お茶2つを見つけた！")
        s["items"]["fish"] += 2
        s["items"]["tea"] += 2
    s["opened"].append(ident)
    save_game(s, quiet=True)


def event_on_tile(s, tile):
    area, x, y = s["area"], s["x"], s["y"]
    ident = chest_id(area, x, y)
    if tile == "S":
        shop(s)
    elif tile == "H":
        s["hp"], s["mp"] = hp_max(s), mp_max(s)
        say("🏠 やさしい宿屋でひと休み。HP/MP全回復！")
        save_game(s, quiet=True)
    elif tile == "N":
        if area == "village":
            say("👵 『森の宝箱に太陽のしずく、洞窟の狼に月のかけら。2つあれば神殿に入れるよ』")
        else:
            say("🦉 『宝箱は C、洞窟への入口は D だホー。戦いの前に魚を用意するホー』")
    elif tile == "C":
        chest(s, ident)
    elif tile == "E" and ident not in s["defeated"]:
        if battle(s, "forest_guard") == "won":
            s["defeated"].append(ident)
            say("森の門番は道を譲った。")
            save_game(s, quiet=True)
    elif tile == "B" and ident not in s["defeated"]:
        boss_key = "cave_boss" if area == "cave" else "last_boss"
        if battle(s, boss_key, boss=True) == "won":
            s["defeated"].append(ident)
            if area == "cave":
                if "moon" not in s["flags"]:
                    s["flags"].append("moon")
                say("🌙 『月のかけら』を手に入れた！ 神殿への道が開く。")
            else:
                s["won"] = True
                say("\n" + "★" * 23)
                say("🌸 月の鈴が再び鳴り響いた！")
                say("三毛猫みけの冒険は大成功！")
                say("こもれび村にも平和と花の香りが戻った。")
                say("   THE END — おめでとう！")
                say("★" * 23)
                say("クリア後も探索やレベルアップを続けられるよ。")
            save_game(s, quiet=True)
    elif (area, tile) in PORTALS:
        if area == "cave" and tile == "T" and not ({"sun", "moon"} <= set(s["flags"])):
            say("🚪 神殿の扉は閉ざされている。『太陽のしずく』と『月のかけら』が必要だ！")
            return
        next_area, nx, ny = PORTALS[(area, tile)]
        s["area"], s["x"], s["y"] = next_area, nx, ny
        say("🚶 " + MAPS[next_area]["name"] + " に移動した！")
        save_game(s, quiet=True)


def move(s, dx, dy):
    new_x = s["x"] + dx
    new_y = s["y"] + dy
    rows = MAPS[s["area"]]["rows"]
    if not (0 <= new_y < len(rows) and 0 <= new_x < len(rows[new_y])):
        say("そこは進めないよ。")
        return
    tile = rows[new_y][new_x]
    if tile == "#":
        say("🪨 壁があって進めない！")
        return
    s["x"], s["y"] = new_x, new_y
    s["steps"] += 1
    origin = s["area"]
    event_on_tile(s, tile)
    # Only spawn wandering monsters on ordinary paths; not at entrance/special tiles.
    if s["area"] == origin and tile == "." and origin in WANDERERS:
        if random.random() < (0.14 if origin == "forest" else 0.18):
            battle(s, random.choice(WANDERERS[origin]))


def export_code(s):
    say("\n📜 引継コード（この1行をコピーして保管）")
    say(make_code(s))
    say("次回の起動時、または 'l' で貼り付けると復元できるよ。")
    say("注意：他人に渡すとその人も同じ進行状況を復元できます。")


def import_code():
    say("MIKE1- で始まる引継コードを貼り付けて Enter。")
    try:
        s = from_code(ask("コード > "))
        say("✅ 冒険の記録を読み込んだよ！")
        save_game(s, quiet=True)
        return s
    except ValueError as error:
        say("⚠️ " + str(error))
        return None


def splash():
    say("""
========================================
       三毛猫の冒険 / CALICO QUEST
          ～月の鈴をさがして～
                v1.0
========================================
      /\\_/\\
     ( o.o )   ← みけ
      > ^ <

インストール不要 / Python 3 標準ライブラリのみ
端末では各操作を入力して Enter を押してね。
""")


def play(s):
    help_screen()
    while True:
        draw_map(s)
        cmd = ask("みけ > ")
        keys = {"w": (0, -1), "a": (-1, 0), "s": (0, 1), "d": (1, 0),
                "8": (0, -1), "4": (-1, 0), "2": (0, 1), "6": (1, 0),
                "上": (0, -1), "左": (-1, 0), "下": (0, 1), "右": (1, 0)}
        if cmd in keys:
            move(s, *keys[cmd])
        elif cmd in ("i", "item", "items"):
            inventory(s)
        elif cmd in ("p", "status"):
            status(s)
        elif cmd in ("m", "map", ""):
            continue  # The map is always redrawn by the loop.
        elif cmd in ("h", "help", "?"):
            help_screen()
        elif cmd in ("v", "save"):
            save_game(s)
        elif cmd in ("c", "code"):
            export_code(s)
        elif cmd in ("l", "loadcode"):
            incoming = import_code()
            if incoming is not None:
                s = incoming
        elif cmd in ("q", "quit", "exit"):
            save_game(s)
            say("🐾 またね！ 次もみけと一緒に冒険しよう！")
            return
        else:
            say("操作は w/a/s/d または h で確認できるよ。")


def main():
    random.seed()
    splash()
    last = load_game()
    if last:
        say("💾 保存した冒険の記録が見つかったよ。")
        say("1. つづきから (EnterでもOK) / 2. はじめから / 3. 引継コード")
        while True:
            choice = ask("選択 > ")
            if choice in ("", "1", "q"):
                s = last
                break
            if choice == "2":
                if ask("新しい冒険にすると前のセーブが上書きされます。いい？ y/n > ") != "y":
                    continue
                s = new_game()
                save_game(s, quiet=True)
                break
            if choice == "3":
                loaded = import_code()
                if loaded is not None:
                    s = loaded
                    break
            say("1、2、3から選んでね。")
    else:
        say("1. はじめから (EnterでもOK) / 2. 引継コードから")
        while True:
            choice = ask("選択 > ")
            if choice in ("", "1", "q"):
                s = new_game()
                save_game(s, quiet=True)
                break
            if choice == "2":
                loaded = import_code()
                if loaded is not None:
                    s = loaded
                    break
            say("1または2から選んでね。")
    say("\n🐾 みけの冒険、スタート！")
    play(s)


if __name__ == "__main__":
    main()