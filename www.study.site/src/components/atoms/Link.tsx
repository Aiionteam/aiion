import React from "react";

interface LinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const Link: React.FC<LinkProps> = ({
  children,
  href,
  onClick,
  className = "",
}) => {
  const baseClasses = "text-pink-500 hover:text-pink-600 text-sm transition-colors cursor-pointer";
  
  if (href) {
    return (
      <a href={href} className={`${baseClasses} ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${className} bg-transparent border-none`}
    >
      {children}
    </button>
  );
};

