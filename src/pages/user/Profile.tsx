import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const UserProfile = () => {
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
    user_interests: [] as string[],
    user_goals: '',
    user_skill_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
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
        
        // Fetch user profile
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setProfile(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          username: data.username || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          phone_number: data.phone_number || '',
          user_interests: data.user_interests || [],
          user_goals: data.user_goals || '',
          user_skill_level: data.user_skill_level || 'beginner',
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

  const handleInterestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      user_interests: checked
        ? [...prev.user_interests, value]
        : prev.user_interests.filter(interest => interest !== value)
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
      
      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: formData.name,
          birth_date: formData.birth_date,
          gender: formData.gender,
          phone_number: formData.phone_number,
          user_interests: formData.user_interests,
          user_goals: formData.user_goals,
          user_skill_level: formData.user_skill_level,
          is_profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
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
      const filePath = `profile_images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_uploads')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_uploads')
        .getPublicUrl(filePath);
      
      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
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
      <h1 className="text-2xl font-bold mb-6">プロフィール設定</h1>
      
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
                        {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
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
                
                <h2 className="text-xl font-semibold">{profile?.name || 'ユーザー'}</h2>
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
                      スキルレベル
                    </label>
                    <select
                      name="user_skill_level"
                      value={formData.user_skill_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="beginner">初級者</option>
                      <option value="intermediate">中級者</option>
                      <option value="advanced">上級者</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      学習目標
                    </label>
                    <textarea
                      name="user_goals"
                      value={formData.user_goals}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="例：日常会話ができるようになりたい、資格取得を目指している、趣味を広げたい"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      興味のある分野（複数選択可）
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['音楽', '料理', '語学', 'クラフト', 'ダンス', 'テクノロジー', 'アート', 'スポーツ', 'ビジネス', '教養', 'アウトドア', 'ウェルネス'].map((interest) => (
                        <div key={interest} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`interest-${interest}`}
                            value={interest}
                            checked={formData.user_interests.includes(interest)}
                            onChange={handleInterestChange}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor={`interest-${interest}`} className="ml-2 text-sm text-gray-700">
                            {interest}
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

export default UserProfile;