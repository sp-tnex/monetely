import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'h-4 w-3/4 rounded-sm',
        className
      )}
      {...props}
    />
  );
};
