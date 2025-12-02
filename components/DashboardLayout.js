'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from './ToastContainer';
import { ToastProvider } from '@/hooks/useToast';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="lg:ml-64 min-h-screen flex flex-col">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Content */}
          <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
        </div>

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </ToastProvider>
  );
};

export default DashboardLayout;
