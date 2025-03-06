import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type?: string;
  target_id?: string;
};

const UserNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Fetch notifications
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', 'desc');
          
        if (error) throw error;
        
        setNotifications(data || []);
        
        // Mark unread notifications as read
        const unreadIds = data
          .filter((notification: Notification) => !notification.is_read)
          .map((notification: Notification) => notification.id);
          
        if (unreadIds.length > 0) {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);
            
          // Update local state
          setNotifications(data.map((notification: Notification) => ({
            ...notification,
            is_read: true
          })));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);

  // Format date in a user-friendly way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // 日付の差を計算
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (24 * 60 * 60 * 1000));
    
    // 今日
    if (dayDiff === 0) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } 
    // 昨日
    else if (dayDiff === 1) {
      return '昨日 ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } 
    // 一昨日
    else if (dayDiff === 2) {
      return '一昨日 ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    // 2日前から7日前まで
    else if (dayDiff < 7) {
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return days[date.getDay()] + '曜日';
    } 
    // それ以前
    else {
      return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date);
    }
  };
  
  // 通知をクリックしたときの処理
  const handleNotificationClick = (notification: Notification) => {
    // 通知タイプと対象IDがある場合のみリダイレクト
    if (notification.notification_type && notification.target_id) {
      // 通知タイプに応じて遷移先を決定
      switch (notification.notification_type) {
        case 'booking':
        case 'booking_confirmation':
        case 'booking_cancellation':
          navigate('/user/bookings');
          break;
        case 'chat_message':
          navigate(`/user/chat/${notification.target_id}`);
          break;
        case 'lesson_update':
          navigate(`/user/lessons/${notification.target_id}`);
          break;
        case 'favorite':
          navigate('/user/favorites');
          break;
        case 'profile':
          navigate('/user/profile');
          break;
        default:
          // デフォルトはそのまま通知一覧
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">お知らせ</h1>
      
      {notifications.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-3 h-3 rounded-full ${!notification.is_read ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between">
                      <p className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    
                    <p className={`mt-1 ${!notification.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                    
                    {notification.notification_type && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {notification.notification_type === 'booking' ? '予約' :
                           notification.notification_type === 'booking_confirmation' ? '予約確定' :
                           notification.notification_type === 'booking_cancellation' ? '予約キャンセル' :
                           notification.notification_type === 'chat_message' ? 'メッセージ' :
                           notification.notification_type === 'lesson_update' ? 'レッスン更新' :
                           notification.notification_type === 'favorite' ? 'お気に入り' :
                           notification.notification_type === 'profile' ? 'プロフィール' :
                           'お知らせ'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">お知らせはありません</p>
        </div>
      )}
    </div>
  );
};

export default UserNotifications;