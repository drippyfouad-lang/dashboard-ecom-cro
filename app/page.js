'use client';

import { useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useDashboardStats, usePrefetchDashboard } from '@/hooks/useData';

export default function Dashboard() {
  // Use real-time hook with automatic polling every 15 seconds
  const { data: stats, loading, error } = useDashboardStats();
  
  // Prefetch all dashboard data on mount
  usePrefetchDashboard();

  // Log errors silently (no toast on dashboard load)
  useEffect(() => {
    if (error) {
      console.warn('Dashboard stats error:', error.message);
    }
  }, [error]);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.total_orders || 0,
      icon: ShoppingCartIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Revenue',
      value: `${stats?.total_revenue || 0} DZD`,
      icon: CurrencyDollarIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Total Customers',
      value: stats?.total_customers || 0,
      icon: UsersIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      icon: ShoppingBagIcon,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Crocco-DZ Admin Dashboard</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`p-3 ${card.bgColor} rounded-lg`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Orders Alert */}
      {stats?.pending_orders > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ShoppingCartIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                You have {stats.pending_orders} pending orders
              </p>
              <a href="/orders" className="text-sm text-amber-700 underline hover:text-amber-900">
                View Orders →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Add Product', href: '/products', color: 'primary' },
            { title: 'View Orders', href: '/orders', color: 'emerald' },
            { title: 'Manage Users', href: '/users', color: 'purple' },
            { title: 'Shipping Setup', href: '/shipping', color: 'amber' },
          ].map((action, index) => (
            <a
              key={index}
              href={action.href}
              className={`p-6 rounded-xl bg-${action.color}-50 hover:bg-${action.color}-100 border border-${action.color}-100 transition-all duration-200 hover:scale-105 hover:shadow-md text-center`}
            >
              <p className={`text-sm font-medium text-${action.color}-900`}>{action.title}</p>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
