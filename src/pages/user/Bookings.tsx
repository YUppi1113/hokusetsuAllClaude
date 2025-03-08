import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

type BookingWithLesson = {
  id: string;
  lesson_id: string;
  user_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method: 'credit_card' | 'cash' | null;
  created_at: string;
  updated_at: string;
  lesson: {
    id: string;
    lesson_title: string;
    date_time_start: string;
    date_time_end: string;
    price: number;
    category: string;
    lesson_image_url: string[];
    instructor_id: string;
  };
  instructor: {
    id: string;
    name: string;
    profile_image_url: string | null;
  };
  chat_room: {
    id: string;
  } | null;
};

const UserBookings = () => {
  const [bookings, setBookings] = useState<BookingWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        console.log('🔍 開始: 予約情報の取得処理');
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 ユーザー情報:', user ? `ID: ${user.id}` : 'ユーザー情報なし');
        
        if (!user) {
          console.error('❌ エラー: ユーザー情報が取得できませんでした');
          return;
        }
        
        console.log('📊 予約情報のクエリを実行中...');
        // Fetch bookings with lesson and instructor details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            lesson:lessons!lesson_id(
              id, 
              lesson_title, 
              date_time_start, 
              date_time_end, 
              price, 
              category, 
              lesson_image_url,
              instructor_id
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        console.log('📊 レッスン情報の取得が完了しました:', data);
        
        // データが空でないか確認
        if (!data || data.length === 0) {
          console.log('📭 予約データがありません');
          setBookings([]);
          setLoading(false);
          return;
        }
        
        // インストラクターIDを抽出
        const instructorIds = data
          .map(booking => booking.lesson?.instructor_id)
          .filter(id => id); // nullやundefinedを除外
          
        console.log('👨‍🏫 検索対象のインストラクターID:', instructorIds);
        
        // インストラクター情報を取得
        const { data: instructorsData, error: instructorsError } = await supabase
          .from('instructor_profiles')
          .select('id, name, profile_image_url')
          .in('id', instructorIds);
          
        if (instructorsError) {
          console.error('❌ インストラクター情報取得エラー:', instructorsError);
        }
        
        console.log('👨‍🏫 取得したインストラクター情報:', instructorsData);
          
        if (error) {
          console.error('❌ 予約データ取得エラー:', error);
          throw error;
        }
        
        console.log('✅ 予約データ取得成功:', data ? `${data.length}件の予約が見つかりました` : '予約データなし');
        
        // 予約データとインストラクター情報を統合
        let transformedData = data.map((booking: any) => {
          // 対応するインストラクターを見つける
          const instructorData = instructorsData?.find(
            instructor => instructor.id === booking.lesson?.instructor_id
          );
          
          console.log(`🔄 予約ID:${booking.id} のインストラクター情報マッピング:`, 
                     instructorData ? `${instructorData.name}(ID:${instructorData.id})` : '対応するインストラクターが見つかりません');
          
          // DBでは 'cancelled' (二重l) だが、フロントエンド側では 'canceled' (一重l) を使用
          const normalizedStatus = booking.status === 'cancelled' ? 'canceled' : booking.status;
          console.log(`🔄 予約ID:${booking.id} のステータス変換: ${booking.status} → ${normalizedStatus}`);
          
          return {
            ...booking,
            status: normalizedStatus,
            instructor: instructorData || null,
            chat_room: null // Initialize chat_room as null
          };
        });
        
        console.log('📋 変換後の予約データ:', transformedData);
        
        // Get all chat rooms for this user
        console.log('💬 チャットルーム情報取得中...');
        const { data: chatRoomsData, error: chatRoomsError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('user_id', user.id);
          
        if (chatRoomsError) {
          console.error('❌ チャットルーム取得エラー:', chatRoomsError);
        } else if (chatRoomsData) {
          console.log('✅ チャットルーム取得成功:', chatRoomsData ? `${chatRoomsData.length}件のチャットルームが見つかりました` : 'チャットルームなし');
          // Match chat rooms with bookings
          transformedData = transformedData.map(booking => {
            const matchingChatRoom = chatRoomsData.find(
              room => room.lesson_id === booking.lesson_id
            );
            console.log(`🔄 予約(${booking.id})にチャットルームをマッピング:`, matchingChatRoom ? `チャットルームID: ${matchingChatRoom.id}` : 'マッチするチャットルームなし');
            return {
              ...booking,
              chat_room: matchingChatRoom || null
            };
          });
        }
        
        console.log('🏁 最終的な予約データ:', transformedData);
        setBookings(transformedData);
      } catch (error) {
        console.error('❌ 予約取得処理中の重大エラー:', error);
      } finally {
        setLoading(false);
        console.log('🔍 終了: 予約情報の取得処理');
      }
    };
    
    fetchBookings();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-600';
      case 'paid':
        return 'bg-green-50 text-green-600';
      case 'refunded':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };
  
  const handleCancelBooking = async (bookingId: string) => {
    try {
      console.log('🔄 予約キャンセル処理開始:', bookingId);

      // DBのステータス値は 'cancelled' （テーブル定義参照）だが、
      // フロントエンドのステータスは 'canceled' で統一されているので変換する
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',  // 注意: DBでは 'cancelled' (二重l)
          updated_at: new Date().toISOString() // 更新日時も更新
        })
        .eq('id', bookingId);
        
      if (error) {
        console.error('❌ 予約キャンセルエラー:', error);
        throw error;
      }
      
      console.log('✅ 予約キャンセル成功:', bookingId);
      
      // 予約データを最新の状態にするため、データを再取得する
      alert('予約をキャンセルしました。');
      await fetchBookings();
    } catch (error) {
      console.error('Error canceling booking:', error);
      alert('予約のキャンセルに失敗しました。もう一度お試しください。');
    }
  };

  const isUpcoming = (dateTimeString: string) => {
    const lessonDate = new Date(dateTimeString);
    const currentDate = new Date();
    console.log(`⏱️ 日時比較: レッスン日時=${lessonDate.toISOString()}, 現在日時=${currentDate.toISOString()}, 結果=${lessonDate > currentDate}`);
    return lessonDate > currentDate;
  };
  
  // データ取得関数を追加
  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log('🔍 開始: 予約情報の取得処理');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 ユーザー情報:', user ? `ID: ${user.id}` : 'ユーザー情報なし');
      
      if (!user) {
        console.error('❌ エラー: ユーザー情報が取得できませんでした');
        return;
      }
      
      console.log('📊 予約情報のクエリを実行中...');
      // Fetch bookings with lesson and instructor details
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          lesson:lessons!lesson_id(
            id, 
            lesson_title, 
            date_time_start, 
            date_time_end, 
            price, 
            category, 
            lesson_image_url,
            instructor_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      console.log('📊 レッスン情報の取得が完了しました:', data);
      
      // データが空でないか確認
      if (!data || data.length === 0) {
        console.log('📭 予約データがありません');
        setBookings([]);
        setLoading(false);
        return;
      }
      
      // インストラクターIDを抽出
      const instructorIds = data
        .map(booking => booking.lesson?.instructor_id)
        .filter(id => id); // nullやundefinedを除外
        
      console.log('👨‍🏫 検索対象のインストラクターID:', instructorIds);
      
      // インストラクター情報を取得
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructor_profiles')
        .select('id, name, profile_image_url')
        .in('id', instructorIds);
        
      if (instructorsError) {
        console.error('❌ インストラクター情報取得エラー:', instructorsError);
      }
      
      console.log('👨‍🏫 取得したインストラクター情報:', instructorsData);
        
      if (error) {
        console.error('❌ 予約データ取得エラー:', error);
        throw error;
      }
      
      console.log('✅ 予約データ取得成功:', data ? `${data.length}件の予約が見つかりました` : '予約データなし');
      
      // 予約データとインストラクター情報を統合
      let transformedData = data.map((booking: any) => {
        // 対応するインストラクターを見つける
        const instructorData = instructorsData?.find(
          instructor => instructor.id === booking.lesson?.instructor_id
        );
        
        console.log(`🔄 予約ID:${booking.id} のインストラクター情報マッピング:`, 
                   instructorData ? `${instructorData.name}(ID:${instructorData.id})` : '対応するインストラクターが見つかりません');
        
        // DBでは 'cancelled' (二重l) だが、フロントエンド側では 'canceled' (一重l) を使用
        const normalizedStatus = booking.status === 'cancelled' ? 'canceled' : booking.status;
        console.log(`🔄 予約ID:${booking.id} のステータス変換: ${booking.status} → ${normalizedStatus}`);
        
        return {
          ...booking,
          status: normalizedStatus,
          instructor: instructorData || null,
          chat_room: null // Initialize chat_room as null
        };
      });
      
      console.log('📋 変換後の予約データ:', transformedData);
      
      // Get all chat rooms for this user
      console.log('💬 チャットルーム情報取得中...');
      const { data: chatRoomsData, error: chatRoomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('user_id', user.id);
        
      if (chatRoomsError) {
        console.error('❌ チャットルーム取得エラー:', chatRoomsError);
      } else if (chatRoomsData) {
        console.log('✅ チャットルーム取得成功:', chatRoomsData ? `${chatRoomsData.length}件のチャットルームが見つかりました` : 'チャットルームなし');
        // Match chat rooms with bookings
        transformedData = transformedData.map(booking => {
          const matchingChatRoom = chatRoomsData.find(
            room => room.lesson_id === booking.lesson_id
          );
          console.log(`🔄 予約(${booking.id})にチャットルームをマッピング:`, matchingChatRoom ? `チャットルームID: ${matchingChatRoom.id}` : 'マッチするチャットルームなし');
          return {
            ...booking,
            chat_room: matchingChatRoom || null
          };
        });
      }
      
      console.log('🏁 最終的な予約データ:', transformedData);
      setBookings(transformedData);
    } catch (error) {
      console.error('❌ 予約取得処理中の重大エラー:', error);
    } finally {
      setLoading(false);
      console.log('🔍 終了: 予約情報の取得処理');
    }
  };

  // 初回ロード時に予約情報を取得
  useEffect(() => {
    fetchBookings();
  }, []);
  
  // タブが切り替わったときに実行されるように、activeTabの変更を検知するuseEffect
  useEffect(() => {
    console.log('🔄 タブ切り替え検知 - 再フィルタリング:', activeTab);
  }, [activeTab]);

  console.log('🔍 予約フィルタリング開始 - アクティブタブ:', activeTab);
  console.log('📋 フィルタリング前の予約データ:', bookings);
  
  const filteredBookings = bookings.filter(booking => {
    // エラー処理: lesson情報が欠けている場合
    if (!booking.lesson || !booking.lesson.date_time_start) {
      console.error('❌ 予約データにlesson情報がありません:', booking);
      return false;
    }
    
    const isUpcomingLesson = isUpcoming(booking.lesson.date_time_start);
    // ステータスのチェック
    const isCanceled = booking.status === 'canceled';
    
    console.log(`🔄 予約ID: ${booking.id} - ${booking.lesson.lesson_title}:`);
    console.log(`   ⏱️ レッスン日時: ${new Date(booking.lesson.date_time_start).toLocaleString()}`);
    console.log(`   📊 ステータス: ${booking.status}, 今後のレッスン?: ${isUpcomingLesson}, キャンセル済み?: ${isCanceled}`);
    
    if (activeTab === 'upcoming') {
      // レッスン開始日時が現在より後のものは全て「今後のレッスン」タブに表示する（ステータスに関わらず）
      const shouldInclude = isUpcomingLesson;
      console.log(`   👉 「今後のレッスン」タブに表示: ${shouldInclude}`);
      return shouldInclude;
    } else {
      // レッスン開始日時が現在より前のものは全て「過去のレッスン」タブに表示する（ステータスに関わらず）
      const shouldInclude = !isUpcomingLesson;
      console.log(`   👉 「過去のレッスン」タブに表示: ${shouldInclude}`);
      return shouldInclude;
    }
  });
  
  console.log(`✅ フィルタリング結果: ${filteredBookings.length}件の予約が表示されます`);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">予約管理</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`pb-2 px-4 font-medium ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            console.log('🔄 タブ切り替え: 今後のレッスン');
            setActiveTab('upcoming');
          }}
        >
          今後のレッスン
          {/* 今後のレッスン数を表示 */}
          {bookings.filter(b => b.lesson && b.lesson.date_time_start && isUpcoming(b.lesson.date_time_start)).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              {bookings.filter(b => b.lesson && b.lesson.date_time_start && isUpcoming(b.lesson.date_time_start)).length}
            </span>
          )}
        </button>
        <button
          className={`pb-2 px-4 font-medium ${
            activeTab === 'past'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            console.log('🔄 タブ切り替え: 過去のレッスン');
            setActiveTab('past');
          }}
        >
          過去のレッスン
          {/* 過去のレッスン数を表示 */}
          {bookings.filter(b => b.lesson && b.lesson.date_time_start && !isUpcoming(b.lesson.date_time_start)).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {bookings.filter(b => b.lesson && b.lesson.date_time_start && !isUpcoming(b.lesson.date_time_start)).length}
            </span>
          )}
        </button>
      </div>
      
      {filteredBookings.length > 0 ? (
        <div className="space-y-6">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/4 h-48 md:h-auto bg-gray-200 relative">
                  {booking.lesson.lesson_image_url && booking.lesson.lesson_image_url[0] ? (
                    <img 
                      src={booking.lesson.lesson_image_url[0]} 
                      alt={booking.lesson.lesson_title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <span className="text-gray-400">画像なし</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs">
                    {booking.lesson.category}
                  </div>
                </div>
                
                <div className="p-6 md:w-3/4">
                  <div className="flex flex-wrap items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-3">
                        {booking.lesson.lesson_title}
                      </h2>
                      
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-2">
                          {booking.instructor?.profile_image_url ? (
                            <img 
                              src={booking.instructor.profile_image_url} 
                              alt={booking.instructor.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-primary text-white text-xs">
                              {booking.instructor?.name?.charAt(0) || 'I'}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{booking.instructor?.name || 'インストラクター情報がありません'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status === 'pending' ? '予約申請中' : 
                           booking.status === 'confirmed' ? '予約確定' : 
                           booking.status === 'canceled' ? 'キャンセル済み' 
                           : booking.status === 'completed' ? '完了' : booking.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(booking.payment_status)}`}>
                          {booking.payment_status === 'pending' ? '支払い待ち' : 
                           booking.payment_status === 'paid' ? '支払い済み' : '返金済み'}
                        </span>
                      </div>
                      
                      <p className="text-lg font-semibold mb-2">
                        {booking.lesson.price.toLocaleString()}円
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">レッスン日時</p>
                        <p className="text-gray-700">
                          {new Date(booking.lesson.date_time_start).toLocaleDateString()} {new Date(booking.lesson.date_time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' 〜 '}
                          {new Date(booking.lesson.date_time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">予約日</p>
                        <p className="text-gray-700">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-between mt-4">
                      <div className="flex space-x-2">
                        <Link
                          to={`/user/lessons/${booking.lesson_id}`}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm"
                        >
                          レッスン詳細
                        </Link>
                        
                        {booking.chat_room && (
                          <Link
                            to={`/user/chat/${booking.chat_room.id}`}
                            className="bg-primary/10 text-primary px-4 py-2 rounded-md hover:bg-primary/20 transition-colors text-sm"
                          >
                            講師とチャット
                          </Link>
                        )}
                      </div>
                      
                      {activeTab === 'upcoming' && (
                        (booking.status === 'canceled') ? (
                          <Link
                            to={`/user/lessons/${booking.lesson_id}`}
                            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                          >
                            再予約する
                          </Link>
                        ) : (booking.status === 'pending' || booking.status === 'confirmed') ? (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-red-600 hover:text-red-800 hover:underline text-sm"
                          >
                            予約をキャンセル
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            {activeTab === 'upcoming' ? '今後の予約はありません' : '過去の予約はありません'}
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

export default UserBookings;