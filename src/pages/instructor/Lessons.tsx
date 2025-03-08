import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Lesson {
  id: string;
  instructor_id: string;
  lesson_title: string;
  lesson_description: string;
  category: string;
  sub_category: string;
  difficulty_level: string;
  price: number;
  duration: number;
  capacity: number;
  location_name: string;
  location_type: string;
  lesson_image_url: string[];
  date_time_start: string;
  date_time_end: string;
  booking_deadline: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  current_participants_count: number;
  materials_needed: string;
  lesson_goals: string;
  lesson_outline: string;
  created_at: string;
  updated_at: string;
}

const InstructorLessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchLessons();
  }, [activeTab, filterStatus]);

  const fetchLessons = async () => {
    setLoading(true);
    console.log('Fetching lessons with tab:', activeTab, 'and status filter:', filterStatus);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Start building the query
      let query = supabase
        .from('lessons')
        .select('*')
        .eq('instructor_id', user.id);

      // Add filters based on active tab
      // const now = new Date().toISOString();
      
      if (activeTab === 'upcoming') {
        // 今後開催されるレッスン（日時が現在より後、または今日のレッスン）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('date_time_start', today.toISOString()).order('date_time_start', { ascending: true });
        
        // 下書きを除外
        if (filterStatus === 'all') {
          query = query.not('status', 'eq', 'draft');
        }
      } else if (activeTab === 'past') {
        // 過去のレッスン
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        query = query.lte('date_time_end', yesterday.toISOString()).order('date_time_start', { ascending: false });
        
        // 下書きを除外
        if (filterStatus === 'all') {
          query = query.not('status', 'eq', 'draft');
        }
      } else if (activeTab === 'drafts') {
        query = query.eq('status', 'draft').order('updated_at', { ascending: false });
      }

      // Add status filter if not on drafts tab and a specific status is selected
      if (activeTab !== 'drafts' && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      console.log('Fetching lessons with active tab:', activeTab);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching lessons:', error);
        return;
      }

      if (data) {
        console.log('Found lessons:', data.length, data);
        setLessons(data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(lesson => lesson.category))];
        setCategories(uniqueCategories.filter(Boolean) as string[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.lesson_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lesson.lesson_description && lesson.lesson_description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || lesson.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  console.log('Filtered lessons:', filteredLessons.length);

  const updateLessonStatus = async (lessonId: string, status: 'published' | 'draft' | 'cancelled') => {
    try {
      // レッスンの詳細を取得して確認者数を再確認
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('current_participants_count')
        .eq('id', lessonId)
        .single();
      
      if (lessonError) {
        console.error('Error fetching lesson:', lessonError);
        alert('レッスン情報の取得に失敗しました。');
        return;
      }
      
      // 予約者がいる場合、キャンセルできないようにする
      if (status === 'cancelled' && lessonData.current_participants_count > 0) {
        alert('このレッスンには予約が入っているためキャンセルできません。先に予約者と調整してください。');
        return;
      }
      
      const { error } = await supabase
        .from('lessons')
        .update({ 
          status,
          updated_at: new Date().toISOString() 
        })
        .eq('id', lessonId);

      if (error) {
        console.error('Error updating lesson status:', error);
        alert('レッスンステータスの更新に失敗しました。');
        return;
      }

      // Update local state
      setLessons(lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, status } : lesson
      ));
      
      alert(status === 'published' ? 'レッスンを公開しました。' : 
            status === 'cancelled' ? 'レッスンを非表示にしました。' : 
            'レッスンを下書きに変更しました。');
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました。');
    }
  };

  const deleteLesson = async (lessonId: string, participantsCount: number) => {
    // 予約されているレッスンは削除できない
    if (participantsCount > 0) {
      alert('このレッスンには予約が入っているため削除できません。キャンセル処理をご利用ください。');
      return;
    }

    if (!window.confirm('このレッスンを削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    try {
      // レッスンに関連する予約を確認
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('lesson_id', lessonId);

      if (bookingError) {
        console.error('Error checking bookings:', bookingError);
        alert('予約情報の確認中にエラーが発生しました。');
        return;
      }

      // 万が一、UI上の参加者数と実際のデータベースの予約数が一致していない場合のチェック
      if (bookings && bookings.length > 0) {
        alert('このレッスンには予約が入っているため削除できません。キャンセル処理をご利用ください。');
        return;
      }

      // 予約がない場合のみ削除を実行
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) {
        console.error('Error deleting lesson:', error);
        alert('レッスンの削除に失敗しました。');
        return;
      }

      // Update local state
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
      
      alert('レッスンが削除されました。');
    } catch (error) {
      console.error('Error:', error);
      alert('予期せぬエラーが発生しました。');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">レッスン管理</h1>
        <Button asChild>
          <Link to="/instructor/lessons/create">
            <Plus className="w-4 h-4 mr-2" />
            新しいレッスンを作成
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="upcoming">予定されたレッスン</TabsTrigger>
            <TabsTrigger value="past">過去のレッスン</TabsTrigger>
            <TabsTrigger value="drafts">下書き</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="レッスンを検索..."
                className="pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-white"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">すべてのカテゴリ</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {activeTab !== 'drafts' && (
              <select
                className="px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">すべてのステータス</option>
                <option value="published">公開中</option>
                <option value="cancelled">キャンセル済み</option>
              </select>
            )}
          </div>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredLessons.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">レッスン名</th>
                      <th className="px-6 py-3 text-left">日時</th>
                      <th className="px-6 py-3 text-left">予約状況</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link to={`/instructor/lessons/${lesson.id}/edit`} className="font-medium text-gray-900 hover:text-primary">
                            {lesson.lesson_title}
                          </Link>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{lesson.category}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">{formatDate(lesson.date_time_start)}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {new Date(lesson.date_time_start).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {lesson.current_participants_count}/{lesson.capacity}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${(lesson.current_participants_count / lesson.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${lesson.status === 'published' ? 'bg-green-100 text-green-800' : 
                              lesson.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {lesson.status === 'published' ? '公開中' : 
                             lesson.status === 'draft' ? '下書き' : 'キャンセル'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            <Link to={`/instructor/lessons/${lesson.id}/edit`} className="text-gray-400 hover:text-primary">
                              <Edit className="h-5 w-5" />
                            </Link>
                            {lesson.status === 'published' ? (
                              <button 
                                onClick={() => updateLessonStatus(lesson.id, 'cancelled')}
                                className="text-gray-400 hover:text-red-500"
                                disabled={lesson.current_participants_count > 0}
                                title={lesson.current_participants_count > 0 ? "予約があるため非表示にできません" : "レッスンを非表示にする"}
                              >
                                <EyeOff className="h-5 w-5" />
                              </button>
                            ) : lesson.status === 'cancelled' || lesson.status === 'draft' ? (
                              <button 
                                onClick={() => updateLessonStatus(lesson.id, 'published')}
                                className="text-gray-400 hover:text-green-500"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            ) : null}
                            <button 
                              onClick={() => deleteLesson(lesson.id, lesson.current_participants_count)}
                              className={`text-gray-400 hover:text-red-500 ${lesson.current_participants_count > 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                              title={lesson.current_participants_count > 0 ? "予約があるため削除できません" : "レッスンを削除"}
                              disabled={lesson.current_participants_count > 0}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500 mb-4">予定されているレッスンはありません</p>
              <Button asChild>
                <Link to="/instructor/lessons/create">新しいレッスンを作成する</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredLessons.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">レッスン名</th>
                      <th className="px-6 py-3 text-left">日時</th>
                      <th className="px-6 py-3 text-left">参加者</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link to={`/instructor/lessons/${lesson.id}/edit`} className="font-medium text-gray-900 hover:text-primary">
                            {lesson.lesson_title}
                          </Link>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{lesson.category}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">{formatDate(lesson.date_time_start)}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {new Date(lesson.date_time_start).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {lesson.current_participants_count}/{lesson.capacity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${lesson.status === 'published' ? 'bg-green-100 text-green-800' : 
                              lesson.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {lesson.status === 'published' ? '公開中' : 
                             lesson.status === 'draft' ? '下書き' : 
                             lesson.status === 'cancelled' ? 'キャンセル' : '完了'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            <Link to={`/instructor/lessons/${lesson.id}/edit`} className={`text-gray-400 hover:text-primary ${lesson.current_participants_count > 0 ? 'cursor-not-allowed opacity-50' : ''}`} title={lesson.current_participants_count > 0 ? "予約があるため編集できません" : "レッスンを編集"}>
                              <Edit className="h-5 w-5" />
                            </Link>
                            <button 
                              onClick={() => deleteLesson(lesson.id, lesson.current_participants_count)}
                              className={`text-gray-400 hover:text-red-500 ${lesson.current_participants_count > 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                              title={lesson.current_participants_count > 0 ? "予約があるため削除できません" : "レッスンを削除"}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500">過去のレッスンはありません</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredLessons.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-700 text-sm">
                    <tr>
                      <th className="px-6 py-3 text-left">レッスン名</th>
                      <th className="px-6 py-3 text-left">カテゴリ</th>
                      <th className="px-6 py-3 text-left">最終更新日</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link to={`/instructor/lessons/${lesson.id}/edit`} className="font-medium text-gray-900 hover:text-primary">
                            {lesson.lesson_title || '(タイトルなし)'}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {lesson.category || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {formatDate(lesson.updated_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            <Link to={`/instructor/lessons/${lesson.id}/edit`} className="text-gray-400 hover:text-primary">
                              <Edit className="h-5 w-5" />
                            </Link>
                            <button 
                              onClick={() => updateLessonStatus(lesson.id, 'published')}
                              className="text-gray-400 hover:text-green-500"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => deleteLesson(lesson.id, 0)}
                              className="text-gray-400 hover:text-red-500"
                              title="レッスンを削除"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500 mb-4">下書きのレッスンはありません</p>
              <Button asChild>
                <Link to="/instructor/lessons/create">新しいレッスンを作成する</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorLessons;