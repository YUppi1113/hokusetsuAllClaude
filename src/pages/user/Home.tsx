import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Calendar, Clock, Users, ChevronRight, ArrowRight, Heart, Award, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/ui/section-heading';
import { LessonCard } from '@/components/ui/card';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = [
  { id: 'sports', name: 'スポーツ', icon: '🏃‍♂️' },
  { id: 'music', name: '音楽', icon: '🎵' },
  { id: 'art', name: '芸術', icon: '🎨' },
  { id: 'language', name: '語学', icon: '🗣️' },
  { id: 'cooking', name: '料理', icon: '🍳' },
  { id: 'technology', name: 'テクノロジー', icon: '💻' },
  { id: 'academics', name: '学問', icon: '📚' },
  { id: 'hobby', name: '趣味', icon: '✨' },
];

const UserHome = () => {
  const [featuredLessons, setFeaturedLessons] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [popularInstructors, setPopularInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Get current date in ISO format
        const now = new Date().toISOString();
        
        // Fetch featured lessons (premium instructors)
        const { data: featuredData } = await supabase
          .from('lessons')
          .select(`
            *,
            instructor:instructor_profiles(name, profile_image_url),
            lesson_slots!inner(date_time_start, date_time_end, booking_deadline)
          `)
          .eq('status', 'published')
          .eq('is_featured', true)
          .eq('lesson_slots.status', 'published')
          .gt('lesson_slots.booking_deadline', now)
          .order('created_at', { ascending: false })
          .limit(8);
          
        if (featuredData) {
          setFeaturedLessons(featuredData);
        }
        
        // Fetch upcoming lessons
        const { data: upcomingData } = await supabase
          .from('lessons')
          .select(`
            *,
            instructor:instructor_profiles(name, profile_image_url),
            lesson_slots(date_time_start, date_time_end, booking_deadline, status)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (upcomingData) {
          // Filter lessons with upcoming slots
          const filtered = upcomingData.filter(lesson => 
            lesson.lesson_slots.some(slot => 
              slot.status === 'published' && 
              new Date(slot.date_time_start) > new Date(now) &&
              new Date(slot.date_time_start) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            )
          );
          
          // Sort by the earliest upcoming slot
          filtered.sort((a, b) => {
            const aSlot = a.lesson_slots.find(slot => 
              slot.status === 'published' && 
              new Date(slot.date_time_start) > new Date(now)
            );
            const bSlot = b.lesson_slots.find(slot => 
              slot.status === 'published' && 
              new Date(slot.date_time_start) > new Date(now)
            );
            
            if (!aSlot) return 1;
            if (!bSlot) return -1;
            
            return new Date(aSlot.date_time_start).getTime() - new Date(bSlot.date_time_start).getTime();
          });
          
          setUpcomingLessons(filtered.slice(0, 4));
        }
        
        // Fetch popular instructors (based on ratings)
        const { data: instructorData } = await supabase
          .from('instructor_profiles')
          .select(`
            id,
            name,
            profile_image_url,
            instructor_bio,
            instructor_specialties
          `)
          .eq('is_profile_completed', true)
          .limit(4);
          
        if (instructorData) {
          setPopularInstructors(instructorData);
        }

        // Fetch user's favorites
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favData } = await supabase
            .from('favorites')
            .select('lesson_id')
            .eq('user_id', user.id);
            
          if (favData) {
            setFavorites(favData.map(fav => fav.lesson_id));
          }
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/user/lessons?search=${encodeURIComponent(searchQuery)}`);
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-16 h-16 relative">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="text-lg text-foreground/70 animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero section */}
      <section className="relative bg-hero-pattern rounded-3xl overflow-hidden border border-primary/10">
        <div className="relative max-w-7xl mx-auto py-20 px-6 sm:py-24 lg:px-8 flex flex-col items-center text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold gradient-heading mb-6">
            北摂エリアで新しいことを学ぼう
          </h1>
          <p className="text-xl text-foreground/80 max-w-2xl mb-10">
            地元の優れた講師から学ぶ、オンラインと対面のレッスンが見つかります。
            あなたの好奇心や情熱を育てる機会がここにあります。
          </p>
          
          <div className="w-full max-w-3xl">
            <form onSubmit={handleSearch} className="flex shadow-lg rounded-lg overflow-hidden">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-4 border-0 rounded-l-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="学びたいこと、趣味、スキルなどを入力..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                size="lg"
                className="rounded-l-none px-8"
              >
                検索
              </Button>
            </form>
          </div>
          
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
            {CATEGORIES.slice(0, 4).map((category) => (
              <Button
                key={category.id}
                variant="glass"
                asChild
                className="p-4 text-center flex-col h-auto"
              >
                <Link to={`/user/lessons?category=${category.id}`}>
                  <span className="text-3xl mb-2 block">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Link>
              </Button>
            ))}
          </div>
          
          <Button
            variant="link"
            size="sm"
            asChild
            className="mt-2"
          >
            <Link to="/user/lessons" className="flex items-center">
              すべてのカテゴリーを見る
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Lessons section */}
      {featuredLessons.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-8">
            <SectionHeading
              title="おすすめレッスン"
              description="プレミアム講師によるおすすめのレッスン"
              withLine={true}
              isGradient={true}
              icon={<Sparkles className="h-6 w-6" />}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to="/user/lessons" className="flex items-center">
                すべて見る
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredLessons.slice(0, 4).map((lesson) => (
              <LessonCard
                key={lesson.id}
                imageUrl={lesson.lesson_image_url?.[0]}
                title={lesson.lesson_title}
                subtitle=""
                price={lesson.price}
                instructorName={lesson.instructor.name}
                instructorImageUrl={lesson.instructor.profile_image_url}
                date={lesson.lesson_slots.find(slot => 
                  slot.status === 'published' && 
                  new Date(slot.date_time_start) > new Date()
                ) ? new Date(lesson.lesson_slots.find(slot => 
                  slot.status === 'published' && 
                  new Date(slot.date_time_start) > new Date()
                ).date_time_start).toLocaleDateString() : '日付未定'}
                location={lesson.location_type === 'online' ? 'オンライン' : lesson.location_name}
                category={lesson.category}
                capacity={lesson.capacity}
                currentParticipants={lesson.current_participants_count}
                isFeatured={lesson.is_featured}
                isLiked={favorites.includes(lesson.id)}
                onLikeClick={(e) => {
                  e.stopPropagation();
                  handleLikeClick(lesson.id);
                }}
                onClick={() => navigate(`/user/lessons/${lesson.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Lessons section */}
      {upcomingLessons.length > 0 && (
        <section>
          <SectionHeading
            title="近日開催のレッスン"
            description="今週開催予定のレッスン"
            withLine={true}
            icon={<Calendar className="h-6 w-6" />}
          />
          
          <Card className="overflow-hidden">
            {upcomingLessons.map((lesson, index) => (
              <div 
                key={lesson.id}
                className={`${index !== upcomingLessons.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <CardContent 
                  className="p-0 cursor-pointer" 
                  onClick={() => navigate(`/user/lessons/${lesson.id}`)}
                >
                  <div className="flex flex-col sm:flex-row transition-colors hover:bg-accent/30">
                    <div className="sm:w-1/4 lg:w-1/5">
                      <div className="relative h-48 sm:h-full">
                        <img
                          src={lesson.lesson_image_url?.[0]}
                          alt={lesson.lesson_title}
                          className="w-full h-full object-cover"
                        />
                        {lesson.is_featured && (
                          <div className="absolute top-2 left-0 z-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-r-md shadow-md">
                            おすすめ
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeClick(lesson.id);
                          }}
                          className={`absolute bottom-2 right-2 p-2 rounded-full shadow-sm transition-colors ${
                            favorites.includes(lesson.id) 
                              ? "bg-primary text-white" 
                              : "bg-white/80 text-gray-600 hover:bg-white"
                          }`}
                        >
                          <Heart className="h-5 w-5" fill={favorites.includes(lesson.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                    <div className="p-6 sm:w-3/4 lg:w-4/5">
                      <div className="flex flex-col sm:flex-row justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {lesson.lesson_title}
                          </h3>
                          <div className="flex items-center mt-2 space-x-2">
                            <div className="relative w-6 h-6 rounded-full overflow-hidden ring-2 ring-primary/20 bg-muted flex items-center justify-center">
                              {lesson.instructor.profile_image_url ? (
                                <img
                                  src={lesson.instructor.profile_image_url}
                                  alt={lesson.instructor.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs">👨‍🏫</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground/80">
                              {lesson.instructor.name}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-col items-start sm:items-end">
                          <div className="text-xs text-foreground/60">受講料</div>
                          <div className="font-bold text-primary text-lg">
                            {formatCurrency(lesson.price)}
                          </div>
                          <div className="text-xs text-foreground/70 flex items-center mt-1">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {lesson.current_participants_count}/{lesson.capacity}名
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <div className="flex items-center text-xs text-foreground/70 bg-muted px-2 py-1 rounded-md">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{lesson.lesson_slots.find(slot => 
                            slot.status === 'published' && 
                            new Date(slot.date_time_start) > new Date()
                          ) ? new Date(lesson.lesson_slots.find(slot => 
                            slot.status === 'published' && 
                            new Date(slot.date_time_start) > new Date()
                          ).date_time_start).toLocaleDateString() : '日付未定'}</span>
                        </div>
                        <div className="flex items-center text-xs text-foreground/70 bg-muted px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          <span>{lesson.lesson_slots.find(slot => 
                            slot.status === 'published' && 
                            new Date(slot.date_time_start) > new Date()
                          ) ? new Date(lesson.lesson_slots.find(slot => 
                            slot.status === 'published' && 
                            new Date(slot.date_time_start) > new Date()
                          ).date_time_start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '時間未定'}</span>
                        </div>
                        <div className="flex items-center text-xs text-foreground/70 bg-muted px-2 py-1 rounded-md">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          <span>{lesson.location_type === 'online' ? 'オンライン' : lesson.location_name}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{lesson.lesson_description}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2 px-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/lessons/${lesson.id}`);
                        }}
                      >
                        詳細を見る <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Popular instructors section */}
      {popularInstructors.length > 0 && (
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/30 -mx-8 px-8 py-12 rounded-xl">
          <SectionHeading
            title="人気の講師"
            description="経験豊富な講師陣からお好みの講師を見つけましょう"
            align="center"
            withLine={true}
            icon={<Award className="h-6 w-6" />}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {popularInstructors.map((instructor) => (
              <Card 
                key={instructor.id}
                className="overflow-hidden card-hover"
              >
                <div className="aspect-square w-full relative overflow-hidden">
                  <img
                    src={instructor.profile_image_url || 'https://placehold.jp/FF7F50/ffffff/400x400.png?text=講師'}
                    alt={instructor.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground">{instructor.name}</h3>
                  <p className="text-sm text-primary font-medium mt-1">
                    {instructor.category || 'マルチカテゴリー'}
                  </p>
                  <p className="mt-3 text-sm text-foreground/70 line-clamp-2">
                    {instructor.instructor_pr_message || 'プロフィールをご覧ください'}
                  </p>
                  <Button className="w-full mt-4" variant="outline" size="sm">
                    プロフィールを見る
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CTA section */}
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold gradient-heading mb-4">あなたも講師になってみませんか？</h2>
        <p className="text-lg text-foreground/80 mb-6 max-w-2xl mx-auto">
          あなたのスキルや知識を共有して、地域のコミュニティに貢献しましょう。
          講師として登録すると、自分のペースでレッスンを提供できます。
        </p>
        <Button 
          asChild 
          size="lg" 
          variant="gradient"
          className="px-8"
        >
          <Link to="/instructor">講師として始める</Link>
        </Button>
      </section>
    </div>
  );
};

export default UserHome;