import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'エラー',
        description: 'メールアドレスとパスワードを入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check user_profiles first
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('is_profile_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      // Check instructor_profiles if user_profile doesn't exist
      const { data: instructorProfile } = await supabase
        .from('instructor_profiles')
        .select('is_profile_completed')
        .eq('id', data.user.id)
        .maybeSingle();
        
      // Determine which profile to use
      const profile = {
        user_type: userProfile ? 'user' : 'instructor',
        is_profile_completed: userProfile ? userProfile.is_profile_completed : instructorProfile?.is_profile_completed
      };

      toast({
        title: 'ログイン成功',
        description: 'ようこそ北摂でまなぼへ',
      });

      if (profile?.is_profile_completed) {
        navigate(`/${profile.user_type}`);
      } else {
        navigate(`/${profile.user_type}/profile`);
      }
    } catch (error: any) {
      toast({
        title: 'ログインエラー',
        description: error.message || 'ログインできませんでした',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-primary">北摂でまなぼ</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary/80">
              新規登録
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="メールアドレス"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="パスワード"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                ログイン情報を保存
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/80">
                パスワードを忘れた場合
              </a>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full py-6"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;