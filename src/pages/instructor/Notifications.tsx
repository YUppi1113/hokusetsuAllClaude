import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare,
  CalendarClock,
  User,
  Heart,
  Star,
  Bell,
  // Check,
  DollarSign,
} from 'lucide-react';
// import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string; // Changed from 'content' to match DB schema
  type?: string; // Made optional since it's not in DB schema
  is_read: boolean;
  entity_type?: string; // Made optional since it's not in DB schema
  entity_id?: string; // Made optional since it's not in DB schema
  created_at: string;
}

const InstructorNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get all notifications for the instructor
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);

      // Mark fetched notifications as read
      const unreadIds = data
        ?.filter(notification => !notification.is_read)
        .map(notification => notification.id) || [];

      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type?: string) => {
    if (!type) return <Bell className="h-6 w-6 text-gray-500" />;
    
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <CalendarClock className="h-6 w-6 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-6 w-6 text-green-500" />;
      case 'review':
        return <Star className="h-6 w-6 text-yellow-500" />;
      case 'favorite':
        return <Heart className="h-6 w-6 text-red-500" />;
      case 'payment':
        return <DollarSign className="h-6 w-6 text-emerald-500" />;
      case 'new_student':
        return <User className="h-6 w-6 text-purple-500" />;
      default:
        return <Bell className="h-6 w-6 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    // Since type might not exist in the notification object, provide a default
    const type = notification.type || '';
    
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return `/instructor/bookings`;
      case 'message':
        return notification.entity_id 
          ? `/instructor/chat/${notification.entity_id}`
          : `/instructor/chat`;
      case 'review':
        return `/instructor/lessons`;
      case 'payment':
        return `/instructor/bookings`;
      default:
        return '#';
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // 日付の差を計算
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (24 * 60 * 60 * 1000));
    
    // 時間フォーマット関数
    const formatTimeOnly = (d: Date) => {
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const minutes = d.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    // 今日
    if (dayDiff === 0) {
      return formatTimeOnly(date);
    } 
    // 昨日
    else if (dayDiff === 1) {
      return '昨日 ' + formatTimeOnly(date);
    } 
    // 一昨日
    else if (dayDiff === 2) {
      return '一昨日 ' + formatTimeOnly(date);
    }
    // 2日前から7日前まで
    else if (dayDiff < 7) {
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return days[date.getDay()] + '曜日';
    } 
    // それ以前
    else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">通知</h1>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">通知はありません</h3>
          <p className="mt-2 text-gray-500">
            新しい通知が届いたら、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              to={getNotificationLink(notification)}
              className={`block p-4 hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-gray-100 rounded-full p-2">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h3 className={`text-sm font-medium ${!notification.is_read ? 'text-blue-800' : 'text-gray-900'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500">{formatNotificationTime(notification.created_at)}</span>
                  </div>
                  <p className={`mt-1 text-sm ${!notification.is_read ? 'text-blue-700' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="ml-3 bg-blue-500 rounded-full w-2 h-2"></div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorNotifications;