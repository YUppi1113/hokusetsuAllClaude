import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navigation/Navbar';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Home, MessageCircle, BookOpen, Star, History, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

const UserLayout = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { label: 'ホーム', href: '/user', icon: <Home className="w-5 h-5" /> },
    { label: 'レッスン一覧', href: '/user/lessons', icon: <BookOpen className="w-5 h-5" /> },
    { label: '予約管理', href: '/user/bookings', icon: <Calendar className="w-5 h-5" /> },
    { label: 'チャット', href: '/user/chat', icon: <MessageCircle className="w-5 h-5" /> },
    { label: 'お気に入り', href: '/user/favorites', icon: <Star className="w-5 h-5" /> },
    { label: '受講履歴', href: '/user/history', icon: <History className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="w-16 h-16 relative">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-lg text-foreground/70 animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar 
        userType="user" 
        navItems={navItems} 
        profileHref="/user/profile"
        notificationsHref="/user/notifications"
        user={user}
      />
      
      <main className="flex-1">
        <div className="page-container pb-16">
          <Outlet />
        </div>
      </main>

      {showScrollTop && (
        <Button
          variant="default"
          size="icon"
          rounded="full"
          className="fixed bottom-6 right-6 z-50 shadow-lg"
          onClick={scrollToTop}
          aria-label="ページトップへ"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
      
      <footer className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-12 border-t border-gray-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h3 className="text-xl font-bold mb-4 gradient-heading">北摂でまなぼ</h3>
              <p className="text-gray-300 mb-4">
                北摂エリアの講師と生徒をつなぐオンライン学習プラットフォーム
              </p>
              <div className="flex space-x-4 mt-4">
                <a href="#" className="text-white hover:text-primary transition-colors" aria-label="Twitter">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-primary transition-colors" aria-label="Instagram">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-primary transition-colors" aria-label="Facebook">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">サイトマップ</h3>
              <div className="grid grid-cols-2 gap-2">
                <a href="/user" className="text-gray-300 hover:text-primary transition-colors">ホーム</a>
                <a href="/user/lessons" className="text-gray-300 hover:text-primary transition-colors">レッスン一覧</a>
                <a href="/user/bookings" className="text-gray-300 hover:text-primary transition-colors">予約管理</a>
                <a href="/user/profile" className="text-gray-300 hover:text-primary transition-colors">プロフィール</a>
                <a href="/user/favorites" className="text-gray-300 hover:text-primary transition-colors">お気に入り</a>
                <a href="/user/history" className="text-gray-300 hover:text-primary transition-colors">受講履歴</a>
                <a href="/user/chat" className="text-gray-300 hover:text-primary transition-colors">チャット</a>
                <a href="/instructor" className="text-gray-300 hover:text-primary transition-colors">講師として利用</a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">お問い合わせ</h3>
              <p className="text-gray-300 mb-2">
                お問い合わせはこちらからお願いします。
              </p>
              <a href="mailto:info@kitasetsu-manabu.jp" className="text-primary hover:text-primary/80 transition-colors font-medium">
                info@kitasetsu-manabu.jp
              </a>
              
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">運営会社</h4>
                <p className="text-gray-300">
                  株式会社北摂エデュケーション<br />
                  大阪府北摂地域<br />
                  〒000-0000
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700/50 mt-10 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} 北摂でまなぼ All rights reserved.</p>
            <div className="mt-2 text-sm space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary">利用規約</a>
              <a href="#" className="text-gray-400 hover:text-primary">プライバシーポリシー</a>
              <a href="#" className="text-gray-400 hover:text-primary">特定商取引法に基づく表記</a>
            </div>
          </div>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
};

export default UserLayout;