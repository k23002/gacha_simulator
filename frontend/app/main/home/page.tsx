// app/main/home/page.tsx
'use client'; // このコンポーネントはクライアントサイドで動作します

import React from 'react';
import Link from 'next/link'; // Next.jsのLinkコンポーネントをインポート
import {
  Box,
  Button,
  Typography,
  Container,
  Stack,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings'; // 設定アイコン（管理画面用）

export default function HomePage() {
  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // 横方向の中央揃え
          gap: 4, // 要素間のスペース
          padding: 3,
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          ようこそ！
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          ガチャを引いたり、所持キャラクターを確認できます。
        </Typography>

        <Stack
          direction="row" // 横方向に並べる
          spacing={4}     // ボタン間のスペース
          justifyContent="center" // Stack内の要素を中央に配置
          sx={{ width: '100%', flexWrap: 'wrap' }} // ボタンが多すぎるときに折り返す
        >
          {/* ガチャ画面への遷移ボタン */}
          <Link href="/main/gacha">
            <Button
              variant="contained"
              size="large" // ボタンのサイズを大きく
              sx={{
                width: '180px',   // 幅と高さを固定して円形に近づける
                height: '180px',
                borderRadius: '50%', // 角を丸くして円形にする
                backgroundColor: '#1976d2', // 青色
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  backgroundColor: '#1111CC',
                },
              }}
            >
              ガチャを引く
            </Button>
          </Link>

          {/* 所持キャラ一覧画面への遷移ボタン */}
          <Link href="/main/character">
            <Button
              variant="outlined"
              size="large" // ボタンのサイズを大きく
              sx={{
                width: '180px',   // 幅と高さを固定して円形に近づける
                height: '180px',
                borderRadius: '50%', // 角を丸くして円形にする
                backgroundColor: '#FFFFFF',
                color: '#1976d2',
                borderColor: '#1976d2',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: '#1111CC',
                  color: '#1111CC',
                },
              }}
            >
              所持キャラ一覧
            </Button>
          </Link>

          {/* ★ここから追加：管理画面への遷移ボタン */}
          <Link href="/main/management">
            <Button
              variant="contained"
              size="large" // ボタンのサイズを大きく
              startIcon={<SettingsIcon />} // アイコンを追加
              sx={{
                width: '180px',   // 幅と高さを固定して円形に近づける
                height: '180px',
                borderRadius: '50%', // 角を丸くして円形にする
                backgroundColor: '#FF5722', // オレンジ系
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  backgroundColor: '#E64A19',
                },
              }}
            >
              管理画面
            </Button>
          </Link>
          {/* ★ここまで追加 */}
        </Stack>
      </Box>
    </Container>
  );
}