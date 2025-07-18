# backend/api/gacha/models.py

from django.db import models
from django.contrib.auth import get_user_model
# MinValueValidator, MaxValueValidator, post_save, receiver, uuid は使用しないため削除
# from django.core.validators import MinValueValidator, MaxValueValidator
# from django.db.models.signals import post_save
# from django.dispatch import receiver
# import uuid

# Djangoの標準ユーザーモデルを使用
User = get_user_model()

# --- キャラクターモデル ---
class Character(models.Model):
    # id は Django が自動生成するので明示的な UUIDField は不要
    # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    RARITY_CHOICES = [
        (1, 'N'), # Normal
        (2, 'R'), # Rare
        (3, 'SR'), # Super Rare
        (4, 'SSR'), # Super Super Rare
        (5, 'UR'), # Ultra Rare
    ]
    ATTRIBUTE_CHOICES = [
        ('fire', '炎'), ('water', '水'), ('wind', '風'), ('light', '光'), ('dark', '闇'), ('none', '無'),
    ]

    name = models.CharField(max_length=100, unique=True, verbose_name="キャラクター名")
    description = models.TextField(blank=True, verbose_name="説明") # null=True は不要
    rarity = models.IntegerField(choices=RARITY_CHOICES, verbose_name="レアリティ")
    attribute = models.CharField(max_length=10, choices=ATTRIBUTE_CHOICES, verbose_name="属性")
    hp = models.IntegerField(verbose_name="HP")
    atk = models.IntegerField(verbose_name="攻撃力")
    agi = models.IntegerField(verbose_name="素早さ")
    # image_url フィールドを削除しました
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "キャラクター"
        verbose_name_plural = "キャラクター"
        ordering = ['-rarity', 'name'] # レアリティ降順、名前昇順

    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"


# ガチャモデル (変更なし)
class Gacha(models.Model):
    # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="ガチャ名")
    description = models.TextField(blank=True, verbose_name="説明")
    start_date = models.DateTimeField(blank=True, null=True, verbose_name="開始日時")
    end_date = models.DateTimeField(blank=True, null=True, verbose_name="終了日時")
    rarity_rates = models.JSONField(
        default=list, # default=dict から default=list に修正 (JSONFieldのデータ形式に合わせる)
        verbose_name="レアリティ別排出率",
        help_text="例: [{'rarity': 4, 'rate': '0.0100'}, {'rarity': 3, 'rate': '0.0500'}]"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    class Meta:
        verbose_name = "ガチャ"
        verbose_name_plural = "ガチャ"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# ガチャキャラクタープールモデル (変更なし)
class GachaCharacterPool(models.Model):
    gacha = models.ForeignKey(Gacha, on_delete=models.CASCADE, related_name='character_pool', verbose_name="ガチャ")
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='gacha_pools', verbose_name="キャラクター")
    is_pickup = models.BooleanField(default=False, verbose_name="ピックアップ対象")

    class Meta:
        unique_together = ('gacha', 'character')
        verbose_name = "ガチャキャラクタープール"
        verbose_name_plural = "ガチャキャラクタープール"
        ordering = ['character__rarity', '-is_pickup', 'character__name'] # レアリティ降順、ピックアップ優先、名前順

    def __str__(self):
        return f"{self.gacha.name} - {self.character.name} {'(PU)' if self.is_pickup else ''}"


# ユーザー所持キャラクターモデル (変更なし)
class UserCharacter(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='characters', verbose_name="ユーザー")
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='user_collections', verbose_name="キャラクター")
    quantity = models.PositiveIntegerField(default=1, verbose_name="所持数")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="獲得日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="最終更新日時")

    class Meta:
        unique_together = ('user', 'character')
        verbose_name = "ユーザー所持キャラクター"
        verbose_name_plural = "ユーザー所持キャラクター"
        ordering = ['user__username', '-character__rarity', 'character__name'] # ユーザー名、レアリティ降順、名前昇順

    def __str__(self):
        return f"{self.user.username} - {self.character.name} ({self.quantity})"


# ガチャ履歴モデル (変更なし)
class GachaHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gacha_history', verbose_name="ユーザー")
    gacha = models.ForeignKey(Gacha, on_delete=models.CASCADE, related_name='history_entries', verbose_name="ガチャ")
    pulled_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='gacha_pulled_history', verbose_name="排出キャラクター")
    pulled_at = models.DateTimeField(auto_now_add=True, verbose_name="排出日時")

    class Meta:
        verbose_name = "ガチャ履歴"
        verbose_name_plural = "ガチャ履歴"
        ordering = ['-pulled_at'] # 新しい履歴が上に表示されるように

    def __str__(self):
        return f"{self.user.username} - {self.gacha.name} から {self.pulled_character.name} を獲得 ({self.pulled_at.strftime('%Y-%m-%d %H:%M')})"


# ユーザー作成時にUserCharacterを自動作成するシグナルは削除しました
# @receiver(post_save, sender=User)
# def create_initial_user_character(sender, instance, created, **kwargs):
#     if created:
#         pass