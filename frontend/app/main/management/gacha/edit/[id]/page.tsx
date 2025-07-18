// app/main/management/gacha/edit/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // useParams をインポート
import axios, { AxiosError } from 'axios';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import {
    Box,
    Typography,
    Container,
    TextField,
    Button,
    Paper,
    Grid,
    MenuItem,
    IconButton,
    InputAdornment,
    CircularProgress,
    Alert,
    Snackbar,
    FormControlLabel,
    Checkbox,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { formatISO, parseISO } from 'date-fns';

import { getRarityDisplayName, getRarityStars } from '@/src/utils/helpers'; // getRarityStars もインポート

const AlertSnackbar = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * 全キャラクター情報の型定義 (画像URLは削除済み)
 */
interface AllCharacter {
    id: number;
    name: string;
    rarity: number;
    attribute: string;
    hp: number;
    atk: number;
    agi: number;
    description: string;
}

/**
 * APIから取得するガチャの型定義
 */
interface GachaData {
    id: number;
    name: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    rarity_rates: { rarity: number; rate: string }[];
    character_pool: { id: number; character: AllCharacter; is_pickup: boolean }[];
}

/**
 * フォーム入力の型定義
 */
interface GachaFormInputs {
    name: string;
    description: string;
    start_date: string | null; // "YYYY-MM-DDTHH:mm" 形式の文字列
    end_date: string | null;   // "YYYY-MM-DDTHH:mm" 形式の文字列
    rarity_rates: { rarity: number; rate: string }[];
    character_pool: { character_id: number; is_pickup: boolean }[]; // ここで管理されるのはIDとピックアップ状態
}

const RARITY_CHOICES = [
    { value: 1, label: 'N' },
    { value: 2, label: 'R' },
    { value: 3, label: 'SR' },
    { value: 4, label: 'SSR' },
    { value: 5, label: 'UR' },
];

export default function EditGachaPage({ params }: { params: { id: string } }) { // params を props で受け取る形式
    const router = useRouter();
    // ★修正: React.use() を削除し、params.id に直接アクセス
    const gachaId = params.id; // params.id は string 型として扱われます

    const [allCharacters, setAllCharacters] = useState<AllCharacter[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
        reset, // フォームのリセットと初期値設定
        watch, // フォームの値監視
        setValue, // フォームの値をプログラムから設定
    } = useForm<GachaFormInputs>({
        defaultValues: {
            name: '',
            description: '',
            start_date: null,
            end_date: null,
            rarity_rates: [], // 初期ロード時にデータに応じてセット
            character_pool: [], // 初期ロード時にデータに応じてセット
        },
    });

    const { fields: rarityFields, append: appendRarity, remove: removeRarity } = useFieldArray({
        control,
        name: 'rarity_rates',
    });

    const { fields: characterPoolFields, append: appendCharacter, remove: removeCharacter } = useFieldArray({
        control,
        name: 'character_pool',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!gachaId) { // IDがない場合はエラー
                console.log("DEBUG: ガチャIDが指定されていません。");
                setError('ガチャIDが指定されていません。');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                console.log("DEBUG: APIリクエスト開始");

                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    throw new Error('認証トークンがありません。');
                }
                const headers = { 'Authorization': `Bearer ${accessToken}` };

                // 2つのAPIを並行して呼び出す
                const [charactersRes, gachaRes] = await Promise.all([
                    axios.get<AllCharacter[]>(`${API_BASE_URL}/character/`, { headers: headers }),
                    axios.get<GachaData>(`${API_BASE_URL}/gacha/${gachaId}/`, { headers: headers }),
                ]);
                
                setAllCharacters(charactersRes.data);
                const gacha = gachaRes.data;

                // rarity_rates をフォームの形に変換
                const initialRarityRates = gacha.rarity_rates.map(rr => ({
                    rarity: rr.rarity,
                    rate: (parseFloat(rr.rate) * 100).toFixed(2), // DBから取得した小数値を%に変換
                }));
                // 全てのRARITY_CHOICESに対して排出率が存在することを確認し、なければ0.00%を追加
                RARITY_CHOICES.forEach(choice => {
                    if (!initialRarityRates.some(rr => rr.rarity === choice.value)) {
                        initialRarityRates.push({ rarity: choice.value, rate: '0.00' });
                    }
                });
                initialRarityRates.sort((a, b) => a.rarity - b.rarity); // レアリティ値でソート


                // character_pool をフォームの形に変換 (全てのキャラが選択肢、既存のガチャキャラは選択済み)
                // character_pool fields は append/remove で動的に管理するため、
                // reset には直接渡さずに、CharacterPoolFields としてappendする
                const initialCharacterPoolItems = charactersRes.data.map(char => {
                    const existingPoolItem = gacha.character_pool.find(cp => cp.character.id === char.id);
                    return {
                        character_id: char.id,
                        is_pickup: existingPoolItem ? existingPoolItem.is_pickup : false,
                    };
                });
                
                // フォームの値をセット
                reset({
                    name: gacha.name,
                    description: gacha.description || '',
                    start_date: gacha.start_date ? gacha.start_date.slice(0, 16) : null, // ISO形式の文字列をそのままYYYY-MM-DDTHH:mm形式に
                    end_date: gacha.end_date ? gacha.end_date.slice(0, 16) : null,     // ISO形式の文字列をそのままYYYY-MM-DDTHH:mm形式に
                    rarity_rates: initialRarityRates,
                    character_pool: initialCharacterPoolItems, // useFieldArrayに直接渡せる形式
                });

            } catch (err) {
                const axiosError = err as AxiosError;
                console.error('データ取得エラー:', axiosError.response?.status, axiosError.response?.data);
                if (axiosError.response) {
                    if (axiosError.response.status === 401 || axiosError.response.status === 403) {
                        setError('認証が必要です。管理者としてログインしてください。');
                        router.push('/main/login');
                    } else if (axiosError.response.status === 404) {
                        setError('指定されたガチャが見つかりません。');
                    } else if (axiosError.response.data && typeof axiosError.response.data === 'object' && 'detail' in axiosError.response.data) {
                        setError(`エラー: ${ (axiosError.response.data as { detail: string }).detail }`);
                    } else {
                        setError(`データの取得に失敗しました: ${axiosError.response.statusText}`);
                    }
                } else {
                    setError('ネットワークエラーが発生しました。');
                }
            } finally {
              console.log("DEBUG: fetchData 終了 (setLoading(false))");
                setLoading(false);
            }
        };

        if (gachaId && allCharacters.length === 0) { // allCharacters が空の場合のみデータをフェッチ (ループ防止)
            fetchData();
        } else if (!gachaId) {
            console.log("DEBUG: gachaId がなく、fetchData を実行しませんでした。"); // ★追加
            setLoading(false);
        } else if (allCharacters.length > 0 && !loading) {
            // allCharacters が既にロード済みで、かつローディング状態でない場合はスキップ
            // これにより無限ループや無駄な再フェッチを防ぐ
            console.log("DEBUG: データは既にロード済みか、条件を満たさないため fetchData をスキップしました。");
            setLoading(false); // 念のためロードを解除
        }
    }, [gachaId, allCharacters.length, reset]);


    const onSubmit: SubmitHandler<GachaFormInputs> = async (data) => {
        setLoading(true);
        setError(null);

        let totalRarityRate = 0;
        for (const rr of data.rarity_rates) {
            totalRarityRate += parseFloat(rr.rate);
        }
        if (Math.abs(totalRarityRate - 100) > 0.0001) { // 合計が100%にならない場合
            setError('レアリティ別排出率の合計が100%になりません。');
            setLoading(false);
            return;
        }

        const formattedData = {
            ...data,
            start_date: data.start_date ? formatISO(new Date(data.start_date)) : null,
            end_date: data.end_date ? formatISO(new Date(data.end_date)) : null,
            rarity_rates: data.rarity_rates.map(rr => ({
                rarity: rr.rarity,
                rate: (parseFloat(rr.rate) / 100).toFixed(4),
            })),
            character_pool: watch('character_pool').filter(item => {
                const currentStatus = getCharacterStatus(item.character_id);
                return currentStatus.is_selected;
            }).map(item => ({
                character_id: item.character_id,
                is_pickup: item.is_pickup,
            })),
        };

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                throw new Error('認証トークンがありません。');
            }
            const headers = { 'Authorization': `Bearer ${accessToken}` };

            await axios.put(`${API_BASE_URL}/gacha/${gachaId}/`, formattedData, { headers: headers });
            setSnackbarMessage('ガチャ情報が正常に更新されました。');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            router.push('/main/management/gacha');
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error('ガチャ更新エラー:', axiosError.response?.status, axiosError.response?.data);
            let message = 'ガチャの更新に失敗しました。';
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
                    message = '更新権限がありません。管理者としてログインしてください。';
                } else {
                    message = `ガチャの更新に失敗しました: ${axiosError.response.statusText}`;
                }
            } else if (axiosError.request) {
                message = 'サーバーに接続できませんでした。';
            }
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleCharacterSelectionChange = (character_id: number, field: 'is_selected' | 'is_pickup', checked: boolean) => {
        const currentCharacterPool = watch('character_pool');
        const characterIndex = currentCharacterPool.findIndex(item => item.character_id === character_id);

        if (field === 'is_selected') {
            if (checked) {
                if (characterIndex === -1) {
                    if (character_id > 0) {
                         appendCharacter({ character_id, is_pickup: false });
                    } else {
                         console.error("DEBUG: 無効なキャラクターIDが選択されました: ", character_id);
                    }
                }
            } else {
                if (characterIndex !== -1) {
                    removeCharacter(characterIndex);
                }
            }
        } else if (field === 'is_pickup') {
            if (characterIndex !== -1) {
                setValue(`character_pool.${characterIndex}.is_pickup`, checked, { shouldValidate: true });
            } else if (checked) {
                if (character_id > 0) {
                    appendCharacter({ character_id, is_pickup: true });
                } else {
                    console.error("DEBUG: 無効なキャラクターIDが選択されました: ", character_id);
                }
            }
        }
    };

    const getCharacterStatus = (charId: number) => {
        const item = watch('character_pool').find(poolItem => poolItem.character_id === charId);
        return {
            is_selected: !!item,
            is_pickup: item ? item.is_pickup : false,
        };
    };

    if (loading) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>データをロード中...</Typography>
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

    // 全キャラクターが読み込まれていない、またはガチャデータがない場合
    if (allCharacters.length === 0 || !watch('name')) { // watch('name')でガチャデータがロードされたかを確認
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
                <Alert severity="info">ガチャ情報またはキャラクター情報が読み込めませんでした。</Alert>
            </Container>
        );
    }

    return (
        <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
            <Typography component="h1" variant="h4" gutterBottom align="center">
                ガチャ編集 (ID: {gachaId})
            </Typography>

            <Paper elevation={3} sx={{ padding: 3, mt: 4 }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* ガチャ基本情報 */}
                    <Typography variant="h6" gutterBottom>基本情報</Typography>
                    <TextField
                        label="ガチャ名"
                        fullWidth
                        margin="normal"
                        {...register('name', { required: 'ガチャ名は必須です。' })}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                    />
                    <TextField
                        label="説明"
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                        {...register('description')}
                    />
                    {/* 開始日時、終了日時を表示 */}
                    <TextField
                        label="開始日時"
                        type="datetime-local"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        {...register('start_date')}
                        error={!!errors.start_date}
                        helperText={errors.start_date?.message}
                    />
                    <TextField
                        label="終了日時"
                        type="datetime-local"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        {...register('end_date')}
                        error={!!errors.end_date}
                        helperText={errors.end_date?.message}
                    />

                    {/* レアリティ別排出率設定 */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>レアリティ別排出率 (%)</Typography>
                    {RARITY_CHOICES.map((rarityChoice) => {
                        const fieldIndex = rarityFields.findIndex(f => f.rarity === rarityChoice.value);
                        const currentRateValue = watch(`rarity_rates.${fieldIndex !== -1 ? fieldIndex : rarityFields.length}.rate`);
                        
                        return (
                            <Box key={rarityChoice.value} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <Typography sx={{ minWidth: 120 }}>
                                    {getRarityStars(rarityChoice.value)}
                                </Typography>
                                <TextField
                                    label="排出率 (%)"
                                    type="number"
                                    fullWidth
                                    inputProps={{ step: "0.01", min: "0", max: "100" }}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                    }}
                                    {...register(`rarity_rates.${fieldIndex !== -1 ? fieldIndex : rarityFields.length}.rate`, {
                                        required: '排出率は必須です。',
                                        min: { value: 0, message: '0以上を入力してください。' },
                                        max: { value: 100, message: '100以下を入力してください。' },
                                        validate: value => {
                                            const numValue = parseFloat(value);
                                            if (isNaN(numValue)) return '有効な数値を入力してください。';
                                            return true;
                                        },
                                    })}
                                    value={currentRateValue}
                                    onChange={(e) => {
                                        if (fieldIndex !== -1) {
                                            setValue(`rarity_rates.${fieldIndex}.rate`, e.target.value);
                                        } else {
                                            appendRarity({ rarity: rarityChoice.value, rate: e.target.value });
                                        }
                                    }}
                                    error={!!errors.rarity_rates?.[fieldIndex]?.rate}
                                    helperText={errors.rarity_rates?.[fieldIndex]?.rate?.message}
                                />
                            </Box>
                        );
                    })}

                    {/* キャラクタープール設定 */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>排出対象キャラクター</Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>排出</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ピックアップ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>名前</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>レアリティ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>属性</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allCharacters.map((char) => {
                                    const status = getCharacterStatus(char.id);
                                    return (
                                        <TableRow key={char.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={status.is_selected}
                                                    onChange={(e) => handleCharacterSelectionChange(char.id, 'is_selected', e.target.checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Checkbox
                                                    checked={status.is_pickup}
                                                    onChange={(e) => handleCharacterSelectionChange(char.id, 'is_pickup', e.target.checked)}
                                                    disabled={!status.is_selected}
                                                />
                                            </TableCell>
                                            <TableCell>{char.name}</TableCell>
                                            <TableCell>{getRarityDisplayName(char.rarity)}</TableCell>
                                            <TableCell>{char.attribute}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {allCharacters.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            キャラクターが登録されていません。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mr: 1 }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'ガチャを更新'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => router.push('/main/management/gacha')}
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