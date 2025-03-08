import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  MessageSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Booking {
  id: string;
  user_id: string;
  lesson_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: string;
  created_at: string;
  updated_at: string;
  user: {
    name: string;
    profile_image_url: string;
  };
  lesson: {
    lesson_title: string;
    date_time_start: string;
    date_time_end: string;
    price: number;
    status: string;
    instructor_id: string;
  };
}

const InstructorBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      // 現在のユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // インストラクターのレッスンに紐づく全ての予約を取得するクエリ
      let query = supabase
        .from('bookings')
        .select(
          `
            *,
            user:user_profiles(name, profile_image_url),
            lesson:lesson_id(
              lesson_title,
              date_time_start,
              date_time_end,
              price,
              status,
              instructor_id
            )
          `
        )
        .filter('lesson.instructor_id', 'eq', user.id);

      const now = new Date().toISOString();

      // タブに応じてフィルタリングとソートを切り替える
      if (activeTab === 'upcoming') {
        query = query
          .in('status', ['pending', 'confirmed'])
          .gt('lesson.date_time_start', now)
          // 外部テーブルのカラムでソートする場合は foreignTable を使う
          .order('date_time_start', { ascending: true, foreignTable: 'lesson' });
      } else if (activeTab === 'pending') {
        query = query
          .eq('status', 'pending')
          .order('created_at', { ascending: false }); // bookings テーブルのカラムなのでそのままでOK
      } else if (activeTab === 'past') {
        query = query
          .in('status', ['confirmed', 'completed', 'cancelled'])
          .lt('lesson.date_time_start', now)
          .order('date_time_start', { ascending: false, foreignTable: 'lesson' });
      } else if (activeTab === 'cancelled') {
        query = query
          .eq('status', 'cancelled')
          .order('updated_at', { ascending: false }); // bookings テーブルの updated_at
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      // レッスン情報がある予約のみを表示する
      const processedData = (data || []).filter((booking) => booking.lesson);
      
      setBookings(processedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('bookings')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      // ローカルの state を更新
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
        )
      );

      toast({
        description:
          status === 'confirmed' ? '予約を承認しました' : '予約をキャンセルしました',
      });

      // フィルタリングされた画面にいる場合、再度読み込み
      if (activeTab === 'pending') {
        fetchBookings();
      }
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: error.message || '予約ステータスの更新に失敗しました。',
      });
    } finally {
      setUpdating(false);
    }
  };

  // 検索バーのフィルタリング用
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.lesson.lesson_title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ステータスバッジの色分けクラスを返す
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータス文字列を日本語に
  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '承認済み';
      case 'pending':
        return '保留中';
      case 'cancelled':
        return 'キャンセル済み';
      case 'completed':
        return '完了';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">予約管理</h1>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="upcoming">予定の予約</TabsTrigger>
            <TabsTrigger value="pending">保留中</TabsTrigger>
            <TabsTrigger value="past">過去の予約</TabsTrigger>
            <TabsTrigger value="cancelled">キャンセル済み</TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="受講者名またはレッスン名で検索..."
              className="pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 予定の予約タブ */}
        <TabsContent value="upcoming" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">受講者</th>
                      <th className="px-6 py-3 text-left">レッスン</th>
                      <th className="px-6 py-3 text-left">日程</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={
                                  booking.user.profile_image_url ||
                                  '/placeholder-avatar.jpg'
                                }
                                alt={booking.user.name}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {booking.user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.lesson?.lesson_title || 'レッスン情報なし'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.lesson?.status === 'cancelled' &&
                              '(レッスンがキャンセルされました)'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(booking.lesson.date_time_start)}
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {new Date(
                                booking.lesson.date_time_start
                              ).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(
                                booking.lesson.date_time_end
                              ).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              booking.status
                            )}`}
                          >
                            {getStatusText(booking.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() =>
                                    handleUpdateBookingStatus(
                                      booking.id,
                                      'confirmed'
                                    )
                                  }
                                  disabled={updating}
                                  className="text-gray-400 hover:text-green-500"
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateBookingStatus(
                                      booking.id,
                                      'cancelled'
                                    )
                                  }
                                  disabled={updating}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            <Link
                              to={`/instructor/chat`}
                              className="text-gray-400 hover:text-blue-500"
                            >
                              <MessageSquare className="h-5 w-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500">予定されている予約はありません</p>
            </div>
          )}
        </TabsContent>

        {/* 保留中タブ */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <div className="flex">
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">保留中の予約</p>
                    <p className="mt-1">
                      保留中の予約リクエストがあります。承認またはキャンセルしてください。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-gray-700 text-sm">
                      <tr>
                        <th className="px-6 py-3 text-left">受講者</th>
                        <th className="px-6 py-3 text-left">レッスン</th>
                        <th className="px-6 py-3 text-left">日程</th>
                        <th className="px-6 py-3 text-left">リクエスト日</th>
                        <th className="px-6 py-3 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={
                                    booking.user.profile_image_url ||
                                    '/placeholder-avatar.jpg'
                                  }
                                  alt={booking.user.name}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">
                                  {booking.user.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.lesson.lesson_title}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm">
                                {formatDate(booking.lesson.date_time_start)}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm">
                                {new Date(
                                  booking.lesson.date_time_start
                                ).toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                -{' '}
                                {new Date(
                                  booking.lesson.date_time_end
                                ).toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {formatDate(booking.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-3">
                              <button
                                onClick={() =>
                                  handleUpdateBookingStatus(
                                    booking.id,
                                    'confirmed'
                                  )
                                }
                                disabled={updating}
                                className="text-green-500 hover:text-green-700"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateBookingStatus(
                                    booking.id,
                                    'cancelled'
                                  )
                                }
                                disabled={updating}
                                className="text-red-500 hover:text-red-700"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                              <Link
                                to={`/instructor/chat`}
                                className="text-gray-400 hover:text-blue-500"
                              >
                                <MessageSquare className="h-5 w-5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500">
                保留中の予約リクエストはありません
              </p>
            </div>
          )}
        </TabsContent>

        {/* 過去の予約タブ */}
        <TabsContent value="past" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">受講者</th>
                      <th className="px-6 py-3 text-left">レッスン</th>
                      <th className="px-6 py-3 text-left">日程</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={
                                  booking.user.profile_image_url ||
                                  '/placeholder-avatar.jpg'
                                }
                                alt={booking.user.name}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {booking.user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.lesson.lesson_title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(booking.lesson.date_time_start)}
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {new Date(
                                booking.lesson.date_time_start
                              ).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(
                                booking.lesson.date_time_end
                              ).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              booking.status
                            )}`}
                          >
                            {getStatusText(booking.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/instructor/chat`}
                            className="text-gray-400 hover:text-blue-500"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500">過去の予約はありません</p>
            </div>
          )}
        </TabsContent>

        {/* キャンセル済みタブ */}
        <TabsContent value="cancelled" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">受講者</th>
                      <th className="px-6 py-3 text-left">レッスン</th>
                      <th className="px-6 py-3 text-left">予定日</th>
                      <th className="px-6 py-3 text-left">キャンセル日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={
                                  booking.user.profile_image_url ||
                                  '/placeholder-avatar.jpg'
                                }
                                alt={booking.user.name}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {booking.user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.lesson.lesson_title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(booking.lesson.date_time_start)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-1 text-red-400" />
                            <span className="text-sm">
                              {formatDate(booking.updated_at)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500">キャンセルされた予約はありません</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorBookings;
