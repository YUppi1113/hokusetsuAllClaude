import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { CATEGORIES, SUBCATEGORIES } from "@/lib/constants";
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
  Check,
  X,
} from "lucide-react";
import { checkIsPremiumInstructor, preserveTimeISOString } from "@/lib/utils";

const InstructorLessonCreate = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);

  // Initial form state
  const [formData, setFormData] = useState({
    lesson_title: "",
    lesson_catchphrase: "",
    lesson_description: "",
    category: "",
    sub_categories: [],
    difficulty_level: "beginner",
    price: "",
    duration: 60,
    capacity: 10,
    location_name: "",
    location_type: "online",
    classroom_area: "",
    lesson_type: "one_time",
    is_free_trial: false,
    lesson_image_url: [],
    date_time_start: "",
    date_time_end: "",
    status: "draft",
    materials_needed: "",
    lesson_goals: "",
    lesson_outline: "",
    target_audience: [],
    monthly_plans: [],
    course_sessions: 1,

    // Booking slot fields
    default_start_time: "10:00",
    deadline_days: "",
    deadline_time: "18:00",
    discount: "",
    selected_dates: [],
    selected_weekdays: [],
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    notes: "",
    venue_details: "",
    // Editable individual booking slots
    lesson_slots: [],
  });

  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    start_time: "",
    end_time: "",
    capacity: 10,
    price: 0,
    discount: 0,
    deadline_days: 1,
    deadline_time: "18:00",
    notes: "",
    venue_details: "",
  });

  // useEffect フック: 初期値を設定
  useEffect(() => {
    // デフォルトで1つのプランをセット
    if (formData.monthly_plans.length === 0) {
      setFormData((prev) => ({
        ...prev,
        monthly_plans: [
          {
            name: "",
            price: "",
            frequency: "",
            lesson_duration: "60",
            description: "",
          },
        ],
      }));
    }

    // 現在の日時をデフォルトでセット
    if (!formData.date_time_start) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;

      setFormData((prev) => ({
        ...prev,
        date_time_start: dateTimeString,
      }));
    }
  }, []);

  const handleInputChange = (
    e
  ) => {
    const { name, value } = e.target;
    // location_type は変更なしで直接保存
    // 開始時刻か時間が変更された場合、終了時刻を自動計算
    if (name === "date_time_start" && value) {
      // 開始時刻が入力された場合、終了時刻を計算（日本時間）
      const startDateTime = new Date(value);
      const durationMinutes = formData.duration;

      // 終了時刻を計算（日本時間）
      const endDateTime = new Date(
        startDateTime.getTime() + durationMinutes * 60 * 1000
      );

      // YYYY-MM-DDTHH:MM 形式の文字列を手動で構築（日本時間）
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, "0");
      const day = String(endDateTime.getDate()).padStart(2, "0");
      const hours = String(endDateTime.getHours()).padStart(2, "0");
      const minutes = String(endDateTime.getMinutes()).padStart(2, "0");
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;

      setFormData(
        (prev) =>
          ({
            ...prev,
            [name]: value,
            date_time_end: endDateString,
          })
      );
    } else if (name === "duration" && formData.date_time_start) {
      // 時間が変更され、開始時刻がある場合は終了時刻を再計算（日本時間）
      const startDateTime = new Date(formData.date_time_start);
      const durationMinutes = parseInt(value, 10);

      // 終了時刻を計算（日本時間）
      const endDateTime = new Date(
        startDateTime.getTime() + durationMinutes * 60 * 1000
      );

      // YYYY-MM-DDTHH:MM 形式の文字列を手動で構築（日本時間）
      const year = endDateTime.getFullYear();
      const month = String(endDateTime.getMonth() + 1).padStart(2, "0");
      const day = String(endDateTime.getDate()).padStart(2, "0");
      const hours = String(endDateTime.getHours()).padStart(2, "0");
      const minutes = String(endDateTime.getMinutes()).padStart(2, "0");
      const endDateString = `${year}-${month}-${day}T${hours}:${minutes}`;

      setFormData(
        (prev) =>
          ({
            ...prev,
            [name]: parseInt(value, 10),
            date_time_end: endDateString,
          })
      );
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // カテゴリーが変更された場合はサブカテゴリーを更新
    if (name === "category") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        sub_categories: [], // カテゴリー変更時にサブカテゴリーをリセット
      }));

      // 選択されたカテゴリーに対応するサブカテゴリーを設定
      const categoryId = value;
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
        [name]: "",
      });
    }
  };

  // サブカテゴリーのチェックボックスの変更を処理
  const handleSubcategoryChange = (subcategoryId) => {
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("ユーザーが認証されていません");

      // Create the bucket if it doesn't exist
      // Check if bucket exists and create if needed
      await supabase.storage.createBucket("user_uploads", {
        public: true,
      });

      // Upload image
      const file = files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `lesson_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user_uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user_uploads").getPublicUrl(filePath);

      // 画像は最大3枚まで
      if (formData.lesson_image_url.length >= 3) {
        throw new Error("画像は最大3枚までアップロードできます");
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
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: 'destructive',
        title: 'アップロードエラー',
        description: error.message || '画像のアップロードに失敗しました。',
      });
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (index) => {
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

    // Basic tab validations
    if (!formData.lesson_title.trim()) {
      newErrors.lesson_title = "レッスン名を入力してください";
    } else if (formData.lesson_title.length > 25) {
      newErrors.lesson_title = "レッスン名は25文字以内で入力してください";
    }

    if (!formData.lesson_catchphrase.trim()) {
      newErrors.lesson_catchphrase = "キャッチコピーを入力してください";
    } else if (formData.lesson_catchphrase.length > 50) {
      newErrors.lesson_catchphrase =
        "キャッチコピーは50文字以内で入力してください";
    }

    if (!formData.lesson_description.trim()) {
      newErrors.lesson_description = "レッスンの説明を入力してください";
    } else if (formData.lesson_description.length > 500) {
      newErrors.lesson_description =
        "レッスンの説明は500文字以内で入力してください";
    }

    if (!formData.category.trim()) {
      newErrors.category = "カテゴリを選択してください";
    }

    // Details tab validations
    // 場所の詳細は詳細情報タブに移動
    if (!formData.location_name.trim()) {
      newErrors.location_name = "場所の詳細を入力してください";
    }
    
    // 教室エリアのバリデーション (対面の場合のみ)
    if (formData.location_type === "in_person" && !formData.classroom_area) {
      newErrors.classroom_area = "教室エリアを選択してください";
    }

    if (formData.lesson_type !== "monthly") {
      if (!formData.price.toString().trim()) {
        newErrors.price = "価格を入力してください";
      } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
        newErrors.price = "有効な価格を入力してください";
      }
    } else {
      // 月謝制の場合、少なくとも1つのプランが必要
      if (formData.monthly_plans.length === 0) {
        newErrors.monthly_plans = "少なくとも1つのプランを追加してください";
      } else {
        // 各プランの必須項目を検証
        const invalidPlans = formData.monthly_plans.some(
          (plan) =>
            !plan.name.trim() ||
            !plan.price.trim() ||
            !plan.frequency.trim() ||
            !plan.lesson_duration.trim()
        );
        if (invalidPlans) {
          newErrors.monthly_plans = "すべてのプラン情報を入力してください";
        }
      }
    }

    if (formData.lesson_type !== "monthly") {
      if (formData.duration <= 0) {
        newErrors.duration = "有効な時間を入力してください";
      }

      if (formData.capacity <= 0) {
        newErrors.capacity = "有効な定員数を入力してください";
      }
    }

    if (formData.lesson_type === "course" && formData.course_sessions < 1) {
      newErrors.course_sessions = "有効な回数を入力してください";
    }

    // Schedule tab validations
    // 予約枠が選択されているかのチェック
    if (formData.selected_dates && formData.selected_dates.length > 0) {
      // 予約枠が選択されている場合の検証
      if (!formData.default_start_time) {
        newErrors.default_start_time = "開始時間を入力してください";
      }

      if (formData.duration <= 0) {
        newErrors.duration = "レッスン時間を入力してください";
      }

      if (formData.deadline_days !== "" && Number(formData.deadline_days) < 0) {
        newErrors.deadline_days = "有効な日数を入力してください";
      }

      if (!formData.deadline_time) {
        newErrors.deadline_time = "締め切り時間を入力してください";
      }
    } else {
      // 従来の単一日付方式の場合のチェック
      if (!formData.date_time_start.trim()) {
        newErrors.date_time_start = "開始日時を選択してください";
      }

      if (!formData.date_time_end.trim()) {
        newErrors.date_time_end = "終了日時を選択してください";
      } else if (
        new Date(formData.date_time_end) <= new Date(formData.date_time_start)
      ) {
        newErrors.date_time_end =
          "終了日時は開始日時より後である必要があります";
      }

      // 予約締切日は lesson_slots テーブルで管理するためここでは検証しない
    }

    // Add discount percentage constraint validation
    if (
      formData.discount !== "" &&
      (Number(formData.discount) < 0 ||
        Number(formData.discount) > 100)
    ) {
      newErrors.discount = "割引率は0〜100%の範囲で入力してください";
    }

    // Add price constraint validation
    if (formData.price !== "" && Number(formData.price) < 0) {
      newErrors.price = "価格は0以上の値を入力してください";
    }

    // Add capacity constraint validation
    if (Number(formData.capacity) <= 0) {
      newErrors.capacity = "定員は1以上の値を入力してください";
    }

    // Add duration constraint validation
    if (Number(formData.duration) <= 0) {
      newErrors.duration = "レッスン時間は1分以上の値を入力してください";
    }

    // Add course sessions constraint validation
    if (
      formData.lesson_type === "course" &&
      Number(formData.course_sessions) <= 0
    ) {
      newErrors.course_sessions = "コース回数は1以上の値を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAsDraft = async () => {
    if (!formData.lesson_title.trim()) {
      setErrors({
        lesson_title: "レッスン名を入力してください",
      });
      setActiveTab("basic");
      return;
    }

    // 下書き保存では日時のバリデーションをスキップ
    await saveLesson("draft");
  };

  const publishLesson = async () => {
    if (!validateForm()) {
      // Find first tab with errors and show it
      if (errors.lesson_title || errors.lesson_description || errors.category) {
        setActiveTab("basic");
      } else if (
        errors.location_name ||
        errors.classroom_area ||
        errors.price ||
        errors.duration ||
        errors.capacity ||
        errors.monthly_plans ||
        errors.course_sessions
      ) {
        setActiveTab("details");
      } else if (
        errors.date_time_start ||
        errors.date_time_end ||
        errors.default_start_time ||
        errors.deadline_days ||
        errors.deadline_time
      ) {
        setActiveTab("schedule");
      }
      return;
    }

    await saveLesson("published");
  };

  const saveLesson = async (status) => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("ユーザーが認証されていません");

      const lessonId = uuidv4();
      const now = new Date().toISOString();

      // プレミアム講師かどうかをチェック
      const isPremium = await checkIsPremiumInstructor(user.id);

      // Ensure the selected subcategory exists in availableSubcategories
      const subcategory =
        formData.sub_categories.length > 0
          ? availableSubcategories.find(
              (sub) => sub.id === formData.sub_categories[0]
            )?.name || ""
          : "";

      // location_type はそのまま使用

      // Format monthly_plans to match jsonb structure
      const monthlyPlans =
        formData.lesson_type === "monthly" && formData.monthly_plans.length > 0
          ? formData.monthly_plans.map((plan) => ({
              name: plan.name || "",
              price: parseInt(plan.price, 10) || 0,
              frequency: plan.frequency || "",
              lesson_duration: parseInt(plan.lesson_duration, 10) || 60,
              description: plan.description || "",
            }))
          : null;

      // Properly validate and default values
      const price =
        formData.lesson_type === "monthly" ? 0 : Number(formData.price) || 0;

      const capacity = Number(formData.capacity) || 10;
      const duration = Number(formData.duration) || 60;

      // Ensure we're using a valid discount percentage
      const discountPercentage =
        formData.discount !== ""
          ? Math.max(
              0,
              Math.min(100, Number(formData.discount) || 0)
            )
          : null;

      // Structure lesson data according to database schema
      const lessonData = {
        id: lessonId,
        instructor_id: user.id,
        lesson_title: formData.lesson_title,
        lesson_catchphrase: formData.lesson_catchphrase || null,
        lesson_description: formData.lesson_description || null,
        category: formData.category,
        sub_category: subcategory,
        difficulty_level: formData.difficulty_level || "beginner",
        location_name: formData.location_name,
        location_type: formData.location_type,
        classroom_area: formData.location_type === "in_person" 
                      ? formData.classroom_area 
                      : null,
        lesson_type: formData.lesson_type || "one_time",
        is_free_trial: formData.is_free_trial || false,
        lesson_image_url:
          formData.lesson_image_url.length > 0
            ? formData.lesson_image_url
            : null,
        status,
        materials_needed: formData.materials_needed || null,
        lesson_goals: formData.lesson_goals || null,
        lesson_outline: formData.lesson_outline || null,
        target_audience:
          formData.target_audience.length > 0 ? formData.target_audience : null,
        created_at: now,
        updated_at: now,
        // Common settings
        price: price,
        discount_percentage: discountPercentage,
        notes: formData.notes || null,
        venue_details: formData.venue_details || null,
        // プレミアム講師なら、公開するレッスンはすべてfeaturedにする
        is_featured: isPremium && status === "published",
      };

      // Add lesson type specific fields
      if (formData.lesson_type === "monthly") {
        lessonData.monthly_plans = monthlyPlans;
        // monthly lessons can have duration/capacity as null as per DB
        lessonData.duration = null;
        lessonData.capacity = null;
      } else {
        // Ensure duration and capacity meet DB constraints
        lessonData.duration = Math.max(1, duration);
        lessonData.capacity = Math.max(1, capacity);
        lessonData.monthly_plans = null;

        if (formData.lesson_type === "course") {
          lessonData.course_sessions = Math.max(
            1,
            Number(formData.course_sessions) || 1
          );
        } else {
          lessonData.course_sessions = null;
        }
      }

      // Save lesson data
      const { error } = await supabase.from("lessons").insert(lessonData);

      if (error) throw error;

      // Handle lesson slots for published lessons with selected dates
      if (formData.selected_dates?.length > 0) {        
        // Prepare multiple lesson slots
        const slotsToInsert = formData.selected_dates.map((dateString) => {
          // Get this slot's information
          const slotIndex = formData.lesson_slots.findIndex(
            (slot) => slot.date === dateString
          );
          const slot = slotIndex >= 0 ? formData.lesson_slots[slotIndex] : null;

          // Process date/time (store in UTC for database)
          const startTime =
            slot?.start_time || formData.default_start_time || "10:00";
          const [year, month, day] = dateString
            .split("-")
            .map((num) => parseInt(num, 10));
          const [hours, minutes] = startTime
            .split(":")
            .map((num) => parseInt(num, 10));

          // 日本時間として日付オブジェクトを作成
          const startDate = new Date(year, month - 1, day, hours, minutes, 0);

          // 終了時間の計算
          let endDate;
          if (slot?.end_time) {
            const [endHours, endMinutes] = slot.end_time
              .split(":")
              .map((num) => parseInt(num, 10));
            endDate = new Date(year, month - 1, day, endHours, endMinutes, 0);
          } else {
            endDate = new Date(startDate);
            endDate.setMinutes(
              endDate.getMinutes() + (formData.duration || 60)
            );
          }

          // 予約締め切りの計算
          const deadlineDays = Math.max(
            0,
            Number(slot?.deadline_days ?? formData.deadline_days ?? 1)
          );
          const deadlineTime =
            slot?.deadline_time || formData.deadline_time || "18:00";
          const [deadlineHours, deadlineMinutes] = deadlineTime
            .split(":")
            .map((num) => parseInt(num, 10));

          const bookingDeadline = new Date(startDate);
          bookingDeadline.setDate(
            bookingDeadline.getDate() - deadlineDays
          );
          bookingDeadline.setHours(deadlineHours, deadlineMinutes, 0, 0);

          // Ensure values meet database constraints
          const slotCapacity = Math.max(
            1,
            (slot?.capacity ?? formData.capacity) || 10
          );
          const slotPrice = formData.is_free_trial
            ? 0
            : Math.max(0, (slot?.price ?? Number(formData.price)) || 0);
          const slotDiscount =
            (slot?.discount ?? formData.discount) !== "" &&
            (slot?.discount ?? formData.discount) !== null
              ? Math.max(
                  0,
                  Math.min(100, (slot?.discount ?? formData.discount) || 0)
                )
              : null;

          // Structure according to lesson_slots table
          return {
            lesson_id: lessonId,
            date_time_start: preserveTimeISOString(startDate),
            date_time_end: preserveTimeISOString(endDate),
            booking_deadline: preserveTimeISOString(bookingDeadline),
            capacity: slotCapacity,
            current_participants_count: 0, // default value
            price: slotPrice,
            discount_percentage: slotDiscount,
            venue_details:
              slot?.venue_details || formData.venue_details || null,
            notes: slot?.notes || formData.notes || null,
            status: "published",
            is_free_trial: formData.is_free_trial || false,
          };
        });

        // Insert into lesson_slots table
        const { error: slotsError } = await supabase
          .from("lesson_slots")
          .insert(slotsToInsert);

        if (slotsError) throw slotsError;
      }

      // 保存成功メッセージをトーストで表示
      toast({
        title: "成功",
        description: status === "published"
          ? "レッスンが公開されました"
          : "レッスンが下書き保存されました",
        variant: "default",
      });

      // リダイレクト前に少し待機してトーストを表示する時間を確保
      setTimeout(() => {
        // 状態としても保持（ページ遷移時にも表示するため）
        // ページ遷移と同時にページをリロードするため、windowオブジェクトを使用
        window.location.href = `/instructor/lessons?status=${status}&message=${encodeURIComponent(
          status === "published"
            ? "レッスンが公開されました"
            : "レッスンが下書き保存されました"
        )}`;
      }, 300);
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "レッスンの保存に失敗しました: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get day name for weekdays in Japanese
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // Function to generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const date = new Date(formData.calendarYear, formData.calendarMonth, 1);
    const firstDayOfWeek = date.getDay();
    const daysInMonth = new Date(formData.calendarYear, formData.calendarMonth + 1, 0).getDate();
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>戻る</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">新しいレッスンを作成</h1>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={saveAsDraft} disabled={loading} className="px-6">
              下書き保存
            </Button>
            <Button onClick={publishLesson} disabled={loading || imageUploading} className="px-6 bg-primary hover:bg-primary/90">
              {loading ? "保存中..." : "公開する"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Tabs
            defaultValue="basic"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="border-b">
              <TabsList className="w-full justify-start bg-white rounded-none border-b">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  基本情報
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  詳細情報
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  日程
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Basic Information Tab */}
              <TabsContent value="basic">
                <div className="space-y-6 max-w-3xl mx-auto">
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
                        errors.lesson_title ? "border-red-500" : "border-gray-300"
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
                        errors.lesson_catchphrase ? "border-red-500" : "border-gray-300"
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
                        errors.lesson_description ? "border-red-500" : "border-gray-300"
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
                      {/* Image upload button */}
                      {formData.lesson_image_url.length < 3 && (
                        <div className="flex items-center justify-center">
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 w-full h-48 flex flex-col items-center justify-center ${
                              imageUploading
                                ? "opacity-50"
                                : "hover:border-primary/50 hover:bg-gray-50"
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
                                    imageUploading
                                      ? "text-gray-400"
                                      : "text-primary"
                                  }`}
                                />
                                <p className="mt-2 text-sm font-medium text-gray-700">
                                  {imageUploading
                                    ? "画像をアップロード中..."
                                    : "画像をアップロード"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  PNG, JPG, GIF（最大 5MB）
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image previews */}
                      {formData.lesson_image_url.length > 0 ? (
                        formData.lesson_image_url.map((url, index) => (
                          <div key={index} className="relative h-48">
                            <img
                              src={imagePreview[index] || url}
                              alt={`レッスン画像 ${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
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
                                <X className="w-4 h-4" />
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
                          errors.category ? "border-red-500" : "border-gray-300"
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
                                checked={formData.sub_categories.includes(
                                  sub.id
                                )}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="beginner">初級者向け</option>
                      <option value="intermediate">中級者向け</option>
                      <option value="advanced">上級者向け</option>
                      <option value="all">全レベル対応</option>
                    </select>
                  </div>
                </div>
              </TabsContent>

              {/* Details Information Tab */}
              <TabsContent value="details">
                <div className="space-y-6 max-w-3xl mx-auto">
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

                    </div>
                  </div>

                  {formData.location_type === "in_person" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        教室エリア <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="classroom_area"
                        value={formData.classroom_area || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errors.classroom_area ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <option value="">エリアを選択</option>
                        <option value="豊中市">豊中市</option>
                        <option value="吹田市">吹田市</option>
                        <option value="茨木市">茨木市</option>
                        <option value="高槻市">高槻市</option>
                        <option value="箕面市">箕面市</option>
                        <option value="摂津市">摂津市</option>
                        <option value="島本町">島本町</option>
                        <option value="豊能町">豊能町</option>
                        <option value="能勢町">能勢町</option>
                      </select>
                      {errors.classroom_area && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.classroom_area}
                        </p>
                      )}
                    </div>
                  )}

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
                          errors.location_name ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder={
                          formData.location_type === "online"
                            ? "使用するオンラインツール（Zoom、Google Meet、Skypeなど）と、レッスン前に共有するURLについての情報"
                            : "正確な住所、建物名、部屋番号、アクセス方法などの詳細"
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
                          formData.lesson_type === "monthly"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, lesson_type: "monthly" })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="lesson_type"
                            value="monthly"
                            checked={formData.lesson_type === "monthly"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                lesson_type: "monthly",
                              })
                            }
                            className="h-4 w-4 text-primary"
                          />
                          <label className="ml-2 text-sm font-medium text-gray-700">
                            月謝制
                          </label>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          定期的に継続するレッスン。月単位で料金を設定します。
                        </p>

                        {formData.lesson_type === "monthly" && (
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
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      is_free_trial: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                />
                                <label
                                  htmlFor="is_free_trial"
                                  className="ml-2 text-sm text-gray-700"
                                >
                                  体験レッスン無料
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          formData.lesson_type === "one_time"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, lesson_type: "one_time" })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="lesson_type"
                            value="one_time"
                            checked={formData.lesson_type === "one_time"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                lesson_type: "one_time",
                              })
                            }
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
                          formData.lesson_type === "course"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, lesson_type: "course" })
                        }
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="lesson_type"
                            value="course"
                            checked={formData.lesson_type === "course"}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                lesson_type: "course",
                              })
                            }
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
                    {formData.lesson_type !== "monthly" && (
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
                              errors.price ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="例：3000"
                          />
                        </div>
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.price}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {formData.lesson_type === "course"
                            ? "コース全体の料金"
                            : "1回あたりの料金"}
                        </p>
                      </div>
                    )}

                    {formData.lesson_type === "course" && (
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
                              errors.course_sessions ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="例：5"
                          />
                          <span className="ml-2">回</span>
                        </div>
                        {errors.course_sessions && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.course_sessions}
                          </p>
                        )}
                      </div>
                    )}

                    {formData.lesson_type === "monthly" && (
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
                          <div
                            key={index}
                            className="mb-4 p-4 border rounded-lg bg-gray-50"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-base font-medium">
                                月謝体系{index + 1}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans.splice(index, 1);
                                  setFormData({
                                    ...formData,
                                    monthly_plans: newPlans,
                                  });
                                }}
                                className="px-3 py-1 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors"
                              >
                                削除
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  月額料金（円）
                                </label>
                                <input
                                  type="number"
                                  value={plan.price}
                                  onChange={(e) => {
                                    const newPlans = [
                                      ...formData.monthly_plans,
                                    ];
                                    newPlans[index].price = e.target.value;
                                    newPlans[index].name = `月謝体系${
                                      index + 1
                                    }`;
                                    setFormData({
                                      ...formData,
                                      monthly_plans: newPlans,
                                    });
                                  }}
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="例：10000"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  頻度
                                </label>
                                <input
                                  type="text"
                                  value={plan.frequency}
                                  onChange={(e) => {
                                    const newPlans = [
                                      ...formData.monthly_plans,
                                    ];
                                    newPlans[index].frequency = e.target.value;
                                    setFormData({
                                      ...formData,
                                      monthly_plans: newPlans,
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="例：週1回"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  レッスン時間（分）
                                </label>
                                <input
                                  type="number"
                                  value={plan.lesson_duration}
                                  onChange={(e) => {
                                    const newPlans = [
                                      ...formData.monthly_plans,
                                    ];
                                    newPlans[index].lesson_duration =
                                      e.target.value;
                                    setFormData({
                                      ...formData,
                                      monthly_plans: newPlans,
                                    });
                                  }}
                                  min="15"
                                  step="15"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="例：60"
                                />
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                説明
                              </label>
                              <textarea
                                value={plan.description}
                                onChange={(e) => {
                                  const newPlans = [...formData.monthly_plans];
                                  newPlans[index].description = e.target.value;
                                  setFormData({
                                    ...formData,
                                    monthly_plans: newPlans,
                                  });
                                }}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                {
                                  name: `月謝体系${newIndex}`,
                                  price: "",
                                  frequency: "",
                                  lesson_duration: "60",
                                  description: "",
                                },
                              ],
                            });
                          }}
                          className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                        >
                          プランを追加
                        </button>

                        {errors.monthly_plans && (
                          <p className="mt-2 text-sm text-red-500">
                            {errors.monthly_plans}
                          </p>
                        )}
                      </div>
                    )}

                    {formData.lesson_type !== "monthly" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            レッスン時間（分）{" "}
                            <span className="text-red-500">*</span>
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
                                errors.duration ? "border-red-500" : "border-gray-300"
                              }`}
                              placeholder="例：60"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            1回あたりのレッスン時間です
                          </p>
                          {errors.duration && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors.duration}
                            </p>
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
                                errors.capacity ? "border-red-500" : "border-gray-300"
                              }`}
                              placeholder="例：10"
                            />
                          </div>
                          {errors.capacity && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors.capacity}
                            </p>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            const newTargetAudience = [
                              ...formData.target_audience,
                            ];
                            newTargetAudience[index] = e.target.value;
                            setFormData({
                              ...formData,
                              target_audience: newTargetAudience,
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder={`例：${
                            index === 0
                              ? "プログラミング初心者の方"
                              : index === 1
                              ? "IT業界への転職を考えている方"
                              : "新しい趣味を探している方"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newTargetAudience = [
                              ...formData.target_audience,
                            ];
                            newTargetAudience.splice(index, 1);
                            setFormData({
                              ...formData,
                              target_audience: newTargetAudience,
                            });
                          }}
                          className="ml-2 text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          target_audience: [...formData.target_audience, ""],
                        });
                      }}
                      className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 flex items-center transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      対象者を追加
                    </button>
                  </div>
                </div>
              </TabsContent>

              {/* Schedule Tab */}
              <TabsContent value="schedule">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* 月謝制レッスンでの表示を分岐 */}
                  {formData.lesson_type === "monthly" && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                        <h3 className="font-medium text-blue-800">
                          月謝制レッスンの初回体験予約枠設定
                        </h3>
                      </div>
                      <p className="mt-2 ml-7 text-sm text-blue-700">
                        以下で設定する予約枠は、新規生徒の体験レッスン用の予約枠です。
                        {formData.is_free_trial
                          ? "初回体験無料設定が有効なため、体験レッスンの料金は0円に設定されます。"
                          : ""}
                      </p>
                    </div>
                  )}
                  
                  {/* 共通設定と予約枠選択・確認を横並びに */}
                  <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      予約枠の共通設定
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          開始時間 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="time"
                            name="default_start_time"
                            value={formData.default_start_time || "10:00"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                default_start_time: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        {errors.default_start_time && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.default_start_time}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          レッスン時間（分）{" "}
                          <span className="text-red-500">*</span>
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
                              errors.duration ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="例：60"
                          />
                        </div>
                        {errors.duration && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.duration}
                          </p>
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
                              errors.capacity ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="例：10"
                          />
                        </div>
                        {errors.capacity && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.capacity}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          レッスン料金（円）{" "}
                          <span className="text-red-500">*</span>
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
                              errors.price ? "border-red-500" : ""
                            } ${
                              formData.is_free_trial
                                ? "bg-gray-100 cursor-not-allowed"
                                : "border-gray-300"
                            }`}
                            placeholder="例：3000"
                          />
                        </div>
                        {formData.is_free_trial && (
                          <p className="mt-1 text-xs text-orange-500">
                            体験無料設定が有効のため、料金は0円に固定されます
                          </p>
                        )}
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.price}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          予約締め切り（日前）{" "}
                          <span className="text-red-500">*</span>
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
                                deadline_days:
                                  parseInt(e.target.value, 10) || "",
                              })
                            }
                            min="0"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        {errors.deadline_days && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.deadline_days}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          予約締め切り時間{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="time"
                            name="deadline_time"
                            value={formData.deadline_time || "18:00"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                deadline_time: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        {errors.deadline_time && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.deadline_time}
                          </p>
                        )}
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
                                discount: parseInt(e.target.value, 10) || "",
                              })
                            }
                            min="0"
                            max="100"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="例：10"
                          />
                        </div>
                        {errors.discount && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.discount}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          備考
                        </label>
                        <div className="relative">
                          <textarea
                            name="notes"
                            value={formData.notes || ""}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="例：事前に資料をお送りします"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Calendar (Left side) */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-lg font-medium mb-4">
                        予約枠を選択
                      </h3>
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
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
                              value={
                                formData.calendarMonth || new Date().getMonth()
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  calendarMonth: parseInt(e.target.value, 10),
                                })
                              }
                              className="px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>
                                  {new Date(
                                    new Date().getFullYear(),
                                    i,
                                    1
                                  ).toLocaleString("ja-JP", { month: "long" })}
                                </option>
                              ))}
                            </select>
                            <select
                              value={
                                formData.calendarYear ||
                                new Date().getFullYear()
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  calendarYear: parseInt(e.target.value, 10),
                                })
                              }
                              className="px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                              {Array.from({ length: 3 }, (_, i) => (
                                <option
                                  key={i}
                                  value={new Date().getFullYear() + i}
                                >
                                  {new Date().getFullYear() + i}年
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                // 現在選択されている選択肢を一旦削除
                                setFormData({
                                  ...formData,
                                  selected_dates:
                                    formData.selected_dates?.filter((date) => {
                                      const d = new Date(date);
                                      return (
                                        d.getMonth() !==
                                          (formData.calendarMonth ||
                                            new Date().getMonth()) ||
                                        d.getFullYear() !==
                                          (formData.calendarYear ||
                                            new Date().getFullYear())
                                      );
                                    }) || [],
                                });
                              }}
                              className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs transition-colors"
                            >
                              月の選択を解除
                            </button>
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="grid grid-cols-7 mb-2 text-center text-sm font-medium">
                            {weekdays.map((day, index) => (
                              <div className={`py-1 ${
                                index === 0
                                  ? "text-red-500"
                                  : index === 6
                                  ? "text-blue-500"
                                  : "text-gray-700"
                              }`} key={index}>
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1 aspect-square">
                            {generateCalendarDays().map((day, index) => (
                              <div key={index} className="p-1">
                                {day !== null && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Format the date as YYYY-MM-DD
                                      const year = formData.calendarYear;
                                      const month = formData.calendarMonth + 1;
                                      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                      
                                      // Check if this date is already selected
                                      const isSelected = formData.selected_dates.includes(dateString);
                                      
                                      if (isSelected) {
                                        // If selected, remove it
                                        setFormData({
                                          ...formData,
                                          selected_dates: formData.selected_dates.filter(d => d !== dateString),
                                          lesson_slots: formData.lesson_slots.filter(slot => slot.date !== dateString)
                                        });
                                      } else {
                                        // If not selected, add it and create a slot
                                        const date = new Date(year, formData.calendarMonth, day);
                                        
                                        // Check if the date is in the past
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        
                                        if (date >= today) {
                                          // Add this date to selected dates
                                          const startTime = formData.default_start_time || "10:00";
                                          const [startHour, startMinute] = startTime.split(":").map(num => parseInt(num, 10));
                                          
                                          // Calculate end time
                                          const endHour = Math.floor(startHour + (formData.duration || 60) / 60);
                                          const endMinute = (startMinute + ((formData.duration || 60) % 60)) % 60;
                                          const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
                                          
                                          // Create a unique ID for this slot
                                          const slotId = `${dateString}_${Date.now()}`;
                                          
                                          // Create a new slot
                                          const newSlot = {
                                            id: slotId,
                                            date: dateString,
                                            start_time: startTime,
                                            end_time: endTime,
                                            capacity: formData.capacity || 10,
                                            price: formData.is_free_trial ? 0 : parseInt(formData.price, 10) || 0,
                                            discount: formData.discount || 0,
                                            deadline_days: formData.deadline_days || 1,
                                            deadline_time: formData.deadline_time || "18:00",
                                            notes: formData.notes || "",
                                            venue_details: formData.venue_details || "",
                                            is_free_trial: formData.is_free_trial
                                          };
                                          
                                          setFormData({
                                            ...formData,
                                            selected_dates: [...formData.selected_dates, dateString],
                                            lesson_slots: [...formData.lesson_slots, newSlot]
                                          });
                                        }
                                      }
                                    }}
                                    className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm
                                      ${
                                        (() => {
                                          // Check if this date is in the past
                                          const date = new Date(formData.calendarYear, formData.calendarMonth, day);
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          
                                          if (date < today) {
                                            return "bg-gray-100 text-gray-400 cursor-not-allowed";
                                          }
                                          
                                          // Format the date as YYYY-MM-DD
                                          const year = formData.calendarYear;
                                          const month = formData.calendarMonth + 1;
                                          const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                          
                                          // Check if this date is selected
                                          const isSelected = formData.selected_dates.includes(dateString);
                                          
                                          if (isSelected) {
                                            return "bg-primary/20 border border-primary text-primary font-medium hover:bg-primary/10";
                                          }
                                          
                                          return "hover:bg-gray-50 border border-gray-200";
                                        })()
                                      }
                                    `}
                                    disabled={(() => {
                                      const date = new Date(formData.calendarYear, formData.calendarMonth, day);
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      return date < today;
                                    })()}
                                  >
                                    {day}
                                    {(() => {
                                      // Format the date and check if we have slots for this date
                                      const year = formData.calendarYear;
                                      const month = formData.calendarMonth + 1;
                                      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                      
                                      const slotsCount = formData.lesson_slots.filter(slot => slot.date === dateString).length;
                                      
                                      if (slotsCount > 0) {
                                        return (
                                          <span className="ml-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                            {slotsCount}
                                          </span>
                                        );
                                      }
                                      
                                      return null;
                                    })()}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Weekday selection checkboxes */}
                        <div className="p-3 border-t bg-gray-50">
                          <p className="text-sm font-medium mb-2">
                            曜日で一括選択:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["日", "月", "火", "水", "木", "金", "土"].map(
                              (day, index) => (
                                <label
                                  key={day}
                                  className="flex items-center space-x-2 border border-gray-300 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      formData.selected_weekdays?.includes(
                                        index
                                      ) || false
                                    }
                                    onChange={() => {
                                      const year = formData.calendarYear;
                                      const month = formData.calendarMonth;
                                      const updatedWeekdays = formData.selected_weekdays || [];

                                      // Toggle weekday selection
                                      let newWeekdays;
                                      if (updatedWeekdays.includes(index)) {
                                        newWeekdays = updatedWeekdays.filter(
                                          (d) => d !== index
                                        );
                                      } else {
                                        newWeekdays = [
                                          ...updatedWeekdays,
                                          index,
                                        ];
                                      }

                                      // Update selected dates based on weekdays
                                      const firstDay = new Date(year, month, 1);
                                      const lastDay = new Date(
                                        year,
                                        month + 1,
                                        0
                                      );
                                      const updatedDates = [...formData.selected_dates];
                                      const updatedSlots = [...formData.lesson_slots];

                                      // Loop through all days in the month
                                      for (
                                        let day = 1;
                                        day <= lastDay.getDate();
                                        day++
                                      ) {
                                        const date = new Date(year, month, day);
                                        const weekday = date.getDay();
                                        
                                        // Format date string
                                        const yearStr = date.getFullYear();
                                        const monthStr = String(
                                          date.getMonth() + 1
                                        ).padStart(2, "0");
                                        const dayStr = String(
                                          date.getDate()
                                        ).padStart(2, "0");
                                        const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                                        
                                        // Skip past dates
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        if (date < today) continue;

                                        // If this is our target weekday
                                        if (weekday === index) {
                                          // If weekday is being checked
                                          if (newWeekdays.includes(index)) {
                                            if (!updatedDates.includes(dateString)) {
                                              updatedDates.push(dateString);

                                              // Create a slot for this date
                                              const startTime = formData.default_start_time || "10:00";
                                              const [startHour, startMinute] = startTime.split(":").map(num => parseInt(num, 10));
                                              
                                              // Calculate end time
                                              const endHour = Math.floor(startHour + (formData.duration || 60) / 60);
                                              const endMinute = (startMinute + ((formData.duration || 60) % 60)) % 60;
                                              const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
                                              
                                              // Create a unique ID for this slot
                                              const slotId = `${dateString}_${Date.now()}`;
                                              
                                              // Create a new slot
                                              const newSlot = {
                                                id: slotId,
                                                date: dateString,
                                                start_time: startTime,
                                                end_time: endTime,
                                                capacity: formData.capacity || 10,
                                                price: formData.is_free_trial ? 0 : parseInt(formData.price, 10) || 0,
                                                discount: formData.discount || 0,
                                                deadline_days: formData.deadline_days || 1,
                                                deadline_time: formData.deadline_time || "18:00",
                                                notes: formData.notes || "",
                                                venue_details: formData.venue_details || "",
                                                is_free_trial: formData.is_free_trial
                                              };
                                              
                                              updatedSlots.push(newSlot);
                                            }
                                          } 
                                          // If weekday is being unchecked
                                          else {
                                            const dateIndex = updatedDates.indexOf(dateString);
                                            if (dateIndex !== -1) {
                                              updatedDates.splice(dateIndex, 1);
                                              
                                              // Remove corresponding slots
                                              const slotIndex = updatedSlots.findIndex(slot => slot.date === dateString);
                                              if (slotIndex !== -1) {
                                                updatedSlots.splice(slotIndex, 1);
                                              }
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
                                        ? "text-red-500"
                                        : index === 6
                                        ? "text-blue-500"
                                        : ""
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

                    {/* Slot confirmation (Right side) */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between mb-3">
                        <h3 className="text-lg font-medium">予約枠の確認</h3>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (
                              !formData.selected_dates ||
                              formData.selected_dates.length === 0
                            ) {
                              alert(
                                "予約枠が選択されていません。先にカレンダーから日付を選択してください。"
                              );
                              return;
                            }

                            if (
                              confirm("共通設定を全ての予約枠に適用しますか？")
                            ) {
                              const updatedSlots = formData.lesson_slots.map(
                                (slot) => {
                                  const startTime = formData.default_start_time || "10:00";
                                  const [startHour, startMinute] = startTime.split(":").map(num => parseInt(num, 10));
                                  
                                  // Calculate end time
                                  const endHour = Math.floor(startHour + (formData.duration || 60) / 60);
                                  const endMinute = (startMinute + ((formData.duration || 60) % 60)) % 60;
                                  const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

                                  return {
                                    ...slot,
                                    start_time: startTime,
                                    end_time: endTime,
                                    capacity: formData.capacity || 10,
                                    price: formData.is_free_trial
                                      ? 0
                                      : parseInt(formData.price, 10) || 0,
                                    discount: formData.discount || 0,
                                    deadline_days: formData.deadline_days || 1,
                                    deadline_time:
                                      formData.deadline_time || "18:00",
                                    notes: formData.notes || "",
                                    venue_details: formData.venue_details || "",
                                  };
                                }
                              );

                              setFormData({
                                ...formData,
                                lesson_slots: updatedSlots,
                              });

                              alert("すべての予約枠に共通設定を適用しました");
                            }
                          }}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          全ての予約枠に適用
                        </Button>
                      </div>

                      {!formData.selected_dates ||
                      formData.selected_dates.length === 0 ? (
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
                            {formData.lesson_slots
                              // Sort slots by date
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map((slot, index) => {
                                // Format date for display
                                const [year, month, day] = slot.date.split('-').map(num => parseInt(num, 10));
                                const dateObj = new Date(year, month - 1, day);
                                const weekday = weekdays[dateObj.getDay()];
                                
                                // Check if editing this slot
                                const isEditing = editingSlotId === slot.id;

                                return (
                                  <div
                                    key={slot.id || index}
                                    className="p-4 hover:bg-gray-50"
                                  >
                                    {isEditing ? (
                                      <div className="bg-gray-50 p-4 rounded-lg border">
                                        <h4 className="font-medium mb-3">
                                          {year}年{month}月{day}日（{weekday}）
                                          の予約枠を編集
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              開始時間
                                            </label>
                                            <input
                                              type="time"
                                              value={editFormData.start_time}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  start_time: e.target.value,
                                                })
                                              }
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              終了時間
                                            </label>
                                            <input
                                              type="time"
                                              value={editFormData.end_time}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  end_time: e.target.value,
                                                })
                                              }
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              定員
                                            </label>
                                            <input
                                              type="number"
                                              value={editFormData.capacity}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  capacity: parseInt(
                                                    e.target.value,
                                                    10
                                                  ),
                                                })
                                              }
                                              min="1"
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              価格（円）
                                            </label>
                                            <input
                                              type="number"
                                              value={
                                                formData.is_free_trial
                                                  ? 0
                                                  : editFormData.price
                                              }
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  price: parseInt(
                                                    e.target.value,
                                                    10
                                                  ),
                                                })
                                              }
                                              min="0"
                                              disabled={formData.is_free_trial}
                                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                                formData.is_free_trial
                                                  ? "bg-gray-100 cursor-not-allowed"
                                                  : "border-gray-300"
                                              }`}
                                            />
                                            {formData.is_free_trial && (
                                              <p className="mt-1 text-xs text-orange-500">
                                                体験無料設定が有効のため、料金は0円に固定されます
                                              </p>
                                            )}
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              割引（%）
                                            </label>
                                            <input
                                              type="number"
                                              value={editFormData.discount}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  discount: parseInt(
                                                    e.target.value,
                                                    10
                                                  ),
                                                })
                                              }
                                              min="0"
                                              max="100"
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              予約締め切り（日前）
                                            </label>
                                            <input
                                              type="number"
                                              value={editFormData.deadline_days}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  deadline_days: parseInt(
                                                    e.target.value,
                                                    10
                                                  ),
                                                })
                                              }
                                              min="0"
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              予約締め切り時間
                                            </label>
                                            <input
                                              type="time"
                                              value={editFormData.deadline_time}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  deadline_time: e.target.value,
                                                })
                                              }
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              備考
                                            </label>
                                            <textarea
                                              value={editFormData.notes}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  notes: e.target.value,
                                                })
                                              }
                                              rows={2}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>

                                          <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              開催形態の詳細
                                            </label>
                                            <textarea
                                              value={editFormData.venue_details}
                                              onChange={(e) =>
                                                setEditFormData({
                                                  ...editFormData,
                                                  venue_details: e.target.value,
                                                })
                                              }
                                              rows={2}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end space-x-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingSlotId(null)
                                            }
                                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                          >
                                            キャンセル
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Find and update the slot
                                              const slotIndex = formData.lesson_slots.findIndex(
                                                (s) => s.id === slot.id
                                              );
                                              
                                              if (slotIndex >= 0) {
                                                const updatedSlots = [...formData.lesson_slots];
                                                
                                                updatedSlots[slotIndex] = {
                                                  ...updatedSlots[slotIndex],
                                                  ...editFormData,
                                                  // Keep original data that isn't being edited
                                                  id: slot.id,
                                                  date: slot.date,
                                                  is_free_trial: formData.is_free_trial,
                                                  // If free trial is enabled, price is always 0
                                                  price: formData.is_free_trial ? 0 : editFormData.price,
                                                };
                                                
                                                setFormData({
                                                  ...formData,
                                                  lesson_slots: updatedSlots,
                                                });
                                              }
                                              
                                              // Exit edit mode
                                              setEditingSlotId(null);
                                            }}
                                            className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
                                          >
                                            保存
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-medium">
                                            {year}年{month}月{day}日（{weekday}）
                                          </h4>
                                          <div className="mt-1 text-sm text-gray-600 space-y-1">
                                            <p>
                                              <span className="inline-block w-20 font-medium">
                                                開始時間:
                                              </span>
                                              {slot.start_time}
                                            </p>
                                            <p>
                                              <span className="inline-block w-20 font-medium">
                                                終了時間:
                                              </span>
                                              {slot.end_time}
                                            </p>
                                            <p>
                                              <span className="inline-block w-20 font-medium">
                                                予約締切:
                                              </span>
                                              {slot.deadline_days}日前 {slot.deadline_time}
                                            </p>
                                            <p>
                                              <span className="inline-block w-20 font-medium">
                                                定員:
                                              </span>
                                              {slot.capacity}人
                                            </p>
                                            <p>
                                              <span className="inline-block w-20 font-medium">
                                                料金:
                                              </span>
                                              {formData.is_free_trial ? (
                                                <span>
                                                  <span className="text-orange-600 font-medium">
                                                    0円
                                                  </span>{" "}
                                                  <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                                    初回体験無料
                                                  </span>
                                                </span>
                                              ) : slot.discount > 0 ? (
                                                <span>
                                                  <span className="line-through text-gray-400">
                                                    {slot.price.toLocaleString()}円
                                                  </span>{" "}
                                                  <span className="text-red-600 font-medium">
                                                    {Math.round(slot.price * (1 - slot.discount / 100)).toLocaleString()}
                                                    円
                                                  </span>{" "}
                                                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                                    {slot.discount}%OFF
                                                  </span>
                                                </span>
                                              ) : (
                                                <span>
                                                  {slot.price.toLocaleString()}円
                                                </span>
                                              )}
                                            </p>
                                            {(slot?.notes ||
                                              slot?.venue_details) && (
                                              <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                                {slot?.venue_details && (
                                                  <p>
                                                    <span className="font-medium block">
                                                      開催形態の詳細:
                                                    </span>
                                                    <span className="text-gray-600 text-sm">
                                                      {slot.venue_details}
                                                    </span>
                                                  </p>
                                                )}
                                                {slot?.notes && (
                                                  <p>
                                                    <span className="font-medium block">
                                                      備考:
                                                    </span>
                                                    <span className="text-gray-600 text-sm">
                                                      {slot.notes}
                                                    </span>
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex space-x-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Set edit mode and load slot data into edit form
                                              setEditingSlotId(slot.id);
                                              setEditFormData({
                                                start_time: slot.start_time,
                                                end_time: slot.end_time,
                                                capacity: slot.capacity,
                                                price: slot.price,
                                                discount: slot.discount || 0,
                                                deadline_days: slot.deadline_days,
                                                deadline_time: slot.deadline_time,
                                                notes: slot.notes || "",
                                                venue_details: slot.venue_details || "",
                                              });
                                            }}
                                            className="text-primary hover:text-primary/80 p-1"
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
                                              // Remove this slot
                                              const dateToRemove = slot.date;
                                              
                                              // Update selected_dates by removing this date
                                              const updatedDates = formData.selected_dates.filter(
                                                date => date !== dateToRemove
                                              );
                                              
                                              // Update lesson_slots by removing slots with this date
                                              const updatedSlots = formData.lesson_slots.filter(
                                                s => s.id !== slot.id
                                              );
                                              
                                              setFormData({
                                                ...formData,
                                                selected_dates: updatedDates,
                                                lesson_slots: updatedSlots,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
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
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 md:col-span-2">
                      <div className="flex">
                        <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">スケジュールのヒント</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>
                              開始時間の15分前までに準備を済ませておくことをお勧めします
                            </li>
                            <li>
                              終了時間には質疑応答の時間も含めるようにしましょう
                            </li>
                            <li>
                              同じ内容のレッスンを複数日で開催する場合は、複数の日付を選択してください
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
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
              const tabs = ["basic", "details", "schedule"];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1]);
              }
            }}
            disabled={activeTab === "basic"}
            className="border-gray-300"
          >
            前へ
          </Button>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={saveAsDraft} disabled={loading} className="border-gray-300">
              下書き保存
            </Button>
            {activeTab === "schedule" ? (
              <Button
                onClick={publishLesson}
                disabled={loading || imageUploading}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {loading ? "保存中..." : "公開する"}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const tabs = ["basic", "details", "schedule"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={activeTab === "schedule"}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                次へ
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorLessonCreate;