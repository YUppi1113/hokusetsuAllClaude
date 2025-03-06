import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-card transition-all duration-300 hover:shadow-card-hover",
      className
    )}
    {...props}
  />
))
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
    date?: string;
    capacity?: number;
    currentParticipants?: number;
    location?: string;
    category?: string;
    isFeatured?: boolean;
    isLiked?: boolean;
    onLikeClick?: () => void;
  }
>(({ 
    className, 
    imageUrl = 'https://placehold.jp/FF7F50/ffffff/400x250.png?text=レッスン画像',
    title,
    subtitle,
    price,
    instructorName,
    instructorImageUrl,
    date,
    capacity,
    currentParticipants,
    location,
    category,
    isFeatured = false,
    isLiked = false,
    onLikeClick,
    ...props 
  }, ref) => (
  <div
    ref={ref}
    className={cn(
      "group relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground card-hover",
      isFeatured && "ring-2 ring-yellow-400 shadow-lg",
      className
    )}
    {...props}
  >
    {isFeatured && (
      <div className="absolute top-3 left-0 z-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-r-md shadow-md">
        オススメ
      </div>
    )}
    
    <div className="relative">
      <div className="overflow-hidden aspect-video w-full">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      
      {category && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
          {typeof category === 'string' ? category : category.name || category}
        </div>
      )}
      
      <button 
        onClick={onLikeClick}
        className={cn(
          "absolute bottom-3 right-3 p-2 rounded-full transition-colors",
          isLiked ? "bg-primary text-white" : "bg-white/80 text-gray-600 hover:bg-white"
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </button>
    </div>
    
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        {date && (
          <div className="text-xs text-foreground/70 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
            {date}
          </div>
        )}
        
        {location && (
          <div className="text-xs text-foreground/70 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </div>
        )}
      </div>
      
      <h3 className="font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
      
      {subtitle && (
        <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{subtitle}</p>
      )}
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
            {instructorImageUrl ? (
              <img src={instructorImageUrl} alt={instructorName} className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 absolute inset-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium">{instructorName}</span>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-foreground/70">受講料</div>
          <div className="font-bold text-primary">
            {typeof price === 'number' ? `¥${price.toLocaleString()}` : price}
          </div>
        </div>
      </div>
      
      {capacity !== undefined && currentParticipants !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-foreground/70 mb-1">
            <span>定員 {capacity}名</span>
            <span>{currentParticipants}名参加中</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, (currentParticipants / capacity) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  </div>
))
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