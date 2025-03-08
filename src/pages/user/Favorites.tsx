import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

type FavoriteWithLesson = {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
  lesson: {
    id: string;
    lesson_title: string;
    date_time_start: string;
    date_time_end: string;
    price: number;
    category: string;
    sub_category: string;
    lesson_image_url: string[];
    instructor_id: string;
    status: string;
  };
  instructor: {
    id: string;
    name: string;
    profile_image_url: string | null;
  };
};

const UserFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteWithLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Fetch favorites with lesson and instructor details
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            *,
            lesson:lesson_id(
              id, 
              lesson_title,  
              date_time_start, 
              date_time_end, 
              price, 
              category, 
              sub_category, 
              lesson_image_url,
              instructor_id,
              status
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (!data || data.length === 0) {
          setFavorites([]);
          return;
        }
        
        // Extract all instructor IDs to fetch their info
        const instructorIds = data.map(favorite => favorite.lesson.instructor_id);
        
        // Fetch all instructor profiles in a single query
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('id, name, profile_image_url')
          .in('id', instructorIds);
          
        if (instructorError) {
          console.error('Error fetching instructor profiles:', instructorError);
          throw instructorError;
        }
        
        // Create a map of instructor profiles by ID for easy lookup
        const instructorMap = (instructorData || []).reduce((map, instructor) => {
          map[instructor.id] = instructor;
          return map;
        }, {} as Record<string, any>);
        
        // Transform the data to match our type by adding instructor info
        const transformedData = data.map((favorite: any) => {
          const instructorId = favorite.lesson.instructor_id;
          return {
            ...favorite,
            instructor: instructorMap[instructorId] || null
          };
        });
        
        setFavorites(transformedData);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
        
      if (error) throw error;
      
      // Update local state
      setFavorites(favorites.filter(favorite => favorite.id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
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
      <h1 className="text-2xl font-bold mb-6">お気に入り</h1>
      
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                {favorite.lesson.lesson_image_url && favorite.lesson.lesson_image_url[0] ? (
                  <img 
                    src={favorite.lesson.lesson_image_url[0]} 
                    alt={favorite.lesson.lesson_title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-200">
                    <span className="text-gray-400">画像なし</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2 flex space-x-2">
                  <div className="bg-primary text-white px-2 py-1 rounded text-xs">
                    {favorite.lesson.category}
                  </div>
                  
                  {favorite.lesson.status !== 'published' && (
                    <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                      {favorite.lesson.status === 'draft' ? '下書き' : 
                       favorite.lesson.status === 'canceled' ? 'キャンセル' : '完了'}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleRemoveFavorite(favorite.id)}
                  className="absolute top-2 left-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                >
                  <svg 
                    className="w-4 h-4 text-red-500 fill-current" 
                    fill="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                    />
                  </svg>
                </button>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-3">{favorite.lesson.lesson_title}</h3>
                
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden mr-2">
                    {favorite.instructor?.profile_image_url ? (
                      <img 
                        src={favorite.instructor.profile_image_url} 
                        alt={favorite.instructor.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-primary text-white text-xs">
                        {favorite.instructor?.name?.charAt(0) || 'I'}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{favorite.instructor?.name}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500">
                    {new Date(favorite.lesson.date_time_start).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-semibold">
                    {favorite.lesson.price.toLocaleString()}円
                  </span>
                </div>
                
                <Link 
                  to={`/user/lessons/${favorite.lesson.id}`} 
                  className="block w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition-colors text-center"
                >
                  詳細を見る
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">お気に入りのレッスンはまだありません</p>
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

export default UserFavorites;