import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const InstructorProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    birth_date: '',
    gender: '',
    phone_number: '',
    instructor_specialties: [] as string[],
    instructor_bio: '',
    instructor_experience: '',
    instructor_education: '',
    instructor_certifications: '',
    instructor_availability: '',
    profile_image_url: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch instructor profile
        const { data: instructorProfile, error: instructorProfileError } = await supabase
          .from('instructor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (instructorProfileError && instructorProfileError.code !== 'PGRST116') {
          // PGRST116 is "not found" - we handle this case by creating a new profile
          throw instructorProfileError;
        }
        
        const data = instructorProfile || {};
        
        setProfile(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          username: data.username || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          phone_number: data.phone_number || '',
          instructor_specialties: data.instructor_specialties || [],
          instructor_bio: data.instructor_bio || '',
          instructor_experience: data.instructor_experience || '',
          instructor_education: data.instructor_education || '',
          instructor_certifications: data.instructor_certifications || '',
          instructor_availability: data.instructor_availability || '',
          profile_image_url: data.profile_image_url || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecialtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      instructor_specialties: checked
        ? [...prev.instructor_specialties, value]
        : prev.instructor_specialties.filter(specialty => specialty !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // No need to update base profile anymore
      
      // Check if instructor profile exists
      const { data: instructorProfileExists, error: checkError } = await supabase
        .from('instructor_profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      let error;
      
      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, insert
        const { error: insertError } = await supabase
          .from('instructor_profiles')
          .insert({
            id: user.id,
            name: formData.name,
            email: formData.email || user.email,
            username: formData.username,
            birth_date: formData.birth_date,
            gender: formData.gender,
            phone_number: formData.phone_number,
            instructor_specialties: formData.instructor_specialties,
            instructor_bio: formData.instructor_bio,
            instructor_experience: formData.instructor_experience,
            instructor_education: formData.instructor_education,
            instructor_certifications: formData.instructor_certifications,
            instructor_availability: formData.instructor_availability,
            profile_image_url: formData.profile_image_url,
            is_profile_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        error = insertError;
      } else {
        // Profile exists, update
        const { error: updateError } = await supabase
          .from('instructor_profiles')
          .update({
            name: formData.name,
            email: formData.email || user.email,
            username: formData.username,
            birth_date: formData.birth_date,
            gender: formData.gender,
            phone_number: formData.phone_number,
            instructor_specialties: formData.instructor_specialties,
            instructor_bio: formData.instructor_bio,
            instructor_experience: formData.instructor_experience,
            instructor_education: formData.instructor_education,
            instructor_certifications: formData.instructor_certifications,
            instructor_availability: formData.instructor_availability,
            is_profile_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        error = updateError;
      }
        
      if (error) throw error;
      
      setSuccessMessage('プロフィールが更新されました');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setErrorMessage(error.message || 'プロフィールの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setUpdating(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // Upload image
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `instructor_profile_images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);
      
      // Check if instructor profile exists
      const { data: instructorProfileExists, error: checkError } = await supabase
        .from('instructor_profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      let error;
      
      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, insert
        const { error: insertError } = await supabase
          .from('instructor_profiles')
          .insert({
            id: user.id,
            name: profile?.name || '',
            email: profile?.email || user.email,
            profile_image_url: publicUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        error = insertError;
      } else {
        // Profile exists, update
        const { error: updateError } = await supabase
          .from('instructor_profiles')
          .update({
            profile_image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        error = updateError;
      }
      
      if (error) throw error;
      
      // Update form data
      setFormData(prev => ({ ...prev, profile_image_url: publicUrl }));
      setSuccessMessage('プロフィール画像がアップロードされました');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setErrorMessage(error.message || '画像アップロードに失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
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
      <h1 className="text-2xl font-bold mb-6">講師プロフィール設定</h1>
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {errorMessage}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:gap-12">
            <div className="md:w-1/3 mb-8 md:mb-0">
              <div className="text-center">
                <div className="mb-4 relative w-32 h-32 mx-auto">
                  {formData.profile_image_url ? (
                    <img
                      src={formData.profile_image_url}
                      alt="プロフィール画像"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-5xl">
                        {formData.name ? formData.name.charAt(0).toUpperCase() : 'I'}
                      </span>
                    </div>
                  )}
                  
                  <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      id="profile-image"
                      className="hidden"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      disabled={updating}
                    />
                  </label>
                </div>
                
                <h2 className="text-xl font-semibold">{profile?.name || '講師'}</h2>
                <p className="text-gray-500">{profile?.email}</p>
                
                <button
                  onClick={handleLogout}
                  className="mt-6 text-red-600 hover:text-red-800 text-sm hover:underline"
                  type="button"
                >
                  ログアウト
                </button>
              </div>
            </div>
            
            <div className="md:w-2/3">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      お名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      className="w-full px-3 py-2 border rounded-md bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      メールアドレスの変更はできません
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号
                    </label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      生年月日
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      性別
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">選択してください</option>
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                      <option value="prefer_not_to_say">回答しない</option>
                    </select>
                  </div>
                  
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      自己紹介 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="instructor_bio"
                      value={formData.instructor_bio}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="生徒に伝わる自己紹介文を書いてください"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      経験
                    </label>
                    <textarea
                      name="instructor_experience"
                      value={formData.instructor_experience}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="関連する指導経験・実務経験があれば記入してください"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      学歴・経歴
                    </label>
                    <textarea
                      name="instructor_education"
                      value={formData.instructor_education}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="最終学歴や関連する教育背景を記入してください"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      資格・認定
                    </label>
                    <textarea
                      name="instructor_certifications"
                      value={formData.instructor_certifications}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="取得している資格や認定があれば記入してください"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      利用可能時間
                    </label>
                    <textarea
                      name="instructor_availability"
                      value={formData.instructor_availability}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="例：平日18時以降、土日終日など"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      専門分野（複数選択可） <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['音楽', '料理', '語学', 'クラフト', 'ダンス', 'テクノロジー', 'アート', 'スポーツ', 'ビジネス', '教養', 'アウトドア', 'ウェルネス'].map((specialty) => (
                        <div key={specialty} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`specialty-${specialty}`}
                            value={specialty}
                            checked={formData.instructor_specialties.includes(specialty)}
                            onChange={handleSpecialtyChange}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor={`specialty-${specialty}`} className="ml-2 text-sm text-gray-700">
                            {specialty}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <button
                    type="submit"
                    disabled={updating}
                    className={`w-full md:w-auto px-6 py-3 bg-primary text-white rounded-md font-medium ${
                      updating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                    } transition-colors`}
                  >
                    {updating ? '更新中...' : 'プロフィールを更新する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorProfile;