import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Auth components
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// User components
import UserLayout from '@/components/layouts/UserLayout'
import UserHome from '@/pages/user/Home'
import UserLessons from '@/pages/user/Lessons'
import UserLessonDetail from '@/pages/user/LessonDetail'
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          <Route index element={<InstructorHome />} />
          <Route path="profile" element={<InstructorProfile />} />
          <Route path="lessons" element={<InstructorLessons />} />
          <Route path="lessons/create" element={<InstructorLessonCreate />} />
          <Route path="lessons/:id/edit" element={<InstructorLessonEdit />} />
          <Route path="bookings" element={<InstructorBookings />} />
          <Route path="chat" element={<InstructorChat />} />
          <Route path="chat/:id" element={<InstructorChatDetail />} />
          <Route path="notifications" element={<InstructorNotifications />} />
          <Route path="premium" element={<InstructorPremium />} />
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