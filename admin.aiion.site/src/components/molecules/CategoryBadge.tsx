import React, { memo } from 'react';
import { Badge } from '../atoms';

interface CategoryBadgeProps {
  categories: string[];
  darkMode?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = memo(({
  categories,
  darkMode = false,
}) => {
  if (categories.length === 0) return null;
  
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {categories.map((category, index) => (
        <Badge
          key={index}
          variant="primary"
          className={darkMode ? 'text-blue-300 bg-[#121212]' : ''}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
});

