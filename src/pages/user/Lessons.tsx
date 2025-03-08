import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/section-heading';
import { LessonCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Calendar, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

const UserLessons = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLessonTypes, setSelectedLessonTypes] = useState<{
    monthly: boolean;
    one_time: boolean;
    course: boolean;
  }>({ monthly: true, one_time: true, course: true });
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get current date in ISO format
        const now = new Date().toISOString();
        
        // Fetch lessons with instructor info
        const { data, error } = await supabase
          .from('lessons')
          .select(`
            *,
            instructor_profiles(
              id, 
              name, 
              profile_image_url, 
              instructor_specialties,
              is_verified,
              average_rating,
              instructor_bio
            )
          `)
          .eq('status', 'published')
          .gte('date_time_start', now) // 現在以降に開始するレッスンのみ
          .or(`booking_deadline.gt.${now}, booking_deadline.is.null`);

        if (error) {
          console.error('Error fetching lessons:', error);
          throw error;
        }
        
        console.log('Fetched published lessons:', data?.length || 0);
        
        // Fetch user's favorites
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favData, error: favError } = await supabase
            .from('favorites')
            .select('lesson_id')
            .eq('user_id', user.id);
            
          if (favError) {
            console.error('Error fetching favorites:', favError);
          }
            
          if (favData) {
            setFavorites(favData.map(fav => fav.lesson_id));
          }
        }
        
        setLessons(data || []);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 必要なときに検索関数を実装
  
  const handleLikeClick = async (lessonId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      const isLiked = favorites.includes(lessonId);
      
      if (isLiked) {
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId);
          
        setFavorites(favorites.filter(id => id !== lessonId));
      } else {
        // Add to favorites
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            created_at: new Date().toISOString()
          });
          
        setFavorites([...favorites, lessonId]);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };
  
  const filteredLessons = lessons
    .filter(lesson => {
      // カテゴリーフィルタリング
      if (selectedCategory && lesson.category !== selectedCategory) {
        return false;
      }
      
      // レッスンタイプフィルタリング
      if (!selectedLessonTypes[lesson.lesson_type as keyof typeof selectedLessonTypes]) {
        return false;
      }
      
      // 検索クエリフィルタリング
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          lesson.lesson_title.toLowerCase().includes(query) ||
          (lesson.category && lesson.category.toLowerCase().includes(query)) ||
          (lesson.sub_category && lesson.sub_category.toLowerCase().includes(query)) ||
          (lesson.lesson_description && lesson.lesson_description.toLowerCase().includes(query))
        );
      }
      return true;
    });

  return (
    <div>
      <PageHeader 
        title="レッスン一覧" 
        description="北摂エリアで開催されるさまざまなレッスンを探してみましょう"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            日付
          </Button>
        </div>
      </PageHeader>
      
      {/* Search, Filters, and Lessons with Sidebar Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with Filters */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 sticky top-4">
            <h3 className="font-semibold text-lg mb-4 text-gray-800">絞り込み</h3>
            
            {/* Search */}
            <div className="mb-6">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="search"
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="レッスンを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Category filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリー</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="all-categories"
                    name="category"
                    checked={selectedCategory === null}
                    onChange={() => setSelectedCategory(null)}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <label htmlFor="all-categories" className="ml-2 text-sm text-gray-700">すべて</label>
                </div>
                
                {CATEGORIES.map(category => (
                  <div key={category.id} className="flex items-center">
                    <input
                      type="radio"
                      id={`category-${category.id}`}
                      name="category"
                      checked={selectedCategory === category.id}
                      onChange={() => setSelectedCategory(category.id)}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <label htmlFor={`category-${category.id}`} className="ml-2 text-sm text-gray-700 flex items-center">
                      <span className="mr-1">{category.icon}</span>
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* レッスンタイプフィルター */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">レッスンタイプ</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="type-monthly"
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedLessonTypes.monthly}
                    onChange={(e) => setSelectedLessonTypes({
                      ...selectedLessonTypes,
                      monthly: e.target.checked
                    })}
                  />
                  <label htmlFor="type-monthly" className="ml-2 text-sm text-gray-700">月額制</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="type-oneTime"
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedLessonTypes.one_time}
                    onChange={(e) => setSelectedLessonTypes({
                      ...selectedLessonTypes,
                      one_time: e.target.checked
                    })}
                  />
                  <label htmlFor="type-oneTime" className="ml-2 text-sm text-gray-700">単発講座</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="type-course"
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedLessonTypes.course}
                    onChange={(e) => setSelectedLessonTypes({
                      ...selectedLessonTypes,
                      course: e.target.checked
                    })}
                  />
                  <label htmlFor="type-course" className="ml-2 text-sm text-gray-700">コース講座</label>
                </div>
              </div>
            </div>
            
            {/* Clear filters button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setSelectedLessonTypes({ monthly: true, one_time: true, course: true });
              }}
              className="w-full"
            >
              絞り込みをリセット
            </Button>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-16 h-16 relative">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-lg text-foreground/70 animate-pulse">レッスン読込中...</p>
            </div>
          ) : filteredLessons.length > 0 ? (
            <div className="space-y-6">
              {filteredLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  imageUrl={lesson.lesson_image_url?.[0]}
                  title={lesson.lesson_title}
                  subtitle={lesson.lesson_catchphrase || ""}
                  price={lesson.price}
                  instructorName={lesson.instructor_profiles?.name || 'Instructor'}
                  instructorImageUrl={lesson.instructor_profiles?.profile_image_url}
                  instructorSpecialties={lesson.instructor_profiles?.instructor_specialties}
                  instructorVerified={lesson.instructor_profiles?.is_verified}
                  instructorRating={lesson.instructor_profiles?.average_rating}
                  date={new Date(lesson.date_time_start).toLocaleDateString()}
                  location={lesson.location_type === 'online' ? 'オンライン' : lesson.location_name}
                  category={lesson.category_name || lesson.category}
                  lessonType={lesson.lesson_type}
                  capacity={lesson.capacity}
                  currentParticipants={lesson.current_participants_count}
                  isFeatured={lesson.is_featured}
                  isLiked={favorites.includes(lesson.id)}
                  onLikeClick={(e) => {
                    e.stopPropagation();
                    handleLikeClick(lesson.id);
                  }}
                  onClick={() => navigate(`/user/lessons/${lesson.id}`)}
                  className="w-full transition-transform hover:translate-y-[-4px]"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg py-12 px-4 mt-8">
              <CheckCircle2 className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">レッスンが見つかりませんでした</h3>
              <p className="text-gray-500 text-center mt-2 mb-6">
                検索条件を変更するか、別のカテゴリーをお試しください
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                全てのレッスンを表示
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLessons;