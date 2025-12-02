'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import {
  EyeIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function ContactPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selected, setSelected] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [socials, setSocials] = useState([]);
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
  const [socialForm, setSocialForm] = useState({ id: null, instagram: '', facebook: '', tiktok: '', whatsapp: '', email: '' });
  const [editMode, setEditMode] = useState(false);
  const toast = useToast();

  const fetchMessages = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contact_messages?page=${page}&limit=${pagination.limit}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
        setPagination(data.pagination || pagination);
      } else {
        toast.error(data.message || 'Failed to fetch messages');
      }
    } catch (err) {
      toast.error('Failed to fetch messages: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSocials = async () => {
    try {
      const res = await fetch('/api/socials');
      const data = await res.json();
      if (data.success) setSocials(data.data || []);
    } catch (err) {
      // silently fail
    }
  };

  useEffect(() => { 
    fetchMessages(); 
    fetchSocials(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPreview = (msg) => { setSelected(msg); setIsPreviewOpen(true); };

  const handleDeleteMessage = async (id) => {
    try {
      const res = await fetch(`/api/contact_messages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Message deleted successfully');
        fetchMessages(pagination.page);
      } else {
        toast.error(data.error || 'Failed to delete message');
      }
    } catch (err) {
      toast.error('Failed to delete message: ' + (err.message || err));
    }
  };

  const handleSaveSocial = async () => {
    try {
      const method = editMode && socialForm.id ? 'PUT' : 'POST';
      const res = await fetch('/api/socials', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(socialForm) });
      const data = await res.json();
      if (data.success) {
        toast.success(editMode ? 'Social updated' : 'Social saved');
        fetchSocials();
        setIsSocialsOpen(false);
        setSocialForm({ id: null, instagram: '', facebook: '', tiktok: '', whatsapp: '', email: '' });
        setEditMode(false);
      } else {
        toast.error(data.message || 'Failed to save social');
      }
    } catch (err) {
      toast.error('Failed to save social');
    }
  };

  const handleEditSocial = (social) => {
    setSocialForm({ id: social._id, instagram: social.instagram || '', facebook: social.facebook || '', tiktok: social.tiktok || '', whatsapp: social.whatsapp || '', email: social.email || '' });
    setEditMode(true);
    setIsSocialsOpen(true);
  };

  const handleDeleteSocial = async (id) => {
    try {
      const res = await fetch(`/api/socials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Social deleted');
        fetchSocials();
      } else {
        toast.error(data.message || 'Failed to delete social');
      }
    } catch (err) {
      toast.error('Failed to delete social');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
        <p className="text-gray-600 mt-2">Messages from external site</p>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        <button onClick={() => { setSocialForm({ id: null, instagram: '', facebook: '', tiktok: '', whatsapp: '', email: '' }); setEditMode(false); setIsSocialsOpen(true); }} className="btn-primary flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Add Social Accounts</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr><td colSpan={4} className="p-6 text-center">Loading...</td></tr>
              )}
              {!loading && messages.map(msg => (
                <tr key={msg._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{msg.name}</td>
                  <td className="px-6 py-4">{msg.email}</td>
                  <td className="px-6 py-4">{new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openPreview(msg)} className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1"><EyeIcon className="w-4 h-4"/> Preview</button>
                      <button onClick={() => handleDeleteMessage(msg._id)} className="px-3 py-2 border rounded text-red-600 hover:bg-red-50"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && messages.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No messages</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button onClick={() => fetchMessages(pagination.page - 1)} disabled={pagination.page === 1} className="px-4 py-2 border rounded disabled:opacity-50">Previous</button>
            <button onClick={() => fetchMessages(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="px-4 py-2 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Message Details">
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-semibold text-gray-900">{selected.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-semibold text-gray-900">{new Date(selected.createdAt).toLocaleDateString()} {new Date(selected.createdAt).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold text-gray-900">{selected.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{selected.email}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Title</p>
              <p className="font-semibold text-gray-900">{selected.title || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Message</p>
              <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-900 whitespace-pre-wrap">{selected.message}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Socials modal */}
      <Modal isOpen={isSocialsOpen} onClose={() => { setIsSocialsOpen(false); setSocialForm({ id: null, instagram: '', facebook: '', tiktok: '', whatsapp: '', email: '' }); setEditMode(false); }} title={editMode ? "Edit Social Accounts" : "Add Social Accounts"}>
        <div className="space-y-3">
          <input placeholder="Instagram" value={socialForm.instagram} onChange={(e) => setSocialForm({ ...socialForm, instagram: e.target.value })} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Facebook" value={socialForm.facebook} onChange={(e) => setSocialForm({ ...socialForm, facebook: e.target.value })} className="w-full px-3 py-2 border rounded" />
          <input placeholder="TikTok" value={socialForm.tiktok} onChange={(e) => setSocialForm({ ...socialForm, tiktok: e.target.value })} className="w-full px-3 py-2 border rounded" />
          <input placeholder="WhatsApp" value={socialForm.whatsapp} onChange={(e) => setSocialForm({ ...socialForm, whatsapp: e.target.value })} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Email" value={socialForm.email} onChange={(e) => setSocialForm({ ...socialForm, email: e.target.value })} className="w-full px-3 py-2 border rounded" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsSocialsOpen(false); setSocialForm({ id: null, instagram: '', facebook: '', tiktok: '', whatsapp: '', email: '' }); setEditMode(false); }} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={handleSaveSocial} className="px-4 py-2 bg-primary-600 text-white rounded">Save</button>
          </div>
        </div>
      </Modal>

      {/* Social accounts list */}
      {socials && socials.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Social Media Accounts</h2>
            <div className="space-y-3">
              {socials.map(social => (
                <div key={social._id} className="p-4 border rounded-lg flex justify-between items-start">
                  <div className="space-y-1">
                    {social.instagram && <p className="text-sm"><strong>Instagram:</strong> {social.instagram}</p>}
                    {social.facebook && <p className="text-sm"><strong>Facebook:</strong> {social.facebook}</p>}
                    {social.tiktok && <p className="text-sm"><strong>TikTok:</strong> {social.tiktok}</p>}
                    {social.whatsapp && <p className="text-sm"><strong>WhatsApp:</strong> {social.whatsapp}</p>}
                    {social.email && <p className="text-sm"><strong>Email:</strong> {social.email}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSocial(social)} className="px-2 py-1 border rounded"><PencilIcon className="w-4 h-4"/></button>
                    <button onClick={() => handleDeleteSocial(social._id)} className="px-2 py-1 border rounded text-red-600"><TrashIcon className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
