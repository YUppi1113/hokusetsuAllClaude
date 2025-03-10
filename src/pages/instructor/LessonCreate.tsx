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
} from "lucide-react";
import { checkIsPremiumInstructor, preserveTimeISOString } from "@/lib/utils";

const InstructorLessonCreate = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  // 3. Update the initial form state to better align with DB constraints
  const [formData, setFormData] = useState({
    lesson_title: "",
    lesson_catchphrase: "",
    lesson_description: "",
    category: "",
    sub_categories: [] as string[],
    difficulty_level: "beginner", // Using valid value from constraint
    price: "",
    duration: 60,
    capacity: 10,
    location_name: "",
    location_type: "online",
    classroom_area: "", // 教室エリアを追加
    lesson_type: "one_time" as "monthly" | "one_time" | "course", // Valid values from constraint
    is_free_trial: false,
    lesson_image_url: [] as string[],
    date_time_start: "",
    date_time_end: "",
    status: "draft" as "draft" | "published", // Valid values from constraint
    materials_needed: "",
    lesson_goals: "",
    lesson_outline: "",
    target_audience: [] as string[],
    monthly_plans: [] as Array<{
      name: string;
      price: string;
      frequency: string;
      lesson_duration: string;
      description: string;
    }>,
    course_sessions: 1,

    // Booking slot fields
    default_start_time: "10:00",
    deadline_days: "" as number | "",
    deadline_time: "18:00",
    discount: "" as number | "",
    selected_dates: [] as string[],
    selected_weekdays: [] as number[],
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    notes: "",
    venue_details: "",
    // Editable individual booking slots
    lesson_slots: [] as Array<{
      date: string;
      start_time: string;
      end_time: string;
      capacity: number;
      price: number;
      discount: number | null;
      deadline_days: number;
      deadline_time: string;
      notes: string;
      venue_details: string;
      is_free_trial?: boolean;
    }>,
  });

  const [availableSubcategories, setAvailableSubcategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    // Special handling for location_type to match database constraint
    if (name === "location_type" && value === "in_person") {
      // Store as 'offline' internally to match DB constraint
      setFormData({
        ...formData,
        [name]: "offline",
      });
      return;
    }
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
          } as typeof prev)
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
          } as typeof prev)
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
        [name]: "",
      });
    }
  };

  // サブカテゴリーのチェックボックスの変更を処理
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (error: any) {
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
    
    // 教室エリアのバリデーション (対面またはハイブリッドの場合のみ)
    if ((formData.location_type === "in_person" || formData.location_type === "hybrid") && !formData.classroom_area) {
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

  // 2. Fix the saveLesson function to ensure proper UTC date handling
  const saveLesson = async (status: "draft" | "published") => {
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

      // Ensure location_type uses values that match the database constraint
      let locationType = formData.location_type;
      if (locationType === "in_person") {
        locationType = "offline"; // Ensure we use 'offline' to match DB constraint
      }

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
      const lessonData: {
        id: string;
        instructor_id: string;
        lesson_title: string;
        lesson_catchphrase: string | null;
        lesson_description: string | null;
        category: string;
        sub_category: string;
        difficulty_level: string;
        location_name: string;
        location_type: string;
        classroom_area: string | null;
        lesson_type: string;
        is_free_trial: boolean;
        lesson_image_url: string[] | null;
        status: string;
        materials_needed: string | null;
        lesson_goals: string | null;
        lesson_outline: string | null;
        target_audience: string[] | null;
        created_at: string;
        updated_at: string;
        price: number;
        discount_percentage: number | null;
        notes: string | null;
        venue_details: string | null;
        is_featured: boolean;
        monthly_plans?: any[] | null;
        duration?: number | null;
        capacity?: number | null;
        course_sessions?: number | null;
      } = {
        id: lessonId,
        instructor_id: user.id,
        lesson_title: formData.lesson_title,
        lesson_catchphrase: formData.lesson_catchphrase || null,
        lesson_description: formData.lesson_description || null,
        category: formData.category,
        sub_category: subcategory,
        difficulty_level: formData.difficulty_level || "beginner",
        location_name: formData.location_name,
        location_type: locationType, // Using the corrected location type
        classroom_area: (formData.location_type === "in_person" || formData.location_type === "hybrid") 
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
      if (formData.selected_dates?.length > 0) {        // Prepare multiple lesson slots
        // 修正後のコード
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
    date_time_start: preserveTimeISOString(startDate),           // preserveTimeISOStringを使用
    date_time_end: preserveTimeISOString(endDate),               // preserveTimeISOStringを使用
    booking_deadline: preserveTimeISOString(bookingDeadline),    // preserveTimeISOStringを使用
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

      // Redirect
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
        <h1 className="text-2xl font-bold">新しいレッスンを作成</h1>
        <div className="flex space-x-3 mt-2">
          <Button variant="outline" onClick={saveAsDraft} disabled={loading}>
            下書き保存
          </Button>
          <Button onClick={publishLesson} disabled={loading || imageUploading}>
            {loading ? "保存中..." : "公開する"}
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
                        errors.lesson_title ? "border-red-500" : ""
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
                        errors.lesson_catchphrase ? "border-red-500" : ""
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
                        errors.lesson_description ? "border-red-500" : ""
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
                      {/* 画像アップロードボタン */}
                      {formData.lesson_image_url.length < 3 && (
                        <div className="flex items-center justify-center">
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 w-full flex flex-col items-center justify-center ${
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

                      {/* 画像プレビュー */}
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
                                  xmlns="http://www.w3.org/2000/svg"
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
                          errors.category ? "border-red-500" : ""
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

                  {(formData.location_type === "in_person" || formData.location_type === "hybrid") && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        教室エリア <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="classroom_area"
                        value={formData.classroom_area || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errors.classroom_area ? "border-red-500" : ""
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
                              errors.price ? "border-red-500" : ""
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
                              errors.course_sessions ? "border-red-500" : ""
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
                              <h4 className="text-base font-semibold">
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
                                className="px-3 py-1 bg-red-50 text-red-500 rounded-md hover:bg-red-100"
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
                                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                          className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20"
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
                                errors.duration ? "border-red-500" : ""
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
                                errors.capacity ? "border-red-500" : ""
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
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                          className="ml-2 text-red-500 hover:text-red-700"
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
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          target_audience: [...formData.target_audience, ""],
                        });
                      }}
                      className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 flex items-center"
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

              <TabsContent value="schedule">
                <div className="space-y-6">
                  {/* 月謝制レッスンでの表示を分岐 */}
                  {formData.lesson_type === "monthly" && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-blue-500 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
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
                    <h3 className="text-lg font-semibold mb-2">
                      予約枠の共通設定
                    </h3>
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
                            value={formData.default_start_time || "10:00"}
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
                              errors.duration ? "border-red-500" : ""
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
                              errors.capacity ? "border-red-500" : ""
                            }`}
                            placeholder="例：10"
                          />
                        </div>
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
                                : ""
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
                            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
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
                                discount: parseInt(e.target.value, 10) || "",
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
                            value={formData.notes || ""}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="例：事前に資料をお送りします"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* カレンダー（左側） */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h3 className="text-lg font-semibold mb-2">
                        予約枠を選択
                      </h3>
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
                              value={
                                formData.calendarMonth || new Date().getMonth()
                              }
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
                              className="px-3 py-1 border rounded text-sm"
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
                              const year =
                                formData.calendarYear ||
                                new Date().getFullYear();
                              const month =
                                formData.calendarMonth || new Date().getMonth();
                              const firstDay = new Date(year, month, 1);
                              const lastDay = new Date(year, month + 1, 0);
                              const daysInMonth = lastDay.getDate();
                              const startDay = firstDay.getDay(); // 0は日曜日

                              // 日付マスの配列を作成
                              const days = [];

                              // 前月の日を埋める
                              for (let i = 0; i < startDay; i++) {
                                days.push(
                                  <div
                                    key={`empty-${i}`}
                                    className="h-full rounded-md border border-transparent"
                                  ></div>
                                );
                              }

                              // 当月の日を埋める
                              for (let day = 1; day <= daysInMonth; day++) {
                                const date = new Date(year, month, day);
                                // 年月日を正しくフォーマットする（日本時間ベース）
                                const yearStr = date.getFullYear();
                                const monthStr = String(
                                  date.getMonth() + 1
                                ).padStart(2, "0"); // 月は0から始まるので+1
                                const dayStr = String(date.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                                
                                // 選択された日付の数をカウント（同日に複数のレッスンがある場合の表示用）
                                const selectedCount = formData.lesson_slots.filter(
                                  s => s.date === dateString
                                ).length || 0;
                                
                                const isSelected = selectedCount > 0;
                                const isPast =
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0));

                                days.push(
                                  <div
                                    key={`day-${day}`}
                                    onClick={() => {
                                      if (!isPast) {
                                        // 常に新しい予約枠を追加（同じ日に複数枠作成可能に）
                                        const updatedDates = [...(formData.selected_dates || [])];
                                        
                                        // 日付を追加
                                        updatedDates.push(dateString);
                                        
                                        // 終了時間の計算
                                        const startTime =
                                          formData.default_start_time ||
                                          "10:00";
                                        const [startHour, startMinute] =
                                          startTime
                                            .split(":")
                                            .map((num) =>
                                              parseInt(num, 10)
                                            );
                                        const endHour = Math.floor(
                                          startHour +
                                            (formData.duration || 60) / 60
                                        );
                                        const endMinute =
                                          (startMinute +
                                            ((formData.duration || 60) %
                                              60)) %
                                          60;
                                        const endTime = `${String(
                                          endHour
                                        ).padStart(2, "0")}:${String(
                                          endMinute
                                        ).padStart(2, "0")}`;

                                        // スロットIDのユニーク化のために日付+タイムスタンプを使用
                                        const slotId = `${dateString}_${Date.now()}`;

                                        const newSlot = {
                                          id: slotId, // スロットの一意識別子を追加
                                          date: dateString,
                                          start_time: startTime,
                                          end_time: endTime,
                                          capacity: formData.capacity || 10,
                                          price: formData.is_free_trial
                                            ? 0
                                            : parseInt(
                                                formData.price as string,
                                                10
                                              ) || 0,
                                          discount: formData.discount || 0,
                                          deadline_days:
                                            formData.deadline_days || 1,
                                          deadline_time:
                                            formData.deadline_time ||
                                            "18:00",
                                          notes: formData.notes || "",
                                          venue_details:
                                            formData.venue_details || "",
                                          is_free_trial:
                                            formData.is_free_trial, // 体験無料かどうかのフラグを追加
                                        };
                                        
                                        setFormData({
                                          ...formData,
                                          selected_dates: updatedDates,
                                          lesson_slots: [
                                            ...formData.lesson_slots,
                                            newSlot,
                                          ],
                                        });
                                      }
                                    }}
                                    className={`h-10 flex items-center justify-center rounded-md cursor-pointer border ${
                                      isPast
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : isSelected
                                        ? "bg-primary/10 border-primary text-primary font-medium"
                                        : "hover:bg-gray-50 border-gray-200"
                                    }`}
                                  >
                                    {day}
                                    {selectedCount > 0 && (
                                      <span className="ml-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                        {selectedCount}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              return days;
                            })()}
                          </div>
                        </div>

                        {/* 曜日選択のチェックボックス */}
                        <div className="p-3 border-t bg-gray-50">
                          <p className="text-sm font-medium mb-2">
                            曜日で一括選択:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["日", "月", "火", "水", "木", "金", "土"].map(
                              (day, index) => (
                                <label
                                  key={day}
                                  className="flex items-center space-x-2 border px-2 py-1 rounded-full cursor-pointer hover:bg-gray-100 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      formData.selected_weekdays?.includes(
                                        index
                                      ) || false
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

                                      // 曜日の選択を切り替え
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

                                      // 選択された曜日に基づいて日付を更新
                                      const firstDay = new Date(year, month, 1);
                                      const lastDay = new Date(
                                        year,
                                        month + 1,
                                        0
                                      );
                                      const updatedDates =
                                        formData.selected_dates || [];
                                      const updatedSlots = [
                                        ...formData.lesson_slots,
                                      ];

                                      // 現在の月のすべての日をループ
                                      for (
                                        let day = 1;
                                        day <= lastDay.getDate();
                                        day++
                                      ) {
                                        const date = new Date(year, month, day);
                                        const weekday = date.getDay();
                                        // 年月日を正しくフォーマットする（日本時間ベース）
                                        const yearStr = date.getFullYear();
                                        const monthStr = String(
                                          date.getMonth() + 1
                                        ).padStart(2, "0"); // 月は0から始まるので+1
                                        const dayStr = String(
                                          date.getDate()
                                        ).padStart(2, "0");
                                        const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                                        const isPast =
                                          date <
                                          new Date(
                                            new Date().setHours(0, 0, 0, 0)
                                          );

                                        // 過去の日付はスキップ
                                        if (isPast) continue;

                                        // 選択された曜日と一致する場合
                                        if (weekday === index) {
                                          // 曜日がチェックされた場合は日付を追加
                                          if (newWeekdays.includes(index)) {
                                            if (
                                              !updatedDates.includes(dateString)
                                            ) {
                                              updatedDates.push(dateString);

                                              // 予約枠スロットも作成
                                              const existingSlotIndex =
                                                updatedSlots.findIndex(
                                                  (slot) =>
                                                    slot.date === dateString
                                                );

                                              if (existingSlotIndex === -1) {
                                                // 終了時間の計算
                                                const startTime =
                                                  formData.default_start_time ||
                                                  "10:00";
                                                const [startHour, startMinute] =
                                                  startTime
                                                    .split(":")
                                                    .map((num) =>
                                                      parseInt(num, 10)
                                                    );
                                                const endHour = Math.floor(
                                                  startHour +
                                                    (formData.duration || 60) /
                                                      60
                                                );
                                                const endMinute =
                                                  (startMinute +
                                                    ((formData.duration || 60) %
                                                      60)) %
                                                  60;
                                                const endTime = `${String(
                                                  endHour
                                                ).padStart(2, "0")}:${String(
                                                  endMinute
                                                ).padStart(2, "0")}`;

                                                // スロットIDのユニーク化のために日付+タイムスタンプを使用
                                                const slotId = `${dateString}_${Date.now()}`;
                                                
                                                const newSlot = {
                                                  id: slotId, // スロットの一意識別子を追加
                                                  date: dateString,
                                                  start_time: startTime,
                                                  end_time: endTime,
                                                  capacity:
                                                    formData.capacity || 10,
                                                  price: formData.is_free_trial
                                                    ? 0
                                                    : parseInt(
                                                        formData.price as string,
                                                        10
                                                      ) || 0,
                                                  discount:
                                                    formData.discount || 0,
                                                  deadline_days:
                                                    formData.deadline_days || 1,
                                                  deadline_time:
                                                    formData.deadline_time ||
                                                    "18:00",
                                                  notes: formData.notes || "",
                                                  venue_details:
                                                    formData.venue_details ||
                                                    "",
                                                  is_free_trial:
                                                    formData.is_free_trial, // 体験無料かどうかのフラグを追加
                                                };
                                                updatedSlots.push(newSlot);
                                              }
                                            }
                                          }
                                          // 曜日のチェックが外れた場合は日付を削除
                                          else {
                                            const idx =
                                              updatedDates.indexOf(dateString);
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

                    {/* 予約枠確認（右側） */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between mb-3">
                        <h3 className="text-lg font-semibold">予約枠の確認</h3>
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
                                  const startTime =
                                    formData.default_start_time || "10:00";
                                  const [startHour, startMinute] = startTime
                                    .split(":")
                                    .map((num) => parseInt(num, 10));
                                  const endHour = Math.floor(
                                    startHour + (formData.duration || 60) / 60
                                  );
                                  const endMinute =
                                    (startMinute +
                                      ((formData.duration || 60) % 60)) %
                                    60;
                                  const endTime = `${String(endHour).padStart(
                                    2,
                                    "0"
                                  )}:${String(endMinute).padStart(2, "0")}`;

                                  return {
                                    ...slot,
                                    start_time: startTime,
                                    end_time: endTime,
                                    capacity: formData.capacity || 10,
                                    price: formData.is_free_trial
                                      ? 0
                                      : parseInt(
                                          formData.price as string,
                                          10
                                        ) || 0,
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
                          className="bg-primary hover:bg-primary/90"
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
                              // 日付でソート
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map((slot, index) => {
                                const dateString = slot.date;

                                // もし対応するスロットがない場合は、デフォルト値を使用
                                const startTime =
                                  slot?.start_time ||
                                  formData.default_start_time ||
                                  "10:00";
                                const endTime =
                                  slot?.end_time ||
                                  (() => {
                                    const [startHour, startMinute] = startTime
                                      .split(":")
                                      .map((num) => parseInt(num, 10));
                                    const endHour = Math.floor(
                                      startHour + (formData.duration || 60) / 60
                                    );
                                    const endMinute =
                                      (startMinute +
                                        ((formData.duration || 60) % 60)) %
                                      60;
                                    return `${String(endHour).padStart(
                                      2,
                                      "0"
                                    )}:${String(endMinute).padStart(2, "0")}`;
                                  })();
                                const capacity =
                                  slot?.capacity || formData.capacity || 10;
                                const price =
                                  slot?.price ||
                                  parseInt(formData.price as string, 10) ||
                                  0;
                                const discount =
                                  slot?.discount || formData.discount || 0;
                                const deadlineDays =
                                  slot?.deadline_days ||
                                  formData.deadline_days ||
                                  1;
                                const deadlineTime =
                                  slot?.deadline_time ||
                                  formData.deadline_time ||
                                  "18:00";

                                // 予約締め切り日時の計算
                                const startDate = new Date(
                                  `${dateString}T${startTime}`
                                );
                                const deadlineDate = new Date(startDate);
                                deadlineDate.setDate(
                                  deadlineDate.getDate() - deadlineDays
                                );
                                const [deadlineHours, deadlineMinutes] =
                                  deadlineTime.split(":");
                                deadlineDate.setHours(
                                  parseInt(deadlineHours),
                                  parseInt(deadlineMinutes),
                                  0,
                                  0
                                );

                                // 割引価格の計算
                                const discountedPrice =
                                  discount > 0
                                    ? Math.round(price * (1 - discount / 100))
                                    : price;

                                // 予約枠の編集モード状態
                                const isEditing = editingSlotId === slot.id;

                                return (
                                  <div
                                    key={index}
                                    className="p-4 hover:bg-gray-50"
                                  >
                                    {isEditing ? (
                                      <div className="bg-gray-50 p-4 rounded-lg border">
                                        <h4 className="font-medium mb-3">
                                          {new Date(
                                            dateString
                                          ).toLocaleDateString("ja-JP", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            weekday: "short",
                                          })}{" "}
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                                  : ""
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              rows={3}
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                                              rows={3}
                                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end space-x-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingSlotId(null)
                                            }
                                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                          >
                                            キャンセル
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // 予約枠スロットの更新
                                              // 編集中のスロットIDで該当するスロットを見つける
                                              const slotIndexToUpdate = formData.lesson_slots.findIndex(
                                                (s) => s.id === slot.id
                                              );
                                              
                                              const updatedSlots = [
                                                ...formData.lesson_slots,
                                              ];

                                              if (slotIndexToUpdate >= 0) {
                                                // 既存のスロットを更新
                                                updatedSlots[slotIndexToUpdate] = {
                                                  ...updatedSlots[slotIndexToUpdate],
                                                  ...editFormData,
                                                  // 元のid, date, is_free_trialを保持
                                                  id: slot.id,
                                                  date: slot.date,
                                                  is_free_trial: formData.is_free_trial,
                                                  // 体験無料設定が有効なら常に0円に上書き
                                                  price: formData.is_free_trial
                                                    ? 0
                                                    : editFormData.price,
                                                };
                                              }

                                              setFormData({
                                                ...formData,
                                                lesson_slots: updatedSlots,
                                              });

                                              setEditingSlotId(null);
                                            }}
                                            className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary/90"
                                          >
                                            保存
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-medium">
                                            {new Date(
                                              dateString
                                            ).toLocaleDateString("ja-JP", {
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                              weekday: "short",
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
                                              {deadlineDate.toLocaleDateString(
                                                "ja-JP"
                                              )}{" "}
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
                                                  </span>{" "}
                                                  <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                                    初回体験無料
                                                  </span>
                                                </span>
                                              ) : discount > 0 ? (
                                                <span>
                                                  <span className="line-through text-gray-400">
                                                    {price.toLocaleString()}円
                                                  </span>{" "}
                                                  <span className="text-red-600 font-medium">
                                                    {discountedPrice.toLocaleString()}
                                                    円
                                                  </span>{" "}
                                                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium">
                                                    {discount}%OFF
                                                  </span>
                                                </span>
                                              ) : (
                                                <span>
                                                  {price.toLocaleString()}円
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
                                              // スロットのIDを使って編集状態を設定
                                              setEditingSlotId(slot.id);
                                              // Initialize edit form with this slot's data
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
                                              // この予約枠を削除
                                              // slotのIDで指定されたスロットのみを削除
                                              const slotId = slot.id;
                                              
                                              // 削除するスロットの日付
                                              const dateToRemove = slot.date;
                                              
                                              // 該当するスロットを削除
                                              const updatedSlots = formData.lesson_slots.filter(
                                                (s) => s.id !== slotId
                                              );
                                              
                                              // 対応する日付の参照も削除（同じ日付の最後のスロットが削除された場合のみ）
                                              const remainingSlotsWithSameDate = updatedSlots.filter(
                                                (s) => s.date === dateToRemove
                                              ).length;
                                              
                                              let updatedDates = [...formData.selected_dates];
                                              
                                              // この日付の最後のスロットが削除された場合は、日付の参照も1つ削除
                                              if (remainingSlotsWithSameDate === 0) {
                                                // 最初に見つかった一致する日付を削除
                                                const dateIndex = updatedDates.indexOf(dateToRemove);
                                                if (dateIndex !== -1) {
                                                  updatedDates.splice(dateIndex, 1);
                                                }
                                              }
                                              
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
                                    )}
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
        >
          前へ
        </Button>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={saveAsDraft} disabled={loading}>
            下書き保存
          </Button>
          {activeTab === "schedule" ? (
            <Button
              onClick={publishLesson}
              disabled={loading || imageUploading}
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
            >
              次へ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorLessonCreate;
