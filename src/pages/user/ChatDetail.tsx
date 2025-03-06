import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ChatRoomDetails = {
  id: string;
  lesson_id: string;
  instructor_id: string;
  user_id: string;
  created_at: string;
  lesson: {
    id: string;
    lesson_title: string;
  };
  instructor: {
    id: string;
    name: string;
    profile_image_url: string | null;
  };
};

const UserChatDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<ChatRoomDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!id || !currentUser) return;
    
    const fetchChatRoom = async () => {
      try {
        setLoading(true);
        
        // Fetch chat room details
        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            lesson:lesson_id(id, lesson_title),
            instructor:instructor_profiles!instructor_id(id, name, profile_image_url)
          `)
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .single();
          
        if (roomError) throw roomError;
        setChatRoom(roomData);
        
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_room_id', id)
          .order('created_at', 'asc');
          
        if (messagesError) throw messagesError;
        setMessages(messagesData || []);
        
        // Mark messages as read
        if (messagesData && messagesData.length > 0) {
          const unreadMessages = messagesData.filter(
            msg => !msg.is_read && msg.sender_id !== currentUser.id
          );
          
          if (unreadMessages.length > 0) {
            const unreadIds = unreadMessages.map(msg => msg.id);
            
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .in('id', unreadIds);
          }
        }
      } catch (error) {
        console.error('Error fetching chat room:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatRoom();
    
    // Setup real-time listener for new messages
    const channelName = `chat_room_${id}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `chat_room_id=eq.${id}`
        }, 
        async (payload) => {
          // Add new message to state
          setMessages(prev => [...prev, payload.new as Message]);
          
          // Mark message as read if it's from the instructor
          if (payload.new.sender_id !== currentUser.id) {
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, currentUser?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !id || !currentUser) return;
    
    try {
      setSending(true);
      
      // Insert new message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_room_id: id,
          sender_id: currentUser.id,
          message: newMessage.trim(),
          is_read: false
        });
        
      if (error) throw error;
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Format date for messages
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          messages: [message]
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">チャットが見つかりません</h1>
          <p className="text-gray-500 mb-6">
            お探しのチャットは存在しないか、アクセス権がありません。
          </p>
          <Link
            to="/user/chat"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            メッセージ一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/user/chat" className="text-primary hover:underline flex items-center mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          メッセージ一覧に戻る
        </Link>
        
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-4">
            {chatRoom.instructor?.profile_image_url ? (
              <img 
                src={chatRoom.instructor.profile_image_url} 
                alt={chatRoom.instructor.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-primary text-white">
                {chatRoom.instructor?.name?.charAt(0) || 'I'}
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-xl font-semibold">{chatRoom.instructor?.name}</h1>
            <p className="text-sm text-gray-600">{chatRoom.lesson?.lesson_title}</p>
          </div>
          
          <div className="ml-auto">
            <Link
              to={`/user/lessons/${chatRoom.lesson_id}`}
              className="text-sm text-primary hover:underline"
            >
              レッスン詳細を見る
            </Link>
          </div>
        </div>
      </div>
      
      {/* Chat container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Messages */}
        <div className="h-[60vh] overflow-y-auto p-4 bg-gray-50">
          {groupMessagesByDate().map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
                  {new Date(group.date).toLocaleDateString()}
                </div>
              </div>
              
              {group.messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUser?.id;
                
                return (
                  <div 
                    key={message.id} 
                    className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-2 flex-shrink-0">
                        {chatRoom.instructor?.profile_image_url ? (
                          <img 
                            src={chatRoom.instructor.profile_image_url} 
                            alt={chatRoom.instructor.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-primary text-white text-xs">
                            {chatRoom.instructor?.name?.charAt(0) || 'I'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[70%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                      <div 
                        className={`px-4 py-2 rounded-lg ${
                          isCurrentUser 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-gray-200 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        {formatMessageDate(message.created_at)}
                        {isCurrentUser && (
                          <span className="ml-1">
                            {message.is_read ? ' • 既読' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`px-4 py-2 bg-primary text-white rounded-r-md ${
                !newMessage.trim() || sending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
              } transition-colors`}
            >
              {sending ? '送信中...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserChatDetail;