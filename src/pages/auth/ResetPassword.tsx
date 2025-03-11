import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import PublicHeader from '@/components/layouts/PublicHeader';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'エラー',
        description: 'メールアドレスを入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: 'パスワードリセットメール送信',
        description: 'パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。',
      });
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || 'パスワードリセットメールの送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <PublicHeader />
      <div className="flex flex-1">
      {/* Left side - Image */}
      <div className="hidden md:flex md:w-1/2 bg-hero-pattern bg-cover bg-center bg-no-repeat relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/70 to-secondary/70 mix-blend-multiply"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="animate-float">
            <h1 className="text-5xl font-bold mb-4">北摂でまなぼ</h1>
            <p className="text-xl max-w-md text-center mb-8">
              北摂地域での習いごと・レッスンマッチングサービス
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Reset Password form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-block p-2 rounded-full bg-primary/10 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white">
                <span className="text-xl font-bold">北</span>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              パスワードをリセット
            </h2>
            <p className="text-center text-sm text-gray-600">
              または{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/80 underline underline-offset-4">
                ログインへ戻る
              </Link>
            </p>
          </div>
          
          <div className="mt-8">
            <div className="bg-primary/5 rounded-lg p-6 shadow-sm border border-primary/10">
              {success ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">メールを送信しました</h3>
                  <p className="mt-2 text-gray-500">
                    パスワードリセット用のリンクを記載したメールをお送りしました。
                    メールをご確認の上、リンクをクリックしてパスワードを再設定してください。
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/login"
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      ログインページに戻る
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleResetPassword}>
                  <div>
                    <p className="text-sm text-gray-700 mb-4">
                      パスワードリセット用のリンクをメールでお送りします。
                      アカウント登録時に使用したメールアドレスを入力してください。
                    </p>
                    
                    <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      placeholder="example@email.com"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    className="w-full shadow-lg"
                    disabled={loading}
                    isLoading={loading}
                  >
                    パスワードリセットを要求
                  </Button>
                </form>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                © 2025 北摂でまなぼ. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ResetPassword;