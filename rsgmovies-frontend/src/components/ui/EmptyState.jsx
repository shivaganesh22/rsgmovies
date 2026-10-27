import React from 'react';
import { Film } from 'lucide-react';

export const EmptyState = ({
  title = 'No content found',
  message = 'There are no items matching your criteria at this moment.',
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-2xl glass-panel text-center max-w-md mx-auto my-8">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4">
        {icon || <Film size={26} />}
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-5">{message}</p>
      {action}
    </div>
  );
};

export default EmptyState;
