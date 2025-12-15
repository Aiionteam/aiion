"use client";

import React from "react";

interface InfoBoxProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const InfoBox: React.FC<InfoBoxProps> = ({
  icon,
  children,
  className = "",
}) => {
  return (
    <div
      className={`bg-amber-50 rounded-lg p-4 flex items-start gap-3 ${className}`}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <p className="text-gray-800 text-sm leading-relaxed">{children}</p>
    </div>
  );
};

