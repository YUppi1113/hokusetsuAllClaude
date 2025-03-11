import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import PublicHeader from '@/components/layouts/PublicHeader';

const Login = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const fromPath = location.state?.from || redirectPath || null;
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
      
      // セッションが正常に作成されたか確認
      if (data.session) {
        console.log('Session created successfully');
      } else {
        console.warn('Login succeeded but no session was created');
      }

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

      // locationのstateに保存されたパスがあれば、そこに遷移
      if (fromPath) {
        navigate(fromPath);
      } else if (profile?.is_profile_completed || profile.user_type === 'user') {
        // プロフィール完了済み、または生徒ユーザーの場合はホームへ
        navigate(`/${profile.user_type}`);
      } else {
        // 講師でプロフィール未完了の場合のみプロフィール設定画面へ
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
    <div className="min-h-screen flex flex-col overflow-hidden">
      <PublicHeader />
      {/* Main content */}
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
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-lg">
              <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <p className="text-sm">多種多様なレッスンやワークショップを見つけて、新しいスキルを身につけましょう</p>
            </div>
            <div className="flex items-center p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-lg">
              <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-sm">地元の優れた講師から学び、あなたのスキルを向上させてください</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-block p-2 rounded-full bg-primary/10 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white">
                <span className="text-xl font-bold">北</span>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              アカウントにログイン
            </h2>
            <p className="text-center text-sm text-gray-600">
              または{' '}
              <Link 
                to={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : "/register"} 
                state={{ from: fromPath }} 
                className="font-medium text-primary hover:text-primary/80 underline underline-offset-4"
              >
                新規登録
              </Link>
            </p>
          </div>
          
          <div className="mt-8">
            <div className="bg-primary/5 rounded-lg p-6 shadow-sm border border-primary/10">
              <form className="space-y-6" onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
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
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="form-input"
                      placeholder="••••••••"
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
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      ログイン情報を保存
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link to="/reset-password" className="font-medium text-primary hover:text-primary/80">
                      パスワードを忘れた場合
                    </Link>
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
                  ログイン
                </Button>
              </form>
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

export default Login;