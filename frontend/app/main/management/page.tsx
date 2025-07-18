// app/main/management/page.tsx
'use client'; // クライアントコンポーネントとしてマーク

import React from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Typography,
  Container,
  Stack,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino'; // ガチャアイコン
import PeopleIcon from '@mui/icons-material/People'; // キャラクターアイコン

export default function ManagementPage() {
  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: 3,
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          管理画面
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          ガチャやキャラクターのデータを管理できます。
        </Typography>

        <Stack
          direction="row"
          spacing={4}
          justifyContent="center"
          sx={{ width: '100%' }}
        >
          {/* ガチャ管理画面への遷移ボタン */}
          <Link href="/main/management/gacha">
            <Button
              variant="contained"
              size="large"
              startIcon={<CasinoIcon />}
              sx={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                backgroundColor: '#1976d2',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  backgroundColor: '#1111CC',
                },
              }}
            >
              ガチャ管理
            </Button>
          </Link>

          {/* キャラクター管理画面への遷移ボタン (今回は実装しないが、将来的な拡張用) */}
          <Link href="/main/management/character">
            <Button
              variant="outlined"
              size="large"
              startIcon={<PeopleIcon />}
              sx={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
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
              キャラクター管理
            </Button>
          </Link>
        </Stack>
      </Box>
    </Container>
  );
}