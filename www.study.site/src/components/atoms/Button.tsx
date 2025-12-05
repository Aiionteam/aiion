import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "google";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}) => {
  const baseClasses = "w-full py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-pink-500 hover:bg-pink-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    google: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 flex items-center justify-center gap-2",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

