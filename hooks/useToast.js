'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', details = null) => {
    const id = Date.now() + Math.random(); // More unique IDs
    setToasts((prev) => [...prev, { id, message, type, details }]);

    // Auto-dismiss after 5 seconds (or 8 for errors with details)
    const timeout = (type === 'error' && details) ? 8000 : 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, timeout);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, details) => addToast(message, 'success', details), [addToast]);
  const error = useCallback((message, details) => addToast(message, 'error', details), [addToast]);
  const info = useCallback((message, details) => addToast(message, 'info', details), [addToast]);
  const warning = useCallback((message, details) => addToast(message, 'warning', details), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
