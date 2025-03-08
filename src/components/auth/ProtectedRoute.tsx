import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  user: any;
  userType?: 'user' | 'instructor';
  requireProfileCompletion?: boolean;
  allowIncompleteProfile?: boolean; // 通知やプロフィール設定ページ自体にはアクセス可能
}

const ProtectedRoute = ({ children, user, userType, requireProfileCompletion = false, allowIncompleteProfile = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [instructorProfile, setInstructorProfile] = useState<any>(null);
  const [activeUserType, setActiveUserType] = useState<'user' | 'instructor' | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 認証セッションを確認
    const checkSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('No valid auth session in ProtectedRoute:', sessionError?.message || 'Session missing');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    const fetchProfiles = async () => {
      try {
        // Check if user has a user profile
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData) {
          setUserProfile(userData);
          setActiveUserType('user');
        }
        
        // Check if user has an instructor profile
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!instructorError && instructorData) {
          setInstructorProfile(instructorData);
          
          // プロフィール完了状態を保存
          if (userType === 'instructor') {
            setIsProfileCompleted(instructorData?.is_profile_completed || false);
          }
          
          // If user has both profiles, the requested userType takes precedence
          if (userType === 'instructor' || (!userError && !userType)) {
            setActiveUserType('instructor');
          }
        } else if (userType === 'instructor') {
          // 講師プロフィールが存在しない場合は未完了
          setIsProfileCompleted(false);
        }
        
        if (userType === 'user' && !userError && userData) {
          setIsProfileCompleted(userData?.is_profile_completed || false);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    // セッション確認後にプロフィール取得
    checkSession().then(() => fetchProfiles());
  }, [user, userType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ユーザータイプが取得できていない場合は取得中と見なしてロード表示を継続
  if (userType && !activeUserType && loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userType && activeUserType && userType !== activeUserType) {
    return <Navigate to={`/${activeUserType}`} replace />;
  }
  
  // プロフィール設定が必要な場合はプロフィール設定ページにリダイレクト
  if (requireProfileCompletion && !isProfileCompleted && !allowIncompleteProfile) {
    if (userType === 'instructor') {
      return <Navigate to="/instructor/profile" replace />;
    } else if (userType === 'user') {
      return <Navigate to="/user/profile" replace />;
    }
  }

  // データが正しく取得できているか確認
  if ((userType === 'user' && !userProfile) || (userType === 'instructor' && !instructorProfile)) {
    if (userType === 'user') {
      console.log('User profile not found, redirecting to profile page');
      return <Navigate to="/user/profile" replace />;
    } else if (userType === 'instructor') {
      console.log('Instructor profile not found, redirecting to profile page');
      return <Navigate to="/instructor/profile" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;