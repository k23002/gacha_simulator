# backend/api/gacha/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CharacterViewSet # 作成したビューセットをインポート
from .views import GachaViewSet # ガチャ管理APIのビューセットもここにあるはずです

router = DefaultRouter()
router.register(r'gacha', CharacterViewSet, basename='gacha') # ガチャ管理APIもここにあるかもしれません
router.register(r'characters', CharacterViewSet, basename='character') # /api/characters/ にキャラクターAPIを登録


urlpatterns = [
    path('', include(router.urls)),
    # 必要に応じて他のURLパターンを追加
]