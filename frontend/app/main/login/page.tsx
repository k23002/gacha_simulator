'use client'; // Client Componentとしてマーク

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/navigation'; // next/navigation から useRouter をインポート
import axios, { AxiosError } from 'axios'; // Axios と AxiosError をインポート
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress, // ロード中の表示用
} from '@mui/material';

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * フォーム入力の型定義
 */
interface LoginFormInputs {
  username: string;
  password: string;
}

/**
 * 認証APIレスポンスの型定義
 */
interface AuthResponse {
  access: string;
  refresh: string;
}

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();
  const router = useRouter();
  const [error, setError] = useState<string>(''); // エラーメッセージ用
  const [loading, setLoading] = useState<boolean>(false); // ロード中表示用

  // フォーム送信時の処理
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true); // ローディング開始
    setError(''); // 以前のエラーメッセージをクリア

    try {
      // Django REST Frameworkのトークン認証APIエンドポイントにPOSTリクエストを送信
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/token/`, {
        username: data.username,
        password: data.password,
      });

      // 認証成功
      const { access, refresh } = response.data;
      // 取得したトークンをlocalStorageに保存
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      // 以降のAxiosリクエストにAuthorizationヘッダーを自動で付与
      // これを一度設定すれば、保護されたAPIを呼び出す際にヘッダーを手動で追加する手間が省けます
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // ホーム画面へ遷移
      router.push('/main/home'); 

    } catch (err) {
      const axiosError = err as AxiosError; // エラーを AxiosError 型として扱う
      console.error('ログインエラー:', axiosError);

      if (axiosError.response) {
        // サーバーからのレスポンスがある場合
        if (axiosError.response.status === 401) {
          setError('ユーザー名またはパスワードが正しくありません。');
        } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
          // DRFからの詳細エラーメッセージ（例: { "detail": "認証情報が無効です。" }）
          setError((axiosError.response.data as { detail: string }).detail);
        } else {
          setError('ログイン中に予期せぬエラーが発生しました。');
        }
      } else if (axiosError.request) {
        // リクエストは送信されたがレスポンスがない場合（ネットワークの問題など）
        setError('サーバーに接続できませんでした。インターネット接続を確認してください。');
      } else {
        // リクエストの設定中にエラーが発生した場合
        setError('不明なエラーが発生しました。');
      }
    } finally {
      setLoading(false); // ローディング終了
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Typography component="h1" variant="h5">
          ログイン
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="ユーザー名"
            name="username"
            autoComplete="username"
            autoFocus
            {...register('username', { required: 'ユーザー名は必須です。' })}
            error={!!errors.username}
            helperText={errors.username?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="パスワード"
            type="password"
            id="password"
            autoComplete="current-password"
            {...register('password', { required: 'パスワードは必須です。' })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading} // ロード中はボタンを無効化
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'ログイン'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}