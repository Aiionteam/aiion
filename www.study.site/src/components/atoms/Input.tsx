import React from "react";

interface InputProps {
  type?: "text" | "password" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
  onKeyDown,
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`w-full h-14 px-6 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base ${className}`}
    />
  );
};

