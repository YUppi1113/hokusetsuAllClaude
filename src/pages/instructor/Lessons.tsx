import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
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
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface LessonSlot {
  id: string;
  lesson_id: string;
  date_time_start: string;
  date_time_end: string;
  booking_deadline: string;
  capacity: number;
  current_participants_count: number;
  price: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  bookings?: any[]; // 予約情報
}

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
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  materials_needed: string;
  lesson_goals: string;
  lesson_outline: string;
  created_at: string;
  updated_at: string;
  lesson_slots?: LessonSlot[];
}

const InstructorLessons = () => {
  const location = useLocation();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('published');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0); // データ更新のトラッキング用

  // URLパラメータからメッセージを取得(ページリロード時用)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    const status = params.get('status');
    
    if (message) {
      setSuccessMessage(message);
      
      // メッセージをクリア (URLからパラメータを削除)
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // 数秒後にメッセージを非表示
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      // ステータスに応じてタブを切り替え
      if (status === 'draft') {
        setActiveTab('drafts');
      } else if (status === 'published') {
        setActiveTab('published');
      }
      
      return () => clearTimeout(timer);
    } else if (location.state?.message) {
      // 従来のlocation.stateからのメッセージ表示もサポート
      setSuccessMessage(location.state.message);
      // Clear the success message after a few seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // レッスン取得関数をuseCallbackでメモ化
  const fetchLessons = useCallback(async () => {
    setLoading(true);
    console.log('Fetching lessons with tab:', activeTab, 'and status filter:', filterStatus);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 下書き以外を取得する共通クエリ（lesson_slotsをJOIN）
      let queryWithSlots = supabase
        .from('lessons')
        .select(
          `
          *,
          lesson_slots(*)
        `
        )
        .eq('instructor_id', user.id);

      if (activeTab === 'published') {
        // すべての公開したレッスン（日付での区別なし）
        // 下書きを除外
        if (filterStatus === 'all') {
          queryWithSlots = queryWithSlots.not('status', 'eq', 'draft');
        } else {
          queryWithSlots = queryWithSlots.eq('status', filterStatus);
        }

        queryWithSlots = queryWithSlots
          .order('updated_at', { ascending: false }); // 更新日で降順ソート

        const { data, error } = await queryWithSlots;
        if (error) {
          console.error('Error fetching lessons:', error);
          return;
        }

        if (data) {
          console.log('Found lessons with slots:', data.length, data);
          
          // 各レッスンに対して、lesson_slotsを日付順にソート
          const sortedLessons = data.map(lesson => {
            if (lesson.lesson_slots && lesson.lesson_slots.length > 0) {
              lesson.lesson_slots = lesson.lesson_slots.sort((a, b) => 
                new Date(a.date_time_start).getTime() - new Date(b.date_time_start).getTime()
              );
            }
            return lesson;
          });
          
          // 公開したレッスンで、lesson_slots が1つ以上あるものをフィルタ
          const lessonsWithSlots = sortedLessons.filter(
            (lesson) => lesson.lesson_slots && lesson.lesson_slots.length > 0
          );
          setLessons(lessonsWithSlots);

          // カテゴリの一覧を抽出
          const uniqueCategories = [
            ...new Set(lessonsWithSlots.map((lesson) => lesson.category)),
          ].filter(Boolean) as string[];
          setCategories(uniqueCategories);
        }

        return; // 「published」タブはここで処理終了
      } else if (activeTab === 'drafts') {
        // 「下書き」タブ
        // 「lesson_slots」は不要なので別途シンプルなクエリを作る
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('instructor_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching lessons:', error);
          return;
        }

        if (data) {
          setLessons(data);

          // カテゴリの一覧を抽出
          const uniqueCategories = [...new Set(data.map((lesson) => lesson.category))].filter(
            Boolean
          ) as string[];
          setCategories(uniqueCategories);
        }

        return; // 「drafts」タブはここで処理終了
      }

      // ここから先は、通常のステータス絞り込みなど（upcoming/past/drafts以外のケース）
      let query = supabase.from('lessons').select('*').eq('instructor_id', user.id);

      // 下書き以外のタブで、かつステータスを個別に絞りたい場合
      if (activeTab !== 'drafts' && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching lessons:', error);
        return;
      }

      if (data) {
        console.log('Found lessons:', data.length, data);
        setLessons(data);

        // カテゴリ一覧を抽出
        const uniqueCategories = [...new Set(data.map((lesson) => lesson.category))].filter(
          Boolean
        ) as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus]);

  // activeTab, filterStatus, dataVersion が変わったら再取得
  useEffect(() => {
    fetchLessons();
  }, [activeTab, filterStatus, dataVersion, fetchLessons]);

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.lesson_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lesson.lesson_description &&
        lesson.lesson_description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || lesson.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  console.log('Filtered lessons:', filteredLessons.length);

  // データ更新を要求するためのヘルパー関数
  const refreshData = () => {
    setDataVersion(prev => prev + 1);
  };

  const updateLessonStatus = async (
    lessonId: string,
    status: 'published' | 'draft' | 'cancelled'
  ) => {
    try {
      // レッスンスロットから予約者数を確認
      const { data: slotsData, error: slotsError } = await supabase
        .from('lesson_slots')
        .select('current_participants_count')
        .eq('lesson_id', lessonId);

      if (slotsError) {
        console.error('Error fetching lesson slots:', slotsError);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: 'レッスン情報の取得に失敗しました。',
        });
        return;
      }

      // 全スロットの予約者数を合計
      const totalParticipants = slotsData.reduce((sum, slot) => sum + (slot.current_participants_count || 0), 0);

      // 予約者がいる場合、キャンセル不可
      if (status === 'cancelled' && totalParticipants > 0) {
        toast({
          variant: 'destructive',
          title: '操作できません',
          description: 'このレッスンには予約が入っているためキャンセルできません。先に予約者と調整してください。',
        });
        return;
      }

      const { error } = await supabase
        .from('lessons')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId);

      if (error) {
        console.error('Error updating lesson status:', error);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: 'レッスンステータスの更新に失敗しました。',
        });
        return;
      }

      toast({
        variant: 'default',
        title: '成功',
        description: status === 'published'
          ? 'レッスンを公開しました。'
          : status === 'cancelled'
          ? 'レッスンを非表示にしました。'
          : 'レッスンを下書きに変更しました。',
      });

      // データを再取得
      refreshData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'エラーが発生しました。',
      });
    }
  };

  // レッスンスロットのステータスを更新する
  const updateSlotStatus = async (
    slotId: string,
    status: 'published' | 'draft' | 'cancelled' | 'completed',
    participantsCount: number
  ) => {
    try {
      // 予約者がいる場合、キャンセル不可（ステータスが完了の場合は除く）
      if (status === 'cancelled' && participantsCount > 0) {
        toast({
          variant: 'destructive',
          title: '操作できません',
          description: 'この予約枠には予約が入っているためキャンセルできません。先に予約者と調整してください。',
        });
        return;
      }

      const { error } = await supabase
        .from('lesson_slots')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slotId);

      if (error) {
        console.error('Error updating slot status:', error);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: '予約枠ステータスの更新に失敗しました。',
        });
        return;
      }

      toast({
        variant: 'default',
        title: '成功',
        description: status === 'published'
          ? '予約枠を公開しました。'
          : status === 'cancelled'
          ? '予約枠を非表示にしました。'
          : status === 'completed'
          ? '予約枠を完了にしました。'
          : '予約枠を下書きに変更しました。',
      });

      // データを再取得
      refreshData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'エラーが発生しました。',
      });
    }
  };

  const deleteLesson = async (lessonId: string, participantsCount?: number) => {
    try {
      // 予約者数が渡されていない場合、レッスンスロットから確認
      if (participantsCount === undefined) {
        const { data: slotsData, error: slotsError } = await supabase
          .from('lesson_slots')
          .select('current_participants_count')
          .eq('lesson_id', lessonId);
  
        if (slotsError) {
          console.error('Error fetching lesson slots:', slotsError);
          toast({
            variant: 'destructive',
            title: 'エラー',
            description: 'レッスン情報の取得に失敗しました。',
          });
          return;
        }
  
        // 全スロットの予約者数を合計
        participantsCount = slotsData.reduce((sum, slot) => sum + (slot.current_participants_count || 0), 0);
      }
      
      // 予約されているレッスンは削除不可
      if (participantsCount > 0) {
        toast({
          variant: 'destructive',
          title: '操作できません',
          description: 'このレッスンには予約が入っているため削除できません。キャンセル処理をご利用ください。',
        });
        return;
      }

      if (
        !window.confirm(
          'このレッスンを削除してもよろしいですか？この操作は元に戻せません。'
        )
      ) {
        return;
      }

      // レッスンに関連する予約を確認
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('lesson_id', lessonId);

      if (bookingError) {
        console.error('Error checking bookings:', bookingError);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: '予約情報の確認中にエラーが発生しました。',
        });
        return;
      }

      if (bookings && bookings.length > 0) {
        toast({
          variant: 'destructive',
          title: '操作できません',
          description: 'このレッスンには予約が入っているため削除できません。キャンセル処理をご利用ください。',
        });
        return;
      }

      // 予約がない場合のみ削除を実行
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);

      if (error) {
        console.error('Error deleting lesson:', error);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: 'レッスンの削除に失敗しました。',
        });
        return;
      }

      toast({
        variant: 'default',
        title: '成功',
        description: 'レッスンが削除されました。',
      });

      // データを再取得
      refreshData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '予期せぬエラーが発生しました。',
      });
    }
  };

  // レッスンスロットを削除する
  const deleteSlot = async (slotId: string, participantsCount: number, lessonId: string) => {
    // 予約されているスロットは削除不可
    if (participantsCount > 0) {
      toast({
        variant: 'destructive',
        title: '操作できません',
        description: 'この予約枠には予約が入っているため削除できません。キャンセル処理をご利用ください。',
      });
      return;
    }

    if (
      !window.confirm(
        'この予約枠を削除してもよろしいですか？この操作は元に戻せません。'
      )
    ) {
      return;
    }

    try {
      // スロットに関連する予約を確認
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId);

      if (bookingError) {
        console.error('Error checking bookings:', bookingError);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: '予約情報の確認中にエラーが発生しました。',
        });
        return;
      }

      if (bookings && bookings.length > 0) {
        toast({
          variant: 'destructive',
          title: '操作できません',
          description: 'この予約枠には予約が入っているため削除できません。キャンセル処理をご利用ください。',
        });
        return;
      }

      // 予約がない場合のみ削除を実行
      const { error } = await supabase.from('lesson_slots').delete().eq('id', slotId);

      if (error) {
        console.error('Error deleting slot:', error);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: '予約枠の削除に失敗しました。',
        });
        return;
      }

      toast({
        variant: 'default',
        title: '成功',
        description: '予約枠が削除されました。',
      });

      // データを再取得
      refreshData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '予期せぬエラーが発生しました。',
      });
    }
  };

  // Show toast when message is present in URL params or location state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    
    if (message) {
      toast({
        title: "成功",
        description: message,
        variant: "default",
      });
      
      // Clear the message from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (location.state?.message) {
      toast({
        title: "成功",
        description: location.state.message,
        variant: "default",
      });
      
      // Clear the message from location state
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state, location.search]);
  
  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
          <div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}
    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">レッスン管理</h1>
        <Button asChild>
          <Link to="/instructor/lessons/create">
            <Plus className="w-4 h-4 mr-2" />
            新しいレッスンを作成
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="published" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="published">公開したレッスン</TabsTrigger>
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
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
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

        {/* 公開したレッスン */}
        <TabsContent value="published" className="space-y-4">
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
                      <th className="px-6 py-3 text-left">予約枠</th>
                      <th className="px-6 py-3 text-left">予約状況</th>
                      <th className="px-6 py-3 text-left">ステータス</th>
                      <th className="px-6 py-3 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLessons.map((lesson) => (
                      <>
                        {/* レッスン情報の行 */}
                        <tr key={`lesson-${lesson.id}`} className="bg-gray-50">
                          <td className="px-6 py-4" colSpan={5}>
                            <div className="flex items-center justify-between">
                              <div>
                                <Link
                                  to={`/instructor/lessons/${lesson.id}/edit`}
                                  className="font-medium text-gray-900 hover:text-primary text-lg"
                                >
                                  {lesson.lesson_title}
                                </Link>
                                <p className="text-sm text-gray-500">
                                  {lesson.category} • 定員: {lesson.capacity}人 • 料金: {lesson.price}円
                                </p>
                              </div>
                              <div className="flex space-x-3">
                                <Link
                                  to={`/instructor/lessons/${lesson.id}/edit`}
                                  className="text-gray-400 hover:text-primary"
                                >
                                  <Edit className="h-5 w-5" />
                                </Link>
                                {lesson.status === 'published' ? (
                                  <button
                                    onClick={() => updateLessonStatus(lesson.id, 'cancelled')}
                                    className="text-gray-400 hover:text-red-500"
                                    title={'レッスンを非表示にする'}
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
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="text-gray-400 hover:text-red-500"
                                  title="レッスンを削除"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {/* 各予約枠の行 */}
                        {lesson.lesson_slots && lesson.lesson_slots.length > 0 ? (
                          lesson.lesson_slots.map((slot) => {
                            // 現在の日時
                            const now = new Date();
                            // 開始時間と終了時間
                            const startTime = new Date(slot.date_time_start);
                            const endTime = new Date(slot.date_time_end);
                            // 未来または過去の判別
                            const isPast = endTime < now;
                            const isCurrent = startTime <= now && now <= endTime;
                            
                            return (
                              <tr 
                                key={`slot-${slot.id}`} 
                                className={`hover:bg-gray-50 ${
                                  isPast 
                                    ? 'bg-gray-50' 
                                    : isCurrent 
                                      ? 'bg-green-50' 
                                      : 'bg-blue-50'
                                }`}
                              >
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3">
                                  <div className="flex flex-col">
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                      <span className="text-sm font-medium">
                                        {formatDate(slot.date_time_start)}
                                      </span>
                                      {isPast && <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">終了</span>}
                                      {isCurrent && <span className="ml-2 text-xs text-green-700 bg-green-200 px-1.5 py-0.5 rounded">開催中</span>}
                                    </div>
                                    <div className="flex items-center mt-1">
                                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                                      <span className="text-sm">
                                        {startTime.toLocaleTimeString('ja-JP', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                        {' 〜 '}
                                        {endTime.toLocaleTimeString('ja-JP', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-1 text-gray-500" />
                                    <span className="text-sm font-medium">
                                      {slot.current_participants_count || 0}/{slot.capacity}人
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 max-w-[100px]">
                                    <div
                                      className="bg-primary h-1.5 rounded-full"
                                      style={{
                                        width: `${
                                          ((slot.current_participants_count || 0) / slot.capacity) * 100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${
                                      slot.status === 'published'
                                        ? 'bg-green-100 text-green-800'
                                        : slot.status === 'draft'
                                        ? 'bg-gray-100 text-gray-800'
                                        : slot.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-200 text-gray-800'
                                    }`}
                                  >
                                    {slot.status === 'published'
                                      ? '公開中'
                                      : slot.status === 'draft'
                                      ? '下書き'
                                      : slot.status === 'cancelled'
                                      ? 'キャンセル'
                                      : '完了'}
                                  </span>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="flex space-x-2">
                                    {slot.status === 'published' ? (
                                      <>
                                        <button
                                          onClick={() => updateSlotStatus(slot.id, 'cancelled', slot.current_participants_count || 0)}
                                          className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                                          disabled={slot.current_participants_count > 0}
                                          title={
                                            slot.current_participants_count > 0
                                              ? '予約があるため非表示にできません'
                                              : '予約枠を非表示にする'
                                          }
                                        >
                                          <EyeOff className="h-4 w-4" />
                                        </button>
                                        {isPast && (
                                          <button
                                            onClick={() => updateSlotStatus(slot.id, 'completed', slot.current_participants_count || 0)}
                                            className="text-gray-400 hover:text-green-500 p-1 rounded-full hover:bg-gray-100"
                                            title="予約枠を完了にする"
                                          >
                                            <span className="text-xs font-medium">完了</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (slot.status === 'cancelled' || slot.status === 'draft') ? (
                                      <button
                                        onClick={() => updateSlotStatus(slot.id, 'published', slot.current_participants_count || 0)}
                                        className="text-gray-400 hover:text-green-500 p-1 rounded-full hover:bg-gray-100"
                                        title="予約枠を公開する"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    ) : null}
                                    <button
                                      onClick={() => deleteSlot(slot.id, slot.current_participants_count || 0, lesson.id)}
                                      className={`text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 ${
                                        slot.current_participants_count > 0
                                          ? 'cursor-not-allowed opacity-50'
                                          : ''
                                      }`}
                                      title={
                                        slot.current_participants_count > 0
                                          ? '予約があるため削除できません'
                                          : '予約枠を削除'
                                      }
                                      disabled={slot.current_participants_count > 0}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr key={`no-slots-${lesson.id}`}>
                            <td colSpan={5} className="px-6 py-3 text-center text-sm text-gray-500">
                              このレッスンに予約枠はありません
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-gray-500 mb-4">公開したレッスンはありません</p>
              <Button asChild>
                <Link to="/instructor/lessons/create">新しいレッスンを作成する</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 下書き */}
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
                          <Link
                            to={`/instructor/lessons/${lesson.id}/edit`}
                            className="font-medium text-gray-900 hover:text-primary"
                          >
                            {lesson.lesson_title || '(タイトルなし)'}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {lesson.category || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{formatDate(lesson.updated_at)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-3">
                            <Link
                              to={`/instructor/lessons/${lesson.id}/edit`}
                              className="text-gray-400 hover:text-primary"
                            >
                              <Edit className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => updateLessonStatus(lesson.id, 'published')}
                              className="text-gray-400 hover:text-green-500"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson.id)}
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
