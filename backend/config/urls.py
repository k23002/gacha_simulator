from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from rest_framework.routers import DefaultRouter
# GachaRate をインポートから削除
from api.gacha.views import GachaViewSet, CharacterViewSet, GachaHistoryViewSet, UserCharacterViewSet

router = DefaultRouter()
router.register(r'gacha', GachaViewSet, basename='gacha')
router.register(r'character', CharacterViewSet, basename='character')
router.register(r'gacha-history', GachaHistoryViewSet, basename='gacha-history')
router.register(r'user-character', UserCharacterViewSet, basename='user-character')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
]