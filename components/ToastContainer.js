'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import Toast from './Toast';

const ToastContainer = () => {
  const { toasts, removeToast, error } = useToast();

  useEffect(() => {
    // Set up global error toast function
    if (typeof window !== 'undefined') {
      window.showErrorToast = (message) => {
        error(message || 'An unexpected error occurred');
      };

      // Listen for app-error events from ErrorBoundary
      const handleAppError = (event) => {
        error(event.detail?.message || 'An unexpected error occurred');
      };

      window.addEventListener('app-error', handleAppError);

      return () => {
        window.removeEventListener('app-error', handleAppError);
        delete window.showErrorToast;
      };
    }
  }, [error]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
