import React, { memo } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = memo(({
  checked,
  onChange,
  label,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <span className="text-gray-700 font-medium">{label}</span>
      )}
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-7 rounded-full transition-colors ${checked ? 'bg-[#121212]' : 'bg-[#d4cdc0]'
          }`}
      >
        <div
          className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-transform bg-white ${checked ? 'translate-x-7' : 'translate-x-0'
            }`}
        />
      </button>
    </div>
  );
});

