-- =====================================================================
-- EXTENSION & CLEANUP
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS premium_subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS instructor_profiles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
# profiles table is no longer used


-- =====================================================================
-- CREATE TABLES
-- =====================================================================

-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name VARCHAR,
  email VARCHAR NOT NULL,
  username VARCHAR,
  profile_image_url VARCHAR,
  birth_date DATE,
  gender VARCHAR,
  phone_number VARCHAR,
  bio TEXT,
  user_interests TEXT[],
  user_goals TEXT,
  user_skill_level VARCHAR CHECK (user_skill_level IN ('beginner', 'intermediate', 'advanced')),
  is_profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Instructor profiles
CREATE TABLE instructor_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name VARCHAR,
  email VARCHAR NOT NULL,
  username VARCHAR,
  profile_image_url VARCHAR,
  birth_date DATE,
  gender VARCHAR,
  phone_number VARCHAR,
  bio TEXT,
  instructor_specialties TEXT[],
  instructor_bio TEXT,
  instructor_experience TEXT,
  instructor_education TEXT,
  instructor_certifications TEXT,
  instructor_availability TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  average_rating NUMERIC(3,2) DEFAULT 0 CHECK (average_rating BETWEEN 0 AND 5),
  is_profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lessons
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(id),
  lesson_title VARCHAR NOT NULL,
  lesson_description TEXT,
  lesson_catchphrase VARCHAR(50),
  category VARCHAR NOT NULL,
  sub_category VARCHAR,
  difficulty_level VARCHAR CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'all')),
  price INTEGER NOT NULL CHECK (price >= 0),
  duration INTEGER CHECK (duration > 0),
  capacity INTEGER CHECK (capacity > 0),
  location_name VARCHAR NOT NULL,
  location_type VARCHAR CHECK (location_type IN ('online', 'in_person')),
  classroom_area VARCHAR,
  lesson_type VARCHAR CHECK (lesson_type IN ('monthly', 'one_time', 'course')),
  is_free_trial BOOLEAN DEFAULT FALSE,
  lesson_image_url TEXT[],
  status VARCHAR CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  is_featured BOOLEAN DEFAULT FALSE,
  materials_needed TEXT,
  lesson_goals TEXT,
  lesson_outline TEXT,
  target_audience TEXT[],  -- "こんな方を対象としています" (target audience)
  monthly_plans JSONB,
  course_sessions INTEGER,
  venue_details TEXT,
  notes TEXT,
  discount_percentage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lesson Slots (予約枠)
CREATE TABLE lesson_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  date_time_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_time_end TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_deadline TIMESTAMP WITH TIME ZONE,
  capacity INTEGER CHECK (capacity > 0),
  current_participants_count INTEGER DEFAULT 0,
  price INTEGER CHECK (price >= 0),
  discount_percentage INTEGER,
  venue_details TEXT,
  notes TEXT,
  status VARCHAR CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES lesson_slots(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status VARCHAR DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat rooms for messaging between users and instructors
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id),
  sender_id UUID NOT NULL, -- Can be either user or instructor
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- This can reference either user_profiles or instructor_profiles
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Premium Subscriptions for instructors
CREATE TABLE premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR CHECK (status IN ('active', 'canceled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
-- Profiles table no longer exists
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Bookings RLS Policies
-- ---------------------------------------------------------------------
-- ユーザーは自分の予約を閲覧・編集可能
CREATE POLICY "bookings_user_crud" ON bookings 
FOR ALL USING (auth.uid() = user_id);

-- ユーザーは新しい予約を作成可能
CREATE POLICY "bookings_user_insert" ON bookings 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 講師はレッスンの予約を閲覧可能
CREATE POLICY "bookings_instructor_view" ON bookings 
FOR SELECT USING (
  auth.uid() IN (
    SELECT instructor_id FROM lessons WHERE id = lesson_id
  )
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Chat Rooms RLS Policies
-- ---------------------------------------------------------------------
-- ユーザーは自分のチャットルームを閲覧・編集可能
CREATE POLICY "chat_rooms_user_crud" ON chat_rooms 
FOR ALL USING (auth.uid() = user_id);

-- ユーザーは新しいチャットルームを作成可能
CREATE POLICY "chat_rooms_user_insert" ON chat_rooms 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 講師は自分のチャットルームを閲覧・編集可能
CREATE POLICY "chat_rooms_instructor_crud" ON chat_rooms 
FOR ALL USING (auth.uid() = instructor_id);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Chat Messages RLS Policies
-- ---------------------------------------------------------------------
-- ユーザーは自分のチャットルームのメッセージを閲覧可能
CREATE POLICY "chat_messages_user_select" ON chat_messages 
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM chat_rooms WHERE id = chat_room_id
  )
);

-- ユーザーは新しいメッセージを送信可能
CREATE POLICY "chat_messages_user_insert" ON chat_messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT user_id FROM chat_rooms WHERE id = chat_room_id
  )
);

-- 講師は自分のチャットルームのメッセージを閲覧可能
CREATE POLICY "chat_messages_instructor_select" ON chat_messages 
FOR SELECT USING (
  auth.uid() IN (
    SELECT instructor_id FROM chat_rooms WHERE id = chat_room_id
  )
);

-- 講師は新しいメッセージを送信可能
CREATE POLICY "chat_messages_instructor_insert" ON chat_messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT instructor_id FROM chat_rooms WHERE id = chat_room_id
  )
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;


-- Profiles policies now moved to user_profiles and instructor_profiles


-- ---------------------------------------------------------------------
-- Lessons RLS Policies
-- ---------------------------------------------------------------------
-- 誰でも公開レッスンを閲覧可能
CREATE POLICY "lessons_public_view" ON lessons 
FOR SELECT USING (status = 'published');

-- 講師は自分のレッスンを管理可能
CREATE POLICY "lessons_instructor_crud" ON lessons 
FOR ALL USING (auth.uid() = instructor_id);

-- ---------------------------------------------------------------------
-- Lesson Slots RLS Policies
-- ---------------------------------------------------------------------
-- 誰でも公開レッスンのスロットを閲覧可能
CREATE POLICY "lesson_slots_public_view" ON lesson_slots 
FOR SELECT USING (
  status = 'published' AND
  EXISTS (
    SELECT 1 FROM lessons WHERE id = lesson_id AND status = 'published'
  )
);

-- 講師は自分のレッスンに紐づくスロットを管理可能
CREATE POLICY "lesson_slots_instructor_crud" ON lesson_slots 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lessons WHERE id = lesson_id AND instructor_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------
-- User Profiles Policies
-- ---------------------------------------------------------------------
-- ユーザーは自分のプロファイルだけを管理可能
CREATE POLICY "user_profiles_self_crud" ON user_profiles 
FOR ALL USING (auth.uid() = id);

-- 誰でも公開ユーザープロファイルを閲覧可能
CREATE POLICY "user_profiles_public_view" ON user_profiles 
FOR SELECT USING (true);

-- 新規登録用のポリシー
CREATE POLICY "user_profiles_insert_for_new_users" ON user_profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- Instructor Profiles Policies
-- ---------------------------------------------------------------------
-- 講師は自分のプロファイルだけを管理可能
CREATE POLICY "instructor_profiles_self_crud" ON instructor_profiles 
FOR ALL USING (auth.uid() = id);

-- 誰でも公開講師プロファイルを閲覧可能
CREATE POLICY "instructor_profiles_public_view" ON instructor_profiles 
FOR SELECT USING (true);

-- 新規登録用のポリシー
CREATE POLICY "instructor_profiles_insert_for_new_users" ON instructor_profiles 
FOR INSERT WITH CHECK (auth.uid() = id);


-- =====================================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Update slot participants count on booking status changes
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_slot_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is inserted and its status = 'confirmed'
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE lesson_slots
      SET current_participants_count = current_participants_count + 1
      WHERE id = NEW.slot_id;

  -- When a booking updates from not-confirmed to confirmed
  ELSIF TG_OP = 'UPDATE' 
        AND OLD.status != 'confirmed'
        AND NEW.status = 'confirmed' THEN
    UPDATE lesson_slots
      SET current_participants_count = current_participants_count + 1
      WHERE id = NEW.slot_id;

  -- When a booking updates from confirmed to something else
  ELSIF TG_OP = 'UPDATE' 
        AND OLD.status = 'confirmed' 
        AND NEW.status != 'confirmed' THEN
    UPDATE lesson_slots
      SET current_participants_count = current_participants_count - 1
      WHERE id = NEW.slot_id;

  -- When a confirmed booking is deleted
  ELSIF TG_OP = 'DELETE'
        AND OLD.status = 'confirmed' THEN
    UPDATE lesson_slots
      SET current_participants_count = current_participants_count - 1
      WHERE id = OLD.slot_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slot_participants_count
AFTER INSERT OR UPDATE OR DELETE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_slot_participants_count();


-- ---------------------------------------------------------------------
-- 2) Create notifications automatically
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- New booking notification for instructor
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'bookings' THEN
    INSERT INTO notifications (user_id, title, message, is_read)
    SELECT lessons.instructor_id,
           '新しい予約',
           user_profiles.name || 'さんがレッスン「' || lessons.lesson_title || '」を予約しました',
           FALSE
    FROM lessons, user_profiles, lesson_slots
    WHERE lessons.id = NEW.lesson_id
      AND lesson_slots.id = NEW.slot_id
      AND lesson_slots.lesson_id = lessons.id
      AND user_profiles.id = NEW.user_id;

  -- Booking status change notification for user - make sure we're only checking bookings table
  ELSIF TG_OP = 'UPDATE' 
        AND TG_TABLE_NAME = 'bookings' THEN
    -- Only proceed if the status has changed
    IF OLD.status != NEW.status THEN
      INSERT INTO notifications (user_id, title, message, is_read)
      SELECT bookings.user_id,
             '予約状況の更新',
             'レッスン「' || lessons.lesson_title || '」の予約状況が' ||
             CASE 
               WHEN NEW.status = 'confirmed' THEN '確定'
               WHEN NEW.status = 'canceled' THEN 'キャンセル'
               WHEN NEW.status = 'completed' THEN '完了'
               ELSE NEW.status
             END || 'に更新されました',
             FALSE
      FROM lessons, bookings
      WHERE lessons.id = NEW.lesson_id
        AND bookings.id = NEW.id;
    END IF;

  -- メッセージ通知は不要なので無効化
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'chat_messages' THEN
    -- 新しいメッセージの通知は送らない
    NULL;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic notifications
CREATE TRIGGER trigger_booking_notification
AFTER INSERT OR UPDATE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_notification();

-- メッセージ通知は不要なのでトリガーを無効化
-- CREATE TRIGGER trigger_chat_notification
-- AFTER INSERT
-- ON chat_messages
-- FOR EACH ROW
-- EXECUTE FUNCTION create_notification();


-- ---------------------------------------------------------------------
-- 3) Automatically update lesson status based on date
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_lesson_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lessons
    SET status = 'completed'
    WHERE date_time_end < NOW()
      AND status = 'published';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Example usage: you could schedule a cron job in Postgres to call this function periodically.
-- (This script only provides the function, not the scheduling.)


-- ---------------------------------------------------------------------
-- 4) Handle premium subscription expiration
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_premium_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expired status for ended subscriptions
  UPDATE premium_subscriptions
    SET status = 'expired'
    WHERE end_date < NOW()
      AND status = 'active';

  -- Remove featured status from lessons of newly expired subscriptions
  UPDATE lessons
    SET is_featured = FALSE
    WHERE instructor_id IN (
      SELECT instructor_id
      FROM premium_subscriptions
      WHERE status = 'expired'
        AND updated_at > NOW() - INTERVAL '1 day'
    )
      AND is_featured = TRUE;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Example usage: you could schedule a cron job in Postgres to call this function periodically.


-- =====================================================================
-- データ変換スクリプト
-- =====================================================================

-- 'offline'を'in_person'に変更
UPDATE lessons
SET location_type = 'in_person'
WHERE location_type = 'offline';

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================