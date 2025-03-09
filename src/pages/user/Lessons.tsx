import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/section-heading';
// Importing card components used in this file
import { Card, CardContent } from '@/components/ui/card';
// Note: LessonCard is defined but never used in this file
import { Button } from '@/components/ui/button';
import { Search, Filter, Calendar, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange, DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const UserLessons = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  
  // レッスン形式フィルター
  const [selectedLessonTypes, setSelectedLessonTypes] = useState<{
    monthly: boolean;
    single_course: boolean;
  }>({ monthly: true, single_course: true });
  
  // 対面/オンラインフィルター
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<{
    in_person: boolean;
    online: boolean;
  }>({ in_person: true, online: true });
  
  // エリアフィルター
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  // This state is managed by selectedLocationTypes.in_person
  const [_, setShowAreaFilter] = useState(false);
  
  // 日程フィルター
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  
  // 価格フィルター
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<{
    monthly: string[];
    single_course: string[];
  }>({ 
    monthly: [], 
    single_course: [] 
  });
  
  // 各フィルターセクションの開閉状態
  const [expandedSections, setExpandedSections] = useState({
    lessonFormat: true,
    area: true,
    date: true,
    price: true,
    category: true
  });
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get current date in ISO format
        const now = new Date().toISOString();
        
        // Fetch lessons with instructor info and lesson slots
        const { data: lessonData, error } = await supabase
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
            ),
            lesson_slots!inner(*)
          `)
          .eq('status', 'published')
          .eq('lesson_slots.status', 'published')
          .gte('lesson_slots.date_time_start', now);
          
        if (error) {
          console.error('Error fetching lessons:', error);
          throw error;
        }
        
        // Add review count directly to each lesson, set to 0 for now
        let data = lessonData ? lessonData.map(lesson => ({
          ...lesson,
          review_count: 0
        })) : [];
        
        // This approach doesn't use group by, which was causing problems
        if (lessonData && lessonData.length > 0) {
          // For now, we'll just set review counts to 0 to avoid the error
          // In a future update, we could add a stored procedure or use a more complex query
          // to get the actual review counts
          console.log('Setting review counts to 0 - actual counts will be added in a future update');
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
  
  // 北摂エリアの市町村リスト
  const kitasetsuAreas = [
    '豊中市', '吹田市', '茨木市', '高槻市', '箕面市', '摂津市', '島本町', '豊能町', '能勢町'
  ];

  // 単発・コース講座の価格帯
  const singleCoursePriceRanges = [
    { id: 'under1000', label: '〜1,000円', min: 0, max: 1000 },
    { id: '1000to3000', label: '1,000円〜3,000円', min: 1000, max: 3000 },
    { id: '3000to5000', label: '3,000円〜5,000円', min: 3000, max: 5000 },
    { id: '5000to10000', label: '5,000円〜10,000円', min: 5000, max: 10000 },
    { id: 'over10000', label: '10,000円以上', min: 10000, max: Infinity }
  ];

  // 月謝制の価格帯
  const monthlyPriceRanges = [
    { id: 'under5000', label: '5,000円/月', min: 0, max: 5000 },
    { id: '5000to10000', label: '5,000円〜10,000円/月', min: 5000, max: 10000 },
    { id: '10000to20000', label: '10,000円〜20,000円/月', min: 10000, max: 20000 },
    { id: 'over20000', label: '20,000円以上/月', min: 20000, max: Infinity }
  ];

  // フィルターセクションの開閉を切り替える関数
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // サブカテゴリーの展開を切り替える関数
  const toggleSubCategory = (categoryId: string) => {
    setExpandedSubCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // 価格範囲の選択をすべて切り替える関数
  const toggleAllPriceRanges = (type: 'monthly' | 'single_course') => {
    const priceRanges = type === 'monthly' ? monthlyPriceRanges : singleCoursePriceRanges;
    const allIds = priceRanges.map(range => range.id);
    
    if (selectedPriceRanges[type].length === allIds.length) {
      // すべて選択されている場合は解除
      setSelectedPriceRanges(prev => ({
        ...prev,
        [type]: []
      }));
    } else {
      // 一部または未選択の場合はすべて選択
      setSelectedPriceRanges(prev => ({
        ...prev,
        [type]: [...allIds]
      }));
    }
  };

  // レッスンをフィルタリングする関数
  const filteredLessons = lessons
    .filter(lesson => {
      // カテゴリーフィルタリング
      if (selectedCategory && lesson.category !== selectedCategory) {
        return false;
      }
      
      // サブカテゴリーフィルタリング
      if (selectedSubCategories.length > 0) {
        // lesson.sub_categoryはサブカテゴリーのIDを含む（例: "piano,guitar"）
        const lessonSubCategories = lesson.sub_category ? lesson.sub_category.split(',') : [];
        // 選択されたサブカテゴリーのいずれかと一致するかチェック
        if (!selectedSubCategories.some(subCat => lessonSubCategories.includes(subCat))) {
          return false;
        }
      }
      
      // レッスンタイプフィルタリング
      const isMonthly = lesson.lesson_type === 'monthly';
      const isSingleCourse = lesson.lesson_type === 'one_time' || lesson.lesson_type === 'course';
      
      if ((isMonthly && !selectedLessonTypes.monthly) || 
          (isSingleCourse && !selectedLessonTypes.single_course)) {
        return false;
      }
      
      // 対面/オンラインフィルタリング
      const isInPerson = lesson.location_type === 'in_person' || lesson.location_type === 'hybrid' || lesson.location_type === 'offline';
      const isOnline = lesson.location_type === 'online' || lesson.location_type === 'hybrid';
      
      if ((isInPerson && !selectedLocationTypes.in_person) || 
          (isOnline && !selectedLocationTypes.online)) {
        return false;
      }
      
      // エリアフィルタリング
      if (selectedLocationTypes.in_person && selectedAreas.length > 0 && isInPerson) {
        // エリアが選択されているが、レッスンのエリアが含まれていない場合
        if (!selectedAreas.some(area => lesson.classroom_area?.includes(area))) {
          return false;
        }
      }
      
      // 日程フィルタリング
      if (dateRange?.from && dateRange?.to) {
        // レッスンスロットのいずれかが選択された日付範囲内に予約可能かどうかをチェック
        const hasSlotInRange = lesson.lesson_slots?.some((slot: any) => {
          const slotDate = new Date(slot.date_time_start);
          return (
            slotDate >= dateRange.from! && 
            slotDate <= dateRange.to! && 
            slot.status === 'published'
          );
        });
        
        if (!hasSlotInRange) {
          return false;
        }
      }
      
      // 価格フィルタリング
      if (isMonthly && selectedPriceRanges.monthly.length > 0) {
        const price = lesson.price || 0;
        const matchesPriceRange = selectedPriceRanges.monthly.some(rangeId => {
          const range = monthlyPriceRanges.find(r => r.id === rangeId);
          return range && price >= range.min && price <= range.max;
        });
        
        if (!matchesPriceRange) {
          return false;
        }
      } else if (isSingleCourse && selectedPriceRanges.single_course.length > 0) {
        const price = lesson.price || 0;
        const matchesPriceRange = selectedPriceRanges.single_course.some(rangeId => {
          const range = singleCoursePriceRanges.find(r => r.id === rangeId);
          return range && price >= range.min && price <= range.max;
        });
        
        if (!matchesPriceRange) {
          return false;
        }
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

  // 並び替えオプション
  const [sortOption, setSortOption] = useState<string>("standard");

  // 並び替え関数
  const sortLessons = (lessons: any[]) => {
    switch (sortOption) {
      case "rating":
        return [...lessons].sort((a, b) => (b.instructor_profiles?.average_rating || 0) - (a.instructor_profiles?.average_rating || 0));
      case "reviews":
        return [...lessons].sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
      case "price_asc":
        return [...lessons].sort((a, b) => (a.price || 0) - (b.price || 0));
      default:
        // 標準（プレミアムプランのレッスンを優先表示）
        return [...lessons].sort((a, b) => {
          // まずはis_featuredでソート（featuredが上）
          const aFeatured = a.is_featured ? 1 : 0;
          const bFeatured = b.is_featured ? 1 : 0;
          
          if (bFeatured !== aFeatured) {
            return bFeatured - aFeatured;
          }
          
          // featuredが同じ場合は評価でソート
          return (b.instructor_profiles?.average_rating || 0) - (a.instructor_profiles?.average_rating || 0);
        });
    }
  };

  // ページネーション用のステート
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 表示用のレッスンをソート
  const sortedAndFilteredLessons = sortLessons(filteredLessons);

  // 現在のページのレッスンを計算
  const indexOfLastLesson = currentPage * itemsPerPage;
  const indexOfFirstLesson = indexOfLastLesson - itemsPerPage;
  const currentLessons = sortedAndFilteredLessons.slice(indexOfFirstLesson, indexOfLastLesson);
  const totalPages = Math.ceil(sortedAndFilteredLessons.length / itemsPerPage);

  // ページを変更する関数
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // 検索条件やフィルタが変更されたら、ページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubCategories, selectedLessonTypes, 
      selectedLocationTypes, selectedAreas, dateRange, selectedPriceRanges, sortOption]);

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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <Calendar className="h-4 w-4 mr-1" />
            日付
          </Button>
        </div>
      </PageHeader>
      
      {/* Search, Filters, and Lessons with Sidebar Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with Filters */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 sticky top-4 space-y-4">
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
            
            {/* ①授業形式から探す */}
            <div className="border-t border-gray-100 pt-4">
              <button 
                className="flex items-center justify-between w-full text-left mb-2"
                onClick={() => toggleSection('lessonFormat')}
              >
                <h4 className="font-medium text-gray-800">①授業形式から探す</h4>
                {expandedSections.lessonFormat ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.lessonFormat && (
                <div className="space-y-4 mt-2">
                  {/* 月謝制/単発・コース講座 */}
                  <div className="ml-2">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">レッスン形式</h5>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="type-monthly"
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedLessonTypes.monthly}
                          onChange={(e) => setSelectedLessonTypes(prev => ({
                            ...prev,
                            monthly: e.target.checked
                          }))}
                        />
                        <label htmlFor="type-monthly" className="ml-2 text-sm text-gray-700">月謝制</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="type-single-course"
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedLessonTypes.single_course}
                          onChange={(e) => setSelectedLessonTypes(prev => ({
                            ...prev,
                            single_course: e.target.checked
                          }))}
                        />
                        <label htmlFor="type-single-course" className="ml-2 text-sm text-gray-700">単発・コース講座</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* 対面/オンライン */}
                  <div className="ml-2">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">受講形式</h5>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="location-inperson"
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedLocationTypes.in_person}
                          onChange={(e) => {
                            setSelectedLocationTypes(prev => ({
                              ...prev,
                              in_person: e.target.checked
                            }));
                            setShowAreaFilter(e.target.checked);
                          }}
                        />
                        <label htmlFor="location-inperson" className="ml-2 text-sm text-gray-700">対面</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="location-online"
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedLocationTypes.online}
                          onChange={(e) => setSelectedLocationTypes(prev => ({
                            ...prev,
                            online: e.target.checked
                          }))}
                        />
                        <label htmlFor="location-online" className="ml-2 text-sm text-gray-700">オンライン</label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ②エリアから探す (対面選択時のみ表示) */}
            {selectedLocationTypes.in_person && (
              <div className="border-t border-gray-100 pt-4">
                <button 
                  className="flex items-center justify-between w-full text-left mb-2"
                  onClick={() => toggleSection('area')}
                >
                  <h4 className="font-medium text-gray-800">②エリアから探す</h4>
                  {expandedSections.area ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.area && (
                  <div className="space-y-2 mt-2 ml-2">
                    {kitasetsuAreas.map(area => (
                      <div key={area} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`area-${area}`}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={selectedAreas.includes(area)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAreas(prev => [...prev, area]);
                            } else {
                              setSelectedAreas(prev => prev.filter(a => a !== area));
                            }
                          }}
                        />
                        <label htmlFor={`area-${area}`} className="ml-2 text-sm text-gray-700">{area}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* ③予約可能な日程から探す */}
            <div className="border-t border-gray-100 pt-4">
              <button 
                className="flex items-center justify-between w-full text-left mb-2"
                onClick={() => toggleSection('date')}
              >
                <h4 className="font-medium text-gray-800">③予約可能な日程から探す</h4>
                {expandedSections.date ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.date && (
                <div className="mt-2 ml-2">
                  <div className="flex flex-col space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full justify-start"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {dateRange?.from && dateRange?.to ? (
                        `${format(dateRange.from, 'yyyy/MM/dd', { locale: ja })} - ${format(dateRange.to, 'yyyy/MM/dd', { locale: ja })}`
                      ) : '日付を選択'}
                    </Button>
                    
                    {showCalendar && (
                      <div className="p-2 border rounded-md bg-white shadow-md">
                        <div className="text-sm text-gray-500 mb-2">期間を選択してください</div>
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          locale={ja}
                          numberOfMonths={1}
                          className="border-none shadow-none"
                          styles={{
                            caption: { color: 'var(--primary)' },
                            day_selected: { backgroundColor: 'var(--primary)' },
                            day_today: { color: 'var(--primary)' }
                          }}
                        />
                        <div className="flex justify-end mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDateRange(undefined);
                              setShowCalendar(false);
                            }}
                            className="mr-2"
                          >
                            クリア
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setShowCalendar(false)}
                          >
                            適用
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* ④価格で絞り込む */}
            <div className="border-t border-gray-100 pt-4">
              <button 
                className="flex items-center justify-between w-full text-left mb-2"
                onClick={() => toggleSection('price')}
              >
                <h4 className="font-medium text-gray-800">④価格で絞り込む</h4>
                {expandedSections.price ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.price && (
                <div className="space-y-4 mt-2 ml-2">
                  {/* 単発・コース講座の価格（月謝制が選択されていない場合） */}
                  {selectedLessonTypes.single_course && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700">価格で絞り込む</h5>
                        <button 
                          className="text-xs text-primary hover:underline"
                          onClick={() => toggleAllPriceRanges('single_course')}
                        >
                          すべて選択 / 解除
                        </button>
                      </div>
                      <div className="space-y-2">
                        {singleCoursePriceRanges.map(range => (
                          <div key={range.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`price-${range.id}`}
                              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                              checked={selectedPriceRanges.single_course.includes(range.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPriceRanges(prev => ({
                                    ...prev,
                                    single_course: [...prev.single_course, range.id]
                                  }));
                                } else {
                                  setSelectedPriceRanges(prev => ({
                                    ...prev,
                                    single_course: prev.single_course.filter(id => id !== range.id)
                                  }));
                                }
                              }}
                            />
                            <label htmlFor={`price-${range.id}`} className="ml-2 text-sm text-gray-700">{range.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 月謝制の価格（月謝制が選択されている場合） */}
                  {selectedLessonTypes.monthly && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700">価格で絞り込む（月謝）</h5>
                        <button 
                          className="text-xs text-primary hover:underline"
                          onClick={() => toggleAllPriceRanges('monthly')}
                        >
                          すべて選択 / 解除
                        </button>
                      </div>
                      <div className="space-y-2">
                        {monthlyPriceRanges.map(range => (
                          <div key={range.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`monthly-price-${range.id}`}
                              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                              checked={selectedPriceRanges.monthly.includes(range.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPriceRanges(prev => ({
                                    ...prev,
                                    monthly: [...prev.monthly, range.id]
                                  }));
                                } else {
                                  setSelectedPriceRanges(prev => ({
                                    ...prev,
                                    monthly: prev.monthly.filter(id => id !== range.id)
                                  }));
                                }
                              }}
                            />
                            <label htmlFor={`monthly-price-${range.id}`} className="ml-2 text-sm text-gray-700">{range.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ⑤カテゴリーから探す */}
            <div className="border-t border-gray-100 pt-4">
              <button 
                className="flex items-center justify-between w-full text-left mb-2"
                onClick={() => toggleSection('category')}
              >
                <h4 className="font-medium text-gray-800">⑤カテゴリーから探す</h4>
                {expandedSections.category ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.category && (
                <div className="space-y-2 mt-2 ml-2">
                  {CATEGORIES.map(category => (
                    <div key={category.id}>
                      <button 
                        className="flex items-center justify-between w-full text-left py-1"
                        onClick={() => {
                          setSelectedCategory(selectedCategory === category.id ? null : category.id);
                          toggleSubCategory(category.id);
                        }}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id={`category-${category.id}`}
                            name="category"
                            checked={selectedCategory === category.id}
                            onChange={() => setSelectedCategory(category.id)}
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label htmlFor={`category-${category.id}`} className="ml-2 text-sm text-gray-700 flex items-center">
                            <span className="mr-1">{category.icon}</span>
                            {category.name}
                          </label>
                        </div>
                        {expandedSubCategories[category.id] ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      
                      {/* サブカテゴリー（展開時のみ表示） */}
                      {expandedSubCategories[category.id] && (
                        <div className="ml-6 space-y-1 mt-1 mb-2">
                          {/* 実際のサブカテゴリーデータを使用 */}
                          {SUBCATEGORIES[category.id]?.map(subCat => (
                            <div key={`${category.id}-${subCat.id}`} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`subcat-${category.id}-${subCat.id}`}
                                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                checked={selectedSubCategories.includes(subCat.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubCategories(prev => [...prev, subCat.id]);
                                  } else {
                                    setSelectedSubCategories(prev => prev.filter(sc => sc !== subCat.id));
                                  }
                                }}
                              />
                              <label htmlFor={`subcat-${category.id}-${subCat.id}`} className="ml-2 text-xs text-gray-600">
                                {subCat.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Clear filters button */}
            <div className="border-t border-gray-100 pt-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setSelectedSubCategories([]);
                  setSelectedLessonTypes({ monthly: true, single_course: true });
                  setSelectedLocationTypes({ in_person: true, online: true });
                  setSelectedAreas([]);
                  setDateRange(undefined);
                  setSelectedPriceRanges({ monthly: [], single_course: [] });
                }}
                className="w-full"
              >
                絞り込みをリセット
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="col-span-12 md:col-span-9 lg:col-span-9">
          {/* 検索結果情報とソートオプション */}
          <div className="bg-white p-3 mb-4 border border-gray-100 rounded-lg shadow-sm flex flex-wrap justify-between items-center">
            <div className="text-sm text-gray-700">
              {sortedAndFilteredLessons.length > 0 ? (
                <span>{indexOfFirstLesson + 1}～{Math.min(indexOfLastLesson, sortedAndFilteredLessons.length)}件を表示／全{sortedAndFilteredLessons.length}件</span>
              ) : (
                <span>0件</span>
              )}
              {selectedLessonTypes.single_course && !selectedLessonTypes.monthly && (
                <span className="ml-3">レッスンタイプ：形式：コース</span>
              )}
              {selectedLocationTypes.in_person && !selectedLocationTypes.online && (
                <span className="ml-3">レッスンタイプ：対面</span>
              )}
            </div>
            
            <div className="flex mt-2 md:mt-0">
              <div className="flex rounded-md overflow-hidden border border-gray-200">
                <button 
                  className={`px-3 py-1.5 text-sm ${sortOption === 'standard' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setSortOption('standard')}
                >
                  標準
                </button>
                <button 
                  className={`px-3 py-1.5 text-sm border-l border-gray-200 ${sortOption === 'rating' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setSortOption('rating')}
                >
                  口コミ評価の高い順
                </button>
                <button 
                  className={`px-3 py-1.5 text-sm border-l border-gray-200 ${sortOption === 'reviews' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setSortOption('reviews')}
                >
                  口コミが多い順
                </button>
                <button 
                  className={`px-3 py-1.5 text-sm border-l border-gray-200 ${sortOption === 'price_asc' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setSortOption('price_asc')}
                >
                  料金が安い順
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-16 h-16 relative">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-lg text-foreground/70 animate-pulse">レッスン読込中...</p>
            </div>
          ) : sortedAndFilteredLessons.length > 0 ? (
            <div className="space-y-6">
              {currentLessons.map((lesson) => (
                <div key={lesson.id} className={`bg-white rounded-lg shadow-sm border ${lesson.is_featured ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-100'} hover:shadow-md transition-shadow`}>
                  <div className="flex flex-col md:flex-row p-4">
                    {/* 左側：画像 */}
                    <div className="md:w-1/4 mb-4 md:mb-0">
                      <div className="aspect-square overflow-hidden rounded-lg relative">
                        <img 
                          src={lesson.lesson_image_url?.[0] || 'https://placehold.jp/FF7F50/ffffff/400x400.png?text=レッスン画像'} 
                          alt={lesson.lesson_title} 
                          className="w-full h-full object-cover"
                        />
                        
                        {lesson.is_featured && (
                          <div className="absolute top-2 left-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-r-md shadow-md">
                            おすすめ
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 右側：レッスン情報 */}
                    <div className="md:w-3/4 md:pl-6 flex flex-col">
                      <h3 className="font-bold text-lg text-gray-900">{lesson.lesson_title}</h3>
                      
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="inline-block">
                          大阪府{lesson.classroom_city || '茨木市'}
                        </span>
                      </div>
                      
                      {/* タグ表示 - カテゴリー、サブカテゴリー、レッスン形式、受講形式 */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* カテゴリータグ */}
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                          {lesson.category_name || CATEGORIES.find(c => c.id === lesson.category)?.name || lesson.category || 'カテゴリーなし'}
                        </span>
                        
                        {/* サブカテゴリータグ */}
                        {lesson.sub_category && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
                            {(() => {
                              const subCatId = lesson.sub_category.split(',')[0]; // 最初のサブカテゴリー
                              const category = CATEGORIES.find(c => c.id === lesson.category);
                              if (category && SUBCATEGORIES[category.id]) {
                                const subCat = SUBCATEGORIES[category.id].find(sc => sc.id === subCatId);
                                return subCat ? subCat.name : subCatId;
                              }
                              return subCatId;
                            })()}
                          </span>
                        )}
                        
                        {/* レッスン形式タグ */}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          lesson.lesson_type === 'monthly' ? 'bg-green-100 text-green-800' : 
                          lesson.lesson_type === 'course' ? 'bg-orange-100 text-orange-800' : 
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {lesson.lesson_type === 'monthly' ? '月謝制' : 
                           lesson.lesson_type === 'course' ? 'コース講座' : '単発講座'}
                        </span>
                        
                        {/* 受講形式タグ */}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          lesson.location_type === 'online' ? 'bg-teal-100 text-teal-800' : 
                          lesson.location_type === 'hybrid' ? 'bg-amber-100 text-amber-800' : 
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {lesson.location_type === 'online' ? 'オンライン' : 
                           lesson.location_type === 'hybrid' ? 'オンライン / 対面' : '対面'}
                        </span>
                      </div>
                      
                      {/* レビュー情報 */}
                      <div className="flex items-center mt-3">
                        <div className="flex items-center">
                          {Array(5).fill(0).map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" 
                                className={`h-4 w-4 ${i < Math.round(lesson.instructor_profiles?.average_rating || 5) ? 'text-yellow-500' : 'text-gray-300'}`} 
                                viewBox="0 0 24 24" fill="currentColor" stroke="none">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                          ))}
                          <span className="ml-1 text-sm text-gray-700">{lesson.instructor_profiles?.average_rating?.toFixed(1) || '5.0'}</span>
                          <span className="mx-1 text-gray-400">|</span>
                          <span className="text-sm text-gray-700">レビュー{lesson.review_count || 0}件</span>
                        </div>
                        
                        <div className="ml-4 text-sm text-gray-700">
                          <span className="font-semibold text-black">
                            ¥{lesson.price?.toLocaleString()}
                          </span>
                          {lesson.lesson_type === 'monthly' && <span>〜/月</span>}
                        </div>
                      </div>
                      
                      {/* 講師情報 */}
                      <div className="flex items-center mt-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                          {lesson.instructor_profiles?.profile_image_url ? (
                            <img 
                              src={lesson.instructor_profiles.profile_image_url}
                              alt={lesson.instructor_profiles.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                              {lesson.instructor_profiles?.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{lesson.instructor_profiles?.name || '講師名'}</span>
                        {lesson.instructor_profiles?.is_verified && (
                          <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 rounded-full flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            認証済
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                        {lesson.lesson_catchphrase || lesson.lesson_description?.substring(0, 120) || '説明文がありません。'}
                      </p>
                      
                      <div className="mt-auto pt-4 flex justify-between items-center">
                        <button 
                          onClick={() => navigate(`/user/lessons/${lesson.id}`)}
                          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          詳細を見る
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeClick(lesson.id);
                          }}
                          className={`flex items-center gap-1 px-4 py-2 rounded-md border ${
                            favorites.includes(lesson.id) 
                              ? 'bg-pink-50 border-pink-200 text-pink-600' 
                              : 'bg-white border-gray-200 text-gray-700'
                          } hover:bg-gray-50 transition-colors text-sm`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favorites.includes(lesson.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                          受けたい
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center space-x-1">
                    <button
                      onClick={() => paginate(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => {
                      // 最大5ページ分だけ表示する
                      if (
                        i === 0 || // 最初のページ
                        i === totalPages - 1 || // 最後のページ
                        (i >= currentPage - 2 && i <= currentPage + 2) // 現在のページの前後2ページ
                      ) {
                        return (
                          <button
                            key={i + 1}
                            onClick={() => paginate(i + 1)}
                            className={`px-4 py-2 rounded ${
                              currentPage === i + 1
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      } else if (
                        (i === 1 && currentPage > 3) ||
                        (i === totalPages - 2 && currentPage < totalPages - 3)
                      ) {
                        // 省略記号を表示
                        return <span key={i + 1} className="px-3 py-2">...</span>;
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              )}
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