#!/bin/bash

# このスクリプトはDjangoアプリケーションのデータベースを初期化します。
# 開発・テスト環境でのみ使用してください。
#
# 使い方:
# 1. backend ディレクトリに移動
# 2. chmod +x initialize_db.sh
# 3. ./initialize_db.sh

echo "--- データベースの初期化を開始します ---"

# 環境設定ファイルの指定
SETTINGS_FILE="config.settings.development"

# 1. 既存のマイグレーションファイルを削除 (開発環境でモデルを頻繁に変更する場合)
# 🚨 注意: 本番環境ではこれを実行しないでください！
echo "既存のマイグレーションファイルを削除中..."
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete
echo "既存のマイグレーションファイルを削除しました。"

# 2. データベースの全データを削除し、マイグレーション履歴をリセット
echo "データベースの全データを削除し、マイグレーション履歴をリセット中..."

# まず、django_migrations テーブルから gacha アプリの記録を削除 (強制リセット)
# これにより、Djangoが gacha アプリのマイグレーションが適用済みであるという誤った情報をリセットします。
python manage.py shell --settings "${SETTINGS_FILE}" <<EOF
from django.db import connection
cursor = connection.cursor()
cursor.execute("DELETE FROM django_migrations WHERE app = 'gacha';")
connection.commit()
print("Python: django_migrations テーブルから 'gacha' アプリの記録を削除しました。")
EOF
if [ $? -ne 0 ]; then
    echo "エラー: django_migrations のリセットが失敗しました。"
    exit 1
fi

# 3. 新しいマイグレーションファイルを作成
echo "新しいマイグレーションファイルを作成中..."
python manage.py makemigrations gacha --settings "${SETTINGS_FILE}"
if [ $? -ne 0 ]; then
    echo "エラー: makemigrations コマンドが失敗しました。"
    exit 1
fi
echo "新しいマイグレーションファイルを作成しました。"

# 4. データベーススキーマを適用
echo "データベーススキーマを適用中 (migrate)..."
python manage.py migrate --settings "${SETTINGS_FILE}"
if [ $? -ne 0 ]; then
    echo "エラー: migrate コマンドが失敗しました。"
    exit 1
fi
echo "データベーススキーマを適用しました。"

# 5. 初期データを投入
echo "初期データを投入中..."
# シェルスクリプト内で実行されるPythonコード
python manage.py shell --settings "${SETTINGS_FILE}" <<EOF
# 必要なモデルをインポート
from api.gacha.models import Character, Gacha, GachaCharacterPool, UserCharacter, GachaHistory
from django.contrib.auth import get_user_model
from django.utils import timezone
import random # 抽選ロジックで利用するため

# Djangoの標準ユーザーモデルを取得 (get_user_model() を使うのがベストプラクティス)
User = get_user_model()

print("Python: ユーザーデータの作成・取得...")
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={'is_staff': True, 'is_superuser': True}
)
if created:
    user.set_password('password123')
    user.save()
    print(f"Python: ユーザー '{user.username}' を作成しました。")
else:
    print(f"Python: ユーザー '{user.username}' は既に存在します。")

user2, created2 = User.objects.get_or_create(
    username='gacha_player',
    defaults={}
)
if created2:
    user2.set_password('playerpass')
    user2.save()
    print(f"Python: ユーザー '{user2.username}' を作成しました。")
else:
    print(f"Python: ユーザー '{user2.username}' は既に存在します。")


print("\n--- キャラクターデータを作成します (計62体、ユニーク設定) ---")

created_characters = {} # 全ての作成済みキャラクターを保持 (名前をキーにオブジェクトを保持)

# ==================================================================================================
# レアリティ N (1) - 20体 (火5, 水5, 風5, 土5)
# ==================================================================================================
# 火属性 N (1)
chars_n_fire = [
    {'name': '灼熱の見習い兵', 'rarity': 1, 'attribute': 'fire', 'hp': 820, 'atk': 105, 'agi': 52, 'description': '炎の熱気に憧れる若き兵士。'},
    {'name': '炎の訓練生タロ', 'rarity': 1, 'attribute': 'fire', 'hp': 800, 'atk': 110, 'agi': 50, 'description': '炎の剣を振り回す、元気いっぱいの訓練生。'},
    {'name': '火花散らす門番', 'rarity': 1, 'attribute': 'fire', 'hp': 830, 'atk': 100, 'agi': 55, 'description': '小さな炎を操る、熱血漢の門番。'},
    {'name': '炎獣の子供', 'rarity': 1, 'attribute': 'fire', 'hp': 810, 'atk': 103, 'agi': 53, 'description': '炎の獣の血を引く、やんちゃな子供。'},
    {'name': '燃える木こり', 'rarity': 1, 'attribute': 'fire', 'hp': 840, 'atk': 102, 'agi': 51, 'description': '炎の斧を使いこなす、力持ちな木こり。'},
]
# 水属性 N (1)
chars_n_water = [
    {'name': '清流の釣り人', 'rarity': 1, 'attribute': 'water', 'hp': 830, 'atk': 98, 'agi': 54, 'description': '静かな川辺で一日を過ごす釣り人。'},
    {'name': '水辺の番人ミズ', 'rarity': 1, 'attribute': 'water', 'hp': 810, 'atk': 100, 'agi': 56, 'description': '水場の安全を守る、冷静な番人。'},
    {'name': '小川の妖精', 'rarity': 1, 'attribute': 'water', 'hp': 800, 'atk': 99, 'agi': 58, 'description': '水面にきらめく小さな妖精。'},
    {'name': '湿地の偵察兵', 'rarity': 1, 'attribute': 'water', 'hp': 820, 'atk': 97, 'agi': 57, 'description': '湿地帯の情報を集める、足の速い偵察兵。'},
    {'name': '雨上がりの旅人', 'rarity': 1, 'attribute': 'water', 'hp': 840, 'atk': 96, 'agi': 50, 'description': '雨の後に旅を続ける、落ち着いた旅人。'},
]
# 風属性 N (1)
chars_n_wind = [
    {'name': 'そよ風の吟遊詩人', 'rarity': 1, 'attribute': 'wind', 'hp': 800, 'atk': 105, 'agi': 60, 'description': '風の歌を奏でる、自由な吟遊詩人。'},
    {'name': '風の運び手カゼ', 'rarity': 1, 'attribute': 'wind', 'hp': 790, 'atk': 103, 'agi': 62, 'description': '風に乗ってメッセージを運ぶ使者。'},
    {'name': '木の葉の戦士', 'rarity': 1, 'attribute': 'wind', 'hp': 810, 'atk': 102, 'agi': 61, 'description': '木の葉のように舞い、敵を翻弄する。'},
    {'name': '風車守りの少女', 'rarity': 1, 'attribute': 'wind', 'hp': 805, 'atk': 104, 'agi': 59, 'description': '風車と共に生きる、穏やかな少女。'},
    {'name': '雲上の見張り番', 'rarity': 1, 'attribute': 'wind', 'hp': 795, 'atk': 106, 'agi': 63, 'description': '高所から風の動きを見守る番人。'},
]
# 土属性 N (1)
chars_n_earth = [
    {'name': '大地の農夫', 'rarity': 1, 'attribute': 'earth', 'hp': 850, 'atk': 95, 'agi': 48, 'description': '土と共に生きる、力強い農夫。'},
    {'name': '岩の護衛タチ', 'rarity': 1, 'attribute': 'earth', 'hp': 860, 'atk': 93, 'agi': 45, 'description': '頑丈な岩のように動かない護衛。'},
    {'name': '粘土職人の見習い', 'rarity': 1, 'attribute': 'earth', 'hp': 840, 'atk': 96, 'agi': 47, 'description': '土を操り、形を作る見習い職人。'},
    {'name': '地下道の探掘者', 'rarity': 1, 'attribute': 'earth', 'hp': 855, 'atk': 94, 'agi': 49, 'description': '地下深くの財宝を探し求める探掘者。'},
    {'name': '静かなる丘の賢者', 'rarity': 1, 'attribute': 'earth', 'hp': 835, 'atk': 97, 'agi': 46, 'description': '大地の知識を持つ、物静かな賢者。'},
]

# ==================================================================================================
# レアリティ R (2) - 20体 (火5, 水5, 風5, 土5)
# ==================================================================================================
# 火属性 R (2)
chars_r_fire = [
    {'name': '炎の剣士アレス', 'rarity': 2, 'attribute': 'fire', 'hp': 1050, 'atk': 160, 'agi': 75, 'description': '炎を纏う剣技で敵を焼き尽くす剣士。'},
    {'name': '火山の斥候マック', 'rarity': 2, 'attribute': 'fire', 'hp': 1020, 'atk': 155, 'agi': 78, 'description': '火山の奥地を探る、勇敢な斥候。'},
    {'name': '溶岩の鍛冶師', 'rarity': 2, 'attribute': 'fire', 'hp': 1080, 'atk': 150, 'agi': 70, 'description': '溶岩の熱で最強の武器を鍛える職人。'},
    {'name': '爆炎の魔術師見習い', 'rarity': 2, 'attribute': 'fire', 'hp': 1030, 'atk': 158, 'agi': 72, 'description': '制御不能な爆炎を放つ、見習い魔術師。'},
    {'name': '炎の舞踏家リラ', 'rarity': 2, 'attribute': 'fire', 'hp': 1000, 'atk': 152, 'agi': 80, 'description': '炎のように情熱的な舞で敵を魅了する。'},
]
# 水属性 R (2)
chars_r_water = [
    {'name': '氷結の弓使いレイ', 'rarity': 2, 'attribute': 'water', 'hp': 1020, 'atk': 150, 'agi': 80, 'description': '氷の矢で敵を凍らせる、冷徹な弓使い。'},
    {'name': '深海の案内人', 'rarity': 2, 'attribute': 'water', 'hp': 1060, 'atk': 145, 'agi': 75, 'description': '深海の神秘を知る、謎多き案内人。'},
    {'name': '水の踊り子メーア', 'rarity': 2, 'attribute': 'water', 'hp': 1000, 'atk': 148, 'agi': 82, 'description': '水面を滑るように舞い、敵を惑わせる。'},
    {'name': '豪雨の守護者', 'rarity': 2, 'attribute': 'water', 'hp': 1070, 'atk': 147, 'agi': 73, 'description': '嵐を呼び、全てを洗い流す守護者。'},
    {'name': '霧隠れの忍者', 'rarity': 2, 'attribute': 'water', 'hp': 1010, 'atk': 153, 'agi': 77, 'description': '霧に紛れ、瞬時に敵を仕留める忍者。'},
]
# 風属性 R (2)
chars_r_wind = [
    {'name': '疾風の槍兵レン', 'rarity': 2, 'attribute': 'wind', 'hp': 1000, 'atk': 160, 'agi': 90, 'description': '風の如く駆け抜け、一撃で敵を貫く槍兵。'},
    {'name': '嵐の狩人', 'rarity': 2, 'attribute': 'wind', 'hp': 1010, 'atk': 155, 'agi': 88, 'description': '嵐の中でも獲物を追う、熟練の狩人。'},
    {'name': '空中戦のエキスパート', 'rarity': 2, 'attribute': 'wind', 'hp': 980, 'atk': 158, 'agi': 92, 'description': '空中で自由自在に戦う、唯一無二の存在。'},
    {'name': '緑の翼の斥候', 'rarity': 2, 'attribute': 'wind', 'hp': 990, 'atk': 157, 'agi': 89, 'description': '緑の翼を持ち、素早く情報を集める斥候。'},
    {'name': '風の詠唱者', 'rarity': 2, 'attribute': 'wind', 'hp': 970, 'atk': 162, 'agi': 93, 'description': '風の魔法を操り、敵を翻弄する詠唱者。'},
]
# 土属性 R (2)
chars_r_earth = [
    {'name': '大地の拳士ゴン', 'rarity': 2, 'attribute': 'earth', 'hp': 1100, 'atk': 140, 'agi': 65, 'description': '大地を揺るがす拳を持つ、力自慢の拳士。'},
    {'name': '岩壁の守り手', 'rarity': 2, 'attribute': 'earth', 'hp': 1120, 'atk': 138, 'agi': 60, 'description': '難攻不落の守りを見せる、強固な盾役。'},
    {'name': '砂漠の案内人', 'rarity': 2, 'attribute': 'earth', 'hp': 1080, 'atk': 142, 'agi': 68, 'description': '果てしない砂漠を踏破する、頼れる案内人。'},
    {'name': '巨木の戦士', 'rarity': 2, 'attribute': 'earth', 'hp': 1110, 'atk': 139, 'agi': 63, 'description': '巨木と一体化した、大自然の力を持つ戦士。'},
    {'name': '地底の錬金術師', 'rarity': 2, 'attribute': 'earth', 'hp': 1090, 'atk': 141, 'agi': 67, 'description': '土の中から希少な素材を見つけ出す錬金術師。'},
]

# ==================================================================================================
# レアリティ SR (3) - 10体 (火2, 水2, 風2, 土2, その他2)
# ==================================================================================================
# 火属性 SR (3)
chars_sr_fire = [
    {'name': '爆炎の魔女フレア', 'rarity': 3, 'attribute': 'fire', 'hp': 1550, 'atk': 220, 'agi': 95, 'description': '全てを燃やし尽くす爆炎の魔女。'},
    {'name': '紅蓮の騎士カイ', 'rarity': 3, 'attribute': 'fire', 'hp': 1600, 'atk': 210, 'agi': 90, 'description': '紅蓮の炎に忠誠を誓う、高潔な騎士。'},
]
# 水属性 SR (3)
chars_sr_water = [
    {'name': '深淵の賢者イリス', 'rarity': 3, 'attribute': 'water', 'hp': 1580, 'atk': 205, 'agi': 100, 'description': '深海の知識を持つ、神秘的な賢者。'},
    {'name': '水月の剣士ユウ', 'rarity': 3, 'attribute': 'water', 'hp': 1520, 'atk': 215, 'agi': 98, 'description': '水面に映る月のように優雅な剣士。'},
]
# 風属性 SR (3)
chars_sr_wind = [
    {'name': '天翔ける弓使いカケル', 'rarity': 3, 'attribute': 'wind', 'hp': 1500, 'atk': 225, 'agi': 110, 'description': '空を舞い、正確な矢を放つ弓使い。'},
    {'name': '翠風の踊り子シエル', 'rarity': 3, 'attribute': 'wind', 'hp': 1480, 'atk': 218, 'agi': 115, 'description': '翠の風を纏い、優雅に舞う踊り子。'},
]
# 土属性 SR (3)
chars_sr_earth = [
    {'name': '山脈の守護者ジン', 'rarity': 3, 'attribute': 'earth', 'hp': 1650, 'atk': 195, 'agi': 85, 'description': '山々の平和を守る、不動の守護者。'},
    {'name': '地脈の術師テツ', 'rarity': 3, 'attribute': 'earth', 'hp': 1590, 'atk': 200, 'agi': 88, 'description': '大地のエネルギーを操る術師。'},
]
# その他 (属性なし、または特殊属性) SR (3)
chars_sr_other = [
    {'name': '星屑の魔導書使い', 'rarity': 3, 'attribute': 'light', 'hp': 1530, 'atk': 210, 'agi': 92, 'description': '夜空の星の力を借りる魔導書使い。'},
    {'name': '異界の旅人アイン', 'rarity': 3, 'attribute': 'none', 'hp': 1570, 'atk': 208, 'agi': 95, 'description': '様々な世界を巡る、謎多き旅人。'},
]


# ==================================================================================================
# レアリティ SSR (4) - 8体 (火2, 水2, 風2, 土2)
# ==================================================================================================
# 火属性 SSR (4)
chars_ssr_fire = [
    {'name': '灼炎の覇王ヴァルカン', 'rarity': 4, 'attribute': 'fire', 'hp': 2100, 'atk': 280, 'agi': 120, 'description': '全てを焼き尽くす炎の覇王。'},
    {'name': '炎獄の破壊者ゼウス', 'rarity': 4, 'attribute': 'fire', 'hp': 2050, 'atk': 290, 'agi': 115, 'description': '炎の力で敵を滅ぼす破壊者。'},
]
# 水属性 SSR (4)
chars_ssr_water = [
    {'name': '蒼海の女神アクア', 'rarity': 4, 'attribute': 'water', 'hp': 2200, 'atk': 260, 'agi': 105, 'description': '慈悲深き蒼海の女神。'},
    {'name': '氷晶の剣聖クリス', 'rarity': 4, 'attribute': 'water', 'hp': 2150, 'atk': 270, 'agi': 110, 'description': '氷の剣を自在に操る剣聖。'},
]
# 風属性 SSR (4)
chars_ssr_wind = [
    {'name': '翠嵐の神鳥フェニックス', 'rarity': 4, 'attribute': 'wind', 'hp': 2000, 'atk': 295, 'agi': 140, 'description': '風と共に現れる神鳥。'},
    {'name': '天空の舞姫ソフィア', 'rarity': 4, 'attribute': 'wind', 'hp': 1950, 'atk': 285, 'agi': 145, 'description': '天空で舞い踊る、風の舞姫。'},
]
# 土属性 SSR (4)
chars_ssr_earth = [
    {'name': '剛地の大賢者ガイア', 'rarity': 4, 'attribute': 'earth', 'hp': 2300, 'atk': 250, 'agi': 95, 'description': '大地の真理を知る、偉大な賢者。'},
    {'name': '砂漠の暴君オシリス', 'rarity': 4, 'attribute': 'earth', 'hp': 2250, 'atk': 255, 'agi': 100, 'description': '砂漠を支配する、恐るべき暴君。'},
]


# ==================================================================================================
# レアリティ UR (5) - 4体 (火1, 水1, 風1, 土1)
# ==================================================================================================
# 火属性 UR (5)
chars_ur_fire = [
    {'name': '終焉の炎神イフリート', 'rarity': 5, 'attribute': 'fire', 'hp': 2600, 'atk': 350, 'agi': 150, 'description': '全てを無に帰す、終焉の炎神。'},
]
# 水属性 UR (5)
chars_ur_water = [
    {'name': '絶対零度の女王リヴァイア', 'rarity': 5, 'attribute': 'water', 'hp': 2700, 'atk': 330, 'agi': 140, 'description': '絶対零度を操る、氷の女王。'},
]
# 風属性 UR (5)
chars_ur_wind = [
    {'name': '虚空を翔る竜王ヴァルキリー', 'rarity': 5, 'attribute': 'wind', 'hp': 2550, 'atk': 360, 'agi': 160, 'description': '虚空を舞い、全てを切り裂く竜王。'},
]
# 土属性 UR (5)
chars_ur_earth = [
    {'name': '天地を創造する巨人アトラス', 'rarity': 5, 'attribute': 'earth', 'hp': 2800, 'atk': 320, 'agi': 135, 'description': '天地を創造したとされる、伝説の巨人。'},
]


# 全キャラクターデータをまとめる (合計62体)
all_char_data_list = (
    chars_n_fire + chars_n_water + chars_n_wind + chars_n_earth +
    chars_r_fire + chars_r_water + chars_r_wind + chars_r_earth +
    chars_sr_fire + chars_sr_water + chars_sr_wind + chars_sr_earth + chars_sr_other + # SRは2体追加されているため10体
    chars_ssr_fire + chars_ssr_water + chars_ssr_wind + chars_ssr_earth +
    chars_ur_fire + chars_ur_water + chars_ur_wind + chars_ur_earth
)

for char_data in all_char_data_list:
    char, created = Character.objects.get_or_create(
        name=char_data['name'],
        defaults=char_data
    )
    created_characters[char.name] = char
    if created:
        print(f"Python: キャラクター '{char.name}' (ID: {char.id}) を作成しました。")
    # else:
    #     print(f"Python: キャラクター '{char.name}' は既に存在します。")

print(f"\n--- 合計 {len(created_characters)} 体のキャラクターデータを作成しました ---")


print("\n--- ガチャデータを作成します ---")
now = timezone.now()

# ノーマルガチャのレアリティ排出率データ
normal_rarity_rates_data = [
    {'rarity': 1, 'rate': '0.7000'}, # N
    {'rarity': 2, 'rate': '0.2500'}, # R
    {'rarity': 3, 'rate': '0.0500'}, # SR
]
gacha_normal, created_g1 = Gacha.objects.get_or_create(
    name='ノーマルガチャ',
    defaults={
        'description': '一般的なキャラクターが排出される初心者向けガチャです。',
        'start_date': now - timezone.timedelta(days=7),
        'end_date': now + timezone.timedelta(days=30),
        'rarity_rates': normal_rarity_rates_data,
    }
)
if created_g1: print(f"Python: ガチャ '{gacha_normal.name}' を作成しました。")
else:
    print(f"Python: ガチャ '{gacha_normal.name}' は既に存在します。rarity_ratesを更新します。")
    gacha_normal.rarity_rates = normal_rarity_rates_data
    gacha_normal.save(update_fields=['rarity_rates', 'description', 'start_date', 'end_date'])

# ゴールドガチャのレアリティ排出率データ
gold_rarity_rates_data = [
    {'rarity': 2, 'rate': '0.6000'}, # R
    {'rarity': 3, 'rate': '0.3000'}, # SR
    {'rarity': 4, 'rate': '0.1000'}, # SSR
    {'rarity': 5, 'rate': '0.0100'}, # UR も排出対象に追加
]
gacha_gold, created_g2 = Gacha.objects.get_or_create(
    name='ゴールドガチャ',
    defaults={
        'description': 'レアキャラクターの排出確率が高い特別なガチャです！',
        'start_date': now - timezone.timedelta(days=3),
        'end_date': now + timezone.timedelta(days=20),
        'rarity_rates': gold_rarity_rates_data,
    }
)
if created_g2: print(f"Python: ガチャ '{gacha_gold.name}' を作成しました。")
else:
    print(f"Python: ガチャ '{gacha_gold.name}' は既に存在します。rarity_ratesを更新します。")
    gacha_gold.rarity_rates = gold_rarity_rates_data
    gacha_gold.save(update_fields=['rarity_rates', 'description', 'start_date', 'end_date'])


print("\n--- ガチャキャラクタープールデータを作成します ---")
# ノーマルガチャで排出されるキャラクター（N, R, SR レアリティの全属性キャラを均等に）
normal_gacha_pool_chars = []
for rarity_level in [1, 2, 3]: # N, R, SR
    eligible_chars = [char for char in created_characters.values() if char.rarity == rarity_level]
    normal_gacha_pool_chars.extend(eligible_chars) # 全ての該当レアリティキャラを追加

for char_obj in normal_gacha_pool_chars:
    GachaCharacterPool.objects.get_or_create(gacha=gacha_normal, character=char_obj, defaults={'is_pickup': False})
print(f"Python: ノーマルガチャのキャラクタープールを {gacha_normal.character_pool.count()} 件設定しました。")

# ゴールドガチャで排出されるキャラクター（R, SR, SSR, UR レアリティの全属性キャラ）
gold_gacha_pool_chars_to_add = []
# 62体の中からピックアップ対象を選ぶ
pickup_names_gold = [
    '灼炎の覇王ヴァルカン', '蒼海の女神アクア', '翠嵐の神鳥フェニックス', '剛地の大賢者ガイア', # 各属性のSSRキャラから代表をピックアップ例
    '終焉の炎神イフリート', '絶対零度の女王リヴァイア', '虚空を翔る竜王ヴァルキリー', '天地を創造する巨人アトラス' # URキャラは全てピックアップ
]

for char_obj in created_characters.values():
    if char_obj.rarity >= 2: # R以上のキャラ
        is_pu = char_obj.name in pickup_names_gold
        GachaCharacterPool.objects.get_or_create(gacha=gacha_gold, character=char_obj, defaults={'is_pickup': is_pu})
print(f"Python: ゴールドガチャのキャラクタープールを {gacha_gold.character_pool.count()} 件設定しました。")

print("--- サンプルデータ作成が完了しました ---")
EOF