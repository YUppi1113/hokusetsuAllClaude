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

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user || null)
      setLoading(false)
    }

    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
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
            <ProtectedRoute user={user} userType="user">
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserHome />} />
          <Route path="lessons" element={<UserLessons />} />
          <Route path="lessons/:id" element={<UserLessonDetail />} />
          <Route path="instructors/:id" element={<UserInstructorDetail />} />
          <Route path="bookings" element={<UserBookings />} />
          <Route path="chat" element={<UserChat />} />
          <Route path="chat/:id" element={<UserChatDetail />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="favorites" element={<UserFavorites />} />
          <Route path="history" element={<UserHistory />} />
          <Route path="notifications" element={<UserNotifications />} />
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

        {/* Redirect root to appropriate home based on user type */}
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
              <Navigate to="/login" replace />
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