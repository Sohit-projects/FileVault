import React from 'react';
import { formatBytes } from '../../utils/fileUtils';
import { Database } from 'lucide-react';

const StorageBar = ({ used, limit, className = '' }) => {
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const barColor = isCritical
    ? 'from-danger to-danger/70'
    : isWarning
    ? 'from-warning to-warning/70'
    : 'from-accent to-purple-500';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Database size={13} />
          Storage
        </span>
        <span className="text-text-muted font-mono text-xs">
          {formatBytes(used)} / {formatBytes(limit)}
        </span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span
          className={`text-xs font-medium ${
            isCritical ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-muted'
          }`}
        >
          {percentage.toFixed(1)}% used
        </span>
      </div>
    </div>
  );
};

export default StorageBar;
