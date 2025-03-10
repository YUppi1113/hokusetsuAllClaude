import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "./supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// データベースの ISO 日時文字列をパースして表示用に整形 (タイムゾーン調整なし)
export function formatISODateDisplay(isoString: string): string {
  // ISO文字列から直接日付部分を抽出 (YYYY-MM-DD)
  const datePart = isoString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

// データベースの ISO 時間文字列から時間部分を抽出 (タイムゾーン調整なし)
export function formatISOTimeDisplay(isoString: string): string {
  // ISO文字列から直接時間部分を抽出 (HH:MM:SS)
  const timePart = isoString.split('T')[1];
  // +00:00 や Z の前の部分だけを取得
  const timeWithoutTZ = timePart.split('+')[0].split('Z')[0];
  // 秒以下を除去
  const [hours, minutes] = timeWithoutTZ.split(':');
  return `${hours}:${minutes}`;
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

// 入力された日時を日本時間として正確に保存する関数
export function preserveTimeISOString(date: Date): string {
  // UTCオフセットを考慮して、日本時間をUTCとして記録する
  // 例: 22:00(日本時間)を22:00として保存するために、UTCとして22:00を指定
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // JST時間をそのまま保存するためにタイムゾーン情報を含めない形式で文字列を生成
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

// エラー発生時にコンソールに詳細を出力するラッパー関数
export function logError(error: unknown, context: string = '') {
  if (error instanceof Error) {
    console.error(`エラー [${context}]:`, error.message, error.stack);
  } else {
    console.error(`エラー [${context}]:`, error);
  }
  
  // デプロイメントエラーのチェック
  if (typeof error === 'string' && error.includes('DEPLOYMENT_NOT_FOUND')) {
    console.error('デプロイメントエラーが発生しました。おそらくルーティングの問題です。');
  }
}

// 非同期操作を安全に実行するラッパー関数
export async function safeAsync<T>(
  asyncFn: () => Promise<T>, 
  fallback: T, 
  context: string = ''
): Promise<T> {
  try {
    return await asyncFn();
  } catch (error) {
    logError(error, context);
    return fallback;
  }
}

// プレミアム講師かどうかを確認する関数
export async function checkIsPremiumInstructor(instructorId: string): Promise<boolean> {
  try {
    if (!instructorId) return false;
    
    // 現在の日時
    const now = new Date().toISOString();
    
    // プレミアムサブスクリプションを確認
    const { data: premiumData } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('status', 'active')
      .lt('start_date', now)
      .gt('end_date', now)
      .maybeSingle();
    
    return !!premiumData;
  } catch (error) {
    logError(error, 'checkIsPremiumInstructor');
    return false;
  }
}