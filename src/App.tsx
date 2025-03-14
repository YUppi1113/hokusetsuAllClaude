import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './index.css'

// Auth components
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ResetPassword from '@/pages/auth/ResetPassword'
import UpdatePassword from '@/pages/auth/UpdatePassword'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// User components
import UserLayout from '@/components/layouts/UserLayout'
import UserHome from '@/pages/user/Home'
import UserLessons from '@/pages/user/Lessons'
import UserLessonDetail from '@/pages/user/LessonDetail'
import UserInstructorDetail from '@/pages/user/InstructorDetail'
import UserBookings from '@/pages/user/Bookings'
import UserChat from '@/pages/user/Chat'
import UserChatDetail from '@/pages/user/ChatDetail'
import UserProfile from '@/pages/user/Profile'
import UserFavorites from '@/pages/user/Favorites'
import UserHistory from '@/pages/user/History'
import UserNotifications from '@/pages/user/Notifications'

// Instructor components
import InstructorLayout from '@/components/layouts/InstructorLayout'
import InstructorHome from '@/pages/instructor/Home'
import InstructorProfile from '@/pages/instructor/Profile'
import InstructorLessons from '@/pages/instructor/Lessons'
import InstructorLessonCreate from '@/pages/instructor/LessonCreate'
import InstructorLessonEdit from '@/pages/instructor/LessonEdit'
import InstructorBookings from '@/pages/instructor/Bookings'
import InstructorChat from '@/pages/instructor/Chat'
import InstructorChatDetail from '@/pages/instructor/ChatDetail'
import InstructorNotifications from '@/pages/instructor/Notifications'
import InstructorPremium from '@/pages/instructor/Premium'

// Shared components
import NotFound from '@/pages/NotFound'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // セッション情報を取得
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError.message);
          setAuthError(sessionError.message);
          return;
        }
        
        // セッションが存在する場合はユーザー情報を取得
        if (sessionData.session) {
          const { data, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error('Error fetching user:', error.message);
            setAuthError(error.message);
          } else {
            setUser(data.user || null);
          }
        } else {
          console.log('No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching user:', error);
        setAuthError('認証情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    }
  }, [])

  // リロード時にセッションを復元するための処理
  useEffect(() => {
    const handleStorageChange = () => {
      // セッションが変更された場合に再取得
      const fetchUser = async () => {
        try {
          const { data } = await supabase.auth.getUser()
          setUser(data.user || null)
        } catch (error) {
          console.error('Session restore error:', error)
        }
      }
      
      fetchUser()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <p className="mt-4 text-lg font-medium text-foreground/70 animate-pulse">読み込み中...</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="text-red-500 mb-4">認証エラーが発生しました。再度ログインしてください。</div>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md"
          onClick={() => window.location.href = "/login"}
        >
          ログインページへ
        </button>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* User routes */}
        <Route 
          path="/user" 
          element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={true}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          {/* 未ログインでもアクセス可能なページ */}
          <Route index element={<UserHome />} />
          <Route path="lessons" element={<UserLessons />} />
          <Route path="lessons/:id" element={<UserLessonDetail />} />
          <Route path="instructors/:id" element={<UserInstructorDetail />} />
          
          {/* ログインが必要なページ - user_idが必要な操作 */}
          <Route path="bookings" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserBookings />
            </ProtectedRoute>
          } />
          <Route path="chat" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserChat />
            </ProtectedRoute>
          } />
          <Route path="chat/:id" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserChatDetail />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="favorites" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserFavorites />
            </ProtectedRoute>
          } />
          <Route path="history" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserHistory />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={
            <ProtectedRoute user={user} userType="user" allowPublicAccess={false}>
              <UserNotifications />
            </ProtectedRoute>
          } />
        </Route>

        {/* Instructor routes */}
        <Route 
          path="/instructor" 
          element={
            <ProtectedRoute user={user} userType="instructor">
              <InstructorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorHome />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute user={user} userType="instructor" allowIncompleteProfile>
              <InstructorProfile />
            </ProtectedRoute>
          } />
          <Route path="lessons" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorLessons />
            </ProtectedRoute>
          } />
          <Route path="lessons/create" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorLessonCreate />
            </ProtectedRoute>
          } />
          <Route path="lessons/:id/edit" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorLessonEdit />
            </ProtectedRoute>
          } />
          <Route path="bookings" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorBookings />
            </ProtectedRoute>
          } />
          <Route path="chat" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorChat />
            </ProtectedRoute>
          } />
          <Route path="chat/:id" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorChatDetail />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={
            <ProtectedRoute user={user} userType="instructor" allowIncompleteProfile>
              <InstructorNotifications />
            </ProtectedRoute>
          } />
          <Route path="premium" element={
            <ProtectedRoute user={user} userType="instructor" requireProfileCompletion>
              <InstructorPremium />
            </ProtectedRoute>
          } />
        </Route>

        {/* Redirect root to user home or instructor home based on user type */}
        <Route 
          path="/" 
          element={
            user ? (
              user.user_metadata?.user_type === 'instructor' ? (
                <Navigate to="/instructor" replace />
              ) : (
                <Navigate to="/user" replace />
              )
            ) : (
              // 未ログインの場合は生徒ホームページへ
              <Navigate to="/user" replace />
            )
          } 
        />

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster />
    </>
  )
}

export default App