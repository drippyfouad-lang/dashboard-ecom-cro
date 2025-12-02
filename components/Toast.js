'use client';

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const Toast = ({ toast, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);

  const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
    error: <ExclamationCircleIcon className="w-6 h-6 text-red-500" />,
    warning: <ExclamationCircleIcon className="w-6 h-6 text-amber-500" />,
    info: <InformationCircleIcon className="w-6 h-6 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-lg border ${bgColors[toast.type]} shadow-lg animate-fade-in min-w-[320px] max-w-md`}
    >
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <p className="flex-1 text-sm font-medium text-gray-900">{toast.message}</p>
        {toast.details && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Toggle details"
          >
            {showDetails ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        )}
        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      {showDetails && toast.details && (
        <div className="mt-2 pl-9 pr-2">
          <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded border border-gray-200 max-h-32 overflow-auto font-mono">
            {typeof toast.details === 'string' ? toast.details : JSON.stringify(toast.details, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Toast;
