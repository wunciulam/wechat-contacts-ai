import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  selectedCount?: number;
  allSelected?: boolean;
  onSelectAll?: () => void;
  actionButton?: React.ReactNode;
  searchBox?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  count,
  selectedCount,
  allSelected = false,
  onSelectAll,
  actionButton,
  searchBox,
  className = ''
}) => {
  return (
    <div className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {onSelectAll && (
          <button 
            onClick={onSelectAll} 
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
          >
            {allSelected ? <CheckSquare size={20} className="text-gray-900" /> : <Square size={20} />}
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {title}
            {count !== undefined && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">共 {count}</span>
            )}
            {selectedCount !== undefined && selectedCount > 0 && (
              <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">已选：{selectedCount}</span>
            )}
          </h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
        {actionButton}
        {searchBox}
      </div>
    </div>
  );
};
