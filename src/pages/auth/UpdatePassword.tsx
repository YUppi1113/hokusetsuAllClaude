import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import PublicHeader from '@/components/layouts/PublicHeader';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // 現在のユーザーセッションを確認
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: 'エラー',
          description: 'セッションが見つかりません。リンクが無効か期限切れです。',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: 'エラー',
        description: 'すべてのフィールドを入力してください',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'エラー',
        description: 'パスワードが一致しません',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'エラー',
        description: 'パスワードは8文字以上である必要があります',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: 'パスワードを更新しました',
        description: '新しいパスワードでログインできます',
      });

      // 短い遅延後にログインページにリダイレクト
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || 'パスワードの更新に失敗しました',
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

      {/* Right side - Update Password form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-block p-2 rounded-full bg-primary/10 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white">
                <span className="text-xl font-bold">北</span>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              新しいパスワードを設定
            </h2>
            <p className="text-center text-sm text-gray-600">
              安全なパスワードを設定して、アカウントを保護してください
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
                  <h3 className="mt-4 text-lg font-medium text-gray-900">パスワードを更新しました</h3>
                  <p className="mt-2 text-gray-500">
                    パスワードが正常に更新されました。ログインページに移動しています...
                  </p>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleUpdatePassword}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        新しいパスワード
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-input"
                        placeholder="••••••••"
                        minLength={8}
                      />
                      <p className="mt-1 text-xs text-gray-500">8文字以上で設定してください</p>
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        パスワードの確認
                      </label>
                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-input"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    className="w-full shadow-lg"
                    disabled={loading}
                    isLoading={loading}
                  >
                    パスワードを更新
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

export default UpdatePassword;