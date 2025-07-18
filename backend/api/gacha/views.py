# backend/api/gacha/views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from decimal import Decimal, InvalidOperation
import random
import logging

from .models import Gacha, Character, GachaCharacterPool, UserCharacter, GachaHistory, User
from .serializers import GachaSerializer, CharacterSerializer, UserCharacterSerializer, GachaHistorySerializer

logger = logging.getLogger(__name__)

class CharacterViewSet(viewsets.ModelViewSet):
    queryset = Character.objects.all().order_by('id')
    serializer_class = CharacterSerializer
    
    def get_permissions(self):
        # GETリクエストは認証済みユーザーなら誰でも可能
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()] # キャラクター一覧と詳細は誰でも見れるように
        # それ以外（作成、更新、削除）は管理者のみ
        return [permissions.IsAdminUser()]

class GachaViewSet(viewsets.ModelViewSet):
    queryset = Gacha.objects.all().order_by('-created_at')
    serializer_class = GachaSerializer

    def get_permissions(self):
        # list (ガチャ一覧), retrieve (ガチャ詳細), pull (ガチャ実行) は認証不要 (AllowAny)
        # ただし pull はログインしていないとUser情報がないのでIsAuthenticatedで保護
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        elif self.action == 'pull':
            return [permissions.IsAuthenticated()] # ガチャを引くにはログインが必要
        # create, update, partial_update, destroy (管理操作) は管理者のみ
        return [permissions.IsAdminUser()]

    # retrieve メソッドは GachaSerializer で rarity_rates (JSONField) と character_pool (related_name) が
    # 自動的に処理されるため、オーバーライドする必要はありません。
    # super().retrieve を呼び出す形でコメントアウトせず残しておくのが安全です。
    # def retrieve(self, request, *args, **kwargs):
    #     return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post']) # permission_classes は get_permissions で定義
    def pull(self, request, pk=None):
        gacha = self.get_object()
        pull_count = request.data.get('pull_count', 1)
        user = request.user # get_permissions で IsAuthenticated なので、user は認証済み

        # Debug 1: pull_count のバリデーション
        if not isinstance(pull_count, int) or pull_count <= 0:
            print(f"DEBUG: pull_countが不正です。Received: {pull_count}, Type: {type(pull_count)}")
            return Response({"detail": "pull_countは正の整数である必要があります。"}, status=status.HTTP_400_BAD_REQUEST)

        # Debug 2: 開催期間のチェック
        now = timezone.now()
        if gacha.start_date and now < gacha.start_date:
            print(f"DEBUG: ガチャはまだ開催されていません。開始日時: {gacha.start_date}, 現在日時: {now}")
            return Response({"detail": "このガチャはまだ開催されていません。"}, status=status.HTTP_400_BAD_REQUEST)
        if gacha.end_date and now > gacha.end_date:
            print(f"DEBUG: ガチャは終了しました。終了日時: {gacha.end_date}, 現在日時: {now}")
            return Response({"detail": "このガチャは開催期間が終了しました。"}, status=status.HTTP_400_BAD_REQUEST)

        # Debug 3: レアリティ排出率の確認
        rarity_rates = gacha.rarity_rates
        if not rarity_rates: # JSONFieldが空の場合
            print(f"DEBUG: rarity_ratesが空です。Gacha ID: {gacha.id}")
            return Response({"detail": "このガチャには排出率が設定されていません。"}, status=status.HTTP_400_BAD_REQUEST)

        # Debug 4: レアリティ排出率の合計チェック
        total_rate = Decimal(0)
        # rarity_rates は [{"rarity": N, "rate": "X.XXXX"}, ...] のリスト形式
        for rate_item in rarity_rates:
            try:
                # rate_item['rate'] は文字列なので Decimal に変換
                total_rate += Decimal(rate_item['rate'])
            except (KeyError, InvalidOperation):
                print(f"DEBUG: rarity_ratesの形式が不正です。Item: {rate_item}")
                return Response({"detail": "排出率の形式が不正です。rarityとrateを持つリストであることを確認してください。"}, status=status.HTTP_400_BAD_REQUEST)

        # 浮動小数点数の比較は誤差を考慮 (合計が1.0にならない場合は警告ログに留める)
        if not (Decimal('0.999') <= total_rate <= Decimal('1.001')):
            logger.warning(f"Gacha {gacha.name} (ID: {gacha.id}) の排出率合計が1.0ではありません: {total_rate}")
            # return Response({"detail": "排出率の合計が1.0になりません。"}, status=status.HTTP_400_BAD_REQUEST) # 必要であれば厳しくする

        # Debug 5: キャラクタープールの確認
        character_pool_settings = list(gacha.character_pool.all()) # GachaCharacterPoolオブジェクトのリスト
        if not character_pool_settings:
            print(f"DEBUG: character_poolが空です。Gacha ID: {gacha.id}")
            return Response({"detail": "このガチャには排出対象キャラクターが設定されていません。"}, status=status.HTTP_400_BAD_REQUEST)

        pulled_characters_list = [] # 排出された Character オブジェクトを格納するリスト

        try:
            with transaction.atomic(): # トランザクション開始
                for _ in range(pull_count):
                    # レアリティの抽選
                    rarity_choices = [item['rarity'] for item in rarity_rates] # レアリティ数値 (例: 1, 2, 3)
                    rarity_weights = [Decimal(item['rate']) for item in rarity_rates] # 確率 (Decimal)

                    # random.choices は weights を float のリストで期待する
                    chosen_rarity_num = random.choices(
                        rarity_choices,
                        weights=[float(w) for w in rarity_weights],
                        k=1
                    )[0]
                    # print(f"DEBUG: 抽選されたレアリティ: {chosen_rarity_num}") # デバッグ用

                    # 選択されたレアリティに属するキャラクターをプールから取得
                    eligible_char_settings_in_rarity = [
                        pool_item for pool_item in character_pool_settings
                        if pool_item.character.rarity == chosen_rarity_num
                    ]

                    if not eligible_char_settings_in_rarity:
                        print(f"DEBUG: 抽選されたレアリティ ({chosen_rarity_num}) に該当するキャラクターがプールに見つかりません。Gacha ID: {gacha.id}")
                        return Response(
                            {"detail": f"抽選されたレアリティ ({chosen_rarity_num}) に該当するキャラクターがガチャに設定されていません。"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR # データ不整合なので500
                        )

                    # レアリティ内のキャラクターを抽選 (ピックアップ倍率考慮)
                    char_candidates_in_rarity = []
                    char_weights_in_rarity = []
                    PICKUP_MULTIPLIER = 3 # ピックアップ倍率

                    for char_setting in eligible_char_settings_in_rarity:
                        char_candidates_in_rarity.append(char_setting.character) # Characterオブジェクト
                        weight = PICKUP_MULTIPLIER if char_setting.is_pickup else 1
                        char_weights_in_rarity.append(weight)
                    
                    # random.choices でレアリティ内のキャラクターを抽選
                    pulled_character = random.choices(
                        char_candidates_in_rarity,
                        weights=[float(w) for w in char_weights_in_rarity],
                        k=1
                    )[0]
                    pulled_characters_list.append(pulled_character) # 最終的な排出リストに追加

                # ユーザーの所持キャラクターを更新または新規作成
                for char_instance in pulled_characters_list:
                    # 同じuserとcharacterの組み合わせがあればquantityを増やす、なければ新規作成
                    user_character, created = UserCharacter.objects.get_or_create(
                        user=user,
                        character=char_instance,
                        defaults={'quantity': 1} # 新規作成時の初期値
                    )
                    if not created:
                        # 既に存在する場合、quantityを1増やす (F()で競合回避)
                        user_character.quantity = F('quantity') + 1
                        user_character.save()
                        user_character.refresh_from_db() # 最新の quantity を取得 (必要であれば)

                    # ガチャ履歴を保存 (各抽選結果を個別の履歴として記録)
                    GachaHistory.objects.create(
                        user=user,
                        gacha=gacha,
                        pulled_character=char_instance, # 排出された単一のCharacterオブジェクト
                        pulled_at=timezone.now()
                    )

        except Exception as e:
            logger.error(f"ガチャ実行中に予期せぬエラーが発生しました: {e}", exc_info=True)
            # トランザクションがwithブロックを抜ける際にロールバックされる
            return Response({"detail": f"ガチャ実行中にエラーが発生しました: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 排出されたキャラクターの情報をシリアライズしてフロントエンドに返す
        response_serializer = CharacterSerializer(pulled_characters_list, many=True)
        return Response({
            "message": f"{pull_count}回ガチャを引きました。",
            "pulled_characters": response_serializer.data
        }, status=status.HTTP_200_OK)


class UserCharacterViewSet(viewsets.ModelViewSet):
    serializer_class = UserCharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 現在ログインしているユーザーのキャラクターのみを返す
        if self.request.user.is_authenticated:
            return UserCharacter.objects.filter(user=self.request.user).order_by('-character__rarity', 'character__name')
        return UserCharacter.objects.none() # 認証されていない場合は空を返す

    def perform_create(self, serializer):
        # UserCharacterの作成時に、リクエストユーザーを自動で設定
        serializer.save(user=self.request.user)


class GachaHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = GachaHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 現在ログインしているユーザーのガチャ履歴のみを返す
        if self.request.user.is_authenticated:
            return GachaHistory.objects.filter(user=self.request.user).order_by('-pulled_at')
        return GachaHistory.objects.none() # 認証されていない場合は空を返す

    # 履歴はpullアクションで自動的に作成されるため、API経由での直接作成/更新/削除は許可しない
    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)