import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const baseClasses = 'w-full rounded-lg border transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent';
    const stateClasses = error 
      ? 'border-[var(--error-500)] bg-[var(--error-50)]' 
      : 'border-[var(--gray-200)] bg-white hover:border-[var(--gray-300)] focus:border-[var(--primary-500)]';
    
    const paddingClasses = leftIcon && rightIcon 
      ? 'pl-10 pr-10 py-3'
      : leftIcon 
      ? 'pl-10 pr-4 py-3'
      : rightIcon 
      ? 'pl-4 pr-10 py-3'
      : 'px-4 py-3';
    
    const inputClasses = `${baseClasses} ${stateClasses} ${paddingClasses} ${className}`;
    
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[var(--gray-700)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-[var(--error-600)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
