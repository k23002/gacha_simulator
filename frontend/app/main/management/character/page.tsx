// app/main/management/character/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import {
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
  IconButton, // 編集・削除ボタン用
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, // 削除確認ダイアログ用
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

import { getRarityDisplayName } from '@/src/utils/helpers'; // レアリティ表示ヘルパー

const AlertSnackbar = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * キャラクター情報の型定義 (APIレスポンスと一致させる)
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

export default function CharacterManagementPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [characterToDeleteId, setCharacterToDeleteId] = useState<number | null>(null);
  const [characterToDeleteName, setCharacterToDeleteName] = useState<string>('');

  const showSnackbar = (severity: 'success' | 'error', message: string) => {
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

  // キャラクター一覧を取得する関数
  const fetchCharacters = async () => {
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

      // /api/character/ は GET で認証済みユーザーのみアクセス可能
      const response = await axios.get<Character[]>(`${API_BASE_URL}/character/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setCharacters(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('キャラクター一覧取得エラー:', axiosError);
      if (axiosError.response) {
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          setError('認証または権限がありません。管理者としてログインしてください。');
        } else {
          setError(`キャラクター一覧の取得に失敗しました: ${axiosError.response.statusText}`);
        }
      } else {
        setError('ネットワークエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントマウント時にキャラクター一覧をフェッチ
  useEffect(() => {
    fetchCharacters();
  }, []);

  // キャラクター追加ボタンクリック時の処理
  const handleAddCharacterClick = () => {
    // キャラクター追加画面へのパス
    router.push('/main/management/character/add');
  };

  // 削除ボタンクリック時の確認ダイアログ表示
  const handleDeleteClick = (id: number, name: string) => {
    setCharacterToDeleteId(id);
    setCharacterToDeleteName(name);
    setDeleteConfirmOpen(true);
  };

  // 削除確認ダイアログの「削除」ボタンクリック時の処理
  const handleConfirmDelete = async () => {
    if (characterToDeleteId === null) return;

    setDeleteConfirmOpen(false);
    setLoading(true); // 削除中はロード表示

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('認証トークンがありません。');
      }
      const headers = { 'Authorization': `Bearer ${accessToken}` };

      await axios.delete(`${API_BASE_URL}/character/${characterToDeleteId}/`, { headers: headers });
      showSnackbar('success', `キャラクター "${characterToDeleteName}" が正常に削除されました。`);
      fetchCharacters(); // 削除後に一覧を再フェッチ
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('キャラクター削除エラー:', axiosError.response?.data || axiosError.message);
      let message = 'キャラクターの削除に失敗しました。';
      if (axiosError.response) {
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          message = '削除権限がありません。管理者としてログインしてください。';
        } else {
          message = `キャラクターの削除に失敗しました: ${axiosError.response.statusText}`;
        }
      } else if (axiosError.request) {
        message = 'サーバーに接続できませんでした。';
      }
      showSnackbar('error', message);
      setLoading(false); // エラー時はロードを解除
    } finally {
      setCharacterToDeleteId(null);
      setCharacterToDeleteName('');
    }
  };

  // 削除確認ダイアログの「キャンセル」ボタンクリック時の処理
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCharacterToDeleteId(null);
    setCharacterToDeleteName('');
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>キャラクター一覧をロード中...</Typography>
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
      <Typography component="h1" variant="h4" gutterBottom align="center">
        キャラクター管理
      </Typography>

      {/* キャラクター追加ボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCharacterClick}
        >
          キャラクターを追加
        </Button>
      </Box>

      <Paper elevation={3} sx={{ padding: 2 }}>
        {characters.length > 0 ? (
          <TableContainer>
            <Table aria-label="キャラクター管理テーブル">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>名前</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>レアリティ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>属性</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>HP</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>ATK</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>AGI</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {characters.map((character) => (
                  <TableRow key={character.id}>
                    <TableCell>{character.id}</TableCell>
                    <TableCell>{character.name}</TableCell>
                    <TableCell>{getRarityDisplayName(character.rarity)}</TableCell>
                    <TableCell>{character.attribute}</TableCell>
                    <TableCell>{character.hp}</TableCell>
                    <TableCell>{character.atk}</TableCell>
                    <TableCell>{character.agi}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {/* 編集ボタン - キャラクター編集画面へのパス (まだ作成していません) */}
                        <Link href={`/main/management/character/edit/${character.id}`}>
                          <IconButton aria-label="編集" color="primary">
                            <EditIcon />
                          </IconButton>
                        </Link>
                        <IconButton
                          aria-label="削除"
                          color="error"
                          onClick={() => handleDeleteClick(character.id, character.name)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body1" align="center" sx={{ p: 2 }}>
            登録されているキャラクターはいません。
          </Typography>
        )}
      </Paper>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"キャラクターを削除しますか？"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            キャラクター「{characterToDeleteName}」を削除します。この操作は元に戻せません。本当に削除してもよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>キャンセル</Button>
          <Button onClick={handleConfirmDelete} autoFocus color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <AlertSnackbar onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </AlertSnackbar>
      </Snackbar>
    </Container>
  );
}