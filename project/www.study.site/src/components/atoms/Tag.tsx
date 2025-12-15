import React from "react";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({
  children,
  className = "",
}) => {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full bg-pink-200 text-white text-sm font-medium ${className}`}
    >
      {children}
    </span>
  );
};

