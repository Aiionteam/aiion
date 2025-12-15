"use client";

import React from "react";
import { Input } from "../atoms/Input";
import { IconButton } from "../atoms/IconButton";
import { Text } from "../atoms/Text";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddClick?: () => void;
  onMicClick?: () => void;
  count?: number;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onAddClick,
  onMicClick,
  count,
  placeholder = "무엇이든 물어보세요",
  onKeyDown,
}) => {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        className="pr-40"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {onAddClick && (
          <IconButton onClick={onAddClick} aria-label="추가">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </IconButton>
        )}
        {count !== undefined && (
          <Text variant="sm" className="text-gray-500 font-medium">
            {count}
          </Text>
        )}
        {onMicClick && (
          <IconButton onClick={onMicClick} aria-label="음성 입력">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  );
};

