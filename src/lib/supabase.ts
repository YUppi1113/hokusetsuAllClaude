import { createClient } from '@supabase/supabase-js';

// @ts-expect-error - Vite adds env property to import.meta
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-expect-error - Vite adds env property to import.meta
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  user_profiles: {
    id: string;
    name: string;
    email: string;
    username: string;
    birth_date: string;
    gender: string;
    phone_number: string;
    profile_image_url: string;
    user_interests: string[];
    user_goals: string;
    user_skill_level: 'beginner' | 'intermediate' | 'advanced';
    is_profile_completed: boolean;
    created_at: string;
    updated_at: string;
  };
  
  instructor_profiles: {
    id: string;
    name: string;
    email: string;
    username: string;
    birth_date: string;
    gender: string;
    phone_number: string;
    profile_image_url: string;
    instructor_specialties: string[];
    instructor_bio: string;
    instructor_experience: string;
    instructor_education: string;
    instructor_certifications: string;
    instructor_availability: string;
    category: string;
    subcategories: string[];
    instructor_pr_message: string;
    introduction: string;
    business_name: string;
    business_address: string;
    facebook_url: string;
    twitter_url: string;
    instagram_url: string;
    website_url: string;
    is_profile_completed: boolean;
    created_at: string;
    updated_at: string;
  };
  lessons: {
    id: string;
    instructor_id: string;
    lesson_title: string;
    category: string;
    sub_category: string;
    lesson_description: string;
    difficulty_level: string;
    price: number;
    duration: number;
    location_type: 'online' | 'in_person' | 'hybrid' | 'offline';
    location_name: string;
    capacity: number;
    current_participants_count: number;
    booking_deadline: string;
    date_time_start: string;
    date_time_end: string;
    lesson_image_url: string[];
    materials_needed: string;
    lesson_goals: string;
    lesson_outline: string;
    is_featured: boolean;
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    created_at: string;
    updated_at: string;
  };
  bookings: {
    id: string;
    lesson_id: string;
    user_id: string;
    booking_date: string;
    status: 'pending' | 'confirmed' | 'canceled' | 'completed';
    payment_status: 'pending' | 'paid' | 'refunded';
    payment_method: 'credit_card' | 'cash';
    created_at: string;
    updated_at: string;
  };
  chat_rooms: {
    id: string;
    lesson_id: string;
    instructor_id: string;
    user_id: string;
    created_at: string;
  };
  chat_messages: {
    id: string;
    chat_room_id: string;
    sender_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
  };
  reviews: {
    id: string;
    lesson_id: string;
    user_id: string;
    instructor_id: string;
    rating: number;
    comment: string;
    created_at: string;
    updated_at: string;
  };
  favorites: {
    id: string;
    user_id: string;
    lesson_id: string;
    created_at: string;
  };
  notifications: {
    id: string;
    user_id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  };
  premium_subscriptions: {
    id: string;
    instructor_id: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'canceled' | 'expired';
    created_at: string;
    updated_at: string;
  };
};