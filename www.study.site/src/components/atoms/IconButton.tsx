import React from "react";

interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  children,
  className = "",
  "aria-label": ariaLabel,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

