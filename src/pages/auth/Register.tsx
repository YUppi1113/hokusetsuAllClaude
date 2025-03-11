import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import PublicHeader from '@/components/layouts/PublicHeader';

const Register = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const fromPath = location.state?.from || redirectPath || null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<'user' | 'instructor'>('user');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast({
        title: 'エラー',
        description: 'すべての項目を入力してください',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'パスワードエラー',
        description: 'パスワードが一致しません',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Register the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create a specific profile based on user type
        if (userType === 'user') {
          const { error: userProfileError } = await supabase.from('user_profiles').insert([
            {
              id: data.user.id,
              name: email.split('@')[0],
              email: email,
              username: email.split('@')[0],
              is_profile_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

          if (userProfileError) throw userProfileError;
        } else {
          const { error: instructorProfileError } = await supabase.from('instructor_profiles').insert([
            {
              id: data.user.id,
              name: email.split('@')[0],
              email: email,
              username: email.split('@')[0],
              is_profile_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

          if (instructorProfileError) throw instructorProfileError;
        }

        toast({
          title: '登録成功',
          description:
            'アカウントが作成されました。メールを確認して登録を完了してください。',
        });

        // locationのstateに保存されたパスがあれば、そこに遷移
        if (fromPath) {
          navigate(fromPath);
        } else if (userType === 'user') {
          // 生徒はホームにリダイレクト
          navigate('/user');
        } else {
          // 講師の場合のみプロフィール設定画面へ
          navigate('/instructor/profile');
        }
      }
    } catch (error: any) {
      toast({
        title: '登録エラー',
        description: error.message || '登録できませんでした',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-primary">北摂でまなぼ</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            新規アカウント登録
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            既にアカウントをお持ちの方は{' '}
            <Link 
              to={redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : "/login"} 
              state={{ from: fromPath }} 
              className="font-medium text-primary hover:text-primary/80"
            >
              ログイン
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="パスワード"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                パスワード（確認）
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="パスワード（確認）"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <input
                  id="user-type-user"
                  name="user-type"
                  type="radio"
                  checked={userType === 'user'}
                  onChange={() => setUserType('user')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <label htmlFor="user-type-user" className="ml-2 mr-6 block text-sm text-gray-900">
                  生徒として登録
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="user-type-instructor"
                  name="user-type"
                  type="radio"
                  checked={userType === 'instructor'}
                  onChange={() => setUserType('instructor')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <label htmlFor="user-type-instructor" className="ml-2 block text-sm text-gray-900">
                  講師として登録
                </label>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full py-6"
              disabled={loading}
            >
              {loading ? '登録中...' : '登録する'}
            </Button>
          </div>
          <div className="text-sm text-center">
            <p className="text-gray-600">
              利用規約とプライバシーポリシーに同意の上、登録してください。
            </p>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Register;