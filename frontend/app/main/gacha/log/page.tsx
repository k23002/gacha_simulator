// app/main/gacha/log/page.tsx
'use client'; // クライアントコンポーネントとしてマーク

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import {
    Box,
    Typography,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Button,
} from "@mui/material";
import { getRarityDisplayName } from '@/src/utils/helpers'; // ヘルパー関数をインポート

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * ガチャ履歴エントリの型定義 (APIレスポンスのGachaHistorySerializerと一致させる)
 * pulled_character_image を削除
 */
interface GachaHistoryEntry {
    id: number;
    gacha_name: string; // ガチャ名
    pulled_character_name: string; // 排出キャラクター名
    pulled_character_rarity: number; // 排出キャラクターレアリティ (数値)
    // pulled_character_image: string; // 削除
    pulled_at: string; // 排出日時
}

export default function GachaHistoryPage() {
    const [history, setHistory] = useState<GachaHistoryEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGachaHistory = async () => {
            setLoading(true);
            setError(null); // エラーをリセット

            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setError('認証トークンがありません。ログインしてください。');
                    setLoading(false);
                    return;
                }
                const headers = { 'Authorization': `Bearer ${accessToken}` };

                const response = await axios.get<GachaHistoryEntry[]>(`${API_BASE_URL}/gacha-history/`, { headers: headers });
                setHistory(response.data);
            } catch (err) {
                const axiosError = err as AxiosError;
                console.error('ガチャ履歴取得エラー:', axiosError.response?.status, axiosError.response?.data);
                if (axiosError.response) {
                    if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                        setError('認証が必要です。再度ログインしてください。');
                    } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
                        setError(`エラー: ${ (axiosError.response.data as { detail: string }).detail }`);
                    } else {
                        setError(`ガチャ履歴の取得に失敗しました: ${axiosError.response.statusText}`);
                    }
                } else if (axiosError.request) {
                    setError('サーバーに接続できませんでした。インターネット接続を確認してください。');
                } else {
                    setError('不明なエラーが発生しました。');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchGachaHistory();
    }, []); // コンポーネントマウント時に一度だけ実行

    if (loading) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>ガチャ履歴をロード中...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
                <Alert severity="error">{error}</Alert>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Link href="/main/gacha">
                        <Button variant="outlined" color="primary">
                            ガチャ画面に戻る
                        </Button>
                    </Link>
                </Box>
            </Container>
        );
    }

    return (
        <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
            <Typography component="h1" variant="h4" gutterBottom align="center">
                ガチャ履歴
            </Typography>

            <Paper elevation={3} sx={{ padding: 2 }}>
                {history.length > 0 ? (
                    <TableContainer>
                        <Table aria-label="ガチャ履歴テーブル">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>排出日時</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ガチャ名</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>レアリティ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>キャラクター名</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((entry) => (
                                    <TableRow
                                        key={entry.id}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {new Date(entry.pulled_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{entry.gacha_name}</TableCell>
                                        <TableCell>{getRarityDisplayName(entry.pulled_character_rarity)}</TableCell>
                                        <TableCell>{entry.pulled_character_name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body1" align="center" sx={{ p: 2 }}>
                        まだガチャ履歴がありません。
                    </Typography>
                )}
            </Paper>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Link href="/main/gacha">
                    <Button variant="contained" color="primary">
                        ガチャ画面に戻る
                    </Button>
                </Link>
            </Box>
        </Container>
    );
}