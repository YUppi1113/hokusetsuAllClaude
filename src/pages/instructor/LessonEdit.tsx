import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
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
  Upload,
} from 'lucide-react';

const InstructorLessonEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // 各種状態（作成ページと同一）
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    lesson_title: '',
    lesson_catchphrase: '',
    lesson_description: '',
    category: '',
    sub_categories: [], // これを使って sub_category フィールド（単一値）を決定する
    difficulty_level: 'beginner',
    price: '',
    duration: 60,
    capacity: 10,
    location_name: '',
    location_type: 'online',
    lesson_type: 'one_time',
    is_free_trial: false,
    lesson_image_url: [],
    status: 'draft',
    materials_needed: '',
    lesson_goals: '',
    lesson_outline: '',
    target_audience: [],
    monthly_plans: [],
    course_sessions: 1,
    // スケジュール関連のフィールド（データベースにはないけど UI で使用）
    default_start_time: '10:00',
    deadline_days: 1,
    deadline_time: '18:00',
    discount: 0, // discount_percentage と同じものだが、UI 操作用
    selected_dates: [],
    selected_weekdays: [],
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    notes: '',
    venue_details: '',
    lesson_slots: [],
  });
  const [availableSubcategories, setAvailableSubcategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    start_time: '',
    end_time: '',
    capacity: 10,
    price: 0,
    discount: 0,
    deadline_days: 1,
    deadline_time: '18:00',
    notes: '',
    venue_details: '',
  });

  // レッスン情報を取得してフォームに反映（作成ページとの差分：既存データの取得）
  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) return;
      try {
       // レッスン情報を取得
const { data: lessonData, error: lessonError } = await supabase
.from('lessons')
.select('*')
.eq('id', id)
.maybeSingle();

if (lessonError) throw lessonError;
if (!lessonData) throw new Error("レッスンデータが見つかりませんでした");

// lesson_slotsテーブルから予約枠データを取得
const { data: slotData, error: slotError } = await supabase
.from('lesson_slots')
.select('*')
.eq('lesson_id', id);

if (slotError) throw slotError;

        
        // HTMLのdatetime-local形式に合わせるためフォーマット
        let formattedStartDate = '';
        let formattedEndDate = '';
        if (lessonData.date_time_start) {
          formattedStartDate = new Date(lessonData.date_time_start)
            .toISOString()
            .slice(0, 16);
        }
        if (lessonData.date_time_end) {
          formattedEndDate = new Date(lessonData.date_time_end)
            .toISOString()
            .slice(0, 16);
        }

// サブカテゴリを適切に設定
let subCats = [];
if (lessonData.category && lessonData.sub_category) {
const subs = SUBCATEGORIES[lessonData.category];
if (subs) {
  setAvailableSubcategories(subs);
  if (lessonData.sub_category) {
    const found = subs.find((sub) => sub.name === lessonData.sub_category);
    if (found) {
      subCats = [found.id];
    }
  }
}
}

// 予約枠と選択された日付の処理
let lessonSlots = [];
let selectedDates = [];

// データベースから取得したlesson_slotsがある場合
if (slotData && Array.isArray(slotData) && slotData.length > 0) {
// データベースから取得した予約枠を処理
lessonSlots = slotData.map(slot => {
  // date_time_startから日付部分のみを抽出
  const dateObj = new Date(slot.date_time_start);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // 時間のみを抽出
  const startHours = String(dateObj.getHours()).padStart(2, '0');
  const startMinutes = String(dateObj.getMinutes()).padStart(2, '0');
  const startTime = `${startHours}:${startMinutes}`;
  
  // 終了時間の処理
  const endDateObj = new Date(slot.date_time_end);
  const endHours = String(endDateObj.getHours()).padStart(2, '0');
  const endMinutes = String(endDateObj.getMinutes()).padStart(2, '0');
  const endTime = `${endHours}:${endMinutes}`;
  
  // 予約締切日時の処理
  let deadlineDays = 1;
  let deadlineTime = '18:00';
  
  if (slot.booking_deadline) {
    const deadlineObj = new Date(slot.booking_deadline);
    const lessonDate = new Date(slot.date_time_start);
    
    // 日数の差を計算
    const timeDiff = lessonDate.getTime() - deadlineObj.getTime();
    deadlineDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // 時間を抽出
    deadlineTime = `${String(deadlineObj.getHours()).padStart(2, '0')}:${String(deadlineObj.getMinutes()).padStart(2, '0')}`;
  }
  
  // 選択された日付に追加
  if (!selectedDates.includes(dateStr)) {
    selectedDates.push(dateStr);
  }
  
  return {
    date: dateStr,
    start_time: startTime,
    end_time: endTime,
    capacity: slot.capacity || lessonData.capacity || 10,
    price: slot.price || lessonData.price || 0,
    discount: slot.discount_percentage || 0,
    deadline_days: deadlineDays,
    deadline_time: deadlineTime,
    notes: slot.notes || '',
    venue_details: slot.venue_details || '',
    is_free_trial: slot.is_free_trial || false,
  };
});
}
        // lesson_slotsデータがない場合は、レッスン開始日をもとにデフォルトの予約枠を作成
        else if (lessonData.date_time_start) {
          console.log("Creating default slot from date_time_start:", lessonData.date_time_start);
          
          try {
            // レッスン開始日をフォーマット
            const startDate = new Date(lessonData.date_time_start);
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            // 時間のみを抽出
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            const startTime = `${hours}:${minutes}`;
            
            // 終了時間を計算
            const endDate = new Date(lessonData.date_time_end || startDate.getTime() + (lessonData.duration || 60) * 60 * 1000);
            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
            const endTime = `${endHours}:${endMinutes}`;
            
            selectedDates = [dateString];
            lessonSlots = [{
              date: dateString,
              start_time: startTime,
              end_time: endTime,
              capacity: lessonData.capacity || 10,
              price: lessonData.is_free_trial ? 0 : (lessonData.price || 0),
              discount: lessonData.discount_percentage || 0,
              deadline_days: 1,
              deadline_time: '18:00',
              notes: '',
              venue_details: '',
              is_free_trial: lessonData.is_free_trial || false,
            }];
            
            console.log("Created default slot:", lessonSlots[0]);
          } catch (e) {
            console.error("Failed to create default slot from date_time_start:", e);
          }
        }
        
        console.log("Selected dates after extraction:", selectedDates);
        console.log("Lesson slots after synchronization:", lessonSlots);
        
        // 対象の月をカレンダーに表示するため、日付から月を取得
        let calendarMonth = new Date().getMonth();
        let calendarYear = new Date().getFullYear();
        
        if (selectedDates.length > 0) {
          try {
            const firstDate = new Date(selectedDates[0]);
            calendarMonth = firstDate.getMonth();
            calendarYear = firstDate.getFullYear();
            console.log("Setting calendar to:", calendarYear, calendarMonth);
          } catch (e) {
            console.error("Failed to parse date for calendar:", e);
          }
        }
        
        setFormData((prev) => ({
          ...prev,
          lesson_title: lessonData.lesson_title || '',
          lesson_catchphrase: lessonData.lesson_catchphrase || '',
          lesson_description: lessonData.lesson_description || '',
          category: lessonData.category || '',
          sub_categories: subCats,
          difficulty_level: lessonData.difficulty_level || 'beginner',
          price: lessonData.price ? lessonData.price.toString() : '',
          duration: lessonData.duration || 60,
          capacity: lessonData.capacity || 10,
          location_name: lessonData.location_name || '',
          location_type: lessonData.location_type || 'online',
          lesson_type: lessonData.lesson_type || 'one_time',
          is_free_trial: lessonData.is_free_trial || false,
          lesson_image_url: lessonData.lesson_image_url || [],
          date_time_start: formattedStartDate,
          date_time_end: formattedEndDate,
          status: lessonData.status || 'draft',
          materials_needed: lessonData.materials_needed || '',
          lesson_goals: lessonData.lesson_goals || '',
          lesson_outline: lessonData.lesson_outline || '',
          target_audience: lessonData.target_audience || [],
          monthly_plans: lessonData.monthly_plans || [],
          course_sessions: lessonData.course_sessions || 1,
          // スケジュール関連も既存レッスンから読み込む
          default_start_time: lessonData.default_start_time || '10:00',
          deadline_days: lessonData.deadline_days || 1,
          deadline_time: lessonData.deadline_time || '18:00',
          discount: lessonData.discount_percentage || 0,
          selected_dates: selectedDates,
          selected_weekdays: lessonData.selected_weekdays || [],
          calendarMonth,
          calendarYear,
          notes: lessonData.notes || '',
          venue_details: lessonData.venue_details || '',
          lesson_slots: lessonSlots,
        }));
        
        setImagePreview(lessonData.lesson_image_url || []);
      } catch (error) {
        console.error('Error fetching lesson:', error);
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: 'レッスン情報の取得に失敗しました。',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id]);

  // 作成ページと同様の初期値設定
  useEffect(() => {
    if (formData.lesson_type === 'monthly' && formData.monthly_plans.length === 0) {
      setFormData((prev) => ({
        ...prev,
        monthly_plans: [
          { name: '', price: '', frequency: '', lesson_duration: '60', description: '' },
        ],
      }));
    }
    if (!formData.date_time_start) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData((prev) => ({
        ...prev,
        date_time_start: dateTimeString,
      }));
    }
  }, [formData.lesson_type, formData.date_time_start]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'date_time_start' && value) {
      const startDateTime = new Date(value);
      const durationMinutes = formData.duration;
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(endDateTime.getDate()).padStart(2, '0');
      const hours = String(endDateTime.getHours()).padStart(2, '0');
      const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        date_time_end: endDateString,
      }));
    } else if (name === 'duration' && formData.date_time_start) {
      const startDateTime = new Date(formData.date_time_start);
      const durationMinutes = parseInt(value, 10);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(endDateTime.getDate()).padStart(2, '0');
      const hours = String(endDateTime.getHours()).padStart(2, '0');
      const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value, 10),
        date_time_end: endDateString,
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    if (name === 'category') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        sub_categories: [],
      }));
      const categoryId = value as string;
      if (categoryId && SUBCATEGORIES[categoryId]) {
        setAvailableSubcategories(SUBCATEGORIES[categoryId]);
      } else {
        setAvailableSubcategories([]);
      }
    }

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setFormData((prev) => {
      const updatedSubcategories = prev.sub_categories.includes(subcategoryId)
        ? prev.sub_categories.filter((id) => id !== subcategoryId)
        : [...prev.sub_categories, subcategoryId];
      return {
        ...prev,
        sub_categories: updatedSubcategories,
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setImageUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // ストレージが存在するか確認
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets.find(bucket => bucket.name === 'user_uploads')) {
        await supabase.storage.createBucket('user_uploads', { public: true });
      }
      
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `lesson_images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // 公開URL取得
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);
        
      if (formData.lesson_image_url.length >= 3) {
        throw new Error('画像は最大3枚までアップロードできます');
      }
      
      // URLと画像プレビューを更新
      const updatedUrls = [...formData.lesson_image_url, publicUrl];
      setFormData({
        ...formData,
        lesson_image_url: updatedUrls,
      });
      
      const updatedPreviews = [...imagePreview, URL.createObjectURL(file)];
      setImagePreview(updatedPreviews);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'アップロードエラー',
        description: error.message || '画像のアップロードに失敗しました。',
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
    const newErrors = {};
    
    // 基本情報のバリデーション
    if (!formData.lesson_title.trim()) {
      newErrors.lesson_title = 'レッスン名を入力してください';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'カテゴリを選択してください';
    }
    
    // レッスン形態に応じたバリデーション
    if (formData.lesson_type !== 'monthly') {
      if (!formData.price.toString().trim() || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
        newErrors.price = '有効な価格を入力してください';
      }
      
      if (formData.duration <= 0) {
        newErrors.duration = '有効な時間を入力してください';
      }
      
      if (formData.capacity <= 0) {
        newErrors.capacity = '有効な定員数を入力してください';
      }
    } else {
      // 月謝制の場合は少なくとも1つのプランが必要
      if (formData.monthly_plans.length === 0) {
        newErrors.monthly_plans = '少なくとも1つのプランを追加してください';
      } else {
        // プランの内容をチェック
        const invalidPlans = formData.monthly_plans.some(
          plan => !plan.name || !plan.price || !plan.frequency || !plan.lesson_duration
        );
        if (invalidPlans) {
          newErrors.monthly_plans = 'すべてのプラン情報を入力してください';
        }
      }
    }
    
    // コース形式なら回数チェック
    if (formData.lesson_type === 'course' && formData.course_sessions < 1) {
      newErrors.course_sessions = '有効な回数を入力してください';
    }
    
    // 場所のチェック (詳細情報タブに移動済)
    if (!formData.location_name.trim()) {
      newErrors.location_name = '場所の詳細を入力してください';
    }
    
    // 割引率のチェック
    if (formData.discount < 0 || formData.discount > 100) {
      newErrors.discount = '割引率は0〜100%の範囲で入力してください';
    }
    
    // 公開時は予約枠のチェック
    if (formData.status === 'published' && (!formData.selected_dates || formData.selected_dates.length === 0)) {
      newErrors.selected_dates = '少なくとも1つの予約枠を設定してください';
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
    // 下書き保存の場合、日時のバリデーションはスキップ
    await saveLesson('draft');
  };

  const publishLesson = async () => {
    if (!validateForm()) {
      if (errors.lesson_title || errors.lesson_description || errors.category) {
        setActiveTab('basic');
      } else if (
        errors.price || 
        errors.duration || 
        errors.capacity || 
        errors.location_name || 
        errors.monthly_plans || 
        errors.course_sessions
      ) {
        setActiveTab('details');
      } else if (
        errors.date_time_start || 
        errors.date_time_end ||
        errors.selected_dates ||
        errors.default_start_time ||
        errors.deadline_days ||
        errors.deadline_time
      ) {
        setActiveTab('schedule');
      }
      return;
    }
    await saveLesson('published');
  };

  const saveLesson = async (status: 'draft' | 'published') => {
    if (!id) return;
    try {
      setSaving(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      const now = new Date().toISOString();
      
      // Get subcategory for the lesson - ここをデータベースに合わせて単一値にする
      const subcategory = formData.sub_categories.length > 0 ? 
        availableSubcategories.find(sub => sub.id === formData.sub_categories[0])?.name || '' : '';
      
      // レッスン情報の基本構造を作成 - データベースカラムに合わせる
      const lessonData = {
        lesson_title: formData.lesson_title,
        lesson_catchphrase: formData.lesson_catchphrase || null,
        lesson_description: formData.lesson_description || null,
        category: formData.category,
        sub_category: subcategory, // 単一の値として保存
        difficulty_level: formData.difficulty_level || 'beginner',
        location_name: formData.location_name,
        location_type: formData.location_type || 'online',
        lesson_type: formData.lesson_type || 'one_time',
        is_free_trial: formData.is_free_trial || false,
        lesson_image_url: formData.lesson_image_url || [],
        status: status,
        materials_needed: formData.materials_needed || null,
        lesson_goals: formData.lesson_goals || null,
        lesson_outline: formData.lesson_outline || null,
        target_audience: formData.target_audience.length > 0 ? formData.target_audience : null,
        updated_at: now,
        price: formData.lesson_type === 'monthly' ? 0 : Number(formData.price) || 0,
        discount_percentage: formData.discount || null,
      };
      
      // レッスン形態ごとの追加データ
      if (formData.lesson_type === 'monthly') {
        lessonData.monthly_plans = formData.monthly_plans.length > 0 ? formData.monthly_plans : null;
        lessonData.duration = null; // 月謝制の場合は各プランに時間が設定されるので null
        lessonData.capacity = null; // 月謝制の場合は各プランに定員が設定されるので null
      } else {
        lessonData.duration = formData.duration || 60;
        lessonData.capacity = formData.capacity || 10;
        lessonData.monthly_plans = null;
        
        // コース講座の場合はセッション数を追加
        if (formData.lesson_type === 'course') {
          lessonData.course_sessions = formData.course_sessions || 1;
        } else {
          lessonData.course_sessions = null;
        }
      }
      
      // メモやベニュー詳細を追加（レッスンテーブルにあるので）
      lessonData.notes = formData.notes || null;
      lessonData.venue_details = formData.venue_details || null;
      
      console.log("Updating lesson with data:", lessonData);
      
      // レッスン情報を更新
      const { error: lessonError } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', id);
        
      if (lessonError) throw lessonError;
      
      // 公開時または下書き保存時に予約枠を保存（条件変更）
      if (formData.selected_dates && formData.selected_dates.length > 0) {
        // 既存の予約枠データを削除
        console.log("Deleting existing lesson slots for lesson ID:", id);
        const { error: deleteError } = await supabase
          .from('lesson_slots')
          .delete()
          .eq('lesson_id', id);
          
        if (deleteError) throw deleteError;
        
        // 複数の予約枠データを準備 - データベースカラムに合わせる
        const slotsToInsert = formData.selected_dates.map(dateString => {
          // このスロットの情報を取得
          const slotIndex = formData.lesson_slots.findIndex(slot => slot.date === dateString);
          const slot = slotIndex >= 0 ? formData.lesson_slots[slotIndex] : null;
          
          // 日付と時間を組み合わせる
          const startTime = slot?.start_time || formData.default_start_time || '10:00';
          const [startHour, startMinute] = startTime.split(':').map(num => parseInt(num, 10));
          
          const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
          
          // 日本時間でUTCとして日付を作成（ISO形式にするため）
          const startDate = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0));
          
          // 終了時間の設定
          let endDate;
          if (slot?.end_time) {
            const [endHour, endMinute] = slot.end_time.split(':').map(num => parseInt(num, 10));
            endDate = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));
          } else {
            // 時間がなければdurationから計算
            endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + (formData.duration || 60));
          }
          
          // 予約締め切り時間の計算
          const deadlineDays = slot?.deadline_days ?? formData.deadline_days ?? 1;
          const deadlineTime = slot?.deadline_time || formData.deadline_time || '18:00';
          const [deadlineHour, deadlineMinute] = deadlineTime.split(':').map(num => parseInt(num, 10));
          
          // 締め切り日を計算
          const bookingDeadline = new Date(startDate);
          bookingDeadline.setDate(bookingDeadline.getDate() - deadlineDays);
          bookingDeadline.setHours(deadlineHour, deadlineMinute, 0, 0);
          
          // レッスンスロットデータ - データベースカラムに合わせる
          return {
            lesson_id: id,
            date_time_start: startDate.toISOString(),
            date_time_end: endDate.toISOString(),
            booking_deadline: bookingDeadline.toISOString(),
            capacity: (slot?.capacity ?? formData.capacity) || 10,
            current_participants_count: 0,
            price: formData.is_free_trial ? 0 : (slot?.price ?? Number(formData.price)) || 0,
            discount_percentage: (slot?.discount ?? formData.discount) || null,
            venue_details: slot?.venue_details || formData.venue_details || null,
            notes: slot?.notes || formData.notes || null,
            status: status,  // ステータスを動的に設定
            is_free_trial: formData.is_free_trial || false
          };
        });
        
        console.log("Inserting new lesson slots:", slotsToInsert);
        
        // lesson_slotsテーブルにデータを挿入
        const { error: slotsError } = await supabase
          .from('lesson_slots')
          .insert(slotsToInsert);
          
        if (slotsError) throw slotsError;
      }
      
      // Redirect to lessons list
      navigate(`/instructor/lessons`, { 
        state: { 
          message: status === 'published' ? 'レッスンが公開されました' : 'レッスンが下書き保存されました'
        } 
      });
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'レッスンの保存に失敗しました: ' + error.message,
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
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>戻る</span>
        </button>
      </div>

      <div className="flex flex-col justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">レッスンを編集</h1>
        <div className="flex space-x-3 mt-2">
          <Button variant="outline" onClick={saveAsDraft} disabled={saving}>
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

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Tabs
            defaultValue="basic"
            value={activeTab}
            onValueChange={setActiveTab}
          >
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
                      }`}
                      placeholder="例：初心者向けギターレッスン"
                    />
                    <p className="mt-1 text-xs text-gray-500">最大25文字</p>
                    {errors.lesson_title && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lesson_title}
                      </p>
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
                      }`}
                      placeholder="例：3ヶ月で弾き語りができるようになる！"
                    />
                    <p className="mt-1 text-xs text-gray-500">最大50文字</p>
                    {errors.lesson_catchphrase && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lesson_catchphrase}
                      </p>
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
                      maxLength={500}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        errors.lesson_description ? 'border-red-500' : ''
                      }`}
                      placeholder="レッスンの内容や目的を詳しく説明してください。"
                    />
                    <p className="mt-1 text-xs text-gray-500">最大500文字</p>
                    {errors.lesson_description && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lesson_description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      レッスン画像（最大3枚まで）
                    </label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {formData.lesson_image_url.length < 3 && (
                        <div className="flex items-center justify-center">
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 w-full flex flex-col items-center justify-center ${
                              imageUploading
                                ? 'opacity-50'
                                : 'hover:border-primary/50 hover:bg-gray-50'
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
                                <Upload
                                  className={`h-8 w-8 ${
                                    imageUploading ? 'text-gray-400' : 'text-primary'
                                  }`}
                                />
                                <p className="mt-2 text-sm font-medium text-gray-700">
                                  {imageUploading
                                    ? '画像をアップロード中...'
                                    : '画像をアップロード'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  PNG, JPG, GIF（最大 5MB）
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.lesson_image_url.length > 0 ? (
                        formData.lesson_image_url.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={imagePreview[index] || url}
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
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
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
                        {CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.category}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        サブカテゴリ（複数選択可）
                      </label>
                      {formData.category ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availableSubcategories.map((sub) => (
                            <div key={sub.id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`subcategory-${sub.id}`}
                                checked={formData.sub_categories.includes(sub.id)}
                                onChange={() => handleSubcategoryChange(sub.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <label
                                htmlFor={`subcategory-${sub.id}`}
                                className="ml-2 text-sm text-gray-700"
                              >
                                {sub.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">
                          カテゴリを選択するとサブカテゴリが表示されます
                        </p>
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
                      レッスンの形式 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          formData.location_type === "online"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, location_type: "online" })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="location_type"
                            value="online"
                            checked={formData.location_type === "online"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                location_type: "online",
                              })
                            }
                            className="h-4 w-4 text-primary"
                          />
                          <label className="ml-2 text-sm font-medium text-gray-700">
                            オンライン
                          </label>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Zoom、Google
                          Meet、Skypeなどのビデオ会議ツールを使用してレッスンを行います。
                        </p>
                      </div>

                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          formData.location_type === "in_person"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            location_type: "in_person",
                          })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="location_type"
                            value="in_person"
                            checked={formData.location_type === "in_person"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                location_type: "in_person",
                              })
                            }
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
                          formData.location_type === "hybrid"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, location_type: "hybrid" })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="location_type"
                            value="hybrid"
                            checked={formData.location_type === "hybrid"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                location_type: "hybrid",
                              })
                            }
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
                          errors.location_name ? "border-red-500" : ""
                        }`}
                        placeholder={
                          formData.location_type === "online"
                            ? "使用するオンラインツール（Zoom、Google Meet、Skypeなど）と、レッスン前に共有するURLについての情報"
                            : formData.location_type === "in_person"
                            ? "正確な住所、建物名、部屋番号、アクセス方法などの詳細"
                            : "対面とオンラインの両方の選択肢に関する詳細情報"
                        }
                      />
                    </div>
                    {errors.location_name && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.location_name}
                      </p>
                    )}
                  </div>
                
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
                      }`}
                      onClick={() => setFormData({ ...formData, lesson_type: 'monthly' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="monthly"
                          checked={formData.lesson_type === 'monthly'}
                          onChange={() => setFormData({ ...formData, lesson_type: 'monthly' })}
                          className="h-4 w-4 text-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          月謝制
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        定期的に継続するレッスン。月単位で料金を設定します。
                      </p>
                      
                      {formData.lesson_type === 'monthly' && (
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
                      }`}
                      onClick={() => setFormData({ ...formData, lesson_type: 'one_time' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="one_time"
                          checked={formData.lesson_type === 'one_time'}
                          onChange={() => setFormData({ ...formData, lesson_type: 'one_time' })}
                          className="h-4 w-4 text-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          単発講座
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        1回で完結するレッスン。1回分の料金を設定します。
                      </p>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        formData.lesson_type === 'course'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setFormData({ ...formData, lesson_type: 'course' })}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="lesson_type"
                          value="course"
                          checked={formData.lesson_type === 'course'}
                          onChange={() => setFormData({ ...formData, lesson_type: 'course' })}
                          className="h-4 w-4 text-primary"
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
                          }`}
                          placeholder="例：3000"
                        />
                      </div>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.lesson_type === 'course' ? 'コース全体の料金' : '1回あたりの料金'}
                      </p>
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
                          }`}
                          placeholder="例：5"
                        />
                        <span className="ml-2">回</span>
                      </div>
                      {errors.course_sessions && (
                        <p className="mt-1 text-sm text-red-500">{errors.course_sessions}</p>
                      )}
                    </div>
                  )}
                  
                  {formData.lesson_type === 'monthly' && (
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        月謝体系 <span className="text-red-500">*</span>
                      </label>
                      
                      {formData.monthly_plans.length === 0 && (
                        <div className="mb-4 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
                          <p>少なくとも1つのプランを追加してください</p>
                        </div>
                      )}
                      
                      {formData.monthly_plans.map((plan, index) => (
                        <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-base font-semibold">月謝体系{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const newPlans = [...formData.monthly_plans];
                                newPlans.splice(index, 1);
                                setFormData({...formData, monthly_plans: newPlans});
                              }}
                              className="px-3 py-1 bg-red-50 text-red-500 rounded-md hover:bg-red-100"
                            >
                              削除
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">月額料金（円）</label>
                              <input
                                type="number"
                                value={plan.price}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].price = e.target.value;
                                  newPlans[index].name = `月謝体系${index + 1}`;
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
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          const newIndex = formData.monthly_plans.length + 1;
                          setFormData({
                            ...formData,
                            monthly_plans: [
                              ...formData.monthly_plans,
                              { name: `月謝体系${newIndex}`, price: '', frequency: '', lesson_duration: '60', description: '' }
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
                  
                  {formData.lesson_type !== 'monthly' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          レッスン時間（分） <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleInputChange}
                            min="15"
                            step="15"
                            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              errors.duration ? 'border-red-500' : ''
                            }`}
                            placeholder="例：60"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">1回あたりのレッスン時間です</p>
                        {errors.duration && (
                          <p className="mt-1 text-sm text-red-500">{errors.duration}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          定員 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="capacity"
                            value={formData.capacity}
                            onChange={handleInputChange}
                            min="1"
                            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              errors.capacity ? 'border-red-500' : ''
                            }`}
                            placeholder="例：10"
                          />
                        </div>
                        {errors.capacity && (
                          <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>
                        )}
                      </div>
                    </>
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    こんな方を対象としています
                  </label>
                  {formData.target_audience.map((item, index) => (
                    <div key={index} className="mb-2 flex items-center">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newTargetAudience = [...formData.target_audience];
                          newTargetAudience[index] = e.target.value;
                          setFormData({...formData, target_audience: newTargetAudience});
                        }}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={`例：${index === 0 ? "プログラミング初心者の方" : 
                                        index === 1 ? "IT業界への転職を考えている方" : 
                                        "新しい趣味を探している方"}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newTargetAudience = [...formData.target_audience];
                          newTargetAudience.splice(index, 1);
                          setFormData({...formData, target_audience: newTargetAudience});
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        target_audience: [...formData.target_audience, '']
                      });
                    }}
                    className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    対象者を追加
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="schedule">
                <div className="space-y-6">
                  {formData.lesson_type === 'monthly' && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="font-medium text-blue-800">
                          月謝制レッスンの初回体験予約枠設定
                        </h3>
                      </div>
                      <p className="mt-2 ml-7 text-sm text-blue-700">
                        以下で設定する予約枠は、新規生徒の体験レッスン用の予約枠です。
                        {formData.is_free_trial
                          ? '初回体験無料設定が有効なため、体験レッスンの料金は0円に設定されます。'
                          : ''}
                      </p>
                    </div>
                  )}

                  {formData.is_free_trial && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-orange-500 mr-2" />
                        <h3 className="font-medium text-orange-800">
                          初回体験無料の設定が有効です
                        </h3>
                      </div>
                      <p className="mt-2 ml-7 text-sm text-orange-700">
                        体験無料設定が有効なため、すべての予約枠のレッスン料金は0円に設定されます。
                        各予約枠の料金欄は自動的に「初回体験無料」と表示され、編集はできません。
                      </p>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold">予約枠の共通設定</h3>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (
                            !formData.selected_dates ||
                            formData.selected_dates.length === 0
                          ) {
                            alert(
                              '予約枠が選択されていません。先にカレンダーから日付を選択してください。'
                            );
                            return;
                          }
                          if (
                            confirm('共通設定を全ての予約枠に適用しますか？')
                          ) {
                            const updatedSlots = formData.lesson_slots.map(
                              (slot) => {
                                const startTime =
                                  formData.default_start_time || '10:00';
                                const [startHour, startMinute] =
                                  startTime.split(':').map((num) =>
                                    parseInt(num, 10)
                                  );
                                const endHour = Math.floor(
                                  startHour + (formData.duration || 60) / 60
                                );
                                const endMinute =
                                  (startMinute + (formData.duration || 60) % 60) %
                                  60;
                                const endTime = `${String(
                                  endHour
                                ).padStart(2, '0')}:${String(
                                  endMinute
                                ).padStart(2, '0')}`;
                                return {
                                  ...slot,
                                  start_time: startTime,
                                  end_time: endTime,
                                  capacity: formData.capacity || 10,
                                  price: formData.is_free_trial
                                    ? 0
                                    : (parseInt(formData.price as string, 10) ||
                                       0),
                                  discount: formData.discount || 0,
                                  deadline_days: formData.deadline_days || 1,
                                  deadline_time:
                                    formData.deadline_time || '18:00',
                                  notes: formData.notes || '',
                                  venue_details:
                                    formData.venue_details || '',
                                };
                              }
                            );
                            setFormData({
                              ...formData,
                              lesson_slots: updatedSlots,
                            });
                            alert('すべての予約枠に共通設定を適用しました');
                          }
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        全ての予約枠に適用
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          開始時間 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="time"
                            name="default_start_time"
                            value={formData.default_start_time || '10:00'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                default_start_time: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          レッスン時間（分） <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleInputChange}
                            min="15"
                            step="15"
                            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              errors.duration ? 'border-red-500' : ''
                            }`}
                            placeholder="例：60"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          定員 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="capacity"
                            value={formData.capacity}
                            onChange={handleInputChange}
                            min="1"
                            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              errors.capacity ? 'border-red-500' : ''
                            }`}
                            placeholder="例：10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          レッスン料金（円） <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="price"
                            value={formData.is_free_trial ? 0 : formData.price}
                            onChange={handleInputChange}
                            min="0"
                            disabled={formData.is_free_trial}
                            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              errors.price ? 'border-red-500' : ''
                            } ${
                              formData.is_free_trial
                                ? 'bg-gray-100 cursor-not-allowed'
                                : ''
                            }`}
                            placeholder="例：3000"
                          />
                        </div>
                        {formData.is_free_trial && (
                          <p className="mt-1 text-xs text-orange-500">
                            体験無料設定が有効のため、料金は0円に固定されます
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          予約締め切り（日前） <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="number"
                            name="deadline_days"
                            value={formData.deadline_days ?? 1}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                deadline_days: parseInt(e.target.value, 10) || '',
                              })
                            }
                            min="0"
                            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          予約締め切り時間 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="time"
                            name="deadline_time"
                            value={formData.deadline_time || '18:00'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                deadline_time: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          割引（%OFF）
                        </label>
                        <div className="relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="19" y1="5" x2="5" y2="19"></line>
                            <circle cx="6.5" cy="6.5" r="2.5"></circle>
                            <circle cx="17.5" cy="17.5" r="2.5"></circle>
                          </svg>
                          <input
                            type="number"
                            name="discount"
                            value={formData.discount ?? 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discount: parseInt(e.target.value, 10) || '',
                              })
                            }
                            min="0"
                            max="100"
                            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="例：10"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          備考
                        </label>
                        <div className="relative">
                          <textarea
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="例：事前に資料をお送りします"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">予約枠を選択</h3>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-blue-500 mr-2" />
                        <p className="text-sm text-blue-700">
                          選択した日付ごとに予約枠が作成されます。1つのレッスンに対して複数の予約枠を作成できます。
                        </p>
                      </div>
                    </div>
                    <div className="border rounded-lg">
                      <div className="flex justify-between p-3 bg-gray-50 border-b">
                        <div className="flex space-x-2">
                          <select
                            value={formData.calendarMonth || new Date().getMonth()}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                calendarMonth: parseInt(e.target.value, 10),
                              })
                            }
                            className="px-3 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i} value={i}>
                                {new Date(new Date().getFullYear(), i, 1).toLocaleString('ja-JP', {
                                  month: 'long',
                                })}
                              </option>
                            ))}
                          </select>
                          <select
                            value={formData.calendarYear || new Date().getFullYear()}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                calendarYear: parseInt(e.target.value, 10),
                              })
                            }
                            className="px-3 py-1 border rounded text-sm"
                          >
                            {Array.from({ length: 3 }, (_, i) => (
                              <option key={i} value={new Date().getFullYear() + i}>
                                {new Date().getFullYear() + i}年
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                selected_dates:
                                  formData.selected_dates?.filter((date) => {
                                    const d = new Date(date);
                                    return (
                                      d.getMonth() !== (formData.calendarMonth || new Date().getMonth()) ||
                                      d.getFullYear() !== (formData.calendarYear || new Date().getFullYear())
                                    );
                                  }) || [],
                              });
                            }}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs"
                          >
                            月の選択を解除
                          </button>
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="grid grid-cols-7 mb-2 text-center text-sm font-medium">
                          <div className="text-red-500">日</div>
                          <div>月</div>
                          <div>火</div>
                          <div>水</div>
                          <div>木</div>
                          <div>金</div>
                          <div className="text-blue-500">土</div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 aspect-square">
                          {(() => {
                            const year = formData.calendarYear || new Date().getFullYear();
                            const month = formData.calendarMonth || new Date().getMonth();
                            const firstDay = new Date(year, month, 1);
                            const lastDay = new Date(year, month + 1, 0);
                            const daysInMonth = lastDay.getDate();
                            const startDay = firstDay.getDay();
                            const days = [];
                            for (let i = 0; i < startDay; i++) {
                              days.push(
                                <div
                                  key={`empty-${i}`}
                                  className="h-full rounded-md border border-transparent"
                                ></div>
                              );
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                              const date = new Date(year, month, day);
                              const yearStr = date.getFullYear();
                              const monthStr = String(date.getMonth() + 1).padStart(2, '0');
                              const dayStr = String(date.getDate()).padStart(2, '0');
                              const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                              const isSelected = formData.selected_dates?.includes(dateString);
                              const isPast =
                                date <
                                new Date(new Date().setHours(0, 0, 0, 0));
                              days.push(
                                <div
                                  key={`day-${day}`}
                                  onClick={() => {
                                    if (!isPast) {
                                      const updatedDates = formData.selected_dates || [];
                                      if (isSelected) {
                                        const newDates = updatedDates.filter(
                                          (d) => d !== dateString
                                        );
                                        setFormData({
                                          ...formData,
                                          selected_dates: newDates,
                                        });
                                      } else {
                                        const newDates = [...updatedDates, dateString];
                                        const existingSlotIndex = formData.lesson_slots.findIndex(
                                          (slot) => slot.date === dateString
                                        );
                                        if (existingSlotIndex === -1) {
                                          const startTime =
                                            formData.default_start_time || '10:00';
                                          const [startHour, startMinute] = startTime
                                            .split(':')
                                            .map((num) => parseInt(num, 10));
                                          const endHour = Math.floor(
                                            startHour + (formData.duration || 60) / 60
                                          );
                                          const endMinute =
                                            (startMinute + (formData.duration || 60) % 60) % 60;
                                          const endTime = `${String(endHour).padStart(
                                            2,
                                            '0'
                                          )}:${String(endMinute).padStart(2, '0')}`;
                                          const newSlot = {
                                            date: dateString,
                                            start_time: startTime,
                                            end_time: endTime,
                                            capacity: formData.capacity || 10,
                                            price: formData.is_free_trial
                                              ? 0
                                              : (parseInt(formData.price as string, 10) || 0),
                                            discount: formData.discount || 0,
                                            deadline_days: formData.deadline_days || 1,
                                            deadline_time: formData.deadline_time || '18:00',
                                            notes: formData.notes || '',
                                            venue_details: formData.venue_details || '',
                                            is_free_trial: formData.is_free_trial,
                                          };
                                          setFormData({
                                            ...formData,
                                            selected_dates: newDates,
                                            lesson_slots: [
                                              ...formData.lesson_slots,
                                              newSlot,
                                            ],
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selected_dates: newDates,
                                          });
                                        }
                                      }
                                    }
                                  }}
                                  className={`h-10 flex items-center justify-center rounded-md cursor-pointer border ${
                                    isPast
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-primary/10 border-primary text-primary font-medium'
                                      : 'hover:bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  {day}
                                </div>
                              );
                            }
                            return days;
                          })()}
                        </div>
                      </div>

                      <div className="p-3 border-t bg-gray-50">
                        <p className="text-sm font-medium mb-2">
                          曜日で一括選択:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {['日', '月', '火', '水', '木', '金', '土'].map(
                            (day, index) => (
                              <label
                                key={day}
                                className="flex items-center space-x-2 border px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    formData.selected_weekdays?.includes(index) ||
                                    false
                                  }
                                  onChange={() => {
                                    const year =
                                      formData.calendarYear ||
                                      new Date().getFullYear();
                                    const month =
                                      formData.calendarMonth ||
                                      new Date().getMonth();
                                    const updatedWeekdays =
                                      formData.selected_weekdays || [];
                                    let newWeekdays;
                                    if (updatedWeekdays.includes(index)) {
                                      newWeekdays = updatedWeekdays.filter(
                                        (d) => d !== index
                                      );
                                    } else {
                                      newWeekdays = [...updatedWeekdays, index];
                                    }
                                    const firstDay = new Date(year, month, 1);
                                    const lastDay = new Date(year, month + 1, 0);
                                    const updatedDates = formData.selected_dates || [];
                                    const updatedSlots = [...formData.lesson_slots];
                                    for (
                                      let day = 1;
                                      day <= lastDay.getDate();
                                      day++
                                    ) {
                                      const date = new Date(year, month, day);
                                      const weekday = date.getDay();
                                      const yearStr = date.getFullYear();
                                      const monthStr = String(
                                        date.getMonth() + 1
                                      ).padStart(2, '0');
                                      const dayStr = String(date.getDate()).padStart(
                                        2,
                                        '0'
                                      );
                                      const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                                      const isPast =
                                        date <
                                        new Date(
                                          new Date().setHours(0, 0, 0, 0)
                                        );
                                      if (isPast) continue;
                                      if (weekday === index) {
                                        if (newWeekdays.includes(index)) {
                                          if (!updatedDates.includes(dateString)) {
                                            updatedDates.push(dateString);
                                            const existingSlotIndex =
                                              updatedSlots.findIndex(
                                                (slot) =>
                                                  slot.date === dateString
                                              );
                                            if (existingSlotIndex === -1) {
                                              const startTime =
                                                formData.default_start_time ||
                                                '10:00';
                                              const [startHour, startMinute] =
                                                startTime.split(':').map((num) =>
                                                  parseInt(num, 10)
                                                );
                                              const endHour = Math.floor(
                                                startHour +
                                                  (formData.duration || 60) / 60
                                              );
                                              const endMinute =
                                                (startMinute +
                                                  (formData.duration || 60) %
                                                    60) %
                                                60;
                                              const endTime = `${String(
                                                endHour
                                              ).padStart(2, '0')}:${String(
                                                endMinute
                                              ).padStart(2, '0')}`;
                                              const newSlot = {
                                                date: dateString,
                                                start_time: startTime,
                                                end_time: endTime,
                                                capacity: formData.capacity || 10,
                                                price: formData.is_free_trial
                                                  ? 0
                                                  : (parseInt(
                                                      formData.price as string,
                                                      10
                                                    ) || 0),
                                                discount:
                                                  formData.discount || 0,
                                                deadline_days:
                                                  formData.deadline_days || 1,
                                                deadline_time:
                                                  formData.deadline_time || '18:00',
                                                notes: formData.notes || '',
                                                venue_details:
                                                  formData.venue_details || '',
                                                is_free_trial:
                                                  formData.is_free_trial,
                                              };
                                              updatedSlots.push(newSlot);
                                            }
                                          }
                                        } else {
                                          const idx = updatedDates.indexOf(
                                            dateString
                                          );
                                          if (idx !== -1) {
                                            updatedDates.splice(idx, 1);
                                          }
                                        }
                                      }
                                    }
                                    setFormData({
                                      ...formData,
                                      selected_weekdays: newWeekdays,
                                      selected_dates: updatedDates,
                                      lesson_slots: updatedSlots,
                                    });
                                  }}
                                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                />
                                <span
                                  className={
                                    index === 0
                                      ? 'text-red-500'
                                      : index === 6
                                      ? 'text-blue-500'
                                      : ''
                                  }
                                >
                                  {day}
                                </span>
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold">
                        予約枠の確認
                      </h3>
                    </div>

                    {(!formData.selected_dates ||
                      formData.selected_dates.length === 0) ? (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-yellow-700 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          カレンダーから日付を選択してください
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-2">
                          選択された日程: {formData.selected_dates.length}日
                        </p>
                        <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
                          {formData.selected_dates.sort().map((dateString, index) => {
                            const slotIndex = formData.lesson_slots.findIndex(
                              (slot) => slot.date === dateString
                            );
                            const slot =
                              slotIndex >= 0
                                ? formData.lesson_slots[slotIndex]
                                : null;
                            const startTime =
                              slot?.start_time ||
                              formData.default_start_time ||
                              '10:00';
                            const endTime =
                              slot?.end_time ||
                              (() => {
                                const [startHour, startMinute] = startTime
                                  .split(':')
                                  .map((num) => parseInt(num, 10));
                                const endHour = Math.floor(
                                  startHour + (formData.duration || 60) / 60
                                );
                                const endMinute =
                                  (startMinute + (formData.duration || 60) % 60) %
                                  60;
                                return `${String(endHour).padStart(
                                  2,
                                  '0'
                                )}:${String(endMinute).padStart(2, '0')}`;
                              })();
                            const capacity = slot?.capacity || formData.capacity || 10;
                            const price =
                              slot?.price ||
                              parseInt(formData.price as string, 10) ||
                              0;
                            const discount = slot?.discount || formData.discount || 0;
                            const deadlineDays = slot?.deadline_days || formData.deadline_days || 1;
                            const deadlineTime = slot?.deadline_time || formData.deadline_time || '18:00';
                            const startDateObj = new Date(`${dateString}T${startTime}`);
                            const deadlineDate = new Date(startDateObj);
                            deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);
                            const [deadlineHours, deadlineMinutes] = deadlineTime.split(':');
                            deadlineDate.setHours(
                              parseInt(deadlineHours, 10),
                              parseInt(deadlineMinutes, 10),
                              0,
                              0
                            );
                            const discountedPrice =
                              discount > 0
                                ? Math.round(price * (1 - discount / 100))
                                : price;
                            return (
                              <div key={index} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">
                                      {new Date(dateString).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        weekday: 'short',
                                      })}
                                    </h4>
                                    <div className="mt-1 text-sm text-gray-600 space-y-1">
                                      <p>
                                        <span className="inline-block w-20 font-medium">
                                          開始時間:
                                        </span>
                                        {startTime}
                                      </p>
                                      <p>
                                        <span className="inline-block w-20 font-medium">
                                          終了時間:
                                        </span>
                                        {endTime}
                                      </p>
                                      <p>
                                        <span className="inline-block w-20 font-medium">
                                          予約締切:
                                        </span>
                                        {deadlineDate.toLocaleDateString('ja-JP')}{' '}
                                        {deadlineTime}
                                      </p>
                                      <p>
                                        <span className="inline-block w-20 font-medium">
                                          定員:
                                        </span>
                                        {capacity}人
                                      </p>
                                      <p>
                                        <span className="inline-block w-20 font-medium">
                                          料金:
                                        </span>
                                        {formData.is_free_trial ? (
                                          <span>
                                            <span className="text-orange-600 font-medium">
                                              0円
                                            </span>{' '}
                                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                              初回体験無料
                                            </span>
                                          </span>
                                        ) : discount > 0 ? (
                                          <span>
                                            <span className="line-through text-gray-400">
                                              {price.toLocaleString()}円
                                            </span>{' '}
                                            <span className="text-red-600 font-medium">
                                              {discountedPrice.toLocaleString()}円
                                            </span>{' '}
                                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                              {discount}%OFF
                                            </span>
                                          </span>
                                        ) : (
                                          <span>{price.toLocaleString()}円</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSlotId(dateString);
                                        setEditFormData({
                                          start_time: startTime,
                                          end_time: endTime,
                                          capacity,
                                          price,
                                          discount,
                                          deadline_days: deadlineDays,
                                          deadline_time: deadlineTime,
                                          notes: slot?.notes || formData.notes || '',
                                          venue_details:
                                            slot?.venue_details || formData.venue_details || '',
                                        });
                                      }}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedDates = formData.selected_dates.filter(
                                          (d) => d !== dateString
                                        );
                                        const updatedSlots = formData.lesson_slots.filter(
                                          (slot) => slot.date !== dateString
                                        );
                                        setFormData({
                                          ...formData,
                                          selected_dates: updatedDates,
                                          lesson_slots: updatedSlots,
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">スケジュールのヒント</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>開始時間の15分前までに準備を済ませておくことをお勧めします</li>
                          <li>終了時間には質疑応答の時間も含めるようにしましょう</li>
                          <li>同じ内容のレッスンを複数日で開催する場合は、複数の日付を選択してください</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 予約枠編集モーダル */}
              {editingSlotId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">予約枠の編集</h3>
                      <button
                        type="button"
                        onClick={() => setEditingSlotId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                        <input
                          type="time"
                          value={editFormData.start_time}
                          onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                        <input
                          type="time"
                          value={editFormData.end_time}
                          onChange={(e) => setEditFormData({...editFormData, end_time: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">定員</label>
                        <input
                          type="number"
                          value={editFormData.capacity}
                          onChange={(e) => setEditFormData({...editFormData, capacity: parseInt(e.target.value, 10) || 1})}
                          min="1"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">料金（円）</label>
                        <input
                          type="number"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({...editFormData, price: parseInt(e.target.value, 10) || 0})}
                          min="0"
                          disabled={formData.is_free_trial}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            formData.is_free_trial ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                        {formData.is_free_trial && (
                          <p className="mt-1 text-xs text-orange-500">
                            体験無料設定が有効のため、料金は0円に固定されます
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">割引（%OFF）</label>
                        <input
                          type="number"
                          value={editFormData.discount}
                          onChange={(e) => setEditFormData({...editFormData, discount: parseInt(e.target.value, 10) || 0})}
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">予約締め切り（日前）</label>
                        <input
                          type="number"
                          value={editFormData.deadline_days}
                          onChange={(e) => setEditFormData({...editFormData, deadline_days: parseInt(e.target.value, 10) || 1})}
                          min="0"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">予約締め切り時間</label>
                        <input
                          type="time"
                          value={editFormData.deadline_time}
                          onChange={(e) => setEditFormData({...editFormData, deadline_time: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                      <textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="例：事前に資料をお送りします"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button variant="outline" onClick={() => setEditingSlotId(null)}>キャンセル</Button>
                      <Button 
                        onClick={() => {
                          const updatedSlots = [...formData.lesson_slots];
                          // 既存のスロットを見つける
                          const existingSlotIndex = updatedSlots.findIndex(slot => slot.date === editingSlotId);
                          
                          if (existingSlotIndex !== -1) {
                            // 既存のスロットを更新
                            updatedSlots[existingSlotIndex] = {
                              ...updatedSlots[existingSlotIndex],
                              start_time: editFormData.start_time,
                              end_time: editFormData.end_time,
                              capacity: editFormData.capacity,
                              price: formData.is_free_trial ? 0 : editFormData.price,
                              discount: editFormData.discount,
                              deadline_days: editFormData.deadline_days,
                              deadline_time: editFormData.deadline_time,
                              notes: editFormData.notes,
                              venue_details: editFormData.venue_details,
                              is_free_trial: formData.is_free_trial,
                            };
                          } else {
                            // 新しいスロットを追加
                            updatedSlots.push({
                              date: editingSlotId,
                              start_time: editFormData.start_time,
                              end_time: editFormData.end_time,
                              capacity: editFormData.capacity,
                              price: formData.is_free_trial ? 0 : editFormData.price,
                              discount: editFormData.discount,
                              deadline_days: editFormData.deadline_days,
                              deadline_time: editFormData.deadline_time,
                              notes: editFormData.notes,
                              venue_details: editFormData.venue_details,
                              is_free_trial: formData.is_free_trial,
                            });
                          }
                          
                          setFormData({...formData, lesson_slots: updatedSlots});
                          setEditingSlotId(null);
                        }}
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Tabs>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const tabs = ['basic', 'details', 'schedule'];
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
          <Button variant="outline" onClick={saveAsDraft} disabled={saving}>
            下書き保存
          </Button>
          {activeTab === 'schedule' ? (
            <Button
              onClick={publishLesson}
              disabled={saving || imageUploading}
            >
              {saving ? '保存中...' : '公開する'}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const tabs = ['basic', 'details', 'schedule'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}
              disabled={activeTab === 'schedule'}
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
