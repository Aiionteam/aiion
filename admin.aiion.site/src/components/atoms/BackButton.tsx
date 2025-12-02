import React from 'react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8] rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
};

