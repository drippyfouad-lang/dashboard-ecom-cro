'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal from '@/components/AlertModal';
import { useToast } from '@/hooks/useToast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CloudArrowDownIcon,
} from '@heroicons/react/24/outline';

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState('wilayas'); // wilayas or communes
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    wilaya_id: '',
    home_delivery_price: '',
    desk_delivery_price: '',
  });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, itemId: null, type: null });
  const [feesData, setFeesData] = useState(null);

  const toast = useToast();

  const fetchWilayas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery, limit: '100' });
      const response = await fetch(`/api/shipping/wilayas?${params}`);
      const data = await response.json();
      if (data.success) {
        setWilayas(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch wilayas', error.stack || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery, limit: '1000' });
      if (selectedWilaya) params.append('wilaya', selectedWilaya);
      
      const response = await fetch(`/api/shipping/communes?${params}`);
      const data = await response.json();
      if (data.success) {
        setCommunes(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch communes', error.stack || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWilayas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'communes') {
      fetchCommunes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedWilaya, searchQuery]);

  const handleOpenModal = (item = null, type = activeTab) => {
    if (item) {
      setEditingItem({ ...item, type });
      setFormData({
        code: item.code || '',
        name: item.name || '',
        wilaya_id: item.wilaya_id?._id || item.wilaya_id || '',
        // Map database field names to form field names
        home_delivery_price: item.shipping_price_home || item.home_delivery_price || '',
        desk_delivery_price: item.shipping_price_desk || item.desk_delivery_price || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        name: '',
        wilaya_id: selectedWilaya || '',
        home_delivery_price: '',
        desk_delivery_price: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      wilaya_id: '',
      home_delivery_price: '',
      desk_delivery_price: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const type = editingItem?.type || activeTab;
      const endpoint = type === 'wilayas' ? '/api/shipping/wilayas' : '/api/shipping/communes';
      const url = editingItem ? `${endpoint}/${editingItem._id}` : endpoint;
      const method = editingItem ? 'PUT' : 'POST';

      // Map field names (frontend uses home_delivery_price, backend uses shipping_price_home)
      const submitData = {
        ...formData,
        shipping_price_home: formData.home_delivery_price,
        shipping_price_desk: formData.desk_delivery_price,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `${type === 'wilayas' ? 'Wilaya' : 'Commune'} ${editingItem ? 'updated' : 'created'} successfully`
        );
        handleCloseModal();
        if (type === 'wilayas') {
          fetchWilayas();
        } else {
          fetchCommunes();
        }
      } else {
        toast.error(data.error || 'Operation failed', data.details);
      }
    } catch (error) {
      toast.error('Failed to save', error.stack || error.message);
    }
  };

  const handleDelete = async (id, type) => {
    setConfirmModal({ isOpen: true, itemId: id, type });
  };

  const confirmDelete = async () => {
    const { itemId, type } = confirmModal;

    try {
      const endpoint = type === 'wilayas' ? '/api/shipping/wilayas' : '/api/shipping/communes';
      const response = await fetch(`${endpoint}/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Deleted successfully');
        setConfirmModal({ isOpen: false, itemId: null, type: null });
        if (type === 'wilayas') {
          fetchWilayas();
        } else {
          fetchCommunes();
        }
      } else {
        toast.error(data.error || 'Failed to delete', data.details);
      }
    } catch (error) {
      toast.error('Failed to delete', error.stack || error.message);
    }
  };

  const handleTestEcoTrack = async () => {
    if (importing) return;
    
    setImporting(true);
    toast.info('Testing EcoTrack API connection...');

    try {
      const response = await fetch('/api/shipping/test-ecotrack');
      const data = await response.json();

      if (data.success) {
        setAlertModal({
          isOpen: true,
          title: '✅ Connection Successful',
          message: `EcoTrack API is working!\n\nWilayas found: ${data.data.wilayasCount}\nAPI URL: ${data.data.apiUrl}\n\nSample Wilaya:\n${JSON.stringify(data.data.sampleWilaya, null, 2)}`,
          type: 'success'
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: '❌ Connection Failed',
          message: `${data.error}\n\nDetails: ${data.details}\n\nAPI URL: ${data.apiUrl}\n\nStatus Code: ${data.statusCode || 'N/A'}\n\nResponse: ${JSON.stringify(data.responseData, null, 2)}`,
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: '❌ Test Failed',
        message: `Failed to test connection: ${error.message}`,
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromEcoTrack = async (type) => {
    if (importing) return;

    const confirmMessage = 
      type === 'wilayas'
        ? 'This will delete all existing wilayas and import fresh data from EcoTrack. Continue?'
        : 'This will delete all existing communes and import fresh data from EcoTrack. Continue?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setImporting(true);

    try {
      const endpoint = type === 'wilayas' 
        ? '/api/shipping/wilayas/import' 
        : '/api/shipping/communes/import';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        
        // Show warnings if any
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach(warning => {
            toast.warning(warning);
          });
        }

        // Refresh the data
        if (type === 'wilayas') {
          await fetchWilayas();
        } else {
          await fetchCommunes();
        }
      } else {
        // Show detailed error in popup modal
        const errorDetails = data.details 
          ? `${data.error}\n\nDetails: ${data.details}` 
          : data.error || 'Import failed';
        
        const fullMessage = data.apiUrl 
          ? `${errorDetails}\n\nAPI URL: ${data.apiUrl}`
          : errorDetails;
        
        setAlertModal({
          isOpen: true,
          title: 'Import Failed',
          message: fullMessage,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      
      // Show network error in popup modal
      setAlertModal({
        isOpen: true,
        title: 'Connection Error',
        message: `Failed to connect to the server. Please check your internet connection and try again.\n\nError: ${error.message}`,
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleViewFees = async () => {
    if (importing) return;
    
    setImporting(true);
    toast.info('Fetching EcoTrack fees...');

    try {
      const response = await fetch('/api/shipping/fees');
      const data = await response.json();

      if (data.success) {
        setFeesData(data.data);
        
        // Show fees in modal
        const feesText = `
📦 LIVRAISON (Delivery)
Home delivery wilayas: ${data.data.livraison?.length || 0}
Stop desk wilayas: ${data.data.livraison?.filter(w => w.tarif_stopdesk > 0).length || 0}

🔄 PICKUP
Available wilayas: ${data.data.pickup?.length || 0}

🔁 ÉCHANGE (Exchange)
Available wilayas: ${data.data.echnage?.length || 0}

💰 RECOUVREMENT (Collection)
Available wilayas: ${data.data.recouvrement?.length || 0}

↩️ RETOURS (Returns)
Available wilayas: ${data.data.retours?.length || 0}

Sample Pricing (Wilaya 16 - Alger):
- Home Delivery: ${data.data.livraison?.find(w => w.wilaya_id === 16)?.tarif || 'N/A'} DZD
- Stop Desk: ${data.data.livraison?.find(w => w.wilaya_id === 16)?.tarif_stopdesk || 'N/A'} DZD
- Return Fee: ${data.data.retours?.find(w => w.wilaya_id === 16)?.tarif || 'N/A'} DZD
        `.trim();
        
        setAlertModal({
          isOpen: true,
          title: '💵 EcoTrack Shipping Fees',
          message: feesText,
          type: 'success'
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: '❌ Failed to Load Fees',
          message: `${data.error}\n\nDetails: ${data.details || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: '❌ Connection Error',
        message: `Failed to fetch fees: ${error.message}`,
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };



  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Shipping Management</h1>
            <p className="text-gray-600 mt-1">Manage wilayas and communes shipping prices</p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'wilayas' && (
              <>
                <button 
                  onClick={handleTestEcoTrack} 
                  disabled={importing}
                  className="px-4 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Test EcoTrack API Connection"
                >
                  🔌 Test API
                </button>
                <button 
                  onClick={handleViewFees} 
                  disabled={importing}
                  className="px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="View EcoTrack Fees"
                >
                  💵 View Fees
                </button>
                <button 
                  onClick={() => handleImportFromEcoTrack('wilayas')} 
                  disabled={importing}
                  className="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CloudArrowDownIcon className="w-5 h-5" />
                  {importing ? 'Importing...' : 'Import Wilayas from EcoTrack'}
                </button>
              </>
            )}
            {activeTab === 'communes' && (
              <button 
                onClick={() => handleImportFromEcoTrack('communes')} 
                disabled={importing}
                className="px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CloudArrowDownIcon className="w-5 h-5" />
                {importing ? 'Importing...' : 'Import Communes from EcoTrack'}
              </button>
            )}
            <button onClick={() => handleOpenModal()} className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add {activeTab === 'wilayas' ? 'Wilaya' : 'Commune'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('wilayas')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'wilayas'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Wilayas ({wilayas.length})
          </button>
          <button
            onClick={() => setActiveTab('communes')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'communes'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Communes ({communes.length})
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {activeTab === 'communes' && (
              <select
                value={selectedWilaya}
                onChange={(e) => setSelectedWilaya(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Wilayas</option>
                {wilayas.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ) : activeTab === 'wilayas' ? (
          // Wilayas Table
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wilaya Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Home Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desk Delivery</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wilayas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No wilayas found. Add your first wilaya to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    wilayas.map((wilaya) => (
                      <tr key={wilaya._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{wilaya.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{wilaya.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {wilaya.shipping_price_home?.toLocaleString() || 0} DZD
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-blue-600">
                            {wilaya.shipping_price_desk?.toLocaleString() || 0} DZD
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(wilaya, 'wilayas')}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(wilaya._id, 'wilayas')}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Communes Table
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wilaya</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commune Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Home Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desk Delivery</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {communes.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No communes found. {selectedWilaya ? 'Try selecting a different wilaya.' : 'Add your first commune to get started.'}</p>
                      </td>
                    </tr>
                  ) : (
                    communes.map((commune) => (
                      <tr key={commune._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {commune.wilaya_id?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{commune.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {commune.shipping_price_home !== null && commune.shipping_price_home !== undefined
                              ? `${commune.shipping_price_home.toLocaleString()} DZD`
                              : 'Inherit'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-blue-600">
                            {commune.shipping_price_desk !== null && commune.shipping_price_desk !== undefined
                              ? `${commune.shipping_price_desk.toLocaleString()} DZD`
                              : 'Inherit'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(commune, 'communes')}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(commune._id, 'communes')}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingItem ? 'Edit' : 'Add'} {editingItem?.type === 'communes' || activeTab === 'communes' ? 'Commune' : 'Wilaya'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(editingItem?.type === 'wilayas' || activeTab === 'wilayas') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wilaya Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 01, 16, 31"
                      required
                    />
                  </div>
                )}

                {(editingItem?.type === 'communes' || activeTab === 'communes') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wilaya <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.wilaya_id}
                      onChange={(e) => setFormData({ ...formData, wilaya_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select Wilaya</option>
                      {wilayas.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={activeTab === 'wilayas' ? 'e.g., Alger' : 'e.g., Bab El Oued'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Delivery Price (DZD)
                  </label>
                  <input
                    type="number"
                    value={formData.home_delivery_price}
                    onChange={(e) => setFormData({ ...formData, home_delivery_price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                    min="0"
                  />
                  {activeTab === 'communes' && (
                    <p className="text-xs text-gray-500 mt-1">Leave empty to inherit from wilaya</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desk Delivery Price (DZD)
                  </label>
                  <input
                    type="number"
                    value={formData.desk_delivery_price}
                    onChange={(e) => setFormData({ ...formData, desk_delivery_price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                    min="0"
                  />
                  {activeTab === 'communes' && (
                    <p className="text-xs text-gray-500 mt-1">Leave empty to inherit from wilaya</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, itemId: null, type: '' })}
        onConfirm={confirmDelete}
        title={`Delete ${confirmModal.type === 'wilayas' ? 'Wilaya' : 'Commune'}`}
        message={`Are you sure you want to delete this ${confirmModal.type === 'wilayas' ? 'wilaya' : 'commune'}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Alert Modal for Import Errors */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </DashboardLayout>
  );
}
