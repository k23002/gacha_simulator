// app/main/management/character/add/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useForm, SubmitHandler } from 'react-hook-form';

import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  Paper,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

import { getRarityDisplayName } from '@/src/utils/helpers'; // レアリティ表示ヘルパー

const AlertSnackbar = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * フォーム入力の型定義 (Characterモデルのフィールドと一致)
 */
interface CharacterFormInputs {
  name: string;
  rarity: number;
  attribute: string;
  hp: number;
  atk: number;
  agi: number;
  description: string;
}

const RARITY_CHOICES = [
    { value: 1, label: 'N' },
    { value: 2, label: 'R' },
    { value: 3, label: 'SR' },
    { value: 4, label: 'SSR' },
    { value: 5, label: 'UR' },
];

const ATTRIBUTE_CHOICES = [
    { value: 'fire', label: '炎' },
    { value: 'water', label: '水' },
    { value: 'wind', label: '風' },
    { value: 'earth', label: '土' },
    { value: 'light', label: '光' },
    { value: 'dark', label: '闇' },
    { value: 'none', label: '無' },
];

export default function AddCharacterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false); // 初期はロード中ではない
  const [error, setError] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset, // フォームのリセット
  } = useForm<CharacterFormInputs>({
    defaultValues: {
      name: '',
      rarity: RARITY_CHOICES[0].value, // デフォルトで最初のレアリティを選択
      attribute: ATTRIBUTE_CHOICES[0].value, // デフォルトで最初の属性を選択
      hp: 1000,
      atk: 100,
      agi: 50,
      description: '',
    },
  });

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

  const onSubmit: SubmitHandler<CharacterFormInputs> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        showSnackbar('error', '認証トークンがありません。');
        setLoading(false);
        router.push('/main/login');
        return;
      }
      const headers = { 'Authorization': `Bearer ${accessToken}` };

      // POSTメソッドで新しいキャラクターを作成
      await axios.post(`${API_BASE_URL}/character/`, data, { headers: headers });
      
      showSnackbar('success', 'キャラクターが正常に追加されました。');
      reset(); // フォームをリセットして次の追加に備える
      // router.push('/main/management/character'); // 追加後一覧に戻る場合はコメント解除

    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('キャラクター作成エラー:', axiosError.response?.status, axiosError.response?.data);
      let message = 'キャラクターの作成に失敗しました。';
      if (axiosError.response) {
        if (axiosError.response.status === 400) {
          const errorData = axiosError.response.data as { [key: string]: any };
          message = Object.entries(errorData)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
        } else if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          message = '作成権限がありません。管理者としてログインしてください。';
        } else {
          message = `キャラクターの作成に失敗しました: ${axiosError.response.statusText}`;
        }
      } else if (axiosError.request) {
        message = 'サーバーに接続できませんでした。';
      }
      showSnackbar('error', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) { // 初期ロードではなく、送信中のローディング
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>処理中...</Typography>
      </Container>
    );
  }

  if (error) { // 送信中に発生したエラー
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Typography component="h1" variant="h4" gutterBottom align="center">
        新しいキャラクターを追加
      </Typography>

      <Paper elevation={3} sx={{ padding: 3, mt: 4 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="名前"
            fullWidth
            margin="normal"
            {...register('name', { required: '名前は必須です。' })}
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <TextField
            label="レアリティ"
            select
            fullWidth
            margin="normal"
            {...register('rarity', { required: 'レアリティは必須です。', valueAsNumber: true })}
            error={!!errors.rarity}
            helperText={errors.rarity?.message}
          >
            {RARITY_CHOICES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {getRarityDisplayName(option.value)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="属性"
            select
            fullWidth
            margin="normal"
            {...register('attribute', { required: '属性は必須です。' })}
            error={!!errors.attribute}
            helperText={errors.attribute?.message}
          >
            {ATTRIBUTE_CHOICES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="HP"
            type="number"
            fullWidth
            margin="normal"
            {...register('hp', { required: 'HPは必須です。', valueAsNumber: true, min: { value: 1, message: '1以上の値を入力してください。' } })}
            error={!!errors.hp}
            helperText={errors.hp?.message}
          />
          <TextField
            label="攻撃力"
            type="number"
            fullWidth
            margin="normal"
            {...register('atk', { required: '攻撃力は必須です。', valueAsNumber: true, min: { value: 1, message: '1以上の値を入力してください。' } })}
            error={!!errors.atk}
            helperText={errors.atk?.message}
          />
          <TextField
            label="素早さ"
            type="number"
            fullWidth
            margin="normal"
            {...register('agi', { required: '素早さは必須です。', valueAsNumber: true, min: { value: 1, message: '1以上の値を入力してください。' } })}
            error={!!errors.agi}
            helperText={errors.agi?.message}
          />

          <TextField
            label="説明"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mr: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'キャラクターを作成'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => router.push('/main/management/character')}
              disabled={loading}
            >
              戻る
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <AlertSnackbar onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </AlertSnackbar>
      </Snackbar>
    </Container>
  );
}