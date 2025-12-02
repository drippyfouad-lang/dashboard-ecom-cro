'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Providers({ children, session }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
