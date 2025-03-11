import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Star, Heart, Users, Clock, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';
import { LessonSidebar, monthlyPriceRanges, singleCoursePriceRanges } from '@/components/filters/LessonSidebar';

// Types
interface Lesson {
  id: string;
  lesson_title: string;
  lesson_catchphrase: string;
  lesson_description: string;
  category: string;
  sub_category: string;
  price: number;
  duration: number;
  capacity: number;
  location_type: string;
  location_name: string;
  classroom_area: string;
  classroom_city: string;
  lesson_type: string;
  is_free_trial: boolean;
  lesson_image_url: string[];
  instructor_profiles: {
    id: string;
    name: string;
    profile_image_url: string;
    average_rating: number;
    is_verified: boolean;
    instructor_bio: string;
  };
  lesson_slots: LessonSlot[];
  review_count: number;
  is_featured: boolean;
}

interface LessonSlot {
  id: string;
  date_time_start: string;
  date_time_end: string;
  capacity: number;
  booked_count: number;
  status: string;
  booking_deadline: string;
}

const UserLessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const lessonsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // マウス位置に基づいてホバーされたカードを検出する関数
  const handleMouseMove = (e: MouseEvent) => {
    if (!lessonsContainerRef.current) return;
    
    // マウス座標を取得
    const { clientX, clientY } = e;
    
    // コンテナ内の全てのレッスンカード要素を取得
    const lessonCards = lessonsContainerRef.current.querySelectorAll('.lesson-card');
    
    // マウス位置に一番近いカードを見つける
    let hoveredCard: Element | null = null;
    
    lessonCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        hoveredCard = card;
      }
    });
    
    // ホバーされたカードのIDを設定
    if (hoveredCard) {
      setHoveredCardId(hoveredCard.getAttribute('data-lesson-id'));
    } else {
      setHoveredCardId(null);
    }
  };
  
  // イベントリスナーの設定と解除
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTab, setSelectedTab] = useState<'online' | 'in_person'>('online');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'popular' | 'new' | 'date'>('recommended');
  
  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);
  
  // Lesson type filter
  const [selectedLessonTypes, setSelectedLessonTypes] = useState<{
    monthly: boolean;
    single_course: boolean;
  }>({ monthly: true, single_course: true });
  
  // Location type filter
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<{
    in_person: boolean;
    online: boolean;
  }>({ in_person: true, online: true });
  
  // Area filter
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showAreaFilter, setShowAreaFilter] = useState(true);
  
  // Date filter states
  const [allDates, setAllDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<{
    monthly: string[];
    single_course: string[];
  }>({ 
    monthly: [], 
    single_course: [] 
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
              instructor_bio,
              is_verified,
              average_rating
            ),
            lesson_slots(*)
          `)
          .eq('status', 'published')
          .eq('lesson_slots.status', 'published')
          .gte('lesson_slots.date_time_start', now);
          
        if (error) {
          console.error('Error fetching lessons:', error);
          throw error;
        }
        
        // Add review counts 
        let data = lessonData ? lessonData.map(lesson => ({
          ...lesson,
          review_count: Math.floor(Math.random() * 1500) + 100 // Mock data
        })) : [];
        
        console.log('Fetched lessons:', data?.length || 0);
        
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

  // Set available subcategories when category changes
  useEffect(() => {
    if (selectedCategory && 
        (selectedCategory === 'language' || 
         selectedCategory === 'art' || 
         selectedCategory === 'music' || 
         selectedCategory === 'programming' || 
         selectedCategory === 'academic')) {
      setAvailableSubcategories(SUBCATEGORIES[selectedCategory]);
    } else {
      setAvailableSubcategories([]);
    }
  }, [selectedCategory]);

  const handleLikeClick = async (e: React.MouseEvent, lessonId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  // Filter lessons based on selected criteria
  const filteredLessons = lessons.filter(lesson => {
    // Filter by keyword
    if (searchKeyword && !lesson.lesson_title.toLowerCase().includes(searchKeyword.toLowerCase()) &&
       !lesson.lesson_description?.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    
    // Filter by location type (online/in_person)
    const isOnline = lesson.location_type === 'online';
    const isOffline = lesson.location_type === 'in_person';
    
    // エリア絞り込みが選択されている場合、オンラインレッスンは除外
    if (selectedAreas.length > 0 && isOnline) {
      return false;
    }
    
    if (selectedLocationTypes.online && !selectedLocationTypes.in_person && !isOnline) {
      return false;
    }
    
    if (!selectedLocationTypes.online && selectedLocationTypes.in_person && !isOffline) {
      return false;
    }
    
    if (!selectedLocationTypes.online && !selectedLocationTypes.in_person) {
      return false;
    }
    
    // Filter by lesson type
    const isMonthly = lesson.lesson_type === 'monthly';
    const isSingleCourse = lesson.lesson_type === 'one_time' || lesson.lesson_type === 'course';
    
    if (selectedLessonTypes.monthly && !selectedLessonTypes.single_course && !isMonthly) {
      return false;
    }
    
    if (!selectedLessonTypes.monthly && selectedLessonTypes.single_course && !isSingleCourse) {
      return false;
    }
    
    if (!selectedLessonTypes.monthly && !selectedLessonTypes.single_course) {
      return false;
    }
    
    // Filter by category
    if (selectedCategory && lesson.category !== selectedCategory) {
      return false;
    }
    
    // Filter by subcategory
    if (selectedSubCategories.length > 0) {
      // 選択されたサブカテゴリのIDからサブカテゴリ名を取得
      const selectedSubCategoryNames = selectedSubCategories.map(subCatId => {
        const subCategory = SUBCATEGORIES[selectedCategory]?.find(sc => sc.id === subCatId);
        return subCategory?.name;
      }).filter(Boolean);
      
      // レッスンのサブカテゴリー（単一の文字列）と比較
      if (!selectedSubCategoryNames.includes(lesson.sub_category)) {
        return false;
      }
    }
    
    // Filter by area (if in_person and areas are selected)
    if (isOffline && selectedAreas.length > 0) {
      if (!selectedAreas.some(area => {
        return lesson.classroom_area === area || 
               lesson.classroom_city === area;
      })) {
        return false;
      }
    }
    
    // Filter by date
    if (!allDates && startDate && endDate) {
      const start = new Date(startDate);
      // Set hours to 0 for start date to include entire day
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      // Set hours to 23:59:59.999 for end date to include entire day
      end.setHours(23, 59, 59, 999);
      
      // Check if any lesson slot is within the selected date range (inclusive)
      const hasSlotInRange = lesson.lesson_slots.some(slot => {
        const slotDate = new Date(slot.date_time_start);
        return slotDate >= start && slotDate <= end;
      });
      
      if (!hasSlotInRange) {
        return false;
      }
    }
    
    // Filter by price range
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
    
    // Filter by custom price range
    if (minPrice && parseFloat(minPrice) > lesson.price) {
      return false;
    }
    if (maxPrice && parseFloat(maxPrice) < lesson.price) {
      return false;
    }
    
    return true;
  });

  // Sort lessons
  const sortedLessons = [...filteredLessons].sort((a, b) => {
    switch (selectedSort) {
      case 'popular':
        return (b.review_count || 0) - (a.review_count || 0);
      case 'new':
        // Sort by newest (using random for demo)
        return Math.random() - 0.5;
      case 'date':
        // Sort by closest upcoming date
        const aDate = a.lesson_slots[0]?.date_time_start ? new Date(a.lesson_slots[0].date_time_start) : new Date();
        const bDate = b.lesson_slots[0]?.date_time_start ? new Date(b.lesson_slots[0].date_time_start) : new Date();
        return aDate.getTime() - bDate.getTime();
      default:
        // Default sort (recommended) - featured first, then by rating
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (b.instructor_profiles?.average_rating || 0) - (a.instructor_profiles?.average_rating || 0);
    }
  });

  // Pagination
  const indexOfLastLesson = currentPage * itemsPerPage;
  const indexOfFirstLesson = indexOfLastLesson - itemsPerPage;
  const currentLessons = sortedLessons.slice(indexOfFirstLesson, indexOfLastLesson);
  const totalPages = Math.ceil(sortedLessons.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for search submission
  };

  const resetAllFilters = () => {
    setSearchKeyword('');
    setSelectedCategory(null);
    setSelectedSubCategories([]);
    setSelectedLessonTypes({ monthly: true, single_course: true });
    setSelectedLocationTypes({ in_person: true, online: true });
    setSelectedAreas([]);
    setAllDates(true);
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedPriceRanges({ monthly: [], single_course: [] });
  };

  return (
    <div className="flex">
      {/* Left sidebar */}
      <LessonSidebar 
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        selectedLessonTypes={selectedLessonTypes}
        setSelectedLessonTypes={setSelectedLessonTypes}
        selectedLocationTypes={selectedLocationTypes}
        setSelectedLocationTypes={setSelectedLocationTypes}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSubCategories={selectedSubCategories}
        setSelectedSubCategories={setSelectedSubCategories}
        expandedSubCategories={expandedSubCategories}
        setExpandedSubCategories={setExpandedSubCategories}
        availableSubcategories={availableSubcategories}
        setAvailableSubcategories={setAvailableSubcategories}
        allDates={allDates}
        setAllDates={setAllDates}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        selectedPriceRanges={selectedPriceRanges}
        setSelectedPriceRanges={setSelectedPriceRanges}
        resetAllFilters={resetAllFilters}
        handleSearchSubmit={handleSearchSubmit}
      />
      
      {/* Divider */}
      <div className="border-l border-gray-300 min-h-screen"></div>
      
      {/* Main content */}
      <div className="flex-1 pl-4">
        <div>
          {/* Lesson count information */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              {filteredLessons.length > 0 ? (
                <>
                  <span className="font-medium">{indexOfFirstLesson + 1}～{Math.min(indexOfLastLesson, filteredLessons.length)}</span>件を表示 ／ 全 <span className="font-medium">{filteredLessons.length}</span>件
                </>
              ) : (
                <span>該当するレッスンがありません</span>
              )}
            </div>
            {/* Sort options */}
            <div className="flex border-b border-gray-200 text-sm">
              <button
                className={`px-4 py-2 ${selectedSort === 'recommended' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedSort('recommended')}
              >
                おすすめ順
              </button>
              <span className="text-gray-300 py-2">|</span>
              <button
                className={`px-4 py-2 ${selectedSort === 'popular' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedSort('popular')}
              >
                人気順
              </button>
              <span className="text-gray-300 py-2">|</span>
              <button
                className={`px-4 py-2 ${selectedSort === 'new' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedSort('new')}
              >
                新着順
              </button>
              <span className="text-gray-300 py-2">|</span>
              <button
                className={`px-4 py-2 ${selectedSort === 'date' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedSort('date')}
              >
                開催日順
              </button>
            </div>
          </div>

          {/* Filter tags display */}
          <div className="flex flex-wrap gap-2 mb-4">
            {searchKeyword && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">キーワード: {searchKeyword}</span>
                <button 
                  onClick={() => setSearchKeyword('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedCategory && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">カテゴリー: {CATEGORIES.find(cat => cat.id === selectedCategory)?.name}</span>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedSubCategories.map(subCat => {
              const categoryId = selectedCategory;
              const subCategoryName = SUBCATEGORIES[categoryId as keyof typeof SUBCATEGORIES]?.find(
                sc => sc.id === subCat
              )?.name;
              
              return (
                <div key={subCat} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  <span className="mr-1">サブカテゴリー: {subCategoryName}</span>
                  <button 
                    onClick={() => setSelectedSubCategories(prev => prev.filter(id => id !== subCat))}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            
            {!selectedLessonTypes.monthly && selectedLessonTypes.single_course && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">単発・コース講座のみ</span>
                <button 
                  onClick={() => setSelectedLessonTypes({monthly: true, single_course: true})}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedLessonTypes.monthly && !selectedLessonTypes.single_course && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">月謝制のみ</span>
                <button 
                  onClick={() => setSelectedLessonTypes({monthly: true, single_course: true})}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {!selectedLocationTypes.in_person && selectedLocationTypes.online && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">オンラインのみ</span>
                <button 
                  onClick={() => setSelectedLocationTypes({in_person: true, online: true})}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedLocationTypes.in_person && !selectedLocationTypes.online && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">対面のみ</span>
                <button 
                  onClick={() => setSelectedLocationTypes({in_person: true, online: true})}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedAreas.map(area => (
              <div key={area} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">エリア: {area}</span>
                <button 
                  onClick={() => setSelectedAreas(prev => prev.filter(a => a !== area))}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {!allDates && startDate && endDate && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">期間: {startDate} 〜 {endDate}</span>
                <button 
                  onClick={() => {
                    setAllDates(true);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {minPrice && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">最低価格: {minPrice}円</span>
                <button 
                  onClick={() => setMinPrice('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {maxPrice && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                <span className="mr-1">最高価格: {maxPrice}円</span>
                <button 
                  onClick={() => setMaxPrice('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {selectedPriceRanges.monthly.map(rangeId => {
              const range = monthlyPriceRanges.find(r => r.id === rangeId);
              return range ? (
                <div key={`monthly-${rangeId}`} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  <span className="mr-1">月謝: {range.label}</span>
                  <button 
                    onClick={() => setSelectedPriceRanges(prev => ({
                      ...prev,
                      monthly: prev.monthly.filter(id => id !== rangeId)
                    }))}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null;
            })}
            
            {selectedPriceRanges.single_course.map(rangeId => {
              const range = singleCoursePriceRanges.find(r => r.id === rangeId);
              return range ? (
                <div key={`single-${rangeId}`} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  <span className="mr-1">単発: {range.label}</span>
                  <button 
                    onClick={() => setSelectedPriceRanges(prev => ({
                      ...prev,
                      single_course: prev.single_course.filter(id => id !== rangeId)
                    }))}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null;
            })}
            
            {(searchKeyword || selectedCategory || selectedSubCategories.length > 0 || 
              (!selectedLessonTypes.monthly && selectedLessonTypes.single_course) ||
              (selectedLessonTypes.monthly && !selectedLessonTypes.single_course) ||
              (!selectedLocationTypes.in_person && selectedLocationTypes.online) ||
              (selectedLocationTypes.in_person && !selectedLocationTypes.online) ||
              selectedAreas.length > 0 || (!allDates && startDate && endDate) || 
              minPrice || maxPrice || selectedPriceRanges.monthly.length > 0 || 
              selectedPriceRanges.single_course.length > 0) && (
                <button 
                  onClick={resetAllFilters}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800 hover:bg-teal-200"
                >
                  すべての絞り込みをクリア
                </button>
              )}
          </div>

          {/* Lessons */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 rounded-full border-4 border-t-teal-500 border-gray-200 animate-spin"></div>
            </div>
          ) : (
            <div ref={lessonsContainerRef} className="divide-y divide-gray-300 bg-gray-50">
              {currentLessons.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">😢</div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">レッスンが見つかりませんでした</h3>
                  <p className="text-gray-600 mb-6">検索条件を変更して再度お試しください</p>
                  <Button 
                    onClick={resetAllFilters}
                    className="bg-teal-500 text-white hover:bg-teal-600"
                  >
                    すべてのレッスンを表示
                  </Button>
                </div>
              ) : (
                currentLessons.map((lesson) => (
                  <div 
                    key={lesson.id}
                    data-lesson-id={lesson.id}
                    onClick={() => navigate(`/user/lessons/${lesson.id}`)}
                    className={`lesson-card bg-gray-50 overflow-hidden transition cursor-pointer py-2 ${
                      hoveredCardId === lesson.id ? 'bg-teal-50' : ''
                    }`}
                  >
                    {/* Tags */}
                    <div className="px-4 pt-3 pb-0">
                      <div className="flex gap-2 mb-2">
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">{lesson.location_type === 'online' ? 'オンライン' : '対面'}</span>
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">{lesson.lesson_type === 'monthly' ? '月謝制' : lesson.lesson_type === 'one_time' ? '単発' : 'コース'}</span>
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">{CATEGORIES.find(cat => cat.id === lesson.category)?.name || lesson.category}</span>
                      </div>
                    </div>

                    <div className="flex p-5 pt-2">
                      {/* Lesson Image */}
                      <div className="w-36 h-36 flex-shrink-0 mr-4 relative">
                        <img 
                          src={lesson.lesson_image_url?.[0] || 'https://placehold.jp/36/f39800/ffffff/200x200.png?text=イメージ'} 
                          alt={lesson.lesson_title} 
                          className="w-full h-full object-cover rounded"
                        />
                        {/* Hot badge for a special effect like in the screenshot */}
                        {lesson.is_featured && (
                          <div className="absolute -top-3 -left-3 w-16 h-16 overflow-hidden">
                            <div className="bg-red-500 text-white text-xs font-bold py-1 px-4 rotate-[-45deg] absolute top-2 left-[-14px] shadow-md">
                              新規予約<br/>対応
                            </div>
                          </div>
                        )}
                        {/* Favorite button */}
                        <button 
                          onClick={(e) => handleLikeClick(e, lesson.id)} 
                          className="absolute bottom-1 right-1 p-1"
                        >
                          <Heart className={`h-6 w-6 ${favorites.includes(lesson.id) ? 'fill-white text-red-500 stroke-[3px]' : 'text-white stroke-[3px]'}`} />
                        </button>
                      </div>
                      
                      {/* Lesson Details */}
                      <div className="flex-1">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.lesson_title}</h3>
                          
                          {/* Rating */}
                          <div className="flex items-center mb-2">
                            <div className="text-xl font-bold text-gray-800 mr-1">
                              {lesson.instructor_profiles?.average_rating?.toFixed(1) || '5.0'}
                            </div>
                            <div className="flex mr-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < Math.floor(lesson.instructor_profiles?.average_rating || 5) 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              ({lesson.review_count || Math.floor(Math.random() * 1000) + 100})
                            </span>
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                            {lesson.lesson_description || lesson.lesson_catchphrase || '中学生〜高校生｜テスト⇔復習のスピード反復で驚くほど英単語暗記が進む。テストは個別対応。中学基礎〜英検準1級、高校受験、共テ~難関大学受験対応。暗記定着のコツを伝授。'}
                          </p>
                          
                          {/* Instructor */}
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mr-2">
                              {lesson.instructor_profiles?.profile_image_url ? (
                                <img 
                                  src={lesson.instructor_profiles.profile_image_url} 
                                  alt={lesson.instructor_profiles.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src="https://placehold.jp/150/cccccc/ffffff/50x50.png?text=講師"
                                  alt="講師"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">担当</span> <span className="font-medium text-gray-800">{lesson.instructor_profiles?.name || '山路 弘太'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Upcoming sessions */}
                    <div className="p-3">
                      <div className="flex items-center mb-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="font-medium">近日開催</span>
                        <span className="ml-2 px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded">開催リクエスト受付中</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {lesson.lesson_slots && lesson.lesson_slots.slice(0, 3).map((slot, index) => {
                          // Format date time
                          const date = new Date(slot.date_time_start);
                          const formattedDate = format(date, 'M月d日(EEE)', { locale: ja });
                          const formattedTime = format(date, 'HH:mm', { locale: ja });
                          
                          // Check if booking deadline has passed
                          const now = new Date();
                          const deadlineDate = new Date(slot.booking_deadline);
                          const isBookingClosed = now > deadlineDate;
                          
                          // Check remaining capacity
                          const remainingCapacity = slot.capacity - (slot.booked_count || 0);
                          const isFullyBooked = remainingCapacity <= 0;
                          const hasLimitedSpots = remainingCapacity <= 3;
                          
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <div className="flex-1 flex">
                                <span className="w-28">{formattedDate} {formattedTime}</span>
                                <span className="ml-2">¥{lesson.price.toLocaleString()}</span>
                                <span className="ml-3 text-gray-500">({lesson.duration}分)</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-teal-600 mr-1">
                                  {lesson.location_type === 'online' ? 'オンライン' : '対面'}
                                </span>
                                {isBookingClosed && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">予約締切</span>
                                )}
                                {!isBookingClosed && isFullyBooked && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">満席</span>
                                )}
                                {!isBookingClosed && !isFullyBooked && hasLimitedSpots && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">残り{remainingCapacity}席</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => {
                      // Display first page, last page, and pages around current page
                      if (
                        i === 0 || // First page
                        i === totalPages - 1 || // Last page
                        (i >= currentPage - 2 && i <= currentPage + 2) // Current page and surrounding pages
                      ) {
                        return (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`px-3 py-2 rounded ${
                              currentPage === i + 1
                                ? 'bg-teal-500 text-white'
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
                        // Display ellipsis for skipped pages
                        return <span key={i + 1} className="px-3 py-2">...</span>;
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLessons;