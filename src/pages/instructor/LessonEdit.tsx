import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';
import {
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Info,
  BookOpen,
  Tag,
  Upload,
  AlertTriangle,
} from 'lucide-react';

interface Lesson {
  id: string;
  instructor_id: string;
  lesson_title: string;
  lesson_catchphrase: string;
  lesson_description: string;
  category: string;
  sub_category: string;
  difficulty_level: string;
  price: number;
  duration: number;
  capacity: number;
  location_name: string;
  location_type: string;
  lesson_type: 'monthly' | 'one_time' | 'course';
  is_free_trial: boolean;
  lesson_image_url: string[];
  date_time_start: string;
  date_time_end: string;
  booking_deadline: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  current_participants_count: number;
  materials_needed: string;
  lesson_goals: string;
  lesson_outline: string;
  monthly_plans: Array<{name: string, price: string, frequency: string, lesson_duration: string, description: string}>;
  course_sessions: number;
  created_at: string;
  updated_at: string;
}

const InstructorLessonEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const message = location.state?.message;
  
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [originalLesson, setOriginalLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    lesson_title: '',
    lesson_catchphrase: '',
    lesson_description: '',
    category: '',
    sub_category: '',
    sub_categories: [] as string[],
    difficulty_level: 'beginner',
    price: '',
    duration: 60,
    capacity: 10,
    location_name: '',
    location_type: 'online',
    lesson_type: 'one_time' as 'monthly' | 'one_time' | 'course',
    is_free_trial: false,
    lesson_image_url: [] as string[],
    date_time_start: '',
    date_time_end: '',
    booking_deadline: '',
    status: 'draft' as 'draft' | 'published' | 'cancelled' | 'completed',
    materials_needed: '',
    lesson_goals: '',
    lesson_outline: '',
    monthly_plans: [] as Array<{name: string, price: string, frequency: string, lesson_duration: string, description: string}>,
    course_sessions: 1,
  });
  const [availableSubcategories, setAvailableSubcategories] = useState<{ id: string, name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasParticipants, setHasParticipants] = useState(false);

  useEffect(() => {
    if (message) {
      toast({
        description: message,
      });
    }
    
    fetchLesson();
  }, [id, message]);

  const fetchLesson = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setOriginalLesson(data);

        // Find the subcategory ID based on name
        const categoryId = data.category || '';
        let subCategoryId = '';
        
        if (categoryId && SUBCATEGORIES[categoryId]) {
          setAvailableSubcategories(SUBCATEGORIES[categoryId]);
          
          // Find the subcategory ID that matches the subcategory name
          const subcategory = SUBCATEGORIES[categoryId].find(
            sub => sub.name === data.sub_category
          );
          
          if (subcategory) {
            subCategoryId = subcategory.id;
          }
        }
        
        // 日時データの形式を調整（HTML datetime-local 形式に合わせる）
        let formattedStartDate = '';
        let formattedEndDate = '';
        let formattedDeadline = '';
        
        if (data.date_time_start) {
          formattedStartDate = new Date(data.date_time_start).toISOString().slice(0, 16);
        }
        
        if (data.date_time_end) {
          formattedEndDate = new Date(data.date_time_end).toISOString().slice(0, 16);
        }
        
        if (data.booking_deadline) {
          formattedDeadline = new Date(data.booking_deadline).toISOString().slice(0, 16);
        }
        
        setFormData({
          lesson_title: data.lesson_title || '',
          lesson_catchphrase: data.lesson_catchphrase || '',
          lesson_description: data.lesson_description || '',
          category: data.category || '',
          sub_category: data.sub_category || '',
          sub_categories: subCategoryId ? [subCategoryId] : [],
          difficulty_level: data.difficulty_level || 'beginner',
          price: data.price.toString() || '',
          duration: data.duration || 60,
          capacity: data.capacity || 10,
          location_name: data.location_name || '',
          location_type: data.location_type || 'online',
          lesson_type: data.lesson_type || 'one_time',
          is_free_trial: data.is_free_trial || false,
          lesson_image_url: data.lesson_image_url || [],
          date_time_start: formattedStartDate,
          date_time_end: formattedEndDate,
          booking_deadline: formattedDeadline,
          status: data.status || 'draft',
          materials_needed: data.materials_needed || '',
          lesson_goals: data.lesson_goals || '',
          lesson_outline: data.lesson_outline || '',
          monthly_plans: data.monthly_plans || [],
          course_sessions: data.course_sessions || 1,
        });
        
        // Check if lesson has participants
        setHasParticipants(data.current_participants_count > 0);
      }
    } catch (error: any) {
      console.error('Error fetching lesson:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "レッスン情報の取得に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 開始時刻か時間が変更された場合、終了時刻を自動計算
    if (name === 'date_time_start' && value) {
      // 開始時刻が入力された場合、終了時刻を計算（日本時間）
      const startDateTime = new Date(value);
      const durationMinutes = formData.duration;
      
      // 日本時間を維持したまま終了時刻を計算
      const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000));
      
      // datetime-local の値はローカルタイムゾーンで解釈されるので、
      // toISOString() の代わりに、YYYY-MM-DDTHH:MM 形式の文字列を手動で構築
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(endDateTime.getDate()).padStart(2, '0');
      const hours = String(endDateTime.getHours()).padStart(2, '0');
      const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        date_time_end: endDateString
      }));
    } else if (name === 'duration' && formData.date_time_start) {
      // 時間が変更され、開始時刻がある場合は終了時刻を再計算（日本時間）
      const startDateTime = new Date(formData.date_time_start);
      const durationMinutes = parseInt(value, 10);
      
      // 日本時間を維持したまま終了時刻を計算
      const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000));
      
      // datetime-local の値はローカルタイムゾーンで解釈されるので、
      // toISOString() の代わりに、YYYY-MM-DDTHH:MM 形式の文字列を手動で構築
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(endDateTime.getDate()).padStart(2, '0');
      const hours = String(endDateTime.getHours()).padStart(2, '0');
      const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        date_time_end: endDateString
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // カテゴリーが変更された場合はサブカテゴリーを更新
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        sub_categories: [], // カテゴリー変更時にサブカテゴリーをリセット
      }));
      
      // 選択されたカテゴリーに対応するサブカテゴリーを設定
      const categoryId = value as string;
      if (categoryId && SUBCATEGORIES[categoryId]) {
        setAvailableSubcategories(SUBCATEGORIES[categoryId]);
      } else {
        setAvailableSubcategories([]);
      }
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };
  
  // サブカテゴリーのチェックボックスの変更を処理
  const handleSubcategoryChange = (subcategoryId: string) => {
    setFormData(prev => {
      const updatedSubcategories = prev.sub_categories.includes(subcategoryId)
        ? prev.sub_categories.filter(id => id !== subcategoryId)
        : [...prev.sub_categories, subcategoryId];
        
      return {
        ...prev,
        sub_categories: updatedSubcategories,
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setImageUploading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // Upload image
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `lesson_images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);
      
      // 画像は最大3枚まで
      if (formData.lesson_image_url.length >= 3) {
        throw new Error('画像は最大3枚までアップロードできます');
      }
      
      // Update form data
      const updatedUrls = [...formData.lesson_image_url, publicUrl];
      setFormData({
        ...formData,
        lesson_image_url: updatedUrls,
      });
      
      // Set preview
      const updatedPreviews = [...imagePreview, URL.createObjectURL(file)];
      setImagePreview(updatedPreviews);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "アップロードエラー",
        description: error.message || "画像のアップロードに失敗しました。",
      });
    } finally {
      setImageUploading(false);
    }
  };
  
  const removeImage = (index: number) => {
    const updatedUrls = [...formData.lesson_image_url];
    updatedUrls.splice(index, 1);
    
    const updatedPreviews = [...imagePreview];
    updatedPreviews.splice(index, 1);
    
    setFormData({
      ...formData,
      lesson_image_url: updatedUrls,
    });
    setImagePreview(updatedPreviews);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Basic tab validations
    if (!formData.lesson_title.trim()) {
      newErrors.lesson_title = 'レッスン名を入力してください';
    } else if (formData.lesson_title.length > 25) {
      newErrors.lesson_title = 'レッスン名は25文字以内で入力してください';
    }
    
    if (!formData.lesson_catchphrase.trim()) {
      newErrors.lesson_catchphrase = 'キャッチコピーを入力してください';
    } else if (formData.lesson_catchphrase.length > 50) {
      newErrors.lesson_catchphrase = 'キャッチコピーは50文字以内で入力してください';
    }
    
    if (!formData.lesson_description.trim()) {
      newErrors.lesson_description = 'レッスンの説明を入力してください';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'カテゴリを選択してください';
    }
    
    // Details tab validations
    if (formData.lesson_type !== 'monthly') {
      if (!formData.price.trim()) {
        newErrors.price = '価格を入力してください';
      } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
        newErrors.price = '有効な価格を入力してください';
      }
    } else {
      // 月謝制の場合、少なくとも1つのプランが必要
      if (formData.monthly_plans.length === 0) {
        newErrors.monthly_plans = '少なくとも1つのプランを追加してください';
      } else {
        // 各プランの必須項目を検証
        const invalidPlans = formData.monthly_plans.some(plan => 
          !plan.name.trim() || !plan.price.trim() || !plan.frequency.trim() || !plan.lesson_duration.trim()
        );
        if (invalidPlans) {
          newErrors.monthly_plans = 'すべてのプラン情報を入力してください';
        }
      }
    }
    
    if (formData.lesson_type !== 'monthly') {
      if (formData.duration <= 0) {
        newErrors.duration = '有効な時間を入力してください';
      }
      
      if (formData.capacity < originalLesson?.current_participants_count!) {
        newErrors.capacity = `定員は現在の参加者数（${originalLesson?.current_participants_count}人）より少なく設定できません`;
      }
    }
    
    if (formData.lesson_type === 'course' && formData.course_sessions < 1) {
      newErrors.course_sessions = '有効な回数を入力してください';
    }
    
    // Schedule tab validations
    if (!formData.date_time_start.trim()) {
      newErrors.date_time_start = '開始日時を選択してください';
    }
    
    if (!formData.date_time_end.trim()) {
      newErrors.date_time_end = '終了日時を選択してください';
    } else if (new Date(formData.date_time_end) <= new Date(formData.date_time_start)) {
      newErrors.date_time_end = '終了日時は開始日時より後である必要があります';
    }
    
    // 予約締切日の検証
    if (formData.booking_deadline && formData.date_time_start) {
      if (new Date(formData.booking_deadline) > new Date(formData.date_time_start)) {
        newErrors.booking_deadline = '予約締め切り時間はレッスン開始時間より前である必要があります';
      }
    }
    
    // Location tab validations
    if (!formData.location_name.trim()) {
      newErrors.location_name = '場所を入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAsDraft = async () => {
    if (!formData.lesson_title.trim()) {
      setErrors({
        lesson_title: 'レッスン名を入力してください',
      });
      setActiveTab('basic');
      return;
    }

    // 下書き保存では日時のバリデーションをスキップ
    await saveLesson('draft');
  };

  const publishLesson = async () => {
    if (!validateForm()) {
      // Find first tab with errors and show it
      if (errors.lesson_title || errors.lesson_description || errors.category) {
        setActiveTab('basic');
      } else if (errors.price || errors.duration || errors.capacity) {
        setActiveTab('details');
      } else if (errors.date_time_start || errors.date_time_end) {
        setActiveTab('schedule');
      } else if (errors.location_name) {
        setActiveTab('location');
      }
      return;
    }

    await saveLesson('published');
  };

  const saveLesson = async (status: 'draft' | 'published' | 'cancelled') => {
    if (!id) return;

    // 予約があるレッスンはキャンセルのみ可能
    if (hasParticipants && status !== 'cancelled') {
      toast({
        title: '予約があるレッスンは変更できません',
        description: '既に予約が入っているレッスンのステータスは、キャンセルのみ可能です。',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSaving(true);
      const now = new Date().toISOString();
      
      // Get subcategory for the lesson
      const subcategory = formData.sub_categories.length > 0 ? 
        availableSubcategories.find(sub => sub.id === formData.sub_categories[0])?.name || '' : '';
      
      // 日時の処理
      // 下書き保存時は日時が空でも許可、公開時はnowをデフォルト値に
      let startDate = formData.date_time_start;
      let endDate = formData.date_time_end;
      
      if (status === 'published') {
        // 公開時は日時が必須
        if (!startDate) startDate = now;
        if (!endDate) {
          // 終了時刻が未設定の場合は開始時刻 + レッスン時間で計算（日本時間）
          const startDateTime = new Date(startDate);
          const durationMinutes = formData.duration;
          
          // 日本時間を維持したまま終了時刻を計算
          const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000));
          
          // ローカルタイムゾーン（日本時間）での値を保存
          const year = endDateTime.getFullYear();
          const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
          const day = String(endDateTime.getDate()).padStart(2, '0');
          const hours = String(endDateTime.getHours()).padStart(2, '0');
          const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
          const seconds = String(endDateTime.getSeconds()).padStart(2, '0');
          endDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }
      }
      
      // 予約がある場合、一部のフィールドのみ更新可能
      let updateData: any = {};
      
      if (hasParticipants) {
        // 予約がある場合は、ステータスの変更とレッスン概要情報のみ更新可能
        updateData = {
          lesson_description: formData.lesson_description,
          lesson_goals: formData.lesson_goals,
          lesson_outline: formData.lesson_outline,
          materials_needed: formData.materials_needed,
          lesson_image_url: [formData.lesson_image_url],
          status,
          updated_at: now,
        };
        
        toast({
          title: '限定的な更新',
          description: '予約があるレッスンは一部の情報のみ更新できます。',
        });
      } else {
        // 予約がない場合は全ての情報を更新可能
        updateData = {
          lesson_title: formData.lesson_title,
          lesson_catchphrase: formData.lesson_catchphrase,
          lesson_description: formData.lesson_description,
          category: formData.category,
          sub_category: subcategory,
          difficulty_level: formData.difficulty_level,
          price: formData.lesson_type === 'monthly' ? 0 : Number(formData.price) || 0,
          duration: formData.duration,
          capacity: formData.capacity,
          location_name: formData.location_name,
          location_type: formData.location_type,
          lesson_type: formData.lesson_type,
          is_free_trial: formData.is_free_trial,
          monthly_plans: formData.lesson_type === 'monthly' ? formData.monthly_plans : null,
          course_sessions: formData.lesson_type === 'course' ? formData.course_sessions : null,
          lesson_image_url: [formData.lesson_image_url],
          date_time_start: startDate || null,
          date_time_end: endDate || null,
          booking_deadline: formData.booking_deadline || null,
          status,
          materials_needed: formData.materials_needed,
          lesson_goals: formData.lesson_goals,
          lesson_outline: formData.lesson_outline,
          updated_at: now,
        };
      }
      
      const { error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Show success message
      toast({
        description: status === 'published' 
          ? 'レッスンが公開されました' 
          : status === 'draft' 
            ? 'レッスンが下書き保存されました'
            : 'レッスンがキャンセルされました',
      });
      
      // Refresh lesson data
      fetchLesson();
      
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "レッスンの保存に失敗しました。",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/instructor/lessons')}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>レッスン一覧へ戻る</span>
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">レッスンを編集</h1>
          <p className="text-gray-500 mt-1">ステータス: 
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${formData.status === 'published' ? 'bg-green-100 text-green-800' : 
                formData.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                'bg-red-100 text-red-800'}`}>
              {formData.status === 'published' ? '公開中' : 
               formData.status === 'draft' ? '下書き' : 'キャンセル'}
            </span>
          </p>
        </div>
        
        <div className="flex space-x-3">
          {formData.status === 'published' && (
            <Button
              variant="outline"
              onClick={() => saveLesson('cancelled')}
              disabled={saving}
              className="text-red-500 border-red-500 hover:bg-red-50"
            >
              キャンセル
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={saveAsDraft}
            disabled={saving}
          >
            下書き保存
          </Button>
          
          <Button
            onClick={publishLesson}
            disabled={saving || imageUploading}
          >
            {saving ? '保存中...' : '公開する'}
          </Button>
        </div>
      </div>
      
      {hasParticipants && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">注意</h3>
              <p className="text-sm text-yellow-700 mt-1">
                このレッスンは既に{originalLesson?.current_participants_count}人の参加者がいます。基本情報や日程など重要な情報は変更できません。
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                変更可能な項目: レッスンの説明文、レッスン目標、アウトライン、必要な教材、画像
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b">
              <TabsTrigger 
                value="basic" 
                className="data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent"
              >
                基本情報
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent"
              >
                詳細情報
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent"
              >
                日程
              </TabsTrigger>
              <TabsTrigger 
                value="location" 
                className="data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent"
              >
                場所
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent"
              >
                メディア
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-6">
            <TabsContent value="basic">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    レッスン名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lesson_title"
                    value={formData.lesson_title}
                    onChange={handleInputChange}
                    maxLength={25}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.lesson_title ? 'border-red-500' : ''
                    } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="例：初心者向けギターレッスン"
                    disabled={hasParticipants}
                    title={hasParticipants ? "予約があるため変更できません" : ""}
                  />
                  <p className="mt-1 text-xs text-gray-500">最大25文字</p>
                  {errors.lesson_title && (
                    <p className="mt-1 text-sm text-red-500">{errors.lesson_title}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャッチコピー <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lesson_catchphrase"
                    value={formData.lesson_catchphrase}
                    onChange={handleInputChange}
                    maxLength={50}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.lesson_catchphrase ? 'border-red-500' : ''
                    } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="例：3ヶ月で弾き語りができるようになる！"
                    disabled={hasParticipants}
                    title={hasParticipants ? "予約があるため変更できません" : ""}
                  />
                  <p className="mt-1 text-xs text-gray-500">最大50文字</p>
                  {errors.lesson_catchphrase && (
                    <p className="mt-1 text-sm text-red-500">{errors.lesson_catchphrase}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    レッスンの説明 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="lesson_description"
                    value={formData.lesson_description}
                    onChange={handleInputChange}
                    rows={5}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.lesson_description ? 'border-red-500' : ''
                    }`}
                    placeholder="レッスンの内容や目的を詳しく説明してください。"
                  />
                  {errors.lesson_description && (
                    <p className="mt-1 text-sm text-red-500">{errors.lesson_description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリ <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        errors.category ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">カテゴリを選択</option>
                      {CATEGORIES.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      サブカテゴリ（複数選択可）
                    </label>
                    {formData.category ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availableSubcategories.map(sub => (
                          <div key={sub.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`subcategory-${sub.id}`}
                              checked={formData.sub_categories.includes(sub.id)}
                              onChange={() => handleSubcategoryChange(sub.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`subcategory-${sub.id}`} className="ml-2 text-sm text-gray-700">
                              {sub.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">カテゴリを選択するとサブカテゴリが表示されます</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    難易度
                  </label>
                  <select
                    name="difficulty_level"
                    value={formData.difficulty_level}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="beginner">初級者向け</option>
                    <option value="intermediate">中級者向け</option>
                    <option value="advanced">上級者向け</option>
                    <option value="all">全レベル対応</option>
                  </select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    レッスン形態 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.lesson_type === 'monthly'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      } ${hasParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'monthly' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="monthly"
                          checked={formData.lesson_type === 'monthly'}
                          onChange={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'monthly' })}
                          className="h-4 w-4 text-primary"
                          disabled={hasParticipants}
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          月謝制
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        定期的に継続するレッスン。月単位で料金を設定します。
                      </p>
                      
                      {formData.lesson_type === 'monthly' && !hasParticipants && (
                        <div className="mt-3 border-t pt-3">
                          <div className="mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              体験無料設定
                            </label>
                            <div className="flex items-center mt-1">
                              <input
                                type="checkbox"
                                id="is_free_trial"
                                checked={formData.is_free_trial}
                                onChange={(e) => setFormData({ ...formData, is_free_trial: e.target.checked })}
                                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                              />
                              <label htmlFor="is_free_trial" className="ml-2 text-sm text-gray-700">
                                体験レッスン無料
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.lesson_type === 'one_time'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      } ${hasParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'one_time' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="one_time"
                          checked={formData.lesson_type === 'one_time'}
                          onChange={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'one_time' })}
                          className="h-4 w-4 text-primary"
                          disabled={hasParticipants}
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          単発レッスン
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        単発で参加できる1回完結型のレッスンです。
                      </p>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.lesson_type === 'course'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      } ${hasParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'course' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="course"
                          checked={formData.lesson_type === 'course'}
                          onChange={() => !hasParticipants && setFormData({ ...formData, lesson_type: 'course' })}
                          className="h-4 w-4 text-primary"
                          disabled={hasParticipants}
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          コース講座
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        複数回のレッスンで構成されるコース。コース全体の料金を設定します。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {formData.lesson_type !== 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        価格（円） <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          min="0"
                          className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            errors.price ? 'border-red-500' : ''
                          } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="例：3000"
                          disabled={hasParticipants}
                          title={hasParticipants ? "予約があるため変更できません" : ""}
                        />
                      </div>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.lesson_type === 'course' ? 'コース全体の料金' : '1回あたりの料金'}
                      </p>
                      {hasParticipants && (
                        <p className="mt-1 text-xs text-gray-500">予約があるため変更できません</p>
                      )}
                    </div>
                  )}
                  
                  {formData.lesson_type === 'course' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        コース回数 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          name="course_sessions"
                          value={formData.course_sessions}
                          onChange={handleInputChange}
                          min="1"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            errors.course_sessions ? 'border-red-500' : ''
                          } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="例：5"
                          disabled={hasParticipants}
                          title={hasParticipants ? "予約があるため変更できません" : ""}
                        />
                        <span className="ml-2">回</span>
                      </div>
                      {errors.course_sessions && (
                        <p className="mt-1 text-sm text-red-500">{errors.course_sessions}</p>
                      )}
                    </div>
                  )}
                  
                  {formData.lesson_type === 'monthly' && !hasParticipants && (
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        プラン設定 <span className="text-red-500">*</span>
                      </label>
                      
                      {formData.monthly_plans.map((plan, index) => (
                        <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">プラン名</label>
                              <input
                                type="text"
                                value={plan.name}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].name = e.target.value;
                                  setFormData({...formData, monthly_plans: newPlans});
                                }}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="例：スタンダードプラン"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">月額料金（円）</label>
                              <input
                                type="number"
                                value={plan.price}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].price = e.target.value;
                                  setFormData({...formData, monthly_plans: newPlans});
                                }}
                                min="0"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="例：10000"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
                              <input
                                type="text"
                                value={plan.frequency}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].frequency = e.target.value;
                                  setFormData({...formData, monthly_plans: newPlans});
                                }}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="例：週1回"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">レッスン時間（分）</label>
                              <input
                                type="number"
                                value={plan.lesson_duration}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].lesson_duration = e.target.value;
                                  setFormData({...formData, monthly_plans: newPlans});
                                }}
                                min="15"
                                step="15"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="例：60"
                              />
                            </div>
                          </div>
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                            <textarea
                              value={plan.description}
                              onChange={(e) => {
                                const newPlans = [...formData.monthly_plans];
                                newPlans[index].description = e.target.value;
                                setFormData({...formData, monthly_plans: newPlans});
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="例：月4回のグループレッスンが含まれます"
                            />
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const newPlans = [...formData.monthly_plans];
                                newPlans.splice(index, 1);
                                setFormData({...formData, monthly_plans: newPlans});
                              }}
                              className="px-3 py-2 bg-red-50 text-red-500 rounded-md hover:bg-red-100"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            monthly_plans: [
                              ...formData.monthly_plans,
                              { name: '', price: '', frequency: '', lesson_duration: '60', description: '' }
                            ]
                          });
                        }}
                        className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                      >
                        プランを追加
                      </button>
                      
                      {errors.monthly_plans && (
                        <p className="mt-2 text-sm text-red-500">{errors.monthly_plans}</p>
                      )}
                    </div>
                  )}
                  
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    必要な持ち物・準備
                  </label>
                  <textarea
                    name="materials_needed"
                    value={formData.materials_needed}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="例：ノートパソコン、筆記用具、カメラなど"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学習目標
                  </label>
                  <textarea
                    name="lesson_goals"
                    value={formData.lesson_goals}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="例：このレッスンが終わると何ができるようになるか"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    レッスンの流れ
                  </label>
                  <textarea
                    name="lesson_outline"
                    value={formData.lesson_outline}
                    onChange={handleInputChange}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="例：1. 導入（10分）、2. 基本的な操作の説明（20分）、3. 実践練習（20分）、4. 質疑応答（10分）"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="schedule">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始日時 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="datetime-local"
                        name="date_time_start"
                        value={formData.date_time_start}
                        onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errors.date_time_start ? 'border-red-500' : ''
                        } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={hasParticipants}
                        title={hasParticipants ? "予約があるため変更できません" : ""}
                      />
                    </div>
                    {errors.date_time_start && (
                      <p className="mt-1 text-sm text-red-500">{errors.date_time_start}</p>
                    )}
                    {hasParticipants && (
                      <p className="mt-1 text-xs text-gray-500">予約があるため変更できません</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了日時 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="datetime-local"
                        name="date_time_end"
                        value={formData.date_time_end}
                        onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errors.date_time_end ? 'border-red-500' : ''
                        } ${hasParticipants ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={hasParticipants}
                        title={hasParticipants ? "予約があるため変更できません" : ""}
                      />
                    </div>
                    {errors.date_time_end && (
                      <p className="mt-1 text-sm text-red-500">{errors.date_time_end}</p>
                    )}
                    {hasParticipants && (
                      <p className="mt-1 text-xs text-gray-500">予約があるため変更できません</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      予約締め切り時間
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="datetime-local"
                        name="booking_deadline"
                        value={formData.booking_deadline}
                        onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errors.booking_deadline ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">空欄の場合、開始直前まで予約可能</p>
                    {errors.booking_deadline && (
                      <p className="mt-1 text-sm text-red-500">{errors.booking_deadline}</p>
                    )}
                  </div>
                </div>
                
                {hasParticipants && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">注意事項</p>
                        <p className="mt-1">
                          既に予約が入っているレッスンの日程を変更すると、参加者に影響します。変更する場合は、参加者に個別に連絡することをお勧めします。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="location">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    レッスンの形式 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.location_type === 'online'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setFormData({ ...formData, location_type: 'online' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="location_type"
                          value="online"
                          checked={formData.location_type === 'online'}
                          onChange={() => setFormData({ ...formData, location_type: 'online' })}
                          className="h-4 w-4 text-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          オンライン
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Zoom、Google Meet、Skypeなどのビデオ会議ツールを使用してレッスンを行います。
                      </p>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.location_type === 'in_person'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setFormData({ ...formData, location_type: 'in_person' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="location_type"
                          value="in_person"
                          checked={formData.location_type === 'in_person'}
                          onChange={() => setFormData({ ...formData, location_type: 'in_person' })}
                          className="h-4 w-4 text-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          対面
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        特定の場所に集まって対面でレッスンを行います。
                      </p>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.location_type === 'hybrid'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setFormData({ ...formData, location_type: 'hybrid' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="location_type"
                          value="hybrid"
                          checked={formData.location_type === 'hybrid'}
                          onChange={() => setFormData({ ...formData, location_type: 'hybrid' })}
                          className="h-4 w-4 text-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          ハイブリッド
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        対面とオンラインの両方の選択肢を提供します。
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    場所の詳細 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                    <textarea
                      name="location_name"
                      value={formData.location_name}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        errors.location_name ? 'border-red-500' : ''
                      }`}
                      placeholder={
                        formData.location_type === 'online'
                          ? '使用するオンラインツール（Zoom、Google Meet、Skypeなど）と、レッスン前に共有するURLについての情報'
                          : formData.location_type === 'in_person'
                          ? '正確な住所、建物名、部屋番号、アクセス方法などの詳細'
                          : '対面とオンラインの両方の選択肢に関する詳細情報'
                      }
                    />
                  </div>
                  {errors.location_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.location_name}</p>
                  )}
                </div>
                
                {hasParticipants && formData.location_type !== originalLesson?.location_type && (
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">レッスン形式の変更について</p>
                        <p className="mt-1">
                          レッスン形式を変更すると、既に申し込んでいる参加者に影響する可能性があります。変更する場合は、参加者に個別に連絡することをお勧めします。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="media">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    レッスン画像（最大3枚まで）
                  </label>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 画像アップロードボタン */}
                    {formData.lesson_image_url.length < 3 && (
                      <div className="flex items-center justify-center">
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 w-full flex flex-col items-center justify-center ${
                            imageUploading ? 'opacity-50' : 'hover:border-primary/50 hover:bg-gray-50'
                          }`}
                        >
                          <div className="relative cursor-pointer">
                            <input
                              type="file"
                              id="lesson-image"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleImageUpload}
                              disabled={imageUploading}
                            />
                            <div className="flex flex-col items-center justify-center py-4">
                              <Upload className={`h-8 w-8 ${imageUploading ? 'text-gray-400' : 'text-primary'}`} />
                              <p className="mt-2 text-sm font-medium text-gray-700">
                                {imageUploading ? '画像をアップロード中...' : '画像をアップロード'}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                PNG, JPG, GIF（最大 5MB）
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 画像プレビュー */}
                    {formData.lesson_image_url.length > 0 ? (
                      formData.lesson_image_url.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`レッスン画像 ${index + 1}`}
                            className="w-full h-48 object-cover rounded-md"
                          />
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                              {index + 1}/{formData.lesson_image_url.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-md border text-gray-400 col-span-3">
                        <div className="flex flex-col items-center">
                          <ImageIcon className="h-10 w-10" />
                          <p className="mt-2 text-sm">画像が未設定です</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500">
                    {formData.lesson_image_url.length}/3枚 アップロード済み
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      <div className="mt-6 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            const tabs = ['basic', 'details', 'schedule', 'location', 'media'];
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex > 0) {
              setActiveTab(tabs[currentIndex - 1]);
            }
          }}
          disabled={activeTab === 'basic'}
        >
          前へ
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={saveAsDraft}
            disabled={saving}
          >
            下書き保存
          </Button>
          {activeTab === 'media' ? (
            <Button
              onClick={publishLesson}
              disabled={saving || imageUploading}
            >
              {saving ? '保存中...' : '公開する'}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                const tabs = ['basic', 'details', 'schedule', 'location', 'media'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}
              disabled={activeTab === 'media'}
            >
              次へ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorLessonEdit;