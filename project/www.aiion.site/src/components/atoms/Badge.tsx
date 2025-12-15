import React, { memo } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = memo(({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'text-gray-700 bg-gray-100',
    primary: 'text-[#8B7355] bg-[#f5f1e8]',
    success: 'text-green-700 bg-green-100',
    warning: 'text-yellow-700 bg-yellow-100',
    danger: 'text-red-700 bg-red-100',
  };
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
});

