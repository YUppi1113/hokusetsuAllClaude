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
            instructor_profiles(id, name, profile_image_url)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Would implement actual filtering here
    console.log('Searching for:', searchQuery);
  };
  
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
      
      // 検索クエリフィルタリング
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          lesson.lesson_title.toLowerCase().includes(query) ||
          (lesson.category && lesson.category.toLowerCase().includes(query)) ||
          (lesson.sub_category && lesson.sub_category.toLowerCase().includes(query))
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
      
      {/* Search and Categories */}
      <div className="mb-8 space-y-6">
        <form onSubmit={handleSearch} className="flex w-full max-w-lg">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-input rounded-l-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="レッスンを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" className="rounded-l-none">
            検索
          </Button>
        </form>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="rounded-full"
          >
            全て
          </Button>
          {CATEGORIES.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="rounded-full"
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Lessons Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-16 h-16 relative">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-foreground/70 animate-pulse">レッスン読込中...</p>
        </div>
      ) : filteredLessons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              imageUrl={lesson.lesson_image_url?.[0]}
              title={lesson.lesson_title}
              subtitle=""
              price={lesson.price}
              instructorName={lesson.instructor_profiles?.name || 'Instructor'}
              instructorImageUrl={lesson.instructor_profiles?.profile_image_url}
              date={new Date(lesson.date_time_start).toLocaleDateString()}
              location={lesson.location_type === 'online' ? 'オンライン' : lesson.location_name}
              category={lesson.category_name || lesson.category}
              capacity={lesson.capacity}
              currentParticipants={lesson.current_participants_count}
              isFeatured={lesson.is_featured}
              isLiked={favorites.includes(lesson.id)}
              onLikeClick={() => handleLikeClick(lesson.id)}
              onClick={() => navigate(`/user/lessons/${lesson.id}`)}
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
  );
};

export default UserLessons;