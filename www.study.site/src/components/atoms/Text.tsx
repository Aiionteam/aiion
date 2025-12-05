import React from "react";

interface TextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "sm" | "base" | "lg" | "xl";
}

const variantClasses = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export const Text: React.FC<TextProps> = ({
  children,
  className = "",
  variant = "base",
}) => {
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

