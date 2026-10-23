import React from 'react';

interface TeamColorDotProps {
  color?: 'BLUE' | 'RED' | 'GREEN' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TeamColorDot: React.FC<TeamColorDotProps> = ({
  color,
  className = '',
  size = 'md',
}) => {
  const norm = (color || 'BLUE').toUpperCase();
  let colorStyle = 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]';
  if (norm === 'RED') {
    colorStyle = 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]';
  } else if (norm === 'GREEN') {
    colorStyle = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]';
  }

  const sizeClass = size === 'lg' ? 'w-3 h-3' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-block rounded-full shrink-0 align-middle ${sizeClass} ${colorStyle} ${className}`}
      title={`${norm} Team`}
      aria-label={`${norm} Team indicator dot`}
    />
  );
};
