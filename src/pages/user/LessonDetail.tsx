import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const UserLessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
        
        // Fetch instructor profile with all details
        if (lessonData?.instructor_id) {
          // Fetch instructor profile data
          const { data: instructorData, error: instructorError } = await supabase
            .from('instructor_profiles')
            .select('*')
            .eq('id', lessonData.instructor_id)
            .single();
            
          if (instructorError) throw instructorError;
          
          // Get review count in a separate query
          const { count: reviewCount, error: reviewCountError } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', lessonData.instructor_id);
            
          if (reviewCountError) {
            console.error("Error fetching review count:", reviewCountError);
          }
          
          // Combine the instructor data with review count
          setInstructor({
            ...instructorData,
            review_count: reviewCount || 0
          });
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
      const { error } = await supabase
        .from('bookings')
        .insert([
          { 
            user_id: user.id, 
            lesson_id: id,
            booking_date: new Date().toISOString(),
            status: 'pending',
            payment_status: 'pending'
          }
        ]);
        
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
      
      // プロフィールの完了状態を確認
      const { data: profileData, error: profileCheckError } = await supabase
        .from('user_profiles')
        .select('is_profile_completed')
        .eq('id', user.id)
        .single();
        
      if (!profileCheckError && profileData && !profileData.is_profile_completed) {
        // プロフィール未完了の場合
        if (confirm('予約が完了しました。続けてプロフィールを設定しますか？')) {
          window.location.href = `/user/profile`;
          return;
        }
      }
      
      // 通常のリダイレクト
      alert('予約が完了しました。予約管理画面に移動します。');
      window.location.href = `/user/bookings`;
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('予約処理中にエラーが発生しました。もう一度お試しください。');
    }
  };
  
  const handleChat = async () => {
    if (!user || !id || !lesson?.instructor_id) return;
    
    try {
      // チャットルームが既に存在するか確認
      const { data: existingChatRoom, error: chatRoomCheckError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .maybeSingle();
        
      if (chatRoomCheckError) {
        console.error('チャットルーム確認エラー:', chatRoomCheckError);
        throw chatRoomCheckError;
      }
      
      // チャットルームが存在する場合はそこに移動
      if (existingChatRoom) {
        window.location.href = `/user/chat/${existingChatRoom.id}`;
        return;
      }
      
      // チャットルームが存在しない場合は新規作成
      const { data: newChatRoom, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .insert([
          {
            lesson_id: id,
            instructor_id: lesson.instructor_id,
            user_id: user.id
          }
        ])
        .select()
        .single();
        
      if (chatRoomError) {
        console.error('チャットルーム作成エラー:', chatRoomError);
        throw chatRoomError;
      }
      
      // 作成したチャットルームに移動
      window.location.href = `/user/chat/${newChatRoom.id}`;
    } catch (error) {
      console.error('Error handling chat:', error);
      alert('チャットの準備中にエラーが発生しました。もう一度お試しください。');
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

  // レッスンタイプに応じたラベルと色の設定
  const lessonTypeLabels = {
    monthly: "月額制",
    one_time: "単発講座",
    course: "コース講座"
  };

  const lessonTypeColors = {
    monthly: "bg-blue-100 text-blue-800",
    one_time: "bg-purple-100 text-purple-800",
    course: "bg-green-100 text-green-800"
  };

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
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
        {/* Lesson header and image slider */}
        <div className="relative h-[400px] bg-gray-200">
          {lesson.lesson_image_url && lesson.lesson_image_url.length > 0 ? (
            <div className="relative w-full h-full">
              {/* メイン画像 */}
              <img 
                src={lesson.lesson_image_url[activeImageIndex]} 
                alt={`${lesson.lesson_title} - 画像 ${activeImageIndex + 1}`} 
                className="w-full h-full object-cover"
              />
              
              {/* 画像ナビゲーション（複数画像がある場合のみ表示） */}
              {lesson.lesson_image_url.length > 1 && (
                <>
                  {/* 左矢印 */}
                  <button 
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? lesson.lesson_image_url.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 focus:outline-none transition-colors"
                    aria-label="前の画像"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  {/* 右矢印 */}
                  <button 
                    onClick={() => setActiveImageIndex((prev) => (prev === lesson.lesson_image_url.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 focus:outline-none transition-colors"
                    aria-label="次の画像"
                  >
                    <ChevronRight size={24} />
                  </button>
                  
                  {/* 画像カウンター */}
                  <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {activeImageIndex + 1}/{lesson.lesson_image_url.length}
                  </div>
                  
                  {/* サムネイルナビゲーション - 画像プレビュー */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center bg-black/30 py-2 px-4">
                    <div className="flex space-x-2 items-center overflow-x-auto max-w-full">
                      {lesson.lesson_image_url.map((imgUrl: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`flex-shrink-0 transition-all duration-200 ${
                            index === activeImageIndex 
                              ? 'border-2 border-white scale-110 z-10' 
                              : 'border border-white/50 opacity-70 hover:opacity-100'
                          }`}
                          aria-label={`画像 ${index + 1} に移動`}
                        >
                          <div className="relative w-16 h-12 overflow-hidden rounded">
                            <img 
                              src={imgUrl} 
                              alt={`サムネイル ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            {index === activeImageIndex && (
                              <div className="absolute inset-0 bg-primary/20"></div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-200">
              <span className="text-gray-400 text-2xl">画像なし</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 p-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {lesson.lesson_type && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${lessonTypeColors[lesson.lesson_type as keyof typeof lessonTypeColors] || 'bg-gray-100 text-gray-800'}`}>
                  {lessonTypeLabels[lesson.lesson_type as keyof typeof lessonTypeLabels] || lesson.lesson_type}
                </span>
              )}
              <span className="bg-primary/10 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                {lesson.category}
              </span>
              {lesson.sub_category && (
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {lesson.sub_category}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2 text-shadow">{lesson.lesson_title}</h1>
            {lesson.lesson_catchphrase && (
              <p className="text-lg text-white/90 mb-2">{lesson.lesson_catchphrase}</p>
            )}
          </div>
          <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={toggleFavorite}
              className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
            >
              <svg 
                className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
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
        
        <div className="p-8">
          {/* Instructor info */}
          {instructor && (
            <div className="border-b pb-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Instructor Profile Image & Basic Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-primary/20">
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
                    {instructor.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1 border border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">講師</div>
                    <p className="font-bold text-lg flex items-center">
                      {instructor.name}
                      {instructor.average_rating > 0 && (
                        <span className="ml-2 flex items-center text-sm font-normal">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-0.5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          {instructor.average_rating.toFixed(1)}
                          <span className="text-gray-500 ml-1">({instructor.review_count || 0}件)</span>
                        </span>
                      )}
                    </p>
                    {instructor.business_name && (
                      <p className="text-sm text-gray-600">{instructor.business_name}</p>
                    )}
                  </div>
                  
                  <Link 
                    to={`/user/instructors/${instructor.id}`}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    プロフィールを見る
                  </Link>
                </div>
                
                {/* Specialties and Level */}
                <div className="flex flex-col md:flex-row md:ml-auto gap-2 mt-2 md:mt-0">
                  {instructor.instructor_specialties && instructor.instructor_specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {instructor.instructor_specialties.slice(0, 3).map((specialty: string, index: number) => (
                        <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                          {specialty}
                        </span>
                      ))}
                      {instructor.instructor_specialties.length > 3 && (
                        <span className="text-xs text-gray-500 px-1 py-1">他{instructor.instructor_specialties.length - 3}つ</span>
                      )}
                    </div>
                  )}
                  
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm whitespace-nowrap">
                    レベル: {
                      lesson.difficulty_level === 'beginner' ? '初級' :
                      lesson.difficulty_level === 'intermediate' ? '中級' : 
                      lesson.difficulty_level === 'advanced' ? '上級' : '全レベル'
                    }
                  </span>
                </div>
              </div>
              
              {/* Instructor Bio (Optional) */}
              {instructor.instructor_bio && (
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p className="line-clamp-2">{instructor.instructor_bio}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Lesson details with sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lesson content - main area */}
            <div className="lg:col-span-2">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  レッスン内容
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.lesson_description}</p>
                </div>
              </section>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  学習目標
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.lesson_goals}</p>
                </div>
              </section>
              
              {lesson.lesson_outline && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    レッスンの流れ
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.lesson_outline}</p>
                  </div>
                </section>
              )}
              
              {lesson.materials_needed && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                    </svg>
                    持ち物・準備
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.materials_needed}</p>
                  </div>
                </section>
              )}
              
              {/* Instructor Additional Information Section - 簡略化バージョン */}
              <section className="mb-8 border-t pt-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  講師紹介
                </h2>
                
                {instructor && (
                  <div className="bg-white p-5 rounded-lg border mb-6">
                    {/* 講師の簡単な自己紹介 */}
                    {instructor.instructor_bio && (
                      <div className="mb-4">
                        <p className="text-gray-700 whitespace-pre-line">{instructor.instructor_bio}</p>
                      </div>
                    )}
                    
                    {/* 専門分野だけ表示 */}
                    {instructor.instructor_specialties && instructor.instructor_specialties.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">専門分野</h3>
                        <div className="flex flex-wrap gap-1">
                          {instructor.instructor_specialties.map((specialty: string, index: number) => (
                            <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 講師プロフィールページリンク */}
                    <div className="mt-4 text-center">
                      <Link 
                        to={`/user/instructors/${instructor.id}`} 
                        className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
                      >
                        <span>講師の詳細プロフィールを見る</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"></path>
                          <path d="M12 5l7 7-7 7"></path>
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            </div>
            
            {/* Booking sidebar */}
            <div>
              <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-6">
                <div className="mb-6">
                  {lesson.lesson_type === 'monthly' ? (
                    <>
                      <p className="text-3xl font-bold mb-1 text-primary">{lesson.price.toLocaleString()}円<span className="text-lg font-normal">/月</span></p>
                      <p className="text-sm text-gray-500">
                        月額料金
                      </p>
                    </>
                  ) : lesson.lesson_type === 'course' ? (
                    <>
                      <p className="text-3xl font-bold mb-1 text-primary">{lesson.price.toLocaleString()}円</p>
                      <p className="text-sm text-gray-500">
                        コース料金（全{lesson.course_sessions || '?'}回）
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold mb-1 text-primary">{lesson.price.toLocaleString()}円</p>
                      <p className="text-sm text-gray-500">
                        1回あたり
                      </p>
                    </>
                  )}
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div>
                      <h3 className="font-medium text-gray-900">レッスン日時</h3>
                      <p className="text-gray-700">
                        {new Date(lesson.date_time_start).toLocaleDateString()} {new Date(lesson.date_time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {' 〜 '}
                        {new Date(lesson.date_time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {lesson.duration}分間
                      </p>
                    </div>
                  </div>
                
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div>
                      <h3 className="font-medium text-gray-900">レッスン場所</h3>
                      <p className="text-gray-700">
                        {lesson.location_type === 'online' ? 'オンライン' : 
                         lesson.location_type === 'offline' ? '対面' : 'ハイブリッド'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {lesson.location_name}
                      </p>
                    </div>
                  </div>
                  
                  {lesson.lesson_type !== 'monthly' && (
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <div>
                        <h3 className="font-medium text-gray-900">定員</h3>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-gray-700">
                            {lesson.current_participants_count} / {lesson.capacity}人
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            lesson.current_participants_count >= lesson.capacity 
                              ? 'bg-red-100 text-red-800' 
                              : lesson.current_participants_count >= lesson.capacity * 0.8 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {lesson.current_participants_count >= lesson.capacity 
                              ? '満席'
                              : lesson.current_participants_count >= lesson.capacity * 0.8
                                ? '残りわずか'
                                : '予約可能'}
                          </span>
                        </div>
                        {lesson.lesson_type !== 'monthly' && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className={`h-2 rounded-full ${
                                lesson.current_participants_count / lesson.capacity > 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(100, (lesson.current_participants_count / lesson.capacity) * 100)}%` }}
                            ></div>
                          </div>
                        )}
                        {lesson.booking_deadline && (
                          <p className="text-sm text-gray-500">
                            予約締切: {new Date(lesson.booking_deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 予約ステータスの表示 */}
                <div className="mt-6">
                  {bookingStatus ? (
                    bookingStatus === 'canceled' || bookingStatus === 'cancelled' ? (
                      // キャンセル済みの場合は「レッスンを予約する」ボタンを表示
                      <div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center mb-4 border border-yellow-200">
                          <p className="font-medium mb-1 text-yellow-700">予約はキャンセルされています</p>
                        </div>
                        <button
                          onClick={handleBooking}
                          disabled={lesson.current_participants_count >= lesson.capacity}
                          className={`w-full py-3 rounded-md font-medium transition-colors mb-3 ${
                            lesson.current_participants_count >= lesson.capacity
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary/90'
                          }`}
                        >
                          {lesson.current_participants_count >= lesson.capacity
                            ? '満席です'
                            : 'レッスンを予約する'}
                        </button>
                        <button
                          onClick={handleChat}
                          className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          講師にチャットで質問する
                        </button>
                      </div>
                    ) : (
                      // キャンセル済み以外の予約状態の表示
                      <div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center mb-4 border border-blue-200">
                          <p className="font-medium mb-1 text-blue-700">
                            {bookingStatus === 'pending' ? '予約申請中' : 
                             bookingStatus === 'confirmed' ? '予約確定済み' : '予約完了'}
                          </p>
                          <p className="text-sm text-blue-600">
                            予約状況の確認は<Link to="/user/bookings" className="text-primary font-medium hover:underline">こちら</Link>
                          </p>
                        </div>
                        <button
                          onClick={handleChat}
                          className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          講師にチャットで質問する
                        </button>
                      </div>
                    )
                  ) : (
                    // 予約ステータスがない場合は「レッスンを予約する」ボタンとチャットボタンを表示
                    <div>
                      <button
                        onClick={handleBooking}
                        disabled={lesson.current_participants_count >= lesson.capacity}
                        className={`w-full py-3 rounded-md font-medium transition-colors mb-3 ${
                          lesson.current_participants_count >= lesson.capacity
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {lesson.current_participants_count >= lesson.capacity
                          ? '満席です'
                          : 'レッスンを予約する'}
                      </button>
                      <button
                        onClick={handleChat}
                        className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        講師にチャットで質問する
                      </button>
                    </div>
                  )}
                  
                  {lesson.current_participants_count >= lesson.capacity && !bookingStatus && (
                    <p className="text-sm text-gray-500 text-center mt-2">
                      このレッスンは満席です。他のレッスンをご検討ください。
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLessonDetail;