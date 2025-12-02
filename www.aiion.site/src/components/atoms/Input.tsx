import React, { memo } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = memo(({
  label,
  error,
  showCharCount,
  maxLength,
  className = '',
  value,
  ...props
}) => {
  // value를 안전하게 String으로 변환하고 정규화
  const inputValue = value != null ? String(value) : '';
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-[#d4cdc0] focus:ring-[#8B7355]'
          } ${className}`}
          maxLength={maxLength}
          value={inputValue}
          {...props}
        />
        {showCharCount && maxLength && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            {inputValue.length}/{maxLength}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

