import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', children, className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full';
    
    const variantClasses = {
      default: 'bg-[var(--gray-100)] text-[var(--gray-800)]',
      success: 'bg-[var(--success-50)] text-[var(--success-700)]',
      warning: 'bg-[var(--warning-50)] text-[var(--warning-700)]',
      error: 'bg-[var(--error-50)] text-[var(--error-700)]',
      info: 'bg-[var(--primary-50)] text-[var(--primary-700)]'
    };
    
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm'
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
