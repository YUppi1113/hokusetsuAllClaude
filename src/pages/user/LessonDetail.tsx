import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const UserLessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!id) return;
        
        // Fetch lesson details
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .single();
          
        if (lessonError) throw lessonError;
        setLesson(lessonData);
        
        // Fetch instructor profile
        if (lessonData?.instructor_id) {
          const { data: instructorData, error: instructorError } = await supabase
            .from('instructor_profiles')
            .select('*')
            .eq('id', lessonData.instructor_id)
            .single();
            
          if (instructorError) throw instructorError;
          setInstructor(instructorData);
        }
        
        // Check if lesson is in user's favorites
        if (user) {
          const { data: favoriteData } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', id)
            .single();
            
          setIsFavorite(!!favoriteData);
          
          // Check booking status
          const { data: bookingData } = await supabase
            .from('bookings')
            .select('status')
            .eq('user_id', user.id)
            .eq('lesson_id', id)
            .single();
            
          setBookingStatus(bookingData?.status || null);
        }
      } catch (error) {
        console.error('Error fetching lesson data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('lesson_id', id);
      } else {
        // Add to favorites
        await supabase
          .from('favorites')
          .insert([
            { user_id: user.id, lesson_id: id }
          ]);
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const handleBooking = async () => {
    if (!user || !id) return;
    
    try {
      console.log('予約処理開始:', user.id, id);
      
      // 1. まず既存の予約がないか確認
      const { data: existingBooking, error: checkError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .maybeSingle();
        
      if (checkError) {
        console.error('既存予約の確認エラー:', checkError);
        throw checkError;
      }
      
      // 既存の予約がある場合
      if (existingBooking) {
        console.log('既に予約が存在します:', existingBooking);
        
        // キャンセル済みの場合は再予約として扱う
        if (existingBooking.status === 'cancelled' || existingBooking.status === 'canceled') {
          console.log('キャンセル済みの予約を再予約します:', existingBooking.id);
          
          // キャンセル済みの予約を再度予約済みにする
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'pending',
              payment_status: 'pending',
              booking_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id);
            
          if (updateError) {
            console.error('予約更新エラー:', updateError);
            throw updateError;
          }
          
          setBookingStatus('pending');
          console.log('予約の再予約が完了しました');
          
          // Redirect to booking confirmation page
          alert('レッスンを再予約しました。予約管理画面に移動します。');
          window.location.href = `/user/bookings`;
          return;
        } else {
          // キャンセル済み以外の予約がある場合は処理を終了
          setBookingStatus(existingBooking.status);
          alert('このレッスンは既に予約済みです。');
          return;
        }
      }
      
      // 2. user_profilesテーブルにユーザープロファイルが存在するか確認
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error('ユーザープロファイル確認エラー:', profileError);
        throw profileError;
      }
      
      // ユーザープロファイルが存在しない場合は作成
      if (!userProfile) {
        console.log('ユーザープロファイルが存在しないため作成します');
        const { error: createProfileError } = await supabase
          .from('user_profiles')
          .insert([
            { 
              id: user.id, 
              email: user.email || '',
              name: user.user_metadata?.name || 'ゲスト',
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'user'
            }
          ]);
          
        if (createProfileError) {
          console.error('ユーザープロファイル作成エラー:', createProfileError);
          throw createProfileError;
        }
      }
      
      // 3. 予約を作成
      console.log('予約レコードを作成します');
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          { 
            user_id: user.id, 
            lesson_id: id,
            booking_date: new Date().toISOString(),
            status: 'pending',
            payment_status: 'pending'
          }
        ])
        .select();
        
      if (error) {
        console.error('予約作成エラー:', error);
        throw error;
      }
      
      // 4. チャットルームを作成
      console.log('チャットルームを作成します');
      // チャットルームが既に存在するか確認
      const { data: existingChatRoom, error: chatRoomCheckError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .maybeSingle();
        
      if (chatRoomCheckError) {
        console.error('チャットルーム確認エラー:', chatRoomCheckError);
      }
      
      // チャットルームが存在しない場合のみ作成
      if (!existingChatRoom) {
        const { error: chatRoomError } = await supabase
          .from('chat_rooms')
          .insert([
            {
              lesson_id: id,
              instructor_id: lesson.instructor_id,
              user_id: user.id
            }
          ]);
          
        if (chatRoomError) {
          console.error('チャットルーム作成エラー:', chatRoomError);
          // チャットルーム作成に失敗しても予約自体は成功とみなす
        }
      } else {
        console.log('チャットルームは既に存在します:', existingChatRoom.id);
      }
        
      setBookingStatus('pending');
      console.log('予約処理が完了しました');
      
      // Redirect to booking confirmation page
      alert('予約が完了しました。予約管理画面に移動します。');
      window.location.href = `/user/bookings`;
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('予約処理中にエラーが発生しました。もう一度お試しください。');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">レッスンが見つかりません</h1>
          <p className="text-gray-500 mb-6">
            お探しのレッスンは存在しないか、削除された可能性があります。
          </p>
          <Link
            to="/user/lessons"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            レッスン一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link to="/user/lessons" className="text-primary hover:underline flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          レッスン一覧に戻る
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Lesson header and images */}
        <div className="relative h-96 bg-gray-200">
          {lesson.lesson_image_url && lesson.lesson_image_url[0] ? (
            <img 
              src={lesson.lesson_image_url[0]} 
              alt={lesson.lesson_title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-200">
              <span className="text-gray-400 text-2xl">画像なし</span>
            </div>
          )}
          <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={toggleFavorite}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            >
              <svg 
                className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Lesson header */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {lesson.category}
              </span>
              <span className="ml-2 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-600">
                {lesson.sub_category}
              </span>
              <span className="ml-auto text-sm text-gray-500">
                レベル: {
                  lesson.difficulty_level === 'beginner' ? '初級' :
                  lesson.difficulty_level === 'intermediate' ? '中級' : 
                  lesson.difficulty_level === 'advanced' ? '上級' : '全レベル'
                }
              </span>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">{lesson.lesson_title}</h1>
            
            {/* Instructor info */}
            {instructor && (
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-3">
                  {instructor.profile_image_url ? (
                    <img 
                      src={instructor.profile_image_url} 
                      alt={instructor.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-primary text-white">
                      {instructor.name?.charAt(0) || 'I'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{instructor.name}</p>
                  <p className="text-sm text-gray-500">{instructor.business_name || '講師'}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Lesson details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">レッスン内容</h2>
                <p className="text-gray-700 whitespace-pre-line">{lesson.lesson_description}</p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">学習目標</h2>
                <p className="text-gray-700 whitespace-pre-line">{lesson.lesson_goals}</p>
              </section>
              
              {lesson.lesson_outline && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">レッスンの流れ</h2>
                  <p className="text-gray-700 whitespace-pre-line">{lesson.lesson_outline}</p>
                </section>
              )}
              
              {lesson.materials_needed && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">持ち物・準備</h2>
                  <p className="text-gray-700 whitespace-pre-line">{lesson.materials_needed}</p>
                </section>
              )}
            </div>
            
            <div>
              <div className="bg-gray-50 p-6 rounded-lg border sticky top-6">
                <div className="mb-4">
                  <p className="text-2xl font-bold mb-1">{lesson.price.toLocaleString()}円</p>
                  <p className="text-sm text-gray-500">
                    1回あたり
                  </p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">レッスン日時</h3>
                  <p className="text-gray-700">
                    {new Date(lesson.date_time_start).toLocaleDateString()} {new Date(lesson.date_time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {' 〜 '}
                    {new Date(lesson.date_time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {lesson.duration}分間
                  </p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">レッスン場所</h3>
                  <p className="text-gray-700">
                    {lesson.location_type === 'online' ? 'オンライン' : 
                     lesson.location_type === 'offline' ? '対面' : 'ハイブリッド'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {lesson.location_name}
                  </p>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">定員</h3>
                  <p className="text-gray-700">
                    {lesson.current_participants_count} / {lesson.capacity}人
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    予約締切: {new Date(lesson.booking_deadline).toLocaleDateString()}
                  </p>
                </div>
                
                {/* 予約ステータスの表示 */}
                {bookingStatus ? (
                  bookingStatus === 'canceled' || bookingStatus === 'cancelled' ? (
                    // キャンセル済みの場合は「レッスンを予約する」ボタンを表示
                    <div>
                      <div className="bg-yellow-50 p-4 rounded text-center mb-4">
                        <p className="font-medium mb-1 text-yellow-700">予約はキャンセルされています</p>
                      </div>
                      <button
                        onClick={handleBooking}
                        disabled={lesson.current_participants_count >= lesson.capacity}
                        className={`w-full py-3 rounded-md font-medium ${
                          lesson.current_participants_count >= lesson.capacity
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90 transition-colors'
                        }`}
                      >
                        {lesson.current_participants_count >= lesson.capacity
                          ? '満席です'
                          : 'レッスンを予約する'}
                      </button>
                    </div>
                  ) : (
                    // キャンセル済み以外の予約状態の表示
                    <div className="bg-gray-100 p-4 rounded text-center mb-4">
                      <p className="font-medium mb-1">
                        {bookingStatus === 'pending' ? '予約申請中' : 
                         bookingStatus === 'confirmed' ? '予約確定済み' : '予約完了'}
                      </p>
                      <p className="text-sm text-gray-500">
                        予約状況の確認は<Link to="/user/bookings" className="text-primary hover:underline">こちら</Link>
                      </p>
                    </div>
                  )
                ) : (
                  // 予約ステータスがない場合は「レッスンを予約する」ボタンを表示
                  <button
                    onClick={handleBooking}
                    disabled={lesson.current_participants_count >= lesson.capacity}
                    className={`w-full py-3 rounded-md font-medium ${
                      lesson.current_participants_count >= lesson.capacity
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90 transition-colors'
                    }`}
                  >
                    {lesson.current_participants_count >= lesson.capacity
                      ? '満席です'
                      : 'レッスンを予約する'}
                  </button>
                )}
                
                {lesson.current_participants_count >= lesson.capacity && !bookingStatus && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    このレッスンは満席です。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLessonDetail;