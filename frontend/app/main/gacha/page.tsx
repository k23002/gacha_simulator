// app/main/gacha/page.tsx
'use client'; // このコンポーネントはクライアントサイドで動作します

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import axios, { AxiosError } from 'axios';
import {
  Box,
  Button,
  Typography,
  Container,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { getRarityDisplayName } from '@/src/utils/helpers';


// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * ガチャ情報の型定義 (APIレスポンスと一致させる)
 * is_active と image_url を削除
 */
interface Gacha {
    id: number;
    name: string;
    description: string;
    // is_active: boolean; // 削除
    start_date?: string;
    end_date?: string;
    rarity_rates: { rarity: number; rate: string }[];
    character_pool: { character: { id: number; name: string; rarity: number; }; is_pickup: boolean; }[];
}

/**
 * ガチャ情報ダイアログ表示用の型定義 (変更なし)
 */
interface GachaInfoDialogContent {
    title: string;
    description: string;
    rarity_rates: { rarity: number; rate: string }[];
    character_pool: { character: { id: number; name: string; rarity: number; }; is_pickup: boolean; }[];
}


export default function GachaPage() {
  const [gachas, setGachas] = useState<Gacha[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showResult, setShowResult] = useState<boolean>(false);
  const [gachaMessage, setGachaMessage] = useState<string>('');

  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [currentGachaInfo, setCurrentGachaInfo] = useState<GachaInfoDialogContent | null>(null);


  // ガチャ一覧を取得する関数 (is_active=true クエリパラメータを削除)
  const fetchGachas = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

      // is_active=true のクエリパラメータを削除
      const response = await axios.get<Gacha[]>(`${API_BASE_URL}/gacha/`, { headers: headers });
      setGachas(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('ガチャ一覧取得エラー:', axiosError);
      if (axiosError.response) {
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          setError('ガチャ一覧の表示にはログインが必要です。');
        } else {
          setError(`ガチャ一覧の取得に失敗しました: ${axiosError.response.statusText}`);
        }
      } else {
        setError('ネットワークエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGachas();
  }, []);

  const performGachaPull = async (gachaId: number, pullCount: number, gachaName: string) => {
    setGachaMessage('ガチャ結果を処理中...');
    setShowResult(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setGachaMessage('エラー: ログインしていません。ガチャを引くにはログインが必要です。');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/gacha/${gachaId}/pull/`,
        { pull_count: pullCount },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const pulledCharacters = response.data.pulled_characters;
      let message = `【${gachaName}を${pullCount}回引く結果】`;
      if (pulledCharacters && pulledCharacters.length > 0) {
        message += `${pulledCharacters.length}体のキャラクターを獲得しました！\n獲得: `;
        message += pulledCharacters.map((c: any) => `${c.name} (${getRarityDisplayName(c.rarity)})`).join(', ');
      } else {
        message += `キャラクターは排出されませんでした。`;
      }
      setGachaMessage(message);

    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('ガチャ実行エラー:', axiosError.response?.status, axiosError.response?.data);

      if (axiosError.response) {
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          setGachaMessage('エラー: 認証に失敗しました。再度ログインしてください。');
        } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
          setGachaMessage(`エラー: ${ (axiosError.response.data as { detail: string }).detail }`);
        } else {
          setGachaMessage(`ガチャ実行中にエラーが発生しました: ${axiosError.response.status} ${axiosError.response.statusText || '不明なエラー'}`);
        }
      } else if (axiosError.request) {
        setGachaMessage('エラー: サーバーに接続できませんでした。インターネット接続を確認してください。');
      } else {
        setGachaMessage('エラー: 不明な問題が発生しました。');
      }
    }
  };

  const handleSinglePull = (gachaId: number, gachaName: string) => {
    performGachaPull(gachaId, 1, gachaName);
  };

  const handleTenPull = (gachaId: number, gachaName: string) => {
    performGachaPull(gachaId, 10, gachaName);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setGachaMessage('');
  };

  const handleOpenGachaInfo = async (gachaId: number, gachaName: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

      const response = await axios.get<Gacha>(
          `${API_BASE_URL}/gacha/${gachaId}/`,
          { headers: headers }
      );
      const gachaDetail = response.data;

      setCurrentGachaInfo({
        title: `${gachaName} 詳細`,
        description: gachaDetail.description,
        rarity_rates: gachaDetail.rarity_rates,
        character_pool: gachaDetail.character_pool,
      });
      setShowInfo(true);

    } catch (err) {
        const axiosError = err as AxiosError;
        console.error('ガチャ情報取得エラー:', axiosError.response?.status, axiosError.response?.data);
        let errorMessage = 'ガチャ情報の取得に失敗しました。';
        if (axiosError.response && axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
            errorMessage = `エラー: ${ (axiosError.response.data as { detail: string }).detail }`;
        }
        alert(errorMessage);
    }
  };

  const handleCloseGachaInfo = () => {
    setShowInfo(false);
    setCurrentGachaInfo(null);
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>ガチャ情報をロード中...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
      }}>
          <Typography component="h1" variant="h4">
              ガチャ画面
          </Typography>
          <Link href="/main/gacha/log">
              <Button variant="outlined" color="primary" sx={{ ml: 2, fontWeight: 'bold' }}>
                  履歴
              </Button>
          </Link>
      </Box>

      {gachas.length > 0 ? (
        gachas.map((gacha) => (
          <Box
            key={gacha.id}
            sx={{
              border: `2px solid ${gacha.name === 'ゴールドガチャ' ? '#FFBF00' : '#1976d2'}`,
              borderRadius: '8px',
              padding: '20px',
              width: '100%',
              mb: 4,
            }}
          >
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {gacha.name}
              <IconButton
                aria-label={`${gacha.name}情報`}
                onClick={() => handleOpenGachaInfo(gacha.id, gacha.name)}
                sx={{ ml: 1 }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {gacha.description}
            </Typography>

            <Stack direction="row" spacing={4} justifyContent="center">
              <Button
                variant="outlined"
                onClick={() => handleSinglePull(gacha.id, gacha.name)}
                size="large"
                sx={{
                  minWidth: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  backgroundColor: gacha.name === 'ゴールドガチャ' ? '#FFFFFF' : '#E0E0E0',
                  color: gacha.name === 'ゴールドガチャ' ? '#FFD700' : '#333',
                  borderColor: gacha.name === 'ゴールドガチャ' ? '#FFD700' : '#999',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: gacha.name === 'ゴールドガチャ' ? '#FFF8DC' : '#D0D0D0',
                    borderColor: gacha.name === 'ゴールドガチャ' ? '#DAA520' : '#888',
                    color: gacha.name === 'ゴールドガチャ' ? '#DAA520' : '#222',
                  },
                }}
              >
                1回引く
              </Button>

              <Button
                variant="contained"
                onClick={() => handleTenPull(gacha.id, gacha.name)}
                size="large"
                sx={{
                  minWidth: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  backgroundColor: gacha.name === 'ゴールドガチャ' ? '#FFD700' : '#1976d2',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: gacha.name === 'ゴールドガチャ' ? '#DAA520' : '#1111CC',
                  },
                }}
              >
                10回引く
              </Button>
            </Stack>
          </Box>
        ))
      ) : (
        <Typography variant="body1" align="center" sx={{ p: 2 }}>
          ガチャが設定されていません。
        </Typography>
      )}

      <Dialog
        open={showResult}
        onClose={handleCloseResult}
        aria-labelledby="gacha-result-dialog-title"
      >
        <DialogTitle id="gacha-result-dialog-title">ガチャ結果</DialogTitle>
        <DialogContent>
          <Typography variant="body1" whiteSpace="pre-line">
            {gachaMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResult} color="primary" variant="contained">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showInfo}
        onClose={handleCloseGachaInfo}
        aria-labelledby="gacha-info-dialog-title"
      >
        <DialogTitle id="gacha-info-dialog-title">
          {currentGachaInfo?.title || 'ガチャ情報'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            {currentGachaInfo?.description}
          </Typography>
          {currentGachaInfo?.rarity_rates && currentGachaInfo.rarity_rates.length > 0 && (
            <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                    レアリティ別排出率:
                </Typography>
                {currentGachaInfo.rarity_rates
                    .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))
                    .map((rateItem, index) => (
                    <Typography key={index} variant="body2" color="text.secondary">
                        - レアリティ {getRarityDisplayName(rateItem.rarity)}: {parseFloat(rateItem.rate) * 100}%
                    </Typography>
                ))}
            </Box>
          )}
          {currentGachaInfo?.character_pool && currentGachaInfo.character_pool.length > 0 && (
            <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                    排出対象キャラクター:
                </Typography>
                {currentGachaInfo.character_pool
                    .sort((a, b) => {
                        if (a.character.rarity !== b.character.rarity) {
                            return b.character.rarity - a.character.rarity;
                        }
                        if (a.is_pickup !== b.is_pickup) {
                            return a.is_pickup ? -1 : 1;
                        }
                        return a.character.name.localeCompare(b.character.name);
                    })
                    .map((poolItem, index) => (
                    <Typography key={index} variant="body2" component="span" sx={{display: 'block'}}>
                        - {poolItem.character.name} ({getRarityDisplayName(poolItem.character.rarity)}) {poolItem.is_pickup ? '(ピックアップ)' : ''}
                    </Typography>
                ))}
            </Box>
          )}
          {(!currentGachaInfo?.rarity_rates?.length && !currentGachaInfo?.character_pool?.length) && (
              <Typography variant="body2" color="text.secondary">
                  提供割合およびキャラクター設定は設定されていません。
              </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGachaInfo} color="primary">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}