import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  align?: 'left' | 'center' | 'right';
  withLine?: boolean;
  isGradient?: boolean;
}

export function SectionHeading({
  title,
  description,
  icon,
  className,
  titleClassName,
  descriptionClassName,
  align = 'left',
  withLine = true,
  isGradient = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-8',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      <div className={cn(
        'flex items-center gap-3 mb-2',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end'
      )}>
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className={cn(
          'text-2xl font-bold tracking-tight',
          isGradient && 'gradient-heading',
          titleClassName
        )}>
          {title}
        </h2>
      </div>
      
      {description && (
        <p className={cn(
          'text-muted-foreground mt-1 max-w-3xl',
          align === 'center' && 'mx-auto',
          align === 'right' && 'ml-auto',
          descriptionClassName
        )}>
          {description}
        </p>
      )}
      
      {withLine && (
        <div className={cn(
          'mt-4 relative',
          align === 'center' && 'flex justify-center',
          align === 'right' && 'flex justify-end',
        )}>
          <div className={cn(
            isGradient 
              ? 'h-1 bg-gradient-to-r from-primary to-secondary rounded-full'
              : 'h-1 bg-primary rounded-full',
            align === 'left' ? 'w-16' : 'w-16'
          )}></div>
        </div>
      )}
    </div>
  );
}

export function PageTitle({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-8', className)}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b',
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="mt-4 md:mt-0 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}