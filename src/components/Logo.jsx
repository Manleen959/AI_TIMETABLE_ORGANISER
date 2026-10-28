import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'default', linkTo = '/' }) {
  const iconSizes = {
    small: 'w-7 h-7 rounded-xl',
    default: 'w-10 h-10 rounded-2xl',
    large: 'w-12 h-12 rounded-[18px]',
  };

  const textSizes = {
    small: 'text-lg',
    default: 'text-xl',
    large: 'text-2xl',
  };

  const content = (
    <div className="flex items-center gap-3 select-none group">
      <div
        className={`${iconSizes[size] || iconSizes.default} bg-orange-500 shadow-md shadow-orange-500/20 flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-105`}
      >
        <Calendar className="w-5 h-5 text-white stroke-[2.2]" />
        <Sparkles className="w-3 h-3 text-white fill-white absolute top-1.5 right-1.5" />
      </div>
      <div className="flex flex-col">
        <span className={`font-serif font-bold text-navy-900 tracking-tight lowercase ${textSizes[size] || textSizes.default}`}>
          smartschedule
        </span>
        <span className="text-[10px] font-sans font-semibold text-muted -mt-1 tracking-wider uppercase">
          PCTE Ludhiana
        </span>
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
