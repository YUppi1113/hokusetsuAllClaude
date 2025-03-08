import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)
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