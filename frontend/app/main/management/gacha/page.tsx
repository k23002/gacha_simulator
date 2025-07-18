// app/main/management/gacha/page.tsx
'use client'; // クライアントコンポーネントとしてマーク

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import {
  AlertColor,
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress,
  Alert,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * ガチャ情報の型定義 (is_active を削除)
 */
interface Gacha {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export default function GachaManagementPage() {
  const router = useRouter();
  const [gachas, setGachas] = useState<Gacha[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (severity: AlertColor, message: string) => {
    setSnackbarSeverity(severity);
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // fetchGachas から is_active=true クエリパラメータを削除
  const fetchGachas = async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('認証トークンが見つかりません。ログインしてください。');
        setLoading(false);
        router.push('/main/login');
        return;
      }

      const response = await axios.get<Gacha[]>(`${API_BASE_URL}/gacha/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setGachas(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('ガチャ一覧取得エラー:', axiosError);
      if (axiosError.response) {
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          setError('認証または権限がありません。管理者としてログインしてください。');
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

  const handleAddGachaClick = () => {
    router.push('/main/management/gacha/add');
  };

  const handleDeleteGacha = async (gachaId: number, gachaName: string) => {
    if (!window.confirm(`ガチャ「${gachaName}」を削除してもよろしいですか？`)) {
      return;
    }

    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        showSnackbar('error', '認証トークンがありません。');
        setLoading(false);
        router.push('/main/login');
        return;
      }

      await axios.delete(`${API_BASE_URL}/gacha/${gachaId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      showSnackbar('success', `ガチャ "${gachaName}" が削除されました。`);
      fetchGachas();
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('ガチャ削除エラー:', axiosError.response?.data || axiosError.message);
      showSnackbar('error', `削除中にエラーが発生しました: ${axiosError.response?.data?.detail || axiosError.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      {/* ロード中の表示 */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>ガチャ一覧をロード中...</Typography>
        </Box>
      )}

      {/* エラー表示 */}
      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* 通常のコンテンツ表示 (ロード中でなく、エラーもない場合) */}
      {!loading && !error && (
        <>
          <Typography component="h1" variant="h4" gutterBottom align="center">
            ガチャ管理
          </Typography>

          {/* ガチャ追加ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddGachaClick}
            >
              ガチャを追加
            </Button>
          </Box>
          <Paper elevation={3} sx={{ padding: 2 }}>
            {gachas.length > 0 ? (
              <TableContainer>
                <Table aria-label="ガチャ管理テーブル">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>ガチャ名</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>説明</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>アクション</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gachas.map((gacha) => (
                      <TableRow key={gacha.id}>
                        <TableCell>{gacha.id}</TableCell>
                        <TableCell>{gacha.name}</TableCell>
                        <TableCell>{gacha.description || '-'}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Link href={`/main/management/gacha/edit/${gacha.id}`}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<EditIcon />}
                              >
                                編集
                              </Button>
                            </Link>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteGacha(gacha.id, gacha.name)}
                            >
                              削除
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1" align="center" sx={{ p: 2 }}>
                登録されているガチャはありません。
              </Typography>
            )}
          </Paper>
        </>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}