import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }, ref) => {
    const baseClasses = 'bg-white rounded-xl overflow-hidden';
    
    const variantClasses = {
      default: 'shadow-[var(--shadow-sm)] border border-[var(--gray-100)]',
      elevated: 'shadow-[var(--shadow-lg)]',
      outlined: 'border border-[var(--gray-200)]',
      interactive: 'shadow-[var(--shadow-sm)] border border-[var(--gray-100)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-normal)]'
    };
    
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;
    
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
