import React from 'react';
import { Loader } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-[var(--primary-600)] text-white hover:bg-[var(--primary-700)] focus:ring-[var(--primary-500)] shadow-sm',
      secondary: 'bg-white text-[var(--gray-700)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)] focus:ring-[var(--primary-500)]',
      outline: 'border border-[var(--primary-600)] text-[var(--primary-600)] hover:bg-[var(--primary-50)] focus:ring-[var(--primary-500)]',
      ghost: 'text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)] focus:ring-[var(--gray-500)]',
      danger: 'bg-[var(--error-600)] text-white hover:bg-[var(--error-700)] focus:ring-[var(--error-500)] shadow-sm'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
