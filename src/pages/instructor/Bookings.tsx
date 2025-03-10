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
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { formatISODateDisplay, formatISOTimeDisplay } from '@/lib/utils';

interface Booking {
  id: string;
  user_id: string;
  lesson_id: string;
  slot_id: string;
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
    price: number;
    status: string;
    instructor_id: string;
  };
  slot: {
    id: string;
    date_time_start: string;
    date_time_end: string;
    current_participants_count?: number;
  };
}

// Helper function to group bookings by date - 直接データベースの日付を使用
const groupBookingsByDate = (bookings: Booking[]) => {
  const grouped: Record<string, Booking[]> = {};
  
  bookings.forEach(booking => {
    if (booking.slot) {
      // データベースそのままの日付文字列から日付部分のみを取得
      const dateStr = booking.slot.date_time_start.split('T')[0];
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(booking);
    }
  });
  
  return grouped;
};

const InstructorBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [updating, setUpdating] = useState(false);
  
  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCalendarHovered, setIsCalendarHovered] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);
  
  // Reset selected date when changing tabs
  useEffect(() => {
    setSelectedDate(null);
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
            lesson:lessons!lesson_id(
              lesson_title,
              price,
              status,
              instructor_id
            ),
            slot:lesson_slots!slot_id(
              id,
              date_time_start,
              date_time_end,
              current_participants_count
            )
          `
        )
        .filter('lesson.instructor_id', 'eq', user.id);

      const now = new Date().toISOString();

      // タブに応じてフィルタリングとソートを切り替える
      if (activeTab === 'upcoming') {
        query = query
          .in('status', ['pending', 'confirmed'])
          .gt('slot.date_time_start', now)
          .order('date_time_start', { ascending: true, foreignTable: 'slot' });
      } else if (activeTab === 'pending') {
        query = query
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
      } else if (activeTab === 'past') {
        query = query
          .in('status', ['confirmed', 'completed', 'cancelled'])
          .lt('slot.date_time_start', now)
          .order('date_time_start', { ascending: false, foreignTable: 'slot' });
      } else if (activeTab === 'cancelled') {
        query = query
          .eq('status', 'cancelled')
          .order('updated_at', { ascending: false });
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
    status: 'confirmed' | 'cancelled',
    slotId: string
  ) => {
    try {
      setUpdating(true);

      // 予約ステータスを更新
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

      // ローカルの予約ステータスを更新
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
        )
      );

      // 予約枠の最新データを取得して表示を更新（トリガーで更新された参加者数も反映される）
      const { data: updatedSlotData, error: slotError } = await supabase
        .from('lesson_slots')
        .select('current_participants_count')
        .eq('id', slotId)
        .single();
        
      if (slotError) {
        console.error('Error fetching updated slot data:', slotError);
      } else if (updatedSlotData) {
        // 同じスロットを持つ他の予約の表示も更新
        setBookings(prevBookings => 
          prevBookings.map(booking => {
            if (booking.slot?.id === slotId) {
              return {
                ...booking,
                slot: {
                  ...booking.slot,
                  current_participants_count: updatedSlotData.current_participants_count
                }
              };
            }
            return booking;
          })
        );
      }

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
  
  // 予約に関連するチャットルームに移動する関数
  const handleChatNavigation = async (booking: Booking) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // 特定の予約に紐づくチャットルームを検索
      // レッスンIDも指定して一意のチャットルームを検索
      const { data: chatRooms, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('instructor_id', user.id)
        .eq('lesson_id', booking.lesson_id);  // レッスンIDも絞り込み条件に追加

      if (chatRoomError) {
        console.error('Error finding chat room:', chatRoomError);
        return;
      }

      if (chatRooms && chatRooms.length > 0) {
        // レッスンに紐づくチャットルームが見つかった場合
        window.location.href = `/instructor/chat/${chatRooms[0].id}`;
      } else {
        // レッスン固有のチャットルームがない場合は、レッスンIDを指定せずに検索
        const { data: generalChatRooms, error: generalError } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('user_id', booking.user_id)
          .eq('instructor_id', user.id)
          .is('lesson_id', null);  // lesson_idがnullのチャットルームを検索

        if (generalError) {
          console.error('Error finding general chat room:', generalError);
        } else if (generalChatRooms && generalChatRooms.length > 0) {
          // 一般的なチャットルームが見つかった場合
          window.location.href = `/instructor/chat/${generalChatRooms[0].id}`;
          return;
        }

        // チャットルームが見つからない場合は新規作成
        const { data: newChatRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            instructor_id: user.id,
            user_id: booking.user_id,
            lesson_id: booking.lesson_id  // レッスンIDを指定して作成
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating chat room:', createError);
          return;
        }

        window.location.href = `/instructor/chat/${newChatRoom.id}`;
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
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

  // カレンダー関連の関数
  // 月の日数を取得
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 月の最初の日の曜日を取得 (0 = 日曜日, 6 = 土曜日)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // 前月へ移動
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  // 次月へ移動
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // 日付クリックハンドラ
  const handleDateClick = (dateStr: string, hasBookings: boolean) => {
    if (!hasBookings) return;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  // データベースの日時文字列をそのまま使用するので不要になりました
  // 元々の時間フォーマット関数を削除

  // カレンダーを生成
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // 予約を日付でグループ化
    const bookingsByDate = groupBookingsByDate(filteredBookings);
    
    // カレンダーの日を作成
    const days = [];
    
    // 月の最初の日の前の空白セルを追加
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 w-12"></div>);
    }
    
    // 月の各日のセルを追加
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      
      // ISO形式の日付文字列を作成（YYYY-MM-DD）
      const isoYear = dateObj.getFullYear();
      const isoMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const isoDay = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${isoYear}-${isoMonth}-${isoDay}`;
      
      const hasBookings = bookingsByDate[dateStr] && bookingsByDate[dateStr].length > 0;
      const bookingsCount = hasBookings ? bookingsByDate[dateStr].length : 0;
      const isSelected = selectedDate === dateStr;
      
      const today = new Date();
      const isToday = today.getFullYear() === isoYear && 
                      today.getMonth() === month && 
                      today.getDate() === d;
      
      days.push(
        <div
          key={d}
          onClick={() => handleDateClick(dateStr, hasBookings)}
          className={`h-12 w-12 flex flex-col items-center justify-center rounded-lg relative
            transition-all duration-200 ease-in-out
            ${isSelected ? 'bg-primary text-white shadow-lg scale-110 z-10' : ''}
            ${isToday && !isSelected ? 'border-2 border-primary text-primary font-bold' : ''}
            ${hasBookings && !isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
            ${hasBookings ? 'cursor-pointer font-medium' : 'text-gray-500 cursor-default'}`}
          style={{
            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <span className={`text-sm ${isSelected ? 'font-bold' : ''}`}>{d}</span>
          
          {hasBookings && (
            <div 
              className={`absolute -bottom-2 flex items-center justify-center
                ${isSelected ? 'bg-white text-primary' : 'bg-primary text-white'}
                rounded-full px-2 py-0.5 text-xs font-bold shadow-md min-w-6 
                transform transition-all duration-200 ease-in-out
                ${isCalendarHovered ? 'scale-110' : ''}`}
            >
              <Users className="h-3 w-3 mr-0.5" />
              {bookingsCount}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  // 選択された日付の予約を表示
  const renderSelectedDateBookings = () => {
    if (!selectedDate) return null;
    
    const bookingsByDate = groupBookingsByDate(filteredBookings);
    const dateBookings = bookingsByDate[selectedDate] || [];
    
    if (dateBookings.length === 0) return null;
    
    // 選択された日付の予約をレッスンとスロットごとにグループ化
    const bookingsByLessonAndSlot: Record<string, {
      lessonTitle: string,
      slots: Record<string, {
        slotInfo: {
          id: string;
          date_time_start: string;
          date_time_end: string;
        },
        bookings: Booking[]
      }>
    }> = {};
    
    dateBookings.forEach(booking => {
      const lessonId = booking.lesson_id;
      const slotId = booking.slot.id;
      
      if (!bookingsByLessonAndSlot[lessonId]) {
        bookingsByLessonAndSlot[lessonId] = {
          lessonTitle: booking.lesson.lesson_title,
          slots: {}
        };
      }
      
      if (!bookingsByLessonAndSlot[lessonId].slots[slotId]) {
        bookingsByLessonAndSlot[lessonId].slots[slotId] = {
          slotInfo: {
            id: booking.slot.id,
            date_time_start: booking.slot.date_time_start,
            date_time_end: booking.slot.date_time_end
          },
          bookings: []
        };
      }
      
      bookingsByLessonAndSlot[lessonId].slots[slotId].bookings.push(booking);
    });
    
    // 選択された日付（YYYY-MM-DD）を分解して表示用に整形
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    // 曜日の取得だけのために日付オブジェクトを作成
    const d = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    const formattedDate = `${year}年${month}月${day}日(${weekday})`;
    
    return (
      <div className="bg-white rounded-lg shadow-lg border h-full">
        {/* 固定ヘッダー部分 */}
        <div className="sticky top-0 bg-white z-10 p-6 pb-3 border-b">
          <h3 className="text-xl font-bold text-primary flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {formattedDate}の予約一覧
            <span className="ml-2 bg-primary text-white text-sm rounded-full px-3 py-1 font-bold">
              {dateBookings.length}件
            </span>
          </h3>
        </div>
        
        {/* スクロール可能なコンテンツ部分 */}
          {Object.entries(bookingsByLessonAndSlot).map(([lessonId, lessonData]) => (
            <div key={lessonId} className="border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow bg-white">
              <h4 className="font-bold text-lg mb-4 pb-2 border-b flex items-center text-gray-800">
                <span className="w-2 h-6 bg-primary rounded-full mr-2"></span>
                {lessonData.lessonTitle}
              </h4>
              
              <div className="space-y-5">
                {Object.values(lessonData.slots).map(({slotInfo, bookings}) => (
                  <div key={slotInfo.id} className="border-l-4 border-primary/60 bg-blue-50/50 rounded-r-lg pl-4 py-3 pr-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        {formatISOTimeDisplay(slotInfo.date_time_start)} - {formatISOTimeDisplay(slotInfo.date_time_end)}
                      </div>
                      <div className="text-sm bg-primary/10 text-primary font-bold px-3 py-1 rounded-full flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        受講者数: {bookings.length}名
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      {bookings.map(booking => (
                        <div 
                          key={booking.id} 
                          className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition-all"
                        >
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover border-2 border-gray-100"
                                src={booking.user.profile_image_url || '/placeholder-avatar.jpg'}
                                alt={booking.user.name}
                              />
                            </div>
                            <div className="ml-3">
                              <div className="font-medium">{booking.user.name}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                booking.status
                              )}`}
                            >
                              {getStatusText(booking.status)}
                            </span>
                            
                            <div className="flex space-x-3">
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(
                                      booking.id,
                                      'confirmed',
                                      booking.slot?.id || ''
                                    )}
                                    disabled={updating}
                                    className="text-gray-400 hover:text-green-500 transition-colors p-1 hover:bg-green-50 rounded-full"
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(
                                      booking.id,
                                      'cancelled',
                                      booking.slot?.id || ''
                                    )}
                                    disabled={updating}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full"
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleChatNavigation(booking)}
                                className="text-gray-400 hover:text-blue-500 transition-colors p-1 hover:bg-blue-50 rounded-full"
                              >
                                <MessageSquare className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">予約管理</h1>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="p-1 bg-gray-100">
            <TabsTrigger value="upcoming" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">予定の予約</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">保留中</TabsTrigger>
            <TabsTrigger value="past" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">過去の予約</TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">キャンセル済み</TabsTrigger>
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

        {!loading && filteredBookings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側：カレンダー */}
            <div 
              className="bg-white p-6 rounded-lg shadow-lg border transition-all duration-300 hover:shadow-xl h-fit"
              onMouseEnter={() => setIsCalendarHovered(true)}
              onMouseLeave={() => setIsCalendarHovered(false)}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="前月"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="次月"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-3 mb-4">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                  <div key={day} className={`h-8 flex items-center justify-center text-sm font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-3">
                {renderCalendar()}
              </div>
              
              <div className="mt-4 flex items-center justify-end text-sm text-gray-600">
                <div className="flex items-center mr-4">
                  <div className="w-3 h-3 bg-blue-50 rounded-sm mr-1"></div>
                  <span>予約あり</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-sm mr-1"></div>
                  <span>選択中</span>
                </div>
              </div>
            </div>
            
            {/* 右側：選択された日付の予約詳細（スクロール可能） */}
            <div className="flex-1 h-[calc(100vh-24rem)] min-h-[500px]">
              {selectedDate ? (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar bg-gray-50">
                  {renderSelectedDateBookings()}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-lg border h-full flex flex-col items-center justify-center text-gray-500">
                  <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg">日付を選択して予約詳細を表示</p>
                  <p className="text-sm mt-2">カレンダーから予約のある日付をクリックしてください</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        
        {!loading && filteredBookings.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">予約はありません</h3>
            <p className="text-gray-500">
              {activeTab === 'upcoming' ? '今後の予約はありません。' : 
               activeTab === 'pending' ? '保留中の予約はありません。' :
               activeTab === 'past' ? '過去の予約はありません。' : 'キャンセル済みの予約はありません。'}
            </p>
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default InstructorBookings;