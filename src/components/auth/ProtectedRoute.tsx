import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  user: any;
  userType?: 'user' | 'instructor';
  requireProfileCompletion?: boolean;
  allowIncompleteProfile?: boolean; // 通知やプロフィール設定ページ自体にはアクセス可能
  allowPublicAccess?: boolean; // 未ログインでもアクセス可能（生徒サイト用）
  requireAuth?: boolean; // ログインが必須（予約・チャットなど）
}

const ProtectedRoute = ({ 
  children, 
  user, 
  userType, 
  requireProfileCompletion = false, 
  allowIncompleteProfile = false,
  allowPublicAccess = false,
  requireAuth = true
}: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [instructorProfile, setInstructorProfile] = useState<any>(null);
  const [activeUserType, setActiveUserType] = useState<'user' | 'instructor' | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  useEffect(() => {
    // 実行時に現在のルートパスをログ出力
    console.log('ProtectedRoute: 初期化', {
      path: window.location.pathname,
      userStatus: user ? 'ログイン済み' : '未ログイン',
      allowPublicAccess,
      requireAuth,
      userType
    });
    
    if (!user) {
      // 未ログインユーザーの場合
      console.log('ProtectedRoute: 未ログインユーザー検出', {
        allowPublicAccess,
        requireAuth,
        userType,
        path: window.location.pathname
      });
      
      if (allowPublicAccess) {
        // 公開ページの場合はロード終了
        console.log('ProtectedRoute: 公開ページアクセス許可');
        setLoading(false);
      } else {
        // それ以外はロード終了してリダイレクト (登録画面へのリダイレクトは下部で処理)
        console.log('ProtectedRoute: 非公開ページアクセス - 登録画面へリダイレクト準備');
        setLoading(false);
      }
      return;
    }

    // 認証セッションを確認
    const checkSession = async () => {
      try {
        console.log('ProtectedRoute: セッション確認開始');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('ProtectedRoute: 有効なセッションなし', {
            error: sessionError?.message || 'Session missing',
            path: window.location.pathname
          });
          setLoading(false);
          return;
        }
        
        console.log('ProtectedRoute: 有効なセッション確認', {
          userId: sessionData.session.user.id,
          path: window.location.pathname
        });
      } catch (err) {
        console.error('ProtectedRoute: セッション確認エラー', err);
      }
    };

    const fetchProfiles = async () => {
      try {
        console.log('ProtectedRoute: プロフィール取得開始', { userId: user.id, userType });
        
        // Check if user has a user profile
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData) {
          console.log('ProtectedRoute: ユーザープロフィール取得成功', { 
            profileId: userData.id,
            isCompleted: userData?.is_profile_completed || false
          });
          setUserProfile(userData);
          setActiveUserType('user');
        } else if (userError) {
          console.log('ProtectedRoute: ユーザープロフィール取得エラー', { 
            error: userError.message
          });
        }
        
        // Check if user has an instructor profile
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!instructorError && instructorData) {
          console.log('ProtectedRoute: 講師プロフィール取得成功', { 
            profileId: instructorData.id,
            isCompleted: instructorData?.is_profile_completed || false
          });
          setInstructorProfile(instructorData);
          
          // プロフィール完了状態を保存
          if (userType === 'instructor') {
            setIsProfileCompleted(instructorData?.is_profile_completed || false);
          }
          
          // If user has both profiles, the requested userType takes precedence
          if (userType === 'instructor' || (!userError && !userType)) {
            setActiveUserType('instructor');
          }
        } else if (instructorError) {
          console.log('ProtectedRoute: 講師プロフィール取得エラー', { 
            error: instructorError.message 
          });
          
          if (userType === 'instructor') {
            // 講師プロフィールが存在しない場合は未完了
            setIsProfileCompleted(false);
          }
        }
        
        if (userType === 'user' && !userError && userData) {
          setIsProfileCompleted(userData?.is_profile_completed || false);
        }
        
        console.log('ProtectedRoute: プロフィール取得完了', {
          activeUserType: userType === 'instructor' ? 'instructor' : 'user',
          isProfileCompleted: userType === 'instructor' 
            ? (instructorData?.is_profile_completed || false)
            : (userData?.is_profile_completed || false),
          path: window.location.pathname
        });
      } catch (error) {
        console.error('ProtectedRoute: プロフィール取得エラー', error);
      } finally {
        setLoading(false);
      }
    };

    // セッション確認後にプロフィール取得
    checkSession().then(() => fetchProfiles());
  }, [user, userType, allowPublicAccess]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 未ログインでも特定のページにはアクセス可能
  if (!user) {
    if (allowPublicAccess) {
      console.log('ProtectedRoute: 未ログインユーザーに公開ページを表示');
      return <>{children}</>;
    } else {
      // ログインが必要な操作へのリダイレクト（user_idが必要な操作）
      console.log('ProtectedRoute: 未ログインユーザーを登録画面へリダイレクト', {
        requireAuth,
        path: window.location.pathname
      });
      // 現在のパスを保存して新規登録画面へリダイレクト
      const currentPath = window.location.pathname;
      return <Navigate to="/register" state={{ from: currentPath }} replace />;
    }
  }

  // ユーザータイプが取得できていない場合は取得中と見なしてロード表示を継続
  if (userType && !activeUserType && loading) {
    console.log('ProtectedRoute: ユーザータイプ取得中...', {
      userType,
      activeUserType,
      loading,
      path: window.location.pathname
    });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userType && activeUserType && userType !== activeUserType) {
    console.log('ProtectedRoute: ユーザータイプ不一致によるリダイレクト', {
      requestedType: userType,
      actualType: activeUserType,
      path: window.location.pathname
    });
    return <Navigate to={`/${activeUserType}`} replace />;
  }
  
  // プロフィール設定が必要な場合はプロフィール設定ページにリダイレクト
  const skipProfileRedirect = localStorage.getItem('skipProfileRedirect') === 'true';
  
  if (requireProfileCompletion && !isProfileCompleted && !allowIncompleteProfile && !skipProfileRedirect) {
    console.log('ProtectedRoute: プロフィール未完了によるリダイレクト', {
      userType,
      isProfileCompleted,
      skipProfileRedirect,
      path: window.location.pathname
    });
    
    // 講師のみプロフィール設定ページへリダイレクト
    if (userType === 'instructor') {
      return <Navigate to="/instructor/profile" replace />;
    }
    // 生徒はプロフィール未設定でもリダイレクトしない
  } else if (skipProfileRedirect) {
    console.log('ProtectedRoute: プロフィールリダイレクトをスキップ', {
      userType,
      isProfileCompleted,
      path: window.location.pathname
    });
  }

  // データが正しく取得できているか確認
  if ((userType === 'user' && !userProfile) || (userType === 'instructor' && !instructorProfile)) {
    // プロフィールリダイレクトのスキップが有効な場合はリダイレクトしない
    if (skipProfileRedirect) {
      console.log('ProtectedRoute: プロフィールデータ不足だがリダイレクトをスキップ', {
        userType,
        hasUserProfile: !!userProfile,
        hasInstructorProfile: !!instructorProfile,
        path: window.location.pathname
      });
    } else {
      console.log('ProtectedRoute: プロフィールデータ不足によるリダイレクト', {
        userType,
        hasUserProfile: !!userProfile,
        hasInstructorProfile: !!instructorProfile,
        path: window.location.pathname
      });
      
      // 講師のみプロフィール設定ページへリダイレクト
      if (userType === 'instructor') {
        console.log('ProtectedRoute: 講師プロフィールが見つからないためプロフィールページへリダイレクト');
        return <Navigate to="/instructor/profile" replace />;
      }
      // 生徒はプロフィール未設定でもリダイレクトしない
    }
  }

  console.log('ProtectedRoute: コンポーネント表示許可', {
    userType,
    path: window.location.pathname,
    isAuthenticated: !!user,
    isProfileCompleted
  });
  return <>{children}</>;
};

export default ProtectedRoute;