import Button from './ui/Button';
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
  compactActions?: boolean;
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
  className = '',
  compactActions = false
}) => {
  return (
    <div className={`p-5 flex ${compactActions ? 'flex-row items-center' : 'flex-col sm:flex-row flex-wrap items-start sm:items-center'} justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {onSelectAll && (
          <Button
            onClick={onSelectAll} aria-label={allSelected ? "取消全选" : "选择全部"}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" variant="plain"
          >
            {allSelected ? <CheckSquare size={20} className="text-gray-900" /> : <Square size={20} />}
          </Button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex flex-wrap items-center gap-2">
            {title}
            {count !== undefined && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">共 {count}</span>
            )}
            {selectedCount !== undefined && selectedCount > 0 && (
              <span className="text-xs font-medium text-blue-700">已选：{selectedCount}</span>
            )}
          </h2>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 ${compactActions?'w-auto':'w-full sm:w-auto'} ml-auto`}>
        {actionButton}
        {searchBox}
      </div>
    </div>
  );
};
