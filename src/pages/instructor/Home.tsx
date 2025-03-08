import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CalendarClock,
  Users,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  MessageSquare,
  Plus,
  Crown,
  Calendar,
  User,
} from 'lucide-react';

const InstructorHome = () => {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalLessons: 0,
    totalBookings: 0,
    upcomingLessons: 0,
    totalRating: 0,
    reviewCount: 0,
    pendingMessages: 0,
  });
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the instructor profile
        const { data: profileData } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Check premium status
        const now = new Date().toISOString();
        const { data: premiumData } = await supabase
          .from('premium_subscriptions')
          .select('*')
          .eq('instructor_id', user.id)
          .eq('status', 'active')
          .lt('start_date', now)
          .gt('end_date', now)
          .maybeSingle();

        setIsPremium(!!premiumData);

        // Get upcoming lessons
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('instructor_id', user.id)
          .eq('status', 'published')
          .gt('date_time_start', now)
          .order('date_time_start', true)
          .limit(5);

        if (lessonsData) {
          setUpcomingLessons(lessonsData);
        }

        // Get recent bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            lesson:lessons(lesson_title, date_time_start),
            user:user_profiles(name, profile_image_url)
          `)
          .eq('lesson.instructor_id', user.id)
          .order('created_at', false)
          .limit(5);

        if (bookingsData) {
          setRecentBookings(bookingsData);
        }

        // Calculate stats
        const { count: totalLessonsCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact' })
          .eq('instructor_id', user.id);

        const { count: totalBookingsCount } = await supabase
          .from('bookings')
          .select('bookings.id', { count: 'exact' })
          .eq('lesson.instructor_id', user.id)
          .not('status', 'eq', 'canceled');

        const { count: upcomingLessonsCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact' })
          .eq('instructor_id', user.id)
          .eq('status', 'published')
          .gt('date_time_start', now);

        // Get rating stats
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('instructor_id', user.id);

        let avgRating = 0;
        let reviewCount = 0;
        
        if (reviewsData && reviewsData.length > 0) {
          reviewCount = reviewsData.length;
          avgRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
        }

        // Get unread messages count
        const { count: unreadMessagesCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact' })
          .eq('chat_room.instructor_id', user.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        setStats({
          totalLessons: totalLessonsCount || 0,
          totalBookings: totalBookingsCount || 0,
          upcomingLessons: upcomingLessonsCount || 0,
          totalRating: avgRating,
          reviewCount,
          pendingMessages: unreadMessagesCount || 0,
        });
      } catch (error) {
        console.error('Error fetching instructor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-primary/90 to-primary rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              ようこそ、{profile?.name || '講師'} さん
            </h1>
            <p className="mt-2 text-white/90">
              レッスンの管理やスケジュールの確認を行えます。
            </p>
          </div>
          <div className="hidden sm:flex space-x-3">
            <Button
              asChild
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Link to="/instructor/lessons">レッスン一覧</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-primary hover:bg-white/90"
            >
              <Link to="/instructor/lessons/create">
                <Plus className="w-4 h-4 mr-2" />
                新しいレッスンを作成
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!isPremium && (
        <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-yellow-500 mr-4" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">プレミアムプランへアップグレード</h2>
                <p className="text-gray-600">
                  検索結果の上位表示や仲介手数料0円などの特典が得られます。
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/instructor/premium">詳細を見る</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3 mr-4">
              <CalendarClock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">公開中のレッスン</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalLessons}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">これまでの予約数</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalBookings}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">予定レッスン数</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.upcomingLessons}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">平均評価</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.reviewCount > 0 ? 
                  `${stats.totalRating.toFixed(1)} (${stats.reviewCount})` :
                  'レビューなし'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile button group */}
      <div className="flex sm:hidden space-x-3">
        <Button
          asChild
          variant="outline"
          className="flex-1"
        >
          <Link to="/instructor/lessons">レッスン一覧</Link>
        </Button>
        <Button
          asChild
          className="flex-1"
        >
          <Link to="/instructor/lessons/create">
            <Plus className="w-4 h-4 mr-2" />
            新規レッスン
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Lessons */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">近日開催のレッスン</h2>
            <Link to="/instructor/lessons" className="text-primary text-sm flex items-center hover:underline">
              すべて見る
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-100">
            {upcomingLessons.length > 0 ? (
              upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="p-4 hover:bg-gray-50">
                  <Link to={`/instructor/lessons/${lesson.id}/edit`} className="block">
                    <h3 className="font-medium text-gray-900">{lesson.lesson_title}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(lesson.date_time_start)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(lesson.date_time_start).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {lesson.current_participants_count}/{lesson.capacity}
                      </span>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>予定されているレッスンはありません</p>
                <Button asChild className="mt-4">
                  <Link to="/instructor/lessons/create">レッスンを作成する</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">最近の予約</h2>
            <Link to="/instructor/bookings" className="text-primary text-sm flex items-center hover:underline">
              すべて見る
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-gray-50">
                  <Link to={`/instructor/bookings`} className="block">
                    <div className="flex items-center">
                      <img
                        src={booking.user.profile_image_url || '/placeholder-avatar.jpg'}
                        alt={booking.user.name}
                        className="w-10 h-10 rounded-full mr-3 object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{booking.user.name}</h3>
                        <p className="text-sm text-gray-600">{booking.lesson.lesson_title}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          booking.status === 'canceled' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {
                            booking.status === 'confirmed' ? '確定' : 
                            booking.status === 'pending' ? '保留中' : 
                            booking.status === 'canceled' ? 'キャンセル' : 
                            booking.status === 'completed' ? '完了' : booking.status
                          }
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(booking.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>予約はまだありません</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          to="/instructor/chat"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
        >
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-4 mr-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">メッセージ</h3>
              {stats.pendingMessages > 0 && (
                <p className="text-sm text-primary">
                  {stats.pendingMessages}件の未読メッセージ
                </p>
              )}
            </div>
          </div>
        </Link>

        <Link
          to="/instructor/profile"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
        >
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-4 mr-4">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">プロフィール</h3>
              <p className="text-sm text-gray-500">プロフィールを編集</p>
            </div>
          </div>
        </Link>

        <Link
          to="/instructor/lessons/create"
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
        >
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-4 mr-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">新規レッスン</h3>
              <p className="text-sm text-gray-500">新しいレッスンを作成</p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
};

export default InstructorHome;