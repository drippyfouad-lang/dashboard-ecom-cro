'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  HomeIcon,
  UsersIcon,
  TagIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [andersonOpen, setAndersonOpen] = useState(false);
  const [clientTrackingOpen, setClientTrackingOpen] = useState(false);
  
  const userRole = session?.user?.role?.toLowerCase();
  const isModerator = userRole === 'moderator';

  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['admin', 'moderator'] },
    { name: 'Users', href: '/users', icon: UsersIcon, roles: ['admin'] },
    { name: 'Categories', href: '/categories', icon: TagIcon, roles: ['admin', 'moderator'] },
    { name: 'Products', href: '/products', icon: ShoppingBagIcon, roles: ['admin', 'moderator'] },
    { name: 'Orders', href: '/orders', icon: ShoppingCartIcon, roles: ['admin', 'moderator'] },
    { name: 'Shipping', href: '/shipping', icon: TruckIcon, roles: ['admin', 'moderator'] },
    { name: 'Finance', href: '/finance', icon: CurrencyDollarIcon, roles: ['admin'] },
    { name: 'Activity', href: '/activity', icon: ClockIcon, roles: ['admin'] },
    { name: 'Contact', href: '/contact', icon: EnvelopeIcon, roles: ['admin', 'moderator'] },
  ];

  // Client Tracking submenu
  const clientTrackingNavigation = [
    { name: 'Active Orders', href: '/client-tracking/active', icon: ClipboardDocumentListIcon },
    { name: 'Cancelled Orders', href: '/client-tracking/cancelled', icon: XCircleIcon },
  ];

  // Anderson Shipping submenu
  const andersonNavigation = [
    { name: 'Pre-Sent', href: '/admin/anderson/pre-sent', icon: ClipboardDocumentListIcon },
    { name: 'Sent', href: '/admin/anderson/sent', icon: PaperAirplaneIcon },
    { name: 'Shipped', href: '/admin/anderson/shipped', icon: TruckIcon },
    { name: 'Out for Delivery', href: '/admin/anderson/out-for-delivery', icon: TruckIcon },
    { name: 'Delivered', href: '/admin/anderson/delivered', icon: CheckCircleIcon },
    { name: 'Returned', href: '/admin/anderson/returned', icon: ArrowUturnLeftIcon },
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 sm:w-72 lg:w-64 bg-gradient-to-b from-primary-600 to-purple-700 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {/* Logo */}
        <div className="p-4 sm:p-5 border-b border-white border-opacity-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Logo Image - Optional: Add your logo here */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold">C</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent truncate">
                Crocco-DZ
              </h1>
              <p className="text-xs text-purple-200 mt-0.5 truncate">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium ${
                  isActive
                    ? 'bg-white bg-opacity-20 shadow-lg'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* Client Tracking Section */}
          {(userRole === 'admin' || userRole === 'moderator') && (
            <div className="pt-2 border-t border-white border-opacity-20 mt-2">
              <button
                onClick={() => setClientTrackingOpen(!clientTrackingOpen)}
                className="w-full flex items-center justify-between gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium hover:bg-white hover:bg-opacity-10"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Client Tracking</span>
                </div>
                {clientTrackingOpen ? (
                  <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
                )}
              </button>

              {/* Client Tracking Submenu */}
              {clientTrackingOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {clientTrackingNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => onClose()}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                          isActive
                            ? 'bg-white bg-opacity-20 shadow-lg'
                            : 'hover:bg-white hover:bg-opacity-10'
                        }`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Anderson Shipping Section */}
          {(userRole === 'admin' || userRole === 'moderator') && (
            <div className="pt-2 border-t border-white border-opacity-20 mt-2">
              <button
                onClick={() => setAndersonOpen(!andersonOpen)}
                className="w-full flex items-center justify-between gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium hover:bg-white hover:bg-opacity-10"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <ArchiveBoxIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Anderson Shipping</span>
                </div>
                {andersonOpen ? (
                  <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
                )}
              </button>

              {/* Anderson Submenu */}
              {andersonOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {andersonNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => onClose()}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                          isActive
                            ? 'bg-white bg-opacity-20 shadow-lg'
                            : 'hover:bg-white hover:bg-opacity-10'
                        }`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 w-full p-2 sm:p-3 border-t border-white border-opacity-20">
          <p className="text-xs text-center text-purple-200">
            © 2025 Crocco-DZ
            <br />
            All rights reserved
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
