const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};import { Outlet } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
Search, 
Clock, 
Heart, 
Mail, 
Bell, 
User, 
ChevronDown,
ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Link } from 'react-router-dom';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';

const UserLayout = () => {
const [user, setUser] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [showScrollTop, setShowScrollTop] = useState(false);
const [showCategories, setShowCategories] = useState(false);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const dropdownRef = React.useRef<HTMLDivElement>(null);
const categoryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUser(profile);
    }
    
    setLoading(false);
  };

  getUserProfile();

  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 500);
  };

  window.addEventListener('scroll', handleScroll);
  
  // Close dropdowns when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setShowCategories(false);
      setSelectedCategory(null);
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);

  return () => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('mousedown', handleClickOutside);
    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current);
    }
  };
}, []);

// Handle category hover
const handleCategoryHover = (categoryId: string) => {
  if (categoryTimeoutRef.current) {
    clearTimeout(categoryTimeoutRef.current);
    categoryTimeoutRef.current = null;
  }
  setSelectedCategory(categoryId);
};

// Handle mouse leave with delay
const handleCategoryLeave = () => {
  categoryTimeoutRef.current = setTimeout(() => {
    setSelectedCategory(null);
  }, 300); // Delay to make it easier to move to subcategories
};

return (
  <div className="min-h-screen flex flex-col bg-gray-50">
    {/* Header */}
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto" style={{ maxWidth: "980px" }}>
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="ストアカ" className="h-8 w-auto" />
            </Link>
          </div>

          {/* Category Navigation and Search */}
          <div className="flex items-center relative" ref={dropdownRef}>
            {/* Search Field */}
            <div 
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md border border-gray-200 cursor-pointer w-64"
              onClick={() => setShowCategories(!showCategories)}
              onMouseEnter={() => setShowCategories(true)}
            >
              <input 
                type="text" 
                placeholder="レッスンを探す" 
                className="border-none focus:outline-none text-gray-700 w-full text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategories(true);
                }}
              />
              <Search className="h-5 w-5 ml-2 text-teal-500" />
            </div>

            {/* Category Dropdown */}
            {showCategories && (
              <div 
                className="absolute left-0 top-full bg-white shadow-lg rounded-md p-4 mt-1 w-max z-10"
                onMouseLeave={() => {
                  if (!selectedCategory) {
                    setShowCategories(false);
                  }
                }}
              >
                {selectedCategory ? (
                  // Subcategory View - Same layout as categories
                  <div>
                    <div className="flex items-center text-sm font-bold text-gray-700 mb-3">
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="mr-2 text-teal-500 flex items-center"
                      >
                        <ChevronDown className="h-4 w-4 rotate-90" />
                        <span>戻る</span>
                      </button>
                      <span>
                        {CATEGORIES.find(c => c.id === selectedCategory)?.name}のカテゴリー
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4" style={{ width: "700px" }}>
                      <div className="space-y-3">
                        {SUBCATEGORIES[selectedCategory]?.slice(0, Math.ceil(SUBCATEGORIES[selectedCategory]?.length / 2)).map(subcat => (
                          <Link 
                            key={subcat.id}
                            to={`/category/${selectedCategory}/${subcat.id}`}
                            className="flex items-center text-gray-600 hover:text-teal-500 transition-colors"
                          >
                            <span>{subcat.name}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              ({Math.floor(Math.random() * 500)})
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {SUBCATEGORIES[selectedCategory]?.slice(Math.ceil(SUBCATEGORIES[selectedCategory]?.length / 2)).map(subcat => (
                          <Link 
                            key={subcat.id}
                            to={`/category/${selectedCategory}/${subcat.id}`}
                            className="flex items-center text-gray-600 hover:text-teal-500 transition-colors"
                          >
                            <span>{subcat.name}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              ({Math.floor(Math.random() * 500)})
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Main Category View
                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-3">
                      カテゴリーから探す
                    </div>
                    <div className="grid grid-cols-2 gap-4" style={{ width: "700px" }}>
                      <div className="space-y-3">
                        {CATEGORIES.slice(0, Math.ceil(CATEGORIES.length / 2)).map(category => (
                          <div 
                            key={category.id}
                            className="relative cursor-pointer p-2 rounded-md hover:bg-gray-50"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            <div className="flex items-center text-gray-600 hover:text-teal-500 transition-colors">
                              <span className="mr-2">{category.icon}</span>
                              <span>{category.name}</span>
                              <span className="ml-2 text-gray-400 text-xs">
                                ({Math.floor(Math.random() * 5000)})
                              </span>
                              <ChevronDown className="h-4 w-4 ml-1 -rotate-90 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {CATEGORIES.slice(Math.ceil(CATEGORIES.length / 2)).map(category => (
                          <div 
                            key={category.id}
                            className="relative cursor-pointer p-2 rounded-md hover:bg-gray-50"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            <div className="flex items-center text-gray-600 hover:text-teal-500 transition-colors">
                              <span className="mr-2">{category.icon}</span>
                              <span>{category.name}</span>
                              <span className="ml-2 text-gray-400 text-xs">
                                ({Math.floor(Math.random() * 5000)})
                              </span>
                              <ChevronDown className="h-4 w-4 ml-1 -rotate-90 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* No external search button, just the search field with icon */}

          {/* Right Side Icons */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700">
              <Clock className="h-5 w-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Heart className="h-5 w-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Mail className="h-5 w-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Bell className="h-5 w-5" />
            </button>

            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : (
              <div className="relative group">
                <button className="flex items-center">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-teal-500">
                    {user?.profile_image_url ? (
                      <img 
                        src={user.profile_image_url} 
                        alt={user?.name || 'User'} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="h-full w-full bg-teal-100 flex items-center justify-center text-teal-500">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
                </button>
                
                <div className="absolute hidden group-hover:block right-0 bg-white shadow-lg rounded-md p-2 mt-1 w-48 z-10">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium">{user?.name || 'ゲスト'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <Link to="/user/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">プロフィール</Link>
                  <Link to="/user/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">予約管理</Link>
                  <Link to="/user/favorites" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">お気に入り</Link>
                  <Link to="/user/history" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">受講履歴</Link>
                  <Link to="/user/chat" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">チャット</Link>
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = '/login';
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Breadcrumb */}


    {/* Main Content */}
    <main className="flex-1">
      <div className="mx-auto" style={{ maxWidth: "980px" }}>
        <Outlet />
      </div>
    </main>

    {/* Scroll to Top Button */}
    {showScrollTop && (
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full bg-teal-500 hover:bg-teal-600"
        onClick={scrollToTop}
        aria-label="ページトップへ"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    )}
    
    {/* Footer */}
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
      <div className="mx-auto px-4" style={{ maxWidth: "980px" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">北摂でまなぼ</h3>
            <p className="text-gray-600 mb-4">
              北摂エリアの講師と生徒をつなぐオンライン学習プラットフォーム
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-500 transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">サイトマップ</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/" className="text-gray-600 hover:text-teal-500 transition-colors">ホーム</Link>
              <Link to="/user/lessons" className="text-gray-600 hover:text-teal-500 transition-colors">レッスン一覧</Link>
              <Link to="/user/bookings" className="text-gray-600 hover:text-teal-500 transition-colors">予約管理</Link>
              <Link to="/user/profile" className="text-gray-600 hover:text-teal-500 transition-colors">プロフィール</Link>
              <Link to="/user/favorites" className="text-gray-600 hover:text-teal-500 transition-colors">お気に入り</Link>
              <Link to="/user/history" className="text-gray-600 hover:text-teal-500 transition-colors">受講履歴</Link>
              <Link to="/user/chat" className="text-gray-600 hover:text-teal-500 transition-colors">チャット</Link>
              <Link to="/instructor" className="text-gray-600 hover:text-teal-500 transition-colors">講師として利用</Link>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">お問い合わせ</h3>
            <p className="text-gray-600 mb-2">
              お問い合わせはこちらからお願いします。
            </p>
            <a href="mailto:info@kitasetsu-manabu.jp" className="text-teal-500 hover:text-teal-600 transition-colors font-medium">
              info@kitasetsu-manabu.jp
            </a>
            
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">運営会社</h4>
              <p className="text-gray-600">
                株式会社北摂エデュケーション<br />
                大阪府北摂地域<br />
                〒000-0000
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-6 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} 北摂でまなぼ All rights reserved.</p>
          <div className="mt-2 text-sm space-x-4">
            <a href="#" className="text-gray-500 hover:text-teal-500">利用規約</a>
            <a href="#" className="text-gray-500 hover:text-teal-500">プライバシーポリシー</a>
            <a href="#" className="text-gray-500 hover:text-teal-500">特定商取引法に基づく表記</a>
          </div>
        </div>
      </div>
    </footer>
    
    <Toaster />
  </div>
);
};

export default UserLayout;
