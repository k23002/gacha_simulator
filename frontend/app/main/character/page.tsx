// app/main/character/page.tsx
'use client'; // クライアントコンポーネントとしてマーク

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // キャラクター詳細ページへのリンク用
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
 * 所持キャラクター情報の型定義（APIレスポンスのUserCharacterSerializerと一致させる）
 */
interface UserCharacterData {
    id: number; // UserCharacter のID
    character: { // ネストされたCharacter情報
        id: number;
        name: string;
        rarity: number; // ★number型
        attribute: string;
        hp: number;
        atk: number;
        agi: number;
        description: string;
    };
    quantity: number; // 所持数
}

export default function UserCharactersPage() {
    const [userCharacters, setUserCharacters] = useState<UserCharacterData[]>([]); // ステート名をuserCharactersに変更
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserCharacters = async () => {
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

                // UserCharacter一覧APIを呼び出し
                const response = await axios.get<UserCharacterData[]>(`${API_BASE_URL}/user-character/`, { headers: headers });
                setUserCharacters(response.data);
            } catch (err) {
                const axiosError = err as AxiosError;
                console.error('所持キャラクター一覧取得エラー:', axiosError.response?.status, axiosError.response?.data);
                if (axiosError.response) {
                    if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                        setError('認証が必要です。再度ログインしてください。');
                    } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
                        setError(`エラー: ${ (axiosError.response.data as { detail: string }).detail }`);
                    } else {
                        setError(`所持キャラクター一覧の取得に失敗しました: ${axiosError.response.statusText}`);
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

        fetchUserCharacters();
    }, []); // コンポーネントマウント時に一度だけ実行

    if (loading) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>所持キャラクターをロード中...</Typography>
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
                所持キャラクター一覧
            </Typography>

            <Paper elevation={3} sx={{ padding: 2 }}>
                {userCharacters.length > 0 ? (
                    <TableContainer>
                        <Table aria-label="所持キャラクター一覧テーブル">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>レアリティ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>キャラクター名</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>属性</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>所持数</TableCell>
                                    {/* acquired_at の列は削除 */}
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>詳細</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userCharacters.map((userChar) => (
                                    <TableRow
                                        key={userChar.id}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {getRarityDisplayName(userChar.character.rarity)}
                                        </TableCell>
                                        <TableCell>{userChar.character.name}</TableCell>
                                        <TableCell>{userChar.character.attribute}</TableCell>
                                        <TableCell align="right">{userChar.quantity}</TableCell>
                                        {/* acquired_at の表示セルも削除 */}
                                        <TableCell align="center">
                                            <Link href={`/main/character/${userChar.character.id}`}>
                                                <Button variant="outlined" size="small">
                                                    詳細
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body1" align="center" sx={{ p: 2 }}>
                        所持しているキャラクターはいません。
                    </Typography>
                )}
            </Paper>
        </Container>
    );
}