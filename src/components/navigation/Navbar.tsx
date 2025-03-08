import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Bell, Menu, User, Crown, X, LogOut, Home, Calendar, Bookmark, MessageCircle, Settings, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  isPremium?: boolean;
  icon?: React.ReactNode;
}

interface NavbarProps {
  userType: 'user' | 'instructor';
  navItems: NavItem[];
  profileHref: string;
  notificationsHref: string;
  user: any;
  isPremium?: boolean;
}

const Navbar = ({ 
  userType, 
  navItems, 
  profileHref, 
  notificationsHref,
  user,
  isPremium = false
}: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (user) {
        // 通知の未読数を取得
        const { count: notificationCount } = await supabase
          .from('notifications')
          .select('count', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_read', false);
        
        // 未読通知数を設定
        setUnreadNotifications(notificationCount || 0);
        
        // chatRoomsテーブルから自分が関わるチャットルームのみに絞り込む
        const chatRoomsFilter = userType === 'instructor' 
          ? { instructor_id: user.id }
          : { user_id: user.id };
          
        const { data: chatRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .match(chatRoomsFilter);
        
        // 自分の関わるチャットルームのIDリスト
        const chatRoomIds = chatRooms?.map(room => room.id) || [];
        
        // 実際の未読メッセージ数を取得
        let unreadMessagesCount = 0;
        if (chatRoomIds.length > 0) {
          const { count: actualChatCount } = await supabase
            .from('chat_messages')
            .select('count', { count: 'exact' })
            .eq('is_read', false)
            .neq('sender_id', user.id)
            .in('chat_room_id', chatRoomIds);
            
          unreadMessagesCount = actualChatCount || 0;
        }
        
        // 未読メッセージ数を設定
        setUnreadMessages(unreadMessagesCount);
      }
    };

    fetchUnreadCounts();
    
    // リアルタイム更新のためのサブスクリプション
    const subscription = supabase
      .channel('unread-updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages'
        }, 
        () => {
          fetchUnreadCounts();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages',
          filter: 'is_read=eq.true'
        }, 
        () => {
          fetchUnreadCounts();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications'
        }, 
        () => {
          fetchUnreadCounts();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications',
          filter: 'is_read=eq.true'
        }, 
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, userType]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'ログアウトしました',
      description: 'またのご利用をお待ちしております。',
    });
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Removed unused variables

  const getIconForNavItem = (label: string) => {
    switch(label.toLowerCase()) {
      case 'ホーム':
        return <Home className="w-5 h-5" />;
      case '予約':
      case 'レッスン':
        return <Calendar className="w-5 h-5" />;
      case 'お気に入り':
        return <Star className="w-5 h-5" />;
      case 'メッセージ':
      case 'チャット':
        return <MessageCircle className="w-5 h-5" />;
      case 'プロフィール':
      case '設定':
        return <Settings className="w-5 h-5" />;
      case 'ブックマーク':
        return <Bookmark className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <nav 
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled ? 
          "bg-white/90 backdrop-blur-md shadow-lg border-b border-primary/10" : 
          "bg-white shadow-sm"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to={`/${userType}`} className="flex items-center space-x-2 group">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors duration-300"></div>
                  <span className="relative text-xl font-bold text-primary">北</span>
                </div>
                <span className="gradient-heading text-xl tracking-tight">北摂でまなぼ</span>
              </Link>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:items-center sm:space-x-1">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.href;
                // チャットメニュー項目には未読数を表示
                const isChatItem = item.label === 'チャット' || item.label === 'メッセージ';
                
                return (
                  <Link
                    key={index}
                    to={item.href}
                    className={cn(
                      "nav-link relative overflow-hidden",
                      isActive ? "nav-link-active" : "hover:text-primary"
                    )}
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
                    )}
                    <span className="flex items-center space-x-1.5">
                      {item.icon || getIconForNavItem(item.label)}
                      {item.isPremium && (
                        <Crown className="w-4 h-4 text-yellow-500 animate-pulse" />
                      )}
                      <span>{item.label}</span>
                      {isChatItem && unreadMessages > 0 && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-3">
            <form className="relative" onSubmit={(e) => { 
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/${userType}/lessons?search=${encodeURIComponent(searchQuery)}`);
                }
              }}>
              <input
                type="text"
                placeholder="レッスンを検索..."
                className="px-4 py-2 pl-10 pr-4 rounded-full text-sm border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-[200px] bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </form>
            
            <Link
              to={notificationsHref}
              className="nav-link relative overflow-hidden flex items-center space-x-1.5"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
              <span>通知</span>
              {unreadNotifications > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-primary rounded-full shadow-sm animate-pulse">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>

            <div className="relative flex items-center">
              {isPremium && (
                <div className="flex items-center mr-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm">
                  <Crown className="h-3.5 w-3.5 mr-1 animate-pulse-soft" />
                  <span className="text-xs font-medium">プレミアム</span>
                </div>
              )}
              <Link
                to={profileHref}
                className="flex items-center space-x-2 p-1.5 rounded-full text-foreground/80 hover:text-foreground transition-colors hover:bg-accent/50"
              >
                <div className="relative w-9 h-9 overflow-hidden rounded-full ring-2 ring-primary/30 bg-muted flex items-center justify-center shadow-sm">
                  {user?.profile_image_url ? (
                    <img
                      className="h-full w-full object-cover"
                      src={user.profile_image_url}
                      alt={user?.name || 'プロフィール'}
                    />
                  ) : (
                    <User className="h-5 w-5 text-foreground/60" />
                  )}
                </div>
                <span className="text-sm font-medium max-w-[120px] truncate">
                  {user?.name || 'プロフィール'}
                </span>
              </Link>
              
              <div className="ml-2 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  rounded="full"
                  onClick={handleLogout}
                  className="text-foreground/70 hover:text-destructive hover:border-destructive/50"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center sm:hidden">
            <form 
              className="relative mr-1" 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/${userType}/lessons?search=${encodeURIComponent(searchQuery)}`);
                  setIsMenuOpen(false);
                }
              }}
            >
              <input
                type="text"
                placeholder="検索..."
                className="px-3 py-1.5 pl-8 pr-2 rounded-full text-xs border border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-[120px] bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </form>

            <Link
              to={notificationsHref}
              className="flex items-center mr-2 p-2 text-foreground/70 hover:text-primary transition-colors"
              aria-label="通知"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 h-4 w-4 text-xs font-bold text-white bg-primary rounded-full shadow-sm">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>
              <span className="ml-1 text-sm">通知</span>
            </Link>
            
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-primary hover:bg-accent/50 transition-colors"
              aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            >
              {isMenuOpen ? (
                <X className="block h-5 w-5" />
              ) : (
                <Menu className="block h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-xl fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto">
          <div className="pt-4 pb-3 space-y-1 px-2">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 py-3 px-4 rounded-xl text-base font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground hover:shadow-sm"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg",
                    isActive ? "bg-primary/20" : "bg-muted"
                  )}>
                    {item.icon || getIconForNavItem(item.label)}
                  </div>
                  <div className="flex-1 flex items-center">
                    <span>{item.label}</span>
                    {item.isPremium && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                        <Crown className="w-3 h-3 mr-0.5 text-yellow-500" />
                        プレミアム
                      </span>
                    )}
                    {(item.label === 'チャット' || item.label === 'メッセージ') && unreadMessages > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 pb-5 border-t border-border/30">
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl mx-2 p-4 mb-4 shadow-inner">
              <div className="flex items-center">
                <div className="relative flex-shrink-0 w-12 h-12 overflow-hidden rounded-xl ring-2 ring-primary/30 bg-muted flex items-center justify-center shadow-sm">
                  {user?.profile_image_url ? (
                    <img
                      className="h-full w-full object-cover"
                      src={user.profile_image_url}
                      alt={user?.name || 'ユーザー'}
                    />
                  ) : (
                    <User className="h-6 w-6 text-foreground/60" />
                  )}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="text-lg font-bold text-foreground truncate">{user?.name || 'ユーザー'}</div>
                  <div className="text-sm text-foreground/60 truncate">{user?.email || ''}</div>
                </div>
                {isPremium && (
                  <div className="ml-auto flex-shrink-0 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm">
                    <Crown className="h-5 w-5 animate-pulse-soft" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2 px-2">
              <Link
                to={profileHref}
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent/70 hover:shadow-sm transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
                  <Settings className="h-5 w-5" />
                </div>
                <span>プロフィール設定</span>
              </Link>
              
              
              <div className="px-2 pt-2">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-base font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 hover:shadow-sm transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;