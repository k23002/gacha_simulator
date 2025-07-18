// app/main/character/[id]/page.tsx
'use client'; // Client Componentとしてマーク

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Grid,
  Button,
} from '@mui/material';
import { getRarityDisplayName } from '@/src/utils/helpers';

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * キャラクターデータの型定義 (image_url は削除済み)
 */
interface Character {
  id: number;
  name: string;
  rarity: number;
  attribute: string;
  hp: number;
  atk: number;
  agi: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function CharacterDetailPage() {
  const params = useParams();
  const characterId = params.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!characterId) {
        setError('キャラクターIDが指定されていません。');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const accessToken = localStorage.getItem('accessToken');
        const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

        const response = await axios.get<Character>(
          `${API_BASE_URL}/character/${characterId}/`,
          { headers: headers }
        );
        setCharacter(response.data);
      } catch (err) {
        const axiosError = err as AxiosError;
        console.error('キャラクター詳細取得エラー:', axiosError.response?.status, axiosError.response?.data);
        if (axiosError.response) {
          if (axiosError.response.status === 401 || axiosError.response.status === 403) {
            setError('認証が必要です。再度ログインしてください。');
          } else if (axiosError.response.status === 404) {
            setError('指定されたキャラクターは見つかりませんでした。');
          } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
            setError(`エラー: ${ (axiosError.response.data as { detail: string }).detail }`);
          } else {
            setError(`キャラクターデータの取得に失敗しました: ${axiosError.response.statusText}`);
          }
        } else if (axiosError.request) {
          setError('サーバーに接続できませんでした。');
        } else {
          setError('不明なエラーが発生しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [characterId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>ロード中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Link href="/main/character">
            <Button variant="outlined" color="primary">
              一覧に戻る
            </Button>
          </Link>
        </Box>
      </Box>
    );
  }

  if (!character) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">キャラクター情報がありません。</Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Link href="/main/character">
            <Button variant="outlined" color="primary">
              一覧に戻る
            </Button>
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        キャラクター詳細
      </Typography>

      <Paper elevation={3} sx={{ padding: 3, mt: 4, maxWidth: 800, mx: 'auto' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={12}>
            <TableContainer>
              <Table size="small" aria-label="キャラクター詳細テーブル">
                <TableBody>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold', 
                            width: '30%',
                            whiteSpace: 'nowrap',    // テキストが改行されないように
                            writingMode: 'horizontal-tb', // 強制的に横書きに
                        }}
                    >
                        名前
                    </TableCell>
                    <TableCell sx={{ width: '70%' }}>{character.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        レアリティ
                    </TableCell>
                    <TableCell>{getRarityDisplayName(character.rarity)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        属性
                    </TableCell>
                    <TableCell>{character.attribute}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        HP
                    </TableCell>
                    <TableCell>{character.hp}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        攻撃力
                    </TableCell>
                    <TableCell>{character.atk}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        素早さ
                    </TableCell>
                    <TableCell>{character.agi}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                        component="th" 
                        scope="row" 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            writingMode: 'horizontal-tb',
                        }}
                    >
                        説明
                    </TableCell>
                    <TableCell>{character.description}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Link href="/main/character">
          <Button variant="contained" color="primary">
            一覧に戻る
          </Button>
        </Link>
      </Box>
    </Box>
  );
}