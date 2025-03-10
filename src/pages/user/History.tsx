import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

type BookingWithLesson = {
  id: string;
  lesson_id: string;
  user_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  payment_status: string;
  created_at: string;
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
  review?: {
    id: string;
    rating: number;
    comment: string;
  };
};

const UserHistory = () => {
  const [bookings, setBookings] = useState<BookingWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState({
    bookingId: '',
    lessonId: '',
    instructorId: '',
    rating: 5,
    comment: ''
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Fetch completed bookings with lesson and instructor details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            lesson:lesson_id(
              id, 
              lesson_title, 
              date_time_start, 
              date_time_end, 
              price, 
              category, 
              lesson_image_url,
              instructor_id
            ),
            instructor_profiles!inner(id, name, profile_image_url),
            reviews!left(id, rating, comment)
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Transform the data to match our type
        const transformedData = data.map((booking: any) => {
          return {
            ...booking,
            instructor: booking.instructor_profiles || null,
            review: booking.reviews?.[0] || null
          };
        });
        
        setBookings(transformedData);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const handleAddReview = (booking: BookingWithLesson) => {
    setReviewData({
      bookingId: booking.id,
      lessonId: booking.lesson_id,
      instructorId: booking.lesson.instructor_id,
      rating: booking.review?.rating || 5,
      comment: booking.review?.comment || ''
    });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmittingReview(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // Check if review already exists
      const existingReview = bookings.find(b => b.id === reviewData.bookingId)?.review;
      
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: reviewData.rating,
            comment: reviewData.comment,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReview.id);
          
        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            lesson_id: reviewData.lessonId,
            user_id: user.id,
            instructor_id: reviewData.instructorId,
            rating: reviewData.rating,
            comment: reviewData.comment
          });
          
        if (error) throw error;
      }
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === reviewData.bookingId 
          ? { 
              ...booking, 
              review: { 
                id: booking.review?.id || 'temp-id', 
                rating: reviewData.rating, 
                comment: reviewData.comment 
              } 
            } 
          : booking
      ));
      
      // Close modal
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
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
      <h1 className="text-2xl font-bold mb-6">受講履歴</h1>
      
      {bookings.length > 0 ? (
        <div className="space-y-6">
          {bookings.map((booking) => (
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
                        <span className="text-sm text-gray-700">{booking.instructor?.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium mb-2">
                        受講済み
                      </span>
                      
                      <p className="text-lg font-semibold mb-2">
                        ¥{booking.lesson.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">受講日時</p>
                        <p className="text-gray-700">
                          {(() => {
                            const d = new Date(booking.lesson.date_time_start);
                            const year = d.getFullYear();
                            const month = d.getMonth() + 1;
                            const day = d.getDate();
                            return `${year}年${month}月${day}日`;
                          })()} {(() => {
                            const d = new Date(booking.lesson.date_time_start);
                            const hours = d.getUTCHours().toString().padStart(2, '0');
                            const minutes = d.getUTCMinutes().toString().padStart(2, '0');
                            return `${hours}:${minutes}`;
                          })()}
                          {' 〜 '}
                          {(() => {
                            const d = new Date(booking.lesson.date_time_end);
                            const hours = d.getUTCHours().toString().padStart(2, '0');
                            const minutes = d.getUTCMinutes().toString().padStart(2, '0');
                            return `${hours}:${minutes}`;
                          })()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">予約日</p>
                        <p className="text-gray-700">
                          {(() => {
                            const d = new Date(booking.booking_date);
                            const year = d.getFullYear();
                            const month = d.getMonth() + 1;
                            const day = d.getDate();
                            return `${year}年${month}月${day}日`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    {booking.review ? (
                      <div className="bg-gray-50 p-4 rounded-md mb-4">
                        <div className="flex items-center mb-2">
                          <p className="font-medium text-gray-800 mr-2">あなたのレビュー</p>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg 
                                key={star}
                                className={`w-4 h-4 ${star <= booking.review!.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm">{booking.review.comment}</p>
                        <button
                          onClick={() => handleAddReview(booking)}
                          className="text-primary hover:text-primary/80 text-sm mt-2"
                        >
                          レビューを編集する
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddReview(booking)}
                        className="bg-primary/10 text-primary px-4 py-2 rounded-md hover:bg-primary/20 transition-colors text-sm mb-4"
                      >
                        レビューを書く
                      </button>
                    )}
                    
                    <div className="flex">
                      <Link
                        to={`/user/lessons/${booking.lesson_id}`}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        レッスン詳細
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">受講履歴はまだありません</p>
          <Link 
            to="/user/lessons" 
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors inline-block"
          >
            レッスンを探す
          </Link>
        </div>
      )}
      
      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4">
            <h3 className="text-xl font-semibold mb-4">レビューを投稿</h3>
            
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  評価
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({...reviewData, rating: star})}
                      className="focus:outline-none"
                    >
                      <svg 
                        className={`w-8 h-8 ${star <= reviewData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コメント
                </label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="レッスンの感想をお書きください..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submittingReview}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 bg-primary text-white rounded-md ${
                    submittingReview ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                  } transition-colors`}
                >
                  {submittingReview ? '送信中...' : '送信する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHistory;