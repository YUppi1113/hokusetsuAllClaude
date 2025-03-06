import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ChatRoom {
  id: string;
  instructor_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  user: {
    id: string;
    name: string;
    profile_image_url: string;
  };
}

const InstructorChat = () => {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (currentUser) {
      fetchChatRooms();
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel('instructor_chat_messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages'
          }, 
          (payload) => {
            // Check if the new message belongs to one of our rooms
            const newMessageRoomId = payload.new.chat_room_id;
            
            // Update chat rooms when new message is received
            setChatRooms(prevRooms => {
              // Check if this message belongs to one of our rooms
              const roomIndex = prevRooms.findIndex(room => room.id === newMessageRoomId);
              if (roomIndex === -1) return prevRooms; // Not our room
              
              // Create updated rooms list
              const updatedRooms = [...prevRooms];
              const room = updatedRooms[roomIndex];
              
              // Update the room with new message info
              updatedRooms[roomIndex] = {
                ...room,
                last_message: payload.new.message,
                last_message_at: payload.new.created_at,
                unread_count: payload.new.sender_id !== currentUser.id 
                  ? (room.unread_count || 0) + 1 
                  : room.unread_count || 0
              };
              
              // Remove from current position
              updatedRooms.splice(roomIndex, 1);
              // Add to the top of the list
              updatedRooms.unshift(updatedRooms[roomIndex]);
              
              return updatedRooms;
            });
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [currentUser?.id]);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get all chat rooms for the instructor
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          user:user_id(
            id, 
            profile_image_url,
            name
          )
        `)
        .eq('instructor_id', currentUser.id)
        .order('created_at', 'desc');

      if (roomsError) {
        console.error('Error fetching chat rooms:', roomsError);
        return;
      }

      // Fetch last message and unread count for each chat room
      const roomsWithMessages = await Promise.all(
        (roomsData || []).map(async (room) => {
          // Get last message
          const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return room;
          }
          
          // Get unread count
          const { count, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_room_id', room.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id);
            
          if (countError) {
            console.error('Error counting unread messages:', countError);
            return {
              ...room,
              last_message: messagesData?.[0]?.message || '',
              last_message_at: messagesData?.[0]?.created_at || room.created_at,
              unread_count: 0
            };
          }
          
          return {
            ...room,
            last_message: messagesData?.[0]?.message || '',
            last_message_at: messagesData?.[0]?.created_at || room.created_at,
            unread_count: count || 0
          };
        })
      );
      
      // Sort by last message time
      roomsWithMessages.sort((a, b) => {
        const timeA = new Date(a.last_message_at || a.created_at).getTime();
        const timeB = new Date(b.last_message_at || b.created_at).getTime();
        return timeB - timeA; // 降順（最新が上）
      });
      
      setChatRooms(roomsWithMessages);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChatRooms = chatRooms.filter(room => {
    return room.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (room.last_message && room.last_message.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">メッセージ</h1>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="メッセージを検索..."
              className="pl-9 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredChatRooms.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredChatRooms.map((room) => (
              <Link key={room.id} to={`/instructor/chat/${room.id}`} className="block hover:bg-gray-50">
                <div className="p-4 flex items-center">
                  <div className="relative">
                    <img
                      src={room.user.profile_image_url || '/placeholder-avatar.jpg'}
                      alt={room.user.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    {room.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium text-gray-900 truncate">{room.user.name}</h2>
                      <p className="text-xs text-gray-500">{formatMessageTime(room.last_message_at)}</p>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">{room.last_message || 'メッセージなし'}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">メッセージはありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? '検索条件に一致するメッセージはありません'
                : '生徒からのメッセージはまだありません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorChat;