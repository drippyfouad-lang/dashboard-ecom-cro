'use client';

import { useSession, signOut } from 'next-auth/react';
import { Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const Header = ({ onMenuClick }) => {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {/* Left Side */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            aria-label="Toggle menu"
            title="Toggle menu"
          >
            <Bars3Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </button>

          {/* Breadcrumb or Title */}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-gray-900 truncate">Welcome Back</h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">Manage your e-commerce platform</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          {/* User Info */}
          {session?.user && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{session.user.name}</p>
                <p className="text-xs text-gray-500">
                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {session.user.role}
                  </span>
                </p>
              </div>

              {/* Mobile: Show only role badge */}
              <div className="sm:hidden">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {session.user.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                aria-label="Logout"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
