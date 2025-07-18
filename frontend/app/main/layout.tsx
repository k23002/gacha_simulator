// app/main/layout.tsx
'use client'; // Client Componentとしてマーク

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  // CssBaseline, // ThemeRegistry で提供されるため削除
  Snackbar,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';

// アイコン
import HomeIcon from '@mui/icons-material/Home';
import CasinoIcon from '@mui/icons-material/Casino';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

// SnackbarのAlertコンポーネント
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const drawerWidth = 240; // サイドバーの幅

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // 現在のパスを取得
  const router = useRouter(); // useRouterを初期化
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // ログアウトボタンの処理
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setSnackbarOpen(true);

    setTimeout(() => {
      router.push('/main/login');
    }, 500);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // サイドバーのナビゲーションアイテム
  const navItems = [
    { text: 'ホーム', icon: <HomeIcon />, href: '/main/home' },
    { text: 'ガチャ', icon: <CasinoIcon />, href: '/main/gacha' },
    { text: '所持キャラクター', icon: <PeopleIcon />, href: '/main/character' },
    { text: 'ガチャ管理', icon: <SettingsIcon />, href: '/main/management' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* CssBaseline は ThemeRegistry で提供されるのでここには不要 */}

      {/* ヘッダー */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          {/* アプリケーション名 */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ガチャシュミレーター
          </Typography>
          
          {/* ログアウトボタン */}
          <Button color="inherit" onClick={handleLogout}>
            ログアウト
          </Button>
        </Toolbar>
      </AppBar>

      {/* サイドバー */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <Link href={item.href}>
                  <ListItemButton selected={pathname === item.href}>
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </Link>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* メインコンテンツ */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${drawerWidth}px)` }}>
        <Toolbar />
        {children}
      </Box>

      {/* ログアウトメッセージ用Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}>
          ログアウトしました
        </Alert>
      </Snackbar>
    </Box>
  );
}