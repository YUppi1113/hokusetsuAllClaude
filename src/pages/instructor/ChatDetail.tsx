import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Calendar, Clock, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message: string; // Changed from content to match database
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  profile_image_url: string;
}

interface Booking {
  id: string;
  lesson: {
    id: string;
    lesson_title: string;
    date_time_start: string;
  };
}

const InstructorChatDetail = () => {
  const { id } = useParams<{ id: string }>();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [student, setStudent] = useState<ChatUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [relatedBookings, setRelatedBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  useEffect(() => {
    if (id && currentUserId) {
      fetchChatData();
      fetchRelatedBookings();

      // Set up real-time subscription for new messages with a unique channel name
      const channelName = `chat_messages_${id}_${Date.now()}`;
      const messageSubscription = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${id}`,
        }, (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prevMessages => [...prevMessages, newMessage]);
          
          // Mark received messages as read if they weren't sent by the current user
          if (newMessage.sender_id !== currentUserId) {
            markMessageAsRead(newMessage.id);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    }
  }, [id, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatData = async () => {
    if (!id || !currentUserId) return;
    
    try {
      setLoading(true);

      // First fetch the chat room to get the student
      const { data: chatRoom, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          user:user_profiles!chat_rooms_user_id_fkey(id, name, profile_image_url)
        `)
        .eq('id', id)
        .single();

      if (chatRoomError) {
        console.error('Error fetching chat room:', chatRoomError);
        return;
      }

      if (chatRoom && chatRoom.user) {
        setStudent(chatRoom.user);
      }

      // Fetch messages
      fetchMessages();
      
      // Mark all unread messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_room_id', id)
        .eq('sender_type', 'user')
        .eq('is_read', false);

    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (loadMore = false) => {
    if (!id) return;

    try {
      const newPage = loadMore ? page + 1 : 0;
      
      if (loadMore) {
        setLoadingMore(true);
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_room_id', id)
        .order('created_at', 'asc')
        .range(newPage * pageSize, (newPage + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setHasMore(data.length === pageSize);
      setPage(newPage);
      
      if (loadMore) {
        setMessages(prevMessages => [...prevMessages, ...data]);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchRelatedBookings = async () => {
    if (!id || !currentUserId) return;

    try {
      // Get the chat room to find the user_id
      const { data: chatRoom } = await supabase
        .from('chat_rooms')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!chatRoom) return;

      // Get bookings for lessons by this instructor that were booked by this user
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          lesson:lessons(id, lesson_title, date_time_start)
        `)
        .eq('user_id', chatRoom.user_id)
        .eq('lesson.instructor_id', currentUserId)
        .order('lesson.date_time_start', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching related bookings:', error);
        return;
      }

      setRelatedBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const sendMessage = async () => {
    if (!id || !messageText.trim() || !currentUserId) return;
    
    try {
      setSending(true);
      
      // メッセージを送信するときに正しいフィールド名を使用 - sender_typeはデータベースにないので削除
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: id,
          sender_id: currentUserId,
          message: messageText.trim(),  // 'content' から 'message' に変更
          is_read: false
        });
        
      if (error) {
        console.error('Error sending message:', error);
        return;
      }
      
      // Note: Update only if these columns exist in your database
      /* uncomment if you have these columns:
      await supabase
        .from('chat_rooms')
        .update({
          last_message: messageText.trim(),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', id);
      */
      
      setMessageText('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString('ja-JP');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return formatDate(dateStr);
    }
  };

  const renderMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center bg-white p-4 border-b">
        <div className="flex items-center">
          <Link to="/instructor/chat" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {student && (
            <div className="flex items-center">
              <img
                src={student.profile_image_url || '/placeholder-avatar.jpg'}
                alt={student.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="ml-3">
                <h2 className="text-sm font-medium text-gray-900">{student.name}</h2>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {hasMore && (
            <div className="text-center mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchMessages(true)}
                disabled={loadingMore}
              >
                {loadingMore ? 'メッセージを読み込み中...' : '過去のメッセージを読み込む'}
              </Button>
            </div>
          )}
          
          {Object.keys(messageGroups).map(date => (
            <div key={date}>
              <div className="flex justify-center my-4">
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {formatMessageDate(date)}
                </span>
              </div>
              
              {messageGroups[date].map(message => (
                <div 
                  key={message.id}
                  className={`flex mb-4 ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender_id !== currentUserId && student && (
                    <img
                      src={student.profile_image_url || '/placeholder-avatar.jpg'}
                      alt={student.name}
                      className="h-8 w-8 rounded-full object-cover mr-2 self-end"
                    />
                  )}
                  
                  <div className="flex flex-col max-w-[70%]">
                    <div 
                      className={`rounded-2xl p-3 inline-block ${
                        message.sender_id === currentUserId 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-white border rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                    <span className={`text-xs text-gray-500 mt-1 ${message.sender_id === currentUserId ? 'text-right' : 'text-left'}`}>
                      {renderMessageTime(message.created_at)}
                      {message.sender_id === currentUserId && (
                        <span className="ml-1">{message.is_read ? '既読' : '未読'}</span>
                      )}
                    </span>
                  </div>
                  
                  {message.sender_id === currentUserId && (
                    <div className="h-8 w-8 ml-2"></div> // Placeholder for alignment
                  )}
                </div>
              ))}
            </div>
          ))}
          
          <div ref={messageEndRef} />
        </div>
        
        {relatedBookings.length > 0 && (
          <div className="w-72 border-l bg-white p-4 overflow-y-auto hidden md:block">
            <h3 className="font-medium text-sm text-gray-900 mb-3">関連情報</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">予約済みレッスン</h4>
                {relatedBookings.map(booking => (
                  <div key={booking.id} className="bg-gray-50 rounded-md p-3 text-sm">
                    <p className="font-medium text-gray-900">{booking.lesson.lesson_title}</p>
                    <div className="flex items-center mt-1 text-gray-500 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(booking.lesson.date_time_start)}</span>
                    </div>
                    <div className="flex items-center mt-1 text-gray-500 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>
                        {new Date(booking.lesson.date_time_start).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white border-t p-4">
        <div className="flex items-center">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1"
            disabled={sending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!messageText.trim() || sending}
            className="ml-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstructorChatDetail;