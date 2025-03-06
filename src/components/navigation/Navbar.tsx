import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Bell, Menu, User, Crown, X, LogOut, Home, Calendar, Bookmark, MessageCircle, Settings, Star } from 'lucide-react';
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
  const [isScrolled, setIsScrolled] = useState(false);
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
    const fetchUnreadNotifications = async () => {
      if (user) {
        const { count } = await supabase
          .from('notifications')
          .select('count', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_read', false);
          
        if (count !== null) {
          setUnreadNotifications(count);
        }
      }
    };

    fetchUnreadNotifications();
  }, [user]);

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

  const otherUserType = userType === 'user' ? 'instructor' : 'user';
  const otherUserTypeLabel = userType === 'user' ? '講師' : '生徒';

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
          "bg-white/90 backdrop-blur-md shadow-md" : 
          "bg-white shadow-sm"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to={`/${userType}`} className="flex items-center space-x-2">
                <span className="gradient-heading font-bold text-xl tracking-tight">北摂でまなぼ</span>
              </Link>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:items-center sm:space-x-1">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  className={cn(
                    "nav-link",
                    location.pathname === item.href && "nav-link-active"
                  )}
                >
                  <span className="flex items-center space-x-1.5">
                    {item.icon || getIconForNavItem(item.label)}
                    {item.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-3">
            <Link
              to={notificationsHref}
              className="relative p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white transform translate-x-1/2 -translate-y-1/2 bg-primary rounded-full">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>

            <div className="relative flex items-center">
              {isPremium && (
                <div className="flex items-center mr-3 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 text-white shadow-sm">
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">プレミアム</span>
                </div>
              )}
              <Link
                to={profileHref}
                className="flex items-center space-x-2 p-1.5 rounded-full text-foreground/80 hover:text-foreground transition-colors"
              >
                <div className="relative w-8 h-8 overflow-hidden rounded-full ring-2 ring-primary/20 bg-muted flex items-center justify-center">
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
              
              <div className="ml-2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  rounded="full"
                  asChild
                  className="text-sm text-foreground/70 hover:text-foreground"
                >
                  <Link to={`/${otherUserType}`}>
                    {otherUserTypeLabel}切替
                  </Link>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon-sm"
                  rounded="full"
                  onClick={handleLogout}
                  className="text-foreground/70 hover:text-foreground"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center sm:hidden">
            <Link
              to={notificationsHref}
              className="relative p-2 text-foreground/70 mr-1"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white transform translate-x-1/2 -translate-y-1/2 bg-primary rounded-full">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
            
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors"
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
        <div className="sm:hidden bg-background border-t border-border/50 shadow-lg">
          <div className="pt-2 pb-3 space-y-0.5 px-1">
            {navItems.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "block py-2 px-3 rounded-md text-base font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0">
                    {item.icon || getIconForNavItem(item.label)}
                  </span>
                  <span>{item.label}</span>
                  {item.isPremium && (
                    <span className="ml-auto">
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          
          <div className="pt-4 pb-5 border-t border-border">
            <div className="flex items-center px-4 mb-3">
              <div className="relative flex-shrink-0 w-10 h-10 overflow-hidden rounded-full ring-2 ring-primary/20 bg-muted flex items-center justify-center">
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
              <div className="ml-3 flex-1 min-w-0">
                <div className="text-base font-medium text-foreground truncate">{user?.name || 'ユーザー'}</div>
                <div className="text-sm text-foreground/60 truncate">{user?.email || ''}</div>
              </div>
              {isPremium && (
                <div className="ml-auto flex-shrink-0 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 text-white shadow-sm">
                  <Crown className="h-4 w-4" />
                </div>
              )}
            </div>
            
            <div className="space-y-1 px-2">
              <Link
                to={profileHref}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="h-5 w-5" />
                <span>プロフィール</span>
              </Link>
              
              <Link
                to={`/${otherUserType}`}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                  <path d="M7 11V7a4 4 0 0 1 4-4h10"></path>
                  <path d="m21 11-7-7"></path>
                  <path d="M3 13v1a4 4 0 0 0 4 4h14"></path>
                  <path d="M7 13v4a4 4 0 0 0 4 4h10"></path>
                  <path d="m21 13-7 7"></path>
                </svg>
                <span>{otherUserTypeLabel}として利用</span>
              </Link>
              
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-accent text-left"
              >
                <LogOut className="h-5 w-5" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;