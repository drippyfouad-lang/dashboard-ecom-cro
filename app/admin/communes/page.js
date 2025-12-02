'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export default function CommunesPage() {
  const [communes, setCommunes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchWilayas();
    fetchCommunes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCommunes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, wilayaFilter]);

  const fetchWilayas = async () => {
    try {
      const response = await fetch('/api/wilayas?activeOnly=false');
      const data = await response.json();
      
      if (data.success) {
        setWilayas(data.data);
      }
    } catch (error) {
      console.error('Error fetching wilayas:', error);
    }
  };

  const fetchCommunes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (wilayaFilter) params.append('wilayaId', wilayaFilter);
      params.append('activeOnly', 'false');

      const response = await fetch(`/api/communes?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCommunes(data.data);
      } else {
        toast.error('Failed to fetch communes');
      }
    } catch (error) {
      console.error('Error fetching communes:', error);
      toast.error('Failed to fetch communes');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromEcoTrack = async () => {
    setImportModalOpen(false);
    setImporting(true);
    
    try {
      const response = await fetch('/api/communes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully imported ${data.data.imported} communes from EcoTrack`);
        fetchCommunes();
      } else {
        toast.error(data.error || 'Failed to import communes');
      }
    } catch (error) {
      console.error('Error importing communes:', error);
      toast.error('Failed to import communes from EcoTrack');
    } finally {
      setImporting(false);
    }
  };

  const toggleCommuneStatus = async (commune) => {
    try {
      const response = await fetch(`/api/communes/${commune._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !commune.is_active }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Commune ${commune.is_active ? 'deactivated' : 'activated'}`);
        fetchCommunes();
      } else {
        toast.error('Failed to update commune status');
      }
    } catch (error) {
      console.error('Error updating commune:', error);
      toast.error('Failed to update commune');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Communes Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage shipping communes imported from EcoTrack
            </p>
          </div>
          
          <button
            onClick={() => setImportModalOpen(true)}
            disabled={importing || wilayas.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Import from EcoTrack
              </>
            )}
          </button>
        </div>

        {/* Warning if no wilayas */}
        {wilayas.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You must import wilayas before importing communes.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search communes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Wilaya Filter */}
            <select
              value={wilayaFilter}
              onChange={(e) => setWilayaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
            >
              <option value="">All Wilayas</option>
              {wilayas.map((wilaya) => (
                <option key={wilaya._id} value={wilaya._id}>
                  {wilaya.code} - {wilaya.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Communes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-500">Loading communes...</p>
            </div>
          ) : communes.length === 0 ? (
            <div className="p-8 text-center">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">
                {wilayas.length === 0
                  ? 'Import wilayas first before importing communes'
                  : 'No communes found'}
              </p>
              {wilayas.length > 0 && (
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Import from EcoTrack
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name (French)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name (Arabic)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wilaya
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {communes.map((commune) => (
                    <tr key={commune._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {commune.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commune.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commune.name_ar || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commune.wilaya_id?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {commune.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircleIcon className="w-4 h-4 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleCommuneStatus(commune)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            commune.is_active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {commune.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Import Statistics */}
        {communes.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Communes</p>
                <p className="text-2xl font-bold text-gray-900">{communes.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {communes.filter(c => c.is_active).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">From EcoTrack</p>
                <p className="text-2xl font-bold text-blue-600">
                  {communes.filter(c => c.imported_from_ecotrack).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      {importModalOpen && (
        <Modal
          title="Import Communes from EcoTrack"
          onClose={() => setImportModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will replace all existing communes with fresh data from EcoTrack.
              </p>
            </div>
            
            <p className="text-sm text-gray-600">
              Are you sure you want to import communes from EcoTrack? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFromEcoTrack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import from EcoTrack
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
