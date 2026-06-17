import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          // Variants
          variant === 'primary' && 'bg-primary text-primary-foreground border border-transparent hover:bg-opacity-95',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary/80',
          variant === 'outline' && 'border border-border bg-white hover:bg-secondary/40 text-foreground',
          variant === 'ghost' && 'bg-transparent hover:bg-secondary/40 text-foreground',
          variant === 'danger' && 'bg-destructive text-destructive-foreground border border-transparent hover:bg-opacity-95',
          // Sizes
          size === 'sm' && 'px-2.5 py-1.5 text-xs',
          size === 'md' && 'px-3.5 py-2 text-sm',
          size === 'lg' && 'px-4.5 py-2.5 text-base',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
