import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

type ChatRoom = {
  id: string;
  lesson_id: string;
  instructor_id: string;
  user_id: string;
  created_at: string;
  lesson: {
    lesson_title: string;
  };
  instructor: {
    name: string;
    profile_image_url: string | null;
  };
  last_message?: {
    message: string;
    created_at: string;
    is_read: boolean;
    sender_id: string;
  };
  unread_count: number;
};

const UserChat = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        
        // Fetch chat rooms with lesson and instructor details
        const { data: roomsData, error: roomsError } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            lesson:lesson_id(lesson_title),
            instructor:instructor_id(
              id,
              profile_image_url,
              name
            )
          `)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
          
        if (roomsError) throw roomsError;
        
        // Fetch last message and unread count for each chat room
        const roomsWithMessages = await Promise.all(
          roomsData.map(async (room: any) => {
            // Get last message
            const { data: messagesData, error: messagesError } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('chat_room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (messagesError) throw messagesError;
            
            // Get unread count
            const { count, error: countError } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_room_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', currentUser.id);
              
            if (countError) throw countError;
            
            return {
              ...room,
              last_message: messagesData[0] || null,
              unread_count: count || 0
            };
          })
        );
        
        // 最新のメッセージでソート
        roomsWithMessages.sort((a, b) => {
          const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
          const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
          return timeB - timeA; // 降順
        });
        
        setChatRooms(roomsWithMessages);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatRooms();
    
    // Setup real-time listener for new messages
    const subscription = supabase
      .channel('chat_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages'
        }, 
        (payload) => {
          // Update chat rooms when new message is received
          setChatRooms(prevRooms => {
            return prevRooms.map(room => {
              if (room.id === payload.new.chat_room_id) {
                // Type-safe approach for last_message
                const typedLastMessage = {
                  message: payload.new.message || '',
                  created_at: payload.new.created_at || '',
                  is_read: Boolean(payload.new.is_read),
                  sender_id: payload.new.sender_id || ''
                };
                
                return {
                  ...room,
                  last_message: typedLastMessage,
                  unread_count: payload.new.sender_id !== currentUser?.id 
                    ? room.unread_count + 1 
                    : room.unread_count
                };
              }
              return room;
            });
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUser?.id]);

  // Format timestamp to human-readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // 日付の差を計算
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (24 * 60 * 60 * 1000));
    
    // 時間のフォーマット（日本時間）
    const formatTimeOnly = (d: Date) => {
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
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
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">メッセージ</h1>
      
      {chatRooms.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {chatRooms.map((room) => (
              <li key={room.id}>
                <Link 
                  to={`/user/chat/${room.id}`} 
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="flex p-4">
                    <div className="mr-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                          {room.instructor?.profile_image_url ? (
                            <img 
                              src={room.instructor.profile_image_url} 
                              alt={room.instructor.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-primary text-white">
                              {room.instructor?.name?.charAt(0) || 'I'}
                            </div>
                          )}
                        </div>
                        {room.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">{room.unread_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {room.instructor?.name}
                        </p>
                        {room.last_message && (
                          <p className="text-xs text-gray-500">
                            {formatTime(room.last_message.created_at)}
                          </p>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {room.lesson?.lesson_title}
                      </p>
                      
                      <p className={`text-sm truncate ${
                        room.unread_count > 0 && room.last_message?.sender_id !== currentUser?.id
                          ? 'font-medium text-gray-900'
                          : 'text-gray-500'
                      }`}>
                        {room.last_message 
                          ? (room.last_message.sender_id === currentUser?.id ? 'あなた: ' : '') + room.last_message.message
                          : 'メッセージはまだありません'}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">メッセージはまだありません</p>
          <p className="text-gray-500 text-sm mb-6">
            レッスン詳細ページから講師とチャットができます
          </p>
          <Link 
            to="/user/lessons" 
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors inline-block"
          >
            レッスンを探す
          </Link>
        </div>
      )}
    </div>
  );
};

export default UserChat;