import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Calendar, Clock } from 'lucide-react';
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

interface ChatRoom {
  id: string;
  lesson_id: string;
  lesson: {
    lesson_title: string;
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
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
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
          
          // 一時メッセージを本物のメッセージに置き換える
          setMessages(prevMessages => {
            // 一時メッセージIDのパターン: temp-{timestamp}
            const withoutTemp = prevMessages.filter(msg => 
              // 同じユーザーが送った一時メッセージを削除（実際のメッセージに置き換え）
              !(msg.id.startsWith('temp-') && msg.sender_id === newMessage.sender_id)
            );
            return [...withoutTemp, newMessage];
          });
          
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

  // メッセージ変更時の自動スクロールを削除

  const fetchChatData = async () => {
    if (!id || !currentUserId) return;
    
    try {
      setLoading(true);

      // First fetch the chat room to get the student and lesson info
      const { data: chatRoomData, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          user:user_profiles!chat_rooms_user_id_fkey(id, name, profile_image_url),
          lesson:lesson_id(lesson_title)
        `)
        .eq('id', id)
        .single();

      if (chatRoomError) {
        console.error('Error fetching chat room:', chatRoomError);
        return;
      }

      if (chatRoomData) {
        if (chatRoomData.user) {
          setStudent(chatRoomData.user);
        }
        setChatRoom(chatRoomData);
      }

      // Fetch messages
      fetchMessages();
      
      // Mark all unread messages as read for this instructor
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_room_id', id)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);
        
      if (unreadError) {
        console.error('Error fetching unread messages:', unreadError);
      } else if (unreadMessages && unreadMessages.length > 0) {
        console.log(`Marking ${unreadMessages.length} messages as read in room ${id} for instructor`);
        const unreadIds = unreadMessages.map(msg => msg.id);
        
        // メッセージを既読に更新
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unreadIds);
          
        if (updateError) {
          console.error('Error marking messages as read:', updateError);
        } else {
          console.log('Messages marked as read successfully');
        }
      }

    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
      // 最新メッセージが見えるようにスクロール
      setTimeout(() => scrollToBottom(), 100);
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
        .order('created_at', { ascending: true })
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
      
      if (!loadMore) {
        // 初回読み込み時のみ最新メッセージが見えるようにスクロール
        setTimeout(() => scrollToBottom(), 100);
      }
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

      // Transform the data to match the Booking interface
      const formattedBookings = (data || []).map(booking => ({
        id: booking.id,
        lesson: Array.isArray(booking.lesson) 
          ? booking.lesson[0] // If it's an array, get the first item
          : booking.lesson    // Otherwise use as is
      }));

      setRelatedBookings(formattedBookings);
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
      
      const msgText = messageText.trim();
      
      // 送信前に一時的にメッセージを表示する（楽観的UI更新）
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chat_room_id: id,
        sender_id: currentUserId,
        message: msgText,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // 一時的にメッセージリストに追加
      setMessages(prev => [...prev, tempMessage]);
      
      // メッセージ入力をクリア（UI応答性向上のために先にクリア）
      setMessageText('');
      
      // 新規メッセージ送信時のみスクロール実行
      setTimeout(() => scrollToBottom(), 100);
      
      // メッセージを送信するときに正しいフィールド名を使用
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: id,
          sender_id: currentUserId,
          message: msgText,
          is_read: false
        });
        
      if (error) {
        console.error('Error sending message:', error);
        // エラー時はメッセージリストから一時メッセージを削除
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
        return;
      }
      
      // ページをリロードして最新状態に更新
      window.location.reload();
      
    } catch (error) {
      console.error('Error:', error);
      // エラー時はメッセージリストから一時メッセージを削除
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
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
      const d = new Date(message.created_at);
      const dateStr = d.toDateString(); // 日付の比較用に標準形式を使用
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(message);
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
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}年${month}月${day}日`;
    }
  };

  const renderMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
                {chatRoom?.lesson && (
                  <p className="text-xs text-gray-600">{chatRoom.lesson.lesson_title}</p>
                )}
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
                        {(() => {
                          const d = new Date(booking.lesson.date_time_start);
                          const hours = d.getHours().toString().padStart(2, '0');
                          const minutes = d.getMinutes().toString().padStart(2, '0');
                          return `${hours}:${minutes}`;
                        })()}
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