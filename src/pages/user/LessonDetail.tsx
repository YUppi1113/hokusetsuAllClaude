import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Check, Heart, MessageCircle, Clock, Users, MapPin, Calendar } from "lucide-react";

const UserLessonDetail = () => {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState(null);
  const [bookingStatus, setBookingStatus] = useState({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // 予約枠関連の状態
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Add state variables for calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [slotsGroupedByDate, setSlotsGroupedByDate] = useState({});
  const [filteredSlots, setFilteredSlots] = useState([]);

  // レッスンスロットの最新データを取得するための関数
  const fetchLatestSlotData = async () => {
    if (!id || !selectedSlot) return;

    try {
      setLoadingSlots(true);

      // 最新のスロットデータを取得
      const { data: slotsData, error: slotsError } = await supabase
        .from("lesson_slots")
        .select("*")
        .eq("lesson_id", id)
        .eq("status", "published")
        .order("date_time_start", { ascending: true });

      if (slotsError) throw slotsError;

      // 全スロットの情報を更新
      setSlots(slotsData || []);

      // 現在選択されているスロットの情報も更新
      if (selectedSlot && slotsData) {
        const updatedSelectedSlot = slotsData.find(
          (slot) => slot.id === selectedSlot.id
        );
        if (updatedSelectedSlot) {
          setSelectedSlot(updatedSelectedSlot);
        }
      }

      // Update the slots grouped by date
      groupSlotsByDate(slotsData || []);
    } catch (error) {
      console.error("Error fetching latest slot data:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Function to group slots by date - 日付ずれバグを修正
  const groupSlotsByDate = (slots) => {
    const grouped = {};

    slots.forEach((slot) => {
      const date = new Date(slot.date_time_start);
      // 日付をローカル形式で抽出 (YYYY-MM-DD形式)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      if (!grouped[dateString]) {
        grouped[dateString] = [];
      }

      grouped[dateString].push(slot);
    });

    setSlotsGroupedByDate(grouped);

    // Also update filtered slots if a date is already selected
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      setFilteredSlots(grouped[dateString] || []);
    }

    // Generate calendar days
    generateCalendarDays(currentMonth, grouped);
  };

  // Function to generate calendar days for the current month
  const generateCalendarDays = (monthDate, groupedSlots) => {
    const date = new Date(monthDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 for Sunday, 1 for Monday, etc.

    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Generate an array of day objects
    const days = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, date: null, hasSlots: false });
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // ローカル形式で日付文字列を作成
      const dateYear = date.getFullYear();
      const dateMonth = String(date.getMonth() + 1).padStart(2, "0");
      const dateDay = String(date.getDate()).padStart(2, "0");
      const dateString = `${dateYear}-${dateMonth}-${dateDay}`;

      const hasSlots =
        !!groupedSlots[dateString] &&
        groupedSlots[dateString].some(
          (slot) => slot.current_participants_count < slot.capacity
        );

      const availableSlots = groupedSlots[dateString]
        ? groupedSlots[dateString].filter(
            (slot) => slot.current_participants_count < slot.capacity
          ).length
        : 0;

      days.push({
        day,
        date,
        hasSlots,
        dateString,
        availableSlots,
        totalSlots: groupedSlots[dateString]
          ? groupedSlots[dateString].length
          : 0,
      });
    }

    // Add empty slots for days after the last day of the month to complete the week
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remainingDays; i++) {
      days.push({ day: null, date: null, hasSlots: false });
    }

    setCalendarDays(days);
  };

  // Function to handle date selection in the calendar
  const handleDateSelect = (date, dateString) => {
    if (!date || !dateString) return;

    setSelectedDate(date);
    const slotsForDate = slotsGroupedByDate[dateString] || [];
    setFilteredSlots(slotsForDate);

    // If there's only one slot for this date, select it automatically
    if (slotsForDate.length === 1) {
      setSelectedSlot(slotsForDate[0]);
    } else if (slotsForDate.length > 0) {
      // Otherwise, select the first available slot
      const availableSlot = slotsForDate.find(
        (slot) => slot.current_participants_count < slot.capacity
      );
      if (availableSlot) {
        setSelectedSlot(availableSlot);
      } else {
        setSelectedSlot(slotsForDate[0]);
      }
    } else {
      setSelectedSlot(null);
    }
  };

  // Functions to navigate between months
  const goToPreviousMonth = () => {
    const previousMonth = new Date(currentMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    setCurrentMonth(previousMonth);
    generateCalendarDays(previousMonth, slotsGroupedByDate);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
    generateCalendarDays(nextMonth, slotsGroupedByDate);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingSlots(true);

        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (!id) return;

        // Fetch lesson details
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", id)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);

        // Fetch lesson slots
        const { data: slotsData, error: slotsError } = await supabase
          .from("lesson_slots")
          .select("*")
          .eq("lesson_id", id)
          .eq("status", "published")
          .order("date_time_start", { ascending: true });

        if (slotsError) throw slotsError;
        setSlots(slotsData || []);

        // Group the slots by date
        groupSlotsByDate(slotsData || []);

        // 今日の日付を取得
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ローカル形式で今日の日付文字列を作成
        const todayYear = today.getFullYear();
        const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
        const todayDay = String(today.getDate()).padStart(2, "0");
        const todayString = `${todayYear}-${todayMonth}-${todayDay}`;

        if (slotsData && slotsData.length > 0) {
          // Check if there are slots for today
          const slotsForToday = (slotsGroupedByDate[todayString] || []).filter(
            (slot) => new Date(slot.date_time_start) > new Date()
          );

          if (slotsForToday.length > 0) {
            setSelectedDate(today);
            setFilteredSlots(slotsForToday);
            setSelectedSlot(slotsForToday[0]);
          } else {
            // Find the first date with available slots
            const sortedDates = Object.keys(slotsGroupedByDate).sort();
            const firstAvailableDate = sortedDates.find((dateString) => {
              const dateParts = dateString.split("-");
              const dateObj = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              );
              return (
                dateObj >= today &&
                slotsGroupedByDate[dateString].some(
                  (slot) => slot.current_participants_count < slot.capacity
                )
              );
            });

            if (firstAvailableDate) {
              const dateParts = firstAvailableDate.split("-");
              const firstDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              );

              setSelectedDate(firstDate);
              setFilteredSlots(slotsGroupedByDate[firstAvailableDate]);
              setSelectedSlot(slotsGroupedByDate[firstAvailableDate][0]);

              // Make sure the calendar displays the month of the first available date
              setCurrentMonth(
                new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
              );
            } else if (sortedDates.length > 0) {
              // If no available slots, just show the first date
              const dateParts = sortedDates[0].split("-");
              const firstDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              );

              setSelectedDate(firstDate);
              setFilteredSlots(slotsGroupedByDate[sortedDates[0]]);
              setSelectedSlot(slotsGroupedByDate[sortedDates[0]][0]);

              // Make sure the calendar displays the month of the first date
              setCurrentMonth(
                new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
              );
            }
          }
        }

        // Fetch instructor profile with all details
        if (lessonData?.instructor_id) {
          // Fetch instructor profile data
          const { data: instructorData, error: instructorError } =
            await supabase
              .from("instructor_profiles")
              .select("*")
              .eq("id", lessonData.instructor_id)
              .single();

          if (instructorError) throw instructorError;

          // Get review count in a separate query
          const { count: reviewCount, error: reviewCountError } = await supabase
            .from("reviews")
            .select("*", { count: "exact", head: true })
            .eq("instructor_id", lessonData.instructor_id);

          if (reviewCountError) {
            console.error("Error fetching review count:", reviewCountError);
          }

          // Combine the instructor data with review count
          setInstructor({
            ...instructorData,
            review_count: reviewCount || 0,
          });
        }

        // Check if lesson is in user's favorites
        if (user) {
          const { data: favoriteData } = await supabase
            .from("favorites")
            .select("*")
            .eq("user_id", user.id)
            .eq("lesson_id", id)
            .single();

          setIsFavorite(!!favoriteData);

          // 各スロットの予約状況を確認
          if (slotsData && slotsData.length > 0) {
            const statuses = {};

            // すべてのスロットの予約状況を一度に取得
            const { data: bookingsData } = await supabase
              .from("bookings")
              .select("slot_id, status")
              .eq("user_id", user.id)
              .eq("lesson_id", id);

            if (bookingsData) {
              bookingsData.forEach((booking) => {
                statuses[booking.slot_id] = booking.status;
              });
            }

            setBookingStatus(statuses);
          }
        }
      } catch (error) {
        console.error("Error fetching lesson data:", error);
      } finally {
        setLoading(false);
        setLoadingSlots(false);
      }
    };

    fetchData();
  }, [id]);

  // Keep all the existing functions
  const toggleFavorite = async () => {
    if (!user) {
      console.log('未ログイン状態でお気に入りボタンがクリックされました');
      // 未ログイン時は登録ページへリダイレクト（現在のページ情報を保持）
      const currentPath = window.location.pathname;
      window.location.href = `/register?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }
    
    if (!id) return;

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", id);
      } else {
        // Add to favorites
        await supabase
          .from("favorites")
          .insert([{ user_id: user.id, lesson_id: id }]);
      }

      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error updating favorites:", error);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      console.log('未ログイン状態で予約ボタンがクリックされました');
      // 未ログイン時は登録ページへリダイレクト（現在のページ情報を保持）
      const currentPath = window.location.pathname;
      window.location.href = `/register?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }
    
    if (!id || !selectedSlot) return;

    try {
      console.log("予約処理開始:", user.id, id, selectedSlot.id);

      // 最初に最新のスロット情報を取得して満席でないか確認
      const { data: latestSlotData, error: latestSlotError } = await supabase
        .from("lesson_slots")
        .select("current_participants_count, capacity")
        .eq("id", selectedSlot.id)
        .single();

      if (latestSlotError) {
        console.error("スロット情報取得エラー:", latestSlotError);
        throw latestSlotError;
      }

      // 満席チェック
      if (
        latestSlotData &&
        latestSlotData.current_participants_count >= latestSlotData.capacity
      ) {
        alert("申し訳ありません。この回は既に満席になりました。");
        // スロット情報を更新
        fetchLatestSlotData();
        return;
      }

      // 1. まず既存の予約がないか確認
      const { data: existingBooking, error: checkError } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("slot_id", selectedSlot.id)
        .maybeSingle();

      if (checkError) {
        console.error("既存予約の確認エラー:", checkError);
        throw checkError;
      }

      // 既存の予約がある場合
      if (existingBooking) {
        console.log("既に予約が存在します:", existingBooking);

        // キャンセル済みの場合は再予約として扱う
        if (
          existingBooking.status === "cancelled" ||
          existingBooking.status === "canceled"
        ) {
          console.log(
            "キャンセル済みの予約を再予約します:",
            existingBooking.id
          );

          // 現在時刻を取得
          const nowJST = new Date().toISOString();

          // キャンセル済みの予約を再度予約済みにする
          const { error: updateError } = await supabase
            .from("bookings")
            .update({
              status: "pending",
              payment_status: "pending",
              booking_date: nowJST,
              updated_at: nowJST,
            })
            .eq("id", existingBooking.id);

          if (updateError) {
            console.error("予約更新エラー:", updateError);
            throw updateError;
          }

          // 予約状態を更新
          setBookingStatus({
            ...bookingStatus,
            [selectedSlot.id]: "pending",
          });
          console.log("予約の再予約が完了しました");

          // 最新のスロット情報を取得
          fetchLatestSlotData();

          // Redirect to booking confirmation page
          alert("レッスンを再予約しました。予約管理画面に移動します。");
          window.location.href = `/user/bookings`;
          return;
        } else {
          // キャンセル済み以外の予約がある場合は処理を終了
          setBookingStatus({
            ...bookingStatus,
            [selectedSlot.id]: existingBooking.status,
          });
          alert("この回は既に予約済みです。");
          return;
        }
      }

      // 2. user_profilesテーブルにユーザープロファイルが存在するか確認
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("ユーザープロファイル確認エラー:", profileError);
        throw profileError;
      }

      // ユーザープロファイルが存在しない場合は作成
      if (!userProfile) {
        console.log("ユーザープロファイルが存在しないため作成します");
        const { error: createProfileError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "ゲスト",
              username:
                user.user_metadata?.username ||
                user.email?.split("@")[0] ||
                "user",
            },
          ]);

        if (createProfileError) {
          console.error("ユーザープロファイル作成エラー:", createProfileError);
          throw createProfileError;
        }
      }

      // 3. 予約を作成
      console.log("予約レコードを作成します");
      // 現在時刻を取得
      const nowJST = new Date().toISOString();

      const { error } = await supabase.from("bookings").insert([
        {
          user_id: user.id,
          lesson_id: id,
          slot_id: selectedSlot.id,
          booking_date: nowJST,
          status: "pending",
          payment_status: "pending",
        },
      ]);

      if (error) {
        console.error("予約作成エラー:", error);
        throw error;
      }

      // 4. チャットルームを作成
      console.log("チャットルームを作成します");
      // チャットルームが既に存在するか確認
      const { data: existingChatRoom, error: chatRoomCheckError } =
        await supabase
          .from("chat_rooms")
          .select("id")
          .eq("user_id", user.id)
          .eq("lesson_id", id)
          .maybeSingle();

      if (chatRoomCheckError) {
        console.error("チャットルーム確認エラー:", chatRoomCheckError);
      }

      // チャットルームが存在しない場合のみ作成
      if (!existingChatRoom) {
        const { error: chatRoomError } = await supabase
          .from("chat_rooms")
          .insert([
            {
              lesson_id: id,
              instructor_id: lesson.instructor_id,
              user_id: user.id,
            },
          ]);

        if (chatRoomError) {
          console.error("チャットルーム作成エラー:", chatRoomError);
          // チャットルーム作成に失敗しても予約自体は成功とみなす
        }
      } else {
        console.log("チャットルームは既に存在します:", existingChatRoom.id);
      }

      // 予約状態を更新
      setBookingStatus({
        ...bookingStatus,
        [selectedSlot.id]: "pending",
      });

      // 最新のスロット情報を取得して画面表示を更新
      fetchLatestSlotData();

      console.log("予約処理が完了しました");

      // プロフィールの完了状態を確認
      const { data: profileData, error: profileCheckError } = await supabase
        .from("user_profiles")
        .select("is_profile_completed")
        .eq("id", user.id)
        .single();

      if (
        !profileCheckError &&
        profileData &&
        !profileData.is_profile_completed
      ) {
        // プロフィール未完了の場合
        if (confirm("予約が完了しました。続けてプロフィールを設定しますか？")) {
          window.location.href = `/user/profile`;
          return;
        }
      }

      // 通常のリダイレクト
      alert("予約が完了しました。予約管理画面に移動します。");
      window.location.href = `/user/bookings`;
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("予約処理中にエラーが発生しました。もう一度お試しください。");
    }
  };

  const handleChat = async () => {
    if (!user) {
      console.log('未ログイン状態でチャットボタンがクリックされました');
      // 未ログイン時は登録ページへリダイレクト（現在のページ情報を保持）
      const currentPath = window.location.pathname;
      window.location.href = `/register?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }
    
    if (!id || !lesson?.instructor_id) return;

    try {
      // チャットルームが既に存在するか確認
      const { data: existingChatRoom, error: chatRoomCheckError } =
        await supabase
          .from("chat_rooms")
          .select("id")
          .eq("user_id", user.id)
          .eq("lesson_id", id)
          .maybeSingle();

      if (chatRoomCheckError) {
        console.error("チャットルーム確認エラー:", chatRoomCheckError);
        throw chatRoomCheckError;
      }

      // チャットルームが存在する場合はそこに移動
      if (existingChatRoom) {
        window.location.href = `/user/chat/${existingChatRoom.id}`;
        return;
      }

      // チャットルームが存在しない場合は新規作成
      const { data: newChatRoom, error: chatRoomError } = await supabase
        .from("chat_rooms")
        .insert([
          {
            lesson_id: id,
            instructor_id: lesson.instructor_id,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (chatRoomError) {
        console.error("チャットルーム作成エラー:", chatRoomError);
        throw chatRoomError;
      }

      // 作成したチャットルームに移動
      window.location.href = `/user/chat/${newChatRoom.id}`;
    } catch (error) {
      console.error("Error handling chat:", error);
      alert("チャットの準備中にエラーが発生しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">レッスンが見つかりません</h1>
          <p className="text-gray-500 mb-6">
            お探しのレッスンは存在しないか、削除された可能性があります。
          </p>
          <Link
            to="/user/lessons"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            レッスン一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  // レッスンタイプに応じたラベルと色の設定
  const lessonTypeLabels = {
    monthly: "月額制",
    one_time: "単発講座",
    course: "コース講座",
  };

  const lessonTypeColors = {
    monthly: "bg-blue-100 text-blue-800",
    one_time: "bg-purple-100 text-purple-800",
    course: "bg-green-100 text-green-800",
  };

  // Format date to show year and month
  const formatMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };

  // 日付を整形する関数
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 時間を整形する関数
  const formatTime = (timeString) => {
    // データベースの値をそのまま使用するため、タイムゾーン変換を行わない
    const date = new Date(timeString);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  // Get day name for weekdays in Japanese
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson details - main content area - 2/3 width on desktop */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              {/* Lesson title and favorite button */}
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold text-gray-900 pr-10">{lesson.lesson_title}</h1>
                <button
                  onClick={toggleFavorite}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
                >
                  <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              </div>
              
              {/* Lesson tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {lesson.location_type === "online" ? "オンライン" : "対面"}
                </span>
                {lesson.lesson_type && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    lessonTypeColors[lesson.lesson_type] || "bg-gray-100 text-gray-800"
                  }`}>
                    {lessonTypeLabels[lesson.lesson_type] || lesson.lesson_type}
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {lesson.difficulty_level === "beginner"
                    ? "初級"
                    : lesson.difficulty_level === "intermediate"
                    ? "中級"
                    : lesson.difficulty_level === "advanced"
                    ? "上級"
                    : "全レベル"}
                </span>
                {lesson.category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {lesson.category}
                  </span>
                )}
                {lesson.sub_category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/5 text-primary">
                    {lesson.sub_category}
                  </span>
                )}
              </div>
              
              {/* Main image carousel */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-6 aspect-[4/3]">
                {lesson.lesson_image_url && lesson.lesson_image_url.length > 0 ? (
                  <div className="relative w-full h-full">
                    <img
                      src={lesson.lesson_image_url[activeImageIndex]}
                      alt={`${lesson.lesson_title} - 画像 ${activeImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Image navigation for multiple images */}
                    {lesson.lesson_image_url.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImageIndex((prev) => (prev === 0 ? lesson.lesson_image_url.length - 1 : prev - 1))}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-1.5 rounded-full hover:bg-black/50 focus:outline-none transition-colors"
                          aria-label="前の画像"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setActiveImageIndex((prev) => (prev === lesson.lesson_image_url.length - 1 ? 0 : prev + 1))}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white p-1.5 rounded-full hover:bg-black/50 focus:outline-none transition-colors"
                          aria-label="次の画像"
                        >
                          <ChevronRight size={20} />
                        </button>
                        
                        {/* Image counter */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-1.5">
                          {lesson.lesson_image_url.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveImageIndex(index)}
                              className={`w-2.5 h-2.5 rounded-full ${
                                index === activeImageIndex ? "bg-white" : "bg-white/50"
                              }`}
                              aria-label={`画像 ${index + 1} に移動`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-400">画像なし</span>
                  </div>
                )}
              </div>
              
              {/* Lesson description */}
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 text-gray-900">レッスン内容</h2>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.lesson_description}</p>
              </div>
              
              {/* What you'll learn section */}
              <div className="mb-6 pb-6 border-b">
                <h2 className="text-lg font-bold mb-3 text-gray-900">こんなことを学びます</h2>
                {lesson.lesson_goals ? (
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{lesson.lesson_goals}</p>
                ) : (
                  <>
                    <p className="text-gray-700 mb-3">
                      年中さん以上参加OK！ダンスをはじめたいキッズ向け！初心者も未経験者も楽しく踊れるキッズ向けK-POP＆HIP HOPダンスの基礎レッスンです。
                    </p>
                    <p className="text-gray-700">
                      まずはダンスの基礎を習いたい方、運動神経UPを目指す方、いつも踊っているお子様など！
                    </p>
                  </>
                )}
              </div>
              
              {/* Lesson details */}
              {instructor && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 text-gray-900">講師情報</h2>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                      {instructor.profile_image_url ? (
                        <img
                          src={instructor.profile_image_url}
                          alt={instructor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-primary text-white text-xl font-bold">
                          {instructor.name?.charAt(0) || "I"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold mb-1 flex items-center">
                        {instructor.name}
                        {instructor.is_verified && (
                          <span className="ml-1 inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5 w-4 h-4">
                            <Check size={12} />
                          </span>
                        )}
                      </p>
                      {instructor.average_rating > 0 && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <span className="flex items-center text-yellow-500 mr-1">★</span>
                          {instructor.average_rating.toFixed(1)}
                          <span className="text-gray-500 ml-1">
                            ({instructor.review_count || 0}件)
                          </span>
                        </p>
                      )}
                      <Link
                        to={`/user/instructors/${instructor.id}`}
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        プロフィールを見る →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Additional lesson details */}
              {lesson.lesson_outline && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 text-gray-900">レッスンの流れ</h2>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {lesson.lesson_outline}
                  </p>
                </div>
              )}
              
              {lesson.materials_needed && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 text-gray-900">持ち物・準備</h2>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {lesson.materials_needed}
                  </p>
                </div>
              )}
            </div>
          </div>
          
            {/* Booking sidebar */}
            <div>
              <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-6">
                <div className="mb-6">
                  {lesson.lesson_type === "monthly" ? (
                    <>
                      <p className="text-3xl font-bold mb-1 text-primary">
                        ¥{lesson.price}
                        <span className="text-lg font-normal">/月</span>
                      </p>
                      <p className="text-sm text-gray-500">月額料金</p>
                    </>
                  ) : lesson.lesson_type === "course" ? (
                    <>
                      {lesson.discount_percentage ? (
                        <div>
                          <p className="mb-1">
                            <span className="line-through text-gray-400 text-lg">
                              {lesson.price.toLocaleString()}円
                            </span>{" "}
                            <span className="text-3xl font-bold text-primary">
                              {Math.round(
                                lesson.price *
                                  (1 - lesson.discount_percentage / 100)
                              ).toLocaleString()}
                              円
                            </span>
                            <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded text-sm font-medium">
                              {lesson.discount_percentage}%OFF
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            コース料金（全{lesson.course_sessions || "?"}回）
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold mb-1 text-primary">
                            {lesson.price}円
                          </p>
                          <p className="text-sm text-gray-500">
                            コース料金（全{lesson.course_sessions || "?"}回）
                          </p>
                        </>
                      )}
                    </>
                  ) : selectedSlot ? (
                    <>
                      {selectedSlot.discount_percentage ? (
                        <div>
                          <p className="mb-1">
                            <span className="line-through text-gray-400 text-lg">
                              {selectedSlot.price}円
                            </span>{" "}
                            <span className="text-3xl font-bold text-primary">
                              {Math.round(
                                selectedSlot.price *
                                  (1 - selectedSlot.discount_percentage / 100)
                              )}
                              円
                            </span>
                            <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded text-sm font-medium">
                              {selectedSlot.discount_percentage}%OFF
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">1回あたり</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold mb-1 text-primary">
                            {selectedSlot.price}円
                          </p>
                          <p className="text-sm text-gray-500">1回あたり</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {lesson.discount_percentage ? (
                        <div>
                          <p className="mb-1">
                            <span className="line-through text-gray-400 text-lg">
                              {lesson.price.toLocaleString()}円
                            </span>{" "}
                            <span className="text-3xl font-bold text-primary">
                              {Math.round(
                                lesson.price *
                                  (1 - lesson.discount_percentage / 100)
                              ).toLocaleString()}
                              円
                            </span>
                            <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded text-sm font-medium">
                              {lesson.discount_percentage}%OFF
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">1回あたり</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-3xl font-bold mb-1 text-primary">
                            {lesson.price.toLocaleString()}円
                          </p>
                          <p className="text-sm text-gray-500">1回あたり</p>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* カレンダーによる予約枠の選択 */}
                {slots.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">
                      予約枠を選択
                    </h3>

                    {/* Calendar View - UIを改善 */}
                    <div className="border rounded-lg overflow-hidden mb-4 shadow-sm">
                      {/* Calendar Header */}
                      <div className="flex justify-between items-center p-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                        <button
                          onClick={goToPreviousMonth}
                          className="p-1.5 rounded-full hover:bg-white/80 transition-colors"
                          aria-label="前月"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <h4 className="font-semibold text-gray-800">
                          {formatMonth(currentMonth)}
                        </h4>
                        <button
                          onClick={goToNextMonth}
                          className="p-1.5 rounded-full hover:bg-white/80 transition-colors"
                          aria-label="次月"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      {/* Weekday Headers */}
                      <div className="grid grid-cols-7 text-center bg-gray-50 border-b">
                        {weekdays.map((day, index) => (
                          <div
                            key={index}
                            className={`py-2 text-xs font-medium ${
                              index === 0
                                ? "text-red-500"
                                : index === 6
                                ? "text-blue-500"
                                : "text-gray-700"
                            }`}
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid - 予約のある日を目立たせる */}
                      <div className="grid grid-cols-7 bg-white">
                        {calendarDays.map((dayObj, index) => (
                          <div
                            key={index}
                            className={`p-1 border-t border-l ${
                              index % 7 === 6 ? "border-r" : ""
                            } ${
                              Math.floor(index / 7) ===
                              Math.floor(calendarDays.length / 7) - 1
                                ? "border-b"
                                : ""
                            }`}
                          >
                            {dayObj.day !== null && (
                              <button
                                onClick={() =>
                                  dayObj.hasSlots
                                    ? handleDateSelect(
                                        dayObj.date,
                                        dayObj.dateString
                                      )
                                    : null
                                }
                                className={`w-full aspect-square flex flex-col items-center justify-center relative
                                  ${
                                    dayObj.date &&
                                    selectedDate &&
                                    dayObj.date.toDateString() ===
                                      selectedDate.toDateString()
                                      ? "font-bold"
                                      : dayObj.hasSlots
                                      ? "hover:bg-primary/5"
                                      : "opacity-40"
                                  }
                                  ${
                                    dayObj.date &&
                                    new Date().toDateString() ===
                                      dayObj.date.toDateString() &&
                                    "border border-primary/30 rounded-lg"
                                  }
                                `}
                                disabled={!dayObj.hasSlots}
                              >
                                {/* 日付の表示 - 小さく上部に配置 */}
                                <span
                                  className={`text-xs mb-0.5 ${
                                    dayObj.date &&
                                    selectedDate &&
                                    dayObj.date.toDateString() ===
                                      selectedDate.toDateString()
                                      ? "text-primary"
                                      : index % 7 === 0
                                      ? "text-red-500"
                                      : index % 7 === 6
                                      ? "text-blue-500"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {dayObj.day}
                                </span>

                                {/* 予約可能な枠がある場合、丸を表示 */}
                                {dayObj.hasSlots && (
                                  <div className={`flex flex-col items-center`}>
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center rounded-full ${
                                        dayObj.date &&
                                        selectedDate &&
                                        dayObj.date.toDateString() ===
                                          selectedDate.toDateString()
                                          ? "bg-primary text-white"
                                          : "bg-primary/10 text-primary"
                                      }`}
                                    >
                                      ◎
                                    </div>
                                    {dayObj.date &&
                                      selectedDate &&
                                      dayObj.date.toDateString() ===
                                        selectedDate.toDateString() && (
                                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full"></div>
                                      )}
                                  </div>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Legend */}
                      <div className="flex justify-end items-center p-2 text-xs text-gray-500 bg-gray-50 border-t">
                        <div className="flex items-center mr-3">
                          <div>◎</div>
                          <span>予約可能</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-primary rounded-full mr-1.5"></div>
                          <span>選択中</span>
                        </div>
                      </div>
                    </div>

                    {/* Selected Date Slots */}
                    {selectedDate && filteredSlots.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-gray-700 flex items-center">
                          <svg
                            className="w-4 h-4 mr-1 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            ></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          {`${selectedDate.getFullYear()}年${
                            selectedDate.getMonth() + 1
                          }月${selectedDate.getDate()}日`}{" "}
                          の予約枠
                        </h4>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                          {filteredSlots.map((slot) => (
                            <button
                              key={slot.id}
                              className={`p-3 rounded-lg ${
                                selectedSlot?.id === slot.id
                                  ? "bg-primary/10 border-primary border-2"
                                  : "border border-gray-200 hover:bg-gray-50"
                              } text-left transition-all ${
                                slot.current_participants_count >= slot.capacity
                                  ? "opacity-60"
                                  : ""
                              }`}
                              onClick={() => setSelectedSlot(slot)}
                              disabled={
                                slot.current_participants_count >= slot.capacity
                              }
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">
                                    {formatTime(slot.date_time_start)}
                                    {" 〜 "}
                                    {formatTime(slot.date_time_end)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {Math.round(
                                      (new Date(slot.date_time_end).getTime() -
                                        new Date(
                                          slot.date_time_start
                                        ).getTime()) /
                                        60000
                                    )}
                                    分間
                                  </p>
                                </div>
                                <div className="text-right">
                                  {slot.discount_percentage > 0 ? (
                                    <div>
                                      <span className="line-through text-gray-400 text-xs">
                                        {slot.price}円
                                      </span>
                                      <p className="text-primary font-bold text-sm">
                                        {Math.round(
                                          slot.price *
                                            (1 - slot.discount_percentage / 100)
                                        )}
                                        円
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-primary font-bold text-sm">
                                      {slot.price}円
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex justify-between items-center">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    slot.current_participants_count >=
                                    slot.capacity
                                      ? "bg-red-100 text-red-800"
                                      : slot.current_participants_count >=
                                        slot.capacity * 0.8
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {slot.current_participants_count >=
                                  slot.capacity
                                    ? "満席"
                                    : slot.current_participants_count >=
                                      slot.capacity * 0.8
                                    ? "残りわずか"
                                    : "予約可能"}
                                  &nbsp;({slot.current_participants_count}/
                                  {slot.capacity})
                                </span>

                                {bookingStatus[slot.id] && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center">
                                    <Check size={12} className="mr-0.5" />
                                    {bookingStatus[slot.id] === "pending"
                                      ? "予約済み"
                                      : bookingStatus[slot.id] === "confirmed"
                                      ? "確定済み"
                                      : bookingStatus[slot.id] ===
                                          "cancelled" ||
                                        bookingStatus[slot.id] === "canceled"
                                      ? "キャンセル済み"
                                      : bookingStatus[slot.id]}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDate && filteredSlots.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        選択した日に利用可能な予約枠はありません。
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  {selectedSlot && (
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        ></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          選択中のレッスン日時
                        </h3>
                        <p className="text-gray-700">
                          {(() => {
                            const d = new Date(selectedSlot.date_time_start);
                            return `${d.getFullYear()}年${
                              d.getMonth() + 1
                            }月${d.getDate()}日`;
                          })()}{" "}
                          {formatTime(selectedSlot.date_time_start)}
                          {" 〜 "}
                          {formatTime(selectedSlot.date_time_end)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {Math.round(
                            (new Date(selectedSlot.date_time_end).getTime() -
                              new Date(
                                selectedSlot.date_time_start
                              ).getTime()) /
                              60000
                          )}
                          分間
                        </p>
                        {selectedSlot.booking_deadline && (
                          <p className="text-sm text-gray-500 mt-1">
                            予約締切:{" "}
                            {formatDate(selectedSlot.booking_deadline)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        レッスン場所
                      </h3>
                      <p className="text-gray-700">
                        {lesson.location_type === "online" ? "オンライン" : "対面"}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {lesson.location_name}
                      </p>
                      {selectedSlot?.venue_details && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          {selectedSlot.venue_details}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedSlot && lesson.lesson_type !== "monthly" && (
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <div>
                        <h3 className="font-medium text-gray-900">定員</h3>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-gray-700">
                            {selectedSlot.current_participants_count} /{" "}
                            {selectedSlot.capacity}人
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedSlot.current_participants_count >=
                              selectedSlot.capacity
                                ? "bg-red-100 text-red-800"
                                : selectedSlot.current_participants_count >=
                                  selectedSlot.capacity * 0.8
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {selectedSlot.current_participants_count >=
                            selectedSlot.capacity
                              ? "満席"
                              : selectedSlot.current_participants_count >=
                                selectedSlot.capacity * 0.8
                              ? "残りわずか"
                              : "予約可能"}
                          </span>
                        </div>
                        {lesson.lesson_type !== "monthly" && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full ${
                                selectedSlot.current_participants_count /
                                  selectedSlot.capacity >
                                0.8
                                  ? "bg-yellow-500"
                                  : "bg-primary"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (selectedSlot.current_participants_count /
                                    selectedSlot.capacity) *
                                    100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSlot?.notes && (
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <div>
                        <h3 className="font-medium text-gray-900">特記事項</h3>
                        <p className="text-gray-600 text-sm whitespace-pre-line">
                          {selectedSlot.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 予約ステータスの表示 */}
                <div className="mt-6">
                  {selectedSlot && bookingStatus[selectedSlot.id] ? (
                    bookingStatus[selectedSlot.id] === "canceled" ||
                    bookingStatus[selectedSlot.id] === "cancelled" ? (
                      // キャンセル済みの場合は「レッスンを予約する」ボタンを表示
                      <div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center mb-4 border border-yellow-200">
                          <p className="font-medium mb-1 text-yellow-700">
                            この回の予約はキャンセルされています
                          </p>
                        </div>
                        <button
                          onClick={handleBooking}
                          disabled={
                            selectedSlot.current_participants_count >=
                            selectedSlot.capacity
                          }
                          className={`w-full py-3 rounded-md font-medium transition-colors mb-3 ${
                            selectedSlot.current_participants_count >=
                            selectedSlot.capacity
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary/90"
                          }`}
                        >
                          {selectedSlot.current_participants_count >=
                          selectedSlot.capacity
                            ? "満席です"
                            : "レッスンを再予約する"}
                        </button>
                        <button
                          onClick={handleChat}
                          className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          講師にチャットで質問する
                        </button>
                      </div>
                    ) : (
                      // キャンセル済み以外の予約状態の表示
                      <div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center mb-4 border border-blue-200">
                          <p className="font-medium mb-1 text-blue-700">
                            {bookingStatus[selectedSlot.id] === "pending"
                              ? "予約申請中"
                              : bookingStatus[selectedSlot.id] === "confirmed"
                              ? "予約確定済み"
                              : "予約完了"}
                          </p>
                          <p className="text-sm text-blue-600">
                            予約状況の確認は
                            <Link
                              to="/user/bookings"
                              className="text-primary font-medium hover:underline"
                            >
                              こちら
                            </Link>
                          </p>
                        </div>
                        <button
                          onClick={handleChat}
                          className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          講師にチャットで質問する
                        </button>
                      </div>
                    )
                  ) : (
                    // 予約ステータスがない場合は「レッスンを予約する」ボタンとチャットボタンを表示
                    <div>
                      <button
                        onClick={handleBooking}
                        disabled={
                          !selectedSlot ||
                          selectedSlot.current_participants_count >=
                            selectedSlot.capacity
                        }
                        className={`w-full py-3 rounded-md font-medium transition-colors mb-3 ${
                          !selectedSlot
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : selectedSlot.current_participants_count >=
                              selectedSlot.capacity
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {!selectedSlot
                          ? "予約枠を選択してください"
                          : selectedSlot.current_participants_count >=
                            selectedSlot.capacity
                          ? "満席です"
                          : "レッスンを予約する"}
                      </button>
                      <button
                        onClick={handleChat}
                        className="w-full py-3 rounded-md font-medium border border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        講師にチャットで質問する
                      </button>
                    </div>
                  )}

                  {selectedSlot &&
                    selectedSlot.current_participants_count >=
                      selectedSlot.capacity &&
                    !bookingStatus[selectedSlot.id] && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        この回は満席です。他の回をご検討ください。
                      </p>
                    )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserLessonDetail;