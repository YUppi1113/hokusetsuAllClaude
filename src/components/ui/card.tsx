import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "gradient" | "outline" | "subtle"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "rounded-lg border border-border bg-card text-card-foreground shadow-card transition-all duration-300 hover:shadow-card-hover",
    glass: "rounded-lg border border-white/20 bg-white/80 backdrop-blur-sm text-card-foreground shadow-lg transition-all duration-300 hover:shadow-xl",
    gradient: "rounded-lg border-0 bg-gradient-to-br from-primary/10 to-secondary/10 text-card-foreground shadow-card transition-all duration-300 hover:shadow-card-hover",
    outline: "rounded-lg border-2 border-primary/20 bg-transparent text-card-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-card-hover",
    subtle: "rounded-lg border border-border/50 bg-card/50 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-card",
  };

  return (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// 新しいレッスンカードコンポーネント
const LessonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    imageUrl?: string;
    title: string;
    subtitle?: string;
    price: number | string;
    instructorName: string;
    instructorImageUrl?: string;
    instructorSpecialties?: string[];
    instructorVerified?: boolean;
    instructorRating?: number;
    date?: string;
    capacity?: number;
    currentParticipants?: number;
    location?: string;
    category?: string;
    lessonType?: 'monthly' | 'one_time' | 'course';
    isFeatured?: boolean;
    isLiked?: boolean;
    onLikeClick?: (e: React.MouseEvent) => void;
    variant?: "default" | "glass" | "gradient" | "outline" | "subtle";
  }
>(({ 
    className, 
    imageUrl = 'https://placehold.jp/FF7F50/ffffff/400x250.png?text=レッスン画像',
    title,
    subtitle,
    price,
    instructorName,
    instructorImageUrl,
    instructorSpecialties,
    instructorVerified = false,
    instructorRating,
    date,
    capacity,
    currentParticipants,
    location,
    category,
    lessonType = 'one_time',
    isFeatured = false,
    isLiked = false,
    onLikeClick,
    variant = "default",
    ...props 
  }, ref) => {
  
  const variantStyles = {
    default: "bg-card",
    glass: "bg-white/80 backdrop-blur-sm border-white/20",
    gradient: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800",
    outline: "bg-transparent border-2 border-primary/30",
    subtle: "bg-card/50 border-border/50",
  };

  const lessonTypeLabels = {
    monthly: "月額制",
    one_time: "単発講座",
    course: "コース講座"
  };

  const lessonTypeColors = {
    monthly: "bg-blue-100 text-blue-800",
    one_time: "bg-purple-100 text-purple-800",
    course: "bg-green-100 text-green-800"
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-card transition-all duration-300 hover:shadow-card-hover text-card-foreground card-hover",
        variantStyles[variant],
        isFeatured && "ring-2 ring-yellow-400/80 shadow-lg",
        className
      )}
      {...props}
    >
      {isFeatured && (
        <div className="absolute top-3 left-0 z-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-r-md shadow-md">
          おすすめ
        </div>
      )}
      
      <div className="relative">
        <div className="overflow-hidden aspect-video w-full">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="absolute top-3 right-3 flex space-x-2">
          {lessonType && (
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium shadow-sm",
              lessonTypeColors[lessonType]
            )}>
              {lessonTypeLabels[lessonType]}
            </div>
          )}
          
          {category && (
            <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
              {typeof category === 'string' ? category : (category as any)?.name || category}
            </div>
          )}
        </div>
        
        <button 
          onClick={onLikeClick}
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 shadow-sm",
            isLiked 
              ? "bg-primary text-white scale-110" 
              : "bg-white/80 text-gray-600 hover:bg-white hover:scale-105"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
      </div>
      
      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {date && (
            <div className="badge-outline flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              {date}
            </div>
          )}
          
          {location && (
            <div className="badge-outline flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </div>
          )}
        </div>
        
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        
        {subtitle && (
          <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{subtitle}</p>
        )}
        
        <div className="divider my-3 opacity-30"></div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/30 bg-muted">
              {instructorImageUrl ? (
                <img src={instructorImageUrl} alt={instructorName} className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground absolute inset-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              {instructorVerified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-sm font-medium">{instructorName}</span>
                {instructorRating !== undefined && (
                  <div className="flex items-center ml-2 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-500 mr-0.5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <span>{instructorRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {instructorSpecialties && instructorSpecialties.length > 0 && (
                <div className="text-xs text-gray-500 mt-0.5 truncate w-24">{instructorSpecialties[0]}{instructorSpecialties.length > 1 ? "..." : ""}</div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-foreground/70">
              {lessonType === 'monthly' ? '月額' : 
               lessonType === 'course' ? 'コース料金' : '受講料'}
            </div>
            <div className="font-bold text-primary">
              {typeof price === 'number' ? `¥${price}` : price}
              {lessonType === 'monthly' && '/月'}
            </div>
          </div>
        </div>
        
        {lessonType !== 'monthly' && capacity !== undefined && currentParticipants !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-foreground/70 mb-1.5">
              <span>定員 {capacity}名</span>
              <span>{currentParticipants}名参加中</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full ${
                  currentParticipants / capacity > 0.8 
                    ? 'bg-yellow-500' 
                    : currentParticipants / capacity > 0.5 
                      ? 'bg-primary' 
                      : 'bg-secondary'
                }`}
                style={{ width: `${Math.min(100, (currentParticipants / capacity) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
LessonCard.displayName = "LessonCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  LessonCard 
}