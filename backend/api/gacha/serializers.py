# backend/api/gacha/serializers.py

from rest_framework import serializers
from .models import Character, Gacha, GachaCharacterPool, UserCharacter, GachaHistory, User
from django.db import transaction # シリアライザーの create/update でトランザクションを使用する場合


class CharacterSerializer(serializers.ModelSerializer):
    # rarity_display は、表示名が必要な場合に使用（ここではデフォルトで含める）
    rarity_display = serializers.CharField(source='get_rarity_display', read_only=True)

    class Meta:
        model = Character
        fields = ['id', 'name', 'description', 'rarity', 'rarity_display', 'attribute', 'hp', 'atk', 'agi']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GachaCharacterPoolSerializer(serializers.ModelSerializer):
    # character_id は書き込み専用フィールドとして、character オブジェクトではなくIDを受け取る
    character_id = serializers.IntegerField(write_only=True)
    # character は読み取り専用フィールドとして、関連する Character モデルの詳細を表示
    character = CharacterSerializer(read_only=True)

    class Meta:
        model = GachaCharacterPool
        fields = ['id', 'character', 'is_pickup', 'character_id'] # 'id' も含める
        read_only_fields = ['id'] # GachaCharacterPool の ID は読み取り専用


# GachaSerializer
class GachaSerializer(serializers.ModelSerializer):
    # rarity_rates (JSONField) は直接シリアライズ（読み書き可能）
    rarity_rates = serializers.JSONField()
    # character_pool は GachaCharacterPoolSerializer をネストして使用（リスト形式で読み書き可能）
    character_pool = GachaCharacterPoolSerializer(many=True)

    class Meta:
        model = Gacha
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date', # is_active は削除済み
            'rarity_rates',
            'character_pool',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at'] # DBが自動で管理するフィールドは読み取り専用

    # 新しいガチャを作成する際のカスタムロジック
    def create(self, validated_data):
        # ネストされた書き込み可能フィールド (rarity_rates, character_pool) のデータを validated_data から取り出す
        rarity_rates_data = validated_data.pop('rarity_rates', []) # データがない場合は空リストをデフォルトに
        character_pool_data = validated_data.pop('character_pool', [])
        
        # ガチャモデルの基本インスタンスを作成
        gacha = Gacha.objects.create(**validated_data)

        # rarity_rates (JSONField) を保存
        gacha.rarity_rates = rarity_rates_data
        gacha.save(update_fields=['rarity_rates']) # rarity_rates フィールドのみ更新を明示

        # character_pool の関連レコードを作成
        for item_data in character_pool_data:
            character_id = item_data.get('character_id')
            is_pickup = item_data.get('is_pickup', False)

            if character_id is None:
                raise serializers.ValidationError({"character_pool": "キャラクターIDが指定されていません。"})

            try:
                character_obj = Character.objects.get(id=character_id)
            except Character.DoesNotExist:
                raise serializers.ValidationError(
                    f"キャラクターID {character_id} が見つかりません。"
                )

            GachaCharacterPool.objects.create(
                gacha=gacha, # 新しく作成したガチャに関連付ける
                character=character_obj,
                is_pickup=is_pickup
            )
        return gacha # 作成したガチャインスタンスを返す

    # 既存のガチャを更新する際のカスタムロジック
    def update(self, instance, validated_data):
        # ネストされた書き込み可能フィールドのデータを validated_data から取り出す
        rarity_rates_data = validated_data.pop('rarity_rates', instance.rarity_rates) # 既存値または空リストをデフォルトに
        character_pool_data = validated_data.pop('character_pool', [])

        # ガチャモデルの基本フィールドを更新 (super().update を使用)
        instance = super().update(instance, validated_data)

        # rarity_rates (JSONField) を更新
        instance.rarity_rates = rarity_rates_data
        instance.save(update_fields=['rarity_rates'])

        # character_pool の関連レコードを更新
        # 既存のものを全て削除し、新しいデータで再作成する方式
        GachaCharacterPool.objects.filter(gacha=instance).delete()
        for item_data in character_pool_data:
            character_id = item_data.get('character_id')
            is_pickup = item_data.get('is_pickup', False)

            if character_id is None:
                raise serializers.ValidationError({"character_pool": "キャラクターIDが指定されていません。"})

            try:
                character_obj = Character.objects.get(id=character_id)
            except Character.DoesNotExist:
                raise serializers.ValidationError(
                    f"キャラクターID {character_id} が見つかりません。"
                )

            GachaCharacterPool.objects.create(
                gacha=instance,
                character=character_obj,
                is_pickup=is_pickup
            )
        return instance # 更新したガチャインスタンスを返す


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class UserCharacterSerializer(serializers.ModelSerializer):
    character = CharacterSerializer(read_only=True) # ネストされたキャラクター情報
    character_id = serializers.IntegerField(write_only=True, required=False) # character_id は IntegerField

    class Meta:
        model = UserCharacter
        fields = ['id', 'user', 'character', 'character_id', 'quantity']
        read_only_fields = ['id', 'user', 'character']

    def create(self, validated_data):
        character_id = validated_data.pop('character_id')
        user = self.context['request'].user # リクエストユーザーを取得

        try:
            character_obj = Character.objects.get(id=character_id)
        except Character.DoesNotExist:
            raise serializers.ValidationError({"character_id": "指定されたキャラクターが見つかりません。"})

        # 同じユーザーとキャラクターの組み合わせがあれば quantity を増やす、なければ新規作成
        user_character, created = UserCharacter.objects.get_or_create(
            user=user,
            character=character_obj,
            defaults={'quantity': validated_data.get('quantity', 1)}
        )
        if not created:
            user_character.quantity += validated_data.get('quantity', 1)
            user_character.save()
        return user_character

    def update(self, instance, validated_data):
        # ユーザーとキャラクターの組み合わせは unique_together なので、通常は quantity の更新がメイン
        quantity = validated_data.get('quantity', instance.quantity)
        instance.quantity = quantity
        instance.save()
        return instance


class GachaHistorySerializer(serializers.ModelSerializer):
    gacha_name = serializers.CharField(source='gacha.name', read_only=True)
    pulled_character_name = serializers.CharField(source='pulled_character.name', read_only=True)
    pulled_character_rarity = serializers.IntegerField(source='pulled_character.rarity', read_only=True)

    class Meta:
        model = GachaHistory
        fields = [
            'id', 'user', 'gacha', 'gacha_name', 'pulled_character',
            'pulled_character_name', 'pulled_character_rarity',
            'pulled_at'
        ]
        read_only_fields = ['id', 'user', 'gacha', 'pulled_character', 'pulled_at']