// app/main/management/gacha/add/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    IconButton, // RemoveIcon を使用しない場合、削除可能
    InputAdornment,
    CircularProgress,
    Alert,
    Snackbar,
    FormControlLabel,
    Checkbox,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// RemoveIcon を使用しないため、インポートを削除
// import RemoveIcon from '@mui/icons-material/Remove';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { formatISO } from 'date-fns';

import { getRarityDisplayName, getRarityStars } from '@/src/utils/helpers';

const AlertSnackbar = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

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

interface GachaFormInputs {
    name: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    rarity_rates: { rarity: number; rate: string }[];
    character_pool: { character_id: number; is_pickup: boolean }[];
}

const RARITY_CHOICES = [
    { value: 1, label: 'N' },
    { value: 2, label: 'R' },
    { value: 3, label: 'SR' },
    { value: 4, label: 'SSR' },
    { value: 5, label: 'UR' },
];

export default function AddGachaPage() {
    const router = useRouter();
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
        watch,
        setValue,
    } = useForm<GachaFormInputs>({
        defaultValues: {
            name: '',
            description: '',
            start_date: new Date().toISOString().slice(0, 16),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 16),
            rarity_rates: [],
            character_pool: [],
        },
    });

    // rarityFields の append/remove は RARITY_CHOICES で固定されるため、不要になります。
    // useFieldArray の代わりに直接 watch を使って値を管理することも可能ですが、
    // 既存のフォームロジックを大きく変更しないために、フィールドの初期化にのみ使います。
    const { fields: rarityFields, append: appendRarity, remove: removeRarity } = useFieldArray({
        control,
        name: 'rarity_rates',
    });

    const { fields: characterPoolFields, append: appendCharacter, remove: removeCharacter } = useFieldArray({
        control,
        name: 'character_pool',
    });

    useEffect(() => {
        const fetchAllCharacters = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
                const response = await axios.get<AllCharacter[]>(`${API_BASE_URL}/character/`, { headers: headers });
                setAllCharacters(response.data);

                // 初回ロード時に全てのレアリティが排出率フィールドを持つようにする
                // rarityFields を直接操作する代わりに、setValue を使ってフォーム全体を初期化
                if (!watch('rarity_rates').length) { // フォームに rarity_rates がセットされていない場合のみ
                    const initialRarityRates = RARITY_CHOICES.map(choice => ({
                        rarity: choice.value,
                        rate: '0.00'
                    }));
                    setValue('rarity_rates', initialRarityRates, { shouldValidate: false }); // shouldValidate を false にして初回バリデーションを防ぐ
                }

            } catch (err) {
                const axiosError = err as AxiosError;
                console.error('キャラクターデータ取得エラー:', axiosError.response?.status, axiosError.response?.data);
                setError('キャラクターデータの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };
        fetchAllCharacters();
    }, []); // 依存配列から rarityFields.length を削除

    const onSubmit: SubmitHandler<GachaFormInputs> = async (data) => {
        setLoading(true);
        setError(null);

        let totalRarityRate = 0;
        for (const rr of data.rarity_rates) {
            totalRarityRate += parseFloat(rr.rate);
        }
        if (Math.abs(totalRarityRate - 100) > 0.0001) {
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

            await axios.post(`${API_BASE_URL}/gacha/`, formattedData, { headers: headers });
            setSnackbarMessage('ガチャが正常に作成されました。');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            router.push('/main/management/gacha');
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error('ガチャ作成エラー:', axiosError.response?.status, axiosError.response?.data);
            let message = 'ガチャの作成に失敗しました。';
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
                    message = `ガチャの作成に失敗しました: ${axiosError.response.statusText}`;
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

    if (loading && allCharacters.length === 0) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2, mt: 2 }}>データをロード中...</Typography>
            </Container>
        );
    }

    if (error && allCharacters.length === 0) {
        return (
            <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
            <Typography component="h1" variant="h4" gutterBottom align="center">
                新規ガチャ作成
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
                    <TextField
                        label="開始日時"
                        type="datetime-local"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        {...register('start_date', { required: '開始日時は必須です。' })}
                        error={!!errors.start_date}
                        helperText={errors.start_date?.message}
                    />
                    <TextField
                        label="終了日時"
                        type="datetime-local"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        {...register('end_date', { required: '終了日時は必須です。' })}
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
                                    error={!!errors.rarity_rates?.[index]?.rate}
                                    helperText={errors.rarity_rates?.[index]?.rate?.message}
                                />
                                {/* 削除ボタンを削除 */}
                                {/*
                                <IconButton onClick={() => removeRarity(index)} color="error" disabled={rarityFields.length === 1}>
                                    <RemoveIcon />
                                </IconButton>
                                */}
                            </Box>
                        );
                    })}
                    {/* 排出率の追加ボタンも削除 */}
                    {/*
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => appendRarity({ rarity: 1, rate: '0.00' })}
                        variant="outlined"
                    >
                        排出率を追加
                    </Button>
                    */}

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
                            {loading ? <CircularProgress size={24} /> : 'ガチャを作成'}
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