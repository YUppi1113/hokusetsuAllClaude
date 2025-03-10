import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react';

interface Instructor {
  id: string;
  name: string;
  business_name: string | null;
  profile_image_url: string | null;
  background_image_url: string | null;
  instructor_bio: string | null;
  instructor_experience: string | null;
  instructor_education: string | null;
  instructor_certifications: string | null;
  instructor_specialties: string[] | null;
  average_rating: number;
  review_count: number;
  is_verified: boolean;
}

interface Review {
  id: string;
  user_id: string;
  instructor_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    name: string;
    profile_image_url: string | null;
  };
}

interface Lesson {
  id: string;
  lesson_title: string;
  category: string;
  sub_category: string | null;
  lesson_image_url: string[];
  price: number;
  difficulty_level: string;
  current_participants_count: number;
  capacity: number;
  date_time_start: string;
  lesson_type: string;
}

const UserInstructorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchInstructorData = async () => {
      try {
        setLoading(true);
        
        if (!id) return;
        
        // Fetch instructor profile
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', id)
          .single();
          
        if (instructorError) throw instructorError;
        
        // Fetch review count and average rating
        const { count: reviewCount, error: reviewCountError } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('instructor_id', id);
          
        if (reviewCountError) throw reviewCountError;
        
        const { data: ratingData, error: ratingError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('instructor_id', id);
          
        if (ratingError) throw ratingError;
        
        const averageRating = ratingData.length > 0
          ? ratingData.reduce((acc, review) => acc + review.rating, 0) / ratingData.length
          : 0;
        
        // Combine data
        setInstructor({
          ...instructorData,
          review_count: reviewCount || 0,
          average_rating: averageRating
        });
        
        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            user:user_profiles!reviews_user_id_fkey(name, profile_image_url)
          `)
          .eq('instructor_id', id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (reviewsError) throw reviewsError;
        setReviews(reviewsData || []);
        
        // Fetch upcoming lessons by this instructor
        const today = new Date();
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('instructor_id', id)
          .eq('status', 'published')
          .gte('date_time_start', today.toISOString())
          .order('date_time_start', { ascending: true })
          .limit(6);
          
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);
      } catch (error) {
        console.error('Error fetching instructor data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInstructorData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!instructor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">講師が見つかりません</h1>
          <p className="text-gray-500 mb-6">
            お探しの講師は存在しないか、削除された可能性があります。
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

  // Calculate rating distribution
  const ratingDistribution = reviews.reduce(
    (acc, review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        acc[Math.floor(review.rating) - 1]++;
      }
      return acc;
    },
    [0, 0, 0, 0, 0]
  );
  
  const totalReviews = reviews.length;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <button onClick={() => window.history.back()} className="text-primary hover:underline flex items-center">
          <ChevronLeft className="w-5 h-5 mr-1" />
          戻る
        </button>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile and Info */}
        <div className="lg:col-span-2">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border mb-8">
            <div className="h-48 bg-gray-200 relative">
              {instructor.background_image_url ? (
                <img
                  src={instructor.background_image_url}
                  alt="プロフィール背景"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/30"></div>
              )}
              
              {/* Profile image */}
              <div className="absolute bottom-0 left-8 transform translate-y-1/2">
                <div className="w-32 h-32 rounded-full bg-white p-1 shadow-md">
                  <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                    {instructor.profile_image_url ? (
                      <img
                        src={instructor.profile_image_url}
                        alt={instructor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-primary text-white text-4xl">
                        {instructor.name?.charAt(0) || 'I'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-20 pb-8 px-8">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 mr-2">{instructor.name}</h1>
                {instructor.is_verified && (
                  <span className="inline-flex items-center bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    認証済み講師
                  </span>
                )}
              </div>
              
              {instructor.business_name && (
                <p className="text-gray-600 mb-4">{instructor.business_name}</p>
              )}
              
              {instructor.average_rating > 0 && (
                <div className="flex items-center mb-6">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(instructor.average_rating)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="ml-2 text-sm font-medium text-gray-900">
                    {instructor.average_rating.toFixed(1)}
                  </p>
                  <span className="w-1 h-1 mx-2 bg-gray-500 rounded-full"></span>
                  <p className="text-sm font-medium text-gray-500">
                    {instructor.review_count}件の評価
                  </p>
                </div>
              )}
              
              {/* Bio */}
              {instructor.instructor_bio && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">自己紹介</h2>
                  <p className="text-gray-700 whitespace-pre-line">{instructor.instructor_bio}</p>
                </div>
              )}
              
              {/* Specialties */}
              {instructor.instructor_specialties && instructor.instructor_specialties.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">専門分野</h2>
                  <div className="flex flex-wrap gap-2">
                    {instructor.instructor_specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Experience & Qualifications */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border mb-8">
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-6 border-b pb-2">経歴と資格</h2>
              
              {/* Experience */}
              {instructor.instructor_experience && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-gray-900">経験</h3>
                  <p className="text-gray-700 whitespace-pre-line">{instructor.instructor_experience}</p>
                </div>
              )}
              
              {/* Education */}
              {instructor.instructor_education && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-gray-900">学歴</h3>
                  <p className="text-gray-700 whitespace-pre-line">{instructor.instructor_education}</p>
                </div>
              )}
              
              {/* Certifications */}
              {instructor.instructor_certifications && (
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-900">保有資格</h3>
                  <p className="text-gray-700 whitespace-pre-line">{instructor.instructor_certifications}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Reviews Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border mb-8">
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-6 border-b pb-2">受講者の評価とレビュー</h2>
              
              {instructor.review_count > 0 ? (
                <>
                  {/* Rating Summary */}
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    {/* Average Rating */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center">
                      <p className="text-5xl font-bold text-gray-900">{instructor.average_rating.toFixed(1)}</p>
                      <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(instructor.average_rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{instructor.review_count}件のレビュー</p>
                    </div>
                    
                    {/* Rating Distribution */}
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = ratingDistribution[rating - 1];
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        
                        return (
                          <div key={rating} className="flex items-center mb-2">
                            <span className="text-sm text-gray-600 w-4">{rating}</span>
                            <svg
                              className="w-4 h-4 text-yellow-400 ml-1 mr-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 bg-primary rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-500 ml-2 w-10">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Review List */}
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                              {review.user?.profile_image_url ? (
                                <img
                                  src={review.user.profile_image_url}
                                  alt={review.user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-primary text-white">
                                  {review.user?.name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <h3 className="text-sm font-medium">{review.user?.name || '匿名ユーザー'}</h3>
                              <span className="mx-2 text-gray-300">•</span>
                              <time className="text-xs text-gray-500">
                                {(() => {
                                  const d = new Date(review.created_at);
                                  const year = d.getFullYear();
                                  const month = d.getMonth() + 1;
                                  const day = d.getDate();
                                  return `${year}年${month}月${day}日`;
                                })()}
                              </time>
                            </div>
                            <div className="flex items-center mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">まだレビューがありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Upcoming Lessons */}
        <div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border sticky top-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">開催予定のレッスン</h2>
              
              {lessons.length > 0 ? (
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <Link key={lesson.id} to={`/user/lessons/${lesson.id}`} className="block">
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-gray-200 relative">
                          {lesson.lesson_image_url?.[0] ? (
                            <img
                              src={lesson.lesson_image_url[0]}
                              alt={lesson.lesson_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              画像なし
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white font-medium truncate">
                              {lesson.lesson_title}
                            </p>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                              {lesson.category}
                            </span>
                            {lesson.difficulty_level && (
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                                {lesson.difficulty_level === 'beginner' ? '初級' : 
                                 lesson.difficulty_level === 'intermediate' ? '中級' : 
                                 lesson.difficulty_level === 'advanced' ? '上級' : 'すべてのレベル'}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">
                              {(() => {
                                const d = new Date(lesson.date_time_start);
                                const year = d.getFullYear();
                                const month = d.getMonth() + 1;
                                const day = d.getDate();
                                return `${year}年${month}月${day}日`;
                              })()}
                            </p>
                            <p className="font-medium text-primary">
                              ¥{lesson.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <span>{lesson.current_participants_count}/{lesson.capacity}人</span>
                            <div className="ml-2 flex-1 h-1.5 bg-gray-200 rounded-full">
                              <div
                                className="h-1.5 bg-primary rounded-full"
                                style={{ 
                                  width: `${(lesson.current_participants_count / lesson.capacity) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  <Link
                    to={`/user/lessons?instructor=${id}`}
                    className="block text-center text-primary font-medium hover:underline py-2"
                  >
                    すべてのレッスンを見る
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">現在予定されているレッスンはありません</p>
                  <Link
                    to="/user/lessons"
                    className="block mt-4 text-primary hover:underline font-medium"
                  >
                    レッスン一覧に戻る
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInstructorDetail;